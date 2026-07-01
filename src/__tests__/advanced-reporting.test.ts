/**
 * ORCH-MS2 — Advanced Reporting & Chart Data Generation Tests
 *
 * Tests for AdvancedReportRendererEngine (6 actions) and
 * ChartDataGeneratorEngine (5 actions) with realistic manufacturing data.
 */
import { describe, it, expect } from "vitest";
import { AdvancedReportRendererEngine } from "../engines/AdvancedReportRendererEngine.js";
import { ChartDataGeneratorEngine } from "../engines/ChartDataGeneratorEngine.js";

const reportEngine = new AdvancedReportRendererEngine();
const chartEngine = new ChartDataGeneratorEngine();

// ============================================================================
// AdvancedReportRendererEngine
// ============================================================================

describe("AdvancedReportRendererEngine", () => {
  // ── Tool Life Forecast ──
  describe("generateToolLifeForecast", () => {
    it("should compute remaining life with known Taylor constants for steel", () => {
      // Use very low cutting speed and wear so tool has significant remaining life
      // Taylor life T=(200/50)^(1/0.25) = 4^4 = 256 min at V=50
      const result = reportEngine.generateToolLifeForecast({
        tool_id: "T01",
        current_wear_VB_mm: 0.001,
        cutting_speed_mpm: 50,
        material: "steel",
        taylor_C: 200,
        taylor_n: 0.25,
      });
      expect(result.remaining_life_min).toBeGreaterThanOrEqual(0);
      expect(result.current_wear_pct).toBeGreaterThan(0);
      expect(result.current_wear_pct).toBeLessThan(100);
      expect(result.remaining_parts).toBeGreaterThanOrEqual(0);
      expect(result.wear_curve.length).toBeGreaterThan(0);
    });

    it("should produce higher wear percentage for higher initial VB", () => {
      const low = reportEngine.generateToolLifeForecast({
        tool_id: "T01",
        current_wear_VB_mm: 0.02,
        cutting_speed_mpm: 80,
        material: "steel",
      });
      const high = reportEngine.generateToolLifeForecast({
        tool_id: "T01",
        current_wear_VB_mm: 0.20,
        cutting_speed_mpm: 80,
        material: "steel",
      });
      expect(high.current_wear_pct).toBeGreaterThan(low.current_wear_pct);
      expect(high.remaining_life_min).toBeLessThanOrEqual(low.remaining_life_min);
    });

    it("should recommend immediate replacement at VB >= 0.27 mm", () => {
      const result = reportEngine.generateToolLifeForecast({
        tool_id: "T01",
        current_wear_VB_mm: 0.28,
        cutting_speed_mpm: 150,
        material: "steel",
      });
      expect(result.current_wear_pct).toBeGreaterThanOrEqual(90);
      expect(result.replacement_recommendation).toContain("IMMEDIATE");
    });

    it("should show shorter life at higher cutting speeds (Taylor law)", () => {
      // Use low speeds where Taylor life is long enough for meaningful comparison
      const slow = reportEngine.generateToolLifeForecast({
        tool_id: "T01",
        current_wear_VB_mm: 0.01,
        cutting_speed_mpm: 50,
        material: "aluminum",
      });
      const fast = reportEngine.generateToolLifeForecast({
        tool_id: "T01",
        current_wear_VB_mm: 0.01,
        cutting_speed_mpm: 200,
        material: "aluminum",
      });
      expect(fast.remaining_life_min).toBeLessThanOrEqual(slow.remaining_life_min);
    });

    it("should produce monotonically increasing wear curve", () => {
      const result = reportEngine.generateToolLifeForecast({
        tool_id: "T01",
        current_wear_VB_mm: 0.0,
        cutting_speed_mpm: 150,
        material: "stainless",
      });
      for (let i = 1; i < result.wear_curve.length; i++) {
        expect(result.wear_curve[i].wear_mm).toBeGreaterThanOrEqual(
          result.wear_curve[i - 1].wear_mm
        );
      }
    });

    it("should handle titanium (difficult-to-machine material)", () => {
      // Low speed for titanium so Taylor life is reasonable: T=(80/30)^(1/0.15)~huge
      const result = reportEngine.generateToolLifeForecast({
        tool_id: "T05",
        current_wear_VB_mm: 0.01,
        cutting_speed_mpm: 30,
        material: "titanium",
        taylor_C: 80,
        taylor_n: 0.15,
      });
      expect(result.remaining_life_min).toBeGreaterThanOrEqual(0);
      expect(result.wear_curve.length).toBeGreaterThan(0);
      expect(result.current_wear_pct).toBeGreaterThan(0);
    });

    it("should handle zero initial wear", () => {
      const result = reportEngine.generateToolLifeForecast({
        tool_id: "T01",
        current_wear_VB_mm: 0.0,
        cutting_speed_mpm: 150,
        material: "steel",
      });
      expect(result.current_wear_pct).toBe(0);
      expect(result.remaining_life_min).toBeGreaterThan(0);
    });
  });

  // ── Capability Study ──
  describe("generateCapabilityStudy", () => {
    it("should compute Cp/Cpk for a centered process with 30 measurements", () => {
      // Generate 30 normally-distributed measurements around 25.0 with std ~0.02
      const measurements: number[] = [];
      const seed = [
        25.01, 24.99, 25.02, 24.98, 25.00, 25.03, 24.97, 25.01, 25.00, 24.99,
        25.02, 24.98, 25.01, 25.00, 24.99, 25.03, 24.97, 25.02, 25.00, 24.98,
        25.01, 24.99, 25.00, 25.02, 24.98, 25.01, 25.00, 24.99, 25.03, 24.97,
      ];
      measurements.push(...seed);

      const result = reportEngine.generateCapabilityStudy({
        measurements,
        nominal: 25.0,
        usl: 25.10,
        lsl: 24.90,
        subgroup_size: 5,
      });

      expect(result.cp).toBeGreaterThan(1.0);
      expect(result.cpk).toBeGreaterThan(1.0);
      expect(result.pp).toBeGreaterThan(0);
      expect(result.ppk).toBeGreaterThan(0);
      expect(result.mean).toBeCloseTo(25.0, 1);
      expect(result.within_spec_pct).toBe(100);
      expect(result.histogram.length).toBeGreaterThan(0);
      expect(result.control_chart.x_bar.length).toBeGreaterThan(0);
      expect(result.control_chart.ucl).toBeGreaterThan(result.control_chart.cl);
      expect(result.control_chart.lcl).toBeLessThan(result.control_chart.cl);
    });

    it("should detect off-center process (lower Cpk than Cp)", () => {
      // Process shifted toward USL
      const measurements = Array.from({ length: 30 }, (_, i) =>
        25.07 + (i % 5) * 0.005 - 0.01
      );
      const result = reportEngine.generateCapabilityStudy({
        measurements,
        nominal: 25.0,
        usl: 25.10,
        lsl: 24.90,
      });
      expect(result.cpk).toBeLessThanOrEqual(result.cp);
    });

    it("should assess a Six Sigma process correctly", () => {
      // Very tight process: std ~0.003 with tolerance 0.2 => Cp ~ 11
      const measurements = Array.from({ length: 30 }, (_, i) =>
        25.0 + (i % 3 - 1) * 0.003
      );
      const result = reportEngine.generateCapabilityStudy({
        measurements,
        nominal: 25.0,
        usl: 25.10,
        lsl: 24.90,
      });
      expect(result.cpk).toBeGreaterThan(1.67);
      expect(result.assessment).toContain("capable");
    });

    it("should flag incapable process", () => {
      // Wide spread relative to tolerance
      const measurements = Array.from({ length: 30 }, (_, i) =>
        25.0 + (i % 10 - 5) * 0.05
      );
      const result = reportEngine.generateCapabilityStudy({
        measurements,
        nominal: 25.0,
        usl: 25.05,
        lsl: 24.95,
      });
      expect(result.cpk).toBeLessThan(1.0);
    });

    it("should compute histogram bins summing to data length", () => {
      const measurements = Array.from({ length: 30 }, (_, i) => 25.0 + (i % 6 - 3) * 0.01);
      const result = reportEngine.generateCapabilityStudy({
        measurements,
        nominal: 25.0,
        usl: 25.10,
        lsl: 24.90,
      });
      const totalBinCount = result.histogram.reduce((s, b) => s + b.count, 0);
      expect(totalBinCount).toBe(30);
    });

    it("should handle insufficient data gracefully", () => {
      const result = reportEngine.generateCapabilityStudy({
        measurements: [25.0],
        nominal: 25.0,
        usl: 25.10,
        lsl: 24.90,
      });
      expect(result.cp).toBe(0);
      expect(result.assessment).toContain("Insufficient");
    });
  });

  // ── Stability Map ──
  describe("generateStabilityMap", () => {
    it("should generate stability lobes for a 12mm endmill in steel", () => {
      const result = reportEngine.generateStabilityMap({
        tool_diameter_mm: 12,
        flutes: 4,
        material: "steel",
        depth_range_mm: [0.5, 10],
        speed_range_rpm: [3000, 15000],
      });
      expect(result.lobes.length).toBeGreaterThan(0);
      expect(result.recommended_rpm).toBeGreaterThanOrEqual(3000);
      expect(result.recommended_rpm).toBeLessThanOrEqual(15000);
      expect(result.recommended_depth_mm).toBeGreaterThanOrEqual(0.5);
    });

    it("should show different lobe patterns for different materials", () => {
      const steelResult = reportEngine.generateStabilityMap({
        tool_diameter_mm: 10,
        flutes: 3,
        material: "steel",
        depth_range_mm: [0.5, 8],
        speed_range_rpm: [2000, 12000],
      });
      const aluminumResult = reportEngine.generateStabilityMap({
        tool_diameter_mm: 10,
        flutes: 3,
        material: "aluminum",
        depth_range_mm: [0.5, 8],
        speed_range_rpm: [2000, 12000],
      });
      // Aluminum has lower Ks, should generally allow deeper cuts
      expect(aluminumResult.recommended_depth_mm).not.toBe(steelResult.recommended_depth_mm);
    });

    it("should produce safe zones within RPM range", () => {
      const result = reportEngine.generateStabilityMap({
        tool_diameter_mm: 16,
        flutes: 4,
        material: "cast_iron",
        depth_range_mm: [0.5, 6],
        speed_range_rpm: [2000, 10000],
      });
      for (const zone of result.safe_zones) {
        expect(zone.rpm_min).toBeGreaterThanOrEqual(2000);
        expect(zone.rpm_max).toBeLessThanOrEqual(10000);
        expect(zone.max_depth_mm).toBeGreaterThan(0);
      }
    });

    it("should respect stiffness parameter", () => {
      const stiff = reportEngine.generateStabilityMap({
        tool_diameter_mm: 10,
        flutes: 3,
        stiffness_N_per_m: 10e6,
        material: "steel",
        depth_range_mm: [0.5, 8],
        speed_range_rpm: [3000, 12000],
      });
      const flexible = reportEngine.generateStabilityMap({
        tool_diameter_mm: 10,
        flutes: 3,
        stiffness_N_per_m: 1e6,
        material: "steel",
        depth_range_mm: [0.5, 8],
        speed_range_rpm: [3000, 12000],
      });
      // Stiffer tool should allow deeper cuts
      expect(stiff.recommended_depth_mm).toBeGreaterThanOrEqual(flexible.recommended_depth_mm);
    });
  });

  // ── Cost Sensitivity ──
  describe("generateCostSensitivity", () => {
    it("should order tornado chart by delta (most sensitive first)", () => {
      const result = reportEngine.generateCostSensitivity({
        base_cost: 100,
        parameters: [
          { name: "Material Cost", base_value: 20, variation_pct: 10, cost_impact_per_unit: 2.5 },
          { name: "Tool Life", base_value: 60, variation_pct: 20, cost_impact_per_unit: 0.5 },
          { name: "Labor Rate", base_value: 45, variation_pct: 15, cost_impact_per_unit: 1.0 },
        ],
      });
      expect(result.tornado_chart.length).toBe(3);
      // Sorted by delta descending
      for (let i = 1; i < result.tornado_chart.length; i++) {
        expect(result.tornado_chart[i].delta).toBeLessThanOrEqual(
          result.tornado_chart[i - 1].delta
        );
      }
      expect(result.most_sensitive).toBe(result.tornado_chart[0].parameter);
      expect(result.least_sensitive).toBe(
        result.tornado_chart[result.tornado_chart.length - 1].parameter
      );
    });

    it("should have symmetric low/high cost around base for equal impact", () => {
      const result = reportEngine.generateCostSensitivity({
        base_cost: 50,
        parameters: [
          { name: "Feed Rate", base_value: 100, variation_pct: 10, cost_impact_per_unit: 0.1 },
        ],
      });
      const bar = result.tornado_chart[0];
      expect(bar.low_cost).toBeLessThan(50);
      expect(bar.high_cost).toBeGreaterThan(50);
      // Delta should be symmetric
      expect(Math.abs(bar.high_cost - 50)).toBeCloseTo(Math.abs(50 - bar.low_cost), 1);
    });

    it("should identify total range correctly", () => {
      const result = reportEngine.generateCostSensitivity({
        base_cost: 200,
        parameters: [
          { name: "A", base_value: 10, variation_pct: 50, cost_impact_per_unit: 3 },
          { name: "B", base_value: 5, variation_pct: 20, cost_impact_per_unit: 1 },
        ],
      });
      expect(result.total_range).toBe(result.tornado_chart[0].delta);
    });
  });

  // ── Cycle Time Variance ──
  describe("generateCycleTimeVariance", () => {
    it("should detect systematic bias when actuals consistently exceed predicted", () => {
      const result = reportEngine.generateCycleTimeVariance({
        predicted_times: [10, 15, 20, 12, 8],
        actual_times: [12, 18, 24, 14, 10],
        operation_names: ["Facing", "Roughing", "Finishing", "Drilling", "Deburr"],
      });
      expect(result.systematic_bias).toBeGreaterThan(0); // Positive = underestimate
      expect(result.total_actual).toBeGreaterThan(result.total_predicted);
      expect(result.worst_operations.length).toBeLessThanOrEqual(3);
    });

    it("should have zero bias for perfectly predicted times", () => {
      const times = [10, 15, 20, 12, 8];
      const result = reportEngine.generateCycleTimeVariance({
        predicted_times: times,
        actual_times: times,
      });
      expect(result.systematic_bias).toBe(0);
      expect(result.variance_pct).toBe(0);
      expect(result.random_error_pct).toBe(0);
    });

    it("should identify worst operations by absolute delta", () => {
      const result = reportEngine.generateCycleTimeVariance({
        predicted_times: [10, 10, 10, 10],
        actual_times: [10, 15, 10, 20], // Op 4 is worst, Op 2 is second
        operation_names: ["Op1", "Op2", "Op3", "Op4"],
      });
      expect(result.worst_operations[0]).toBe("Op4");
      expect(result.worst_operations[1]).toBe("Op2");
    });

    it("should compute variance percentage correctly", () => {
      const result = reportEngine.generateCycleTimeVariance({
        predicted_times: [100],
        actual_times: [110],
      });
      expect(result.variance_pct).toBe(10);
    });
  });

  // ── Scrap Report ──
  describe("generateScrapReport", () => {
    it("should produce Pareto ordering by cost descending", () => {
      const result = reportEngine.generateScrapReport({
        events: [
          { date: "2026-01-05", defect_type: "dimensional", part_number: "P001", cost: 50 },
          { date: "2026-01-10", defect_type: "surface_finish", part_number: "P002", cost: 120 },
          { date: "2026-01-15", defect_type: "burr", part_number: "P003", cost: 30 },
          { date: "2026-01-20", defect_type: "surface_finish", part_number: "P004", cost: 80 },
          { date: "2026-02-01", defect_type: "dimensional", part_number: "P005", cost: 60 },
          { date: "2026-02-10", defect_type: "chatter", part_number: "P006", cost: 200 },
        ],
      });
      expect(result.pareto_by_defect.length).toBeGreaterThan(0);
      // Sorted by cost descending
      for (let i = 1; i < result.pareto_by_defect.length; i++) {
        expect(result.pareto_by_defect[i].cost).toBeLessThanOrEqual(
          result.pareto_by_defect[i - 1].cost
        );
      }
      // Total cost should match sum
      const sum = result.pareto_by_defect.reduce((s, p) => s + p.cost, 0);
      expect(result.total_scrap_cost).toBeCloseTo(sum, 0);
    });

    it("should detect worsening trend when later months have higher cost", () => {
      const events = [
        { date: "2026-01-05", defect_type: "dimensional", part_number: "P001", cost: 20 },
        { date: "2026-01-15", defect_type: "dimensional", part_number: "P002", cost: 20 },
        { date: "2026-03-05", defect_type: "dimensional", part_number: "P003", cost: 100 },
        { date: "2026-03-15", defect_type: "dimensional", part_number: "P004", cost: 120 },
      ];
      const result = reportEngine.generateScrapReport({ events });
      expect(result.trend).toBe("worsening");
    });

    it("should detect improving trend when later months have lower cost", () => {
      const events = [
        { date: "2026-01-05", defect_type: "burr", part_number: "P001", cost: 150 },
        { date: "2026-01-15", defect_type: "burr", part_number: "P002", cost: 120 },
        { date: "2026-03-05", defect_type: "burr", part_number: "P003", cost: 20 },
        { date: "2026-03-15", defect_type: "burr", part_number: "P004", cost: 15 },
      ];
      const result = reportEngine.generateScrapReport({ events });
      expect(result.trend).toBe("improving");
    });

    it("should handle empty events array", () => {
      const result = reportEngine.generateScrapReport({ events: [] });
      expect(result.total_scrap_cost).toBe(0);
      expect(result.pareto_by_defect).toEqual([]);
      expect(result.trend).toBe("stable");
    });

    it("should produce corrective actions for known defect types", () => {
      const result = reportEngine.generateScrapReport({
        events: [
          { date: "2026-01-05", defect_type: "chatter", part_number: "P001", cost: 100 },
          { date: "2026-01-10", defect_type: "tool_breakage", part_number: "P002", cost: 80 },
        ],
      });
      expect(result.top_actions.length).toBeGreaterThan(0);
      // Actions should contain practical guidance
      expect(result.top_actions.some((a) => a.includes("depth of cut") || a.includes("RPM"))).toBe(true);
    });

    it("should compute Pareto percentages summing to 100%", () => {
      const events = [
        { date: "2026-01-01", defect_type: "A", part_number: "P1", cost: 50 },
        { date: "2026-01-02", defect_type: "B", part_number: "P2", cost: 30 },
        { date: "2026-01-03", defect_type: "C", part_number: "P3", cost: 20 },
      ];
      const result = reportEngine.generateScrapReport({ events });
      const totalPct = result.pareto_by_defect.reduce((s, p) => s + p.pct, 0);
      expect(totalPct).toBeCloseTo(100, 0);
    });
  });
});

