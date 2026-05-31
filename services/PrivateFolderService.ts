import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  documentDirectory,
  cacheDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  deleteAsync,
  copyAsync,
} from 'expo-file-system/legacy';
import type { FileItem, PrivateFileEntry } from '../types';

const PRIVATE_FOLDER_KEY = '@lumora_private_folder';
const PRIVATE_FILES_KEY = '@lumora_private_files';
const PASSCODE_KEY = '@lumora_private_passcode';

const PRIVATE_DIR = (documentDirectory || '') + 'private/';

function simpleHash(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    hash = ((hash << 5) - hash + pin.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

export const PrivateFolderService = {
  async isSetup(): Promise<boolean> {
    try {
      return (await getInfoAsync(PRIVATE_DIR)).exists;
    } catch {
      return false;
    }
  },

  async setupFolder(passcode: string): Promise<boolean> {
    try {
      await makeDirectoryAsync(PRIVATE_DIR);
      await AsyncStorage.setItem(PRIVATE_FOLDER_KEY, JSON.stringify({ createdAt: Date.now() }));
      await AsyncStorage.setItem(PASSCODE_KEY, simpleHash(passcode));
      return true;
    } catch {
      return false;
    }
  },

  async deleteFolder(passcode: string): Promise<boolean> {
    try {
      if (!(await this.verifyPasscode(passcode))) return false;
      await deleteAsync(PRIVATE_DIR, { idempotent: true });
      await AsyncStorage.setItem(PRIVATE_FILES_KEY, JSON.stringify([]));
      await AsyncStorage.setItem(PRIVATE_FOLDER_KEY, JSON.stringify({}));
      await AsyncStorage.setItem(PASSCODE_KEY, '');
      return true;
    } catch {
      return false;
    }
  },

  async hasPasscode(): Promise<boolean> {
    try {
      const hash = await AsyncStorage.getItem(PASSCODE_KEY);
      return !!hash;
    } catch {
      return false;
    }
  },

  async verifyPasscode(passcode: string): Promise<boolean> {
    try {
      const hash = await AsyncStorage.getItem(PASSCODE_KEY);
      return hash === simpleHash(passcode);
    } catch {
      return false;
    }
  },

  async changePasscode(oldPasscode: string, newPasscode: string): Promise<boolean> {
    try {
      if (!(await this.verifyPasscode(oldPasscode))) return false;
      await AsyncStorage.setItem(PASSCODE_KEY, simpleHash(newPasscode));
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

  async addFiles(files: FileItem[]): Promise<number> {
    let count = 0;
    for (const f of files) {
      if (await this.addFile(f)) count++;
    }
    return count;
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

  async getFileItem(entry: PrivateFileEntry): Promise<FileItem> {
    const info = await getInfoAsync(entry.uri);
    return {
      uri: entry.uri,
      name: entry.name,
      type: this._inferType(entry.name),
      size: info.exists ? info.size : undefined,
      modifiedAt: entry.addedAt,
    };
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

  _inferType(name: string): 'audio' | 'video' {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'];
    return videoExts.includes(ext) ? 'video' : 'audio';
  },
};
