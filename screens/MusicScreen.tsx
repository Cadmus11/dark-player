import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  SectionList,
  GestureResponderEvent,
  PanResponder,
  LayoutChangeEvent,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Image,
  Share,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useAppNavigation } from "../hooks/useAppNavigation";
import { Microphone, CheckCircle } from "phosphor-react-native";
import { useVisibleAudio } from "../hooks/useVisibleAudio";
import { usePlaylistStore } from "../stores/playlistStore";
import { usePlaybackStore } from "../stores/playbackStore";
import { useTheme } from "../context/ThemeContext";
import type { FileItem, SortField, SortDirection, FileAction } from "../types";
import { ScreenLayout } from "../components/ScreenLayout";
import { ThemedText } from "../components/ThemedText";
import { EmptyState } from "../components/EmptyState";
import { Sorting } from "../services/Sorting";
import { SelectionBar } from "../components/SelectionBar";
import { StorageService } from "../services/StorageService";
import { SortModal } from "../components/SortModal";
import { SkeletonRow } from "../components/SkeletonLoader";
import { useMediaStore } from "../stores/mediaStore";

interface MusicSection {
  title: string;
  data: FileItem[];
}

const ALPHABET = "#ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function getLetter(name: string): string {
  const char = name.charAt(0).toUpperCase();
  return /[A-Z]/.test(char) ? char : "#";
}

