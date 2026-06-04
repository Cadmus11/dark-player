import {
  AudioContext,
  AudioBuffer,
  BiquadFilterNode,
  AudioBufferSourceNode,
  GainNode,
  type BiquadFilterType,
} from 'react-native-audio-api';
import { MMKV } from 'react-native-mmkv';
import type { FileItem, EqualizerSettings, EQPreset, EQPlaybackState } from '../types';

const storage = new MMKV({ id: 'equalizer-engine' });
const EQ_SETTINGS_KEY = '@eq_settings';
const EQ_FREQUENCIES = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const EQ_LABELS = ['31', '62', '125', '250', '500', '1K', '2K', '4K', '8K', '16K'];

export const DEFAULT_PRESETS: EQPreset[] = [
  { name: 'Flat', gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: 'Normal', gains: [2, 1.5, 0.5, 0, 0, 0, 0, 0.5, 1.5, 2] },
  { name: 'Classical', gains: [0, 0, 0, 0, 0, 0, 0, 0, 2, 3] },
  { name: 'Dance', gains: [5, 4, 2, 0, -1, 0, 1, 3, 4, 5] },
  { name: 'Rock', gains: [4, 3, 2, 0, -1, -1, 0, 2, 3, 4] },
  { name: 'Jazz', gains: [3, 2, 1, 1, 0, 0, 1, 2, 2, 2] },
  { name: 'Pop', gains: [2, 2, 1, 0, -1, 0, 1, 2, 3, 3] },
  { name: 'Bass Boost', gains: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0] },
  { name: 'Treble Boost', gains: [0, 0, 0, 0, 0, 0, 0, 2, 4, 6] },
  { name: 'Vocal Boost', gains: [0, 0, 0, -1, 2, 3, 3, 1, 0, 0] },
];

const DEFAULT_SETTINGS: EqualizerSettings = {
  enabled: false,
  gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  preset: 'Flat',
};

export const EQ_BANDS: { frequency: number; label: string }[] = EQ_FREQUENCIES.map((f, i) => ({
  frequency: f,
  label: EQ_LABELS[i],
}));

type EQListener = (state: EQPlaybackState) => void;

export class EqualizerEngine {
  private static instance: EqualizerEngine;

  private _audioContext: AudioContext | null = null;
  private _filters: BiquadFilterNode[] = [];
  private _masterGain: GainNode | null = null;
  private _source: AudioBufferSourceNode | null = null;
  private _cachedBuffer: AudioBuffer | null = null;
  private _cachedFileUri: string | null = null;
  private _settings: EqualizerSettings;
  private _playbackState: EQPlaybackState;
  private _listeners: Set<EQListener> = new Set();
  private _positionInterval: ReturnType<typeof setInterval> | null = null;
  private _startTime: number = 0;
  private _pauseOffset: number = 0;
  private _lastKnownPosition: number = 0;
  private _contextReady: boolean = false;

  static getInstance(): EqualizerEngine {
    if (!EqualizerEngine.instance) {
      EqualizerEngine.instance = new EqualizerEngine();
    }
    return EqualizerEngine.instance;
  }

  private constructor() {
    this._settings = this._loadSettings();
    this._playbackState = {
      currentFile: null,
      isPlaying: false,
      position: 0,
      duration: 0,
    };
  }

