import { MMKV } from 'react-native-mmkv';
import type { PlaylistData, FileItem } from '../../types';

const storage = new MMKV({ id: 'playlists' });
const CACHE_KEY = '@playlists_data';

function generateId(): string {
  return 'pl_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
}

export const PlaylistService = {
  getAll(): PlaylistData[] {
    try {
      const data = storage.getString(CACHE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getById(id: string): PlaylistData | undefined {
    return this.getAll().find((p) => p.id === id);
  },

  create(name: string, songs: FileItem[] = []): PlaylistData {
    const playlists = this.getAll();
    const now = Date.now();
    const newPlaylist: PlaylistData = {
      id: generateId(),
      name: name.trim(),
      createdAt: now,
      updatedAt: now,
      songIds: songs.map((s) => s.uri),
      totalDuration: songs.reduce((sum, s) => sum + (s.duration || 0), 0),
      totalTracks: songs.length,
      artwork: songs.find((s) => s.thumbnail)?.thumbnail,
    };
    playlists.push(newPlaylist);
    this._saveAll(playlists);
    return newPlaylist;
  },

  rename(id: string, newName: string): boolean {
    const playlists = this.getAll();
    const idx = playlists.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    playlists[idx].name = newName.trim();
    playlists[idx].updatedAt = Date.now();
    this._saveAll(playlists);
    return true;
  },

  delete(id: string): boolean {
    const playlists = this.getAll();
    const filtered = playlists.filter((p) => p.id !== id);
    if (filtered.length === playlists.length) return false;
    this._saveAll(filtered);
    return true;
  },

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
  },

  removeSong(id: string, songId: string): boolean {
    const playlists = this.getAll();
    const idx = playlists.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    playlists[idx].songIds = playlists[idx].songIds.filter((s) => s !== songId);
    playlists[idx].totalTracks = playlists[idx].songIds.length;
    playlists[idx].updatedAt = Date.now();
    this._saveAll(playlists);
    return true;
  },

  reorderSongs(id: string, songIds: string[]): boolean {
    const playlists = this.getAll();
    const idx = playlists.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    if (songIds.length !== playlists[idx].songIds.length) return false;
    playlists[idx].songIds = songIds;
    playlists[idx].updatedAt = Date.now();
    this._saveAll(playlists);
    return true;
  },

  updateArtwork(id: string, artworkUri: string): boolean {
    const playlists = this.getAll();
    const idx = playlists.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    playlists[idx].artwork = artworkUri;
    playlists[idx].updatedAt = Date.now();
    this._saveAll(playlists);
    return true;
  },

  _saveAll(playlists: PlaylistData[]) {
    storage.set(CACHE_KEY, JSON.stringify(playlists));
  },
};
