/**
 * WEDM E-Pack Code Generator Tests — U-W100-11
 *
 * Validates E-pack code generation against real Mitsubishi programs:
 *   - ITW SHAKEPROOF: D2 tool steel, 25.4mm, 4-pass → E1221-E1224
 *   - NOZE TEST: stainless, 250mm, 5-pass → E2821-E2825
 *
 * E-pack format: E{material_group:1-7}{thickness_code:0-9}{condition:1-5}{pass:1-9}
 *
 * @module wedm-epack-generator.test
 */
import { describe, it, expect } from "vitest";

const {
  generateEPackCode,
  decodeEPackCode,
  resolveEPackMaterialGroup,
  resolveEPackThicknessCode,
  resolveEPackConditionCode,
} = await import("../engines/WEDMPrintToProgramEngine.js");

// ============================================================================
// SUITE 1: Real Program E-Pack Code Reproduction
// ============================================================================
describe("Real program E-pack reproduction", () => {

  it("ITW SHAKEPROOF: D2 25.4mm → E1221, E1222, E1223, E1224", () => {
    // D2 tool steel, 25.4mm (1 inch), standard condition, 4 passes
    for (let pass = 1; pass <= 4; pass++) {
      const code = generateEPackCode("D2", 25.4, pass);
      expect(code).toBe(`E122${pass}`);
    }
  });

  it("NOZE TEST: stainless 250mm → E2821, E2822, E2823, E2824, E2825", () => {
    // Stainless steel, 250mm, standard condition, 5 passes
    for (let pass = 1; pass <= 5; pass++) {
      const code = generateEPackCode("stainless 316", 250, pass);
      expect(code).toBe(`E282${pass}`);
    }
  });

  it("ITW SHAKEPROOF codes are sequential (last digit increments)", () => {
    const codes = [1, 2, 3, 4].map(p => generateEPackCode("D2", 25.4, p));
    expect(codes).toEqual(["E1221", "E1222", "E1223", "E1224"]);
  });

  it("NOZE TEST codes are sequential (last digit increments)", () => {
    const codes = [1, 2, 3, 4, 5].map(p => generateEPackCode("stainless 316", 250, p));
    expect(codes).toEqual(["E2821", "E2822", "E2823", "E2824", "E2825"]);
  });
});

// ============================================================================
// SUITE 2: Material Group Resolution
// ============================================================================
describe("Material group resolution", () => {

  const materialTests: [string, number][] = [
    // Group 1: Steel
    ["steel", 1],
    ["D2", 1],
    ["H13", 1],
    ["A2", 1],
    ["O1", 1],
    ["4140", 1],
    ["1018", 1],
    ["S7", 1],
    ["tool steel", 1],
    ["carbon steel", 1],
    // Group 2: Stainless
    ["stainless", 2],
    ["304", 2],
    ["316", 2],
    ["17-4", 2],
    ["stainless 304", 2],
    // Group 3: Aluminum
    ["aluminum", 3],
    ["6061", 3],
    ["6061-T6", 3],
    ["7075", 3],
    ["2024", 3],
    // Group 4: Copper
    ["copper", 4],
    ["brass", 4],
    ["beryllium copper", 4],
    ["C110", 4],
    // Group 5: Carbide
    ["tungsten carbide", 5],
    ["carbide", 5],
    // Group 6: Titanium
    ["titanium", 6],
    ["Ti-6Al-4V", 6],
    ["ti6al4v", 6],
    // Group 7: Superalloy
    ["inconel", 7],
    ["Inconel 718", 7],
    ["hastelloy", 7],
  ];

  for (const [material, expectedGroup] of materialTests) {
    it(`${material} → group ${expectedGroup}`, () => {
      expect(resolveEPackMaterialGroup(material)).toBe(expectedGroup);
    });
  }

  it("unknown material defaults to group 1 (steel)", () => {
    expect(resolveEPackMaterialGroup("unobtainium")).toBe(1);
    expect(resolveEPackMaterialGroup("mystery metal")).toBe(1);
  });
});

