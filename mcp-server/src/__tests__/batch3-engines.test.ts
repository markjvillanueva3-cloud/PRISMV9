/**
 * Batch 3 Engines — Unit Tests
 * JobCostingEngine, QuotingEngine, JobShopSchedulingEngine
 * @milestone AUDIT-FT-B3
 */
import { describe, it, expect } from "vitest";
import { jobCostingEngine } from "../engines/JobCostingEngine.js";
import { quotingEngine } from "../engines/QuotingEngine.js";
import { jobShopSchedulingEngine } from "../engines/JobShopSchedulingEngine.js";

// ═══════════════════════════════════════════════════════════════
// JobCostingEngine
// ═══════════════════════════════════════════════════════════════
describe("JobCostingEngine", () => {
  it("calculates complete job cost", () => {
    const r = jobCostingEngine.calculateJobCost({
      quantity: 10,
      material: { type: "aluminum_6061", length: 100, width: 50, height: 25 },
      operations: [
        { type: "roughing", cycleTime: 5 },
        { type: "finishing", cycleTime: 3 },
      ],
    });
    expect(r.total).toBeGreaterThan(0);
    expect(r.perPart).toBeGreaterThan(0);
    expect(r.perPart).toBeCloseTo(r.total / 10, 1);
    expect(r.material.cost).toBeGreaterThan(0);
    expect(r.machining.cost).toBeGreaterThan(0);
    expect(r.setup.cost).toBeGreaterThan(0);
  });

  it("calculates material cost with scrap factor", () => {
    const r = jobCostingEngine.calculateMaterialCost({
      quantity: 1,
      material: { type: "steel_4140", length: 200, width: 100, height: 50, scrapFactor: 0.20 },
    });
    expect(r.pricePerLb).toBe(2.00);
    expect(r.scrapAllowance).toBeGreaterThan(0);
    expect(r.cost).toBeCloseTo(r.baseCost * 1.20, 1);
  });

  it("uses default material price for unknown type", () => {
    const r = jobCostingEngine.calculateMaterialCost({
      material: { type: "unobtanium" },
    });
    expect(r.pricePerLb).toBe(2.50);
  });

  it("calculates setup cost with FAI", () => {
    const r = jobCostingEngine.calculateSetupCost({
      operations: [{ type: "roughing" }, { type: "finishing" }],
      firstArticleRequired: true,
    });
    expect(r.totalMinutes).toBe(20 + 10 + 30); // roughing + finishing + FAI
    expect(r.cost).toBeGreaterThan(0);
  });

  it("calculates machining cost with tool changes", () => {
    const r = jobCostingEngine.calculateMachiningCost({
      quantity: 5,
      operations: [{ type: "roughing", cycleTime: 10 }],
      toolChanges: 3,
    });
    expect(r.toolChangeMinutes).toBe(3 * 0.25 * 5);
    expect(r.cost).toBeGreaterThan(0);
  });

  it("calculates programming cost with 5-axis multiplier", () => {
    const r3 = jobCostingEngine.calculateProgrammingCost({
      complexity: "complex",
      machineType: "cnc_mill_3axis",
      operations: [{ type: "roughing" }, { type: "finishing" }],
    });
    const r5 = jobCostingEngine.calculateProgrammingCost({
      complexity: "complex",
      machineType: "cnc_mill_5axis",
      operations: [{ type: "roughing" }, { type: "finishing" }],
    });
    expect(r5.cost).toBeGreaterThan(r3.cost);
    expect(r5.axisMultiplier).toBe(1.5);
  });

  it("calculates inspection cost with sampling", () => {
    const r = jobCostingEngine.calculateInspectionCost({
      quantity: 100,
      inspectionLevel: "detailed",
    });
    // 100 parts → sample: ceil(100*0.1)+10 = 20
    expect(r.partsInspected).toBe(20);
    expect(r.cost).toBeGreaterThan(0);
  });

  it("calculates finishing cost", () => {
    const r = jobCostingEngine.calculateFinishingCost({
      quantity: 10,
      finishingOperations: [
        { type: "anodize" },
        { type: "deburr" },
      ],
    });
    expect(r.operations).toHaveLength(2);
    expect(r.cost).toBe(10 * 8 + 10 * 2); // anodize $8 + deburr $2
  });

  it("handles empty job spec", () => {
    const r = jobCostingEngine.calculateJobCost({});
    expect(r.total).toBeGreaterThan(0); // at least overhead from programming
    expect(r.perPart).toBe(r.total);
  });
});

