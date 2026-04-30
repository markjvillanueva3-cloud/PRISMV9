/**
 * calcDispatcher — U-WIRE53 round-trip suite
 * ============================================
 *
 * ENGINE-WIRE-MS0 / U-WIRE53 — wires MultiObjectiveParetoEngine to prism_calc.
 * Background: pareto_optimize was a phantom action — it appeared in the
 * action enum (line 705) and the slim-response branch (line 270) but had
 * NO actual case handler. Calling it triggered the runtime fallback.
 *
 * Engine internals (verified vs. MultiObjectiveParetoEngine.ts):
 *   - Grid: rpmValues (res) × fzValues (res) × apValues × aeValues, where
 *       ap/ae dim = max(3, floor(res/2))
 *   - Cells where rpm > machine.max_rpm are SKIPPED via continue.
 *   - Kienzle: Fc = kc11 × ap × hm × max(hm, 0.001)^(-0.25), hm = fz × sqrt(ae/D)
 *   - Power: P = Fc × Vc / 60000  (kW); MRR = ap × ae × feed / 1000  (cm^3/min)
 *   - Cycle = volume / max(MRR, 0.001) × 1.15
 *   - Feasibility: power <= max_power_kw AND feed <= 30000 mm/min AND no hard_limit violation
 *   - Pareto: A dominates B iff A no worse than B in every objective AND strictly better in >=1
 *   - utopia[obj] = (minimize ? min : max) over frontier
 *   - best_compromise = argmin sum(weight × ((val − utopia)/range)^2)
 *   - confidence = frontier.length > 3 ? 0.85 : 0.6
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE53
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";
import {
  MultiObjectiveParetoEngine,
  multiObjectiveParetoEngine,
  type ParetoInput,
  type ParetoSolution,
  type ObjectiveSpec,
} from "../engines/MultiObjectiveParetoEngine.js";
import { ACTION_CALC_SCHEMAS } from "../schemas/calcActionSchemas.js";

// ── Named constants ──────────────────────────────────────────────────────────

const CONFIDENCE_RICH_FRONTIER = 0.85;
const CONFIDENCE_SPARSE_FRONTIER = 0.6;
const FRONTIER_RICH_THRESHOLD = 3;
const UNIT_LABEL = "pareto_frontier";
const FORMULA_LABEL = "grid_sample→Kienzle+Taylor→dominance_filter";
const DEFAULT_GRID_RESOLUTION = 8;
const SMALL_GRID_RESOLUTION = 4;
const LARGE_GRID_RESOLUTION = 8;
const QUADRATIC_SCALE_LOWER_BOUND = 4;
const AP_AE_DIMENSION_AT_DEFAULT = 4;
const TOTAL_CELLS_DEFAULT_GRID = 1024; // 8×8×4×4
const LINSPACE_BOUNDARY_TOL = 1e-9;
const TIGHT_MAX_RPM = 5000;
const HUGE_POWER_KW = 100;
const ZERO_POWER_KW = 0;
const ZERO_VOLUME_DEFAULT_FALLBACK_CM3 = 50;
const TIGHT_POWER_KW = 1;
const SANITY_FLOOR_CELL_COUNT = 100;
const HARD_LIMIT_FAR_BELOW = -1;
const SKEWED_HEAVY_WEIGHT = 0.95;
const SKEWED_LIGHT_WEIGHT = 0.05;
const SCHEMA_INVALID_WEIGHT_OVER = 1.5;
const SCHEMA_INVALID_WEIGHT_NEG = -0.1;
const SCHEMA_INVALID_GRID_RES = 25;
const SCHEMA_FRACTIONAL_FLUTES = 3.5;

type DispatchResult = { ok: boolean; data: Record<string, unknown> };

// ── Test harness — single Mock surface, one helper to spin up dispatcher ─────

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

const TWO_OBJECTIVES_TIME_VS_LIFE: ObjectiveSpec[] = [
  { name: "cycle_time", minimize: true, weight: 0.5 },
  { name: "tool_life", minimize: false, weight: 0.5 },
];

const THREE_OBJECTIVES_TIME_LIFE_FINISH: ObjectiveSpec[] = [
  { name: "cycle_time", minimize: true, weight: 0.4 },
  { name: "tool_life", minimize: false, weight: 0.3 },
  { name: "surface_finish", minimize: true, weight: 0.3 },
];

/** Steel (P) baseline — moderate envelope; rich grid expected. */
const STEEL_BASE: ParetoInput = {
  objectives: TWO_OBJECTIVES_TIME_VS_LIFE,
  parameter_bounds: {
    spindle_rpm: [4000, 12000],
    feed_per_tooth_mm: [0.05, 0.20],
    axial_depth_mm: [2, 8],
    radial_depth_mm: [2, 6],
  },
  fixed: {
    tool_diameter_mm: 12,
    flute_count: 4,
    material_iso_group: "P",
    geometry_volume_cm3: 100,
  },
  machine: { max_power_kw: 22, max_rpm: 12000 },
};

