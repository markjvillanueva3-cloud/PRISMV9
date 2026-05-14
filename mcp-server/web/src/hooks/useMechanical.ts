/**
 * useMechanical Hook
 * React hook for mechanical design calculations
 */

import { useCallback, useState } from 'react';
import {
  calculateMechanical,
  calculateBevelGear,
  calculateWormGear,
  calculatePlanetaryGear,
  selectBearing,
  calculateRollingBearing,
  calculateJournalBearing,
  calculateSpring,
  designSpring,
  calculateShaftAlignment,
  calculateKeyway,
  calculateBoltTorque,
  calculateBoltedJoint,
  calculateCoupling,
  selectCoupling,
  calculateDiskBrake,
  calculateDrumBrake,
  calculateBeltDrive,
  calculateChainDrive,
  calculateBallScrew,
  calculateLinearGuide,
  getMechanicalActions,
} from '../api/mechanical';
import type {
  MechanicalResult,
  GearParams,
  GearResult,
  BearingParams,
  BearingResult,
  SpringParams,
  SpringResult,
  ShaftParams,
  ShaftResult,
  FastenerParams,
  FastenerResult,
  CouplingParams,
  CouplingResult,
  BrakeParams,
  BrakeResult,
  DrivetrainParams,
  DrivetrainResult,
  MechanicalCategory,
} from '../types/mechanical';

interface UseMechanicalState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useMechanicalCalculation<TParams, TResult>() {
  const [state, setState] = useState<UseMechanicalState<MechanicalResult<TResult>>>({
    data: null,
    loading: false,
    error: null,
  });

  const calculate = useCallback(
    async (category: string, action: string, params: TParams) => {
      setState({ data: null, loading: true, error: null });
      try {
        const result = await calculateMechanical<TResult>(category, action, params as Record<string, unknown>);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Calculation failed';
        setState({ data: null, loading: false, error: errorMsg });
        throw err;
      }
    },
    []
  );

  return { ...state, calculate };
}

// ─── Category-specific hooks ───────────────────────────────────────────────

export function useGearCalculation() {
  const [state, setState] = useState<UseMechanicalState<MechanicalResult<GearResult>>>({
    data: null,
    loading: false,
    error: null,
  });

  const calculateGear = useCallback(
    async (gearType: string, params: GearParams) => {
      setState({ data: null, loading: true, error: null });
      try {
        let result: MechanicalResult<GearResult>;
        switch (gearType) {
          case 'bevel':
            result = await calculateBevelGear(params);
            break;
          case 'worm':
            result = await calculateWormGear(params);
            break;
          case 'planetary':
            result = await calculatePlanetaryGear(params);
            break;
          default:
            result = await calculateBevelGear(params);
        }
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Gear calculation failed';
        setState({ data: null, loading: false, error: errorMsg });
        throw err;
      }
    },
    []
  );

  return { ...state, calculateGear };
}

export function useBearingCalculation() {
  const [state, setState] = useState<UseMechanicalState<MechanicalResult<BearingResult>>>({
    data: null,
    loading: false,
    error: null,
  });

  const calculateBearing = useCallback(
    async (action: 'select' | 'rolling' | 'journal', params: BearingParams) => {
      setState({ data: null, loading: true, error: null });
      try {
        let result: MechanicalResult<BearingResult>;
        switch (action) {
          case 'select':
            result = await selectBearing(params);
            break;
          case 'rolling':
            result = await calculateRollingBearing(params);
            break;
          case 'journal':
            result = await calculateJournalBearing(params);
            break;
          default:
            result = await selectBearing(params);
        }
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Bearing calculation failed';
        setState({ data: null, loading: false, error: errorMsg });
        throw err;
      }
    },
    []
  );

  return { ...state, calculateBearing };
}

export function useSpringCalculation() {
  const [state, setState] = useState<UseMechanicalState<MechanicalResult<SpringResult>>>({
    data: null,
    loading: false,
    error: null,
  });

  const calculate = useCallback(
    async (action: 'calculate' | 'design', params: SpringParams) => {
      setState({ data: null, loading: true, error: null });
      try {
        const result = action === 'design'
          ? await designSpring(params)
          : await calculateSpring(params);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Spring calculation failed';
        setState({ data: null, loading: false, error: errorMsg });
        throw err;
      }
    },
    []
  );

  return { ...state, calculateSpring: calculate };
}

