import React from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { X, Play, Pause, ArrowsOut } from 'phosphor-react-native';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useTheme } from '../../context/ThemeContext';
import { useColorAwareness } from '../../context/ColorAwarenessContext';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { ThemedText } from '../ThemedText';

export function MiniPlayer() {
  const navigation = useAppNavigation();
  const { textColor, mutedColor, primaryColor, cardBg, borderColor, isDarkMode } = useTheme();
  const { canUseArtwork, themeColors } = useColorAwareness();
  const state = usePlaybackStore((s) => {
    if (s.source !== 'video' || !s.currentFile) return null;
    return {
      currentFile: s.currentFile,
      isPlaying: s.isPlaying,
      progress: s.progress,
      pause: s.pause,
      resume: s.resume,
      stop: s.stop,
    };
  });

  if (!state) return null;
  const { currentFile, isPlaying, progress, pause, resume, stop } = state;

  const handleClose = () => stop();

  const handleExpand = () => {
    if (currentFile) {
      navigation.navigate('VideoPlayer', { file: currentFile, isAudioOnly: false });
    }
  };

  const bgColor = canUseArtwork ? themeColors.surface : cardBg;
  const txtColor = canUseArtwork ? themeColors.textPrimary : textColor;
  const muteColor = canUseArtwork ? themeColors.textSecondary : mutedColor;
  const accentColor = canUseArtwork ? themeColors.accent : primaryColor;

  return (
    <View
      className="overflow-hidden"
      style={{
        backgroundColor: bgColor,
        borderTopWidth: 1,
        borderTopColor: canUseArtwork ? themeColors.textSecondary + '18' : borderColor,
      }}>
      <View
        style={{
          height: 2,
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        }}>
        <View
          style={{
            width: `${Math.min(progress * 100, 100)}%`,
            height: 2,
            backgroundColor: accentColor,
          }}
        />
      </View>
      <View className="flex-row items-center gap-2.5 px-3 py-2">
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
          <ThemedText
            variant="body"
            style={{ color: txtColor, fontWeight: '600', fontSize: 13 }}
            numberOfLines={1}>
            {currentFile.name}
          </ThemedText>
          <ThemedText variant="caption" style={{ color: muteColor, fontSize: 11 }}>
            Video Mini Player
          </ThemedText>
        </View>
        <TouchableOpacity
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: `${accentColor}15` }}
          onPress={isPlaying ? pause : resume}>
          {isPlaying ? (
            <Pause size={18} color={accentColor} weight="fill" />
          ) : (
            <Play size={18} color={accentColor} weight="fill" />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          className="h-9 w-9 items-center justify-center rounded-full"
          onPress={handleExpand}>
          <ArrowsOut size={18} color={txtColor} />
        </TouchableOpacity>
        <TouchableOpacity
          className="h-9 w-9 items-center justify-center rounded-full"
          onPress={handleClose}>
          <X size={18} color={muteColor} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
