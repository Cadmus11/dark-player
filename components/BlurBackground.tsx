import React, { useMemo, type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useColorAwareness } from '../context/ColorAwarenessContext';

type Corner =
  | 'topLeft'
  | 'topRight'
  | 'bottomLeft'
  | 'bottomRight'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom';

function randomCorner(): Corner {
  const corners: Corner[] = [
    'topLeft',
    'topRight',
    'bottomLeft',
    'bottomRight',
    'left',
    'right',
    'top',
    'bottom',
  ];
  return corners[Math.floor(Math.random() * corners.length)];
}

function cornerToGradient(corner: Corner): {
  start: { x: number; y: number };
  end: { x: number; y: number };
} {
  switch (corner) {
    case 'topLeft':
      return { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };
    case 'topRight':
      return { start: { x: 1, y: 0 }, end: { x: 0, y: 1 } };
    case 'bottomLeft':
      return { start: { x: 0, y: 1 }, end: { x: 1, y: 0 } };
    case 'bottomRight':
      return { start: { x: 1, y: 1 }, end: { x: 0, y: 0 } };
    case 'left':
      return { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } };
    case 'right':
      return { start: { x: 1, y: 0.5 }, end: { x: 0, y: 0.5 } };
    case 'top':
      return { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } };
    case 'bottom':
      return { start: { x: 0.5, y: 1 }, end: { x: 0.5, y: 0 } };
  }
}

interface BlurBackgroundProps {
  children: ReactNode;
}

export function BlurBackground({ children }: BlurBackgroundProps) {
  const { theme, backgroundColor, isDarkMode } = useTheme();
  const { state, canUseArtwork } = useColorAwareness();
  const hasBackground = !!theme.backgroundImageUri;
  const blurIntensity = (theme.backgroundBlur ?? 0) / 100;
  const mode = theme.backgroundMode || 'fill';
  const brightness = (theme.backgroundBrightness ?? 50) / 100;
  const spotlightCorner = useMemo(() => randomCorner(), []);

  const overlayColor = isDarkMode ? `rgba(0,0,0,0.5)` : `rgba(255,255,255,0.5)`;
  const spotlightGradient = useMemo(() => cornerToGradient(spotlightCorner), [spotlightCorner]);

  const renderBg = () => {
    if (!theme.backgroundImageUri && !canUseArtwork) return null;

    return (
      <View className="absolute inset-0">
        <Image
          source={{ uri: theme.backgroundImageUri || state.artworkUri || '' }}
          className="absolute inset-0"
          contentFit={theme.backgroundImageFit || 'cover'}
          transition={0}
        />
        {mode === 'fill' && (
          <View className="absolute inset-0" style={{ backgroundColor: overlayColor }} />
        )}
        {mode === 'wallpaper' && (
          <View
            className="absolute inset-0"
            style={{ backgroundColor: `rgba(0,0,0,${(1 - brightness) * 0.85})` }}
          />
        )}
        {mode === 'spotlight' && (
          <LinearGradient
            className="absolute inset-0"
            start={spotlightGradient.start}
            end={spotlightGradient.end}
            colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.85)']}
            locations={[0.05, 0.35, 1]}
          />
        )}
      </View>
    );
  };

  const renderArtworkBg = () => {
    if (!canUseArtwork || theme.backgroundImageUri) return null;
    return (
      <>
        <Image
          source={{ uri: state.artworkUri || '' }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          blurRadius={state.blurStrength}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: state.isDark
                ? `rgba(0,0,0,${state.overlayOpacity})`
                : `rgba(255,255,255,${state.overlayOpacity * 0.6})`,
            },
          ]}
        />
      </>
    );
  };

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: canUseArtwork ? state.theme.background : backgroundColor }}>
      {renderArtworkBg()}
      {renderBg()}
      {hasBackground && mode === 'fill' && (
        <View
          className="absolute inset-0"
          style={{
            backgroundColor: isDarkMode
              ? `rgba(0,0,0,${blurIntensity * 0.7})`
              : `rgba(255,255,255,${blurIntensity * 0.6})`,
          }}
        />
      )}
      {children}
    </View>
  );
}
