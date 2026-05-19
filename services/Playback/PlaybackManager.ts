import TrackPlayer from 'react-native-track-player';
import { setupTrackPlayer } from '../TrackPlayerSetup';
import type { FileItem, PlaybackSource } from '../../types';

type PlaybackObserver = (state: { source: PlaybackSource; file: FileItem | null; isPlaying: boolean }) => void;

class PlaybackManager {
  private static instance: PlaybackManager;
  private _currentSource: PlaybackSource = 'none';
  private _currentFile: FileItem | null = null;
  private _isPlaying = false;
  private _observers: Set<PlaybackObserver> = new Set();
  private _videoActive = false;
  private _musicWasPlayingBeforeVideo = false;

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

  async playMusic(file: FileItem, queue?: FileItem[], startIndex?: number) {
    await setupTrackPlayer();
    if (this._videoActive) {
      this._videoActive = false;
    }
    if (this._currentSource === 'music' && this._isPlaying) {
      await TrackPlayer.stop();
    }
    this._currentSource = 'music';
    this._currentFile = file;
    if (queue && startIndex !== undefined) {
      await TrackPlayer.reset();
      const tracks = queue.map((f, i) => ({
        id: f.uri,
        url: f.uri,
        title: f.name,
        artist: f.artist || 'Unknown',
        album: f.album || '',
        artwork: f.thumbnail || undefined,
        duration: f.duration ? f.duration / 1000 : undefined,
      }));
      await TrackPlayer.add(tracks);
      await TrackPlayer.skip(startIndex);
    } else {
      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: file.uri,
        url: file.uri,
        title: file.name,
        artist: file.artist || 'Unknown',
        album: file.album || '',
        artwork: file.thumbnail || undefined,
        duration: file.duration ? file.duration / 1000 : undefined,
      });
    }
    await TrackPlayer.play();
    this._isPlaying = true;
    this.notify();
  }

  async pauseMusic() {
    if (this._currentSource === 'music') {
      await TrackPlayer.pause();
      this._isPlaying = false;
      this.notify();
    }
  }

  async resumeMusic() {
    if (this._currentSource === 'music') {
      await TrackPlayer.play();
      this._isPlaying = true;
      this.notify();
    }
  }

  async stopMusic() {
    if (this._currentSource === 'music') {
      await TrackPlayer.stop();
      await TrackPlayer.reset();
      this._isPlaying = false;
      this._currentFile = null;
      this._currentSource = 'none';
      this.notify();
    }
  }

  onVideoOpen() {
    this._musicWasPlayingBeforeVideo = this._isPlaying && this._currentSource === 'music';
    if (this._musicWasPlayingBeforeVideo) {
      this.pauseMusic();
    }
    this._videoActive = true;
  }

  onVideoClose() {
    this._videoActive = false;
    if (this._musicWasPlayingBeforeVideo) {
      this.resumeMusic();
      this._musicWasPlayingBeforeVideo = false;
    }
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
}

export const playbackManager = PlaybackManager.getInstance();
