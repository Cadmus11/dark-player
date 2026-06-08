import { getColors } from 'react-native-image-colors';
import type {
  RawArtworkPalette,
  ColorTheme,
  MoodType,
  ArtworkColorState,
  EdgeLightingColors,
} from '../types';

function hexToLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function adjustBrightness(hex: string, amount: number): string {
  const r = Math.min(255, Math.max(0, parseInt(hex.slice(1, 3), 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(hex.slice(3, 5), 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(hex.slice(5, 7), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function parseHex(color: string | undefined | null, fallback: string): string {
  if (!color || color === '#000000') return fallback;
  if (color.startsWith('#')) return color;
  return `#${color}`;
}

function computeEdgeColors(theme: ColorTheme, isDark: boolean): EdgeLightingColors {
  return {
    left: theme.primary,
    right: theme.secondary,
    bottom: theme.accent,
  };
}

function computeBlurStrength(luminance: number): number {
  return luminance > 0.4 ? 80 : 50;
}

function computeOverlayOpacity(luminance: number): number {
  return luminance > 0.4 ? 0.45 : 0.2;
}

function detectMood(genre?: string, theme?: ColorTheme): MoodType {
  if (!genre && !theme) return 'neutral';
  const g = (genre || '').toLowerCase();
  if (/edm|dubstep|techno|house|electronic|drum|bass|trance/i.test(g)) return 'energetic';
  if (/classical|ambient|chill|lo-fi|study|sleep|acoustic|folk/i.test(g)) return 'calm';
  if (/blues|jazz|soul|rnb|slow/i.test(g)) return 'melancholic';
  if (/pop|dance|happy|disco|funk/i.test(g)) return 'happy';
  if (/metal|rock|punk|hardcore|heavy|industrial/i.test(g)) return 'dark';
  if (/hip-hop|rap|trap|reggae|reggaeton/i.test(g)) return 'upbeat';
  return 'neutral';
}

const FALLBACK_THEME: ColorTheme = {
  primary: '#6c5ce7',
  secondary: '#a29bfe',
  accent: '#6c5ce7',
  background: '#1a1a2e',
  surface: '#16213e',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.7)',
};

const FALLBACK_STATE: ArtworkColorState = {
  artworkUri: null,
  rawPalette: null,
  theme: FALLBACK_THEME,
  isDark: true,
  blurStrength: 60,
  overlayOpacity: 0.3,
  edgeColors: { left: '#6c5ce7', right: '#a29bfe', bottom: '#6c5ce7' },
  mood: 'neutral',
};

class ColorAwarenessEngineClass {
  private static instance: ColorAwarenessEngineClass;
  private _state: ArtworkColorState = { ...FALLBACK_STATE };
  private _listeners = new Set<() => void>();
  private _extractInProgress = false;

  static getInstance(): ColorAwarenessEngineClass {
    if (!ColorAwarenessEngineClass.instance) {
      ColorAwarenessEngineClass.instance = new ColorAwarenessEngineClass();
    }
    return ColorAwarenessEngineClass.instance;
  }

  getState(): ArtworkColorState {
    return this._state;
  }

  subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private _notify() {
    this._listeners.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
  }

  async extractFromArtwork(
    artworkUri: string | null,
    metadata?: { artist?: string; album?: string; genre?: string }
  ): Promise<void> {
    if (this._extractInProgress) return;
    this._extractInProgress = true;

    try {
      if (!artworkUri) {
        this._state = { ...FALLBACK_STATE };
        this._notify();
        return;
      }

      if (this._state.artworkUri === artworkUri) return;

      let rawPalette: RawArtworkPalette = {};
      const colors = await getColors(artworkUri, {
        fallback: '#1a1a2e',
        quality: 'low',
        pixelSpacing: 5,
      });

      if (colors.platform === 'ios') {
        rawPalette = {
          primary: parseHex(colors.primary, '#6c5ce7'),
          secondary: parseHex(colors.secondary, '#a29bfe'),
          background: parseHex(colors.background, '#1a1a2e'),
          detail: parseHex(colors.detail, '#6c5ce7'),
        };
      } else {
        rawPalette = {
          dominant: parseHex(colors.dominant, '#1a1a2e'),
          vibrant: parseHex(colors.vibrant, '#6c5ce7'),
          darkVibrant: parseHex(colors.darkVibrant, '#1a1a2e'),
          lightVibrant: parseHex(colors.lightVibrant, '#a29bfe'),
          muted: parseHex(colors.muted, '#16213e'),
          darkMuted: parseHex(colors.darkMuted, '#1a1a2e'),
          lightMuted: parseHex(colors.lightMuted, '#a29bfe'),
        };
      }

      const primary = rawPalette.vibrant || rawPalette.primary || '#6c5ce7';
      const secondary =
        rawPalette.lightVibrant || rawPalette.secondary || rawPalette.muted || primary;
      const bg = rawPalette.darkMuted || rawPalette.background || rawPalette.dominant || '#1a1a2e';
      const det = rawPalette.lightVibrant || rawPalette.detail || rawPalette.vibrant || primary;

      const isDark = hexToLuminance(bg) < 0.3;

      const theme: ColorTheme = {
        primary,
        secondary,
        accent: det !== '#1a1a2e' ? det : primary,
        background: bg,
        surface: isDark ? adjustBrightness(bg, 15) : adjustBrightness(bg, -20),
        textPrimary: isDark ? '#ffffff' : '#000000',
        textSecondary: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
      };

      const bgLum = hexToLuminance(bg);
      const blurStrength = computeBlurStrength(bgLum);
      const overlayOpacity = computeOverlayOpacity(bgLum);
      const edgeColors = computeEdgeColors(theme, isDark);
      const mood = detectMood(metadata?.genre, theme);

      this._state = {
        artworkUri,
        rawPalette,
        theme,
        isDark,
        blurStrength,
        overlayOpacity,
        edgeColors,
        mood,
        genre: metadata?.genre,
      };

      this._notify();
    } catch {
      this._state = { ...FALLBACK_STATE, artworkUri };
      this._notify();
    } finally {
      this._extractInProgress = false;
    }
  }

  get themeColors(): ColorTheme {
    return this._state.theme;
  }

  get edgeColors(): EdgeLightingColors {
    return this._state.edgeColors;
  }

  get mood(): MoodType {
    return this._state.mood;
  }

  reset(): void {
    this._state = { ...FALLBACK_STATE };
    this._listeners.clear();
    this._extractInProgress = false;
  }

  resetToBackground(bgHex: string): void {
    this._extractInProgress = false;
    const bg = parseHex(bgHex, '#1a1a2e');
    const isDark = hexToLuminance(bg) < 0.3;
    const adjusted = isDark ? adjustBrightness(bg, 30) : adjustBrightness(bg, -30);
    const theme: ColorTheme = {
      primary: adjusted,
      secondary: isDark ? adjustBrightness(bg, 50) : adjustBrightness(bg, -50),
      accent: adjusted,
      background: bg,
      surface: isDark ? adjustBrightness(bg, 15) : adjustBrightness(bg, -20),
      textPrimary: isDark ? '#ffffff' : '#000000',
      textSecondary: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
    };
    this._state = {
      artworkUri: null,
      rawPalette: null,
      theme,
      isDark,
      blurStrength: computeBlurStrength(hexToLuminance(bg)),
      overlayOpacity: computeOverlayOpacity(hexToLuminance(bg)),
      edgeColors: computeEdgeColors(theme, isDark),
      mood: 'neutral',
    };
    this._notify();
  }

  getTransitionDuration(): number {
    const mood = this._state.mood;
    if (mood === 'calm' || mood === 'melancholic') return 800;
    if (mood === 'energetic' || mood === 'upbeat') return 400;
    return 600;
  }

  shouldReduceMotion(): boolean {
    return this._state.mood === 'calm' || this._state.mood === 'melancholic';
  }
}

export const colorAwarenessEngine = ColorAwarenessEngineClass.getInstance();
