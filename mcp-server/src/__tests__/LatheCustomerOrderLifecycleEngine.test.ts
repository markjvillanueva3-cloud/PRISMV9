/**
 * LatheCustomerOrderLifecycleEngine tests — U-LTH51
 */

import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  LatheCustomerOrderLifecycleEngine,
  ORDER_STATES,
} from "../engines/LatheCustomerOrderLifecycleEngine.js";

function makeEngine(): { engine: LatheCustomerOrderLifecycleEngine; statePath: string } {
  const dir = mkdtempSync(join(tmpdir(), "lifecycle-test-"));
  const statePath = join(dir, "state.json");
  const engine = new LatheCustomerOrderLifecycleEngine(statePath);
  engine.__resetForTests();
  return { engine, statePath };
}

describe("LatheCustomerOrderLifecycleEngine — state enumeration", () => {
  it("exposes 14 distinct states", () => {
    expect(new Set(ORDER_STATES).size).toBe(14);
    expect(ORDER_STATES).toContain("draft");
    expect(ORDER_STATES).toContain("closed");
  });

  it("allowedTransitions(draft) = [quoted, cancelled]", () => {
    const { engine } = makeEngine();
    expect(engine.allowedTransitions("draft")).toEqual(["quoted", "cancelled"]);
  });

  it("closed is terminal (no outgoing transitions)", () => {
    const { engine } = makeEngine();
    expect(engine.allowedTransitions("closed")).toEqual([]);
  });
});

describe("LatheCustomerOrderLifecycleEngine — createOrder", () => {
  it("creates an order in draft state with initial audit event", () => {
    const { engine } = makeEngine();
    const order = engine.createOrder({
      order_id: "ORD-1",
      customer: "ALCOA",
      part_number: "AL-DIE-PIN",
      quantity: 10,
    });
    expect(order.state).toBe("draft");
    expect(order.customer).toBe("ALCOA");
    const audit = engine.getAuditLog("ORD-1");
    expect(audit).toHaveLength(1);
    expect(audit[0].from_state).toBeNull();
    expect(audit[0].to_state).toBe("draft");
  });

  it("rejects duplicate order_id", () => {
    const { engine } = makeEngine();
    engine.createOrder({ order_id: "ORD-1", customer: "A", part_number: "P", quantity: 1 });
    expect(() =>
      engine.createOrder({ order_id: "ORD-1", customer: "A", part_number: "P", quantity: 1 }),
    ).toThrow(/already exists/);
  });

  it("rejects empty customer", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.createOrder({ order_id: "ORD-X", customer: "", part_number: "P", quantity: 1 }),
    ).toThrow();
  });

  it("rejects zero quantity", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.createOrder({ order_id: "ORD-X", customer: "A", part_number: "P", quantity: 0 }),
    ).toThrow();
  });
});

describe("LatheCustomerOrderLifecycleEngine — transitions", () => {
  it("allows the happy path draft→quoted→accepted→scheduled→in_production→shipped→invoiced→closed", () => {
    const { engine } = makeEngine();
    engine.createOrder({ order_id: "ORD-H", customer: "ITW", part_number: "ITW-CONN", quantity: 5 });
    const path = ["quoted", "accepted", "scheduled", "in_production", "shipped", "invoiced", "closed"] as const;
    for (const to of path) {
      const after = engine.transition({ order_id: "ORD-H", to_state: to, actor: "test" });
      expect(after.state).toBe(to);
    }
    expect(engine.getAuditLog("ORD-H")).toHaveLength(path.length + 1);
  });

  it("rejects illegal transition draft → shipped", () => {
    const { engine } = makeEngine();
    engine.createOrder({ order_id: "ORD-I", customer: "A", part_number: "P", quantity: 1 });
    expect(() =>
      engine.transition({ order_id: "ORD-I", to_state: "shipped", actor: "test" }),
    ).toThrow(/invalid transition/);
  });

  it("rejects transition from terminal closed state", () => {
    const { engine } = makeEngine();
    engine.createOrder({ order_id: "ORD-T", customer: "A", part_number: "P", quantity: 1 });
    engine.transition({ order_id: "ORD-T", to_state: "cancelled", actor: "test" });
    engine.transition({ order_id: "ORD-T", to_state: "closed", actor: "test" });
    expect(() =>
      engine.transition({ order_id: "ORD-T", to_state: "draft", actor: "test" }),
    ).toThrow(/invalid transition/);
  });

  it("rejects transition on unknown order_id", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.transition({ order_id: "NOPE", to_state: "quoted", actor: "test" }),
    ).toThrow(/not found/);
  });

  it("supports on_hold → in_production return path", () => {
    const { engine } = makeEngine();
    engine.createOrder({ order_id: "ORD-H2", customer: "A", part_number: "P", quantity: 1 });
    engine.transition({ order_id: "ORD-H2", to_state: "quoted", actor: "t" });
    engine.transition({ order_id: "ORD-H2", to_state: "accepted", actor: "t" });
    engine.transition({ order_id: "ORD-H2", to_state: "scheduled", actor: "t" });
    engine.transition({ order_id: "ORD-H2", to_state: "in_production", actor: "t" });
    engine.transition({ order_id: "ORD-H2", to_state: "on_hold", actor: "t", reason: "coolant leak" });
    const after = engine.transition({ order_id: "ORD-H2", to_state: "in_production", actor: "t" });
    expect(after.state).toBe("in_production");
  });
});

