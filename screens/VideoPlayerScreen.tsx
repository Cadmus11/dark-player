import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
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
  Repeat,
  Shuffle,
  Check,
  DotsThreeVertical,
  Headphones,
  Lock,
  LockOpen,
  ArrowsClockwise,
  ShareNetwork,
} from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';
import { fileEngine } from '../engine/FileEngine';
import { videoEngine } from '../engine/VideoEngine';
import { queueEngine } from '../engine/QueueEngine';
import type { SubtitleEntry } from '../types';
import { VideoEnhancementModal } from '../components/player/VideoEnhancementModal';
import { HistoryService } from '../services/History/HistoryService';
import { StorageService } from '../services/StorageService';
import { BottomSheet } from '../services/OverlaySystem';

type Props = NativeStackScreenProps<RootStackParamList, 'VideoPlayer'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const { primaryColor, textColor, mutedColor, isDarkMode, cardBg, borderColor } = useTheme();

  const player = useVideoPlayer(file.uri);

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

  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const autoHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showControlsRef = useRef(true);
  const currentVideoIndexRef = useRef(0);

  const { isPlaying, position, duration } = playbackStatus;
  const progress = duration > 0 ? (position / duration) * 100 : 0;

  // Subscribe to videoPlaybackStore for engine state
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

  // Load file into engine
  useEffect(() => {
    videoEngine.loadFile(file);
    queueEngine.setVideoQueue([file], 0);
    currentVideoIndexRef.current = 0;
    return () => {
      videoEngine.cleanup();
      ScreenOrientation.unlockAsync().catch(() => {});
      if (autoHideRef.current) clearTimeout(autoHideRef.current);
    };
  }, [file.uri]);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: isAudioOnly,
      interruptionMode: 'doNotMix',
    });
  }, [isAudioOnly]);

  // Attach/detach player to engine
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

  const goBack = () => navigation.goBack();

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
    }, 4000);
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

  const handleDelete = () => {
    Alert.alert('Delete Video', `Delete "${file.name}"?`, [
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

  // Swipe gestures
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
        if (gs.dy < -60) {
          const next = videoEngine.nextInQueue();
          if (next) {
            Animated.timing(swipeTranslateY, {
              toValue: -SCREEN_HEIGHT,
              duration: 200,
              useNativeDriver: true,
            }).start(() => navigation.replace('VideoPlayer', { file: next }));
            return;
          }
        } else if (gs.dy > 60) {
          const prev = videoEngine.prevInQueue();
          if (prev) {
            Animated.timing(swipeTranslateY, {
              toValue: SCREEN_HEIGHT,
              duration: 200,
              useNativeDriver: true,
            }).start(() => navigation.replace('VideoPlayer', { file: prev }));
            return;
          }
        }
        Animated.spring(swipeTranslateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(swipeTranslateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return (
    <View className="flex-1" style={{ backgroundColor: isDarkMode ? '#0a0a0a' : '#f4f4f5' }}>
      <StatusBar hidden />
      <Animated.View
        className="flex-1"
        style={{ transform: [{ translateY: swipeTranslateY }] }}
        {...videoSwipePan.panHandlers}>
        {!isAudioOnly && (
          <VideoView
            player={player}
            style={{ flex: 1, width: '100%', height: '100%' }}
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

        {/* Always-tappable area to show controls when hidden */}
        {!showControls && <Pressable style={StyleSheet.absoluteFill} onPress={toggleControls} />}

        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: controlsOpacity,
          }}
          pointerEvents={showControls ? 'auto' : 'none'}>
          <TouchableOpacity
            className="flex-1 bg-black/50"
            activeOpacity={1}
            onPress={toggleControls}>
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
            <View className="flex-1 justify-center">
              <View className="flex-row items-center justify-center gap-9">
                <TouchableOpacity
                  className="h-11 w-11 items-center justify-center rounded-full bg-black/40"
                  onPress={(e) => {
                    e.stopPropagation();
                    videoEngine.prevInQueue();
                  }}>
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
                  onPress={(e) => {
                    e.stopPropagation();
                    videoEngine.nextInQueue();
                  }}>
                  <SkipForward size={24} color="#ffffff" weight="fill" />
                </TouchableOpacity>
              </View>
            </View>
            <View className="px-5 pb-[30px]">
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
              <View className="flex-row items-center justify-center gap-4">
                {!isAudioOnly && (
                  <TouchableOpacity
                    className="flex-row items-center gap-1.5 rounded-[10px] bg-zinc-800 px-3 py-2"
                    onPress={(e) => {
                      e.stopPropagation();
                      setIsAudioOnly(true);
                    }}>
                    <Headphones size={14} color="#e4e4e7" />
                    <Text className="text-xs font-semibold" style={{ color: textColor }}>
                      Audio
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  className="h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-zinc-800"
                  onPress={(e) => {
                    e.stopPropagation();
                    setShowSpeedModal(true);
                  }}>
                  <Text className="text-xs font-bold" style={{ color: textColor }}>
                    {playbackSpeed}x
                  </Text>
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
        </Animated.View>
      </Animated.View>

      {/* Bottom Sheets */}
      <BottomSheet visible={showMenu} onClose={() => setShowMenu(false)}>
        <ScrollView showsVerticalScrollIndicator={false} className="px-5">
          <TouchableOpacity
            className="flex-row items-center rounded-xl px-2 py-3.5 active:bg-white/5"
            onPress={() => {
              setShowMenu(false);
              setShowPlayModeModal(true);
            }}>
            <Repeat size={20} color={primaryColor} />
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
            <Text className="ml-3 text-[15px]" style={{ color: textColor }}>
              Subtitles
            </Text>
            <Text className="ml-auto text-xs" style={{ color: mutedColor }}>
              {subtitlesEnabled ? 'On' : 'Off'}
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
            <Text className="ml-3 text-[15px]" style={{ color: textColor }}>
              Enhance Video
            </Text>
          </TouchableOpacity>
          <View
            className="my-3 h-px"
            style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }}
          />
          <TouchableOpacity
            className="flex-row items-center rounded-xl px-2 py-3.5 active:bg-white/5"
            onPress={handleShare}>
            <ShareNetwork size={20} color={primaryColor} />
            <Text className="ml-3 text-[15px]" style={{ color: textColor }}>
              Share
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center rounded-xl px-2 py-3.5 active:bg-white/5"
            onPress={() => {
              setShowMenu(false);
              setShowInfo(true);
            }}>
            <Info size={20} color={primaryColor} />
            <Text className="ml-3 text-[15px]" style={{ color: textColor }}>
              Information
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center rounded-xl px-2 py-3.5 active:bg-white/5"
            onPress={handleDelete}>
            <Trash size={20} color="#ef4444" />
            <Text className="ml-3 text-[15px] text-[#ef4444]">Delete</Text>
          </TouchableOpacity>
        </ScrollView>
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
                playbackSpeed === speed && { backgroundColor: primaryColor },
                {
                  borderColor:
                    playbackSpeed === speed ? primaryColor : isDarkMode ? '#3f3f46' : '#d4d4d8',
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
              { mode: 'pauseAfter' as PlayMode, label: 'Pause After Play', Icon: Pause },
            ] as const
          ).map(({ mode, label, Icon }) => (
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
                className={`text-base ${playMode === mode ? 'font-bold' : 'font-medium'}`}
                style={{ color: textColor }}>
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
              {fileEngine.formatDuration(duration)}
            </Text>
          </View>
        </View>
      </BottomSheet>

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
