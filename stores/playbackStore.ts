import { create } from 'zustand';
import type { FileItem, PlaybackSource } from '../types';

interface PlaybackState {
  currentFile: FileItem | null;
  isPlaying: boolean;
  source: PlaybackSource;
  position: number;
  duration: number;
  queue: FileItem[];
  currentIndex: number;
  shuffle: boolean;
  repeat: 'none' | 'one' | 'all';
  playbackSpeed: number;
  equalizer: Record<string, number>;

  setCurrentFile: (file: FileItem | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setSource: (source: PlaybackSource) => void;
  setPosition: (pos: number) => void;
  setDuration: (dur: number) => void;
  setQueue: (queue: FileItem[], index: number) => void;
  setCurrentIndex: (index: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setPlaybackSpeed: (speed: number) => void;
  setEqualizer: (eq: Record<string, number>) => void;
  reset: () => void;
}

const initialState = {
  currentFile: null,
  isPlaying: false,
  source: 'none' as PlaybackSource,
  position: 0,
  duration: 0,
  queue: [],
  currentIndex: -1,
  shuffle: false,
  repeat: 'none' as 'none' | 'one' | 'all',
  playbackSpeed: 1,
  equalizer: {},
};

export const usePlaybackStore = create<PlaybackState>((set) => ({
  ...initialState,

  setCurrentFile: (file) => set({ currentFile: file }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setSource: (source) => set({ source }),
  setPosition: (pos) => set({ position: pos }),
  setDuration: (dur) => set({ duration: dur }),
  setQueue: (queue, index) => set({ queue, currentIndex: index }),
  setCurrentIndex: (index) => set({ currentIndex: index }),
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  cycleRepeat: () =>
    set((s) => {
      const modes: Array<'none' | 'one' | 'all'> = ['none', 'all', 'one'];
      const idx = modes.indexOf(s.repeat);
      return { repeat: modes[(idx + 1) % modes.length] };
    }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setEqualizer: (eq) => set({ equalizer: eq }),
  reset: () => set(initialState),
}));
