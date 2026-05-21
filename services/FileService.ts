import { Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
const FileSystem: any = require('expo-file-system');
import type { FileItem, FileType, DocumentSubType } from '../types';

const isWeb = Platform.OS === 'web';

const ART_COLORS = [
  '#C2FC4A', '#6c5ce7', '#00cec9', '#e17055',
  '#fdcb6e', '#74b9ff', '#ff7675', '#55efc4',
  '#a29bfe', '#fd79a8', '#f39c12', '#27ae60',
];

export function getArtColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ART_COLORS[Math.abs(hash) % ART_COLORS.length];
}

const EXTENSION_MAP: Record<string, FileType> = {
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  bmp: 'image',
  heic: 'image',
  mp4: 'video',
  mov: 'video',
  avi: 'video',
  mkv: 'video',
  webm: 'video',
  m4v: 'video',
  mp3: 'audio',
  wav: 'audio',
  aac: 'audio',
  flac: 'audio',
  m4a: 'audio',
  ogg: 'audio',
  wma: 'audio',
  opus: 'audio',
  pdf: 'document',
  doc: 'document',
  docx: 'document',
  txt: 'document',
  rtf: 'document',
  xls: 'document',
  xlsx: 'document',
  csv: 'document',
  ppt: 'document',
  pptx: 'document',
  json: 'document',
  xml: 'document',
  epub: 'document',
  srt: 'other',
  vtt: 'other',
  ass: 'other',
  zip: 'other',
  rar: 'other',
  '7z': 'other',
};

const DOC_SUBTYPE_MAP: Record<string, DocumentSubType> = {
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
};

const SUBTITLE_EXTENSIONS = ['srt', 'vtt', 'ass'];

export function getFileType(fileName: string): FileType {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return EXTENSION_MAP[ext] || 'other';
}

export function getDocumentSubType(fileName: string): DocumentSubType | undefined {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return DOC_SUBTYPE_MAP[ext];
}

