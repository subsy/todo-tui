import React from 'react';
import { useTodoStore } from '../store/useTodoStore.ts';
import { useTheme } from '../themes/ThemeContext.tsx';

export function StatsPanel() {
  const tasks = useTodoStore(state => state.tasks);
  const focusedPanel = useTodoStore(state => state.focusedPanel);
  const panelCursorIndex = useTodoStore(state => state.panelCursorIndex);
  const theme = useTheme();

  const today = new Date().toISOString().split('T')[0];

  // Calculate stats
  const activeTasks = tasks.filter(t => !t.completed);
  const dueOverdue = activeTasks.filter(t => {
    if (!t.metadata.due) return false;
    return t.metadata.due <= today;
  });
  const completedToday = tasks.filter(t => t.completed && t.completionDate === today);

  const stats = [
    { label: 'DUE/OVERDUE', value: dueOverdue.length, color: theme.colors.overdue },
    { label: 'DONE TODAY', value: completedToday.length, color: theme.colors.success },
    { label: 'ACTIVE', value: `${activeTasks.length}/${tasks.length}`, color: theme.colors.textDim },
  ];

  const isFocused = focusedPanel === 'stats';
  const borderColor = isFocused ? theme.colors.highlight : theme.colors.border;

  return (
    <box borderStyle="single" borderColor={borderColor} padding={1} flexDirection="column">
      <text color={theme.colors.context}>Stats</text>
      {stats.map((stat, idx) => {
        const isSelected = isFocused && panelCursorIndex === idx;
        const cursor = isSelected ? '> ' : '  ';
        const bgColor = isSelected ? theme.colors.selection : undefined;

        return (
          <box key={idx} backgroundColor={bgColor}>
            <text color={isSelected ? theme.colors.highlight : stat.color}>{cursor}{stat.label}: {stat.value}</text>
          </box>
        );
      })}
    </box>
  );
}
