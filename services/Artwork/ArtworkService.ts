import { MMKV } from 'react-native-mmkv';
import * as FileSystem from 'expo-file-system';
import type { ArtworkCache, FileItem } from '../../types';

const storage = new MMKV({ id: 'artwork-cache' });
const CACHE_INDEX_KEY = '@artwork_index';
const ARTWORK_DIR = FileSystem.cacheDirectory + 'artwork/';

async function ensureDir() {
  const dirInfo = await FileSystem.getInfoAsync(ARTWORK_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(ARTWORK_DIR, { intermediates: true });
  }
}

function getCacheKey(uri: string): string {
  return 'art_' + uri.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0).toString(36);
}

function getDataUri(mimeType: string, base64: string): string {
  return `data:${mimeType};base64,${base64}`;
}

function extractBase64FromPath(path: string): string | null {
  return path || null;
}

export const ArtworkService = {
  async extractFromFile(file: FileItem): Promise<string | null> {
    const cached = this.getCached(file.uri);
    if (cached) return cached.dataUri;

    if (file.thumbnail) {
      try {
        const info = await FileSystem.getInfoAsync(file.thumbnail);
        if (info.exists) {
          const base64 = await FileSystem.readAsStringAsync(file.thumbnail, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const ext = file.thumbnail.split('.').pop()?.toLowerCase() || 'jpeg';
          const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
          const dataUri = getDataUri(mimeType, base64);
          this.cache(file.uri, file.thumbnail, dataUri);
          return dataUri;
        }
      } catch {}
    }

    return null;
  },

  cache(fileUri: string, sourceUri: string, dataUri: string) {
    const index = this.getIndex();
    index[fileUri] = { uri: sourceUri, dataUri, cachedAt: Date.now(), fileUri };
    storage.set(CACHE_INDEX_KEY, JSON.stringify(index));
  },

  getCached(fileUri: string): ArtworkCache | null {
    const index = this.getIndex();
    return index[fileUri] || null;
  },

  getIndex(): Record<string, ArtworkCache> {
    try {
      const data = storage.getString(CACHE_INDEX_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  clearCache() {
    storage.delete(CACHE_INDEX_KEY);
  },

  getPlaceholderColor(name: string): string {
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
  },
};
