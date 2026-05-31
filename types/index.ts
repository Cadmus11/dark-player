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

export interface ThemeSettings {
  backgroundType: 'solid' | 'gradient';
  backgroundColor: string;
  gradientColors?: string[];
  backgroundImageUri?: string;
  presetImageKey?: string;
  backgroundBlur?: number;
  backgroundImageFit?: 'cover' | 'contain';
  primaryColor: string;
  accentColor: string;
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

export interface ColorTheme {
  name: string;
  group: string;
  primary: string;
  background: string;
  card: string;
  border: string;
  text: string;
  muted: string;
}

export interface ColorThemeGroup {
  name: string;
  themes: ColorTheme[];
}

export const COLOR_THEME_GROUPS: ColorThemeGroup[] = [
  {
    name: 'Dark',
    themes: [
      {
        name: 'Midnight',
        group: 'Dark',
        primary: '#8b5cf6',
        background: '#0a0a0a',
        card: '#18181b',
        border: '#27272a',
        text: '#ffffff',
        muted: '#71717a',
      },
      {
        name: 'Slate',
        group: 'Dark',
        primary: '#64748b',
        background: '#0a0a0c',
        card: '#14141a',
        border: '#1f1f2a',
        text: '#ffffff',
        muted: '#6b6b7b',
      },
      {
        name: 'Obsidian',
        group: 'Dark',
        primary: '#14b8a6',
        background: '#080c0c',
        card: '#121a1a',
        border: '#1f2a2a',
        text: '#ffffff',
        muted: '#6b8b85',
      },
    ],
  },
  {
    name: 'Vibrant',
    themes: [
      {
        name: 'Rose',
        group: 'Vibrant',
        primary: '#e11d48',
        background: '#120a0a',
        card: '#1e1414',
        border: '#2e1f1f',
        text: '#ffffff',
        muted: '#8b6b6b',
      },
      {
        name: 'Sunset',
        group: 'Vibrant',
        primary: '#f472b6',
        background: '#120a0e',
        card: '#1e141a',
        border: '#2e1f26',
        text: '#ffffff',
        muted: '#8b6b7b',
      },
      {
        name: 'Amber',
        group: 'Vibrant',
        primary: '#f59e0b',
        background: '#0f0d08',
        card: '#1a1610',
        border: '#2a2218',
        text: '#ffffff',
        muted: '#8b7b5b',
      },
      {
        name: 'Gold',
        group: 'Vibrant',
        primary: '#eab308',
        background: '#100d06',
        card: '#1a1608',
        border: '#2a2208',
        text: '#ffffff',
        muted: '#8b7b4b',
      },
    ],
  },
  {
    name: 'Nature',
    themes: [
      {
        name: 'Forest',
        group: 'Nature',
        primary: '#22c55e',
        background: '#0a0f0a',
        card: '#141a14',
        border: '#1f2a1f',
        text: '#ffffff',
        muted: '#6b7b6b',
      },
      {
        name: 'Ocean',
        group: 'Nature',
        primary: '#06b6d4',
        background: '#0a0e12',
        card: '#141a22',
        border: '#1f2a36',
        text: '#ffffff',
        muted: '#6b7b8b',
      },
      {
        name: 'Emerald',
        group: 'Nature',
        primary: '#10b981',
        background: '#080e0a',
        card: '#121a14',
        border: '#1f2a22',
        text: '#ffffff',
        muted: '#6b8b75',
      },
    ],
  },
  {
    name: 'Soft',
    themes: [
      {
        name: 'Lavender',
        group: 'Soft',
        primary: '#a78bfa',
        background: '#0e0a14',
        card: '#18142a',
        border: '#221f36',
        text: '#ffffff',
        muted: '#7b6b9b',
      },
      {
        name: 'Coral',
        group: 'Soft',
        primary: '#fb7185',
        background: '#120a0c',
        card: '#1a1416',
        border: '#2a1f22',
        text: '#ffffff',
        muted: '#8b6b73',
      },
    ],
  },
  {
    name: 'Light',
    themes: [
      {
        name: 'Light',
        group: 'Light',
        primary: '#F97316',
        background: '#F0F8FF',
        card: '#F4F4F5',
        border: '#D4D4D8',
        text: '#18181B',
        muted: '#71717A',
      },
      {
        name: 'Pearl',
        group: 'Light',
        primary: '#6366f1',
        background: '#f8fafc',
        card: '#f1f5f9',
        border: '#e2e8f0',
        text: '#0f172a',
        muted: '#64748b',
      },
    ],
  },
];

export const COLOR_THEMES: ColorTheme[] = COLOR_THEME_GROUPS.flatMap((g) => g.themes);

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
