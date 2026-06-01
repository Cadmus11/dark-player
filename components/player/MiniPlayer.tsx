import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { X, Play, Pause, ArrowsOut } from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useTheme } from '../../context/ThemeContext';
import { useColorAwareness } from '../../context/ColorAwarenessContext';

export function MiniPlayer() {
  const navigation = useNavigation<any>();
  const { textColor, mutedColor, primaryColor, cardBg, borderColor } = useTheme();
  const { canUseArtwork, themeColors } = useColorAwareness();
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

  const bgColor = canUseArtwork ? themeColors.surface : cardBg;
  const border = canUseArtwork ? themeColors.textSecondary + '18' : borderColor;
  const txtColor = canUseArtwork ? themeColors.textPrimary : textColor;
  const muteColor = canUseArtwork ? themeColors.textSecondary : mutedColor;
  const accentColor = canUseArtwork ? themeColors.accent : primaryColor;

  return (
    <View
      className="flex-row items-center gap-2.5 px-3 py-2"
      style={{
        backgroundColor: bgColor,
        borderTopWidth: 1,
        borderTopColor: border,
      }}>
      {currentFile.thumbnail ? (
        <Image
          source={{ uri: currentFile.thumbnail }}
          className="h-10 w-10 rounded-lg"
          style={{ borderWidth: 1, borderColor: accentColor + '40' }}
        />
      ) : (
        <View className="h-10 w-10 rounded-lg" style={{ backgroundColor: accentColor + '25' }} />
      )}
      <View className="flex-1">
        <Text className="text-[13px] font-semibold" style={{ color: txtColor }} numberOfLines={1}>
          {currentFile.name}
        </Text>
        <Text className="text-[11px]" style={{ color: muteColor }}>
          Video Mini Player
        </Text>
      </View>
      <TouchableOpacity
        className="h-9 w-9 items-center justify-center rounded-[10px]"
        onPress={isPlaying ? pause : resume}>
        {isPlaying ? (
          <Pause size={20} color={txtColor} weight="fill" />
        ) : (
          <Play size={20} color={txtColor} weight="fill" />
        )}
      </TouchableOpacity>
      <TouchableOpacity
        className="h-9 w-9 items-center justify-center rounded-[10px]"
        onPress={handleExpand}>
        <ArrowsOut size={18} color={txtColor} />
      </TouchableOpacity>
      <TouchableOpacity
        className="h-9 w-9 items-center justify-center rounded-[10px]"
        onPress={handleClose}>
        <X size={18} color={txtColor} />
      </TouchableOpacity>
    </View>
  );
}
