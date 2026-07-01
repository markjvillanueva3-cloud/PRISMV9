/**
 * Calculator Store Tests — U-LPR07 LATHE-PROD-READY-MS0
 *
 * Tests Zustand store with structural selectors.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  useCalculatorStore,
  useWorkspaceState,
  useDimensionsState,
  useResultsState,
  useUIState,
  useMachineSelection,
  useMaterialSelection,
  useToolSelection,
  useWorkspaceActions,
  useDimensionsActions,
  useResultsActions,
} from '../../stores/calculatorStore';

describe('calculatorStore', () => {
  beforeEach(() => {
    const store = useCalculatorStore.getState();
    store.resetWorkspace();
    store.resetDimensions();
    store.resetMachineMeasurements();
    store.clearResults();
    store.clearError();
    store.setLoading(false);
  });

  describe('workspace slice', () => {
    it('has correct default values', () => {
      const state = useCalculatorStore.getState();
      expect(state.experience).toBe('beginner');
      expect(state.machineMode).toBe('mill');
      expect(state.machineId).toBe('haas-vf2ss');
      expect(state.materialId).toBe('4140');
      expect(state.toolId).toBe('face-mill');
    });

    it('sets experience level', () => {
      const store = useCalculatorStore.getState();
      store.setExperience('expert');
      expect(useCalculatorStore.getState().experience).toBe('expert');
    });

    it('sets machine mode', () => {
      const store = useCalculatorStore.getState();
      store.setMachineMode('lathe');
      expect(useCalculatorStore.getState().machineMode).toBe('lathe');
    });

    it('sets material selection', () => {
      const store = useCalculatorStore.getState();
      store.setMaterialGroup('stainless');
      store.setMaterialId('304');
      expect(useCalculatorStore.getState().materialGroup).toBe('stainless');
      expect(useCalculatorStore.getState().materialId).toBe('304');
    });

    it('resets workspace to defaults', () => {
      const store = useCalculatorStore.getState();
      store.setMachineMode('lathe');
      store.setMaterialId('D2');
      store.resetWorkspace();
      expect(useCalculatorStore.getState().machineMode).toBe('mill');
      expect(useCalculatorStore.getState().materialId).toBe('4140');
    });
  });

  describe('dimensions slice', () => {
    it('has correct default dimensions', () => {
      const state = useCalculatorStore.getState();
      expect(state.stockX).toBe(152.4);
      expect(state.stockY).toBe(101.6);
      expect(state.stockZ).toBe(50.8);
      expect(state.toolDiameter).toBe(76.2);
      expect(state.flutes).toBe(6);
    });

    it('sets stock dimensions', () => {
      const store = useCalculatorStore.getState();
      store.setStockX(200);
      store.setStockY(150);
      store.setStockZ(75);
      expect(useCalculatorStore.getState().stockX).toBe(200);
      expect(useCalculatorStore.getState().stockY).toBe(150);
      expect(useCalculatorStore.getState().stockZ).toBe(75);
    });

    it('sets tool parameters', () => {
      const store = useCalculatorStore.getState();
      store.setToolDiameter(50);
      store.setFlutes(4);
      store.setDoc(3.0);
      store.setWoc(25);
      expect(useCalculatorStore.getState().toolDiameter).toBe(50);
      expect(useCalculatorStore.getState().flutes).toBe(4);
      expect(useCalculatorStore.getState().doc).toBe(3.0);
      expect(useCalculatorStore.getState().woc).toBe(25);
    });

    it('resets dimensions to defaults', () => {
      const store = useCalculatorStore.getState();
      store.setStockX(999);
      store.setToolDiameter(999);
      store.resetDimensions();
      expect(useCalculatorStore.getState().stockX).toBe(152.4);
      expect(useCalculatorStore.getState().toolDiameter).toBe(76.2);
    });
  });

  describe('results slice', () => {
    it('has null results initially', () => {
      const state = useCalculatorStore.getState();
      expect(state.result).toBeNull();
      expect(state.wedmResult).toBeNull();
    });

    it('sets result', () => {
      const store = useCalculatorStore.getState();
      const mockResult = { rpm: 5000, feedRate: 1200 };
      store.setResult(mockResult);
      expect(useCalculatorStore.getState().result).toEqual(mockResult);
    });

    it('clears results', () => {
      const store = useCalculatorStore.getState();
      store.setResult({ test: true });
      store.setWedmResult({ test: true });
      store.clearResults();
      expect(useCalculatorStore.getState().result).toBeNull();
      expect(useCalculatorStore.getState().wedmResult).toBeNull();
    });
  });

  describe('UI slice', () => {
    it('has correct default UI state', () => {
      const state = useCalculatorStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.shellRailCollapsed).toBe(false);
    });

    it('sets loading state', () => {
      const store = useCalculatorStore.getState();
      store.setLoading(true);
      expect(useCalculatorStore.getState().loading).toBe(true);
    });

    it('sets error state', () => {
      const store = useCalculatorStore.getState();
      store.setError('Test error');
      expect(useCalculatorStore.getState().error).toBe('Test error');
    });

    it('clears error', () => {
      const store = useCalculatorStore.getState();
      store.setError('Some error');
      store.clearError();
      expect(useCalculatorStore.getState().error).toBeNull();
    });
  });

  describe('structural selectors', () => {
    it('useWorkspaceState returns workspace subset', () => {
      const { result } = renderHook(() => useWorkspaceState());
      expect(result.current).toMatchObject({
        experience: 'beginner',
        machineMode: 'mill',
        machineId: 'haas-vf2ss',
        materialId: '4140',
      });
    });

    it('useDimensionsState returns dimensions subset', () => {
      const { result } = renderHook(() => useDimensionsState());
      expect(result.current).toMatchObject({
        stockX: 152.4,
        stockY: 101.6,
        stockZ: 50.8,
        toolDiameter: 76.2,
      });
    });

    it('useResultsState returns results subset', () => {
      const { result } = renderHook(() => useResultsState());
      expect(result.current).toMatchObject({
        result: null,
        wedmResult: null,
        loading: false,
        error: null,
      });
    });

    it('useUIState returns UI subset', () => {
      const { result } = renderHook(() => useUIState());
      expect(result.current).toMatchObject({
        loading: false,
        error: null,
        shellRailCollapsed: false,
      });
    });

    it('useMachineSelection returns machine subset', () => {
      const { result } = renderHook(() => useMachineSelection());
      expect(result.current).toMatchObject({
        machineMode: 'mill',
        machineId: 'haas-vf2ss',
      });
    });

    it('useMaterialSelection returns material subset', () => {
      const { result } = renderHook(() => useMaterialSelection());
      expect(result.current).toMatchObject({
        materialGroup: 'steel',
        materialId: '4140',
      });
    });

    it('useToolSelection returns tool subset', () => {
      const { result } = renderHook(() => useToolSelection());
      expect(result.current).toMatchObject({
        toolId: 'face-mill',
        toolBodyFilter: 'all',
      });
    });
  });

  describe('action selectors', () => {
    it('useWorkspaceActions provides stable setters', () => {
      const { result, rerender } = renderHook(() => useWorkspaceActions());
      const firstSetMachineId = result.current.setMachineId;
      rerender();
      expect(result.current.setMachineId).toBe(firstSetMachineId);
    });

    it('useWorkspaceActions setters update state', () => {
      const { result } = renderHook(() => useWorkspaceActions());
      act(() => {
        result.current.setMachineMode('lathe');
      });
      expect(useCalculatorStore.getState().machineMode).toBe('lathe');
    });

    it('useDimensionsActions setters update state', () => {
      const { result } = renderHook(() => useDimensionsActions());
      act(() => {
        result.current.setStockX(500);
        result.current.setToolDiameter(25);
      });
      expect(useCalculatorStore.getState().stockX).toBe(500);
      expect(useCalculatorStore.getState().toolDiameter).toBe(25);
    });

    it('useResultsActions setters update state', () => {
      const { result } = renderHook(() => useResultsActions());
      act(() => {
        result.current.setLoading(true);
        result.current.setResult({ rpm: 3000 });
      });
      expect(useCalculatorStore.getState().loading).toBe(true);
      expect(useCalculatorStore.getState().result).toEqual({ rpm: 3000 });
    });
  });

  describe('machine measurements slice', () => {
    it('has null defaults for optional measurements', () => {
      const state = useCalculatorStore.getState();
      expect(state.machineAgeYears).toBeNull();
      expect(state.measuredMachinePowerKw).toBeNull();
      expect(state.measuredMachineTorqueNm).toBeNull();
    });

    it('sets machine measurements', () => {
      const store = useCalculatorStore.getState();
      store.setMachineAgeYears(5);
      store.setMeasuredMachinePowerKw(15.5);
      store.setMeasuredMachineTorqueNm(120);
      expect(useCalculatorStore.getState().machineAgeYears).toBe(5);
      expect(useCalculatorStore.getState().measuredMachinePowerKw).toBe(15.5);
      expect(useCalculatorStore.getState().measuredMachineTorqueNm).toBe(120);
    });

    it('resets machine measurements', () => {
      const store = useCalculatorStore.getState();
      store.setMachineAgeYears(10);
      store.resetMachineMeasurements();
      expect(useCalculatorStore.getState().machineAgeYears).toBeNull();
    });
  });

  describe('catalogs slice', () => {
    it('has empty arrays initially', () => {
      const state = useCalculatorStore.getState();
      expect(state.liveMachines).toEqual([]);
      expect(state.liveMaterials).toEqual([]);
    });

    it('sets live catalogs', () => {
      const store = useCalculatorStore.getState();
      const mockMachines = [{ id: 'm1' }] as unknown[];
      const mockMaterials = [{ id: 'mat1' }] as unknown[];
      store.setLiveMachines(mockMachines as never);
      store.setLiveMaterials(mockMaterials as never);
      expect(useCalculatorStore.getState().liveMachines).toHaveLength(1);
      expect(useCalculatorStore.getState().liveMaterials).toHaveLength(1);
    });
  });

  describe('persistence', () => {
    it('partialize excludes ephemeral state', () => {
      const state = useCalculatorStore.getState();
      state.setLoading(true);
      state.setResult({ test: true });
      state.setError('error');
      const persistedKeys = [
        'experience', 'machineMode', 'machineId', 'materialId', 'toolId',
        'unitSystem', 'stockX', 'stockY', 'stockZ', 'toolDiameter'
      ];
      const ephemeralKeys = ['loading', 'result', 'error', 'liveMachines', 'liveMaterials'];
      for (const key of persistedKeys) {
        expect(state).toHaveProperty(key);
      }
      for (const key of ephemeralKeys) {
        expect(state).toHaveProperty(key);
      }
    });

    it('exposes a versioned persist config', () => {
      const persistApi = (useCalculatorStore as unknown as {
        persist: { getOptions: () => { name?: string; version?: number } };
      }).persist;
      const opts = persistApi.getOptions();
      expect(opts.name).toBe('kienzle-calculator-store');
      expect(opts.version).toBe(1);
    });

    it('rehydrates a v1 payload from localStorage', async () => {
      const payload = {
        state: {
          experience: 'expert',
          machineMode: 'lathe',
          machineId: 'okuma-genos-l250',
          materialId: 'd2',
          toolId: 'cnmg-432',
          unitSystem: 'inch',
          stockShape: 'round',
          stockX: 50.8,
          stockY: 50.8,
          stockZ: 152.4,
          toolDiameter: 12.7,
          flutes: 4,
          doc: 1.5,
          woc: 6.35,
          toolStickout: 30,
          toolLoc: 18,
        },
        version: 1,
      };
      localStorage.setItem('kienzle-calculator-store', JSON.stringify(payload));
      const persistApi = (useCalculatorStore as unknown as {
        persist: { rehydrate: () => Promise<void> };
      }).persist;
      await persistApi.rehydrate();
      const s = useCalculatorStore.getState();
      expect(s.experience).toBe('expert');
      expect(s.machineMode).toBe('lathe');
      expect(s.machineId).toBe('okuma-genos-l250');
      expect(s.materialId).toBe('d2');
      expect(s.unitSystem).toBe('inch');
      expect(s.stockX).toBe(50.8);
      expect(s.toolDiameter).toBe(12.7);
      // Ephemeral state should remain at defaults.
      expect(s.loading).toBe(false);
      expect(s.result).toBeNull();
      localStorage.removeItem('kienzle-calculator-store');
    });

    it('migrate returns input unchanged for cold-start (no persisted payload)', () => {
      const persistApi = (useCalculatorStore as unknown as {
        persist: { getOptions: () => { migrate?: (p: unknown, v: number) => unknown } };
      }).persist;
      const migrate = persistApi.getOptions().migrate!;
      expect(migrate(undefined, 0)).toBe(undefined);
      expect(migrate(null, 0)).toBe(null);
    });

    it('migrate passes through valid v1 payload', () => {
      const persistApi = (useCalculatorStore as unknown as {
        persist: { getOptions: () => { migrate?: (p: unknown, v: number) => unknown } };
      }).persist;
      const migrate = persistApi.getOptions().migrate!;
      const valid = { experience: 'expert', machineMode: 'lathe', machineId: 'okuma-genos-l250' };
      const result = migrate(valid, 1);
      expect(result).toEqual(valid);
      expect(result).toBe(valid);
    });

    it('migrate handles legacy v0 payload without throwing', () => {
      const persistApi = (useCalculatorStore as unknown as {
        persist: { getOptions: () => { migrate?: (p: unknown, v: number) => unknown } };
      }).persist;
      const migrate = persistApi.getOptions().migrate!;
      const legacy = { experience: 'beginner', machineMode: 'mill', materialId: '4140' };
      const migrated = migrate(legacy, 0) as typeof legacy;
      expect(migrated.experience).toBe('beginner');
      expect(migrated.machineMode).toBe('mill');
      expect(migrated.materialId).toBe('4140');
    });
  });
});
