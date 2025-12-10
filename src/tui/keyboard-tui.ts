import { loadTasks, saveTasks } from '../storage.ts';
import type { Task } from '../parser/index.ts';
import chalk from 'chalk';
import { stdin, stdout } from 'process';
import * as readline from 'readline';
import { loadConfig, saveConfig, type Config, letterToNumber, numberToLetter, normalizePriority } from '../config.ts';

type FocusedPanel = 'tasks' | 'priorities' | 'stats' | 'contexts' | 'projects';

interface TUIState {
  tasks: Task[];
  filteredTasks: Task[];
  currentTaskIndex: number;
  currentElementIndex: number;
  showCompleted: boolean;
  searchFilter: string;
  history: Task[][];
  filePath?: string;
  showHelp: boolean;
  sortMode: 'priority' | 'date' | 'project' | 'context';
  mainKeypressHandler?: (str: string, key: any) => Promise<void>;
  commandBarActive?: boolean;
  commandBarPrompt?: string;
  commandBarInput?: string;
  commandBarCursor?: number;
  config: Config;
  highlightOverdue: boolean;
  focusedPanel: FocusedPanel;
  panelCursorIndex: number;
  activeFilter?: { type: 'priority' | 'project' | 'context' | 'dueOverdue' | 'doneToday' | 'active', value: string };
}

// Pastel color palette
const colors = {
  priority: {
    high: chalk.hex('#ff9999'),      // pastel red
    medium: chalk.hex('#ffd699'),    // pastel orange
    low: chalk.hex('#99ccff'),       // pastel blue
  },
  success: chalk.hex('#99ff99'),     // pastel green
  muted: chalk.hex('#b3b3b3'),       // pastel gray
  border: chalk.hex('#cccccc'),      // light gray
  highlight: chalk.hex('#ffffcc'),   // pastel yellow
  overdue: chalk.bgHex('#ff6666'),   // pastel red background
  project: chalk.hex('#cc99ff'),     // pastel purple
  context: chalk.hex('#99ffcc'),     // pastel cyan
  date: chalk.hex('#ffb3e6'),        // pastel pink
};

// Date utility functions
function getTodayString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

function isOverdue(task: Task): boolean {
  if (!task.metadata.due) return false;
  const dueDate = task.metadata.due;
  const today = getTodayString();
  return dueDate < today && !task.completed;
}

function isDueToday(task: Task): boolean {
  if (!task.metadata.due) return false;
  return task.metadata.due === getTodayString() && !task.completed;
}

function isCompletedToday(task: Task): boolean {
  if (!task.completed || !task.completionDate) return false;
  return task.completionDate === getTodayString();
}

export async function keyboardTUI(filePath?: string): Promise<void> {
  const config = await loadConfig();
  const tasks = await loadTasks(filePath);

  // Auto-detect priority mode from file if tasks have priorities
  const tasksWithPriorities = tasks.filter(t => t.priority);
  if (tasksWithPriorities.length > 0) {
    const hasLetterPriority = tasksWithPriorities.some(t => /^[A-Z]$/.test(t.priority || ''));
    const hasNumberPriority = tasksWithPriorities.some(t => /^[0-9]$/.test(t.priority || ''));

    // If file has one type but config has another, update config
    if (hasNumberPriority && !hasLetterPriority && config.priorityMode === 'letter') {
      config.priorityMode = 'number';
      await saveConfig(config);
    } else if (hasLetterPriority && !hasNumberPriority && config.priorityMode === 'number') {
      config.priorityMode = 'letter';
      await saveConfig(config);
    }
  }

  const state: TUIState = {
    tasks,
    filteredTasks: [],
    currentTaskIndex: 0,
    currentElementIndex: 0,
    showCompleted: false,
    searchFilter: '',
    history: [],
    filePath,
    showHelp: false,
    sortMode: 'priority',
    config,
    highlightOverdue: false,
    focusedPanel: 'tasks',
    panelCursorIndex: 0,
    activeFilter: undefined,
  };

  updateFilteredTasks(state);

  // Setup terminal
  readline.emitKeypressEvents(stdin);
  if (stdin.isTTY) {
    stdin.setRawMode(true);
  }
  stdin.resume();

  // Hide cursor
  stdout.write('\x1b[?25l');

  // Clear screen
  clearScreen();

  // Initial render
  render(state);

  // Define main keypress handler
  const mainKeypressHandler = async (str: string, key: any) => {
    if (!key) return;

    // Ctrl+C or Ctrl+D to quit
    if ((key.ctrl && key.name === 'c') || (key.ctrl && key.name === 'd')) {
      await cleanup();
      process.exit(0);
    }

    if (state.showHelp) {
      state.showHelp = false;
      render(state);
      return;
    }

    // Handle keys
    if (key.name === 'q' || key.name === 'escape') {
      // If not in tasks panel, go back to tasks panel
      if (state.focusedPanel !== 'tasks') {
        state.focusedPanel = 'tasks';
        state.panelCursorIndex = 0;
      } else if (state.activeFilter) {
        // If in tasks panel with active filter, clear the filter
        state.activeFilter = undefined;
        updateFilteredTasks(state);
        state.currentTaskIndex = 0;
      } else {
        // Otherwise quit
        await cleanup();
        process.exit(0);
      }
    } else if (key.name === 'tab') {
      // Cycle through panels
      const panels: FocusedPanel[] = ['tasks', 'priorities', 'stats', 'projects', 'contexts'];
      const currentIndex = panels.indexOf(state.focusedPanel);
      const nextIndex = (currentIndex + 1) % panels.length;
      state.focusedPanel = panels[nextIndex];
      state.panelCursorIndex = 0;
    } else if (key.name === 'up' || str === 'k') {
      if (state.focusedPanel === 'tasks') {
        if (state.currentTaskIndex > 0) {
          state.currentTaskIndex--;
          state.currentElementIndex = 0;
        }
      } else {
        // Navigate within other panels
        if (state.panelCursorIndex > 0) {
          state.panelCursorIndex--;
        }
      }
    } else if (key.name === 'down' || str === 'j') {
      if (state.focusedPanel === 'tasks') {
        if (state.currentTaskIndex < state.filteredTasks.length - 1) {
          state.currentTaskIndex++;
          state.currentElementIndex = 0;
        }
      } else {
        // Navigate within other panels
        const maxIndex = getPanelItemCount(state, state.focusedPanel);
        if (state.panelCursorIndex < maxIndex - 1) {
          state.panelCursorIndex++;
        }
      }
    } else if (key.name === 'left' || str === 'h') {
      if (state.focusedPanel === 'tasks' && state.currentElementIndex > 0) {
        state.currentElementIndex--;
      }
    } else if (key.name === 'right' || str === 'l') {
      if (state.focusedPanel === 'tasks') {
        const task = state.filteredTasks[state.currentTaskIndex];
        if (task) {
          const maxElements = getTaskElementCount(task);
          if (state.currentElementIndex < maxElements - 1) {
            state.currentElementIndex++;
          }
        }
      }
    } else if (key.name === 'return' && state.focusedPanel !== 'tasks') {
      // Apply filter based on focused panel and cursor position
      applyPanelFilter(state);
      updateFilteredTasks(state);
      state.currentTaskIndex = 0;
      state.focusedPanel = 'tasks'; // Return to tasks panel after filtering
    } else if (str === 'g') {
      if (state.focusedPanel === 'tasks') {
        state.currentTaskIndex = 0;
        state.currentElementIndex = 0;
      } else {
        state.panelCursorIndex = 0;
      }
    } else if (key.shift && str === 'G') {
      if (state.focusedPanel === 'tasks') {
        state.currentTaskIndex = Math.max(0, state.filteredTasks.length - 1);
        state.currentElementIndex = 0;
      } else {
        const maxIndex = getPanelItemCount(state, state.focusedPanel);
        state.panelCursorIndex = Math.max(0, maxIndex - 1);
      }
    } else if (key.name === 'space') {
      await toggleCompletion(state);
    } else if (key.name === 'return' || str === 'e') {
      await editTask(state);
    } else if (key.shift && str && /^[A-Z]$/.test(str) && state.config.priorityMode === 'letter') {
      // Set letter priority (only in letter mode)
      await setPriority(state, str);
    } else if (key.shift && state.config.priorityMode === 'number') {
      // Set number priority (only in number mode)
      // Try both str (special chars like ! @ #) and key.name (actual number)
      const shiftNumberMap: Record<string, string> = {
        '!': '1', '@': '2', '#': '3', '$': '4', '%': '5',
        '^': '6', '&': '7', '*': '8', '(': '9', ')': '0'
      };
      let priority: string | null = null;

      if (str && shiftNumberMap[str]) {
        priority = shiftNumberMap[str];
      } else if (key.name && /^[0-9]$/.test(key.name)) {
        priority = key.name;
      }

      if (priority) {
        await setPriority(state, priority);
      }
    } else if (!key.shift && str && /^[0-9]$/.test(str) && state.config.priorityMode === 'number') {
      // Direct number key in number mode (without shift)
      await setPriority(state, str);
    } else if (str === 'p') {
      await addProjectTag(state);
    } else if (str === 'c') {
      await addContextTag(state);
    } else if (str === 'd') {
      await addDueDate(state);
    } else if (str === 'n' || str === 'a') {
      await addNewTask(state);
    } else if (str === 'x') {
      await deleteTask(state);
    } else if (key.name === 'backspace' || key.name === 'delete') {
      await deleteElement(state);
    } else if (str === 'u') {
      await undo(state);
    } else if (str === 'v') {
      state.showCompleted = !state.showCompleted;
      updateFilteredTasks(state);
      if (state.currentTaskIndex >= state.filteredTasks.length) {
        state.currentTaskIndex = Math.max(0, state.filteredTasks.length - 1);
      }
    } else if (str === 'o') {
      state.highlightOverdue = !state.highlightOverdue;
    } else if (str === '/') {
      await searchFilter(state);
    } else if (str === 'r') {
      state.tasks = await loadTasks(state.filePath);
      updateFilteredTasks(state);
    } else if (str === 's') {
      cycleSortMode(state);
    } else if (str === '?') {
      state.showHelp = true;
    } else if (str === ',') {
      await showSettings(state);
    } else if (str === 'z') {
      await purgeCompleted(state);
    }

    render(state);
  };

  // Store handler reference in state for restoration after prompts
  state.mainKeypressHandler = mainKeypressHandler;

  // Attach the main keypress handler
  stdin.on('keypress', mainKeypressHandler);
}

