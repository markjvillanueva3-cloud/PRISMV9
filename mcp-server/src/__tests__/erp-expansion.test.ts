/**
 * ERP Expansion Tests — PurchaseOrder, GeneralLedger, CapacityPlanning,
 * QualityManagement engines + ActualCost enhancements.
 */
import { describe, it, expect, beforeEach } from "vitest";

// Direct engine imports
import { purchaseOrderEngine } from "../engines/PurchaseOrderEngine.js";
import { generalLedgerEngine } from "../engines/GeneralLedgerEngine.js";
import { capacityPlanningEngine } from "../engines/CapacityPlanningEngine.js";
import { qualityManagementEngine } from "../engines/QualityManagementEngine.js";

// === Purchase Order Engine ===
describe("PurchaseOrderEngine", () => {
  it("creates a PO with line items", () => {
    const po = purchaseOrderEngine.createOrder({
      supplier_id: "SUP-001",
      supplier_name: "MSC Industrial",
      line_items: [
        { description: "1/2 Carbide End Mill", part_number: "EM-500", quantity_ordered: 10, unit_price: 45, category: "cutting_tool" },
        { description: "6061-T6 Bar 2x2x12", part_number: "AL-2212", quantity_ordered: 5, unit_price: 28, category: "raw_material" },
      ],
      payment_terms: "Net 30",
      linked_jobs: ["JOB-101"],
    });
    expect(po.id).toMatch(/^PO-/);
    expect(po.status).toBe("draft");
    expect(po.line_items).toHaveLength(2);
    expect(po.subtotal).toBe(590); // 10*45 + 5*28
    expect(po.total).toBeCloseTo(637.2, 1); // 590 * 1.08
  });

  it("approves a PO", () => {
    const po = purchaseOrderEngine.createOrder({
      supplier_id: "SUP-002", supplier_name: "Grainger",
      line_items: [{ description: "Coolant 5gal", quantity_ordered: 2, unit_price: 55, category: "consumable" }],
    });
    const approved = purchaseOrderEngine.approveOrder(po.id, "manager-1");
    expect(approved.status).toBe("approved");
    expect(approved.approved_by).toBe("manager-1");
  });

  it("receives goods and updates PO status", () => {
    const po = purchaseOrderEngine.createOrder({
      supplier_id: "SUP-003", supplier_name: "McMaster",
      line_items: [{ description: "Dowel Pins", quantity_ordered: 100, unit_price: 0.5, category: "consumable" }],
    });
    purchaseOrderEngine.approveOrder(po.id, "mgr");
    const lineId = po.line_items[0].id;
    const rec = purchaseOrderEngine.receiveGoods({
      po_id: po.id, received_by: "warehouse-1",
      line_items: [{ line_id: lineId, quantity_received: 100 }],
    });
    expect(rec.po_id).toBe(po.id);
    const updated = purchaseOrderEngine.getOrder(po.id)!;
    expect(updated.status).toBe("received");
    expect(updated.line_items[0].quantity_received).toBe(100);
  });

  it("performs 3-way match", () => {
    const po = purchaseOrderEngine.createOrder({
      supplier_id: "SUP-004", supplier_name: "Fastenal",
      line_items: [{ description: "Bolts", quantity_ordered: 50, unit_price: 1.2, category: "consumable" }],
    });
    purchaseOrderEngine.approveOrder(po.id, "mgr");
    purchaseOrderEngine.receiveGoods({
      po_id: po.id, received_by: "wh",
      line_items: [{ line_id: po.line_items[0].id, quantity_received: 50 }],
    });
    const match = purchaseOrderEngine.threeWayMatch(po.id, po.total);
    expect(match.overall_match).toBe(true);
    expect(match.discrepancies).toHaveLength(0);
  });

  it("detects 3-way match discrepancy", () => {
    const po = purchaseOrderEngine.createOrder({
      supplier_id: "SUP-005", supplier_name: "Zoro",
      line_items: [{ description: "Gloves", quantity_ordered: 20, unit_price: 5, category: "consumable" }],
    });
    const match = purchaseOrderEngine.threeWayMatch(po.id, po.total + 50);
    expect(match.overall_match).toBe(false);
    expect(match.discrepancies.length).toBeGreaterThan(0);
  });

  it("lists orders with filter", () => {
    const list = purchaseOrderEngine.listOrders({ status: "draft" });
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((po) => po.status === "draft")).toBe(true);
  });

  it("calculates spend by category", () => {
    const spend = purchaseOrderEngine.spendByCategory();
    expect(spend.length).toBeGreaterThan(0);
    expect(spend[0]).toHaveProperty("category");
    expect(spend[0]).toHaveProperty("total");
  });

  it("generates AP aging", () => {
    const aging = purchaseOrderEngine.getAPAging();
    expect(aging).toHaveProperty("total_payable");
    expect(aging).toHaveProperty("current");
    expect(aging).toHaveProperty("by_supplier");
  });
});

