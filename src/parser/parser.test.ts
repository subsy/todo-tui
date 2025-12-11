import { describe, it, expect } from 'bun:test';
import { parseLine, serializeTask, parseTodoFile, serializeTodoFile, detectPriorityFormat, convertPriorities } from './parser.ts';
import type { Task } from './types.ts';

describe('parseLine', () => {
  it('should parse a simple task', () => {
    const task = parseLine('Buy groceries', 1);
    expect(task).toEqual({
      id: 1,
      completed: false,
      priority: null,
      completionDate: null,
      creationDate: null,
      text: 'Buy groceries',
      contexts: [],
      projects: [],
      metadata: {},
    });
  });

  it('should parse a task with priority', () => {
    const task = parseLine('(A) Call Mom', 1);
    expect(task?.priority).toBe('A');
    expect(task?.text).toBe('Call Mom');
  });

  it('should parse a task with priority and creation date', () => {
    const task = parseLine('(A) 2025-12-10 Call Mom', 1);
    expect(task?.priority).toBe('A');
    expect(task?.creationDate).toBe('2025-12-10');
    expect(task?.text).toBe('Call Mom');
  });

  it('should parse a completed task', () => {
    const task = parseLine('x 2025-12-10 Buy groceries', 1);
    expect(task?.completed).toBe(true);
    expect(task?.completionDate).toBe('2025-12-10');
    expect(task?.text).toBe('Buy groceries');
  });

  it('should parse a completed task with creation date', () => {
    const task = parseLine('x 2025-12-10 2025-12-09 Buy groceries', 1);
    expect(task?.completed).toBe(true);
    expect(task?.completionDate).toBe('2025-12-10');
    expect(task?.creationDate).toBe('2025-12-09');
    expect(task?.text).toBe('Buy groceries');
  });

  it('should parse a completed task with priority and dates', () => {
    const task = parseLine('x 2025-12-10 (B) 2025-12-09 Buy groceries', 1);
    expect(task?.completed).toBe(true);
    expect(task?.completionDate).toBe('2025-12-10');
    expect(task?.priority).toBe('B');
    expect(task?.creationDate).toBe('2025-12-09');
    expect(task?.text).toBe('Buy groceries');
  });

  it('should extract contexts', () => {
    const task = parseLine('Call Mom @phone @home', 1);
    expect(task?.contexts).toEqual(['phone', 'home']);
  });

  it('should extract projects', () => {
    const task = parseLine('Review code +Work +Backend', 1);
    expect(task?.projects).toEqual(['Work', 'Backend']);
  });

  it('should extract metadata', () => {
    const task = parseLine('Write docs due:2025-12-15 priority:high', 1);
    expect(task?.metadata).toEqual({
      due: '2025-12-15',
      priority: 'high',
    });
  });

  it('should parse complex task', () => {
    const task = parseLine('(A) 2025-12-10 Call Mom +Family @phone due:2025-12-11', 1);
    expect(task?.priority).toBe('A');
    expect(task?.creationDate).toBe('2025-12-10');
    expect(task?.contexts).toEqual(['phone']);
    expect(task?.projects).toEqual(['Family']);
    expect(task?.metadata).toEqual({ due: '2025-12-11' });
  });

  it('should return null for empty lines', () => {
    const task = parseLine('', 1);
    expect(task).toBeNull();
  });

  it('should return null for whitespace-only lines', () => {
    const task = parseLine('   ', 1);
    expect(task).toBeNull();
  });
});

describe('serializeTask', () => {
  it('should serialize a simple task', () => {
    const text = serializeTask({
      id: 1,
      completed: false,
      priority: null,
      completionDate: null,
      creationDate: null,
      text: 'Buy groceries',
      contexts: [],
      projects: [],
      metadata: {},
    });
    expect(text).toBe('Buy groceries');
  });

  it('should serialize a task with priority', () => {
    const text = serializeTask({
      id: 1,
      completed: false,
      priority: 'A',
      completionDate: null,
      creationDate: null,
      text: 'Call Mom',
      contexts: [],
      projects: [],
      metadata: {},
    });
    expect(text).toBe('(A) Call Mom');
  });

  it('should serialize a task with priority and creation date', () => {
    const text = serializeTask({
      id: 1,
      completed: false,
      priority: 'A',
      completionDate: null,
      creationDate: '2025-12-10',
      text: 'Call Mom',
      contexts: [],
      projects: [],
      metadata: {},
    });
    expect(text).toBe('(A) 2025-12-10 Call Mom');
  });

  it('should serialize a completed task', () => {
    const text = serializeTask({
      id: 1,
      completed: true,
      priority: null,
      completionDate: '2025-12-10',
      creationDate: null,
      text: 'Buy groceries',
      contexts: [],
      projects: [],
      metadata: {},
    });
    expect(text).toBe('x 2025-12-10 Buy groceries');
  });

  it('should serialize a completed task with all fields', () => {
    const text = serializeTask({
      id: 1,
      completed: true,
      priority: 'B',
      completionDate: '2025-12-10',
      creationDate: '2025-12-09',
      text: 'Buy groceries',
      contexts: [],
      projects: [],
      metadata: {},
    });
    expect(text).toBe('x 2025-12-10 (B) 2025-12-09 Buy groceries');
  });
});

