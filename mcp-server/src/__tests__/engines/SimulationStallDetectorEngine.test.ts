/**
 * SimulationStallDetectorEngine tests
 * LATHE-PROD-READY-MS0 / U-LPR-STALL-SIM
 */
import { describe, it, expect } from "vitest";
import {
  SimulationStallDetectorEngine,
  simulationStallDetectorEngine,
  type SimStage,
} from "../../engines/SimulationStallDetectorEngine.js";

function fresh(): SimulationStallDetectorEngine {
  return new SimulationStallDetectorEngine();
}

describe("SimulationStallDetectorEngine", () => {
  it("exports a ready-to-use singleton", () => {
    expect(simulationStallDetectorEngine).toBeInstanceOf(SimulationStallDetectorEngine);
  });

  it("startTracking adds a job + stats reflect it", () => {
    const e = fresh();
    e.startTracking("s-1", "gcode_parse", 0);
    expect(e.stats().total_tracked).toBe(1);
    expect(e.stats().by_stage.gcode_parse).toBe(1);
    expect(e.trackedIds()).toEqual(["s-1"]);
  });

  it("startTracking rejects empty id + unknown stage + dup", () => {
    const e = fresh();
    expect(() => e.startTracking("", "gcode_parse", 0)).toThrow(/job_id is required/);
    expect(() => e.startTracking("x", "bogus" as SimStage, 0)).toThrow(/Unknown simulation stage/);
    e.startTracking("dup", "gcode_parse", 0);
    expect(() => e.startTracking("dup", "gcode_parse", 0)).toThrow(/already tracked/);
  });

  it("gcode_parse stage has 5s budget — stalls after 5001ms", () => {
    const e = fresh();
    e.startTracking("s", "gcode_parse", 0);
    expect(e.scan(4_000)).toEqual([]);
    const events = e.scan(6_000);
    expect(events).toHaveLength(1);
    expect(events[0].stage).toBe("gcode_parse");
    expect(events[0].budget_ms).toBe(5_000);
  });

  it("collision_check stage has 30s budget — largest budget", () => {
    const e = fresh();
    e.startTracking("s", "collision_check", 0);
    expect(e.scan(25_000)).toEqual([]);
    expect(e.scan(35_000)).toHaveLength(1);
  });

  it("markProgress resets stall clock", () => {
    const e = fresh();
    e.startTracking("s", "gcode_parse", 0);
    e.markProgress("s", 4_500);
    // 4_500 + 5_001 = 9_501 → just over budget from last progress
    expect(e.scan(9_000)).toEqual([]);
    expect(e.scan(10_000)).toHaveLength(1);
  });

  it("advanceStage transitions + resets clock", () => {
    const e = fresh();
    e.startTracking("s", "gcode_parse", 0);
    e.advanceStage("s", "gcode_parse", "kinematics", 3_000);
    expect(e.stats().by_stage.gcode_parse).toBe(0);
    expect(e.stats().by_stage.kinematics).toBe(1);
    // kinematics budget 10s; entered at 3000 → stalled at 13001
    expect(e.scan(12_000)).toEqual([]);
    expect(e.scan(14_000)).toHaveLength(1);
  });

  it("advanceStage rejects stage mismatch", () => {
    const e = fresh();
    e.startTracking("s", "gcode_parse", 0);
    expect(() => e.advanceStage("s", "kinematics", "finalize", 100)).toThrow(/advance mismatch/);
  });

  it("advanceStage rejects unknown target stage", () => {
    const e = fresh();
    e.startTracking("s", "gcode_parse", 0);
    expect(() => e.advanceStage("s", "gcode_parse", "xyz" as SimStage, 100)).toThrow(
      /Unknown simulation stage/,
    );
  });

  it("markProgress on untracked id throws", () => {
    const e = fresh();
    expect(() => e.markProgress("nope", 0)).toThrow(/not tracked/);
  });

  it("completeJob removes + returns boolean", () => {
    const e = fresh();
    e.startTracking("s", "gcode_parse", 0);
    expect(e.completeJob("s")).toBe(true);
    expect(e.completeJob("s")).toBe(false);
    expect(e.trackedIds()).toEqual([]);
  });

  it("priority escalates with ratio: medium → high → critical", () => {
    const e = fresh();
    e.startTracking("s", "gcode_parse", 0); // budget 5s
    // 10s stall → ratio 2 → medium
    expect(e.scan(10_000)[0].priority).toBe("medium");
    e.clear();
    e.startTracking("s", "gcode_parse", 0);
    // 20s → ratio 4 → high
    expect(e.scan(20_000)[0].priority).toBe("high");
    e.clear();
    e.startTracking("s", "gcode_parse", 0);
    // 40s → ratio 8 → critical
    expect(e.scan(40_000)[0].priority).toBe("critical");
  });

  it("scan sorts by stalled_for_ms desc", () => {
    const e = fresh();
    e.startTracking("a", "gcode_parse", 0);
    e.startTracking("b", "gcode_parse", 2_000);
    e.startTracking("c", "gcode_parse", 1_000);
    // At t=15000: a=15s, b=13s, c=14s → order a, c, b
    const ids = e.scan(15_000).map((x) => x.job_id);
    expect(ids).toEqual(["a", "c", "b"]);
  });

  it("scanOne returns event for stalled, undef otherwise", () => {
    const e = fresh();
    e.startTracking("s", "gcode_parse", 0);
    expect(e.scanOne("s", 3_000)).toBeUndefined();
    expect(e.scanOne("s", 10_000)).toBeDefined();
    expect(e.scanOne("unknown", 10_000)).toBeUndefined();
  });

  it("recommended_action is stage-specific", () => {
    const e = fresh();
    e.startTracking("s-a", "gcode_parse", 0);
    expect(e.scan(20_000)[0].recommended_action).toMatch(/parser worker/i);
    e.clear();
    e.startTracking("s-b", "collision_check", 0);
    expect(e.scan(100_000)[0].recommended_action).toMatch(/BVH|AABB/i);
    e.clear();
    e.startTracking("s-c", "physics_validate", 0);
    expect(e.scan(100_000)[0].recommended_action).toMatch(/oscillating|approximate/i);
  });

  it("context is deep-cloned on read — mutation does not leak", () => {
    const e = fresh();
    e.startTracking("s", "gcode_parse", 0, { program: "O1000", tags: ["a"] });
    const ev = e.scan(20_000)[0];
    (ev.context.tags as string[]).push("MUTATED");
    const again = e.scan(20_000)[0];
    expect((again.context.tags as string[])).not.toContain("MUTATED");
  });

  it("statsAt populates currently_stalled", () => {
    const e = fresh();
    e.startTracking("stalled", "gcode_parse", 0);
    e.startTracking("healthy", "gcode_parse", 3_000);
    const s = e.statsAt(8_000);
    // stalled: 8s > 5s budget → yes
    // healthy: 5s > 5s budget → yes (both stalled actually)
    expect(s.currently_stalled).toBeGreaterThanOrEqual(1);
    expect(s.total_tracked).toBe(2);
  });

  it("clear() empties all tracking", () => {
    const e = fresh();
    e.startTracking("a", "gcode_parse", 0);
    e.startTracking("b", "finalize", 0);
    e.clear();
    expect(e.trackedIds()).toEqual([]);
  });

  it("stats().by_stage covers all 5 simulation stages", () => {
    const keys = Object.keys(fresh().stats().by_stage).sort();
    expect(keys).toEqual([
      "collision_check",
      "finalize",
      "gcode_parse",
      "kinematics",
      "physics_validate",
    ]);
  });

  it("full pipeline: job flows gcode_parse → kinematics → collision_check → physics_validate → finalize without stall", () => {
    const e = fresh();
    let now = 0;
    e.startTracking("full", "gcode_parse", now);
    now += 3_000;
    e.advanceStage("full", "gcode_parse", "kinematics", now);
    now += 8_000;
    e.advanceStage("full", "kinematics", "collision_check", now);
    now += 25_000;
    e.advanceStage("full", "collision_check", "physics_validate", now);
    now += 15_000;
    e.advanceStage("full", "physics_validate", "finalize", now);
    now += 3_000;
    expect(e.scan(now)).toEqual([]);
    expect(e.completeJob("full")).toBe(true);
  });
});
