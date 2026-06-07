import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Modal,
  ScrollView,
  TextInput,
  Animated,
  Image,
  Share,
  PanResponder,
  StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, LyricsData, MediaMetadata } from '../types';
import {
  DotsThreeVertical,
  ShuffleAngular,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  RepeatOnce,
  VideoCamera,
  MusicNotes,
  SlidersHorizontal,
  Speedometer,
  ShareNetwork,
  EyeSlash,
  Trash,
  Car,
  BatteryCharging,
  Timer,
  Queue,
  Info,
  CaretDown,
  Plus,
  MagnifyingGlass,
} from 'phosphor-react-native';
import { useVisibleAudio } from '../hooks/useVisibleAudio';
import { useAudioPlayback, audioEngine } from '../hooks/useAudioEngine';
import { usePlaylistStore } from '../stores/playlistStore';
import { queueEngine } from '../engine/QueueEngine';
import { AudioEngine } from '../engine/AudioEngine';
import { colorAwarenessEngine } from '../services/ColorAwarenessEngine';
import { useMetadata } from '../hooks/useMetadata';
import { useArtworkColors } from '../hooks/useArtworkColors';
import { LyricsService } from '../services/Lyrics/LyricsService';
import { NeonSlider } from '../components/NeonSlider';
import { ArtworkGlow } from '../components/ArtworkGlow';
import { EdgeLighting } from '../components/EdgeLighting';
import { BottomSheet } from '../services/OverlaySystem';
import { EqualizerScreen } from './EqualizerScreen';
import { QueueList } from '../components/player/QueueList';

