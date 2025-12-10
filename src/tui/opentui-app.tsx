import React, { useEffect } from 'react';
import { createRoot } from '@opentui/react';
import { createCliRenderer } from '@opentui/core';
import { useTodoStore } from './store/useTodoStore.ts';
import { loadTasks } from '../storage.ts';
import { AppContainer, Header, Footer, MainContent } from './components/Layout.tsx';
import { TaskList } from './components/TaskList.tsx';
import { PanelContainer } from './components/PanelContainer.tsx';
import { CommandBar } from './components/CommandBar.tsx';
import { HelpScreen } from './components/HelpScreen.tsx';
import { ThemeSelector } from './components/ThemeSelector.tsx';
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
  const showHelp = useTodoStore(state => state.showHelp);
  const showThemeSelector = useTodoStore(state => state.showThemeSelector);
  const currentTheme = useTodoStore(state => state.currentTheme);
  const toggleThemeSelector = useTodoStore(state => state.toggleThemeSelector);
  const setTheme = useTodoStore(state => state.setTheme);

  // Setup keyboard navigation
  useKeyboardNavigation(filePath);

  // Load tasks on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const loadedTasks = await loadTasks(filePath);
        setTasks(loadedTasks);
      } catch (error) {
        console.error('Failed to load tasks:', error);
      }
    };
    loadData();
  }, [filePath, setTasks]);

  // Build title with filter
  let title = ` Todo.txt (${filteredTasks.length} tasks) `;
  if (activeFilter) {
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

  const shortcuts = '? Help | t Theme | TAB Panels | space Toggle | n New | v ' +
    (showCompleted ? 'Hide' : 'Show') + ' All | q Quit';

  const status = `Panel: ${panelName} | Sort: ${sortMode} | ${shortcuts}`;

  // Show theme selector if active
  if (showThemeSelector) {
    return (
      <ThemeSelector
        currentTheme={currentTheme}
        onClose={toggleThemeSelector}
        onSelect={setTheme}
      />
    );
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
