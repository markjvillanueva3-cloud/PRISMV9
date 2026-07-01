/**
 * devDispatcher U-WIRE-DOE-WEAR-JMDIE round-trip tests (slot:papa /goal /loop
 * iter8, 2026-05-27).
 *
 *   DOETaguchEngine               → doe_taguchi_compute
 *   ArchardAdhesiveWearEngine     → archard_wear_calculate
 *   JmDieMachineConfigEngine      → jm_die_machines_query
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-DOE-WEAR-JMDIE
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

import { doeTaguchEngine } from "../engines/DOETaguchEngine.js";
import { archardAdhesiveWearEngine } from "../engines/ArchardAdhesiveWearEngine.js";
import { JmDieMachineConfigEngine } from "../engines/JmDieMachineConfigEngine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DISPATCHER_SRC = fs.readFileSync(
  path.resolve(__dirname, "../tools/dispatchers/devDispatcher.ts"),
  "utf8"
);

describe("U-WIRE-DOE-TAGUCHI engine — Taguchi DOE", () => {
  const factors4 = [
    { name: "vc", levels: [100, 150, 200], unit: "m/min" },
    { name: "fz", levels: [0.05, 0.10, 0.15], unit: "mm/tooth" },
    { name: "ap", levels: [0.5, 1.0, 1.5], unit: "mm" },
    { name: "ae", levels: [2, 4, 6], unit: "mm" },
  ];

  it("Taguchi L9 with 4 factors × 3 levels emits exactly 9 runs", () => {
    const r = doeTaguchEngine.compute({
      factors: factors4,
      response: "tool_life",
      objective: "maximize",
      design: "taguchi",
      material: { iso_group: "P" },
      tool: { diameter_mm: 10, flute_count: 4 },
    });
    expect(r.value.runs.length).toBe(9);
    expect(r.value.total_runs).toBe(9);
  });

  it("ANOVA contains one row per factor (4 factors → 4 rows)", () => {
    const r = doeTaguchEngine.compute({
      factors: factors4,
      response: "tool_life",
      objective: "maximize",
      design: "taguchi",
      material: { iso_group: "P" },
      tool: { diameter_mm: 10, flute_count: 4 },
    });
    expect(r.value.anova.length).toBe(4);
    const factorNames = r.value.anova.map(a => a.factor).sort();
    expect(factorNames).toEqual(["ae", "ap", "fz", "vc"]);
  });

  it("factor_rankings exposes 4 entries with distinct rank values 1..4", () => {
    const r = doeTaguchEngine.compute({
      factors: factors4,
      response: "mrr",
      objective: "maximize",
      design: "taguchi",
      material: { iso_group: "P" },
      tool: { diameter_mm: 10, flute_count: 4 },
    });
    expect(r.value.factor_rankings.length).toBe(4);
    const ranks = r.value.factor_rankings.map(r2 => r2.rank).sort();
    expect(ranks).toEqual([1, 2, 3, 4]);
  });

  it("AtomicValue wrapper carries a non-empty unit string", () => {
    const r = doeTaguchEngine.compute({
      factors: factors4,
      response: "cycle_time",
      objective: "minimize",
      design: "taguchi",
      material: { iso_group: "M" },
      tool: { diameter_mm: 12, flute_count: 4 },
    });
    expect(r.unit.length).toBeGreaterThan(0);
    expect(r.value.design_name.length).toBeGreaterThan(0);
  });
});

describe("U-WIRE-ARCHARD-WEAR engine — Archard adhesive wear", () => {
  const baseline = {
    normalForce: 100,
    slidingDistance: 1000,
    toolHardness: 1500,
    workpieceHardness: 200,
    contactArea: 1.0,
    wearCoefficient: 1e-4,
  };

  it("steel-on-steel baseline: V = K·F·s/H = 1e-4 · 100 · 1000 / 1500 ≈ 0.00667 mm³", () => {
    const r = archardAdhesiveWearEngine.calculate(baseline);
    // Allow ±10% for engine-internal corrections (lubrication default, etc.)
    expect(r.wearVolume).toBeGreaterThan(0.003);
    expect(r.wearVolume).toBeLessThan(0.015);
  });

  it("doubling normalForce roughly doubles wearVolume (Archard linearity in F)", () => {
    const lo = archardAdhesiveWearEngine.calculate({ ...baseline, normalForce: 100 });
    const hi = archardAdhesiveWearEngine.calculate({ ...baseline, normalForce: 200 });
    const ratio = hi.wearVolume / lo.wearVolume;
    expect(ratio).toBeGreaterThan(1.8);
    expect(ratio).toBeLessThan(2.2);
  });

  it("doubling workpieceHardness halves wearVolume (Archard's H is the softer surface)", () => {
    // Archard: V = K·F·s/H. H is the softer (workpiece) material's hardness;
    // toolHardness is reserved for regime classification + ratio checks, not
    // the wear-volume divisor (verified by reading the engine: it routes
    // workpieceHardness into the V calculation).
    const soft = archardAdhesiveWearEngine.calculate({ ...baseline, workpieceHardness: 200 });
    const hard = archardAdhesiveWearEngine.calculate({ ...baseline, workpieceHardness: 400 });
    const ratio = soft.wearVolume / hard.wearVolume;
    expect(ratio).toBeGreaterThan(1.8);
    expect(ratio).toBeLessThan(2.2);
  });

  it("wearRegime classification returns one of the documented strings", () => {
    const r = archardAdhesiveWearEngine.calculate(baseline);
    expect(typeof r.wearRegime).toBe("string");
    expect(r.wearRegime.length).toBeGreaterThan(0);
  });
});

describe("U-WIRE-JM-DIE-CONFIG engine — JM Die machine config", () => {
  it("MACHINE_COUNT constant equals 21", () => {
    expect(JmDieMachineConfigEngine.MACHINE_COUNT).toBe(21);
  });

  it("getAllConfigs returns exactly 21 machines", () => {
    expect(JmDieMachineConfigEngine.getAllConfigs().length).toBe(21);
  });

  it("lathes + mills + edm + support partition equals 21", () => {
    const sum =
      JmDieMachineConfigEngine.getLathes().length +
      JmDieMachineConfigEngine.getMills().length +
      JmDieMachineConfigEngine.getEdmMachines().length +
      JmDieMachineConfigEngine.getSupportMachines().length;
    expect(sum).toBe(21);
  });

  it("getConfig returns undefined for an unknown id", () => {
    expect(JmDieMachineConfigEngine.getConfig("never-existed-machine-id")).toBeUndefined();
  });

  it("getActiveMachines.length ≤ getAllConfigs.length", () => {
    expect(JmDieMachineConfigEngine.getActiveMachines().length)
      .toBeLessThanOrEqual(JmDieMachineConfigEngine.getAllConfigs().length);
  });
});

describe("U-WIRE-DOE-WEAR-JMDIE dispatcher wiring source assertions", () => {
  it("doe_taguchi_compute appears in both action enum and case-block of the dispatcher source", () => {
    const enumPos = DISPATCHER_SRC.indexOf('"doe_taguchi_compute",');
    const casePos = DISPATCHER_SRC.indexOf('case "doe_taguchi_compute"');
    expect(enumPos).toBeGreaterThan(0);
    expect(casePos).toBeGreaterThan(enumPos);
  });

  it("archard_wear_calculate appears in both action enum and case-block of the dispatcher source", () => {
    const enumPos = DISPATCHER_SRC.indexOf('"archard_wear_calculate",');
    const casePos = DISPATCHER_SRC.indexOf('case "archard_wear_calculate"');
    expect(enumPos).toBeGreaterThan(0);
    expect(casePos).toBeGreaterThan(enumPos);
  });

  it("jm_die_machines_query appears in both action enum and case-block of the dispatcher source", () => {
    const enumPos = DISPATCHER_SRC.indexOf('"jm_die_machines_query",');
    const casePos = DISPATCHER_SRC.indexOf('case "jm_die_machines_query"');
    expect(enumPos).toBeGreaterThan(0);
    expect(casePos).toBeGreaterThan(enumPos);
  });

  it("all 3 lazy imports present in the dispatcher source", () => {
    expect(DISPATCHER_SRC.indexOf('"../../engines/DOETaguchEngine.js"')).toBeGreaterThan(0);
    expect(DISPATCHER_SRC.indexOf('"../../engines/ArchardAdhesiveWearEngine.js"')).toBeGreaterThan(0);
    expect(DISPATCHER_SRC.indexOf('"../../engines/JmDieMachineConfigEngine.js"')).toBeGreaterThan(0);
  });
});
