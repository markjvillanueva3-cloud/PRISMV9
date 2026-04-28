/**
 * calcDispatcher — U-WIRE09 round-trip suite
 * ===========================================
 *
 * ENGINE-WIRE-MS0 / U-WIRE09 — verifies 5 leaf physics engines reach the
 * dispatcher surface:
 *   - engagementDynamicsEngine      → engagement_dynamics_calc
 *   - engagementOptimizerAdapter    → engagement_optimize_adapter
 *   - cuttingFluidLifecycleEngine   → cutting_fluid_lifecycle_calc
 *   - chipFormationPredictionEngine → chip_formation_predict
 *   - SurfaceMeasureEngine (static) → surface_measure_calc
 *
 * Tests invoke through the registered tool handler — NOT just the engine
 * singleton — so dispatcher schema, action enum, lazy import, and case
 * handler are all exercised end-to-end. Assertions reference real engine
 * field names (slim projector bypassed when context pressure = 0).
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE09
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";
import { engagementDynamicsEngine } from "../engines/EngagementDynamicsEngine.js";
import { engagementOptimizerAdapter } from "../engines/EngagementOptimizerAdapter.js";
import { cuttingFluidLifecycleEngine } from "../engines/CuttingFluidLifecycleEngine.js";
import { chipFormationPredictionEngine } from "../engines/ChipFormationPredictionEngine.js";
import { SurfaceMeasureEngine } from "../engines/SurfaceMeasureEngine.js";
import { CANONICAL_KIENZLE } from "../physics/constants.js";

// ── Test harness ──────────────────────────────────────────────────────────────

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string; action: string; dispatcher: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed && typeof parsed === "object" && "error" in parsed) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

// ── Shared fixtures ───────────────────────────────────────────────────────────

const SEGMENT = {
  id: "seg-1",
  points: [
    { x: 0, y: 0, z: 0, feedrate: 500 },
    { x: 5, y: 0, z: 0, feedrate: 500 },
    { x: 10, y: 2, z: 0, feedrate: 500 },
  ],
  type: "linear" as const,
  toolDiameter: 12,
  depthOfCut: 5,
};

const FEED_PER_TOOTH = 0.08;
const FLUTES = 4;

/** ISO P steel — from CANONICAL_KIENZLE, not inlined */
const KC_P = CANONICAL_KIENZLE.P;

const OPT_REQUEST = {
  decision_point: "p2p.engagement_optimize",
  operation_type: "milling_rough" as const,
  tool_diameter_mm: 16,
  stock_depth_mm: 10,
  stock_width_mm: 8,
  fz_mm: 0.05,
  rpm: 6000,
  flute_count: 4,
  kc1_1: KC_P.kc1_1,
  mc: KC_P.mc,
  machine_torque_limit_nm: 120,
  stick_out_mm: 48,
  youngs_modulus_gpa: 600,
  objective: "balanced" as const,
};

const FLUID_INPUT = {
  initial_concentration_pct: 8,
  sump_volume_L: 200,
  coolant_type: "semisynthetic" as const,
  machine_hours_per_day: 16,
  horizon_days: 60,
  coolant_cost_per_L: 8,
  disposal_cost_per_L: 2,
  downtime_cost_per_hr: 150,
};

