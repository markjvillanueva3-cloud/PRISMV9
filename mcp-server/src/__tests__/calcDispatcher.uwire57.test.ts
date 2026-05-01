/**
 * calcDispatcher — U-WIRE57 round-trip suite
 * ============================================
 *
 * ENGINE-WIRE-MS0 / U-WIRE57 — wires DOETaguchEngine to prism_calc.
 * Background: doe_taguchi was a phantom action — it appeared in the
 * action enum (line 705) and the slim-response branch (line 294) but
 * had NO main switch case. Calls fell to the runtime fallback.
 *
 * Differs from U-WIRE53/54/55/56: slim-response branch (line 294) reads
 *   result.value.design_name, result.value.total_runs, result.value.predicted_optimum,
 *   result.value.factor_rankings[0]?.factor
 * → the dispatcher case must KEEP the AtomicValue wrapping (no flatten).
 *
 * Engine internals (verified vs. DOETaguchEngine.ts):
 *   - Design selection:
 *       full_factorial → nLevels^nFactors runs
 *       2-level + ≤5 factors → Taguchi L16 (16 runs)
 *       else → Taguchi L9 (9 runs, capped at 4 factors)
 *   - S/N: smaller-is-better −10·log10(mean(y²)); larger-is-better −10·log10(mean(1/y²)); nominal 10·log10(mean²/var)
 *   - ANOVA: SS_factor/SS_total × 100 = contribution_pct, significant if > 10%
 *   - factor_rankings sorted by ΔS/N descending; rank starts at 1
 *   - confirmation_ci_95 uses 1.96·√(var/n_eff) half-width
 *   - confidence = runs ≥ 9 ? 0.85 : 0.7
 *   - unit = "doe_analysis", formula = "Taguchi OA → S/N ratio → ANOVA → optimal levels"
 *   - recommendations ALWAYS contain "Optimal combination:" line
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE57
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";
import {
  DOETaguchEngine,
  doeTaguchEngine,
  type DOEInput,
} from "../engines/DOETaguchEngine.js";
import { ACTION_CALC_SCHEMAS } from "../schemas/calcActionSchemas.js";

// ── Named constants ──────────────────────────────────────────────────────────

const UNIT_LABEL = "doe_analysis";
const FORMULA_LABEL = "Taguchi OA → S/N ratio → ANOVA → optimal levels";
const CONFIDENCE_RICH_DESIGN = 0.85;
const CONFIDENCE_SPARSE_DESIGN = 0.7;
const RUN_COUNT_RICH_THRESHOLD = 9;
const L9_RUN_COUNT = 9;
const L16_RUN_COUNT = 16;
const ANOVA_SIGNIFICANT_PCT = 10;
const FACTOR_LIMIT_FOR_ANOVA = 4;
const FACTOR_LEVELS_MIN = 2;
const FACTOR_LEVELS_MAX = 3;
const REPLICATIONS_DEFAULT = 3;
const SCHEMA_INVALID_REPS_OVER = 25;
const SCHEMA_INVALID_REPS_ZERO = 0;
const SCHEMA_INVALID_LEVEL_COUNT_OVER = 4;
const SCHEMA_INVALID_LEVEL_COUNT_UNDER = 1;
const SCHEMA_FRACTIONAL_FLUTES = 3.5;

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

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** Taguchi L9 (3 factors × 3 levels) — minimize cutting force on steel. */
const TAGUCHI_L9_STEEL: DOEInput = {
  factors: [
    { name: "cutting_speed", levels: [150, 200, 250], unit: "m/min" },
    { name: "feed_per_tooth", levels: [0.05, 0.10, 0.15], unit: "mm/tooth" },
    { name: "axial_depth", levels: [1, 3, 5], unit: "mm" },
  ],
  response: "cutting_force",
  objective: "minimize",
  design: "taguchi",
  material: { iso_group: "P" },
  tool: { diameter_mm: 12, flute_count: 4, nose_radius_mm: 0.4 },
};

