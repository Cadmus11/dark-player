import { create } from 'zustand';
import { videoEngine } from '../engine/VideoEngine';
import { queueEngine } from '../engine/QueueEngine';
import { PlaybackTicker } from '../services/PlaybackTicker';
import type { FileItem, SubtitleEntry } from '../types';

interface VideoPlaybackStoreState {
  currentFile: FileItem | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  playbackSpeed: number;
  contentFit: 'contain' | 'cover' | 'fill';
  subtitlesEnabled: boolean;
  subtitles: SubtitleEntry[];
  currentSubtitle: string;
  isFullscreen: boolean;
  isReady: boolean;
  error: string | null;

  togglePlayback: () => void;
  seekTo: (percentage: number) => void;
  skip: (seconds: number) => void;
  setRate: (rate: number) => void;
  setContentFit: (mode: 'contain' | 'cover' | 'fill') => void;
  toggleSubtitles: () => void;
  setSubtitlesEnabled: (enabled: boolean) => void;
  setFullscreen: (fullscreen: boolean) => void;
  loadFile: (file: FileItem) => Promise<void>;
  next: () => void;
  previous: () => void;
  reset: () => void;
}

const initialState = {
  currentFile: null,
  isPlaying: false,
  position: 0,
  duration: 0,
  playbackSpeed: 1,
  contentFit: 'contain' as const,
  subtitlesEnabled: true,
  subtitles: [] as SubtitleEntry[],
  currentSubtitle: '',
  isFullscreen: false,
  isReady: false,
  error: null as string | null,
};

export const useVideoPlaybackStore = create<VideoPlaybackStoreState>((set) => ({
  ...initialState,

  loadFile: async (file: FileItem) => {
    videoEngine.setSubtitlesEnabled(true);
    await videoEngine.loadFile(file);
    const s = videoEngine.getState();
    set({
      currentFile: s.currentFile,
      isPlaying: s.isPlaying,
      position: s.position,
      duration: s.duration,
      subtitles: s.subtitles,
      currentSubtitle: s.currentSubtitle,
      isReady: s.isReady,
      error: s.error,
      playbackSpeed: s.playbackSpeed,
      contentFit: s.contentFit,
    });
  },

  togglePlayback: () => {
    videoEngine.togglePlayback();
    const s = videoEngine.getState();
    set({ isPlaying: s.isPlaying });
  },

  seekTo: (percentage: number) => {
    videoEngine.seekTo(percentage);
  },

  skip: (seconds: number) => {
    videoEngine.skip(seconds);
  },

  setRate: (rate: number) => {
    videoEngine.setRate(rate);
    set({ playbackSpeed: rate });
  },

  setContentFit: (mode: 'contain' | 'cover' | 'fill') => {
    videoEngine.setContentFit(mode);
    set({ contentFit: mode });
  },

  toggleSubtitles: () => {
    videoEngine.toggleSubtitles();
    const s = videoEngine.getState();
    set({ subtitlesEnabled: s.subtitlesEnabled, currentSubtitle: s.currentSubtitle });
  },

  setSubtitlesEnabled: (enabled: boolean) => {
    videoEngine.setSubtitlesEnabled(enabled);
    const s = videoEngine.getState();
    set({ subtitlesEnabled: s.subtitlesEnabled, currentSubtitle: s.currentSubtitle });
  },

  setFullscreen: (fullscreen: boolean) => {
    videoEngine.setFullscreen(fullscreen);
    set({ isFullscreen: fullscreen });
  },

  next: () => {
    const qs = queueEngine.getVideoState();
    const nextIndex = qs.currentIndex + 1;
    if (nextIndex < qs.queue.length) {
      queueEngine.setVideoIndex(nextIndex);
      const file = qs.queue[nextIndex];
      if (file) videoEngine.loadFile(file);
    }
  },

  previous: () => {
    const qs = queueEngine.getVideoState();
    const prevIndex = qs.currentIndex - 1;
    if (prevIndex >= 0) {
      queueEngine.setVideoIndex(prevIndex);
      const file = qs.queue[prevIndex];
      if (file) videoEngine.loadFile(file);
    }
  },

  reset: () => set(initialState),
}));

let _lastVideoKey = '';
let _lastVideoTick = 0;
videoEngine.subscribe(() => {
  const s = videoEngine.getState();
  const now = Date.now();
  const tickKey = `${s.currentFile?.uri}|${s.isPlaying}|${s.playbackSpeed}|${s.contentFit}|${s.subtitlesEnabled}|${s.isFullscreen}|${s.isReady}|${s.error}`;
  const isTickUpdate = tickKey === _lastVideoKey && now - _lastVideoTick < 300;
  if (isTickUpdate) {
    PlaybackTicker.updatePosition(s.position, s.duration);
    if (Math.abs(s.position - useVideoPlaybackStore.getState().position) > 50) {
      useVideoPlaybackStore.setState({
        position: s.position,
        duration: s.duration,
      });
    }
    return;
  }
  _lastVideoKey = tickKey;
  _lastVideoTick = now;
  useVideoPlaybackStore.setState({
    currentFile: s.currentFile,
    isPlaying: s.isPlaying,
    position: s.position,
    duration: s.duration,
    playbackSpeed: s.playbackSpeed,
    contentFit: s.contentFit,
    subtitlesEnabled: s.subtitlesEnabled,
    subtitles: s.subtitles,
    currentSubtitle: s.currentSubtitle,
    isFullscreen: s.isFullscreen,
    isReady: s.isReady,
    error: s.error,
  });
});
