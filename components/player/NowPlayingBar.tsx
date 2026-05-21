import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Play, Pause, SkipForward } from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';
import { usePlaybackStore } from '../../stores/playbackStore';
import { playbackManager } from '../../services/Playback/PlaybackManager';

export function NowPlayingBar() {
  const navigation = useNavigation<any>();
  const { currentFile, isPlaying, source } = usePlaybackStore();

  if (!currentFile || source !== 'music') return null;

  const handleOpenPlayer = () => {
    navigation.navigate('MusicPlayer', { file: currentFile });
  };

  const handleToggle = async () => {
    if (isPlaying) {
      await playbackManager.pauseMusic();
    } else {
      await playbackManager.resumeMusic();
    }
  };

  const handleNext = async () => {
    try {
      await playbackManager.skipToNext();
    } catch {}
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handleOpenPlayer} activeOpacity={0.8}>
      {currentFile.thumbnail ? (
        <Image source={{ uri: currentFile.thumbnail }} style={styles.art} />
      ) : (
        <View style={[styles.art, { backgroundColor: (currentFile.artColor || '#C2FC4A') + '30' }]} />
      )}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{currentFile.name}</Text>
        <Text style={styles.artist} numberOfLines={1}>
          {currentFile.artist || 'Lumora'}
        </Text>
      </View>
      <TouchableOpacity style={styles.btn} onPress={handleToggle} hitSlop={12}>
        {isPlaying ? <Pause size={22} color="#ffffff" weight="fill" /> : <Play size={22} color="#ffffff" weight="fill" />}
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={handleNext} hitSlop={12}>
        <SkipForward size={20} color="rgba(255,255,255,0.6)" weight="fill" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  art: {
    width: 42,
    height: 42,
    borderRadius: 10,
  },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  artist: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  btn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});
