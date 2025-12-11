import React, { createContext, useContext } from 'react';
import { themes, type Theme, catppuccin } from './index.ts';
import { useTodoStore } from '../store/useTodoStore.ts';

// Default theme used when context is not available
const defaultTheme = catppuccin;

const ThemeContext = createContext<Theme>(defaultTheme);

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  // Fallback to default theme if context value is somehow invalid
  return theme ?? defaultTheme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const currentThemeName = useTodoStore(state => state.currentTheme);
  const theme = themes[currentThemeName] || catppuccin;

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}
