import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useFiles } from '../context/FileContext';
import { useTheme } from '../context/ThemeContext';
import { getFileIcon } from '../services/FileService';
import type { FileItem } from '../types';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: HomeScreenProps) {
  const { permissionsGranted, loading, categories, files, requestPermissions } = useFiles();
  const { theme } = useTheme();

  useEffect(() => {
    if (!permissionsGranted) {
      requestPermissions();
    }
  }, []);

  if (!permissionsGranted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionIcon}>📂</Text>
          <Text style={styles.permissionTitle}>Dark Manager</Text>
          <Text style={styles.permissionSubtitle}>
            A beautiful file manager for all your media
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermissions}>
            <Text style={styles.permissionButtonText}>Grant Permissions</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.primaryColor} />
        <Text style={styles.loadingText}>Scanning files...</Text>
      </View>
    );
  }

  const renderCategoryCard = (category: typeof categories[0]) => (
    <TouchableOpacity
      key={category.id}
      style={styles.categoryCard}
      onPress={() =>
        navigation.navigate('Category', {
          type: category.type,
          title: category.name,
          icon: category.icon,
        })
      }
    >
      <View style={[styles.categoryIconContainer, { backgroundColor: category.color + '20' }]}>
        <Text style={styles.categoryIcon}>{category.icon}</Text>
      </View>
      <Text style={styles.categoryName}>{category.name}</Text>
      <Text style={styles.categoryCount}>{category.count} files</Text>
    </TouchableOpacity>
  );

  const renderRecentFile = (file: FileItem) => (
    <TouchableOpacity
      key={file.uri}
      style={styles.recentFileCard}
      onPress={() => {
        if (file.type === 'image') {
          navigation.navigate('ImageViewer', { file });
        } else if (file.type === 'video') {
          navigation.navigate('VideoPlayer', { file });
        } else if (file.type === 'audio') {
          navigation.navigate('MusicPlayer', { file });
        } else if (file.type === 'document') {
          navigation.navigate('DocumentViewer', { file });
        }
      }}
    >
      <Text style={styles.recentFileIcon}>{getFileIcon(file.type)}</Text>
      <Text style={styles.recentFileName} numberOfLines={1}>
        {file.name}
      </Text>
    </TouchableOpacity>
  );

  const backgroundContent = () => {
    if (theme.backgroundType === 'image' && theme.backgroundImageUri) {
      return (
        <ImageBackground
          source={{ uri: theme.backgroundImageUri }}
          style={StyleSheet.absoluteFill}
          blurRadius={30}
          imageStyle={{ opacity: 0.3 }}
        >
          <View style={StyleSheet.absoluteFill} />
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

    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.backgroundColor }]} />
    );
  };

  return (
    <View style={styles.container}>
      {backgroundContent()}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Dark Manager</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.categoriesGrid}>{categories.map(renderCategoryCard)}</View>

          {files.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Recent Files</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.recentFilesScroll}
              >
                {files.slice(0, 10).map(renderRecentFile)}
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
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, paddingTop: 60, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: { fontSize: 32, fontWeight: 'bold', color: '#ffffff' },
  settingsButton: { padding: 10 },
  settingsIcon: { fontSize: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#ffffff', marginBottom: 15 },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryIcon: { fontSize: 28 },
  categoryName: { fontSize: 16, fontWeight: '600', color: '#ffffff', marginBottom: 4 },
  categoryCount: { fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' },
  recentFilesScroll: { marginBottom: 20 },
  recentFileCard: {
    width: 80,
    marginRight: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  recentFileIcon: { fontSize: 28, marginBottom: 8 },
  recentFileName: { fontSize: 10, color: '#ffffff', textAlign: 'center' },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionIcon: { fontSize: 64, marginBottom: 20 },
  permissionTitle: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginBottom: 10 },
  permissionSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 40,
  },
  permissionButton: {
    backgroundColor: '#6c5ce7',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  loadingText: { color: '#ffffff', marginTop: 16, fontSize: 16 },
});
