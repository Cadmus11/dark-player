import { useState, useEffect } from 'react';
import { getColors } from 'react-native-image-colors';
import { hexToLuminance, contrastRatio, adjustBrightness, parseHex } from '../utils/color';

export interface ArtworkPalette {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  isDark: boolean;
  textColor: string;
  accentColor: string;
}

function bestTextColor(bg: string): string {
  const bgLum = hexToLuminance(bg);
  const whiteLum = hexToLuminance('#ffffff');
  return contrastRatio(whiteLum, bgLum) >= 4.5 ? '#ffffff' : '#000000';
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
