import { MMKV } from 'react-native-mmkv';
const FileSystem: any = require('expo-file-system');
import type { MediaMetadata } from '../../types';

let getAudioMetadata: any = null;
try {
  getAudioMetadata = require('@missingcore/audio-metadata').getAudioMetadata;
} catch {}

const storage = new MMKV({ id: 'metadata-cache' });
const CACHE_PREFIX = '@meta_v2_';
const ARTWORK_DIR = (FileSystem.cacheDirectory || '') + 'metadata_artwork/';

async function ensureArtworkDir() {
  try {
    const info = await FileSystem.getInfoAsync(ARTWORK_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(ARTWORK_DIR, { intermediates: true });
    }
  } catch {}
}

function parseArtistTitle(filename: string): { artist?: string; title: string } {
  const name = filename.replace(/\.[^.]+$/, '').trim();
  const separators = [' - ', ' – ', ' — ', ' | ', ' // '];
  for (const sep of separators) {
    const idx = name.indexOf(sep);
    if (idx > 0) {
      return { artist: name.substring(0, idx).trim(), title: name.substring(idx + sep.length).trim() };
    }
  }
  return { title: name };
}

function formatArtworkPath(uri: string): string {
  const hash = uri.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0).toString(36);
  return ARTWORK_DIR + hash + '.jpg';
}

export const MetadataService = {
  async extract(uri: string, name: string): Promise<MediaMetadata> {
    const cached = this.getCached(uri);
    if (cached) return cached;

    const metadata: MediaMetadata = {};

    if (getAudioMetadata) {
      try {
        const wanted = ['album', 'albumArtist', 'artist', 'name', 'track', 'year'] as const;
        const data = await getAudioMetadata(uri, wanted);
        if (data?.metadata) {
          const m = data.metadata;
          metadata.title = m.name || undefined;
          metadata.artist = m.artist || undefined;
          metadata.album = m.album || undefined;
          metadata.year = m.year || undefined;
          metadata.trackNumber = m.track || undefined;
          metadata.composer = m.albumArtist || undefined;

          if (m.artwork) {
            const artworkPath = formatArtworkPath(uri);
            try {
              await FileSystem.writeAsStringAsync(artworkPath, m.artwork, {
                encoding: FileSystem.EncodingType.Base64,
              });
              metadata.artwork = artworkPath;
            } catch {}
          }
        }
      } catch {}
    }

    if (!metadata.title) {
      const parsed = parseArtistTitle(name);
      metadata.title = parsed.title;
      if (parsed.artist && !metadata.artist) metadata.artist = parsed.artist;
    }

    this.cache(uri, metadata);
    return metadata;
  },

  async extractBatch(files: { uri: string; name: string }[], onProgress?: (done: number, total: number) => void) {
    const total = files.length;
    for (let i = 0; i < total; i++) {
      await this.extract(files[i].uri, files[i].name);
      onProgress?.(i + 1, total);
    }
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

  getArtworkPath(uri: string): string | null {
    const cached = this.getCached(uri);
    return cached?.artwork || null;
  },

  clearCache() {
    const keys = storage.getAllKeys();
    keys.filter((k) => k.startsWith(CACHE_PREFIX)).forEach((k) => storage.delete(k));
    try {
      FileSystem.deleteAsync(ARTWORK_DIR, { idempotent: true });
    } catch {}
  },
};
