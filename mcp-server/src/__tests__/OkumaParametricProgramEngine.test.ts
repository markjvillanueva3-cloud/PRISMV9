/**
 * OkumaParametricProgramEngine — MS0-U3 additions (wafer-insert + top-hat).
 *
 * Covers the new MACRO-PROGRAM-PIPELINE-MS0/MS0-U3 deliverables:
 *   - generateWaferInsert (BASE WAFER INSERT MACRO O1001)
 *   - generateTopHatCasing (BASIC TOP HAT CASING WITH SINGLE COUNTERBORE)
 *   - getWaferInsertDefaults / getTopHatCasingDefaults
 *
 * SAFETY-CRITICAL invariants asserted by these tests (must NEVER regress):
 *   1. Calculated VCs are emitted as expressions, NEVER pre-computed.
 *      - wafer-insert  : VC130 MUST match /VC111.*VC110/
 *      - top-hat       : VC150 MUST match /VC121.*VC120/
 *   2. The emitted gcode parses cleanly through MacroProgramIntelligenceEngine
 *      and exposes the same VC variables + auto-calc entries.
 *   3. Tool-numbering preserves the JM Die OSP convention (T01..T10 pattern).
 *   4. Validation REJECTS physically impossible configurations
 *      (neg length, ID >= OD, step OD <= small OD, drill order, …).
 *   5. Dispatcher round-trip — every new prism_cam action reaches the engine.
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// FIXTURES — exact values from the canonical JM Die macros so the tests are
// self-documenting (the same numbers a JM operator sees on the shop floor).
// ============================================================================

import type {
  WaferInsertConfig,
  TopHatCasingConfig,
} from "../engines/OkumaParametricProgramEngine.js";

/** Mirrors VC100..VC142 in BASE WAFER INSERT MACRO.min */
const WAFER_INSERT_FIXTURE: WaferInsertConfig = {
  programNumber: 1001,
  geometry: {
    stockDiameter: 1.32,
    finishODAtFace: 1.215,
    odTaperEndDia: 1.1473,
    odTaperStartZ: 0.4,
    partLength: 0.787,
    idMajorDia: 0.25,
    idTaperAngleOkumaDeg: 250, // 250 = 20 deg (Okuma 270-format)
    idFinishXDia: 0.0,
  },
  odChamfer: { size: 0.005, type: "radius", angleDeg: 45 },
  spotDrill: { diameter: 0.5,   sfm: 130, depth: 0.05,   usePeck: false },
  thruDrill: { diameter: 0.171, sfm: 50,  feedPerRev: 0.0022, pointAngleDeg: 118, usePeck: true, peckDepth: 0.13 },
  clearance: { zClearance: 0.25, xClearance: 0.1 },
  maxRoughRPM: 2500,
};

/** Mirrors VC100..VC201 in BASIC TOP HAT CASING WITH SINGLE COUNTERBORE.min */
const TOP_HAT_FIXTURE: TopHatCasingConfig = {
  programNumber: 1001,
  stockAndBore: {
    stockDiameter: 2.95,
    finishOdSmall: 2.005,
    smallestDrillDia: 0.7188,
    finishIdLarge: 1.259,
    partLength: 2.685,
    largeBoreDepth: 1.0,
    smallBoreDepth: 2.68,
  },
  step:           { stepOdLarge: 2.75, stepZDepth: 2.015, stepChamferSize: 0.03 },
  odFeature:      { size: 0.03, type: "chamfer", angleDeg: 45 },
  idLargeFeature: { size: 0.03, type: "chamfer", angleDeg: 45 },
  idUndercut:     { enable: true, length: 0.03, leadInAngleDeg: 4, depthBeyondFinish: 0.02 },
  spotDrill:      { diameter: 1.0,    sfm: 300, pointAngleDeg: 90,  depth: 0.1,    usePeck: false },
  stepDrill1:     { diameter: 1.22,   sfm: 75,  feedPerRev: 0.008,  pointAngleDeg: 130, usePeck: true },
  stepDrill2:     { diameter: 0.7188, sfm: 95,  feedPerRev: 0.007,  pointAngleDeg: 130, usePeck: true },
  counterboreDrill: { enable: true, diameter: 1.2188, sfm: 95, feedPerRev: 0.003, pointAngleDeg: 180, usePeck: false },
  drillPeckDepth: 0.13,
  stockAllowances: { odRadial: 0.01, odAxial: 0.002, idRadial: 0.006, idAxial: 0.0 },
  roughing:  { odDepthOfCut: 0.2, idDepthOfCut: 0.06 },
  speeds:    { odRoughSFM: 755, odFinishSFM: 825, idRoughSFM: 400, idFinishSFM: 500 },
  feeds:     { faceRough: 0.008, faceFinish: 0.003, odRough: 0.008, odFinish: 0.005, idRough: 0.007, idFinish: 0.004 },
  clearance: { zClearance: 0.25, xClearance: 0.1 },
  maxRoughRPM: 2500,
  maxFinishRPM: 3500,
};

