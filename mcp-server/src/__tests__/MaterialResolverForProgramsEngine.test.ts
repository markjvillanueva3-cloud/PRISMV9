/**
 * MS-CRITWIRE/U-CW-10
 *
 * Engine-surface contract test for MaterialResolverForProgramsEngine.resolveDesignation,
 * surfaced as prism_calc:material_resolve.
 *
 * Verifies designation -> ISO 513 group + Kienzle + Taylor resolution:
 *   - common AISI grades resolve to the correct ISO group
 *   - standard-agnostic family tokens (aluminum/stainless/titanium/inconel/cast iron) resolve
 *   - Kienzle (kc1_1, mc) and Taylor (C, n) are projected from the canonical
 *     physics/constants.ts tables — NOT inlined (the test re-derives the expected
 *     values from CANONICAL_KIENZLE / CANONICAL_TAYLOR, so it fails if the engine
 *     ever hardcodes or mis-keys the projection)
 *   - a matched designation has confidence > 0 and source "designation"
 *   - an empty or unrecognized designation returns confidence 0, source "unresolved"
 *     (honest miss-signal — R12)
 *   - resolution is case-insensitive
 *   - the hardened "H" group out-confidences the base "P" alloy when both match
 *
 * Sister to [[reference_u_cw_01_false_positive_2026_05_20]] / U-CW-02 — the MS-CRITWIRE
 * speed-feed cluster. U-CW-10 surfaces the bare-designation resolver on prism_calc
 * (the same engine already serves prism_data:box_resolve_material for program context).
 */
import { describe, it, expect } from "vitest";
import { materialResolverForProgramsEngine } from "../engines/MaterialResolverForProgramsEngine.js";
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR } from "../physics/constants.js";

describe("U-CW-10 — material_resolve / resolveDesignation surface", () => {
  describe("AISI grade resolution", () => {
    it("4140 alloy steel resolves to ISO P", () => {
      const r = materialResolverForProgramsEngine.resolveDesignation("4140");
      expect(r.iso_group).toBe("P");
      expect(r.confidence).toBeGreaterThan(0);
      expect(r.source).toBe("designation");
    });

    it("6061-T6 aluminium resolves to ISO N", () => {
      const r = materialResolverForProgramsEngine.resolveDesignation("6061-T6");
      expect(r.iso_group).toBe("N");
      expect(r.confidence).toBeGreaterThan(0);
    });

    it("304 stainless resolves to ISO M", () => {
      const r = materialResolverForProgramsEngine.resolveDesignation("304 stainless");
      expect(r.iso_group).toBe("M");
    });
  });

  describe("material-family token resolution", () => {
    it("titanium resolves to ISO S", () => {
      expect(materialResolverForProgramsEngine.resolveDesignation("titanium").iso_group).toBe("S");
    });

    it("inconel 718 resolves to ISO S", () => {
      expect(materialResolverForProgramsEngine.resolveDesignation("inconel 718").iso_group).toBe("S");
    });

    it("cast iron resolves to ISO K", () => {
      expect(materialResolverForProgramsEngine.resolveDesignation("cast iron").iso_group).toBe("K");
    });

    it("resolution is case-insensitive (ALUMINUM == aluminum)", () => {
      const upper = materialResolverForProgramsEngine.resolveDesignation("ALUMINUM");
      const lower = materialResolverForProgramsEngine.resolveDesignation("aluminum");
      expect(upper.iso_group).toBe(lower.iso_group);
      expect(upper.iso_group).toBe("N");
    });
  });

  describe("Kienzle + Taylor projection from physics/constants.ts", () => {
    it("kc1_1 and mc match CANONICAL_KIENZLE for the resolved ISO group", () => {
      const r = materialResolverForProgramsEngine.resolveDesignation("4140");
      expect(r.kc1_1).toBe(CANONICAL_KIENZLE[r.iso_group].kc1_1);
      expect(r.mc).toBe(CANONICAL_KIENZLE[r.iso_group].mc);
    });

    it("taylor_C and taylor_n match CANONICAL_TAYLOR for the resolved ISO group", () => {
      const r = materialResolverForProgramsEngine.resolveDesignation("6061");
      expect(r.taylor_C).toBe(CANONICAL_TAYLOR[r.iso_group].C);
      expect(r.taylor_n).toBe(CANONICAL_TAYLOR[r.iso_group].n);
    });

    it("each resolvable designation projects physics consistent with its ISO group", () => {
      for (const designation of ["4140", "6061", "304", "titanium", "gray iron"]) {
        const r = materialResolverForProgramsEngine.resolveDesignation(designation);
        expect(r.kc1_1).toBe(CANONICAL_KIENZLE[r.iso_group].kc1_1);
        expect(r.taylor_n).toBe(CANONICAL_TAYLOR[r.iso_group].n);
      }
    });
  });

  describe("hardened-group priority", () => {
    it("bare H13 resolves to ISO P (base alloy)", () => {
      expect(materialResolverForProgramsEngine.resolveDesignation("H13").iso_group).toBe("P");
    });

    it("H13 hardened resolves to ISO H (hardened group out-confidences base alloy)", () => {
      const r = materialResolverForProgramsEngine.resolveDesignation("H13 hardened");
      expect(r.iso_group).toBe("H");
      expect(r.kc1_1).toBe(CANONICAL_KIENZLE.H.kc1_1);
    });
  });

  describe("honest miss-signal (R12)", () => {
    it("empty designation returns confidence 0, source unresolved", () => {
      const r = materialResolverForProgramsEngine.resolveDesignation("");
      expect(r.confidence).toBe(0);
      expect(r.source).toBe("unresolved");
    });

    it("unrecognized designation returns confidence 0 and defaults to ISO P", () => {
      const r = materialResolverForProgramsEngine.resolveDesignation("ZZZ999");
      expect(r.confidence).toBe(0);
      expect(r.source).toBe("unresolved");
      expect(r.iso_group).toBe("P");
    });

    it("unresolved result still carries a usable physics shape (P-group defaults)", () => {
      const r = materialResolverForProgramsEngine.resolveDesignation("not-a-material");
      expect(r.kc1_1).toBe(CANONICAL_KIENZLE.P.kc1_1);
      expect(r.taylor_C).toBe(CANONICAL_TAYLOR.P.C);
    });

    it("a confidence-0 result is detectable so callers can branch on resolution failure", () => {
      const resolved = materialResolverForProgramsEngine.resolveDesignation("4140");
      const unresolved = materialResolverForProgramsEngine.resolveDesignation("qwerty");
      expect(resolved.confidence > 0).toBe(true);
      expect(unresolved.confidence > 0).toBe(false);
    });
  });

  describe("result completeness", () => {
    it("every result carries name, hardness, confidence and a non-empty details trail", () => {
      const r = materialResolverForProgramsEngine.resolveDesignation("304");
      expect(typeof r.name).toBe("string");
      expect(r.name.length).toBeGreaterThan(0);
      expect(r.hardness_hb).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(r.details)).toBe(true);
      expect(r.details.length).toBeGreaterThan(0);
    });
  });
});
