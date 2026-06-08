import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Linking,
  Switch,
  TextInput,
  FlatList,
  Share,
  Platform,
  Modal,
} from 'react-native';
import { useAppNavigation } from '../hooks/useAppNavigation';
import {
  Clock,
  PaintBrush,
  Moon,
  EyeSlash,
  Trash,
  SlidersHorizontal,
  Translate,
  ChatCenteredDots,
  Info,
  MusicNotes,
  VideoCamera,
  SpeakerHigh,
  SquaresFour,
  CaretLeft,
  Check,
  TextAa,
  Bell,
  Timer,
  ShieldCheck,
  Folder,
  LockSimple,
  Fingerprint,
  Star,
  ShareNetwork,
  Globe,
  GoogleLogo,
  UploadSimple,
  DownloadSimple,
  CloudArrowUp,
  CloudArrowDown,
  List,
  HardDrives,
} from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFont, FONT_OPTIONS } from '../context/FontContext';
import { useMediaStore } from '../stores/mediaStore';
import { useSettingsStore } from '../stores/settingsStore';
import { ScreenLayout } from '../components/ScreenLayout';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { GlassIcon } from '../components/GlassIcon';
import {
  getPlaybackSettings,
  savePlaybackSettings,
  getNotificationSettings,
  saveNotificationSettings,
  getSleepTimerSettings,
  saveSleepTimerSettings,
  getRemoveAds,
  setRemoveAds,
  getRecentlyPlayed,
  getRecentlyDeleted,
  clearRecentlyDeleted,
  removeFromRecentlyDeleted,
  restoreFromTrash,
  permanentlyDeleteTrashFile,
} from '../services/StorageService';
import type {
  PlaybackSettings,
  NotificationSettings,
  SleepTimerSettings,
  RecentlyPlayed,
  RecentlyDeleted,
} from '../types';
import { LayoutSize } from '../types';
import { audioEngine } from '../engine/AudioEngine';

import { PrivateFolderService } from '../services/PrivateFolderService';
import { StorageTrackingService } from '../services/StorageTrackingService';
import type { StorageSnapshot } from '../services/StorageTrackingService';
import { MMKV } from 'react-native-mmkv';
import * as DocumentPicker from 'expo-document-picker';
import Constants from 'expo-constants';
import { useGoogleDrive } from '../hooks/useGoogleDrive';
import {
  collectBackupData,
  restoreFromBackup,
  exportLocalBackup,
  getLocalBackups,
  loadLocalBackup,
  deleteLocalBackup,
  uploadBackupToDrive,
  listDriveBackups,
  downloadBackupFromDrive,
  deleteDriveBackup,
  uploadMediaToDrive,
} from '../services/BackupService';
import type { DriveFileInfo } from '../services/BackupService';

const APP_VERSION = '1.0.0';

type ActiveView =
  | 'list'
  | 'theme'
  | 'about'
  | 'language'
  | 'fonts'
  | 'hiddenFiles'
  | 'recentlyDeleted'
  | 'playback'
  | 'notification'
  | 'sleepTimer'
  | 'removeAds'
  | 'privateFolder'
  | 'futureUpdates'
  | 'backup'
  | 'storage';

