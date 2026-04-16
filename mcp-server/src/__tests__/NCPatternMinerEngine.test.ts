/**
 * Tests for NCPatternMinerEngine
 * ================================
 * Covers: parseProgram (tool extraction, G85 params, G87 finishing, G96/G97 spindle,
 *         G50 clamp, G76 threading, comment-based operation type inference,
 *         customer/machine extraction from path), scanDirectory, getTopPatterns.
 *
 * Uses embedded sample programs derived from real JM Die .MIN files
 * (Okuma OSP G-code format, CNC LATHE archive).
 */

import { describe, it, expect } from "vitest";
import {
  NCPatternMinerEngine,
  ncPatternMinerEngine,
  type ProgramParseResult,
} from "../../src/engines/NCPatternMinerEngine.js";

// ============================================================================
// SAMPLE PROGRAMS — derived from real JM Die .MIN files
// ============================================================================

/**
 * Sample based on ACME/11-10715-0-A.MIN:
 * OD roughing (G85), center drill, drill, OD finish (G87),
 * ID rough bore (G85), ID finish bore (G87), cutoff via last tool.
 */
const SAMPLE_ACME_PROGRAM = `$ACM11A.MIN%
M1
NAT12        (OD RGH. TURN .032R)
T121212
G0 X20 Z20
G50 S600
G96 S250 M3
G0 X1.6 Z.05 M8
G1 X-.040 F.007
G0 X1.6 Z2
G0 X1.52 Z.060
G85 NTURN D.1 U.010 W.005 F.01
NTURN G81
G0 X1.403 Z.030
G1 Z.0 F.003
G1 X1.503 A135
G1 Z-1.3 F.008
G1 X1.6 F.02
G80
G0 X20 Z20
M1

NAT03          (CENTER DRILL)
T030303
G0 X20 Z20
G97 S300 M3
G0 X.0 Z.1
G1 Z-.1 F.002
G0 Z.1
G0 X20 Z20
M1

NAT05                 (DRILL.828 DIA.)
T050505
G0 X20 Z20
G97 S300 M3
G0 X.0 Z.050
G1 Z-3. F.0025
G0 Z.1
G0 X20 Z20
M1

NAT01                   (OD FIN. TURN .032R)
T010101
G0 X20 Z20
G97 S800 M3
G0 X1.6 Z.0
G1 X.7 F.006
G87 NTURN
G0 X20 Z20
M1

NAT07                      (ROUGH ID. .866 DIA.)
T070707                    (CARBIDE BORING BAR 1/2 WITH .015R.)
G0 X20 Z20
G97 S550 M3
G0 X.828 Z.060
G85 NBORE D.060 U.005 W.001 F.003
NBORE G81
G0 X.866 Z.030
G1 Z-1.3 F.0025
G1 X.8
G0 Z.050
G40
G80
G0 X20 Z20
M1

NAT09                    (FINISH ID. .866 DIA.)
T090909                (CARBIDE BORING BAR 1/2 WITH .015R.)
G0 X20 Z20
G97 S600 M3
G87 NBORE
G0 Z.1
G0 X20 Z20
M1

NAT12
T121212
G0 X20 Z20
M2
%`;

/**
 * Sample based on FONTANA/A-0018.MIN:
 * Bar feeder setup, OD rough (G85) + finish (G87), cutoff with G96 CSS.
 */
const SAMPLE_FONTANA_PROGRAM = `$ER0018.MIN%
M1
NBAR
CLEAR
DEF WORK
PS LC,[-400,0],[400,19]
END
DRAW
/CALL OBAR
M216
M1
NAT01
T010101
G0 X20 Z20            (TOOL R.032 )
G50 S1200
G97 S900 M3
G0 X.85 Z.0 M8
G1 X-.04 F.004
G0 Z.06 X.77
G85 NTURN D.05 U.01 W0 F.005
NTURN G81
G0 Z.05 X.455
G1 Z.0 F.003
G1 Z-1.337 X.485
G1 X.625
G1 Z-1.655 F.004
G1 X.8
G40
G80
G0 X20 Z20
M1
NAT02
T020202
G0 X20 Z20
G97 S1000 M3
G0 X.85 Z0
G1 X-.04 F.005
G87 NTURN
G0 X20 Z20
M1
NAT11
T111111
G0 X20 Z20        (1/8 CUT OFF)
G96 S150 M3
G50 S800
G0 X.85 Z-1.645
G1 X-.03 F.0015
G0 X2 M9
G0 X20 Z20
M05
/GOTO NBAR
M2
%`;

