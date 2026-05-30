import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { MMKV } from 'react-native-mmkv';
import type { FileItem, RepeatMode } from '../types';
import type { AudioMetadata } from 'expo-audio';
import { queueEngine } from './QueueEngine';
import { HistoryService } from '../services/History/HistoryService';
import { NowPlayingNotification } from '../services/NowPlayingNotification';

const storage = new MMKV({ id: 'audio-engine' });
const STATE_KEY = '@audio_engine_state';
const SETTINGS_KEY = '@audio_engine_settings';

interface AudioEngineState {
  currentFile: FileItem | null;
  queue: FileItem[];
  currentIndex: number;
  repeat: RepeatMode;
  shuffle: boolean;
  position: number;
  duration: number;
  isPlaying: boolean;
  playbackSpeed: number;
}

interface SleepTimerState {
  enabled: boolean;
  mode: 'off' | 'minutes' | 'endOfTrack' | 'endOfQueue';
  remainingMillis: number;
  stopAfterTrackEnd: boolean;
  trackCount: number;
}

interface CrossfadeState {
  enabled: boolean;
  duration: number;
}

type AudioEngineListener = (state: AudioEngineState) => void;

export class AudioEngine {
  private static instance: AudioEngine;
  private _player: AudioPlayer | null = null;
  private _state: AudioEngineState;
  private _listeners: Set<AudioEngineListener> = new Set();
  private _isLoaded = false;
  private _sleepTimer: SleepTimerState = {
    enabled: false,
    mode: 'off',
    remainingMillis: 0,
    stopAfterTrackEnd: false,
    trackCount: 0,
  };
  private _crossfade: CrossfadeState = { enabled: false, duration: 3 };
  private _sleepTimeout: ReturnType<typeof setTimeout> | null = null;
  private _crossfadeTimeout: ReturnType<typeof setTimeout> | null = null;
  private _positionCheckInterval: ReturnType<typeof setInterval> | null = null;

  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  private constructor() {
    this._state = this._loadPersistedState();
    this._syncFromQueueEngine();
    this._loadSettings();
    this._initAudio();
    this._subscribeToQueueEngine();
  }

  private _subscribeToQueueEngine() {
    queueEngine.subscribe(() => {
      const qs = queueEngine.getAudioState();
      this._state.queue = qs.queue;
      this._state.currentIndex = qs.currentIndex;
      this._state.repeat = qs.repeat;
      this._state.shuffle = qs.shuffle;
      this._persistState();
      this._notify();
    });
  }

  private _syncFromQueueEngine() {
    const qs = queueEngine.getAudioState();
    this._state.queue = qs.queue;
    this._state.currentIndex = qs.currentIndex;
    this._state.repeat = qs.repeat;
    this._state.shuffle = qs.shuffle;
  }

