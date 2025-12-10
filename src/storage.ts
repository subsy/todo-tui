import { parseTodoFile, serializeTodoFile, type Task } from './parser/index.ts';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export function getDefaultTodoPath(): string {
  // Priority 1: Environment variable
  if (process.env.TODO_FILE) {
    return process.env.TODO_FILE;
  }

  // Priority 2: Current directory
  const currentDirPath = join(process.cwd(), 'todo.txt');
  if (existsSync(currentDirPath)) {
    return currentDirPath;
  }

  // Priority 3: Home directory
  const homeDirPath = join(homedir(), 'todo.txt');
  if (existsSync(homeDirPath)) {
    return homeDirPath;
  }

  // No todo.txt found - throw error
  throw new Error(
    'No todo.txt file found!\n' +
    'Searched in:\n' +
    `  - Current directory: ${currentDirPath}\n` +
    `  - Home directory: ${homeDirPath}\n\n` +
    'Please create a todo.txt file in one of these locations, or specify a path with:\n' +
    '  todo -f /path/to/todo.txt\n' +
    '  export TODO_FILE=/path/to/todo.txt'
  );
}

export async function loadTasks(filePath?: string): Promise<Task[]> {
  const path = filePath || getDefaultTodoPath();

  if (!existsSync(path)) {
    return [];
  }

  try {
    const file = Bun.file(path);
    const content = await file.text();
    return parseTodoFile(content);
  } catch (error) {
    throw new Error(`Failed to read todo file: ${error}`);
  }
}

export async function saveTasks(tasks: Task[], filePath?: string): Promise<void> {
  const path = filePath || getDefaultTodoPath();

  try {
    const content = serializeTodoFile(tasks);
    await Bun.write(path, content);
  } catch (error) {
    throw new Error(`Failed to write todo file: ${error}`);
  }
}

export async function addTask(task: Task, filePath?: string): Promise<void> {
  const tasks = await loadTasks(filePath);

  // Assign new ID based on max existing ID
  const maxId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) : 0;
  task.id = maxId + 1;

  tasks.push(task);
  await saveTasks(tasks, filePath);
}

export async function updateTask(id: number, updates: Partial<Task>, filePath?: string): Promise<void> {
  const tasks = await loadTasks(filePath);
  const index = tasks.findIndex(t => t.id === id);

  if (index === -1) {
    throw new Error(`Task ${id} not found`);
  }

  tasks[index] = { ...tasks[index], ...updates };
  await saveTasks(tasks, filePath);
}

export async function deleteTask(id: number, filePath?: string): Promise<void> {
  const tasks = await loadTasks(filePath);
  const filtered = tasks.filter(t => t.id !== id);

  if (filtered.length === tasks.length) {
    throw new Error(`Task ${id} not found`);
  }

  await saveTasks(filtered, filePath);
}
