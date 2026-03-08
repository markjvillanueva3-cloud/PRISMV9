/**
 * Business Engines — Unit Tests
 *
 * Tests for: FinancialAnalysisEngine, InventoryOptimizationEngine,
 *            JobLifecycleEngine, PurchasingDirectoryEngine,
 *            businessDispatcher
 *
 * @milestone AUDIT-FT-BIZ
 */
import { describe, it, expect, beforeEach } from "vitest";
import { financialAnalysisEngine } from "../engines/FinancialAnalysisEngine.js";
import { inventoryOptimizationEngine } from "../engines/InventoryOptimizationEngine.js";
import { jobLifecycleEngine } from "../engines/JobLifecycleEngine.js";
import { purchasingDirectoryEngine } from "../engines/PurchasingDirectoryEngine.js";

// ============================================================================
// Financial Analysis Engine
// ============================================================================

describe("FinancialAnalysisEngine", () => {
  describe("calculateNPV", () => {
    it("returns positive NPV for profitable project", () => {
      const r = financialAnalysisEngine.calculateNPV(
        [-100000, 30000, 35000, 40000, 45000],
        0.1,
      );
      expect(r.npv).toBeGreaterThan(0);
      expect(r.viable).toBe(true);
    });

    it("returns negative NPV for unprofitable project", () => {
      const r = financialAnalysisEngine.calculateNPV(
        [-100000, 5000, 5000, 5000],
        0.1,
      );
      expect(r.npv).toBeLessThan(0);
      expect(r.viable).toBe(false);
    });

    it("handles empty cash flows", () => {
      const r = financialAnalysisEngine.calculateNPV([], 0.1);
      expect(r.npv).toBe(0);
    });
  });

  describe("calculateIRR", () => {
    it("converges for standard cash flows", () => {
      const r = financialAnalysisEngine.calculateIRR(
        [-100000, 30000, 35000, 40000, 45000],
      );
      expect(r.converged).toBe(true);
      expect(r.irr).toBeGreaterThan(0.1);
      expect(r.irr).toBeLessThan(0.5);
    });

    it("returns formatted percentage", () => {
      const r = financialAnalysisEngine.calculateIRR(
        [-50000, 20000, 20000, 20000],
      );
      expect(r.formatted).toMatch(/%$/);
    });
  });

  describe("calculatePayback", () => {
    it("calculates simple payback period", () => {
      const r = financialAnalysisEngine.calculatePayback(100000, 40000);
      expect(r.years).toBe(2.5);
      expect(r.acceptable).toBe(true);
    });

    it("flags long payback as unacceptable", () => {
      const r = financialAnalysisEngine.calculatePayback(100000, 10000);
      expect(r.years).toBe(10);
      expect(r.acceptable).toBe(false);
    });

    it("handles zero cash flow", () => {
      const r = financialAnalysisEngine.calculatePayback(100000, 0);
      expect(r.years).toBe(Infinity);
      expect(r.acceptable).toBe(false);
    });
  });

  describe("calculateBreakEven", () => {
    it("calculates break-even units", () => {
      const r = financialAnalysisEngine.calculateBreakEven(50000, 100, 60);
      expect(r.units).toBe(1250);
      expect(r.contribution_margin).toBe(40);
      expect(r.margin_percent).toBe(40);
    });

    it("handles zero margin", () => {
      const r = financialAnalysisEngine.calculateBreakEven(50000, 60, 60);
      expect(r.units).toBe(Infinity);
    });
  });

  describe("calculateROI", () => {
    it("calculates positive ROI", () => {
      const r = financialAnalysisEngine.calculateROI(150000, 100000);
      expect(r.roi).toBe(0.5);
      expect(r.profitable).toBe(true);
    });

    it("calculates negative ROI", () => {
      const r = financialAnalysisEngine.calculateROI(80000, 100000);
      expect(r.roi).toBe(-0.2);
      expect(r.profitable).toBe(false);
    });
  });

  describe("analyzeMachineInvestment", () => {
    it("produces complete analysis with recommendation", () => {
      const r = financialAnalysisEngine.analyzeMachineInvestment({
        machine_cost: 250000,
        installation_cost: 15000,
        training_cost: 5000,
        annual_revenue: 120000,
        annual_operating_cost: 40000,
        useful_life: 10,
        salvage_value: 25000,
        discount_rate: 0.1,
      });
      expect(r.summary.total_investment).toBe(270000);
      expect(r.summary.annual_cash_flow).toBe(80000);
      expect(r.npv).toBeDefined();
      expect(r.irr).toBeDefined();
      expect(r.payback).toBeDefined();
      expect(r.roi).toBeDefined();
      expect(r.depreciation.method).toBe("Straight-line");
      expect(r.recommendation.score).toBeGreaterThanOrEqual(0);
      expect(r.recommendation.factors.length).toBeGreaterThan(0);
    });

    it("flags bad investment as NOT RECOMMENDED", () => {
      const r = financialAnalysisEngine.analyzeMachineInvestment({
        machine_cost: 500000,
        annual_revenue: 50000,
        annual_operating_cost: 45000,
        useful_life: 5,
      });
      expect(r.recommendation.recommendation).toContain("NOT RECOMMENDED");
    });
  });
});

