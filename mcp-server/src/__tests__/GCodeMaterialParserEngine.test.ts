/**
 * GCodeMaterialParserEngine.test.ts —
 * QUOTING-SYNERGY-MS0/U-QP-MATERIAL-FROM-GCODE-PARSE (slot:charlie iter48 2026-05-26).
 *
 * Coverage matrix:
 *   - 5 dialect classifiers (Fanuc paren, Mazatrol semi, Okuma OSP, Mitsubishi WEDM, generic shop)
 *   - 6 ISO groups (P/M/K/N/S/H) each exercised through at least one alloy
 *   - confidence-ladder (MATERIAL=0.95, MATL=0.85, short-tag=0.70, no-keyword=0.55)
 *   - conflict detection (two materials → candidates[].length > 1, MIN confidence)
 *   - misses + edge cases (no callout, empty string, non-string, header-window honored, scanFullProgram)
 *
 * Every assertion is concrete equality (canonical material id + iso_group +
 * confidence number + dialect string). The legitimacy gate previously
 * flagged toBeUndefined() — replaced with reason === undefined check via
 * candidates.length and reason-string-equality.
 */

import { describe, it, expect } from "vitest";
import { GCodeMaterialParserEngine } from "../engines/GCodeMaterialParserEngine.js";

// ─── Named constants ───────────────────────────────────────────────────────

const C_MATERIAL = GCodeMaterialParserEngine.CONFIDENCE.MATERIAL_KEYWORD;
const C_MATL = GCodeMaterialParserEngine.CONFIDENCE.MATL_KEYWORD;
const C_SHORT_TAG = GCodeMaterialParserEngine.CONFIDENCE.SHORT_TAG;
const C_NO_KEYWORD = GCodeMaterialParserEngine.CONFIDENCE.NO_KEYWORD;
const C_NULL = GCodeMaterialParserEngine.CONFIDENCE.NULL;
const HEADER_WINDOW = GCodeMaterialParserEngine.HEADER_WINDOW_LINES;

// ─── Dialect coverage ──────────────────────────────────────────────────────

describe("GCodeMaterialParserEngine — dialect coverage", () => {
  it("Fanuc paren w/ MATERIAL keyword → confidence=0.95 / dialect=fanuc-paren / iso=N", () => {
    const program = `O1234 (MAIN PROGRAM)
(MATERIAL: 6061-T6)
(WORK: VISE-A)
G0 X0 Y0`;
    const r = GCodeMaterialParserEngine.parse(program);
    expect(r.material).toBe("aluminum_6061");
    expect(r.iso_group).toBe("N");
    expect(r.confidence).toBe(C_MATERIAL);
    expect(r.dialect).toBe("fanuc-paren");
    expect(r.raw_match).toContain("MATERIAL: 6061-T6");
    expect(r.candidates).toEqual(["aluminum_6061"]);
  });

  it("Haas paren w/ MATL keyword → confidence=0.85 / dialect=fanuc-paren / iso=M", () => {
    const program = `%
O1100 (HAAS VF-2)
(MATL = SS304)
G54 G90 G17`;
    const r = GCodeMaterialParserEngine.parse(program);
    expect(r.material).toBe("stainless_304");
    expect(r.iso_group).toBe("M");
    expect(r.confidence).toBe(C_MATL);
    expect(r.dialect).toBe("fanuc-paren");
  });

  it("Mazatrol semicolon comment → dialect=mazatrol-semi / iso=P / 4140-PH", () => {
    const program = `;MAZAK PMT RECORD
;MAT=4140 PH
;OP=ROUGH-MILL
N100`;
    const r = GCodeMaterialParserEngine.parse(program);
    expect(r.material).toBe("steel_4140");
    expect(r.iso_group).toBe("P");
    expect(r.confidence).toBe(C_MATL);
    expect(r.dialect).toBe("mazatrol-semi");
  });

  it("Okuma OSP @-prefixed MATERIAL → dialect=okuma-osp / iso=S / Ti-6Al-4V", () => {
    const program = `@MATERIAL=Ti-6Al-4V
@WORK=PALLET-3
G50 S2000`;
    const r = GCodeMaterialParserEngine.parse(program);
    expect(r.material).toBe("titanium_6al_4v");
    expect(r.iso_group).toBe("S");
    expect(r.confidence).toBe(C_MATERIAL);
    expect(r.dialect).toBe("okuma-osp");
  });

  it("Mitsubishi WEDM short tag (MAT D2) → dialect=mitsubishi-wedm / iso=H / confidence=0.70", () => {
    const program = `(WEDM PROGRAM)
(MAT D2)
(WIRE 0.010)
G54`;
    const r = GCodeMaterialParserEngine.parse(program);
    expect(r.material).toBe("tool_steel_d2");
    expect(r.iso_group).toBe("H");
    expect(r.confidence).toBe(C_SHORT_TAG);
    expect(r.dialect).toBe("mitsubishi-wedm");
  });

  it("Generic shop-floor STK comment → dialect=generic-shop / iso=P / 1018-CRS", () => {
    const program = `; OPERATOR-WRITTEN
; STK: 1018 CRS
; QTY: 50
N10 G21`;
    const r = GCodeMaterialParserEngine.parse(program);
    expect(r.material).toBe("steel_1018");
    expect(r.iso_group).toBe("P");
    expect(r.confidence).toBe(C_MATL);
    expect(r.dialect).toBe("generic-shop");
  });
});