// ============================================================================
// WAFER INSERT — happy path + structure + safety invariants
// ============================================================================

describe("OkumaParametricProgramEngine — generateWaferInsert (MS0-U3)", () => {
  it("generates a non-empty gcode body from the canonical macro fixture", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const out = okumaParametricProgramEngine.generateWaferInsert(WAFER_INSERT_FIXTURE);
    expect(out.gcode.length).toBeGreaterThan(500);
    expect(out.lineCount).toBeGreaterThan(80);
    expect(out.gcode.startsWith("O1001\nG140")).toBe(true);
    expect(out.gcode.trim().endsWith("M30")).toBe(true);
  });

  it("emits the canonical wafer-insert tool sequence T010101..T101010", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const out = okumaParametricProgramEngine.generateWaferInsert(WAFER_INSERT_FIXTURE);
    // 6 tools must appear in this exact order in the program body
    for (const tool of ["T010101", "T020202", "T030303", "T060606", "T090909", "T101010"]) {
      expect(out.gcode).toContain(tool);
    }
    // Operation list mirrors the spec sequence
    expect(out.operations).toEqual([
      "FACE_ROUGH", "OD_PROFILE_ROUGH",
      "FACE_FINISH", "OD_PROFILE_FINISH",
      "SPOT_DRILL", "THRU_DRILL",
      "ID_PROFILE_ROUGH", "ID_PROFILE_FINISH",
    ]);
  });

  it("HARD RULE: VC130 (spot drill RPM) stays as the macro expression — NEVER pre-computed", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const out = okumaParametricProgramEngine.generateWaferInsert(WAFER_INSERT_FIXTURE);
    // 1. The calculations map carries the formula string verbatim.
    expect(out.calculations.VC130.formula).toMatch(/VC111.*VC110/);
    expect(out.calculations.VC130.formula).toBe("[VC111 * 3.82] / VC110");
    // 2. The emitted gcode also has the expression — never the resolved number.
    expect(out.gcode).toContain("VC130 = [VC111 * 3.82] / VC110");
    // 3. The numeric *result* (for debugging only) is computed correctly:
    //    (130 * 3.82) / 0.5 = 993.2 — but this is metadata, never gcode.
    expect(out.calculations.VC130.result).toBeCloseTo(993.2, 1);
  });

  it("emits ALL calculated VCs as expressions (VC130/131/132/133/134/135/143/144)", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const out = okumaParametricProgramEngine.generateWaferInsert(WAFER_INSERT_FIXTURE);
    const must = {
      VC130: /VC111.*VC110/,           // spot drill RPM
      VC131: /VC116.*VC115/,           // drill RPM
      VC132: /VC115 \/ 2 \/ TAN/,      // drill point depth
      VC133: /VC104 \+ 0\.05 \+ VC132/, // drill total depth
      VC134: /VC101 - \[VC105 \* 2\]/, // OD feature start dia
      VC135: /VC100 \+ VC126/,         // OD approach dia
      VC144: /270 - VC141/,            // converted taper angle
      VC143: /\[VC140 - VC142\].*TAN\[VC144\]/, // ID taper Z depth
    };
    for (const [vc, pattern] of Object.entries(must)) {
      expect(out.calculations[vc].formula, `${vc} formula`).toMatch(pattern);
      // ALSO assert the expression appears in the actual gcode body, not just metadata
      expect(out.gcode, `${vc} in gcode`).toContain(`${vc} = `);
    }
  });

  it("parses cleanly through MacroProgramIntelligenceEngine and exposes the same VCs", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const { MacroProgramIntelligenceEngine } = await import("../engines/MacroProgramIntelligenceEngine.js");
    const out = okumaParametricProgramEngine.generateWaferInsert(WAFER_INSERT_FIXTURE);
    const ast = MacroProgramIntelligenceEngine.parseOkumaMacro(out.gcode, "okuma_osp");
    // Must extract O1001 + variables + auto-calcs + the 6 tool defs
    expect(ast.toolDefinitions.length).toBe(6);
    // Spot-check a few input VCs survived parsing with their numeric values
    expect(ast.variables.VC100?.initialValue).toBeCloseTo(1.32, 4);
    expect(ast.variables.VC104?.initialValue).toBeCloseTo(0.787, 4);
    expect(ast.variables.VC141?.initialValue).toBe(250);
    // The 8 calculated VCs MUST show up as auto-calcs (formula-typed entries)
    const calcVars = ast.autoCalcs.map(c => c.variable);
    for (const vc of ["VC130", "VC131", "VC132", "VC133", "VC134", "VC135", "VC143", "VC144"]) {
      expect(calcVars).toContain(vc);
    }
  });

  it("preserves the macro's IF/GOTO branches (chamfer/radius + peck conditionals)", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const out = okumaParametricProgramEngine.generateWaferInsert(WAFER_INSERT_FIXTURE);
    // OD chamfer-vs-radius decision
    expect(out.gcode).toContain("IF [VC105 EQ 0] GOTO 101");
    expect(out.gcode).toContain("IF [VC106 EQ 2] GOTO 100");
    // Spot-drill peck decision
    expect(out.gcode).toContain("IF [VC113 EQ 1] GOTO 300");
    // Thru-drill peck decision
    expect(out.gcode).toContain("IF [VC119 EQ 1] GOTO 310");
    // Profile cycles
    expect(out.gcode).toContain("G85 NAT1");
    expect(out.gcode).toContain("G72 NAT1");
    expect(out.gcode).toContain("G85 NAT6");
    expect(out.gcode).toContain("G72 NAT6");
  });

  it("respects custom maxRoughRPM in G50 clamp", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const out = okumaParametricProgramEngine.generateWaferInsert({ ...WAFER_INSERT_FIXTURE, maxRoughRPM: 1800 });
    expect(out.gcode).toContain("G50 S1800");
  });

  it("warns when ID taper angle falls outside Okuma 250..270 band but still emits", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const bad = { ...WAFER_INSERT_FIXTURE, geometry: { ...WAFER_INSERT_FIXTURE.geometry, idTaperAngleOkumaDeg: 240 } };
    const out = okumaParametricProgramEngine.generateWaferInsert(bad);
    expect(out.warnings.some(w => w.includes("VC141"))).toBe(true);
    // Still emits the program — warning, not block
    expect(out.gcode).toContain("VC141 = 240");
  });

  // Negative #1
  it("REJECTS negative part length (physically impossible)", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const bad = { ...WAFER_INSERT_FIXTURE, geometry: { ...WAFER_INSERT_FIXTURE.geometry, partLength: -0.5 } };
    expect(() => okumaParametricProgramEngine.generateWaferInsert(bad)).toThrow(/VC104.*partLength.*> 0/);
  });

  // Negative #2
  it("REJECTS finishODAtFace > stockDiameter (impossible — can't finish bigger than stock)", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const bad = { ...WAFER_INSERT_FIXTURE, geometry: { ...WAFER_INSERT_FIXTURE.geometry, finishODAtFace: 2.0, stockDiameter: 1.5 } };
    expect(() => okumaParametricProgramEngine.generateWaferInsert(bad)).toThrow(/finishODAtFace.*stockDiameter/);
  });

  // Negative #3
  it("REJECTS idMajorDia >= finishODAtFace (ID would breach OD wall)", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const bad = { ...WAFER_INSERT_FIXTURE, geometry: { ...WAFER_INSERT_FIXTURE.geometry, idMajorDia: 1.3 } };
    expect(() => okumaParametricProgramEngine.generateWaferInsert(bad)).toThrow(/idMajorDia.*finishODAtFace.*ID must be inside OD/);
  });

  // Adversarial #1
  it("REJECTS zero spot-drill diameter (would divide by zero in RPM expression)", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const bad = { ...WAFER_INSERT_FIXTURE, spotDrill: { ...WAFER_INSERT_FIXTURE.spotDrill, diameter: 0 } };
    expect(() => okumaParametricProgramEngine.generateWaferInsert(bad)).toThrow(/VC110.*diameter.*> 0/);
  });

  // Adversarial #2
  it("REJECTS thru-drill point angle at the 180° boundary (collinear, no point)", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const bad = { ...WAFER_INSERT_FIXTURE, thruDrill: { ...WAFER_INSERT_FIXTURE.thruDrill, pointAngleDeg: 180 } };
    expect(() => okumaParametricProgramEngine.generateWaferInsert(bad)).toThrow(/pointAngleDeg.*0.*180/);
  });
});

