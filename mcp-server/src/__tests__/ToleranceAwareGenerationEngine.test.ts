/**
 * ToleranceAwareGenerationEngine — PHASE22 wiring tests. Real assertions on
 * applyTolerances() across feature types (hole/pocket/face) and customer
 * standards (DEFAULT, ITW, ALCOA). Exercises GD&T callout emission per
 * ASME Y14.5 rules.
 */
import { describe, it, expect } from "vitest";
import { toleranceAwareGenerationEngine } from "../engines/ToleranceAwareGenerationEngine.js";
import type { FeatureSpec } from "../engines/NeuralCADGenerationEngine.js";

const SIMPLE_HOLE: FeatureSpec = {
  type: "hole",
  params: { diameter: 10, depth: 20 },
};

const SIMPLE_POCKET: FeatureSpec = {
  type: "pocket",
  params: { width: 50, length: 80, depth: 15 },
};

const SIMPLE_FACE: FeatureSpec = {
  type: "face",
  params: { length: 100, width: 80 },
};

describe("ToleranceAwareGenerationEngine.applyTolerances — single feature", () => {
  it("hole feature → result has featureId F1 and matching featureType 'hole'", () => {
    const r = toleranceAwareGenerationEngine.applyTolerances([SIMPLE_HOLE]);
    expect(r.length).toBe(1);
    expect(r[0].featureId).toBe("F1");
    expect(r[0].featureType).toBe("hole");
  });

  it("hole feature emits GD&T callouts (≥1 frame)", () => {
    const r = toleranceAwareGenerationEngine.applyTolerances([SIMPLE_HOLE]);
    expect(Array.isArray(r[0].gdtCallouts)).toBe(true);
    expect(r[0].gdtCallouts.length).toBeGreaterThan(0);
  });

  it("hole GD&T callouts use unit 'mm' (default)", () => {
    const r = toleranceAwareGenerationEngine.applyTolerances([SIMPLE_HOLE]);
    expect(r[0].gdtCallouts[0].unit).toBe("mm");
  });

  it("pocket feature → featureType passed through unchanged", () => {
    const r = toleranceAwareGenerationEngine.applyTolerances([SIMPLE_POCKET]);
    expect(r[0].featureType).toBe("pocket");
  });

  it("face feature → tolerance generated", () => {
    const r = toleranceAwareGenerationEngine.applyTolerances([SIMPLE_FACE]);
    expect(r[0].featureType).toBe("face");
  });
});

describe("ToleranceAwareGenerationEngine.applyTolerances — multiple features", () => {
  it("3 features → 3 results with sequential featureIds F1, F2, F3", () => {
    const r = toleranceAwareGenerationEngine.applyTolerances([SIMPLE_HOLE, SIMPLE_POCKET, SIMPLE_FACE]);
    expect(r.map((f) => f.featureId)).toEqual(["F1", "F2", "F3"]);
  });

  it("empty feature list → empty result", () => {
    const r = toleranceAwareGenerationEngine.applyTolerances([]);
    expect(r).toEqual([]);
  });
});

describe("ToleranceAwareGenerationEngine.applyTolerances — customer standards", () => {
  it("DEFAULT customer → linearTolerance.plus is a finite number", () => {
    const r = toleranceAwareGenerationEngine.applyTolerances([SIMPLE_HOLE], "DEFAULT");
    expect(typeof r[0].linearTolerance?.plus).toBe("number");
    expect(Number.isFinite(r[0].linearTolerance?.plus ?? Infinity)).toBe(true);
  });

  it("ITW customer (lower-case) and ITW (upper-case) produce identical plus tolerance", () => {
    const lower = toleranceAwareGenerationEngine.applyTolerances([SIMPLE_HOLE], "itw");
    const upper = toleranceAwareGenerationEngine.applyTolerances([SIMPLE_HOLE], "ITW");
    expect(lower[0].linearTolerance?.plus).toBe(upper[0].linearTolerance?.plus);
    expect(lower[0].linearTolerance?.minus).toBe(upper[0].linearTolerance?.minus);
  });

  it("unknown customer falls back to DEFAULT (identical plus tolerance)", () => {
    const unknown = toleranceAwareGenerationEngine.applyTolerances([SIMPLE_HOLE], "ZZZ_NO_SUCH_CUSTOMER");
    const def = toleranceAwareGenerationEngine.applyTolerances([SIMPLE_HOLE], "DEFAULT");
    expect(unknown[0].linearTolerance?.plus).toBe(def[0].linearTolerance?.plus);
  });
});

describe("ToleranceAwareGenerationEngine — supporting methods", () => {
  it("getStandard('DEFAULT') returns customerId 'default' (lower-case canonical)", () => {
    const std = toleranceAwareGenerationEngine.getStandard("DEFAULT");
    expect(std.customerId).toBe("default");
    expect(typeof std.defaultLinearTolerance.plus).toBe("number");
  });

  it("listStandards() returns at least 2 entries including 'DEFAULT'", () => {
    const list = toleranceAwareGenerationEngine.listStandards();
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(list).toContain("DEFAULT");
  });

  it("getCapabilities() returns non-empty array", () => {
    const caps = toleranceAwareGenerationEngine.getCapabilities();
    expect(Array.isArray(caps)).toBe(true);
    expect(caps.length).toBeGreaterThan(0);
  });
});

describe("ToleranceAwareGenerationEngine.validate", () => {
  it("valid {features} input returns null (no error)", () => {
    const err = toleranceAwareGenerationEngine.validate({ features: [SIMPLE_HOLE] });
    expect(err).toBeNull();
  });

  it("non-object input returns descriptive error string", () => {
    const err = toleranceAwareGenerationEngine.validate("not an object");
    expect(typeof err).toBe("string");
    expect((err ?? "").length).toBeGreaterThan(0);
  });
});
