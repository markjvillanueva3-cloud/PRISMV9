/**
 * UniversalFeedbackCommandEngine — U-LEARN-01
 * ============================================
 *
 * High-level façade over OutcomeCaptureBusEngine that every studio / skill /
 * slash-command uses to report feedback in a single shape. Without this,
 * each surface (lathe-studio, wire-edm-studio, quote-review, shop-floor
 * scanner) would have to know the bus' lower-level envelope.
 *
 * Three convenience entry points cover > 95 % of real calls:
 *
 *   recordOverride({ domain, recommended, actual, context })
 *     — operator dialed away from an AI suggestion. Most common signal.
 *
 *   recordMeasurement({ domain, kind, actual, context })
 *     — post-run measurement: cycle_time, Ra, CMM result, FAI pass/fail.
 *
 *   recordScrap({ domain, reason, context })
 *     — part rejected. Severity escalates automatically to "high".
 *
 * A generic `record()` path is exposed for the remaining edge cases
 * (collision_avoided, chatter, quote_vs_actual etc.) so callers are never
 * stuck. Every path returns the same RecordOutcomeResult shape for
 * uniform error handling.
 *
 * Invariants:
 *   - lineage_id auto-generated if caller doesn't supply one
 *   - source inferred: no override → "system", with override → "operator"
 *   - all calls pass through OutcomeCaptureBusEngine → atomic JSONL shard
 *   - NEVER throws — bus signals errors via { ok: false, warning }
 *
 * @module engines/UniversalFeedbackCommandEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-01
 */

import { randomUUID } from "node:crypto";
import {
  outcomeCaptureBusEngine,
  type RecordOutcomeInput,
  type RecordOutcomeResult,
  OutcomeCaptureBusEngine,
} from "./OutcomeCaptureBusEngine.js";
import type {
  OutcomeDomainT,
  OutcomeKindT,
  OutcomeSourceT,
  OutcomeSeverityT,
} from "../schemas/outcomeEventSchema.js";

export interface OverrideInput {
  domain: OutcomeDomainT;
  recommended: unknown;
  actual: unknown;
  context?: Record<string, unknown>;
  lineage_id?: string;
  agent_id?: string;
  note?: string;
  confidence?: number;
}

export interface MeasurementInput {
  domain: OutcomeDomainT;
  kind: Extract<
    OutcomeKindT,
    | "cycle_time_measurement"
    | "surface_finish_ra"
    | "cmm_measurement"
    | "first_article_pass"
    | "first_article_fail"
  >;
  actual: unknown;
  context?: Record<string, unknown>;
  source?: OutcomeSourceT;    // defaults to "cmm" for cmm_measurement, "controller" for cycle_time
  lineage_id?: string;
  agent_id?: string;
  recommended?: unknown;      // optional — set when a prediction exists to calibrate against
  note?: string;
}

export interface ScrapInput {
  domain: OutcomeDomainT;
  reason: string;
  context?: Record<string, unknown>;
  lineage_id?: string;
  agent_id?: string;
  source?: OutcomeSourceT;
}

export interface RecommendationEmittedInput {
  domain: OutcomeDomainT;
  recommended: unknown;
  context?: Record<string, unknown>;
  agent_id?: string;
  /**
   * If omitted, a fresh lineage_id is minted and returned in the result so
   * the caller can thread it into the subsequent outcome event.
   */
  lineage_id?: string;
  note?: string;
  confidence?: number;
}

/**
 * UniversalFeedbackCommandEngine — singleton-by-default; class exposed so
 * tests can pass an alternate bus (e.g. a fresh tmp-rooted instance).
 */
export class UniversalFeedbackCommandEngine {
  private readonly bus: OutcomeCaptureBusEngine;

  constructor(bus: OutcomeCaptureBusEngine = outcomeCaptureBusEngine) {
    this.bus = bus;
  }

  /**
   * Record an operator override — the most common feedback signal.
   *
   * Severity auto-selects:
   *   - "info" when recommended/actual are within 10% (numeric) or equal
   *   - "medium" when they differ more than 10%
   *   - Override callers via input.note / severity can be set via record().
   */
  recordOverride(input: OverrideInput): RecordOutcomeResult {
    const severity = this.inferOverrideSeverity(input.recommended, input.actual);
    const delta = this.computeDelta(input.recommended, input.actual);
    return this.bus.record({
      domain: input.domain,
      kind: "operator_override",
      source: "operator",
      severity,
      lineage_id: input.lineage_id,
      agent_id: input.agent_id,
      context: input.context ?? {},
      recommended: input.recommended,
      actual: input.actual,
      delta,
      confidence: input.confidence,
      note: input.note,
    });
  }

