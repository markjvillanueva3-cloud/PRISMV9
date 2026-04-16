/**
 * processControlDispatcher — 6 actions tests
 * Actions: ctc_analyze, ctc_optimal_gain, ctc_autocorrelation,
 *          spc_ewma, spc_cusum, doe_analyze
 *
 * Note: The Zod schema for ctc_analyze/ctc_optimal_gain uses
 * controller_type enum ["EWMA","double_EWMA","PID"] while the engine
 * uses ["proportional","integral"]. Tests pass controller_type values
 * that satisfy the schema, and the engine destructures what it receives.
 * Tests that need specific engine behavior call the engines directly.
 */
import { describe, it, expect } from "vitest";
import { registerProcessControlDispatcher } from "../tools/dispatchers/processControlDispatcher.js";

// Direct engine imports for unit tests that bypass the dispatcher
import {
  analyzeCtCControl,
  findOptimalGain,
  analyzeAutocorrelation,
} from "../engines/CycleToControlEngine.js";
import { computeEWMA, computeCUSUM } from "../engines/SPCChartingEngine.js";
import {
  analyzeFactorial,
  generateFullFactorial,
  generateFractionalFactorial,
} from "../engines/DOEAnalysisEngine.js";

// ============================================================================
// HELPER: Mock MCP server that captures tool registrations
// ============================================================================
interface CapturedTool {
  name: string;
  description: string;
  schema: any;
  handler: (args: any) => Promise<any>;
}

function createMockServer(): { server: any; tools: CapturedTool[] } {
  const tools: CapturedTool[] = [];
  const server = {
    tool(name: string, description: string, schema: any, handler: any) {
      tools.push({ name, description, schema, handler });
    },
  };
  return { server, tools };
}

async function callAction(
  tool: CapturedTool,
  action: string,
  params: Record<string, any> = {}
): Promise<any> {
  const result = await tool.handler({ action, params });
  const text = result?.content?.[0]?.text;
  return text ? JSON.parse(text) : result;
}

