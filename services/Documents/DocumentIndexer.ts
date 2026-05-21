import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { MMKV } from 'react-native-mmkv';
import type { DocumentIndex, DocumentSubType } from '../../types';

const storage = new MMKV({ id: 'document-index' });

const DOC_EXTENSIONS: Record<string, DocumentSubType> = {
  pdf: 'pdf',
  doc: 'word',
  docx: 'word',
  xls: 'excel',
  xlsx: 'excel',
  csv: 'excel',
  ppt: 'powerpoint',
  pptx: 'powerpoint',
  txt: 'text',
  rtf: 'text',
  md: 'text',
  epub: 'epub',
  json: 'other',
  xml: 'other',
  zip: 'other',
  rar: 'other',
  '7z': 'other',
};

const CACHE_KEY = '@documents_index';
const SCAN_DEPTH = 5;

function getExtension(path: string): string {
  const parts = path.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

function getMimeType(ext: string): string {
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    rtf: 'text/rtf',
    md: 'text/markdown',
    epub: 'application/epub+zip',
    json: 'application/json',
    xml: 'application/xml',
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

export const DocumentIndexer = {
  async scanDocuments(): Promise<DocumentIndex[]> {
    const found: DocumentIndex[] = [];
    const seenUris = new Set<string>();
    const dirs: string[] = [];

    const docDir = FileSystem.documentDirectory;
    if (docDir) dirs.push(docDir);
    const cacheDir = FileSystem.cacheDirectory;
    if (cacheDir) dirs.push(cacheDir);

    async function scanDir(dir: string, depth: number) {
      if (depth > SCAN_DEPTH) return;
      try {
        const entries = await FileSystem.readDirectoryAsync(dir);
        for (const entry of entries) {
          const fullPath = dir.endsWith('/') ? dir + entry : dir + '/' + entry;
          if (seenUris.has(fullPath)) continue;
          try {
            const info = await FileSystem.getInfoAsync(fullPath, { size: true });
            if (!info.exists) continue;
            if (info.isDirectory) {
              await scanDir(fullPath, depth + 1);
            } else {
              const ext = getExtension(entry);
              const docType = DOC_EXTENSIONS[ext];
              if (docType) {
                seenUris.add(fullPath);
                found.push({
                  id: fullPath,
                  path: fullPath,
                  name: entry,
                  extension: ext,
                  mimeType: getMimeType(ext),
                  size: 'size' in info ? (info.size ?? 0) : 0,
                  modifiedAt: 'modificationTime' in info ? (info as any).modificationTime * 1000 || Date.now() : Date.now(),
                  folder: dir.split('/').filter(Boolean).pop() || '/',
                  iconType: docType,
                });
              }
            }
          } catch {}
        }
      } catch {}
    }

    for (const dir of dirs) {
      await scanDir(dir, 0);
    }

    if (found.length > 0) {
      this.saveIndex(found);
    }

    return found;
  },

  async scanMediaAlbums(): Promise<DocumentIndex[]> {
    const found: DocumentIndex[] = [];
    try {
      const albums = await MediaLibrary.getAlbumsAsync();
      for (const album of albums) {
        if (album.assetCount === 0) continue;
        const { assets } = await MediaLibrary.getAssetsAsync({
          album: album.id,
          first: album.assetCount,
          mediaType: ['audio', 'video', 'photo', 'unknown'] as any,
        });
        for (const asset of assets) {
          const ext = getExtension(asset.filename);
          const docType = DOC_EXTENSIONS[ext];
          if (docType) {
            found.push({
              id: asset.uri,
              path: asset.uri,
              name: asset.filename,
              extension: ext,
              mimeType: getMimeType(ext),
              size: asset.fileSize ?? 0,
              modifiedAt: asset.modificationTime * 1000,
              folder: album.title,
              iconType: docType,
            });
          }
        }
      }
    } catch {}
    return found;
  },

  saveIndex(docs: DocumentIndex[]) {
    storage.set(CACHE_KEY, JSON.stringify(docs));
  },

  getCachedIndex(): DocumentIndex[] {
    const data = storage.getString(CACHE_KEY);
    return data ? JSON.parse(data) : [];
  },

  hasCachedIndex(): boolean {
    return storage.getString(CACHE_KEY) !== undefined;
  },

  clearIndex() {
    storage.delete(CACHE_KEY);
  },

  getByFolder(folder: string): DocumentIndex[] {
    return this.getCachedIndex().filter((d) => d.folder === folder);
  },

  getByType(type: DocumentSubType): DocumentIndex[] {
    return this.getCachedIndex().filter((d) => d.iconType === type);
  },

  search(query: string): DocumentIndex[] {
    const q = query.toLowerCase();
    return this.getCachedIndex().filter(
      (d) => d.name.toLowerCase().includes(q) || d.folder.toLowerCase().includes(q)
    );
  },
};
