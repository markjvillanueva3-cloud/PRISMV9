/**
 * LatheFinancialReportingEngine Tests
 *
 * U-LTH57: P&L, margin analysis, cost tracking, financial KPIs
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheFinancialReportingEngine } from "../engines/LatheFinancialReportingEngine.js";

describe("LatheFinancialReportingEngine", () => {
  beforeEach(() => {
    latheFinancialReportingEngine.clearAll();
  });

  describe("Record Management", () => {
    it("records job financials", () => {
      const record = latheFinancialReportingEngine.recordJobFinancials({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        customer_name: "Acme Corp",
        part_number: "SHAFT-001",
        quantity: 100,
        revenue: 5000,
        material_cost: 1000,
        labor_cost: 1500,
        tooling_cost: 200,
      });

      expect(record.record_id).toMatch(/^FIN-/);
      expect(record.revenue).toBe(5000);
      expect(record.total_cost).toBeGreaterThan(0);
      expect(record.gross_profit).toBeGreaterThan(0);
      expect(record.margin_pct).toBeGreaterThan(0);
    });

    it("calculates overhead automatically", () => {
      const record = latheFinancialReportingEngine.recordJobFinancials({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        customer_name: "Acme Corp",
        part_number: "SHAFT-001",
        quantity: 100,
        revenue: 5000,
        material_cost: 1000,
        labor_cost: 1000,
        tooling_cost: 0,
      });

      expect(record.overhead_cost).toBe(300);
    });

    it("calculates margin percentage", () => {
      const record = latheFinancialReportingEngine.recordJobFinancials({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        customer_name: "Acme Corp",
        part_number: "SHAFT-001",
        quantity: 100,
        revenue: 10000,
        material_cost: 2000,
        labor_cost: 2000,
        tooling_cost: 500,
      });

      const expectedCost = 2000 + 2000 + 500 + (2000 + 2000 + 500) * 0.15;
      const expectedProfit = 10000 - expectedCost;
      const expectedMargin = (expectedProfit / 10000) * 100;

      expect(record.margin_pct).toBeCloseTo(expectedMargin, 0);
    });

    it("retrieves records by job", () => {
      latheFinancialReportingEngine.recordJobFinancials({
        job_id: "JOB-001",
        customer_id: "CUST-001",
        customer_name: "Acme Corp",
        part_number: "SHAFT-001",
        quantity: 100,
        revenue: 5000,
        material_cost: 1000,
        labor_cost: 1500,
        tooling_cost: 200,
      });

      const records = latheFinancialReportingEngine.getRecordsByJob("JOB-001");
      expect(records.length).toBe(1);
    });
  });

  describe("P&L Statement", () => {
    beforeEach(() => {
      for (let i = 0; i < 10; i++) {
        latheFinancialReportingEngine.recordJobFinancials({
          job_id: `JOB-${i}`,
          customer_id: "CUST-001",
          customer_name: "Acme Corp",
          part_number: `PART-${i}`,
          quantity: 50 + i * 10,
          revenue: 3000 + i * 500,
          material_cost: 600 + i * 50,
          labor_cost: 800 + i * 50,
          tooling_cost: 100 + i * 10,
        });
      }
    });

    it("generates P&L for period", () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const pnl = latheFinancialReportingEngine.generateProfitLossStatement(
        startDate.toISOString(),
        new Date().toISOString()
      );

      expect(pnl.revenue).toBeGreaterThan(0);
      expect(pnl.cost_of_goods_sold.total).toBeGreaterThan(0);
      expect(pnl.gross_profit).toBeGreaterThan(0);
    });

    it("includes all cost categories", () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const pnl = latheFinancialReportingEngine.generateProfitLossStatement(
        startDate.toISOString(),
        new Date().toISOString()
      );

      expect(pnl.cost_of_goods_sold.material).toBeGreaterThan(0);
      expect(pnl.cost_of_goods_sold.labor).toBeGreaterThan(0);
      expect(pnl.cost_of_goods_sold.tooling).toBeGreaterThan(0);
      expect(pnl.cost_of_goods_sold.overhead).toBeGreaterThan(0);
    });

    it("calculates operating income", () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const pnl = latheFinancialReportingEngine.generateProfitLossStatement(
        startDate.toISOString(),
        new Date().toISOString()
      );

      expect(pnl.operating_income).toBeLessThan(pnl.gross_profit);
      expect(pnl.operating_margin_pct).toBeLessThan(pnl.gross_margin_pct);
    });
  });

  describe("Margin Analysis", () => {
    beforeEach(() => {
      const customers = ["CUST-001", "CUST-002", "CUST-003"];
      const partTypes = ["SHAFT-A", "BORE-B", "THREAD-C"];

      for (let i = 0; i < 15; i++) {
        latheFinancialReportingEngine.recordJobFinancials({
          job_id: `JOB-${i}`,
          customer_id: customers[i % 3],
          customer_name: `Customer ${customers[i % 3]}`,
          part_number: partTypes[i % 3],
          quantity: 50,
          revenue: 2000 + i * 200,
          material_cost: 400 + i * 20,
          labor_cost: 500 + i * 20,
          tooling_cost: 100,
        });
      }
    });

    it("analyzes margins by customer", () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const analysis = latheFinancialReportingEngine.analyzeMargins(
        startDate.toISOString(),
        new Date().toISOString()
      );

      expect(analysis.by_customer.length).toBe(3);
      expect(analysis.by_customer[0].margin_pct).toBeGreaterThanOrEqual(
        analysis.by_customer[1].margin_pct
      );
    });

    it("analyzes margins by part type", () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const analysis = latheFinancialReportingEngine.analyzeMargins(
        startDate.toISOString(),
        new Date().toISOString()
      );

      expect(analysis.by_part_type.length).toBeGreaterThan(0);
    });

    it("identifies top and bottom performers", () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const analysis = latheFinancialReportingEngine.analyzeMargins(
        startDate.toISOString(),
        new Date().toISOString()
      );

      expect(analysis.top_performers.length).toBeLessThanOrEqual(5);
      expect(analysis.bottom_performers.length).toBeLessThanOrEqual(5);

      if (analysis.top_performers.length > 0 && analysis.bottom_performers.length > 0) {
        expect(analysis.top_performers[0].margin_pct).toBeGreaterThanOrEqual(
          analysis.bottom_performers[0].margin_pct
        );
      }
    });
  });

  describe("Cost Breakdown", () => {
    beforeEach(() => {
      for (let i = 0; i < 10; i++) {
        latheFinancialReportingEngine.recordJobFinancials({
          job_id: `JOB-${i}`,
          customer_id: "CUST-001",
          customer_name: "Acme Corp",
          part_number: `PART-${i}`,
          quantity: 100,
          revenue: 5000,
          material_cost: 1000,
          labor_cost: 1200,
          tooling_cost: 300,
        });
      }
    });

    it("calculates cost percentages", () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const breakdown = latheFinancialReportingEngine.getCostBreakdown(
        startDate.toISOString(),
        new Date().toISOString()
      );

      const totalPct = breakdown.material_pct + breakdown.labor_pct +
        breakdown.tooling_pct + breakdown.overhead_pct;

      expect(totalPct).toBeCloseTo(100, 0);
    });

    it("calculates cost per part", () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const breakdown = latheFinancialReportingEngine.getCostBreakdown(
        startDate.toISOString(),
        new Date().toISOString()
      );

      expect(breakdown.cost_per_part).toBeGreaterThan(0);
    });

    it("identifies cost trends", () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const breakdown = latheFinancialReportingEngine.getCostBreakdown(
        startDate.toISOString(),
        new Date().toISOString()
      );

      expect(["increasing", "stable", "decreasing"]).toContain(breakdown.trends.material_trend);
      expect(["increasing", "stable", "decreasing"]).toContain(breakdown.trends.labor_trend);
      expect(["increasing", "stable", "decreasing"]).toContain(breakdown.trends.tooling_trend);
    });
  });

  describe("Financial KPIs", () => {
    beforeEach(() => {
      for (let i = 0; i < 10; i++) {
        latheFinancialReportingEngine.recordJobFinancials({
          job_id: `JOB-${i}`,
          customer_id: "CUST-001",
          customer_name: "Acme Corp",
          part_number: `PART-${i}`,
          quantity: 100,
          revenue: 5000,
          material_cost: 1000,
          labor_cost: 1200,
          tooling_cost: 300,
        });
      }
    });

    it("calculates comprehensive KPIs", () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const kpis = latheFinancialReportingEngine.calculateKPIs(
        startDate.toISOString(),
        new Date().toISOString(),
        500
      );

      expect(kpis.revenue).toBeGreaterThan(0);
      expect(kpis.gross_margin_pct).toBeGreaterThan(0);
      expect(kpis.average_job_value).toBeGreaterThan(0);
    });

    it("calculates revenue per machine hour", () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const kpis = latheFinancialReportingEngine.calculateKPIs(
        startDate.toISOString(),
        new Date().toISOString(),
        500
      );

      expect(kpis.revenue_per_machine_hour).toBeGreaterThan(0);
      expect(kpis.cost_per_machine_hour).toBeGreaterThan(0);
    });

    it("calculates labor efficiency", () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const kpis = latheFinancialReportingEngine.calculateKPIs(
        startDate.toISOString(),
        new Date().toISOString()
      );

      expect(kpis.labor_efficiency).toBeGreaterThan(0);
    });
  });

  describe("Cash Flow Projection", () => {
    it("projects cash flow for multiple weeks", () => {
      const projections = latheFinancialReportingEngine.projectCashFlow(
        50000,
        30000,
        20000,
        4
      );

      expect(projections.length).toBe(4);
    });

    it("calculates collections and payments", () => {
      const projections = latheFinancialReportingEngine.projectCashFlow(
        50000,
        40000,
        20000,
        1
      );

      expect(projections[0].projected_collections).toBeGreaterThan(0);
      expect(projections[0].projected_payments).toBeGreaterThan(0);
    });

    it("tracks ending cash balance", () => {
      const projections = latheFinancialReportingEngine.projectCashFlow(
        50000,
        30000,
        20000,
        4
      );

      for (let i = 1; i < projections.length; i++) {
        const prevCash = i === 1 ? 50000 : projections[i - 2].ending_cash;
        const expectedCash = prevCash + projections[i - 1].net_cash_flow;
        expect(projections[i - 1].ending_cash).toBeCloseTo(
          prevCash + projections[i - 1].net_cash_flow,
          0
        );
      }
    });
  });

  describe("Customer Profitability", () => {
    beforeEach(() => {
      for (let i = 0; i < 10; i++) {
        latheFinancialReportingEngine.recordJobFinancials({
          job_id: `JOB-A-${i}`,
          customer_id: "CUST-001",
          customer_name: "High Margin Inc",
          part_number: `PART-${i}`,
          quantity: 100,
          revenue: 5000,
          material_cost: 800,
          labor_cost: 1000,
          tooling_cost: 200,
        });
      }

      for (let i = 0; i < 5; i++) {
        latheFinancialReportingEngine.recordJobFinancials({
          job_id: `JOB-B-${i}`,
          customer_id: "CUST-002",
          customer_name: "Low Margin Co",
          part_number: `PART-${i}`,
          quantity: 100,
          revenue: 3000,
          material_cost: 1200,
          labor_cost: 1000,
          tooling_cost: 300,
        });
      }
    });

    it("calculates customer lifetime profitability", () => {
      const prof = latheFinancialReportingEngine.getCustomerProfitability("CUST-001");

      expect(prof).not.toBeNull();
      expect(prof!.lifetime_revenue).toBeGreaterThan(0);
      expect(prof!.lifetime_profit).toBeGreaterThan(0);
      expect(prof!.job_count).toBe(10);
    });

    it("assigns profitability tier", () => {
      const prof = latheFinancialReportingEngine.getCustomerProfitability("CUST-001");

      expect(["platinum", "gold", "silver", "bronze"]).toContain(prof!.profitability_tier);
    });

    it("calculates average job value", () => {
      const prof = latheFinancialReportingEngine.getCustomerProfitability("CUST-001");

      expect(prof!.avg_job_value).toBeCloseTo(prof!.lifetime_revenue / prof!.job_count, 0);
    });

    it("returns all customer profitability sorted by profit", () => {
      const allProf = latheFinancialReportingEngine.getAllCustomerProfitability();

      expect(allProf.length).toBe(2);
      expect(allProf[0].lifetime_profit).toBeGreaterThanOrEqual(allProf[1].lifetime_profit);
    });

    it("returns null for unknown customer", () => {
      const prof = latheFinancialReportingEngine.getCustomerProfitability("UNKNOWN");
      expect(prof).toBeNull();
    });
  });
});
