export type FileType = 'image' | 'video' | 'audio' | 'document' | 'folder' | 'other';

export type DocumentSubType = 'pdf' | 'word' | 'excel' | 'powerpoint' | 'text' | 'other';

export interface FileItem {
  uri: string;
  name: string;
  type: FileType;
  docSubType?: DocumentSubType;
  size?: number;
  mimeType?: string;
  modifiedAt?: number;
  createdAt?: number;
  thumbnail?: string;
  duration?: number;
  parentUri?: string;
  subtitleUri?: string;
  lyrics?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  type: FileType;
  count: number;
  color: string;
}

export interface DocCategory {
  id: string;
  name: string;
  icon: string;
  ext: string[];
  subType: DocumentSubType;
  count: number;
  color: string;
}

export interface ThemeSettings {
  backgroundType: 'solid' | 'gradient' | 'image';
  backgroundColor: string;
  gradientColors?: string[];
  backgroundImageUri?: string;
  primaryColor: string;
  accentColor: string;
}

export interface PlayerState {
  currentFile: FileItem | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  queue: FileItem[];
  currentIndex: number;
  shuffle: boolean;
  repeat: 'none' | 'one' | 'all';
}

export interface SubtitleEntry {
  start: number;
  end: number;
  text: string;
}

export interface Playlist {
  id: string;
  name: string;
  files: FileItem[];
  createdAt: number;
}
