/**
 * Learning React hooks — wraps each learning API call with loading/error/data state.
 * Mirrors the usePpg.ts pattern.
 */
import { useCallback, useRef, useState } from "react";
import { learningApi } from "../api/learning";
import type {
  AssessRequest,
  AssessResult,
  PlanRequest,
  PlanResult,
  ProgressRequest,
  ProgressResult,
  RecommendRequest,
  RecommendResult,
  KnowledgeSearchRequest,
  KnowledgeSearchResult,
  TribalSearchRequest,
  TribalSearchResult,
  MaterialSelectRequest,
  MaterialSelectResult,
  ToolSelectRequest,
  ToolSelectResult,
  MachineSelectRequest,
  MachineSelectResult,
  TwinRequest,
  TwinResult,
} from "../types/learning";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** Generic hook for Learning POST calls */
function useLearningCall<TReq, TRes>(
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
        const msg = (e as Error).message || "Learning request failed";
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

// ---------------------------------------------------------------------------
// Exported hooks — one per learning endpoint
// ---------------------------------------------------------------------------

/** POST /learning/assess — Skill assessment */
export const useLearningAssess = () =>
  useLearningCall<AssessRequest, AssessResult>(learningApi.assess);

/** POST /learning/plan — Personalized learning plan */
export const useLearningPlan = () =>
  useLearningCall<PlanRequest, PlanResult>(learningApi.plan);

/** POST /learning/progress — Track progress */
export const useLearningProgress = () =>
  useLearningCall<ProgressRequest, ProgressResult>(learningApi.progress);

/** POST /learning/recommend — Next module recommendations */
export const useLearningRecommend = () =>
  useLearningCall<RecommendRequest, RecommendResult>(learningApi.recommend);

/** POST /learning/knowledge/search — Knowledge base search */
export const useKnowledgeSearch = () =>
  useLearningCall<KnowledgeSearchRequest, KnowledgeSearchResult>(learningApi.knowledgeSearch);

/** POST /learning/tribal — Tribal/shop floor knowledge */
export const useTribalSearch = () =>
  useLearningCall<TribalSearchRequest, TribalSearchResult>(learningApi.tribalSearch);

/** POST /learning/select/material — Material selection wizard */
export const useMaterialSelect = () =>
  useLearningCall<MaterialSelectRequest, MaterialSelectResult>(learningApi.selectMaterial);

/** POST /learning/select/tool — Tool selection wizard */
export const useToolSelect = () =>
  useLearningCall<ToolSelectRequest, ToolSelectResult>(learningApi.selectTool);

/** POST /learning/select/machine — Machine selection wizard */
export const useMachineSelect = () =>
  useLearningCall<MachineSelectRequest, MachineSelectResult>(learningApi.selectMachine);

/** POST /learning/twin — Digital twin operations */
export const useDigitalTwin = () =>
  useLearningCall<TwinRequest, TwinResult>(learningApi.twin);
