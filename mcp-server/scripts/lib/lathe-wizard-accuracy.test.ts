import { describe, it, expect } from "vitest";
import {
  LatheSpeedFeedCalculatorFacadeEngine,
  type LatheSpeedFeedInput,
  type LatheSpeedFeedResult,
} from "../../src/engines/LatheSpeedFeedCalculatorFacadeEngine.js";
import {
  latheResultToTurningView,
  accuracyOracleParams,
  runAccuracyOracle,
} from "./lathe-wizard-accuracy.js";

/**
 * Real-facade round-trip tests for the accuracy-oracle integration wired into the
 * Lathe Wizard combinatorial sweep. These drive the REAL
 * `LatheSpeedFeedCalculatorFacadeEngine.calculate` (R15 live-data validation, not a mock):
 *   - a normal external-turning cell is internally consistent -> 0 identity violations,
 *   - deliberately corrupting the engine's OWN outputs makes the oracle FIRE (a check that
 *     cannot fail is worthless -- R9),
 *   - op-gating: the rpm identity is skipped for internal / facing ops (no false positive),
 *   - torque + MRR stay field-blocked and are surfaced as coverage gaps (R12).
 */

// First supported material is guaranteed to resolve to canonical kc1_1/mc/taylor coefficients.
const MATERIAL = LatheSpeedFeedCalculatorFacadeEngine.listSupportedMaterials()[0];

function externalTurningInput(overrides: Partial<LatheSpeedFeedInput> = {}): LatheSpeedFeedInput {
  return {
    material: MATERIAL,
    tool: { type: "turning_insert" },
    operation: { type: "roughing", depth_of_cut_mm: 2.0, coolant: "flood" },
    machine: { max_rpm: 4000, max_power_kw: 22 },
    workpiece: { diameter_mm: 50 },
    strategy: "balanced",
    ...overrides,
  } as LatheSpeedFeedInput;
}

function calc(input: LatheSpeedFeedInput): LatheSpeedFeedResult {
  const r = LatheSpeedFeedCalculatorFacadeEngine.calculate(input);
  expect(r.success).toBe(true); // fixtures must be feasible or the test proves nothing
  return r;
}

describe("runAccuracyOracle -- a normal cell is internally consistent (0 violations)", () => {
  it("external turning on a supported material yields no identity divergences", () => {
    const input = externalTurningInput();
    const result = calc(input);
    const { violations } = runAccuracyOracle(input, result);
    // If this ever fails, the facade has a real silent-wrong identity -- surface it, do not
    // relax the assertion.
    expect(violations).toEqual([]);
  });

  it("torque + MRR are surfaced as blocked coverage gaps (facade emits neither)", () => {
    const input = externalTurningInput();
    const result = calc(input);
    const { blocked } = runAccuracyOracle(input, result);
    expect(blocked.map((b) => b.kind).sort()).toEqual([
      "turning_mrr_field_absent",
      "turning_torque_field_absent",
    ]);
    expect(blocked.every((b) => /NOT VERIFIED/.test(b.note ?? ""))).toBe(true);
  });
});

describe("runAccuracyOracle -- corrupting the engine's own outputs makes the oracle FIRE", () => {
  it("inflating predicted_power_kw 30% flags turning_power_inconsistent", () => {
    const input = externalTurningInput();
    const result = calc(input);
    expect(result.predicted_power_kw).toBeGreaterThan(0);
    const corrupted: LatheSpeedFeedResult = {
      ...result,
      predicted_power_kw: (result.predicted_power_kw as number) * 1.3,
    };
    const kinds = runAccuracyOracle(input, corrupted).violations.map((v) => v.kind);
    expect(kinds).toContain("turning_power_inconsistent");
  });

  it("doubling predicted_force_N flags turning_force_inconsistent", () => {
    const input = externalTurningInput();
    const result = calc(input);
    expect(result.predicted_force_N).toBeGreaterThan(0);
    const corrupted: LatheSpeedFeedResult = {
      ...result,
      predicted_force_N: (result.predicted_force_N as number) * 2,
    };
    const kinds = runAccuracyOracle(input, corrupted).violations.map((v) => v.kind);
    expect(kinds).toContain("turning_force_inconsistent");
  });

  it("halving predicted_tool_life_min flags turning_tool_life_inconsistent", () => {
    const input = externalTurningInput({ operation: { type: "finishing", depth_of_cut_mm: 0.5, coolant: "flood" } });
    const result = calc(input);
    expect(result.predicted_tool_life_min).toBeGreaterThan(0);
    const corrupted: LatheSpeedFeedResult = {
      ...result,
      predicted_tool_life_min: (result.predicted_tool_life_min as number) * 0.5,
    };
    const kinds = runAccuracyOracle(input, corrupted).violations.map((v) => v.kind);
    expect(kinds).toContain("turning_tool_life_inconsistent");
  });
});

