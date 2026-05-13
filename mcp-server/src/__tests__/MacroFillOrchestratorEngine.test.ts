/**
 * MacroFillOrchestratorEngine — MS0-U2 SAFETY-CRITICAL coverage.
 *
 * Asserts the load-bearing invariants:
 *   1. HARD RULE (per spec): calculated VCs stay as expression strings.
 *      - wafer-insert : candidate.calculatedVars.VC130 MUST match /VC111.*VC110/
 *      - top-hat      : candidate.calculatedVars.VC150 MUST match /VC121.*VC120/
 *   2. Missing required print dims REJECT — the orchestrator never guesses.
 *   3. Physical-impossibility configs propagate the underlying validator rejection.
 *   4. needsGate: true on every candidate (type-level reminder).
 *   5. The candidate carries provenance (filledVars source field).
 *   6. Dispatcher round-trip — action wiring on prism_turning + prism_cam.
 */

import { describe, it, expect } from "vitest";
import type { PartPrintFeatures } from "../engines/MacroFillOrchestratorEngine.js";

const WAFER_FEATURES: PartPrintFeatures = {
  family: "waferinsert",
  stockDiameter_in: 1.32,
  finishODAtFace_in: 1.215,
  partLength_in: 0.787,
  odFeatureSize_in: 0.005,
  odFeatureType: "radius",
  odFeatureAngleDeg: 45,
  spotDrill: {
    diameter_in: 0.5,
    sfm: 130,
    pointAngleDeg: 90,
    usePeck: false,
    depth_in: 0.05,
  },
  zClearance_in: 0.25,
  xClearance_in: 0.1,
  odTaperEndDia_in: 1.1473,
  odTaperStartZ_in: 0.4,
  idMajorDia_in: 0.25,
  idTaperAngleOkumaDeg: 250,
  idFinishXDia_in: 0.0,
  thruDrill: {
    diameter_in: 0.171,
    sfm: 50,
    feedPerRev_ipr: 0.0022,
    pointAngleDeg: 118,
    usePeck: true,
    peckDepth_in: 0.13,
  },
  printSource: "JM_DIE/PART_A12345.pdf",
  sourceRevision: "B",
};

const TOPHAT_FEATURES: PartPrintFeatures = {
  family: "tophat",
  stockDiameter_in: 2.95,
  finishODAtFace_in: 2.005,
  partLength_in: 2.685,
  odFeatureSize_in: 0.03,
  odFeatureType: "chamfer",
  odFeatureAngleDeg: 45,
  spotDrill: { diameter_in: 1.0, sfm: 300, pointAngleDeg: 90, usePeck: false, depth_in: 0.1 },
  zClearance_in: 0.25,
  xClearance_in: 0.1,
  smallestDrillDia_in: 0.7188,
  finishIdLarge_in: 1.259,
  largeBoreDepth_in: 1.0,
  smallBoreDepth_in: 2.68,
  stepOdLarge_in: 2.75,
  stepZDepth_in: 2.015,
  stepChamferSize_in: 0.03,
  idLargeFeatureSize_in: 0.03,
  idLargeFeatureType: "chamfer",
  idLargeFeatureAngleDeg: 45,
  idUndercut: { enable: true, length_in: 0.03, leadInAngleDeg: 4, depthBeyondFinish_in: 0.02 },
  stepDrill1: { diameter_in: 1.22, sfm: 75, feedPerRev_ipr: 0.008, pointAngleDeg: 130, usePeck: true },
  stepDrill2: { diameter_in: 0.7188, sfm: 95, feedPerRev_ipr: 0.007, pointAngleDeg: 130, usePeck: true },
  counterboreDrill: { enable: true, diameter_in: 1.2188, sfm: 95, feedPerRev_ipr: 0.003, pointAngleDeg: 180, usePeck: false },
  stockAllowances: { odRadial: 0.01, odAxial: 0.002, idRadial: 0.006, idAxial: 0.0 },
  roughing: { odDepthOfCut: 0.2, idDepthOfCut: 0.06 },
  speeds: { odRoughSFM: 755, odFinishSFM: 825, idRoughSFM: 400, idFinishSFM: 500 },
  feeds: { faceRough: 0.008, faceFinish: 0.003, odRough: 0.008, odFinish: 0.005, idRough: 0.007, idFinish: 0.004 },
  maxRoughRPM: 2500,
  maxFinishRPM: 3500,
  printSource: "JM_DIE/PART_B67890.pdf",
};

