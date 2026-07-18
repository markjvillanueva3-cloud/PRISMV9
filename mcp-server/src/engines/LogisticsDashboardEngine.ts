/**
 * LogisticsDashboardEngine (G10) — consolidated internal logistics view.
 *
 * Combines inbound (PO arrivals) + outbound (shipments) + receiving discrepancies
 * into a single dashboard view per dept. Internal-only scope per operator
 * green-light (external carriers + customs deferred).
 *
 * @module LogisticsDashboardEngine
 * @milestone HOTEL/U-LOGISTICS-DASHBOARD (2026-05-26, slot:hotel iter9 /goal Phase 3)
 */

export type InboundStatus = "expected" | "received" | "discrepancy" | "rejected";
export type OutboundStatus = "queued" | "packed" | "shipped" | "delivered";

export interface InboundShipment {
  po_id: string;
  vendor_id: string;
  expected_at: string;
  received_at?: string;
  status: InboundStatus;
  department_code: string;
  discrepancy_note?: string;
}

export interface OutboundShipment {
  order_id: string;
  customer_id: string;
  carrier: string;
  status: OutboundStatus;
  shipped_at?: string;
  delivered_at?: string;
  department_code: string;
}

export interface LogisticsDashboard {
  generated_at: string;
  window_start: string;
  window_end: string;
  inbound_total: number;
  inbound_discrepancies: number;
  inbound_rejected: number;
  outbound_total: number;
  outbound_shipped: number;
  outbound_delivered: number;
  /** Avg ship-to-deliver days across delivered outbound (null if none). */
  avg_delivery_days: number | null;
  /** Per-dept rollup. */
  by_department: Readonly<Record<string, Readonly<{
    inbound_count: number;
    outbound_count: number;
    discrepancy_count: number;
  }>>>;
  alerts: ReadonlyArray<string>;
}

export interface SystemVizRoost {
  engine_name: string;
  layer: number;
  node_type: "hub" | "sink" | "source" | "orphan" | "ghost" | "normal";
  psn_legs: ReadonlyArray<number>;
  edges_out: ReadonlyArray<string>;
  edges_in: ReadonlyArray<string>;
}

const ALLOWED_INBOUND = new Set<InboundStatus>(["expected", "received", "discrepancy", "rejected"]);
const ALLOWED_OUTBOUND = new Set<OutboundStatus>(["queued", "packed", "shipped", "delivered"]);

