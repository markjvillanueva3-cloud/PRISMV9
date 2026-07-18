/**
 * desktopRouter -- the multi-shell router selector (QX5 follow-up). Tests the
 * intent (R9): the Electron shell gets HashRouter (file:// safe), web + Capacitor
 * get BrowserRouter, and the web default is deny-by-default (no marker -> Browser).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { isDesktopShell, selectRouter } from '../lib/desktopRouter';

type WinWithMarker = { prismDesktop?: { isDesktop?: boolean; platform?: string } };

afterEach(() => {
  delete (window as WinWithMarker).prismDesktop;
});

describe('desktopRouter (multi-shell routing)', () => {
  it('web (no desktop marker) -> BrowserRouter', () => {
    expect(isDesktopShell()).toBe(false);
    expect(selectRouter()).toBe(BrowserRouter);
  });

  it('Electron shell (window.prismDesktop.isDesktop=true) -> HashRouter', () => {
    (window as WinWithMarker).prismDesktop = { isDesktop: true, platform: 'win32' };
    expect(isDesktopShell()).toBe(true);
    expect(selectRouter()).toBe(HashRouter);
  });

  it('marker present but isDesktop falsy -> BrowserRouter (deny-by-default)', () => {
    (window as WinWithMarker).prismDesktop = { isDesktop: false };
    expect(isDesktopShell()).toBe(false);
    expect(selectRouter()).toBe(BrowserRouter);
  });
});
