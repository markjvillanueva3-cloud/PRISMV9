/**
 * Document Learning React hooks — CC-EXT-MS0 U07
 *
 * Wraps each document learning API call with loading/error/data state.
 * Mirrors the useErp.ts pattern.
 */
import { useCallback, useRef, useState } from "react";
import { docLearnApi } from "../api/docLearn";
import type {
  DocUploadRequest,
  DocUploadResult,
  DocExtractRequest,
  DocExtractResult,
  DocListResult,
  DocGetRequest,
  DocGetResult,
  DocDeleteRequest,
  DocDeleteResult,
} from "../types/docLearn";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** Generic hook for document learning calls */
function useDocCall<TReq, TRes>(
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
        const data = await apiFn(params, controller.signal);
        setState({ data, loading: false, error: null });
        return data;
      } catch (err: any) {
        if (err.name === "AbortError") return;
        const msg = err.message || "Request failed";
        setState({ data: null, loading: false, error: msg });
        throw err;
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

/** Generic hook for no-param calls (doc_list) */
function useDocCallNoParam<TRes>(
  apiFn: (signal?: AbortSignal) => Promise<TRes>,
) {
  const [state, setState] = useState<AsyncState<TRes>>({ data: null, loading: false, error: null });
  const abortRef = useRef<AbortController | null>(null);

  const execute = useCallback(
    async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({ data: null, loading: true, error: null });
      try {
        const data = await apiFn(controller.signal);
        setState({ data, loading: false, error: null });
        return data;
      } catch (err: any) {
        if (err.name === "AbortError") return;
        const msg = err.message || "Request failed";
        setState({ data: null, loading: false, error: msg });
        throw err;
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

// ---------------------------------------------------------------------------
// Exported hooks
// ---------------------------------------------------------------------------

export function useDocUpload() {
  return useDocCall<DocUploadRequest, DocUploadResult>(docLearnApi.upload);
}

export function useDocExtract() {
  return useDocCall<DocExtractRequest, DocExtractResult>(docLearnApi.extract);
}

export function useDocList() {
  return useDocCallNoParam<DocListResult>(docLearnApi.list);
}

export function useDocGet() {
  return useDocCall<DocGetRequest, DocGetResult>(docLearnApi.get);
}

export function useDocDelete() {
  return useDocCall<DocDeleteRequest, DocDeleteResult>(docLearnApi.delete);
}
