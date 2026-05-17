import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  ScrollView,
  FlatList,
  Alert,
  TextInput,
  Animated,
} from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useFiles } from '../context/FileContext';
import { formatDuration } from '../services/FileService';
import { setupAudioMode, setSoundRef, setCurrentMedia, setPlaying, setCallbacks } from '../services/BackgroundPlaybackService';
import type { FileItem, Playlist } from '../types';

type MusicPlayerScreenProps = NativeStackScreenProps<RootStackParamList, 'MusicPlayer'>;

import { NeonSlider } from '../components/NeonSlider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function MusicPlayerScreen({ navigation, route }: MusicPlayerScreenProps) {
  const { file } = route.params;
  const { audioWithVideos, setMusicPlayer, playlists, createPlaylist, addToPlaylist, videos, audio } = useFiles();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showLyricsModal, setShowLyricsModal] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<'none' | 'one' | 'all'>('none');
  const [showVideoQueue, setShowVideoQueue] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const isPlaying = status && 'isPlaying' in status ? status.isPlaying : false;
  const position = status && 'positionMillis' in status ? status.positionMillis : 0;
  const duration = status && 'durationMillis' in status ? (status.durationMillis ?? 0) : 0;

  const queue = showVideoQueue ? audioWithVideos : (audio.length > 0 ? audio : [file]);

  useEffect(() => {
    setupAudioMode();
    const idx = queue.findIndex((f) => f.uri === file.uri);
    if (idx >= 0) setCurrentIndex(idx);
    loadSound(file);
    setCallbacks({
      onNext: () => handleNext(),
      onPrev: () => handlePrev(),
      onToggle: (playing) => {
        if (playing) sound?.playAsync();
        else sound?.pauseAsync();
      },
    });
    return () => {
      sound?.unloadAsync();
      setSoundRef(null);
    };
  }, [file.uri]);

  useEffect(() => {
    if (status && 'didJustFinish' in status && status.didJustFinish) {
      handleNext();
    }
  }, [status]);

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

  async function loadSound(fileItem: FileItem) {
    if (sound) await sound.unloadAsync();
    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri: fileItem.uri },
      { shouldPlay: true },
      onPlaybackStatusUpdate
    );
    setSound(newSound);
    setSoundRef(newSound);
    setCurrentMedia(fileItem);
    setPlaying(true);
  }

  function onPlaybackStatusUpdate(newStatus: AVPlaybackStatus) {
    setStatus(newStatus);
    if ('isLoaded' in newStatus) {
      setPlaying(newStatus.isPlaying);
    }
  }

  async function togglePlayback() {
    if (!sound) return;
    if (isPlaying) { await sound.pauseAsync(); setPlaying(false); }
    else { await sound.playAsync(); setPlaying(true); }
  }

  function getNextIndex(): number {
    if (repeat === 'one') return currentIndex;
    if (shuffle) return Math.floor(Math.random() * queue.length);
    const next = currentIndex + 1;
    if (next >= queue.length) return repeat === 'all' ? 0 : currentIndex;
    return next;
  }

  function getPrevIndex(): number {
    if (repeat === 'one') return currentIndex;
    if (shuffle) return Math.floor(Math.random() * queue.length);
    const prev = currentIndex - 1;
    if (prev < 0) return repeat === 'all' ? queue.length - 1 : 0;
    return prev;
  }

  async function handleNext() {
    if (queue.length === 0) return;
    const nextIndex = getNextIndex();
    const nextFile = queue[nextIndex];
    setCurrentIndex(nextIndex);
    setMusicPlayer({ currentFile: nextFile });
    await loadSound(nextFile);
  }

  async function handlePrev() {
    if (queue.length === 0) return;
    if ((position as number) > 3000) {
      await sound?.setPositionAsync(0);
      return;
    }
    const prevIndex = getPrevIndex();
    const prevFile = queue[prevIndex];
    setCurrentIndex(prevIndex);
    setMusicPlayer({ currentFile: prevFile });
    await loadSound(prevFile);
  }

  async function seekTo(percentage: number) {
    if (!sound || !duration) return;
    await sound.setPositionAsync(Math.round(percentage * duration));
  }

  function toggleRepeat() {
    const modes: Array<'none' | 'one' | 'all'> = ['none', 'all', 'one'];
    const idx = modes.indexOf(repeat);
    setRepeat(modes[(idx + 1) % modes.length]);
  }

  async function selectFromQueue(item: FileItem) {
    const index = queue.findIndex((f) => f.uri === item.uri);
    if (index >= 0) {
      setCurrentIndex(index);
      setMusicPlayer({ currentFile: item });
      await loadSound(item);
    }
    setShowPlaylistModal(false);
  }

  function handleCreatePlaylist() {
    if (!newPlaylistName.trim()) { Alert.alert('Error', 'Please enter a playlist name'); return; }
    createPlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
  }

  function handleAddToPlaylist(playlist: Playlist) {
    addToPlaylist(playlist.id, file);
    setShowAddToPlaylistModal(false);
    Alert.alert('Success', `Added to ${playlist.name}`);
  }

  function navigateToVideo(file: FileItem) {
    navigation.navigate('VideoPlayer', { file, isAudioOnly: true });
  }

  const progress = duration > 0 ? (position as number) / duration : 0;

  const currentItem = queue[currentIndex];
  const artColor = currentItem?.artColor || '#C2FC4A';
  const isVideo = currentItem?.type === 'video';

  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.35] });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>↓</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Now Playing</Text>
        <TouchableOpacity onPress={() => setShowPlaylistModal(true)} style={styles.backButton}>
          <Text style={styles.backIcon}>☰</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.albumArtContainer}>
          <View style={[styles.albumArt, { borderColor: artColor + '40', shadowColor: artColor }]}>
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: artColor,
                  opacity: pulseOpacity,
                  borderRadius: 28,
                },
              ]}
            />
            <View
              style={[
                styles.artInitialBg,
                { backgroundColor: artColor + '20' },
              ]}
            >
              <Text style={[styles.artInitial, { color: artColor }]}>
                {isVideo ? '🎬' : (file.name.charAt(0).toUpperCase() || '♪')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.trackInfo}>
          <Text style={styles.trackName} numberOfLines={1}>
            {file.name}
          </Text>
          <Text style={styles.trackArtist}>
            {isVideo ? 'Video (Audio Mode)' : 'Local File'}
          </Text>
        </View>

        <View style={styles.progressContainer}>
          <NeonSlider progress={progress} onSeek={seekTo} width={SCREEN_WIDTH - 60} />
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatDuration(position as number)}</Text>
            <Text style={styles.timeText}>{formatDuration(duration)}</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton} onPress={() => setShuffle(!shuffle)}>
            <Text style={[styles.controlIconSmall, shuffle && styles.controlActive]}>🔀</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={handlePrev}>
            <Text style={styles.controlIconLarge}>⏮</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
            <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={handleNext}>
            <Text style={styles.controlIconLarge}>⏭</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlButton, { opacity: repeat === 'none' ? 0.4 : 1 }]} onPress={toggleRepeat}>
            <Text style={styles.controlIconLarge}>{repeat === 'one' ? '🔂' : '🔁'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.extraButtons}>
          {!showVideoQueue && videos.length > 0 && (
            <TouchableOpacity style={styles.extraButton} onPress={() => setShowVideoQueue(true)}>
              <Text style={styles.extraIcon}>🎬</Text>
              <Text style={styles.extraText}>Include Videos</Text>
            </TouchableOpacity>
          )}
          {showVideoQueue && (
            <TouchableOpacity style={[styles.extraButton, styles.extraButtonActive]} onPress={() => setShowVideoQueue(false)}>
              <Text style={styles.extraIcon}>♪</Text>
              <Text style={styles.extraText}>Audio Only</Text>
            </TouchableOpacity>
          )}
          {isVideo && (
            <TouchableOpacity style={styles.extraButton} onPress={() => navigateToVideo(currentItem)}>
              <Text style={styles.extraIcon}>🎥</Text>
              <Text style={styles.extraText}>Open Video</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.extraButton} onPress={() => setShowAddToPlaylistModal(true)}>
            <Text style={styles.extraIcon}>➕</Text>
            <Text style={styles.extraText}>Add to Playlist</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.extraButton} onPress={() => setShowLyricsModal(true)}>
            <Text style={styles.extraIcon}>📝</Text>
            <Text style={styles.extraText}>Lyrics</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showPlaylistModal} transparent animationType="slide">
        <View style={styles.fullModal}>
          <View style={styles.fullModalHeader}>
            <Text style={styles.fullModalTitle}>Queue ({queue.length})</Text>
            <TouchableOpacity onPress={() => setShowPlaylistModal(false)}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={queue}
            keyExtractor={(item) => item.uri}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[styles.queueItem, index === currentIndex && styles.queueItemActive]}
                onPress={() => selectFromQueue(item)}
              >
                <Text style={[styles.queueIndex, index === currentIndex && styles.queueIndexActive]}>
                  {index === currentIndex && isPlaying ? '▶' : index + 1}
                </Text>
                <View style={[styles.queueArt, { backgroundColor: (item.artColor || '#C2FC4A') + '30' }]}>
                  <Text style={styles.queueArtText}>{item.type === 'video' ? '🎬' : '♪'}</Text>
                </View>
                <View style={styles.queueInfo}>
                  <Text style={[styles.queueName, index === currentIndex && styles.queueNameActive]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.queueDuration}>
                    {item.duration ? formatDuration(item.duration) : 'Unknown'}
                    {item.type === 'video' ? ' • Video' : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.queueList}
          />
        </View>
      </Modal>

      <Modal visible={showAddToPlaylistModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowAddToPlaylistModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add to Playlist</Text>
            <View style={styles.createPlaylistRow}>
              <TextInput
                style={styles.playlistInput}
                placeholder="New playlist name"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
              />
              <TouchableOpacity style={styles.createButton} onPress={handleCreatePlaylist}>
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.playlistList}>
              {playlists.map((playlist) => (
                <TouchableOpacity key={playlist.id} style={styles.playlistItem} onPress={() => handleAddToPlaylist(playlist)}>
                  <Text style={styles.playlistIcon}>🎶</Text>
                  <View style={styles.playlistInfo}>
                    <Text style={styles.playlistName}>{playlist.name}</Text>
                    <Text style={styles.playlistCount}>{playlist.files.length} songs</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {playlists.length === 0 && <Text style={styles.emptyPlaylistText}>No playlists yet</Text>}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowAddToPlaylistModal(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showLyricsModal} transparent animationType="slide">
        <View style={styles.fullModal}>
          <View style={styles.fullModalHeader}>
            <Text style={styles.fullModalTitle}>Lyrics</Text>
            <TouchableOpacity onPress={() => setShowLyricsModal(false)}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.lyricsContent}>
            <Text style={styles.lyricsTitle}>{file.name}</Text>
            <Text style={styles.lyricsPlaceholder}>
              No lyrics available for this track.
            </Text>
            <Text style={styles.lyricsPlaceholder}>
              Lyrics files (.lrc, .txt) should be placed in the same folder as the audio file.
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#06060B' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 24, color: '#ffffff' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  scrollContent: { alignItems: 'center', paddingHorizontal: 30 },
  albumArtContainer: { marginVertical: 30 },
  albumArt: {
    width: 260,
    height: 260,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(194, 252, 74, 0.15)',
    shadowColor: '#C2FC4A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 8,
  },
  albumIcon: { fontSize: 80 },
  artInitialBg: {
    width: 200,
    height: 200,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artInitial: { fontSize: 72, fontWeight: 'bold', opacity: 0.9 },
  trackInfo: { alignItems: 'center', marginBottom: 24 },
  trackName: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', marginBottom: 6, textAlign: 'center', letterSpacing: 0.5 },
  trackArtist: { fontSize: 14, color: 'rgba(255, 255, 255, 0.4)' },
  progressContainer: { width: '100%', marginBottom: 24 },
  timeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  timeText: { fontSize: 12, color: 'rgba(255, 255, 255, 0.4)' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 20 },
  controlButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  controlIconSmall: { fontSize: 22, color: '#ffffff' },
  controlIconLarge: { fontSize: 28, color: '#ffffff' },
  controlActive: { color: '#C2FC4A' },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#C2FC4A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#C2FC4A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  playIcon: { fontSize: 32, color: '#06060B' },
  extraButtons: { flexDirection: 'row', gap: 20, marginTop: 10 },
  extraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  extraIcon: { fontSize: 16, marginRight: 6 },
  extraText: { fontSize: 13, color: '#ffffff' },
  extraButtonActive: { borderColor: '#C2FC4A', backgroundColor: 'rgba(194, 252, 74, 0.1)' },
  fullModal: { flex: 1, backgroundColor: '#06060B' },
  fullModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  fullModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  closeIcon: { fontSize: 24, color: '#ffffff', padding: 10 },
  queueList: { paddingBottom: 40 },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  queueItemActive: { backgroundColor: 'rgba(194, 252, 74, 0.1)' },
  queueArt: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  queueArtText: { fontSize: 16 },
  queueIndex: { fontSize: 16, color: 'rgba(255, 255, 255, 0.4)', width: 40, textAlign: 'center' },
  queueIndexActive: { color: '#C2FC4A' },
  queueInfo: { flex: 1 },
  queueName: { fontSize: 15, color: '#ffffff', marginBottom: 4 },
  queueNameActive: { color: '#C2FC4A', fontWeight: '600' },
  queueDuration: { fontSize: 12, color: 'rgba(255, 255, 255, 0.4)' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1D1D21',
    borderRadius: 24,
    padding: 24,
    width: '85%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff', marginBottom: 16, textAlign: 'center' },
  createPlaylistRow: { flexDirection: 'row', marginBottom: 16, gap: 10 },
  playlistInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 14,
  },
  createButton: {
    backgroundColor: '#C2FC4A',
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
  },
  createButtonText: { color: '#06060B', fontSize: 14, fontWeight: '700' },
  playlistList: { maxHeight: 200, marginBottom: 16 },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  playlistIcon: { fontSize: 20, marginRight: 12 },
  playlistInfo: { flex: 1 },
  playlistName: { fontSize: 15, color: '#ffffff', marginBottom: 2 },
  playlistCount: { fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' },
  emptyPlaylistText: { fontSize: 14, color: 'rgba(255, 255, 255, 0.4)', textAlign: 'center', paddingVertical: 20 },
  modalCloseButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  lyricsContent: { padding: 20, paddingBottom: 40 },
  lyricsTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff', marginBottom: 20, textAlign: 'center' },
  lyricsPlaceholder: { fontSize: 15, color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', marginBottom: 12, lineHeight: 22 },
});
