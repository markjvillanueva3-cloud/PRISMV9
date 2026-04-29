/**
 * aiReasoningDispatcher U-WIRE43 round-trip tests — PrintMatchStallDetectorEngine.
 *
 * Validates 8 stall-detector actions through prism_ai. Engine has clear()
 * so beforeEach resets the job map. All methods synchronous; engine never
 * reads Date.now itself - caller supplies now_ms.
 *
 * Engine internals (verified by these tests):
 *   - 5 stages with stall budgets: ingest=10s, feature_extraction=30s,
 *     similarity_search=60s, candidate_review=15min, disposition=30s.
 *   - startTracking throws on duplicate job_id.
 *   - markProgress / advanceStage throw if job not tracked.
 *   - advanceStage throws if from_stage doesn't match actual.
 *   - scan returns events with stalled_for_ms > budget_ms, sorted desc.
 *   - scanOne returns undefined if not tracked OR not stalled.
 *   - Priority for machine stages: r>6 critical, r>3 high, r>1.5 medium, else low.
 *   - Priority for candidate_review: r>4 high, r>2 medium, else low.
 *   - statsAt populates currently_stalled via scan(); stats leaves it 0.
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE43
 */

import { describe, it, expect, beforeEach } from "vitest";
import { printMatchStallDetectorEngine } from "../engines/PrintMatchStallDetectorEngine.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
  type AIReasoningAction,
} from "../schemas/aiReasoningActionSchemas.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

const NEW_ACTIONS = [
  "stall_start_tracking", "stall_mark_progress", "stall_advance_stage", "stall_complete_job",
  "stall_scan", "stall_scan_one", "stall_stats", "stall_clear",
] as const;

// Stage budget anchors from engine source (must match STAGE_BUDGET_MS).
const INGEST_BUDGET_MS = 10_000;
const FEATURE_EXTRACTION_BUDGET_MS = 30_000;
const SIMILARITY_SEARCH_BUDGET_MS = 60_000;
const CANDIDATE_REVIEW_BUDGET_MS = 15 * 60 * 1000;
const DISPOSITION_BUDGET_MS = 30_000;
// Reusable test clock anchor (epoch ms is fine — engine doesn't care).
const T0 = 1_000_000;
const T_PLUS_5S = T0 + 5_000;
// Trigger machine-stage critical priority: ratio > 6 means stalled > 6×budget.
// For ingest (10s budget), 7× = 70s after start with no progress.
const INGEST_CRITICAL_OFFSET = INGEST_BUDGET_MS * 7;
// Trigger machine-stage medium priority: ratio > 1.5 means stalled > 1.5×budget but ≤ 3×.
const INGEST_MEDIUM_OFFSET = INGEST_BUDGET_MS * 2;
// Trigger machine-stage high priority: ratio > 3 but ≤ 6.
const INGEST_HIGH_OFFSET = INGEST_BUDGET_MS * 4;
// Just past budget (low priority for machine stages: r in (1, 1.5]).
const INGEST_LOW_OFFSET = INGEST_BUDGET_MS + 1;

