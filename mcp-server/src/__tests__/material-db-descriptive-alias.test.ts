/**
 * CANONICAL_MATERIAL_DB descriptive-name aliasing (slot:india)
 *
 * Regression coverage for a latent production bug: ~8 production engines use
 * `CANONICAL_MATERIAL_DB.steel` / `MATERIAL_DB.carbide` as safety fallbacks
 * (e.g. `resolved || CANONICAL_MATERIAL_DB.steel`), but the DB is keyed by AISI
 * SHORT codes ("1045", "tungsten_carbide") -- so the descriptive properties
 * resolved to `undefined` and the "safe" fallback silently produced `undefined`.
 *
 * Fix (constants.ts): every AISI_ALIAS name is defined as a NON-ENUMERABLE
 * pointer to the same canonical MaterialEntry. Direct/bracket access resolves,
 * while Object.keys/entries/values still enumerate ONLY the 20 canonical
 * materials. Pure reference aliasing -- zero new physics values introduced.
 *
 * Reference kc1_1 values: AISI_CUTTING_COEFFICIENTS in src/physics/constants.ts
 * (P/1045=1800, M/304=2100, K/gray_iron=1100, N/6061=700, S/Ti-6Al-4V=2800,
 *  H/D2=3200, S/Inconel 718=3200).
 */
import { describe, it, expect } from "vitest";
import { CANONICAL_MATERIAL_DB, MATERIAL_DB, AISI_ALIAS } from "../physics/constants.js";

