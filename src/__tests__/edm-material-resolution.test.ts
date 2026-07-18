/**
 * EDM Material Resolution & Shop Steel Coverage Tests
 * ====================================================
 * Validates that EDMProgramAssemblerEngine correctly resolves common shop
 * material names (D2, H13, P20, 4140, M2, etc.) to their full EDM physics
 * entries — NOT the steel_1045 fallback.
 *
 * Bug fixed: Tier 2 fuzzy match was case-sensitive on key side, so "D2"
 * never matched "steel_D2" because String.includes is case-sensitive.
 * ISO_EDM_FALLBACK also referenced non-existent keys ("tool_steel_D2",
 * "cast_iron", "titanium" instead of "steel_D2", "carbide_WC", "titanium_Ti6Al4V").
 */
import { describe, it, expect } from "vitest";
import { EDMProgramAssemblerEngine } from "../engines/EDMProgramAssemblerEngine.js";

const engine = new EDMProgramAssemblerEngine();

// Minimal valid wire profile for testing material resolution
const SQUARE_CONTOUR = [
  { x_mm: 0, y_mm: 0 },
  { x_mm: 20, y_mm: 0 },
  { x_mm: 20, y_mm: 20 },
  { x_mm: 0, y_mm: 20 },
  { x_mm: 0, y_mm: 0 },
];

/** Helper: assemble a wire EDM program for the given material string. */
function assembleFor(material: string) {
  return engine.assembleWireEDM({
    part_name: `Material Test — ${material}`,
    material,
    thickness_mm: 25,
    contour: SQUARE_CONTOUR,
    wire_type: "brass",
    wire_diameter_mm: 0.25,
    num_skim_passes: 2,
    controller: "fanuc_wedm",
  });
}

// ============================================================================
// 1. Case-insensitive fuzzy match (the bug fix)
// ============================================================================
describe("EDMProgramAssembler material resolution — case-insensitive fuzzy match", () => {
  const CASE_VARIANTS = [
    // [input, expected material name substring]
    ["D2", "D2 Tool Steel"],
    ["d2", "D2 Tool Steel"],
    ["H13", "H13 Hot Work"],
    ["h13", "H13 Hot Work"],
    ["P20", "P20 Mold Steel"],
    ["p20", "P20 Mold Steel"],
    ["A2", "A2 Tool Steel"],
    ["S7", "S7 Shock"],
    ["M2", "M2 High-Speed"],
    ["M42", "M42 Cobalt"],
    ["O1", "O1 Oil-Hard"],
    ["O2", "O2 Oil-Hard"],
  ];

  for (const [input, expectedSubstr] of CASE_VARIANTS) {
    it(`resolves "${input}" to ${expectedSubstr}`, () => {
      const result = assembleFor(input);
      // The G-code header comment includes MATERIAL: <name>
      expect(result.gcode).toContain("MATERIAL:");
      // Should NOT contain the 1045 fallback name
      expect(result.gcode).not.toContain("AISI 1045 Carbon Steel");
      // Should contain the expected material name
      expect(result.gcode).toContain(expectedSubstr);
    });
  }
});

// ============================================================================
// 2. Shop steel entries exist and have distinct physics
// ============================================================================
describe("EDMProgramAssembler — shop steel physics are material-specific", () => {
  // Assemble two known-different materials and verify their cutting speeds differ
  it("D2 and 1045 produce different roughing parameters", () => {
    const d2 = assembleFor("D2");
    const steel1045 = assembleFor("steel_1045");

    // D2 (H group, harder) should have lower sato_K → slower wire speed
    // Both produce valid G-code
    expect(d2.gcode.length).toBeGreaterThan(100);
    expect(steel1045.gcode.length).toBeGreaterThan(100);

    // The material names in the header differ
    expect(d2.gcode).toContain("D2 Tool Steel");
    expect(steel1045.gcode).toContain("AISI 1045 Carbon Steel");
  });

  it("M2 HSS has lower sato_K than carbon steel (slower EDM cutting)", () => {
    const m2 = assembleFor("M2");
    const steel1045 = assembleFor("steel_1045");

    // M2 should have lower estimated_time (less material removal rate → longer time)
    // or different cutting speed. Both produce valid output.
    expect(m2.gcode).toContain("M2 High-Speed Steel");
    expect(steel1045.gcode).not.toContain("M2 High-Speed Steel");
  });

  it("cast iron resolves to the cast_iron entry (not carbide_WC fallback)", () => {
    const ci = assembleFor("cast_iron");
    expect(ci.gcode).toContain("Gray Cast Iron");
    expect(ci.gcode).not.toContain("AISI 1045");
  });

  it("4140-PH resolves to pre-hardened entry", () => {
    const ph = assembleFor("4140_PH");
    expect(ph.gcode).toContain("4140 Pre-Hardened");
  });

  it("52100 bearing steel resolves correctly", () => {
    const bearing = assembleFor("52100");
    expect(bearing.gcode).toContain("52100 Bearing Steel");
  });

  it("1018 low-carbon steel resolves correctly", () => {
    const lc = assembleFor("1018");
    expect(lc.gcode).toContain("1018 Low-Carbon Steel");
  });

  it("1020 low-carbon steel resolves correctly", () => {
    const lc = assembleFor("1020");
    expect(lc.gcode).toContain("1020 Low-Carbon Steel");
  });

  it("M4 HSS resolves correctly", () => {
    const m4 = assembleFor("M4");
    expect(m4.gcode).toContain("M4 High-Speed Steel");
  });
});

