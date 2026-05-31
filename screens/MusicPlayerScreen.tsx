import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Modal,
  ScrollView,
  FlatList,
  TextInput,
  Animated,
  Image,
  Share,
  PanResponder,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import {
  CaretLeft,
  List,
  Heart,
  DotsThreeVertical,
  ShuffleAngular,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  RepeatOnce,
  VideoCamera,
  MusicNote,
  X,
  MusicNotes,
  SlidersHorizontal,
  Speedometer,
  MicrophoneStage,
  ShareNetwork,
  EyeSlash,
  Trash,
  Car,
  BatteryCharging,
  Timer,
  Bell,
  BellSimple,
} from 'phosphor-react-native';
import { useVisibleAudio } from '../hooks/useVisibleAudio';
import { useFavorites } from '../hooks/useFavorites';
import { useTheme } from '../context/ThemeContext';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { usePlaylistStore } from '../stores/playlistStore';
import { fileEngine } from '../engine/FileEngine';
import { queueEngine } from '../engine/QueueEngine';
import { AudioEngine } from '../engine/AudioEngine';
import { usePlaybackStore } from '../stores/playbackStore';
import { MetadataService } from '../services/Metadata/MetadataService';
import { LyricsService } from '../services/Lyrics/LyricsService';
import type { FileItem, LyricsData, MediaMetadata } from '../types';
import { NeonSlider } from '../components/NeonSlider';
import { BottomSheet } from '../services/OverlaySystem';

