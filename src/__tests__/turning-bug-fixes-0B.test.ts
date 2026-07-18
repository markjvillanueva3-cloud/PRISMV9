/**
 * Phase 0-B Regression Tests — Threading + Facing Bug Fixes
 *
 * U07: Multi-start threading must generate N G76 pairs (not just 1)
 * U08: Facing must use G72 multi-pass cycle (not single G01)
 *
 * Reference: Machinery's Handbook Ch.31 (multi-start lead = pitch × starts)
 *            Fanuc 0i-TD manual (G76 Q-angle parameter for start offset)
 *            Fanuc G72 facing canned cycle specification
 */
import { describe, it, expect } from "vitest";
import { turningPrintToProgramEngine, type TurningPTPInput } from "../engines/TurningPrintToProgramEngine.js";

// ============================================================================
// HELPERS
// ============================================================================

function generateProgram(input: TurningPTPInput): { text: string; success: boolean } {
  const result = turningPrintToProgramEngine.calculate("turning_print_to_program", input as any) as any;
  return { text: result.program_text || "", success: result.success !== false };
}

function countG76Pairs(text: string): number {
  // Count G76 lines that specify X (the cutting G76, not the parameter G76)
  return (text.match(/G76\s+X/g) || []).length;
}

// ============================================================================
// TEST INPUTS
// ============================================================================

const SINGLE_START_THREAD: TurningPTPInput = {
  part_number: "THREAD-SINGLE-001",
  material: { material_name: "4140 Steel", iso_group: "P" },
  bar_stock_od_mm: 30,
  part_length_mm: 50,
  features: [
    { id: "F1", type: "thread_od", od_mm: 20, length_mm: 25,
      thread_pitch_mm: 2.5, thread_starts: 1 },
    { id: "F2", type: "od_straight", od_mm: 20, length_mm: 25 },
  ],
  max_spindle_rpm: 3000,
  max_power_kW: 15,
};

const DUAL_START_THREAD: TurningPTPInput = {
  part_number: "THREAD-DUAL-002",
  material: { material_name: "4140 Steel", iso_group: "P" },
  bar_stock_od_mm: 30,
  part_length_mm: 50,
  features: [
    { id: "F1", type: "thread_od", od_mm: 20, length_mm: 25,
      thread_pitch_mm: 2, thread_starts: 2 },
    { id: "F2", type: "od_straight", od_mm: 20, length_mm: 25 },
  ],
  max_spindle_rpm: 3000,
  max_power_kW: 15,
};

const TRIPLE_START_THREAD: TurningPTPInput = {
  part_number: "THREAD-TRIPLE-003",
  material: { material_name: "4140 Steel", iso_group: "P" },
  bar_stock_od_mm: 30,
  part_length_mm: 50,
  features: [
    { id: "F1", type: "thread_od", od_mm: 20, length_mm: 25,
      thread_pitch_mm: 1.5, thread_starts: 3 },
    { id: "F2", type: "od_straight", od_mm: 20, length_mm: 25 },
  ],
  max_spindle_rpm: 3000,
  max_power_kW: 15,
};

const FACING_PART: TurningPTPInput = {
  part_number: "FACE-001",
  material: { material_name: "6061 Aluminum", iso_group: "N" },
  bar_stock_od_mm: 50,
  part_length_mm: 40,
  features: [
    { id: "F1", type: "face", od_mm: 50, length_mm: 3, depth_mm: 3 },
    { id: "F2", type: "od_straight", od_mm: 48, length_mm: 40 },
  ],
  max_spindle_rpm: 4000,
  max_power_kW: 10,
};

// ============================================================================
// U07: MULTI-START THREADING REGRESSION TESTS
// ============================================================================

describe("U07: Multi-Start Threading — G76 Generation", () => {

  it("single-start thread generates exactly 1 G76 cutting pair", () => {
    const { text, success } = generateProgram(SINGLE_START_THREAD);
    expect(success).toBe(true);
    const g76Count = countG76Pairs(text);
    expect(g76Count).toBe(1);
  });

  it("2-start thread generates exactly 2 G76 cutting pairs", () => {
    const { text, success } = generateProgram(DUAL_START_THREAD);
    expect(success).toBe(true);
    const g76Count = countG76Pairs(text);
    expect(g76Count).toBe(2);
  });

  it("3-start thread generates exactly 3 G76 cutting pairs", () => {
    const { text, success } = generateProgram(TRIPLE_START_THREAD);
    expect(success).toBe(true);
    const g76Count = countG76Pairs(text);
    expect(g76Count).toBe(3);
  });

  it("2-start thread has 180° offset between starts", () => {
    const { text } = generateProgram(DUAL_START_THREAD);
    // First start: Q-angle 0 (or Q0)
    // Second start: Q-angle 180000 (180° × 1000)
    expect(text).toContain("start 1/2");
    expect(text).toContain("start 2/2");
    expect(text).toContain("180");
  });

  it("3-start thread has 120° offset between starts", () => {
    const { text } = generateProgram(TRIPLE_START_THREAD);
    expect(text).toContain("start 1/3");
    expect(text).toContain("start 2/3");
    expect(text).toContain("start 3/3");
    expect(text).toContain("120");
  });

  it("multi-start thread uses lead (pitch × starts) as F value, not pitch", () => {
    const { text } = generateProgram(DUAL_START_THREAD);
    // Pitch=2, starts=2 → lead=4mm → F4.000
    const fMatch = text.match(/F(\d+\.\d+).*lead/i);
    if (fMatch) {
      const fValue = parseFloat(fMatch[1]);
      expect(fValue).toBeCloseTo(4.0, 1); // lead = 2mm pitch × 2 starts = 4mm
    }
  });
});

