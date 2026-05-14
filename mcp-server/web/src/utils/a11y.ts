/**
 * Accessibility Utilities — WCAG 2.1 AA Support
 * S4-MS1 P0-U02: Accessibility Audit
 *
 * Common accessibility patterns for PRISM components.
 */

/**
 * Generate a unique ID for accessibility associations
 */
let idCounter = 0;
export function generateA11yId(prefix: string = 'prism'): string {
  return `${prefix}-${++idCounter}-${Date.now().toString(36)}`;
}

/**
 * Create aria-describedby association for help text
 */
export function describeBy(helpTextId: string | undefined): object {
  return helpTextId ? { 'aria-describedby': helpTextId } : {};
}

/**
 * Create aria-labelledby association
 */
export function labelledBy(labelId: string | undefined): object {
  return labelId ? { 'aria-labelledby': labelId } : {};
}

/**
 * Screen reader only text (visually hidden)
 */
export const srOnlyClass = 'sr-only';
export const srOnlyStyles: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/**
 * Announce a message to screen readers via live region
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', priority);
  el.setAttribute('aria-atomic', 'true');
  Object.assign(el.style, srOnlyStyles);
  el.textContent = message;
  document.body.appendChild(el);

  // Remove after announcement
  setTimeout(() => el.remove(), 1000);
}

/**
 * Focus trap for modals and dialogs
 */
export function createFocusTrap(container: HTMLElement): {
  activate: () => void;
  deactivate: () => void;
} {
  const focusableSelector =
    'a[href], button:not([disabled]), input:not([disabled]), ' +
    'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  let previouslyFocused: HTMLElement | null = null;

  function getFocusableElements(): HTMLElement[] {
    return Array.from(container.querySelectorAll(focusableSelector));
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return;

    const focusable = getFocusableElements();
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return {
    activate() {
      previouslyFocused = document.activeElement as HTMLElement;
      container.addEventListener('keydown', handleKeyDown);

      // Focus first focusable element
      const focusable = getFocusableElements();
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    },
    deactivate() {
      container.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    },
  };
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * ARIA attributes for different component patterns
 */
export const ariaPatterns = {
  // Button that opens a menu/dropdown
  menuButton: (expanded: boolean, menuId: string) => ({
    'aria-expanded': expanded,
    'aria-haspopup': 'menu' as const,
    'aria-controls': menuId,
  }),

  // Tab panel association
  tabPanel: (tabId: string, selected: boolean) => ({
    role: 'tabpanel' as const,
    'aria-labelledby': tabId,
    hidden: !selected,
  }),

  // Tab button
  tab: (panelId: string, selected: boolean) => ({
    role: 'tab' as const,
    'aria-selected': selected,
    'aria-controls': panelId,
    tabIndex: selected ? 0 : -1,
  }),

  // Progress indicator
  progress: (value: number, min = 0, max = 100) => ({
    role: 'progressbar' as const,
    'aria-valuenow': value,
    'aria-valuemin': min,
    'aria-valuemax': max,
    'aria-valuetext': `${Math.round((value / max) * 100)}%`,
  }),

  // Alert/error message
  alert: (id: string) => ({
    role: 'alert' as const,
    'aria-live': 'assertive' as const,
    id,
  }),

  // Status message (less urgent)
  status: (id: string) => ({
    role: 'status' as const,
    'aria-live': 'polite' as const,
    id,
  }),

  // Combobox/autocomplete
  combobox: (listboxId: string, expanded: boolean) => ({
    role: 'combobox' as const,
    'aria-expanded': expanded,
    'aria-haspopup': 'listbox' as const,
    'aria-controls': listboxId,
    'aria-autocomplete': 'list' as const,
  }),

  // Option in a listbox
  option: (selected: boolean) => ({
    role: 'option' as const,
    'aria-selected': selected,
  }),
};

/**
 * Color contrast ratio calculator (simplified)
 * Returns approximate contrast ratio between two hex colors
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const getLuminance = (hex: string): number => {
    const rgb = hex
      .replace('#', '')
      .match(/.{2}/g)
      ?.map((x) => parseInt(x, 16) / 255) || [0, 0, 0];

    const [r, g, b] = rgb.map((c) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA requirements
 * Normal text: 4.5:1, Large text: 3:1
 */
export function meetsContrastAA(
  foreground: string,
  background: string,
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return ratio >= (isLargeText ? 3 : 4.5);
}
