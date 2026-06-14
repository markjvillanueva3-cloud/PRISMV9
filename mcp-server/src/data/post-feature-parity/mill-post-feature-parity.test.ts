/**
 * mill-post-feature-parity.test.ts — anti-regression for the dialect parity
 * matrix. Every assertion is a concrete equality check against a published
 * dialect emission value. Change the matrix and the failing assertion names
 * the exact mismatch.
 *
 * @milestone POST-PDF-NODE-MS0/U-MILL-POST-PARITY-MATRIX
 * @slot echo
 * @iter 7
 * @date 2026-05-26
 */

import { describe, it, expect } from "vitest";
import {
  MILL_POST_FEATURE_PARITY,
  featureForDialect,
  featuresByCategory,
  gapAnalysis,
} from "./mill-post-feature-parity.js";

describe("HSM smoothing: published dialect emission", () => {
  it("Hurco V11 emits G05.3 with P-value argument (UltiMotion)", () => {
    expect(featureForDialect("HSM-SMOOTHING", "hurco")!.code).toBe("G05.3");
    expect(featureForDialect("HSM-SMOOTHING", "hurco")!.argument).toBe("P<value>");
  });

  it("Haas NGC emits G187 P<level> E<tol>", () => {
    expect(featureForDialect("HSM-SMOOTHING", "haas")!.code).toBe("G187");
    expect(featureForDialect("HSM-SMOOTHING", "haas")!.argument).toBe("P<level> E<tol>");
  });

  it("Okuma OSP emits G08 P1 (super-NURBS)", () => {
    expect(featureForDialect("HSM-SMOOTHING", "okuma")!.code).toBe("G08");
    expect(featureForDialect("HSM-SMOOTHING", "okuma")!.argument).toBe("P1");
  });

  it("Fanuc 30i emits G5.1 (no leading zero) with Q1 R<tol>", () => {
    expect(featureForDialect("HSM-SMOOTHING", "fanuc")!.code).toBe("G5.1");
    expect(featureForDialect("HSM-SMOOTHING", "fanuc")!.argument).toBe("Q1 R<tol>");
  });

  it("Mitsubishi MELDAS emits G05.1 (LEADING ZERO) with Q1 R<tol>", () => {
    expect(featureForDialect("HSM-SMOOTHING", "mitsubishi")!.code).toBe("G05.1");
    expect(featureForDialect("HSM-SMOOTHING", "mitsubishi")!.argument).toBe("Q1 R<tol>");
  });

  it("Siemens 840D emits CYCLE832 with (tol, mode, orient) tuple", () => {
    expect(featureForDialect("HSM-SMOOTHING", "siemens")!.code).toBe("CYCLE832");
    expect(featureForDialect("HSM-SMOOTHING", "siemens")!.argument).toBe("(<tol>, <mode>, <orient>)");
  });

  it("Heidenhain TNC emits M120 LA<lookahead>", () => {
    expect(featureForDialect("HSM-SMOOTHING", "heidenhain")!.code).toBe("M120");
    expect(featureForDialect("HSM-SMOOTHING", "heidenhain")!.argument).toBe("LA<lookahead>");
  });

  it("Generic dialect: notSupported=true, empty code", () => {
    expect(featureForDialect("HSM-SMOOTHING", "generic")!.notSupported).toBe(true);
    expect(featureForDialect("HSM-SMOOTHING", "generic")!.code).toBe("");
  });
});

