import { useCallback } from 'react';
import { useKeyboard as useOpenTUIKeyboard, useAppContext } from '@opentui/react';
import { useTodoStore, FocusedPanel } from '../store/useTodoStore.ts';
import { saveTasks } from '../../storage.ts';

// Panel navigation order (stats removed - it's in header now)
const PANELS: FocusedPanel[] = ['tasks', 'priorities', 'projects', 'contexts'];

// All possible priorities by mode
const ALL_LETTER_PRIORITIES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
const ALL_NUMBER_PRIORITIES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function useKeyboardNavigation(filePath?: string) {
  const appContext = useAppContext();
  const {
    tasks,
    filteredTasks,
    currentTaskIndex,
    focusedPanel,
    panelCursorIndex,
    projectsCursorIndex,
    contextsCursorIndex,
    activeFilter,
    commandBarActive,
    showHelp,
    showSettings,
    priorityMode,
    setCurrentTaskIndex,
    setFocusedPanel,
    setPanelCursorIndex,
    setProjectsCursorIndex,
    setContextsCursorIndex,
    toggleShowCompleted,
    toggleHighlightOverdue,
    setActiveFilter,
    cycleSortMode,
    toggleTaskCompletion,
    undo,
    saveHistory,
    updateFilteredTasks,
    openCommandBar,
    toggleHelp,
    toggleSettings,
    yankTask,
    pasteTask,
    logCommand,
  } = useTodoStore();

  // Helper to get current cursor index for focused panel
  const getCurrentCursorIndex = useCallback((): number => {
    if (focusedPanel === 'projects') return projectsCursorIndex;
    if (focusedPanel === 'contexts') return contextsCursorIndex;
    return panelCursorIndex;
  }, [focusedPanel, panelCursorIndex, projectsCursorIndex, contextsCursorIndex]);

  // Helper to set cursor index for focused panel
  const setCurrentCursorIndex = useCallback((index: number) => {
    if (focusedPanel === 'projects') {
      setProjectsCursorIndex(index);
    } else if (focusedPanel === 'contexts') {
      setContextsCursorIndex(index);
    } else {
      setPanelCursorIndex(index);
    }
  }, [focusedPanel, setPanelCursorIndex, setProjectsCursorIndex, setContextsCursorIndex]);

  // Get shown priorities based on mode (all priorities for current mode)
  const getShownPriorities = useCallback((): string[] => {
    return priorityMode === 'letter' ? ALL_LETTER_PRIORITIES : ALL_NUMBER_PRIORITIES;
  }, [priorityMode]);

  // Get max index for current panel
  const getPanelMaxIndex = useCallback((panel: FocusedPanel): number => {
    if (panel === 'tasks') return filteredTasks.length;
    if (panel === 'priorities') return getShownPriorities().length;
    if (panel === 'stats') return 3; // DUE/OVERDUE, DONE TODAY, ACTIVE

    // For projects and contexts, count unique tags
    const tags = new Set<string>();
    for (const task of tasks) {
      const tagList = panel === 'projects' ? task.projects : task.contexts;
      for (const tag of tagList) {
        tags.add(tag);
      }
    }
    return tags.size;
  }, [tasks, filteredTasks, getShownPriorities]);

  // Apply filter based on panel selection
  const applyPanelFilter = useCallback(() => {
    if (focusedPanel === 'priorities') {
      const priorities = getShownPriorities();
      const priority = priorities[panelCursorIndex];
      if (priority !== undefined) {
        setActiveFilter({ type: 'priority', value: priority });
      }
    } else if (focusedPanel === 'stats') {
      if (panelCursorIndex === 0) {
        setActiveFilter({ type: 'dueOverdue', value: 'dueOverdue' });
      } else if (panelCursorIndex === 1) {
        setActiveFilter({ type: 'doneToday', value: 'doneToday' });
      } else if (panelCursorIndex === 2) {
        setActiveFilter({ type: 'active', value: 'active' });
      }
    } else if (focusedPanel === 'projects') {
      const allProjects = new Set<string>();
      for (const task of tasks) {
        for (const project of task.projects) {
          allProjects.add(project);
        }
      }
      const projectsList = Array.from(allProjects).sort();
      const project = projectsList[projectsCursorIndex];
      if (project !== undefined) {
        setActiveFilter({ type: 'project', value: project });
      }
    } else if (focusedPanel === 'contexts') {
      const allContexts = new Set<string>();
      for (const task of tasks) {
        for (const context of task.contexts) {
          allContexts.add(context);
        }
      }
      const contextsList = Array.from(allContexts).sort();
      const context = contextsList[contextsCursorIndex];
      if (context !== undefined) {
        setActiveFilter({ type: 'context', value: context });
      }
    }

    setFocusedPanel('tasks');
    setCurrentTaskIndex(0);
  }, [focusedPanel, panelCursorIndex, projectsCursorIndex, contextsCursorIndex, tasks, setActiveFilter, setFocusedPanel, setCurrentTaskIndex, getShownPriorities]);

  // Use OpenTUI's keyboard hook
  useOpenTUIKeyboard((key: any) => {
    const keyName = key.name || key.char;
    const shift = key.shift || false;
    const ctrl = key.ctrl || false;

    // If command bar is active, let it handle keys
    if (commandBarActive) {
      return;
    }

    // If settings is showing, let it handle keys
    if (showSettings) {
      return;
    }

    // If help is showing, any key closes it
    if (showHelp) {
      toggleHelp();
      return;
    }

    // Ctrl+C to quit - use renderer's cleanup if available, otherwise fallback to process.exit
    if (ctrl && keyName === 'c') {
      // Attempt graceful shutdown through OpenTUI renderer
      if (appContext?.renderer?.cleanup) {
        appContext.renderer.cleanup();
      }
      process.exit(0);
    }

    // : - open command mode (vim style)
    if (key.sequence === ':' || keyName === ':') {
      openCommandBar('command', ':');
      return;
    }


    if (keyName === 'escape') {
      if (focusedPanel !== 'tasks') {
        setFocusedPanel('tasks');
        setPanelCursorIndex(0);
      } else if (activeFilter) {
        setActiveFilter(undefined);
        setCurrentTaskIndex(0);
      }
      return;
    }

    // Tab - cycle panels
    if (keyName === 'tab') {
      const currentIndex = PANELS.indexOf(focusedPanel);
      const nextIndex = (currentIndex + 1) % PANELS.length;
      const nextPanel = PANELS[nextIndex];
      if (nextPanel !== undefined) {
        setFocusedPanel(nextPanel);
        setPanelCursorIndex(0);
      }
      return;
    }

    // Navigation - up/k
    if (keyName === 'up' || keyName === 'k') {
      if (focusedPanel === 'tasks') {
        if (currentTaskIndex > 0) {
          setCurrentTaskIndex(currentTaskIndex - 1);
        }
      } else {
        const currentIdx = getCurrentCursorIndex();
        if (currentIdx > 0) {
          setCurrentCursorIndex(currentIdx - 1);
        }
      }
      return;
    }

    // Navigation - down/j
    if (keyName === 'down' || keyName === 'j') {
      if (focusedPanel === 'tasks') {
        if (currentTaskIndex < filteredTasks.length - 1) {
          setCurrentTaskIndex(currentTaskIndex + 1);
        }
      } else {
        const maxIndex = getPanelMaxIndex(focusedPanel);
        const currentIdx = getCurrentCursorIndex();
        if (currentIdx < maxIndex - 1) {
          setCurrentCursorIndex(currentIdx + 1);
        }
      }
      return;
    }

    // Go to top - g
    if (keyName === 'g' && !shift) {
      if (focusedPanel === 'tasks') {
        setCurrentTaskIndex(0);
      } else {
        setCurrentCursorIndex(0);
      }
      return;
    }

    // Go to bottom - G (shift+g)
    if (keyName === 'g' && shift) {
      if (focusedPanel === 'tasks') {
        setCurrentTaskIndex(Math.max(0, filteredTasks.length - 1));
      } else {
        const maxIndex = getPanelMaxIndex(focusedPanel);
        setCurrentCursorIndex(Math.max(0, maxIndex - 1));
      }
      return;
    }

    // Enter - apply filter from panel OR edit task in tasks panel
    if (keyName === 'return' || keyName === 'enter') {
      if (focusedPanel === 'tasks') {
        // Edit task
        const task = filteredTasks[currentTaskIndex];
        if (task) {
          openCommandBar('editTask', 'Edit task:', task.text);
        }
      } else {
        applyPanelFilter();
      }
      return;
    }

    // Space - toggle completion
    if (keyName === 'space' || keyName === ' ') {
      if (focusedPanel === 'tasks') {
        const task = filteredTasks[currentTaskIndex];
        logCommand(`toggle: ${task?.text?.substring(0, 30) || 'task'}...`);
        toggleTaskCompletion(filePath);
      }
      return;
    }

    // v - toggle show completed
    if (keyName === 'v') {
      logCommand('toggle show completed');
      toggleShowCompleted();
      return;
    }

    // s - cycle sort mode
    if (keyName === 's') {
      logCommand('cycle sort mode');
      cycleSortMode();
      return;
    }

    // u - undo
    if (keyName === 'u') {
      logCommand('undo');
      undo(filePath);
      return;
    }

    // Priority setting - depends on priorityMode
    // Letter mode: Shift+A-Z sets priority
    // Number mode: 0-9 sets priority directly, or Shift+1-9 (symbols !@#$%^&*())
    if (focusedPanel === 'tasks') {
      const task = filteredTasks[currentTaskIndex];
      if (task) {
        let newPriority: string | null = null;

        // Letter mode: Shift+Letter
        if (priorityMode === 'letter' && shift) {
          const char = key.sequence || key.char || '';
          if (/^[A-Z]$/.test(char)) {
            newPriority = char;
          }
        }

        // Number mode: direct 0-9 or Shift+number symbols
        if (priorityMode === 'number') {
          const char = key.sequence || key.char || '';
          // Direct number keys
          if (/^[0-9]$/.test(char)) {
            newPriority = char;
          }
          // Shift+number produces symbols - map them back
          if (shift) {
            const shiftNumberMap: Record<string, string> = {
              '!': '1', '@': '2', '#': '3', '$': '4', '%': '5',
              '^': '6', '&': '7', '*': '8', '(': '9', ')': '0'
            };
            if (shiftNumberMap[char]) {
              newPriority = shiftNumberMap[char];
            }
          }
        }

        if (newPriority) {
          const taskInList = tasks.find(t => t.id === task.id);
          if (taskInList) {
            logCommand(`set priority (${newPriority})`);
            saveHistory();
            taskInList.priority = newPriority;
            saveTasks(tasks, filePath);
            updateFilteredTasks();
          }
          return;
        }
      }
    }

    // n or a - new task
    if (keyName === 'n' || keyName === 'a') {
      logCommand('new task');
      openCommandBar('newTask', 'New task:');
      return;
    }

    // e or i - edit task (Enter is handled above)
    if ((keyName === 'e' || keyName === 'i') && focusedPanel === 'tasks') {
      const task = filteredTasks[currentTaskIndex];
      if (task) {
        logCommand('edit task');
        openCommandBar('editTask', 'Edit task:', task.text);
      }
      return;
    }

    // / - search
    if (keyName === '/') {
      logCommand('search');
      openCommandBar('search', 'Search:');
      return;
    }

    // d - add due date
    if (keyName === 'd' && focusedPanel === 'tasks') {
      logCommand('add due date');
      openCommandBar('addDueDate', 'Due date (YYYY-MM-DD):');
      return;
    }

    // ? - help
    if (keyName === '?' || (shift && keyName === '/')) {
      toggleHelp();
      return;
    }

    // o - toggle highlight overdue
    if (keyName === 'o') {
      toggleHighlightOverdue();
      return;
    }

    // y - yank (copy) task
    if (keyName === 'y' && focusedPanel === 'tasks') {
      logCommand('yank task');
      yankTask();
      return;
    }

    // p - paste task
    if (keyName === 'p' && !shift && focusedPanel === 'tasks') {
      logCommand('paste task');
      pasteTask(filePath);
      return;
    }

    // , - open settings
    if (key.sequence === ',' || keyName === ',') {
      toggleSettings();
      return;
    }
  });
}
