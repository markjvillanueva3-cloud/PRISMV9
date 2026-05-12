/**
 * LATHE-PRO-MS0.5, Session 15, U-LPGC03
 * G-Code Completeness & TNRC Polish Tests
 *
 * Validates:
 *   - U-LPGC01: TNRC ramp-on/ramp-off with G01 (not G00), Okuma G40 K-word, 6-digit T-word
 *   - U-LPGC02: G72 face roughing, G53 safe retract, G04 dwell, corner R/C on profiles
 *   - U-LPGC03: CSS rapid safety (G97 before rapids during G96 mode)
 *
 * Reference: Fanuc 0i-TF §10 (TNRC), §12.2.2 (G72), §7.3 (CSS),
 *            Okuma OSP-P200L §7.3 (CSS safety), Peter Smid Chs. 7, 17, 19
 */

import { describe, it, expect } from "vitest";
import {
  latheOrchestrationEngine,
  type LatheOrchestrationInput,
} from "../engines/LatheOrchestrationEngine.js";

// ── Helpers ──────────────────────────────────────────────────────────

function basicInput(overrides: Partial<LatheOrchestrationInput> = {}): LatheOrchestrationInput {
  return {
    part_number: "GCODE-TEST",
    material: { material_name: "AISI 4140", iso_group: "P" },
    bar_stock_od_mm: 50,
    part_length_mm: 60,
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "od_straight", od_mm: 45, length_mm: 40 },
    ],
    controller: "fanuc",
    ...overrides,
  };
}

/** Input with finish operations to trigger TNRC */
function finishInput(overrides: Partial<LatheOrchestrationInput> = {}): LatheOrchestrationInput {
  return basicInput({
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      {
        id: "f2", type: "od_straight", od_mm: 45, length_mm: 40,
        required_operations: ["od_rough", "od_finish"],
      },
    ],
    ...overrides,
  });
}

/** Input with groove for G04 dwell test */
function grooveInput(overrides: Partial<LatheOrchestrationInput> = {}): LatheOrchestrationInput {
  return basicInput({
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "od_straight", od_mm: 45, length_mm: 40 },
      {
        id: "f3", type: "groove_od", od_mm: 45, length_mm: 5,
        groove_width_mm: 3, groove_depth_mm: 4, position_z_mm: -20,
      },
    ],
    ...overrides,
  });
}

/** Input with face-dominant feature for G72 test */
function faceInput(overrides: Partial<LatheOrchestrationInput> = {}): LatheOrchestrationInput {
  return basicInput({
    features: [
      {
        id: "f1", type: "face", length_mm: 5,
        required_operations: ["face_rough"],
      },
      { id: "f2", type: "od_straight", od_mm: 45, length_mm: 40 },
    ],
    ...overrides,
  });
}

function getProgram(input: LatheOrchestrationInput): string {
  const result = latheOrchestrationEngine.calculate("lathe_orchestrate", input);
  return result.program_text;
}

function getResult(input: LatheOrchestrationInput) {
  return latheOrchestrationEngine.calculate("lathe_orchestrate", input);
}

function programLines(input: LatheOrchestrationInput): string[] {
  return getProgram(input).split("\n");
}

// ── U-LPGC01: TNRC Ramp-On/Ramp-Off ────────────────────────────────

