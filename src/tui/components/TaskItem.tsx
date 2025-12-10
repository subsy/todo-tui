import React from 'react';
import type { Task } from '../../parser/index.ts';
import { useTodoStore } from '../store/useTodoStore.ts';
import { useTheme } from '../themes/ThemeContext.tsx';
import { getPriorityColor } from '../themes/index.ts';

interface TaskItemProps {
  task: Task;
  isSelected: boolean;
}

export function TaskItem({ task, isSelected }: TaskItemProps) {
  const highlightOverdue = useTodoStore(state => state.highlightOverdue);
  const theme = useTheme();

  // Check if task is overdue/due today
  const isOverdue = (): boolean => {
    if (!task.metadata.due) return false;
    const dueDate = task.metadata.due;
    const today = new Date().toISOString().split('T')[0];
    return dueDate < today && !task.completed;
  };

  const isDueToday = (): boolean => {
    if (!task.metadata.due) return false;
    const today = new Date().toISOString().split('T')[0];
    return task.metadata.due === today && !task.completed;
  };

  const shouldHighlight = highlightOverdue && (isOverdue() || isDueToday());

  // Build task display components
  const checkbox = task.completed ? '✓' : '○';
  const priorityText = task.priority ? `(${task.priority})` : '';
  const dateText = task.creationDate || '';

  // Determine colors
  const checkboxColor = task.completed ? theme.colors.success : theme.colors.text;
  const priorityColor = getPriorityColor(task.priority, theme);
  const textColor = task.completed ? theme.colors.muted : theme.colors.text;
  const projectColor = theme.colors.project;
  const contextColor = theme.colors.context;
  const dateColor = theme.colors.date;
  const metaColor = theme.colors.textDim;

  // Background color
  const bgColor = isSelected
    ? theme.colors.selection
    : shouldHighlight
      ? theme.colors.overdue
      : undefined;

  // Build the line with colored segments
  const projectTags = task.projects.map(p => `+${p}`).join(' ');
  const contextTags = task.contexts.map(c => `@${c}`).join(' ');
  const metadataTags = Object.entries(task.metadata)
    .map(([k, v]) => `${k}:${v}`)
    .join(' ');

  return (
    <box backgroundColor={bgColor} paddingX={1} flexDirection="row">
      <text color={checkboxColor}>{checkbox} </text>
      {priorityText && <text color={priorityColor}>{priorityText} </text>}
      {dateText && <text color={dateColor}>{dateText} </text>}
      <text color={textColor}>{task.text}</text>
      {projectTags && <text color={projectColor}> {projectTags}</text>}
      {contextTags && <text color={contextColor}> {contextTags}</text>}
      {metadataTags && <text color={metaColor}> {metadataTags}</text>}
    </box>
  );
}
