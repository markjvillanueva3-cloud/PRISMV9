import { describe, it, expect } from "vitest";
import {
  wedmTemplateExtractorEngine,
  classifyECodeFamily,
  parseProgram,
  buildTemplateSet,
  selectTemplate,
  type ExtractedProgram,
} from "./WEDMTemplateExtractorEngine.js";

/**
 * Test coverage for U-WCTP-TEMPLATE — WEDMTemplateExtractorEngine.
 *
 * Comprehensive-build-enforce coverage:
 *   - Happy path                — JM Die ITW SHAKEPROOF + NOZE TEST mini-programs round-trip
 *   - 3 failure modes           — bad input (empty), boundary (no E-codes), resource (no XY)
 *   - 2 adversarial inputs      — garbage text, oversize 5000-line program
 *   - 3+ variability configs    — 4-pass standard / 5-pass heavy / 5-pass UV taper / acu 7-pass / E952 thin
 *
 * Mini-programs below are derived from the canonical JM Die ground-truth
 * tables (per [[tip-wedm-jmd-ground-truth-001..005]]) — every expected E-code,
 * H-offset, feed rate, and M-code sequence is from a real production program.
 */

const ITW_SHAKEPROOF_MINI = `
( ITW SHAKEPROOF 500-30540-24000-04 03/07/22 )
G92 X0 Y0
M91 M20 M78 M78 M80 M82 M84 M90
H175 = 0.0000
H1 = 0.0085
H2 = 0.0064
H3 = 0.0058
H4 = 0.0053
G1 F0.12 X0.5 Y0.5 ( pass 1 rough )
E1221
G1 F0.24 X0.4 Y0.4 ( pass 2 skim )
E1222
G1 F0.21 X0.3 Y0.3 ( pass 3 skim )
E1223
G1 F0.20 X0.2 Y0.2 ( pass 4 skim )
E1224
M85 M83 M81 M21 M58 M02
`;

const NOZE_TEST_MINI = `
( NOZE TEST.NC 05/24/22 )
G92 X0 Y0
M20 M78 M78 M80 M82 M84
G1 F0.16 X0.5 Y0.5 U0.1 V0.1
E2821
G1 F0.23 X0.4 Y0.4 U0.08 V0.08
E2822
G1 F0.26 X0.3 Y0.3 U0.06 V0.06
E2823
G1 F0.30 X0.2 Y0.2 U0.04 V0.04
E2824
E2825
M85 M83 M81 M21 M58 M02
`;

const FIOCCHI_MINI = `
( FIOCCHI 38 CAL CANNELURE 30TPI 07/05/16 )
G92 X0 Y0
M91 M20 M78 M78 M80 M82 M84 M90
H175 = 0.0000
H1 = 0.00995
H2 = 0.00725
H3 = 0.00585
H4 = 0.00535
H5 = 0.0052
G1 F0.06 X0.5 Y0.5
E1281
G1 F0.15 X0.4 Y0.4
E1282
G1 F0.12 X0.3 Y0.3
E1283
G1 F0.16 X0.2 Y0.2
E1284
G1 F0.13 X0.1 Y0.1
E1285
M85 M83 M81 M21 M58 M02
`;

describe("WEDMTemplateExtractorEngine — classifyECodeFamily", () => {
  it("E1221 (ITW SHAKEPROOF first pass) classifies as E12xx standard 4-pass", () => {
    expect(classifyECodeFamily("E1221")).toBe("E12xx_standard_4pass");
    expect(classifyECodeFamily("E1224")).toBe("E12xx_standard_4pass");
  });

  it("E1281-E1285 (FIOCCHI / cannelure heavy) classifies as E12xx heavy 5-pass", () => {
    expect(classifyECodeFamily("E1281")).toBe("E12xx_heavy_5pass");
    expect(classifyECodeFamily("E1285")).toBe("E12xx_heavy_5pass");
  });

  it("E2821-E2825 (NOZE TEST taper) classifies as E28xx taper 5-pass", () => {
    expect(classifyECodeFamily("E2821")).toBe("E28xx_taper_5pass");
  });

  it("E952 classifies as acu 7-pass thin", () => {
    expect(classifyECodeFamily("E952")).toBe("E952_acu_7pass_thin");
  });

  it("E5604 classifies as acu 7-pass thick (E56xx family)", () => {
    expect(classifyECodeFamily("E5604")).toBe("E56xx_acu_7pass_thick");
  });

  it("Unrecognized E-code returns 'unknown'", () => {
    expect(classifyECodeFamily("E9999")).toBe("unknown");
    expect(classifyECodeFamily(undefined)).toBe("unknown");
  });
});

