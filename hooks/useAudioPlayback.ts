import { useEffect, useCallback } from 'react';
import { usePlaybackStore } from '../stores/playbackStore';
import type { FileItem, RepeatMode } from '../types';

export function useAudioPlayback() {
  const store = usePlaybackStore();

  const playFile = useCallback((file: FileItem, queue?: FileItem[], startIndex?: number) => {
    const q = queue || [file];
    const idx = startIndex ?? 0;
    store.play(file, q, idx);
  }, [store]);

  const playQueue = useCallback((queue: FileItem[], startIndex = 0) => {
    if (queue.length === 0) return;
    store.play(queue[startIndex], queue, startIndex);
  }, [store]);

  const togglePlay = useCallback(() => {
    store.togglePlay();
  }, [store]);

  const seekTo = useCallback((percent: number) => {
    if (!store.duration) return;
    store.seekTo(percent * store.duration);
  }, [store.duration, store.seekTo]);

  const setRepeatMode = useCallback((mode: RepeatMode) => {
    store.setRepeat(mode);
  }, [store.setRepeat]);

  const cycleRepeat = useCallback(() => {
    store.cycleRepeat();
  }, [store.cycleRepeat]);

  const toggleShuffle = useCallback(() => {
    store.toggleShuffle();
  }, [store.toggleShuffle]);

  const skipNext = useCallback(() => {
    store.next();
  }, [store.next]);

  const skipPrev = useCallback(() => {
    store.previous();
  }, [store.previous]);

  return {
    currentFile: store.currentFile,
    isPlaying: store.isPlaying,
    position: store.position,
    duration: store.duration,
    progress: store.duration > 0 ? store.position / store.duration : 0,
    queue: store.queue,
    currentIndex: store.currentIndex,
    shuffle: store.shuffle,
    repeat: store.repeat,
    playbackSpeed: store.playbackSpeed,

    playFile,
    playQueue,
    playIndex: store.playIndex,
    pause: store.pause,
    resume: store.resume,
    togglePlay,
    seekTo,
    skipNext,
    skipPrev,
    setRate: store.setRate,
    setRepeatMode,
    cycleRepeat,
    toggleShuffle,
    setQueue: store.setQueue,
    stop: store.stop,
  };
}
