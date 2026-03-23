
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  brandColor: string;
  setBrandColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const defaultBrandColor = '#2563eb';
  const legacyDefaultBrandColors = new Set(['#6366f1', '#818cf8', '#4f46e5']);
  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }
    // Default to dark mode as per user request
    return 'dark';
  });

  const [brandColor, setBrandColorState] = useState<string>(() => {
      const storedBrandColor = localStorage.getItem('brandColor');
      if (!storedBrandColor || legacyDefaultBrandColors.has(storedBrandColor)) {
        return defaultBrandColor;
      }
      return storedBrandColor;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Apply brand color to CSS variables
  useEffect(() => {
      const root = document.documentElement;
      root.style.setProperty('--primary-color', brandColor);
      localStorage.setItem('brandColor', brandColor);
  }, [brandColor]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const setBrandColor = (color: string) => {
      setBrandColorState(color);
  }

  const value = {
    theme,
    toggleTheme,
    brandColor,
    setBrandColor
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
