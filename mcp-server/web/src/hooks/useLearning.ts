/**
 * L8-P1-MS2 P0-U01: Learning React Hooks
 *
 * Custom hooks wrapping each Learning API call with state management.
 */
import { useState, useCallback } from 'react';
import * as learningApi from '../api/learning';
import type {
  AssessmentResult,
  LearningPlan,
  ProgressSummary,
  LearningModule,
  KnowledgeResult,
  MaterialRecommendation,
  ToolRecommendation,
  MachineRecommendation,
  TwinStatus,
} from '../types/learning';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  errorCause: unknown | null;
}

function useAsync<T>() {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
    errorCause: null,
  });

  const execute = useCallback(async (fn: () => Promise<T>) => {
    setState({ data: null, loading: true, error: null, errorCause: null });
    try {
      const data = await fn();
      setState({ data, loading: false, error: null, errorCause: null });
      return data;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setState({ data: null, loading: false, error: msg, errorCause: e });
      return null;
    }
  }, []);

  return { ...state, execute };
}

/** Assess operator skill levels */
export function useAssess() {
  const { data, loading, error, errorCause, execute } = useAsync<AssessmentResult>();
  const assess = useCallback(
    (params: Parameters<typeof learningApi.assess>[0]) =>
      execute(() => learningApi.assess(params)),
    [execute],
  );
  return { assessment: data, loading, error, errorCause, assess };
}

/** Generate personalized learning plan */
export function useLearningPlan() {
  const { data, loading, error, errorCause, execute } = useAsync<LearningPlan>();
  const generatePlan = useCallback(
    (params: Parameters<typeof learningApi.plan>[0]) =>
      execute(() => learningApi.plan(params)),
    [execute],
  );
  return { plan: data, loading, error, errorCause, generatePlan };
}

/** Track learning progress */
export function useProgress() {
  const { data, loading, error, errorCause, execute } = useAsync<ProgressSummary>();
  const fetchProgress = useCallback(
    (params: Parameters<typeof learningApi.progress>[0] = {}) =>
      execute(() => learningApi.progress(params)),
    [execute],
  );
  return { progress: data, loading, error, errorCause, fetchProgress };
}

/** Get next recommended modules */
export function useRecommend() {
  const { data, loading, error, errorCause, execute } = useAsync<LearningModule[]>();
  const fetchRecommendations = useCallback(
    (params: Parameters<typeof learningApi.recommend>[0] = {}) =>
      execute(() => learningApi.recommend(params)),
    [execute],
  );
  return { recommendations: data, loading, error, errorCause, fetchRecommendations };
}

/** Search manufacturing knowledge base */
export function useKnowledgeSearch() {
  const { data, loading, error, errorCause, execute } = useAsync<KnowledgeResult[]>();
  const search = useCallback(
    (params: Parameters<typeof learningApi.searchKnowledge>[0]) =>
      execute(() => learningApi.searchKnowledge(params)),
    [execute],
  );
  return { results: data, loading, error, errorCause, search };
}

/** Search tribal knowledge */
export function useTribalSearch() {
  const { data, loading, error, errorCause, execute } = useAsync<KnowledgeResult[]>();
  const search = useCallback(
    (params: Parameters<typeof learningApi.searchTribal>[0]) =>
      execute(() => learningApi.searchTribal(params)),
    [execute],
  );
  return { results: data, loading, error, errorCause, search };
}

/** Material selection wizard */
export function useMaterialSelect() {
  const { data, loading, error, errorCause, execute } = useAsync<MaterialRecommendation[]>();
  const selectMaterial = useCallback(
    (params: Parameters<typeof learningApi.selectMaterial>[0]) =>
      execute(() => learningApi.selectMaterial(params)),
    [execute],
  );
  return { materials: data, loading, error, errorCause, selectMaterial };
}

/** Tool selection wizard */
export function useToolSelect() {
  const { data, loading, error, errorCause, execute } = useAsync<ToolRecommendation[]>();
  const selectTool = useCallback(
    (params: Parameters<typeof learningApi.selectTool>[0]) =>
      execute(() => learningApi.selectTool(params)),
    [execute],
  );
  return { tools: data, loading, error, errorCause, selectTool };
}

/** Machine selection wizard */
export function useMachineSelect() {
  const { data, loading, error, errorCause, execute } = useAsync<MachineRecommendation[]>();
  const selectMachine = useCallback(
    (params: Parameters<typeof learningApi.selectMachine>[0]) =>
      execute(() => learningApi.selectMachine(params)),
    [execute],
  );
  return { machines: data, loading, error, errorCause, selectMachine };
}

/** Digital twin status */
export function useTwin() {
  const { data, loading, error, errorCause, execute } = useAsync<TwinStatus>();
  const fetchTwin = useCallback(
    (params: Parameters<typeof learningApi.twin>[0] = {}) =>
      execute(() => learningApi.twin(params)),
    [execute],
  );
  return { twin: data, loading, error, errorCause, fetchTwin };
}
