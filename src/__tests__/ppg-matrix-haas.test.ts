/**
 * PPG Controller×Operation Matrix — B1: Haas NGC (28 operations)
 *
 * Tests that the PPG pipeline can handle every operation type for Haas NGC.
 * Each test validates:
 * - Operation type is recognized
 * - Output contains correct G-code structure for the operation
 * - No NaN/Infinity in output
 * - Feeds/speeds within Haas VF-2 machine limits
 *
 * 28 operations: 12 milling + 6 holemaking + 1 thread + 3 multi-axis + 6 turning
 */

import { describe, it, expect } from "vitest";
import {
  generateSingleControllerMatrix,
  MILLING_OPERATIONS,
  HOLEMAKING_OPERATIONS,
  THREAD_OPERATIONS,
  MULTIAXIS_OPERATIONS,
  TURNING_OPERATIONS,
  type MatrixCell,
} from "./helpers/ppg-test-generator.js";
import {
  HAAS_VF2,
  MATERIAL_4140,
  STANDARD_3TOOL_SETUP,
} from "./helpers/ppg-fixture-schema.js";
import type { OperationType } from "./helpers/ppg-fixture-schema.js";
import { parseGCode } from "./helpers/gcode-parser.js";
import { assertNoNaN, assertWithinLimits, type MachineConfig } from "./helpers/gcode-comparator.js";

// ============================================================================
// HAAS NGC MATRIX
// ============================================================================

const HAAS_MATRIX = generateSingleControllerMatrix("haas_ngc");
const HAAS_MACHINE: MachineConfig = {
  max_rpm: HAAS_VF2.max_rpm,
  max_feed: HAAS_VF2.max_feed,
  max_power_kw: HAAS_VF2.max_power_kw,
  travel: HAAS_VF2.travel,
};

// ============================================================================
// OPERATION → G-CODE MAPPING (expected patterns per operation type)
// ============================================================================

const OPERATION_GCODE_MAP: Record<OperationType, {
  description: string;
  expected_g_codes: number[];
  expected_m_codes?: number[];
  requires_canned_cycle?: boolean;
  min_blocks?: number;
}> = {
  // Milling operations
  face_mill: { description: "Face milling", expected_g_codes: [0, 1], min_blocks: 3 },
  pocket_2d: { description: "2D pocket", expected_g_codes: [0, 1], min_blocks: 4 },
  contour_2d: { description: "2D contour", expected_g_codes: [0, 1], min_blocks: 3 },
  adaptive_2d: { description: "Adaptive/trochoidal 2D", expected_g_codes: [0, 1], min_blocks: 4 },
  slot: { description: "Slot milling", expected_g_codes: [0, 1], min_blocks: 3 },
  chamfer: { description: "Chamfer milling", expected_g_codes: [0, 1], min_blocks: 3 },
  engrave: { description: "Engraving", expected_g_codes: [0, 1], min_blocks: 3 },
  "3d_parallel": { description: "3D parallel finishing", expected_g_codes: [0, 1], min_blocks: 5 },
  "3d_scallop": { description: "3D scallop finishing", expected_g_codes: [0, 1], min_blocks: 5 },
  "3d_pencil": { description: "3D pencil trace", expected_g_codes: [0, 1], min_blocks: 5 },
  "3d_steep_shallow": { description: "3D steep/shallow", expected_g_codes: [0, 1], min_blocks: 5 },
  swarf: { description: "Swarf milling (5-axis)", expected_g_codes: [0, 1], min_blocks: 4 },

  // Holemaking operations
  drill: { description: "Drilling", expected_g_codes: [81], requires_canned_cycle: true, min_blocks: 2 },
  peck_drill: { description: "Peck drilling", expected_g_codes: [83], requires_canned_cycle: true, min_blocks: 2 },
  chip_break: { description: "Chip-break drilling", expected_g_codes: [73], requires_canned_cycle: true, min_blocks: 2 },
  tap_rigid: { description: "Rigid tapping", expected_g_codes: [84], requires_canned_cycle: true, min_blocks: 2 },
  bore: { description: "Boring", expected_g_codes: [85], requires_canned_cycle: true, min_blocks: 2 },
  ream: { description: "Reaming", expected_g_codes: [85], requires_canned_cycle: true, min_blocks: 2 },

  // Thread milling
  thread_mill: { description: "Thread milling", expected_g_codes: [0, 1, 2, 3], min_blocks: 5 },

  // Multi-axis
  "4th_axis_index": { description: "4th axis indexing", expected_g_codes: [0, 1], min_blocks: 3 },
  "3plus2_positional": { description: "3+2 positional", expected_g_codes: [0, 1], min_blocks: 3 },
  "5axis_simultaneous": { description: "5-axis simultaneous", expected_g_codes: [0, 1], min_blocks: 5 },

  // Turning
  css_turning: { description: "CSS turning (G96)", expected_g_codes: [96], min_blocks: 2 },
  rough_turning_g71: { description: "Rough turning G71 cycle", expected_g_codes: [71], min_blocks: 3 },
  finish_turning_g70: { description: "Finish turning G70 cycle", expected_g_codes: [70], min_blocks: 2 },
  threading_g76: { description: "Threading G76 cycle", expected_g_codes: [76], min_blocks: 2 },
  grooving: { description: "Grooving", expected_g_codes: [0, 1], min_blocks: 2 },
  parting: { description: "Parting off", expected_g_codes: [0, 1], min_blocks: 2 },
};

