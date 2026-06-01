import React, { useRef, useEffect, type ReactNode } from 'react';
import { Animated, type ViewStyle } from 'react-native';
import { useColorAwareness } from '../context/ColorAwarenessContext';

interface ArtworkGlowProps {
  children: ReactNode;
  color?: string;
  radius?: number;
  pulseInterval?: number;
  style?: ViewStyle;
  animated?: boolean;
}

export function ArtworkGlow({
  children,
  color,
  radius = 40,
  pulseInterval = 4000,
  style,
  animated = true,
}: ArtworkGlowProps) {
  const { state } = useColorAwareness();
  const glowAnim = useRef(new Animated.Value(0)).current;

  const glowColor = color || state.theme.accent;

  useEffect(() => {
    if (!animated) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: pulseInterval * 0.4,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: pulseInterval * 0.6,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [glowAnim, pulseInterval, animated]);

  const shadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <Animated.View
      style={[
        {
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: animated ? shadowOpacity : 0.35,
          shadowRadius: radius,
          elevation: 16,
        },
        style,
      ]}>
      {children}
    </Animated.View>
  );
}