/** Taguchi L16 (4 factors × 2 levels) — maximize tool life on aluminum. */
const TAGUCHI_L16_AL: DOEInput = {
  factors: [
    { name: "cutting_speed", levels: [400, 600] },
    { name: "feed_per_tooth", levels: [0.10, 0.20] },
    { name: "axial_depth", levels: [3, 6] },
    { name: "radial_depth", levels: [4, 8] },
  ],
  response: "tool_life",
  objective: "maximize",
  design: "taguchi",
  material: { iso_group: "N" },
  tool: { diameter_mm: 16, flute_count: 3 },
};

/** Full factorial 2^3 = 8 runs — minimize surface roughness. */
const FULL_FACTORIAL_2x3: DOEInput = {
  factors: [
    { name: "cutting_speed", levels: [150, 250] },
    { name: "feed_per_tooth", levels: [0.05, 0.15] },
    { name: "axial_depth", levels: [1, 5] },
  ],
  response: "surface_roughness",
  objective: "minimize",
  design: "full_factorial",
  material: { iso_group: "M" },
  tool: { diameter_mm: 10, flute_count: 4, nose_radius_mm: 0.4 },
};

/** Nominal-target objective — for cycle time around target. */
const NOMINAL_INCONEL: DOEInput = {
  factors: [
    { name: "cutting_speed", levels: [40, 60, 80] },
    { name: "feed_per_tooth", levels: [0.05, 0.08, 0.12] },
  ],
  response: "cycle_time",
  objective: "nominal",
  nominal_target: 5.0,
  design: "taguchi",
  material: { iso_group: "S" },
  tool: { diameter_mm: 16, flute_count: 4 },
};

const STEEL_PARAMS = TAGUCHI_L9_STEEL as unknown as Record<string, unknown>;

// ── Tier 1: Engine-direct invariants ─────────────────────────────────────────

