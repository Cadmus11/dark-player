import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FileText, BookOpen } from 'phosphor-react-native';
import { useFiles } from '../context/FileContext';
import { useTheme } from '../context/ThemeContext';
import { formatFileSize } from '../services/FileService';
import type { DocCategory, FileItem } from '../types';
import { FileIcon } from '../components/FileIcon';
import { TopBar } from '../components/TopBar';

export function DocumentsScreen() {
  const { docCategories, pdfFiles, wordFiles, excelFiles, pptFiles, textFiles, epubFiles, otherDocs } = useFiles();
  const { textColor, mutedColor } = useTheme();
  const navigation = useNavigation<any>();

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

  const allDocs = [...pdfFiles, ...wordFiles, ...excelFiles, ...pptFiles, ...textFiles, ...epubFiles, ...otherDocs].sort(
    (a, b) => (b.modifiedAt || 0) - (a.modifiedAt || 0)
  );

  return (
    <View style={[styles.container, { backgroundColor: '#18181b' }]}>
      <TopBar />
      <FlatList
        data={[...docCategories, ...(allDocs.length > 0 ? [{ id: 'divider', name: '', icon: '', ext: [], subType: 'other' as any, count: 0, color: '' }] : []), ...allDocs] as (DocCategory | FileItem)[]}
        renderItem={({ item }) => {
          if ('id' in item && (item as DocCategory).id === 'divider') {
            return <View style={styles.divider}><Text style={[styles.dividerText, { color: mutedColor }]}>All Documents</Text></View>;
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
            <FileText size={64} color={mutedColor} />
            <Text style={[styles.emptyText, { color: mutedColor }]}>No documents found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
