/**
 * WEDMMultiAgentDispatchEngine — MS-P0.5-COORD U-P0.5-COORD-08
 *
 * Capstone engine for the Round 4 coordination substrate. Presents a single
 * coordination facade to WEDM dispatchers so each entry point invokes the
 * full stack (awareness → bridge → blackboard → ledger) with one call
 * instead of ad-hoc wiring per dispatcher.
 *
 * Before U-08: every WEDM dispatcher wired awareness + ledger manually
 *   (edmDispatcher, camDispatcher). That duplicates boilerplate and makes
 *   it easy for a new dispatcher to ship with partial wiring.
 * After U-08: dispatchers call `coordinateDispatch` at entry + `recordOutcome`
 *   at exit. This engine is the only place that knows the invocation order.
 *
 * Fails open at every step: a consult failure, bridge failure, or ledger
 * failure never blocks the dispatcher's actual work.
 */
import { wedmAwarenessAdoptionEngine } from "./WEDMAwarenessAdoptionEngine.js";
import { wedmReasoningBridgeEngine, EnrichedContext } from "./WEDMReasoningBridgeEngine.js";
import { wedmReasoningTraceLedgerEngine } from "./WEDMReasoningTraceLedgerEngine.js";
import { wedmBlackboardEngine } from "./WEDMBlackboardEngine.js";

export interface CoordinateInput {
  dispatcher: string;
  action: string;
  params?: Record<string, unknown>;
  keywords?: string[];
}

export interface CoordinationResult {
  ok: boolean;
  dispatcher: string;
  action: string;
  keywords: string[];
  awarenessTipCount: number;
  awarenessLatencyMs: number;
  awarenessCached: boolean;
  enriched: EnrichedContext | null;
  entryAt: number;
  coordLatencyMs: number;
  summary: string | null;
}

export interface OutcomeInput {
  dispatcher: string;
  action: string;
  keywords: string[];
  entryAt: number;
  success: boolean;
  decisionKey?: string;
  decisionValue?: unknown;
  warnings?: string[];
  confidence?: number;
  awareness_used?: boolean;
  error?: string;
}

export interface MultiAgentDispatchStats {
  totalCoordinations: number;
  totalOutcomes: number;
  coordinationFailures: number;
  avgCoordLatencyMs: number;
  avgTotalLatencyMs: number;
  decisionsPosted: number;
  warningsPosted: number;
  lastCoordinationAt: string | null;
}

const LATENCY_WINDOW = 500;

export class WEDMMultiAgentDispatchEngine {
  private coordLatencies: number[] = [];
  private totalLatencies: number[] = [];
  private totalCoordinations = 0;
  private totalOutcomes = 0;
  private coordinationFailures = 0;
  private decisionsPosted = 0;
  private warningsPosted = 0;
  private lastCoordinationAt: string | null = null;

  async coordinateDispatch(input: CoordinateInput): Promise<CoordinationResult> {
    const entryAt = Date.now();
    const startCoord = entryAt;

    const baseKeywords = input.keywords ?? [];
    let keywords = baseKeywords;
    let summary: string | null = null;
    let tipCount = 0;
    let awarenessLatencyMs = 0;
    let awarenessCached = false;
    let enriched: EnrichedContext | null = null;

    try {
      const { consultAwareness } = await import("../tools/dispatchers/awarenessMiddleware.js");
      keywords = wedmAwarenessAdoptionEngine.extractKeywords(input.action, input.params);
      const aw = await consultAwareness({
        dispatcher: input.dispatcher,
        action: input.action,
        keywords,
      });
      wedmAwarenessAdoptionEngine.recordAdoption({
        dispatcher: input.dispatcher,
        action: input.action,
        latencyMs: aw.latencyMs,
        cached: aw.cached,
        ok: aw.ok,
      });
      summary = Array.isArray(aw.summary) && aw.summary.length > 0 ? aw.summary.join("; ") : null;
      awarenessLatencyMs = aw.latencyMs ?? 0;
      awarenessCached = aw.cached ?? false;
      const awTips = Array.isArray(aw.summary)
        ? aw.summary.map((text: string, i: number) => ({
            id: `tip-${i}`,
            text,
            confidence: 0.7,
            source: "consultAwareness",
          }))
        : [];
      tipCount = awTips.length;
      try {
        enriched = wedmReasoningBridgeEngine.enrichContext({
          dispatcher: input.dispatcher,
          action: input.action,
          keywords,
          params: input.params,
          awarenessTips: awTips,
          awarenessCached,
          awarenessLatencyMs,
        });
      } catch {
        enriched = null;
      }
    } catch {
      this.coordinationFailures++;
    }

    const coordLatencyMs = Date.now() - startCoord;
    this.coordLatencies.push(coordLatencyMs);
    if (this.coordLatencies.length > LATENCY_WINDOW) {
      this.coordLatencies.splice(0, this.coordLatencies.length - LATENCY_WINDOW);
    }
    this.totalCoordinations++;
    this.lastCoordinationAt = new Date(entryAt).toISOString();

    return {
      ok: enriched !== null,
      dispatcher: input.dispatcher,
      action: input.action,
      keywords,
      awarenessTipCount: tipCount,
      awarenessLatencyMs,
      awarenessCached,
      enriched,
      entryAt,
      coordLatencyMs,
      summary,
    };
  }

