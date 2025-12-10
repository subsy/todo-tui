import React, { useEffect } from 'react';
import { createRoot } from '@opentui/react';
import { createCliRenderer } from '@opentui/core';
import { useTodoStore } from './store/useTodoStore.ts';
import { loadTasks } from '../storage.ts';

interface AppProps {
  filePath?: string;
}

function App({ filePath }: AppProps) {
  const tasks = useTodoStore(state => state.tasks);
  const filteredTasks = useTodoStore(state => state.filteredTasks);
  const setTasks = useTodoStore(state => state.setTasks);
  const focusedPanel = useTodoStore(state => state.focusedPanel);
  const activeFilter = useTodoStore(state => state.activeFilter);

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

  return (
    <box flexDirection="column" width="100%" height="100%">
      {/* Header */}
      <box borderStyle="single" borderColor="gray" padding={1}>
        <text color="yellow">{title}</text>
      </box>

      {/* Main Content */}
      <box flexGrow={1} padding={1}>
        {filteredTasks.length === 0 ? (
          <text color="gray">No tasks found. Press 'n' to add a task.</text>
        ) : (
          <box flexDirection="column">
            {filteredTasks.map((task) => (
              <box key={task.id}>
                <text>
                  {task.completed ? '✓' : '○'} {' '}
                  {task.priority ? `(${task.priority}) ` : ''}
                  {task.text}
                </text>
              </box>
            ))}
          </box>
        )}
      </box>

      {/* Footer */}
      <box borderStyle="single" borderColor="gray" padding={1}>
        <text color="gray">
          Panel: {focusedPanel} | ? Help | TAB Panels | space Toggle | n New | q Quit
        </text>
      </box>
    </box>
  );
}

export async function runOpenTUIApp(filePath?: string) {
  const renderer = await createCliRenderer({ exitOnCtrlC: true });
  createRoot(renderer).render(<App filePath={filePath} />);
}
