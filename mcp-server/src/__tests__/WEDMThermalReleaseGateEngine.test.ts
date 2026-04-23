/**
 * WEDMThermalReleaseGateEngine tests — MS-P2.5-SAFETY/U-P2.5-SAFE-05
 *
 * Exit criteria verified here:
 *   1. ASM Handbook Vol. 16 k(T) interpolation per material class (NOT Johnson-Cook)
 *   2. Per-pulse thermal release validated vs dielectric cooling capacity
 *   3. Recast-depth prediction included with finish-class tolerance
 *   4. 0.15 contribution into the composite S(x) gate
 *   5. PCD routes through ASM k(T) (diamond→graphite collapse), steel routes via steel_tool
 */

import { describe, it, expect } from "vitest";
import { wedmThermalReleaseGateEngine, type ThermalReleaseInput } from "../engines/WEDMThermalReleaseGateEngine.js";
import { wedmProgramSafetyGateEngine } from "../engines/WEDMProgramSafetyGateEngine.js";
import { WEDM_ASM_KT_TABLE, WEDM_RECAST_MODEL } from "../physics/wedm-constants.js";

// ──────────────────────────────────────────────────────────────────────────────
// Fixtures
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Build a baseline "well-behaved" input. Individual tests override fields to
 * drive the gate into each verdict branch.
 */
