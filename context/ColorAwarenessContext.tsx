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
import { useAudioEngine } from '../hooks/useAudioEngine';
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

const ColorAwarenessContext = createContext<ColorAwarenessContextType | undefined>(undefined);

export function ColorAwarenessProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ArtworkColorState>(() => colorAwarenessEngine.getState());
  const transitionAnim = useRef(new Animated.Value(0)).current;
  const currentFile = useAudioEngine((s) => s.currentFile);

  const crossfadeProgress = transitionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  useEffect(() => {
    let prev = colorAwarenessEngine.getState();
    const unsub = colorAwarenessEngine.subscribe(() => {
      const next = colorAwarenessEngine.getState();
      if (next.artworkUri !== prev.artworkUri || next.theme?.primary !== prev.theme?.primary) {
        setState({ ...next });
        prev = next;
      }
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
  }, [currentFile?.uri, currentFile]);

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
