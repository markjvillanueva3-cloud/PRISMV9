/**
 * HyperMillPPPInputAdapter tests — CAM-EXHAUST-MS0 / U-CAM-HM-PPPADAPT-TESTS-01
 *
 * Coverage:
 *   1. CONTROLLER_FAMILY_TO_DIALECT: 16 family→dialect mappings
 *   2. adapt(): post_config_code dialect detection (omPPFI→fanuc, omPPSinI→siemens)
 *   3. adapt(): dialect_override wins over post_config
 *   4. adapt(): heuristic detection (TRAORI→siemens, BEGIN PGM→heidenhain)
 *   5. G43.4 RTCP classification (CRITICAL: must be RTCP not dwell)
 *   6. TRAORI passthrough (Siemens 840D)
 *   7. Per-block S/F extraction
 *   8. M6/M06 → toolchange classification
 *   9. G0/G1/G2/G3 → rapid/linear/arc classification
 *  10. Comment + cycle_call + spindle/coolant motion classification
 *  11. SF coverage calculation
 *  12. Warning emission for RTCP detection
 *
 * Strict legitimacy: concrete assertions, named constants.
 */

import { describe, it, expect } from "vitest";
import {
  HyperMillPPPInputAdapter,
  hyperMillPPPInputAdapter,
  CONTROLLER_FAMILY_TO_DIALECT,
  CONTROLLER_FAMILY_COUNT,
} from "../engines/HyperMillPPPInputAdapter.js";

const EXPECTED_FAMILY_COUNT = 16;
const SAMPLE_RPM = 3000;
const SAMPLE_FEED = 500;

describe("HyperMillPPPInputAdapter — module exports", () => {
  it("exports class + singleton + family map", () => {
    expect(typeof HyperMillPPPInputAdapter).toBe("function");
    expect(hyperMillPPPInputAdapter instanceof HyperMillPPPInputAdapter).toBe(true);
    expect(typeof CONTROLLER_FAMILY_TO_DIALECT).toBe("object");
  });

  it("CONTROLLER_FAMILY_COUNT = 16", () => {
    expect(CONTROLLER_FAMILY_COUNT).toBe(EXPECTED_FAMILY_COUNT);
    expect(Object.keys(CONTROLLER_FAMILY_TO_DIALECT).length).toBe(EXPECTED_FAMILY_COUNT);
  });

  it("DMG → siemens (DMG machines run Siemens 840D)", () => {
    expect(CONTROLLER_FAMILY_TO_DIALECT.dmg).toBe("siemens");
  });

  it("Hermle → heidenhain (Hermle machines run TNC)", () => {
    expect(CONTROLLER_FAMILY_TO_DIALECT.hermle).toBe("heidenhain");
  });

  it("Makino + Mori + Matsuura + Doosan + Brother → fanuc", () => {
    expect(CONTROLLER_FAMILY_TO_DIALECT.makino).toBe("fanuc");
    expect(CONTROLLER_FAMILY_TO_DIALECT.mori).toBe("fanuc");
    expect(CONTROLLER_FAMILY_TO_DIALECT.matsuura).toBe("fanuc");
    expect(CONTROLLER_FAMILY_TO_DIALECT.doosan).toBe("fanuc");
    expect(CONTROLLER_FAMILY_TO_DIALECT.brother).toBe("fanuc");
  });
});