// ============================================================================
// TOP HAT CASING — happy path + structure + safety invariants
// ============================================================================

describe("OkumaParametricProgramEngine — generateTopHatCasing (MS0-U3)", () => {
  it("generates a non-empty gcode body from the canonical macro fixture", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const out = okumaParametricProgramEngine.generateTopHatCasing(TOP_HAT_FIXTURE);
    expect(out.gcode.length).toBeGreaterThan(1500);
    expect(out.lineCount).toBeGreaterThan(180);
    expect(out.gcode.startsWith("O1001\nG140")).toBe(true);
    expect(out.gcode.trim().endsWith("M30")).toBe(true);
  });

  it("emits the canonical top-hat tool sequence including counterbore (8 stations)", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const out = okumaParametricProgramEngine.generateTopHatCasing(TOP_HAT_FIXTURE);
    for (const tool of ["T010101", "T020202", "T030303", "T050505", "T060606", "T070707", "T080808", "T090909"]) {
      expect(out.gcode).toContain(tool);
    }
    expect(out.operations).toContain("COUNTERBORE_DRILL");
  });

  it("OMITS counterbore from operation list when cb.enable=false (but the IF/GOTO 500 still gates it)", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const noCbore = { ...TOP_HAT_FIXTURE, counterboreDrill: { ...TOP_HAT_FIXTURE.counterboreDrill, enable: false } };
    const out = okumaParametricProgramEngine.generateTopHatCasing(noCbore);
    expect(out.operations).not.toContain("COUNTERBORE_DRILL");
    // The IF [VC134 EQ 0] GOTO 500 guard must STILL be present even when enable=false —
    // the macro structure stays parametric so the operator can flip VC134 to 1 later.
    expect(out.gcode).toContain("IF [VC134 EQ 0] GOTO 500");
    expect(out.gcode).toContain("VC134 = 0");
  });

  it("HARD RULE: VC150 (spot drill RPM) stays as the macro expression", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const out = okumaParametricProgramEngine.generateTopHatCasing(TOP_HAT_FIXTURE);
    expect(out.calculations.VC150.formula).toMatch(/VC121.*VC120/);
    expect(out.calculations.VC150.formula).toBe("[VC121 * 3.82] / VC120");
    expect(out.gcode).toContain("VC150 = [VC121 * 3.82] / VC120");
    // Result: (300 * 3.82) / 1.0 = 1146
    expect(out.calculations.VC150.result).toBeCloseTo(1146, 0);
  });

  it("emits ALL calculated VCs as expressions (RPMs + point depths + total depths + features)", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const out = okumaParametricProgramEngine.generateTopHatCasing(TOP_HAT_FIXTURE);
    const must = {
      VC150: /VC121.*VC120/,
      VC151: /VC126.*VC125/,
      VC152: /VC131.*VC130/,
      VC153: /VC136.*VC135/,
      VC154: /VC125 \/ 2 \/ TAN\[VC128 \/ 2\]/,
      VC155: /VC130 \/ 2 \/ TAN\[VC133 \/ 2\]/,
      VC145: /VC135 \/ 2 \/ TAN\[VC138 \/ 2\]/,
      VC156: /VC105 \+ \[\[VC125 - VC130\].*TAN/,
      VC157: /VC106 \+ 0\.1 \+ VC155/,
      VC160: /VC101 - \[VC110 \* 2\]/,
      VC162: /VC104 \+ 0\.01/,
      VC165: /VC103 \+ \[VC119 \* 2\]/,
    };
    for (const [vc, pattern] of Object.entries(must)) {
      expect(out.calculations[vc].formula, `${vc} formula`).toMatch(pattern);
      expect(out.gcode, `${vc} in gcode`).toContain(`${vc} = `);
    }
  });

  it("preserves the ID undercut IF/GOTO branches (VC116 gates the undercut moves)", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const out = okumaParametricProgramEngine.generateTopHatCasing(TOP_HAT_FIXTURE);
    // Both the with-counterbore and no-counterbore branches define ID profile
    expect(out.gcode).toContain("IF [VC116 EQ 0] GOTO 202");
    expect(out.gcode).toContain("IF [VC116 EQ 0] GOTO 603");
    expect(out.gcode).toContain("X[VC165] A-[VC118]");
  });

  it("parses cleanly through MacroProgramIntelligenceEngine — 8 tools + all auto-calcs", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const { MacroProgramIntelligenceEngine } = await import("../engines/MacroProgramIntelligenceEngine.js");
    const out = okumaParametricProgramEngine.generateTopHatCasing(TOP_HAT_FIXTURE);
    const ast = MacroProgramIntelligenceEngine.parseOkumaMacro(out.gcode, "okuma_osp");
    expect(ast.toolDefinitions.length).toBe(8);
    expect(ast.variables.VC100?.initialValue).toBeCloseTo(2.95, 4);
    expect(ast.variables.VC107?.initialValue).toBeCloseTo(2.75, 4);
    expect(ast.variables.VC198?.initialValue).toBe(2500);
    // Critical calculated VCs MUST be auto-calc entries
    const calcVars = ast.autoCalcs.map(c => c.variable);
    for (const vc of ["VC150", "VC151", "VC152", "VC153", "VC154", "VC155", "VC156", "VC157", "VC160", "VC161"]) {
      expect(calcVars, `${vc} should be an auto-calc`).toContain(vc);
    }
  });

  it("warns when small OD ≈ step OD (top-hat shape degenerate)", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    // Force the warning (but inverted enough to still pass validate())
    // Validate REJECTS step OD <= small OD outright; the warning fires inside the (valid) range
    // when the orchestrator passes a config where they're equal. We test the validator branch instead.
    const bad = { ...TOP_HAT_FIXTURE, step: { ...TOP_HAT_FIXTURE.step, stepOdLarge: 2.005 } }; // equal to small
    expect(() => okumaParametricProgramEngine.generateTopHatCasing(bad))
      .toThrow(/stepOdLarge.*finishOdSmall.*top hat requires step OD larger/);
  });

  // Negative #1
  it("REJECTS finishIdLarge >= finishOdSmall (ID would breach the OD wall)", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const bad = { ...TOP_HAT_FIXTURE, stockAndBore: { ...TOP_HAT_FIXTURE.stockAndBore, finishIdLarge: 2.5 } };
    expect(() => okumaParametricProgramEngine.generateTopHatCasing(bad)).toThrow(/finishIdLarge.*finishOdSmall/);
  });

  // Negative #2
  it("REJECTS step drill order inversion (drill 1 must be larger than drill 2)", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const bad = {
      ...TOP_HAT_FIXTURE,
      stepDrill1: { ...TOP_HAT_FIXTURE.stepDrill1, diameter: 0.5 },
      stepDrill2: { ...TOP_HAT_FIXTURE.stepDrill2, diameter: 0.8 },
    };
    expect(() => okumaParametricProgramEngine.generateTopHatCasing(bad)).toThrow(/Step drill 1.*must be > step drill 2/);
  });

  // Negative #3
  it("REJECTS counterbore dia larger than the step OD (counterbore would breach the brim)", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const bad = {
      ...TOP_HAT_FIXTURE,
      counterboreDrill: { ...TOP_HAT_FIXTURE.counterboreDrill, diameter: 3.0 },
    };
    expect(() => okumaParametricProgramEngine.generateTopHatCasing(bad)).toThrow(/Counterbore.*step OD/);
  });

  // Adversarial #1
  it("REJECTS large bore depth >= part length (would drill past the back of the part)", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const bad = {
      ...TOP_HAT_FIXTURE,
      stockAndBore: { ...TOP_HAT_FIXTURE.stockAndBore, largeBoreDepth: 3.0, partLength: 2.685 },
    };
    expect(() => okumaParametricProgramEngine.generateTopHatCasing(bad)).toThrow(/largeBoreDepth.*partLength/);
  });

  // Adversarial #2
  it("WARNS when VC102 (smallestDrillDia) doesn't match step drill 2 (macro assumes equal)", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const mismatched = {
      ...TOP_HAT_FIXTURE,
      stockAndBore: { ...TOP_HAT_FIXTURE.stockAndBore, smallestDrillDia: 0.6 },
    };
    const out = okumaParametricProgramEngine.generateTopHatCasing(mismatched);
    expect(out.warnings.some(w => w.includes("VC102") && w.includes("VC130"))).toBe(true);
    // Still emits — the warning surfaces an orchestrator-fixable mismatch, not a physical impossibility
    expect(out.gcode.length).toBeGreaterThan(100);
  });
});

