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
import * as MediaLibrary from 'expo-media-library';
import { MagnifyingGlass, Play, MusicNote, Heart, TrendUp, Microphone, Disc, VideoCamera, HardDrives, ArrowCounterClockwise, CaretRight } from 'phosphor-react-native';
import { useFiles } from '../context/FileContext';
import { useTheme } from '../context/ThemeContext';
import { FileIcon } from '../components/FileIcon';
import { ScreenLayout } from '../components/ScreenLayout';
import { SplashScreen } from './SplashScreen';
import { HistoryService } from '../services/History/HistoryService';
import { useProfileStore } from '../stores/profileStore';
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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function timeAgo(ts: number | undefined): string {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function getRecencyGroup(ts: number | undefined): 'today' | 'yesterday' | 'week' | 'older' {
  if (!ts) return 'older';
  const now = new Date();
  const date = new Date(ts);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  if (date >= today) return 'today';
  if (date >= yesterday) return 'yesterday';
  if (date >= weekAgo) return 'week';
  return 'older';
}

function progressFromUri(uri: string): number {
  let hash = 0;
  for (let i = 0; i < uri.length; i++) hash = ((hash << 5) - hash) + uri.charCodeAt(i);
  return (Math.abs(hash) % 60) + 20;
}

function formatDuration(ms: number | undefined): string {
  if (!ms) return '';
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { permissionsGranted, loading, categories, recentFiles, recentlyPlayed, playlists, favoriteUris, favoriteFiles, requestPermissions, audio, videos, images } = useFiles();
  const { name } = useProfileStore();
  const { theme, textColor, mutedColor, primaryColor, isDarkMode } = useTheme();
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

  const greeting = useMemo(() => getGreeting(), []);

  const totalStorage = useMemo(() => {
    let total = 0;
    for (const f of [...audio, ...videos, ...images]) total += f.size || 0;
    return total;
  }, [audio, videos, images]);

  const groupedRecents = useMemo(() => {
    const groups: Record<string, FileItem[]> = { today: [], yesterday: [], week: [], older: [] };
    const seen = new Set<string>();
    for (const rp of recentlyPlayed) {
      const ts = rp.lastPlayedAt;
      const group = getRecencyGroup(ts);
      if (!seen.has(rp.file.uri)) {
        seen.add(rp.file.uri);
        groups[group].push(rp.file);
      }
    }
    for (const f of recentFiles) {
      const ts = f.modifiedAt ?? f.createdAt;
      const group = getRecencyGroup(ts);
      if (!seen.has(f.uri)) {
        seen.add(f.uri);
        if (groups[group].length < 6) groups[group].push(f);
      }
    }
    return groups;
  }, [recentlyPlayed, recentFiles]);

  const recencyLabels: Record<string, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    week: 'This Week',
    older: 'Older',
  };

  const continueItems = useMemo(() => {
    const items: FileItem[] = [];
    const seen = new Set<string>();
    for (const rp of recentlyPlayed) {
      const dur = rp.file.duration;
      if (dur && dur > 30000 && !seen.has(rp.file.uri)) {
        seen.add(rp.file.uri);
        items.push(rp.file);
      }
      if (items.length >= 6) break;
    }
    return items;
  }, [recentlyPlayed]);

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
      const asset = Asset.fromModule(require('../assets/lumora.png'));
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

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
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

  const allRecents = [...groupedRecents.today, ...groupedRecents.yesterday, ...groupedRecents.week, ...groupedRecents.older];

  return (
    <ScreenLayout noTopBar>
      <View style={styles.container}>
        {/* Dynamic Header */}
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <View style={styles.headerTop}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerGreeting}>{greeting}, {name}</Text>
              <Text style={styles.headerSub}>Continue where you left off</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.7} style={styles.headerAvatarWrap}>
              {logoLoaded && logoUri ? (
                <RNImage source={{ uri: logoUri }} style={styles.headerLogo} resizeMode="contain" />
              ) : (
                <View style={[styles.headerLogoPlaceholder, { backgroundColor: `${primaryColor}20` }]}>
                  <Text style={[styles.headerLogoInitial, { color: primaryColor }]}>{name[0].toUpperCase()}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.searchBar, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}
            onPress={() => navigation.navigate('SearchTab')}
            activeOpacity={0.7}
          >
            <MagnifyingGlass size={16} color="rgba(255,255,255,0.3)" />
            <Text style={styles.searchPlaceholder}>Search music, videos, documents...</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
          scrollEventThrottle={16}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Smart Recents - MOST IMPORTANT */}
          {allRecents.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ArrowCounterClockwise size={18} color={primaryColor} weight="bold" />
                  <Text style={[styles.sectionTitle, { color: textColor }]}>Recent Activity</Text>
                </View>
              </View>
              {(['today', 'yesterday', 'week', 'older'] as const).map((group) => {
                const items = groupedRecents[group];
                if (items.length === 0) return null;
                return (
                  <View key={group} style={styles.recencyGroup}>
                    <Text style={[styles.recencyLabel, { color: mutedColor }]}>{recencyLabels[group]}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {items.slice(0, 8).map((file) => (
                        <TouchableOpacity
                          key={file.uri}
                          style={[styles.recentActivityCard, styles.glassyCard]}
                          onPress={() => navigateToFile(file)}
                        >
                          {file.thumbnail ? (
                            <RNImage source={{ uri: file.thumbnail }} style={styles.recentActivityThumb} />
                          ) : file.type === 'image' ? (
                            <RNImage source={{ uri: file.uri }} style={styles.recentActivityThumb} />
                          ) : (
                            <View style={[styles.recentActivityIconWrap, { backgroundColor: `${primaryColor}12` }]}>
                              <FileIcon type={file.type} size={24} />
                            </View>
                          )}
                          <View style={styles.recentActivityInfo}>
                            <Text style={[styles.recentActivityName, { color: textColor }]} numberOfLines={1}>{file.name}</Text>
                            <Text style={[styles.recentActivityMeta, { color: mutedColor }]}>{file.artist || file.type}</Text>
                            {file.duration && file.duration > 0 && (
                              <View style={styles.recentActivityProgress}>
                                <View style={[styles.progressBarBg, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                                  <View style={[styles.progressBarFill, { width: `${progressFromUri(file.uri)}%`, backgroundColor: primaryColor }]} />
                                </View>
                                <Text style={[styles.recentActivityDuration, { color: mutedColor }]}>{formatDuration(file.duration)}</Text>
                              </View>
                            )}
                          </View>
                          <CaretRight size={14} color={mutedColor} weight="bold" />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                );
              })}
            </View>
          )}

          {/* Continue Listening / Watching */}
          {continueItems.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Play size={18} color={primaryColor} weight="bold" />
                  <Text style={[styles.sectionTitle, { color: textColor }]}>Continue</Text>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {continueItems.map((file) => (
                  <TouchableOpacity
                    key={file.uri}
                    style={[styles.continueCard, styles.glassyCard]}
                    onPress={() => navigateToFile(file)}
                  >
                    <View style={[styles.continueArt, { backgroundColor: `${primaryColor}12` }]}>
                      {file.thumbnail ? (
                        <RNImage source={{ uri: file.thumbnail }} style={styles.continueArtImage} />
                      ) : (
                        <FileIcon type={file.type} size={32} />
                      )}
                    </View>
                    <Text style={[styles.continueName, { color: textColor }]} numberOfLines={1}>{file.name}</Text>
                    <Text style={[styles.continueMeta, { color: mutedColor }]}>{file.artist || file.type}</Text>
                    <View style={[styles.continueProgress, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                      <View style={[styles.continueProgressFill, { width: `${progressFromUri(file.uri)}%`, backgroundColor: primaryColor }]} />
                    </View>
                    <TouchableOpacity style={[styles.resumeBtn, { backgroundColor: primaryColor }]}>
                      <Play size={12} color="#18181b" weight="fill" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

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
                    style={[styles.recommendCard, styles.glassyCard]}
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

          {/* Playlists + Favorites */}
          {(favoriteFiles.length > 0 || playlists.length > 0) && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Collections</Text>
                <TouchableOpacity onPress={() => navigation.navigate('MusicTab')}>
                  <Text style={[styles.seeAll, { color: primaryColor }]}>See All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {favoriteFiles.length > 0 && (
                  <TouchableOpacity
                    style={[styles.playlistCard, styles.glassyCard, { borderColor: primaryColor + '40' }]}
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
                    style={[styles.playlistCard, styles.glassyCard]}
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

          {/* Categories Grid - 2x2 */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor, marginBottom: 12 }]}>Browse</Text>
            <View style={styles.categoriesGrid}>
              {categories.slice(0, 4).map((category) => {
                const catColors: Record<string, string> = {
                  images: '#8B5CF6',
                  videos: '#EF4444',
                  music: '#C2FC4A',
                  documents: '#3B82F6',
                };
                const bgColor = catColors[category.id] || primaryColor;
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[styles.categoryCard, { backgroundColor: `${bgColor}10`, borderColor: `${bgColor}20` }]}
                    onPress={() => navigateToCategory(category)}
                  >
                    <View style={[styles.categoryIconWrap, { backgroundColor: `${bgColor}20` }]}>
                      <FileIcon type={category.type} size={24} />
                    </View>
                    <Text style={[styles.categoryName, { color: textColor }]}>{category.name}</Text>
                    <Text style={[styles.categoryCount, { color: mutedColor }]}>{category.count} files</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

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
                    style={[styles.albumCard, styles.glassyCard]}
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
                    style={[styles.artistCard, styles.glassyCard]}
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

          {/* Shorts */}
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
                    style={[styles.shortCard, styles.glassyCard]}
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

          {/* Storage Insights */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <HardDrives size={18} color={primaryColor} weight="bold" />
                <Text style={[styles.sectionTitle, { color: textColor }]}>Storage</Text>
              </View>
            </View>
            <View style={[styles.storageCard, styles.glassyCard]}>
              <View style={styles.storageRow}>
                <Text style={[styles.storageLabel, { color: mutedColor }]}>Total Media</Text>
                <Text style={[styles.storageValue, { color: textColor }]}>
                  {totalStorage > 1073741824
                    ? `${(totalStorage / 1073741824).toFixed(1)} GB`
                    : totalStorage > 1048576
                      ? `${(totalStorage / 1048576).toFixed(0)} MB`
                      : `${(totalStorage / 1024).toFixed(0)} KB`}
                </Text>
              </View>
              <View style={[styles.storageBar, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                {categories.slice(0, 4).map((cat, i) => {
                  const barColors = ['#8B5CF6', '#EF4444', '#C2FC4A', '#3B82F6'];
                  const totalCount = categories.reduce((s, c) => s + c.count, 0);
                  const pct = totalCount > 0 ? ((cat.count / totalCount) * 30) : 0;
                  if (pct < 1) return null;
                  return (
                    <View
                      key={cat.id}
                      style={{ width: `${pct}%`, backgroundColor: barColors[i] || primaryColor, height: '100%' }}
                    />
                  );
                })}
              </View>
              <View style={styles.storageLegend}>
                {['Images', 'Videos', 'Music', 'Documents'].map((label, i) => {
                  const barColors = ['#8B5CF6', '#EF4444', '#C2FC4A', '#3B82F6'];
                  return (
                    <View key={label} style={styles.storageLegendItem}>
                      <View style={[styles.storageLegendDot, { backgroundColor: barColors[i] }]} />
                      <Text style={[styles.storageLegendText, { color: mutedColor }]}>{label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </Animated.ScrollView>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#18181b' },
  center: { justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 8, paddingBottom: 100 },
  loadingText: { marginTop: 16, fontSize: 15, letterSpacing: 1 },

  // Header
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 8 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTextWrap: { flex: 1, marginRight: 16 },
  headerGreeting: { fontSize: 22, fontWeight: '800', color: '#ffffff', marginBottom: 2 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
  headerAvatarWrap: { width: 48, height: 48, borderRadius: 16, overflow: 'hidden' },
  headerLogo: { width: 48, height: 48 },
  headerLogoPlaceholder: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  headerLogoInitial: { fontSize: 20, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchPlaceholder: { fontSize: 14, color: 'rgba(255,255,255,0.3)', flex: 1 },
  headerBottom: { marginBottom: 8 },

  // Sections
  section: { marginBottom: 28, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  seeAll: { fontSize: 13, fontWeight: '600' },

  // Glassy Card
  glassyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#C2FC4A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  // Smart Recents
  recencyGroup: { marginBottom: 8 },
  recencyLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 2 },
  recentActivityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 280,
    marginRight: 10,
    borderRadius: 16,
    padding: 10,
    gap: 10,
  },
  recentActivityThumb: { width: 48, height: 48, borderRadius: 12 },
  recentActivityIconWrap: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  recentActivityInfo: { flex: 1 },
  recentActivityName: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  recentActivityMeta: { fontSize: 11, textTransform: 'capitalize' },
  recentActivityProgress: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  progressBarBg: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 2 },
  recentActivityDuration: { fontSize: 10 },

  // Continue
  continueCard: { width: 160, marginRight: 12, borderRadius: 20, padding: 12, alignItems: 'center' },
  continueArt: { width: 120, height: 120, borderRadius: 18, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 10 },
  continueArtImage: { width: '100%', height: '100%' },
  continueName: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  continueMeta: { fontSize: 11, textAlign: 'center' },
  continueProgress: { width: '100%', height: 3, borderRadius: 2, overflow: 'hidden', marginTop: 8, marginBottom: 8 },
  continueProgressFill: { height: '100%', borderRadius: 2 },
  resumeBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },

  // Recommendations
  recommendCard: { width: 180, marginRight: 12, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  recommendIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  recommendInfo: { flex: 1 },
  recommendName: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  recommendMeta: { fontSize: 11, textTransform: 'capitalize' },

  // Playlists
  playlistCard: { width: 140, marginRight: 12, borderRadius: 16, padding: 12, alignItems: 'center' },
  playlistCover: { width: 100, height: 100, borderRadius: 14, marginBottom: 10 },
  playlistPlaceholder: { backgroundColor: 'rgba(194, 252, 74, 0.08)', justifyContent: 'center', alignItems: 'center' },
  playlistName: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 2 },
  playlistCount: { fontSize: 11 },

  // Categories 2x2 Grid
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryCard: {
    width: (width - 42) / 2,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
  },
  categoryIconWrap: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  categoryName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  categoryCount: { fontSize: 12 },

  // Albums
  albumCard: { width: 140, marginRight: 12, borderRadius: 16, padding: 12, alignItems: 'center' },
  albumArt: { width: 100, height: 100, borderRadius: 14, marginBottom: 8, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  albumArtImage: { width: '100%', height: '100%' },
  albumName: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  albumArtist: { fontSize: 11, textAlign: 'center', marginBottom: 2 },
  albumCount: { fontSize: 10 },

  // Artists
  artistCard: { width: 120, marginRight: 12, borderRadius: 16, padding: 14, alignItems: 'center' },
  artistAvatar: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  artistName: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  artistCount: { fontSize: 11 },

  // Shorts
  shortCard: { width: 120, marginRight: 12, borderRadius: 14, overflow: 'hidden' },
  shortThumb: { width: '100%', height: 160 },
  shortThumbPlaceholder: { width: '100%', height: 160, justifyContent: 'center', alignItems: 'center' },
  shortOverlay: { position: 'absolute', bottom: 32, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  shortDuration: { fontSize: 10, color: '#ffffff', fontWeight: '600' },
  shortName: { fontSize: 11, fontWeight: '600', padding: 8, textAlign: 'center' },

  // Storage
  storageCard: { borderRadius: 20, padding: 20 },
  storageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  storageLabel: { fontSize: 13, fontWeight: '600' },
  storageValue: { fontSize: 16, fontWeight: '700' },
  storageBar: { height: 8, borderRadius: 6, flexDirection: 'row', overflow: 'hidden', marginBottom: 12 },
  storageLegend: { flexDirection: 'row', gap: 16 },
  storageLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  storageLegendDot: { width: 8, height: 8, borderRadius: 4 },
  storageLegendText: { fontSize: 11 },

  // Permission
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  permissionInner: { alignItems: 'center' },
  permissionTitle: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', letterSpacing: 3, marginBottom: 8, marginTop: 20 },
  permissionSubtitle: { fontSize: 15, color: 'rgba(255, 255, 255, 0.5)', letterSpacing: 2, textAlign: 'center' },
  permissionDetails: { fontSize: 14, color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center', lineHeight: 22, marginTop: 16, paddingHorizontal: 10 },
  permissionButton: { marginTop: 32, backgroundColor: '#C2FC4A', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  permissionButtonText: { fontSize: 15, fontWeight: '700', color: '#18181b' },
});
