import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { audioEngine } from '../engine/AudioEngine';
import { queueEngine } from '../engine/QueueEngine';
import type { FileItem, RepeatMode } from '../types';

function getState() {
  return audioEngine.getState();
}

function shallowEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

export function useAudioEngine<Selected>(
  selector: (state: ReturnType<typeof getState>) => Selected
): Selected {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const [selected, setSelected] = useState(() => selector(getState()));

  useEffect(() => {
    const unsub = audioEngine.subscribe(() => {
      const next = selectorRef.current(getState());
      setSelected((prev) => (typeof next === 'object' && next !== null && shallowEqual(prev, next) ? prev : next));
    });
    return unsub;
  }, []);

  return selected;
}

export function useAudioEngineState() {
  return useAudioEngine((s) => s);
}

export function useAudioPlayback() {
  const currentFile = useAudioEngine((s) => s.currentFile);
  const isPlaying = useAudioEngine((s) => s.isPlaying);
  const position = useAudioEngine((s) => s.position);
  const duration = useAudioEngine((s) => s.duration);
  const queue = useAudioEngine((s) => s.queue);
  const currentIndex = useAudioEngine((s) => s.currentIndex);
  const shuffle = useAudioEngine((s) => s.shuffle);
  const repeat = useAudioEngine((s) => s.repeat);
  const playbackSpeed = useAudioEngine((s) => s.playbackSpeed);

  const playFile = useCallback((file: FileItem, q?: FileItem[], startIndex?: number) => {
    const queueArg = q || [file];
    const idx = startIndex ?? 0;
    audioEngine.play(file, queueArg, idx);
  }, []);

  const seekTo = useCallback((percent: number) => {
    const s = audioEngine.getState();
    if (!s.duration) return;
    audioEngine.seekTo(percent * s.duration);
  }, []);

  const playQueue = useCallback((queueArg: FileItem[], startIndex = 0) => {
    if (queueArg.length === 0) return;
    audioEngine.play(queueArg[startIndex], queueArg, startIndex);
  }, []);

  const playIndex = useCallback((index: number) => audioEngine.playIndex(index), []);
  const pause = useCallback(() => audioEngine.pause(), []);
  const resume = useCallback(() => audioEngine.resume(), []);
  const togglePlay = useCallback(() => audioEngine.togglePlay(), []);
  const skipNext = useCallback(() => audioEngine.next(), []);
  const skipPrev = useCallback(() => audioEngine.previous(), []);
  const setRate = useCallback((rate: number) => audioEngine.setRate(rate), []);
  const setRepeatMode = useCallback((mode: RepeatMode) => audioEngine.setRepeat(mode), []);
  const cycleRepeat = useCallback(() => audioEngine.cycleRepeat(), []);
  const toggleShuffle = useCallback(() => audioEngine.toggleShuffle(), []);
  const setQueueFn = useCallback(
    (q: FileItem[], startIndex?: number) => audioEngine.setQueue(q, startIndex),
    []
  );
  const moveInQueue = useCallback(
    (from: number, to: number) => queueEngine.moveInQueue(from, to, 'audio'),
    []
  );
  const stop = useCallback(() => audioEngine.stop(), []);

  return useMemo(() => ({
    currentFile,
    isPlaying,
    position,
    duration,
    progress: duration > 0 ? position / duration : 0,
    queue,
    currentIndex,
    shuffle,
    repeat,
    playbackSpeed,
    playFile,
    seekTo,
    playQueue,
    playIndex,
    pause,
    resume,
    togglePlay,
    skipNext,
    skipPrev,
    setRate,
    setRepeatMode,
    cycleRepeat,
    toggleShuffle,
    setQueue: setQueueFn,
    moveInQueue,
    stop,
  }), [
    currentFile, isPlaying, position, duration, queue, currentIndex,
    shuffle, repeat, playbackSpeed, playFile, seekTo, playQueue,
    playIndex, pause, resume, togglePlay, skipNext, skipPrev, setRate,
    setRepeatMode, cycleRepeat, toggleShuffle, setQueueFn, moveInQueue, stop,
  ]);
}

export { audioEngine };
