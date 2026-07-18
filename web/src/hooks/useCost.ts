import { useCallback, useRef, useState } from "react";
import { costApi } from "../api/cost";
import type { ApiError } from "../types/cost";

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

export const useCostEstimate = () => useApiCall(costApi.estimate);
export const useCostQuote = () => useApiCall(costApi.quote);
export const useCostCompare = () => useApiCall(costApi.compare);

export function useCostHistory() {
  const [state, setState] = useState<AsyncState<unknown>>({ data: null, loading: false, error: null });

  const execute = useCallback(async (jobId: string) => {
    setState({ data: null, loading: true, error: null });
    try {
      const res = await costApi.history(jobId);
      setState({ data: res, loading: false, error: null });
      return res;
    } catch (e: unknown) {
      const msg = (e as ApiError).message || "Failed to load history";
      setState({ data: null, loading: false, error: msg });
      return null;
    }
  }, []);

  const reset = useCallback(() => setState({ data: null, loading: false, error: null }), []);

  return { ...state, execute, reset };
}
