export interface ThemeColors {
  // Priority colors
  priorityHigh: string;
  priorityMedium: string;
  priorityLow: string;
  // UI colors
  success: string;
  muted: string;
  border: string;
  highlight: string;
  overdue: string;
  // Tag colors
  project: string;
  context: string;
  date: string;
  // Base colors
  text: string;
  textDim: string;
  background: string;
  selection: string;
}

export interface Theme {
  name: string;
  colors: ThemeColors;
}

// Catppuccin Mocha (default)
export const catppuccin: Theme = {
  name: 'Catppuccin',
  colors: {
    priorityHigh: '#f38ba8',    // red
    priorityMedium: '#fab387',   // peach
    priorityLow: '#89b4fa',      // blue
    success: '#a6e3a1',          // green
    muted: '#6c7086',            // overlay0
    border: '#585b70',           // surface2
    highlight: '#f9e2af',        // yellow
    overdue: '#eba0ac',          // maroon
    project: '#cba6f7',          // mauve
    context: '#94e2d5',          // teal
    date: '#f5c2e7',             // pink
    text: '#cdd6f4',             // text
    textDim: '#a6adc8',          // subtext0
    background: '#1e1e2e',       // base
    selection: '#45475a',        // surface0
  },
};

// Dracula
export const dracula: Theme = {
  name: 'Dracula',
  colors: {
    priorityHigh: '#ff5555',
    priorityMedium: '#ffb86c',
    priorityLow: '#8be9fd',
    success: '#50fa7b',
    muted: '#6272a4',
    border: '#44475a',
    highlight: '#f1fa8c',
    overdue: '#ff79c6',
    project: '#bd93f9',
    context: '#8be9fd',
    date: '#ff79c6',
    text: '#f8f8f2',
    textDim: '#6272a4',
    background: '#282a36',
    selection: '#44475a',
  },
};

// Nord
export const nord: Theme = {
  name: 'Nord',
  colors: {
    priorityHigh: '#bf616a',
    priorityMedium: '#d08770',
    priorityLow: '#81a1c1',
    success: '#a3be8c',
    muted: '#4c566a',
    border: '#3b4252',
    highlight: '#ebcb8b',
    overdue: '#bf616a',
    project: '#b48ead',
    context: '#88c0d0',
    date: '#d08770',
    text: '#eceff4',
    textDim: '#d8dee9',
    background: '#2e3440',
    selection: '#434c5e',
  },
};

// Gruvbox Dark
export const gruvbox: Theme = {
  name: 'Gruvbox',
  colors: {
    priorityHigh: '#fb4934',
    priorityMedium: '#fe8019',
    priorityLow: '#83a598',
    success: '#b8bb26',
    muted: '#665c54',
    border: '#504945',
    highlight: '#fabd2f',
    overdue: '#cc241d',
    project: '#d3869b',
    context: '#8ec07c',
    date: '#d79921',
    text: '#ebdbb2',
    textDim: '#a89984',
    background: '#282828',
    selection: '#3c3836',
  },
};

// Tokyo Night
export const tokyoNight: Theme = {
  name: 'Tokyo Night',
  colors: {
    priorityHigh: '#f7768e',
    priorityMedium: '#ff9e64',
    priorityLow: '#7aa2f7',
    success: '#9ece6a',
    muted: '#565f89',
    border: '#3b4261',
    highlight: '#e0af68',
    overdue: '#db4b4b',
    project: '#bb9af7',
    context: '#73daca',
    date: '#ff9e64',
    text: '#c0caf5',
    textDim: '#9aa5ce',
    background: '#1a1b26',
    selection: '#33467c',
  },
};

// Solarized Dark
export const solarized: Theme = {
  name: 'Solarized',
  colors: {
    priorityHigh: '#dc322f',
    priorityMedium: '#cb4b16',
    priorityLow: '#268bd2',
    success: '#859900',
    muted: '#586e75',
    border: '#073642',
    highlight: '#b58900',
    overdue: '#dc322f',
    project: '#6c71c4',
    context: '#2aa198',
    date: '#d33682',
    text: '#839496',
    textDim: '#657b83',
    background: '#002b36',
    selection: '#073642',
  },
};

// One Dark
export const oneDark: Theme = {
  name: 'One Dark',
  colors: {
    priorityHigh: '#e06c75',
    priorityMedium: '#d19a66',
    priorityLow: '#61afef',
    success: '#98c379',
    muted: '#5c6370',
    border: '#3e4451',
    highlight: '#e5c07b',
    overdue: '#be5046',
    project: '#c678dd',
    context: '#56b6c2',
    date: '#d19a66',
    text: '#abb2bf',
    textDim: '#828997',
    background: '#282c34',
    selection: '#3e4451',
  },
};

// Monokai Pro
export const monokai: Theme = {
  name: 'Monokai',
  colors: {
    priorityHigh: '#ff6188',
    priorityMedium: '#fc9867',
    priorityLow: '#78dce8',
    success: '#a9dc76',
    muted: '#727072',
    border: '#49483e',
    highlight: '#ffd866',
    overdue: '#ff6188',
    project: '#ab9df2',
    context: '#78dce8',
    date: '#fc9867',
    text: '#fcfcfa',
    textDim: '#939293',
    background: '#2d2a2e',
    selection: '#49483e',
  },
};

// All available themes
export const themes: Record<string, Theme> = {
  catppuccin,
  dracula,
  nord,
  gruvbox,
  tokyoNight,
  solarized,
  oneDark,
  monokai,
};

export const themeNames = Object.keys(themes);
export const defaultTheme = 'catppuccin';

// Get priority color based on priority value
export function getPriorityColor(priority: string | null, theme: Theme): string {
  if (!priority) return theme.colors.muted;

  // Handle numeric priorities (0-9)
  if (/^[0-9]$/.test(priority)) {
    const num = parseInt(priority);
    if (num <= 2) return theme.colors.priorityHigh;
    if (num <= 5) return theme.colors.priorityMedium;
    return theme.colors.priorityLow;
  }

  // Handle letter priorities (A-Z)
  const code = priority.charCodeAt(0);
  if (code <= 'C'.charCodeAt(0)) return theme.colors.priorityHigh;
  if (code <= 'F'.charCodeAt(0)) return theme.colors.priorityMedium;
  return theme.colors.priorityLow;
}
