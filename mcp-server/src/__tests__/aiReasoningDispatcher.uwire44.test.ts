/**
 * aiReasoningDispatcher U-WIRE44 round-trip tests — SimulationStallDetectorEngine.
 *
 * Validates 8 sim-stall-detector actions through prism_ai. Symmetric to
 * U-WIRE43 (PrintMatchStallDetector) but with simulation-pipeline stages
 * (gcode_parse, kinematics, collision_check, physics_validate, finalize).
 * No special candidate_review stage - all priority calculations use the
 * standard machine-time formula (r>6 critical, r>3 high, r>1.5 medium).
 *
 * Engine internals (verified):
 *   - Stall budgets: gcode_parse=5s, kinematics=10s, collision_check=30s,
 *     physics_validate=20s, finalize=5s.
 *   - Same lifecycle invariants as U-WIRE43 (strict > budget; throws on
 *     duplicate, missing, stage mismatch).
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE44
 */

import { describe, it, expect, beforeEach } from "vitest";
import { simulationStallDetectorEngine } from "../engines/SimulationStallDetectorEngine.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
  type AIReasoningAction,
} from "../schemas/aiReasoningActionSchemas.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

const NEW_ACTIONS = [
  "sim_stall_start_tracking", "sim_stall_mark_progress", "sim_stall_advance_stage", "sim_stall_complete_job",
  "sim_stall_scan", "sim_stall_scan_one", "sim_stall_stats", "sim_stall_clear",
] as const;

// Sim stage budgets (must match SIM_STAGE_BUDGET_MS in engine source).
const GCODE_PARSE_BUDGET_MS = 5_000;
const KINEMATICS_BUDGET_MS = 10_000;
const COLLISION_CHECK_BUDGET_MS = 30_000;
const PHYSICS_VALIDATE_BUDGET_MS = 20_000;
const FINALIZE_BUDGET_MS = 5_000;
// Test clock anchor.
const T0 = 1_000_000;
const T_PLUS_1S = T0 + 1_000;
// Priority offsets for gcode_parse (5s budget).
const GCODE_LOW_OFFSET = GCODE_PARSE_BUDGET_MS + 1;       // r ~= 1.0002
const GCODE_MEDIUM_OFFSET = GCODE_PARSE_BUDGET_MS * 2;    // r = 2 → medium
const GCODE_HIGH_OFFSET = GCODE_PARSE_BUDGET_MS * 4;      // r = 4 → high
const GCODE_CRITICAL_OFFSET = GCODE_PARSE_BUDGET_MS * 7;  // r = 7 → critical

