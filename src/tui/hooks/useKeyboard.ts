import { useCallback } from 'react';
import { useKeyboard as useOpenTUIKeyboard } from '@opentui/react';
import { useTodoStore, FocusedPanel } from '../store/useTodoStore.ts';
import { saveTasks } from '../../storage.ts';

// Panel navigation order
const PANELS: FocusedPanel[] = ['tasks', 'priorities', 'stats', 'projects', 'contexts'];

export function useKeyboardNavigation(filePath?: string) {
  const {
    tasks,
    filteredTasks,
    currentTaskIndex,
    focusedPanel,
    panelCursorIndex,
    activeFilter,
    commandBarActive,
    showHelp,
    showThemeSelector,
    setCurrentTaskIndex,
    setFocusedPanel,
    setPanelCursorIndex,
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
    toggleThemeSelector,
  } = useTodoStore();

  // Get max index for current panel
  const getPanelMaxIndex = useCallback((panel: FocusedPanel): number => {
    if (panel === 'tasks') return filteredTasks.length;
    if (panel === 'priorities') return 26; // A-Z
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
  }, [tasks, filteredTasks]);

  // Apply filter based on panel selection
  const applyPanelFilter = useCallback(() => {
    const index = panelCursorIndex;

    if (focusedPanel === 'priorities') {
      const priorities: string[] = [];
      for (let i = 0; i < 26; i++) {
        priorities.push(String.fromCharCode('A'.charCodeAt(0) + i));
      }
      if (index < priorities.length) {
        setActiveFilter({ type: 'priority', value: priorities[index]! });
      }
    } else if (focusedPanel === 'stats') {
      if (index === 0) {
        setActiveFilter({ type: 'dueOverdue', value: 'dueOverdue' });
      } else if (index === 1) {
        setActiveFilter({ type: 'doneToday', value: 'doneToday' });
      } else if (index === 2) {
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
      if (index < projectsList.length) {
        setActiveFilter({ type: 'project', value: projectsList[index]! });
      }
    } else if (focusedPanel === 'contexts') {
      const allContexts = new Set<string>();
      for (const task of tasks) {
        for (const context of task.contexts) {
          allContexts.add(context);
        }
      }
      const contextsList = Array.from(allContexts).sort();
      if (index < contextsList.length) {
        setActiveFilter({ type: 'context', value: contextsList[index]! });
      }
    }

    setFocusedPanel('tasks');
    setCurrentTaskIndex(0);
  }, [focusedPanel, panelCursorIndex, tasks, setActiveFilter, setFocusedPanel, setCurrentTaskIndex]);

  // Use OpenTUI's keyboard hook
  useOpenTUIKeyboard((key: any) => {
    const keyName = key.name || key.char;
    const shift = key.shift || false;
    const ctrl = key.ctrl || false;

    // If command bar is active, let it handle keys
    if (commandBarActive) {
      return;
    }

    // If theme selector is showing, let it handle keys
    if (showThemeSelector) {
      return;
    }

    // If help is showing, any key closes it
    if (showHelp) {
      toggleHelp();
      return;
    }

    // Ctrl+C to quit
    if (ctrl && keyName === 'c') {
      process.exit(0);
    }

    // Quit - q or escape
    if (keyName === 'q' && !ctrl) {
      if (focusedPanel !== 'tasks') {
        setFocusedPanel('tasks');
        setPanelCursorIndex(0);
      } else if (activeFilter) {
        setActiveFilter(undefined);
        setCurrentTaskIndex(0);
      } else {
        process.exit(0);
      }
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
      setFocusedPanel(PANELS[nextIndex]!);
      setPanelCursorIndex(0);
      return;
    }

    // Navigation - up/k
    if (keyName === 'up' || keyName === 'k') {
      if (focusedPanel === 'tasks') {
        if (currentTaskIndex > 0) {
          setCurrentTaskIndex(currentTaskIndex - 1);
        }
      } else {
        if (panelCursorIndex > 0) {
          setPanelCursorIndex(panelCursorIndex - 1);
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
        if (panelCursorIndex < maxIndex - 1) {
          setPanelCursorIndex(panelCursorIndex + 1);
        }
      }
      return;
    }

    // Go to top - g
    if (keyName === 'g' && !shift) {
      if (focusedPanel === 'tasks') {
        setCurrentTaskIndex(0);
      } else {
        setPanelCursorIndex(0);
      }
      return;
    }

    // Go to bottom - G (shift+g)
    if (keyName === 'g' && shift) {
      if (focusedPanel === 'tasks') {
        setCurrentTaskIndex(Math.max(0, filteredTasks.length - 1));
      } else {
        const maxIndex = getPanelMaxIndex(focusedPanel);
        setPanelCursorIndex(Math.max(0, maxIndex - 1));
      }
      return;
    }

    // Enter - apply filter from panel
    if (keyName === 'return' || keyName === 'enter') {
      if (focusedPanel !== 'tasks') {
        applyPanelFilter();
      }
      // TODO: Edit task when in tasks panel
      return;
    }

    // Space - toggle completion
    if (keyName === 'space' || keyName === ' ') {
      if (focusedPanel === 'tasks') {
        toggleTaskCompletion(filePath);
      }
      return;
    }

    // v - toggle show completed
    if (keyName === 'v') {
      toggleShowCompleted();
      return;
    }

    // s - cycle sort mode
    if (keyName === 's') {
      cycleSortMode();
      return;
    }

    // u - undo
    if (keyName === 'u') {
      undo(filePath);
      return;
    }

    // Priority setting with Shift+Letter (A-Z)
    if (shift && key.char && /^[A-Z]$/.test(key.char)) {
      const task = filteredTasks[currentTaskIndex];
      if (task && focusedPanel === 'tasks') {
        const taskInList = tasks.find(t => t.id === task.id);
        if (taskInList) {
          saveHistory();
          taskInList.priority = key.char;
          saveTasks(tasks, filePath);
          updateFilteredTasks();
        }
      }
      return;
    }

    // n or a - new task
    if (keyName === 'n' || keyName === 'a') {
      openCommandBar('newTask', 'New task:');
      return;
    }

    // e or enter in tasks panel - edit task
    if ((keyName === 'e' || keyName === 'return' || keyName === 'enter') && focusedPanel === 'tasks') {
      const task = filteredTasks[currentTaskIndex];
      if (task) {
        openCommandBar('editTask', 'Edit task:', task.text);
      }
      return;
    }

    // / - search
    if (keyName === '/') {
      openCommandBar('search', 'Search:');
      return;
    }

    // p - add project tag
    if (keyName === 'p' && focusedPanel === 'tasks') {
      openCommandBar('addProject', 'Project tag (without +):');
      return;
    }

    // c - add context tag
    if (keyName === 'c' && focusedPanel === 'tasks') {
      openCommandBar('addContext', 'Context tag (without @):');
      return;
    }

    // d - add due date
    if (keyName === 'd' && focusedPanel === 'tasks') {
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

    // t - theme selector
    if (keyName === 't') {
      toggleThemeSelector();
      return;
    }
  });
}
