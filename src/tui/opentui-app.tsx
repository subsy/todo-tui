import React, { useEffect, useRef, useCallback } from 'react';
import { createRoot } from '@opentui/react';
import { createCliRenderer } from '@opentui/core';
import { useTodoStore } from './store/useTodoStore.ts';
import { loadTasks } from '../storage.ts';
import { detectPriorityFormat } from '../parser/parser.ts';
import { AppContainer, Header, Footer, MainContent } from './components/Layout.tsx';
import { TaskList } from './components/TaskList.tsx';
import { PanelContainer } from './components/PanelContainer.tsx';
import { CommandBar } from './components/CommandBar.tsx';
import { HelpScreen } from './components/HelpScreen.tsx';
import { SettingsScreen } from './components/SettingsScreen.tsx';
import { FormatMismatchDialog } from './components/FormatMismatchDialog.tsx';
import { useKeyboardNavigation } from './hooks/useKeyboard.ts';
import { ThemeProvider } from './themes/ThemeContext.tsx';

interface AppProps {
  filePath?: string;
}

function AppContent({ filePath }: AppProps) {
  const filteredTasks = useTodoStore(state => state.filteredTasks);
  const setTasks = useTodoStore(state => state.setTasks);
  const focusedPanel = useTodoStore(state => state.focusedPanel);
  const activeFilter = useTodoStore(state => state.activeFilter);
  const showCompleted = useTodoStore(state => state.showCompleted);
  const sortMode = useTodoStore(state => state.sortMode);
  const commandBarActive = useTodoStore(state => state.commandBarActive);
  const commandBarPrompt = useTodoStore(state => state.commandBarPrompt);
  const commandBarDefaultValue = useTodoStore(state => state.commandBarDefaultValue);
  const closeCommandBar = useTodoStore(state => state.closeCommandBar);
  const handleCommandBarSubmit = useTodoStore(state => state.handleCommandBarSubmit);
  const commandBarMode = useTodoStore(state => state.commandBarMode);
  const setSearchFilter = useTodoStore(state => state.setSearchFilter);
  const updateFilteredTasks = useTodoStore(state => state.updateFilteredTasks);
  const showHelp = useTodoStore(state => state.showHelp);
  const showSettings = useTodoStore(state => state.showSettings);
  const toggleSettings = useTodoStore(state => state.toggleSettings);

  const setPriorityMode = useTodoStore(state => state.setPriorityMode);
  const setTheme = useTodoStore(state => state.setTheme);
  const showFormatMismatchDialog = useTodoStore(state => state.showFormatMismatchDialog);
  const showFormatMismatch = useTodoStore(state => state.showFormatMismatch);

  // Setup keyboard navigation
  useKeyboardNavigation(filePath);

  // Debounced search handler
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback((value: string) => {
    if (commandBarMode !== 'search') return;

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce: update search filter after 150ms
    searchTimeoutRef.current = setTimeout(() => {
      setSearchFilter(value);
      updateFilteredTasks();
    }, 150);
  }, [commandBarMode, setSearchFilter, updateFilteredTasks]);

  // Load tasks and config on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load config first
        const { loadConfig } = await import('../config.ts');
        const config = await loadConfig();
        setPriorityMode(config.priorityMode);
        setTheme(config.theme);

        // Then load tasks
        const loadedTasks = await loadTasks(filePath);
        setTasks(loadedTasks);

        // Check for priority format mismatch
        const detectedFormat = detectPriorityFormat(loadedTasks);
        if (detectedFormat !== 'none' && detectedFormat !== 'mixed') {
          // File has priorities - check if they match settings
          if (detectedFormat !== config.priorityMode) {
            showFormatMismatch(detectedFormat);
          }
        } else if (detectedFormat === 'mixed') {
          // Mixed format - always show dialog to let user choose
          showFormatMismatch(detectedFormat);
        }
      } catch (error) {
        console.error('Failed to load tasks:', error);
      }
    };
    loadData();
  }, [filePath, setTasks, setPriorityMode, setTheme, showFormatMismatch]);

  // Build title with filter
  const searchFilter = useTodoStore(state => state.searchFilter);
  let title = ` Todo.txt (${filteredTasks.length} tasks) `;
  if (searchFilter) {
    title += `[Search: "${searchFilter}"]`;
  } else if (activeFilter) {
    let filterValue = activeFilter.value;
    if (filterValue === 'dueOverdue') filterValue = 'DUE/OVERDUE';
    if (filterValue === 'doneToday') filterValue = 'DONE TODAY';
    if (filterValue === 'active') filterValue = 'ACTIVE';

    const filterPrefix = activeFilter.type === 'project' ? '+' :
                        activeFilter.type === 'context' ? '@' : '';
    title += `[Filter: ${filterPrefix}${filterValue}]`;
  }

  // Build footer status
  const panelName = focusedPanel === 'tasks' ? 'Tasks' :
                    focusedPanel === 'priorities' ? 'Priorities' :
                    focusedPanel === 'stats' ? 'Stats' :
                    focusedPanel === 'projects' ? 'Projects' : 'Contexts';

  const priorityMode = useTodoStore(state => state.priorityMode);
  const priorityHint = priorityMode === 'letter' ? 'Shift+A-Z' : '0-9';

  const shortcuts = `? Help | TAB Panels | ${priorityHint} Pri | n New | :w Save | :q Quit`;

  const status = `Panel: ${panelName} | Sort: ${sortMode} | ${shortcuts}`;

  // Show format mismatch dialog if active
  if (showFormatMismatchDialog) {
    return <FormatMismatchDialog filePath={filePath} />;
  }

  // Show settings screen if active
  if (showSettings) {
    return <SettingsScreen onClose={toggleSettings} filePath={filePath} />;
  }

  // Show help screen if active
  if (showHelp) {
    return <HelpScreen />;
  }

  return (
    <AppContainer>
      <Header>{title}</Header>
      <PanelContainer />
      <MainContent>
        <TaskList />
      </MainContent>
      {commandBarActive ? (
        <CommandBar
          prompt={commandBarPrompt}
          defaultValue={commandBarDefaultValue}
          onSubmit={(value) => handleCommandBarSubmit(value, filePath)}
          onCancel={closeCommandBar}
          onChange={commandBarMode === 'search' ? handleSearchChange : undefined}
        />
      ) : (
        <Footer>{status}</Footer>
      )}
    </AppContainer>
  );
}

function App({ filePath }: AppProps) {
  return (
    <ThemeProvider>
      <AppContent filePath={filePath} />
    </ThemeProvider>
  );
}

export async function runOpenTUIApp(filePath?: string) {
  const renderer = await createCliRenderer({ exitOnCtrlC: true });
  createRoot(renderer).render(<App filePath={filePath} />);
}