// === General Ledger Engine ===
describe("GeneralLedgerEngine", () => {
  it("has default chart of accounts", () => {
    const coa = generalLedgerEngine.getChartOfAccounts();
    expect(coa.length).toBeGreaterThanOrEqual(20);
    const cash = coa.find((a) => a.code === "1000");
    expect(cash?.name).toBe("Cash");
    expect(cash?.type).toBe("asset");
  });

  it("creates balanced journal entry", () => {
    const je = generalLedgerEngine.createJournalEntry({
      date: "2026-03-06",
      description: "Test entry",
      source: "test",
      lines: [
        { account_code: "1000", debit: 1000 },
        { account_code: "4000", credit: 1000 },
      ],
    });
    expect(je.id).toMatch(/^JE-/);
    expect(je.posted).toBe(true);
    expect(je.lines).toHaveLength(2);
  });

  it("rejects unbalanced journal entry", () => {
    expect(() => generalLedgerEngine.createJournalEntry({
      date: "2026-03-06",
      description: "Bad entry",
      source: "test",
      lines: [
        { account_code: "1000", debit: 500 },
        { account_code: "4000", credit: 300 },
      ],
    })).toThrow(/not balanced/);
  });

  it("records invoice and updates AR", () => {
    const je = generalLedgerEngine.recordInvoice({
      invoice_id: "INV-TEST-001",
      amount: 5000,
      tax: 400,
      date: "2026-03-06",
    });
    expect(je.lines).toHaveLength(3);
    expect(je.source).toBe("invoicing");
  });

  it("records payment", () => {
    const je = generalLedgerEngine.recordPayment({
      invoice_id: "INV-TEST-001",
      amount: 5400,
      date: "2026-03-07",
    });
    expect(je.lines).toHaveLength(2);
  });

  it("records purchase and updates AP", () => {
    const je = generalLedgerEngine.recordPurchase({
      po_id: "PO-TEST-001",
      amount: 2000,
      tax: 160,
      category: "raw_material",
      date: "2026-03-06",
    });
    expect(je.source).toBe("purchasing");
  });

  it("records payroll", () => {
    const je = generalLedgerEngine.recordPayroll({
      period: "2026-03",
      gross: 8000,
      taxes: 1200,
      net: 6800,
      date: "2026-03-15",
    });
    expect(je.lines.length).toBeGreaterThanOrEqual(4);
  });

  it("generates trial balance", () => {
    const tb = generalLedgerEngine.getTrialBalance();
    expect(tb.balanced).toBe(true);
    expect(tb.total_debits).toBeCloseTo(tb.total_credits, 0);
  });

  it("generates income statement", () => {
    const pl = generalLedgerEngine.getIncomeStatement("2026-03-01", "2026-03-31");
    expect(pl).toHaveProperty("total_revenue");
    expect(pl).toHaveProperty("total_expenses");
    expect(pl).toHaveProperty("net_income");
    expect(pl).toHaveProperty("margin_pct");
  });

  it("generates balance sheet", () => {
    const bs = generalLedgerEngine.getBalanceSheet();
    expect(bs).toHaveProperty("total_assets");
    expect(bs).toHaveProperty("total_liabilities");
    expect(bs).toHaveProperty("total_equity");
  });

  it("lists entries with filter", () => {
    const entries = generalLedgerEngine.listEntries({ source: "invoicing" });
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((e) => e.source === "invoicing")).toBe(true);
  });
});

