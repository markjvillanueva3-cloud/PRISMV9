/**
 * LogisticsDashboardEngine — internal logistics rollup (inbound+outbound+dept).
 * @milestone HOTEL/U-LOGISTICS-DASHBOARD (2026-05-26, slot:hotel iter9 /goal Phase 3)
 */
import { describe, it, expect } from "vitest";
import { logisticsDashboardEngine, type InboundShipment, type OutboundShipment } from "../engines/LogisticsDashboardEngine.js";

const NOW = "2026-05-26T12:00:00.000Z";

describe("LogisticsDashboardEngine", () => {
  it("HAPPY PATH: aggregates inbound + outbound + dept rollup", () => {
    const inbound: InboundShipment[] = [
      { po_id: "PO-1", vendor_id: "V1", expected_at: "2026-05-25T08:00:00.000Z", received_at: "2026-05-25T09:00:00.000Z", status: "received", department_code: "receiving" },
      { po_id: "PO-2", vendor_id: "V2", expected_at: "2026-05-25T08:00:00.000Z", status: "discrepancy", department_code: "receiving", discrepancy_note: "short qty" },
      { po_id: "PO-3", vendor_id: "V3", expected_at: "2026-05-20T08:00:00.000Z", status: "expected", department_code: "mill" }, // overdue
      { po_id: "PO-4", vendor_id: "V4", expected_at: "2026-05-25T08:00:00.000Z", status: "rejected", department_code: "mill" },
    ];
    const outbound: OutboundShipment[] = [
      { order_id: "ORD-1", customer_id: "C1", carrier: "UPS", status: "delivered", shipped_at: "2026-05-22T08:00:00.000Z", delivered_at: "2026-05-25T16:00:00.000Z", department_code: "shipping" },
      { order_id: "ORD-2", customer_id: "C2", carrier: "FedEx", status: "shipped", shipped_at: "2026-05-26T08:00:00.000Z", department_code: "shipping" },
      { order_id: "ORD-3", customer_id: "C3", carrier: "UPS", status: "queued", department_code: "shipping" },
    ];
    const d = logisticsDashboardEngine.buildDashboard({
      inbound, outbound,
      window_start: "2026-05-19T00:00:00.000Z", window_end: NOW, now_iso: NOW,
    });
    expect(d.inbound_total).toBe(4);
    expect(d.inbound_discrepancies).toBe(1);
    expect(d.inbound_rejected).toBe(1);
    expect(d.outbound_total).toBe(3);
    expect(d.outbound_shipped).toBe(1);
    expect(d.outbound_delivered).toBe(1);
    expect(d.avg_delivery_days).not.toBe(null);
    expect(d.avg_delivery_days! > 3).toBe(true);
    expect(d.avg_delivery_days! < 4).toBe(true);
    expect(d.by_department.receiving?.inbound_count).toBe(2);
    expect(d.by_department.receiving?.discrepancy_count).toBe(1);
    expect(d.by_department.mill?.inbound_count).toBe(2);
    expect(d.by_department.shipping?.outbound_count).toBe(3);
    expect(d.alerts.some((a) => a.includes("discrepancy"))).toBe(true);
    expect(d.alerts.some((a) => a.includes("rejected"))).toBe(true);
    expect(d.alerts.some((a) => a.includes("past expected_at"))).toBe(true);
  });

  it("CLEAN STATE: no alerts when everything healthy", () => {
    const d = logisticsDashboardEngine.buildDashboard({
      inbound: [{ po_id: "PO-1", vendor_id: "V", expected_at: NOW, received_at: NOW, status: "received", department_code: "receiving" }],
      outbound: [],
      window_start: "2026-05-19T00:00:00.000Z", window_end: NOW, now_iso: NOW,
    });
    expect(d.alerts.length).toBe(0);
    expect(d.avg_delivery_days).toBe(null);
  });

  it("REJECTS invalid status / missing dept (R12)", () => {
    expect(() =>
      logisticsDashboardEngine.buildDashboard({
        inbound: [{ po_id: "PO-1", vendor_id: "V", expected_at: NOW, status: "bogus" as unknown as "received", department_code: "x" }],
        outbound: [],
        window_start: NOW, window_end: NOW,
      }),
    ).toThrow(/invalid inbound status/);
    expect(() =>
      logisticsDashboardEngine.buildDashboard({
        inbound: [{ po_id: "PO-1", vendor_id: "V", expected_at: NOW, status: "received", department_code: "" }],
        outbound: [],
        window_start: NOW, window_end: NOW,
      }),
    ).toThrow(/missing department_code/);
  });

  it("REJECTS non-array inputs + invalid window (R12 adversarial)", () => {
    expect(() =>
      logisticsDashboardEngine.buildDashboard({
        inbound: "junk" as unknown as InboundShipment[], outbound: [],
        window_start: NOW, window_end: NOW,
      }),
    ).toThrow(/must be arrays/);
    expect(() =>
      logisticsDashboardEngine.buildDashboard({
        inbound: [], outbound: [],
        window_start: "not-a-date", window_end: NOW,
      }),
    ).toThrow(/ISO-8601/);
  });

  it("PSN roost: edges_in from 4 logistics-source engines", () => {
    const r = logisticsDashboardEngine.systemVizRoost();
    expect(r.layer).toBe(7);
    expect(r.psn_legs).toEqual([7, 11]);
    expect(r.edges_in).toContain("ShippingReceivingLogEngine");
    expect(r.edges_in).toContain("OrderManagerEngine");
    expect(r.edges_in).toContain("PurchaseOrderLifecycleEngine");
    expect(r.edges_in).toContain("VendorPerformanceTrackerEngine");
  });
});
