import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Platform,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
const FileSystem: any = require('expo-file-system');
import { CaretLeft, TextAa, MagnifyingGlassMinus, MagnifyingGlassPlus, Upload, MagnifyingGlass, X, Bookmark, BookmarkSimple } from 'phosphor-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useTheme } from '../context/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'DocumentReader'>;

const BOOKMARKS_KEY = '@lumora_doc_bookmarks';

export function DocumentReaderScreen({ navigation, route }: Props) {
  const { file } = route.params;
  const { primaryColor } = useTheme();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(16);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentResult, setCurrentResult] = useState(0);
  const [bookmarks, setBookmarks] = useState<{ line: number; text: string }[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadDocument();
    loadBookmarks();
  }, [file.uri]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const lines = content.split('\n');
      const results: number[] = [];
      lines.forEach((line, i) => {
        if (line.toLowerCase().includes(searchQuery.toLowerCase())) {
          results.push(i);
        }
      });
      setSearchResults(results);
      setCurrentResult(0);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, content]);

  async function loadDocument() {
    setLoading(true);
    setError(null);
    try {
      const text = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });
      setContent(text || '(empty document)');
    } catch {
      setError('Failed to load document. The file may be corrupted, binary, or unsupported.');
    } finally {
      setLoading(false);
    }
  }

  async function loadBookmarks() {
    try {
      const data = await AsyncStorage.getItem(`${BOOKMARKS_KEY}_${file.uri}`);
      if (data) setBookmarks(JSON.parse(data));
    } catch {}
  }

  async function toggleBookmark(line: number, text: string) {
    const exists = bookmarks.find((b) => b.line === line);
    let updated: typeof bookmarks;
    if (exists) {
      updated = bookmarks.filter((b) => b.line !== line);
    } else {
      updated = [...bookmarks, { line, text: text.substring(0, 60) }].sort((a, b) => a.line - b.line);
    }
    setBookmarks(updated);
    await AsyncStorage.setItem(`${BOOKMARKS_KEY}_${file.uri}`, JSON.stringify(updated));
  }

  const wordCount = useMemo(() => {
    if (!content) return 0;
    return content.trim().split(/\s+/).filter(Boolean).length;
  }, [content]);

  const charCount = content.length;
  const lineCount = content.split('\n').length;

  const handleShare = async () => {
    try {
      await Share.share({ message: content.substring(0, 5000), title: file.name });
    } catch {}
  };

  const scrollToLine = (line: number) => {
    const y = line * (fontSize * 1.75 + 4);
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 100), animated: true });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={styles.loadingText}>Reading document...</Text>
      </View>
    );
  }

  const lines = content.split('\n');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <CaretLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{file.name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setShowSearch(!showSearch)}>
            <MagnifyingGlass size={18} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setFontSize((s) => Math.max(12, s - 2))}>
            <MagnifyingGlassMinus size={20} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setFontSize((s) => Math.min(32, s + 2))}>
            <MagnifyingGlassPlus size={20} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={handleShare}>
            <Upload size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      {showSearch && (
        <View style={[styles.searchBar, { borderColor: primaryColor }]}>
          <MagnifyingGlass size={16} color={primaryColor} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search in document..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          ) : null}
          {searchResults.length > 0 && (
            <View style={styles.searchNav}>
              <Text style={styles.searchCount}>{currentResult + 1}/{searchResults.length}</Text>
              <TouchableOpacity onPress={() => {
                const prev = (currentResult - 1 + searchResults.length) % searchResults.length;
                setCurrentResult(prev);
                scrollToLine(searchResults[prev]);
              }}>
                <Text style={[styles.searchNavBtn, { color: primaryColor }]}>▲</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                const next = (currentResult + 1) % searchResults.length;
                setCurrentResult(next);
                scrollToLine(searchResults[next]);
              }}>
                <Text style={[styles.searchNavBtn, { color: primaryColor }]}>▼</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadDocument}>
            <Text style={[styles.retryText, { color: primaryColor }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.statsBar}>
            <Text style={styles.stat}>{wordCount} words</Text>
            <Text style={styles.statDivider}>|</Text>
            <Text style={styles.stat}>{charCount} chars</Text>
            <Text style={styles.statDivider}>|</Text>
            <Text style={styles.stat}>{lineCount} lines</Text>
            <Text style={styles.statDivider}>|</Text>
            <Text style={styles.stat}>{fontSize}px</Text>
            <Text style={styles.statDivider}>|</Text>
            <Text style={styles.stat}>{bookmarks.length} bookmarks</Text>
          </View>
          <ScrollView
            ref={scrollRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
          >
            {lines.map((line, i) => {
              const isBookmarked = bookmarks.some((b) => b.line === i);
              const isSearchHit = searchResults.includes(i) && searchResults[currentResult] === i;
              return (
                <View key={i} style={[styles.lineRow, isSearchHit && { backgroundColor: `${primaryColor}18`, borderRadius: 4 }]}>
                  <TouchableOpacity style={styles.bmBtn} onPress={() => toggleBookmark(i, line)}>
                    {isBookmarked ? (
                      <BookmarkSimple size={14} color={primaryColor} weight="fill" />
                    ) : (
                      <Bookmark size={14} color="rgba(255,255,255,0.15)" />
                    )}
                  </TouchableOpacity>
                  <Text style={[styles.lineNum, { color: 'rgba(255,255,255,0.2)' }]}>{i + 1}</Text>
                  <Text
                    style={[styles.documentText, { fontSize }]}
                    selectable
                  >
                    {line || ' '}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
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
  headerActions: { flexDirection: 'row', gap: 4 },
  headerBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 8,
  },
  searchInput: { flex: 1, color: '#ffffff', fontSize: 14 },
  searchNav: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  searchCount: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  searchNavBtn: { fontSize: 14, fontWeight: '700' },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  stat: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  statDivider: { fontSize: 12, color: 'rgba(255,255,255,0.15)' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 12, paddingBottom: 60 },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 2,
    gap: 6,
  },
  bmBtn: { width: 20, height: 20, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  lineNum: {
    fontSize: 11,
    fontWeight: '500',
    width: 32,
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 22,
  },
  documentText: {
    color: '#e4e4e7',
    lineHeight: 28,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  errorText: { fontSize: 14, color: '#ef4444', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  retryBtn: { paddingVertical: 10, paddingHorizontal: 24 },
  retryText: { fontSize: 15, fontWeight: '700' },
});
