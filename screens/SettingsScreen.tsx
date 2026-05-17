import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useTheme } from '../context/ThemeContext';

type SettingsScreenProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const COLOR_PRESETS = [
  { name: 'Dark Matter', colors: ['#06060B', '#1D1D21', '#0a0a0f'], primary: '#C2FC4A' },
  { name: 'Neon Pulse', colors: ['#06060B', '#1D1D21', '#2d1b69'], primary: '#C2FC4A' },
  { name: 'Cyberpunk', colors: ['#0a0a0a', '#ff006e', '#8338ec'], primary: '#ff006e' },
  { name: 'Ocean Deep', colors: ['#03045e', '#0077b6', '#00b4d8'], primary: '#00b4d8' },
  { name: 'Forest', colors: ['#0d1b2a', '#1b4332', '#2d6a4f'], primary: '#52b788' },
  { name: 'Sunset', colors: ['#2d1b69', '#e44d6e', '#f7b731'], primary: '#e44d6e' },
];

export function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { theme, updateTheme, setBackgroundImage, clearBackgroundImage } = useTheme();
  const [activeTab, setActiveTab] = useState<'theme' | 'about'>('theme');

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'theme' && styles.tabActive]}
          onPress={() => setActiveTab('theme')}
        >
          <Text style={[styles.tabText, activeTab === 'theme' && styles.tabTextActive]}>
            Theme
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'about' && styles.tabActive]}
          onPress={() => setActiveTab('about')}
        >
          <Text style={[styles.tabText, activeTab === 'about' && styles.tabTextActive]}>
            About
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'theme' && (
          <>
            <Text style={styles.sectionTitle}>Background</Text>
            <View style={styles.card}>
              <TouchableOpacity style={styles.settingRow} onPress={pickBackgroundImage}>
                <Text style={styles.settingIcon}>🖼️</Text>
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
                <Text style={styles.settingIcon}>⬛</Text>
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
        )}

        {activeTab === 'about' && (
          <View style={styles.card}>
            <Text style={styles.appName}>Lumora</Text>
            <Text style={styles.appVersion}>Version 1.0.0</Text>
            <Text style={styles.appDescription}>
              A premium offline media hub. Experience your music, videos, images, and documents
              in a stunning neon-dark interface.
            </Text>
            <View style={styles.features}>
              <Text style={styles.featureTitle}>Features:</Text>
              <Text style={styles.featureItem}>♪ Immersive music player</Text>
              <Text style={styles.featureItem}>🎬 Premium video player</Text>
              <Text style={styles.featureItem}>🖼 Cinematic image viewer</Text>
              <Text style={styles.featureItem}>📄 Document viewer</Text>
              <Text style={styles.featureItem}>🎨 Dynamic theme engine</Text>
              <Text style={styles.featureItem}>🖼 Glass morphism UI</Text>
              <Text style={styles.featureItem}>🔊 Neon-lime accent design</Text>
            </View>
          </View>
        )}

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#06060B' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 28, color: '#ffffff' },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#ffffff' },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20 },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#C2FC4A' },
  tabText: { fontSize: 16, fontWeight: '500', color: 'rgba(255, 255, 255, 0.5)' },
  tabTextActive: { color: '#ffffff' },
  content: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#ffffff', marginBottom: 12, marginTop: 8 },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingIcon: { fontSize: 22, marginRight: 14 },
  settingText: { fontSize: 15, color: '#ffffff' },
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
  appName: { fontSize: 24, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', marginBottom: 8 },
  appVersion: { fontSize: 14, color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', marginBottom: 16 },
  appDescription: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  features: { backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 12, padding: 16 },
  featureTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff', marginBottom: 12 },
  featureItem: { fontSize: 14, color: 'rgba(255, 255, 255, 0.7)', paddingVertical: 4 },
});
