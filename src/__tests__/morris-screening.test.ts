/**
 * MorrisScreeningEngine — Unit Tests (12 tests)
 * Morris Elementary Effects for global sensitivity screening.
 * Reference: Morris (1991), Technometrics.
 */
import { describe, it, expect } from "vitest";
import { morrisScreeningEngine } from "../engines/MorrisScreeningEngine.js";

describe("MorrisScreeningEngine", () => {

  describe("calculateElementaryEffects", () => {

    it("linear function: EE should be near-constant, σ ≈ 0", () => {
      // f(x,y) = 3x + 5y  →  EE_x ≈ 3*(range_x), EE_y ≈ 5*(range_y), σ ≈ 0
      const result = morrisScreeningEngine.calculateElementaryEffects({
        model_fn: ({ x, y }) => 3 * x + 5 * y,
        parameter_ranges: { x: [0, 1], y: [0, 1] },
        n_trajectories: 20,
        n_levels: 4,
        seed: 100,
      });
      const xParam = result.parameters.find(p => p.parameter === "x")!;
      const yParam = result.parameters.find(p => p.parameter === "y")!;
      // μ* should be proportional to coefficient; σ should be small relative to μ*
      expect(xParam.mean_abs_ee).toBeGreaterThan(0);
      expect(yParam.mean_abs_ee).toBeGreaterThan(xParam.mean_abs_ee * 0.5);
      // For a purely linear function, σ/μ* should be small
      const xRatio = xParam.std_ee / Math.max(xParam.mean_abs_ee, 1e-10);
      expect(xRatio).toBeLessThan(0.5);
    });

    it("quadratic function: σ > 0 indicating nonlinearity", () => {
      // f(x) = x² has non-constant EE → σ > 0
      const result = morrisScreeningEngine.calculateElementaryEffects({
        model_fn: ({ x }) => x * x,
        parameter_ranges: { x: [0, 10] },
        n_trajectories: 20,
        n_levels: 4,
        seed: 42,
      });
      const xParam = result.parameters.find(p => p.parameter === "x")!;
      expect(xParam.std_ee).toBeGreaterThan(0);
      expect(xParam.mean_abs_ee).toBeGreaterThan(0);
    });

    it("irrelevant parameter: μ* ≈ 0 for parameter not in model", () => {
      // f(x,y,z) = 5x + 3y — z is irrelevant
      const result = morrisScreeningEngine.calculateElementaryEffects({
        model_fn: ({ x, y }) => 5 * x + 3 * y,
        parameter_ranges: { x: [0, 1], y: [0, 1], z: [0, 1] },
        n_trajectories: 30,
        n_levels: 4,
        seed: 77,
      });
      const zParam = result.parameters.find(p => p.parameter === "z")!;
      expect(zParam.mean_abs_ee).toBeLessThan(0.01);
    });

    it("3-parameter model: correct ranking by influence", () => {
      // f = 10a + 2b + 0.1c → ranking: a > b > c
      const result = morrisScreeningEngine.calculateElementaryEffects({
        model_fn: ({ a, b, c }) => 10 * a + 2 * b + 0.1 * c,
        parameter_ranges: { a: [0, 1], b: [0, 1], c: [0, 1] },
        n_trajectories: 30,
        n_levels: 4,
        seed: 55,
      });
      expect(result.ranking[0]).toBe("a");
      expect(result.ranking[1]).toBe("b");
      expect(result.ranking[2]).toBe("c");
    });

    it("monotonicity detected for monotone functions", () => {
      // f(x) = 5x is monotonically increasing
      const result = morrisScreeningEngine.calculateElementaryEffects({
        model_fn: ({ x }) => 5 * x,
        parameter_ranges: { x: [0, 10] },
        n_trajectories: 30,
        n_levels: 4,
        seed: 42,
      });
      const xParam = result.parameters.find(p => p.parameter === "x")!;
      expect(xParam.monotonicity).toBeGreaterThanOrEqual(0.8);
    });

    it("reproducible with same seed", () => {
      const params = {
        model_fn: ({ x, y }: Record<string, number>) => x * y + x,
        parameter_ranges: { x: [0, 5] as [number, number], y: [0, 5] as [number, number] },
        n_trajectories: 10,
        seed: 999,
      };
      const r1 = morrisScreeningEngine.calculateElementaryEffects(params);
      const r2 = morrisScreeningEngine.calculateElementaryEffects(params);
      expect(r1.parameters[0].mean_abs_ee).toBeCloseTo(r2.parameters[0].mean_abs_ee, 10);
    });

    it("empty parameter set handled gracefully", () => {
      const result = morrisScreeningEngine.calculateElementaryEffects({
        model_fn: () => 42,
        parameter_ranges: {},
        n_trajectories: 5,
      });
      expect(result.parameters).toHaveLength(0);
      expect(result.ranking).toHaveLength(0);
      expect(result.n_model_evaluations).toBe(0);
    });

    it("high-dimensional (10 params): correct screening", () => {
      // Only first 2 params matter: f = 8*p0 + 4*p1, rest irrelevant
      const ranges: Record<string, [number, number]> = {};
      for (let i = 0; i < 10; i++) ranges[`p${i}`] = [0, 1];

      const result = morrisScreeningEngine.calculateElementaryEffects({
        model_fn: (x) => 8 * x.p0 + 4 * x.p1,
        parameter_ranges: ranges,
        n_trajectories: 40,
        n_levels: 4,
        seed: 123,
      });

      // p0 and p1 should be top ranked
      expect(result.ranking.indexOf("p0")).toBeLessThan(2);
      expect(result.ranking.indexOf("p1")).toBeLessThan(2);
    });
  });

  describe("generateMorrisDesign", () => {

    it("design matrix has correct dimensions", () => {
      const design = morrisScreeningEngine.generateMorrisDesign({
        parameter_names: ["a", "b", "c"],
        n_trajectories: 5,
        seed: 42,
      });
      // Each trajectory has k+1 = 4 points, 5 trajectories → 20 rows × 3 cols
      expect(design.matrix.length).toBe(5 * 4);
      expect(design.matrix[0].length).toBe(3);
      expect(design.trajectory_indices.length).toBe(5);
    });

    it("all trajectories stay within bounds [0,1]", () => {
      const design = morrisScreeningEngine.generateMorrisDesign({
        parameter_names: ["x", "y", "z"],
        n_trajectories: 10,
        seed: 77,
      });
      for (const row of design.matrix) {
        for (const val of row) {
          expect(val).toBeGreaterThanOrEqual(0);
          expect(val).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe("classifyParameters", () => {

    it("linear parameter classified correctly", () => {
      const eeResult = morrisScreeningEngine.calculateElementaryEffects({
        model_fn: ({ x }) => 7 * x,
        parameter_ranges: { x: [0, 1] },
        n_trajectories: 30,
        seed: 42,
      });
      const classification = morrisScreeningEngine.classifyParameters(eeResult);
      expect(classification.linear).toContain("x");
      expect(classification.negligible).not.toContain("x");
    });

    it("negligible parameter classified correctly", () => {
      const eeResult = morrisScreeningEngine.calculateElementaryEffects({
        model_fn: ({ x, y }) => 10 * x,
        parameter_ranges: { x: [0, 1], y: [0, 1] },
        n_trajectories: 30,
        seed: 42,
      });
      const classification = morrisScreeningEngine.classifyParameters(eeResult);
      expect(classification.negligible).toContain("y");
      expect(classification.reduced_parameter_set).not.toContain("y");
    });
  });
});
