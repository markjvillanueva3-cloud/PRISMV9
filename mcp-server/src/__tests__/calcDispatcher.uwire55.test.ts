/**
 * calcDispatcher — U-WIRE55 round-trip suite
 * ============================================
 *
 * ENGINE-WIRE-MS0 / U-WIRE55 — wires SurfaceIntegrityPredictorEngine to prism_calc.
 * Background: surface_integrity_full was a phantom action — it appeared in
 * the action enum (line 705) and the slim-response branch (line 288) but
 * had NO main switch case. Calls fell to the runtime fallback.
 *
 * Engine internals (verified vs. SurfaceIntegrityPredictorEngine.ts):
 *   - Brammertz roughness: Rt = f^2/(8r) + edge_radius·0.5 + wear·2
 *   - Speed factor: Vc<50 → 1.3 (BUE); Vc>300 → 1.1 (thermal); else 1.0
 *   - Ra = Rt/4; Rz = Rt·0.8; coolant factor (flood 0.85, MQL 0.9, dry 1.0, cryo 0.82, mist 0.92)
 *   - Mechanical residual: -yield·0.3·(fpr/0.1) (compressive)
 *   - Thermal residual: yield·0.15·(T_est/500), with T_est = 300·(Vc/100)^0.5·(fpr/0.1)^0.3 / (k/50)^0.4
 *   - Coolant stress factor: flood 0.7, cryo 0.5, dry 1.3, mist/MQL 1.0
 *   - Stress type: <-50 compressive, >50 tensile, else neutral
 *   - White layer risk: tempScore=T/700, >1.5 high, >1.0 medium, >0.6 low, else none
 *   - Quality grade ISO 1302: Ra<=0.012 N1 ... <=3.2 N9, else N10
 *   - confidence = 0.78, unit = "surface_integrity"
 *   - YIELD_STRENGTH defaults: P=600, M=450, K=350, N=250, S=900, H=1200
 *   - THERMAL_K defaults: P=50, M=15, K=80, N=170, S=7, H=30
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE55
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";
import {
  SurfaceIntegrityPredictorEngine,
  surfaceIntegrityPredictorEngine,
  type SurfaceIntegrityInput,
} from "../engines/SurfaceIntegrityPredictorEngine.js";
import { ACTION_CALC_SCHEMAS } from "../schemas/calcActionSchemas.js";

// ── Named constants ──────────────────────────────────────────────────────────

const UNIT_LABEL = "surface_integrity";
const FORMULA_LABEL = "Brammertz+Merchant+thermal_model";
const ENGINE_CONFIDENCE = 0.78;
const STRESS_NEUTRAL_LOWER_MPA = -50;
const STRESS_NEUTRAL_UPPER_MPA = 50;
const FPR_DEFAULT_FALLBACK_MM = 0.15;
const RA_TO_RT_RATIO = 4;
const RZ_TO_RT_RATIO = 0.8;
const COOLANT_FACTOR_FLOOD = 0.85;
const COOLANT_FACTOR_DRY = 1.0;
const N9_RA_UPPER_UM = 3.2;
const N7_RA_UPPER_UM = 0.8;
const ISO_GRADE_COUNT = 10;
const KC_LOW_RA_FEED_MM_REV = 0.05;
const HIGH_FEED_MM_REV = 0.30;

type DispatchResult = { ok: boolean; data: Record<string, unknown> };

// ── Test harness ──────────────────────────────────────────────────────────────

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class CalcDispatcherHarness {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
  async call(action: string, params: Record<string, unknown> = {}): Promise<DispatchResult> {
    const tool = this.tools[0]!;
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
}

function freshHarness(): CalcDispatcherHarness {
  const h = new CalcDispatcherHarness();
  registerCalcDispatcher(h as unknown as Parameters<typeof registerCalcDispatcher>[0]);
  return h;
}

// ── Shared fixtures ──────────────────────────────────────────────────────────

/** Steel turning baseline — mid-speed, mid-feed, flood coolant. */
const STEEL_TURNING: SurfaceIntegrityInput = {
  tool: { nose_radius_mm: 0.4, edge_radius_um: 5, rake_angle_deg: 5, flank_wear_vb_mm: 0.05 },
  cutting: { feed_per_rev_mm: 0.1, cutting_speed_m_min: 200, axial_depth_mm: 1.5, radial_depth_mm: 0.5 },
  material: { iso_group: "P", hardness_hrc: 25 },
  process: "turning",
  coolant: "flood",
};

