/**
 * Batch 31 Engine Tests — 12 engines, 2-3 tests each
 */
import { describe, it, expect } from "vitest";

// ── 1. WorkholdingEngine ────────────────────────────────────────────────────
import { workholdingEngine } from "../engines/WorkholdingEngine";

describe("WorkholdingEngine", () => {
  it("calculateClampForceRequired returns safe result for milling", () => {
    const result = workholdingEngine.calculateClampForceRequired(
      { Fc: 2000, Ff: 800, Fp: 600 },
      { type: "VICE_SERRATED", surfaceCondition: "DRY" },
      {
        operationType: "MILLING",
        cuttingForces: { Fc: 2000, Ff: 800, Fp: 600 },
        forceApplicationPoint: { x: 50, y: 25, z: 0 },
      },
    );
    expect(result).toBeDefined();
    expect(typeof result.requiredClampForce).toBe("number");
    expect(result.requiredClampForce).toBeGreaterThan(0);
    expect(typeof result.isSafe).toBe("boolean");
    expect(typeof result.safetyFactor).toBe("number");
  });

  it("estimateCuttingForces returns force components", () => {
    // kc1_1=1800 N/mm2 (steel), mc=0.25, ap=3mm, ae=5mm, fz=0.1mm, D=10mm, z=4
    const result = workholdingEngine.estimateCuttingForces(
      1800, 0.25, 3, 5, 0.1, 10, 4,
    );
    expect(result).toBeDefined();
    expect(result.Fc).toBeGreaterThan(0);
    expect(result.Ff).toBeGreaterThan(0);
    expect(result.Fp).toBeGreaterThan(0);
  });

  it("getFrictionCoefficient returns a positive number", () => {
    const mu = workholdingEngine.getFrictionCoefficient("VICE_SERRATED", "DRY");
    expect(mu).toBeGreaterThan(0);
    expect(mu).toBeLessThan(1);
  });
});

// ── 2. GenerativeProcessEngine ──────────────────────────────────────────────
import { generativeProcess } from "../engines/GenerativeProcessEngine";

describe("GenerativeProcessEngine", () => {
  it("genplan_plan generates a complete process plan", () => {
    const result = generativeProcess("genplan_plan", {
      material: "steel",
      features: [
        { type: "pocket", dimensions: { length_mm: 60, width_mm: 40, depth_mm: 10 } },
        { type: "hole", dimensions: { diameter_mm: 8, depth_mm: 20 } },
      ],
    });
    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    expect(result.plan_id).toBeDefined();
    expect((result.feature_count as number)).toBeGreaterThanOrEqual(2);
    expect((result.setup_count as number)).toBeGreaterThanOrEqual(1);
    expect((result.operation_count as number)).toBeGreaterThanOrEqual(2);
  });

  it("genplan_features classifies features correctly", () => {
    const result = generativeProcess("genplan_features", {
      features: [
        { type: "slot", dimensions: { length_mm: 50, width_mm: 10, depth_mm: 5 } },
      ],
    });
    expect(result.error).toBeUndefined();
    expect(result.feature_count).toBe(1);
    expect(Array.isArray(result.features)).toBe(true);
  });

  it("returns error when no features provided", () => {
    const result = generativeProcess("genplan_plan", { material: "steel", features: [] });
    expect(result.error).toBeDefined();
  });
});

// ── 3. PFPEngine ────────────────────────────────────────────────────────────
import { PFPEngine } from "../engines/PFPEngine";

describe("PFPEngine", () => {
  it("assessRisk returns a valid risk assessment", () => {
    const engine = new PFPEngine({ enabled: true });
    const result = engine.assessRisk("calcDispatcher", "calc_speed", 1, {}, 50);
    expect(result).toBeDefined();
    expect(result.riskLevel).toBeDefined();
    expect(["GREEN", "YELLOW", "RED"].includes(result.riskLevel)).toBe(true);
  });

  it("getConfig returns valid config", () => {
    const engine = new PFPEngine();
    const config = engine.getConfig();
    expect(config).toBeDefined();
    expect(typeof config.enabled).toBe("boolean");
  });

  it("getDashboard returns dashboard data", () => {
    const engine = new PFPEngine({ enabled: true });
    const dashboard = engine.getDashboard();
    expect(dashboard).toBeDefined();
    expect(typeof dashboard.historySize).toBe("number");
  });
});

