import React, { useEffect, useRef } from 'react';
import { View, Animated, type ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface SkeletonLoaderProps {
  width?: number;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  color?: string;
}

export function SkeletonLoader({
  width = 300,
  height = 20,
  borderRadius = 8,
  style,
  color,
}: SkeletonLoaderProps) {
  const { mutedColor } = useTheme();
  const skeletonColor = color || mutedColor;
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: skeletonColor, opacity }, style]}
    />
  );
}

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View className="w-[120] items-center p-3.5" style={style}>
      <SkeletonLoader width={44} height={44} borderRadius={14} />
      <SkeletonLoader width={84} height={14} style={{ marginTop: 10 }} />
      <SkeletonLoader width={48} height={10} style={{ marginTop: 4 }} />
    </View>
  );
}

export function SkeletonRow({ style }: { style?: ViewStyle }) {
  return (
    <View className="flex-row items-center gap-3 py-2.5" style={style}>
      <SkeletonLoader width={40} height={40} borderRadius={10} />
      <View className="flex-1 gap-1">
        <SkeletonLoader width={240} height={14} />
        <SkeletonLoader width={150} height={10} />
      </View>
    </View>
  );
}
