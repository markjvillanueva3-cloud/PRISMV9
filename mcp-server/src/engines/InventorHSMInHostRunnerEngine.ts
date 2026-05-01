/**
 * InventorHSMInHostRunnerEngine — U-CAMTEST03
 * ============================================
 *
 * PHASE-8: PRISM-side companion for the Inventor HSM in-host iLogic VB
 * test runner (resources/inventor-hsm/PrismTestRunner.ivb). The iLogic
 * rule loads inside Autodesk Inventor (HSM Express / Pro), opens a
 * WebSocket to the PRISM CAMPluginCommunicationHub, and streams scenario
 * results back.
 *
 * Architecture mirrors HyperMillInHostRunnerEngine (U-CAMTEST01) and
 * Fusion360InHostRunnerEngine (U-CAMTEST02) — same scenario contract,
 * same 7 assertions — but pinned to target="inventor_hsm" with the
 * iLogic-runner endpoint. The four engines stay structurally aligned
 * so the U-CAMTEST15 results bridge can iterate them uniformly.
 *
 * The 7-assertion contract enforced here:
 *   1. frame_arrival           — observed count == expected_frame_count, no gaps/dupes
 *   2. latency_p99             — p99 latency ≤ descriptor.latency_p99_budget_ms
 *   3. band_transitions        — observed transitions == descriptor.expected_band_transitions
 *   4. hard_stop_trigger       — if deliberate, fires within HARD_STOP_BUDGET_FRAMES
 *                                of the first red-band frame; otherwise must not fire
 *   5. session_stats_reconcile — delivered+queued+dropped+unknown == frames_in
 *   6. encoder_schema          — every payload_valid is true
 *   7. reconnect_drain         — frames_dropped == 0
 *
 * @module engines/InventorHSMInHostRunnerEngine
 * @milestone CAM-EXHAUST-MS0 U-CAMTEST03
 *
 * WIRE-EXEMPT: dispatcher wiring deferred to a follow-up unit. The Mastercam
 * runner (U-CAMTEST04) will be added in the same wave, then the four
 * cam_inhost_*_{register,plan,summarize,stats,reset} action sets land in a
 * single dispatcher PR isolated from the engine surface. (The lint-staged
 * tsc gate cascades into pre-existing camDispatcher.ts transitive deps when
 * the dispatcher is in the same staged set as a new engine, blocking the
 * commit even when no new errors are introduced — splitting the wiring
 * commit avoids that cascade.)
 *
 * shared-pattern: HyperMillInHostRunnerEngine, Fusion360InHostRunnerEngine.
 */

import { z } from "zod";
import {
  CAMPluginCommunicationHubEngine,
  type HubPluginRegistration,
  type HubFrameEnvelope,
  type HubFrameType,
} from "./CAMPluginCommunicationHubEngine.js";

// Schemas

export const ScenarioCategorySchema = z.enum([
  "pocket_2d",
  "contour_2d",
  "drilling",
  "threading",
  "surface_3d",
  "multi_axis",
  "turning",
]);
export type ScenarioCategory = z.infer<typeof ScenarioCategorySchema>;

export const ScenarioDescriptorSchema = z.object({
  scenario_id: z.string().min(1),
  category: ScenarioCategorySchema,
  part_id: z.string().min(1),
  stock_id: z.string().min(1),
  material_id: z.string().min(1),
  tool_id: z.string().min(1),
  expected_frame_count: z.number().int().positive(),
  expected_band_transitions: z.number().int().nonnegative(),
  deliberate_hard_stop: z.boolean().default(false),
  latency_p99_budget_ms: z.number().positive().default(100),
});
export type ScenarioDescriptor = z.infer<typeof ScenarioDescriptorSchema>;

export const PlannedFrameSchema = z.object({
  seq: z.number().int().nonnegative(),
  frame_type: z.enum([
    "force", "chatter", "deflection", "thermal", "tool_life", "safety_score",
  ]),
  operation_id: z.string(),
});
export type PlannedFrame = z.infer<typeof PlannedFrameSchema>;

export const ScenarioPlanSchema = z.object({
  scenario_id: z.string(),
  plugin_id: z.string(),
  expected_frames: z.array(PlannedFrameSchema),
  descriptor: ScenarioDescriptorSchema,
});
export type ScenarioPlan = z.infer<typeof ScenarioPlanSchema>;

export const ObservedFrameSchema = z.object({
  seq: z.number().int().nonnegative(),
  frame_type: z.enum([
    "force", "chatter", "deflection", "thermal", "tool_life", "safety_score",
  ]),
  latency_ms: z.number().nonnegative(),
  hard_stop: z.boolean().default(false),
  band: z.number().int().min(0).max(2).default(0),
  payload_valid: z.boolean().default(true),
});
export type ObservedFrame = z.infer<typeof ObservedFrameSchema>;

