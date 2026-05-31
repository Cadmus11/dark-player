import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native';
import type { FileItem, LayoutSize, FileType } from '../types';
import { MusicNote, VideoCamera, Play } from 'phosphor-react-native';
import { formatDuration } from '../services/FileService';
import { useTheme } from '../context/ThemeContext';

interface FileGridProps {
  data: FileItem[];
  onPress: (item: FileItem) => void;
  primaryColor: string;
  textColor: string;
  mutedColor: string;
  emptyMessage?: string;
  columns?: number;
  layoutSize?: LayoutSize;
  fileType?: FileType;
  hideName?: boolean;
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
  isDarkMode,
  columns,
  itemAspect,
  hideName,
  renderOverlay,
  renderSubtitle,
}: {
  item: FileItem;
  onPress: (item: FileItem) => void;
  primaryColor: string;
  textColor: string;
  mutedColor: string;
  isDarkMode: boolean;
  columns: number;
  itemAspect: number;
  hideName?: boolean;
  renderOverlay?: (item: FileItem) => React.ReactNode;
  renderSubtitle?: (item: FileItem) => React.ReactNode;
}) {
  return (
    <TouchableOpacity
      className="flex-1 px-1"
      style={{ maxWidth: `${100 / columns}%` } as any}
      onPress={() => onPress(item)}>
      <View
        className="mb-2 w-full items-center justify-center rounded-xl"
        style={{
          aspectRatio: itemAspect,
          backgroundColor: item.artColor
            ? `${item.artColor}20`
            : isDarkMode
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(0,0,0,0.04)',
        }}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} className="h-full w-full rounded-xl" />
        ) : (
          <FileTypeIcon type={item.type} size={32} color={primaryColor} />
        )}
        {item.duration && (
          <View className="absolute bottom-1.5 right-1.5 flex-row items-center gap-0.5 rounded-md bg-black/70 px-1.5 py-0.5">
            <Play size={10} color="#ffffff" weight="fill" />
            <Text className="text-[10px] font-semibold text-white">
              {formatDuration(item.duration)}
            </Text>
          </View>
        )}
        {renderOverlay?.(item)}
      </View>
      {!hideName && (
        <Text
          className="mb-0.5 text-xs font-semibold"
          style={{ color: textColor }}
          numberOfLines={1}>
          {item.name}
        </Text>
      )}
      {!hideName &&
        (renderSubtitle
          ? renderSubtitle(item)
          : item.artist && (
              <Text className="text-[11px]" style={{ color: mutedColor }} numberOfLines={1}>
                {item.artist}
              </Text>
            ))}
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
  layoutSize: sizeProp,
  fileType,
  hideName,
  renderOverlay,
  renderSubtitle,
}: FileGridProps) {
  const { theme, isDarkMode } = useTheme();
  const sizeMode: LayoutSize = sizeProp || theme.sizeMode;

  const colCount = useMemo(() => {
    if (columns) return columns;
    if (sizeMode === 'small') return 4;
    if (sizeMode === 'big') return fileType === 'video' ? 1 : 2;
    if (fileType === 'video') return 3;
    return 3;
  }, [columns, sizeMode, fileType]);

  const itemAspect = useMemo(() => {
    if (sizeMode === 'small') return 0.8;
    if (sizeMode === 'big' && fileType === 'video') return 0.6;
    return 1;
  }, [sizeMode, fileType]);
  const keyExtractor = useCallback((item: FileItem) => item.uri, []);

  const renderItem = useCallback(
    ({ item }: { item: FileItem }) => (
      <GridItem
        item={item}
        onPress={onPress}
        primaryColor={primaryColor}
        textColor={textColor}
        mutedColor={mutedColor}
        isDarkMode={isDarkMode}
        columns={colCount}
        itemAspect={itemAspect}
        hideName={hideName}
        renderOverlay={renderOverlay}
        renderSubtitle={renderSubtitle}
      />
    ),
    [
      onPress,
      primaryColor,
      textColor,
      mutedColor,
      isDarkMode,
      colCount,
      itemAspect,
      hideName,
      renderOverlay,
      renderSubtitle,
    ]
  );

  const renderEmpty = useCallback(
    () => (
      <View className="items-center justify-center py-[100]">
        <MusicNote size={64} color={mutedColor} />
        <Text className="mt-4 text-base" style={{ color: mutedColor }}>
          {emptyMessage}
        </Text>
      </View>
    ),
    [mutedColor, emptyMessage]
  );

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={colCount}
      columnWrapperStyle={{ justifyContent: 'flex-start' }}
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
