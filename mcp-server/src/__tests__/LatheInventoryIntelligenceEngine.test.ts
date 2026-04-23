/**
 * LatheInventoryIntelligenceEngine tests — U-LTH53
 */

import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LatheInventoryIntelligenceEngine } from "../engines/LatheInventoryIntelligenceEngine.js";

function makeEngine(): { engine: LatheInventoryIntelligenceEngine; statePath: string } {
  const dir = mkdtempSync(join(tmpdir(), "inv-test-"));
  const statePath = join(dir, "state.json");
  const engine = new LatheInventoryIntelligenceEngine(statePath);
  engine.__resetForTests();
  return { engine, statePath };
}

describe("LatheInventoryIntelligenceEngine — upsert + snapshot", () => {
  it("upserts a new item and surfaces it in snapshot", () => {
    const { engine } = makeEngine();
    engine.upsertItem({
      sku: "BAR-1018-40",
      name: "1018 40mm round",
      type: "material",
      unit: "kg",
      unit_cost_usd: 2.5,
      on_hand: 50,
      reorder_point: 10,
      lead_time_days: 5,
    });
    const snap = engine.snapshot();
    expect(snap.rows).toHaveLength(1);
    expect(snap.rows[0].sku).toBe("BAR-1018-40");
    expect(snap.rows[0].alert_level).toBe("adequate");
  });

  it("updates existing item on second upsert (preserves created_at)", () => {
    const { engine } = makeEngine();
    engine.upsertItem({
      sku: "BAR", name: "bar", type: "material", unit: "kg",
      unit_cost_usd: 2.5, on_hand: 50, reorder_point: 10, lead_time_days: 5,
    });
    const original = engine.getItem("BAR")!.created_at;
    engine.upsertItem({
      sku: "BAR", name: "bar", type: "material", unit: "kg",
      unit_cost_usd: 3.0, on_hand: 40, reorder_point: 10, lead_time_days: 5,
    });
    const updated = engine.getItem("BAR")!;
    expect(updated.unit_cost_usd).toBe(3.0);
    expect(updated.on_hand).toBe(40);
    expect(updated.created_at).toBe(original);
  });
});

describe("LatheInventoryIntelligenceEngine — alert levels", () => {
  function withItem(on_hand: number, reserved: number, reorder_point: number, on_order = 0, max_stock?: number) {
    const { engine } = makeEngine();
    engine.upsertItem({
      sku: "X", name: "x", type: "material", unit: "kg",
      unit_cost_usd: 1, on_hand, reserved, on_order, reorder_point, lead_time_days: 5,
      ...(max_stock !== undefined ? { max_stock } : {}),
    });
    return engine.snapshot().rows[0];
  }

  it("critical when available < 0 (over-reserved)", () => {
    expect(withItem(5, 10, 2).alert_level).toBe("critical");
  });

  it("critical when on_hand=0 and on_order=0 and reorder_point>0", () => {
    expect(withItem(0, 0, 5, 0).alert_level).toBe("critical");
  });

  it("low when available ≤ reorder_point", () => {
    expect(withItem(5, 0, 10).alert_level).toBe("low");
  });

  it("adequate when reorder_point < available ≤ max_stock", () => {
    expect(withItem(50, 0, 10, 0, 100).alert_level).toBe("adequate");
  });

  it("excess when available > max_stock", () => {
    expect(withItem(150, 0, 10, 0, 100).alert_level).toBe("excess");
  });
});

describe("LatheInventoryIntelligenceEngine — movements", () => {
  function seed() {
    const { engine, statePath } = makeEngine();
    engine.upsertItem({
      sku: "X", name: "x", type: "material", unit: "kg",
      unit_cost_usd: 1, on_hand: 100, reserved: 0, on_order: 20,
      reorder_point: 10, lead_time_days: 5,
    });
    return { engine, statePath };
  }

  it("receipt increases on_hand and reduces on_order", () => {
    const { engine } = seed();
    engine.recordMovement({ sku: "X", type: "receipt", quantity: 20 });
    const item = engine.getItem("X")!;
    expect(item.on_hand).toBe(120);
    expect(item.on_order).toBe(0);
  });

  it("issue decreases on_hand", () => {
    const { engine } = seed();
    engine.recordMovement({ sku: "X", type: "issue", quantity: 30, job_id: "J1" });
    expect(engine.getItem("X")!.on_hand).toBe(70);
  });

  it("issue exceeding on_hand throws", () => {
    const { engine } = seed();
    expect(() =>
      engine.recordMovement({ sku: "X", type: "issue", quantity: 200 }),
    ).toThrow(/exceeds on_hand/);
  });

  it("reserve increases reserved quantity", () => {
    const { engine } = seed();
    engine.recordMovement({ sku: "X", type: "reserve", quantity: 40, job_id: "J2" });
    expect(engine.getItem("X")!.reserved).toBe(40);
  });

  it("reserve exceeding available throws", () => {
    const { engine } = seed();
    expect(() =>
      engine.recordMovement({ sku: "X", type: "reserve", quantity: 200 }),
    ).toThrow(/exceeds available/);
  });

  it("unreserve releases inventory", () => {
    const { engine } = seed();
    engine.recordMovement({ sku: "X", type: "reserve", quantity: 40 });
    engine.recordMovement({ sku: "X", type: "unreserve", quantity: 20 });
    expect(engine.getItem("X")!.reserved).toBe(20);
  });

  it("adjust adds positive delta to on_hand", () => {
    const { engine } = seed();
    engine.recordMovement({ sku: "X", type: "adjust", quantity: 5, reason: "count correction" });
    expect(engine.getItem("X")!.on_hand).toBe(105);
  });

  it("rejects movement on unknown sku", () => {
    const { engine } = seed();
    expect(() =>
      engine.recordMovement({ sku: "NONE", type: "receipt", quantity: 10 }),
    ).toThrow(/unknown sku/);
  });

  it("movements appear in movementsForSku", () => {
    const { engine } = seed();
    engine.recordMovement({ sku: "X", type: "receipt", quantity: 5 });
    engine.recordMovement({ sku: "X", type: "issue", quantity: 3 });
    expect(engine.movementsForSku("X")).toHaveLength(2);
  });
});

