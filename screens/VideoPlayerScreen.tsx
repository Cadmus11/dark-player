import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Modal,
  ScrollView,
  Platform,
  Animated,
} from 'react-native';
import { Video, ResizeMode, Audio, AVPlaybackStatus } from 'expo-av';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import {
  CaretLeft, Rewind, FastForward, Play, Pause, MusicNote,
  VideoCamera, FrameCorners, Square, ArrowsOut, Sparkle,
  Subtitles, Gear, SkipBack, SkipForward, MagicWand,
} from 'phosphor-react-native';
import { formatDuration, findSubtitleFile, parseSRT, readTextFile } from '../services/FileService';
import { useTheme } from '../context/ThemeContext';
import { useFiles } from '../context/FileContext';
import { playbackManager } from '../services/Playback/PlaybackManager';
import { usePlaybackStore } from '../stores/playbackStore';
import { HistoryService } from '../services/History/HistoryService';
import { VideoEnhancementService } from '../services/VideoEnhancementService';
import { VideoEnhancementModal } from '../components/player/VideoEnhancementModal';
import type { SubtitleEntry, VideoEnhancementSettings } from '../types';

type VideoPlayerScreenProps = NativeStackScreenProps<RootStackParamList, 'VideoPlayer'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ResizeModeType = 'contain' | 'cover' | 'stretch';

