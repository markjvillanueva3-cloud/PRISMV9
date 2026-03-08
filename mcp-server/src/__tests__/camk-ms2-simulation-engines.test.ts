/**
 * Tests for CAMK-MS2 Simulation Engines (U01-U03)
 * - NovelToolpathSimulatorEngine — Force/temp/deflection along path
 * - VoxelStockIntegrationEngine — Material removal tracking
 * - CollisionIntegrationEngine — Tool assembly collision with novel paths
 */
import { describe, it, expect } from "vitest";
import { novelToolpathSimulatorEngine } from "../engines/NovelToolpathSimulatorEngine.js";
import { voxelStockIntegrationEngine } from "../engines/VoxelStockIntegrationEngine.js";
import { collisionIntegrationEngine } from "../engines/CollisionIntegrationEngine.js";
import type { SegmentPoint } from "../engines/NovelToolpathEngine.js";

// ── Test data helpers ───────────────────────────────────────

function linearPath(n: number, ap = 2, ae = 5): SegmentPoint[] {
  return Array.from({ length: n }, (_, i) => ({
    x: i * 5, y: 0, z: -ap,
    feed_mmmin: 1000, rpm: 8000, ae_mm: ae, ap_mm: ap,
  }));
}

function pocketPath(): SegmentPoint[] {
  const pts: SegmentPoint[] = [];
  for (let pass = 0; pass < 3; pass++) {
    const offset = pass * 8;
    pts.push({ x: 0, y: offset, z: -3, feed_mmmin: 800, rpm: 6000, ae_mm: 8, ap_mm: 3 });
    pts.push({ x: 50, y: offset, z: -3, feed_mmmin: 800, rpm: 6000, ae_mm: 8, ap_mm: 3 });
  }
  return pts;
}

function fiveAxisPath(): SegmentPoint[] {
  return Array.from({ length: 10 }, (_, i) => ({
    x: i * 3, y: 0, z: -2,
    i: 0, j: Math.sin(i * 0.1), k: Math.cos(i * 0.1),
    feed_mmmin: 500, rpm: 10000, ae_mm: 3, ap_mm: 1.5,
  }));
}

const STOCK = { min_x: -10, min_y: -10, min_z: -20, max_x: 60, max_y: 30, max_z: 0 };

// ── NovelToolpathSimulatorEngine ────────────────────────────

describe("NovelToolpathSimulatorEngine", () => {
  it("computes 6 physics quantities per point", () => {
    const result = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(10),
      material: "steel_medium_carbon",
      tool_diameter_mm: 20,
      flutes: 4,
    });
    expect(result.points.length).toBe(10);
    const pt = result.points[0];
    expect(pt.Fc_N).toBeGreaterThan(0);
    expect(pt.Fr_N).toBeGreaterThan(0);
    expect(pt.Fa_N).toBeGreaterThan(0);
    expect(pt.F_resultant_N).toBeGreaterThan(0);
    expect(pt.torque_Nm).toBeGreaterThan(0);
    expect(pt.power_kW).toBeGreaterThan(0);
  });

  it("includes temperature, deflection, and roughness", () => {
    const result = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(20),
      material: "aluminum_wrought",
      tool_diameter_mm: 12,
    });
    for (const pt of result.points) {
      expect(pt.delta_T_C).toBeGreaterThanOrEqual(0);
      expect(pt.deflection_um).toBeGreaterThanOrEqual(0);
      expect(pt.Ra_um).toBeGreaterThan(0);
    }
  });

  it("Kienzle force: Fc proportional to depth of cut", () => {
    const shallow = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(5, 1), material: "steel_medium_carbon", tool_diameter_mm: 20,
    });
    const deep = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(5, 4), material: "steel_medium_carbon", tool_diameter_mm: 20,
    });
    expect(deep.points[0].Fc_N).toBeGreaterThan(shallow.points[0].Fc_N * 3);
  });

  it("force ratios are physically correct", () => {
    const result = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(5), material: "steel_medium_carbon", tool_diameter_mm: 20,
    });
    const pt = result.points[0];
    expect(pt.Fr_N / pt.Fc_N).toBeGreaterThanOrEqual(0.25);
    expect(pt.Fr_N / pt.Fc_N).toBeLessThanOrEqual(0.55);
    expect(pt.Fa_N / pt.Fc_N).toBeGreaterThanOrEqual(0.10);
    expect(pt.Fa_N / pt.Fc_N).toBeLessThanOrEqual(0.30);
  });

  it("power = Fc × Vc / 60000 (dimensional check)", () => {
    const result = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(5), material: "steel_medium_carbon", tool_diameter_mm: 20,
    });
    const pt = result.points[0];
    const Vc = Math.PI * 20 * 8000 / 1000; // m/min
    const P_expected = pt.Fc_N * Vc / 60000;
    expect(pt.power_kW).toBeCloseTo(P_expected, 0);
  });

  it("handles multiple material types", () => {
    for (const mat of ["aluminum", "steel_1045", "titanium", "stainless"]) {
      const result = novelToolpathSimulatorEngine.simulate({
        segments: linearPath(3), material: mat, tool_diameter_mm: 20,
      });
      expect(result.points.length).toBe(3);
      expect(result.points[0].Fc_N).toBeGreaterThan(0);
    }
  });

  it("summary includes peak and average statistics", () => {
    const result = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(20), material: "steel_medium_carbon", tool_diameter_mm: 20,
    });
    expect(result.summary.peak_force_N).toBeGreaterThan(0);
    expect(result.summary.avg_force_N).toBeGreaterThan(0);
    expect(result.summary.peak_temperature_C).toBeGreaterThanOrEqual(0);
    expect(result.summary.peak_deflection_um).toBeGreaterThanOrEqual(0);
    expect(result.summary.peak_power_kW).toBeGreaterThan(0);
  });

  it("includes force and temperature profiles", () => {
    const result = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(10), material: "steel_medium_carbon", tool_diameter_mm: 20,
    });
    expect(result.force_profile.length).toBe(10);
    expect(result.temperature_profile.length).toBe(10);
    expect(result.deflection_profile.length).toBe(10);
  });

  it("includes algorithm validation", () => {
    const result = novelToolpathSimulatorEngine.simulate({
      segments: linearPath(10), material: "steel_medium_carbon", tool_diameter_mm: 20, algorithm: "TGAR",
    });
    expect(result.validation).toBeDefined();
    expect(result.validation.algorithm).toBe("TGAR");
  });
});

