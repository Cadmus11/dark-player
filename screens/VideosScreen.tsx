import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { VideoCamera, FunnelSimple, ArrowUp, ArrowDown } from 'phosphor-react-native';
import { useFiles } from '../context/FileContext';
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
  const { videos } = useFiles();
  const navigation = useNavigation<any>();
  const { primaryColor, textColor, mutedColor } = useTheme();
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

  const navigateToFile = useCallback((file: FileItem) => {
    navigation.navigate('VideoPlayer', { file });
  }, [navigation]);

  const renderListItem = useCallback(({ item }: { item: FileItem }) => {
    const quality = item.mimeType?.split('/').pop()?.toUpperCase() || 'HD';
    return (
      <TouchableOpacity className="px-4 py-2" onPress={() => navigateToFile(item)}>
        <View className="flex-row items-center gap-3">
          <View className="w-[100px] h-16 rounded-[10px] overflow-hidden">
            {item.thumbnail ? (
              <Image source={{ uri: item.thumbnail }} className="w-full h-full" />
            ) : (
              <View className="w-full h-full items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
                <VideoCamera size={28} color={primaryColor} weight="fill" />
              </View>
            )}
          </View>
          <View className="flex-1">
            <Text className="text-[15px] font-semibold mb-1" style={{ color: textColor }} numberOfLines={1}>{item.name}</Text>
            <Text className="text-[13px]" style={{ color: mutedColor }}>
              {quality} | {formatDuration(item.duration)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [navigateToFile, primaryColor, textColor, mutedColor]);

  const renderSortModal = useMemo(() => (
    <Modal visible={showSortModal} transparent animationType="fade">
      <TouchableOpacity className="flex-1 bg-black/70 items-center justify-center" onPress={() => setShowSortModal(false)}>
        <View className="rounded-3xl p-6 w-[80%] max-w-[320px] bg-[#27272a]">
          <Text className="text-lg font-extrabold mb-4 text-center text-white">Sort by</Text>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.field}
              className="flex-row items-center justify-between py-3.5 px-4 rounded-xl mb-2"
              style={sortField === opt.field ? { backgroundColor: `${primaryColor}15` } : undefined}
              onPress={() => {
                if (sortField === opt.field) {
                  toggleDirection();
                } else {
                  setSortField(opt.field);
                  setSortDirection(opt.field === 'name' ? 'asc' : 'desc');
                }
                setShowSortModal(false);
              }}
            >
              <Text
                className="text-base font-medium"
                style={{
                  color: sortField === opt.field ? primaryColor : '#e4e4e7',
                  fontWeight: sortField === opt.field ? '700' : '500',
                }}
              >
                {opt.label}
              </Text>
              {sortField === opt.field && (
                sortDirection === 'asc' ? (
                  <ArrowUp size={18} color={primaryColor} />
                ) : (
                  <ArrowDown size={18} color={primaryColor} />
                )
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  ), [showSortModal, sortField, sortDirection, primaryColor, toggleDirection]);

  return (
    <ScreenLayout>
      <View className="flex-row justify-between items-center px-4 mb-2">
        <Text className="text-2xl font-extrabold" style={{ color: textColor }}>Videos</Text>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity className="flex-row items-center bg-[#27272a] px-2.5 py-1.5 rounded-lg gap-1" onPress={() => setShowSortModal(true)}>
            <FunnelSimple size={16} color={mutedColor} />
            <Text className="text-[11px] font-semibold" style={{ color: mutedColor }}>{currentSortLabel}</Text>
            {sortDirection === 'asc' ? (
              <ArrowUp size={14} color={mutedColor} />
            ) : (
              <ArrowDown size={14} color={mutedColor} />
            )}
          </TouchableOpacity>
        </View>
      </View>
      <View className="flex-1">
        <FileGrid
          data={sortedVideos}
          onPress={navigateToFile}
          primaryColor={primaryColor}
          textColor={textColor}
          mutedColor={mutedColor}
          emptyMessage="No videos found"
        />
      </View>
      {renderSortModal}
    </ScreenLayout>
  );
});