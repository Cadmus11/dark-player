import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { CaretLeft, TextAa, MagnifyingGlassMinus, MagnifyingGlassPlus } from 'phosphor-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useTheme } from '../context/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'DocumentReader'>;

const { width } = Dimensions.get('window');

export function DocumentReaderScreen({ navigation, route }: Props) {
  const { file } = route.params;
  const { primaryColor } = useTheme();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(16);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDocument();
  }, [file.uri]);

  async function loadDocument() {
    setLoading(true);
    setError(null);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') {
        setContent(`📄 ${file.name}\n\nPDF viewing is not supported in-app. Use external viewer.\n\nFile: ${file.uri}\nSize: ${file.size ? Math.round(file.size / 1024) + ' KB' : 'Unknown'}`);
      } else if (ext === 'epub') {
        setContent(`📖 ${file.name}\n\nEPUB viewing is not supported in-app. Use external viewer.\n\nFile: ${file.uri}\nSize: ${file.size ? Math.round(file.size / 1024) + ' KB' : 'Unknown'}`);
      } else {
        const text = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        setContent(text || '(empty document)');
      }
    } catch (e) {
      setError('Failed to load document. The file may be corrupted or unsupported.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={styles.loadingText}>Loading document...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <CaretLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{file.name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setFontSize((s) => Math.max(12, s - 2))}>
            <MagnifyingGlassMinus size={20} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setFontSize((s) => Math.min(32, s + 2))}>
            <MagnifyingGlassPlus size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
      {error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
        >
          <Text style={[styles.documentText, { fontSize }]} selectable>
            {content}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#ffffff', marginHorizontal: 8 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60 },
  documentText: { color: '#e4e4e7', lineHeight: 28 },
  errorText: { fontSize: 14, color: '#ef4444', textAlign: 'center', padding: 40 },
});
