import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
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
import { MusicNote, ArrowDown, ArrowUp, FunnelSimple, Microphone, CheckCircle } from 'phosphor-react-native';
import { useFiles } from '../context/FileContext';
import { useTheme } from '../context/ThemeContext';
const FileSystem: any = require('expo-file-system');
interface MusicSection { title: string; data: FileItem[]; }
import type { FileItem, SortField, SortDirection, FileAction } from '../types';
import { ScreenLayout } from '../components/ScreenLayout';
import { Sorting } from '../services/Sorting';
import FileGrid from '../components/FileGrid';
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

export const MusicScreen = React.memo(function MusicScreen() {
  const { audio, createPlaylist, addToPlaylist, playlists } = useFiles();
  const navigation = useNavigation<any>();
  const { primaryColor, textColor, mutedColor, isDarkMode } = useTheme();
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
    return (
      <TouchableOpacity
        className="flex-row items-center py-2.5 px-4 gap-3"
        style={isSelected && { backgroundColor: `${primaryColor}10`, borderRadius: 8 }}
        onPress={() => navigateToFile(item)}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={400}
      >
        {isSelected && (
          <CheckCircle size={18} color={primaryColor} weight="fill" />
        )}
        <View className="w-11 h-11 rounded-xl justify-center items-center overflow-hidden" style={{ backgroundColor: `${itemColor}20` }}>
          {item.thumbnail ? (
            <Image source={{ uri: item.thumbnail }} className="w-11 h-11 rounded-xl" />
          ) : (
            <MusicNote size={22} color={itemColor} weight="fill" />
          )}
        </View>
        <View className="flex-1">
          <Text className="text-[15px] font-semibold mb-[3px]" style={{ color: textColor }} numberOfLines={1}>{item.name}</Text>
          <View className="flex-row items-center gap-1.5">
            <Text className="text-[13px]" style={{ color: mutedColor }} numberOfLines={1}>
              {item.artist || 'Unknown'}
            </Text>
            {item.hasLyrics && (
              <View className="flex-row items-center gap-[3px] px-1.5 py-0.5 rounded-md" style={{ backgroundColor: `${primaryColor}20` }}>
                <Microphone size={10} color={primaryColor} weight="fill" />
                <Text className="text-[9px] font-bold tracking-wider" style={{ color: primaryColor }}>LYRICS</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [navigateToFile, handleLongPress, selectedUris, primaryColor, textColor, mutedColor]);

  const renderSortModal = useMemo(() => (
    <Modal visible={showSortModal} transparent animationType="fade">
      <TouchableOpacity className="flex-1 justify-center items-center bg-black/70" onPress={() => setShowSortModal(false)}>
        <View className="bg-[#27272a] rounded-3xl p-6 w-4/5 max-w-[320px]">
          <Text className="text-lg font-extrabold mb-4 text-center text-white">Sort by</Text>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.field}
              className="flex-row items-center justify-between py-3.5 px-4 rounded-xl mb-2"
              style={sortField === opt.field && { backgroundColor: `${primaryColor}15` }}
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
              <Text className="text-base font-medium" style={{ color: sortField === opt.field ? primaryColor : mutedColor, fontWeight: sortField === opt.field ? '700' : '500' }}>
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
    <View className="py-1.5 px-1 mt-1">
      <Text className="text-sm font-extrabold tracking-wider" style={{ color: primaryColor }}>{info.section.title}</Text>
    </View>
  ), [primaryColor]);

  return (
    <ScreenLayout>
      <View className="flex-row justify-between items-center px-4 mb-2">
        <Text className="text-2xl font-extrabold" style={{ color: textColor }}>Music</Text>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity className="flex-row items-center px-2.5 py-1.5 rounded-lg gap-1" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', borderWidth: 0.5, borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }} onPress={() => setShowSortModal(true)}>
            <FunnelSimple size={16} color={primaryColor} />
            <Text className="text-[11px] font-semibold" style={{ color: mutedColor }}>{currentSortLabel}</Text>
            {sortDirection === 'asc' ? <ArrowUp size={14} color={mutedColor} /> : <ArrowDown size={14} color={mutedColor} />}
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-1 flex-row">
        {isAlphaSort && sections.length > 0 ? (
          <>
            <SectionList
              ref={sectionListRef}
              sections={sections}
              keyExtractor={(item) => item.uri}
              renderItem={renderFileItem}
              renderSectionHeader={renderSectionHeader}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
              windowSize={7}
              maxToRenderPerBatch={10}
              removeClippedSubviews
              initialNumToRender={15}
              stickySectionHeadersEnabled={false}
            />
            {/* A-Z Scrollbar */}
            <View
              ref={alphabetRef}
              className="absolute right-0.5 top-0 bottom-0 w-[22px] justify-center items-center py-2"
              onLayout={handleAlphabetLayout}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={handleAlphabetTouch}
              onResponderMove={handleAlphabetTouch}
            >
              {ALPHABET.map((letter) => (
                <Text
                  key={letter}
                  className="text-[9px] font-semibold text-center leading-[13px]"
                  style={[
                    selectedSection === letter && { color: primaryColor, fontWeight: '800' },
                    sections.some((s) => s.title === letter) ? { color: textColor } : { color: mutedColor },
                  ]}
                >
                  {letter}
                </Text>
              ))}
            </View>
          </>
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={sortedAudio}
              renderItem={renderFileItem}
              keyExtractor={(item: FileItem) => item.uri}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
              showsVerticalScrollIndicator={false}
              windowSize={7}
              maxToRenderPerBatch={10}
              removeClippedSubviews
              initialNumToRender={15}
              onScroll={handleNonAlphaScroll}
              scrollEventThrottle={16}
              ListEmptyComponent={
                <View className="items-center justify-center py-[100px]">
                  <MusicNote size={64} color={mutedColor} />
                  <Text className="text-base mt-4" style={{ color: mutedColor }}>No music found</Text>
                </View>
              }
            />
            <View
              ref={scrollTrackRef}
              className="absolute right-0.5 top-2 bottom-2 w-3 rounded-md justify-start items-center"
              style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
              onLayout={(e) => { handleScrollTrackLayout(e); scrollTrackLayoutRef.current = { y: e.nativeEvent.layout.y, height: e.nativeEvent.layout.height }; }}
              {...scrollThumbPanResponder.panHandlers}
            >
              <Animated.View
                className="w-1 h-10 rounded-sm opacity-70"
                style={{
                  backgroundColor: primaryColor,
                  transform: [{
                    translateY: thumbAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 200],
                      extrapolate: 'clamp',
                    })
                  }]
                }}
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
});