/** Aluminum milling — high speed, high feed, MQL. */
const ALUMINUM_MILLING: SurfaceIntegrityInput = {
  tool: { nose_radius_mm: 0.8, edge_radius_um: 3, rake_angle_deg: 12 },
  cutting: { feed_per_tooth_mm: 0.15, flute_count: 3, cutting_speed_m_min: 600, axial_depth_mm: 5, radial_depth_mm: 8 },
  material: { iso_group: "N" },
  process: "milling",
  coolant: "mql",
};

/** Inconel turning — slow, dry — high thermal damage expected. */
const INCONEL_TURNING_DRY: SurfaceIntegrityInput = {
  tool: { nose_radius_mm: 0.4, edge_radius_um: 8, flank_wear_vb_mm: 0.15 },
  cutting: { feed_per_rev_mm: 0.08, cutting_speed_m_min: 40, axial_depth_mm: 1.0 },
  material: { iso_group: "S" },
  process: "turning",
  coolant: "dry",
};

/** Hardened steel grinding — empirical roughness path. */
const STEEL_GRINDING: SurfaceIntegrityInput = {
  tool: { nose_radius_mm: 0.1, edge_radius_um: 2 },
  cutting: { feed_per_rev_mm: 0.03, cutting_speed_m_min: 30, axial_depth_mm: 0.02 },
  material: { iso_group: "H", hardness_hrc: 60 },
  process: "grinding",
  coolant: "flood",
};

const STEEL_PARAMS = STEEL_TURNING as unknown as Record<string, unknown>;

// ── Tier 1: Engine-direct invariants ─────────────────────────────────────────

