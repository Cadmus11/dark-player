import AsyncStorage from '@react-native-async-storage/async-storage';
const FileSystem: any = require('expo-file-system');
import type { FileItem } from '../types';

const PRIVATE_FOLDER_KEY = '@lumora_private_folder';
const PRIVATE_FILES_KEY = '@lumora_private_files';

const PRIVATE_DIR = (FileSystem.documentDirectory || '') + 'private/';

interface PrivateFileEntry {
  uri: string;
  name: string;
  addedAt: number;
}

export const PrivateFolderService = {
  async isSetup(): Promise<boolean> {
    try {
      const info = await FileSystem.getInfoAsync(PRIVATE_DIR);
      return info.exists;
    } catch { return false; }
  },

  async setupFolder(): Promise<boolean> {
    try {
      await FileSystem.makeDirectoryAsync(PRIVATE_DIR, { intermediates: true });
      await AsyncStorage.setItem(PRIVATE_FOLDER_KEY, JSON.stringify({ createdAt: Date.now() }));
      return true;
    } catch { return false; }
  },

  async deleteFolder(): Promise<boolean> {
    try {
      await FileSystem.deleteAsync(PRIVATE_DIR, { idempotent: true });
      await AsyncStorage.setItem(PRIVATE_FILES_KEY, JSON.stringify([]));
      await AsyncStorage.setItem(PRIVATE_FOLDER_KEY, JSON.stringify({}));
      return true;
    } catch { return false; }
  },

  async getPrivateFiles(): Promise<PrivateFileEntry[]> {
    try {
      const d = await AsyncStorage.getItem(PRIVATE_FILES_KEY);
      return d ? JSON.parse(d) : [];
    } catch { return []; }
  },

  async addFile(file: FileItem): Promise<boolean> {
    try {
      const destName = Date.now() + '_' + file.name;
      const destUri = PRIVATE_DIR + destName;
      await FileSystem.copyAsync({ from: file.uri, to: destUri });
      const files = await this.getPrivateFiles();
      files.push({ uri: destUri, name: file.name, addedAt: Date.now() });
      await AsyncStorage.setItem(PRIVATE_FILES_KEY, JSON.stringify(files));
      return true;
    } catch { return false; }
  },

  async removeFile(uri: string): Promise<boolean> {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
      const files = await this.getPrivateFiles();
      const updated = files.filter((f) => f.uri !== uri);
      await AsyncStorage.setItem(PRIVATE_FILES_KEY, JSON.stringify(updated));
      return true;
    } catch { return false; }
  },

  async restoreToOriginal(uri: string, originalName: string): Promise<string | null> {
    try {
      const restoreUri = (FileSystem.cacheDirectory || '') + 'restored_' + originalName;
      await FileSystem.copyAsync({ from: uri, to: restoreUri });
      await this.removeFile(uri);
      return restoreUri;
    } catch { return null; }
  },

  async getFolderInfo(): Promise<{ fileCount: number; totalSize: number }> {
    const files = await this.getPrivateFiles();
    let totalSize = 0;
    for (const f of files) {
      try {
        const info = await FileSystem.getInfoAsync(f.uri, { size: true });
        if (info.exists) totalSize += (info as any).size || 0;
      } catch {}
    }
    return { fileCount: files.length, totalSize };
  },
};
