import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type {
  FileItem,
  Category,
  Playlist,
  SavedSearch,
  RecentlyPlayed,
  HiddenFilesSettings,
  PlayerState,
  PlaylistData,
} from '../types';
import { useMediaStore } from '../stores/mediaStore';
import { usePlaylistStore } from '../stores/playlistStore';
import { useSettingsStore } from '../stores/settingsStore';
import { fileEngine } from '../engine/FileEngine';
import { queueEngine } from '../engine/QueueEngine';
import { StorageService } from '../services/StorageService';
import { SearchService } from '../services/Search/SearchService';

interface FileContextType {
  permissionsGranted: boolean;
  loading: boolean;
  files: FileItem[];
  videos: FileItem[];
  audio: FileItem[];
  recentFiles: FileItem[];
  recentlyPlayed: RecentlyPlayed[];
  playlists: Playlist[];
  searchHistory: SavedSearch[];
  categories: Category[];
  isReady: boolean;
  musicPlayer: PlayerState;

  requestPermissions: () => Promise<void>;
  refreshFiles: () => Promise<void>;
  createPlaylist: (name: string, coverUri?: string) => Promise<Playlist>;
  addToPlaylist: (playlistId: string, file: FileItem) => Promise<void>;
  removeFromPlaylist: (playlistId: string, fileUri: string) => Promise<void>;
  removePlaylist: (playlistId: string) => Promise<void>;
  recordRecentlyPlayed: (file: FileItem) => Promise<void>;
  saveSearch: (query: string) => Promise<void>;
  removeSearch: (id: string) => Promise<void>;
  clearSearchHistory: () => Promise<void>;
  setMusicPlayer: (state: Partial<PlayerState>) => void;
  addToQueue: (file: FileItem) => void;
  toggleFavorite: (uri: string) => Promise<string[]>;
  isFavorite: (uri: string) => boolean;
  favoriteUris: string[];
  favoriteFiles: FileItem[];
}

const FileContext = createContext<FileContextType | undefined>(undefined);