describe("U-WIRE44 — engine direct: SimulationStallDetectorEngine", () => {
  beforeEach(() => {
    simulationStallDetectorEngine.clear();
  });

  it("startTracking adds job; trackedIds reflects it", () => {
    simulationStallDetectorEngine.startTracking("sim-1", "gcode_parse", T0, { program: "OP100" });
    const ids = simulationStallDetectorEngine.trackedIds();
    expect(ids.length).toBe(1);
    expect(ids[0]).toBe("sim-1");
  });

  it("startTracking throws on empty job_id (failure mode)", () => {
    expect(() => simulationStallDetectorEngine.startTracking("", "gcode_parse", T0)).toThrow(/job_id/);
  });

  it("startTracking throws on unknown stage (failure mode)", () => {
    expect(() =>
      // @ts-expect-error - testing the runtime guard
      simulationStallDetectorEngine.startTracking("sim-x", "imaginary_stage", T0),
    ).toThrow(/Unknown simulation stage/);
  });

  it("startTracking throws on duplicate job_id (failure mode)", () => {
    simulationStallDetectorEngine.startTracking("dup", "kinematics", T0);
    expect(() => simulationStallDetectorEngine.startTracking("dup", "kinematics", T0)).toThrow(/already tracked/);
  });

  it("markProgress throws if job not tracked (failure mode)", () => {
    expect(() => simulationStallDetectorEngine.markProgress("ghost", T0)).toThrow(/not tracked/);
  });

  it("markProgress resets stall clock (no longer stalled after progress)", () => {
    simulationStallDetectorEngine.startTracking("j1", "gcode_parse", T0);
    expect(simulationStallDetectorEngine.scan(T0 + GCODE_LOW_OFFSET).length).toBe(1);
    simulationStallDetectorEngine.markProgress("j1", T0 + GCODE_LOW_OFFSET);
    expect(simulationStallDetectorEngine.scan(T0 + GCODE_LOW_OFFSET + 1).length).toBe(0);
  });

  it("advanceStage throws on stage mismatch (failure mode)", () => {
    simulationStallDetectorEngine.startTracking("j2", "gcode_parse", T0);
    expect(() =>
      simulationStallDetectorEngine.advanceStage("j2", "kinematics", "collision_check", T_PLUS_1S),
    ).toThrow(/advance mismatch/);
  });

  it("advanceStage moves job + resets clock against new stage budget", () => {
    simulationStallDetectorEngine.startTracking("j3", "gcode_parse", T0);
    simulationStallDetectorEngine.advanceStage("j3", "gcode_parse", "kinematics", T_PLUS_1S);
    // After advance, kinematics budget = 10s. T_PLUS_1S + 11s exceeds.
    const events = simulationStallDetectorEngine.scan(T_PLUS_1S + KINEMATICS_BUDGET_MS + 1);
    expect(events.length).toBe(1);
    expect(events[0].stage).toBe("kinematics");
    expect(events[0].budget_ms).toBe(KINEMATICS_BUDGET_MS);
  });

  it("completeJob removes the job; second call returns false", () => {
    simulationStallDetectorEngine.startTracking("j4", "kinematics", T0);
    expect(simulationStallDetectorEngine.completeJob("j4")).toBe(true);
    expect(simulationStallDetectorEngine.completeJob("j4")).toBe(false);
    expect(simulationStallDetectorEngine.trackedIds().length).toBe(0);
  });

  it("scan returns empty array when no jobs are stalled", () => {
    simulationStallDetectorEngine.startTracking("j5", "gcode_parse", T0);
    expect(simulationStallDetectorEngine.scan(T0 + 1).length).toBe(0);
  });

  it("scan sorts events by stalled_for_ms descending", () => {
    simulationStallDetectorEngine.startTracking("most", "gcode_parse", T0);
    simulationStallDetectorEngine.startTracking("least", "gcode_parse", T0 + 2_000);
    // At T0+15s: most stalled 15s, least stalled 13s. Both > 5s budget.
    const events = simulationStallDetectorEngine.scan(T0 + GCODE_PARSE_BUDGET_MS + 10_000);
    expect(events.length).toBe(2);
    expect(events[0].stalled_for_ms).toBeGreaterThan(events[1].stalled_for_ms);
    expect(events[0].job_id).toBe("most");
  });

  it("scan event has stalled_for_ms, budget_ms, priority, recommended_action populated", () => {
    simulationStallDetectorEngine.startTracking("j6", "kinematics", T0);
    const events = simulationStallDetectorEngine.scan(T0 + KINEMATICS_BUDGET_MS + 1);
    expect(events.length).toBe(1);
    const e = events[0];
    expect(e.stalled_for_ms).toBe(KINEMATICS_BUDGET_MS + 1);
    expect(e.budget_ms).toBe(KINEMATICS_BUDGET_MS);
    expect(e.priority).toBe("low");
    expect(e.recommended_action.length).toBeGreaterThan(0);
  });

  it("scan priority escalates correctly (low→medium→high→critical)", () => {
    // ratio just over 1 → low
    simulationStallDetectorEngine.startTracking("j-low", "gcode_parse", T0);
    expect(simulationStallDetectorEngine.scan(T0 + GCODE_LOW_OFFSET)[0].priority).toBe("low");
    simulationStallDetectorEngine.clear();

    // ratio = 2 (>1.5) → medium
    simulationStallDetectorEngine.startTracking("j-med", "gcode_parse", T0);
    expect(simulationStallDetectorEngine.scan(T0 + GCODE_MEDIUM_OFFSET)[0].priority).toBe("medium");
    simulationStallDetectorEngine.clear();

    // ratio = 4 (>3) → high
    simulationStallDetectorEngine.startTracking("j-high", "gcode_parse", T0);
    expect(simulationStallDetectorEngine.scan(T0 + GCODE_HIGH_OFFSET)[0].priority).toBe("high");
    simulationStallDetectorEngine.clear();

    // ratio = 7 (>6) → critical
    simulationStallDetectorEngine.startTracking("j-crit", "gcode_parse", T0);
    expect(simulationStallDetectorEngine.scan(T0 + GCODE_CRITICAL_OFFSET)[0].priority).toBe("critical");
  });

  it("scanOne returns undefined for unknown job", () => {
    const e = simulationStallDetectorEngine.scanOne("ghost", T0);
    expect(e === undefined).toBe(true);
  });

  it("scanOne returns undefined for tracked but not-yet-stalled job", () => {
    simulationStallDetectorEngine.startTracking("j7", "kinematics", T0);
    const e = simulationStallDetectorEngine.scanOne("j7", T0 + 1);
    expect(e === undefined).toBe(true);
  });

  it("scanOne returns event for tracked + stalled job", () => {
    simulationStallDetectorEngine.startTracking("j8", "collision_check", T0);
    const e = simulationStallDetectorEngine.scanOne("j8", T0 + COLLISION_CHECK_BUDGET_MS + 1);
    if (!e) throw new Error("Expected stall event for j8");
    expect(e.job_id).toBe("j8");
    expect(e.stage).toBe("collision_check");
    expect(e.budget_ms).toBe(COLLISION_CHECK_BUDGET_MS);
  });

  it("stats reports total_tracked + by_stage breakdown for all 5 sim stages", () => {
    simulationStallDetectorEngine.startTracking("a", "gcode_parse", T0);
    simulationStallDetectorEngine.startTracking("b", "kinematics", T0);
    simulationStallDetectorEngine.startTracking("c", "physics_validate", T0);
    simulationStallDetectorEngine.startTracking("d", "physics_validate", T0);
    const s = simulationStallDetectorEngine.stats();
    expect(s.total_tracked).toBe(4);
    expect(s.by_stage.gcode_parse).toBe(1);
    expect(s.by_stage.kinematics).toBe(1);
    expect(s.by_stage.collision_check).toBe(0);
    expect(s.by_stage.physics_validate).toBe(2);
    expect(s.by_stage.finalize).toBe(0);
    expect(s.currently_stalled).toBe(0);
  });

  it("statsAt populates currently_stalled via scan", () => {
    simulationStallDetectorEngine.startTracking("a", "finalize", T0);
    simulationStallDetectorEngine.startTracking("b", "finalize", T0);
    const s = simulationStallDetectorEngine.statsAt(T0 + FINALIZE_BUDGET_MS + 1);
    expect(s.total_tracked).toBe(2);
    expect(s.currently_stalled).toBe(2);
  });

  it("clear empties the map", () => {
    simulationStallDetectorEngine.startTracking("a", "gcode_parse", T0);
    simulationStallDetectorEngine.clear();
    expect(simulationStallDetectorEngine.stats().total_tracked).toBe(0);
  });
});

