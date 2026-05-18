import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Clock, PaintBrush, Moon, EyeSlash, Trash,
  SlidersHorizontal, Translate, ChatCenteredDots, Info,
  MusicNotes, VideoCamera, FileText, Image as ImageIcon,
  SpeakerHigh, SquaresFour, CaretLeft, Check, TextAa,
} from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFont, FONT_OPTIONS } from '../context/FontContext';
import { useFiles } from '../context/FileContext';
import { TopBar } from '../components/TopBar';

const APP_VERSION = '1.0.0';

const COLOR_PRESETS = [
  { name: 'Dark Matter', colors: ['#06060B', '#1D1D21', '#0a0a0f'], primary: '#C2FC4A' },
  { name: 'Neon Pulse', colors: ['#06060B', '#1D1D21', '#2d1b69'], primary: '#C2FC4A' },
  { name: 'Cyberpunk', colors: ['#0a0a0a', '#ff006e', '#8338ec'], primary: '#ff006e' },
  { name: 'Ocean Deep', colors: ['#03045e', '#0077b6', '#00b4d8'], primary: '#00b4d8' },
  { name: 'Forest', colors: ['#0d1b2a', '#1b4332', '#2d6a4f'], primary: '#52b788' },
  { name: 'Sunset', colors: ['#2d1b69', '#e44d6e', '#f7b731'], primary: '#e44d6e' },
  { name: 'Midnight', colors: ['#0f0f1a', '#1a1a2e', '#16213e'], primary: '#e94560' },
  { name: 'Nordic', colors: ['#0d1117', '#21262d', '#30363d'], primary: '#58a6ff' },
];

const ACCENT_COLORS = [
  '#C2FC4A', '#6c5ce7', '#00cec9', '#e17055',
  '#74b9ff', '#ff7675', '#a29bfe', '#55efc4',
  '#fdcb6e', '#fd79a8', '#e94560', '#58a6ff',
  '#8b5cf6', '#f59e0b', '#10b981', '#ec4899',
];

type ActiveView = 'list' | 'theme' | 'about' | 'language' | 'fonts';

export function SettingsScreen() {
  const { theme, updateTheme, setBackgroundImage, clearBackgroundImage, primaryColor } = useTheme();
  const { t, language, setLanguage, languages } = useLanguage();
  const { fontKey, setFont } = useFont();
  const { recentlyPlayed } = useFiles();
  const [activeView, setActiveView] = useState<ActiveView>('list');

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
    if (hours > 0) return `${hours}${t('playtime.hours', { h: 0 }).replace('0', String(hours))} ${minutes}${t('playtime.minutes', { m: 0 }).replace('0', String(minutes))} ${seconds}${t('playtime.seconds', { s: 0 }).replace('0', String(seconds))}`;
    if (minutes > 0) return `${minutes}${t('playtime.minutes', { m: 0 }).replace('0', String(minutes))} ${seconds}${t('playtime.seconds', { s: 0 }).replace('0', String(seconds))}`;
    return `${seconds}${t('playtime.seconds', { s: 0 }).replace('0', String(seconds))}`;
  }, [recentlyPlayed, t]);

  const SETTINGS_ITEMS = [
    { id: 'playtime', Icon: Clock, label: t('settings.playtime') },
    { id: 'theme', Icon: PaintBrush, label: t('settings.theme') },
    { id: 'sleepTimer', Icon: Moon, label: t('settings.sleepTimer') },
    { id: 'hiddenFiles', Icon: EyeSlash, label: t('settings.hiddenFiles') },
    { id: 'recentlyDeleted', Icon: Trash, label: t('settings.recentlyDeleted') },
    { id: 'playback', Icon: SlidersHorizontal, label: t('settings.playback') },
    { id: 'language', Icon: Translate, label: t('settings.language') },
    { id: 'fonts', Icon: TextAa, label: t('settings.fonts') },
    { id: 'feedback', Icon: ChatCenteredDots, label: t('settings.feedback') },
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

  const applyColorPreset = async (preset: (typeof COLOR_PRESETS)[0]) => {
    await updateTheme({
      backgroundType: 'gradient',
      gradientColors: preset.colors,
      primaryColor: preset.primary,
      backgroundImageUri: undefined,
    });
  };

  const handleSettingPress = (id: string) => {
    switch (id) {
      case 'theme':
        setActiveView('theme');
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
      case 'feedback':
        Linking.openURL('mailto:support@lumora.app?subject=Lumora%20Feedback');
        break;
      case 'playtime':
      case 'sleepTimer':
      case 'hiddenFiles':
      case 'recentlyDeleted':
      case 'playback':
        Alert.alert(t('settings.comingSoon'), t('settings.comingSoonMsg', { label: SETTINGS_ITEMS.find(i => i.id === id)?.label || id }));
        break;
    }
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
            <Text style={styles.playtimeValue}>{totalPlaytime}</Text>
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
          onPress={() => updateTheme({ backgroundType: 'solid', backgroundColor: '#06060B' })}
        >
          <View style={styles.deepBlackIcon} />
          <Text style={styles.settingText}>{t('settings.deepBlack')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>{t('settings.colorThemes')}</Text>
      <View style={styles.card}>
        {COLOR_PRESETS.map((preset) => (
          <TouchableOpacity
            key={preset.name}
            style={styles.colorPreset}
            onPress={() => applyColorPreset(preset)}
          >
            <View style={styles.colorPreview}>
              {preset.colors.map((color, i) => (
                <View key={i} style={[styles.colorSwatch, { backgroundColor: color }]} />
              ))}
            </View>
            <Text style={styles.presetName}>{preset.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

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
              onPress={() => updateTheme({ primaryColor: color })}
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
            <Text style={[
              styles.languageName,
              language === lang.code && { color: primaryColor },
            ]}>
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
            <Text style={[
              styles.languageName,
              fontKey === opt.key && { color: primaryColor },
            ]}>
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

  if (activeView !== 'list') {
    return (
      <View style={styles.container}>
        <TopBar />
        <ScrollView contentContainerStyle={styles.content}>
          {activeView === 'theme' && renderThemeView()}
          {activeView === 'about' && renderAboutView()}
          {activeView === 'language' && renderLanguageView()}
          {activeView === 'fonts' && renderFontsView()}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopBar />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>{t('settings.title')}</Text>
        <View style={styles.card}>{renderMainList()}</View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#06060B' },
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
  playtimeValue: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    marginRight: 8,
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
    backgroundColor: '#06060B',
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
  languageName: { fontSize: 16, color: '#ffffff', flex: 1 },
  languageEnglishName: { fontSize: 13, color: 'rgba(255, 255, 255, 0.4)', marginRight: 12 },
});