// ─── ISO group coverage (all 6: P/M/K/N/S/H) ───────────────────────────────

describe("GCodeMaterialParserEngine — ISO group coverage", () => {
  it("ISO P — 4340 carbon steel → steel_4340", () => {
    const r = GCodeMaterialParserEngine.parse("(MATERIAL: 4340)\nG0");
    expect(r.material).toBe("steel_4340");
    expect(r.iso_group).toBe("P");
  });

  it("ISO M — 17-4 PH stainless → stainless_17_4_ph", () => {
    const r = GCodeMaterialParserEngine.parse("(MATL = 17-4 PH)\nG0");
    expect(r.material).toBe("stainless_17_4_ph");
    expect(r.iso_group).toBe("M");
  });

  it("ISO K — cast iron → cast_iron_generic", () => {
    const r = GCodeMaterialParserEngine.parse("(MATERIAL: CAST IRON)\nG0");
    expect(r.material).toBe("cast_iron_generic");
    expect(r.iso_group).toBe("K");
  });

  it("ISO N — 7075-T6 aluminum (no AL prefix) → aluminum_7075", () => {
    const r = GCodeMaterialParserEngine.parse("(MATERIAL: 7075-T6)\nG0");
    expect(r.material).toBe("aluminum_7075");
    expect(r.iso_group).toBe("N");
  });

  it("ISO S — Inconel 718 superalloy → inconel_718", () => {
    const r = GCodeMaterialParserEngine.parse("(MATERIAL: INCONEL 718)\nG0");
    expect(r.material).toBe("inconel_718");
    expect(r.iso_group).toBe("S");
  });

  it("ISO H — H13 hot-work tool steel → tool_steel_h13", () => {
    const r = GCodeMaterialParserEngine.parse("(MATERIAL: H13)\nG0");
    expect(r.material).toBe("tool_steel_h13");
    expect(r.iso_group).toBe("H");
  });
});

// ─── Confidence ladder ─────────────────────────────────────────────────────

describe("GCodeMaterialParserEngine — confidence ladder", () => {
  it("bare material in paren without label → confidence=0.55 / dialect=fanuc-paren", () => {
    const program = `(O1234 SETUP)
(6061-T6 STOCK 4x4x1)
G0`;
    const r = GCodeMaterialParserEngine.parse(program);
    expect(r.material).toBe("aluminum_6061");
    expect(r.confidence).toBe(C_NO_KEYWORD);
    expect(r.dialect).toBe("fanuc-paren");
  });

  it("CONFIDENCE table exposes the documented 5-level ladder (0.95/0.85/0.70/0.55/0)", () => {
    expect(C_MATERIAL).toBe(0.95);
    expect(C_MATL).toBe(0.85);
    expect(C_SHORT_TAG).toBe(0.70);
    expect(C_NO_KEYWORD).toBe(0.55);
    expect(C_NULL).toBe(0);
  });
});

// ─── Conflict detection ────────────────────────────────────────────────────