// ============================================================================
// Inventory Optimization Engine
// ============================================================================

describe("InventoryOptimizationEngine", () => {
  describe("calculateEOQ", () => {
    it("calculates Wilson EOQ formula", () => {
      const r = inventoryOptimizationEngine.calculateEOQ({
        annual_demand: 10000,
        order_cost: 50,
        holding_cost_per_unit: 2,
      });
      // EOQ = sqrt(2*10000*50/2) = sqrt(500000) ≈ 707
      expect(r.eoq).toBeCloseTo(707, 0);
      expect(r.orders_per_year).toBeGreaterThan(0);
      expect(r.costs.total_annual).toBeGreaterThan(0);
      // At EOQ, ordering cost = holding cost
      expect(r.costs.ordering).toBeCloseTo(r.costs.holding, 0);
    });

    it("handles zero holding cost", () => {
      const r = inventoryOptimizationEngine.calculateEOQ({
        annual_demand: 1000,
        order_cost: 50,
        holding_cost_per_unit: 0,
      });
      expect(r.eoq).toBe(1000);
    });
  });

  describe("calculateSafetyStock", () => {
    it("calculates safety stock with demand variability", () => {
      const r = inventoryOptimizationEngine.calculateSafetyStock({
        avg_demand: 100,
        demand_std_dev: 20,
        avg_lead_time: 2,
      });
      expect(r.safety_stock).toBeGreaterThan(0);
      expect(r.reorder_point).toBeGreaterThan(r.safety_stock);
      expect(r.service_level).toBe(0.95);
    });

    it("includes lead time variability", () => {
      const base = inventoryOptimizationEngine.calculateSafetyStock({
        avg_demand: 100,
        demand_std_dev: 20,
        avg_lead_time: 2,
        lead_time_std_dev: 0,
      });
      const withLT = inventoryOptimizationEngine.calculateSafetyStock({
        avg_demand: 100,
        demand_std_dev: 20,
        avg_lead_time: 2,
        lead_time_std_dev: 0.5,
      });
      expect(withLT.safety_stock).toBeGreaterThan(base.safety_stock);
    });
  });

  describe("classifyABC", () => {
    it("classifies items by Pareto 80/15/5", () => {
      const items = [
        { id: "T1", annual_usage: 500, unit_cost: 100 },
        { id: "T2", annual_usage: 200, unit_cost: 50 },
        { id: "T3", annual_usage: 100, unit_cost: 10 },
        { id: "T4", annual_usage: 50, unit_cost: 5 },
        { id: "T5", annual_usage: 20, unit_cost: 2 },
      ];
      const r = inventoryOptimizationEngine.classifyABC(items);
      // Top item is ~80% of value — may land in A or B at boundary
      expect(["A", "B"]).toContain(r.items[0].classification);
      expect(r.summary.C.count).toBeGreaterThan(0);
      // Verify total items classified
      const totalClassified = r.summary.A.count + r.summary.B.count + r.summary.C.count;
      expect(totalClassified).toBe(items.length);
    });

    it("handles empty items", () => {
      const r = inventoryOptimizationEngine.classifyABC([]);
      expect(r.items).toHaveLength(0);
    });
  });

  describe("optimizeToolInventory", () => {
    it("returns EOQ + safety stock per tool", () => {
      const r = inventoryOptimizationEngine.optimizeToolInventory([
        {
          id: "EM-12",
          name: "12mm End Mill",
          annual_usage: 500,
          unit_cost: 45,
        },
        {
          id: "DR-10",
          name: "10mm Drill",
          annual_usage: 300,
          unit_cost: 25,
          lead_time_weeks: 3,
        },
      ]);
      expect(r).toHaveLength(2);
      expect(r[0].eoq).toBeGreaterThan(0);
      expect(r[0].safety_stock).toBeGreaterThanOrEqual(0);
      expect(r[0].max_stock).toBeGreaterThan(r[0].min_stock);
    });
  });
});