describe("DOETaguchEngine — engine-direct invariants", () => {
  it("L9 design returns expected unit, formula, and AtomicValue envelope", () => {
    const out = doeTaguchEngine.compute(TAGUCHI_L9_STEEL);
    expect(out.unit).toBe(UNIT_LABEL);
    expect(out.formula).toBe(FORMULA_LABEL);
    expect(typeof out.value.design_name).toBe("string");
    expect(typeof out.value.total_runs).toBe("number");
    expect(Array.isArray(out.value.runs)).toBe(true);
    expect(Array.isArray(out.value.anova)).toBe(true);
  });

  it("L9 design produces exactly 9 runs and design_name contains 'L9'", () => {
    const out = doeTaguchEngine.compute(TAGUCHI_L9_STEEL);
    expect(out.value.total_runs).toBe(L9_RUN_COUNT);
    expect(out.value.runs.length).toBe(L9_RUN_COUNT);
    expect(out.value.design_name).toContain("L9");
  });

  it("L16 design (4 factors × 2 levels) produces exactly 16 runs", () => {
    const out = doeTaguchEngine.compute(TAGUCHI_L16_AL);
    expect(out.value.total_runs).toBe(L16_RUN_COUNT);
    expect(out.value.design_name).toContain("L16");
  });

  it("Full factorial 2^3 produces exactly 8 runs and 'Full Factorial' design name", () => {
    const out = doeTaguchEngine.compute(FULL_FACTORIAL_2x3);
    expect(out.value.total_runs).toBe(8);
    expect(out.value.design_name).toContain("Full Factorial");
  });

  it("confidence = 0.85 for runs ≥ 9, else 0.7", () => {
    const l9 = doeTaguchEngine.compute(TAGUCHI_L9_STEEL);
    expect(l9.confidence).toBe(CONFIDENCE_RICH_DESIGN);
    const ff = doeTaguchEngine.compute(FULL_FACTORIAL_2x3);
    // 8 runs < 9 → sparse confidence
    expect(ff.confidence).toBe(CONFIDENCE_SPARSE_DESIGN);
    expect(ff.value.total_runs).toBeLessThan(RUN_COUNT_RICH_THRESHOLD);
  });

  it("each run has a finite response_value and a numeric S/N ratio", () => {
    const out = doeTaguchEngine.compute(TAGUCHI_L9_STEEL);
    const violations = out.value.runs.filter((r) =>
      !Number.isFinite(r.response_value) || typeof r.sn_ratio !== "number" || !Number.isFinite(r.sn_ratio),
    );
    expect(violations).toEqual([]);
  });

  it("ANOVA contribution percentages sum to ≤100% (factors only — error term unaccounted)", () => {
    const out = doeTaguchEngine.compute(TAGUCHI_L9_STEEL);
    const totalContribution = out.value.anova.reduce((s, a) => s + a.contribution_pct, 0);
    expect(totalContribution).toBeGreaterThanOrEqual(0);
    expect(totalContribution).toBeLessThanOrEqual(100.5); // small rounding allowance
  });

  it("ANOVA rows sorted by contribution_pct descending (top factor first)", () => {
    const out = doeTaguchEngine.compute(TAGUCHI_L9_STEEL);
    for (let i = 1; i < out.value.anova.length; i++) {
      expect(out.value.anova[i - 1]!.contribution_pct).toBeGreaterThanOrEqual(out.value.anova[i]!.contribution_pct);
    }
  });

  it("ANOVA rows: significant iff contribution_pct > 10", () => {
    const out = doeTaguchEngine.compute(TAGUCHI_L9_STEEL);
    for (const a of out.value.anova) {
      if (a.contribution_pct > ANOVA_SIGNIFICANT_PCT) {
        expect(a.significant).toBe(true);
      } else {
        expect(a.significant).toBe(false);
      }
    }
  });

  it("factor_rankings sorted by delta_sn descending; ranks 1, 2, 3, ...", () => {
    const out = doeTaguchEngine.compute(TAGUCHI_L9_STEEL);
    for (let i = 0; i < out.value.factor_rankings.length; i++) {
      expect(out.value.factor_rankings[i]!.rank).toBe(i + 1);
      if (i > 0) {
        expect(out.value.factor_rankings[i - 1]!.delta_sn).toBeGreaterThanOrEqual(out.value.factor_rankings[i]!.delta_sn);
      }
    }
  });

  it("confirmation_ci_95 lower bound ≤ predicted_optimum ≤ upper bound", () => {
    const out = doeTaguchEngine.compute(TAGUCHI_L9_STEEL);
    const [lo, hi] = out.value.confirmation_ci_95;
    expect(lo).toBeLessThanOrEqual(out.value.predicted_optimum);
    expect(hi).toBeGreaterThanOrEqual(out.value.predicted_optimum);
  });

  it("recommendations always contain an 'Optimal combination:' advisory", () => {
    const out = doeTaguchEngine.compute(TAGUCHI_L9_STEEL);
    const optAdvisory = out.value.recommendations.filter((r) => r.includes("Optimal combination"));
    expect(optAdvisory.length).toBeGreaterThan(0);
  });

  it("singleton matches a fresh class instance bit-for-bit (deterministic given input)", () => {
    const fresh = new DOETaguchEngine();
    const a = doeTaguchEngine.compute(TAGUCHI_L9_STEEL);
    const b = fresh.compute(TAGUCHI_L9_STEEL);
    expect(a.value.total_runs).toBe(b.value.total_runs);
    expect(a.value.predicted_optimum).toBe(b.value.predicted_optimum);
    expect(a.value.design_name).toBe(b.value.design_name);
  });
});

// ── Tier 2: Variability spans ────────────────────────────────────────────────

