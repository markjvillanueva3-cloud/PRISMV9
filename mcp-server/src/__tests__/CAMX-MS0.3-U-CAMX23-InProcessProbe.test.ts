/**
 * CAMX-MS0.3 / U-CAMX23 — Wire ProbeRoutineGeneratorEngine into PrintToProgram
 *
 * Behavioural coverage for the in-process probing wiring. Verifies the three
 * exit conditions from the unit envelope:
 *   1. Auto-probing for critical tolerances (tol < 0.025mm OR Ra < 0.8µm)
 *   2. Controller-specific probe macros (machine_brand → dialect)
 *   3. Inserted at the semi_finish→finish transition
 *
 * Drives the real intake→classify→plan→generate path via runFullPipeline so
 * the assertions exercise the actual splice point in generateProgram(), not a
 * mocked seam. Dialect tokens asserted here are the genuine Renishaw/Siemens
 * macro identifiers emitted by ProbeRoutineGeneratorEngine (G65 P98xx vs
 * CYCLE9xx) — a tautology-free signal that the controller routing is live.
 *
 * @module tests/CAMX-MS0.3-U-CAMX23-InProcessProbe
 */

import { describe, it, expect } from "vitest";
import {
  printToProgramPipelineEngine,
  type DrawingInput,
  type MachinableFeature,
  type MaterialCallout,
} from "../engines/PrintToProgramPipelineEngine.js";

const STEEL: MaterialCallout = {
  material_name: "AISI 4140 Steel",
  specification: "ASTM A29",
  hardness_hrc: 28,
  iso_group: "P",
};

function pocket(id: string, opts?: Partial<MachinableFeature>): MachinableFeature {
  return {
    id,
    type: "pocket_closed",
    width_mm: 30,
    length_mm: 40,
    depth_mm: 10,
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
    diameter_mm: 25,
    depth_mm: 20,
    position: { x: 60, y: 40, z: 0 },
    required_operations: [],
    priority: 0,
    ...opts,
  };
}

function input(features: MachinableFeature[], overrides?: Partial<DrawingInput>): DrawingInput {
  return {
    part_number: "CAMX23-T",
    material: STEEL,
    stock_size: { x: 150, y: 100, z: 30 },
    dimensions: [{ id: "D1", type: "linear", nominal_mm: 100, confidence: 0.95 }],
    features,
    max_spindle_rpm: 12000,
    max_power_kW: 15,
    ...overrides,
  };
}

const PROBE_MARK = "U-CAMX23 IN-PROCESS PROBE";

