import React from 'react';
import { useTodoStore } from '../store/useTodoStore.ts';

export function PriorityChart() {
  const tasks = useTodoStore(state => state.tasks);
  const focusedPanel = useTodoStore(state => state.focusedPanel);
  const panelCursorIndex = useTodoStore(state => state.panelCursorIndex);

  // Count priorities (only active tasks)
  const activeTasks = tasks.filter(t => !t.completed);
  const priorityCounts: Record<string, number> = {};

  for (const task of activeTasks) {
    if (task.priority) {
      priorityCounts[task.priority] = (priorityCounts[task.priority] || 0) + 1;
    }
  }

  // Generate all priorities A-Z
  const allPriorities: string[] = [];
  for (let i = 0; i < 26; i++) {
    allPriorities.push(String.fromCharCode('A'.charCodeAt(0) + i));
  }

  const counts = allPriorities.map(p => priorityCounts[p] || 0);
  const maxCount = Math.max(...counts, 1);

  // Build bar chart rows (5 rows tall)
  const barHeight = 5;
  const bars: string[] = [];

  for (let row = barHeight - 1; row >= 0; row--) {
    let line = '';
    for (let i = 0; i < allPriorities.length; i++) {
      const count = counts[i];
      const barLevel = Math.ceil((count / maxCount) * barHeight);
      const isSelected = focusedPanel === 'priorities' && panelCursorIndex === i;

      if (barLevel > row) {
        line += isSelected ? '▓' : '█';
      } else {
        line += ' ';
      }
      line += ' ';
    }
    bars.push(line);
  }

  // Build label row
  let labelLine = allPriorities.join(' ');

  const isFocused = focusedPanel === 'priorities';
  const borderColor = isFocused ? 'yellow' : 'gray';

  return (
    <box borderStyle="single" borderColor={borderColor} padding={1} flexDirection="column">
      <text color="cyan">Priorities</text>
      {bars.map((bar, idx) => (
        <text key={idx} color="blue">{bar}</text>
      ))}
      <text color="gray">{labelLine}</text>
    </box>
  );
}
