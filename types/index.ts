export type FileType = 'image' | 'video' | 'audio' | 'document' | 'folder' | 'other';

export type DocumentSubType = 'pdf' | 'word' | 'excel' | 'powerpoint' | 'text' | 'epub' | 'other';

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
  hasLyrics?: boolean;
  artColor?: string;
  artist?: string;
  album?: string;
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
  audioOnly: boolean;
  showLyrics: boolean;
  playbackSpeed: number;
  equalizer: Record<string, number>;
}

export interface SubtitleEntry {
  start: number;
  end: number;
  text: string;
}

export interface Playlist {
  id: string;
  name: string;
  coverUri?: string;
  files: FileItem[];
  createdAt: number;
  updatedAt: number;
}

export interface RecentlyPlayed {
  file: FileItem;
  lastPlayedAt: number;
  playCount: number;
}

export interface SavedSearch {
  id: string;
  query: string;
  timestamp: number;
}

export type LayoutMode = 'grid' | 'list';
