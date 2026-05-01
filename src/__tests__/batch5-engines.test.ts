/**
 * Batch 5 Engines — Unit Tests
 * ReportingEngine, OrderManagerEngine
 * @milestone AUDIT-FT-B5
 */
import { describe, it, expect, beforeEach } from "vitest";
import { reportingEngine } from "../engines/ReportingEngine.js";
import { orderManagerEngine } from "../engines/OrderManagerEngine.js";

// ═══════════════════════════════════════════════════════════════
// ReportingEngine
// ═══════════════════════════════════════════════════════════════
describe("ReportingEngine", () => {
  const production = [
    { date: "2026-03-01", partNumber: "P001", quantity: 100, machine: "M1", cycleTime: 2, setupTime: 30, scrapCount: 5, downtime: 15 },
    { date: "2026-03-01", partNumber: "P002", quantity: 50, machine: "M2", cycleTime: 5, setupTime: 45, scrapCount: 2, downtime: 10 },
    { date: "2026-03-02", partNumber: "P001", quantity: 80, machine: "M1", cycleTime: 2, setupTime: 20, scrapCount: 3, downtime: 5 },
  ];

  const quality = [
    { date: "2026-03-01", partNumber: "P001", inspected: 100, passed: 95, failed: 5, defectType: "dimensional", reworked: 3 },
    { date: "2026-03-01", partNumber: "P002", inspected: 50, passed: 48, failed: 2, defectType: "surface", reworked: 1 },
    { date: "2026-03-02", partNumber: "P001", inspected: 80, passed: 77, failed: 3, defectType: "dimensional", reworked: 2 },
  ];

  describe("dashboard", () => {
    it("computes production KPIs", () => {
      const d = reportingEngine.dashboard(production, quality);
      expect(d.production.totalParts).toBe(230);
      expect(d.production.totalSetupMinutes).toBe(95);
      expect(d.production.totalDowntimeMinutes).toBe(30);
      expect(d.production.partsPerHour).toBeGreaterThan(0);
      expect(d.production.utilizationPct).toBeGreaterThan(0);
    });

    it("computes quality KPIs", () => {
      const d = reportingEngine.dashboard(production, quality);
      expect(d.quality.totalInspected).toBe(230);
      expect(d.quality.totalPassed).toBe(220);
      expect(d.quality.totalFailed).toBe(10);
      expect(d.quality.yieldPct).toBeCloseTo(95.65, 1);
      expect(d.quality.scrapPct).toBeGreaterThan(0);
    });

    it("computes OEE", () => {
      const d = reportingEngine.dashboard(production, quality);
      expect(d.oee.availability).toBeGreaterThan(0);
      expect(d.oee.performance).toBeGreaterThan(0);
      expect(d.oee.quality).toBeGreaterThan(0);
      expect(d.oee.overall).toBeGreaterThan(0);
      expect(d.oee.overall).toBeLessThanOrEqual(100);
    });

    it("handles empty data", () => {
      const d = reportingEngine.dashboard([], []);
      expect(d.production.totalParts).toBe(0);
      expect(d.quality.yieldPct).toBe(100);
      expect(d.oee.overall).toBe(100);
    });
  });

  describe("paretoAnalysis", () => {
    it("sorts by count and computes cumulative %", () => {
      const result = reportingEngine.paretoAnalysis([
        { category: "dimensional", count: 8 },
        { category: "surface", count: 2 },
        { category: "burr", count: 5 },
      ]);
      expect(result[0].category).toBe("dimensional");
      expect(result[0].cumulativePct).toBeCloseTo(53.33, 1);
      expect(result[result.length - 1].cumulativePct).toBe(100);
    });

    it("handles empty data", () => {
      expect(reportingEngine.paretoAnalysis([])).toHaveLength(0);
    });
  });

  describe("productionReport", () => {
    it("groups by part number", () => {
      const r = reportingEngine.productionReport(production);
      expect(r).toHaveLength(2);
      const p001 = r.find(x => x.partNumber === "P001")!;
      expect(p001.totalQuantity).toBe(180);
      expect(p001.totalScrap).toBe(8);
      expect(p001.avgCycleTime).toBe(2);
      expect(p001.machines).toContain("M1");
    });
  });

  describe("qualityReport", () => {
    it("summarizes by defect type", () => {
      const r = reportingEngine.qualityReport(quality);
      expect(r.overall.inspected).toBe(230);
      expect(r.overall.yieldPct).toBeCloseTo(95.65, 1);
      expect(r.byDefect[0].defectType).toBe("dimensional");
      expect(r.byDefect[0].count).toBe(8);
    });
  });

  describe("financialReport", () => {
    it("summarizes by category and job", () => {
      const records = [
        { date: "2026-03-01", category: "material", amount: 500, jobId: "J1" },
        { date: "2026-03-01", category: "labor", amount: 300, jobId: "J1" },
        { date: "2026-03-02", category: "material", amount: 200, jobId: "J2" },
      ];
      const r = reportingEngine.financialReport(records);
      expect(r.total).toBe(1000);
      expect(r.byCategory[0].category).toBe("material");
      expect(r.byCategory[0].total).toBe(700);
      expect(r.byJob).toHaveLength(2);
    });
  });

  describe("trendAnalysis", () => {
    it("computes moving average", () => {
      const data = [
        { period: "W1", value: 10 },
        { period: "W2", value: 20 },
        { period: "W3", value: 30 },
        { period: "W4", value: 40 },
      ];
      const r = reportingEngine.trendAnalysis(data, 3);
      expect(r[0].movingAverage).toBeUndefined();
      expect(r[1].movingAverage).toBeUndefined();
      expect(r[2].movingAverage).toBe(20); // (10+20+30)/3
      expect(r[3].movingAverage).toBe(30); // (20+30+40)/3
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// OrderManagerEngine
// ═══════════════════════════════════════════════════════════════
describe("OrderManagerEngine", () => {
  beforeEach(() => {
    orderManagerEngine.reset();
  });

  describe("createOrder", () => {
    it("creates an order with ID", () => {
      const o = orderManagerEngine.createOrder({
        customer: "Acme", partNumber: "P001", quantity: 100,
      });
      expect(o.id).toMatch(/^ORD-\d{4}$/);
      expect(o.status).toBe("draft");
      expect(o.quantity).toBe(100);
      expect(o.priority).toBe(3);
    });
  });

  describe("updateOrderStatus", () => {
    it("updates status and notes", () => {
      const o = orderManagerEngine.createOrder({
        customer: "Acme", partNumber: "P001", quantity: 50,
      });
      const updated = orderManagerEngine.updateOrderStatus(
        o.id, "confirmed", { notes: "Rush order" },
      );
      expect(updated.status).toBe("confirmed");
      expect(updated.notes).toContain("Rush order");
    });

    it("throws on unknown order", () => {
      expect(() => orderManagerEngine.updateOrderStatus("NOPE", "confirmed"))
        .toThrow("Order not found");
    });
  });

  describe("work orders", () => {
    it("creates and links work order", () => {
      const o = orderManagerEngine.createOrder({
        customer: "Acme", partNumber: "P001", quantity: 100,
      });
      const wo = orderManagerEngine.createWorkOrder({
        orderId: o.id, machine: "VMC-1", operation: "roughing", quantity: 100,
      });
      expect(wo.id).toMatch(/^WO-\d{4}$/);
      expect(wo.status).toBe("pending");

      const wos = orderManagerEngine.getWorkOrders(o.id);
      expect(wos).toHaveLength(1);
      expect(wos[0].id).toBe(wo.id);
    });

    it("logs time", () => {
      const o = orderManagerEngine.createOrder({
        customer: "Acme", partNumber: "P001", quantity: 10,
      });
      const wo = orderManagerEngine.createWorkOrder({
        orderId: o.id, machine: "VMC-1", operation: "finishing", quantity: 10,
      });
      const updated = orderManagerEngine.logTime(wo.id, 45);
      expect(updated.actualTime).toBe(45);
      expect(updated.timeLog).toHaveLength(1);
    });

    it("logs production and auto-completes", () => {
      const o = orderManagerEngine.createOrder({
        customer: "Acme", partNumber: "P001", quantity: 10,
      });
      orderManagerEngine.updateOrderStatus(o.id, "in_progress");
      const wo = orderManagerEngine.createWorkOrder({
        orderId: o.id, machine: "VMC-1", operation: "milling", quantity: 10,
      });
      orderManagerEngine.logProduction(wo.id, 5);
      orderManagerEngine.logProduction(wo.id, 5, 1);

      const updated = orderManagerEngine.getOrder(o.id)!;
      expect(updated.completedQuantity).toBe(10);
      expect(updated.status).toBe("completed");
    });
  });

  describe("machineQueue", () => {
    it("returns pending work orders sorted by priority", () => {
      const o1 = orderManagerEngine.createOrder({
        customer: "A", partNumber: "P1", quantity: 10, priority: 5,
      });
      const o2 = orderManagerEngine.createOrder({
        customer: "B", partNumber: "P2", quantity: 10, priority: 1,
      });
      orderManagerEngine.createWorkOrder({
        orderId: o1.id, machine: "VMC-1", operation: "op1", quantity: 10,
      });
      orderManagerEngine.createWorkOrder({
        orderId: o2.id, machine: "VMC-1", operation: "op2", quantity: 10,
      });

      const queue = orderManagerEngine.machineQueue("VMC-1");
      expect(queue).toHaveLength(2);
      expect(queue[0].orderId).toBe(o2.id); // priority 1 first
    });
  });

  describe("metrics", () => {
    it("computes order metrics", () => {
      orderManagerEngine.createOrder({
        customer: "A", partNumber: "P1", quantity: 100,
      });
      orderManagerEngine.createOrder({
        customer: "B", partNumber: "P2", quantity: 50,
      });

      const m = orderManagerEngine.metrics();
      expect(m.totalOrders).toBe(2);
      expect(m.byStatus.draft).toBe(2);
      expect(m.totalQuantityOrdered).toBe(150);
      expect(m.completionPct).toBe(0);
    });
  });

  describe("listOrders", () => {
    it("filters by status", () => {
      orderManagerEngine.createOrder({
        customer: "A", partNumber: "P1", quantity: 10,
      });
      const o2 = orderManagerEngine.createOrder({
        customer: "B", partNumber: "P2", quantity: 20,
      });
      orderManagerEngine.updateOrderStatus(o2.id, "confirmed");

      expect(orderManagerEngine.listOrders("draft")).toHaveLength(1);
      expect(orderManagerEngine.listOrders("confirmed")).toHaveLength(1);
      expect(orderManagerEngine.listOrders()).toHaveLength(2);
    });
  });
});