describe("MacroFillOrchestratorEngine — wafer-insert (MS0-U2)", () => {
  it("returns a candidate with the right family + needsGate=true", async () => {
    const { macroFillOrchestratorEngine } = await import("../engines/MacroFillOrchestratorEngine.js");
    const c = macroFillOrchestratorEngine.fillCandidate(WAFER_FEATURES, "OKUMA_LB-3000-EX");
    expect(c.family).toBe("waferinsert");
    expect(c.controllerType).toBe("okuma_osp");
    expect(c.targetMachine).toBe("OKUMA_LB-3000-EX");
    expect(c.needsGate).toBe(true);
    expect(c.program.gcode.length).toBeGreaterThan(500);
    expect(c.program.gcode.trim().endsWith("M30")).toBe(true);
  });

  it("HARD RULE: candidate.calculatedVars.VC130 stays as the literal expression `[VC111 * 3.82] / VC110`", async () => {
    const { macroFillOrchestratorEngine } = await import("../engines/MacroFillOrchestratorEngine.js");
    const c = macroFillOrchestratorEngine.fillCandidate(WAFER_FEATURES, "OKUMA_LB-3000-EX");
    expect(c.calculatedVars.VC130.formula).toBe("[VC111 * 3.82] / VC110");
    expect(c.calculatedVars.VC130.formula).toMatch(/VC111.*VC110/);
    // Defense-in-depth: typeof formula MUST be string (never a number)
    expect(typeof c.calculatedVars.VC130.formula).toBe("string");
    // The numeric result is also computed (for debug only — not in gcode)
    // (130 SFM * 3.82) / 0.5 dia = 993.2 RPM
    expect(c.calculatedVars.VC130.result).toBeCloseTo(993.2, 1);
  });

  it("preserves ALL 8 wafer-insert calculated VCs as expression strings", async () => {
    const { macroFillOrchestratorEngine } = await import("../engines/MacroFillOrchestratorEngine.js");
    const c = macroFillOrchestratorEngine.fillCandidate(WAFER_FEATURES, "OKUMA_LB-3000-EX");
    const expected: Record<string, RegExp> = {
      VC130: /VC111.*VC110/,
      VC131: /VC116.*VC115/,
      VC132: /VC115 \/ 2 \/ TAN/,
      VC133: /VC104.*VC132/,
      VC134: /VC101 - \[VC105 \* 2\]/,
      VC135: /VC100 \+ VC126/,
      VC143: /\[VC140 - VC142\].*TAN\[VC144\]/,
      VC144: /270 - VC141/,
    };
    for (const [vc, pat] of Object.entries(expected)) {
      const entry = c.calculatedVars[vc];
      expect(typeof entry.formula, `${vc}.formula type`).toBe("string");
      expect(entry.formula, `${vc}.formula content`).toMatch(pat);
    }
  });

  it("carries print provenance in filledVars source field", async () => {
    const { macroFillOrchestratorEngine } = await import("../engines/MacroFillOrchestratorEngine.js");
    const c = macroFillOrchestratorEngine.fillCandidate(WAFER_FEATURES, "OKUMA_LB-3000-EX");
    expect(c.filledVars.VC100.source).toContain("JM_DIE/PART_A12345.pdf");
    expect(c.filledVars.VC100.value).toBeCloseTo(1.32, 4);
    expect(c.filledVars.VC104.value).toBeCloseTo(0.787, 4);
    expect(c.filledVars.VC141.value).toBe(250);
    expect(c.filledVars.VC141.source).toContain("idTaperAngleOkuma");
  });

  it("validates structure via MacroProgramIntelligenceEngine — 6 toolDefs + auto-calcs", async () => {
    const { macroFillOrchestratorEngine } = await import("../engines/MacroFillOrchestratorEngine.js");
    const c = macroFillOrchestratorEngine.fillCandidate(WAFER_FEATURES, "OKUMA_LB-3000-EX");
    expect(c.validation.parsedToolDefs).toBe(6);
    expect(c.validation.parsedAutoCalcs).toBeGreaterThanOrEqual(5);
    expect(c.validation.parsedVariables).toBeGreaterThan(15);
  });

  // Negative #1: missing required dim → reject (no guessing)
  it("REJECTS when a required wafer-insert VC is missing (idTaperAngleOkumaDeg)", async () => {
    const { macroFillOrchestratorEngine } = await import("../engines/MacroFillOrchestratorEngine.js");
    const bad: PartPrintFeatures = { ...WAFER_FEATURES };
    delete bad.idTaperAngleOkumaDeg;
    expect(() => macroFillOrchestratorEngine.fillCandidate(bad, "OKUMA_LB-3000-EX"))
      .toThrow(/Missing required.*idTaperAngleOkumaDeg.*orchestrator does NOT guess/);
  });

  // Negative #2: missing thruDrill → reject
  it("REJECTS when thruDrill spec missing for wafer-insert", async () => {
    const { macroFillOrchestratorEngine } = await import("../engines/MacroFillOrchestratorEngine.js");
    const bad: PartPrintFeatures = { ...WAFER_FEATURES };
    delete bad.thruDrill;
    expect(() => macroFillOrchestratorEngine.fillCandidate(bad, "OKUMA_LB-3000-EX"))
      .toThrow(/Missing required.*thruDrill/);
  });

  // Negative #3: physical impossibility propagates from underlying validator
  it("REJECTS physically impossible config (negative part length) via underlying validator", async () => {
    const { macroFillOrchestratorEngine } = await import("../engines/MacroFillOrchestratorEngine.js");
    const bad: PartPrintFeatures = { ...WAFER_FEATURES, partLength_in: -0.5 };
    expect(() => macroFillOrchestratorEngine.fillCandidate(bad, "OKUMA_LB-3000-EX"))
      .toThrow(/partLength.*> 0/);
  });

  // Adversarial #1: ID > OD breach
  it("REJECTS idMajorDia >= finishODAtFace (ID would breach the OD wall)", async () => {
    const { macroFillOrchestratorEngine } = await import("../engines/MacroFillOrchestratorEngine.js");
    const bad: PartPrintFeatures = { ...WAFER_FEATURES, idMajorDia_in: 1.3, finishODAtFace_in: 1.215 };
    expect(() => macroFillOrchestratorEngine.fillCandidate(bad, "OKUMA_LB-3000-EX"))
      .toThrow(/idMajorDia.*finishODAtFace/);
  });

  // Adversarial #2: empty target machine
  it("REJECTS empty targetMachine string", async () => {
    const { macroFillOrchestratorEngine } = await import("../engines/MacroFillOrchestratorEngine.js");
    expect(() => macroFillOrchestratorEngine.fillCandidate(WAFER_FEATURES, ""))
      .toThrow(/targetMachine is required/);
  });
});

