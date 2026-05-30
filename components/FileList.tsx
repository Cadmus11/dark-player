import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { FileItem } from '../types';
import { MusicNote, VideoCamera, MicrophoneStage, CheckCircle } from 'phosphor-react-native';
import type { FileType } from '../types';
import { formatFileSize, formatDuration } from '../services/FileService';

interface FileListProps {
  data: FileItem[];
  onPress: (item: FileItem) => void;
  primaryColor: string;
  textColor: string;
  mutedColor: string;
  emptyMessage?: string;
  renderLeft?: (item: FileItem) => React.ReactNode;
  renderRight?: (item: FileItem) => React.ReactNode;
  renderMeta?: (item: FileItem) => React.ReactNode;
  selectionMode?: boolean;
  selectedUris?: Set<string>;
  onLongPress?: (item: FileItem) => void;
  onSelectionChange?: (uris: Set<string>) => void;
  scrollRef?: React.RefObject<any>;
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

function FileTypeIcon({ type, size, color }: { type?: FileType; size: number; color: string }) {
  const Icon = type === 'video' ? VideoCamera : MusicNote;
  return <Icon size={size} color={color} weight="fill" />;
}

const ListItem = memo(function ListItem({
  item,
  onPress,
  onLongPress,
  primaryColor,
  textColor,
  mutedColor,
  isSelected,
  renderLeft,
  renderRight,
  renderMeta,
}: {
  item: FileItem;
  onPress: (item: FileItem) => void;
  onLongPress?: (item: FileItem) => void;
  primaryColor: string;
  textColor: string;
  mutedColor: string;
  isSelected?: boolean;
  renderLeft?: (item: FileItem) => React.ReactNode;
  renderRight?: (item: FileItem) => React.ReactNode;
  renderMeta?: (item: FileItem) => React.ReactNode;
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center gap-3 px-1 py-2.5"
      style={isSelected ? { backgroundColor: `${primaryColor}10`, borderRadius: 10 } : undefined}
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress?.(item)}
      delayLongPress={400}>
      {isSelected && (
        <View
          className="h-[22] w-[22] items-center justify-center rounded-full"
          style={{ backgroundColor: primaryColor }}>
          <CheckCircle size={18} color="#ffffff" weight="fill" />
        </View>
      )}
      {renderLeft ? (
        renderLeft(item)
      ) : (
        <View
          className="h-11 w-11 items-center justify-center rounded-xl"
          style={{
            backgroundColor: item.artColor ? `${item.artColor}20` : 'rgba(194, 252, 74, 0.08)',
          }}>
          {item.thumbnail ? (
            <Image source={{ uri: item.thumbnail }} className="h-11 w-11 rounded-xl" />
          ) : (
            <FileTypeIcon type={item.type} size={20} color={primaryColor} />
          )}
        </View>
      )}
      <View className="flex-1">
        <Text
          className="mb-0.5 text-sm font-semibold"
          style={{ color: textColor }}
          numberOfLines={1}>
          {item.name}
        </Text>
        {renderMeta ? (
          renderMeta(item)
        ) : (
          <View className="flex-row items-center gap-1">
            {item.artist && (
              <Text className="text-xs font-medium" style={{ color: primaryColor }}>
                {item.artist}
              </Text>
            )}
            {!item.artist && item.size && (
              <Text className="text-xs" style={{ color: mutedColor }}>
                {formatFileSize(item.size)}
              </Text>
            )}
            {item.duration && (
              <>
                {item.artist ? (
                  <Text className="text-xs" style={{ color: mutedColor }}>
                    •
                  </Text>
                ) : null}
                <Text className="text-xs" style={{ color: mutedColor }}>
                  {formatDuration(item.duration)}
                </Text>
              </>
            )}
          </View>
        )}
      </View>
      {item.hasLyrics && (
        <View
          className="mr-1 h-5 w-5 items-center justify-center rounded-md"
          style={{ backgroundColor: `${primaryColor}20` }}>
          <MicrophoneStage size={12} color={primaryColor} weight="bold" />
        </View>
      )}
      {renderRight ? (
        renderRight(item)
      ) : (
        <Text className="text-xl" style={{ color: mutedColor }}>
          ›
        </Text>
      )}
    </TouchableOpacity>
  );
});

function FileList({
  data,
  onPress,
  primaryColor,
  textColor,
  mutedColor,
  emptyMessage = 'No items found',
  renderLeft,
  renderRight,
  renderMeta,
  selectionMode,
  selectedUris,
  onLongPress,
  onSelectionChange,
  scrollRef,
  onScroll,
}: FileListProps) {
  const keyExtractor = useCallback((item: FileItem) => item.uri, []);

  const renderItem = useCallback(
    ({ item }: { item: FileItem }) => (
      <ListItem
        item={item}
        onPress={
          selectionMode && onSelectionChange
            ? () => {
                const next = new Set(selectedUris);
                if (next.has(item.uri)) next.delete(item.uri);
                else next.add(item.uri);
                onSelectionChange(next);
              }
            : onPress
        }
        onLongPress={onLongPress}
        primaryColor={primaryColor}
        textColor={textColor}
        mutedColor={mutedColor}
        isSelected={selectedUris?.has(item.uri)}
        renderLeft={renderLeft}
        renderRight={renderRight}
        renderMeta={renderMeta}
      />
    ),
    [
      onPress,
      onLongPress,
      primaryColor,
      textColor,
      mutedColor,
      renderLeft,
      renderRight,
      renderMeta,
      selectionMode,
      selectedUris,
      onSelectionChange,
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
    <FlashList
      ref={scrollRef}
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={renderEmpty}
      onScroll={onScroll}
      scrollEventThrottle={16}
    />
  );
}

export default memo(FileList);
