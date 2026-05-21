import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, type ViewStyle } from 'react-native';

interface SkeletonLoaderProps {
  width?: number;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonLoader({ width = 300, height = 20, borderRadius = 8, style }: SkeletonLoaderProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: '#27272a', opacity }, style]}
    />
  );
}

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      <SkeletonLoader width={44} height={44} borderRadius={14} />
      <SkeletonLoader width={84} height={14} style={{ marginTop: 10 }} />
      <SkeletonLoader width={48} height={10} style={{ marginTop: 4 }} />
    </View>
  );
}

export function SkeletonRow({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.row, style]}>
      <SkeletonLoader width={40} height={40} borderRadius={10} />
      <View style={{ flex: 1, gap: 4 }}>
        <SkeletonLoader width={240} height={14} />
        <SkeletonLoader width={150} height={10} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 120,
    padding: 14,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
});
