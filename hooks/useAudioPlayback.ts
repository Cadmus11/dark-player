import { useCallback } from 'react';
import { usePlaybackStore } from '../stores/playbackStore';
import { useShallow } from 'zustand/react/shallow';
import type { FileItem } from '../types';

export function useAudioPlayback() {
  const store = usePlaybackStore(
    useShallow((s) => ({
      currentFile: s.currentFile,
      isPlaying: s.isPlaying,
      position: s.position,
      duration: s.duration,
      queue: s.queue,
      currentIndex: s.currentIndex,
      shuffle: s.shuffle,
      repeat: s.repeat,
      playbackSpeed: s.playbackSpeed,
    }))
  );

  const playFile = useCallback((file: FileItem, queue?: FileItem[], startIndex?: number) => {
    const q = queue || [file];
    const idx = startIndex ?? 0;
    usePlaybackStore.getState().play(file, q, idx);
  }, []);

  const seekTo = useCallback((percent: number) => {
    const s = usePlaybackStore.getState();
    if (!s.duration) return;
    s.seekTo(percent * s.duration);
  }, []);

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
    seekTo,
    playQueue: useCallback((queue: FileItem[], startIndex = 0) => {
      if (queue.length === 0) return;
      usePlaybackStore.getState().play(queue[startIndex], queue, startIndex);
    }, []),
    playIndex: usePlaybackStore.getState().playIndex,
    pause: usePlaybackStore.getState().pause,
    resume: usePlaybackStore.getState().resume,
    togglePlay: useCallback(() => {
      usePlaybackStore.getState().togglePlay();
    }, []),
    skipNext: useCallback(() => {
      usePlaybackStore.getState().next();
    }, []),
    skipPrev: useCallback(() => {
      usePlaybackStore.getState().previous();
    }, []),
    setRate: usePlaybackStore.getState().setRate,
    setRepeatMode: usePlaybackStore.getState().setRepeat,
    cycleRepeat: useCallback(() => {
      usePlaybackStore.getState().cycleRepeat();
    }, []),
    toggleShuffle: useCallback(() => {
      usePlaybackStore.getState().toggleShuffle();
    }, []),
    setQueue: usePlaybackStore.getState().setQueue,
    stop: usePlaybackStore.getState().stop,
  };
}
