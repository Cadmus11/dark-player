import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { Animated, Easing } from 'react-native';
import { colorAwarenessEngine } from '../services/ColorAwarenessEngine';
import { usePlaybackStore } from '../stores/playbackStore';
import type { ArtworkColorState, ColorTheme, EdgeLightingColors, MoodType } from '../types';

interface ColorAwarenessContextType {
  state: ArtworkColorState;
  themeColors: ColorTheme;
  edgeColors: EdgeLightingColors;
  mood: MoodType;
  transitionAnim: Animated.Value;
  crossfadeProgress: Animated.AnimatedInterpolation<number>;
  triggerTransition: () => void;
  canUseArtwork: boolean;
}

const DEFAULT_STATE: ArtworkColorState = {
  artworkUri: null,
  rawPalette: null,
  theme: {
    primary: '#6c5ce7',
    secondary: '#a29bfe',
    accent: '#6c5ce7',
    background: '#1a1a2e',
    surface: '#16213e',
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255,255,255,0.7)',
  },
  isDark: true,
  blurStrength: 60,
  overlayOpacity: 0.3,
  edgeColors: { left: '#6c5ce7', right: '#a29bfe', bottom: '#6c5ce7' },
  mood: 'neutral',
};

const ColorAwarenessContext = createContext<ColorAwarenessContextType | undefined>(undefined);

export function ColorAwarenessProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ArtworkColorState>(() => colorAwarenessEngine.getState());
  const transitionAnim = useRef(new Animated.Value(0)).current;
  const currentFile = usePlaybackStore((s) => s.currentFile);

  const crossfadeProgress = transitionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  useEffect(() => {
    const unsub = colorAwarenessEngine.subscribe(() => {
      setState({ ...colorAwarenessEngine.getState() });
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (currentFile) {
      const artwork = currentFile.thumbnail || undefined;
      colorAwarenessEngine.extractFromArtwork(artwork || null, {
        artist: currentFile.artist,
        album: currentFile.album,
        genre: undefined,
      });
    }
  }, [currentFile?.uri]);

  const triggerTransition = () => {
    transitionAnim.setValue(0);
    Animated.timing(transitionAnim, {
      toValue: 1,
      duration: colorAwarenessEngine.getTransitionDuration(),
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      transitionAnim.setValue(0);
    });
  };

  const canUseArtwork = !!state.artworkUri;

  return (
    <ColorAwarenessContext.Provider
      value={{
        state,
        themeColors: state.theme,
        edgeColors: state.edgeColors,
        mood: state.mood,
        transitionAnim,
        crossfadeProgress,
        triggerTransition,
        canUseArtwork,
      }}>
      {children}
    </ColorAwarenessContext.Provider>
  );
}

export function useColorAwareness() {
  const context = useContext(ColorAwarenessContext);
  if (!context) {
    throw new Error('useColorAwareness must be used within a ColorAwarenessProvider');
  }
  return context;
}