describe("CAMX-MS0.3/U-CAMX23 — in-process probing wiring", () => {
  // --- Exit condition 1: auto-probe for critical tolerances ---

  it("inserts a probe block for a tight-tolerance pocket (tol 0.01mm < 0.025)", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1", { tolerance_mm: 0.01 })]));
    expect(r.success).toBe(true);
    expect(r.program_text).toContain(PROBE_MARK);
    expect(r.program_text).toContain("Feature P1");
  });

  it("inserts a probe block for a fine-finish feature (Ra 0.4µm < 0.8, tol loose)", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(
      input([pocket("P1", { tolerance_mm: 0.2, surface_finish_Ra_um: 0.4 })]),
    );
    expect(r.program_text).toContain(PROBE_MARK);
  });

  it("does NOT probe a loose-tolerance, coarse-finish feature", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(
      input([pocket("P1", { tolerance_mm: 0.2, surface_finish_Ra_um: 3.2 })]),
    );
    expect(r.program_text).not.toContain(PROBE_MARK);
  });

  it("treats tolerance == 0.025mm as NOT critical (strict `<` boundary)", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(
      input([pocket("P1", { tolerance_mm: 0.025 })]),
    );
    expect(r.program_text).not.toContain(PROBE_MARK);
  });

  it("treats Ra == 0.8µm as NOT critical (strict `<` boundary)", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(
      input([pocket("P1", { tolerance_mm: 0.2, surface_finish_Ra_um: 0.8 })]),
    );
    expect(r.program_text).not.toContain(PROBE_MARK);
  });

  // --- Exit condition 2: controller-specific probe macros ---

  it("emits FANUC Renishaw macros (G65 P98xx) by default when no brand given", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1", { tolerance_mm: 0.01 })]));
    expect(r.program_text).toContain(PROBE_MARK);
    expect(r.program_text).toMatch(/G65 P98\d\d/);
    expect(r.program_text).toContain("(fanuc)");
  });

  it("emits SIEMENS native cycles (CYCLE9xx) when machine_brand is Siemens", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(
      input([pocket("P1", { tolerance_mm: 0.01 })], { machine_brand: "Siemens 840D sl" }),
    );
    expect(r.program_text).toContain(PROBE_MARK);
    expect(r.program_text).toContain("(siemens)");
    expect(r.program_text).toMatch(/CYCLE9\d\d/);
    expect(r.program_text).not.toMatch(/G65 P98\d\d/);
  });

  it("maps a Haas brand to the haas dialect tag", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(
      input([pocket("P1", { tolerance_mm: 0.01 })], { machine_brand: "Haas VF-4SS" }),
    );
    expect(r.program_text).toContain("(haas)");
  });

  it("maps an Okuma brand to the okuma dialect tag", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(
      input([pocket("P1", { tolerance_mm: 0.01 })], { machine_brand: "Okuma Genos M560-V" }),
    );
    expect(r.program_text).toContain("(okuma)");
  });

  // --- Exit condition 3: inserted at the semi_finish→finish transition ---

  it("places the probe block AFTER semi_finish and BEFORE the finish op for the feature", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1", { tolerance_mm: 0.01 })]));
    const txt = r.program_text;
    const semiIdx = txt.indexOf("SEMI_FINISH Feature P1");
    const probeIdx = txt.indexOf(PROBE_MARK);
    // Anchor on ": " so "FINISH" cannot match the "SEMI_FINISH" header substring.
    const finishIdx = txt.search(/: (POCKET_FINISH|FINISH) Feature P1 ---/);
    expect(semiIdx).toBeGreaterThanOrEqual(0);
    expect(probeIdx).toBeGreaterThan(semiIdx);
    expect(finishIdx).toBeGreaterThan(probeIdx);
  });

  it("a bore (natively rough→semi_finish→finish) with tight tol gets the probe at the transition", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([bore("B1", { tolerance_mm: 0.008 })]));
    const txt = r.program_text;
    expect(txt).toContain(PROBE_MARK);
    const semiIdx = txt.indexOf("SEMI_FINISH Feature B1");
    const probeIdx = txt.indexOf(PROBE_MARK);
    expect(semiIdx).toBeGreaterThanOrEqual(0);
    expect(probeIdx).toBeGreaterThan(semiIdx);
  });

  it("emits the probe block exactly once per feature (no duplicate inserts)", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1", { tolerance_mm: 0.01 })]));
    const occurrences = r.program_text.split(PROBE_MARK).length - 1;
    expect(occurrences).toBe(1);
  });

  it("probes each critical feature independently in a multi-feature part", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(
      input([
        pocket("P1", { tolerance_mm: 0.01 }),
        bore("B1", { tolerance_mm: 0.005 }),
        pocket("P2", { tolerance_mm: 0.5 }), // loose — must NOT probe
      ]),
    );
    expect(r.program_text).toContain("Feature P1");
    expect(r.program_text).toContain("Feature B1");
    const probeBlocks = r.program_text.split(PROBE_MARK).length - 1;
    expect(probeBlocks).toBe(2);
    // P2 is loose: it must not appear inside any probe header line.
    expect(r.program_text).not.toMatch(/IN-PROCESS PROBE: Feature P2/);
  });

  it("the inserted probe block carries the feature's tolerance/Ra annotation", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(
      input([pocket("P1", { tolerance_mm: 0.012, surface_finish_Ra_um: 0.6 })]),
    );
    expect(r.program_text).toMatch(/tol=0\.012mm Ra=0\.6µm/);
  });

  // --- P1 hardening: machine-safety preamble ---

  it("stops the spindle and retracts Z to machine home before the probe macros", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1", { tolerance_mm: 0.01 })]));
    const txt = r.program_text;
    const markIdx = txt.indexOf(PROBE_MARK);
    const m05Idx = txt.indexOf("Spindle stop before probe");
    const safeZIdx = txt.indexOf("Safe Z retract to machine home");
    const measureIdx = txt.search(/G65 P98\d\d|CYCLE9\d\d/);
    expect(markIdx).toBeGreaterThanOrEqual(0);
    expect(m05Idx).toBeGreaterThan(markIdx); // spindle stop AFTER the probe header
    expect(safeZIdx).toBeGreaterThan(m05Idx); // safe-Z AFTER spindle stop
    expect(measureIdx).toBeGreaterThan(safeZIdx); // measure macro only after safe state
    expect(txt).toContain("LOAD TOUCH PROBE NOW");
  });

  // --- P1 hardening: tolerance alarm only where the probed value IS the dimension ---

  it("emits an out-of-tolerance alarm (GOTO 9999) for a bore (diametral) probe", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([bore("B1", { tolerance_mm: 0.008 })]));
    expect(r.program_text).toContain(PROBE_MARK);
    expect(r.program_text).toMatch(/GOTO 9999/);
  });

  it("does NOT alarm-on-fail for a pocket→surface probe (coordinate, not the nominal)", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1", { tolerance_mm: 0.01 })]));
    expect(r.program_text).toContain(PROBE_MARK); // probe IS inserted
    expect(r.program_text).not.toMatch(/GOTO 9999/); // but no nonsensical alarm
  });

  // --- P1 hardening: loud gap report (R12) when a critical feature has no transition ---

  it("emits a loud PROBE GAP for a critical fillet (no rough→finish pair → no semi_finish)", () => {
    const fillet: MachinableFeature = {
      id: "FIL1",
      type: "fillet",
      depth_mm: 2,
      corner_radius_mm: 3,
      tolerance_mm: 0.01,
      required_operations: [],
      priority: 0,
    };
    const r = printToProgramPipelineEngine.runFullPipeline(input([fillet]));
    expect(r.program_text).toContain("PROBE GAP: Feature FIL1");
    expect(r.program_text).not.toMatch(/IN-PROCESS PROBE: Feature FIL1/);
    expect(r.program_text).toContain("M30"); // program still terminates
  });

  it("no PROBE GAP banner when every critical feature was probed", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1", { tolerance_mm: 0.01 })]));
    expect(r.program_text).toContain(PROBE_MARK);
    expect(r.program_text).not.toContain("PROBE GAP");
  });

  it("does not regress a no-critical-feature program (probe-free, still succeeds)", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(
      input([pocket("P1", { tolerance_mm: 0.3 }), bore("B1", { tolerance_mm: 0.2 })]),
    );
    expect(r.success).toBe(true);
    expect(r.program_text).not.toContain(PROBE_MARK);
    expect(r.program_text).toContain("M30"); // program still terminates normally
  });
});
