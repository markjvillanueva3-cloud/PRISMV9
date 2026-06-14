/**
 * useHaptics tests (FLEET-IOS-REDESIGN U3, slot:hotel)
 *
 * Proves the call-time detection order: native Capacitor plugin first, then the
 * navigator.vibrate Android-web fallback, then a safe no-op when neither exists.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useHaptics } from '../hooks/useHaptics';

// Loose optional-property views of the globals so the test can add/remove its
// stubs. The property is optional here (unlike lib.dom's non-optional members),
// which is what `delete` requires as its operand.
type MutableWindow = { Capacitor?: unknown };
type MutableNavigator = { vibrate?: unknown };

const win = window as unknown as MutableWindow;
const nav = navigator as unknown as MutableNavigator;

afterEach(() => {
  delete win.Capacitor;
  delete nav.vibrate;
  vi.restoreAllMocks();
});

describe('useHaptics -- Capacitor native plugin present', () => {
  it('impact and selection route to the Capacitor Haptics plugin', () => {
    const impactFn = vi.fn();
    const notificationFn = vi.fn();
    const selectionChangedFn = vi.fn();
    win.Capacitor = {
      Plugins: {
        Haptics: {
          impact: impactFn,
          notification: notificationFn,
          selectionChanged: selectionChangedFn,
        },
      },
    };

    const { result } = renderHook(() => useHaptics());

    act(() => {
      result.current.impact('light');
    });
    expect(impactFn).toHaveBeenCalledWith({ style: 'light' });

    act(() => {
      result.current.selection();
    });
    expect(selectionChangedFn).toHaveBeenCalledTimes(1);
  });
});

describe('useHaptics -- navigator.vibrate fallback (Android web)', () => {
  it('impact and selection map to navigator.vibrate durations when no Capacitor', () => {
    const vibrateFn = vi.fn();
    nav.vibrate = vibrateFn;

    const { result } = renderHook(() => useHaptics());

    act(() => {
      result.current.impact('medium');
    });
    expect(vibrateFn).toHaveBeenCalledWith(12);

    act(() => {
      result.current.selection();
    });
    expect(vibrateFn).toHaveBeenCalledWith(5);
  });
});

describe('useHaptics -- no haptics surface available', () => {
  it('impact does not throw when neither Capacitor nor navigator.vibrate exist', () => {
    // afterEach already deletes both; assert the no-op path is exception-safe.
    expect(win.Capacitor).toBe(undefined);
    expect(nav.vibrate).toBe(undefined);

    const { result } = renderHook(() => useHaptics());

    expect(() => {
      act(() => {
        result.current.impact();
      });
    }).not.toThrow();
  });
});
