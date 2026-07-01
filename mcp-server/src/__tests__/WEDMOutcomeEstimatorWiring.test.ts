/**
 * Wiring test for U-WIRE-WEDM-OUTCOME-3 — three previously-orphaned WEDM
 * outcome-estimator engines wired into the `prism_edm` dispatcher:
 *   • wedm_wire_spool_consumption → WEDMWireSpoolConsumptionEngine.calculate
 *   • wedm_taper_error_budget     → WEDMTaperErrorBudgetEngine.calculate
 *   • wedm_slug_tab_retention     → WEDMSlugTabRetentionEngine.calculate
 *
 * The dispatcher path is: raw params → validateActionParams(schema) → early
 * return on failure → engine.calculate(rawParams). This file exercises the two
 * composable halves of that path WITHOUT booting a live MCP server:
 *   1. the EDM_ACTION_SCHEMAS entry accepts realistic input and rejects bad
 *      input (the schema the validateActionParams gate runs);
 *   2. the engine consumes the SAME raw params object the dispatcher forwards
 *      (the dispatcher passes raw params, not the Zod-parsed output) and
 *      produces the hand-computed result.
 * It does NOT invoke validateActionParams itself — that glue is a thin Zod
 * .safeParse wrapper over the very schema asserted in half 1.
 *
 * Every expected literal below is hand-derived from the engine formulas and
 * the canonical WEDM constants (wedm-constants.ts) and cross-checked against a
 * live engine run, so each assertion fails on a real wiring or formula
 * regression — not a tautology.
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { wedmWireSpoolConsumptionEngine } from "../engines/WEDMWireSpoolConsumptionEngine.js";
import { wedmTaperErrorBudgetEngine } from "../engines/WEDMTaperErrorBudgetEngine.js";
import { wedmSlugTabRetentionEngine } from "../engines/WEDMSlugTabRetentionEngine.js";

const NEW_ACTIONS = [
  "wedm_wire_spool_consumption",
  "wedm_taper_error_budget",
  "wedm_slug_tab_retention",
] as const;

describe("U-WIRE-WEDM-OUTCOME-3 — dispatcher wiring registration", () => {
  it("registers all 3 actions in edmDispatcher — exactly one case body AND a distinct enum entry", async () => {
    const src = await fsp.readFile(
      path.resolve(__dirname, "..", "tools", "dispatchers", "edmDispatcher.ts"),
      "utf8",
    );
    for (const a of NEW_ACTIONS) {
      // A real `case "<action>":` body must exist — exactly one.
      const caseBodies = src.split(`case "${a}":`).length - 1;
      expect(caseBodies).toBe(1);
      // …and the action must also appear as a quoted string OUTSIDE that case
      // label (the ACTIONS z.enum entry). Counting total quoted occurrences and
      // subtracting the case label proves the enum entry is present too.
      const totalQuoted = src.split(`"${a}"`).length - 1;
      expect(totalQuoted - caseBodies).toBeGreaterThanOrEqual(1);
    }
  });

  it("registers all 3 schemas in EDM_ACTION_SCHEMAS with a working safeParse", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    const present = NEW_ACTIONS.filter(
      (a) => typeof EDM_ACTION_SCHEMAS[a]?.safeParse === "function",
    );
    expect(present).toEqual([...NEW_ACTIONS]);
  });
});

describe("wedm_wire_spool_consumption — schema ↔ engine round-trip", () => {
  it("no-change job: 5000 m of a fresh 15000 m spool → 0 changes, $0 downtime", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    const input = { total_wire_m: 5000, spool_capacity_m: 15000 };
    // Schema half of the contract.
    expect(EDM_ACTION_SCHEMAS["wedm_wire_spool_consumption"]!.safeParse(input).success).toBe(true);
    // Engine half — the SAME object the schema accepted.
    const r = wedmWireSpoolConsumptionEngine.calculate(input);
    // usableFromCurrent = 15000 − 500 buffer = 14500 ≥ 5000 → no change.
    expect(r.spool_changes_required).toBe(0);
    expect(r.change_points_m).toEqual([]);
    expect(r.spools_required).toBe(1);
    expect(r.wire_remaining_after_job_m).toBe(10000); // 15000 − 5000
    expect(r.total_change_time_min).toBe(0);
    expect(r.total_change_cost_usd).toBe(0);
    expect(r.mid_job_change_risk).toBe("none");
  });

  it("single-change job: 20000 m over a 15000 m spool with auto-threader", () => {
    const r = wedmWireSpoolConsumptionEngine.calculate({
      total_wire_m: 20000,
      spool_capacity_m: 15000,
      auto_threader_available: true,
    });
    // First change at 14500 m (capacity − 500 buffer); remaining job 5500 m
    // fits the next spool's 14500 m usable → exactly 1 change.
    expect(r.spool_changes_required).toBe(1);
    expect(r.change_points_m).toEqual([14500]);
    expect(r.spools_required).toBe(2); // 1 + ceil(5000 shortfall / 15000)
    expect(r.wire_remaining_after_job_m).toBe(9500); // 15000 − 5500
    expect(r.per_change_time_min).toBe(0.5); // auto-threader timing
    expect(r.total_change_time_min).toBe(0.5);
    expect(r.total_change_cost_usd).toBe(0.708); // (0.5/60) × $85/hr
    expect(r.mid_job_change_risk).toBe("single_change");
  });

  it("multi-change job: 40000 m over a 15000 m spool → 2 changes (exercises the accumulator loop)", () => {
    const r = wedmWireSpoolConsumptionEngine.calculate({
      total_wire_m: 40000,
      spool_capacity_m: 15000,
    });
    // 14500 usable from current + 14500 from the next spool = 29000; the
    // remaining 11000 m fits the 3rd spool → exactly 2 mid-job changes.
    expect(r.spool_changes_required).toBe(2);
    expect(r.change_points_m).toEqual([14500, 29000]);
    expect(r.spools_required).toBe(3); // 1 + ceil(25000 shortfall / 15000)
    expect(r.wire_remaining_after_job_m).toBe(4000); // 15000 − 11000
    expect(r.total_change_time_min).toBe(10); // 2 changes × 5 min manual
    expect(r.total_change_cost_usd).toBe(14.167); // (10/60) × $85/hr
    expect(r.mid_job_change_risk).toBe("multiple_changes"); // 2 < high-exposure 3
  });

  it("schema rejects a non-positive total_wire_m", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    const r = EDM_ACTION_SCHEMAS["wedm_wire_spool_consumption"]!.safeParse({
      total_wire_m: 0,
      spool_capacity_m: 15000,
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects a non-positive spool_capacity_m", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    const r = EDM_ACTION_SCHEMAS["wedm_wire_spool_consumption"]!.safeParse({
      total_wire_m: 100,
      spool_capacity_m: 0,
    });
    expect(r.success).toBe(false);
  });

  it("engine throws on the cross-field violation the schema cannot catch (wire_remaining > capacity)", () => {
    expect(() =>
      wedmWireSpoolConsumptionEngine.calculate({
        total_wire_m: 100,
        spool_capacity_m: 1000,
        wire_remaining_m: 2000,
      }),
    ).toThrow(/wire_remaining_m/);
  });
});

describe("wedm_taper_error_budget — schema ↔ engine round-trip", () => {
  it("zero taper on a 25 mm part → IT6, 0 mm UV travel", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    const input = { taper_angle_deg: 0, part_height_mm: 25 };
    expect(EDM_ACTION_SCHEMAS["wedm_taper_error_budget"]!.safeParse(input).success).toBe(true);
    const r = wedmTaperErrorBudgetEngine.calculate(input);
    expect(r.uv_travel_mm).toBe(0); // 25 × tan(0)
    // guide = √((3/2)² + (3/2)²) = 2.1213; uv = 0.1 × max(1,0) = 0.1;
    // bow = 0.8 × 0 = 0; cal = 0.5 (auto). total = √(4.5+0.01+0+0.25) = 2.18 → 2.2
    expect(r.total_error_um).toBe(2.2);
    expect(r.achievable_tolerance_class).toBe("IT6"); // 2.2 ≤ IT6 band (8 µm)
    expect(r.max_practical_taper_deg).toBe(30); // standard guides
    expect(r.exceeds_guide_limit).toBe(false);
    expect(r.error_sources.map((s) => s.contribution_um)).toEqual([2.1, 0.1, 0, 0.5]);
  });

  it("35° taper on standard guides exceeds the 30° guide limit", () => {
    const r = wedmTaperErrorBudgetEngine.calculate({
      taper_angle_deg: 35,
      part_height_mm: 20,
      guide_style: "standard",
    });
    expect(r.exceeds_guide_limit).toBe(true);
    expect(r.uv_travel_mm).toBeCloseTo(14.004, 2); // 20 × tan(35°)
    expect(r.warnings.some((w) => w.includes("exceeds guide geometry limit"))).toBe(true);
  });

  it("extended (H-head) guides raise the limit to 45° — the same 35° taper is within spec", () => {
    const r = wedmTaperErrorBudgetEngine.calculate({
      taper_angle_deg: 35,
      part_height_mm: 20,
      guide_style: "extended",
    });
    expect(r.max_practical_taper_deg).toBe(45); // extended vs standard 30
    expect(r.exceeds_guide_limit).toBe(false); // 35 ≤ 45
  });

  it("schema rejects a taper angle at the ±90° singularity", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    expect(
      EDM_ACTION_SCHEMAS["wedm_taper_error_budget"]!.safeParse({
        taper_angle_deg: 90,
        part_height_mm: 25,
      }).success,
    ).toBe(false);
  });

  it("schema rejects a non-positive part_height_mm", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    expect(
      EDM_ACTION_SCHEMAS["wedm_taper_error_budget"]!.safeParse({
        taper_angle_deg: 5,
        part_height_mm: 0,
      }).success,
    ).toBe(false);
  });
});

describe("wedm_slug_tab_retention — schema ↔ engine round-trip", () => {
  it("4 tabs on a light steel slug → ample safety factor (safe)", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    const input = {
      slug_area_mm2: 200,
      part_thickness_mm: 20,
      material_density_kg_m3: 7850,
      sigma_y_MPa: 600,
      tab_count: 4,
      tab_width_mm: 2,
    };
    expect(EDM_ACTION_SCHEMAS["wedm_slug_tab_retention"]!.safeParse(input).success).toBe(true);
    const r = wedmSlugTabRetentionEngine.calculate(input);
    // slug = 7850 kg/m³ × 200e-6 m² × 0.02 m = 0.0314 kg
    expect(r.slug_weight_kg).toBe(0.0314);
    // tab cross-section = 4 tabs × 2 mm × 20 mm depth = 160 mm²
    expect(r.tab_cross_section_mm2).toBe(160);
    // Von Mises shear = 600 / √3 = 346.41 → 346.4 MPa
    expect(r.shear_strength_MPa).toBe(346.4);
    expect(r.dynamic_factor).toBe(3); // WEDM default
    expect(r.risk_level).toBe("safe");
    expect(r.safe_for_uncontrolled_drop).toBe(true);
    // SF = retention / (slug-weight-force × k_dyn)
    //    = 55425.626 N / (0.308034 N × 3) = 59977.82 (round2).
    expect(r.safety_factor).toBe(59977.82);
  });

  it("dynamic_factor override flows through and raises the demand force", () => {
    const r = wedmSlugTabRetentionEngine.calculate({
      slug_area_mm2: 200,
      part_thickness_mm: 20,
      material_density_kg_m3: 7850,
      sigma_y_MPa: 600,
      tab_count: 4,
      tab_width_mm: 2,
      dynamic_factor: 5, // override the WEDM default of 3
    });
    expect(r.dynamic_factor).toBe(5);
    expect(r.demand_force_N).toBe(1.54); // 0.308034 N slug weight × 5
    // Higher k_dyn → proportionally lower SF than the default-3 case (59977.82).
    expect(r.safety_factor).toBe(35986.69);
  });

  it("zero tabs → zero retention force → unsafe", () => {
    const r = wedmSlugTabRetentionEngine.calculate({
      slug_area_mm2: 5000,
      part_thickness_mm: 30,
      material_density_kg_m3: 7850,
      sigma_y_MPa: 400,
      tab_count: 0,
      tab_width_mm: 0,
    });
    expect(r.tab_cross_section_mm2).toBe(0);
    expect(r.retention_force_N).toBe(0);
    expect(r.safety_factor).toBe(0); // 0 retention / positive demand
    expect(r.risk_level).toBe("unsafe");
    expect(r.safe_for_uncontrolled_drop).toBe(false);
  });

  it("schema rejects a non-integer tab_count", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    expect(
      EDM_ACTION_SCHEMAS["wedm_slug_tab_retention"]!.safeParse({
        slug_area_mm2: 200,
        part_thickness_mm: 20,
        material_density_kg_m3: 7850,
        sigma_y_MPa: 600,
        tab_count: 2.5,
        tab_width_mm: 2,
      }).success,
    ).toBe(false);
  });

  it("schema rejects a non-positive slug_area_mm2", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    expect(
      EDM_ACTION_SCHEMAS["wedm_slug_tab_retention"]!.safeParse({
        slug_area_mm2: -1,
        part_thickness_mm: 20,
        material_density_kg_m3: 7850,
        sigma_y_MPa: 600,
        tab_count: 4,
        tab_width_mm: 2,
      }).success,
    ).toBe(false);
  });
});

describe("U-WIRE-WEDM-OUTCOME-3 — determinism", () => {
  it("each wired engine is deterministic — identical input yields identical output", () => {
    const spoolIn = { total_wire_m: 9000, spool_capacity_m: 15000 };
    expect(wedmWireSpoolConsumptionEngine.calculate(spoolIn)).toEqual(
      wedmWireSpoolConsumptionEngine.calculate(spoolIn),
    );
    const taperIn = { taper_angle_deg: 12, part_height_mm: 40 };
    expect(wedmTaperErrorBudgetEngine.calculate(taperIn)).toEqual(
      wedmTaperErrorBudgetEngine.calculate(taperIn),
    );
    const slugIn = {
      slug_area_mm2: 300,
      part_thickness_mm: 15,
      material_density_kg_m3: 7850,
      sigma_y_MPa: 500,
      tab_count: 3,
      tab_width_mm: 1.5,
    };
    expect(wedmSlugTabRetentionEngine.calculate(slugIn)).toEqual(
      wedmSlugTabRetentionEngine.calculate(slugIn),
    );
  });
});
