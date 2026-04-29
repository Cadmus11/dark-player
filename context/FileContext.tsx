import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { FileItem, Category, PlayerState } from '../types';
import { getMediaFiles, getFileSystemFiles, requestPermissions } from '../services/FileService';

interface FileContextType {
  permissionsGranted: boolean;
  loading: boolean;
  files: FileItem[];
  images: FileItem[];
  videos: FileItem[];
  audio: FileItem[];
  documents: FileItem[];
  folders: FileItem[];
  recentFiles: FileItem[];
  currentPath: string;
  musicPlayer: PlayerState;
  requestPermissions: () => Promise<void>;
  refreshFiles: () => Promise<void>;
  setCurrentPath: (path: string) => void;
  setMusicPlayer: (state: Partial<PlayerState>) => void;
  addToQueue: (file: FileItem) => void;
  categories: Category[];
}

const FileContext = createContext<FileContextType | undefined>(undefined);

const CATEGORIES: Category[] = [
  { id: 'images', name: 'Images', icon: '🖼️', type: 'image', count: 0, color: '#e17055' },
  { id: 'videos', name: 'Videos', icon: '🎬', type: 'video', count: 0, color: '#6c5ce7' },
  { id: 'music', name: 'Music', icon: '🎵', type: 'audio', count: 0, color: '#00cec9' },
  { id: 'documents', name: 'Documents', icon: '📄', type: 'document', count: 0, color: '#fdcb6e' },
  { id: 'folders', name: 'Folders', icon: '📁', type: 'folder', count: 0, color: '#74b9ff' },
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
  const [recentFiles, setRecentFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [musicPlayer, setMusicPlayerState] = useState<PlayerState>(DEFAULT_PLAYER);

  const categories: Category[] = CATEGORIES.map((cat) => ({
    ...cat,
    count:
      cat.type === 'image'
        ? images.length
        : cat.type === 'video'
        ? videos.length
        : cat.type === 'audio'
        ? audio.length
        : cat.type === 'document'
        ? documents.length
        : folders.length,
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
      const [mediaImages, mediaVideos, mediaAudio] = await Promise.all([
        getMediaFiles('image'),
        getMediaFiles('video'),
        getMediaFiles('audio'),
      ]);

      setImages(mediaImages);
      setVideos(mediaVideos);
      setAudio(mediaAudio);

      const allFiles = [...mediaImages, ...mediaVideos, ...mediaAudio];
      setFiles(allFiles);

      const docs = allFiles.filter((f) => f.type === 'document');
      setDocuments(docs);

      const fileFolders = allFiles.filter((f) => f.type === 'folder');
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
        recentFiles,
        currentPath,
        musicPlayer,
        requestPermissions: handleRequestPermissions,
        refreshFiles,
        setCurrentPath,
        setMusicPlayer,
        addToQueue,
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
