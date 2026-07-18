/**
 * SpeedFeedAutopilotEngine Tests — ACP-MS4
 *
 * Validates the end-to-end speed/feed product autopilot:
 *   1. Material resolution from aliases/names
 *   2. Tool resolution with defaults
 *   3. Machine resolution
 *   4. Speed/feed computation physics
 *   5. Full chain execution
 */
import { describe, it, expect } from "vitest";
import { speedFeedAutopilotEngine } from "../engines/SpeedFeedAutopilotEngine.js";

// ── Material Resolution ──────────────────────────────────────

describe("SpeedFeedAutopilotEngine — Material Resolution", () => {

  it("resolves 'steel' to ISO P group", () => {
    const r = speedFeedAutopilotEngine.resolveMaterial("steel");
    expect(r.resolved_iso).toBe("P");
    expect(r.kc1_1).toBe(1800);
    expect(r.confidence).toBeGreaterThan(0.7);
  });

  it("resolves 'aluminum' to ISO N group", () => {
    const r = speedFeedAutopilotEngine.resolveMaterial("aluminum");
    expect(r.resolved_iso).toBe("N");
    expect(r.kc1_1).toBe(700);
  });

  it("resolves 'stainless' to ISO M group", () => {
    const r = speedFeedAutopilotEngine.resolveMaterial("stainless");
    expect(r.resolved_iso).toBe("M");
  });

  it("resolves 'titanium' to ISO S group", () => {
    const r = speedFeedAutopilotEngine.resolveMaterial("titanium");
    expect(r.resolved_iso).toBe("S");
  });

  it("applies hardness correction for HRC > 45", () => {
    const soft = speedFeedAutopilotEngine.resolveMaterial("steel");
    const hard = speedFeedAutopilotEngine.resolveMaterial("steel", 55);
    expect(hard.kc1_1).toBeGreaterThan(soft.kc1_1);
  });

  it("falls back to P group for unknown material", () => {
    const r = speedFeedAutopilotEngine.resolveMaterial("unobtainium");
    expect(r.resolved_iso).toBe("P");
  });

  it("resolves specific SAE grades", () => {
    expect(speedFeedAutopilotEngine.resolveMaterial("4140").resolved_iso).toBe("P");
    expect(speedFeedAutopilotEngine.resolveMaterial("7075").resolved_iso).toBe("N");
    expect(speedFeedAutopilotEngine.resolveMaterial("304").resolved_iso).toBe("M");
  });
});

// ── Tool Resolution ──────────────────────────────────────────

describe("SpeedFeedAutopilotEngine — Tool Resolution", () => {

  it("defaults 2 flutes for small diameter", () => {
    const r = speedFeedAutopilotEngine.resolveTool(4);
    expect(r.flute_count).toBe(2);
  });

  it("defaults 4 flutes for medium diameter", () => {
    const r = speedFeedAutopilotEngine.resolveTool(16);
    expect(r.flute_count).toBe(4);
  });

  it("uses explicit flute count when provided", () => {
    const r = speedFeedAutopilotEngine.resolveTool(12, 3);
    expect(r.flute_count).toBe(3);
    expect(r.confidence).toBe(0.9);
  });

  it("lower confidence when flute count is defaulted", () => {
    const r = speedFeedAutopilotEngine.resolveTool(12);
    expect(r.confidence).toBe(0.7);
  });

  it("classifies micro endmill for small diameter", () => {
    const r = speedFeedAutopilotEngine.resolveTool(2);
    expect(r.tool_type).toBe("micro_endmill");
  });

  it("classifies face mill for large diameter", () => {
    const r = speedFeedAutopilotEngine.resolveTool(63);
    expect(r.tool_type).toBe("face_mill");
  });
});

// ── Machine Resolution ───────────────────────────────────────

describe("SpeedFeedAutopilotEngine — Machine Resolution", () => {

  it("resolves known machine", () => {
    const r = speedFeedAutopilotEngine.resolveMachine("Haas VF-2");
    expect(r.max_rpm).toBe(8100);
    expect(r.confidence).toBe(0.9);
  });

  it("resolves partial match", () => {
    const r = speedFeedAutopilotEngine.resolveMachine("dmg mori dmu 50");
    expect(r.max_rpm).toBe(20000);
  });

  it("defaults to generic VMC when unknown", () => {
    const r = speedFeedAutopilotEngine.resolveMachine("unknown machine");
    expect(r.name).toBe("unknown machine");
    expect(r.confidence).toBe(0.5);
  });

  it("defaults to generic when no name", () => {
    const r = speedFeedAutopilotEngine.resolveMachine();
    expect(r.name).toBe("Generic VMC");
    expect(r.max_rpm).toBe(12000);
  });
});

