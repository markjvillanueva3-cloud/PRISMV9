/**
 * PRISM Design System — Visual Consistency Utilities
 * S4-MS1 P0-U06: Visual Polish & Design Consistency
 *
 * Centralized design tokens and utilities for consistent UI.
 * Reference: web/CLAUDE.md "Calculator Studio" design language.
 */

// ============================================================================
// COLOR PALETTE
// ============================================================================

export const colors = {
  // Primary brand colors
  primary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Glow accent colors
  glow: {
    cyan: 'rgba(34, 211, 238, 0.6)',
    violet: 'rgba(167, 139, 250, 0.6)',
    emerald: 'rgba(52, 211, 153, 0.6)',
    amber: 'rgba(251, 191, 36, 0.6)',
    red: 'rgba(248, 113, 113, 0.6)',
  },

  // Status colors
  status: {
    info: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
    success: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    warning: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
    error: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
    pending: { bg: 'bg-violet-500/20', text: 'text-violet-400', border: 'border-violet-500/30' },
  },

  // Background layers
  background: {
    base: 'rgba(2, 6, 23, 0.78)',
    elevated: 'rgba(15, 23, 42, 0.9)',
    surface: 'rgba(30, 41, 59, 0.8)',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  // Text colors
  text: {
    primary: '#e2e8f0',
    secondary: '#94a3b8',
    muted: '#64748b',
    inverse: '#0f172a',
  },

  // Border colors
  border: {
    default: 'rgba(148, 163, 184, 0.08)',
    subtle: 'rgba(255, 255, 255, 0.05)',
    accent: 'rgba(255, 255, 255, 0.10)',
  },
} as const;

// ============================================================================
// STATUS MAPPING
// ============================================================================

/** Map business status to visual status */
export const statusMap: Record<string, keyof typeof colors.status> = {
  // Success states
  complete: 'success',
  completed: 'success',
  success: 'success',
  in_progress: 'success',
  active: 'success',

  // Warning states
  on_hold: 'warning',
  qc_pending: 'warning',
  warning: 'warning',
  review: 'warning',

  // Error states
  qc_failed: 'error',
  error: 'error',
  failed: 'error',
  rejected: 'error',

  // Info states
  ordered: 'info',
  shipped: 'info',
  info: 'info',

  // Pending states
  scheduled: 'pending',
  pending: 'pending',
  waiting: 'pending',
  queued: 'pending',
};

export function getStatusColor(status: string): typeof colors.status[keyof typeof colors.status] {
  const key = statusMap[status.toLowerCase()] || 'info';
  return colors.status[key];
}

// ============================================================================
// SPACING & SIZING
// ============================================================================

export const spacing = {
  xs: '0.25rem', // 4px
  sm: '0.5rem', // 8px
  md: '1rem', // 16px
  lg: '1.5rem', // 24px
  xl: '2rem', // 32px
  '2xl': '3rem', // 48px
  '3xl': '4rem', // 64px
} as const;

export const borderRadius = {
  none: '0',
  sm: '0.25rem', // 4px
  md: '0.375rem', // 6px
  lg: '0.5rem', // 8px
  xl: '0.75rem', // 12px
  '2xl': '1rem', // 16px
  full: '9999px',
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  fontFamily: {
    sans: 'Inter, system-ui, -apple-system, sans-serif',
    mono: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

// ============================================================================
// COMPONENT VARIANTS
// ============================================================================

/** Common button variants */
export const buttonVariants = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-gray-700 hover:bg-gray-600 text-gray-200',
  outline: 'border border-gray-600 hover:border-gray-500 text-gray-300',
  ghost: 'hover:bg-gray-800 text-gray-400 hover:text-gray-200',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
} as const;

/** Common input variants */
export const inputVariants = {
  default: 'bg-gray-800/50 border-gray-700 text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500/20',
  error: 'bg-red-900/20 border-red-500 text-gray-100 focus:border-red-500 focus:ring-red-500/20',
  success: 'bg-emerald-900/20 border-emerald-500 text-gray-100 focus:border-emerald-500 focus:ring-emerald-500/20',
} as const;

/** Card variants */
export const cardVariants = {
  default: 'bg-[rgba(2,6,23,0.78)] border border-white/10 rounded-lg',
  elevated: 'bg-slate-800/80 border border-white/5 rounded-xl shadow-xl',
  glass: 'bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg',
} as const;

// ============================================================================
// ANIMATION
// ============================================================================

export const transitions = {
  fast: 'transition-all duration-150 ease-out',
  normal: 'transition-all duration-200 ease-out',
  slow: 'transition-all duration-300 ease-out',
  spring: 'transition-all duration-200 ease-[cubic-bezier(0.2,0.9,0.28,1)]',
} as const;

export const animations = {
  fadeIn: 'animate-[fadeIn_200ms_ease-out]',
  slideUp: 'animate-[slideUp_200ms_ease-out]',
  slideDown: 'animate-[slideDown_200ms_ease-out]',
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  bounce: 'animate-bounce',
} as const;

// ============================================================================
// CSS CLASS GENERATORS
// ============================================================================

/** Generate glow border class */
export function glowBorder(color: keyof typeof colors.glow): string {
  return `shadow-[0_0_15px_${colors.glow[color]}] border-${color}-500/30`;
}

/** Generate status chip classes */
export function statusChip(status: string): string {
  const { bg, text, border } = getStatusColor(status);
  return `${bg} ${text} ${border} rounded-full px-2 py-0.5 text-xs font-medium`;
}

/** Generate prism card classes */
export function prismCard(variant: keyof typeof cardVariants = 'default'): string {
  return `${cardVariants[variant]} p-4`;
}

// ============================================================================
// TAILWIND CLASS PRESETS
// ============================================================================

/** Common class combinations for reuse */
export const presets = {
  // Page containers
  pageContainer: 'min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 p-6',
  contentContainer: 'max-w-7xl mx-auto',

  // Cards
  card: 'bg-[rgba(2,6,23,0.78)] border border-white/10 rounded-lg p-4',
  cardHeader: 'text-lg font-semibold text-gray-100 mb-4',
  cardBody: 'text-sm text-gray-300',

  // Forms
  label: 'block text-sm font-medium text-gray-300 mb-1',
  input: 'w-full bg-gray-800/50 border border-gray-700 rounded-md px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20',
  select: 'w-full bg-gray-800/50 border border-gray-700 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:border-blue-500',

  // Buttons
  buttonBase: 'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed',
  buttonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
  buttonSecondary: 'bg-gray-700 hover:bg-gray-600 text-gray-200 focus:ring-gray-500',

  // Tables
  table: 'w-full text-sm text-left text-gray-300',
  tableHeader: 'text-xs text-gray-400 uppercase bg-gray-800/50',
  tableRow: 'border-b border-gray-800 hover:bg-gray-800/30',
  tableCell: 'px-4 py-3',

  // Status indicators
  statusDot: 'w-2 h-2 rounded-full',
  statusBadge: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',

  // Glow effects
  glowCyan: 'shadow-[0_0_15px_rgba(34,211,238,0.3)]',
  glowViolet: 'shadow-[0_0_15px_rgba(167,139,250,0.3)]',
  glowEmerald: 'shadow-[0_0_15px_rgba(52,211,153,0.3)]',
  glowAmber: 'shadow-[0_0_15px_rgba(251,191,36,0.3)]',
} as const;

export default {
  colors,
  spacing,
  borderRadius,
  typography,
  transitions,
  animations,
  buttonVariants,
  inputVariants,
  cardVariants,
  presets,
  getStatusColor,
  statusChip,
  glowBorder,
  prismCard,
};