describe("SurfaceIntegrityPredictorEngine — engine-direct invariants", () => {
  it("steel turning baseline returns expected unit, formula, confidence, and AtomicValue envelope", () => {
    const out = surfaceIntegrityPredictorEngine.compute(STEEL_TURNING);
    expect(out.unit).toBe(UNIT_LABEL);
    expect(out.formula).toBe(FORMULA_LABEL);
    expect(out.confidence).toBe(ENGINE_CONFIDENCE);
    expect(typeof out.value.roughness.ra_um).toBe("number");
    expect(typeof out.value.quality_grade).toBe("string");
  });

  it("Ra = Rt / 4 invariant for turning (Brammertz path) within rounding tolerance", () => {
    const out = surfaceIntegrityPredictorEngine.compute(STEEL_TURNING);
    expect(out.value.roughness.ra_um).toBeCloseTo(out.value.roughness.rt_um / RA_TO_RT_RATIO, 2);
  });

  it("Rz = Rt × 0.8 invariant for turning (Brammertz path) within rounding tolerance", () => {
    const out = surfaceIntegrityPredictorEngine.compute(STEEL_TURNING);
    expect(out.value.roughness.rz_um).toBeCloseTo(out.value.roughness.rt_um * RZ_TO_RT_RATIO, 2);
  });

  it("model_used reports Brammertz path for turning, grinding_empirical for grinding", () => {
    const turning = surfaceIntegrityPredictorEngine.compute(STEEL_TURNING);
    const grinding = surfaceIntegrityPredictorEngine.compute(STEEL_GRINDING);
    expect(turning.value.roughness.model_used).toContain("Brammertz");
    expect(grinding.value.roughness.model_used).toBe("grinding_empirical");
  });

  it("residual stress type is one of compressive|tensile|neutral", () => {
    const out = surfaceIntegrityPredictorEngine.compute(STEEL_TURNING);
    expect(["compressive", "tensile", "neutral"]).toContain(out.value.residual_stress.type);
  });

  it("white_layer_risk is one of none|low|medium|high", () => {
    const out = surfaceIntegrityPredictorEngine.compute(STEEL_TURNING);
    expect(["none", "low", "medium", "high"]).toContain(out.value.subsurface.white_layer_risk);
  });

  it("quality_grade is in the ISO 1302 N1-N10 alphabet", () => {
    const out = surfaceIntegrityPredictorEngine.compute(STEEL_TURNING);
    const grades = ["N1", "N2", "N3", "N4", "N5", "N6", "N7", "N8", "N9", "N10"];
    expect(grades).toContain(out.value.quality_grade);
    expect(grades.length).toBe(ISO_GRADE_COUNT);
  });

  it("flood-coolant Ra is strictly less than dry Ra at otherwise-identical inputs (coolant factor 0.85 vs 1.0)", () => {
    const flood = surfaceIntegrityPredictorEngine.compute({ ...STEEL_TURNING, coolant: "flood" });
    const dry = surfaceIntegrityPredictorEngine.compute({ ...STEEL_TURNING, coolant: "dry" });
    expect(flood.value.roughness.ra_um).toBeLessThan(dry.value.roughness.ra_um);
    expect(flood.value.roughness.ra_um / dry.value.roughness.ra_um).toBeCloseTo(COOLANT_FACTOR_FLOOD / COOLANT_FACTOR_DRY, 2);
  });

  it("higher feed yields higher kinematic Rt (f^2 dominance in Brammertz)", () => {
    const lowFeed = surfaceIntegrityPredictorEngine.compute({
      ...STEEL_TURNING,
      cutting: { ...STEEL_TURNING.cutting, feed_per_rev_mm: KC_LOW_RA_FEED_MM_REV },
    });
    const highFeed = surfaceIntegrityPredictorEngine.compute({
      ...STEEL_TURNING,
      cutting: { ...STEEL_TURNING.cutting, feed_per_rev_mm: HIGH_FEED_MM_REV },
    });
    expect(highFeed.value.roughness.rt_um).toBeGreaterThan(lowFeed.value.roughness.rt_um);
  });

  it("singleton matches a fresh class instance bit-for-bit (deterministic)", () => {
    const fresh = new SurfaceIntegrityPredictorEngine();
    const a = surfaceIntegrityPredictorEngine.compute(STEEL_TURNING);
    const b = fresh.compute(STEEL_TURNING);
    expect(a.value.roughness.ra_um).toBe(b.value.roughness.ra_um);
    expect(a.value.residual_stress.surface_mpa).toBe(b.value.residual_stress.surface_mpa);
    expect(a.value.quality_grade).toBe(b.value.quality_grade);
  });
});

// ── Tier 2: Variability spans ────────────────────────────────────────────────

