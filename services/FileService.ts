import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import type { FileItem, FileType, DocumentSubType } from '../types';

const isWeb = Platform.OS === 'web';

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

export function getFileIcon(type: FileType): string {
  switch (type) {
    case 'image':
      return '🖼️';
    case 'video':
      return '🎬';
    case 'audio':
      return '🎵';
    case 'document':
      return '📄';
    case 'folder':
      return '📁';
    default:
      return '📎';
  }
}

export function getDocIcon(subType: DocumentSubType): string {
  switch (subType) {
    case 'pdf':
      return '📕';
    case 'word':
      return '📘';
    case 'excel':
      return '📊';
    case 'powerpoint':
      return '📙';
    case 'text':
      return '📝';
    default:
      return '📄';
  }
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
    }));
  } catch {
    return [];
  }
}

export async function scanDocuments(): Promise<FileItem[]> {
  if (isWeb) return [];

  try {
    const dirs: string[] = [];
    try {
      const docDir = (FileSystem as any).documentDirectory as string | undefined;
      if (docDir) dirs.push(docDir);
      const cache = (FileSystem as any).cacheDirectory as string | undefined;
      if (cache) dirs.push(cache);
    } catch {}

    const found: FileItem[] = [];

    for (const dir of dirs) {
      if (!dir) continue;
      try {
        const entries = await FileSystem.readDirectoryAsync(dir);
        for (const entry of entries) {
          const entryUri = (dir.endsWith('/') ? dir : dir + '/') + entry;
          const fileType = getFileType(entry);
          if (fileType === 'document' || fileType === 'other') {
            const info = await FileSystem.getInfoAsync(entryUri);
            if (info.exists && !info.isDirectory) {
              found.push({
                uri: entryUri,
                name: entry,
                type: fileType,
                docSubType: fileType === 'document' ? getDocumentSubType(entry) : undefined,
                parentUri: dir,
              });
            }
          }
        }
      } catch {
      }
    }
    return found;
  } catch {
    return [];
  }
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
