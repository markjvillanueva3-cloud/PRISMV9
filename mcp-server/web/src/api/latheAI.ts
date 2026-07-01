/**
 * Lathe AI API Client
 * Connects to PRISM lathe_ultra_* and post_ai_* dispatcher actions.
 */

import { getRequestHeaders } from './client';

const API_BASE = '/api/v1/ai/reasoning';
const TIMEOUT_MS = 30_000;

// ── Types ───────────────────────────────────────────────────────────────────

export interface ControllerProfile {
  controllerId: string;
  family: string;
  manufacturer: string;
  programmingModes: string[];
  variableRange: { start: number; end: number };
  features: string[];
  roughingCycle: string;
  finishingCycle: string;
  threadingCycle: string;
  groovingCycle: string;
}

export interface ControllerComparison {
  controllers: Array<{
    id: string;
    name: string;
    features: string[];
  }>;
  commonFeatures: string[];
  differences: Array<{
    feature: string;
    support: Record<string, boolean>;
  }>;
  recommendation: string;
}

export interface HardCodeAssistance {
  gcode: string;
  explanation: string;
  parameters: Array<{
    name: string;
    value: string;
    description: string;
  }>;
  safetyNotes: string[];
}

export interface MacroGeneration {
  code: string;
  variables: Array<{
    name: string;
    description: string;
    defaultValue: string;
  }>;
  usage: string;
  controllerNotes: string;
}

export interface NLTranslation {
  gcode: string;
  interpretation: string;
  assumptions: string[];
  warnings: string[];
}

export interface CAMRecommendation {
  recommendedCAM: string;
  reasoning: string;
  alternatives: Array<{
    name: string;
    pros: string[];
    cons: string[];
  }>;
  postRequirements: string[];
}

export interface DeepReasoningResult {
  chain: Array<{
    step: number;
    thought: string;
    conclusion: string;
  }>;
  finalAnswer: string;
  confidence: number;
  alternatives: string[];
}

export interface LLMQueryResult {
  answer: string;
  reasoning: string;
  references: string[];
  followUpQuestions: string[];
}

export interface PostProfile {
  controllerId: string;
  family: string;
  roughingCycle: string;
  finishingCycle: string;
  threadingCycle: string;
  modalGroups: string[];
  features: string[];
}

export interface PostDebugResult {
  issues: Array<{
    line: number;
    code: string;
    issue: string;
    severity: 'error' | 'warning' | 'info';
    suggestion: string;
  }>;
  summary: string;
  safetyRating: number;
}

export interface CycleRecommendation {
  cycle: string;
  parameters: Array<{
    param: string;
    value: string;
    description: string;
  }>;
  example: string;
  notes: string[];
}

export interface CodeTranslation {
  translatedCode: string;
  sourceController: string;
  targetController: string;
  changes: Array<{
    original: string;
    translated: string;
    reason: string;
  }>;
  warnings: string[];
}

export interface PostOptimization {
  optimizedCode: string;
  improvements: Array<{
    type: string;
    description: string;
    linesAffected: number[];
  }>;
  estimatedTimeSavings: string;
  safetyNotes: string[];
}

export interface MacroConversion {
  convertedCode: string;
  variableMapping: Array<{
    original: string;
    converted: string;
    description: string;
  }>;
  notes: string[];
}

// ── API Functions ───────────────────────────────────────────────────────────

async function post<T>(action: string, params: Record<string, unknown>): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: getRequestHeaders(),
      body: JSON.stringify({ action, params }),
      signal: controller.signal,
    });
    if (!res.ok) {
      // 404 = the /api/v1/ai/reasoning bridge route is not mounted (lathe-AI backend pending).
      // Surface a clear, honest message instead of a cryptic "Not Found" so shop-floor testers
      // see the real state of the feature, not a raw HTTP status. (U-LATHEAI-404-MSG, quebec.)
      if (res.status === 404) {
        throw new Error(`Lathe AI is not available yet -- its backend (POST ${API_BASE}, action "${action}") is not implemented.`);
      }
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message ?? res.statusText);
    }
    const data = await res.json();
    return data.result as T;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Lathe Ultra API ─────────────────────────────────────────────────────────