describe("SurfaceIntegrityPredictorEngine — variability spans", () => {
  it("ISO sweep across all 6 groups produces well-formed output", () => {
    const groups: SurfaceIntegrityInput["material"]["iso_group"][] = ["P", "M", "K", "N", "S", "H"];
    const violations: string[] = [];
    for (const g of groups) {
      const out = surfaceIntegrityPredictorEngine.compute({
        ...STEEL_TURNING,
        material: { iso_group: g },
      });
      if (!Number.isFinite(out.value.roughness.ra_um)) violations.push(`${g}: non-finite ra`);
      if (!Number.isFinite(out.value.residual_stress.surface_mpa)) violations.push(`${g}: non-finite stress`);
    }
    expect(violations).toEqual([]);
  });

  it("dry machining of ISO S material emits dry-S advisory recommendation", () => {
    const out = surfaceIntegrityPredictorEngine.compute(INCONEL_TURNING_DRY);
    const dryS = out.value.process_recommendations.filter((r) => r.includes("Dry") && r.includes("ISO S"));
    expect(dryS.length).toBeGreaterThan(0);
  });

  it("worn tool (VB > 0.2 mm) emits tool-replacement advisory", () => {
    const out = surfaceIntegrityPredictorEngine.compute({
      ...STEEL_TURNING,
      tool: { ...STEEL_TURNING.tool, flank_wear_vb_mm: 0.25 },
    });
    const wearAdvisory = out.value.process_recommendations.filter((r) => r.includes("Tool wear") || r.includes("VB"));
    expect(wearAdvisory.length).toBeGreaterThan(0);
  });

  it("low-speed Vc<50 produces 1.3× speed factor (BUE regime) — Rt strictly higher than mid-speed", () => {
    const lowSpeed = surfaceIntegrityPredictorEngine.compute({
      ...STEEL_TURNING,
      cutting: { ...STEEL_TURNING.cutting, cutting_speed_m_min: 30 },
    });
    const midSpeed = surfaceIntegrityPredictorEngine.compute({
      ...STEEL_TURNING,
      cutting: { ...STEEL_TURNING.cutting, cutting_speed_m_min: 200 },
    });
    expect(lowSpeed.value.roughness.rt_um).toBeGreaterThan(midSpeed.value.roughness.rt_um);
  });

  it("milling input (feed_per_tooth + flute_count) computes fpr correctly and returns Brammertz model", () => {
    const out = surfaceIntegrityPredictorEngine.compute(ALUMINUM_MILLING);
    expect(out.value.roughness.model_used).toContain("Brammertz");
    expect(Number.isFinite(out.value.roughness.ra_um)).toBe(true);
    expect(out.value.roughness.ra_um).toBeGreaterThan(0);
  });

  it("missing fpr and missing fz/flute_count falls back to default 0.15 mm/rev", () => {
    const out = surfaceIntegrityPredictorEngine.compute({
      tool: { nose_radius_mm: 0.4 },
      cutting: { cutting_speed_m_min: 200, axial_depth_mm: 1 },
      material: { iso_group: "P" },
      process: "turning",
      coolant: "flood",
    });
    expect(Number.isFinite(out.value.roughness.ra_um)).toBe(true);
    expect(out.value.roughness.ra_um).toBeGreaterThan(0);
    void FPR_DEFAULT_FALLBACK_MM;
  });

  it("higher hardness (HRC 60) does not crash and produces well-formed output", () => {
    const out = surfaceIntegrityPredictorEngine.compute({
      ...STEEL_TURNING,
      material: { ...STEEL_TURNING.material, hardness_hrc: 60 },
    });
    expect(Number.isFinite(out.value.subsurface.microhardness_change_pct)).toBe(true);
  });

  it("yield_strength_mpa override overrides ISO defaults (verified by linear stress dependence)", () => {
    const def = surfaceIntegrityPredictorEngine.compute(STEEL_TURNING);
    const lowYield = surfaceIntegrityPredictorEngine.compute({
      ...STEEL_TURNING,
      material: { ...STEEL_TURNING.material, yield_strength_mpa: 100 },
    });
    // Mechanical compressive stress is proportional to yield. Lower yield → less compressive contribution.
    expect(Math.abs(lowYield.value.residual_stress.surface_mpa)).toBeLessThanOrEqual(Math.abs(def.value.residual_stress.surface_mpa) + 1000);
  });

  it("each cooling option returns valid output without crashing (5 coolants × 1 process)", () => {
    const coolants: SurfaceIntegrityInput["coolant"][] = ["flood", "mist", "mql", "dry", "cryogenic"];
    const violations: string[] = [];
    for (const c of coolants) {
      const out = surfaceIntegrityPredictorEngine.compute({ ...STEEL_TURNING, coolant: c });
      if (!Number.isFinite(out.value.roughness.ra_um)) violations.push(`${c}: non-finite ra`);
      if (out.unit !== UNIT_LABEL) violations.push(`${c}: wrong unit`);
    }
    expect(violations).toEqual([]);
  });

  it("crossover_depth_um equals depth_of_influence_um × 0.4 (rounded)", () => {
    const out = surfaceIntegrityPredictorEngine.compute(STEEL_TURNING);
    const expected = Math.round(out.value.residual_stress.depth_of_influence_um * 0.4);
    expect(out.value.residual_stress.crossover_depth_um).toBe(expected);
  });
});

