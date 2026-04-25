/**
 * Calculator Bridge Hook — U-LPR07 LATHE-PROD-READY-MS0
 *
 * Migration bridge providing useState-compatible interface backed by Zustand.
 * Enables gradual migration from 153 useState calls to centralized store.
 *
 * Usage:
 * ```tsx
 * // Before (useState):
 * const [machineId, setMachineId] = useState('haas-vf2ss');
 *
 * // After (bridge, feature flag controlled):
 * const [machineId, setMachineId] = useCalculatorBridge('machineId', 'haas-vf2ss');
 * ```
 *
 * When UNIFIED_STORE flag is OFF: returns regular useState
 * When UNIFIED_STORE flag is ON: returns store-backed state
 *
 * @milestone LATHE-PROD-READY-MS0 U-LPR07
 */

import { useState, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { useCalculatorStore, type CalculatorStore } from './calculatorStore';
import { useUnifiedStore } from './featureFlags';

type StateKeys = keyof Omit<CalculatorStore, `set${string}` | `reset${string}` | `clear${string}`>;
type SetterKeys<K extends StateKeys> = `set${Capitalize<string & K>}`;

function capitalize<T extends string>(s: T): Capitalize<T> {
  return (s.charAt(0).toUpperCase() + s.slice(1)) as Capitalize<T>;
}

export function useCalculatorBridge<K extends StateKeys>(
  key: K,
  fallbackDefault: CalculatorStore[K]
): [CalculatorStore[K], (v: CalculatorStore[K]) => void] {
  const useStore = useUnifiedStore();

  const storeValue = useCalculatorStore((s) => s[key]);
  const setterKey = `set${capitalize(key)}` as SetterKeys<K>;
  const storeSetter = useCalculatorStore((s) => (s as unknown as Record<string, unknown>)[setterKey] as ((v: CalculatorStore[K]) => void) | undefined);

  const [localValue, setLocalValue] = useState<CalculatorStore[K]>(fallbackDefault);

  const value = useStore ? storeValue : localValue;
  const setter = useCallback(
    (v: CalculatorStore[K]) => {
      if (useStore && storeSetter) {
        storeSetter(v);
      } else {
        setLocalValue(v);
      }
    },
    [useStore, storeSetter]
  );

  return useMemo(() => [value, setter], [value, setter]);
}

export function useCalculatorBridgeBatch<Keys extends readonly StateKeys[]>(
  keys: Keys,
  defaults: { [I in keyof Keys]: CalculatorStore[Keys[I]] }
): { [I in keyof Keys]: [CalculatorStore[Keys[I]], (v: CalculatorStore[Keys[I]]) => void] } {
  const useStore = useUnifiedStore();

  // Shallow-compare returned arrays to avoid useSyncExternalStore infinite loops.
  const storeValues = useCalculatorStore(
    useShallow((s) => keys.map((k) => s[k as StateKeys]))
  );

  const storeSetters = useCalculatorStore(
    useShallow((s) =>
      keys.map((k) => {
        const setterKey = `set${capitalize(k)}`;
        return (s as unknown as Record<string, unknown>)[setterKey] as
          | ((v: unknown) => void)
          | undefined;
      })
    )
  );

  const [localValues, setLocalValues] = useState(defaults);

  return useMemo(() => {
    return keys.map((k, i) => {
      const value = useStore ? storeValues[i] : localValues[i];
      const setter = (v: unknown) => {
        if (useStore && storeSetters[i]) {
          storeSetters[i]!(v);
        } else {
          setLocalValues((prev) => {
            const next = prev.map((item, idx) => idx === i ? v : item);
            return next as unknown as typeof prev;
          });
        }
      };
      return [value, setter];
    }) as { [I in keyof Keys]: [CalculatorStore[Keys[I]], (v: CalculatorStore[Keys[I]]) => void] };
  }, [useStore, storeValues, storeSetters, localValues, keys]);
}
