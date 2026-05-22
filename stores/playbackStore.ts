import { create } from 'zustand';
import { audioEngine } from '../engine/AudioEngine';
import type { FileItem, PlaybackSource, RepeatMode } from '../types';

interface PlaybackStoreState {
  currentFile: FileItem | null;
  isPlaying: boolean;
  source: PlaybackSource;
  position: number;
  duration: number;
  queue: FileItem[];
  currentIndex: number;
  shuffle: boolean;
  repeat: RepeatMode;
  playbackSpeed: number;

  play: (file?: FileItem, queue?: FileItem[], startIndex?: number) => void;
  playIndex: (index: number) => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  stop: () => void;
  seekTo: (millis: number) => void;
  next: () => void;
  previous: () => void;
  setRate: (rate: number) => void;
  setRepeat: (mode: RepeatMode) => void;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
  setQueue: (queue: FileItem[], startIndex?: number) => void;
  setSource: (source: PlaybackSource) => void;
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
  repeat: 'none' as RepeatMode,
  playbackSpeed: 1,
};

export const usePlaybackStore = create<PlaybackStoreState>((set) => ({
  ...initialState,

  play: (file, queue, startIndex) => {
    const engineState = audioEngine.getState();
    if (file && queue && startIndex !== undefined) {
      audioEngine.play(file, queue, startIndex);
    } else {
      audioEngine.play();
    }
    const s = audioEngine.getState();
    set({
      currentFile: s.currentFile,
      isPlaying: s.isPlaying,
      position: s.position,
      duration: s.duration,
      queue: s.queue,
      currentIndex: s.currentIndex,
      shuffle: s.shuffle,
      repeat: s.repeat,
      playbackSpeed: s.playbackSpeed,
      source: 'music',
    });
  },

  playIndex: (index) => {
    audioEngine.playIndex(index);
    const s = audioEngine.getState();
    set({
      currentFile: s.currentFile,
      isPlaying: s.isPlaying,
      position: s.position,
      duration: s.duration,
      currentIndex: s.currentIndex,
      source: 'music',
    });
  },

  pause: () => {
    audioEngine.pause();
    set({ isPlaying: false });
  },

  resume: () => {
    audioEngine.resume();
    set({ isPlaying: true });
  },

  togglePlay: () => {
    audioEngine.togglePlay();
    const s = audioEngine.getState();
    set({ isPlaying: s.isPlaying });
  },

  stop: () => {
    audioEngine.stop();
    set(initialState);
  },

  seekTo: (millis) => {
    audioEngine.seekTo(millis);
  },

  next: () => {
    audioEngine.next();
    const s = audioEngine.getState();
    set({
      currentFile: s.currentFile,
      isPlaying: s.isPlaying,
      position: s.position,
      duration: s.duration,
      currentIndex: s.currentIndex,
    });
  },

  previous: () => {
    audioEngine.previous();
    const s = audioEngine.getState();
    set({
      currentFile: s.currentFile,
      isPlaying: s.isPlaying,
      position: s.position,
      duration: s.duration,
      currentIndex: s.currentIndex,
    });
  },

  setRate: (rate) => {
    audioEngine.setRate(rate);
    set({ playbackSpeed: rate });
  },

  setRepeat: (mode) => {
    audioEngine.setRepeat(mode);
    set({ repeat: mode });
  },

  cycleRepeat: () => {
    audioEngine.cycleRepeat();
    const s = audioEngine.getState();
    set({ repeat: s.repeat });
  },

  toggleShuffle: () => {
    audioEngine.toggleShuffle();
    const s = audioEngine.getState();
    set({ shuffle: s.shuffle });
  },

  setQueue: (queue, startIndex = 0) => {
    audioEngine.setQueue(queue, startIndex);
    set({ queue, currentIndex: startIndex });
  },

  setSource: (source) => set({ source }),

  reset: () => set(initialState),
}));

let _lastEngineState = '';
audioEngine.subscribe((state) => {
  const store = usePlaybackStore.getState();
  if (store.source === 'music') {
    const snapshot = JSON.stringify([
      state.currentFile?.uri,
      state.isPlaying,
      state.position,
      state.duration,
      state.currentIndex,
      state.shuffle,
      state.repeat,
      state.playbackSpeed,
    ]);
    if (snapshot === _lastEngineState) return;
    _lastEngineState = snapshot;
    usePlaybackStore.setState({
      currentFile: state.currentFile,
      isPlaying: state.isPlaying,
      position: state.position,
      duration: state.duration,
      queue: state.queue,
      currentIndex: state.currentIndex,
      shuffle: state.shuffle,
      repeat: state.repeat,
      playbackSpeed: state.playbackSpeed,
    });
  }
});
