import { MMKV } from 'react-native-mmkv';
import { Platform } from 'react-native';
import type { FileItem } from '../types';
import { permissionService } from '../services/PermissionService';
import { CancellationToken } from '../services/Cancellation';
import { eventBus, AppEvents } from '../services/EventBus';
import { fetchRawAssets } from '../services/RawAssetFetcher';
import { processAssets } from '../services/MediaProcessor';
import { mediaRepository } from '../services/MediaRepository';
import { searchIndex } from '../services/SearchIndex';
import { collectionsIndex } from '../services/CollectionsIndex';
import { metadataQueue } from '../services/MetadataQueue';
import { cacheManager } from '../services/CacheManager';

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

  get repository() {
    return mediaRepository;
  }

  get searchIdx() {
    return searchIndex;
  }

  get collections() {
    return collectionsIndex;
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
    mediaRepository.clearAll();
    searchIndex.clear();
    collectionsIndex.clear();
  }

  private _getLastModified(): number {
    return storage.getNumber(CACHE_KEYS.lastModified) || 0;
  }

  private _setLastModified(time: number) {
    storage.set(CACHE_KEYS.lastModified, time);
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

    if (this.hasCache() && !this.shouldRescan()) {
      const cached = this.loadFromCache();
      this._state = {
        videos: cached.videos,
        audio: cached.audio,
        lastModified: this._getLastModified(),
      };
      mediaRepository.setAll(cached.videos, cached.audio);
      onProgress?.(1, 'Done (cached)');
      return cached;
    }

    onProgress?.(0.2, 'Fetching media assets...');
    ct.throwIfCancelled();

    const [videoAssets, audioAssets] = await Promise.all([
      fetchRawAssets('video', ct, (loaded, hasMore) => {
        onProgress?.(0.2 + (loaded / 10000) * 0.3, `Fetching videos... ${loaded}`);
      }),
      fetchRawAssets('audio', ct, (loaded, hasMore) => {
        onProgress?.(0.5 + (loaded / 10000) * 0.2, `Fetching audio... ${loaded}`);
      }),
    ]);

    ct.throwIfCancelled();
    onProgress?.(0.7, 'Processing files...');

    const [processedVideos, processedAudio] = await Promise.all([
      processAssets(videoAssets.assets, ct),
      processAssets(audioAssets.assets, ct),
    ]);

    ct.throwIfCancelled();
    onProgress?.(0.85, 'Saving cache...');

    mediaRepository.setAll(processedVideos, processedAudio);
    this._saveCache(processedVideos, processedAudio);
    this._state = {
      videos: processedVideos,
      audio: processedAudio,
      lastModified: Date.now(),
    };
    this._setLastModified(Date.now());

    ct.throwIfCancelled();
    onProgress?.(1, 'Done');

    eventBus.emit(AppEvents.SCAN_COMPLETED, {
      videos: processedVideos.length,
      audio: processedAudio.length,
    });

    setTimeout(() => {
      this._buildIndexes(processedVideos, processedAudio);
      metadataQueue.enqueueBatch(processedAudio.slice(0, 200));
      cacheManager.cleanup();
    }, 500);

    return { videos: processedVideos, audio: processedAudio };
  }

  private _buildIndexes(videos: FileItem[], audio: FileItem[]): void {
    searchIndex.build([...audio, ...videos]);
    collectionsIndex.build(audio, videos);
    eventBus.emit(AppEvents.SEARCH_INDEX_REBUILT);
    eventBus.emit(AppEvents.COLLECTION_BUILT);
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

  async requestPermissions(): Promise<boolean> {
    await permissionService.requestMediaLibrary();
    return permissionService.isGranted();
  }

  setThumbnail(uri: string, thumbnail: string) {
    mediaRepository.updateThumbnail(uri, thumbnail);

    const update = (files: FileItem[]) =>
      files.map((f) => (f.uri === uri ? { ...f, thumbnail } : f));
    const videos = update(this._getCached(CACHE_KEYS.videos));
    const audio = update(this._getCached(CACHE_KEYS.audio));
    this._saveCache(videos, audio);
    this._state = { videos, audio, lastModified: this._state.lastModified };
  }
}

export const fileEngine = FileEngine.getInstance();
