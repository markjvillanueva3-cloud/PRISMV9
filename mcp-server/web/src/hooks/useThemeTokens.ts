/**
 * useThemeTokens -- per-user theme customization (FLEET-IOS-REDESIGN U3, slot:hotel)
 *
 * Lets a user override the three theme dials that the iOS redesign exposes:
 *   - accent color  (--accent-rgb, a space-separated "R G B" triple)
 *   - density       (--density, scales control padding/height)
 *   - corner radius  (--radius-sm/md/lg)
 *
 * CRITICAL: every override is written to document.body.style, NOT
 * document.documentElement.style. The iOS-mode bridge in index.css
 * (`body[data-theme='ios']`) re-points --accent-rgb / --radius-* ON body, which
 * shadows anything set on <html> (body's parent). An inline style set on body --
 * the SAME element that carries the selector rule -- wins by specificity (inline
 * style beats a selector), so the user choice always takes effect. Writing to
 * documentElement would be silently overridden in iOS mode. (See index.css L85:
 * "An inline setProperty() (useThemeTokens, U3) still wins over this rule.")
 *
 * Fail-soft: all window / localStorage access is typeof-guarded + try/catch so
 * SSR or a storage-disabled browser never throws -- the app just keeps the CSS
 * defaults.
 */
import { useCallback, useEffect, useState } from 'react';

export type ThemeRadius = 'sharp' | 'default' | 'round';

export interface ThemeTokens {
  accentRgb: string;
  density: number;
  radius: ThemeRadius;
}

/**
 * Accent presets -- the iOS dark-mode system colors plus PRISM's canonical cyan.
 * Stored as space-separated "R G B" triples so a primitive composes any alpha
 * via rgb(var(--accent-rgb) / 0.12).
 */
export const ACCENT_PRESETS: ReadonlyArray<{ name: string; rgb: string }> = [
  { name: 'System Blue', rgb: '10 132 255' },
  { name: 'Kienzle Cyan', rgb: '34 211 238' },
  // KIENZLE-MERGE U-KZ-THEME (slot:charlie) -- the redesign's brand triad as
  // user-selectable accents. Green #36d399 is the default under data-brand='kienzle'
  // (matches the index.css bridge); orange #ff5a2b is the CTA accent.
  { name: 'Kienzle Green', rgb: '54 211 153' },
  { name: 'Kienzle Orange', rgb: '255 90 43' },
  { name: 'System Green', rgb: '48 209 88' },
  { name: 'System Purple', rgb: '191 90 242' },
  { name: 'System Orange', rgb: '255 159 10' },
];

export const DEFAULT_THEME_TOKENS: ThemeTokens = {
  accentRgb: '10 132 255',
  density: 1,
  radius: 'default',
};

// KIENZLE-MERGE U-KZ-THEME: aligned to the Kienzle brand (was 'prism-theme-tokens-v1').
// Both test files (useThemeTokens.test.tsx, ThemeCustomizer.test.tsx) already keyed off
// 'kienzle-theme-tokens-v1' at HEAD while the hook still wrote the old prism key -- a
// pre-existing drift that broke setAccent-persist + reset tests. Closing it under the
// PRISM->Kienzle rename. Cost: an existing user's saved accent/radius preference resets
// to default once on first load (a single localStorage key, negligible vs the rebrand).
const STORAGE_KEY = 'kienzle-theme-tokens-v1';

/** sharp / round radius maps (px). 'default' removes the override so the CSS/bridge value wins. */
const RADIUS_MAP: Record<'sharp' | 'round', { sm: string; md: string; lg: string }> = {
  sharp: { sm: '8px', md: '10px', lg: '12px' },
  round: { sm: '16px', md: '22px', lg: '28px' },
};

/**
 * Apply theme tokens to document.body inline style. Pure side-effect helper,
 * exported for unit testing. Writes to BODY (not documentElement) -- see the
 * file header for why this is load-bearing.
 */
export function applyThemeTokens(t: ThemeTokens): void {
  if (typeof document === 'undefined' || !document.body) {
    return;
  }
  const style = document.body.style;
  style.setProperty('--accent-rgb', t.accentRgb);
  style.setProperty('--density', String(t.density));

  if (t.radius === 'default') {
    style.removeProperty('--radius-sm');
    style.removeProperty('--radius-md');
    style.removeProperty('--radius-lg');
  } else {
    const r = RADIUS_MAP[t.radius];
    style.setProperty('--radius-sm', r.sm);
    style.setProperty('--radius-md', r.md);
    style.setProperty('--radius-lg', r.lg);
  }
}

/** Remove every body inline override so the CSS :root / iOS-bridge values resume. */
function clearThemeTokens(): void {
  if (typeof document === 'undefined' || !document.body) {
    return;
  }
  const style = document.body.style;
  style.removeProperty('--accent-rgb');
  style.removeProperty('--density');
  style.removeProperty('--radius-sm');
  style.removeProperty('--radius-md');
  style.removeProperty('--radius-lg');
}

function isThemeRadius(value: unknown): value is ThemeRadius {
  return value === 'sharp' || value === 'default' || value === 'round';
}

/** Validate an unknown parsed-JSON blob into ThemeTokens, or null if malformed. */
function parseTokens(raw: unknown): ThemeTokens | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.accentRgb !== 'string') {
    return null;
  }
  if (typeof obj.density !== 'number' || !Number.isFinite(obj.density)) {
    return null;
  }
  if (!isThemeRadius(obj.radius)) {
    return null;
  }
  return { accentRgb: obj.accentRgb, density: obj.density, radius: obj.radius };
}

function readStoredTokens(): ThemeTokens | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    return parseTokens(JSON.parse(stored));
  } catch {
    return null;
  }
}

function persistTokens(t: ThemeTokens): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
  } catch {
    // storage full / disabled -- fail soft, the in-memory state still drives the UI
  }
}

function clearStoredTokens(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // fail soft
  }
}

export function useThemeTokens() {
  const [tokens, setTokens] = useState<ThemeTokens>(DEFAULT_THEME_TOKENS);

  // On mount: hydrate from localStorage IFF a valid blob exists. Absent/invalid
  // -> leave the CSS defaults untouched (do NOT apply DEFAULT_THEME_TOKENS, which
  // would needlessly pin --accent-rgb on body and could fight the iOS bridge).
  useEffect(() => {
    const stored = readStoredTokens();
    if (stored) {
      setTokens(stored);
      applyThemeTokens(stored);
    }
  }, []);

  const setAccent = useCallback(
    (rgb: string) => {
      setTokens((prev) => {
        const next = { ...prev, accentRgb: rgb };
        applyThemeTokens(next);
        persistTokens(next);
        return next;
      });
    },
    [],
  );

  const setDensity = useCallback(
    (n: number) => {
      setTokens((prev) => {
        const next = { ...prev, density: n };
        applyThemeTokens(next);
        persistTokens(next);
        return next;
      });
    },
    [],
  );

  const setRadius = useCallback(
    (r: ThemeRadius) => {
      setTokens((prev) => {
        const next = { ...prev, radius: r };
        applyThemeTokens(next);
        persistTokens(next);
        return next;
      });
    },
    [],
  );

  const reset = useCallback(() => {
    setTokens(DEFAULT_THEME_TOKENS);
    clearThemeTokens();
    clearStoredTokens();
  }, []);

  return { tokens, setAccent, setDensity, setRadius, reset };
}
