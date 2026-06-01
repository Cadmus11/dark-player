import React, { type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

interface GlassCardProps {
  children: ReactNode;
  style?: ViewStyle;
  intensity?: number;
  glowColor?: string;
  onPress?: () => void;
  surfaceColor?: string;
  artworkAware?: boolean;
}

import { useTheme } from '../context/ThemeContext';
import { useColorAwareness } from '../context/ColorAwarenessContext';

export function GlassCard({
  children,
  style,
  intensity = 0.06,
  glowColor,
  onPress,
  surfaceColor: customSurface,
  artworkAware = false,
}: GlassCardProps) {
  const { isDarkMode, borderColor } = useTheme();
  const { canUseArtwork, themeColors } = useColorAwareness();

  const useArtworkColors = artworkAware && canUseArtwork;
  const bgColor = useArtworkColors
    ? themeColors.surface + 'CC'
    : isDarkMode
      ? `rgba(255, 255, 255, ${intensity})`
      : `rgba(0, 0, 0, 0.03)`;
  const brdColor = useArtworkColors ? themeColors.textSecondary + '18' : borderColor;
  const activeGlow = glowColor || (useArtworkColors ? themeColors.accent : undefined);

  return (
    <View
      className="overflow-hidden rounded-[28px]"
      style={[
        {
          backgroundColor: customSurface || bgColor,
          borderWidth: 1,
          borderColor: brdColor,
          ...(activeGlow
            ? {
                shadowColor: activeGlow,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
                elevation: 6,
              }
            : {}),
        },
        style,
      ]}>
      {children}
    </View>
  );
}
