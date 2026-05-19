import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Animated } from 'react-native';
import { X, Play, Pause, Expand } from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';
import { usePlaybackStore } from '../../stores/playbackStore';
import { playbackManager } from '../../services/Playback/PlaybackManager';

export function MiniPlayer() {
  const navigation = useNavigation<any>();
  const { currentFile, isPlaying, source } = usePlaybackStore();
  const [expanded, setExpanded] = useState(false);

  if (!currentFile || source !== 'video') return null;

  const handleClose = async () => {
    await playbackManager.stopMusic();
  };

  const handleExpand = () => {
    if (currentFile) {
      navigation.navigate('VideoPlayer', { file: currentFile, isAudioOnly: false });
    }
  };

  const handleTogglePlay = async () => {
    if (isPlaying) {
      await playbackManager.pauseMusic();
    } else {
      await playbackManager.resumeMusic();
    }
  };

  return (
    <View style={styles.container}>
      {currentFile.thumbnail ? (
        <Image source={{ uri: currentFile.thumbnail }} style={styles.thumbnail} />
      ) : (
        <View style={styles.placeholder} />
      )}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{currentFile.name}</Text>
        <Text style={styles.subtitle}>Video • Mini Player</Text>
      </View>
      <TouchableOpacity style={styles.btn} onPress={handleTogglePlay}>
        {isPlaying ? <Pause size={20} color="#ffffff" weight="fill" /> : <Play size={20} color="#ffffff" weight="fill" />}
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={handleExpand}>
        <Expand size={18} color="#ffffff" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={handleClose}>
        <X size={18} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  placeholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(194,252,74,0.15)',
  },
  info: { flex: 1 },
  title: { fontSize: 13, fontWeight: '600', color: '#ffffff' },
  subtitle: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  btn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});
