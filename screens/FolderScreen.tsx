import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import {
  CaretLeft,
  MusicNote,
  Play,
  Shuffle,
  Heart,
  Copy,
  ClockCountdown,
  HardDrive,
} from 'phosphor-react-native';
import { useMediaStore } from '../stores/mediaStore';
import { useRecentlyPlayed } from '../hooks/useDomainSelectors';
import { useFavorites } from '../hooks/useFavorites';
import { useTheme } from '../context/ThemeContext';
import { HistoryService } from '../services/History/HistoryService';
import { formatDuration, formatFileSize } from '../services/FileService';
import { ScreenLayout } from '../components/ScreenLayout';
import { FileIcon } from '../components/FileIcon';
import type { FileItem } from '../types';

export type FolderFilterType =
  | 'recent'
  | 'mostPlayed'
  | 'random'
  | 'favorites'
  | 'duplicates'
  | 'unused'
  | 'largeFiles';

type FolderScreenProps = NativeStackScreenProps<RootStackParamList, 'FolderList'>;

const FILTER_ICONS: Record<FolderFilterType, React.ElementType> = {
  recent: Play,
  mostPlayed: Play,
  random: Shuffle,
  favorites: Heart,
  duplicates: Copy,
  unused: ClockCountdown,
  largeFiles: HardDrive,
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
  const recentlyPlayed = useRecentlyPlayed();
  const { textColor, mutedColor, primaryColor, isDarkMode } = useTheme();
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
      default:
        return [];
    }
  }, [filterType, recentlyPlayed, audio, allFiles, favoriteUris]);

  const navigateToFile = (file: FileItem) => {
    if (file.type === 'video') navigation.navigate('VideoPlayer', { file });
    else navigation.navigate('MusicPlayer', { file });
  };

  const renderListItem = ({ item }: { item: FileItem }) => (
    <TouchableOpacity
      className="flex-row items-center justify-between py-3"
      style={{
        borderBottomWidth: 1,
        borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      }}
      onPress={() => navigateToFile(item)}>
      <View className="flex-1 flex-row items-center">
        <View className="mr-3 h-11 w-11 items-center justify-center rounded-xl bg-white/10">
          <FileIcon type={item.type} size={22} />
        </View>
        <View className="flex-1">
          <Text className="mb-1 text-[15px]" style={{ color: textColor }} numberOfLines={1}>
            {item.name}
          </Text>
          <View className="flex-row items-center">
            {item.size && (
              <Text className="text-xs" style={{ color: mutedColor }}>
                {formatFileSize(item.size)}
              </Text>
            )}
            {item.duration ? (
              <>
                <Text className="mx-1.5 text-xs" style={{ color: mutedColor }}>
                  •
                </Text>
                <Text className="text-xs" style={{ color: mutedColor }}>
                  {formatDuration(item.duration)}
                </Text>
              </>
            ) : null}
            {filterType === 'duplicates' && (
              <>
                <Text className="mx-1.5 text-xs" style={{ color: mutedColor }}>
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
      <Text className="text-xl" style={{ color: mutedColor }}>
        ›
      </Text>
    </TouchableOpacity>
  );

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
          <View className="items-center justify-center py-[100]">
            <FolderIcon size={64} color={mutedColor} />
            <Text className="mt-4 text-base" style={{ color: mutedColor }}>
              No {title.toLowerCase()} found
            </Text>
          </View>
        }
      />
    </ScreenLayout>
  );
}
