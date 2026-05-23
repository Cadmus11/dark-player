import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, type ReactNode } from 'react';
import type { FileItem, Category, Playlist, PlaylistData, SavedSearch, RecentlyPlayed } from '../types';
import { useMediaStore } from '../stores/mediaStore';
import { usePlaylistStore } from '../stores/playlistStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useVisibleAudio } from '../hooks/useVisibleAudio';
import { queueEngine } from '../engine/QueueEngine';
import { StorageService } from '../services/StorageService';
import { SearchService } from '../services/Search/SearchService';

interface FileContextType {
  permissionsGranted: boolean;
  loading: boolean;
  videos: FileItem[];
  audio: FileItem[];
  files: FileItem[];
  categories: Category[];
  recentFiles: FileItem[];
  searchHistory: SavedSearch[];
  recentlyPlayed: RecentlyPlayed[];
  playlists: Playlist[];
  isReady: boolean;
  favoriteUris: string[];

  requestPermissions: () => Promise<void>;
  refreshFiles: () => Promise<void>;
  createPlaylist: (name: string) => PlaylistData;
  addToPlaylist: (playlistId: string, file: FileItem) => void;
  removeFromPlaylist: (playlistId: string, fileUri: string) => void;
  removePlaylist: (playlistId: string) => void;
  recordRecentlyPlayed: (file: FileItem) => Promise<void>;
  saveSearch: (query: string) => Promise<void>;
  removeSearch: (id: string) => Promise<void>;
  clearSearchHistory: () => Promise<void>;
  toggleFavorite: (uri: string) => Promise<string[]>;
  isFavorite: (uri: string) => boolean;
}

const FileContext = createContext<FileContextType | undefined>(undefined);

export function FileProvider({ children }: { children: ReactNode }) {
  const mediaStore = useMediaStore();
  const playlistStore = usePlaylistStore();
  const settingsStore = useSettingsStore();
  const mediaVideos = useMediaStore((s) => s.videos);
  const mediaPermissionsGranted = useMediaStore((s) => s.permissionsGranted);
  const mediaLoading = useMediaStore((s) => s.loading);
  const visibleAudio = useVisibleAudio();

  const allFiles = useMemo(() => [...mediaVideos, ...visibleAudio], [mediaVideos, visibleAudio]);

  const [recentFiles, setRecentFiles] = useState<FileItem[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentlyPlayed[]>([]);
  const [searchHistory, setSearchHistory] = useState<SavedSearch[]>([]);
  const [favoriteUris, setFavoriteUris] = useState<string[]>([]);

  useEffect(() => {
    settingsStore.load();
    playlistStore.load();
    StorageService.getRecentFiles().then(setRecentFiles);
    StorageService.getRecentlyPlayed().then(setRecentlyPlayed);
    StorageService.getSearchHistory().then(setSearchHistory);
    StorageService.getFavorites().then(setFavoriteUris);
  }, []);

  const categories = useMemo<Category[]>(() => [
    { id: 'videos', name: 'Videos', icon: 'videos', type: 'video', count: mediaVideos.length, color: '#6c5ce7' },
    { id: 'music', name: 'Music', icon: 'music', type: 'audio', count: visibleAudio.length, color: '#00cec9' },
  ], [mediaVideos.length, visibleAudio.length]);

  const playlists = useMemo(() =>
    playlistStore.playlists.map((p: PlaylistData) => ({
      id: p.id,
      name: p.name,
      files: allFiles.filter((f) => p.songIds.includes(f.uri)),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      coverUri: p.artwork,
    })),
    [playlistStore.playlists, allFiles]
  );

  const requestPermissions = useCallback(async () => {
    await mediaStore.scanMedia();
    StorageService.getFavorites().then(setFavoriteUris);
  }, []);

  const refreshFiles = useCallback(async () => {
    await mediaStore.scanMedia();
  }, []);

  const createPlaylist = useCallback((name: string) => queueEngine.create(name), []);
  const addToPlaylist = useCallback((id: string, file: FileItem) => queueEngine.addSongs(id, [file]), []);
  const removeFromPlaylist = useCallback((id: string, uri: string) => queueEngine.removeSong(id, uri), []);
  const removePlaylist = useCallback((id: string) => queueEngine.delete(id), []);

  const recordRecentlyPlayed = useCallback(async (file: FileItem) => {
    await StorageService.addToRecentlyPlayed(file);
    setRecentlyPlayed(await StorageService.getRecentlyPlayed());
  }, []);

  const saveSearch = useCallback(async (query: string) => {
    SearchService.saveHistory(query);
    StorageService.saveSearch(query);
    setSearchHistory(SearchService.getHistory());
  }, []);

  const removeSearch = useCallback(async (id: string) => {
    SearchService.removeHistory(id);
    StorageService.removeSearch(id);
    setSearchHistory(SearchService.getHistory());
  }, []);

  const clearSearchHistory = useCallback(async () => {
    SearchService.clearHistory();
    StorageService.clearSearchHistory();
    setSearchHistory([]);
  }, []);

  const toggleFavorite = useCallback(async (uri: string) => {
    const updated = await StorageService.toggleFavorite(uri);
    setFavoriteUris(updated);
    return updated;
  }, []);

  const isFavorite = useCallback((uri: string) => favoriteUris.includes(uri), [favoriteUris]);

  const value = useMemo(() => ({
    permissionsGranted: mediaPermissionsGranted,
    loading: mediaLoading,
    videos: mediaVideos,
    audio: visibleAudio,
    files: allFiles,
    categories,
    recentFiles,
    playlists,
    searchHistory,
    recentlyPlayed,
    isReady: !mediaLoading,
    favoriteUris,
    requestPermissions,
    refreshFiles,
    createPlaylist,
    addToPlaylist,
    removeFromPlaylist,
    removePlaylist,
    recordRecentlyPlayed,
    saveSearch,
    removeSearch,
    clearSearchHistory,
    toggleFavorite,
    isFavorite,
  }), [
    mediaPermissionsGranted, mediaLoading, mediaVideos, visibleAudio, allFiles,
    categories, recentFiles, playlists, searchHistory, recentlyPlayed, favoriteUris,
    requestPermissions, refreshFiles, createPlaylist, addToPlaylist, removeFromPlaylist,
    removePlaylist, recordRecentlyPlayed, saveSearch, removeSearch, clearSearchHistory,
    toggleFavorite, isFavorite,
  ]);

  return <FileContext.Provider value={value}>{children}</FileContext.Provider>;
}

export function useFiles() {
  const context = useContext(FileContext);
  if (!context) throw new Error('useFiles must be used within a FileProvider');
  return context;
}
