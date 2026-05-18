import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { CaretLeft, Image as ImageIcon, VideoCamera, MusicNote, FileText, FilePdf, FileDoc, FileXls, FilePpt, FileTxt } from 'phosphor-react-native';
import { useFiles } from '../context/FileContext';
import { formatFileSize, formatDuration } from '../services/FileService';
import { FileIcon } from '../components/FileIcon';
import type { FileItem, DocumentSubType } from '../types';

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
  const { images, videos, audio, pdfFiles, wordFiles, excelFiles, pptFiles, textFiles } = useFiles();

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
          default:
            return [];
        }
      default:
        return [];
    }
  })();

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
          <View style={{ width: 40 }} />
        </View>
        <FlatList
          data={files}
          renderItem={renderImageItem}
          keyExtractor={(item) => item.uri}
          numColumns={3}
          contentContainerStyle={styles.imageGrid}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CategoryIcon size={64} color="rgba(255, 255, 255, 0.5)" />
              <Text style={styles.emptyText}>No {title.toLowerCase()} found</Text>
            </View>
          }
        />
      </View>
    );
  }

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
        <View style={{ width: 40 }} />
      </View>
      <FlatList
        data={files}
        renderItem={renderListItem}
        keyExtractor={(item) => item.uri}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <CategoryIcon size={64} color="rgba(255, 255, 255, 0.5)" />
            <Text style={styles.emptyText}>No {title.toLowerCase()} found</Text>
          </View>
        }
      />
    </View>
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
    default:
      return '#999';
  }
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
});