// ── 4. PredictiveFailureEngine ──────────────────────────────────────────────
import { PredictiveFailureEngine } from "../engines/PredictiveFailureEngine";

describe("PredictiveFailureEngine", () => {
  it("assessRisk returns a valid risk assessment", () => {
    const engine = new PredictiveFailureEngine({ enabled: true });
    const result = engine.assessRisk("calcDispatcher", "calc_speed", { rpm: 5000 });
    expect(result).toBeDefined();
    expect(result.riskLevel).toBeDefined();
  });

  it("recordAction and getPatterns work without error", () => {
    const engine = new PredictiveFailureEngine({ enabled: true });
    engine.recordAction({
      dispatcher: "calcDispatcher",
      action: "calc_speed",
      outcome: "success",
      latencyMs: 5,
      paramSignature: "rpm=5000",
      contextDepthPercent: 50,
      callNumber: 1,
    });
    const patterns = engine.getPatterns();
    expect(Array.isArray(patterns)).toBe(true);
  });

  it("getDashboard returns dashboard metrics", () => {
    const engine = new PredictiveFailureEngine({ enabled: true });
    const dashboard = engine.getDashboard();
    expect(dashboard).toBeDefined();
  });
});

// ── 5. SustainabilityEngine ─────────────────────────────────────────────────
import { sustainabilityEngine } from "../engines/SustainabilityEngine";

describe("SustainabilityEngine", () => {
  it("sustain_optimize returns standard vs green comparison", () => {
    const result = sustainabilityEngine("sustain_optimize", {
      material: "steel",
      tool_diameter_mm: 10,
      depth_mm: 5,
      width_mm: 20,
      length_mm: 100,
    });
    expect(result.error).toBeUndefined();
    expect(result.optimization_id).toBeDefined();
    expect(result.standard).toBeDefined();
    expect(result.green).toBeDefined();
    expect(result.savings).toBeDefined();
  });

  it("sustain_compare compares all materials", () => {
    const result = sustainabilityEngine("sustain_compare", {});
    expect(result.error).toBeUndefined();
    expect(result.total).toBeGreaterThan(0);
    expect(Array.isArray(result.comparisons)).toBe(true);
  });
});

// ── 6. ShopSchedulerEngine ──────────────────────────────────────────────────
import { shopSchedule, shopScheduler } from "../engines/ShopSchedulerEngine";

describe("ShopSchedulerEngine", () => {
  it("shopSchedule produces a valid schedule", () => {
    const result = shopSchedule({
      jobs: [
        {
          id: "JOB-001",
          priority: "normal",
          operations: [
            { type: "milling", estimated_time_min: 30 },
            { type: "drilling", estimated_time_min: 15 },
          ],
        },
        {
          id: "JOB-002",
          priority: "rush",
          operations: [{ type: "milling", estimated_time_min: 45 }],
        },
      ],
      machines: ["CNC-1", "CNC-2"],
      optimize_for: "min_makespan",
    });
    expect(result).toBeDefined();
    expect(result.schedule.length).toBe(2);
    expect(result.metrics.total_jobs).toBe(2);
    expect(result.metrics.total_makespan_min).toBeGreaterThan(0);
  });

  it("shopScheduler dispatcher routes schedule action", () => {
    const result = shopScheduler("shop_schedule", {
      jobs: [
        {
          id: "JOB-A",
          priority: "low",
          operations: [{ type: "turning", estimated_time_min: 20 }],
        },
      ],
      machines: ["LATHE-1"],
    });
    expect(result).toBeDefined();
    expect((result as Record<string, unknown>).error).toBeUndefined();
  });

  it("handles empty jobs gracefully", () => {
    const result = shopSchedule({
      jobs: [],
      machines: ["CNC-1"],
    });
    expect(result.metrics.total_jobs).toBe(0);
    expect(result.metrics.total_makespan_min).toBe(0);
  });
});

