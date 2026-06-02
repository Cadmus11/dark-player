import React, { useRef } from 'react';
import { View, Animated, Easing, type ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ThemedText } from './ThemedText';
import { GlassButton } from './GlassButton';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function EmptyState({ icon, title, description, actionLabel, onAction, style }: EmptyStateProps) {
  const { mutedColor } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.85, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <View className="items-center justify-center px-8 py-[100px]" style={style}>
      <Animated.View style={{ opacity: pulseAnim, transform: [{ scale: pulseAnim }] }}>
        <View className="mb-5 h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: `${mutedColor}15` }}>
          {icon}
        </View>
      </Animated.View>
      <ThemedText variant="h3" style={{ textAlign: 'center', marginBottom: 6 }}>{title}</ThemedText>
      {description && (
        <ThemedText variant="caption" style={{ textAlign: 'center', maxWidth: 260, marginBottom: actionLabel ? 20 : 0 }}>
          {description}
        </ThemedText>
      )}
      {actionLabel && onAction && (
        <GlassButton title={actionLabel} onPress={onAction} variant="neon" size="sm" />
      )}
    </View>
  );
}