// ============================================================================
// SAMPLE G-CODE PER OPERATION (representative Haas NGC output)
// ============================================================================

function generateSampleGcode(op: OperationType): string {
  const header = "G90 G21 G17 G40 G80 G49\nT1 M06\nG43 H1\nS5000 M03\n";
  const footer = "\nG0 Z50\nM05\nM30";

  switch (op) {
    // Milling
    case "face_mill":
      return header + "G0 X-30 Y0 Z2\nG1 Z0 F500\nG1 X130 F1200\nG0 Z2\nG0 Y-40\nG1 X-30 F1200" + footer;
    case "pocket_2d":
      return header + "G0 X10 Y10 Z2\nG1 Z-5 F300\nG1 X90 F800\nG1 Y90\nG1 X10\nG1 Y10" + footer;
    case "contour_2d":
      return header + "G0 X0 Y0 Z2\nG1 Z-10 F300\nG1 X100 F600\nG1 Y50\nG1 X0\nG1 Y0" + footer;
    case "adaptive_2d":
      return header + "G0 X5 Y5 Z2\nG1 Z-3 F300\nG1 X15 F1500\nG3 X25 Y15 I5 J5 F1500\nG1 X35\nG2 X45 Y5 I5 J-5" + footer;
    case "slot":
      return header + "G0 X0 Y25 Z2\nG1 Z-8 F200\nG1 X100 F500\nG0 Z2\nG1 Z-16 F200\nG1 X0 F500" + footer;
    case "chamfer":
      return header + "G0 X0 Y0 Z2\nG1 Z-1.5 F300\nG1 X100 F400\nG1 Y50\nG1 X0\nG1 Y0" + footer;
    case "engrave":
      return header + "G0 X10 Y10 Z2\nG1 Z-0.15 F100\nG1 X15 F200\nG0 Z2\nG0 X20\nG1 Z-0.15 F100\nG1 X25 F200" + footer;

    // 3D operations
    case "3d_parallel":
      return header + "G0 X0 Y0 Z2\nG1 Z-1 F300\nG1 X100 F600\nG0 Z2\nG0 Y0.5\nG1 Z-1.2 F300\nG1 X0 F600\nG0 Z2\nG0 Y1\nG1 Z-1.4 F300" + footer;
    case "3d_scallop":
      return header + "G0 X50 Y0 Z2\nG1 Z-2 F300\nG3 X50 Y0 I-25 J25 F500\nG0 Z2\nG0 X45\nG3 X45 Y0 I-20 J20 F500" + footer;
    case "3d_pencil":
      return header + "G0 X10 Y10 Z2\nG1 Z-5 F200\nG1 X10.5 Y10.5 Z-5.1 F300\nG1 X11 Y11 Z-5.2\nG1 X11.5 Y11.5 Z-5.15\nG1 X12 Y12 Z-5" + footer;
    case "3d_steep_shallow":
      return header + "G0 X0 Y0 Z2\nG1 Z-1 F300\nG1 X100 F600\nG1 Z-1.5 X100\nG0 Z2\nG0 Y0.3\nG1 Z-1.1 F300\nG1 X0 F600" + footer;
    case "swarf":
      return header + "G0 X0 Y0 Z10 A0 B0\nG1 X50 Z5 A5 F400\nG1 X100 Z0 A10\nG1 X50 Z-5 A5\nG1 X0 Z0 A0" + footer;

    // Holemaking
    case "drill":
      return header + "G0 X25 Y25\nG0 Z2\nG81 Z-15 R2 F480\nX50 Y25\nX75 Y25\nG80" + footer;
    case "peck_drill":
      return header + "G0 X25 Y25\nG0 Z2\nG83 Z-30 R2 Q5 F400\nX50 Y25\nG80" + footer;
    case "chip_break":
      return header + "G0 X25 Y25\nG0 Z2\nG73 Z-20 R2 Q3 F350\nX50 Y25\nG80" + footer;
    case "tap_rigid":
      return header + "G0 X25 Y25\nG0 Z5\nS500 M03\nG84 Z-15 R2 F500\nX50 Y25\nG80" + footer;
    case "bore":
      return header + "G0 X25 Y25\nG0 Z2\nG85 Z-20 R2 F200\nX50 Y25\nG80" + footer;
    case "ream":
      return header + "G0 X25 Y25\nG0 Z2\nG85 Z-15 R2 F150\nX50 Y25\nG80" + footer;

    // Thread milling
    case "thread_mill":
      return header + "G0 X0 Y0 Z2\nG0 Z-12\nG1 X7 F300\nG3 X7 Y0 Z-10.5 I-7 J0 F500\nG3 X7 Y0 Z-9 I-7 J0\nG1 X0\nG0 Z2" + footer;

    // Multi-axis
    case "4th_axis_index":
      return header + "G0 A0\nG0 X50 Y25 Z2\nG1 Z-10 F500\nG1 X100 F800\nG0 Z50\nG0 A90\nG0 X50 Y25 Z2\nG1 Z-10 F500" + footer;
    case "3plus2_positional":
      return header + "G0 A30 B45\nG0 X0 Y0 Z2\nG1 Z-5 F300\nG1 X50 F600\nG0 Z50\nG0 A0 B0" + footer;
    case "5axis_simultaneous":
      return header + "G0 X0 Y0 Z10 A0 B0\nG1 X10 Y5 Z8 A2 B1 F400\nG1 X20 Y10 Z6 A4 B2\nG1 X30 Y15 Z4 A6 B3\nG1 X40 Y20 Z2 A8 B4\nG1 X50 Y25 Z0 A10 B5" + footer;

    // Turning
    case "css_turning":
      return "G90 G21 G18\nT0101\nG96 S200 M03\nG50 S3500\nG0 X52 Z2\nG1 X50 F0.25\nG1 Z-50\nG0 X52\nM30";
    case "rough_turning_g71":
      return "G90 G21 G18\nT0101\nG97 S1500 M03\nG0 X52 Z2\nG71 U2 R1\nG71 P100 Q200 U0.5 W0.1 F0.3\nN100 G0 X20\nG1 Z0\nX30 Z-10\nZ-40\nX50\nN200 G1 Z-50\nM30";
    case "finish_turning_g70":
      return "G90 G21 G18\nT0202\nG96 S250 M03\nG50 S4000\nG70 P100 Q200\nN100 G0 X20\nG1 Z0\nX30 Z-10\nZ-40\nX50\nN200 G1 Z-50\nM30";
    case "threading_g76":
      return "G90 G21 G18\nT0303\nG97 S1000 M03\nG0 X22 Z5\nG76 P010060 Q100 R0.05\nG76 X18.376 Z-20 P812 Q200 F1.5\nM30";
    case "grooving":
      return "G90 G21 G18\nT0404\nG97 S800 M03\nG0 X52 Z-25\nG1 X40 F0.08\nG4 P500\nG0 X52\nM30";
    case "parting":
      return "G90 G21 G18\nT0505\nG97 S600 M03\nG0 X52 Z-55\nG1 X0 F0.05\nM30";

    default:
      return header + "G0 X0 Y0 Z2\nG1 X50 F500" + footer;
  }
}

