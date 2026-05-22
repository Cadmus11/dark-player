import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import * as ImagePicker from 'expo-image-picker';
import {
  Clock, PaintBrush, Moon, EyeSlash, Trash,
  SlidersHorizontal, Translate, ChatCenteredDots, Info,
  MusicNotes, VideoCamera, FileText, Image as ImageIcon,
  SpeakerHigh, SquaresFour, CaretLeft, Check, TextAa,
  Bell, Timer, ShieldCheck, Folder, Star, ShareNetwork,
  Sun, Palette, Gradient, Globe, User,
} from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFont, FONT_OPTIONS } from '../context/FontContext';
import { useMediaStore } from '../stores/mediaStore';
import { useSettingsStore } from '../stores/settingsStore';
import { ScreenLayout } from '../components/ScreenLayout';
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
import type { PlaybackSettings, NotificationSettings, SleepTimerSettings, RecentlyPlayed, RecentlyDeleted, FileItem } from '../types';
import { COLOR_THEMES } from '../types';
import { PrivateFolderService } from '../services/PrivateFolderService';

const APP_VERSION = '1.0.0';

const ACCENT_COLORS = [
  '#C2FC4A', '#6c5ce7', '#00cec9', '#e17055',
  '#74b9ff', '#ff7675', '#a29bfe', '#55efc4',
  '#fdcb6e', '#fd79a8', '#e94560', '#58a6ff',
  '#8b5cf6', '#f59e0b', '#10b981', '#ec4899',
];

type ActiveView = 'list' | 'theme' | 'about' | 'language' | 'fonts' | 'hiddenFiles' | 'recentlyDeleted' | 'playback' | 'notification' | 'sleepTimer' | 'removeAds' | 'privateFolder' | 'futureUpdates';

