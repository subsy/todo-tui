# Todo TUI

A fast and beautiful TUI and CLI application for managing todo.txt files, built with TypeScript and Bun.

## Features

- **Full todo.txt Format Support** - Compliant with the [todo.txt format specification](https://github.com/todotxt/todo.txt)
- **Fast & Lightweight** - Built with Bun for maximum performance
- **Beautiful Output** - Colorized task display with priority indicators
- **Interactive TUI Mode** - Full-screen terminal interface for managing tasks
- **Multi-Panel Navigation** - TAB between panels and filter by priority, stats, projects, or contexts
- **Single Binary** - Compile to a standalone executable with no dependencies
- **Configurable** - Custom todo.txt file location via flag or environment variable
- **Filtering & Search** - Filter by context, project, priority, or search text

## Installation

### From Source

1. Install [Bun](https://bun.sh):
```bash
curl -fsSL https://bun.sh/install | bash
```

2. Clone and install dependencies:
```bash
git clone <repository-url>
cd todo-cli
bun install
```

3. Build the binary:
```bash
bun run build
```

4. Move the binary to your PATH:
```bash
sudo mv todo /usr/local/bin/
```

### Development

Run without building:
```bash
bun run dev
```

### Try the Example

An example Enterprise-themed todo list is included to showcase all features:
```bash
./todo -f example-enterprise.txt i
```

## Usage

### Command Line Interface

By default, tasks are stored in `~/todo.txt`. You can specify a different file with `-f` or set the `TODO_FILE` environment variable.

#### Add a task
```bash
todo add "Call Mom +Family @phone"
todo add "(A) Important task with high priority"
todo add "Task with due date due:2025-12-15"
```

#### List tasks
```bash
todo list                    # Show active tasks
todo ls                      # Alias for list
todo list --all              # Show all tasks including completed
todo list -c phone           # Filter by context (@phone)
todo list -p Work            # Filter by project (+Work)
todo list --priority A       # Filter by priority
todo list -s "pull request"  # Search by text
```

#### Complete a task
```bash
todo do 1                    # Mark task 1 as complete
```

#### Edit a task
```bash
todo edit 1 "New task text"
todo edit 1 "(B) Updated task with priority"
```

#### Delete a task
```bash
todo delete 1                # Delete task 1
todo rm 1                    # Alias for delete
```

#### Manage priorities
```bash
todo pri 1 A                 # Set priority A for task 1
todo depri 1                 # Remove priority from task 1
```

### Interactive TUI Mode

Launch the keyboard-driven interactive mode for a fast, visual task management experience:

```bash
todo interactive
todo i                       # Alias
```

#### Keyboard Shortcuts

**Navigation:**
- `↑`/`k`, `↓`/`j` - Move up/down (tasks or within panels)
- `←`/`h`, `→`/`l` - Move left/right between task elements (priority, date, text, tags)
- `TAB` - Cycle through panels (tasks → priorities → stats → projects → contexts)
- `g`, `G` - Go to top/bottom of list or panel

**Panel Actions:**
- `enter` - (in non-task panels) Filter by selected item
- `ESC` - Return to tasks panel or clear active filter

**Task Actions:**
- `space` - Toggle task completion (done/not done)
- `enter` or `e` - Edit task text
- `Shift+Letter` - Set priority (e.g., `Shift+A` for priority A)
- `p` - Add project tag (+tag)
- `c` - Add context tag (@tag)
- `d` - Add due date
- `n` or `a` - Add new task
- `x` - Delete entire task
- `delete`/`backspace` - Delete selected element (priority, tag, metadata, etc.)

**View:**
- `v` - Toggle show/hide completed tasks
- `/` - Search/filter tasks
- `s` - Cycle sort mode (priority → date → project → context)
- `r` - Refresh from file

**Other:**
- `u` - Undo last action
- `?` - Show help overlay
- `q` or `ESC` - Quit

#### Element-Level Navigation

The TUI allows you to navigate within each task element by element using `←`/`→` keys. Elements are highlighted when selected, and you can delete individual elements (except checkbox and main text) using the `delete` key. This makes it easy to remove a priority, delete a specific tag, or remove metadata without editing the entire task.

#### Panel Navigation & Filtering

The TUI features a multi-panel interface with powerful filtering capabilities. Press `TAB` to cycle through five panels:

**Tasks Panel** - Main task list with checkboxes and full task details
- Navigate with `↑`/`↓` or `k`/`j`
- Select elements within tasks with `←`/`→` or `h`/`l`
- Press `enter` or `e` to edit tasks

**Priorities Panel** - Visual bar chart of task priorities
- Navigate with `↑`/`↓` to select a priority (A-Z or 0-9)
- Press `enter` to filter tasks by the selected priority
- Bar chart uses sub-character granularity for precise visualization
- Focused panel shows highlighted borders and selected priority is inverted

**Stats Panel** - Task statistics and metrics
- DUE/OVERDUE: Filter tasks that are overdue or due today
- DONE TODAY: Filter tasks completed today
- ACTIVE: Filter to show only active (incomplete) tasks
- Navigate with `↑`/`↓` and press `enter` to apply filter

**Projects Panel** - All project tags (+tag)
- Navigate with `↑`/`↓` to select a project
- Press `enter` to filter tasks by the selected project
- Shows all unique project tags sorted alphabetically

**Contexts Panel** - All context tags (@tag)
- Navigate with `↑`/`↓` to select a context
- Press `enter` to filter tasks by the selected context
- Shows all unique context tags sorted alphabetically

**Visual Feedback:**
- Focused panel has highlighted borders in yellow
- Selected item within panel shows with `>` cursor and inverted colors
- Active filter displays in title bar (e.g., "[Filter: +mission]" or "[Filter: A]")
- Status bar shows current panel name and filtering instructions

**Clearing Filters:**
- Press `ESC` when in tasks panel with active filter to clear it
- Press `ESC` from any other panel to return to tasks panel
- Apply a new filter to replace the current one

## Todo.txt Format

This tool follows the [todo.txt format specification](https://github.com/todotxt/todo.txt):

```
(A) 2025-12-10 Call Mom +Family @phone due:2025-12-15
```

Format breakdown:
- `(A)` - Priority (A-Z, optional)
- `2025-12-10` - Creation date (YYYY-MM-DD, optional)
- `+Family` - Project tag (optional, multiple allowed)
- `@phone` - Context tag (optional, multiple allowed)
- `due:2025-12-15` - Custom metadata (key:value, optional)

Completed tasks:
```
x 2025-12-10 (B) 2025-12-09 Task description
```

Format:
- `x` - Completion marker
- `2025-12-10` - Completion date
- `(B)` - Original priority
- `2025-12-09` - Creation date

## Configuration

### Todo File Location

By default, the app searches for `todo.txt` in this order:
1. `TODO_FILE` environment variable (if set)
2. Current directory (`./todo.txt`)
3. Home directory (`~/todo.txt`)

If no file is found, an error is displayed with instructions.

You can override the location:

Via command line flag:
```bash
todo -f ~/Documents/my-todos.txt list
```

Via environment variable:
```bash
export TODO_FILE=~/Documents/my-todos.txt
todo list
```

## Development

### Run Tests
```bash
bun test
```

### Build Binary
```bash
bun run build
```

### Project Structure
```
todo-cli/
├── src/
│   ├── parser/         # Todo.txt format parser
│   ├── commands/       # CLI command implementations
│   ├── ui/            # UI formatting and colors
│   ├── tui/           # Interactive TUI mode
│   └── storage.ts     # File I/O operations
├── index.ts           # Main CLI entry point
└── package.json
```

## Tech Stack

- **Runtime:** [Bun](https://bun.sh)
- **Language:** TypeScript
- **CLI Framework:** Commander.js
- **UI Libraries:**
  - chalk - Colors and text styling
  - cli-table3 - Beautiful tables
  - @clack/prompts - Interactive TUI elements

## License

MIT

## Credits

Built following the [todo.txt format specification](https://github.com/todotxt/todo.txt).
