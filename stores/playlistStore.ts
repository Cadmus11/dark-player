import { create } from 'zustand';
import type { PlaylistData, FileItem } from '../types';
import { PlaylistService } from '../services/Playlist/PlaylistService';

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

export const usePlaylistStore = create<PlaylistStoreState>((set, get) => ({
  playlists: [],
  loading: false,

  load: () => {
    set({ loading: true });
    set({ playlists: PlaylistService.getAll(), loading: false });
  },

  create: (name, songs = []) => {
    const pl = PlaylistService.create(name, songs);
    set({ playlists: PlaylistService.getAll() });
    return pl;
  },

  rename: (id, name) => {
    const result = PlaylistService.rename(id, name);
    if (result) set({ playlists: PlaylistService.getAll() });
    return result;
  },

  delete: (id) => {
    const result = PlaylistService.delete(id);
    if (result) set({ playlists: PlaylistService.getAll() });
    return result;
  },

  addSongs: (id, songs) => {
    const result = PlaylistService.addSongs(id, songs);
    if (result) set({ playlists: PlaylistService.getAll() });
    return result;
  },

  removeSong: (id, songId) => {
    const result = PlaylistService.removeSong(id, songId);
    if (result) set({ playlists: PlaylistService.getAll() });
    return result;
  },

  reorderSongs: (id, songIds) => {
    const result = PlaylistService.reorderSongs(id, songIds);
    if (result) set({ playlists: PlaylistService.getAll() });
    return result;
  },
}));
