import { MMKV } from 'react-native-mmkv';
import { getInfoAsync, readAsStringAsync } from 'expo-file-system/legacy';
import type { LyricsData } from '../../types';

const storage = new MMKV({ id: 'lyrics-cache' });
const CACHE_KEY_PREFIX = '@lyrics_';

function parseLRC(lrcContent: string): { time: number; text: string }[] {
  const lines = lrcContent.split('\n');
  const synced: { time: number; text: string }[] = [];
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  for (const line of lines) {
    const match = regex.exec(line);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const millis = parseInt(match[3].padEnd(3, '0'));
      const time = minutes * 60000 + seconds * 1000 + millis;
      const text = line.replace(regex, '').trim();
      if (text) synced.push({ time, text });
    }
  }
  return synced.sort((a, b) => a.time - b.time);
}

export const LyricsService = {
  async fetchLyrics(title: string, artist: string): Promise<LyricsData> {
    const songId = `${artist}|${title}`;
    const cached = this.getCached(songId);
    if (cached) return cached;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch(
        `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      if (resp.ok) {
        const data = await resp.json();
        const lyricsData: LyricsData = {
          songId,
          title,
          artist,
          lyrics: data.plainLyrics || data.syncedLyrics || '',
          syncedLyrics: data.syncedLyrics ? parseLRC(data.syncedLyrics) : [],
          source: 'api',
          cachedAt: Date.now(),
        };
        this.cache(lyricsData);
        return lyricsData;
      }
    } catch (e) { console.warn('[LyricsService]', e); }

    return {
      songId,
      title,
      artist,
      lyrics: '',
      syncedLyrics: [],
      source: 'none',
      cachedAt: Date.now(),
    };
  },

  async loadLocalLrc(filePath: string): Promise<LyricsData | null> {
    try {
      const lrcPath = filePath.replace(/\.[^.]+$/, '.lrc');
      const info = await getInfoAsync(lrcPath);
      if (info.exists) {
        const content = await readAsStringAsync(lrcPath, { encoding: 'utf8' });
        const synced = parseLRC(content);
        const plainText = synced.map((s) => s.text).join('\n');
        const songId = 'lrc_' + filePath;
        const lyricsData: LyricsData = {
          songId,
          title:
            filePath
              .split('/')
              .pop()
              ?.replace(/\.[^.]+$/, '') || '',
          artist: '',
          lyrics: plainText,
          syncedLyrics: synced,
          source: 'lrc',
          cachedAt: Date.now(),
        };
        this.cache(lyricsData);
        return lyricsData;
      }
    } catch (e) { console.warn('[LyricsService]', e); }
    return null;
  },

  cache(lyrics: LyricsData) {
    storage.set(CACHE_KEY_PREFIX + lyrics.songId, JSON.stringify(lyrics));
  },

  getCached(songId: string): LyricsData | null {
    try {
      const data = storage.getString(CACHE_KEY_PREFIX + songId);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  clearCache() {
    const keys = storage.getAllKeys();
    keys.filter((k) => k.startsWith(CACHE_KEY_PREFIX)).forEach((k) => storage.delete(k));
  },
};
