// Exact Claude (Anthropic) palette mapped from DESIGN-claude.md into Neo-Brutalism tokens

export const COLORS = {
  // Primary - Warm Coral (Anthropic signature)
  primary: {
    DEFAULT: "#cc785c",
    hover: "#b8674c",
    active: "#a9583e",
    disabled: "#e6dfd8",
  },

  // Light theme: Tinted cream canvas (#faf9f5), warm cream surfaces (#efe9de, #f5f0e8), ink text & borders (#141413)
  light: {
    bg: "#faf9f5",
    bgAlt: "#f5f0e8",
    surface: "#ffffff",
    surfaceCard: "#efe9de",
    surface2: "#efe9de",
    surface3: "#e8e0d2",
    sidebar: "#f5f0e8",
    border: "#141413",
    borderSubtle: "#e6dfd8",
    borderHairline: "#e6dfd8",
    textMain: "#141413",
    textBody: "#3d3d3a",
    textMuted: "#6c6a64",
    textSubtle: "#8e8b82",
  },

  // Dark theme: Dark product surfaces (#181715, #1f1e1b, #252320), light on-dark text (#faf9f5, #a09d96)
  dark: {
    bg: "#181715",
    bgAlt: "#1f1e1b",
    surface: "#252320",
    surfaceCard: "#252320",
    surface2: "#2d2a26",
    surface3: "#383530",
    sidebar: "#1f1e1b",
    border: "#3d3a35",
    borderSubtle: "#2d2a26",
    borderHairline: "#383530",
    textMain: "#faf9f5",
    textBody: "#e6dfd8",
    textMuted: "#a09d96",
    textSubtle: "#8e8b82",
  },

  // Accents & Semantic status from DESIGN-claude.md
  accent: {
    teal: "#5db8a6",
    amber: "#e8a55a",
  },
  status: {
    success: "#5db872",
    successLight: "#eaf7ed",
    warning: "#d4a017",
    warningLight: "#fbf6e8",
    error: "#c64545",
    errorLight: "#faecec",
    info: "#5db8a6",
    infoLight: "#eaf7f5",
  },
};

// CSS Variables mapping for Tailwind
export const CSS_VARIABLES = {
  light: {
    "--color-primary": COLORS.primary.DEFAULT,
    "--color-primary-hover": COLORS.primary.hover,
    "--color-primary-active": COLORS.primary.active,
    "--color-bg": COLORS.light.bg,
    "--color-bg-alt": COLORS.light.bgAlt,
    "--color-surface": COLORS.light.surface,
    "--color-surface-2": COLORS.light.surface2,
    "--color-surface-3": COLORS.light.surface3,
    "--color-sidebar": COLORS.light.sidebar,
    "--color-border": COLORS.light.border,
    "--color-border-subtle": COLORS.light.borderSubtle,
    "--color-text-main": COLORS.light.textMain,
    "--color-text-muted": COLORS.light.textMuted,
  },
  dark: {
    "--color-primary": COLORS.primary.DEFAULT,
    "--color-primary-hover": COLORS.primary.hover,
    "--color-primary-active": COLORS.primary.active,
    "--color-bg": COLORS.dark.bg,
    "--color-bg-alt": COLORS.dark.bgAlt,
    "--color-surface": COLORS.dark.surface,
    "--color-surface-2": COLORS.dark.surface2,
    "--color-surface-3": COLORS.dark.surface3,
    "--color-sidebar": COLORS.dark.sidebar,
    "--color-border": COLORS.dark.border,
    "--color-border-subtle": COLORS.dark.borderSubtle,
    "--color-text-main": COLORS.dark.textMain,
    "--color-text-muted": COLORS.dark.textMuted,
  },
};