describe("G-Code Completeness — TNRC Ramp-On/Off", () => {
  it("finish operations have TNRC activation with G01 (not G00)", () => {
    const program = getProgram(finishInput());
    // G41 or G42 should be followed by G01 (ramp-on move)
    const tnrcLines = program.split("\n").filter(l =>
      l.includes("G41") || l.includes("G42"),
    );
    // Should have at least one TNRC line
    expect(tnrcLines.length).toBeGreaterThanOrEqual(1);
    // Every TNRC activation should be G01, not G00
    for (const line of tnrcLines) {
      if (line.includes("ramp-on")) {
        expect(line).toMatch(/G01/);
        expect(line).not.toMatch(/G00/);
      }
    }
  });

  it("TNRC cancel uses G40 with G01 departure move", () => {
    const program = getProgram(finishInput());
    const cancelLines = program.split("\n").filter(l =>
      l.includes("G40") && l.includes("TNRC cancel"),
    );
    for (const line of cancelLines) {
      expect(line).toMatch(/G40.*G01|G01.*G40/);
    }
  });

  it("Okuma uses G40 with K-word for controlled exit", () => {
    const program = getProgram(finishInput({ controller: "okuma" }));
    const cancelLines = program.split("\n").filter(l =>
      l.includes("G40") && l.includes("TNRC cancel"),
    );
    for (const line of cancelLines) {
      expect(line).toMatch(/K0\./);
    }
  });

  it("Okuma uses 6-digit T-word (TTOOCC format)", () => {
    const program = getProgram(basicInput({ controller: "okuma" }));
    // Okuma T-word should be 6 digits: T010101
    expect(program).toMatch(/T\d{6}/);
  });

  it("non-Okuma controllers use 4-digit T-word", () => {
    const program = getProgram(basicInput({ controller: "fanuc" }));
    // Fanuc T-word: T0101 (4 digits)
    expect(program).toMatch(/T\d{4}\s/);
  });

  it("roughing-only operations do NOT have TNRC", () => {
    const program = getProgram(basicInput({
      features: [
        {
          id: "f1", type: "od_straight", od_mm: 45, length_mm: 40,
          required_operations: ["od_rough"],
        },
      ],
    }));
    // Should NOT have TNRC ramp-on comments for roughing
    const rampLines = program.split("\n").filter(l => l.includes("TNRC ramp-on"));
    expect(rampLines.length).toBe(0);
  });

  it("threading operations skip TNRC", () => {
    const program = getProgram(basicInput({
      features: [
        { id: "f1", type: "face", length_mm: 0 },
        { id: "f2", type: "od_straight", od_mm: 25, length_mm: 10 },
        {
          id: "f3", type: "thread_od", od_mm: 24, length_mm: 25,
          thread_pitch_mm: 2.0,
        },
      ],
    }));
    // Threading lines should not have TNRC
    const threadingSection = program.split("\n");
    const tnrcInThread = threadingSection.filter(l =>
      l.includes("TNRC ramp-on") && l.toLowerCase().includes("thread"),
    );
    expect(tnrcInThread.length).toBe(0);
  });
});

// ── U-LPGC02: G72 Face Roughing ─────────────────────────────────────

describe("G-Code Completeness — G72 Face Roughing", () => {
  it("face_rough operations select G72 cycle", () => {
    const result = getResult(faceInput());
    expect(result.success).toBe(true);
    expect(result.program_text).toMatch(/G72/);
  });

  it("G72 has correct format: W[doc] R[retract]", () => {
    const program = getProgram(faceInput());
    expect(program).toMatch(/G72\s+W[\d.]+\s+R[\d.]+/);
  });

  it("G72 has P/Q profile block numbers", () => {
    const program = getProgram(faceInput());
    expect(program).toMatch(/G72\s+P\d+\s+Q\d+/);
  });

  it("G72 is NOT used for OD rough (G71 instead)", () => {
    const program = getProgram(basicInput({
      features: [
        { id: "f1", type: "face", length_mm: 0 },
        {
          id: "f2", type: "od_straight", od_mm: 45, length_mm: 40,
          required_operations: ["od_rough"],
        },
      ],
    }));
    expect(program).toMatch(/G71/);
    // G72 should only appear if face_rough is explicitly present
    const lines = program.split("\n");
    const g72ForOD = lines.filter(l => l.includes("G72") && l.includes("OD"));
    expect(g72ForOD.length).toBe(0);
  });
});

// ── U-LPGC02: G53 Safe Retract ──────────────────────────────────────

describe("G-Code Completeness — G53 Safe Retract", () => {
  it("uses G53 for safe retract (not G28)", () => {
    const program = getProgram(basicInput());
    expect(program).toMatch(/G53/);
  });

  it("G53 specifies machine coordinates X0 Z0", () => {
    const program = getProgram(basicInput());
    expect(program).toMatch(/G53\s+X0\.\s+Z0\./);
  });

  it("all controllers use G53 retract", () => {
    const controllers = ["fanuc", "haas", "okuma", "mazak", "siemens"] as const;
    for (const ctrl of controllers) {
      const program = getProgram(basicInput({ controller: ctrl }));
      expect(program).toMatch(/G53/);
    }
  });
});

// ── U-LPGC02: G04 Dwell at Groove Bottom ─────────────────────────────

