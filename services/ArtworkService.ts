import {
  cacheDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from 'expo-file-system/legacy';
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
    this._diskCacheDir = cacheDirectory + 'artwork/';
    try {
      const info = await getInfoAsync(this._diskCacheDir);
      if (!info.exists) {
        await makeDirectoryAsync(this._diskCacheDir);
      }
    } catch (e) {
      console.warn('[ArtworkService]', e);
    }
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
    } catch (e) {
      console.warn('[ArtworkService]', e);
    }

    if (fileName) {
      const placeholder = this._generatePlaceholder(fileName);
      this._cacheInMemory(fileUri, placeholder);
      return placeholder;
    }

    return null;
  }

  private _generatePlaceholder(name: string): string {
    const COLORS = [
      '#00E5FF',
      '#3B82F6',
      '#8B5CF6',
      '#22D3EE',
      '#A855F7',
      '#38BDF8',
      '#F97316',
      '#22C55E',
      '#EF4444',
      '#FB7185',
      '#00F5D4',
      '#00FF66',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COLORS[Math.abs(hash) % COLORS.length];
  }

  private _cacheInMemory(fileUri: string, dataUri: string): void {
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
    while (
      this._memoryCache.size > this._maxCacheSize ||
      this._currentBytes > this._maxMemoryBytes
    ) {
      if (this._memoryCache.size === 0) break;
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      for (const [key, entry] of this._memoryCache) {
        if (entry.cachedAt < oldestTime) {
          oldestTime = entry.cachedAt;
          oldestKey = key;
        }
      }
      if (oldestKey === null) break;
      const evicted = this._memoryCache.get(oldestKey);
      if (evicted) this._currentBytes -= evicted.size;
      this._memoryCache.delete(oldestKey);
    }
  }

  private async _tryDiskCache(fileUri: string): Promise<string | null> {
    try {
      const dir = await this._ensureDiskDir();
      const cacheKey = this._hashUri(fileUri);
      const cachePath = dir + cacheKey;
      const info = await getInfoAsync(cachePath);
      if (info.exists) {
        const base64 = await readAsStringAsync(cachePath, { encoding: 'base64' });
        const mimeType = 'image/jpeg';
        return `data:${mimeType};base64,${base64}`;
      }
    } catch (e) {
      console.warn('[ArtworkService]', e);
    }
    return null;
  }

  private async _saveToDisk(fileUri: string, dataUri: string): Promise<void> {
    try {
      if (!dataUri.startsWith('data:')) return;
      const dir = await this._ensureDiskDir();
      const cacheKey = this._hashUri(fileUri);
      const base64 = dataUri.split(',')[1];
      if (base64) {
        await writeAsStringAsync(dir + cacheKey, base64, { encoding: 'base64' });
      }
    } catch (e) {
      console.warn('[ArtworkService]', e);
    }
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
    const PRELOAD_CONCURRENCY = 4;
    let inflight = 0;
    let cursor = 0;
    const queue = uris.filter((uri) => !this._memoryCache.has(uri) && !this._pendingLoads.has(uri));
    if (queue.length === 0) return;

    const launchNext = () => {
      while (inflight < PRELOAD_CONCURRENCY && cursor < queue.length) {
        const uri = queue[cursor++];
        inflight++;
        this.getArtwork(uri).finally(() => {
          inflight--;
          if (cursor < queue.length) launchNext();
        });
      }
    };
    launchNext();
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