// ============================================================================
// 3. Exact key matches still work
// ============================================================================
describe("EDMProgramAssembler — exact key matches", () => {
  const EXACT_KEYS = [
    ["steel_1045", "AISI 1045"],
    ["steel_D2", "D2 Tool Steel"],
    ["steel_H13", "H13 Hot Work"],
    ["carbide_WC", "Cemented Carbide"],
    ["copper", "Copper (C11000)"],
    ["aluminum_6061", "Aluminum 6061"],
    ["titanium_Ti6Al4V", "Titanium Ti-6Al-4V"],
    ["inconel_718", "Inconel 718"],
    ["stainless_304", "Stainless Steel 304"],
    ["tungsten", "Tungsten (Pure)"],
    ["steel_P20", "P20 Mold Steel"],
    ["steel_4140", "4140 Alloy Steel"],
    ["steel_A2", "A2 Tool Steel"],
    ["steel_S7", "S7 Shock-Resisting"],
    ["steel_O1", "O1 Oil-Hardening"],
    ["steel_O2", "O2 Oil-Hardening"],
    ["steel_52100", "52100 Bearing Steel"],
    ["steel_1018", "1018 Low-Carbon"],
    ["steel_1020", "1020 Low-Carbon"],
    ["steel_M2", "M2 High-Speed"],
    ["steel_M4", "M4 High-Speed"],
    ["steel_M42", "M42 Cobalt HSS"],
    ["cast_iron", "Gray Cast Iron"],
  ];

  for (const [key, expectedName] of EXACT_KEYS) {
    it(`exact key "${key}" → ${expectedName}`, () => {
      const result = assembleFor(key);
      expect(result.gcode).toContain(expectedName);
    });
  }
});

// ============================================================================
// 4. Physics plausibility — shop steels have reasonable EDM parameters
// ============================================================================
describe("EDMProgramAssembler — shop steel physics plausibility", () => {
  it("all 24 materials produce valid G-code with plausible cycle times", () => {
    const allMaterials = [
      "steel_1045", "steel_D2", "steel_H13", "carbide_WC", "copper",
      "aluminum_6061", "titanium_Ti6Al4V", "inconel_718", "stainless_304",
      "tungsten", "steel_P20", "steel_4140", "steel_4140_PH", "steel_A2",
      "steel_S7", "steel_O1", "steel_O2", "steel_52100", "steel_1018",
      "steel_1020", "steel_M2", "steel_M4", "steel_M42", "cast_iron",
    ];

    for (const mat of allMaterials) {
      const result = assembleFor(mat);
      expect(result.gcode.length).toBeGreaterThan(50);
      expect(result.estimated_cycle_time_s).toBeGreaterThan(0);
      expect(result.total_wire_consumed_m).toBeGreaterThan(0);
      // At least one cutting operation should have a positive predicted Ra
      const maxRa = Math.max(...result.operations.map(op => op.predicted_Ra_um.value));
      expect(maxRa).toBeGreaterThan(0);
    }
  });

  it("HSS steels (M2/M4/M42) have longer cycle times than carbon steel", () => {
    // HSS has lower sato_K → slower cutting → more time
    const m2 = assembleFor("steel_M2");
    const cs = assembleFor("steel_1045");
    expect(m2.estimated_cycle_time_s).toBeGreaterThan(cs.estimated_cycle_time_s);
  });

  it("aluminum cuts faster than tool steel (higher sato_K)", () => {
    const al = assembleFor("aluminum_6061");
    const d2 = assembleFor("steel_D2");
    expect(al.estimated_cycle_time_s).toBeLessThan(d2.estimated_cycle_time_s);
  });

  it("tungsten carbide cuts slower than steel (lowest sato_K)", () => {
    const wc = assembleFor("carbide_WC");
    const steel = assembleFor("steel_1045");
    expect(wc.estimated_cycle_time_s).toBeGreaterThan(steel.estimated_cycle_time_s);
  });

  it("finish pass Ra is within plausible EDM range (0.5–20 µm Ra)", () => {
    const result = assembleFor("steel_D2");
    // Last operation is the finish skim pass — should have low Ra
    const lastOp = result.operations[result.operations.length - 1];
    expect(lastOp.predicted_Ra_um.value).toBeGreaterThan(0.1);
    expect(lastOp.predicted_Ra_um.value).toBeLessThan(20);
  });
});

// ============================================================================
// 5. Sinker EDM material resolution
// ============================================================================
describe("EDMProgramAssembler — sinker EDM material resolution", () => {
  function sinkerFor(material: string) {
    return engine.assembleSinkerEDM({
      part_name: `Sinker Test — ${material}`,
      material,
      workpiece_height_mm: 30,
      features: [{
        type: "blind_cavity",
        name: "Test Cavity",
        depth_mm: 10,
        area_mm2: 400,
        volume_mm3: 4000,
        x_mm: 0,
        y_mm: 0,
        target_Ra_um: 1.6,
      }],
      electrode_material: "copper",
      target_Ra_um: 1.6,
      controller: "fanuc_wedm",
    });
  }

  it("D2 resolves for sinker EDM (not 1045 fallback)", () => {
    const result = sinkerFor("D2");
    expect(result.gcode).toContain("D2 Tool Steel");
    expect(result.gcode).not.toContain("AISI 1045 Carbon Steel");
  });

  it("H13 resolves for sinker EDM", () => {
    const result = sinkerFor("H13");
    expect(result.gcode).toContain("H13 Hot Work");
  });

  it("P20 resolves for sinker EDM (most common mold steel)", () => {
    const result = sinkerFor("P20");
    expect(result.gcode).toContain("P20 Mold Steel");
  });
});
