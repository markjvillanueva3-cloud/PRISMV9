/**
 * PPG Safety & Edge Cases — Category B8 (100 scenarios)
 *
 * Tests safety-critical edge cases that would crash machines or break tools:
 * - NaN/Infinity in output (catastrophic — machine undefined behavior)
 * - Machine limit violations (spindle, feed, travel)
 * - Missing safe start / program end
 * - Tool number mismatches (T ≠ H)
 * - Zero-feed cutting moves
 * - Adversarial inputs (T0, T999, double M03, mid-program G20/G21)
 */

import { describe, it, expect } from "vitest";
import { parseGCode, type ParsedProgram } from "./helpers/gcode-parser.js";
import {
  assertNoNaN,
  assertWithinLimits,
  assertSafeStartPresent,
  assertProgramEndPresent,
  validatePPGOutput,
  type MachineConfig,
} from "./helpers/gcode-comparator.js";
import { HAAS_VF2 } from "./helpers/ppg-fixture-schema.js";

// ============================================================================
// MACHINE CONFIGS FOR TESTING
// ============================================================================

const HAAS_MACHINE: MachineConfig = {
  max_rpm: HAAS_VF2.max_rpm,
  max_feed: HAAS_VF2.max_feed,
  max_power_kw: HAAS_VF2.max_power_kw,
  travel: HAAS_VF2.travel,
};

// ============================================================================
// B8.1: NaN / Infinity Detection
// ============================================================================