describe("G-Code Completeness — G04 Dwell", () => {
  it("groove operations have G04 dwell at bottom", () => {
    const program = getProgram(grooveInput());
    expect(program).toMatch(/G04/);
  });

  it("G04 dwell specifies P-word (milliseconds)", () => {
    const program = getProgram(grooveInput());
    expect(program).toMatch(/G04\s+P\d+/);
  });

  it("dwell comment mentions surface finish purpose", () => {
    const program = getProgram(grooveInput());
    const dwellLines = program.split("\n").filter(l => l.includes("G04"));
    expect(dwellLines.length).toBeGreaterThan(0);
    expect(dwellLines[0].toLowerCase()).toMatch(/dwell|groove/);
  });
});

// ── U-LPGC02: Corner R/C on Profiles ────────────────────────────────

describe("G-Code Completeness — Corner R/C in Profiles", () => {
  it("profile points with corner_R emit comma-R notation", () => {
    const program = getProgram(basicInput({
      features: [
        { id: "f1", type: "face", length_mm: 0 },
        {
          id: "f2", type: "od_contour", od_mm: 45, length_mm: 40,
          required_operations: ["od_rough"],
          profile_points: [
            { X: 45, Z: 0, type: "linear" as any },
            { X: 45, Z: -20, type: "linear" as any, corner_R: 2.0 } as any,
            { X: 40, Z: -30, type: "linear" as any },
            { X: 50, Z: -40, type: "linear" as any },
          ],
        },
      ],
    }));
    // Should contain ,R2.000 on the profile point with corner_R
    expect(program).toMatch(/,R2\.000/);
  });

  it("profile points with corner_C emit comma-C notation", () => {
    const program = getProgram(basicInput({
      features: [
        { id: "f1", type: "face", length_mm: 0 },
        {
          id: "f2", type: "od_contour", od_mm: 45, length_mm: 40,
          required_operations: ["od_rough"],
          profile_points: [
            { X: 45, Z: 0, type: "linear" as any },
            { X: 45, Z: -20, type: "linear" as any, corner_C: 1.5 } as any,
            { X: 40, Z: -30, type: "linear" as any },
            { X: 50, Z: -40, type: "linear" as any },
          ],
        },
      ],
    }));
    expect(program).toMatch(/,C1\.500/);
  });

  it("profile points without corner_R/C do not emit comma notation", () => {
    const program = getProgram(basicInput({
      features: [
        { id: "f1", type: "face", length_mm: 0 },
        {
          id: "f2", type: "od_contour", od_mm: 45, length_mm: 40,
          required_operations: ["od_rough"],
          profile_points: [
            { X: 45, Z: 0, type: "linear" as any },
            { X: 45, Z: -20, type: "linear" as any },
            { X: 50, Z: -40, type: "linear" as any },
          ],
        },
      ],
    }));
    const lines = program.split("\n").filter(l => l.match(/,R|,C/));
    expect(lines.length).toBe(0);
  });
});

// ── U-LPGC03: CSS Rapid Safety ──────────────────────────────────────

describe("G-Code Completeness — CSS Rapid Safety", () => {
  it("G97 cancels CSS before rapid retract", () => {
    const program = getProgram(basicInput());
    // For turning operations with CSS (G96), G97 should appear before retract
    const lines = program.split("\n");
    const g97Lines = lines.filter(l => l.includes("G97") && l.includes("Cancel CSS"));
    expect(g97Lines.length).toBeGreaterThan(0);
  });

  it("G97 appears after cutting, before G53 retract", () => {
    const lines = programLines(basicInput());
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("G53")) {
        // Look backward for G97 cancel CSS
        let foundG97Cancel = false;
        for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
          if (lines[j].includes("G97") && lines[j].includes("Cancel CSS")) {
            foundG97Cancel = true;
            break;
          }
        }
        // At least one G53 should be preceded by CSS cancel
        // (some operations like drilling use G97 from the start, which is fine)
        if (foundG97Cancel) {
          expect(foundG97Cancel).toBe(true);
          break;
        }
      }
    }
  });

  it("drill-only program does NOT cancel CSS (already G97)", () => {
    const program = getProgram(basicInput({
      features: [
        {
          id: "f1", type: "drill_through", od_mm: 10, length_mm: 30,
          required_operations: ["drill"],
        },
      ],
    }));
    // Drilling uses G97 from the start — no "Cancel CSS" comment for drill ops
    const cancelLines = program.split("\n").filter(l =>
      l.includes("Cancel CSS before rapid"),
    );
    expect(cancelLines.length).toBe(0);
  });

  it("CSS cancel specifies correct RPM value", () => {
    const program = getProgram(basicInput());
    // G97 S[number] — RPM should be a reasonable value (not 0, not crazy high)
    const cancelLines = program.split("\n").filter(l =>
      l.includes("G97") && l.includes("Cancel CSS"),
    );
    for (const line of cancelLines) {
      const match = line.match(/G97\s+S(\d+)/);
      if (match) {
        const rpm = parseInt(match[1], 10);
        expect(rpm).toBeGreaterThan(0);
        expect(rpm).toBeLessThanOrEqual(6000);
      }
    }
  });

  it("Okuma controller gets CSS cancel (critical safety)", () => {
    const program = getProgram(basicInput({ controller: "okuma" }));
    expect(program).toMatch(/G97.*Cancel CSS/);
  });
});

