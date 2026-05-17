import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useFiles } from '../context/FileContext';
import { getDocIcon, formatFileSize } from '../services/FileService';
import type { DocCategory, DocumentSubType, FileItem } from '../types';

type DocumentsScreenProps = NativeStackScreenProps<RootStackParamList, 'Documents'>;

export function DocumentsScreen({ navigation }: DocumentsScreenProps) {
  const { docCategories, pdfFiles, wordFiles, excelFiles, pptFiles, textFiles } = useFiles();

  const getFilesForCategory = (cat: DocCategory): FileItem[] => {
    switch (cat.subType) {
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
      default:
        return [];
    }
  };

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
      <View style={[styles.categoryIconBg, { backgroundColor: item.color + '20' }]}>
        <Text style={styles.categoryIcon}>{item.icon}</Text>
      </View>
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryName}>{item.name}</Text>
        <Text style={styles.categoryCount}>{item.count} file{item.count !== 1 ? 's' : ''}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  const renderFileItem = ({ item }: { item: FileItem }) => (
    <TouchableOpacity style={styles.fileItem} onPress={() => navigateToFile(item)}>
      <View style={[styles.fileIconBg, { backgroundColor: (item.docSubType ? docCategories.find((c) => c.subType === item.docSubType)?.color : '#999') + '20' }]}>
        <Text style={styles.fileIcon}>{getDocIcon(item.docSubType || 'other')}</Text>
      </View>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.fileMeta}>
          {item.size && <Text style={styles.fileMetaText}>{formatFileSize(item.size)}</Text>}
          {item.docSubType && (
            <>
              <Text style={styles.fileMetaSeparator}>•</Text>
              <Text style={styles.fileMetaText}>{item.docSubType.toUpperCase()}</Text>
            </>
          )}
        </View>
      </View>
      <Text style={styles.fileChevron}>›</Text>
    </TouchableOpacity>
  );

  const allDocs = [...pdfFiles, ...wordFiles, ...excelFiles, ...pptFiles, ...textFiles].sort(
    (a, b) => (b.modifiedAt || 0) - (a.modifiedAt || 0)
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Documents</Text>
        <View style={{ width: 44 }} />
      </View>

      <FlatList
        data={[...docCategories, ...(allDocs.length > 0 ? [{ id: 'divider', name: '', icon: '', ext: [], subType: 'other' as DocumentSubType, count: 0, color: '' }] : []), ...allDocs] as (DocCategory | FileItem)[]}
        renderItem={({ item }: { item: DocCategory | FileItem }) => {
          if ('id' in item && (item as DocCategory).id === 'divider') {
            return <View style={styles.divider}><Text style={styles.dividerText}>All Documents</Text></View>;
          }
          if ('type' in item) {
            return renderFileItem({ item: item as FileItem });
          }
          return renderCategoryCard({ item: item as DocCategory });
        }}
        keyExtractor={(item, index) => ('id' in item ? item.id : (item as FileItem).uri) + index.toString()}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📄</Text>
            <Text style={styles.emptyText}>No documents found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#06060B' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 24, color: '#ffffff' },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#ffffff' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  categoryIconBg: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIcon: { fontSize: 26 },
  categoryInfo: { flex: 1, marginLeft: 14 },
  categoryName: { fontSize: 17, fontWeight: '600', color: '#ffffff', marginBottom: 4 },
  categoryCount: { fontSize: 13, color: 'rgba(255, 255, 255, 0.5)' },
  chevron: { fontSize: 22, color: 'rgba(255, 255, 255, 0.3)' },
  divider: { paddingVertical: 20 },
  dividerText: { fontSize: 14, color: 'rgba(255, 255, 255, 0.4)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1 },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  fileIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileIcon: { fontSize: 22 },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 15, color: '#ffffff', marginBottom: 4 },
  fileMeta: { flexDirection: 'row', alignItems: 'center' },
  fileMetaText: { fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' },
  fileMetaSeparator: { fontSize: 12, color: 'rgba(255, 255, 255, 0.3)', marginHorizontal: 6 },
  fileChevron: { fontSize: 20, color: 'rgba(255, 255, 255, 0.3)' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100 },
  emptyIcon: { fontSize: 64, marginBottom: 16, opacity: 0.5 },
  emptyText: { fontSize: 16, color: 'rgba(255, 255, 255, 0.5)' },
});
