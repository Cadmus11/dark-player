import React, { type ReactNode } from 'react';
import { View, StyleSheet, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

interface BlurBackgroundProps {
  children: ReactNode;
}

export function BlurBackground({ children }: BlurBackgroundProps) {
  const { theme, backgroundOverlayColor } = useTheme();

  const renderBg = () => {
    if (theme.backgroundType === 'image' && theme.backgroundImageUri) {
      return (
        <ImageBackground
          source={{ uri: theme.backgroundImageUri }}
          style={StyleSheet.absoluteFill}
          imageStyle={{ opacity: 0.3 }}
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: backgroundOverlayColor }]} />
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

    return <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.backgroundColor }]} />;
  };

  return (
    <View style={styles.container}>
      {renderBg()}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
