import React from 'react';
import { useTodoStore } from '../store/useTodoStore.ts';
import { useTheme } from '../themes/ThemeContext.tsx';

interface TagsPanelProps {
  type: 'projects' | 'contexts';
}

export function TagsPanel({ type }: TagsPanelProps) {
  const tasks = useTodoStore(state => state.tasks);
  const focusedPanel = useTodoStore(state => state.focusedPanel);
  const panelCursorIndex = useTodoStore(state => state.panelCursorIndex);
  const theme = useTheme();

  // Collect all unique tags
  const allTags = new Set<string>();
  for (const task of tasks) {
    const tags = type === 'projects' ? task.projects : task.contexts;
    for (const tag of tags) {
      allTags.add(tag);
    }
  }

  const tagsList = Array.from(allTags).sort();
  const prefix = type === 'projects' ? '+' : '@';
  const title = type === 'projects' ? 'Projects' : 'Contexts';
  const tagColor = type === 'projects' ? theme.colors.project : theme.colors.context;

  const isFocused = focusedPanel === type;
  const borderColor = isFocused ? theme.colors.highlight : theme.colors.border;

  return (
    <box borderStyle="single" borderColor={borderColor} padding={1} flexDirection="column">
      <text color={theme.colors.context}>{title}</text>
      {tagsList.length === 0 ? (
        <text color={theme.colors.muted}>No {type}</text>
      ) : (
        tagsList.map((tag, idx) => {
          const isSelected = isFocused && panelCursorIndex === idx;
          const cursor = isSelected ? '> ' : '  ';
          const bgColor = isSelected ? theme.colors.selection : undefined;

          return (
            <box key={tag} backgroundColor={bgColor}>
              <text color={isSelected ? theme.colors.highlight : tagColor}>{cursor}{prefix}{tag}</text>
            </box>
          );
        })
      )}
    </box>
  );
}
