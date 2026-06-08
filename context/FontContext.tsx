import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Font from 'expo-font';

interface FontOption {
  key: string;
  labelKey: string;
  fontFamily: string | undefined;
  customFont?: boolean;
}

export const FONT_OPTIONS: FontOption[] = [
  { key: 'system', labelKey: 'font.system', fontFamily: undefined },
  { key: 'inter', labelKey: 'Inter', fontFamily: 'Inter', customFont: true },
  { key: 'interBold', labelKey: 'Inter Bold', fontFamily: 'Inter-Bold', customFont: true },
  {
    key: 'playfair',
    labelKey: 'Playfair Display',
    fontFamily: 'PlayfairDisplay',
    customFont: true,
  },
  { key: 'jetbrains', labelKey: 'JetBrains Mono', fontFamily: 'JetBrainsMono', customFont: true },
  { key: 'nunito', labelKey: 'Nunito', fontFamily: 'Nunito', customFont: true },
  { key: 'poppins', labelKey: 'Poppins', fontFamily: 'Poppins', customFont: true },
  { key: 'poppinsBold', labelKey: 'Poppins Bold', fontFamily: 'Poppins-Bold', customFont: true },
  { key: 'monospace', labelKey: 'font.monospace', fontFamily: 'monospace' },
  { key: 'serif', labelKey: 'font.serif', fontFamily: 'serif' },
  { key: 'sansSerif', labelKey: 'font.sansSerif', fontFamily: 'sans-serif' },
  { key: 'rounded', labelKey: 'font.rounded', fontFamily: 'System' },
];

const CUSTOM_FONT_MAP: Record<string, any> = {
  Inter: require('../assets/fonts/Inter-Regular.ttf'),
  'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
  PlayfairDisplay: require('../assets/fonts/PlayfairDisplay-Regular.ttf'),
  JetBrainsMono: require('../assets/fonts/JetBrainsMono-Regular.ttf'),
  Nunito: require('../assets/fonts/Nunito-Regular.ttf'),
  Poppins: require('../assets/fonts/Poppins-Regular.ttf'),
  'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
};

interface FontContextType {
  fontKey: string;
  fontFamily: string | undefined;
  setFont: (key: string) => Promise<void>;
  fontOptions: typeof FONT_OPTIONS;
  fontsLoaded: boolean;
}

const FontContext = createContext<FontContextType | undefined>(undefined);

const STORAGE_KEY = '@lumora_font';

let _fontsLoadingStarted = false;

export function FontProvider({ children }: { children: ReactNode }) {
  const [fontKey, setFontKey] = useState('system');
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    loadFont();
    if (!_fontsLoadingStarted) {
      _fontsLoadingStarted = true;
      loadCustomFonts().then(() => setFontsLoaded(true));
    } else {
      setFontsLoaded(true);
    }
  }, []);

  async function loadCustomFonts() {
    try {
      await Font.loadAsync(CUSTOM_FONT_MAP);
    } catch (e) {
      console.warn('[FontContext]', e);
    }
  }

  async function loadFont() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setFontKey(stored);
      }
    } catch (e) {
      console.warn('[FontContext]', e);
    }
  }

  const setFont = useCallback(async (key: string) => {
    setFontKey(key);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, key);
    } catch (e) {
      console.warn('[FontContext]', e);
    }
  }, []);

  const option = FONT_OPTIONS.find((o) => o.key === fontKey) || FONT_OPTIONS[0];

  const contextValue = useMemo(
    () => ({
      fontKey,
      fontFamily: option.fontFamily,
      setFont,
      fontOptions: FONT_OPTIONS,
      fontsLoaded,
    }),
    [fontKey, option.fontFamily, setFont, fontsLoaded]
  );

  return <FontContext.Provider value={contextValue}>{children}</FontContext.Provider>;
}

export function useFont() {
  const context = useContext(FontContext);
  if (!context) {
    throw new Error('useFont must be used within a FontProvider');
  }
  return context;
}
