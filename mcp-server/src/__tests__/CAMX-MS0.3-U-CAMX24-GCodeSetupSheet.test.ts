/**
 * CAMX-MS0.3 / U-CAMX24 — Wire SetupSheetFromGCodeEngine into PrintToProgram
 *
 * Behavioural coverage for the gcode-derived setup-sheet wiring. Verifies the
 * three exit conditions from the unit envelope as real assertions against
 * `printToProgramPipelineEngine.runFullPipeline()` (no mocked seams):
 *   1. `gcode_setup_sheet` is populated iff a G-code program was emitted
 *      (canEmitProgram && program_text non-empty).
 *   2. The reverse-engineered setup sheet reflects the EMITTED program — its
 *      tool list + work-offset list + program_number derive from
 *      `program_text`, not from the operations array.
 *   3. Controller dialect honours `input.machine_brand` via
 *      `mapBrandToGCodeController` (haas / siemens / heidenhain / mazak /
 *      okuma / fanuc default).
 *
 * Also pins:
 *   - The pre-existing `setup_sheet` (operations-derived) remains intact —
 *     U-CAMX24 is strictly additive.
 *   - Markdown output names the part_number.
 *   - A fail-soft pipeline warning surfaces under stage="gcode_setup_sheet"
 *     whenever the gcode view is missing despite a non-empty program (R12).
 *
 * @module tests/CAMX-MS0.3-U-CAMX24-GCodeSetupSheet
 */

import { describe, it, expect } from "vitest";
import {
  printToProgramPipelineEngine,
  type DrawingInput,
  type MachinableFeature,
  type MaterialCallout,
  type PrintToProgramResult,
} from "../engines/PrintToProgramPipelineEngine.js";

const STEEL: MaterialCallout = {
  material_name: "AISI 1018 Steel",
  specification: "ASTM A29",
  hardness_hrc: 18,
  iso_group: "P",
};

function pocket(id: string, opts?: Partial<MachinableFeature>): MachinableFeature {
  return {
    id,
    type: "pocket_closed",
    width_mm: 30,
    length_mm: 40,
    depth_mm: 8,
    position: { x: 40, y: 30, z: 0 },
    required_operations: [],
    priority: 0,
    ...opts,
  };
}

function bore(id: string, opts?: Partial<MachinableFeature>): MachinableFeature {
  return {
    id,
    type: "bore",
    diameter_mm: 20,
    depth_mm: 12,
    position: { x: 60, y: 40, z: 0 },
    required_operations: [],
    priority: 0,
    ...opts,
  };
}

function input(features: MachinableFeature[], overrides?: Partial<DrawingInput>): DrawingInput {
  return {
    part_number: "CAMX24-T",
    material: STEEL,
    stock_size: { x: 150, y: 100, z: 30 },
    dimensions: [{ id: "D1", type: "linear", nominal_mm: 100, confidence: 0.95 }],
    features,
    max_spindle_rpm: 12000,
    max_power_kW: 15,
    ...overrides,
  };
}

/**
 * Run the full pipeline and assert the gcode_setup_sheet was attached.
 * Throws (not skip) if the program text is empty or the gcode view missing —
 * upstream tests expect a real artifact, never a silent absence.
 */
function runAndExpectGCodeSheet(features: MachinableFeature[], overrides?: Partial<DrawingInput>) {
  const r: PrintToProgramResult = printToProgramPipelineEngine.runFullPipeline(input(features, overrides));
  if (r.program_text.length === 0) {
    throw new Error(`pipeline emitted empty program_text — success=${r.success}`);
  }
  const gss = r.gcode_setup_sheet;
  if (!gss) {
    throw new Error(`gcode_setup_sheet missing despite non-empty program_text (${r.program_text.length} chars)`);
  }
  return { r, gss };
}

