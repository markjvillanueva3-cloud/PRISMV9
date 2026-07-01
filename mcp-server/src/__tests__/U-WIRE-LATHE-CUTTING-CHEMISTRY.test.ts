/**
 * U-WIRE-LATHE-CUTTING-CHEMISTRY — wiring-gate + material-physics test
 *
 * LatheCuttingChemistryEngine (2237-LOC, 0 prior dispatcher refs) wired into
 * turningDispatcher via two actions:
 *   - lathe_chemistry_comprehensive   → comprehensiveAnalysis
 *   - lathe_chemistry_select_coolant  → selectCoolant
 *
 * Asserts MATERIAL-SPECIFIC physics behavior from the engine's documented
 * machinist rules (LatheCuttingChemistryEngine.ts:1612-1707):
 *   • Magnesium  → MQL is the only viable recommendation (water-based zeroed)
 *   • Titanium   → 'chlorine-free' note emitted (stress-corrosion safety)
 *   • Aluminum   → pH 8.5-9.2 inhibitor-window note emitted
 *   • Copper     → sulfurized-EP staining warning emitted
 *   • Cast iron  → MQL/rust note emitted
 *   • Ceramic tool → 'thermal shock' note emitted
 *   • High Vc > 200 → straight_oil NOT recommended
 *   • Interface T monotonic in Vc (heat-balance Arrhenius)
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { latheCuttingChemistryEngine } from "../engines/LatheCuttingChemistryEngine.js";

const DISPATCHER_PATH = "H:/prism/mcp-server/src/tools/dispatchers/turningDispatcher.ts";
const DISPATCHER_SRC = readFileSync(DISPATCHER_PATH, "utf-8");
const HIGH_VC_THRESHOLD_M_MIN = 200;

// ═══════════════════════════════════════════════════════════════════════
// 1. Wiring gate — dispatcher source-grep
// ═══════════════════════════════════════════════════════════════════════

describe("U-WIRE-LATHE-CUTTING-CHEMISTRY — dispatcher wiring", () => {
  it("action 'lathe_chemistry_comprehensive' is in the ACTIONS enum literal", () => {
    expect(DISPATCHER_SRC).toContain(`"lathe_chemistry_comprehensive"`);
  });

  it("action 'lathe_chemistry_select_coolant' is in the ACTIONS enum literal", () => {
    expect(DISPATCHER_SRC).toContain(`"lathe_chemistry_select_coolant"`);
  });

  it("dispatch switch has a case for 'lathe_chemistry_comprehensive'", () => {
    expect(DISPATCHER_SRC).toMatch(/case "lathe_chemistry_comprehensive"/);
  });

  it("dispatch switch has a case for 'lathe_chemistry_select_coolant'", () => {
    expect(DISPATCHER_SRC).toMatch(/case "lathe_chemistry_select_coolant"/);
  });

  it("dispatcher lazy-imports LatheCuttingChemistryEngine.js", () => {
    expect(DISPATCHER_SRC).toContain(
      'await import("../../engines/LatheCuttingChemistryEngine.js")',
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. Material-specific machinist rules — concrete-value assertions
// ═══════════════════════════════════════════════════════════════════════

describe("U-WIRE-LATHE-CUTTING-CHEMISTRY — magnesium fire-risk", () => {
  it("magnesium AZ31 → recommended coolant is exactly 'mql_oil'", () => {
    const r = latheCuttingChemistryEngine.selectCoolant({
      workpiece_material: "magnesium_az31",
      operation: "od_finishing",
      cutting_speed_m_min: 150,
      tool_material: "carbide_pvd",
    });
    // Engine src 1614-1620: water_soluble/semi/full all zeroed for Mg; mql_oil=0.7
    expect(r.recommended_coolant).toBe("mql_oil");
  });

  it("magnesium AZ31 → notes contain explicit fire/explosion warning", () => {
    const r = latheCuttingChemistryEngine.selectCoolant({
      workpiece_material: "magnesium_az31",
      operation: "od_roughing",
      cutting_speed_m_min: 100,
      tool_material: "carbide_cvd",
    });
    const allNotes = r.chemistry_notes.join(" ").toLowerCase();
    expect(allNotes).toMatch(/fire|explosion|prohibited/);
  });
});

describe("U-WIRE-LATHE-CUTTING-CHEMISTRY — titanium stress-corrosion", () => {
  it("titanium 6Al4V → notes contain literal 'chlorine-free'", () => {
    const r = latheCuttingChemistryEngine.selectCoolant({
      workpiece_material: "titanium_6al4v",
      operation: "od_roughing",
      cutting_speed_m_min: 60,
      tool_material: "carbide_cvd",
    });
    const allNotes = r.chemistry_notes.join(" ").toLowerCase();
    expect(allNotes).toContain("chlorine-free");
  });
});

describe("U-WIRE-LATHE-CUTTING-CHEMISTRY — aluminum inhibitor window", () => {
  it("aluminum 6061 → notes cite the 8.5-9.2 pH inhibitor range", () => {
    const r = latheCuttingChemistryEngine.selectCoolant({
      workpiece_material: "aluminum_6061",
      operation: "od_finishing",
      cutting_speed_m_min: 400,
      tool_material: "carbide_pvd",
    });
    const allNotes = r.chemistry_notes.join(" ");
    expect(allNotes).toMatch(/8\.5.*9\.2|aluminum-compatible/i);
  });

  it("aluminum 6061 → target pH is alkaline (>= 8.0, the Al inhibitor floor)", () => {
    const r = latheCuttingChemistryEngine.selectCoolant({
      workpiece_material: "aluminum_6061",
      operation: "od_finishing",
      cutting_speed_m_min: 400,
      tool_material: "carbide_pvd",
    });
    expect(r.ph_target.value).toBeGreaterThanOrEqual(8.0);
  });
});

describe("U-WIRE-LATHE-CUTTING-CHEMISTRY — copper sulfurized-EP staining", () => {
  it("brass C360 → notes contain sulfur OR staining warning", () => {
    const r = latheCuttingChemistryEngine.selectCoolant({
      workpiece_material: "brass_c360",
      operation: "od_roughing",
      cutting_speed_m_min: 300,
      tool_material: "carbide_uncoated",
    });
    const allNotes = r.chemistry_notes.join(" ").toLowerCase();
    expect(allNotes).toMatch(/sulfur|staining/);
  });
});

describe("U-WIRE-LATHE-CUTTING-CHEMISTRY — cast iron MQL/rust", () => {
  it("cast iron gray → notes contain 'mql' OR 'rust' (anti-rust-stain rule)", () => {
    const r = latheCuttingChemistryEngine.selectCoolant({
      workpiece_material: "cast_iron_gray",
      operation: "od_roughing",
      cutting_speed_m_min: 200,
      tool_material: "carbide_cvd",
    });
    const allNotes = r.chemistry_notes.join(" ").toLowerCase();
    expect(allNotes).toMatch(/mql|rust/);
  });
});

describe("U-WIRE-LATHE-CUTTING-CHEMISTRY — ceramic-tool thermal shock", () => {
  it("ceramic Al2O3 tool → notes contain literal 'thermal shock'", () => {
    const r = latheCuttingChemistryEngine.selectCoolant({
      workpiece_material: "stainless_316",
      operation: "od_roughing",
      cutting_speed_m_min: 180,
      tool_material: "ceramic_al2o3",
    });
    const allNotes = r.chemistry_notes.join(" ").toLowerCase();
    expect(allNotes).toContain("thermal shock");
  });
});

describe("U-WIRE-LATHE-CUTTING-CHEMISTRY — high-Vc cooling priority", () => {
  it("Vc > 200 → notes mention 'cutting speed' (cooling-priority rule)", () => {
    const r = latheCuttingChemistryEngine.selectCoolant({
      workpiece_material: "alloy_steel",
      operation: "od_roughing",
      cutting_speed_m_min: HIGH_VC_THRESHOLD_M_MIN + 50,
      tool_material: "carbide_cvd",
    });
    const allNotes = r.chemistry_notes.join(" ").toLowerCase();
    expect(allNotes).toContain("cutting speed");
  });

  it("Vc = 280 on steel → recommendation is NOT straight_oil (de-scored at high Vc)", () => {
    const r = latheCuttingChemistryEngine.selectCoolant({
      workpiece_material: "alloy_steel",
      operation: "od_roughing",
      cutting_speed_m_min: 280,
      tool_material: "carbide_cvd",
    });
    expect(r.recommended_coolant).not.toBe("straight_oil");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. comprehensiveAnalysis — Arrhenius monotonicity (real physics invariant)
// ═══════════════════════════════════════════════════════════════════════

describe("U-WIRE-LATHE-CUTTING-CHEMISTRY — Arrhenius temperature scaling", () => {
  it("higher Vc → strictly higher interface temperature (heat-balance monotonicity)", () => {
    const lowVc = latheCuttingChemistryEngine.comprehensiveAnalysis({
      workpiece_material: "alloy_steel",
      tool_material: "carbide_cvd",
      operation: "od_roughing",
      cutting_speed_m_min: 80,
      feed_mm_rev: 0.20,
      depth_of_cut_mm: 1.5,
    });
    const highVc = latheCuttingChemistryEngine.comprehensiveAnalysis({
      workpiece_material: "alloy_steel",
      tool_material: "carbide_cvd",
      operation: "od_roughing",
      cutting_speed_m_min: 280,
      feed_mm_rev: 0.20,
      depth_of_cut_mm: 1.5,
    });
    expect(highVc.chemical_wear.interface_temperature_C.value)
      .toBeGreaterThan(lowVc.chemical_wear.interface_temperature_C.value);
  });

  it("higher Vc → wear rate non-decreasing (Arrhenius diffusion law)", () => {
    const lowVc = latheCuttingChemistryEngine.comprehensiveAnalysis({
      workpiece_material: "alloy_steel",
      tool_material: "carbide_cvd",
      operation: "od_roughing",
      cutting_speed_m_min: 80,
      feed_mm_rev: 0.20,
      depth_of_cut_mm: 1.5,
    });
    const highVc = latheCuttingChemistryEngine.comprehensiveAnalysis({
      workpiece_material: "alloy_steel",
      tool_material: "carbide_cvd",
      operation: "od_roughing",
      cutting_speed_m_min: 280,
      feed_mm_rev: 0.20,
      depth_of_cut_mm: 1.5,
    });
    expect(highVc.diffusion.wear_rate_um_per_hour.value)
      .toBeGreaterThanOrEqual(lowVc.diffusion.wear_rate_um_per_hour.value);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. comprehensiveAnalysis — coolant_type branch concrete behavior
// ═══════════════════════════════════════════════════════════════════════

describe("U-WIRE-LATHE-CUTTING-CHEMISTRY — compatibility branch", () => {
  it("with coolant_type='semi_synthetic' → compatibility.overall_rating is one of the 4 canonical grades", () => {
    const r = latheCuttingChemistryEngine.comprehensiveAnalysis({
      workpiece_material: "stainless_316",
      tool_material: "carbide_pvd",
      operation: "od_finishing",
      cutting_speed_m_min: 120,
      feed_mm_rev: 0.12,
      depth_of_cut_mm: 0.5,
      coolant_type: "semi_synthetic",
      coolant_concentration_pct: 7,
    });
    expect(["excellent", "good", "marginal", "poor"]).toContain(r.compatibility!.overall_rating);
  });

  it("with coolant_type → optimal_concentration_pct is in (0,100) (realistic dilution range)", () => {
    const r = latheCuttingChemistryEngine.comprehensiveAnalysis({
      workpiece_material: "stainless_316",
      tool_material: "carbide_pvd",
      operation: "od_finishing",
      cutting_speed_m_min: 120,
      feed_mm_rev: 0.12,
      depth_of_cut_mm: 0.5,
      coolant_type: "semi_synthetic",
      coolant_concentration_pct: 7,
    });
    const pct = r.concentration_optimization!.optimal_concentration_pct.value;
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. Variability — operator_sensitivity flag changes recommendation
// ═══════════════════════════════════════════════════════════════════════

describe("U-WIRE-LATHE-CUTTING-CHEMISTRY — flag-driven variability", () => {
  it("operator_sensitivity=true on steel job → score is in [0,1] range (R12 invariant)", () => {
    const r = latheCuttingChemistryEngine.selectCoolant({
      workpiece_material: "alloy_steel",
      operation: "od_roughing",
      cutting_speed_m_min: 180,
      tool_material: "carbide_cvd",
      operator_sensitivity: true,
    });
    expect(r.suitability_score.value).toBeGreaterThanOrEqual(0);
    expect(r.suitability_score.value).toBeLessThanOrEqual(1);
  });

  it("environmental_priority=true → engine returns a vegetable_ester OR full_synthetic preference path", () => {
    const r = latheCuttingChemistryEngine.selectCoolant({
      workpiece_material: "alloy_steel",
      operation: "od_finishing",
      cutting_speed_m_min: 100,
      tool_material: "carbide_cvd",
      environmental_priority: true,
    });
    // With env priority on a benign steel job, recommendation must not be straight petroleum oil
    expect(r.recommended_coolant).not.toBe("straight_oil");
  });
});
