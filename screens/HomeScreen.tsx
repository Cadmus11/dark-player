import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useFiles } from '../context/FileContext';
import { useTheme } from '../context/ThemeContext';
import { getFileIcon } from '../services/FileService';
import type { FileItem } from '../types';
import { SplashScreen } from './SplashScreen';
import { GlassCard } from '../components/GlassCard';
import { GlassButton } from '../components/GlassButton';
import { BlurBackground } from '../components/BlurBackground';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

const CATEGORY_ICONS: Record<string, string> = {
  images: '🖼',
  videos: '🎬',
  music: '♪',
  documents: '📄',
};

export function HomeScreen({ navigation }: HomeScreenProps) {
  const { permissionsGranted, loading, categories, files, requestPermissions } = useFiles();
  const { theme, textColor, mutedColor, cardBg, borderColor } = useTheme();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (!permissionsGranted && !showSplash) {
      requestPermissions();
    }
  }, [showSplash]);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (!permissionsGranted) {
    return (
      <View style={[styles.container, { backgroundColor: '#06060B' }]}>
        <View style={styles.permissionContainer}>
          <GlassCard style={styles.permissionCard} glowColor="#C2FC4A">
            <View style={styles.permissionInner}>
              <Text style={styles.permissionIcon}>♪</Text>
              <Text style={styles.permissionTitle}>Lumora</Text>
              <Text style={styles.permissionSubtitle}>
                Your Media, Immersive
              </Text>
              <GlassButton
                title="Grant Permissions"
                variant="neon"
                onPress={requestPermissions}
                size="lg"
                style={{ marginTop: 32 }}
              />
            </View>
          </GlassCard>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: '#06060B' }]}>
        <ActivityIndicator size="large" color="#C2FC4A" />
        <Text style={[styles.loadingText, { color: mutedColor }]}>Scanning media...</Text>
      </View>
    );
  }

  const navigateToCategory = (category: typeof categories[0]) => {
    if (category.id === 'documents') {
      navigation.navigate('Documents');
    } else {
      navigation.navigate('Category', {
        type: category.type,
        title: category.name,
        icon: category.icon,
      });
    }
  };

  const navigateToFile = (file: FileItem) => {
    if (file.type === 'image') {
      navigation.navigate('ImageViewer', { file });
    } else if (file.type === 'video') {
      navigation.navigate('VideoPlayer', { file });
    } else if (file.type === 'audio') {
      navigation.navigate('MusicPlayer', { file });
    } else if (file.type === 'document') {
      navigation.navigate('DocumentViewer', { file });
    }
  };

  const playAsAudio = (file: FileItem) => {
    navigation.navigate('MusicPlayer', { file, isVideoAsAudio: true });
  };

  return (
    <BlurBackground>
      <View style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: mutedColor }]}>Welcome to</Text>
            <Text style={[styles.title, { color: textColor }]}>Lumora</Text>
          </View>
          <TouchableOpacity
            style={[styles.settingsButton, { backgroundColor: cardBg, borderColor }]}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={[styles.settingsIcon, { color: '#C2FC4A' }]}>⚙</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
          <GlassCard style={styles.quickAccessCard} glowColor="#C2FC4A" intensity={0.04}>
            <Text style={[styles.quickAccessTitle, { color: textColor }]}>Quick Access</Text>
            <View style={styles.quickAccessGrid}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.quickAccessItem, { backgroundColor: 'rgba(194, 252, 74, 0.08)' }]}
                  onPress={() => navigateToCategory(category)}
                >
                  <Text style={styles.quickAccessIcon}>
                    {CATEGORY_ICONS[category.id] || category.icon}
                  </Text>
                  <Text style={[styles.quickAccessLabel, { color: textColor }]}>
                    {category.name}
                  </Text>
                  <Text style={[styles.quickAccessCount, { color: mutedColor }]}>
                    {category.count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>

          {files.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Recent</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.recentFilesScroll}
              >
                {files.slice(0, 12).map((file) => (
                  <TouchableOpacity
                    key={file.uri}
                    style={[styles.recentFileCard, { backgroundColor: cardBg, borderColor }]}
                    onPress={() => navigateToFile(file)}
                  >
                    <View style={styles.recentFileIconWrap}>
                      <Text style={styles.recentFileIcon}>
                        {getFileIcon(file.type)}
                      </Text>
                    </View>
                    <Text style={[styles.recentFileName, { color: textColor }]} numberOfLines={2}>
                      {file.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </BlurBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#06060B' },
  center: { justifyContent: 'center', alignItems: 'center' },
  safeArea: { flex: 1, paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: { fontSize: 13, marginBottom: 2, letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontSize: 30, fontWeight: 'bold', letterSpacing: 2 },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  settingsIcon: { fontSize: 22 },
  scrollView: { flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16, letterSpacing: 1 },
  quickAccessCard: {
    padding: 20,
    marginBottom: 28,
  },
  quickAccessTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAccessItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  quickAccessIcon: { fontSize: 28, marginBottom: 8 },
  quickAccessLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  quickAccessCount: { fontSize: 11 },
  recentFilesScroll: { marginBottom: 20 },
  recentFileCard: {
    width: 100,
    marginRight: 12,
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  recentFileIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(194, 252, 74, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  recentFileIcon: { fontSize: 24 },
  recentFileName: { fontSize: 11, textAlign: 'center', lineHeight: 14 },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  permissionCard: {
    width: '100%',
    maxWidth: 340,
    padding: 40,
    alignItems: 'center',
  },
  permissionInner: { alignItems: 'center' },
  permissionIcon: {
    fontSize: 56,
    color: '#C2FC4A',
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 3,
    marginBottom: 8,
  },
  permissionSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 2,
    textAlign: 'center',
  },
  loadingText: { marginTop: 16, fontSize: 15, letterSpacing: 1 },
});