/**
 * Sample with G76 threading (based on ACME/A-11-10049-0.MIN).
 */
const SAMPLE_THREADING_PROGRAM = `$A11.MIN%
M1
NAT07   (CARBIDE BORING BAR 3/16 WITH .015R.)
G0 X20 Z20
T070707
G97 S800 M3
G0 X.208 Z.05
G1 Z-.085 F.0015
G0 X.19 Z.05
G0 X.240
G1 Z0 F.001
G76 X.216 L.012
G1 Z-.082 A182
G0 X.19 Z.05
G0 X20 Z20
M1
M2
%`;

/**
 * Minimal program with just one tool and G1 feed move.
 */
const SAMPLE_MINIMAL = `$MINI.MIN%
NAT01   (FACE)
T010101
G97 S500 M3
G1 X0 F.005
M2
%`;

/**
 * Empty program — only header and footer.
 */
const SAMPLE_EMPTY = `$EMPTY.MIN%
M2
%`;

// ============================================================================
// TESTS
// ============================================================================

describe("NCPatternMinerEngine", () => {
  // ==========================================================================
  // SINGLETON
  // ==========================================================================

  describe("singleton", () => {
    it("exports a singleton instance", () => {
      expect(ncPatternMinerEngine).toBeInstanceOf(NCPatternMinerEngine);
    });

    it("singleton is a stable reference", () => {
      expect(ncPatternMinerEngine).toBe(ncPatternMinerEngine);
    });
  });

  // ==========================================================================
  // parseProgram — Tool Extraction
  // ==========================================================================

  describe("parseProgram — tool extraction", () => {
    it("extracts all 7 tool changes from Acme sample (T12, T03, T05, T01, T07, T09, T12)", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_ACME_PROGRAM,
        "H:/PRISM/JM DIE/CNC LATHE/ACME/11-10715-0-A.MIN"
      );
      // T12 appears twice (start and end), so 7 total tool lines
      expect(result.tools).toHaveLength(7);
      const toolNums = result.tools.map((t) => t.toolNumber);
      expect(toolNums).toEqual([12, 3, 5, 1, 7, 9, 12]);
    });

    it("extracts tool number from T010101 format (first 2 digits)", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_MINIMAL,
        "H:/PRISM/JM DIE/CNC LATHE/TEST/MINI.MIN"
      );
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].toolNumber).toBe(1);
      expect(result.tools[0].rawCode).toBe("T010101");
    });

    it("extracts T111111 as tool number 11", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_FONTANA_PROGRAM,
        "H:/PRISM/JM DIE/CNC LATHE/FONTANA/A-0018.MIN"
      );
      const cutoffTool = result.tools.find((t) => t.toolNumber === 11);
      expect(cutoffTool).toBeDefined();
      expect(cutoffTool!.rawCode).toBe("T111111");
    });
  });

  // ==========================================================================
  // parseProgram — Comment-based Operation Type Detection
  // ==========================================================================

  describe("parseProgram — operation type from comments", () => {
    it("identifies 'OD RGH. TURN .032R' as rough operation", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_ACME_PROGRAM,
        "H:/PRISM/JM DIE/CNC LATHE/ACME/TEST.MIN"
      );
      const roughTool = result.tools.find((t) => t.description.includes("OD RGH"));
      expect(roughTool).toBeDefined();
      expect(roughTool!.operationType).toBe("rough");
    });

    it("identifies 'OD FIN. TURN .032R' as finish operation", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_ACME_PROGRAM,
        "H:/PRISM/JM DIE/CNC LATHE/ACME/TEST.MIN"
      );
      const finishTool = result.tools.find((t) => t.description.includes("OD FIN"));
      expect(finishTool).toBeDefined();
      expect(finishTool!.operationType).toBe("finish");
    });

    it("identifies 'CENTER DRILL' as drill operation", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_ACME_PROGRAM,
        "H:/PRISM/JM DIE/CNC LATHE/ACME/TEST.MIN"
      );
      const drillTool = result.tools.find((t) => t.description.includes("CENTER DRILL"));
      expect(drillTool).toBeDefined();
      expect(drillTool!.operationType).toBe("drill");
    });

    it("identifies 'DRILL.828 DIA.' as drill operation", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_ACME_PROGRAM,
        "H:/PRISM/JM DIE/CNC LATHE/ACME/TEST.MIN"
      );
      const drillTool = result.tools.find((t) => t.description.includes("DRILL.828"));
      expect(drillTool).toBeDefined();
      expect(drillTool!.operationType).toBe("drill");
    });

    it("identifies tool 7 as bore operation (ROUGH ID or BORING BAR in description)", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_ACME_PROGRAM,
        "H:/PRISM/JM DIE/CNC LATHE/ACME/TEST.MIN"
      );
      const boreTool = result.tools.find((t) => t.toolNumber === 7);
      expect(boreTool).toBeDefined();
      // Tool 7 is NAT07 (ROUGH ID) with T070707 (CARBIDE BORING BAR) — either comment triggers bore
      expect(boreTool!.operationType).toBe("bore");
    });

    it("identifies '1/8 CUT OFF' as cutoff operation", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_FONTANA_PROGRAM,
        "H:/PRISM/JM DIE/CNC LATHE/FONTANA/TEST.MIN"
      );
      const cutoffTool = result.tools.find((t) => t.description.includes("CUT OFF"));
      expect(cutoffTool).toBeDefined();
      expect(cutoffTool!.operationType).toBe("cutoff");
    });
  });

  // ==========================================================================
  // parseProgram — G85 Roughing Cycle Parameter Extraction
  // ==========================================================================

  describe("parseProgram — G85 roughing parameters", () => {
    it("extracts D, U, W, F from G85 NTURN D.1 U.010 W.005 F.01", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_ACME_PROGRAM,
        "H:/PRISM/JM DIE/CNC LATHE/ACME/TEST.MIN"
      );
      const g85Ops = result.operations.filter((op) => op.type === "G85");
      expect(g85Ops.length).toBeGreaterThanOrEqual(1);

      const firstG85 = g85Ops[0];
      expect(firstG85.depthOfCut).toBeCloseTo(0.1, 5);
      expect(firstG85.finishStockRadial).toBeCloseTo(0.010, 5);
      expect(firstG85.finishStockAxial).toBeCloseTo(0.005, 5);
      expect(firstG85.feedRate).toBeCloseTo(0.01, 5);
    });

    it("extracts parameters from Fontana G85 NTURN D.05 U.01 W0 F.005", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_FONTANA_PROGRAM,
        "H:/PRISM/JM DIE/CNC LATHE/FONTANA/TEST.MIN"
      );
      const g85Ops = result.operations.filter((op) => op.type === "G85");
      expect(g85Ops.length).toBeGreaterThanOrEqual(1);

      const firstG85 = g85Ops[0];
      expect(firstG85.depthOfCut).toBeCloseTo(0.05, 5);
      expect(firstG85.finishStockRadial).toBeCloseTo(0.01, 5);
      expect(firstG85.finishStockAxial).toBeCloseTo(0, 5);
      expect(firstG85.feedRate).toBeCloseTo(0.005, 5);
    });

    it("extracts second G85 for boring (NBORE) with D.060 U.005 W.001 F.003", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_ACME_PROGRAM,
        "H:/PRISM/JM DIE/CNC LATHE/ACME/TEST.MIN"
      );
      const g85Ops = result.operations.filter((op) => op.type === "G85");
      expect(g85Ops.length).toBe(2); // NTURN and NBORE

      const boreG85 = g85Ops[1];
      expect(boreG85.depthOfCut).toBeCloseTo(0.060, 5);
      expect(boreG85.finishStockRadial).toBeCloseTo(0.005, 5);
      expect(boreG85.finishStockAxial).toBeCloseTo(0.001, 5);
      expect(boreG85.feedRate).toBeCloseTo(0.003, 5);
    });
  });

  // ==========================================================================
  // parseProgram — G87 Finishing Cycle
  // ==========================================================================

  describe("parseProgram — G87 finishing cycle", () => {
    it("detects G87 operations in Acme sample", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_ACME_PROGRAM,
        "H:/PRISM/JM DIE/CNC LATHE/ACME/TEST.MIN"
      );
      const g87Ops = result.operations.filter((op) => op.type === "G87");
      expect(g87Ops.length).toBe(2); // NTURN finish and NBORE finish
    });

    it("G87 operations carry the current spindle mode and speed", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_ACME_PROGRAM,
        "H:/PRISM/JM DIE/CNC LATHE/ACME/TEST.MIN"
      );
      const g87Ops = result.operations.filter((op) => op.type === "G87");
      // The OD finish (T01) runs at G97 S800
      const odFinish = g87Ops[0];
      expect(odFinish.spindleMode).toBe("rpm");
      expect(odFinish.spindleSpeed).toBe(800);
    });
  });

  // ==========================================================================
  // parseProgram — Spindle Modes (G96 CSS vs G97 RPM)
  // ==========================================================================

  describe("parseProgram — spindle modes", () => {
    it("detects G96 CSS mode with surface speed S250", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_ACME_PROGRAM,
        "H:/PRISM/JM DIE/CNC LATHE/ACME/TEST.MIN"
      );
      expect(result.spindleData.cssMode).toBe(true);
      expect(result.spindleData.cssSpeeds).toContain(250);
    });

    it("detects multiple G97 RPM mode entries", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_ACME_PROGRAM,
        "H:/PRISM/JM DIE/CNC LATHE/ACME/TEST.MIN"
      );
      // G97 S300, S300, S800, S550, S600
      expect(result.spindleData.rpmSpeeds.length).toBeGreaterThanOrEqual(4);
      expect(result.spindleData.rpmSpeeds).toContain(300);
      expect(result.spindleData.rpmSpeeds).toContain(800);
      expect(result.spindleData.rpmSpeeds).toContain(550);
      expect(result.spindleData.rpmSpeeds).toContain(600);
    });

    it("program using only G97 has cssMode = false", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_THREADING_PROGRAM,
        "H:/PRISM/JM DIE/CNC LATHE/ACME/THREAD.MIN"
      );
      expect(result.spindleData.cssMode).toBe(false);
      expect(result.spindleData.cssSpeeds).toHaveLength(0);
      expect(result.spindleData.rpmSpeeds).toContain(800);
    });

    it("Fontana sample has both CSS and RPM modes", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_FONTANA_PROGRAM,
        "H:/PRISM/JM DIE/CNC LATHE/FONTANA/TEST.MIN"
      );
      expect(result.spindleData.cssMode).toBe(true);
      expect(result.spindleData.cssSpeeds).toContain(150);
      expect(result.spindleData.rpmSpeeds).toContain(900);
      expect(result.spindleData.rpmSpeeds).toContain(1000);
    });
  });

  // ==========================================================================
  // parseProgram — G50 Max Spindle Speed Clamp
  // ==========================================================================

  describe("parseProgram — G50 max speed clamp", () => {
    it("extracts G50 S600 clamp from Acme sample", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_ACME_PROGRAM,
        "H:/PRISM/JM DIE/CNC LATHE/ACME/TEST.MIN"
      );
      expect(result.spindleData.maxClamps).toContain(600);
    });

    it("extracts multiple G50 clamps (S1200 and S800) from Fontana sample", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_FONTANA_PROGRAM,
        "H:/PRISM/JM DIE/CNC LATHE/FONTANA/TEST.MIN"
      );
      expect(result.spindleData.maxClamps).toContain(1200);
      expect(result.spindleData.maxClamps).toContain(800);
    });

    it("G50 clamp propagates to subsequent operations via maxRpm", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_ACME_PROGRAM,
        "H:/PRISM/JM DIE/CNC LATHE/ACME/TEST.MIN"
      );
      // G85 follows G50 S600 and G96 S250, so maxRpm should be 600
      const g85Op = result.operations.find((op) => op.type === "G85");
      expect(g85Op).toBeDefined();
      expect(g85Op!.maxRpm).toBe(600);
    });
  });

  // ==========================================================================
  // parseProgram — G76 Threading
  // ==========================================================================

  describe("parseProgram — G76 threading", () => {
    it("detects G76 threading operation", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_THREADING_PROGRAM,
        "H:/PRISM/JM DIE/CNC LATHE/ACME/THREAD.MIN"
      );
      const g76Ops = result.operations.filter((op) => op.type === "G76");
      expect(g76Ops).toHaveLength(1);
    });

    it("G76 carries current tool number and spindle state", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_THREADING_PROGRAM,
        "H:/PRISM/JM DIE/CNC LATHE/ACME/THREAD.MIN"
      );
      const g76 = result.operations.find((op) => op.type === "G76");
      expect(g76).toBeDefined();
      expect(g76!.toolNumber).toBe(7);
      expect(g76!.spindleMode).toBe("rpm");
      expect(g76!.spindleSpeed).toBe(800);
    });
  });

  // ==========================================================================
  // parseProgram — Customer and Machine Extraction
  // ==========================================================================

  describe("parseProgram — customer and machine from path", () => {
    it("extracts customer 'ACME' from CNC LATHE/ACME/ path", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_MINIMAL,
        "H:/PRISM/JM DIE/CNC LATHE/ACME/MINI.MIN"
      );
      expect(result.customer).toBe("ACME");
    });

    it("extracts customer 'FONTANA' from CNC LATHE/FONTANA/ path", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_MINIMAL,
        "H:/PRISM/JM DIE/CNC LATHE/FONTANA/MINI.MIN"
      );
      expect(result.customer).toBe("FONTANA");
    });

    it("handles backslash paths (Windows) correctly", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_MINIMAL,
        "H:\\PRISM\\JM DIE\\CNC LATHE\\ITW\\MINI.MIN"
      );
      expect(result.customer).toBe("ITW");
    });

    it("returns 'UNKNOWN' when no customer subfolder exists", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_MINIMAL,
        "H:/PRISM/JM DIE/CNC LATHE/MINI.MIN"
      );
      expect(result.customer).toBe("UNKNOWN");
    });

    it("detects machine type as 'CNC LATHE' from path", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_MINIMAL,
        "H:/PRISM/JM DIE/CNC LATHE/ACME/MINI.MIN"
      );
      expect(result.machine).toBe("CNC LATHE");
    });
  });

  // ==========================================================================
  // parseProgram — Header and Line Count
  // ==========================================================================

  describe("parseProgram — header and metadata", () => {
    it("captures the $FILENAME.MIN% header from first line", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_ACME_PROGRAM,
        "H:/PRISM/JM DIE/CNC LATHE/ACME/TEST.MIN"
      );
      expect(result.header).toBe("$ACM11A.MIN%");
    });

    it("returns correct line count", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_MINIMAL,
        "H:/PRISM/JM DIE/CNC LATHE/TEST/MINI.MIN"
      );
      // 6 lines in SAMPLE_MINIMAL
      const expectedLines = SAMPLE_MINIMAL.split(/\r?\n/).length;
      expect(result.lineCount).toBe(expectedLines);
    });
  });

  // ==========================================================================
  // parseProgram — Edge Cases
  // ==========================================================================

  describe("parseProgram — edge cases", () => {
    it("handles empty program gracefully", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_EMPTY,
        "H:/PRISM/JM DIE/CNC LATHE/TEST/EMPTY.MIN"
      );
      expect(result.tools).toHaveLength(0);
      expect(result.operations).toHaveLength(0);
      expect(result.spindleData.cssMode).toBe(false);
      expect(result.header).toBe("$EMPTY.MIN%");
    });

    it("handles completely empty string", () => {
      const result = NCPatternMinerEngine.parseProgram(
        "",
        "H:/PRISM/JM DIE/CNC LATHE/TEST/NOTHING.MIN"
      );
      expect(result.tools).toHaveLength(0);
      expect(result.operations).toHaveLength(0);
      expect(result.lineCount).toBe(1); // split produces [""]
    });

    it("extracts G1 feed moves with F word", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_ACME_PROGRAM,
        "H:/PRISM/JM DIE/CNC LATHE/ACME/TEST.MIN"
      );
      const g1Ops = result.operations.filter((op) => op.type === "G1");
      expect(g1Ops.length).toBeGreaterThan(0);
      // First G1 with feed: G1 X-.040 F.007
      const firstFeed = g1Ops[0];
      expect(firstFeed.feedRate).toBeCloseTo(0.007, 5);
    });
  });

  // ==========================================================================
  // parseProgram — Full Program Structural Validation
  // ==========================================================================

  describe("parseProgram — structural validation", () => {
    it("Acme sample has expected operation type breakdown", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_ACME_PROGRAM,
        "H:/PRISM/JM DIE/CNC LATHE/ACME/TEST.MIN"
      );
      const types = result.tools.map((t) => t.operationType);
      expect(types).toContain("rough");
      expect(types).toContain("finish");
      expect(types).toContain("drill");
      expect(types).toContain("bore");
    });

    it("Fontana sample finds G85/G87 roughing-finishing pair", () => {
      const result = NCPatternMinerEngine.parseProgram(
        SAMPLE_FONTANA_PROGRAM,
        "H:/PRISM/JM DIE/CNC LATHE/FONTANA/TEST.MIN"
      );
      const g85Count = result.operations.filter((op) => op.type === "G85").length;
      const g87Count = result.operations.filter((op) => op.type === "G87").length;
      expect(g85Count).toBeGreaterThanOrEqual(1);
      expect(g87Count).toBeGreaterThanOrEqual(1);
    });
  });
});
