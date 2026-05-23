import { eventBus, AppEvents } from './EventBus';

interface ArtworkCacheEntry {
  uri: string;
  dataUri: string;
  cachedAt: number;
  size: number;
}

class ArtworkServiceClass {
  private static instance: ArtworkServiceClass;
  private _memoryCache = new Map<string, ArtworkCacheEntry>();
  private _pendingLoads = new Map<string, Promise<string | null>>();
  private _maxCacheSize = 50;
  private _maxMemoryBytes = 50 * 1024 * 1024;
  private _currentBytes = 0;

  static getInstance(): ArtworkServiceClass {
    if (!ArtworkServiceClass.instance) {
      ArtworkServiceClass.instance = new ArtworkServiceClass();
    }
    return ArtworkServiceClass.instance;
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
    return entry ? entry.dataUri : null;
  }

  async getArtwork(fileUri: string): Promise<string | null> {
    const existing = this.getCached(fileUri);
    if (existing) return existing;

    const pending = this._pendingLoads.get(fileUri);
    if (pending) return pending;

    const loadPromise = this._loadArtwork(fileUri);
    this._pendingLoads.set(fileUri, loadPromise);

    try {
      const result = await loadPromise;
      return result;
    } finally {
      this._pendingLoads.delete(fileUri);
    }
  }

  private async _loadArtwork(fileUri: string): Promise<string | null> {
    try {
      const MetadataServiceModule = await import('./Metadata/MetadataService');
      const meta = await MetadataServiceModule.MetadataService.extract(fileUri, '');
      if (meta?.artwork) {
        this._cacheArtwork(fileUri, meta.artwork);
        eventBus.emit(AppEvents.ARTWORK_LOADED, fileUri, meta.artwork);
        return meta.artwork;
      }
      return null;
    } catch {
      eventBus.emit(AppEvents.ARTWORK_FAILED, fileUri);
      return null;
    }
  }

  private _cacheArtwork(fileUri: string, dataUri: string): void {
    this._evictIfNeeded();
    const estimatedSize = dataUri.length * 2;
    this._memoryCache.set(fileUri, {
      uri: fileUri,
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
      if (evicted) {
        this._currentBytes -= evicted.size;
      }
      this._memoryCache.delete(oldest.key);
    }
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

  getCacheStats(): { size: number; bytes: number; maxBytes: number } {
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
