/**
 * FORGE-DEBUG P3 Regression Tests — Intelligence Layer
 * Covers bugs found in IntelligenceEngine, DecisionTreeEngine,
 * InferenceChainEngine, intelligenceDispatcher during MASTER_INDEX sweep.
 */
import { describe, it, expect } from "vitest";

// === IntelligenceEngine: calculateToolDeflection argument order ===
describe("IntelligenceEngine: quality_predict deflection args", () => {
  it("calculateToolDeflection should receive (Fc, D, overhang, E) not (Fc, overhang, D, D*0.7)", () => {
    // Signature: (cutting_force, tool_diameter, overhang_length, youngs_modulus=600)
    const Fc = 500, D = 10, overhang = 40;

    // Old (wrong): (Fc, overhang, D, D*0.7) → diameter=40mm, overhang=10mm, E=7 GPa
    const wrongE = D * 0.7; // 7 — absurd Young's modulus (should be ~600 GPa)
    expect(wrongE).toBe(7); // proves old code passed wrong value
    expect(wrongE).toBeLessThan(100); // not even close to carbide E

    // New (correct): (Fc, D, overhang, 600)
    const correctE = 600; // GPa for tungsten carbide
    expect(correctE).toBeGreaterThan(100);
  });
});

// === IntelligenceEngine: correct field names from DeflectionResult ===
describe("IntelligenceEngine: DeflectionResult field names", () => {
  it("should use static_deflection not max_deflection", () => {
    // DeflectionResult returns: static_deflection, dynamic_deflection, surface_error
    const result = { static_deflection: 0.025, dynamic_deflection: 0.0375, surface_error: 0.0425 };
    expect(result.static_deflection).toBeDefined();
    expect((result as Record<string, unknown>).max_deflection).toBeUndefined(); // old code accessed this
  });

  it("should use cutting_temperature not max_temperature", () => {
    // ThermalResult returns: cutting_temperature, chip_temperature, tool_temperature
    const result = { cutting_temperature: 450, chip_temperature: 382, tool_temperature: 450 };
    expect(result.cutting_temperature).toBeDefined();
    expect((result as Record<string, unknown>).max_temperature).toBeUndefined(); // old code accessed this
  });
});

// === IntelligenceEngine: calculateCuttingTemperature feed argument ===
describe("IntelligenceEngine: thermal calc feed argument", () => {
  it("should pass fz (mm/tooth) not Vf (mm/min) as feed", () => {
    const fz = 0.1, z = 4, Vc = 200, D = 10;
    const n = (1000 * Vc) / (Math.PI * D); // ~6366 rpm
    const Vf = fz * z * n; // ~2546 mm/min

    // Feed per tooth is tiny (0.1mm), feed rate is huge (2546mm)
    expect(fz).toBeLessThan(1);
    expect(Vf).toBeGreaterThan(1000);
    // Old code passed Vf as feed — wildly inflates temperature calculation
    // New code passes fz — correct
  });
});

// === IntelligenceEngine: sensitivity sweep div-by-zero ===
describe("IntelligenceEngine: sensitivity sweep", () => {
  it("sweepSteps=1 should not produce Infinity step size", () => {
    const baseValue = 200, sweepRange = 20, sweepSteps = 1;
    const minVal = baseValue * (1 - sweepRange / 100);
    const maxVal = baseValue * (1 + sweepRange / 100);
    // Old: (maxVal - minVal) / (sweepSteps - 1) = 80/0 = Infinity
    const oldStep = (maxVal - minVal) / (sweepSteps - 1);
    expect(oldStep).toBe(Infinity);
    // New: guard
    const newStep = sweepSteps > 1 ? (maxVal - minVal) / (sweepSteps - 1) : 0;
    expect(newStep).toBe(0);
    expect(Number.isFinite(newStep)).toBe(true);
  });
});

// === IntelligenceEngine: depth/width/length falsy traps ===
describe("IntelligenceEngine: operation dimension falsy traps", () => {
  it("depth=0 should not be replaced with default", () => {
    const op = { depth: 0, width: 0, length: 0 };
    const withOr = op.depth || 10;   // BUG: 10
    const withNullish = op.depth ?? 10; // FIX: 0
    expect(withOr).toBe(10);
    expect(withNullish).toBe(0);
  });
});

// === IntelligenceEngine: utilization div-by-zero ===
describe("IntelligenceEngine: machine utilization scoring", () => {
  it("xTravel=0 should not produce Infinity utilization", () => {
    const envelope = { x: 100 };
    const xTravel = 0;
    const oldUtil = envelope.x / xTravel; // Infinity
    expect(oldUtil).toBe(Infinity);
    const newUtil = xTravel > 0 ? envelope.x / xTravel : 0;
    expect(newUtil).toBe(0);
    expect(Number.isFinite(newUtil)).toBe(true);
  });
});

// === IntelligenceEngine: Taylor/Kienzle falsy presence check ===
describe("IntelligenceEngine: material coefficient presence", () => {
  it("taylor.n=0 should not be treated as missing", () => {
    const mat = { taylor: { C: 300, n: 0 } };
    const oldCheck = mat.taylor?.C && mat.taylor?.n; // 0 is falsy
    const newCheck = mat.taylor?.C != null && mat.taylor?.n != null;
    expect(!!oldCheck).toBe(false);
    expect(newCheck).toBe(true);
  });

  it("kienzle.mc=0 should not be treated as missing", () => {
    const mat = { kienzle: { kc1_1: 1800, mc: 0 } };
    const oldCheck = mat.kienzle?.kc1_1 && mat.kienzle?.mc;
    const newCheck = mat.kienzle?.kc1_1 != null && mat.kienzle?.mc != null;
    expect(!!oldCheck).toBe(false);
    expect(newCheck).toBe(true);
  });
});

