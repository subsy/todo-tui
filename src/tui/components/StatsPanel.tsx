import React from 'react';
import { useTodoStore } from '../store/useTodoStore.ts';

export function StatsPanel() {
  const tasks = useTodoStore(state => state.tasks);
  const focusedPanel = useTodoStore(state => state.focusedPanel);
  const panelCursorIndex = useTodoStore(state => state.panelCursorIndex);

  const today = new Date().toISOString().split('T')[0];

  // Calculate stats
  const activeTasks = tasks.filter(t => !t.completed);
  const dueOverdue = activeTasks.filter(t => {
    if (!t.metadata.due) return false;
    return t.metadata.due <= today;
  });
  const completedToday = tasks.filter(t => t.completed && t.completionDate === today);

  const stats = [
    { label: 'DUE/OVERDUE', value: dueOverdue.length, color: 'red' },
    { label: 'DONE TODAY', value: completedToday.length, color: 'green' },
    { label: 'ACTIVE', value: `${activeTasks.length}/${tasks.length}`, color: 'gray' },
  ];

  const isFocused = focusedPanel === 'stats';
  const borderColor = isFocused ? 'yellow' : 'gray';

  return (
    <box borderStyle="single" borderColor={borderColor} padding={1} flexDirection="column">
      <text color="cyan">Stats</text>
      {stats.map((stat, idx) => {
        const isSelected = isFocused && panelCursorIndex === idx;
        const cursor = isSelected ? '> ' : '  ';
        const bgColor = isSelected ? 'blue' : undefined;

        return (
          <box key={idx} backgroundColor={bgColor}>
            <text color={stat.color as any}>{cursor}{stat.label}: {stat.value}</text>
          </box>
        );
      })}
    </box>
  );
}
