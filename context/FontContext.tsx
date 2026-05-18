import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FontOption {
  key: string;
  labelKey: string;
  fontFamily: string | undefined;
}

export const FONT_OPTIONS: FontOption[] = [
  { key: 'system', labelKey: 'font.system', fontFamily: undefined },
  { key: 'monospace', labelKey: 'font.monospace', fontFamily: 'monospace' },
  { key: 'serif', labelKey: 'font.serif', fontFamily: 'serif' },
  { key: 'sansSerif', labelKey: 'font.sansSerif', fontFamily: 'sans-serif' },
  { key: 'rounded', labelKey: 'font.rounded', fontFamily: 'System' },
];

interface FontContextType {
  fontKey: string;
  fontFamily: string | undefined;
  setFont: (key: string) => Promise<void>;
  fontOptions: typeof FONT_OPTIONS;
}

const FontContext = createContext<FontContextType | undefined>(undefined);

const STORAGE_KEY = '@lumora_font';

export function FontProvider({ children }: { children: ReactNode }) {
  const [fontKey, setFontKey] = useState('system');

  useEffect(() => {
    loadFont();
  }, []);

  async function loadFont() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setFontKey(stored);
      }
    } catch {}
  }

  async function setFont(key: string) {
    setFontKey(key);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, key);
    } catch {}
  }

  const option = FONT_OPTIONS.find((o) => o.key === fontKey) || FONT_OPTIONS[0];

  return (
    <FontContext.Provider value={{ fontKey, fontFamily: option.fontFamily, setFont, fontOptions: FONT_OPTIONS }}>
      {children}
    </FontContext.Provider>
  );
}

export function useFont() {
  const context = useContext(FontContext);
  if (!context) {
    throw new Error('useFont must be used within a FontProvider');
  }
  return context;
}
