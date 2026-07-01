/**
 * cncops-dispatcher-method-drift.test.ts
 *
 * R9 regression-lock for the 8 dispatcher->engine method-drift fixes in
 * cncOpsDispatcher.ts (U-CNCOPS-METHOD-DRIFT, slot:main, 2026-06-24).
 *
 * Each test calls the EXACT method the fixed dispatcher now invokes and
 * asserts real output field values derived from known physics. Reverting
 * any method rename (back to .calculate()) causes the import to compile but
 * the call to throw "is not a function" at runtime — the regression-lock test
 * fails immediately.
 *
 * No toBeDefined() stubs. Every assertion encodes WHY the value matters:
 *   - Reference table look-ups (ANSI, DIN, Sandvik)
 *   - Geometric identities (tool_path_dia = bore_dia - tool_dia)
 *   - Physics monotone properties (RPM ∝ Vc/D, force ∝ contact length)
 *   - Trig identities (ramp_length = depth / tan(angle))
 *
 * Naming note: method-existence guard uses a typed helper that reads the key
 * from the object as Record<string, unknown> — no unsafe casts.
 */

import { describe, it, expect } from "vitest";

import {
  centerDrillEngine,
  type CenterDrillResult,
  type CenterDrillInput,
} from "../engines/CenterDrillEngine.js";
import {
  circularInterpolationEngine,
  type CircularBoreInput,
  type CircularBoreResult,
} from "../engines/CircularInterpolationEngine.js";
import {
  counterboreSinkEngine,
  type CounterboreInput,
  type CounterboreResult,
} from "../engines/CounterboreSinkEngine.js";
import {
  deburringEngine,
  type DeburringInput,
  type DeburringResult,
  type DeburringMethod,
} from "../engines/DeburringEngine.js";
import {
  helicalInterpolationEngine,
  type BoreMillInput,
  type BoreMillResult,
} from "../engines/HelicalInterpolationEngine.js";
import {
  knurlingEngine,
  type KnurlInput,
  type KnurlResult,
} from "../engines/KnurlingEngine.js";
import {
  partingGroovingEngine,
  type PartingInput,
  type PartingResult,
  type GrooveInput,
  type GrooveResult,
} from "../engines/PartingGroovingEngine.js";
import {
  rampingEngine,
  type LinearRampInput,
  type LinearRampResult,
} from "../engines/RampingEngine.js";

// ─────────────────────────────────────────────────────────────────────────────
// Typed helpers — no unsafe casts
// ─────────────────────────────────────────────────────────────────────────────

