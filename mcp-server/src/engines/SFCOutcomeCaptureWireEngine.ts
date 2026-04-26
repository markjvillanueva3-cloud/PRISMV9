/**
 * SFCOutcomeCaptureWireEngine — U-PPG-SFC-01
 * ===========================================
 *
 * Thin instrumentation layer that routes every SFC (Speed/Feed Calculator)
 * recommendation through the U-LEARN-01 OutcomeCaptureBus so the learning
 * loop can correlate emitted recommendations with later operator overrides,
 * first-article results, tool-life events, and run-log actuals.
 *
 * Today the SFC engine surface (UltimateSpeedFeedEngine, AutoSpeedFeed-
 * CalculatorEngine, SFCCalculateEngine, MachineAwareSpeedFeedEngine,
 * LatheSpeedFeedCalculatorFacadeEngine) emits recommendations into the void:
 * no event ledger, no lineage_id, no way for downstream calibration to
 * notice that recommendation #N was overridden by 15% on machine 8 against
 * D2 with TNMG carbide. This engine is the single seam that fixes that.
 *
 * Design invariants (mirroring OutcomeCaptureBus):
 *   1. NEVER BLOCK THE CALLER. Every method returns a result object.
 *      Engines invoke this *after* their primary calculation; if the bus
 *      fails the recommendation is still returned to the user.
 *   2. NEVER THROW. The bus contract is best-effort append. We honor it.
 *   3. AUTO-LINEAGE. Caller may pass lineageId; if absent the bus generates
 *      one and we return it so the caller can thread it through provenance.
 *   4. SUMMARIZE OPAQUE RESULTS. The five SFC engines have heterogeneous
 *      result shapes (some flat, some nested under AtomicValue, some with
 *      `recommendations: string[]`). `summarize()` extracts a canonical
 *      subset (sfm/fpt/rpm/doc/ae/feed_rate/vc/fz) so downstream consumers
 *      have a stable query surface without each engine knowing the schema.
 *   5. JSON-SAFE GUARD. Circular refs, BigInt, functions etc. are stripped
 *      before delegation so the bus's serialization step never fails on
 *      legitimate engine outputs.
 *
 * Wired by U-PPG-SFC-01 to:
 *   - UltimateSpeedFeedEngine.calculate
 *   - AutoSpeedFeedCalculatorEngine.calculate
 *   - SFCCalculateEngine.calculate (static)
 *   - MachineAwareSpeedFeedEngine.constrain
 *   - LatheSpeedFeedCalculatorFacadeEngine.calculate (static)
 *
 * Note: AutoSpeedFeedEngine.optimize emits G-code, not speed/feed
 * parameters — that surface is U-PPG-SFC-02 (PPG domain).
 *
 * @module engines/SFCOutcomeCaptureWireEngine
 * @milestone PSAU-PPG-SFC U-PPG-SFC-01
 */

import {
  outcomeCaptureBusEngine,
  OutcomeCaptureBusEngine,
  type RecordOutcomeResult,
} from "./OutcomeCaptureBusEngine.js";

/**
 * Canonical subset of SFC recommendation fields. Any of these may be
 * present in an engine's output; we extract whatever exists and leave the
 * rest undefined. Consumers (calibration, drift detection, RAG warm-start)
 * filter on these keys.
 */
export interface SFCRecommendationSummary {
  sfm?: number;        // surface feet per minute (imperial)
  vc?: number;         // cutting speed m/min (metric)
  rpm?: number;        // spindle rpm
  fpt?: number;        // feed per tooth
  fz?: number;         // alias for fpt (metric)
  fpr?: number;        // feed per revolution (lathe)
  feed_rate?: number;  // ipm or mm/min — engine-dependent unit
  doc?: number;        // depth of cut (axial)
  ae?: number;         // radial engagement / stepover
  ap?: number;         // axial engagement / depth
}

/**
 * Outcome context fields that map directly onto OutcomeContextSchema.
 * All optional — the bus accepts an empty context and so do we.
 */
export interface SFCEmissionContext {
  customer?: string;
  part_number?: string;
  program?: string;
  machine_id?: string;
  material?: string;
  tool_id?: string;
  operation?: string;
}

export interface SFCEmissionInput {
  /** Class name of the emitting engine, e.g. "UltimateSpeedFeedEngine". */
  engine: string;
  /** Dispatcher action that triggered the call, when known. */
  action?: string;
  /** Job/process context — populated from engine input when available. */
  context?: SFCEmissionContext;
  /** Raw recommendation result from the engine; summarized internally. */
  recommended: unknown;
  /** Upstream lineage_id from the request that triggered this emission. */
  lineageId?: string;
  /** Optional agent id for cross-chat attribution. */
  agentId?: string;
  /** Optional confidence (0-1) the engine attaches to its recommendation. */
  confidence?: number;
}

export interface SFCEmissionResult {
  ok: boolean;
  lineage_id: string;
  event_id: string;
  warning?: string;
  summary: SFCRecommendationSummary;
}

