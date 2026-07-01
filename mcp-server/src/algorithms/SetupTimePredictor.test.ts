import { describe, it, expect } from "vitest";
import { predict, SetupTimePredictor, type SetupTimeInput } from "./SetupTimePredictor.js";

describe("SetupTimePredictor", () => {
  it("baseline P-job: 5 tools, 10 features, fixture=1, 8 ops, no probing", () => {
    // intercept 15 + 5·2.5=12.5 + 10·0.8=8 + 12·1=12 + 8·1.5=12 = 59.5 min
    const r = predict({ tool_count: 5, feature_count: 10, fixture_complexity: 1, op_count: 8 });
    expect(r.predicted_setup_min.value).toBeCloseTo(59.5, 1);
  });
  it("probing adds 5 min", () => {
    const r1 = predict({ tool_count: 5, feature_count: 10, fixture_complexity: 1, op_count: 8 });
    const r2 = predict({ tool_count: 5, feature_count: 10, fixture_complexity: 1, op_count: 8, requires_probing: true });
    expect(r2.predicted_setup_min.value - r1.predicted_setup_min.value).toBeCloseTo(5, 2);
  });
  it("complexity-3 fixture adds 36 min (3 × 12)", () => {
    const r0 = predict({ tool_count: 5, feature_count: 10, fixture_complexity: 0, op_count: 5 });
    const r3 = predict({ tool_count: 5, feature_count: 10, fixture_complexity: 3, op_count: 5 });
    expect(r3.predicted_setup_min.value - r0.predicted_setup_min.value).toBeCloseTo(36, 1);
    expect(r3.notes.join("|")).toContain("multi-axis tilt");
  });
  it("high tool count surfaces presetting recommendation", () => {
    const r = predict({ tool_count: 25, feature_count: 10, fixture_complexity: 1, op_count: 5 });
    expect(r.notes.join("|")).toContain("presetting");
  });
  it("per_factor_contribution sums to predicted (minus probing)", () => {
    const r = predict({ tool_count: 5, feature_count: 10, fixture_complexity: 1, op_count: 8 });
    const sum = r.per_factor_contribution_min.tools + r.per_factor_contribution_min.features + r.per_factor_contribution_min.fixture + r.per_factor_contribution_min.ops + r.per_factor_contribution_min.intercept;
    expect(sum).toBeCloseTo(r.predicted_setup_min.value, 1);
  });
  it("custom coefficients respected", () => {
    const r = predict({ tool_count: 1, feature_count: 0, fixture_complexity: 0, op_count: 0, custom_coefficients: { intercept: 100, tools: 0, features: 0, fixture: 0, ops: 0 } });
    expect(r.predicted_setup_min.value).toBe(100);
  });
  it("clamps to 8h ceiling with diagnostic", () => {
    const r = predict({ tool_count: 50, feature_count: 500, fixture_complexity: 3, op_count: 500 });
    expect(r.predicted_setup_min.value).toBe(480);
    expect(r.notes.join("|")).toContain("ceiling");
  });
  it("clamps to 5min floor with diagnostic", () => {
    const r = predict({ tool_count: 0, feature_count: 0, fixture_complexity: 0, op_count: 0, custom_coefficients: { intercept: 0, tools: 0, features: 0, fixture: 0, ops: 0 } });
    expect(r.predicted_setup_min.value).toBe(5);
    expect(r.notes.join("|")).toContain("floor");
  });
  it("out-of-range tool count diagnostic", () => {
    expect(predict({ tool_count: 100, feature_count: 10, fixture_complexity: 1, op_count: 5 }).notes.join("|")).toContain("outside");
  });
  it("invalid fixture complexity diagnostic", () => {
    expect(predict({ tool_count: 5, feature_count: 10, fixture_complexity: 5 as SetupTimeInput["fixture_complexity"], op_count: 5 }).notes.join("|")).toContain("integer in [0, 3]");
  });
  it("missing input diagnostic", () => {
    expect(predict(null as unknown as SetupTimeInput).notes.join("|")).toContain("missing");
  });
  it("version 1.0.0", () => {
    expect(SetupTimePredictor.version).toBe("1.0.0");
  });
});
