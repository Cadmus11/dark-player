import React, { type ReactNode } from 'react';
import { View, StyleSheet, ImageBackground, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

interface BlurBackgroundProps {
  children: ReactNode;
  blurOverride?: number;
  fitOverride?: 'cover' | 'contain';
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function BlurBackground({ children, blurOverride, fitOverride }: BlurBackgroundProps) {
  const { theme, isDarkMode } = useTheme();
  const blur = blurOverride ?? theme.backgroundBlur ?? 20;
  const fit = fitOverride ?? theme.backgroundImageFit ?? 'cover';

  const renderBg = () => {
    if (theme.backgroundType === 'image' && theme.backgroundImageUri) {
      const overlayOpacity = Math.max(0, 1 - blur / 100);
      const overlayColor = isDarkMode ? '#06060B' : '#F5F5F5';
      return (
        <ImageBackground
          source={{ uri: theme.backgroundImageUri }}
          style={StyleSheet.absoluteFill}
          imageStyle={{ opacity: 0.85 }}
          resizeMode={fit}
          blurRadius={Platform.OS === 'android' ? blur / 4 : blur / 2}
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: hexToRgba(overlayColor, overlayOpacity) }]} />
        </ImageBackground>
      );
    }

    if (theme.backgroundType === 'gradient' && theme.gradientColors) {
      return (
        <LinearGradient
          colors={theme.gradientColors as [string, string, ...string[]]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      );
    }

    return <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? '#06060B' : '#F5F5F5' }]} />;
  };

  return (
    <View style={[styles.container, isDarkMode ? null : styles.lightBg]}>
      {renderBg()}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lightBg: {},
});
