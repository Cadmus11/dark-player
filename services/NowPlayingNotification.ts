import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { FileItem } from '../types';

const CHANNEL_ID = 'lumora-media-playback';
const NOTIFICATION_ID = 'lumora-now-playing';

let currentFile: FileItem | null = null;
let isPlaying = false;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

export const NowPlayingNotification = {
  async setupChannel(): Promise<void> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Media Playback',
        importance: Notifications.AndroidImportance.LOW,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
        showBadge: false,
        sound: null,
        vibrationPattern: null,
      });
    }
    const perm = await Notifications.getPermissionsAsync();
    if ((perm as any).status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
  },

  async show(file: FileItem, playing: boolean): Promise<void> {
    currentFile = file;
    isPlaying = playing;

    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_ID,
      content: {
        title: file.name,
        body: file.artist || file.album || 'Now Playing',
        data: { uri: file.uri, type: 'now-playing' },
        categoryIdentifier: 'media-playback',
        ...(Platform.OS === 'android'
          ? {
              channelId: CHANNEL_ID,
              color: '#C2FC4A',
              priority: Notifications.AndroidNotificationPriority.LOW,
              ...(file.thumbnail ? { icon: file.thumbnail } : {}),
            }
          : {}),
      },
      trigger: null,
    });
  },

  async updatePlayState(playing: boolean): Promise<void> {
    isPlaying = playing;
    if (!currentFile) return;
    await this.show(currentFile, playing);
  },

  async updateTrack(file: FileItem, playing: boolean): Promise<void> {
    currentFile = file;
    isPlaying = playing;
    await this.show(file, playing);
  },

  async dismiss(): Promise<void> {
    currentFile = null;
    isPlaying = false;
    try {
      await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID);
    } catch {}
  },

  getCurrentFile(): FileItem | null {
    return currentFile;
  },

  getIsPlaying(): boolean {
    return isPlaying;
  },
};
