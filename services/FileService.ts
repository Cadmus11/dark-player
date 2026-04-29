import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import type { FileItem, FileType } from '../types';

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
  zip: 'other',
  rar: 'other',
  '7z': 'other',
};

export function getFileType(fileName: string): FileType {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return EXTENSION_MAP[ext] || 'other';
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

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export async function getMediaFiles(type: 'image' | 'video' | 'audio'): Promise<FileItem[]> {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') return [];

    const mediaType = type === 'audio' ? 'audio' : type === 'video' ? 'video' : 'photo';
    const { assets } = await MediaLibrary.getAssetsAsync({
      mediaType,
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

export async function getFileSystemFiles(uri: string): Promise<FileItem[]> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return [];

    if (!info.isDirectory) {
      return [
        {
          uri,
          name: uri.split('/').pop() || 'unknown',
          type: getFileType(uri),
          size: (info as Record<string, unknown>).size as number | undefined,
          modifiedAt: (info as Record<string, unknown>).modificationTime as number | undefined,
        },
      ];
    }

    const dirContents = await FileSystem.readDirectoryAsync(uri);
    const files: FileItem[] = [];

    for (const entry of dirContents) {
      const entryUri = uri.endsWith('/') ? uri + entry : uri + '/' + entry;
      const entryInfo = await FileSystem.getInfoAsync(entryUri);

      if (entryInfo.exists) {
        files.push({
          uri: entryUri,
          name: entry,
          type: entryInfo.isDirectory ? 'folder' : getFileType(entry),
          size: entryInfo.isDirectory ? undefined : (entryInfo as Record<string, unknown>).size as number | undefined,
          modifiedAt: (entryInfo as Record<string, unknown>).modificationTime as number | undefined,
          parentUri: uri,
        });
      }
    }

    return files.sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      return a.name.localeCompare(b.name);
    });
  } catch {
    return [];
  }
}

export async function requestPermissions(): Promise<boolean> {
  try {
    const mediaStatus = await MediaLibrary.requestPermissionsAsync();
    return mediaStatus.status === 'granted';
  } catch {
    return false;
  }
}
