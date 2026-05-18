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
  Image,
} from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import {
  CaretLeft, List, ShuffleAngular, SkipBack, Play, Pause,
  SkipForward, Repeat, RepeatOnce, VideoCamera, MusicNote,
  Plus, NotePencil, X, MusicNotes, SlidersHorizontal, Speedometer,
  MicrophoneStage, Palette, ArrowLeft, ArrowRight,
} from 'phosphor-react-native';
import { useFiles } from '../context/FileContext';
import { useTheme } from '../context/ThemeContext';
import { formatDuration } from '../services/FileService';
import { setupAudioMode, setSoundRef, setCurrentMedia, setPlaying, setCallbacks } from '../services/BackgroundPlaybackService';
import type { FileItem, Playlist } from '../types';
import { NeonSlider } from '../components/NeonSlider';

type MusicPlayerScreenProps = NativeStackScreenProps<RootStackParamList, 'MusicPlayer'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function MusicPlayerScreen({ navigation, route }: MusicPlayerScreenProps) {
  const { file, queue: initialQueue } = route.params;
  const { setMusicPlayer, playlists, createPlaylist, addToPlaylist, videos, audio, recordRecentlyPlayed } = useFiles();
  const { primaryColor } = useTheme();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showLyrics, setShowLyrics] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<'none' | 'one' | 'all'>('none');
  const [showVideoQueue, setShowVideoQueue] = useState(false);
  const [showSpeedModal, setShowSpeedModal] = useState(false);
  const [showEqualizerModal, setShowEqualizerModal] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [equalizer, setEqualizer] = useState<Record<string, number>>({
    '60Hz': 0, '170Hz': 0, '310Hz': 0, '600Hz': 0, '1kHz': 0, '3kHz': 0, '6kHz': 0, '12kHz': 0, '14kHz': 0, '16kHz': 0,
  });
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const audioWithVideos = [...audio, ...videos].sort((a, b) => (b.modifiedAt || 0) - (a.modifiedAt || 0));
  const queue = showVideoQueue ? audioWithVideos : (audio.length > 0 ? audio : [file]);

  useEffect(() => {
    setupAudioMode();
    const idx = queue.findIndex((f) => f.uri === file.uri);
    if (idx >= 0) setCurrentIndex(idx);
    loadSound(file);
    recordRecentlyPlayed(file);
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
      { shouldPlay: true, rate: playbackSpeed },
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
    setShowQueueModal(false);
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

  async function changeSpeed(speed: number) {
    setPlaybackSpeed(speed);
    if (sound) {
      await sound.setRateAsync(speed, true);
    }
    setShowSpeedModal(false);
  }

  const isPlaying = status && 'isPlaying' in status ? status.isPlaying : false;
  const position = status && 'positionMillis' in status ? status.positionMillis : 0;
  const duration = status && 'durationMillis' in status ? (status.durationMillis ?? 0) : 0;
  const progress = duration > 0 ? (position as number) / duration : 0;
  const currentItem = queue[currentIndex] || file;
  const artColor = currentItem?.artColor || primaryColor;
  const isVideo = currentItem?.type === 'video';

  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.3] });

  const eqBands = Object.keys(equalizer);

  return (
    <View style={[styles.container, { backgroundColor: '#18181b' }]}>
      {/* Dynamic Background */}
      <View style={StyleSheet.absoluteFill}>
        {currentItem?.thumbnail ? (
          <Image
            source={{ uri: currentItem.thumbnail }}
            style={styles.bgImage}
            blurRadius={60}
          />
        ) : (
          <View style={[styles.bgGradient, { backgroundColor: `${artColor}25` }]} />
        )}
        <View style={[styles.bgOverlay, { backgroundColor: '#18181bCC' }]} />
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <CaretLeft size={24} color="#ffffff" weight="bold" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Now Playing</Text>
          <TouchableOpacity onPress={() => setShowQueueModal(true)} style={styles.backButton}>
            <List size={24} color="#ffffff" weight="bold" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Album Art */}
          <View style={styles.albumArtContainer}>
            <View style={[styles.albumArt, { borderColor: artColor + '40', shadowColor: artColor }]}>
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: artColor, opacity: pulseOpacity, borderRadius: 28 },
                ]}
              />
              {currentItem?.thumbnail ? (
                <Image source={{ uri: currentItem.thumbnail }} style={styles.albumArtImage} />
              ) : (
                <View style={[styles.artPlaceholder, { backgroundColor: artColor + '15' }]}>
                  {isVideo ? (
                    <VideoCamera size={72} color={artColor} weight="bold" />
                  ) : (
                    <MusicNote size={72} color={artColor} weight="bold" />
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Track Info */}
          <View style={styles.trackInfo}>
            <Text style={[styles.trackName, { color: '#ffffff' }]} numberOfLines={1}>
              {currentItem.name}
            </Text>
            <Text style={[styles.trackArtist, { color: primaryColor }]}>
              {currentItem.artist || (isVideo ? 'Video (Audio Mode)' : 'Local File')}
            </Text>
          </View>

          {/* Progress */}
          <View style={styles.progressContainer}>
            <NeonSlider progress={progress} onSeek={seekTo} width={SCREEN_WIDTH - 60} primaryColor={artColor} />
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{formatDuration(position as number)}</Text>
              <Text style={styles.timeText}>{formatDuration(duration)}</Text>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity style={styles.controlButton} onPress={() => setShuffle(!shuffle)}>
              <ShuffleAngular size={22} color={shuffle ? primaryColor : '#e4e4e7'} weight={shuffle ? 'bold' : 'regular'} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={handlePrev}>
              <SkipBack size={28} color="#ffffff" weight="fill" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.playButton, { backgroundColor: primaryColor, shadowColor: primaryColor }]} onPress={togglePlayback}>
              {isPlaying ? <Pause size={32} color="#18181b" weight="fill" /> : <Play size={32} color="#18181b" weight="fill" />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={handleNext}>
              <SkipForward size={28} color="#ffffff" weight="fill" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlButton, { opacity: repeat === 'none' ? 0.4 : 1 }]} onPress={toggleRepeat}>
              {repeat === 'one' ? (
                <RepeatOnce size={24} color="#ffffff" weight="bold" />
              ) : (
                <Repeat size={24} color="#ffffff" weight="bold" />
              )}
            </TouchableOpacity>
          </View>

          {/* Extra Controls */}
          <View style={styles.extraControls}>
            <TouchableOpacity style={styles.extraBtn} onPress={() => setShowLyrics(!showLyrics)}>
              <MicrophoneStage size={18} color={showLyrics ? primaryColor : '#e4e4e7'} weight={showLyrics ? 'bold' : 'regular'} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.extraBtn} onPress={() => setShowSpeedModal(true)}>
              <Speedometer size={18} color="#e4e4e7" />
              <Text style={[styles.speedLabel, { color: '#e4e4e7' }]}>{playbackSpeed}x</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.extraBtn} onPress={() => setShowEqualizerModal(true)}>
              <SlidersHorizontal size={18} color="#e4e4e7" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.extraBtn} onPress={() => setShowAddToPlaylistModal(true)}>
              <Plus size={18} color="#e4e4e7" />
            </TouchableOpacity>
          </View>

          {/* Lyrics */}
          {showLyrics && (
            <View style={styles.lyricsContainer}>
              <View style={[styles.lyricsHeader, { backgroundColor: `${primaryColor}15` }]}>
                <NotePencil size={16} color={primaryColor} />
                <Text style={[styles.lyricsTitle, { color: primaryColor }]}>Lyrics</Text>
              </View>
              {currentItem?.hasLyrics || currentItem?.lyrics ? (
                <ScrollView style={styles.lyricsScroll}>
                  <Text style={[styles.lyricsText, { color: '#e4e4e7' }]}>
                    {currentItem.lyrics || 'Lyrics content loading...'}
                  </Text>
                </ScrollView>
              ) : (
                <View style={styles.lyricsEmpty}>
                  <MicrophoneStage size={32} color={primaryColor + '60'} />
                  <Text style={[styles.lyricsEmptyText, { color: '#e4e4e7' }]}>
                    No lyrics available for this track.
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      {/* Queue Modal */}
      <Modal visible={showQueueModal} transparent animationType="slide">
        <View style={[styles.fullModal, { backgroundColor: '#18181b' }]}>
          <View style={styles.fullModalHeader}>
            <Text style={[styles.fullModalTitle, { color: '#ffffff' }]}>Queue ({queue.length})</Text>
            <TouchableOpacity onPress={() => setShowQueueModal(false)}>
              <X size={24} color="#ffffff" style={{ padding: 10 }} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={queue}
            keyExtractor={(item) => item.uri}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[styles.queueItem, index === currentIndex && { backgroundColor: `${primaryColor}15` }]}
                onPress={() => selectFromQueue(item)}
              >
                <Text style={[styles.queueIndex, index === currentIndex && { color: primaryColor }]}>
                  {index === currentIndex && isPlaying ? '▶' : index + 1}
                </Text>
                <View style={[styles.queueArt, { backgroundColor: (item.artColor || primaryColor) + '20' }]}>
                  {item.type === 'video' ? (
                    <VideoCamera size={16} color="#ffffff" />
                  ) : (
                    <MusicNote size={16} color="#ffffff" />
                  )}
                </View>
                <View style={styles.queueInfo}>
                  <Text style={[styles.queueName, index === currentIndex && { color: primaryColor, fontWeight: '600' }]} numberOfLines={1}>
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

      {/* Add to Playlist Modal */}
      <Modal visible={showAddToPlaylistModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowAddToPlaylistModal(false)}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: '#ffffff' }]}>Add to Playlist</Text>
            <View style={styles.createPlaylistRow}>
              <TextInput
                style={[styles.playlistInput, { backgroundColor: '#27272a', color: '#ffffff' }]}
                placeholder="New playlist name"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
              />
              <TouchableOpacity style={[styles.createButton, { backgroundColor: primaryColor }]} onPress={handleCreatePlaylist}>
                <Text style={[styles.createButtonText, { color: '#18181b' }]}>Create</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.playlistList}>
              {playlists.map((playlist) => (
                <TouchableOpacity key={playlist.id} style={styles.playlistItem} onPress={() => handleAddToPlaylist(playlist)}>
                  <MusicNotes size={20} color="#ffffff" />
                  <View style={styles.playlistInfo}>
                    <Text style={[styles.playlistName, { color: '#ffffff' }]}>{playlist.name}</Text>
                    <Text style={[styles.playlistCount, { color: '#a1a1aa' }]}>{playlist.files.length} songs</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {playlists.length === 0 && <Text style={[styles.emptyPlaylistText, { color: '#a1a1aa' }]}>No playlists yet</Text>}
            </ScrollView>
            <TouchableOpacity style={[styles.modalCloseButton, { backgroundColor: '#27272a' }]} onPress={() => setShowAddToPlaylistModal(false)}>
              <Text style={[styles.modalCloseText, { color: '#ffffff' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Speed Modal */}
      <Modal visible={showSpeedModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowSpeedModal(false)}>
          <View style={styles.speedModalContent}>
            <Text style={[styles.modalTitle, { color: '#ffffff' }]}>Playback Speed</Text>
            <View style={styles.speedGrid}>
              {SPEEDS.map((speed) => (
                <TouchableOpacity
                  key={speed}
                  style={[
                    styles.speedOption,
                    playbackSpeed === speed && { backgroundColor: primaryColor },
                    { borderColor: playbackSpeed === speed ? primaryColor : '#3f3f46' },
                  ]}
                  onPress={() => changeSpeed(speed)}
                >
                  <Text style={[styles.speedOptionText, playbackSpeed === speed && { color: '#18181b', fontWeight: '700' }, { color: '#e4e4e7' }]}>
                    {speed}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Equalizer Modal */}
      <Modal visible={showEqualizerModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowEqualizerModal(false)}>
          <View style={styles.eqModalContent}>
            <Text style={[styles.modalTitle, { color: '#ffffff' }]}>Equalizer</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eqBands}>
              {eqBands.map((band) => (
                <View key={band} style={styles.eqBand}>
                  <Text style={[styles.eqValue, { color: primaryColor }]}>{equalizer[band]}dB</Text>
                  <View style={styles.eqSlider}>
                    <TouchableOpacity
                      style={[styles.eqUp, { backgroundColor: '#27272a' }]}
                      onPress={() => setEqualizer((prev) => ({ ...prev, [band]: Math.min(12, prev[band] + 1) }))}
                    >
                      <ArrowLeft size={12} color="#e4e4e7" />
                    </TouchableOpacity>
                    <View style={[styles.eqTrack, { backgroundColor: '#3f3f46' }]} />
                    <TouchableOpacity
                      style={[styles.eqDown, { backgroundColor: '#27272a' }]}
                      onPress={() => setEqualizer((prev) => ({ ...prev, [band]: Math.max(-12, prev[band] - 1) }))}
                    >
                      <ArrowRight size={12} color="#e4e4e7" />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.eqLabel, { color: '#a1a1aa' }]}>{band}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgImage: { width: '100%', height: '100%' },
  bgGradient: { width: '100%', height: '100%' },
  bgOverlay: { ...StyleSheet.absoluteFillObject },
  content: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  scrollContent: { alignItems: 'center', paddingHorizontal: 20 },
  albumArtContainer: { marginVertical: 24 },
  albumArt: {
    width: 240,
    height: 240,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#C2FC4A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
    overflow: 'hidden',
  },
  albumArtImage: { width: '100%', height: '100%' },
  artPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  trackInfo: { alignItems: 'center', marginBottom: 20 },
  trackName: { fontSize: 20, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  trackArtist: { fontSize: 14, textAlign: 'center' },
  progressContainer: { width: '100%', marginBottom: 20 },
  timeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  timeText: { fontSize: 12, color: '#a1a1aa' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 16 },
  controlButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  extraControls: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 20 },
  extraBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  speedLabel: { fontSize: 12, fontWeight: '600' },
  lyricsContainer: {
    width: '100%',
    backgroundColor: '#27272a',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  lyricsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  lyricsTitle: { fontSize: 14, fontWeight: '700' },
  lyricsScroll: { maxHeight: 200 },
  lyricsText: { fontSize: 14, lineHeight: 24, textAlign: 'center' },
  lyricsEmpty: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  lyricsEmptyText: { fontSize: 14, textAlign: 'center' },
  fullModal: { flex: 1 },
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
  fullModalTitle: { fontSize: 20, fontWeight: '800' },
  queueList: { paddingBottom: 40 },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  queueArt: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  queueIndex: { fontSize: 16, color: '#a1a1aa', width: 40, textAlign: 'center' },
  queueInfo: { flex: 1 },
  queueName: { fontSize: 15, color: '#ffffff', marginBottom: 4 },
  queueDuration: { fontSize: 12, color: '#a1a1aa' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#27272a',
    borderRadius: 24,
    padding: 24,
    width: '85%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  createPlaylistRow: { flexDirection: 'row', marginBottom: 16, gap: 10 },
  playlistInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  createButton: { paddingHorizontal: 16, borderRadius: 12, justifyContent: 'center' },
  createButtonText: { fontSize: 14, fontWeight: '700' },
  playlistList: { maxHeight: 200, marginBottom: 16 },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  playlistInfo: { flex: 1, marginLeft: 12 },
  playlistName: { fontSize: 15, marginBottom: 2 },
  playlistCount: { fontSize: 12 },
  emptyPlaylistText: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  modalCloseButton: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  modalCloseText: { fontSize: 15, fontWeight: '700' },
  speedModalContent: {
    backgroundColor: '#27272a',
    borderRadius: 24,
    padding: 24,
    width: '80%',
    maxWidth: 320,
  },
  speedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  speedOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  speedOptionText: { fontSize: 14, textAlign: 'center' },
  eqModalContent: {
    backgroundColor: '#27272a',
    borderRadius: 24,
    padding: 24,
    width: '90%',
  },
  eqBands: { marginTop: 16 },
  eqBand: { alignItems: 'center', marginRight: 20 },
  eqValue: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  eqSlider: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eqUp: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  eqDown: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  eqTrack: { width: 4, height: 80, borderRadius: 2 },
  eqLabel: { fontSize: 11, marginTop: 8 },
});