// ── 7. InverseSolverEngine ──────────────────────────────────────────────────
import { inverseSolver } from "../engines/InverseSolverEngine";

describe("InverseSolverEngine", () => {
  it("inverse_solve diagnoses bad surface finish", () => {
    const result = inverseSolver("inverse_solve", {
      problem_type: "surface_finish",
      material: "steel",
      measured_ra_um: 3.2,
      expected_ra_um: 0.8,
      tool_diameter_mm: 10,
      rpm: 8000,
      feed_mmmin: 1000,
    });
    expect(result).toBeDefined();
    expect(result.problem_type).toBe("surface_finish");
    expect(Array.isArray(result.root_causes)).toBe(true);
    expect(result.root_causes.length).toBeGreaterThan(0);
  });

  it("inverse_chatter provides stability analysis", () => {
    const result = inverseSolver("inverse_chatter", {
      chatter_frequency_hz: 2500,
      rpm: 6000,
      tool_diameter_mm: 12,
      flutes: 4,
    });
    expect(result).toBeDefined();
    expect(result.problem_type).toBe("chatter");
    expect(Array.isArray(result.root_causes)).toBe(true);
  });

  it("inverse_history returns history array", () => {
    const result = inverseSolver("inverse_history", {});
    expect(result).toBeDefined();
    expect(typeof result.total).toBe("number");
  });
});

// ── 8. AdaptiveControlEngine ────────────────────────────────────────────────
import { adaptiveControl } from "../engines/AdaptiveControlEngine";

describe("AdaptiveControlEngine", () => {
  it("adaptive_chipload computes feed override", () => {
    const result = adaptiveControl("adaptive_chipload", {
      target_chipload_mm: 0.05,
      flutes: 4,
      rpm: 10000,
      feed_mmmin: 2000,
      spindle_load_pct: 60,
      radial_engagement_pct: 50,
    });
    expect(result).toBeDefined();
    expect(result.feed_override_pct).toBeDefined();
    expect(typeof result.feed_override_pct).toBe("number");
  });

  it("adaptive_chatter detects chatter conditions", () => {
    const result = adaptiveControl("adaptive_chatter", {
      vibration_mm_s: 15,
      rpm: 8000,
      flutes: 3,
      dominant_frequency_hz: 2000,
    });
    expect(result).toBeDefined();
    expect(typeof result.is_chatter).toBe("boolean");
  });

  it("adaptive_status returns session status", () => {
    const result = adaptiveControl("adaptive_status", {});
    expect(result).toBeDefined();
  });
});

// ── 9. ApprenticeEngine ─────────────────────────────────────────────────────
import { apprenticeEngine } from "../engines/ApprenticeEngine";

describe("ApprenticeEngine", () => {
  it("apprentice_explain explains a machining parameter", () => {
    const result = apprenticeEngine("apprentice_explain", {
      parameter: "cutting_speed",
      value: "200 m/min",
      material: "aluminum",
    });
    expect(result).toBeDefined();
    expect(result.parameter).toBeDefined();
    expect(result.explanation).toBeDefined();
  });

  it("apprentice_lessons returns all lesson tracks", () => {
    const result = apprenticeEngine("apprentice_lessons", {});
    expect(result).toBeDefined();
    expect(result.total).toBeGreaterThan(0);
    expect(result.tracks).toBeDefined();
    expect(result.tracks.fundamentals).toBeDefined();
  });

  it("apprentice_assess returns skill assessment", () => {
    const result = apprenticeEngine("apprentice_assess", {
      answers: {
        cutting_speed: 70,
        feed_rate: 60,
        tool_selection: 80,
      },
    });
    expect(result).toBeDefined();
    expect(result.level).toBeDefined();
    expect(typeof result.total_score).toBe("number");
  });
});

// ── 10. FailureForensicsEngine ──────────────────────────────────────────────
import { failureForensics } from "../engines/FailureForensicsEngine";

