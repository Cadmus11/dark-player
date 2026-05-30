import { VideoPlayer } from 'expo-video';
import { MMKV } from 'react-native-mmkv';
import type { FileItem, SubtitleEntry } from '../types';
import { findSubtitleFile, parseSRT, readTextFile } from '../services/FileService';
import { queueEngine } from './QueueEngine';

const storage = new MMKV({ id: 'video-engine' });
const STATE_KEY = '@video_engine_state';

type VideoContentFit = 'contain' | 'cover' | 'fill';

type VideoEngineListener = (state: VideoEngineState) => void;

export interface VideoEngineState {
  currentFile: FileItem | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  playbackSpeed: number;
  contentFit: VideoContentFit;
  subtitlesEnabled: boolean;
  subtitles: SubtitleEntry[];
  currentSubtitle: string;
  isFullscreen: boolean;
  isReady: boolean;
  error: string | null;
  playbackRestored: boolean;
}

export class VideoEngine {
  private static instance: VideoEngine;
  private _player: VideoPlayer | null = null;
  private _state: VideoEngineState;
  private _listeners: Set<VideoEngineListener> = new Set();
  private _subtitleInterval: ReturnType<typeof setInterval> | null = null;
  private _statusInterval: ReturnType<typeof setInterval> | null = null;
  private _lastNotifiedState: string = '';

  static getInstance(): VideoEngine {
    if (!VideoEngine.instance) {
      VideoEngine.instance = new VideoEngine();
    }
    return VideoEngine.instance;
  }

  private constructor() {
    this._state = this._loadPersistedState();
  }

  private _defaultState(): VideoEngineState {
    return {
      currentFile: null,
      isPlaying: false,
      position: 0,
      duration: 0,
      playbackSpeed: 1,
      contentFit: 'contain',
      subtitlesEnabled: true,
      subtitles: [],
      currentSubtitle: '',
      isFullscreen: false,
      isReady: false,
      error: null,
      playbackRestored: false,
    };
  }

  private _loadPersistedState(): VideoEngineState {
    try {
      const data = storage.getString(STATE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return { ...this._defaultState(), ...parsed };
      }
    } catch {}
    return this._defaultState();
  }

  private _persistState() {
    storage.set(
      STATE_KEY,
      JSON.stringify({
        currentFile: this._state.currentFile,
        playbackSpeed: this._state.playbackSpeed,
        contentFit: this._state.contentFit,
        subtitlesEnabled: this._state.subtitlesEnabled,
        isFullscreen: this._state.isFullscreen,
      })
    );
  }

  private _notify() {
    const snapshot = JSON.stringify(this._state);
    if (snapshot === this._lastNotifiedState) return;
    this._lastNotifiedState = snapshot;
    this._listeners.forEach((cb) => cb({ ...this._state }));
  }