  /**
   * Record a post-run measurement (cycle time, Ra, CMM, FAI).
   *
   * Source defaults:
   *   - cmm_measurement       → "cmm"
   *   - cycle_time_measurement → "controller"
   *   - surface_finish_ra     → "cmm"
   *   - first_article_*       → "operator"
   */
  recordMeasurement(input: MeasurementInput): RecordOutcomeResult {
    const source = input.source ?? this.defaultSourceForMeasurement(input.kind);
    const severity = input.kind === "first_article_fail" ? "high" : "info";
    const delta =
      input.recommended !== undefined
        ? this.computeDelta(input.recommended, input.actual)
        : undefined;
    return this.bus.record({
      domain: input.domain,
      kind: input.kind,
      source,
      severity,
      lineage_id: input.lineage_id,
      agent_id: input.agent_id,
      context: input.context ?? {},
      recommended: input.recommended,
      actual: input.actual,
      delta,
      note: input.note,
    });
  }

  /**
   * Record a scrap / rejection event. Severity is always "high" — scrap
   * drives the loss-learning path; consumers must not silently ignore it.
   */
  recordScrap(input: ScrapInput): RecordOutcomeResult {
    return this.bus.record({
      domain: input.domain,
      kind: "scrap_event",
      source: input.source ?? "operator",
      severity: "high",
      lineage_id: input.lineage_id,
      agent_id: input.agent_id,
      context: input.context ?? {},
      note: input.reason,
    });
  }

  /**
   * Announce that an AI recommendation was emitted. Returns a fresh
   * lineage_id if caller didn't supply one so downstream outcome events
   * (override, measurement, scrap) can tie back to the originating
   * recommendation.
   */
  recordRecommendationEmitted(
    input: RecommendationEmittedInput,
  ): RecordOutcomeResult {
    const lineage_id = input.lineage_id ?? randomUUID();
    return this.bus.record({
      domain: input.domain,
      kind: "recommendation_emitted",
      source: "system",
      severity: "info",
      lineage_id,
      agent_id: input.agent_id,
      context: input.context ?? {},
      recommended: input.recommended,
      confidence: input.confidence,
      note: input.note,
    });
  }

  /**
   * Generic escape hatch — exposes the full bus envelope for kinds not
   * covered by the convenience methods (collision_avoided, chatter_event,
   * quote_vs_actual, post_editor_edit, ...).
   */
  record(input: RecordOutcomeInput): RecordOutcomeResult {
    return this.bus.record(input);
  }

  /**
   * Query the bus for feedback events matching a filter. Thin passthrough
   * so callers don't need a second import.
   */
  query(filter: Parameters<OutcomeCaptureBusEngine["query"]>[0]) {
    return this.bus.query(filter);
  }

  /**
   * Health stats — per-domain event counts + retry queue size.
   */
  stats() {
    return this.bus.stats();
  }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------

  private defaultSourceForMeasurement(kind: OutcomeKindT): OutcomeSourceT {
    switch (kind) {
      case "cmm_measurement":
      case "surface_finish_ra":
        return "cmm";
      case "cycle_time_measurement":
        return "controller";
      case "first_article_pass":
      case "first_article_fail":
        return "operator";
      default:
        return "system";
    }
  }

  private inferOverrideSeverity(
    recommended: unknown,
    actual: unknown,
  ): OutcomeSeverityT {
    const a = this.toNumber(recommended);
    const b = this.toNumber(actual);
    if (a === null || b === null) return "info";
    if (a === 0) return b === 0 ? "info" : "medium";
    const deltaPct = Math.abs((b - a) / a);
    if (deltaPct <= 0.10) return "info";
    if (deltaPct <= 0.25) return "medium";
    return "high";
  }

  private computeDelta(recommended: unknown, actual: unknown): unknown {
    const a = this.toNumber(recommended);
    const b = this.toNumber(actual);
    if (a === null || b === null) return undefined;
    return { absolute: b - a, relative: a === 0 ? null : (b - a) / a };
  }

  private toNumber(v: unknown): number | null {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
    if (v && typeof v === "object") {
      // Common shape: { value: 95, unit: "sfm" } — prefer numeric "value"
      const val = (v as { value?: unknown }).value;
      if (typeof val === "number" && Number.isFinite(val)) return val;
    }
    return null;
  }

  /**
   * Self-awareness metadata. Consumed by CapabilityIndex.
   */
  static getSelfAwareness() {
    return {
      name: "UniversalFeedbackCommandEngine",
      version: "1.0.0",
      milestone: "PSAU P2.5-LEARN U-LEARN-01",
      capabilities: [
        "recordOverride",
        "recordMeasurement",
        "recordScrap",
        "recordRecommendationEmitted",
        "record",
        "query",
        "stats",
      ],
      dependencies: ["OutcomeCaptureBusEngine", "outcomeEventSchema"],
      dataSourcesUsed: ["state/outcomes/*.jsonl"],
    };
  }
}

export const universalFeedbackCommandEngine = new UniversalFeedbackCommandEngine();