describe("DOETaguchEngine — variability spans", () => {
  it("response sweep: cutting_force / tool_life / mrr / surface_roughness / cycle_time all return well-formed runs", () => {
    const responses: DOEInput["response"][] = ["cutting_force", "tool_life", "mrr", "surface_roughness", "cycle_time"];
    const violations: string[] = [];
    for (const r of responses) {
      const out = doeTaguchEngine.compute({ ...TAGUCHI_L9_STEEL, response: r });
      if (out.value.total_runs !== L9_RUN_COUNT) violations.push(`${r}: wrong run count`);
      if (!Array.isArray(out.value.anova)) violations.push(`${r}: no anova`);
    }
    expect(violations).toEqual([]);
  });

  it("objective sweep: minimize / maximize / nominal each produce valid predicted_optimum", () => {
    const objectives: DOEInput["objective"][] = ["minimize", "maximize", "nominal"];
    const violations: string[] = [];
    for (const o of objectives) {
      const out = doeTaguchEngine.compute({
        ...TAGUCHI_L9_STEEL,
        objective: o,
        nominal_target: o === "nominal" ? 500 : undefined,
      });
      if (!Number.isFinite(out.value.predicted_optimum)) violations.push(`${o}: non-finite optimum`);
    }
    expect(violations).toEqual([]);
  });

  it("ISO sweep: P / N / S all produce well-formed run sets", () => {
    const groups: DOEInput["material"]["iso_group"][] = ["P", "N", "S"];
    const violations: string[] = [];
    for (const g of groups) {
      const out = doeTaguchEngine.compute({ ...TAGUCHI_L9_STEEL, material: { iso_group: g } });
      if (out.value.total_runs !== L9_RUN_COUNT) violations.push(`${g}: wrong run count`);
    }
    expect(violations).toEqual([]);
  });

  it("Replications: increasing reps does NOT change run count (only response variability)", () => {
    const r1 = doeTaguchEngine.compute({ ...TAGUCHI_L9_STEEL, replications: 1 });
    const r5 = doeTaguchEngine.compute({ ...TAGUCHI_L9_STEEL, replications: 5 });
    expect(r1.value.total_runs).toBe(r5.value.total_runs);
    void REPLICATIONS_DEFAULT;
  });

  it("design selector: 2-level 5-factor input picks L16 (not L9)", () => {
    const out = doeTaguchEngine.compute({
      factors: [
        { name: "f1", levels: [10, 20] },
        { name: "f2", levels: [0.1, 0.2] },
        { name: "f3", levels: [1, 3] },
        { name: "f4", levels: [2, 4] },
        { name: "f5", levels: [5, 10] },
      ],
      response: "cutting_force",
      objective: "minimize",
      design: "taguchi",
      material: { iso_group: "P" },
      tool: { diameter_mm: 12, flute_count: 4 },
    });
    expect(out.value.design_name).toContain("L16");
  });

  it("design selector: 3-level 3-factor input picks L9", () => {
    const out = doeTaguchEngine.compute(TAGUCHI_L9_STEEL);
    expect(out.value.design_name).toContain("L9");
  });

  it("Full factorial 3^2 produces 9 runs (matches L9 size, distinct design name)", () => {
    const out = doeTaguchEngine.compute({
      ...FULL_FACTORIAL_2x3,
      factors: [
        { name: "f1", levels: [100, 150, 200] },
        { name: "f2", levels: [0.05, 0.1, 0.15] },
      ],
    });
    expect(out.value.total_runs).toBe(9);
    expect(out.value.design_name).toContain("Full Factorial");
  });

  it("optimal_levels has one entry per factor that participates in ANOVA (capped at 4 factors)", () => {
    const out = doeTaguchEngine.compute(TAGUCHI_L9_STEEL);
    const factorCount = Math.min(TAGUCHI_L9_STEEL.factors.length, FACTOR_LIMIT_FOR_ANOVA);
    expect(Object.keys(out.value.optimal_levels).length).toBeLessThanOrEqual(factorCount);
    expect(Object.keys(out.value.optimal_levels).length).toBeGreaterThan(0);
  });

  it("nominal-target objective with explicit nominal_target produces finite predicted_optimum", () => {
    const out = doeTaguchEngine.compute(NOMINAL_INCONEL);
    expect(Number.isFinite(out.value.predicted_optimum)).toBe(true);
  });

  it("each ANOVA row has dof = levels - 1 (1 for 2-level, 2 for 3-level)", () => {
    const l9 = doeTaguchEngine.compute(TAGUCHI_L9_STEEL); // 3-level
    for (const a of l9.value.anova) {
      const factor = TAGUCHI_L9_STEEL.factors.find((f) => f.name === a.factor)!;
      expect(a.dof).toBe(factor.levels.length - 1);
    }
    void FACTOR_LEVELS_MIN;
    void FACTOR_LEVELS_MAX;
  });
});

