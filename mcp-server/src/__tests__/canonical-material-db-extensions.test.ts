/**
 * Tests for CANONICAL_MATERIAL_DB extensions added in LATHE-MASTER U-LTH04b:
 * - Johnson-Cook flow stress parameters (jc_A, jc_B, jc_n, jc_C, jc_m)
 * - Chip formation physics (friction_coefficient, work_hardening_n)
 * - AISI_ALIAS map for AISI designation lookups
 */
import { describe, it, expect } from "vitest";
import {
  CANONICAL_MATERIAL_DB,
  AISI_ALIAS,
  type ISOGroup,
} from "../physics/constants.js";

describe("AISI_ALIAS lookup correctness", () => {
  it("maps all ISO P low-carbon steels to steel", () => {
    expect(AISI_ALIAS["1018"]).toBe("steel");
    expect(AISI_ALIAS["1020"]).toBe("steel");
    expect(AISI_ALIAS["1045"]).toBe("steel");
    expect(AISI_ALIAS["12L14"]).toBe("steel");
  });

  it("maps all ISO P alloy steels to alloy_steel", () => {
    expect(AISI_ALIAS["4130"]).toBe("alloy_steel");
    expect(AISI_ALIAS["4140"]).toBe("alloy_steel");
    expect(AISI_ALIAS["4340"]).toBe("alloy_steel");
    expect(AISI_ALIAS["8620"]).toBe("alloy_steel");
    expect(AISI_ALIAS["9310"]).toBe("alloy_steel");
  });

  it("maps tool steels to tool_steel", () => {
    expect(AISI_ALIAS["D2"]).toBe("tool_steel");
    expect(AISI_ALIAS["H13"]).toBe("tool_steel");
    expect(AISI_ALIAS["A2"]).toBe("tool_steel");
    expect(AISI_ALIAS["M2"]).toBe("tool_steel");
    expect(AISI_ALIAS["S7"]).toBe("tool_steel");
    expect(AISI_ALIAS["O1"]).toBe("tool_steel");
  });

  it("maps stainless steels correctly", () => {
    expect(AISI_ALIAS["304"]).toBe("stainless_304");
    expect(AISI_ALIAS["304L"]).toBe("stainless_304");
    expect(AISI_ALIAS["316"]).toBe("stainless_316");
    expect(AISI_ALIAS["316L"]).toBe("stainless_316");
    expect(AISI_ALIAS["17-4PH"]).toBe("stainless_17_4ph");
    expect(AISI_ALIAS["17-4"]).toBe("stainless_17_4ph");
    expect(AISI_ALIAS["15-5PH"]).toBe("stainless_17_4ph");
  });

  it("maps aluminum alloys correctly", () => {
    expect(AISI_ALIAS["6061"]).toBe("aluminum_6061");
    expect(AISI_ALIAS["6061-T6"]).toBe("aluminum_6061");
    expect(AISI_ALIAS["7075"]).toBe("aluminum_7075");
    expect(AISI_ALIAS["7075-T6"]).toBe("aluminum_7075");
  });

  it("maps superalloys correctly", () => {
    expect(AISI_ALIAS["Ti-6Al-4V"]).toBe("titanium_gr5");
    expect(AISI_ALIAS["Ti64"]).toBe("titanium_gr5");
    expect(AISI_ALIAS["IN718"]).toBe("inconel_718");
    expect(AISI_ALIAS["Inconel718"]).toBe("inconel_718");
  });

  it("all AISI_ALIAS values are valid CANONICAL_MATERIAL_DB keys", () => {
    const canonicalKeys = Object.keys(CANONICAL_MATERIAL_DB);
    for (const [aisi, canonical] of Object.entries(AISI_ALIAS)) {
      expect(canonicalKeys).toContain(canonical);
    }
  });

  it("AISI_ALIAS lookup returns correct ISO group", () => {
    // P group (steels)
    expect(CANONICAL_MATERIAL_DB[AISI_ALIAS["1045"]].iso_group).toBe("P");
    expect(CANONICAL_MATERIAL_DB[AISI_ALIAS["4140"]].iso_group).toBe("P");

    // M group (stainless)
    expect(CANONICAL_MATERIAL_DB[AISI_ALIAS["304"]].iso_group).toBe("M");
    expect(CANONICAL_MATERIAL_DB[AISI_ALIAS["17-4PH"]].iso_group).toBe("M");

    // H group (tool steel)
    expect(CANONICAL_MATERIAL_DB[AISI_ALIAS["D2"]].iso_group).toBe("H");

    // N group (aluminum)
    expect(CANONICAL_MATERIAL_DB[AISI_ALIAS["6061"]].iso_group).toBe("N");

    // S group (superalloys)
    expect(CANONICAL_MATERIAL_DB[AISI_ALIAS["Ti-6Al-4V"]].iso_group).toBe("S");
    expect(CANONICAL_MATERIAL_DB[AISI_ALIAS["IN718"]].iso_group).toBe("S");
  });
});

