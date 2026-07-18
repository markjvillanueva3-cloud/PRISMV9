/**
 * Tests for PostAMFinishingPlanEngine
 *
 * Covers:
 *   planFinishing   -- sequenced finishing plan from AM as-built to target spec
 *   assessMachinability -- machinability factor vs wrought equivalent
 *
 * Reference values pre-computed manually from the engine lookup tables and
 * conditional logic (AM_PROCESS_PROPS, STRESS_RELIEF_PARAMS, OP_COST_RATES,
 * AM_MACHINABILITY_FACTOR, AM_HARDNESS_DELTA, COATING_RECOMMENDATION).
 */

import { describe, it, expect } from "vitest";
import {
  PostAMFinishingPlanEngine,
  postAMFinishingPlanEngine,
} from "../engines/PostAMFinishingPlanEngine.js";

// -- planFinishing ------------------------------------------------------------

describe("PostAMFinishingPlanEngine.planFinishing", () => {
  // Happy path: SLM titanium, high as-built Ra, no features, moderate target
  it("SLM titanium with no features produces rough + finish operations and correct totals", () => {
    const result = postAMFinishingPlanEngine.planFinishing({
      am_process: "SLM",
      material: "titanium",
      as_built_Ra_um: 8,
      target_Ra_um: 0.8,
      features: [],
    });

    // Must produce rough_milling (Ra 8>6) + finish_milling (Ra 3.2 > 0.8*2=1.6)
    expect(result.operations).toHaveLength(2);
    expect(result.operations[0].process).toBe("rough_milling");
    expect(result.operations[0].sequence).toBe(1);
    expect(result.operations[1].process).toBe("finish_milling");
    expect(result.operations[1].sequence).toBe(2);

    // Support removal: SLM -> wire_EDM_and_manual, round(15*1.0) = 15 min
    expect(result.support_removal.method).toBe("wire_EDM_and_manual");
    expect(result.support_removal.time_min).toBe(15);

    // Stress relief: SLM needs it + titanium -> vacuum_anneal at 595 C, 2 h
    expect(result.stress_relief.needed).toBe(true);
    expect(result.stress_relief.method).toBe("vacuum_anneal");
    expect(result.stress_relief.temp_C).toBe(595);
    expect(result.stress_relief.time_hours).toBe(2);

    // total_time = 15 (support) + 120 (2h furnace) + 10 (rough) + 12 (finish) = 157
    expect(result.total_time_min).toBe(157);

    // total_cost = 45 (15*3.0) + 40 (2*20) + 15 (10*1.5) + 18 (12*1.5) = 118
    expect(result.total_cost_estimate).toBeCloseTo(118.0, 2);
  });

  // Happy path: FDM aluminum with one tight bore triggers honing
  it("FDM aluminum with tight bore triggers rough + semi-finish + honing", () => {
    const result = postAMFinishingPlanEngine.planFinishing({
      am_process: "FDM",
      material: "aluminum",
      as_built_Ra_um: 15,
      target_Ra_um: 3.2,
      features: [{ type: "bore", tolerance_mm: 0.02, surface_finish_Ra: 0.3 }],
    });

    expect(result.operations).toHaveLength(3);
    expect(result.operations[0].process).toBe("rough_milling");
    expect(result.operations[1].process).toBe("semi_finish_milling");
    expect(result.operations[2].process).toBe("honing");

    // FDM: no stress relief
    expect(result.stress_relief.needed).toBe(false);

    // Support: FDM dissolve_or_break_away, round(15*0.5)=round(7.5)=8 min
    expect(result.support_removal.method).toBe("dissolve_or_break_away");
    expect(result.support_removal.time_min).toBe(8);

    // Honing op must carry crosshatch_deg and target_Ra_um params
    const honeOp = result.operations[2];
    expect(honeOp.params["crosshatch_deg"]).toBe(45);
    expect(honeOp.params["target_Ra_um"]).toBe(0.3);

    // total_time = 8 + 15 + 11 + 15 = 49
    expect(result.total_time_min).toBe(49);

    // total_cost = (8*3.0)=24 + (15*1.5)=22.5 + (11*1.5)=16.5 + (15*1.8)=27 = 90.0
    expect(result.total_cost_estimate).toBeCloseTo(90.0, 2);
  });

  // Happy path: EBM inconel, very low target Ra -> polishing + surface_grinding
  it("EBM inconel with tight flat datum and very low Ra target triggers full 5-op sequence", () => {
    const result = postAMFinishingPlanEngine.planFinishing({
      am_process: "EBM",
      material: "inconel",
      as_built_Ra_um: 25,
      target_Ra_um: 0.1,
      features: [{ type: "flat", tolerance_mm: 0.005, surface_finish_Ra: 0.05 }],
    });

    // EBM: no stress relief (built at high temp)
    expect(result.stress_relief.needed).toBe(false);

    // Should contain: rough, semi_finish, finish, surface_grinding, polishing
    const procs = result.operations.map((o) => o.process);
    expect(procs).toContain("rough_milling");
    expect(procs).toContain("semi_finish_milling");
    expect(procs).toContain("finish_milling");
    expect(procs).toContain("surface_grinding");
    expect(procs).toContain("polishing");
    expect(result.operations).toHaveLength(5);

    // Sequences must be monotonically increasing from 1
    for (let i = 0; i < result.operations.length; i++) {
      expect(result.operations[i].sequence).toBe(i + 1);
    }

    // Support: EBM -> powder_blast_and_manual, round(15*0.7)=round(10.5)=11 min
    expect(result.support_removal.method).toBe("powder_blast_and_manual");
    expect(result.support_removal.time_min).toBe(11);

    // total_time = 11 + 15 + 11 + 14 + 10 + 80 = 141
    expect(result.total_time_min).toBe(141);

    // total_cost = 33+22.5+16.5+21+20+64 = 177
    expect(result.total_cost_estimate).toBeCloseTo(177.0, 2);
  });

  // Algebraic invariant: sequence numbers are always consecutive starting at 1
  it("operation sequences are always 1-based and consecutive regardless of input", () => {
    const result = postAMFinishingPlanEngine.planFinishing({
      am_process: "DMLS",
      material: "stainless_steel",
      as_built_Ra_um: 10,
      target_Ra_um: 0.2,
      features: [
        { type: "bore", tolerance_mm: 0.04, surface_finish_Ra: 0.2 },
        { type: "flat", tolerance_mm: 0.005 },
      ],
    });

    result.operations.forEach((op, idx) => {
      expect(op.sequence).toBe(idx + 1);
    });
  });

  // Algebraic invariant: total_time_min and total_cost_estimate are always positive
  it("total_time and total_cost are always positive for any valid AM process", () => {
    const processes = ["SLM", "EBM", "DED", "DMLS", "FDM"] as const;
    for (const proc of processes) {
      const r = postAMFinishingPlanEngine.planFinishing({
        am_process: proc,
        material: "alloy_steel",
        as_built_Ra_um: 20,
        target_Ra_um: 1.6,
        features: [],
      });
      expect(r.total_time_min).toBeGreaterThan(0);
      expect(r.total_cost_estimate).toBeGreaterThan(0);
    }
  });

  // Failure mode 1: as_built Ra already at target and below 6 um -> no milling ops
  it("when as_built Ra is 3.2 and target is also 3.2, no milling operations are added", () => {
    const result = postAMFinishingPlanEngine.planFinishing({
      am_process: "FDM",
      material: "aluminum",
      as_built_Ra_um: 3.2,
      target_Ra_um: 3.2,
      features: [],
    });

    // No rough (3.2 not >6), no semi (no tight features), no finish (3.2 not > 6.4), no polish
    expect(result.operations).toHaveLength(0);

    // Still has support removal contributing to time/cost
    expect(result.support_removal.time_min).toBeGreaterThan(0);
    expect(result.total_time_min).toBeGreaterThan(0);
  });

  // Failure mode 2: DED alloy_steel, empty features -> only rough milling, correct stress relief
  it("DED alloy_steel with empty features triggers rough only and stress relief at 600C", () => {
    const result = postAMFinishingPlanEngine.planFinishing({
      am_process: "DED",
      material: "alloy_steel",
      as_built_Ra_um: 30,
      target_Ra_um: 1.6,
      features: [],
    });

    // DED: stress_relief needed, alloy_steel -> 600C, 1.5h, stress_relief_anneal
    expect(result.stress_relief.needed).toBe(true);
    expect(result.stress_relief.temp_C).toBe(600);
    expect(result.stress_relief.time_hours).toBe(1.5);
    expect(result.stress_relief.method).toBe("stress_relief_anneal");

    // Support: DED -> machining, round(15*1.5)=23 min (round(22.5)=23)
    expect(result.support_removal.method).toBe("machining");
    expect(result.support_removal.time_min).toBe(23);

    // rough (Ra 30>6): roughTime=10, currentRa->3.2
    // finish check: 3.2 > 1.6*2=3.2 is false -> no finish op
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0].process).toBe("rough_milling");
  });

  // Failure mode 3: flat feature with tolerance >= 0.01mm does NOT trigger surface_grinding
  it("flat feature with tolerance 0.02mm does not trigger surface_grinding", () => {
    const result = postAMFinishingPlanEngine.planFinishing({
      am_process: "SLM",
      material: "titanium",
      as_built_Ra_um: 8,
      target_Ra_um: 0.8,
      features: [{ type: "flat", tolerance_mm: 0.02 }],
    });

    const procs = result.operations.map((o) => o.process);
    expect(procs).not.toContain("surface_grinding");
  });

  // Adversarial 1: very low target Ra (0.05) drives max polishing time calculation
  // polishTime = round(20 * (0.4 / max(0.05, 0.01))) = round(20 * 8) = 160 min
  it("very low target Ra 0.05 um produces polishing op with Ra param set to 0.05", () => {
    const result = postAMFinishingPlanEngine.planFinishing({
      am_process: "EBM",
      material: "inconel",
      as_built_Ra_um: 25,
      target_Ra_um: 0.05,
      features: [],
    });

    const polishOp = result.operations.find((o) => o.process === "polishing");
    expect(polishOp?.process).toBe("polishing");
    expect(polishOp?.params["target_Ra_um"]).toBe(0.05);

    // polishTime=160 + support=11 + rough=10 + finish=12 -> total >= 193
    expect(result.total_time_min).toBeGreaterThanOrEqual(193);
  });

  // Adversarial 2: unknown material string falls back to alloy_steel stress relief
  it("unknown material string falls back to alloy_steel stress relief (600C, 1.5h)", () => {
    const result = postAMFinishingPlanEngine.planFinishing({
      am_process: "SLM",
      material: "unobtainium-42",
      as_built_Ra_um: 10,
      target_Ra_um: 1.6,
      features: [],
    });

    // SLM needs stress relief; getMaterialKey returns 'alloy_steel' fallback
    expect(result.stress_relief.needed).toBe(true);
    expect(result.stress_relief.temp_C).toBe(600);
    expect(result.stress_relief.time_hours).toBe(1.5);
  });

  // Singleton check
  it("exported singleton is an instance of PostAMFinishingPlanEngine", () => {
    expect(postAMFinishingPlanEngine).toBeInstanceOf(PostAMFinishingPlanEngine);
  });
});