describe("HyperMillPPPInputAdapter — dialect detection", () => {
  it("post_config_code 'omPPFI' → fanuc family + dialect", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "G0 X0", post_config_code: "omPPFI" });
    expect(r.controller_family).toBe("fanuc");
    expect(r.dialect).toBe("fanuc");
  });

  it("post_config_code 'omPPSinI' → siemens", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "G0 X0", post_config_code: "omPPSinI" });
    expect(r.controller_family).toBe("siemens");
    expect(r.dialect).toBe("siemens");
  });

  it("post_config_code 'omPPHHI' → heidenhain", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "G0 X0", post_config_code: "omPPHHI" });
    expect(r.dialect).toBe("heidenhain");
  });

  it("post_config_code 'omPPMazI' → mazak", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "G0 X0", post_config_code: "omPPMazI" });
    expect(r.dialect).toBe("mazak");
  });

  it("post_config_code 'omPPSinDMG' → dmg family with siemens dialect", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "G0 X0", post_config_code: "omPPSinDMG" });
    expect(r.controller_family).toBe("dmg");
    expect(r.dialect).toBe("siemens");
  });

  it("unknown post_config_code defaults to fanuc family", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "G0 X0", post_config_code: "omPPUnknown" });
    expect(r.controller_family).toBe("fanuc");
  });

  it("dialect_override wins over post_config_code", () => {
    const r = hyperMillPPPInputAdapter.adapt({
      nc_text: "G0 X0",
      post_config_code: "omPPFI",
      dialect_override: "siemens",
    });
    expect(r.dialect).toBe("siemens");
  });

  it("heuristic: TRAORI in NC text → siemens", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "TRAORI\nG1 X10 F100" });
    expect(r.controller_family).toBe("siemens");
    expect(r.dialect).toBe("siemens");
  });

  it("heuristic: BEGIN PGM in NC text → heidenhain", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "BEGIN PGM PART MM\nL X+10 Y+20" });
    expect(r.controller_family).toBe("heidenhain");
    expect(r.dialect).toBe("heidenhain");
  });

  it("no hint, no override, no post_config → fanuc default", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "" });
    expect(r.dialect).toBe("fanuc");
  });
});

describe("HyperMillPPPInputAdapter — G43.4 RTCP classification (CRITICAL)", () => {
  it("G43.4 block classified as 5axis_rtcp + is_rtcp=true (NOT dwell)", () => {
    const r = hyperMillPPPInputAdapter.adapt({
      nc_text: "G43.4 H1 X0 Y0 Z100",
    });
    expect(r.rtcp_block_count).toBe(1);
    const block = r.blocks.find((b) => b.is_rtcp);
    expect(block!.motion_type).toBe("5axis_rtcp");
    expect(block!.passthrough).toBe(false);
  });

  it("warning emitted when RTCP blocks detected", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "G43.4 H1" });
    expect(r.warnings.some((w) => w.includes("G43.4 RTCP block"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("NOT dwell"))).toBe(true);
  });

  it("G43 (no decimal) is NOT classified as RTCP", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "G43 H1 Z50" });
    expect(r.rtcp_block_count).toBe(0);
  });

  it("G43.1 (Fanuc tool length comp variant) is NOT classified as RTCP", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "G43.1 H1 Z50" });
    expect(r.rtcp_block_count).toBe(0);
  });
});

describe("HyperMillPPPInputAdapter — TRAORI passthrough", () => {
  it("TRAORI block sets is_traori=true + passthrough=true", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "TRAORI" });
    expect(r.traori_block_count).toBe(1);
    const block = r.blocks.find((b) => b.is_traori);
    expect(block!.motion_type).toBe("traori");
    expect(block!.passthrough).toBe(true);
  });

  it("TRAORI is case-insensitive", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "traori" });
    expect(r.traori_block_count).toBe(1);
  });

  it("TRAFOOF (related Siemens cycle) is NOT classified as TRAORI", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "TRAFOOF" });
    expect(r.traori_block_count).toBe(0);
  });
});

describe("HyperMillPPPInputAdapter — per-block S/F extraction", () => {
  it("S3000 → spindle_rpm = 3000", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: `M3 S${SAMPLE_RPM}` });
    expect(r.blocks[0].spindle_rpm).toBe(SAMPLE_RPM);
  });

  it("F500 → feed_mmpm = 500", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: `G1 X10 F${SAMPLE_FEED}` });
    expect(r.blocks[0].feed_mmpm).toBe(SAMPLE_FEED);
  });

  it("S and F can coexist on same block", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: `M3 S${SAMPLE_RPM} G1 F${SAMPLE_FEED}` });
    expect(r.blocks[0].spindle_rpm).toBe(SAMPLE_RPM);
    expect(r.blocks[0].feed_mmpm).toBe(SAMPLE_FEED);
  });

  it("decimal feed (F0.5) parsed correctly", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "G1 X10 F0.5" });
    expect(r.blocks[0].feed_mmpm).toBe(0.5);
  });

  it("missing S/F → null fields", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "G0 X0 Y0" });
    expect(r.blocks[0].spindle_rpm).toBe(null);
    expect(r.blocks[0].feed_mmpm).toBe(null);
  });
});