describe("WEDMTemplateExtractorEngine — parseProgram (single NC)", () => {
  it("HAPPY PATH: ITW SHAKEPROOF mini parses to 4-pass standard with H-offset cascade", () => {
    const p = parseProgram(ITW_SHAKEPROOF_MINI, "ITW SHAKEPROOF.NC");
    expect(p.pass_count).toBe(4);
    expect(p.e_codes).toEqual(["E1221", "E1222", "E1223", "E1224"]);
    expect(p.e_code_family).toBe("E12xx_standard_4pass");
    expect(p.uses_h175_master).toBe(true);
    expect(p.uses_taper).toBe(false);
    expect(p.program_type).toBe("2axis_straight");
    expect(p.h_offsets.H1).toBe(0.0085);
    expect(p.h_offsets.H2).toBe(0.0064);
    expect(p.h_offsets.H3).toBe(0.0058);
    expect(p.h_offsets.H4).toBe(0.0053);
    expect(p.feed_rates_ipm).toEqual([0.12, 0.24, 0.21, 0.20]);
  });

  it("HAPPY PATH: NOZE TEST mini parses as E28xx taper 5-pass with zero H-offsets", () => {
    const p = parseProgram(NOZE_TEST_MINI, "NOZE TEST.NC");
    expect(p.e_code_family).toBe("E28xx_taper_5pass");
    expect(p.uses_taper).toBe(true);
    expect(p.uses_h175_master).toBe(false);
    expect(p.program_type).toBe("4axis_taper");
    expect(p.e_codes).toContain("E2821");
    expect(p.e_codes).toContain("E2825");
    expect(p.feed_rates_ipm[0]).toBe(0.16);
    expect(p.feed_rates_ipm[3]).toBe(0.30);
  });

  it("HAPPY PATH: FIOCCHI heavy 5-pass parses with 0.00995 first H-offset", () => {
    const p = parseProgram(FIOCCHI_MINI, "FIOCCHI.txt");
    expect(p.e_code_family).toBe("E12xx_heavy_5pass");
    expect(p.h_offsets.H1).toBe(0.00995);
    expect(p.h_offsets.H5).toBe(0.0052);
    expect(p.feed_rates_ipm[0]).toBe(0.06);
  });

  it("FAILURE: empty input produces unknown program type with zero passes", () => {
    const p = parseProgram("", "empty.NC");
    expect(p.pass_count).toBe(0);
    expect(p.e_code_family).toBe("unknown");
    expect(p.program_type).toBe("unknown");
    expect(p.e_codes).toHaveLength(0);
    expect(p.feed_rates_ipm).toHaveLength(0);
  });

  it("FAILURE: comment-only program has no E-codes and unknown family", () => {
    const p = parseProgram("( just a comment )\n( another comment )\n", "comment.NC");
    expect(p.pass_count).toBe(0);
    expect(p.e_code_family).toBe("unknown");
  });

  it("FAILURE: program with no XY coordinates omits the envelope field", () => {
    const p = parseProgram("E1221\nE1222\nM02", "no-xy.NC");
    expect(p.estimated_envelope_mm).toBe(undefined);
  });

  it("BOUNDARY: program with single E-code parses as 1-pass standard family", () => {
    const p = parseProgram("M82\nE1221\nM02", "one-pass.NC");
    expect(p.pass_count).toBe(1);
    expect(p.e_code_family).toBe("E12xx_standard_4pass");
  });

  it("ADVERSARIAL: garbage text doesn't crash, returns unknown shape", () => {
    const p = parseProgram("lorem ipsum dolor sit amet 12345\n# not a g-code\n", "garbage.txt");
    expect(p.pass_count).toBe(0);
    expect(p.e_code_family).toBe("unknown");
  });

  it("ADVERSARIAL: 5000-line program with 1 E-code parses without timeout/crash", () => {
    const big = "lorem ipsum\n".repeat(5000) + "E1221\nM02\n";
    const p = parseProgram(big, "big.NC");
    expect(p.e_codes).toEqual(["E1221"]);
    expect(p.e_code_family).toBe("E12xx_standard_4pass");
  });

  it("Customer hint is extracted from header comment when present", () => {
    const p = parseProgram(ITW_SHAKEPROOF_MINI, "ITW SHAKEPROOF.NC");
    expect(p.customer_hint).toMatch(/ITW/i);
  });

  it("XY envelope is computed from coordinate range when XY present", () => {
    const p = parseProgram(ITW_SHAKEPROOF_MINI, "ITW.NC");
    expect(p.estimated_envelope_mm?.x_span).toBeGreaterThan(0);
    expect(p.estimated_envelope_mm?.y_span).toBeGreaterThan(0);
  });
});