// ═══════════════════════════════════════════════════════════════
// QuotingEngine
// ═══════════════════════════════════════════════════════════════
describe("QuotingEngine", () => {
  it("generates a valid quote", () => {
    const q = quotingEngine.generateQuote({
      quantity: 10,
      complexity: "medium",
      material: { type: "aluminum_6061" },
      operations: [{ type: "roughing", cycleTime: 5 }],
    });
    expect(q.quoteNumber).toMatch(/^Q\d{2}-\d{4}$/);
    expect(q.pricing.totalPrice).toBeGreaterThan(0);
    expect(q.pricing.unitPrice).toBeGreaterThan(0);
    expect(q.leadTime.standard).toBeGreaterThan(0);
    expect(q.leadTime.rush).toBeLessThan(q.leadTime.standard);
  });

  it("applies rush premium", () => {
    const base = quotingEngine.generateQuote({
      quantity: 10,
      operations: [{ type: "roughing", cycleTime: 5 }],
    });
    const rush = quotingEngine.generateQuote({
      quantity: 10,
      operations: [{ type: "roughing", cycleTime: 5 }],
    }, { rush: true });
    expect(rush.pricing.totalPrice).toBeGreaterThan(base.pricing.totalPrice);
    expect(rush.pricing.adjustments.rushPremium).toBe("+50%");
  });

  it("applies volume discount", () => {
    const small = quotingEngine.generateQuote({
      quantity: 10,
      operations: [{ type: "roughing", cycleTime: 5 }],
    });
    const large = quotingEngine.generateQuote({
      quantity: 1000,
      operations: [{ type: "roughing", cycleTime: 5 }],
    });
    expect(large.pricing.adjustments.volumeDiscount).toBe("-15%");
    // Unit price should be lower for large quantity
    expect(large.pricing.unitPrice).toBeLessThan(small.pricing.unitPrice);
  });

  it("applies repeat order discount", () => {
    const q = quotingEngine.generateQuote(
      { quantity: 10, operations: [{ type: "roughing", cycleTime: 5 }] },
      { repeatOrder: true },
    );
    expect(q.pricing.adjustments.repeatDiscount).toBe("-10%");
  });

  it("generates price breaks", () => {
    const breaks = quotingEngine.generatePriceBreaks(
      { operations: [{ type: "roughing", cycleTime: 5 }] },
      [1, 10, 100],
    );
    expect(breaks).toHaveLength(3);
    expect(breaks[0].quantity).toBe(1);
    // Unit price should decrease with quantity
    expect(breaks[2].unitPrice).toBeLessThan(breaks[0].unitPrice);
  });

  it("includes customer notes", () => {
    const q = quotingEngine.generateQuote(
      { firstArticleRequired: true, material: { customerSupplied: true } },
      { notes: "Custom requirement" },
    );
    expect(q.notes).toContain("Material to be supplied by customer");
    expect(q.notes).toContain("First article inspection included");
    expect(q.notes).toContain("Custom requirement");
  });
});

