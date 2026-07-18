/**
 * PHYS-FIX-MS0/U-AISI-COEFF-KEY — regression oracle for the AISI per-material
 * cutting-coefficient override.
 *
 * THE BUG (fixed here): `buildMaterialPhysics` resolved the per-material override
 * via `AISI_CUTTING_COEFFICIENTS[partial.name]`, but the table is keyed by SHORT
 * code ("4140") while every _RAW_MATERIAL_DB `name` is descriptive ("AISI 4140
 * Alloy Steel"). The lookup therefore returned `undefined` for EVERY database
 * material, so the documented per-material precedence (JSDoc on buildMaterialPhysics)
 * was dead and every material silently fell back to the per-ISO CANONICAL_KIENZLE
 * default. The fix passes the DB record key (== the AISI short code) as `aisiKey`.
 *
 * These assertions FAIL on the pre-fix code (kc1_1 was the per-ISO default) and
 * PASS after the fix — a true fail-on-revert oracle, not a presence check.
 * Values are the literature-tuned coefficients in AISI_CUTTING_COEFFICIENTS
 * (Machinery's Handbook 32nd ed.; Kennametal Materials Cross-Reference 2023).
 */
import { describe, it, expect } from "vitest";
import {
  buildMaterialPhysics,
  CANONICAL_MATERIAL_DB,
  AISI_CUTTING_COEFFICIENTS,
  CANONICAL_KIENZLE,
} from "../physics/constants.js";

describe("U-AISI-COEFF-KEY — CANONICAL_MATERIAL_DB now carries tuned per-material kc1_1/mc", () => {
  it("4140 uses its tuned kc1_1=1950 / mc=0.26 (PRE-FIX: per-ISO P default 1800/0.25)", () => {
    const m = CANONICAL_MATERIAL_DB["4140"]!;
    expect(m.kc1_1).toBe(1950);
    expect(m.mc).toBe(0.26);
    // ...and it is strictly above the per-ISO P default, proving the override fired.
    expect(m.kc1_1).toBeGreaterThan(CANONICAL_KIENZLE.P.kc1_1);
  });

  it("Inconel 718 uses tuned kc1_1=3200 / mc=0.30 (PRE-FIX: per-ISO S default 2800/0.27) — the largest correction (+14%)", () => {
    const m = CANONICAL_MATERIAL_DB["Inconel 718"]!;
    expect(m.kc1_1).toBe(3200);
    expect(m.mc).toBe(0.3);
    expect(m.kc1_1).toBeGreaterThan(CANONICAL_KIENZLE.S.kc1_1);
  });

  it("A2 tool steel uses tuned kc1_1=3000 / mc=0.29 (PRE-FIX: per-ISO H default 3200/0.30 — override LOWERS it)", () => {
    const m = CANONICAL_MATERIAL_DB["A2"]!;
    expect(m.kc1_1).toBe(3000);
    expect(m.mc).toBe(0.29);
    expect(m.kc1_1).toBeLessThan(CANONICAL_KIENZLE.H.kc1_1);
  });

  it("1018 / 316 / 7075 pick up their tuned kc1_1 (the remaining changed materials)", () => {
    expect(CANONICAL_MATERIAL_DB["1018"]!.kc1_1).toBe(1700);
    expect(CANONICAL_MATERIAL_DB["316"]!.kc1_1).toBe(2150);
    expect(CANONICAL_MATERIAL_DB["7075"]!.kc1_1).toBe(750);
  });

  it("1045 is unchanged (tuned value 1800 == per-ISO P) — guards against accidental over-correction", () => {
    expect(CANONICAL_MATERIAL_DB["1045"]!.kc1_1).toBe(1800);
    expect(CANONICAL_MATERIAL_DB["1045"]!.kc1_1).toBe(CANONICAL_KIENZLE.P.kc1_1);
  });

  it("a material with NO AISI key (tungsten_carbide) still uses the per-ISO H default — fix does not over-reach", () => {
    const m = CANONICAL_MATERIAL_DB["tungsten_carbide"]!;
    // tungsten_carbide is absent from the AISI override table, so it must resolve per-ISO.
    expect(Object.keys(AISI_CUTTING_COEFFICIENTS)).not.toContain("tungsten_carbide");
    expect(m.kc1_1).toBe(CANONICAL_KIENZLE.H.kc1_1); // 3200
    expect(m.mc).toBe(CANONICAL_KIENZLE.H.mc); // 0.30
  });

  it("Taylor C/n for DB entries still come from the raw record, NOT the AISI table (entry re-overrides)", () => {
    // 4140 raw taylor_C=350; AISI_CUTTING_COEFFICIENTS["4140"].taylor_C=320.
    // The CANONICAL_MATERIAL_DB entry must keep the raw value — proving the fix
    // touched only kc1_1/mc and not the (separately-sourced) Taylor coefficients.
    expect(AISI_CUTTING_COEFFICIENTS["4140"]!.taylor_C).toBe(320);
    expect(CANONICAL_MATERIAL_DB["4140"]!.taylor_C).toBe(350);
  });
});

describe("U-AISI-COEFF-KEY — buildMaterialPhysics lookup precedence", () => {
  it("explicit aisiKey resolves the override even when name is descriptive", () => {
    const phys = buildMaterialPhysics(
      { name: "AISI 4140 Alloy Steel", iso_group: "P" },
      undefined,
      "4140",
    );
    expect(phys.kc1_1).toBe(1950);
    expect(phys.mc).toBe(0.26);
  });

  it("name-direct hit still works when the caller passes a bare short code as the name", () => {
    const phys = buildMaterialPhysics({ name: "4140", iso_group: "P" });
    expect(phys.kc1_1).toBe(1950);
  });

  it("a descriptive name with NO aisiKey correctly falls back to the per-ISO default (we did not add fragile name-parsing)", () => {
    const phys = buildMaterialPhysics({ name: "AISI 4140 Alloy Steel", iso_group: "P" });
    expect(phys.kc1_1).toBe(CANONICAL_KIENZLE.P.kc1_1); // 1800
  });

  it("an explicit partial.kc1_1 outranks the AISI override (documented precedence: partial > aisi > per-ISO)", () => {
    const phys = buildMaterialPhysics({ name: "4140", iso_group: "P", kc1_1: 1234 }, undefined, "4140");
    expect(phys.kc1_1).toBe(1234);
  });
});