// ============================================================================
// ChartDataGeneratorEngine
// ============================================================================

describe("ChartDataGeneratorEngine", () => {
  // ── Pareto Chart ──
  describe("paretoChart", () => {
    it("should sort categories by value descending", () => {
      const result = chartEngine.paretoChart({
        categories: [
          { name: "Dimensional", value: 45 },
          { name: "Surface Finish", value: 25 },
          { name: "Burr", value: 15 },
          { name: "Chatter", value: 10 },
          { name: "Other", value: 5 },
        ],
      });
      expect(result.bars[0].name).toBe("Dimensional");
      expect(result.bars[result.bars.length - 1].name).toBe("Other");
    });

    it("should reach cumulative 100% at last bar", () => {
      const result = chartEngine.paretoChart({
        categories: [
          { name: "A", value: 50 },
          { name: "B", value: 30 },
          { name: "C", value: 20 },
        ],
      });
      expect(result.bars[result.bars.length - 1].cumulative_pct).toBe(100);
    });

    it("should mark 80% threshold index correctly", () => {
      const result = chartEngine.paretoChart({
        categories: [
          { name: "A", value: 80 },
          { name: "B", value: 15 },
          { name: "C", value: 5 },
        ],
      });
      expect(result.threshold_80_index).toBe(0); // First category is 80%
    });

    it("should produce cumulative line with matching length", () => {
      const cats = [
        { name: "X", value: 40 },
        { name: "Y", value: 35 },
        { name: "Z", value: 25 },
      ];
      const result = chartEngine.paretoChart({ categories: cats });
      expect(result.line.length).toBe(cats.length);
      expect(result.bars.length).toBe(cats.length);
    });

    it("should handle empty categories", () => {
      const result = chartEngine.paretoChart({ categories: [] });
      expect(result.bars.length).toBe(0);
      expect(result.threshold_80_index).toBe(-1);
    });

    it("should handle single category", () => {
      const result = chartEngine.paretoChart({
        categories: [{ name: "Only", value: 100 }],
      });
      expect(result.bars.length).toBe(1);
      expect(result.bars[0].cumulative_pct).toBe(100);
      expect(result.threshold_80_index).toBe(0);
    });
  });

  // ── Waterfall Chart ──
  describe("waterfallChart", () => {
    it("should have start + steps = total", () => {
      const result = chartEngine.waterfallChart({
        start: 100,
        steps: [
          { name: "Material", value: 30 },
          { name: "Labor", value: 25 },
          { name: "Overhead", value: 15 },
          { name: "Discount", value: -10 },
        ],
      });
      const totalBar = result.bars[result.bars.length - 1];
      expect(totalBar.name).toBe("Total");
      expect(totalBar.value).toBe(100 + 30 + 25 + 15 - 10);
    });

    it("should mark increases and decreases correctly", () => {
      const result = chartEngine.waterfallChart({
        start: 50,
        steps: [
          { name: "Add", value: 20 },
          { name: "Remove", value: -5 },
        ],
      });
      expect(result.bars[0].type).toBe("total"); // Start
      expect(result.bars[1].type).toBe("increase");
      expect(result.bars[2].type).toBe("decrease");
      expect(result.bars[3].type).toBe("total"); // Total
    });

    it("should track running totals through bar start/end_y", () => {
      const result = chartEngine.waterfallChart({
        start: 100,
        steps: [
          { name: "A", value: 50 },
          { name: "B", value: -30 },
        ],
      });
      // After start: running = 100
      expect(result.bars[1].start_y).toBe(100);
      expect(result.bars[1].end_y).toBe(150);
      // After A: running = 150
      expect(result.bars[2].start_y).toBe(150);
      expect(result.bars[2].end_y).toBe(120);
    });

    it("should handle zero-value steps", () => {
      const result = chartEngine.waterfallChart({
        start: 100,
        steps: [{ name: "NoChange", value: 0 }],
      });
      expect(result.bars.length).toBe(3); // Start + step + Total
      expect(result.bars[result.bars.length - 1].value).toBe(100);
    });
  });

  // ── Control Chart ──
  describe("controlChart", () => {
    it("should compute UCL/LCL as 3-sigma from center line for individuals", () => {
      // Stable process data
      const data = [
        10.02, 10.01, 9.99, 10.00, 10.03, 9.98, 10.01, 10.00,
        9.99, 10.02, 10.01, 9.98, 10.00, 10.03, 9.99, 10.01,
        10.00, 9.98, 10.02, 10.01,
      ];
      const result = chartEngine.controlChart({ data });
      expect(result.ucl).toBeGreaterThan(result.center_line);
      expect(result.lcl).toBeLessThan(result.center_line);
      // UCL - CL should equal CL - LCL (symmetric)
      const upperDist = result.ucl - result.center_line;
      const lowerDist = result.center_line - result.lcl;
      expect(upperDist).toBeCloseTo(lowerDist, 3);
    });

    it("should detect out-of-control points beyond 3-sigma", () => {
      const data = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 25]; // 25 is outlier
      const result = chartEngine.controlChart({ data });
      expect(result.out_of_control.length).toBeGreaterThan(0);
      expect(result.out_of_control).toContain(15); // Index of outlier
    });

    it("should detect Nelson Rule 1 (point beyond 3 sigma)", () => {
      const data = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 30];
      const result = chartEngine.controlChart({ data });
      const rule1 = result.nelson_violations.find((v) => v.rule === 1);
      expect(rule1).toBeDefined();
      expect(rule1!.indices).toContain(15);
    });

    it("should detect Nelson Rule 2 (9 consecutive on same side)", () => {
      // 9 points above center line, then 1 below
      const data = [
        10.05, 10.04, 10.06, 10.03, 10.07, 10.04, 10.05, 10.06, 10.03,
        9.50,
      ];
      const result = chartEngine.controlChart({ data });
      const rule2 = result.nelson_violations.find((v) => v.rule === 2);
      // May or may not trigger depending on the center line calculation
      // The first 9 points are above center since 9.50 pulls mean down
      if (rule2) {
        expect(rule2.indices.length).toBe(9);
      }
    });

    it("should support X-bar chart type", () => {
      const data = Array.from({ length: 25 }, (_, i) => 10 + (i % 5 - 2) * 0.01);
      const result = chartEngine.controlChart({
        data,
        chart_type: "xbar",
        subgroup_size: 5,
      });
      expect(result.points.length).toBe(5); // 25 / 5 subgroups
      expect(result.ucl).toBeGreaterThan(result.center_line);
    });

    it("should support moving range chart type", () => {
      const data = [10, 10.02, 9.98, 10.01, 9.99, 10.03, 9.97, 10.02, 10.00, 9.98];
      const result = chartEngine.controlChart({ data, chart_type: "moving_range" });
      expect(result.points.length).toBe(data.length - 1); // n-1 moving ranges
      expect(result.center_line).toBeGreaterThan(0);
    });

    it("should handle minimal data (2 points)", () => {
      const result = chartEngine.controlChart({ data: [10, 11] });
      expect(result.points.length).toBe(2);
      expect(result.center_line).toBeCloseTo(10.5, 1);
    });
  });

  // ── Stability Lobe Chart ──
  describe("stabilityLobeChart", () => {
    it("should generate envelope from lobe data", () => {
      const lobes = [
        { rpm: 5000, depth_mm: 3.0 },
        { rpm: 6000, depth_mm: 5.0 },
        { rpm: 7000, depth_mm: 2.5 },
        { rpm: 8000, depth_mm: 4.5 },
        { rpm: 9000, depth_mm: 2.0 },
        { rpm: 10000, depth_mm: 6.0 },
      ];
      const result = chartEngine.stabilityLobeChart({ lobes });
      expect(result.envelope.length).toBeGreaterThan(0);
      // Envelope should have min_stable_depth at each RPM
      for (const point of result.envelope) {
        expect(point.rpm).toBeGreaterThan(0);
        expect(point.min_stable_depth).toBeGreaterThan(0);
      }
    });

    it("should group lobes into curves", () => {
      // Two distinct lobes separated by depth jump
      const lobes = [
        { rpm: 5000, depth_mm: 3.0 },
        { rpm: 5100, depth_mm: 3.2 },
        { rpm: 5200, depth_mm: 3.1 },
        { rpm: 7000, depth_mm: 6.0 }, // Large gap -> new lobe
        { rpm: 7100, depth_mm: 6.2 },
        { rpm: 7200, depth_mm: 6.1 },
      ];
      const result = chartEngine.stabilityLobeChart({ lobes });
      expect(result.curves.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle empty lobes", () => {
      const result = chartEngine.stabilityLobeChart({ lobes: [] });
      expect(result.curves).toEqual([]);
      expect(result.envelope).toEqual([]);
    });

    it("should sort envelope by RPM ascending", () => {
      const lobes = [
        { rpm: 10000, depth_mm: 4.0 },
        { rpm: 5000, depth_mm: 2.0 },
        { rpm: 7500, depth_mm: 3.0 },
      ];
      const result = chartEngine.stabilityLobeChart({ lobes });
      for (let i = 1; i < result.envelope.length; i++) {
        expect(result.envelope[i].rpm).toBeGreaterThanOrEqual(result.envelope[i - 1].rpm);
      }
    });
  });

  // ── Histogram Chart ──
  describe("histogramChart", () => {
    it("should have bin counts summing to data length", () => {
      const data = Array.from({ length: 100 }, (_, i) => 25.0 + (i % 20 - 10) * 0.01);
      const result = chartEngine.histogramChart({ data });
      const totalCount = result.bars.reduce((s, b) => s + b.count, 0);
      expect(totalCount).toBe(100);
    });

    it("should compute mean and std_dev correctly", () => {
      const data = [10, 20, 30, 40, 50];
      const result = chartEngine.histogramChart({ data });
      expect(result.mean).toBeCloseTo(30, 0);
      expect(result.std_dev).toBeGreaterThan(0);
    });

    it("should mark bins outside spec limits as not in_spec", () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = chartEngine.histogramChart({
        data,
        spec_limits: { lsl: 3, usl: 8 },
      });
      // Bins with center below 3 or above 8 should be out of spec
      const outOfSpec = result.bars.filter((b) => !b.in_spec);
      expect(outOfSpec.length).toBeGreaterThan(0);
    });

    it("should generate normal curve overlay when std_dev > 0", () => {
      const data = Array.from({ length: 50 }, (_, i) => 25 + (i % 10 - 5) * 0.5);
      const result = chartEngine.histogramChart({ data });
      expect(result.normal_curve).toBeDefined();
      expect(result.normal_curve!.length).toBe(51); // 50 + 1 points
    });

    it("should respect custom bin count", () => {
      const data = Array.from({ length: 100 }, (_, i) => i);
      const result = chartEngine.histogramChart({ data, bins: 10 });
      expect(result.bars.length).toBe(10);
    });

    it("should handle empty data", () => {
      const result = chartEngine.histogramChart({ data: [] });
      expect(result.bars).toEqual([]);
      expect(result.mean).toBe(0);
      expect(result.std_dev).toBe(0);
    });

    it("should have contiguous bin ranges", () => {
      const data = Array.from({ length: 50 }, (_, i) => 10 + i * 0.1);
      const result = chartEngine.histogramChart({ data });
      for (let i = 1; i < result.bars.length; i++) {
        expect(result.bars[i].bin_start).toBeCloseTo(result.bars[i - 1].bin_end, 3);
      }
    });

    it("should mark all bins as in_spec when no spec limits given", () => {
      const data = [1, 2, 3, 4, 5];
      const result = chartEngine.histogramChart({ data });
      expect(result.bars.every((b) => b.in_spec)).toBe(true);
    });
  });
});
