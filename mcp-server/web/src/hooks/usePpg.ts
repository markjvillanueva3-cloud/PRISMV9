/**
 * PPG React hooks — wraps each PPG API call with loading/error/data state.
 * Mirrors the useSfc.ts pattern.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ppgApi } from "../api/ppg";
import type {
  PpgGenerateRequest,
  PpgGenerateResult,
  PpgTemplateRequest,
  PpgTemplateResult,
  PpgProgramRequest,
  PpgProgramResult,
  PpgValidateRequest,
  PpgValidateResult,
  PpgCompareRequest,
  PpgCompareResult,
  PpgOptimizeRequest,
  PpgOptimizeResult,
  PpgControllerInfo,
  PpgOperationInfo,
} from "../types/ppg";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** Generic hook for PPG POST calls */
function usePpgCall<TReq, TRes>(
  apiFn: (params: TReq, signal?: AbortSignal) => Promise<TRes>,
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
        const result = await apiFn(params, controller.signal);
        if (!controller.signal.aborted) {
          setState({ data: result, loading: false, error: null });
        }
        return result;
      } catch (e: unknown) {
        if ((e as Error).name === "AbortError") return null;
        const msg = (e as Error).message || "PPG request failed";
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

/** Generic hook for PPG GET calls (fetch on mount, with manual refetch) */
function usePpgQuery<TRes>(
  apiFn: (signal?: AbortSignal) => Promise<TRes>,
) {
  const [state, setState] = useState<AsyncState<TRes>>({ data: null, loading: true, error: null });
  const abortRef = useRef<AbortController | null>(null);

  const fetch = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const result = await apiFn(controller.signal);
      if (!controller.signal.aborted) {
        setState({ data: result, loading: false, error: null });
      }
      return result;
    } catch (e: unknown) {
      if ((e as Error).name === "AbortError") return null;
      const msg = (e as Error).message || "PPG query failed";
      setState({ data: null, loading: false, error: msg });
      return null;
    }
  }, [apiFn]);

  useEffect(() => {
    fetch();
    return () => abortRef.current?.abort();
  }, [fetch]);

  return { ...state, refetch: fetch };
}

// ---------------------------------------------------------------------------
// Exported hooks — one per PPG endpoint
// ---------------------------------------------------------------------------

/** POST /ppg/generate */
export const usePpgGenerate = () => usePpgCall<PpgGenerateRequest, PpgGenerateResult>(ppgApi.generate);

/** POST /ppg/template */
export const usePpgTemplate = () => usePpgCall<PpgTemplateRequest, PpgTemplateResult>(ppgApi.template);

/** POST /ppg/program */
export const usePpgProgram = () => usePpgCall<PpgProgramRequest, PpgProgramResult>(ppgApi.program);

/** POST /ppg/validate */
export const usePpgValidate = () => usePpgCall<PpgValidateRequest, PpgValidateResult>(ppgApi.validate);

/** POST /ppg/compare */
export const usePpgCompare = () => usePpgCall<PpgCompareRequest, PpgCompareResult>(ppgApi.compare);

/** POST /ppg/optimize */
export const usePpgOptimize = () => usePpgCall<PpgOptimizeRequest, PpgOptimizeResult>(ppgApi.optimize);

/** GET /ppg/controllers — auto-fetches on mount */
export const usePpgControllers = () => usePpgQuery<PpgControllerInfo[]>(ppgApi.getControllers);

/** GET /ppg/operations — auto-fetches on mount */
export const usePpgOperations = () => usePpgQuery<PpgOperationInfo[]>(ppgApi.getOperations);
