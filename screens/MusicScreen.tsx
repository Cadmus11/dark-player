import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SectionList,
  GestureResponderEvent,
  PanResponder,
  LayoutChangeEvent,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MusicNote, ListDashes, GridFour, ArrowDown, ArrowUp, FunnelSimple, Microphone, Image as ImageIcon, CheckCircle } from 'phosphor-react-native';
import { useFiles } from '../context/FileContext';
import { useTheme } from '../context/ThemeContext';
const FileSystem: any = require('expo-file-system');
interface MusicSection { title: string; data: FileItem[]; }
import type { FileItem, SortField, SortDirection, LayoutMode, FileAction } from '../types';
import { ScreenLayout } from '../components/ScreenLayout';
import { Sorting } from '../services/Sorting';
import LayoutToggle from '../components/LayoutToggle';
import FileGrid from '../components/FileGrid';
import FileList from '../components/FileList';
import { SelectionBar } from '../components/SelectionBar';
import { StorageService } from '../services/StorageService';

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: 'name', label: 'Name' },
  { field: 'date', label: 'Date' },
  { field: 'artist', label: 'Artist' },
  { field: 'album', label: 'Album' },
  { field: 'duration', label: 'Duration' },
  { field: 'size', label: 'Size' },
  { field: 'newest', label: 'Newest' },
];

const ALPHABET = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function getLetter(name: string): string {
  const char = name.charAt(0).toUpperCase();
  return /[A-Z]/.test(char) ? char : '#';
}

