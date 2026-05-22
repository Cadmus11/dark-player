import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
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
    <View className="flex-row items-center bg-[#1a1a2e] px-3 py-2 border-t border-t-white/[0.08] gap-2.5">
      {currentFile.thumbnail ? (
        <Image source={{ uri: currentFile.thumbnail }} className="w-10 h-10 rounded-lg" />
      ) : (
        <View className="w-10 h-10 rounded-lg" style={{ backgroundColor: 'rgba(194,252,74,0.15)' }} />
      )}
      <View className="flex-1">
        <Text className="text-[13px] font-semibold text-white" numberOfLines={1}>{currentFile.name}</Text>
        <Text className="text-[11px] text-white/40">Video Mini Player</Text>
      </View>
      <TouchableOpacity className="w-9 h-9 rounded-[10px] justify-center items-center" onPress={isPlaying ? pause : resume}>
        {isPlaying ? <Pause size={20} color="#ffffff" weight="fill" /> : <Play size={20} color="#ffffff" weight="fill" />}
      </TouchableOpacity>
      <TouchableOpacity className="w-9 h-9 rounded-[10px] justify-center items-center" onPress={handleExpand}>
        <ArrowsOut size={18} color="#ffffff" />
      </TouchableOpacity>
      <TouchableOpacity className="w-9 h-9 rounded-[10px] justify-center items-center" onPress={handleClose}>
        <X size={18} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}
