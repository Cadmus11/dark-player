import React, { type ReactNode } from 'react';
import { View, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { getPresetImageSource } from '../constants/ThemeImages';

interface BlurBackgroundProps {
  children: ReactNode;
}

export function BlurBackground({ children }: BlurBackgroundProps) {
  const { theme, isDarkMode } = useTheme();

  const baseColor = isDarkMode ? '#09090b' : '#F0F8FF';

  const hasBackground = !!(theme.backgroundImageUri || theme.presetImageKey);

  const overlayColor = isDarkMode ? `rgba(9,9,11,0.5)` : `rgba(240,248,255,0.5)`;

  const renderBg = () => {
    if (theme.presetImageKey) {
      const source = getPresetImageSource(theme.presetImageKey);
      if (source) {
        return (
          <View className="absolute inset-0">
            <Image
              source={source}
              className="absolute inset-0"
              resizeMethod={Platform.OS === 'android' ? 'resize' : undefined}
              fadeDuration={0}
              style={{ resizeMode: theme.backgroundImageFit || 'cover' }}
            />
            <View className="absolute inset-0" style={{ backgroundColor: overlayColor }} />
          </View>
        );
      }
    }

    if (theme.backgroundImageUri) {
      return (
        <View className="absolute inset-0">
          <Image
            source={{ uri: theme.backgroundImageUri }}
            className="absolute inset-0"
            resizeMethod={Platform.OS === 'android' ? 'resize' : undefined}
            fadeDuration={0}
            style={{ resizeMode: theme.backgroundImageFit || 'cover' }}
          />
          <View className="absolute inset-0" style={{ backgroundColor: overlayColor }} />
        </View>
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

    return null;
  };

  const blurIntensity = (theme.backgroundBlur ?? 0) / 100;

  return (
    <View className="flex-1" style={{ backgroundColor: baseColor }}>
      {renderBg()}
      {hasBackground && (
        <View
          className="absolute inset-0"
          style={{
            backgroundColor: isDarkMode
              ? `rgba(9,9,11,${blurIntensity * 0.7})`
              : `rgba(240,248,255,${blurIntensity * 0.6})`,
          }}
        />
      )}
      {children}
    </View>
  );
}