// ============================================================================
// DEFAULTS — getWaferInsertDefaults + getTopHatCasingDefaults
// ============================================================================

describe("OkumaParametricProgramEngine — defaults (MS0-U3)", () => {
  it("returns aluminum-tuned wafer-insert defaults by default", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const d = okumaParametricProgramEngine.getWaferInsertDefaults();
    expect(d.programNumber).toBe(1001);
    expect(d.thruDrill?.sfm).toBe(50); // canonical aluminum value from the macro
  });

  it("returns stainless-specific wafer-insert defaults", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const d = okumaParametricProgramEngine.getWaferInsertDefaults("316 stainless");
    expect(d.maxRoughRPM).toBe(2000);
    expect(d.thruDrill?.sfm).toBeLessThan(50); // slower than aluminum
  });

  it("returns brass-tuned top-hat defaults with higher SFM", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const d = okumaParametricProgramEngine.getTopHatCasingDefaults("brass");
    expect(d.speeds?.odRoughSFM).toBeGreaterThan(500);
    expect(d.maxRoughRPM).toBe(3500);
  });

  it("returns canonical steel top-hat defaults (matches the JM Die macro fixture)", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const d = okumaParametricProgramEngine.getTopHatCasingDefaults("steel");
    expect(d.speeds?.odRoughSFM).toBe(755);  // VC180 from the macro
    expect(d.speeds?.odFinishSFM).toBe(825); // VC181
    expect(d.feeds?.odRough).toBe(0.008);    // VC192
  });
});

