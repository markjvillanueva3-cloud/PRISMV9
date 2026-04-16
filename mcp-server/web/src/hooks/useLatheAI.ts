/**
 * Lathe AI React Hooks
 * Provides React hooks for lathe_ultra_* and post_ai_* features.
 */

import { useCallback, useRef, useState } from 'react';
import {
  latheUltraApi,
  postAIApi,
  type ControllerProfile,
  type ControllerComparison,
  type HardCodeAssistance,
  type MacroGeneration,
  type NLTranslation,
  type CAMRecommendation,
  type DeepReasoningResult,
  type LLMQueryResult,
  type PostProfile,
  type PostDebugResult,
  type CycleRecommendation,
  type CodeTranslation,
  type PostOptimization,
  type MacroConversion,
} from '../api/latheAI';

// ── Generic async state ─────────────────────────────────────────────────────

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useApiCall<TReq, TRes>(apiFn: (params: TReq) => Promise<TRes>) {
  const [state, setState] = useState<AsyncState<TRes>>({ data: null, loading: false, error: null });
  const abortRef = useRef<AbortController | null>(null);

  const execute = useCallback(async (params: TReq): Promise<TRes | null> => {
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
      if ((e as Error).name === 'AbortError') return null;
      const msg = (e as Error).message || 'AI request failed';
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

// ── Lathe Ultra Hooks ───────────────────────────────────────────────────────

export const useLatheControllerProfile = () =>
  useApiCall<string, ControllerProfile>(latheUltraApi.getController);

export const useLatheControllerList = () =>
  useApiCall<void, { controllers: ControllerProfile[] }>(() => latheUltraApi.listControllers());

export const useLatheControllerCompare = () =>
  useApiCall<string[], ControllerComparison>(latheUltraApi.compareControllers);

export const useLatheHardCodeAssist = () =>
  useApiCall<Parameters<typeof latheUltraApi.assistHardCode>[0], HardCodeAssistance>(
    latheUltraApi.assistHardCode
  );

export const useLatheMacroGenerate = () =>
  useApiCall<Parameters<typeof latheUltraApi.generateMacro>[0], MacroGeneration>(
    latheUltraApi.generateMacro
  );

export const useLatheNLTranslate = () =>
  useApiCall<Parameters<typeof latheUltraApi.translateNL>[0], NLTranslation>(
    latheUltraApi.translateNL
  );

export const useLatheCAMRecommend = () =>
  useApiCall<Parameters<typeof latheUltraApi.recommendCAM>[0], CAMRecommendation>(
    latheUltraApi.recommendCAM
  );

export const useLatheDeepReason = () =>
  useApiCall<Parameters<typeof latheUltraApi.deepReason>[0], DeepReasoningResult>(
    latheUltraApi.deepReason
  );

export const useLatheLLMQuery = () =>
  useApiCall<Parameters<typeof latheUltraApi.llmQuery>[0], LLMQueryResult>(
    latheUltraApi.llmQuery
  );

export const useLathePostProfile = () =>
  useApiCall<string, PostProfile>(latheUltraApi.getPost);

// ── Post Processor AI Hooks ─────────────────────────────────────────────────

export const usePostProfileGet = () =>
  useApiCall<string, PostProfile>(postAIApi.getProfile);

export const usePostProfileList = () =>
  useApiCall<void, { profiles: PostProfile[] }>(() => postAIApi.listProfiles());

export const usePostDebug = () =>
  useApiCall<Parameters<typeof postAIApi.debug>[0], PostDebugResult>(postAIApi.debug);

export const usePostCycleRecommend = () =>
  useApiCall<Parameters<typeof postAIApi.recommendCycle>[0], CycleRecommendation>(
    postAIApi.recommendCycle
  );

export const usePostTranslate = () =>
  useApiCall<Parameters<typeof postAIApi.translate>[0], CodeTranslation>(postAIApi.translate);

export const usePostOptimize = () =>
  useApiCall<Parameters<typeof postAIApi.optimize>[0], PostOptimization>(postAIApi.optimize);

export const usePostMacroConvert = () =>
  useApiCall<Parameters<typeof postAIApi.convertMacro>[0], MacroConversion>(postAIApi.convertMacro);

export const usePostDeepReason = () =>
  useApiCall<Parameters<typeof postAIApi.deepReason>[0], DeepReasoningResult>(postAIApi.deepReason);

export const usePostLLMQuery = () =>
  useApiCall<Parameters<typeof postAIApi.llmQuery>[0], LLMQueryResult>(postAIApi.llmQuery);

export const usePostLearningContext = () =>
  useApiCall<Parameters<typeof postAIApi.learningContext>[0], { lessons: Array<{ title: string; content: string; difficulty: string }> }>(
    postAIApi.learningContext
  );

// ── Composite Lathe AI Hook ─────────────────────────────────────────────────

export interface UseLatheAIOptions {
  controller?: string;
  gcode?: string;
}

/**
 * Composite hook providing all lathe AI capabilities in one place.
 * Useful for pages that need multiple AI features.
 */
export function useLatheAI(options: UseLatheAIOptions = {}) {
  const { controller = 'fanuc_oi_tf', gcode = '' } = options;

  const debug = usePostDebug();
  const optimize = usePostOptimize();
  const translate = usePostTranslate();
  const llmQuery = usePostLLMQuery();
  const deepReason = usePostDeepReason();
  const cycleRecommend = usePostCycleRecommend();
  const macroConvert = usePostMacroConvert();

  const runDebug = useCallback(() => {
    if (!gcode) return;
    debug.execute({ controller, gcode });
  }, [controller, gcode, debug]);

  const runOptimize = useCallback((optimizations?: string[]) => {
    if (!gcode) return;
    optimize.execute({ controller, gcode, optimizations });
  }, [controller, gcode, optimize]);

  const runTranslate = useCallback((targetController: string) => {
    if (!gcode) return;
    translate.execute({ sourceController: controller, targetController, gcode });
  }, [controller, gcode, translate]);

  const askQuestion = useCallback((query: string) => {
    llmQuery.execute({ controller, query, gcode });
  }, [controller, gcode, llmQuery]);

  const troubleshoot = useCallback((problem: string) => {
    deepReason.execute({ controller, problem, gcode });
  }, [controller, gcode, deepReason]);

  const suggestCycle = useCallback((operation: string, material?: string) => {
    cycleRecommend.execute({ controller, operation, material });
  }, [controller, cycleRecommend]);

  const convertMacro = useCallback((targetController: string, macroCode: string) => {
    macroConvert.execute({ sourceController: controller, targetController, macroCode });
  }, [controller, macroConvert]);

  return {
    controller,
    gcode,

    // Debug
    debugResult: debug.data,
    debugLoading: debug.loading,
    debugError: debug.error,
    runDebug,

    // Optimize
    optimizeResult: optimize.data,
    optimizeLoading: optimize.loading,
    optimizeError: optimize.error,
    runOptimize,

    // Translate
    translateResult: translate.data,
    translateLoading: translate.loading,
    translateError: translate.error,
    runTranslate,

    // LLM Query
    queryResult: llmQuery.data,
    queryLoading: llmQuery.loading,
    queryError: llmQuery.error,
    askQuestion,

    // Troubleshoot (deep reasoning)
    troubleshootResult: deepReason.data,
    troubleshootLoading: deepReason.loading,
    troubleshootError: deepReason.error,
    troubleshoot,

    // Cycle recommendation
    cycleResult: cycleRecommend.data,
    cycleLoading: cycleRecommend.loading,
    cycleError: cycleRecommend.error,
    suggestCycle,

    // Macro conversion
    macroResult: macroConvert.data,
    macroLoading: macroConvert.loading,
    macroError: macroConvert.error,
    convertMacro,

    // Reset all
    resetAll: useCallback(() => {
      debug.reset();
      optimize.reset();
      translate.reset();
      llmQuery.reset();
      deepReason.reset();
      cycleRecommend.reset();
      macroConvert.reset();
    }, [debug, optimize, translate, llmQuery, deepReason, cycleRecommend, macroConvert]),
  };
}
