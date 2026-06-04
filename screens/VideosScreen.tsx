import React, { useState, useMemo, useCallback } from 'react';
import { View } from 'react-native';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { useMediaStore } from '../stores/mediaStore';
import { useTheme } from '../context/ThemeContext';
import type { FileItem, SortField, SortDirection } from '../types';
import { ScreenLayout } from '../components/ScreenLayout';
import { ThemedText } from '../components/ThemedText';
import { Sorting } from '../services/Sorting';
import { SortModal } from '../components/SortModal';
import FileGrid from '../components/FileGrid';
import { SkeletonCard } from '../components/SkeletonLoader';

export const VideosScreen = React.memo(function VideosScreen() {
  const videos = useMediaStore((s) => s.videos);
  const loading = useMediaStore((s) => s.loading);
  const navigation = useAppNavigation();
  const { primaryColor, textColor, mutedColor, isDarkMode } = useTheme();
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showSortModal, setShowSortModal] = useState(false);

  const sortedVideos = useMemo(() => {
    return Sorting.sort(videos, sortField, sortDirection);
  }, [videos, sortField, sortDirection]);

  const sortLabelMap: Record<string, string> = {
    name: 'Name',
    date: 'Date',
    newest: 'Newest',
    size: 'Size',
    type: 'Type',
    duration: 'Duration',
    artist: 'Artist',
    album: 'Album',
    playCount: 'Plays',
    recentlyPlayed: 'Recent',
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

  return (
    <ScreenLayout onSortPress={() => setShowSortModal(true)} sortLabel={currentSortLabel}>
      <View className="mb-2 px-4">
        <ThemedText variant="h1">Videos</ThemedText>
      </View>
      <View className="flex-1">
        {loading && videos.length === 0 ? (
          <View className="flex-row flex-wrap px-3 pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </View>
        ) : (
          <>
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
          </>
        )}
      </View>
    </ScreenLayout>
  );
});