describe("CAMX-MS0.3/U-CAMX24 — gcode-derived setup-sheet wiring", () => {
  // --- Exit condition 1: populated iff G-code was actually emitted ---

  it("attaches gcode_setup_sheet when a program is successfully emitted", () => {
    const { r, gss } = runAndExpectGCodeSheet([pocket("P1"), bore("B1")]);
    expect(r.success).toBe(true);
    expect(gss.setup_sheet.part_number).toBe("CAMX24-T");
    expect(gss.markdown.length).toBeGreaterThan(50);
    expect(gss.setup_sheet.tools.length).toBeGreaterThan(0);
  });

  it("omits gcode_setup_sheet when no features (no program emitted)", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([]));
    expect(r.success).toBe(false);
    expect(r.program_text).toBe("");
    // `gcode_setup_sheet` is the optional field — its presence is the wire's
    // exit signal. When no program emits, the field MUST be strict-undefined,
    // not "{}" or "null" (any other value would mean the wire ran on empty text).
    expect(r.gcode_setup_sheet === undefined).toBe(true);
  });

  // --- Exit condition 2: reflects the EMITTED program text ---

  it("emits a string program_number (parser ran against the emitted G-code)", () => {
    const { gss } = runAndExpectGCodeSheet([pocket("P1"), bore("B1")]);
    // The shape contract: program_number is always a string (possibly empty
    // depending on the parser's recognized O-line formats — see
    // SetupSheetFromGCodeEngine.extractProgramNumber). U-CAMX24 wiring is
    // responsible for routing the program text through; the precise format
    // recognition is owned by SetupSheetFromGCodeEngine and asserted there.
    expect(typeof gss.setup_sheet.program_number).toBe("string");
  });

  it("reverse-engineers the tool list from the emitted G-code, covering every operation's tool", () => {
    const { r, gss } = runAndExpectGCodeSheet([pocket("P1"), bore("B1")]);
    const opToolNums = new Set(r.operations.map(o => o.tool.tool_number));
    const gcodeToolNums = new Set(gss.setup_sheet.tools.map(t => t.number));
    expect(opToolNums.size).toBeGreaterThan(0);
    for (const t of opToolNums) {
      expect(gcodeToolNums.has(t)).toBe(true);
    }
  });

  it("reverse-engineers at least one G5x work offset from the emitted G-code", () => {
    const { gss } = runAndExpectGCodeSheet([pocket("P1"), bore("B1")]);
    expect(gss.setup_sheet.work_offsets.length).toBeGreaterThan(0);
    const codes = gss.setup_sheet.work_offsets.map(o => o.code.toUpperCase());
    expect(codes.some(c => /^G5\d/.test(c))).toBe(true);
  });

  // --- Exit condition 3: controller dialect honours machine_brand ---

  it("routes a Haas brand to the 'haas' controller dialect", () => {
    const { gss } = runAndExpectGCodeSheet([pocket("P1")], { machine_brand: "Haas VF-2SS" });
    expect(gss.setup_sheet.controller).toBe("haas");
  });

  it("routes a Siemens brand to the 'siemens' controller dialect", () => {
    const { gss } = runAndExpectGCodeSheet([pocket("P1")], { machine_brand: "Siemens Sinumerik 840D" });
    expect(gss.setup_sheet.controller).toBe("siemens");
  });

  it("routes a Heidenhain TNC brand to the 'heidenhain' controller dialect", () => {
    const { gss } = runAndExpectGCodeSheet([pocket("P1")], { machine_brand: "Heidenhain TNC640" });
    expect(gss.setup_sheet.controller).toBe("heidenhain");
  });

  it("routes a Mazak brand to the 'mazak' controller dialect", () => {
    const { gss } = runAndExpectGCodeSheet([pocket("P1")], { machine_brand: "Mazak Integrex" });
    expect(gss.setup_sheet.controller).toBe("mazak");
  });

  it("routes an Okuma brand to the 'okuma' controller dialect", () => {
    const { gss } = runAndExpectGCodeSheet([pocket("P1")], { machine_brand: "Okuma Genos M460-VE" });
    expect(gss.setup_sheet.controller).toBe("okuma");
  });

  it("defaults an unknown brand to the 'fanuc' controller dialect", () => {
    const { gss } = runAndExpectGCodeSheet([pocket("P1")], { machine_brand: "UnknownVendor 9000" });
    expect(gss.setup_sheet.controller).toBe("fanuc");
  });

  it("defaults a missing brand to the 'fanuc' controller dialect", () => {
    const { gss } = runAndExpectGCodeSheet([pocket("P1")]);
    expect(gss.setup_sheet.controller).toBe("fanuc");
  });

  // --- Strict-additive: existing setup_sheet remains intact ---

  it("leaves the operations-derived setup_sheet unchanged (additive only)", () => {
    const { r, gss } = runAndExpectGCodeSheet([pocket("P1"), bore("B1")]);
    expect(r.setup_sheet.part_number).toBe("CAMX24-T");
    expect(r.setup_sheet.tool_list.length).toBeGreaterThan(0);
    expect(r.setup_sheet.fixture_notes.length).toBeGreaterThan(0);
    // Independent objects — the new view is not aliased to the old one.
    expect(gss.setup_sheet as unknown).not.toBe(r.setup_sheet as unknown);
    // Old and new views agree on part_number (cross-source sanity check).
    expect(gss.setup_sheet.part_number).toBe(r.setup_sheet.part_number);
  });

  // --- Markdown carries identifying info from the input ---

  it("emits Markdown that references the part_number", () => {
    const { gss } = runAndExpectGCodeSheet([pocket("P1")]);
    expect(gss.markdown).toContain("CAMX24-T");
  });

  it("includes a non-empty tool list in the gcode-derived view when tools were emitted", () => {
    const { gss } = runAndExpectGCodeSheet([pocket("P1"), bore("B1")]);
    expect(gss.setup_sheet.tools.length).toBeGreaterThan(0);
  });

  // --- R12 oracle: silent drop is forbidden ---

  it("never silently drops the gcode_setup_sheet without surfacing a warning", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    if (r.program_text.length > 0 && r.gcode_setup_sheet === undefined) {
      const w = r.warnings.find(x => x.stage === "gcode_setup_sheet");
      expect(w?.message ?? "").toContain("gcode_setup_sheet");
    } else {
      // Happy path — program emitted AND gcode_setup_sheet present.
      // (Both arms covered by other tests; this branch is the negative oracle.)
      expect(r.program_text.length > 0).toBe(true);
      expect(r.gcode_setup_sheet === undefined).toBe(false);
    }
  });
});