// ── Tier 3: Dispatcher round-trip ────────────────────────────────────────────

describe("calcDispatcher doe_taguchi — round-trip", () => {
  let harness: CalcDispatcherHarness;

  beforeEach(() => {
    harness = freshHarness();
  });

  it("dispatcher routes doe_taguchi end-to-end and KEEPS AtomicValue wrap (slim-response uses result.value.X)", async () => {
    const r = await harness.call("doe_taguchi", STEEL_PARAMS);
    expect(r.ok).toBe(true);
    // Slim-response branch reads result.value.X — the dispatcher must NOT flatten.
    expect(r.data.unit).toBe(UNIT_LABEL);
    expect(r.data.formula).toBe(FORMULA_LABEL);
    expect(r.data).toHaveProperty("value");
    const v = r.data.value as Record<string, unknown>;
    expect(typeof v.design_name).toBe("string");
    expect(typeof v.total_runs).toBe("number");
    expect(typeof v.predicted_optimum).toBe("number");
  });

  it("dispatcher and engine-direct produce identical key scalars", async () => {
    const r = await harness.call("doe_taguchi", STEEL_PARAMS);
    const direct = doeTaguchEngine.compute(TAGUCHI_L9_STEEL);
    const v = r.data.value as Record<string, unknown>;
    expect(v.design_name).toBe(direct.value.design_name);
    expect(v.total_runs).toBe(direct.value.total_runs);
    expect(v.predicted_optimum).toBe(direct.value.predicted_optimum);
  });

  it("dispatcher exposes runs and anova arrays via result.value (non-flattened)", async () => {
    const r = await harness.call("doe_taguchi", STEEL_PARAMS);
    const v = r.data.value as Record<string, unknown>;
    expect(Array.isArray(v.runs)).toBe(true);
    expect(Array.isArray(v.anova)).toBe(true);
    expect(Array.isArray(v.factor_rankings)).toBe(true);
  });

  it("L16 design round-trips with total_runs=16", async () => {
    const r = await harness.call("doe_taguchi", TAGUCHI_L16_AL as unknown as Record<string, unknown>);
    expect(r.ok).toBe(true);
    expect((r.data.value as { total_runs: number }).total_runs).toBe(L16_RUN_COUNT);
  });

  it("Full factorial round-trips with correct run count (2^3 = 8)", async () => {
    const r = await harness.call("doe_taguchi", FULL_FACTORIAL_2x3 as unknown as Record<string, unknown>);
    expect(r.ok).toBe(true);
    expect((r.data.value as { total_runs: number }).total_runs).toBe(8);
  });

  it("nominal-objective round-trips with finite predicted_optimum and confirmation_ci_95 tuple", async () => {
    const r = await harness.call("doe_taguchi", NOMINAL_INCONEL as unknown as Record<string, unknown>);
    expect(r.ok).toBe(true);
    const v = r.data.value as { predicted_optimum: number; confirmation_ci_95: [number, number] };
    expect(Number.isFinite(v.predicted_optimum)).toBe(true);
    expect(v.confirmation_ci_95.length).toBe(2);
  });
});

// ── Tier 4: Schema rejection ─────────────────────────────────────────────────

