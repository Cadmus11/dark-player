import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { eventBus, AppEvents } from './EventBus';

export interface StorageSnapshot {
  deviceTotal: number;
  deviceFree: number;
  deviceUsed: number;
  audioFiles: number;
  audioSize: number;
  videoFiles: number;
  videoSize: number;
  timestamp: number;
}

let _cached: StorageSnapshot | null = null;
let _lastFetch = 0;
const CACHE_TTL = 30_000;

async function getDeviceStorage(): Promise<{ total: number; free: number }> {
  try {
    if (Platform.OS === 'web') {
      if ('storage' in navigator && 'estimate' in (navigator as any).storage) {
        const est = await (navigator as any).storage.estimate();
        return { total: est.quota || 0, free: est.remaining || 0 };
      }
      return { total: 0, free: 0 };
    }
    const [total, free] = await Promise.all([
      FileSystem.getTotalDiskCapacityAsync(),
      FileSystem.getFreeDiskStorageAsync(),
    ]);
    return { total, free };
  } catch {
    return { total: 0, free: 0 };
  }
}

function sumSizes(files: { size?: number }[]): number {
  let total = 0;
  for (const f of files) {
    if (f.size) total += f.size;
  }
  return total;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export const StorageTrackingService = {
  async collectSnapshot(
    audio: { size?: number }[],
    video: { size?: number }[]
  ): Promise<StorageSnapshot> {
    const { total, free } = await getDeviceStorage();
    const audioSize = sumSizes(audio);
    const videoSize = sumSizes(video);
    const snapshot: StorageSnapshot = {
      deviceTotal: total,
      deviceFree: free,
      deviceUsed: total > 0 ? total - free : 0,
      audioFiles: audio.length,
      audioSize,
      videoFiles: video.length,
      videoSize,
      timestamp: Date.now(),
    };
    _cached = snapshot;
    _lastFetch = Date.now();
    eventBus.emit(AppEvents.SETTINGS_CHANGED);
    return snapshot;
  },

  async getCachedSnapshot(
    audio: { size?: number }[],
    video: { size?: number }[]
  ): Promise<StorageSnapshot> {
    if (_cached && Date.now() - _lastFetch < CACHE_TTL) {
      return _cached;
    }
    return this.collectSnapshot(audio, video);
  },

  formatBytes,
};
