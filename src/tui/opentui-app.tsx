import React, { useEffect } from 'react';
import { createRoot } from '@opentui/react';
import { createCliRenderer } from '@opentui/core';
import { useTodoStore } from './store/useTodoStore.ts';
import { loadTasks } from '../storage.ts';
import { AppContainer, Header, Footer, MainContent } from './components/Layout.tsx';
import { TaskList } from './components/TaskList.tsx';
import { PanelContainer } from './components/PanelContainer.tsx';

interface AppProps {
  filePath?: string;
}

function App({ filePath }: AppProps) {
  const filteredTasks = useTodoStore(state => state.filteredTasks);
  const setTasks = useTodoStore(state => state.setTasks);
  const focusedPanel = useTodoStore(state => state.focusedPanel);
  const activeFilter = useTodoStore(state => state.activeFilter);
  const showCompleted = useTodoStore(state => state.showCompleted);
  const sortMode = useTodoStore(state => state.sortMode);

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

  const shortcuts = '? Help | TAB Panels | space Toggle | n New | v ' +
    (showCompleted ? 'Hide' : 'Show') + ' All | q Quit';

  const status = `Panel: ${panelName} | Sort: ${sortMode} | ${shortcuts}`;

  return (
    <AppContainer>
      <Header>{title}</Header>
      <PanelContainer />
      <MainContent>
        <TaskList />
      </MainContent>
      <Footer>{status}</Footer>
    </AppContainer>
  );
}

export async function runOpenTUIApp(filePath?: string) {
  const renderer = await createCliRenderer({ exitOnCtrlC: true });
  createRoot(renderer).render(<App filePath={filePath} />);
}