export function findSubtitleFile(videoUri: string, allFiles: FileItem[]): string | undefined {
  if (!videoUri) return undefined;
  const parts = videoUri.split('/');
  const videoName = parts[parts.length - 1]?.replace(/\.[^.]+$/, '') || '';
  const videoDir = videoUri.substring(0, videoUri.lastIndexOf('/'));

  for (const file of allFiles) {
    const fileName = file.name.replace(/\.[^.]+$/, '');
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (SUBTITLE_EXTENSIONS.includes(ext)) {
      if (fileName === videoName || file.uri.startsWith(videoDir)) {
        return file.uri;
      }
    }
  }
  return undefined;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return 'Unknown';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatDuration(ms?: number): string {
  if (!ms) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatDurationLong(ms: number): string {
  if (!ms) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export async function getMediaFiles(type: 'image' | 'video' | 'audio'): Promise<FileItem[]> {
  if (isWeb) return [];

  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') return [];

    const mediaType = type === 'audio' ? 'audio' : type === 'video' ? 'video' : 'photo';
    const { assets } = await MediaLibrary.getAssetsAsync({
      mediaType,
      first: 1000,
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
      artColor: getArtColor(asset.filename),
    }));
  } catch {
    return [];
  }
}

export async function scanDocuments(): Promise<FileItem[]> {
  if (isWeb) return [];

  const found: FileItem[] = [];
  const scanned = new Set<string>();
  const uriSet = new Set<string>();

  const dirs: string[] = [];
  try {
    const docDir = FileSystem.documentDirectory;
    if (docDir) dirs.push(docDir);
    const cache = FileSystem.cacheDirectory;
    if (cache) dirs.push(cache);
  } catch {}

  async function scanDir(dir: string) {
    if (!dir || scanned.has(dir)) return;
    scanned.add(dir);
    try {
      const entries = await FileSystem.readDirectoryAsync(dir);
      for (const entry of entries) {
        const entryUri = (dir.endsWith('/') ? dir : dir + '/') + entry;
        if (uriSet.has(entryUri)) continue;
        const fileType = getFileType(entry);
        if (fileType === 'document' || fileType === 'other') {
          try {
            const info = await FileSystem.getInfoAsync(entryUri, {});
            if (info.exists && !info.isDirectory) {
              uriSet.add(entryUri);
              const docSubType = fileType === 'document' ? getDocumentSubType(entry) : undefined;
              found.push({
                uri: entryUri,
                name: entry,
                type: fileType,
                docSubType,
                size: 'size' in info ? info.size : undefined,
                parentUri: dir,
                artColor: getArtColor(entry),
              });
            }
          } catch {}
        }
      }
    } catch {}
  }

  for (const dir of dirs) {
    await scanDir(dir);
  }

  if (Platform.OS === 'android') {
    try {
      const SAF = FileSystem.StorageAccessFramework;
      const permissions = await SAF.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        const uris = await SAF.readDirectoryAsync(permissions.directoryUri);
        for (const uri of uris) {
          if (uriSet.has(uri)) continue;
          const name = uri.split('/').pop() || uri;
          const fileType = getFileType(name);
          if (fileType === 'document' || fileType === 'other') {
            uriSet.add(uri);
            const docSubType = fileType === 'document' ? getDocumentSubType(name) : undefined;
            found.push({
              uri,
              name,
              type: fileType,
              docSubType,
              parentUri: permissions.directoryUri,
              artColor: getArtColor(name),
            });
          }
        }
      }
    } catch {}
  }

  try {
    const mediaAlbums = await MediaLibrary.getAlbumsAsync();
    for (const album of mediaAlbums) {
      if (album.assetCount === 0) continue;
      const { assets } = await MediaLibrary.getAssetsAsync({
        album: album.id,
        first: album.assetCount,
        mediaType: ['audio', 'video', 'photo', 'unknown'] as any,
      });
      for (const asset of assets) {
        if (uriSet.has(asset.uri)) continue;
        const fileType = getFileType(asset.filename);
        if (fileType === 'document' || fileType === 'other') {
          uriSet.add(asset.uri);
          found.push({
            uri: asset.uri,
            name: asset.filename,
            type: fileType,
            docSubType: fileType === 'document' ? getDocumentSubType(asset.filename) : undefined,
            modifiedAt: asset.modificationTime * 1000,
            createdAt: asset.creationTime * 1000,
            size: (asset as any).fileSize ?? undefined,
            artColor: getArtColor(asset.filename),
          });
        }
      }
    }
  } catch {}

  return found;
}

export async function requestPermissions(): Promise<boolean> {
  if (isWeb) return true;

  try {
    const mediaStatus = await MediaLibrary.requestPermissionsAsync();
    if (mediaStatus.status !== 'granted') {
      const retry = await MediaLibrary.requestPermissionsAsync();
      return retry.status === 'granted';
    }
    return true;
  } catch {
    return false;
  }
}

export async function readTextFile(uri: string): Promise<string> {
  try {
    return await FileSystem.readAsStringAsync(uri);
  } catch {
    return '';
  }
}

export function parseSRT(srtContent: string): Array<{ start: number; end: number; text: string }> {
  const entries: Array<{ start: number; end: number; text: string }> = [];
  const blocks = srtContent.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length >= 3) {
      const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
      if (timeMatch) {
        const start = parseTime(timeMatch[1]);
        const end = parseTime(timeMatch[2]);
        const text = lines.slice(2).join('\n');
        entries.push({ start, end, text });
      }
    }
  }
  return entries;
}

function parseTime(timeStr: string): number {
  const parts = timeStr.split(':');
  if (parts.length !== 3) return 0;
  const hours = parseInt(parts[0]) || 0;
  const minutes = parseInt(parts[1]) || 0;
  const secParts = parts[2].split(',');
  const secs = parseInt(secParts[0]) || 0;
  const ms = parseInt(secParts[1]) || 0;
  return (hours * 3600 + minutes * 60 + secs) * 1000 + ms;
}
