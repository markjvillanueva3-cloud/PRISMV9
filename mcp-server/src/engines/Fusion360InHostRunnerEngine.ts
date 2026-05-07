/**
 * Fusion360InHostRunnerEngine — U-CAMTEST02
 * ==========================================
 *
 * PHASE-8: PRISM-side companion for the Fusion 360 JavaScript Add-In
 * test runner (resources/fusion360/prism-test-runner/index.js). The
 * Add-In loads inside Fusion 360 via the `adsk.fusion` API, registers
 * with the PRISM Plugin Communication Hub over WebSocket + JSON-RPC 2.0,
 * and streams scenario + assertion results back here.
 *
 * Unlike U-CAMTEST01 (hyperMILL — XML-RPC), the Fusion 360 transport is
 * JSON-RPC 2.0. This engine therefore enforces JSON-RPC shape on every
 * outgoing envelope in addition to the 7-family assertion contract
 * shared across all four host runners.
 *
 * Fusion-specific descriptor axes (the "exhaust input possibilities"
 * directive from the goal tracker maps to these):
 *
 *   1. setup_type         — milling | turning | inspection
 *   2. wcs_mode           — model_origin | stock_top | stock_point
 *   3. stock_strategy     — from_brep | relative_size_box | fixed_size_box
 *   4. coolant_strategy   — flood | mist | air | through_tool | none
 *   5. post_dialect       — haas | fanuc | okuma | mazak | mitsubishi |
 *                           siemens | heidenhain | generic
 *   6. tool_length_source — measured | estimated | offset_table
 *
 * Each axis can move independently; the scenario generator (U-CAMTEST08+)
 * enumerates the Cartesian product up to the 900-scenario budget.
 *
 * @module engines/Fusion360InHostRunnerEngine
 * @milestone CAM-EXHAUST-MS0 U-CAMTEST02
 */

import { z } from "zod";
import {
  CAMPluginCommunicationHubEngine,
  type HubPluginRegistration,
  type HubFrameEnvelope,
  type HubFrameType,
} from "./CAMPluginCommunicationHubEngine.js";

// ── Schemas (Fusion-specific configuration axes) ─────────────────────────────

export const FusionSetupTypeSchema = z.enum(["milling", "turning", "inspection"]);
export type FusionSetupType = z.infer<typeof FusionSetupTypeSchema>;

export const FusionWCSModeSchema = z.enum(["model_origin", "stock_top", "stock_point"]);
export type FusionWCSMode = z.infer<typeof FusionWCSModeSchema>;

export const FusionStockStrategySchema = z.enum([
  "from_brep",
  "relative_size_box",
  "fixed_size_box",
]);
export type FusionStockStrategy = z.infer<typeof FusionStockStrategySchema>;

export const FusionCoolantStrategySchema = z.enum([
  "flood",
  "mist",
  "air",
  "through_tool",
  "none",
]);
export type FusionCoolantStrategy = z.infer<typeof FusionCoolantStrategySchema>;

export const FusionPostDialectSchema = z.enum([
  "haas",
  "fanuc",
  "okuma",
  "mazak",
  "mitsubishi",
  "siemens",
  "heidenhain",
  "generic",
]);
export type FusionPostDialect = z.infer<typeof FusionPostDialectSchema>;

export const FusionToolLengthSourceSchema = z.enum([
  "measured",
  "estimated",
  "offset_table",
]);
export type FusionToolLengthSource = z.infer<typeof FusionToolLengthSourceSchema>;

export const FusionScenarioCategorySchema = z.enum([
  "pocket_2d",
  "contour_2d",
  "drilling",
  "threading",
  "surface_3d",
  "multi_axis",
  "turning",
]);
export type FusionScenarioCategory = z.infer<typeof FusionScenarioCategorySchema>;

