import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { VideoCamera, ArrowUp, ArrowDown } from 'phosphor-react-native';
import { useMediaStore } from '../stores/mediaStore';
import { useTheme } from '../context/ThemeContext';
import { formatDuration } from '../services/FileService';
import type { FileItem, SortField, SortDirection } from '../types';
import { ScreenLayout } from '../components/ScreenLayout';
import { Sorting } from '../services/Sorting';
import FileGrid from '../components/FileGrid';

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: 'date', label: 'Date' },
  { field: 'name', label: 'Name' },
  { field: 'duration', label: 'Duration' },
  { field: 'size', label: 'Size' },
  { field: 'type', label: 'Type' },
];

export const VideosScreen = React.memo(function VideosScreen() {
  const videos = useMediaStore((s) => s.videos);
  const navigation = useNavigation<any>();
  const { primaryColor, textColor, mutedColor, isDarkMode, cardBg, borderColor } = useTheme();
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showSortModal, setShowSortModal] = useState(false);

  const toggleDirection = useCallback(() => {
    setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
  }, []);

  const sortedVideos = useMemo(() => {
    return Sorting.sort(videos, sortField, sortDirection);
  }, [videos, sortField, sortDirection]);

  const currentSortLabel = SORT_OPTIONS.find((o) => o.field === sortField)?.label || 'Date';

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
            <View className="h-16 w-[100px] overflow-hidden rounded-[10px]">
              {item.thumbnail ? (
                <Image source={{ uri: item.thumbnail }} className="h-full w-full" />
              ) : (
                <View
                  className="h-full w-full items-center justify-center"
                  style={{ backgroundColor: `${primaryColor}15` }}>
                  <VideoCamera size={28} color={primaryColor} weight="fill" />
                </View>
              )}
            </View>
            <View className="flex-1">
              <Text
                className="mb-1 text-[15px] font-semibold"
                style={{ color: textColor }}
                numberOfLines={1}>
                {item.name}
              </Text>
              <Text className="text-[13px]" style={{ color: mutedColor }}>
                {quality} | {formatDuration(item.duration)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [navigateToFile, primaryColor, textColor, mutedColor]
  );

  const renderSortModal = useMemo(
    () => (
      <Modal visible={showSortModal} transparent animationType="fade">
        <TouchableOpacity
          className="flex-1 items-center justify-center bg-black/70"
          onPress={() => setShowSortModal(false)}>
          <View
            className="w-[80%] max-w-[320px] rounded-[28px] p-6"
            style={{ backgroundColor: isDarkMode ? '#27272a' : '#ffffff' }}>
            <Text className="mb-4 text-center text-lg font-extrabold" style={{ color: textColor }}>
              Sort by
            </Text>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.field}
                className="mb-2 flex-row items-center justify-between rounded-xl px-4 py-3.5"
                style={
                  sortField === opt.field ? { backgroundColor: `${primaryColor}15` } : undefined
                }
                onPress={() => {
                  if (sortField === opt.field) {
                    toggleDirection();
                  } else {
                    setSortField(opt.field);
                    setSortDirection(opt.field === 'name' ? 'asc' : 'desc');
                  }
                  setShowSortModal(false);
                }}>
                <Text
                  className="text-base font-medium"
                  style={{
                    color: sortField === opt.field ? primaryColor : textColor,
                    fontWeight: sortField === opt.field ? '700' : '500',
                  }}>
                  {opt.label}
                </Text>
                {sortField === opt.field &&
                  (sortDirection === 'asc' ? (
                    <ArrowUp size={18} color={primaryColor} />
                  ) : (
                    <ArrowDown size={18} color={primaryColor} />
                  ))}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    ),
    [showSortModal, sortField, sortDirection, primaryColor, toggleDirection]
  );

  return (
    <ScreenLayout onSortPress={() => setShowSortModal(true)}>
      <View className="mb-2 px-4">
        <Text className="text-2xl font-extrabold" style={{ color: textColor }}>
          Videos
        </Text>
      </View>
      <View className="flex-1">
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
      {renderSortModal}
    </ScreenLayout>
  );
});