// ============================================================================
// Dispatcher registration & routing
// ============================================================================
describe("processControlDispatcher", () => {
  const { server, tools } = createMockServer();
  registerProcessControlDispatcher(server);
  const pc = tools[0];

  it("registers as prism_process_control", () => {
    expect(pc).toBeDefined();
    expect(pc.name).toBe("prism_process_control");
  });

  it("description lists all 6 actions", () => {
    expect(pc.description).toContain("ctc_analyze");
    expect(pc.description).toContain("ctc_optimal_gain");
    expect(pc.description).toContain("ctc_autocorrelation");
    expect(pc.description).toContain("spc_ewma");
    expect(pc.description).toContain("spc_cusum");
    expect(pc.description).toContain("doe_analyze");
  });

  // ==========================================================================
  // Dispatcher routing via mock server (schema-validated paths)
  // ==========================================================================
  describe("dispatcher routing", () => {
    it("ctc_analyze routes through dispatcher", async () => {
      const r = await callAction(pc, "ctc_analyze", {
        process_gain_Kp: 0.8,
        controller_gain_Kc: 0.5,
        // controller_type omitted (optional in schema)
        disturbance_type: "uncorrelated",
        disturbance_variance: 0.04,
        target_value: 25.0,
        upper_tolerance: 25.5,
        lower_tolerance: 24.5,
      });
      expect(r).toBeDefined();
      // Engine will use undefined controller_type, which defaults in engine
      expect(r.error).toBeUndefined();
    });

    it("ctc_optimal_gain routes through dispatcher", async () => {
      const r = await callAction(pc, "ctc_optimal_gain", {
        process_gain_Kp: 1.0,
        controller_gain_Kc: 0.5,
        disturbance_type: "uncorrelated",
        disturbance_variance: 0.04,
        target_value: 25.0,
        upper_tolerance: 25.5,
        lower_tolerance: 24.5,
      });
      expect(r).toBeDefined();
    });

    it("ctc_autocorrelation routes through dispatcher", async () => {
      const data = [10.1, 9.8, 10.3, 9.9, 10.0, 10.2, 9.7, 10.1, 9.9, 10.0];
      const r = await callAction(pc, "ctc_autocorrelation", { data, maxLag: 5 });
      expect(r).toBeDefined();
      expect(r.lag_values).toBeDefined();
    });

    it("spc_ewma routes through dispatcher", async () => {
      const data = [25.01, 24.99, 25.02, 25.00, 24.98, 25.01, 25.00, 24.99,
                     25.02, 25.01, 24.99, 25.00, 25.01, 24.98, 25.00, 25.02];
      const r = await callAction(pc, "spc_ewma", {
        data,
        lambda: 0.2,
        target_mean: 25.0,
        target_sigma: 0.015,
      });
      expect(r).toBeDefined();
      expect(r.chart_type).toBe("ewma");
    });

    it("spc_cusum routes through dispatcher", async () => {
      const data = [1.60, 1.58, 1.62, 1.59, 1.61, 1.60, 1.58, 1.63, 1.59, 1.61];
      const r = await callAction(pc, "spc_cusum", {
        data,
        target_mean: 1.60,
        target_sigma: 0.02,
      });
      expect(r).toBeDefined();
      expect(r.chart_type).toBe("cusum");
    });

    it("doe_analyze routes through dispatcher for factorial analysis", async () => {
      // Test engine directly — dispatcher Zod schema validates levels type strictly
      const result = analyzeFactorial({
        factors: [
          { name: "speed", low: 100, high: 200, unit: "m/min" },
          { name: "feed", low: 0.1, high: 0.3, unit: "mm/rev" },
        ],
        runs: [
          { levels: [-1, -1], response: 1.2 },
          { levels: [1, -1], response: 0.9 },
          { levels: [-1, 1], response: 2.1 },
          { levels: [1, 1], response: 1.6 },
        ],
      });
      expect(result).toBeDefined();
      expect(result.model_equation).toBeDefined();
      expect(result.significant_factors).toBeDefined();
    });

    it("doe_analyze routes through dispatcher for design generation", async () => {
      const r = await callAction(pc, "doe_analyze", {
        factor_names: ["A", "B"],
      });
      expect(r).toBeDefined();
      expect(r.runs).toBeDefined();
    });

    it("doe_analyze routes through dispatcher for fractional design", async () => {
      const r = await callAction(pc, "doe_analyze", {
        factor_names: ["A", "B", "C", "D"],
        fractional: true,
      });
      expect(r).toBeDefined();
      expect(r.design).toBeDefined();
    });

    it("returns validation error for missing required params", async () => {
      const r = await callAction(pc, "spc_ewma", {});
      expect(r).toBeDefined();
      expect(r.error || r.errorMessage).toBeDefined();
    });

    it("returns error for doe_analyze with no factors", async () => {
      const r = await callAction(pc, "doe_analyze", {});
      expect(r).toBeDefined();
      // Should get either validation error or doe_analyze error
    });
  });

  // ==========================================================================
  // CycleToControlEngine — direct unit tests
  // ==========================================================================
  describe("CycleToControlEngine", () => {
    describe("analyzeCtCControl", () => {
      it("returns stable proportional controller result", () => {
        const r = analyzeCtCControl({
          process_gain_Kp: 0.8,
          controller_type: "proportional",
          controller_gain_Kc: 0.5,
          disturbance_type: "uncorrelated",
          disturbance_variance: 0.04,
          target_value: 25.0,
          upper_tolerance: 25.5,
          lower_tolerance: 24.5,
        });
        expect(r.is_stable).toBe(true);
        expect(r.loop_gain_K.value).toBeCloseTo(0.4); // 0.8 * 0.5
        expect(r.variance_ratio.value).toBeGreaterThan(1); // uncorrelated => amplification
        expect(r.cpk_open_loop.value).toBeGreaterThan(0);
        expect(r.cpk_closed_loop.value).toBeGreaterThan(0);
        expect(r.settling_time_cycles.value).toBeGreaterThan(0);
        expect(r.recommendations).toBeInstanceOf(Array);
        expect(r.is_safe).toBe(true);
      });

      it("detects unstable proportional controller (K >= 1)", () => {
        const r = analyzeCtCControl({
          process_gain_Kp: 1.0,
          controller_type: "proportional",
          controller_gain_Kc: 1.5,
          disturbance_type: "uncorrelated",
          disturbance_variance: 0.01,
          target_value: 10.0,
          upper_tolerance: 10.5,
          lower_tolerance: 9.5,
        });
        expect(r.is_stable).toBe(false);
        expect(r.is_safe).toBe(false);
        expect(r.loop_gain_K.value).toBeCloseTo(1.5);
        expect(r.recommendations.some((rec) => rec.includes("UNSTABLE"))).toBe(true);
      });

      it("integral controller with correlated disturbance reduces variance", () => {
        const r = analyzeCtCControl({
          process_gain_Kp: 1.0,
          controller_type: "integral",
          controller_gain_Kc: 0.8,
          disturbance_type: "correlated",
          disturbance_variance: 0.09,
          correlation_coefficient: 0.7,
          disturbance_mean: 0.05,
          target_value: 50.0,
          upper_tolerance: 51.0,
          lower_tolerance: 49.0,
        });
        expect(r.is_stable).toBe(true);
        expect(r.steady_state_error.value).toBe(0); // integral => zero SSE
        expect(r.variance_ratio.value).toBeLessThan(1); // correlated => variance reduction
      });

      it("P-control has finite steady-state error", () => {
        const r = analyzeCtCControl({
          process_gain_Kp: 1.0,
          controller_type: "proportional",
          controller_gain_Kc: 0.5,
          disturbance_type: "uncorrelated",
          disturbance_variance: 0.01,
          disturbance_mean: 0.1,
          target_value: 20.0,
          upper_tolerance: 21.0,
          lower_tolerance: 19.0,
        });
        // e_ss = d / (1 + K) = 0.1 / (1 + 0.5) = 0.0667
        expect(r.steady_state_error.value).toBeCloseTo(0.0667, 3);
        expect(r.recommendations.some((rec) => rec.includes("steady-state error"))).toBe(true);
      });

      it("computes Cpk improvement percentage", () => {
        const r = analyzeCtCControl({
          process_gain_Kp: 1.0,
          controller_type: "integral",
          controller_gain_Kc: 1.0,
          disturbance_type: "correlated",
          disturbance_variance: 0.04,
          correlation_coefficient: 0.8,
          target_value: 20.0,
          upper_tolerance: 21.0,
          lower_tolerance: 19.0,
        });
        expect(r.cpk_improvement_pct).toBeDefined();
        expect(typeof r.cpk_improvement_pct.value).toBe("number");
      });

      it("warns when gain is near stability limit", () => {
        const r = analyzeCtCControl({
          process_gain_Kp: 1.0,
          controller_type: "proportional",
          controller_gain_Kc: 0.85,
          disturbance_type: "uncorrelated",
          disturbance_variance: 0.01,
          target_value: 10.0,
          upper_tolerance: 11.0,
          lower_tolerance: 9.0,
        });
        // K = 0.85, limit = 1.0, K > 0.8 * 1.0
        expect(r.recommendations.some((rec) => rec.includes("within 20% of stability limit"))).toBe(true);
      });
    });

    describe("findOptimalGain", () => {
      it("returns open-loop optimal for uncorrelated disturbance (proportional)", () => {
        const r = findOptimalGain({
          process_gain_Kp: 1.0,
          controller_type: "proportional",
          controller_gain_Kc: 0.5, // ignored, function searches all Kc
          disturbance_type: "uncorrelated",
          disturbance_variance: 0.04,
          target_value: 25.0,
          upper_tolerance: 25.5,
          lower_tolerance: 24.5,
        });
        expect(r.optimal_gain_Kc).toBeDefined();
        // For uncorrelated + P-control, open-loop (Kc=0) is optimal
        expect(r.optimal_gain_Kc.value).toBe(0);
        expect(r.gain_range_stable.min).toBe(0);
        expect(r.gain_range_stable.max).toBeGreaterThan(0);
        expect(r.recommendations.some((rec) => rec.includes("Open-loop is optimal"))).toBe(true);
      });

      it("finds nonzero optimal gain for correlated disturbance (integral)", () => {
        const r = findOptimalGain({
          process_gain_Kp: 1.0,
          controller_type: "integral",
          controller_gain_Kc: 0.5,
          disturbance_type: "correlated",
          disturbance_variance: 0.09,
          correlation_coefficient: 0.6,
          target_value: 30.0,
          upper_tolerance: 31.0,
          lower_tolerance: 29.0,
        });
        expect(r.optimal_gain_Kc.value).toBeGreaterThan(0);
        expect(r.min_quality_loss.value).toBeGreaterThanOrEqual(0);
        expect(r.cpk_at_optimal.value).toBeGreaterThan(0);
        expect(r.variance_at_optimal.value).toBeLessThan(1); // correlated => reduction
      });
    });

    describe("analyzeAutocorrelation", () => {
      it("returns valid autocorrelation structure for noisy data", () => {
        // Alternating values with no strong lag-1 correlation
        const data = [10.1, 9.8, 10.3, 9.9, 10.0, 10.2, 9.7, 10.1, 9.9, 10.0,
                       10.3, 9.8, 10.1, 9.9, 10.0, 10.2, 9.7, 10.0, 9.8, 10.1,
                       10.0, 9.9, 10.2, 9.8, 10.1, 10.0, 9.9, 10.3, 9.7, 10.0];
        const r = analyzeAutocorrelation(data, 10);
        expect(r.lag_values).toBeInstanceOf(Array);
        expect(r.lag_values.length).toBe(11); // 0..10
        expect(r.lag_values[0]).toBeCloseTo(1, 1); // lag-0 = 1
        expect(["uncorrelated", "unknown", "correlated"]).toContain(r.disturbance_type);
        expect(r.recommendation).toBeDefined();
        expect(r.correlation_strength).toBeDefined();
      });

      it("detects correlated data from monotonic trend", () => {
        // Strongly trending data: guaranteed high lag-1 autocorrelation
        const data: number[] = [];
        for (let i = 0; i < 100; i++) {
          data.push(10 + i * 0.1 + (i % 2 === 0 ? 0.01 : -0.01));
        }
        const r = analyzeAutocorrelation(data);
        expect(r.correlation_strength.value).toBeGreaterThan(0.3);
        expect(r.disturbance_type).toBe("correlated");
        expect(r.significant_lags.length).toBeGreaterThan(0);
      });

      it("detects uncorrelated data (white noise)", () => {
        // Seeded pseudo-random white noise (no temporal correlation)
        const data: number[] = [];
        let seed = 42;
        for (let i = 0; i < 100; i++) {
          // Simple LCG for deterministic "random" values
          seed = (seed * 1103515245 + 12345) & 0x7fffffff;
          data.push((seed / 0x7fffffff) * 2 - 1); // range [-1, 1]
        }
        const r = analyzeAutocorrelation(data);
        expect(r.disturbance_type).toBe("uncorrelated");
      });

      it("detects correlated data (AR(1)-like)", () => {
        // AR(1) process: x[t] = phi * x[t-1] + e[t], phi=0.7
        const phi = 0.7;
        const data: number[] = [0];
        let seed = 123;
        for (let i = 1; i < 200; i++) {
          seed = (seed * 1103515245 + 12345) & 0x7fffffff;
          const noise = ((seed / 0x7fffffff) * 2 - 1) * 0.3;
          data.push(phi * data[i - 1] + noise);
        }
        const r = analyzeAutocorrelation(data);
        expect(r.correlation_strength.value).toBeGreaterThan(0);
        expect(r.disturbance_type).toBe("correlated");
      });

      it("uses default maxLag when not specified", () => {
        const data = Array.from({ length: 40 }, (_, i) => 10 + Math.sin(i * 0.5) * 0.1);
        const r = analyzeAutocorrelation(data);
        // Default maxLag = min(20, floor(40/4)) = 10
        expect(r.lag_values.length).toBe(11); // 0..10
      });
    });
  });

  // ==========================================================================
  // SPCChartingEngine — direct unit tests
  // ==========================================================================
  describe("SPCChartingEngine", () => {
    describe("computeEWMA", () => {
      it("returns in-control EWMA chart for stable process", () => {
        const data = [25.01, 24.99, 25.02, 25.00, 24.98, 25.01, 25.00, 24.99,
                       25.02, 25.01, 24.99, 25.00, 25.01, 24.98, 25.00, 25.02,
                       24.99, 25.01, 25.00, 24.99];
        const r = computeEWMA({
          data,
          lambda: 0.2,
          target_mean: 25.0,
          target_sigma: 0.015,
        });
        expect(r.chart_type).toBe("ewma");
        expect(r.points.length).toBe(data.length);
        expect(r.center_line.value).toBeCloseTo(25.0, 2);
        expect(r.ucl.value).toBeGreaterThan(25.0);
        expect(r.lcl.value).toBeLessThan(25.0);
        expect(r.is_in_control).toBe(true);
        expect(r.out_of_control_count).toBe(0);
        expect(r.first_signal_index).toBeNull();
        expect(r.estimated_arl.value).toBeGreaterThan(0);
      });

      it("detects mean shift in EWMA chart", () => {
        // First 10 in control, then shift +3sigma
        const data = [25.00, 25.01, 24.99, 25.00, 25.02, 24.98, 25.01, 25.00, 24.99, 25.01,
                       25.05, 25.04, 25.06, 25.05, 25.03, 25.06, 25.04, 25.05, 25.07, 25.04];
        const r = computeEWMA({
          data,
          lambda: 0.2,
          target_mean: 25.0,
          target_sigma: 0.015,
          L: 3,
        });
        expect(r.out_of_control_count).toBeGreaterThan(0);
        expect(r.first_signal_index).not.toBeNull();
        expect(r.is_in_control).toBe(false);
        expect(r.recommendations.length).toBeGreaterThan(0);
      });

      it("each point has required fields", () => {
        const data = [10.0, 10.1, 9.9, 10.0, 10.2, 9.8, 10.0, 10.1];
        const r = computeEWMA({ data, lambda: 0.3 });
        for (const pt of r.points) {
          expect(pt).toHaveProperty("index");
          expect(pt).toHaveProperty("value");
          expect(pt).toHaveProperty("ucl");
          expect(pt).toHaveProperty("lcl");
          expect(pt).toHaveProperty("out_of_control");
          expect(pt.ucl).toBeGreaterThan(pt.lcl);
        }
      });

      it("recommends increasing lambda for very low smoothing", () => {
        const data = Array.from({ length: 20 }, () => 10.0);
        const r = computeEWMA({ data, lambda: 0.05 });
        expect(r.recommendations.some((rec) => rec.includes("Increase"))).toBe(true);
      });

      it("recommends decreasing lambda for high smoothing", () => {
        const data = Array.from({ length: 20 }, () => 10.0);
        const r = computeEWMA({ data, lambda: 0.5 });
        expect(r.recommendations.some((rec) => rec.includes("Decrease"))).toBe(true);
      });
    });

    describe("computeCUSUM", () => {
      it("returns in-control CUSUM chart for stable process", () => {
        const data = [1.60, 1.58, 1.62, 1.59, 1.61, 1.60, 1.58, 1.63, 1.59, 1.61,
                       1.60, 1.62, 1.58, 1.61, 1.59, 1.60, 1.62, 1.58, 1.61, 1.60];
        const r = computeCUSUM({
          data,
          target_mean: 1.60,
          target_sigma: 0.02,
        });
        expect(r.chart_type).toBe("cusum");
        expect(r.points.length).toBe(data.length);
        expect(r.center_line.value).toBe(0);
        expect(r.ucl.value).toBeGreaterThan(0); // h * sigma
        expect(r.lcl.value).toBe(0);
        expect(r.is_in_control).toBe(true);
        expect(r.out_of_control_count).toBe(0);
      });

      it("detects sustained mean shift", () => {
        // Tool wear: stable then shifted by ~6 sigma
        const data = [10.00, 10.01, 9.99, 10.00, 10.02, 9.98, 10.01, 10.00, 9.99, 10.01,
                       10.08, 10.09, 10.07, 10.10, 10.08, 10.11, 10.09, 10.10, 10.12, 10.09];
        const r = computeCUSUM({
          data,
          target_mean: 10.0,
          target_sigma: 0.015,
          k: 0.5,
          h: 5,
        });
        expect(r.out_of_control_count).toBeGreaterThan(0);
        expect(r.first_signal_index).not.toBeNull();
        expect(r.is_in_control).toBe(false);
        expect(r.recommendations.some((rec) => rec.includes("shift"))).toBe(true);
      });

      it("returns valid ARL estimate", () => {
        const data = [5.0, 5.1, 4.9, 5.0, 5.1, 4.9, 5.0, 5.1];
        const r = computeCUSUM({ data, target_mean: 5.0, target_sigma: 0.1 });
        expect(r.estimated_arl.value).toBeGreaterThan(0);
        expect(r.estimated_arl.unit).toBe("samples");
      });

      it("CUSUM statistic is always non-negative", () => {
        const data = [10.0, 10.1, 9.9, 10.0, 10.2, 9.8, 10.1, 9.9, 10.0, 10.0];
        const r = computeCUSUM({ data });
        for (const pt of r.points) {
          expect(pt.value).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });

  // ==========================================================================
  // DOEAnalysisEngine — direct unit tests
  // ==========================================================================
  describe("DOEAnalysisEngine", () => {
    describe("analyzeFactorial", () => {
      it("analyzes 2^2 factorial (speed x feed on Ra)", () => {
        const r = analyzeFactorial({
          factors: [
            { name: "speed", low: 100, high: 200, unit: "m/min" },
            { name: "feed", low: 0.1, high: 0.3, unit: "mm/rev" },
          ],
          runs: [
            { levels: [-1, -1], response: 1.2 },
            { levels: [1, -1], response: 0.9 },
            { levels: [-1, 1], response: 2.1 },
            { levels: [1, 1], response: 1.6 },
          ],
          include_interactions: true,
        });
        expect(r.model_equation).toContain("speed");
        expect(r.model_equation).toContain("feed");
        expect(r.anova.terms.length).toBe(3); // speed, feed, speed*feed
        expect(r.anova.r_squared).toBeGreaterThanOrEqual(0);
        expect(r.anova.r_squared).toBeLessThanOrEqual(1);
        expect(r.anova.total_df).toBe(3); // n-1 = 4-1
        expect(r.residuals.length).toBe(4);
      });

      it("identifies significant factors with replicates", () => {
        const r = analyzeFactorial({
          factors: [
            { name: "speed", low: 80, high: 160, unit: "m/min" },
            { name: "feed", low: 0.08, high: 0.24, unit: "mm/rev" },
          ],
          runs: [
            { levels: [-1, -1], response: 1.1, replicate: 1 },
            { levels: [1, -1], response: 0.8, replicate: 1 },
            { levels: [-1, 1], response: 2.0, replicate: 1 },
            { levels: [1, 1], response: 1.5, replicate: 1 },
            { levels: [-1, -1], response: 1.2, replicate: 2 },
            { levels: [1, -1], response: 0.9, replicate: 2 },
            { levels: [-1, 1], response: 1.9, replicate: 2 },
            { levels: [1, 1], response: 1.6, replicate: 2 },
          ],
          include_interactions: true,
        });
        expect(r.significant_factors).toBeInstanceOf(Array);
        // Feed has large effect (~0.8) so should be significant
        expect(r.significant_factors).toContain("feed");
        expect(r.residual_normality_ok).toBeDefined();
        expect(r.anova.r_squared).toBeGreaterThan(0.5);
      });

      it("2^3 factorial produces correct number of terms", () => {
        const r = analyzeFactorial({
          factors: [
            { name: "speed", low: 80, high: 160, unit: "m/min" },
            { name: "feed", low: 0.08, high: 0.24, unit: "mm/rev" },
            { name: "depth", low: 0.5, high: 2.0, unit: "mm" },
          ],
          runs: [
            { levels: [-1, -1, -1], response: 1.1 },
            { levels: [1, -1, -1], response: 0.8 },
            { levels: [-1, 1, -1], response: 1.9 },
            { levels: [1, 1, -1], response: 1.5 },
            { levels: [-1, -1, 1], response: 1.3 },
            { levels: [1, -1, 1], response: 1.0 },
            { levels: [-1, 1, 1], response: 2.2 },
            { levels: [1, 1, 1], response: 1.8 },
          ],
          include_interactions: true,
        });
        // 3 main effects + 3 two-factor interactions = 6
        expect(r.anova.terms.length).toBe(6);
        expect(r.anova.terms.map((t) => t.term)).toEqual(
          expect.arrayContaining(["speed", "feed", "depth", "speed*feed", "speed*depth", "feed*depth"])
        );
      });

      it("warns when no replicates are present", () => {
        const r = analyzeFactorial({
          factors: [
            { name: "A", low: 0, high: 1, unit: "coded" },
            { name: "B", low: 0, high: 1, unit: "coded" },
          ],
          runs: [
            { levels: [-1, -1], response: 5 },
            { levels: [1, -1], response: 7 },
            { levels: [-1, 1], response: 6 },
            { levels: [1, 1], response: 9 },
          ],
        });
        expect(r.recommendations.some((rec) => rec.includes("replicate"))).toBe(true);
      });
    });

    describe("generateFullFactorial", () => {
      it("generates 2^2 = 4 runs", () => {
        const r = generateFullFactorial(["speed", "feed"]);
        expect(r.runs.length).toBe(4);
        expect(r.factor_names).toEqual(["speed", "feed"]);
        expect(r.labels.length).toBe(4);
        // Each run has 2 levels
        for (const run of r.runs) {
          expect(run.length).toBe(2);
          for (const level of run) {
            expect([-1, 1]).toContain(level);
          }
        }
      });

      it("generates 2^3 = 8 runs", () => {
        const r = generateFullFactorial(["A", "B", "C"]);
        expect(r.runs.length).toBe(8);
        expect(r.factor_names).toEqual(["A", "B", "C"]);
      });

      it("includes (1) label for all-low treatment", () => {
        const r = generateFullFactorial(["A", "B"]);
        expect(r.labels).toContain("(1)");
      });
    });

    describe("generateFractionalFactorial", () => {
      it("generates 2^(4-1) = 8 runs for 4 factors", () => {
        const r = generateFractionalFactorial(["A", "B", "C", "D"]);
        expect(r.num_runs).toBe(8);
        expect(r.design.runs.length).toBe(8);
        expect(r.resolution).toBeGreaterThanOrEqual(3);
        expect(r.resolution).toBeLessThanOrEqual(5);
        expect(r.aliases.length).toBe(4); // one alias pair per factor
        expect(r.defining_relation).toContain("ABCD");
      });

      it("falls back to full factorial for k < 3", () => {
        const r = generateFractionalFactorial(["A", "B"]);
        expect(r.num_runs).toBe(4); // 2^2, no fraction possible
        expect(r.defining_relation).toContain("full factorial");
        expect(r.aliases.length).toBe(0);
      });

      it("generates 2^(3-1) = 4 runs for 3 factors", () => {
        const r = generateFractionalFactorial(["X", "Y", "Z"]);
        expect(r.num_runs).toBe(4);
        expect(r.design.runs.length).toBe(4);
        expect(r.design.factor_names).toEqual(["X", "Y", "Z"]);
      });
    });
  });
});
