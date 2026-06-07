import React from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { Play, Pause, SkipForward, X } from 'phosphor-react-native';
import { useAudioEngine, audioEngine } from '../../hooks/useAudioEngine';
import { useTheme } from '../../context/ThemeContext';
import { useColorAwareness } from '../../context/ColorAwarenessContext';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { ThemedText } from '../ThemedText';
import { hapticMedium, hapticLight } from '../../utils/haptics';

export const NowPlayingBar = React.memo(function NowPlayingBar() {
  const navigation = useAppNavigation();
  const { textColor, mutedColor, cardBg, borderColor, primaryColor, isDarkMode } = useTheme();
  const { canUseArtwork, themeColors } = useColorAwareness();
  const state = useAudioEngine((s) => {
    if (!s.currentFile) return null;
    return {
      currentFile: s.currentFile,
      isPlaying: s.isPlaying,
      progress: s.duration > 0 ? s.position / s.duration : 0,
    };
  });

  if (!state) return null;
  const { currentFile, isPlaying, progress } = state;

  const pause = () => audioEngine.pause();
  const resume = () => audioEngine.resume();
  const next = () => audioEngine.next();
  const stop = () => audioEngine.stop();

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
        onPress={() => {
          hapticLight();
          handleOpenPlayer();
        }}
        activeOpacity={0.8}
        accessibilityLabel={`Now playing: ${currentFile.name}. Open player.`}
        accessibilityRole="button">
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
            <Image
              source={require('../../assets/note.png')}
              style={{ width: 20, height: 20, tintColor: currentFile.artColor || accentColor }}
            />
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
          onPress={() => {
            hapticMedium();
            if (isPlaying) pause();
            else resume();
          }}
          hitSlop={12}
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          accessibilityRole="button">
          {isPlaying ? (
            <Pause size={18} color={accentColor} weight="fill" />
          ) : (
            <Play size={18} color={accentColor} weight="fill" />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          className="h-9 w-9 items-center justify-center rounded-full"
          onPress={() => {
            hapticLight();
            next();
          }}
          hitSlop={12}
          accessibilityLabel="Next track"
          accessibilityRole="button">
          <SkipForward size={18} color={muteColor} weight="fill" />
        </TouchableOpacity>
        <TouchableOpacity
          className="h-9 w-9 items-center justify-center rounded-full"
          onPress={() => {
            hapticMedium();
            stop();
          }}
          hitSlop={12}
          accessibilityLabel="Stop playback"
          accessibilityRole="button">
          <X size={16} color={muteColor} />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
});
