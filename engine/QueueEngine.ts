import { MMKV } from 'react-native-mmkv';
import type { FileItem, PlaylistData, RepeatMode } from '../types';
import { eventBus, AppEvents } from '../services/EventBus';

const storage = new MMKV({ id: 'queue-engine' });
const PLAYLISTS_KEY = '@queue_playlists';
const AUDIO_QUEUE_KEY = '@queue_audio_queue';
const VIDEO_QUEUE_KEY = '@queue_video_queue';

type QueueListener = () => void;

interface QueueStore {
  queue: FileItem[];
  currentIndex: number;
  repeat: RepeatMode;
  shuffle: boolean;
  shuffledOrder: number[];
}

export class QueueEngine {
  private static instance: QueueEngine;
  private _listeners: Set<QueueListener> = new Set();
  private _audioQueue: QueueStore;
  private _videoQueue: QueueStore;

  static getInstance(): QueueEngine {
    if (!QueueEngine.instance) {
      QueueEngine.instance = new QueueEngine();
    }
    return QueueEngine.instance;
  }

  private constructor() {
    this._audioQueue = this._loadQueue(AUDIO_QUEUE_KEY);
    this._videoQueue = this._loadQueue(VIDEO_QUEUE_KEY);
  }

  subscribe(listener: QueueListener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private _notify() {
    this._listeners.forEach((cb) => cb());
    eventBus.emit(AppEvents.QUEUE_CHANGED);
  }

  // --- Audio Queue ---

  private _loadQueue(key: string): QueueStore {
    try {
      const data = storage.getString(key);
      if (data) return JSON.parse(data);
    } catch {}
    return { queue: [], currentIndex: -1, repeat: 'none', shuffle: false, shuffledOrder: [] };
  }

  private _saveAudioQueue() {
    storage.set(AUDIO_QUEUE_KEY, JSON.stringify(this._audioQueue));
  }

  private _saveVideoQueue() {
    storage.set(VIDEO_QUEUE_KEY, JSON.stringify(this._videoQueue));
  }

  getAudioState(): Readonly<QueueStore> {
    return { ...this._audioQueue };
  }

  getVideoState(): Readonly<QueueStore> {
    return { ...this._videoQueue };
  }

  setAudioQueue(queue: FileItem[], startIndex = 0) {
    this._audioQueue.queue = queue;
    this._audioQueue.currentIndex = startIndex;
    this._audioQueue.shuffledOrder = [];
    if (this._audioQueue.shuffle) this._generateShuffled('audio');
    this._saveAudioQueue();
    this._notify();
  }

  setVideoQueue(queue: FileItem[], startIndex = 0) {
    this._videoQueue.queue = queue;
    this._videoQueue.currentIndex = startIndex;
    this._videoQueue.shuffledOrder = [];
    if (this._videoQueue.shuffle) this._generateShuffled('video');
    this._saveVideoQueue();
    this._notify();
  }

  setAudioIndex(index: number) {
    this._audioQueue.currentIndex = index;
    this._saveAudioQueue();
    this._notify();
  }

  setVideoIndex(index: number) {
    this._videoQueue.currentIndex = index;
    this._saveVideoQueue();
    this._notify();
  }

  setRepeat(mode: RepeatMode, source: 'audio' | 'video') {
    if (source === 'audio') {
      this._audioQueue.repeat = mode;
      this._saveAudioQueue();
    } else {
      this._videoQueue.repeat = mode;
      this._saveVideoQueue();
    }
    this._notify();
  }

  cycleRepeat(source: 'audio' | 'video') {
    const modes: RepeatMode[] = ['none', 'all', 'one'];
    const q = source === 'audio' ? this._audioQueue : this._videoQueue;
    const idx = modes.indexOf(q.repeat);
    q.repeat = modes[(idx + 1) % modes.length];
    if (source === 'audio') this._saveAudioQueue();
    else this._saveVideoQueue();
    this._notify();
  }

  toggleShuffle(source: 'audio' | 'video') {
    const q = source === 'audio' ? this._audioQueue : this._videoQueue;
    q.shuffle = !q.shuffle;
    if (q.shuffle) {
      this._generateShuffled(source);
    } else {
      q.shuffledOrder = [];
    }
    if (source === 'audio') this._saveAudioQueue();
    else this._saveVideoQueue();
    this._notify();
  }

  private _generateShuffled(source: 'audio' | 'video') {
    const q = source === 'audio' ? this._audioQueue : this._videoQueue;
    q.shuffledOrder = q.queue.map((_, i) => i);
    for (let i = q.shuffledOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [q.shuffledOrder[i], q.shuffledOrder[j]] = [q.shuffledOrder[j], q.shuffledOrder[i]];
    }
  }

  getShuffledOrder(source: 'audio' | 'video'): number[] {
    const q = source === 'audio' ? this._audioQueue : this._videoQueue;
    if (q.shuffledOrder.length !== q.queue.length) {
      this._generateShuffled(source);
    }
    return [...q.shuffledOrder];
  }

  resolveNext(source: 'audio' | 'video'): number | null {
    const q = source === 'audio' ? this._audioQueue : this._videoQueue;
    if (q.queue.length === 0) return null;
    let next: number;
    if (q.shuffle) {
      const shuffled = this.getShuffledOrder(source);
      const currentShuffleIdx = shuffled.indexOf(q.currentIndex);
      const nextShuffleIdx = (currentShuffleIdx + 1) % shuffled.length;
      next = nextShuffleIdx === 0 && q.repeat !== 'all' ? -1 : shuffled[nextShuffleIdx];
    } else {
      next = q.currentIndex + 1;
      if (next >= q.queue.length) {
        next = q.repeat === 'all' ? 0 : -1;
      }
    }
    return next >= 0 && next < q.queue.length ? next : null;
  }

  resolvePrevious(source: 'audio' | 'video'): number | null {
    const q = source === 'audio' ? this._audioQueue : this._videoQueue;
    if (q.queue.length === 0) return null;
    let prev: number;
    if (q.shuffle) {
      const shuffled = this.getShuffledOrder(source);
      const currentShuffleIdx = shuffled.indexOf(q.currentIndex);
      prev = currentShuffleIdx > 0 ? shuffled[currentShuffleIdx - 1] : -1;
    } else {
      prev = q.currentIndex - 1;
      if (prev < 0) {
        prev = q.repeat === 'all' ? q.queue.length - 1 : -1;
      }
    }
    return prev >= 0 && prev < q.queue.length ? prev : null;
  }

  addToQueue(file: FileItem, source: 'audio' | 'video') {
    const q = source === 'audio' ? this._audioQueue : this._videoQueue;
    q.queue.push(file);
    q.shuffledOrder = [];
    if (q.shuffle) this._generateShuffled(source);
    if (source === 'audio') this._saveAudioQueue();
    else this._saveVideoQueue();
    this._notify();
  }

  removeFromQueue(index: number, source: 'audio' | 'video') {
    const q = source === 'audio' ? this._audioQueue : this._videoQueue;
    if (index < 0 || index >= q.queue.length) return;
    q.queue.splice(index, 1);
    if (index <= q.currentIndex) q.currentIndex = Math.max(0, q.currentIndex - 1);
    q.shuffledOrder = [];
    if (q.shuffle) this._generateShuffled(source);
    if (source === 'audio') this._saveAudioQueue();
    else this._saveVideoQueue();
    this._notify();
  }

  moveInQueue(fromIndex: number, toIndex: number, source: 'audio' | 'video') {
    const q = source === 'audio' ? this._audioQueue : this._videoQueue;
    if (
      fromIndex < 0 ||
      fromIndex >= q.queue.length ||
      toIndex < 0 ||
      toIndex >= q.queue.length ||
      fromIndex === toIndex
    )
      return;
    const [moved] = q.queue.splice(fromIndex, 1);
    q.queue.splice(toIndex, 0, moved);
    if (fromIndex === q.currentIndex) {
      q.currentIndex = toIndex;
    } else if (fromIndex < q.currentIndex && toIndex >= q.currentIndex) {
      q.currentIndex--;
    } else if (fromIndex > q.currentIndex && toIndex <= q.currentIndex) {
      q.currentIndex++;
    }
    q.shuffledOrder = [];
    if (q.shuffle) this._generateShuffled(source);
    if (source === 'audio') this._saveAudioQueue();
    else this._saveVideoQueue();
    this._notify();
  }

  clearQueue(source: 'audio' | 'video') {
    const q = source === 'audio' ? this._audioQueue : this._videoQueue;
    q.queue = [];
    q.currentIndex = -1;
    q.shuffledOrder = [];
    if (source === 'audio') this._saveAudioQueue();
    else this._saveVideoQueue();
    this._notify();
  }

  getQueueLength(source: 'audio' | 'video'): number {
    return (source === 'audio' ? this._audioQueue : this._videoQueue).queue.length;
  }

  // --- Playlists (existing API) ---

  getAll(): PlaylistData[] {
    try {
      const data = storage.getString(PLAYLISTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getById(id: string): PlaylistData | undefined {
    return this.getAll().find((p) => p.id === id);
  }

  private _generateId(): string {
    return 'pl_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
  }

  create(name: string, songs: FileItem[] = []): PlaylistData {
    const playlists = this.getAll();
    const now = Date.now();
    const pl: PlaylistData = {
      id: this._generateId(),
      name: name.trim(),
      createdAt: now,
      updatedAt: now,
      songIds: songs.map((s) => s.uri),
      totalDuration: songs.reduce((sum, s) => sum + (s.duration || 0), 0),
      totalTracks: songs.length,
      artwork: songs.find((s) => s.thumbnail)?.thumbnail,
    };
    playlists.push(pl);
    this._saveAll(playlists);
    return pl;
  }

  rename(id: string, newName: string): boolean {
    const playlists = this.getAll();
    const idx = playlists.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    playlists[idx].name = newName.trim();
    playlists[idx].updatedAt = Date.now();
    this._saveAll(playlists);
    return true;
  }

  delete(id: string): boolean {
    const playlists = this.getAll();
    const filtered = playlists.filter((p) => p.id !== id);
    if (filtered.length === playlists.length) return false;
    this._saveAll(filtered);
    return true;
  }

  addSongs(id: string, songs: FileItem[]): boolean {
    const playlists = this.getAll();
    const idx = playlists.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    const existingIds = new Set(playlists[idx].songIds);
    const newIds = songs.filter((s) => !existingIds.has(s.uri)).map((s) => s.uri);
    if (newIds.length === 0) return true;
    playlists[idx].songIds.push(...newIds);
    playlists[idx].totalDuration += songs.reduce((sum, s) => sum + (s.duration || 0), 0);
    playlists[idx].totalTracks = playlists[idx].songIds.length;
    playlists[idx].updatedAt = Date.now();
    if (songs.find((s) => s.thumbnail) && !playlists[idx].artwork) {
      playlists[idx].artwork = songs.find((s) => s.thumbnail)?.thumbnail;
    }
    this._saveAll(playlists);
    return true;
  }

  removeSong(id: string, songId: string): boolean {
    const playlists = this.getAll();
    const idx = playlists.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    playlists[idx].songIds = playlists[idx].songIds.filter((s) => s !== songId);
    playlists[idx].totalTracks = playlists[idx].songIds.length;
    playlists[idx].updatedAt = Date.now();
    this._saveAll(playlists);
    return true;
  }

  reorderSongs(id: string, songIds: string[]): boolean {
    const playlists = this.getAll();
    const idx = playlists.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    if (songIds.length !== playlists[idx].songIds.length) return false;
    playlists[idx].songIds = songIds;
    playlists[idx].updatedAt = Date.now();
    this._saveAll(playlists);
    return true;
  }

  updateArtwork(id: string, artworkUri: string): boolean {
    const playlists = this.getAll();
    const idx = playlists.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    playlists[idx].artwork = artworkUri;
    playlists[idx].updatedAt = Date.now();
    this._saveAll(playlists);
    return true;
  }

  private _saveAll(playlists: PlaylistData[]) {
    storage.set(PLAYLISTS_KEY, JSON.stringify(playlists));
    this._notify();
  }
}

export const queueEngine = QueueEngine.getInstance();
