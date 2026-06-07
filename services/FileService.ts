import { readAsStringAsync } from 'expo-file-system/legacy';
import type { FileItem } from '../types';

export { formatFileSize, formatDuration, formatDurationLong } from '../utils/format';
export { getFileType, getArtColor } from '../utils/file-type';

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