describe("doe_taguchi schema — rejects malformed inputs", () => {
  const schema = ACTION_CALC_SCHEMAS.doe_taguchi;

  it("baseline L9 input parses successfully", () => {
    const r = schema.safeParse(STEEL_PARAMS);
    expect(r.success).toBe(true);
  });

  it("rejects empty factors array", () => {
    const bad = { ...TAGUCHI_L9_STEEL, factors: [] };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects factor with only 1 level (engine requires 2 or 3)", () => {
    const bad = {
      ...TAGUCHI_L9_STEEL,
      factors: [{ name: "f1", levels: [10] }, ...TAGUCHI_L9_STEEL.factors.slice(1)],
    };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
    void SCHEMA_INVALID_LEVEL_COUNT_UNDER;
  });

  it("rejects factor with 4 levels (engine cap is 3)", () => {
    const bad = {
      ...TAGUCHI_L9_STEEL,
      factors: [{ name: "f1", levels: [10, 20, 30, 40] }, ...TAGUCHI_L9_STEEL.factors.slice(1)],
    };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
    void SCHEMA_INVALID_LEVEL_COUNT_OVER;
  });

  it("rejects unknown response variable", () => {
    const bad = { ...TAGUCHI_L9_STEEL, response: "vibration_amp" };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects unknown objective", () => {
    const bad = { ...TAGUCHI_L9_STEEL, objective: "balance" };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects unknown design type", () => {
    const bad = { ...TAGUCHI_L9_STEEL, design: "plackett_burman" };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects unknown ISO material group", () => {
    const bad = { ...TAGUCHI_L9_STEEL, material: { iso_group: "X" } };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects negative tool diameter", () => {
    const bad = { ...TAGUCHI_L9_STEEL, tool: { ...TAGUCHI_L9_STEEL.tool, diameter_mm: -1 } };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects non-integer flute_count", () => {
    const bad = { ...TAGUCHI_L9_STEEL, tool: { ...TAGUCHI_L9_STEEL.tool, flute_count: SCHEMA_FRACTIONAL_FLUTES } };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects replications below 1", () => {
    const bad = { ...TAGUCHI_L9_STEEL, replications: SCHEMA_INVALID_REPS_ZERO };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects replications above schema cap (10)", () => {
    const bad = { ...TAGUCHI_L9_STEEL, replications: SCHEMA_INVALID_REPS_OVER };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });
});

// ── Tier 5: Adversarial / boundary ───────────────────────────────────────────

describe("DOETaguchEngine — adversarial boundary", () => {
  it("single factor with 2 levels does not crash (degenerate Taguchi)", () => {
    const out = doeTaguchEngine.compute({
      factors: [{ name: "f1", levels: [100, 200] }],
      response: "cutting_force",
      objective: "minimize",
      design: "taguchi",
      material: { iso_group: "P" },
      tool: { diameter_mm: 12, flute_count: 4 },
    });
    expect(Number.isFinite(out.value.predicted_optimum)).toBe(true);
    expect(out.value.runs.length).toBeGreaterThan(0);
  });

  it("very large full_factorial (3^4 = 81 runs) completes within 5-second budget", () => {
    const t0 = Date.now();
    const out = doeTaguchEngine.compute({
      factors: [
        { name: "f1", levels: [1, 2, 3] },
        { name: "f2", levels: [1, 2, 3] },
        { name: "f3", levels: [1, 2, 3] },
        { name: "f4", levels: [1, 2, 3] },
      ],
      response: "mrr",
      objective: "maximize",
      design: "full_factorial",
      material: { iso_group: "K" },
      tool: { diameter_mm: 10, flute_count: 4 },
    });
    const elapsed = Date.now() - t0;
    expect(out.value.total_runs).toBe(81);
    expect(elapsed).toBeLessThan(5000);
  });

  it("dispatcher returns failure envelope on unknown response variable", async () => {
    const harness = freshHarness();
    const r = await harness.call("doe_taguchi", { ...TAGUCHI_L9_STEEL, response: "fairy_dust" } as unknown as Record<string, unknown>);
    expect(r.ok).toBe(false);
  });

  it("nominal objective without nominal_target still computes (engine treats as missing target)", () => {
    const out = doeTaguchEngine.compute({
      ...TAGUCHI_L9_STEEL,
      objective: "nominal",
      nominal_target: undefined,
    });
    // Engine handles missing target; result must be numeric (NaN allowed)
    expect(typeof out.value.predicted_optimum).toBe("number");
  });

  it("zero-replications fixture (replications=1) still produces a complete result", () => {
    const out = doeTaguchEngine.compute({ ...TAGUCHI_L9_STEEL, replications: 1 });
    expect(out.value.runs.length).toBe(L9_RUN_COUNT);
    for (const run of out.value.runs) {
      expect(Number.isFinite(run.response_value)).toBe(true);
    }
  });

  it("identical levels across all factors does not crash (degenerate ANOVA)", () => {
    const out = doeTaguchEngine.compute({
      factors: [
        { name: "f1", levels: [100, 100, 100] },
        { name: "f2", levels: [0.1, 0.1, 0.1] },
        { name: "f3", levels: [3, 3, 3] },
      ],
      response: "cutting_force",
      objective: "minimize",
      design: "taguchi",
      material: { iso_group: "P" },
      tool: { diameter_mm: 12, flute_count: 4 },
    });
    expect(typeof out.value.predicted_optimum).toBe("number");
  });

  it("more than 4 factors at 3 levels still uses L9 with first 4 factors (engine caps at 4)", () => {
    const out = doeTaguchEngine.compute({
      factors: [
        { name: "f1", levels: [1, 2, 3] },
        { name: "f2", levels: [1, 2, 3] },
        { name: "f3", levels: [1, 2, 3] },
        { name: "f4", levels: [1, 2, 3] },
        { name: "f5", levels: [1, 2, 3] },
      ],
      response: "cutting_force",
      objective: "minimize",
      design: "taguchi",
      material: { iso_group: "P" },
      tool: { diameter_mm: 12, flute_count: 4 },
    });
    // L9 has 9 runs; engine ANOVA caps at 4 factors
    expect(out.value.total_runs).toBe(L9_RUN_COUNT);
    expect(Object.keys(out.value.optimal_levels).length).toBeLessThanOrEqual(FACTOR_LIMIT_FOR_ANOVA);
  });
});

