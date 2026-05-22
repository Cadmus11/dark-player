import React, { memo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native';
import type { FileItem } from '../types';
import { MusicNote, FileText, Image as PhosphorImage, VideoCamera, Play } from 'phosphor-react-native';
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
  renderOverlay?: (item: FileItem) => React.ReactNode;
  renderSubtitle?: (item: FileItem) => React.ReactNode;
}

function FileTypeIcon({ type, size, color }: { type?: FileType; size: number; color: string }) {
  const Icon = type === 'document' ? FileText :
    type === 'image' ? PhosphorImage :
    type === 'video' ? VideoCamera :
    MusicNote;
  return <Icon size={size} color={color} weight="fill" />;
}

const GridItem = memo(function GridItem({
  item,
  onPress,
  primaryColor,
  textColor,
  mutedColor,
  renderOverlay,
  renderSubtitle,
}: {
  item: FileItem;
  onPress: (item: FileItem) => void;
  primaryColor: string;
  textColor: string;
  mutedColor: string;
  renderOverlay?: (item: FileItem) => React.ReactNode;
  renderSubtitle?: (item: FileItem) => React.ReactNode;
}) {
  return (
    <TouchableOpacity style={styles.gridItem} onPress={() => onPress(item)}>
      <View style={[styles.gridItemArt, { backgroundColor: item.artColor ? `${item.artColor}20` : 'rgba(194, 252, 74, 0.08)' }]}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.gridItemArtImage} />
        ) : (
          <FileTypeIcon type={item.type} size={32} color={primaryColor} />
        )}
        {item.duration && (
          <View style={styles.gridDurationBadge}>
            <Play size={10} color="#ffffff" weight="fill" />
            <Text style={styles.gridDurationText}>{formatDuration(item.duration)}</Text>
          </View>
        )}
        {renderOverlay?.(item)}
      </View>
      <Text style={[styles.gridItemName, { color: textColor }]} numberOfLines={1}>{item.name}</Text>
      {renderSubtitle ? renderSubtitle(item) : item.artist && (
        <Text style={[styles.gridItemArtist, { color: mutedColor }]} numberOfLines={1}>{item.artist}</Text>
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
  columns = 3,
  renderOverlay,
  renderSubtitle,
}: FileGridProps) {
  const keyExtractor = useCallback((item: FileItem) => item.uri, []);

  const renderItem = useCallback(({ item }: { item: FileItem }) => (
    <GridItem
      item={item}
      onPress={onPress}
      primaryColor={primaryColor}
      textColor={textColor}
      mutedColor={mutedColor}
      renderOverlay={renderOverlay}
      renderSubtitle={renderSubtitle}
    />
  ), [onPress, primaryColor, textColor, mutedColor, renderOverlay, renderSubtitle]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <FileText size={64} color={mutedColor} />
      <Text style={[styles.emptyText, { color: mutedColor }]}>{emptyMessage}</Text>
    </View>
  ), [mutedColor, emptyMessage]);

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={columns}
      columnWrapperStyle={styles.gridRow}
      contentContainerStyle={styles.gridContent}
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

const styles = StyleSheet.create({
  gridContent: { paddingHorizontal: 8, paddingBottom: 120 },
  gridRow: { justifyContent: 'space-between', paddingHorizontal: 4 },
  gridItem: {
    flex: 1,
    margin: 6,
    maxWidth: '33%',
  },
  gridItemArt: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridItemArtImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  gridDurationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  gridDurationText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
  },
  gridItemName: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  gridItemArtist: { fontSize: 11 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100 },
  emptyText: { fontSize: 16, marginTop: 16 },
});
