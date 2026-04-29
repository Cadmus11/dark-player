import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useFiles } from '../context/FileContext';
import { formatDuration } from '../services/FileService';

type MusicPlayerScreenProps = NativeStackScreenProps<RootStackParamList, 'MusicPlayer'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function MusicPlayerScreen({ navigation, route }: MusicPlayerScreenProps) {
  const { file } = route.params;
  const { audio, setMusicPlayer } = useFiles();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const isPlaying = status && 'isPlaying' in status ? status.isPlaying : false;
  const position = status && 'positionMillis' in status ? status.positionMillis : 0;
  const duration = status && 'durationMillis' in status ? (status.durationMillis ?? 0) : 0;

  useEffect(() => {
    const index = audio.findIndex((f) => f.uri === file.uri);
    if (index >= 0) setCurrentIndex(index);
    loadSound(file);

    return () => {
      sound?.unloadAsync();
    };
  }, [file.uri]);

  useEffect(() => {
    if (status && 'didJustFinish' in status && status.didJustFinish) {
      handleNext();
    }
  }, [status]);

  async function loadSound(fileItem: typeof file) {
    if (sound) {
      await sound.unloadAsync();
    }
    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri: fileItem.uri },
      { shouldPlay: true },
      onPlaybackStatusUpdate
    );
    setSound(newSound);
  }

  function onPlaybackStatusUpdate(newStatus: AVPlaybackStatus) {
    setStatus(newStatus);
  }

  async function togglePlayback() {
    if (!sound) return;
    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  }

  async function handleNext() {
    if (audio.length === 0) return;
    const nextIndex = (currentIndex + 1) % audio.length;
    const nextFile = audio[nextIndex];
    setCurrentIndex(nextIndex);
    setMusicPlayer({ currentFile: nextFile });
    await loadSound(nextFile);
  }

  async function handlePrev() {
    if (audio.length === 0) return;
    const prevIndex = (currentIndex - 1 + audio.length) % audio.length;
    const prevFile = audio[prevIndex];
    setCurrentIndex(prevIndex);
    setMusicPlayer({ currentFile: prevFile });
    await loadSound(prevFile);
  }

  async function seekTo(percentage: number) {
    if (!sound || !duration) return;
    await sound.setPositionAsync(Math.round(percentage * duration));
  }

  const progress = duration > 0 ? (position as number) / duration : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>↓</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Now Playing</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.albumArtContainer}>
          <View style={styles.albumArt}>
            <Text style={styles.albumIcon}>🎵</Text>
          </View>
        </View>

        <View style={styles.trackInfo}>
          <Text style={styles.trackName} numberOfLines={1}>
            {file.name}
          </Text>
          <Text style={styles.trackArtist}>Local File</Text>
        </View>

        <View style={styles.progressContainer}>
          <TouchableOpacity
            style={styles.progressBar}
            onPress={(e) => {
              const { locationX } = e.nativeEvent;
              seekTo(locationX / SCREEN_WIDTH);
            }}
          >
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            <View style={[styles.progressThumb, { left: `${progress * 100}%` }]} />
          </TouchableOpacity>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatDuration(position as number)}</Text>
            <Text style={styles.timeText}>{formatDuration(duration)}</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton} onPress={handlePrev}>
            <Text style={styles.controlIconLarge}>⏮</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
            <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={handleNext}>
            <Text style={styles.controlIconLarge}>⏭</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 28, color: '#ffffff' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 30 },
  albumArtContainer: { marginVertical: 40 },
  albumArt: {
    width: 280,
    height: 280,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  albumIcon: { fontSize: 80 },
  trackInfo: { alignItems: 'center', marginBottom: 30 },
  trackName: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', marginBottom: 8, textAlign: 'center' },
  trackArtist: { fontSize: 16, color: 'rgba(255, 255, 255, 0.5)' },
  progressContainer: { width: '100%', marginBottom: 40 },
  progressBar: { height: 30, justifyContent: 'center' },
  progressFill: { height: 4, backgroundColor: '#6c5ce7', borderRadius: 2 },
  progressThumb: {
    position: 'absolute',
    top: 8,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ffffff',
    marginLeft: -7,
  },
  timeContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 40 },
  controlButton: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
  controlIconLarge: { fontSize: 32, color: '#ffffff' },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6c5ce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: { fontSize: 36, color: '#ffffff' },
});
