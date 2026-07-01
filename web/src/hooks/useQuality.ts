import { useCallback, useRef, useState } from "react";
import { qualityApi } from "../api/quality";
import type { ApiError } from "../types/quality";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useApiCall<TReq, TRes>(
  apiFn: (params: TReq) => Promise<TRes>,
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
        const res = await apiFn(params);
        if (!controller.signal.aborted) {
          setState({ data: res, loading: false, error: null });
        }
        return res;
      } catch (e: unknown) {
        if ((e as Error).name === "AbortError") return null;
        const msg = (e as ApiError).message || "Operation failed";
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

export const useQualitySpc = () => useApiCall(qualityApi.spc);
export const useQualityCpk = () => useApiCall(qualityApi.cpk);
export const useQualityMeasurement = () => useApiCall(qualityApi.measurement);
export const useQualityToleranceStack = () => useApiCall(qualityApi.toleranceStack);