function methodExists(obj: object, name: string): boolean {
  return typeof (obj as Record<string, unknown>)[name] === "function";
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. center_drill_calculate → centerDrillEngine.centerDrill()
// ─────────────────────────────────────────────────────────────────────────────
describe("center_drill_calculate → centerDrillEngine.centerDrill()", () => {
  it("centerDrill() exists; .calculate() does NOT exist (regression-lock)", () => {
    expect(methodExists(centerDrillEngine, "centerDrill")).toBe(true);
    expect(methodExists(centerDrillEngine, "calculate")).toBe(false);
  });

  it("ANSI table: M6 subsequent drill selects size#3 (pilot=2.0mm, body=5.56mm)", () => {
    // targetPilot = 6 × 0.35 = 2.1mm; best match with pilot ≤ 6×0.6=3.6mm is size "3" (pilot=2.0, body=5.56)
    const input: CenterDrillInput = { subsequent_drill_diameter_mm: 6, material_iso_group: "P" };
    const r: CenterDrillResult = centerDrillEngine.centerDrill(input);
    expect(r.recommended_size).toBe("3");
    expect(r.body_diameter.value).toBeCloseTo(5.56, 1);
    expect(r.body_diameter.unit).toBe("mm");
    expect(r.pilot_diameter.value).toBeCloseTo(2.0, 1);
    expect(r.pilot_diameter.value).toBeLessThan(r.body_diameter.value);
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
    expect(r.feed_rate.value).toBeGreaterThan(0);
    expect(Array.isArray(r.warnings)).toBe(true);
  });

  it("ANSI size#2: pilot=1.6mm, body=4.37mm (table look-up reference values)", () => {
    const r: CenterDrillResult = centerDrillEngine.centerDrill({
      subsequent_drill_diameter_mm: 4,
      center_drill_size: "2",
      material_iso_group: "P",
    });
    expect(r.recommended_size).toBe("2");
    expect(r.pilot_diameter.value).toBeCloseTo(1.6, 2);
    expect(r.body_diameter.value).toBeCloseTo(4.37, 2);
  });

  it("RPM invariant: spindle_rpm ≈ (30×0.8 m/min × 1000) / (π × pilot_dia) for P steel", () => {
    // Engine formula: vc = SPOT_SPEEDS[iso] * 0.8; rpm = (vc*1000)/(π*pilotDia)
    // Uses PILOT diameter, not body diameter. 0.8 factor reduces for center drill application.
    const r: CenterDrillResult = centerDrillEngine.centerDrill({
      subsequent_drill_diameter_mm: 8,
      material_iso_group: "P",
    });
    const vcReduced = 30 * 0.8; // Vc(P)=30 m/min × 0.8 center-drill reduction
    const expectedRpm = (vcReduced * 1000) / (Math.PI * r.pilot_diameter.value);
    expect(r.spindle_rpm.value).toBeCloseTo(expectedRpm, 0);
  });

  it("N-group (aluminium, Vc=80) gives faster RPM than P-group (steel, Vc=30) same drill", () => {
    const rP = centerDrillEngine.centerDrill({ subsequent_drill_diameter_mm: 6, material_iso_group: "P" });
    const rN = centerDrillEngine.centerDrill({ subsequent_drill_diameter_mm: 6, material_iso_group: "N" });
    expect(rN.spindle_rpm.value).toBeGreaterThan(rP.spindle_rpm.value);
  });

  it("very small drill (<1.5mm) results in size 00 or a warning", () => {
    const r: CenterDrillResult = centerDrillEngine.centerDrill({
      subsequent_drill_diameter_mm: 1.0,
      material_iso_group: "P",
    });
    const hasWarnOrTinySize = r.warnings.length > 0 || r.recommended_size === "00";
    expect(hasWarnOrTinySize).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. circular_interpolation_calculate → circularInterpolationEngine.bore()
// ─────────────────────────────────────────────────────────────────────────────
describe("circular_interpolation_calculate → circularInterpolationEngine.bore()", () => {
  it("bore() exists; .calculate() does NOT exist (regression-lock)", () => {
    expect(methodExists(circularInterpolationEngine, "bore")).toBe(true);
    expect(methodExists(circularInterpolationEngine, "calculate")).toBe(false);
  });

  it("tool_path_diameter = bore_dia - tool_dia (circular interpolation geometry identity)", () => {
    const input: CircularBoreInput = {
      target_diameter_mm: 30,
      tool_diameter_mm: 12,
      depth_mm: 15,
      num_flutes: 4,
    };
    const r: CircularBoreResult = circularInterpolationEngine.bore(input);
    expect(r.tool_path_diameter.value).toBeCloseTo(30 - 12, 1);
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
    expect(r.programmed_feed.value).toBeGreaterThan(0);
    expect(Array.isArray(r.warnings)).toBe(true);
  });

  it("G3/CCW direction string for internal bore (climb milling of a bore is CCW at tool center)", () => {
    // Engine emits: "G3 (CCW) for climb milling internal" (descriptive string, not bare code)
    const r: CircularBoreResult = circularInterpolationEngine.bore({
      target_diameter_mm: 25,
      tool_diameter_mm: 10,
      depth_mm: 20,
      num_flutes: 4,
    });
    expect(r.g_code_direction).toContain("G3");
    expect(r.g_code_direction.toLowerCase()).toContain("ccw");
  });

  it("warns (does not throw) when tool_dia >= bore_dia — impossible geometry", () => {
    const r: CircularBoreResult = circularInterpolationEngine.bore({
      target_diameter_mm: 10,
      tool_diameter_mm: 12,
      depth_mm: 10,
      num_flutes: 3,
    });
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("number_of_passes >= 1 and increases with bore diameter for same tool", () => {
    const small = circularInterpolationEngine.bore({ target_diameter_mm: 16, tool_diameter_mm: 6, depth_mm: 10, num_flutes: 4 });
    const large = circularInterpolationEngine.bore({ target_diameter_mm: 50, tool_diameter_mm: 6, depth_mm: 10, num_flutes: 4 });
    expect(small.number_of_passes.value).toBeGreaterThanOrEqual(1);
    expect(large.number_of_passes.value).toBeGreaterThanOrEqual(small.number_of_passes.value);
  });

  it("RPM higher for N-group (Vc=300) than P-group (Vc=120) same bore+tool", () => {
    const rP = circularInterpolationEngine.bore({ target_diameter_mm: 25, tool_diameter_mm: 10, depth_mm: 10, num_flutes: 4, material_iso_group: "P" });
    const rN = circularInterpolationEngine.bore({ target_diameter_mm: 25, tool_diameter_mm: 10, depth_mm: 10, num_flutes: 4, material_iso_group: "N" });
    expect(rN.spindle_rpm.value).toBeGreaterThan(rP.spindle_rpm.value);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. counterbore_calculate → counterboreSinkEngine.counterbore()
// ─────────────────────────────────────────────────────────────────────────────
describe("counterbore_calculate → counterboreSinkEngine.counterbore()", () => {
  it("counterbore() exists; .calculate() does NOT exist (regression-lock)", () => {
    expect(methodExists(counterboreSinkEngine, "counterbore")).toBe(true);
    expect(methodExists(counterboreSinkEngine, "calculate")).toBe(false);
  });

  it("M6 SHCS: cbore_dia=10.0, cbore_depth=6.0, through_hole=6.6 (ANSI B18.3)", () => {
    const r: CounterboreResult = counterboreSinkEngine.counterbore({
      fastener_size_mm: 6,
      fastener_type: "shcs",
      material_iso_group: "P",
    });
    expect(r.counterbore_diameter.value).toBeCloseTo(10.0, 1);
    expect(r.counterbore_depth.value).toBeCloseTo(6.0, 1);
    expect(r.through_hole_diameter.value).toBeCloseTo(6.6, 1);
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
    expect(r.feed_rate.value).toBeGreaterThan(0);
    expect(Array.isArray(r.warnings)).toBe(true);
  });

  it("custom cbore: returns exactly the caller-specified dimensions", () => {
    const input: CounterboreInput = {
      fastener_type: "custom",
      counterbore_diameter_mm: 18,
      counterbore_depth_mm: 10,
      through_hole_diameter_mm: 9,
      material_iso_group: "K",
    };
    const r: CounterboreResult = counterboreSinkEngine.counterbore(input);
    expect(r.counterbore_diameter.value).toBeCloseTo(18, 1);
    expect(r.counterbore_depth.value).toBeCloseTo(10, 1);
    expect(r.through_hole_diameter.value).toBeCloseTo(9, 1);
  });

  it("counterbore_diameter > fastener_size for all standard sizes (clearance invariant)", () => {
    for (const size of [3, 5, 6, 8, 10, 12] as const) {
      const r = counterboreSinkEngine.counterbore({ fastener_size_mm: size, fastener_type: "shcs" });
      expect(r.counterbore_diameter.value).toBeGreaterThan(size);
    }
  });

  it("K-material (cast iron, higher Vc) gives faster RPM than P-steel for same tool", () => {
    const rP = counterboreSinkEngine.counterbore({ fastener_size_mm: 8, fastener_type: "shcs", material_iso_group: "P" });
    const rK = counterboreSinkEngine.counterbore({ fastener_size_mm: 8, fastener_type: "shcs", material_iso_group: "K" });
    expect(rK.spindle_rpm.value).toBeGreaterThan(rP.spindle_rpm.value);
  });

  it("M12 SHCS: cbore_dia=18.0, cbore_depth=12.0, through=13.5 (ANSI B18.3)", () => {
    const r: CounterboreResult = counterboreSinkEngine.counterbore({ fastener_size_mm: 12, fastener_type: "shcs" });
    expect(r.counterbore_diameter.value).toBeCloseTo(18.0, 1);
    expect(r.counterbore_depth.value).toBeCloseTo(12.0, 1);
    expect(r.through_hole_diameter.value).toBeCloseTo(13.5, 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. deburring_calculate → deburringEngine.recommend()
// ─────────────────────────────────────────────────────────────────────────────
describe("deburring_calculate → deburringEngine.recommend()", () => {
  it("recommend() exists; .calculate() does NOT exist (regression-lock)", () => {
    expect(methodExists(deburringEngine, "recommend")).toBe(true);
    expect(methodExists(deburringEngine, "calculate")).toBe(false);
  });

  it("returns a valid DeburringMethod string for external-edge P-steel part", () => {
    const VALID_METHODS: DeburringMethod[] = [
      "manual", "tumble", "vibratory", "thermal",
      "electrochemical", "brush", "abrasive_flow", "cryogenic",
    ];
    const r: DeburringResult = deburringEngine.recommend({
      material_iso_group: "P",
      burr_locations: ["external_edge"],
      batch_size: 100,
    });
    expect(VALID_METHODS.includes(r.recommended_method)).toBe(true);
    expect(r.cycle_time.value).toBeGreaterThan(0);
    expect(r.cycle_time.unit).toBe("s");
    expect(Array.isArray(r.alternative_methods)).toBe(true);
    expect(Array.isArray(r.warnings)).toBe(true);
  });

  it("cross_hole burrs → internal-access capable method (thermal/ECM/abrasive-flow/brush)", () => {
    const r: DeburringResult = deburringEngine.recommend({
      burr_locations: ["cross_hole"],
      has_internal_features: true,
    });
    const internalCapable: DeburringMethod[] = ["thermal", "electrochemical", "abrasive_flow", "brush"];
    expect(internalCapable.includes(r.recommended_method)).toBe(true);
  });

  it("large batch (2000 parts) does NOT recommend manual (manual doesn't scale)", () => {
    const r: DeburringResult = deburringEngine.recommend({
      batch_size: 2000,
      burr_locations: ["external_edge"],
    });
    expect(r.recommended_method).not.toBe("manual");
  });

  it("S-group (Ti, difficulty=5) cycle_time > N-group (Al, difficulty=1) same burr", () => {
    const rN: DeburringResult = deburringEngine.recommend({ material_iso_group: "N", batch_size: 50, burr_locations: ["external_edge"] });
    const rS: DeburringResult = deburringEngine.recommend({ material_iso_group: "S", batch_size: 50, burr_locations: ["external_edge"] });
    expect(rS.cycle_time.value).toBeGreaterThan(rN.cycle_time.value);
  });

  it("alternative_methods array has suitability strings (excellent|good|marginal)", () => {
    const r: DeburringResult = deburringEngine.recommend({ material_iso_group: "P", batch_size: 100 });
    for (const alt of r.alternative_methods) {
      expect(["excellent", "good", "marginal"].includes(alt.suitability)).toBe(true);
      expect(alt.reason.length).toBeGreaterThan(0);
    }
  });

  it("cost_per_part is positive and has unit 'USD'", () => {
    const r: DeburringResult = deburringEngine.recommend({ material_iso_group: "P", batch_size: 100 });
    expect(r.cost_per_part.value).toBeGreaterThan(0);
    expect(r.cost_per_part.unit).toBe("USD");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. helical_interpolation_calculate → helicalInterpolationEngine.boreMill()
// ─────────────────────────────────────────────────────────────────────────────
describe("helical_interpolation_calculate → helicalInterpolationEngine.boreMill()", () => {
  it("boreMill() exists; .calculate() does NOT exist (regression-lock)", () => {
    expect(methodExists(helicalInterpolationEngine, "boreMill")).toBe(true);
    expect(methodExists(helicalInterpolationEngine, "calculate")).toBe(false);
  });

  it("helix_diameter = target_dia - tool_dia (bore-mill geometry identity)", () => {
    const input: BoreMillInput = {
      target_diameter_mm: 40,
      tool_diameter_mm: 16,
      num_flutes: 4,
      depth_mm: 30,
    };
    const r: BoreMillResult = helicalInterpolationEngine.boreMill(input);
    expect(r.helix_diameter.value).toBeCloseTo(40 - 16, 1);
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
    expect(r.programmed_feed.value).toBeGreaterThan(0);
    expect(r.number_of_helixes.value).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(r.warnings)).toBe(true);
  });

  it("number_of_helixes increases monotonically with depth", () => {
    const base: BoreMillInput = { target_diameter_mm: 25, tool_diameter_mm: 10, num_flutes: 4, depth_mm: 0 };
    const r10 = helicalInterpolationEngine.boreMill({ ...base, depth_mm: 10 });
    const r30 = helicalInterpolationEngine.boreMill({ ...base, depth_mm: 30 });
    expect(r30.number_of_helixes.value).toBeGreaterThan(r10.number_of_helixes.value);
  });

  it("warns (does not throw) when tool_dia >= bore_dia — impossible geometry", () => {
    const r: BoreMillResult = helicalInterpolationEngine.boreMill({
      target_diameter_mm: 10,
      tool_diameter_mm: 12,
      num_flutes: 3,
      depth_mm: 8,
    });
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("N-group faster RPM than P-group for same bore + tool (Vc N=250, P=100)", () => {
    const base: BoreMillInput = { target_diameter_mm: 30, tool_diameter_mm: 12, num_flutes: 4, depth_mm: 20 };
    const rP = helicalInterpolationEngine.boreMill({ ...base, material_iso_group: "P" });
    const rN = helicalInterpolationEngine.boreMill({ ...base, material_iso_group: "N" });
    expect(rN.spindle_rpm.value).toBeGreaterThan(rP.spindle_rpm.value);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. knurling_calculate → knurlingEngine.knurl()
// ─────────────────────────────────────────────────────────────────────────────
describe("knurling_calculate → knurlingEngine.knurl()", () => {
  it("knurl() exists; .calculate() does NOT exist (regression-lock)", () => {
    expect(methodExists(knurlingEngine, "knurl")).toBe(true);
    expect(methodExists(knurlingEngine, "calculate")).toBe(false);
  });

  it("form knurl: blank_diameter < workpiece_diameter (material displaced outward)", () => {
    const r: KnurlResult = knurlingEngine.knurl({
      workpiece_diameter_mm: 30,
      knurl_length_mm: 25,
      method: "form",
      material_iso_group: "P",
    });
    expect(r.blank_diameter.value).toBeLessThan(30);
    expect(r.blank_diameter.unit).toBe("mm");
    expect(r.tooth_depth.value).toBeGreaterThan(0);
    expect(r.radial_force.value).toBeGreaterThan(0);
    expect(r.pattern).toBe("diamond"); // default
    expect(r.method).toBe("form");
    expect(Array.isArray(r.warnings)).toBe(true);
  });

  it("cut knurl: blank_diameter ≈ workpiece_diameter (no material displacement)", () => {
    const r: KnurlResult = knurlingEngine.knurl({
      workpiece_diameter_mm: 20,
      knurl_length_mm: 20,
      method: "cut",
      material_iso_group: "N",
    });
    expect(r.blank_diameter.value).toBeCloseTo(20, 1);
  });

  it("finished_od > blank_diameter for form knurling (knurl raises the OD)", () => {
    const r: KnurlResult = knurlingEngine.knurl({
      workpiece_diameter_mm: 25,
      knurl_length_mm: 20,
      method: "form",
    });
    expect(r.finished_od.value).toBeGreaterThan(r.blank_diameter.value);
  });

  it("radial_force increases with contact length (longer knurl = more force)", () => {
    const short = knurlingEngine.knurl({ workpiece_diameter_mm: 20, knurl_length_mm: 10, method: "form" });
    const long_  = knurlingEngine.knurl({ workpiece_diameter_mm: 20, knurl_length_mm: 50, method: "form" });
    expect(long_.radial_force.value).toBeGreaterThan(short.radial_force.value);
  });

  it("pitch is a standard DIN 82 value (0.5|0.6|0.8|1.0|1.2|1.6|2.0 mm)", () => {
    const STANDARD_PITCHES = [0.5, 0.6, 0.8, 1.0, 1.2, 1.6, 2.0];
    const r: KnurlResult = knurlingEngine.knurl({ workpiece_diameter_mm: 25, knurl_length_mm: 20, method: "form" });
    const rounded = Math.round(r.pitch.value * 10) / 10;
    expect(STANDARD_PITCHES.includes(rounded)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7a. parting_grooving_calculate (parting branch)
//     → partingGroovingEngine.parting()  (no groove_width_mm supplied)
// ─────────────────────────────────────────────────────────────────────────────
describe("parting_grooving_calculate (parting branch) → partingGroovingEngine.parting()", () => {
  it("parting() exists; .calculate() does NOT exist (regression-lock)", () => {
    expect(methodExists(partingGroovingEngine, "parting")).toBe(true);
    expect(methodExists(partingGroovingEngine, "calculate")).toBe(false);
  });

  it("blade_width = 2.0mm for 40mm bar (Sandvik C-2920: 20 < dia <= 40 → 2mm)", () => {
    const r: PartingResult = partingGroovingEngine.parting({ bar_diameter_mm: 40 });
    expect(r.blade_width.value).toBeCloseTo(2.0, 1);
    expect(r.blade_width.unit).toBe("mm");
    expect(r.cutting_speed.value).toBeGreaterThan(0);
    expect(r.spindle_rpm_start.value).toBeGreaterThan(0);
    expect(r.feed_rate.value).toBeGreaterThan(0);
    expect(typeof r.use_constant_speed).toBe("boolean");
    expect(Array.isArray(r.warnings)).toBe(true);
  });

  it("RPM invariant: rpm_start ≈ (100 m/min × 1000) / (π × 50mm) for P-steel", () => {
    const D = 50;
    const r: PartingResult = partingGroovingEngine.parting({ bar_diameter_mm: D, material_iso_group: "P" });
    // Vc(P) = 100 m/min per PART_SPEEDS table
    const expected = (100 * 1000) / (Math.PI * D);
    expect(r.spindle_rpm_start.value).toBeCloseTo(expected, 0);
  });

  it("rpm_end > rpm_start (speed rises as diameter shrinks at constant Vc — CSS)", () => {
    const r: PartingResult = partingGroovingEngine.parting({ bar_diameter_mm: 50, material_iso_group: "P" });
    expect(r.spindle_rpm_end.value).toBeGreaterThan(r.spindle_rpm_start.value);
  });

  it("blade_width for 10mm bar = 1.0mm (smallest Sandvik step)", () => {
    const r: PartingResult = partingGroovingEngine.parting({ bar_diameter_mm: 10 });
    expect(r.blade_width.value).toBeCloseTo(1.0, 1);
  });

  it("material_waste > 0 and < bar_diameter (kerf cannot exceed the bar)", () => {
    const r: PartingResult = partingGroovingEngine.parting({ bar_diameter_mm: 40 });
    expect(r.material_waste.value).toBeGreaterThan(0);
    expect(r.material_waste.value).toBeLessThan(40);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7b. parting_grooving_calculate (grooving branch)
//     → partingGroovingEngine.groove()  (groove_width_mm present in params)
// ─────────────────────────────────────────────────────────────────────────────
describe("parting_grooving_calculate (grooving branch) → partingGroovingEngine.groove()", () => {
  it("groove() exists on singleton (regression-lock: groove branch must resolve)", () => {
    expect(methodExists(partingGroovingEngine, "groove")).toBe(true);
  });

  it("returns typed GrooveResult with all required fields for 6×4mm groove", () => {
    const input: GrooveInput = {
      workpiece_diameter_mm: 50,
      groove_width_mm: 6,
      groove_depth_mm: 4,
      material_iso_group: "P",
    };
    const r: GrooveResult = partingGroovingEngine.groove(input);
    expect(r.num_plunges.value).toBeGreaterThanOrEqual(1);
    expect(r.cutting_speed.value).toBeGreaterThan(0);
    expect(r.feed_rate.value).toBeGreaterThan(0);
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
    expect(typeof r.peck_recommended).toBe("boolean");
    expect(Array.isArray(r.warnings)).toBe(true);
  });

  it("groove_width > tool_width → num_plunges > 1 (multi-plunge required)", () => {
    const r: GrooveResult = partingGroovingEngine.groove({
      workpiece_diameter_mm: 40,
      groove_width_mm: 12,
      groove_depth_mm: 3,
      tool_width_mm: 3,
    });
    expect(r.num_plunges.value).toBeGreaterThan(1);
  });

  it("deep groove (depth >> width) triggers peck_recommended=true", () => {
    const r: GrooveResult = partingGroovingEngine.groove({
      workpiece_diameter_mm: 40,
      groove_width_mm: 3,
      groove_depth_mm: 9, // 3× width — deep relative to width
      material_iso_group: "P",
    });
    expect(r.peck_recommended).toBe(true);
  });

  it("N-group RPM > P-group RPM for same groove dimensions (higher Vc)", () => {
    const base: GrooveInput = { workpiece_diameter_mm: 40, groove_width_mm: 4, groove_depth_mm: 3 };
    const rP = partingGroovingEngine.groove({ ...base, material_iso_group: "P" });
    const rN = partingGroovingEngine.groove({ ...base, material_iso_group: "N" });
    expect(rN.spindle_rpm.value).toBeGreaterThan(rP.spindle_rpm.value);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. ramping_calculate → rampingEngine.linearRamp()
// ─────────────────────────────────────────────────────────────────────────────
describe("ramping_calculate → rampingEngine.linearRamp()", () => {
  it("linearRamp() exists; .calculate() does NOT exist (regression-lock)", () => {
    expect(methodExists(rampingEngine, "linearRamp")).toBe(true);
    expect(methodExists(rampingEngine, "calculate")).toBe(false);
  });

  it("ramp_angle in (0, 10] deg for 4-flute tool (max=8 per engine table)", () => {
    const input: LinearRampInput = { tool_diameter_mm: 12, num_flutes: 4, target_depth_mm: 20, material_iso_group: "P" };
    const r: LinearRampResult = rampingEngine.linearRamp(input);
    expect(r.ramp_angle.value).toBeGreaterThan(0);
    expect(r.ramp_angle.value).toBeLessThanOrEqual(8);
    expect(r.ramp_angle.unit).toBe("deg");
    expect(r.ramp_length.value).toBeGreaterThan(0);
    expect(r.ramp_feed.value).toBeGreaterThan(0);
    expect(r.normal_feed.value).toBeGreaterThan(0);
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
    expect(Array.isArray(r.warnings)).toBe(true);
  });

  it("ramp_feed < normal_feed (center-cutting condition mandates feed reduction)", () => {
    const r: LinearRampResult = rampingEngine.linearRamp({
      tool_diameter_mm: 10,
      num_flutes: 4,
      target_depth_mm: 15,
      material_iso_group: "P",
    });
    expect(r.ramp_feed.value).toBeLessThan(r.normal_feed.value);
  });

  it("ramp_length ≈ depth / tan(angle_rad) ±10% (trigonometric identity)", () => {
    const r: LinearRampResult = rampingEngine.linearRamp({
      tool_diameter_mm: 10,
      num_flutes: 4,
      target_depth_mm: 10,
    });
    const angleRad = (r.ramp_angle.value * Math.PI) / 180;
    const geometricLength = 10 / Math.tan(angleRad);
    expect(r.ramp_length.value).toBeGreaterThan(geometricLength * 0.90);
    expect(r.ramp_length.value).toBeLessThan(geometricLength * 1.15);
  });

  it("ramp_length monotone increasing with depth (deeper = longer ramp)", () => {
    const base: LinearRampInput = { tool_diameter_mm: 10, num_flutes: 4, target_depth_mm: 0 };
    const r10 = rampingEngine.linearRamp({ ...base, target_depth_mm: 10 });
    const r20 = rampingEngine.linearRamp({ ...base, target_depth_mm: 20 });
    const r30 = rampingEngine.linearRamp({ ...base, target_depth_mm: 30 });
    expect(r20.ramp_length.value).toBeGreaterThan(r10.ramp_length.value);
    expect(r30.ramp_length.value).toBeGreaterThan(r20.ramp_length.value);
  });

  it("2-flute max angle (3deg) < 4-flute max angle (8deg) — engine table invariant", () => {
    const r2 = rampingEngine.linearRamp({ tool_diameter_mm: 10, num_flutes: 2, target_depth_mm: 15 });
    const r4 = rampingEngine.linearRamp({ tool_diameter_mm: 10, num_flutes: 4, target_depth_mm: 15 });
    expect(r2.ramp_angle.value).toBeLessThanOrEqual(3);
    expect(r4.ramp_angle.value).toBeGreaterThanOrEqual(r2.ramp_angle.value);
    expect(r4.ramp_angle.value).toBeLessThanOrEqual(8);
  });

  it("warns when slot_width < tool_diameter (no linear room to ramp)", () => {
    const r: LinearRampResult = rampingEngine.linearRamp({
      tool_diameter_mm: 12,
      num_flutes: 4,
      target_depth_mm: 10,
      slot_width_mm: 10, // narrower than 12mm tool
    });
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});
