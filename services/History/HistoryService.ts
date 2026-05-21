import { MMKV } from 'react-native-mmkv';
import type { FileItem, HistoryEntry } from '../../types';

const storage = new MMKV({ id: 'play-history' });
const HISTORY_KEY = '@play_history';
const PLAY_SESSIONS_KEY = '@play_sessions';
const MAX_HISTORY = 200;

interface PlaySession {
  uri: string;
  startedAt: number;
  pausedAt: number | null;
  accumulatedMs: number;
}

export const HistoryService = {
  getAll(): HistoryEntry[] {
    try {
      const data = storage.getString(HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  record(file: FileItem, duration: number, source: 'music' | 'video' | 'audio') {
    const history = this.getAll();
    const entry: HistoryEntry = {
      file: { ...file },
      playedAt: Date.now(),
      playDuration: duration,
      source,
    };
    const filtered = history.filter((h) => h.file.uri !== file.uri);
    const updated = [entry, ...filtered].slice(0, MAX_HISTORY);
    storage.set(HISTORY_KEY, JSON.stringify(updated));
  },

  _sessions: new Map<string, PlaySession>(),

  startPlaySession(uri: string) {
    const existing = this._sessions.get(uri);
    if (existing && existing.pausedAt !== null) {
      existing.pausedAt = null;
      return;
    }
    this._sessions.set(uri, { uri, startedAt: Date.now(), pausedAt: null, accumulatedMs: existing?.accumulatedMs || 0 });
  },

  pausePlaySession(uri: string) {
    const session = this._sessions.get(uri);
    if (!session || session.pausedAt !== null) return;
    session.pausedAt = Date.now();
    session.accumulatedMs += Date.now() - session.startedAt;
  },

  resumePlaySession(uri: string) {
    const session = this._sessions.get(uri);
    if (!session) {
      this.startPlaySession(uri);
      return;
    }
    session.startedAt = Date.now();
    session.pausedAt = null;
  },

  endPlaySession(file: FileItem, source: 'music' | 'video' | 'audio') {
    const session = this._sessions.get(file.uri);
    if (!session) return;
    if (session.pausedAt === null) {
      session.accumulatedMs += Date.now() - session.startedAt;
    }
    const duration = Math.round(session.accumulatedMs);
    if (duration > 1000) {
      this.record(file, duration, source);
    }
    this._sessions.delete(file.uri);
  },

  getCumulativePlayTime(uri: string): number {
    const history = this.getAll();
    return history
      .filter((h) => h.file.uri === uri)
      .reduce((sum, h) => sum + h.playDuration, 0);
  },

  getRecentlyPlayed(limit = 20): HistoryEntry[] {
    return this.getAll().slice(0, limit);
  },

  getMostPlayed(limit = 20): { file: FileItem; count: number }[] {
    const history = this.getAll();
    const countMap = new Map<string, { file: FileItem; count: number }>();
    for (const entry of history) {
      const existing = countMap.get(entry.file.uri);
      if (existing) {
        existing.count++;
      } else {
        countMap.set(entry.file.uri, { file: entry.file, count: 1 });
      }
    }
    return Array.from(countMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },

  getContinueListening(): HistoryEntry[] {
    return this.getAll().filter((h) => h.source === 'music').slice(0, 10);
  },

  getContinueWatching(): HistoryEntry[] {
    return this.getAll().filter((h) => h.source === 'video').slice(0, 10);
  },

  clearHistory() {
    storage.set(HISTORY_KEY, JSON.stringify([]));
  },
};
