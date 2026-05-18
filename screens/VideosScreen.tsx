import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { VideoCamera, MonitorPlay, CellSignalFull } from 'phosphor-react-native';
import { useFiles } from '../context/FileContext';
import { useTheme } from '../context/ThemeContext';
import { formatDuration, formatFileSize } from '../services/FileService';
import type { FileItem } from '../types';
import { TopBar } from '../components/TopBar';
import LayoutToggle from '../components/LayoutToggle';
import type { LayoutMode } from '../types';

const { width } = Dimensions.get('window');

export function VideosScreen() {
  const { videos } = useFiles();
  const navigation = useNavigation<any>();
  const { primaryColor, textColor, mutedColor } = useTheme();
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');

  const sortedVideos = useMemo(() => {
    return [...videos].sort((a, b) => (b.modifiedAt || 0) - (a.modifiedAt || 0));
  }, [videos]);

  const navigateToFile = (file: FileItem) => {
    navigation.navigate('VideoPlayer', { file });
  };

  const isLandscape = (item: FileItem) => {
    if (item.size) return true;
    return true;
  };

  const renderGridItem = ({ item }: { item: FileItem }) => {
    const landscape = isLandscape(item);
    return (
      <TouchableOpacity
        style={[styles.gridItem, landscape ? styles.landscapeGrid : styles.portraitGrid]}
        onPress={() => navigateToFile(item)}
      >
        <Image source={{ uri: item.thumbnail || item.uri }} style={styles.gridImage} />
        <View style={styles.gridOverlay}>
          {item.duration && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
            </View>
          )}
          <View style={styles.gridIconWrap}>
            <MonitorPlay size={16} color="#ffffff" weight="fill" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderListItem = ({ item }: { item: FileItem }) => (
    <TouchableOpacity style={styles.listItem} onPress={() => navigateToFile(item)}>
      <View style={styles.listThumbnailWrap}>
        <Image source={{ uri: item.thumbnail || item.uri }} style={styles.listThumbnail} />
        {item.duration && (
          <View style={styles.listDurationBadge}>
            <Text style={styles.listDurationText}>{formatDuration(item.duration)}</Text>
          </View>
        )}
      </View>
      <View style={styles.listItemInfo}>
        <Text style={[styles.listItemName, { color: textColor }]} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.listItemMeta}>
          {item.size && <Text style={[styles.listItemMetaText, { color: mutedColor }]}>{formatFileSize(item.size)}</Text>}
          {item.duration && (
            <>
              <Text style={[styles.listItemMetaSep, { color: mutedColor }]}>•</Text>
              <Text style={[styles.listItemMetaText, { color: mutedColor }]}>{formatDuration(item.duration)}</Text>
            </>
          )}
        </View>
      </View>
      <CellSignalFull size={14} color={mutedColor} weight={isLandscape(item) ? 'fill' : 'regular'} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: '#18181b' }]}>
      <TopBar />
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: textColor }]}>Videos</Text>
        <LayoutToggle mode={layoutMode} onChange={setLayoutMode} primaryColor={primaryColor} />
      </View>
      {layoutMode === 'grid' ? (
        <FlatList
          data={sortedVideos}
          renderItem={renderGridItem}
          keyExtractor={(item) => item.uri}
          numColumns={3}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <VideoCamera size={64} color={mutedColor} />
              <Text style={[styles.emptyText, { color: mutedColor }]}>No videos found</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={sortedVideos}
          renderItem={renderListItem}
          keyExtractor={(item) => item.uri}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <VideoCamera size={64} color={mutedColor} />
              <Text style={[styles.emptyText, { color: mutedColor }]}>No videos found</Text>
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
  gridContent: { paddingHorizontal: 4, paddingBottom: 120 },
  gridRow: { justifyContent: 'space-between', paddingHorizontal: 4 },
  gridItem: {
    flex: 1,
    margin: 4,
    borderRadius: 12,
    overflow: 'hidden',
    maxWidth: '33%',
  },
  landscapeGrid: { aspectRatio: 16 / 10 },
  portraitGrid: { aspectRatio: 9 / 16 },
  gridImage: { width: '100%', height: '100%' },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 6,
  },
  durationBadge: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  durationText: { color: '#ffffff', fontSize: 10, fontWeight: '600' },
  gridIconWrap: {
    backgroundColor: 'rgba(194, 252, 74, 0.8)',
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 120 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  listThumbnailWrap: { width: 100, height: 60, borderRadius: 10, overflow: 'hidden' },
  listThumbnail: { width: '100%', height: '100%' },
  listDurationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  listDurationText: { color: '#ffffff', fontSize: 9, fontWeight: '600' },
  listItemInfo: { flex: 1 },
  listItemName: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  listItemMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listItemMetaText: { fontSize: 12 },
  listItemMetaSep: { fontSize: 12 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100 },
  emptyText: { fontSize: 16, marginTop: 16 },
});
