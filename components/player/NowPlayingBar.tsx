import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Play, Pause, SkipForward, MusicNote, X } from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useTheme } from '../../context/ThemeContext';

export function NowPlayingBar() {
  const navigation = useNavigation<any>();
  const { textColor, mutedColor, isDarkMode, cardBg, borderColor, primaryColor } = useTheme();
  const currentFile = usePlaybackStore((s) => s.currentFile);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const source = usePlaybackStore((s) => s.source);
  const pause = usePlaybackStore((s) => s.pause);
  const resume = usePlaybackStore((s) => s.resume);
  const next = usePlaybackStore((s) => s.next);
  const stop = usePlaybackStore((s) => s.stop);

  if (!currentFile || source !== 'music') return null;

  const handleOpenPlayer = () => {
    navigation.navigate('MusicPlayer', { file: currentFile });
  };

  return (
    <TouchableOpacity
      className="flex-row items-center gap-3 px-3.5 py-2.5"
      style={{
        backgroundColor: cardBg,
        borderTopWidth: 1,
        borderTopColor: borderColor,
      }}
      onPress={handleOpenPlayer}
      activeOpacity={0.8}>
      {currentFile.thumbnail ? (
        <Image source={{ uri: currentFile.thumbnail }} className="h-[42] w-[42] rounded-[10px]" />
      ) : (
        <View
          className="h-[42] w-[42] items-center justify-center rounded-[10px]"
          style={{ backgroundColor: (currentFile.artColor || primaryColor) + '30' }}>
          <MusicNote size={18} color={currentFile.artColor || primaryColor} weight="bold" />
        </View>
      )}
      <View className="flex-1">
        <Text className="text-sm font-semibold" style={{ color: textColor }} numberOfLines={1}>
          {currentFile.name}
        </Text>
        <Text className="text-xs" style={{ color: mutedColor }} numberOfLines={1}>
          {currentFile.artist || 'Lumora'}
        </Text>
      </View>
      <TouchableOpacity
        className="h-9 w-9 items-center justify-center rounded-[10px]"
        onPress={isPlaying ? pause : resume}
        hitSlop={12}>
        {isPlaying ? (
          <Pause size={22} color={textColor} weight="fill" />
        ) : (
          <Play size={22} color={textColor} weight="fill" />
        )}
      </TouchableOpacity>
      <TouchableOpacity
        className="h-9 w-9 items-center justify-center rounded-[10px]"
        onPress={next}
        hitSlop={12}>
        <SkipForward size={20} color={mutedColor} weight="fill" />
      </TouchableOpacity>
      <TouchableOpacity
        className="h-9 w-9 items-center justify-center rounded-[10px]"
        onPress={stop}
        hitSlop={12}>
        <X size={18} color={mutedColor} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}
