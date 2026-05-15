import React, { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import type { FileItem, Category, DocCategory, PlayerState, Playlist } from '../types';
import { getMediaFiles, scanDocuments, requestPermissions } from '../services/FileService';

interface FileContextType {
  permissionsGranted: boolean;
  loading: boolean;
  files: FileItem[];
  images: FileItem[];
  videos: FileItem[];
  audio: FileItem[];
  documents: FileItem[];
  folders: FileItem[];
  pdfFiles: FileItem[];
  wordFiles: FileItem[];
  excelFiles: FileItem[];
  pptFiles: FileItem[];
  textFiles: FileItem[];
  recentFiles: FileItem[];
  currentPath: string;
  musicPlayer: PlayerState;
  playlists: Playlist[];
  docCategories: DocCategory[];
  requestPermissions: () => Promise<void>;
  refreshFiles: () => Promise<void>;
  setCurrentPath: (path: string) => void;
  setMusicPlayer: (state: Partial<PlayerState>) => void;
  addToQueue: (file: FileItem) => void;
  createPlaylist: (name: string) => void;
  addToPlaylist: (playlistId: string, file: FileItem) => void;
  categories: Category[];
}

const FileContext = createContext<FileContextType | undefined>(undefined);

const DOC_CATEGORIES: DocCategory[] = [
  { id: 'pdf', name: 'PDF', icon: '📕', ext: ['pdf'], subType: 'pdf', count: 0, color: '#e74c3c' },
  { id: 'word', name: 'Word', icon: '📘', ext: ['doc', 'docx'], subType: 'word', count: 0, color: '#3498db' },
  { id: 'excel', name: 'Excel', icon: '📊', ext: ['xls', 'xlsx', 'csv'], subType: 'excel', count: 0, color: '#27ae60' },
  { id: 'powerpoint', name: 'PowerPoint', icon: '📙', ext: ['ppt', 'pptx'], subType: 'powerpoint', count: 0, color: '#f39c12' },
  { id: 'text', name: 'Text', icon: '📝', ext: ['txt', 'rtf', 'md'], subType: 'text', count: 0, color: '#9b59b6' },
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
  const [recentFiles, setRecentFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [musicPlayer, setMusicPlayerState] = useState<PlayerState>(DEFAULT_PLAYER);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  const categories: Category[] = [
    { id: 'images', name: 'Images', icon: '🖼️', type: 'image', count: images.length, color: '#e17055' },
    { id: 'videos', name: 'Videos', icon: '🎬', type: 'video', count: videos.length, color: '#6c5ce7' },
    { id: 'music', name: 'Music', icon: '🎵', type: 'audio', count: audio.length, color: '#00cec9' },
    { id: 'documents', name: 'Documents', icon: '📄', type: 'document', count: documents.length, color: '#fdcb6e' },
  ];

  const docCategories = DOC_CATEGORIES.map((cat) => ({
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
        : textFiles.length,
  }));

  async function handleRequestPermissions() {
    const granted = await requestPermissions();
    setPermissionsGranted(granted);
    if (granted) {
      await refreshFiles();
    }
  }

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
      const otherFiles = scannedDocs.filter((f) => f.type === 'other');

      setDocuments(allDocs);
      setFiles([...allMedia, ...allDocs, ...otherFiles]);

      setPdfFiles(allDocs.filter((f) => f.docSubType === 'pdf'));
      setWordFiles(allDocs.filter((f) => f.docSubType === 'word'));
      setExcelFiles(allDocs.filter((f) => f.docSubType === 'excel'));
      setPptFiles(allDocs.filter((f) => f.docSubType === 'powerpoint'));
      setTextFiles(allDocs.filter((f) => f.docSubType === 'text'));

      const fileFolders = allMedia.filter((f) => f.type === 'folder');
      setFolders(fileFolders);
    } finally {
      setLoading(false);
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

  function createPlaylist(name: string) {
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name,
      files: [],
      createdAt: Date.now(),
    };
    setPlaylists((prev) => [...prev, newPlaylist]);
  }

  function addToPlaylist(playlistId: string, file: FileItem) {
    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === playlistId ? { ...p, files: [...p.files, file] } : p
      )
    );
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
        documents,
        folders,
        pdfFiles,
        wordFiles,
        excelFiles,
        pptFiles,
        textFiles,
        recentFiles,
        currentPath,
        musicPlayer,
        playlists,
        docCategories,
        requestPermissions: handleRequestPermissions,
        refreshFiles,
        setCurrentPath,
        setMusicPlayer,
        addToQueue,
        createPlaylist,
        addToPlaylist,
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
