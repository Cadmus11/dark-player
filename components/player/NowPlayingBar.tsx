import React from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { Play, Pause, SkipForward, MusicNote, X } from 'phosphor-react-native';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useTheme } from '../../context/ThemeContext';
import { useColorAwareness } from '../../context/ColorAwarenessContext';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { ThemedText } from '../ThemedText';

export function NowPlayingBar() {
  const navigation = useAppNavigation();
  const { textColor, mutedColor, cardBg, borderColor, primaryColor, isDarkMode } = useTheme();
  const { canUseArtwork, themeColors } = useColorAwareness();
  const state = usePlaybackStore((s) => {
    if (s.source !== 'music' || !s.currentFile) return null;
    return { currentFile: s.currentFile, isPlaying: s.isPlaying, progress: s.progress, pause: s.pause, resume: s.resume, next: s.next, stop: s.stop };
  });

  if (!state) return null;
  const { currentFile, isPlaying, progress, pause, resume, next, stop } = state;

  const handleOpenPlayer = () => {
    navigation.navigate('MusicPlayer', { file: currentFile });
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
      <TouchableOpacity
        className="flex-row items-center gap-3 px-3.5 py-2.5"
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
            <Image
              source={{ uri: currentFile.thumbnail }}
              className="h-[42] w-[42] rounded-[10px]"
            />
          </View>
        ) : (
          <View
            className="h-[42] w-[42] items-center justify-center rounded-[10px]"
            style={{ backgroundColor: (currentFile.artColor || accentColor) + '30' }}>
            <MusicNote size={18} color={currentFile.artColor || accentColor} weight="bold" />
          </View>
        )}
        <View className="flex-1">
          <ThemedText
            variant="body"
            style={{ color: txtColor, fontWeight: '600' }}
            numberOfLines={1}>
            {currentFile.name}
          </ThemedText>
          <ThemedText variant="caption" style={{ color: muteColor }} numberOfLines={1}>
            {currentFile.artist || 'Lumora'}
          </ThemedText>
        </View>
        <TouchableOpacity
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: `${accentColor}15` }}
          onPress={isPlaying ? pause : resume}
          hitSlop={12}>
          {isPlaying ? (
            <Pause size={18} color={accentColor} weight="fill" />
          ) : (
            <Play size={18} color={accentColor} weight="fill" />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          className="h-9 w-9 items-center justify-center rounded-full"
          onPress={next}
          hitSlop={12}>
          <SkipForward size={18} color={muteColor} weight="fill" />
        </TouchableOpacity>
        <TouchableOpacity
          className="h-9 w-9 items-center justify-center rounded-full"
          onPress={stop}
          hitSlop={12}>
          <X size={16} color={muteColor} />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}
