import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, StatusBar, Modal, Platform, Animated, Alert, Share, ScrollView } from 'react-native';
import { Video, ResizeMode, Audio } from 'expo-av';
const FileSystem: any = require('expo-file-system');
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { CaretLeft, Rewind, FastForward, Play, Pause, MusicNote, VideoCamera, FrameCorners, Square, ArrowsOut, Subtitles, SkipBack, SkipForward, Info, Trash, PictureInPicture, Repeat, Shuffle, Globe, Check } from 'phosphor-react-native';
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

const RESIZE_MODES = [
  { mode: ResizeMode.CONTAIN, Icon: FrameCorners, label: 'Fit' },
  { mode: ResizeMode.COVER, Icon: Square, label: 'Fill' },
  { mode: ResizeMode.STRETCH, Icon: ArrowsOut, label: 'Stretch' },
] as const;

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

type PlayMode = 'loop' | 'loopAll' | 'shuffle' | 'pauseAfter';

export function VideoPlayerScreen({ navigation, route }: Props) {
  const { file, isAudioOnly: initialAudioOnly } = route.params;
  const { primaryColor } = useTheme();
  const { videos, files } = useFiles();
  const videoRef = useRef<Video>(null);

  const sortedVideos = useMemo(() => Sorting.sort(videos, 'date', 'desc'), [videos]);

  const [showControls, setShowControls] = useState(true);
  const [resizeMode, setResizeMode] = useState<ResizeMode>(ResizeMode.CONTAIN);
  const [showResizeModal, setShowResizeModal] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedModal, setShowSpeedModal] = useState(false);
  const [isAudioOnly, setIsAudioOnly] = useState(initialAudioOnly || false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showEnhancement, setShowEnhancement] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showPlayModeModal, setShowPlayModeModal] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const [subtitleEntries, setSubtitleEntries] = useState<SubtitleEntry[]>([]);
  const [enhancedUri, setEnhancedUri] = useState<string | null>(null);
  const [playMode, setPlayMode] = useState<PlayMode>('loopAll');
  const [audioTrack, setAudioTrack] = useState('default');
  const [showAudioTrackModal, setShowAudioTrackModal] = useState(false);
  const controlsAnim = useRef(new Animated.Value(1)).current;

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

  const isPlaying = status?.isLoaded ? status.isPlaying : false;
  const position = status?.isLoaded ? (status.positionMillis || 0) : 0;
  const duration = status?.isLoaded ? (status.durationMillis || 0) : 0;
  const progress = duration > 0 ? (position / duration) * 100 : 0;

  // Play mode logic
  const playModeRef = useRef(playMode);
  playModeRef.current = playMode;
  const videosRef = useRef(sortedVideos);
  videosRef.current = sortedVideos;

  useEffect(() => {
    if (!status?.isLoaded || !status.didJustFinish) return;
    const pm = playModeRef.current;
    const vids = videosRef.current;
    const idx = currentVideoIndexRef.current;
    if (pm === 'loop') {
      videoRef.current?.setPositionAsync(0);
      videoRef.current?.playAsync();
    } else if (pm === 'loopAll') {
      const next = (idx + 1) % vids.length;
      navigation.replace('VideoPlayer', { file: vids[next] });
    } else if (pm === 'shuffle') {
      const random = Math.floor(Math.random() * vids.length);
      navigation.replace('VideoPlayer', { file: vids[random] });
    } else if (pm === 'pauseAfter') {
    }
  }, [status?.didJustFinish]);

  // Record play session (only when component mounts/unmounts)
  const sessionStartedRef = useRef(false);
  useEffect(() => {
    if (status?.isLoaded && isPlaying && !sessionStartedRef.current) {
      HistoryService.startPlaySession(file.uri);
      sessionStartedRef.current = true;
    }
    if (!isPlaying && sessionStartedRef.current) {
      HistoryService.pausePlaySession(file.uri);
    }
  }, [isPlaying, status?.isLoaded]);

  useEffect(() => {
    return () => {
      if (sessionStartedRef.current) {
        HistoryService.endPlaySession(file, 'video');
      }
    };
  }, []);

  const goToVideo = useCallback((index: number) => {
    if (index < 0 || index >= sortedVideos.length) return;
    try { videoRef.current?.stopAsync(); } catch {}
    navigation.replace('VideoPlayer', { file: sortedVideos[index] });
  }, [sortedVideos, navigation]);

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: isAudioOnly,
      shouldDuckAndroid: true,
    });
    loadSubtitles();
    return () => {
      try { videoRef.current?.stopAsync(); } catch {}
    };
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

  const togglePlayback = async () => {
    if (!videoRef.current) return;
    try {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
        HistoryService.pausePlaySession(file.uri);
      } else {
        await videoRef.current.playAsync();
        HistoryService.resumePlaySession(file.uri);
      }
    } catch {}
  };

  const seekTo = async (percent: number) => {
    if (!videoRef.current || !duration) return;
    await videoRef.current.setPositionAsync(Math.round(percent * duration));
  };

  const skip = async (seconds: number) => {
    if (!videoRef.current || !duration) return;
    await videoRef.current.setPositionAsync(Math.max(0, Math.min(position + seconds * 1000, duration)));
  };

  const changeSpeed = async (speed: number) => {
    if (!videoRef.current) return;
    await videoRef.current.setRateAsync(speed, true);
    setPlaybackSpeed(speed);
    setShowSpeedModal(false);
  };

  const goBack = () => {
    try { videoRef.current?.stopAsync(); } catch {}
    navigation.goBack();
  };

  const toggleControls = () => {
    const toValue = showControls ? 0 : 1;
    Animated.timing(controlsAnim, { toValue, duration: 200, useNativeDriver: true }).start(() => setShowControls(!showControls));
  };

  const handleDelete = () => {
    Alert.alert('Delete Video', `Are you sure you want to delete "${file.name}"? A backup will be kept for restore.`, [
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
  };

  const handlePiP = async () => {
    try {
      if (videoRef.current) {
        if (Platform.OS === 'ios') {
          await videoRef.current.presentFullscreenPlayer();
        } else {
          await videoRef.current.presentFullscreenPlayer();
        }
      }
    } catch {}
  };

  const getPlayModeIcon = () => {
    switch (playMode) {
      case 'loop': return <Repeat size={16} color={primaryColor} />;
      case 'loopAll': return <Repeat size={16} color={primaryColor} weight="bold" />;
      case 'shuffle': return <Shuffle size={16} color={primaryColor} />;
      case 'pauseAfter': return <Pause size={16} color={primaryColor} />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#0a0a0a' }]}>
      <StatusBar hidden />
      <TouchableOpacity style={styles.videoContainer} activeOpacity={1} onPress={toggleControls}>
        {!isAudioOnly && (
          <Video
            ref={videoRef}
            source={{ uri: enhancedUri || file.uri }}
            style={styles.video}
            resizeMode={resizeMode}
            shouldPlay
            onPlaybackStatusUpdate={setStatus}
            {...(Platform.OS === 'ios' ? { preservesExternalPlaybackUserSettings: true } : {})}
          />
        )}

        {isAudioOnly && (
          <View style={styles.audioOnlyBg}>
            <View style={[styles.audioOnlyArt, { borderColor: primaryColor + '60' }]}>
              <MusicNote size={64} color={primaryColor} />
            </View>
            <Text style={[styles.audioOnlyLabel, { color: primaryColor }]}>Audio Mode</Text>
            <TouchableOpacity style={[styles.switchBackBtn, { backgroundColor: `${primaryColor}20` }]} onPress={() => setIsAudioOnly(false)}>
              <VideoCamera size={16} color={primaryColor} />
              <Text style={[styles.switchBackText, { color: primaryColor }]}>Switch to Video</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentSubtitle && subtitlesEnabled && !isAudioOnly && (
          <View style={styles.subtitleOverlay}>
            <View style={styles.subtitleBubble}>
              <Text style={[styles.subtitleText, { color: '#ffffff' }]}>{currentSubtitle}</Text>
            </View>
          </View>
        )}

        {showControls && (
          <Animated.View style={[styles.controlsOverlay, { opacity: controlsAnim }]}>
            <View style={styles.headerControls}>
              <TouchableOpacity style={styles.backBtn} onPress={goBack}>
                <CaretLeft size={26} color="#ffffff" weight="bold" />
              </TouchableOpacity>
              <Text style={styles.title} numberOfLines={1}>{file.name}</Text>
              <View style={styles.headerRight}>
                <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowInfo(true)}>
                  <Info size={20} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowEnhancement(true)}>
                  <Text style={{ color: primaryColor, fontSize: 18 }}>✨</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.centerControls}>
              <TouchableOpacity style={[styles.prevNextBtn, currentVideoIndexRef.current <= 0 && { opacity: 0.3 }]} onPress={() => goToVideo(currentVideoIndexRef.current - 1)} disabled={currentVideoIndexRef.current <= 0}>
                <SkipBack size={24} color="#ffffff" weight="fill" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipBtn} onPress={() => skip(-10)}>
                <Rewind size={24} color="#ffffff" weight="fill" />
                <Text style={styles.skipLabel}>10</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.playBtn, { borderColor: primaryColor }]} onPress={togglePlayback}>
                {isPlaying ? <Pause size={32} color={primaryColor} weight="fill" /> : <Play size={32} color={primaryColor} weight="fill" />}
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipBtn} onPress={() => skip(10)}>
                <FastForward size={24} color="#ffffff" weight="fill" />
                <Text style={styles.skipLabel}>10</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.prevNextBtn, currentVideoIndexRef.current >= sortedVideos.length - 1 && { opacity: 0.3 }]} onPress={() => goToVideo(currentVideoIndexRef.current + 1)} disabled={currentVideoIndexRef.current >= sortedVideos.length - 1}>
                <SkipForward size={24} color="#ffffff" weight="fill" />
              </TouchableOpacity>
            </View>

            <View style={styles.bottomControls}>
              <View style={styles.progressRow}>
                <Text style={styles.timeText}>{fileEngine.formatDuration(position)}</Text>
                <TouchableOpacity style={styles.progressTrack} onPress={(e) => { const { locationX } = e.nativeEvent; seekTo(locationX / (SCREEN_WIDTH - 80)); }}>
                  <View style={[styles.progressFill, { width: `${progress}%` as any, backgroundColor: primaryColor }]} />
                  <View style={[styles.progressThumb, { left: `${progress}%` as any, backgroundColor: primaryColor }]} />
                </TouchableOpacity>
                <Text style={styles.timeText}>{fileEngine.formatDuration(duration)}</Text>
              </View>
              <View style={styles.bottomActions}>
                <View style={styles.leftActions}>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => setShowPlayModeModal(true)}>
                    {getPlayModeIcon()}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => setShowAudioTrackModal(true)}>
                    <Globe size={14} color={audioTrack !== 'default' ? primaryColor : '#e4e4e7'} />
                  </TouchableOpacity>
                  {!isAudioOnly && (
                    <TouchableOpacity style={styles.switchAudioBtn} onPress={() => setIsAudioOnly(true)}>
                      <MusicNote size={14} color="#e4e4e7" />
                      <Text style={[styles.switchAudioText, { color: '#e4e4e7' }]}>Audio</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={[styles.actionBtn, subtitlesEnabled && { backgroundColor: primaryColor }]} onPress={() => setSubtitlesEnabled(!subtitlesEnabled)}>
                    <Subtitles size={16} color={subtitlesEnabled ? '#0a0a0a' : '#e4e4e7'} weight={subtitlesEnabled ? 'fill' : 'regular'} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => setShowSpeedModal(true)}>
                    <Text style={[styles.speedLabel, { color: '#e4e4e7' }]}>{playbackSpeed}x</Text>
                  </TouchableOpacity>
                  {!isAudioOnly && (
                    <TouchableOpacity style={styles.actionBtn} onPress={() => setShowResizeModal(true)}>
                      <FrameCorners size={16} color="#e4e4e7" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.actionBtn} onPress={handlePiP}>
                    <PictureInPicture size={16} color="#e4e4e7" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
                    <Text style={{ color: '#e4e4e7', fontSize: 14 }}>↗</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'rgba(239,68,68,0.2)' }]} onPress={handleDelete}>
                    <Trash size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Animated.View>
        )}
      </TouchableOpacity>

      {/* Info Modal */}
      <Modal visible={showInfo} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowInfo(false)}>
          <View style={[styles.modalContent, { backgroundColor: '#18181b' }]}>
            <Text style={[styles.modalTitle, { color: '#ffffff' }]}>Video Info</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue} numberOfLines={2}>{file.name}</Text>
            </View>
            {file.size && <View style={styles.infoRow}><Text style={styles.infoLabel}>Size</Text><Text style={styles.infoValue}>{(file.size / 1024 / 1024).toFixed(1)} MB</Text></View>}
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Duration</Text><Text style={styles.infoValue}>{fileEngine.formatDuration(duration)}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Resolution</Text><Text style={styles.infoValue}>{status?.isLoaded ? `${status?.width || '?'}x${status?.height || '?'}` : 'N/A'}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Play Mode</Text><Text style={styles.infoValue}>{playMode}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Speed</Text><Text style={styles.infoValue}>{playbackSpeed}x</Text></View>
            <TouchableOpacity style={styles.infoCloseBtn} onPress={() => setShowInfo(false)}>
              <Text style={[styles.infoCloseText, { color: primaryColor }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Play Mode Modal */}
      <Modal visible={showPlayModeModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowPlayModeModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: '#18181b' }]}>
            <Text style={[styles.modalTitle, { color: '#ffffff' }]}>Play Mode</Text>
            {([
              { mode: 'loop' as PlayMode, label: 'Loop One', Icon: Repeat },
              { mode: 'loopAll' as PlayMode, label: 'Loop All', Icon: Repeat },
              { mode: 'shuffle' as PlayMode, label: 'Shuffle', Icon: Shuffle },
              { mode: 'pauseAfter' as PlayMode, label: 'Pause After Play', Icon: Pause },
            ]).map(({ mode, label, Icon }) => (
              <TouchableOpacity
                key={mode}
                style={[styles.modalOption, playMode === mode && { backgroundColor: `${primaryColor}15` }]}
                onPress={() => { setPlayMode(mode); setShowPlayModeModal(false); }}
              >
                <Icon size={20} color={playMode === mode ? primaryColor : '#e4e4e7'} weight={playMode === mode ? 'fill' : 'regular'} />
                <Text style={[styles.modalOptionText, playMode === mode && { color: primaryColor, fontWeight: '700' }, { color: '#e4e4e7' }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Resize Modal */}
      <Modal visible={showResizeModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowResizeModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: '#18181b' }]}>
            <Text style={[styles.modalTitle, { color: '#ffffff' }]}>Video Size</Text>
            {RESIZE_MODES.map(({ mode, label }) => (
              <TouchableOpacity key={label} style={[styles.modalOption, resizeMode === mode && { backgroundColor: `${primaryColor}15` }]} onPress={() => { setResizeMode(mode); setShowResizeModal(false); }}>
                <Text style={[styles.modalOptionText, resizeMode === mode && { color: primaryColor, fontWeight: '700' }, { color: '#e4e4e7' }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Speed Modal */}
      <Modal visible={showSpeedModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowSpeedModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: '#18181b' }]}>
            <Text style={[styles.modalTitle, { color: '#ffffff' }]}>Playback Speed</Text>
            <View style={styles.speedGrid}>
              {SPEEDS.map((speed) => (
                <TouchableOpacity key={speed} style={[styles.speedOption, playbackSpeed === speed && { backgroundColor: primaryColor }]} onPress={() => changeSpeed(speed)}>
                  <Text style={[styles.speedOptionText, playbackSpeed === speed && { color: '#0a0a0a', fontWeight: '700' }, { color: '#e4e4e7' }]}>{speed}x</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showSettings} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowSettings(false)}>
          <View style={[styles.modalContent, { backgroundColor: '#18181b' }]}>
            <Text style={[styles.modalTitle, { color: '#ffffff' }]}>Player Settings</Text>
            <TouchableOpacity style={styles.settingRow} onPress={() => { setSubtitlesEnabled(!subtitlesEnabled); setShowSettings(false); }}>
              <Subtitles size={20} color="#e4e4e7" />
              <Text style={[styles.settingText, { color: '#e4e4e7' }]}>Subtitles {subtitlesEnabled ? 'On' : 'Off'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Audio Track Language Modal */}
      <Modal visible={showAudioTrackModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowAudioTrackModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: '#18181b' }]}>
            <Text style={[styles.modalTitle, { color: '#ffffff' }]}>Audio Track</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {AUDIO_TRACKS.map((track) => (
                <TouchableOpacity
                  key={track.id}
                  style={[styles.modalOption, audioTrack === track.id && { backgroundColor: `${primaryColor}15` }]}
                  onPress={() => { setAudioTrack(track.id); setShowAudioTrackModal(false); }}
                >
                  <Globe size={18} color={audioTrack === track.id ? primaryColor : '#e4e4e7'} />
                  <Text style={[styles.modalOptionText, audioTrack === track.id && { color: primaryColor, fontWeight: '700' }, { color: '#e4e4e7' }]}>
                    {track.label}
                  </Text>
                  {audioTrack === track.id && (
                    <Check size={18} color={primaryColor} weight="bold" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <VideoEnhancementModal visible={showEnhancement} onClose={() => setShowEnhancement(false)} currentSettings={{ enabled: false, qualityTarget: 'original', colorEnhancement: false, sharpening: false, denoise: false, hdr: false }} onApply={() => {}} fileUri={file.uri} primaryColor={primaryColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  videoContainer: { flex: 1 },
  video: { width: '100%', height: '100%' },
  subtitleOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', paddingBottom: 100, alignItems: 'center', pointerEvents: 'none' },
  subtitleBubble: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, maxWidth: '85%', borderWidth: 1, borderColor: 'rgba(194, 252, 74, 0.2)' },
  subtitleText: { fontSize: 16, textAlign: 'center', fontWeight: '500' },
  controlsOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'space-between' },
  headerControls: { flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingHorizontal: 16 },
  headerRight: { flexDirection: 'row', gap: 4 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, fontSize: 15, color: '#ffffff', textAlign: 'center', marginHorizontal: 8, fontWeight: '600' },
  headerIconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  centerControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 36 },
  skipBtn: { alignItems: 'center', gap: 2 },
  skipLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  playBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  prevNextBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  bottomControls: { paddingHorizontal: 20, paddingBottom: 30 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', width: 40 },
  progressTrack: { flex: 1, height: 20, justifyContent: 'center' },
  progressFill: { height: 4, borderRadius: 2 },
  progressThumb: { width: 12, height: 12, borderRadius: 6, position: 'absolute', top: -4 },
  bottomActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  leftActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchAudioBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#27272a', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  switchAudioText: { fontSize: 12, fontWeight: '600' },
  actionButtons: { flexDirection: 'row', gap: 6 },
  actionBtn: { width: 34, height: 34, borderRadius: 9, backgroundColor: '#27272a', justifyContent: 'center', alignItems: 'center' },
  iconBtn: { width: 34, height: 34, borderRadius: 9, backgroundColor: '#27272a', justifyContent: 'center', alignItems: 'center' },
  speedLabel: { fontSize: 12, fontWeight: '700' },
  audioOnlyBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center', gap: 16 },
  audioOnlyArt: { width: 160, height: 160, borderRadius: 32, borderWidth: 2, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  audioOnlyLabel: { fontSize: 16, letterSpacing: 2, fontWeight: '600' },
  switchBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  switchBackText: { fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#27272a', borderRadius: 24, padding: 24, width: '80%', maxWidth: 320 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8, gap: 12 },
  modalOptionText: { fontSize: 16, fontWeight: '500' },
  speedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  speedOption: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#3f3f46' },
  speedOptionText: { fontSize: 14, textAlign: 'center' },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  settingText: { fontSize: 15, fontWeight: '500' },

  // Info modal
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  infoLabel: { fontSize: 14, color: 'rgba(255,255,255,0.6)', flex: 1 },
  infoValue: { fontSize: 14, color: '#ffffff', flex: 2, textAlign: 'right' },
  infoCloseBtn: { alignItems: 'center', paddingTop: 16 },
  infoCloseText: { fontSize: 16, fontWeight: '700' },
});