describe("RTCP 5-axis: published dialect emission", () => {
  it("Fanuc emits G43.4 H<tool>", () => {
    expect(featureForDialect("RTCP-5AXIS", "fanuc")!.code).toBe("G43.4");
    expect(featureForDialect("RTCP-5AXIS", "fanuc")!.argument).toBe("H<tool>");
  });

  it("Mazak emits G43.4 (Fanuc-compatible)", () => {
    expect(featureForDialect("RTCP-5AXIS", "mazak")!.code).toBe("G43.4");
  });

  it("Mitsubishi emits G43.4 (Fanuc-compatible)", () => {
    expect(featureForDialect("RTCP-5AXIS", "mitsubishi")!.code).toBe("G43.4");
  });

  it("Doosan emits G43.4 (Fanuc-based)", () => {
    expect(featureForDialect("RTCP-5AXIS", "doosan")!.code).toBe("G43.4");
  });

  it("Brother emits G43.4 (Fanuc-compatible)", () => {
    expect(featureForDialect("RTCP-5AXIS", "brother")!.code).toBe("G43.4");
  });

  it("Haas NGC emits G234 (Haas-specific, NOT G43.4)", () => {
    expect(featureForDialect("RTCP-5AXIS", "haas")!.code).toBe("G234");
  });

  it("Heidenhain emits FUNCTION TCPM with verbose AXIS POS PATHCTRL AXIS args", () => {
    expect(featureForDialect("RTCP-5AXIS", "heidenhain")!.code).toBe("FUNCTION TCPM");
    expect(featureForDialect("RTCP-5AXIS", "heidenhain")!.argument).toBe("F TCP AXIS POS PATHCTRL AXIS");
  });

  it("Siemens 840D emits TRAORI(1)", () => {
    expect(featureForDialect("RTCP-5AXIS", "siemens")!.code).toBe("TRAORI");
    expect(featureForDialect("RTCP-5AXIS", "siemens")!.argument).toBe("(1)");
  });

  it("DMG MORI emits TRAORI(1)", () => {
    expect(featureForDialect("RTCP-5AXIS", "dmg_mori")!.code).toBe("TRAORI");
  });

  it("Okuma OSP emits G169 (Okuma-specific TCP)", () => {
    expect(featureForDialect("RTCP-5AXIS", "okuma")!.code).toBe("G169");
  });

  it("Hurco V11 emits G143 (Hurco-specific TCP)", () => {
    expect(featureForDialect("RTCP-5AXIS", "hurco")!.code).toBe("G143");
  });

  it("Fagor 8070 emits #RTCP ON (directive syntax)", () => {
    expect(featureForDialect("RTCP-5AXIS", "fagor")!.code).toBe("#RTCP");
    expect(featureForDialect("RTCP-5AXIS", "fagor")!.argument).toBe("ON");
  });

  it("Citizen Swiss: notSupported=true (lathe-mill only, no 5-axis surface)", () => {
    expect(featureForDialect("RTCP-5AXIS", "citizen")!.notSupported).toBe(true);
  });

  it("Generic: notSupported=true", () => {
    expect(featureForDialect("RTCP-5AXIS", "generic")!.notSupported).toBe(true);
  });
});

describe("Work-offset extended: dialect-specific syntax + ranges", () => {
  it("Hurco V11 emits G54.1 P<n> with P1-P300 range note", () => {
    expect(featureForDialect("WORK-OFFSET-EXTENDED", "hurco")!.code).toBe("G54.1");
    expect(featureForDialect("WORK-OFFSET-EXTENDED", "hurco")!.argument).toBe("P<n>");
  });

  it("Fanuc emits G54.1 P<n>", () => {
    expect(featureForDialect("WORK-OFFSET-EXTENDED", "fanuc")!.code).toBe("G54.1");
  });

  it("Haas emits G54.1 P<n>", () => {
    expect(featureForDialect("WORK-OFFSET-EXTENDED", "haas")!.code).toBe("G54.1");
  });

  it("Heidenhain emits CYCL DEF 7.0 DATUM SHIFT (different mechanism)", () => {
    expect(featureForDialect("WORK-OFFSET-EXTENDED", "heidenhain")!.code).toBe("CYCL DEF 7.0");
    expect(featureForDialect("WORK-OFFSET-EXTENDED", "heidenhain")!.argument).toBe("DATUM SHIFT");
  });

  it("Siemens emits G505 DC(<n>)", () => {
    expect(featureForDialect("WORK-OFFSET-EXTENDED", "siemens")!.code).toBe("G505");
    expect(featureForDialect("WORK-OFFSET-EXTENDED", "siemens")!.argument).toBe("DC(<n>)");
  });

  it("DMG MORI emits G505 DC(<n>)", () => {
    expect(featureForDialect("WORK-OFFSET-EXTENDED", "dmg_mori")!.code).toBe("G505");
  });

  it("Fagor 8070 emits G159 N<n>", () => {
    expect(featureForDialect("WORK-OFFSET-EXTENDED", "fagor")!.code).toBe("G159");
    expect(featureForDialect("WORK-OFFSET-EXTENDED", "fagor")!.argument).toBe("N<n>");
  });

  it("Okuma uses P<n> selector", () => {
    expect(featureForDialect("WORK-OFFSET-EXTENDED", "okuma")!.code).toBe("P");
    expect(featureForDialect("WORK-OFFSET-EXTENDED", "okuma")!.argument).toBe("<n>");
  });
});

