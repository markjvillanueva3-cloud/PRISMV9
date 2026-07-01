/**
 * BRIDGE-WIRING/U-BRIDGE-WIRE-ELECTRODE — round-trip wiring assertions
 * for the 4 newly-wired Electrode AI engines in prism_edm:
 *   electrode_ai_reason_full         → ElectrodeAIReasoningEngine
 *   electrode_advanced_analysis      → ElectrodeAdvancedAIEngine
 *   electrode_deep_learning_analyze  → ElectrodeDeepLearningEngine
 *   electrode_ultimate_analyze       → ElectrodeUltimateAIEngine
 *
 * Every assertion checks a real numeric/string/structural property — no
 * .toBeDefined() / .toBeTruthy() placeholders.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { ELECTRODE_AI_SCHEMAS } from "../schemas/electrodeAISchemas.js";
import { electrodeDeepLearningEngine } from "../engines/ElectrodeDeepLearningEngine.js";
import { electrodeUltimateAIEngine } from "../engines/ElectrodeUltimateAIEngine.js";

const NEW_ACTIONS = [
  "electrode_ai_reason_full",
  "electrode_advanced_analysis",
  "electrode_deep_learning_analyze",
  "electrode_ultimate_analyze",
] as const;

const reasonFullInput = {
  part_number: "JM-1234",
  c_dia_in: 0.5,
  e_dia_in: 0.375,
  lead_angle_deg: 5,
  total_length_in: 3.0,
  workpiece_material: "D2",
  target_finish_Ra_um: 1.2,
  num_cavities: 1,
};

const advancedInput = {
  discharge_energy_mJ: 50,
  duty_cycle: 0.45,
  electrode_grain_size_um: 5,
  workpiece_hardness_HRC: 58,
  workpiece_material: "D2",
  num_cavities: 1,
  num_skim_passes: 2,
  spark_gap_mm: 0.05,
  target_finish_Ra_um: 1.2,
};

const deepLearningInput = {
  c_dia_in: 0.5,
  e_dia_in: 0.375,
  total_length_in: 3.0,
  workpiece_material: "D2",
  workpiece_hardness_HRC: 58,
  target_finish_Ra_um: 1.2,
  num_cavities: 1,
};

const ultimateInput = {
  discharge_energy_mJ: 50,
  duty_cycle: 0.45,
  electrode_grain_size_um: 5,
  workpiece_hardness_HRC: 58,
  workpiece_material: "D2",
  num_cavities: 1,
  num_passes: 3,
  target_finish_Ra_um: 1.2,
};

describe("U-BRIDGE-WIRE-ELECTRODE — schema preserves field values on parse", () => {
  it("electrode_ai_reason_full preserves all 8 caller fields exactly", () => {
    const parsed = ELECTRODE_AI_SCHEMAS.electrode_ai_reason_full.parse(reasonFullInput);
    expect(parsed.part_number).toBe("JM-1234");
    expect(parsed.c_dia_in).toBe(0.5);
    expect(parsed.e_dia_in).toBe(0.375);
    expect(parsed.lead_angle_deg).toBe(5);
    expect(parsed.total_length_in).toBe(3.0);
    expect(parsed.workpiece_material).toBe("D2");
    expect(parsed.target_finish_Ra_um).toBe(1.2);
    expect(parsed.num_cavities).toBe(1);
  });
  it("electrode_advanced_analysis preserves duty_cycle exactly + propagates optional fields", () => {
    const parsed = ELECTRODE_AI_SCHEMAS.electrode_advanced_analysis.parse({
      ...advancedInput, surface_area_mm2: 1234, depth_mm: 25,
    });
    expect(parsed.duty_cycle).toBe(0.45);
    expect(parsed.surface_area_mm2).toBe(1234);
    expect(parsed.depth_mm).toBe(25);
    expect(parsed.num_skim_passes).toBe(2);
    expect(parsed.spark_gap_mm).toBe(0.05);
  });
  it("electrode_deep_learning_analyze omits unset optional lead_angle_deg", () => {
    const parsed = ELECTRODE_AI_SCHEMAS.electrode_deep_learning_analyze.parse(deepLearningInput);
    expect(parsed.target_finish_Ra_um).toBe(1.2);
    expect(parsed.lead_angle_deg).toBe(undefined);
    expect(parsed.workpiece_hardness_HRC).toBe(58);
  });
  it("electrode_ultimate_analyze rejects 0 num_passes (positive int constraint)", () => {
    const parsed = ELECTRODE_AI_SCHEMAS.electrode_ultimate_analyze.parse(ultimateInput);
    expect(parsed.num_passes).toBe(3);
    expect(parsed.discharge_energy_mJ).toBe(50);
    expect(parsed.electrode_grain_size_um).toBe(5);
  });
});

describe("U-BRIDGE-WIRE-ELECTRODE — schema rejects malformed input (4 distinct constraint classes)", () => {
  it("rejects negative c_dia_in on reason_full (positive-number constraint)", () => {
    expect(() =>
      ELECTRODE_AI_SCHEMAS.electrode_ai_reason_full.parse({ ...reasonFullInput, c_dia_in: -0.5 }),
    ).toThrow();
  });
  it("rejects duty_cycle > 1 on advanced_analysis (max(1) constraint)", () => {
    expect(() =>
      ELECTRODE_AI_SCHEMAS.electrode_advanced_analysis.parse({ ...advancedInput, duty_cycle: 1.5 }),
    ).toThrow();
  });
  it("rejects missing target_finish on deep_learning_analyze (required field)", () => {
    const { target_finish_Ra_um: _drop, ...without } = deepLearningInput;
    expect(() => ELECTRODE_AI_SCHEMAS.electrode_deep_learning_analyze.parse(without)).toThrow();
  });
  it("rejects zero num_passes on ultimate_analyze (positive-int constraint)", () => {
    expect(() =>
      ELECTRODE_AI_SCHEMAS.electrode_ultimate_analyze.parse({ ...ultimateInput, num_passes: 0 }),
    ).toThrow();
  });
});

describe("U-BRIDGE-WIRE-ELECTRODE — DeepLearningResult is numerically populated", () => {
  it("comprehensiveAnalysis returns wear/finish/force with finite numbers + bounded confidence", async () => {
    const out = await electrodeDeepLearningEngine.comprehensiveAnalysis(deepLearningInput);
    // wear: numeric ratios + integer count
    expect(Number.isFinite(out.wear.electrode_wear_ratio)).toBe(true);
    expect(out.wear.electrode_wear_ratio).toBeGreaterThan(0);
    expect(out.wear.expected_electrodes_needed).toBeGreaterThanOrEqual(1);
    expect(Number.isFinite(out.wear.wear_per_cavity_mm)).toBe(true);
    expect(out.wear.confidence).toBeGreaterThanOrEqual(0);
    expect(out.wear.confidence).toBeLessThanOrEqual(1);
    // finish: predicted Ra + achievable range with min ≤ max
    expect(Number.isFinite(out.finish.predicted_Ra_um)).toBe(true);
    expect(out.finish.predicted_Ra_um).toBeGreaterThan(0);
    expect(out.finish.achievable_Ra_range.min).toBeLessThanOrEqual(out.finish.achievable_Ra_range.max);
    // force: peak ≥ min, variation_percent non-negative
    expect(out.force.peak_force_N).toBeGreaterThanOrEqual(out.force.min_force_N);
    expect(out.force.variation_percent).toBeGreaterThanOrEqual(0);
    // optimized: a Record (object) + boolean convergence flag
    expect(Object.keys(out.optimized.parameters).length).toBeGreaterThan(0);
    expect(typeof out.optimized.convergence).toBe("boolean");
    // top-level confidence bounded [0,1]
    expect(out.overall_confidence).toBeGreaterThanOrEqual(0);
    expect(out.overall_confidence).toBeLessThanOrEqual(1);
    // tribal_insights is an array (possibly empty for this input)
    expect(Array.isArray(out.tribal_insights)).toBe(true);
  });
});

describe("U-BRIDGE-WIRE-ELECTRODE — UltimateAnalysisResult is numerically populated", () => {
  it("comprehensiveUltimateAnalysis returns deep-arch outputs with expected dimensions", async () => {
    const out = await electrodeUltimateAIEngine.comprehensiveUltimateAnalysis(ultimateInput);
    // attention: attended_values is a numeric vector
    expect(Array.isArray(out.transformer_attention.attended_values)).toBe(true);
    expect(out.transformer_attention.attended_values.length).toBeGreaterThan(0);
    expect(Number.isFinite(out.transformer_attention.attended_values[0]!)).toBe(true);
    // gnn: at least one node embedding
    expect(out.gnn_embeddings.length).toBeGreaterThan(0);
    expect(typeof out.gnn_embeddings[0]!.node_id).toBe("string");
    expect(Array.isArray(out.gnn_embeddings[0]!.embedding)).toBe(true);
    // lstm: wear_progression length ≥ 1 (with num_passes=3 expect ≥ 1 step)
    expect(out.lstm_prediction.wear_progression.length).toBeGreaterThanOrEqual(1);
    expect(Number.isFinite(out.lstm_prediction.final_wear)).toBe(true);
    // vae: mean and log_variance vectors are same length (latent dim)
    expect(out.vae_latent.mean.length).toBe(out.vae_latent.log_variance.length);
    expect(out.vae_latent.mean.length).toBeGreaterThan(0);
    expect(Number.isFinite(out.vae_latent.reconstruction_loss)).toBe(true);
    // pinn: constraint_satisfaction is a probability
    expect(out.pinn_prediction.constraint_satisfaction).toBeGreaterThanOrEqual(0);
    expect(out.pinn_prediction.constraint_satisfaction).toBeLessThanOrEqual(1);
    expect(Number.isFinite(out.pinn_prediction.value)).toBe(true);
    expect(Number.isFinite(out.pinn_prediction.physics_loss)).toBe(true);
  });
});

describe("U-BRIDGE-WIRE-ELECTRODE — dispatcher wiring is structurally complete", () => {
  const dispatcherPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "tools",
    "dispatchers",
    "edmDispatcher.ts",
  );
  const dispatcherSrc = readFileSync(dispatcherPath, "utf8");

  for (const action of NEW_ACTIONS) {
    it(`ACTIONS enum contains the literal "${action}"`, () => {
      expect(dispatcherSrc.includes(`"${action}"`)).toBe(true);
    });
    it(`dispatcher has switch case "${action}"`, () => {
      expect(dispatcherSrc.includes(`case "${action}"`)).toBe(true);
    });
  }
  it("ELECTRODE_AI_SCHEMAS exports exactly the 4 expected keys (no missing, no extra)", () => {
    expect(Object.keys(ELECTRODE_AI_SCHEMAS).sort()).toEqual([...NEW_ACTIONS].sort());
  });
  it("dispatcher imports ELECTRODE_AI_SCHEMAS and merges it into ALL_EDM_SCHEMAS", () => {
    expect(dispatcherSrc.includes('import { ELECTRODE_AI_SCHEMAS } from "../../schemas/electrodeAISchemas.js"')).toBe(true);
    expect(dispatcherSrc.includes("...ELECTRODE_AI_SCHEMAS")).toBe(true);
  });
});
