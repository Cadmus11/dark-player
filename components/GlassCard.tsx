import React, { type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

interface GlassCardProps {
  children: ReactNode;
  style?: ViewStyle;
  intensity?: number;
  glowColor?: string;
  onPress?: () => void;
}

import { useTheme } from '../context/ThemeContext';

export function GlassCard({
  children,
  style,
  intensity = 0.06,
  glowColor,
  onPress,
}: GlassCardProps) {
  const { isDarkMode, borderColor } = useTheme();
  return (
    <View
      className="overflow-hidden rounded-[28px]"
      style={[
        {
          backgroundColor: isDarkMode ? `rgba(255, 255, 255, ${intensity})` : `rgba(0, 0, 0, 0.03)`,
          borderWidth: 1,
          borderColor: borderColor,
          ...(glowColor
            ? {
                shadowColor: glowColor,
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
