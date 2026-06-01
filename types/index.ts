export type FileType = 'video' | 'audio' | 'folder' | 'other';

export type RepeatMode = 'none' | 'one' | 'all';

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
  subtitleUri?: string;
  lyrics?: string;
  hasLyrics?: boolean;
  artColor?: string;
  artist?: string;
  album?: string;
  assetId?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  type: FileType;
  count: number;
  color: string;
}

export interface ColorThemePreset {
  key: string;
  name: string;
  background: string;
  surface: string;
  text: string;
  accent: string;
}

export interface ThemeSettings {
  colorThemeKey: string;
  backgroundImageUri?: string;
  backgroundBlur?: number;
  backgroundImageFit?: 'cover' | 'contain';
  backgroundMode?: 'fill' | 'wallpaper' | 'spotlight';
  backgroundBrightness?: number;
  sizeMode: LayoutSize;
}

export interface PlayerState {
  currentFile: FileItem | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  queue: FileItem[];
  currentIndex: number;
  shuffle: boolean;
  repeat: RepeatMode;
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
export type LayoutSize = 'small' | 'medium' | 'big';

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
  lyrics?: string;
  syncedLyrics?: { time: number; text: string }[];
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

export interface EqualizerBand {
  frequency: number;
  label: string;
}

export interface EQPreset {
  name: string;
  gains: number[];
}

export interface EqualizerSettings {
  enabled: boolean;
  gains: number[];
  preset: string;
}

export interface EQPlaybackState {
  currentFile: FileItem | null;
  isPlaying: boolean;
  position: number;
  duration: number;
}

export type SortField =
  | 'name'
  | 'date'
  | 'size'
  | 'type'
  | 'duration'
  | 'artist'
  | 'album'
  | 'playCount'
  | 'recentlyPlayed'
  | 'newest';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export interface RawArtworkPalette {
  dominant?: string;
  vibrant?: string;
  darkVibrant?: string;
  lightVibrant?: string;
  muted?: string;
  darkMuted?: string;
  lightMuted?: string;
  primary?: string;
  secondary?: string;
  background?: string;
  detail?: string;
  average?: string;
}

export interface ColorTheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
}

export type MoodType =
  | 'neutral'
  | 'energetic'
  | 'calm'
  | 'melancholic'
  | 'happy'
  | 'dark'
  | 'upbeat';

export interface ArtworkColorState {
  artworkUri: string | null;
  rawPalette: RawArtworkPalette | null;
  theme: ColorTheme;
  isDark: boolean;
  blurStrength: number;
  overlayOpacity: number;
  edgeColors: { left: string; right: string; bottom: string };
  mood: MoodType;
  genre?: string;
}

export interface EdgeLightingColors {
  left: string;
  right: string;
  bottom: string;
}

export const THEME_PRESETS: ColorThemePreset[] = [
  {
    key: 'obsidian',
    name: 'OBSIDIAN',
    background: '#000000',
    surface: '#121212',
    text: '#FFFFFF',
    accent: '#00E5FF',
  },
  {
    key: 'midnight',
    name: 'MIDNIGHT',
    background: '#0B1220',
    surface: '#111827',
    text: '#F9FAFB',
    accent: '#3B82F6',
  },
  {
    key: 'phantom',
    name: 'PHANTOM',
    background: '#0A0A0A',
    surface: '#1A1A1A',
    text: '#F5F5F5',
    accent: '#8B5CF6',
  },
  {
    key: 'aurora',
    name: 'AURORA',
    background: '#071A1A',
    surface: '#0F2E2E',
    text: '#F0FFFF',
    accent: '#22D3EE',
  },
  {
    key: 'nebula',
    name: 'NEBULA',
    background: '#140C1F',
    surface: '#231338',
    text: '#F5EDFF',
    accent: '#A855F7',
  },
  {
    key: 'oceanic',
    name: 'OCEANIC',
    background: '#081B29',
    surface: '#102A43',
    text: '#F0F9FF',
    accent: '#38BDF8',
  },
  {
    key: 'ember',
    name: 'EMBER',
    background: '#2B1200',
    surface: '#402000',
    text: '#FFF7ED',
    accent: '#F97316',
  },
  {
    key: 'forest',
    name: 'FOREST',
    background: '#0A170D',
    surface: '#112415',
    text: '#F0FDF4',
    accent: '#22C55E',
  },
  {
    key: 'crimson',
    name: 'CRIMSON',
    background: '#19090A',
    surface: '#2B1012',
    text: '#FFF5F5',
    accent: '#EF4444',
  },
  {
    key: 'glacier',
    name: 'GLACIER',
    background: '#EAF4FF',
    surface: '#FFFFFF',
    text: '#0F172A',
    accent: '#2563EB',
  },
  {
    key: 'velvet',
    name: 'VELVET',
    background: '#2D1821',
    surface: '#40222E',
    text: '#FFF1F5',
    accent: '#FB7185',
  },
  {
    key: 'cyberNeon',
    name: 'CYBER NEON',
    background: '#050816',
    surface: '#0F172A',
    text: '#E0F2FE',
    accent: '#00F5D4',
  },
  {
    key: 'matrix',
    name: 'MATRIX',
    background: '#020A02',
    surface: '#071507',
    text: '#E6FFE6',
    accent: '#00FF66',
  },
  {
    key: 'goldenHour',
    name: 'GOLDEN HOUR',
    background: '#2A1A00',
    surface: '#3B2600',
    text: '#FFF8E7',
    accent: '#FBBF24',
  },
  {
    key: 'royal',
    name: 'ROYAL',
    background: '#0F1029',
    surface: '#191B45',
    text: '#F5F3FF',
    accent: '#6366F1',
  },
  {
    key: 'roseGold',
    name: 'ROSE GOLD',
    background: '#2B1D20',
    surface: '#3C2A2E',
    text: '#FFF5F7',
    accent: '#F472B6',
  },
  {
    key: 'slate',
    name: 'SLATE',
    background: '#111827',
    surface: '#1F2937',
    text: '#F9FAFB',
    accent: '#94A3B8',
  },
  {
    key: 'arctic',
    name: 'ARCTIC',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    text: '#0F172A',
    accent: '#2563EB',
  },
  {
    key: 'paper',
    name: 'PAPER',
    background: '#FAFAF9',
    surface: '#FFFFFF',
    text: '#1C1917',
    accent: '#EA580C',
  },
  {
    key: 'lavender',
    name: 'LAVENDER',
    background: '#F5F3FF',
    surface: '#FFFFFF',
    text: '#312E81',
    accent: '#8B5CF6',
  },
];

export interface PrivateFileEntry {
  uri: string;
  name: string;
  addedAt: number;
}

export type FileAction =
  | 'addToPlaylist'
  | 'playNext'
  | 'share'
  | 'hide'
  | 'moveToPrivate'
  | 'delete';

export interface Album {
  id: string;
  name: string;
  artist: string;
  songs: FileItem[];
  artwork?: string;
  songCount: number;
  totalDuration: number;
}

export interface Artist {
  id: string;
  name: string;
  songs: FileItem[];
  albums: string[];
  songCount: number;
}
