import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LanguageCode } from '../i18n/languages';
import { getTranslation, translate as translateWithValues, LANGUAGES } from '../i18n/languages';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => Promise<void>;
  t: (key: string, values?: Record<string, string | number>) => string;
  languages: typeof LANGUAGES;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = '@lumora_language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>('en');

  useEffect(() => {
    loadLanguage();
  }, []);

  async function loadLanguage() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setLanguageState(stored as LanguageCode);
      }
    } catch (e) {
      console.warn('[LanguageContext]', e);
    }
  }

  const setLanguage = useCallback(async (code: LanguageCode) => {
    setLanguageState(code);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, code);
    } catch (e) {
      console.warn('[LanguageContext]', e);
    }
  }, []);

  const t = useCallback((key: string, values?: Record<string, string | number>): string => {
    const translations = getTranslation(language);
    const template = translations[key];
    if (!template) return key;
    return translateWithValues(template, values);
  }, [language]);

  const contextValue = useMemo(() => ({ language, setLanguage, t, languages: LANGUAGES }), [language, setLanguage, t]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
