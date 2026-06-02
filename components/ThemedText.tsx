import React, { type ReactNode } from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

type TextVariant = 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label' | 'muted';

interface ThemedTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  children: ReactNode;
}

const variantStyles: Record<TextVariant, TextStyle> = {
  h1: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  h3: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 20 },
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },
  muted: { fontSize: 12, fontWeight: '400' },
};

export function ThemedText({ variant = 'body', color, style, children, ...props }: ThemedTextProps) {
  const { textColor, mutedColor } = useTheme();
  const baseColor = color || (variant === 'muted' || variant === 'caption' ? mutedColor : textColor);
  return (
    <Text style={[{ color: baseColor }, variantStyles[variant], style]} {...props}>
      {children}
    </Text>
  );
}
