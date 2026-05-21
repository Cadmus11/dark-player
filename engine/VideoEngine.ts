import { Audio, AVPlaybackStatus, Video, ResizeMode, VideoFullscreenUpdate } from 'expo-av';
import type { FileItem, SubtitleEntry } from '../types';
import { findSubtitleFile, parseSRT, readTextFile } from '../services/FileService';

type VideoEngineListener = (state: VideoEngineState) => void;

export interface VideoEngineState {
  currentFile: FileItem | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  playbackSpeed: number;
  resizeMode: ResizeMode;
  subtitlesEnabled: boolean;
  subtitles: SubtitleEntry[];
  currentSubtitle: string;
  isFullscreen: boolean;
  isReady: boolean;
  error: string | null;
}

export class VideoEngine {
  private static instance: VideoEngine;
  private _videoRef: Video | null = null;
  private _state: VideoEngineState;
  private _listeners: Set<VideoEngineListener> = new Set();
  private _subtitleInterval: ReturnType<typeof setInterval> | null = null;

  static getInstance(): VideoEngine {
    if (!VideoEngine.instance) {
      VideoEngine.instance = new VideoEngine();
    }
    return VideoEngine.instance;
  }

  private constructor() {
    this._state = this._defaultState();
  }

  private _defaultState(): VideoEngineState {
    return {
      currentFile: null,
      isPlaying: false,
      position: 0,
      duration: 0,
      playbackSpeed: 1,
      resizeMode: ResizeMode.CONTAIN,
      subtitlesEnabled: true,
      subtitles: [],
      currentSubtitle: '',
      isFullscreen: false,
      isReady: false,
      error: null,
    };
  }

  private _notify() {
    this._listeners.forEach((cb) => cb({ ...this._state }));
  }

  subscribe(listener: VideoEngineListener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  getState(): Readonly<VideoEngineState> {
    return { ...this._state };
  }

  attachVideoRef(ref: Video | null) {
    this._videoRef = ref;
  }

  async loadFile(file: FileItem) {
    this._state.currentFile = file;
    this._state.position = 0;
    this._state.duration = 0;
    this._state.isReady = false;
    this._state.error = null;
    this._state.subtitles = [];
    this._state.currentSubtitle = '';
    this._notify();

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    await this._loadSubtitles(file);

    if (this._subtitleInterval) clearInterval(this._subtitleInterval);
    this._subtitleInterval = setInterval(() => {
      this._updateSubtitle();
    }, 100);
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

  onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      this._state.position = status.positionMillis || 0;
      this._state.duration = status.durationMillis || 0;
      this._state.isPlaying = status.isPlaying ?? false;
      this._state.isReady = true;
      this._state.error = null;
    } else if (status.error) {
      this._state.error = status.error;
      this._state.isReady = false;
    }
    this._notify();
  };

  async togglePlayback() {
    if (!this._videoRef) return;
    try {
      if (this._state.isPlaying) {
        await this._videoRef.pauseAsync();
      } else {
        await this._videoRef.playAsync();
      }
    } catch {}
  }

  async seekTo(percentage: number) {
    if (!this._videoRef || !this._state.duration) return;
    await this._videoRef.setPositionAsync(Math.round(percentage * this._state.duration));
  }

  async skip(seconds: number) {
    if (!this._videoRef || !this._state.duration) return;
    const newPos = this._state.position + seconds * 1000;
    await this._videoRef.setPositionAsync(
      Math.max(0, Math.min(newPos, this._state.duration)),
    );
  }

  async setRate(rate: number) {
    if (!this._videoRef) return;
    this._state.playbackSpeed = rate;
    await this._videoRef.setRateAsync(rate, true);
    this._notify();
  }

  setResizeMode(mode: ResizeMode) {
    this._state.resizeMode = mode;
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

  async cleanup() {
    if (this._subtitleInterval) {
      clearInterval(this._subtitleInterval);
      this._subtitleInterval = null;
    }
    try {
      await this._videoRef?.stopAsync();
    } catch {}
    this._videoRef = null;
    this._state = this._defaultState();
    this._listeners.clear();
  }
}

export const videoEngine = VideoEngine.getInstance();
