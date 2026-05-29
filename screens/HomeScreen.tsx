import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  Image as RNImage,
  Alert,
  Linking,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as MediaLibrary from 'expo-media-library';
import {
  Play,
  MusicNote,
  Disc,
  VideoCamera,
  ArrowCounterClockwise,
  Heart,
  Copy,
  ClockCountdown,
  HardDrive,
  Star,
  Plus,
} from 'phosphor-react-native';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';
import RNFS from 'react-native-fs';
import { useMediaStore } from '../stores/mediaStore';
import { usePlaylistStore } from '../stores/playlistStore';
import { useVisibleAudio } from '../hooks/useVisibleAudio';
import { useCategories, useRecentFiles, useRecentlyPlayed, useExpandedPlaylists } from '../hooks/useDomainSelectors';
import { useFavorites } from '../hooks/useFavorites';
import { useTheme } from '../context/ThemeContext';
import { ScreenLayout } from '../components/ScreenLayout';
import { GlassIcon } from '../components/GlassIcon';
import { SplashScreen } from './SplashScreen';
import { HistoryService } from '../services/History/HistoryService';
import type { FileItem, Playlist } from '../types';

const { width } = Dimensions.get('window');

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

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(0)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function DoughnutChart({
  segments,
  size = 140,
  strokeWidth = 20,
  centerText,
}: {
  segments: { value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
  centerText?: string;
}) {
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  if (total <= 0) {
    return (
      <View className="items-center justify-center" style={{ width: size, height: size }}>
        <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
          No data
        </Text>
      </View>
    );
  }

  let cumulativeAngle = -90;

  return (
    <View className="items-center justify-center" style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {segments.map((seg, i) => {
          const angle = (seg.value / total) * 360;
          const segLen = circumference * (seg.value / total);
          const el = (
            <G key={`seg-${i}`} rotation={cumulativeAngle} origin={`${center}, ${center}`}>
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke={seg.color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${segLen} ${circumference}`}
                strokeLinecap="butt"
              />
            </G>
          );
          cumulativeAngle += angle;
          return el;
        })}
        {centerText && (
          <SvgText
            x={center}
            y={center}
            textAnchor="middle"
            alignmentBaseline="central"
            fill="rgba(255,255,255,0.8)"
            fontSize={13}
            fontWeight="bold">
            {centerText}
          </SvgText>
        )}
      </Svg>
    </View>
  );
}

export const HomeScreen = React.memo(function HomeScreen() {
  const navigation = useNavigation<any>();
  const permissionsGranted = useMediaStore((s) => s.permissionsGranted);
  const loading = useMediaStore((s) => s.loading);
  const videos = useMediaStore((s) => s.videos);
  const audio = useVisibleAudio();
  const categories = useCategories();
  const recentFiles = useRecentFiles();
  const recentlyPlayed = useRecentlyPlayed();
  const playlists = useExpandedPlaylists();
  const { textColor, mutedColor, primaryColor, isDarkMode, borderColor } = useTheme();
  const [showSplash, setShowSplash] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [showPermissionRationale, setShowPermissionRationale] = useState(false);
  const [deviceTotal, setDeviceTotal] = useState(1);
  const [deviceFree, setDeviceFree] = useState(0);
  const playlistStore = usePlaylistStore();

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

  useEffect(() => {
    if (!permissionsGranted && !showSplash) {
      setShowPermissionRationale(true);
    }
  }, [showSplash]);

  useEffect(() => {
    RNFS.getFSInfo().then((info) => {
      setDeviceTotal(info.totalSpace || 1);
      setDeviceFree(info.freeSpace || 0);
    }).catch(() => {});
  }, []);

  const allFiles = useMemo(() => [...videos, ...audio], [videos, audio]);
  const { favoriteUris } = useFavorites(allFiles);

  const duplicateCount = useMemo(() => {
    const nameMap = new Map<string, number>();
    for (const f of allFiles) {
      const key = f.name.toLowerCase();
      nameMap.set(key, (nameMap.get(key) || 0) + 1);
    }
    let count = 0;
    for (const c of nameMap.values()) {
      if (c > 1) count += c;
    }
    return count;
  }, [allFiles]);

  const unusedCount = useMemo(() => {
    const history = HistoryService.getAll();
    const lastPlayedMap = new Map<string, number>();
    for (const h of history) {
      const existing = lastPlayedMap.get(h.file.uri);
      if (!existing || h.playedAt > existing) {
        lastPlayedMap.set(h.file.uri, h.playedAt);
      }
    }
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return allFiles.filter((f) => {
      const lastPlayed = lastPlayedMap.get(f.uri);
      return !lastPlayed || lastPlayed < cutoff;
    }).length;
  }, [allFiles]);

  const largeFileCount = useMemo(() => {
    return allFiles.filter((f) => (f.size || 0) >= 100 * 1024 * 1024).length;
  }, [allFiles]);

  const allRecents = useMemo(
    () => [
      ...groupedRecents.today,
      ...groupedRecents.yesterday,
      ...groupedRecents.week,
      ...groupedRecents.older,
    ],
    [groupedRecents]
  );

  const musicSize = useMemo(() => audio.reduce((s, f) => s + (f.size || 0), 0), [audio]);
  const videoSize = useMemo(() => videos.reduce((s, f) => s + (f.size || 0), 0), [videos]);

  const randomFiles = useMemo(() => {
    const all = [...audio, ...videos];
    return [...all].sort(() => Math.random() - 0.5).slice(0, 10);
  }, [audio, videos]);

  const mostPlayed = useMemo(() => {
    try {
      return HistoryService.getMostPlayed(10).map((h) => h.file);
    } catch {
      return [];
    }
  }, [recentlyPlayed]);

  const deviceUsed = deviceTotal - deviceFree;
  const otherUsedSize = Math.max(0, deviceUsed - musicSize - videoSize);

  const storageChartSegments = [
    { value: musicSize, color: '#C2FC4A' },
    { value: videoSize, color: '#EF4444' },
    { value: otherUsedSize, color: '#3b82f6' },
    { value: deviceFree, color: 'rgba(255,255,255,0.1)' },
  ];

  const [showPlaylistInput, setShowPlaylistInput] = useState(false);
  const [playlistInput, setPlaylistInput] = useState('');

  const handleCreatePlaylist = () => {
    setPlaylistInput(`Playlist ${playlists.length + 1}`);
    setShowPlaylistInput(true);
  };

  const handlePlaylistCreateConfirm = async () => {
    if (playlistInput.trim()) {
      await playlistStore.create(playlistInput.trim());
    }
    setShowPlaylistInput(false);
    setPlaylistInput('');
  };

  const handlePlaylistLongPress = (playlist: Playlist) => {
    Alert.alert(playlist.name, undefined, [
      {
        text: 'Rename',
        onPress: () => {
          if (Platform.OS === 'ios') {
            Alert.prompt(
              'Rename Playlist',
              'Enter new name',
              async (name) => {
                if (name?.trim()) playlistStore.rename(playlist.id, name.trim());
              },
              'plain-text',
              playlist.name
            );
          } else {
            playlistStore.rename(playlist.id, `${playlist.name} (edited)`);
          }
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          playlistStore.delete(playlist.id);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleRequestPermissions = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        setShowPermissionRationale(false);
        await useMediaStore.getState().scanMedia();
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
      await useMediaStore.getState().scanMedia();
    }
  };

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (!permissionsGranted || showPermissionRationale) {
    return (
      <View className="flex-1 bg-dark-bg-primary">
        <View className="flex-1 items-center justify-center p-[30]">
          <View className="items-center">
            <MusicNote size={56} color="#C2FC4A" weight="bold" />
            <Text className="mb-2 mt-5 text-[28px] font-bold tracking-[3] text-white">Lumora</Text>
            <Text className="text-center text-[15px] tracking-[2] text-white/50">
              Your Media, Immersive
            </Text>
            <Text className="mt-4 px-2.5 text-center text-sm leading-[22px] text-white/60">
              Lumora needs access to your media files to play music, videos, and view documents.
              Your files stay on your device and are never uploaded.
            </Text>
            <TouchableOpacity
              className="mt-8 rounded-xl bg-[#C2FC4A] px-7 py-3.5"
              onPress={handleRequestPermissions}>
              <Text className="text-[15px] font-bold text-[#18181b]">Grant Permissions</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-dark-bg-primary">
        <ActivityIndicator size="large" color="#C2FC4A" />
        <Text className="mt-4 text-[15px] tracking-[1]" style={{ color: mutedColor }}>
          Scanning media...
        </Text>
      </View>
    );
  }

  return (
    <ScreenLayout>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}>
        {/* STORAGE OVERVIEW */}
        <View className="mb-8 px-4 pt-2">
          <Text className="mb-4 text-lg font-bold tracking-[0.5]" style={{ color: textColor }}>
            Storage Overview
          </Text>
          <View className="rounded-[20px] border border-white/10 bg-white/5 p-5 shadow-lg">
            <View className="flex-row items-center">
              <DoughnutChart
                segments={storageChartSegments}
                size={130}
                strokeWidth={18}
                centerText={formatBytes(deviceTotal)}
              />
              <View className="ml-5 flex-1">
                {[
                  { label: 'Music', color: '#C2FC4A', value: musicSize },
                  { label: 'Videos', color: '#EF4444', value: videoSize },
                  { label: 'Other Used', color: '#3b82f6', value: otherUsedSize },
                  { label: 'Free', color: 'rgba(255,255,255,0.1)', value: deviceFree },
                ].map((item) => (
                  <View key={item.label} className="mb-2 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 3,
                          backgroundColor: item.color,
                        }}
                      />
                      <Text className="text-[13px]" style={{ color: mutedColor }}>
                        {item.label}
                      </Text>
                    </View>
                    <Text className="text-[13px] font-semibold" style={{ color: textColor }}>
                      {formatBytes(item.value)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* MUSIC & VIDEOS - Two cards side by side */}
        <View className="mb-8 px-4">
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 rounded-[20px] border p-5"
              style={{ backgroundColor: '#C2FC4A15', borderColor: '#C2FC4A25' }}
              onPress={() => navigation.navigate('MusicTab')}>
              <GlassIcon size={44}>
                <MusicNote size={22} color={primaryColor} weight="bold" />
              </GlassIcon>
              <Text className="mb-0.5 text-base font-bold" style={{ color: textColor }}>
                Music
              </Text>
              <Text className="text-xs" style={{ color: mutedColor }}>
                {audio.length} songs
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 rounded-[20px] border p-5"
              style={{ backgroundColor: '#EF444415', borderColor: '#EF444425' }}
              onPress={() => navigation.navigate('VideosTab')}>
              <GlassIcon size={44}>
                <VideoCamera size={22} color={primaryColor} weight="bold" />
              </GlassIcon>
              <Text className="mb-0.5 text-base font-bold" style={{ color: textColor }}>
                Videos
              </Text>
              <Text className="text-xs" style={{ color: mutedColor }}>
                {videos.length} videos
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* PLAYLISTS */}
        <View className="mb-8 px-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-bold tracking-[0.5]" style={{ color: textColor }}>
              Playlists
            </Text>
            <TouchableOpacity onPress={handleCreatePlaylist}>
              <GlassIcon size={32}>
                <Plus size={16} color={primaryColor} weight="bold" />
              </GlassIcon>
            </TouchableOpacity>
          </View>
          {playlists.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {playlists.map((playlist) => (
                <TouchableOpacity
                  key={playlist.id}
                  className="mr-3 w-[140px] items-center rounded-2xl border border-white/10 bg-white/5 p-3 shadow-lg"
                  onPress={() => navigation.navigate('MusicTab')}
                  onLongPress={() => handlePlaylistLongPress(playlist)}>
                  {playlist.coverUri ? (
                    <RNImage
                      source={{ uri: playlist.coverUri }}
                      className="mb-2.5 h-[100px] w-[100px] rounded-xl"
                    />
                  ) : (
                    <View
                      className="mb-2.5 h-[100px] w-[100px] items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${primaryColor}15` }}>
                      <MusicNote size={28} color={primaryColor} weight="bold" />
                    </View>
                  )}
                  <Text
                    className="mb-0.5 text-center text-sm font-semibold"
                    style={{ color: textColor }}
                    numberOfLines={1}>
                    {playlist.name}
                  </Text>
                  <Text className="text-[11px]" style={{ color: mutedColor }}>
                    {playlist.files.length} tracks
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <TouchableOpacity
              className="items-center rounded-2xl border border-dashed border-white/10 bg-white/5 p-5"
              onPress={handleCreatePlaylist}>
              <GlassIcon size={48}>
                <Plus size={24} color={primaryColor} weight="bold" />
              </GlassIcon>
              <Text className="mt-2 text-sm" style={{ color: mutedColor }}>
                Create your first playlist
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* FOLDERS */}
        <View className="mb-8 px-4">
          <Text className="mb-3 text-lg font-bold tracking-[0.5]" style={{ color: textColor }}>
            Folders
          </Text>
          <View className="flex-row flex-wrap gap-2.5">
            {[
              {
                icon: <ArrowCounterClockwise size={20} color={primaryColor} weight="bold" />,
                label: 'Recents',
                count: allRecents.length,
                screen: 'FolderList',
                params: { title: 'Recents', filterType: 'recent' as const },
              },
              {
                icon: <Play size={20} color={primaryColor} weight="bold" />,
                label: 'Most Played',
                count: mostPlayed.length,
                screen: 'FolderList',
                params: { title: 'Most Played', filterType: 'mostPlayed' as const },
              },
              {
                icon: <Disc size={20} color={primaryColor} weight="bold" />,
                label: 'Random',
                count: randomFiles.length,
                screen: 'FolderList',
                params: { title: 'Random', filterType: 'random' as const },
              },
              {
                icon: <Heart size={20} color={primaryColor} weight="bold" />,
                label: 'Favorites',
                count: favoriteUris.length,
                screen: 'FolderList',
                params: { title: 'Favorites', filterType: 'favorites' as const },
              },
              {
                icon: <Copy size={20} color={primaryColor} weight="bold" />,
                label: 'Duplicates',
                count: duplicateCount,
                screen: 'FolderList',
                params: { title: 'Duplicates', filterType: 'duplicates' as const },
              },
              {
                icon: <ClockCountdown size={20} color={primaryColor} weight="bold" />,
                label: 'Unused',
                count: unusedCount,
                screen: 'FolderList',
                params: { title: 'Unused Files', filterType: 'unused' as const },
              },
              {
                icon: <HardDrive size={20} color={primaryColor} weight="bold" />,
                label: 'Large Files',
                count: largeFileCount,
                screen: 'FolderList',
                params: { title: 'Large Files', filterType: 'largeFiles' as const },
              },
              {
                icon: <Star size={20} color={primaryColor} weight="bold" />,
                label: 'Top Videos',
                count: 0,
                screen: 'VideoTop',
                params: undefined,
              },
            ].map((folder) => (
              <TouchableOpacity
                key={folder.label}
                className="rounded-[16px] border p-4"
                style={{
                  width: (width - 42 - 2.5) / 2,
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  borderColor: borderColor,
                }}
                onPress={() => navigation.navigate(folder.screen, folder.params as any)}>
                <View className="mb-2 flex-row items-center gap-3">
                  <GlassIcon size={36}>
                    {folder.icon}
                  </GlassIcon>
                  <Text className="text-sm font-bold" style={{ color: textColor }}>
                    {folder.label}
                  </Text>
                </View>
                <Text className="text-[11px]" style={{ color: mutedColor }}>
                  {folder.count > 0 ? `${folder.count} items` : 'Explore'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="h-[100px]" />
      </Animated.ScrollView>

      {/* Playlist Name Input Modal */}
      <Modal visible={showPlaylistInput} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/70">
          <View className="w-[85%] max-w-[360px] rounded-2xl border border-white/10 bg-[#1a1a2e] p-6">
            <Text className="mb-4 text-center text-lg font-extrabold" style={{ color: textColor }}>
              New Playlist
            </Text>
            <TextInput
              className="mb-5 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
              style={{ color: textColor }}
              placeholder="Playlist name"
              placeholderTextColor={mutedColor}
              value={playlistInput}
              onChangeText={setPlaylistInput}
              autoFocus
              selectTextOnFocus
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 items-center rounded-xl bg-white/10 py-3"
                onPress={() => {
                  setShowPlaylistInput(false);
                  setPlaylistInput('');
                }}>
                <Text className="text-sm font-semibold" style={{ color: mutedColor }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center rounded-xl py-3"
                style={{ backgroundColor: primaryColor }}
                onPress={handlePlaylistCreateConfirm}>
                <Text className="text-sm font-bold" style={{ color: '#18181b' }}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
});
