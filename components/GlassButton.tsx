import React from 'react';
import { TouchableOpacity, Text, type ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

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
  const { primaryColor, isDarkMode, textColor } = useTheme();
  const sizeStyles = {
    sm: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14 },
    md: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 18 },
    lg: { paddingHorizontal: 32, paddingVertical: 18, borderRadius: 22 },
  };

  const variantStyles = {
    glass: {
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
      borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    },
    neon: {
      backgroundColor: primaryColor,
      borderColor: primaryColor,
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
      className="flex-row items-center justify-center"
      style={[
        {
          borderWidth: 1,
          ...sizeStyles[size],
          ...variantStyles[variant],
        },
        variant === 'neon' && {
          shadowColor: primaryColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 6,
        },
        style,
      ]}>
      {icon && (
        <Text
          className="mr-2 text-lg"
          style={variant === 'neon' ? { color: isDarkMode ? '#06060B' : '#ffffff' } : undefined}>
          {icon}
        </Text>
      )}
      <Text
        className="font-semibold"
        style={[
          size === 'sm' && { fontSize: 13 },
          size === 'lg' && { fontSize: 17 },
          variant === 'glass' && { color: textColor },
          variant === 'neon' && { color: isDarkMode ? '#06060B' : '#ffffff', fontWeight: '700' },
          variant === 'ghost' && { color: primaryColor },
        ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}
