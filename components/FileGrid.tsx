import React, { memo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native';
import type { FileItem, LayoutSize } from '../types';
import { MusicNote, VideoCamera, Play } from 'phosphor-react-native';
import type { FileType } from '../types';
import { formatDuration } from '../services/FileService';

interface FileGridProps {
  data: FileItem[];
  onPress: (item: FileItem) => void;
  primaryColor: string;
  textColor: string;
  mutedColor: string;
  emptyMessage?: string;
  columns?: number;
  layoutSize?: LayoutSize;
  renderOverlay?: (item: FileItem) => React.ReactNode;
  renderSubtitle?: (item: FileItem) => React.ReactNode;
}

function FileTypeIcon({ type, size, color }: { type?: FileType; size: number; color: string }) {
  const Icon = type === 'video' ? VideoCamera : MusicNote;
  return <Icon size={size} color={color} weight="fill" />;
}

const GridItem = memo(function GridItem({
  item,
  onPress,
  primaryColor,
  textColor,
  mutedColor,
  columns,
  renderOverlay,
  renderSubtitle,
}: {
  item: FileItem;
  onPress: (item: FileItem) => void;
  primaryColor: string;
  textColor: string;
  mutedColor: string;
  columns: number;
  renderOverlay?: (item: FileItem) => React.ReactNode;
  renderSubtitle?: (item: FileItem) => React.ReactNode;
}) {
  return (
    <TouchableOpacity className="flex-1 m-1.5" style={{ maxWidth: columns === 4 ? '23%' : columns === 2 ? '48%' : '31%' } as any} onPress={() => onPress(item)}>
      <View className="w-full aspect-square rounded-xl justify-center items-center mb-2" style={{ backgroundColor: item.artColor ? `${item.artColor}20` : 'rgba(194, 252, 74, 0.08)' }}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} className="w-full h-full rounded-xl" />
        ) : (
          <FileTypeIcon type={item.type} size={32} color={primaryColor} />
        )}
        {item.duration && (
          <View className="absolute bottom-1.5 right-1.5 flex-row items-center bg-black/70 px-1.5 py-0.5 rounded-md gap-0.5">
            <Play size={10} color="#ffffff" weight="fill" />
            <Text className="text-[10px] text-white font-semibold">{formatDuration(item.duration)}</Text>
          </View>
        )}
        {renderOverlay?.(item)}
      </View>
      <Text className="text-xs font-semibold mb-0.5" style={{ color: textColor }} numberOfLines={1}>{item.name}</Text>
      {renderSubtitle ? renderSubtitle(item) : item.artist && (
        <Text className="text-[11px]" style={{ color: mutedColor }} numberOfLines={1}>{item.artist}</Text>
      )}
    </TouchableOpacity>
  );
});

function FileGrid({
  data,
  onPress,
  primaryColor,
  textColor,
  mutedColor,
  emptyMessage = 'No items found',
  columns,
  layoutSize = 'medium',
  renderOverlay,
  renderSubtitle,
}: FileGridProps) {
  const colCount = columns || (layoutSize === 'small' ? 4 : layoutSize === 'big' ? 2 : 3);
  const keyExtractor = useCallback((item: FileItem) => item.uri, []);

  const renderItem = useCallback(({ item }: { item: FileItem }) => (
    <GridItem
      item={item}
      onPress={onPress}
      primaryColor={primaryColor}
      textColor={textColor}
      mutedColor={mutedColor}
      columns={colCount}
      renderOverlay={renderOverlay}
      renderSubtitle={renderSubtitle}
    />
  ), [onPress, primaryColor, textColor, mutedColor, colCount, renderOverlay, renderSubtitle]);

  const renderEmpty = useCallback(() => (
    <View className="items-center justify-center py-[100]">
      <MusicNote size={64} color={mutedColor} />
      <Text className="text-base mt-4" style={{ color: mutedColor }}>{emptyMessage}</Text>
    </View>
  ), [mutedColor, emptyMessage]);

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={colCount}
      columnWrapperStyle={{ justifyContent: 'flex-start', gap: 4 }}
      contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={renderEmpty}
      removeClippedSubviews
      windowSize={7}
      maxToRenderPerBatch={10}
      initialNumToRender={8}
    />
  );
}

export default memo(FileGrid);