function getPanelItemCount(state: TUIState, panel: FocusedPanel): number {
  if (panel === 'tasks') return state.filteredTasks.length;
  if (panel === 'priorities') {
    return state.config.priorityMode === 'letter' ? 26 : 10;
  }
  if (panel === 'stats') return 3; // DUE/OVERDUE, DONE TODAY, ACTIVE
  if (panel === 'projects') {
    const allProjects = new Set<string>();
    for (const task of state.tasks) {
      for (const project of task.projects) {
        allProjects.add(project);
      }
    }
    return allProjects.size;
  }
  if (panel === 'contexts') {
    const allContexts = new Set<string>();
    for (const task of state.tasks) {
      for (const context of task.contexts) {
        allContexts.add(context);
      }
    }
    return allContexts.size;
  }
  return 0;
}

function applyPanelFilter(state: TUIState): void {
  const index = state.panelCursorIndex;

  if (state.focusedPanel === 'priorities') {
    const priorities: string[] = [];
    if (state.config.priorityMode === 'letter') {
      for (let i = 0; i < 26; i++) {
        priorities.push(String.fromCharCode('A'.charCodeAt(0) + i));
      }
    } else {
      for (let i = 0; i <= 9; i++) {
        priorities.push(i.toString());
      }
    }
    if (index < priorities.length) {
      state.activeFilter = { type: 'priority', value: priorities[index] };
    }
  } else if (state.focusedPanel === 'stats') {
    if (index === 0) {
      state.activeFilter = { type: 'dueOverdue', value: 'dueOverdue' };
    } else if (index === 1) {
      state.activeFilter = { type: 'doneToday', value: 'doneToday' };
    } else if (index === 2) {
      state.activeFilter = { type: 'active', value: 'active' };
    }
  } else if (state.focusedPanel === 'projects') {
    const allProjects = new Set<string>();
    for (const task of state.tasks) {
      for (const project of task.projects) {
        allProjects.add(project);
      }
    }
    const projectsList = Array.from(allProjects).sort();
    if (index < projectsList.length) {
      state.activeFilter = { type: 'project', value: projectsList[index] };
    }
  } else if (state.focusedPanel === 'contexts') {
    const allContexts = new Set<string>();
    for (const task of state.tasks) {
      for (const context of task.contexts) {
        allContexts.add(context);
      }
    }
    const contextsList = Array.from(allContexts).sort();
    if (index < contextsList.length) {
      state.activeFilter = { type: 'context', value: contextsList[index] };
    }
  }
}

