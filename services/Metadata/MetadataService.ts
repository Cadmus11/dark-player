import { MMKV } from 'react-native-mmkv';
import type { MediaMetadata } from '../../types';

const storage = new MMKV({ id: 'metadata-cache' });
const CACHE_PREFIX = '@meta_';

export const MetadataService = {
  async extract(uri: string, name: string): Promise<MediaMetadata> {
    const cached = this.getCached(uri);
    if (cached) return cached;

    const metadata: MediaMetadata = {
      title: name.replace(/\.[^.]+$/, ''),
      artist: undefined,
      album: undefined,
      duration: undefined,
    };

    const parts = name.replace(/\.[^.]+$/, '').split(' - ');
    if (parts.length >= 2) {
      metadata.artist = parts[0].trim();
      metadata.title = parts.slice(1).join(' - ').trim();
    }

    this.cache(uri, metadata);
    return metadata;
  },

  cache(uri: string, metadata: MediaMetadata) {
    storage.set(CACHE_PREFIX + uri, JSON.stringify(metadata));
  },

  getCached(uri: string): MediaMetadata | null {
    try {
      const data = storage.getString(CACHE_PREFIX + uri);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  clearCache() {
    const keys = storage.getAllKeys();
    keys.filter((k) => k.startsWith(CACHE_PREFIX)).forEach((k) => storage.delete(k));
  },
};