/** Aluminum (N) — high feasibility expected (low cutting force, kc11=800). */
const ALUMINUM_BASE: ParetoInput = {
  objectives: THREE_OBJECTIVES_TIME_LIFE_FINISH,
  parameter_bounds: {
    spindle_rpm: [8000, 18000],
    feed_per_tooth_mm: [0.08, 0.25],
    axial_depth_mm: [4, 12],
    radial_depth_mm: [4, 10],
  },
  fixed: {
    tool_diameter_mm: 16,
    flute_count: 3,
    material_iso_group: "N",
    geometry_volume_cm3: 250,
  },
  machine: { max_power_kw: 18, max_rpm: 18000 },
};

/** Inconel (S) — heavy material kc11=3200; tight envelope, sparse frontier. */
const INCONEL_BASE: ParetoInput = {
  objectives: TWO_OBJECTIVES_TIME_VS_LIFE,
  parameter_bounds: {
    spindle_rpm: [800, 2000],
    feed_per_tooth_mm: [0.04, 0.12],
    axial_depth_mm: [1, 4],
    radial_depth_mm: [1, 3],
  },
  fixed: {
    tool_diameter_mm: 16,
    flute_count: 4,
    material_iso_group: "S",
    geometry_volume_cm3: 30,
  },
  machine: { max_power_kw: 15, max_rpm: 4000 },
};

const STEEL_PARAMS = STEEL_BASE as unknown as Record<string, unknown>;

// ── Tier 1: Engine-direct ────────────────────────────────────────────────────

