import { create } from 'zustand';
import type { FileItem } from '../types';

interface MediaStoreState {
  images: FileItem[];
  videos: FileItem[];
  audio: FileItem[];
  documents: FileItem[];
  allFiles: FileItem[];

  setImages: (items: FileItem[]) => void;
  setVideos: (items: FileItem[]) => void;
  setAudio: (items: FileItem[]) => void;
  setDocuments: (items: FileItem[]) => void;
  setAllFiles: (items: FileItem[]) => void;
}

export const useMediaStore = create<MediaStoreState>((set) => ({
  images: [],
  videos: [],
  audio: [],
  documents: [],
  allFiles: [],

  setImages: (items) => set({ images: items }),
  setVideos: (items) => set({ videos: items }),
  setAudio: (items) => set({ audio: items }),
  setDocuments: (items) => set({ documents: items }),
  setAllFiles: (items) => set({ allFiles: items }),
}));
