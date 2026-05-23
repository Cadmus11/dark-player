import type { FileItem, RepeatMode } from '../types';

export interface PlaybackState {
  currentFile: FileItem | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  playbackSpeed: number;
  isReady: boolean;
  error: string | null;
}

export interface PlaybackActions {
  play: () => void;
  pause: () => void;
  togglePlayback: () => void;
  seekTo: (value: number) => void;
  setRate: (rate: number) => void;
  skip: (seconds: number) => void;
  stop: () => void;
}

export interface BasePlaybackEngine {
  readonly sourceType: 'audio' | 'video';
  subscribe: (listener: () => void) => () => void;
  getState: () => Readonly<PlaybackState>;
  play: (file?: FileItem, queue?: FileItem[], startIndex?: number) => void;
  pause: () => void;
  resume: () => void;
  togglePlayback: () => void;
  stop: () => void;
  seekTo: (value: number) => void;
  setRate: (rate: number) => void;
  cleanup: () => void;
}

export interface MediaScanState {
  videos: FileItem[];
  audio: FileItem[];
  loading: boolean;
  scanProgress: number;
  scanStage: string;
  error: string | null;
}

export interface QueueState {
  queue: FileItem[];
  currentIndex: number;
  repeat: RepeatMode;
  shuffle: boolean;
  shuffledOrder: number[];
}

export interface QueueActions {
  setQueue: (queue: FileItem[], startIndex?: number) => void;
  next: () => void;
  previous: () => void;
  playIndex: (index: number) => void;
  setRepeat: (mode: RepeatMode) => void;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
  addToQueue: (file: FileItem) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
}
