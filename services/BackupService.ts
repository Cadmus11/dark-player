import AsyncStorage from '@react-native-async-storage/async-storage';
import { MMKV } from 'react-native-mmkv';
import {
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  writeAsStringAsync,
  readAsStringAsync,
  deleteAsync,
  readDirectoryAsync,
} from 'expo-file-system/legacy';
import type {
  ThemeSettings,
  RecentlyPlayed,
  SavedSearch,
  RecentlyDeleted,
  NotificationSettings,
  PlaylistData,
} from '../types';

const BACKUPS_DIR = `${documentDirectory}backups/`;
const DRIVE_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const BACKUP_FOLDER_NAME = 'Lumora Backups';
const MEDIA_FOLDER_NAME = 'Lumora Media';

export interface BackupData {
  version: string;
  createdAt: number;
  appVersion: string;
  data: {
    theme?: ThemeSettings;
    favorites?: string[];
    recentlyPlayed?: RecentlyPlayed[];
    searchHistory?: SavedSearch[];
    recentlyDeleted?: RecentlyDeleted[];
    notificationSettings?: NotificationSettings;
    playlists?: PlaylistData[];
    privateFiles?: { uri: string; name: string; addedAt: number }[];
  };
}

export interface DriveFileInfo {
  id: string;
  name: string;
  size: string;
  createdTime: string;
}

export async function initBackupDir(): Promise<void> {
  const info = await getInfoAsync(BACKUPS_DIR);
  if (!info.exists) {
    await makeDirectoryAsync(BACKUPS_DIR, { intermediates: true });
  }
}

export async function collectBackupData(): Promise<BackupData> {
  const themeRaw = await AsyncStorage.getItem('@lumora_theme');
  const favoritesRaw = await AsyncStorage.getItem('@lumora_favorites');
  const recentlyPlayedRaw = await AsyncStorage.getItem('@lumora_recently_played');
  const searchHistoryRaw = await AsyncStorage.getItem('@lumora_search_history');
  const recentlyDeletedRaw = await AsyncStorage.getItem('@lumora_recently_deleted');

  const settingsStorage = new MMKV({ id: 'settings' });
  const notificationsRaw = settingsStorage.getString('@settings_notifications');

  const queueStorage = new MMKV({ id: 'queue-engine' });
  const playlistsRaw = queueStorage.getString('@queue_playlists');

  const privateStorage = new MMKV({ id: 'private-folder' });
  const privateRaw = privateStorage.getString('@private_files');

  let theme: ThemeSettings | undefined;
  let favorites: string[] | undefined;
  let recentlyPlayed: RecentlyPlayed[] | undefined;
  let searchHistory: SavedSearch[] | undefined;
  let recentlyDeleted: RecentlyDeleted[] | undefined;
  let notificationSettings: NotificationSettings | undefined;
  let playlists: PlaylistData[] | undefined;
  let privateFiles: { uri: string; name: string; addedAt: number }[] | undefined;

  try {
    if (themeRaw) theme = JSON.parse(themeRaw);
  } catch {}
  try {
    if (favoritesRaw) favorites = JSON.parse(favoritesRaw);
  } catch {}
  try {
    if (recentlyPlayedRaw) recentlyPlayed = JSON.parse(recentlyPlayedRaw);
  } catch {}
  try {
    if (searchHistoryRaw) searchHistory = JSON.parse(searchHistoryRaw);
  } catch {}
  try {
    if (recentlyDeletedRaw) recentlyDeleted = JSON.parse(recentlyDeletedRaw);
  } catch {}
  try {
    if (notificationsRaw) notificationSettings = JSON.parse(notificationsRaw);
  } catch {}
  try {
    if (playlistsRaw) playlists = JSON.parse(playlistsRaw);
  } catch {}
  try {
    if (privateRaw) privateFiles = JSON.parse(privateRaw);
  } catch {}

  return {
    version: '1.0',
    createdAt: Date.now(),
    appVersion: '1.0.0',
    data: {
      theme,
      favorites,
      recentlyPlayed,
      searchHistory,
      recentlyDeleted,
      notificationSettings,
      playlists,
      privateFiles,
    },
  };
}

export async function restoreFromBackup(backup: BackupData): Promise<void> {
  const { data } = backup;
  const promises: Promise<void>[] = [];

  if (data.theme) {
    promises.push(AsyncStorage.setItem('@lumora_theme', JSON.stringify(data.theme)));
  }
  if (data.favorites) {
    promises.push(AsyncStorage.setItem('@lumora_favorites', JSON.stringify(data.favorites)));
  }
  if (data.recentlyPlayed) {
    promises.push(
      AsyncStorage.setItem('@lumora_recently_played', JSON.stringify(data.recentlyPlayed))
    );
  }
  if (data.searchHistory) {
    promises.push(
      AsyncStorage.setItem('@lumora_search_history', JSON.stringify(data.searchHistory))
    );
  }
  if (data.recentlyDeleted) {
    promises.push(
      AsyncStorage.setItem('@lumora_recently_deleted', JSON.stringify(data.recentlyDeleted))
    );
  }

  if (data.notificationSettings) {
    const settingsStorage = new MMKV({ id: 'settings' });
    settingsStorage.set('@settings_notifications', JSON.stringify(data.notificationSettings));
  }

  if (data.playlists) {
    const queueStorage = new MMKV({ id: 'queue-engine' });
    queueStorage.set('@queue_playlists', JSON.stringify(data.playlists));
  }

  if (data.privateFiles) {
    const privateStorage = new MMKV({ id: 'private-folder' });
    privateStorage.set('@private_files', JSON.stringify(data.privateFiles));
  }

  await Promise.all(promises);
}