// === Capacity Planning Engine ===
describe("CapacityPlanningEngine", () => {
  it("has default machines", () => {
    const machines = capacityPlanningEngine.getMachines();
    expect(machines.length).toBeGreaterThanOrEqual(3); // At least 3 machines (may be shop or fallback)
    // Verify structure
    const first = machines[0];
    expect(first).toHaveProperty("machine_id");
    expect(first).toHaveProperty("machine_name");
    expect(first.effective_weekly_hours).toBeGreaterThan(0);
  });

  it("schedules a job", () => {
    const slots = capacityPlanningEngine.scheduleJob({
      job_id: "JOB-CAP-001",
      operations: [
        { operation: "Roughing", machine_id: "VMC-1", hours: 4 },
        { operation: "Finishing", machine_id: "VMC-1", hours: 2 },
      ],
      due_date: "2026-03-20",
      priority: 3,
    });
    expect(slots).toHaveLength(2);
    expect(slots[0].machine_id).toBe("VMC-1");
  });

  it("calculates machine load", () => {
    const load = capacityPlanningEngine.getMachineLoad("VMC-1", 1);
    expect(load).toHaveProperty("capacity_hours");
    expect(load).toHaveProperty("loaded_hours");
    expect(load).toHaveProperty("utilization_pct");
    expect(load).toHaveProperty("status");
  });

  it("gets all machine loads", () => {
    const loads = capacityPlanningEngine.getAllMachineLoads(1);
    expect(loads.length).toBeGreaterThanOrEqual(8);
  });

  it("finds bottlenecks", () => {
    // Schedule enough to create a bottleneck
    for (let i = 0; i < 10; i++) {
      capacityPlanningEngine.scheduleJob({
        job_id: `JOB-BN-${i}`,
        operations: [{ operation: "Heavy Rough", machine_id: "GRN-1", hours: 8 }],
        due_date: "2026-03-15",
      });
    }
    const bottlenecks = capacityPlanningEngine.findBottlenecks(1);
    expect(bottlenecks.length).toBeGreaterThan(0);
    expect(bottlenecks[0].utilization_pct).toBeGreaterThan(90);
    expect(bottlenecks[0].recommendations.length).toBeGreaterThan(0);
  });

  it("runs what-if analysis", () => {
    const result = capacityPlanningEngine.whatIfJob({
      operations: [
        { machine_id: "VMC-1", hours: 10 },
        { machine_id: "LTH-1", hours: 5 },
      ],
    });
    expect(result).toHaveProperty("feasible");
    expect(result).toHaveProperty("machine_impacts");
    expect(result).toHaveProperty("earliest_start");
    expect(result).toHaveProperty("estimated_completion");
  });

  it("generates shop floor summary", () => {
    const summary = capacityPlanningEngine.shopFloorSummary();
    expect(summary.total_machines).toBeGreaterThanOrEqual(8);
    expect(summary).toHaveProperty("avg_utilization");
    expect(summary).toHaveProperty("bottleneck_count");
  });
});

// === Quality Management Engine ===
describe("QualityManagementEngine", () => {
  it("creates SPC chart with control limits", () => {
    const data = Array.from({ length: 25 }, (_, i) => ({
      timestamp: `2026-03-06T${String(8 + Math.floor(i / 5)).padStart(2, "0")}:${String((i % 5) * 12).padStart(2, "0")}:00`,
      value: 25.0 + (Math.random() - 0.5) * 0.02,
      sample_id: `S-${i + 1}`,
    }));

    const chart = qualityManagementEngine.createSPCChart({
      characteristic: "OD",
      part_number: "PN-001",
      operation: "Turning",
      nominal: 25.0,
      usl: 25.025,
      lsl: 24.975,
      data,
    });

    expect(chart.x_bar).toBeCloseTo(25.0, 1);
    expect(chart.ucl).toBeGreaterThan(chart.x_bar);
    expect(chart.lcl).toBeLessThan(chart.x_bar);
    expect(chart.cp).toBeGreaterThan(0);
    expect(chart.cpk).toBeGreaterThan(0);
  });

  it("adds calibration record", () => {
    const cal = qualityManagementEngine.addCalibration({
      equipment_id: "MIC-001",
      equipment_name: "Mitutoyo 0-1\" Micrometer",
      type: "micrometer",
      serial_number: "MIT-293-340",
      last_calibration: "2026-01-15",
      next_calibration: "2027-01-15",
      calibrated_by: "ISO Cal Lab",
      certificate_number: "CAL-2026-0042",
      accuracy: "±0.0001\"",
    });
    expect(cal.id).toMatch(/^CAL-/);
    expect(cal.status).toBe("current");
  });

  it("gets calibration dashboard", () => {
    const dashboard = qualityManagementEngine.getCalibrationDashboard();
    expect(dashboard.total).toBeGreaterThan(0);
    expect(dashboard).toHaveProperty("current");
    expect(dashboard).toHaveProperty("overdue");
  });

  it("adds material cert and traces by heat lot", () => {
    qualityManagementEngine.addMaterialCert({
      heat_lot: "HL-4140-2026-003",
      material: "AISI 4140",
      supplier: "Metals Depot",
      cert_date: "2026-02-28",
      properties: [
        { property: "Tensile Strength", value: 655, unit: "MPa", spec_min: 620, spec_max: 750, pass: true },
        { property: "Hardness", value: 28, unit: "HRC", spec_min: 25, spec_max: 32, pass: true },
      ],
      linked_jobs: ["JOB-QM-001", "JOB-QM-002"],
    });

    const trace = qualityManagementEngine.traceByHeatLot("HL-4140-2026-003");
    expect(trace.cert).toBeDefined();
    expect(trace.cert!.material).toBe("AISI 4140");
    expect(trace.linked_jobs).toContain("JOB-QM-001");
  });

  it("traces material certs by job", () => {
    const certs = qualityManagementEngine.traceByJob("JOB-QM-001");
    expect(certs.length).toBeGreaterThan(0);
  });

  it("creates and updates NCR", () => {
    const ncr = qualityManagementEngine.createNCR({
      job_id: "JOB-QM-001",
      part_number: "PN-001",
      created_at: new Date().toISOString(),
      created_by: "inspector-1",
      description: "OD out of tolerance by 0.003\"",
      severity: "major",
      category: "dimensional",
      disposition: "pending",
      cost_impact: 150,
      quantity_affected: 3,
    });
    expect(ncr.id).toMatch(/^NCR-/);
    expect(ncr.status).toBe("open");

    const updated = qualityManagementEngine.updateNCR(ncr.id, {
      disposition: "rework",
      root_cause: "Tool wear — insert not changed at recommended interval",
      corrective_action: "Added tool life counter alarm",
      status: "closed",
    });
    expect(updated.disposition).toBe("rework");
    expect(updated.status).toBe("closed");
    expect(updated.closed_at).toBeDefined();
  });

  it("generates NCR dashboard", () => {
    const dashboard = qualityManagementEngine.getNCRDashboard();
    expect(dashboard.total).toBeGreaterThan(0);
    expect(dashboard).toHaveProperty("by_category");
    expect(dashboard).toHaveProperty("by_severity");
    expect(dashboard).toHaveProperty("total_cost");
  });

  it("creates FAI", () => {
    const fai = qualityManagementEngine.createFAI({
      job_id: "JOB-QM-001",
      part_number: "PN-001",
      revision: "B",
      inspection_date: "2026-03-06",
      inspector: "qa-lead",
      characteristics: [
        { id: "C1", description: "OD", nominal: 25.0, tolerance_plus: 0.025, tolerance_minus: 0.025, actual: 25.01, unit: "mm", in_spec: true, tool_used: "Micrometer" },
        { id: "C2", description: "Length", nominal: 50.0, tolerance_plus: 0.1, tolerance_minus: 0.1, actual: 50.05, unit: "mm", in_spec: true, tool_used: "Caliper" },
      ],
    });
    expect(fai.overall_pass).toBe(true);
    expect(fai.characteristics).toHaveLength(2);
  });

  it("lists FAIs by job", () => {
    const fais = qualityManagementEngine.listFAIs("JOB-QM-001");
    expect(fais.length).toBeGreaterThan(0);
  });

  it("calculates quality KPIs", () => {
    const kpis = qualityManagementEngine.qualityKPIs();
    expect(kpis).toHaveProperty("first_pass_yield");
    expect(kpis).toHaveProperty("scrap_rate");
    expect(kpis).toHaveProperty("ncr_closure_rate");
    expect(kpis).toHaveProperty("calibration_compliance");
  });
});

