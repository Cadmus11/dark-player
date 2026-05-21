import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { FileItem, Category, DocCategory, Playlist, SavedSearch, RecentlyPlayed, HiddenFilesSettings, PlayerState, PlaylistData } from '../types';
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
  images: FileItem[];
  videos: FileItem[];
  audio: FileItem[];
  documents: FileItem[];
  pdfFiles: FileItem[];
  wordFiles: FileItem[];
  excelFiles: FileItem[];
  pptFiles: FileItem[];
  textFiles: FileItem[];
  epubFiles: FileItem[];
  otherDocs: FileItem[];
  recentFiles: FileItem[];
  recentlyPlayed: RecentlyPlayed[];
  playlists: Playlist[];
  docCategories: DocCategory[];
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

const DOC_CATEGORIES: DocCategory[] = [
  { id: 'pdf', name: 'PDF', icon: 'pdf', ext: ['pdf'], subType: 'pdf', count: 0, color: '#e74c3c' },
  { id: 'word', name: 'Word', icon: 'word', ext: ['doc', 'docx'], subType: 'word', count: 0, color: '#3498db' },
  { id: 'excel', name: 'Excel', icon: 'excel', ext: ['xls', 'xlsx', 'csv'], subType: 'excel', count: 0, color: '#27ae60' },
  { id: 'powerpoint', name: 'PowerPoint', icon: 'powerpoint', ext: ['ppt', 'pptx'], subType: 'powerpoint', count: 0, color: '#f39c12' },
  { id: 'text', name: 'Text', icon: 'text', ext: ['txt', 'rtf', 'md'], subType: 'text', count: 0, color: '#9b59b6' },
  { id: 'epub', name: 'EPUB', icon: 'epub', ext: ['epub'], subType: 'epub', count: 0, color: '#f39c12' },
  { id: 'other', name: 'Other', icon: 'other', ext: [], subType: 'other', count: 0, color: '#718096' },
];

