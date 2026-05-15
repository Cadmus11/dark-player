import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ImageBackground,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useFiles } from '../context/FileContext';
import { useTheme } from '../context/ThemeContext';
import { getFileIcon } from '../services/FileService';
import type { FileItem } from '../types';
import { SplashScreen } from './SplashScreen';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

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
      <View style={[styles.container, { backgroundColor: '#0a0a0a' }]}>
        <View style={styles.permissionContainer}>
          <View style={[styles.permissionIconContainer, { borderColor: theme.primaryColor + '60' }]}>
            <Text style={styles.permissionIcon}>📂</Text>
          </View>
          <Text style={styles.permissionTitle}>Dark Manager</Text>
          <Text style={styles.permissionSubtitle}>
            Your Files, Beautifully Organized
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: theme.primaryColor }]}
            onPress={requestPermissions}
          >
            <Text style={styles.permissionButtonText}>Grant Permissions</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: '#0a0a0a' }]}>
        <ActivityIndicator size="large" color={theme.primaryColor} />
        <Text style={[styles.loadingText, { color: mutedColor }]}>Scanning files...</Text>
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

  const renderBackground = () => {
    if (theme.backgroundType === 'image' && theme.backgroundImageUri) {
      return (
        <ImageBackground
          source={{ uri: theme.backgroundImageUri }}
          style={StyleSheet.absoluteFill}
          imageStyle={{ opacity: 0.4 }}
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />
        </ImageBackground>
      );
    }

    if (theme.backgroundType === 'gradient' && theme.gradientColors) {
      return (
        <LinearGradient
          colors={theme.gradientColors as [string, string, ...string[]]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      );
    }

    return <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.backgroundColor }]} />;
  };

  return (
    <View style={styles.container}>
      {renderBackground()}
      <View style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: mutedColor }]}>Welcome to</Text>
            <Text style={[styles.title, { color: textColor }]}>Dark Manager</Text>
          </View>
          <TouchableOpacity
            style={[styles.settingsButton, { backgroundColor: cardBg }]}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Browse by Type</Text>
          <View style={styles.categoriesGrid}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryCard, { backgroundColor: cardBg, borderColor }]}
                onPress={() => navigateToCategory(category)}
              >
                <View style={[styles.categoryIconContainer, { backgroundColor: category.color + '25' }]}>
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                </View>
                <Text style={[styles.categoryName, { color: textColor }]}>{category.name}</Text>
                <Text style={[styles.categoryCount, { color: mutedColor }]}>
                  {category.count} files
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {files.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Recent Files</Text>
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
                    <Text style={styles.recentFileIcon}>{getFileIcon(file.type)}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { justifyContent: 'center', alignItems: 'center' },
  safeArea: { flex: 1, paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: { fontSize: 14, marginBottom: 2 },
  title: { fontSize: 28, fontWeight: 'bold', letterSpacing: 1 },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: { fontSize: 20 },
  scrollView: { flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 14 },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  categoryCard: {
    width: '48%',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  categoryIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  categoryIcon: { fontSize: 32 },
  categoryName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  categoryCount: { fontSize: 13 },
  recentFilesScroll: { marginBottom: 20 },
  recentFileCard: {
    width: 90,
    marginRight: 12,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  recentFileIcon: { fontSize: 30, marginBottom: 8 },
  recentFileName: { fontSize: 11, textAlign: 'center' },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 25,
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 2,
  },
  permissionIcon: { fontSize: 50 },
  permissionTitle: { fontSize: 32, fontWeight: 'bold', color: '#ffffff', marginBottom: 8, letterSpacing: 1 },
  permissionSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 40,
  },
  permissionButton: { paddingHorizontal: 36, paddingVertical: 16, borderRadius: 14 },
  permissionButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  loadingText: { marginTop: 16, fontSize: 16 },
});