describe("U-WIRE43 — engine direct: PrintMatchStallDetectorEngine", () => {
  beforeEach(() => {
    printMatchStallDetectorEngine.clear();
  });

  it("startTracking adds job to map; trackedIds reflects it", () => {
    printMatchStallDetectorEngine.startTracking("job-1", "ingest", T0, { print_id: "P-100" });
    const ids = printMatchStallDetectorEngine.trackedIds();
    expect(ids.length).toBe(1);
    expect(ids[0]).toBe("job-1");
  });

  it("startTracking throws on empty job_id (failure mode)", () => {
    expect(() => printMatchStallDetectorEngine.startTracking("", "ingest", T0)).toThrow(/job_id/);
  });

  it("startTracking throws on unknown stage (failure mode)", () => {
    expect(() =>
      // @ts-expect-error — testing the runtime validation guard
      printMatchStallDetectorEngine.startTracking("job-x", "imaginary_stage", T0),
    ).toThrow(/Unknown stage/);
  });

  it("startTracking throws on duplicate job_id (failure mode)", () => {
    printMatchStallDetectorEngine.startTracking("dup-job", "ingest", T0);
    expect(() => printMatchStallDetectorEngine.startTracking("dup-job", "ingest", T0)).toThrow(/already tracked/);
  });

  it("markProgress throws if job not tracked (failure mode)", () => {
    expect(() => printMatchStallDetectorEngine.markProgress("ghost", T0)).toThrow(/not tracked/);
  });

  it("markProgress resets stall clock (no longer stalled after progress)", () => {
    printMatchStallDetectorEngine.startTracking("j1", "ingest", T0);
    // Just past budget (1s after budget) — would be stalled.
    expect(printMatchStallDetectorEngine.scan(T0 + INGEST_LOW_OFFSET).length).toBe(1);
    // Reset clock at T+budget+1, then check 1ms later — should NOT be stalled.
    printMatchStallDetectorEngine.markProgress("j1", T0 + INGEST_LOW_OFFSET);
    expect(printMatchStallDetectorEngine.scan(T0 + INGEST_LOW_OFFSET + 1).length).toBe(0);
  });

  it("advanceStage throws on stage mismatch (failure mode)", () => {
    printMatchStallDetectorEngine.startTracking("j2", "ingest", T0);
    expect(() =>
      printMatchStallDetectorEngine.advanceStage("j2", "feature_extraction", "similarity_search", T_PLUS_5S),
    ).toThrow(/advance mismatch/);
  });

  it("advanceStage moves job + resets clock", () => {
    printMatchStallDetectorEngine.startTracking("j3", "ingest", T0);
    printMatchStallDetectorEngine.advanceStage("j3", "ingest", "feature_extraction", T_PLUS_5S);
    // After advance, stall clock measured against new stage's budget (30s).
    // At T_PLUS_5S + 31s, exceeds 30s budget → stalled.
    const events = printMatchStallDetectorEngine.scan(T_PLUS_5S + FEATURE_EXTRACTION_BUDGET_MS + 1);
    expect(events.length).toBe(1);
    expect(events[0].stage).toBe("feature_extraction");
  });

  it("completeJob removes the job and returns true; second call returns false", () => {
    printMatchStallDetectorEngine.startTracking("j4", "ingest", T0);
    expect(printMatchStallDetectorEngine.completeJob("j4")).toBe(true);
    expect(printMatchStallDetectorEngine.completeJob("j4")).toBe(false);
    expect(printMatchStallDetectorEngine.trackedIds().length).toBe(0);
  });

  it("scan returns empty array when no jobs are stalled", () => {
    printMatchStallDetectorEngine.startTracking("j5", "ingest", T0);
    // 1ms after start - well under 10s budget.
    expect(printMatchStallDetectorEngine.scan(T0 + 1).length).toBe(0);
  });

  it("scan sorts events by stalled_for_ms descending", () => {
    printMatchStallDetectorEngine.startTracking("most-stalled", "ingest", T0);
    printMatchStallDetectorEngine.startTracking("least-stalled", "ingest", T0 + 5_000);
    // Engine uses strict > budget. At T0+25s: most has stalled 25s, least has stalled 20s, both > 10s budget.
    const scanAt = T0 + INGEST_BUDGET_MS + 15_000;
    const events = printMatchStallDetectorEngine.scan(scanAt);
    if (events.length < 2) throw new Error("Expected both jobs to be stalled");
    expect(events[0].stalled_for_ms).toBeGreaterThan(events[1].stalled_for_ms);
    expect(events[0].job_id).toBe("most-stalled");
  });

  it("scan event includes stalled_for_ms, budget_ms, priority, recommended_action", () => {
    printMatchStallDetectorEngine.startTracking("j6", "ingest", T0);
    const events = printMatchStallDetectorEngine.scan(T0 + INGEST_LOW_OFFSET);
    expect(events.length).toBe(1);
    const e = events[0];
    expect(e.stalled_for_ms).toBe(INGEST_LOW_OFFSET);
    expect(e.budget_ms).toBe(INGEST_BUDGET_MS);
    expect(e.priority).toBe("low"); // ratio = 1.0001, just over → low
    expect(e.recommended_action.length).toBeGreaterThan(0);
  });

  it("scan priority escalates correctly for machine stages (low→medium→high→critical)", () => {
    // ratio just over 1 → low
    printMatchStallDetectorEngine.startTracking("j-low", "ingest", T0);
    expect(printMatchStallDetectorEngine.scan(T0 + INGEST_LOW_OFFSET)[0].priority).toBe("low");
    printMatchStallDetectorEngine.clear();

    // ratio = 2 (>1.5) → medium
    printMatchStallDetectorEngine.startTracking("j-med", "ingest", T0);
    expect(printMatchStallDetectorEngine.scan(T0 + INGEST_MEDIUM_OFFSET)[0].priority).toBe("medium");
    printMatchStallDetectorEngine.clear();

    // ratio = 4 (>3) → high
    printMatchStallDetectorEngine.startTracking("j-high", "ingest", T0);
    expect(printMatchStallDetectorEngine.scan(T0 + INGEST_HIGH_OFFSET)[0].priority).toBe("high");
    printMatchStallDetectorEngine.clear();

    // ratio = 7 (>6) → critical
    printMatchStallDetectorEngine.startTracking("j-crit", "ingest", T0);
    expect(printMatchStallDetectorEngine.scan(T0 + INGEST_CRITICAL_OFFSET)[0].priority).toBe("critical");
  });

  it("scan priority for candidate_review is more lenient (max=high, never critical)", () => {
    // For candidate_review at r > 4 → high (highest level for human stage).
    printMatchStallDetectorEngine.startTracking("j-cr", "candidate_review", T0);
    const stalled = CANDIDATE_REVIEW_BUDGET_MS * 5; // ratio = 5 > 4
    const events = printMatchStallDetectorEngine.scan(T0 + stalled);
    expect(events.length).toBe(1);
    expect(events[0].priority).toBe("high");
    // Even at huge ratios, candidate_review never returns critical.
    const ridiculous = printMatchStallDetectorEngine.scan(T0 + CANDIDATE_REVIEW_BUDGET_MS * 100);
    expect(ridiculous[0].priority).toBe("high");
  });

  it("scanOne returns undefined for unknown job", () => {
    const e = printMatchStallDetectorEngine.scanOne("ghost", T0);
    expect(e === undefined).toBe(true);
  });

  it("scanOne returns undefined for tracked but not-yet-stalled job", () => {
    printMatchStallDetectorEngine.startTracking("j7", "ingest", T0);
    const e = printMatchStallDetectorEngine.scanOne("j7", T0 + 1);
    expect(e === undefined).toBe(true);
  });

  it("scanOne returns event for tracked + stalled job", () => {
    printMatchStallDetectorEngine.startTracking("j8", "ingest", T0);
    const e = printMatchStallDetectorEngine.scanOne("j8", T0 + INGEST_LOW_OFFSET);
    if (!e) throw new Error("Expected stall event for j8");
    expect(e.job_id).toBe("j8");
    expect(e.stage).toBe("ingest");
  });

  it("stats reports total_tracked + by_stage breakdown; currently_stalled=0", () => {
    printMatchStallDetectorEngine.startTracking("a", "ingest", T0);
    printMatchStallDetectorEngine.startTracking("b", "ingest", T0);
    printMatchStallDetectorEngine.startTracking("c", "feature_extraction", T0);
    const s = printMatchStallDetectorEngine.stats();
    expect(s.total_tracked).toBe(3);
    expect(s.by_stage.ingest).toBe(2);
    expect(s.by_stage.feature_extraction).toBe(1);
    expect(s.by_stage.similarity_search).toBe(0);
    expect(s.currently_stalled).toBe(0);
  });

  it("statsAt populates currently_stalled via scan", () => {
    printMatchStallDetectorEngine.startTracking("a", "ingest", T0);
    printMatchStallDetectorEngine.startTracking("b", "ingest", T0);
    const s = printMatchStallDetectorEngine.statsAt(T0 + INGEST_LOW_OFFSET);
    expect(s.total_tracked).toBe(2);
    expect(s.currently_stalled).toBe(2);
  });

  it("clear empties the map; subsequent stats shows zero tracked", () => {
    printMatchStallDetectorEngine.startTracking("a", "ingest", T0);
    printMatchStallDetectorEngine.clear();
    expect(printMatchStallDetectorEngine.stats().total_tracked).toBe(0);
    expect(printMatchStallDetectorEngine.trackedIds().length).toBe(0);
  });
});

