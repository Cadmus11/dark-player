import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';
import type { PlaybackSettings, NotificationSettings, SleepTimerSettings, HiddenFilesSettings, SortField, SortDirection, LayoutMode } from '../types';

const storage = new MMKV({ id: 'settings' });

interface SettingsState {
  playback: PlaybackSettings;
  notifications: NotificationSettings;
  sleepTimer: SleepTimerSettings;
  hiddenFiles: HiddenFilesSettings;
  sortField: SortField;
  sortDirection: SortDirection;
  layoutMode: LayoutMode;

  updatePlayback: (settings: Partial<PlaybackSettings>) => void;
  updateNotifications: (settings: Partial<NotificationSettings>) => void;
  updateSleepTimer: (settings: Partial<SleepTimerSettings>) => void;
  updateHiddenFiles: (settings: Partial<HiddenFilesSettings>) => void;
  setSort: (field: SortField, direction: SortDirection) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  load: () => void;
}

const KEYS = {
  playback: '@settings_playback',
  notifications: '@settings_notifications',
  sleepTimer: '@settings_sleep_timer',
  hiddenFiles: '@settings_hidden_files',
  sort: '@settings_sort',
  layout: '@settings_layout',
};

export const useSettingsStore = create<SettingsState>((set) => ({
  playback: { playWithOtherApps: false, crossFade: false, crossFadeDuration: 3, gaplessPlayback: true },
  notifications: { newMediaNotification: true, pushNotification: true },
  sleepTimer: { enabled: false, mode: 'off', minutes: 30, playOneToEnd: false },
  hiddenFiles: { hideShortSongs: true, minDurationSeconds: 15, hideOpus: true, hideExtensions: ['opus'] },
  sortField: 'name',
  sortDirection: 'asc',
  layoutMode: 'list',

  updatePlayback: (partial) =>
    set((s) => {
      const updated = { ...s.playback, ...partial };
      storage.set(KEYS.playback, JSON.stringify(updated));
      return { playback: updated };
    }),

  updateNotifications: (partial) =>
    set((s) => {
      const updated = { ...s.notifications, ...partial };
      storage.set(KEYS.notifications, JSON.stringify(updated));
      return { notifications: updated };
    }),

  updateSleepTimer: (partial) =>
    set((s) => {
      const updated = { ...s.sleepTimer, ...partial };
      storage.set(KEYS.sleepTimer, JSON.stringify(updated));
      return { sleepTimer: updated };
    }),

  updateHiddenFiles: (partial) =>
    set((s) => {
      const updated = { ...s.hiddenFiles, ...partial };
      storage.set(KEYS.hiddenFiles, JSON.stringify(updated));
      return { hiddenFiles: updated };
    }),

  setSort: (field, direction) => {
    set({ sortField: field, sortDirection: direction });
    storage.set(KEYS.sort, JSON.stringify({ field, direction }));
  },

  setLayoutMode: (mode) => {
    set({ layoutMode: mode });
    storage.set(KEYS.layout, mode);
  },

  load: () => {
    try {
      const pb = storage.getString(KEYS.playback);
      if (pb) set({ playback: JSON.parse(pb) });
      const nt = storage.getString(KEYS.notifications);
      if (nt) set({ notifications: JSON.parse(nt) });
      const st = storage.getString(KEYS.sleepTimer);
      if (st) set({ sleepTimer: JSON.parse(st) });
      const hf = storage.getString(KEYS.hiddenFiles);
      if (hf) set({ hiddenFiles: JSON.parse(hf) });
      const sort = storage.getString(KEYS.sort);
      if (sort) set(JSON.parse(sort));
      const layout = storage.getString(KEYS.layout);
      if (layout) set({ layoutMode: layout as LayoutMode });
    } catch {}
  },
}));