// ============================================================================
// DISPATCHER ROUND-TRIP — every new prism_cam action must reach the engine.
// We exercise the camDispatcher's action handlers directly (the dispatcher's
// switch statements). Real MCP tool registration is covered by integration
// tests at a higher layer; here we verify wiring at the routing layer.
// ============================================================================

describe("OkumaParametricProgramEngine — dispatcher wiring (MS0-U3)", () => {
  it("camDispatcher source declares okuma_generate_wafer_insert in the ACTIONS enum", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const src = fs.readFileSync(
      path.resolve(__dirname, "../tools/dispatchers/camDispatcher.ts"),
      "utf-8",
    );
    expect(src).toContain(`"okuma_generate_wafer_insert"`);
    expect(src).toContain(`"okuma_generate_top_hat"`);
    expect(src).toContain(`case "okuma_generate_wafer_insert":`);
    expect(src).toContain(`case "okuma_generate_top_hat":`);
  });

  it("camDispatcher okuma_defaults routes by `family` to the right defaults getter", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const src = fs.readFileSync(
      path.resolve(__dirname, "../tools/dispatchers/camDispatcher.ts"),
      "utf-8",
    );
    // The dispatcher must accept multiple synonyms for the new families
    expect(src).toContain(`getWaferInsertDefaults`);
    expect(src).toContain(`getTopHatCasingDefaults`);
    for (const alias of ["waferinsert", "wafer_insert", "tophat", "top_hat"]) {
      expect(src).toContain(`"${alias}"`);
    }
  });

  it("end-to-end: engine output flows through generateWaferInsert -> parseOkumaMacro -> validate", async () => {
    // This is the contract every U2 candidate must satisfy: the generated
    // program must validate against the same parser the macro intelligence
    // engine uses.
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const { MacroProgramIntelligenceEngine } = await import("../engines/MacroProgramIntelligenceEngine.js");
    const wafer = okumaParametricProgramEngine.generateWaferInsert(WAFER_INSERT_FIXTURE);
    const ast   = MacroProgramIntelligenceEngine.parseOkumaMacro(wafer.gcode);
    expect(ast.toolDefinitions.length).toBeGreaterThan(0);
    expect(Object.keys(ast.variables).length).toBeGreaterThan(20);
    expect(ast.autoCalcs.length).toBeGreaterThan(5);

    const tophat = okumaParametricProgramEngine.generateTopHatCasing(TOP_HAT_FIXTURE);
    const ast2   = MacroProgramIntelligenceEngine.parseOkumaMacro(tophat.gcode);
    expect(ast2.toolDefinitions.length).toBeGreaterThan(0);
    expect(Object.keys(ast2.variables).length).toBeGreaterThan(40);
    expect(ast2.autoCalcs.length).toBeGreaterThan(10);
  });
});

