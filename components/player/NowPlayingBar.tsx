import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Play, Pause, SkipForward, MusicNote, X } from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useTheme } from '../../context/ThemeContext';
import { useColorAwareness } from '../../context/ColorAwarenessContext';

export function NowPlayingBar() {
  const navigation = useNavigation<any>();
  const { textColor, mutedColor, cardBg, borderColor, primaryColor } = useTheme();
  const { canUseArtwork, themeColors } = useColorAwareness();
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

  const bgColor = canUseArtwork ? themeColors.surface : cardBg;
  const border = canUseArtwork ? themeColors.textSecondary + '18' : borderColor;
  const txtColor = canUseArtwork ? themeColors.textPrimary : textColor;
  const muteColor = canUseArtwork ? themeColors.textSecondary : mutedColor;
  const accentColor = canUseArtwork ? themeColors.accent : primaryColor;

  return (
    <TouchableOpacity
      className="flex-row items-center gap-3 px-3.5 py-2.5"
      style={{
        backgroundColor: bgColor,
        borderTopWidth: 1,
        borderTopColor: border,
      }}
      onPress={handleOpenPlayer}
      activeOpacity={0.8}>
      {currentFile.thumbnail ? (
        <View
          style={{
            shadowColor: accentColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
            borderRadius: 10,
          }}>
          <Image source={{ uri: currentFile.thumbnail }} className="h-[42] w-[42] rounded-[10px]" />
        </View>
      ) : (
        <View
          className="h-[42] w-[42] items-center justify-center rounded-[10px]"
          style={{ backgroundColor: (currentFile.artColor || accentColor) + '30' }}>
          <MusicNote size={18} color={currentFile.artColor || accentColor} weight="bold" />
        </View>
      )}
      <View className="flex-1">
        <Text className="text-sm font-semibold" style={{ color: txtColor }} numberOfLines={1}>
          {currentFile.name}
        </Text>
        <Text className="text-xs" style={{ color: muteColor }} numberOfLines={1}>
          {currentFile.artist || 'Lumora'}
        </Text>
      </View>
      <TouchableOpacity
        className="h-9 w-9 items-center justify-center rounded-[10px]"
        onPress={isPlaying ? pause : resume}
        hitSlop={12}>
        {isPlaying ? (
          <Pause size={22} color={txtColor} weight="fill" />
        ) : (
          <Play size={22} color={txtColor} weight="fill" />
        )}
      </TouchableOpacity>
      <TouchableOpacity
        className="h-9 w-9 items-center justify-center rounded-[10px]"
        onPress={next}
        hitSlop={12}>
        <SkipForward size={20} color={muteColor} weight="fill" />
      </TouchableOpacity>
      <TouchableOpacity
        className="h-9 w-9 items-center justify-center rounded-[10px]"
        onPress={stop}
        hitSlop={12}>
        <X size={18} color={muteColor} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}
