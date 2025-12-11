import { create } from 'zustand';
import type { Task } from '../../parser/index.ts';
import { convertPriorities } from '../../parser/parser.ts';
import { saveTasks } from '../../storage.ts';
import { saveConfig, type Config } from '../../config.ts';

export type SortMode = 'priority' | 'date' | 'project' | 'context';
export type FocusedPanel = 'tasks' | 'priorities' | 'stats' | 'projects' | 'contexts';
export type FilterType = 'priority' | 'project' | 'context' | 'dueOverdue' | 'doneToday' | 'active';
export type PriorityMode = 'letter' | 'number';

export interface ActiveFilter {
  type: FilterType;
  value: string;
}

interface TodoState {
  // Data
  tasks: Task[];
  filteredTasks: Task[];
  filePath?: string;

  // UI State
  currentTaskIndex: number;
  currentElementIndex: number;
  focusedPanel: FocusedPanel;
  panelCursorIndex: number;
  projectsCursorIndex: number;
  contextsCursorIndex: number;
  showCompleted: boolean;
  highlightOverdue: boolean;
  sortMode: SortMode;

  // Filters
  searchFilter: string;
  activeFilter?: ActiveFilter;

  // Command bar
  commandBarActive: boolean;
  commandBarMode: 'none' | 'newTask' | 'editTask' | 'search' | 'addProject' | 'addContext' | 'addDueDate' | 'confirm' | 'command';
  commandBarPrompt: string;
  commandBarDefaultValue: string;
  commandBarData?: any;

  // Help/Overlay
  showHelp: boolean;
  showThemeSelector: boolean;
  showSettings: boolean;

  // Priority format mismatch dialog
  showFormatMismatchDialog: boolean;
  detectedFormat: 'letter' | 'number' | 'mixed' | 'none';

  // Theme
  currentTheme: string;

  // Config
  priorityMode: PriorityMode;

  // History
  history: Task[][];

  // Clipboard (for yank/paste)
  yankedTask: Task | null;

  // Command log
  commandLog: string[];

  // Actions: Data
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: number, updates: Partial<Task>) => void;
  deleteTask: (id: number) => void;

  // Actions: UI
  setCurrentTaskIndex: (index: number) => void;
  setCurrentElementIndex: (index: number) => void;
  setFocusedPanel: (panel: FocusedPanel) => void;
  setPanelCursorIndex: (index: number) => void;
  setProjectsCursorIndex: (index: number) => void;
  setContextsCursorIndex: (index: number) => void;
  setShowCompleted: (show: boolean) => void;
  toggleShowCompleted: () => void;
  setHighlightOverdue: (highlight: boolean) => void;
  toggleHighlightOverdue: () => void;
  setSortMode: (mode: SortMode) => void;
  cycleSortMode: () => void;

  // Actions: Filters
  setSearchFilter: (filter: string) => void;
  setActiveFilter: (filter?: ActiveFilter) => void;
  clearFilters: () => void;

  // Actions: Command bar
  openCommandBar: (mode: TodoState['commandBarMode'], prompt: string, defaultValue?: string, data?: any) => void;
  closeCommandBar: () => void;
  handleCommandBarSubmit: (value: string, filePath?: string) => Promise<void>;

  // Actions: Help/Theme/Settings
  toggleHelp: () => void;
  toggleThemeSelector: () => void;
  setTheme: (themeName: string) => void;
  toggleSettings: () => void;
  setPriorityMode: (mode: PriorityMode) => void;

  // Actions: Format mismatch dialog
  showFormatMismatch: (detectedFormat: 'letter' | 'number' | 'mixed' | 'none') => void;
  hideFormatMismatch: () => void;
  convertTasksToFormat: (targetFormat: 'letter' | 'number', filePath?: string) => Promise<void>;

  // Actions: History
  saveToHistory: () => void;
  saveHistory: () => void; // Alias for saveToHistory
  undo: (filePath?: string) => Promise<void>;

  // Actions: Task operations with file save
  toggleTaskCompletion: (filePath?: string) => Promise<void>;

  // Actions: Clipboard
  yankTask: () => void;
  pasteTask: (filePath?: string) => Promise<void>;

  // Actions: Command log
  logCommand: (command: string) => void;

  // Actions: Computed
  updateFilteredTasks: () => void;
}