describe("Johnson-Cook parameters populated for all ISO groups", () => {
  const isoGroupMaterials: Record<ISOGroup, string[]> = {
    P: ["steel", "alloy_steel"],
    M: ["stainless_304", "stainless_316", "stainless_17_4ph"],
    K: ["cast_iron", "ductile_iron"],
    N: ["aluminum_6061", "aluminum_7075", "brass"],
    S: ["titanium_gr5", "inconel_718"],
    H: ["tool_steel", "hardened_steel"],
  };

  for (const [isoGroup, materials] of Object.entries(isoGroupMaterials)) {
    describe(`ISO ${isoGroup} materials`, () => {
      for (const materialKey of materials) {
        it(`${materialKey} has Johnson-Cook parameters`, () => {
          const mat = CANONICAL_MATERIAL_DB[materialKey];
          expect(mat).toBeDefined();
          expect(mat.jc_A).toBeGreaterThan(0);
          expect(mat.jc_B).toBeGreaterThan(0);
          expect(mat.jc_n).toBeGreaterThan(0);
          expect(mat.jc_C).toBeGreaterThan(0);
          expect(mat.jc_m).toBeGreaterThan(0);
        });

        it(`${materialKey} has chip formation physics`, () => {
          const mat = CANONICAL_MATERIAL_DB[materialKey];
          expect(mat.friction_coefficient).toBeGreaterThan(0);
          expect(mat.friction_coefficient).toBeLessThanOrEqual(1);
          expect(mat.work_hardening_n).toBeGreaterThan(0);
        });
      }
    });
  }
});

describe("Johnson-Cook parameter ranges are physically reasonable", () => {
  it("jc_A (yield stress) is in reasonable range [100, 2000] MPa", () => {
    for (const [key, mat] of Object.entries(CANONICAL_MATERIAL_DB)) {
      if (mat.jc_A !== undefined) {
        expect(mat.jc_A, `${key} jc_A`).toBeGreaterThanOrEqual(100);
        expect(mat.jc_A, `${key} jc_A`).toBeLessThanOrEqual(2000);
      }
    }
  });

  it("jc_B (strain hardening coefficient) is in reasonable range [100, 2000] MPa", () => {
    for (const [key, mat] of Object.entries(CANONICAL_MATERIAL_DB)) {
      if (mat.jc_B !== undefined) {
        expect(mat.jc_B, `${key} jc_B`).toBeGreaterThanOrEqual(100);
        expect(mat.jc_B, `${key} jc_B`).toBeLessThanOrEqual(2000);
      }
    }
  });

  it("jc_n (strain hardening exponent) is in range [0.01, 1.0]", () => {
    for (const [key, mat] of Object.entries(CANONICAL_MATERIAL_DB)) {
      if (mat.jc_n !== undefined) {
        expect(mat.jc_n, `${key} jc_n`).toBeGreaterThanOrEqual(0.01);
        expect(mat.jc_n, `${key} jc_n`).toBeLessThanOrEqual(1.0);
      }
    }
  });

  it("jc_C (strain-rate sensitivity) is in range [0.001, 0.1]", () => {
    for (const [key, mat] of Object.entries(CANONICAL_MATERIAL_DB)) {
      if (mat.jc_C !== undefined) {
        expect(mat.jc_C, `${key} jc_C`).toBeGreaterThanOrEqual(0.001);
        expect(mat.jc_C, `${key} jc_C`).toBeLessThanOrEqual(0.1);
      }
    }
  });

  it("jc_m (thermal softening exponent) is in range [0.5, 2.0]", () => {
    for (const [key, mat] of Object.entries(CANONICAL_MATERIAL_DB)) {
      if (mat.jc_m !== undefined) {
        expect(mat.jc_m, `${key} jc_m`).toBeGreaterThanOrEqual(0.5);
        expect(mat.jc_m, `${key} jc_m`).toBeLessThanOrEqual(2.0);
      }
    }
  });
});

describe("backward compatibility with existing kc1_1/taylor lookups", () => {
  it("all materials still have required Kienzle parameters", () => {
    for (const [key, mat] of Object.entries(CANONICAL_MATERIAL_DB)) {
      expect(mat.kc1_1, `${key} kc1_1`).toBeGreaterThan(0);
      expect(mat.mc, `${key} mc`).toBeGreaterThan(0);
    }
  });

  it("all materials still have required Taylor parameters", () => {
    for (const [key, mat] of Object.entries(CANONICAL_MATERIAL_DB)) {
      expect(mat.taylor_C, `${key} taylor_C`).toBeGreaterThan(0);
      expect(mat.taylor_n, `${key} taylor_n`).toBeGreaterThan(0);
    }
  });

  it("steel kc1_1 remains canonical value (1800)", () => {
    expect(CANONICAL_MATERIAL_DB.steel.kc1_1).toBe(1800);
  });

  it("alloy_steel kc1_1 remains canonical value (2100)", () => {
    expect(CANONICAL_MATERIAL_DB.alloy_steel.kc1_1).toBe(2100);
  });
});

describe("17-4PH stainless steel entry (new in U-LTH04b)", () => {
  it("exists in CANONICAL_MATERIAL_DB", () => {
    expect(CANONICAL_MATERIAL_DB.stainless_17_4ph).toBeDefined();
  });

  it("has correct ISO group M", () => {
    expect(CANONICAL_MATERIAL_DB.stainless_17_4ph.iso_group).toBe("M");
  });

  it("has higher kc1_1 than 304/316 (precipitation hardened)", () => {
    expect(CANONICAL_MATERIAL_DB.stainless_17_4ph.kc1_1).toBeGreaterThan(
      CANONICAL_MATERIAL_DB.stainless_304.kc1_1
    );
    expect(CANONICAL_MATERIAL_DB.stainless_17_4ph.kc1_1).toBeGreaterThan(
      CANONICAL_MATERIAL_DB.stainless_316.kc1_1
    );
  });

  it("has Johnson-Cook parameters", () => {
    const mat = CANONICAL_MATERIAL_DB.stainless_17_4ph;
    expect(mat.jc_A).toBeGreaterThan(0);
    expect(mat.jc_B).toBeGreaterThan(0);
    expect(mat.jc_n).toBeGreaterThan(0);
    expect(mat.jc_C).toBeGreaterThan(0);
    expect(mat.jc_m).toBeGreaterThan(0);
  });
});