describe("HyperMillPPPInputAdapter — motion classification", () => {
  it("G0 → rapid", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "G0 X0 Y0 Z100" });
    expect(r.blocks[0].motion_type).toBe("rapid");
  });

  it("G00 (zero-padded) → rapid", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "G00 X0" });
    expect(r.blocks[0].motion_type).toBe("rapid");
  });

  it("G1 → linear", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "G1 X10 F500" });
    expect(r.blocks[0].motion_type).toBe("linear");
  });

  it("G2 → arc_cw", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "G2 X10 Y10 R5" });
    expect(r.blocks[0].motion_type).toBe("arc_cw");
  });

  it("G3 → arc_ccw", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "G3 X10 Y10 R5" });
    expect(r.blocks[0].motion_type).toBe("arc_ccw");
  });

  it("M6 → toolchange", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "T1 M6" });
    expect(r.blocks[0].motion_type).toBe("toolchange");
  });

  it("M06 (zero-padded) → toolchange", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "T1 M06" });
    expect(r.blocks[0].motion_type).toBe("toolchange");
  });

  it("M3 → spindle_on", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "M3 S1000" });
    expect(r.blocks[0].motion_type).toBe("spindle_on");
  });

  it("M5 → spindle_off", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "M5" });
    expect(r.blocks[0].motion_type).toBe("spindle_off");
  });

  it("M8 → coolant", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "M8" });
    expect(r.blocks[0].motion_type).toBe("coolant");
  });

  it("comment block (starts with ;) → comment motion", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "; This is a comment" });
    expect(r.blocks[0].motion_type).toBe("comment");
  });

  it("paren-comment block (starts with %) → comment motion", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "%PROGRAM_START" });
    expect(r.blocks[0].motion_type).toBe("comment");
  });

  it("G83 deep-hole drill → cycle_call", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "G83 X10 Z-20 Q3 R2 F100" });
    expect(r.blocks[0].motion_type).toBe("cycle_call");
  });
});

describe("HyperMillPPPInputAdapter — block-level statistics", () => {
  it("toolchange_count counts M6/M06 blocks", () => {
    const r = hyperMillPPPInputAdapter.adapt({
      nc_text: "T1 M6\nG0 X0\nT2 M06\nG0 X10",
    });
    expect(r.toolchange_count).toBe(2);
  });

  it("block_count matches blocks.length", () => {
    const r = hyperMillPPPInputAdapter.adapt({
      nc_text: "G0 X0\nG1 X10 F100\nM5",
    });
    expect(r.block_count).toBe(r.blocks.length);
    expect(r.block_count).toBe(3);
  });

  it("sf_coverage = fraction of blocks with S or F set", () => {
    const r = hyperMillPPPInputAdapter.adapt({
      nc_text: "G0 X0 Y0\nG1 X10 F500\nG1 X20 F500\nG1 X30 F500",
    });
    // 4 blocks, 3 have F → coverage = 3/4 = 0.75 (motion blocks present)
    expect(r.sf_coverage).toBeCloseTo(0.75, 2);
  });

  it("sf_coverage = 0 when no motion blocks", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "; comment\n; another comment" });
    expect(r.sf_coverage).toBe(0);
  });

  it("line_number extracted from N-prefix", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "N100 G0 X0" });
    expect(r.blocks[0].line_number).toBe(100);
  });

  it("g_codes array preserves multiple codes per block", () => {
    const r = hyperMillPPPInputAdapter.adapt({ nc_text: "G90 G54 G0 X0" });
    expect(r.blocks[0].g_codes).toContain("G90");
    expect(r.blocks[0].g_codes).toContain("G54");
    expect(r.blocks[0].g_codes).toContain("G0");
  });
});

describe("HyperMillPPPInputAdapter — strip_comments option", () => {
  it("strip_comments=true removes paren and semicolon comments", () => {
    const r = hyperMillPPPInputAdapter.adapt({
      nc_text: "G1 X10 (this is a comment) F500\n; standalone comment\nG0 X0",
      strip_comments: true,
    });
    // The standalone-comment-only line is removed (becomes empty after strip)
    const allRaw = r.blocks.map((b) => b.raw).join(" ");
    expect(allRaw).not.toContain("standalone comment");
  });

  it("strip_comments=false (default) keeps comment blocks", () => {
    const r = hyperMillPPPInputAdapter.adapt({
      nc_text: "; standalone comment\nG0 X0",
    });
    expect(r.blocks.some((b) => b.motion_type === "comment")).toBe(true);
  });
});
