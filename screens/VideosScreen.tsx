import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { VideoCamera, MonitorPlay, CellSignalFull, FunnelSimple, ArrowUp, ArrowDown } from 'phosphor-react-native';
import { useFiles } from '../context/FileContext';
import { useTheme } from '../context/ThemeContext';
import { formatDuration, formatFileSize } from '../services/FileService';
import type { FileItem, SortField, SortDirection } from '../types';
import { TopBar } from '../components/TopBar';
import LayoutToggle from '../components/LayoutToggle';
import type { LayoutMode } from '../types';

const { width } = Dimensions.get('window');

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: 'date', label: 'Date' },
  { field: 'name', label: 'Name' },
  { field: 'duration', label: 'Duration' },
  { field: 'size', label: 'Size' },
  { field: 'type', label: 'Type' },
];

export function VideosScreen() {
  const { videos } = useFiles();
  const navigation = useNavigation<any>();
  const { primaryColor, textColor, mutedColor } = useTheme();
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showSortModal, setShowSortModal] = useState(false);

  const toggleDirection = () => {
    setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
  };

  const sortedVideos = useMemo(() => {
    const arr = [...videos];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'date':
          cmp = (b.modifiedAt || 0) - (a.modifiedAt || 0);
          break;
        case 'duration':
          cmp = (b.duration || 0) - (a.duration || 0);
          break;
        case 'size':
          cmp = (b.size || 0) - (a.size || 0);
          break;
        case 'type':
          cmp = (a.mimeType || a.name.split('.').pop() || '').localeCompare(b.mimeType || b.name.split('.').pop() || '');
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [videos, sortField, sortDirection]);

  const currentSortLabel = SORT_OPTIONS.find((o) => o.field === sortField)?.label || 'Date';

  const navigateToFile = (file: FileItem) => {
    navigation.navigate('VideoPlayer', { file });
  };

  const isLandscape = (_item: FileItem) => true;

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
          {item.mimeType && (
            <>
              <Text style={[styles.listItemMetaSep, { color: mutedColor }]}>•</Text>
              <Text style={[styles.listItemMetaText, { color: mutedColor }]}>{item.mimeType.split('/').pop()}</Text>
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
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSortModal(true)}>
            <FunnelSimple size={16} color={mutedColor} />
            <Text style={[styles.sortBtnText, { color: mutedColor }]}>{currentSortLabel}</Text>
            {sortDirection === 'asc' ? (
              <ArrowUp size={14} color={mutedColor} />
            ) : (
              <ArrowDown size={14} color={mutedColor} />
            )}
          </TouchableOpacity>
          <LayoutToggle mode={layoutMode} onChange={setLayoutMode} primaryColor={primaryColor} />
        </View>
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
          windowSize={5}
          maxToRenderPerBatch={9}
          removeClippedSubviews
          initialNumToRender={6}
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
          windowSize={7}
          maxToRenderPerBatch={10}
          removeClippedSubviews
          initialNumToRender={8}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <VideoCamera size={64} color={mutedColor} />
              <Text style={[styles.emptyText, { color: mutedColor }]}>No videos found</Text>
            </View>
          }
        />
      )}

      <Modal visible={showSortModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowSortModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: '#27272a' }]}>
            <Text style={[styles.modalTitle, { color: '#ffffff' }]}>Sort by</Text>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.field}
                style={[
                  styles.modalOption,
                  sortField === opt.field && { backgroundColor: `${primaryColor}15` },
                ]}
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
                <Text style={[
                  styles.modalOptionText,
                  { color: sortField === opt.field ? primaryColor : '#e4e4e7' },
                  sortField === opt.field && { fontWeight: '700' },
                ]}>
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  sortBtnText: { fontSize: 11, fontWeight: '600' },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { borderRadius: 24, padding: 24, width: '80%', maxWidth: 320 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8 },
  modalOptionText: { fontSize: 16, fontWeight: '500' },
});
