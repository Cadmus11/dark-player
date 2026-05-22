import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { CaretLeft, FunnelSimple, ArrowUp, ArrowDown, Image as ImageIcon, VideoCamera, MusicNote, FileText, FilePdf, FileDoc, FileXls, FilePpt, FileTxt } from 'phosphor-react-native';
import { useFiles } from '../context/FileContext';
import { formatFileSize, formatDuration } from '../services/FileService';
import { ScreenLayout } from '../components/ScreenLayout';
import { FileIcon } from '../components/FileIcon';
import { Sorting } from '../services/Sorting';
import type { FileItem, DocumentSubType, SortField, SortDirection } from '../types';

type CategoryScreenProps = NativeStackScreenProps<RootStackParamList, 'Category'>;

const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  images: ImageIcon,
  videos: VideoCamera,
  music: MusicNote,
  audio: MusicNote,
  documents: FileText,
  document: FileText,
  pdf: FilePdf,
  word: FileDoc,
  excel: FileXls,
  powerpoint: FilePpt,
  text: FileTxt,
};

export function CategoryScreen({ navigation, route }: CategoryScreenProps) {
  const { type, title, icon, subType } = route.params;
  const { images, videos, audio, pdfFiles, wordFiles, excelFiles, pptFiles, textFiles, epubFiles, otherDocs } = useFiles();

  const CategoryIcon = CATEGORY_ICON_MAP[type] || CATEGORY_ICON_MAP[icon] || FileText;

  const files = (() => {
    switch (type) {
      case 'image':
        return images;
      case 'video':
        return videos;
      case 'audio':
        return audio;
      case 'document':
        switch (subType as DocumentSubType) {
          case 'pdf':
            return pdfFiles;
          case 'word':
            return wordFiles;
          case 'excel':
            return excelFiles;
          case 'powerpoint':
            return pptFiles;
          case 'text':
            return textFiles;
          case 'epub':
            return epubFiles;
          case 'other':
            return otherDocs;
          default:
            return [];
        }
      default:
        return [];
    }
  })();

  const IMAGE_SORT_OPTIONS: { field: SortField; label: string }[] = [
    { field: 'name', label: 'Name' },
    { field: 'date', label: 'Date' },
    { field: 'size', label: 'Size' },
    { field: 'newest', label: 'Newest' },
  ];

  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showSortModal, setShowSortModal] = useState(false);

  const toggleDirection = useCallback(() => {
    setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
  }, []);

  const currentSortLabel = useMemo(
    () => IMAGE_SORT_OPTIONS.find((o) => o.field === sortField)?.label ?? 'Name',
    [sortField]
  );

  const sortedFiles = useMemo(() => {
    if (type !== 'image') return files;
    return Sorting.sort(files, sortField, sortDirection);
  }, [files, sortField, sortDirection, type]);

  const navigateToFile = (file: FileItem) => {
    switch (type) {
      case 'image':
        navigation.navigate('ImageViewer', { file });
        break;
      case 'video':
        navigation.navigate('VideoPlayer', { file });
        break;
      case 'audio':
        navigation.navigate('MusicPlayer', { file });
        break;
      case 'document':
        navigation.navigate('DocumentViewer', { file });
        break;
    }
  };

  const renderImageItem = ({ item }: { item: FileItem }) => (
    <TouchableOpacity style={styles.imageItem} onPress={() => navigateToFile(item)}>
      <Image source={{ uri: item.uri }} style={styles.imageThumbnail} />
      {item.duration && (
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderListItem = ({ item }: { item: FileItem }) => (
    <TouchableOpacity style={styles.listItem} onPress={() => navigateToFile(item)}>
      <View style={styles.listItemLeft}>
        <View
          style={[
            styles.listItemIcon,
            type === 'document' && item.docSubType
              ? { backgroundColor: getDocSubTypeColor(item.docSubType) + '20' }
              : {},
          ]}
        >
          <FileIcon type={item.type} docSubType={item.docSubType} size={22} />
        </View>
        <View style={styles.listItemInfo}>
          <Text style={styles.listItemName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.listItemMeta}>
            {item.size && (
              <Text style={styles.listItemMetaText}>{formatFileSize(item.size)}</Text>
            )}
            {item.duration && (
              <>
                <Text style={styles.listItemMetaSeparator}>•</Text>
                <Text style={styles.listItemMetaText}>{formatDuration(item.duration)}</Text>
              </>
            )}
            {item.docSubType && (
              <>
                <Text style={styles.listItemMetaSeparator}>•</Text>
                <Text style={[styles.listItemMetaText, { color: getDocSubTypeColor(item.docSubType) }]}>
                  {item.docSubType.toUpperCase()}
                </Text>
              </>
            )}
          </View>
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  if (type === 'image') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <CaretLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <CategoryIcon size={20} color="#ffffff" />
            <Text style={styles.headerTitle}> {title}</Text>
          </View>
          <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSortModal(true)}>
            <FunnelSimple size={16} color="rgba(255, 255, 255, 0.7)" />
            <Text style={[styles.sortBtnText, { color: 'rgba(255, 255, 255, 0.7)' }]}>{currentSortLabel}</Text>
            {sortDirection === 'asc' ? <ArrowUp size={14} color="rgba(255, 255, 255, 0.7)" /> : <ArrowDown size={14} color="rgba(255, 255, 255, 0.7)" />}
          </TouchableOpacity>
        </View>
        <FlatList
          data={sortedFiles}
          renderItem={renderImageItem}
          keyExtractor={(item) => item.uri}
          numColumns={3}
          contentContainerStyle={styles.imageGrid}
          showsVerticalScrollIndicator={false}
          windowSize={5}
          maxToRenderPerBatch={9}
          removeClippedSubviews
          initialNumToRender={9}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CategoryIcon size={64} color="rgba(255, 255, 255, 0.5)" />
              <Text style={styles.emptyText}>No {title.toLowerCase()} found</Text>
            </View>
          }
        />
        <Modal visible={showSortModal} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowSortModal(false)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Sort by</Text>
              {IMAGE_SORT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.field}
                  style={[styles.modalOption, sortField === opt.field && { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]}
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
                  <Text style={[styles.modalOptionText, { color: sortField === opt.field ? '#ffffff' : 'rgba(255, 255, 255, 0.7)' }, sortField === opt.field && { fontWeight: '700' }]}>
                    {opt.label}
                  </Text>
                  {sortField === opt.field && (
                    sortDirection === 'asc' ? <ArrowUp size={18} color="#ffffff" /> : <ArrowDown size={18} color="#ffffff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }

  return (
    <ScreenLayout noTopBar>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <CaretLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <CategoryIcon size={20} color="#ffffff" />
          <Text style={styles.headerTitle}> {title}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>
      <FlatList
        data={files}
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
            <CategoryIcon size={64} color="rgba(255, 255, 255, 0.5)" />
            <Text style={styles.emptyText}>No {title.toLowerCase()} found</Text>
          </View>
        }
      />
    </ScreenLayout>
  );
}

function getDocSubTypeColor(subType: string): string {
  switch (subType) {
    case 'pdf':
      return '#e74c3c';
    case 'word':
      return '#3498db';
    case 'excel':
      return '#27ae60';
    case 'powerpoint':
      return '#f39c12';
    case 'text':
      return '#9b59b6';
    case 'epub':
      return '#e67e22';
    default:
      return '#999';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center' },
  backButton: { padding: 10 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#ffffff' },
  imageGrid: { padding: 4 },
  imageItem: {
    flex: 1 / 3,
    aspectRatio: 1,
    margin: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  imageThumbnail: { width: '100%', height: '100%' },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: { color: '#ffffff', fontSize: 10 },
  listContent: { paddingHorizontal: 20 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  listItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  listItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listItemInfo: { flex: 1 },
  listItemName: { fontSize: 15, color: '#ffffff', marginBottom: 4 },
  listItemMeta: { flexDirection: 'row', alignItems: 'center' },
  listItemMetaText: { fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' },
  listItemMetaSeparator: { fontSize: 12, color: 'rgba(255, 255, 255, 0.3)', marginHorizontal: 6 },
  chevron: { fontSize: 20, color: 'rgba(255, 255, 255, 0.3)' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100 },
  emptyText: { fontSize: 16, color: 'rgba(255, 255, 255, 0.5)', marginTop: 16 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.08)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4 },
  sortBtnText: { fontSize: 11, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { borderRadius: 24, padding: 24, width: '80%', maxWidth: 320, backgroundColor: '#27272a' },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16, textAlign: 'center', color: '#ffffff' },
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8 },
  modalOptionText: { fontSize: 16, fontWeight: '500' },
});