describe("MacroFillOrchestratorEngine — top-hat (MS0-U2)", () => {
  it("returns a candidate with the right family + needsGate=true", async () => {
    const { macroFillOrchestratorEngine } = await import("../engines/MacroFillOrchestratorEngine.js");
    const c = macroFillOrchestratorEngine.fillCandidate(TOPHAT_FEATURES, "OKUMA_LB-4000-MY");
    expect(c.family).toBe("tophat");
    expect(c.needsGate).toBe(true);
    expect(c.program.gcode.length).toBeGreaterThan(1500);
  });

  it("HARD RULE: candidate.calculatedVars.VC150 stays as the literal expression `[VC121 * 3.82] / VC120`", async () => {
    const { macroFillOrchestratorEngine } = await import("../engines/MacroFillOrchestratorEngine.js");
    const c = macroFillOrchestratorEngine.fillCandidate(TOPHAT_FEATURES, "OKUMA_LB-4000-MY");
    expect(c.calculatedVars.VC150.formula).toBe("[VC121 * 3.82] / VC120");
    expect(c.calculatedVars.VC150.formula).toMatch(/VC121.*VC120/);
    expect(typeof c.calculatedVars.VC150.formula).toBe("string");
    // (300 SFM * 3.82) / 1.0 dia = 1146 RPM
    expect(c.calculatedVars.VC150.result).toBeCloseTo(1146, 0);
  });

  it("validates structure — 8 toolDefs (top-hat with counterbore)", async () => {
    const { macroFillOrchestratorEngine } = await import("../engines/MacroFillOrchestratorEngine.js");
    const c = macroFillOrchestratorEngine.fillCandidate(TOPHAT_FEATURES, "OKUMA_LB-4000-MY");
    expect(c.validation.parsedToolDefs).toBe(8);
    expect(c.validation.parsedAutoCalcs).toBeGreaterThanOrEqual(10);
  });

  // Negative: step OD inverted
  it("REJECTS step OD inverted (step OD must be > small OD)", async () => {
    const { macroFillOrchestratorEngine } = await import("../engines/MacroFillOrchestratorEngine.js");
    const bad: PartPrintFeatures = { ...TOPHAT_FEATURES, stepOdLarge_in: 2.005 };
    expect(() => macroFillOrchestratorEngine.fillCandidate(bad, "OKUMA_LB-4000-MY"))
      .toThrow(/stepOdLarge.*finishOdSmall/);
  });

  // Adversarial: missing roughing block (top-hat-specific required)
  it("REJECTS when roughing block missing for top-hat", async () => {
    const { macroFillOrchestratorEngine } = await import("../engines/MacroFillOrchestratorEngine.js");
    const bad: PartPrintFeatures = { ...TOPHAT_FEATURES };
    delete bad.roughing;
    expect(() => macroFillOrchestratorEngine.fillCandidate(bad, "OKUMA_LB-4000-MY"))
      .toThrow(/Missing required.*roughing/);
  });
});

