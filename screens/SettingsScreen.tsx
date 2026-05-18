import React, { useState } from 'react';
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
  SpeakerHigh, SquaresFour, CaretLeft,
} from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';
import { TopBar } from '../components/TopBar';

const APP_VERSION = '1.0.0';

const COLOR_PRESETS = [
  { name: 'Dark Matter', colors: ['#06060B', '#1D1D21', '#0a0a0f'], primary: '#C2FC4A' },
  { name: 'Neon Pulse', colors: ['#06060B', '#1D1D21', '#2d1b69'], primary: '#C2FC4A' },
  { name: 'Cyberpunk', colors: ['#0a0a0a', '#ff006e', '#8338ec'], primary: '#ff006e' },
  { name: 'Ocean Deep', colors: ['#03045e', '#0077b6', '#00b4d8'], primary: '#00b4d8' },
  { name: 'Forest', colors: ['#0d1b2a', '#1b4332', '#2d6a4f'], primary: '#52b788' },
  { name: 'Sunset', colors: ['#2d1b69', '#e44d6e', '#f7b731'], primary: '#e44d6e' },
];

const SETTINGS_ITEMS = [
  { id: 'playtime', Icon: Clock, label: 'Playtime' },
  { id: 'theme', Icon: PaintBrush, label: 'Theme' },
  { id: 'sleepTimer', Icon: Moon, label: 'Sleep Timer' },
  { id: 'hiddenFiles', Icon: EyeSlash, label: 'Hidden Files' },
  { id: 'recentlyDeleted', Icon: Trash, label: 'Recently Deleted' },
  { id: 'playback', Icon: SlidersHorizontal, label: 'Playback Settings' },
  { id: 'language', Icon: Translate, label: 'Language' },
  { id: 'feedback', Icon: ChatCenteredDots, label: 'Feedback' },
  { id: 'about', Icon: Info, label: 'About' },
];

export function SettingsScreen() {
  const { theme, updateTheme, setBackgroundImage, clearBackgroundImage } = useTheme();
  const [activeView, setActiveView] = useState<'list' | 'theme' | 'about'>('list');

  const appVersion = APP_VERSION;

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
      case 'feedback':
        Linking.openURL('mailto:support@lumora.app?subject=Lumora%20Feedback');
        break;
      case 'playtime':
      case 'sleepTimer':
      case 'hiddenFiles':
      case 'recentlyDeleted':
      case 'playback':
      case 'language':
        Alert.alert('Coming Soon', `${SETTINGS_ITEMS.find(i => i.id === id)?.label} settings will be available in a future update.`);
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
        <Text style={styles.themeHeaderTitle}>Theme</Text>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.sectionTitle}>Background</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.settingRow} onPress={pickBackgroundImage}>
          <ImageIcon size={22} color="#ffffff" />
          <Text style={styles.settingText}>Choose Background Image</Text>
        </TouchableOpacity>

        {theme.backgroundImageUri && (
          <View style={styles.currentBgContainer}>
            <Image source={{ uri: theme.backgroundImageUri }} style={styles.currentBgImage} />
            <TouchableOpacity style={styles.removeBgButton} onPress={clearBackgroundImage}>
              <Text style={styles.removeBgText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => updateTheme({ backgroundType: 'solid', backgroundColor: '#06060B' })}
        >
          <View style={styles.deepBlackIcon} />
          <Text style={styles.settingText}>Deep Black</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Color Themes</Text>
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

      <Text style={styles.sectionTitle}>Accent Color</Text>
      <View style={styles.card}>
        <View style={styles.accentRow}>
          {[
            '#C2FC4A',
            '#6c5ce7',
            '#00cec9',
            '#e17055',
            '#74b9ff',
            '#ff7675',
            '#a29bfe',
            '#55efc4',
          ].map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.accentCircle,
                { backgroundColor: color },
                theme.primaryColor === color && styles.accentCircleActive,
              ]}
              onPress={() => updateTheme({ primaryColor: color })}
            />
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
        <Text style={styles.themeHeaderTitle}>About</Text>
        <View style={{ width: 44 }} />
      </View>
      <View style={styles.card}>
        <Text style={styles.appName}>Lumora</Text>
        <Text style={styles.appVersion}>Version {appVersion}</Text>
        <Text style={styles.appDescription}>
          A premium offline media hub. Experience your music, videos, images, and documents
          in a stunning neon-dark interface.
        </Text>
        <View style={styles.features}>
          <Text style={styles.featureTitle}>Features:</Text>
          {[
            { Icon: MusicNotes, text: 'Immersive music player' },
            { Icon: VideoCamera, text: 'Premium video player' },
            { Icon: ImageIcon, text: 'Cinematic image viewer' },
            { Icon: FileText, text: 'Document viewer' },
            { Icon: PaintBrush, text: 'Dynamic theme engine' },
            { Icon: SquaresFour, text: 'Glass morphism UI' },
            { Icon: SpeakerHigh, text: 'Neon-lime accent design' },
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

  if (activeView !== 'list') {
    return (
      <View style={styles.container}>
        <TopBar />
        <ScrollView contentContainerStyle={styles.content}>
          {activeView === 'theme' && renderThemeView()}
          {activeView === 'about' && renderAboutView()}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopBar />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>Settings</Text>
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
  accentRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingVertical: 8 },
  accentCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 3, borderColor: 'transparent' },
  accentCircleActive: { borderColor: '#C2FC4A' },
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
});
