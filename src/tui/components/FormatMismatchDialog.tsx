import React, { useMemo, useCallback } from 'react';
import { useKeyboard } from '@opentui/react';
import { useTodoStore, PriorityMode } from '../store/useTodoStore.ts';
import { useTheme } from '../themes/ThemeContext.tsx';

interface FormatMismatchDialogProps {
  filePath?: string;
}

export function FormatMismatchDialog({ filePath }: FormatMismatchDialogProps) {
  const theme = useTheme();
  const detectedFormat = useTodoStore(state => state.detectedFormat);
  const priorityMode = useTodoStore(state => state.priorityMode);
  const hideFormatMismatch = useTodoStore(state => state.hideFormatMismatch);
  const convertTasksToFormat = useTodoStore(state => state.convertTasksToFormat);
  const setPriorityMode = useTodoStore(state => state.setPriorityMode);

  const [selectedOption, setSelectedOption] = React.useState(0);

  // For mixed format, we can't determine a single file format
  // User must choose which format to convert to or ignore
  const isMixed = detectedFormat === 'mixed';
  const fileFormat = detectedFormat === 'letter' ? 'letter' : 'number';
  const settingsFormat = priorityMode;

  // Memoize options to prevent recreating on every render
  const options = useMemo(() => isMixed
    ? [
        {
          label: `Convert all to letter priorities (A-Z)`,
          description: 'Convert number priorities to letters (0→A, 1→B, etc.)',
        },
        {
          label: `Convert all to number priorities (0-9)`,
          description: 'Convert letter priorities to numbers (A→0, B→1, etc.)',
        },
        {
          label: 'Ignore (keep mixed)',
          description: 'Leave the file as-is with mixed priority formats',
        },
      ]
    : [
        {
          label: `Convert file to ${settingsFormat} priorities`,
          description: `Change all ${fileFormat} priorities (${fileFormat === 'letter' ? 'A-Z' : '0-9'}) to ${settingsFormat} (${settingsFormat === 'letter' ? 'A-Z' : '0-9'})`,
        },
        {
          label: `Switch to ${fileFormat} priority mode`,
          description: `Update your settings to use ${fileFormat} priorities (${fileFormat === 'letter' ? 'A-Z' : '0-9'})`,
        },
        {
          label: 'Ignore (keep both)',
          description: 'Leave the file as-is and continue with current settings',
        },
      ], [isMixed, settingsFormat, fileFormat]);

  // Memoize action handler to ensure stable reference
  const handleAction = useCallback((index: number) => {
    if (isMixed) {
      if (index === 0) {
        void convertTasksToFormat('letter', filePath);
      } else if (index === 1) {
        void convertTasksToFormat('number', filePath);
      } else {
        hideFormatMismatch();
      }
    } else {
      if (index === 0) {
        void convertTasksToFormat(settingsFormat, filePath);
      } else if (index === 1) {
        setPriorityMode(fileFormat as PriorityMode);
        hideFormatMismatch();
      } else {
        hideFormatMismatch();
      }
    }
  }, [isMixed, settingsFormat, fileFormat, filePath, convertTasksToFormat, setPriorityMode, hideFormatMismatch]);

  useKeyboard((key: any) => {
    const keyName = key.name || key.char;

    if (keyName === 'up' || keyName === 'k') {
      setSelectedOption(prev => Math.max(0, prev - 1));
    } else if (keyName === 'down' || keyName === 'j') {
      setSelectedOption(prev => Math.min(options.length - 1, prev + 1));
    } else if (keyName === 'return' || keyName === 'enter') {
      handleAction(selectedOption);
    } else if (keyName === 'escape' || keyName === 'q') {
      hideFormatMismatch();
    } else if (keyName === '1') {
      handleAction(0);
    } else if (keyName === '2') {
      handleAction(1);
    } else if (keyName === '3') {
      handleAction(2);
    }
  });

  const formatLabel = detectedFormat === 'mixed' ? 'mixed (both letter and number)' : fileFormat;

  return (
    <box
      flexDirection="column"
      borderStyle="double"
      borderColor={theme.colors.warning}
      paddingX={2}
      paddingY={1}
    >
      <text fg={theme.colors.warning} bold>Priority Format Mismatch</text>
      <text> </text>
      <text fg={theme.colors.text}>
        The file uses {formatLabel} priorities, but your settings use {settingsFormat}.
      </text>
      <text> </text>
      <text fg={theme.colors.context}>How would you like to proceed?</text>
      <text> </text>

      {options.map((option, index) => {
        const isSelected = index === selectedOption;
        const prefix = isSelected ? '>' : ' ';
        const fg = isSelected ? theme.colors.highlight : theme.colors.text;

        return (
          <box key={index} flexDirection="column">
            <text fg={fg}>
              {prefix} [{index + 1}] {option.label}
            </text>
            <text fg={theme.colors.context} marginLeft={4}>
                {option.description}
            </text>
          </box>
        );
      })}

      <text> </text>
      <text fg={theme.colors.context}>
        j/k or arrows to navigate, Enter to select, Esc to ignore
      </text>
    </box>
  );
}
