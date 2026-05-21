import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
  Share,
  ActivityIndicator,
  Platform,
} from 'react-native';
const FileSystem: any = require('expo-file-system');
import { CaretLeft, FilePdf, FileTxt, FileDoc, FileXls, FilePpt, Upload, BookOpen, TextAa } from 'phosphor-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { ScreenLayout } from '../components/ScreenLayout';
import { FileIcon } from '../components/FileIcon';
import { formatFileSize } from '../services/FileService';
import { useTheme } from '../context/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'DocumentViewer'>;

type DocType = 'pdf' | 'word' | 'excel' | 'ppt' | 'text' | 'epub' | 'other';

function detectDocType(name: string): DocType {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'word';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel';
  if (['ppt', 'pptx'].includes(ext)) return 'ppt';
  if (['txt', 'md', 'json', 'xml', 'rtf', 'log', 'yaml', 'yml', 'toml', 'ini', 'cfg'].includes(ext)) return 'text';
  if (ext === 'epub') return 'epub';
  return 'other';
}

function isReadableText(name: string): boolean {
  return ['txt', 'md', 'json', 'xml', 'rtf', 'log', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'csv'].includes(
    name.split('.').pop()?.toLowerCase() || ''
  );
}

export function DocumentViewerScreen({ navigation, route }: Props) {
  const { file } = route.params;
  const { primaryColor, textColor, mutedColor } = useTheme();
  const [textPreview, setTextPreview] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const docType = detectDocType(file.name);
  const isText = isReadableText(file.name);

  useEffect(() => {
    if (isText) loadTextPreview();
  }, [file.uri]);

  async function loadTextPreview() {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const text = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      setTextPreview(text.substring(0, 2000));
    } catch {
      setPreviewError('Could not read file contents');
    } finally {
      setPreviewLoading(false);
    }
  }

  const openInAppReader = () => {
    navigation.navigate('DocumentReader', { file });
  };

  const openExternally = async () => {
    try {
      await Linking.openURL(file.uri);
    } catch {
      try {
        await Share.share({ url: file.uri, title: file.name });
      } catch {}
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        url: Platform.OS === 'ios' ? file.uri : file.uri,
        title: file.name,
      });
    } catch {}
  };

  const renderAction = (icon: React.ReactNode, label: string, onPress: () => void, accent = false) => (
    <TouchableOpacity
      style={[styles.actionBtn, accent && { backgroundColor: primaryColor }]}
      onPress={onPress}
    >
      {icon}
      <Text style={[styles.actionLabel, accent && { color: '#06060B' }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScreenLayout noTopBar>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <CaretLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{file.name}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconWrap}>
          <FileIcon type="document" docSubType={file.docSubType} size={56} />
        </View>

        <Text style={styles.fileName} numberOfLines={2}>{file.name}</Text>

        <View style={styles.metaRow}>
          {file.size ? <Text style={styles.metaText}>{formatFileSize(file.size)}</Text> : null}
          <Text style={styles.metaText}>{docType.toUpperCase()}</Text>
          {file.modifiedAt ? (
            <Text style={styles.metaText}>{new Date(file.modifiedAt).toLocaleDateString()}</Text>
          ) : null}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {isText && renderAction(
            <TextAa size={22} color="#06060B" />,
            'Read In-App',
            openInAppReader,
            true,
          )}
          {renderAction(
            <Upload size={22} color="#ffffff" />,
            'Share',
            handleShare,
          )}
          {renderAction(
            <Upload size={22} color="#ffffff" />,
            'Open Externally',
            openExternally,
          )}
        </View>

        {/* Text Preview */}
        {isText && (
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <FileTxt size={16} color={primaryColor} />
              <Text style={[styles.previewTitle, { color: primaryColor }]}>Preview</Text>
            </View>
            {previewLoading ? (
              <ActivityIndicator color={primaryColor} style={{ padding: 20 }} />
            ) : previewError ? (
              <Text style={styles.previewError}>{previewError}</Text>
            ) : textPreview ? (
              <>
                <Text style={styles.previewText} numberOfLines={15} selectable>{textPreview}</Text>
                {textPreview.length >= 2000 && (
                  <TouchableOpacity onPress={openInAppReader}>
                    <Text style={[styles.readMore, { color: primaryColor }]}>Read full document →</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : null}
          </View>
        )}

        {/* File-specific info */}
        {!isText && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>About this file</Text>
            {docType === 'pdf' && (
              <View style={styles.infoRow}>
                <FilePdf size={16} color="rgba(255,255,255,0.6)" />
                <Text style={styles.infoText}>PDF document — open externally or share to view</Text>
              </View>
            )}
            {docType === 'word' && (
              <View style={styles.infoRow}>
                <FileDoc size={16} color="rgba(255,255,255,0.6)" />
                <Text style={styles.infoText}>Word document — open in Word or Google Docs</Text>
              </View>
            )}
            {docType === 'excel' && (
              <View style={styles.infoRow}>
                <FileXls size={16} color="rgba(255,255,255,0.6)" />
                <Text style={styles.infoText}>Spreadsheet — open in Excel or Sheets</Text>
              </View>
            )}
            {docType === 'ppt' && (
              <View style={styles.infoRow}>
                <FilePpt size={16} color="rgba(255,255,255,0.6)" />
                <Text style={styles.infoText}>Presentation — open in PowerPoint or Slides</Text>
              </View>
            )}
            {docType === 'epub' && (
              <View style={styles.infoRow}>
                <BookOpen size={16} color="rgba(255,255,255,0.6)" />
                <Text style={styles.infoText}>EPUB ebook — open in a reader app</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#ffffff', marginHorizontal: 8 },
  content: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 60 },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  fileName: { fontSize: 18, fontWeight: '700', color: '#ffffff', textAlign: 'center', marginBottom: 8, paddingHorizontal: 20 },
  metaRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  metaText: { fontSize: 13, color: 'rgba(255,255,255,0.45)' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 28 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#27272a',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  actionLabel: { fontSize: 14, fontWeight: '600', color: '#ffffff' },

  // Preview
  previewCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  previewTitle: { fontSize: 14, fontWeight: '700' },
  previewText: { color: '#d4d4d8', fontSize: 13, lineHeight: 20, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  previewError: { color: '#ef4444', fontSize: 13, textAlign: 'center', padding: 12 },
  readMore: { fontSize: 13, fontWeight: '600', marginTop: 12, textAlign: 'center' },

  // Info
  infoCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#ffffff', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
  infoText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', flex: 1, lineHeight: 18 },
});