// ═══════════════════════════════════════════════════════════════
// JobShopSchedulingEngine
// ═══════════════════════════════════════════════════════════════
describe("JobShopSchedulingEngine", () => {
  describe("scheduleSingleMachine", () => {
    const jobs = [
      { id: "A", processingTime: 5, dueDate: 10 },
      { id: "B", processingTime: 3, dueDate: 8 },
      { id: "C", processingTime: 8, dueDate: 20 },
    ];

    it("SPT minimizes average flow time", () => {
      const r = jobShopSchedulingEngine.scheduleSingleMachine(jobs, "SPT");
      expect(r.schedule[0].jobId).toBe("B"); // shortest first
      expect(r.makespan).toBe(16);
      expect(r.averageFlowTime).toBeGreaterThan(0);
    });

    it("EDD minimizes maximum tardiness", () => {
      const r = jobShopSchedulingEngine.scheduleSingleMachine(jobs, "EDD");
      expect(r.schedule[0].jobId).toBe("B"); // earliest due date first
    });

    it("LPT schedules longest first", () => {
      const r = jobShopSchedulingEngine.scheduleSingleMachine(jobs, "LPT");
      expect(r.schedule[0].jobId).toBe("C"); // longest first
    });

    it("handles empty job list", () => {
      const r = jobShopSchedulingEngine.scheduleSingleMachine([], "SPT");
      expect(r.makespan).toBe(0);
      expect(r.schedule).toHaveLength(0);
    });
  });

  describe("johnsonsAlgorithm", () => {
    it("optimizes 2-machine flow shop", () => {
      const jobs = [
        { id: "J1", machine1Time: 3, machine2Time: 6 },
        { id: "J2", machine1Time: 8, machine2Time: 2 },
        { id: "J3", machine1Time: 5, machine2Time: 4 },
      ];
      const r = jobShopSchedulingEngine.johnsonsAlgorithm(jobs);
      expect(r.sequence).toHaveLength(3);
      expect(r.makespan).toBeGreaterThan(0);
      // J1 should be first (min time on machine1 < machine2)
      expect(r.sequence[0]).toBe("J1");
      // J2 should be last (min time on machine2)
      expect(r.sequence[r.sequence.length - 1]).toBe("J2");
    });

    it("handles empty jobs", () => {
      const r = jobShopSchedulingEngine.johnsonsAlgorithm([]);
      expect(r.makespan).toBe(0);
    });
  });

  describe("scheduleJobShop", () => {
    it("schedules multi-machine jobs", () => {
      const jobs = [
        { id: "J1", operations: [
          { machine: "M1", processingTime: 3 },
          { machine: "M2", processingTime: 4 },
        ]},
        { id: "J2", operations: [
          { machine: "M2", processingTime: 2 },
          { machine: "M1", processingTime: 5 },
        ]},
      ];
      const machines = [{ id: "M1" }, { id: "M2" }];
      const r = jobShopSchedulingEngine.scheduleJobShop(jobs, machines, "SPT");
      expect(r.completedOperations).toBe(4);
      expect(r.totalOperations).toBe(4);
      expect(r.makespan).toBeGreaterThan(0);
    });
  });

  describe("criticalPathMethod", () => {
    it("finds critical path", () => {
      const activities = [
        { id: "A", duration: 3, predecessors: [] },
        { id: "B", duration: 4, predecessors: [] },
        { id: "C", duration: 2, predecessors: ["A"] },
        { id: "D", duration: 5, predecessors: ["A", "B"] },
        { id: "E", duration: 1, predecessors: ["C", "D"] },
      ];
      const r = jobShopSchedulingEngine.criticalPathMethod(activities);
      expect(r.success).toBe(true);
      expect(r.projectDuration).toBe(10); // B(4) → D(5) → E(1)
      expect(r.criticalPath).toContain("B");
      expect(r.criticalPath).toContain("D");
      expect(r.criticalPath).toContain("E");
    });

    it("detects cyclic dependencies", () => {
      const activities = [
        { id: "A", duration: 3, predecessors: ["B"] },
        { id: "B", duration: 4, predecessors: ["A"] },
      ];
      const r = jobShopSchedulingEngine.criticalPathMethod(activities);
      expect(r.success).toBe(false);
      expect(r.reason).toBe("Cyclic dependency");
    });

    it("handles empty activities", () => {
      const r = jobShopSchedulingEngine.criticalPathMethod([]);
      expect(r.success).toBe(true);
      expect(r.projectDuration).toBe(0);
    });

    it("identifies slack on non-critical activities", () => {
      const activities = [
        { id: "A", duration: 3, predecessors: [] },
        { id: "B", duration: 6, predecessors: [] },
        { id: "C", duration: 2, predecessors: ["A", "B"] },
      ];
      const r = jobShopSchedulingEngine.criticalPathMethod(activities);
      expect(r.success).toBe(true);
      const actA = r.schedule!.find(s => s.id === "A")!;
      expect(actA.slack).toBe(3); // A has 3 units of slack
      expect(actA.isCritical).toBe(false);
    });
  });
});