  private _loadSettings() {
    try {
      const data = storage.getString(SETTINGS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.sleepTimer) this._sleepTimer = { ...this._sleepTimer, ...parsed.sleepTimer };
        if (parsed.crossfade) this._crossfade = { ...this._crossfade, ...parsed.crossfade };
      }
    } catch {}
  }

  private _saveSettings() {
    storage.set(
      SETTINGS_KEY,
      JSON.stringify({ sleepTimer: this._sleepTimer, crossfade: this._crossfade })
    );
  }

  private _loadPersistedState(): AudioEngineState {
    try {
      const data = storage.getString(STATE_KEY);
      if (data) return JSON.parse(data);
    } catch {}
    return {
      currentFile: null,
      queue: [],
      currentIndex: -1,
      repeat: 'none',
      shuffle: false,
      position: 0,
      duration: 0,
      isPlaying: false,
      playbackSpeed: 1,
    };
  }

  private _persistState() {
    storage.set(
      STATE_KEY,
      JSON.stringify({
        currentFile: this._state.currentFile,
        currentIndex: this._state.currentIndex,
        repeat: this._state.repeat,
        shuffle: this._state.shuffle,
        position: this._state.position,
        duration: this._state.duration,
        isPlaying: this._state.isPlaying,
        playbackSpeed: this._state.playbackSpeed,
      })
    );
  }

  private async _initAudio() {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
      });
      this._isLoaded = true;
      NowPlayingNotification.setupChannel();
    } catch {}
  }

  private _notify() {
    this._listeners.forEach((cb) => cb({ ...this._state }));
  }

  subscribe(listener: AudioEngineListener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  getState(): Readonly<AudioEngineState> {
    return { ...this._state };
  }

  private _unload() {
    if (this._player) {
      try {
        this._player.remove();
      } catch {}
      this._player = null;
    }
  }

  private _startPositionCheck() {
    this._stopPositionCheck();
    this._positionCheckInterval = setInterval(() => {
      if (this._player) {
        const prevPlaying = this._state.isPlaying;
        this._state.position = this._player.currentTime * 1000;
        this._state.duration = this._player.duration * 1000;
        this._state.isPlaying = this._player.playing;
        this._persistState();
        this._notify();

        if (
          prevPlaying &&
          !this._player.playing &&
          this._player.currentTime > 0 &&
          this._player.duration > 0 &&
          this._player.currentTime >= this._player.duration - 0.5
        ) {
          this._handleTrackEnd();
        }
      }
      if (
        this._sleepTimer.enabled &&
        this._state.isPlaying &&
        this._sleepTimer.mode === 'minutes'
      ) {
        this._sleepTimer.remainingMillis -= 250;
        if (this._sleepTimer.remainingMillis <= 0) {
          this.pause();
          this.disableSleepTimer();
        }
      }
    }, 250);
  }

  private _stopPositionCheck() {
    if (this._positionCheckInterval) {
      clearInterval(this._positionCheckInterval);
      this._positionCheckInterval = null;
    }
  }

  private _handleTrackEnd() {
    if (this._state.currentFile) {
      HistoryService.record(this._state.currentFile, this._state.duration, 'music');
    }

    if (this._sleepTimer.enabled) {
      if (this._sleepTimer.mode === 'endOfTrack') {
        this.pause();
        this.disableSleepTimer();
        return;
      }
      if (this._sleepTimer.mode === 'endOfQueue') {
        this._sleepTimer.trackCount--;
        if (this._sleepTimer.trackCount <= 0) {
          this.pause();
          this.disableSleepTimer();
          return;
        }
      }
    }

    const { repeat } = this._state;
    if (repeat === 'one') {
      this.seekTo(0);
      this.play();
      return;
    }
    const next = queueEngine.resolveNext('audio');
    if (next !== null) {
      queueEngine.setAudioIndex(next);
      this._playIndex(next);
    } else {
      this._state.isPlaying = false;
      this._persistState();
      this._notify();
    }
  }

  private async _playIndex(index: number) {
    if (index < 0 || index >= this._state.queue.length) return;
    this._state.currentIndex = index;
    this._state.currentFile = this._state.queue[index];
    queueEngine.setAudioIndex(index);
    await this._playFile(this._state.currentFile);
  }

  private async _playFile(file: FileItem) {
    if (!this._isLoaded) await this._initAudio();
    this._state.position = 0;
    this._state.duration = 0;
    this._persistState();
    this._notify();

    this._unload();
    try {
      const player = createAudioPlayer({ uri: file.uri });
      this._player = player;
      if (this._state.playbackSpeed !== 1) {
        player.playbackRate = this._state.playbackSpeed;
        player.shouldCorrectPitch = true;
      }
      const metadata: AudioMetadata = {
        title: file.name,
        artist: file.artist,
        albumTitle: file.album,
        artworkUrl: file.thumbnail,
      };
      player.setActiveForLockScreen(true, metadata, {
        showSeekForward: true,
        showSeekBackward: true,
      });
      player.play();
      this._state.isPlaying = true;
      HistoryService.record(file, 0, 'music');
      NowPlayingNotification.show(file, true);
    } catch {
      this._state.isPlaying = false;
      this._state.currentFile = null;
      this._state.currentIndex = -1;
      NowPlayingNotification.dismiss();
    }
    this._persistState();
    this._notify();
    this._startPositionCheck();
  }

  async play(file?: FileItem, queue?: FileItem[], startIndex?: number) {
    if (file && queue && startIndex !== undefined) {
      this._state.queue = queue;
      this._state.currentIndex = startIndex;
      this._state.currentFile = file;
      queueEngine.setAudioQueue(queue, startIndex);
      await this._playFile(file);
    } else if (this._state.currentFile) {
      await this._playFile(this._state.currentFile);
    }
  }

  playIndex(index: number) {
    const qs = queueEngine.getAudioState();
    const actualIndex = qs.shuffle ? queueEngine.getShuffledOrder('audio')[index] : index;
    if (actualIndex >= 0 && actualIndex < this._state.queue.length) {
      this._playIndex(actualIndex);
    }
  }

  pause() {
    try {
      this._player?.pause();
    } catch {}
    this._state.isPlaying = false;
    this._persistState();
    this._notify();
    this._stopPositionCheck();
    if (this._state.currentFile) {
      NowPlayingNotification.updatePlayState(false);
    }
  }

  resume() {
    try {
      this._player?.play();
    } catch {}
    this._state.isPlaying = true;
    this._persistState();
    this._notify();
    this._startPositionCheck();
    if (this._state.currentFile) {
      NowPlayingNotification.updatePlayState(true);
    }
  }

  togglePlay() {
    if (this._state.isPlaying) {
      this.pause();
    } else {
      this.resume();
    }
  }

  stop() {
    if (this._player) {
      try {
        this._player.clearLockScreenControls();
      } catch {}
    }
    this._unload();
    this._state.currentFile = null;
    this._state.currentIndex = -1;
    this._state.isPlaying = false;
    this._state.position = 0;
    this._state.duration = 0;
    this._persistState();
    this._notify();
    this._stopPositionCheck();
    NowPlayingNotification.dismiss();
  }

  seekTo(millis: number) {
    try {
      this._player?.seekTo(Math.max(0, millis) / 1000);
    } catch {}
  }

  setRate(rate: number) {
    this._state.playbackSpeed = rate;
    try {
      if (this._player) {
        this._player.playbackRate = rate;
        this._player.shouldCorrectPitch = true;
      }
    } catch {}
    this._persistState();
    this._notify();
  }

  setRepeat(mode: RepeatMode) {
    this._state.repeat = mode;
    queueEngine.setRepeat(mode, 'audio');
    this._persistState();
    this._notify();
  }

  cycleRepeat() {
    queueEngine.cycleRepeat('audio');
    this._state.repeat = queueEngine.getAudioState().repeat;
    this._persistState();
    this._notify();
  }

  toggleShuffle() {
    queueEngine.toggleShuffle('audio');
    this._state.shuffle = queueEngine.getAudioState().shuffle;
    this._persistState();
    this._notify();
  }

  setQueue(queue: FileItem[], startIndex = 0) {
    this._state.queue = queue;
    this._state.currentIndex = startIndex;
    queueEngine.setAudioQueue(queue, startIndex);
    this._persistState();
    this._notify();
  }

  skipToNext() {
    const next = queueEngine.resolveNext('audio');
    if (next !== null) {
      queueEngine.setAudioIndex(next);
      this._playIndex(next);
    }
  }

  skipToPrevious() {
    const prev = queueEngine.resolvePrevious('audio');
    if (prev !== null) {
      queueEngine.setAudioIndex(prev);
      this._playIndex(prev);
    }
  }

  next() {
    this.skipToNext();
  }

  previous() {
    this.skipToPrevious();
  }

  // Sleep Timer
  enableSleepTimer(
    mode: 'minutes' | 'endOfTrack' | 'endOfQueue',
    minutes?: number,
    trackCount?: number
  ) {
    this._sleepTimer.enabled = true;
    this._sleepTimer.mode = mode;
    if (mode === 'minutes') {
      this._sleepTimer.remainingMillis = (minutes || 30) * 60 * 1000;
    }
    if (mode === 'endOfQueue') {
      this._sleepTimer.trackCount =
        trackCount || this._state.queue.length - this._state.currentIndex;
    }
    this._saveSettings();
    this._startPositionCheck();
  }

  disableSleepTimer() {
    this._sleepTimer.enabled = false;
    this._sleepTimer.mode = 'off';
    this._sleepTimer.remainingMillis = 0;
    this._sleepTimer.trackCount = 0;
    this._saveSettings();
    this._stopPositionCheck();
  }

  getSleepTimerState() {
    return { ...this._sleepTimer };
  }

  // Crossfade
  setCrossfade(enabled: boolean, duration: number) {
    this._crossfade.enabled = enabled;
    this._crossfade.duration = Math.max(1, Math.min(10, duration));
    this._saveSettings();
  }

  getCrossfadeState() {
    return { ...this._crossfade };
  }

  // Engine info
  getPlayCount(): { file: FileItem; count: number }[] {
    return HistoryService.getMostPlayed(20);
  }

  cleanup() {
    if (this._player) {
      try {
        this._player.clearLockScreenControls();
      } catch {}
    }
    this._unload();
    this._listeners.clear();
    this._stopPositionCheck();
    if (this._sleepTimeout) clearTimeout(this._sleepTimeout);
    if (this._crossfadeTimeout) clearTimeout(this._crossfadeTimeout);
  }
}

export const audioEngine = AudioEngine.getInstance();
