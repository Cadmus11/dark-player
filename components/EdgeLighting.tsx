import React, { type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorAwareness } from '../context/ColorAwarenessContext';

interface EdgeLightingProps {
  children: ReactNode;
  opacity?: number;
  enabled?: boolean;
}

export function EdgeLighting({ children, opacity = 0.08, enabled = true }: EdgeLightingProps) {
  const { edgeColors, state } = useColorAwareness();

  if (!enabled || !state.artworkUri) {
    return <>{children}</>;
  }

  return (
    <View className="flex-1">
      <View className="absolute inset-0" style={{ pointerEvents: 'none' }}>
        <LinearGradient
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 0.3, y: 0.5 }}
          colors={[
            `${edgeColors.left}${Math.round(opacity * 255)
              .toString(16)
              .padStart(2, '0')}`,
            'transparent',
          ]}
          locations={[0, 0.6]}
        />
        <LinearGradient
          style={StyleSheet.absoluteFill}
          start={{ x: 1, y: 0.5 }}
          end={{ x: 0.7, y: 0.5 }}
          colors={[
            `${edgeColors.right}${Math.round(opacity * 255)
              .toString(16)
              .padStart(2, '0')}`,
            'transparent',
          ]}
          locations={[0, 0.6]}
        />
        <LinearGradient
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0.7 }}
          colors={[
            `${edgeColors.bottom}${Math.round(opacity * 255)
              .toString(16)
              .padStart(2, '0')}`,
            'transparent',
          ]}
          locations={[0, 0.4]}
        />
      </View>
      {children}
    </View>
  );
}
