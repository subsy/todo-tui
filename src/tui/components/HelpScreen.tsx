import React from 'react';
import { useTheme } from '../themes/ThemeContext.tsx';

export function HelpScreen() {
  const theme = useTheme();

  return (
    <box flexDirection="column" padding={2} backgroundColor={theme.colors.background}>
      <text color={theme.colors.highlight} bold>Keyboard Shortcuts</text>
      <text> </text>

      <text color={theme.colors.project} bold>Navigation:</text>
      <text color={theme.colors.text}>  Up/k, Down/j    Move up/down (tasks or within panels)</text>
      <text color={theme.colors.text}>  Left/h, Right/l Move left/right between task elements</text>
      <text color={theme.colors.text}>  TAB             Cycle through panels</text>
      <text color={theme.colors.text}>  g, G            Go to top/bottom</text>
      <text> </text>

      <text color={theme.colors.project} bold>Panel Actions:</text>
      <text color={theme.colors.text}>  Enter           Filter by selected item (in non-task panels)</text>
      <text color={theme.colors.text}>  ESC             Return to tasks panel</text>
      <text> </text>

      <text color={theme.colors.project} bold>Task Actions:</text>
      <text color={theme.colors.text}>  space           Toggle task completion</text>
      <text color={theme.colors.text}>  Enter, e        Edit task text</text>
      <text color={theme.colors.text}>  Shift+Letter    Set priority (A-Z)</text>
      <text color={theme.colors.text}>  p               Add project tag (+tag)</text>
      <text color={theme.colors.text}>  c               Add context tag (@tag)</text>
      <text color={theme.colors.text}>  d               Add due date</text>
      <text color={theme.colors.text}>  n, a            Add new task</text>
      <text color={theme.colors.text}>  x               Delete task</text>
      <text color={theme.colors.text}>  delete/bksp     Delete selected element</text>
      <text> </text>

      <text color={theme.colors.project} bold>View:</text>
      <text color={theme.colors.text}>  v               Toggle show/hide completed tasks</text>
      <text color={theme.colors.text}>  o               Toggle highlight overdue/due today</text>
      <text color={theme.colors.text}>  /               Search/filter tasks</text>
      <text color={theme.colors.text}>  s               Cycle sort mode</text>
      <text color={theme.colors.text}>  t               Change theme</text>
      <text color={theme.colors.text}>  r               Refresh from file</text>
      <text> </text>

      <text color={theme.colors.project} bold>Other:</text>
      <text color={theme.colors.text}>  u               Undo last action</text>
      <text color={theme.colors.text}>  z               Purge all completed tasks</text>
      <text color={theme.colors.text}>  ?               Show this help</text>
      <text color={theme.colors.text}>  q, ESC          Quit</text>
      <text> </text>

      <text color={theme.colors.muted}>Press any key to close help...</text>
    </box>
  );
}
