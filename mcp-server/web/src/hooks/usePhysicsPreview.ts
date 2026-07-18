/**
 * usePhysicsPreview — Hook for physics calculations via Web Worker
 * LATHE-PROD-READY-MS0/U-LPR-WEBWORKER
 *
 * Runs physics preview calculations off the main thread.
 * IMPORTANT: Frontend preview only — backend is authoritative for release-grade.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PhysicsPreviewInput, PhysicsPreviewResult } from '../workers/physicsPreview.worker';

interface UsePhysicsPreviewOptions {
  debounceMs?: number;
}

interface PhysicsPreviewState {
  result: PhysicsPreviewResult | null;
  loading: boolean;
  error: string | null;
}

let workerInstance: Worker | null = null;
let requestId = 0;
const pendingRequests = new Map<number, {
  resolve: (result: PhysicsPreviewResult) => void;
  reject: (error: Error) => void;
}>();

function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new Worker(
      new URL('../workers/physicsPreview.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerInstance.onmessage = (event: MessageEvent) => {
      const { id, result, error } = event.data;
      const pending = pendingRequests.get(id);
      if (pending) {
        pendingRequests.delete(id);
        if (error) {
          pending.reject(new Error(error));
        } else {
          pending.resolve(result);
        }
      }
    };

    workerInstance.onerror = (error) => {
      console.error('Physics worker error:', error);
    };
  }
  return workerInstance;
}

async function callWorker(
  method: 'calculate' | 'calculateBatch',
  ...args: unknown[]
): Promise<PhysicsPreviewResult | PhysicsPreviewResult[]> {
  const worker = getWorker();
  const id = ++requestId;

  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve: resolve as (r: PhysicsPreviewResult) => void, reject });
    worker.postMessage({ id, method, args });
  });
}

/**
 * Hook for single physics preview calculation
 */
export function usePhysicsPreview(
  input: PhysicsPreviewInput | null,
  options: UsePhysicsPreviewOptions = {}
): PhysicsPreviewState {
  const { debounceMs = 100 } = options;
  const [state, setState] = useState<PhysicsPreviewState>({
    result: null,
    loading: false,
    error: null,
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!input) {
      setState({ result: null, loading: false, error: null });
      return;
    }

    setState(s => ({ ...s, loading: true, error: null }));

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        const result = await callWorker('calculate', input) as PhysicsPreviewResult;
        setState({ result, loading: false, error: null });
      } catch (err) {
        setState({
          result: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Calculation failed',
        });
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [input?.operation, JSON.stringify(input?.params), debounceMs]);

  return state;
}

/**
 * Hook for batch physics preview calculations
 */
export function usePhysicsPreviewBatch(
  inputs: PhysicsPreviewInput[] | null,
  options: UsePhysicsPreviewOptions = {}
): {
  results: PhysicsPreviewResult[];
  loading: boolean;
  error: string | null;
} {
  const { debounceMs = 100 } = options;
  const [state, setState] = useState<{
    results: PhysicsPreviewResult[];
    loading: boolean;
    error: string | null;
  }>({
    results: [],
    loading: false,
    error: null,
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!inputs || inputs.length === 0) {
      setState({ results: [], loading: false, error: null });
      return;
    }

    setState(s => ({ ...s, loading: true, error: null }));

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        const results = await callWorker('calculateBatch', inputs) as PhysicsPreviewResult[];
        setState({ results, loading: false, error: null });
      } catch (err) {
        setState({
          results: [],
          loading: false,
          error: err instanceof Error ? err.message : 'Batch calculation failed',
        });
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [JSON.stringify(inputs), debounceMs]);

  return state;
}

/**
 * Direct calculation function (not a hook)
 */
export async function calculatePhysicsPreview(
  input: PhysicsPreviewInput
): Promise<PhysicsPreviewResult> {
  return callWorker('calculate', input) as Promise<PhysicsPreviewResult>;
}

/**
 * Terminate the worker (cleanup)
 */
export function terminatePhysicsWorker(): void {
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
    pendingRequests.clear();
  }
}