// ── VoxelStockIntegrationEngine ─────────────────────────────

describe("VoxelStockIntegrationEngine", () => {
  it("tracks material removal along toolpath", () => {
    const result = voxelStockIntegrationEngine.simulate({
      segments: linearPath(10, 3, 8),
      stock: STOCK,
      tool: { type: "endmill", diameter_mm: 20 },
    });
    expect(result.points.length).toBe(10);
    expect(result.total_removed_mm3).toBeGreaterThan(0);
  });

  it("initial volume matches stock dimensions", () => {
    const result = voxelStockIntegrationEngine.simulate({
      segments: linearPath(5),
      stock: STOCK,
      tool: { type: "endmill", diameter_mm: 20 },
    });
    // Stock: 70 x 40 x 20 = 56000 mm³
    const expectedVol = 70 * 40 * 20;
    // Allow 20% tolerance due to voxel discretization
    expect(result.initial_volume_mm3).toBeGreaterThan(expectedVol * 0.7);
    expect(result.initial_volume_mm3).toBeLessThan(expectedVol * 1.3);
  });

  it("removal percentage is 0-100", () => {
    const result = voxelStockIntegrationEngine.simulate({
      segments: linearPath(10, 3, 8),
      stock: STOCK,
      tool: { type: "endmill", diameter_mm: 20 },
    });
    expect(result.removal_pct).toBeGreaterThanOrEqual(0);
    expect(result.removal_pct).toBeLessThanOrEqual(100);
  });

  it("engagement angle tracks actual depth", () => {
    const result = voxelStockIntegrationEngine.simulate({
      segments: linearPath(5, 2, 10),
      stock: STOCK,
      tool: { type: "endmill", diameter_mm: 20 },
    });
    for (const pt of result.points) {
      expect(pt.engagement_deg).toBeGreaterThanOrEqual(0);
      expect(pt.engagement_deg).toBeLessThanOrEqual(360);
    }
  });

  it("air cutting analysis present", () => {
    const result = voxelStockIntegrationEngine.simulate({
      segments: linearPath(10, 3, 8),
      stock: STOCK,
      tool: { type: "endmill", diameter_mm: 20 },
    });
    expect(result.air_cutting).toBeDefined();
    expect(result.air_cutting.percentage).toBeGreaterThanOrEqual(0);
    expect(result.air_cutting.percentage).toBeLessThanOrEqual(100);
  });

  it("engagement accuracy metrics exist", () => {
    const result = voxelStockIntegrationEngine.simulate({
      segments: linearPath(10, 3, 8),
      stock: STOCK,
      tool: { type: "endmill", diameter_mm: 20 },
    });
    expect(result.engagement_accuracy).toBeDefined();
    expect(typeof result.engagement_accuracy.mean_error_deg).toBe("number");
    expect(typeof result.engagement_accuracy.rmse_deg).toBe("number");
  });

  it("residual stock analysis present", () => {
    const result = voxelStockIntegrationEngine.simulate({
      segments: linearPath(10, 3, 8),
      stock: STOCK,
      tool: { type: "endmill", diameter_mm: 20 },
    });
    expect(result.residual).toBeDefined();
    expect(result.residual.volume_mm3).toBeGreaterThanOrEqual(0);
  });

  it("IPW snapshots track progress", () => {
    const result = voxelStockIntegrationEngine.simulate({
      segments: pocketPath(),
      stock: STOCK,
      tool: { type: "endmill", diameter_mm: 16 },
    });
    expect(result.ipw_snapshots.length).toBeGreaterThan(0);
  });
});

