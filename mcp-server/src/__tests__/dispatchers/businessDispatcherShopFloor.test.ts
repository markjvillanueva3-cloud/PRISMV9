/**
 * Tests for businessDispatcher ShopFloorDashboard actions
 * (PSAU P1-CLOSURE A1 Wave 1 — orphan-engine wiring)
 *
 * Wires ShopFloorDashboardEngine to 5 MCP actions:
 *   shop_floor_dashboard, shop_machine_status, shop_alerts_list,
 *   shop_alert_acknowledge, shop_machine_oee
 */

import { describe, it, expect } from "vitest";
import { businessDispatch, type BusinessActionType } from "../../tools/dispatchers/businessDispatcher.js";

describe("businessDispatcher — ShopFloorDashboard wiring (PSAU P1-CLOSURE A1)", () => {
  describe("shop_floor_dashboard", () => {
    it("returns full dashboard with default inputs (JM Die)", async () => {
      const result = await businessDispatch({ action: "shop_floor_dashboard" });
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      const d = result.data as any;
      expect(d.shopId).toBe("jm-die");
      expect(Array.isArray(d.machines)).toBe(true);
      expect(Array.isArray(d.activeJobs)).toBe(true);
      expect(d.oeeMetrics).toBeDefined();
      expect(d.oeeMetrics.oee).toBeGreaterThanOrEqual(0);
      expect(d.oeeMetrics.oee).toBeLessThanOrEqual(100);
      expect(d.summary).toBeDefined();
      expect(d.summary.totalMachines).toBeGreaterThan(0);
    });

    it("respects include_offline=false filter", async () => {
      const result = await businessDispatch({
        action: "shop_floor_dashboard",
        include_offline: false,
      });
      expect(result.success).toBe(true);
      const d = result.data as any;
      for (const m of d.machines) {
        expect(m.status).not.toBe("offline");
      }
    });

    it("respects time_range_hours", async () => {
      const result = await businessDispatch({
        action: "shop_floor_dashboard",
        time_range_hours: 24,
      });
      expect(result.success).toBe(true);
      const d = result.data as any;
      const spanMs = new Date(d.oeeMetrics.periodEnd).getTime() -
                     new Date(d.oeeMetrics.periodStart).getTime();
      const hours = spanMs / 3600_000;
      expect(hours).toBeCloseTo(24, 0);
    });

    it("respects department_filter", async () => {
      const result = await businessDispatch({
        action: "shop_floor_dashboard",
        department_filter: "okuma",
      });
      expect(result.success).toBe(true);
      const d = result.data as any;
      for (const m of d.machines) {
        expect(m.name.toLowerCase()).toContain("okuma");
      }
    });

    it("rejects invalid input types", async () => {
      const result = await businessDispatch({
        action: "shop_floor_dashboard",
        time_range_hours: -5,  // must be positive
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });
  });

  describe("shop_machine_status", () => {
    it("returns status for a known machine", async () => {
      const result = await businessDispatch({
        action: "shop_machine_status",
        machine_id: "okuma-lb3000-1",
      });
      expect(result.success).toBe(true);
      const m = result.data as any;
      expect(m.machineId).toBe("okuma-lb3000-1");
      expect(m.status).toBeDefined();
    });

    it("errors cleanly on unknown machine", async () => {
      const result = await businessDispatch({
        action: "shop_machine_status",
        machine_id: "does-not-exist-xyz",
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("rejects missing machine_id", async () => {
      const result = await businessDispatch({
        action: "shop_machine_status",
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });
  });

  describe("shop_alerts_list", () => {
    it("returns all alerts when no filter given", async () => {
      const result = await businessDispatch({ action: "shop_alerts_list" });
      expect(result.success).toBe(true);
      const d = result.data as any;
      expect(Array.isArray(d.alerts)).toBe(true);
      expect(typeof d.count).toBe("number");
      expect(d.count).toBe(d.alerts.length);
    });

    it("filters by severity", async () => {
      const result = await businessDispatch({
        action: "shop_alerts_list",
        severity: "critical",
      });
      expect(result.success).toBe(true);
      const d = result.data as any;
      for (const a of d.alerts) {
        expect(a.severity).toBe("critical");
      }
    });

    it("rejects invalid severity", async () => {
      const result = await businessDispatch({
        action: "shop_alerts_list",
        severity: "nuclear",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("shop_alert_acknowledge", () => {
    it("acknowledges a known alert", async () => {
      const result = await businessDispatch({
        action: "shop_alert_acknowledge",
        alert_id: "ALT-001",
      });
      expect(result.success).toBe(true);
      const a = result.data as any;
      expect(a.id).toBe("ALT-001");
      expect(a.acknowledged).toBe(true);
    });

    it("errors cleanly on unknown alert", async () => {
      const result = await businessDispatch({
        action: "shop_alert_acknowledge",
        alert_id: "ALT-99999",
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("shop_machine_oee", () => {
    it("returns OEE metrics for a machine", async () => {
      const result = await businessDispatch({
        action: "shop_machine_oee",
        machine_id: "okuma-lb3000-1",
      });
      expect(result.success).toBe(true);
      const o = result.data as any;
      expect(o.availability).toBeGreaterThan(0);
      expect(o.availability).toBeLessThanOrEqual(100);
      expect(o.performance).toBeGreaterThan(0);
      expect(o.quality).toBeGreaterThan(0);
      expect(o.oee).toBeGreaterThan(0);
      expect(o.periodStart).toBeDefined();
      expect(o.periodEnd).toBeDefined();
    });

    it("honors hours_back parameter", async () => {
      const result = await businessDispatch({
        action: "shop_machine_oee",
        machine_id: "okuma-lb3000-1",
        hours_back: 16,
      });
      expect(result.success).toBe(true);
      const o = result.data as any;
      const span = new Date(o.periodEnd).getTime() -
                   new Date(o.periodStart).getTime();
      expect(span / 3600_000).toBeCloseTo(16, 0);
    });

    it("rejects invalid hours_back", async () => {
      const result = await businessDispatch({
        action: "shop_machine_oee",
        machine_id: "okuma-lb3000-1",
        hours_back: -1,
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });
  });

  describe("unknown action anti-regression", () => {
    it("returns error for unknown action", async () => {
      const result = await businessDispatch({
        action: "shop_does_not_exist" as BusinessActionType,
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown action");
    });
  });
});