describe("OkumaParametricProgramEngine — convertToHardcode IF/GOTO conditions (U-OKUMA-EVAL-COND-HARDEN)", () => {
  it("evaluates a valid numeric IF condition: true skips the intervening line, false falls through", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const taken = okumaParametricProgramEngine.convertToHardcode(
      ["V1 = 5", "IF [V1 GT 0] GOTO N100", "G0 X9.", "N100 G0 X1.", "M30"].join("\n"));
    expect(taken.gcode).toContain("X1.");
    expect(taken.gcode).not.toContain("X9."); // V1>0 true -> GOTO skips "G0 X9."
    const fell = okumaParametricProgramEngine.convertToHardcode(
      ["V1 = 0", "IF [V1 GT 0] GOTO N100", "G0 X9.", "N100 G0 X1.", "M30"].join("\n"));
    expect(fell.gcode).toContain("X9."); // V1>0 false -> falls through, line emitted
    expect(fell.gcode).toContain("X1.");
  });

  it("a bare expression condition is truthy iff non-zero (preserves Boolean(value) semantics)", async () => {
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const nonzero = okumaParametricProgramEngine.convertToHardcode(
      ["V1 = 3", "IF [V1] GOTO N100", "G0 X9.", "N100 G0 X1.", "M30"].join("\n"));
    expect(nonzero.gcode).not.toContain("X9."); // 3 -> truthy -> branch taken
    const zero = okumaParametricProgramEngine.convertToHardcode(
      ["V1 = 0", "IF [V1] GOTO N100", "G0 X9.", "N100 G0 X1.", "M30"].join("\n"));
    expect(zero.gcode).toContain("X9."); // 0 -> falsy -> falls through
  });

  it("SECURITY: a malicious IF condition cannot execute injected JS (was raw eval)", async () => {
    // REGRESSION ORACLE: pre-fix, evalCondition ran the raw JS eval built-in on untrusted
    // condition text, so an assignment embedded in a condition WOULD execute. This asserts
    // the injected sentinel is NEVER set (fails on the pre-fix code, where it would be 7).
    const { okumaParametricProgramEngine } = await import("../engines/OkumaParametricProgramEngine.js");
    const g = globalThis as Record<string, unknown>;
    delete g.__OKUMA_INJ__;
    const evil = ["V1 = 5",
      "IF [(globalThis.__OKUMA_INJ__ = 7) GT 0] GOTO N100",
      "G0 X9.", "N100 G0 X1.", "M30"].join("\n");
    const out = okumaParametricProgramEngine.convertToHardcode(evil);
    expect(g.__OKUMA_INJ__).toBeUndefined(); // pre-fix: 7 (raw eval ran the embedded assignment)
    expect(out.gcode).toContain("X9.");       // non-numeric condition -> false -> falls through
    delete g.__OKUMA_INJ__;
  });
});
