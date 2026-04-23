/**
 * LatheERPOrchestratorEngine tests — U-LTH57
 *
 * End-to-end pipeline: print → quote → order → schedule → PO → reserve.
 * Exercises all 6 dependent engines through a single orchestrator call.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { LatheERPOrchestratorEngine } from "../engines/LatheERPOrchestratorEngine.js";
import { latheCustomerOrderLifecycleEngine } from "../engines/LatheCustomerOrderLifecycleEngine.js";
import { latheInventoryIntelligenceEngine } from "../engines/LatheInventoryIntelligenceEngine.js";

// --- Fixture builders ---

function makeSequence() {
  return {
    plan_id: "SEQ-T",
    source_strategy_plan_id: "STRAT-T",
    operations: [],
    setup_count: 1,
    tool_change_count: 3,
    total_cycle_time_sec: 420,
    total_tool_change_time_sec: 30,
    initial_stock: { od_mm: 40, id_mm: 0, length_mm: 80, remaining_volume_cm3: 100, setup_id: "OP10" },
    final_stock: { od_mm: 30, id_mm: 0, length_mm: 78, remaining_volume_cm3: 55, setup_id: "OP10" },
    violations: [],
    valid: true,
    timestamp: new Date().toISOString(),
  };
}

function makeToolpath() {
  return {
    program_id: "TP-T",
    source_sequence_plan_id: "SEQ-T",
    operations: [
      {
        op_number: 1, featureId: "F1", featureType: "face", strategy_id: "rough_face", tool_id: "T01",
        cutting_speed_m_min: 200, spindle_rpm: 1600, feed_mm_rev: 0.3, feed_mm_min: 480,
        depth_of_cut_mm: 2.0, number_of_passes: 2, moves: [],
        cycle_time_sec: 120, cutting_force_n: 850, material_removal_rate_cm3_min: 14.2, warnings: [],
      },
    ],
    total_cycle_time_sec: 420, total_rapid_time_sec: 20, total_feed_time_sec: 400,
    total_cutting_volume_cm3: 45,
    gcode_preview: "O0001\nM30",
    machine_envelope_check: { max_x_mm: 40, max_z_mm: 80, min_x_mm: 0, min_z_mm: 0, within_envelope: true },
    warnings: [],
    timestamp: new Date().toISOString(),
  };
}

function makeMaterial() {
  return { name: "1018", iso_group: "P" };
}

function makeMachines() {
  return [
    {
      id: "M1", name: "Okuma LB3000", controller: "okuma_osp",
      max_od_mm: 350, max_z_mm: 1000, max_spindle_bore_mm: 65,
      has_live_tool: false, has_sub_spindle: false, has_y_axis: false,
    },
  ];
}

function uniqueOrderId(): string {
  return `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

beforeEach(() => {
  // Use test sandboxes to avoid cross-test state leakage
  latheCustomerOrderLifecycleEngine.__resetForTests();
  latheInventoryIntelligenceEngine.__resetForTests();
});

describe("LatheERPOrchestratorEngine — full pipeline", () => {
  it("runs all 8 stages and returns consolidated report", () => {
    const engine = new LatheERPOrchestratorEngine();
    const orderId = uniqueOrderId();
    const report = engine.erpFull({
      sequence_plan: makeSequence(),
      toolpath: makeToolpath(),
      material: makeMaterial(),
      quote_input: {
        quantity: 10,
        customer: "ALCOA",
        part_number: "AL-DIE-PIN",
      },
      order_id: orderId,
      due_date_iso: "2026-05-15T00:00:00.000Z",
      priority: 80,
      machines: makeMachines(),
    });

    expect(report.order_id).toBe(orderId);
    expect(report.quote_id).toMatch(/^QUOTE-/);
    expect(report.job_id).toBe(orderId);
    expect(report.quote_unit_price_usd).toBeGreaterThan(0);
    expect(report.quote_lot_price_usd).toBeCloseTo(report.quote_unit_price_usd * 10, 1);
    expect(report.schedule_machine_id).toBe("M1");
    expect(report.schedule_start_iso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(report.final_order_state).toBe("scheduled");
    expect(report.po_count).toBeGreaterThan(0);
    expect(report.po_total_usd).toBeGreaterThan(0);
    expect(report.warnings).toEqual([]);
  });

  it("order moves through draft → quoted → accepted → scheduled", () => {
    const engine = new LatheERPOrchestratorEngine();
    const orderId = uniqueOrderId();
    engine.erpFull({
      sequence_plan: makeSequence(),
      toolpath: makeToolpath(),
      material: makeMaterial(),
      quote_input: { quantity: 5, customer: "ITW", part_number: "ITW-CONN" },
      order_id: orderId,
      due_date_iso: "2026-05-20T00:00:00.000Z",
      machines: makeMachines(),
    });
    const audit = latheCustomerOrderLifecycleEngine.getAuditLog(orderId);
    const states = audit.map((e) => e.to_state);
    expect(states).toEqual(["draft", "quoted", "accepted", "scheduled"]);
  });

  it("reserves material from inventory when sku provided", () => {
    const engine = new LatheERPOrchestratorEngine();
    latheInventoryIntelligenceEngine.upsertItem({
      sku: "BAR-1018-40", name: "1018 40mm round", type: "material", unit: "kg",
      unit_cost_usd: 2.5, on_hand: 100, reorder_point: 10, lead_time_days: 5,
    });
    const orderId = uniqueOrderId();
    const report = engine.erpFull({
      sequence_plan: makeSequence(),
      toolpath: makeToolpath(),
      material: makeMaterial(),
      quote_input: { quantity: 10, customer: "ALCOA", part_number: "AL-P" },
      order_id: orderId,
      due_date_iso: "2026-05-15T00:00:00.000Z",
      machines: makeMachines(),
      reserve_material_sku: "BAR-1018-40",
    });
    expect(report.reserved_material_kg).not.toBeNull();
    expect(report.reserved_material_kg!).toBeGreaterThan(0);
    const item = latheInventoryIntelligenceEngine.getItem("BAR-1018-40")!;
    expect(item.reserved).toBeGreaterThan(0);
  });

  it("surfaces warning when reservation fails (insufficient on-hand)", () => {
    const engine = new LatheERPOrchestratorEngine();
    latheInventoryIntelligenceEngine.upsertItem({
      sku: "BAR-SMALL", name: "tiny stock", type: "material", unit: "kg",
      unit_cost_usd: 2.5, on_hand: 0.5, reorder_point: 10, lead_time_days: 5,
    });
    const orderId = uniqueOrderId();
    const report = engine.erpFull({
      sequence_plan: makeSequence(),
      toolpath: makeToolpath(),
      material: makeMaterial(),
      quote_input: { quantity: 10, customer: "ALCOA", part_number: "AL-P" },
      order_id: orderId,
      due_date_iso: "2026-05-15T00:00:00.000Z",
      machines: makeMachines(),
      reserve_material_sku: "BAR-SMALL",
    });
    expect(report.reserved_material_kg).toBeNull();
    expect(report.warnings.some((w) => w.includes("reservation skipped"))).toBe(true);
  });
});

describe("LatheERPOrchestratorEngine — failure modes", () => {
  it("rejects duplicate order_id (lifecycle guard)", () => {
    const engine = new LatheERPOrchestratorEngine();
    const orderId = uniqueOrderId();
    const input = {
      sequence_plan: makeSequence(),
      toolpath: makeToolpath(),
      material: makeMaterial(),
      quote_input: { quantity: 1, customer: "X", part_number: "Y" },
      order_id: orderId,
      due_date_iso: "2026-05-15T00:00:00.000Z",
      machines: makeMachines(),
    };
    engine.erpFull(input);
    expect(() => engine.erpFull(input)).toThrow(/already exists/);
  });

  it("rejects zero quantity", () => {
    const engine = new LatheERPOrchestratorEngine();
    expect(() =>
      engine.erpFull({
        sequence_plan: makeSequence(),
        toolpath: makeToolpath(),
        material: makeMaterial(),
        quote_input: { quantity: 0, customer: "X", part_number: "Y" },
        order_id: uniqueOrderId(),
        due_date_iso: "2026-05-15T00:00:00.000Z",
        machines: makeMachines(),
      }),
    ).toThrow();
  });

  it("rejects empty machines list", () => {
    const engine = new LatheERPOrchestratorEngine();
    expect(() =>
      engine.erpFull({
        sequence_plan: makeSequence(),
        toolpath: makeToolpath(),
        material: makeMaterial(),
        quote_input: { quantity: 1, customer: "X", part_number: "Y" },
        order_id: uniqueOrderId(),
        due_date_iso: "2026-05-15T00:00:00.000Z",
        machines: [],
      }),
    ).toThrow();
  });

  it("rejects bad due_date ISO string", () => {
    const engine = new LatheERPOrchestratorEngine();
    expect(() =>
      engine.erpFull({
        sequence_plan: makeSequence(),
        toolpath: makeToolpath(),
        material: makeMaterial(),
        quote_input: { quantity: 1, customer: "X", part_number: "Y" },
        order_id: uniqueOrderId(),
        due_date_iso: "not-a-date",
        machines: makeMachines(),
      }),
    ).toThrow();
  });
});

describe("LatheERPOrchestratorEngine — algebraic invariants", () => {
  it("lot price == unit price × quantity across 3 quantities (10/25/100)", () => {
    const engine = new LatheERPOrchestratorEngine();
    const quantities = [10, 25, 100];
    for (const qty of quantities) {
      const report = engine.erpFull({
        sequence_plan: makeSequence(),
        toolpath: makeToolpath(),
        material: makeMaterial(),
        quote_input: { quantity: qty, customer: `C-${qty}`, part_number: `P-${qty}` },
        order_id: uniqueOrderId(),
        due_date_iso: "2026-05-15T00:00:00.000Z",
        machines: makeMachines(),
      });
      // Allow ±$0.02 for cent rounding (unit price rounds before multiplication)
      expect(Math.abs(report.quote_lot_price_usd - report.quote_unit_price_usd * qty)).toBeLessThanOrEqual(0.02);
    }
  });
});

describe("LatheERPOrchestratorEngine — dispatcher wiring", () => {
  it("lathe_erp_full action wired with handler and lazy import", () => {
    const src = readFileSync(
      "H:/prism/mcp-server/src/tools/dispatchers/businessDispatcher.ts",
      "utf-8",
    );
    expect(src).toContain('"lathe_erp_full"');
    expect(src).toMatch(/case "lathe_erp_full"/);
    expect(src).toContain('"../../engines/LatheERPOrchestratorEngine.js"');
    expect(src).toContain('case "latheERPOrchestrator"');
  });
});