export const latheUltraApi = {
  /** Get detailed controller profile */
  getController: (controllerId: string) =>
    post<ControllerProfile>('lathe_ultra_get_controller', { controller_id: controllerId }),

  /** List all supported controllers */
  listControllers: () =>
    post<{ controllers: ControllerProfile[] }>('lathe_ultra_list_controllers', {}),

  /** Compare multiple controllers */
  compareControllers: (controllerIds: string[]) =>
    post<ControllerComparison>('lathe_ultra_compare_controllers', { controller_ids: controllerIds }),

  /** Get hard code programming assistance */
  assistHardCode: (params: {
    controller: string;
    operation: string;
    material?: string;
    dimensions?: Record<string, number>;
  }) => post<HardCodeAssistance>('lathe_ultra_assist_hardcode', params),

  /** Generate parametric macro */
  generateMacro: (params: {
    controller: string;
    operation: string;
    parameters?: string[];
  }) => post<MacroGeneration>('lathe_ultra_generate_macro', params),

  /** Translate natural language to G-code */
  translateNL: (params: {
    controller: string;
    query: string;
    context?: string;
  }) => post<NLTranslation>('lathe_ultra_translate_nl', params),

  /** Get CAM system recommendation */
  recommendCAM: (params: {
    controller: string;
    complexity: string;
    features?: string[];
  }) => post<CAMRecommendation>('lathe_ultra_recommend_cam', params),

  /** Deep reasoning for complex problems */
  deepReason: (params: {
    controller: string;
    problem: string;
    context?: string;
  }) => post<DeepReasoningResult>('lathe_ultra_deep_reason', params),

  /** Natural language query */
  llmQuery: (params: {
    controller: string;
    query: string;
    context?: string;
  }) => post<LLMQueryResult>('lathe_ultra_llm_query', params),

  /** Get post processor profile */
  getPost: (controllerId: string) =>
    post<PostProfile>('lathe_ultra_get_post', { controller_id: controllerId }),
};

// ── Post Processor AI API ───────────────────────────────────────────────────

export const postAIApi = {
  /** Get post processor profile */
  getProfile: (controllerId: string) =>
    post<PostProfile>('post_ai_get_profile', { controller_id: controllerId }),

  /** List all post profiles */
  listProfiles: () =>
    post<{ profiles: PostProfile[] }>('post_ai_list_profiles', {}),

  /** Debug G-code for issues */
  debug: (params: {
    controller: string;
    gcode: string;
    operation?: string;
  }) => post<PostDebugResult>('post_ai_debug', params),

  /** Recommend canned cycle */
  recommendCycle: (params: {
    controller: string;
    operation: string;
    material?: string;
  }) => post<CycleRecommendation>('post_ai_recommend_cycle', params),

  /** Translate code between controllers */
  translate: (params: {
    sourceController: string;
    targetController: string;
    gcode: string;
  }) => post<CodeTranslation>('post_ai_translate', params),

  /** Optimize G-code */
  optimize: (params: {
    controller: string;
    gcode: string;
    optimizations?: string[];
  }) => post<PostOptimization>('post_ai_optimize', params),

  /** Convert macro dialects */
  convertMacro: (params: {
    sourceController: string;
    targetController: string;
    macroCode: string;
  }) => post<MacroConversion>('post_ai_convert_macro', params),

  /** Deep reasoning for post issues */
  deepReason: (params: {
    controller: string;
    problem: string;
    gcode?: string;
  }) => post<DeepReasoningResult>('post_ai_deep_reason', params),

  /** Natural language query about post */
  llmQuery: (params: {
    controller: string;
    query: string;
    gcode?: string;
  }) => post<LLMQueryResult>('post_ai_llm_query', params),

  /** Get learning context */
  learningContext: (params: {
    controller: string;
    topic: string;
  }) => post<{ lessons: Array<{ title: string; content: string; difficulty: string }> }>('post_ai_learning_context', params),
};
