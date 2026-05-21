import { Audio, AVPlaybackStatus } from 'expo-av';
import { MMKV } from 'react-native-mmkv';
import type { FileItem, RepeatMode, PlaybackSource } from '../types';
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
  private _sound: Audio.Sound | null = null;
  private _state: AudioEngineState;
  private _listeners: Set<AudioEngineListener> = new Set();
  private _shuffledOrder: number[] = [];
  private _isLoaded = false;
  private _sleepTimer: SleepTimerState = { enabled: false, mode: 'off', remainingMillis: 0, stopAfterTrackEnd: false, trackCount: 0 };
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
    this._loadSettings();
    this._initAudio();
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
    storage.set(SETTINGS_KEY, JSON.stringify({ sleepTimer: this._sleepTimer, crossfade: this._crossfade }));
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
    storage.set(STATE_KEY, JSON.stringify(this._state));
  }

  private async _initAudio() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
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

  private async _unload() {
    if (this._sound) {
      try {
        await this._sound.unloadAsync();
      } catch {}
      this._sound = null;
    }
  }

  private _startPositionCheck() {
    this._stopPositionCheck();
    this._positionCheckInterval = setInterval(() => {
      if (!this._sleepTimer.enabled) return;
      if (!this._state.isPlaying) return;
      if (this._sleepTimer.mode !== 'minutes') return;
      this._sleepTimer.remainingMillis -= 1000;
      if (this._sleepTimer.remainingMillis <= 0) {
        this.pause();
        this.disableSleepTimer();
      }
    }, 1000);
  }

  private _stopPositionCheck() {
    if (this._positionCheckInterval) {
      clearInterval(this._positionCheckInterval);
      this._positionCheckInterval = null;
    }
  }

  private _onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    this._state.position = status.positionMillis || 0;
    this._state.duration = status.durationMillis || 0;
    this._state.isPlaying = status.isPlaying ?? false;
    this._persistState();
    this._notify();

    if (status.didJustFinish) {
      this._handleTrackEnd();
    }
  };

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
    this._advanceToNext();
  }

  private _advanceToNext() {
    const { queue, currentIndex, repeat } = this._state;
    let next = currentIndex + 1;
    if (next >= queue.length) {
      if (repeat === 'all') {
        next = 0;
      } else {
        this._state.isPlaying = false;
        this._persistState();
        this._notify();
        return;
      }
    }
    this._playIndex(next);
  }

  private async _playIndex(index: number) {
    if (index < 0 || index >= this._state.queue.length) return;
    this._state.currentIndex = index;
    this._state.currentFile = this._state.queue[index];
    await this._playFile(this._state.currentFile);
  }

  private async _playFile(file: FileItem) {
    if (!this._isLoaded) await this._initAudio();
    this._state.position = 0;
    this._state.duration = 0;
    this._persistState();
    this._notify();

    await this._unload();
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: file.uri },
        {
          shouldPlay: true,
          progressUpdateIntervalMillis: 250,
          rate: this._state.playbackSpeed,
          shouldCorrectPitch: true,
        },
        this._onPlaybackStatusUpdate,
      );
      this._sound = sound;
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

  getShuffledOrder(): number[] {
    if (this._shuffledOrder.length !== this._state.queue.length) {
      this._shuffledOrder = this._state.queue.map((_, i) => i);
      for (let i = this._shuffledOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this._shuffledOrder[i], this._shuffledOrder[j]] = [this._shuffledOrder[j], this._shuffledOrder[i]];
      }
    }
    return this._shuffledOrder;
  }

  play(file?: FileItem, queue?: FileItem[], startIndex?: number) {
    if (file && queue && startIndex !== undefined) {
      this._state.queue = queue;
      this._state.currentIndex = startIndex;
      this._shuffledOrder = [];
      this._state.currentFile = file;
      this._playFile(file);
    } else if (this._state.currentFile) {
      this._playFile(this._state.currentFile);
    }
  }

  playIndex(index: number) {
    const actualIndex = this._state.shuffle
      ? this.getShuffledOrder()[index]
      : index;
    if (actualIndex >= 0 && actualIndex < this._state.queue.length) {
      this._playIndex(actualIndex);
    }
  }

  async pause() {
    try {
      await this._sound?.pauseAsync();
    } catch {}
    this._state.isPlaying = false;
    this._persistState();
    this._notify();
    this._stopPositionCheck();
    if (this._state.currentFile) {
      NowPlayingNotification.updatePlayState(false);
    }
  }

  async resume() {
    try {
      await this._sound?.playAsync();
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

  async stop() {
    await this._unload();
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

  async seekTo(millis: number) {
    try {
      await this._sound?.setPositionAsync(Math.max(0, millis));
    } catch {}
  }

  async setRate(rate: number) {
    this._state.playbackSpeed = rate;
    try {
      await this._sound?.setRateAsync(rate, true);
    } catch {}
    this._persistState();
    this._notify();
  }

  setRepeat(mode: RepeatMode) {
    this._state.repeat = mode;
    this._persistState();
    this._notify();
  }

  cycleRepeat() {
    const modes: RepeatMode[] = ['none', 'all', 'one'];
    const idx = modes.indexOf(this._state.repeat);
    this._state.repeat = modes[(idx + 1) % modes.length];
    this._persistState();
    this._notify();
  }

  toggleShuffle() {
    this._state.shuffle = !this._state.shuffle;
    if (this._state.shuffle) {
      this._shuffledOrder = [];
      this.getShuffledOrder();
    }
    this._persistState();
    this._notify();
  }

  setQueue(queue: FileItem[], startIndex = 0) {
    this._state.queue = queue;
    this._state.currentIndex = startIndex;
    this._shuffledOrder = [];
    if (this._state.shuffle) this.getShuffledOrder();
    this._persistState();
    this._notify();
  }

  skipToNext() {
    const { queue, currentIndex, shuffle } = this._state;
    if (shuffle) {
      const shuffled = this.getShuffledOrder();
      const currentShuffleIdx = shuffled.indexOf(currentIndex);
      const nextShuffleIdx = (currentShuffleIdx + 1) % shuffled.length;
      this._playIndex(shuffled[nextShuffleIdx]);
    } else {
      const next = currentIndex + 1;
      if (next < queue.length) {
        this._playIndex(next);
      } else if (this._state.repeat === 'all') {
        this._playIndex(0);
      }
    }
  }

  skipToPrevious() {
    const { currentIndex } = this._state;
    const prev = currentIndex - 1;
    if (prev >= 0) {
      this._playIndex(prev);
    } else if (this._state.repeat === 'all') {
      this._playIndex(this._state.queue.length - 1);
    }
  }

  next() {
    this.skipToNext();
  }

  previous() {
    this.skipToPrevious();
  }

  // Sleep Timer
  enableSleepTimer(mode: 'minutes' | 'endOfTrack' | 'endOfQueue', minutes?: number, trackCount?: number) {
    this._sleepTimer.enabled = true;
    this._sleepTimer.mode = mode;
    if (mode === 'minutes') {
      this._sleepTimer.remainingMillis = (minutes || 30) * 60 * 1000;
    }
    if (mode === 'endOfQueue') {
      this._sleepTimer.trackCount = trackCount || this._state.queue.length - this._state.currentIndex;
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
    this._unload();
    this._listeners.clear();
    this._stopPositionCheck();
    if (this._sleepTimeout) clearTimeout(this._sleepTimeout);
    if (this._crossfadeTimeout) clearTimeout(this._crossfadeTimeout);
  }
}

export const audioEngine = AudioEngine.getInstance();
