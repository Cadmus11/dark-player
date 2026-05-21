import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { X, Play, Pause, ArrowsOut } from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';
import { usePlaybackStore } from '../../stores/playbackStore';

export function MiniPlayer() {
  const navigation = useNavigation<any>();
  const currentFile = usePlaybackStore((s) => s.currentFile);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const source = usePlaybackStore((s) => s.source);
  const pause = usePlaybackStore((s) => s.pause);
  const resume = usePlaybackStore((s) => s.resume);
  const stop = usePlaybackStore((s) => s.stop);

  if (!currentFile || source !== 'video') return null;

  const handleClose = () => stop();

  const handleExpand = () => {
    if (currentFile) {
      navigation.navigate('VideoPlayer', { file: currentFile, isAudioOnly: false });
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
        <Text style={styles.subtitle}>Video Mini Player</Text>
      </View>
      <TouchableOpacity style={styles.btn} onPress={isPlaying ? pause : resume}>
        {isPlaying ? <Pause size={20} color="#ffffff" weight="fill" /> : <Play size={20} color="#ffffff" weight="fill" />}
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={handleExpand}>
        <ArrowsOut size={18} color="#ffffff" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={handleClose}>
        <X size={18} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a2e', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', gap: 10 },
  thumbnail: { width: 40, height: 40, borderRadius: 8 },
  placeholder: { width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(194,252,74,0.15)' },
  info: { flex: 1 },
  title: { fontSize: 13, fontWeight: '600', color: '#ffffff' },
  subtitle: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  btn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});
