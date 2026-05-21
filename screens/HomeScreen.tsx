import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
  Image as RNImage,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Play, MusicNote, Clock, Star, Sparkle, Heart } from 'phosphor-react-native';
import { useFiles } from '../context/FileContext';
import { useTheme } from '../context/ThemeContext';
import { FileIcon } from '../components/FileIcon';
import { GlassCard } from '../components/GlassCard';
import { BlurBackground } from '../components/BlurBackground';
import { TopBar } from '../components/TopBar';
import { SplashScreen } from './SplashScreen';
import type { FileItem, RecentlyPlayed, Playlist } from '../types';
import { Asset } from 'expo-asset';

const { width } = Dimensions.get('window');

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { permissionsGranted, loading, categories, recentFiles, recentlyPlayed, playlists, favoriteUris, favoriteFiles, requestPermissions } = useFiles();
  const { theme, textColor, mutedColor, cardBg, borderColor, primaryColor } = useTheme();
  const [showSplash, setShowSplash] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [logoUri, setLogoUri] = useState<string | null>(null);

  useEffect(() => {
    loadLogo();
    if (!permissionsGranted && !showSplash) {
      requestPermissions();
    }
  }, [showSplash]);

  async function loadLogo() {
    try {
      const asset = Asset.fromModule(require('../assets/lumora.png'));
      await asset.downloadAsync();
      setLogoUri(asset.localUri || asset.uri);
      setLogoLoaded(true);
    } catch {
      setLogoLoaded(true);
    }
  }

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (!permissionsGranted) {
    return (
      <View style={[styles.container, { backgroundColor: '#18181b' }]}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionInner}>
            <MusicNote size={56} color="#C2FC4A" weight="bold" />
            <Text style={styles.permissionTitle}>Lumora</Text>
            <Text style={styles.permissionSubtitle}>Your Media, Immersive</Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestPermissions}
            >
              <Text style={styles.permissionButtonText}>Grant Permissions</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: '#18181b' }]}>
        <ActivityIndicator size="large" color="#C2FC4A" />
        <Text style={[styles.loadingText, { color: mutedColor }]}>Scanning media...</Text>
      </View>
    );
  }

  const logoOpacity = scrollY.interpolate({
    inputRange: [0, 80, 120],
    outputRange: [1, 0.6, 0],
    extrapolate: 'clamp',
  });

  const logoScale = scrollY.interpolate({
    inputRange: [0, 80, 120],
    outputRange: [1, 0.95, 0.9],
    extrapolate: 'clamp',
  });

  const logoTranslateY = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [0, -20],
    extrapolate: 'clamp',
  });

  const navigateToCategory = (category: typeof categories[0]) => {
    if (category.id === 'documents') {
      navigation.navigate('DocumentsTab');
    } else if (category.id === 'music') {
      navigation.navigate('MusicTab');
    } else if (category.id === 'videos') {
      navigation.navigate('VideosTab');
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

  return (
    <BlurBackground>
      <View style={styles.safeArea}>
        <TopBar />
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: true,
          })}
          scrollEventThrottle={16}
          style={styles.scrollView}
        >
          {/* Parallax Logo Card */}
          <Animated.View style={[styles.logoCard, { opacity: logoOpacity, transform: [{ scale: logoScale }, { translateY: logoTranslateY }] }]}>
            <GlassCard glowColor="#C2FC4A" intensity={0.06} style={styles.logoCardInner}>
              {logoLoaded && logoUri ? (
                <RNImage source={{ uri: logoUri }} style={styles.logoImage} resizeMode="contain" />
              ) : (
                <Text style={styles.logoFallback}>LUMORA</Text>
              )}
            </GlassCard>
          </Animated.View>

          {/* Quick Access Categories */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Browse</Text>
            <View style={styles.quickAccessGrid}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.quickAccessItem, { backgroundColor: `${category.color}15` }]}
                  onPress={() => navigateToCategory(category)}
                >
                  <FileIcon type={category.type} size={28} />
                  <Text style={[styles.quickAccessLabel, { color: textColor }]}>
                    {category.name}
                  </Text>
                  <Text style={[styles.quickAccessCount, { color: mutedColor }]}>
                    {category.count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Recently Played */}
          {recentlyPlayed.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Recently Played</Text>
                <TouchableOpacity onPress={() => navigation.navigate('MusicTab')}>
                  <Text style={[styles.seeAll, { color: primaryColor }]}>See All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {recentlyPlayed.slice(0, 8).map((rp: RecentlyPlayed) => (
                  <TouchableOpacity
                    key={rp.file.uri}
                    style={[styles.recentlyPlayedCard, { backgroundColor: cardBg, borderColor }]}
                    onPress={() => navigateToFile(rp.file)}
                  >
                    <View style={styles.cardIconWrap}>
                      <FileIcon type={rp.file.type} size={24} />
                    </View>
                    <Text style={[styles.cardName, { color: textColor }]} numberOfLines={1}>
                      {rp.file.name}
                    </Text>
                    <View style={styles.cardMeta}>
                      <Clock size={10} color={mutedColor} />
                      <Text style={[styles.cardMetaText, { color: mutedColor }]}>
                        {rp.playCount} plays
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Recent Files */}
          {recentFiles.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Recent</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {recentFiles.slice(0, 10).map((file) => (
                  <TouchableOpacity
                    key={file.uri}
                    style={[styles.recentCard, { backgroundColor: cardBg, borderColor }]}
                    onPress={() => navigateToFile(file)}
                  >
                    <View style={styles.cardIconWrap}>
                      <FileIcon type={file.type} size={22} />
                    </View>
                    <Text style={[styles.cardName, { color: textColor }]} numberOfLines={2}>
                      {file.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Playlists */}
          {(favoriteFiles.length > 0 || playlists.length > 0) && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Playlists</Text>
                <TouchableOpacity onPress={() => navigation.navigate('MusicTab')}>
                  <Text style={[styles.seeAll, { color: primaryColor }]}>See All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {favoriteFiles.length > 0 && (
                  <TouchableOpacity
                    style={[styles.playlistCard, { backgroundColor: cardBg, borderColor: primaryColor + '40' }]}
                    onPress={() => navigation.navigate('MusicTab')}
                  >
                    <View style={[styles.playlistCover, { backgroundColor: `${primaryColor}20`, justifyContent: 'center', alignItems: 'center' }]}>
                      <Heart size={28} color={primaryColor} weight="fill" />
                    </View>
                    <Text style={[styles.playlistName, { color: textColor }]} numberOfLines={1}>Favorites</Text>
                    <Text style={[styles.playlistCount, { color: mutedColor }]}>{favoriteFiles.length} tracks</Text>
                  </TouchableOpacity>
                )}
                {playlists.slice(0, 5).map((playlist: Playlist) => (
                  <TouchableOpacity
                    key={playlist.id}
                    style={[styles.playlistCard, { backgroundColor: cardBg, borderColor }]}
                    onPress={() => navigation.navigate('MusicTab')}
                  >
                    {playlist.coverUri ? (
                      <RNImage source={{ uri: playlist.coverUri }} style={styles.playlistCover} />
                    ) : (
                      <View style={[styles.playlistCover, styles.playlistPlaceholder]}>
                        <MusicNote size={24} color={primaryColor} />
                      </View>
                    )}
                    <Text style={[styles.playlistName, { color: textColor }]} numberOfLines={1}>
                      {playlist.name}
                    </Text>
                    <Text style={[styles.playlistCount, { color: mutedColor }]}>
                      {playlist.files.length} tracks
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* New on Lumora */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Sparkle size={18} color="#C2FC4A" weight="bold" />
                <Text style={[styles.sectionTitle, { color: textColor }]}>New on Lumora</Text>
              </View>
            </View>
            <TouchableOpacity style={[styles.featuredCard, { borderColor, backgroundColor: `${primaryColor}08` }]}>
              <View style={styles.featuredContent}>
                <Text style={[styles.featuredTitle, { color: textColor }]}>Enhanced Media Experience</Text>
                <Text style={[styles.featuredSubtitle, { color: mutedColor }]}>
                  Discover your media like never before with improved players and layouts.
                </Text>
                <TouchableOpacity style={styles.featuredButton}>
                  <Play size={16} color="#18181b" weight="bold" />
                  <Text style={styles.featuredButtonText}>Explore</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </Animated.ScrollView>
      </View>
    </BlurBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#18181b' },
  center: { justifyContent: 'center', alignItems: 'center' },
  safeArea: { flex: 1, paddingHorizontal: 16 },
  scrollView: { flex: 1 },
  loadingText: { marginTop: 16, fontSize: 15, letterSpacing: 1 },

  // Parallax Logo
  logoCard: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  logoCardInner: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logoImage: {
    width: width * 0.7,
    height: 80,
  },
  logoFallback: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#C2FC4A',
    letterSpacing: 8,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Quick Access
  quickAccessGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickAccessItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 16,
  },
  quickAccessLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 2,
  },
  quickAccessCount: {
    fontSize: 11,
  },

  // Cards
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(194, 252, 74, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardName: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  cardMetaText: {
    fontSize: 10,
  },

  // Recently Played
  recentlyPlayedCard: {
    width: 120,
    marginRight: 12,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
  },

  // Recent Cards
  recentCard: {
    width: 100,
    marginRight: 12,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },

  // Playlist Cards
  playlistCard: {
    width: 140,
    marginRight: 12,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  playlistCover: {
    width: 100,
    height: 100,
    borderRadius: 14,
    marginBottom: 10,
  },
  playlistPlaceholder: {
    backgroundColor: 'rgba(194, 252, 74, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistName: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  playlistCount: {
    fontSize: 11,
  },

  // Featured
  featuredCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
  },
  featuredContent: {
    gap: 8,
  },
  featuredTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  featuredSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  featuredButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#C2FC4A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  featuredButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#18181b',
  },

  // Permission
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  permissionInner: { alignItems: 'center' },
  permissionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 3,
    marginBottom: 8,
    marginTop: 20,
  },
  permissionSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 2,
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: 32,
    backgroundColor: '#C2FC4A',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  permissionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#18181b',
  },
});
