/**
 * useHaptics -- Capacitor-ready haptics hook (FLEET-IOS-REDESIGN U3, slot:hotel)
 *
 * Real device haptics (the Taptic Engine on iOS, the vibrator on Android) arrive
 * ONLY with the Capacitor 6 shell, which is NOT installed yet. We do NOT fake
 * haptics -- on web today this hook is a graceful no-op (or a navigator.vibrate
 * fallback on Android web). It is wired now so that when the shell ships, the
 * `@capacitor/haptics` plugin lights it up at runtime with zero call-site churn.
 *
 * Detection happens at CALL TIME, not import time:
 *   1. (window.Capacitor.Plugins.Haptics) -> native plugin (try/catch, fail-soft)
 *   2. navigator.vibrate            -> Android web buzz (iOS Safari silently no-ops,
 *                                      which is the correct behavior there)
 *   3. neither                      -> no-op
 *
 * There is intentionally NO static `import ... from '@capacitor/haptics'` -- that
 * dependency is absent, so a static import would break the Vite build. The plugin
 * is reached through the global `window.Capacitor` bridge the shell injects.
 */
import { useCallback } from 'react';

export type ImpactStyle = 'light' | 'medium' | 'heavy';
export type NotificationType = 'success' | 'warning' | 'error';

interface CapacitorHapticsPlugin {
  impact?: (options: { style: ImpactStyle }) => void;
  notification?: (options: { type: NotificationType }) => void;
  selectionChanged?: () => void;
}

/** Resolve the native Capacitor Haptics plugin if the shell injected it, else null. */
function getCapacitorHaptics(): CapacitorHapticsPlugin | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const cap = (window as unknown as {
    Capacitor?: { Plugins?: { Haptics?: CapacitorHapticsPlugin } };
  }).Capacitor;
  return cap?.Plugins?.Haptics ?? null;
}

/** navigator.vibrate if the platform supports it (Android web), else null. */
function getVibrate(): ((pattern: number | number[]) => boolean) | null {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return null;
  }
  return navigator.vibrate.bind(navigator);
}

/** Vibrate fallback duration (ms) per impact style. */
const IMPACT_MS: Record<ImpactStyle, number> = {
  light: 8,
  medium: 12,
  heavy: 20,
};

/** Vibrate fallback pattern per notification type (buzz-pause-buzz). */
const NOTIFICATION_PATTERN: number[] = [10, 40, 10];

/** Vibrate fallback duration (ms) for a selection tick. */
const SELECTION_MS = 5;

export function useHaptics() {
  const impact = useCallback((style: ImpactStyle = 'medium') => {
    const native = getCapacitorHaptics();
    if (native?.impact) {
      try {
        native.impact({ style });
      } catch {
        // native bridge threw -- fail soft, do not fall through to vibrate
      }
      return;
    }
    const vibrate = getVibrate();
    if (vibrate) {
      vibrate(IMPACT_MS[style]);
    }
  }, []);

  const notification = useCallback((type: NotificationType = 'success') => {
    const native = getCapacitorHaptics();
    if (native?.notification) {
      try {
        native.notification({ type });
      } catch {
        // fail soft
      }
      return;
    }
    const vibrate = getVibrate();
    if (vibrate) {
      vibrate(NOTIFICATION_PATTERN);
    }
  }, []);

  const selection = useCallback(() => {
    const native = getCapacitorHaptics();
    if (native?.selectionChanged) {
      try {
        native.selectionChanged();
      } catch {
        // fail soft
      }
      return;
    }
    const vibrate = getVibrate();
    if (vibrate) {
      vibrate(SELECTION_MS);
    }
  }, []);

  return { impact, notification, selection };
}