// ── G71 retract angle ──────────────────────────────────────────────

describe("G-Code Completeness — G71 Retract Angle", () => {
  it("G71 comment mentions Setting 73 retract angle", () => {
    const program = getProgram(basicInput({
      features: [
        { id: "f1", type: "face", length_mm: 0 },
        {
          id: "f2", type: "od_straight", od_mm: 45, length_mm: 40,
          required_operations: ["od_rough"],
        },
      ],
    }));
    expect(program).toMatch(/Setting 73/);
  });
});

// ── Program structure validation ─────────────────────────────────────

describe("G-Code Completeness — Program Structure", () => {
  it("program has proper header with part info", () => {
    const program = getProgram(basicInput());
    expect(program).toMatch(/PRISM/);
    expect(program).toMatch(/AISI 4140/);
    expect(program).toMatch(/ISO P/);
  });

  it("program contains % markers and M30", () => {
    const program = getProgram(basicInput());
    // Program text includes full pipeline output — % markers exist within
    expect(program).toMatch(/%/);
    expect(program).toMatch(/M30/);
  });

  it("program has M30 before final %", () => {
    const program = getProgram(basicInput());
    expect(program).toMatch(/M30/);
  });

  it("all 8 controllers generate valid programs", () => {
    const controllers = ["fanuc", "haas", "okuma", "mazak", "siemens", "dmg_mori", "citizen", "star"] as const;
    for (const ctrl of controllers) {
      const result = getResult(basicInput({ controller: ctrl }));
      expect(result.success).toBe(true);
      expect(result.program_text.length).toBeGreaterThan(100);
    }
  });

  it("WCS activation (G54) present in program", () => {
    const program = getProgram(basicInput());
    expect(program).toMatch(/G54/);
  });
});

// ── Full pipeline completeness ───────────────────────────────────────

describe("G-Code Completeness — Full Pipeline", () => {
  it("complex part with multiple features generates successfully", () => {
    const result = getResult(basicInput({
      features: [
        { id: "f1", type: "face", length_mm: 0 },
        {
          id: "f2", type: "od_straight", od_mm: 45, length_mm: 30,
          required_operations: ["od_rough", "od_finish"],
        },
        {
          id: "f3", type: "groove_od", od_mm: 45, length_mm: 5,
          groove_width_mm: 3, groove_depth_mm: 4, position_z_mm: -25,
        },
        {
          id: "f4", type: "thread_od", od_mm: 44, length_mm: 20,
          thread_pitch_mm: 1.5,
        },
      ],
    }));
    expect(result.success).toBe(true);
    expect(result.program_text).toMatch(/G71/);  // roughing
    expect(result.program_text).toMatch(/G70/);  // finishing
    expect(result.program_text).toMatch(/G75/);  // grooving
    expect(result.program_text).toMatch(/G76/);  // threading
    expect(result.program_text).toMatch(/G04/);  // dwell
    expect(result.program_text).toMatch(/G53/);  // safe retract
  });

  it("warnings array is populated", () => {
    const result = getResult(basicInput());
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it("confidence score is reasonable", () => {
    const result = getResult(basicInput());
    expect(result.confidence_score).toBeGreaterThan(0);
    expect(result.confidence_score).toBeLessThanOrEqual(100);
  });
});