describe("Safe-start block: Heidenhain/Siemens diverge from Fanuc-family", () => {
  it("Fanuc emits G91 G28 Z0.", () => {
    expect(featureForDialect("SAFE-START-BLOCK", "fanuc")!.code).toBe("G91 G28 Z0.");
  });

  it("Haas emits G91 G28 Z0.", () => {
    expect(featureForDialect("SAFE-START-BLOCK", "haas")!.code).toBe("G91 G28 Z0.");
  });

  it("Okuma emits G91 G28 Z0.", () => {
    expect(featureForDialect("SAFE-START-BLOCK", "okuma")!.code).toBe("G91 G28 Z0.");
  });

  it("Hurco emits G91 G28 Z0.", () => {
    expect(featureForDialect("SAFE-START-BLOCK", "hurco")!.code).toBe("G91 G28 Z0.");
  });

  it("Heidenhain emits M91 Z+0 (NOT G28 — machine-zero reference)", () => {
    expect(featureForDialect("SAFE-START-BLOCK", "heidenhain")!.code).toBe("M91 Z+0");
  });

  it("Siemens emits G75 FP=1 Z1=0 (NOT G28 — fixed-point reference)", () => {
    expect(featureForDialect("SAFE-START-BLOCK", "siemens")!.code).toBe("G75");
    expect(featureForDialect("SAFE-START-BLOCK", "siemens")!.argument).toBe("FP=1 Z1=0");
  });

  it("DMG MORI emits G75 FP=1 Z1=0", () => {
    expect(featureForDialect("SAFE-START-BLOCK", "dmg_mori")!.code).toBe("G75");
  });

  it("Fagor 8070 emits G75 Z0", () => {
    expect(featureForDialect("SAFE-START-BLOCK", "fagor")!.code).toBe("G75");
    expect(featureForDialect("SAFE-START-BLOCK", "fagor")!.argument).toBe("Z0");
  });
});

describe("Comment format: paren vs semicolon (critical divergence)", () => {
  it("Fanuc emits ( ... )", () => {
    expect(featureForDialect("COMMENT-FORMAT", "fanuc")!.code).toBe("( ... )");
  });

  it("Haas emits ( ... )", () => {
    expect(featureForDialect("COMMENT-FORMAT", "haas")!.code).toBe("( ... )");
  });

  it("Okuma emits ( ... )", () => {
    expect(featureForDialect("COMMENT-FORMAT", "okuma")!.code).toBe("( ... )");
  });

  it("Hurco emits ( ... )", () => {
    expect(featureForDialect("COMMENT-FORMAT", "hurco")!.code).toBe("( ... )");
  });

  it("Heidenhain emits ; ... (semicolon prefix)", () => {
    expect(featureForDialect("COMMENT-FORMAT", "heidenhain")!.code).toBe("; ...");
  });

  it("Siemens emits ; ...", () => {
    expect(featureForDialect("COMMENT-FORMAT", "siemens")!.code).toBe("; ...");
  });

  it("DMG MORI emits ; ...", () => {
    expect(featureForDialect("COMMENT-FORMAT", "dmg_mori")!.code).toBe("; ...");
  });
});

