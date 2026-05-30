import * as FileSystem from 'expo-file-system/legacy';
import { parseBuffer } from 'music-metadata-browser';
import { DatabaseService } from '../DatabaseService';
import type { MediaMetadata } from '../../types';

const ARTWORK_DIR = (FileSystem.documentDirectory || '') + 'metadata_artwork/';

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
      return {
        artist: name.substring(0, idx).trim(),
        title: name.substring(idx + sep.length).trim(),
      };
    }
  }
  return { title: name };
}

function formatArtworkPath(uri: string): string {
  const hash = uri
    .split('')
    .reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
    .toString(36);
  return ARTWORK_DIR + hash + '.jpg';
}

function getMimeType(uri: string): string | undefined {
  const ext = uri.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'mp3':
      return 'audio/mpeg';
    case 'flac':
      return 'audio/flac';
    case 'm4a':
    case 'm4b':
    case 'alac':
      return 'audio/mp4';
    case 'ogg':
      return 'audio/ogg';
    case 'opus':
      return 'audio/opus';
    case 'wav':
      return 'audio/wav';
    case 'wma':
      return 'audio/x-ms-wma';
    case 'aac':
      return 'audio/aac';
    default:
      return undefined;
  }
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

export const MetadataService = {
  async extract(uri: string, name: string): Promise<MediaMetadata> {
    const cached = await this.getCached(uri);
    if (cached) return cached;

    const metadata: MediaMetadata = {};

    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const buffer = base64ToUint8Array(base64);
      const mimeType = getMimeType(uri);
      const data = await parseBuffer(buffer, mimeType || 'audio/mpeg');

      if (data) {
        const { common, format } = data;

        metadata.title = common.title || undefined;
        metadata.artist = common.artist || undefined;
        metadata.album = common.album || undefined;
        metadata.composer = common.composer?.[0] || common.albumartist || undefined;
        metadata.year = common.year || undefined;
        metadata.trackNumber = common.track?.no ?? undefined;
        metadata.duration = format.duration ? Math.round(format.duration * 1000) : undefined;
        metadata.bitrate = format.bitrate || undefined;
        metadata.sampleRate = format.sampleRate || undefined;
        metadata.genre = common.genre?.[0] || undefined;

        const picture = common.picture?.[0];
        if (picture?.data) {
          const artworkPath = formatArtworkPath(uri);
          try {
            await ensureArtworkDir();
            const artworkBase64 = uint8ArrayToBase64(picture.data);
            await FileSystem.writeAsStringAsync(artworkPath, artworkBase64, { encoding: FileSystem.EncodingType.Base64 });
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

  async extractBatch(
    files: { uri: string; name: string }[],
    onProgress?: (done: number, total: number) => void
  ) {
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
      await FileSystem.deleteAsync(ARTWORK_DIR, { idempotent: true });
    } catch {}
    await DatabaseService.clearMetadataCache();
  },
};
