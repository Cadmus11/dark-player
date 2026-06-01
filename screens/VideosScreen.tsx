import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { VideoCamera } from 'phosphor-react-native';
import { useMediaStore } from '../stores/mediaStore';
import { useTheme } from '../context/ThemeContext';
import { formatDuration } from '../services/FileService';
import type { FileItem, SortField, SortDirection } from '../types';
import { ScreenLayout } from '../components/ScreenLayout';
import { Sorting } from '../services/Sorting';
import { SortModal } from '../components/SortModal';
import FileGrid from '../components/FileGrid';

export const VideosScreen = React.memo(function VideosScreen() {
  const videos = useMediaStore((s) => s.videos);
  const navigation = useNavigation<any>();
  const { primaryColor, textColor, mutedColor, isDarkMode } = useTheme();
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showSortModal, setShowSortModal] = useState(false);

  const sortedVideos = useMemo(() => {
    return Sorting.sort(videos, sortField, sortDirection);
  }, [videos, sortField, sortDirection]);

  const sortLabelMap: Record<string, string> = {
    name: 'Name', date: 'Date', newest: 'Newest', size: 'Size',
    type: 'Type', duration: 'Duration', artist: 'Artist', album: 'Album',
    playCount: 'Plays', recentlyPlayed: 'Recent',
  };
  const currentSortLabel = sortLabelMap[sortField] || sortField;

  const handleSortSelect = useCallback((field: SortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
  }, []);

  const navigateToFile = useCallback(
    (file: FileItem) => {
      navigation.navigate('VideoPlayer', { file });
    },
    [navigation]
  );

  const renderListItem = useCallback(
    ({ item }: { item: FileItem }) => {
      const quality = item.mimeType?.split('/').pop()?.toUpperCase() || 'HD';
      return (
        <TouchableOpacity className="px-4 py-2" onPress={() => navigateToFile(item)}>
          <View className="flex-row items-center gap-3">
            <View
              className="h-16 w-24 items-center justify-center overflow-hidden rounded-xl"
              style={{ backgroundColor: `${primaryColor}15` }}>
              {item.thumbnail ? (
                <Image
                  source={{ uri: item.thumbnail + '?quality=low' }}
                  className="h-16 w-24 rounded-xl"
                  resizeMode="cover"
                />
              ) : (
                <VideoCamera size={24} color={primaryColor} weight="fill" />
              )}
            </View>
            <View className="flex-1">
              <Text
                className="mb-0.5 text-[15px] font-semibold"
                style={{ color: textColor }}
                numberOfLines={1}>
                {item.name}
              </Text>
              <View className="flex-row items-center gap-2">
                <Text className="text-[12px]" style={{ color: mutedColor }}>
                  {formatDuration(item.duration || 0)}
                </Text>
                <View
                  className="rounded-md px-1.5 py-0.5"
                  style={{ backgroundColor: `${primaryColor}20` }}>
                  <Text
                    className="text-[9px] font-bold tracking-wider"
                    style={{ color: primaryColor }}>
                    {quality}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [navigateToFile, primaryColor, textColor, mutedColor]
  );

  return (
    <ScreenLayout onSortPress={() => setShowSortModal(true)} sortLabel={currentSortLabel}>
      <View className="mb-2 px-4">
        <Text className="text-2xl font-extrabold" style={{ color: textColor }}>
          Videos
        </Text>
      </View>
      <View className="flex-1">
        <SortModal
          visible={showSortModal}
          onClose={() => setShowSortModal(false)}
          sortField={sortField}
          sortDirection={sortDirection}
          onSelect={handleSortSelect}
          primaryColor={primaryColor}
          textColor={textColor}
          mutedColor={mutedColor}
          isDarkMode={isDarkMode}
        />
        <FileGrid
          data={sortedVideos}
          onPress={navigateToFile}
          primaryColor={primaryColor}
          textColor={textColor}
          mutedColor={mutedColor}
          emptyMessage="No videos found"
          hideName
        />
      </View>
    </ScreenLayout>
  );
});
