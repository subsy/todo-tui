# lazytodo

![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/subsy/lazytodo?utm_source=oss&utm_medium=github&utm_campaign=subsy%2Flazytodo&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)

A fast, beautiful, vim-centric TUI for managing todo.txt files. Built with TypeScript, OpenTUI, and Bun.

## Features

- **Vim-style Keybindings** - Navigate with `j/k`, `g/G`, and use `:` commands like `:w`, `:q`, `:wq`
- **Full todo.txt Support** - Compliant with the [todo.txt format specification](https://github.com/todotxt/todo.txt)
- **Multi-Panel Interface** - Priority chart, projects, contexts, and command history panels
- **8 Built-in Themes** - Catppuccin, Dracula, Nord, Gruvbox, Tokyo Night, Solarized, One Dark, Monokai
- **Braille Bar Charts** - High-resolution priority visualization with 20 levels of granularity
- **Fast & Lightweight** - Single binary with no runtime dependencies
- **Undo Support** - Revert changes with `u`
- **Yank/Paste** - Copy tasks with `y`, paste with `p`

## Installation

### From Source

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Clone and build
git clone <repository-url>
cd lazytodo
bun install
bun run build

# Move to PATH
sudo mv lazytodo /usr/local/bin/
```

### Development

```bash
bun run dev        # Run without building
bun test           # Run tests
```

## Usage

### TUI Mode (Recommended)

```bash
lazytodo tui                    # Launch TUI with default ~/todo.txt
lazytodo -f todo.txt tui        # Use specific file
```

### Keyboard Shortcuts

#### Navigation
| Key | Action |
|-----|--------|
| `j` / `↓` | Move down |
| `k` / `↑` | Move up |
| `g` | Go to top |
| `G` | Go to bottom |
| `TAB` | Cycle panels (Tasks → Priorities → Projects → Contexts) |
| `ESC` | Return to tasks / Clear filter |

#### Task Actions
| Key | Action |
|-----|--------|
| `Space` | Toggle task completion |
| `Enter` / `e` / `i` | Edit task |
| `n` / `a` | Add new task |
| `d` | Add due date |
| `x` | Delete task |
| `y` | Yank (copy) task |
| `p` | Paste task |
| `0-9` | Set priority (number mode) |
| `Shift+A-Z` | Set priority (letter mode) |

#### View
| Key | Action |
|-----|--------|
| `v` | Toggle show completed tasks |
| `/` | Search tasks |
| `s` | Cycle sort mode |
| `o` | Toggle highlight overdue |
| `u` | Undo last action |
| `?` | Show help |
| `,` | Open settings |

#### Vim Commands
| Command | Action |
|---------|--------|
| `:q` / `:quit` | Quit |
| `:w` / `:write` | Save |
| `:wq` / `:x` | Save and quit |
| `:help` | Show help |
| `:set` | Open settings |
| `:theme <name>` | Switch theme |
| `:sort <mode>` | Change sort mode |

### CLI Mode

```bash
lazytodo list                    # List active tasks
lazytodo add "Call Mom +Family"  # Add task
lazytodo do 1                    # Complete task 1
lazytodo pri 1 A                 # Set priority A
lazytodo edit 1 "New text"       # Edit task
lazytodo delete 1                # Delete task
```

#### Filtering
```bash
lazytodo list -c phone           # Filter by @context
lazytodo list -p Work            # Filter by +project
lazytodo list --priority A       # Filter by priority
lazytodo list -s "search term"   # Search text
lazytodo list --all              # Include completed
```

## Panels

### Priority Chart
Visual bar chart showing task distribution by priority. Uses braille characters for high-resolution display with 20 levels of granularity.

### Projects Panel
Lists all `+project` tags. Press `Enter` to filter tasks by project.

### Contexts Panel
Lists all `@context` tags. Press `Enter` to filter tasks by context.

### Command History
Read-only log of recent commands (not included in TAB navigation).

### Stats (Header)
Shows DUE/OVERDUE count, DONE TODAY, and ACTIVE tasks.

## Configuration

Config file: `~/.config/todo-tui/config.toml`

```toml
# Priority mode: 'letter' (A-Z) or 'number' (0-9)
priorityMode = "number"

# Color theme
theme = "catppuccin"
```

### Available Themes
- `catppuccin` (default)
- `dracula`
- `nord`
- `gruvbox`
- `tokyonight`
- `solarized`
- `onedark`
- `monokai`

### Priority Format Detection

When opening a file, lazytodo detects the priority format used (letter A-Z or number 0-9). If it differs from your settings, you'll be prompted to:

1. **Convert the file** - Transform all priorities to match your settings
2. **Switch settings** - Adapt your settings to match the file format
3. **Ignore** - Keep both formats as-is

This ensures consistency and prevents confusion when working with files created with different priority modes.

### Todo File Location

Priority order:
1. `-f` flag: `lazytodo -f ~/my-todos.txt tui`
2. `TODO_FILE` environment variable
3. `./todo.txt` (current directory)
4. `~/todo.txt` (home directory)

## Todo.txt Format

```
(A) 2025-12-10 Call Mom +Family @phone due:2025-12-15
x 2025-12-11 (A) 2025-12-10 Completed task +Project @context
```

- `(A)` - Priority (A-Z or 0-9)
- `2025-12-10` - Creation date
- `+Family` - Project tag
- `@phone` - Context tag
- `due:2025-12-15` - Due date metadata
- `x` - Completion marker
- Second date after `x` - Completion date

## Tech Stack

- **Runtime:** [Bun](https://bun.sh)
- **Language:** TypeScript
- **TUI Framework:** [@opentui/react](https://github.com/anthropics/opentui)
- **State Management:** Zustand
- **CLI:** Commander.js

## License

MIT
