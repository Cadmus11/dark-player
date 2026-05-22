import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Modal,
  Platform,
  Animated,
  Alert,
  Share,
  ScrollView,
  PanResponder,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { setAudioModeAsync } from 'expo-audio';
import * as ScreenOrientation from 'expo-screen-orientation';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import {
  CaretLeft,
  Play,
  Pause,
  MusicNote,
  VideoCamera,
  FrameCorners,
  Square,
  ArrowsOut,
  Subtitles,
  SkipBack,
  SkipForward,
  Info,
  Trash,
  PictureInPicture,
  Repeat,
  Shuffle,
  Globe,
  Check,
  DotsThreeVertical,
  Headphones,
  Lock,
  LockOpen,
  ArrowsClockwise,
  ShareNetwork,
  Queue,
  FolderLock,
} from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';
import { useFiles } from '../context/FileContext';
import { fileEngine } from '../engine/FileEngine';
import type { SubtitleEntry } from '../types';
import { VideoEnhancementModal } from '../components/player/VideoEnhancementModal';
import { HistoryService } from '../services/History/HistoryService';
import { StorageService } from '../services/StorageService';
import { findSubtitleFile, parseSRT, readTextFile } from '../services/FileService';
import { Sorting } from '../services/Sorting';

type Props = NativeStackScreenProps<RootStackParamList, 'VideoPlayer'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ContentFit = 'contain' | 'cover' | 'fill';

const CONTENT_FITS: { mode: ContentFit; Icon: any; label: string }[] = [
  { mode: 'contain', Icon: FrameCorners, label: 'Fit' },
  { mode: 'cover', Icon: Square, label: 'Fill' },
  { mode: 'fill', Icon: ArrowsOut, label: 'Stretch' },
];

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

type PlayMode = 'loop' | 'loopAll' | 'shuffle' | 'pauseAfter';

