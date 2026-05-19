import { MMKV } from 'react-native-mmkv';
import type { FileItem } from '../types';

const storage = new MMKV({ id: 'media-cache' });

const CACHE_KEYS = {
  IMAGES: '@media_cache_images',
  VIDEOS: '@media_cache_videos',
  AUDIO: '@media_cache_audio',
  DOCUMENTS: '@media_cache_documents',
  EPUB: '@media_cache_epub',
  OTHER: '@media_cache_other',
  TIMESTAMP: '@media_cache_last_scan',
  VERSION: '@media_cache_version',
};

const CACHE_VERSION = 2;
const FULL_RESCAN_INTERVAL_MS = 24 * 60 * 60 * 1000;

function serialize(items: FileItem[]): string {
  return JSON.stringify(items);
}

function deserialize(data: string): FileItem[] {
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export const MediaCacheService = {
  saveImages(items: FileItem[]) {
    storage.set(CACHE_KEYS.IMAGES, serialize(items));
  },

  getImages(): FileItem[] {
    const data = storage.getString(CACHE_KEYS.IMAGES);
    return data ? deserialize(data) : [];
  },

  saveVideos(items: FileItem[]) {
    storage.set(CACHE_KEYS.VIDEOS, serialize(items));
  },

  getVideos(): FileItem[] {
    const data = storage.getString(CACHE_KEYS.VIDEOS);
    return data ? deserialize(data) : [];
  },

  saveAudio(items: FileItem[]) {
    storage.set(CACHE_KEYS.AUDIO, serialize(items));
  },

  getAudio(): FileItem[] {
    const data = storage.getString(CACHE_KEYS.AUDIO);
    return data ? deserialize(data) : [];
  },

  saveDocuments(items: FileItem[]) {
    storage.set(CACHE_KEYS.DOCUMENTS, serialize(items));
  },

  getDocuments(): FileItem[] {
    const data = storage.getString(CACHE_KEYS.DOCUMENTS);
    return data ? deserialize(data) : [];
  },

  saveEpub(items: FileItem[]) {
    storage.set(CACHE_KEYS.EPUB, serialize(items));
  },

  getEpub(): FileItem[] {
    const data = storage.getString(CACHE_KEYS.EPUB);
    return data ? deserialize(data) : [];
  },

  saveOther(items: FileItem[]) {
    storage.set(CACHE_KEYS.OTHER, serialize(items));
  },

  getOther(): FileItem[] {
    const data = storage.getString(CACHE_KEYS.OTHER);
    return data ? deserialize(data) : [];
  },

  saveAll(images: FileItem[], videos: FileItem[], audio: FileItem[], documents: FileItem[], epub: FileItem[], other: FileItem[]) {
    this.saveImages(images);
    this.saveVideos(videos);
    this.saveAudio(audio);
    this.saveDocuments(documents);
    this.saveEpub(epub);
    this.saveOther(other);
    storage.set(CACHE_KEYS.TIMESTAMP, Date.now());
    storage.set(CACHE_KEYS.VERSION, CACHE_VERSION);
  },

  getLastScanTimestamp(): number {
    return storage.getNumber(CACHE_KEYS.TIMESTAMP) || 0;
  },

  shouldFullRescan(): boolean {
    const version = storage.getNumber(CACHE_KEYS.VERSION) || 0;
    if (version !== CACHE_VERSION) return true;
    const lastScan = this.getLastScanTimestamp();
    return Date.now() - lastScan > FULL_RESCAN_INTERVAL_MS;
  },

  hasCachedData(): boolean {
    return storage.getString(CACHE_KEYS.IMAGES) !== undefined;
  },

  clearAll() {
    storage.clearAll();
  },
};