export async function exportLocalBackup(data: BackupData): Promise<string> {
  await initBackupDir();
  const date = new Date(data.createdAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  const fileName = `backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}.json`;
  const filePath = `${BACKUPS_DIR}${fileName}`;
  await writeAsStringAsync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

export async function getLocalBackups(): Promise<
  { name: string; path: string; createdAt: number }[]
> {
  await initBackupDir();
  const info = await getInfoAsync(BACKUPS_DIR);
  if (!info.exists || !('exists' in info) || !info.exists) return [];
  try {
    const files: string[] = await readDirectoryAsync(BACKUPS_DIR);
    const results: { name: string; path: string; createdAt: number }[] = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const path = `${BACKUPS_DIR}${file}`;
        try {
          const content = await readAsStringAsync(path);
          const parsed = JSON.parse(content);
          results.push({ name: file, path, createdAt: parsed.createdAt || 0 });
        } catch {}
      }
    }
    return results.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function loadLocalBackup(path: string): Promise<BackupData | null> {
  try {
    const content = await readAsStringAsync(path);
    return JSON.parse(content) as BackupData;
  } catch {
    return null;
  }
}

export async function deleteLocalBackup(path: string): Promise<void> {
  await deleteAsync(path, { idempotent: true });
}

async function driveFetch(token: string, url: string, options?: RequestInit): Promise<any> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function ensureDriveFolder(token: string, folderName: string): Promise<string> {
  const query = encodeURIComponent(
    `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const list = await driveFetch(token, `${DRIVE_BASE}/files?q=${query}&spaces=drive`);
  if (list.files && list.files.length > 0) {
    return list.files[0].id;
  }
  const folder = await driveFetch(token, `${DRIVE_BASE}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  return folder.id;
}

export async function uploadBackupToDrive(token: string, data: BackupData): Promise<string> {
  const folderId = await ensureDriveFolder(token, BACKUP_FOLDER_NAME);
  const date = new Date(data.createdAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  const fileName = `backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}.json`;
  const content = JSON.stringify(data);

  const boundary = 'LumoraBoundary' + Date.now();
  const multipartBody = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify({ name: fileName, parents: [folderId] }),
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    content,
    `--${boundary}--`,
  ].join('\r\n');

  const res = await fetch(`${DRIVE_UPLOAD}/files?uploadType=multipart`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive upload error ${res.status}: ${text}`);
  }

  const result = await res.json();
  return result.id;
}

export async function listDriveBackups(token: string): Promise<DriveFileInfo[]> {
  const folderId = await ensureDriveFolder(token, BACKUP_FOLDER_NAME);
  const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const list = await driveFetch(
    token,
    `${DRIVE_BASE}/files?q=${query}&orderBy=createdTime desc&fields=files(id,name,size,createdTime)`
  );
  return list.files || [];
}

export async function downloadBackupFromDrive(token: string, fileId: string): Promise<BackupData> {
  const res = await fetch(`${DRIVE_BASE}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive download error ${res.status}`);
  const text = await res.text();
  return JSON.parse(text) as BackupData;
}

export async function deleteDriveBackup(token: string, fileId: string): Promise<void> {
  await fetch(`${DRIVE_BASE}/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function uploadMediaToDrive(
  token: string,
  fileUri: string,
  fileName: string
): Promise<string> {
  const folderId = await ensureDriveFolder(token, MEDIA_FOLDER_NAME);

  const fileInfo = await getInfoAsync(fileUri);
  if (!fileInfo.exists) throw new Error('File not found');

  const res = await fetch(fileUri);
  const blob = await res.blob();

  const boundary = 'LumoraBoundary' + Date.now();
  const metadataPart = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify({ name: fileName, parents: [folderId] }),
  ].join('\r\n');

  const filePartHeader = [`--${boundary}`, 'Content-Type: application/octet-stream', ''].join(
    '\r\n'
  );

  const fileReader = new FileReader();
  const base64 = await new Promise<string>((resolve, reject) => {
    fileReader.onload = () => resolve(fileReader.result as string);
    fileReader.onerror = reject;
    fileReader.readAsDataURL(blob);
  });
  const base64Data = base64.split(',')[1];

  const body = metadataPart + '\r\n' + filePartHeader + base64Data + `\r\n--${boundary}--`;

  const uploadRes = await fetch(`${DRIVE_UPLOAD}/files?uploadType=multipart`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(`Media upload error ${uploadRes.status}: ${text}`);
  }

  const result = await uploadRes.json();
  return result.id;
}

export async function listDriveMedia(token: string): Promise<DriveFileInfo[]> {
  const folderId = await ensureDriveFolder(token, MEDIA_FOLDER_NAME);
  const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const list = await driveFetch(
    token,
    `${DRIVE_BASE}/files?q=${query}&orderBy=createdTime desc&fields=files(id,name,size,createdTime)`
  );
  return list.files || [];
}