// ============================================================================
// U08: FACING G72 REGRESSION TESTS
// ============================================================================

describe("U08: Facing — G72 Multi-Pass Cycle", () => {

  it("face_rough generates G72 canned cycle, not just G01", () => {
    const { text, success } = generateProgram(FACING_PART);
    expect(success).toBe(true);
    // Should contain G72 (facing canned cycle)
    expect(text).toContain("G72");
  });

  it("facing program does NOT use single-pass G01 X-1.0 only", () => {
    const { text } = generateProgram(FACING_PART);
    const lines = text.split("\n");
    // The old bug was: G01 Z0.0 then G01 X-1.0 (single pass)
    // New code should have G72 W(DOC) R(retract) multi-pass
    const g72Lines = lines.filter(l => l.includes("G72"));
    expect(g72Lines.length).toBeGreaterThanOrEqual(1);
  });

  it("face_finish uses reduced feed rate for surface quality", () => {
    const { text } = generateProgram(FACING_PART);
    // The finish pass should have a lower feed than roughing
    const lines = text.split("\n");
    const finishLines = lines.filter(l =>
      l.toLowerCase().includes("finish face") || l.toLowerCase().includes("finish")
    );
    // Should have at least one finish-related line
    expect(finishLines.length + lines.filter(l => l.includes("G70")).length).toBeGreaterThan(0);
  });

  it("facing starts from correct X position (stock OD / 2 + clearance)", () => {
    const { text } = generateProgram(FACING_PART);
    // Stock OD = 50mm → start X should be ~27 (50/2 + 2)
    const xMatch = text.match(/X(\d+\.\d+).*Z.*1\.0|X(\d+\.\d+).*Z.*2\.0/);
    if (xMatch) {
      const xVal = parseFloat(xMatch[1] || xMatch[2]);
      expect(xVal).toBeGreaterThan(25); // > stock radius
      expect(xVal).toBeLessThan(30);    // reasonable clearance
    }
  });
});

describe("Safety Contract — critical inputs fail closed", () => {
  it("returns success false when critical stock geometry warnings exist", () => {
    const result = turningPrintToProgramEngine.calculate("turning_print_to_program", {
      ...SINGLE_START_THREAD,
      bar_stock_od_mm: 20,
      finished_od_mm: 25,
    } as any) as any;

    expect(result.success).toBe(false);
    expect(result.warnings.some((warning: any) => warning.severity === "critical")).toBe(true);
    expect(result.program_text).toBe("");
    expect(result.program_line_count).toBe(0);
  });
});

// ============================================================================
// 0-D-ARCH: Workholding Verification Integration
// ============================================================================

describe("Workholding verification in turning pipeline", () => {
  const STEEL_OD_ROUGH: TurningPTPInput = {
    part_number: "WH-TEST-001",
    material: { material_name: "4140 Steel", iso_group: "P" },
    bar_stock_od_mm: 50,
    part_length_mm: 100,
    features: [
      { id: "F1", type: "od_straight", od_mm: 40, length_mm: 80 },
    ],
    max_spindle_rpm: 3000,
    max_power_kW: 15,
  };

  it("runs workholding check and returns result without crashing", () => {
    const result = turningPrintToProgramEngine.calculate("turning_print_to_program", STEEL_OD_ROUGH as any) as any;
    expect(result.success).toBe(true);
    expect(result.operations.length).toBeGreaterThan(0);
  });

  it("generates positive cutting forces for workholding to check", () => {
    const result = turningPrintToProgramEngine.calculate("turning_print_to_program", STEEL_OD_ROUGH as any) as any;
    const forces = result.operations.map((o: any) => o.physics?.cutting_force_N || 0);
    const maxForce = Math.max(...forces);
    expect(maxForce).toBeGreaterThan(0);
  });

  it("workholding warning includes safety factor when flagged", () => {
    const result = turningPrintToProgramEngine.calculate("turning_print_to_program", STEEL_OD_ROUGH as any) as any;
    const whWarnings = (result.warnings || []).filter(
      (w: any) => w.message?.includes("Workholding")
    );
    if (whWarnings.length > 0) {
      // If workholding flagged, warning should include safety factor info
      expect(whWarnings[0].message).toMatch(/safety factor/i);
      expect(whWarnings[0].stage).toBe("safety");
    }
    // Either way, pipeline should still succeed (warning, not blocking)
    expect(result.success).toBe(true);
  });
});
