import RNFS from 'react-native-fs';
import MediaMeta from 'react-native-media-meta';
import { DatabaseService } from '../DatabaseService';
import type { MediaMetadata } from '../../types';

const ARTWORK_DIR = (RNFS.CachesDirectoryPath || '') + 'metadata_artwork/';

async function ensureArtworkDir() {
  try {
    const exists = await RNFS.exists(ARTWORK_DIR);
    if (!exists) {
      await RNFS.mkdir(ARTWORK_DIR);
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
    const cached = await this.getCached(uri);
    if (cached) return cached;

    const metadata: MediaMetadata = {};

    try {
      const data = await MediaMeta.get(uri, { getThumb: false });
      if (data) {
        metadata.title = data.title || undefined;
        metadata.artist = data.artist || undefined;
        metadata.album = data.albumName || data.album || undefined;
        metadata.composer = data.composer || data.album_artist || undefined;
        metadata.year = data.year ? parseInt(data.year, 10) : data.date ? parseInt(data.date, 10) : undefined;
        metadata.trackNumber = data.track ? parseInt(data.track, 10) || undefined : undefined;
        metadata.duration = data.duration ? parseInt(data.duration, 10) : undefined;

        if (data.thumb) {
          const artworkPath = formatArtworkPath(uri);
          try {
            await RNFS.writeFile(artworkPath, data.thumb, 'base64');
            metadata.artwork = artworkPath;
          } catch {}
        }
      }
    } catch {}

    if (!metadata.title) {
      const parsed = parseArtistTitle(name);
      metadata.title = parsed.title;
      if (parsed.artist && !metadata.artist) metadata.artist = parsed.artist;
    }

    await this.cache(uri, metadata);
    return metadata;
  },

  async extractBatch(files: { uri: string; name: string }[], onProgress?: (done: number, total: number) => void) {
    const total = files.length;
    for (let i = 0; i < total; i++) {
      await this.extract(files[i].uri, files[i].name);
      onProgress?.(i + 1, total);
    }
  },

  async cache(uri: string, metadata: MediaMetadata) {
    await DatabaseService.cacheMetadata(uri, metadata);
  },

  async getCached(uri: string): Promise<MediaMetadata | null> {
    return DatabaseService.getCachedMetadata(uri);
  },

  async getArtworkPath(uri: string): Promise<string | null> {
    const cached = await this.getCached(uri);
    return cached?.artwork || null;
  },

  async clearCache() {
    try {
      await RNFS.unlink(ARTWORK_DIR);
    } catch {}
    await DatabaseService.clearMetadataCache();
  },
};
