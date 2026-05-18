import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MusicNote, ListDashes, GridFour, MicrophoneStage, ArrowDown, ArrowUp, FunnelSimple } from 'phosphor-react-native';
import { useFiles } from '../context/FileContext';
import { useTheme } from '../context/ThemeContext';
import { formatFileSize, formatDuration } from '../services/FileService';
import type { FileItem, SortField, SortDirection } from '../types';
import { FileIcon } from '../components/FileIcon';
import { TopBar } from '../components/TopBar';
import LayoutToggle from '../components/LayoutToggle';
import type { LayoutMode } from '../types';

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: 'name', label: 'Name' },
  { field: 'date', label: 'Date' },
  { field: 'artist', label: 'Artist' },
  { field: 'duration', label: 'Duration' },
  { field: 'size', label: 'Size' },
];

export function MusicScreen() {
  const { audio } = useFiles();
  const navigation = useNavigation<any>();
  const { primaryColor, textColor, mutedColor } = useTheme();
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('list');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showSortModal, setShowSortModal] = useState(false);

  const toggleDirection = () => {
    setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
  };

  const sortedAudio = useMemo(() => {
    const arr = [...audio];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'date':
          cmp = (b.modifiedAt || 0) - (a.modifiedAt || 0);
          break;
        case 'artist':
          cmp = (a.artist || '').localeCompare(b.artist || '');
          break;
        case 'duration':
          cmp = (b.duration || 0) - (a.duration || 0);
          break;
        case 'size':
          cmp = (b.size || 0) - (a.size || 0);
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [audio, sortField, sortDirection]);

  const currentSortLabel = SORT_OPTIONS.find((o) => o.field === sortField)?.label || 'Name';

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
      {layoutMode === 'list' ? (
        <FlatList
          data={sortedAudio}
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
          windowSize={7}
          maxToRenderPerBatch={10}
          removeClippedSubviews
          initialNumToRender={6}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MusicNote size={64} color={mutedColor} />
              <Text style={[styles.emptyText, { color: mutedColor }]}>No music found</Text>
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { borderRadius: 24, padding: 24, width: '80%', maxWidth: 320 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8 },
  modalOptionText: { fontSize: 16, fontWeight: '500' },
});
