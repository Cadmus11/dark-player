import React, { memo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native';
import type { FileItem } from '../types';
import { MusicNote, MicrophoneStage } from 'phosphor-react-native';
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
}

const ListItem = memo(function ListItem({
  item,
  onPress,
  primaryColor,
  textColor,
  mutedColor,
  renderLeft,
  renderRight,
  renderMeta,
}: {
  item: FileItem;
  onPress: (item: FileItem) => void;
  primaryColor: string;
  textColor: string;
  mutedColor: string;
  renderLeft?: (item: FileItem) => React.ReactNode;
  renderRight?: (item: FileItem) => React.ReactNode;
  renderMeta?: (item: FileItem) => React.ReactNode;
}) {
  return (
    <TouchableOpacity style={styles.listItem} onPress={() => onPress(item)}>
      {renderLeft ? renderLeft(item) : (
        <View style={[styles.listItemArt, { backgroundColor: item.artColor ? `${item.artColor}20` : 'rgba(194, 252, 74, 0.08)' }]}>
          {item.thumbnail ? (
            <Image source={{ uri: item.thumbnail }} style={styles.listItemArtImage} />
          ) : (
            <MusicNote size={20} color={primaryColor} weight="fill" />
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
}: FileListProps) {
  const keyExtractor = useCallback((item: FileItem) => item.uri, []);

  const renderItem = useCallback(({ item }: { item: FileItem }) => (
    <ListItem
      item={item}
      onPress={onPress}
      primaryColor={primaryColor}
      textColor={textColor}
      mutedColor={mutedColor}
      renderLeft={renderLeft}
      renderRight={renderRight}
      renderMeta={renderMeta}
    />
  ), [onPress, primaryColor, textColor, mutedColor, renderLeft, renderRight, renderMeta]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <MusicNote size={64} color={mutedColor} />
      <Text style={[styles.emptyText, { color: mutedColor }]}>{emptyMessage}</Text>
    </View>
  ), [mutedColor, emptyMessage]);

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={renderEmpty}
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
    gap: 12,
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