describe("Subprogram call: M97 vs M98 vs CALL vs GOSUB", () => {
  it("Haas emits M97 (LOCAL — different from Fanuc M98)", () => {
    expect(featureForDialect("SUBPROGRAM-CALL", "haas")!.code).toBe("M97");
    expect(featureForDialect("SUBPROGRAM-CALL", "haas")!.argument).toBe("P<n> L<count>");
  });

  it("Fanuc emits M98 P<n> L<count>", () => {
    expect(featureForDialect("SUBPROGRAM-CALL", "fanuc")!.code).toBe("M98");
    expect(featureForDialect("SUBPROGRAM-CALL", "fanuc")!.argument).toBe("P<n> L<count>");
  });

  it("Hurco emits M98 P<n>", () => {
    expect(featureForDialect("SUBPROGRAM-CALL", "hurco")!.code).toBe("M98");
  });

  it("Okuma emits CALL <name> (NOT M98)", () => {
    expect(featureForDialect("SUBPROGRAM-CALL", "okuma")!.code).toBe("CALL");
    expect(featureForDialect("SUBPROGRAM-CALL", "okuma")!.argument).toBe("<name>");
  });

  it("Siemens emits CALL <name>", () => {
    expect(featureForDialect("SUBPROGRAM-CALL", "siemens")!.code).toBe("CALL");
  });

  it("Heidenhain emits CALL LBL <n>", () => {
    expect(featureForDialect("SUBPROGRAM-CALL", "heidenhain")!.code).toBe("CALL LBL");
  });

  it("Fagor 8070 emits GOSUB <label>", () => {
    expect(featureForDialect("SUBPROGRAM-CALL", "fagor")!.code).toBe("GOSUB");
  });
});

describe("CAS Collision Avoidance: Okuma exclusive native, Heidenhain DCM equivalent", () => {
  it("Okuma emits CAS ON (the only native real-time CAS dialect)", () => {
    expect(featureForDialect("CAS-COLLISION-AVOIDANCE", "okuma")!.code).toBe("CAS ON");
  });

  it("Heidenhain emits DCM (Dynamic Collision Monitoring)", () => {
    expect(featureForDialect("CAS-COLLISION-AVOIDANCE", "heidenhain")!.code).toBe("DCM");
  });

  it("Siemens emits PROTC (Protection Zone — partial CAS)", () => {
    expect(featureForDialect("CAS-COLLISION-AVOIDANCE", "siemens")!.code).toBe("PROTC");
  });

  it("DMG MORI emits DCM (CELOS-Heidenhain inherits DCM)", () => {
    expect(featureForDialect("CAS-COLLISION-AVOIDANCE", "dmg_mori")!.code).toBe("DCM");
  });

  it("Hurco: notSupported=true", () => {
    expect(featureForDialect("CAS-COLLISION-AVOIDANCE", "hurco")!.notSupported).toBe(true);
  });

  it("Haas: notSupported=true", () => {
    expect(featureForDialect("CAS-COLLISION-AVOIDANCE", "haas")!.notSupported).toBe(true);
  });

  it("Fanuc: notSupported=true", () => {
    expect(featureForDialect("CAS-COLLISION-AVOIDANCE", "fanuc")!.notSupported).toBe(true);
  });

  it("Generic: notSupported=true", () => {
    expect(featureForDialect("CAS-COLLISION-AVOIDANCE", "generic")!.notSupported).toBe(true);
  });
});

describe("TSC through-spindle coolant: three M-code families", () => {
  it("Haas emits M88 (M89 OFF)", () => {
    expect(featureForDialect("TSC-THROUGH-SPINDLE-COOLANT", "haas")!.code).toBe("M88");
  });

  it("Okuma emits M51 (NOT M88)", () => {
    expect(featureForDialect("TSC-THROUGH-SPINDLE-COOLANT", "okuma")!.code).toBe("M51");
  });

  it("Mazak emits M51 (Okuma-compatible)", () => {
    expect(featureForDialect("TSC-THROUGH-SPINDLE-COOLANT", "mazak")!.code).toBe("M51");
  });

  it("Mitsubishi emits M51", () => {
    expect(featureForDialect("TSC-THROUGH-SPINDLE-COOLANT", "mitsubishi")!.code).toBe("M51");
  });

  it("Hurco: notSupported=true (no native TSC code)", () => {
    expect(featureForDialect("TSC-THROUGH-SPINDLE-COOLANT", "hurco")!.notSupported).toBe(true);
  });

  it("Citizen Swiss emits M8 (flood-only)", () => {
    expect(featureForDialect("TSC-THROUGH-SPINDLE-COOLANT", "citizen")!.code).toBe("M8");
  });

  it("Brother emits M88", () => {
    expect(featureForDialect("TSC-THROUGH-SPINDLE-COOLANT", "brother")!.code).toBe("M88");
  });

  it("Doosan emits M88", () => {
    expect(featureForDialect("TSC-THROUGH-SPINDLE-COOLANT", "doosan")!.code).toBe("M88");
  });
});