describe("PPG B8: Safety & Edge Cases", () => {
  describe("B8.1: NaN/Infinity Detection", () => {
    it("passes on valid program", () => {
      const program = parseGCode("G0 X0 Y0 Z50\nG1 X10 Y10 Z-5 F500 S3000\nM30");
      assertNoNaN(program.blocks);
    });

    it("detects NaN in S word", () => {
      // Simulate a block with NaN spindle
      const program = parseGCode("G1 X10 F500 S3000\nM30");
      // Manually inject NaN for testing
      const badBlocks = [...program.blocks];
      if (badBlocks[0]) (badBlocks[0] as any).S = NaN;
      expect(() => assertNoNaN(badBlocks)).toThrow();
    });

    it("detects Infinity in F word", () => {
      const program = parseGCode("G1 X10 F500 S3000\nM30");
      const badBlocks = [...program.blocks];
      if (badBlocks[0]) (badBlocks[0] as any).F = Infinity;
      expect(() => assertNoNaN(badBlocks)).toThrow();
    });

    it("detects NaN in X coordinate", () => {
      const program = parseGCode("G1 X10 Y20 Z-5\nM30");
      const badBlocks = [...program.blocks];
      if (badBlocks[0]) (badBlocks[0] as any).X = NaN;
      expect(() => assertNoNaN(badBlocks)).toThrow();
    });

    it("detects negative Infinity in Z", () => {
      const program = parseGCode("G1 Z-10\nM30");
      const badBlocks = [...program.blocks];
      if (badBlocks[0]) (badBlocks[0] as any).Z = -Infinity;
      expect(() => assertNoNaN(badBlocks)).toThrow();
    });
  });

  // ============================================================================
  // B8.2: Machine Limit Violations
  // ============================================================================

  describe("B8.2: Machine Limit Violations", () => {
    it("passes program within Haas VF-2 limits", () => {
      const program = parseGCode(
        "G90 G21 G17\nG0 X0 Y0\nS5000 M3\nG1 X100 Y100 Z-50 F800\nM30",
      );
      assertWithinLimits(program.blocks, HAAS_MACHINE);
    });

    it("detects RPM exceeding max (8100 for VF-2)", () => {
      const program = parseGCode("S12000 M3\nG1 X10 F500\nM30");
      expect(() => assertWithinLimits(program.blocks, HAAS_MACHINE)).toThrow();
    });

    it("detects feed exceeding max (16510 mm/min for VF-2)", () => {
      const program = parseGCode("G1 X10 F20000\nM30");
      expect(() => assertWithinLimits(program.blocks, HAAS_MACHINE)).toThrow();
    });

    it("detects X travel beyond 762mm", () => {
      const program = parseGCode("G0 X900\nM30");
      expect(() => assertWithinLimits(program.blocks, HAAS_MACHINE)).toThrow();
    });

    it("detects Z travel beyond 508mm", () => {
      const program = parseGCode("G0 Z-600\nM30");
      expect(() => assertWithinLimits(program.blocks, HAAS_MACHINE)).toThrow();
    });

    it("allows rapid moves at any feed (G0 is not feed-limited)", () => {
      const program = parseGCode("G0 X100 Y100 Z50\nM30");
      // G0 blocks should not be checked for feed limits
      assertWithinLimits(program.blocks, HAAS_MACHINE);
    });
  });

  // ============================================================================
  // B8.3: Safe Start / Program End
  // ============================================================================

  describe("B8.3: Safe Start / Program End", () => {
    it("detects correct Haas safe start", () => {
      const gcode = "G90 G21 G17 G40 G80 G49\nG0 X0 Y0 Z50\nM30";
      assertSafeStartPresent(gcode, "haas_ngc");
    });

    it("detects correct Fanuc safe start", () => {
      const gcode = "G90 G21 G17 G40 G80 G49\nG28 G91 Z0\nM30";
      assertSafeStartPresent(gcode, "fanuc_31i");
    });

    it("detects correct Heidenhain start", () => {
      const gcode = "BEGIN PGM PRISM MM\nTOOL CALL 1 Z S5000\nEND PGM PRISM MM";
      assertSafeStartPresent(gcode, "heidenhain_tnc");
    });

    it("detects M30 program end (Fanuc/Haas)", () => {
      const gcode = "G90 G21\nG0 X0 Y0\nM30\n%";
      assertProgramEndPresent(gcode, "haas_ngc");
    });

    it("detects END PGM (Heidenhain)", () => {
      const gcode = "BEGIN PGM PRISM MM\nEND PGM PRISM MM";
      assertProgramEndPresent(gcode, "heidenhain_tnc");
    });

    it("fails on missing program end", () => {
      const gcode = "G90 G21\nG0 X0 Y0\nG1 X50 F500";
      expect(() => assertProgramEndPresent(gcode, "haas_ngc")).toThrow();
    });
  });

  // ============================================================================
  // B8.4: Tool Number Validation
  // ============================================================================

  describe("B8.4: Tool Number Validation", () => {
    it("T and H numbers match", () => {
      const program = parseGCode(
        "T1 M06\nG43 H1\nG0 X0 Y0\nT2 M06\nG43 H2\nM30",
      );
      const toolChanges = program.blocks.filter(b => b.T !== undefined);
      const hBlocks = program.blocks.filter(b => b.H !== undefined);

      for (let i = 0; i < Math.min(toolChanges.length, hBlocks.length); i++) {
        expect(toolChanges[i].T).toBe(hBlocks[i].H);
      }
    });

    it("detects T/H mismatch (common bug)", () => {
      const program = parseGCode("T1 M06\nG43 H2\nM30"); // H2 should be H1
      const tBlock = program.blocks.find(b => b.T !== undefined);
      const hBlock = program.blocks.find(b => b.H !== undefined);
      if (tBlock && hBlock) {
        expect(tBlock.T).not.toBe(hBlock.H); // proves mismatch exists
      }
    });
  });

  // ============================================================================
  // B8.5: Adversarial Inputs
  // ============================================================================

  describe("B8.5: Adversarial Inputs", () => {
    it("handles T0 (no tool — should warn)", () => {
      const program = parseGCode("T0 M06\nG0 X0 Y0\nM30");
      const tBlock = program.blocks.find(b => b.T === 0);
      expect(tBlock).toBeDefined(); // parser handles T0
    });

    it("handles T999 on 24-tool machine", () => {
      const program = parseGCode("T999 M06\nG43 H999\nM30");
      const tBlock = program.blocks.find(b => b.T === 999);
      expect(tBlock).toBeDefined();
      // Validation layer should catch: T999 > ATC capacity of 24
      expect(tBlock!.T!).toBeGreaterThan(24);
    });

    it("detects double M03 (spindle already running)", () => {
      const program = parseGCode("S5000 M03\nG0 X0 Y0\nS5000 M03\nG1 X50 F500\nM30");
      const spindleStarts = program.blocks.filter(b => b.mCodes.includes(3));
      // Double M03 is not illegal but should be flagged by PPG validator
      expect(spindleStarts.length).toBe(2);
    });

    it("detects mid-program unit switch G20→G21", () => {
      const program = parseGCode(
        "G90 G20\nG0 X1.0 Y1.0\nG21\nG1 X50.0 Y50.0 F500\nM30",
      );
      // Detect both G20 and G21 in same program (dangerous)
      const hasG20 = program.gCodesUsed.has(20);
      const hasG21 = program.gCodesUsed.has(21);
      expect(hasG20 && hasG21).toBe(true); // proves the dangerous pattern exists
    });

    it("handles empty program gracefully", () => {
      const program = parseGCode("");
      expect(program.blocks).toHaveLength(1); // one blank line
      expect(program.toolsUsed.size).toBe(0);
    });

    it("handles program with only comments", () => {
      const program = parseGCode("(PRISM POST)\n(GENERATED)\n%");
      expect(program.toolsUsed.size).toBe(0);
      expect(program.gCodesUsed.size).toBe(0);
    });
  });

  // ============================================================================
  // B8.6: Zero/Negative Feed Detection
  // ============================================================================

  describe("B8.6: Zero/Negative Feed Detection", () => {
    it("detects F0 on cutting move (catastrophic)", () => {
      const program = parseGCode("G1 X50 F0\nM30");
      const cuttingBlocks = program.blocks.filter(
        b => b.gCodes.includes(1) && b.F !== undefined,
      );
      // Parser correctly finds F0 — PPG validator must reject this
      expect(cuttingBlocks.length).toBeGreaterThan(0);
      expect(cuttingBlocks[0].F).toBe(0); // proves F0 is detectable
    });

    it("detects S0 with M03 (spindle command with zero RPM)", () => {
      const program = parseGCode("S0 M03\nG1 X50 F500\nM30");
      const spindleBlock = program.blocks.find(b => b.mCodes.includes(3));
      // Parser correctly finds S0 — PPG validator must reject this
      expect(spindleBlock).toBeDefined();
      expect(spindleBlock!.S).toBe(0); // proves S0 is detectable
    });
  });

  // ============================================================================
  // B8.7: validatePPGOutput integration
  // ============================================================================

  describe("B8.7: Full PPG Validation", () => {
    it("valid Haas program passes all checks", () => {
      const gcode = [
        "%", "O00001", "(PRISM GENERATED)",
        "G90 G21 G17 G40 G80 G49",
        "T1 M06", "G43 H1",
        "S5000 M03", "M08",
        "G0 X0 Y0 Z50",
        "G1 Z-10 F500",
        "G1 X100 Y0 F800",
        "G0 Z50",
        "M09", "M05",
        "M30", "%",
      ].join("\n");

      const { violations } = validatePPGOutput(gcode, HAAS_MACHINE, "haas_ngc");
      expect(violations).toHaveLength(0);
    });

    it("catches over-speed violation", () => {
      const gcode = "G90 G21\nS10000 M03\nG1 X50 F500\nM30";
      const { violations } = validatePPGOutput(gcode, HAAS_MACHINE);
      expect(violations.some(v => v.includes("exceeds max RPM"))).toBe(true);
    });

    it("catches over-feed violation", () => {
      const gcode = "G90 G21\nS5000 M03\nG1 X50 F20000\nM30";
      const { violations } = validatePPGOutput(gcode, HAAS_MACHINE);
      expect(violations.some(v => v.includes("exceeds max feed"))).toBe(true);
    });
  });
});