describe("MacroFillOrchestratorEngine — unsupported families + dispatcher wiring (MS0-U2)", () => {
  it("REJECTS family=casing (handled by the V1-V199 path, not this orchestrator)", async () => {
    const { macroFillOrchestratorEngine } = await import("../engines/MacroFillOrchestratorEngine.js");
    const bad: PartPrintFeatures = { ...WAFER_FEATURES, family: "casing" };
    expect(() => macroFillOrchestratorEngine.fillCandidate(bad, "OKUMA_LB-3000-EX"))
      .toThrow(/family=casing.*okuma_generate_casing/);
  });

  it("REJECTS family=cbore (handled by the V1-V199 path)", async () => {
    const { macroFillOrchestratorEngine } = await import("../engines/MacroFillOrchestratorEngine.js");
    const bad: PartPrintFeatures = { ...WAFER_FEATURES, family: "cbore" };
    expect(() => macroFillOrchestratorEngine.fillCandidate(bad, "OKUMA_LB-3000-EX"))
      .toThrow(/family=cbore.*okuma_generate_cbore/);
  });

  it("turningDispatcher source declares macro_fill_candidate in ACTIONS + case handler", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const src = fs.readFileSync(
      path.resolve(__dirname, "../tools/dispatchers/turningDispatcher.ts"),
      "utf-8",
    );
    expect(src).toContain(`"macro_fill_candidate"`);
    expect(src).toContain(`case "macro_fill_candidate":`);
    expect(src).toContain(`macroFillOrchestratorEngine`);
  });

  it("camDispatcher source declares macro_fill_candidate in ACTIONS + case handler", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const src = fs.readFileSync(
      path.resolve(__dirname, "../tools/dispatchers/camDispatcher.ts"),
      "utf-8",
    );
    expect(src).toContain(`"macro_fill_candidate"`);
    expect(src).toContain(`case "macro_fill_candidate":`);
  });

  it("end-to-end: fillCandidate carries audit trail + is gateable + has NO file fields", async () => {
    const { macroFillOrchestratorEngine } = await import("../engines/MacroFillOrchestratorEngine.js");
    const c = macroFillOrchestratorEngine.fillCandidate(WAFER_FEATURES, "OKUMA_LB-3000-EX");
    // Audit trail
    expect(c.filledAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // Gateability — type guarantees needsGate=true
    expect(c.needsGate).toBe(true);
    // No code path emitted a file — the candidate carries gcode, not a file path
    expect(c).not.toHaveProperty("file");
    expect(c).not.toHaveProperty("emitted");
    expect(c).not.toHaveProperty("path");
    expect(c).not.toHaveProperty("outputFile");
  });
});
