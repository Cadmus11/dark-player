import React, { createContext, useContext, useState, useEffect, useMemo, type ReactNode, useCallback } from 'react';
import type { FileItem, Category, DocCategory, PlayerState, Playlist, SavedSearch, RecentlyPlayed, LayoutMode } from '../types';
import { getMediaFiles, scanDocuments, requestPermissions } from '../services/FileService';
import {
  getRecentFiles,
  addToRecentFiles,
  getRecentlyPlayed,
  addToRecentlyPlayed,
  getPlaylists,
  savePlaylists,
  createPlaylist as createPlaylistStorage,
  deletePlaylist as deletePlaylistStorage,
  getSearchHistory,
  saveSearch as saveSearchStorage,
  removeSearch as removeSearchStorage,
  clearSearchHistory as clearSearchHistoryStorage,
  getPermissionsGranted as getPermissionsGrantedStorage,
  setPermissionsGranted as setPermissionsGrantedStorage,
} from '../services/StorageService';

interface FileContextType {
  permissionsGranted: boolean;
  loading: boolean;
  files: FileItem[];
  images: FileItem[];
  videos: FileItem[];
  audio: FileItem[];
  audioWithVideos: FileItem[];
  documents: FileItem[];
  folders: FileItem[];
  pdfFiles: FileItem[];
  wordFiles: FileItem[];
  excelFiles: FileItem[];
  pptFiles: FileItem[];
  textFiles: FileItem[];
  epubFiles: FileItem[];
  otherDocs: FileItem[];
  recentFiles: FileItem[];
  recentlyPlayed: RecentlyPlayed[];
  currentPath: string;
  musicPlayer: PlayerState;
  playlists: Playlist[];
  docCategories: DocCategory[];
  searchHistory: SavedSearch[];
  requestPermissions: () => Promise<void>;
  refreshFiles: () => Promise<void>;
  setCurrentPath: (path: string) => void;
  setMusicPlayer: (state: Partial<PlayerState>) => void;
  addToQueue: (file: FileItem) => void;
  createPlaylist: (name: string, coverUri?: string) => Promise<Playlist>;
  addToPlaylist: (playlistId: string, file: FileItem) => Promise<void>;
  removeFromPlaylist: (playlistId: string, fileUri: string) => Promise<void>;
  removePlaylist: (playlistId: string) => Promise<void>;
  setPlaylistCover: (playlistId: string, coverUri: string) => Promise<void>;
  recordRecentlyPlayed: (file: FileItem) => Promise<void>;
  saveSearch: (query: string) => Promise<void>;
  removeSearch: (id: string) => Promise<void>;
  clearSearchHistory: () => Promise<void>;
  categories: Category[];
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

const DEFAULT_PLAYER: PlayerState = {
  currentFile: null,
  isPlaying: false,
  position: 0,
  duration: 0,
  queue: [],
  currentIndex: -1,
  shuffle: false,
  repeat: 'none',
  audioOnly: false,
  showLyrics: false,
  playbackSpeed: 1,
  equalizer: {},
};

export function FileProvider({ children }: { children: ReactNode }) {
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [images, setImages] = useState<FileItem[]>([]);
  const [videos, setVideos] = useState<FileItem[]>([]);
  const [audio, setAudio] = useState<FileItem[]>([]);
  const [documents, setDocuments] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FileItem[]>([]);
  const [pdfFiles, setPdfFiles] = useState<FileItem[]>([]);
  const [wordFiles, setWordFiles] = useState<FileItem[]>([]);
  const [excelFiles, setExcelFiles] = useState<FileItem[]>([]);
  const [pptFiles, setPptFiles] = useState<FileItem[]>([]);
  const [textFiles, setTextFiles] = useState<FileItem[]>([]);
  const [epubFiles, setEpubFiles] = useState<FileItem[]>([]);
  const [otherDocs, setOtherDocs] = useState<FileItem[]>([]);
  const [recentFiles, setRecentFiles] = useState<FileItem[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentlyPlayed[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [musicPlayer, setMusicPlayerState] = useState<PlayerState>(DEFAULT_PLAYER);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [searchHistory, setSearchHistory] = useState<SavedSearch[]>([]);

  useEffect(() => {
    loadPersistedData();
  }, []);

  async function loadPersistedData() {
    const [recent, played, pls, searches, permGranted] = await Promise.all([
      getRecentFiles(),
      getRecentlyPlayed(),
      getPlaylists(),
      getSearchHistory(),
      getPermissionsGrantedStorage(),
    ]);
    setRecentFiles(recent);
    setRecentlyPlayed(played);
    setPlaylists(pls);
    setSearchHistory(searches);
    if (permGranted) {
      setPermissionsGranted(true);
      await refreshFiles();
    }
  }

  const audioWithVideos = React.useMemo(() => {
    const sorted = [...audio, ...videos].sort((a, b) => (b.modifiedAt || 0) - (a.modifiedAt || 0));
    return sorted;
  }, [audio, videos]);

  const categories = useMemo<Category[]>(() => [
    { id: 'images', name: 'Images', icon: 'images', type: 'image', count: images.length, color: '#e17055' },
    { id: 'videos', name: 'Videos', icon: 'videos', type: 'video', count: videos.length, color: '#6c5ce7' },
    { id: 'music', name: 'Music', icon: 'music', type: 'audio', count: audio.length, color: '#00cec9' },
    { id: 'documents', name: 'Documents', icon: 'documents', type: 'document', count: documents.length + epubFiles.length, color: '#fdcb6e' },
  ], [images.length, videos.length, audio.length, documents.length, epubFiles.length]);

  const docCategories = useMemo(() => DOC_CATEGORIES.map((cat) => ({
    ...cat,
    count:
      cat.subType === 'pdf'
        ? pdfFiles.length
        : cat.subType === 'word'
        ? wordFiles.length
        : cat.subType === 'excel'
        ? excelFiles.length
        : cat.subType === 'powerpoint'
        ? pptFiles.length
        : cat.subType === 'epub'
        ? epubFiles.length
        : cat.subType === 'other'
        ? otherDocs.length
        : textFiles.length,
  })), [pdfFiles.length, wordFiles.length, excelFiles.length, pptFiles.length, textFiles.length, epubFiles.length, otherDocs.length]);

  async function refreshFiles() {
    setLoading(true);
    try {
      const [mediaImages, mediaVideos, mediaAudio, scannedDocs] = await Promise.all([
        getMediaFiles('image'),
        getMediaFiles('video'),
        getMediaFiles('audio'),
        scanDocuments(),
      ]);

      setImages(mediaImages);
      setVideos(mediaVideos);
      setAudio(mediaAudio);

      const allMedia = [...mediaImages, ...mediaVideos, ...mediaAudio];
      const allDocs = scannedDocs.filter((f) => f.type === 'document');
      const epubDocs = scannedDocs.filter((f) => f.docSubType === 'epub');
      const otherFiles = scannedDocs.filter((f) => f.type === 'other');

      const knownSubTypes = ['pdf', 'word', 'excel', 'powerpoint', 'text', 'epub'];
      const categorizedDocs = allDocs.filter((f) => knownSubTypes.includes(f.docSubType || ''));
      const uncategorizedDocs = allDocs.filter((f) => !knownSubTypes.includes(f.docSubType || ''));

      setDocuments(categorizedDocs.filter((f) => f.docSubType !== 'epub'));
      setEpubFiles(epubDocs);
      setOtherDocs([...uncategorizedDocs, ...otherFiles]);
      setFiles([...allMedia, ...allDocs, ...otherFiles]);

      setPdfFiles(categorizedDocs.filter((f) => f.docSubType === 'pdf'));
      setWordFiles(categorizedDocs.filter((f) => f.docSubType === 'word'));
      setExcelFiles(categorizedDocs.filter((f) => f.docSubType === 'excel'));
      setPptFiles(categorizedDocs.filter((f) => f.docSubType === 'powerpoint'));
      setTextFiles(categorizedDocs.filter((f) => f.docSubType === 'text'));

      const fileFolders = allMedia.filter((f) => f.type === 'folder');
      setFolders(fileFolders);
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestPermissions() {
    const granted = await requestPermissions();
    setPermissionsGranted(granted);
    await setPermissionsGrantedStorage(granted);
    if (granted) {
      await refreshFiles();
    }
  }

  function setMusicPlayer(state: Partial<PlayerState>) {
    setMusicPlayerState((prev) => ({ ...prev, ...state }));
  }

  function addToQueue(file: FileItem) {
    setMusicPlayerState((prev) => {
      const queue = [...prev.queue, file];
      return {
        ...prev,
        queue,
        currentIndex: prev.currentIndex === -1 ? queue.length - 1 : prev.currentIndex,
      };
    });
  }

  async function createPlaylist(name: string, coverUri?: string) {
    const newPlaylist = await createPlaylistStorage(name, coverUri);
    setPlaylists((prev) => [...prev, newPlaylist]);
    return newPlaylist;
  }

  async function addToPlaylist(playlistId: string, file: FileItem) {
    const updated = playlists.map((p) =>
      p.id === playlistId ? { ...p, files: [...p.files, file], updatedAt: Date.now() } : p
    );
    await savePlaylists(updated);
    setPlaylists(updated);
  }

  async function removeFromPlaylist(playlistId: string, fileUri: string) {
    const updated = playlists.map((p) =>
      p.id === playlistId ? { ...p, files: p.files.filter((f) => f.uri !== fileUri), updatedAt: Date.now() } : p
    );
    await savePlaylists(updated);
    setPlaylists(updated);
  }

  async function removePlaylist(playlistId: string) {
    await deletePlaylistStorage(playlistId);
    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
  }

  async function setPlaylistCover(playlistId: string, coverUri: string) {
    const updated = playlists.map((p) =>
      p.id === playlistId ? { ...p, coverUri, updatedAt: Date.now() } : p
    );
    await savePlaylists(updated);
    setPlaylists(updated);
  }

  async function recordRecentlyPlayed(file: FileItem) {
    await addToRecentlyPlayed(file);
    const played = await getRecentlyPlayed();
    setRecentlyPlayed(played);
    await addToRecentFiles(file);
    const recent = await getRecentFiles();
    setRecentFiles(recent);
  }

  async function saveSearch(query: string) {
    await saveSearchStorage(query);
    const searches = await getSearchHistory();
    setSearchHistory(searches);
  }

  async function removeSearch(id: string) {
    await removeSearchStorage(id);
    const searches = await getSearchHistory();
    setSearchHistory(searches);
  }

  async function clearSearchHistory() {
    await clearSearchHistoryStorage();
    setSearchHistory([]);
  }

  return (
    <FileContext.Provider
      value={{
        permissionsGranted,
        loading,
        files,
        images,
        videos,
        audio,
        audioWithVideos,
        documents,
        folders,
        pdfFiles,
        wordFiles,
        excelFiles,
        pptFiles,
        textFiles,
        epubFiles,
        otherDocs,
        recentFiles,
        recentlyPlayed,
        currentPath,
        musicPlayer,
        playlists,
        docCategories,
        searchHistory,
        requestPermissions: handleRequestPermissions,
        refreshFiles,
        setCurrentPath,
        setMusicPlayer,
        addToQueue,
        createPlaylist,
        addToPlaylist,
        removeFromPlaylist,
        removePlaylist,
        setPlaylistCover,
        recordRecentlyPlayed,
        saveSearch,
        removeSearch,
        clearSearchHistory,
        categories,
      }}
    >
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