// ============================================================================
// SUITE 3: Thickness Code Resolution
// ============================================================================
describe("Thickness code resolution", () => {

  // Ranges: [0,5)→0, [5,12)→1, [12,30)→2, [30,50)→3, [50,75)→4,
  //         [75,100)→5, [100,150)→6, [150,200)→7, [200,300)→8, [300+)→9
  const thicknessTests: [number, number][] = [
    [1, 0],       // micro parts
    [3, 0],       // thin foil
    [5, 1],       // 5mm → starts range 1
    [10, 1],      // thin
    [12, 2],      // standard range starts
    [25, 2],      // typical die
    [25.4, 2],    // 1 inch — ITW SHAKEPROOF
    [29, 2],      // just below 30
    [30, 3],      // medium starts
    [49, 3],      // just below 50
    [50, 4],      // thick starts (50mm boundary)
    [74, 4],      // just below 75
    [75, 5],      // heavy starts
    [80, 5],      // heavy
    [100, 6],     // large mold starts (100mm boundary)
    [150, 7],     // extra heavy starts (150mm boundary)
    [200, 8],     // special starts (200mm boundary)
    [250, 8],     // special — NOZE TEST
    [300, 9],     // maximum capacity starts (300mm boundary)
    [400, 9],     // maximum capacity
    [500, 9],     // extreme
  ];

  for (const [thickness, expectedCode] of thicknessTests) {
    it(`${thickness}mm → code ${expectedCode}`, () => {
      expect(resolveEPackThicknessCode(thickness)).toBe(expectedCode);
    });
  }

  it("monotonically increasing codes with increasing thickness", () => {
    const thicknesses = [1, 5, 12, 30, 50, 75, 100, 150, 200, 300];
    const codes = thicknesses.map(t => resolveEPackThicknessCode(t));
    for (let i = 1; i < codes.length; i++) {
      expect(codes[i]).toBeGreaterThanOrEqual(codes[i - 1]);
    }
  });
});

// ============================================================================
// SUITE 4: Condition Code Resolution
// ============================================================================
describe("Condition code resolution", () => {

  it("high speed (Ra > 3.2) → condition 1", () => {
    expect(resolveEPackConditionCode(4.0)).toBe(1);
    expect(resolveEPackConditionCode(6.0)).toBe(1);
  });

  it("standard — wide range covers Ra 0.4–3.2 (calibrated to ITW SHAKEPROOF E1221, Ra 0.8µm target)", () => {
    // Real shop data: D2 at 25.4mm with Ra 0.8µm target uses E1221 (condition 2, standard).
    // Condition 2 covers the full production die range — NOT narrowed to 1.6-3.2 as originally assumed.
    expect(resolveEPackConditionCode(3.2)).toBe(2);   // top of range
    expect(resolveEPackConditionCode(2.0)).toBe(2);   // mid
    expect(resolveEPackConditionCode(1.6)).toBe(2);   // previously called "fine" — re-mapped to standard
    expect(resolveEPackConditionCode(1.0)).toBe(2);   // typical die finish
    expect(resolveEPackConditionCode(0.8)).toBe(2);   // ITW SHAKEPROOF calibration point
    expect(resolveEPackConditionCode(0.5)).toBe(2);   // near bottom of standard range
  });

  it("fine (0.2 < Ra ≤ 0.4) → condition 3", () => {
    // Calibrated boundaries: fine finish is a very narrow Ra band below standard production
    expect(resolveEPackConditionCode(0.4)).toBe(3);   // top of fine range (≤ 0.4, not > 0.4)
    expect(resolveEPackConditionCode(0.3)).toBe(3);
  });

  it("extra fine (0.1 < Ra ≤ 0.2) → condition 4", () => {
    // Extra fine: mirror/precision optical quality
    expect(resolveEPackConditionCode(0.2)).toBe(4);   // top of extra-fine range
    expect(resolveEPackConditionCode(0.15)).toBe(4);
  });

  it("ultra fine (0.05 < Ra ≤ 0.1) → condition 5", () => {
    expect(resolveEPackConditionCode(0.1)).toBe(5);
    expect(resolveEPackConditionCode(0.06)).toBe(5);
  });

  it("precision fine (0.025 < Ra ≤ 0.05) → condition 6", () => {
    expect(resolveEPackConditionCode(0.05)).toBe(6);
    expect(resolveEPackConditionCode(0.03)).toBe(6);
  });

  it("mirror (0.012 < Ra ≤ 0.025) → condition 7", () => {
    expect(resolveEPackConditionCode(0.025)).toBe(7);
    expect(resolveEPackConditionCode(0.015)).toBe(7);
  });

  it("ultra precision (0.005 < Ra ≤ 0.012) → condition 8 (CHOCTAW DEFENSE pattern)", () => {
    // CHOCTAW DEFENSE cannelure program uses E1281 (condition 8)
    expect(resolveEPackConditionCode(0.012)).toBe(8);
    expect(resolveEPackConditionCode(0.008)).toBe(8);
  });

  it("optical quality (Ra ≤ 0.005) → condition 9", () => {
    expect(resolveEPackConditionCode(0.005)).toBe(9);
    expect(resolveEPackConditionCode(0.001)).toBe(9);
  });

  it("coated wire shifts condition code down by 1", () => {
    // Standard (Ra 3.2) with coated wire → high speed (condition 1)
    expect(resolveEPackConditionCode(3.2, "zinc_coated_0.25")).toBe(1);
    // Standard (Ra 1.0) with coated wire → high speed (condition 1) — whole standard band shifts to 1
    expect(resolveEPackConditionCode(1.0, "coated_0.25")).toBe(1);
  });

  it("coated wire does not go below condition 1", () => {
    expect(resolveEPackConditionCode(4.0, "coated_0.25")).toBe(1);
  });
});