const isOverdue = (task: Task): boolean => {
  if (!task.metadata.due) return false;
  const dueDate = task.metadata.due;
  const today = new Date().toISOString().split('T')[0];
  return dueDate < today && !task.completed;
};

const isDueToday = (task: Task): boolean => {
  if (!task.metadata.due) return false;
  const today = new Date().toISOString().split('T')[0];
  return task.metadata.due === today && !task.completed;
};

const isCompletedToday = (task: Task): boolean => {
  if (!task.completed || !task.completionDate) return false;
  const today = new Date().toISOString().split('T')[0];
  return task.completionDate === today;
};

export const useTodoStore = create<TodoState>((set, get) => ({
  // Initial State
  tasks: [],
  filteredTasks: [],
  currentTaskIndex: 0,
  currentElementIndex: 0,
  focusedPanel: 'tasks',
  panelCursorIndex: 0,
  projectsCursorIndex: 0,
  contextsCursorIndex: 0,
  showCompleted: false,
  highlightOverdue: false,
  sortMode: 'priority',
  searchFilter: '',
  commandBarActive: false,
  commandBarMode: 'none',
  commandBarPrompt: '',
  commandBarDefaultValue: '',
  showHelp: false,
  showThemeSelector: false,
  showSettings: false,
  showFormatMismatchDialog: false,
  detectedFormat: 'none',
  currentTheme: 'catppuccin',
  priorityMode: 'letter',
  history: [],
  yankedTask: null,
  commandLog: [],

  // Data Actions
  setTasks: (tasks) => {
    set({ tasks });
    get().updateFilteredTasks();
  },

  addTask: (task) => {
    get().saveToHistory();
    set((state) => ({ tasks: [...state.tasks, task] }));
    get().updateFilteredTasks();
  },

  updateTask: (id, updates) => {
    get().saveToHistory();
    set((state) => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
    }));
    get().updateFilteredTasks();
  },

  deleteTask: (id) => {
    get().saveToHistory();
    set((state) => ({ tasks: state.tasks.filter(t => t.id !== id) }));
    get().updateFilteredTasks();
  },

  // UI Actions
  setCurrentTaskIndex: (index) => set({ currentTaskIndex: index }),
  setCurrentElementIndex: (index) => set({ currentElementIndex: index }),
  setFocusedPanel: (panel) => set({ focusedPanel: panel, panelCursorIndex: 0 }),
  setPanelCursorIndex: (index) => set({ panelCursorIndex: index }),
  setProjectsCursorIndex: (index) => set({ projectsCursorIndex: index }),
  setContextsCursorIndex: (index) => set({ contextsCursorIndex: index }),
  setShowCompleted: (show) => {
    set({ showCompleted: show });
    get().updateFilteredTasks();
  },
  toggleShowCompleted: () => {
    const { showCompleted, currentTaskIndex, filteredTasks } = get();
    set({ showCompleted: !showCompleted });
    get().updateFilteredTasks();
    // Adjust currentTaskIndex if it's out of bounds
    const newFiltered = get().filteredTasks;
    if (currentTaskIndex >= newFiltered.length) {
      set({ currentTaskIndex: Math.max(0, newFiltered.length - 1) });
    }
  },
  setHighlightOverdue: (highlight) => set({ highlightOverdue: highlight }),
  toggleHighlightOverdue: () => {
    set((state) => ({ highlightOverdue: !state.highlightOverdue }));
  },
  setSortMode: (mode) => {
    set({ sortMode: mode });
    get().updateFilteredTasks();
  },
  cycleSortMode: () => {
    const modes: SortMode[] = ['priority', 'date', 'project', 'context'];
    const { sortMode } = get();
    const currentIndex = modes.indexOf(sortMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    set({ sortMode: modes[nextIndex] });
    get().updateFilteredTasks();
  },

  // Filter Actions
  setSearchFilter: (filter) => {
    set({ searchFilter: filter });
    get().updateFilteredTasks();
  },

  setActiveFilter: (filter) => {
    set({ activeFilter: filter });
    get().updateFilteredTasks();
    if (filter) {
      set({ focusedPanel: 'tasks', currentTaskIndex: 0 });
    }
  },

  clearFilters: () => {
    set({ activeFilter: undefined, searchFilter: '' });
    get().updateFilteredTasks();
  },

  // Command bar actions
  openCommandBar: (mode, prompt, defaultValue = '', data) => {
    set({
      commandBarActive: true,
      commandBarMode: mode,
      commandBarPrompt: prompt,
      commandBarDefaultValue: defaultValue,
      commandBarData: data,
    });
  },

  closeCommandBar: () => {
    set({
      commandBarActive: false,
      commandBarMode: 'none',
      commandBarPrompt: '',
      commandBarDefaultValue: '',
      commandBarData: undefined,
    });
  },

  handleCommandBarSubmit: async (value, filePath) => {
    const { commandBarMode, filteredTasks, currentTaskIndex, tasks, commandBarData } = get();
    const today = new Date().toISOString().split('T')[0];

    if (commandBarMode === 'newTask' && value.trim()) {
      get().saveToHistory();

      // Parse priority from task text
      let priority: string | null = null;
      let cleanText = value;
      const priorityMatch = value.match(/^\(([A-Z])\)\s+(.+)$/);
      if (priorityMatch) {
        priority = priorityMatch[1]!;
        cleanText = priorityMatch[2]!;
      }

      const newTask: Task = {
        id: tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1,
        completed: false,
        priority,
        completionDate: null,
        creationDate: today,
        text: cleanText,
        contexts: (cleanText.match(/@\S+/g) || []).map(c => c.substring(1)),
        projects: (cleanText.match(/\+\S+/g) || []).map(p => p.substring(1)),
        metadata: {},
      };

      // Parse metadata
      const metadataMatches = cleanText.match(/(\S+):(\S+)/g);
      if (metadataMatches) {
        for (const match of metadataMatches) {
          const [key, val] = match.split(':');
          if (key && val && !key.startsWith('@') && !key.startsWith('+')) {
            newTask.metadata[key] = val;
          }
        }
      }

      const updatedTasks = [...tasks, newTask];
      set({ tasks: updatedTasks });
      get().updateFilteredTasks();

      // Move to the new task
      const newFilteredTasks = get().filteredTasks;
      const newTaskIndex = newFilteredTasks.findIndex(t => t.id === newTask.id);
      if (newTaskIndex >= 0) {
        set({ currentTaskIndex: newTaskIndex });
      }

      if (filePath) {
        await saveTasks(updatedTasks, filePath);
      }
    } else if (commandBarMode === 'editTask' && value.trim()) {
      const task = filteredTasks[currentTaskIndex];
      if (task && value !== task.text) {
        get().saveToHistory();

        const updatedTasks = tasks.map(t => {
          if (t.id === task.id) {
            return {
              ...t,
              text: value,
              contexts: (value.match(/@\S+/g) || []).map(c => c.substring(1)),
              projects: (value.match(/\+\S+/g) || []).map(p => p.substring(1)),
              metadata: {},
            };
          }
          return t;
        });

        // Parse metadata for updated task
        const taskIndex = updatedTasks.findIndex(t => t.id === task.id);
        if (taskIndex >= 0) {
          const metadataMatches = value.match(/(\S+):(\S+)/g);
          if (metadataMatches) {
            for (const match of metadataMatches) {
              const [key, val] = match.split(':');
              if (key && val && !key.startsWith('@') && !key.startsWith('+')) {
                updatedTasks[taskIndex]!.metadata[key] = val;
              }
            }
          }
        }

        set({ tasks: updatedTasks });
        get().updateFilteredTasks();

        if (filePath) {
          await saveTasks(updatedTasks, filePath);
        }
      }
    } else if (commandBarMode === 'search') {
      set({ searchFilter: value });
      get().updateFilteredTasks();
      set({ currentTaskIndex: 0 });
    } else if (commandBarMode === 'addProject' && value.trim()) {
      const task = filteredTasks[currentTaskIndex];
      if (task && !task.projects.includes(value)) {
        get().saveToHistory();

        const updatedTasks = tasks.map(t => {
          if (t.id === task.id) {
            return {
              ...t,
              projects: [...t.projects, value],
              text: t.text + ` +${value}`,
            };
          }
          return t;
        });

        set({ tasks: updatedTasks });
        get().updateFilteredTasks();

        if (filePath) {
          await saveTasks(updatedTasks, filePath);
        }
      }
    } else if (commandBarMode === 'addContext' && value.trim()) {
      const task = filteredTasks[currentTaskIndex];
      if (task && !task.contexts.includes(value)) {
        get().saveToHistory();

        const updatedTasks = tasks.map(t => {
          if (t.id === task.id) {
            return {
              ...t,
              contexts: [...t.contexts, value],
              text: t.text + ` @${value}`,
            };
          }
          return t;
        });

        set({ tasks: updatedTasks });
        get().updateFilteredTasks();

        if (filePath) {
          await saveTasks(updatedTasks, filePath);
        }
      }
    } else if (commandBarMode === 'addDueDate' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const task = filteredTasks[currentTaskIndex];
      if (task) {
        get().saveToHistory();

        const updatedTasks = tasks.map(t => {
          if (t.id === task.id) {
            const newMetadata = { ...t.metadata, due: value };
            let newText = t.text;
            if (t.metadata.due) {
              newText = newText.replace(/due:\S+/, `due:${value}`);
            } else {
              newText += ` due:${value}`;
            }
            return {
              ...t,
              metadata: newMetadata,
              text: newText,
            };
          }
          return t;
        });

        set({ tasks: updatedTasks });
        get().updateFilteredTasks();

        if (filePath) {
          await saveTasks(updatedTasks, filePath);
        }
      }
    } else if (commandBarMode === 'command') {
      // Handle vim-style : commands
      const cmd = value.trim().toLowerCase();

      if (cmd === 'q' || cmd === 'quit') {
        process.exit(0);
      } else if (cmd === 'q!' || cmd === 'quit!') {
        process.exit(0);
      } else if (cmd === 'w' || cmd === 'write') {
        if (filePath) {
          await saveTasks(tasks, filePath);
          get().logCommand('wrote file');
        }
      } else if (cmd === 'wq' || cmd === 'wq!' || cmd === 'x') {
        if (filePath) {
          await saveTasks(tasks, filePath);
        }
        process.exit(0);
      } else if (cmd === 'help' || cmd === 'h') {
        get().toggleHelp();
      } else if (cmd === 'set' || cmd === 'settings') {
        get().toggleSettings();
      } else if (cmd === 'e' || cmd === 'edit' || cmd === 'e!' || cmd === 'reload') {
        // Reload from file - handled by caller via return value
        // For now just log it
        get().logCommand('reload file');
      } else if (cmd === 'sort priority' || cmd === 'sort p') {
        get().setSortMode('priority');
        get().logCommand('sort: priority');
      } else if (cmd === 'sort date' || cmd === 'sort d') {
        get().setSortMode('date');
        get().logCommand('sort: date');
      } else if (cmd === 'sort project') {
        get().setSortMode('project');
        get().logCommand('sort: project');
      } else if (cmd === 'sort context') {
        get().setSortMode('context');
        get().logCommand('sort: context');
      } else if (cmd === 'u' || cmd === 'undo') {
        await get().undo(filePath);
      } else if (cmd.startsWith('theme ')) {
        const themeName = value.trim().substring(6);
        get().setTheme(themeName);
        get().logCommand(`theme: ${themeName}`);
      } else if (cmd) {
        get().logCommand(`unknown: ${cmd}`);
      }
    }

    get().closeCommandBar();
  },

  // Help/Theme actions
  toggleHelp: () => {
    set((state) => ({ showHelp: !state.showHelp }));
  },

  toggleThemeSelector: () => {
    set((state) => ({ showThemeSelector: !state.showThemeSelector }));
  },

  setTheme: (themeName) => {
    set({ currentTheme: themeName });
  },
  toggleSettings: () => {
    set((state) => ({ showSettings: !state.showSettings }));
  },
  setPriorityMode: (mode) => {
    set({ priorityMode: mode });
  },

  // Format mismatch dialog actions
  showFormatMismatch: (detectedFormat) => {
    set({ showFormatMismatchDialog: true, detectedFormat });
  },

  hideFormatMismatch: () => {
    set({ showFormatMismatchDialog: false });
  },

  convertTasksToFormat: async (targetFormat, filePath) => {
    const { tasks } = get();
    get().saveToHistory();

    const convertedTasks = convertPriorities(tasks, targetFormat);
    set({ tasks: convertedTasks });
    get().updateFilteredTasks();

    if (filePath) {
      await saveTasks(convertedTasks, filePath);
    }

    get().hideFormatMismatch();
  },

  // History Actions
  saveToHistory: () => {
    set((state) => {
      const newHistory = [...state.history, JSON.parse(JSON.stringify(state.tasks))];
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      return { history: newHistory };
    });
  },

  saveHistory: () => {
    // Alias for saveToHistory
    get().saveToHistory();
  },

  undo: async (filePath) => {
    const { history } = get();
    if (history.length === 0) return;

    const previousTasks = history[history.length - 1];
    set({
      tasks: previousTasks,
      history: history.slice(0, -1)
    });
    get().updateFilteredTasks();

    if (filePath) {
      await saveTasks(previousTasks!, filePath);
    }
  },

  // Task operations with file save
  toggleTaskCompletion: async (filePath) => {
    const { filteredTasks, currentTaskIndex, tasks } = get();
    const task = filteredTasks[currentTaskIndex];
    if (!task) return;

    get().saveToHistory();
    const today = new Date().toISOString().split('T')[0];

    const updatedTasks = tasks.map(t => {
      if (t.id === task.id) {
        return {
          ...t,
          completed: !t.completed,
          completionDate: !t.completed ? today : null
        };
      }
      return t;
    });

    set({ tasks: updatedTasks });
    get().updateFilteredTasks();

    if (filePath) {
      await saveTasks(updatedTasks, filePath);
    }
  },

  // Clipboard Actions
  yankTask: () => {
    const { filteredTasks, currentTaskIndex } = get();
    const task = filteredTasks[currentTaskIndex];
    if (task) {
      // Deep copy the task
      set({ yankedTask: JSON.parse(JSON.stringify(task)) });
    }
  },

  pasteTask: async (filePath) => {
    const { yankedTask, tasks } = get();
    if (!yankedTask) return;

    get().saveToHistory();
    const today = new Date().toISOString().split('T')[0];

    // Create a new task based on the yanked one
    const newTask: Task = {
      ...JSON.parse(JSON.stringify(yankedTask)),
      id: tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1,
      completed: false,
      completionDate: null,
      creationDate: today,
    };

    const updatedTasks = [...tasks, newTask];
    set({ tasks: updatedTasks });
    get().updateFilteredTasks();

    // Move to the new task
    const newFilteredTasks = get().filteredTasks;
    const newTaskIndex = newFilteredTasks.findIndex(t => t.id === newTask.id);
    if (newTaskIndex >= 0) {
      set({ currentTaskIndex: newTaskIndex });
    }

    if (filePath) {
      await saveTasks(updatedTasks, filePath);
    }
  },

  // Command log action
  logCommand: (command) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    set((state) => {
      const newLog = [...state.commandLog, `${timestamp} ${command}`];
      // Keep only last 100 entries
      if (newLog.length > 100) {
        newLog.shift();
      }
      return { commandLog: newLog };
    });
  },

  // Computed Actions
  updateFilteredTasks: () => {
    const { tasks, showCompleted, searchFilter, activeFilter, sortMode } = get();

    let filtered = tasks.filter(task => {
      // Apply active filter first
      if (activeFilter) {
        const filter = activeFilter;
        if (filter.type === 'priority' && task.priority !== filter.value) return false;
        if (filter.type === 'project' && !task.projects.includes(filter.value)) return false;
        if (filter.type === 'context' && !task.contexts.includes(filter.value)) return false;
        if (filter.type === 'dueOverdue' && !isOverdue(task) && !isDueToday(task)) return false;
        if (filter.type === 'doneToday' && !isCompletedToday(task)) return false;
        if (filter.type === 'active' && task.completed) return false;
      } else {
        // Only apply showCompleted filter if no active filter
        if (!showCompleted && task.completed) return false;
      }

      // Search filter
      if (searchFilter) {
        const search = searchFilter.toLowerCase();
        return task.text.toLowerCase().includes(search) ||
               task.contexts.some(c => c.toLowerCase().includes(search)) ||
               task.projects.some(p => p.toLowerCase().includes(search));
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;

      switch (sortMode) {
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

    set({ filteredTasks: filtered });
  },
}));
