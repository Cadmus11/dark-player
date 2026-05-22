import React from 'react';
import {
  TouchableOpacity,
  Text,
  type ViewStyle,
} from 'react-native';

interface GlassButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'glass' | 'neon' | 'ghost';
  icon?: string;
  style?: ViewStyle;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export function GlassButton({
  title,
  onPress,
  variant = 'glass',
  icon,
  style,
  size = 'md',
  disabled,
}: GlassButtonProps) {
  const sizeStyles = {
    sm: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14 },
    md: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 18 },
    lg: { paddingHorizontal: 32, paddingVertical: 18, borderRadius: 22 },
  };

  const variantStyles = {
    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
      borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    neon: {
      backgroundColor: '#C2FC4A',
      borderColor: '#C2FC4A',
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
    },
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className="flex-row items-center justify-center border"
      style={[
        {
          ...sizeStyles[size],
          ...variantStyles[variant],
        },
        variant === 'neon' && {
          shadowColor: '#C2FC4A',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 6,
        },
        style,
      ]}
    >
      {icon && <Text className="text-lg mr-2" style={variant === 'neon' ? { color: '#06060B' } : undefined}>{icon}</Text>}
      <Text
        className="font-semibold"
        style={[
          size === 'sm' && { fontSize: 13 },
          size === 'lg' && { fontSize: 17 },
          variant === 'glass' && { color: '#ffffff' },
          variant === 'neon' && { color: '#06060B', fontWeight: '700' },
          variant === 'ghost' && { color: '#C2FC4A' },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}