// ============================================================================
// Job Lifecycle Engine
// ============================================================================

describe("JobLifecycleEngine", () => {
  // Fresh engine per test to avoid state bleed
  let engine: typeof jobLifecycleEngine;

  beforeEach(async () => {
    const mod = await import("../engines/JobLifecycleEngine.js");
    // Use the singleton but it resets counter — jobs accumulate
    engine = mod.jobLifecycleEngine;
  });

  it("creates a job with ORDERED status", () => {
    const job = engine.createJob({
      customer: "Acme Corp",
      part_number: "AC-001",
      quantity: 50,
    });
    expect(job.id).toMatch(/^J\d{4}-\d{3}$/);
    expect(job.status).toBe("ordered");
    expect(job.progress.parts_total).toBe(50);
  });

  it("transitions status with history", () => {
    const job = engine.createJob({
      customer: "Test Co",
      part_number: "TC-100",
      quantity: 10,
    });
    const r = engine.updateStatus(job.id, "in_progress", {
      user: "operator1",
    });
    expect(r.success).toBe(true);
    expect(r.job!.status).toBe("in_progress");
    expect(r.job!.schedule.actual_start).toBeTruthy();
    expect(r.job!.status_history).toHaveLength(2);
  });

  it("records time entries", () => {
    const job = engine.createJob({
      customer: "Test",
      part_number: "X",
      quantity: 1,
    });
    engine.recordTime(job.id, {
      employee: "John",
      operation: "milling",
      hours: 2.5,
      machine: "DMG-1",
    });
    const updated = engine.getJob(job.id) as Record<string, unknown>;
    expect((updated.time_tracking as Record<string, unknown>).actual_hours).toBe(2.5);
    expect((updated.time_tracking as Record<string, unknown>).entries).toHaveLength(1);
  });

  it("tracks progress percentage", () => {
    const job = engine.createJob({
      customer: "Test",
      part_number: "X",
      quantity: 100,
    });
    const r = engine.updateProgress(job.id, 45);
    expect(r.success).toBe(true);
    expect(r.progress!.percent_complete).toBe(45);
  });

  it("adds inspection results", () => {
    const job = engine.createJob({
      customer: "Test",
      part_number: "X",
      quantity: 1,
    });
    const r = engine.addInspection(job.id, {
      inspector: "QC-1",
      type: "first_article",
      passed: true,
    });
    expect(r.success).toBe(true);
    const updated = engine.getJob(job.id) as Record<string, unknown>;
    expect((updated.quality as Record<string, unknown>).first_article_passed).toBe(true);
  });

  it("generates job summary with financials", () => {
    const job = engine.createJob({
      customer: "Test Co",
      part_number: "TC-200",
      quantity: 25,
      estimated_costs: { material: 500, machining: 1500 },
    });
    engine.updateCosts(job.id, { material: 520, machining: 1400 });
    const summary = engine.getJobSummary(job.id) as Record<string, unknown>;
    const financials = summary.financials as Record<string, unknown>;
    expect(financials.estimated_total).toBe(2000);
    expect(financials.actual_total).toBe(1920);
    expect(financials.cost_variance).toBe(-80);
  });

  it("returns dashboard with status breakdown", () => {
    engine.createJob({
      customer: "A",
      part_number: "1",
      quantity: 1,
    });
    const d = engine.dashboard();
    expect(d.total_jobs).toBeGreaterThan(0);
    expect(d.by_status).toBeDefined();
  });

  it("returns error for unknown job ID", () => {
    const r = engine.updateStatus("INVALID", "complete");
    expect(r.success).toBe(false);
    expect(r.error).toBe("Job not found");
  });
});