// -- assessMachinability ------------------------------------------------------

describe("PostAMFinishingPlanEngine.assessMachinability", () => {
  // Happy path: SLM titanium Z-vertical, density omitted (defaults 100-0.5=99.5 -> factor 1.0)
  it("SLM titanium vertical build yields machinability 0.75 and 25% speed reduction", () => {
    const result = postAMFinishingPlanEngine.assessMachinability({
      am_process: "SLM",
      material: "titanium",
      build_orientation: "Z-vertical",
    });

    // baseFactor=0.75, densityFactor=1.0 -> 0.75
    expect(result.machinability_factor).toBeCloseTo(0.75, 2);

    // speedReduction = round((1-0.75)*100) = 25
    expect(result.recommended_speed_reduction_pct).toBe(25);

    // wearIncrease = round(5*5 + (1-1.0)*50) = 25
    expect(result.tool_wear_increase_pct).toBe(25);

    // TiAlN coating for titanium
    expect(result.recommended_tool_coating).toBe("TiAlN");

    // Z/vertical -> 2 warnings + stress-relief-after warning = 3
    expect(result.anisotropy_warnings).toHaveLength(3);
    expect(result.anisotropy_warnings[0]).toContain("Vertical build");
    expect(result.anisotropy_warnings[1]).toContain("Layer boundaries");
    expect(result.anisotropy_warnings[2]).toContain("stress relief");
  });

  // Happy path: DED inconel, density=95 -- orientation "plane-only" avoids letters z/x/vertical/45/angle
  // NOTE: "horizontal" contains the letter 'z' (horiz), so it ALSO triggers the vertical-build
  // branch. Use a neutral orientation to isolate the DED + density + stress_relief warnings only.
  it("DED inconel at 95% density yields machinability 0.55, AlTiN coating, and expected warnings", () => {
    const result = postAMFinishingPlanEngine.assessMachinability({
      am_process: "DED",
      material: "inconel",
      build_orientation: "flat-build-plane",
      density_pct: 95,
    });

    // baseFactor=0.65, densityFactor=0.85 -> round(0.65*0.85*100)/100=0.55
    expect(result.machinability_factor).toBeCloseTo(0.55, 2);

    // speedReduction = round((1-0.55)*100) = 45
    expect(result.recommended_speed_reduction_pct).toBe(45);

    // hardnessDelta(inconel)=8, wearIncrease=round(40+7.5)=48
    expect(result.tool_wear_increase_pct).toBe(48);

    expect(result.recommended_tool_coating).toBe("AlTiN");

    // "flat-build-plane": no z/vertical/45/angle/x/horizontal -> 0 orientation warnings
    // density 95 < 99 -> 1 porosity warning
    // DED -> 1 warning
    // stress_relief_needed=true -> 1 warning
    // Total = 3
    expect(result.anisotropy_warnings).toHaveLength(3);
    expect(result.anisotropy_warnings.some((w) => w.includes("Porosity"))).toBe(true);
    expect(result.anisotropy_warnings.some((w) => w.includes("DED process"))).toBe(true);
    expect(result.anisotropy_warnings.some((w) => w.includes("stress relief"))).toBe(true);
  });

  // Happy path: FDM aluminum -> machinability > 1.0 (polymers easier) and speed reduction clamped to 0
  it("FDM aluminum has machinability_factor above 1.0 and speed_reduction clamped to 0", () => {
    const result = postAMFinishingPlanEngine.assessMachinability({
      am_process: "FDM",
      material: "aluminum",
      build_orientation: "Z-vertical",
    });

    // baseFactor=1.20 for FDM
    expect(result.machinability_factor).toBeGreaterThan(1.0);

    // speedReduction: (1-1.2)*100=-20 -> clamped to 0
    expect(result.recommended_speed_reduction_pct).toBe(0);

    // No stress relief for FDM -> no machine-after-stress-relief warning
    const hasStressWarn = result.anisotropy_warnings.some((w) => w.includes("stress relief"));
    expect(hasStressWarn).toBe(false);
  });

  // Failure mode 1: density below 95% -> densityFactor=0.70, porosity warning included
  it("density 90% triggers porosity warning and uses densityFactor 0.70", () => {
    const result = postAMFinishingPlanEngine.assessMachinability({
      am_process: "DMLS",
      material: "stainless_steel",
      build_orientation: "horizontal",
      density_pct: 90,
    });

    // baseFactor=0.70, densityFactor=0.70 -> round(0.70*0.70*100)/100=0.49
    expect(result.machinability_factor).toBeCloseTo(0.49, 2);

    // porosity warning must mention the % value
    const porosityWarn = result.anisotropy_warnings.find((w) => w.includes("Porosity"));
    expect(porosityWarn).toContain("10.0%");
  });

  // Failure mode 2: 45-degree angled build adds non-uniform surface finish warning
  it("45-degree build orientation adds angled-grain anisotropy warning", () => {
    const result = postAMFinishingPlanEngine.assessMachinability({
      am_process: "SLM",
      material: "titanium",
      build_orientation: "45-degree-angle",
    });

    const angleWarn = result.anisotropy_warnings.find((w) => w.includes("Angled build"));
    expect(angleWarn).toContain("non-uniform surface finish");
  });

  // Failure mode 3: unknown material falls back to TiAlN coating and positive wear increase
  it("unknown material produces TiAlN fallback coating and positive numeric results", () => {
    const result = postAMFinishingPlanEngine.assessMachinability({
      am_process: "SLM",
      material: "exotic-unobtainium",
      build_orientation: "Z-vertical",
    });

    expect(result.recommended_tool_coating).toBe("TiAlN");
    expect(result.machinability_factor).toBeGreaterThan(0);
    expect(result.tool_wear_increase_pct).toBeGreaterThanOrEqual(0);
    expect(result.recommended_speed_reduction_pct).toBeGreaterThanOrEqual(0);
  });

  // Adversarial 1: EBM (no stress relief needed) -> no machine-after-stress-relief warning
  it("EBM process does not emit a machine-after-stress-relief warning", () => {
    const result = postAMFinishingPlanEngine.assessMachinability({
      am_process: "EBM",
      material: "titanium",
      build_orientation: "Z-vertical",
    });

    const srWarn = result.anisotropy_warnings.find((w) => w.includes("stress relief"));
    // must be absent (undefined means the find returned no match)
    expect(srWarn).toBeUndefined();
  });

  // Adversarial 2: density exactly 99.5% hits the >=99.5 boundary -> densityFactor exactly 1.0
  it("density exactly 99.5% uses densityFactor 1.0 (boundary condition)", () => {
    const result = postAMFinishingPlanEngine.assessMachinability({
      am_process: "SLM",
      material: "titanium",
      build_orientation: "horizontal",
      density_pct: 99.5,
    });

    // baseFactor=0.75, densityFactor=1.0 -> 0.75
    expect(result.machinability_factor).toBeCloseTo(0.75, 2);
  });

  // Structural invariant: all five result fields always present and non-negative
  it("assessMachinability always returns all required fields with non-negative numbers", () => {
    const result = postAMFinishingPlanEngine.assessMachinability({
      am_process: "DED",
      material: "maraging_steel",
      build_orientation: "Z-vertical",
      density_pct: 97,
    });

    expect(typeof result.machinability_factor).toBe("number");
    expect(typeof result.recommended_speed_reduction_pct).toBe("number");
    expect(typeof result.tool_wear_increase_pct).toBe("number");
    expect(result.machinability_factor).toBeGreaterThan(0);
    expect(result.recommended_speed_reduction_pct).toBeGreaterThanOrEqual(0);
    expect(result.tool_wear_increase_pct).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.anisotropy_warnings)).toBe(true);
    expect(result.recommended_tool_coating.length).toBeGreaterThan(0);
  });
});
