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
import { useFiles } from '../context/FileContext';
import { useTheme } from '../context/ThemeContext';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { usePlaylistStore } from '../stores/playlistStore';
import { fileEngine } from '../engine/FileEngine';
import { AudioEngine } from '../engine/AudioEngine';
import { MetadataService } from '../services/Metadata/MetadataService';
import { LyricsService } from '../services/Lyrics/LyricsService';
import type { LyricsData } from '../types';
import { NeonSlider } from '../components/NeonSlider';

type Props = NativeStackScreenProps<RootStackParamList, 'MusicPlayer'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function MusicPlayerScreen({ navigation, route }: Props) {
  const { file } = route.params;
  const { primaryColor } = useTheme();
  const { audio, toggleFavorite, isFavorite, favoriteUris } = useFiles();

  const {
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
    setQueue,
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
            toValue: 500,
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
        Animated.timing(translateMenuY, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }).start(() => translateMenuY.setValue(SCREEN_HEIGHT));
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
      if (meta.artwork) setLocalArtwork(meta.artwork);
    });
  }, [file.uri]);

  useEffect(() => {
    const q = audio.length > 0 ? audio : [file];
    const idx = q.findIndex((f) => f.uri === file.uri);
    playFile(file, q, idx >= 0 ? idx : 0);
  }, []);

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
  }, [isPlaying]);

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
      const { settingsStore } = require('../stores/settingsStore');
      const hidden = settingsStore.getState().hiddenFiles;
      const exts = [...(hidden.hideExtensions || []), currentItem.name.split('.').pop() || ''];
      settingsStore.getState().setHiddenFiles({ ...hidden, hideExtensions: [...new Set(exts)] });
    } catch {}
  }, [currentItem]);

  const handleDelete = useCallback(async () => {
    if (!currentItem) return;
    setShowMenu(false);
    try {
      const { StorageService } = require('../services/StorageService');
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
      const artist = currentItem?.artist || '';
      const local = await LyricsService.loadLocalLrc(currentItem?.uri || '');
      if (local) {
        setLyricsData(local);
      } else if (artist) {
        const remote = await LyricsService.fetchLyrics(title, artist);
        setLyricsData(remote);
      }
      setLyricsLoading(false);
    }
  }, [showLyrics, lyricsData, lyricsLoading, currentItem]);

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
    <View className="flex-1 bg-[#18181b]">
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
          <View className="absolute inset-0" style={{ backgroundColor: '#18181bCC' }} />
        </View>

        <View className="flex-1">
          <View className="flex-row items-center justify-between px-5 pb-2 pt-[60px]">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="h-11 w-11 items-center justify-center">
              <CaretLeft size={24} color="#ffffff" weight="bold" />
            </TouchableOpacity>
            <Text className="text-base font-bold text-white">Now Playing</Text>
            <TouchableOpacity
              onPress={() => setShowQueue(true)}
              className="h-11 w-11 items-center justify-center">
              <List size={24} color="#ffffff" weight="bold" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 20 }}
            showsVerticalScrollIndicator={false}
            onScroll={(e) => {
              scrollOffset.current = e.nativeEvent.contentOffset.y;
              isAtTop.current = e.nativeEvent.contentOffset.y <= 5;
            }}
            scrollEventThrottle={16}>
            {/* Album Art */}
            <View className="my-6">
              <View
                className="h-60 w-60 items-center justify-center overflow-hidden rounded-2xl border"
                style={{
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
            <View className="mb-4 items-center">
              <Text className="mb-1 text-center text-xl font-bold text-white" numberOfLines={1}>
                {currentItem?.name || file.name}
              </Text>
              <Text className="text-center text-sm" style={{ color: primaryColor }}>
                {currentItem?.artist || (isVideo ? 'Video (Audio Mode)' : 'Local File')}
              </Text>
            </View>

            {/* Heart + Menu Row */}
            <View className="mb-4 w-full flex-row items-center justify-end gap-4">
              <TouchableOpacity
                onPress={handleToggleFavorite}
                className="h-11 w-11 items-center justify-center">
                <Heart
                  size={24}
                  color={isFav ? '#ef4444' : '#e4e4e7'}
                  weight={isFav ? 'fill' : 'regular'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowMenu(true)}
                className="h-11 w-11 items-center justify-center">
                <DotsThreeVertical size={24} color="#e4e4e7" weight="bold" />
              </TouchableOpacity>
            </View>

            {/* Smart Progress Bar */}
            <View className="mb-1 w-full flex-row items-center gap-3">
              <TouchableOpacity
                onPress={handleSeekBack}
                className="h-8 w-8 items-center justify-center">
                <SkipBack size={18} color="#a1a1aa" weight="fill" />
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
                <SkipForward size={18} color="#a1a1aa" weight="fill" />
              </TouchableOpacity>
            </View>

            {/* Timers */}
            <View className="mb-5 w-full flex-row justify-between">
              <Text className="text-xs text-zinc-400">{fileEngine.formatDuration(position)}</Text>
              <Text className="text-xs text-zinc-400">
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
                  color={shuffle ? primaryColor : '#e4e4e7'}
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
                className="h-11 w-11 flex-row items-center justify-center gap-1.5 rounded-[14px] bg-[#27272a]"
                onPress={() => setShowEq(true)}>
                <SlidersHorizontal size={18} color="#e4e4e7" />
              </TouchableOpacity>
              <TouchableOpacity
                className="h-11 w-11 flex-row items-center justify-center gap-1.5 rounded-[14px] bg-[#27272a]"
                onPress={handleToggleLyrics}>
                <MicrophoneStage
                  size={18}
                  color={showLyrics ? primaryColor : '#e4e4e7'}
                  weight={showLyrics ? 'bold' : 'regular'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                className="h-11 w-11 flex-row items-center justify-center gap-1.5 rounded-[14px] bg-[#27272a]"
                onPress={() => setShowQueue(true)}>
                <List size={18} color="#e4e4e7" />
              </TouchableOpacity>
            </View>

            {/* Lyrics Panel */}
            {showLyrics && (
              <View className="mb-4 w-full rounded-[20px] bg-[#27272a] p-4">
                <View
                  className="mb-3 flex-row items-center gap-2 self-start rounded-xl p-2.5"
                  style={{ backgroundColor: `${primaryColor}15` }}>
                  <MicrophoneStage size={16} color={primaryColor} />
                  <Text className="text-sm font-bold" style={{ color: primaryColor }}>
                    Lyrics
                  </Text>
                </View>
                {lyricsLoading ? (
                  <View className="items-center py-6">
                    <Text className="text-sm text-zinc-400">Loading lyrics...</Text>
                  </View>
                ) : lyricsData?.lyrics ? (
                  <ScrollView className="max-h-[200px]" showsVerticalScrollIndicator>
                    <Text className="text-sm leading-6 text-zinc-300">{lyricsData.lyrics}</Text>
                  </ScrollView>
                ) : (
                  <View className="items-center gap-3 py-6">
                    <MicrophoneStage size={32} color={primaryColor + '60'} />
                    <Text className="text-center text-sm text-zinc-400">
                      No lyrics available for this track.
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Animated.View>

      {/* Menu Bottom Sheet */}
      <Modal visible={showMenu} transparent animationType="fade">
        <TouchableOpacity
          className="flex-1 justify-end bg-black/70"
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
          activeOpacity={1}>
          <Animated.View
            style={{ transform: [{ translateY: translateMenuY }] }}
            {...menuPanResponder.panHandlers}>
            <View
              className="rounded-t-3xl bg-[#27272a] px-4 pb-8 pt-5"
              style={{ maxHeight: '70%' }}>
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
                    <Text className="ml-3 text-[15px] text-white">{item.label}</Text>
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
                      <Text className="ml-auto text-xs text-zinc-400">
                        {AudioEngine.getInstance().getSleepTimerState().enabled ? 'ON' : 'OFF'}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Queue Modal */}
      <Modal visible={showQueue} transparent animationType="slide">
        <View className="flex-1 bg-[#18181b]">
          <View className="flex-row items-center justify-between border-b border-white/10 px-5 pb-5 pt-[60px]">
            <Text className="text-xl font-extrabold text-white">Queue ({queue.length})</Text>
            <TouchableOpacity onPress={() => setShowQueue(false)}>
              <X size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={queue}
            keyExtractor={(item) => item.uri}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                className="flex-row items-center px-5 py-3"
                style={
                  index === currentIndex ? { backgroundColor: `${primaryColor}15` } : undefined
                }>
                <Text
                  className="w-10 text-center text-base text-zinc-400"
                  style={index === currentIndex ? { color: primaryColor } : undefined}>
                  {index === currentIndex && isPlaying ? '\u25B6' : index + 1}
                </Text>
                <View
                  className="mr-2.5 h-9 w-9 items-center justify-center rounded-[10px]"
                  style={{ backgroundColor: (item.artColor || primaryColor) + '20' }}>
                  {item.type === 'video' ? (
                    <VideoCamera size={16} color="#ffffff" />
                  ) : (
                    <MusicNote size={16} color="#ffffff" />
                  )}
                </View>
                <View className="flex-1">
                  <Text
                    className="mb-1 text-[15px] text-white"
                    numberOfLines={1}
                    style={index === currentIndex ? { color: primaryColor } : undefined}>
                    {item.name}
                  </Text>
                  <Text className="text-xs text-zinc-400">
                    {item.duration ? fileEngine.formatDuration(item.duration) : 'Unknown'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Add to Playlist Modal */}
      <Modal visible={showAddToPlaylist} transparent animationType="fade">
        <TouchableOpacity
          className="flex-1 items-center justify-center bg-black/70"
          onPress={() => setShowAddToPlaylist(false)}>
          <View className="w-[85%] max-w-[360px] rounded-2xl border border-white/10 bg-[#27272a] p-6">
            <Text className="mb-4 text-center text-lg font-extrabold text-white">
              Add to Playlist
            </Text>
            <View className="mb-4 flex-row gap-2.5">
              <TextInput
                className="flex-1 rounded-xl bg-[#27272a] px-3.5 py-3 text-sm text-white"
                placeholder="New playlist name"
                placeholderTextColor="rgba(255,255,255,0.4)"
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
                  <MusicNotes size={20} color="#ffffff" />
                  <View className="ml-3 flex-1">
                    <Text className="mb-0.5 text-[15px] text-white">{pl.name}</Text>
                    <Text className="text-xs text-zinc-400">{pl.totalTracks} songs</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {playlistStore.playlists.length === 0 && (
                <Text className="py-5 text-center text-sm text-zinc-400">No playlists yet</Text>
              )}
            </ScrollView>
            <TouchableOpacity
              className="items-center rounded-xl bg-[#27272a] py-3"
              onPress={() => setShowAddToPlaylist(false)}>
              <Text className="text-[15px] font-bold text-white">Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Speed Modal */}
      <Modal visible={showSpeed} transparent animationType="fade">
        <TouchableOpacity
          className="flex-1 items-center justify-center bg-black/70"
          onPress={() => setShowSpeed(false)}>
          <View className="w-[80%] max-w-[320px] rounded-2xl bg-[#27272a] p-6">
            <Text className="mb-4 text-center text-lg font-extrabold text-white">
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
          <View className="w-[90%] rounded-2xl bg-[#27272a] p-6">
            <Text className="mb-4 text-center text-lg font-extrabold text-white">Equalizer</Text>
            <Text className="py-6 text-center text-sm text-zinc-400">
              Equalizer controls coming soon
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