function updateFilteredTasks(state: TUIState): void {
  state.filteredTasks = state.tasks.filter(task => {
    // Apply active filter first (may override showCompleted setting)
    if (state.activeFilter) {
      const filter = state.activeFilter;
      if (filter.type === 'priority' && task.priority !== filter.value) return false;
      if (filter.type === 'project' && !task.projects.includes(filter.value)) return false;
      if (filter.type === 'context' && !task.contexts.includes(filter.value)) return false;
      if (filter.type === 'dueOverdue' && !isOverdue(task) && !isDueToday(task)) return false;
      if (filter.type === 'doneToday' && !isCompletedToday(task)) return false;
      if (filter.type === 'active' && task.completed) return false;
    } else {
      // Only apply showCompleted filter if no active filter is set
      if (!state.showCompleted && task.completed) return false;
    }

    if (state.searchFilter) {
      const search = state.searchFilter.toLowerCase();
      return task.text.toLowerCase().includes(search) ||
             task.contexts.some(c => c.toLowerCase().includes(search)) ||
             task.projects.some(p => p.toLowerCase().includes(search));
    }
    return true;
  });

  state.filteredTasks.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;

    switch (state.sortMode) {
      case 'priority':
        if (a.priority !== b.priority) {
          if (!a.priority) return 1;
          if (!b.priority) return -1;
          return a.priority.localeCompare(b.priority);
        }
        break;
      case 'date':
        if (a.creationDate !== b.creationDate) {
          if (!a.creationDate) return 1;
          if (!b.creationDate) return -1;
          return a.creationDate.localeCompare(b.creationDate);
        }
        break;
      case 'project':
        const aProject = a.projects[0] || '';
        const bProject = b.projects[0] || '';
        if (aProject !== bProject) return aProject.localeCompare(bProject);
        break;
      case 'context':
        const aContext = a.contexts[0] || '';
        const bContext = b.contexts[0] || '';
        if (aContext !== bContext) return aContext.localeCompare(bContext);
        break;
    }

    return a.id - b.id;
  });
}

function getTaskElementCount(task: Task): number {
  let count = 1; // checkbox
  count++; // priority (always shown, even if empty)
  if (task.creationDate) count++;
  count++; // text
  count += task.projects.length;
  count += task.contexts.length;
  count += Object.keys(task.metadata).length;
  return count;
}

function clearScreen(): void {
  stdout.write('\x1b[2J\x1b[H');
}

function render(state: TUIState): void {
  clearScreen();

  const width = stdout.columns || 80;
  const height = stdout.rows || 24;

  if (state.showHelp) {
    renderHelp(state);
    return;
  }

  // Title with active filter
  let title = ` Todo.txt (${state.filteredTasks.length} tasks) `;
  if (state.activeFilter) {
    const filterType = state.activeFilter.type;
    let filterValue = state.activeFilter.value;

    // Format filter display based on type
    if (filterValue === 'dueOverdue') {
      filterValue = 'DUE/OVERDUE';
    } else if (filterValue === 'doneToday') {
      filterValue = 'DONE TODAY';
    } else if (filterValue === 'active') {
      filterValue = 'ACTIVE';
    }

    const filterPrefix = filterType === 'project' ? '+' : filterType === 'context' ? '@' : '';
    title += colors.priority.high(`[Filter: ${filterPrefix}${filterValue}] `);
  }
  const titlePadding = Math.max(0, width - getVisibleLength(title) - 4);
  stdout.write(colors.border('┌─') + colors.highlight.bold(title) + colors.border('─'.repeat(titlePadding) + '┐\n'));

  // Tasks
  // Reserve lines for panel (inside border) and legend (outside border)
  const panelLines = 8; // Panel inside the window (5 bar rows + 1 label row + 1 separator + 1 stats row)
  const legendLines = state.commandBarActive ? 4 : 4;
  const reservedLines = panelLines + legendLines;
  const maxTasks = Math.max(1, height - reservedLines);
  const startIndex = Math.max(0, Math.min(state.currentTaskIndex - Math.floor(maxTasks / 2), state.filteredTasks.length - maxTasks));
  const endIndex = Math.min(state.filteredTasks.length, startIndex + maxTasks);

  for (let i = startIndex; i < endIndex; i++) {
    const task = state.filteredTasks[i]!;
    const isSelected = i === state.currentTaskIndex;
    const prefix = isSelected ? colors.highlight('│ > ') : colors.border('│   ');

    const taskStr = renderTask(task, isSelected ? state.currentElementIndex : -1, state);
    stdout.write(prefix + taskStr);

    const visibleLen = getVisibleLength(prefix + taskStr);
    const padding = Math.max(1, width - visibleLen);
    stdout.write(' '.repeat(padding - 1) + colors.border('│\n'));
  }

  // Fill empty lines
  for (let i = Math.max(0, endIndex - startIndex); i < maxTasks; i++) {
    stdout.write(colors.border('│') + ' '.repeat(width - 2) + colors.border('│\n'));
  }

  // Render statistics panel (inside the border)
  renderPanelsInside(state, width);

  // Footer
  stdout.write(colors.border('└' + '─'.repeat(width - 2) + '┘\n'));

  // Status bar / Command bar
  if (state.commandBarActive) {
    // Command bar mode - show input prompt
    stdout.write(colors.highlight(state.commandBarPrompt || '') + ' ');

    const input = state.commandBarInput || '';
    const cursorPos = state.commandBarCursor || 0;

    if (input.length === 0) {
      stdout.write(chalk.inverse(' ')); // Show cursor on empty input
    } else {
      const before = input.slice(0, cursorPos);
      const at = input[cursorPos] || ' ';
      const after = input.slice(cursorPos + 1);

      stdout.write(before);
      stdout.write(chalk.inverse(at)); // Cursor
      stdout.write(after);
    }
    stdout.write('\n');
    stdout.write(colors.muted('Enter to save, ESC to cancel') + '\n');
  } else {
    // Normal status bar
    const shortcuts = [
      colors.muted('?') + ' Help',
      colors.muted('TAB') + ' Panels',
      colors.muted('space') + ' Toggle Done',
      colors.muted('e') + ' Edit',
      colors.muted('n') + ' New',
      colors.muted('v') + (state.showCompleted ? ' Hide Completed' : ' Show All'),
      colors.muted('q') + ' Quit'
    ];
    stdout.write(shortcuts.join(colors.border('  │  ')) + '\n');

    // Second status line with panel indicator
    const panelName = state.focusedPanel === 'tasks' ? 'Tasks' :
                      state.focusedPanel === 'priorities' ? 'Priorities' :
                      state.focusedPanel === 'stats' ? 'Stats' :
                      state.focusedPanel === 'projects' ? 'Projects' : 'Contexts';
    const panelIndicator = state.focusedPanel === 'tasks' ?
      colors.muted(`Panel: ${panelName}`) :
      colors.highlight(`Panel: ${panelName} (press Enter to filter, ESC to return)`);

    const sortInfo = !state.showCompleted ?
      colors.muted(`Hiding completed | Sort: ${state.sortMode}`) :
      colors.muted(`Sort: ${state.sortMode}`);

    stdout.write(panelIndicator + colors.border('  │  ') + sortInfo + '\n');
  }
}

