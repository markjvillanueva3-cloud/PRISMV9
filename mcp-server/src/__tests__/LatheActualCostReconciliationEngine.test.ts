/**
 * LatheActualCostReconciliationEngine Tests
 *
 * U-LTH49: Actual cost vs quote reconciliation
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  latheActualCostReconciliationEngine,
  type JobActuals,
  type QuotedCosts,
} from "../engines/LatheActualCostReconciliationEngine.js";

describe("LatheActualCostReconciliationEngine", () => {
  const sampleActuals: JobActuals = {
    job_id: "JOB-001",
    quote_id: "Q-JMD-SH-001",
    part_number: "JMD-SH-001",
    customer: "ALCOA",
    quantity_ordered: 100,
    quantity_produced: 98,
    quantity_scrapped: 2,
    actual_material_cost: 350.00,
    actual_tool_cost: 45.00,
    actual_labor_hours: 4.5,
    labor_rate: 35.00,
    actual_setup_hours: 1.5,
    actual_machine_hours: 6.0,
    machine_rate: 85.00,
    actual_overhead: 120.00,
    actual_cycle_time_sec: 195,
    completion_date: "2026-04-15",
    operator_id: "OP-042",
  };

  const sampleQuoted: QuotedCosts = {
    quote_id: "Q-JMD-SH-001",
    material_cost: 3.20,
    tool_wear_cost: 0.45,
    cycle_time_cost: 4.25,
    setup_cost: 225.00,
    overhead: 1.20,
    margin: 2.30,
    total_per_part: 9.10,
    unit_price: 11.40,
    total_price: 1140.00,
    quantity: 100,
  };

  beforeEach(() => {
    latheActualCostReconciliationEngine.clearHistory();
  });

  describe("reconcile()", () => {
    it("generates valid reconciliation result", () => {
      const result = latheActualCostReconciliationEngine.reconcile(sampleActuals, sampleQuoted);

      expect(result.reconciliation_id).toMatch(/^REC-JOB-001-/);
      expect(result.job_id).toBe("JOB-001");
      expect(result.quote_id).toBe("Q-JMD-SH-001");
      expect(result.timestamp).toBeTruthy();
    });

    it("calculates actual total cost correctly", () => {
      const result = latheActualCostReconciliationEngine.reconcile(sampleActuals, sampleQuoted);

      const expectedActual =
        sampleActuals.actual_material_cost +
        sampleActuals.actual_tool_cost +
        sampleActuals.actual_labor_hours * sampleActuals.labor_rate +
        sampleActuals.actual_machine_hours * sampleActuals.machine_rate +
        sampleActuals.actual_setup_hours * sampleActuals.labor_rate +
        sampleActuals.actual_overhead;

      expect(result.actual_total_cost).toBeCloseTo(expectedActual, 2);
    });

    it("calculates quoted total cost correctly", () => {
      const result = latheActualCostReconciliationEngine.reconcile(sampleActuals, sampleQuoted);

      const expectedQuoted = sampleQuoted.total_per_part * sampleActuals.quantity_produced;
      expect(result.quoted_total_cost).toBeCloseTo(expectedQuoted, 2);
    });

    it("calculates variance correctly", () => {
      const result = latheActualCostReconciliationEngine.reconcile(sampleActuals, sampleQuoted);

      expect(result.total_variance).toBeCloseTo(
        result.actual_total_cost - result.quoted_total_cost,
        2
      );
    });

    it("calculates variance percentage correctly", () => {
      const result = latheActualCostReconciliationEngine.reconcile(sampleActuals, sampleQuoted);

      const expectedPct =
        (result.total_variance / result.quoted_total_cost) * 100;
      expect(result.total_variance_pct).toBeCloseTo(expectedPct, 0);
    });

    it("includes complete variance breakdown", () => {
      const result = latheActualCostReconciliationEngine.reconcile(sampleActuals, sampleQuoted);

      expect(result.variance_breakdown).toBeDefined();
      expect(typeof result.variance_breakdown.material_variance).toBe("number");
      expect(typeof result.variance_breakdown.material_variance_pct).toBe("number");
      expect(typeof result.variance_breakdown.tool_variance).toBe("number");
      expect(typeof result.variance_breakdown.tool_variance_pct).toBe("number");
      expect(typeof result.variance_breakdown.labor_variance).toBe("number");
      expect(typeof result.variance_breakdown.setup_variance).toBe("number");
      expect(typeof result.variance_breakdown.machine_variance).toBe("number");
      expect(typeof result.variance_breakdown.cycle_time_variance_sec).toBe("number");
    });

    it("calculates profit correctly", () => {
      const result = latheActualCostReconciliationEngine.reconcile(sampleActuals, sampleQuoted);

      const revenue = sampleQuoted.unit_price * sampleActuals.quantity_produced;
      expect(result.profit_actual).toBeCloseTo(revenue - result.actual_total_cost, 2);
      expect(result.profit_quoted).toBeCloseTo(revenue - result.quoted_total_cost, 2);
    });

    it("calculates profit margins", () => {
      const result = latheActualCostReconciliationEngine.reconcile(sampleActuals, sampleQuoted);

      expect(result.profit_margin_actual_pct).toBeDefined();
      expect(result.profit_margin_quoted_pct).toBeDefined();
      expect(result.profit_margin_quoted_pct).toBeGreaterThan(0);
    });

    it("calculates scrap rate", () => {
      const result = latheActualCostReconciliationEngine.reconcile(sampleActuals, sampleQuoted);

      const expectedScrap = (sampleActuals.quantity_scrapped / sampleActuals.quantity_ordered) * 100;
      expect(result.scrap_rate_pct).toBeCloseTo(expectedScrap, 1);
    });

    it("calculates efficiency rating", () => {
      const result = latheActualCostReconciliationEngine.reconcile(sampleActuals, sampleQuoted);

      expect(result.efficiency_rating).toBeGreaterThan(0);
      expect(result.efficiency_rating).toBeLessThanOrEqual(1);
    });

    it("determines status as profitable", () => {
      const profitableActuals: JobActuals = {
        ...sampleActuals,
        actual_material_cost: 200,
        actual_tool_cost: 30,
        actual_labor_hours: 2,
        actual_machine_hours: 3,
        actual_overhead: 50,
      };

      const result = latheActualCostReconciliationEngine.reconcile(
        profitableActuals,
        sampleQuoted
      );

      expect(result.status).toBe("profitable");
    });

    it("determines status as loss when costs exceed revenue", () => {
      const lossActuals: JobActuals = {
        ...sampleActuals,
        actual_material_cost: 800,
        actual_tool_cost: 150,
        actual_labor_hours: 15,
        actual_machine_hours: 20,
        actual_overhead: 300,
      };

      const result = latheActualCostReconciliationEngine.reconcile(lossActuals, sampleQuoted);

      expect(result.status).toBe("loss");
    });

    it("generates recommendations for high variances", () => {
      const highVarianceActuals: JobActuals = {
        ...sampleActuals,
        actual_material_cost: 600,
        actual_tool_cost: 100,
        actual_setup_hours: 4,
        actual_cycle_time_sec: 300,
      };

      const result = latheActualCostReconciliationEngine.reconcile(
        highVarianceActuals,
        sampleQuoted
      );

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some((r) => r.includes("material"))).toBe(true);
    });

    it("generates tuning adjustments for significant variances", () => {
      const highVarianceActuals: JobActuals = {
        ...sampleActuals,
        actual_material_cost: 500,
        actual_cycle_time_sec: 280,
      };

      const result = latheActualCostReconciliationEngine.reconcile(
        highVarianceActuals,
        sampleQuoted
      );

      expect(result.tuning_adjustments.length).toBeGreaterThan(0);
      result.tuning_adjustments.forEach((adj) => {
        expect(adj.parameter).toBeTruthy();
        expect(adj.confidence).toBeGreaterThan(0);
        expect(adj.confidence).toBeLessThanOrEqual(1);
      });
    });

    it("recommends no action when within parameters", () => {
      const goodActuals: JobActuals = {
        ...sampleActuals,
        actual_material_cost: 320,
        actual_tool_cost: 42,
        actual_labor_hours: 4,
        actual_setup_hours: 1.2,
        actual_machine_hours: 5.5,
        actual_overhead: 115,
        actual_cycle_time_sec: 180,
        quantity_scrapped: 1,
      };

      const result = latheActualCostReconciliationEngine.reconcile(goodActuals, sampleQuoted);

      expect(result.recommendations.some((r) => r.includes("no action"))).toBe(true);
    });

    it("flags high scrap rate", () => {
      const highScrapActuals: JobActuals = {
        ...sampleActuals,
        quantity_ordered: 100,
        quantity_produced: 90,
        quantity_scrapped: 10,
      };

      const result = latheActualCostReconciliationEngine.reconcile(
        highScrapActuals,
        sampleQuoted
      );

      expect(result.scrap_rate_pct).toBe(10);
      expect(result.recommendations.some((r) => r.includes("Scrap rate"))).toBe(true);
    });
  });

  describe("history tracking", () => {
    it("records reconciliation history", () => {
      latheActualCostReconciliationEngine.reconcile(sampleActuals, sampleQuoted);

      const history = latheActualCostReconciliationEngine.getPartHistory("JMD-SH-001");

      expect(history).not.toBeNull();
      expect(history?.part_number).toBe("JMD-SH-001");
      expect(history?.reconciliations.length).toBe(1);
    });

    it("accumulates multiple reconciliations", () => {
      for (let i = 0; i < 5; i++) {
        const actuals: JobActuals = {
          ...sampleActuals,
          job_id: `JOB-${i.toString().padStart(3, "0")}`,
        };
        latheActualCostReconciliationEngine.reconcile(actuals, sampleQuoted);
      }

      const history = latheActualCostReconciliationEngine.getPartHistory("JMD-SH-001");

      expect(history?.reconciliations.length).toBe(5);
    });

    it("calculates average variance", () => {
      for (let i = 0; i < 3; i++) {
        const actuals: JobActuals = {
          ...sampleActuals,
          job_id: `JOB-${i.toString().padStart(3, "0")}`,
        };
        latheActualCostReconciliationEngine.reconcile(actuals, sampleQuoted);
      }

      const history = latheActualCostReconciliationEngine.getPartHistory("JMD-SH-001");

      expect(history?.average_variance_pct).toBeDefined();
      expect(typeof history?.average_variance_pct).toBe("number");
    });

    it("detects improving trend", () => {
      const costs = [600, 550, 500, 400, 350, 320];
      for (let i = 0; i < 6; i++) {
        const actuals: JobActuals = {
          ...sampleActuals,
          job_id: `JOB-${i.toString().padStart(3, "0")}`,
          actual_material_cost: costs[i],
        };
        latheActualCostReconciliationEngine.reconcile(actuals, sampleQuoted);
      }

      const history = latheActualCostReconciliationEngine.getPartHistory("JMD-SH-001");

      expect(history?.trend).toBe("improving");
    });

    it("returns null for unknown part", () => {
      const history = latheActualCostReconciliationEngine.getPartHistory("UNKNOWN-PART");
      expect(history).toBeNull();
    });

    it("clears history", () => {
      latheActualCostReconciliationEngine.reconcile(sampleActuals, sampleQuoted);
      expect(latheActualCostReconciliationEngine.getPartHistory("JMD-SH-001")).not.toBeNull();

      latheActualCostReconciliationEngine.clearHistory();
      expect(latheActualCostReconciliationEngine.getPartHistory("JMD-SH-001")).toBeNull();
    });

    it("returns all history", () => {
      const parts = ["PART-A", "PART-B", "PART-C"];
      for (const part of parts) {
        const actuals: JobActuals = {
          ...sampleActuals,
          part_number: part,
          job_id: `JOB-${part}`,
        };
        latheActualCostReconciliationEngine.reconcile(actuals, sampleQuoted);
      }

      const allHistory = latheActualCostReconciliationEngine.getAllHistory();

      expect(allHistory.length).toBe(3);
      expect(allHistory.map((h) => h.part_number).sort()).toEqual(parts.sort());
    });

    it("limits history to 20 entries per part", () => {
      for (let i = 0; i < 25; i++) {
        const actuals: JobActuals = {
          ...sampleActuals,
          job_id: `JOB-${i.toString().padStart(3, "0")}`,
        };
        latheActualCostReconciliationEngine.reconcile(actuals, sampleQuoted);
      }

      const history = latheActualCostReconciliationEngine.getPartHistory("JMD-SH-001");

      expect(history?.reconciliations.length).toBe(20);
    });
  });

  describe("tuning adjustments", () => {
    it("suggests material rate adjustment for material variance", () => {
      const actuals: JobActuals = {
        ...sampleActuals,
        actual_material_cost: 500,
      };

      const result = latheActualCostReconciliationEngine.reconcile(actuals, sampleQuoted);

      const materialAdj = result.tuning_adjustments.find(
        (a) => a.parameter === "material_rate_multiplier"
      );
      expect(materialAdj).toBeDefined();
      expect(materialAdj?.suggested_value).toBeGreaterThan(1);
    });

    it("suggests cycle time adjustment for time variance", () => {
      const actuals: JobActuals = {
        ...sampleActuals,
        actual_cycle_time_sec: 250,
      };

      const result = latheActualCostReconciliationEngine.reconcile(actuals, sampleQuoted);

      const cycleAdj = result.tuning_adjustments.find(
        (a) => a.parameter === "cycle_time_multiplier"
      );
      expect(cycleAdj).toBeDefined();
    });

    it("includes confidence scores based on quantity", () => {
      const lowQtyActuals: JobActuals = { ...sampleActuals, quantity_produced: 5 };
      const highQtyActuals: JobActuals = { ...sampleActuals, quantity_produced: 200 };

      const lowResult = latheActualCostReconciliationEngine.reconcile(
        { ...lowQtyActuals, actual_material_cost: 500 },
        sampleQuoted
      );
      const highResult = latheActualCostReconciliationEngine.reconcile(
        { ...highQtyActuals, actual_material_cost: 500 },
        sampleQuoted
      );

      const lowAdj = lowResult.tuning_adjustments.find(
        (a) => a.parameter === "material_rate_multiplier"
      );
      const highAdj = highResult.tuning_adjustments.find(
        (a) => a.parameter === "material_rate_multiplier"
      );

      if (lowAdj && highAdj) {
        expect(highAdj.confidence).toBeGreaterThan(lowAdj.confidence);
      }
    });
  });

  describe("edge cases", () => {
    it("handles zero quantity produced", () => {
      const zeroQty: JobActuals = {
        ...sampleActuals,
        quantity_produced: 0,
        quantity_ordered: 100,
        quantity_scrapped: 0,
      };

      const result = latheActualCostReconciliationEngine.reconcile(zeroQty, sampleQuoted);

      expect(result.quoted_total_cost).toBe(0);
      expect(result.status).toBe("loss");
    });

    it("handles zero quoted costs gracefully", () => {
      const zeroQuoted: QuotedCosts = {
        ...sampleQuoted,
        material_cost: 0,
        tool_wear_cost: 0,
        cycle_time_cost: 0,
        setup_cost: 0,
        overhead: 0,
        margin: 0,
        total_per_part: 0,
        unit_price: 0,
        total_price: 0,
      };

      const result = latheActualCostReconciliationEngine.reconcile(sampleActuals, zeroQuoted);

      expect(result.total_variance_pct).toBe(0);
    });
  });
});
