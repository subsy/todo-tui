import React from 'react';

export function HelpScreen() {
  return (
    <box flexDirection="column" padding={2}>
      <text color="yellow" bold>Keyboard Shortcuts</text>
      <text> </text>

      <text color="magenta" bold>Navigation:</text>
      <text color="white">  Up/k, Down/j    Move up/down (tasks or within panels)</text>
      <text color="white">  Left/h, Right/l Move left/right between task elements</text>
      <text color="white">  TAB             Cycle through panels</text>
      <text color="white">  g, G            Go to top/bottom</text>
      <text> </text>

      <text color="magenta" bold>Panel Actions:</text>
      <text color="white">  Enter           Filter by selected item (in non-task panels)</text>
      <text color="white">  ESC             Return to tasks panel</text>
      <text> </text>

      <text color="magenta" bold>Task Actions:</text>
      <text color="white">  space           Toggle task completion</text>
      <text color="white">  Enter, e        Edit task text</text>
      <text color="white">  Shift+Letter    Set priority (A-Z)</text>
      <text color="white">  p               Add project tag (+tag)</text>
      <text color="white">  c               Add context tag (@tag)</text>
      <text color="white">  d               Add due date</text>
      <text color="white">  n, a            Add new task</text>
      <text color="white">  x               Delete task</text>
      <text color="white">  delete/bksp     Delete selected element</text>
      <text> </text>

      <text color="magenta" bold>View:</text>
      <text color="white">  v               Toggle show/hide completed tasks</text>
      <text color="white">  o               Toggle highlight overdue/due today</text>
      <text color="white">  /               Search/filter tasks</text>
      <text color="white">  s               Cycle sort mode</text>
      <text color="white">  r               Refresh from file</text>
      <text> </text>

      <text color="magenta" bold>Other:</text>
      <text color="white">  u               Undo last action</text>
      <text color="white">  z               Purge all completed tasks</text>
      <text color="white">  ?               Show this help</text>
      <text color="white">  q, ESC          Quit</text>
      <text> </text>

      <text color="gray">Press any key to close help...</text>
    </box>
  );
}