export const ScenarioResultSchema = z.object({
  scenario_id: z.string(),
  plugin_id: z.string(),
  observed: z.array(ObservedFrameSchema),
  frames_in: z.number().int().nonnegative(),
  frames_delivered: z.number().int().nonnegative(),
  frames_queued: z.number().int().nonnegative(),
  frames_dropped: z.number().int().nonnegative(),
  frames_unknown_target: z.number().int().nonnegative(),
});
export type ScenarioResult = z.infer<typeof ScenarioResultSchema>;

export const AssertionNameSchema = z.enum([
  "frame_arrival",
  "latency_p99",
  "band_transitions",
  "hard_stop_trigger",
  "session_stats_reconcile",
  "encoder_schema",
  "reconnect_drain",
]);
export type AssertionName = z.infer<typeof AssertionNameSchema>;

export const AssertionResultSchema = z.object({
  name: AssertionNameSchema,
  pass: z.boolean(),
  detail: z.string(),
  metric: z.record(z.string(), z.number()).optional(),
});
export type AssertionResult = z.infer<typeof AssertionResultSchema>;

export const ScenarioSummarySchema = z.object({
  scenario_id: z.string(),
  plugin_id: z.string(),
  category: ScenarioCategorySchema,
  overall_pass: z.boolean(),
  frame_count: z.number().int().nonnegative(),
  latency_p99_ms: z.number().nonnegative(),
  band_transitions_observed: z.number().int().nonnegative(),
  hard_stop_at_seq: z.number().int().nullable(),
  assertions: z.array(AssertionResultSchema),
});
export type ScenarioSummary = z.infer<typeof ScenarioSummarySchema>;

export const RunnerStatsSchema = z.object({
  scenarios_planned: z.number().int().nonnegative(),
  scenarios_summarized: z.number().int().nonnegative(),
  scenarios_passed: z.number().int().nonnegative(),
  scenarios_failed: z.number().int().nonnegative(),
  total_frames_observed: z.number().int().nonnegative(),
});
export type RunnerStats = z.infer<typeof RunnerStatsSchema>;

// Constants (Inventor HSM specific)

export const INVENTOR_HSM_RUNNER_PLUGIN_ID = "inventor-hsm-inhost-runner";
export const INVENTOR_HSM_RUNNER_VERSION = "1.0.0";
export const INVENTOR_HSM_RUNNER_ENDPOINT = "ws://localhost:7421/inhost/inventor_hsm";
export const OVERLAY_TYPES_PER_SCENARIO = 6;
export const HARD_STOP_BUDGET_FRAMES = 3;

const OVERLAY_TYPES: HubFrameType[] = [
  "force",
  "chatter",
  "deflection",
  "thermal",
  "tool_life",
  "safety_score",
];

// Internal state

interface SessionTrack {
  stats: RunnerStats;
  plans: Map<string, ScenarioPlan>;
}

const tracks = new Map<string, SessionTrack>();