export function MusicScreen() {
  const { audio, createPlaylist, addToPlaylist, playlists } = useFiles();
  const navigation = useNavigation<any>();
  const { primaryColor, textColor, mutedColor } = useTheme();
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('list');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showSortModal, setShowSortModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedUris, setSelectedUris] = useState<Set<string>>(new Set());
  const selectionMode = selectedUris.size > 0;
  const [scrollProgress, setScrollProgress] = useState(0);
  const sectionListRef = useRef<SectionList<FileItem, MusicSection>>(null);
  const flatListRef = useRef<any>(null);
  const alphabetRef = useRef<View>(null);
  const alphabetLayoutRef = useRef({ x: 0, y: 0, height: 0 });
  const isAlphaSort = sortField === 'name';
  const scrollTrackRef = useRef<View>(null);
  const scrollTrackLayoutRef = useRef({ y: 0, height: 0 });
  const thumbAnim = useRef(new Animated.Value(0)).current;
  const sortedAudioRef = useRef<FileItem[]>([]);

  const handleScrollTrackTouch = useCallback((locationY: number) => {
    const { height } = scrollTrackLayoutRef.current;
    if (height <= 0) return;
    const pct = Math.max(0, Math.min(1, locationY / height));
    setScrollProgress(pct);
    Animated.timing(thumbAnim, {
      toValue: pct,
      duration: 50,
      useNativeDriver: false,
    }).start();
    const items = sortedAudioRef.current;
    const total = items.length;
    if (total > 0 && flatListRef.current) {
      const index = Math.floor(pct * (total - 1));
      flatListRef.current.scrollToIndex({ index, viewPosition: 0, animated: false });
    }
  }, [thumbAnim]);

  const scrollThumbPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        handleScrollTrackTouch(evt.nativeEvent.locationY);
      },
      onPanResponderMove: (evt) => {
        handleScrollTrackTouch(evt.nativeEvent.locationY);
      },
    })
  ).current;

  const handleNonAlphaScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const maxOffset = contentSize.height - layoutMeasurement.height;
    if (maxOffset > 0) {
      const pct = contentOffset.y / maxOffset;
      setScrollProgress(pct);
      thumbAnim.setValue(pct);
    }
  }, [thumbAnim]);

  const handleScrollTrackLayout = useCallback((e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    scrollTrackLayoutRef.current = { y, height };
  }, []);

  const toggleDirection = useCallback(() => {
    setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
  }, []);

  const sortedAudio = useMemo(() => {
    const result = Sorting.sort(audio, sortField, sortDirection);
    sortedAudioRef.current = result;
    return result;
  }, [audio, sortField, sortDirection]);

  const sections = useMemo(() => {
    if (sortField !== 'name') return [] as MusicSection[];
    const map = new Map<string, FileItem[]>();
    for (const item of sortedAudio) {
      const letter = getLetter(item.name);
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(item);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, data]) => ({ title, data }));
  }, [sortedAudio, sortField]);

  const currentSortLabel = SORT_OPTIONS.find((o) => o.field === sortField)?.label || 'Name';

  const navigateToFile = useCallback((file: FileItem) => {
    if (selectionMode) {
      const next = new Set(selectedUris);
      if (next.has(file.uri)) next.delete(file.uri);
      else next.add(file.uri);
      setSelectedUris(next);
      return;
    }
    navigation.navigate('MusicPlayer', { file });
  }, [navigation, selectionMode, selectedUris]);

  const handleLongPress = useCallback((file: FileItem) => {
    const next = new Set(selectedUris);
    next.add(file.uri);
    setSelectedUris(next);
  }, [selectedUris]);

  const selectedFiles = useMemo(() =>
    sortedAudio.filter((f) => selectedUris.has(f.uri)),
    [sortedAudio, selectedUris]
  );

  const handleSelectionAction = useCallback(async (action: FileAction, files: FileItem[]) => {
    switch (action) {
      case 'addToPlaylist': {
        const existing = playlists[0];
        if (existing) {
          for (const f of files) {
            await addToPlaylist(existing.id, f);
          }
        } else {
          const pl = await createPlaylist(`Playlist ${new Date().toLocaleDateString()}`);
          for (const f of files) {
            await addToPlaylist(pl.id, f);
          }
        }
        setSelectedUris(new Set());
        break;
      }
      case 'playNext': {
        const audioEngine = (await import('../engine/AudioEngine')).audioEngine;
        if (files.length > 0) {
          audioEngine.setQueue([...files, ...audioEngine.getState().queue], 0);
          audioEngine.play(files[0]);
        }
        setSelectedUris(new Set());
        break;
      }
      case 'share': {
        const { Share } = require('react-native');
        for (const f of files) {
          try { await Share.share({ url: f.uri, title: f.name }); } catch {}
        }
        setSelectedUris(new Set());
        break;
      }
      case 'hide': {
        setSelectedUris(new Set());
        break;
      }
      case 'delete':
        for (const f of files) {
          await StorageService.addToRecentlyDeleted(f);
          await StorageService.moveToTrash(f);
        }
        setSelectedUris(new Set());
        break;
    }
  }, []);

  const handleAlphabetLayout = (e: LayoutChangeEvent) => {
    const { x, y, height } = e.nativeEvent.layout;
    alphabetLayoutRef.current = { x, y, height };
  };

  const handleAlphabetTouch = useCallback((evt: GestureResponderEvent) => {
    const { locationY } = evt.nativeEvent;
    const { height } = alphabetLayoutRef.current;
    const index = Math.min(
      Math.floor((locationY / height) * ALPHABET.length),
      ALPHABET.length - 1
    );
    const letter = ALPHABET[index];
    setSelectedSection(letter);
    const sectionIndex = sections.findIndex((s) => s.title === letter);
    if (sectionIndex >= 0 && sectionListRef.current) {
      sectionListRef.current.scrollToLocation({
        sectionIndex,
        itemIndex: 0,
        viewPosition: 0,
      });
    }
  }, [sections]);

  const renderFileItem = useCallback(({ item }: { item: FileItem }) => {
    const isSelected = selectedUris.has(item.uri);
    const itemColor = item.artColor || primaryColor;
    const badges: React.ReactNode[] = [];
    if (item.hasLyrics) {
      badges.push(
        <View key="lyrics" style={[styles.badge, { backgroundColor: `${primaryColor}20` }]}>
          <Microphone size={10} color={primaryColor} weight="fill" />
          <Text style={[styles.badgeText, { color: primaryColor }]}>LYRICS</Text>
        </View>
      );
    }
    if (item.thumbnail || item.album) {
      badges.push(
        <View key="artwork" style={[styles.badge, { backgroundColor: `${primaryColor}15` }]}>
          <ImageIcon size={10} color={primaryColor} weight="fill" />
          <Text style={[styles.badgeText, { color: primaryColor }]}>ART</Text>
        </View>
      );
    }
    return (
      <TouchableOpacity
        style={[styles.fileItem, isSelected && { backgroundColor: `${primaryColor}10`, borderRadius: 8 }]}
        onPress={() => navigateToFile(item)}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={400}
      >
        {isSelected && (
          <CheckCircle size={18} color={primaryColor} weight="fill" />
        )}
        <View style={[styles.fileIcon, { backgroundColor: `${itemColor}20` }]}>
          {item.thumbnail ? (
            <Image source={{ uri: item.thumbnail }} style={styles.fileIconImage} />
          ) : (
            <MusicNote size={20} color={itemColor} />
          )}
        </View>
        <View style={styles.fileInfo}>
          <Text style={[styles.fileName, { color: textColor }]} numberOfLines={1}>{item.name}</Text>
          <View style={styles.fileMetaRow}>
            {item.artist && <Text style={[styles.fileMeta, { color: mutedColor }]} numberOfLines={1}>{item.artist}</Text>}
            {item.duration && (
              <>
                <Text style={[styles.fileMeta, { color: mutedColor }]}>•</Text>
                <Text style={[styles.fileMeta, { color: mutedColor }]}>
                  {Math.floor(item.duration / 60000)}:{String(Math.floor((item.duration % 60000) / 1000)).padStart(2, '0')}
                </Text>
              </>
            )}
          </View>
          {badges.length > 0 && (
            <View style={styles.badgeRow}>{badges}</View>
          )}
        </View>
        <Text style={[styles.chevron, { color: mutedColor }]}>›</Text>
      </TouchableOpacity>
    );
  }, [navigateToFile, handleLongPress, selectedUris, primaryColor, textColor, mutedColor]);

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
                sortDirection === 'asc' ? <ArrowUp size={18} color={primaryColor} /> : <ArrowDown size={18} color={primaryColor} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  ), [showSortModal, sortField, sortDirection, primaryColor, toggleDirection]);

  const renderSectionHeader = useCallback((info: { section: MusicSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionLetter, { color: primaryColor }]}>{info.section.title}</Text>
    </View>
  ), [primaryColor]);

  return (
    <ScreenLayout>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: textColor }]}>Music</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSortModal(true)}>
            <FunnelSimple size={16} color={mutedColor} />
            <Text style={[styles.sortBtnText, { color: mutedColor }]}>{currentSortLabel}</Text>
            {sortDirection === 'asc' ? <ArrowUp size={14} color={mutedColor} /> : <ArrowDown size={14} color={mutedColor} />}
          </TouchableOpacity>
          <LayoutToggle mode={layoutMode} onChange={setLayoutMode} primaryColor={primaryColor} />
        </View>
      </View>

      <View style={styles.listContainer}>
        {isAlphaSort && sections.length > 0 ? (
          <>
            <SectionList
              ref={sectionListRef}
              sections={sections}
              keyExtractor={(item) => item.uri}
              renderItem={renderFileItem}
              renderSectionHeader={renderSectionHeader}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              windowSize={7}
              maxToRenderPerBatch={10}
              removeClippedSubviews
              initialNumToRender={15}
              stickySectionHeadersEnabled={false}
            />
            {/* A-Z Scrollbar */}
            <View
              ref={alphabetRef}
              style={styles.alphabetScroll}
              onLayout={handleAlphabetLayout}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={handleAlphabetTouch}
              onResponderMove={handleAlphabetTouch}
            >
              {ALPHABET.map((letter) => (
                <Text
                  key={letter}
                  style={[
                    styles.alphabetLetter,
                    selectedSection === letter && { color: primaryColor, fontWeight: '800' },
                    sections.some((s) => s.title === letter) ? { color: textColor } : { color: 'rgba(255,255,255,0.15)' },
                  ]}
                >
                  {letter}
                </Text>
              ))}
            </View>
          </>
        ) : (
          <>
            {layoutMode === 'list' ? (
              <FileList
                scrollRef={flatListRef}
                data={sortedAudio}
                onPress={navigateToFile}
                onLongPress={handleLongPress}
                selectedUris={selectedUris}
                primaryColor={primaryColor}
                textColor={textColor}
                mutedColor={mutedColor}
                emptyMessage="No music found"
                onScroll={handleNonAlphaScroll}
              />
            ) : (
              <FileGrid
                data={sortedAudio}
                onPress={navigateToFile}
                primaryColor={primaryColor}
                textColor={textColor}
                mutedColor={mutedColor}
                emptyMessage="No music found"
              />
            )}
            <View
              ref={scrollTrackRef}
              style={styles.scrollTrack}
              onLayout={(e) => { handleScrollTrackLayout(e); scrollTrackLayoutRef.current = { y: e.nativeEvent.layout.y, height: e.nativeEvent.layout.height }; }}
              {...scrollThumbPanResponder.panHandlers}
            >
              <Animated.View
                style={[
                  styles.scrollThumb,
                  {
                    backgroundColor: primaryColor,
                    transform: [{
                      translateY: thumbAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 200],
                        extrapolate: 'clamp',
                      })
                    }]
                  }
                ]}
              />
            </View>
          </>
        )}
      </View>
      {renderSortModal}
      {selectionMode && (
        <SelectionBar
          selectedUris={selectedUris}
          selectedFiles={selectedFiles}
          onClearSelection={() => setSelectedUris(new Set())}
          onAction={handleSelectionAction}
          primaryColor={primaryColor}
        />
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  sortBtnText: { fontSize: 11, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { borderRadius: 24, padding: 24, width: '80%', maxWidth: 320 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8 },
  modalOptionText: { fontSize: 16, fontWeight: '500' },
  listContainer: { flex: 1, flexDirection: 'row' },
  listContent: { paddingHorizontal: 16, paddingBottom: 120 },

  // File items with badges
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  fileIconImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  fileMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fileMeta: { fontSize: 12 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  chevron: { fontSize: 20 },

  // Section List
  sectionHeader: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  sectionLetter: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // A-Z Scrollbar
  alphabetScroll: {
    position: 'absolute',
    right: 2,
    top: 0,
    bottom: 0,
    width: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  alphabetLetter: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 13,
  },
  scrollTrack: {
    position: 'absolute',
    right: 2,
    top: 8,
    bottom: 8,
    width: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 6,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  scrollThumb: {
    width: 4,
    height: 40,
    borderRadius: 2,
    opacity: 0.7,
  },
});