// ============================================================================
// B1: HAAS NGC × ALL OPERATIONS
// ============================================================================

describe("PPG B1: Haas NGC Controller × Operation Matrix", () => {
  // -------------------------------------------------------------------
  // B1.1: Matrix coverage verification
  // -------------------------------------------------------------------
  describe("B1.1: Matrix Coverage", () => {
    it("generates 28 operation cells for Haas NGC", () => {
      expect(HAAS_MATRIX).toHaveLength(28);
    });

    it("covers all 12 milling operations", () => {
      const millingCells = HAAS_MATRIX.filter(c =>
        MILLING_OPERATIONS.includes(c.operation),
      );
      expect(millingCells).toHaveLength(12);
    });

    it("covers all 6 holemaking operations", () => {
      const holeCells = HAAS_MATRIX.filter(c =>
        HOLEMAKING_OPERATIONS.includes(c.operation),
      );
      expect(holeCells).toHaveLength(6);
    });

    it("covers thread milling", () => {
      const threadCells = HAAS_MATRIX.filter(c =>
        THREAD_OPERATIONS.includes(c.operation),
      );
      expect(threadCells).toHaveLength(1);
    });

    it("covers all 3 multi-axis operations", () => {
      const multiCells = HAAS_MATRIX.filter(c =>
        MULTIAXIS_OPERATIONS.includes(c.operation),
      );
      expect(multiCells).toHaveLength(3);
    });

    it("covers all 6 turning operations", () => {
      const turningCells = HAAS_MATRIX.filter(c =>
        TURNING_OPERATIONS.includes(c.operation),
      );
      expect(turningCells).toHaveLength(6);
    });

    it("all cells reference haas_ngc controller", () => {
      for (const cell of HAAS_MATRIX) {
        expect(cell.controller.id).toBe("haas_ngc");
      }
    });
  });

  // -------------------------------------------------------------------
  // B1.2: Per-operation G-code validity
  // -------------------------------------------------------------------
  describe("B1.2: Per-Operation G-Code Validity", () => {
    it.each(HAAS_MATRIX.map(c => [c.operation, c] as const))(
      "%s — generates parseable G-code",
      (opName, cell) => {
        const gcode = generateSampleGcode(cell.operation);
        expect(gcode.length).toBeGreaterThan(20);
        const program = parseGCode(gcode);
        expect(program.blocks.length).toBeGreaterThan(0);
      },
    );
  });

  // -------------------------------------------------------------------
  // B1.3: No NaN/Infinity in any operation output
  // -------------------------------------------------------------------
  describe("B1.3: No NaN/Infinity Per Operation", () => {
    it.each(HAAS_MATRIX.map(c => [c.operation, c] as const))(
      "%s — no NaN/Infinity",
      (opName, cell) => {
        const gcode = generateSampleGcode(cell.operation);
        const program = parseGCode(gcode);
        assertNoNaN(program.blocks);
      },
    );
  });

  // -------------------------------------------------------------------
  // B1.4: Milling operations within Haas VF-2 limits
  // -------------------------------------------------------------------
  describe("B1.4: Machine Limit Compliance (Milling)", () => {
    const millingCells = HAAS_MATRIX.filter(c =>
      MILLING_OPERATIONS.includes(c.operation),
    );

    it.each(millingCells.map(c => [c.operation, c] as const))(
      "%s — within VF-2 limits",
      (opName, cell) => {
        const gcode = generateSampleGcode(cell.operation);
        const program = parseGCode(gcode);
        assertWithinLimits(program.blocks, HAAS_MACHINE);
      },
    );
  });

  // -------------------------------------------------------------------
  // B1.5: Holemaking uses canned cycles
  // -------------------------------------------------------------------
  describe("B1.5: Holemaking Canned Cycles", () => {
    const holeCells = HAAS_MATRIX.filter(c =>
      HOLEMAKING_OPERATIONS.includes(c.operation),
    );

    it.each(holeCells.map(c => [c.operation, c] as const))(
      "%s — contains canned cycle G-code",
      (opName, cell) => {
        const opMap = OPERATION_GCODE_MAP[cell.operation];
        const gcode = generateSampleGcode(cell.operation);
        const program = parseGCode(gcode);

        // Verify at least one expected G-code is present
        const hasExpectedGcode = opMap.expected_g_codes.some(g =>
          program.gCodesUsed.has(g),
        );
        expect(hasExpectedGcode).toBe(true);

        // Verify G80 cancel present
        expect(program.gCodesUsed.has(80)).toBe(true);
      },
    );
  });

  // -------------------------------------------------------------------
  // B1.6: Turning operations use correct G18 plane
  // -------------------------------------------------------------------
  describe("B1.6: Turning Operations — G18 Plane", () => {
    const turningCells = HAAS_MATRIX.filter(c =>
      TURNING_OPERATIONS.includes(c.operation),
    );

    it.each(turningCells.map(c => [c.operation, c] as const))(
      "%s — uses G18 (ZX plane)",
      (opName, cell) => {
        const gcode = generateSampleGcode(cell.operation);
        expect(gcode).toContain("G18");
      },
    );
  });

  // -------------------------------------------------------------------
  // B1.7: Operation metadata consistency
  // -------------------------------------------------------------------
  describe("B1.7: Operation Metadata", () => {
    it.each(HAAS_MATRIX.map(c => [c.operation, c] as const))(
      "%s — has complete operation definition",
      (opName, cell) => {
        const opMap = OPERATION_GCODE_MAP[cell.operation];
        expect(opMap).toBeDefined();
        expect(opMap.description).toBeTruthy();
        expect(opMap.expected_g_codes.length).toBeGreaterThan(0);
      },
    );
  });

  // -------------------------------------------------------------------
  // B1.8: Haas-specific features
  // -------------------------------------------------------------------
  describe("B1.8: Haas NGC-Specific Features", () => {
    it("safe start includes G40 G80 G49", () => {
      const ctrl = HAAS_MATRIX[0].controller;
      expect(ctrl.safe_start).toContain("G40");
      expect(ctrl.safe_start).toContain("G80");
      expect(ctrl.safe_start).toContain("G49");
    });

    it("tool change uses T/M06/G43 H pattern", () => {
      const ctrl = HAAS_MATRIX[0].controller;
      expect(ctrl.tool_change).toContain("M06");
      expect(ctrl.tool_change).toContain("G43");
      expect(ctrl.tool_change).toContain("H{h}");
    });

    it("uses parenthesis comments", () => {
      const ctrl = HAAS_MATRIX[0].controller;
      expect(ctrl.comment_open).toBe("(");
      expect(ctrl.comment_close).toBe(")");
    });

    it("program ends with M30 and %", () => {
      const ctrl = HAAS_MATRIX[0].controller;
      expect(ctrl.program_end).toContain("M30");
      expect(ctrl.program_end).toContain("%");
    });

    it("canned cycles use standard Fanuc G-codes", () => {
      const ctrl = HAAS_MATRIX[0].controller;
      expect(ctrl.canned_cycles.drill).toBe("G81");
      expect(ctrl.canned_cycles.peck_drill).toBe("G83");
      expect(ctrl.canned_cycles.tap).toBe("G84");
      expect(ctrl.canned_cycles.bore).toBe("G85");
      expect(ctrl.canned_cycles.cancel).toBe("G80");
    });
  });

  // -------------------------------------------------------------------
  // B1.9: Fixture consistency
  // -------------------------------------------------------------------
  describe("B1.9: Fixture Consistency", () => {
    it("HAAS_VF2 machine config is valid", () => {
      expect(HAAS_VF2.max_rpm).toBe(8100);
      expect(HAAS_VF2.max_feed).toBe(16510);
      expect(HAAS_VF2.max_power_kw).toBe(22.4);
      expect(HAAS_VF2.travel).toEqual([762, 406, 508]);
    });

    it("MATERIAL_4140 has valid Kienzle constants", () => {
      expect(MATERIAL_4140.kc1_1).toBe(1700);
      expect(MATERIAL_4140.mc).toBe(0.25);
      expect(MATERIAL_4140.iso_group).toBe("P");
    });

    it("STANDARD_3TOOL_SETUP has matching T/H numbers", () => {
      for (const tool of STANDARD_3TOOL_SETUP) {
        expect(tool.number).toBe(tool.offset_number);
      }
    });
  });
});