describe("U-WIRE44 — schema integrity: ACTION_AI_REASONING_SCHEMAS", () => {
  it.each(NEW_ACTIONS)("schema for '%s' echoes minimal valid input verbatim", (action) => {
    const schema = ACTION_AI_REASONING_SCHEMAS[action as AIReasoningAction];
    const minimal: Record<string, Record<string, unknown>> = {
      sim_stall_start_tracking: { job_id: "j", stage: "gcode_parse", now_ms: 0 },
      sim_stall_mark_progress: { job_id: "j", now_ms: 0 },
      sim_stall_advance_stage: { job_id: "j", from_stage: "gcode_parse", to_stage: "kinematics", now_ms: 0 },
      sim_stall_complete_job: { job_id: "j" },
      sim_stall_scan: { now_ms: 0 },
      sim_stall_scan_one: { job_id: "j", now_ms: 0 },
      sim_stall_stats: {},
      sim_stall_clear: {},
    };
    const parsed = schema.parse(minimal[action]);
    expect(parsed).toEqual(minimal[action]);
  });

  it("sim_stall_start_tracking rejects empty job_id (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["sim_stall_start_tracking"];
    expect(() => schema.parse({ job_id: "", stage: "kinematics", now_ms: 0 })).toThrow();
  });

  it("sim_stall_start_tracking rejects invalid stage enum (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["sim_stall_start_tracking"];
    // Print-match stages should NOT be valid here (different domain)
    expect(() => schema.parse({ job_id: "j", stage: "ingest", now_ms: 0 })).toThrow();
    expect(() => schema.parse({ job_id: "j", stage: "imaginary", now_ms: 0 })).toThrow();
  });

  it("sim_stall_start_tracking rejects negative or non-integer now_ms (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["sim_stall_start_tracking"];
    expect(() => schema.parse({ job_id: "j", stage: "gcode_parse", now_ms: -1 })).toThrow();
    expect(() => schema.parse({ job_id: "j", stage: "gcode_parse", now_ms: 0.5 })).toThrow();
  });

  it("sim_stall_advance_stage rejects invalid from/to_stage enums (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["sim_stall_advance_stage"];
    expect(() => schema.parse({
      job_id: "j", from_stage: "candidate_review", to_stage: "kinematics", now_ms: 0,
    })).toThrow();
    expect(() => schema.parse({
      job_id: "j", from_stage: "gcode_parse", to_stage: "ingest", now_ms: 0,
    })).toThrow();
  });

  it("sim_stall_scan_one requires both job_id and now_ms (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["sim_stall_scan_one"];
    expect(() => schema.parse({ job_id: "j" })).toThrow();
    expect(() => schema.parse({ now_ms: 0 })).toThrow();
    expect(() => schema.parse({})).toThrow();
  });

  it("sim_stall_stats now_ms is optional (omit OK)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["sim_stall_stats"];
    const ok = schema.parse({}) as Record<string, unknown>;
    expect(ok).toEqual({});
    const withNow = schema.parse({ now_ms: 99 }) as { now_ms: number };
    expect(withNow.now_ms).toBe(99);
  });

  it.each(NEW_ACTIONS)("'%s' is registered in AI_REASONING_ACTIONS enum", (action) => {
    expect(AI_REASONING_ACTIONS.includes(action as AIReasoningAction)).toBe(true);
  });
});