describe("SSV spindle-speed variation: dialect-specific", () => {
  it("Okuma emits M695 (3-20% range, ON code)", () => {
    expect(featureForDialect("SSV-SPINDLE-SPEED-VARIATION", "okuma")!.code).toBe("M695");
  });

  it("Mazak emits M695 (Okuma-compatible)", () => {
    expect(featureForDialect("SSV-SPINDLE-SPEED-VARIATION", "mazak")!.code).toBe("M695");
  });

  it("Haas emits G10 (5-15% range, G-code NOT M-code)", () => {
    expect(featureForDialect("SSV-SPINDLE-SPEED-VARIATION", "haas")!.code).toBe("G10");
  });

  it("Heidenhain emits M153", () => {
    expect(featureForDialect("SSV-SPINDLE-SPEED-VARIATION", "heidenhain")!.code).toBe("M153");
  });

  it("Siemens emits SVC (parameter, not M-code)", () => {
    expect(featureForDialect("SSV-SPINDLE-SPEED-VARIATION", "siemens")!.code).toBe("SVC");
  });

  it("Doosan emits M165 (Fanuc-OEM convention)", () => {
    expect(featureForDialect("SSV-SPINDLE-SPEED-VARIATION", "doosan")!.code).toBe("M165");
  });

  it("Hurco: notSupported=true", () => {
    expect(featureForDialect("SSV-SPINDLE-SPEED-VARIATION", "hurco")!.notSupported).toBe(true);
  });

  it("Fanuc emits M165 (OEM convention)", () => {
    expect(featureForDialect("SSV-SPINDLE-SPEED-VARIATION", "fanuc")!.code).toBe("M165");
  });
});

describe("Matrix introspection helpers", () => {
  it("featuresByCategory('hsm') returns exactly 1 feature with id HSM-SMOOTHING", () => {
    const hsm = featuresByCategory("hsm");
    expect(hsm.length).toBe(1);
    expect(hsm[0].id).toBe("HSM-SMOOTHING");
  });

  it("featuresByCategory('rtcp') returns exactly 1 feature with id RTCP-5AXIS", () => {
    const rtcp = featuresByCategory("rtcp");
    expect(rtcp.length).toBe(1);
    expect(rtcp[0].id).toBe("RTCP-5AXIS");
  });

  it("featuresByCategory('comment_format') returns COMMENT-FORMAT and required=true", () => {
    const cf = featuresByCategory("comment_format");
    expect(cf.length).toBe(1);
    expect(cf[0].id).toBe("COMMENT-FORMAT");
    expect(cf[0].required).toBe(true);
  });

  it("featuresByCategory('safe_start') returns SAFE-START-BLOCK and required=true", () => {
    const ss = featuresByCategory("safe_start");
    expect(ss.length).toBe(1);
    expect(ss[0].id).toBe("SAFE-START-BLOCK");
    expect(ss[0].required).toBe(true);
  });

  it("featuresByCategory('cas') returns CAS-COLLISION-AVOIDANCE", () => {
    const cas = featuresByCategory("cas");
    expect(cas.length).toBe(1);
    expect(cas[0].id).toBe("CAS-COLLISION-AVOIDANCE");
  });

  it("featuresByCategory('tsc') returns TSC-THROUGH-SPINDLE-COOLANT", () => {
    const tsc = featuresByCategory("tsc");
    expect(tsc.length).toBe(1);
    expect(tsc[0].id).toBe("TSC-THROUGH-SPINDLE-COOLANT");
  });

  it("featuresByCategory('ssv') returns SSV-SPINDLE-SPEED-VARIATION", () => {
    const ssv = featuresByCategory("ssv");
    expect(ssv.length).toBe(1);
    expect(ssv[0].id).toBe("SSV-SPINDLE-SPEED-VARIATION");
  });

  it("featuresByCategory('work_offset_extended') returns WORK-OFFSET-EXTENDED", () => {
    const we = featuresByCategory("work_offset_extended");
    expect(we.length).toBe(1);
    expect(we[0].id).toBe("WORK-OFFSET-EXTENDED");
  });

  it("featuresByCategory('subprogram_call') returns SUBPROGRAM-CALL", () => {
    const sc = featuresByCategory("subprogram_call");
    expect(sc.length).toBe(1);
    expect(sc[0].id).toBe("SUBPROGRAM-CALL");
  });
});