  subscribe(listener: VideoEngineListener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  getState(): Readonly<VideoEngineState> {
    return { ...this._state };
  }

  attachPlayer(player: VideoPlayer | null) {
    this._player = player;
    if (player) {
      player.showNowPlayingNotification = true;
      player.staysActiveInBackground = true;
      this._startStatusPolling();
    } else {
      this._stopStatusPolling();
    }
  }

  // Playback tick throttling: separate position polling from state changes
  private _startStatusPolling() {
    this._stopStatusPolling();
    this._statusInterval = setInterval(() => {
      if (!this._player) return;
      this._state.position = this._player.currentTime * 1000;
      this._state.duration = this._player.duration * 1000;
      this._state.isPlaying = this._player.playing;
      this._state.isReady = this._player.status === 'readyToPlay';
      this._state.error = this._player.status === 'error' ? 'Playback error' : null;
      this._notify();
    }, 250);
  }

  private _stopStatusPolling() {
    if (this._statusInterval) {
      clearInterval(this._statusInterval);
      this._statusInterval = null;
    }
  }

  async loadFile(file: FileItem) {
    this._state.currentFile = file;
    this._state.position = 0;
    this._state.duration = 0;
    this._state.isReady = false;
    this._state.error = null;
    this._state.subtitles = [];
    this._state.currentSubtitle = '';
    this._state.playbackRestored = true;
    this._persistState();
    this._notify();

    await this._loadSubtitles(file);

    if (this._subtitleInterval) clearInterval(this._subtitleInterval);
    this._subtitleInterval = setInterval(() => {
      this._updateSubtitle();
    }, 100);
  }

  // Direct setFile w/out full reload (for QueueEngine-driven navigation)
  setFile(file: FileItem) {
    this._state.currentFile = file;
    this._state.position = 0;
    this._state.duration = 0;
    this._state.error = null;
    this._persistState();
    this._notify();
  }

  private async _loadSubtitles(file: FileItem) {
    try {
      const subtitleUri = findSubtitleFile(file.uri, []);
      if (subtitleUri) {
        const content = await readTextFile(subtitleUri);
        if (content) {
          this._state.subtitles = parseSRT(content);
          this._notify();
        }
      }
    } catch {}
  }

  private _updateSubtitle() {
    if (!this._state.subtitlesEnabled || this._state.subtitles.length === 0) {
      if (this._state.currentSubtitle) {
        this._state.currentSubtitle = '';
        this._notify();
      }
      return;
    }
    const pos = this._state.position;
    const active = this._state.subtitles.find((s) => pos >= s.start && pos <= s.end);
    const newSub = active?.text || '';
    if (newSub !== this._state.currentSubtitle) {
      this._state.currentSubtitle = newSub;
      this._notify();
    }
  }

  togglePlayback() {
    if (!this._player) return;
    try {
      if (this._state.isPlaying) {
        this._player.pause();
      } else {
        this._player.play();
      }
    } catch {}
  }

  seekTo(percentage: number) {
    if (!this._player || !this._state.duration) return;
    this._player.currentTime = percentage * (this._state.duration / 1000);
  }

  skip(seconds: number) {
    if (!this._player) return;
    this._player.seekBy(seconds);
  }

  setRate(rate: number) {
    if (!this._player) return;
    this._state.playbackSpeed = rate;
    this._player.playbackRate = rate;
    this._persistState();
    this._notify();
  }

  setContentFit(mode: VideoContentFit) {
    this._state.contentFit = mode;
    this._persistState();
    this._notify();
  }

  toggleSubtitles() {
    this._state.subtitlesEnabled = !this._state.subtitlesEnabled;
    if (!this._state.subtitlesEnabled) this._state.currentSubtitle = '';
    this._notify();
  }

  setSubtitlesEnabled(enabled: boolean) {
    this._state.subtitlesEnabled = enabled;
    if (!enabled) this._state.currentSubtitle = '';
    this._notify();
  }

  setFullscreen(fullscreen: boolean) {
    this._state.isFullscreen = fullscreen;
    this._notify();
  }

  // Queue integration
  nextInQueue(): FileItem | null {
    const nextIdx = queueEngine.resolveNext('video');
    if (nextIdx === null) return null;
    const qs = queueEngine.getVideoState();
    const file = qs.queue[nextIdx];
    if (file) {
      queueEngine.setVideoIndex(nextIdx);
      return file;
    }
    return null;
  }

  prevInQueue(): FileItem | null {
    const prevIdx = queueEngine.resolvePrevious('video');
    if (prevIdx === null) return null;
    const qs = queueEngine.getVideoState();
    const file = qs.queue[prevIdx];
    if (file) {
      queueEngine.setVideoIndex(prevIdx);
      return file;
    }
    return null;
  }

  cleanup() {
    if (this._subtitleInterval) {
      clearInterval(this._subtitleInterval);
      this._subtitleInterval = null;
    }
    this._stopStatusPolling();
    this._player = null;
    this._state = this._defaultState();
    this._listeners.clear();
  }
}

export const videoEngine = VideoEngine.getInstance();