describe("CANONICAL_MATERIAL_DB descriptive-name aliasing", () => {
  describe("happy path: descriptive keys resolve to the correct canonical entry", () => {
    it("resolves .steel to the AISI 1045 ISO-P entry (kc1_1 1800)", () => {
      expect(CANONICAL_MATERIAL_DB.steel.kc1_1).toBe(1800);
      expect(CANONICAL_MATERIAL_DB.steel.iso_group).toBe("P");
    });

    it("resolves .aluminum_6061 to the 6061 ISO-N entry (kc1_1 700)", () => {
      expect(CANONICAL_MATERIAL_DB.aluminum_6061.kc1_1).toBe(700);
      expect(CANONICAL_MATERIAL_DB.aluminum_6061.iso_group).toBe("N");
    });

    it("resolves .stainless_304 to the 304 ISO-M entry (kc1_1 2100)", () => {
      expect(CANONICAL_MATERIAL_DB.stainless_304.kc1_1).toBe(2100);
      expect(CANONICAL_MATERIAL_DB.stainless_304.iso_group).toBe("M");
    });

    it("resolves .cast_iron to the gray_iron ISO-K entry (kc1_1 1100)", () => {
      expect(CANONICAL_MATERIAL_DB.cast_iron.kc1_1).toBe(1100);
      expect(CANONICAL_MATERIAL_DB.cast_iron.iso_group).toBe("K");
    });

    it("resolves .titanium_gr5 to the Ti-6Al-4V ISO-S entry (kc1_1 2800)", () => {
      expect(CANONICAL_MATERIAL_DB.titanium_gr5.kc1_1).toBe(2800);
      expect(CANONICAL_MATERIAL_DB.titanium_gr5.iso_group).toBe("S");
    });

    it("resolves .hardened_steel to the D2 ISO-H entry (kc1_1 3200)", () => {
      expect(CANONICAL_MATERIAL_DB.hardened_steel.kc1_1).toBe(3200);
      expect(CANONICAL_MATERIAL_DB.hardened_steel.iso_group).toBe("H");
    });

    it("resolves MATERIAL_DB.carbide (CuttingThermalEngine fallback) to the WC ISO-H entry", () => {
      expect(MATERIAL_DB.carbide).toBe(CANONICAL_MATERIAL_DB["tungsten_carbide"]);
      expect(MATERIAL_DB.carbide.iso_group).toBe("H");
    });
  });

  describe("aliases are SAME-OBJECT references (no data duplication / drift)", () => {
    it(".steel === DB['1045']", () => {
      expect(CANONICAL_MATERIAL_DB.steel).toBe(CANONICAL_MATERIAL_DB["1045"]);
    });
    it(".aluminum_6061 === DB['6061']", () => {
      expect(CANONICAL_MATERIAL_DB.aluminum_6061).toBe(CANONICAL_MATERIAL_DB["6061"]);
    });
    it("EVERY AISI_ALIAS name resolves to the SAME object as its short-code target", () => {
      for (const [aliasName, targetKey] of Object.entries(AISI_ALIAS)) {
        // same object identity AND the canonical kc1_1 carries through unchanged
        expect(CANONICAL_MATERIAL_DB[aliasName], `alias ${aliasName} -> ${targetKey}`)
          .toBe(CANONICAL_MATERIAL_DB[targetKey]);
        expect(CANONICAL_MATERIAL_DB[aliasName].kc1_1, `alias ${aliasName} kc1_1`)
          .toBe(CANONICAL_MATERIAL_DB[targetKey].kc1_1);
      }
    });
  });

  describe("non-enumerable invariant: integrity of the canonical 20 is preserved", () => {
    // Count is 20: the 17 (through 17-4PH, U-LW-17-4PH-MATERIAL) plus 3 added by
    // U-LW-MAT-RESOLUTION-FIX -- "4340" (Ni-Cr-Mo alloy steel, AISI-override kc1_1 2000),
    // "Waspaloy" and "Ti-5553" (ISO-S superalloy/near-beta-Ti, S-default kc1_1 2800). Each is a
    // real material named in the combinatorial-validation slices that previously failed to
    // resolve. "GG25" was added as an AISI_ALIAS onto gray_iron (non-enumerable -> not counted).
    it("Object.keys enumerates exactly the 20 canonical materials (aliases hidden)", () => {
      expect(Object.keys(CANONICAL_MATERIAL_DB).length).toBe(20);
    });
    it("Object.values / Object.entries also see exactly 20 (no alias double-count)", () => {
      expect(Object.values(CANONICAL_MATERIAL_DB).length).toBe(20);
      expect(Object.entries(CANONICAL_MATERIAL_DB).length).toBe(20);
    });
    it("descriptive aliases are NOT enumerable (would otherwise inflate the count)", () => {
      expect(Object.keys(CANONICAL_MATERIAL_DB).includes("steel")).toBe(false);
      expect(Object.keys(CANONICAL_MATERIAL_DB).includes("aluminum_6061")).toBe(false);
      expect(Object.keys(CANONICAL_MATERIAL_DB).includes("GG25")).toBe(false);
    });
    it("the 20 canonical short-code keys remain present and enumerable", () => {
      for (const key of ["1018", "1045", "4140", "4340", "304", "316", "17-4PH", "6061", "7075",
        "Ti-6Al-4V", "Inconel 718", "Waspaloy", "Ti-5553", "D2", "A2", "tungsten_carbide",
        "gray_iron", "ductile_iron", "C11000", "C26000"]) {
        expect(Object.keys(CANONICAL_MATERIAL_DB).includes(key), `key ${key}`).toBe(true);
      }
    });
  });

  describe("production-fallback regression (the exact bug pattern)", () => {
    it("`missing ?? CANONICAL_MATERIAL_DB.steel` no longer yields undefined", () => {
      const resolved = CANONICAL_MATERIAL_DB["definitely_not_a_material"] ?? CANONICAL_MATERIAL_DB.steel;
      expect(resolved.kc1_1).toBe(1800);
    });
  });

  describe("failure modes + adversarial inputs", () => {
    it("never shadows a real material key: gray_iron stays the K-group iron", () => {
      // `cast_iron` aliases TO gray_iron; the real gray_iron entry is untouched.
      expect(CANONICAL_MATERIAL_DB["gray_iron"].kc1_1).toBe(1100);
      expect(CANONICAL_MATERIAL_DB.cast_iron).toBe(CANONICAL_MATERIAL_DB["gray_iron"]);
    });
    it("a non-aliased descriptive name is absent (no silent default)", () => {
      expect("unobtanium_xyz" in CANONICAL_MATERIAL_DB).toBe(false);
      expect("plutonium" in CANONICAL_MATERIAL_DB).toBe(false);
    });
    it("prototype-pollution safe: __proto__ / constructor were never defined as own keys", () => {
      expect(Object.prototype.hasOwnProperty.call(CANONICAL_MATERIAL_DB, "__proto__")).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(CANONICAL_MATERIAL_DB, "constructor")).toBe(false);
    });
    it("documents the canonical Inconel 718 kc1_1 = 3200 (per-material override, > ISO-S 2800)", () => {
      // SOURCE OF TRUTH: AISI_CUTTING_COEFFICIENTS["Inconel 718"] = 3200 (constants.ts).
      // The u-arch3 spec asserts 3000 -- that is a SEPARATE, pre-existing data conflict
      // (physics-domain decision, deferred to oscar); this test pins the actual constant.
      expect(CANONICAL_MATERIAL_DB.inconel_718.kc1_1).toBe(3200);
      expect(CANONICAL_MATERIAL_DB.titanium_gr5.kc1_1).toBe(2800);
    });
  });
});
