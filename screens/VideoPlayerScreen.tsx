import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Dimensions,
  StatusBar,
  Platform,
  Animated,
  Alert,
  Share,
  ScrollView,
  PanResponder,
  Pressable,
  StyleSheet,
  Image,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { setAudioModeAsync } from 'expo-audio';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as ScreenOrientation from 'expo-screen-orientation';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, FileItem } from '../types';
import {
  CaretDown,
  Broadcast,
  DotsThreeVertical,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Heart,
  ThumbsUp,
  Queue,
  DownloadSimple,
  ShareNetwork,
  VideoCamera,
  Check,
  Info,
  Trash,
  Headphones,
  Lock,
  LockOpen,
  ArrowsClockwise,
  Subtitles,
} from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';
import { useColorAwareness } from '../context/ColorAwarenessContext';
import { colorAwarenessEngine } from '../services/ColorAwarenessEngine';
import { NeonSlider } from '../components/NeonSlider';
import { formatDuration } from '../utils/format';
import { videoEngine } from '../engine/VideoEngine';
import { queueEngine } from '../engine/QueueEngine';
import { HistoryService } from '../services/History/HistoryService';
import { BottomSheet } from '../services/OverlaySystem';
import { useFavoritesStore } from '../stores/favoritesStore';
import { usePlaylistStore } from '../stores/playlistStore';

type Props = NativeStackScreenProps<RootStackParamList, 'VideoPlayer'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const VIDEO_HEIGHT = 250;
const VIDEO_WIDTH = SCREEN_WIDTH * 0.92;

type ContentFit = 'contain' | 'cover' | 'fill';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

type PlayMode = 'loop' | 'loopAll' | 'shuffle' | 'pauseAfter';

