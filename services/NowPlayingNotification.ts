import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { FileItem } from '../types';

export const NOTIFICATION_CATEGORY = 'media-playback';

const CHANNEL_ID = 'lumora-media-playback';
const NOTIFICATION_ID = 'lumora-now-playing';

let currentFile: FileItem | null = null;
let isPlaying = false;
let responseSubscription: Notifications.EventSubscription | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

function cleanTitle(name: string): string {
  return name.replace(/\.[^.]+$/, '').trim();
}

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

    await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY, [
      { identifier: 'previous', buttonTitle: 'Previous' },
      { identifier: 'playpause', buttonTitle: isPlaying ? 'Pause' : 'Play' },
      { identifier: 'next', buttonTitle: 'Next' },
    ]);

    const perm = await Notifications.getPermissionsAsync();
    if ((perm as any).status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }

    if (!responseSubscription) {
      responseSubscription = Notifications.addNotificationResponseReceivedListener(
        this.handleResponse
      );
    }
  },

  handleResponse(response: Notifications.NotificationResponse) {
    const { actionIdentifier, notification } = response;
    const data = notification.request.content.data as { uri?: string; action?: string };

    if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      return;
    }

    const { AudioEngine } = require('../engine/AudioEngine');
    const engine = AudioEngine.getInstance();

    switch (actionIdentifier) {
      case 'previous':
        engine.skipToPrevious();
        break;
      case 'next':
        engine.skipToNext();
        break;
      case 'playpause':
        engine.togglePlay();
        break;
    }
  },

  async show(file: FileItem, playing: boolean): Promise<void> {
    currentFile = file;
    isPlaying = playing;

    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_ID,
      content: {
        title: cleanTitle(file.name),
        body: file.artist || file.album || 'Now Playing',
        data: { uri: file.uri, type: 'now-playing' },
        categoryIdentifier: NOTIFICATION_CATEGORY,
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
    await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY, [
      { identifier: 'previous', buttonTitle: 'Previous' },
      { identifier: 'playpause', buttonTitle: playing ? 'Pause' : 'Play' },
      { identifier: 'next', buttonTitle: 'Next' },
    ]);
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

  cleanup() {
    if (responseSubscription) {
      responseSubscription.remove();
      responseSubscription = null;
    }
  },

  getCurrentFile(): FileItem | null {
    return currentFile;
  },

  getIsPlaying(): boolean {
    return isPlaying;
  },
};
