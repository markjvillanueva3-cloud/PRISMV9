/**
 * ThemeCustomizer tests (FLEET-IOS-REDESIGN U3b, slot:hotel)
 *
 * Integration-locks the consumer that wires useThemeTokens + useHaptics: every
 * assertion drives the REAL hooks (no mocks), so a click must actually write the
 * override to document.body and persist it -- an R15 round-trip THROUGH the
 * consumer, not a shallow render check. Also locks two deliberate decisions:
 *   - overrides land on document.body, never documentElement (the iOS-bridge
 *     shadowing rule the useThemeTokens header calls load-bearing), and
 *   - there is NO density control (--density is a dead dial with zero
 *     var(--density) consumers; scrutiny arm-C P2).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeCustomizer } from '../components/workspace/ThemeCustomizer';

type MutableNavigator = { vibrate?: unknown };
const nav = navigator as unknown as MutableNavigator;

afterEach(() => {
  // useThemeTokens writes overrides to document.body + localStorage and does NOT
  // clean up on unmount; RTL auto-cleanup unmounts but leaves those globals, so
  // we reset them here to isolate each test.
  const style = document.body.style;
  style.removeProperty('--accent-rgb');
  style.removeProperty('--density');
  style.removeProperty('--radius-sm');
  style.removeProperty('--radius-md');
  style.removeProperty('--radius-lg');
  try {
    window.localStorage.clear();
  } catch {
    // storage disabled -- nothing to clear
  }
  delete nav.vibrate;
  vi.restoreAllMocks();
});

describe('ThemeCustomizer — accent color', () => {
  it('renders every ACCENT_PRESET as a radio, with System Blue selected by default', () => {
    render(<ThemeCustomizer />);
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.getByRole('radio', { name: 'System Blue' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'PRISM Cyan' })).toHaveAttribute('aria-checked', 'false');
  });

  it('clicking a swatch writes its rgb to --accent-rgb on document.body and flips aria-checked', () => {
    render(<ThemeCustomizer />);
    fireEvent.click(screen.getByRole('radio', { name: 'PRISM Cyan' }));
    expect(document.body.style.getPropertyValue('--accent-rgb')).toBe('34 211 238');
    expect(screen.getByRole('radio', { name: 'PRISM Cyan' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'System Blue' })).toHaveAttribute('aria-checked', 'false');
  });

  it('writes the override to BODY, never documentElement (the iOS-bridge shadowing rule)', () => {
    render(<ThemeCustomizer />);
    fireEvent.click(screen.getByRole('radio', { name: 'System Green' }));
    expect(document.body.style.getPropertyValue('--accent-rgb')).toBe('48 209 88');
    expect(document.documentElement.style.getPropertyValue('--accent-rgb')).toBe('');
  });

  it('picking a swatch fires a selection haptic (navigator.vibrate 5ms)', () => {
    const vibrate = vi.fn();
    nav.vibrate = vibrate;
    render(<ThemeCustomizer />);
    fireEvent.click(screen.getByRole('radio', { name: 'System Orange' }));
    expect(vibrate).toHaveBeenCalledWith(5);
  });
});

describe('ThemeCustomizer — corner radius', () => {
  it('renders the 3 radius options with Default active initially', () => {
    render(<ThemeCustomizer />);
    expect(screen.getByRole('button', { name: 'Default' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Sharp' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Round' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('selecting Round writes the round --radius-md to body; back to Default removes it', () => {
    render(<ThemeCustomizer />);
    fireEvent.click(screen.getByRole('button', { name: 'Round' }));
    expect(document.body.style.getPropertyValue('--radius-md')).toBe('22px');
    expect(screen.getByRole('button', { name: 'Round' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Default' }));
    // 'default' REMOVES the override so the CSS/iOS-bridge value resumes.
    expect(document.body.style.getPropertyValue('--radius-md')).toBe('');
  });

  it('selecting Sharp writes the sharp --radius-md to body', () => {
    render(<ThemeCustomizer />);
    fireEvent.click(screen.getByRole('button', { name: 'Sharp' }));
    expect(document.body.style.getPropertyValue('--radius-md')).toBe('10px');
  });
});

describe('ThemeCustomizer — reset + the deliberate no-density-dial', () => {
  it('Reset clears every body override and localStorage', () => {
    render(<ThemeCustomizer />);
    fireEvent.click(screen.getByRole('radio', { name: 'PRISM Cyan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Round' }));
    expect(document.body.style.getPropertyValue('--accent-rgb')).toBe('34 211 238');

    fireEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }));
    expect(document.body.style.getPropertyValue('--accent-rgb')).toBe('');
    expect(document.body.style.getPropertyValue('--radius-md')).toBe('');
    expect(window.localStorage.getItem('prism-theme-tokens-v1')).toBeNull();
  });

  it('exposes NO density control (--density is a dead dial until primitives consume it)', () => {
    render(<ThemeCustomizer />);
    expect(screen.queryByText(/density/i)).toBeNull();
    expect(screen.queryByRole('slider')).toBeNull();
    expect(screen.queryByLabelText(/density/i)).toBeNull();
  });
});