// === ActualCost Enhancements ===
describe("ActualCostEngine — Enhancements", () => {
  // Use the engine via dispatcher pattern (import directly)
  let actualCostEngine: any;

  beforeEach(async () => {
    const mod = await import("../engines/ActualCostEngine.js");
    actualCostEngine = mod.actualCostEngine;
    // Setup test data
    actualCostEngine.recordEstimate("JOB-AC-001", { labor: 500, material: 300, tooling: 100, machine: 200, overhead: 100 });
    actualCostEngine.recordRevenue("JOB-AC-001", 2000);
    actualCostEngine.recordMaterialCost("JOB-AC-001", 350, 25);
    actualCostEngine.recordMachineTime("JOB-AC-001", 3, 85);
  });

  it("forecasts to complete", () => {
    const forecast = actualCostEngine.forecastToComplete("JOB-AC-001", 60);
    expect(forecast.pct_complete).toBe(60);
    expect(forecast.forecast_total).toBeGreaterThan(0);
    expect(forecast.forecast_remaining).toBeGreaterThan(0);
    expect(forecast).toHaveProperty("forecast_status");
  });

  it("generates margin alerts", () => {
    const alerts = actualCostEngine.marginAlerts(5);
    expect(alerts).toHaveProperty("alerts");
    expect(alerts).toHaveProperty("jobs_at_risk");
  });

  it("calculates cost trend", () => {
    actualCostEngine.recordEstimate("JOB-AC-002", { labor: 400, material: 200 });
    actualCostEngine.recordRevenue("JOB-AC-002", 1500);
    const trend = actualCostEngine.costTrend(["JOB-AC-001", "JOB-AC-002"]);
    expect(trend.jobs).toHaveLength(2);
    expect(trend).toHaveProperty("avg_cost");
    expect(trend).toHaveProperty("cost_trend");
    expect(["increasing", "stable", "decreasing"]).toContain(trend.cost_trend);
  });
});
