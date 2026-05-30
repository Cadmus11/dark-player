import React, { useState, useMemo, useEffect } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
  Star,
  ShareNetwork,
  Sun,
  Palette,
  Gradient,
  Globe,
} from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFont, FONT_OPTIONS } from '../context/FontContext';
import { useMediaStore } from '../stores/mediaStore';
import { useSettingsStore } from '../stores/settingsStore';
import { ScreenLayout } from '../components/ScreenLayout';
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
  FileItem,
} from '../types';
import { COLOR_THEMES, LayoutSize } from '../types';
import { PrivateFolderService } from '../services/PrivateFolderService';

const APP_VERSION = '1.0.0';

const ACCENT_COLORS = [
  '#C2FC4A',
  '#6c5ce7',
  '#00cec9',
  '#e17055',
  '#74b9ff',
  '#ff7675',
  '#a29bfe',
  '#55efc4',
  '#fdcb6e',
  '#fd79a8',
  '#e94560',
  '#58a6ff',
  '#8b5cf6',
  '#f59e0b',
  '#10b981',
  '#ec4899',
];

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
  | 'futureUpdates';

export const SettingsScreen = React.memo(function SettingsScreen() {
  const {
    setBackgroundImage,
    clearBackgroundImage,
    setBackgroundBlur,
    setBackgroundFit,
    theme,
    updateTheme,
    setAccentColor,
    setGradient,
    setColorTheme,
    setDarkMode,
    isDarkMode,
    primaryColor,
    textColor,
    mutedColor,
    borderColor,
    cardBg,
    setSizeMode,
    setPresetImage,
    availableColorThemes,
    currentColorThemeName,
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
  const handleClearRecentlyDeleted = async () => {
    await clearRecentlyDeleted();
    setRecentlyDeleted([]);
  };
  const settingsStore = useSettingsStore();
  const navigation = useNavigation<any>();
  const hiddenFilesSettings = settingsStore.hiddenFiles;
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
  const [showAllThemes, setShowAllThemes] = useState(false);

  useEffect(() => {
    loadSettings();
    loadRemoveAds();
  }, []);

  async function loadRemoveAds() {
    const value = await getRemoveAds();
    setAdsRemoved(value);
  }

  async function loadSettings() {
    const pb = await getPlaybackSettings();
    const nt = await getNotificationSettings();
    const st = await getSleepTimerSettings();
    setPlaybackSettingsState(pb);
    setNotificationSettingsState(nt);
    setSleepTimerSettingsState(st);
    setCrossFadeInput(String(pb.crossFadeDuration));
    setSleepMinutesInput(String(st.minutes));
  }

  const appVersion = APP_VERSION;

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

  const applyColorPreset = async (preset: (typeof COLOR_THEMES)[0]) => {
    const isLight = preset.name === 'Light';
    const bg = isLight ? '#F0F8FF' : '#0a0a0a';
    await updateTheme({
      backgroundType: 'solid',
      backgroundColor: bg,
      gradientColors: undefined,
      primaryColor: preset.primary,
    });
  };

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
      case 'privateFolder':
        setActiveView('privateFolder');
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
      case 'playtime':
        break;
    }
  };

  const updatePlaybackSetting = async (key: keyof PlaybackSettings, value: any) => {
    const updated = { ...playbackSettings, [key]: value };
    setPlaybackSettingsState(updated);
    await savePlaybackSettings(updated);
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
          className="flex-row items-center border-b px-2 py-[14]"
          style={{ borderBottomColor: borderColor }}
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

      {/* Dark/Light Mode Toggle */}
      <View
        className="mb-5 rounded-2xl border p-2"
        style={{ borderColor, backgroundColor: cardBg }}>
        <View
          className="flex-row items-center justify-between border-b px-2 py-3"
          style={{ borderBottomColor: borderColor }}>
          <Sun size={22} color={textColor} />
          <Text className="ml-[14] flex-1 text-[15px]" style={{ color: textColor }}>
            Dark Mode
          </Text>
          <Switch
            value={isDarkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: '#3f3f46', true: primaryColor }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      {/* File Size Mode */}
      <Text className="mb-3 mt-2 text-lg font-semibold" style={{ color: textColor }}>
        File Size
      </Text>
      <View
        className="mb-5 rounded-2xl border p-2"
        style={{ borderColor, backgroundColor: cardBg }}>
        <View className="flex-row gap-2 p-1">
          {(['small', 'medium', 'big'] as LayoutSize[]).map((mode) => {
            const labels = { small: 'Small', medium: 'Medium', big: 'Big' };
            const descs = {
              small: '4 columns, compact',
              medium: '3 columns, balanced',
              big: '1-2 columns, large',
            };
            const active = theme.sizeMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                className="flex-1 items-center rounded-xl px-2 py-3"
                style={active ? { backgroundColor: primaryColor + '20' } : undefined}
                onPress={() => setSizeMode(mode)}>
                <Text
                  className="text-sm font-bold"
                  style={{ color: active ? primaryColor : textColor }}>
                  {labels[mode]}
                </Text>
                <Text className="mt-1 text-center text-[10px]" style={{ color: mutedColor }}>
                  {descs[mode]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Gradient Themes */}
      <Text className="mb-3 mt-2 text-lg font-semibold" style={{ color: textColor }}>
        Gradients
      </Text>
      <View
        className="mb-5 rounded-2xl border p-2"
        style={{ borderColor, backgroundColor: cardBg }}>
        <View className="flex-row flex-wrap gap-2.5 p-2">
          {[
            { name: 'Deep Space', colors: ['#06060B', '#1D1D21', '#0a0a0f'] },
            { name: 'Neon', colors: ['#06060B', '#1D1D21', '#2d1b69'] },
            { name: 'Cyber', colors: ['#0a0a0a', '#ff006e', '#8338ec'] },
            { name: 'Ocean', colors: ['#03045e', '#0077b6', '#00b4d8'] },
            { name: 'Forest', colors: ['#0d1b2a', '#1b4332', '#2d6a4f'] },
            { name: 'Sunset', colors: ['#2d1b69', '#e44d6e', '#f7b731'] },
          ].map((g) => (
            <TouchableOpacity
              key={g.name}
              className="w-[100] items-center"
              onPress={() => setGradient(g.colors)}>
              <View
                className="h-11 w-[88] flex-row overflow-hidden rounded-[10] border"
                style={{ borderColor }}>
                {g.colors.map((c, i) => (
                  <View
                    key={i}
                    className="h-full flex-1"
                    style={{ backgroundColor: c, zIndex: g.colors.length - i }}
                  />
                ))}
              </View>
              <Text className="mt-1 text-[10px] " style={{ color: mutedColor }} numberOfLines={1}>
                {g.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Color Themes */}
      <Text className="mb-3 mt-2 text-lg font-semibold" style={{ color: textColor }}>
        {t('settings.colorThemes')}
      </Text>
      <View
        className="mb-5 rounded-2xl border p-2"
        style={{ borderColor, backgroundColor: cardBg }}>
        <View className="flex-row flex-wrap gap-2.5 p-2">
          {(showAllThemes ? availableColorThemes : availableColorThemes.slice(0, 4)).map((ct) => (
            <TouchableOpacity
              key={ct.name}
              className="w-[70] items-center rounded-xl border-2 py-[10]"
              style={
                currentColorThemeName === ct.name ? { borderColor: primaryColor } : { borderColor }
              }
              onPress={() => setColorTheme(ct.name)}>
              <View
                className="h-10 w-10 items-center justify-center rounded-[10] border"
                style={{ borderColor, backgroundColor: ct.background }}>
                <View className="h-3 w-3 rounded-full" style={{ backgroundColor: ct.primary }} />
              </View>
              <Text
                className="mt-1 text-center text-[10px]"
                style={
                  currentColorThemeName === ct.name
                    ? { color: primaryColor }
                    : { color: mutedColor }
                }>
                {ct.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          className="items-center py-3"
          onPress={() => setShowAllThemes(!showAllThemes)}>
          <Text className="text-[13px] font-semibold" style={{ color: primaryColor }}>
            {showAllThemes ? 'Show Less' : `Show All (${availableColorThemes.length})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Accent Colors */}
      <Text className="mb-3 mt-2 text-lg font-semibold" style={{ color: textColor }}>
        {t('settings.accentColor')}
      </Text>
      <View
        className="mb-5 rounded-2xl border p-2"
        style={{ borderColor, backgroundColor: cardBg }}>
        <View
          className="mb-2 flex-row items-center rounded-xl px-3 py-[10]"
          style={{ backgroundColor: cardBg }}>
          <View
            className="mr-3 h-7 w-7 rounded-full border-2"
            style={{ backgroundColor: primaryColor, borderColor: borderColor }}
          />
          <Text className="font-mono text-sm " style={{ color: mutedColor }}>
            {primaryColor}
          </Text>
        </View>
        <View className="flex-row flex-wrap justify-start gap-2.5 px-1 py-1">
          {ACCENT_COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              className="h-[38] w-[38] items-center justify-center rounded-full border-[3] border-transparent"
              style={[
                { backgroundColor: color },
                theme.primaryColor === color && { borderColor: '#ffffff' },
              ]}
              onPress={() => setAccentColor(color)}>
              {theme.primaryColor === color && <Check size={16} color="#0a0a0a" weight="bold" />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Layout Size */}
      <Text className="mb-3 mt-5 text-lg font-semibold" style={{ color: textColor }}>
        Layout Size
      </Text>
      <View
        className="mb-5 rounded-2xl border p-2"
        style={{ borderColor, backgroundColor: cardBg }}>
        <View className="flex-row gap-2 p-1">
          {(['small', 'medium', 'big'] as const).map((size) => (
            <TouchableOpacity
              key={size}
              className="flex-1 items-center rounded-xl py-3"
              style={
                settingsStore.layoutSize === size
                  ? { backgroundColor: primaryColor }
                  : { backgroundColor: 'rgba(255,255,255,0.05)' }
              }
              onPress={() => settingsStore.setLayoutSize(size)}>
              <SquaresFour
                size={18}
                color={settingsStore.layoutSize === size ? '#18181b' : '#e4e4e7'}
                weight={settingsStore.layoutSize === size ? 'fill' : 'regular'}
              />
              <Text
                className="mt-1 text-[11px] font-semibold"
                style={{
                  color: settingsStore.layoutSize === size ? '#18181b' : '#e4e4e7',
                  textTransform: 'capitalize',
                }}>
                {size}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text className="mt-1 text-center text-[11px] " style={{ color: mutedColor }}>
          Small (4 cols) / Medium (3 cols) / Big (2 cols)
        </Text>
      </View>

      {/* Preset Backgrounds */}
      <Text className="mb-3 mt-5 text-lg font-semibold" style={{ color: textColor }}>
        Preset Backgrounds
      </Text>
      <View
        className="mb-5 rounded-2xl border p-2"
        style={{ borderColor, backgroundColor: cardBg }}>
        <View className="flex-row flex-wrap gap-2 p-2" style={{ justifyContent: 'space-around' }}>
          {(() => {
            const { PRESET_IMAGE_LIST } = require('../constants/ThemeImages');
            return PRESET_IMAGE_LIST.map((img: { key: string; name: string; source: any }) => (
              <TouchableOpacity
                key={img.key}
                className="items-center"
                onPress={() => setPresetImage(theme.presetImageKey === img.key ? null : img.key)}>
                <View
                  className="h-[54] w-[72] overflow-hidden rounded-xl border-2"
                  style={{
                    borderColor: theme.presetImageKey === img.key ? primaryColor : borderColor,
                  }}>
                  <Image
                    source={img.source}
                    className="h-full w-full"
                    style={{ resizeMode: 'cover' }}
                  />
                </View>
                <Text
                  className="mt-1 text-[10px]"
                  style={{ color: theme.presetImageKey === img.key ? primaryColor : mutedColor }}
                  numberOfLines={1}>
                  {img.name}
                </Text>
              </TouchableOpacity>
            ));
          })()}
        </View>
        <TouchableOpacity className="items-center py-2" onPress={() => setPresetImage(null)}>
          <Text className="text-[12px]" style={{ color: mutedColor }}>
            Clear preset background
          </Text>
        </TouchableOpacity>
      </View>

      {/* Background Image */}
      <Text className="mb-3 mt-2 text-lg font-semibold" style={{ color: textColor }}>
        Background Image
      </Text>
      <View
        className="mb-5 rounded-2xl border p-4"
        style={{ borderColor, backgroundColor: cardBg }}>
        {theme.backgroundImageUri ? (
          <View className="mb-3">
            <Image
              source={{ uri: theme.backgroundImageUri }}
              className="mb-2 h-[140] w-full rounded-xl"
              style={{ resizeMode: 'cover' }}
            />
            <View className="flex-row gap-2">
              <TouchableOpacity
                className="flex-1 items-center rounded-xl py-2.5"
                style={{ backgroundColor: primaryColor + '20' }}
                onPress={async () => {
                  const {
                    launchImageLibraryAsync,
                    MediaTypeOptions,
                  } = require('expo-image-picker');
                  const result = await launchImageLibraryAsync({
                    mediaTypes: MediaTypeOptions.Images,
                    quality: 1,
                  });
                  if (!result.canceled && result.assets?.[0]) {
                    await setBackgroundImage(result.assets[0].uri);
                  }
                }}>
                <Text className="text-[13px] font-semibold" style={{ color: primaryColor }}>
                  Change
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center rounded-xl bg-red-500/20 py-2.5"
                onPress={clearBackgroundImage}>
                <Text className="text-[13px] font-semibold text-red-400">Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            className="items-center rounded-xl border-2 border-dashed py-4"
            style={{ borderColor: mutedColor + '40' }}
            onPress={async () => {
              const { launchImageLibraryAsync, MediaTypeOptions } = require('expo-image-picker');
              const result = await launchImageLibraryAsync({
                mediaTypes: MediaTypeOptions.Images,
                quality: 1,
              });
              if (!result.canceled && result.assets?.[0]) {
                await setBackgroundImage(result.assets[0].uri);
              }
            }}>
            <View
              className="mb-2 h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: cardBg }}>
              <Text className="text-lg">🖼</Text>
            </View>
            <Text className="text-[13px] font-semibold" style={{ color: mutedColor }}>
              Tap to add background image
            </Text>
            <Text className="mt-1 text-[11px]" style={{ color: mutedColor }}>
              Supports HD images (wallpaper / spotlight)
            </Text>
          </TouchableOpacity>
        )}

        {theme.backgroundImageUri && (
          <View className="mt-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-[13px] " style={{ color: textColor }}>
                Blur
              </Text>
              <Text className="text-[13px] " style={{ color: textColor }}>
                {theme.backgroundBlur ?? 0}
              </Text>
            </View>
            <View className="h-8 justify-center">
              <TouchableOpacity
                className="h-1.5 justify-center rounded-full"
                style={{ backgroundColor: mutedColor + '30' }}
                onPress={async (e) => {
                  const { locationX } = e.nativeEvent;
                  const pct = locationX / 260;
                  await setBackgroundBlur(Math.round(pct * 100));
                }}>
                <View
                  className="h-1.5 rounded-full"
                  style={{
                    width: `${((theme.backgroundBlur ?? 0) / 100) * 100}%` as any,
                    backgroundColor: primaryColor,
                  }}
                />
                <View
                  className="absolute -top-1.5 h-4 w-4 rounded-full"
                  style={{
                    left: `${((theme.backgroundBlur ?? 0) / 100) * 100}%` as any,
                    backgroundColor: primaryColor,
                  }}
                />
              </TouchableOpacity>
            </View>
            <View className="mt-3 flex-row gap-2">
              <TouchableOpacity
                className="flex-1 items-center rounded-xl py-2"
                style={{
                  backgroundColor:
                    theme.backgroundImageFit === 'cover'
                      ? `${primaryColor}20`
                      : 'rgba(255,255,255,0.05)',
                }}
                onPress={() => setBackgroundFit('cover')}>
                <Text
                  className="text-[12px]"
                  style={{
                    color: theme.backgroundImageFit === 'cover' ? primaryColor : '#e4e4e7',
                  }}>
                  Cover
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center rounded-xl py-2"
                style={{
                  backgroundColor:
                    theme.backgroundImageFit === 'contain'
                      ? `${primaryColor}20`
                      : 'rgba(255,255,255,0.05)',
                }}
                onPress={() => setBackgroundFit('contain')}>
                <Text
                  className="text-[12px]"
                  style={{
                    color: theme.backgroundImageFit === 'contain' ? primaryColor : '#e4e4e7',
                  }}>
                  Contain
                </Text>
              </TouchableOpacity>
            </View>
          </View>
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
        className="mb-5 rounded-2xl border p-2"
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
            className="flex-row items-center gap-2 rounded-xl bg-[#C2FC4A]/10 px-5 py-[10]"
            onPress={() =>
              Linking.openURL(
                Platform.OS === 'ios'
                  ? 'https://apps.apple.com/app/id12345'
                  : 'https://play.google.com/store/apps/details?id=com.lumora.app'
              )
            }>
            <Star size={16} color="#C2FC4A" weight="fill" />
            <Text className="text-sm font-semibold text-[#C2FC4A]">Rate Lumora</Text>
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
        className="mb-5 rounded-2xl border p-2"
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
        className="mb-5 rounded-2xl border p-2"
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
        className="mb-5 rounded-2xl border p-2"
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
              <MusicNotes size={18} color="rgba(255,255,255,0.5)" />
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
          <Text className="text-sm font-semibold text-red-500">Clear All</Text>
        </TouchableOpacity>
      )}
      <View
        className="mb-5 rounded-2xl border p-2"
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
              <Trash size={18} color="rgba(255,255,255,0.5)" />
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
                  <Text className="text-xs font-semibold text-red-500">Delete</Text>
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

  useEffect(() => {
    (async () => {
      const exists = await PrivateFolderService.isSetup();
      setPrivateFolderExists(exists);
      if (exists) {
        const info = await PrivateFolderService.getFolderInfo();
        setPrivateFolderInfo(info);
        const files = await PrivateFolderService.getPrivateFiles();
        setPrivateFilesList(files);
      }
    })();
  }, [activeView]);

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
          className="mb-5 rounded-2xl border p-2"
          style={{ borderColor, backgroundColor: cardBg }}>
          <Text className="p-4 text-center text-sm leading-[22] " style={{ color: mutedColor }}>
            Create a private folder on your device to hide sensitive files from the main library.
            Files in this folder will only appear when accessed from this screen.
          </Text>
          <TouchableOpacity
            className="mx-4 mb-4 flex-row items-center justify-center gap-2 rounded-xl py-[14]"
            style={{ backgroundColor: primaryColor }}
            onPress={async () => {
              const ok = await PrivateFolderService.setupFolder();
              if (ok) {
                setPrivateFolderExists(true);
                const info = await PrivateFolderService.getFolderInfo();
                setPrivateFolderInfo(info);
                Alert.alert('Created', 'Private folder has been created successfully.');
              } else {
                Alert.alert(
                  'Error',
                  'Failed to create private folder. Please check storage permissions.'
                );
              }
            }}>
            <Folder size={20} color="#06060B" weight="bold" />
            <Text className="text-[15px] font-bold text-[#06060B]">Create Private Folder</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View
            className="mb-5 rounded-2xl border p-2"
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
              className="mx-4 mb-4 flex-row items-center justify-center gap-2 rounded-xl py-[14]"
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
                      onPress: async () => {
                        await PrivateFolderService.deleteFolder();
                        setPrivateFolderExists(false);
                        setPrivateFilesList([]);
                      },
                    },
                  ]
                );
              }}>
              <Trash size={16} color="#ef4444" />
              <Text className="text-sm font-semibold text-red-500">Delete Private Folder</Text>
            </TouchableOpacity>
          </View>
          {privateFilesList.length > 0 && (
            <View
              className="mb-5 rounded-2xl border p-2"
              style={{ borderColor, backgroundColor: cardBg }}>
              <Text className="p-3 text-sm font-bold " style={{ color: textColor }}>
                Files
              </Text>
              {privateFilesList.map((pf) => (
                <View
                  key={pf.uri}
                  className="flex-row items-center gap-2.5 border-b px-2 py-[10]"
                  style={{ borderBottomColor: borderColor }}>
                  <Folder size={18} color="rgba(255,255,255,0.5)" />
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
                    <Text className="text-xs font-semibold text-red-500">Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </>
      )}
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
        className="mb-5 rounded-2xl border p-2"
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
        className="mb-5 rounded-2xl border p-2"
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
        className="mb-5 rounded-2xl border p-2"
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
        className="mb-5 rounded-2xl border p-2"
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
        className="mb-5 rounded-2xl border p-2"
        style={{ borderColor, backgroundColor: cardBg }}>
        <TouchableOpacity
          className="mb-1 flex-row items-center gap-2.5 rounded-xl px-3 py-[14]"
          style={sleepTimerSettings.mode === 'off' && { backgroundColor: `${primaryColor}15` }}
          onPress={() => updateSleepTimerSetting('mode', 'off')}>
          <Timer
            size={20}
            color={sleepTimerSettings.mode === 'off' ? primaryColor : 'rgba(255,255,255,0.6)'}
          />
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
            color={sleepTimerSettings.mode === 'minutes' ? primaryColor : 'rgba(255,255,255,0.6)'}
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
            color={
              sleepTimerSettings.mode === 'endOfTrack' ? primaryColor : 'rgba(255,255,255,0.6)'
            }
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
            color={
              sleepTimerSettings.mode === 'endOfQueue' ? primaryColor : 'rgba(255,255,255,0.6)'
            }
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
        className="mb-5 rounded-2xl border p-2"
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
        className="mb-5 rounded-2xl border p-2"
        style={{ borderColor, backgroundColor: cardBg }}>
        <View className="items-center gap-3 py-8">
          <ShieldCheck
            size={64}
            color={adsRemoved ? primaryColor : 'rgba(255,255,255,0.2)'}
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
            <Text className="text-base font-bold text-[#06060B]">
              {t('settings.removeAdsPurchase')}
            </Text>
          </TouchableOpacity>
        )}

        {adsRemoved && (
          <View className="mx-4 mb-3 flex-row items-center justify-center gap-2 rounded-xl bg-[#C2FC4A]/10 py-4">
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
        className="mb-5 rounded-2xl border p-2"
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
          className="mb-5 rounded-2xl border p-2"
          style={{ borderColor, backgroundColor: cardBg }}>
          {renderMainList()}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </ScreenLayout>
  );
});
