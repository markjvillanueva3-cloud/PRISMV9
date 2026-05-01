/**
 * useWedmPipeline — Wire EDM Studio React Hooks
 * WEDM-MS0 U-WEDM03
 *
 * Per-step hooks with local loading/error/retry state.
 * AbortController cancellation on unmount.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { PipelineResponse, WedmStep, ImportResult, QuickGenerateJob, ControllerDialect, SelectionParams, MultipassParams, ProgramStageParams, MaterialMachineWireSelection, MultiPassResult, GCodeOutput } from "../types/wedmStudio";
import { wedmApi, quickGenerate } from "../api/wedmStudio";

// ============================================================================
// GENERIC PIPELINE STEP HOOK
// ============================================================================

interface StepState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  step: WedmStep;
}

/**
 * Generic hook for a single pipeline step.
 * Provides loading/error/retry state and automatic abort on unmount.
 */
export function useWedmStep<TParams, TResult>(
  step: WedmStep,
  apiFn: (params: TParams, signal?: AbortSignal) => Promise<PipelineResponse<TResult>>,
) {
  const [state, setState] = useState<StepState<TResult>>({
    data: null,
    loading: false,
    error: null,
    step,
  });

  const abortRef = useRef<AbortController | null>(null);
  const lastParamsRef = useRef<TParams | null>(null);

  // Abort on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const execute = useCallback(async (params: TParams): Promise<PipelineResponse<TResult>> => {
    lastParamsRef.current = params;
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState(prev => ({ ...prev, loading: true, error: null }));

    const result = await apiFn(params, controller.signal);

    // Don't update state if aborted
    if (controller.signal.aborted) {
      return { ok: false, error: "Cancelled", code: "ABORT", step };
    }

    if (result.ok) {
      setState({ data: result.data, loading: false, error: null, step });
    } else {
      setState(prev => ({ ...prev, loading: false, error: result.error }));
    }

    return result;
  }, [apiFn, step]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({ data: null, loading: false, error: null, step });
  }, [step]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState(prev => ({ ...prev, loading: false }));
  }, []);

  /** Retry last execution with same params */
  const retry = useCallback(async (): Promise<PipelineResponse<TResult> | null> => {
    if (!lastParamsRef.current) return null;
    return execute(lastParamsRef.current);
  }, [execute]);

  return { ...state, execute, reset, cancel, retry };
}

// ============================================================================
// STEP-SPECIFIC HOOKS
// ============================================================================

/** Parse DXF/STEP/IGES geometry */
export function useParseGeometry() {
  return useWedmStep<{ content: string; format?: "dxf" | "step" | "iges" }, ImportResult>(
    "import",
    (params, signal) => wedmApi.parseGeometry(params.content, params.format, signal),
  );
}

/** Validate geometry against Wire EDM constraints */
export function useValidateGeometry() {
  return useWedmStep<{ content: string; wireDiameter?: number; sparkGap?: number }, any>(
    "import",
    (params, signal) => wedmApi.validateGeometry(params.content, params.wireDiameter, params.sparkGap, signal),
  );
}

/** Material/machine/wire selection */
export function useSelection() {
  return useWedmStep<SelectionParams, MaterialMachineWireSelection>(
    "review",
    (params, signal) => wedmApi.selection(params, signal),
  );
}

/** Multi-pass optimization */
export function useMultipass() {
  return useWedmStep<MultipassParams, MultiPassResult>(
    "optimize",
    (params, signal) => wedmApi.multipass(params, signal),
  );
}

/** G-code generation */
export function useGcode() {
  return useWedmStep<ProgramStageParams, GCodeOutput>(
    "program",
    (params, signal) => wedmApi.gcode(params, signal),
  );
}

// ============================================================================
// QUICK GENERATE HOOK
// ============================================================================

interface QuickGenerateState {
  job: QuickGenerateJob | null;
  loading: boolean;
  error: string | null;
  currentStep: WedmStep;
  progressPct: number;
}

/**
 * Hook for Quick Generate — runs the full DAG pipeline with progress tracking.
 */
export function useQuickGenerate() {
  const [state, setState] = useState<QuickGenerateState>({
    job: null,
    loading: false,
    error: null,
    currentStep: "import",
    progressPct: 0,
  });

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const execute = useCallback(async (
    dxfContent: string,
    material: string,
    controller: ControllerDialect,
  ): Promise<PipelineResponse<QuickGenerateJob>> => {
    abortRef.current?.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;

    setState({
      job: null,
      loading: true,
      error: null,
      currentStep: "import",
      progressPct: 0,
    });

    const result = await quickGenerate(
      dxfContent,
      material,
      controller,
      (step, pct) => {
        setState(prev => ({ ...prev, currentStep: step, progressPct: pct }));
      },
      abortController.signal,
    );

    if (result.ok) {
      setState({
        job: result.data,
        loading: false,
        error: null,
        currentStep: "program",
        progressPct: 100,
      });
    } else {
      setState(prev => ({
        ...prev,
        loading: false,
        error: result.error,
        currentStep: result.step,
      }));
    }

    return result;
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState(prev => ({ ...prev, loading: false, error: "Cancelled" }));
  }, []);

  return { ...state, execute, cancel };
}