describe("Gap analysis: quantitative coverage", () => {
  it("Hurco supported list contains HSM-SMOOTHING", () => {
    const ids = gapAnalysis("hurco").supported.map(f => f.id);
    expect(ids).toContain("HSM-SMOOTHING");
  });

  it("Hurco supported list contains WORK-OFFSET-EXTENDED", () => {
    const ids = gapAnalysis("hurco").supported.map(f => f.id);
    expect(ids).toContain("WORK-OFFSET-EXTENDED");
  });

  it("Hurco notSupported list contains TSC-THROUGH-SPINDLE-COOLANT", () => {
    const ids = gapAnalysis("hurco").notSupported.map(f => f.id);
    expect(ids).toContain("TSC-THROUGH-SPINDLE-COOLANT");
  });

  it("Hurco notSupported list contains SSV-SPINDLE-SPEED-VARIATION", () => {
    const ids = gapAnalysis("hurco").notSupported.map(f => f.id);
    expect(ids).toContain("SSV-SPINDLE-SPEED-VARIATION");
  });

  it("Hurco missing-required list is empty", () => {
    expect(gapAnalysis("hurco").missing.length).toBe(0);
  });

  it("Haas supported list contains HSM-SMOOTHING", () => {
    const ids = gapAnalysis("haas").supported.map(f => f.id);
    expect(ids).toContain("HSM-SMOOTHING");
  });

  it("Haas supported list contains RTCP-5AXIS", () => {
    const ids = gapAnalysis("haas").supported.map(f => f.id);
    expect(ids).toContain("RTCP-5AXIS");
  });

  it("Haas supported list contains TSC-THROUGH-SPINDLE-COOLANT", () => {
    const ids = gapAnalysis("haas").supported.map(f => f.id);
    expect(ids).toContain("TSC-THROUGH-SPINDLE-COOLANT");
  });

  it("Haas notSupported list contains CAS-COLLISION-AVOIDANCE", () => {
    const ids = gapAnalysis("haas").notSupported.map(f => f.id);
    expect(ids).toContain("CAS-COLLISION-AVOIDANCE");
  });

  it("Haas missing-required list is empty", () => {
    expect(gapAnalysis("haas").missing.length).toBe(0);
  });

  it("Okuma supported list contains CAS-COLLISION-AVOIDANCE (only native CAS dialect)", () => {
    const ids = gapAnalysis("okuma").supported.map(f => f.id);
    expect(ids).toContain("CAS-COLLISION-AVOIDANCE");
  });

  it("Okuma supported list contains HSM-SMOOTHING (G08 P1)", () => {
    const ids = gapAnalysis("okuma").supported.map(f => f.id);
    expect(ids).toContain("HSM-SMOOTHING");
  });

  it("Okuma supported list contains SSV-SPINDLE-SPEED-VARIATION (M695)", () => {
    const ids = gapAnalysis("okuma").supported.map(f => f.id);
    expect(ids).toContain("SSV-SPINDLE-SPEED-VARIATION");
  });

  it("Okuma missing-required list is empty", () => {
    expect(gapAnalysis("okuma").missing.length).toBe(0);
  });

  it("MILL_POST_FEATURE_PARITY contains exactly 9 features at iter7", () => {
    expect(MILL_POST_FEATURE_PARITY.length).toBe(9);
  });

  it("Feature id list (canonical iter7 set)", () => {
    const ids = MILL_POST_FEATURE_PARITY.map(f => f.id);
    expect(ids).toEqual([
      "HSM-SMOOTHING",
      "RTCP-5AXIS",
      "WORK-OFFSET-EXTENDED",
      "SAFE-START-BLOCK",
      "TSC-THROUGH-SPINDLE-COOLANT",
      "COMMENT-FORMAT",
      "SUBPROGRAM-CALL",
      "CAS-COLLISION-AVOIDANCE",
      "SSV-SPINDLE-SPEED-VARIATION",
    ]);
  });
});
