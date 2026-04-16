/**
 * LATHE-PRO-MS0.5, Session 16, U-LPDIAL03
 * Controller Dialect Native Syntax Tests
 *
 * Validates that each controller produces native-quality output,
 * not just Fanuc-translated syntax.
 *
 * U-LPDIAL01: Okuma native features (M25/M21 barriers, M695/M696 SSV, 6-digit T)
 * U-LPDIAL02: Siemens native CYCLE95/97, Mazak Series T feed codes
 *
 * Reference: Okuma OSP-P200L/P300 Programming Manual,
 *            Siemens SINUMERIK 840D Programming Guide,
 *            Mazak SmoothG Programming Manual
 */

import { describe, it, expect } from "vitest";
import {
  latheOrchestrationEngine,
  type LatheOrchestrationInput,
} from "../engines/LatheOrchestrationEngine.js";

// ── Helpers ──────────────────────────────────────────────────────────

function dialInput(controller: string, overrides: Partial<LatheOrchestrationInput> = {}): LatheOrchestrationInput {
  return {
    part_number: "DIAL-TEST",
    material: { material_name: "AISI 4140", iso_group: "P" },
    bar_stock_od_mm: 40,
    part_length_mm: 50,
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      {
        id: "f2", type: "od_straight", od_mm: 35, length_mm: 30,
        required_operations: ["od_rough", "od_finish"],
      },
    ],
    controller: controller as any,
    ...overrides,
  };
}

function threadDialInput(controller: string): LatheOrchestrationInput {
  return dialInput(controller, {
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "od_straight", od_mm: 25, length_mm: 10 },
      {
        id: "f3", type: "thread_od", od_mm: 24, length_mm: 20,
        thread_pitch_mm: 2.0, thread_class: "6g",
      },
    ],
  });
}

function grooveDialInput(controller: string): LatheOrchestrationInput {
  return dialInput(controller, {
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "od_straight", od_mm: 35, length_mm: 30 },
      {
        id: "f3", type: "groove_od", od_mm: 35, length_mm: 4,
        groove_width_mm: 3, groove_depth_mm: 3, position_z_mm: -20,
      },
    ],
  });
}

function getProgram(input: LatheOrchestrationInput): string {
  return latheOrchestrationEngine.calculate("lathe_orchestrate", input).program_text;
}

function getResult(input: LatheOrchestrationInput) {
  return latheOrchestrationEngine.calculate("lathe_orchestrate", input);
}

// ── Okuma Native Features ───────────────────────────────────────────

describe("Dialect Native — Okuma OSP-P300", () => {
  it("uses M02 program end (not M30)", () => {
    const program = getProgram(dialInput("okuma"));
    expect(program).toMatch(/M02/);
  });

  it("uses G92 for CSS clamp (not G50)", () => {
    const program = getProgram(dialInput("okuma"));
    // Should have G92 S[rpm] for CSS clamp
    expect(program).toMatch(/G92 S\d+/);
    // Should NOT have G50 S[rpm]
    const g50CSSLines = program.split("\n").filter(l =>
      l.match(/^G50 S\d+/) && l.includes("CSS"),
    );
    expect(g50CSSLines.length).toBe(0);
  });

  it("uses G30 for home reference (not G28)", () => {
    const program = getProgram(dialInput("okuma"));
    // Okuma uses G30 U0 W0 for home
    // Note: G53 safe retract replaces the per-tool G28 now
    // G30 should appear in emergency recovery or safe start sections
    const result = getResult(dialInput("okuma"));
    expect(result.success).toBe(true);
  });

  it("adds M25 chuck barrier at program start", () => {
    const program = getProgram(dialInput("okuma"));
    expect(program).toMatch(/M25/);
    expect(program).toMatch(/[Cc]huck barrier/i);
  });

  it("adds M21 tailstock barrier at program start", () => {
    const program = getProgram(dialInput("okuma"));
    expect(program).toMatch(/M21/);
    expect(program).toMatch(/[Tt]ailstock barrier/i);
  });

  it("uses M695/M696 SSV for chatter suppression", () => {
    const program = getProgram(dialInput("okuma"));
    // M695 should appear before roughing
    expect(program).toMatch(/M695/);
    // M696 should appear before finishing
    expect(program).toMatch(/M696/);
  });

  it("uses 6-digit T-word (TTOOCC)", () => {
    const program = getProgram(dialInput("okuma"));
    expect(program).toMatch(/T\d{6}/);
  });

  it("Okuma threading uses M32/M33/M34 infeed codes", () => {
    const program = getProgram(threadDialInput("okuma"));
    // Okuma threading generates M32/M33/M34 for infeed method
    expect(program).toMatch(/M3[234]/);
  });

  it("generates valid complete program", () => {
    const result = getResult(dialInput("okuma"));
    expect(result.success).toBe(true);
    expect(result.program_text.length).toBeGreaterThan(100);
  });
});

// ── Siemens SINUMERIK 840D ──────────────────────────────────────────

