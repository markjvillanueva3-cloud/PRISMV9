import { useCallback, useRef, useState } from "react";
import { mechanicalApi } from "../api/mechanical";
import type { ApiError, MechanicalInput } from "../types/mechanical";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useApiCall<TReq, TRes>(apiFn: (params: TReq) => Promise<TRes>) {
  const [state, setState] = useState<AsyncState<TRes>>({ data: null, loading: false, error: null });
  const abortRef = useRef<AbortController | null>(null);

  const execute = useCallback(async (params: TReq) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ data: null, loading: true, error: null });
    try {
      const res = await apiFn(params);
      if (!controller.signal.aborted) setState({ data: res, loading: false, error: null });
      return res;
    } catch (e: unknown) {
      if ((e as Error).name === "AbortError") return null;
      const msg = (e as ApiError).message || "Calculation failed";
      setState({ data: null, loading: false, error: msg });
      return null;
    }
  }, [apiFn]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}

export const useMechanicalGear = () => useApiCall(mechanicalApi.gear);
export const useMechanicalBearing = () => useApiCall(mechanicalApi.bearing);
export const useMechanicalSpring = () => useApiCall(mechanicalApi.spring);
export const useMechanicalShaft = () => useApiCall(mechanicalApi.shaft);
export const useMechanicalFastener = () => useApiCall(mechanicalApi.fastener);
export const useMechanicalCoupling = () => useApiCall(mechanicalApi.coupling);
export const useMechanicalBrake = () => useApiCall(mechanicalApi.brake);
export const useMechanicalDrivetrain = () => useApiCall(mechanicalApi.drivetrain);
export const useMechanicalStructural = () => useApiCall(mechanicalApi.structural);

export function useMechanicalCalculate() {
  const [state, setState] = useState<AsyncState<unknown>>({ data: null, loading: false, error: null });

  const execute = useCallback(async (category: string, input: MechanicalInput) => {
    setState({ data: null, loading: true, error: null });
    try {
      const res = await mechanicalApi.calculate(category, input);
      setState({ data: res, loading: false, error: null });
      return res;
    } catch (e: unknown) {
      const msg = (e as ApiError).message || "Calculation failed";
      setState({ data: null, loading: false, error: msg });
      return null;
    }
  }, []);

  const reset = useCallback(() => setState({ data: null, loading: false, error: null }), []);

  return { ...state, execute, reset };
}
