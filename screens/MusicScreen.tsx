import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MusicNote, ListDashes, GridFour, MicrophoneStage } from 'phosphor-react-native';
import { useFiles } from '../context/FileContext';
import { useTheme } from '../context/ThemeContext';
import { formatFileSize, formatDuration } from '../services/FileService';
import type { FileItem } from '../types';
import { FileIcon } from '../components/FileIcon';
import { TopBar } from '../components/TopBar';
import LayoutToggle from '../components/LayoutToggle';
import type { LayoutMode } from '../types';

export function MusicScreen() {
  const { audio } = useFiles();
  const navigation = useNavigation<any>();
  const { primaryColor, textColor, mutedColor } = useTheme();
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('list');

  const sortedAudio = useMemo(() => {
    return [...audio].sort((a, b) => a.name.localeCompare(b.name));
  }, [audio]);

  const navigateToFile = (file: FileItem) => {
    navigation.navigate('MusicPlayer', { file, queue: sortedAudio });
  };

  const renderListItem = ({ item }: { item: FileItem }) => (
    <TouchableOpacity style={styles.listItem} onPress={() => navigateToFile(item)}>
      <View style={[styles.listItemArt, { backgroundColor: item.artColor ? `${item.artColor}20` : 'rgba(194, 252, 74, 0.08)' }]}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.listItemArtImage} />
        ) : (
          <MusicNote size={20} color={primaryColor} weight="fill" />
        )}
      </View>
      <View style={styles.listItemInfo}>
        <Text style={[styles.listItemName, { color: textColor }]} numberOfLines={1}>{item.name}</Text>
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
      </View>
      {item.hasLyrics && (
        <View style={[styles.lyricsBadge, { backgroundColor: `${primaryColor}20` }]}>
          <MicrophoneStage size={12} color={primaryColor} weight="bold" />
        </View>
      )}
      <Text style={[styles.chevron, { color: mutedColor }]}>›</Text>
    </TouchableOpacity>
  );

  const renderGridItem = ({ item }: { item: FileItem }) => (
    <TouchableOpacity style={styles.gridItem} onPress={() => navigateToFile(item)}>
      <View style={[styles.gridItemArt, { backgroundColor: item.artColor ? `${item.artColor}20` : 'rgba(194, 252, 74, 0.08)' }]}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.gridItemArtImage} />
        ) : (
          <MusicNote size={32} color={primaryColor} weight="fill" />
        )}
        {item.hasLyrics && (
          <View style={[styles.gridLyricsBadge, { backgroundColor: `${primaryColor}30` }]}>
            <MicrophoneStage size={10} color={primaryColor} weight="bold" />
          </View>
        )}
      </View>
      <Text style={[styles.gridItemName, { color: textColor }]} numberOfLines={1}>{item.name}</Text>
      {item.artist && (
        <Text style={[styles.gridItemArtist, { color: mutedColor }]} numberOfLines={1}>{item.artist}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: '#18181b' }]}>
      <TopBar />
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: textColor }]}>Music</Text>
        <LayoutToggle mode={layoutMode} onChange={setLayoutMode} primaryColor={primaryColor} />
      </View>
      {layoutMode === 'list' ? (
        <FlatList
          data={sortedAudio}
          renderItem={renderListItem}
          keyExtractor={(item) => item.uri}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MusicNote size={64} color={mutedColor} />
              <Text style={[styles.emptyText, { color: mutedColor }]}>No music found</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={sortedAudio}
          renderItem={renderGridItem}
          keyExtractor={(item) => item.uri}
          numColumns={3}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MusicNote size={64} color={mutedColor} />
              <Text style={[styles.emptyText, { color: mutedColor }]}>No music found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  title: { fontSize: 24, fontWeight: '800' },
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
  gridLyricsBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridItemName: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  gridItemArtist: { fontSize: 11 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100 },
  emptyText: { fontSize: 16, marginTop: 16 },
});
