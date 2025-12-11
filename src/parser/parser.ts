import type { Task } from './types.ts';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const PRIORITY_REGEX = /^\([A-Z0-9]\)$/;

export function parseLine(line: string, id: number): Task | null {
  // Skip empty lines
  if (!line.trim()) {
    return null;
  }

  const task: Task = {
    id,
    completed: false,
    priority: null,
    completionDate: null,
    creationDate: null,
    text: '',
    contexts: [],
    projects: [],
    metadata: {},
  };

  let remaining = line.trim();

  // Check for completion marker
  if (remaining.startsWith('x ')) {
    task.completed = true;
    remaining = remaining.substring(2).trim();

    // Check for completion date
    const firstToken = remaining.split(/\s+/)[0];
    if (firstToken && DATE_REGEX.test(firstToken)) {
      task.completionDate = firstToken;
      remaining = remaining.substring(firstToken.length).trim();
    }
  }

  // Check for priority (only for incomplete tasks at start, or after completion info)
  if (!task.completed || task.completionDate) {
    const firstToken = remaining.split(/\s+/)[0];
    if (firstToken && PRIORITY_REGEX.test(firstToken)) {
      task.priority = firstToken[1]; // Extract letter/number from (A) or (0)
      remaining = remaining.substring(firstToken.length).trim();
    }
  }

  // Check for creation date
  const firstToken = remaining.split(/\s+/)[0];
  if (firstToken && DATE_REGEX.test(firstToken)) {
    task.creationDate = firstToken;
    remaining = remaining.substring(firstToken.length).trim();
  }

  // The rest is the task text
  task.text = remaining;

  // Extract contexts (@word)
  const contextMatches = remaining.match(/@\S+/g);
  if (contextMatches) {
    task.contexts = contextMatches.map(c => c.substring(1));
  }

  // Extract projects (+word)
  const projectMatches = remaining.match(/\+\S+/g);
  if (projectMatches) {
    task.projects = projectMatches.map(p => p.substring(1));
  }

  // Extract metadata (key:value)
  const metadataMatches = remaining.match(/(\S+):(\S+)/g);
  if (metadataMatches) {
    for (const match of metadataMatches) {
      const [key, value] = match.split(':');
      if (key && value && !key.startsWith('@') && !key.startsWith('+')) {
        task.metadata[key] = value;
      }
    }
  }

  return task;
}

export function serializeTask(task: Task): string {
  const parts: string[] = [];

  // Completion marker
  if (task.completed) {
    parts.push('x');
    if (task.completionDate) {
      parts.push(task.completionDate);
    }
  }

  // Priority
  if (task.priority) {
    parts.push(`(${task.priority})`);
  }

  // Creation date
  if (task.creationDate) {
    parts.push(task.creationDate);
  }

  // Task text
  parts.push(task.text);

  return parts.join(' ');
}

export function parseTodoFile(content: string): Task[] {
  const lines = content.split('\n');
  const tasks: Task[] = [];

  lines.forEach((line, index) => {
    const task = parseLine(line, index + 1);
    if (task) {
      tasks.push(task);
    }
  });

  return tasks;
}

export function serializeTodoFile(tasks: Task[]): string {
  return tasks.map(serializeTask).join('\n') + '\n';
}

/**
 * Detect the priority format used in a list of tasks
 * Returns 'letter' if any A-Z priorities found, 'number' if any 0-9 found,
 * 'mixed' if both, or 'none' if no priorities
 */
export function detectPriorityFormat(tasks: Task[]): 'letter' | 'number' | 'mixed' | 'none' {
  let hasLetter = false;
  let hasNumber = false;

  for (const task of tasks) {
    if (task.priority) {
      if (/^[A-Z]$/.test(task.priority)) {
        hasLetter = true;
      } else if (/^[0-9]$/.test(task.priority)) {
        hasNumber = true;
      }
    }
  }

  if (hasLetter && hasNumber) return 'mixed';
  if (hasLetter) return 'letter';
  if (hasNumber) return 'number';
  return 'none';
}

/**
 * Convert all priorities in tasks from one format to another
 * Letter to number: A=0, B=1, ..., I=8, J+=9
 * Number to letter: 0=A, 1=B, ..., 9=J
 */
export function convertPriorities(tasks: Task[], targetFormat: 'letter' | 'number'): Task[] {
  return tasks.map(task => {
    if (!task.priority) return task;

    let newPriority: string;

    if (targetFormat === 'number') {
      // Letter to number: A=0, B=1, ..., I=8, J+=9
      if (/^[A-Z]$/.test(task.priority)) {
        const letterIndex = task.priority.charCodeAt(0) - 'A'.charCodeAt(0);
        newPriority = String(Math.min(letterIndex, 9));
      } else {
        // Already a number
        newPriority = task.priority;
      }
    } else {
      // Number to letter: 0=A, 1=B, ..., 9=J
      if (/^[0-9]$/.test(task.priority)) {
        const numIndex = parseInt(task.priority, 10);
        newPriority = String.fromCharCode('A'.charCodeAt(0) + numIndex);
      } else {
        // Already a letter
        newPriority = task.priority;
      }
    }

    return { ...task, priority: newPriority };
  });
}