function renderTask(task: Task, selectedElement: number, state: TUIState): string {
  // Check if task is overdue/due today for highlighting
  const shouldHighlight = state.highlightOverdue && (isOverdue(task) || isDueToday(task));
  const bgColor = shouldHighlight ? colors.overdue : ((text: string) => text);

  let result = '';
  let elementIndex = 0;

  // Checkbox
  const checkbox = task.completed ? colors.success('✓') : colors.muted('○');
  const checkboxStr = `[${checkbox}]`;
  result += selectedElement === elementIndex ? chalk.inverse(checkboxStr) : bgColor(checkboxStr);
  result += ' ';
  elementIndex++;

  // Priority (always show to maintain alignment)
  if (task.priority) {
    const color = getPriorityColor(task.priority);
    const priorityStr = `(${task.priority})`;
    result += selectedElement === elementIndex ? chalk.inverse(color(priorityStr)) : bgColor(color(priorityStr));
  } else {
    // Show placeholder for alignment
    const placeholder = colors.muted('(-)');
    result += selectedElement === elementIndex ? chalk.inverse('(-)') : bgColor(placeholder);
  }
  result += ' ';
  elementIndex++;

  // Date
  if (task.creationDate) {
    const dateStr = colors.date(task.creationDate);
    result += selectedElement === elementIndex ? chalk.inverse(task.creationDate) : bgColor(dateStr);
    result += ' ';
    elementIndex++;
  }

  // Text (strip out tags since we'll show them separately)
  let cleanText = task.text;
  // Remove project tags
  for (const project of task.projects) {
    cleanText = cleanText.replace(new RegExp(`\\+${project}\\b`, 'g'), '');
  }
  // Remove context tags
  for (const context of task.contexts) {
    cleanText = cleanText.replace(new RegExp(`@${context}\\b`, 'g'), '');
  }
  // Remove metadata
  for (const key of Object.keys(task.metadata)) {
    cleanText = cleanText.replace(new RegExp(`${key}:\\S+\\b`, 'g'), '');
  }
  cleanText = cleanText.trim().replace(/\s+/g, ' '); // Clean up extra spaces

  const textStr = task.completed ? colors.muted.strikethrough(cleanText) : cleanText;
  result += selectedElement === elementIndex ? chalk.inverse(textStr) : bgColor(textStr);
  elementIndex++;

  // Projects
  for (const project of task.projects) {
    result += ' ';
    const projectStr = colors.project(`+${project}`);
    result += selectedElement === elementIndex ? chalk.inverse(`+${project}`) : bgColor(projectStr);
    elementIndex++;
  }

  // Contexts
  for (const context of task.contexts) {
    result += ' ';
    const contextStr = colors.context(`@${context}`);
    result += selectedElement === elementIndex ? chalk.inverse(`@${context}`) : bgColor(contextStr);
    elementIndex++;
  }

  // Metadata
  for (const [key, value] of Object.entries(task.metadata)) {
    result += ' ';
    const metadataStr = colors.muted(`${key}:`) + colors.date(value);
    result += selectedElement === elementIndex ? chalk.inverse(`${key}:${value}`) : bgColor(metadataStr);
    elementIndex++;
  }

  return result;
}