export function VideoPlayerScreen({ navigation, route }: Props) {
  const { file, isAudioOnly: initialAudioOnly } = route.params;
  const { primaryColor } = useTheme();
  const { videos, files, toggleFavorite, isFavorite, favoriteUris, addToQueue } = useFiles();

  const player = useVideoPlayer({ uri: file.uri });

  const sortedVideos = useMemo(() => Sorting.sort(videos, 'date', 'desc'), [videos]);

  const [showControls, setShowControls] = useState(true);
  const [contentFit, setContentFit] = useState<ContentFit>('contain');
  const [showResizeModal, setShowResizeModal] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedModal, setShowSpeedModal] = useState(false);
  const [isAudioOnly, setIsAudioOnly] = useState(initialAudioOnly || false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showEnhancement, setShowEnhancement] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showPlayModeModal, setShowPlayModeModal] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState({
    isPlaying: false,
    position: 0,
    duration: 0,
  });
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const [subtitleEntries, setSubtitleEntries] = useState<SubtitleEntry[]>([]);

  const [playMode, setPlayMode] = useState<PlayMode>('loopAll');
  const [audioTrack, setAudioTrack] = useState('default');
  const [showAudioTrackModal, setShowAudioTrackModal] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [orientationLock, setOrientationLock] = useState<'portrait' | 'landscape'>('portrait');
  const [showMenu, setShowMenu] = useState(false);

  const controlsAnim = useRef(new Animated.Value(1)).current;
  const controlsOpacity = useRef(new Animated.Value(1)).current;

  const AUDIO_TRACKS = [
    { id: 'default', label: 'Default' },
    { id: 'language:en', label: 'English' },
    { id: 'language:es', label: 'Spanish' },
    { id: 'language:fr', label: 'French' },
    { id: 'language:de', label: 'German' },
    { id: 'language:ja', label: 'Japanese' },
    { id: 'language:zh', label: 'Chinese' },
    { id: 'language:ar', label: 'Arabic' },
    { id: 'language:pt', label: 'Portuguese' },
    { id: 'language:hi', label: 'Hindi' },
  ];

  const currentVideoIndexRef = useRef(sortedVideos.findIndex((v) => v.uri === file.uri));
  currentVideoIndexRef.current = sortedVideos.findIndex((v) => v.uri === file.uri);

  const { isPlaying, position, duration } = playbackStatus;
  const progress = duration > 0 ? (position / duration) * 100 : 0;

  const playbackRef = useRef(playbackStatus);
  useEffect(() => {
    const interval = setInterval(() => {
      const next = {
        isPlaying: player.playing,
        position: player.currentTime * 1000,
        duration: player.duration * 1000,
      };
      const prev = playbackRef.current;
      if (
        next.isPlaying === prev.isPlaying &&
        next.position === prev.position &&
        next.duration === prev.duration
      )
        return;
      playbackRef.current = next;
      setPlaybackStatus(next);
    }, 250);
    return () => clearInterval(interval);
  }, [player]);

  // Track end detection for play modes
  const prevPlayingRef = useRef(false);
  const playModeRef = useRef(playMode);
  playModeRef.current = playMode;
  const videosRef = useRef(sortedVideos);
  videosRef.current = sortedVideos;

  useEffect(() => {
    if (prevPlayingRef.current && !isPlaying && duration > 0 && position >= duration - 1000) {
      const pm = playModeRef.current;
      const vids = videosRef.current;
      const idx = currentVideoIndexRef.current;
      if (pm === 'loop') {
        player.currentTime = 0;
        player.play();
      } else if (pm === 'loopAll') {
        const next = (idx + 1) % vids.length;
        navigation.replace('VideoPlayer', { file: vids[next] });
      } else if (pm === 'shuffle') {
        const random = Math.floor(Math.random() * vids.length);
        navigation.replace('VideoPlayer', { file: vids[random] });
      }
    }
    prevPlayingRef.current = isPlaying;
  }, [isPlaying, position, duration, player, navigation]);

  // Record play session
  const sessionStartedRef = useRef(false);
  const prevIsPlayingRef = useRef(false);
  useEffect(() => {
    if (isPlaying && !prevIsPlayingRef.current && !sessionStartedRef.current) {
      HistoryService.startPlaySession(file.uri);
      sessionStartedRef.current = true;
    }
    if (!isPlaying && prevIsPlayingRef.current && sessionStartedRef.current) {
      HistoryService.pausePlaySession(file.uri);
    }
    prevIsPlayingRef.current = isPlaying;
  }, [isPlaying, file.uri]);

  useEffect(() => {
    return () => {
      if (sessionStartedRef.current) {
        HistoryService.endPlaySession(file, 'video');
      }
    };
  }, []);

  const goToVideo = useCallback(
    (index: number) => {
      if (index < 0 || index >= sortedVideos.length) return;
      navigation.replace('VideoPlayer', { file: sortedVideos[index] });
    },
    [sortedVideos, navigation]
  );

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: isAudioOnly,
      interruptionMode: 'doNotMix',
    });
    loadSubtitles();
  }, [isAudioOnly]);

  useEffect(() => {
    if (subtitlesEnabled && subtitleEntries.length > 0) {
      const active = subtitleEntries.find((s) => position >= s.start && position <= s.end);
      setCurrentSubtitle(active?.text || '');
    } else {
      setCurrentSubtitle('');
    }
  }, [position, subtitlesEnabled, subtitleEntries]);

  async function loadSubtitles() {
    try {
      const subtitleFile = findSubtitleFile(file.uri, files);
      if (subtitleFile) {
        const content = await readTextFile(subtitleFile);
        if (content) {
          const entries = parseSRT(content);
          setSubtitleEntries(entries);
        }
      }
    } catch {}
  }

  const togglePlayback = () => {
    try {
      if (isPlaying) {
        player.pause();
        HistoryService.pausePlaySession(file.uri);
      } else {
        player.play();
        HistoryService.resumePlaySession(file.uri);
      }
    } catch {}
  };

  const seekTo = (percent: number) => {
    if (!duration) return;
    player.currentTime = (percent * duration) / 1000;
  };

  const skip = (seconds: number) => {
    player.seekBy(seconds);
  };

  const changeSpeed = (speed: number) => {
    player.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedModal(false);
  };

  const goBack = () => {
    navigation.goBack();
  };

  const toggleControls = () => {
    if (isLocked) return;
    const toValue = showControls ? 0 : 1;
    controlsAnim.setValue(toValue);
    Animated.timing(controlsOpacity, {
      toValue: showControls ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowControls(!showControls));
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Video',
      `Are you sure you want to delete "${file.name}"? A backup will be kept for restore.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await StorageService.addToRecentlyDeleted(file);
            await StorageService.moveToTrash(file);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({ url: file.uri, title: file.name });
    } catch {}
    setShowMenu(false);
  };

  const handleAddToPlaylist = () => {
    setShowMenu(false);
    addToQueue(file);
  };

  const handleLockInPrivateFolder = () => {
    setShowMenu(false);
  };

  const handleOrientationToggle = async () => {
    try {
      if (orientationLock === 'portrait') {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        setOrientationLock('landscape');
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        setOrientationLock('portrait');
      }
    } catch {}
  };

  const getPlayModeIcon = () => {
    switch (playMode) {
      case 'loop':
        return <Repeat size={16} color={primaryColor} />;
      case 'loopAll':
        return <Repeat size={16} color={primaryColor} weight="bold" />;
      case 'shuffle':
        return <Shuffle size={16} color={primaryColor} />;
      case 'pauseAfter':
        return <Pause size={16} color={primaryColor} />;
    }
  };

  // Swipe up/down for next/prev video
  const videoSwipePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 15 && Math.abs(gs.dx) < 30,
      onPanResponderRelease: (_, gs) => {
        if (gs.dy < -60 && gs.vy < -0.3) {
          goToVideo(currentVideoIndexRef.current + 1);
        } else if (gs.dy > 60 && gs.vy > 0.3) {
          goToVideo(currentVideoIndexRef.current - 1);
        }
      },
    })
  ).current;

  // Bottom sheet swipe down helpers
  function useSheetSwipe(onClose: () => void) {
    const translateY = useRef(new Animated.Value(0)).current;
    const pan = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gs) => gs.dy > 10,
        onPanResponderMove: (_, gs) => {
          if (gs.dy > 0) translateY.setValue(gs.dy);
        },
        onPanResponderRelease: (_, gs) => {
          if (gs.dy > 80) {
            onClose();
            translateY.setValue(0);
          } else {
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
          }
        },
        onPanResponderTerminate: () => translateY.setValue(0),
      })
    ).current;
    return { translateY, panHandlers: pan.panHandlers };
  }

  const menuSheet = useSheetSwipe(() => setShowMenu(false));
  const playModeSheet = useSheetSwipe(() => setShowPlayModeModal(false));
  const audioTrackSheet = useSheetSwipe(() => setShowAudioTrackModal(false));
  const speedSheet = useSheetSwipe(() => setShowSpeedModal(false));
  const resizeSheet = useSheetSwipe(() => setShowResizeModal(false));
  const infoSheet = useSheetSwipe(() => setShowInfo(false));

  function renderSheet(
    visible: boolean,
    onClose: () => void,
    translateY: Animated.Value,
    panHandlers: any,
    title: string,
    children: React.ReactNode
  ) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/70">
          <TouchableOpacity className="flex-1" onPress={onClose} activeOpacity={1} />
          <Animated.View style={{ transform: [{ translateY }] }} {...panHandlers}>
            <TouchableOpacity
              activeOpacity={1}
              className="max-h-[70%] rounded-t-3xl bg-zinc-900 pb-8 pt-5">
              <View className="mb-4 h-1 w-10 self-center rounded-full bg-zinc-500" />
              {title ? (
                <Text className="mb-4 text-center text-lg font-extrabold text-white">{title}</Text>
              ) : null}
              {children}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  return (
    <View className="flex-1 bg-[#0a0a0a]">
      <StatusBar hidden />
      <View className="flex-1" {...videoSwipePan.panHandlers}>
        {!isAudioOnly && (
          <VideoView
            player={player}
            className="h-full w-full"
            contentFit={contentFit}
            nativeControls={false}
            allowsPictureInPicture={Platform.OS !== 'web'}
          />
        )}

        {isAudioOnly && (
          <View className="absolute inset-0 items-center justify-center gap-4 bg-[#0a0a0a]">
            <View
              className="h-40 w-40 items-center justify-center rounded-[32px] border-2 bg-white/[0.03]"
              style={{ borderColor: primaryColor + '60' }}>
              <MusicNote size={64} color={primaryColor} />
            </View>
            <Text
              className="text-base font-semibold tracking-[2px]"
              style={{ color: primaryColor }}>
              Audio Mode
            </Text>
            <TouchableOpacity
              className="flex-row items-center gap-2 rounded-xl px-4 py-[10px]"
              style={{ backgroundColor: `${primaryColor}20` }}
              onPress={() => setIsAudioOnly(false)}>
              <VideoCamera size={16} color={primaryColor} />
              <Text className="text-sm font-semibold" style={{ color: primaryColor }}>
                Switch to Video
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {currentSubtitle && subtitlesEnabled && !isAudioOnly && (
          <View
            className="absolute inset-0 items-center justify-end pb-[120px]"
            style={{ pointerEvents: 'none' }}>
            <View className="max-w-[85%] rounded-xl border border-[rgba(194,252,74,0.2)] bg-black/60 px-5 py-[10px]">
              <Text className="text-center text-base font-medium text-white">
                {currentSubtitle}
              </Text>
            </View>
          </View>
        )}

        {showControls && (
          <TouchableOpacity
            className="absolute inset-0 justify-between bg-black/50"
            activeOpacity={1}
            onPress={toggleControls}>
            {/* Top bar: back, name, 3-dot menu */}
            <View className="flex-row items-center px-4 pt-[50px]">
              <TouchableOpacity
                className="h-11 w-11 items-center justify-center"
                onPress={(e) => {
                  e.stopPropagation();
                  goBack();
                }}>
                <CaretLeft size={26} color="#ffffff" weight="bold" />
              </TouchableOpacity>
              <Text
                className="mx-2 flex-1 text-center text-[15px] font-semibold text-white"
                numberOfLines={1}>
                {file.name}
              </Text>
              <TouchableOpacity
                className="h-11 w-11 items-center justify-center"
                onPress={(e) => {
                  e.stopPropagation();
                  setShowMenu(true);
                }}>
                <DotsThreeVertical size={24} color="#ffffff" weight="bold" />
              </TouchableOpacity>
            </View>

            {/* Spacer */}
            <View />

            {/* Controls: Previous, Play/Pause, Next */}
            <View className="mb-6 flex-row items-center justify-center gap-9">
              <TouchableOpacity
                className="h-11 w-11 items-center justify-center rounded-full bg-black/40"
                style={currentVideoIndexRef.current <= 0 ? { opacity: 0.3 } : undefined}
                onPress={(e) => {
                  e.stopPropagation();
                  goToVideo(currentVideoIndexRef.current - 1);
                }}
                disabled={currentVideoIndexRef.current <= 0}>
                <SkipBack size={24} color="#ffffff" weight="fill" />
              </TouchableOpacity>
              <TouchableOpacity
                className="h-[72px] w-[72px] items-center justify-center rounded-full border-2 bg-black/50"
                style={{ borderColor: primaryColor }}
                onPress={(e) => {
                  e.stopPropagation();
                  togglePlayback();
                }}>
                {isPlaying ? (
                  <Pause size={32} color={primaryColor} weight="fill" />
                ) : (
                  <Play size={32} color={primaryColor} weight="fill" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                className="h-11 w-11 items-center justify-center rounded-full bg-black/40"
                style={
                  currentVideoIndexRef.current >= sortedVideos.length - 1
                    ? { opacity: 0.3 }
                    : undefined
                }
                onPress={(e) => {
                  e.stopPropagation();
                  goToVideo(currentVideoIndexRef.current + 1);
                }}
                disabled={currentVideoIndexRef.current >= sortedVideos.length - 1}>
                <SkipForward size={24} color="#ffffff" weight="fill" />
              </TouchableOpacity>
            </View>

            {/* Progress bar + timers + action row */}
            <View className="px-5 pb-[30px]">
              {/* Progress bar */}
              <View className="mb-3 flex-row items-center gap-2.5">
                <Text className="w-10 text-xs text-white/70">
                  {fileEngine.formatDuration(position)}
                </Text>
                <TouchableOpacity
                  className="h-[20px] flex-1 justify-center"
                  onPress={(e) => {
                    e.stopPropagation();
                    const { locationX } = e.nativeEvent;
                    seekTo(locationX / (SCREEN_WIDTH - 80));
                  }}>
                  <View className="h-1 rounded-sm bg-white/20">
                    <View
                      className="h-full rounded-sm"
                      style={{ width: `${progress}%` as any, backgroundColor: primaryColor }}
                    />
                  </View>
                  <View
                    className="absolute -top-1 h-3 w-3 rounded-full"
                    style={{ left: `${progress}%` as any, backgroundColor: primaryColor }}
                  />
                </TouchableOpacity>
                <Text className="w-10 text-right text-xs text-white/70">
                  {fileEngine.formatDuration(duration)}
                </Text>
              </View>

              {/* Action row: headphones, speed, lock, orientation */}
              <View className="flex-row items-center justify-center gap-4">
                {!isAudioOnly && (
                  <TouchableOpacity
                    className="flex-row items-center gap-1.5 rounded-[10px] bg-zinc-800 px-3 py-2"
                    onPress={(e) => {
                      e.stopPropagation();
                      setIsAudioOnly(true);
                    }}>
                    <Headphones size={14} color="#e4e4e7" />
                    <Text className="text-xs font-semibold text-zinc-200">Audio</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  className="h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-zinc-800"
                  onPress={(e) => {
                    e.stopPropagation();
                    setShowSpeedModal(true);
                  }}>
                  <Text className="text-xs font-bold text-zinc-200">{playbackSpeed}x</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-zinc-800"
                  onPress={(e) => {
                    e.stopPropagation();
                    setIsLocked(!isLocked);
                  }}>
                  {isLocked ? (
                    <Lock size={16} color={primaryColor} weight="fill" />
                  ) : (
                    <LockOpen size={16} color="#e4e4e7" />
                  )}
                </TouchableOpacity>
                {!isAudioOnly && (
                  <TouchableOpacity
                    className="h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-zinc-800"
                    onPress={(e) => {
                      e.stopPropagation();
                      handleOrientationToggle();
                    }}>
                    <ArrowsClockwise size={16} color="#e4e4e7" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* 3-dot Menu Bottom Sheet */}
      {renderSheet(
        showMenu,
        () => setShowMenu(false),
        menuSheet.translateY,
        menuSheet.panHandlers,
        '',
        <ScrollView showsVerticalScrollIndicator={false} className="px-5">
          <Text className="mb-2 text-[11px] font-bold tracking-[1]" style={{ color: '#a1a1aa' }}>
            PLAYBACK
          </Text>
          <TouchableOpacity
            className="flex-row items-center rounded-xl px-2 py-3.5 active:bg-white/5"
            onPress={() => {
              setShowMenu(false);
            }}>
            <PictureInPicture size={20} color={primaryColor} />
            <Text className="ml-3 text-[15px] text-white">Floating Window</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center rounded-xl px-2 py-3.5 active:bg-white/5"
            onPress={() => {
              setShowMenu(false);
              setShowPlayModeModal(true);
            }}>
            <Repeat size={20} color={primaryColor} />
            <Text className="ml-3 text-[15px] text-white">Play Mode</Text>
            <Text className="ml-auto text-xs text-zinc-400">
              {playMode === 'loop'
                ? 'Loop One'
                : playMode === 'loopAll'
                  ? 'Loop All'
                  : playMode === 'shuffle'
                    ? 'Shuffle'
                    : 'Pause After'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center rounded-xl px-2 py-3.5 active:bg-white/5"
            onPress={() => {
              setSubtitlesEnabled(!subtitlesEnabled);
              setShowMenu(false);
            }}>
            <Subtitles
              size={20}
              color={subtitlesEnabled ? primaryColor : '#e4e4e7'}
              weight={subtitlesEnabled ? 'fill' : 'regular'}
            />
            <Text className="ml-3 text-[15px] text-white">Subtitles</Text>
            <Text className="ml-auto text-xs text-zinc-400">{subtitlesEnabled ? 'On' : 'Off'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center rounded-xl px-2 py-3.5 active:bg-white/5"
            onPress={() => {
              setShowMenu(false);
              setShowAudioTrackModal(true);
            }}>
            <Globe size={20} color={primaryColor} />
            <Text className="ml-3 text-[15px] text-white">Audio Track</Text>
            <Text className="ml-auto text-xs text-zinc-400">
              {AUDIO_TRACKS.find((t) => t.id === audioTrack)?.label || 'Default'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center rounded-xl px-2 py-3.5 active:bg-white/5"
            onPress={() => {
              setShowMenu(false);
              setShowEnhancement(true);
            }}>
            <Text className="text-lg" style={{ color: primaryColor }}>
              ✨
            </Text>
            <Text className="ml-3 text-[15px] text-white">Enhance Video</Text>
          </TouchableOpacity>

          <View className="my-3 h-px bg-white/10" />

          <Text className="mb-2 text-[11px] font-bold tracking-[1]" style={{ color: '#a1a1aa' }}>
            ACTIONS
          </Text>
          <TouchableOpacity
            className="flex-row items-center rounded-xl px-2 py-3.5 active:bg-white/5"
            onPress={(e) => {
              e.stopPropagation();
              handleShare();
            }}>
            <ShareNetwork size={20} color={primaryColor} />
            <Text className="ml-3 text-[15px] text-white">Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center rounded-xl px-2 py-3.5 active:bg-white/5"
            onPress={(e) => {
              e.stopPropagation();
              handleAddToPlaylist();
            }}>
            <Queue size={20} color={primaryColor} />
            <Text className="ml-3 text-[15px] text-white">Add to Playlist</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center rounded-xl px-2 py-3.5 active:bg-white/5"
            onPress={(e) => {
              e.stopPropagation();
              handleLockInPrivateFolder();
            }}>
            <FolderLock size={20} color={primaryColor} />
            <Text className="ml-3 text-[15px] text-white">Lock in Private Folder</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center rounded-xl px-2 py-3.5 active:bg-white/5"
            onPress={(e) => {
              e.stopPropagation();
              setShowInfo(true);
              setShowMenu(false);
            }}>
            <Info size={20} color={primaryColor} />
            <Text className="ml-3 text-[15px] text-white">Information</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center rounded-xl px-2 py-3.5 active:bg-white/5"
            onPress={(e) => {
              e.stopPropagation();
              setShowMenu(false);
              handleDelete();
            }}>
            <Trash size={20} color="#ef4444" />
            <Text className="ml-3 text-[15px] text-[#ef4444]">Delete</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Play Mode Sheet */}
      {renderSheet(
        showPlayModeModal,
        () => setShowPlayModeModal(false),
        playModeSheet.translateY,
        playModeSheet.panHandlers,
        'Play Mode',
        <View className="px-5">
          {[
            { mode: 'loop' as PlayMode, label: 'Loop One', Icon: Repeat },
            { mode: 'loopAll' as PlayMode, label: 'Loop All', Icon: Repeat },
            { mode: 'shuffle' as PlayMode, label: 'Shuffle', Icon: Shuffle },
            { mode: 'pauseAfter' as PlayMode, label: 'Pause After Play', Icon: Pause },
          ].map(({ mode, label, Icon }) => (
            <TouchableOpacity
              key={mode}
              className="mb-2 flex-row items-center gap-3 rounded-xl px-4 py-[14px]"
              style={playMode === mode ? { backgroundColor: `${primaryColor}15` } : undefined}
              onPress={() => {
                setPlayMode(mode);
                setShowPlayModeModal(false);
              }}>
              <Icon
                size={20}
                color={playMode === mode ? primaryColor : '#e4e4e7'}
                weight={playMode === mode ? 'fill' : 'regular'}
              />
              <Text
                className={`text-base ${playMode === mode ? 'font-bold' : 'font-medium'} text-zinc-200`}>
                {label}
              </Text>
              {playMode === mode && (
                <Check
                  size={18}
                  color={primaryColor}
                  weight="bold"
                  style={{ marginLeft: 'auto' }}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Audio Track Sheet */}
      {renderSheet(
        showAudioTrackModal,
        () => setShowAudioTrackModal(false),
        audioTrackSheet.translateY,
        audioTrackSheet.panHandlers,
        'Audio Track',
        <ScrollView className="max-h-80 px-5" showsVerticalScrollIndicator={false}>
          {AUDIO_TRACKS.map((track) => (
            <TouchableOpacity
              key={track.id}
              className="mb-2 flex-row items-center gap-3 rounded-xl px-4 py-[14px]"
              style={audioTrack === track.id ? { backgroundColor: `${primaryColor}15` } : undefined}
              onPress={() => {
                setAudioTrack(track.id);
                setShowAudioTrackModal(false);
              }}>
              <Globe size={18} color={audioTrack === track.id ? primaryColor : '#e4e4e7'} />
              <Text
                className={`text-base ${audioTrack === track.id ? 'font-bold' : 'font-medium'} text-zinc-200`}>
                {track.label}
              </Text>
              {audioTrack === track.id && (
                <Check
                  size={18}
                  color={primaryColor}
                  weight="bold"
                  style={{ marginLeft: 'auto' }}
                />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Speed Sheet */}
      {renderSheet(
        showSpeedModal,
        () => setShowSpeedModal(false),
        speedSheet.translateY,
        speedSheet.panHandlers,
        'Playback Speed',
        <View className="flex-row flex-wrap justify-center gap-2 px-5">
          {SPEEDS.map((speed) => (
            <TouchableOpacity
              key={speed}
              className="rounded-xl border px-4 py-3"
              style={[
                playbackSpeed === speed && { backgroundColor: primaryColor },
                { borderColor: playbackSpeed === speed ? primaryColor : '#3f3f46' },
              ]}
              onPress={() => changeSpeed(speed)}>
              <Text
                className={`text-center text-sm ${playbackSpeed === speed ? 'font-bold' : ''}`}
                style={{ color: playbackSpeed === speed ? '#0a0a0a' : '#e4e4e7' }}>
                {speed}x
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Resize/Content Fit Sheet */}
      {renderSheet(
        showResizeModal,
        () => setShowResizeModal(false),
        resizeSheet.translateY,
        resizeSheet.panHandlers,
        'Video Size',
        <View className="px-5">
          {CONTENT_FITS.map(({ mode, label }) => (
            <TouchableOpacity
              key={label}
              className="mb-2 flex-row items-center gap-3 rounded-xl px-4 py-[14px]"
              style={contentFit === mode ? { backgroundColor: `${primaryColor}15` } : undefined}
              onPress={() => {
                setContentFit(mode);
                setShowResizeModal(false);
              }}>
              <Text
                className={`text-base ${contentFit === mode ? 'font-bold' : 'font-medium'} text-zinc-200`}>
                {label}
              </Text>
              {contentFit === mode && (
                <Check
                  size={18}
                  color={primaryColor}
                  weight="bold"
                  style={{ marginLeft: 'auto' }}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Info Sheet */}
      {renderSheet(
        showInfo,
        () => setShowInfo(false),
        infoSheet.translateY,
        infoSheet.panHandlers,
        'Video Info',
        <View className="px-5">
          <View className="flex-row justify-between border-b border-white/5 py-[10px]">
            <Text className="flex-1 text-sm text-white/60">Name</Text>
            <Text className="flex-[2] text-right text-sm text-white" numberOfLines={2}>
              {file.name}
            </Text>
          </View>
          {file.size && (
            <View className="flex-row justify-between border-b border-white/5 py-[10px]">
              <Text className="flex-1 text-sm text-white/60">Size</Text>
              <Text className="flex-[2] text-right text-sm text-white">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </Text>
            </View>
          )}
          <View className="flex-row justify-between border-b border-white/5 py-[10px]">
            <Text className="flex-1 text-sm text-white/60">Duration</Text>
            <Text className="flex-[2] text-right text-sm text-white">
              {fileEngine.formatDuration(duration)}
            </Text>
          </View>
          <View className="flex-row justify-between border-b border-white/5 py-[10px]">
            <Text className="flex-1 text-sm text-white/60">Resolution</Text>
            <Text className="flex-[2] text-right text-sm text-white">{'N/A'}</Text>
          </View>
          <View className="flex-row justify-between border-b border-white/5 py-[10px]">
            <Text className="flex-1 text-sm text-white/60">Play Mode</Text>
            <Text className="flex-[2] text-right text-sm text-white">{playMode}</Text>
          </View>
          <View className="flex-row justify-between border-b border-white/5 py-[10px]">
            <Text className="flex-1 text-sm text-white/60">Speed</Text>
            <Text className="flex-[2] text-right text-sm text-white">{playbackSpeed}x</Text>
          </View>
        </View>
      )}

      <VideoEnhancementModal
        visible={showEnhancement}
        onClose={() => setShowEnhancement(false)}
        currentSettings={{
          enabled: false,
          qualityTarget: 'original',
          colorEnhancement: false,
          sharpening: false,
          denoise: false,
          hdr: false,
        }}
        onApply={() => {}}
        fileUri={file.uri}
        primaryColor={primaryColor}
      />
    </View>
  );
}