function baseInput(overrides: Partial<ThermalReleaseInput> = {}): ThermalReleaseInput {
  return {
    material: "steel_tool",
    finish_class: "medium",
    voltage_V: 80,
    peak_current_A: 6,
    pulse_on_us: 3,
    pulse_off_us: 25,
    flow_mm3_s: 80_000, // ~80 mL/s effective through kerf
    mode: "submerged",
    skim_passes: 2,
    absorption_fraction: 0.12,
    peak_temp_K: 1200,
    ...overrides,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// 1. k(T) interpolation — ASM Vol. 16
// ──────────────────────────────────────────────────────────────────────────────

describe("WEDMThermalReleaseGateEngine — ASM k(T) interpolation", () => {
  it("matches every table endpoint for all 9 material classes", () => {
    for (const [material, table] of Object.entries(WEDM_ASM_KT_TABLE)) {
      const first = table[0];
      const last = table[table.length - 1];

      expect(
        wedmThermalReleaseGateEngine.interpolateKT(material as any, first[0]),
      ).toBeCloseTo(first[1], 6);

      expect(
        wedmThermalReleaseGateEngine.interpolateKT(material as any, last[0]),
      ).toBeCloseTo(last[1], 6);
    }
  });

  it("clamps below the minimum-T endpoint instead of extrapolating", () => {
    const kLow = wedmThermalReleaseGateEngine.interpolateKT("steel_tool", 100);
    expect(kLow).toBeCloseTo(WEDM_ASM_KT_TABLE.steel_tool[0][1], 6);
  });

  it("clamps above the maximum-T endpoint instead of extrapolating", () => {
    const top = WEDM_ASM_KT_TABLE.pcd[WEDM_ASM_KT_TABLE.pcd.length - 1];
    const kHigh = wedmThermalReleaseGateEngine.interpolateKT("pcd", 3000);
    expect(kHigh).toBeCloseTo(top[1], 6);
  });

  it("linearly interpolates between adjacent knots (steel_tool)", () => {
    // knots: [400, 26] → [600, 27]
    const kMid = wedmThermalReleaseGateEngine.interpolateKT("steel_tool", 500);
    expect(kMid).toBeCloseTo(26.5, 6);
  });

  it("captures the PCD diamond→graphite collapse above ~900 K", () => {
    // Table: 900K→180, 1100K→35. At 1000K we should linearly interpolate to ~107.5.
    const kBelow = wedmThermalReleaseGateEngine.interpolateKT("pcd", 900);
    const kCollapse = wedmThermalReleaseGateEngine.interpolateKT("pcd", 1000);
    const kAbove = wedmThermalReleaseGateEngine.interpolateKT("pcd", 1100);

    expect(kBelow).toBeCloseTo(180, 6);
    expect(kCollapse).toBeCloseTo((180 + 35) / 2, 3);
    expect(kAbove).toBeCloseTo(35, 6);
    // Steepness test: collapse rate must be negative and steep.
    expect(kCollapse - kBelow).toBeLessThan(-50);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 2. Material resolver — common synonyms
// ──────────────────────────────────────────────────────────────────────────────

describe("WEDMThermalReleaseGateEngine — material resolver", () => {
  const cases: Array<[string, string]> = [
    ["pcd", "pcd"],
    ["PCD", "pcd"],
    ["polycrystalline diamond", "pcd"],
    ["diamond", "pcd"],
    ["tungsten_carbide", "tungsten_carbide"],
    ["WC", "tungsten_carbide"],
    ["carbide", "tungsten_carbide"],
    ["D2", "steel_tool"],
    ["H13", "steel_tool"],
    ["tool steel", "steel_tool"],
    ["Inconel 718", "inconel"],
    ["IN718", "inconel"],
    ["Ti-6Al-4V", "titanium"],
    ["titanium", "titanium"],
    ["304 stainless", "stainless_steel"],
    ["17-4PH", "stainless_steel"],
    ["6061", "aluminum"],
    ["aluminium", "aluminum"],
    ["C110", "copper"],
    ["1045 steel", "steel_carbon"],
  ];

  for (const [name, expected] of cases) {
    it(`resolves "${name}" → ${expected}`, () => {
      expect(wedmThermalReleaseGateEngine.resolveMaterial(name)).toBe(expected);
    });
  }

  it("returns null for unknown materials (no silent steel fallback)", () => {
    expect(wedmThermalReleaseGateEngine.resolveMaterial("unobtainium")).toBeNull();
    expect(wedmThermalReleaseGateEngine.resolveMaterial("")).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 3. Verdict branches — pass, heat overload, recast excessive, combined, unknown
// ──────────────────────────────────────────────────────────────────────────────

describe("WEDMThermalReleaseGateEngine — verdicts", () => {
  it("passes for a well-behaved D2 tool-steel medium-finish program", () => {
    const r = wedmThermalReleaseGateEngine.evaluate(baseInput());
    expect(r.pass).toBe(true);
    expect(r.verdict).toBe("pass");
    expect(r.hard_block).toBe(false);
    expect(r.safety_score_contribution).toBeCloseTo(0.15, 6);
  });

  it("blocks with fail_heat_overload when current & duty saturate cooling", () => {
    const r = wedmThermalReleaseGateEngine.evaluate(
      baseInput({
        peak_current_A: 120, // very high
        pulse_on_us: 30,
        pulse_off_us: 5, // high duty
        flow_mm3_s: 500, // starved flow
        mode: "side_flush",
        absorption_fraction: 0.30,
      }),
    );
    expect(r.pass).toBe(false);
    expect(r.hard_block).toBe(true);
    expect(["fail_heat_overload", "fail_both"]).toContain(r.verdict);
    expect(r.metrics.mean_power_W).toBeGreaterThan(r.metrics.cooling_capacity_W);
    expect(r.safety_score_contribution).toBe(0);
  });

  it("blocks with fail_recast_excessive when pulse_on is long for precision finish", () => {
    const r = wedmThermalReleaseGateEngine.evaluate(
      baseInput({
        finish_class: "precision",
        pulse_on_us: 200, // far too long for precision class
        pulse_off_us: 500, // low duty ⇒ cooling easily handled
        skim_passes: 0,
        peak_current_A: 3,
        flow_mm3_s: 200_000,
      }),
    );
    expect(r.pass).toBe(false);
    expect(r.verdict).toBe("fail_recast_excessive");
    expect(r.metrics.recast_depth_um).toBeGreaterThan(r.metrics.recast_limit_um);
    // heat side should still be well below cooling
    expect(r.metrics.mean_power_W).toBeLessThan(r.metrics.cooling_capacity_W);
  });

  it("blocks with fail_both when heat AND recast both exceed limits", () => {
    const r = wedmThermalReleaseGateEngine.evaluate(
      baseInput({
        finish_class: "precision",
        peak_current_A: 120,
        pulse_on_us: 200,
        pulse_off_us: 5,
        flow_mm3_s: 500,
        mode: "side_flush",
        skim_passes: 0,
        absorption_fraction: 0.35,
      }),
    );
    expect(r.pass).toBe(false);
    expect(r.verdict).toBe("fail_both");
    expect(r.metrics.mean_power_W).toBeGreaterThan(r.metrics.cooling_capacity_W);
    expect(r.metrics.recast_depth_um).toBeGreaterThan(r.metrics.recast_limit_um);
  });

  it("fails closed on unknown material instead of defaulting to steel", () => {
    const r = wedmThermalReleaseGateEngine.evaluate(
      baseInput({ material: "unobtainium" }),
    );
    expect(r.pass).toBe(false);
    expect(r.verdict).toBe("fail_unknown_material");
    expect(r.hard_block).toBe(true);
    expect(r.safety_score_contribution).toBe(0);
    expect(r.warnings.some((w) => w.includes("unobtainium"))).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 4. Material differentiation — PCD vs steel routes through correct tables
// ──────────────────────────────────────────────────────────────────────────────

describe("WEDMThermalReleaseGateEngine — material routing", () => {
  it("PCD uses the ASM pcd table and produces a lower k(T) than steel_tool above 900 K", () => {
    // k(T) for PCD at 1200 K lies between 35 (1100K) and 15 (1300K) → ~25
    const kPcd = wedmThermalReleaseGateEngine.interpolateKT("pcd", 1200);
    const kSteel = wedmThermalReleaseGateEngine.interpolateKT("steel_tool", 1200);
    expect(kPcd).toBeLessThan(kSteel);
    // Sanity: PCD sub-40 W/mK at 1200 K after collapse
    expect(kPcd).toBeLessThan(40);
  });

  it("PCD recast coupling (η=0.06) is much lower than steel_tool (η=0.25)", () => {
    expect(WEDM_RECAST_MODEL.eta_coupling.pcd).toBeLessThan(
      WEDM_RECAST_MODEL.eta_coupling.steel_tool,
    );
    // Use a longer pulse_on with no skim so neither clamps to min_residual;
    // PCD thermal "gentleness" shows up as smaller recast for the same program.
    const pcd = wedmThermalReleaseGateEngine.evaluate(
      baseInput({ material: "pcd", pulse_on_us: 50, skim_passes: 0 }),
    );
    const steel = wedmThermalReleaseGateEngine.evaluate(
      baseInput({ material: "steel_tool", pulse_on_us: 50, skim_passes: 0 }),
    );
    expect(pcd.metrics.recast_depth_um).toBeLessThan(steel.metrics.recast_depth_um);
  });

  it("each resolved material is reported back in the result and uses correct table", () => {
    for (const m of ["pcd", "steel_tool", "inconel", "titanium", "tungsten_carbide", "aluminum", "copper"] as const) {
      const r = wedmThermalReleaseGateEngine.evaluate(baseInput({ material: m }));
      expect(r.material).toBe(m);
      // k(T) value must match table lookup at 1200K
      const expectedK = wedmThermalReleaseGateEngine.interpolateKT(m, 1200);
      expect(r.metrics.k_T_W_per_mK).toBeCloseTo(expectedK, 6);
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 5. Finish class × cooling — 3 × 2 matrix
// ──────────────────────────────────────────────────────────────────────────────

describe("WEDMThermalReleaseGateEngine — finish-class × cooling matrix", () => {
  const classes: Array<ThermalReleaseInput["finish_class"]> = ["rough", "medium", "finish"];
  const modes: Array<ThermalReleaseInput["mode"]> = ["submerged", "side_flush"];

  for (const fc of classes) {
    for (const mode of modes) {
      it(`${fc} finish × ${mode} flush — tuned parameters must pass`, () => {
        // Tune each finish class to its recast budget (aggressive→gentle)
        const pulseOn = fc === "rough" ? 10 : fc === "medium" ? 3 : 1;
        const skim = fc === "rough" ? 0 : fc === "medium" ? 2 : 4;
        const current = fc === "rough" ? 12 : fc === "medium" ? 6 : 3;
        const flow = mode === "submerged" ? 80_000 : 200_000;

        const r = wedmThermalReleaseGateEngine.evaluate(
          baseInput({
            finish_class: fc,
            pulse_on_us: pulseOn,
            pulse_off_us: 30,
            peak_current_A: current,
            skim_passes: skim,
            flow_mm3_s: flow,
            mode,
          }),
        );

        if (!r.pass) {
          throw new Error(
            `Expected ${fc} × ${mode} to pass but got ${r.verdict}: ` +
              `P̄=${r.metrics.mean_power_W.toFixed(0)}W/${r.metrics.cooling_capacity_W.toFixed(0)}W, ` +
              `d=${r.metrics.recast_depth_um.toFixed(2)}µm/${r.metrics.recast_limit_um}µm`,
          );
        }
        expect(r.verdict).toBe("pass");
      });
    }
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// 6. Composite S(x) integration — 0.15 contribution
// ──────────────────────────────────────────────────────────────────────────────

describe("WEDMThermalReleaseGateEngine — S(x) composition", () => {
  it("feeds shape into WEDMProgramSafetyGateEngine.thermal without reshaping", () => {
    const r = wedmThermalReleaseGateEngine.evaluate(baseInput());
    const composite = wedmProgramSafetyGateEngine.evaluate({
      collision: { pass: true, min_distance_mm: 10, safe_distance_mm: 5 },
      head_clearance: {
        pass: true,
        upper_clearance_mm: 5,
        lower_clearance_mm: 4,
        min_required_mm: 3,
      },
      flushing: {
        pass: true,
        velocity_m_s: 1.0,
        required_velocity_m_s: 0.8,
        mode: "submerged",
      },
      thermal: r.safety_gate_input,
      dialect: { pass: true, expected_controller: "mitsubishi_fa" },
      unit_tag: {
        pass: true,
        declared_unit: "metric",
        code_unit: "G21",
        coordinate_scale_consistent: true,
      },
      deflection: { pass: true, max_deflection_mm: 0.01, tolerance_mm: 0.05, deflection_ratio: 0.2 },
    });
    expect(composite.pass).toBe(true);
    expect(composite.s_of_x).toBeGreaterThanOrEqual(0.7);
    const thermalComp = composite.components.find((c) => c.component === "thermal");
    expect(thermalComp?.pass).toBe(true);
    expect(thermalComp?.weight).toBeCloseTo(0.15, 6);
    expect(thermalComp?.weighted_score).toBeCloseTo(0.15, 6); // full contribution on pass
  });

  it("a thermal hard-block (fail_both) drops S(x) by 0.15 in the composite gate", () => {
    const good = wedmThermalReleaseGateEngine.evaluate(baseInput());
    // fail_both so the composite gate's partial-credit path (0.5·w for one-side
    // failure) does not kick in and we observe the full 0.15 drop.
    const bad = wedmThermalReleaseGateEngine.evaluate(
      baseInput({
        finish_class: "precision",
        peak_current_A: 120,
        pulse_on_us: 200,
        pulse_off_us: 5,
        flow_mm3_s: 500,
        mode: "side_flush",
        skim_passes: 0,
        absorption_fraction: 0.35,
      }),
    );
    expect(bad.verdict).toBe("fail_both");
    expect(good.safety_score_contribution).toBeCloseTo(0.15, 6);
    expect(bad.safety_score_contribution).toBe(0);

    const common = {
      collision: { pass: true, min_distance_mm: 10, safe_distance_mm: 5 },
      head_clearance: {
        pass: true,
        upper_clearance_mm: 5,
        lower_clearance_mm: 4,
        min_required_mm: 3,
      },
      flushing: {
        pass: true,
        velocity_m_s: 1.0,
        required_velocity_m_s: 0.8,
        mode: "submerged" as const,
      },
      dialect: { pass: true, expected_controller: "mitsubishi_fa" },
      unit_tag: {
        pass: true,
        declared_unit: "metric" as const,
        code_unit: "G21" as const,
        coordinate_scale_consistent: true,
      },
      deflection: { pass: true, max_deflection_mm: 0.01, tolerance_mm: 0.05, deflection_ratio: 0.2 },
    };

    const withGood = wedmProgramSafetyGateEngine.evaluate({ ...common, thermal: good.safety_gate_input });
    const withBad = wedmProgramSafetyGateEngine.evaluate({ ...common, thermal: bad.safety_gate_input });

    expect(withGood.s_of_x - withBad.s_of_x).toBeCloseTo(0.15, 2);
    const failComp = withBad.components.find((c) => c.component === "thermal");
    expect(failComp?.pass).toBe(false);
    expect(failComp?.weighted_score).toBe(0); // fail_both gives 0 weighted score
    expect(withBad.failure_reasons.some((r) => r.toLowerCase().includes("thermal"))).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 7. Skim-pass reduction
// ──────────────────────────────────────────────────────────────────────────────

describe("WEDMThermalReleaseGateEngine — skim-pass reduction", () => {
  it("adding skim passes monotonically reduces recast depth", () => {
    const depths = [0, 1, 2, 3, 4].map(
      (skim) =>
        wedmThermalReleaseGateEngine.evaluate(
          baseInput({ pulse_on_us: 5, skim_passes: skim }),
        ).metrics.recast_depth_um,
    );
    for (let i = 1; i < depths.length; i++) {
      expect(depths[i]).toBeLessThanOrEqual(depths[i - 1]);
    }
  });

  it("never drops recast below the geometric min residual (0.5 µm)", () => {
    const r = wedmThermalReleaseGateEngine.evaluate(
      baseInput({ skim_passes: 99, pulse_on_us: 1 }),
    );
    expect(r.metrics.recast_depth_um).toBeGreaterThanOrEqual(
      WEDM_RECAST_MODEL.min_residual_um,
    );
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 8. Gate wrapper
// ──────────────────────────────────────────────────────────────────────────────

describe("WEDMThermalReleaseGateEngine — gate() wrapper", () => {
  it("returns allow=true with reason summary for passing input", () => {
    const g = wedmThermalReleaseGateEngine.gate(baseInput());
    expect(g.allow).toBe(true);
    expect(g.reason).toContain("THERMAL OK");
    expect(g.result.pass).toBe(true);
  });

  it("returns allow=false with diagnostic reason for blocking input", () => {
    const g = wedmThermalReleaseGateEngine.gate(
      baseInput({ material: "mystery-alloy" }),
    );
    expect(g.allow).toBe(false);
    expect(g.reason).toContain("THERMAL BLOCK");
    expect(g.result.verdict).toBe("fail_unknown_material");
  });
});
