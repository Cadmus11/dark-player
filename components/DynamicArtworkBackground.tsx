import React, { type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorAwareness } from '../context/ColorAwarenessContext';

interface DynamicArtworkBackgroundProps {
  children: ReactNode;
  artworkUri?: string | null;
  blurStrength?: number;
  overlayOpacity?: number;
  showGradient?: boolean;
}

export function DynamicArtworkBackground({
  children,
  artworkUri,
  blurStrength: customBlur,
  overlayOpacity: customOpacity,
  showGradient = true,
}: DynamicArtworkBackgroundProps) {
  const { state } = useColorAwareness();
  const uri = artworkUri || state.artworkUri;
  const blur = customBlur ?? state.blurStrength;
  const opacity = customOpacity ?? state.overlayOpacity;
  const theme = state.theme;

  if (!uri) {
    return (
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        {children}
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        blurRadius={blur}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: state.isDark
              ? `rgba(0,0,0,${opacity})`
              : `rgba(255,255,255,${opacity * 0.6})`,
          },
        ]}
      />
      {showGradient && (
        <LinearGradient
          style={StyleSheet.absoluteFill}
          colors={[
            'transparent',
            state.isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.3)',
            theme.background,
          ]}
          locations={[0, 0.5, 1]}
        />
      )}
      {children}
    </View>
  );
}
