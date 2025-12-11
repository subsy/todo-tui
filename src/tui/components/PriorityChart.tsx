import React from 'react';
import { useTodoStore } from '../store/useTodoStore.ts';
import { useTheme } from '../themes/ThemeContext.tsx';
import { getPriorityColor } from '../themes/index.ts';

// All possible priorities by mode
const ALL_LETTER_PRIORITIES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
const ALL_NUMBER_PRIORITIES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

// Braille characters for fine-grained bar heights (using both columns for thickness)
// Each braille char has 4 vertical dots x 2 columns
const BRAILLE_BARS = [
  ' ',   // 0 - empty
  '⣀',  // 1 - bottom row (2 dots)
  '⣤',  // 2 - bottom 2 rows (4 dots)
  '⣶',  // 3 - bottom 3 rows (6 dots)
  '⣿',  // 4 - all 8 dots (full)
];
const BRAILLE_FULL = '⣿';  // Full braille (all 8 dots)
const BRAILLE_FULL_SELECTED = '⣿';  // Same for selection (will use color)

export function PriorityChart() {
  const tasks = useTodoStore(state => state.tasks);
  const focusedPanel = useTodoStore(state => state.focusedPanel);
  const panelCursorIndex = useTodoStore(state => state.panelCursorIndex);
  const priorityMode = useTodoStore(state => state.priorityMode);
  const theme = useTheme();

  // Show all priorities for the current mode
  const shownPriorities = priorityMode === 'letter' ? ALL_LETTER_PRIORITIES : ALL_NUMBER_PRIORITIES;

  // Count priorities (only active tasks)
  const activeTasks = tasks.filter(t => !t.completed);
  const priorityCounts: Record<string, number> = {};

  for (const task of activeTasks) {
    if (task.priority) {
      priorityCounts[task.priority] = (priorityCounts[task.priority] || 0) + 1;
    }
  }

  const counts = shownPriorities.map(p => priorityCounts[p] || 0);
  const maxCount = Math.max(...counts, 1);


  // Build bar chart rows (5 rows tall, 8 sub-levels per row = 40 total levels)
  const barHeight = 5;
  const totalLevels = barHeight * 8;

  const isFocused = focusedPanel === 'priorities';
  const borderColor = isFocused ? theme.colors.highlight : theme.colors.border;

  // Build selection indicator row (arrow pointing up at selected)
  const selectorStr = shownPriorities.map((_, i) => {
    const isSelected = isFocused && panelCursorIndex === i;
    return isSelected ? '▲ ' : '  ';
  }).join('');

  // Braille gives us 4 dots per row, with 5 rows = 20 levels of granularity
  const dotsPerRow = 4;
  const totalDots = barHeight * dotsPerRow; // 20 levels

  // Calculate exact dot height for each priority
  const dotHeights = counts.map(count => {
    if (count === 0) return 0;
    return Math.round((count / maxCount) * totalDots);
  });

  // Build each row with braille characters
  const barRows = Array.from({ length: barHeight }, (_, rowIdx) => {
    // Rows render from top (rowIdx=0) to bottom (rowIdx=4)
    const row = barHeight - 1 - rowIdx;
    const rowBottomDot = row * dotsPerRow;
    const rowTopDot = (row + 1) * dotsPerRow;

    return shownPriorities.map((priority, i) => {
      const height = dotHeights[i] ?? 0;
      const safeIndex = Math.max(0, Math.min(panelCursorIndex, shownPriorities.length - 1));
      const isSelected = isFocused && safeIndex === i;

      let char: string;
      if (height >= rowTopDot) {
        // Full braille column for this row
        char = isSelected ? BRAILLE_FULL_SELECTED : BRAILLE_FULL;
      } else if (height > rowBottomDot) {
        // Partial braille - show appropriate number of dots
        const dots = height - rowBottomDot;
        char = BRAILLE_BARS[dots] || ' ';
      } else {
        // Empty
        char = ' ';
      }

      return { char, isSelected, priority };
    });
  });

  // Build label row data
  const safeIndex = Math.max(0, Math.min(panelCursorIndex, shownPriorities.length - 1));
  const labelRow = shownPriorities.map((p, i) => {
    const isSelected = isFocused && safeIndex === i;
    return { char: p, isSelected, priority: p };
  });

  // Render a row with consistent 1-char gaps between columns
  const renderRow = (rowData: { char: string; isSelected: boolean; priority: string }[], key: string) => {
    // Build segments: each priority char followed by a space gap
    const segments: React.ReactNode[] = [];
    rowData.forEach((item, i) => {
      const color = getPriorityColor(item.priority, theme);
      const fg = item.isSelected ? theme.colors.highlight : color;
      segments.push(<text key={`${key}-${i}-char`} fg={fg}>{item.char}</text>);
      // Add 1-char gap after each bar (except last)
      if (i < rowData.length - 1) {
        segments.push(<text key={`${key}-${i}-gap`}>{' '}</text>);
      }
    });
    return <box key={key} flexDirection="row">{segments}</box>;
  };

  return (
    <box borderStyle="single" borderColor={borderColor} paddingLeft={1} paddingRight={1} flexDirection="column" height="100%">
      <text fg={theme.colors.context}>Priority</text>
      {/* Bar chart rows */}
      {barRows.map((rowData, rowIdx) => renderRow(rowData, `bar-${rowIdx}`))}
      {/* Labels */}
      {renderRow(labelRow, 'labels')}
      {/* Selection indicator */}
      {isFocused && <text fg={theme.colors.highlight}>{selectorStr}</text>}
    </box>
  );
}