describe("WEDMTemplateExtractorEngine — buildTemplateSet (clustering)", () => {
  it("HAPPY PATH: 3 distinct programs cluster into 3 distinct templates", () => {
    const set = buildTemplateSet([
      parseProgram(ITW_SHAKEPROOF_MINI, "itw.NC"),
      parseProgram(NOZE_TEST_MINI, "noze.NC"),
      parseProgram(FIOCCHI_MINI, "fio.txt"),
    ]);
    expect(set.total_programs).toBe(3);
    expect(set.templates).toHaveLength(3);
    expect(set.unparseable_count).toBe(0);
  });

  it("VARIABILITY: two ITW-pattern programs cluster into 1 template with program_count=2", () => {
    const set = buildTemplateSet([
      parseProgram(ITW_SHAKEPROOF_MINI, "itw-1.NC"),
      parseProgram(ITW_SHAKEPROOF_MINI, "itw-2.NC"),
    ]);
    expect(set.templates).toHaveLength(1);
    expect(set.templates[0].program_count).toBe(2);
    expect(set.templates[0].e_code_family).toBe("E12xx_standard_4pass");
    expect(set.templates[0].example_filenames).toContain("itw-1.NC");
    expect(set.templates[0].example_filenames).toContain("itw-2.NC");
  });

  it("VARIABILITY: median feed rate cascade is correct for a 2-program cluster", () => {
    const set = buildTemplateSet([
      parseProgram(ITW_SHAKEPROOF_MINI, "itw-1.NC"),
      parseProgram(ITW_SHAKEPROOF_MINI, "itw-2.NC"),
    ]);
    expect(set.templates[0].median_feed_rates_ipm).toEqual([0.12, 0.24, 0.21, 0.20]);
  });

  it("VARIABILITY: median H-offset cascade is correct for the ITW cluster", () => {
    const set = buildTemplateSet([
      parseProgram(ITW_SHAKEPROOF_MINI, "itw-1.NC"),
      parseProgram(ITW_SHAKEPROOF_MINI, "itw-2.NC"),
    ]);
    expect(set.templates[0].median_h_offsets.H1).toBe(0.0085);
    expect(set.templates[0].median_h_offsets.H4).toBe(0.0053);
  });

  it("VARIABILITY: family distribution telemetry counts each family correctly", () => {
    const set = buildTemplateSet([
      parseProgram(ITW_SHAKEPROOF_MINI, "itw.NC"),
      parseProgram(NOZE_TEST_MINI, "noze.NC"),
      parseProgram(FIOCCHI_MINI, "fio.txt"),
      parseProgram(ITW_SHAKEPROOF_MINI, "itw-2.NC"),
    ]);
    expect(set.family_distribution.E12xx_standard_4pass).toBe(2);
    expect(set.family_distribution.E28xx_taper_5pass).toBe(1);
    expect(set.family_distribution.E12xx_heavy_5pass).toBe(1);
  });

  it("BOUNDARY: empty program list returns empty template set with zero counts", () => {
    const set = buildTemplateSet([]);
    expect(set.templates).toHaveLength(0);
    expect(set.total_programs).toBe(0);
    expect(set.unparseable_count).toBe(0);
  });

  it("BOUNDARY: unparseable programs (pass_count=0) are counted but not clustered", () => {
    const empty = parseProgram("", "empty.NC");
    const set = buildTemplateSet([
      parseProgram(ITW_SHAKEPROOF_MINI, "itw.NC"),
      empty,
    ] as ExtractedProgram[]);
    expect(set.total_programs).toBe(2);
    expect(set.unparseable_count).toBe(1);
    expect(set.templates).toHaveLength(1);
  });

  it("Templates are sorted by program_count descending (most-likely first)", () => {
    const set = buildTemplateSet([
      parseProgram(NOZE_TEST_MINI, "noze.NC"),
      parseProgram(ITW_SHAKEPROOF_MINI, "itw-1.NC"),
      parseProgram(ITW_SHAKEPROOF_MINI, "itw-2.NC"),
      parseProgram(ITW_SHAKEPROOF_MINI, "itw-3.NC"),
    ]);
    expect(set.templates[0].program_count).toBe(3);
    expect(set.templates[0].e_code_family).toBe("E12xx_standard_4pass");
    expect(set.templates[1].program_count).toBe(1);
  });
});

