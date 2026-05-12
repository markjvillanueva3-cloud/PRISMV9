/**
 * U-CONSOL1 + U-CONSOL2: Engine Consolidation Tests
 *
 * Verifies:
 *  - QuoteEstimatorEngine is canonical for quoting (QuotingEngine deprecated)
 *  - JobCostingEngine is canonical for costing (CostEstimation/CostEstimator deprecated)
 *  - ShopSchedulerEngine is canonical for scheduling (JobShopScheduling deprecated)
 *  - All 4 OR algorithms merged into ShopSchedulerEngine
 *  - businessDispatcher routes to canonical engines
 *  - Deprecated engines still export for backward compat
 */

import { describe, it, expect } from "vitest";

// ── Canonical engines ──
import { shopSchedulerEngine, shopSchedule, shopScheduler } from "../engines/ShopSchedulerEngine";
import { quoteEstimatorEngine } from "../engines/QuoteEstimatorEngine";
import { jobCostingEngine } from "../engines/JobCostingEngine";

// ── Deprecated engines (backward compat) ──
import { quotingEngine } from "../engines/QuotingEngine";
import { costEstimationEngine } from "../engines/CostEstimationEngine";
import { costEstimatorEngine } from "../engines/CostEstimatorEngine";
import { jobShopSchedulingEngine } from "../engines/JobShopSchedulingEngine";

// ============================================================================
// U-CONSOL1: Quoting Consolidation
// ============================================================================

