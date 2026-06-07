import { MMKV } from 'react-native-mmkv';
import { Platform } from 'react-native';
import type { FileItem, FileType } from '../types';
import { permissionService } from '../services/PermissionService';
import { CancellationToken, isCancelled } from '../services/Cancellation';
import { eventBus, AppEvents } from '../services/EventBus';
import { scanMedia } from '../services/MediaScanner';
import { getFileType, getArtColor } from '../utils/file-type';
import { formatFileSize, formatDuration } from '../utils/format';

const storage = new MMKV({ id: 'file-engine' });
const CACHE_VERSION = 3;
const CACHE_KEYS = {
  videos: '@fe_videos',
  audio: '@fe_audio',
  metadata: '@fe_metadata',
  timestamp: '@fe_timestamp',
  version: '@fe_version',
  lastModified: '@fe_last_modified',
};

type ScanCallback = (progress: number, stage: string) => void;

interface FileEngineState {
  videos: FileItem[];
  audio: FileItem[];
  lastModified: number;
}

export class FileEngine {
  private static instance: FileEngine;
  private _state: FileEngineState = { videos: [], audio: [], lastModified: 0 };

  static getInstance(): FileEngine {
    if (!FileEngine.instance) {
      FileEngine.instance = new FileEngine();
    }
    return FileEngine.instance;
  }

  getFileType(fileName: string): FileType {
    return getFileType(fileName);
  }

  getArtColor(name: string): string {
    return getArtColor(name);
  }

  formatFileSize(bytes?: number): string {
    return formatFileSize(bytes);
  }

  formatDuration(ms?: number): string {
    return formatDuration(ms);
  }

  shouldRescan(): boolean {
    const version = storage.getNumber(CACHE_KEYS.version) || 0;
    if (version !== CACHE_VERSION) return true;
    const lastScan = storage.getNumber(CACHE_KEYS.timestamp) || 0;
    return Date.now() - lastScan > 24 * 60 * 60 * 1000;
  }

  hasCache(): boolean {
    return storage.getString(CACHE_KEYS.videos) !== undefined;
  }

  clearCache() {
    Object.values(CACHE_KEYS).forEach((k) => storage.delete(k));
  }

  private _getLastModified(): number {
    return storage.getNumber(CACHE_KEYS.lastModified) || 0;
  }

  private _setLastModified(time: number) {
    storage.set(CACHE_KEYS.lastModified, time);
  }

  // Incremental scan support: detect changes since last scan
  private _shouldIncrementalScan(): boolean {
    const lastModified = this._getLastModified();
    if (!lastModified) return false;
    return Date.now() - lastModified < 7 * 24 * 60 * 60 * 1000;
  }

  async scanAll(
    onProgress?: ScanCallback,
    token?: CancellationToken
  ): Promise<{ videos: FileItem[]; audio: FileItem[] }> {
    const ct = token || new CancellationToken();
    onProgress?.(0, 'Requesting permissions...');

    await permissionService.requestMediaLibrary();
    ct.throwIfCancelled();

    if (!permissionService.isGranted()) {
      return { videos: [], audio: [] };
    }

    if (Platform.OS === 'web') {
      return { videos: [], audio: [] };
    }

    onProgress?.(0.15, 'Checking for changes...');
    ct.throwIfCancelled();

    // Incremental: try cached first
    if (this.hasCache() && !this.shouldRescan()) {
      const cached = this.loadFromCache();
      this._state = {
        videos: cached.videos,
        audio: cached.audio,
        lastModified: this._getLastModified(),
      };
      onProgress?.(1, 'Done (cached)');
      return cached;
    }

    onProgress?.(0.3, 'Scanning media library...');
    ct.throwIfCancelled();

    const [mediaVideos, mediaAudio] = await Promise.all([
      this._getMediaFiles('video', ct),
      this._getMediaFiles('audio', ct),
    ]);

    ct.throwIfCancelled();
    onProgress?.(0.8, 'Caching results...');

    this._saveCache(mediaVideos, mediaAudio);
    this._state = { videos: mediaVideos, audio: mediaAudio, lastModified: Date.now() };
    this._setLastModified(Date.now());

    onProgress?.(1, 'Done');
    eventBus.emit(AppEvents.SCAN_COMPLETED, {
      videos: mediaVideos.length,
      audio: mediaAudio.length,
    });
    return { videos: mediaVideos, audio: mediaAudio };
  }

  loadFromCache(): { videos: FileItem[]; audio: FileItem[] } {
    return {
      videos: this._getCached(CACHE_KEYS.videos),
      audio: this._getCached(CACHE_KEYS.audio),
    };
  }

  private _saveCache(videos: FileItem[], audio: FileItem[]) {
    storage.set(CACHE_KEYS.videos, JSON.stringify(videos));
    storage.set(CACHE_KEYS.audio, JSON.stringify(audio));
    storage.set(CACHE_KEYS.timestamp, Date.now());
    storage.set(CACHE_KEYS.version, CACHE_VERSION);
  }

  private _getCached(key: string): FileItem[] {
    try {
      const data = storage.getString(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private async _getMediaFiles(
    type: 'video' | 'audio',
    token: CancellationToken
  ): Promise<FileItem[]> {
    try {
      const result = await scanMedia({ type, token, resolveLrc: type === 'audio' });
      return result.items;
    } catch (e) {
      if (isCancelled(e)) throw e;
      return [];
    }
  }

  async requestPermissions(): Promise<boolean> {
    await permissionService.requestMediaLibrary();
    return permissionService.isGranted();
  }

  setThumbnail(uri: string, thumbnail: string) {
    const update = (files: FileItem[]) =>
      files.map((f) => (f.uri === uri ? { ...f, thumbnail } : f));
    const videos = update(this._getCached(CACHE_KEYS.videos));
    const audio = update(this._getCached(CACHE_KEYS.audio));
    this._saveCache(videos, audio);
    this._state = { videos, audio, lastModified: this._state.lastModified };
  }
}

export const fileEngine = FileEngine.getInstance();