export const SettingsScreen = React.memo(function SettingsScreen() {
  const {
    setBackgroundImage,
    clearBackgroundImage,
    setBackgroundBlur,
    setBackgroundFit,
    setBackgroundMode,
    setBackgroundBrightness,
    theme,
    setColorTheme,
    setSizeMode,
    isDarkMode,
    primaryColor,
    textColor,
    mutedColor,
    cardBg,
    borderColor,
    currentThemeKey,
    themePresets,
  } = useTheme();
  const { t, language, setLanguage, languages } = useLanguage();
  const { fontKey, setFont } = useFont();
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentlyPlayed[]>([]);
  const [recentlyDeleted, setRecentlyDeleted] = useState<RecentlyDeleted[]>([]);
  useEffect(() => {
    getRecentlyPlayed().then(setRecentlyPlayed);
  }, []);
  useEffect(() => {
    getRecentlyDeleted().then(setRecentlyDeleted);
  }, []);
  const [storageSnapshot, setStorageSnapshot] = useState<StorageSnapshot | null>(null);
  const storageAudio = useMediaStore((s) => s.audio);
  const storageVideo = useMediaStore((s) => s.videos);
  useEffect(() => {
    StorageTrackingService.collectSnapshot(storageAudio, storageVideo).then(setStorageSnapshot);
  }, [storageAudio, storageVideo]);
  const handleClearRecentlyDeleted = async () => {
    await clearRecentlyDeleted();
    setRecentlyDeleted([]);
  };
  const pickBg = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      const pickedUri = result.assets[0].uri;
      const ext = pickedUri.split('.').pop() || 'jpg';
      const dest = `${FileSystem.documentDirectory}background.${ext}`;
      const existing = await FileSystem.getInfoAsync(dest);
      if (existing.exists) await FileSystem.deleteAsync(dest);
      await FileSystem.copyAsync({ from: pickedUri, to: dest });
      await setBackgroundImage(dest);
    }
  }, [setBackgroundImage]);
  const hiddenFilesSettings = useSettingsStore((s) => s.hiddenFiles);
  const navigation = useAppNavigation();
  const mediaAudio = useMediaStore((s) => s.audio);
  const hiddenFiles = useMemo(() => {
    if (!hiddenFilesSettings.hideShortSongs) return [];
    const minMs = (hiddenFilesSettings.minDurationSeconds || 15) * 1000;
    return mediaAudio.filter((f) => f.duration !== undefined && f.duration < minMs);
  }, [mediaAudio, hiddenFilesSettings.hideShortSongs, hiddenFilesSettings.minDurationSeconds]);
  const hiddenFilesCount = hiddenFiles.length;
  const [activeView, setActiveView] = useState<ActiveView>('list');
  const [playbackSettings, setPlaybackSettingsState] = useState<PlaybackSettings>({
    playWithOtherApps: false,
    crossFade: false,
    crossFadeDuration: 3,
    gaplessPlayback: true,
  });
  const [notificationSettings, setNotificationSettingsState] = useState<NotificationSettings>({
    newMediaNotification: true,
    pushNotification: true,
  });
  const [sleepTimerSettings, setSleepTimerSettingsState] = useState<SleepTimerSettings>({
    enabled: false,
    mode: 'off',
    minutes: 30,
    playOneToEnd: false,
  });
  const [crossFadeInput, setCrossFadeInput] = useState('3');
  const [sleepMinutesInput, setSleepMinutesInput] = useState('30');
  const [adsRemoved, setAdsRemoved] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [driveBackups, setDriveBackups] = useState<DriveFileInfo[]>([]);
  const [localBackups, setLocalBackups] = useState<
    { name: string; path: string; createdAt: number }[]
  >([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [showDriveBackups, setShowDriveBackups] = useState(false);
  const [showLocalBackups, setShowLocalBackups] = useState(false);
  const [driveMedia, setDriveMedia] = useState<DriveFileInfo[]>([]);
  const [showDriveMedia, setShowDriveMedia] = useState(false);
  const [googleClientIdInput, setGoogleClientIdInput] = useState('');
  const [showClientIdModal, setShowClientIdModal] = useState(false);

  useEffect(() => {
    loadSettings();
    loadRemoveAds();
    const settingsMmkv = new MMKV({ id: 'settings' });
    const stored = settingsMmkv.getString('@google_client_id');
    if (stored) {
      setGoogleClientId(stored);
    } else {
      const defaultId = Constants.expoConfig?.extra?.GOOGLE_CLIENT_ID as string | undefined;
      if (defaultId) {
        setGoogleClientId(defaultId);
        settingsMmkv.set('@google_client_id', defaultId);
      }
    }
  }, []);

  async function loadRemoveAds() {
    const value = await getRemoveAds();
    setAdsRemoved(value);
  }

  async function loadSettings() {
    const [pb, nt, st] = await Promise.all([
      getPlaybackSettings(),
      getNotificationSettings(),
      getSleepTimerSettings(),
    ]);
    setPlaybackSettingsState(pb);
    setNotificationSettingsState(nt);
    setSleepTimerSettingsState(st);
    setCrossFadeInput(String(pb.crossFadeDuration));
    setSleepMinutesInput(String(st.minutes));
  }

  const appVersion = APP_VERSION;
  const googleDrive = useGoogleDrive(googleClientId);

  const totalPlaytime = useMemo(() => {
    let totalMs = 0;
    for (const item of recentlyPlayed) {
      const dur = item.file.duration || 0;
      totalMs += dur * item.playCount;
    }
    const totalSeconds = Math.floor(totalMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return hours > 0
      ? `${hours}h ${minutes}m ${seconds}s`
      : minutes > 0
        ? `${minutes}m ${seconds}s`
        : `${seconds}s`;
  }, [recentlyPlayed]);

  const SETTINGS_ITEMS = [
    { id: 'playtime', Icon: Clock, label: t('settings.playtime') },
    { id: 'theme', Icon: PaintBrush, label: t('settings.theme') },
    {
      id: 'hiddenFiles',
      Icon: EyeSlash,
      label: t('settings.hiddenFiles'),
      badge: hiddenFilesCount > 0 ? String(hiddenFilesCount) : undefined,
    },
    {
      id: 'recentlyDeleted',
      Icon: Trash,
      label: t('settings.recentlyDeleted'),
      badge: recentlyDeleted.length > 0 ? String(recentlyDeleted.length) : undefined,
    },
    { id: 'backup', Icon: CloudArrowUp, label: 'Backup & Restore' },
    { id: 'storage', Icon: HardDrives, label: 'Storage' },
    { id: 'playback', Icon: SlidersHorizontal, label: t('settings.playback') },
    { id: 'notification', Icon: Bell, label: t('settings.notification') },
    { id: 'sleepTimer', Icon: Moon, label: t('settings.sleepTimer') },
    { id: 'language', Icon: Translate, label: t('settings.language') },
    { id: 'fonts', Icon: TextAa, label: t('settings.fonts') },
    { id: 'privateFolder', Icon: Folder, label: 'Private Folder' },
    { id: 'feedback', Icon: ChatCenteredDots, label: t('settings.feedback') },
    { id: 'removeAds', Icon: ShieldCheck, label: t('settings.removeAds') },
    { id: 'share', Icon: ShareNetwork, label: 'Share Lumora' },
    { id: 'rate', Icon: Star, label: 'Rate Lumora' },
    { id: 'futureUpdates', Icon: Star, label: 'Future Updates' },
    { id: 'about', Icon: Info, label: t('settings.about') },
  ];

  const handleSettingPress = (id: string) => {
    switch (id) {
      case 'theme':
        setActiveView('theme');
        break;
      case 'futureUpdates':
        setActiveView('futureUpdates');
        break;
      case 'about':
        setActiveView('about');
        break;
      case 'language':
        setActiveView('language');
        break;
      case 'fonts':
        setActiveView('fonts');
        break;
      case 'hiddenFiles':
        setActiveView('hiddenFiles');
        break;
      case 'recentlyDeleted':
        setActiveView('recentlyDeleted');
        break;
      case 'playback':
        setActiveView('playback');
        break;
      case 'notification':
        setActiveView('notification');
        break;
      case 'sleepTimer':
        setActiveView('sleepTimer');
        break;
      case 'backup':
        setActiveView('backup');
        break;
      case 'privateFolder':
        navigation.navigate('PrivateFolder');
        break;
      case 'feedback':
        Linking.openURL('mailto:support@lumora.app?subject=Lumora%20Feedback');
        break;
      case 'removeAds':
        setActiveView('removeAds');
        break;
      case 'share':
        Share.share({
          message: 'Check out Lumora - a beautiful media player!',
          url: 'https://lumora.app',
        });
        break;
      case 'rate':
        Linking.openURL(
          Platform.OS === 'ios'
            ? 'https://apps.apple.com/app/id12345'
            : 'https://play.google.com/store/apps/details?id=com.lumora.app'
        );
        break;
      case 'storage':
        setActiveView('storage');
        break;
      case 'playtime':
        break;
    }
  };

  const updatePlaybackSetting = async (key: keyof PlaybackSettings, value: any) => {
    const updated = { ...playbackSettings, [key]: value };
    setPlaybackSettingsState(updated);
    await savePlaybackSettings(updated);
    if (key === 'crossFade' || key === 'crossFadeDuration') {
      audioEngine.setCrossfade(
        key === 'crossFade' ? value : playbackSettings.crossFade,
        key === 'crossFadeDuration' ? value : playbackSettings.crossFadeDuration
      );
    }
  };

  const updateNotificationSetting = async (key: keyof NotificationSettings, value: boolean) => {
    const updated = { ...notificationSettings, [key]: value };
    setNotificationSettingsState(updated);
    await saveNotificationSettings(updated);
  };

  const updateSleepTimerSetting = async (key: keyof SleepTimerSettings, value: any) => {
    const updated = { ...sleepTimerSettings, [key]: value };
    setSleepTimerSettingsState(updated);
    await saveSleepTimerSettings(updated);
  };

  const handleCrossFadeBlur = async () => {
    const val = parseInt(crossFadeInput) || 1;
    const clamped = Math.min(Math.max(val, 1), 10);
    setCrossFadeInput(String(clamped));
    await updatePlaybackSetting('crossFadeDuration', clamped);
  };

  const handleSleepMinutesBlur = async () => {
    const val = parseInt(sleepMinutesInput) || 5;
    const clamped = Math.min(Math.max(val, 1), 180);
    setSleepMinutesInput(String(clamped));
    await updateSleepTimerSetting('minutes', clamped);
  };

  const renderMainList = () => (
    <>
      {SETTINGS_ITEMS.map((item) => (
        <TouchableOpacity
          key={item.id}
          className="mb-2 flex-row items-center px-2 py-[14]"
          onPress={() => handleSettingPress(item.id)}>
          <GlassIcon size={36}>
            <item.Icon size={18} color={primaryColor} />
          </GlassIcon>
          <Text className="ml-[14] flex-1 text-[15px]" style={{ color: textColor }}>
            {item.label}
          </Text>
          {item.id === 'playtime' && totalPlaytime !== '0s' && (
            <Text className="mr-2 text-[13px]" style={{ color: mutedColor }}>
              {totalPlaytime}
            </Text>
          )}
          {item.badge && (
            <View
              className="mr-2 rounded-[10] px-2 py-0.5"
              style={{ backgroundColor: primaryColor + '20' }}>
              <Text className="text-xs font-semibold" style={{ color: primaryColor }}>
                {item.badge}
              </Text>
            </View>
          )}
          <Text className="text-[22px]" style={{ color: mutedColor }}>
            ›
          </Text>
        </TouchableOpacity>
      ))}
    </>
  );

  const renderThemeView = () => (
    <>
      <View className="mb-5 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => setActiveView('list')}
          className="h-11 w-11 items-center justify-center">
          <CaretLeft size={28} color={textColor} />
        </TouchableOpacity>
        <Text className="text-xl font-semibold" style={{ color: textColor }}>
          {t('settings.theme')}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Display Size Mode */}
      <Text className="mb-3 mt-2 text-lg font-semibold" style={{ color: textColor }}>
        Display Size
      </Text>
      <View
        className="mb-5 rounded-[28px] border p-2"
        style={{ borderColor, backgroundColor: cardBg }}>
        <View className="p-1">
          {(['small', 'medium', 'big'] as LayoutSize[]).map((mode) => {
            const labels = { small: 'Compact', medium: 'Comfortable', big: 'Large' };
            const descs = {
              small: 'Smaller artwork, more songs visible, tighter spacing',
              medium: 'Balanced UI, default experience',
              big: 'Bigger text and controls, better accessibility',
            };
            const active = theme.sizeMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                className="mb-1 flex-row items-center rounded-xl px-3 py-3"
                style={active ? { backgroundColor: primaryColor + '12' } : undefined}
                onPress={() => setSizeMode(mode)}>
                <View
                  className="mr-3 h-5 w-5 items-center justify-center rounded-full"
                  style={{
                    borderWidth: 2,
                    borderColor: active ? primaryColor : mutedColor,
                  }}>
                  {active && (
                    <View
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: primaryColor }}
                    />
                  )}
                </View>
                <View className="flex-1">
                  <Text
                    className="text-sm font-bold"
                    style={{ color: active ? primaryColor : textColor }}>
                    {labels[mode]}
                  </Text>
                  <Text className="mt-0.5 text-[11px]" style={{ color: mutedColor }}>
                    {descs[mode]}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Color Themes */}
      <Text className="mb-3 mt-2 text-lg font-semibold" style={{ color: textColor }}>
        Themes
      </Text>
      <View
        className="mb-5 rounded-[28px] border p-2"
        style={{ borderColor, backgroundColor: cardBg }}>
        <View className="flex-row flex-wrap gap-2 p-2">
          {themePresets.map((preset) => {
            const active = currentThemeKey === preset.key;
            return (
              <TouchableOpacity
                key={preset.key}
                className="w-[72] items-center rounded-xl border-2 py-[10]"
                style={active ? { borderColor: primaryColor } : { borderColor: 'transparent' }}
                onPress={() => setColorTheme(preset.key)}>
                <View
                  className="h-[40] w-[50] items-center justify-center overflow-hidden rounded-[10]"
                  style={{ backgroundColor: preset.background }}>
                  <View
                    className="absolute left-1 top-1 h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: preset.accent }}
                  />
                  <Text
                    className="text-[13px] font-bold leading-tight"
                    style={{ color: preset.text, marginTop: 4 }}>
                    Aa
                  </Text>
                  <Text className="text-[8px] leading-tight" style={{ color: mutedColor }}>
                    aa
                  </Text>
                </View>
                <Text
                  className="mt-1 text-center text-[9px] font-semibold leading-tight"
                  style={active ? { color: primaryColor } : { color: mutedColor }}
                  numberOfLines={1}>
                  {preset.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Background Image */}
      <Text className="mb-2 mt-5 text-sm font-semibold" style={{ color: textColor }}>
        Background Image
      </Text>
      <View className="mb-4 rounded-xl border p-3" style={{ borderColor, backgroundColor: cardBg }}>
        {theme.backgroundImageUri ? (
          <View>
            <View className="mb-2 flex-row gap-2">
              <View className="h-16 w-16 overflow-hidden rounded-lg">
                <Image
                  source={{ uri: theme.backgroundImageUri }}
                  className="h-full w-full"
                  style={{ resizeMode: 'cover' }}
                />
              </View>
              <View className="flex-1 justify-center gap-1.5">
                <Text className="text-xs font-semibold" style={{ color: textColor }}>
                  Background Set
                </Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    className="rounded-lg px-3 py-1.5"
                    style={{ backgroundColor: primaryColor + '20' }}
                    onPress={pickBg}>
                    <Text className="text-[11px] font-semibold" style={{ color: primaryColor }}>
                      Change
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="rounded-lg bg-red-500/20 px-3 py-1.5"
                    onPress={clearBackgroundImage}>
                    <Text className="text-[11px] font-semibold" style={{ color: '#ef4444' }}>
                      Remove
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <View className="mt-2 flex-row gap-1.5">
              <FitButton
                label="Fill"
                active={(theme.backgroundMode ?? 'fill') === 'fill'}
                primaryColor={primaryColor}
                mutedColor={mutedColor}
                onPress={() => setBackgroundMode('fill')}
              />
              <FitButton
                label="Wallpaper"
                active={(theme.backgroundMode ?? 'fill') === 'wallpaper'}
                primaryColor={primaryColor}
                mutedColor={mutedColor}
                onPress={() => setBackgroundMode('wallpaper')}
              />
              <FitButton
                label="Spotlight"
                active={(theme.backgroundMode ?? 'fill') === 'spotlight'}
                primaryColor={primaryColor}
                mutedColor={mutedColor}
                onPress={() => setBackgroundMode('spotlight')}
              />
            </View>
            {(theme.backgroundMode ?? 'fill') === 'wallpaper' && (
              <View className="mt-2 flex-row items-center gap-2">
                <Text className="w-8 text-[11px]" style={{ color: mutedColor }}>
                  Dim
                </Text>
                <SliderTrack
                  value={theme.backgroundBrightness ?? 50}
                  max={100}
                  primaryColor={primaryColor}
                  mutedColor={mutedColor}
                  onChange={setBackgroundBrightness}
                />
                <Text className="w-6 text-right text-[11px]" style={{ color: mutedColor }}>
                  {theme.backgroundBrightness ?? 50}
                </Text>
              </View>
            )}
            <View className="mt-2 flex-row items-center gap-2">
              <Text className="w-6 text-[11px]" style={{ color: mutedColor }}>
                Blur
              </Text>
              <SliderTrack
                value={theme.backgroundBlur ?? 0}
                max={100}
                primaryColor={primaryColor}
                mutedColor={mutedColor}
                onChange={setBackgroundBlur}
              />
              <Text className="w-6 text-right text-[11px]" style={{ color: mutedColor }}>
                {theme.backgroundBlur ?? 0}
              </Text>
            </View>
            <View className="mt-1.5 flex-row gap-2">
              <FitButton
                label="Cover"
                active={theme.backgroundImageFit === 'cover'}
                primaryColor={primaryColor}
                mutedColor={mutedColor}
                onPress={() => setBackgroundFit('cover')}
              />
              <FitButton
                label="Contain"
                active={theme.backgroundImageFit === 'contain'}
                primaryColor={primaryColor}
                mutedColor={mutedColor}
                onPress={() => setBackgroundFit('contain')}
              />
            </View>
          </View>
        ) : (
          <TouchableOpacity
            className="flex-row items-center gap-3 rounded-lg px-2 py-2.5"
            style={{ backgroundColor: mutedColor + '08' }}
            onPress={pickBg}>
            <View
              className="h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: primaryColor + '15' }}>
              <Text className="text-sm">🖼</Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs font-semibold" style={{ color: textColor }}>
                Choose background image
              </Text>
              <Text className="text-[10px]" style={{ color: mutedColor }}>
                HD quality — no compression
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  const renderAboutView = () => (
    <>
      <View className="mb-5 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => setActiveView('list')}
          className="h-11 w-11 items-center justify-center">
          <CaretLeft size={28} color={textColor} />
        </TouchableOpacity>
        <Text className="text-xl font-semibold" style={{ color: textColor }}>
          {t('about.title')}
        </Text>
        <View style={{ width: 44 }} />
      </View>
      <View
        className="mb-5 rounded-[28px] border p-2"
        style={{ borderColor, backgroundColor: cardBg }}>
        <Text className="mb-2 text-center text-2xl font-bold " style={{ color: textColor }}>
          Lumora
        </Text>
        <Text className="mb-4 text-center text-sm " style={{ color: mutedColor }}>
          {t('about.version', { version: appVersion })}
        </Text>
        <Text className="mb-6 text-center text-[15px] leading-[22] " style={{ color: textColor }}>
          {t('about.description')}
        </Text>
        <View>
          <Text className="mb-3 text-base font-semibold " style={{ color: textColor }}>
            {t('about.features')}:
          </Text>
          {[
            { Icon: MusicNotes, text: t('about.feature.music') },
            { Icon: VideoCamera, text: t('about.feature.video') },
            { Icon: PaintBrush, text: t('about.feature.theme') },
            { Icon: SquaresFour, text: t('about.feature.ui') },
            { Icon: SpeakerHigh, text: t('about.feature.accent') },
          ].map(({ Icon, text }) => (
            <View key={text} className="flex-row items-center py-1.5">
              <Icon size={16} color="rgba(255, 255, 255, 0.7)" />
              <Text className="ml-2 text-sm " style={{ color: textColor }}>
                {text}
              </Text>
            </View>
          ))}
        </View>
        <View className="mt-4 items-center border-t border-t-white/[0.06] pb-2 pt-6">
          <Image
            source={require('../assets/app.png')}
            className="mb-2 h-10 w-[120]"
            resizeMode="contain"
          />
          <Text
            className="mb-3 text-[13px] font-medium tracking-[0.5] "
            style={{ color: mutedColor }}>
            By Cadmus Labs
          </Text>
          <TouchableOpacity
            className="flex-row items-center gap-2 rounded-xl px-5 py-[10]"
            style={{ backgroundColor: primaryColor + '15' }}
            onPress={() =>
              Linking.openURL(
                Platform.OS === 'ios'
                  ? 'https://apps.apple.com/app/id12345'
                  : 'https://play.google.com/store/apps/details?id=com.lumora.app'
              )
            }>
            <Star size={16} color={primaryColor} weight="fill" />
            <Text className="text-sm font-semibold" style={{ color: primaryColor }}>
              Rate Lumora
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  const renderLanguageView = () => (
    <>
      <View className="mb-5 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => setActiveView('list')}
          className="h-11 w-11 items-center justify-center">
          <CaretLeft size={28} color={textColor} />
        </TouchableOpacity>
        <Text className="text-xl font-semibold" style={{ color: textColor }}>
          {t('settings.selectLanguage')}
        </Text>
        <View style={{ width: 44 }} />
      </View>
      <View
        className="mb-5 rounded-[28px] border p-2"
        style={{ borderColor, backgroundColor: cardBg }}>
        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            className="flex-row items-center border-b px-3 py-[14]"
            style={{ borderBottomColor: borderColor }}
            onPress={() => setLanguage(lang.code)}>
            <Text
              className="flex-1 text-base"
              style={language === lang.code ? { color: primaryColor } : { color: textColor }}>
              {lang.nativeName}
            </Text>
            <Text className="mr-3 text-[13px] " style={{ color: mutedColor }}>
              {lang.name}
            </Text>
            {language === lang.code && <Check size={20} color={primaryColor} weight="bold" />}
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  const renderFontsView = () => (
    <>
      <View className="mb-5 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => setActiveView('list')}
          className="h-11 w-11 items-center justify-center">
          <CaretLeft size={28} color={textColor} />
        </TouchableOpacity>
        <Text className="text-xl font-semibold" style={{ color: textColor }}>
          {t('settings.selectFont')}
        </Text>
        <View style={{ width: 44 }} />
      </View>
      <View
        className="mb-5 rounded-[28px] border p-2"
        style={{ borderColor, backgroundColor: cardBg }}>
        {FONT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            className="flex-row items-center border-b px-3 py-[14]"
            style={{ borderBottomColor: borderColor }}
            onPress={() => setFont(opt.key)}>
            <Text
              className="flex-1 text-base"
              style={fontKey === opt.key ? { color: primaryColor } : { color: textColor }}>
              {t(opt.labelKey)}
            </Text>
            {fontKey === opt.key && <Check size={20} color={primaryColor} weight="bold" />}
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  const renderHiddenFilesView = () => (
    <>
      <View className="mb-5 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => setActiveView('list')}
          className="h-11 w-11 items-center justify-center">
          <CaretLeft size={28} color={textColor} />
        </TouchableOpacity>
        <Text className="text-xl font-semibold" style={{ color: textColor }}>
          {t('settings.hiddenFiles')}
        </Text>
        <View style={{ width: 44 }} />
      </View>
      <View
        className="mb-5 rounded-[28px] border p-2"
        style={{ borderColor, backgroundColor: cardBg }}>
        <Text className="p-3 text-sm " style={{ color: mutedColor }}>
          {t('settings.hiddenFilesCount', { count: hiddenFilesCount })}
        </Text>
      </View>
      {hiddenFiles.length > 0 ? (
        <FlatList
          data={hiddenFiles}
          keyExtractor={(item) => item.uri}
          renderItem={({ item }) => (
            <View
              className="flex-row items-center gap-2.5 border-b px-2 py-[10]"
              style={{ borderBottomColor: borderColor }}>
              <MusicNotes size={18} color={mutedColor} />
              <View className="flex-1">
                <Text className="text-sm " style={{ color: textColor }} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.duration && (
                  <Text className="mt-0.5 text-xs " style={{ color: mutedColor }}>
                    {Math.floor(item.duration / 1000)}s
                  </Text>
                )}
              </View>
            </View>
          )}
          scrollEnabled={false}
        />
      ) : (
        <Text className="py-5 text-center text-sm " style={{ color: mutedColor }}>
          No hidden files
        </Text>
      )}
    </>
  );

  const renderRecentlyDeletedView = () => (
    <>
      <View className="mb-5 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => setActiveView('list')}
          className="h-11 w-11 items-center justify-center">
          <CaretLeft size={28} color={textColor} />
        </TouchableOpacity>
        <Text className="text-xl font-semibold" style={{ color: textColor }}>
          {t('settings.recentlyDeleted')}
        </Text>
        <View style={{ width: 44 }} />
      </View>
      {recentlyDeleted.length > 0 && (
        <TouchableOpacity className="mb-2 self-end px-4 py-2" onPress={handleClearRecentlyDeleted}>
          <Text className="text-sm font-semibold" style={{ color: '#ef4444' }}>
            Clear All
          </Text>
        </TouchableOpacity>
      )}
      <View
        className="mb-5 rounded-[28px] border p-2"
        style={{ borderColor, backgroundColor: cardBg }}>
        <Text className="p-3 text-sm " style={{ color: mutedColor }}>
          {t('settings.recentlyDeletedCount', { count: recentlyDeleted.length })}
        </Text>
      </View>
      {recentlyDeleted.length > 0 ? (
        <FlatList
          data={recentlyDeleted}
          keyExtractor={(item, idx) => item.file.uri + idx}
          renderItem={({ item }) => (
            <View
              className="flex-row items-center gap-2.5 border-b px-2 py-[10]"
              style={{ borderBottomColor: borderColor, flexWrap: 'wrap' }}>
              <Trash size={18} color={mutedColor} />
              <View className="flex-1">
                <Text className="text-sm " style={{ color: textColor }} numberOfLines={1}>
                  {item.file.name}
                </Text>
                <Text className="mt-0.5 text-xs " style={{ color: mutedColor }}>
                  {new Date(item.deletedAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginLeft: 40, marginTop: 6 }}>
                <TouchableOpacity
                  className="rounded-lg px-3 py-1.5"
                  style={{ backgroundColor: `${primaryColor}15` }}
                  onPress={async () => {
                    const ok = await restoreFromTrash(item.file.uri);
                    if (ok) {
                      await removeFromRecentlyDeleted(item.file.uri);
                      setRecentlyDeleted(await getRecentlyDeleted());
                      Alert.alert('Restored', 'File has been restored to its original location.');
                    } else {
                      await removeFromRecentlyDeleted(item.file.uri);
                      setRecentlyDeleted(await getRecentlyDeleted());
                      Alert.alert(
                        'Info',
                        'File entry removed. The original file could not be restored (no trash backup found).'
                      );
                    }
                  }}>
                  <Text className="text-xs font-semibold" style={{ color: primaryColor }}>
                    Restore
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="rounded-lg px-3 py-1.5"
                  style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}
                  onPress={async () => {
                    Alert.alert(
                      'Permanently Delete',
                      'This will permanently delete the backed-up file. This cannot be undone.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: async () => {
                            await permanentlyDeleteTrashFile(item.file.uri);
                            await removeFromRecentlyDeleted(item.file.uri);
                            setRecentlyDeleted(await getRecentlyDeleted());
                          },
                        },
                      ]
                    );
                  }}>
                  <Text className="text-xs font-semibold" style={{ color: '#ef4444' }}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          scrollEnabled={false}
        />
      ) : (
        <Text className="py-5 text-center text-sm " style={{ color: mutedColor }}>
          No recently deleted files
        </Text>
      )}
    </>
  );

  const [privateFolderInfo, setPrivateFolderInfo] = useState({ fileCount: 0, totalSize: 0 });
  const [privateFolderExists, setPrivateFolderExists] = useState(false);
  const [privateFilesList, setPrivateFilesList] = useState<any[]>([]);
  const [privateFolderUnlocked, setPrivateFolderUnlocked] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [showPasscodePrompt, setShowPasscodePrompt] = useState(false);
  const [passcodeMode, setPasscodeMode] = useState<'create' | 'unlock' | 'delete' | 'change'>(
    'unlock'
  );
  const [confirmStep, setConfirmStep] = useState(false);
  const [canUseBio, setCanUseBio] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      const exists = await PrivateFolderService.isSetup();
      setPrivateFolderExists(exists);
      setPrivateFolderUnlocked(!exists);
      if (exists) {
        const info = await PrivateFolderService.getFolderInfo();
        setPrivateFolderInfo(info);
        const files = await PrivateFolderService.getPrivateFiles();
        setPrivateFilesList(files);
        const bioAvail = await PrivateFolderService.canUseBiometrics();
        setCanUseBio(bioAvail);
        const bioEn = await PrivateFolderService.isBiometricsEnabled();
        setBioEnabled(bioEn);
      }
    })();
  }, [activeView]);

  const handlePasscodeSubmit = async () => {
    if (passcodeMode === 'create') {
      if (!confirmStep) {
        if (passcodeInput.length < 4) {
          Alert.alert('Error', 'Passcode must be at least 4 digits.');
          return;
        }
        setConfirmStep(true);
        setConfirmPasscode(passcodeInput);
        setPasscodeInput('');
        return;
      }
      if (passcodeInput !== confirmPasscode) {
        Alert.alert('Error', 'Passcodes do not match. Try again.');
        setPasscodeInput('');
        setConfirmStep(false);
        setConfirmPasscode('');
        return;
      }
      const ok = await PrivateFolderService.setupFolder(passcodeInput);
      if (ok) {
        setPrivateFolderExists(true);
        setPrivateFolderUnlocked(true);
        const info = await PrivateFolderService.getFolderInfo();
        setPrivateFolderInfo(info);
        setShowPasscodePrompt(false);
        setConfirmStep(false);
        setPasscodeInput('');
        setConfirmPasscode('');
        Alert.alert('Created', 'Private folder has been created successfully.');
      } else {
        Alert.alert('Error', 'Failed to create private folder. Please check storage permissions.');
      }
    } else if (passcodeMode === 'unlock') {
      const valid = await PrivateFolderService.verifyPasscode(passcodeInput);
      if (valid) {
        setPrivateFolderUnlocked(true);
        setShowPasscodePrompt(false);
        setPasscodeInput('');
      } else {
        setPasscodeInput('');
        Alert.alert('Error', 'Incorrect passcode.');
      }
    } else if (passcodeMode === 'delete') {
      const ok = await PrivateFolderService.deleteFolder(passcodeInput);
      if (ok) {
        setPrivateFolderExists(false);
        setPrivateFolderUnlocked(false);
        setPrivateFilesList([]);
        setShowPasscodePrompt(false);
        setPasscodeInput('');
      } else {
        setPasscodeInput('');
        Alert.alert('Error', 'Incorrect passcode. Folder was not deleted.');
      }
    } else if (passcodeMode === 'change') {
      if (!confirmStep) {
        const valid = await PrivateFolderService.verifyPasscode(passcodeInput);
        if (valid) {
          setConfirmStep(true);
          setConfirmPasscode(passcodeInput);
          setPasscodeInput('');
        } else {
          setPasscodeInput('');
          Alert.alert('Error', 'Incorrect current passcode.');
        }
        return;
      }
      if (passcodeInput.length < 4) {
        Alert.alert('Error', 'New passcode must be at least 4 digits.');
        return;
      }
      const ok = await PrivateFolderService.changePasscode(confirmPasscode, passcodeInput);
      if (ok) {
        setShowPasscodePrompt(false);
        setConfirmStep(false);
        setPasscodeInput('');
        setConfirmPasscode('');
        Alert.alert('Changed', 'Passcode has been updated successfully.');
      } else {
        Alert.alert('Error', 'Failed to change passcode.');
      }
    }
  };

  const renderPrivateFolderView = () => (
    <>
      <View className="mb-5 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => setActiveView('list')}
          className="h-11 w-11 items-center justify-center">
          <CaretLeft size={28} color={textColor} />
        </TouchableOpacity>
        <Text className="text-xl font-semibold" style={{ color: textColor }}>
          Private Folder
        </Text>
        <View style={{ width: 44 }} />
      </View>
      {!privateFolderExists ? (
        <View
          className="mb-5 rounded-[28px] border p-2"
          style={{ borderColor, backgroundColor: cardBg }}>
          <Text className="p-4 text-center text-sm leading-[22] " style={{ color: mutedColor }}>
            Create a private folder on your device to hide sensitive files from the main library.
            Files in this folder will only appear when accessed from this screen.
          </Text>
          <TouchableOpacity
            className="mx-4 mb-4 flex-row items-center justify-center gap-2 rounded-xl py-[14]"
            style={{ backgroundColor: primaryColor }}
            onPress={() => {
              setPasscodeMode('create');
              setPasscodeInput('');
              setShowPasscodePrompt(true);
            }}>
            <Folder size={20} color="#06060B" weight="bold" />
            <Text
              className="text-[15px] font-bold"
              style={{ color: isDarkMode ? '#06060B' : '#ffffff' }}>
              Create Private Folder
            </Text>
          </TouchableOpacity>
        </View>
      ) : !privateFolderUnlocked ? (
        <View
          className="mb-5 rounded-[28px] border p-2"
          style={{ borderColor, backgroundColor: cardBg }}>
          <Text className="p-4 text-center text-sm leading-[22] " style={{ color: mutedColor }}>
            Enter your passcode to access the private folder.
          </Text>
          <TouchableOpacity
            className="mx-4 mb-4 flex-row items-center justify-center gap-2 rounded-xl py-[14]"
            style={{ backgroundColor: primaryColor }}
            onPress={() => {
              setPasscodeMode('unlock');
              setPasscodeInput('');
              setShowPasscodePrompt(true);
            }}>
            <LockSimple size={20} color="#06060B" weight="bold" />
            <Text
              className="text-[15px] font-bold"
              style={{ color: isDarkMode ? '#06060B' : '#ffffff' }}>
              Unlock
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View
            className="mb-5 rounded-[28px] border p-2"
            style={{ borderColor, backgroundColor: cardBg }}>
            <View style={{ padding: 12, gap: 6 }}>
              <Text className="p-3 text-sm" style={{ padding: 0, color: mutedColor }}>
                {privateFilesList.length} file{privateFilesList.length !== 1 ? 's' : ''} in private
                folder
              </Text>
              <Text className="px-3 text-xs" style={{ paddingHorizontal: 12, color: mutedColor }}>
                Size: {(privateFolderInfo.totalSize / 1024 / 1024).toFixed(1)} MB
              </Text>
            </View>
            <TouchableOpacity
              className="mx-4 flex-row items-center justify-center gap-2 rounded-xl py-[14]"
              style={{
                backgroundColor: `${primaryColor}20`,
                marginHorizontal: 16,
              }}
              onPress={() => {
                setPasscodeMode('change');
                setConfirmStep(false);
                setPasscodeInput('');
                setConfirmPasscode('');
                setShowPasscodePrompt(true);
              }}>
              <LockSimple size={16} color={primaryColor} />
              <Text className="text-sm font-semibold" style={{ color: primaryColor }}>
                Change Passcode
              </Text>
            </TouchableOpacity>
            {canUseBio && (
              <TouchableOpacity
                className="mx-4 mt-2 flex-row items-center justify-center gap-2 rounded-xl py-[14]"
                style={{
                  backgroundColor: bioEnabled ? `${primaryColor}20` : 'rgba(255,255,255,0.05)',
                  marginHorizontal: 16,
                }}
                onPress={async () => {
                  const next = !bioEnabled;
                  await PrivateFolderService.setBiometricsEnabled(next);
                  setBioEnabled(next);
                }}>
                <Fingerprint size={16} color={bioEnabled ? primaryColor : mutedColor} />
                <Text
                  className="text-sm font-semibold"
                  style={{ color: bioEnabled ? primaryColor : mutedColor }}>
                  {bioEnabled ? 'Biometrics On' : 'Biometrics Off'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              className="mx-4 mb-4 mt-2 flex-row items-center justify-center gap-2 rounded-xl py-[14]"
              style={{
                backgroundColor: 'rgba(239,68,68,0.15)',
                marginHorizontal: 16,
                marginBottom: 16,
              }}
              onPress={() => {
                Alert.alert(
                  'Delete Private Folder',
                  'This will permanently delete the folder and all files in it. This cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => {
                        setPasscodeMode('delete');
                        setPasscodeInput('');
                        setShowPasscodePrompt(true);
                      },
                    },
                  ]
                );
              }}>
              <Trash size={16} color="#ef4444" />
              <Text className="text-sm font-semibold" style={{ color: '#ef4444' }}>
                Delete Private Folder
              </Text>
            </TouchableOpacity>
          </View>
          {privateFilesList.length > 0 && (
            <View
              className="mb-5 rounded-[28px] border p-2"
              style={{ borderColor, backgroundColor: cardBg }}>
              <Text className="p-3 text-sm font-bold " style={{ color: textColor }}>
                Files
              </Text>
              {privateFilesList.map((pf) => (
                <View
                  key={pf.uri}
                  className="flex-row items-center gap-2.5 border-b px-2 py-[10]"
                  style={{ borderBottomColor: borderColor }}>
                  <Folder size={18} color={mutedColor} />
                  <View className="flex-1">
                    <Text className="text-sm " style={{ color: textColor }} numberOfLines={1}>
                      {pf.name}
                    </Text>
                    <Text className="mt-0.5 text-xs " style={{ color: mutedColor }}>
                      {new Date(pf.addedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    className="rounded-lg px-3 py-1.5"
                    style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}
                    onPress={async () => {
                      await PrivateFolderService.removeFile(pf.uri);
                      const files = await PrivateFolderService.getPrivateFiles();
                      setPrivateFilesList(files);
                      const info = await PrivateFolderService.getFolderInfo();
                      setPrivateFolderInfo(info);
                    }}>
                    <Text className="text-xs font-semibold" style={{ color: '#ef4444' }}>
                      Remove
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      <Modal
        visible={showPasscodePrompt}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowPasscodePrompt(false);
          setPasscodeInput('');
          setConfirmStep(false);
          setConfirmPasscode('');
        }}>
        <View
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View
            className="w-[280] rounded-[28px] p-6"
            style={{ backgroundColor: cardBg, borderWidth: 1, borderColor }}>
            <Text className="mb-4 text-center text-lg font-bold" style={{ color: textColor }}>
              {passcodeMode === 'create' && !confirmStep
                ? 'Set Passcode'
                : passcodeMode === 'create' && confirmStep
                  ? 'Confirm Passcode'
                  : passcodeMode === 'change' && !confirmStep
                    ? 'Enter Current Passcode'
                    : passcodeMode === 'change' && confirmStep
                      ? 'Enter New Passcode'
                      : passcodeMode === 'delete'
                        ? 'Confirm Passcode'
                        : 'Enter Passcode'}
            </Text>
            <TextInput
              className="mb-4 rounded-xl px-4 py-3 text-center text-lg tracking-[8]"
              style={{ backgroundColor: isDarkMode ? '#27272a' : '#f4f4f5', color: textColor }}
              placeholder="· · · ·"
              placeholderTextColor={mutedColor}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={6}
              value={passcodeInput}
              onChangeText={(t) => {
                setPasscodeInput(t);
                if (t.length === 6 && (passcodeMode === 'unlock' || passcodeMode === 'delete')) {
                  PrivateFolderService.verifyPasscode(t).then((valid) => {
                    if (valid) {
                      if (passcodeMode === 'unlock') {
                        setPrivateFolderUnlocked(true);
                        setShowPasscodePrompt(false);
                        setPasscodeInput('');
                      } else {
                        PrivateFolderService.deleteFolder(t).then((ok) => {
                          if (ok) {
                            setPrivateFolderExists(false);
                            setPrivateFolderUnlocked(false);
                            setPrivateFilesList([]);
                            setShowPasscodePrompt(false);
                            setPasscodeInput('');
                          } else {
                            setPasscodeInput('');
                            Alert.alert('Error', 'Incorrect passcode. Folder was not deleted.');
                          }
                        });
                      }
                    } else {
                      setPasscodeInput('');
                      Alert.alert('Error', 'Incorrect passcode.');
                    }
                  });
                }
              }}
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 items-center rounded-xl py-3"
                style={{ backgroundColor: isDarkMode ? '#3f3f46' : '#e4e4e7' }}
                onPress={() => {
                  setShowPasscodePrompt(false);
                  setPasscodeInput('');
                  setConfirmStep(false);
                  setConfirmPasscode('');
                }}>
                <Text className="text-sm font-semibold" style={{ color: mutedColor }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center rounded-xl py-3"
                style={{ backgroundColor: primaryColor }}
                onPress={handlePasscodeSubmit}>
                <Text
                  className="text-sm font-bold"
                  style={{ color: isDarkMode ? '#06060B' : '#ffffff' }}>
                  {passcodeMode === 'create' && confirmStep ? 'Create' : 'Confirm'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );

  const renderPlaybackView = () => (
    <>
      <View className="mb-5 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => setActiveView('list')}
          className="h-11 w-11 items-center justify-center">
          <CaretLeft size={28} color={textColor} />
        </TouchableOpacity>
        <Text className="text-xl font-semibold" style={{ color: textColor }}>
          {t('settings.playback')}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <View
        className="mb-5 rounded-[28px] border p-2"
        style={{ borderColor, backgroundColor: cardBg }}>
        <View
          className="flex-row items-center justify-between border-b px-2 py-3"
          style={{ borderBottomColor: borderColor }}>
          <View className="mr-3 flex-1">
            <Text className="ml-[14] flex-1 text-[15px] " style={{ color: textColor }}>
              {t('settings.playWithOtherApps')}
            </Text>
            <Text className="ml-[14] mt-0.5 text-xs " style={{ color: mutedColor }}>
              {t('settings.playWithOtherAppsDesc')}
            </Text>
          </View>
          <Switch
            value={playbackSettings.playWithOtherApps}
            onValueChange={(v) => updatePlaybackSetting('playWithOtherApps', v)}
            trackColor={{ false: '#3f3f46', true: primaryColor }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      <View
        className="mb-5 rounded-[28px] border p-2"
        style={{ borderColor, backgroundColor: cardBg }}>
        <View
          className="flex-row items-center justify-between border-b px-2 py-3"
          style={{ borderBottomColor: borderColor }}>
          <View className="mr-3 flex-1">
            <Text className="ml-[14] flex-1 text-[15px] " style={{ color: textColor }}>
              {t('settings.crossFade')}
            </Text>
            <Text className="ml-[14] mt-0.5 text-xs " style={{ color: mutedColor }}>
              {t('settings.crossFadeDesc')}
            </Text>
          </View>
          <Switch
            value={playbackSettings.crossFade}
            onValueChange={(v) => updatePlaybackSetting('crossFade', v)}
            trackColor={{ false: '#3f3f46', true: primaryColor }}
            thumbColor="#ffffff"
          />
        </View>
        {playbackSettings.crossFade && (
          <View className="flex-row items-center justify-between px-2 py-[10] pl-[22]">
            <Text className="text-sm " style={{ color: mutedColor }}>
              {t('settings.crossFadeDuration')}
            </Text>
            <View className="flex-row items-center gap-1.5">
              <TextInput
                className="w-[60] rounded-lg px-3 py-1.5 text-center text-sm "
                style={{ color: textColor, backgroundColor: cardBg }}
                value={crossFadeInput}
                onChangeText={setCrossFadeInput}
                onBlur={handleCrossFadeBlur}
                keyboardType="numeric"
                selectTextOnFocus
              />
              <Text className="text-[13px] " style={{ color: mutedColor }}>
                {t('settings.seconds')}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View
        className="mb-5 rounded-[28px] border p-2"
        style={{ borderColor, backgroundColor: cardBg }}>
        <View className="flex-row items-center justify-between px-2 py-3">
          <View className="mr-3 flex-1">
            <Text className="ml-[14] flex-1 text-[15px] " style={{ color: textColor }}>
              {t('settings.gaplessPlayback')}
            </Text>
          </View>
          <Switch
            value={playbackSettings.gaplessPlayback}
            onValueChange={(v) => updatePlaybackSetting('gaplessPlayback', v)}
            trackColor={{ false: '#3f3f46', true: primaryColor }}
            thumbColor="#ffffff"
          />
        </View>
      </View>
    </>
  );

  const renderNotificationView = () => (
    <>
      <View className="mb-5 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => setActiveView('list')}
          className="h-11 w-11 items-center justify-center">
          <CaretLeft size={28} color={textColor} />
        </TouchableOpacity>
        <Text className="text-xl font-semibold" style={{ color: textColor }}>
          {t('settings.notifications')}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <Text className="mb-3 mt-2 text-lg font-semibold " style={{ color: textColor }}>
        {t('settings.notification')}
      </Text>
      <View
        className="mb-5 rounded-[28px] border p-2"
        style={{ borderColor, backgroundColor: cardBg }}>
        <View
          className="flex-row items-center justify-between border-b px-2 py-3"
          style={{ borderBottomColor: borderColor }}>
          <Text className="ml-[14] flex-1 text-[15px] " style={{ color: textColor }}>
            {t('settings.newMediaNotification')}
          </Text>
          <Switch
            value={notificationSettings.newMediaNotification}
            onValueChange={(v) => updateNotificationSetting('newMediaNotification', v)}
            trackColor={{ false: '#3f3f46', true: primaryColor }}
            thumbColor="#ffffff"
          />
        </View>
        <View className="flex-row items-center justify-between px-2 py-3">
          <Text className="ml-[14] flex-1 text-[15px] " style={{ color: textColor }}>
            {t('settings.pushNotification')}
          </Text>
          <Switch
            value={notificationSettings.pushNotification}
            onValueChange={(v) => updateNotificationSetting('pushNotification', v)}
            trackColor={{ false: '#3f3f46', true: primaryColor }}
            thumbColor="#ffffff"
          />
        </View>
      </View>
    </>
  );

  const renderSleepTimerView = () => (
    <>
      <View className="mb-5 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => setActiveView('list')}
          className="h-11 w-11 items-center justify-center">
          <CaretLeft size={28} color={textColor} />
        </TouchableOpacity>
        <Text className="text-xl font-semibold" style={{ color: textColor }}>
          {t('settings.sleepTimer')}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <View
        className="mb-5 rounded-[28px] border p-2"
        style={{ borderColor, backgroundColor: cardBg }}>
        <TouchableOpacity
          className="mb-1 flex-row items-center gap-2.5 rounded-xl px-3 py-[14]"
          style={sleepTimerSettings.mode === 'off' && { backgroundColor: `${primaryColor}15` }}
          onPress={() => updateSleepTimerSetting('mode', 'off')}>
          <Timer size={20} color={sleepTimerSettings.mode === 'off' ? primaryColor : mutedColor} />
          <Text
            className="flex-1 text-[15px]"
            style={
              sleepTimerSettings.mode === 'off' ? { color: primaryColor } : { color: textColor }
            }>
            {t('settings.sleepTimerOff')}
          </Text>
          {sleepTimerSettings.mode === 'off' && <Check size={18} color={primaryColor} />}
        </TouchableOpacity>

        <TouchableOpacity
          className="mb-1 flex-row items-center gap-2.5 rounded-xl px-3 py-[14]"
          style={sleepTimerSettings.mode === 'minutes' && { backgroundColor: `${primaryColor}15` }}
          onPress={() => updateSleepTimerSetting('mode', 'minutes')}>
          <Timer
            size={20}
            color={sleepTimerSettings.mode === 'minutes' ? primaryColor : mutedColor}
          />
          <Text
            className="flex-1 text-[15px]"
            style={
              sleepTimerSettings.mode === 'minutes' ? { color: primaryColor } : { color: textColor }
            }>
            {t('settings.sleepTimerMinutes')}
          </Text>
          {sleepTimerSettings.mode === 'minutes' && <Check size={18} color={primaryColor} />}
        </TouchableOpacity>

        {sleepTimerSettings.mode === 'minutes' && (
          <View className="flex-row items-center justify-between px-2 py-[10] pl-[22]">
            <Text className="text-sm " style={{ color: mutedColor }}>
              {t('settings.sleepTimerCustom')}
            </Text>
            <View className="flex-row items-center gap-1.5">
              <TextInput
                className="w-[60] rounded-lg px-3 py-1.5 text-center text-sm "
                style={{ color: textColor, backgroundColor: cardBg }}
                value={sleepMinutesInput}
                onChangeText={setSleepMinutesInput}
                onBlur={handleSleepMinutesBlur}
                keyboardType="numeric"
                selectTextOnFocus
              />
              <Text className="text-[13px] " style={{ color: mutedColor }}>
                {t('settings.sleepTimerMinutes')}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          className="mb-1 flex-row items-center gap-2.5 rounded-xl px-3 py-[14]"
          style={
            sleepTimerSettings.mode === 'endOfTrack' && { backgroundColor: `${primaryColor}15` }
          }
          onPress={() => updateSleepTimerSetting('mode', 'endOfTrack')}>
          <MusicNotes
            size={20}
            color={sleepTimerSettings.mode === 'endOfTrack' ? primaryColor : mutedColor}
          />
          <Text
            className="flex-1 text-[15px]"
            style={
              sleepTimerSettings.mode === 'endOfTrack'
                ? { color: primaryColor }
                : { color: textColor }
            }>
            {t('settings.sleepTimerEndOfTrack')}
          </Text>
          {sleepTimerSettings.mode === 'endOfTrack' && <Check size={18} color={primaryColor} />}
        </TouchableOpacity>

        <TouchableOpacity
          className="mb-1 flex-row items-center gap-2.5 rounded-xl px-3 py-[14]"
          style={
            sleepTimerSettings.mode === 'endOfQueue' && { backgroundColor: `${primaryColor}15` }
          }
          onPress={() => updateSleepTimerSetting('mode', 'endOfQueue')}>
          <MusicNotes
            size={20}
            color={sleepTimerSettings.mode === 'endOfQueue' ? primaryColor : mutedColor}
          />
          <Text
            className="flex-1 text-[15px]"
            style={
              sleepTimerSettings.mode === 'endOfQueue'
                ? { color: primaryColor }
                : { color: textColor }
            }>
            {t('settings.sleepTimerEndOfQueue')}
          </Text>
          {sleepTimerSettings.mode === 'endOfQueue' && <Check size={18} color={primaryColor} />}
        </TouchableOpacity>
      </View>

      <View
        className="mb-5 rounded-[28px] border p-2"
        style={{ borderColor, backgroundColor: cardBg }}>
        <View className="flex-row items-center justify-between px-2 py-3">
          <View className="mr-3 flex-1">
            <Text className="ml-[14] flex-1 text-[15px] " style={{ color: textColor }}>
              {t('settings.playOneToEnd')}
            </Text>
            <Text className="ml-[14] mt-0.5 text-xs " style={{ color: mutedColor }}>
              {t('settings.playOneToEndDesc')}
            </Text>
          </View>
          <Switch
            value={sleepTimerSettings.playOneToEnd}
            onValueChange={(v) => updateSleepTimerSetting('playOneToEnd', v)}
            trackColor={{ false: '#3f3f46', true: primaryColor }}
            thumbColor="#ffffff"
          />
        </View>
      </View>
    </>
  );

  const renderRemoveAdsView = () => (
    <>
      <View className="mb-5 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => setActiveView('list')}
          className="h-11 w-11 items-center justify-center">
          <CaretLeft size={28} color={textColor} />
        </TouchableOpacity>
        <Text className="text-xl font-semibold" style={{ color: textColor }}>
          {t('settings.removeAds')}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <View
        className="mb-5 rounded-[28px] border p-2"
        style={{ borderColor, backgroundColor: cardBg }}>
        <View className="items-center gap-3 py-8">
          <ShieldCheck
            size={64}
            color={adsRemoved ? primaryColor : mutedColor}
            weight={adsRemoved ? 'fill' : 'regular'}
          />
          <Text
            className="text-[22px] font-bold"
            style={adsRemoved ? { color: primaryColor } : { color: textColor }}>
            {adsRemoved ? t('settings.removeAdsPurchased') : t('settings.removeAdsPurchase')}
          </Text>
          <Text className="px-5 text-center text-sm " style={{ color: mutedColor }}>
            {t('settings.removeAdsDesc')}
          </Text>
        </View>

        {!adsRemoved && (
          <TouchableOpacity
            className="mx-4 mb-3 items-center rounded-xl py-4"
            style={{ backgroundColor: primaryColor }}
            onPress={async () => {
              await setRemoveAds(true);
              setAdsRemoved(true);
            }}>
            <Text
              className="text-base font-bold"
              style={{ color: isDarkMode ? '#06060B' : '#ffffff' }}>
              {t('settings.removeAdsPurchase')}
            </Text>
          </TouchableOpacity>
        )}

        {adsRemoved && (
          <View
            className="mx-4 mb-3 flex-row items-center justify-center gap-2 rounded-xl py-4"
            style={{ backgroundColor: primaryColor + '15' }}>
            <Check size={20} color={primaryColor} weight="bold" />
            <Text className="text-base font-bold" style={{ color: primaryColor }}>
              {t('settings.removeAdsPurchased')}
            </Text>
          </View>
        )}

        <TouchableOpacity
          className="mb-2 items-center py-[14]"
          onPress={async () => {
            const value = await getRemoveAds();
            setAdsRemoved(value);
            if (value) {
              Alert.alert('Restored', 'Your purchase has been restored.');
            } else {
              Alert.alert('No Purchase Found', 'No previous purchase was found to restore.');
            }
          }}>
          <Text className="text-sm font-medium " style={{ color: mutedColor }}>
            {t('settings.removeAdsRestore')}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const FUTURE_UPDATES: { Icon: any; title: string; desc: string }[] = [
    {
      Icon: MusicNotes,
      title: 'Lyrics & Karaoke',
      desc: 'Synced lyrics display with auto-fetch and karaoke-style highlighting',
    },
    {
      Icon: SlidersHorizontal,
      title: '10-Band Equalizer',
      desc: 'Professional EQ with custom presets, bass boost, and reverb effects',
    },
    {
      Icon: VideoCamera,
      title: 'Chromecast & AirPlay',
      desc: 'Stream media to TV and speakers via Chromecast, AirPlay, and DLNA',
    },
    {
      Icon: ShareNetwork,
      title: 'Local Network Share',
      desc: 'Share/receive media between devices on the same Wi-Fi network',
    },
    {
      Icon: SquaresFour,
      title: 'Smart Playlists',
      desc: 'Auto-generated playlists by genre, mood, play count, and habits',
    },
    {
      Icon: Globe,
      title: 'Full Offline Mode',
      desc: 'Download from cloud, stream from Plex, Jellyfin, and SMB shares',
    },
    {
      Icon: Bell,
      title: 'Podcast Support',
      desc: 'Podcast discovery, subscriptions, and episode auto-downloads',
    },
    {
      Icon: Timer,
      title: 'Advanced Sleep Timer',
      desc: 'Fade-out volume, smart quiet-section detection, scheduled times',
    },
    {
      Icon: PaintBrush,
      title: 'Live Wallpaper Backdrops',
      desc: 'Animated/motion wallpapers as app background',
    },
    {
      Icon: Translate,
      title: 'More Languages',
      desc: 'Arabic, Hindi, Bengali, Turkish, Vietnamese, and more',
    },
    {
      Icon: TextAa,
      title: 'Custom Font Upload',
      desc: 'Import .ttf font files in-app without rebuilding',
    },
    {
      Icon: Star,
      title: 'Android Auto & CarPlay',
      desc: 'Optimized driving interface with voice control',
    },
    {
      Icon: MusicNotes,
      title: 'Crossfade Playback',
      desc: 'Seamless track transitions with configurable duration',
    },
  ];

  const renderFutureUpdatesView = () => (
    <>
      <View className="mb-5 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => setActiveView('list')}
          className="h-11 w-11 items-center justify-center">
          <CaretLeft size={28} color={textColor} />
        </TouchableOpacity>
        <Text className="text-xl font-semibold" style={{ color: textColor }}>
          Future Updates
        </Text>
        <View style={{ width: 44 }} />
      </View>
      <Text className="mb-4 px-1 text-[13px] " style={{ color: mutedColor }}>
        Features planned for upcoming releases. Vote and suggest on our GitHub.
      </Text>
      <View
        className="mb-5 rounded-[28px] border p-2"
        style={{ borderColor, backgroundColor: cardBg }}>
        {FUTURE_UPDATES.map((item, idx) => (
          <View
            key={idx}
            className="flex-row items-center border-b px-2 py-[14]"
            style={[
              { borderBottomColor: borderColor },
              idx === FUTURE_UPDATES.length - 1 && { borderBottomWidth: 0 },
            ]}>
            <item.Icon size={22} color={primaryColor} />
            <View className="ml-[14] flex-1">
              <Text
                className="ml-[14] flex-1 text-[15px]"
                style={{ color: textColor, marginLeft: 0 }}>
                {item.title}
              </Text>
              <Text className="mt-0.5 text-xs" style={{ color: mutedColor, marginLeft: 0 }}>
                {item.desc}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );

  const renderBackupView = () => (
    <>
      <View className="mb-5 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => setActiveView('list')}
          className="h-11 w-11 items-center justify-center">
          <CaretLeft size={28} color={textColor} />
        </TouchableOpacity>
        <Text className="text-xl font-semibold" style={{ color: textColor }}>
          Backup & Restore
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Google Drive Connection */}
      <Text className="mb-3 mt-2 text-lg font-semibold" style={{ color: textColor }}>
        Google Drive
      </Text>
      <View
        className="mb-5 rounded-[28px] border p-2"
        style={{ borderColor, backgroundColor: cardBg }}>
        {!googleClientId ? (
          <View className="px-2 py-4">
            <Text className="text-sm" style={{ color: mutedColor }}>
              Configure your Google Drive client ID to enable cloud backup.
            </Text>
            <TouchableOpacity
              className="mt-3 items-center rounded-xl py-2.5"
              style={{ backgroundColor: primaryColor }}
              onPress={() => {
                setGoogleClientIdInput(googleClientId);
                setShowClientIdModal(true);
              }}>
              <Text
                className="text-sm font-bold"
                style={{ color: isDarkMode ? '#18181b' : '#ffffff' }}>
                Set Client ID
              </Text>
            </TouchableOpacity>
          </View>
        ) : googleDrive.isConnected ? (
          <View className="px-2 py-3">
            <View className="flex-row items-center gap-3">
              <GoogleLogo size={24} color={primaryColor} />
              <Text className="flex-1 text-[15px]" style={{ color: textColor }}>
                Connected to Google Drive
              </Text>
              <View className="h-2.5 w-2.5 rounded-full bg-green-500" />
            </View>
            <TouchableOpacity
              className="mt-3 items-center rounded-xl py-2.5"
              style={{ backgroundColor: '#ef444420' }}
              onPress={googleDrive.signOut}>
              <Text className="text-sm font-bold" style={{ color: '#ef4444' }}>
                Disconnect
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="px-2 py-3">
            {googleDrive.error && (
              <Text className="mb-2 text-xs" style={{ color: '#ef4444' }}>
                {googleDrive.error}
              </Text>
            )}
            <TouchableOpacity
              className="flex-row items-center justify-center gap-2 rounded-xl py-2.5"
              style={{ backgroundColor: primaryColor }}
              onPress={googleDrive.signIn}
              disabled={googleDrive.loading}>
              <GoogleLogo size={20} color={isDarkMode ? '#18181b' : '#ffffff'} />
              <Text
                className="text-sm font-bold"
                style={{ color: isDarkMode ? '#18181b' : '#ffffff' }}>
                {googleDrive.loading ? 'Connecting...' : 'Connect to Google Drive'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="mt-2 items-center rounded-xl py-2"
              style={{ backgroundColor: isDarkMode ? '#27272a' : '#e4e4e7' }}
              onPress={() => {
                setGoogleClientIdInput(googleClientId);
                setShowClientIdModal(true);
              }}>
              <Text className="text-xs" style={{ color: mutedColor }}>
                Change Client ID
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Data Backup */}
      <Text className="mb-3 mt-2 text-lg font-semibold" style={{ color: textColor }}>
        Data Backup
      </Text>
      <View
        className="mb-5 rounded-[28px] border p-2"
        style={{ borderColor, backgroundColor: cardBg }}>
        {backupStatus && (
          <View
            className="mx-2 mb-2 mt-1 rounded-lg px-3 py-2"
            style={{ backgroundColor: isDarkMode ? '#18181b' : '#f4f4f5' }}>
            <Text className="text-xs" style={{ color: textColor }}>
              {backupStatus}
            </Text>
          </View>
        )}
        <TouchableOpacity
          className="flex-row items-center gap-3 rounded-xl px-3 py-[14]"
          onPress={async () => {
            setBackupStatus('Collecting app data...');
            setBackupLoading(true);
            try {
              const data = await collectBackupData();
              if (googleDrive.isConnected) {
                const token = await googleDrive.getAccessToken();
                if (token) {
                  setBackupStatus('Uploading to Google Drive...');
                  await uploadBackupToDrive(token, data);
                  setBackupStatus('Backup uploaded successfully!');
                } else {
                  setBackupStatus('Reconnect Google Drive and try again.');
                }
              } else {
                await exportLocalBackup(data);
                setBackupStatus('Local backup created successfully!');
              }
              const lbs = await getLocalBackups();
              setLocalBackups(lbs);
            } catch (e: any) {
              setBackupStatus(`Backup failed: ${e.message}`);
            } finally {
              setBackupLoading(false);
            }
          }}
          disabled={backupLoading}>
          <CloudArrowUp size={22} color={primaryColor} />
          <Text className="flex-1 text-[15px]" style={{ color: textColor }}>
            {backupLoading ? 'Backing up...' : 'Backup Now'}
          </Text>
          <UploadSimple size={18} color={mutedColor} />
        </TouchableOpacity>

        <View className="border-b" style={{ borderBottomColor: borderColor }} />

        <TouchableOpacity
          className="flex-row items-center gap-3 rounded-xl px-3 py-[14]"
          onPress={async () => {
            try {
              const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true,
              });
              if (!result.canceled && result.assets?.[0]) {
                setBackupStatus('Importing backup...');
                const data = await loadLocalBackup(result.assets[0].uri);
                if (data) {
                  await restoreFromBackup(data);
                  setBackupStatus(
                    'Backup restored successfully! Restart the app to apply all changes.'
                  );
                } else {
                  setBackupStatus('Invalid backup file.');
                }
              }
            } catch (e: any) {
              setBackupStatus(`Import failed: ${e.message}`);
            }
          }}>
          <CloudArrowDown size={22} color={primaryColor} />
          <Text className="flex-1 text-[15px]" style={{ color: textColor }}>
            Restore from Local File
          </Text>
          <DownloadSimple size={18} color={mutedColor} />
        </TouchableOpacity>

        {/* Upload Media */}
        {googleDrive.isConnected && (
          <>
            <View className="border-b" style={{ borderBottomColor: borderColor }} />
            <TouchableOpacity
              className="flex-row items-center gap-3 rounded-xl px-3 py-[14]"
              onPress={async () => {
                try {
                  const result = await DocumentPicker.getDocumentAsync({
                    type: ['audio/*', 'video/*'],
                    copyToCacheDirectory: true,
                  });
                  if (!result.canceled && result.assets?.[0]) {
                    const asset = result.assets[0];
                    setBackupStatus(`Uploading ${asset.name}...`);
                    const token = await googleDrive.getAccessToken();
                    if (token) {
                      await uploadMediaToDrive(token, asset.uri, asset.name);
                      setBackupStatus(`${asset.name} uploaded to Drive!`);
                    }
                  }
                } catch (e: any) {
                  setBackupStatus(`Upload failed: ${e.message}`);
                }
              }}>
              <UploadSimple size={22} color={primaryColor} />
              <Text className="flex-1 text-[15px]" style={{ color: textColor }}>
                Upload Media Files
              </Text>
              <MusicNotes size={18} color={mutedColor} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Google Drive Backups */}
      {googleDrive.isConnected && (
        <>
          <Text className="mb-3 mt-2 text-lg font-semibold" style={{ color: textColor }}>
            Drive Backups
          </Text>
          <View
            className="mb-5 rounded-[28px] border p-2"
            style={{ borderColor, backgroundColor: cardBg }}>
            <TouchableOpacity
              className="flex-row items-center gap-3 rounded-xl px-3 py-[14]"
              onPress={async () => {
                setBackupLoading(true);
                try {
                  const token = await googleDrive.getAccessToken();
                  if (token) {
                    const backups = await listDriveBackups(token);
                    setDriveBackups(backups);
                    setShowDriveBackups(!showDriveBackups);
                  }
                } catch (e: any) {
                  setBackupStatus(`Failed to list backups: ${e.message}`);
                } finally {
                  setBackupLoading(false);
                }
              }}>
              <List size={22} color={primaryColor} />
              <Text className="flex-1 text-[15px]" style={{ color: textColor }}>
                {showDriveBackups ? 'Hide Drive Backups' : 'List Drive Backups'}
              </Text>
              <Text className="text-xs" style={{ color: mutedColor }}>
                {driveBackups.length > 0 ? `${driveBackups.length} files` : ''}
              </Text>
            </TouchableOpacity>

            {showDriveBackups && driveBackups.length === 0 && (
              <Text className="px-5 pb-3 text-xs" style={{ color: mutedColor }}>
                No backups found on Google Drive.
              </Text>
            )}

            {showDriveBackups &&
              driveBackups.map((file) => (
                <View
                  key={file.id}
                  className="flex-row items-center border-t px-3 py-3"
                  style={{ borderTopColor: borderColor }}>
                  <View className="flex-1">
                    <Text className="text-sm" style={{ color: textColor }} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <Text className="mt-0.5 text-xs" style={{ color: mutedColor }}>
                      {new Date(file.createdTime).toLocaleDateString()} |{' '}
                      {file.size ? `${(parseInt(file.size) / 1024).toFixed(1)} KB` : '--'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    className="mr-2 rounded-lg px-3 py-1.5"
                    style={{ backgroundColor: `${primaryColor}20` }}
                    onPress={async () => {
                      setBackupStatus('Restoring from Drive...');
                      try {
                        const token = await googleDrive.getAccessToken();
                        if (token) {
                          const data = await downloadBackupFromDrive(token, file.id);
                          await restoreFromBackup(data);
                          setBackupStatus('Restored successfully! Restart the app.');
                        }
                      } catch (e: any) {
                        setBackupStatus(`Restore failed: ${e.message}`);
                      }
                    }}>
                    <DownloadSimple size={16} color={primaryColor} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="rounded-lg px-3 py-1.5"
                    style={{ backgroundColor: '#ef444420' }}
                    onPress={async () => {
                      try {
                        const token = await googleDrive.getAccessToken();
                        if (token) {
                          await deleteDriveBackup(token, file.id);
                          setDriveBackups((prev) => prev.filter((f) => f.id !== file.id));
                          setBackupStatus('Backup deleted.');
                        }
                      } catch (e: any) {
                        setBackupStatus(`Delete failed: ${e.message}`);
                      }
                    }}>
                    <Trash size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
          </View>
        </>
      )}

      {/* Local Backups */}
      <Text className="mb-3 mt-2 text-lg font-semibold" style={{ color: textColor }}>
        Local Backups
      </Text>
      <View
        className="mb-5 rounded-[28px] border p-2"
        style={{ borderColor, backgroundColor: cardBg }}>
        <TouchableOpacity
          className="flex-row items-center gap-3 rounded-xl px-3 py-[14]"
          onPress={async () => {
            const lbs = await getLocalBackups();
            setLocalBackups(lbs);
            setShowLocalBackups(!showLocalBackups);
          }}>
          <Folder size={22} color={primaryColor} />
          <Text className="flex-1 text-[15px]" style={{ color: textColor }}>
            {showLocalBackups ? 'Hide Local Backups' : 'Show Local Backups'}
          </Text>
          <Text className="text-xs" style={{ color: mutedColor }}>
            {localBackups.length > 0 ? `${localBackups.length} files` : ''}
          </Text>
        </TouchableOpacity>

        {showLocalBackups && localBackups.length === 0 && (
          <Text className="px-5 pb-3 text-xs" style={{ color: mutedColor }}>
            No local backups found.
          </Text>
        )}

        {showLocalBackups &&
          localBackups.map((file) => (
            <View
              key={file.path}
              className="flex-row items-center border-t px-3 py-3"
              style={{ borderTopColor: borderColor }}>
              <View className="flex-1">
                <Text className="text-sm" style={{ color: textColor }} numberOfLines={1}>
                  {file.name}
                </Text>
                <Text className="mt-0.5 text-xs" style={{ color: mutedColor }}>
                  {new Date(file.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <TouchableOpacity
                className="mr-2 rounded-lg px-3 py-1.5"
                style={{ backgroundColor: `${primaryColor}20` }}
                onPress={async () => {
                  setBackupStatus('Restoring from local backup...');
                  try {
                    const data = await loadLocalBackup(file.path);
                    if (data) {
                      await restoreFromBackup(data);
                      setBackupStatus('Restored successfully! Restart the app.');
                    }
                  } catch (e: any) {
                    setBackupStatus(`Restore failed: ${e.message}`);
                  }
                }}>
                <DownloadSimple size={16} color={primaryColor} />
              </TouchableOpacity>
              <TouchableOpacity
                className="rounded-lg px-3 py-1.5"
                style={{ backgroundColor: '#ef444420' }}
                onPress={async () => {
                  await deleteLocalBackup(file.path);
                  setLocalBackups((prev) => prev.filter((f) => f.path !== file.path));
                }}>
                <Trash size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
      </View>

      {/* Drive Media */}
      {googleDrive.isConnected && (
        <>
          <Text className="mb-3 mt-2 text-lg font-semibold" style={{ color: textColor }}>
            Drive Media
          </Text>
          <View
            className="mb-5 rounded-[28px] border p-2"
            style={{ borderColor, backgroundColor: cardBg }}>
            <TouchableOpacity
              className="flex-row items-center gap-3 rounded-xl px-3 py-[14]"
              onPress={async () => {
                try {
                  const token = await googleDrive.getAccessToken();
                  if (token) {
                    const { listDriveMedia } = await import('../services/BackupService');
                    const media = await listDriveMedia(token);
                    setDriveMedia(media);
                    setShowDriveMedia(!showDriveMedia);
                  }
                } catch (e: any) {
                  setBackupStatus(`Failed to list media: ${e.message}`);
                }
              }}>
              <MusicNotes size={22} color={primaryColor} />
              <Text className="flex-1 text-[15px]" style={{ color: textColor }}>
                {showDriveMedia ? 'Hide Drive Media' : 'Show Drive Media'}
              </Text>
              <Text className="text-xs" style={{ color: mutedColor }}>
                {driveMedia.length > 0 ? `${driveMedia.length} files` : ''}
              </Text>
            </TouchableOpacity>

            {showDriveMedia && driveMedia.length === 0 && (
              <Text className="px-5 pb-3 text-xs" style={{ color: mutedColor }}>
                No media files uploaded to Drive.
              </Text>
            )}

            {showDriveMedia &&
              driveMedia.map((file) => (
                <View
                  key={file.id}
                  className="flex-row items-center border-t px-3 py-3"
                  style={{ borderTopColor: borderColor }}>
                  <View className="flex-1">
                    <Text className="text-sm" style={{ color: textColor }} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <Text className="mt-0.5 text-xs" style={{ color: mutedColor }}>
                      {file.size ? `${(parseInt(file.size) / 1024 / 1024).toFixed(1)} MB` : '--'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    className="rounded-lg px-3 py-1.5"
                    style={{ backgroundColor: '#ef444420' }}
                    onPress={async () => {
                      try {
                        const token = await googleDrive.getAccessToken();
                        if (token) {
                          await deleteDriveBackup(token, file.id);
                          setDriveMedia((prev) => prev.filter((f) => f.id !== file.id));
                          setBackupStatus('Media file deleted from Drive.');
                        }
                      } catch (e: any) {
                        setBackupStatus(`Delete failed: ${e.message}`);
                      }
                    }}>
                    <Trash size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
          </View>
        </>
      )}

      {/* Google Client ID Modal */}
      <Modal visible={showClientIdModal} transparent animationType="fade">
        <TouchableOpacity
          className="flex-1 items-center justify-center bg-black/70"
          onPress={() => setShowClientIdModal(false)}>
          <View
            className="w-[85%] max-w-[360px] rounded-[28px] p-6"
            style={{
              borderWidth: 1,
              borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
              backgroundColor: isDarkMode ? '#27272a' : '#ffffff',
            }}>
            <Text className="mb-4 text-center text-lg font-extrabold" style={{ color: textColor }}>
              Google Drive Client ID
            </Text>
            <Text className="mb-3 text-xs" style={{ color: mutedColor }}>
              Enter your Google OAuth 2.0 Web Client ID (from Google Cloud Console).
            </Text>
            <TextInput
              className="mb-4 rounded-xl px-3.5 py-3 text-sm"
              style={{ backgroundColor: isDarkMode ? '#18181b' : '#e4e4e7', color: textColor }}
              placeholder="xxxxx.apps.googleusercontent.com"
              placeholderTextColor={mutedColor}
              value={googleClientIdInput}
              onChangeText={setGoogleClientIdInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View className="flex-row gap-2.5">
              <TouchableOpacity
                className="flex-1 items-center rounded-xl py-3"
                style={{ backgroundColor: isDarkMode ? '#27272a' : '#e4e4e7' }}
                onPress={() => setShowClientIdModal(false)}>
                <Text className="text-[15px] font-bold" style={{ color: textColor }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center rounded-xl py-3"
                style={{ backgroundColor: primaryColor }}
                onPress={() => {
                  setGoogleClientId(googleClientIdInput);
                  new MMKV({ id: 'settings' }).set('@google_client_id', googleClientIdInput);
                  setShowClientIdModal(false);
                }}>
                <Text
                  className="text-[15px] font-bold"
                  style={{ color: isDarkMode ? '#18181b' : '#ffffff' }}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );

  const renderStorageView = () => {
    const snapshot = storageSnapshot;
    const devUsedPct =
      snapshot && snapshot.deviceTotal > 0 ? (snapshot.deviceUsed / snapshot.deviceTotal) * 100 : 0;
    const mediaTotal = (snapshot?.audioSize || 0) + (snapshot?.videoSize || 0);

    return (
      <>
        <TouchableOpacity
          className="mb-5 flex-row items-center gap-2"
          onPress={() => setActiveView('list')}>
          <CaretLeft size={20} color={primaryColor} />
          <Text className="text-lg font-bold" style={{ color: textColor }}>
            Storage
          </Text>
        </TouchableOpacity>

        {/* Device Storage */}
        <View
          className="mb-4 rounded-[24px] border p-5"
          style={{ borderColor, backgroundColor: cardBg }}>
          <Text className="mb-3 text-sm font-semibold" style={{ color: textColor }}>
            Device Storage
          </Text>
          {snapshot && snapshot.deviceTotal > 0 ? (
            <>
              <View
                className="mb-2 h-2.5 overflow-hidden rounded-full"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                }}>
                <View
                  style={{
                    width: `${Math.min(devUsedPct, 100)}%`,
                    height: '100%',
                    backgroundColor: primaryColor,
                    borderRadius: 99,
                  }}
                />
              </View>
              <View className="flex-row justify-between">
                <Text className="text-xs" style={{ color: mutedColor }}>
                  Used: {StorageTrackingService.formatBytes(snapshot.deviceUsed)}
                </Text>
                <Text className="text-xs" style={{ color: mutedColor }}>
                  Free: {StorageTrackingService.formatBytes(snapshot.deviceFree)}
                </Text>
              </View>
              <Text className="mt-1 text-[11px]" style={{ color: mutedColor }}>
                Total: {StorageTrackingService.formatBytes(snapshot.deviceTotal)}
              </Text>
            </>
          ) : (
            <Text className="text-xs" style={{ color: mutedColor }}>
              Device storage info unavailable
            </Text>
          )}
        </View>

        {/* Media Library */}
        <View
          className="mb-4 rounded-[24px] border p-5"
          style={{ borderColor, backgroundColor: cardBg }}>
          <Text className="mb-3 text-sm font-semibold" style={{ color: textColor }}>
            Media Library
          </Text>

          {/* Audio row */}
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2.5">
              <View
                className="h-9 w-9 items-center justify-center rounded-[10px]"
                style={{ backgroundColor: `${primaryColor}15` }}>
                <MusicNotes size={16} color={primaryColor} />
              </View>
              <View>
                <Text className="text-sm font-medium" style={{ color: textColor }}>
                  Audio
                </Text>
                <Text className="text-xs" style={{ color: mutedColor }}>
                  {snapshot?.audioFiles ?? 0} files
                </Text>
              </View>
            </View>
            <Text className="text-sm font-semibold" style={{ color: textColor }}>
              {StorageTrackingService.formatBytes(snapshot?.audioSize ?? 0)}
            </Text>
          </View>

          {/* Video row */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2.5">
              <View
                className="h-9 w-9 items-center justify-center rounded-[10px]"
                style={{ backgroundColor: `${primaryColor}15` }}>
                <VideoCamera size={16} color={primaryColor} />
              </View>
              <View>
                <Text className="text-sm font-medium" style={{ color: textColor }}>
                  Video
                </Text>
                <Text className="text-xs" style={{ color: mutedColor }}>
                  {snapshot?.videoFiles ?? 0} files
                </Text>
              </View>
            </View>
            <Text className="text-sm font-semibold" style={{ color: textColor }}>
              {StorageTrackingService.formatBytes(snapshot?.videoSize ?? 0)}
            </Text>
          </View>

          {/* Total */}
          <View className="mt-3 border-t pt-3" style={{ borderColor, borderTopWidth: 1 }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold" style={{ color: textColor }}>
                Total Media
              </Text>
              <Text className="text-sm font-bold" style={{ color: primaryColor }}>
                {StorageTrackingService.formatBytes(mediaTotal)}
              </Text>
            </View>
          </View>
        </View>

        {/* App Info */}
        <View
          className="rounded-[24px] border p-5"
          style={{ borderColor, backgroundColor: cardBg }}>
          <Text className="mb-2 text-sm font-semibold" style={{ color: textColor }}>
            About
          </Text>
          <Text className="text-xs" style={{ color: mutedColor }}>
            Last updated: {snapshot ? new Date(snapshot.timestamp).toLocaleTimeString() : '—'}
          </Text>
          <TouchableOpacity
            className="mt-3 self-start rounded-xl px-4 py-2"
            style={{ backgroundColor: `${primaryColor}15` }}
            onPress={() =>
              StorageTrackingService.collectSnapshot(storageAudio, storageVideo).then(
                setStorageSnapshot
              )
            }>
            <Text className="text-xs font-semibold" style={{ color: primaryColor }}>
              Refresh
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'theme':
        return renderThemeView();
      case 'about':
        return renderAboutView();
      case 'language':
        return renderLanguageView();
      case 'fonts':
        return renderFontsView();
      case 'hiddenFiles':
        return renderHiddenFilesView();
      case 'recentlyDeleted':
        return renderRecentlyDeletedView();
      case 'backup':
        return renderBackupView();
      case 'privateFolder':
        return renderPrivateFolderView();
      case 'playback':
        return renderPlaybackView();
      case 'notification':
        return renderNotificationView();
      case 'sleepTimer':
        return renderSleepTimerView();
      case 'removeAds':
        return renderRemoveAdsView();
      case 'storage':
        return renderStorageView();
      case 'futureUpdates':
        return renderFutureUpdatesView();
      default:
        return null;
    }
  };

  if (activeView !== 'list') {
    return (
      <ScreenLayout>
        <ScrollView contentContainerClassName="px-5">
          {renderActiveView()}
          <View style={{ height: 100 }} />
        </ScrollView>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <ScrollView contentContainerClassName="px-5">
        <Text className="mb-4 text-xl font-semibold" style={{ color: textColor }}>
          {t('settings.title')}
        </Text>
        <View
          className="mb-5 rounded-[28px] border p-2"
          style={{ borderColor, backgroundColor: cardBg }}>
          {renderMainList()}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </ScreenLayout>
  );
});

function SliderTrack({
  value,
  max,
  primaryColor,
  mutedColor,
  onChange,
}: {
  value: number;
  max: number;
  primaryColor: string;
  mutedColor: string;
  onChange: (v: number) => void;
}) {
  const [trackWidth, setTrackWidth] = React.useState(200);
  return (
    <View
      className="h-5 flex-1 justify-center"
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}>
      <TouchableOpacity
        className="h-1 justify-center rounded-full"
        style={{ backgroundColor: mutedColor + '30' }}
        onPress={async (e) => {
          const pct = e.nativeEvent.locationX / trackWidth;
          await onChange(Math.round(Math.min(pct, 1) * max));
        }}>
        <View
          className="h-1 rounded-full"
          style={{
            width: `${Math.min((value / max) * 100, 100)}%` as any,
            backgroundColor: primaryColor,
          }}
        />
        <View
          className="absolute -top-1 h-3 w-3 rounded-full"
          style={{
            left: `${Math.min((value / max) * 100, 100)}%` as any,
            backgroundColor: primaryColor,
          }}
        />
      </TouchableOpacity>
    </View>
  );
}

function FitButton({
  label,
  active,
  primaryColor,
  mutedColor,
  onPress,
}: {
  label: string;
  active: boolean;
  primaryColor: string;
  mutedColor: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className="flex-1 items-center rounded-lg py-1.5"
      style={{
        backgroundColor: active ? `${primaryColor}20` : 'rgba(255,255,255,0.05)',
      }}
      onPress={onPress}>
      <Text
        className="text-[11px] font-semibold"
        style={{ color: active ? primaryColor : mutedColor }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
