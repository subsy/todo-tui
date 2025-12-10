import React, { createContext, useContext } from 'react';
import { themes, type Theme, catppuccin } from './index.ts';
import { useTodoStore } from '../store/useTodoStore.ts';

const ThemeContext = createContext<Theme>(catppuccin);

export function useTheme(): Theme {
  return useContext(ThemeContext);
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
