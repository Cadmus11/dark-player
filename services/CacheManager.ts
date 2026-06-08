import {
  cacheDirectory,
  getInfoAsync,
  deleteAsync,
  readDirectoryAsync,
  makeDirectoryAsync,
} from 'expo-file-system/legacy';
import { MMKV } from 'react-native-mmkv';
import { eventBus, AppEvents } from './EventBus';

const storage = new MMKV({ id: 'cache-manager' });

const CACHE_DIRS = {
  artwork: 'artwork',
  metadataArtwork: 'metadata_artwork',
  thumbnails: 'thumbnails',
};

const MAX_CACHE_SIZE_MB = 200;
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000;
const LAST_CLEANUP_KEY = '@cache_last_cleanup';

class CacheManagerClass {
  private static instance: CacheManagerClass;
  private _cleaning = false;

  static getInstance(): CacheManagerClass {
    if (!CacheManagerClass.instance) {
      CacheManagerClass.instance = new CacheManagerClass();
    }
    return CacheManagerClass.instance;
  }

  async cleanup(): Promise<void> {
    if (this._cleaning) return;
    this._cleaning = true;

    try {
      const lastCleanup = storage.getNumber(LAST_CLEANUP_KEY) || 0;
      if (Date.now() - lastCleanup < CLEANUP_INTERVAL_MS) return;

      await this._removeStaleFiles();
      await this._enforceSizeLimit();

      storage.set(LAST_CLEANUP_KEY, Date.now());
      eventBus.emit(AppEvents.CACHE_CLEANUP_COMPLETE);
    } catch (e) {
      console.warn('[CacheManager] Cleanup failed:', e);
    } finally {
      this._cleaning = false;
    }
  }

  async forceCleanup(): Promise<void> {
    storage.set(LAST_CLEANUP_KEY, 0);
    await this.cleanup();
  }

  async getCacheSize(): Promise<number> {
    let totalBytes = 0;
    for (const dir of Object.values(CACHE_DIRS)) {
      const dirPath = (cacheDirectory || '') + dir + '/';
      try {
        const info = await getInfoAsync(dirPath);
        if (info.exists) {
          totalBytes += await this._getDirSize(dirPath);
        }
      } catch {}
    }
    return totalBytes;
  }

  async clearAll(): Promise<void> {
    for (const dir of Object.values(CACHE_DIRS)) {
      const dirPath = (cacheDirectory || '') + dir + '/';
      try {
        await deleteAsync(dirPath, { idempotent: true });
      } catch {}
    }
    await this._ensureDirs();
  }

  async clearArtwork(): Promise<void> {
    const dirPath = (cacheDirectory || '') + CACHE_DIRS.artwork + '/';
    try {
      await deleteAsync(dirPath, { idempotent: true });
      await makeDirectoryAsync(dirPath, { intermediates: true });
    } catch {}
  }

  async clearMetadataArtwork(): Promise<void> {
    const dirPath = (cacheDirectory || '') + CACHE_DIRS.metadataArtwork + '/';
    try {
      await deleteAsync(dirPath, { idempotent: true });
      await makeDirectoryAsync(dirPath, { intermediates: true });
    } catch {}
  }

  private async _removeStaleFiles(): Promise<void> {
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000;

    for (const dir of Object.values(CACHE_DIRS)) {
      const dirPath = (cacheDirectory || '') + dir + '/';
      try {
        const info = await getInfoAsync(dirPath);
        if (!info.exists) continue;

        const entries = await readDirectoryAsync(dirPath);
        for (const entry of entries) {
          const entryPath = dirPath + entry;
          try {
            const entryInfo = await getInfoAsync(entryPath);
            if (entryInfo.exists && entryInfo.modificationTime) {
              const age = now - entryInfo.modificationTime;
              if (age > maxAge) {
                await deleteAsync(entryPath, { idempotent: true });
              }
            }
          } catch {}
        }
      } catch {}
    }
  }

  private async _enforceSizeLimit(): Promise<void> {
    const sizeBytes = await this.getCacheSize();
    const maxSizeBytes = MAX_CACHE_SIZE_MB * 1024 * 1024;

    if (sizeBytes <= maxSizeBytes) return;

    for (const dir of Object.values(CACHE_DIRS)) {
      const dirPath = (cacheDirectory || '') + dir + '/';
      try {
        const info = await getInfoAsync(dirPath);
        if (!info.exists) continue;

        const entries = await readDirectoryAsync(dirPath);
        const entriesWithAge: { path: string; age: number }[] = [];

        for (const entry of entries) {
          const entryPath = dirPath + entry;
          try {
            const entryInfo = await getInfoAsync(entryPath);
            if (entryInfo.exists) {
              entriesWithAge.push({
                path: entryPath,
                age: Date.now() - (entryInfo.modificationTime || 0),
              });
            }
          } catch {}
        }

        entriesWithAge.sort((a, b) => b.age - a.age);

        for (const entry of entriesWithAge) {
          const currentSize = await this.getCacheSize();
          if (currentSize <= maxSizeBytes * 0.8) break;
          await deleteAsync(entry.path, { idempotent: true });
        }
      } catch {}
    }
  }

  private async _getDirSize(dirPath: string): Promise<number> {
    let total = 0;
    try {
      const entries = await readDirectoryAsync(dirPath);
      for (const entry of entries) {
        try {
          const info = await getInfoAsync(dirPath + entry);
          if (info.exists && info.size) total += info.size;
        } catch {}
      }
    } catch {}
    return total;
  }

  private async _ensureDirs(): Promise<void> {
    for (const dir of Object.values(CACHE_DIRS)) {
      const dirPath = (cacheDirectory || '') + dir + '/';
      try {
        const info = await getInfoAsync(dirPath);
        if (!info.exists) {
          await makeDirectoryAsync(dirPath, { intermediates: true });
        }
      } catch {}
    }
  }
}

export const cacheManager = CacheManagerClass.getInstance();