  recordOutcome(input: OutcomeInput): void {
    this.totalOutcomes++;
    const totalLatency = Date.now() - input.entryAt;
    this.totalLatencies.push(totalLatency);
    if (this.totalLatencies.length > LATENCY_WINDOW) {
      this.totalLatencies.splice(0, this.totalLatencies.length - LATENCY_WINDOW);
    }

    try {
      wedmReasoningTraceLedgerEngine.recordTraceSync({
        dispatcher: input.dispatcher,
        action: input.action,
        keywords: input.keywords,
        awareness_used: input.awareness_used === true,
        duration_ms: totalLatency,
        confidence: input.confidence,
        error: input.success ? undefined : input.error ?? "unknown error",
      });
    } catch { /* ledger never blocks */ }

    if (input.success && input.decisionKey) {
      try {
        wedmReasoningBridgeEngine.postDecision(
          input.dispatcher,
          input.action,
          undefined,
          input.decisionKey,
          input.decisionValue,
          "multi-agent-dispatch",
          input.confidence,
        );
        this.decisionsPosted++;
      } catch { /* fails open */ }
    }

    if (input.warnings && input.warnings.length > 0) {
      for (let i = 0; i < input.warnings.length; i++) {
        try {
          wedmReasoningBridgeEngine.postWarning(
            input.dispatcher,
            input.action,
            undefined,
            `runtime-${i}`,
            input.warnings[i],
            "multi-agent-dispatch",
          );
          this.warningsPosted++;
        } catch { /* fails open */ }
      }
    }
  }

  getStats(): MultiAgentDispatchStats {
    const avg = (arr: number[]): number => {
      if (arr.length === 0) return 0;
      return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100;
    };
    return {
      totalCoordinations: this.totalCoordinations,
      totalOutcomes: this.totalOutcomes,
      coordinationFailures: this.coordinationFailures,
      avgCoordLatencyMs: avg(this.coordLatencies),
      avgTotalLatencyMs: avg(this.totalLatencies),
      decisionsPosted: this.decisionsPosted,
      warningsPosted: this.warningsPosted,
      lastCoordinationAt: this.lastCoordinationAt,
    };
  }

  snapshot(): {
    blackboard: ReturnType<typeof wedmBlackboardEngine.getStats>;
    ledger: ReturnType<typeof wedmReasoningTraceLedgerEngine.getStats>;
    bridge: ReturnType<typeof wedmReasoningBridgeEngine.getStats>;
    dispatch: MultiAgentDispatchStats;
  } {
    return {
      blackboard: wedmBlackboardEngine.getStats(),
      ledger: wedmReasoningTraceLedgerEngine.getStats(),
      bridge: wedmReasoningBridgeEngine.getStats(),
      dispatch: this.getStats(),
    };
  }

  resetForTests(): void {
    this.coordLatencies.length = 0;
    this.totalLatencies.length = 0;
    this.totalCoordinations = 0;
    this.totalOutcomes = 0;
    this.coordinationFailures = 0;
    this.decisionsPosted = 0;
    this.warningsPosted = 0;
    this.lastCoordinationAt = null;
  }
}

export const wedmMultiAgentDispatchEngine = new WEDMMultiAgentDispatchEngine();