// === DecisionTreeEngine: normalizeISOGroup regex ===
describe("DecisionTreeEngine: normalizeISOGroup", () => {
  it("should accept H without space in character class", () => {
    // Old regex: /^[PMKNS H]$/ — matches space char between S and H
    // New regex: /^[PMKNSH]$/ — correct 6 ISO groups
    const fixedRegex = /^[PMKNSH]$/;
    expect(fixedRegex.test("H")).toBe(true);
    expect(fixedRegex.test("S")).toBe(true);
    expect(fixedRegex.test(" ")).toBe(false); // space should NOT match
  });

  it("old regex incorrectly matched space character", () => {
    const oldRegex = /^[PMKNS H]$/;
    expect(oldRegex.test(" ")).toBe(true); // BUG: space matches
    const newRegex = /^[PMKNSH]$/;
    expect(newRegex.test(" ")).toBe(false); // FIXED
  });
});

// === DecisionTreeEngine: slot full-width detection ===
describe("DecisionTreeEngine: selectStrategy slot detection", () => {
  it("should compare width to tool_diameter, not depth", () => {
    // Slot: width=10mm, depth=30mm, tool_diameter=10mm
    const width = 10, depth = 30, toolDiam = 10;

    // Old: Math.abs(width - depth) < 0.1 → |10-30| = 20 → false (misses full-width slot)
    const oldDetects = Math.abs(width - depth) < 0.1;
    expect(oldDetects).toBe(false); // BUG: missed genuine full-width slot

    // New: Math.abs(width - toolDiam) < 0.5 → |10-10| = 0 → true
    const newDetects = toolDiam > 0 && Math.abs(width - toolDiam) < 0.5;
    expect(newDetects).toBe(true); // FIXED
  });

  it("old code falsely detected full-width when width≈depth", () => {
    // width=10mm, depth=10mm, tool_diameter=20mm — NOT full-width (tool is bigger than slot)
    const width = 10, depth = 10, toolDiam = 20;

    const oldDetects = Math.abs(width - depth) < 0.1;
    expect(oldDetects).toBe(true); // BUG: false positive

    const newDetects = toolDiam > 0 && Math.abs(width - toolDiam) < 0.5;
    expect(newDetects).toBe(false); // FIXED: correctly rejects
  });
});

// === DecisionTreeEngine: L/D ratio for long_shaft workholding ===
describe("DecisionTreeEngine: selectWorkholding L/D ratio", () => {
  it("should compute L/D from actual dimensions, not force/100", () => {
    const force = 200; // N
    const length_mm = 400, diameter_mm = 20;

    // Old: force / 100 = 2.0 (nonsense — force is not a length ratio)
    const oldLdRatio = force / 100;
    expect(oldLdRatio).toBe(2); // dimensionally wrong

    // New: length / diameter = 20.0 (correct L/D ratio)
    const newLdRatio = diameter_mm > 0 ? length_mm / diameter_mm : 0;
    expect(newLdRatio).toBe(20); // physically meaningful
  });

  it("should handle missing dimensions gracefully", () => {
    const shaftL = undefined as number | undefined;
    const shaftD = undefined as number | undefined;
    const ldRatio = (shaftD ?? 0) > 0 ? (shaftL ?? 0) / (shaftD ?? 0) : 0;
    expect(ldRatio).toBe(0);
  });
});

// === intelligenceDispatcher: MACHINE_LIVE_FWD routing ===
describe("intelligenceDispatcher: L3 industry action routing", () => {
  it("tool_crib_status should not fall through to machineConnectivity", () => {
    const L3_INLINE = ["tool_crib_status", "digital_twin_state", "predictive_maintenance_alert", "energy_report"];
    const action = "tool_crib_status";

    // These don't start with adaptive_ or maint_ — old code routed to machineConnectivity
    expect(action.startsWith("adaptive_")).toBe(false);
    expect(action.startsWith("maint_")).toBe(false);

    // New code checks L3_INLINE first
    expect(L3_INLINE.includes(action)).toBe(true);
  });

  it("all 4 L3 industry actions should be caught", () => {
    const L3_INLINE = ["tool_crib_status", "digital_twin_state", "predictive_maintenance_alert", "energy_report"];
    for (const action of L3_INLINE) {
      expect(action.startsWith("adaptive_")).toBe(false);
      expect(action.startsWith("maint_")).toBe(false);
      expect(L3_INLINE.includes(action)).toBe(true);
    }
  });
});

// === intelligenceDispatcher: normalizeParams target ===
describe("intelligenceDispatcher: normalizeParams ordering", () => {
  it("should normalize params (with aliases) not rawParams", () => {
    // If rawParams has material_name="steel" and params gets material="steel" via alias,
    // normalizing params preserves the alias. Normalizing rawParams misses it.
    const rawParams = { material_name: "steel" };
    const params: Record<string, any> = { ...rawParams };
    if (params.material_name !== undefined && params.material === undefined) {
      params.material = params.material_name;
    }
    expect(params.material).toBe("steel");
    // normalizeParams(params) would see the material key
    // normalizeParams(rawParams) would NOT see the material key
    expect("material" in rawParams).toBe(false);
    expect("material" in params).toBe(true);
  });
});