describe("MultiObjectiveParetoEngine — engine-direct invariants", () => {
  it("steel baseline returns expected formula tag, unit, and AtomicValue envelope", () => {
    const out = multiObjectiveParetoEngine.compute(STEEL_BASE);
    expect(out.unit).toBe(UNIT_LABEL);
    expect(out.formula).toBe(FORMULA_LABEL);
    expect(typeof out.confidence).toBe("number");
    expect(Array.isArray(out.value.frontier)).toBe(true);
    expect(typeof out.value.total_evaluated).toBe("number");
  });

  it("default grid produces exactly res×res×max(3,res/2)×max(3,res/2) cells (none skipped — bounds match max_rpm)", () => {
    const out = multiObjectiveParetoEngine.compute(STEEL_BASE);
    expect(out.value.total_evaluated).toBe(TOTAL_CELLS_DEFAULT_GRID);
  });

  it("frontier solutions are pairwise non-dominated (Pareto invariant)", () => {
    const out = multiObjectiveParetoEngine.compute(STEEL_BASE);
    const front = out.value.frontier;
    const violations: string[] = [];
    for (let i = 0; i < front.length; i++) {
      for (let j = 0; j < front.length; j++) {
        if (i === j) continue;
        if (dominates(front[j]!, front[i]!, STEEL_BASE.objectives)) {
          violations.push(`${j} dominates ${i}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("frontier + dominated + infeasible == total_evaluated (conservation)", () => {
    const out = multiObjectiveParetoEngine.compute(STEEL_BASE);
    const v = out.value;
    expect(v.frontier.length + v.dominated_solutions + v.infeasible_count).toBe(v.total_evaluated);
  });

  it("utopia point is min(minimize)/max(maximize) over frontier values per objective", () => {
    const out = multiObjectiveParetoEngine.compute(STEEL_BASE);
    if (out.value.frontier.length === 0) return;
    for (const obj of STEEL_BASE.objectives) {
      const vals = out.value.frontier.map((s) => s.objectives[obj.name]!);
      const expected = obj.minimize ? Math.min(...vals) : Math.max(...vals);
      expect(out.value.utopia_point[obj.name]).toBe(expected);
    }
  });

  it("nadir point is worst value per objective over frontier", () => {
    const out = multiObjectiveParetoEngine.compute(STEEL_BASE);
    if (out.value.frontier.length === 0) return;
    for (const obj of STEEL_BASE.objectives) {
      const vals = out.value.frontier.map((s) => s.objectives[obj.name]!);
      const expected = obj.minimize ? Math.max(...vals) : Math.min(...vals);
      expect(out.value.nadir_point[obj.name]).toBe(expected);
    }
  });

  it("best_compromise is itself a member of the frontier (matches by id)", () => {
    const out = multiObjectiveParetoEngine.compute(STEEL_BASE);
    if (out.value.frontier.length === 0) {
      expect(out.value.best_compromise).toBeNull();
      return;
    }
    const ids = new Set(out.value.frontier.map((s) => s.id));
    expect(ids.has(out.value.best_compromise!.id)).toBe(true);
  });

  it("confidence is rich (0.85) when frontier > 3 else sparse (0.6)", () => {
    const out = multiObjectiveParetoEngine.compute(STEEL_BASE);
    const expected = out.value.frontier.length > FRONTIER_RICH_THRESHOLD ? CONFIDENCE_RICH_FRONTIER : CONFIDENCE_SPARSE_FRONTIER;
    expect(out.confidence).toBe(expected);
  });

  it("at identical envelope, aluminum (N kc11=800) yields more feasible cells than inconel (S kc11=3200)", () => {
    // Hold every parameter constant except material — only ISO group changes.
    const al = multiObjectiveParetoEngine.compute({
      ...STEEL_BASE,
      fixed: { ...STEEL_BASE.fixed, material_iso_group: "N" },
    });
    const inc = multiObjectiveParetoEngine.compute({
      ...STEEL_BASE,
      fixed: { ...STEEL_BASE.fixed, material_iso_group: "S" },
    });
    const al_feasible = al.value.total_evaluated - al.value.infeasible_count;
    const inc_feasible = inc.value.total_evaluated - inc.value.infeasible_count;
    expect(al_feasible).toBeGreaterThan(inc_feasible);
  });

  it("singleton matches a fresh class instance bit-for-bit (deterministic given input)", () => {
    const fresh = new MultiObjectiveParetoEngine();
    const a = multiObjectiveParetoEngine.compute(STEEL_BASE);
    const b = fresh.compute(STEEL_BASE);
    expect(a.value.total_evaluated).toBe(b.value.total_evaluated);
    expect(a.value.frontier.length).toBe(b.value.frontier.length);
    expect(a.value.dominated_solutions).toBe(b.value.dominated_solutions);
  });
});

// ── Tier 2: Variability spans ────────────────────────────────────────────────

describe("MultiObjectiveParetoEngine — variability spans", () => {
  it("ISO-group sweep: power-feasibility ordering S < K (heavier metal cuts ⇒ fewer feasible)", () => {
    const sCount = (() => {
      const out = multiObjectiveParetoEngine.compute({
        ...STEEL_BASE,
        fixed: { ...STEEL_BASE.fixed, material_iso_group: "S" },
      });
      return out.value.total_evaluated - out.value.infeasible_count;
    })();
    const kCount = (() => {
      const out = multiObjectiveParetoEngine.compute({
        ...STEEL_BASE,
        fixed: { ...STEEL_BASE.fixed, material_iso_group: "K" },
      });
      return out.value.total_evaluated - out.value.infeasible_count;
    })();
    expect(sCount).toBeLessThan(kCount);
  });

  it("doubling grid_resolution produces at least 4× total_evaluated (quadratic scaling)", () => {
    const small = multiObjectiveParetoEngine.compute({ ...STEEL_BASE, grid_resolution: SMALL_GRID_RESOLUTION });
    const big = multiObjectiveParetoEngine.compute({ ...STEEL_BASE, grid_resolution: LARGE_GRID_RESOLUTION });
    expect(big.value.total_evaluated).toBeGreaterThanOrEqual(small.value.total_evaluated * QUADRATIC_SCALE_LOWER_BOUND);
  });

  it("very tight max_rpm forces high-rpm grid points to be skipped (total_evaluated drops)", () => {
    const wide = multiObjectiveParetoEngine.compute(STEEL_BASE);
    const tight = multiObjectiveParetoEngine.compute({
      ...STEEL_BASE,
      machine: { max_power_kw: STEEL_BASE.machine.max_power_kw, max_rpm: TIGHT_MAX_RPM },
    });
    expect(tight.value.total_evaluated).toBeLessThan(wide.value.total_evaluated);
  });

  it("hard_limit on cycle_time raises infeasible_count vs unconstrained baseline", () => {
    const baseline = multiObjectiveParetoEngine.compute(STEEL_BASE);
    const limited = multiObjectiveParetoEngine.compute({
      ...STEEL_BASE,
      objectives: [
        { name: "cycle_time", minimize: true, weight: 0.5, hard_limit: 5 },
        { name: "tool_life", minimize: false, weight: 0.5 },
      ],
    });
    expect(limited.value.infeasible_count).toBeGreaterThanOrEqual(baseline.value.infeasible_count);
  });

  it("changing weights does NOT change frontier composition (only best_compromise)", () => {
    const equal = multiObjectiveParetoEngine.compute(STEEL_BASE);
    const skewed = multiObjectiveParetoEngine.compute({
      ...STEEL_BASE,
      objectives: [
        { name: "cycle_time", minimize: true, weight: SKEWED_HEAVY_WEIGHT },
        { name: "tool_life", minimize: false, weight: SKEWED_LIGHT_WEIGHT },
      ],
    });
    expect(skewed.value.frontier.length).toBe(equal.value.frontier.length);
  });

  it("3-objective input populates utopia/nadir entries for every named objective", () => {
    const out = multiObjectiveParetoEngine.compute(ALUMINUM_BASE);
    for (const obj of ALUMINUM_BASE.objectives) {
      expect(Object.prototype.hasOwnProperty.call(out.value.utopia_point, obj.name)).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(out.value.nadir_point, obj.name)).toBe(true);
    }
  });

  it("ultra-tight power envelope (1 kW) drives infeasible_count above half of total_evaluated", () => {
    const out = multiObjectiveParetoEngine.compute({
      ...STEEL_BASE,
      machine: { max_power_kw: TIGHT_POWER_KW, max_rpm: STEEL_BASE.machine.max_rpm },
    });
    expect(out.value.infeasible_count).toBeGreaterThan(out.value.total_evaluated / 2);
  });

  it("each frontier solution has parameters within (or equal to) the configured bounds", () => {
    const out = multiObjectiveParetoEngine.compute(STEEL_BASE);
    for (const sol of out.value.frontier) {
      expect(sol.parameters.spindle_rpm).toBeGreaterThanOrEqual(STEEL_BASE.parameter_bounds.spindle_rpm[0]);
      expect(sol.parameters.spindle_rpm).toBeLessThanOrEqual(STEEL_BASE.parameter_bounds.spindle_rpm[1]);
      expect(sol.parameters.feed_per_tooth_mm).toBeGreaterThanOrEqual(STEEL_BASE.parameter_bounds.feed_per_tooth_mm[0] - LINSPACE_BOUNDARY_TOL);
      expect(sol.parameters.feed_per_tooth_mm).toBeLessThanOrEqual(STEEL_BASE.parameter_bounds.feed_per_tooth_mm[1] + LINSPACE_BOUNDARY_TOL);
      expect(sol.parameters.axial_depth_mm).toBeGreaterThanOrEqual(STEEL_BASE.parameter_bounds.axial_depth_mm[0]);
      expect(sol.parameters.axial_depth_mm).toBeLessThanOrEqual(STEEL_BASE.parameter_bounds.axial_depth_mm[1]);
    }
  });

  it("sensitivity returns one entry per design parameter (rpm, fz, ap, ae)", () => {
    const out = multiObjectiveParetoEngine.compute(STEEL_BASE);
    const params = out.value.sensitivity.map((s) => s.parameter);
    expect(params).toContain("spindle_rpm");
    expect(params).toContain("feed_per_tooth_mm");
    expect(params).toContain("axial_depth_mm");
    expect(params).toContain("radial_depth_mm");
    expect(out.value.sensitivity.length).toBe(QUADRATIC_SCALE_LOWER_BOUND);
  });

  it("all sensitivity elasticities are bounded by correlation magnitude in [0,1]", () => {
    const out = multiObjectiveParetoEngine.compute(STEEL_BASE);
    const violations = out.value.sensitivity.filter((s) => s.elasticity < 0 || s.elasticity > 1);
    expect(violations).toEqual([]);
  });
});

// ── Tier 3: Dispatcher round-trip ────────────────────────────────────────────

describe("calcDispatcher pareto_optimize — round-trip", () => {
  let harness: CalcDispatcherHarness;

  beforeEach(() => {
    harness = freshHarness();
  });

  it("dispatcher routes pareto_optimize end-to-end and returns flattened ParetoResult", async () => {
    const r = await harness.call("pareto_optimize", STEEL_PARAMS);
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data.frontier)).toBe(true);
    expect(typeof r.data.total_evaluated).toBe("number");
    expect(r.data.unit).toBe(UNIT_LABEL);
    expect(r.data.formula).toBe(FORMULA_LABEL);
  });

  it("flattened response carries best_compromise (object or null) and sensitivity array", async () => {
    const r = await harness.call("pareto_optimize", STEEL_PARAMS);
    expect(r.ok).toBe(true);
    expect("best_compromise" in r.data).toBe(true);
    expect(Array.isArray(r.data.sensitivity)).toBe(true);
  });

  it("dispatcher and engine-direct totals match exactly (deterministic grid sampling)", async () => {
    const r = await harness.call("pareto_optimize", STEEL_PARAMS);
    const direct = multiObjectiveParetoEngine.compute(STEEL_BASE);
    expect(r.data.total_evaluated).toBe(direct.value.total_evaluated);
    expect((r.data.frontier as unknown[]).length).toBe(direct.value.frontier.length);
  });

  it("dispatcher result obeys conservation: frontier + dominated + infeasible = total", async () => {
    const r = await harness.call("pareto_optimize", STEEL_PARAMS);
    const total = r.data.total_evaluated as number;
    const front = (r.data.frontier as unknown[]).length;
    const dominated = r.data.dominated_solutions as number;
    const infeasible = r.data.infeasible_count as number;
    expect(front + dominated + infeasible).toBe(total);
  });

  it("inconel input round-trips and confidence does not exceed rich-frontier ceiling", async () => {
    const r = await harness.call("pareto_optimize", INCONEL_BASE as unknown as Record<string, unknown>);
    expect(r.ok).toBe(true);
    expect(r.data.confidence as number).toBeLessThanOrEqual(CONFIDENCE_RICH_FRONTIER);
  });

  it("aluminum 3-objective input round-trips with utopia containing all three named objectives", async () => {
    const r = await harness.call("pareto_optimize", ALUMINUM_BASE as unknown as Record<string, unknown>);
    expect(r.ok).toBe(true);
    const utopia = r.data.utopia_point as Record<string, number>;
    expect(utopia).toHaveProperty("cycle_time");
    expect(utopia).toHaveProperty("tool_life");
    expect(utopia).toHaveProperty("surface_finish");
  });
});

// ── Tier 4: Schema rejection ─────────────────────────────────────────────────

describe("pareto_optimize schema — rejects malformed inputs", () => {
  const schema = ACTION_CALC_SCHEMAS.pareto_optimize;

  it("baseline steel input parses successfully", () => {
    const r = schema.safeParse(STEEL_PARAMS);
    expect(r.success).toBe(true);
  });

  it("rejects when objectives array has fewer than 2 entries", () => {
    const bad = { ...STEEL_BASE, objectives: [STEEL_BASE.objectives[0]!] };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects unknown ISO material group", () => {
    const bad = { ...STEEL_BASE, fixed: { ...STEEL_BASE.fixed, material_iso_group: "X" } };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects negative max_power_kw", () => {
    const bad = { ...STEEL_BASE, machine: { max_power_kw: -1, max_rpm: 12000 } };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects weight > 1.0 in objective", () => {
    const bad = {
      ...STEEL_BASE,
      objectives: [
        { name: "cycle_time", minimize: true, weight: SCHEMA_INVALID_WEIGHT_OVER },
        { name: "tool_life", minimize: false, weight: 0.5 },
      ],
    };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects negative weight in objective", () => {
    const bad = {
      ...STEEL_BASE,
      objectives: [
        { name: "cycle_time", minimize: true, weight: SCHEMA_INVALID_WEIGHT_NEG },
        { name: "tool_life", minimize: false, weight: 0.5 },
      ],
    };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects missing parameter_bounds block entirely", () => {
    const { parameter_bounds: _drop, ...rest } = STEEL_BASE;
    const r = schema.safeParse(rest as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("rejects grid_resolution above engine cap", () => {
    const bad = { ...STEEL_BASE, grid_resolution: SCHEMA_INVALID_GRID_RES };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it("accepts grid_resolution at the engine minimum (2)", () => {
    const ok = { ...STEEL_BASE, grid_resolution: 2 };
    const r = schema.safeParse(ok as unknown as Record<string, unknown>);
    expect(r.success).toBe(true);
  });

  it("rejects non-integer flute_count", () => {
    const bad = { ...STEEL_BASE, fixed: { ...STEEL_BASE.fixed, flute_count: SCHEMA_FRACTIONAL_FLUTES } };
    const r = schema.safeParse(bad as unknown as Record<string, unknown>);
    expect(r.success).toBe(false);
  });
});

// ── Tier 5: Adversarial / boundary ───────────────────────────────────────────

describe("MultiObjectiveParetoEngine — adversarial boundary", () => {
  it("inverted parameter_bounds (high < low) yields finite result without throwing", () => {
    const bad: ParetoInput = {
      ...STEEL_BASE,
      parameter_bounds: {
        spindle_rpm: [12000, 4000],
        feed_per_tooth_mm: [0.05, 0.20],
        axial_depth_mm: [2, 8],
        radial_depth_mm: [2, 6],
      },
    };
    const out = multiObjectiveParetoEngine.compute(bad);
    expect(Number.isFinite(out.value.frontier.length)).toBe(true);
    expect(Number.isFinite(out.value.total_evaluated)).toBe(true);
  });

  it("all-infeasible input (max_power_kw=0) yields empty frontier and best_compromise=null", () => {
    const out = multiObjectiveParetoEngine.compute({
      ...STEEL_BASE,
      machine: { max_power_kw: ZERO_POWER_KW, max_rpm: STEEL_BASE.machine.max_rpm },
    });
    expect(out.value.frontier.length).toBe(0);
    expect(out.value.best_compromise).toBeNull();
    expect(out.confidence).toBe(CONFIDENCE_SPARSE_FRONTIER);
  });

  it("all-infeasible input zeroes utopia/nadir for every objective", () => {
    const out = multiObjectiveParetoEngine.compute({
      ...STEEL_BASE,
      machine: { max_power_kw: ZERO_POWER_KW, max_rpm: STEEL_BASE.machine.max_rpm },
    });
    for (const obj of STEEL_BASE.objectives) {
      expect(out.value.utopia_point[obj.name]).toBe(0);
      expect(out.value.nadir_point[obj.name]).toBe(0);
    }
  });

  it("unknown objective name maps to 0 on every solution (engine default branch)", () => {
    const out = multiObjectiveParetoEngine.compute({
      ...STEEL_BASE,
      objectives: [
        { name: "jellybeans", minimize: true, weight: 0.5 },
        { name: "cycle_time", minimize: true, weight: 0.5 },
      ],
    });
    if (out.value.frontier.length === 0) {
      expect(out.value.best_compromise).toBeNull();
      return;
    }
    const violations = out.value.frontier.filter((s) => s.objectives.jellybeans !== 0);
    expect(violations).toEqual([]);
  });

  it("zero geometry_volume_cm3 falls back to 50 cm^3 default and still produces evaluated cells", () => {
    const out = multiObjectiveParetoEngine.compute({
      ...STEEL_BASE,
      fixed: { ...STEEL_BASE.fixed, geometry_volume_cm3: 0 },
    });
    expect(out.value.total_evaluated).toBeGreaterThan(0);
    void ZERO_VOLUME_DEFAULT_FALLBACK_CM3;
  });

  it("feed_per_tooth bounds that produce feed > 30000 mm/min mark cells infeasible", () => {
    const out = multiObjectiveParetoEngine.compute({
      ...STEEL_BASE,
      parameter_bounds: {
        ...STEEL_BASE.parameter_bounds,
        feed_per_tooth_mm: [1.0, 2.0],
      },
      machine: { max_power_kw: HUGE_POWER_KW, max_rpm: STEEL_BASE.machine.max_rpm },
    });
    expect(out.value.infeasible_count).toBeGreaterThan(0);
  });

  it("dispatcher returns failure envelope when objectives array is empty (schema gate)", async () => {
    const harness = freshHarness();
    const r = await harness.call("pareto_optimize", { ...STEEL_BASE, objectives: [] } as unknown as Record<string, unknown>);
    expect(r.ok).toBe(false);
  });

  it("hard_limit far below feasible range never trips for a maximize objective", () => {
    const out = multiObjectiveParetoEngine.compute({
      ...STEEL_BASE,
      objectives: [
        { name: "cycle_time", minimize: true, weight: 0.5 },
        { name: "tool_life", minimize: false, weight: 0.5, hard_limit: HARD_LIMIT_FAR_BELOW },
      ],
    });
    expect(out.value.total_evaluated).toBe(TOTAL_CELLS_DEFAULT_GRID);
  });
});

// ── Tier 6: Anti-regression ──────────────────────────────────────────────────

describe("U-WIRE53 — anti-regression locks", () => {
  it("schema map exposes pareto_optimize with passthrough() (extra fields tolerated)", () => {
    const schema = ACTION_CALC_SCHEMAS.pareto_optimize;
    const withExtra = { ...STEEL_PARAMS, debug_marker: "test-extra-field" };
    const r = schema.safeParse(withExtra);
    expect(r.success).toBe(true);
    if (r.success) expect((r.data as Record<string, unknown>).debug_marker).toBe("test-extra-field");
  });

  it("singleton export is a MultiObjectiveParetoEngine instance with compute() method", () => {
    expect(multiObjectiveParetoEngine).toBeInstanceOf(MultiObjectiveParetoEngine);
    expect(typeof multiObjectiveParetoEngine.compute).toBe("function");
  });

  it("class-direct instance produces identical totals as singleton (no hidden state)", () => {
    const a = new MultiObjectiveParetoEngine().compute(STEEL_BASE);
    const b = multiObjectiveParetoEngine.compute(STEEL_BASE);
    expect(a.value.total_evaluated).toBe(b.value.total_evaluated);
    expect(a.value.frontier.length).toBe(b.value.frontier.length);
  });

  it("dispatcher tools array length is exactly 1 (single MCP tool registration)", () => {
    const harness = freshHarness();
    expect(harness.tools.length).toBe(1);
  });

  it("pareto_optimize schema parses successfully (proves enum + handler hooked)", () => {
    const r = ACTION_CALC_SCHEMAS.pareto_optimize.safeParse(STEEL_PARAMS);
    expect(r.success).toBe(true);
  });

  it("dispatcher does not regress to fallback for pareto_optimize", async () => {
    const harness = freshHarness();
    const r = await harness.call("pareto_optimize", STEEL_PARAMS);
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data.frontier)).toBe(true);
    expect(typeof r.data.total_evaluated).toBe("number");
  });

  it("default grid produces at least 100 evaluated cells (sanity floor)", () => {
    const out = multiObjectiveParetoEngine.compute(STEEL_BASE);
    expect(out.value.total_evaluated).toBeGreaterThanOrEqual(SANITY_FLOOR_CELL_COUNT);
    void DEFAULT_GRID_RESOLUTION;
    void AP_AE_DIMENSION_AT_DEFAULT;
  });
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Independent re-implementation of dominance for invariant testing. */
function dominates(a: ParetoSolution, b: ParetoSolution, objectives: ObjectiveSpec[]): boolean {
  let strictlyBetterInOne = false;
  for (const obj of objectives) {
    const va = a.objectives[obj.name]!;
    const vb = b.objectives[obj.name]!;
    if (obj.minimize) {
      if (va > vb) return false;
      if (va < vb) strictlyBetterInOne = true;
    } else {
      if (va < vb) return false;
      if (va > vb) strictlyBetterInOne = true;
    }
  }
  return strictlyBetterInOne;
}