describe("U-WIRE43 — schema integrity: ACTION_AI_REASONING_SCHEMAS", () => {
  it.each(NEW_ACTIONS)("schema for '%s' echoes minimal valid input verbatim", (action) => {
    const schema = ACTION_AI_REASONING_SCHEMAS[action as AIReasoningAction];
    const minimal: Record<string, Record<string, unknown>> = {
      stall_start_tracking: { job_id: "j", stage: "ingest", now_ms: 0 },
      stall_mark_progress: { job_id: "j", now_ms: 0 },
      stall_advance_stage: { job_id: "j", from_stage: "ingest", to_stage: "feature_extraction", now_ms: 0 },
      stall_complete_job: { job_id: "j" },
      stall_scan: { now_ms: 0 },
      stall_scan_one: { job_id: "j", now_ms: 0 },
      stall_stats: {},
      stall_clear: {},
    };
    const parsed = schema.parse(minimal[action]);
    expect(parsed).toEqual(minimal[action]);
  });

  it("stall_start_tracking rejects empty job_id (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["stall_start_tracking"];
    expect(() => schema.parse({ job_id: "", stage: "ingest", now_ms: 0 })).toThrow();
  });

  it("stall_start_tracking rejects invalid stage enum (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["stall_start_tracking"];
    expect(() => schema.parse({ job_id: "j", stage: "ship_to_customer", now_ms: 0 })).toThrow();
  });

  it("stall_start_tracking rejects negative or non-integer now_ms (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["stall_start_tracking"];
    expect(() => schema.parse({ job_id: "j", stage: "ingest", now_ms: -1 })).toThrow();
    expect(() => schema.parse({ job_id: "j", stage: "ingest", now_ms: 1.5 })).toThrow();
  });

  it("stall_advance_stage rejects invalid from_stage / to_stage enums (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["stall_advance_stage"];
    expect(() => schema.parse({
      job_id: "j", from_stage: "invalid", to_stage: "ingest", now_ms: 0,
    })).toThrow();
    expect(() => schema.parse({
      job_id: "j", from_stage: "ingest", to_stage: "invalid", now_ms: 0,
    })).toThrow();
  });

  it("stall_scan_one requires both job_id and now_ms (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["stall_scan_one"];
    expect(() => schema.parse({ job_id: "j" })).toThrow();
    expect(() => schema.parse({ now_ms: 0 })).toThrow();
    expect(() => schema.parse({})).toThrow();
  });

  it("stall_stats now_ms is optional (omitting is valid)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["stall_stats"];
    const ok = schema.parse({}) as Record<string, unknown>;
    expect(ok).toEqual({});
    const withNow = schema.parse({ now_ms: 12345 }) as { now_ms: number };
    expect(withNow.now_ms).toBe(12345);
  });

  it.each(NEW_ACTIONS)("'%s' is registered in AI_REASONING_ACTIONS enum", (action) => {
    expect(AI_REASONING_ACTIONS.includes(action as AIReasoningAction)).toBe(true);
  });
});

