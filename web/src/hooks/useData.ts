import { useCallback, useRef, useState } from "react";
import { dataApi } from "../api/data";
import type { ApiError } from "../types/data";

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

function useGetById<T>(apiFn: (id: string) => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: false, error: null });

  const execute = useCallback(async (id: string) => {
    setState({ data: null, loading: true, error: null });
    try {
      const res = await apiFn(id);
      setState({ data: res, loading: false, error: null });
      return res;
    } catch (e: unknown) {
      const msg = (e as ApiError).message || "Lookup failed";
      setState({ data: null, loading: false, error: msg });
      return null;
    }
  }, [apiFn]);

  const reset = useCallback(() => setState({ data: null, loading: false, error: null }), []);

  return { ...state, execute, reset };
}

export const useDataGetMaterial = () => useGetById(dataApi.getMaterial);
export const useDataSearchMaterials = () => useApiCall(dataApi.searchMaterials);
export const useDataGetTool = () => useGetById(dataApi.getTool);
export const useDataSearchTools = () => useApiCall(dataApi.searchTools);
export const useDataGetMachine = () => useGetById(dataApi.getMachine);
export const useDataSearchMachines = () => useApiCall(dataApi.searchMachines);
export const useDataDecodeAlarm = () => useApiCall(dataApi.decodeAlarm);
