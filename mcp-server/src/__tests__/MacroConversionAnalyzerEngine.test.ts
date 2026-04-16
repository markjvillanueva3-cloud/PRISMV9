/**
 * Tests for MacroConversionAnalyzerEngine (RES-MS26)
 * ====================================================
 * Covers: analyzeProgram (fingerprint extraction, G-code/M-code detection, tool counting,
 *         numeric value extraction), findMacroCandidates (grouping, ranking, varying params),
 *         detectMacroPatterns (V-variable and IF/GOTO detection), getSources, and
 *         real filesystem integration (harvest/audit against JM Die archive).
 *
 * Uses inline sample programs derived from real JM Die .MIN files (Okuma OSP format).
 */

import { describe, it, expect } from "vitest";
import {
  MacroConversionAnalyzerEngine,
  macroConversionAnalyzerEngine,
  type ProgramFingerprint,
  type MacroCandidateGroup,
  type MacroConversionResult,
} from "../../src/engines/MacroConversionAnalyzerEngine.js";

// ============================================================================
// SAMPLE PROGRAMS — derived from real JM Die .MIN files
// ============================================================================

/**
 * Simple OD rough + finish + drill program (ACME-style).
 * G85/G87 roughing-finishing pair, center drill, through drill.
 */
const SAMPLE_ROUGH_FINISH_A = `$PROG1.MIN%
M1
NAT12        (OD RGH. TURN .032R)
T121212
G0 X20 Z20
G50 S600
G96 S250 M3
G0 X1.6 Z.05 M8
G1 X-.040 F.007
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

NAT01                   (OD FIN. TURN .032R)
T010101
G0 X20 Z20
G97 S800 M3
G0 X1.6 Z.0
G1 X.7 F.006
G87 NTURN
G0 X20 Z20
M1
M30`;

/**
 * Same structure as SAMPLE_ROUGH_FINISH_A but with different dimensions.
 * Should produce an identical fingerprint.
 */
const SAMPLE_ROUGH_FINISH_B = `$PROG2.MIN%
M1
NAT12        (OD RGH. TURN .032R)
T121212
G0 X20 Z20
G50 S700
G96 S300 M3
G0 X2.0 Z.05 M8
G1 X-.040 F.009
G0 X1.92 Z.060
G85 NTURN D.15 U.015 W.005 F.012
NTURN G81
G0 X1.753 Z.030
G1 Z.0 F.004
G1 X1.853 A135
G1 Z-1.8 F.010
G1 X2.0 F.02
G80
G0 X20 Z20
M1

NAT03          (CENTER DRILL)
T030303
G0 X20 Z20
G97 S350 M3
G0 X.0 Z.1
G1 Z-.15 F.003
G0 Z.1
G0 X20 Z20
M1

NAT01                   (OD FIN. TURN .032R)
T010101
G0 X20 Z20
G97 S900 M3
G0 X2.0 Z.0
G1 X.8 F.005
G87 NTURN
G0 X20 Z20
M1
M30`;

/**
 * Different structure: has boring (G85 for ID) and threading (G76).
 * Should NOT match SAMPLE_ROUGH_FINISH_A/B fingerprint.
 */
const SAMPLE_BORE_THREAD = `$BORE1.MIN%
M1
NAT12        (OD RGH. TURN .032R)
T121212
G0 X20 Z20
G50 S600
G96 S250 M3
G0 X1.6 Z.05 M8
G85 NTURN D.1 U.010 W.005 F.01
NTURN G81
G0 X1.403 Z.030
G1 Z-1.3 F.008
G80
G0 X20 Z20
M1

NAT07     (ROUGH ID. .866 DIA.)
T070707
G0 X20 Z20
G97 S550 M3
G0 X.828 Z.060
G85 NBORE D.060 U.005 W.001 F.003
NBORE G81
G0 X.866 Z.030
G1 Z-1.3 F.0025
G80
G0 X20 Z20
M1

NAT11     (THREAD 3/4-16)
T111111
G0 X20 Z20
G97 S400 M3
G76 X.698 Z-1.0 I.001 K.031 D.008 F.0625 A60
G0 X20 Z20
M1
M30`;

/**
 * Minimal program — just a single drill cycle.
 */
const SAMPLE_MINIMAL_DRILL = `$DRILL1.MIN%
T030303
G97 S500 M3
G0 X0 Z.1
G81 Z-.5 F.003
G80
M30`;

/**
 * Macro-style program with V-variables and IF/GOTO (like the existing macros).
 */
