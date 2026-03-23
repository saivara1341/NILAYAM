
import React, { createContext, useContext, useState, useEffect } from 'react';
import { LanguageCode } from '../types';
import { TRANSLATIONS } from '@/constants/translations';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log("LANGUAGE_CONTEXT: Initializing...");
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const stored = localStorage.getItem('app_language');
    return (stored as LanguageCode) || 'en';
  });

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
    document.documentElement.lang = lang;
  };

  // Translation helper function
  const value = {
    language,
    setLanguage,
    t: (key: string) => {
      const translation = TRANSLATIONS[language]?.[key] || TRANSLATIONS.en?.[key] || key;
      if (!TRANSLATIONS[language]?.[key] && !TRANSLATIONS.en?.[key]) {
        console.warn(`LanguageContext: Missing translation key "${key}" for language "${language}" and English fallback`);
      }
      return translation;
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
