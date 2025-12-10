import React from 'react';
import { useTodoStore, FocusedPanel } from '../store/useTodoStore.ts';

interface TagsPanelProps {
  type: 'projects' | 'contexts';
}

export function TagsPanel({ type }: TagsPanelProps) {
  const tasks = useTodoStore(state => state.tasks);
  const focusedPanel = useTodoStore(state => state.focusedPanel);
  const panelCursorIndex = useTodoStore(state => state.panelCursorIndex);

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
  const tagColor = type === 'projects' ? 'magenta' : 'cyan';

  const isFocused = focusedPanel === type;
  const borderColor = isFocused ? 'yellow' : 'gray';

  return (
    <box borderStyle="single" borderColor={borderColor} padding={1} flexDirection="column">
      <text color="cyan">{title}</text>
      {tagsList.length === 0 ? (
        <text color="gray">No {type}</text>
      ) : (
        tagsList.map((tag, idx) => {
          const isSelected = isFocused && panelCursorIndex === idx;
          const cursor = isSelected ? '> ' : '  ';
          const bgColor = isSelected ? 'blue' : undefined;

          return (
            <box key={tag} backgroundColor={bgColor}>
              <text color={tagColor as any}>{cursor}{prefix}{tag}</text>
            </box>
          );
        })
      )}
    </box>
  );
}
