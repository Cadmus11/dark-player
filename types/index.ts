export type FileType = 'image' | 'video' | 'audio' | 'document' | 'folder' | 'other';

export interface FileItem {
  uri: string;
  name: string;
  type: FileType;
  size?: number;
  mimeType?: string;
  modifiedAt?: number;
  createdAt?: number;
  thumbnail?: string;
  duration?: number;
  parentUri?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  type: FileType;
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