  private _loadSettings(): EqualizerSettings {
    try {
      const data = storage.getString(EQ_SETTINGS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          gains: parsed.gains || [...DEFAULT_SETTINGS.gains],
        };
      }
    } catch (e) {
      console.warn('[EqualizerEngine]', e);
    }
    return { ...DEFAULT_SETTINGS, gains: [...DEFAULT_SETTINGS.gains] };
  }

  private _saveSettings() {
    storage.set(EQ_SETTINGS_KEY, JSON.stringify(this._settings));
  }

  getSettings(): EqualizerSettings {
    return { ...this._settings, gains: [...this._settings.gains] };
  }

  getBands() {
    return EQ_BANDS;
  }

  getPresets(): EQPreset[] {
    return DEFAULT_PRESETS.map((p) => ({ ...p, gains: [...p.gains] }));
  }

  getPlaybackState(): Readonly<EQPlaybackState> {
    return { ...this._playbackState };
  }

  private async _ensureContext(): Promise<AudioContext> {
    if (!this._audioContext) {
      this._audioContext = new AudioContext();
    }
    if (!this._contextReady) {
      if (this._audioContext.state === 'suspended') {
        await this._audioContext.resume();
      }
      this._contextReady = true;
    }
    return this._audioContext;
  }

  private async _buildFilterChain(): Promise<void> {
    const ctx = await this._ensureContext();

    this._filters.forEach((f) => {
      try {
        f.disconnect();
      } catch (e) {
        console.warn('[EqualizerEngine]', e);
      }
    });
    this._filters = [];

    if (!this._masterGain) {
      this._masterGain = new GainNode(ctx, { gain: this._settings.enabled ? 1 : 0 });
      this._masterGain.connect(ctx.destination);
    }

    for (let i = 0; i < EQ_FREQUENCIES.length; i++) {
      const type: BiquadFilterType =
        i === 0 ? 'lowshelf' : i === EQ_FREQUENCIES.length - 1 ? 'highshelf' : 'peaking';

      const filter = new BiquadFilterNode(ctx, {
        type,
        frequency: EQ_FREQUENCIES[i],
        Q: 1.0,
        gain: this._settings.gains[i],
      });
      this._filters.push(filter);
    }

    for (let i = 0; i < this._filters.length - 1; i++) {
      this._filters[i].connect(this._filters[i + 1]);
    }
    if (this._filters.length > 0) {
      this._filters[this._filters.length - 1].connect(this._masterGain!);
    }
  }

  setBandGain(index: number, gainDb: number) {
    if (index < 0 || index >= this._settings.gains.length) return;
    const clamped = Math.max(-12, Math.min(12, Math.round(gainDb * 10) / 10));
    this._settings.gains[index] = clamped;
    this._settings.preset = 'Custom';
    if (this._filters[index]) {
      this._filters[index].gain.value = clamped;
    }
    this._saveSettings();
  }

  getBandGain(index: number): number {
    return this._settings.gains[index] ?? 0;
  }

  getBandGains(): number[] {
    return [...this._settings.gains];
  }

  resetToFlat() {
    this._settings.gains = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this._settings.preset = 'Flat';
    this._applyGainsToFilters();
    this._saveSettings();
  }

  applyPreset(presetName: string) {
    const preset = DEFAULT_PRESETS.find((p) => p.name === presetName);
    if (!preset) return;
    this._settings.gains = [...preset.gains];
    this._settings.preset = presetName;
    this._applyGainsToFilters();
    this._saveSettings();
  }

  private _applyGainsToFilters() {
    for (let i = 0; i < this._filters.length && i < this._settings.gains.length; i++) {
      if (this._filters[i]) {
        this._filters[i].gain.value = this._settings.gains[i];
      }
    }
  }

  setEnabled(enabled: boolean) {
    this._settings.enabled = enabled;
    this._saveSettings();
    if (this._masterGain) {
      this._masterGain.gain.value = enabled ? 1 : 0;
    }
  }

  isEnabled(): boolean {
    return this._settings.enabled;
  }

  async play(file: FileItem): Promise<void> {
    try {
      await this._buildFilterChain();
      const ctx = await this._ensureContext();

      let buffer: AudioBuffer;
      if (this._cachedFileUri === file.uri && this._cachedBuffer) {
        buffer = this._cachedBuffer;
      } else {
        buffer = await ctx.decodeAudioData(file.uri);
        this._cachedBuffer = buffer;
        this._cachedFileUri = file.uri;
      }

      this._playbackState.duration = (buffer.duration || 0) * 1000;

      if (this._source) {
        try {
          this._source.stop();
          this._source.disconnect();
        } catch (e) {
          console.warn('[EqualizerEngine]', e);
        }
        this._source = null;
      }

      this._source = new AudioBufferSourceNode(ctx, { buffer, loop: false });
      this._source.connect(this._filters[0]);
      this._source.start(0, 0);

      this._startTime = ctx.currentTime;
      this._pauseOffset = 0;
      this._lastKnownPosition = 0;
      this._playbackState.currentFile = file;
      this._playbackState.isPlaying = true;
      this._playbackState.position = 0;
      this._notify();
      this._startPositionCheck();
    } catch (e) {
      console.warn('[EqualizerEngine]', e);
    }
  }

  pause() {
    if (!this._playbackState.isPlaying || !this._audioContext || !this._source) return;

    this._updatePosition();
    this._pauseOffset = this._lastKnownPosition;
    try {
      this._source.stop();
      this._source.disconnect();
    } catch (e) {
      console.warn('[EqualizerEngine]', e);
    }
    this._source = null;
    this._playbackState.isPlaying = false;
    this._stopPositionCheck();
    this._notify();
  }

  async resume() {
    if (this._playbackState.isPlaying || !this._playbackState.currentFile) return;

    try {
      const ctx = await this._ensureContext();

      let buffer: AudioBuffer;
      if (this._cachedFileUri === this._playbackState.currentFile.uri && this._cachedBuffer) {
        buffer = this._cachedBuffer;
      } else {
        buffer = await ctx.decodeAudioData(this._playbackState.currentFile.uri);
        this._cachedBuffer = buffer;
        this._cachedFileUri = this._playbackState.currentFile.uri;
      }

      if (this._source) {
        try {
          this._source.stop();
          this._source.disconnect();
        } catch (e) {
          console.warn('[EqualizerEngine]', e);
        }
        this._source = null;
      }

      this._source = new AudioBufferSourceNode(ctx, { buffer, loop: false });
      this._source.connect(this._filters[0]);

      const seekOffset = Math.max(0, this._pauseOffset / 1000);
      this._source.start(0, seekOffset);
      this._startTime = ctx.currentTime - seekOffset;
      this._playbackState.isPlaying = true;
      this._notify();
      this._startPositionCheck();
    } catch (e) {
      console.warn('[EqualizerEngine]', e);
    }
  }

  stop() {
    try {
      if (this._source) {
        this._source.stop();
        this._source.disconnect();
      }
    } catch (e) {
      console.warn('[EqualizerEngine]', e);
    }
    this._source = null;
    this._pauseOffset = 0;
    this._lastKnownPosition = 0;
    this._playbackState.currentFile = null;
    this._playbackState.isPlaying = false;
    this._playbackState.position = 0;
    this._playbackState.duration = 0;
    this._stopPositionCheck();
    this._notify();
  }

  async seekTo(millis: number) {
    if (!this._playbackState.currentFile) return;

    const wasPlaying = this._playbackState.isPlaying;
    const targetSec = Math.max(0, Math.min(millis / 1000, this._playbackState.duration / 1000));

    try {
      if (this._source) {
        try {
          this._source.stop();
          this._source.disconnect();
        } catch (e) {
          console.warn('[EqualizerEngine]', e);
        }
        this._source = null;
      }

      const ctx = await this._ensureContext();

      let buffer: AudioBuffer;
      if (this._cachedFileUri === this._playbackState.currentFile.uri && this._cachedBuffer) {
        buffer = this._cachedBuffer;
      } else {
        buffer = await ctx.decodeAudioData(this._playbackState.currentFile.uri);
        this._cachedBuffer = buffer;
        this._cachedFileUri = this._playbackState.currentFile.uri;
      }

      this._source = new AudioBufferSourceNode(ctx, { buffer, loop: false });
      this._source.connect(this._filters[0]);
      this._source.start(0, targetSec);

      this._startTime = ctx.currentTime - targetSec;
      this._pauseOffset = targetSec * 1000;
      this._lastKnownPosition = targetSec * 1000;
      this._playbackState.isPlaying = wasPlaying;
      this._playbackState.position = targetSec * 1000;

      if (wasPlaying) {
        this._startPositionCheck();
      }
      this._notify();
    } catch (e) {
      console.warn('[EqualizerEngine]', e);
    }
  }

  private _startPositionCheck() {
    this._stopPositionCheck();
    this._positionInterval = setInterval(() => {
      this._updatePosition();
    }, 250);
  }

  private _stopPositionCheck() {
    if (this._positionInterval) {
      clearInterval(this._positionInterval);
      this._positionInterval = null;
    }
  }

  private _updatePosition() {
    if (!this._playbackState.isPlaying || !this._audioContext) return;

    const elapsed = (this._audioContext.currentTime - this._startTime) * 1000;
    this._lastKnownPosition = Math.max(0, this._pauseOffset + elapsed);

    if (
      this._lastKnownPosition >= this._playbackState.duration &&
      this._playbackState.duration > 500
    ) {
      this._playbackState.isPlaying = false;
      this._playbackState.position = this._playbackState.duration;
      this._stopPositionCheck();
      this._notify();
      return;
    }

    this._playbackState.position = this._lastKnownPosition;
    this._notify();
  }

  isActive(): boolean {
    return this._source !== null || this._playbackState.isPlaying;
  }

  subscribe(listener: EQListener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private _notify() {
    this._listeners.forEach((cb) => cb({ ...this._playbackState }));
  }

  destroy() {
    this.stop();
    if (this._masterGain) {
      try {
        this._masterGain.disconnect();
      } catch (e) {
        console.warn('[EqualizerEngine]', e);
      }
      this._masterGain = null;
    }
    this._filters.forEach((f) => {
      try {
        f.disconnect();
      } catch (e) {
        console.warn('[EqualizerEngine]', e);
      }
    });
    this._filters = [];
    this._cachedBuffer = null;
    this._cachedFileUri = null;
    if (this._audioContext) {
      try {
        this._audioContext.close();
      } catch (e) {
        console.warn('[EqualizerEngine]', e);
      }
      this._audioContext = null;
      this._contextReady = false;
    }
  }
}

export const equalizerEngine = EqualizerEngine.getInstance();
