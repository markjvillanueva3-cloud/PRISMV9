/**
 * shopPracticeDispatcher.playbook-conflicts-ranked-wire.test.ts — U-PB-CONFLICT-RANK
 *
 * Verifies the playbook_conflicts_ranked action is fully wired into
 * prism_shop_practice: schema registration + dispatcher round-trip exercising
 * the handler → MachiningPlaybookEngine.rankConflicts path against the real
 * canonical rule corpus.
 */
import { describe, it, expect } from "vitest";
import { registerShopPracticeDispatcher } from "../tools/dispatchers/shopPracticeDispatcher.js";
import { ACTION_SHOP_PRACTICE_SCHEMAS } from "../schemas/shopPracticeActionSchemas.js";

type DispatchFn = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function makeDispatch(): DispatchFn {
  let captured: DispatchFn | null = null;
  const fakeServer = {
    tool: (_name: string, _desc: string, _schema: unknown, handler: DispatchFn) => {
      captured = handler;
    },
  };
  registerShopPracticeDispatcher(fakeServer as unknown as Parameters<typeof registerShopPracticeDispatcher>[0]);
  if (!captured) throw new Error("shopPracticeDispatcher did not register a tool handler");
  return captured;
}

function unwrap(res: any): any {
  expect(res?.content?.[0]?.type).toBe("text");
  return JSON.parse(res.content[0].text);
}

describe("shopPracticeDispatcher — playbook_conflicts_ranked wiring (U-PB-CONFLICT-RANK)", () => {
  it("playbook_conflicts_ranked schema is registered and accepts an empty payload", () => {
    const parsed = ACTION_SHOP_PRACTICE_SCHEMAS.playbook_conflicts_ranked.safeParse({});
    expect(parsed.success).toBe(true);
  });

  it("round-trips playbook_conflicts_ranked and returns a structurally consistent report", async () => {
    const dispatch = makeDispatch();
    const out = unwrap(await dispatch({ action: "playbook_conflicts_ranked", params: {} }));
    expect(out.success).toBe(true);
    expect(out.report.ranked.length).toBe(out.report.conflictCount);
    const buckets = out.report.byPriority as Record<string, number>;
    const sum = (buckets.urgent ?? 0) + (buckets.high ?? 0) + (buckets.medium ?? 0) + (buckets.low ?? 0);
    expect(sum).toBe(out.report.conflictCount);
  });

  it("round-trip report's ranked array is sorted by priorityScore DESC", async () => {
    const dispatch = makeDispatch();
    const out = unwrap(await dispatch({ action: "playbook_conflicts_ranked", params: {} }));
    const ranked = out.report.ranked as Array<{ priorityScore: number }>;
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].priorityScore).toBeGreaterThanOrEqual(ranked[i].priorityScore);
    }
  });

  it("every priority bucket label in the report is one of {urgent,high,medium,low}", async () => {
    const dispatch = makeDispatch();
    const out = unwrap(await dispatch({ action: "playbook_conflicts_ranked", params: {} }));
    const allowed = new Set(["urgent", "high", "medium", "low"]);
    for (const x of out.report.ranked as Array<{ priority: string }>) {
      expect(allowed.has(x.priority)).toBe(true);
    }
  });

  it("round-trip is deterministic — two dispatches yield identical ranked lists", async () => {
    const dispatch = makeDispatch();
    const a = unwrap(await dispatch({ action: "playbook_conflicts_ranked", params: {} }));
    const b = unwrap(await dispatch({ action: "playbook_conflicts_ranked", params: {} }));
    expect(JSON.stringify(a.report.ranked)).toBe(JSON.stringify(b.report.ranked));
  });
});