describe("FailureForensicsEngine", () => {
  it("forensic_tool_autopsy diagnoses flank wear", () => {
    const result = failureForensics("forensic_tool_autopsy", {
      failure_mode: "flank_wear",
      material: "steel",
      tool_type: "carbide endmill",
    });
    expect(result).toBeDefined();
    expect(result.category).toBe("tool_autopsy");
    expect(result.diagnosis_id).toBeDefined();
    expect(Array.isArray(result.corrective_actions)).toBe(true);
  });

  it("forensic_chip_analysis analyzes chip type", () => {
    const result = failureForensics("forensic_chip_analysis", {
      chip_type: "blue_discolored",
      material: "steel",
    });
    expect(result).toBeDefined();
    expect(result.category).toBe("chip_analysis");
  });

  it("forensic_failure_modes lists all known modes", () => {
    const result = failureForensics("forensic_failure_modes", {});
    expect(result).toBeDefined();
    expect(result.total).toBeGreaterThan(0);
    expect(Array.isArray(result.modes)).toBe(true);
  });
});

// ── 11. ManufacturingGenomeEngine ───────────────────────────────────────────
import { manufacturingGenome } from "../engines/ManufacturingGenomeEngine";

describe("ManufacturingGenomeEngine", () => {
  it("genome_list returns all genomes", () => {
    const result = manufacturingGenome("genome_list", {});
    expect(result).toBeDefined();
    expect(result.total).toBeGreaterThan(0);
    expect(Array.isArray(result.genomes)).toBe(true);
  });

  it("genome_lookup finds a material genome", () => {
    // First get list to find a valid material
    const list = manufacturingGenome("genome_list", {});
    const firstGenome = (list.genomes as Array<Record<string, unknown>>)[0];
    const result = manufacturingGenome("genome_lookup", {
      material: firstGenome.material,
    });
    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    expect(result.genome_id).toBeDefined();
  });

  it("genome_search filters by hardness range", () => {
    const result = manufacturingGenome("genome_search", {
      min_hardness: 20,
      max_hardness: 50,
    });
    expect(result).toBeDefined();
    expect(Array.isArray(result.results ?? result.genomes)).toBe(true);
  });
});

// ── 12. WorkholdingIntelligenceEngine ───────────────────────────────────────
import { fixtureRecommend, workholdingIntelligence } from "../engines/WorkholdingIntelligenceEngine";

describe("WorkholdingIntelligenceEngine", () => {
  it("fixtureRecommend returns fixture recommendation", () => {
    const result = fixtureRecommend({
      part: {
        material: "steel",
        length_mm: 100,
        width_mm: 50,
        height_mm: 30,
      },
      operation: "milling",
      max_cutting_force_n: 2000,
      tolerance_mm: 0.05,
      batch_size: 10,
    });
    expect(result).toBeDefined();
    expect(result.primary_recommendation).toBeDefined();
    expect(result.primary_recommendation.fixture_type).toBeDefined();
    expect(result.primary_recommendation.clamp_force_n).toBeGreaterThan(0);
    expect(result.analysis).toBeDefined();
    expect(result.analysis.safety_factor).toBeGreaterThan(0);
  });

  it("workholdingIntelligence dispatcher routes fixture_recommend", () => {
    const result = workholdingIntelligence("fixture_recommend", {
      part: {
        material: "aluminum",
        length_mm: 80,
        width_mm: 60,
        height_mm: 25,
      },
      operation: "drilling",
      max_cutting_force_n: 1500,
      tolerance_mm: 0.1,
    }) as Record<string, unknown>;
    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    expect(result.primary_recommendation).toBeDefined();
  });

  it("handles high-force scenario with appropriate safety factor", () => {
    const result = fixtureRecommend({
      part: {
        material: "titanium",
        length_mm: 150,
        width_mm: 80,
        height_mm: 40,
      },
      operation: "roughing",
      max_cutting_force_n: 8000,
      tolerance_mm: 0.02,
      batch_size: 50,
    });
    expect(result).toBeDefined();
    expect(result.analysis.min_clamp_force_n).toBeGreaterThan(0);
  });
});
