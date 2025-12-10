import React, { ReactNode } from 'react';
import { useTheme } from '../themes/ThemeContext.tsx';

interface HeaderProps {
  children: ReactNode;
}

export function Header({ children }: HeaderProps) {
  const theme = useTheme();

  return (
    <box borderStyle="single" borderColor={theme.colors.border} padding={1}>
      <text color={theme.colors.highlight}>{children}</text>
    </box>
  );
}

interface FooterProps {
  children: ReactNode;
}

export function Footer({ children }: FooterProps) {
  const theme = useTheme();

  return (
    <box borderStyle="single" borderColor={theme.colors.border} padding={1}>
      <text color={theme.colors.textDim}>{children}</text>
    </box>
  );
}

interface MainContentProps {
  children: ReactNode;
}

export function MainContent({ children }: MainContentProps) {
  return (
    <box flexGrow={1} padding={1} flexDirection="column">
      {children}
    </box>
  );
}

interface AppContainerProps {
  children: ReactNode;
}

export function AppContainer({ children }: AppContainerProps) {
  const theme = useTheme();

  return (
    <box flexDirection="column" width="100%" height="100%" backgroundColor={theme.colors.background}>
      {children}
    </box>
  );
}