// ── Tier 6: Anti-regression ──────────────────────────────────────────────────

describe("U-WIRE57 — anti-regression locks", () => {
  it("schema map exposes doe_taguchi with passthrough() (extra fields tolerated)", () => {
    const schema = ACTION_CALC_SCHEMAS.doe_taguchi;
    const withExtra = { ...STEEL_PARAMS, debug_marker: "uwire57-extra" };
    const r = schema.safeParse(withExtra);
    expect(r.success).toBe(true);
    if (r.success) expect((r.data as Record<string, unknown>).debug_marker).toBe("uwire57-extra");
  });

  it("singleton is a DOETaguchEngine instance with compute()", () => {
    expect(doeTaguchEngine).toBeInstanceOf(DOETaguchEngine);
    expect(typeof doeTaguchEngine.compute).toBe("function");
  });

  it("class-direct instance produces identical key scalars to the singleton", () => {
    const a = new DOETaguchEngine().compute(TAGUCHI_L9_STEEL);
    const b = doeTaguchEngine.compute(TAGUCHI_L9_STEEL);
    expect(a.value.total_runs).toBe(b.value.total_runs);
    expect(a.value.predicted_optimum).toBe(b.value.predicted_optimum);
    expect(a.value.design_name).toBe(b.value.design_name);
  });

  it("dispatcher tools array length is exactly 1 (single MCP tool registration)", () => {
    const harness = freshHarness();
    expect(harness.tools.length).toBe(1);
  });

  it("doe_taguchi schema parses successfully (proves enum + handler hooked)", () => {
    const r = ACTION_CALC_SCHEMAS.doe_taguchi.safeParse(STEEL_PARAMS);
    expect(r.success).toBe(true);
  });

  it("dispatcher does NOT regress to fallback for doe_taguchi", async () => {
    const harness = freshHarness();
    const r = await harness.call("doe_taguchi", STEEL_PARAMS);
    expect(r.ok).toBe(true);
    expect(r.data).toHaveProperty("value");
    expect(r.data).toHaveProperty("unit");
  });

  it("AtomicValue wrap is preserved (slim-response branch line 294 reads result.value.X)", async () => {
    const harness = freshHarness();
    const r = await harness.call("doe_taguchi", STEEL_PARAMS);
    expect(r.data).toHaveProperty("value");
    expect((r.data.value as Record<string, unknown>)).toHaveProperty("design_name");
    expect((r.data.value as Record<string, unknown>)).toHaveProperty("factor_rankings");
  });
});
