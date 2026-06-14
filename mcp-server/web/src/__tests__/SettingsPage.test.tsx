/**
 * SettingsPage Appearance-tab tests (FLEET-IOS-REDESIGN U3e, slot:hotel)
 *
 * Locks that the iOS Appearance customization is now REACHABLE: U3b-U3d built +
 * wired the theme hooks and made the accent token drive the primitives, but the
 * ThemeCustomizer had no route (arm-B P2). U3e mounts it as a tab on the
 * (previously orphaned) Codex SettingsPage. These tests prove (a) the Codex page
 * still works (no regression to its General tab), (b) switching to Appearance
 * mounts the ThemeCustomizer, and (c) the accent dial drives document.body live
 * THROUGH the page -- an R15 round-trip through the real route surface.
 *
 * No providers are needed: SettingsPage's useToast reads a no-op default context
 * value (ToastProvider is absent app-wide), and the page uses no router hooks.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsPage from '../pages/SettingsPage';

afterEach(() => {
  // useThemeTokens (via ThemeCustomizer) writes overrides to document.body +
  // localStorage and does not clean up on unmount; reset to isolate tests.
  const s = document.body.style;
  ['--accent-rgb', '--accent-fg', '--density', '--radius-sm', '--radius-md', '--radius-lg'].forEach(
    (p) => s.removeProperty(p),
  );
  try {
    window.localStorage.clear();
  } catch {
    // storage disabled -- nothing to clear
  }
});

describe('SettingsPage -- Appearance tab (FLEET-IOS-REDESIGN U3e)', () => {
  it('the Codex General tab still renders by default + the Appearance tab exists (no regression)', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Units')).toBeInTheDocument(); // unique to the General tab
    expect(screen.getByRole('tab', { name: 'Appearance' })).toBeInTheDocument();
  });

  it('switching to Appearance mounts the ThemeCustomizer accent presets (absent until active)', () => {
    render(<SettingsPage />);
    // TabPanel returns null when inactive, so the customizer is not in the DOM yet.
    expect(screen.queryByRole('radio', { name: 'System Blue' })).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Appearance' }));
    expect(screen.getByRole('radio', { name: 'System Blue' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'PRISM Cyan' })).toBeInTheDocument();
  });

  it('the Appearance accent dial writes --accent-rgb to document.body live, through the routed page', () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Appearance' }));
    fireEvent.click(screen.getByRole('radio', { name: 'PRISM Cyan' }));
    expect(document.body.style.getPropertyValue('--accent-rgb')).toBe('34 211 238');
  });

  it('the Appearance live preview renders sample primitives (the accent + semantic mix)', () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Appearance' }));
    expect(screen.getByRole('button', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Success' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Danger' })).toBeInTheDocument();
  });
});