const RESIZE_MODES: { mode: ResizeModeType; Icon: React.ElementType; label: string }[] = [
  { mode: 'contain', Icon: FrameCorners, label: 'Fit' },
  { mode: 'cover', Icon: Square, label: 'Fill' },
  { mode: 'stretch', Icon: ArrowsOut, label: 'Stretch' },
];

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function VideoPlayerScreen({ navigation, route }: VideoPlayerScreenProps) {
  const { file, isAudioOnly: initialAudioOnly } = route.params;
  const { primaryColor } = useTheme();
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [resizeMode, setResizeMode] = useState<ResizeModeType>('contain');
  const [showResizeModal, setShowResizeModal] = useState(false);
  const [subtitleEntries, setSubtitleEntries] = useState<SubtitleEntry[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedModal, setShowSpeedModal] = useState(false);
  const [showAiSubModal, setShowAiSubModal] = useState(false);
  const [isAudioOnly, setIsAudioOnly] = useState(initialAudioOnly || false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEnhancementModal, setShowEnhancementModal] = useState(false);
  const [enhancedUri, setEnhancedUri] = useState<string | null>(null);
  const controlsAnim = useRef(new Animated.Value(1)).current;

  const { videos, files } = useFiles();
  const currentVideoIndex = videos.findIndex((v) => v.uri === file.uri);

  const goToVideo = (index: number) => {
    if (index < 0 || index >= videos.length) return;
    try {
      videoRef.current?.stopAsync();
    } catch (e) {
      console.warn('Stop video failed:', e);
    }
    navigation.replace('VideoPlayer', { file: videos[index] });
  };

  const isPlaying = status && 'isPlaying' in status ? status.isPlaying : false;
  const position = status && 'positionMillis' in status ? status.positionMillis : 0;
  const duration = status && 'durationMillis' in status ? status.durationMillis : 0;

  useEffect(() => {
    playbackManager.onVideoOpen();
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: isAudioOnly,
      shouldDuckAndroid: true,
    });
    loadSubtitles();
    return () => {
      playbackManager.onVideoClose();
    };
  }, [isAudioOnly]);

  useEffect(() => {
    if (subtitlesEnabled && subtitleEntries.length > 0) {
      const pos = position as number;
      const active = subtitleEntries.find((s) => pos >= s.start && pos <= s.end);
      setCurrentSubtitle(active?.text || '');
    } else {
      setCurrentSubtitle('');
    }
  }, [position, subtitlesEnabled, subtitleEntries]);

  async function loadSubtitles() {
    try {
      const subtitleUri = findSubtitleFile(file.uri, files);
      if (subtitleUri) {
        const content = await readTextFile(subtitleUri);
        if (content) setSubtitleEntries(parseSRT(content));
      }
    } catch {}
  }

  const { setCurrentFile, setIsPlaying, setSource, setPosition, setDuration, videoEnhancement, setVideoEnhancement, setEnhancedFileUri } = usePlaybackStore();

  useEffect(() => {
    setCurrentFile(file);
    setSource('video');
    setPosition(position as number);
    setDuration(duration as number);
    setIsPlaying(isPlaying);
  }, [file.uri, isPlaying, position, duration]);

  async function handleEnhancementApply(settings: VideoEnhancementSettings) {
    setVideoEnhancement(settings);
    if (!settings.enabled) {
      setEnhancedUri(null);
      setEnhancedFileUri(null);
      return;
    }
    const existing = await VideoEnhancementService.getEnhancedFileUri(file.uri, settings);
    if (existing) {
      setEnhancedUri(existing);
      setEnhancedFileUri(existing);
      return;
    }
    const job = await VideoEnhancementService.enhanceVideo(file.uri, settings);
    if (job.status === 'completed') {
      setEnhancedUri(job.outputUri);
      setEnhancedFileUri(job.outputUri);
    }
  }

  const videoSourceUri = enhancedUri || file.uri;

  async function togglePlayback() {
    if (!videoRef.current) return;
    try {
      if (isPlaying) { await videoRef.current.pauseAsync(); }
      else { await videoRef.current.playAsync(); }
    } catch (e) {
      console.warn('Toggle video playback failed:', e);
    }
  }

  async function seekTo(percentage: number) {
    if (!videoRef.current || !duration) return;
    await videoRef.current.setPositionAsync(Math.round(percentage * duration));
  }

  async function skip(seconds: number) {
    if (!videoRef.current || !duration) return;
    const newPos = (position as number) + seconds * 1000;
    await videoRef.current.setPositionAsync(Math.max(0, Math.min(newPos, duration as number)));
  }

  async function changeSpeed(speed: number) {
    if (!videoRef.current) return;
    await videoRef.current.setRateAsync(speed, true);
    setPlaybackSpeed(speed);
    setShowSpeedModal(false);
  }

  function goBack() {
    videoRef.current?.stopAsync();
    HistoryService.record(file, position as number, 'video');
    navigation.goBack();
  }

  function getResizeModeEnum(): ResizeMode {
    switch (resizeMode) {
      case 'contain': return ResizeMode.CONTAIN;
      case 'cover': return ResizeMode.COVER;
      case 'stretch': return ResizeMode.STRETCH;
    }
  }

  function toggleControls() {
    const toValue = showControls ? 0 : 1;
    Animated.timing(controlsAnim, {
      toValue,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowControls(!showControls));
  }

  const progress = (duration || 0) > 0 ? ((position as number) / (duration || 1)) * 100 : 0;

  return (
    <View style={[styles.container, { backgroundColor: '#0a0a0a' }]}>
      <StatusBar hidden />
      <TouchableOpacity
        style={styles.videoContainer}
        activeOpacity={1}
        onPress={toggleControls}
      >
        {!isAudioOnly && (
          <Video
            ref={videoRef}
            source={{ uri: videoSourceUri }}
            style={styles.video}
            resizeMode={getResizeModeEnum()}
            shouldPlay
            onPlaybackStatusUpdate={setStatus}
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

        {/* Subtitle Overlay - AI Style */}
        {currentSubtitle && subtitlesEnabled && !isAudioOnly && (
          <View style={styles.subtitleOverlay}>
            <View style={styles.subtitleBubble}>
              <Text style={[styles.subtitleText, { color: '#ffffff' }]}>{currentSubtitle}</Text>
            </View>
          </View>
        )}

        {/* Controls Overlay */}
        {showControls && (
          <Animated.View style={[styles.controlsOverlay, { opacity: controlsAnim }]}>
            {/* Header */}
            <View style={styles.headerControls}>
              <TouchableOpacity style={styles.backBtn} onPress={goBack}>
                <CaretLeft size={26} color="#ffffff" weight="bold" />
              </TouchableOpacity>
              <Text style={styles.title} numberOfLines={1}>{file.name}</Text>
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowAiSubModal(true)}>
                <Sparkle size={20} color={primaryColor} weight="bold" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerIconBtn, videoEnhancement.enabled && { backgroundColor: `${primaryColor}25` }]}
                onPress={() => setShowEnhancementModal(true)}
              >
                <MagicWand size={18} color={videoEnhancement.enabled ? primaryColor : '#ffffff'} weight={videoEnhancement.enabled ? 'fill' : 'regular'} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowSettingsModal(true)}>
                <Gear size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Enhancement Status */}
            {videoEnhancement.enabled && (
              <View style={[styles.enhancementBadge, { backgroundColor: `${primaryColor}20` }]}>
                <MagicWand size={12} color={primaryColor} weight="fill" />
                <Text style={[styles.enhancementBadgeText, { color: primaryColor }]}>
                  {videoEnhancement.qualityTarget !== 'original' ? `${videoEnhancement.qualityTarget.toUpperCase()} ` : ''}Enhanced
                </Text>
              </View>
            )}

            {/* Center Controls */}
            <View style={styles.centerControls}>
              <TouchableOpacity
                style={[styles.prevNextBtn, currentVideoIndex <= 0 && { opacity: 0.3 }]}
                onPress={() => goToVideo(currentVideoIndex - 1)}
                disabled={currentVideoIndex <= 0}
              >
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
              <TouchableOpacity
                style={[styles.prevNextBtn, currentVideoIndex >= videos.length - 1 && { opacity: 0.3 }]}
                onPress={() => goToVideo(currentVideoIndex + 1)}
                disabled={currentVideoIndex >= videos.length - 1}
              >
                <SkipForward size={24} color="#ffffff" weight="fill" />
              </TouchableOpacity>
            </View>

            {/* Bottom Controls */}
            <View style={styles.bottomControls}>
              <View style={styles.progressRow}>
                <Text style={styles.timeText}>{formatDuration(position as number)}</Text>
                <TouchableOpacity
                  style={styles.progressTrack}
                  onPress={(e) => {
                    const { locationX } = e.nativeEvent;
                    seekTo(locationX / (SCREEN_WIDTH - 80));
                  }}
                >
                  <View style={[styles.progressFill, { width: `${progress}%` as any, backgroundColor: primaryColor }]} />
                  <View style={[styles.progressThumb, { left: `${progress}%` as any, backgroundColor: primaryColor }]} />
                </TouchableOpacity>
                <Text style={styles.timeText}>{formatDuration(duration as number)}</Text>
              </View>

              <View style={styles.bottomActions}>
                {!isAudioOnly && (
                  <TouchableOpacity style={styles.switchAudioBtn} onPress={() => setIsAudioOnly(true)}>
                    <MusicNote size={14} color="#e4e4e7" />
                    <Text style={[styles.switchAudioText, { color: '#e4e4e7' }]}>Audio</Text>
                  </TouchableOpacity>
                )}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionBtn, subtitlesEnabled && { backgroundColor: primaryColor }]}
                    onPress={() => setSubtitlesEnabled(!subtitlesEnabled)}
                  >
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
                </View>
              </View>
            </View>
          </Animated.View>
        )}
      </TouchableOpacity>

      {/* Resize Modal */}
      <Modal visible={showResizeModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowResizeModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: '#18181b' }]}>
            <Text style={[styles.modalTitle, { color: '#ffffff' }]}>Video Size</Text>
            {RESIZE_MODES.map((mode) => (
              <TouchableOpacity
                key={mode.mode}
                style={[styles.modalOption, resizeMode === mode.mode && { backgroundColor: `${primaryColor}15` }]}
                onPress={() => { setResizeMode(mode.mode); setShowResizeModal(false); }}
              >
                <mode.Icon size={20} color={resizeMode === mode.mode ? primaryColor : '#e4e4e7'} />
                <Text style={[styles.modalOptionText, resizeMode === mode.mode && { color: primaryColor, fontWeight: '700' }, { color: '#e4e4e7' }]}>{mode.label}</Text>
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
                <TouchableOpacity
                  key={speed}
                  style={[styles.speedOption, playbackSpeed === speed && { backgroundColor: primaryColor }]}
                  onPress={() => changeSpeed(speed)}
                >
                  <Text style={[styles.speedOptionText, playbackSpeed === speed && { color: '#0a0a0a', fontWeight: '700' }, { color: '#e4e4e7' }]}>{speed}x</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* AI Subtitles Modal */}
      <Modal visible={showAiSubModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowAiSubModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: '#18181b' }]}>
            <View style={[styles.aiHeader, { backgroundColor: `${primaryColor}15` }]}>
              <Sparkle size={20} color={primaryColor} weight="bold" />
              <Text style={[styles.aiTitle, { color: primaryColor }]}>AI Subtitles</Text>
            </View>
            <Text style={[styles.aiDesc, { color: '#a1a1aa' }]}>
              AI-generated subtitles will be available soon. This feature will automatically detect and transcribe speech in your videos.
            </Text>
            <View style={styles.aiFeatures}>
              <View style={styles.aiFeature}>
                <Sparkle size={14} color={primaryColor} />
                <Text style={[styles.aiFeatureText, { color: '#e4e4e7' }]}>Auto-detect language</Text>
              </View>
              <View style={styles.aiFeature}>
                <Sparkle size={14} color={primaryColor} />
                <Text style={[styles.aiFeatureText, { color: '#e4e4e7' }]}>Real-time transcription</Text>
              </View>
              <View style={styles.aiFeature}>
                <Sparkle size={14} color={primaryColor} />
                <Text style={[styles.aiFeatureText, { color: '#e4e4e7' }]}>Multi-language support</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettingsModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowSettingsModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: '#18181b' }]}>
            <Text style={[styles.modalTitle, { color: '#ffffff' }]}>Player Settings</Text>
            <TouchableOpacity style={styles.settingRow} onPress={() => { setSubtitlesEnabled(!subtitlesEnabled); setShowSettingsModal(false); }}>
              <Subtitles size={20} color="#e4e4e7" />
              <Text style={[styles.settingText, { color: '#e4e4e7' }]}>Subtitles {subtitlesEnabled ? 'On' : 'Off'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingRow} onPress={() => setShowSpeedModal(true)}>
              <Text style={[styles.settingText, { color: '#e4e4e7' }]}>Speed: {playbackSpeed}x</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingRow} onPress={() => setShowResizeModal(true)}>
              <FrameCorners size={20} color="#e4e4e7" />
              <Text style={[styles.settingText, { color: '#e4e4e7' }]}>Resize: {RESIZE_MODES.find(m => m.mode === resizeMode)?.label}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Video Enhancement Modal */}
      <VideoEnhancementModal
        visible={showEnhancementModal}
        onClose={() => setShowEnhancementModal(false)}
        currentSettings={videoEnhancement}
        onApply={handleEnhancementApply}
        fileUri={file.uri}
        primaryColor={primaryColor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  videoContainer: { flex: 1 },
  video: { width: '100%', height: '100%' },
  subtitleOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingBottom: 100,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  subtitleBubble: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: 'rgba(194, 252, 74, 0.2)',
  },
  subtitleText: { fontSize: 16, textAlign: 'center', fontWeight: '500' },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'space-between',
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 16,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, fontSize: 15, color: '#ffffff', textAlign: 'center', marginHorizontal: 8, fontWeight: '600' },
  headerIconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  centerControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 36 },
  skipBtn: { alignItems: 'center', gap: 2 },
  skipLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  prevNextBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomControls: { paddingHorizontal: 20, paddingBottom: 30 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', width: 40 },
  progressTrack: { flex: 1, height: 20, justifyContent: 'center' },
  progressFill: { height: 4, borderRadius: 2 },
  progressThumb: { width: 12, height: 12, borderRadius: 6, position: 'absolute', top: -4 },
  bottomActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  switchAudioBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#27272a', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  switchAudioText: { fontSize: 12, fontWeight: '600' },
  actionButtons: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedLabel: { fontSize: 12, fontWeight: '700' },
  enhancementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'center',
    marginBottom: 8,
  },
  enhancementBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  audioOnlyBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  audioOnlyArt: {
    width: 160,
    height: 160,
    borderRadius: 32,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
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
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, marginBottom: 16, alignSelf: 'flex-start' },
  aiTitle: { fontSize: 16, fontWeight: '800' },
  aiDesc: { fontSize: 14, lineHeight: 22, marginBottom: 20 },
  aiFeatures: { gap: 12 },
  aiFeature: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiFeatureText: { fontSize: 14 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  settingText: { fontSize: 15, fontWeight: '500' },
});
