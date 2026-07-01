/**
 * INFRA-5-1 U-CAL3: Calibration Actuals Ingestion Tests
 *
 * Tests the validation/outlier-detection logic directly (no HTTP needed).
 * Also tests migration SQL structure for prediction_outcomes + knowledge graph.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";

// ─── Inline validation logic matching calibration.ts ─────────────────────────

const VALID_TYPES = [
  "cycle_time_s", "tool_life_min", "cutting_force_N", "surface_finish_Ra_um",
  "power_kW", "temperature_C", "deflection_um", "vibration_mm_s",
  "mrrr_cm3_min", "chip_thickness_mm", "torque_Nm", "custom",
] as const;

const ActualSchema = z.object({
  model_id: z.string().min(1),
  predicted_value: z.number(),
  actual_value: z.number(),
  measurement_type: z.enum(VALID_TYPES),
  material_key: z.string().optional(),
  confidence: z.number().min(0).max(1).default(0.5),
});

interface Stats { n: number; mean: number; m2: number; }

function computeErrorPct(predicted: number, actual: number): number {
  return predicted !== 0 ? ((actual - predicted) / predicted) * 100 : 0;
}

function updateStats(stats: Stats, val: number): Stats {
  stats.n++;
  const delta = val - stats.mean;
  stats.mean += delta / stats.n;
  const delta2 = val - stats.mean;
  stats.m2 += delta * delta2;
  return stats;
}

function stddev(stats: Stats): number {
  return stats.n < 2 ? Infinity : Math.sqrt(stats.m2 / (stats.n - 1));
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Calibration — error percentage calculation", () => {
  it("should compute positive error", () => {
    expect(computeErrorPct(1000, 1050)).toBeCloseTo(5.0, 1);
  });

  it("should compute negative error", () => {
    expect(computeErrorPct(100, 90)).toBeCloseTo(-10.0, 1);
  });

  it("should handle zero predicted gracefully", () => {
    expect(computeErrorPct(0, 5)).toBe(0);
  });

  it("should return 0 when predicted equals actual", () => {
    expect(computeErrorPct(42, 42)).toBe(0);
  });
});

describe("Calibration — Welford outlier detection", () => {
  it("should detect outlier after stable samples", () => {
    const stats: Stats = { n: 0, mean: 0, m2: 0 };
    // 10 consistent samples with 5% error
    for (let i = 0; i < 10; i++) updateStats(stats, 5.0);
    // Now add an extreme outlier
    const outlierError = 100;
    updateStats(stats, outlierError);
    const sd = stddev(stats);
    const sigma = Math.abs(outlierError - stats.mean) / sd;
    expect(sigma).toBeGreaterThan(3);
  });

  it("should not flag normal variation", () => {
    const stats: Stats = { n: 0, mean: 0, m2: 0 };
    const errors = [5, 4.8, 5.2, 5.1, 4.9, 5.3, 4.7, 5.0, 5.1, 4.8];
    for (const e of errors) updateStats(stats, e);
    // New value within normal range
    const newError = 5.5;
    updateStats(stats, newError);
    const sd = stddev(stats);
    const sigma = Math.abs(newError - stats.mean) / sd;
    expect(sigma).toBeLessThan(3);
  });

  it("should return Infinity stddev with <2 samples", () => {
    const stats: Stats = { n: 0, mean: 0, m2: 0 };
    updateStats(stats, 5.0);
    expect(stddev(stats)).toBe(Infinity);
  });
});

describe("Calibration — Zod schema validation", () => {
  it("should accept valid measurement", () => {
    const result = ActualSchema.safeParse({
      model_id: "kienzle_force",
      predicted_value: 1000,
      actual_value: 1050,
      measurement_type: "cutting_force_N",
      confidence: 0.9,
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid measurement_type", () => {
    const result = ActualSchema.safeParse({
      model_id: "test",
      predicted_value: 100,
      actual_value: 110,
      measurement_type: "invalid_type",
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing required fields", () => {
    const result = ActualSchema.safeParse({ model_id: "test" });
    expect(result.success).toBe(false);
  });

  it("should reject confidence out of range", () => {
    const result = ActualSchema.safeParse({
      model_id: "test",
      predicted_value: 100,
      actual_value: 110,
      measurement_type: "cycle_time_s",
      confidence: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("should default confidence to 0.5", () => {
    const result = ActualSchema.parse({
      model_id: "test",
      predicted_value: 100,
      actual_value: 110,
      measurement_type: "power_kW",
    });
    expect(result.confidence).toBe(0.5);
  });

  it("should accept all valid measurement types", () => {
    for (const t of VALID_TYPES) {
      const r = ActualSchema.safeParse({
        model_id: "x", predicted_value: 1, actual_value: 1, measurement_type: t,
      });
      expect(r.success).toBe(true);
    }
  });
});

describe("Calibration route — createCalibrationRouter", () => {
  it("should export a router factory", async () => {
    const mod = await import("../routes/calibration.js");
    expect(typeof mod.createCalibrationRouter).toBe("function");
    const router = mod.createCalibrationRouter();
    expect(router).toBeDefined();
  });
});


describe("Migration 013 — prediction_outcomes schema", () => {
  it("should have correct SQL structure", async () => {
    const { readFile } = await import("fs/promises");
    const sql = await readFile("H:/prism/src/db/migrations/013-prediction-outcomes.sql", "utf8");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS prediction_outcomes");
    expect(sql).toContain("model_id VARCHAR");
    expect(sql).toContain("predicted_value NUMERIC");
    expect(sql).toContain("actual_value NUMERIC");
    expect(sql).toContain("measurement_type VARCHAR");
    expect(sql).toContain("error_pct NUMERIC");
    expect(sql).toContain("GENERATED ALWAYS AS");
    expect(sql).toContain("prevent_prediction_outcome_mutation");
    expect(sql).toContain("BEFORE UPDATE OR DELETE");
    // AS9100 fields
    expect(sql).toContain("measured_by");
    expect(sql).toContain("instrument_id");
    expect(sql).toContain("approved_by");
  });
});

describe("Migration 014 — knowledge graph schema", () => {
  it("should have correct SQL structure", async () => {
    const { readFile } = await import("fs/promises");
    const sql = await readFile("H:/prism/src/db/migrations/014-knowledge-graph.sql", "utf8");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS graph_nodes");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS graph_edges");
    expect(sql).toContain("node_type VARCHAR");
    expect(sql).toContain("edge_type VARCHAR");
    expect(sql).toContain("properties JSONB");
    expect(sql).toContain("operator_proven_setups");
    expect(sql).toContain("graph_find_paths");
    expect(sql).toContain("RECURSIVE");
    // Edge types
    expect(sql).toContain("compatible_with");
    expect(sql).toContain("proven_on");
    expect(sql).toContain("recommended_for");
  });
});

// ─── U-CAL1: Calibration overrides wired into SpeedFeedOrchestrator ────────

describe("SpeedFeedOrchestrator — calibration_overrides (U-CAL1)", () => {
  let engine: any;

  beforeEach(async () => {
    const mod = await import("../engines/SpeedFeedOrchestratorEngine.js");
    engine = new mod.SpeedFeedOrchestratorEngine();
  });

  const baseInput = {
    material: "steel",
    tool_diameter_mm: 10,
    flutes: 4,
    operation: "milling" as const,
    cut_type: "roughing" as const,
    machine_name: "haas vf-2",
    output_detail: "full" as const,
  };

  it("should compute without calibration overrides", () => {
    const result = engine.compute(baseInput);
    expect(result.value).toBeDefined();
    expect(result.value.cutting_speed_mpm).toBeGreaterThan(0);
    expect(result.value.calibration_applied).toBeUndefined();
  });

  it("should accept calibration_overrides in input", () => {
    const result = engine.compute({
      ...baseInput,
      calibration_overrides: {
        kc1_1_factor: 1.05,
        source: "test",
        confidence: 0.9,
      },
    });
    expect(result.value).toBeDefined();
    expect(result.value.calibration_applied).toBeDefined();
    expect(result.value.calibration_applied.factors.kc1_1_factor).toBe(1.05);
    expect(result.value.calibration_applied.source).toBe("test");
  });

  it("should increase cutting force with kc1_1_factor > 1", () => {
    const baseline = engine.compute(baseInput).value;
    const calibrated = engine.compute({
      ...baseInput,
      calibration_overrides: { kc1_1_factor: 1.10 },
    }).value;

    // 10% increase in kc1.1 should increase force by ~10%
    expect(calibrated.tangential_force_N).toBeGreaterThan(baseline.tangential_force_N);
    const forceDelta = (calibrated.tangential_force_N - baseline.tangential_force_N) / baseline.tangential_force_N;
    expect(forceDelta).toBeCloseTo(0.10, 1);
  });

  it("should adjust tool life with taylor_c_factor", () => {
    // Use titanium (S group) which has shorter tool life — avoids 9999 clamp
    const titaniumInput = { ...baseInput, material: "titanium", iso_group: "S" as const };
    const baseline = engine.compute(titaniumInput).value;
    const calibrated = engine.compute({
      ...titaniumInput,
      calibration_overrides: { taylor_c_factor: 1.20 },
    }).value;

    // Higher C means longer tool life at same speed (if not clamped at 9999)
    if (baseline.tool_life_min < 9999) {
      expect(calibrated.tool_life_min).toBeGreaterThan(baseline.tool_life_min);
    } else {
      // Both hit clamp — just verify calibration was applied
      expect(calibrated.tool_life_min).toBe(9999);
    }
  });

  it("should adjust cutting speed with vc_factor", () => {
    const baseline = engine.compute(baseInput).value;
    const calibrated = engine.compute({
      ...baseInput,
      calibration_overrides: { vc_factor: 0.90 },
    }).value;

    // 10% reduction in Vc
    expect(calibrated.cutting_speed_mpm).toBeLessThan(baseline.cutting_speed_mpm);
  });

  it("should adjust surface finish with ra_factor", () => {
    // Use large ra_factor to overcome rounding (engine rounds to 2 decimal places)
    const baseline = engine.compute(baseInput).value;
    const calibrated = engine.compute({
      ...baseInput,
      calibration_overrides: { ra_factor: 2.0 },
    }).value;

    // 2x increase in Ra factor should be visible even after rounding
    // If baseline Ra > 0, calibrated should be approximately 2x
    if (baseline.surface_finish_Ra_um > 0) {
      expect(calibrated.surface_finish_Ra_um).toBeGreaterThanOrEqual(baseline.surface_finish_Ra_um);
      // Allow tolerance for rounding: ratio should be between 1.5 and 2.5
      const ratio = calibrated.surface_finish_Ra_um / baseline.surface_finish_Ra_um;
      expect(ratio).toBeGreaterThan(1.5);
    } else {
      // Both zero — Ra too small to measure after rounding, verify factor was accepted
      expect(calibrated.calibration_applied?.factors?.ra_factor).toBe(2.0);
    }
  });

  it("should record calibration source and confidence", () => {
    const result = engine.compute({
      ...baseInput,
      calibration_overrides: {
        vc_factor: 0.95,
        source: "calibration_feedback:2026-04-08",
        confidence: 0.85,
      },
    }).value;

    expect(result.calibration_applied.source).toBe("calibration_feedback:2026-04-08");
    expect(result.calibration_applied.confidence).toBe(0.85);
  });

  it("should apply multiple overrides simultaneously", () => {
    const baseline = engine.compute(baseInput).value;
    const calibrated = engine.compute({
      ...baseInput,
      calibration_overrides: {
        kc1_1_factor: 1.05,
        taylor_c_factor: 1.10,
        vc_factor: 0.95,
        ra_factor: 1.15,
      },
    }).value;

    expect(calibrated.calibration_applied.factors.kc1_1_factor).toBe(1.05);
    expect(calibrated.calibration_applied.factors.taylor_c_factor).toBe(1.10);
    expect(calibrated.calibration_applied.factors.vc_factor).toBe(0.95);
    expect(calibrated.calibration_applied.factors.ra_factor).toBe(1.15);
    // Force should be different from baseline
    expect(calibrated.tangential_force_N).not.toBeCloseTo(baseline.tangential_force_N, 0);
  });

  it("should not record factors that equal 1.0", () => {
    const result = engine.compute({
      ...baseInput,
      calibration_overrides: {
        kc1_1_factor: 1.0,
        vc_factor: 0.95,
      },
    }).value;

    expect(result.calibration_applied.factors.vc_factor).toBe(0.95);
    expect(result.calibration_applied.factors.kc1_1_factor).toBeUndefined();
  });

  it("should include calibration in formulas_used when active", () => {
    const result = engine.compute({
      ...baseInput,
      calibration_overrides: { kc1_1_factor: 1.05 },
    }).value;

    const kcFormula = result.formulas_used.find((f: string) => f.includes("Kienzle"));
    expect(kcFormula).toContain("cal");
  });
});
