import React, { memo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import type { FileItem } from '../types';
import { MusicNote, FileText, Image as PhosphorImage, VideoCamera, MicrophoneStage, CheckCircle } from 'phosphor-react-native';
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
  const Icon = type === 'document' ? FileText :
    type === 'image' ? PhosphorImage :
    type === 'video' ? VideoCamera :
    MusicNote;
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
      style={[styles.listItem, isSelected && { backgroundColor: `${primaryColor}10`, borderRadius: 10 }]}
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress?.(item)}
      delayLongPress={400}
    >
      {isSelected && (
        <View style={[styles.checkCircle, { backgroundColor: primaryColor }]}>
          <CheckCircle size={18} color="#ffffff" weight="fill" />
        </View>
      )}
      {renderLeft ? renderLeft(item) : (
        <View style={[styles.listItemArt, { backgroundColor: item.artColor ? `${item.artColor}20` : 'rgba(194, 252, 74, 0.08)' }]}>
          {item.thumbnail ? (
            <Image source={{ uri: item.thumbnail }} style={styles.listItemArtImage} />
          ) : (
            <FileTypeIcon type={item.type} size={20} color={primaryColor} />
          )}
        </View>
      )}
      <View style={styles.listItemInfo}>
        <Text style={[styles.listItemName, { color: textColor }]} numberOfLines={1}>{item.name}</Text>
        {renderMeta ? renderMeta(item) : (
          <View style={styles.listItemMeta}>
            {item.artist && <Text style={[styles.listItemArtist, { color: primaryColor }]}>{item.artist}</Text>}
            {!item.artist && item.size && <Text style={[styles.listItemMetaText, { color: mutedColor }]}>{formatFileSize(item.size)}</Text>}
            {item.duration && (
              <>
                {item.artist ? <Text style={[styles.listItemMetaSeparator, { color: mutedColor }]}>•</Text> : null}
                <Text style={[styles.listItemMetaText, { color: mutedColor }]}>{formatDuration(item.duration)}</Text>
              </>
            )}
          </View>
        )}
      </View>
      {item.hasLyrics && (
        <View style={[styles.lyricsBadge, { backgroundColor: `${primaryColor}20` }]}>
          <MicrophoneStage size={12} color={primaryColor} weight="bold" />
        </View>
      )}
      {renderRight ? renderRight(item) : <Text style={[styles.chevron, { color: mutedColor }]}>›</Text>}
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

  const renderItem = useCallback(({ item }: { item: FileItem }) => (
    <ListItem
      item={item}
      onPress={selectionMode && onSelectionChange ? () => {
        const next = new Set(selectedUris);
        if (next.has(item.uri)) next.delete(item.uri);
        else next.add(item.uri);
        onSelectionChange(next);
      } : onPress}
      onLongPress={onLongPress}
      primaryColor={primaryColor}
      textColor={textColor}
      mutedColor={mutedColor}
      isSelected={selectedUris?.has(item.uri)}
      renderLeft={renderLeft}
      renderRight={renderRight}
      renderMeta={renderMeta}
    />
  ), [onPress, onLongPress, primaryColor, textColor, mutedColor, renderLeft, renderRight, renderMeta, selectionMode, selectedUris, onSelectionChange]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <MusicNote size={64} color={mutedColor} />
      <Text style={[styles.emptyText, { color: mutedColor }]}>{emptyMessage}</Text>
    </View>
  ), [mutedColor, emptyMessage]);

  return (
    <FlatList
      ref={scrollRef}
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={renderEmpty}
      onScroll={onScroll}
      scrollEventThrottle={16}
      removeClippedSubviews
      windowSize={7}
      maxToRenderPerBatch={10}
      initialNumToRender={15}
    />
  );
}

export default memo(FileList);

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: 16, paddingBottom: 120 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 12,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItemArt: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItemArtImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  listItemInfo: { flex: 1 },
  listItemName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  listItemArtist: { fontSize: 12, fontWeight: '500' },
  listItemMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listItemMetaText: { fontSize: 12 },
  listItemMetaSeparator: { fontSize: 12 },
  lyricsBadge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  chevron: { fontSize: 20 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100 },
  emptyText: { fontSize: 16, marginTop: 16 },
});