function getVisibleLength(str: string): number {
  return str.replace(/\x1b\[[0-9;]*m/g, '').length;
}

function getPriorityColor(priority: string): (text: string) => string {
  // Handle numeric priorities (0-9)
  if (/^[0-9]$/.test(priority)) {
    const num = parseInt(priority);
    if (num <= 2) return colors.priority.high; // 0-2: High priority
    if (num <= 5) return colors.priority.medium; // 3-5: Medium priority
    return colors.priority.low; // 6-9: Low priority
  }

  // Handle letter priorities (A-Z)
  const code = priority.charCodeAt(0);
  if (code <= 'C'.charCodeAt(0)) return colors.priority.high;
  if (code <= 'F'.charCodeAt(0)) return colors.priority.medium;
  return colors.priority.low;
}

function renderPanelsInside(state: TUIState, width: number): void {
  // Count statistics
  const activeTasks = state.tasks.filter(t => !t.completed);
  const dueOverdue = activeTasks.filter(t => isOverdue(t) || isDueToday(t));
  const completedToday = state.tasks.filter(t => isCompletedToday(t));

  // Priority breakdown (only active tasks)
  const priorityCounts: Record<string, number> = {};
  for (const task of activeTasks) {
    if (task.priority) {
      priorityCounts[task.priority] = (priorityCounts[task.priority] || 0) + 1;
    }
  }

  // Separator line
  stdout.write(colors.border('├' + '─'.repeat(width - 2) + '┤\n'));

  // Generate all priorities based on mode
  const allPriorities: string[] = [];
  if (state.config.priorityMode === 'letter') {
    // A-Z (26 priorities)
    for (let i = 0; i < 26; i++) {
      allPriorities.push(String.fromCharCode('A'.charCodeAt(0) + i));
    }
  } else {
    // 0-9 (10 priorities)
    for (let i = 0; i <= 9; i++) {
      allPriorities.push(i.toString());
    }
  }

  // Get counts for display (0 if no tasks with that priority)
  const counts = allPriorities.map(p => priorityCounts[p] || 0);
  const maxCount = Math.max(...counts, 1);

  // Prepare stats lines for right panel
  const statsLinesRaw = [
    { label: 'DUE/OVERDUE:', value: dueOverdue.length.toString(), color: colors.priority.high },
    { label: 'DONE TODAY:', value: completedToday.length.toString(), color: colors.success },
    { label: 'ACTIVE:', value: `${activeTasks.length}/${state.tasks.length}`, color: colors.muted },
  ];

  // Collect all unique project and context tags
  const allProjects = new Set<string>();
  const allContexts = new Set<string>();
  for (const task of state.tasks) {
    for (const project of task.projects) {
      allProjects.add(project);
    }
    for (const context of task.contexts) {
      allContexts.add(context);
    }
  }
  const projectsList = Array.from(allProjects).sort();
  const contextsList = Array.from(allContexts).sort();

  // Calculate bar chart width (bars + spaces between them)
  const barChartWidth = allPriorities.length * 2 - 1; // Each bar + space, minus last space

  // Calculate exact bar height for each priority with sub-bar granularity
  const barHeight = 5;
  const subBarLevels = 8; // 8 levels per row using block characters

  // Partial block characters from empty to full (bottom to top fill)
  const partialBlocks = [' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

  const barHeights = counts.map(count => {
    if (count === 0) return 0;
    const percentage = count / maxCount;

    // Hide bars that are less than 1% of max
    if (percentage < 0.01) {
      return 0;
    }

    // Calculate height in sub-bar units (5 rows * 8 levels = 40 total levels)
    const totalLevels = barHeight * subBarLevels;
    const proportionalLevel = (count / maxCount) * totalLevels;

    // Round to nearest level, ensuring at least level 1 for counts >= 1%
    return Math.max(1, Math.round(proportionalLevel));
  });

  // Create 5 rows for the vertical bar chart with stats on the right
  for (let row = barHeight - 1; row >= 0; row--) {
    let line = colors.border('│') + ' ';

    // Draw bars
    for (let i = 0; i < allPriorities.length; i++) {
      const pri = allPriorities[i];
      const count = counts[i];
      const color = getPriorityColor(pri);
      const barLevel = barHeights[i];
      const isSelected = state.focusedPanel === 'priorities' && state.panelCursorIndex === i;

      // Calculate which character to show for this row
      const rowBottomLevel = row * subBarLevels;
      const rowTopLevel = (row + 1) * subBarLevels;

      let barChar = ' ';
      if (barLevel >= rowTopLevel) {
        // Full bar for this row
        barChar = '█';
      } else if (barLevel > rowBottomLevel) {
        // Partial bar - show the appropriate partial block
        const partialLevel = barLevel - rowBottomLevel;
        barChar = partialBlocks[partialLevel];
      }

      // Apply highlighting if selected
      if (isSelected && barChar !== ' ') {
        line += chalk.inverse(color(barChar));
      } else {
        line += color(barChar);
      }

      // Add 1 space gap between bars (but not after last bar)
      if (i < allPriorities.length - 1) {
        line += ' ';
      }
    }

    // Add vertical divider (highlight if stats panel is focused)
    const statsBorder = state.focusedPanel === 'stats' ? colors.highlight('│') : colors.border('│');
    line += ' ' + statsBorder + ' ';

    // Add stats line if available for this row
    const statsRow = (barHeight - 1) - row;
    if (statsRow < statsLinesRaw.length) {
      const stat = statsLinesRaw[statsRow];
      const isStatSelected = state.focusedPanel === 'stats' && state.panelCursorIndex === statsRow;
      const cursor = isStatSelected ? '> ' : '  ';
      const statLine = `${cursor}${stat.color(stat.label)} ${stat.color.bold(stat.value)}`;

      if (isStatSelected) {
        line += chalk.inverse(statLine);
      } else {
        line += statLine;
      }
    }

    // Pad stats to fixed width (22 chars including cursor)
    const statsWidth = 22;
    const currentStatsLen = statsRow < statsLinesRaw.length ?
      getVisibleLength(`  ${statsLinesRaw[statsRow].label} ${statsLinesRaw[statsRow].value}`) : 0;
    line += ' '.repeat(Math.max(0, statsWidth - currentStatsLen));

    // Add second vertical divider (highlight if projects panel is focused)
    const projectsBorder = state.focusedPanel === 'projects' ? colors.highlight('│') : colors.border('│');
    line += ' ' + projectsBorder + ' ';

    // Add projects
    if (statsRow < projectsList.length) {
      const project = projectsList[statsRow];
      const isProjectSelected = state.focusedPanel === 'projects' && state.panelCursorIndex === statsRow;
      const cursor = isProjectSelected ? '> ' : '  ';
      const projectLine = cursor + colors.project(`+${project}`);

      if (isProjectSelected) {
        line += chalk.inverse(projectLine);
      } else {
        line += projectLine;
      }
    }
    // Pad projects to fixed width (17 chars including cursor)
    const projectWidth = 17;
    const currentProjectLen = statsRow < projectsList.length ? getVisibleLength(`  +${projectsList[statsRow]}`) : 0;
    line += ' '.repeat(Math.max(0, projectWidth - currentProjectLen));

    // Add third vertical divider (highlight if contexts panel is focused)
    const contextsBorder = state.focusedPanel === 'contexts' ? colors.highlight('│') : colors.border('│');
    line += ' ' + contextsBorder + ' ';

    // Add contexts
    if (statsRow < contextsList.length) {
      const context = contextsList[statsRow];
      const isContextSelected = state.focusedPanel === 'contexts' && state.panelCursorIndex === statsRow;
      const cursor = isContextSelected ? '> ' : '  ';
      const contextLine = cursor + colors.context(`@${context}`);

      if (isContextSelected) {
        line += chalk.inverse(contextLine);
      } else {
        line += contextLine;
      }
    }

    const lineVisible = getVisibleLength(line);
    const linePadding = Math.max(0, width - lineVisible - 1);
    stdout.write(line + ' '.repeat(linePadding) + colors.border('│\n'));
  }

  // Bottom row with labels only (no counts)
  let labelLine = colors.border('│') + ' ';
  for (let i = 0; i < allPriorities.length; i++) {
    const pri = allPriorities[i];
    const color = getPriorityColor(pri);
    const isSelected = state.focusedPanel === 'priorities' && state.panelCursorIndex === i;

    if (isSelected) {
      labelLine += chalk.inverse(color(pri));
    } else {
      labelLine += color(pri);
    }

    // Add 1 space gap between labels (but not after last label)
    if (i < allPriorities.length - 1) {
      labelLine += ' ';
    }
  }

  // Add vertical dividers (extend them to the label row)
  const statsBorder = state.focusedPanel === 'stats' ? colors.highlight('│') : colors.border('│');
  labelLine += ' ' + statsBorder;

  // Pad for stats width (space + statsWidth + space = 1 + 22 + 1 = 24)
  labelLine += ' '.repeat(24);

  const projectsBorder = state.focusedPanel === 'projects' ? colors.highlight('│') : colors.border('│');
  labelLine += projectsBorder;

  // Pad for projects width (space + projectWidth + space = 1 + 17 + 1 = 19)
  labelLine += ' '.repeat(19);

  const contextsBorder = state.focusedPanel === 'contexts' ? colors.highlight('│') : colors.border('│');
  labelLine += contextsBorder;

  const labelVisible = getVisibleLength(labelLine);
  const labelPadding = Math.max(0, width - labelVisible - 1);
  stdout.write(labelLine + ' '.repeat(labelPadding) + colors.border('│\n'));
}

function renderHelp(state: TUIState): void {
  const priorityHelp = state.config.priorityMode === 'letter'
    ? 'Shift+Letter  Set priority (e.g., Shift+A for priority A)'
    : '0-9           Set priority (0=highest, 9=lowest)';

  const helpText = `
${colors.highlight.bold('Keyboard Shortcuts')}

${colors.project.bold('Navigation:')}
  ↑/k, ↓/j      Move up/down (tasks or within panels)
  ←/h, →/l      Move left/right between task elements
  TAB           Cycle through panels (tasks → priorities → stats → projects → contexts)
  g, G          Go to top/bottom

${colors.project.bold('Panel Actions:')}
  enter         (in non-task panels) Filter by selected item
  ESC           Return to tasks panel

${colors.project.bold('Task Actions:')}
  space         Toggle task completion
  enter, e      Edit task text
  ${priorityHelp}
  p             Add project tag (+tag)
  c             Add context tag (@tag)
  d             Add due date
  n, a          Add new task
  x             Delete task
  delete/bksp   Delete selected element

${colors.project.bold('View:')}
  v             Toggle show/hide completed tasks
  o             Toggle highlight overdue/due today
  /             Search/filter tasks
  s             Cycle sort mode
  r             Refresh from file

${colors.project.bold('Other:')}
  u             Undo last action
  z             Purge all completed tasks (with confirmation)
  ,             Settings (priority mode, etc.)
  ?             Show this help
  q, ESC        Quit

${colors.muted('Press any key to close help...')}
${colors.muted(`Current priority mode: ${state.config.priorityMode}`)}
`;

  stdout.write(helpText);
}

function saveHistory(state: TUIState): void {
  state.history.push(JSON.parse(JSON.stringify(state.tasks)));
  if (state.history.length > 50) {
    state.history.shift();
  }
}

async function toggleCompletion(state: TUIState): Promise<void> {
  const task = state.filteredTasks[state.currentTaskIndex];
  if (!task) return;

  saveHistory(state);

  const taskInList = state.tasks.find(t => t.id === task.id);
  if (taskInList) {
    taskInList.completed = !taskInList.completed;
    if (taskInList.completed) {
      taskInList.completionDate = new Date().toISOString().split('T')[0];
    } else {
      taskInList.completionDate = null;
    }
  }

  await saveTasks(state.tasks, state.filePath);
  updateFilteredTasks(state);
}

async function setPriority(state: TUIState, priority: string): Promise<void> {
  const task = state.filteredTasks[state.currentTaskIndex];
  if (!task) return;

  // Validate priority based on current mode
  const expectedPattern = state.config.priorityMode === 'letter' ? /^[A-Z]$/ : /^[0-9]$/;
  if (!expectedPattern.test(priority)) {
    return; // Invalid priority for current mode
  }

  saveHistory(state);

  const taskInList = state.tasks.find(t => t.id === task.id);
  if (taskInList) {
    taskInList.priority = priority;
  }

  await saveTasks(state.tasks, state.filePath);
  updateFilteredTasks(state);
}

async function showSettings(state: TUIState): Promise<void> {
  return new Promise<void>((resolve) => {
    // Remove all existing keypress listeners
    stdin.removeAllListeners('keypress');

    const renderSettings = () => {
      clearScreen();
      stdout.write(chalk.bold.cyan('Settings') + '\n\n');

      // Priority Mode setting
      stdout.write(chalk.bold('Priority Mode:') + '\n');
      stdout.write('  ' + (state.config.priorityMode === 'letter' ? chalk.green('• ') : chalk.dim('○ ')) + 'Letter (A-Z)' + '\n');
      stdout.write('  ' + (state.config.priorityMode === 'number' ? chalk.green('• ') : chalk.dim('○ ')) + 'Number (0-9)' + '\n');
      stdout.write('\n');

      stdout.write(chalk.dim('Press 1 to toggle priority mode') + '\n');
      stdout.write(chalk.dim('Press ESC or q to close') + '\n');

      // Command bar for conversion prompt
      if (state.commandBarActive) {
        stdout.write('\n');
        stdout.write(chalk.cyan(state.commandBarPrompt || '') + ' ');

        const input = state.commandBarInput || '';
        const cursorPos = state.commandBarCursor || 0;

        if (input.length === 0) {
          stdout.write(chalk.inverse(' ')); // Show cursor on empty input
        } else {
          const before = input.slice(0, cursorPos);
          const at = input[cursorPos] || ' ';
          const after = input.slice(cursorPos + 1);
          stdout.write(before + chalk.inverse(at) + after);
        }
        stdout.write('\n');
      }
    };

    renderSettings();

    const onKeypress = async (str: string, key: any) => {
      if (!key) return;

      if (key.name === 'escape' || str === 'q') {
        // Exit settings
        stdin.removeListener('keypress', onKeypress);
        if (state.mainKeypressHandler) {
          stdin.on('keypress', state.mainKeypressHandler);
        }
        render(state);
        resolve();
      } else if (str === '1') {
      // Toggle priority mode
      const newMode = state.config.priorityMode === 'letter' ? 'number' : 'letter';

      // Check if any tasks have priorities that need conversion
      const tasksWithPriorities = state.tasks.filter(t => t.priority);

      if (tasksWithPriorities.length > 0) {
        // Remove settings keypress listener temporarily
        stdin.removeListener('keypress', onKeypress);

        // Ask if user wants to convert existing priorities
        const convertLabel = newMode === 'number' ? 'letters to numbers (A→0, B→1, etc.)' : 'numbers to letters (0→A, 1→B, etc.)';

        // Use command bar for the prompt
        state.commandBarActive = true;
        state.commandBarPrompt = `Convert ${tasksWithPriorities.length} priorities ${convertLabel}? (y/n):`;
        state.commandBarInput = 'y';
        state.commandBarCursor = 1;

        renderSettings();

        const promptHandler = async (str2: string, key2: any) => {
          if (!key2) return;

          if (key2.name === 'return') {
            const response = state.commandBarInput || 'y';
            stdin.removeListener('keypress', promptHandler);

            state.commandBarActive = false;
            state.commandBarPrompt = undefined;
            state.commandBarInput = undefined;
            state.commandBarCursor = undefined;

            if (response.toLowerCase() === 'y') {
              saveHistory(state);

              // Convert all priorities
              for (const task of state.tasks) {
                if (task.priority) {
                  if (newMode === 'number') {
                    task.priority = letterToNumber(task.priority);
                  } else {
                    task.priority = numberToLetter(task.priority);
                  }
                }
              }

              await saveTasks(state.tasks, state.filePath);
              updateFilteredTasks(state);
            }

            // Update config
            state.config.priorityMode = newMode;
            await saveConfig(state.config);

            // Restore settings listener
            stdin.on('keypress', onKeypress);
            renderSettings();
          } else if (key2.name === 'escape') {
            // Cancel
            stdin.removeListener('keypress', promptHandler);

            state.commandBarActive = false;
            state.commandBarPrompt = undefined;
            state.commandBarInput = undefined;
            state.commandBarCursor = undefined;

            // Restore settings listener
            stdin.on('keypress', onKeypress);
            renderSettings();
          } else if (key2.name === 'backspace') {
            const input = state.commandBarInput || '';
            const cursorPos = state.commandBarCursor || 0;
            if (cursorPos > 0) {
              state.commandBarInput = input.slice(0, cursorPos - 1) + input.slice(cursorPos);
              state.commandBarCursor = cursorPos - 1;
              renderSettings();
            }
          } else if (str2 && str2.length === 1 && !key2.ctrl && !key2.meta) {
            const input = state.commandBarInput || '';
            const cursorPos = state.commandBarCursor || 0;
            state.commandBarInput = input.slice(0, cursorPos) + str2 + input.slice(cursorPos);
            state.commandBarCursor = cursorPos + 1;
            renderSettings();
          }
        };

        stdin.on('keypress', promptHandler);
      } else {
        // No priorities to convert, just toggle
        state.config.priorityMode = newMode;
        await saveConfig(state.config);
        renderSettings();
      }
    } else {
      // Ignore other keys
    }
    };

    stdin.on('keypress', onKeypress);
  });
}

async function addProjectTag(state: TUIState): Promise<void> {
  const tag = await promptInput(state, 'Project tag (without +): ');
  if (!tag) return;

  const task = state.filteredTasks[state.currentTaskIndex];
  if (!task) return;

  saveHistory(state);

  const taskInList = state.tasks.find(t => t.id === task.id);
  if (taskInList && !taskInList.projects.includes(tag)) {
    taskInList.projects.push(tag);
    taskInList.text += ` +${tag}`;
  }

  await saveTasks(state.tasks, state.filePath);
  updateFilteredTasks(state);
}

async function addContextTag(state: TUIState): Promise<void> {
  const tag = await promptInput(state, 'Context tag (without @): ');
  if (!tag) return;

  const task = state.filteredTasks[state.currentTaskIndex];
  if (!task) return;

  saveHistory(state);

  const taskInList = state.tasks.find(t => t.id === task.id);
  if (taskInList && !taskInList.contexts.includes(tag)) {
    taskInList.contexts.push(tag);
    taskInList.text += ` @${tag}`;
  }

  await saveTasks(state.tasks, state.filePath);
  updateFilteredTasks(state);
}

async function addDueDate(state: TUIState): Promise<void> {
  const date = await promptInput(state, 'Due date (YYYY-MM-DD): ');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;

  const task = state.filteredTasks[state.currentTaskIndex];
  if (!task) return;

  saveHistory(state);

  const taskInList = state.tasks.find(t => t.id === task.id);
  if (taskInList) {
    // Only add if not already present
    if (!taskInList.metadata.due) {
      taskInList.metadata.due = date;
      taskInList.text += ` due:${date}`;
    } else {
      // Update existing due date in text
      taskInList.metadata.due = date;
      taskInList.text = taskInList.text.replace(/due:\S+/, `due:${date}`);
    }
  }

  await saveTasks(state.tasks, state.filePath);
  updateFilteredTasks(state);
}

async function editTask(state: TUIState): Promise<void> {
  const task = state.filteredTasks[state.currentTaskIndex];
  if (!task) return;

  const newText = await promptInput(state, 'Edit task: ', task.text);
  if (newText === null || newText === task.text) return;

  saveHistory(state);

  const taskInList = state.tasks.find(t => t.id === task.id);
  if (taskInList) {
    taskInList.text = newText;
    taskInList.contexts = (newText.match(/@\S+/g) || []).map(c => c.substring(1));
    taskInList.projects = (newText.match(/\+\S+/g) || []).map(p => p.substring(1));
    taskInList.metadata = {};
    const metadataMatches = newText.match(/(\S+):(\S+)/g);
    if (metadataMatches) {
      for (const match of metadataMatches) {
        const [key, value] = match.split(':');
        if (key && value && !key.startsWith('@') && !key.startsWith('+')) {
          taskInList.metadata[key] = value;
        }
      }
    }
  }

  await saveTasks(state.tasks, state.filePath);
  updateFilteredTasks(state);
}

async function addNewTask(state: TUIState): Promise<void> {
  const text = await promptInput(state, 'New task: ');
  if (!text) return;

  saveHistory(state);

  const today = new Date().toISOString().split('T')[0];
  let priority: string | null = null;
  let cleanText = text;

  const priorityMatch = text.match(/^\(([A-Z])\)\s+(.+)$/);
  if (priorityMatch) {
    priority = priorityMatch[1]!;
    cleanText = priorityMatch[2]!;
  }

  const newTask: Task = {
    id: state.tasks.length > 0 ? Math.max(...state.tasks.map(t => t.id)) + 1 : 1,
    completed: false,
    priority,
    completionDate: null,
    creationDate: today,
    text: cleanText,
    contexts: (cleanText.match(/@\S+/g) || []).map(c => c.substring(1)),
    projects: (cleanText.match(/\+\S+/g) || []).map(p => p.substring(1)),
    metadata: {},
  };

  const metadataMatches = cleanText.match(/(\S+):(\S+)/g);
  if (metadataMatches) {
    for (const match of metadataMatches) {
      const [key, value] = match.split(':');
      if (key && value && !key.startsWith('@') && !key.startsWith('+')) {
        newTask.metadata[key] = value;
      }
    }
  }

  state.tasks.push(newTask);
  await saveTasks(state.tasks, state.filePath);
  updateFilteredTasks(state);

  // Move to the new task
  state.currentTaskIndex = state.filteredTasks.findIndex(t => t.id === newTask.id);
}

async function deleteTask(state: TUIState): Promise<void> {
  const task = state.filteredTasks[state.currentTaskIndex];
  if (!task) return;

  const confirm = await promptInput(state, `Delete task? (y/n): `);
  if (confirm?.toLowerCase() !== 'y') return;

  saveHistory(state);

  state.tasks = state.tasks.filter(t => t.id !== task.id);
  await saveTasks(state.tasks, state.filePath);
  updateFilteredTasks(state);

  if (state.currentTaskIndex >= state.filteredTasks.length) {
    state.currentTaskIndex = Math.max(0, state.filteredTasks.length - 1);
  }
}

async function purgeCompleted(state: TUIState): Promise<void> {
  const completedTasks = state.tasks.filter(t => t.completed);

  if (completedTasks.length === 0) {
    await promptInput(state, `No completed tasks to purge. Press Enter to continue.`);
    return;
  }

  const confirm = await promptInput(state, `Purge ${completedTasks.length} completed task(s)? This cannot be undone! (y/n): `);
  if (confirm?.toLowerCase() !== 'y') return;

  saveHistory(state);

  state.tasks = state.tasks.filter(t => !t.completed);
  await saveTasks(state.tasks, state.filePath);
  updateFilteredTasks(state);

  if (state.currentTaskIndex >= state.filteredTasks.length) {
    state.currentTaskIndex = Math.max(0, state.filteredTasks.length - 1);
  }
}

async function deleteElement(state: TUIState): Promise<void> {
  const task = state.filteredTasks[state.currentTaskIndex];
  if (!task) return;

  let elementIndex = 0;

  // Checkbox - can't delete
  if (state.currentElementIndex === elementIndex) return;
  elementIndex++;

  // Priority (always present, even if empty)
  if (state.currentElementIndex === elementIndex) {
    // Only delete if there's actually a priority to delete
    if (task.priority) {
      saveHistory(state);
      const taskInList = state.tasks.find(t => t.id === task.id);
      if (taskInList) taskInList.priority = null;
      await saveTasks(state.tasks, state.filePath);
      updateFilteredTasks(state);
      if (state.currentElementIndex > 0) state.currentElementIndex--;
    }
    return;
  }
  elementIndex++;

  // Date
  if (task.creationDate) {
    if (state.currentElementIndex === elementIndex) {
      saveHistory(state);
      const taskInList = state.tasks.find(t => t.id === task.id);
      if (taskInList) taskInList.creationDate = null;
      await saveTasks(state.tasks, state.filePath);
      updateFilteredTasks(state);
      if (state.currentElementIndex > 0) state.currentElementIndex--;
      return;
    }
    elementIndex++;
  }

  // Text - can't delete
  if (state.currentElementIndex === elementIndex) return;
  elementIndex++;

  // Projects
  for (let i = 0; i < task.projects.length; i++) {
    if (state.currentElementIndex === elementIndex) {
      saveHistory(state);
      const project = task.projects[i]!;
      const taskInList = state.tasks.find(t => t.id === task.id);
      if (taskInList) {
        taskInList.projects = taskInList.projects.filter(p => p !== project);
        taskInList.text = taskInList.text.replace(new RegExp(`\\+${project}\\b`, 'g'), '').trim();
      }
      await saveTasks(state.tasks, state.filePath);
      updateFilteredTasks(state);
      if (state.currentElementIndex > 0) state.currentElementIndex--;
      return;
    }
    elementIndex++;
  }

  // Contexts
  for (let i = 0; i < task.contexts.length; i++) {
    if (state.currentElementIndex === elementIndex) {
      saveHistory(state);
      const context = task.contexts[i]!;
      const taskInList = state.tasks.find(t => t.id === task.id);
      if (taskInList) {
        taskInList.contexts = taskInList.contexts.filter(c => c !== context);
        taskInList.text = taskInList.text.replace(new RegExp(`@${context}\\b`, 'g'), '').trim();
      }
      await saveTasks(state.tasks, state.filePath);
      updateFilteredTasks(state);
      if (state.currentElementIndex > 0) state.currentElementIndex--;
      return;
    }
    elementIndex++;
  }

  // Metadata
  const metadataKeys = Object.keys(task.metadata);
  for (let i = 0; i < metadataKeys.length; i++) {
    if (state.currentElementIndex === elementIndex) {
      saveHistory(state);
      const key = metadataKeys[i]!;
      const taskInList = state.tasks.find(t => t.id === task.id);
      if (taskInList) {
        delete taskInList.metadata[key];
        taskInList.text = taskInList.text.replace(new RegExp(`${key}:\\S+\\b`, 'g'), '').trim();
      }
      await saveTasks(state.tasks, state.filePath);
      updateFilteredTasks(state);
      if (state.currentElementIndex > 0) state.currentElementIndex--;
      return;
    }
    elementIndex++;
  }
}

async function undo(state: TUIState): Promise<void> {
  if (state.history.length === 0) return;

  state.tasks = state.history.pop()!;
  await saveTasks(state.tasks, state.filePath);
  updateFilteredTasks(state);
}

async function searchFilter(state: TUIState): Promise<void> {
  // Save original filter in case user cancels
  const originalFilter = state.searchFilter;
  const originalIndex = state.currentTaskIndex;

  const filter = await promptInput(
    state,
    'Search:',
    state.searchFilter,
    (value: string) => {
      // Live update search results as user types
      state.searchFilter = value;
      updateFilteredTasks(state);
      state.currentTaskIndex = 0;
    }
  );

  if (filter === null) {
    // User cancelled, restore previous filter
    state.searchFilter = originalFilter;
    updateFilteredTasks(state);
    state.currentTaskIndex = Math.min(originalIndex, state.filteredTasks.length - 1);
    return;
  }

  // Final update on Enter (already set via live update, but ensure consistency)
  state.searchFilter = filter;
  updateFilteredTasks(state);
  state.currentTaskIndex = 0;
}

function cycleSortMode(state: TUIState): void {
  const modes: Array<'priority' | 'date' | 'project' | 'context'> = ['priority', 'date', 'project', 'context'];
  const currentIndex = modes.indexOf(state.sortMode);
  state.sortMode = modes[(currentIndex + 1) % modes.length]!;
  updateFilteredTasks(state);
}

async function promptInput(
  state: TUIState,
  prompt: string,
  defaultValue: string = '',
  onInputChange?: (value: string) => void
): Promise<string | null> {
  return new Promise((resolve) => {
    // Remove all existing keypress listeners to prevent interference
    stdin.removeAllListeners('keypress');

    // Activate command bar
    state.commandBarActive = true;
    state.commandBarPrompt = prompt;
    state.commandBarInput = defaultValue;
    state.commandBarCursor = defaultValue.length;

    // Debounce timer for live updates
    let debounceTimer: Timer | null = null;

    const renderCommandBar = () => {
      render(state);
    };

    renderCommandBar();

    // Trigger initial callback if provided
    if (onInputChange && defaultValue) {
      onInputChange(defaultValue);
    }

    const cleanupAndRestore = (result: string | null) => {
      stdin.removeListener('keypress', onKeypress);

      // Clear any pending debounce timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Deactivate command bar
      state.commandBarActive = false;
      state.commandBarPrompt = undefined;
      state.commandBarInput = undefined;
      state.commandBarCursor = undefined;

      // Restore main keypress handler
      if (state.mainKeypressHandler) {
        stdin.on('keypress', state.mainKeypressHandler);
      }

      // Re-render without command bar
      render(state);

      resolve(result);
    };

    const triggerInputChange = (value: string) => {
      if (onInputChange) {
        // Clear existing timer
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        // Set new debounced callback (150ms delay)
        debounceTimer = setTimeout(() => {
          onInputChange(value);
          renderCommandBar();
        }, 150);
      }
    };

    const onKeypress = (str: string, key: any) => {
      if (!key) return;

      const input = state.commandBarInput || '';
      const cursorPos = state.commandBarCursor || 0;

      // ONLY handle specific edit keys - ignore everything else
      if (key.name === 'return') {
        // Save and exit
        cleanupAndRestore(input);
      } else if (key.name === 'escape') {
        // Cancel
        cleanupAndRestore(null);
      } else if (key.name === 'backspace') {
        // Delete character before cursor
        if (cursorPos > 0) {
          const newInput = input.slice(0, cursorPos - 1) + input.slice(cursorPos);
          state.commandBarInput = newInput;
          state.commandBarCursor = cursorPos - 1;
          renderCommandBar();
          triggerInputChange(newInput);
        }
      } else if (key.name === 'delete') {
        // Delete character at cursor
        if (cursorPos < input.length) {
          const newInput = input.slice(0, cursorPos) + input.slice(cursorPos + 1);
          state.commandBarInput = newInput;
          renderCommandBar();
          triggerInputChange(newInput);
        }
      } else if (key.name === 'left') {
        // Move cursor left
        if (cursorPos > 0) {
          state.commandBarCursor = cursorPos - 1;
          renderCommandBar();
        }
      } else if (key.name === 'right') {
        // Move cursor right
        if (cursorPos < input.length) {
          state.commandBarCursor = cursorPos + 1;
          renderCommandBar();
        }
      } else if (key.name === 'home' || (key.ctrl && key.name === 'a')) {
        // Move to start
        state.commandBarCursor = 0;
        renderCommandBar();
      } else if (key.name === 'end' || (key.ctrl && key.name === 'e')) {
        // Move to end
        state.commandBarCursor = input.length;
        renderCommandBar();
      } else if (str && str.length === 1 && !key.ctrl && !key.meta) {
        // Insert character (only printable characters)
        const newInput = input.slice(0, cursorPos) + str + input.slice(cursorPos);
        state.commandBarInput = newInput;
        state.commandBarCursor = cursorPos + 1;
        renderCommandBar();
        triggerInputChange(newInput);
      }
      // All other keys are ignored during edit mode
    };

    stdin.on('keypress', onKeypress);
  });
}

async function cleanup(): Promise<void> {
  if (stdin.isTTY) {
    stdin.setRawMode(false);
  }
  stdout.write('\x1b[?25h'); // Show cursor
  clearScreen();
  stdout.write(chalk.green('✨ Done! Your tasks are saved.\n'));
}