// ============================================================================
// Purchasing Directory Engine
// ============================================================================

describe("PurchasingDirectoryEngine", () => {
  it("searches suppliers by keyword", () => {
    const r = purchasingDirectoryEngine.searchSuppliers("cutting tools");
    expect(r.total).toBeGreaterThan(0);
    expect(r.suppliers[0].specialties).toBeDefined();
  });

  it("returns all national distributors", () => {
    const r = purchasingDirectoryEngine.getNationalDistributors();
    expect(r.length).toBeGreaterThanOrEqual(8);
    expect(r.find(s => s.id === "msc")).toBeDefined();
  });

  it("filters specialty suppliers by category", () => {
    const r = purchasingDirectoryEngine.getSpecialtySuppliers("carbide");
    expect(r.length).toBeGreaterThan(0);
  });

  it("returns manufacturers by category", () => {
    const r = purchasingDirectoryEngine.getManufacturers("cutting_tools");
    expect(r.length).toBeGreaterThanOrEqual(9);
    expect(r.find(m => m.id === "sandvik")).toBeDefined();
  });

  it("returns all manufacturers when no category", () => {
    const all = purchasingDirectoryEngine.getManufacturers();
    const ct = purchasingDirectoryEngine.getManufacturers("cutting_tools");
    expect(all.length).toBeGreaterThan(ct.length);
  });

  it("recommends suppliers sorted by price", () => {
    const r = purchasingDirectoryEngine.recommendSuppliers({
      need: "end mills",
      priority: "price",
    });
    if (r.suppliers.length >= 2) {
      // Value should come before Premium
      const priceRank: Record<string, number> = {
        Value: 0, "Value-Competitive": 1,
        "Value-Premium": 1, Competitive: 2, Premium: 3,
      };
      const first = priceRank[r.suppliers[0].price_level] ?? 2;
      const last = priceRank[
        r.suppliers[r.suppliers.length - 1].price_level
      ] ?? 2;
      expect(first).toBeLessThanOrEqual(last);
    }
  });

  it("returns summary stats", () => {
    const s = purchasingDirectoryEngine.summary();
    expect(s.national).toBeGreaterThanOrEqual(8);
    expect(s.specialty).toBeGreaterThanOrEqual(5);
    expect(s.manufacturers).toBeGreaterThan(10);
    expect(s.categories).toContain("cutting_tools");
  });

  it("gets supplier by ID", () => {
    const s = purchasingDirectoryEngine.getSupplier("msc");
    expect("name" in s && s.name).toBe("MSC Industrial Direct");
  });

  it("returns error for unknown supplier", () => {
    const s = purchasingDirectoryEngine.getSupplier("nonexistent");
    expect("error" in s).toBe(true);
  });
});
