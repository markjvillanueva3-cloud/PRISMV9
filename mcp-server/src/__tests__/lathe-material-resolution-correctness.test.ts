/**
 * Lathe Wizard material-resolution correctness — D1 (4340 unreachable) + D2 (blank silent-resolve)
 * ================================================================================================
 * U-LW-MAT-RESOLUTION-FIX (whiskey, 2026-07-04). Two P1 silent-wrong defects surfaced by the
 * combinatorial-validation workflow (wf_fc960d11-c3d) exercising LatheSpeedFeedCalculatorFacadeEngine
 * across the full material input space:
 *
 *   D1 — 4340 (mainstream Ni-Cr-Mo alloy steel) was UNREACHABLE: its real per-material coefficients
 *        already lived in AISI_CUTTING_COEFFICIENTS["4340"] (kc1_1 2000 / mc 0.26, ~11% above the
 *        P-generic 1800) but no _RAW_MATERIAL_DB entry existed, so calculate({material:"4340"}) either
 *        hard-failed (no iso_group) or silently resolved to Generic ISO P and UNDER-predicted cutting
 *        force ~10% (unconservative). 6144/6144 P/M-slice combos failed to resolve. Fix = add the raw
 *        entry so the record-key enrich path pulls the AISI coefficients (same pattern as 17-4PH).
 *        Also adds Waspaloy + Ti-5553 (ISO-S, S-default kc1_1) and a GG25 alias onto gray_iron.
 *
 *   D2 — an empty / whitespace / 1-2 char material string silently resolved to AISI 304 at full
 *        0.85 confidence: the partial-name branch props.name.toLowerCase().includes(lowerMat) matched
 *        the first DB entry because "" is a substring of every name. Fix = require >=3 non-whitespace
 *        chars before substring matching, so an unspecified material falls to the fail-loud path.
 */

import { describe, it, expect } from "vitest";
import { LatheSpeedFeedCalculatorFacadeEngine, type LatheSpeedFeedInput } from "../engines/LatheSpeedFeedCalculatorFacadeEngine.js";
import { CANONICAL_MATERIAL_DB, CANONICAL_KIENZLE } from "../physics/constants.js";

const buildInput = (overrides: Partial<LatheSpeedFeedInput> = {}): LatheSpeedFeedInput => ({
  material: "4140",
  tool: { type: "turning_insert", diameter_mm: 12, nose_radius_mm: 0.8, ...overrides.tool },
  operation: { type: "roughing", coolant: "flood", ...overrides.operation },
  ...overrides,
});
const calc = (o: Partial<LatheSpeedFeedInput> = {}) => LatheSpeedFeedCalculatorFacadeEngine.calculate(buildInput(o));

