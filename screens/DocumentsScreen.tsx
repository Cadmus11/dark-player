import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FileText, BookOpen, FunnelSimple, ArrowUp, ArrowDown } from 'phosphor-react-native';
import { useFiles } from '../context/FileContext';
import { useTheme } from '../context/ThemeContext';
import { formatFileSize } from '../services/FileService';
import { Sorting } from '../services/Sorting';
import type { DocCategory, FileItem, SortField, SortDirection } from '../types';
import { FileIcon } from '../components/FileIcon';
import { ScreenLayout } from '../components/ScreenLayout';

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: 'name', label: 'Name' },
  { field: 'date', label: 'Date' },
  { field: 'newest', label: 'Newest' },
  { field: 'size', label: 'Size' },
  { field: 'type', label: 'Type' },
];

export function DocumentsScreen() {
  const { docCategories, pdfFiles, wordFiles, excelFiles, pptFiles, textFiles, epubFiles, otherDocs } = useFiles();
  const { primaryColor, textColor, mutedColor } = useTheme();
  const navigation = useNavigation<any>();
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showSortModal, setShowSortModal] = useState(false);

  const toggleDirection = useCallback(() => {
    setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
  }, []);

  const navigateToDocSubType = (cat: DocCategory) => {
    navigation.navigate('Category', {
      type: 'document',
      title: cat.name,
      icon: cat.icon,
      subType: cat.subType,
    });
  };

  const navigateToFile = (file: FileItem) => {
    navigation.navigate('DocumentViewer', { file });
  };

  const renderCategoryCard = ({ item }: { item: DocCategory }) => (
    <TouchableOpacity style={styles.categoryCard} onPress={() => navigateToDocSubType(item)}>
      <View style={[styles.categoryIconBg, { backgroundColor: item.color + '15' }]}>
        {item.subType === 'epub' ? (
          <BookOpen size={26} color={item.color} weight="bold" />
        ) : (
          <FileIcon docSubType={item.subType} size={26} color={item.color} />
        )}
      </View>
      <View style={styles.categoryInfo}>
        <Text style={[styles.categoryName, { color: textColor }]}>{item.name}</Text>
        <Text style={[styles.categoryCount, { color: mutedColor }]}>{item.count} file{item.count !== 1 ? 's' : ''}</Text>
      </View>
      <Text style={[styles.chevron, { color: mutedColor }]}>›</Text>
    </TouchableOpacity>
  );

  const renderFileItem = ({ item }: { item: FileItem }) => (
    <TouchableOpacity style={styles.fileItem} onPress={() => navigateToFile(item)}>
      <View style={[styles.fileIconBg, { backgroundColor: (item.docSubType ? docCategories.find((c) => c.subType === item.docSubType)?.color : '#999') + '15' }]}>
        {item.docSubType === 'epub' ? (
          <BookOpen size={22} color={docCategories.find((c) => c.subType === 'epub')?.color || '#f39c12'} weight="bold" />
        ) : (
          <FileIcon docSubType={item.docSubType} size={22} />
        )}
      </View>
      <View style={styles.fileInfo}>
        <Text style={[styles.fileName, { color: textColor }]} numberOfLines={1}>{item.name}</Text>
        <View style={styles.fileMeta}>
          {item.size && <Text style={[styles.fileMetaText, { color: mutedColor }]}>{formatFileSize(item.size)}</Text>}
          {item.docSubType && (
            <>
              <Text style={[styles.fileMetaSeparator, { color: mutedColor }]}>•</Text>
              <Text style={[styles.fileMetaText, { color: mutedColor }]}>{item.docSubType.toUpperCase()}</Text>
            </>
          )}
        </View>
      </View>
      <Text style={[styles.fileChevron, { color: mutedColor }]}>›</Text>
    </TouchableOpacity>
  );

  const allDocs = useMemo(() => {
    const all = [...pdfFiles, ...wordFiles, ...excelFiles, ...pptFiles, ...textFiles, ...epubFiles, ...otherDocs];
    return Sorting.sort(all, sortField, sortDirection);
  }, [pdfFiles, wordFiles, excelFiles, pptFiles, textFiles, epubFiles, otherDocs, sortField, sortDirection]);

  const flatData = useMemo(() => {
    const items: any[] = docCategories;
    if (allDocs.length > 0) {
      items.push({ id: 'divider', isDivider: true });
      for (const doc of allDocs) items.push(doc);
    }
    return items;
  }, [docCategories, allDocs]);

  const currentSortLabel = SORT_OPTIONS.find((o) => o.field === sortField)?.label || 'Date';

  const renderSortModal = useMemo(() => (
    <Modal visible={showSortModal} transparent animationType="fade">
      <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowSortModal(false)}>
        <View style={[styles.modalContent, { backgroundColor: '#27272a' }]}>
          <Text style={[styles.modalTitle, { color: '#ffffff' }]}>Sort by</Text>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.field}
              style={[styles.modalOption, sortField === opt.field && { backgroundColor: `${primaryColor}15` }]}
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
              <Text style={[styles.modalOptionText, { color: sortField === opt.field ? primaryColor : '#e4e4e7' }, sortField === opt.field && { fontWeight: '700' }]}>
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
  ), [showSortModal, sortField, sortDirection, primaryColor, toggleDirection]);

  return (
    <ScreenLayout>
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>Documents</Text>
        <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSortModal(true)}>
          <FunnelSimple size={16} color={mutedColor} />
          <Text style={[styles.sortBtnText, { color: mutedColor }]}>{currentSortLabel}</Text>
          {sortDirection === 'asc' ? (
            <ArrowUp size={14} color={mutedColor} />
          ) : (
            <ArrowDown size={14} color={mutedColor} />
          )}
        </TouchableOpacity>
      </View>
      <FlatList
        data={flatData as any}
        renderItem={({ item }: any) => {
          if (item.isDivider) {
            return (
              <View style={styles.divider}>
                <Text style={[styles.dividerText, { color: mutedColor }]}>All Documents</Text>
              </View>
            );
          }
          if (item.uri) {
            return renderFileItem({ item: item as FileItem });
          }
          return renderCategoryCard({ item: item as DocCategory });
        }}
        keyExtractor={(item: any) => item.isDivider ? 'divider' : item.id || item.uri}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        windowSize={7}
        maxToRenderPerBatch={10}
        removeClippedSubviews
        initialNumToRender={8}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FileText size={64} color={mutedColor} />
            <Text style={[styles.emptyText, { color: mutedColor }]}>No documents found</Text>
          </View>
        }
      />
      {renderSortModal}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#ffffff' },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#27272a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  sortBtnText: { fontSize: 13, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: 280,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  modalOptionText: { fontSize: 15 },
  content: { paddingHorizontal: 16, paddingBottom: 120 },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  categoryIconBg: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryInfo: { flex: 1, marginLeft: 14 },
  categoryName: { fontSize: 16, fontWeight: '700', marginBottom: 3 },
  categoryCount: { fontSize: 13 },
  chevron: { fontSize: 22 },
  divider: { paddingVertical: 18 },
  dividerText: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  fileIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '600', marginBottom: 3 },
  fileMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fileMetaText: { fontSize: 12 },
  fileMetaSeparator: { fontSize: 12 },
  fileChevron: { fontSize: 20 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100 },
  emptyText: { fontSize: 16, marginTop: 16 },
});