export const FusionScenarioDescriptorSchema = z.object({
  scenario_id: z.string().min(1),
  category: FusionScenarioCategorySchema,
  part_id: z.string().min(1),
  stock_id: z.string().min(1),
  material_id: z.string().min(1),
  tool_id: z.string().min(1),
  // Fusion-specific axes
  setup_type: FusionSetupTypeSchema,
  wcs_mode: FusionWCSModeSchema.default("model_origin"),
  stock_strategy: FusionStockStrategySchema.default("from_brep"),
  coolant_strategy: FusionCoolantStrategySchema.default("flood"),
  post_dialect: FusionPostDialectSchema.default("generic"),
  tool_length_source: FusionToolLengthSourceSchema.default("measured"),
  // Shared assertion inputs
  expected_frame_count: z.number().int().positive(),
  expected_band_transitions: z.number().int().nonnegative(),
  deliberate_hard_stop: z.boolean().default(false),
  latency_p99_budget_ms: z.number().positive().default(100),
});
export type FusionScenarioDescriptor = z.infer<typeof FusionScenarioDescriptorSchema>;

export const FusionPlannedFrameSchema = z.object({
  seq: z.number().int().nonnegative(),
  frame_type: z.enum([
    "force", "chatter", "deflection", "thermal", "tool_life", "safety_score",
  ]),
  operation_id: z.string(),
  /** The JSON-RPC 2.0 method name this frame's payload will use. */
  rpc_method: z.string(),
});
export type FusionPlannedFrame = z.infer<typeof FusionPlannedFrameSchema>;

export const FusionScenarioPlanSchema = z.object({
  scenario_id: z.string(),
  plugin_id: z.string(),
  expected_frames: z.array(FusionPlannedFrameSchema),
  descriptor: FusionScenarioDescriptorSchema,
});
export type FusionScenarioPlan = z.infer<typeof FusionScenarioPlanSchema>;

export const FusionObservedFrameSchema = z.object({
  seq: z.number().int().nonnegative(),
  frame_type: z.enum([
    "force", "chatter", "deflection", "thermal", "tool_life", "safety_score",
  ]),
  latency_ms: z.number().nonnegative(),
  hard_stop: z.boolean().default(false),
  band: z.number().int().min(0).max(2).default(0),
  payload_valid: z.boolean().default(true),
  /** The JSON-RPC 2.0 envelope string actually sent on the wire. */
  rpc_envelope: z.string().min(1),
});
export type FusionObservedFrame = z.infer<typeof FusionObservedFrameSchema>;

export const FusionScenarioResultSchema = z.object({
  scenario_id: z.string(),
  plugin_id: z.string(),
  observed: z.array(FusionObservedFrameSchema),
  frames_in: z.number().int().nonnegative(),
  frames_delivered: z.number().int().nonnegative(),
  frames_queued: z.number().int().nonnegative(),
  frames_dropped: z.number().int().nonnegative(),
  frames_unknown_target: z.number().int().nonnegative(),
});
export type FusionScenarioResult = z.infer<typeof FusionScenarioResultSchema>;

export const FusionAssertionNameSchema = z.enum([
  "frame_arrival",
  "latency_p99",
  "band_transitions",
  "hard_stop_trigger",
  "session_stats_reconcile",
  "jsonrpc_envelope_valid", // Fusion-specific: enforce JSON-RPC 2.0 shape
  "reconnect_drain",
]);
export type FusionAssertionName = z.infer<typeof FusionAssertionNameSchema>;

export const FusionAssertionResultSchema = z.object({
  name: FusionAssertionNameSchema,
  pass: z.boolean(),
  detail: z.string(),
  metric: z.record(z.string(), z.number()).optional(),
});
export type FusionAssertionResult = z.infer<typeof FusionAssertionResultSchema>;

export const FusionScenarioSummarySchema = z.object({
  scenario_id: z.string(),
  plugin_id: z.string(),
  category: FusionScenarioCategorySchema,
  setup_type: FusionSetupTypeSchema,
  post_dialect: FusionPostDialectSchema,
  overall_pass: z.boolean(),
  frame_count: z.number().int().nonnegative(),
  latency_p99_ms: z.number().nonnegative(),
  band_transitions_observed: z.number().int().nonnegative(),
  hard_stop_at_seq: z.number().int().nullable(),
  assertions: z.array(FusionAssertionResultSchema),
});
export type FusionScenarioSummary = z.infer<typeof FusionScenarioSummarySchema>;