export function VideoPlayerScreen({ navigation, route }: Props) {
  const { file, isAudioOnly: initialAudioOnly } = route.params;
  const { primaryColor, textColor, mutedColor, isDarkMode, cardBg } = useTheme();
  const { themeColors, canUseArtwork, state: artState } = useColorAwareness();

  const player = useVideoPlayer(file.uri);

  const [showControls, setShowControls] = useState(true);
  const [contentFit, setContentFit] = useState<ContentFit>('contain');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isAudioOnly, setIsAudioOnly] = useState(initialAudioOnly || false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showSpeedModal, setShowSpeedModal] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showPlayModeModal, setShowPlayModeModal] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState({
    isPlaying: false,
    position: 0,
    duration: 0,
  });
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const [playMode, setPlayMode] = useState<PlayMode>('loopAll');
  const [isLocked, setIsLocked] = useState(false);
  const [orientationLock, setOrientationLock] = useState<'portrait' | 'landscape'>('portrait');
  const [isFavorite, setIsFavorite] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const toggleFavoriteVideo = useFavoritesStore((s) => s.toggleFavorite);
  const favoriteUris = useFavoritesStore((s) => s.favoriteUris);
  const createPlaylist = usePlaylistStore((s) => s.create);
  const addSongsToPlaylist = usePlaylistStore((s) => s.addSongs);
  const playlists = usePlaylistStore((s) => s.playlists);

  useEffect(() => {
    setIsFavorite(favoriteUris.includes(file.uri));
  }, [file.uri, favoriteUris]);

  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const autoHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showControlsRef = useRef(true);
  const currentVideoIndexRef = useRef(0);
  const heartScale = useRef(new Animated.Value(1)).current;

  const { isPlaying, position, duration } = playbackStatus;
  const progress = duration > 0 ? position / duration : 0;

  const gradientColors = useMemo(() => {
    if (canUseArtwork) {
      return [artState.theme.background, artState.theme.surface, '#000'] as const;
    }
    return [primaryColor + '40', cardBg || '#111', '#000'] as const;
  }, [canUseArtwork, artState, primaryColor, cardBg]);

  const accentColor = useMemo(
    () => (canUseArtwork ? themeColors.accent : primaryColor),
    [canUseArtwork, themeColors.accent, primaryColor]
  );

  const videoGlowColor = useMemo(
    () => (canUseArtwork ? themeColors.primary : primaryColor),
    [canUseArtwork, themeColors.primary, primaryColor]
  );

  // Subscribe to engine state
  useEffect(() => {
    const unsub = videoEngine.subscribe(() => {
      const s = videoEngine.getState();
      setPlaybackStatus({
        isPlaying: s.isPlaying,
        position: s.position,
        duration: s.duration,
      });
      setCurrentSubtitle(s.currentSubtitle);
      setSubtitlesEnabled(s.subtitlesEnabled);
      setContentFit(s.contentFit);
      setPlaybackSpeed(s.playbackSpeed);
    });
    return unsub;
  }, []);

  // Load file + trigger color extraction from thumbnail
  useEffect(() => {
    videoEngine.loadFile(file);
    queueEngine.setVideoQueue([file], 0);
    currentVideoIndexRef.current = 0;
    if (file.thumbnail) {
      colorAwarenessEngine.extractFromArtwork(file.thumbnail, {
        artist: file.artist,
      });
    }
    return () => {
      videoEngine.cleanup();
      ScreenOrientation.unlockAsync().catch(() => {});
      if (autoHideRef.current) clearTimeout(autoHideRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.uri]);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: isAudioOnly,
      interruptionMode: 'doNotMix',
    });
  }, [isAudioOnly]);

  useEffect(() => {
    videoEngine.attachPlayer(player);
    player.play();
    return () => videoEngine.attachPlayer(null);
  }, [player]);

  // Track end detection
  const prevPlayingRef = useRef(false);
  useEffect(() => {
    if (prevPlayingRef.current && !isPlaying && duration > 0 && position >= duration - 1000) {
      if (playMode === 'loop') {
        player.currentTime = 0;
        player.play();
      } else if (playMode === 'loopAll' || playMode === 'shuffle') {
        const nextFile = videoEngine.nextInQueue();
        if (nextFile) {
          navigation.replace('VideoPlayer', { file: nextFile });
        }
      }
    }
    prevPlayingRef.current = isPlaying;
  }, [isPlaying, position, duration, player, navigation, playMode]);

  // History tracking
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
  }, [file]);

  useEffect(() => {
    showControlsRef.current = showControls;
  }, [showControls]);

  const startAutoHide = useCallback(() => {
    if (autoHideRef.current) clearTimeout(autoHideRef.current);
    autoHideRef.current = setTimeout(() => {
      if (showControlsRef.current && !isLocked) {
        setShowControls(false);
        Animated.timing(controlsOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }
    }, 3000);
  }, [isLocked, controlsOpacity]);

  const toggleControls = useCallback(() => {
    if (isLocked) return;
    const newShow = !showControlsRef.current;
    setShowControls(newShow);
    showControlsRef.current = newShow;
    Animated.timing(controlsOpacity, {
      toValue: newShow ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      if (newShow) startAutoHide();
    });
  }, [isLocked, controlsOpacity, startAutoHide]);

  const togglePlayback = useCallback(() => {
    try {
      if (isPlaying) {
        player.pause();
        HistoryService.pausePlaySession(file.uri);
      } else {
        player.play();
        HistoryService.resumePlaySession(file.uri);
      }
    } catch (e) {
      console.warn('[VideoPlayer] Playback toggle failed:', e);
    }
  }, [isPlaying, player, file.uri]);

  const seekTo = useCallback(
    (percent: number) => {
      if (!duration) return;
      player.currentTime = percent * (duration / 1000);
    },
    [duration, player]
  );

  const skip = useCallback(
    (seconds: number) => {
      player.seekBy(seconds);
    },
    [player]
  );

  const changeSpeed = useCallback((speed: number) => {
    videoEngine.setRate(speed);
    setPlaybackSpeed(speed);
    setShowSpeedModal(false);
  }, []);

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  const toggleFavorite = useCallback(() => {
    toggleFavoriteVideo(file.uri);
    setIsFavorite((prev) => !prev);
    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(heartScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [heartScale, file.uri, toggleFavoriteVideo]);

  const nextVideo = useCallback(() => {
    const next = videoEngine.nextInQueue();
    if (next) navigation.replace('VideoPlayer', { file: next });
  }, [navigation]);

  const prevVideo = useCallback(() => {
    const prev = videoEngine.prevInQueue();
    if (prev) navigation.replace('VideoPlayer', { file: prev });
  }, [navigation]);

  const handleDelete = () => {
    Alert.alert('Delete Video', `Delete "${file.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { StorageService: Svc } = await import('../services/StorageService');
          await Svc.addToRecentlyDeleted(file);
          await Svc.moveToTrash(file);
          navigation.goBack();
        },
      },
    ]);
  };

  const handleShare = async () => {
    try {
      await Share.share({ url: file.uri, title: file.name });
    } catch {}
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

  // Double-tap seek
  const lastTapRef = useRef(0);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTapSideRef = useRef<'left' | 'right' | null>(null);

  const handleVideoTap = useCallback(
    (evt: any) => {
      if (isLocked) return;
      const now = Date.now();
      const { locationX } = evt.nativeEvent;
      const side = locationX < VIDEO_WIDTH / 2 ? 'left' : 'right';

      if (now - lastTapRef.current < 300 && pendingTapSideRef.current === side) {
        if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
        skip(side === 'left' ? -10 : 10);
        pendingTapSideRef.current = null;
      } else {
        pendingTapSideRef.current = side;
        if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = setTimeout(() => {
          toggleControls();
          pendingTapSideRef.current = null;
        }, 300);
      }
      lastTapRef.current = now;
    },
    [isLocked, skip, toggleControls]
  );

  // Swipe down to dismiss
  const swipeTranslateY = useRef(new Animated.Value(0)).current;
  const videoSwipePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 15 && Math.abs(gs.dx) < 30,
      onPanResponderGrant: () => {
        swipeTranslateY.setOffset(0);
        swipeTranslateY.setValue(0);
      },
      onPanResponderMove: (_, gs) => {
        swipeTranslateY.setValue(gs.dy * 0.3);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80) {
          Animated.timing(swipeTranslateY, {
            toValue: SCREEN_HEIGHT,
            duration: 250,
            useNativeDriver: true,
          }).start(() => navigation.goBack());
        } else if (gs.dy < -60) {
          nextVideo();
        } else {
          Animated.spring(swipeTranslateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(swipeTranslateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const displayTitle = file.name.replace(/\.[^/.]+$/, '');
  const displayArtist = file.artist || 'Unknown Artist';

  const qs = queueEngine.getVideoState();
  const upNextQueue = qs.queue.slice(qs.currentIndex + 1);

  return (
    <View className="flex-1" style={{ backgroundColor: '#000' }}>
      <StatusBar hidden />
      <Animated.View
        className="flex-1"
        style={{ transform: [{ translateY: swipeTranslateY }] }}
        {...videoSwipePan.panHandlers}>
        {/* Immersive blurred background */}
        {file.thumbnail && (
          <Image
            source={{ uri: file.thumbnail }}
            blurRadius={100}
            style={[StyleSheet.absoluteFill, { opacity: 0.2 }]}
          />
        )}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />

        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />

        <SafeAreaView className="flex-1" style={{ backgroundColor: 'transparent' }}>
          {/* Header */}
          <BlurView intensity={40} tint={isDarkMode ? 'dark' : 'light'} style={styles.header}>
            <View className="flex-row items-center justify-between px-4 py-2">
              <TouchableOpacity
                className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
                onPress={goBack}
                activeOpacity={0.7}
                accessibilityLabel="Go back"
                accessibilityRole="button">
                <CaretDown size={22} color="#ffffff" weight="bold" />
              </TouchableOpacity>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
                  activeOpacity={0.7}
                  accessibilityLabel="Broadcast"
                  accessibilityRole="button">
                  <Broadcast size={20} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity
                  className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
                  onPress={() => setShowMenu(true)}
                  activeOpacity={0.7}
                  accessibilityLabel="More options"
                  accessibilityRole="button">
                  <DotsThreeVertical size={20} color="#ffffff" weight="bold" />
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            bounces={false}>
            {/* Video Container */}
            <View style={styles.videoContainer}>
              <View
                style={[
                  styles.videoWrapper,
                  {
                    shadowColor: videoGlowColor,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 20,
                    elevation: 8,
                  },
                ]}>
                {!isAudioOnly ? (
                  <VideoView
                    player={player}
                    style={styles.video}
                    contentFit={contentFit}
                    nativeControls={false}
                    allowsPictureInPicture={Platform.OS !== 'web'}
                  />
                ) : (
                  <View
                    className="items-center justify-center bg-[#0a0a0a]"
                    style={[styles.video, { borderRadius: 24 }]}>
                    <View
                      className="h-20 w-20 items-center justify-center rounded-[20px] border-2 bg-white/[0.03]"
                      style={{ borderColor: accentColor + '60' }}>
                      <Image
                        source={require('../assets/note.png')}
                        style={{
                          width: 40,
                          height: 40,
                          tintColor: accentColor,
                        }}
                      />
                    </View>
                    <Text
                      className="mt-3 text-sm font-semibold tracking-[2px]"
                      style={{ color: accentColor }}>
                      Audio Mode
                    </Text>
                    <TouchableOpacity
                      className="mt-3 flex-row items-center gap-2 rounded-xl px-4 py-2"
                      style={{ backgroundColor: `${accentColor}20` }}
                      onPress={() => setIsAudioOnly(false)}>
                      <VideoCamera size={14} color={accentColor} />
                      <Text className="text-xs font-semibold" style={{ color: accentColor }}>
                        Switch to Video
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Overlay controls */}
                <Animated.View
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      opacity: controlsOpacity,
                      pointerEvents: showControls && !isAudioOnly ? 'auto' : 'none',
                    },
                  ]}>
                  <Pressable style={styles.overlayTouchable} onPress={handleVideoTap}>
                    <View className="flex-row items-center justify-center gap-8">
                      <TouchableOpacity
                        className="items-center justify-center"
                        onPress={(e) => {
                          e.stopPropagation();
                          prevVideo();
                        }}
                        accessibilityLabel="Previous video"
                        accessibilityRole="button">
                        <SkipBack size={42} color="#ffffff" weight="fill" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="h-20 w-20 items-center justify-center rounded-full border-2 border-white/20 bg-black/40"
                        onPress={(e) => {
                          e.stopPropagation();
                          togglePlayback();
                        }}
                        accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                        accessibilityRole="button">
                        {isPlaying ? (
                          <Pause size={36} color="#ffffff" weight="fill" />
                        ) : (
                          <Play size={36} color="#ffffff" weight="fill" />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="items-center justify-center"
                        onPress={(e) => {
                          e.stopPropagation();
                          nextVideo();
                        }}
                        accessibilityLabel="Next video"
                        accessibilityRole="button">
                        <SkipForward size={42} color="#ffffff" weight="fill" />
                      </TouchableOpacity>
                    </View>
                  </Pressable>
                </Animated.View>

                {/* Subtitle overlay */}
                {currentSubtitle && subtitlesEnabled && !isAudioOnly && (
                  <View
                    className="absolute inset-0 items-center justify-end pb-4"
                    style={{ pointerEvents: 'none' }}>
                    <View className="max-w-[85%] rounded-xl border border-white/10 bg-black/60 px-4 py-2">
                      <Text className="text-center text-sm font-medium text-white">
                        {currentSubtitle}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Progress Bar */}
              <View className="mt-3 flex-row items-center gap-2 px-1">
                <Text className="w-10 text-xs" style={{ color: mutedColor }}>
                  {formatDuration(position)}
                </Text>
                <View className="flex-1">
                  <NeonSlider
                    progress={progress}
                    onSeek={seekTo}
                    primaryColor={accentColor}
                    height={4}
                    showThumb
                  />
                </View>
                <Text className="w-10 text-right text-xs" style={{ color: mutedColor }}>
                  {formatDuration(duration)}
                </Text>
              </View>
            </View>

            {/* Metadata + Favorite */}
            <View className="mt-6 flex-row items-start justify-between px-5">
              <View className="flex-1 pr-4">
                <Text
                  className="font-bold leading-tight"
                  style={{ fontSize: 32, color: '#ffffff' }}
                  numberOfLines={2}>
                  {displayTitle}
                </Text>
                <Text
                  className="mt-1 text-base"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                  numberOfLines={1}>
                  {displayArtist}
                </Text>
              </View>
              <TouchableOpacity
                onPress={toggleFavorite}
                className="h-12 w-12 items-center justify-center rounded-full bg-white/10"
                accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                accessibilityRole="button">
                <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                  <Heart
                    size={24}
                    color={accentColor}
                    weight={isFavorite ? 'fill' : 'regular'}
                    style={isFavorite ? { color: accentColor } : {}}
                  />
                </Animated.View>
              </TouchableOpacity>
            </View>

            {/* Quick Actions */}
            <View className="mt-5 px-5">
              <BlurView
                intensity={50}
                tint={isDarkMode ? 'dark' : 'light'}
                style={styles.quickActionsBlur}>
                <View className="flex-row items-center justify-around py-3">
                  {[
                    {
                      Icon: ThumbsUp,
                      label: 'Like',
                      onPress: () => toggleFavorite(),
                      active: isFavorite,
                    },
                    { Icon: Queue, label: 'Playlist', onPress: () => setShowAddToPlaylist(true) },
                    {
                      Icon: DownloadSimple,
                      label: 'Download',
                      onPress: () =>
                        Alert.alert(
                          'Download',
                          'Video download will be available in a future update.'
                        ),
                    },
                    { Icon: ShareNetwork, label: 'Share', onPress: handleShare },
                  ].map(({ Icon, label, onPress, active }, idx) => (
                    <TouchableOpacity
                      key={label}
                      className="items-center gap-1.5 px-4 py-1"
                      onPress={onPress}
                      activeOpacity={0.6}
                      accessibilityLabel={label}
                      accessibilityRole="button">
                      <Icon
                        size={22}
                        color={active ? accentColor : mutedColor}
                        weight={active ? 'fill' : 'regular'}
                      />
                      <Text
                        className="text-xs font-medium"
                        style={{ color: active ? accentColor : mutedColor }}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </BlurView>
            </View>

            {/* Main Playback Controls */}
            <View className="mt-8 flex-row items-center justify-center gap-6 px-5">
              <TouchableOpacity
                className="items-center justify-center"
                onPress={() => {
                  queueEngine.toggleShuffle('video');
                }}
                activeOpacity={0.6}
                accessibilityLabel="Toggle shuffle"
                accessibilityRole="button">
                <Shuffle size={24} color={mutedColor} />
              </TouchableOpacity>
              <TouchableOpacity
                className="items-center justify-center"
                onPress={prevVideo}
                activeOpacity={0.6}
                accessibilityLabel="Previous video"
                accessibilityRole="button">
                <SkipBack size={32} color="#ffffff" weight="fill" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={togglePlayback}
                activeOpacity={0.8}
                accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                accessibilityRole="button"
                style={[
                  styles.playButton,
                  {
                    backgroundColor: accentColor,
                    shadowColor: accentColor,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.5,
                    shadowRadius: 16,
                    elevation: 10,
                  },
                ]}>
                {isPlaying ? (
                  <Pause size={36} color="#000000" weight="fill" />
                ) : (
                  <Play size={36} color="#000000" weight="fill" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                className="items-center justify-center"
                onPress={nextVideo}
                activeOpacity={0.6}
                accessibilityLabel="Next video"
                accessibilityRole="button">
                <SkipForward size={32} color="#ffffff" weight="fill" />
              </TouchableOpacity>
              <TouchableOpacity
                className="items-center justify-center"
                onPress={() => {
                  const modes: PlayMode[] = ['loopAll', 'loop', 'shuffle', 'pauseAfter'];
                  const idx = modes.indexOf(playMode);
                  setPlayMode(modes[(idx + 1) % modes.length]);
                }}
                activeOpacity={0.6}
                accessibilityLabel="Toggle repeat"
                accessibilityRole="button">
                <Repeat
                  size={24}
                  color={playMode === 'loopAll' ? accentColor : mutedColor}
                  weight={playMode === 'loopAll' ? 'fill' : 'regular'}
                />
              </TouchableOpacity>
            </View>

            {/* Utility Buttons Row */}
            <View className="mt-4 flex-row items-center justify-center gap-4">
              {!isAudioOnly && (
                <TouchableOpacity
                  className="flex-row items-center gap-1.5 rounded-[10px] px-3 py-2"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                  onPress={() => setIsAudioOnly(true)}
                  accessibilityLabel="Switch to audio mode"
                  accessibilityRole="button">
                  <Headphones size={14} color={mutedColor} />
                  <Text className="text-xs font-semibold" style={{ color: mutedColor }}>
                    Audio
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                className="h-[44px] w-[44px] items-center justify-center rounded-[11px]"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                onPress={() => setShowSpeedModal(true)}
                accessibilityLabel="Change playback speed"
                accessibilityRole="button">
                <Text className="text-xs font-bold" style={{ color: mutedColor }}>
                  {playbackSpeed}x
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="h-[44px] w-[44px] items-center justify-center rounded-[11px]"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                onPress={() => setIsLocked(!isLocked)}
                accessibilityLabel={isLocked ? 'Unlock screen' : 'Lock screen'}
                accessibilityRole="button">
                {isLocked ? (
                  <Lock size={16} color={accentColor} weight="fill" />
                ) : (
                  <LockOpen size={16} color={mutedColor} />
                )}
              </TouchableOpacity>
              {!isAudioOnly && (
                <TouchableOpacity
                  className="h-[44px] w-[44px] items-center justify-center rounded-[11px]"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                  onPress={handleOrientationToggle}
                  accessibilityLabel="Toggle orientation"
                  accessibilityRole="button">
                  <ArrowsClockwise size={16} color={mutedColor} />
                </TouchableOpacity>
              )}
            </View>

            {/* Up Next Queue */}
            {upNextQueue.length > 0 && (
              <View className="mb-8 mt-6 px-5">
                <Text
                  className="mb-3 text-sm font-semibold uppercase tracking-wider"
                  style={{ color: mutedColor }}>
                  Up Next
                </Text>
                {upNextQueue.map((item: FileItem, index: number) => (
                  <TouchableOpacity
                    key={item.uri + index}
                    activeOpacity={0.7}
                    style={styles.upNextItem}
                    onPress={() => navigation.replace('VideoPlayer', { file: item })}>
                    <View style={styles.upNextThumb}>
                      {item.thumbnail ? (
                        <Image
                          source={{ uri: item.thumbnail }}
                          className="h-full w-full"
                          style={{ borderRadius: 12 }}
                        />
                      ) : (
                        <View
                          className="h-full w-full items-center justify-center"
                          style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                          <VideoCamera size={24} color={mutedColor} />
                        </View>
                      )}
                    </View>
                    <View className="ml-3 flex-1 justify-center">
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: '#ffffff' }}
                        numberOfLines={1}>
                        {item.name.replace(/\.[^/.]+$/, '')}
                      </Text>
                      <Text
                        className="mt-0.5 text-xs"
                        style={{ color: mutedColor }}
                        numberOfLines={1}>
                        {item.artist || 'Unknown'}
                      </Text>
                    </View>
                    {item.duration ? (
                      <Text className="ml-2 text-xs" style={{ color: mutedColor }}>
                        {formatDuration(item.duration)}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Animated.View>

      {/* Bottom Sheets */}
      <BottomSheet visible={showMenu} onClose={() => setShowMenu(false)}>
        <View className="px-5">
          <TouchableOpacity
            className="flex-row items-center rounded-xl px-2 py-3.5 active:opacity-70"
            onPress={() => {
              setShowMenu(false);
              setShowPlayModeModal(true);
            }}>
            <Repeat size={20} color={accentColor} />
            <Text className="ml-3 text-[15px]" style={{ color: textColor }}>
              Play Mode
            </Text>
            <Text className="ml-auto text-xs" style={{ color: mutedColor }}>
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
            className="flex-row items-center rounded-xl px-2 py-3.5 active:opacity-70"
            onPress={() => {
              setSubtitlesEnabled(!subtitlesEnabled);
              setShowMenu(false);
            }}>
            <Subtitles
              size={20}
              color={subtitlesEnabled ? accentColor : mutedColor}
              weight={subtitlesEnabled ? 'fill' : 'regular'}
            />
            <Text className="ml-3 text-[15px]" style={{ color: textColor }}>
              Subtitles
            </Text>
            <Text className="ml-auto text-xs" style={{ color: mutedColor }}>
              {subtitlesEnabled ? 'On' : 'Off'}
            </Text>
          </TouchableOpacity>
          <View
            className="my-3 h-px"
            style={{
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
            }}
          />
          <TouchableOpacity
            className="flex-row items-center rounded-xl px-2 py-3.5 active:opacity-70"
            onPress={handleShare}>
            <ShareNetwork size={20} color={accentColor} />
            <Text className="ml-3 text-[15px]" style={{ color: textColor }}>
              Share
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center rounded-xl px-2 py-3.5 active:opacity-70"
            onPress={() => {
              setShowMenu(false);
              setShowInfo(true);
            }}>
            <Info size={20} color={accentColor} />
            <Text className="ml-3 text-[15px]" style={{ color: textColor }}>
              Information
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center rounded-xl px-2 py-3.5 active:opacity-70"
            onPress={handleDelete}>
            <Trash size={20} color="#ef4444" />
            <Text className="ml-3 text-[15px] text-[#ef4444]">Delete</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={showSpeedModal}
        onClose={() => setShowSpeedModal(false)}
        title="Playback Speed">
        <View className="flex-row flex-wrap justify-center gap-2 px-5">
          {SPEEDS.map((speed) => (
            <TouchableOpacity
              key={speed}
              className="rounded-xl border px-4 py-3"
              style={[
                playbackSpeed === speed && { backgroundColor: accentColor },
                {
                  borderColor:
                    playbackSpeed === speed ? accentColor : isDarkMode ? '#3f3f46' : '#d4d4d8',
                },
              ]}
              onPress={() => changeSpeed(speed)}>
              <Text
                className={`text-center text-sm ${playbackSpeed === speed ? 'font-bold' : ''}`}
                style={{
                  color: playbackSpeed === speed ? (isDarkMode ? '#0a0a0a' : '#ffffff') : textColor,
                }}>
                {speed}x
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheet>

      <BottomSheet
        visible={showPlayModeModal}
        onClose={() => setShowPlayModeModal(false)}
        title="Play Mode">
        <View className="px-5">
          {(
            [
              { mode: 'loop' as PlayMode, label: 'Loop One', Icon: Repeat },
              { mode: 'loopAll' as PlayMode, label: 'Loop All', Icon: Repeat },
              { mode: 'shuffle' as PlayMode, label: 'Shuffle', Icon: Shuffle },
              {
                mode: 'pauseAfter' as PlayMode,
                label: 'Pause After Play',
                Icon: Pause,
              },
            ] as const
          ).map(({ mode, label, Icon }) => (
            <TouchableOpacity
              key={mode}
              className="mb-2 flex-row items-center gap-3 rounded-xl px-4 py-[14px]"
              style={playMode === mode ? { backgroundColor: `${accentColor}15` } : undefined}
              onPress={() => {
                setPlayMode(mode);
                setShowPlayModeModal(false);
              }}>
              <Icon
                size={20}
                color={playMode === mode ? accentColor : mutedColor}
                weight={playMode === mode ? 'fill' : 'regular'}
              />
              <Text
                className={`text-base ${playMode === mode ? 'font-bold' : 'font-medium'}`}
                style={{ color: textColor }}>
                {label}
              </Text>
              {playMode === mode && (
                <Check size={18} color={accentColor} weight="bold" style={{ marginLeft: 'auto' }} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheet>

      <BottomSheet visible={showInfo} onClose={() => setShowInfo(false)} title="Video Info">
        <View className="px-5">
          <View className="flex-row justify-between border-b border-white/5 py-[10px]">
            <Text className="flex-1 text-sm" style={{ color: mutedColor }}>
              Name
            </Text>
            <Text
              className="flex-[2] text-right text-sm"
              style={{ color: textColor }}
              numberOfLines={2}>
              {file.name}
            </Text>
          </View>
          {file.size && (
            <View className="flex-row justify-between border-b border-white/5 py-[10px]">
              <Text className="flex-1 text-sm" style={{ color: mutedColor }}>
                Size
              </Text>
              <Text className="flex-[2] text-right text-sm" style={{ color: textColor }}>
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </Text>
            </View>
          )}
          <View className="flex-row justify-between border-b border-white/5 py-[10px]">
            <Text className="flex-1 text-sm" style={{ color: mutedColor }}>
              Duration
            </Text>
            <Text className="flex-[2] text-right text-sm" style={{ color: textColor }}>
              {formatDuration(duration)}
            </Text>
          </View>
        </View>
      </BottomSheet>

      {/* Add to Playlist Modal */}
      <BottomSheet visible={showAddToPlaylist} onClose={() => setShowAddToPlaylist(false)}>
        <View className="px-5">
          <Text className="mb-4 text-lg font-bold" style={{ color: textColor }}>
            Add to Playlist
          </Text>
          <View className="mb-4 flex-row gap-2.5">
            <TextInput
              className="flex-1 rounded-xl px-3.5 py-3 text-sm"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: textColor }}
              placeholder="New playlist name"
              placeholderTextColor={mutedColor}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
            />
            <TouchableOpacity
              className="justify-center rounded-xl px-4"
              style={{ backgroundColor: primaryColor }}
              onPress={() => {
                if (!newPlaylistName.trim()) return;
                createPlaylist(newPlaylistName.trim());
                setNewPlaylistName('');
              }}>
              <Text
                className="text-sm font-bold"
                style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                Create
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView className="max-h-[200px]">
            {playlists.map((pl) => (
              <TouchableOpacity
                key={pl.id}
                className="flex-row items-center border-b py-3"
                style={{ borderBottomColor: 'rgba(255,255,255,0.05)' }}
                onPress={() => {
                  addSongsToPlaylist(pl.id, [file]);
                  setShowAddToPlaylist(false);
                }}>
                <Queue size={20} color={mutedColor} />
                <View className="ml-3 flex-1">
                  <Text className="text-[15px]" style={{ color: textColor }}>
                    {pl.name}
                  </Text>
                  <Text className="text-xs" style={{ color: mutedColor }}>
                    {pl.totalTracks} tracks
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            {playlists.length === 0 && (
              <Text className="py-5 text-center text-sm" style={{ color: mutedColor }}>
                No playlists yet
              </Text>
            )}
          </ScrollView>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  videoContainer: {
    alignItems: 'center',
    paddingHorizontal: SCREEN_WIDTH * 0.04,
  },
  videoWrapper: {
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  overlayTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionsBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  upNextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  upNextThumb: {
    width: 120,
    height: 70,
    borderRadius: 16,
    overflow: 'hidden',
  },
});
