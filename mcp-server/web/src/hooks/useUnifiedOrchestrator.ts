/**
 * useUnifiedOrchestrator — KAR-MS7 U-KAR65
 *
 * React hook for unified orchestrator access.
 * Re-exports and extends useOrchestrator with additional convenience methods.
 *
 * This is the primary hook for pages to access the PUOA system.
 * It provides:
 *   - Intent execution with tier routing
 *   - Classification preview
 *   - Caching of recent results
 *
 * Usage:
 *   const orchestrator = useUnifiedOrchestrator();
 *   const result = await orchestrator.execute({ intent: "calculate speed for steel milling" });
 */
import { useCallback, useState, useMemo } from 'react';
import {
  useOrchestrator,
  useIntentClassifier,
  useTierRouting,
  type PUOAResult,
  type IntentClassification,
  type TierRoutingResult,
  type PUOAInput,
  type ExecutionTier,
} from './useOrchestrator';

// ── Types ────────────────────────────────────────────────────────

interface CachedResult {
  intent: string;
  result: PUOAResult;
  timestamp: number;
}

interface UnifiedOrchestratorState {
  // Execution state
  data: PUOAResult | null;
  loading: boolean;
  error: string | null;
  tier: ExecutionTier | null;
  progress: number;

  // Classification state
  classification: IntentClassification | null;
  classifying: boolean;

  // Routing state
  routing: TierRoutingResult | null;

  // Cache
  recentResults: CachedResult[];
}

// ── Hook ─────────────────────────────────────────────────────────

const CACHE_SIZE = 10;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Unified orchestrator hook for PRISM web pages.
 * Combines execution, classification, and routing in one hook.
 */
export function useUnifiedOrchestrator() {
  const orchestrator = useOrchestrator();
  const classifier = useIntentClassifier();
  const routing = useTierRouting();

  const [recentResults, setRecentResults] = useState<CachedResult[]>([]);

  // Execute with caching
  const execute = useCallback(async (input: PUOAInput): Promise<PUOAResult | null> => {
    // Check cache first
    const cached = recentResults.find(
      r => r.intent === input.intent && Date.now() - r.timestamp < CACHE_TTL_MS
    );
    if (cached) {
      return cached.result;
    }

    // Execute
    const result = await orchestrator.execute(input);

    // Cache result
    if (result) {
      setRecentResults(prev => {
        const updated = [{ intent: input.intent, result, timestamp: Date.now() }, ...prev];
        return updated.slice(0, CACHE_SIZE);
      });
    }

    return result;
  }, [orchestrator, recentResults]);

  // Classify intent (for preview)
  const classify = useCallback(async (intent: string, context?: Record<string, unknown>) => {
    return classifier.execute({ intent, context });
  }, [classifier]);

  // Route to tier (for planning)
  const route = useCallback(async (input: PUOAInput) => {
    return routing.execute(input);
  }, [routing]);

  // Clear cache
  const clearCache = useCallback(() => {
    setRecentResults([]);
    orchestrator.reset();
    classifier.reset();
    routing.reset();
  }, [orchestrator, classifier, routing]);

  // Combined state
  const state: UnifiedOrchestratorState = useMemo(() => ({
    // Execution
    data: orchestrator.data,
    loading: orchestrator.loading,
    error: orchestrator.error,
    tier: orchestrator.tier,
    progress: orchestrator.progress,

    // Classification
    classification: classifier.data,
    classifying: classifier.loading,

    // Routing
    routing: routing.data,

    // Cache
    recentResults,
  }), [orchestrator, classifier, routing, recentResults]);

  return useMemo(() => ({
    ...state,
    execute,
    classify,
    route,
    clearCache,
    reset: clearCache,
  }), [classify, clearCache, execute, route, state]);
}

// ── Convenience Re-exports ───────────────────────────────────────

export {
  useOrchestrator,
  useIntentClassifier,
  useTierRouting,
  type PUOAResult,
  type IntentClassification,
  type TierRoutingResult,
  type PUOAInput,
  type ExecutionTier,
};

export default useUnifiedOrchestrator;
