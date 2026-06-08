import { MMKV } from 'react-native-mmkv';
import type { FileItem, MediaMetadata } from '../types';
import { eventBus, AppEvents } from './EventBus';

const storage = new MMKV({ id: 'media-repository' });
const metaStorage = new MMKV({ id: 'metadata-cache' });

const KEYS = {
  videos: '@repo_videos',
  audio: '@repo_audio',
  timestamp: '@repo_timestamp',
  version: '@repo_version',
  lastModified: '@repo_last_modified',
};

const META_PREFIX = '@meta_';
const REPO_VERSION = 1;

class MediaRepositoryClass {
  private static instance: MediaRepositoryClass;
  private _videos: FileItem[] = [];
  private _audio: FileItem[] = [];
  private _metadataCache = new Map<string, MediaMetadata>();

  static getInstance(): MediaRepositoryClass {
    if (!MediaRepositoryClass.instance) {
      MediaRepositoryClass.instance = new MediaRepositoryClass();
    }
    return MediaRepositoryClass.instance;
  }

  getAllVideos(): FileItem[] {
    return this._videos;
  }

  getAllAudio(): FileItem[] {
    return this._audio;
  }

  getAllFiles(): FileItem[] {
    return [...this._videos, ...this._audio];
  }

  getByUri(uri: string): FileItem | undefined {
    return this._videos.find((f) => f.uri === uri) || this._audio.find((f) => f.uri === uri);
  }

  getAudioByUri(uri: string): FileItem | undefined {
    return this._audio.find((f) => f.uri === uri);
  }

  getVideoByUri(uri: string): FileItem | undefined {
    return this._videos.find((f) => f.uri === uri);
  }

  setVideos(videos: FileItem[]): void {
    this._videos = videos;
  }

  setAudio(audio: FileItem[]): void {
    this._audio = audio;
  }

  setAll(videos: FileItem[], audio: FileItem[]): void {
    this._videos = videos;
    this._audio = audio;
  }

  updateFile(uri: string, updates: Partial<FileItem>): void {
    const update = (files: FileItem[]) =>
      files.map((f) => (f.uri === uri ? { ...f, ...updates } : f));

    const audioIdx = this._audio.findIndex((f) => f.uri === uri);
    if (audioIdx !== -1) {
      this._audio = update(this._audio);
      eventBus.emit(
        AppEvents.FILE_UPDATED,
        uri,
        this._audio.find((f) => f.uri === uri)
      );
      return;
    }

    const videoIdx = this._videos.findIndex((f) => f.uri === uri);
    if (videoIdx !== -1) {
      this._videos = update(this._videos);
      eventBus.emit(
        AppEvents.FILE_UPDATED,
        uri,
        this._videos.find((f) => f.uri === uri)
      );
    }
  }

  updateThumbnail(uri: string, thumbnail: string): void {
    this.updateFile(uri, { thumbnail });
  }

  updateMetadata(uri: string, metadata: MediaMetadata): void {
    const file = this.getByUri(uri);
    if (!file) return;

    const updates: Partial<FileItem> = {};
    if (metadata.artist) updates.artist = metadata.artist;
    if (metadata.album) updates.album = metadata.album;
    if (metadata.genre) updates.genre = metadata.genre;
    if (metadata.year) updates.year = metadata.year;
    if (metadata.artwork) updates.thumbnail = metadata.artwork;

    if (Object.keys(updates).length > 0) {
      this.updateFile(uri, updates);
    }
  }

  persist(): void {
    storage.set(KEYS.videos, JSON.stringify(this._videos));
    storage.set(KEYS.audio, JSON.stringify(this._audio));
    storage.set(KEYS.timestamp, Date.now());
    storage.set(KEYS.version, REPO_VERSION);
  }

  loadFromDisk(): { videos: FileItem[]; audio: FileItem[] } {
    try {
      const v = storage.getString(KEYS.videos);
      const a = storage.getString(KEYS.audio);
      this._videos = v ? JSON.parse(v) : [];
      this._audio = a ? JSON.parse(a) : [];
    } catch {
      this._videos = [];
      this._audio = [];
    }
    return { videos: this._videos, audio: this._audio };
  }

  hasCache(): boolean {
    return storage.getString(KEYS.videos) !== undefined;
  }

  shouldRescan(): boolean {
    const version = storage.getNumber(KEYS.version) || 0;
    if (version !== REPO_VERSION) return true;
    const lastScan = storage.getNumber(KEYS.timestamp) || 0;
    return Date.now() - lastScan > 24 * 60 * 60 * 1000;
  }

  getLastModified(): number {
    return storage.getNumber(KEYS.lastModified) || 0;
  }

  setLastModified(time: number): void {
    storage.set(KEYS.lastModified, time);
  }

  clearAll(): void {
    this._videos = [];
    this._audio = [];
    this._metadataCache.clear();
    Object.values(KEYS).forEach((k) => storage.delete(k));
  }

  getMetadata(uri: string): MediaMetadata | null {
    if (this._metadataCache.has(uri)) return this._metadataCache.get(uri)!;
    try {
      const data = metaStorage.getString(META_PREFIX + uri);
      if (data) {
        const parsed = JSON.parse(data);
        this._metadataCache.set(uri, parsed);
        return parsed;
      }
    } catch {}
    return null;
  }

  setMetadata(uri: string, metadata: MediaMetadata): void {
    this._metadataCache.set(uri, metadata);
    metaStorage.set(META_PREFIX + uri, JSON.stringify(metadata));
  }

  clearMetadata(): void {
    this._metadataCache.clear();
    const keys = metaStorage.getAllKeys();
    keys.filter((k) => k.startsWith(META_PREFIX)).forEach((k) => metaStorage.delete(k));
  }

  get stats() {
    return {
      videos: this._videos.length,
      audio: this._audio.length,
      total: this._videos.length + this._audio.length,
      metadataCacheSize: this._metadataCache.size,
    };
  }
}

export const mediaRepository = MediaRepositoryClass.getInstance();