describe("LatheCustomerOrderLifecycleEngine — queries", () => {
  it("listOrders filters by customer", () => {
    const { engine } = makeEngine();
    engine.createOrder({ order_id: "O1", customer: "ALCOA", part_number: "A", quantity: 1 });
    engine.createOrder({ order_id: "O2", customer: "ITW", part_number: "B", quantity: 1 });
    expect(engine.listOrders({ customer: "ALCOA" })).toHaveLength(1);
    expect(engine.listOrders({ customer: "ITW" })).toHaveLength(1);
  });

  it("pipelineSummary counts by state", () => {
    const { engine } = makeEngine();
    engine.createOrder({ order_id: "O1", customer: "A", part_number: "P", quantity: 1 });
    engine.createOrder({ order_id: "O2", customer: "B", part_number: "P", quantity: 1 });
    engine.transition({ order_id: "O2", to_state: "quoted", actor: "t" });
    const summary = engine.pipelineSummary();
    expect(summary.draft).toBe(1);
    expect(summary.quoted).toBe(1);
    expect(summary.closed).toBe(0);
  });

  it("asSummaryRows produces one row per order", () => {
    const { engine } = makeEngine();
    engine.createOrder({ order_id: "O1", customer: "A", part_number: "P", quantity: 3 });
    const rows = engine.asSummaryRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].quantity).toBe(3);
    expect(rows[0].days_in_current_state).toBeGreaterThanOrEqual(0);
  });
});

describe("LatheCustomerOrderLifecycleEngine — persistence", () => {
  it("orders survive new engine instance", () => {
    const { engine, statePath } = makeEngine();
    engine.createOrder({ order_id: "ORD-P", customer: "A", part_number: "P", quantity: 1 });
    const engine2 = new LatheCustomerOrderLifecycleEngine(statePath);
    expect(engine2.__getState().orders).toHaveLength(1);
  });

  it("persisted JSON has schemaVersion=1", () => {
    const { engine, statePath } = makeEngine();
    engine.createOrder({ order_id: "ORD-P", customer: "A", part_number: "P", quantity: 1 });
    expect(existsSync(statePath)).toBe(true);
    const parsed = JSON.parse(readFileSync(statePath, "utf-8")) as { schemaVersion: number };
    expect(parsed.schemaVersion).toBe(1);
  });
});

describe("LatheCustomerOrderLifecycleEngine — dispatcher wiring", () => {
  it("all 6 lathe_order_* actions are enum + handler + lazy import", () => {
    const src = readFileSync(
      "H:/prism/mcp-server/src/tools/dispatchers/businessDispatcher.ts",
      "utf-8",
    );
    const actions = [
      "lathe_order_create",
      "lathe_order_transition",
      "lathe_order_get",
      "lathe_order_list",
      "lathe_order_audit",
      "lathe_order_pipeline",
    ];
    for (const action of actions) {
      expect(src).toContain(`"${action}"`);
      expect(src).toMatch(new RegExp(`case "${action}"`));
    }
    expect(src).toContain('"../../engines/LatheCustomerOrderLifecycleEngine.js"');
    expect(src).toContain('case "latheOrderLifecycle"');
  });
});