// ── Speed/Feed Computation ───────────────────────────────────

describe("SpeedFeedAutopilotEngine — Computation", () => {

  it("computes positive RPM and feed for steel", () => {
    const r = speedFeedAutopilotEngine.run({
      material: "steel",
      tool_diameter_mm: 12,
      operation: "roughing",
    });
    expect(r.output.rpm).toBeGreaterThan(0);
    expect(r.output.feed_mm_min).toBeGreaterThan(0);
    expect(r.output.mrr_cm3_min).toBeGreaterThan(0);
  });

  it("RPM capped by machine max", () => {
    const r = speedFeedAutopilotEngine.run({
      material: "aluminum", // high surface speed
      tool_diameter_mm: 3,  // small diameter = very high RPM
      machine_name: "Haas VF-2", // 8100 RPM max
    });
    expect(r.output.rpm).toBeLessThanOrEqual(8100);
  });

  it("finishing has lower feed per tooth than roughing", () => {
    const rough = speedFeedAutopilotEngine.run({
      material: "steel",
      tool_diameter_mm: 12,
      flute_count: 4,
      operation: "roughing",
    });
    const finish = speedFeedAutopilotEngine.run({
      material: "steel",
      tool_diameter_mm: 12,
      flute_count: 4,
      operation: "finishing",
    });
    expect(finish.output.feed_per_tooth_mm).toBeLessThan(rough.output.feed_per_tooth_mm);
  });

  it("hardened material has lower feed", () => {
    const soft = speedFeedAutopilotEngine.run({
      material: "steel",
      tool_diameter_mm: 12,
    });
    const hard = speedFeedAutopilotEngine.run({
      material: "steel",
      tool_diameter_mm: 12,
      hardness_hrc: 55,
    });
    expect(hard.output.feed_per_tooth_mm).toBeLessThan(soft.output.feed_per_tooth_mm);
  });

  it("cutting force is positive", () => {
    const r = speedFeedAutopilotEngine.run({
      material: "steel",
      tool_diameter_mm: 12,
    });
    expect(r.output.cutting_force_N).toBeGreaterThan(0);
    expect(r.output.power_kW).toBeGreaterThan(0);
  });
});

// ── Full Chain Execution ─────────────────────────────────────

describe("SpeedFeedAutopilotEngine — Full Chain", () => {

  it("returns all chain components", () => {
    const r = speedFeedAutopilotEngine.run({
      material: "aluminum",
      tool_diameter_mm: 10,
      flute_count: 3,
      operation: "roughing",
      machine_name: "Haas VF-4",
    });
    expect(r.chain_id).toBe("speed_feed_autopilot");
    expect(r.task_class).toBe("speed_feed");
    expect(r.steps.length).toBeGreaterThanOrEqual(5);
    expect(r.material.resolved_iso).toBe("N");
    expect(r.tool.flute_count).toBe(3);
    expect(r.machine.name).toContain("Haas");
    expect(r.output.rpm).toBeGreaterThan(0);
    expect(r.safety_score).toBeGreaterThan(0);
  });

  it("status is success with full specification", () => {
    const r = speedFeedAutopilotEngine.run({
      material: "steel",
      tool_diameter_mm: 12,
      flute_count: 4,
      operation: "roughing",
      machine_name: "Haas VF-2",
    });
    expect(r.status).toBe("success");
  });

  it("status is partial with missing info", () => {
    const r = speedFeedAutopilotEngine.run({
      material: "steel",
      tool_diameter_mm: 12,
      // no flute_count, no machine → warnings
    });
    expect(r.status).toBe("partial");
    expect(r.recommendations.length).toBeGreaterThan(0);
  });

  it("includes recommendations", () => {
    const r = speedFeedAutopilotEngine.run({
      material: "steel",
      tool_diameter_mm: 12,
    });
    expect(r.recommendations.some(r =>
      r.includes("machine") || r.includes("Flute") || r.includes("limited")
    )).toBe(true);
  });

  it("safety_score between 0 and 1", () => {
    const r = speedFeedAutopilotEngine.run({
      material: "titanium",
      tool_diameter_mm: 6,
      operation: "roughing",
    });
    expect(r.safety_score).toBeGreaterThanOrEqual(0);
    expect(r.safety_score).toBeLessThanOrEqual(1);
  });

  it("duration_ms is tracked", () => {
    const r = speedFeedAutopilotEngine.run({
      material: "steel",
      tool_diameter_mm: 12,
    });
    expect(r.duration_ms).toBeGreaterThanOrEqual(0);
    expect(r.started_at).toBeTruthy();
    expect(r.completed_at).toBeTruthy();
  });
});