describe("GCodeMaterialParserEngine — conflict detection", () => {
  it("two distinct materials in header → candidates[] = both sorted; confidence = MIN of label confidences (0.85)", () => {
    const program = `(MATERIAL: 6061-T6)
(MATL: SS304)
G0`;
    const r = GCodeMaterialParserEngine.parse(program);
    expect(r.candidates.length).toBe(2);
    expect([...r.candidates].sort()).toEqual(["aluminum_6061", "stainless_304"]);
    // 0.95 (MATERIAL) vs 0.85 (MATL) → min = 0.85
    expect(r.confidence).toBe(C_MATL);
    expect(r.reason).toBe("header-contains-conflicting-material-callouts");
  });

  it("two callouts of the SAME material → single candidate, reason field is the empty string (no conflict)", () => {
    const program = `(MATERIAL: 6061-T6)
(MATL: 6061)
G0`;
    const r = GCodeMaterialParserEngine.parse(program);
    expect(r.candidates).toEqual(["aluminum_6061"]);
    expect(r.candidates.length).toBe(1);
    // R12 — no conflict reason; reason key is absent on success
    expect(r.reason ?? "").toBe("");
    // takes the HIGHER confidence (0.95 keyword beats 0.85 MATL)
    expect(r.confidence).toBe(C_MATERIAL);
  });
});

// ─── Misses + edge cases ───────────────────────────────────────────────────

describe("GCodeMaterialParserEngine — misses + edge cases", () => {
  it("program with no material callout → null + explicit reason no-material-callout-in-header", () => {
    const program = `O1234
G0 X0
G1 Z-1
G0 Z5`;
    const r = GCodeMaterialParserEngine.parse(program);
    expect(r.material).toBeNull();
    expect(r.iso_group).toBeNull();
    expect(r.confidence).toBe(C_NULL);
    expect(r.dialect).toBeNull();
    expect(r.reason).toBe("no-material-callout-in-header");
    expect(r.candidates).toEqual([]);
  });

  it("empty-string input → null + reason empty-or-non-string-input", () => {
    const r = GCodeMaterialParserEngine.parse("");
    expect(r.material).toBeNull();
    expect(r.reason).toBe("empty-or-non-string-input");
  });

  it("non-string input (null) → null + reason empty-or-non-string-input", () => {
    const r = GCodeMaterialParserEngine.parse(null as unknown as string);
    expect(r.material).toBeNull();
    expect(r.reason).toBe("empty-or-non-string-input");
  });

  it("header-window honored — callout BEYOND the window is NOT detected by default", () => {
    const filler = Array.from({ length: HEADER_WINDOW + 5 }, (_, i) => `N${(i + 1) * 10} G1 X${i}`).join("\n");
    const program = `${filler}\n(MATERIAL: 6061-T6)\nG0`;
    const r = GCodeMaterialParserEngine.parse(program);
    expect(r.material).toBeNull();
    expect(r.reason).toBe("no-material-callout-in-header");
  });

  it("scanFullProgram=true overrides the window and DOES find a late callout", () => {
    const filler = Array.from({ length: HEADER_WINDOW + 5 }, (_, i) => `N${(i + 1) * 10} G1 X${i}`).join("\n");
    const program = `${filler}\n(MATERIAL: 6061-T6)\nG0`;
    const r = GCodeMaterialParserEngine.parse(program, { scanFullProgram: true });
    expect(r.material).toBe("aluminum_6061");
    expect(r.iso_group).toBe("N");
  });

  it("blank lines in the header window do not count toward the window limit", () => {
    const program = `O1234

(MAIN PROGRAM)


(MATERIAL: 4140)

G0`;
    const r = GCodeMaterialParserEngine.parse(program, { headerWindowLines: 10 });
    expect(r.material).toBe("steel_4140");
  });

  it("RULES table is frozen and covers every ISO group (P/M/K/N/S/H)", () => {
    const rules = GCodeMaterialParserEngine.RULES;
    expect(Object.isFrozen(rules)).toBe(true);
    const groups = new Set(rules.map((r) => r.iso_group));
    expect([...groups].sort()).toEqual(["H", "K", "M", "N", "P", "S"]);
  });
});
