import { useCallback, useRef, useState } from "react";
import { integrationsApi } from "../api/integrations";
import type { ApiError } from "../types/integrations";

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
      const msg = (e as ApiError).message || "Request failed";
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

export const useIntegrationsCam = () => useApiCall(integrationsApi.cam);
export const useIntegrationsDnc = () => useApiCall(integrationsApi.dnc);
export const useIntegrationsErp = () => useApiCall(integrationsApi.erp);
export const useIntegrationsMobile = () => useApiCall(integrationsApi.mobile);
export const useIntegrationsMeasurement = () => useApiCall(integrationsApi.measurement);