// ============================================================================
// SUITE 5: E-Pack Code Decode (Round-Trip)
// ============================================================================
describe("E-pack decode — round-trip validation", () => {

  it("E1221 decodes correctly", () => {
    const decoded = decodeEPackCode("E1221");
    expect(decoded).toEqual({
      material_group: 1,
      thickness_code: 2,
      condition_code: 2,
      pass_number: 1,
    });
  });

  it("E2825 decodes correctly", () => {
    const decoded = decodeEPackCode("E2825");
    expect(decoded).toEqual({
      material_group: 2,
      thickness_code: 8,
      condition_code: 2,
      pass_number: 5,
    });
  });

  it("invalid codes return null", () => {
    expect(decodeEPackCode("E123")).toBeNull();    // too short
    expect(decodeEPackCode("E12345")).toBeNull();   // too long
    expect(decodeEPackCode("X1221")).toBeNull();    // wrong prefix
    expect(decodeEPackCode("EABCD")).toBeNull();    // non-digits
    expect(decodeEPackCode("")).toBeNull();          // empty
  });

  it("round-trip: generate then decode for ITW SHAKEPROOF", () => {
    const code = generateEPackCode("D2", 25.4, 1);
    const decoded = decodeEPackCode(code);
    expect(decoded).not.toBeNull();
    expect(decoded!.material_group).toBe(1);   // steel
    expect(decoded!.thickness_code).toBe(2);   // 12-30mm
    expect(decoded!.pass_number).toBe(1);
  });

  it("round-trip: generate then decode for all 7 material groups", () => {
    const materials = ["steel", "stainless", "aluminum", "copper", "carbide", "titanium", "inconel"];
    for (let i = 0; i < materials.length; i++) {
      const code = generateEPackCode(materials[i], 25, 1);
      const decoded = decodeEPackCode(code);
      expect(decoded).not.toBeNull();
      expect(decoded!.material_group).toBe(i + 1);
    }
  });
});

// ============================================================================
// SUITE 6: Full E-Pack Code Coverage
// ============================================================================
describe("Full E-pack code coverage", () => {

  it("all codes are valid 4-digit format E####", () => {
    const materials = ["steel", "stainless", "aluminum", "copper", "carbide", "titanium", "inconel"];
    const thicknesses = [1, 5, 12, 30, 50, 75, 100, 150, 200, 300];
    const passes = [1, 2, 3, 4, 5];

    for (const mat of materials) {
      for (const thick of thicknesses) {
        for (const pass of passes) {
          const code = generateEPackCode(mat, thick, pass);
          expect(code).toMatch(/^E\d{4}$/);
        }
      }
    }
  });

  it("pass number is always the last digit", () => {
    for (let pass = 1; pass <= 5; pass++) {
      const code = generateEPackCode("steel", 25, pass);
      expect(code.slice(-1)).toBe(String(pass));
    }
  });

  it("different materials produce different first digits", () => {
    const codes = ["steel", "stainless", "aluminum"].map(
      m => generateEPackCode(m, 25, 1)[1]
    );
    // All unique
    expect(new Set(codes).size).toBe(3);
  });

  it("different thicknesses produce different second digits", () => {
    const codes = [5, 25, 75, 200].map(
      t => generateEPackCode("steel", t, 1)[2]
    );
    // All unique
    expect(new Set(codes).size).toBe(4);
  });
});
