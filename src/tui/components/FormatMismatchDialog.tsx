import React from 'react';
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

  // Determine what options to show based on detected format
  const fileFormat = detectedFormat === 'letter' ? 'letter' : 'number';
  const settingsFormat = priorityMode;

  const options = [
    {
      label: `Convert file to ${settingsFormat} priorities`,
      description: `Change all ${fileFormat} priorities (${fileFormat === 'letter' ? 'A-Z' : '0-9'}) to ${settingsFormat} (${settingsFormat === 'letter' ? 'A-Z' : '0-9'})`,
      action: async () => {
        await convertTasksToFormat(settingsFormat, filePath);
      },
    },
    {
      label: `Switch to ${fileFormat} priority mode`,
      description: `Update your settings to use ${fileFormat} priorities (${fileFormat === 'letter' ? 'A-Z' : '0-9'})`,
      action: () => {
        setPriorityMode(fileFormat as PriorityMode);
        hideFormatMismatch();
      },
    },
    {
      label: 'Ignore (keep both)',
      description: 'Leave the file as-is and continue with current settings',
      action: () => {
        hideFormatMismatch();
      },
    },
  ];

  useKeyboard((key: any) => {
    const keyName = key.name || key.char;

    if (keyName === 'up' || keyName === 'k') {
      setSelectedOption(prev => Math.max(0, prev - 1));
    } else if (keyName === 'down' || keyName === 'j') {
      setSelectedOption(prev => Math.min(options.length - 1, prev + 1));
    } else if (keyName === 'return' || keyName === 'enter') {
      options[selectedOption]?.action();
    } else if (keyName === 'escape' || keyName === 'q') {
      hideFormatMismatch();
    } else if (keyName === '1') {
      options[0]?.action();
    } else if (keyName === '2') {
      options[1]?.action();
    } else if (keyName === '3') {
      options[2]?.action();
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
