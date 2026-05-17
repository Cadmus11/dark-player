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
} from 'react-native';
import { Video, ResizeMode, Audio, AVPlaybackStatus } from 'expo-av';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { formatDuration, findSubtitleFile, parseSRT, readTextFile } from '../services/FileService';
import type { SubtitleEntry } from '../types';

type VideoPlayerScreenProps = NativeStackScreenProps<RootStackParamList, 'VideoPlayer'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ResizeModeType = 'contain' | 'cover' | 'stretch';

const RESIZE_MODES: { mode: ResizeModeType; icon: string; label: string }[] = [
  { mode: 'contain', icon: '⬜', label: 'Fit' },
  { mode: 'cover', icon: '🔲', label: 'Fill' },
  { mode: 'stretch', icon: '↔️', label: 'Stretch' },
];

export function VideoPlayerScreen({ navigation, route }: VideoPlayerScreenProps) {
  const { file, isAudioOnly: initialAudioOnly } = route.params;
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
  const [isAudioOnly, setIsAudioOnly] = useState(initialAudioOnly || false);

  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

  const isPlaying = status && 'isPlaying' in status ? status.isPlaying : false;
  const position = status && 'positionMillis' in status ? status.positionMillis : 0;
  const duration = status && 'durationMillis' in status ? status.durationMillis : 0;

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: isAudioOnly,
      shouldDuckAndroid: true,
    });
    loadSubtitles();
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
      const subtitleUri = findSubtitleFile(file.uri, []);
      if (subtitleUri) {
        const content = await readTextFile(subtitleUri);
        if (content) setSubtitleEntries(parseSRT(content));
      }
    } catch {}
  }

  async function togglePlayback() {
    if (!videoRef.current) return;
    if (isPlaying) { await videoRef.current.pauseAsync(); }
    else { await videoRef.current.playAsync(); }
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
    navigation.goBack();
  }

  function getResizeModeEnum(): ResizeMode {
    switch (resizeMode) {
      case 'contain': return ResizeMode.CONTAIN;
      case 'cover': return ResizeMode.COVER;
      case 'stretch': return ResizeMode.STRETCH;
    }
  }

  function switchToAudioOnly() {
    setIsAudioOnly(true);
  }

  function switchToVideo() {
    setIsAudioOnly(false);
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <TouchableOpacity
        style={styles.videoContainer}
        activeOpacity={1}
        onPress={() => setShowControls(!showControls)}
      >
        {!isAudioOnly && (
          <Video
            ref={videoRef}
            source={{ uri: file.uri }}
            style={styles.video}
            resizeMode={getResizeModeEnum()}
            shouldPlay
            onPlaybackStatusUpdate={setStatus}
          />
        )}

        {isAudioOnly && (
          <View style={styles.audioOnlyBg}>
            <View style={[styles.audioOnlyArt, { borderColor: '#C2FC4A' }]}>
              <Text style={styles.audioOnlyIcon}>♪</Text>
            </View>
            <Text style={styles.audioOnlyLabel}>Audio Mode</Text>
          </View>
        )}

        {showControls && (
          <View style={styles.controlsOverlay}>
            <View style={styles.headerControls}>
              <TouchableOpacity style={styles.controlButton} onPress={goBack}>
                <Text style={styles.controlIcon}>←</Text>
              </TouchableOpacity>
              <Text style={styles.title} numberOfLines={1}>{file.name}</Text>
              <TouchableOpacity style={styles.speedBtn} onPress={() => setShowSpeedModal(true)}>
                <Text style={styles.speedBtnText}>{playbackSpeed}x</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.centerControls}>
              <TouchableOpacity style={styles.skipButton} onPress={() => skip(-10)}>
                <Text style={styles.skipIcon}>⏪</Text>
                <Text style={styles.skipLabel}>10s</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
                <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipButton} onPress={() => skip(10)}>
                <Text style={styles.skipIcon}>⏩</Text>
                <Text style={styles.skipLabel}>10s</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bottomControls}>
              {currentSubtitle && subtitlesEnabled && !isAudioOnly && (
                <View style={styles.subtitleContainer}>
                  <Text style={styles.subtitleText}>{currentSubtitle}</Text>
                </View>
              )}

              <View style={styles.progressWrapper}>
                <TouchableOpacity
                  style={styles.progressBar}
                  onPress={(e) => {
                    const { locationX } = e.nativeEvent;
                    seekTo(locationX / (SCREEN_WIDTH - 40));
                  }}
                >
                  <View style={[styles.progressFill, { width: `${(duration ? ((position as number) / (duration as number)) * 100 : 0)}%` as any }]} />
                </TouchableOpacity>
              </View>

              <View style={styles.timeRow}>
                <Text style={styles.timeText}>{formatDuration(position as number)}</Text>
                <View style={styles.timeButtons}>
                  <TouchableOpacity
                    style={[styles.iconBtnAudio, !isAudioOnly && { backgroundColor: 'rgba(194,252,74,0.2)' }]}
                    onPress={switchToAudioOnly}
                  >
                    <Text style={[styles.iconBtnText, !isAudioOnly && { color: '#C2FC4A' }]}>♪</Text>
                  </TouchableOpacity>
                  {isAudioOnly && (
                    <TouchableOpacity style={[styles.iconBtnAudio, isAudioOnly && { backgroundColor: 'rgba(194,252,74,0.2)' }]} onPress={switchToVideo}>
                      <Text style={[styles.iconBtnText, isAudioOnly && { color: '#C2FC4A' }]}>🎬</Text>
                    </TouchableOpacity>
                  )}
                  {!isAudioOnly && (
                    <>
                      <TouchableOpacity style={[styles.iconBtn, subtitlesEnabled && styles.iconBtnActive]} onPress={() => setSubtitlesEnabled(!subtitlesEnabled)}>
                        <Text style={styles.iconBtnText}>CC</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => setShowResizeModal(true)}>
                        <Text style={styles.iconBtnText}>⬜</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
                <Text style={styles.timeText}>{formatDuration(duration as number)}</Text>
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={showResizeModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowResizeModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Video Size</Text>
            {RESIZE_MODES.map((mode) => (
              <TouchableOpacity
                key={mode.mode}
                style={[styles.modalOption, resizeMode === mode.mode && styles.modalOptionActive]}
                onPress={() => { setResizeMode(mode.mode); setShowResizeModal(false); }}
              >
                <Text style={styles.modalOptionIcon}>{mode.icon}</Text>
                <Text style={[styles.modalOptionText, resizeMode === mode.mode && styles.modalOptionTextActive]}>{mode.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showSpeedModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowSpeedModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Playback Speed</Text>
            <ScrollView>
              {SPEEDS.map((speed) => (
                <TouchableOpacity
                  key={speed}
                  style={[styles.modalOption, playbackSpeed === speed && styles.modalOptionActive]}
                  onPress={() => changeSpeed(speed)}
                >
                  <Text style={[styles.modalOptionText, playbackSpeed === speed && styles.modalOptionTextActive]}>{speed}x</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#06060B' },
  videoContainer: { flex: 1 },
  video: { width: '100%', height: '100%' },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'space-between',
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 16,
  },
  controlButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  controlIcon: { fontSize: 28, color: '#ffffff' },
  title: { flex: 1, fontSize: 16, color: '#ffffff', textAlign: 'center', marginHorizontal: 10 },
  speedBtn: {
    backgroundColor: 'rgba(194, 252, 74, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  speedBtnText: { color: '#C2FC4A', fontSize: 13, fontWeight: '600' },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  skipButton: { alignItems: 'center' },
  skipIcon: { fontSize: 30, color: '#ffffff' },
  skipLabel: { fontSize: 10, color: 'rgba(255, 255, 255, 0.7)', marginTop: 2 },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(194, 252, 74, 0.3)',
  },
  playIcon: { fontSize: 36, color: '#ffffff' },
  bottomControls: { paddingHorizontal: 20, paddingBottom: 30 },
  subtitleContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: 'center',
    maxWidth: '90%',
  },
  subtitleText: { color: '#C2FC4A', fontSize: 16, textAlign: 'center' },
  progressWrapper: { height: 30, justifyContent: 'center' },
  progressBar: { height: 4, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 2 },
  progressFill: { height: '100%', backgroundColor: '#C2FC4A', borderRadius: 2 },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  timeText: { fontSize: 12, color: 'rgba(255, 255, 255, 0.7)' },
  timeButtons: { flexDirection: 'row', gap: 10 },
  iconBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconBtnActive: { backgroundColor: '#C2FC4A' },
  iconBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  audioOnlyBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#06060B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioOnlyArt: {
    width: 160,
    height: 160,
    borderRadius: 32,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 20,
  },
  audioOnlyIcon: { fontSize: 64, color: '#C2FC4A' },
  audioOnlyLabel: { fontSize: 16, color: 'rgba(255,255,255,0.5)', letterSpacing: 2 },
  iconBtnAudio: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1D1D21',
    borderRadius: 24,
    padding: 20,
    width: '80%',
    maxWidth: 300,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  modalOptionActive: { backgroundColor: 'rgba(194, 252, 74, 0.15)' },
  modalOptionIcon: { fontSize: 20, marginRight: 12 },
  modalOptionText: { fontSize: 16, color: '#ffffff' },
  modalOptionTextActive: { color: '#C2FC4A', fontWeight: '600' },
});
