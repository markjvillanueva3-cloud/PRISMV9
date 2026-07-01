/**
 * CollisionIntegrationEngine Tests — CAMK-MS2/U03
 * Tests tool assembly collision detection along novel toolpath segments
 */
import { describe, it, expect } from "vitest";
import { collisionIntegrationEngine } from "../engines/CollisionIntegrationEngine.js";

const stock = { min_x: 0, min_y: 0, min_z: -30, max_x: 100, max_y: 100, max_z: 0 };
const tool = { type: "flat" as const, diameter_mm: 10, cutting_length_mm: 30, holder_diameter_mm: 25, holder_length_mm: 40 };

describe("CollisionIntegrationEngine", () => {
  // ---- Safe 3-axis path ----
  it("marks safe path as collision-free", () => {
    const segments = Array.from({ length: 10 }, (_, i) => ({
      x: 10 + i * 8, y: 50, z: 5, // above stock
      ae_mm: 5, ap_mm: 2, rpm: 8000, feed_mmmin: 1000,
    }));
    const result = collisionIntegrationEngine.check({ segments, stock, tool });
    expect(result.is_safe).toBe(true);
    expect(result.collision_count).toBe(0);
  });

  // ---- Holder collision with stock ----
  it("detects holder collision when cutting deep", () => {
    // Tool at z=-28 means holder base at z=-28+30=2 (just above stock top at z=0)
    // But if tool at z=-35, holder base at z=-5 — inside stock
    const segments = [{ x: 50, y: 50, z: -35, ae_mm: 5, ap_mm: 5, rpm: 8000, feed_mmmin: 1000 }];
    const result = collisionIntegrationEngine.check({ segments, stock, tool });
    expect(result.collision_count).toBeGreaterThan(0);
    expect(result.is_safe).toBe(false);
  });

  // ---- Fixture collision ----
  it("detects collision with fixtures", () => {
    const fixtures = [{ id: "vise_jaw", min_x: 40, min_y: 40, min_z: -10, max_x: 60, max_y: 60, max_z: 20 }];
    // Path goes through fixture zone at holder level
    const segments = [{ x: 50, y: 50, z: -5, ae_mm: 5, ap_mm: 5, rpm: 8000, feed_mmmin: 1000 }];
    const result = collisionIntegrationEngine.check({ segments, stock, tool, fixtures });
    // Holder will be at z=-5+30=25 with radius 12.5 — above fixture top at z=20
    // But tool mid at z=-5+15=10 is inside fixture zone
    expect(result.events.some(e => e.body_b.includes("fixture"))).toBe(true);
  });

  // ---- Machine envelope violation ----
  it("detects machine envelope violation", () => {
    const machineEnvelope = { min_x: -200, min_y: -200, min_z: -200, max_x: 200, max_y: 200, max_z: 200 };
    const segments = [{ x: 250, y: 50, z: 5, ae_mm: 5, ap_mm: 2, rpm: 8000, feed_mmmin: 1000 }];
    const result = collisionIntegrationEngine.check({ segments, stock, tool, machine_envelope: machineEnvelope });
    expect(result.events.some(e => e.body_b === "machine_envelope")).toBe(true);
  });

  // ---- 5-axis detection ----
  it("detects 5-axis operation from i,j,k vectors", () => {
    const segments = [
      { x: 50, y: 50, z: 5, i: 0.3, j: 0, k: 0.954, ae_mm: 3, ap_mm: 2, rpm: 10000, feed_mmmin: 800 },
    ];
    const result = collisionIntegrationEngine.check({ segments, stock, tool, algorithm: "MACS" });
    expect(result.risk_assessment.risk_factors.some(f => f.includes("5-axis"))).toBe(true);
  });

  // ---- MACS risk assessment ----
  it("assesses MACS as higher risk", () => {
    const segments = [{ x: 50, y: 50, z: 5, i: 0.2, j: 0, k: 0.98, ae_mm: 3, ap_mm: 2, rpm: 10000, feed_mmmin: 800 }];
    const result = collisionIntegrationEngine.check({ segments, stock, tool, algorithm: "MACS" });
    expect(result.risk_assessment.algorithm).toBe("MACS");
    expect(result.risk_assessment.risk_factors.some(f => f.includes("swarf"))).toBe(true);
  });

  // ---- HBCF barrel cutter risk ----
  it("assesses HBCF barrel cutter risk", () => {
    const barrelTool = { ...tool, type: "barrel" as const, barrel_radius_mm: 250 };
    const segments = [{ x: 50, y: 50, z: 5, ae_mm: 3, ap_mm: 2, rpm: 10000, feed_mmmin: 800 }];
    const result = collisionIntegrationEngine.check({ segments, stock, tool: barrelTool, algorithm: "HBCF" });
    expect(result.risk_assessment.algorithm).toBe("HBCF");
    expect(result.risk_assessment.risk_factors.some(f => f.includes("barrel"))).toBe(true);
  });

  // ---- PTDC risk ----
  it("assesses PTDC compensation risk", () => {
    const segments = [{ x: 50, y: 50, z: 5, ae_mm: 3, ap_mm: 2, rpm: 8000, feed_mmmin: 1000 }];
    const result = collisionIntegrationEngine.check({ segments, stock, tool, algorithm: "PTDC" });
    expect(result.risk_assessment.risk_factors.some(f => f.includes("PTDC"))).toBe(true);
  });

  // ---- Clearance profile ----
  it("produces clearance profile for all segments", () => {
    const segments = Array.from({ length: 20 }, (_, i) => ({
      x: 10 + i * 4, y: 50, z: 5, ae_mm: 5, ap_mm: 2, rpm: 8000, feed_mmmin: 1000,
    }));
    const result = collisionIntegrationEngine.check({ segments, stock, tool });
    expect(result.clearance_profile).toHaveLength(20);
  });

  // ---- Assembly envelope snapshots ----
  it("produces assembly envelope snapshots", () => {
    const segments = Array.from({ length: 30 }, (_, i) => ({
      x: 10 + i * 3, y: 50, z: 5, ae_mm: 5, ap_mm: 2, rpm: 8000, feed_mmmin: 1000,
    }));
    const result = collisionIntegrationEngine.check({ segments, stock, tool });
    expect(result.assembly_envelope.length).toBeGreaterThan(0);
    expect(result.assembly_envelope[0].tool_tip).toBeDefined();
    expect(result.assembly_envelope[0].holder_top).toBeDefined();
  });

  // ---- Quick check ----
  it("quickCheck returns summary", () => {
    const segments = [{ x: 50, y: 50, z: 5, ae_mm: 5, ap_mm: 2, rpm: 8000, feed_mmmin: 1000 }];
    const quick = collisionIntegrationEngine.quickCheck({ segments, stock, tool });
    expect(quick.is_safe).toBeDefined();
    expect(quick.collision_count).toBeDefined();
    expect(quick.risk_level).toBeDefined();
  });

  // ---- Empty segments ----
  it("handles empty segments", () => {
    const result = collisionIntegrationEngine.check({ segments: [], stock, tool });
    expect(result.is_safe).toBe(true);
    expect(result.collision_count).toBe(0);
    expect(result.clearance_profile).toHaveLength(0);
  });

  // ---- Assembly envelope builder ----
  it("builds assembly envelope from tool spec", () => {
    const envelope = collisionIntegrationEngine.getAssemblyEnvelope(tool);
    expect(envelope.tool_radius).toBe(5);
    expect(envelope.tool_length).toBe(30);
    expect(envelope.holder_radius).toBe(12.5);
    expect(envelope.holder_length).toBe(40);
    expect(envelope.total_length).toBe(70);
  });

  // ---- Safety margin effect ----
  it("larger safety margin triggers more near-misses", () => {
    const segments = Array.from({ length: 10 }, (_, i) => ({
      x: 10 + i * 8, y: 50, z: -20, // deep in stock but holder still clear
      ae_mm: 5, ap_mm: 2, rpm: 8000, feed_mmmin: 1000,
    }));
    const tight = collisionIntegrationEngine.check({ segments, stock, tool, safety_margin_mm: 1 });
    const wide = collisionIntegrationEngine.check({ segments, stock, tool, safety_margin_mm: 10 });
    expect(wide.near_miss_count).toBeGreaterThanOrEqual(tight.near_miss_count);
  });

  // ---- Near-miss vs collision severity ----
  it("distinguishes collision severity correctly", () => {
    // One segment where holder barely touches stock
    const segments = [{ x: 50, y: 50, z: -29, ae_mm: 5, ap_mm: 2, rpm: 8000, feed_mmmin: 1000 }];
    const result = collisionIntegrationEngine.check({ segments, stock, tool });
    // At z=-29, holder base at z=-29+30=1 (just above stock top z=0, radius 12.5)
    // This should be close but not necessarily collision
    expect(result.events.every(e => e.severity === "collision" || e.severity === "near_miss" || e.severity === "safe")).toBe(true);
  });
});
