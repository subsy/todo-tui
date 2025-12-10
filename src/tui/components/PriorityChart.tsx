import React from 'react';
import { useTodoStore } from '../store/useTodoStore.ts';
import { useTheme } from '../themes/ThemeContext.tsx';
import { getPriorityColor } from '../themes/index.ts';

export function PriorityChart() {
  const tasks = useTodoStore(state => state.tasks);
  const focusedPanel = useTodoStore(state => state.focusedPanel);
  const panelCursorIndex = useTodoStore(state => state.panelCursorIndex);
  const theme = useTheme();

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

  const isFocused = focusedPanel === 'priorities';
  const borderColor = isFocused ? theme.colors.highlight : theme.colors.border;

  return (
    <box borderStyle="single" borderColor={borderColor} padding={1} flexDirection="column">
      <text color={theme.colors.context}>Priorities</text>
      {Array.from({ length: barHeight }, (_, rowIdx) => {
        const row = barHeight - 1 - rowIdx;
        return (
          <box key={rowIdx} flexDirection="row">
            {allPriorities.map((priority, i) => {
              const count = counts[i]!;
              const barLevel = Math.ceil((count / maxCount) * barHeight);
              const isSelected = focusedPanel === 'priorities' && panelCursorIndex === i;
              const color = getPriorityColor(priority, theme);

              return (
                <text key={i} color={isSelected ? theme.colors.highlight : color}>
                  {barLevel > row ? (isSelected ? '▓' : '█') : ' '}{' '}
                </text>
              );
            })}
          </box>
        );
      })}
      <box flexDirection="row">
        {allPriorities.map((p, i) => {
          const isSelected = focusedPanel === 'priorities' && panelCursorIndex === i;
          return (
            <text key={i} color={isSelected ? theme.colors.highlight : theme.colors.textDim}>
              {p}{' '}
            </text>
          );
        })}
      </box>
    </box>
  );
}
