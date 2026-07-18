/**
 * useThemeTokens tests (FLEET-IOS-REDESIGN U3, slot:hotel)
 *
 * Real intent tests -- each one fails if the specific behavior it names breaks.
 * The load-bearing case is BODY-not-HTML: overrides MUST write to
 * document.body.style so they win over the `body[data-theme='ios']` bridge rule.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  useThemeTokens,
  applyThemeTokens,
  DEFAULT_THEME_TOKENS,
  ACCENT_PRESETS,
} from '../hooks/useThemeTokens';

const STORAGE_KEY = 'kienzle-theme-tokens-v1';

beforeEach(() => {
  localStorage.clear();
  // Clear both body and html inline styles so each test starts from CSS defaults.
  document.body.removeAttribute('style');
  document.documentElement.removeAttribute('style');
});

describe('useThemeTokens -- accent', () => {
  it('setAccent writes the rgb triple to body and persists it', () => {
    const { result } = renderHook(() => useThemeTokens());

    act(() => {
      result.current.setAccent('34 211 238');
    });

    expect(document.body.style.getPropertyValue('--accent-rgb')).toBe('34 211 238');
    expect(result.current.tokens.accentRgb).toBe('34 211 238');

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) as string);
    expect(stored.accentRgb).toBe('34 211 238');
  });

  it('writes the override to BODY, not documentElement (beats the iOS bridge shadow)', () => {
    const { result } = renderHook(() => useThemeTokens());

    act(() => {
      result.current.setAccent('48 209 88');
    });

    // body has it; html (documentElement) does NOT -- proves we target body so an
    // inline style wins over the body[data-theme='ios'] selector rule.
    expect(document.body.style.getPropertyValue('--accent-rgb')).toBe('48 209 88');
    expect(document.documentElement.style.getPropertyValue('--accent-rgb')).toBe('');
  });
});

describe('useThemeTokens -- persistence across remount', () => {
  it('a fresh hook reads localStorage on mount and re-applies density to body', () => {
    const first = renderHook(() => useThemeTokens());

    act(() => {
      first.result.current.setDensity(1.1);
    });
    expect(document.body.style.getPropertyValue('--density')).toBe('1.1');

    first.unmount();
    // Simulate a fresh page load: body inline style is gone but localStorage persists.
    document.body.removeAttribute('style');
    expect(document.body.style.getPropertyValue('--density')).toBe('');

    renderHook(() => useThemeTokens());
    expect(document.body.style.getPropertyValue('--density')).toBe('1.1');
  });
});

describe('useThemeTokens -- radius', () => {
  it("radius 'sharp' sets --radius-md to 10px on body", () => {
    const { result } = renderHook(() => useThemeTokens());

    act(() => {
      result.current.setRadius('sharp');
    });

    expect(document.body.style.getPropertyValue('--radius-md')).toBe('10px');
  });

  it("radius 'default' removes the body override so the CSS/bridge value wins", () => {
    const { result } = renderHook(() => useThemeTokens());

    act(() => {
      result.current.setRadius('sharp');
    });
    expect(document.body.style.getPropertyValue('--radius-md')).toBe('10px');

    act(() => {
      result.current.setRadius('default');
    });
    expect(document.body.style.getPropertyValue('--radius-md')).toBe('');
  });
});

describe('useThemeTokens -- reset', () => {
  it('reset clears the body accent override and removes the storage key', () => {
    const { result } = renderHook(() => useThemeTokens());

    act(() => {
      result.current.setAccent('191 90 242');
    });
    expect(document.body.style.getPropertyValue('--accent-rgb')).toBe('191 90 242');

    act(() => {
      result.current.reset();
    });

    expect(document.body.style.getPropertyValue('--accent-rgb')).toBe('');
    expect(localStorage.getItem(STORAGE_KEY)).toBe(null);
    expect(result.current.tokens).toEqual(DEFAULT_THEME_TOKENS);
  });
});

describe('useThemeTokens -- adversarial', () => {
  it('corrupt localStorage on mount does not throw and falls back to defaults', () => {
    localStorage.setItem(STORAGE_KEY, 'not json');

    const { result } = renderHook(() => useThemeTokens());

    // No override applied -- body accent stays empty, state is the default.
    expect(document.body.style.getPropertyValue('--accent-rgb')).toBe('');
    expect(result.current.tokens).toEqual(DEFAULT_THEME_TOKENS);
  });
});

describe('applyThemeTokens (pure helper) + presets', () => {
  it('applyThemeTokens writes density and round radii directly to body', () => {
    applyThemeTokens({ accentRgb: '255 159 10', density: 0.9, radius: 'round' });

    expect(document.body.style.getPropertyValue('--accent-rgb')).toBe('255 159 10');
    expect(document.body.style.getPropertyValue('--density')).toBe('0.9');
    expect(document.body.style.getPropertyValue('--radius-md')).toBe('22px');
  });

  it('ACCENT_PRESETS includes Kienzle Cyan and System Blue as RGB triples', () => {
    const byName = new Map(ACCENT_PRESETS.map((p) => [p.name, p.rgb]));
    expect(byName.get('Kienzle Cyan')).toBe('34 211 238');
    expect(byName.get('System Blue')).toBe('10 132 255');
    // KIENZLE-MERGE U-KZ-THEME: the Kienzle brand triad (green #36d399, orange
    // #ff5a2b) joins the presets so the ThemeCustomizer can offer them; green is
    // the data-brand='kienzle' default and must match the index.css bridge value.
    expect(byName.get('Kienzle Green')).toBe('54 211 153');
    expect(byName.get('Kienzle Orange')).toBe('255 90 43');
    expect(ACCENT_PRESETS.length).toBe(7);
  });
});
