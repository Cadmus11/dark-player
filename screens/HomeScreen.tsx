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
  TrendUp,
  Disc,
  VideoCamera,
  ArrowCounterClockwise,
  Plus,
} from 'phosphor-react-native';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';
import { Paths } from 'expo-file-system';
import { useFiles } from '../context/FileContext';
import { usePlaylistStore } from '../stores/playlistStore';
import { useTheme } from '../context/ThemeContext';
import { ScreenLayout } from '../components/ScreenLayout';
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
  const {
    permissionsGranted,
    loading,
    categories,
    recentFiles,
    recentlyPlayed,
    playlists,
    requestPermissions,
    audio,
    videos,
    createPlaylist,
  } = useFiles();
  const { textColor, mutedColor, primaryColor } = useTheme();
  const [showSplash, setShowSplash] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [showPermissionRationale, setShowPermissionRationale] = useState(false);
  const [recommended, setRecommended] = useState<FileItem[]>([]);
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

  const deviceTotal = Paths.totalDiskSpace || 1;
  const deviceFree = Paths.availableDiskSpace || 0;
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
      await createPlaylist(playlistInput.trim());
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
              <View
                className="mb-3 h-11 w-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: '#C2FC4A25' }}>
                <MusicNote size={22} color="#C2FC4A" weight="bold" />
              </View>
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
              <View
                className="mb-3 h-11 w-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: '#EF444425' }}>
                <VideoCamera size={22} color="#EF4444" weight="bold" />
              </View>
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
            <TouchableOpacity
              className="h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: `${primaryColor}20` }}
              onPress={handleCreatePlaylist}>
              <Plus size={16} color={primaryColor} weight="bold" />
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
              <Plus size={24} color={mutedColor} weight="bold" />
              <Text className="mt-2 text-sm" style={{ color: mutedColor }}>
                Create your first playlist
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* FOLDERS - Recents, Recommendations, Random, Most Played, Others */}
        <View className="mb-8 px-4">
          <Text className="mb-3 text-lg font-bold tracking-[0.5]" style={{ color: textColor }}>
            Folders
          </Text>
          <View className="flex-row flex-wrap gap-2.5">
            {[
              {
                icon: <ArrowCounterClockwise size={22} color="#8b5cf6" weight="bold" />,
                label: 'Recents',
                color: '#8b5cf6',
                count: allRecents.length,
                onPress: () => {},
              },
              {
                icon: <TrendUp size={22} color="#f59e0b" weight="bold" />,
                label: 'Recommendations',
                color: '#f59e0b',
                count: recommended.length,
                onPress: () => {},
              },
              {
                icon: <Disc size={22} color="#06b6d4" weight="bold" />,
                label: 'Random',
                color: '#06b6d4',
                count: randomFiles.length,
                onPress: () => {},
              },
              {
                icon: <Play size={22} color="#ec4899" weight="bold" />,
                label: 'Most Played',
                color: '#ec4899',
                count: mostPlayed.length,
                onPress: () => {},
              },
              {
                icon: <VideoCamera size={22} color="#10b981" weight="bold" />,
                label: 'Others',
                color: '#10b981',
                count: 0,
                onPress: () => {},
              },
            ].map((folder) => (
              <TouchableOpacity
                key={folder.label}
                className="rounded-[16px] border p-4"
                style={{
                  width: (width - 42 - 2.5) / 2,
                  backgroundColor: `${folder.color}10`,
                  borderColor: `${folder.color}18`,
                }}
                onPress={folder.onPress}>
                <View className="mb-2 flex-row items-center gap-3">
                  <View
                    className="h-9 w-9 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${folder.color}18` }}>
                    {folder.icon}
                  </View>
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
