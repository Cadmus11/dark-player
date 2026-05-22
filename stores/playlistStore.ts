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

export const usePlaylistStore = create<PlaylistStoreState>((set) => ({
  playlists: [],
  loading: false,

  load: () => {
    set({ loading: true });
    set({ playlists: queueEngine.getAll(), loading: false });
  },

  create: (name, songs = []) => {
    const pl = queueEngine.create(name, songs);
    set({ playlists: queueEngine.getAll() });
    return pl;
  },

  rename: (id, name) => {
    const result = queueEngine.rename(id, name);
    if (result) set({ playlists: queueEngine.getAll() });
    return result;
  },

  delete: (id) => {
    const result = queueEngine.delete(id);
    if (result) set({ playlists: queueEngine.getAll() });
    return result;
  },

  addSongs: (id, songs) => {
    const result = queueEngine.addSongs(id, songs);
    if (result) set({ playlists: queueEngine.getAll() });
    return result;
  },

  removeSong: (id, songId) => {
    const result = queueEngine.removeSong(id, songId);
    if (result) set({ playlists: queueEngine.getAll() });
    return result;
  },

  reorderSongs: (id, songIds) => {
    const result = queueEngine.reorderSongs(id, songIds);
    if (result) set({ playlists: queueEngine.getAll() });
    return result;
  },
}));

queueEngine.subscribe(() => {
  const pl = queueEngine.getAll();
  const current = usePlaylistStore.getState().playlists;
  if (JSON.stringify(pl) === JSON.stringify(current)) return;
  usePlaylistStore.setState({ playlists: pl });
});