export const MusicScreen = React.memo(function MusicScreen() {
  const audio = useVisibleAudio();
  const navigation = useAppNavigation();
  const { primaryColor, textColor, mutedColor, isDarkMode } = useTheme();
  const currentFile = usePlaybackStore((s) => s.currentFile);
  const loading = useMediaStore((s) => s.loading);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showSortModal, setShowSortModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedUris, setSelectedUris] = useState<Set<string>>(new Set());
  const selectionMode = selectedUris.size > 0;
  const sectionListRef = useRef<SectionList<FileItem, MusicSection>>(null);
  const flatListRef = useRef<any>(null);
  const alphabetRef = useRef<View>(null);
  const alphabetLayoutRef = useRef({ x: 0, y: 0, height: 0 });
  const isAlphaSort = sortField === "name";
  const scrollTrackRef = useRef<View>(null);
  const scrollTrackLayoutRef = useRef({ y: 0, height: 0 });
  const thumbAnim = useRef(new Animated.Value(0)).current;
  const sortedAudioRef = useRef<FileItem[]>([]);

  const handleScrollTrackTouch = useCallback(
    (locationY: number) => {
      const { height } = scrollTrackLayoutRef.current;
      if (height <= 0) return;
      const pct = Math.max(0, Math.min(1, locationY / height));
      Animated.timing(thumbAnim, {
        toValue: pct,
        duration: 50,
        useNativeDriver: false,
      }).start();
      const items = sortedAudioRef.current;
      const total = items.length;
      if (total > 0 && flatListRef.current) {
        const index = Math.floor(pct * (total - 1));
        flatListRef.current.scrollToIndex({
          index,
          viewPosition: 0,
          animated: false,
        });
      }
    },
    [thumbAnim],
  );

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
    }),
  ).current;

  const handleNonAlphaScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const maxOffset = contentSize.height - layoutMeasurement.height;
      if (maxOffset > 0) {
        const pct = contentOffset.y / maxOffset;
        thumbAnim.setValue(pct);
      }
    },
    [thumbAnim],
  );

  const handleScrollTrackLayout = useCallback((e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    scrollTrackLayoutRef.current = { y, height };
  }, []);

  const sortedAudio = useMemo(() => {
    const result = Sorting.sort(audio, sortField, sortDirection);
    sortedAudioRef.current = result;
    return result;
  }, [audio, sortField, sortDirection]);

  const sections = useMemo(() => {
    if (sortField !== "name") return [] as MusicSection[];
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

  const navigateToFile = useCallback(
    (file: FileItem) => {
      if (selectionMode) {
        const next = new Set(selectedUris);
        if (next.has(file.uri)) next.delete(file.uri);
        else next.add(file.uri);
        setSelectedUris(next);
        return;
      }
      navigation.navigate("MusicPlayer", { file });
    },
    [navigation, selectionMode, selectedUris],
  );

  const handleLongPress = useCallback(
    (file: FileItem) => {
      const next = new Set(selectedUris);
      next.add(file.uri);
      setSelectedUris(next);
    },
    [selectedUris],
  );

  const selectedFiles = useMemo(
    () => sortedAudio.filter((f) => selectedUris.has(f.uri)),
    [sortedAudio, selectedUris],
  );

  const handleSelectionAction = useCallback(
    async (action: FileAction, files: FileItem[]) => {
      switch (action) {
        case "addToPlaylist": {
          const store = usePlaylistStore.getState();
          const existing = store.playlists[0];
          if (existing) {
            for (const f of files) {
              store.addSongs(existing.id, [f]);
            }
          } else {
            const pl = store.create(
              `Playlist ${new Date().toLocaleDateString()}`,
            );
            for (const f of files) {
              store.addSongs(pl.id, [f]);
            }
          }
          setSelectedUris(new Set());
          break;
        }
        case "playNext": {
          const audioEngine = (await import("../engine/AudioEngine"))
            .audioEngine;
          if (files.length > 0) {
            audioEngine.setQueue(
              [...files, ...audioEngine.getState().queue],
              0,
            );
            audioEngine.play(files[0]);
          }
          setSelectedUris(new Set());
          break;
        }
        case "share": {
          for (const f of files) {
            try {
              await Share.share({ url: f.uri, title: f.name });
            } catch {}
          }
          setSelectedUris(new Set());
          break;
        }
        case "hide": {
          setSelectedUris(new Set());
          break;
        }
        case "moveToPrivate": {
          const { PrivateFolderService } =
            await import("../services/PrivateFolderService");
          const exists = await PrivateFolderService.isSetup();
          if (!exists) {
            Alert.alert(
              "Private Folder",
              "Create a Private Folder in Settings first.",
            );
            break;
          }
          const moved = await PrivateFolderService.addFiles(files);
          Alert.alert(
            "Private Folder",
            `${moved} of ${files.length} file${files.length !== 1 ? "s" : ""} moved.`,
          );
          setSelectedUris(new Set());
          break;
        }
        case "delete":
          for (const f of files) {
            await StorageService.addToRecentlyDeleted(f);
            await StorageService.moveToTrash(f);
          }
          setSelectedUris(new Set());
          break;
      }
    },
    [],
  );

  const handleAlphabetLayout = (e: LayoutChangeEvent) => {
    const { x, y, height } = e.nativeEvent.layout;
    alphabetLayoutRef.current = { x, y, height };
  };

  const handleAlphabetTouch = useCallback(
    (evt: GestureResponderEvent) => {
      const { locationY } = evt.nativeEvent;
      const { height } = alphabetLayoutRef.current;
      const index = Math.min(
        Math.floor((locationY / height) * ALPHABET.length),
        ALPHABET.length - 1,
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
    },
    [sections],
  );

  const renderFileItem = useCallback(
    ({ item }: { item: FileItem }) => {
      const isSelected = selectedUris.has(item.uri);
      const isNowPlaying = currentFile?.uri === item.uri;
      const itemColor = item.artColor || primaryColor;
      return (
        <TouchableOpacity
          className="flex-row items-center gap-3 px-4 py-2.5"
          style={[
            isSelected && {
              backgroundColor: `${primaryColor}10`,
              borderRadius: 8,
            },
            isNowPlaying && {
              backgroundColor: `${primaryColor}08`,
              borderRadius: 8,
              borderLeftWidth: 3,
              borderLeftColor: primaryColor,
              paddingLeft: 12,
            },
          ]}
          onPress={() => navigateToFile(item)}
          onLongPress={() => handleLongPress(item)}
          delayLongPress={400}
        >
          {isSelected && (
            <CheckCircle size={18} color={primaryColor} weight="fill" />
          )}
          <View
            className="h-11 w-11 items-center justify-center overflow-hidden rounded-xl"
            style={[
              { backgroundColor: `${itemColor}20` },
              isNowPlaying && { borderWidth: 1.5, borderColor: primaryColor },
            ]}
          >
            {item.thumbnail ? (
              <Image
                source={{ uri: item.thumbnail }}
                className="h-11 w-11 rounded-xl"
              />
            ) : (
              <Image
                source={require("../assets/note.png")}
                style={{
                  width: 22,
                  height: 22,
                  tintColor: isNowPlaying ? primaryColor : itemColor,
                }}
              />
            )}
          </View>
          <View className="flex-1">
            <ThemedText
              variant="body"
              style={{
                color: isNowPlaying ? primaryColor : textColor,
                fontWeight: "600",
              }}
              numberOfLines={1}
            >
              {item.name}
            </ThemedText>
            <View className="mt-[2px] flex-row items-center gap-1.5">
              <ThemedText
                variant="caption"
                style={{ color: isNowPlaying ? primaryColor : mutedColor }}
                numberOfLines={1}
              >
                {item.artist || "Unknown"}
              </ThemedText>
              {item.hasLyrics && (
                <View
                  className="flex-row items-center gap-[3px] rounded-md px-1.5 py-0.5"
                  style={{ backgroundColor: `${primaryColor}20` }}
                >
                  <Microphone size={10} color={primaryColor} weight="fill" />
                  <ThemedText
                    variant="label"
                    color={primaryColor}
                    style={{ fontSize: 9 }}
                  >
                    LYRICS
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [
      navigateToFile,
      handleLongPress,
      selectedUris,
      primaryColor,
      textColor,
      mutedColor,
      currentFile,
    ],
  );

  const handleSortSelect = useCallback(
    (field: SortField, direction: SortDirection) => {
      setSortField(field);
      setSortDirection(direction);
    },
    [],
  );

  const renderSectionHeader = useCallback(
    (info: { section: MusicSection }) => (
      <View className="mt-1 px-1 py-1.5">
        <ThemedText variant="label" color={primaryColor}>
          {info.section.title}
        </ThemedText>
      </View>
    ),
    [primaryColor],
  );

  const sortLabelMap: Record<string, string> = {
    name: "Name",
    date: "Date",
    newest: "Newest",
    size: "Size",
    type: "Type",
    duration: "Duration",
    artist: "Artist",
    album: "Album",
    playCount: "Plays",
    recentlyPlayed: "Recent",
  };
  const currentSortLabel = sortLabelMap[sortField] || sortField;

  return (
    <ScreenLayout
      onSortPress={() => setShowSortModal(true)}
      sortLabel={currentSortLabel}
    >
      <View className="mb-2 px-4">
        <ThemedText variant="h1">Music</ThemedText>
      </View>

      <View className="flex-1 flex-row">
        {loading && audio.length === 0 ? (
          <View className="flex-1 px-4 pt-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </View>
        ) : isAlphaSort && sections.length > 0 ? (
          <>
            <SectionList
              ref={sectionListRef}
              sections={sections}
              keyExtractor={(item) => item.uri}
              renderItem={renderFileItem}
              renderSectionHeader={renderSectionHeader}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingBottom: 120,
              }}
              windowSize={7}
              maxToRenderPerBatch={10}
              removeClippedSubviews
              initialNumToRender={15}
              stickySectionHeadersEnabled={false}
            />
            {/* A-Z Scrollbar */}
            <View
              ref={alphabetRef}
              className="absolute bottom-0 right-0.5 top-0 w-[22px] items-center justify-center py-2"
              onLayout={handleAlphabetLayout}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={handleAlphabetTouch}
              onResponderMove={handleAlphabetTouch}
            >
              {ALPHABET.map((letter) => (
                <Text
                  key={letter}
                  className="text-center text-[9px] font-semibold leading-[13px]"
                  style={[
                    selectedSection === letter && {
                      color: primaryColor,
                      fontWeight: "800",
                    },
                    sections.some((s) => s.title === letter)
                      ? { color: textColor }
                      : { color: mutedColor },
                  ]}
                >
                  {letter}
                </Text>
              ))}
            </View>
          </>
        ) : (
          <>
            <FlashList
              ref={flatListRef}
              data={sortedAudio}
              renderItem={renderFileItem}
              keyExtractor={(item: FileItem) => item.uri}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingBottom: 120,
              }}
              showsVerticalScrollIndicator={false}
              onScroll={handleNonAlphaScroll}
              scrollEventThrottle={16}
              ListEmptyComponent={
                <EmptyState
                  icon={
                    <Image
                      source={require("../assets/note.png")}
                      style={{ width: 32, height: 32, tintColor: mutedColor }}
                    />
                  }
                  title="No music found"
                  description="Songs will appear here once your library is scanned"
                />
              }
            />
            <View
              ref={scrollTrackRef}
              className="absolute bottom-2 right-0.5 top-2 w-3 items-center justify-start rounded-md"
              style={{
                backgroundColor: isDarkMode
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.04)",
              }}
              onLayout={(e) => {
                handleScrollTrackLayout(e);
                scrollTrackLayoutRef.current = {
                  y: e.nativeEvent.layout.y,
                  height: e.nativeEvent.layout.height,
                };
              }}
              {...scrollThumbPanResponder.panHandlers}
            >
              <Animated.View
                className="h-10 w-1 rounded-sm opacity-70"
                style={{
                  backgroundColor: primaryColor,
                  transform: [
                    {
                      translateY: thumbAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 200],
                        extrapolate: "clamp",
                      }),
                    },
                  ],
                }}
              />
            </View>
          </>
        )}
      </View>
      <SortModal
        visible={showSortModal}
        onClose={() => setShowSortModal(false)}
        sortField={sortField}
        sortDirection={sortDirection}
        onSelect={handleSortSelect}
        primaryColor={primaryColor}
        textColor={textColor}
        mutedColor={mutedColor}
        isDarkMode={isDarkMode}
      />
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
