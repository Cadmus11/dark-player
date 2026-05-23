const FileSystem: any = require('expo-file-system');
import { eventBus, AppEvents } from './EventBus';

interface MemoryCacheEntry {
  dataUri: string;
  cachedAt: number;
  size: number;
}

class ArtworkServiceClass {
  private static instance: ArtworkServiceClass;
  private _memoryCache = new Map<string, MemoryCacheEntry>();
  private _pendingLoads = new Map<string, Promise<string | null>>();
  private _maxCacheSize = 50;
  private _maxMemoryBytes = 50 * 1024 * 1024;
  private _currentBytes = 0;
  private _diskCacheDir = '';

  static getInstance(): ArtworkServiceClass {
    if (!ArtworkServiceClass.instance) {
      ArtworkServiceClass.instance = new ArtworkServiceClass();
    }
    return ArtworkServiceClass.instance;
  }

  private async _ensureDiskDir(): Promise<string> {
    if (this._diskCacheDir) return this._diskCacheDir;
    this._diskCacheDir = FileSystem.cacheDirectory + 'artwork/';
    try {
      const info = await FileSystem.getInfoAsync(this._diskCacheDir);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(this._diskCacheDir, { intermediates: true });
      }
    } catch {}
    return this._diskCacheDir;
  }

  setMaxCacheSize(size: number): void {
    this._maxCacheSize = size;
    this._evictIfNeeded();
  }

  setMaxMemoryBytes(bytes: number): void {
    this._maxMemoryBytes = bytes;
    this._evictIfNeeded();
  }

  getCached(fileUri: string): string | null {
    const entry = this._memoryCache.get(fileUri);
    if (entry) return entry.dataUri;
    return null;
  }

  async getArtwork(fileUri: string, fileName?: string): Promise<string | null> {
    const memCached = this.getCached(fileUri);
    if (memCached) return memCached;

    const pending = this._pendingLoads.get(fileUri);
    if (pending) return pending;

    const loadPromise = this._loadArtwork(fileUri, fileName || '');
    this._pendingLoads.set(fileUri, loadPromise);

    try {
      const result = await loadPromise;
      return result;
    } finally {
      this._pendingLoads.delete(fileUri);
    }
  }

  private async _loadArtwork(fileUri: string, fileName: string): Promise<string | null> {
    const diskUri = await this._tryDiskCache(fileUri);
    if (diskUri) {
      this._cacheInMemory(fileUri, diskUri);
      return diskUri;
    }

    try {
      const { MetadataService } = await import('./Metadata/MetadataService');
      const meta = await MetadataService.extract(fileUri, fileName);
      if (meta?.artwork) {
        this._cacheInMemory(fileUri, meta.artwork);
        this._saveToDisk(fileUri, meta.artwork);
        eventBus.emit(AppEvents.ARTWORK_LOADED, fileUri, meta.artwork);
        return meta.artwork;
      }
    } catch {}

    if (fileName) {
      const placeholder = this._generatePlaceholder(fileName);
      this._cacheInMemory(fileUri, placeholder);
      return placeholder;
    }

    return null;
  }

  private _generatePlaceholder(name: string): string {
    const COLORS = [
      '#C2FC4A', '#6c5ce7', '#00cec9', '#e17055',
      '#fdcb6e', '#74b9ff', '#ff7675', '#55efc4',
      '#a29bfe', '#fd79a8', '#f39c12', '#27ae60',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COLORS[Math.abs(hash) % COLORS.length];
  }

  private _cacheInMemory(fileUri: string, dataUri: string): void {
    this._evictIfNeeded();
    const estimatedSize = dataUri.length * 2;
    this._memoryCache.set(fileUri, {
      dataUri,
      cachedAt: Date.now(),
      size: estimatedSize,
    });
    this._currentBytes += estimatedSize;
    this._evictIfNeeded();
  }

  private _evictIfNeeded(): void {
    while (this._memoryCache.size > this._maxCacheSize || this._currentBytes > this._maxMemoryBytes) {
      let oldest: { key: string; time: number } | null = null;
      for (const [key, entry] of this._memoryCache) {
        if (!oldest || entry.cachedAt < oldest.time) {
          oldest = { key, time: entry.cachedAt };
        }
      }
      if (!oldest) break;
      const evicted = this._memoryCache.get(oldest.key);
      if (evicted) this._currentBytes -= evicted.size;
      this._memoryCache.delete(oldest.key);
    }
  }

  private async _tryDiskCache(fileUri: string): Promise<string | null> {
    try {
      const dir = await this._ensureDiskDir();
      const cacheKey = this._hashUri(fileUri);
      const cachePath = dir + cacheKey;
      const info = await FileSystem.getInfoAsync(cachePath);
      if (info.exists) {
        const base64 = await FileSystem.readAsStringAsync(cachePath, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const mimeType = 'image/jpeg';
        return `data:${mimeType};base64,${base64}`;
      }
    } catch {}
    return null;
  }

  private async _saveToDisk(fileUri: string, dataUri: string): Promise<void> {
    try {
      if (!dataUri.startsWith('data:')) return;
      const dir = await this._ensureDiskDir();
      const cacheKey = this._hashUri(fileUri);
      const base64 = dataUri.split(',')[1];
      if (base64) {
        await FileSystem.writeAsStringAsync(dir + cacheKey, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
    } catch {}
  }

  private _hashUri(uri: string): string {
    let hash = 0;
    for (let i = 0; i < uri.length; i++) {
      hash = (hash << 5) - hash + uri.charCodeAt(i);
      hash |= 0;
    }
    return 'art_' + Math.abs(hash).toString(36);
  }

  preload(uris: string[]): void {
    for (const uri of uris) {
      if (!this._memoryCache.has(uri) && !this._pendingLoads.has(uri)) {
        this.getArtwork(uri);
      }
    }
  }

  invalidate(fileUri: string): void {
    const entry = this._memoryCache.get(fileUri);
    if (entry) {
      this._currentBytes -= entry.size;
      this._memoryCache.delete(fileUri);
    }
  }

  invalidateAll(): void {
    this._memoryCache.clear();
    this._currentBytes = 0;
    this._pendingLoads.clear();
  }

  getCacheStats() {
    return {
      size: this._memoryCache.size,
      bytes: this._currentBytes,
      maxBytes: this._maxMemoryBytes,
    };
  }

  cleanup(): void {
    this._memoryCache.clear();
    this._currentBytes = 0;
    this._pendingLoads.clear();
  }
}

export const artworkService = ArtworkServiceClass.getInstance();
