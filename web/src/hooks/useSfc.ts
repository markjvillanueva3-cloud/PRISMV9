import { useCallback, useRef, useState } from "react";
import { sfcApi } from "../api/sfc";
import type { ApiError } from "../types/sfc";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useApiCall<TReq, TRes>(
  apiFn: (params: TReq, signal?: AbortSignal) => Promise<{ result: TRes }>,
) {
  const [state, setState] = useState<AsyncState<TRes>>({ data: null, loading: false, error: null });
  const abortRef = useRef<AbortController | null>(null);

  const execute = useCallback(
    async (params: TReq) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({ data: null, loading: true, error: null });
      try {
        const res = await apiFn(params, controller.signal);
        if (!controller.signal.aborted) {
          setState({ data: res.result, loading: false, error: null });
        }
        return res.result;
      } catch (e: unknown) {
        if ((e as Error).name === "AbortError") return null;
        const msg = (e as ApiError).message || "Calculation failed";
        setState({ data: null, loading: false, error: msg });
        return null;
      }
    },
    [apiFn],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}

export const useSfcCalculate = () => useApiCall(sfcApi.calculate);
export const useSfcCycleTime = () => useApiCall(sfcApi.cycleTime);
export const useSfcEngagement = () => useApiCall(sfcApi.engagement);
export const useSfcDeflection = () => useApiCall(sfcApi.deflection);
export const useSfcPowerTorque = () => useApiCall(sfcApi.powerTorque);
export const useSfcSurfaceFinish = () => useApiCall(sfcApi.surfaceFinish);
export const useSfcToolLife = () => useApiCall(sfcApi.toolLife);