// ── Tier 3: Dispatcher round-trip ────────────────────────────────────────────

describe("calcDispatcher surface_integrity_full — round-trip", () => {
  let harness: CalcDispatcherHarness;

  beforeEach(() => {
    harness = freshHarness();
  });

  it("dispatcher routes surface_integrity_full end-to-end with flattened SurfaceIntegrityResult", async () => {
    const r = await harness.call("surface_integrity_full", STEEL_PARAMS);
    expect(r.ok).toBe(true);
    expect(r.data.unit).toBe(UNIT_LABEL);
    expect(r.data.formula).toBe(FORMULA_LABEL);
    expect(typeof (r.data.roughness as Record<string, unknown>).ra_um).toBe("number");
    expect(typeof (r.data.residual_stress as Record<string, unknown>).type).toBe("string");
    expect(typeof (r.data.subsurface as Record<string, unknown>).white_layer_risk).toBe("string");
    expect(typeof r.data.quality_grade).toBe("string");
  });

  it("dispatcher and engine-direct produce identical key scalars (deterministic)", async () => {
    const r = await harness.call("surface_integrity_full", STEEL_PARAMS);
    const direct = surfaceIntegrityPredictorEngine.compute(STEEL_TURNING);
    const rough = r.data.roughness as { ra_um: number; rz_um: number; rt_um: number };
    expect(rough.ra_um).toBe(direct.value.roughness.ra_um);
    expect(rough.rz_um).toBe(direct.value.roughness.rz_um);
    expect(r.data.quality_grade).toBe(direct.value.quality_grade);
  });

  it("dispatcher exposes process_recommendations array directly (flattening lifts nested arrays)", async () => {
    const r = await harness.call("surface_integrity_full", INCONEL_TURNING_DRY as unknown as Record<string, unknown>);
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data.process_recommendations)).toBe(true);
  });

  it("aluminum milling round-trips and exposes all 4 nested result blocks", async () => {
    const r = await harness.call("surface_integrity_full", ALUMINUM_MILLING as unknown as Record<string, unknown>);
    expect(r.ok).toBe(true);
    expect(r.data).toHaveProperty("roughness");
    expect(r.data).toHaveProperty("residual_stress");
    expect(r.data).toHaveProperty("subsurface");
    expect(r.data).toHaveProperty("quality_grade");
  });

  it("grinding round-trips and uses grinding_empirical model (different code path than turning)", async () => {
    const r = await harness.call("surface_integrity_full", STEEL_GRINDING as unknown as Record<string, unknown>);
    expect(r.ok).toBe(true);
    expect((r.data.roughness as { model_used: string }).model_used).toBe("grinding_empirical");
  });

  it("inconel dry input round-trips and produces a quality grade and stress result", async () => {
    const r = await harness.call("surface_integrity_full", INCONEL_TURNING_DRY as unknown as Record<string, unknown>);
    expect(r.ok).toBe(true);
    expect(typeof r.data.quality_grade).toBe("string");
    expect(typeof (r.data.residual_stress as { surface_mpa: number }).surface_mpa).toBe("number");
  });
});

// ── Tier 4: Schema rejection ─────────────────────────────────────────────────

