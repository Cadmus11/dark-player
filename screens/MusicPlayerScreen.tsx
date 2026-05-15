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
} from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useFiles } from '../context/FileContext';
import { formatDuration } from '../services/FileService';
import type { FileItem, Playlist } from '../types';

type MusicPlayerScreenProps = NativeStackScreenProps<RootStackParamList, 'MusicPlayer'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function MusicPlayerScreen({ navigation, route }: MusicPlayerScreenProps) {
  const { file } = route.params;
  const { audio, setMusicPlayer, playlists, createPlaylist, addToPlaylist } = useFiles();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showLyricsModal, setShowLyricsModal] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<'none' | 'one' | 'all'>('none');

  const isPlaying = status && 'isPlaying' in status ? status.isPlaying : false;
  const position = status && 'positionMillis' in status ? status.positionMillis : 0;
  const duration = status && 'durationMillis' in status ? (status.durationMillis ?? 0) : 0;

  const queue = audio.length > 0 ? audio : [file];

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const index = queue.findIndex((f) => f.uri === file.uri);
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

  async function loadSound(fileItem: FileItem) {
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

  function getNextIndex(): number {
    if (repeat === 'one') return currentIndex;
    if (shuffle) {
      return Math.floor(Math.random() * queue.length);
    }
    const next = currentIndex + 1;
    if (next >= queue.length) {
      return repeat === 'all' ? 0 : currentIndex;
    }
    return next;
  }

  function getPrevIndex(): number {
    if (repeat === 'one') return currentIndex;
    if (shuffle) {
      return Math.floor(Math.random() * queue.length);
    }
    const prev = currentIndex - 1;
    if (prev < 0) {
      return repeat === 'all' ? queue.length - 1 : 0;
    }
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
    if (!newPlaylistName.trim()) {
      Alert.alert('Error', 'Please enter a playlist name');
      return;
    }
    createPlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
  }

  function handleAddToPlaylist(playlist: Playlist) {
    addToPlaylist(playlist.id, file);
    setShowAddToPlaylistModal(false);
    Alert.alert('Success', `Added to ${playlist.name}`);
  }

  const progress = duration > 0 ? (position as number) / duration : 0;

  const repeatIcon = repeat === 'one' ? '🔂' : repeat === 'all' ? '🔁' : '🔁';
  const repeatOpacity = repeat === 'none' ? 0.4 : 1;

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

          <TouchableOpacity
            style={[styles.controlButton, { opacity: repeatOpacity }]}
            onPress={toggleRepeat}
          >
            <Text style={styles.controlIconLarge}>{repeatIcon}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.extraButtons}>
          <TouchableOpacity
            style={styles.extraButton}
            onPress={() => setShowAddToPlaylistModal(true)}
          >
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
            <Text style={styles.fullModalTitle}>Queue</Text>
            <TouchableOpacity onPress={() => setShowPlaylistModal(false)}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={queue}
            keyExtractor={(item) => item.uri}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[
                  styles.queueItem,
                  index === currentIndex && styles.queueItemActive,
                ]}
                onPress={() => selectFromQueue(item)}
              >
                <Text
                  style={[
                    styles.queueIndex,
                    index === currentIndex && styles.queueIndexActive,
                  ]}
                >
                  {index === currentIndex && isPlaying ? '▶' : index + 1}
                </Text>
                <View style={styles.queueInfo}>
                  <Text
                    style={[
                      styles.queueName,
                      index === currentIndex && styles.queueNameActive,
                    ]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text style={styles.queueDuration}>
                    {item.duration ? formatDuration(item.duration) : 'Unknown'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.queueList}
          />
        </View>
      </Modal>

      <Modal visible={showAddToPlaylistModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowAddToPlaylistModal(false)}
        >
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
                <TouchableOpacity
                  key={playlist.id}
                  style={styles.playlistItem}
                  onPress={() => handleAddToPlaylist(playlist)}
                >
                  <Text style={styles.playlistIcon}>🎶</Text>
                  <View style={styles.playlistInfo}>
                    <Text style={styles.playlistName}>{playlist.name}</Text>
                    <Text style={styles.playlistCount}>
                      {playlist.files.length} songs
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              {playlists.length === 0 && (
                <Text style={styles.emptyPlaylistText}>No playlists yet</Text>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowAddToPlaylistModal(false)}
            >
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
  backIcon: { fontSize: 24, color: '#ffffff' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  scrollContent: { alignItems: 'center', paddingHorizontal: 30 },
  albumArtContainer: { marginVertical: 30 },
  albumArt: {
    width: 260,
    height: 260,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  albumIcon: { fontSize: 80 },
  trackInfo: { alignItems: 'center', marginBottom: 24 },
  trackName: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', marginBottom: 6, textAlign: 'center' },
  trackArtist: { fontSize: 14, color: 'rgba(255, 255, 255, 0.5)' },
  progressContainer: { width: '100%', marginBottom: 24 },
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
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 20 },
  controlButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  controlIconSmall: { fontSize: 22, color: '#ffffff' },
  controlIconLarge: { fontSize: 28, color: '#ffffff' },
  controlActive: { color: '#6c5ce7' },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#6c5ce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: { fontSize: 32, color: '#ffffff' },
  extraButtons: { flexDirection: 'row', gap: 20, marginTop: 10 },
  extraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  extraIcon: { fontSize: 16, marginRight: 6 },
  extraText: { fontSize: 13, color: '#ffffff' },
  fullModal: { flex: 1, backgroundColor: '#111111' },
  fullModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
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
  queueItemActive: { backgroundColor: 'rgba(108, 92, 231, 0.15)' },
  queueIndex: { fontSize: 16, color: 'rgba(255, 255, 255, 0.5)', width: 40, textAlign: 'center' },
  queueIndexActive: { color: '#6c5ce7' },
  queueInfo: { flex: 1 },
  queueName: { fontSize: 15, color: '#ffffff', marginBottom: 4 },
  queueNameActive: { color: '#6c5ce7', fontWeight: '600' },
  queueDuration: { fontSize: 12, color: 'rgba(255, 255, 255, 0.4)' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 20,
    width: '85%',
    maxWidth: 360,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff', marginBottom: 16, textAlign: 'center' },
  createPlaylistRow: { flexDirection: 'row', marginBottom: 16, gap: 10 },
  playlistInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
  },
  createButton: {
    backgroundColor: '#6c5ce7',
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
  },
  createButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  lyricsContent: { padding: 20, paddingBottom: 40 },
  lyricsTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff', marginBottom: 20, textAlign: 'center' },
  lyricsPlaceholder: { fontSize: 15, color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', marginBottom: 12, lineHeight: 22 },
});
