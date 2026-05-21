import React, { useEffect, useRef, useState, useMemo } from 'react';
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
  Alert,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Play, MusicNote, Clock, Star, Sparkle, Heart, TrendUp, Microphone, Disc, VideoCamera } from 'phosphor-react-native';
import * as MediaLibrary from 'expo-media-library';
import { useFiles } from '../context/FileContext';
import { useTheme } from '../context/ThemeContext';
import { FileIcon } from '../components/FileIcon';
import { GlassCard } from '../components/GlassCard';
import { ScreenLayout } from '../components/ScreenLayout';
import { SplashScreen } from './SplashScreen';
import { HistoryService } from '../services/History/HistoryService';
import type { FileItem, RecentlyPlayed, Playlist, Album, Artist } from '../types';
import { Asset } from 'expo-asset';

const { width } = Dimensions.get('window');

function buildAlbums(audio: FileItem[]): Album[] {
  const map = new Map<string, Album>();
  for (const song of audio) {
    const albumName = song.album || 'Unknown Album';
    const artistName = song.artist || 'Unknown Artist';
    const key = `${albumName}::${artistName}`;
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        name: albumName,
        artist: artistName,
        songs: [],
        artwork: song.thumbnail,
        songCount: 0,
        totalDuration: 0,
      });
    }
    const album = map.get(key)!;
    album.songs.push(song);
    album.songCount = album.songs.length;
    album.totalDuration += song.duration || 0;
    if (song.thumbnail && !album.artwork) album.artwork = song.thumbnail;
  }
  return Array.from(map.values()).sort((a, b) => b.songCount - a.songCount).slice(0, 10);
}