describe("U-WIRE44 — dispatcher round-trip: prism_ai", () => {
  beforeEach(() => {
    simulationStallDetectorEngine.clear();
  });

  it("sim_stall_start_tracking returns {ok:true, job_id, stage}", async () => {
    const out = await executeAIReasoningAction("sim_stall_start_tracking", {
      job_id: "rt-1", stage: "kinematics", now_ms: T0, context: { program: "OP200" },
    });
    expect(out.success).toBe(true);
    const data = out.data as { ok: boolean; job_id: string; stage: string };
    expect(data.ok).toBe(true);
    expect(data.job_id).toBe("rt-1");
    expect(data.stage).toBe("kinematics");
    expect(simulationStallDetectorEngine.trackedIds().includes("rt-1")).toBe(true);
  });

  it("sim_stall_start_tracking duplicate returns success:false", async () => {
    await executeAIReasoningAction("sim_stall_start_tracking", { job_id: "dup", stage: "kinematics", now_ms: T0 });
    const out = await executeAIReasoningAction("sim_stall_start_tracking", { job_id: "dup", stage: "kinematics", now_ms: T0 });
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/already tracked|dup/i);
  });

  it("sim_stall_mark_progress on tracked job returns ok:true", async () => {
    await executeAIReasoningAction("sim_stall_start_tracking", { job_id: "p1", stage: "gcode_parse", now_ms: T0 });
    const out = await executeAIReasoningAction("sim_stall_mark_progress", { job_id: "p1", now_ms: T_PLUS_1S });
    expect(out.success).toBe(true);
    expect((out.data as { ok: boolean }).ok).toBe(true);
  });

  it("sim_stall_mark_progress on untracked job returns success:false", async () => {
    const out = await executeAIReasoningAction("sim_stall_mark_progress", { job_id: "ghost", now_ms: T0 });
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/not tracked|ghost/i);
  });

  it("sim_stall_advance_stage moves job, response includes from/to", async () => {
    await executeAIReasoningAction("sim_stall_start_tracking", { job_id: "a1", stage: "gcode_parse", now_ms: T0 });
    const out = await executeAIReasoningAction("sim_stall_advance_stage", {
      job_id: "a1", from_stage: "gcode_parse", to_stage: "kinematics", now_ms: T_PLUS_1S,
    });
    expect(out.success).toBe(true);
    const data = out.data as { from: string; to: string };
    expect(data.from).toBe("gcode_parse");
    expect(data.to).toBe("kinematics");
  });

  it("sim_stall_complete_job true on first remove, false on second", async () => {
    await executeAIReasoningAction("sim_stall_start_tracking", { job_id: "c1", stage: "finalize", now_ms: T0 });
    const r1 = await executeAIReasoningAction("sim_stall_complete_job", { job_id: "c1" });
    expect((r1.data as { removed: boolean }).removed).toBe(true);
    const r2 = await executeAIReasoningAction("sim_stall_complete_job", { job_id: "c1" });
    expect((r2.data as { removed: boolean }).removed).toBe(false);
  });

  it("sim_stall_scan returns {events, count} matching engine direct", async () => {
    await executeAIReasoningAction("sim_stall_start_tracking", { job_id: "s1", stage: "finalize", now_ms: T0 });
    await executeAIReasoningAction("sim_stall_start_tracking", { job_id: "s2", stage: "finalize", now_ms: T0 });
    const out = await executeAIReasoningAction("sim_stall_scan", { now_ms: T0 + FINALIZE_BUDGET_MS + 1 });
    expect(out.success).toBe(true);
    const data = out.data as { events: { priority: string }[]; count: number };
    expect(data.count).toBe(2);
    expect(data.events.every((e) => e.priority === "low")).toBe(true);
  });

  it("sim_stall_scan_one stalled returns {event, stalled:true} with critical priority", async () => {
    await executeAIReasoningAction("sim_stall_start_tracking", { job_id: "so1", stage: "gcode_parse", now_ms: T0 });
    const out = await executeAIReasoningAction("sim_stall_scan_one", {
      job_id: "so1", now_ms: T0 + GCODE_CRITICAL_OFFSET,
    });
    expect(out.success).toBe(true);
    const data = out.data as { event: { priority: string }; stalled: boolean };
    expect(data.stalled).toBe(true);
    expect(data.event.priority).toBe("critical");
  });

  it("sim_stall_scan_one not-stalled returns {event:null, stalled:false}", async () => {
    await executeAIReasoningAction("sim_stall_start_tracking", { job_id: "so2", stage: "kinematics", now_ms: T0 });
    const out = await executeAIReasoningAction("sim_stall_scan_one", { job_id: "so2", now_ms: T0 + 1 });
    expect(out.success).toBe(true);
    const data = out.data as { stalled: boolean; job_id: string };
    expect(data.stalled).toBe(false);
    expect(data.job_id).toBe("so2");
  });

  it("sim_stall_stats without now_ms reports static stats (currently_stalled=0)", async () => {
    await executeAIReasoningAction("sim_stall_start_tracking", { job_id: "st1", stage: "physics_validate", now_ms: T0 });
    await executeAIReasoningAction("sim_stall_start_tracking", { job_id: "st2", stage: "collision_check", now_ms: T0 });
    const out = await executeAIReasoningAction("sim_stall_stats", {});
    expect(out.success).toBe(true);
    const data = out.data as {
      total_tracked: number;
      by_stage: Record<string, number>;
      currently_stalled: number;
      tracked_ids: string[];
    };
    expect(data.total_tracked).toBe(2);
    expect(data.by_stage.physics_validate).toBe(1);
    expect(data.by_stage.collision_check).toBe(1);
    expect(data.currently_stalled).toBe(0);
    expect(data.tracked_ids.length).toBe(2);
  });

  it("sim_stall_stats with now_ms reports live currently_stalled", async () => {
    await executeAIReasoningAction("sim_stall_start_tracking", { job_id: "live", stage: "gcode_parse", now_ms: T0 });
    const out = await executeAIReasoningAction("sim_stall_stats", { now_ms: T0 + GCODE_LOW_OFFSET });
    expect(out.success).toBe(true);
    expect((out.data as { currently_stalled: number }).currently_stalled).toBe(1);
  });

  it("sim_stall_clear empties tracking", async () => {
    await executeAIReasoningAction("sim_stall_start_tracking", { job_id: "x", stage: "kinematics", now_ms: T0 });
    const out = await executeAIReasoningAction("sim_stall_clear", {});
    expect(out.success).toBe(true);
    expect((out.data as { cleared: boolean }).cleared).toBe(true);
    const stats = await executeAIReasoningAction("sim_stall_stats", {});
    expect((stats.data as { total_tracked: number }).total_tracked).toBe(0);
  });

  it("sim_stall_advance_stage with print-match stage returns success:false (cross-domain rejection)", async () => {
    // 'ingest' is a U-WIRE43 stage, NOT a sim stage
    const out = await executeAIReasoningAction("sim_stall_advance_stage", {
      job_id: "x", from_stage: "ingest", to_stage: "kinematics", now_ms: 0,
    });
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/from_stage|enum|ingest/i);
  });

  it("sim_stall_scan with invalid now_ms returns success:false", async () => {
    const out = await executeAIReasoningAction("sim_stall_scan", { now_ms: -5 });
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/now_ms|nonnegative|min/i);
  });

  it("end-to-end sim lifecycle: track gcode_parse → advance kinematics → advance collision_check → complete", async () => {
    const r1 = await executeAIReasoningAction("sim_stall_start_tracking", {
      job_id: "lifecycle", stage: "gcode_parse", now_ms: T0,
    });
    expect(r1.success).toBe(true);
    const r2 = await executeAIReasoningAction("sim_stall_advance_stage", {
      job_id: "lifecycle", from_stage: "gcode_parse", to_stage: "kinematics", now_ms: T_PLUS_1S,
    });
    expect(r2.success).toBe(true);
    const r3 = await executeAIReasoningAction("sim_stall_advance_stage", {
      job_id: "lifecycle", from_stage: "kinematics", to_stage: "collision_check", now_ms: T_PLUS_1S + 2_000,
    });
    expect(r3.success).toBe(true);
    const r4 = await executeAIReasoningAction("sim_stall_complete_job", { job_id: "lifecycle" });
    expect((r4.data as { removed: boolean }).removed).toBe(true);
    const r5 = await executeAIReasoningAction("sim_stall_stats", {});
    expect((r5.data as { total_tracked: number }).total_tracked).toBe(0);
  });

  it("isolation between print-match (U-WIRE43) and simulation (U-WIRE44) detectors", async () => {
    // Tracking a sim job must NOT affect the print-match engine's state.
    await executeAIReasoningAction("sim_stall_start_tracking", { job_id: "iso-sim", stage: "kinematics", now_ms: T0 });
    const printStats = await executeAIReasoningAction("stall_stats", {});
    // Print-match tracker should see 0 jobs (no cross-pollination).
    expect((printStats.data as { total_tracked: number }).total_tracked).toBe(0);
    // Sim tracker should see 1.
    const simStats = await executeAIReasoningAction("sim_stall_stats", {});
    expect((simStats.data as { total_tracked: number }).total_tracked).toBe(1);
  });
});
