import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, FolderFilterType, FileItem } from '../types';
import {
  CaretLeft,
  MusicNote,
  Play,
  Shuffle,
  Heart,
  Copy,
  ClockCountdown,
  HardDrive,
  MicrophoneStage,
  VinylRecord,
  User,
  Folder,
} from 'phosphor-react-native';
import { useMediaStore } from '../stores/mediaStore';
import { useRecentlyPlayed } from '../hooks/useDomainSelectors';
import { useFavorites } from '../hooks/useFavorites';
import { usePlaybackStore } from '../stores/playbackStore';
import { useTheme } from '../context/ThemeContext';
import { HistoryService } from '../services/History/HistoryService';
import { formatDuration, formatFileSize } from '../services/FileService';
import { ScreenLayout } from '../components/ScreenLayout';
import { FileIcon } from '../components/FileIcon';

type FolderScreenProps = NativeStackScreenProps<RootStackParamList, 'FolderList'>;

const FILTER_ICONS: Record<FolderFilterType, React.ElementType> = {
  recent: Play,
  mostPlayed: Play,
  random: Shuffle,
  favorites: Heart,
  duplicates: Copy,
  unused: ClockCountdown,
  largeFiles: HardDrive,
  lyrics: MicrophoneStage,
  albums: VinylRecord,
  artists: User,
  folders: Folder,
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const LARGE_FILE_BYTES = 100 * 1024 * 1024;

function findDuplicates(files: FileItem[]): FileItem[] {
  const nameMap = new Map<string, FileItem[]>();
  for (const file of files) {
    const key = file.name.toLowerCase();
    if (!nameMap.has(key)) nameMap.set(key, []);
    nameMap.get(key)!.push(file);
  }
  const seen = new Set<string>();
  const result: FileItem[] = [];
  for (const group of nameMap.values()) {
    if (group.length > 1) {
      for (const f of group) {
        if (!seen.has(f.uri)) {
          seen.add(f.uri);
          result.push(f);
        }
      }
    }
  }
  return result;
}

function getUnusedFiles(files: FileItem[]): FileItem[] {
  const history = HistoryService.getAll();
  const lastPlayedMap = new Map<string, number>();
  for (const h of history) {
    const existing = lastPlayedMap.get(h.file.uri);
    if (!existing || h.playedAt > existing) {
      lastPlayedMap.set(h.file.uri, h.playedAt);
    }
  }
  const cutoff = Date.now() - THIRTY_DAYS_MS;
  return files.filter((f) => {
    const lastPlayed = lastPlayedMap.get(f.uri);
    return !lastPlayed || lastPlayed < cutoff;
  });
}

export function FolderScreen({ navigation, route }: FolderScreenProps) {
  const { title, filterType } = route.params;
  const videos = useMediaStore((s) => s.videos);
  const audio = useMediaStore((s) => s.audio);
  const loading = useMediaStore((s) => s.loading);
  const recentlyPlayed = useRecentlyPlayed();
  const { textColor, mutedColor, primaryColor, isDarkMode } = useTheme();
  const currentFile = usePlaybackStore((s) => s.currentFile);
  const allFiles = useMemo(() => [...videos, ...audio], [videos, audio]);
  const { favoriteUris } = useFavorites(allFiles);

  const FolderIcon = FILTER_ICONS[filterType] || MusicNote;

  const files = useMemo(() => {
    switch (filterType) {
      case 'recent':
        return recentlyPlayed.map((r) => r.file).slice(0, 50);
      case 'mostPlayed':
        return HistoryService.getMostPlayed(50).map((e) => e.file);
      case 'random': {
        const shuffled = [...audio].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 50);
      }
      case 'favorites':
        return allFiles.filter((f) => favoriteUris.includes(f.uri));
      case 'duplicates':
        return findDuplicates(allFiles);
      case 'unused':
        return getUnusedFiles(allFiles);
      case 'largeFiles':
        return allFiles
          .filter((f) => (f.size || 0) >= LARGE_FILE_BYTES)
          .sort((a, b) => (b.size || 0) - (a.size || 0));
      case 'lyrics':
        return allFiles.filter((f) => f.hasLyrics);
      case 'albums': {
        const albumMap = new Map<string, FileItem[]>();
        for (const f of allFiles) {
          const album = f.album || 'Unknown Album';
          if (!albumMap.has(album)) albumMap.set(album, []);
          albumMap.get(album)!.push(f);
        }
        return Array.from(albumMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, tracks]) => tracks[0]);
      }
      case 'artists': {
        const artistMap = new Map<string, FileItem[]>();
        for (const f of allFiles) {
          const artist = f.artist || 'Unknown Artist';
          if (!artistMap.has(artist)) artistMap.set(artist, []);
          artistMap.get(artist)!.push(f);
        }
        return Array.from(artistMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, tracks]) => tracks[0]);
      }
      case 'folders': {
        const folderMap = new Map<string, FileItem[]>();
        for (const f of allFiles) {
          const parts = f.uri.split('/');
          const folder = parts.slice(0, -1).join('/') || '/';
          if (!folderMap.has(folder)) folderMap.set(folder, []);
          folderMap.get(folder)!.push(f);
        }
        return Array.from(folderMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, items]) => items[0]);
      }
      default:
        return [];
    }
  }, [filterType, recentlyPlayed, audio, allFiles, favoriteUris]);

  const navigateToFile = (file: FileItem) => {
    if (file.type === 'video') navigation.navigate('VideoPlayer', { file });
    else navigation.navigate('MusicPlayer', { file });
  };

  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (filterType === 'albums') {
      const albumCounts = new Map<string, number>();
      for (const f of allFiles) {
        const key = f.album || 'Unknown Album';
        albumCounts.set(key, (albumCounts.get(key) || 0) + 1);
      }
      for (const f of allFiles) {
        counts.set(f.uri, albumCounts.get(f.album || 'Unknown Album') || 0);
      }
    } else if (filterType === 'artists') {
      const artistCounts = new Map<string, number>();
      for (const f of allFiles) {
        const key = f.artist || 'Unknown Artist';
        artistCounts.set(key, (artistCounts.get(key) || 0) + 1);
      }
      for (const f of allFiles) {
        counts.set(f.uri, artistCounts.get(f.artist || 'Unknown Artist') || 0);
      }
    } else if (filterType === 'folders') {
      const folderCounts = new Map<string, number>();
      for (const f of allFiles) {
        const folder = f.uri.split('/').slice(0, -1).join('/') || '/';
        folderCounts.set(folder, (folderCounts.get(folder) || 0) + 1);
      }
      for (const f of allFiles) {
        const folder = f.uri.split('/').slice(0, -1).join('/') || '/';
        counts.set(f.uri, folderCounts.get(folder) || 0);
      }
    }
    return counts;
  }, [filterType, allFiles]);

  const getGroupCount = (file: FileItem): number => {
    return groupCounts.get(file.uri) || 0;
  };

  const getSubtitle = (file: FileItem): string => {
    if (filterType === 'albums') return file.album || 'Unknown Album';
    if (filterType === 'artists') return file.artist || 'Unknown Artist';
    if (filterType === 'folders') {
      const parts = file.uri.split('/');
      return parts.slice(0, -1).join('/').split('/').pop() || '/';
    }
    return '';
  };

  const renderListItem = ({ item }: { item: FileItem }) => {
    const isNowPlaying = currentFile?.uri === item.uri;
    const groupCount = getGroupCount(item);
    const subtitle = getSubtitle(item);
    return (
      <TouchableOpacity
        className="flex-row items-center justify-between py-3"
        style={[
          {
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          },
          isNowPlaying && {
            backgroundColor: `${primaryColor}08`,
            borderLeftWidth: 3,
            borderLeftColor: primaryColor,
            paddingLeft: 12,
          },
        ]}
        onPress={() => navigateToFile(item)}>
        <View className="flex-1 flex-row items-center">
          <View
            className="mr-3 h-11 w-11 items-center justify-center rounded-xl"
            style={[
              {
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              },
              isNowPlaying && { borderWidth: 1.5, borderColor: primaryColor },
            ]}>
            <FileIcon type={item.type} size={22} />
          </View>
          <View className="flex-1">
            <Text
              className="mb-1 text-[15px]"
              style={{ color: isNowPlaying ? primaryColor : textColor }}
              numberOfLines={1}>
              {item.name}
            </Text>
            <View className="flex-row items-center">
              {subtitle ? (
                <Text
                  className="text-xs"
                  style={{ color: isNowPlaying ? primaryColor : mutedColor }}
                  numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : item.size ? (
                <Text
                  className="text-xs"
                  style={{ color: isNowPlaying ? primaryColor : mutedColor }}>
                  {formatFileSize(item.size)}
                </Text>
              ) : null}
              {item.duration ? (
                <>
                  <Text
                    className="mx-1.5 text-xs"
                    style={{ color: isNowPlaying ? primaryColor : mutedColor }}>
                    •
                  </Text>
                  <Text
                    className="text-xs"
                    style={{ color: isNowPlaying ? primaryColor : mutedColor }}>
                    {formatDuration(item.duration)}
                  </Text>
                </>
              ) : null}
              {groupCount > 0 && (
                <>
                  <Text
                    className="mx-1.5 text-xs"
                    style={{ color: isNowPlaying ? primaryColor : mutedColor }}>
                    •
                  </Text>
                  <Text className="text-xs" style={{ color: primaryColor }}>
                    {groupCount} {groupCount === 1 ? 'track' : 'tracks'}
                  </Text>
                </>
              )}
              {filterType === 'duplicates' && (
                <>
                  <Text
                    className="mx-1.5 text-xs"
                    style={{ color: isNowPlaying ? primaryColor : mutedColor }}>
                    •
                  </Text>
                  <Text className="text-xs" style={{ color: primaryColor }}>
                    Duplicate
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
        <Text className="text-xl" style={{ color: isNowPlaying ? primaryColor : mutedColor }}>
          ›
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenLayout noTopBar>
      <View className="flex-row items-center justify-between px-5 pb-5 pt-[60]">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2.5">
          <CaretLeft size={24} color={textColor} />
        </TouchableOpacity>
        <View className="flex-row items-center">
          <FolderIcon size={20} color={textColor} />
          <Text className="ml-1 text-xl font-semibold" style={{ color: textColor }}>
            {' '}
            {title}
          </Text>
        </View>
        <View className="w-10" />
      </View>
      <FlashList
        data={files}
        renderItem={renderListItem}
        keyExtractor={(item: FileItem) => item.uri + (filterType === 'duplicates' ? '_dup' : '')}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <View className="items-center justify-center py-[100]">
              <ActivityIndicator size="large" color={primaryColor} />
              <Text className="mt-3 text-base" style={{ color: mutedColor }}>
                Loading...
              </Text>
            </View>
          ) : (
            <View className="items-center justify-center py-[100]">
              <FolderIcon size={64} color={mutedColor} />
              <Text className="mt-4 text-base" style={{ color: mutedColor }}>
                No {title.toLowerCase()} found
              </Text>
            </View>
          )
        }
      />
    </ScreenLayout>
  );
}
