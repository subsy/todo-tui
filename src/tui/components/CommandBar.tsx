import React, { useState } from 'react';
import { useKeyboard } from '@opentui/react';
import { useTheme } from '../themes/ThemeContext.tsx';

interface CommandBarProps {
  prompt: string;
  defaultValue?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  onChange?: (value: string) => void;
}

export function CommandBar({ prompt, defaultValue = '', onSubmit, onCancel, onChange }: CommandBarProps) {
  const [value, setValue] = useState(defaultValue);
  const [cursorPos, setCursorPos] = useState(defaultValue.length);
  const theme = useTheme();

  useKeyboard((key: any) => {
    const keyName = key.name || key.char;

    if (keyName === 'return' || keyName === 'enter') {
      onSubmit(value);
    } else if (keyName === 'escape') {
      onCancel();
    } else if (keyName === 'backspace') {
      if (cursorPos > 0) {
        const newValue = value.slice(0, cursorPos - 1) + value.slice(cursorPos);
        setValue(newValue);
        setCursorPos(cursorPos - 1);
        onChange?.(newValue);
      }
    } else if (keyName === 'delete') {
      if (cursorPos < value.length) {
        const newValue = value.slice(0, cursorPos) + value.slice(cursorPos + 1);
        setValue(newValue);
        onChange?.(newValue);
      }
    } else if (keyName === 'left') {
      if (cursorPos > 0) {
        setCursorPos(cursorPos - 1);
      }
    } else if (keyName === 'right') {
      if (cursorPos < value.length) {
        setCursorPos(cursorPos + 1);
      }
    } else if (keyName === 'home') {
      setCursorPos(0);
    } else if (keyName === 'end') {
      setCursorPos(value.length);
    } else if (key.char && key.char.length === 1 && !key.ctrl && !key.meta) {
      // Printable character
      const newValue = value.slice(0, cursorPos) + key.char + value.slice(cursorPos);
      setValue(newValue);
      setCursorPos(cursorPos + 1);
      onChange?.(newValue);
    }
  });

  // Render value with cursor
  const beforeCursor = value.slice(0, cursorPos);
  const atCursor = value[cursorPos] || ' ';
  const afterCursor = value.slice(cursorPos + 1);

  return (
    <box
      borderStyle="single"
      borderColor={theme.colors.highlight}
      padding={1}
    >
      <box flexDirection="row">
        <text color={theme.colors.highlight}>{prompt} </text>
        <text color={theme.colors.text}>{beforeCursor}</text>
        <text color={theme.colors.background} backgroundColor={theme.colors.text}>{atCursor}</text>
        <text color={theme.colors.text}>{afterCursor}</text>
      </box>
      <text color={theme.colors.muted}>Enter to save, ESC to cancel</text>
    </box>
  );
}
