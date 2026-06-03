import { create } from 'zustand';
import { audioEngine } from '../engine/AudioEngine';
import { queueEngine } from '../engine/QueueEngine';
import type { FileItem, PlaybackSource, RepeatMode } from '../types';
import { PlaybackTicker } from '../services/PlaybackTicker';

interface PlaybackStoreState {
  currentFile: FileItem | null;
  isPlaying: boolean;
  source: PlaybackSource;
  position: number;
  duration: number;
  progress: number;
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
  moveInQueue: (fromIndex: number, toIndex: number) => void;
  setSource: (source: PlaybackSource) => void;
  reset: () => void;
}

const initialState = {
  currentFile: null as FileItem | null,
  isPlaying: false,
  source: 'none' as PlaybackSource,
  position: 0,
  duration: 0,
  progress: 0,
  queue: [] as FileItem[],
  currentIndex: -1,
  shuffle: false,
  repeat: 'none' as RepeatMode,
  playbackSpeed: 1,
};

const _storeSelector = () => {
  const s = audioEngine.getState();
  return {
    currentFile: s.currentFile,
    isPlaying: s.isPlaying,
    position: s.position,
    duration: s.duration,
    progress: s.duration > 0 ? s.position / s.duration : 0,
    queue: s.queue,
    currentIndex: s.currentIndex,
    shuffle: s.shuffle,
    repeat: s.repeat,
    playbackSpeed: s.playbackSpeed,
  };
};

export const usePlaybackStore = create<PlaybackStoreState>((set) => ({
  ...initialState,

  play: (file, queue, startIndex) => {
    if (file && queue && startIndex !== undefined) {
      audioEngine.play(file, queue, startIndex);
    } else {
      audioEngine.play();
    }
    set({ ..._storeSelector(), source: 'music' });
  },

  playIndex: (index) => {
    audioEngine.playIndex(index);
    set({ ..._storeSelector(), source: 'music' });
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
    set({ isPlaying: audioEngine.getState().isPlaying });
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
    set({ ..._storeSelector() });
  },

  previous: () => {
    audioEngine.previous();
    set({ ..._storeSelector() });
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
    set({ repeat: audioEngine.getState().repeat });
  },

  toggleShuffle: () => {
    audioEngine.toggleShuffle();
    set({ shuffle: audioEngine.getState().shuffle });
  },

  setQueue: (queue, startIndex = 0) => {
    audioEngine.setQueue(queue, startIndex);
    set({ queue, currentIndex: startIndex });
  },

  moveInQueue: (fromIndex, toIndex) => {
    queueEngine.moveInQueue(fromIndex, toIndex, 'audio');
    const qs = queueEngine.getAudioState();
    set({ queue: qs.queue, currentIndex: qs.currentIndex });
  },

  setSource: (source) => set({ source }),
  reset: () => set(initialState),
}));

// Subscribe to engine with throttled tick updates
let _lastEngineSnapshot = '';
let _lastTick = 0;
audioEngine.subscribe(() => {
  const s = audioEngine.getState();
  const now = Date.now();

  const store = usePlaybackStore.getState();
  if (store.source === 'music') {
    const quickKey = `${s.currentFile?.uri}|${s.isPlaying}|${s.currentIndex}|${s.shuffle}|${s.repeat}|${s.playbackSpeed}`;
    const isTickUpdate = quickKey === _lastEngineSnapshot && now - _lastTick < 300;
    if (isTickUpdate) {
      PlaybackTicker.updatePosition(s.position, s.duration);
      if (Math.abs(store.position - s.position) > 50) {
        usePlaybackStore.setState({
          position: s.position,
          duration: s.duration,
          progress: s.duration > 0 ? s.position / s.duration : 0,
        });
      }
      return;
    }
    _lastEngineSnapshot = quickKey;
    _lastTick = now;
    usePlaybackStore.setState({
      currentFile: s.currentFile,
      isPlaying: s.isPlaying,
      position: s.position,
      duration: s.duration,
      progress: s.duration > 0 ? s.position / s.duration : 0,
      queue: s.queue,
      currentIndex: s.currentIndex,
      shuffle: s.shuffle,
      repeat: s.repeat,
      playbackSpeed: s.playbackSpeed,
    });
  }
});
