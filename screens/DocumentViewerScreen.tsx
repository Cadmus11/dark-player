import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { getFileIcon, formatFileSize } from '../services/FileService';

type DocumentViewerScreenProps = NativeStackScreenProps<RootStackParamList, 'DocumentViewer'>;

export function DocumentViewerScreen({ navigation, route }: DocumentViewerScreenProps) {
  const { file } = route.params;

  const openDocument = async () => {
    try {
      await Linking.openURL(file.uri);
    } catch {
      console.warn('Could not open document');
    }
  };

  const isPdf = file.name.toLowerCase().endsWith('.pdf');
  const isText = /\.(txt|md|json|xml|csv)$/i.test(file.name);
  const isWord = /\.(doc|docx)$/i.test(file.name);
  const isExcel = /\.(xls|xlsx)$/i.test(file.name);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Document</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.documentIconContainer}>
          <Text style={styles.documentIcon}>{getFileIcon(file.type)}</Text>
        </View>

        <Text style={styles.fileName} numberOfLines={2}>
          {file.name}
        </Text>

        <View style={styles.fileInfo}>
          {file.size && <Text style={styles.infoText}>{formatFileSize(file.size)}</Text>}
          {file.mimeType && <Text style={styles.infoText}>{file.mimeType}</Text>}
        </View>

        <TouchableOpacity style={styles.openButton} onPress={openDocument}>
          <Text style={styles.openButtonText}>Open Document</Text>
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Supported Actions</Text>
          {isPdf && <Text style={styles.infoCardItem}>📄 PDF Viewer</Text>}
          {isText && <Text style={styles.infoCardItem}>📝 Text Preview</Text>}
          {isWord && <Text style={styles.infoCardItem}>📝 Document Viewer</Text>}
          {isExcel && <Text style={styles.infoCardItem}>📊 Spreadsheet Viewer</Text>}
          <Text style={styles.infoCardItem}>📤 Share with other apps</Text>
        </View>
      </ScrollView>
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
  backIcon: { fontSize: 28, color: '#ffffff' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#ffffff' },
  content: { alignItems: 'center', paddingHorizontal: 30, paddingBottom: 40 },
  documentIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  documentIcon: { fontSize: 56 },
  fileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  fileInfo: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  infoText: { fontSize: 14, color: 'rgba(255, 255, 255, 0.5)' },
  openButton: {
    backgroundColor: '#C2FC4A',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 32,
    width: '100%',
  },
  openButtonText: { color: '#06060B', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  infoCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  infoCardTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff', marginBottom: 12 },
  infoCardItem: { fontSize: 14, color: 'rgba(255, 255, 255, 0.7)', paddingVertical: 6 },
});