describe("U-WIRE43 — dispatcher round-trip: prism_ai", () => {
  beforeEach(() => {
    printMatchStallDetectorEngine.clear();
  });

  it("stall_start_tracking returns {ok:true, job_id, stage}", async () => {
    const out = await executeAIReasoningAction("stall_start_tracking", {
      job_id: "rt-1", stage: "ingest", now_ms: T0, context: { print_id: "P-001" },
    });
    expect(out.success).toBe(true);
    const data = out.data as { ok: boolean; job_id: string; stage: string };
    expect(data.ok).toBe(true);
    expect(data.job_id).toBe("rt-1");
    expect(data.stage).toBe("ingest");
    // Engine state is updated.
    expect(printMatchStallDetectorEngine.trackedIds().includes("rt-1")).toBe(true);
  });

  it("stall_start_tracking duplicate returns success:false", async () => {
    await executeAIReasoningAction("stall_start_tracking", { job_id: "dup", stage: "ingest", now_ms: T0 });
    const out = await executeAIReasoningAction("stall_start_tracking", { job_id: "dup", stage: "ingest", now_ms: T0 });
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/already tracked|dup/i);
  });

  it("stall_mark_progress on tracked job returns ok:true", async () => {
    await executeAIReasoningAction("stall_start_tracking", { job_id: "p1", stage: "ingest", now_ms: T0 });
    const out = await executeAIReasoningAction("stall_mark_progress", { job_id: "p1", now_ms: T0 + 5_000 });
    expect(out.success).toBe(true);
    const data = out.data as { ok: boolean; job_id: string };
    expect(data.ok).toBe(true);
    expect(data.job_id).toBe("p1");
  });

  it("stall_mark_progress on untracked job returns success:false", async () => {
    const out = await executeAIReasoningAction("stall_mark_progress", { job_id: "ghost", now_ms: T0 });
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/not tracked|ghost/i);
  });

  it("stall_advance_stage moves job, response includes from/to", async () => {
    await executeAIReasoningAction("stall_start_tracking", { job_id: "a1", stage: "ingest", now_ms: T0 });
    const out = await executeAIReasoningAction("stall_advance_stage", {
      job_id: "a1", from_stage: "ingest", to_stage: "feature_extraction", now_ms: T_PLUS_5S,
    });
    expect(out.success).toBe(true);
    const data = out.data as { ok: boolean; from: string; to: string };
    expect(data.from).toBe("ingest");
    expect(data.to).toBe("feature_extraction");
  });

  it("stall_complete_job true on first remove, false on second", async () => {
    await executeAIReasoningAction("stall_start_tracking", { job_id: "c1", stage: "ingest", now_ms: T0 });
    const r1 = await executeAIReasoningAction("stall_complete_job", { job_id: "c1" });
    expect((r1.data as { removed: boolean }).removed).toBe(true);
    const r2 = await executeAIReasoningAction("stall_complete_job", { job_id: "c1" });
    expect((r2.data as { removed: boolean }).removed).toBe(false);
  });

  it("stall_scan returns {events, count} matching engine direct", async () => {
    await executeAIReasoningAction("stall_start_tracking", { job_id: "s1", stage: "ingest", now_ms: T0 });
    await executeAIReasoningAction("stall_start_tracking", { job_id: "s2", stage: "ingest", now_ms: T0 });
    const out = await executeAIReasoningAction("stall_scan", { now_ms: T0 + INGEST_LOW_OFFSET });
    expect(out.success).toBe(true);
    const data = out.data as { events: { job_id: string; priority: string }[]; count: number };
    expect(data.count).toBe(2);
    expect(data.events.length).toBe(2);
    expect(data.events.every((e) => e.priority === "low")).toBe(true);
  });

  it("stall_scan_one stalled returns {event, stalled:true}", async () => {
    await executeAIReasoningAction("stall_start_tracking", { job_id: "so1", stage: "ingest", now_ms: T0 });
    const out = await executeAIReasoningAction("stall_scan_one", {
      job_id: "so1", now_ms: T0 + INGEST_CRITICAL_OFFSET,
    });
    expect(out.success).toBe(true);
    const data = out.data as { event: { priority: string }; stalled: boolean };
    expect(data.stalled).toBe(true);
    expect(data.event.priority).toBe("critical");
  });

  it("stall_scan_one not-stalled returns {event:null, stalled:false}", async () => {
    await executeAIReasoningAction("stall_start_tracking", { job_id: "so2", stage: "ingest", now_ms: T0 });
    const out = await executeAIReasoningAction("stall_scan_one", { job_id: "so2", now_ms: T0 + 1 });
    expect(out.success).toBe(true);
    const data = out.data as { event: unknown; stalled: boolean; job_id: string };
    expect(data.stalled).toBe(false);
    expect(data.job_id).toBe("so2");
  });

  it("stall_stats without now_ms reports static stats (currently_stalled=0)", async () => {
    await executeAIReasoningAction("stall_start_tracking", { job_id: "st1", stage: "ingest", now_ms: T0 });
    await executeAIReasoningAction("stall_start_tracking", { job_id: "st2", stage: "feature_extraction", now_ms: T0 });
    const out = await executeAIReasoningAction("stall_stats", {});
    expect(out.success).toBe(true);
    const data = out.data as {
      total_tracked: number;
      by_stage: Record<string, number>;
      currently_stalled: number;
      tracked_ids: string[];
    };
    expect(data.total_tracked).toBe(2);
    expect(data.by_stage.ingest).toBe(1);
    expect(data.by_stage.feature_extraction).toBe(1);
    expect(data.currently_stalled).toBe(0);
    expect(data.tracked_ids.length).toBe(2);
  });

  it("stall_stats with now_ms reports live currently_stalled count", async () => {
    await executeAIReasoningAction("stall_start_tracking", { job_id: "live1", stage: "ingest", now_ms: T0 });
    await executeAIReasoningAction("stall_start_tracking", { job_id: "live2", stage: "ingest", now_ms: T0 });
    const out = await executeAIReasoningAction("stall_stats", { now_ms: T0 + INGEST_LOW_OFFSET });
    expect(out.success).toBe(true);
    const data = out.data as { currently_stalled: number; total_tracked: number };
    expect(data.total_tracked).toBe(2);
    expect(data.currently_stalled).toBe(2);
  });

  it("stall_clear empties tracking", async () => {
    await executeAIReasoningAction("stall_start_tracking", { job_id: "x", stage: "ingest", now_ms: T0 });
    const out = await executeAIReasoningAction("stall_clear", {});
    expect(out.success).toBe(true);
    expect((out.data as { cleared: boolean }).cleared).toBe(true);
    const stats = await executeAIReasoningAction("stall_stats", {});
    expect((stats.data as { total_tracked: number }).total_tracked).toBe(0);
  });

  it("stall_advance_stage with invalid from_stage returns success:false", async () => {
    const out = await executeAIReasoningAction("stall_advance_stage", {
      job_id: "x", from_stage: "imaginary", to_stage: "ingest", now_ms: 0,
    });
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/from_stage|enum|imaginary/i);
  });

  it("stall_scan with invalid now_ms returns success:false", async () => {
    const out = await executeAIReasoningAction("stall_scan", { now_ms: -1 });
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/now_ms|nonnegative|min/i);
  });

  it("end-to-end lifecycle: track → progress → advance → complete", async () => {
    // 1. Start tracking.
    const r1 = await executeAIReasoningAction("stall_start_tracking", {
      job_id: "lifecycle", stage: "ingest", now_ms: T0,
    });
    expect(r1.success).toBe(true);
    // 2. Mark progress mid-stage.
    const r2 = await executeAIReasoningAction("stall_mark_progress", { job_id: "lifecycle", now_ms: T_PLUS_5S });
    expect(r2.success).toBe(true);
    // 3. Advance to next stage.
    const r3 = await executeAIReasoningAction("stall_advance_stage", {
      job_id: "lifecycle", from_stage: "ingest", to_stage: "feature_extraction", now_ms: T_PLUS_5S + 1000,
    });
    expect(r3.success).toBe(true);
    // 4. Complete.
    const r4 = await executeAIReasoningAction("stall_complete_job", { job_id: "lifecycle" });
    expect(r4.success).toBe(true);
    expect((r4.data as { removed: boolean }).removed).toBe(true);
    // 5. Stats shows 0 tracked.
    const r5 = await executeAIReasoningAction("stall_stats", {});
    expect((r5.data as { total_tracked: number }).total_tracked).toBe(0);
  });
});
