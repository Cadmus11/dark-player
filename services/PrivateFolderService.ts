import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  documentDirectory,
  cacheDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  deleteAsync,
  copyAsync,
} from 'expo-file-system/legacy';
import type { FileItem } from '../types';

const PRIVATE_FOLDER_KEY = '@lumora_private_folder';
const PRIVATE_FILES_KEY = '@lumora_private_files';

const PRIVATE_DIR = (documentDirectory || '') + 'private/';

interface PrivateFileEntry {
  uri: string;
  name: string;
  addedAt: number;
}

export const PrivateFolderService = {
  async isSetup(): Promise<boolean> {
    try {
      return (await getInfoAsync(PRIVATE_DIR)).exists;
    } catch {
      return false;
    }
  },

  async setupFolder(): Promise<boolean> {
    try {
      await makeDirectoryAsync(PRIVATE_DIR);
      await AsyncStorage.setItem(PRIVATE_FOLDER_KEY, JSON.stringify({ createdAt: Date.now() }));
      return true;
    } catch {
      return false;
    }
  },

  async deleteFolder(): Promise<boolean> {
    try {
      await deleteAsync(PRIVATE_DIR, { idempotent: true });
      await AsyncStorage.setItem(PRIVATE_FILES_KEY, JSON.stringify([]));
      await AsyncStorage.setItem(PRIVATE_FOLDER_KEY, JSON.stringify({}));
      return true;
    } catch {
      return false;
    }
  },

  async getPrivateFiles(): Promise<PrivateFileEntry[]> {
    try {
      const d = await AsyncStorage.getItem(PRIVATE_FILES_KEY);
      return d ? JSON.parse(d) : [];
    } catch {
      return [];
    }
  },

  async addFile(file: FileItem): Promise<boolean> {
    try {
      const destName = Date.now() + '_' + file.name;
      const destUri = PRIVATE_DIR + destName;
      await copyAsync({ from: file.uri, to: destUri });
      const files = await this.getPrivateFiles();
      files.push({ uri: destUri, name: file.name, addedAt: Date.now() });
      await AsyncStorage.setItem(PRIVATE_FILES_KEY, JSON.stringify(files));
      return true;
    } catch {
      return false;
    }
  },

  async removeFile(uri: string): Promise<boolean> {
    try {
      await deleteAsync(uri, { idempotent: true });
      const files = await this.getPrivateFiles();
      const updated = files.filter((f) => f.uri !== uri);
      await AsyncStorage.setItem(PRIVATE_FILES_KEY, JSON.stringify(updated));
      return true;
    } catch {
      return false;
    }
  },

  async restoreToOriginal(uri: string, originalName: string): Promise<string | null> {
    try {
      const restoreUri = (cacheDirectory || '') + 'restored_' + originalName;
      await copyAsync({ from: uri, to: restoreUri });
      await this.removeFile(uri);
      return restoreUri;
    } catch {
      return null;
    }
  },

  async getFolderInfo(): Promise<{ fileCount: number; totalSize: number }> {
    const files = await this.getPrivateFiles();
    let totalSize = 0;
    for (const f of files) {
      try {
        const info = await getInfoAsync(f.uri);
        if (info.exists) totalSize += info.size;
      } catch {}
    }
    return { fileCount: files.length, totalSize };
  },
};
