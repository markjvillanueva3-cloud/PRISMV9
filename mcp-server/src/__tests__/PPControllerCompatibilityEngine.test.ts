/**
 * PPControllerCompatibilityEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPControllerCompatibilityEngine,
  ppControllerCompatibilityEngine,
} from "../engines/PPControllerCompatibilityEngine.js";

const FANUC_DRILL = `%
O1001 (DRILL CYCLE)
G90 G21 G17
G54
T1 M6
S2000 M3
M8
G0 X0 Y0
G0 Z10.
G81 Z-10. R2. F200.
X20.
X40.
G80
M9
M5
M30
%`;

const MACRO_PROGRAM = `%
O2000 (MACRO)
#100 = 10.
#101 = 20.
IF [#100 GT 5] GOTO 100
N100 G0 X#100 Y#101
M98 P0010
M30
%`;

const DECIMAL_SHORTCUT_PROGRAM = `%
O3000
G90 G21 G17
G0 X10 Y20 Z30
G1 X50 Y60 F200.
M30
%`;

describe("PPControllerCompatibilityEngine", () => {
  it("exports singleton", () => {
    expect(ppControllerCompatibilityEngine).toBeInstanceOf(
      PPControllerCompatibilityEngine,
    );
  });

  describe("Fanuc (baseline)", () => {
    it("FANUC_DRILL is fully compatible", () => {
      const r = ppControllerCompatibilityEngine.check(FANUC_DRILL, "fanuc");
      expect(r.summary.compatible).toBe(true);
      expect(r.errors).toBe(0);
    });

    it("MACRO_PROGRAM is fully compatible on Fanuc", () => {
      const r = ppControllerCompatibilityEngine.check(MACRO_PROGRAM, "fanuc");
      expect(r.summary.compatible).toBe(true);
      expect(r.errors).toBe(0);
    });

    it("DECIMAL_SHORTCUT_PROGRAM compatible on Fanuc", () => {
      const r = ppControllerCompatibilityEngine.check(
        DECIMAL_SHORTCUT_PROGRAM,
        "fanuc",
      );
      expect(r.summary.compatible).toBe(true);
    });
  });

  describe("Heidenhain TNC", () => {
    it("flags G81 drill cycle as error", () => {
      const r = ppControllerCompatibilityEngine.check(
        FANUC_DRILL,
        "heidenhain_tnc",
      );
      expect(r.summary.compatible).toBe(false);
      expect(r.errors).toBeGreaterThan(0);
      const g81 = r.issues.find(
        i => i.code === "G81" && i.kind === "g_code",
      );
      expect(g81).toBeDefined();
      expect(g81!.severity).toBe("error");
      expect(g81!.workaround).toContain("CYCL DEF 200");
    });

    it("flags macro variables as error", () => {
      const r = ppControllerCompatibilityEngine.check(
        MACRO_PROGRAM,
        "heidenhain_tnc",
      );
      const macroIssue = r.issues.find(i => i.kind === "macro_variable");
      expect(macroIssue).toBeDefined();
      expect(macroIssue!.severity).toBe("error");
      expect(macroIssue!.workaround).toContain("Q");
    });

    it("flags IF/GOTO flow control as error", () => {
      const r = ppControllerCompatibilityEngine.check(
        MACRO_PROGRAM,
        "heidenhain_tnc",
      );
      const flow = r.issues.find(i => i.kind === "flow_control");
      expect(flow).toBeDefined();
      expect(flow!.severity).toBe("error");
    });

    it("flags M98 subprogram call as error", () => {
      const r = ppControllerCompatibilityEngine.check(
        MACRO_PROGRAM,
        "heidenhain_tnc",
      );
      const m98 = r.issues.find(i => i.code === "M98");
      expect(m98).toBeDefined();
      expect(m98!.severity).toBe("error");
    });

    it("flags decimal-point shortcut as warning", () => {
      const r = ppControllerCompatibilityEngine.check(
        DECIMAL_SHORTCUT_PROGRAM,
        "heidenhain_tnc",
      );
      const synWarn = r.issues.find(i => i.kind === "syntax");
      expect(synWarn).toBeDefined();
      expect(synWarn!.severity).toBe("warning");
    });
  });

  describe("Siemens 840D", () => {
    it("flags G81 as error with CYCLE81 workaround", () => {
      const r = ppControllerCompatibilityEngine.check(
        FANUC_DRILL,
        "siemens_840d",
      );
      const g81 = r.issues.find(i => i.code === "G81");
      expect(g81).toBeDefined();
      expect(g81!.severity).toBe("error");
      expect(g81!.workaround).toContain("CYCLE81");
    });

    it("flags M98 subprogram call as error", () => {
      const r = ppControllerCompatibilityEngine.check(
        MACRO_PROGRAM,
        "siemens_840d",
      );
      const m98 = r.issues.find(i => i.code === "M98");
      expect(m98).toBeDefined();
      expect(m98!.severity).toBe("error");
    });

    it("allows # macro variables (Siemens has R-parameters but also accepts macros)", () => {
      // allows_macro=true for siemens in our profile
      const r = ppControllerCompatibilityEngine.check(
        MACRO_PROGRAM,
        "siemens_840d",
      );
      const macroIssue = r.issues.find(i => i.kind === "macro_variable");
      expect(macroIssue).toBeUndefined();
    });

    it("flags decimal-shortcut as warning", () => {
      const r = ppControllerCompatibilityEngine.check(
        DECIMAL_SHORTCUT_PROGRAM,
        "siemens_840d",
      );
      const synWarn = r.issues.find(i => i.kind === "syntax");
      expect(synWarn).toBeDefined();
    });
  });

  describe("Haas NGC", () => {
    it("FANUC_DRILL compatible on Haas (drill cycles supported)", () => {
      const r = ppControllerCompatibilityEngine.check(FANUC_DRILL, "haas_ngc");
      expect(r.summary.compatible).toBe(true);
    });

    it("M198 external subprogram flagged as error", () => {
      const code = `%
O1001
M198 P0010
M30
%`;
      const r = ppControllerCompatibilityEngine.check(code, "haas_ngc");
      expect(r.summary.compatible).toBe(false);
      const m198 = r.issues.find(i => i.code === "M198");
      expect(m198).toBeDefined();
      expect(m198!.severity).toBe("error");
    });

    it("G141 3D cutter comp flagged as warning", () => {
      const code = `%
O1001
G41 D1
G141 X10 Y10
M30
%`;
      const r = ppControllerCompatibilityEngine.check(code, "haas_ngc");
      const g141 = r.issues.find(i => i.code === "G141");
      expect(g141).toBeDefined();
      expect(g141!.severity).toBe("warning");
    });
  });

  describe("Okuma OSP", () => {
    it("flags M198 as error", () => {
      const code = `O1001\nM198 P100\nM30`;
      const r = ppControllerCompatibilityEngine.check(code, "okuma_osp");
      const m198 = r.issues.find(i => i.code === "M198");
      expect(m198).toBeDefined();
      expect(m198!.severity).toBe("error");
    });

    it("G83 peck drill flagged as warning (arg semantics)", () => {
      const code = `G83 Z-10. R2. Q3. F100.`;
      const r = ppControllerCompatibilityEngine.check(code, "okuma_osp");
      const g83 = r.issues.find(i => i.code === "G83");
      expect(g83).toBeDefined();
      expect(g83!.severity).toBe("warning");
    });
  });

  describe("Mitsubishi M800", () => {
    it("mostly Fanuc-compatible", () => {
      const r = ppControllerCompatibilityEngine.check(
        FANUC_DRILL,
        "mitsubishi_m800",
      );
      expect(r.summary.compatible).toBe(true);
    });

    it("G10.6 flagged as warning", () => {
      const code = `G10.6 X0 Y0`;
      const r = ppControllerCompatibilityEngine.check(code, "mitsubishi_m800");
      const g106 = r.issues.find(i => i.code === "G10.6");
      expect(g106).toBeDefined();
      expect(g106!.severity).toBe("warning");
    });
  });

  describe("Mazak Matrix", () => {
    it("FANUC_DRILL compatible on Mazak EIA/ISO", () => {
      const r = ppControllerCompatibilityEngine.check(
        FANUC_DRILL,
        "mazak_matrix",
      );
      expect(r.summary.compatible).toBe(true);
    });

    it("allows macro variables", () => {
      const r = ppControllerCompatibilityEngine.check(
        MACRO_PROGRAM,
        "mazak_matrix",
      );
      const macroIssue = r.issues.find(i => i.kind === "macro_variable");
      expect(macroIssue).toBeUndefined();
    });
  });

  describe("Hurco WinMax", () => {
    it("FANUC_DRILL compatible on Hurco G-code mode", () => {
      const r = ppControllerCompatibilityEngine.check(
        FANUC_DRILL,
        "hurco_winmax",
      );
      expect(r.summary.compatible).toBe(true);
    });

    it("M198 flagged as warning (not error) — Hurco tolerates", () => {
      const code = `M198 P100\nM30`;
      const r = ppControllerCompatibilityEngine.check(code, "hurco_winmax");
      const m198 = r.issues.find(i => i.code === "M198");
      expect(m198).toBeDefined();
      expect(m198!.severity).toBe("warning");
    });
  });

  describe("listControllers", () => {
    it("returns all 8 controllers with notes", () => {
      const list = ppControllerCompatibilityEngine.listControllers();
      expect(list.length).toBe(8);
      const targets = list.map(l => l.target);
      expect(targets).toContain("fanuc");
      expect(targets).toContain("haas_ngc");
      expect(targets).toContain("okuma_osp");
      expect(targets).toContain("heidenhain_tnc");
      expect(targets).toContain("siemens_840d");
      expect(targets).toContain("mitsubishi_m800");
      expect(targets).toContain("mazak_matrix");
      expect(targets).toContain("hurco_winmax");
    });

    it("each controller has notes", () => {
      const list = ppControllerCompatibilityEngine.listControllers();
      for (const entry of list) {
        expect(entry.notes.length).toBeGreaterThan(0);
      }
    });
  });

  describe("quickCheck", () => {
    it("returns compact pass/fail result", () => {
      const q = ppControllerCompatibilityEngine.quickCheck(FANUC_DRILL, "fanuc");
      expect(q.compatible).toBe(true);
      expect(q.errors).toBe(0);
    });

    it("reports failure count for Heidenhain", () => {
      const q = ppControllerCompatibilityEngine.quickCheck(
        FANUC_DRILL,
        "heidenhain_tnc",
      );
      expect(q.compatible).toBe(false);
      expect(q.errors).toBeGreaterThan(0);
    });
  });

  describe("rankControllers", () => {
    it("ranks all 8 controllers when no subset given", () => {
      const ranked = ppControllerCompatibilityEngine.rankControllers(FANUC_DRILL);
      expect(ranked.length).toBe(8);
    });

    it("compatible controllers sorted first", () => {
      const ranked = ppControllerCompatibilityEngine.rankControllers(FANUC_DRILL);
      const firstIncompatibleIdx = ranked.findIndex(r => !r.compatible);
      // all compatibles should come before first incompatible
      for (let i = 0; i < firstIncompatibleIdx; i++) {
        expect(ranked[i].compatible).toBe(true);
      }
    });

    it("Fanuc ranks first for FANUC_DRILL", () => {
      const ranked = ppControllerCompatibilityEngine.rankControllers(FANUC_DRILL);
      expect(ranked[0].target).toBe("fanuc");
      expect(ranked[0].errors).toBe(0);
    });

    it("respects subset when provided", () => {
      const ranked = ppControllerCompatibilityEngine.rankControllers(
        FANUC_DRILL,
        ["heidenhain_tnc", "siemens_840d"],
      );
      expect(ranked.length).toBe(2);
      const targets = ranked.map(r => r.target);
      expect(targets).toContain("heidenhain_tnc");
      expect(targets).toContain("siemens_840d");
    });

    it("Heidenhain ranks poorly for drill cycle program", () => {
      const ranked = ppControllerCompatibilityEngine.rankControllers(FANUC_DRILL);
      const heidenhain = ranked.find(r => r.target === "heidenhain_tnc");
      expect(heidenhain).toBeDefined();
      expect(heidenhain!.compatible).toBe(false);
    });
  });

  describe("summary.unsupported_codes", () => {
    it("lists distinct unsupported codes", () => {
      const r = ppControllerCompatibilityEngine.check(
        FANUC_DRILL,
        "heidenhain_tnc",
      );
      expect(r.summary.unsupported_codes).toContain("G81");
      // Deduplicated
      const counts = r.summary.unsupported_codes.reduce<Record<string, number>>(
        (acc, c) => {
          acc[c] = (acc[c] ?? 0) + 1;
          return acc;
        },
        {},
      );
      for (const count of Object.values(counts)) {
        expect(count).toBe(1);
      }
    });

    it("empty when compatible", () => {
      const r = ppControllerCompatibilityEngine.check(FANUC_DRILL, "fanuc");
      expect(r.summary.unsupported_codes).toEqual([]);
    });
  });

  describe("issue line numbers", () => {
    it("reports 1-indexed line numbers", () => {
      const r = ppControllerCompatibilityEngine.check(
        FANUC_DRILL,
        "heidenhain_tnc",
      );
      const g81 = r.issues.find(i => i.code === "G81");
      expect(g81).toBeDefined();
      expect(g81!.line_number).toBeGreaterThan(0);
      // G81 appears on line 10 of FANUC_DRILL (1-indexed)
      expect(g81!.line_number).toBe(10);
    });
  });

  describe("comment stripping", () => {
    it("does not flag codes appearing in parenthetical comments", () => {
      const code = `%
O1001
(G81 IS A DRILL CYCLE)
G90 G21
M30
%`;
      const r = ppControllerCompatibilityEngine.check(code, "heidenhain_tnc");
      const g81 = r.issues.find(i => i.code === "G81");
      // G81 is inside a comment — should not be flagged
      expect(g81).toBeUndefined();
    });

    it("does not flag after semicolon comment", () => {
      const code = `G90 G21 ; G81 is a drill cycle\nM30`;
      const r = ppControllerCompatibilityEngine.check(code, "heidenhain_tnc");
      const g81 = r.issues.find(i => i.code === "G81");
      expect(g81).toBeUndefined();
    });
  });

  describe("error handling", () => {
    it("throws on unknown controller target", () => {
      expect(() =>
        ppControllerCompatibilityEngine.check(FANUC_DRILL, "unknown" as any),
      ).toThrow(/Unknown controller/);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppControllerCompatibilityEngine.check("", "fanuc");
      expect(r.total_issues).toBe(0);
      expect(r.summary.compatible).toBe(true);
    });

    it("handles program with only comments", () => {
      const r = ppControllerCompatibilityEngine.check(
        "(SAMPLE COMMENT)\n(ANOTHER)",
        "heidenhain_tnc",
      );
      expect(r.total_issues).toBe(0);
    });

    it("handles program with only blank lines", () => {
      const r = ppControllerCompatibilityEngine.check("\n\n\n", "fanuc");
      expect(r.total_issues).toBe(0);
    });

    it("result counts consistent", () => {
      const r = ppControllerCompatibilityEngine.check(
        FANUC_DRILL,
        "heidenhain_tnc",
      );
      expect(r.total_issues).toBe(r.issues.length);
      expect(r.errors + r.warnings + r.info).toBe(r.total_issues);
    });
  });
});