type Props = NativeStackScreenProps<RootStackParamList, 'MusicPlayer'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function MusicPlayerScreen({ navigation, route }: Props) {
  const { file } = route.params;
  const { primaryColor, textColor, mutedColor, isDarkMode, cardBg } = useTheme();
  const audio = useVisibleAudio();
  const { toggleFavorite, isFavorite } = useFavorites([]);

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

  const playlistStore = usePlaylistStore();

  const [showQueue, setShowQueue] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [showSpeed, setShowSpeed] = useState(false);
  const [showEq, setShowEq] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [localArtwork, setLocalArtwork] = useState<string | null>(null);
  const [extractedMeta, setExtractedMeta] = useState<MediaMetadata | null>(null);
  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [drivingMode, setDrivingMode] = useState(false);
  const [powerSaving, setPowerSaving] = useState(false);

  const translateY = useRef(new Animated.Value(0)).current;
  const isAtTop = useRef(true);
  const scrollOffset = useRef(0);

  const swipePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 10 && isAtTop.current,
      onPanResponderGrant: () => {
        translateY.setOffset(0);
        translateY.setValue(0);
      },
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) {
          translateY.setValue(gs.dy);
        }
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
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const translateMenuY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const menuPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 10,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) {
          translateMenuY.setValue(gs.dy);
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80) {
          Animated.timing(translateMenuY, {
            toValue: SCREEN_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setShowMenu(false);
            translateMenuY.setValue(SCREEN_HEIGHT);
          });
        } else {
          Animated.spring(translateMenuY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateMenuY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const prevShowMenu = useRef(showMenu);
  useEffect(() => {
    if (showMenu && !prevShowMenu.current) {
      translateMenuY.setValue(SCREEN_HEIGHT);
      Animated.spring(translateMenuY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    }
    prevShowMenu.current = showMenu;
  }, [showMenu, translateMenuY]);

  const pulseAnim = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    MetadataService.extract(file.uri, file.name).then((meta) => {
      setExtractedMeta(meta);
      if (meta.artwork) setLocalArtwork(meta.artwork);
    });
  }, [file.uri, file.name]);

  useEffect(() => {
    const engine = AudioEngine.getInstance();
    const state = engine.getState();
    if (state.currentFile?.uri === file.uri && state.isPlaying) {
      return;
    }
    const q = audio.length > 0 ? audio : [file];
    const idx = q.findIndex((f) => f.uri === file.uri);
    playFile(file, q, idx >= 0 ? idx : 0);
  }, [file, playFile]);

  useEffect(() => {
    if (isPlaying) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isPlaying, pulseAnim]);

  const currentItem = queue[currentIndex] || file;
  const artColor = currentItem?.artColor || primaryColor;
  const isVideo = currentItem?.type === 'video';
  const isFav = currentItem ? isFavorite(currentItem.uri) : false;

  const handleNext = useCallback(() => skipNext(), [skipNext]);
  const handlePrev = useCallback(() => skipPrev(), [skipPrev]);

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return;
    playlistStore.create(newPlaylistName.trim());
    setNewPlaylistName('');
  };

  const handleAddToPlaylist = (pl: any) => {
    playlistStore.addSongs(pl.id, [currentItem || file]);
    setShowAddToPlaylist(false);
  };

  const handleToggleFavorite = useCallback(async () => {
    if (currentItem) {
      await toggleFavorite(currentItem.uri);
    }
  }, [currentItem, toggleFavorite]);

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
    if (st.enabled) {
      engine.disableSleepTimer();
    } else {
      engine.enableSleepTimer('minutes', 30);
    }
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
        if (local) {
          setLyricsData(local);
        } else if (artist) {
          const remote = await LyricsService.fetchLyrics(title, artist);
          setLyricsData(remote);
        }
      }
      setLyricsLoading(false);
    }
  }, [showLyrics, lyricsData, lyricsLoading, currentItem, extractedMeta]);

  const handleStopAndClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.3] });

  const menuItems = [
    {
      icon: MusicNotes,
      label: 'Add to Playlist',
      action: () => {
        setShowMenu(false);
        setShowAddToPlaylist(true);
      },
    },
    { icon: ShareNetwork, label: 'Share', action: handleShare },
    { icon: Bell, label: 'Trigger', action: () => setShowMenu(false) },
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
    },
    {
      icon: BatteryCharging,
      label: 'Power Saving Mode',
      action: () => {
        setPowerSaving(!powerSaving);
        setShowMenu(false);
      },
    },
    { icon: Timer, label: 'Sleep Timer', action: handleSleepTimer },
    { icon: BellSimple, label: 'Make a Ringtone', action: () => setShowMenu(false) },
  ];

  const handleSeekBack = useCallback(() => {
    seekTo(Math.max(0, progress - 15 / (duration || 1)));
  }, [progress, duration, seekTo]);

  const handleSeekFwd = useCallback(() => {
    seekTo(Math.min(1, progress + 15 / (duration || 1)));
  }, [progress, duration, seekTo]);

  return (
    <View className="flex-1" style={{ backgroundColor: isDarkMode ? '#18181b' : '#f4f4f5' }}>
      <Animated.View
        className="flex-1"
        style={{ transform: [{ translateY }] }}
        {...swipePanResponder.panHandlers}>
        <View className="absolute inset-0">
          {currentItem?.thumbnail || localArtwork ? (
            <Image
              source={{ uri: currentItem?.thumbnail || localArtwork || undefined }}
              className="h-full w-full"
              blurRadius={60}
            />
          ) : (
            <View className="h-full w-full" style={{ backgroundColor: `${artColor}25` }} />
          )}
          <View
            className="absolute inset-0"
            style={{ backgroundColor: isDarkMode ? '#18181bCC' : '#f4f4f5CC' }}
          />
        </View>

        <View className="flex-1">
          <View className="flex-row items-center justify-between px-5 pb-2 pt-[60px]">
            <TouchableOpacity
              onPress={handleStopAndClose}
              className="h-11 w-11 items-center justify-center">
              <X size={24} color={textColor} weight="bold" />
            </TouchableOpacity>
            <Text className="text-base font-bold" style={{ color: textColor }}>
              Now Playing
            </Text>
            <TouchableOpacity
              onPress={() => setShowQueue(true)}
              className="h-11 w-11 items-center justify-center">
              <List size={24} color={textColor} weight="bold" />
            </TouchableOpacity>
          </View>

          <View className="flex-1 px-5 pb-10">
            {/* Album Art */}
            <View className="flex-1 items-center justify-center">
              <View
                className="aspect-square items-center justify-center overflow-hidden rounded-2xl border"
                style={{
                  width: Math.min(SCREEN_WIDTH * 0.65, 300),
                  borderColor: artColor + '40',
                  shadowColor: artColor,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.2,
                  shadowRadius: 24,
                  elevation: 10,
                }}>
                <Animated.View
                  className="absolute inset-0"
                  style={{ backgroundColor: artColor, opacity: pulseOpacity, borderRadius: 28 }}
                />
                {currentItem?.thumbnail || localArtwork ? (
                  <Image
                    source={{ uri: currentItem?.thumbnail || localArtwork || undefined }}
                    className="h-full w-full"
                  />
                ) : (
                  <View
                    className="h-full w-full items-center justify-center"
                    style={{ backgroundColor: artColor + '15' }}>
                    {isVideo ? (
                      <VideoCamera size={72} color={artColor} weight="bold" />
                    ) : (
                      <MusicNote size={72} color={artColor} weight="bold" />
                    )}
                  </View>
                )}
              </View>
            </View>

            {/* Song Name + Artist */}
            <View className="mb-5 items-center">
              <Text
                className="mb-1 text-center text-xl font-bold"
                style={{ color: textColor }}
                numberOfLines={1}>
                {currentItem?.name || file.name}
              </Text>
              <Text className="text-center text-sm" style={{ color: primaryColor }}>
                {currentItem?.artist || (isVideo ? 'Video (Audio Mode)' : 'Local File')}
              </Text>
            </View>

            {/* Heart + Menu Row */}
            <View className="mb-4 flex-row items-center justify-end gap-4">
              <TouchableOpacity
                onPress={handleToggleFavorite}
                className="h-11 w-11 items-center justify-center">
                <Heart
                  size={24}
                  color={isFav ? '#ef4444' : mutedColor}
                  weight={isFav ? 'fill' : 'regular'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowMenu(true)}
                className="h-11 w-11 items-center justify-center">
                <DotsThreeVertical size={24} color={textColor} weight="bold" />
              </TouchableOpacity>
            </View>

            {/* Smart Progress Bar */}
            <View className="mb-1 w-full flex-row items-center gap-3">
              <TouchableOpacity
                onPress={handleSeekBack}
                className="h-8 w-8 items-center justify-center">
                <SkipBack size={18} color={mutedColor} weight="fill" />
              </TouchableOpacity>
              <View className="flex-1">
                <NeonSlider
                  progress={progress}
                  onSeek={seekTo}
                  width={SCREEN_WIDTH - 130}
                  primaryColor={artColor}
                />
              </View>
              <TouchableOpacity
                onPress={handleSeekFwd}
                className="h-8 w-8 items-center justify-center">
                <SkipForward size={18} color={mutedColor} weight="fill" />
              </TouchableOpacity>
            </View>

            {/* Timers */}
            <View className="mb-5 w-full flex-row justify-between">
              <Text className="text-xs" style={{ color: mutedColor }}>
                {fileEngine.formatDuration(position)}
              </Text>
              <Text className="text-xs" style={{ color: mutedColor }}>
                -{fileEngine.formatDuration(Math.max(0, (duration || 0) - position))}
              </Text>
            </View>

            {/* Playback Controls */}
            <View className="mb-5 flex-row items-center justify-center gap-5">
              <TouchableOpacity
                className="h-11 w-11 items-center justify-center"
                onPress={toggleShuffle}>
                <ShuffleAngular
                  size={22}
                  color={shuffle ? primaryColor : mutedColor}
                  weight={shuffle ? 'bold' : 'regular'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                className="h-11 w-11 items-center justify-center"
                onPress={handlePrev}>
                <SkipBack size={28} color="#ffffff" weight="fill" />
              </TouchableOpacity>
              <TouchableOpacity
                className="h-16 w-16 items-center justify-center rounded-full"
                style={{
                  backgroundColor: primaryColor,
                  shadowColor: primaryColor,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  elevation: 6,
                }}
                onPress={togglePlay}>
                {isPlaying ? (
                  <Pause size={32} color="#18181b" weight="fill" />
                ) : (
                  <Play size={32} color="#18181b" weight="fill" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                className="h-11 w-11 items-center justify-center"
                onPress={handleNext}>
                <SkipForward size={28} color="#ffffff" weight="fill" />
              </TouchableOpacity>
              <TouchableOpacity
                className="h-11 w-11 items-center justify-center"
                style={{ opacity: repeat === 'none' ? 0.4 : 1 }}
                onPress={cycleRepeat}>
                {repeat === 'one' ? (
                  <RepeatOnce size={24} color="#ffffff" weight="bold" />
                ) : (
                  <Repeat size={24} color="#ffffff" weight="bold" />
                )}
              </TouchableOpacity>
            </View>

            {/* Bottom Row: EQ, Lyrics, Queue */}
            <View className="mb-5 flex-row justify-center gap-4">
              <TouchableOpacity
                className="h-11 w-11 flex-row items-center justify-center gap-1.5 rounded-[14px]"
                style={{ backgroundColor: isDarkMode ? '#27272a' : '#e4e4e7' }}
                onPress={() => setShowEq(true)}>
                <SlidersHorizontal size={18} color={textColor} />
              </TouchableOpacity>
              <TouchableOpacity
                className="h-11 w-11 flex-row items-center justify-center gap-1.5 rounded-[14px]"
                style={{ backgroundColor: isDarkMode ? '#27272a' : '#e4e4e7' }}
                onPress={handleToggleLyrics}>
                <MicrophoneStage
                  size={18}
                  color={showLyrics ? primaryColor : mutedColor}
                  weight={showLyrics ? 'bold' : 'regular'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                className="h-11 w-11 flex-row items-center justify-center gap-1.5 rounded-[14px]"
                style={{ backgroundColor: isDarkMode ? '#27272a' : '#e4e4e7' }}
                onPress={() => setShowQueue(true)}>
                <List size={18} color={textColor} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Menu Bottom Sheet */}
      <Modal visible={showMenu} transparent animationType="fade">
        <View className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <TouchableOpacity
            className="flex-1"
            onPress={() => {
              Animated.timing(translateMenuY, {
                toValue: SCREEN_HEIGHT,
                duration: 200,
                useNativeDriver: true,
              }).start(() => {
                setShowMenu(false);
                translateMenuY.setValue(SCREEN_HEIGHT);
              });
            }}
            activeOpacity={1}
          />
          <Animated.View
            style={{ transform: [{ translateY: translateMenuY }] }}
            {...menuPanResponder.panHandlers}>
            <View
              className="rounded-t-3xl px-4 pb-8 pt-5"
              style={{
                backgroundColor: isDarkMode ? '#27272a' : '#f4f4f5',
                maxHeight: SCREEN_HEIGHT * 0.55,
              }}>
              <View className="mb-4 h-1 w-10 self-center rounded-full bg-zinc-500" />
              <ScrollView showsVerticalScrollIndicator={false}>
                {menuItems.map((item, i) => (
                  <TouchableOpacity
                    key={i}
                    className="flex-row items-center rounded-xl px-2 py-3.5 active:bg-white/5"
                    onPress={item.action}>
                    <View
                      className="h-10 w-10 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${primaryColor}15` }}>
                      <item.icon size={20} color={primaryColor} weight="bold" />
                    </View>
                    <Text className="ml-3 text-[15px]" style={{ color: textColor }}>
                      {item.label}
                    </Text>
                    {item.label === 'Driving Mode' && drivingMode ? (
                      <View
                        className="ml-auto h-2 w-2 rounded-full"
                        style={{ backgroundColor: primaryColor }}
                      />
                    ) : null}
                    {item.label === 'Power Saving Mode' && powerSaving ? (
                      <View
                        className="ml-auto h-2 w-2 rounded-full"
                        style={{ backgroundColor: primaryColor }}
                      />
                    ) : null}
                    {item.label === 'Sleep Timer' ? (
                      <Text className="ml-auto text-xs" style={{ color: mutedColor }}>
                        {AudioEngine.getInstance().getSleepTimerState().enabled ? 'ON' : 'OFF'}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Queue Sheet */}
      <Modal visible={showQueue} transparent animationType="slide">
        <View className="flex-1 justify-end">
          <View
            className="rounded-t-3xl"
            style={{
              height: '66.67%',
              backgroundColor: isDarkMode ? '#18181b' : '#f4f4f5',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            }}>
          <View
            className="flex-row items-center justify-between px-5 pb-4 pt-5"
            style={{
              borderBottomWidth: 1,
              borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
            }}>
            <Text className="text-xl font-extrabold" style={{ color: textColor }}>
              Queue ({queue.length})
            </Text>
            <TouchableOpacity onPress={() => setShowQueue(false)}>
              <X size={24} color={textColor} />
            </TouchableOpacity>
          </View>

          {/* Shuffle + Repeat Controls */}
          <View
            className="flex-row items-center justify-center gap-6 px-5 py-3"
            style={{
              borderBottomWidth: 1,
              borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            }}>
            <TouchableOpacity
              className="flex-row items-center gap-2 rounded-xl px-4 py-2"
              style={{
                backgroundColor: shuffle ? `${primaryColor}20` : isDarkMode ? '#27272a' : '#e4e4e7',
              }}
              onPress={toggleShuffle}>
              <ShuffleAngular
                size={18}
                color={shuffle ? primaryColor : '#a1a1aa'}
                weight={shuffle ? 'bold' : 'regular'}
              />
              <Text
                className="text-sm font-semibold"
                style={{ color: shuffle ? primaryColor : '#a1a1aa' }}>
                Shuffle
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center gap-2 rounded-xl px-4 py-2"
              style={{
                backgroundColor:
                  repeat !== 'none' ? `${primaryColor}20` : isDarkMode ? '#27272a' : '#e4e4e7',
              }}
              onPress={cycleRepeat}>
              {repeat === 'one' ? (
                <RepeatOnce size={18} color={primaryColor} weight="bold" />
              ) : (
                <Repeat
                  size={18}
                  color={repeat !== 'none' ? primaryColor : '#a1a1aa'}
                  weight={repeat !== 'none' ? 'bold' : 'regular'}
                />
              )}
              <Text
                className="text-sm font-semibold"
                style={{ color: repeat !== 'none' ? primaryColor : '#a1a1aa' }}>
                {repeat === 'one' ? 'Repeat One' : repeat === 'all' ? 'Repeat All' : 'Repeat'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Draggable Queue List */}
          <QueueList
            items={queue}
            currentIndex={currentIndex}
            isPlaying={isPlaying}
            primaryColor={primaryColor}
            currentFile={currentFile}
            onPlayIndex={(index) => {
              const s = usePlaybackStore.getState();
              s.playIndex(index);
            }}
            onRemove={(index) => {
              queueEngine.removeFromQueue(index, 'audio');
            }}
            onMove={moveInQueue}
          />
        </View>
        </View>
      </Modal>

      {/* Add to Playlist Modal */}
      <Modal visible={showAddToPlaylist} transparent animationType="fade">
        <TouchableOpacity
          className="flex-1 items-center justify-center bg-black/70"
          onPress={() => setShowAddToPlaylist(false)}>
          <View
            className="w-[85%] max-w-[360px] rounded-2xl p-6"
            style={{
              borderWidth: 1,
              borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
              backgroundColor: isDarkMode ? '#27272a' : '#ffffff',
            }}>
            <Text className="mb-4 text-center text-lg font-extrabold" style={{ color: textColor }}>
              Add to Playlist
            </Text>
            <View className="mb-4 flex-row gap-2.5">
              <TextInput
                className="flex-1 rounded-xl px-3.5 py-3 text-sm"
                style={{ backgroundColor: isDarkMode ? '#27272a' : '#e4e4e7', color: textColor }}
                placeholder="New playlist name"
                placeholderTextColor={mutedColor}
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
              />
              <TouchableOpacity
                className="justify-center rounded-xl px-4"
                style={{ backgroundColor: primaryColor }}
                onPress={handleCreatePlaylist}>
                <Text className="text-sm font-bold text-[#18181b]">Create</Text>
              </TouchableOpacity>
            </View>
            <ScrollView className="mb-4 max-h-[200px]">
              {playlistStore.playlists.map((pl) => (
                <TouchableOpacity
                  key={pl.id}
                  className="flex-row items-center border-b border-white/[0.06] py-3"
                  onPress={() => handleAddToPlaylist(pl)}>
                  <MusicNotes size={20} color={mutedColor} />
                  <View className="ml-3 flex-1">
                    <Text className="mb-0.5 text-[15px]" style={{ color: textColor }}>
                      {pl.name}
                    </Text>
                    <Text className="text-xs" style={{ color: mutedColor }}>
                      {pl.totalTracks} songs
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              {playlistStore.playlists.length === 0 && (
                <Text className="py-5 text-center text-sm" style={{ color: mutedColor }}>
                  No playlists yet
                </Text>
              )}
            </ScrollView>
            <TouchableOpacity
              className="items-center rounded-xl py-3"
              style={{ backgroundColor: isDarkMode ? '#27272a' : '#e4e4e7' }}
              onPress={() => setShowAddToPlaylist(false)}>
              <Text className="text-[15px] font-bold" style={{ color: textColor }}>
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
            className="w-[80%] max-w-[320px] rounded-2xl p-6"
            style={{ backgroundColor: isDarkMode ? '#27272a' : '#ffffff' }}>
            <Text className="mb-4 text-center text-lg font-extrabold" style={{ color: textColor }}>
              Playback Speed
            </Text>
            <View className="flex-row flex-wrap justify-center gap-2">
              {SPEEDS.map((speed) => (
                <TouchableOpacity
                  key={speed}
                  className="rounded-xl border px-4 py-3"
                  style={[
                    playbackSpeed === speed && { backgroundColor: primaryColor },
                    { borderColor: playbackSpeed === speed ? primaryColor : '#3f3f46' },
                  ]}
                  onPress={() => {
                    setRate(speed);
                    setShowSpeed(false);
                  }}>
                  <Text
                    className="text-center text-sm"
                    style={[
                      playbackSpeed === speed && { color: '#18181b', fontWeight: '700' },
                      { color: '#e4e4e7' },
                    ]}>
                    {speed}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* EQ Modal */}
      <Modal visible={showEq} transparent animationType="fade">
        <TouchableOpacity
          className="flex-1 items-center justify-center bg-black/70"
          onPress={() => setShowEq(false)}>
          <View
            className="w-[90%] rounded-2xl p-6"
            style={{ backgroundColor: isDarkMode ? '#27272a' : '#ffffff' }}>
            <Text className="mb-4 text-center text-lg font-extrabold" style={{ color: textColor }}>
              Equalizer
            </Text>
            <Text className="py-6 text-center text-sm" style={{ color: mutedColor }}>
              Equalizer controls coming soon
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Lyrics Sheet */}
      <BottomSheet visible={showLyrics} onClose={() => setShowLyrics(false)} title="Lyrics">
        {lyricsLoading ? (
          <View className="items-center py-6">
            <Text className="text-sm" style={{ color: mutedColor }}>
              Loading lyrics...
            </Text>
          </View>
        ) : lyricsData?.lyrics ? (
          <ScrollView className="max-h-[300px] px-5" showsVerticalScrollIndicator>
            <Text
              className="text-sm leading-6"
              style={{ color: isDarkMode ? '#d4d4d8' : '#18181b' }}>
              {lyricsData.lyrics}
            </Text>
          </ScrollView>
        ) : (
          <View className="items-center gap-3 py-6">
            <MicrophoneStage size={32} color={primaryColor + '60'} />
            <Text className="text-center text-sm" style={{ color: mutedColor }}>
              No lyrics available for this track.
            </Text>
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

function QueueList({
  items,
  currentIndex,
  isPlaying,
  primaryColor,
  currentFile,
  onPlayIndex,
  onRemove,
  onMove,
}: {
  items: FileItem[];
  currentIndex: number;
  isPlaying: boolean;
  primaryColor: string;
  currentFile: FileItem | null;
  onPlayIndex: (index: number) => void;
  onRemove: (index: number) => void;
  onMove: (from: number, to: number) => void;
}) {
  const { textColor, mutedColor, isDarkMode } = useTheme();
  const [reorderIdx, setReorderIdx] = useState<number | null>(null);
  const scrollRef = useRef<FlatList>(null);

  if (items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <MusicNotes size={48} color="#52525b" />
        <Text className="mt-4 text-base" style={{ color: mutedColor }}>
          Queue is empty
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {reorderIdx !== null && (
        <View
          className="flex-row items-center justify-between px-5 py-2"
          style={{ backgroundColor: isDarkMode ? 'rgba(39,39,42,0.8)' : 'rgba(0,0,0,0.06)' }}>
          <Text className="text-sm" style={{ color: mutedColor }}>
            Move &ldquo;{items[reorderIdx]?.name?.substring(0, 20)}&rdquo;
          </Text>
          <TouchableOpacity onPress={() => setReorderIdx(null)}>
            <Text className="text-sm font-bold" style={{ color: primaryColor }}>
              Done
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        ref={scrollRef}
        data={items}
        keyExtractor={(item) => item.uri}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item, index }) => {
          const isCurrent = index === currentIndex;
          const isReorderActive = reorderIdx !== null;
          const isThisReordering = reorderIdx === index;

          return (
            <View
              className="flex-row items-center px-4"
              style={[
                {
                  minHeight: 64,
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                },
                isCurrent && { backgroundColor: `${primaryColor}12` },
              ]}>
              {/* Drag Handle (hamburger) - Long press to start reorder */}
              <TouchableOpacity
                className="mr-2 h-10 w-8 items-center justify-center"
                onLongPress={() => setReorderIdx(index)}
                delayLongPress={300}
                onPress={() => {
                  if (!isReorderActive) onPlayIndex(index);
                }}>
                <View className="gap-0.5">
                  <View className="h-0.5 w-3.5 rounded bg-zinc-500" />
                  <View className="h-0.5 w-3.5 rounded bg-zinc-500" />
                  <View className="h-0.5 w-3.5 rounded bg-zinc-500" />
                </View>
              </TouchableOpacity>

              {/* Index / Playing Indicator */}
              <Text
                className="mr-2 w-8 text-center text-sm font-bold"
                style={{ color: isCurrent ? primaryColor : mutedColor }}>
                {isCurrent && isPlaying ? '\u25B6' : `${index + 1}`}
              </Text>

              {/* Thumbnail */}
              <View
                className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${item.artColor || primaryColor}20` }}>
                {item.thumbnail ? (
                  <Image source={{ uri: item.thumbnail }} className="h-10 w-10 rounded-xl" />
                ) : (
                  <MusicNote size={18} color={isCurrent ? primaryColor : mutedColor} />
                )}
              </View>

              {/* Info */}
              <View className="flex-1">
                <Text
                  className="text-sm font-semibold"
                  numberOfLines={1}
                  style={{ color: isCurrent ? primaryColor : textColor }}>
                  {item.name}
                </Text>
                <Text className="mt-0.5 text-xs" style={{ color: mutedColor }}>
                  {item.artist || (item.duration ? fileEngine.formatDuration(item.duration) : '')}
                </Text>
              </View>

              {/* Reorder Arrows or Remove */}
              {isReorderActive && isThisReordering ? (
                <View className="flex-row gap-1">
                  <TouchableOpacity
                    className="h-9 w-9 items-center justify-center rounded-full active:bg-white/10"
                    onPress={() => {
                      if (index > 0) {
                        onMove(index, index - 1);
                        setReorderIdx(index - 1);
                      }
                    }}>
                    <Text className="text-lg font-bold" style={{ color: mutedColor }}>
                      ▲
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="h-9 w-9 items-center justify-center rounded-full active:bg-white/10"
                    onPress={() => {
                      if (index < items.length - 1) {
                        onMove(index, index + 1);
                        setReorderIdx(index + 1);
                      }
                    }}>
                    <Text className="text-lg font-bold" style={{ color: mutedColor }}>
                      ▼
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : isReorderActive ? (
                <TouchableOpacity
                  className="rounded-lg px-3 py-1.5"
                  style={{ borderWidth: 1, borderColor: mutedColor }}
                  onPress={() => {
                    if (reorderIdx !== null && reorderIdx !== index) {
                      onMove(reorderIdx, index);
                      setReorderIdx(null);
                    }
                  }}>
                  <Text className="text-xs font-semibold" style={{ color: mutedColor }}>
                    Move Here
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  className="ml-2 h-9 w-9 items-center justify-center rounded-full active:bg-white/10"
                  onPress={() => onRemove(index)}>
                  <X size={16} color="#71717a" />
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}
