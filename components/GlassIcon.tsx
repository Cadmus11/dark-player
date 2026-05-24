import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface GlassIconProps {
  children: React.ReactNode;
  size?: number;
}

export function GlassIcon({ children, size = 36 }: GlassIconProps) {
  const { isDarkMode } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
        borderWidth: 0.5,
        borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </View>
  );
}
