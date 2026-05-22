import * as MediaLibrary from 'expo-media-library';
import { MMKV } from 'react-native-mmkv';
import { Platform } from 'react-native';
import type { FileItem, FileType, MediaMetadata } from '../types';
const FileSystem: any = require('expo-file-system');

const storage = new MMKV({ id: 'file-engine' });
const CACHE_VERSION = 3;
const CACHE_KEYS = {
  videos: '@fe_videos',
  audio: '@fe_audio',
  metadata: '@fe_metadata',
  timestamp: '@fe_timestamp',
  version: '@fe_version',
};

const EXTENSION_MAP: Record<string, FileType> = {
  mp4: 'video', mov: 'video', avi: 'video', mkv: 'video',
  webm: 'video', m4v: 'video',
  mp3: 'audio', wav: 'audio', aac: 'audio', flac: 'audio',
  m4a: 'audio', ogg: 'audio', wma: 'audio', opus: 'audio',
};

const ART_COLORS = [
  '#C2FC4A', '#6c5ce7', '#00cec9', '#e17055',
  '#fdcb6e', '#74b9ff', '#ff7675', '#55efc4',
  '#a29bfe', '#fd79a8', '#f39c12', '#27ae60',
];

type ScanCallback = (progress: number, stage: string) => void;

export class FileEngine {
  private static instance: FileEngine;

  static getInstance(): FileEngine {
    if (!FileEngine.instance) {
      FileEngine.instance = new FileEngine();
    }
    return FileEngine.instance;
  }

  getArtColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return ART_COLORS[Math.abs(hash) % ART_COLORS.length];
  }

  getFileType(fileName: string): FileType {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return EXTENSION_MAP[ext] || 'other';
  }

  formatFileSize(bytes?: number): string {
    if (!bytes || bytes === 0) return 'Unknown';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  formatDuration(ms?: number): string {
    if (!ms) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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

  async scanAll(onProgress?: ScanCallback): Promise<{
    videos: FileItem[];
    audio: FileItem[];
  }> {
    onProgress?.(0, 'Requesting permissions...');
    const perm = await this.requestPermissions();
    if (!perm) {
      return { videos: [], audio: [] };
    }

    if (Platform.OS === 'web') {
      return { videos: [], audio: [] };
    }

    onProgress?.(0.1, 'Scanning media library...');
    const [mediaVideos, mediaAudio] = await Promise.all([
      this._getMediaFiles('video'),
      this._getMediaFiles('audio'),
    ]);

    this._saveCache(mediaVideos, mediaAudio);
    onProgress?.(1, 'Done');

    return { videos: mediaVideos, audio: mediaAudio };
  }

  loadFromCache(): {
    videos: FileItem[];
    audio: FileItem[];
  } {
    return {
      videos: this._getCached(CACHE_KEYS.videos),
      audio: this._getCached(CACHE_KEYS.audio),
    };
  }

  private _saveCache(
    videos: FileItem[],
    audio: FileItem[],
  ) {
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

  private async _getMediaFiles(type: 'video' | 'audio'): Promise<FileItem[]> {
    try {
      const mediaType = type === 'audio' ? 'audio' : 'video';
      const { assets } = await MediaLibrary.getAssetsAsync({
        mediaType,
        first: 2000,
        sortBy: ['creationTime'],
      });

      return assets.map((asset) => ({
        uri: asset.uri,
        name: asset.filename,
        type,
        modifiedAt: asset.modificationTime * 1000,
        createdAt: asset.creationTime * 1000,
        thumbnail: type !== 'audio' ? asset.uri : undefined,
        duration: asset.duration ? asset.duration * 1000 : undefined,
        artColor: this.getArtColor(asset.filename),
        size: (asset as any).fileSize ?? undefined,
      }));
    } catch {
      return [];
    }
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return true;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  }
}

export const fileEngine = FileEngine.getInstance();
