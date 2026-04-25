/**
 * useCalculatorBridge Tests — U-LPR07 LATHE-PROD-READY-MS0
 *
 * Verifies the migration bridge under both UNIFIED_STORE flag states:
 *   OFF → useState path (writes do not propagate to the Zustand store)
 *   ON  → store path (writes propagate; readers see store value)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  useCalculatorBridge,
  useCalculatorBridgeBatch,
} from '../../stores/useCalculatorBridge';
import { useCalculatorStore } from '../../stores/calculatorStore';
import { setFeatureFlag } from '../../stores/featureFlags';

describe('useCalculatorBridge — flag OFF (useState path)', () => {
  beforeEach(() => {
    setFeatureFlag('UNIFIED_STORE', false);
    useCalculatorStore.getState().resetWorkspace();
    useCalculatorStore.getState().resetDimensions();
  });

  it('returns the supplied default on first render', () => {
    const { result } = renderHook(() =>
      useCalculatorBridge('experience', 'expert')
    );
    const [value] = result.current;
    expect(value).toBe('expert');
  });

  it('updates local state without writing to the store', () => {
    const { result } = renderHook(() =>
      useCalculatorBridge('machineId', 'haas-vf2ss')
    );
    act(() => {
      const [, setValue] = result.current;
      setValue('okuma-genos-l250');
    });
    const [value] = result.current;
    expect(value).toBe('okuma-genos-l250');
    // Store untouched
    expect(useCalculatorStore.getState().machineId).toBe('haas-vf2ss');
  });

  it('does not see external store mutations when flag is OFF', () => {
    const { result } = renderHook(() =>
      useCalculatorBridge('materialId', '4140')
    );
    act(() => {
      useCalculatorStore.getState().setMaterialId('d2');
    });
    const [value] = result.current;
    expect(value).toBe('4140'); // bridge value sticks to local default
  });
});

describe('useCalculatorBridge — flag ON (store path)', () => {
  beforeEach(() => {
    setFeatureFlag('UNIFIED_STORE', true);
    useCalculatorStore.getState().resetWorkspace();
    useCalculatorStore.getState().resetDimensions();
  });

  it('returns the current store value (ignores fallback default)', () => {
    useCalculatorStore.getState().setExperience('expert');
    const { result } = renderHook(() =>
      useCalculatorBridge('experience', 'beginner')
    );
    const [value] = result.current;
    expect(value).toBe('expert');
  });

  it('writes propagate to the Zustand store', () => {
    const { result } = renderHook(() =>
      useCalculatorBridge('machineId', 'haas-vf2ss')
    );
    act(() => {
      const [, setValue] = result.current;
      setValue('okuma-genos-l250');
    });
    expect(useCalculatorStore.getState().machineId).toBe('okuma-genos-l250');
    expect(result.current[0]).toBe('okuma-genos-l250');
  });

  it('reflects external store mutations on next render', () => {
    const { result, rerender } = renderHook(() =>
      useCalculatorBridge('materialId', '4140')
    );
    act(() => {
      useCalculatorStore.getState().setMaterialId('d2');
    });
    rerender();
    expect(result.current[0]).toBe('d2');
  });

  it('handles numeric fields with type-safe setters', () => {
    const { result } = renderHook(() =>
      useCalculatorBridge('toolDiameter', 12.7)
    );
    act(() => {
      result.current[1](25.4);
    });
    expect(useCalculatorStore.getState().toolDiameter).toBe(25.4);
  });
});

describe('useCalculatorBridgeBatch — flag OFF', () => {
  beforeEach(() => {
    setFeatureFlag('UNIFIED_STORE', false);
    useCalculatorStore.getState().resetWorkspace();
    useCalculatorStore.getState().resetDimensions();
  });

  it('returns one [value, setter] pair per requested key', () => {
    const { result } = renderHook(() =>
      useCalculatorBridgeBatch(
        ['experience', 'machineId'] as const,
        ['expert', 'okuma-genos-l250']
      )
    );
    expect(result.current).toHaveLength(2);
    expect(result.current[0][0]).toBe('expert');
    expect(result.current[1][0]).toBe('okuma-genos-l250');
  });
});

describe('useCalculatorBridgeBatch — flag ON', () => {
  beforeEach(() => {
    setFeatureFlag('UNIFIED_STORE', true);
    useCalculatorStore.getState().resetWorkspace();
    useCalculatorStore.getState().resetDimensions();
  });

  it('reads each key from the store', () => {
    useCalculatorStore.getState().setExperience('expert');
    useCalculatorStore.getState().setMachineId('okuma-genos-l250');
    const { result } = renderHook(() =>
      useCalculatorBridgeBatch(
        ['experience', 'machineId'] as const,
        ['beginner', 'haas-vf2ss']
      )
    );
    expect(result.current[0][0]).toBe('expert');
    expect(result.current[1][0]).toBe('okuma-genos-l250');
  });

  it('writes propagate per-key to the store', () => {
    const { result } = renderHook(() =>
      useCalculatorBridgeBatch(
        ['experience', 'machineId'] as const,
        ['beginner', 'haas-vf2ss']
      )
    );
    act(() => {
      result.current[0][1]('expert');
      result.current[1][1]('okuma-genos-l250');
    });
    expect(useCalculatorStore.getState().experience).toBe('expert');
    expect(useCalculatorStore.getState().machineId).toBe('okuma-genos-l250');
  });
});