const SAMPLE_MACRO_STYLE = `O1001
(CASING MACRO)
V1 = 1.905
V2 = 1.755
V3 = 0.59375
V4 = 0.618
V5 = 2.015
V100 = 0.015
V6 = 0.04
V7 = 1
V70 = [V21 * 3.82] / V20
IF [V110 EQ 0] GOTO N9000
G140
N9000 G90 G80
G50 S[V65]
G0 X20. Z20.
T010101
M8
G97 S[V87] M3
G0 Z[V81]
IF [V80 LT 0.05] GOTO N15
G85 NAT1 D[V40] U[V35] W[V36] F[V52]
NAT1 G81
G80
M30`;

/**
 * Empty/blank program.
 */
const SAMPLE_EMPTY = ``;

/**
 * Program with only comments.
 */
const SAMPLE_COMMENTS_ONLY = `(THIS IS A COMMENT)
(ANOTHER COMMENT LINE)
(NO G-CODE HERE)`;

// ============================================================================
// TESTS
// ============================================================================

describe("MacroConversionAnalyzerEngine", () => {
  // --------------------------------------------------------------------------
  // getSources
  // --------------------------------------------------------------------------
  describe("getSources", () => {
    it("returns expected source metadata", () => {
      const sources = MacroConversionAnalyzerEngine.getSources();
      expect(sources.archivePath).toBe("H:/PRISM/JM DIE/CNC LATHE");
      expect(sources.macroProgramsPath).toBe("H:/prism/resources/MACRO PROGRAMS");
      expect(sources.expectedCustomers).toBe(118);
      expect(sources.expectedPrograms).toBe(15599);
      expect(sources.existingMacros).toContain("CASING_MACRO.MIN");
      expect(sources.existingMacros).toContain("CBORE_CASING_MACRO.MIN");
      expect(sources.description).toContain("JM Die");
    });
  });

  // --------------------------------------------------------------------------
  // analyzeProgram — fingerprint extraction
  // --------------------------------------------------------------------------
  describe("analyzeProgram", () => {
    it("extracts G-codes from a rough/finish program", () => {
      const fp = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_ROUGH_FINISH_A,
        "test.MIN",
        "ACME"
      );
      expect(fp.gCodes).toContain("G0");
      expect(fp.gCodes).toContain("G1");
      expect(fp.gCodes).toContain("G85");
      expect(fp.gCodes).toContain("G87");
      expect(fp.gCodes).toContain("G50");
      expect(fp.gCodes).toContain("G96");
      expect(fp.gCodes).toContain("G97");
      expect(fp.gCodes).toContain("G80");
      expect(fp.gCodes).toContain("G81");
    });

    it("extracts M-codes from a rough/finish program", () => {
      const fp = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_ROUGH_FINISH_A,
        "test.MIN",
        "ACME"
      );
      expect(fp.mCodes).toContain("M1");
      expect(fp.mCodes).toContain("M3");
      expect(fp.mCodes).toContain("M8");
      expect(fp.mCodes).toContain("M30");
    });

    it("counts tool changes correctly", () => {
      const fp = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_ROUGH_FINISH_A,
        "test.MIN",
        "ACME"
      );
      // T121212, T030303, T010101 = 3 tools
      expect(fp.toolCount).toBe(3);
    });

    it("extracts line count", () => {
      const fp = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_ROUGH_FINISH_A,
        "test.MIN",
        "ACME"
      );
      expect(fp.lineCount).toBeGreaterThan(20);
    });

    it("extracts customer name from override", () => {
      const fp = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_ROUGH_FINISH_A,
        "test.MIN",
        "FONTANA"
      );
      expect(fp.customer).toBe("FONTANA");
    });

    it("extracts customer from filepath when no override", () => {
      const fp = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_ROUGH_FINISH_A,
        "H:/PRISM/JM DIE/CNC LATHE/ALCOA/some-prog.MIN"
      );
      expect(fp.customer).toBe("ALCOA");
    });

    it("extracts X numeric values (diameters)", () => {
      const fp = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_ROUGH_FINISH_A,
        "test.MIN",
        "TEST"
      );
      expect(fp.variableValues["X"]).toBeDefined();
      expect(fp.variableValues["X"]!.length).toBeGreaterThan(0);
      // 1.6, -.040, 1.52, 1.403, 1.503, 1.6, 0, 1.6, 0.7 etc.
      expect(fp.variableValues["X"]).toContain(1.6);
    });

    it("extracts Z numeric values (lengths)", () => {
      const fp = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_ROUGH_FINISH_A,
        "test.MIN",
        "TEST"
      );
      expect(fp.variableValues["Z"]).toBeDefined();
      expect(fp.variableValues["Z"]!.length).toBeGreaterThan(0);
    });

    it("extracts F values (feed rates)", () => {
      const fp = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_ROUGH_FINISH_A,
        "test.MIN",
        "TEST"
      );
      expect(fp.variableValues["F"]).toBeDefined();
      expect(fp.variableValues["F"]).toContain(0.007);
      expect(fp.variableValues["F"]).toContain(0.01);
    });

    it("extracts S values (spindle speeds)", () => {
      const fp = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_ROUGH_FINISH_A,
        "test.MIN",
        "TEST"
      );
      expect(fp.variableValues["S"]).toBeDefined();
      // G50 S600 -> 600, G96 S250 -> 250, G97 S300 -> 300, G97 S800 -> 800
      expect(fp.variableValues["S"]).toContain(600);
      expect(fp.variableValues["S"]).toContain(250);
    });

    it("produces identical fingerprints for structurally matching programs", () => {
      const fpA = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_ROUGH_FINISH_A,
        "progA.MIN",
        "ACME"
      );
      const fpB = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_ROUGH_FINISH_B,
        "progB.MIN",
        "FONTANA"
      );
      expect(fpA.fingerprint).toBe(fpB.fingerprint);
    });

    it("produces different fingerprints for structurally different programs", () => {
      const fpRough = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_ROUGH_FINISH_A,
        "rough.MIN",
        "ACME"
      );
      const fpBore = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_BORE_THREAD,
        "bore.MIN",
        "ACME"
      );
      expect(fpRough.fingerprint).not.toBe(fpBore.fingerprint);
    });

    it("produces a non-empty fingerprint for a minimal drill program", () => {
      const fp = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_MINIMAL_DRILL,
        "drill.MIN",
        "TEST"
      );
      expect(fp.fingerprint.length).toBeGreaterThan(0);
      expect(fp.gCodes).toContain("G81");
      expect(fp.gCodes).toContain("G97");
      expect(fp.toolCount).toBe(1);
    });

    it("handles empty program content gracefully", () => {
      const fp = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_EMPTY,
        "empty.MIN",
        "TEST"
      );
      expect(fp.fingerprint).toBe("");
      expect(fp.gCodes).toHaveLength(0);
      expect(fp.mCodes).toHaveLength(0);
      expect(fp.toolCount).toBe(0);
      expect(fp.lineCount).toBe(1); // one empty line
    });

    it("handles comments-only program", () => {
      const fp = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_COMMENTS_ONLY,
        "comments.MIN",
        "TEST"
      );
      expect(fp.fingerprint).toBe("");
      expect(fp.gCodes).toHaveLength(0);
      expect(fp.toolCount).toBe(0);
    });

    it("detects G76 threading in bore+thread program", () => {
      const fp = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_BORE_THREAD,
        "bore.MIN",
        "TEST"
      );
      expect(fp.gCodes).toContain("G76");
    });

    it("detects D and U parameters from G85 lines", () => {
      const fp = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_ROUGH_FINISH_A,
        "test.MIN",
        "TEST"
      );
      // G85 NTURN D.1 U.010 W.005 F.01
      expect(fp.variableValues["D"]).toContain(0.1);
      expect(fp.variableValues["U"]).toContain(0.010);
      expect(fp.variableValues["W"]).toContain(0.005);
    });
  });

  // --------------------------------------------------------------------------
  // findMacroCandidates — grouping and ranking
  // --------------------------------------------------------------------------
  describe("findMacroCandidates", () => {
    it("groups structurally identical programs together", () => {
      const fpA = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_ROUGH_FINISH_A,
        "progA.MIN",
        "ACME"
      );
      const fpB = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_ROUGH_FINISH_B,
        "progB.MIN",
        "FONTANA"
      );
      const fpC = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_BORE_THREAD,
        "bore.MIN",
        "ACME"
      );

      const candidates = MacroConversionAnalyzerEngine.findMacroCandidates([fpA, fpB, fpC]);
      // A and B match; C is alone => only one candidate group
      expect(candidates.length).toBe(1);
      expect(candidates[0].programCount).toBe(2);
      expect(candidates[0].programs).toContain("progA.MIN");
      expect(candidates[0].programs).toContain("progB.MIN");
    });

    it("lists unique customers in a candidate group", () => {
      const fpA = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_ROUGH_FINISH_A,
        "progA.MIN",
        "ACME"
      );
      const fpB = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_ROUGH_FINISH_B,
        "progB.MIN",
        "FONTANA"
      );

      const candidates = MacroConversionAnalyzerEngine.findMacroCandidates([fpA, fpB]);
      expect(candidates[0].customers).toContain("ACME");
      expect(candidates[0].customers).toContain("FONTANA");
      expect(candidates[0].customers.length).toBe(2);
    });

    it("identifies varying parameters between grouped programs", () => {
      const fpA = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_ROUGH_FINISH_A,
        "progA.MIN",
        "ACME"
      );
      const fpB = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_ROUGH_FINISH_B,
        "progB.MIN",
        "FONTANA"
      );

      const candidates = MacroConversionAnalyzerEngine.findMacroCandidates([fpA, fpB]);
      // Programs have different X, Z, F, S values
      expect(candidates[0].varyingParams.length).toBeGreaterThan(0);
      // X diameters differ (1.6 vs 2.0, etc.)
      expect(candidates[0].varyingParams).toContain("X");
    });

    it("sorts candidates by program count descending", () => {
      // Create 3 copies of rough/finish and 2 copies of bore/thread
      const fps = [
        MacroConversionAnalyzerEngine.analyzeProgram(SAMPLE_ROUGH_FINISH_A, "a1.MIN", "C1"),
        MacroConversionAnalyzerEngine.analyzeProgram(SAMPLE_ROUGH_FINISH_B, "a2.MIN", "C2"),
        MacroConversionAnalyzerEngine.analyzeProgram(SAMPLE_ROUGH_FINISH_B, "a3.MIN", "C3"),
        MacroConversionAnalyzerEngine.analyzeProgram(SAMPLE_BORE_THREAD, "b1.MIN", "C1"),
        MacroConversionAnalyzerEngine.analyzeProgram(SAMPLE_BORE_THREAD, "b2.MIN", "C2"),
      ];

      const candidates = MacroConversionAnalyzerEngine.findMacroCandidates(fps);
      expect(candidates.length).toBe(2);
      expect(candidates[0].programCount).toBe(3); // rough/finish group
      expect(candidates[1].programCount).toBe(2); // bore/thread group
    });

    it("respects minGroupSize filter", () => {
      const fpA = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_ROUGH_FINISH_A,
        "progA.MIN",
        "ACME"
      );
      const fpB = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_ROUGH_FINISH_B,
        "progB.MIN",
        "FONTANA"
      );

      // With minGroupSize=3, the pair shouldn't qualify
      const candidates = MacroConversionAnalyzerEngine.findMacroCandidates([fpA, fpB], 3);
      expect(candidates.length).toBe(0);
    });

    it("produces estimatedSavings string", () => {
      const fpA = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_ROUGH_FINISH_A,
        "a.MIN",
        "ACME"
      );
      const fpB = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_ROUGH_FINISH_B,
        "b.MIN",
        "FONTANA"
      );

      const candidates = MacroConversionAnalyzerEngine.findMacroCandidates([fpA, fpB]);
      expect(candidates[0].estimatedSavings).toBe("2 programs -> 1 macro");
    });

    it("returns empty array when no fingerprints provided", () => {
      const candidates = MacroConversionAnalyzerEngine.findMacroCandidates([]);
      expect(candidates).toHaveLength(0);
    });

    it("returns empty when all programs are unique", () => {
      const fpRough = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_ROUGH_FINISH_A,
        "a.MIN",
        "C1"
      );
      const fpBore = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_BORE_THREAD,
        "b.MIN",
        "C2"
      );
      const fpDrill = MacroConversionAnalyzerEngine.analyzeProgram(
        SAMPLE_MINIMAL_DRILL,
        "c.MIN",
        "C3"
      );

      const candidates = MacroConversionAnalyzerEngine.findMacroCandidates([
        fpRough,
        fpBore,
        fpDrill,
      ]);
      expect(candidates).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // detectMacroPatterns
  // --------------------------------------------------------------------------
  describe("detectMacroPatterns", () => {
    it("detects V-variables and IF/GOTO in macro-style program", () => {
      const result = MacroConversionAnalyzerEngine.detectMacroPatterns(SAMPLE_MACRO_STYLE);
      expect(result.isMacro).toBe(true);
      expect(result.variableCount).toBeGreaterThanOrEqual(5);
      expect(result.controlFlowCount).toBeGreaterThanOrEqual(1);
      expect(result.variableNames).toContain("V1");
      expect(result.variableNames).toContain("V100");
    });

    it("does NOT flag a regular hardcoded program as macro", () => {
      const result = MacroConversionAnalyzerEngine.detectMacroPatterns(SAMPLE_ROUGH_FINISH_A);
      expect(result.isMacro).toBe(false);
      expect(result.variableCount).toBe(0);
    });

    it("returns zero counts for empty content", () => {
      const result = MacroConversionAnalyzerEngine.detectMacroPatterns(SAMPLE_EMPTY);
      expect(result.isMacro).toBe(false);
      expect(result.variableCount).toBe(0);
      expect(result.controlFlowCount).toBe(0);
      expect(result.variableNames).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // Singleton export
  // --------------------------------------------------------------------------
  describe("singleton", () => {
    it("exports a singleton instance", () => {
      expect(macroConversionAnalyzerEngine).toBeDefined();
      expect(macroConversionAnalyzerEngine).toBeInstanceOf(MacroConversionAnalyzerEngine);
    });
  });

  // --------------------------------------------------------------------------
  // Real filesystem integration: harvest + audit
  // --------------------------------------------------------------------------
  describe("harvest (filesystem integration)", () => {
    it("scans real CNC LATHE archive and finds programs", async () => {
      const result = await MacroConversionAnalyzerEngine.harvest(3, 10);
      // With 3 customers and up to 10 programs each, we should get some data
      expect(result.totalAnalyzed).toBeGreaterThan(0);
      expect(result.uniqueFingerprints).toBeGreaterThan(0);
      expect(result.compressionRatio).toBeLessThanOrEqual(1.0);
      expect(result.compressionRatio).toBeGreaterThan(0);
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}/);
    }, 30000);

    it("finds existing macro files", async () => {
      const result = await MacroConversionAnalyzerEngine.harvest(1, 5);
      expect(result.existingMacros).toContain("CASING_MACRO.MIN");
      expect(result.existingMacros).toContain("CBORE_CASING_MACRO.MIN");
    }, 15000);

    it("returns candidate groups when duplicates exist", async () => {
      // Scan more customers for better chance of finding duplicates
      const result = await MacroConversionAnalyzerEngine.harvest(5, 20);
      // topCandidates is a subset of candidateGroups, limited to 20
      expect(result.topCandidates.length).toBeLessThanOrEqual(20);
      // Every candidate should have at least 2 programs
      for (const group of result.candidateGroups) {
        expect(group.programCount).toBeGreaterThanOrEqual(2);
        expect(group.programs.length).toBe(group.programCount);
        expect(group.estimatedSavings).toContain("-> 1 macro");
      }
    }, 30000);

    it("compression ratio is less than 1.0 (indicates duplicates)", async () => {
      const result = await MacroConversionAnalyzerEngine.harvest(5, 30);
      // In 150 programs from 5 customers, there should be SOME structural overlap
      expect(result.compressionRatio).toBeLessThan(1.0);
    }, 30000);
  });

  describe("audit (filesystem integration)", () => {
    it("returns a compact summary with expected fields", async () => {
      const summary = await MacroConversionAnalyzerEngine.audit(3, 10);
      expect(summary.totalAnalyzed).toBeGreaterThan(0);
      expect(summary.uniqueFingerprints).toBeGreaterThan(0);
      expect(summary.compressionRatio).toBeGreaterThan(0);
      expect(summary.compressionRatio).toBeLessThanOrEqual(1.0);
      expect(typeof summary.groupsWith10Plus).toBe("number");
      expect(Array.isArray(summary.topFive)).toBe(true);
      expect(summary.existingMacroCount).toBe(2);
    }, 30000);
  });

  describe("listExistingMacros", () => {
    it("finds the two existing macro files", async () => {
      const macros = await MacroConversionAnalyzerEngine.listExistingMacros();
      expect(macros).toContain("CASING_MACRO.MIN");
      expect(macros).toContain("CBORE_CASING_MACRO.MIN");
      expect(macros.length).toBe(2);
    });
  });

  describe("scanCustomerFolder", () => {
    it("returns fingerprints from a real customer folder (ACME)", async () => {
      const fps = await MacroConversionAnalyzerEngine.scanCustomerFolder("ACME", 5);
      expect(fps.length).toBeGreaterThan(0);
      expect(fps.length).toBeLessThanOrEqual(5);
      for (const fp of fps) {
        expect(fp.customer).toBe("ACME");
        expect(fp.fingerprint.length).toBeGreaterThan(0);
        expect(fp.gCodes.length).toBeGreaterThan(0);
      }
    }, 15000);

    it("returns empty array for non-existent customer", async () => {
      const fps = await MacroConversionAnalyzerEngine.scanCustomerFolder(
        "NONEXISTENT_CUSTOMER_XYZ",
        5
      );
      expect(fps).toHaveLength(0);
    });
  });
});