function makeEmptyStats(): RunnerStats {
  return {
    scenarios_planned: 0,
    scenarios_summarized: 0,
    scenarios_passed: 0,
    scenarios_failed: 0,
    total_frames_observed: 0,
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

// Helpers

export function buildRegistration(
  plugin_id: string = INVENTOR_HSM_RUNNER_PLUGIN_ID,
  version: string = INVENTOR_HSM_RUNNER_VERSION,
): HubPluginRegistration {
  return {
    plugin_id,
    target: "inventor_hsm",
    transport: "websocket",
    endpoint: INVENTOR_HSM_RUNNER_ENDPOINT,
    version,
    capabilities: [...OVERLAY_TYPES],
  };
}

export function p99(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil(0.99 * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

export function countBandTransitions(observed: ObservedFrame[]): number {
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

function firstHardStopSeq(observed: ObservedFrame[]): number | null {
  const sorted = [...observed].sort((a, b) => a.seq - b.seq);
  for (const f of sorted) if (f.hard_stop) return f.seq;
  return null;
}

function seqGaps(observed: ObservedFrame[]): { missing: number[]; duplicate: number[] } {
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

// Engine

export class InventorHSMInHostRunnerEngine {
  static readonly INVENTOR_HSM_RUNNER_PLUGIN_ID = INVENTOR_HSM_RUNNER_PLUGIN_ID;
  static readonly INVENTOR_HSM_RUNNER_VERSION = INVENTOR_HSM_RUNNER_VERSION;
  static readonly INVENTOR_HSM_RUNNER_ENDPOINT = INVENTOR_HSM_RUNNER_ENDPOINT;
  static readonly HARD_STOP_BUDGET_FRAMES = HARD_STOP_BUDGET_FRAMES;

  static register(plugin_id?: string, version?: string): HubPluginRegistration {
    const reg = buildRegistration(plugin_id, version);
    CAMPluginCommunicationHubEngine.register(reg);
    return reg;
  }

  static planScenario(
    session_id: string,
    descriptor: ScenarioDescriptor,
    plugin_id: string = INVENTOR_HSM_RUNNER_PLUGIN_ID,
  ): ScenarioPlan {
    const desc = ScenarioDescriptorSchema.parse(descriptor);
    if (desc.expected_frame_count % OVERLAY_TYPES_PER_SCENARIO !== 0) {
      throw new Error(
        `expected_frame_count must be a multiple of ${OVERLAY_TYPES_PER_SCENARIO} (one per overlay type)`,
      );
    }
    const perType = desc.expected_frame_count / OVERLAY_TYPES_PER_SCENARIO;
    const expected_frames: PlannedFrame[] = [];
    for (let i = 0; i < perType; i++) {
      for (const ft of OVERLAY_TYPES) {
        expected_frames.push({
          seq: expected_frames.length,
          frame_type: ft,
          operation_id: `${desc.scenario_id}-op`,
        });
      }
    }
    const plan: ScenarioPlan = {
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

  static frameToEnvelope(frame: PlannedFrame, payload: string = "{}"): HubFrameEnvelope {
    return {
      frame_type: frame.frame_type,
      target: "inventor_hsm",
      operation_id: frame.operation_id,
      payload,
      seq: frame.seq,
      hard_stop: false,
    };
  }

  static summarize(
    session_id: string,
    plan: ScenarioPlan,
    result: ScenarioResult,
  ): ScenarioSummary {
    const p = ScenarioPlanSchema.parse(plan);
    const r = ScenarioResultSchema.parse(result);
    const d = p.descriptor;

    const latencies = r.observed.map(o => o.latency_ms);
    const latency_p99_ms = p99(latencies);
    const bands_obs = countBandTransitions(r.observed);
    const hard_stop_at_seq = firstHardStopSeq(r.observed);
    const gaps = seqGaps(r.observed);

    const assertions: AssertionResult[] = [];

    const arrival_ok =
      r.observed.length === d.expected_frame_count &&
      gaps.missing.length === 0 &&
      gaps.duplicate.length === 0;
    assertions.push({
      name: "frame_arrival",
      pass: arrival_ok,
      detail: arrival_ok
        ? `observed ${r.observed.length} frames with no gaps`
        : `observed ${r.observed.length}/${d.expected_frame_count}; missing=${gaps.missing.length} dupes=${gaps.duplicate.length}`,
      metric: {
        observed: r.observed.length,
        expected: d.expected_frame_count,
        missing: gaps.missing.length,
        duplicate: gaps.duplicate.length,
      },
    });

    const latency_ok = latency_p99_ms <= d.latency_p99_budget_ms;
    assertions.push({
      name: "latency_p99",
      pass: latency_ok,
      detail: `p99 ${latency_p99_ms.toFixed(2)} ms vs budget ${d.latency_p99_budget_ms} ms`,
      metric: { p99_ms: latency_p99_ms, budget_ms: d.latency_p99_budget_ms },
    });

    const bands_ok = bands_obs === d.expected_band_transitions;
    assertions.push({
      name: "band_transitions",
      pass: bands_ok,
      detail: `observed ${bands_obs} vs expected ${d.expected_band_transitions}`,
      metric: { observed: bands_obs, expected: d.expected_band_transitions },
    });

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

    const encoder_ok = r.observed.every(o => o.payload_valid);
    const invalid_count = r.observed.filter(o => !o.payload_valid).length;
    assertions.push({
      name: "encoder_schema",
      pass: encoder_ok,
      detail: encoder_ok
        ? "every payload validated"
        : `${invalid_count} payload(s) failed schema validation`,
      metric: { invalid: invalid_count },
    });

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
    if (overall_pass) track.stats.scenarios_passed += 1;
    else track.stats.scenarios_failed += 1;

    return {
      scenario_id: p.scenario_id,
      plugin_id: p.plugin_id,
      category: d.category,
      overall_pass,
      frame_count: r.observed.length,
      latency_p99_ms,
      band_transitions_observed: bands_obs,
      hard_stop_at_seq,
      assertions,
    };
  }

  static getPlan(session_id: string, scenario_id: string): ScenarioPlan | null {
    const t = tracks.get(session_id);
    if (!t) return null;
    return t.plans.get(scenario_id) ?? null;
  }

  static getStats(session_id: string): RunnerStats {
    const t = tracks.get(session_id);
    if (!t) return makeEmptyStats();
    return { ...t.stats };
  }

  static resetSession(session_id: string): void {
    tracks.delete(session_id);
  }

  static resetAll(): void {
    tracks.clear();
  }
}

export const inventorHSMInHostRunnerEngine = InventorHSMInHostRunnerEngine;
