import { useCallback, useRef, useState } from "react";
import { pipelineApi } from "../api/pipeline";
import type { PipelineInput, PipelineResult, ApiError } from "../types/pipeline";

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

export const usePipelineAnalyze = () => useApiCall<PipelineInput, PipelineResult>(pipelineApi.analyze);
export const usePipelineTools = () => useApiCall<PipelineInput, PipelineResult>(pipelineApi.selectTools);
export const usePipelineSequence = () => useApiCall<PipelineInput, PipelineResult>(pipelineApi.sequence);
export const usePipelineSpeedFeed = () => useApiCall<PipelineInput, PipelineResult>(pipelineApi.speedFeed);
export const usePipelineProgram = () => useApiCall<PipelineInput, PipelineResult>(pipelineApi.program);
export const usePipelineQuote = () => useApiCall<PipelineInput, PipelineResult>(pipelineApi.quote);
export const usePipelineROI = () => useApiCall<PipelineInput, PipelineResult>(pipelineApi.roi);
export const usePipelineFullRun = () => useApiCall<PipelineInput, PipelineResult>(pipelineApi.fullPipeline);
export const usePipelineFusion360 = () => useApiCall<PipelineInput, PipelineResult>(pipelineApi.fusion360);
