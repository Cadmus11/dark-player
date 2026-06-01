import { Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { readAsStringAsync } from 'expo-file-system/legacy';
import type { FileItem, FileType } from '../types';

const isWeb = Platform.OS === 'web';

const ART_COLORS = [
  '#00E5FF',
  '#3B82F6',
  '#8B5CF6',
  '#22D3EE',
  '#A855F7',
  '#38BDF8',
  '#F97316',
  '#22C55E',
  '#EF4444',
  '#FB7185',
  '#00F5D4',
  '#00FF66',
];

export function getArtColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ART_COLORS[Math.abs(hash) % ART_COLORS.length];
}

const EXTENSION_MAP: Record<string, FileType> = {
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
};

export function getFileType(fileName: string): FileType {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return EXTENSION_MAP[ext] || 'other';
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

export async function getMediaFiles(type: 'video' | 'audio'): Promise<FileItem[]> {
  if (isWeb) return [];

  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') return [];

    const mediaType = type === 'audio' ? 'audio' : 'video';
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

export function findSubtitleFile(videoUri: string, _allFiles: FileItem[]): string | undefined {
  if (!videoUri) return undefined;
  const parts = videoUri.split('/');
  const videoName = parts[parts.length - 1]?.replace(/\.[^.]+$/, '') || '';
  const videoDir = videoUri.substring(0, videoUri.lastIndexOf('/'));
  const subtitleExts = ['srt', 'vtt', 'ass'];

  for (const file of _allFiles) {
    const fileName = file.name.replace(/\.[^.]+$/, '');
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (subtitleExts.includes(ext)) {
      if (fileName === videoName || file.uri.startsWith(videoDir)) {
        return file.uri;
      }
    }
  }
  return undefined;
}

export async function readTextFile(uri: string): Promise<string> {
  try {
    return await readAsStringAsync(uri, { encoding: 'utf8' });
  } catch {
    return '';
  }
}

export function parseSRT(srtContent: string): { start: number; end: number; text: string }[] {
  const entries: { start: number; end: number; text: string }[] = [];
  const blocks = srtContent.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length >= 3) {
      const timeMatch = lines[1].match(
        /(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/
      );
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
