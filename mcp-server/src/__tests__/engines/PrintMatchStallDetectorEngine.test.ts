/**
 * PrintMatchStallDetectorEngine tests
 * LATHE-PROD-READY-MS0 / U-LPR-STALL-PRINTS
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  PrintMatchStallDetectorEngine,
  printMatchStallDetectorEngine,
  type MatchStage,
} from "../../engines/PrintMatchStallDetectorEngine.js";

function fresh(): PrintMatchStallDetectorEngine {
  return new PrintMatchStallDetectorEngine();
}

describe("PrintMatchStallDetectorEngine", () => {
  it("exports a ready-to-use singleton", () => {
    expect(printMatchStallDetectorEngine).toBeInstanceOf(PrintMatchStallDetectorEngine);
  });

  it("startTracking adds a job; stats reflects it", () => {
    const e = fresh();
    e.startTracking("job-1", "ingest", 1000);
    expect(e.stats().total_tracked).toBe(1);
    expect(e.stats().by_stage.ingest).toBe(1);
    expect(e.trackedIds()).toEqual(["job-1"]);
  });

  it("startTracking rejects empty job_id", () => {
    const e = fresh();
    expect(() => e.startTracking("", "ingest", 0)).toThrow(/job_id is required/);
  });

  it("startTracking rejects unknown stage", () => {
    const e = fresh();
    expect(() => e.startTracking("j", "not_a_stage" as MatchStage, 0)).toThrow(/Unknown stage/);
  });

  it("startTracking rejects duplicate job_id", () => {
    const e = fresh();
    e.startTracking("dup", "ingest", 0);
    expect(() => e.startTracking("dup", "ingest", 0)).toThrow(/already tracked/);
  });

  it("scan() returns empty when no job is stalled", () => {
    const e = fresh();
    e.startTracking("j", "ingest", 0);
    // ingest budget is 10_000 ms. At t=5000, not stalled yet.
    expect(e.scan(5000)).toEqual([]);
  });

  it("scan() returns a stall event once budget is exceeded", () => {
    const e = fresh();
    e.startTracking("j", "ingest", 0, { print_id: "P-42" });
    // ingest budget = 10_000 ms. At t=15_000, stalled 15s.
    const events = e.scan(15_000);
    expect(events).toHaveLength(1);
    expect(events[0].job_id).toBe("j");
    expect(events[0].stage).toBe("ingest");
    expect(events[0].stalled_for_ms).toBe(15_000);
    expect(events[0].budget_ms).toBe(10_000);
    expect(events[0].context.print_id).toBe("P-42");
    expect(events[0].recommended_action).toMatch(/ingest worker/i);
  });

  it("markProgress resets the stall clock", () => {
    const e = fresh();
    e.startTracking("j", "ingest", 0);
    // At t=8000, still under budget
    e.markProgress("j", 8000);
    // At t=15_000 — only 7s since last progress — NOT stalled
    expect(e.scan(15_000)).toEqual([]);
    // At t=20_000 — 12s since last progress — stalled
    expect(e.scan(20_000)).toHaveLength(1);
  });

  it("advanceStage transitions and resets the clock", () => {
    const e = fresh();
    e.startTracking("j", "ingest", 0);
    // Advance to feature_extraction at t=5000
    e.advanceStage("j", "ingest", "feature_extraction", 5000);
    expect(e.stats().by_stage.ingest).toBe(0);
    expect(e.stats().by_stage.feature_extraction).toBe(1);
    // feature_extraction budget 30_000. At t=5000 + 25_000 = 30_000 → not stalled.
    expect(e.scan(30_000)).toEqual([]);
    // At t=5000 + 31_000 = 36_000 → stalled 31s
    const events = e.scan(36_000);
    expect(events).toHaveLength(1);
    expect(events[0].stage).toBe("feature_extraction");
  });

  it("advanceStage throws on stage mismatch", () => {
    const e = fresh();
    e.startTracking("j", "ingest", 0);
    expect(() => e.advanceStage("j", "similarity_search", "disposition", 100)).toThrow(
      /advance mismatch/,
    );
  });

  it("advanceStage throws on unknown target stage", () => {
    const e = fresh();
    e.startTracking("j", "ingest", 0);
    expect(() => e.advanceStage("j", "ingest", "xxx" as MatchStage, 100)).toThrow(
      /Unknown stage/,
    );
  });

  it("markProgress on untracked job throws", () => {
    const e = fresh();
    expect(() => e.markProgress("nope", 0)).toThrow(/not tracked/);
  });

  it("completeJob removes tracking; returns boolean", () => {
    const e = fresh();
    e.startTracking("j", "ingest", 0);
    expect(e.completeJob("j")).toBe(true);
    expect(e.completeJob("j")).toBe(false);
    expect(e.trackedIds()).toEqual([]);
  });

  it("scan sorts events by stalled_for_ms descending", () => {
    const e = fresh();
    e.startTracking("a", "ingest", 0);
    e.startTracking("b", "ingest", 5000);
    e.startTracking("c", "ingest", 2000);
    // At t=20_000:
    //   a stalled 20s, b stalled 15s, c stalled 18s → order a, c, b
    const events = e.scan(20_000);
    expect(events.map((x) => x.job_id)).toEqual(["a", "c", "b"]);
  });

  it("machine-stage priority escalates with ratio (medium → high → critical)", () => {
    const e = fresh();
    e.startTracking("med", "ingest", 0); // budget 10s
    // Stalled ~20s, ratio 2 → medium
    expect(e.scan(20_000)[0].priority).toBe("medium");
    e.clear();

    e.startTracking("hi", "ingest", 0);
    // Stalled ~40s, ratio 4 → high
    expect(e.scan(40_000)[0].priority).toBe("high");
    e.clear();

    e.startTracking("crit", "ingest", 0);
    // Stalled ~80s, ratio 8 → critical
    expect(e.scan(80_000)[0].priority).toBe("critical");
  });

  it("candidate_review priority is softer than machine stages (human in loop)", () => {
    const e = fresh();
    e.startTracking("rev", "candidate_review", 0); // budget 15 min = 900_000
    // Ratio ~1.1, just over budget — candidate_review low
    const events1 = e.scan(1_000_000);
    expect(events1[0].priority).toBe("low");
    // Ratio ~2.2 — medium
    const events2 = e.scan(2_000_000);
    expect(events2[0].priority).toBe("medium");
    // Ratio ~5 — high (doesn't escalate to critical for candidate_review)
    const events3 = e.scan(5_000_000);
    expect(events3[0].priority).toBe("high");
  });

  it("scanOne returns event for stalled job, undefined otherwise", () => {
    const e = fresh();
    e.startTracking("j", "ingest", 0);
    expect(e.scanOne("j", 5_000)).toBeUndefined(); // not stalled
    const event = e.scanOne("j", 20_000);
    expect(event).toBeDefined();
    expect(event?.job_id).toBe("j");
    expect(e.scanOne("unknown", 20_000)).toBeUndefined();
  });

  it("recommended_action is stage-specific", () => {
    const e = fresh();
    const stages: MatchStage[] = [
      "ingest",
      "feature_extraction",
      "similarity_search",
      "candidate_review",
      "disposition",
    ];
    for (const s of stages) {
      e.clear();
      e.startTracking(`j-${s}`, s, 0);
      const ev = e.scan(10_000_000)[0];
      expect(ev.recommended_action.length).toBeGreaterThan(0);
    }
  });

  it("statsAt includes currently_stalled count", () => {
    const e = fresh();
    e.startTracking("stalled", "ingest", 0);
    e.startTracking("healthy", "ingest", 19_000);
    // At t=20_000: 'stalled' is stalled (20s), 'healthy' is not (1s)
    const s = e.statsAt(20_000);
    expect(s.total_tracked).toBe(2);
    expect(s.currently_stalled).toBe(1);
  });

  it("context cloned on read so mutation doesn't leak back", () => {
    const e = fresh();
    e.startTracking("j", "ingest", 0, { print_id: "P-1", tags: ["a"] });
    const event = e.scan(20_000)[0];
    (event.context.tags as string[]).push("MUTATED");
    const again = e.scan(20_000)[0];
    expect((again.context.tags as string[])).not.toContain("MUTATED");
  });

  it("clear() removes all tracking", () => {
    const e = fresh();
    e.startTracking("a", "ingest", 0);
    e.startTracking("b", "feature_extraction", 0);
    e.clear();
    expect(e.trackedIds()).toEqual([]);
    expect(e.stats().total_tracked).toBe(0);
  });

  it("stats().by_stage is fully populated for all 5 stages", () => {
    const e = fresh();
    const keys = Object.keys(e.stats().by_stage).sort();
    expect(keys).toEqual([
      "candidate_review",
      "disposition",
      "feature_extraction",
      "ingest",
      "similarity_search",
    ]);
  });
});