describe("WEDMTemplateExtractorEngine — selectTemplate (decision tree)", () => {
  const set = buildTemplateSet([
    parseProgram(ITW_SHAKEPROOF_MINI, "itw.NC"),
    parseProgram(NOZE_TEST_MINI, "noze.NC"),
    parseProgram(FIOCCHI_MINI, "fio.txt"),
  ]);

  it("HAPPY PATH: taper > 0 + stainless → E28xx taper 5-pass with confidence >= 0.9", () => {
    const sel = selectTemplate(set, { material: "stainless 304", taper_angle_deg: 5 });
    expect(sel.template?.e_code_family).toBe("E28xx_taper_5pass");
    expect(sel.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("D2 + thickness 60mm > 50mm → E12xx heavy 5-pass", () => {
    const sel = selectTemplate(set, { material: "D2 tool steel", thickness_mm: 60 });
    expect(sel.template?.e_code_family).toBe("E12xx_heavy_5pass");
  });

  it("D2 + tolerance 0.002mm < 0.005mm precision threshold → E12xx heavy 5-pass", () => {
    const sel = selectTemplate(set, { material: "D2", tolerance_mm: 0.002 });
    expect(sel.template?.e_code_family).toBe("E12xx_heavy_5pass");
  });

  it("D2 standard tolerance → E12xx standard 4-pass workhorse", () => {
    const sel = selectTemplate(set, { material: "D2 tool steel", thickness_mm: 12.7, tolerance_mm: 0.01 });
    expect(sel.template?.e_code_family).toBe("E12xx_standard_4pass");
  });

  it("No material specified, no taper → defaults to standard 4-pass workhorse", () => {
    const sel = selectTemplate(set, {});
    expect(sel.template?.e_code_family).toBe("E12xx_standard_4pass");
  });

  it("Unsupported material (titanium) → null with zero confidence", () => {
    const sel = selectTemplate(set, { material: "Ti-6Al-4V titanium", thickness_mm: 12 });
    expect(sel.template).toBeNull();
    expect(sel.confidence).toBe(0);
    expect(sel.reason).toMatch(/no JM Die-calibrated template/i);
  });

  it("Carbide + precision target with no acu families present → null with explanatory reason", () => {
    const sel = selectTemplate(set, { material: "tungsten carbide WC-Co", tolerance_mm: 0.002 });
    expect(sel.template).toBeNull();
    expect(sel.reason).toMatch(/no JM Die-calibrated/i);
  });
});

describe("WEDMTemplateExtractorEngine — engine singleton API", () => {
  it("singleton.parseProgram delegates to the pure function", () => {
    const a = wedmTemplateExtractorEngine.parseProgram(ITW_SHAKEPROOF_MINI, "x.NC");
    const b = parseProgram(ITW_SHAKEPROOF_MINI, "x.NC");
    expect(a.e_code_family).toBe(b.e_code_family);
    expect(a.pass_count).toBe(b.pass_count);
  });

  it("singleton.extractTemplates accepts {text, filename} pairs", () => {
    const set = wedmTemplateExtractorEngine.extractTemplates([
      { text: ITW_SHAKEPROOF_MINI, filename: "itw.NC" },
      { text: NOZE_TEST_MINI, filename: "noze.NC" },
    ]);
    expect(set.total_programs).toBe(2);
    expect(set.templates).toHaveLength(2);
  });

  it("singleton.selectTemplate delegates to the pure function", () => {
    const set = wedmTemplateExtractorEngine.extractTemplates([
      { text: ITW_SHAKEPROOF_MINI, filename: "itw.NC" },
    ]);
    const sel = wedmTemplateExtractorEngine.selectTemplate(set, { material: "D2", taper_angle_deg: 0 });
    expect(sel.template?.e_code_family).toBe("E12xx_standard_4pass");
  });

  it("singleton.classifyECodeFamily delegates to the pure function", () => {
    expect(wedmTemplateExtractorEngine.classifyECodeFamily("E2823")).toBe("E28xx_taper_5pass");
  });
});