export function SettingsScreen() {
  const { theme, updateTheme, setBackgroundImage, clearBackgroundImage, setBackgroundBlur, setBackgroundImageFit, setAccentColor, setGradient, setColorTheme, setDarkMode, isDarkMode, primaryColor, availableColorThemes, currentColorThemeName } = useTheme();
  const { t, language, setLanguage, languages } = useLanguage();
  const { fontKey, setFont } = useFont();
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentlyPlayed[]>([]);
  const [recentlyDeleted, setRecentlyDeleted] = useState<RecentlyDeleted[]>([]);
  useEffect(() => { getRecentlyPlayed().then(setRecentlyPlayed); }, []);
  useEffect(() => { getRecentlyDeleted().then(setRecentlyDeleted); }, []);
  const handleClearRecentlyDeleted = async () => { await clearRecentlyDeleted(); setRecentlyDeleted([]); };
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
    { id: 'profile', Icon: User, label: 'Profile' },
    { id: 'playtime', Icon: Clock, label: t('settings.playtime') },
    { id: 'theme', Icon: PaintBrush, label: t('settings.theme') },
    { id: 'hiddenFiles', Icon: EyeSlash, label: t('settings.hiddenFiles'), badge: hiddenFilesCount > 0 ? String(hiddenFilesCount) : undefined },
    { id: 'recentlyDeleted', Icon: Trash, label: t('settings.recentlyDeleted'), badge: recentlyDeleted.length > 0 ? String(recentlyDeleted.length) : undefined },
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

  const pickBackgroundImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant photo library access to select a background image.');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        await setBackgroundImage(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const applyColorPreset = async (preset: typeof COLOR_THEMES[0]) => {
    const isLight = preset.name === 'Light';
    const bg = isLight ? '#F5F5F5' : '#0a0a0a';
    await updateTheme({
      backgroundType: 'solid',
      backgroundColor: bg,
      gradientColors: undefined,
      backgroundImageUri: undefined,
      primaryColor: preset.primary,
    });
  };

  const handleSettingPress = (id: string) => {
    switch (id) {
      case 'profile': navigation.navigate('Profile'); break;
      case 'theme': setActiveView('theme'); break;
      case 'futureUpdates': setActiveView('futureUpdates'); break;
      case 'about': setActiveView('about'); break;
      case 'language': setActiveView('language'); break;
      case 'fonts': setActiveView('fonts'); break;
      case 'hiddenFiles': setActiveView('hiddenFiles'); break;
      case 'recentlyDeleted': setActiveView('recentlyDeleted'); break;
      case 'playback': setActiveView('playback'); break;
      case 'notification': setActiveView('notification'); break;
      case 'sleepTimer': setActiveView('sleepTimer'); break;
      case 'privateFolder': setActiveView('privateFolder'); break;
      case 'feedback':
        Linking.openURL('mailto:support@lumora.app?subject=Lumora%20Feedback');
        break;
      case 'removeAds': setActiveView('removeAds'); break;
      case 'share':
        Share.share({ message: 'Check out Lumora - a beautiful media player!', url: 'https://lumora.app' });
        break;
      case 'rate':
        Linking.openURL(Platform.OS === 'ios' ? 'https://apps.apple.com/app/id12345' : 'https://play.google.com/store/apps/details?id=com.lumora.app');
        break;
      case 'playtime': break;
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
          style={styles.settingRow}
          onPress={() => handleSettingPress(item.id)}
        >
          <item.Icon size={22} color="#ffffff" />
          <Text style={styles.settingText}>{item.label}</Text>
          {item.id === 'playtime' && totalPlaytime !== '0s' && (
            <Text style={styles.badgeValue}>{totalPlaytime}</Text>
          )}
          {item.badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
          )}
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}
    </>
  );

  const renderThemeView = () => (
    <>
      <View style={styles.themeHeader}>
        <TouchableOpacity onPress={() => setActiveView('list')} style={styles.backButton}>
          <CaretLeft size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.themeHeaderTitle}>{t('settings.theme')}</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Dark/Light Mode Toggle */}
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <Sun size={22} color="#ffffff" />
          <Text style={styles.settingText}>Dark Mode</Text>
          <Switch
            value={isDarkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: '#3f3f46', true: primaryColor }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('settings.background')}</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.settingRow} onPress={pickBackgroundImage}>
          <ImageIcon size={22} color="#ffffff" />
          <Text style={styles.settingText}>{t('settings.chooseBgImage')}</Text>
        </TouchableOpacity>

        {theme.backgroundImageUri && (
          <View style={styles.currentBgContainer}>
            <Image source={{ uri: theme.backgroundImageUri }} style={styles.currentBgImage} />
            <TouchableOpacity style={styles.removeBgButton} onPress={clearBackgroundImage}>
              <Text style={styles.removeBgText}>{t('settings.remove')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => updateTheme({ backgroundType: 'solid', backgroundColor: isDarkMode ? '#06060B' : '#F5F5F5' })}
        >
          <View style={[styles.deepBlackIcon, { backgroundColor: isDarkMode ? '#06060B' : '#F5F5F5' }]} />
          <Text style={styles.settingText}>Solid Color</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Preset Backgrounds</Text>
      <View style={styles.card}>
        <View style={styles.gradientPresetRow}>
          {[
            { name: 'Green', file: require('../assets/green.png') },
            { name: 'Splash', file: require('../assets/splash.png') },
            { name: 'Lumora', file: require('../assets/lumora.png'), contain: true },
            { name: 'Future', file: require('../assets/future.png') },
            { name: 'App', file: require('../assets/app.png') },
          ].map((bg) => (
            <TouchableOpacity
              key={bg.name}
              style={styles.bgPreset}
              onPress={() => {
                const resolved = Image.resolveAssetSource(bg.file);
                if (resolved?.uri) {
                  setBackgroundImage(resolved.uri);
                  if (bg.contain) setBackgroundImageFit('contain');
                }
              }}
            >
              <Image source={bg.file} style={styles.bgPresetThumb} />
              <Text style={styles.bgPresetLabel}>{bg.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {theme.backgroundType === 'image' && theme.backgroundImageUri && (
        <>
          <Text style={styles.sectionTitle}>Background Adjustments</Text>
          <View style={styles.card}>
            <View style={styles.blurSection}>
              <Text style={styles.blurLabel}>Blur Intensity: {theme.backgroundBlur ?? 20}%</Text>
              <View style={styles.blurTrackContainer}>
                <TouchableOpacity
                  style={[styles.blurTrack, { backgroundColor: '#3f3f46' }]}
                  onPress={(e) => {
                    const x = (e.nativeEvent as any).locationX;
                    const trackWidth = 280;
                    const pct = Math.round((x / trackWidth) * 100);
                    setBackgroundBlur(Math.max(0, Math.min(100, pct)));
                  }}
                >
                  <View style={[styles.blurThumb, { left: `${theme.backgroundBlur ?? 20}%` as any }]} />
                </TouchableOpacity>
                <View style={styles.blurLabels}>
                  <Text style={styles.blurLabelSmall}>0%</Text>
                  <Text style={styles.blurLabelSmall}>50%</Text>
                  <Text style={styles.blurLabelSmall}>100%</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setBackgroundImageFit(theme.backgroundImageFit === 'cover' ? 'contain' : 'cover')}
            >
              <ImageIcon size={22} color="#ffffff" />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.settingText}>Image Fit</Text>
                <Text style={styles.settingDesc}>
                  {theme.backgroundImageFit === 'cover' ? 'Fill screen (may crop)' : 'Full image (no crop)'}
                </Text>
              </View>
              <View style={[styles.fitBadge, { backgroundColor: primaryColor + '20' }]}>
                <Text style={[styles.fitBadgeText, { color: primaryColor }]}>
                  {theme.backgroundImageFit === 'cover' ? 'COVER' : 'CONTAIN'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Gradient Themes */}
      <Text style={styles.sectionTitle}>Gradients</Text>
      <View style={styles.card}>
        <View style={styles.gradientPresetRow}>
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
              style={styles.gradientPreset}
              onPress={() => setGradient(g.colors)}
            >
              <View style={styles.gradientPreview}>
                {g.colors.map((c, i) => (
                  <View key={i} style={[styles.gradientSwatch, { backgroundColor: c, zIndex: g.colors.length - i }]} />
                ))}
              </View>
              <Text style={styles.gradientLabel} numberOfLines={1}>{g.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Color Themes */}
      <Text style={styles.sectionTitle}>{t('settings.colorThemes')}</Text>
      <View style={styles.card}>
        <View style={styles.themeGrid}>
          {(showAllThemes ? availableColorThemes : availableColorThemes.slice(0, 4)).map((ct) => (
            <TouchableOpacity
              key={ct.name}
              style={[styles.themeCard, currentColorThemeName === ct.name && { borderColor: primaryColor }]}
              onPress={() => setColorTheme(ct.name)}
            >
              <View style={[styles.themePreview, { backgroundColor: ct.background }]}>
                <View style={[styles.themeAccentDot, { backgroundColor: ct.primary }]} />
              </View>
              <Text style={[styles.themeCardName, currentColorThemeName === ct.name && { color: primaryColor }]}>
                {ct.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowAllThemes(!showAllThemes)}>
          <Text style={[styles.showMoreText, { color: primaryColor }]}>
            {showAllThemes ? 'Show Less' : `Show All (${availableColorThemes.length})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Accent Colors */}
      <Text style={styles.sectionTitle}>{t('settings.accentColor')}</Text>
      <View style={styles.card}>
        <View style={styles.accentPreview}>
          <View style={[styles.accentPreviewSwatch, { backgroundColor: primaryColor }]} />
          <Text style={styles.accentPreviewLabel}>{primaryColor}</Text>
        </View>
        <View style={styles.accentRow}>
          {ACCENT_COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.accentCircle,
                { backgroundColor: color },
                theme.primaryColor === color && styles.accentCircleActive,
              ]}
              onPress={() => setAccentColor(color)}
            >
              {theme.primaryColor === color && (
                <Check size={16} color="#0a0a0a" weight="bold" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </>
  );

  const renderAboutView = () => (
    <>
      <View style={styles.themeHeader}>
        <TouchableOpacity onPress={() => setActiveView('list')} style={styles.backButton}>
          <CaretLeft size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.themeHeaderTitle}>{t('about.title')}</Text>
        <View style={{ width: 44 }} />
      </View>
      <View style={styles.card}>
        <Text style={styles.appName}>Lumora</Text>
        <Text style={styles.appVersion}>{t('about.version', { version: appVersion })}</Text>
        <Text style={styles.appDescription}>
          {t('about.description')}
        </Text>
        <View style={styles.features}>
          <Text style={styles.featureTitle}>{t('about.features')}:</Text>
          {[
            { Icon: MusicNotes, text: t('about.feature.music') },
            { Icon: VideoCamera, text: t('about.feature.video') },
            { Icon: ImageIcon, text: t('about.feature.image') },
            { Icon: FileText, text: t('about.feature.document') },
            { Icon: PaintBrush, text: t('about.feature.theme') },
            { Icon: SquaresFour, text: t('about.feature.ui') },
            { Icon: SpeakerHigh, text: t('about.feature.accent') },
          ].map(({ Icon, text }) => (
            <View key={text} style={styles.featureRow}>
              <Icon size={16} color="rgba(255, 255, 255, 0.7)" />
              <Text style={styles.featureItem}>{text}</Text>
            </View>
          ))}
        </View>
        <View style={styles.aboutFooter}>
          <Image
            source={require('../assets/app.png')}
            style={styles.aboutLogo}
            resizeMode="contain"
          />
          <Text style={styles.aboutCredit}>By Cadmus Labs</Text>
          <TouchableOpacity style={styles.rateBtn} onPress={() => Linking.openURL(Platform.OS === 'ios' ? 'https://apps.apple.com/app/id12345' : 'https://play.google.com/store/apps/details?id=com.lumora.app')}>
            <Star size={16} color="#C2FC4A" weight="fill" />
            <Text style={styles.rateBtnText}>Rate Lumora</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  const renderLanguageView = () => (
    <>
      <View style={styles.themeHeader}>
        <TouchableOpacity onPress={() => setActiveView('list')} style={styles.backButton}>
          <CaretLeft size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.themeHeaderTitle}>{t('settings.selectLanguage')}</Text>
        <View style={{ width: 44 }} />
      </View>
      <View style={styles.card}>
        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={styles.languageRow}
            onPress={() => setLanguage(lang.code)}
          >
            <Text style={[styles.languageName, language === lang.code && { color: primaryColor }]}>
              {lang.nativeName}
            </Text>
            <Text style={styles.languageEnglishName}>{lang.name}</Text>
            {language === lang.code && (
              <Check size={20} color={primaryColor} weight="bold" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  const renderFontsView = () => (
    <>
      <View style={styles.themeHeader}>
        <TouchableOpacity onPress={() => setActiveView('list')} style={styles.backButton}>
          <CaretLeft size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.themeHeaderTitle}>{t('settings.selectFont')}</Text>
        <View style={{ width: 44 }} />
      </View>
      <View style={styles.card}>
        {FONT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={styles.languageRow}
            onPress={() => setFont(opt.key)}
          >
            <Text style={[styles.languageName, fontKey === opt.key && { color: primaryColor }]}>
              {t(opt.labelKey)}
            </Text>
            {fontKey === opt.key && (
              <Check size={20} color={primaryColor} weight="bold" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  const renderHiddenFilesView = () => (
    <>
      <View style={styles.themeHeader}>
        <TouchableOpacity onPress={() => setActiveView('list')} style={styles.backButton}>
          <CaretLeft size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.themeHeaderTitle}>{t('settings.hiddenFiles')}</Text>
        <View style={{ width: 44 }} />
      </View>
      <View style={styles.card}>
        <Text style={styles.badgeSummary}>
          {t('settings.hiddenFilesCount', { count: hiddenFilesCount })}
        </Text>
      </View>
      {hiddenFiles.length > 0 ? (
        <FlatList
          data={hiddenFiles}
          keyExtractor={(item) => item.uri}
          renderItem={({ item }) => (
            <View style={styles.hiddenFileRow}>
              <MusicNotes size={18} color="rgba(255,255,255,0.5)" />
              <View style={styles.hiddenFileInfo}>
                <Text style={styles.hiddenFileName} numberOfLines={1}>{item.name}</Text>
                {item.duration && (
                  <Text style={styles.hiddenFileMeta}>
                    {Math.floor(item.duration / 1000)}s
                  </Text>
                )}
              </View>
            </View>
          )}
          scrollEnabled={false}
        />
      ) : (
        <Text style={styles.emptyText}>No hidden files</Text>
      )}
    </>
  );

  const renderRecentlyDeletedView = () => (
    <>
      <View style={styles.themeHeader}>
        <TouchableOpacity onPress={() => setActiveView('list')} style={styles.backButton}>
          <CaretLeft size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.themeHeaderTitle}>{t('settings.recentlyDeleted')}</Text>
        <View style={{ width: 44 }} />
      </View>
      {recentlyDeleted.length > 0 && (
        <TouchableOpacity style={styles.clearAllBtn} onPress={handleClearRecentlyDeleted}>
          <Text style={styles.clearAllText}>Clear All</Text>
        </TouchableOpacity>
      )}
      <View style={styles.card}>
        <Text style={styles.badgeSummary}>
          {t('settings.recentlyDeletedCount', { count: recentlyDeleted.length })}
        </Text>
      </View>
      {recentlyDeleted.length > 0 ? (
        <FlatList
          data={recentlyDeleted}
          keyExtractor={(item, idx) => item.file.uri + idx}
          renderItem={({ item }) => (
            <View style={[styles.hiddenFileRow, { flexWrap: 'wrap' }]}>
              <Trash size={18} color="rgba(255,255,255,0.5)" />
              <View style={styles.hiddenFileInfo}>
                <Text style={styles.hiddenFileName} numberOfLines={1}>{item.file.name}</Text>
                <Text style={styles.hiddenFileMeta}>
                  {new Date(item.deletedAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginLeft: 40, marginTop: 6 }}>
                <TouchableOpacity
                  style={[styles.restoreSmallBtn, { backgroundColor: `${primaryColor}15` }]}
                  onPress={async () => {
                    const ok = await restoreFromTrash(item.file.uri);
                    if (ok) {
                      await removeFromRecentlyDeleted(item.file.uri);
                      setRecentlyDeleted(await getRecentlyDeleted());
                      Alert.alert('Restored', 'File has been restored to its original location.');
                    } else {
                      await removeFromRecentlyDeleted(item.file.uri);
                      setRecentlyDeleted(await getRecentlyDeleted());
                      Alert.alert('Info', 'File entry removed. The original file could not be restored (no trash backup found).');
                    }
                  }}
                >
                  <Text style={[styles.restoreSmallText, { color: primaryColor }]}>Restore</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.restoreSmallBtn, { backgroundColor: 'rgba(239,68,68,0.15)' }]}
                  onPress={async () => {
                    Alert.alert('Permanently Delete', 'This will permanently delete the backed-up file. This cannot be undone.', [
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
                    ]);
                  }}
                >
                  <Text style={[styles.restoreSmallText, { color: '#ef4444' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          scrollEnabled={false}
        />
      ) : (
        <Text style={styles.emptyText}>No recently deleted files</Text>
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
      <View style={styles.themeHeader}>
        <TouchableOpacity onPress={() => setActiveView('list')} style={styles.backButton}>
          <CaretLeft size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.themeHeaderTitle}>Private Folder</Text>
        <View style={{ width: 44 }} />
      </View>
      {!privateFolderExists ? (
        <View style={styles.card}>
          <Text style={styles.privateFolderInfo}>
            Create a private folder on your device to hide sensitive files from the main library.
            Files in this folder will only appear when accessed from this screen.
          </Text>
          <TouchableOpacity
            style={[styles.privateFolderBtn, { backgroundColor: primaryColor }]}
            onPress={async () => {
              const ok = await PrivateFolderService.setupFolder();
              if (ok) {
                setPrivateFolderExists(true);
                const info = await PrivateFolderService.getFolderInfo();
                setPrivateFolderInfo(info);
                Alert.alert('Created', 'Private folder has been created successfully.');
              } else {
                Alert.alert('Error', 'Failed to create private folder. Please check storage permissions.');
              }
            }}
          >
            <Folder size={20} color="#06060B" weight="bold" />
            <Text style={styles.privateFolderBtnText}>Create Private Folder</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <View style={{ padding: 12, gap: 6 }}>
              <Text style={styles.badgeSummary}>
                {privateFilesList.length} file{privateFilesList.length !== 1 ? 's' : ''} in private folder
              </Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', paddingHorizontal: 12 }}>
                Size: {(privateFolderInfo.totalSize / 1024 / 1024).toFixed(1)} MB
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.privateFolderBtn, { backgroundColor: 'rgba(239,68,68,0.15)', marginHorizontal: 16, marginBottom: 16 }]}
              onPress={() => {
                Alert.alert('Delete Private Folder', 'This will permanently delete the folder and all files in it. This cannot be undone.', [
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
                ]);
              }}
            >
              <Trash size={16} color="#ef4444" />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#ef4444' }}>Delete Private Folder</Text>
            </TouchableOpacity>
          </View>
          {privateFilesList.length > 0 && (
            <View style={styles.card}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff', padding: 12 }}>Files</Text>
              {privateFilesList.map((pf) => (
                <View key={pf.uri} style={styles.hiddenFileRow}>
                  <Folder size={18} color="rgba(255,255,255,0.5)" />
                  <View style={styles.hiddenFileInfo}>
                    <Text style={styles.hiddenFileName} numberOfLines={1}>{pf.name}</Text>
                    <Text style={styles.hiddenFileMeta}>
                      {new Date(pf.addedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.restoreSmallBtn, { backgroundColor: 'rgba(239,68,68,0.15)' }]}
                    onPress={async () => {
                      await PrivateFolderService.removeFile(pf.uri);
                      const files = await PrivateFolderService.getPrivateFiles();
                      setPrivateFilesList(files);
                      const info = await PrivateFolderService.getFolderInfo();
                      setPrivateFolderInfo(info);
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#ef4444' }}>Remove</Text>
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
      <View style={styles.themeHeader}>
        <TouchableOpacity onPress={() => setActiveView('list')} style={styles.backButton}>
          <CaretLeft size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.themeHeaderTitle}>{t('settings.playback')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Text style={styles.settingText}>{t('settings.playWithOtherApps')}</Text>
            <Text style={styles.settingDesc}>{t('settings.playWithOtherAppsDesc')}</Text>
          </View>
          <Switch
            value={playbackSettings.playWithOtherApps}
            onValueChange={(v) => updatePlaybackSetting('playWithOtherApps', v)}
            trackColor={{ false: '#3f3f46', true: primaryColor }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Text style={styles.settingText}>{t('settings.crossFade')}</Text>
            <Text style={styles.settingDesc}>{t('settings.crossFadeDesc')}</Text>
          </View>
          <Switch
            value={playbackSettings.crossFade}
            onValueChange={(v) => updatePlaybackSetting('crossFade', v)}
            trackColor={{ false: '#3f3f46', true: primaryColor }}
            thumbColor="#ffffff"
          />
        </View>
        {playbackSettings.crossFade && (
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>{t('settings.crossFadeDuration')}</Text>
            <View style={styles.inputUnitRow}>
              <TextInput
                style={styles.numberInput}
                value={crossFadeInput}
                onChangeText={setCrossFadeInput}
                onBlur={handleCrossFadeBlur}
                keyboardType="numeric"
                selectTextOnFocus
              />
              <Text style={styles.inputUnit}>{t('settings.seconds')}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Text style={styles.settingText}>{t('settings.gaplessPlayback')}</Text>
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
      <View style={styles.themeHeader}>
        <TouchableOpacity onPress={() => setActiveView('list')} style={styles.backButton}>
          <CaretLeft size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.themeHeaderTitle}>{t('settings.notifications')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.sectionTitle}>{t('settings.notification')}</Text>
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <Text style={styles.settingText}>{t('settings.newMediaNotification')}</Text>
          <Switch
            value={notificationSettings.newMediaNotification}
            onValueChange={(v) => updateNotificationSetting('newMediaNotification', v)}
            trackColor={{ false: '#3f3f46', true: primaryColor }}
            thumbColor="#ffffff"
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.settingText}>{t('settings.pushNotification')}</Text>
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
      <View style={styles.themeHeader}>
        <TouchableOpacity onPress={() => setActiveView('list')} style={styles.backButton}>
          <CaretLeft size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.themeHeaderTitle}>{t('settings.sleepTimer')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.card}>
        <TouchableOpacity
          style={[styles.modeRow, sleepTimerSettings.mode === 'off' && { backgroundColor: `${primaryColor}15` }]}
          onPress={() => updateSleepTimerSetting('mode', 'off')}
        >
          <Timer size={20} color={sleepTimerSettings.mode === 'off' ? primaryColor : 'rgba(255,255,255,0.6)'} />
          <Text style={[styles.modeText, sleepTimerSettings.mode === 'off' && { color: primaryColor }]}>
            {t('settings.sleepTimerOff')}
          </Text>
          {sleepTimerSettings.mode === 'off' && <Check size={18} color={primaryColor} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeRow, sleepTimerSettings.mode === 'minutes' && { backgroundColor: `${primaryColor}15` }]}
          onPress={() => updateSleepTimerSetting('mode', 'minutes')}
        >
          <Timer size={20} color={sleepTimerSettings.mode === 'minutes' ? primaryColor : 'rgba(255,255,255,0.6)'} />
          <Text style={[styles.modeText, sleepTimerSettings.mode === 'minutes' && { color: primaryColor }]}>
            {t('settings.sleepTimerMinutes')}
          </Text>
          {sleepTimerSettings.mode === 'minutes' && <Check size={18} color={primaryColor} />}
        </TouchableOpacity>

        {sleepTimerSettings.mode === 'minutes' && (
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>{t('settings.sleepTimerCustom')}</Text>
            <View style={styles.inputUnitRow}>
              <TextInput
                style={styles.numberInput}
                value={sleepMinutesInput}
                onChangeText={setSleepMinutesInput}
                onBlur={handleSleepMinutesBlur}
                keyboardType="numeric"
                selectTextOnFocus
              />
              <Text style={styles.inputUnit}>{t('settings.sleepTimerMinutes')}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.modeRow, sleepTimerSettings.mode === 'endOfTrack' && { backgroundColor: `${primaryColor}15` }]}
          onPress={() => updateSleepTimerSetting('mode', 'endOfTrack')}
        >
          <MusicNotes size={20} color={sleepTimerSettings.mode === 'endOfTrack' ? primaryColor : 'rgba(255,255,255,0.6)'} />
          <Text style={[styles.modeText, sleepTimerSettings.mode === 'endOfTrack' && { color: primaryColor }]}>
            {t('settings.sleepTimerEndOfTrack')}
          </Text>
          {sleepTimerSettings.mode === 'endOfTrack' && <Check size={18} color={primaryColor} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeRow, sleepTimerSettings.mode === 'endOfQueue' && { backgroundColor: `${primaryColor}15` }]}
          onPress={() => updateSleepTimerSetting('mode', 'endOfQueue')}
        >
          <MusicNotes size={20} color={sleepTimerSettings.mode === 'endOfQueue' ? primaryColor : 'rgba(255,255,255,0.6)'} />
          <Text style={[styles.modeText, sleepTimerSettings.mode === 'endOfQueue' && { color: primaryColor }]}>
            {t('settings.sleepTimerEndOfQueue')}
          </Text>
          {sleepTimerSettings.mode === 'endOfQueue' && <Check size={18} color={primaryColor} />}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Text style={styles.settingText}>{t('settings.playOneToEnd')}</Text>
            <Text style={styles.settingDesc}>{t('settings.playOneToEndDesc')}</Text>
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
      <View style={styles.themeHeader}>
        <TouchableOpacity onPress={() => setActiveView('list')} style={styles.backButton}>
          <CaretLeft size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.themeHeaderTitle}>{t('settings.removeAds')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.card}>
        <View style={styles.removeAdsHero}>
          <ShieldCheck size={64} color={adsRemoved ? primaryColor : 'rgba(255,255,255,0.2)'} weight={adsRemoved ? 'fill' : 'regular'} />
          <Text style={[styles.removeAdsTitle, adsRemoved && { color: primaryColor }]}>
            {adsRemoved ? t('settings.removeAdsPurchased') : t('settings.removeAdsPurchase')}
          </Text>
          <Text style={styles.removeAdsDesc}>{t('settings.removeAdsDesc')}</Text>
        </View>

        {!adsRemoved && (
          <TouchableOpacity
            style={[styles.purchaseButton, { backgroundColor: primaryColor }]}
            onPress={async () => {
              await setRemoveAds(true);
              setAdsRemoved(true);
            }}
          >
            <Text style={styles.purchaseButtonText}>{t('settings.removeAdsPurchase')}</Text>
          </TouchableOpacity>
        )}

        {adsRemoved && (
          <View style={styles.purchasedBadge}>
            <Check size={20} color={primaryColor} weight="bold" />
            <Text style={[styles.purchasedText, { color: primaryColor }]}>{t('settings.removeAdsPurchased')}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.restoreButton} onPress={async () => {
          const value = await getRemoveAds();
          setAdsRemoved(value);
          if (value) {
            Alert.alert('Restored', 'Your purchase has been restored.');
          } else {
            Alert.alert('No Purchase Found', 'No previous purchase was found to restore.');
          }
        }}>
          <Text style={styles.restoreText}>{t('settings.removeAdsRestore')}</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const FUTURE_UPDATES: { Icon: any; title: string; desc: string }[] = [
    { Icon: MusicNotes, title: 'Lyrics & Karaoke', desc: 'Synced lyrics display with auto-fetch and karaoke-style highlighting' },
    { Icon: SlidersHorizontal, title: '10-Band Equalizer', desc: 'Professional EQ with custom presets, bass boost, and reverb effects' },
    { Icon: VideoCamera, title: 'Chromecast & AirPlay', desc: 'Stream media to TV and speakers via Chromecast, AirPlay, and DLNA' },
    { Icon: ShareNetwork, title: 'Local Network Share', desc: 'Share/receive media between devices on the same Wi-Fi network' },
    { Icon: SquaresFour, title: 'Smart Playlists', desc: 'Auto-generated playlists by genre, mood, play count, and habits' },
    { Icon: Globe, title: 'Full Offline Mode', desc: 'Download from cloud, stream from Plex, Jellyfin, and SMB shares' },
    { Icon: Bell, title: 'Podcast Support', desc: 'Podcast discovery, subscriptions, and episode auto-downloads' },
    { Icon: Timer, title: 'Advanced Sleep Timer', desc: 'Fade-out volume, smart quiet-section detection, scheduled times' },
    { Icon: PaintBrush, title: 'Live Wallpaper Backdrops', desc: 'Animated/motion wallpapers as app background' },
    { Icon: Translate, title: 'More Languages', desc: 'Arabic, Hindi, Bengali, Turkish, Vietnamese, and more' },
    { Icon: TextAa, title: 'Custom Font Upload', desc: 'Import .ttf font files in-app without rebuilding' },
    { Icon: Star, title: 'Android Auto & CarPlay', desc: 'Optimized driving interface with voice control' },
    { Icon: MusicNotes, title: 'Crossfade Playback', desc: 'Seamless track transitions with configurable duration' },
    { Icon: FileText, title: 'PDF Bookmarks & Annotations', desc: 'Bookmark pages, highlight text, add notes to PDFs' },
    { Icon: ImageIcon, title: 'Photo Editing Tools', desc: 'Crop, rotate, filters, and adjustment sliders' },
    { Icon: ImageIcon, title: 'Manual Cover Upload', desc: 'Upload custom cover art for songs and albums via ImagePicker' },
  ];

  const renderFutureUpdatesView = () => (
    <>
      <View style={styles.themeHeader}>
        <TouchableOpacity onPress={() => setActiveView('list')} style={styles.backButton}>
          <CaretLeft size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.themeHeaderTitle}>Future Updates</Text>
        <View style={{ width: 44 }} />
      </View>
      <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 16, paddingHorizontal: 4 }}>
        Features planned for upcoming releases. Vote and suggest on our GitHub.
      </Text>
      <View style={styles.card}>
        {FUTURE_UPDATES.map((item, idx) => (
          <View key={idx} style={[styles.settingRow, idx === FUTURE_UPDATES.length - 1 && { borderBottomWidth: 0 }]}>
            <item.Icon size={22} color={primaryColor} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.settingText}>{item.title}</Text>
              <Text style={[styles.settingDesc, { marginLeft: 0, marginTop: 2 }]}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );

  const renderActiveView = () => {
    switch (activeView) {
      case 'theme': return renderThemeView();
      case 'about': return renderAboutView();
      case 'language': return renderLanguageView();
      case 'fonts': return renderFontsView();
      case 'hiddenFiles': return renderHiddenFilesView();
      case 'recentlyDeleted': return renderRecentlyDeletedView();
      case 'privateFolder': return renderPrivateFolderView();
      case 'playback': return renderPlaybackView();
      case 'notification': return renderNotificationView();
      case 'sleepTimer': return renderSleepTimerView();
      case 'removeAds': return renderRemoveAdsView();
      case 'futureUpdates': return renderFutureUpdatesView();
      default: return null;
    }
  };

  if (activeView !== 'list') {
    return (
      <ScreenLayout>
        <ScrollView contentContainerStyle={styles.content}>
          {renderActiveView()}
          <View style={{ height: 100 }} />
        </ScrollView>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>{t('settings.title')}</Text>
        <View style={styles.card}>{renderMainList()}</View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  pageTitle: { fontSize: 20, fontWeight: '600', color: '#ffffff', marginBottom: 16 },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingText: { fontSize: 15, color: '#ffffff', flex: 1, marginLeft: 14 },
  settingDesc: { fontSize: 12, color: 'rgba(255, 255, 255, 0.4)', marginLeft: 14, marginTop: 2 },
  badge: {
    backgroundColor: 'rgba(194, 252, 74, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  badgeText: { fontSize: 12, color: '#C2FC4A', fontWeight: '600' },
  badgeValue: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    marginRight: 8,
  },
  badgeSummary: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    padding: 12,
  },
  chevron: { fontSize: 22, color: 'rgba(255, 255, 255, 0.3)' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#ffffff', marginBottom: 12, marginTop: 8 },
  currentBgContainer: { marginVertical: 12 },
  currentBgImage: { width: '100%', height: 120, borderRadius: 12 },
  removeBgButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  removeBgText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  colorPreset: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  colorPreview: { flexDirection: 'row', marginRight: 14 },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 6,
    marginLeft: -6,
    borderWidth: 2,
    borderColor: '#0a0a0a',
  },
  presetName: { fontSize: 15, color: '#ffffff' },
  accentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
  },
  accentPreviewSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  accentPreviewLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'monospace',
  },
  accentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  accentCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accentCircleActive: { borderColor: '#ffffff' },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  themeHeaderTitle: { fontSize: 20, fontWeight: '600', color: '#ffffff' },
  appName: { fontSize: 24, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', marginBottom: 8 },
  appVersion: { fontSize: 14, color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', marginBottom: 16 },
  appDescription: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  features: {},
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  featureTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff', marginBottom: 12 },
  featureItem: { fontSize: 14, color: 'rgba(255, 255, 255, 0.7)', marginLeft: 8 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  deepBlackIcon: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  aboutFooter: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 16,
  },
  aboutLogo: {
    width: 120,
    height: 40,
    marginBottom: 8,
  },
  aboutCredit: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(194, 252, 74, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  rateBtnText: {
    fontSize: 14,
    color: '#C2FC4A',
    fontWeight: '600',
  },
  languageName: { fontSize: 16, color: '#ffffff', flex: 1 },
  languageEnglishName: { fontSize: 13, color: 'rgba(255, 255, 255, 0.4)', marginRight: 12 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  switchLabel: { flex: 1, marginRight: 12 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    paddingLeft: 22,
  },
  inputLabel: { fontSize: 14, color: 'rgba(255, 255, 255, 0.6)' },
  inputUnitRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  numberInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    color: '#ffffff',
    fontSize: 14,
    width: 60,
    textAlign: 'center',
  },
  inputUnit: { fontSize: 13, color: 'rgba(255, 255, 255, 0.4)' },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
    gap: 10,
  },
  modeText: { fontSize: 15, color: 'rgba(255, 255, 255, 0.8)', flex: 1 },
  hiddenFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  hiddenFileInfo: { flex: 1 },
  hiddenFileName: { fontSize: 14, color: 'rgba(255, 255, 255, 0.7)' },
  hiddenFileMeta: { fontSize: 12, color: 'rgba(255, 255, 255, 0.3)', marginTop: 2 },
  emptyText: { fontSize: 14, color: 'rgba(255, 255, 255, 0.3)', textAlign: 'center', paddingVertical: 20 },
  clearAllBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  clearAllText: { fontSize: 14, color: '#ef4444', fontWeight: '600' },
  removeAdsHero: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  removeAdsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  removeAdsDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  purchaseButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#06060B',
  },
  purchasedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(194, 252, 74, 0.1)',
    borderRadius: 14,
  },
  purchasedText: {
    fontSize: 16,
    fontWeight: '700',
  },
  restoreButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  restoreText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
  },

  // Background adjustments
  blurSection: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  blurLabel: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 12,
  },
  blurTrackContainer: {
    alignItems: 'center',
  },
  blurTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    position: 'relative',
    justifyContent: 'center',
  },
  blurThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#C2FC4A',
    top: -7,
    transform: [{ translateX: -10 }],
  },
  blurLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  blurLabelSmall: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  fitBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  fitBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // Theme grid
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 8,
  },
  themeCard: {
    width: 70,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  themePreview: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  themeAccentDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  themeCardName: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    textAlign: 'center',
  },
  showMoreBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  showMoreText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Gradient presets
  gradientPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 8,
  },
  gradientPreset: {
    width: 100,
    alignItems: 'center',
  },
  gradientPreview: {
    width: 88,
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  gradientSwatch: {
    flex: 1,
    height: '100%',
  },
  gradientLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },

  // Private folder
  privateFolderInfo: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 22,
    padding: 16,
    textAlign: 'center',
  },
  privateFolderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  privateFolderBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#06060B',
  },
  restoreSmallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  restoreSmallText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Preset backgrounds
  bgPreset: {
    width: 90,
    alignItems: 'center',
    paddingBottom: 8,
  },
  bgPresetThumb: {
    width: 80,
    height: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  bgPresetLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
    textAlign: 'center',
  },
});