export const FusionRunnerStatsSchema = z.object({
  scenarios_planned: z.number().int().nonnegative(),
  scenarios_summarized: z.number().int().nonnegative(),
  scenarios_passed: z.number().int().nonnegative(),
  scenarios_failed: z.number().int().nonnegative(),
  total_frames_observed: z.number().int().nonnegative(),
  per_dialect_count: z.record(FusionPostDialectSchema, z.number()),
});
export type FusionRunnerStats = z.infer<typeof FusionRunnerStatsSchema>;

// ── Constants ────────────────────────────────────────────────────────────────

export const FUSION_RUNNER_PLUGIN_ID = "fusion360-inhost-runner";
export const FUSION_RUNNER_VERSION = "1.0.0";
export const OVERLAY_TYPES_PER_SCENARIO = 6;
export const HARD_STOP_BUDGET_FRAMES = 3;

/** JSON-RPC 2.0 methods emitted by the Fusion runner, one per overlay type. */
export const FUSION_RPC_METHODS = {
  force: "cam.overlayForce",
  chatter: "cam.overlayChatter",
  deflection: "cam.overlayDeflection",
  thermal: "cam.overlayThermal",
  tool_life: "cam.overlayToolLife",
  safety_score: "cam.overlaySafetyScore",
} as const satisfies Record<HubFrameType, string>;

const OVERLAY_TYPES: HubFrameType[] = [
  "force", "chatter", "deflection", "thermal", "tool_life", "safety_score",
];

const ALL_POST_DIALECTS: FusionPostDialect[] = [
  "haas", "fanuc", "okuma", "mazak", "mitsubishi", "siemens", "heidenhain", "generic",
];

// ── Internal state ───────────────────────────────────────────────────────────

interface SessionTrack {
  stats: FusionRunnerStats;
  plans: Map<string, FusionScenarioPlan>;
}

const tracks = new Map<string, SessionTrack>();

function makeEmptyStats(): FusionRunnerStats {
  const per_dialect_count: Record<FusionPostDialect, number> = {
    haas: 0, fanuc: 0, okuma: 0, mazak: 0,
    mitsubishi: 0, siemens: 0, heidenhain: 0, generic: 0,
  };
  return {
    scenarios_planned: 0,
    scenarios_summarized: 0,
    scenarios_passed: 0,
    scenarios_failed: 0,
    total_frames_observed: 0,
    per_dialect_count,
  };
}

