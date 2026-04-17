/**
 * WEDMReasoningBridgeEngine — MS-P0.5-COORD U-P0.5-COORD-04
 *
 * The bridge that stitches the coordination substrate together:
 *   - consultAwareness (middleware) → tips/rules/citations
 *   - WEDMBlackboardEngine (U-03) → shared hypothesis/decision slots
 *   - WEDMReasoningTraceLedgerEngine (U-02) → durable reasoning trail
 *
 * Dispatchers invoke `enrichContext` once per WEDM action. The bridge reads
 * prior blackboard entries, converts awareness tips into blackboard
 * observations (so subsequent engines can see them), and returns an enriched
 * context object. Everything fails open — the bridge never blocks dispatch.
 */
import { wedmBlackboardEngine, BlackboardTag } from "./WEDMBlackboardEngine.js";
import { wedmReasoningTraceLedgerEngine } from "./WEDMReasoningTraceLedgerEngine.js";

export interface AwarenessTip {
  id?: string;
  text: string;
  confidence?: number;
  source?: string;
}

export interface BridgeInput {
  dispatcher: string;
  action: string;
  keywords: string[];
  params?: Record<string, unknown>;
  awarenessTips?: AwarenessTip[];
  awarenessCached?: boolean;
  awarenessLatencyMs?: number;
}

export interface EnrichedContext {
  dispatcher: string;
  action: string;
  namespace: string;
  priorObservations: Array<{ key: string; value: unknown; source: string; age_ms: number }>;
  priorDecisions: Array<{ key: string; value: unknown; source: string; age_ms: number }>;
  priorWarnings: Array<{ key: string; value: unknown; source: string; age_ms: number }>;
  postedObservations: number;
  awarenessTipCount: number;
  bridgeLatencyMs: number;
}

export interface BridgeStats {
  totalBridges: number;
  avgLatencyMs: number;
  avgTipsIngested: number;
  avgPriorObservations: number;
  recentBridgeRate_per_min: number;
}

function deriveNamespace(dispatcher: string, action: string, params?: Record<string, unknown>): string {
  const material = typeof params?.material === "string" ? params.material : "";
  const parts = ["wedm", dispatcher];
  if (material) parts.push(`mat.${String(material).toLowerCase()}`);
  parts.push(action.toLowerCase());
  return parts.join(".");
}

const RECENT_BRIDGES: number[] = [];
const LATENCIES: number[] = [];
const TIPS_INGESTED: number[] = [];
const PRIORS_READ: number[] = [];
const WINDOW_MS = 5 * 60 * 1000;
const HISTORY_CAP = 500;

export class WEDMReasoningBridgeEngine {
  enrichContext(input: BridgeInput): EnrichedContext {
    const start = Date.now();
    const namespace = deriveNamespace(input.dispatcher, input.action, input.params);

    // 1. Read prior slots in this namespace
    const priorAll = wedmBlackboardEngine.readAllInNamespace(namespace);
    const mapEntry = (e: (typeof priorAll)[number]) => ({
      key: e.key,
      value: e.value,
      source: e.source,
      age_ms: Date.now() - new Date(e.at).getTime(),
    });
    const priorObservations = priorAll.filter((e) => e.tag === "observation").map(mapEntry);
    const priorDecisions = priorAll.filter((e) => e.tag === "decision").map(mapEntry);
    const priorWarnings = priorAll.filter((e) => e.tag === "warning").map(mapEntry);

    // 2. Convert awareness tips into blackboard observations (so downstream engines can see them)
    let postedObservations = 0;
    if (input.awarenessTips && input.awarenessTips.length > 0) {
      for (let i = 0; i < input.awarenessTips.length; i++) {
        const tip = input.awarenessTips[i];
        const key = tip.id ? `tip.${tip.id}` : `tip.${i}`;
        const tag: BlackboardTag = "observation";
        wedmBlackboardEngine.post(namespace, key, tip.text, tag, tip.source ?? "awareness", {
          confidence: tip.confidence,
          ttlMs: 10 * 60 * 1000,
        });
        postedObservations++;
      }
    }

    const latency = Date.now() - start;

    // 3. Track perf + record trace
    LATENCIES.push(latency);
    TIPS_INGESTED.push(input.awarenessTips?.length ?? 0);
    PRIORS_READ.push(priorAll.length);
    RECENT_BRIDGES.push(start);
    if (LATENCIES.length > HISTORY_CAP) {
      LATENCIES.splice(0, LATENCIES.length - HISTORY_CAP);
      TIPS_INGESTED.splice(0, TIPS_INGESTED.length - HISTORY_CAP);
      PRIORS_READ.splice(0, PRIORS_READ.length - HISTORY_CAP);
      RECENT_BRIDGES.splice(0, RECENT_BRIDGES.length - HISTORY_CAP);
    }

    wedmReasoningTraceLedgerEngine.recordTraceSync({
      dispatcher: input.dispatcher,
      action: input.action,
      keywords: input.keywords,
      awareness_used: (input.awarenessTips?.length ?? 0) > 0,
      duration_ms: latency,
      engines_consulted: ["WEDMBlackboardEngine", "WEDMReasoningBridgeEngine"],
    });

    return {
      dispatcher: input.dispatcher,
      action: input.action,
      namespace,
      priorObservations,
      priorDecisions,
      priorWarnings,
      postedObservations,
      awarenessTipCount: input.awarenessTips?.length ?? 0,
      bridgeLatencyMs: latency,
    };
  }

  postDecision(
    dispatcher: string,
    action: string,
    params: Record<string, unknown> | undefined,
    key: string,
    value: unknown,
    source: string,
    confidence?: number,
  ): void {
    const namespace = deriveNamespace(dispatcher, action, params);
    wedmBlackboardEngine.post(namespace, key, value, "decision", source, { confidence });
  }

  postWarning(
    dispatcher: string,
    action: string,
    params: Record<string, unknown> | undefined,
    key: string,
    value: unknown,
    source: string,
  ): void {
    const namespace = deriveNamespace(dispatcher, action, params);
    wedmBlackboardEngine.post(namespace, key, value, "warning", source);
  }

  getStats(): BridgeStats {
    const now = Date.now();
    const recent = RECENT_BRIDGES.filter((t) => now - t <= WINDOW_MS);
    const avg = (xs: number[]) =>
      xs.length === 0 ? 0 : Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100;
    return {
      totalBridges: LATENCIES.length,
      avgLatencyMs: avg(LATENCIES),
      avgTipsIngested: avg(TIPS_INGESTED),
      avgPriorObservations: avg(PRIORS_READ),
      recentBridgeRate_per_min: recent.length === 0 ? 0 : Math.round((recent.length / 5) * 10) / 10,
    };
  }

  resetForTests(): void {
    LATENCIES.length = 0;
    TIPS_INGESTED.length = 0;
    PRIORS_READ.length = 0;
    RECENT_BRIDGES.length = 0;
  }
}

export const wedmReasoningBridgeEngine = new WEDMReasoningBridgeEngine();
