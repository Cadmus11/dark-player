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

export interface RecentlyDeleted {
  file: FileItem;
  deletedAt: number;
}

export interface PlaybackSettings {
  playWithOtherApps: boolean;
  crossFade: boolean;
  crossFadeDuration: number;
  gaplessPlayback: boolean;
}

export interface NotificationSettings {
  newMediaNotification: boolean;
  pushNotification: boolean;
}

export interface SleepTimerSettings {
  enabled: boolean;
  mode: 'off' | 'minutes' | 'endOfTrack' | 'endOfQueue';
  minutes: number;
  playOneToEnd: boolean;
}

export interface HiddenFilesSettings {
  hideShortSongs: boolean;
  minDurationSeconds: number;
  hideOpus: boolean;
  hideExtensions: string[];
}

export interface MediaMetadata {
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: number;
  bitrate?: number;
  sampleRate?: number;
  trackNumber?: number;
  discNumber?: number;
  composer?: string;
  artwork?: string;
  duration?: number;
}

export interface LyricsData {
  songId: string;
  title: string;
  artist: string;
  lyrics: string;
  syncedLyrics: { time: number; text: string }[];
  source: 'lrc' | 'embedded' | 'api' | 'none';
  cachedAt: number;
}

export interface PlaylistData {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  artwork?: string;
  songIds: string[];
  totalDuration: number;
  totalTracks: number;
}

export interface HistoryEntry {
  file: FileItem;
  playedAt: number;
  playDuration: number;
  source: 'music' | 'video' | 'audio';
}

export interface DocumentIndex {
  id: string;
  path: string;
  name: string;
  extension: string;
  mimeType: string;
  size: number;
  modifiedAt: number;
  folder: string;
  iconType: DocumentSubType;
}

export interface ArtworkCache {
  uri: string;
  dataUri: string;
  cachedAt: number;
  fileUri: string;
}

export type VideoQualityTarget = 'original' | 'hd' | 'fullhd' | '4k';

export interface VideoEnhancementSettings {
  enabled: boolean;
  qualityTarget: VideoQualityTarget;
  colorEnhancement: boolean;
  sharpening: boolean;
  denoise: boolean;
  hdr: boolean;
}

export type EnhancementStatus = 'idle' | 'processing' | 'completed' | 'failed';

export interface EnhancementJob {
  id: string;
  sourceUri: string;
  outputUri: string;
  settings: VideoEnhancementSettings;
  status: EnhancementStatus;
  progress: number;
  createdAt: number;
}

export type PlaybackSource = 'music' | 'video' | 'none';

export type SortField = 'name' | 'date' | 'size' | 'type' | 'duration' | 'artist' | 'album' | 'playCount' | 'recentlyPlayed';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}
