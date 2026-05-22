import * as MediaLibrary from 'expo-media-library';
import { MMKV } from 'react-native-mmkv';
import { Platform } from 'react-native';
import type { FileItem, FileType, DocumentSubType, MediaMetadata } from '../types';
const FileSystem: any = require('expo-file-system');

const storage = new MMKV({ id: 'file-engine' });
const CACHE_VERSION = 3;
const CACHE_KEYS = {
  images: '@fe_images',
  videos: '@fe_videos',
  audio: '@fe_audio',
  documents: '@fe_documents',
  metadata: '@fe_metadata',
  timestamp: '@fe_timestamp',
  version: '@fe_version',
};

const EXTENSION_MAP: Record<string, FileType> = {
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image',
  webp: 'image', svg: 'image', bmp: 'image', heic: 'image',
  mp4: 'video', mov: 'video', avi: 'video', mkv: 'video',
  webm: 'video', m4v: 'video',
  mp3: 'audio', wav: 'audio', aac: 'audio', flac: 'audio',
  m4a: 'audio', ogg: 'audio', wma: 'audio', opus: 'audio',
  pdf: 'document', doc: 'document', docx: 'document',
  txt: 'document', rtf: 'document', md: 'document',
  xls: 'document', xlsx: 'document', csv: 'document',
  ppt: 'document', pptx: 'document',
  json: 'document', xml: 'document', epub: 'document',
  log: 'document', yaml: 'document', yml: 'document',
  toml: 'document', ini: 'document', cfg: 'document',
  srt: 'document', vtt: 'document', ass: 'document',
};

const DOC_SUBTYPE_MAP: Record<string, DocumentSubType> = {
  pdf: 'pdf', doc: 'word', docx: 'word',
  xls: 'excel', xlsx: 'excel', csv: 'excel',
  ppt: 'powerpoint', pptx: 'powerpoint',
  txt: 'text', rtf: 'text', md: 'text',
  json: 'text', xml: 'text',
  srt: 'text', vtt: 'text', ass: 'text',
  epub: 'epub',
};

const ART_COLORS = [
  '#C2FC4A', '#6c5ce7', '#00cec9', '#e17055',
  '#fdcb6e', '#74b9ff', '#ff7675', '#55efc4',
  '#a29bfe', '#fd79a8', '#f39c12', '#27ae60',
];

type ScanCallback = (progress: number, stage: string) => void;

export class FileEngine {
  private static instance: FileEngine;

  static getInstance(): FileEngine {
    if (!FileEngine.instance) {
      FileEngine.instance = new FileEngine();
    }
    return FileEngine.instance;
  }

  getArtColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return ART_COLORS[Math.abs(hash) % ART_COLORS.length];
  }

  getFileType(fileName: string): FileType {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return EXTENSION_MAP[ext] || 'other';
  }

  getDocumentSubType(fileName: string): DocumentSubType | undefined {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return DOC_SUBTYPE_MAP[ext];
  }

  formatFileSize(bytes?: number): string {
    if (!bytes || bytes === 0) return 'Unknown';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  formatDuration(ms?: number): string {
    if (!ms) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  shouldRescan(): boolean {
    const version = storage.getNumber(CACHE_KEYS.version) || 0;
    if (version !== CACHE_VERSION) return true;
    const lastScan = storage.getNumber(CACHE_KEYS.timestamp) || 0;
    return Date.now() - lastScan > 24 * 60 * 60 * 1000;
  }

  hasCache(): boolean {
    return storage.getString(CACHE_KEYS.images) !== undefined;
  }

  clearCache() {
    Object.values(CACHE_KEYS).forEach((k) => storage.delete(k));
  }

  async scanAll(onProgress?: ScanCallback): Promise<{
    images: FileItem[];
    videos: FileItem[];
    audio: FileItem[];
    documents: FileItem[];
  }> {
    onProgress?.(0, 'Requesting permissions...');
    const perm = await this.requestPermissions();
    if (!perm) {
      return { images: [], videos: [], audio: [], documents: [] };
    }

    if (Platform.OS === 'web') {
      return { images: [], videos: [], audio: [], documents: [] };
    }

    onProgress?.(0.1, 'Scanning media library...');
    const [mediaImages, mediaVideos, mediaAudio] = await Promise.all([
      this._getMediaFiles('image'),
      this._getMediaFiles('video'),
      this._getMediaFiles('audio'),
    ]);

    onProgress?.(0.5, 'Scanning documents...');
    const scannedDocs = await this._scanDocumentDirectories();

    onProgress?.(0.8, 'Categorizing files...');
    const documents = scannedDocs.filter((f) => f.type === 'document');

    this._saveCache(mediaImages, mediaVideos, mediaAudio, documents);
    onProgress?.(1, 'Done');

    return { images: mediaImages, videos: mediaVideos, audio: mediaAudio, documents };
  }

  loadFromCache(): {
    images: FileItem[];
    videos: FileItem[];
    audio: FileItem[];
    documents: FileItem[];
  } {
    return {
      images: this._getCached(CACHE_KEYS.images),
      videos: this._getCached(CACHE_KEYS.videos),
      audio: this._getCached(CACHE_KEYS.audio),
      documents: this._getCached(CACHE_KEYS.documents),
    };
  }

  private _saveCache(
    images: FileItem[],
    videos: FileItem[],
    audio: FileItem[],
    documents: FileItem[],
  ) {
    storage.set(CACHE_KEYS.images, JSON.stringify(images));
    storage.set(CACHE_KEYS.videos, JSON.stringify(videos));
    storage.set(CACHE_KEYS.audio, JSON.stringify(audio));
    storage.set(CACHE_KEYS.documents, JSON.stringify(documents));
    storage.set(CACHE_KEYS.timestamp, Date.now());
    storage.set(CACHE_KEYS.version, CACHE_VERSION);
  }

  private _getCached(key: string): FileItem[] {
    try {
      const data = storage.getString(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private async _getMediaFiles(type: 'image' | 'video' | 'audio'): Promise<FileItem[]> {
    try {
      const mediaType = type === 'audio' ? 'audio' : type === 'video' ? 'video' : 'photo';
      const { assets } = await MediaLibrary.getAssetsAsync({
        mediaType,
        first: 2000,
        sortBy: ['creationTime'],
      });

      return assets.map((asset) => ({
        uri: asset.uri,
        name: asset.filename,
        type,
        modifiedAt: asset.modificationTime * 1000,
        createdAt: asset.creationTime * 1000,
        thumbnail: type !== 'audio' ? asset.uri : undefined,
        duration: asset.duration ? asset.duration * 1000 : undefined,
        artColor: this.getArtColor(asset.filename),
        size: (asset as any).fileSize ?? undefined,
      }));
    } catch {
      return [];
    }
  }

  private async _scanDocumentDirectories(): Promise<FileItem[]> {
    const found: FileItem[] = [];
    const seen = new Set<string>();
    const dirs: string[] = [];

    const docDir = FileSystem.documentDirectory;
    if (docDir) dirs.push(docDir);
    const cacheDir = FileSystem.cacheDirectory;
    if (cacheDir) dirs.push(cacheDir);

    const scanDir = async (dir: string) => {
      if (seen.has(dir)) return;
      seen.add(dir);
      try {
        const entries = await FileSystem.readDirectoryAsync(dir);
        for (const entry of entries) {
          const uri = (dir.endsWith('/') ? dir : dir + '/') + entry;
          const fileType = this.getFileType(entry);
          if (fileType === 'document' || fileType === 'other') {
            try {
              const info = await FileSystem.getInfoAsync(uri, {});
              if (info.exists && !info.isDirectory) {
                found.push({
                  uri,
                  name: entry,
                  type: fileType,
                  docSubType: fileType === 'document' ? this.getDocumentSubType(entry) : undefined,
                  size: 'size' in info ? info.size : undefined,
                  parentUri: dir,
                  artColor: this.getArtColor(entry),
                });
              }
            } catch {}
          }
        }
      } catch {}
    };

    for (const dir of dirs) await scanDir(dir);

    if (Platform.OS === 'android') {
      try {
        const SAF = FileSystem.StorageAccessFramework;
        const permissions = await SAF.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const uris = await SAF.readDirectoryAsync(permissions.directoryUri);
          for (const uri of uris) {
            const name = uri.split('/').pop() || uri;
            const fileType = this.getFileType(name);
            if (fileType === 'document' || fileType === 'other') {
              found.push({
                uri,
                name,
                type: fileType,
                docSubType: fileType === 'document' ? this.getDocumentSubType(name) : undefined,
                parentUri: permissions.directoryUri,
                artColor: this.getArtColor(name),
              });
            }
          }
        }
      } catch {}
    }

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
          const fileType = this.getFileType(asset.filename);
          if (fileType === 'document' || fileType === 'other') {
            found.push({
              uri: asset.uri,
              name: asset.filename,
              type: fileType,
              docSubType: fileType === 'document' ? this.getDocumentSubType(asset.filename) : undefined,
              modifiedAt: asset.modificationTime * 1000,
              createdAt: asset.creationTime * 1000,
        size: (asset as any).fileSize ?? undefined,
              artColor: this.getArtColor(asset.filename),
            });
          }
        }
      }
    } catch {}

    return found;
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return true;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  }
}

export const fileEngine = FileEngine.getInstance();
