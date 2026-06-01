import { useState, useEffect } from 'react';
import { getColors } from 'react-native-image-colors';

export interface ArtworkPalette {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  isDark: boolean;
  textColor: string;
  accentColor: string;
}

function hexToLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function bestTextColor(bg: string): string {
  const bgLum = hexToLuminance(bg);
  const whiteLum = hexToLuminance('#ffffff');
  return contrastRatio(whiteLum, bgLum) >= 4.5 ? '#ffffff' : '#000000';
}

function adjustBrightness(hex: string, amount: number): string {
  const r = Math.min(255, Math.max(0, parseInt(hex.slice(1, 3), 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(hex.slice(3, 5), 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(hex.slice(5, 7), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function parseHex(color: string): string {
  if (!color || color === '#000000') return '#1a1a2e';
  if (color.startsWith('#')) return color;
  return `#${color}`;
}

const FALLBACK: ArtworkPalette = {
  primary: '#6c5ce7',
  secondary: '#a29bfe',
  background: '#1a1a2e',
  surface: '#16213e',
  isDark: true,
  textColor: '#ffffff',
  accentColor: '#6c5ce7',
};

export function useArtworkColors(artworkUri: string | null | undefined): ArtworkPalette {
  const [palette, setPalette] = useState<ArtworkPalette>(FALLBACK);

  useEffect(() => {
    if (!artworkUri) {
      setPalette(FALLBACK);
      return;
    }

    let cancelled = false;

    getColors(artworkUri, {
      fallback: '#1a1a2e',
      quality: 'low',
      pixelSpacing: 5,
    })
      .then((colors) => {
        if (cancelled) return;

        let primary: string;
        let secondary: string;
        let bg: string;
        let det: string;

        if (colors.platform === 'ios') {
          primary = parseHex(colors.primary);
          secondary = parseHex(colors.secondary);
          bg = parseHex(colors.background);
          det = parseHex(colors.detail);
        } else {
          primary = parseHex(colors.vibrant || colors.dominant);
          secondary = parseHex(colors.muted || colors.lightVibrant || primary);
          bg = parseHex(colors.darkMuted || colors.darkVibrant || '#1a1a2e');
          det = parseHex(colors.lightVibrant || colors.vibrant || primary);
        }

        const isDark = hexToLuminance(bg) < 0.3;
        const textColor = bestTextColor(isDark ? bg : adjustBrightness(bg, 40));
        const surface = isDark ? adjustBrightness(bg, 15) : adjustBrightness(bg, -20);
        const accentColor = det !== '#1a1a2e' ? det : primary;
        const accent =
          hexToLuminance(accentColor) < 0.15 ? adjustBrightness(accentColor, 60) : accentColor;

        setPalette({
          primary,
          secondary,
          background: bg,
          surface,
          isDark,
          textColor,
          accentColor: accent,
        });
      })
      .catch(() => {
        if (!cancelled) setPalette(FALLBACK);
      });

    return () => {
      cancelled = true;
    };
  }, [artworkUri]);

  return palette;
}
