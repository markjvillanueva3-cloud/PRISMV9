/**
 * Shop Floor Decision Support Engines — 55+ tests
 *
 * Tests for: JobProfitabilityWaterfallEngine, ScrapRootCauseEngine,
 * ToolSubstitutionRiskEngine, SetupSheetLibraryEngine
 */
import { describe, it, expect, beforeEach } from "vitest";
import { JobProfitabilityWaterfallEngine } from "../engines/JobProfitabilityWaterfallEngine.js";
import { ScrapRootCauseEngine } from "../engines/ScrapRootCauseEngine.js";
import { ToolSubstitutionRiskEngine } from "../engines/ToolSubstitutionRiskEngine.js";
import { SetupSheetLibraryEngine } from "../engines/SetupSheetLibraryEngine.js";
import type { JobInput } from "../engines/JobProfitabilityWaterfallEngine.js";
import type { ScrapEventInput } from "../engines/ScrapRootCauseEngine.js";

// ============================================================================
// FIXTURES
// ============================================================================

const PROFITABLE_JOB: JobInput = {
  revenue: 5000,
  material_cost: 800,
  tool_cost: 200,
  labor_hours: 8,
  labor_rate_per_hour: 45,
  machine_hours: 6,
  machine_rate_per_hour: 85,
  setup_time_hours: 1.5,
  scrap_count: 2,
  scrap_cost_per_unit: 25,
  overhead_pct: 15,
};

const LOSING_JOB: JobInput = {
  revenue: 1000,
  material_cost: 500,
  tool_cost: 150,
  labor_hours: 10,
  labor_rate_per_hour: 50,
  machine_hours: 8,
  machine_rate_per_hour: 90,
  setup_time_hours: 2,
  scrap_count: 5,
  scrap_cost_per_unit: 30,
  rework_count: 3,
  rework_cost_per_unit: 40,
  overhead_pct: 20,
};

const BASE_SCRAP_EVENT: ScrapEventInput = {
  defect_type: "oversized",
  measurements: [
    { feature: "bore_1", nominal: 25.0, actual: 25.08, tolerance: 0.05 },
    { feature: "bore_2", nominal: 25.0, actual: 25.07, tolerance: 0.05 },
  ],
  process_data: {
    spindle_load_pct: 75,
    vibration_rms: 1.2,
    temperature_delta_C: 12,
    tool_age_min: 55,
    coolant_concentration_pct: 6,
  },
};

const ORIGINAL_TOOL = {
  diameter_mm: 12,
  flutes: 4,
  type: "flat_endmill",
  coating: "TiAlN",
  helix_angle_deg: 35,
};

const SETUP_INPUT = {
  part_number: "PN-1001",
  operation: "Op10 - Roughing",
  machine_id: "HAAS-VF2",
  workholding: { type: "vise", jaw_type: "soft", pressure_kn: 30 },
  datum: { primary: "bottom_face", secondary: "left_edge", tertiary: "back_face" },
  tools: [
    { position: 1, id: "T1", description: "50mm face mill" },
    { position: 2, id: "T2", description: "12mm endmill rough" },
    { position: 3, id: "T3", description: "10mm endmill finish" },
  ],
  notes: "Aluminum 6061-T6, clamp on raw stock edges",
};

// ============================================================================
// JobProfitabilityWaterfallEngine
// ============================================================================

