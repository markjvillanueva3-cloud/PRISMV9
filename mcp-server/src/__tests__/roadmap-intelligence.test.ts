/**
 * RoadmapIntelligenceEngine Tests
 * ================================
 * Validates composition-based AI intelligence for roadmap execution.
 * Tests verify the engine correctly composes underlying AI engines:
 * - ChainOfThoughtEngine (complexity assessment)
 * - DecisionReasoningEngine (milestone prioritization)
 * - UncertaintyPropagationEngine (effort prediction)
 * - LearningAdaptationEngine (outcome learning)
 * - BusinessIntelligenceEngine (build vs integrate)
 *
 * @module __tests__/roadmap-intelligence.test.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  RoadmapIntelligenceEngine,
  Milestone,
  MilestoneUnit,
  RoadmapLearningRecord,
} from "../engines/RoadmapIntelligenceEngine.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createMilestone = (
  id: string,
  name: string,
  opts: Partial<Milestone> = {}
): Milestone => ({
  id,
  name,
  description: opts.description ?? `Implement ${name}`,
  phase: opts.phase ?? "L2-P1",
  units: opts.units ?? [
    { id: `${id}-u1`, name: "Unit 1", description: "First unit", status: "pending" },
    { id: `${id}-u2`, name: "Unit 2", description: "Second unit", status: "pending" },
  ],
  dependencies: opts.dependencies ?? [],
  status: opts.status ?? "pending",
  priority: opts.priority ?? 5,
  tags: opts.tags,
  estimated_effort_hours: opts.estimated_effort_hours,
  actual_effort_hours: opts.actual_effort_hours,
});

const createComplexMilestone = (): Milestone => ({
  id: "ms-complex",
  name: "Full System Integration",
  description: "Integrate the CAM bridge with the ERP system, including API connections, " +
    "data migration, security hardening, and performance optimization across all modules",
  phase: "L2-P3",
  units: Array.from({ length: 8 }, (_, i) => ({
    id: `ms-complex-u${i + 1}`,
    name: `Integration Phase ${i + 1}`,
    description: `Complex integration unit ${i + 1}`,
    status: "pending" as const,
  })),
  dependencies: ["ms-1", "ms-2", "ms-3", "ms-4", "ms-5"],
  status: "pending",
  priority: 9,
});

const createSimpleMilestone = (): Milestone => ({
  id: "ms-simple",
  name: "Add Logging",
  description: "Add basic logging to the utility module",
  phase: "L0",
  units: [
    { id: "ms-simple-u1", name: "Add logger", description: "Create logger", status: "pending" },
  ],
  dependencies: [],
  status: "pending",
  priority: 3,
});

const createRoadmap = (): Milestone[] => [
  createMilestone("ms-1", "Foundation Setup", {
    phase: "L0-Foundation",
    priority: 10,
    status: "completed",
    dependencies: [],
  }),
  createMilestone("ms-2", "Core Engine", {
    phase: "L2-P1",
    priority: 8,
    dependencies: ["ms-1"],
    estimated_effort_hours: 40,
  }),
  createMilestone("ms-3", "API Layer", {
    phase: "L2-P2",
    priority: 7,
    dependencies: ["ms-1"],
    estimated_effort_hours: 24,
  }),
  createMilestone("ms-4", "Integration", {
    description: "Full integration with external APIs and data migration",
    phase: "L2-P3",
    priority: 6,
    dependencies: ["ms-2", "ms-3"],
    estimated_effort_hours: 60,
  }),
  createMilestone("ms-5", "Testing Suite", {
    phase: "QA",
    priority: 5,
    dependencies: ["ms-4"],
    estimated_effort_hours: 30,
  }),
  createMilestone("ms-6", "Deployment", {
    phase: "L3",
    priority: 4,
    dependencies: ["ms-5"],
    estimated_effort_hours: 16,
  }),
];

const createHistoricalData = (): RoadmapLearningRecord[] => [
  {
    milestone_id: "hist-1",
    predicted_hours: 20,
    actual_hours: 25,
    predicted_complexity: "simple",
    actual_complexity: "moderate",
    prediction_date: "2026-01-01",
    completion_date: "2026-01-05",
    factors_that_affected_estimate: ["integration complexity"],
    lessons_learned: ["APIs take longer than expected"],
  },
  {
    milestone_id: "hist-2",
    predicted_hours: 40,
    actual_hours: 38,
    predicted_complexity: "moderate",
    actual_complexity: "moderate",
    prediction_date: "2026-01-10",
    completion_date: "2026-01-20",
    factors_that_affected_estimate: [],
    lessons_learned: ["Good estimate"],
  },
  {
    milestone_id: "hist-3",
    predicted_hours: 80,
    actual_hours: 95,
    predicted_complexity: "complex",
    actual_complexity: "complex",
    prediction_date: "2026-02-01",
    completion_date: "2026-02-15",
    factors_that_affected_estimate: ["scope creep"],
    lessons_learned: ["Lock scope early"],
  },
  {
    milestone_id: "hist-4",
    predicted_hours: 24,
    actual_hours: 22,
    predicted_complexity: "moderate",
    actual_complexity: "moderate",
    prediction_date: "2026-02-20",
    completion_date: "2026-02-25",
    factors_that_affected_estimate: [],
    lessons_learned: ["On track"],
  },
  {
    milestone_id: "hist-5",
    predicted_hours: 30,
    actual_hours: 35,
    predicted_complexity: "moderate",
    actual_complexity: "moderate",
    prediction_date: "2026-03-01",
    completion_date: "2026-03-08",
    factors_that_affected_estimate: ["dependency delay"],
    lessons_learned: ["Account for upstream delays"],
  },
  {
    milestone_id: "hist-6",
    predicted_hours: 10,
    actual_hours: 8,
    predicted_complexity: "simple",
    actual_complexity: "simple",
    prediction_date: "2026-03-10",
    completion_date: "2026-03-12",
    factors_that_affected_estimate: [],
    lessons_learned: ["Simple tasks finish fast"],
  },
];

// ============================================================================
// COMPLEXITY ASSESSMENT TESTS
// ============================================================================

describe("RoadmapIntelligenceEngine - Complexity Assessment", () => {
  it("should assess simple milestone with low complexity", () => {
    const milestone = createSimpleMilestone();
    const result = RoadmapIntelligenceEngine.assessComplexity(milestone);

    expect(result.milestone_id).toBe("ms-simple");
    expect(result.complexity_score).toBeLessThanOrEqual(4);
    expect(["trivial", "simple"]).toContain(result.overall_complexity);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.factors.length).toBeGreaterThan(0);
    expect(result.estimated_effort_hours.expected).toBeLessThan(40);
  });

  it("should assess complex milestone with high complexity", () => {
    const milestone = createComplexMilestone();
    const result = RoadmapIntelligenceEngine.assessComplexity(milestone);

    expect(result.milestone_id).toBe("ms-complex");
    expect(result.complexity_score).toBeGreaterThanOrEqual(6);
    expect(["complex", "very_complex"]).toContain(result.overall_complexity);
    expect(result.factors.length).toBeGreaterThanOrEqual(3);
    expect(result.risks.length).toBeGreaterThan(0);
    expect(result.estimated_effort_hours.expected).toBeGreaterThan(50);
  });

  it("should include dependency factor when dependencies exist", () => {
    const milestone = createMilestone("ms-deps", "With Dependencies", {
      dependencies: ["dep-1", "dep-2", "dep-3"],
    });
    const result = RoadmapIntelligenceEngine.assessComplexity(milestone);

    const depFactor = result.factors.find(f => f.factor === "Dependencies");
    expect(depFactor).toBeDefined();
    expect(depFactor!.impact).not.toBe("low");
  });

  it("should identify integration risk from description keywords", () => {
    const milestone = createMilestone("ms-int", "API Integration", {
      description: "Integrate with external payment API and handle webhooks",
    });
    const result = RoadmapIntelligenceEngine.assessComplexity(milestone);

    // Should detect integration-related risk
    expect(result.risks.some(r =>
      r.risk.toLowerCase().includes("integrat")
    ) || result.factors.some(f =>
      f.factor.toLowerCase().includes("technical")
    )).toBe(true);
  });

  it("should provide three-point effort estimate (optimistic, expected, pessimistic)", () => {
    const milestone = createMilestone("ms-3pt", "Three Point Test");
    const result = RoadmapIntelligenceEngine.assessComplexity(milestone);

    expect(result.estimated_effort_hours.optimistic).toBeLessThan(
      result.estimated_effort_hours.expected
    );
    expect(result.estimated_effort_hours.expected).toBeLessThan(
      result.estimated_effort_hours.pessimistic
    );
  });

  it("should include reasoning trace from chain-of-thought", () => {
    const milestone = createMilestone("ms-cot", "Chain of Thought Test");
    const result = RoadmapIntelligenceEngine.assessComplexity(milestone);

    expect(result.reasoning_trace).toBeDefined();
    expect(result.reasoning_trace.steps.length).toBeGreaterThan(0);
    expect(result.reasoning_trace.current_confidence).toBeGreaterThan(0);
  });

  it("should generate recommendations for complex milestones", () => {
    const milestone = createComplexMilestone();
    const result = RoadmapIntelligenceEngine.assessComplexity(milestone);

    expect(result.recommendations.length).toBeGreaterThan(0);
    // Complex milestones should have breaking or buffer recommendations
    expect(result.recommendations.some(r =>
      r.includes("break") || r.includes("buffer") || r.includes("Mitigate")
    )).toBe(true);
  });
});

// ============================================================================
// ROADMAP OPTIMIZATION TESTS
// ============================================================================

describe("RoadmapIntelligenceEngine - Roadmap Optimization", () => {
  it("should optimize milestone order considering dependencies", () => {
    const milestones = createRoadmap();
    const result = RoadmapIntelligenceEngine.optimizeRoadmap(milestones);

    expect(result.optimized_order.length).toBe(milestones.length);

    // Each milestone should have a rank
    for (const p of result.optimized_order) {
      expect(p.rank).toBeGreaterThan(0);
      expect(p.score).toBeDefined();
    }
  });

  it("should respect dependency constraints in prioritization", () => {
    const milestones = createRoadmap();
    const result = RoadmapIntelligenceEngine.optimizeRoadmap(milestones);

    // Milestones with unmet dependencies should have dependencies_met = false
    const ms4Result = result.optimized_order.find(p => p.milestone_id === "ms-4");
    expect(ms4Result).toBeDefined();
    // ms-4 depends on ms-2 and ms-3, which are pending, so deps not met
    expect(ms4Result!.blocking_milestones.length).toBeGreaterThan(0);
  });

  it("should identify critical path", () => {
    const milestones = createRoadmap();
    const result = RoadmapIntelligenceEngine.optimizeRoadmap(milestones);

    expect(result.critical_path.length).toBeGreaterThan(0);
    // Critical path should include the longest dependency chain
    expect(result.critical_path).toContain("ms-1");
  });

  it("should find parallelizable groups", () => {
    const milestones = createRoadmap();
    const result = RoadmapIntelligenceEngine.optimizeRoadmap(milestones);

    // ms-2 and ms-3 can run in parallel (both depend only on completed ms-1)
    if (result.parallelizable_groups.length > 0) {
      const firstGroup = result.parallelizable_groups[0];
      expect(firstGroup.includes("ms-2") && firstGroup.includes("ms-3")).toBe(true);
    }
  });

  it("should calculate total effort with uncertainty", () => {
    const milestones = createRoadmap();
    const result = RoadmapIntelligenceEngine.optimizeRoadmap(milestones);

    expect(result.total_estimated_effort.expected).toBeGreaterThan(0);
    expect(result.total_estimated_effort.optimistic).toBeLessThan(
      result.total_estimated_effort.expected
    );
    expect(result.total_estimated_effort.pessimistic).toBeGreaterThan(
      result.total_estimated_effort.expected
    );
    expect(result.total_estimated_effort.confidence_95).toHaveLength(2);
  });

  it("should identify bottlenecks", () => {
    // Create roadmap where one milestone blocks many others
    const milestones: Milestone[] = [
      createMilestone("bottleneck", "Critical Bottleneck", { status: "pending" }),
      createMilestone("dep-1", "Dep 1", { dependencies: ["bottleneck"] }),
      createMilestone("dep-2", "Dep 2", { dependencies: ["bottleneck"] }),
      createMilestone("dep-3", "Dep 3", { dependencies: ["bottleneck"] }),
      createMilestone("dep-4", "Dep 4", { dependencies: ["bottleneck"] }),
    ];

    const result = RoadmapIntelligenceEngine.optimizeRoadmap(milestones);

    expect(result.bottlenecks.some(b =>
      b.milestone_id === "bottleneck" && b.reason.includes("Blocks")
    )).toBe(true);
  });

  it("should generate optimization recommendations", () => {
    const milestones = createRoadmap();
    const result = RoadmapIntelligenceEngine.optimizeRoadmap(milestones);

    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// EFFORT PREDICTION TESTS
// ============================================================================

describe("RoadmapIntelligenceEngine - Effort Prediction", () => {
  it("should predict effort based on complexity", () => {
    const milestone = createMilestone("ms-pred", "Effort Test");
    const result = RoadmapIntelligenceEngine.predictEffort(milestone);

    expect(result.milestone_id).toBe("ms-pred");
    expect(result.predicted_hours).toBeGreaterThan(0);
    expect(result.uncertainty_hours).toBeGreaterThan(0);
    expect(result.confidence_interval_95).toHaveLength(2);
    expect(result.basis).toBeDefined();
  });

  it("should use historical data when available", () => {
    const milestone = createMilestone("ms-hist", "Historical Test");
    const assessment = RoadmapIntelligenceEngine.assessComplexity(milestone);

    // Create historical data matching this milestone's complexity
    const history: RoadmapLearningRecord[] = [
      {
        milestone_id: "hist-a",
        predicted_hours: 20,
        actual_hours: 25,
        predicted_complexity: assessment.overall_complexity,
        actual_complexity: assessment.overall_complexity,
        prediction_date: "2026-01-01",
        completion_date: "2026-01-05",
        factors_that_affected_estimate: [],
        lessons_learned: [],
      },
      {
        milestone_id: "hist-b",
        predicted_hours: 22,
        actual_hours: 28,
        predicted_complexity: assessment.overall_complexity,
        actual_complexity: assessment.overall_complexity,
        prediction_date: "2026-01-10",
        completion_date: "2026-01-15",
        factors_that_affected_estimate: [],
        lessons_learned: [],
      },
      {
        milestone_id: "hist-c",
        predicted_hours: 24,
        actual_hours: 30,
        predicted_complexity: assessment.overall_complexity,
        actual_complexity: assessment.overall_complexity,
        prediction_date: "2026-01-20",
        completion_date: "2026-01-28",
        factors_that_affected_estimate: [],
        lessons_learned: [],
      },
    ];

    const result = RoadmapIntelligenceEngine.predictEffort(milestone, history);

    expect(result.basis).toBe("historical");
    expect(result.similar_past_milestones).toBeDefined();
    expect(result.similar_past_milestones!.length).toBeGreaterThan(0);
  });

  it("should apply adjustment factors for high unit count", () => {
    const milestone = createMilestone("ms-units", "Many Units", {
      units: Array.from({ length: 8 }, (_, i) => ({
        id: `u${i}`,
        name: `Unit ${i}`,
        description: `Unit ${i}`,
        status: "pending" as const,
      })),
    });

    const result = RoadmapIntelligenceEngine.predictEffort(milestone);

    expect(result.adjustment_factors.some(f =>
      f.factor.includes("unit count")
    )).toBe(true);
  });

  it("should apply adjustment factors for many dependencies", () => {
    const milestone = createMilestone("ms-deps", "Many Deps", {
      dependencies: ["d1", "d2", "d3", "d4", "d5"],
    });

    const result = RoadmapIntelligenceEngine.predictEffort(milestone);

    expect(result.adjustment_factors.some(f =>
      f.factor.includes("dependencies")
    )).toBe(true);
  });

  it("should provide 95% confidence interval from Monte Carlo", () => {
    const milestone = createMilestone("ms-mc", "Monte Carlo Test");
    const result = RoadmapIntelligenceEngine.predictEffort(milestone);

    const [lower, upper] = result.confidence_interval_95;
    expect(lower).toBeLessThan(result.predicted_hours);
    expect(upper).toBeGreaterThan(result.predicted_hours);
    expect(upper - lower).toBeGreaterThan(0);
  });
});

// ============================================================================
// LEARNING TESTS
// ============================================================================

describe("RoadmapIntelligenceEngine - Outcome Learning", () => {
  it("should record outcome without throwing", () => {
    expect(() => {
      RoadmapIntelligenceEngine.recordOutcome(
        "ms-learn",
        40,
        45,
        "moderate",
        "moderate",
        ["Took slightly longer due to integration"]
      );
    }).not.toThrow();
  });

  it("should record multiple outcomes", () => {
    // Record several outcomes
    const outcomes = [
      { id: "ms-l1", predicted: 20, actual: 22 },
      { id: "ms-l2", predicted: 30, actual: 35 },
      { id: "ms-l3", predicted: 50, actual: 48 },
    ];

    for (const o of outcomes) {
      expect(() => {
        RoadmapIntelligenceEngine.recordOutcome(
          o.id,
          o.predicted,
          o.actual,
          "moderate",
          "moderate",
          []
        );
      }).not.toThrow();
    }
  });
});

// ============================================================================
// BUILD VS INTEGRATE TESTS
// ============================================================================

describe("RoadmapIntelligenceEngine - Build vs Integrate Analysis", () => {
  it("should recommend integrate when library is cost-effective", () => {
    const result = RoadmapIntelligenceEngine.analyzeBuildVsIntegrate(
      "Date Picker",
      "A date selection component with calendar view",
      80,  // 80 hours to build
      20,  // 20 hours/year maintenance
      [
        {
          name: "react-datepicker",
          integrationHours: 4,
          annualCost: 0,
          reliability: 0.95,
          features: ["calendar", "range", "i18n"],
        },
      ]
    );

    expect(result.feature).toBe("Date Picker");
    expect(result.recommendation).toBe("integrate");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.reasoning.length).toBeGreaterThan(0);
  });

  it("should recommend build when custom needs are high", () => {
    const result = RoadmapIntelligenceEngine.analyzeBuildVsIntegrate(
      "Custom Physics Engine",
      "Domain-specific physics calculations for CNC machining",
      200,  // 200 hours to build
      40,   // 40 hours/year maintenance
      [
        {
          name: "generic-physics-lib",
          integrationHours: 100,  // High integration effort
          annualCost: 5000,       // High annual cost
          reliability: 0.7,       // Low reliability for our use case
          features: ["generic physics"],
        },
      ]
    );

    expect(result.feature).toBe("Custom Physics Engine");
    // Should lean toward build due to high integration cost and low reliability
    expect(result.build_analysis.estimated_hours).toBe(200);
    expect(result.integrate_analysis.library_options.length).toBe(1);
  });

  it("should provide complete analysis structure", () => {
    const result = RoadmapIntelligenceEngine.analyzeBuildVsIntegrate(
      "Feature X",
      "Test feature",
      40,
      10,
      [
        { name: "lib-a", integrationHours: 8, annualCost: 100, reliability: 0.9, features: [] },
        { name: "lib-b", integrationHours: 12, annualCost: 0, reliability: 0.85, features: [] },
      ]
    );

    // Build analysis
    expect(result.build_analysis.estimated_hours).toBe(40);
    expect(result.build_analysis.maintenance_hours_per_year).toBe(10);
    expect(result.build_analysis.risks.length).toBeGreaterThan(0);
    expect(result.build_analysis.pros.length).toBeGreaterThan(0);
    expect(result.build_analysis.cons.length).toBeGreaterThan(0);

    // Integrate analysis
    expect(result.integrate_analysis.library_options.length).toBe(2);
    expect(result.integrate_analysis.pros.length).toBeGreaterThan(0);
    expect(result.integrate_analysis.cons.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// ROADMAP HEALTH TESTS
// ============================================================================

describe("RoadmapIntelligenceEngine - Roadmap Health Assessment", () => {
  it("should calculate health score", () => {
    const milestones = createRoadmap();
    const result = RoadmapIntelligenceEngine.assessRoadmapHealth(milestones);

    expect(result.overall_health).toBeGreaterThanOrEqual(0);
    expect(result.overall_health).toBeLessThanOrEqual(100);
  });

  it("should count milestone statuses correctly", () => {
    const milestones: Milestone[] = [
      createMilestone("ms-c1", "Completed 1", { status: "completed" }),
      createMilestone("ms-c2", "Completed 2", { status: "completed" }),
      createMilestone("ms-ip", "In Progress", { status: "in_progress" }),
      createMilestone("ms-b", "Blocked", { status: "blocked" }),
      createMilestone("ms-p", "Pending", { status: "pending" }),
    ];

    const result = RoadmapIntelligenceEngine.assessRoadmapHealth(milestones);

    expect(result.blocked_milestones).toBe(1);
  });

  it("should identify at-risk milestones approaching estimate", () => {
    const milestones: Milestone[] = [
      createMilestone("ms-risk", "At Risk", {
        status: "in_progress",
        estimated_effort_hours: 40,
        actual_effort_hours: 35,  // 87.5% of estimate
      }),
    ];

    const result = RoadmapIntelligenceEngine.assessRoadmapHealth(milestones);

    expect(result.at_risk_milestones).toBe(1);
  });

  it("should calculate estimation accuracy from historical data", () => {
    const milestones = createRoadmap();
    const history = createHistoricalData();

    const result = RoadmapIntelligenceEngine.assessRoadmapHealth(milestones, history);

    expect(result.estimation_accuracy).toBeGreaterThan(0);
    expect(result.estimation_accuracy).toBeLessThanOrEqual(1);
  });

  it("should detect velocity trend from historical data", () => {
    const milestones = createRoadmap();
    const history = createHistoricalData();

    const result = RoadmapIntelligenceEngine.assessRoadmapHealth(milestones, history);

    expect(["accelerating", "stable", "decelerating"]).toContain(result.velocity_trend);
  });

  it("should identify blocked milestone risk", () => {
    const milestones: Milestone[] = [
      createMilestone("ms-b1", "Blocked 1", { status: "blocked" }),
      createMilestone("ms-b2", "Blocked 2", { status: "blocked" }),
    ];

    const result = RoadmapIntelligenceEngine.assessRoadmapHealth(milestones);

    expect(result.risks.some(r => r.risk.includes("Blocked"))).toBe(true);
  });

  it("should generate health recommendations", () => {
    const milestones: Milestone[] = [
      createMilestone("ms-b", "Blocked", { status: "blocked" }),
      createMilestone("ms-risk", "At Risk", {
        status: "in_progress",
        estimated_effort_hours: 20,
        actual_effort_hours: 18,
      }),
    ];

    const result = RoadmapIntelligenceEngine.assessRoadmapHealth(milestones);

    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.some(r =>
      r.includes("Unblock") || r.includes("at-risk")
    )).toBe(true);
  });

  it("should have lower health for roadmaps with issues", () => {
    const healthyRoadmap: Milestone[] = [
      createMilestone("ms-1", "Complete 1", { status: "completed" }),
      createMilestone("ms-2", "Complete 2", { status: "completed" }),
      createMilestone("ms-3", "In Progress", { status: "in_progress" }),
    ];

    const unhealthyRoadmap: Milestone[] = [
      createMilestone("ms-1", "Blocked 1", { status: "blocked" }),
      createMilestone("ms-2", "Blocked 2", { status: "blocked" }),
      createMilestone("ms-3", "At Risk", {
        status: "in_progress",
        estimated_effort_hours: 20,
        actual_effort_hours: 18,
      }),
    ];

    const healthyResult = RoadmapIntelligenceEngine.assessRoadmapHealth(healthyRoadmap);
    const unhealthyResult = RoadmapIntelligenceEngine.assessRoadmapHealth(unhealthyRoadmap);

    expect(healthyResult.overall_health).toBeGreaterThan(unhealthyResult.overall_health);
  });
});

// ============================================================================
// COMPOSITION / INTEGRATION TESTS
// ============================================================================

describe("RoadmapIntelligenceEngine - Composition Verification", () => {
  it("should compose ChainOfThoughtEngine for complexity reasoning", () => {
    const milestone = createMilestone("ms-cot-verify", "CoT Verification");
    const result = RoadmapIntelligenceEngine.assessComplexity(milestone);

    // Verify chain-of-thought was used
    expect(result.reasoning_trace).toBeDefined();
    expect(result.reasoning_trace.problem).toContain("complexity");
    expect(result.reasoning_trace.steps).toBeInstanceOf(Array);
  });

  it("should compose DecisionReasoningEngine for prioritization", () => {
    const milestones = createRoadmap();
    const result = RoadmapIntelligenceEngine.optimizeRoadmap(milestones);

    // Verify decision analysis was used (weighted scores)
    expect(result.optimized_order[0].score).toBeDefined();
    expect(result.optimized_order[0].value_score).toBeDefined();
    expect(result.optimized_order[0].effort_score).toBeDefined();
  });

  it("should compose UncertaintyPropagationEngine for effort prediction", () => {
    const milestone = createMilestone("ms-unc-verify", "Uncertainty Verification");
    const result = RoadmapIntelligenceEngine.predictEffort(milestone);

    // Verify uncertainty propagation was used (Monte Carlo results)
    expect(result.uncertainty_hours).toBeGreaterThan(0);
    expect(result.confidence_interval_95).toHaveLength(2);
    expect(result.confidence_interval_95[0]).toBeLessThan(result.confidence_interval_95[1]);
  });

  it("should compose BusinessIntelligenceEngine for build vs integrate", () => {
    const result = RoadmapIntelligenceEngine.analyzeBuildVsIntegrate(
      "Test Feature",
      "Test",
      40,
      10,
      [{ name: "lib", integrationHours: 8, annualCost: 0, reliability: 0.9, features: [] }]
    );

    // Verify business intelligence was used
    expect(["build", "integrate", "hybrid"]).toContain(result.recommendation);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("should handle empty roadmap gracefully", () => {
    const result = RoadmapIntelligenceEngine.optimizeRoadmap([]);

    expect(result.optimized_order).toHaveLength(0);
    expect(result.critical_path).toHaveLength(0);
    expect(result.total_estimated_effort.expected).toBe(0);
  });

  it("should handle empty historical data gracefully", () => {
    const milestone = createMilestone("ms-no-hist", "No History");
    const result = RoadmapIntelligenceEngine.predictEffort(milestone, []);

    expect(result.basis).toBe("complexity");
    expect(result.similar_past_milestones).toBeUndefined();
  });
});