describe('parseTodoFile and serializeTodoFile', () => {
  it('should parse and serialize a todo file', () => {
    const content = `(A) 2025-12-10 Call Mom +Family @phone
Review pull request @github +Work
x 2025-12-10 (B) 2025-12-09 Buy groceries @errands
`;

    const tasks = parseTodoFile(content);
    expect(tasks).toHaveLength(3);
    expect(tasks[0]?.priority).toBe('A');
    expect(tasks[1]?.projects).toEqual(['Work']);
    expect(tasks[2]?.completed).toBe(true);

    const serialized = serializeTodoFile(tasks);
    expect(serialized).toBe(content);
  });

  it('should handle empty files', () => {
    const tasks = parseTodoFile('');
    expect(tasks).toHaveLength(0);

    const serialized = serializeTodoFile(tasks);
    expect(serialized).toBe('\n');
  });

  it('should handle files with empty lines', () => {
    const content = `Task 1

Task 2
`;

    const tasks = parseTodoFile(content);
    expect(tasks).toHaveLength(2);
  });
});

describe('detectPriorityFormat', () => {
  const createTask = (priority: string | null): Task => ({
    id: 1,
    completed: false,
    priority,
    completionDate: null,
    creationDate: null,
    text: 'Test task',
    contexts: [],
    projects: [],
    metadata: {},
  });

  it('should detect letter priorities', () => {
    const tasks = [createTask('A'), createTask('B'), createTask(null)];
    expect(detectPriorityFormat(tasks)).toBe('letter');
  });

  it('should detect number priorities', () => {
    const tasks = [createTask('0'), createTask('5'), createTask(null)];
    expect(detectPriorityFormat(tasks)).toBe('number');
  });

  it('should detect mixed priorities', () => {
    const tasks = [createTask('A'), createTask('5'), createTask(null)];
    expect(detectPriorityFormat(tasks)).toBe('mixed');
  });

  it('should return none when no priorities exist', () => {
    const tasks = [createTask(null), createTask(null)];
    expect(detectPriorityFormat(tasks)).toBe('none');
  });

  it('should return none for empty task list', () => {
    expect(detectPriorityFormat([])).toBe('none');
  });
});

describe('convertPriorities', () => {
  const createTask = (id: number, priority: string | null): Task => ({
    id,
    completed: false,
    priority,
    completionDate: null,
    creationDate: null,
    text: `Task ${id}`,
    contexts: [],
    projects: [],
    metadata: {},
  });

  it('should convert letter to number priorities', () => {
    const tasks = [createTask(1, 'A'), createTask(2, 'B'), createTask(3, 'J')];
    const converted = convertPriorities(tasks, 'number');
    expect(converted[0]?.priority).toBe('0');
    expect(converted[1]?.priority).toBe('1');
    expect(converted[2]?.priority).toBe('9');
  });

  it('should convert number to letter priorities', () => {
    const tasks = [createTask(1, '0'), createTask(2, '5'), createTask(3, '9')];
    const converted = convertPriorities(tasks, 'letter');
    expect(converted[0]?.priority).toBe('A');
    expect(converted[1]?.priority).toBe('F');
    expect(converted[2]?.priority).toBe('J');
  });

  it('should cap letter priorities at 9 when converting to number', () => {
    const tasks = [createTask(1, 'Z')];
    const converted = convertPriorities(tasks, 'number');
    expect(converted[0]?.priority).toBe('9');
  });

  it('should preserve null priorities', () => {
    const tasks = [createTask(1, null), createTask(2, 'A')];
    const converted = convertPriorities(tasks, 'number');
    expect(converted[0]?.priority).toBeNull();
    expect(converted[1]?.priority).toBe('0');
  });

  it('should not modify tasks that already match target format', () => {
    const tasks = [createTask(1, '5')];
    const converted = convertPriorities(tasks, 'number');
    expect(converted[0]?.priority).toBe('5');
  });
});