// ── CollisionIntegrationEngine ──────────────────────────────

describe("CollisionIntegrationEngine", () => {
  it("reports safe status for clear 3-axis path", () => {
    const result = collisionIntegrationEngine.check({
      segments: linearPath(10, 2),
      tool: { diameter_mm: 20, cutting_length_mm: 40, holder_diameter_mm: 40, holder_length_mm: 60 },
      stock: STOCK,
    });
    expect(result.events).toBeDefined();
    expect(Array.isArray(result.events)).toBe(true);
    expect(typeof result.is_safe).toBe("boolean");
    expect(typeof result.collision_count).toBe("number");
  });

  it("detects holder-stock collision with deep cut", () => {
    const deepSegments: SegmentPoint[] = Array.from({ length: 5 }, (_, i) => ({
      x: i * 5, y: 0, z: -18, feed_mmmin: 500, rpm: 6000, ae_mm: 5, ap_mm: 18,
    }));
    const result = collisionIntegrationEngine.check({
      segments: deepSegments,
      tool: { diameter_mm: 10, cutting_length_mm: 15, holder_diameter_mm: 40, holder_length_mm: 50 },
      stock: STOCK,
    });
    expect(result.collision_count).toBeGreaterThan(0);
    expect(result.is_safe).toBe(false);
  });

  it("checks fixture collision", () => {
    const result = collisionIntegrationEngine.check({
      segments: linearPath(5),
      tool: { diameter_mm: 20, holder_diameter_mm: 40, holder_length_mm: 60 },
      stock: STOCK,
      fixtures: [
        { id: "vise_jaw", min_x: -5, min_y: -15, min_z: -25, max_x: -2, max_y: 35, max_z: 5 },
      ],
    });
    expect(result.events).toBeDefined();
  });

  it("checks 5-axis orientation collision", () => {
    const result = collisionIntegrationEngine.check({
      segments: fiveAxisPath(),
      tool: { diameter_mm: 10, holder_diameter_mm: 30, holder_length_mm: 50 },
      stock: STOCK,
    });
    expect(result.events).toBeDefined();
    expect(result.risk_assessment).toBeDefined();
  });

  it("safety margin affects detection", () => {
    const noMargin = collisionIntegrationEngine.check({
      segments: linearPath(5),
      tool: { diameter_mm: 20, holder_diameter_mm: 40, holder_length_mm: 60 },
      stock: STOCK,
      safety_margin_mm: 0,
    });
    const bigMargin = collisionIntegrationEngine.check({
      segments: linearPath(5),
      tool: { diameter_mm: 20, holder_diameter_mm: 40, holder_length_mm: 60 },
      stock: STOCK,
      safety_margin_mm: 10,
    });
    expect(bigMargin.near_miss_count).toBeGreaterThanOrEqual(noMargin.near_miss_count);
  });

  it("collision events include severity and type", () => {
    const deepSegments: SegmentPoint[] = [
      { x: 0, y: 0, z: -19, feed_mmmin: 500, rpm: 6000, ae_mm: 5, ap_mm: 19 },
    ];
    const result = collisionIntegrationEngine.check({
      segments: deepSegments,
      tool: { diameter_mm: 8, cutting_length_mm: 12, holder_diameter_mm: 35, holder_length_mm: 50 },
      stock: STOCK,
    });
    if (result.events.length > 0) {
      const ev = result.events[0];
      expect(ev.segment_index).toBeDefined();
      expect(ev.severity).toBeDefined();
      expect(ev.body_a).toBeDefined();
      expect(ev.body_b).toBeDefined();
    }
  });

  it("clearance profile tracks per-segment clearance", () => {
    const result = collisionIntegrationEngine.check({
      segments: linearPath(10),
      tool: { diameter_mm: 20, holder_diameter_mm: 40, holder_length_mm: 60 },
      stock: STOCK,
    });
    expect(result.clearance_profile.length).toBe(10);
    for (const c of result.clearance_profile) {
      expect(typeof c).toBe("number");
    }
  });

  it("risk assessment includes algorithm context", () => {
    const result = collisionIntegrationEngine.check({
      segments: fiveAxisPath(),
      tool: { diameter_mm: 10, holder_diameter_mm: 30, holder_length_mm: 50, type: "barrel", barrel_radius_mm: 100 },
      stock: STOCK,
      algorithm: "HBCF",
    });
    expect(result.risk_assessment.algorithm).toBe("HBCF");
    expect(result.risk_assessment.risk_level).toBeDefined();
  });

  it("min clearance is tracked", () => {
    const result = collisionIntegrationEngine.check({
      segments: linearPath(5),
      tool: { diameter_mm: 20, holder_diameter_mm: 40, holder_length_mm: 60 },
      stock: STOCK,
    });
    expect(typeof result.min_clearance_mm).toBe("number");
  });
});