export function FileProvider({ children }: { children: ReactNode }) {
  const mediaStore = useMediaStore();
  const playlistStore = usePlaylistStore();
  const settingsStore = useSettingsStore();
  const mediaImages = useMediaStore((s) => s.images);
  const mediaVideos = useMediaStore((s) => s.videos);
  const mediaAudio = useMediaStore((s) => s.audio);
  const mediaDocuments = useMediaStore((s) => s.documents);
  const mediaPermissionsGranted = useMediaStore((s) => s.permissionsGranted);
  const mediaLoading = useMediaStore((s) => s.loading);
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentlyPlayed[]>([]);
  const [recentFiles, setRecentFiles] = useState<FileItem[]>([]);
  const [searchHistory, setSearchHistory] = useState<SavedSearch[]>([]);
  const [favoriteUris, setFavoriteUris] = useState<string[]>([]);

  const visibleAudio = useMemo(() =>
    mediaStore.getFilteredAudio(settingsStore.hiddenFiles),
    [mediaAudio, settingsStore.hiddenFiles]
  );

  const allFiles = useMemo(() =>
    [...mediaImages, ...mediaVideos, ...visibleAudio, ...mediaDocuments],
    [mediaImages, mediaVideos, visibleAudio, mediaDocuments]
  );

  const favoriteFiles = useMemo(() =>
    allFiles.filter((f) => favoriteUris.includes(f.uri)),
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

  const categories = useMemo<Category[]>(() => [
    { id: 'images', name: 'Images', icon: 'images', type: 'image', count: mediaImages.length, color: '#e17055' },
    { id: 'videos', name: 'Videos', icon: 'videos', type: 'video', count: mediaVideos.length, color: '#6c5ce7' },
    { id: 'music', name: 'Music', icon: 'music', type: 'audio', count: visibleAudio.length, color: '#00cec9' },
    { id: 'documents', name: 'Documents', icon: 'documents', type: 'document', count: mediaDocuments.length, color: '#fdcb6e' },
  ], [mediaImages.length, mediaVideos.length, visibleAudio.length, mediaDocuments.length]);

  const docCategories = useMemo(() => DOC_CATEGORIES.map((cat) => ({
    ...cat,
    count: mediaDocuments.filter((d) => d.docSubType === cat.subType).length,
  })), [mediaDocuments]);

  const pdfFiles = useMemo(() => mediaDocuments.filter((d) => d.docSubType === 'pdf'), [mediaDocuments]);
  const wordFiles = useMemo(() => mediaDocuments.filter((d) => d.docSubType === 'word'), [mediaDocuments]);
  const excelFiles = useMemo(() => mediaDocuments.filter((d) => d.docSubType === 'excel'), [mediaDocuments]);
  const pptFiles = useMemo(() => mediaDocuments.filter((d) => d.docSubType === 'powerpoint'), [mediaDocuments]);
  const textFiles = useMemo(() => mediaDocuments.filter((d) => d.docSubType === 'text'), [mediaDocuments]);
  const epubFiles = useMemo(() => mediaDocuments.filter((d) => d.docSubType === 'epub'), [mediaDocuments]);
  const otherDocs = useMemo(() => mediaDocuments.filter((d) => !d.docSubType || d.docSubType === 'other'), [mediaDocuments]);

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

  const value = useMemo(() => ({
    permissionsGranted: mediaPermissionsGranted,
    loading: mediaLoading,
    files: allFiles,
    images: mediaImages,
    videos: mediaVideos,
    audio: visibleAudio,
    documents: mediaDocuments,
    pdfFiles,
    wordFiles,
    excelFiles,
    pptFiles,
    textFiles,
    epubFiles,
    otherDocs,
    recentFiles,
    recentlyPlayed,
    playlists,
    docCategories,
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

    requestPermissions: async () => {
      await mediaStore.scanMedia();
      await StorageService.getFavorites().then(setFavoriteUris);
    },
    refreshFiles: async () => {
      await mediaStore.scanMedia();
    },
    createPlaylist: async (name: string, coverUri?: string) => {
      const plData = queueEngine.create(name);
      return {
        id: plData.id,
        name: plData.name,
        coverUri,
        files: [],
        createdAt: plData.createdAt,
        updatedAt: plData.updatedAt,
      };
    },
    addToPlaylist: async (playlistId: string, file: FileItem) => {
      queueEngine.addSongs(playlistId, [file]);
    },
    removeFromPlaylist: async (playlistId: string, fileUri: string) => {
      queueEngine.removeSong(playlistId, fileUri);
    },
    removePlaylist: async (playlistId: string) => {
      queueEngine.delete(playlistId);
    },
    recordRecentlyPlayed: async (file: FileItem) => {
      await StorageService.addToRecentlyPlayed(file);
      const updated = await StorageService.getRecentlyPlayed();
      setRecentlyPlayed(updated);
    },
    saveSearch: async (query: string) => {
      SearchService.saveHistory(query);
      await StorageService.saveSearch(query);
      setSearchHistory(SearchService.getHistory());
    },
    removeSearch: async (id: string) => {
      SearchService.removeHistory(id);
      await StorageService.removeSearch(id);
      setSearchHistory(SearchService.getHistory());
    },
    clearSearchHistory: async () => {
      SearchService.clearHistory();
      await StorageService.clearSearchHistory();
      setSearchHistory([]);
    },
    setMusicPlayer: (state: Partial<PlayerState>) => {},
    addToQueue: (file: FileItem) => {
      const { audioEngine } = require('../engine/AudioEngine');
      const q = audioEngine.getState().queue;
      audioEngine.setQueue([...q, file], audioEngine.getState().currentIndex);
    },
    toggleFavorite: async (uri: string) => {
      const updated = await StorageService.toggleFavorite(uri);
      setFavoriteUris(updated);
      return updated;
    },
    isFavorite: (uri: string) => favoriteUris.includes(uri),
    favoriteUris,
    favoriteFiles,
  }), [mediaPermissionsGranted, mediaLoading, docCategories, categories, playlists, allFiles, recentlyPlayed, recentFiles, searchHistory, favoriteUris, favoriteFiles, mediaImages, mediaVideos, visibleAudio, mediaDocuments]);

  return (
    <FileContext.Provider value={value}>
      {children}
    </FileContext.Provider>
  );
}

export function useFiles() {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error('useFiles must be used within a FileProvider');
  }
  return context;
}