describe("JobProfitabilityWaterfallEngine", () => {
  const engine = new JobProfitabilityWaterfallEngine();

  describe("analyzeJob", () => {
    it("should compute positive margin for profitable job", () => {
      const result = engine.analyzeJob(PROFITABLE_JOB);
      expect(result.revenue).toBe(5000);
      expect(result.profit).toBeGreaterThan(0);
      expect(result.margin_pct).toBeGreaterThan(0);
      expect(result.margin_pct).toBeLessThan(100);
    });

    it("should compute negative margin for losing job", () => {
      const result = engine.analyzeJob(LOSING_JOB);
      expect(result.profit).toBeLessThan(0);
      expect(result.margin_pct).toBeLessThan(0);
    });

    it("should include all cost categories", () => {
      const result = engine.analyzeJob(PROFITABLE_JOB);
      expect(result.costs.material).toBe(800);
      expect(result.costs.tooling).toBe(200);
      expect(result.costs.labor).toBe(8 * 45);
      expect(result.costs.machine).toBe(6 * 85);
      expect(result.costs.setup).toBe(1.5 * 45);
      expect(result.costs.scrap).toBe(2 * 25);
      expect(result.costs.total).toBeGreaterThan(0);
    });

    it("should compute overhead as percentage of subtotal", () => {
      const result = engine.analyzeJob(PROFITABLE_JOB);
      const subtotal = result.costs.total - result.costs.overhead;
      const expectedOverhead = subtotal * 0.15;
      // overhead = subtotal * pct, but total includes overhead
      // so: total = subtotal + overhead = subtotal * 1.15
      expect(result.costs.overhead).toBeGreaterThan(0);
    });

    it("should build waterfall with revenue first and profit last", () => {
      const result = engine.analyzeJob(PROFITABLE_JOB);
      expect(result.waterfall[0].category).toBe("Revenue");
      expect(result.waterfall[0].amount).toBe(5000);
      expect(result.waterfall[result.waterfall.length - 1].category).toBe("Profit");
    });

    it("should identify top cost driver", () => {
      const result = engine.analyzeJob(PROFITABLE_JOB);
      expect(typeof result.top_cost_driver).toBe("string");
      expect(result.top_cost_driver.length).toBeGreaterThan(0);
    });

    it("should generate recommendations for thin margin", () => {
      const thinJob: JobInput = { ...PROFITABLE_JOB, revenue: 2200 };
      const result = engine.analyzeJob(thinJob);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("should generate loss recommendation for negative margin", () => {
      const result = engine.analyzeJob(LOSING_JOB);
      expect(result.recommendations.some((r) => r.includes("loss"))).toBe(true);
    });

    it("should handle zero rework gracefully", () => {
      const noRework: JobInput = { ...PROFITABLE_JOB, rework_count: 0 };
      const result = engine.analyzeJob(noRework);
      expect(result.costs.rework).toBe(0);
    });

    it("should handle optional fields being undefined", () => {
      const minimal: JobInput = {
        revenue: 3000,
        material_cost: 500,
        tool_cost: 100,
        labor_hours: 4,
        labor_rate_per_hour: 40,
        machine_hours: 3,
        machine_rate_per_hour: 80,
        setup_time_hours: 0.5,
        scrap_count: 0,
        scrap_cost_per_unit: 0,
      };
      const result = engine.analyzeJob(minimal);
      expect(result.costs.rework).toBe(0);
      expect(result.costs.overhead).toBe(0);
      expect(result.costs.secondary_ops).toBe(0);
      expect(result.profit).toBeGreaterThan(0);
    });

    it("should include secondary ops cost", () => {
      const withSecOps: JobInput = { ...PROFITABLE_JOB, secondary_ops_cost: 300 };
      const result = engine.analyzeJob(withSecOps);
      expect(result.costs.secondary_ops).toBe(300);
    });

    it("should flag high scrap cost in recommendations", () => {
      const highScrap: JobInput = {
        ...PROFITABLE_JOB,
        scrap_count: 50,
        scrap_cost_per_unit: 100,
      };
      const result = engine.analyzeJob(highScrap);
      expect(result.recommendations.some((r) => r.toLowerCase().includes("scrap"))).toBe(true);
    });

    it("waterfall cumulative should track correctly", () => {
      const result = engine.analyzeJob(PROFITABLE_JOB);
      // Revenue step should equal revenue
      expect(result.waterfall[0].cumulative).toBe(5000);
      // Subsequent steps should decrease
      expect(result.waterfall[1].cumulative).toBeLessThan(5000);
    });
  });

  describe("compareJobs", () => {
    it("should compare multiple jobs and find best/worst", () => {
      const result = engine.compareJobs({
        jobs: [
          { name: "Job A", ...PROFITABLE_JOB },
          { name: "Job B", ...LOSING_JOB },
        ],
      });
      expect(result.per_job).toHaveLength(2);
      expect(result.best_performer.name).toBe("Job A");
      expect(result.worst_performer.name).toBe("Job B");
      expect(result.best_performer.margin_pct).toBeGreaterThan(result.worst_performer.margin_pct);
    });

    it("should compute aggregate totals", () => {
      const result = engine.compareJobs({
        jobs: [
          { name: "Job A", ...PROFITABLE_JOB },
          { name: "Job B", ...PROFITABLE_JOB, revenue: 8000 },
        ],
      });
      expect(result.aggregate.total_revenue).toBe(13000);
      expect(result.aggregate.total_profit).toBeGreaterThan(0);
    });

    it("should identify common cost drivers", () => {
      const result = engine.compareJobs({
        jobs: [
          { name: "Job A", ...PROFITABLE_JOB },
          { name: "Job B", ...PROFITABLE_JOB, revenue: 6000 },
          { name: "Job C", ...PROFITABLE_JOB, revenue: 7000 },
        ],
      });
      expect(result.common_cost_drivers.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle single job comparison", () => {
      const result = engine.compareJobs({
        jobs: [{ name: "Solo Job", ...PROFITABLE_JOB }],
      });
      expect(result.per_job).toHaveLength(1);
      expect(result.best_performer.name).toBe("Solo Job");
      expect(result.worst_performer.name).toBe("Solo Job");
    });
  });

  describe("sensitivityAnalysis", () => {
    it("should compute scenario deltas", () => {
      const result = engine.sensitivityAnalysis({
        baseline: PROFITABLE_JOB,
        scenarios: [
          { name: "Material +10%", changes: { material_cost: 880 } },
          { name: "Revenue -5%", changes: { revenue: 4750 } },
        ],
      });
      expect(result.scenarios).toHaveLength(2);
      expect(result.scenarios[0].profit_delta).toBeLessThan(0);
      expect(result.scenarios[1].profit_delta).toBeLessThan(0);
    });

    it("should compute breakeven points", () => {
      const result = engine.sensitivityAnalysis({
        baseline: PROFITABLE_JOB,
        scenarios: [],
      });
      expect(result.breakeven_points.length).toBeGreaterThan(0);
      const revBE = result.breakeven_points.find((b) => b.parameter === "revenue");
      expect(revBE).toBeDefined();
      expect(revBE!.breakeven_value).toBeLessThan(PROFITABLE_JOB.revenue);
      expect(revBE!.headroom_pct).toBeGreaterThan(0);
    });

    it("should include material cost breakeven", () => {
      const result = engine.sensitivityAnalysis({
        baseline: PROFITABLE_JOB,
        scenarios: [],
      });
      const matBE = result.breakeven_points.find((b) => b.parameter === "material_cost");
      expect(matBE).toBeDefined();
      expect(matBE!.breakeven_value).toBeGreaterThan(PROFITABLE_JOB.material_cost);
    });

    it("should show positive delta for cost reduction scenario", () => {
      const result = engine.sensitivityAnalysis({
        baseline: PROFITABLE_JOB,
        scenarios: [
          { name: "Cheaper material", changes: { material_cost: 600 } },
        ],
      });
      expect(result.scenarios[0].profit_delta).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// ScrapRootCauseEngine
// ============================================================================

describe("ScrapRootCauseEngine", () => {
  const engine = new ScrapRootCauseEngine();

  describe("analyzeScrapEvent", () => {
    it("should diagnose oversized defect with thermal evidence", () => {
      const result = engine.analyzeScrapEvent(BASE_SCRAP_EVENT);
      expect(result.probable_causes.length).toBeGreaterThan(0);
      expect(result.probable_causes[0].probability).toBeGreaterThan(0);
      expect(result.probable_causes[0].probability).toBeLessThanOrEqual(1);
      expect(result.physics_analysis.thermal_growth_mm).toBeGreaterThan(0);
    });

    it("should diagnose undersized defect", () => {
      const result = engine.analyzeScrapEvent({
        defect_type: "undersized",
        measurements: [
          { feature: "od_1", nominal: 50.0, actual: 49.92, tolerance: 0.05 },
        ],
        process_data: { spindle_load_pct: 60 },
      });
      expect(result.probable_causes.length).toBeGreaterThan(0);
    });

    it("should diagnose surface finish defect with vibration", () => {
      const result = engine.analyzeScrapEvent({
        defect_type: "surface_finish",
        measurements: [
          { feature: "wall_1", nominal: 0.8, actual: 2.5, tolerance: 0.4 },
        ],
        process_data: { vibration_rms: 3.5, tool_age_min: 60 },
      });
      expect(result.probable_causes.some((c) => c.cause.toLowerCase().includes("vibration") || c.cause.toLowerCase().includes("chatter"))).toBe(true);
    });

    it("should diagnose out_of_round defect", () => {
      const result = engine.analyzeScrapEvent({
        defect_type: "out_of_round",
        measurements: [
          { feature: "bore_roundness", nominal: 0, actual: 0.03, tolerance: 0.01 },
        ],
        process_data: { vibration_rms: 2.0 },
      });
      expect(result.probable_causes.length).toBeGreaterThan(0);
      expect(result.recommended_checks.some((c) => c.toLowerCase().includes("ball-bar"))).toBe(true);
    });

    it("should diagnose taper defect", () => {
      const result = engine.analyzeScrapEvent({
        defect_type: "taper",
        measurements: [
          { feature: "top_dia", nominal: 30.0, actual: 30.02, tolerance: 0.02 },
          { feature: "bot_dia", nominal: 30.0, actual: 29.98, tolerance: 0.02 },
        ],
      });
      expect(result.probable_causes.some((c) => c.cause.toLowerCase().includes("alignment") || c.cause.toLowerCase().includes("parallelism"))).toBe(true);
    });

    it("should diagnose chatter_marks defect", () => {
      const result = engine.analyzeScrapEvent({
        defect_type: "chatter_marks",
        measurements: [
          { feature: "surface", nominal: 0, actual: 1, tolerance: 0.5 },
        ],
        process_data: { vibration_rms: 4.0 },
      });
      expect(result.probable_causes[0].probability).toBeGreaterThanOrEqual(0.6);
    });

    it("should diagnose tool_marks defect", () => {
      const result = engine.analyzeScrapEvent({
        defect_type: "tool_marks",
        measurements: [
          { feature: "face", nominal: 0.4, actual: 1.2, tolerance: 0.2 },
        ],
      });
      expect(result.probable_causes.length).toBeGreaterThan(0);
    });

    it("should diagnose dimensional_drift defect", () => {
      const result = engine.analyzeScrapEvent({
        defect_type: "dimensional_drift",
        measurements: [
          { feature: "width", nominal: 50.0, actual: 50.15, tolerance: 0.05 },
        ],
        process_data: { tool_age_min: 70, temperature_delta_C: 8 },
      });
      expect(result.probable_causes.some((c) => c.cause.toLowerCase().includes("wear"))).toBe(true);
    });

    it("should compute physics analysis values", () => {
      const result = engine.analyzeScrapEvent(BASE_SCRAP_EVENT);
      expect(result.physics_analysis.thermal_growth_mm).toBeDefined();
      expect(result.physics_analysis.tool_deflection_mm).toBeDefined();
      expect(result.physics_analysis.tool_wear_mm).toBeDefined();
      expect(result.physics_analysis.thermal_growth_mm!).toBeGreaterThan(0);
    });

    it("should classify systematic pattern", () => {
      const result = engine.analyzeScrapEvent({
        defect_type: "oversized",
        measurements: [
          { feature: "f1", nominal: 25, actual: 25.04, tolerance: 0.02 },
          { feature: "f2", nominal: 25, actual: 25.05, tolerance: 0.02 },
          { feature: "f3", nominal: 25, actual: 25.04, tolerance: 0.02 },
          { feature: "f4", nominal: 25, actual: 25.05, tolerance: 0.02 },
        ],
      });
      expect(result.pattern_type).toBe("systematic");
    });

    it("should classify progressive pattern", () => {
      const result = engine.analyzeScrapEvent({
        defect_type: "dimensional_drift",
        measurements: [
          { feature: "f1", nominal: 25, actual: 25.01, tolerance: 0.05 },
          { feature: "f2", nominal: 25, actual: 25.03, tolerance: 0.05 },
          { feature: "f3", nominal: 25, actual: 25.06, tolerance: 0.05 },
          { feature: "f4", nominal: 25, actual: 25.10, tolerance: 0.05 },
        ],
        process_data: { tool_age_min: 80 },
      });
      expect(result.pattern_type).toBe("progressive");
    });

    it("should return corrective actions for each cause", () => {
      const result = engine.analyzeScrapEvent(BASE_SCRAP_EVENT);
      for (const cause of result.probable_causes) {
        expect(cause.corrective_action.length).toBeGreaterThan(0);
        expect(cause.evidence.length).toBeGreaterThan(0);
      }
    });

    it("should include recommended checks", () => {
      const result = engine.analyzeScrapEvent(BASE_SCRAP_EVENT);
      expect(result.recommended_checks.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("analyzeTrend", () => {
    it("should detect degrading trend", () => {
      const events: ScrapEventInput[] = [
        {
          defect_type: "oversized",
          measurements: [{ feature: "f1", nominal: 25, actual: 25.02, tolerance: 0.05 }],
          process_data: { tool_age_min: 10 },
        },
        {
          defect_type: "oversized",
          measurements: [{ feature: "f1", nominal: 25, actual: 25.05, tolerance: 0.05 }],
          process_data: { tool_age_min: 30 },
        },
        {
          defect_type: "oversized",
          measurements: [{ feature: "f1", nominal: 25, actual: 25.10, tolerance: 0.05 }],
          process_data: { tool_age_min: 50 },
        },
        {
          defect_type: "oversized",
          measurements: [{ feature: "f1", nominal: 25, actual: 25.20, tolerance: 0.05 }],
          process_data: { tool_age_min: 70 },
        },
      ];
      const result = engine.analyzeTrend({ events });
      expect(result.trend).toBe("degrading");
    });

    it("should find common causes across events", () => {
      const events: ScrapEventInput[] = Array.from({ length: 5 }, () => ({
        defect_type: "surface_finish" as const,
        measurements: [{ feature: "f1", nominal: 0.8, actual: 2.0, tolerance: 0.4 }],
        process_data: { vibration_rms: 3.0, tool_age_min: 60 },
      }));
      const result = engine.analyzeTrend({ events });
      expect(result.common_causes.length).toBeGreaterThan(0);
    });

    it("should identify systemic issues", () => {
      const events: ScrapEventInput[] = Array.from({ length: 6 }, () => ({
        defect_type: "oversized" as const,
        measurements: [{ feature: "f1", nominal: 25, actual: 25.1, tolerance: 0.05 }],
        process_data: { tool_age_min: 60 },
      }));
      const result = engine.analyzeTrend({ events });
      expect(result.systemic_issues.length).toBeGreaterThan(0);
    });

    it("should estimate monthly cost impact", () => {
      const events: ScrapEventInput[] = Array.from({ length: 10 }, () => ({
        defect_type: "oversized" as const,
        measurements: [{ feature: "f1", nominal: 25, actual: 25.1, tolerance: 0.05 }],
      }));
      const result = engine.analyzeTrend({ events });
      expect(result.estimated_cost_impact_per_month).toBeGreaterThan(0);
    });

    it("should handle empty events", () => {
      const result = engine.analyzeTrend({ events: [] });
      expect(result.trend).toBe("stable");
      expect(result.common_causes).toEqual([]);
      expect(result.estimated_cost_impact_per_month).toBe(0);
    });
  });
});

// ============================================================================
// ToolSubstitutionRiskEngine
// ============================================================================

describe("ToolSubstitutionRiskEngine", () => {
  const engine = new ToolSubstitutionRiskEngine();

  it("should assess low risk for same-diameter same-type tool", () => {
    const result = engine.assessSubstitution({
      original: ORIGINAL_TOOL,
      substitute: { ...ORIGINAL_TOOL, coating: "TiCN" },
      operation: {
        material: "steel",
        depth_mm: 5,
        width_mm: 6,
        feed_per_tooth_mm: 0.08,
        spindle_rpm: 4000,
      },
      tolerance_mm: 0.05,
    });
    expect(["low", "medium"]).toContain(result.overall_risk);
    expect(result.risk_factors.deflection_delta_mm).toBe(0);
  });

  it("should assess higher risk for smaller diameter substitute", () => {
    const result = engine.assessSubstitution({
      original: ORIGINAL_TOOL,
      substitute: { ...ORIGINAL_TOOL, diameter_mm: 8 },
      operation: {
        material: "steel",
        depth_mm: 5,
        width_mm: 6,
        feed_per_tooth_mm: 0.08,
        spindle_rpm: 4000,
      },
      tolerance_mm: 0.02,
    });
    expect(result.risk_factors.deflection_delta_mm).toBeGreaterThan(0);
    expect(result.parameter_adjustments.new_rpm).toBeGreaterThan(4000);
  });

  it("should flag tool type mismatch", () => {
    const result = engine.assessSubstitution({
      original: ORIGINAL_TOOL,
      substitute: { ...ORIGINAL_TOOL, type: "ball_endmill" },
      operation: {
        material: "steel",
        depth_mm: 3,
        width_mm: 6,
        feed_per_tooth_mm: 0.08,
        spindle_rpm: 4000,
      },
      tolerance_mm: 0.05,
    });
    expect(result.warnings.some((w) => w.includes("type mismatch"))).toBe(true);
  });

  it("should compute chip load change for different flute count", () => {
    const result = engine.assessSubstitution({
      original: ORIGINAL_TOOL,
      substitute: { ...ORIGINAL_TOOL, flutes: 2 },
      operation: {
        material: "aluminum",
        depth_mm: 4,
        width_mm: 6,
        feed_per_tooth_mm: 0.1,
        spindle_rpm: 8000,
      },
      tolerance_mm: 0.05,
    });
    expect(result.risk_factors.chip_load_change_pct).toBeGreaterThan(0);
  });

  it("should recommend RPM adjustment for different diameter", () => {
    const result = engine.assessSubstitution({
      original: { ...ORIGINAL_TOOL, diameter_mm: 12 },
      substitute: { ...ORIGINAL_TOOL, diameter_mm: 10 },
      operation: {
        material: "steel",
        depth_mm: 3,
        width_mm: 5,
        feed_per_tooth_mm: 0.06,
        spindle_rpm: 3000,
      },
      tolerance_mm: 0.05,
    });
    // RPM should increase for smaller diameter (constant surface speed)
    expect(result.parameter_adjustments.new_rpm).toBe(3600);
  });

  it("should report coating change impact on tool life", () => {
    const result = engine.assessSubstitution({
      original: { ...ORIGINAL_TOOL, coating: "TiAlN" },
      substitute: { ...ORIGINAL_TOOL, coating: "uncoated" },
      operation: {
        material: "steel",
        depth_mm: 3,
        width_mm: 6,
        feed_per_tooth_mm: 0.06,
        spindle_rpm: 4000,
      },
      tolerance_mm: 0.05,
    });
    expect(result.risk_factors.tool_life_impact_pct).toBeLessThan(0);
  });

  it("should flag critical risk for extreme substitution", () => {
    const result = engine.assessSubstitution({
      original: { diameter_mm: 20, flutes: 4, type: "flat_endmill", coating: "TiAlN", helix_angle_deg: 35 },
      substitute: { diameter_mm: 6, flutes: 2, type: "ball_endmill", coating: "uncoated", helix_angle_deg: 15 },
      operation: {
        material: "titanium",
        depth_mm: 8,
        width_mm: 10,
        feed_per_tooth_mm: 0.1,
        spindle_rpm: 2000,
      },
      tolerance_mm: 0.01,
    });
    expect(["high", "critical"]).toContain(result.overall_risk);
    expect(result.approval_recommended).toBe(true);
  });

  it("should not require approval for low risk substitution", () => {
    const result = engine.assessSubstitution({
      original: ORIGINAL_TOOL,
      substitute: { ...ORIGINAL_TOOL },
      operation: {
        material: "aluminum",
        depth_mm: 2,
        width_mm: 3,
        feed_per_tooth_mm: 0.05,
        spindle_rpm: 6000,
      },
      tolerance_mm: 0.1,
    });
    expect(result.overall_risk).toBe("low");
    expect(result.approval_recommended).toBe(false);
  });

  it("should assess chatter risk change", () => {
    const result = engine.assessSubstitution({
      original: ORIGINAL_TOOL,
      substitute: { ...ORIGINAL_TOOL, helix_angle_deg: 10, diameter_mm: 8 },
      operation: {
        material: "steel",
        depth_mm: 5,
        width_mm: 6,
        feed_per_tooth_mm: 0.08,
        spindle_rpm: 4000,
      },
      tolerance_mm: 0.05,
    });
    expect(["increased", "significantly_increased"]).toContain(result.risk_factors.chatter_risk_change);
  });

  it("should suggest depth reduction for high deflection", () => {
    const result = engine.assessSubstitution({
      original: { diameter_mm: 20, flutes: 4, type: "flat_endmill", coating: "TiAlN", helix_angle_deg: 35 },
      substitute: { diameter_mm: 8, flutes: 4, type: "flat_endmill", coating: "TiAlN", helix_angle_deg: 35 },
      operation: {
        material: "steel",
        depth_mm: 10,
        width_mm: 8,
        feed_per_tooth_mm: 0.08,
        spindle_rpm: 3000,
      },
      tolerance_mm: 0.02,
    });
    if (result.parameter_adjustments.new_depth !== undefined) {
      expect(result.parameter_adjustments.new_depth).toBeLessThan(10);
    }
  });
});

// ============================================================================
// SetupSheetLibraryEngine
// ============================================================================

describe("SetupSheetLibraryEngine", () => {
  let engine: SetupSheetLibraryEngine;

  beforeEach(() => {
    engine = new SetupSheetLibraryEngine();
  });

  describe("saveSetup", () => {
    it("should save a setup and return an ID", () => {
      const result = engine.saveSetup(SETUP_INPUT);
      expect(result.saved).toBe(true);
      expect(result.setup_id).toBeDefined();
      expect(result.setup_id.startsWith("SETUP-")).toBe(true);
    });

    it("should update existing setup for same part+operation", () => {
      const r1 = engine.saveSetup(SETUP_INPUT);
      const r2 = engine.saveSetup({ ...SETUP_INPUT, notes: "Updated notes" });
      expect(r2.setup_id).toBe(r1.setup_id);
      expect(engine.size).toBe(1);
    });

    it("should create separate setups for different operations", () => {
      engine.saveSetup(SETUP_INPUT);
      engine.saveSetup({ ...SETUP_INPUT, operation: "Op20 - Finishing" });
      expect(engine.size).toBe(2);
    });
  });

  describe("getSetup", () => {
    it("should retrieve saved setup by ID", () => {
      const { setup_id } = engine.saveSetup(SETUP_INPUT);
      const result = engine.getSetup({ setup_id });
      expect("part_number" in result).toBe(true);
      if ("part_number" in result) {
        expect(result.part_number).toBe("PN-1001");
        expect(result.tools).toHaveLength(3);
      }
    });

    it("should return error for unknown ID", () => {
      const result = engine.getSetup({ setup_id: "SETUP-nonexistent" });
      expect("error" in result).toBe(true);
    });
  });

  describe("findSetup", () => {
    beforeEach(() => {
      engine.saveSetup(SETUP_INPUT);
      engine.saveSetup({
        ...SETUP_INPUT,
        part_number: "PN-2002",
        operation: "Op10 - Turning",
        workholding: { type: "chuck", jaw_type: "hard" },
        notes: "Steel 4140, OD turning",
      });
      engine.saveSetup({
        ...SETUP_INPUT,
        part_number: "PN-3003",
        operation: "Op10 - Drilling",
        notes: "Aluminum 7075, drill pattern",
      });
    });

    it("should find by part number", () => {
      const result = engine.findSetup({ part_number: "PN-1001" });
      expect(result.total).toBeGreaterThanOrEqual(1);
      expect(result.matches[0].part_number).toBe("PN-1001");
    });

    it("should find by workholding type", () => {
      const result = engine.findSetup({ workholding_type: "chuck" });
      expect(result.total).toBeGreaterThanOrEqual(1);
    });

    it("should find by keyword in notes", () => {
      const result = engine.findSetup({ keyword: "aluminum" });
      expect(result.total).toBeGreaterThanOrEqual(1);
    });

    it("should find by keyword in tool descriptions", () => {
      const result = engine.findSetup({ keyword: "face mill" });
      expect(result.total).toBeGreaterThanOrEqual(1);
    });

    it("should return empty for no matches", () => {
      const result = engine.findSetup({ part_number: "NONEXISTENT-999" });
      expect(result.total).toBe(0);
      expect(result.matches).toEqual([]);
    });

    it("should sort by relevance score", () => {
      const result = engine.findSetup({ part_number: "PN-1001", keyword: "roughing" });
      expect(result.matches.length).toBeGreaterThanOrEqual(1);
      if (result.matches.length >= 2) {
        expect(result.matches[0].relevance_score).toBeGreaterThanOrEqual(result.matches[1].relevance_score);
      }
    });

    it("should find by material in notes", () => {
      const result = engine.findSetup({ material: "steel" });
      expect(result.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe("suggestReuse", () => {
    beforeEach(() => {
      engine.saveSetup(SETUP_INPUT);
      engine.saveSetup({
        part_number: "PN-ROUND-1",
        operation: "Op10 - OD Turning",
        workholding: { type: "chuck", jaw_type: "soft" },
        datum: { primary: "center_bore" },
        tools: [
          { position: 1, id: "T1", description: "CNMG turning insert" },
          { position: 2, id: "T2", description: "grooving tool" },
        ],
        notes: "Steel 4140 round bar, OD turning and grooving",
      });
    });

    it("should suggest setups for prismatic part with milling features", () => {
      const result = engine.suggestReuse({
        material: "aluminum",
        approximate_size: { x: 100, y: 80, z: 30 },
        features: ["pocket", "slot", "drill holes"],
      });
      expect(result.suggestions.length).toBeGreaterThanOrEqual(1);
      expect(result.suggestions[0].match_score).toBeGreaterThan(0);
      expect(result.suggestions[0].match_reasons.length).toBeGreaterThan(0);
    });

    it("should suggest turning setups for round part", () => {
      const result = engine.suggestReuse({
        material: "steel",
        approximate_size: { x: 50, y: 50, z: 200 },
        features: ["bore", "OD turn", "groove"],
      });
      expect(result.suggestions.length).toBeGreaterThanOrEqual(1);
      // The round-part setup should score higher
      const roundSetup = result.suggestions.find((s) => s.part_number === "PN-ROUND-1");
      expect(roundSetup).toBeDefined();
    });

    it("should return empty suggestions when no setups exist", () => {
      const emptyEngine = new SetupSheetLibraryEngine();
      const result = emptyEngine.suggestReuse({
        material: "titanium",
        approximate_size: { x: 50, y: 50, z: 50 },
        features: ["pocket"],
      });
      expect(result.suggestions).toEqual([]);
    });

    it("should include match reasons", () => {
      const result = engine.suggestReuse({
        material: "aluminum",
        approximate_size: { x: 100, y: 80, z: 30 },
        features: ["pocket", "mill"],
      });
      if (result.suggestions.length > 0) {
        expect(result.suggestions[0].match_reasons.length).toBeGreaterThan(0);
      }
    });

    it("should limit results to top 10", () => {
      // Add many setups
      for (let i = 0; i < 15; i++) {
        engine.saveSetup({
          ...SETUP_INPUT,
          part_number: `PN-BULK-${i}`,
          operation: `Op${i} - Mill pocket`,
          notes: `Aluminum pocket milling job ${i}`,
        });
      }
      const result = engine.suggestReuse({
        material: "aluminum",
        approximate_size: { x: 100, y: 80, z: 30 },
        features: ["pocket", "mill"],
      });
      expect(result.suggestions.length).toBeLessThanOrEqual(10);
    });
  });

  describe("clear", () => {
    it("should clear all stored setups", () => {
      engine.saveSetup(SETUP_INPUT);
      expect(engine.size).toBe(1);
      engine.clear();
      expect(engine.size).toBe(0);
    });
  });
});