describe("accuracyOracleParams -- rpm identity is checked on ALL ops (facade:690 uses workpiece OD unconditionally)", () => {
  it("external turning threads the workpiece diameter through", () => {
    expect(accuracyOracleParams(externalTurningInput()).diameter_mm).toBe(50);
  });

  it("boring bar / boring op ALSO threads the workpiece diameter (facade uses workpiece OD for all ops)", () => {
    const boring = externalTurningInput({
      tool: { type: "boring_bar" },
      operation: { type: "boring", depth_of_cut_mm: 1.0, coolant: "flood" },
    });
    expect(accuracyOracleParams(boring).diameter_mm).toBe(50);
  });

  it("facing op ALSO threads the workpiece diameter (no false-premise exclusion)", () => {
    const facing = externalTurningInput({
      operation: { type: "facing", depth_of_cut_mm: 1.0, coolant: "flood" },
    });
    expect(accuracyOracleParams(facing).diameter_mm).toBe(50);
  });

  it("a boring result with a blatantly wrong rpm IS flagged (rpm coverage now extends to boring -- the adversarial-found ~46% blind spot is closed)", () => {
    const boring = externalTurningInput({
      tool: { type: "boring_bar" },
      operation: { type: "boring", depth_of_cut_mm: 1.0, coolant: "flood" },
    });
    const result = calc(boring);
    // ideal rpm at 50mm OD, Vc=100 -> ~637; a reported 2500 is wildly inconsistent AND below the
    // 6000 ceiling (so not a clamp). The facade computes rpm from the workpiece OD for boring too,
    // so this self-inconsistency must now be caught (previously silently skipped by the op-gating).
    const wrongRpm: LatheSpeedFeedResult = {
      ...result,
      recommendation: { ...result.recommendation, cutting_speed_m_min: 100, rpm: 2500 },
    };
    const kinds = runAccuracyOracle(boring, wrongRpm).violations.map((v) => v.kind);
    expect(kinds).toContain("turning_rpm_inconsistent");
  });
});

describe("accuracyOracleParams -- effective spindle band mirrors the facade clamp", () => {
  it("caps machine_max_rpm at the facade hard ceiling (6000) when the machine has no cap", () => {
    const p = accuracyOracleParams(externalTurningInput({ machine: {} } as Partial<LatheSpeedFeedInput>));
    expect(p.machine_max_rpm).toBe(6000);
    expect(p.machine_min_rpm).toBe(50);
  });
  it("honors a tighter machine cap below the facade hard ceiling", () => {
    const p = accuracyOracleParams(externalTurningInput({ machine: { max_rpm: 4000 } }));
    expect(p.machine_max_rpm).toBe(4000);
  });
  it("folds a machine cap ABOVE the facade hard ceiling down to 6000", () => {
    const p = accuracyOracleParams(externalTurningInput({ machine: { max_rpm: 8000 } }));
    expect(p.machine_max_rpm).toBe(6000);
  });
});

describe("runAccuracyOracle -- rpm clamp forgiveness stays CONDITIONAL (fix for the 3457 false positives)", () => {
  it("a legit ceiling clamp (rpm at 6000, ideal far beyond) is forgiven", () => {
    const input = externalTurningInput({ machine: {}, workpiece: { diameter_mm: 6 } } as Partial<LatheSpeedFeedInput>);
    const result = calc(input);
    // ideal at 6mm, Vc=250 -> ~13263 rpm; a reported 6000 is a legitimate facade ceiling clamp.
    const clamped: LatheSpeedFeedResult = {
      ...result,
      recommendation: { ...result.recommendation, cutting_speed_m_min: 250, rpm: 6000 },
    };
    const kinds = runAccuracyOracle(input, clamped).violations.map((v) => v.kind);
    expect(kinds).not.toContain("turning_rpm_inconsistent");
  });
  it("an rpm PINNED at 6000 while the ideal is well BELOW the ceiling is still flagged (forgiveness is not blanket)", () => {
    const input = externalTurningInput({ machine: {}, workpiece: { diameter_mm: 100 } } as Partial<LatheSpeedFeedInput>);
    const result = calc(input);
    // ideal at 100mm, Vc=100 -> ~318 rpm; a reported 6000 is NOT a clamp (ideal << ceiling) -> real defect.
    const bogus: LatheSpeedFeedResult = {
      ...result,
      recommendation: { ...result.recommendation, cutting_speed_m_min: 100, rpm: 6000 },
    };
    const kinds = runAccuracyOracle(input, bogus).violations.map((v) => v.kind);
    expect(kinds).toContain("turning_rpm_inconsistent");
  });
});

describe("latheResultToTurningView -- explicit field map (no cast), torque/MRR omitted", () => {
  it("carries the four checkable outputs and omits the two unemitted fields", () => {
    const input = externalTurningInput();
    const view = latheResultToTurningView(calc(input));
    expect(view.recommendation?.rpm).toBeGreaterThan(0);
    expect(view.predicted_force_N).toBeGreaterThan(0);
    expect(view.predicted_power_kw).toBeGreaterThan(0);
    expect(view.material_properties?.kc1_1).toBeGreaterThan(0);
    expect(view.predicted_torque_Nm).toBeUndefined();
    expect(view.predicted_mrr_cm3_min).toBeUndefined();
  });
});
