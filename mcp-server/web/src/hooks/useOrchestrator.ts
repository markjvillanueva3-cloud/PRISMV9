import { useCallback, useMemo, useState } from 'react';
import {
  classifyUnifiedIntent,
  executeUnifiedIntent,
  routeUnifiedIntent,
  type ExecutionTier,
  type IntentClassification,
  type PUOAInput,
  type PUOAResult,
  type TierRoutingResult,
} from '../api/unifiedOrchestrator';
import { toApiError } from '../api/requestCore';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  tier: ExecutionTier | null;
  progress: number;
}

function isIdleState<T>(state: AsyncState<T>) {
  return (
    state.data === null
    && state.loading === false
    && state.error === null
    && state.tier === null
    && state.progress === 0
  );
}

function createIdleState<T>(): AsyncState<T> {
  return {
    data: null,
    loading: false,
    error: null,
    tier: null,
    progress: 0,
  };
}

function useAsyncOrchestrator<TPayload, TResult>(
  executeRequest: (payload: TPayload) => Promise<TResult>,
  resolveTier: (payload: TPayload, result: TResult) => ExecutionTier | null,
) {
  const [state, setState] = useState<AsyncState<TResult>>(() => createIdleState<TResult>());

  const execute = useCallback(async (payload: TPayload): Promise<TResult | null> => {
    setState((current) => ({
      ...current,
      loading: true,
      error: null,
      progress: 18,
    }));

    try {
      const result = await executeRequest(payload);
      setState({
        data: result,
        loading: false,
        error: null,
        tier: resolveTier(payload, result),
        progress: 100,
      });
      return result;
    } catch (issue) {
      const apiIssue = toApiError(issue, 'Unified PRISM AI request failed');
      setState({
        data: null,
        loading: false,
        error: apiIssue.message,
        tier: null,
        progress: 0,
      });
      return null;
    }
  }, [executeRequest, resolveTier]);

  const reset = useCallback(() => {
    setState((current) => (isIdleState(current) ? current : createIdleState<TResult>()));
  }, []);

  return useMemo(() => ({
    ...state,
    execute,
    reset,
  }), [execute, reset, state]);
}

export function useOrchestrator() {
  return useAsyncOrchestrator<PUOAInput, PUOAResult>(
    executeUnifiedIntent,
    (_payload, result) => result.tier,
  );
}

export function useIntentClassifier() {
  return useAsyncOrchestrator<Pick<PUOAInput, 'intent' | 'context'>, IntentClassification>(
    classifyUnifiedIntent,
    (_payload, result) => result.tier ?? null,
  );
}

export function useTierRouting() {
  return useAsyncOrchestrator<Pick<PUOAInput, 'intent' | 'context' | 'constraints'>, TierRoutingResult>(
    routeUnifiedIntent,
    (_payload, result) => result.tier,
  );
}

export type {
  ExecutionTier,
  IntentClassification,
  PUOAInput,
  PUOAResult,
  TierRoutingResult,
};
