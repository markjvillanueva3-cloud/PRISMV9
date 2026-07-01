import { useCallback, useRef, useState } from "react";
import { edmApi } from "../api/edm";
import type { ApiError, WireEdmParams, WireEdmResult, SinkerEdmParams, SinkerEdmResult, LaserParams, LaserResult, EdmParametersParams, EdmParametersResult } from "../types/edm";

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

export const useEdmWire = () => useApiCall<WireEdmParams, WireEdmResult>(edmApi.wire);
export const useEdmSinker = () => useApiCall<SinkerEdmParams, SinkerEdmResult>(edmApi.sinker);
export const useEdmLaser = () => useApiCall<LaserParams, LaserResult>(edmApi.laser);
export const useEdmParameters = () => useApiCall<EdmParametersParams, EdmParametersResult>(edmApi.parameters);
