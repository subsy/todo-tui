import React from 'react';
import { themes, themeNames, type Theme } from '../themes/index.ts';
import { useTodoStore } from '../store/useTodoStore.ts';
import { useKeyboard } from '@opentui/react';

interface ThemeSelectorProps {
  onClose: () => void;
  onSelect: (themeName: string) => void;
  currentTheme: string;
}

function ColorSwatch({ color, label }: { color: string; label?: string }) {
  return (
    <text backgroundColor={color} color={color === '#1e1e2e' || color === '#282a36' || color === '#2e3440' || color === '#282828' || color === '#1a1b26' || color === '#002b36' || color === '#282c34' || color === '#2d2a2e' ? 'white' : 'black'}>
      {label || '██'}
    </text>
  );
}

function ThemePreview({ theme, isSelected }: { theme: Theme; isSelected: boolean }) {
  const c = theme.colors;

  return (
    <box flexDirection="row">
      <text color={isSelected ? 'yellow' : 'white'}>{isSelected ? '> ' : '  '}</text>
      <text color={isSelected ? 'yellow' : 'white'} bold={isSelected}>
        {theme.name.padEnd(14)}
      </text>
      <ColorSwatch color={c.priorityHigh} />
      <ColorSwatch color={c.priorityMedium} />
      <ColorSwatch color={c.priorityLow} />
      <text> </text>
      <ColorSwatch color={c.success} />
      <ColorSwatch color={c.highlight} />
      <text> </text>
      <ColorSwatch color={c.project} />
      <ColorSwatch color={c.context} />
      <ColorSwatch color={c.date} />
      <text> </text>
      <ColorSwatch color={c.text} />
      <ColorSwatch color={c.border} />
    </box>
  );
}

export function ThemeSelector({ onClose, onSelect, currentTheme }: ThemeSelectorProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(
    themeNames.indexOf(currentTheme) >= 0 ? themeNames.indexOf(currentTheme) : 0
  );

  useKeyboard((key: any) => {
    const keyName = key.name || key.char;

    if (keyName === 'escape' || keyName === 'q') {
      onClose();
      return;
    }

    if (keyName === 'up' || keyName === 'k') {
      setSelectedIndex(prev => Math.max(0, prev - 1));
      return;
    }

    if (keyName === 'down' || keyName === 'j') {
      setSelectedIndex(prev => Math.min(themeNames.length - 1, prev + 1));
      return;
    }

    if (keyName === 'return' || keyName === 'enter') {
      onSelect(themeNames[selectedIndex]!);
      onClose();
      return;
    }
  });

  return (
    <box flexDirection="column" padding={2}>
      <text color="yellow" bold>Select Theme</text>
      <text> </text>

      <box flexDirection="row">
        <text color="gray">{'              '.padEnd(14)}</text>
        <text color="gray">Pri </text>
        <text color="gray">  UI </text>
        <text color="gray">  Tags </text>
        <text color="gray">  Base</text>
      </box>
      <text> </text>

      {themeNames.map((name, index) => (
        <ThemePreview
          key={name}
          theme={themes[name]!}
          isSelected={index === selectedIndex}
        />
      ))}

      <text> </text>
      <text color="gray">↑/↓ or j/k to navigate • Enter to select • ESC to cancel</text>
      <text color="gray">Current theme: {themes[currentTheme]?.name || currentTheme}</text>
    </box>
  );
}
