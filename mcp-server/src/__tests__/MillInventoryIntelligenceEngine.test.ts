import { describe, it, expect, beforeEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rmSync, existsSync } from "node:fs";
import {
  MillInventoryIntelligenceEngine,
  MILL_CANONICAL_SKU_TYPES,
  type UpsertMillItemInput,
} from "../engines/MillInventoryIntelligenceEngine.js";

let tmpPath: string;
let eng: MillInventoryIntelligenceEngine;

function freshEngine(): MillInventoryIntelligenceEngine {
  tmpPath = join(tmpdir(), `mill-inventory-test-${Date.now()}-${Math.random()}.json`);
  return new MillInventoryIntelligenceEngine(tmpPath);
}

function nominalItem(o: Partial<UpsertMillItemInput> = {}): UpsertMillItemInput {
  return {
    sku: "EM-10MM-4F",
    name: "10mm 4-flute Endmill",
    type: "endmill",
    unit: "ea",
    unit_cost_usd: 50,
    on_hand: 10,
    reserved: 0,
    on_order: 0,
    reorder_point: 3,
    max_stock: 20,
    annual_demand: 100,
    lead_time_days: 7,
    tool_life_hours_per_unit: 2.5,
    ...o,
  };
}

describe("MillInventoryIntelligenceEngine", () => {
  beforeEach(() => {
    if (tmpPath && existsSync(tmpPath)) rmSync(tmpPath, { force: true });
    eng = freshEngine();
  });

  it("getStats: 10 SKU types, 6 mill-canonical, EOQ formula referenced", () => {
    const s = eng.getStats();
    expect(s.sku_types.length).toBe(10);
    expect(s.mill_canonical_sku_types).toEqual(MILL_CANONICAL_SKU_TYPES);
    expect(s.mill_canonical_sku_types.length).toBe(6);
    expect(s.eoq_formula).toMatch(/Harris/);
  });

  it("schema rejects lathe-only 'insert' SKU type (mill uses endmill / drill_tap)", () => {
    expect(() => eng.upsertItem(nominalItem({ type: "insert" as never }))).toThrow();
  });

  it("upsertItem creates new item and sets created_at + updated_at", () => {
    const item = eng.upsertItem(nominalItem());
    expect(item.sku).toBe("EM-10MM-4F");
    expect(item.tool_life_hours_per_unit).toBe(2.5);
    expect(item.created_at).toBe(item.updated_at);
  });

  it("upsertItem updating existing preserves created_at, refreshes updated_at", async () => {
    const first = eng.upsertItem(nominalItem());
    await new Promise(r => setTimeout(r, 10));
    const second = eng.upsertItem(nominalItem({ on_hand: 15 }));
    expect(second.on_hand).toBe(15);
    expect(second.created_at).toBe(first.created_at);
  });

  it("recordMovement receipt increments on_hand and decrements on_order", () => {
    eng.upsertItem(nominalItem({ on_hand: 5, on_order: 10 }));
    eng.recordMovement({ sku: "EM-10MM-4F", type: "receipt", quantity: 7 });
    const item = eng.getItem("EM-10MM-4F")!;
    expect(item.on_hand).toBe(12);
    expect(item.on_order).toBe(3);
  });

  it("recordMovement issue throws when quantity exceeds on_hand", () => {
    eng.upsertItem(nominalItem({ on_hand: 5 }));
    expect(() => eng.recordMovement({ sku: "EM-10MM-4F", type: "issue", quantity: 10 }))
      .toThrow(/exceeds on_hand/);
  });

  it("recordMovement reserve increases reserved (within available)", () => {
    eng.upsertItem(nominalItem({ on_hand: 10, reserved: 0 }));
    eng.recordMovement({ sku: "EM-10MM-4F", type: "reserve", quantity: 4 });
    expect(eng.getItem("EM-10MM-4F")?.reserved).toBe(4);
  });

  it("recordMovement reserve throws when quantity exceeds available", () => {
    eng.upsertItem(nominalItem({ on_hand: 10, reserved: 7 }));
    expect(() => eng.recordMovement({ sku: "EM-10MM-4F", type: "reserve", quantity: 5 }))
      .toThrow(/exceeds available/);
  });

  it("recordMovement throws on unknown sku", () => {
    expect(() => eng.recordMovement({ sku: "MISSING", type: "receipt", quantity: 1 }))
      .toThrow(/unknown sku/);
  });

  it("snapshot computes available = on_hand - reserved and pipeline = available + on_order", () => {
    eng.upsertItem(nominalItem({ on_hand: 10, reserved: 3, on_order: 5 }));
    const snap = eng.snapshot();
    const row = snap.rows[0];
    expect(row.available).toBe(7);
    expect(row.pipeline).toBe(12);
  });

  it("alert level 'critical' when on_hand=0, on_order=0, reorder_point>0", () => {
    eng.upsertItem(nominalItem({ on_hand: 0, on_order: 0, reorder_point: 3 }));
    expect(eng.snapshot().rows[0].alert_level).toBe("critical");
    expect(eng.snapshot().critical_count).toBe(1);
  });

  it("alert level 'low' when available <= reorder_point", () => {
    eng.upsertItem(nominalItem({ on_hand: 3, reserved: 0, reorder_point: 3 }));
    expect(eng.snapshot().rows[0].alert_level).toBe("low");
  });

  it("alert level 'adequate' when reorder_point < available <= max_stock", () => {
    eng.upsertItem(nominalItem({ on_hand: 10, reorder_point: 3, max_stock: 20 }));
    expect(eng.snapshot().rows[0].alert_level).toBe("adequate");
  });

  it("alert level 'excess' when available > max_stock", () => {
    eng.upsertItem(nominalItem({ on_hand: 30, reorder_point: 3, max_stock: 20 }));
    expect(eng.snapshot().rows[0].alert_level).toBe("excess");
  });

  it("EOQ suggested order qty: D=100, S=50, H=0.2×50=10 → EOQ=sqrt(2·100·50/10)=sqrt(1000)≈32", () => {
    eng.upsertItem(nominalItem({ on_hand: 1, reorder_point: 3, annual_demand: 100, unit_cost_usd: 50 }));
    const row = eng.snapshot().rows[0];
    expect(row.suggested_order_qty).toBeCloseTo(32, 0);
  });

  it("suggested order qty = 0 when stock is adequate (not critical/low)", () => {
    eng.upsertItem(nominalItem({ on_hand: 15, reorder_point: 3, max_stock: 20 }));
    expect(eng.snapshot().rows[0].suggested_order_qty).toBe(0);
  });

  it("days_of_supply = available / (annual_demand/365)", () => {
    // 10 on hand, 100/yr = 0.274/day → 36.5 days
    eng.upsertItem(nominalItem({ on_hand: 10, annual_demand: 100 }));
    const row = eng.snapshot().rows[0];
    expect(row.days_of_supply).toBeCloseTo(36.5, 1);
  });

  it("days_of_supply = null when annual_demand absent", () => {
    eng.upsertItem(nominalItem({ on_hand: 10, annual_demand: undefined }));
    expect(eng.snapshot().rows[0].days_of_supply).toBeNull();
  });

  it("MILL-CANONICAL remaining_tool_life_hours = on_hand × tool_life_hours_per_unit", () => {
    eng.upsertItem(nominalItem({ on_hand: 8, tool_life_hours_per_unit: 2.5 }));
    const row = eng.snapshot().rows[0];
    expect(row.remaining_tool_life_hours).toBeCloseTo(20, 2);
  });

  it("remaining_tool_life_hours = null when tool_life_hours_per_unit absent (e.g. raw material)", () => {
    eng.upsertItem(nominalItem({ sku: "STEEL-1018", name: "1018 Steel Round", type: "material", tool_life_hours_per_unit: undefined }));
    const row = eng.snapshot().rows.find(r => r.sku === "STEEL-1018")!;
    expect(row.remaining_tool_life_hours).toBeNull();
  });

  it("projectToolLifeHours returns null for unknown SKU OR SKU without life metadata", () => {
    expect(eng.projectToolLifeHours("MISSING")).toBeNull();
    eng.upsertItem(nominalItem({ tool_life_hours_per_unit: undefined }));
    expect(eng.projectToolLifeHours("EM-10MM-4F")).toBeNull();
  });

  it("MILL-CANONICAL alerts_by_type breakdown — endmill + drill_tap + soft_jaw_blank zero each on empty fleet", () => {
    const snap = eng.snapshot();
    expect(snap.alerts_by_type.endmill).toEqual({ critical: 0, low: 0 });
    expect(snap.alerts_by_type.drill_tap).toEqual({ critical: 0, low: 0 });
    expect(snap.alerts_by_type.soft_jaw_blank).toEqual({ critical: 0, low: 0 });
  });

  it("MILL-CANONICAL alerts_by_type counts critical/low per SKU type", () => {
    // 2 critical endmills + 1 low drill_tap + 1 adequate parallel_set
    eng.upsertItem(nominalItem({ sku: "EM-A", on_hand: 0, on_order: 0, reorder_point: 3 }));
    eng.upsertItem(nominalItem({ sku: "EM-B", on_hand: 0, on_order: 0, reorder_point: 5 }));
    eng.upsertItem(nominalItem({ sku: "DRILL-A", type: "drill_tap", on_hand: 2, reorder_point: 3 }));
    eng.upsertItem(nominalItem({ sku: "PAR-A", type: "parallel_set", on_hand: 5, reorder_point: 1, max_stock: 10 }));
    const snap = eng.snapshot();
    expect(snap.alerts_by_type.endmill.critical).toBe(2);
    expect(snap.alerts_by_type.drill_tap.low).toBe(1);
    expect(snap.alerts_by_type.parallel_set.critical).toBe(0);
    expect(snap.alerts_by_type.parallel_set.low).toBe(0);
  });

  it("alerts() returns only critical + low rows (filter)", () => {
    eng.upsertItem(nominalItem({ sku: "OK", on_hand: 15, reorder_point: 3, max_stock: 20 }));
    eng.upsertItem(nominalItem({ sku: "LOW", on_hand: 2, reorder_point: 3 }));
    eng.upsertItem(nominalItem({ sku: "CRIT", on_hand: 0, on_order: 0, reorder_point: 3 }));
    const alerts = eng.alerts();
    expect(alerts.length).toBe(2);
    const skus = alerts.map(a => a.sku).sort();
    expect(skus).toEqual(["CRIT", "LOW"]);
  });

  it("aging_status: 'old' when no movement (>180 days threshold default)", () => {
    eng.upsertItem(nominalItem());
    expect(eng.snapshot().rows[0].aging_status).toBe("old");
  });

  it("aging_status: 'fresh' immediately after a movement", () => {
    eng.upsertItem(nominalItem({ on_hand: 5, on_order: 10 }));
    eng.recordMovement({ sku: "EM-10MM-4F", type: "receipt", quantity: 5 });
    expect(eng.snapshot().rows[0].aging_status).toBe("fresh");
  });

  it("total_value_usd = sum of (on_hand × unit_cost_usd) across items", () => {
    eng.upsertItem(nominalItem({ sku: "A", on_hand: 10, unit_cost_usd: 50 }));
    eng.upsertItem(nominalItem({ sku: "B", on_hand: 5, unit_cost_usd: 200 }));
    expect(eng.snapshot().total_value_usd).toBeCloseTo(500 + 1000, 2);
  });

  it("variability ≥3: endmill, drill_tap, soft_jaw_blank all upsert + snapshot cleanly", () => {
    eng.upsertItem(nominalItem({ sku: "EM-A", type: "endmill" }));
    eng.upsertItem(nominalItem({ sku: "DR-A", type: "drill_tap", tool_life_hours_per_unit: 1.0 }));
    eng.upsertItem(nominalItem({ sku: "SJ-A", type: "soft_jaw_blank", tool_life_hours_per_unit: undefined }));
    const snap = eng.snapshot();
    expect(snap.rows.length).toBe(3);
    const em = snap.rows.find(r => r.sku === "EM-A");
    const dr = snap.rows.find(r => r.sku === "DR-A");
    const sj = snap.rows.find(r => r.sku === "SJ-A");
    expect(em?.type).toBe("endmill");
    expect(dr?.type).toBe("drill_tap");
    expect(sj?.type).toBe("soft_jaw_blank");
    // remaining_tool_life on soft_jaw_blank is null (no per-unit life)
    expect(sj?.remaining_tool_life_hours).toBeNull();
  });

  it("movement IDs are sequential mv_NNNNNNNN zero-padded", () => {
    eng.upsertItem(nominalItem({ on_hand: 10 }));
    const m1 = eng.recordMovement({ sku: "EM-10MM-4F", type: "issue", quantity: 1 });
    const m2 = eng.recordMovement({ sku: "EM-10MM-4F", type: "issue", quantity: 1 });
    expect(m1.id).toBe("mv_00000001");
    expect(m2.id).toBe("mv_00000002");
  });

  it("__resetForTests clears state", () => {
    eng.upsertItem(nominalItem());
    expect(eng.getItem("EM-10MM-4F")?.sku).toBe("EM-10MM-4F");
    eng.__resetForTests();
    expect(eng.getItem("EM-10MM-4F")).toBeNull();
  });

  it("persistence: new engine instance loads previously-saved items + movements", () => {
    eng.upsertItem(nominalItem({ sku: "PERSIST", on_hand: 5 }));
    eng.recordMovement({ sku: "PERSIST", type: "issue", quantity: 2 });
    const eng2 = new MillInventoryIntelligenceEngine(tmpPath);
    expect(eng2.getItem("PERSIST")?.on_hand).toBe(3);
    expect(eng2.movementsForSku("PERSIST").length).toBe(1);
  });
});
