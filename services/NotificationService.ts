import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { MMKV } from 'react-native-mmkv';
import { eventBus, AppEvents } from './EventBus';
import type { NotificationSettings } from '../types';

const GENERAL_CHANNEL_ID = 'lumora-general';
const storage = new MMKV({ id: 'settings' });

function getNotificationSettings(): NotificationSettings {
  try {
    const raw = storage.getString('@settings_notifications');
    if (raw) return JSON.parse(raw);
  } catch {}
  return { newMediaNotification: true, pushNotification: true };
}

export class NotificationService {
  private static instance: NotificationService;
  private _initialized = false;
  private _cleanups: (() => void)[] = [];

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async setup(): Promise<void> {
    if (this._initialized) return;
    this._initialized = true;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(GENERAL_CHANNEL_ID, {
        name: 'General Notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        showBadge: true,
        vibrationPattern: [0, 100, 100, 100],
      });
    }

    const perm = await Notifications.getPermissionsAsync();
    if ((perm as any).status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }

    this._cleanups.push(
      eventBus.on(AppEvents.SCAN_COMPLETED, (data) => this._onScanCompleted(data)),
      eventBus.on(AppEvents.SCAN_FAILED, (error) => this._onScanFailed(error))
    );
  }

  private _onScanCompleted(data: { videos: number; audio: number }): void {
    const settings = getNotificationSettings();
    if (!settings.newMediaNotification) return;

    const total = data.videos + data.audio;
    if (total === 0) return;

    const labelV = data.videos === 1 ? 'video' : 'videos';
    const labelA = data.audio === 1 ? 'audio file' : 'audio files';
    this.show({
      title: 'Media Scan Complete',
      body: `Found ${data.videos} ${labelV} and ${data.audio} ${labelA}`,
      data: { type: 'scan_complete' },
    });
  }

  private _onScanFailed(error: any): void {
    this.show({
      title: 'Media Scan Failed',
      body: error?.message || 'An error occurred while scanning media',
      data: { type: 'scan_failed' },
    });
  }

  async show(opts: { title: string; body: string; data?: Record<string, any> }): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: opts.title,
        body: opts.body,
        data: { ...opts.data },
        ...(Platform.OS === 'android' ? { channelId: GENERAL_CHANNEL_ID } : {}),
      },
      trigger: null,
    });
  }

  cleanup(): void {
    this._cleanups.forEach((fn) => fn());
    this._cleanups = [];
    this._initialized = false;
  }
}

export const notificationService = NotificationService.getInstance();
