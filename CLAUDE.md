# Development Guide for Todo TUI

This is a CLI/TUI application built with Bun and TypeScript.

## Bun Basics

Use Bun instead of Node.js for all operations:

- `bun run dev` - Run the app in development mode
- `bun run build` - Compile to standalone binary
- `bun test` - Run tests
- `bun install` - Install dependencies

## Project Structure

```
todo-cli/
├── src/
│   ├── parser/         # Todo.txt format parser
│   ├── commands/       # CLI command implementations
│   ├── ui/             # UI formatting and colors
│   ├── tui/            # Interactive TUI mode
│   ├── storage.ts      # File I/O operations
│   └── config.ts       # User configuration
├── index.ts            # Main CLI entry point
└── package.json
```

## Building

The app compiles to a standalone binary with no dependencies:

```bash
bun build index.ts --compile --outfile todo
```

This creates a self-contained executable that can be distributed and run without requiring Bun or Node.js to be installed.

## Testing

Use `bun test` to run tests:

```ts
import { test, expect } from "bun:test";

test("parse todo.txt task", () => {
  const task = parseTask("(A) 2025-12-10 Call Mom +Family @phone");
  expect(task.priority).toBe("A");
  expect(task.projects).toContain("Family");
});
```

## Terminal/TUI Development

### Key Libraries

- **chalk** - Terminal colors and styling
- **commander** - CLI argument parsing
- **readline** - Keyboard input handling

### TUI Considerations

- Use `stdin.setRawMode(true)` for character-by-character input
- Use ANSI escape codes for cursor positioning and screen clearing
- Handle terminal resize events
- Always restore terminal state on exit (`setRawMode(false)`)
- Hide cursor during rendering, show on exit

### File I/O

Prefer `Bun.file()` for file operations:

```ts
// Reading
const file = Bun.file("todo.txt");
const content = await file.text();

// Writing
await Bun.write("todo.txt", content);
```

## Todo.txt Format

Follow the [todo.txt specification](https://github.com/todotxt/todo.txt):

- Priorities: `(A)` through `(Z)` at start of line
- Completion: `x 2025-12-10` for completed tasks
- Dates: `YYYY-MM-DD` format
- Projects: `+ProjectName`
- Contexts: `@ContextName`
- Metadata: `key:value` pairs

## Development Workflow

1. Make changes to source files in `src/`
2. Test with `bun run dev`
3. Run tests with `bun test`
4. Build binary with `bun run build`
5. Test the compiled binary: `./todo i`

## Tips

- Use `Bun.env` to access environment variables (no need for dotenv)
- Bun automatically transpiles TypeScript
- Use `--hot` flag for hot reload during development
- The compiled binary includes all dependencies and the Bun runtime
