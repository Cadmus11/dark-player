import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Modal, ScrollView, FlatList, TextInput, Animated, Image } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { CaretLeft, List, ShuffleAngular, SkipBack, Play, Pause, SkipForward, Repeat, RepeatOnce, VideoCamera, MusicNote, Plus, X, MusicNotes, SlidersHorizontal, Speedometer, MicrophoneStage, Heart } from 'phosphor-react-native';
import { useFiles } from '../context/FileContext';
import { useTheme } from '../context/ThemeContext';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { usePlaylistStore } from '../stores/playlistStore';
import { fileEngine } from '../engine/FileEngine';
import { MetadataService } from '../services/Metadata/MetadataService';
import type { FileItem, Playlist } from '../types';
import { NeonSlider } from '../components/NeonSlider';

type Props = NativeStackScreenProps<RootStackParamList, 'MusicPlayer'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function MusicPlayerScreen({ navigation, route }: Props) {
  const { file } = route.params;
  const { primaryColor } = useTheme();
  const { audio } = useFiles();

  const {
    isPlaying, position, duration, progress, queue, currentIndex,
    shuffle, repeat, playbackSpeed,
    playFile, togglePlay, seekTo, skipNext, skipPrev,
    setRate, cycleRepeat, toggleShuffle, setQueue,
  } = useAudioPlayback();

  const playlistStore = usePlaylistStore();

  const [showQueue, setShowQueue] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [showSpeed, setShowSpeed] = useState(false);
  const [showEq, setShowEq] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [favoriteUris, setFavoriteUris] = useState<string[]>([]);
  const [localArtwork, setLocalArtwork] = useState<string | null>(null);

  const pulseAnim = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    MetadataService.extract(file.uri, file.name).then((meta) => {
      if (meta.artwork) setLocalArtwork(meta.artwork);
    });
  }, [file.uri]);

  useEffect(() => {
    const q = audio.length > 0 ? audio : [file];
    const idx = q.findIndex((f) => f.uri === file.uri);
    playFile(file, q, idx >= 0 ? idx : 0);
  }, []);

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

  const handleNext = useCallback(() => skipNext(), [skipNext]);
  const handlePrev = useCallback(() => skipPrev(), [skipPrev]);

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return;
    playlistStore.create(newPlaylistName.trim());
    setNewPlaylistName('');
  };

  const handleAddToPlaylist = (pl: any) => {
    playlistStore.addSongs(pl.id, [currentItem || file]);
    setShowAddToPlaylist(false);
  };

  const currentItem = queue[currentIndex] || file;
  const artColor = currentItem?.artColor || primaryColor;
  const isVideo = currentItem?.type === 'video';
  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.3] });

  return (
    <View style={[styles.container, { backgroundColor: '#18181b' }]}>
      <View style={StyleSheet.absoluteFill}>
        {currentItem?.thumbnail || localArtwork ? (
          <Image source={{ uri: currentItem?.thumbnail || localArtwork! }} style={styles.bgImage} blurRadius={60} />
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
          <TouchableOpacity onPress={() => setShowQueue(true)} style={styles.backButton}>
            <List size={24} color="#ffffff" weight="bold" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.albumArtContainer}>
            <View style={[styles.albumArt, { borderColor: artColor + '40', shadowColor: artColor }]}>
              <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: artColor, opacity: pulseOpacity, borderRadius: 28 }]} />
              {currentItem?.thumbnail || localArtwork ? (
                <Image source={{ uri: currentItem?.thumbnail || localArtwork! }} style={styles.albumArtImage} />
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

          <View style={styles.trackInfo}>
            <Text style={[styles.trackName, { color: '#ffffff' }]} numberOfLines={1}>{currentItem?.name || file.name}</Text>
            <Text style={[styles.trackArtist, { color: primaryColor }]}>
              {currentItem?.artist || (isVideo ? 'Video (Audio Mode)' : 'Local File')}
            </Text>
          </View>

          <View style={styles.progressContainer}>
            <NeonSlider progress={progress} onSeek={seekTo} width={SCREEN_WIDTH - 60} primaryColor={artColor} />
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{fileEngine.formatDuration(position)}</Text>
              <Text style={styles.timeText}>{fileEngine.formatDuration(duration)}</Text>
            </View>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity style={styles.controlButton} onPress={toggleShuffle}>
              <ShuffleAngular size={22} color={shuffle ? primaryColor : '#e4e4e7'} weight={shuffle ? 'bold' : 'regular'} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={handlePrev}>
              <SkipBack size={28} color="#ffffff" weight="fill" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.playButton, { backgroundColor: primaryColor, shadowColor: primaryColor }]} onPress={togglePlay}>
              {isPlaying ? <Pause size={32} color="#18181b" weight="fill" /> : <Play size={32} color="#18181b" weight="fill" />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={handleNext}>
              <SkipForward size={28} color="#ffffff" weight="fill" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlButton, { opacity: repeat === 'none' ? 0.4 : 1 }]} onPress={cycleRepeat}>
              {repeat === 'one' ? <RepeatOnce size={24} color="#ffffff" weight="bold" /> : <Repeat size={24} color="#ffffff" weight="bold" />}
            </TouchableOpacity>
          </View>

          <View style={styles.extraControls}>
            <TouchableOpacity style={styles.extraBtn} onPress={() => setShowLyrics(!showLyrics)}>
              <MicrophoneStage size={18} color={showLyrics ? primaryColor : '#e4e4e7'} weight={showLyrics ? 'bold' : 'regular'} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.extraBtn} onPress={() => setShowSpeed(true)}>
              <Speedometer size={18} color="#e4e4e7" />
              <Text style={[styles.speedLabel, { color: '#e4e4e7' }]}>{playbackSpeed}x</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.extraBtn} onPress={() => setShowEq(true)}>
              <SlidersHorizontal size={18} color="#e4e4e7" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.extraBtn} onPress={() => setShowAddToPlaylist(true)}>
              <Plus size={18} color="#e4e4e7" />
            </TouchableOpacity>
          </View>

          {showLyrics && (
            <View style={styles.lyricsContainer}>
              <View style={[styles.lyricsHeader, { backgroundColor: `${primaryColor}15` }]}>
                <MicrophoneStage size={16} color={primaryColor} />
                <Text style={[styles.lyricsTitle, { color: primaryColor }]}>Lyrics</Text>
              </View>
              <View style={styles.lyricsEmpty}>
                <MicrophoneStage size={32} color={primaryColor + '60'} />
                <Text style={[styles.lyricsEmptyText, { color: '#e4e4e7' }]}>No lyrics available for this track.</Text>
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      {/* Queue Modal */}
      <Modal visible={showQueue} transparent animationType="slide">
        <View style={[styles.fullModal, { backgroundColor: '#18181b' }]}>
          <View style={styles.fullModalHeader}>
            <Text style={[styles.fullModalTitle, { color: '#ffffff' }]}>Queue ({queue.length})</Text>
            <TouchableOpacity onPress={() => setShowQueue(false)}><X size={24} color="#ffffff" /></TouchableOpacity>
          </View>
          <FlatList
            data={queue}
            keyExtractor={(item) => item.uri}
            renderItem={({ item, index }) => (
              <TouchableOpacity style={[styles.queueItem, index === currentIndex && { backgroundColor: `${primaryColor}15` }]}>
                <Text style={[styles.queueIndex, index === currentIndex && { color: primaryColor }]}>
                  {index === currentIndex && isPlaying ? '▶' : index + 1}
                </Text>
                <View style={[styles.queueArt, { backgroundColor: (item.artColor || primaryColor) + '20' }]}>
                  {item.type === 'video' ? <VideoCamera size={16} color="#ffffff" /> : <MusicNote size={16} color="#ffffff" />}
                </View>
                <View style={styles.queueInfo}>
                  <Text style={[styles.queueName, index === currentIndex && { color: primaryColor }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.queueDuration}>{item.duration ? fileEngine.formatDuration(item.duration) : 'Unknown'}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Add to Playlist Modal */}
      <Modal visible={showAddToPlaylist} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowAddToPlaylist(false)}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: '#ffffff' }]}>Add to Playlist</Text>
            <View style={styles.createPlaylistRow}>
              <TextInput style={[styles.playlistInput, { backgroundColor: '#27272a', color: '#ffffff' }]} placeholder="New playlist name" placeholderTextColor="rgba(255,255,255,0.4)" value={newPlaylistName} onChangeText={setNewPlaylistName} />
              <TouchableOpacity style={[styles.createButton, { backgroundColor: primaryColor }]} onPress={handleCreatePlaylist}>
                <Text style={[styles.createButtonText, { color: '#18181b' }]}>Create</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.playlistList}>
              {playlistStore.playlists.map((pl) => (
                <TouchableOpacity key={pl.id} style={styles.playlistItem} onPress={() => handleAddToPlaylist(pl)}>
                  <MusicNotes size={20} color="#ffffff" />
                  <View style={styles.playlistInfo}>
                    <Text style={[styles.playlistName, { color: '#ffffff' }]}>{pl.name}</Text>
                    <Text style={[styles.playlistCount, { color: '#a1a1aa' }]}>{pl.totalTracks} songs</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {playlistStore.playlists.length === 0 && <Text style={[styles.emptyPlaylistText, { color: '#a1a1aa' }]}>No playlists yet</Text>}
            </ScrollView>
            <TouchableOpacity style={[styles.modalCloseButton, { backgroundColor: '#27272a' }]} onPress={() => setShowAddToPlaylist(false)}>
              <Text style={[styles.modalCloseText, { color: '#ffffff' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Speed Modal */}
      <Modal visible={showSpeed} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowSpeed(false)}>
          <View style={styles.speedModalContent}>
            <Text style={[styles.modalTitle, { color: '#ffffff' }]}>Playback Speed</Text>
            <View style={styles.speedGrid}>
              {SPEEDS.map((speed) => (
                <TouchableOpacity key={speed} style={[styles.speedOption, playbackSpeed === speed && { backgroundColor: primaryColor }, { borderColor: playbackSpeed === speed ? primaryColor : '#3f3f46' }]} onPress={() => { setRate(speed); setShowSpeed(false); }}>
                  <Text style={[styles.speedOptionText, playbackSpeed === speed && { color: '#18181b', fontWeight: '700' }, { color: '#e4e4e7' }]}>{speed}x</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* EQ Modal */}
      <Modal visible={showEq} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowEq(false)}>
          <View style={styles.eqModalContent}>
            <Text style={[styles.modalTitle, { color: '#ffffff' }]}>Equalizer</Text>
            <Text style={[styles.eqPlaceholder, { color: '#a1a1aa' }]}>Equalizer controls coming soon</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  scrollContent: { alignItems: 'center', paddingHorizontal: 20 },
  albumArtContainer: { marginVertical: 24 },
  albumArt: { width: 240, height: 240, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 1, shadowColor: '#C2FC4A', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 10, overflow: 'hidden' },
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
  playButton: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  extraControls: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 20 },
  extraBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#27272a', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6 },
  speedLabel: { fontSize: 12, fontWeight: '600' },
  lyricsContainer: { width: '100%', backgroundColor: '#27272a', borderRadius: 20, padding: 16, marginBottom: 16 },
  lyricsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12, marginBottom: 12, alignSelf: 'flex-start' },
  lyricsTitle: { fontSize: 14, fontWeight: '700' },
  lyricsEmpty: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  lyricsEmptyText: { fontSize: 14, textAlign: 'center' },
  fullModal: { flex: 1 },
  fullModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.08)' },
  fullModalTitle: { fontSize: 20, fontWeight: '800' },
  queueItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20 },
  queueArt: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  queueIndex: { fontSize: 16, color: '#a1a1aa', width: 40, textAlign: 'center' },
  queueInfo: { flex: 1 },
  queueName: { fontSize: 15, color: '#ffffff', marginBottom: 4 },
  queueDuration: { fontSize: 12, color: '#a1a1aa' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#27272a', borderRadius: 24, padding: 24, width: '85%', maxWidth: 360, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  createPlaylistRow: { flexDirection: 'row', marginBottom: 16, gap: 10 },
  playlistInput: { flex: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  createButton: { paddingHorizontal: 16, borderRadius: 12, justifyContent: 'center' },
  createButtonText: { fontSize: 14, fontWeight: '700' },
  playlistList: { maxHeight: 200, marginBottom: 16 },
  playlistItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.06)' },
  playlistInfo: { flex: 1, marginLeft: 12 },
  playlistName: { fontSize: 15, marginBottom: 2 },
  playlistCount: { fontSize: 12 },
  emptyPlaylistText: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  modalCloseButton: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  modalCloseText: { fontSize: 15, fontWeight: '700' },
  speedModalContent: { backgroundColor: '#27272a', borderRadius: 24, padding: 24, width: '80%', maxWidth: 320 },
  speedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  speedOption: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  speedOptionText: { fontSize: 14, textAlign: 'center' },
  eqModalContent: { backgroundColor: '#27272a', borderRadius: 24, padding: 24, width: '90%' },
  eqPlaceholder: { fontSize: 14, textAlign: 'center', paddingVertical: 24 },
});
