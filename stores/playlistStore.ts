import { create } from 'zustand';
import type { PlaylistData, FileItem } from '../types';
import { queueEngine } from '../engine/QueueEngine';

interface PlaylistStoreState {
  playlists: PlaylistData[];
  loading: boolean;

  load: () => void;
  create: (name: string, songs?: FileItem[]) => PlaylistData;
  rename: (id: string, name: string) => boolean;
  delete: (id: string) => boolean;
  addSongs: (id: string, songs: FileItem[]) => boolean;
  removeSong: (id: string, songId: string) => boolean;
  reorderSongs: (id: string, songIds: string[]) => boolean;
}

let _cachedPlaylistHash = '';

function getPlaylistHash(pl: PlaylistData[]): string {
  let h = 0;
  for (let i = 0; i < pl.length; i++) {
    h = ((h << 5) - h + pl[i].id.length + pl[i].songIds.length) | 0;
  }
  return h.toString(36);
}

export const usePlaylistStore = create<PlaylistStoreState>((set) => ({
  playlists: [],
  loading: false,

  load: () => {
    set({ loading: true });
    const pl = queueEngine.getAll();
    _cachedPlaylistHash = getPlaylistHash(pl);
    set({ playlists: pl, loading: false });
  },

  create: (name, songs = []) => {
    const pl = queueEngine.create(name, songs);
    const all = queueEngine.getAll();
    _cachedPlaylistHash = getPlaylistHash(all);
    set({ playlists: all });
    return pl;
  },

  rename: (id, name) => {
    const result = queueEngine.rename(id, name);
    if (result) {
      const all = queueEngine.getAll();
      _cachedPlaylistHash = getPlaylistHash(all);
      set({ playlists: all });
    }
    return result;
  },

  delete: (id) => {
    const result = queueEngine.delete(id);
    if (result) {
      const all = queueEngine.getAll();
      _cachedPlaylistHash = getPlaylistHash(all);
      set({ playlists: all });
    }
    return result;
  },

  addSongs: (id, songs) => {
    const result = queueEngine.addSongs(id, songs);
    if (result) {
      const all = queueEngine.getAll();
      _cachedPlaylistHash = getPlaylistHash(all);
      set({ playlists: all });
    }
    return result;
  },

  removeSong: (id, songId) => {
    const result = queueEngine.removeSong(id, songId);
    if (result) {
      const all = queueEngine.getAll();
      _cachedPlaylistHash = getPlaylistHash(all);
      set({ playlists: all });
    }
    return result;
  },

  reorderSongs: (id, songIds) => {
    const result = queueEngine.reorderSongs(id, songIds);
    if (result) {
      const all = queueEngine.getAll();
      _cachedPlaylistHash = getPlaylistHash(all);
      set({ playlists: all });
    }
    return result;
  },
}));

queueEngine.subscribe(() => {
  const pl = queueEngine.getAll();
  const h = getPlaylistHash(pl);
  if (h === _cachedPlaylistHash) return;
  _cachedPlaylistHash = h;
  usePlaylistStore.setState({ playlists: pl });
});
