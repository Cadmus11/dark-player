import type { FileType } from '../types';

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

export function getFileType(fileName: string): FileType {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return EXTENSION_MAP[ext] || 'other';
}

export function getArtColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ART_COLORS[Math.abs(hash) % ART_COLORS.length];
}