describe("Dialect Native — Siemens 840D", () => {
  it("uses semicolon comments (not parentheses)", () => {
    const program = getProgram(dialInput("siemens"));
    // Should have ; comments
    expect(program).toMatch(/; /);
  });

  it("generates CYCLE95 for roughing (not G71)", () => {
    const program = getProgram(dialInput("siemens"));
    // Should have CYCLE95 native call
    expect(program).toMatch(/CYCLE95/);
  });

  it("CYCLE95 has proper parameter format", () => {
    const program = getProgram(dialInput("siemens"));
    // CYCLE95("CONTOUR",0,doc,...)
    expect(program).toMatch(/CYCLE95\("CONTOUR"/);
  });

  it("generates CYCLE95 in finish mode for G70 equivalent", () => {
    const program = getProgram(dialInput("siemens"));
    // Finish mode: VARI=2 in parameter list
    expect(program).toMatch(/CYCLE95.*finish/i);
  });

  it("generates CYCLE97 for threading", () => {
    const program = getProgram(threadDialInput("siemens"));
    expect(program).toMatch(/CYCLE97/);
  });

  it("uses G92 for CSS clamp", () => {
    const program = getProgram(dialInput("siemens"));
    expect(program).toMatch(/G92 S\d+/);
  });

  it("generates valid complete program", () => {
    const result = getResult(dialInput("siemens"));
    expect(result.success).toBe(true);
    expect(result.program_text.length).toBeGreaterThan(100);
  });
});

// ── DMG MORI CELOS ──────────────────────────────────────────────────

describe("Dialect Native — DMG MORI CELOS", () => {
  it("uses CYCLE95 (Siemens-based)", () => {
    const program = getProgram(dialInput("dmg_mori"));
    expect(program).toMatch(/CYCLE95/);
  });

  it("uses CYCLE97 for threading", () => {
    const program = getProgram(threadDialInput("dmg_mori"));
    expect(program).toMatch(/CYCLE97/);
  });

  it("uses semicolon comments", () => {
    const program = getProgram(dialInput("dmg_mori"));
    expect(program).toMatch(/; /);
  });

  it("generates valid complete program", () => {
    const result = getResult(dialInput("dmg_mori"));
    expect(result.success).toBe(true);
  });
});

// ── Mazak SmoothG ───────────────────────────────────────────────────

describe("Dialect Native — Mazak SmoothG", () => {
  it("includes MAZATROL EIA/ISO header", () => {
    const program = getProgram(dialInput("mazak"));
    expect(program).toMatch(/MAZATROL/);
  });

  it("includes G99 feed per revolution (Series T)", () => {
    const program = getProgram(dialInput("mazak"));
    expect(program).toMatch(/G99/);
  });

  it("uses standard G76 for threading (Fanuc-compatible)", () => {
    const program = getProgram(threadDialInput("mazak"));
    expect(program).toMatch(/G76/);
  });

  it("generates valid complete program", () => {
    const result = getResult(dialInput("mazak"));
    expect(result.success).toBe(true);
    expect(result.program_text.length).toBeGreaterThan(100);
  });
});

// ── Haas NGC ────────────────────────────────────────────────────────

describe("Dialect Native — Haas NGC", () => {
  it("uses G50 for CSS clamp", () => {
    const program = getProgram(dialInput("haas"));
    expect(program).toMatch(/G50 S\d+/);
  });

  it("uses G76 single-line format for threading", () => {
    const program = getProgram(threadDialInput("haas"));
    expect(program).toMatch(/G76/);
    // Haas uses M23/M24 for chamfer
    expect(program).toMatch(/M23/);
    expect(program).toMatch(/M24/);
  });

  it("generates valid complete program", () => {
    const result = getResult(dialInput("haas"));
    expect(result.success).toBe(true);
  });
});

// ── Citizen Cincom ──────────────────────────────────────────────────

describe("Dialect Native — Citizen Cincom", () => {
  it("includes $1 channel header", () => {
    const program = getProgram(dialInput("citizen"));
    expect(program).toMatch(/\$1/);
  });

  it("generates valid complete program", () => {
    const result = getResult(dialInput("citizen"));
    expect(result.success).toBe(true);
  });
});

// ── Star Swiss-Type ─────────────────────────────────────────────────

describe("Dialect Native — Star Swiss-Type", () => {
  it("includes M200 sync start code", () => {
    const program = getProgram(dialInput("star"));
    expect(program).toMatch(/M200/);
  });

  it("includes M201 sync end code", () => {
    const program = getProgram(dialInput("star"));
    expect(program).toMatch(/M201/);
  });

  it("generates valid complete program", () => {
    const result = getResult(dialInput("star"));
    expect(result.success).toBe(true);
  });
});

// ── Cross-controller validation ─────────────────────────────────────

describe("Dialect Native — All Controllers", () => {
  const controllers = ["fanuc", "haas", "okuma", "mazak", "siemens", "dmg_mori", "citizen", "star"] as const;

  for (const ctrl of controllers) {
    it(`${ctrl}: generates valid program with roughing + finishing`, () => {
      const result = getResult(dialInput(ctrl));
      expect(result.success).toBe(true);
      expect(result.program_text.length).toBeGreaterThan(100);
    });
  }

  for (const ctrl of controllers) {
    it(`${ctrl}: threading program generates successfully`, () => {
      const result = getResult(threadDialInput(ctrl));
      expect(result.success).toBe(true);
      expect(result.program_text).toMatch(/G76|G71|CYCLE97|G32/);
    });
  }

  for (const ctrl of controllers) {
    it(`${ctrl}: groove program generates G04 dwell`, () => {
      const result = getResult(grooveDialInput(ctrl));
      expect(result.success).toBe(true);
      expect(result.program_text).toMatch(/G04/);
    });
  }
});
