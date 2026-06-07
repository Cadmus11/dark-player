import { useSyncExternalStore, useCallback } from 'react';
import { audioEngine } from '../engine/AudioEngine';
import { queueEngine } from '../engine/QueueEngine';
import type { FileItem, RepeatMode } from '../types';

function subscribe(callback: () => void) {
  return audioEngine.subscribe(callback);
}

function getSnapshot() {
  return audioEngine.getState();
}

export function useAudioEngine<Selected>(
  selector: (state: ReturnType<typeof getSnapshot>) => Selected
): Selected {
  const state = useSyncExternalStore(subscribe, getSnapshot);
  return selector(state);
}

export function useAudioEngineState() {
  return useAudioEngine((s) => s);
}

export function useAudioPlayback() {
  const state = useAudioEngineState();

  const playFile = useCallback((file: FileItem, queue?: FileItem[], startIndex?: number) => {
    const q = queue || [file];
    const idx = startIndex ?? 0;
    audioEngine.play(file, q, idx);
  }, []);

  const seekTo = useCallback((percent: number) => {
    const s = audioEngine.getState();
    if (!s.duration) return;
    audioEngine.seekTo(percent * s.duration);
  }, []);

  return {
    currentFile: state.currentFile,
    isPlaying: state.isPlaying,
    position: state.position,
    duration: state.duration,
    progress: state.duration > 0 ? state.position / state.duration : 0,
    queue: state.queue,
    currentIndex: state.currentIndex,
    shuffle: state.shuffle,
    repeat: state.repeat,
    playbackSpeed: state.playbackSpeed,

    playFile,
    seekTo,
    playQueue: useCallback((queue: FileItem[], startIndex = 0) => {
      if (queue.length === 0) return;
      audioEngine.play(queue[startIndex], queue, startIndex);
    }, []),
    playIndex: useCallback((index: number) => audioEngine.playIndex(index), []),
    pause: useCallback(() => audioEngine.pause(), []),
    resume: useCallback(() => audioEngine.resume(), []),
    togglePlay: useCallback(() => audioEngine.togglePlay(), []),
    skipNext: useCallback(() => audioEngine.next(), []),
    skipPrev: useCallback(() => audioEngine.previous(), []),
    setRate: useCallback((rate: number) => audioEngine.setRate(rate), []),
    setRepeatMode: useCallback((mode: RepeatMode) => audioEngine.setRepeat(mode), []),
    cycleRepeat: useCallback(() => audioEngine.cycleRepeat(), []),
    toggleShuffle: useCallback(() => audioEngine.toggleShuffle(), []),
    setQueue: useCallback(
      (queue: FileItem[], startIndex?: number) => audioEngine.setQueue(queue, startIndex),
      []
    ),
    moveInQueue: useCallback(
      (from: number, to: number) => queueEngine.moveInQueue(from, to, 'audio'),
      []
    ),
    stop: useCallback(() => audioEngine.stop(), []),
  };
}

export { audioEngine };