function buildArtists(audio: FileItem[]): Artist[] {
  const map = new Map<string, Artist>();
  for (const song of audio) {
    const artistName = song.artist || 'Unknown Artist';
    if (!map.has(artistName)) {
      map.set(artistName, {
        id: artistName,
        name: artistName,
        songs: [],
        albums: [],
        songCount: 0,
      });
    }
    const artist = map.get(artistName)!;
    artist.songs.push(song);
    artist.songCount = artist.songs.length;
    if (song.album && !artist.albums.includes(song.album)) {
      artist.albums.push(song.album);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.songCount - a.songCount).slice(0, 10);
}

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { permissionsGranted, loading, categories, recentFiles, recentlyPlayed, playlists, favoriteUris, favoriteFiles, requestPermissions, audio, videos } = useFiles();
  const { theme, textColor, mutedColor, cardBg, borderColor, primaryColor, isDarkMode } = useTheme();
  const [showSplash, setShowSplash] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [showPermissionRationale, setShowPermissionRationale] = useState(false);

  const [recommended, setRecommended] = useState<FileItem[]>([]);

  const albums = useMemo(() => buildAlbums(audio), [audio]);
  const artists = useMemo(() => buildArtists(audio), [audio]);
  const shorts = useMemo(() => videos.filter((v) => {
    const dur = v.duration || 0;
    return dur > 0 && dur <= 60000;
  }).slice(0, 10), [videos]);

  useEffect(() => {
    loadLogo();
    if (!permissionsGranted && !showSplash) {
      setShowPermissionRationale(true);
    }
  }, [showSplash]);

  useEffect(() => {
    if (!loading && !showSplash && categories.length > 0) {
      const mostPlayed = HistoryService.getMostPlayed(6).map((h) => h.file);
      const history = HistoryService.getRecentlyPlayed(6).map((h) => h.file);
      const seen = new Set<string>();
      const combined: FileItem[] = [];
      for (const item of [...mostPlayed, ...history]) {
        if (!seen.has(item.uri) && combined.length < 10) {
          seen.add(item.uri);
          combined.push(item);
        }
      }
      if (combined.length < 6) {
        const extra = recentFiles.length > 0 ? recentFiles : [];
        for (const file of extra) {
          if (!seen.has(file.uri)) {
            seen.add(file.uri);
            combined.push(file);
          }
        }
      }
      setRecommended(combined);
    }
  }, [loading, showSplash, categories, recentFiles]);

  async function loadLogo() {
    try {
      const asset = Asset.fromModule(require('../assets/app.png'));
      await asset.downloadAsync();
      setLogoUri(asset.localUri || asset.uri);
      setLogoLoaded(true);
    } catch {
      setLogoLoaded(true);
    }
  }

  const handleRequestPermissions = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        setShowPermissionRationale(false);
        await requestPermissions();
      } else {
        Alert.alert(
          'Permission Required',
          'Lumora needs media access to scan and play your files. You can grant this in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    } catch {
      await requestPermissions();
    }
  };

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (!permissionsGranted || showPermissionRationale) {
    return (
      <View style={[styles.container, { backgroundColor: '#06060B' }]}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionInner}>
            <MusicNote size={56} color="#C2FC4A" weight="bold" />
            <Text style={styles.permissionTitle}>Lumora</Text>
            <Text style={styles.permissionSubtitle}>Your Media, Immersive</Text>
            <Text style={styles.permissionDetails}>
              Lumora needs access to your media files to play music, videos, and view documents. 
              Your files stay on your device and are never uploaded.
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={handleRequestPermissions}
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
      <View style={[styles.container, styles.center, { backgroundColor: '#06060B' }]}>
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
    if (category.id === 'documents') navigation.navigate('DocumentsTab');
    else if (category.id === 'music') navigation.navigate('MusicTab');
    else if (category.id === 'videos') navigation.navigate('VideosTab');
    else navigation.navigate('Category', { type: category.type, title: category.name, icon: category.icon });
  };

  const navigateToFile = (file: FileItem) => {
    if (file.type === 'image') navigation.navigate('ImageViewer', { file });
    else if (file.type === 'video') navigation.navigate('VideoPlayer', { file });
    else if (file.type === 'audio') navigation.navigate('MusicPlayer', { file });
    else if (file.type === 'document') navigation.navigate('DocumentViewer', { file });
  };

  return (
    <ScreenLayout>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
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
                <Text style={[styles.quickAccessLabel, { color: textColor }]}>{category.name}</Text>
                <Text style={[styles.quickAccessCount, { color: mutedColor }]}>{category.count}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recommendations */}
        {recommended.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TrendUp size={18} color={primaryColor} weight="bold" />
                <Text style={[styles.sectionTitle, { color: textColor }]}>For You</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('MusicTab')}>
                <Text style={[styles.seeAll, { color: primaryColor }]}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recommended.slice(0, 10).map((file) => (
                <TouchableOpacity
                  key={file.uri}
                  style={[styles.recommendCard, { backgroundColor: cardBg, borderColor }]}
                  onPress={() => navigateToFile(file)}
                >
                  <View style={[styles.recommendIcon, { backgroundColor: `${primaryColor}12` }]}>
                    <FileIcon type={file.type} size={26} />
                  </View>
                  <View style={styles.recommendInfo}>
                    <Text style={[styles.recommendName, { color: textColor }]} numberOfLines={1}>{file.name}</Text>
                    <Text style={[styles.recommendMeta, { color: mutedColor }]}>{file.artist || file.type}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Albums */}
        {albums.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Disc size={18} color={primaryColor} weight="bold" />
                <Text style={[styles.sectionTitle, { color: textColor }]}>Albums</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('MusicTab')}>
                <Text style={[styles.seeAll, { color: primaryColor }]}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {albums.map((album) => (
                <TouchableOpacity
                  key={album.id}
                  style={[styles.albumCard, { backgroundColor: cardBg, borderColor }]}
                  onPress={() => navigation.navigate('MusicTab')}
                >
                  <View style={[styles.albumArt, { backgroundColor: `${primaryColor}15` }]}>
                    {album.artwork ? (
                      <RNImage source={{ uri: album.artwork }} style={styles.albumArtImage} />
                    ) : (
                      <Disc size={32} color={primaryColor} weight="bold" />
                    )}
                  </View>
                  <Text style={[styles.albumName, { color: textColor }]} numberOfLines={1}>{album.name}</Text>
                  <Text style={[styles.albumArtist, { color: mutedColor }]} numberOfLines={1}>{album.artist}</Text>
                  <Text style={[styles.albumCount, { color: mutedColor }]}>{album.songCount} songs</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Artists */}
        {artists.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Microphone size={18} color={primaryColor} weight="bold" />
                <Text style={[styles.sectionTitle, { color: textColor }]}>Artists</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('MusicTab')}>
                <Text style={[styles.seeAll, { color: primaryColor }]}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {artists.map((artist) => (
                <TouchableOpacity
                  key={artist.id}
                  style={[styles.artistCard, { backgroundColor: cardBg, borderColor }]}
                  onPress={() => navigation.navigate('MusicTab')}
                >
                  <View style={[styles.artistAvatar, { backgroundColor: `${primaryColor}15` }]}>
                    <Microphone size={28} color={primaryColor} weight="bold" />
                  </View>
                  <Text style={[styles.artistName, { color: textColor }]} numberOfLines={1}>{artist.name}</Text>
                  <Text style={[styles.artistCount, { color: mutedColor }]}>{artist.songCount} songs</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Shorts - Short Videos */}
        {shorts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <VideoCamera size={18} color={primaryColor} weight="bold" />
                <Text style={[styles.sectionTitle, { color: textColor }]}>Shorts</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('VideosTab')}>
                <Text style={[styles.seeAll, { color: primaryColor }]}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {shorts.map((video) => (
                <TouchableOpacity
                  key={video.uri}
                  style={[styles.shortCard, { backgroundColor: cardBg, borderColor }]}
                  onPress={() => navigation.navigate('VideoPlayer', { file: video })}
                >
                  {video.thumbnail ? (
                    <RNImage source={{ uri: video.thumbnail }} style={styles.shortThumb} />
                  ) : (
                    <View style={[styles.shortThumbPlaceholder, { backgroundColor: `${primaryColor}10` }]}>
                      <VideoCamera size={28} color={primaryColor} weight="bold" />
                    </View>
                  )}
                  <View style={styles.shortOverlay}>
                    <Text style={styles.shortDuration}>
                      {Math.floor((video.duration || 0) / 1000)}s
                    </Text>
                  </View>
                  <Text style={[styles.shortName, { color: textColor }]} numberOfLines={1}>{video.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

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
                  <Text style={[styles.cardName, { color: textColor }]} numberOfLines={1}>{rp.file.name}</Text>
                  <View style={styles.cardMeta}>
                    <Clock size={10} color={mutedColor} />
                    <Text style={[styles.cardMetaText, { color: mutedColor }]}>{rp.playCount} plays</Text>
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
                  <Text style={[styles.cardName, { color: textColor }]} numberOfLines={2}>{file.name}</Text>
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
                  <Text style={[styles.playlistName, { color: textColor }]} numberOfLines={1}>{playlist.name}</Text>
                  <Text style={[styles.playlistCount, { color: mutedColor }]}>{playlist.files.length} tracks</Text>
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
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#18181b' },
  center: { justifyContent: 'center', alignItems: 'center' },
  safeArea: { flex: 1, paddingHorizontal: 16 },
  scrollView: { flex: 1 },
  loadingText: { marginTop: 16, fontSize: 15, letterSpacing: 1 },

  logoCard: { alignItems: 'center', marginTop: 8, marginBottom: 24 },
  logoCardInner: { padding: 24, alignItems: 'center', justifyContent: 'center', width: '100%' },
  logoImage: { width: width * 0.7, height: 80 },
  logoFallback: { fontSize: 36, fontWeight: 'bold', color: '#C2FC4A', letterSpacing: 8 },

  section: { marginBottom: 24, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  seeAll: { fontSize: 13, fontWeight: '600' },

  quickAccessGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  quickAccessItem: { flex: 1, alignItems: 'center', paddingVertical: 18, borderRadius: 16 },
  quickAccessLabel: { fontSize: 12, fontWeight: '600', marginTop: 8, marginBottom: 2 },
  quickAccessCount: { fontSize: 11 },

  cardIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(194, 252, 74, 0.08)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  cardName: { fontSize: 12, textAlign: 'center', lineHeight: 16 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  cardMetaText: { fontSize: 10 },

  recentlyPlayedCard: { width: 120, marginRight: 12, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1 },
  recentCard: { width: 100, marginRight: 12, borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1 },

  playlistCard: { width: 140, marginRight: 12, borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1 },
  playlistCover: { width: 100, height: 100, borderRadius: 14, marginBottom: 10 },
  playlistPlaceholder: { backgroundColor: 'rgba(194, 252, 74, 0.08)', justifyContent: 'center', alignItems: 'center' },
  playlistName: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 2 },
  playlistCount: { fontSize: 11 },

  recommendCard: { width: 180, marginRight: 12, borderRadius: 16, padding: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  recommendIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  recommendInfo: { flex: 1 },
  recommendName: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  recommendMeta: { fontSize: 11, textTransform: 'capitalize' },

  // Albums
  albumCard: { width: 140, marginRight: 12, borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1 },
  albumArt: { width: 100, height: 100, borderRadius: 14, marginBottom: 8, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  albumArtImage: { width: '100%', height: '100%' },
  albumName: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  albumArtist: { fontSize: 11, textAlign: 'center', marginBottom: 2 },
  albumCount: { fontSize: 10 },

  // Artists
  artistCard: { width: 120, marginRight: 12, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1 },
  artistAvatar: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  artistName: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  artistCount: { fontSize: 11 },

  // Shorts
  shortCard: { width: 120, marginRight: 12, borderRadius: 14, overflow: 'hidden', borderWidth: 1 },
  shortThumb: { width: '100%', height: 160 },
  shortThumbPlaceholder: { width: '100%', height: 160, justifyContent: 'center', alignItems: 'center' },
  shortOverlay: { position: 'absolute', bottom: 32, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  shortDuration: { fontSize: 10, color: '#ffffff', fontWeight: '600' },
  shortName: { fontSize: 11, fontWeight: '600', padding: 8, textAlign: 'center' },

  // Featured
  featuredCard: { borderRadius: 20, padding: 24, borderWidth: 1, marginHorizontal: 16 },
  featuredContent: { gap: 8 },
  featuredTitle: { fontSize: 20, fontWeight: '700' },
  featuredSubtitle: { fontSize: 14, lineHeight: 20 },
  featuredButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#C2FC4A', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, alignSelf: 'flex-start', marginTop: 8 },
  featuredButtonText: { fontSize: 14, fontWeight: '700', color: '#18181b' },

  // Permission
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  permissionInner: { alignItems: 'center' },
  permissionTitle: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', letterSpacing: 3, marginBottom: 8, marginTop: 20 },
  permissionSubtitle: { fontSize: 15, color: 'rgba(255, 255, 255, 0.5)', letterSpacing: 2, textAlign: 'center' },
  permissionDetails: { fontSize: 14, color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center', lineHeight: 22, marginTop: 16, paddingHorizontal: 10 },
  permissionButton: { marginTop: 32, backgroundColor: '#C2FC4A', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  permissionButtonText: { fontSize: 15, fontWeight: '700', color: '#18181b' },
});