describe("D1 — 4340 + Waspaloy + Ti-5553 + GG25 resolve via the record-key enrich path (not a fallback)", () => {
  it("CANONICAL_MATERIAL_DB['4340'] carries the AISI per-material override, NOT the ISO-P default", () => {
    const m = CANONICAL_MATERIAL_DB["4340"];
    expect(m).toBeDefined();
    // The whole point: kc1_1 is the AISI 4340 value 2000, strictly ABOVE the generic P 1800.
    // A fallback/iso-default would silently give 1800 and under-predict force ~10%.
    expect(m.kc1_1).toBe(2000);
    expect(m.kc1_1).toBeGreaterThan(CANONICAL_KIENZLE["P"].kc1_1); // 2000 > 1800
    expect(m.mc).toBe(0.26);
    expect(m.iso_group).toBe("P");
    // Taylor set in the raw entry so it survives the CANONICAL build raw-override (constants.ts:1508).
    expect(m.taylor_C).toBe(310);
    expect(m.taylor_n).toBe(0.23);
  });

  it("4340 now resolves through the facade WITHOUT an iso_group (was success:false before)", () => {
    const r = calc({ material: "4340" });
    expect(r.success).toBe(true);
    expect(r.material_properties.iso_group).toBe("P");
    expect(r.material_properties.kc1_1).toBe(2000); // record-key enrich reached the facade, not 1800
    expect(r.recommendation.cutting_speed_m_min).toBeGreaterThan(0);
    expect(r.recommendation.rpm).toBeGreaterThan(0);
  });

  it("4340 gives a HIGHER specific cutting force than the ISO-P fallback would (accuracy, not silent under-predict)", () => {
    // Prove the fix is not cosmetic: 4340's kc1_1 (2000) exceeds what an unknown P-fallback
    // material (custom_alloy + iso_group:P -> Generic ISO P, kc1_1 1800) resolves to.
    const four340 = calc({ material: "4340" });
    const pFallback = calc({ material: "custom_unknown_alloy", iso_group: "P" });
    expect(four340.success).toBe(true);
    expect(pFallback.success).toBe(true);
    expect(four340.material_properties.kc1_1).toBeGreaterThan(pFallback.material_properties.kc1_1);
  });

  it("Waspaloy resolves as ISO-S superalloy (S-default kc1_1 2800)", () => {
    const r = calc({ material: "Waspaloy" });
    expect(r.success).toBe(true);
    expect(r.material_properties.iso_group).toBe("S");
    expect(r.material_properties.kc1_1).toBe(CANONICAL_KIENZLE["S"].kc1_1); // 2800
  });

  it("Ti-5553 resolves as ISO-S near-beta titanium (S-default kc1_1 2800)", () => {
    const r = calc({ material: "Ti-5553" });
    expect(r.success).toBe(true);
    expect(r.material_properties.iso_group).toBe("S");
    expect(r.material_properties.kc1_1).toBe(CANONICAL_KIENZLE["S"].kc1_1);
  });

  it("GG25 (DIN gray iron) resolves via alias to the gray_iron ISO-K entry (kc1_1 1100)", () => {
    const r = calc({ material: "GG25" });
    expect(r.success).toBe(true);
    expect(r.material_properties.iso_group).toBe("K");
    expect(r.material_properties.kc1_1).toBe(CANONICAL_MATERIAL_DB["gray_iron"].kc1_1); // 1100
    // lowercase form resolves too (case-insensitive branch / alias)
    expect(calc({ material: "gg25" }).success).toBe(true);
  });
});

describe("D2 — blank / whitespace / too-short material FAILS LOUD instead of silently resolving to AISI 304", () => {
  it("empty material string -> success:false (was silent AISI 304 @ 0.85)", () => {
    const r = calc({ material: "" });
    expect(r.success).toBe(false);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("whitespace-only material string -> success:false", () => {
    expect(calc({ material: "   " }).success).toBe(false);
  });

  it("1-char and 2-char material strings -> success:false (no substring over-match)", () => {
    expect(calc({ material: "a" }).success).toBe(false);
    expect(calc({ material: "st" }).success).toBe(false); // pre-fix hit 'AISI 1045 Carbon STeel'
  });

  it("does NOT over-block: real materials + a legitimate >=3-char partial still resolve", () => {
    expect(calc({ material: "4140" }).success).toBe(true);   // exact key
    expect(calc({ material: "304" }).success).toBe(true);    // exact key (case-insensitive)
    expect(calc({ material: "Inconel 718" }).success).toBe(true);
    // a >=3-char partial name still matches (boundary: exactly 3 chars passes the guard)
    const inc = calc({ material: "inc" });
    expect(inc.success).toBe(true);
    expect(inc.material_properties.iso_group).toBe("S"); // 'inc' -> Inconel 718
  });

  it("a genuinely-unknown long string still fails loud (regression: fail-loud path intact)", () => {
    const r = calc({ material: "unobtanium_xyz_9000" });
    expect(r.success).toBe(false);
    expect(r.warnings.some(w => /not found/i.test(w))).toBe(true);
  });
});