export function FileProvider({ children }: { children: ReactNode }) {
  const mediaStore = useMediaStore();
  const playlistStore = usePlaylistStore();
  const settingsStore = useSettingsStore();
  const mediaVideos = useMediaStore((s) => s.videos);
  const mediaAudio = useMediaStore((s) => s.audio);
  const mediaPermissionsGranted = useMediaStore((s) => s.permissionsGranted);
  const mediaLoading = useMediaStore((s) => s.loading);
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentlyPlayed[]>([]);
  const [recentFiles, setRecentFiles] = useState<FileItem[]>([]);
  const [searchHistory, setSearchHistory] = useState<SavedSearch[]>([]);
  const [favoriteUris, setFavoriteUris] = useState<string[]>([]);

  const visibleAudio = useMemo(
    () => mediaStore.getFilteredAudio(settingsStore.hiddenFiles),
    [mediaAudio, settingsStore.hiddenFiles]
  );

  const allFiles = useMemo(() => [...mediaVideos, ...visibleAudio], [mediaVideos, visibleAudio]);

  const favoriteFiles = useMemo(
    () => allFiles.filter((f) => favoriteUris.includes(f.uri)),
    [allFiles, favoriteUris]
  );

  useEffect(() => {
    settingsStore.load();
    playlistStore.load();

    if (fileEngine.hasCache()) {
      mediaStore.loadCache();
    } else {
      mediaStore.scanMedia();
    }

    StorageService.getRecentlyPlayed().then(setRecentlyPlayed);
    StorageService.getRecentFiles().then(setRecentFiles);
    StorageService.getSearchHistory().then(setSearchHistory);
    StorageService.getFavorites().then(setFavoriteUris);
  }, []);

  const categories = useMemo<Category[]>(
    () => [
      {
        id: 'videos',
        name: 'Videos',
        icon: 'videos',
        type: 'video',
        count: mediaVideos.length,
        color: '#6c5ce7',
      },
      {
        id: 'music',
        name: 'Music',
        icon: 'music',
        type: 'audio',
        count: visibleAudio.length,
        color: '#00cec9',
      },
    ],
    [mediaVideos.length, visibleAudio.length]
  );

  const playlists = useMemo(
    () =>
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
    await StorageService.getFavorites().then(setFavoriteUris);
  }, []);

  const refreshFiles = useCallback(async () => {
    await mediaStore.scanMedia();
  }, []);

  const createPlaylist = useCallback(async (name: string, coverUri?: string) => {
    const plData = queueEngine.create(name);
    return {
      id: plData.id,
      name: plData.name,
      coverUri,
      files: [],
      createdAt: plData.createdAt,
      updatedAt: plData.updatedAt,
    };
  }, []);

  const addToPlaylist = useCallback(async (playlistId: string, file: FileItem) => {
    queueEngine.addSongs(playlistId, [file]);
  }, []);

  const removeFromPlaylist = useCallback(async (playlistId: string, fileUri: string) => {
    queueEngine.removeSong(playlistId, fileUri);
  }, []);

  const removePlaylist = useCallback(async (playlistId: string) => {
    queueEngine.delete(playlistId);
  }, []);

  const recordRecentlyPlayed = useCallback(async (file: FileItem) => {
    await StorageService.addToRecentlyPlayed(file);
    const updated = await StorageService.getRecentlyPlayed();
    setRecentlyPlayed(updated);
  }, []);

  const saveSearch = useCallback(async (query: string) => {
    SearchService.saveHistory(query);
    await StorageService.saveSearch(query);
    setSearchHistory(SearchService.getHistory());
  }, []);

  const removeSearch = useCallback(async (id: string) => {
    SearchService.removeHistory(id);
    await StorageService.removeSearch(id);
    setSearchHistory(SearchService.getHistory());
  }, []);

  const clearSearchHistory = useCallback(async () => {
    SearchService.clearHistory();
    await StorageService.clearSearchHistory();
    setSearchHistory([]);
  }, []);

  const toggleFavorite = useCallback(async (uri: string) => {
    const updated = await StorageService.toggleFavorite(uri);
    setFavoriteUris(updated);
    return updated;
  }, []);

  const setMusicPlayer = useCallback((state: Partial<PlayerState>) => {}, []);

  const addToQueue = useCallback((file: FileItem) => {
    const { audioEngine } = require('../engine/AudioEngine');
    const q = audioEngine.getState().queue;
    audioEngine.setQueue([...q, file], audioEngine.getState().currentIndex);
  }, []);

  const isFavorite = useCallback((uri: string) => favoriteUris.includes(uri), [favoriteUris]);

  const value = useMemo(
    () => ({
      permissionsGranted: mediaPermissionsGranted,
      loading: mediaLoading,
      files: allFiles,
      videos: mediaVideos,
      audio: visibleAudio,
      recentFiles,
      recentlyPlayed,
      playlists,
      searchHistory,
      categories,
      isReady: !mediaLoading,
      musicPlayer: {
        currentFile: null,
        isPlaying: false,
        position: 0,
        duration: 0,
        queue: [],
        currentIndex: -1,
        shuffle: false,
        repeat: 'none' as const,
        audioOnly: false,
        showLyrics: false,
        playbackSpeed: 1,
        equalizer: {},
      },
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
      setMusicPlayer,
      addToQueue,
      toggleFavorite,
      isFavorite,
      favoriteUris,
      favoriteFiles,
    }),
    [
      mediaPermissionsGranted,
      mediaLoading,
      categories,
      playlists,
      allFiles,
      recentlyPlayed,
      recentFiles,
      searchHistory,
      favoriteUris,
      favoriteFiles,
      mediaVideos,
      visibleAudio,
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
      setMusicPlayer,
      addToQueue,
      toggleFavorite,
      isFavorite,
    ]
  );

  return <FileContext.Provider value={value}>{children}</FileContext.Provider>;
}

export function useFiles() {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error('useFiles must be used within a FileProvider');
  }
  return context;
}
