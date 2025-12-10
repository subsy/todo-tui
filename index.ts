#!/usr/bin/env bun
import { Command } from 'commander';
import { addCommand, listCommand, doCommand, editCommand, deleteCommand, priCommand, depriCommand } from './src/commands/index.ts';
import { keyboardTUI } from './src/tui/index.ts';
import { runOpenTUIApp } from './src/tui/opentui-app.tsx';

const program = new Command();

program
  .name('todo')
  .description('Fast and beautiful CLI todo.txt manager')
  .version('1.0.0')
  .option('-f, --file <path>', 'Path to todo.txt file (default: ~/todo.txt)');

// Add command
program
  .command('add <text...>')
  .description('Add a new task')
  .action(async (text: string[], options) => {
    const filePath = program.opts().file;
    await addCommand(text.join(' '), filePath);
  });

// List command
program
  .command('list')
  .alias('ls')
  .description('List tasks')
  .option('-a, --all', 'Show all tasks including completed')
  .option('-c, --context <context>', 'Filter by context (@context)')
  .option('-p, --project <project>', 'Filter by project (+project)')
  .option('--priority <priority>', 'Filter by priority (A-Z)')
  .option('-s, --search <text>', 'Search tasks by text')
  .action(async (options) => {
    const filePath = program.opts().file;
    await listCommand({
      all: options.all,
      context: options.context,
      project: options.project,
      priority: options.priority,
      search: options.search,
    }, filePath);
  });

// Do (complete) command
program
  .command('do <id>')
  .description('Mark a task as completed')
  .action(async (id: string) => {
    const filePath = program.opts().file;
    await doCommand(parseInt(id), filePath);
  });

// Edit command
program
  .command('edit <id> <text...>')
  .description('Edit a task')
  .action(async (id: string, text: string[]) => {
    const filePath = program.opts().file;
    await editCommand(parseInt(id), text.join(' '), filePath);
  });

// Delete command
program
  .command('delete <id>')
  .alias('rm')
  .description('Delete a task')
  .action(async (id: string) => {
    const filePath = program.opts().file;
    await deleteCommand(parseInt(id), filePath);
  });

// Priority command
program
  .command('pri <id> <priority>')
  .description('Set task priority (A-Z)')
  .action(async (id: string, priority: string) => {
    const filePath = program.opts().file;
    await priCommand(parseInt(id), priority.toUpperCase(), filePath);
  });

// Deprioritize command
program
  .command('depri <id>')
  .description('Remove task priority')
  .action(async (id: string) => {
    const filePath = program.opts().file;
    await depriCommand(parseInt(id), filePath);
  });

// Interactive TUI mode (original)
program
  .command('interactive')
  .alias('i')
  .description('Launch interactive TUI mode (original)')
  .action(async () => {
    const filePath = program.opts().file;
    await keyboardTUI(filePath);
  });

// OpenTUI mode (React-based)
program
  .command('tui')
  .description('Launch OpenTUI mode (experimental React-based TUI)')
  .action(async () => {
    const filePath = program.opts().file;
    await runOpenTUIApp(filePath);
  });

// Default action: list tasks
program
  .action(async () => {
    const filePath = program.opts().file;
    await listCommand({}, filePath);
  });

program.parse();