type Props = NativeStackScreenProps<RootStackParamList, 'MusicPlayer'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const ART_SIZE = Math.min(SCREEN_WIDTH * 0.85, 360);

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function MarqueeText({
  text,
  textColor,
  fontSize,
  fontWeight,
}: {
  text: string;
  textColor: string;
  fontSize: number;
  fontWeight?: any;
}) {
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const [shouldScroll, setShouldScroll] = useState(false);
  const textRef = useRef<Text>(null);

  useEffect(() => {
    if (!shouldScroll) return;
    scrollAnim.setValue(0);
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scrollAnim, { toValue: -200, duration: 8000, useNativeDriver: true }),
        Animated.timing(scrollAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [shouldScroll, scrollAnim]);

  return (
    <View className="overflow-hidden" style={{ width: '100%' }}>
      <Animated.Text
        ref={textRef}
        onTextLayout={(e) =>
          setShouldScroll(
            e.nativeEvent.lines.length > 0 && e.nativeEvent.lines[0].width > SCREEN_WIDTH * 0.8
          )
        }
        className="text-center"
        style={{
          color: textColor,
          fontSize,
          fontWeight: fontWeight || '700',
          transform: [{ translateX: shouldScroll ? scrollAnim : 0 }],
        }}
        numberOfLines={1}>
        {text}
      </Animated.Text>
    </View>
  );
}

export function MusicPlayerScreen({ navigation, route }: Props) {
  const { file } = route.params;
  const audio = useVisibleAudio();

  const {
    currentFile,
    isPlaying,
    position,
    duration,
    progress,
    queue,
    currentIndex,
    shuffle,
    repeat,
    playbackSpeed,
    playFile,
    togglePlay,
    seekTo,
    skipNext,
    skipPrev,
    setRate,
    cycleRepeat,
    toggleShuffle,
    moveInQueue,
  } = useAudioPlayback();

  const createPlaylist = usePlaylistStore((s) => s.create);
  const addSongsToPlaylist = usePlaylistStore((s) => s.addSongs);
  const playlists = usePlaylistStore((s) => s.playlists);

  const [showQueue, setShowQueue] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [showSpeed, setShowSpeed] = useState(false);
  const [showEq, setShowEq] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showLyricsSearch, setShowLyricsSearch] = useState(false);
  const [showLocalLyrics, setShowLocalLyrics] = useState(false);
  const [lyricsSearchQuery, setLyricsSearchQuery] = useState('');
  const [localLyricsText, setLocalLyricsText] = useState('');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [localArtwork, setLocalArtwork] = useState<string | null>(null);
  const [extractedMeta, setExtractedMeta] = useState<MediaMetadata | null>(null);
  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [drivingMode, setDrivingMode] = useState(false);
  const [powerSaving, setPowerSaving] = useState(false);

  const translateY = useRef(new Animated.Value(0)).current;
  const isAtTop = useRef(true);

  const swipePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 10 && isAtTop.current,
      onPanResponderGrant: () => {
        translateY.setOffset(0);
        translateY.setValue(0);
      },
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) translateY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 100 || (gs.vy > 0.5 && gs.dy > 50)) {
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 250,
            useNativeDriver: true,
          }).start(() => navigation.goBack());
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  const { data: metadata } = useMetadata(file.uri, file.name);

  useEffect(() => {
    if (metadata) {
      setExtractedMeta(metadata);
      if (metadata.artwork) setLocalArtwork(metadata.artwork);
    }
  }, [metadata]);

  useEffect(() => {
    const engine = AudioEngine.getInstance();
    const state = engine.getState();
    if (state.currentFile?.uri === file.uri && state.isPlaying) return;
    const q = audio.length > 0 ? audio : [file];
    const idx = q.findIndex((f) => f.uri === file.uri);
    playFile(file, q, idx >= 0 ? idx : 0);
  }, [file, playFile, audio]);

  const currentItem = queue[currentIndex] || file;
  const artworkUri = currentItem?.thumbnail || localArtwork || null;
  const palette = useArtworkColors(artworkUri);
  const dynamicTextColor = palette.textColor;
  const dynamicMutedColor =
    palette.textColor === '#ffffff' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';

  const buttonIconColor = (() => {
    const r = parseInt(palette.accentColor.slice(1, 3), 16);
    const g = parseInt(palette.accentColor.slice(3, 5), 16);
    const b = parseInt(palette.accentColor.slice(5, 7), 16);
    return r * 0.299 + g * 0.587 + b * 0.114 > 128 ? '#000000' : '#ffffff';
  })();

  const breatheAnim = useRef(new Animated.Value(0)).current;
  const breatheOpacity = breatheAnim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.3] });

  useEffect(() => {
    if (isPlaying) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(breatheAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
          Animated.timing(breatheAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isPlaying, breatheAnim]);

  const handleNext = useCallback(() => skipNext(), [skipNext]);
  const handlePrev = useCallback(() => skipPrev(), [skipPrev]);

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return;
    createPlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
  };

  const handleAddToPlaylist = (pl: any) => {
    addSongsToPlaylist(pl.id, [currentItem || file]);
    setShowAddToPlaylist(false);
  };

  const handleShare = useCallback(async () => {
    if (currentItem) {
      try {
        await Share.share({ title: currentItem.name, message: currentItem.name });
      } catch {}
    }
    setShowMenu(false);
  }, [currentItem]);

  const handleSleepTimer = useCallback(() => {
    setShowMenu(false);
    const engine = AudioEngine.getInstance();
    const st = engine.getSleepTimerState();
    if (st.enabled) engine.disableSleepTimer();
    else engine.enableSleepTimer('minutes', 30);
  }, []);

  const handleHide = useCallback(async () => {
    if (!currentItem) return;
    setShowMenu(false);
    try {
      const { useSettingsStore } = await import('../stores/settingsStore');
      const hidden = useSettingsStore.getState().hiddenFiles;
      const exts = [...(hidden.hideExtensions || []), currentItem.name.split('.').pop() || ''];
      useSettingsStore.getState().updateHiddenFiles({ hideExtensions: [...new Set(exts)] });
    } catch {}
  }, [currentItem]);

  const handleDelete = useCallback(async () => {
    if (!currentItem) return;
    setShowMenu(false);
    try {
      const { StorageService } = await import('../services/StorageService');
      await StorageService.addToRecentlyDeleted(currentItem);
      await StorageService.moveToTrash(currentItem);
    } catch {}
  }, [currentItem]);

  const handleToggleLyrics = useCallback(async () => {
    const next = !showLyrics;
    setShowLyrics(next);
    if (next && !lyricsData && !lyricsLoading) {
      setLyricsLoading(true);
      const title = currentItem?.name.replace(/\.[^.]+$/, '') || '';
      const artist = currentItem?.artist || extractedMeta?.artist || '';
      if (extractedMeta?.lyrics) {
        setLyricsData({
          songId: currentItem?.uri || title,
          title,
          artist,
          lyrics: extractedMeta.lyrics,
          syncedLyrics: extractedMeta.syncedLyrics || [],
          source: 'embedded',
          cachedAt: Date.now(),
        });
      } else {
        const local = await LyricsService.loadLocalLrc(currentItem?.uri || '');
        if (local) setLyricsData(local);
        else if (artist) {
          const remote = await LyricsService.fetchLyrics(title, artist);
          setLyricsData(remote);
        }
      }
      setLyricsLoading(false);
    }
  }, [showLyrics, lyricsData, lyricsLoading, currentItem, extractedMeta]);

  const handleLyricsSearch = useCallback(async () => {
    if (!lyricsSearchQuery.trim()) return;
    setLyricsLoading(true);
    const parts = lyricsSearchQuery.split(' - ');
    const artist = parts.length > 1 ? parts[0].trim() : '';
    const title = parts.length > 1 ? parts.slice(1).join(' - ').trim() : lyricsSearchQuery.trim();
    const result = await LyricsService.fetchLyrics(title, artist);
    if (result.lyrics) {
      setLyricsData(result);
      setShowLyricsSearch(false);
      setLyricsSearchQuery('');
    }
    setLyricsLoading(false);
  }, [lyricsSearchQuery]);

  const handleSaveLocalLyrics = useCallback(() => {
    if (!localLyricsText.trim()) return;
    const title = currentItem?.name.replace(/\.[^.]+$/, '') || '';
    const artist = currentItem?.artist || extractedMeta?.artist || '';
    const synced: { time: number; text: string }[] = [];
    const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
    for (const line of localLyricsText.split('\n')) {
      const match = regex.exec(line);
      if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseInt(match[2]);
        const millis = parseInt(match[3].padEnd(3, '0'));
        const time = minutes * 60000 + seconds * 1000 + millis;
        const text = line.replace(regex, '').trim();
        if (text) synced.push({ time, text });
      }
    }
    synced.sort((a, b) => a.time - b.time);
    const plainText = synced.length > 0 ? synced.map((s) => s.text).join('\n') : localLyricsText;
    const data: LyricsData = {
      songId: currentItem?.uri || title,
      title,
      artist,
      lyrics: plainText,
      syncedLyrics: synced,
      source: 'lrc',
      cachedAt: Date.now(),
    };
    LyricsService.cache(data);
    setLyricsData(data);
    setShowLocalLyrics(false);
    setLocalLyricsText('');
  }, [localLyricsText, currentItem, extractedMeta]);

  const handleStopAndClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const menuItems = useMemo(
    () => [
      {
        icon: MusicNotes,
        label: 'Add to Playlist',
        action: () => {
          setShowMenu(false);
          setShowAddToPlaylist(true);
        },
      },
      { icon: ShareNetwork, label: 'Share', action: handleShare },
      {
        icon: Speedometer,
        label: 'Speed',
        action: () => {
          setShowMenu(false);
          setShowSpeed(true);
        },
      },
      { icon: EyeSlash, label: 'Hide', action: handleHide },
      { icon: Trash, label: 'Delete', action: handleDelete },
      {
        icon: Car,
        label: 'Driving Mode',
        action: () => {
          setDrivingMode(!drivingMode);
          setShowMenu(false);
        },
        active: drivingMode,
      },
      {
        icon: BatteryCharging,
        label: 'Power Saving Mode',
        action: () => {
          setPowerSaving(!powerSaving);
          setShowMenu(false);
        },
        active: powerSaving,
      },
      { icon: Timer, label: 'Sleep Timer', action: handleSleepTimer },
    ],
    [handleShare, handleHide, handleDelete, drivingMode, powerSaving, handleSleepTimer]
  );

  const quickActions = useMemo(
    () => [
      { icon: Queue, label: 'Queue', onPress: () => setShowQueue(true) },
      { icon: 'lyrics', label: 'Lyrics', onPress: handleToggleLyrics, active: showLyrics },
      { icon: SlidersHorizontal, label: 'Equalizer', onPress: () => setShowEq(true) },
      { icon: Info, label: 'Details', onPress: () => setShowDetails(true) },
    ],
    [handleToggleLyrics, showLyrics]
  );

  const isVideo = currentItem?.type === 'video';
  const trackTitle = currentItem?.name || file.name;
  const trackArtist =
    currentItem?.artist || extractedMeta?.artist || (isVideo ? 'Video (Audio Mode)' : 'Local File');

  const renderBg = () => (
    <View className="absolute inset-0">
      {artworkUri ? (
        <>
          <Image source={{ uri: artworkUri }} style={StyleSheet.absoluteFill} blurRadius={80} />
          <Animated.View
            className="absolute inset-0"
            style={{ backgroundColor: palette.background, opacity: breatheOpacity }}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: palette.isDark ? `rgba(0,0,0,0.3)` : `rgba(255,255,255,0.25)`,
              },
            ]}
          />
        </>
      ) : (
        <View className="h-full w-full" style={{ backgroundColor: palette.background }} />
      )}
    </View>
  );

  const renderTopBar = () => (
    <View className="flex-row items-center justify-between px-5 pb-2" style={{ paddingTop: 54 }}>
      <TouchableOpacity
        onPress={handleStopAndClose}
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
        accessibilityLabel="Close player"
        accessibilityRole="button">
        <CaretDown size={22} color={dynamicTextColor} weight="bold" />
      </TouchableOpacity>
      <Text
        className="text-sm font-semibold uppercase tracking-wider"
        style={{ color: dynamicMutedColor }}>
        Now Playing
      </Text>
      <TouchableOpacity
        onPress={() => setShowMenu(true)}
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
        accessibilityLabel="More options"
        accessibilityRole="button">
        <DotsThreeVertical size={22} color={dynamicTextColor} weight="bold" />
      </TouchableOpacity>
    </View>
  );

  const renderArtwork = () => (
    <View className="items-center justify-center" style={{ marginTop: 8, marginBottom: 20 }}>
      <ArtworkGlow
        color={palette.accentColor}
        radius={40}
        animated={isPlaying}
        pulseInterval={colorAwarenessEngine.getTransitionDuration() * 6}>
        <View
          className="overflow-hidden"
          style={{
            width: showLyrics ? ART_SIZE * 0.5 : ART_SIZE,
            height: showLyrics ? ART_SIZE * 0.5 : ART_SIZE,
            borderRadius: 28,
          }}>
          {artworkUri ? (
            <Image source={{ uri: artworkUri }} className="h-full w-full" />
          ) : (
            <View
              className="h-full w-full items-center justify-center"
              style={{ backgroundColor: `${palette.primary}25` }}>
              {isVideo ? (
                <VideoCamera size={64} color={palette.primary} weight="bold" />
              ) : (
                <Image
                  source={require('../assets/note.png')}
                  style={{ width: 64, height: 64, tintColor: palette.primary }}
                />
              )}
            </View>
          )}
        </View>
      </ArtworkGlow>
    </View>
  );

  const renderSongInfo = () => (
    <View className="mb-4 items-center px-8">
      <MarqueeText text={trackTitle} textColor={dynamicTextColor} fontSize={28} fontWeight="700" />
      <View className="mt-1.5 flex-row items-center gap-2">
        <Text
          className="text-center"
          style={{ color: dynamicMutedColor, fontSize: 17, opacity: 0.8 }}
          numberOfLines={1}>
          {trackArtist}
        </Text>
        {extractedMeta?.album ? (
          <>
            <Text style={{ color: dynamicMutedColor, fontSize: 14 }}>•</Text>
            <Text
              style={{ color: dynamicMutedColor, fontSize: 15, opacity: 0.7 }}
              numberOfLines={1}>
              {extractedMeta.album}
            </Text>
          </>
        ) : null}
      </View>
    </View>
  );

  const seekBack10 = useCallback(() => {
    seekTo(Math.max(0, progress - 10 / (duration || 1)));
  }, [progress, duration, seekTo]);

  const seekFwd10 = useCallback(() => {
    seekTo(Math.min(1, progress + 10 / (duration || 1)));
  }, [progress, duration, seekTo]);

  const renderProgress = () => (
    <View className="mb-5 px-8">
      <View className="flex-row items-center gap-3">
        <TouchableOpacity
          onPress={seekBack10}
          hitSlop={16}
          className="h-8 w-8 items-center justify-center"
          accessibilityLabel="Seek back 10 seconds"
          accessibilityRole="button">
          <Text style={{ color: dynamicMutedColor, fontSize: 16, fontWeight: '700' }}>
            {'\u23EE'}
          </Text>
        </TouchableOpacity>
        <View className="flex-1">
          <NeonSlider
            progress={progress}
            onSeek={seekTo}
            onSeekStart={() => {}}
            onSeekEnd={() => {}}
            width={SCREEN_WIDTH - 128}
            primaryColor={palette.accentColor}
            secondaryColor={palette.secondary}
            bufferColor={palette.primary + '40'}
            height={4}
            showThumb
          />
        </View>
        <TouchableOpacity
          onPress={seekFwd10}
          hitSlop={16}
          className="h-8 w-8 items-center justify-center"
          accessibilityLabel="Seek forward 10 seconds"
          accessibilityRole="button">
          <Text style={{ color: dynamicMutedColor, fontSize: 16, fontWeight: '700' }}>
            {'\u23ED'}
          </Text>
        </TouchableOpacity>
      </View>
      <View className="mt-1.5 flex-row justify-between">
        <Text style={{ color: dynamicMutedColor, fontSize: 12, fontWeight: '500' }}>
          {formatTime(position)}
        </Text>
        <Text style={{ color: dynamicMutedColor, fontSize: 12, fontWeight: '500' }}>
          {formatTime(duration)}
        </Text>
      </View>
    </View>
  );

  const renderControls = () => (
    <View className="mb-6 flex-row items-center justify-center gap-6">
      <TouchableOpacity
        onPress={toggleShuffle}
        className="h-10 w-10 items-center justify-center"
        accessibilityLabel="Toggle shuffle"
        accessibilityRole="button">
        <ShuffleAngular
          size={20}
          color={shuffle ? palette.accentColor : dynamicMutedColor}
          weight={shuffle ? 'fill' : 'regular'}
        />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handlePrev}
        className="h-12 w-12 items-center justify-center"
        accessibilityLabel="Previous track"
        accessibilityRole="button">
        <SkipBack size={26} color={dynamicTextColor} weight="fill" />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={togglePlay}
        className="items-center justify-center"
        accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        accessibilityRole="button"
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: palette.accentColor,
          shadowColor: palette.accentColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.45,
          shadowRadius: 20,
          elevation: 8,
        }}>
        {isPlaying ? (
          <Pause size={34} color={buttonIconColor} weight="fill" />
        ) : (
          <Play size={34} color={buttonIconColor} weight="fill" />
        )}
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleNext}
        className="h-12 w-12 items-center justify-center"
        accessibilityLabel="Next track"
        accessibilityRole="button">
        <SkipForward size={26} color={dynamicTextColor} weight="fill" />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={cycleRepeat}
        className="h-10 w-10 items-center justify-center"
        accessibilityLabel="Toggle repeat"
        accessibilityRole="button">
        {repeat === 'one' ? (
          <RepeatOnce size={20} color={palette.accentColor} weight="fill" />
        ) : repeat === 'all' ? (
          <Repeat size={20} color={palette.accentColor} weight="fill" />
        ) : (
          <Repeat size={20} color={dynamicMutedColor} weight="regular" />
        )}
      </TouchableOpacity>
    </View>
  );

  const renderQuickActions = () => (
    <View className="flex-row justify-center gap-3 px-8">
      {quickActions.map((action, i) => (
        <TouchableOpacity
          key={i}
          onPress={action.onPress}
          className="flex-1 flex-row items-center justify-center gap-1.5 py-3"
          style={{
            borderRadius: 24,
            backgroundColor: action.active ? `${palette.accentColor}25` : 'rgba(255,255,255,0.08)',
            borderWidth: action.active ? 1 : 0,
            borderColor: action.active ? palette.accentColor : 'transparent',
          }}>
          {action.icon === 'lyrics' ? (
            <Image
              source={require('../assets/lyrics.png')}
              style={{
                width: 16,
                height: 16,
                tintColor: action.active ? palette.accentColor : dynamicMutedColor,
              }}
            />
          ) : (
            (() => {
              const Icon = action.icon as React.ComponentType<{
                size: number;
                color: string;
                weight: string;
              }>;
              return (
                <Icon
                  size={16}
                  color={action.active ? palette.accentColor : dynamicMutedColor}
                  weight={action.active ? 'fill' : 'regular'}
                />
              );
            })()
          )}
          <Text
            style={{
              color: action.active ? palette.accentColor : dynamicMutedColor,
              fontSize: 12,
              fontWeight: '600',
            }}>
            {action.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const lyricsRef = useRef<ScrollView>(null);
  const [activeLyricsIdx, setActiveLyricsIdx] = useState(-1);

  const currentLyricsIdx = useMemo(() => {
    if (!lyricsData?.syncedLyrics || lyricsData.syncedLyrics.length === 0) return -1;
    const posMs = position * 1000;
    let idx = -1;
    for (let i = 0; i < lyricsData.syncedLyrics.length; i++) {
      if (lyricsData.syncedLyrics[i].time <= posMs) idx = i;
      else break;
    }
    return idx;
  }, [lyricsData, position]);

  useEffect(() => {
    if (currentLyricsIdx >= 0 && currentLyricsIdx !== activeLyricsIdx) {
      setActiveLyricsIdx(currentLyricsIdx);
      lyricsRef.current?.scrollTo?.({ y: currentLyricsIdx * 36, animated: true });
    }
  }, [currentLyricsIdx, activeLyricsIdx]);

  const renderLyricsView = () => {
    if (!showLyrics) return null;
    const hasSynced = lyricsData?.syncedLyrics && lyricsData.syncedLyrics.length > 0;
    const plainLines = lyricsData?.lyrics?.split('\n') || [];

    return (
      <Animated.View className="flex-1 px-6" style={{ marginTop: 12 }}>
        <View className="mb-3 flex-row items-center justify-end gap-3">
          <TouchableOpacity
            className="h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: `${palette.accentColor}18` }}
            onPress={() => {
              setLyricsSearchQuery(currentItem?.name.replace(/\.[^.]+$/, '') || '');
              setShowLyricsSearch(true);
            }}
            accessibilityLabel="Search lyrics online"
            accessibilityRole="button">
            <MagnifyingGlass size={16} color={palette.accentColor} />
          </TouchableOpacity>
          <TouchableOpacity
            className="h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: `${palette.accentColor}18` }}
            onPress={() => setShowLocalLyrics(true)}
            accessibilityLabel="Paste local lyrics"
            accessibilityRole="button">
            <Plus size={16} color={palette.accentColor} />
          </TouchableOpacity>
        </View>

        {lyricsLoading ? (
          <View className="items-center py-10">
            <Text style={{ color: dynamicMutedColor, fontSize: 15 }}>Loading lyrics...</Text>
          </View>
        ) : hasSynced ? (
          <ScrollView
            ref={lyricsRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}>
            {lyricsData!.syncedLyrics.map((line, idx) => {
              const isCurrent = idx === activeLyricsIdx;
              return (
                <Text
                  key={idx}
                  style={{
                    color: isCurrent ? dynamicTextColor : dynamicMutedColor,
                    fontSize: isCurrent ? 24 : 16,
                    fontWeight: isCurrent ? '700' : '400',
                    opacity: isCurrent ? 1 : 0.45,
                    lineHeight: isCurrent ? 36 : 28,
                    marginBottom: 8,
                  }}>
                  {line.text || '\u00A0'}
                </Text>
              );
            })}
          </ScrollView>
        ) : plainLines.length > 0 ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}>
            {plainLines.map((line, idx) => (
              <Text
                key={idx}
                style={{
                  color: dynamicMutedColor,
                  fontSize: 16,
                  lineHeight: 28,
                  marginBottom: 8,
                }}>
                {line || '\u00A0'}
              </Text>
            ))}
          </ScrollView>
        ) : (
          <View className="items-center gap-3 py-10">
            <Image
              source={require('../assets/lyrics.png')}
              style={{ width: 36, height: 36, tintColor: palette.accentColor }}
            />
            <Text style={{ color: dynamicMutedColor, fontSize: 14, textAlign: 'center' }}>
              No lyrics available.{'\n'}Tap + to paste or search.
            </Text>
          </View>
        )}
      </Animated.View>
    );
  };

  return (
    <EdgeLighting enabled={!!artworkUri} opacity={0.06}>
      <View className="flex-1" style={{ backgroundColor: palette.background }}>
        <Animated.View
          className="flex-1"
          style={{ transform: [{ translateY }] }}
          {...swipePanResponder.panHandlers}>
          {renderBg()}

          <View className="flex-1">
            {renderTopBar()}

            <ScrollView
              className="flex-1"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ flexGrow: 1 }}
              scrollEventThrottle={16}
              onScroll={(e) => {
                isAtTop.current = e.nativeEvent.contentOffset.y <= 0;
              }}>
              <View className="flex-1 justify-between">
                {showLyrics ? (
                  <View className="flex-1">
                    {renderArtwork()}
                    {renderLyricsView()}
                  </View>
                ) : (
                  <View className="flex-1 justify-center" style={{ marginTop: -20 }}>
                    {renderArtwork()}
                    {renderSongInfo()}
                  </View>
                )}
              </View>
            </ScrollView>

            {!showLyrics && (
              <View className="pb-8" style={{ paddingBottom: 32 }}>
                {renderProgress()}
                {renderControls()}
                {renderQuickActions()}
              </View>
            )}
          </View>
        </Animated.View>

        {showLyrics && (
          <View className="px-5 pb-6" style={{ paddingBottom: 24 }}>
            {renderProgress()}
            {renderControls()}
            {renderQuickActions()}
          </View>
        )}

        <BottomSheet visible={showMenu} onClose={() => setShowMenu(false)}>
          <View className="px-4">
            {menuItems.map((item, i) => (
              <TouchableOpacity
                key={i}
                className="flex-row items-center rounded-xl px-2 py-3.5 active:opacity-70"
                onPress={item.action}>
                <View
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${palette.accentColor}15` }}>
                  <item.icon
                    size={20}
                    color={item.active ? palette.accentColor : dynamicMutedColor}
                    weight={item.active ? 'fill' : 'bold'}
                  />
                </View>
                <Text className="ml-3 text-[15px]" style={{ color: dynamicTextColor }}>
                  {item.label}
                </Text>
                {'active' in item && item.active ? (
                  <View
                    className="ml-auto h-2 w-2 rounded-full"
                    style={{ backgroundColor: palette.accentColor }}
                  />
                ) : null}
                {item.label === 'Sleep Timer' ? (
                  <Text className="ml-auto text-xs" style={{ color: dynamicMutedColor }}>
                    {AudioEngine.getInstance().getSleepTimerState().enabled ? 'ON' : 'OFF'}
                  </Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        </BottomSheet>

        {/* Queue Sheet */}
        <BottomSheet visible={showQueue} onClose={() => setShowQueue(false)}>
          <View className="flex-1">
            <View className="px-5 pb-4 pt-2">
              <Text className="text-xl font-extrabold" style={{ color: dynamicTextColor }}>
                Queue ({queue.length})
              </Text>
            </View>
            <View
              className="flex-row items-center justify-center gap-6 px-5 py-3"
              style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
              <TouchableOpacity
                className="flex-row items-center gap-2 rounded-xl px-4 py-2"
                style={{
                  backgroundColor: shuffle ? `${palette.accentColor}20` : 'rgba(255,255,255,0.08)',
                }}
                onPress={toggleShuffle}>
                <ShuffleAngular
                  size={18}
                  color={shuffle ? palette.accentColor : dynamicMutedColor}
                  weight={shuffle ? 'bold' : 'regular'}
                />
                <Text
                  className="text-sm font-semibold"
                  style={{ color: shuffle ? palette.accentColor : dynamicMutedColor }}>
                  Shuffle
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center gap-2 rounded-xl px-4 py-2"
                style={{
                  backgroundColor:
                    repeat !== 'none' ? `${palette.accentColor}20` : 'rgba(255,255,255,0.08)',
                }}
                onPress={cycleRepeat}>
                {repeat === 'one' ? (
                  <RepeatOnce size={18} color={palette.accentColor} weight="bold" />
                ) : (
                  <Repeat
                    size={18}
                    color={repeat !== 'none' ? palette.accentColor : dynamicMutedColor}
                    weight={repeat !== 'none' ? 'bold' : 'regular'}
                  />
                )}
                <Text
                  className="text-sm font-semibold"
                  style={{ color: repeat !== 'none' ? palette.accentColor : dynamicMutedColor }}>
                  {repeat === 'one' ? 'Repeat One' : repeat === 'all' ? 'Repeat All' : 'Repeat'}
                </Text>
              </TouchableOpacity>
            </View>
            <QueueList
              items={queue}
              currentIndex={currentIndex}
              isPlaying={isPlaying}
              primaryColor={palette.accentColor}
              currentFile={currentFile}
              dynamicTextColor={dynamicTextColor}
              dynamicMutedColor={dynamicMutedColor}
              onPlayIndex={(index) => {
                audioEngine.playIndex(index);
              }}
              onRemove={(index) => {
                queueEngine.removeFromQueue(index, 'audio');
              }}
              onMove={moveInQueue}
            />
          </View>
        </BottomSheet>

        {/* Add to Playlist Modal */}
        <Modal visible={showAddToPlaylist} transparent animationType="fade">
          <TouchableOpacity
            className="flex-1 items-center justify-center bg-black/70"
            onPress={() => setShowAddToPlaylist(false)}>
            <View
              className="w-[85%] max-w-[360px] rounded-[28px] p-6"
              style={{
                borderWidth: 1,
                borderColor: palette.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                backgroundColor: palette.isDark ? '#27272a' : '#ffffff',
              }}>
              <Text
                className="mb-4 text-center text-lg font-extrabold"
                style={{ color: dynamicTextColor }}>
                Add to Playlist
              </Text>
              <View className="mb-4 flex-row gap-2.5">
                <TextInput
                  className="flex-1 rounded-xl px-3.5 py-3 text-sm"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: dynamicTextColor }}
                  placeholder="New playlist name"
                  placeholderTextColor={dynamicMutedColor}
                  value={newPlaylistName}
                  onChangeText={setNewPlaylistName}
                />
                <TouchableOpacity
                  className="justify-center rounded-xl px-4"
                  style={{ backgroundColor: palette.accentColor }}
                  onPress={handleCreatePlaylist}>
                  <Text
                    className="text-sm font-bold"
                    style={{ color: palette.isDark ? '#ffffff' : '#000000' }}>
                    Create
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView className="mb-4 max-h-[200px]">
                {playlists.map((pl) => (
                  <TouchableOpacity
                    key={pl.id}
                    className="flex-row items-center border-b border-white/[0.06] py-3"
                    onPress={() => handleAddToPlaylist(pl)}>
                    <MusicNotes size={20} color={dynamicMutedColor} />
                    <View className="ml-3 flex-1">
                      <Text className="mb-0.5 text-[15px]" style={{ color: dynamicTextColor }}>
                        {pl.name}
                      </Text>
                      <Text className="text-xs" style={{ color: dynamicMutedColor }}>
                        {pl.totalTracks} songs
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {playlists.length === 0 && (
                  <Text className="py-5 text-center text-sm" style={{ color: dynamicMutedColor }}>
                    No playlists yet
                  </Text>
                )}
              </ScrollView>
              <TouchableOpacity
                className="items-center rounded-xl py-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                onPress={() => setShowAddToPlaylist(false)}>
                <Text className="text-[15px] font-bold" style={{ color: dynamicTextColor }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Speed Modal */}
        <Modal visible={showSpeed} transparent animationType="fade">
          <TouchableOpacity
            className="flex-1 items-center justify-center bg-black/70"
            onPress={() => setShowSpeed(false)}>
            <View
              className="w-[80%] max-w-[320px] rounded-[28px] p-6"
              style={{ backgroundColor: palette.isDark ? '#27272a' : '#ffffff' }}>
              <Text
                className="mb-4 text-center text-lg font-extrabold"
                style={{ color: dynamicTextColor }}>
                Playback Speed
              </Text>
              <View className="flex-row flex-wrap justify-center gap-2">
                {SPEEDS.map((speed) => (
                  <TouchableOpacity
                    key={speed}
                    className="rounded-xl border px-4 py-3"
                    style={[
                      playbackSpeed === speed && { backgroundColor: palette.accentColor },
                      {
                        borderColor:
                          playbackSpeed === speed ? palette.accentColor : 'rgba(255,255,255,0.15)',
                      },
                    ]}
                    onPress={() => {
                      setRate(speed);
                      setShowSpeed(false);
                    }}>
                    <Text
                      className="text-center text-sm"
                      style={[
                        playbackSpeed === speed && {
                          color: palette.isDark ? '#ffffff' : '#000000',
                          fontWeight: '700',
                        },
                        { color: dynamicTextColor },
                      ]}>
                      {speed}x
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* EQ Screen */}
        <EqualizerScreen visible={showEq} onClose={() => setShowEq(false)} />

        {/* Lyrics Search Modal */}
        <Modal visible={showLyricsSearch} transparent animationType="fade">
          <TouchableOpacity
            className="flex-1 items-center justify-center bg-black/70"
            onPress={() => setShowLyricsSearch(false)}>
            <View
              className="w-[85%] max-w-[360px] rounded-[28px] p-6"
              style={{
                borderWidth: 1,
                borderColor: palette.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                backgroundColor: palette.isDark ? '#27272a' : '#ffffff',
              }}>
              <Text
                className="mb-4 text-center text-lg font-extrabold"
                style={{ color: dynamicTextColor }}>
                Search Lyrics
              </Text>
              <TextInput
                className="mb-4 rounded-xl px-3.5 py-3 text-sm"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: dynamicTextColor,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                }}
                placeholder="Artist - Title"
                placeholderTextColor={dynamicMutedColor}
                value={lyricsSearchQuery}
                onChangeText={setLyricsSearchQuery}
                autoFocus
                selectTextOnFocus
              />
              <Text className="mb-4 text-xs" style={{ color: dynamicMutedColor }}>
                Format: &quot;Artist - Title&quot; or just title
              </Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 items-center rounded-xl py-3"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                  onPress={() => setShowLyricsSearch(false)}>
                  <Text className="text-[15px] font-bold" style={{ color: dynamicTextColor }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 items-center rounded-xl py-3"
                  style={{ backgroundColor: palette.accentColor }}
                  onPress={handleLyricsSearch}>
                  <Text
                    className="text-[15px] font-bold"
                    style={{ color: palette.isDark ? '#ffffff' : '#000000' }}>
                    {lyricsLoading ? 'Searching...' : 'Search'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Local Lyrics Input Modal */}
        <Modal visible={showLocalLyrics} transparent animationType="fade">
          <TouchableOpacity
            className="flex-1 items-center justify-center bg-black/70"
            activeOpacity={1}
            onPress={() => setShowLocalLyrics(false)}>
            <TouchableOpacity
              activeOpacity={1}
              className="w-[90%] max-w-[400px] rounded-[28px] p-6"
              style={{
                borderWidth: 1,
                borderColor: palette.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                backgroundColor: palette.isDark ? '#27272a' : '#ffffff',
              }}>
              <Text
                className="mb-2 text-center text-lg font-extrabold"
                style={{ color: dynamicTextColor }}>
                Paste Lyrics
              </Text>
              <Text className="mb-4 text-center text-xs" style={{ color: dynamicMutedColor }}>
                Supports plain text or LRC format with timestamps
              </Text>
              <TextInput
                className="mb-4 rounded-xl px-3.5 py-3 text-sm"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: dynamicTextColor,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                  height: 180,
                  textAlignVertical: 'top',
                }}
                placeholder="[00:12.34] Paste lyrics here..."
                placeholderTextColor={dynamicMutedColor}
                value={localLyricsText}
                onChangeText={setLocalLyricsText}
                multiline
                autoFocus
              />
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 items-center rounded-xl py-3"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                  onPress={() => {
                    setShowLocalLyrics(false);
                    setLocalLyricsText('');
                  }}>
                  <Text className="text-[15px] font-bold" style={{ color: dynamicTextColor }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 items-center rounded-xl py-3"
                  style={{ backgroundColor: palette.accentColor }}
                  onPress={handleSaveLocalLyrics}>
                  <Text
                    className="text-[15px] font-bold"
                    style={{ color: palette.isDark ? '#ffffff' : '#000000' }}>
                    Save
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Details Sheet */}
        <BottomSheet
          visible={showDetails}
          onClose={() => setShowDetails(false)}
          title="Track Details">
          <View className="px-5 pb-6">
            {artworkUri && (
              <View className="mb-5 items-center">
                <Image
                  source={{ uri: artworkUri }}
                  className="h-24 w-24 rounded-2xl"
                  style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}
                />
              </View>
            )}
            {[
              { label: 'Title', value: trackTitle },
              { label: 'Artist', value: trackArtist },
              { label: 'Album', value: extractedMeta?.album || '-' },
              { label: 'Genre', value: extractedMeta?.genre || '-' },
              { label: 'Year', value: extractedMeta?.year?.toString() || '-' },
              { label: 'Composer', value: extractedMeta?.composer || '-' },
              { label: 'Duration', value: formatTime(duration) },
              {
                label: 'Bitrate',
                value: extractedMeta?.bitrate ? `${extractedMeta.bitrate} kbps` : '-',
              },
              {
                label: 'Sample Rate',
                value: extractedMeta?.sampleRate ? `${extractedMeta.sampleRate} Hz` : '-',
              },
              { label: 'File', value: currentItem?.name || file.name },
            ].map((item, i) => (
              <View
                key={i}
                className="flex-row justify-between border-b py-3"
                style={{ borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                <Text style={{ color: dynamicMutedColor, fontSize: 13, fontWeight: '500' }}>
                  {item.label}
                </Text>
                <Text
                  style={{
                    color: dynamicTextColor,
                    fontSize: 13,
                    fontWeight: '600',
                    maxWidth: '60%',
                    textAlign: 'right',
                  }}
                  numberOfLines={1}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </BottomSheet>
      </View>
    </EdgeLighting>
  );
}

// QueueList moved to components/player/QueueList.tsx
