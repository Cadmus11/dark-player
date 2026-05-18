import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MagnifyingGlass, Clock, X, Image as ImageIcon, VideoCamera, MusicNote, FileText, Folder } from 'phosphor-react-native';
import { useFiles } from '../context/FileContext';
import { useTheme } from '../context/ThemeContext';
import type { FileItem, FileType } from '../types';
import { FileIcon } from '../components/FileIcon';
import { TopBar } from '../components/TopBar';

const TYPE_FILTERS: { type: FileType | 'all'; label: string; Icon: React.ElementType }[] = [
  { type: 'all', label: 'All', Icon: MagnifyingGlass },
  { type: 'image', label: 'Images', Icon: ImageIcon },
  { type: 'video', label: 'Videos', Icon: VideoCamera },
  { type: 'audio', label: 'Music', Icon: MusicNote },
  { type: 'document', label: 'Docs', Icon: FileText },
  { type: 'folder', label: 'Folders', Icon: Folder },
];

export function SearchScreen() {
  const navigation = useNavigation<any>();
  const { files, searchHistory, saveSearch, removeSearch, clearSearchHistory } = useFiles();
  const { primaryColor, textColor, mutedColor } = useTheme();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FileType | 'all'>('all');
  const [isFocused, setIsFocused] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    let filtered = files.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.artist && f.artist.toLowerCase().includes(q)) ||
        (f.type && f.type.toLowerCase().includes(q))
    );
    if (activeFilter !== 'all') {
      filtered = filtered.filter((f) => f.type === activeFilter);
    }
    return filtered;
  }, [query, files, activeFilter]);

  const showHistory = !query.trim() && isFocused;

  const navigateToFile = (file: FileItem) => {
    switch (file.type) {
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

  const handleSearch = (text: string) => {
    setQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text.trim()) {
      searchTimer.current = setTimeout(() => saveSearch(text.trim()), 500);
    }
  };

  const handleHistoryTap = (searchQuery: string) => {
    setQuery(searchQuery);
    saveSearch(searchQuery);
  };

  const renderItem = ({ item }: { item: FileItem }) => (
    <TouchableOpacity style={styles.resultItem} onPress={() => navigateToFile(item)}>
      <View style={[styles.resultIconWrap, { backgroundColor: `${primaryColor}10` }]}>
        <FileIcon type={item.type} size={20} />
      </View>
      <View style={styles.resultInfo}>
        <Text style={[styles.resultName, { color: textColor }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.resultType, { color: mutedColor }]}>{item.type}{item.artist ? ` • ${item.artist}` : ''}</Text>
      </View>
      <Text style={[styles.chevron, { color: mutedColor }]}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: '#18181b' }]}>
      <TopBar />
      <View style={styles.searchSection}>
        <View style={[styles.searchBar, isFocused && { borderColor: primaryColor }]}>
          <MagnifyingGlass size={20} color={isFocused ? primaryColor : mutedColor} weight="bold" />
          <TextInput
            style={[styles.searchInput, { color: textColor }]}
            placeholder="Search your media..."
            placeholderTextColor={mutedColor}
            value={query}
            onChangeText={handleSearch}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 100)}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')}>
              <X size={18} color={mutedColor} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Type Filters */}
        <View style={styles.filterRow}>
          {TYPE_FILTERS.map(({ type, label, Icon }) => (
            <TouchableOpacity
              key={type}
              style={[styles.filterBtn, activeFilter === type && { backgroundColor: primaryColor }]}
              onPress={() => setActiveFilter(type)}
            >
              <Icon size={14} color={activeFilter === type ? '#18181b' : mutedColor} weight={activeFilter === type ? 'bold' : 'regular'} />
              <Text style={[styles.filterLabel, activeFilter === type && { color: '#18181b', fontWeight: '700' }, { color: mutedColor }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Search History */}
      {showHistory && (
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Clock size={16} color={mutedColor} />
              <Text style={[styles.historyTitle, { color: textColor }]}>Recent Searches</Text>
            </View>
            {searchHistory.length > 0 && (
              <TouchableOpacity onPress={clearSearchHistory}>
                <Text style={[styles.clearText, { color: primaryColor }]}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
          {searchHistory.length > 0 ? (
            searchHistory.slice(0, 10).map((search) => (
              <View key={search.id} style={styles.historyItem}>
                <TouchableOpacity style={styles.historyItemContent} onPress={() => handleHistoryTap(search.query)}>
                  <Clock size={16} color={mutedColor} />
                  <Text style={[styles.historyQuery, { color: textColor }]} numberOfLines={1}>{search.query}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeSearch(search.id)}>
                  <X size={14} color={mutedColor} />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={[styles.historyEmpty, { color: mutedColor }]}>No recent searches</Text>
          )}
        </View>
      )}

      {/* Results */}
      <FlatList
        data={query.trim() ? results : []}
        renderItem={renderItem}
        keyExtractor={(item) => item.uri}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        windowSize={7}
        maxToRenderPerBatch={10}
        removeClippedSubviews
        initialNumToRender={8}
        ListEmptyComponent={
          query.trim() ? (
            <View style={styles.emptyContainer}>
              <MagnifyingGlass size={56} color={mutedColor} />
              <Text style={[styles.emptyText, { color: mutedColor }]}>No results found</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <MagnifyingGlass size={56} color={mutedColor} />
              <Text style={[styles.emptyText, { color: mutedColor }]}>Search your media files</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchSection: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  searchInput: { flex: 1, fontSize: 15 },
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#27272a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  filterLabel: { fontSize: 12, fontWeight: '600' },
  historySection: { paddingHorizontal: 16, marginBottom: 8 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  historyTitle: { fontSize: 14, fontWeight: '700' },
  clearText: { fontSize: 13, fontWeight: '600' },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  historyItemContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  historyQuery: { fontSize: 14, flex: 1 },
  historyEmpty: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  listContent: { paddingHorizontal: 16, paddingBottom: 120 },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  resultIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  resultType: { fontSize: 12, textTransform: 'capitalize' },
  chevron: { fontSize: 20 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 16, marginTop: 16 },
});
