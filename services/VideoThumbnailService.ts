import { cacheDirectory, getInfoAsync, makeDirectoryAsync } from 'expo-file-system/legacy';

interface ThumbnailCacheEntry {
  path: string;
  cachedAt: number;
}

class VideoThumbnailServiceClass {
  private static instance: VideoThumbnailServiceClass;
  private _memoryCache = new Map<string, ThumbnailCacheEntry>();
  private _pendingLoads = new Map<string, Promise<string | null>>();
  private _diskCacheDir = '';

  static getInstance(): VideoThumbnailServiceClass {
    if (!VideoThumbnailServiceClass.instance) {
      VideoThumbnailServiceClass.instance = new VideoThumbnailServiceClass();
    }
    return VideoThumbnailServiceClass.instance;
  }

  private async _ensureDiskDir(): Promise<string> {
    if (this._diskCacheDir) return this._diskCacheDir;
    this._diskCacheDir = (cacheDirectory || '') + 'thumbnails/';
    try {
      const info = await getInfoAsync(this._diskCacheDir);
      if (!info.exists) {
        await makeDirectoryAsync(this._diskCacheDir, { intermediates: true });
      }
    } catch (e) {
      console.warn('[VideoThumbnailService]', e);
    }
    return this._diskCacheDir;
  }

  getCached(videoUri: string): string | null {
    const entry = this._memoryCache.get(videoUri);
    if (entry) return entry.path;
    return null;
  }

  async getThumbnail(videoUri: string): Promise<string | null> {
    const memCached = this.getCached(videoUri);
    if (memCached) return memCached;

    const pending = this._pendingLoads.get(videoUri);
    if (pending) return pending;

    const loadPromise = this._loadThumbnail(videoUri);
    this._pendingLoads.set(videoUri, loadPromise);

    try {
      return await loadPromise;
    } finally {
      this._pendingLoads.delete(videoUri);
    }
  }

  private async _loadThumbnail(videoUri: string): Promise<string | null> {
    const diskPath = await this._tryDiskCache(videoUri);
    if (diskPath) {
      this._memoryCache.set(videoUri, { path: diskPath, cachedAt: Date.now() });
      return diskPath;
    }

    if (videoUri.endsWith('.mp4') || videoUri.endsWith('.mov') || videoUri.endsWith('.mkv')) {
      return videoUri;
    }

    return null;
  }

  private async _tryDiskCache(videoUri: string): Promise<string | null> {
    try {
      const dir = await this._ensureDiskDir();
      const cacheKey = this._hashUri(videoUri);
      const cachePath = dir + cacheKey;
      const info = await getInfoAsync(cachePath);
      if (info.exists) {
        return cachePath;
      }
    } catch (e) {
      console.warn('[VideoThumbnailService]', e);
    }
    return null;
  }

  preload(videoUris: string[]): void {
    const CONCURRENCY = 4;
    let inflight = 0;
    let cursor = 0;
    const queue = videoUris.filter(
      (uri) => !this._memoryCache.has(uri) && !this._pendingLoads.has(uri)
    );
    if (queue.length === 0) return;

    const launchNext = () => {
      while (inflight < CONCURRENCY && cursor < queue.length) {
        const uri = queue[cursor++];
        inflight++;
        this.getThumbnail(uri).finally(() => {
          inflight--;
          if (cursor < queue.length) launchNext();
        });
      }
    };
    launchNext();
  }

  invalidate(videoUri: string): void {
    this._memoryCache.delete(videoUri);
  }

  invalidateAll(): void {
    this._memoryCache.clear();
    this._pendingLoads.clear();
  }

  private _hashUri(uri: string): string {
    let hash = 0;
    for (let i = 0; i < uri.length; i++) {
      hash = (hash << 5) - hash + uri.charCodeAt(i);
      hash |= 0;
    }
    return 'thumb_' + Math.abs(hash).toString(36);
  }

  get stats() {
    return {
      memoryCacheSize: this._memoryCache.size,
      pendingLoads: this._pendingLoads.size,
    };
  }
}

export const videoThumbnailService = VideoThumbnailServiceClass.getInstance();