function ensureTrack(session_id: string): SessionTrack {
  let t = tracks.get(session_id);
  if (!t) {
    t = { stats: makeEmptyStats(), plans: new Map() };
    tracks.set(session_id, t);
  }
  return t;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function buildRegistration(
  plugin_id: string = FUSION_RUNNER_PLUGIN_ID,
  version: string = FUSION_RUNNER_VERSION,
): HubPluginRegistration {
  return {
    plugin_id,
    target: "fusion360",
    transport: "websocket",
    endpoint: "ws://localhost:7421/inhost/fusion360",
    version,
    capabilities: [...OVERLAY_TYPES],
  };
}

/** Nearest-rank p99 — matches the hyperMILL implementation so runner
 *  results are comparable across hosts. */
export function p99(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil(0.99 * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

export function countBandTransitions(observed: FusionObservedFrame[]): number {
  if (observed.length < 2) return 0;
  const sorted = [...observed].sort((a, b) => a.seq - b.seq);
  let transitions = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].band === 0 ? 0 : 1;
    const curr = sorted[i].band === 0 ? 0 : 1;
    if (prev !== curr) transitions += 1;
  }
  return transitions;
}

function firstHardStopSeq(observed: FusionObservedFrame[]): number | null {
  const sorted = [...observed].sort((a, b) => a.seq - b.seq);
  for (const f of sorted) if (f.hard_stop) return f.seq;
  return null;
}

function seqGaps(observed: FusionObservedFrame[]): { missing: number[]; duplicate: number[] } {
  const missing: number[] = [];
  const duplicate: number[] = [];
  if (observed.length === 0) return { missing, duplicate };
  const sorted = [...observed].sort((a, b) => a.seq - b.seq);
  const seen = new Set<number>();
  for (const f of sorted) {
    if (seen.has(f.seq)) duplicate.push(f.seq);
    seen.add(f.seq);
  }
  const min = sorted[0].seq;
  const max = sorted[sorted.length - 1].seq;
  for (let s = min; s <= max; s++) if (!seen.has(s)) missing.push(s);
  return { missing, duplicate };
}

/** Strict JSON-RPC 2.0 envelope validator. */
export function isValidJsonRpcEnvelope(s: string): boolean {
  let obj: unknown;
  try {
    obj = JSON.parse(s);
  } catch {
    return false;
  }
  if (obj === null || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  if (o.jsonrpc !== "2.0") return false;
  if (typeof o.method !== "string" || (o.method as string).length === 0) return false;
  if (!("params" in o)) return false;
  return true;
}

/** Encode an overlay frame as a JSON-RPC 2.0 envelope string. */
export function encodeJsonRpcEnvelope(
  frame_type: HubFrameType,
  operation_id: string,
  seq: number,
  payload: unknown = {},
): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    method: FUSION_RPC_METHODS[frame_type],
    params: {
      operationId: operation_id,
      seq,
      payload,
    },
  });
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class Fusion360InHostRunnerEngine {
  static readonly FUSION_RUNNER_PLUGIN_ID = FUSION_RUNNER_PLUGIN_ID;
  static readonly FUSION_RUNNER_VERSION = FUSION_RUNNER_VERSION;
  static readonly HARD_STOP_BUDGET_FRAMES = HARD_STOP_BUDGET_FRAMES;
  static readonly FUSION_RPC_METHODS = FUSION_RPC_METHODS;
  static readonly SUPPORTED_POST_DIALECTS: readonly FusionPostDialect[] = ALL_POST_DIALECTS;

  static register(plugin_id?: string, version?: string): HubPluginRegistration {
    const reg = buildRegistration(plugin_id, version);
    CAMPluginCommunicationHubEngine.register(reg);
    return reg;
  }

  static supportedSetupTypes(): FusionSetupType[] {
    return ["milling", "turning", "inspection"];
  }

  static supportedWCSModes(): FusionWCSMode[] {
    return ["model_origin", "stock_top", "stock_point"];
  }

  static supportedStockStrategies(): FusionStockStrategy[] {
    return ["from_brep", "relative_size_box", "fixed_size_box"];
  }

  static supportedCoolantStrategies(): FusionCoolantStrategy[] {
    return ["flood", "mist", "air", "through_tool", "none"];
  }

  static supportedPostDialects(): FusionPostDialect[] {
    return [...ALL_POST_DIALECTS];
  }

  static supportedToolLengthSources(): FusionToolLengthSource[] {
    return ["measured", "estimated", "offset_table"];
  }

  static planScenario(
    session_id: string,
    descriptor: FusionScenarioDescriptor,
    plugin_id: string = FUSION_RUNNER_PLUGIN_ID,
  ): FusionScenarioPlan {
    const desc = FusionScenarioDescriptorSchema.parse(descriptor);
    if (desc.expected_frame_count % OVERLAY_TYPES_PER_SCENARIO !== 0) {
      throw new Error(
        `expected_frame_count must be a multiple of ${OVERLAY_TYPES_PER_SCENARIO}`,
      );
    }
    // Turning setups must use turning category; milling inverse.
    if (desc.setup_type === "turning" && desc.category !== "turning") {
      throw new Error(`setup_type=turning requires category=turning (got ${desc.category})`);
    }
    if (desc.setup_type === "milling" && desc.category === "turning") {
      throw new Error(`category=turning requires setup_type=turning (got ${desc.setup_type})`);
    }

    const perType = desc.expected_frame_count / OVERLAY_TYPES_PER_SCENARIO;
    const expected_frames: FusionPlannedFrame[] = [];
    for (let i = 0; i < perType; i++) {
      for (const ft of OVERLAY_TYPES) {
        expected_frames.push({
          seq: expected_frames.length,
          frame_type: ft,
          operation_id: `${desc.scenario_id}-op`,
          rpc_method: FUSION_RPC_METHODS[ft],
        });
      }
    }
    const plan: FusionScenarioPlan = {
      scenario_id: desc.scenario_id,
      plugin_id,
      expected_frames,
      descriptor: desc,
    };
    const track = ensureTrack(session_id);
    track.plans.set(desc.scenario_id, plan);
    track.stats.scenarios_planned += 1;
    return plan;
  }

  static frameToEnvelope(
    frame: FusionPlannedFrame,
    payload: unknown = {},
  ): HubFrameEnvelope {
    return {
      frame_type: frame.frame_type,
      target: "fusion360",
      operation_id: frame.operation_id,
      payload: encodeJsonRpcEnvelope(frame.frame_type, frame.operation_id, frame.seq, payload),
      seq: frame.seq,
      hard_stop: false,
    };
  }

  static summarize(
    session_id: string,
    plan: FusionScenarioPlan,
    result: FusionScenarioResult,
  ): FusionScenarioSummary {
    const p = FusionScenarioPlanSchema.parse(plan);
    const r = FusionScenarioResultSchema.parse(result);
    const d = p.descriptor;

    const latencies = r.observed.map(o => o.latency_ms);
    const latency_p99_ms = p99(latencies);
    const bands_obs = countBandTransitions(r.observed);
    const hard_stop_at_seq = firstHardStopSeq(r.observed);
    const gaps = seqGaps(r.observed);

    const assertions: FusionAssertionResult[] = [];

    // 1. frame_arrival
    const arrival_ok =
      r.observed.length === d.expected_frame_count &&
      gaps.missing.length === 0 &&
      gaps.duplicate.length === 0;
    assertions.push({
      name: "frame_arrival",
      pass: arrival_ok,
      detail: arrival_ok
        ? `observed ${r.observed.length} frames`
        : `observed ${r.observed.length}/${d.expected_frame_count}; missing=${gaps.missing.length} dupes=${gaps.duplicate.length}`,
      metric: {
        observed: r.observed.length,
        expected: d.expected_frame_count,
        missing: gaps.missing.length,
        duplicate: gaps.duplicate.length,
      },
    });

    // 2. latency_p99
    const latency_ok = latency_p99_ms <= d.latency_p99_budget_ms;
    assertions.push({
      name: "latency_p99",
      pass: latency_ok,
      detail: `p99 ${latency_p99_ms.toFixed(2)} ms vs budget ${d.latency_p99_budget_ms} ms`,
      metric: { p99_ms: latency_p99_ms, budget_ms: d.latency_p99_budget_ms },
    });

    // 3. band_transitions
    const bands_ok = bands_obs === d.expected_band_transitions;
    assertions.push({
      name: "band_transitions",
      pass: bands_ok,
      detail: `observed ${bands_obs} vs expected ${d.expected_band_transitions}`,
      metric: { observed: bands_obs, expected: d.expected_band_transitions },
    });

    // 4. hard_stop_trigger
    let hs_ok = true;
    let hs_detail = "";
    if (d.deliberate_hard_stop) {
      if (hard_stop_at_seq === null) {
        hs_ok = false;
        hs_detail = "deliberate violation set but no hard_stop observed";
      } else {
        const sorted = [...r.observed].sort((a, b) => a.seq - b.seq);
        const firstRed = sorted.find(f => f.band === 2);
        const triggerDistance =
          firstRed === undefined ? 0 : hard_stop_at_seq - firstRed.seq;
        hs_ok = firstRed !== undefined && triggerDistance >= 0 &&
          triggerDistance <= HARD_STOP_BUDGET_FRAMES;
        hs_detail = firstRed === undefined
          ? `hard_stop observed but no red band precedes it`
          : `hard_stop at seq ${hard_stop_at_seq}, first red at seq ${firstRed.seq}, distance ${triggerDistance}`;
      }
    } else {
      hs_ok = hard_stop_at_seq === null;
      hs_detail = hs_ok
        ? "no hard_stop observed (as expected)"
        : `unexpected hard_stop at seq ${hard_stop_at_seq}`;
    }
    assertions.push({ name: "hard_stop_trigger", pass: hs_ok, detail: hs_detail });

    // 5. session_stats_reconcile
    const sum = r.frames_delivered + r.frames_queued + r.frames_dropped + r.frames_unknown_target;
    const stats_ok = sum === r.frames_in;
    assertions.push({
      name: "session_stats_reconcile",
      pass: stats_ok,
      detail: `delivered+queued+dropped+unknown = ${sum}, frames_in = ${r.frames_in}`,
      metric: {
        in: r.frames_in,
        delivered: r.frames_delivered,
        queued: r.frames_queued,
        dropped: r.frames_dropped,
        unknown: r.frames_unknown_target,
      },
    });

    // 6. jsonrpc_envelope_valid — every observed frame's rpc_envelope must
    //    be a well-formed JSON-RPC 2.0 envelope AND its method must match
    //    the frame_type.
    let envelope_ok = true;
    let envelope_invalid = 0;
    for (const o of r.observed) {
      if (!o.payload_valid) {
        envelope_ok = false;
        envelope_invalid += 1;
        continue;
      }
      if (!isValidJsonRpcEnvelope(o.rpc_envelope)) {
        envelope_ok = false;
        envelope_invalid += 1;
        continue;
      }
      const parsed = JSON.parse(o.rpc_envelope) as { method: string };
      if (parsed.method !== FUSION_RPC_METHODS[o.frame_type]) {
        envelope_ok = false;
        envelope_invalid += 1;
      }
    }
    assertions.push({
      name: "jsonrpc_envelope_valid",
      pass: envelope_ok,
      detail: envelope_ok
        ? "every envelope matched JSON-RPC 2.0 shape and method"
        : `${envelope_invalid} envelope(s) failed schema or method check`,
      metric: { invalid: envelope_invalid },
    });

    // 7. reconnect_drain
    const drain_ok = r.frames_dropped === 0;
    assertions.push({
      name: "reconnect_drain",
      pass: drain_ok,
      detail: drain_ok ? "no frames dropped" : `${r.frames_dropped} frames dropped`,
      metric: { dropped: r.frames_dropped },
    });

    const overall_pass = assertions.every(a => a.pass);

    const track = ensureTrack(session_id);
    track.stats.scenarios_summarized += 1;
    track.stats.total_frames_observed += r.observed.length;
    track.stats.per_dialect_count[d.post_dialect] += 1;
    if (overall_pass) track.stats.scenarios_passed += 1;
    else track.stats.scenarios_failed += 1;

    return {
      scenario_id: p.scenario_id,
      plugin_id: p.plugin_id,
      category: d.category,
      setup_type: d.setup_type,
      post_dialect: d.post_dialect,
      overall_pass,
      frame_count: r.observed.length,
      latency_p99_ms,
      band_transitions_observed: bands_obs,
      hard_stop_at_seq,
      assertions,
    };
  }

  static getPlan(session_id: string, scenario_id: string): FusionScenarioPlan | null {
    const t = tracks.get(session_id);
    if (!t) return null;
    return t.plans.get(scenario_id) ?? null;
  }

  static getStats(session_id: string): FusionRunnerStats {
    const t = tracks.get(session_id);
    if (!t) return makeEmptyStats();
    return {
      ...t.stats,
      per_dialect_count: { ...t.stats.per_dialect_count },
    };
  }

  static resetSession(session_id: string): void {
    tracks.delete(session_id);
  }

  static resetAll(): void {
    tracks.clear();
  }
}

export const fusion360InHostRunnerEngine = Fusion360InHostRunnerEngine;