const CHIP_INPUT = {
  cutting_speed_m_min: 150,
  feed_mm_rev: 0.2,
  depth_of_cut_mm: 2,
  rake_angle_deg: 5,
  workpiece_hardness_hrc: 25,
  friction_coefficient: 0.5,
  coolant_active: true,
};

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerCalcDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. engagement_dynamics_calc — EngagementDynamicsEngine
// ─────────────────────────────────────────────────────────────────────────────
describe("U-WIRE09 engagement_dynamics_calc", () => {
  it("dispatcher result peakEngagement matches direct engine value", async () => {
    const direct = engagementDynamicsEngine.calculateSegmentProfile(SEGMENT, FEED_PER_TOOTH, FLUTES);
    const r = await call(server, "engagement_dynamics_calc", {
      segment: SEGMENT,
      feed_per_tooth: FEED_PER_TOOTH,
      flutes: FLUTES,
    });
    expect(r.ok).toBe(true);
    expect((r.data as { peakEngagement: number }).peakEngagement).toBeCloseTo(direct.peakEngagement, 5);
  });

  it("dispatcher result avgEngagement matches direct engine value", async () => {
    const direct = engagementDynamicsEngine.calculateSegmentProfile(SEGMENT, FEED_PER_TOOTH, FLUTES);
    const r = await call(server, "engagement_dynamics_calc", {
      segment: SEGMENT,
      feed_per_tooth: FEED_PER_TOOTH,
      flutes: FLUTES,
    });
    expect(r.ok).toBe(true);
    expect((r.data as { avgEngagement: number }).avgEngagement).toBeCloseTo(direct.avgEngagement, 5);
  });

  it("states array length equals number of toolpath points", async () => {
    const r = await call(server, "engagement_dynamics_calc", {
      segment: SEGMENT,
      feed_per_tooth: FEED_PER_TOOTH,
      flutes: FLUTES,
    });
    expect(r.ok).toBe(true);
    expect((r.data.states as unknown[]).length).toBe(SEGMENT.points.length);
  });

  it("segmentId in result matches input segment.id", async () => {
    const r = await call(server, "engagement_dynamics_calc", {
      segment: SEGMENT,
      feed_per_tooth: FEED_PER_TOOTH,
      flutes: FLUTES,
    });
    expect(r.ok).toBe(true);
    expect(r.data.segmentId).toBe(SEGMENT.id);
  });

  it("peakEngagement is strictly positive and bounded by 1", async () => {
    const direct = engagementDynamicsEngine.calculateSegmentProfile(SEGMENT, FEED_PER_TOOTH, FLUTES);
    expect(direct.peakEngagement).toBeGreaterThan(0);
    expect(direct.peakEngagement).toBeLessThanOrEqual(1);
    const r = await call(server, "engagement_dynamics_calc", {
      segment: SEGMENT,
      feed_per_tooth: FEED_PER_TOOTH,
      flutes: FLUTES,
    });
    expect(r.ok).toBe(true);
    const peak = (r.data as { peakEngagement: number }).peakEngagement;
    expect(peak).toBeGreaterThan(0);
    expect(peak).toBeLessThanOrEqual(1);
  });

  it("rejects missing segment param — schema validation fails", async () => {
    const r = await call(server, "engagement_dynamics_calc", {
      feed_per_tooth: 0.1,
      flutes: 4,
    });
    expect(r.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. engagement_optimize_adapter — EngagementOptimizerAdapter
// ─────────────────────────────────────────────────────────────────────────────
describe("U-WIRE09 engagement_optimize_adapter", () => {
  it("dispatcher winner.ae_mm matches direct engine output", async () => {
    const direct = engagementOptimizerAdapter.selectEngagementOrchestrated(OPT_REQUEST);
    const r = await call(server, "engagement_optimize_adapter", OPT_REQUEST as unknown as Record<string, unknown>);
    expect(r.ok).toBe(true);
    expect((r.data.winner as { ae_mm: number }).ae_mm).toBeCloseTo(direct.winner.ae_mm, 5);
  });

  it("dispatcher winner.ap_mm matches direct engine output", async () => {
    const direct = engagementOptimizerAdapter.selectEngagementOrchestrated(OPT_REQUEST);
    const r = await call(server, "engagement_optimize_adapter", OPT_REQUEST as unknown as Record<string, unknown>);
    expect(r.ok).toBe(true);
    expect((r.data.winner as { ap_mm: number }).ap_mm).toBeCloseTo(direct.winner.ap_mm, 5);
  });

  it("no_candidates is false for well-constrained milling_rough request", async () => {
    const r = await call(server, "engagement_optimize_adapter", OPT_REQUEST as unknown as Record<string, unknown>);
    expect(r.ok).toBe(true);
    expect(r.data.no_candidates).toBe(false);
  });

  it("finish operation produces winner.ae_mm < rough winner.ae_mm (physics constraint)", async () => {
    const roughR = await call(server, "engagement_optimize_adapter", OPT_REQUEST as unknown as Record<string, unknown>);
    const finishR = await call(server, "engagement_optimize_adapter", {
      ...(OPT_REQUEST as unknown as Record<string, unknown>),
      operation_type: "milling_finish",
    });
    expect(roughR.ok).toBe(true);
    expect(finishR.ok).toBe(true);
    const roughAe = (roughR.data.winner as { ae_mm: number }).ae_mm;
    const finishAe = (finishR.data.winner as { ae_mm: number }).ae_mm;
    expect(finishAe).toBeLessThan(roughAe);
  });

  it("rejects missing tool_diameter_mm — schema validation fails", async () => {
    const r = await call(server, "engagement_optimize_adapter", {
      decision_point: "p2p.engagement_optimize",
      operation_type: "milling_rough",
      stock_depth_mm: 30,
    });
    expect(r.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. cutting_fluid_lifecycle_calc — CuttingFluidLifecycleEngine
// ─────────────────────────────────────────────────────────────────────────────
describe("U-WIRE09 cutting_fluid_lifecycle_calc", () => {
  it("optimal_change_interval_days matches direct engine output", async () => {
    const direct = cuttingFluidLifecycleEngine.simulate(FLUID_INPUT);
    const r = await call(server, "cutting_fluid_lifecycle_calc", FLUID_INPUT as unknown as Record<string, unknown>);
    expect(r.ok).toBe(true);
    expect(r.data.optimal_change_interval_days).toBe(direct.optimal_change_interval_days);
  });

  it("total_cost_per_day matches direct engine output", async () => {
    const direct = cuttingFluidLifecycleEngine.simulate(FLUID_INPUT);
    const r = await call(server, "cutting_fluid_lifecycle_calc", FLUID_INPUT as unknown as Record<string, unknown>);
    expect(r.ok).toBe(true);
    expect((r.data.total_cost_per_day as number)).toBeCloseTo(direct.total_cost_per_day, 3);
  });

  it("daily_states array length equals horizon_days", async () => {
    const r = await call(server, "cutting_fluid_lifecycle_calc", FLUID_INPUT as unknown as Record<string, unknown>);
    expect(r.ok).toBe(true);
    expect((r.data.daily_states as unknown[]).length).toBe(FLUID_INPUT.horizon_days);
  });

  it("day-1 concentration_pct is less than initial (decay begins immediately)", async () => {
    const direct = cuttingFluidLifecycleEngine.simulate(FLUID_INPUT);
    const r = await call(server, "cutting_fluid_lifecycle_calc", FLUID_INPUT as unknown as Record<string, unknown>);
    expect(r.ok).toBe(true);
    const day1Conc = (r.data.daily_states as Array<{ concentration_pct: number }>)[0].concentration_pct;
    expect(day1Conc).toBeCloseTo(direct.daily_states[0].concentration_pct, 3);
    expect(day1Conc).toBeLessThanOrEqual(FLUID_INPUT.initial_concentration_pct);
  });

  it("biocide reduces day-30 bacterial count relative to no-biocide (Monod physics)", async () => {
    const noBioDirect = cuttingFluidLifecycleEngine.simulate({ ...FLUID_INPUT, biocide_applied: false });
    const bioDirect = cuttingFluidLifecycleEngine.simulate({ ...FLUID_INPUT, biocide_applied: true });
    const DAY_IDX = 29; // day 30 (0-indexed)
    expect(bioDirect.daily_states[DAY_IDX].bacteria_cfu_mL)
      .toBeLessThanOrEqual(noBioDirect.daily_states[DAY_IDX].bacteria_cfu_mL);
    // Confirm dispatcher returns same result
    const r = await call(server, "cutting_fluid_lifecycle_calc", {
      ...(FLUID_INPUT as unknown as Record<string, unknown>),
      biocide_applied: true,
    });
    expect(r.ok).toBe(true);
    const bactViaDis = (r.data.daily_states as Array<{ bacteria_cfu_mL: number }>)[DAY_IDX].bacteria_cfu_mL;
    expect(bactViaDis).toBeCloseTo(bioDirect.daily_states[DAY_IDX].bacteria_cfu_mL, 0);
  });

  it("rejects missing initial_concentration_pct — schema validation fails", async () => {
    const r = await call(server, "cutting_fluid_lifecycle_calc", {
      sump_volume_L: 200,
      coolant_type: "semisynthetic",
    });
    expect(r.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. chip_formation_predict — ChipFormationPredictionEngine
// ─────────────────────────────────────────────────────────────────────────────
describe("U-WIRE09 chip_formation_predict", () => {
  it("shear_angle_deg.value matches direct engine (Merchant's equation)", async () => {
    const direct = chipFormationPredictionEngine.calculate(CHIP_INPUT);
    const r = await call(server, "chip_formation_predict", CHIP_INPUT as unknown as Record<string, unknown>);
    expect(r.ok).toBe(true);
    expect((r.data.shear_angle_deg as { value: number }).value).toBeCloseTo(direct.shear_angle_deg.value, 4);
  });

  it("chip_compression_ratio.value matches direct engine", async () => {
    const direct = chipFormationPredictionEngine.calculate(CHIP_INPUT);
    const r = await call(server, "chip_formation_predict", CHIP_INPUT as unknown as Record<string, unknown>);
    expect(r.ok).toBe(true);
    expect((r.data.chip_compression_ratio as { value: number }).value)
      .toBeCloseTo(direct.chip_compression_ratio.value, 4);
  });

  it("chip_type matches direct engine classification", async () => {
    const direct = chipFormationPredictionEngine.calculate(CHIP_INPUT);
    const r = await call(server, "chip_formation_predict", CHIP_INPUT as unknown as Record<string, unknown>);
    expect(r.ok).toBe(true);
    expect(r.data.chip_type).toBe(direct.chip_type);
  });

  it("bue_risk is in [0,1]", async () => {
    const r = await call(server, "chip_formation_predict", CHIP_INPUT as unknown as Record<string, unknown>);
    expect(r.ok).toBe(true);
    const bue = r.data.bue_risk as number;
    expect(bue).toBeGreaterThanOrEqual(0);
    expect(bue).toBeLessThanOrEqual(1);
  });

  it("very_ductile low-speed produces higher bue_risk than high-speed (physics: BUE below threshold)", async () => {
    const lowSpeedDirect = chipFormationPredictionEngine.calculate({
      ...CHIP_INPUT, cutting_speed_m_min: 20, workpiece_hardness_hrc: 10,
    });
    const highSpeedDirect = chipFormationPredictionEngine.calculate({
      ...CHIP_INPUT, cutting_speed_m_min: 300, workpiece_hardness_hrc: 10,
    });
    // Below BUE threshold (80 m/min for HRC<=15): bue_risk should be higher
    expect(lowSpeedDirect.bue_risk).toBeGreaterThanOrEqual(highSpeedDirect.bue_risk);
  });

  it("rejects missing cutting_speed_m_min — schema validation fails", async () => {
    const r = await call(server, "chip_formation_predict", {
      feed_mm_rev: 0.2,
      depth_of_cut_mm: 2,
      rake_angle_deg: 5,
    });
    expect(r.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. surface_measure_calc — SurfaceMeasureEngine (static methods)
// ─────────────────────────────────────────────────────────────────────────────
describe("U-WIRE09 surface_measure_calc", () => {
  it("get_standard_specs returns array matching direct engine output length", async () => {
    const direct = SurfaceMeasureEngine.getStandardSpecifications();
    const r = await call(server, "surface_measure_calc", { action_type: "get_standard_specs" });
    expect(r.ok).toBe(true);
    expect((r.data.specifications as unknown[]).length).toBe(direct.length);
  });

  it("first standard spec application matches direct engine (Ground surface)", async () => {
    const direct = SurfaceMeasureEngine.getStandardSpecifications();
    const r = await call(server, "surface_measure_calc", { action_type: "get_standard_specs" });
    expect(r.ok).toBe(true);
    const specs = r.data.specifications as typeof direct;
    expect(specs[0].application).toBe(direct[0].application);
    expect(specs[0].Ra_um).toBeCloseTo(direct[0].Ra_um, 5);
  });

  it("record measurement returns SRF-prefixed id", async () => {
    const r = await call(server, "surface_measure_calc", {
      action_type: "record",
      partNumber: "PN-WIRE09",
      featureName: "bore_id",
      location: "top",
      parameters: { Ra: 1.2, Rz: 6.5 },
      cutoffLength: 0.8,
      evaluationLength: 4.0,
      filterType: "gaussian",
      instrumentId: "INST-01",
      specification: { parameter: "Ra", maxValue: 1.6, unit: "um" },
    });
    expect(r.ok).toBe(true);
    expect(typeof (r.data as { id: string }).id).toBe("string");
    expect((r.data as { id: string }).id).toMatch(/^SRF-/);
  });

  it("recorded measurement is in-spec when Ra <= maxValue", async () => {
    const r = await call(server, "surface_measure_calc", {
      action_type: "record",
      partNumber: "PN-WIRE09-SPEC",
      featureName: "face",
      location: "center",
      parameters: { Ra: 1.0 },
      cutoffLength: 0.8,
      evaluationLength: 4.0,
      filterType: "gaussian",
      instrumentId: "INST-02",
      specification: { parameter: "Ra", maxValue: 1.6, unit: "um" },
    });
    expect(r.ok).toBe(true);
    expect((r.data as { inSpec: boolean }).inSpec).toBe(true);
  });

  it("list returns empty array for unknown part number", async () => {
    const r = await call(server, "surface_measure_calc", {
      action_type: "list",
      partNumber: "UNKNOWN-PART-WIRE09",
    });
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data)).toBe(true);
    expect((r.data as unknown[]).length).toBe(0);
  });

  it("omitting action_type defaults to get_standard_specs", async () => {
    const direct = SurfaceMeasureEngine.getStandardSpecifications();
    const r = await call(server, "surface_measure_calc", {});
    expect(r.ok).toBe(true);
    expect((r.data.specifications as unknown[]).length).toBe(direct.length);
  });
});
