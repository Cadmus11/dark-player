import React, { type ReactNode } from 'react';
import { View, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

interface BlurBackgroundProps {
  children: ReactNode;
}

export function BlurBackground({ children }: BlurBackgroundProps) {
  const { theme } = useTheme();

  const renderBg = () => {
    if (theme.backgroundImageUri) {
      return (
        <Image
          source={{ uri: theme.backgroundImageUri }}
          className="absolute inset-0"
          style={{ resizeMode: theme.backgroundImageFit || 'cover' }}
          blurRadius={theme.backgroundBlur ?? 0}
        />
      );
    }

    if (theme.backgroundType === 'gradient' && theme.gradientColors) {
      return (
        <LinearGradient
          colors={theme.gradientColors as [string, string, ...string[]]}
          className="absolute inset-0"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      );
    }

    return <View className="absolute inset-0 bg-bg-primary dark:bg-dark-bg-primary" />;
  };

  return (
    <View className="flex-1">
      {renderBg()}
      {children}
    </View>
  );
}