class LogisticsDashboardEngine {
  buildDashboard(args: {
    inbound: ReadonlyArray<InboundShipment>;
    outbound: ReadonlyArray<OutboundShipment>;
    window_start: string;
    window_end: string;
    now_iso?: string;
  }): LogisticsDashboard {
    if (!Array.isArray(args.inbound) || !Array.isArray(args.outbound)) {
      throw new Error(
        "LogisticsDashboardEngine.buildDashboard: inbound + outbound must be arrays",
      );
    }
    if (!Number.isFinite(Date.parse(args.window_start)) || !Number.isFinite(Date.parse(args.window_end))) {
      throw new Error(
        "LogisticsDashboardEngine.buildDashboard: window_start/end must be ISO-8601",
      );
    }
    const now = args.now_iso !== undefined ? Date.parse(args.now_iso) : Date.now();
    if (!Number.isFinite(now)) {
      throw new Error(`LogisticsDashboardEngine.buildDashboard: invalid now_iso '${args.now_iso}'`);
    }

    // Tally inbound + dept rollup
    const byDept: Record<string, { inbound_count: number; outbound_count: number; discrepancy_count: number }> = {};
    let inboundDiscrepancies = 0;
    let inboundRejected = 0;
    for (const ib of args.inbound) {
      if (!ALLOWED_INBOUND.has(ib.status)) {
        throw new Error(`LogisticsDashboardEngine: invalid inbound status '${ib.status}' on ${ib.po_id}`);
      }
      if (!ib.department_code) {
        throw new Error(`LogisticsDashboardEngine: inbound ${ib.po_id} missing department_code`);
      }
      const d = byDept[ib.department_code] ?? { inbound_count: 0, outbound_count: 0, discrepancy_count: 0 };
      d.inbound_count++;
      if (ib.status === "discrepancy") {
        inboundDiscrepancies++;
        d.discrepancy_count++;
      }
      if (ib.status === "rejected") inboundRejected++;
      byDept[ib.department_code] = d;
    }

    // Tally outbound
    let outboundShipped = 0;
    let outboundDelivered = 0;
    let deliveryDaysSum = 0;
    let deliveryDaysCount = 0;
    for (const ob of args.outbound) {
      if (!ALLOWED_OUTBOUND.has(ob.status)) {
        throw new Error(`LogisticsDashboardEngine: invalid outbound status '${ob.status}' on ${ob.order_id}`);
      }
      if (!ob.department_code) {
        throw new Error(`LogisticsDashboardEngine: outbound ${ob.order_id} missing department_code`);
      }
      const d = byDept[ob.department_code] ?? { inbound_count: 0, outbound_count: 0, discrepancy_count: 0 };
      d.outbound_count++;
      byDept[ob.department_code] = d;
      if (ob.status === "shipped") outboundShipped++;
      if (ob.status === "delivered") {
        outboundDelivered++;
        if (ob.shipped_at && ob.delivered_at) {
          const shipMs = Date.parse(ob.shipped_at);
          const delivMs = Date.parse(ob.delivered_at);
          if (Number.isFinite(shipMs) && Number.isFinite(delivMs) && delivMs >= shipMs) {
            deliveryDaysSum += (delivMs - shipMs) / 86_400_000;
            deliveryDaysCount++;
          }
        }
      }
    }

    // Alerts
    const alerts: string[] = [];
    if (inboundDiscrepancies > 0) {
      alerts.push(`${inboundDiscrepancies} inbound shipment(s) with discrepancy — receiving needs review`);
    }
    if (inboundRejected > 0) {
      alerts.push(`${inboundRejected} inbound shipment(s) rejected — vendor follow-up required`);
    }
    // Overdue inbound: expected_at past now but still 'expected'
    let overdueInbound = 0;
    for (const ib of args.inbound) {
      if (ib.status !== "expected") continue;
      const expMs = Date.parse(ib.expected_at);
      if (Number.isFinite(expMs) && now > expMs) overdueInbound++;
    }
    if (overdueInbound > 0) {
      alerts.push(`${overdueInbound} inbound shipment(s) past expected_at — chase vendor`);
    }

    // Freeze dept rollups
    const frozenByDept: Record<string, Readonly<{ inbound_count: number; outbound_count: number; discrepancy_count: number }>> = {};
    for (const [k, v] of Object.entries(byDept)) {
      frozenByDept[k] = Object.freeze({ ...v });
    }

    return Object.freeze({
      generated_at: new Date().toISOString(),
      window_start: args.window_start,
      window_end: args.window_end,
      inbound_total: args.inbound.length,
      inbound_discrepancies: inboundDiscrepancies,
      inbound_rejected: inboundRejected,
      outbound_total: args.outbound.length,
      outbound_shipped: outboundShipped,
      outbound_delivered: outboundDelivered,
      avg_delivery_days: deliveryDaysCount > 0 ? deliveryDaysSum / deliveryDaysCount : null,
      by_department: Object.freeze(frozenByDept),
      alerts: Object.freeze(alerts),
    });
  }

  systemVizRoost(): SystemVizRoost {
    return Object.freeze({
      engine_name: "LogisticsDashboardEngine",
      layer: 7,
      node_type: "hub",
      psn_legs: Object.freeze([7, 11]),
      edges_out: Object.freeze(["ManagerDailyDashboardEngine"]),
      edges_in: Object.freeze([
        "ShippingReceivingLogEngine",
        "OrderManagerEngine",
        "PurchaseOrderLifecycleEngine",
        "VendorPerformanceTrackerEngine",
      ]),
    });
  }
}

export const logisticsDashboardEngine = new LogisticsDashboardEngine();