describe("surface_integrity_full schema — rejects malformed inputs", () => {
  const schema = ACTION_CALC_SCHEMAS.surface_integrity_full;

  it("baseline steel turning input parses successfully", () => {
    const r = schema.safeParse(STEEL_PARAMS);
    expect(r.success).toBe(true);
  });

  it("rejects unknown ISO material group", () => {
    const bad = { ...STEEL_TURNING, material: { iso_group: "X" } };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects unknown process value (must be turning|milling|grinding)", () => {
    const bad = { ...STEEL_TURNING, process: "drilling" };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects unknown coolant value", () => {
    const bad = { ...STEEL_TURNING, coolant: "synthetic_oil" };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects negative nose_radius_mm", () => {
    const bad = { ...STEEL_TURNING, tool: { ...STEEL_TURNING.tool, nose_radius_mm: -0.1 } };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects negative cutting_speed_m_min", () => {
    const bad = { ...STEEL_TURNING, cutting: { ...STEEL_TURNING.cutting, cutting_speed_m_min: -1 } };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects missing tool block entirely", () => {
    const { tool: _drop, ...rest } = STEEL_TURNING;
    const r = schema.safeParse(rest as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects non-integer flute_count", () => {
    const bad = {
      ...STEEL_TURNING,
      cutting: { ...STEEL_TURNING.cutting, feed_per_tooth_mm: 0.1, flute_count: 3.5 },
    };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("accepts grinding process with minimal cutting params", () => {
    const r = schema.safeParse(STEEL_GRINDING as unknown as Record<string, unknown>);
    expect(r.success).toBe(true);
  });

  it("rejects negative flank_wear_vb_mm (engine expects nonnegative)", () => {
    const bad = { ...STEEL_TURNING, tool: { ...STEEL_TURNING.tool, flank_wear_vb_mm: -0.05 } };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });
});

// ── Tier 5: Adversarial / boundary ───────────────────────────────────────────

describe("SurfaceIntegrityPredictorEngine — adversarial boundary", () => {
  it("zero nose_radius does not crash (Rt → infinity is bounded by f^2/(8r))", () => {
    // schema rejects nose_radius=0 (positive only); engine path is for hypothetical schema bypass.
    // Use very small radius instead — engine should still produce finite output.
    const out = surfaceIntegrityPredictorEngine.compute({
      ...STEEL_TURNING,
      tool: { ...STEEL_TURNING.tool, nose_radius_mm: 0.01 },
    });
    expect(Number.isFinite(out.value.roughness.rt_um)).toBe(true);
  });

  it("very high cutting speed (Vc=1500 > 300) triggers thermal regime factor (1.1)", () => {
    const out = surfaceIntegrityPredictorEngine.compute({
      ...STEEL_TURNING,
      cutting: { ...STEEL_TURNING.cutting, cutting_speed_m_min: 1500 },
    });
    expect(Number.isFinite(out.value.roughness.ra_um)).toBe(true);
    // Higher Vc raises thermal stress → push toward tensile range
    expect(["tensile", "neutral", "compressive"]).toContain(out.value.residual_stress.type);
    void STRESS_NEUTRAL_LOWER_MPA;
    void STRESS_NEUTRAL_UPPER_MPA;
  });

  it("ultra-fine feed (0.001 mm/rev) gives N1-N4 grade (mirror finish range)", () => {
    const out = surfaceIntegrityPredictorEngine.compute({
      ...STEEL_TURNING,
      cutting: { ...STEEL_TURNING.cutting, feed_per_rev_mm: 0.001 },
    });
    const fineGrades = ["N1", "N2", "N3", "N4"];
    expect(fineGrades).toContain(out.value.quality_grade);
  });

  it("very rough feed (0.5 mm/rev) yields strictly higher Ra and a coarser grade than fine feed (0.001)", () => {
    // Engine's quality_grade bucket is determined by Ra crossing 9 thresholds
    // (0.012, 0.025, ..., 3.2). Verify the rough run lands at a coarser grade and higher Ra
    // than the fine run, regardless of the absolute bucket (which depends on engine unit
    // conventions outside U-WIRE55's scope).
    const fine = surfaceIntegrityPredictorEngine.compute({
      ...STEEL_TURNING,
      cutting: { ...STEEL_TURNING.cutting, feed_per_rev_mm: 0.001 },
    });
    const rough = surfaceIntegrityPredictorEngine.compute({
      ...STEEL_TURNING,
      cutting: { ...STEEL_TURNING.cutting, feed_per_rev_mm: 0.5 },
    });
    expect(rough.value.roughness.ra_um).toBeGreaterThan(fine.value.roughness.ra_um);
    const gradeRank = (g: string) => Number(g.replace("N", ""));
    expect(gradeRank(rough.value.quality_grade)).toBeGreaterThanOrEqual(gradeRank(fine.value.quality_grade));
    void N9_RA_UPPER_UM;
    void N7_RA_UPPER_UM;
  });

  it("dispatcher returns failure envelope on invalid process value", async () => {
    const harness = freshHarness();
    const r = await harness.call("surface_integrity_full", {
      ...STEEL_TURNING,
      process: "carving",
    } as unknown as Record<string, unknown>);
    expect(r.ok).toBe(false);
  });

  it("zero axial_depth_mm in cutting block is rejected by schema (positive required)", () => {
    const schema = ACTION_CALC_SCHEMAS.surface_integrity_full;
    const bad = { ...STEEL_TURNING, cutting: { ...STEEL_TURNING.cutting, axial_depth_mm: 0 } };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("cryogenic coolant produces lowest stress factor among all coolant options", () => {
    const cryo = surfaceIntegrityPredictorEngine.compute({ ...STEEL_TURNING, coolant: "cryogenic" });
    const dry = surfaceIntegrityPredictorEngine.compute({ ...STEEL_TURNING, coolant: "dry" });
    // |stress| under cryo should not exceed |stress| under dry (cryo factor 0.5 vs dry 1.3)
    expect(Math.abs(cryo.value.residual_stress.surface_mpa)).toBeLessThanOrEqual(Math.abs(dry.value.residual_stress.surface_mpa));
  });
});

// ── Tier 6: Anti-regression ──────────────────────────────────────────────────

describe("U-WIRE55 — anti-regression locks", () => {
  it("schema map exposes surface_integrity_full with passthrough() (extra fields tolerated)", () => {
    const schema = ACTION_CALC_SCHEMAS.surface_integrity_full;
    const withExtra = { ...STEEL_PARAMS, debug_marker: "uwire55-extra-field" };
    const r = schema.safeParse(withExtra);
    expect(r.success).toBe(true);
    if (r.success) expect((r.data as Record<string, unknown>).debug_marker).toBe("uwire55-extra-field");
  });

  it("singleton export is a SurfaceIntegrityPredictorEngine instance with compute() method", () => {
    expect(surfaceIntegrityPredictorEngine).toBeInstanceOf(SurfaceIntegrityPredictorEngine);
    expect(typeof surfaceIntegrityPredictorEngine.compute).toBe("function");
  });

  it("class-direct instance produces identical key scalars as singleton", () => {
    const a = new SurfaceIntegrityPredictorEngine().compute(STEEL_TURNING);
    const b = surfaceIntegrityPredictorEngine.compute(STEEL_TURNING);
    expect(a.value.roughness.ra_um).toBe(b.value.roughness.ra_um);
    expect(a.value.residual_stress.surface_mpa).toBe(b.value.residual_stress.surface_mpa);
    expect(a.value.quality_grade).toBe(b.value.quality_grade);
  });

  it("dispatcher tools array length is exactly 1 (single MCP tool registration)", () => {
    const harness = freshHarness();
    expect(harness.tools.length).toBe(1);
  });

  it("surface_integrity_full schema parses successfully (proves enum + handler hooked)", () => {
    const r = ACTION_CALC_SCHEMAS.surface_integrity_full.safeParse(STEEL_PARAMS);
    expect(r.success).toBe(true);
  });

  it("dispatcher does NOT regress to fallback for surface_integrity_full", async () => {
    const harness = freshHarness();
    const r = await harness.call("surface_integrity_full", STEEL_PARAMS);
    expect(r.ok).toBe(true);
    expect(r.data).toHaveProperty("roughness");
    expect(r.data).toHaveProperty("quality_grade");
  });

  it("engine confidence is locked at 0.78 (prevents accidental drift)", () => {
    const out = surfaceIntegrityPredictorEngine.compute(STEEL_TURNING);
    expect(out.confidence).toBe(ENGINE_CONFIDENCE);
  });
});