export function useShaftCalculation() {
  const [state, setState] = useState<UseMechanicalState<MechanicalResult<ShaftResult>>>({
    data: null,
    loading: false,
    error: null,
  });

  const calculate = useCallback(
    async (action: 'alignment' | 'keyway', params: ShaftParams) => {
      setState({ data: null, loading: true, error: null });
      try {
        const result = action === 'keyway'
          ? await calculateKeyway(params)
          : await calculateShaftAlignment(params);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Shaft calculation failed';
        setState({ data: null, loading: false, error: errorMsg });
        throw err;
      }
    },
    []
  );

  return { ...state, calculateShaft: calculate };
}

export function useFastenerCalculation() {
  const [state, setState] = useState<UseMechanicalState<MechanicalResult<FastenerResult>>>({
    data: null,
    loading: false,
    error: null,
  });

  const calculate = useCallback(
    async (action: 'torque' | 'joint', params: FastenerParams) => {
      setState({ data: null, loading: true, error: null });
      try {
        const result = action === 'joint'
          ? await calculateBoltedJoint(params)
          : await calculateBoltTorque(params);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Fastener calculation failed';
        setState({ data: null, loading: false, error: errorMsg });
        throw err;
      }
    },
    []
  );

  return { ...state, calculateFastener: calculate };
}

export function useCouplingCalculation() {
  const [state, setState] = useState<UseMechanicalState<MechanicalResult<CouplingResult>>>({
    data: null,
    loading: false,
    error: null,
  });

  const calculate = useCallback(
    async (action: 'calculate' | 'select', params: CouplingParams) => {
      setState({ data: null, loading: true, error: null });
      try {
        const result = action === 'select'
          ? await selectCoupling(params)
          : await calculateCoupling(params);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Coupling calculation failed';
        setState({ data: null, loading: false, error: errorMsg });
        throw err;
      }
    },
    []
  );

  return { ...state, calculateCoupling: calculate };
}

export function useBrakeCalculation() {
  const [state, setState] = useState<UseMechanicalState<MechanicalResult<BrakeResult>>>({
    data: null,
    loading: false,
    error: null,
  });

  const calculate = useCallback(
    async (action: 'disk' | 'drum', params: BrakeParams) => {
      setState({ data: null, loading: true, error: null });
      try {
        const result = action === 'drum'
          ? await calculateDrumBrake(params)
          : await calculateDiskBrake(params);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Brake calculation failed';
        setState({ data: null, loading: false, error: errorMsg });
        throw err;
      }
    },
    []
  );

  return { ...state, calculateBrake: calculate };
}

export function useDrivetrainCalculation() {
  const [state, setState] = useState<UseMechanicalState<MechanicalResult<DrivetrainResult>>>({
    data: null,
    loading: false,
    error: null,
  });

  const calculate = useCallback(
    async (action: 'belt' | 'chain' | 'ballscrew' | 'linear', params: DrivetrainParams) => {
      setState({ data: null, loading: true, error: null });
      try {
        let result: MechanicalResult<DrivetrainResult>;
        switch (action) {
          case 'chain':
            result = await calculateChainDrive(params);
            break;
          case 'ballscrew':
            result = await calculateBallScrew(params);
            break;
          case 'linear':
            result = await calculateLinearGuide(params);
            break;
          default:
            result = await calculateBeltDrive(params);
        }
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Drivetrain calculation failed';
        setState({ data: null, loading: false, error: errorMsg });
        throw err;
      }
    },
    []
  );

  return { ...state, calculateDrivetrain: calculate };
}

// ─── Get available categories ──────────────────────────────────────────────

export function useMechanicalCategories() {
  const [state, setState] = useState<{
    categories: MechanicalCategory[];
    loading: boolean;
    error: string | null;
  }>({
    categories: [],
    loading: false,
    error: null,
  });

  const loadCategories = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const result = await getMechanicalActions();
      setState({ categories: result.categories, loading: false, error: null });
      return result.categories;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load categories';
      setState({ categories: [], loading: false, error: errorMsg });
      throw err;
    }
  }, []);

  return { ...state, loadCategories };
}