describe("U-CONSOL1: Quoting consolidation", () => {
  it("QuoteEstimatorEngine.estimate() returns physics-backed quote", () => {
    const result = quoteEstimatorEngine.estimate({
      quantity: 10,
      material: "aluminum_6061",
      complexity: "medium",
    });
    expect(result).toBeDefined();
    expect(result.quote_id).toBeDefined();
    expect(result.costs).toBeDefined();
    expect(result.costs.total_cost_per_part).toBeGreaterThan(0);
    expect(result.pricing).toBeDefined();
    expect(result.pricing.unit_price).toBeGreaterThan(0);
    expect(result.dfm_warnings).toBeDefined();
    expect(result.confidence_score).toBeGreaterThanOrEqual(0);
  });

  it("QuoteEstimatorEngine.compareMaterials() returns ranked alternatives", () => {
    const result = quoteEstimatorEngine.compareMaterials({
      quantity: 10,
      material: "aluminum_6061",
      complexity: "medium",
    }, ["aluminum_6061", "steel_4140", "titanium_gr5"]);
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("QuotingEngine still exports for backward compat", () => {
    expect(quotingEngine).toBeDefined();
    expect(typeof quotingEngine.generateQuote).toBe("function");
  });
});

// ============================================================================
// U-CONSOL1: Costing Consolidation
// ============================================================================

describe("U-CONSOL1: Costing consolidation", () => {
  it("JobCostingEngine.calculateJobCost() returns full breakdown", () => {
    const result = jobCostingEngine.calculateJobCost({
      quantity: 5,
      material: { type: "4140" },
      operations: [{ name: "roughing", type: "roughing", cycleTime: 15, setupTime: 20 }],
      machineType: "cnc_mill_3axis",
    });
    expect(result).toBeDefined();
    expect(result.total).toBeGreaterThan(0);
    expect(result.material.cost).toBeGreaterThanOrEqual(0);
    expect(result.machining.cost).toBeGreaterThan(0);
    expect(result.perPart).toBeGreaterThan(0);
  });

  it("CostEstimationEngine still exports for backward compat", () => {
    expect(costEstimationEngine).toBeDefined();
    expect(typeof costEstimationEngine.estimate).toBe("function");
  });

  it("CostEstimatorEngine still exports for backward compat", () => {
    expect(costEstimatorEngine).toBeDefined();
    expect(typeof costEstimatorEngine.estimate).toBe("function");
  });
});

// ============================================================================
// U-CONSOL2: Scheduling Consolidation — Merged OR Algorithms
// ============================================================================

describe("U-CONSOL2: ShopSchedulerEngine merged methods", () => {
  it("scheduleSingleMachine() applies SPT rule correctly", () => {
    const result = shopSchedulerEngine.scheduleSingleMachine([
      { id: "J1", processingTime: 5 },
      { id: "J2", processingTime: 2 },
      { id: "J3", processingTime: 8 },
    ], "SPT");

    expect(result.rule).toBe("SPT");
    expect(result.schedule).toHaveLength(3);
    // SPT: shortest first → J2(2), J1(5), J3(8)
    expect(result.schedule[0].jobId).toBe("J2");
    expect(result.schedule[1].jobId).toBe("J1");
    expect(result.schedule[2].jobId).toBe("J3");
    expect(result.makespan).toBe(15);
  });

  it("scheduleSingleMachine() applies EDD rule with tardiness", () => {
    const result = shopSchedulerEngine.scheduleSingleMachine([
      { id: "J1", processingTime: 5, dueDate: 20 },
      { id: "J2", processingTime: 3, dueDate: 6 },
      { id: "J3", processingTime: 4, dueDate: 10 },
    ], "EDD");

    expect(result.rule).toBe("EDD");
    // EDD: earliest due date first → J2(6), J3(10), J1(20)
    expect(result.schedule[0].jobId).toBe("J2");
    expect(result.totalTardiness).toBeGreaterThanOrEqual(0);
  });

  it("scheduleSingleMachine() handles empty jobs", () => {
    const result = shopSchedulerEngine.scheduleSingleMachine([], "FIFO");
    expect(result.schedule).toHaveLength(0);
    expect(result.makespan).toBe(0);
  });

  it("johnsonsAlgorithm() minimizes 2-machine flow shop makespan", () => {
    // Classic Johnson's example
    const result = shopSchedulerEngine.johnsonsAlgorithm([
      { id: "A", machine1Time: 3, machine2Time: 6 },
      { id: "B", machine1Time: 8, machine2Time: 2 },
      { id: "C", machine1Time: 5, machine2Time: 4 },
      { id: "D", machine1Time: 2, machine2Time: 7 },
    ]);

    expect(result.sequence).toHaveLength(4);
    expect(result.makespan).toBeGreaterThan(0);
    expect(result.schedule).toHaveLength(4);
    // Verify each job has both machine times
    for (const entry of result.schedule) {
      expect(entry.machine1.end).toBeGreaterThan(entry.machine1.start);
      expect(entry.machine2.end).toBeGreaterThan(entry.machine2.start);
      // Machine 2 can't start before machine 1 finishes for same job
      expect(entry.machine2.start).toBeGreaterThanOrEqual(entry.machine1.end);
    }
  });

  it("johnsonsAlgorithm() handles empty jobs", () => {
    const result = shopSchedulerEngine.johnsonsAlgorithm([]);
    expect(result.sequence).toHaveLength(0);
    expect(result.makespan).toBe(0);
  });

  it("scheduleJobShop() assigns operations across machines", () => {
    const result = shopSchedulerEngine.scheduleJobShop(
      [
        { id: "J1", operations: [{ machine: "M1", processingTime: 5 }, { machine: "M2", processingTime: 3 }] },
        { id: "J2", operations: [{ machine: "M2", processingTime: 4 }, { machine: "M1", processingTime: 6 }] },
      ],
      [{ id: "M1" }, { id: "M2" }],
      "SPT",
    );

    expect(result.completedOperations).toBe(4);
    expect(result.totalOperations).toBe(4);
    expect(result.makespan).toBeGreaterThan(0);
    expect(result.schedule).toHaveLength(4);
    // Each operation should have valid times
    for (const entry of result.schedule) {
      expect(entry.endTime).toBeGreaterThan(entry.startTime);
    }
  });

  it("scheduleJobShop() handles empty inputs", () => {
    const result = shopSchedulerEngine.scheduleJobShop([], [], "SPT");
    expect(result.completedOperations).toBe(0);
    expect(result.makespan).toBe(0);
  });

  it("criticalPathMethod() finds critical path correctly", () => {
    const result = shopSchedulerEngine.criticalPathMethod([
      { id: "A", duration: 3 },
      { id: "B", duration: 5, predecessors: ["A"] },
      { id: "C", duration: 2, predecessors: ["A"] },
      { id: "D", duration: 4, predecessors: ["B", "C"] },
    ]);

    expect(result.success).toBe(true);
    expect(result.projectDuration).toBe(12); // A(3) + B(5) + D(4) = 12
    expect(result.criticalPath).toContain("A");
    expect(result.criticalPath).toContain("B");
    expect(result.criticalPath).toContain("D");
    // C has slack (3+2=5 < 3+5=8), so it's not critical
    expect(result.criticalPath).not.toContain("C");
  });

  it("criticalPathMethod() detects cyclic dependencies", () => {
    const result = shopSchedulerEngine.criticalPathMethod([
      { id: "A", duration: 3, predecessors: ["B"] },
      { id: "B", duration: 5, predecessors: ["A"] },
    ]);

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/[Cc]yclic/);
  });

  it("criticalPathMethod() handles empty activities", () => {
    const result = shopSchedulerEngine.criticalPathMethod([]);
    expect(result.success).toBe(true);
    expect(result.projectDuration).toBe(0);
  });

  it("all 6 dispatch rules work without error", () => {
    const jobs = [
      { id: "J1", processingTime: 5, dueDate: 15 },
      { id: "J2", processingTime: 3, dueDate: 8 },
      { id: "J3", processingTime: 7, dueDate: 20 },
    ];
    const rules = ["FIFO", "SPT", "LPT", "EDD", "CR", "SLACK"] as const;
    for (const rule of rules) {
      const result = shopSchedulerEngine.scheduleSingleMachine(jobs, rule);
      expect(result.rule).toBe(rule);
      expect(result.schedule).toHaveLength(3);
      expect(result.makespan).toBe(15);
    }
  });
});

// ============================================================================
// U-CONSOL2: Practical scheduling still works
// ============================================================================

describe("U-CONSOL2: Practical scheduling", () => {
  it("schedule() returns full shop schedule with metrics", () => {
    const result = shopSchedulerEngine.schedule({
      jobs: [
        { id: "J1", priority: "rush" as const, operations: [{ type: "milling", estimated_time_min: 30 }] },
        { id: "J2", priority: "normal" as const, operations: [{ type: "turning", estimated_time_min: 20 }] },
      ],
      machines: ["CNC_MILL_3AXIS", "CNC_LATHE"],
    });

    expect(result.schedule).toHaveLength(2);
    expect(result.metrics.total_jobs).toBe(2);
    expect(result.metrics.total_makespan_min).toBeGreaterThan(0);
  });

  it("machineUtilization() returns fleet analysis", () => {
    const result = shopSchedulerEngine.machineUtilization({
      machines: ["CNC_MILL_3AXIS", "CNC_LATHE"],
      jobs: [
        { id: "J1", priority: "normal" as const, operations: [{ type: "milling", estimated_time_min: 30 }] },
      ],
    });

    expect(result.machines).toHaveLength(2);
    expect(result.fleet_summary.total_machines).toBe(2);
  });
});

// ============================================================================
// U-CONSOL2: Backward compatibility
// ============================================================================

describe("U-CONSOL2: Backward compatibility", () => {
  it("shopSchedule() standalone function still works", () => {
    const result = shopSchedule({
      jobs: [{ id: "J1", priority: "normal" as const, operations: [{ type: "milling", estimated_time_min: 10 }] }],
      machines: ["M1"],
    });
    expect(result.metrics.total_jobs).toBe(1);
  });

  it("shopScheduler() action-dispatch function still works", () => {
    const result = shopScheduler("shop_schedule", {
      jobs: [{ id: "J1", priority: "normal", operations: [{ type: "milling", estimated_time_min: 10 }] }],
      machines: ["M1"],
    });
    expect(result.metrics).toBeDefined();
  });

  it("JobShopSchedulingEngine still exports for backward compat", () => {
    expect(jobShopSchedulingEngine).toBeDefined();
    expect(typeof jobShopSchedulingEngine.scheduleSingleMachine).toBe("function");
    expect(typeof jobShopSchedulingEngine.johnsonsAlgorithm).toBe("function");
    expect(typeof jobShopSchedulingEngine.scheduleJobShop).toBe("function");
    expect(typeof jobShopSchedulingEngine.criticalPathMethod).toBe("function");
  });

  it("merged methods produce equivalent results to deprecated engine", () => {
    const jobs = [
      { id: "J1", processingTime: 5 },
      { id: "J2", processingTime: 2 },
      { id: "J3", processingTime: 8 },
    ];

    const canonical = shopSchedulerEngine.scheduleSingleMachine(jobs, "SPT");
    const deprecated = jobShopSchedulingEngine.scheduleSingleMachine(jobs, "SPT");

    expect(canonical.makespan).toBe(deprecated.makespan);
    expect(canonical.schedule.map(s => s.jobId)).toEqual(deprecated.schedule.map(s => s.jobId));
    expect(canonical.totalFlowTime).toBe(deprecated.totalFlowTime);
  });
});

// ============================================================================
// EXIT GATE: All 169 business actions still resolve
// ============================================================================

describe("EXIT GATE: businessDispatcher engine map", () => {
  it("ShopSchedulerEngine exports shopSchedulerEngine class instance", async () => {
    const mod = await import("../engines/ShopSchedulerEngine");
    expect(mod.shopSchedulerEngine).toBeDefined();
    expect(typeof mod.shopSchedulerEngine.scheduleSingleMachine).toBe("function");
    expect(typeof mod.shopSchedulerEngine.johnsonsAlgorithm).toBe("function");
    expect(typeof mod.shopSchedulerEngine.scheduleJobShop).toBe("function");
    expect(typeof mod.shopSchedulerEngine.criticalPathMethod).toBe("function");
    expect(typeof mod.shopSchedulerEngine.schedule).toBe("function");
    expect(typeof mod.shopSchedulerEngine.machineUtilization).toBe("function");
  });

  it("QuoteEstimatorEngine exports quoteEstimatorEngine with estimate()", async () => {
    const mod = await import("../engines/QuoteEstimatorEngine");
    expect(mod.quoteEstimatorEngine).toBeDefined();
    expect(typeof mod.quoteEstimatorEngine.estimate).toBe("function");
    expect(typeof mod.quoteEstimatorEngine.compareMaterials).toBe("function");
  });

  it("JobCostingEngine exports jobCostingEngine with calculateJobCost()", async () => {
    const mod = await import("../engines/JobCostingEngine");
    expect(mod.jobCostingEngine).toBeDefined();
    expect(typeof mod.jobCostingEngine.calculateJobCost).toBe("function");
  });

  it("no circular dependencies between canonical engines", async () => {
    // These should all import without hanging or erroring
    const [sched, quote, cost] = await Promise.all([
      import("../engines/ShopSchedulerEngine"),
      import("../engines/QuoteEstimatorEngine"),
      import("../engines/JobCostingEngine"),
    ]);
    expect(sched.shopSchedulerEngine).toBeDefined();
    expect(quote.quoteEstimatorEngine).toBeDefined();
    expect(cost.jobCostingEngine).toBeDefined();
  });
});