const NUMERIC_FIELDS: ReadonlyArray<keyof SFCRecommendationSummary> = [
  "sfm",
  "vc",
  "rpm",
  "fpt",
  "fz",
  "fpr",
  "feed_rate",
  "doc",
  "ae",
  "ap",
];

/**
 * Walks a recommendation object (shallow + one level of `value` unwrapping
 * for AtomicValue payloads) and pulls out the canonical numeric subset.
 *
 * Defensive: any non-finite numbers (NaN, Infinity) are dropped, so the
 * downstream JSONL line stays well-formed and search indexes don't choke.
 */
export function summarizeSFCRecommendation(
  recommended: unknown,
): SFCRecommendationSummary {
  const out: SFCRecommendationSummary = {};
  if (recommended === null || typeof recommended !== "object") {
    return out;
  }
  const rec = recommended as Record<string, unknown>;
  for (const key of NUMERIC_FIELDS) {
    const raw = rec[key];
    const num = unwrapNumber(raw);
    if (num !== undefined) {
      out[key] = num;
    }
  }
  // Common alias normalization: some engines use feedRate (camelCase)
  if (out.feed_rate === undefined) {
    const alt = unwrapNumber(rec.feedRate);
    if (alt !== undefined) out.feed_rate = alt;
  }
  if (out.rpm === undefined) {
    const alt = unwrapNumber(rec.spindleRpm) ?? unwrapNumber(rec.spindle_rpm);
    if (alt !== undefined) out.rpm = alt;
  }
  if (out.fpt === undefined && out.fz !== undefined) {
    out.fpt = out.fz;
  }
  return out;
}

function unwrapNumber(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (raw && typeof raw === "object" && "value" in raw) {
    const v = (raw as { value: unknown }).value;
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return undefined;
}

/**
 * Strips circular references and non-JSON-safe values (functions, BigInt,
 * undefined, symbols) so the bus's `JSON.stringify` step on the recommended
 * payload doesn't throw. Returns null if the input itself is unusable.
 */
function jsonSafe(input: unknown, depth = 0): unknown {
  if (depth > 8) return "[max-depth]";
  if (input === null || input === undefined) return input;
  const t = typeof input;
  if (t === "number") return Number.isFinite(input as number) ? input : null;
  if (t === "string" || t === "boolean") return input;
  if (t === "function" || t === "symbol" || t === "bigint") return undefined;
  if (Array.isArray(input)) {
    return input.map((v) => jsonSafe(v, depth + 1));
  }
  if (t === "object") {
    const seen = new WeakSet<object>();
    return cloneSafe(input as object, depth, seen);
  }
  return undefined;
}

function cloneSafe(
  obj: object,
  depth: number,
  seen: WeakSet<object>,
): Record<string, unknown> | string {
  if (seen.has(obj)) return "[circular]";
  seen.add(obj);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "function" || typeof v === "symbol" || typeof v === "bigint")
      continue;
    if (v && typeof v === "object") {
      if (seen.has(v)) {
        out[k] = "[circular]";
        continue;
      }
      out[k] = jsonSafe(v, depth + 1);
    } else if (typeof v === "number" && !Number.isFinite(v)) {
      out[k] = null;
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * SFCOutcomeCaptureWireEngine — singleton wire from SFC engines to the
 * OutcomeCaptureBus. Engines call `recordEmission(...)` once per public
 * recommendation entry point.
 */
export class SFCOutcomeCaptureWireEngine {
  /** Bus the wire writes through. Tests can inject an isolated instance. */
  private readonly bus: OutcomeCaptureBusEngine;

  constructor(bus: OutcomeCaptureBusEngine = outcomeCaptureBusEngine) {
    this.bus = bus;
  }

  /**
   * Record an SFC engine emission. Always returns a result object even
   * when the underlying bus rejects (disk full, schema fail, etc.).
   *
   * @param input  Engine-supplied emission payload.
   * @returns  Result object including the assigned lineage_id so the
   *           caller can thread it into its own response provenance.
   */
  recordEmission(input: SFCEmissionInput): SFCEmissionResult {
    const summary = summarizeSFCRecommendation(input.recommended);
    const safeRecommended = jsonSafe(input.recommended);

    const ctx: Record<string, unknown> = {
      ...(input.context ?? {}),
      engine: input.engine,
    };
    if (input.action) ctx.action = input.action;

    const busResult: RecordOutcomeResult = this.bus.record({
      domain: "speed_feed",
      kind: "recommendation_emitted",
      source: "system",
      lineage_id: input.lineageId,
      agent_id: input.agentId,
      context: ctx,
      recommended: { summary, raw: safeRecommended },
      confidence: input.confidence,
    });

    return {
      ok: busResult.ok,
      lineage_id: busResult.lineage_id,
      event_id: busResult.event_id,
      warning: busResult.warning,
      summary,
    };
  }
}

export const sfcOutcomeCaptureWireEngine = new SFCOutcomeCaptureWireEngine();
