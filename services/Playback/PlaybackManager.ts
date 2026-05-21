import { Audio, AVPlaybackStatus } from 'expo-av';
import { setupAudioSession } from '../AudioSetup';
import type { FileItem, PlaybackSource } from '../../types';
import { usePlaybackStore } from '../../stores/playbackStore';

type PlaybackObserver = (state: { source: PlaybackSource; file: FileItem | null; isPlaying: boolean }) => void;

class PlaybackManager {
  private static instance: PlaybackManager;
  private _sound: Audio.Sound | null = null;
  private _currentSource: PlaybackSource = 'none';
  private _currentFile: FileItem | null = null;
  private _isPlaying = false;
  private _position = 0;
  private _duration = 0;
  private _observers: Set<PlaybackObserver> = new Set();
  private _videoActive = false;
  private _musicWasPlayingBeforeVideo = false;
  private _queue: FileItem[] = [];
  private _currentIndex = -1;
  private _rate = 1;
  private _onTrackEnd: (() => void) | null = null;

  static getInstance(): PlaybackManager {
    if (!PlaybackManager.instance) {
      PlaybackManager.instance = new PlaybackManager();
    }
    return PlaybackManager.instance;
  }

  subscribe(observer: PlaybackObserver): () => void {
    this._observers.add(observer);
    return () => this._observers.delete(observer);
  }

  private notify() {
    const state = { source: this._currentSource, file: this._currentFile, isPlaying: this._isPlaying };
    this._observers.forEach((cb) => cb(state));
  }

  private storeUpdate() {
    if (this._videoActive) return;
    usePlaybackStore.getState().setCurrentFile(this._currentFile);
    usePlaybackStore.getState().setIsPlaying(this._isPlaying);
    usePlaybackStore.getState().setSource(this._currentSource);
    usePlaybackStore.getState().setPosition(this._position);
    usePlaybackStore.getState().setDuration(this._duration);
    usePlaybackStore.getState().setQueue(this._queue, this._currentIndex);
  }

  setQueue(files: FileItem[], startIndex: number) {
    this._queue = files;
    this._currentIndex = startIndex;
  }

  getQueue(): FileItem[] {
    return this._queue;
  }

  getCurrentIndex(): number {
    return this._currentIndex;
  }

  setOnTrackEnd(callback: (() => void) | null) {
    this._onTrackEnd = callback;
  }

  private async _unloadSound() {
    if (this._sound) {
      try {
        await this._sound.unloadAsync();
      } catch {}
      this._sound = null;
    }
  }

  private _onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      this._position = status.positionMillis || 0;
      this._duration = status.durationMillis || 0;
      this._isPlaying = status.isPlaying ?? false;
      this.storeUpdate();

      if (status.didJustFinish) {
        this._handleTrackEnd();
      }
    }
  };

  private _handleTrackEnd() {
    if (this._videoActive) return;
    if (this._onTrackEnd) {
      this._onTrackEnd();
    } else {
      this._isPlaying = false;
      this.storeUpdate();
      this.notify();
    }
  }

  private _advanceToNext() {
    const nextIndex = this._currentIndex + 1;
    if (nextIndex < this._queue.length) {
      this._playIndexInternal(nextIndex);
    } else {
      this._isPlaying = false;
      this._currentFile = null;
      this._currentSource = 'none';
      this.storeUpdate();
      this.notify();
    }
  }

  private async _playIndexInternal(index: number) {
    if (index < 0 || index >= this._queue.length) return;
    this._currentIndex = index;
    const file = this._queue[index];
    await this.playFile(file);
  }

  async playFile(file: FileItem) {
    await setupAudioSession();
    if (this._videoActive) {
      this._videoActive = false;
    }
    this._currentSource = 'music';
    this._currentFile = file;
    this._position = 0;
    this._duration = 0;

    await this._unloadSound();
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: file.uri },
        {
          shouldPlay: true,
          progressUpdateIntervalMillis: 250,
          rate: this._rate,
          shouldCorrectPitch: true,
        },
        this._onPlaybackStatusUpdate
      );
      this._sound = sound;
      this._isPlaying = true;
    } catch {
      this._isPlaying = false;
    }
    this.storeUpdate();
    this.notify();
  }

  async playMusic(file: FileItem, queue?: FileItem[], startIndex?: number) {
    if (queue && startIndex !== undefined) {
      this._queue = queue;
      this._currentIndex = startIndex;
    } else {
      this._queue = [file];
      this._currentIndex = 0;
    }
    await this.playFile(file);
  }

  async playIndex(index: number) {
    if (index >= 0 && index < this._queue.length) {
      this._currentIndex = index;
      await this.playFile(this._queue[index]);
    }
  }

  async pause() {
    if (this._currentSource !== 'music') return;
    try {
      await this._sound?.pauseAsync();
    } catch {}
    this._isPlaying = false;
    this.storeUpdate();
    this.notify();
  }

  async resume() {
    if (this._currentSource !== 'music') return;
    try {
      await this._sound?.playAsync();
    } catch {}
    this._isPlaying = true;
    this.storeUpdate();
    this.notify();
  }

  async pauseMusic() {
    await this.pause();
  }

  async resumeMusic() {
    await this.resume();
  }

  async stop() {
    if (this._currentSource === 'music') {
      await this._unloadSound();
      this._isPlaying = false;
      this._currentFile = null;
      this._currentSource = 'none';
      this._position = 0;
      this._duration = 0;
      this.storeUpdate();
      this.notify();
    }
  }

  async stopMusic() {
    await this.stop();
  }

  async seekTo(millis: number) {
    try {
      await this._sound?.setPositionAsync(Math.max(0, millis));
    } catch {}
  }

  async setRate(rate: number) {
    this._rate = rate;
    try {
      await this._sound?.setRateAsync(rate, true);
    } catch {}
  }

  async skipToNext() {
    if (this._currentIndex < this._queue.length - 1) {
      await this._playIndexInternal(this._currentIndex + 1);
    }
  }

  async skipToPrevious() {
    if (this._currentIndex > 0) {
      await this._playIndexInternal(this._currentIndex - 1);
    }
  }

  onVideoOpen() {
    this._musicWasPlayingBeforeVideo = this._isPlaying && this._currentSource === 'music';
    if (this._musicWasPlayingBeforeVideo) {
      this.stop();
    }
    this._videoActive = true;
  }

  onVideoClose() {
    this._videoActive = false;
    this._musicWasPlayingBeforeVideo = false;
  }

  getCurrentSource(): PlaybackSource {
    return this._currentSource;
  }

  getCurrentFile(): FileItem | null {
    return this._currentFile;
  }

  isPlaying(): boolean {
    return this._isPlaying;
  }

  isVideoActive(): boolean {
    return this._videoActive;
  }

  async startAudioSession() {
    await setupAudioSession();
  }

  stopPlayback() {
    this.stop();
  }
}

export const playbackManager = PlaybackManager.getInstance();