describe("LatheInventoryIntelligenceEngine — EOQ suggestion", () => {
  it("returns positive EOQ when annual_demand + unit_cost known", () => {
    const { engine } = makeEngine();
    engine.upsertItem({
      sku: "EOQ", name: "item", type: "material", unit: "kg",
      unit_cost_usd: 10, on_hand: 0, reorder_point: 5,
      annual_demand: 1000, lead_time_days: 5,
    });
    const snap = engine.snapshot();
    expect(snap.rows[0].suggested_order_qty).toBeGreaterThan(0);
  });

  it("returns 0 when item is adequate (no suggestion)", () => {
    const { engine } = makeEngine();
    engine.upsertItem({
      sku: "EOQ", name: "item", type: "material", unit: "kg",
      unit_cost_usd: 10, on_hand: 1000, reorder_point: 5, lead_time_days: 5,
    });
    const snap = engine.snapshot();
    expect(snap.rows[0].suggested_order_qty).toBe(0);
  });
});

describe("LatheInventoryIntelligenceEngine — 3 SKU types", () => {
  it("tracks material, insert, and consumable in single snapshot", () => {
    const { engine } = makeEngine();
    engine.upsertItem({
      sku: "MAT", name: "bar", type: "material", unit: "kg",
      unit_cost_usd: 2.5, on_hand: 10, reorder_point: 5, lead_time_days: 5,
    });
    engine.upsertItem({
      sku: "INS", name: "insert", type: "insert", unit: "each",
      unit_cost_usd: 12, on_hand: 30, reorder_point: 10, lead_time_days: 3,
    });
    engine.upsertItem({
      sku: "COOL", name: "coolant", type: "consumable", unit: "gal",
      unit_cost_usd: 35, on_hand: 5, reorder_point: 2, lead_time_days: 2,
    });
    const snap = engine.snapshot();
    expect(snap.item_count).toBe(3);
    const types = snap.rows.map((r) => r.type).sort();
    expect(types).toEqual(["consumable", "insert", "material"]);
  });
});

describe("LatheInventoryIntelligenceEngine — failure modes", () => {
  it("rejects negative on_hand at upsert", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.upsertItem({
        sku: "X", name: "x", type: "material", unit: "kg",
        unit_cost_usd: 1, on_hand: -5, reorder_point: 0, lead_time_days: 5,
      }),
    ).toThrow();
  });

  it("rejects NaN unit_cost", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.upsertItem({
        sku: "X", name: "x", type: "material", unit: "kg",
        unit_cost_usd: Number.NaN, on_hand: 0, reorder_point: 0, lead_time_days: 5,
      }),
    ).toThrow();
  });

  it("rejects Infinity reorder_point", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.upsertItem({
        sku: "X", name: "x", type: "material", unit: "kg",
        unit_cost_usd: 1, on_hand: 0, reorder_point: Number.POSITIVE_INFINITY, lead_time_days: 5,
      }),
    ).toThrow();
  });

  it("rejects invalid SKU type", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.upsertItem({
        sku: "X", name: "x", type: "not-a-type" as any, unit: "kg",
        unit_cost_usd: 1, on_hand: 0, reorder_point: 0, lead_time_days: 5,
      }),
    ).toThrow();
  });
});

describe("LatheInventoryIntelligenceEngine — persistence", () => {
  it("items survive new engine instance", () => {
    const { engine, statePath } = makeEngine();
    engine.upsertItem({
      sku: "X", name: "x", type: "material", unit: "kg",
      unit_cost_usd: 1, on_hand: 50, reorder_point: 10, lead_time_days: 5,
    });
    expect(existsSync(statePath)).toBe(true);
    const engine2 = new LatheInventoryIntelligenceEngine(statePath);
    expect(engine2.__getState().items).toHaveLength(1);
  });

  it("persisted JSON has schemaVersion=1", () => {
    const { engine, statePath } = makeEngine();
    engine.upsertItem({
      sku: "X", name: "x", type: "material", unit: "kg",
      unit_cost_usd: 1, on_hand: 50, reorder_point: 10, lead_time_days: 5,
    });
    const parsed = JSON.parse(readFileSync(statePath, "utf-8")) as { schemaVersion: number };
    expect(parsed.schemaVersion).toBe(1);
  });
});

describe("LatheInventoryIntelligenceEngine — dispatcher wiring", () => {
  it("all 5 lathe_inv_* actions wired with handlers + lazy import", () => {
    const src = readFileSync(
      "H:/prism/mcp-server/src/tools/dispatchers/businessDispatcher.ts",
      "utf-8",
    );
    const actions = [
      "lathe_inv_upsert",
      "lathe_inv_movement",
      "lathe_inv_snapshot",
      "lathe_inv_alerts",
      "lathe_inv_get",
    ];
    for (const action of actions) {
      expect(src).toContain(`"${action}"`);
      expect(src).toMatch(new RegExp(`case "${action}"`));
    }
    expect(src).toContain('"../../engines/LatheInventoryIntelligenceEngine.js"');
    expect(src).toContain('case "latheInventory"');
  });
});
