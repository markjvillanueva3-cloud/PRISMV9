/**
 * shopPracticeDispatcher.playbook-conflicts-wire.test.ts — U-PB-CONFLICT-DETECT
 *
 * Verifies the playbook_conflicts action is fully wired into prism_shop_practice:
 * schema-map registration (behavioral), and an in-process dispatcher round-trip
 * that exercises the handler → MachiningPlaybookEngine.detectConflicts path
 * against the real canonical rule corpus.
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

describe("shopPracticeDispatcher — playbook_conflicts wiring (U-PB-CONFLICT-DETECT)", () => {
  it("playbook_conflicts schema is registered and accepts an empty payload", () => {
    const parsed = ACTION_SHOP_PRACTICE_SCHEMAS.playbook_conflicts.safeParse({});
    expect(parsed.success).toBe(true);
  });

  it("round-trips playbook_conflicts and returns a structurally consistent report", async () => {
    const dispatch = makeDispatch();
    const out = unwrap(await dispatch({ action: "playbook_conflicts", params: {} }));
    expect(out.success).toBe(true);
    expect(out.report.conflictCount).toBe(out.report.conflicts.length);
    // byParameter counts partition conflictCount — same invariant as the engine test, end-to-end.
    const sum = Object.values(out.report.byParameter as Record<string, number>).reduce((a, b) => a + b, 0);
    expect(sum).toBe(out.report.conflictCount);
    expect(out.report.method).toBe("lexicon-cooccurrence");
  });

  it("round-trip report's conflictFree flag is consistent with its conflictCount", async () => {
    const dispatch = makeDispatch();
    const out = unwrap(await dispatch({ action: "playbook_conflicts", params: {} }));
    expect(out.report.conflictFree).toBe(out.report.conflictCount === 0);
  });

  it("round-trip report covers the full canonical corpus (totalRules > 0)", async () => {
    const dispatch = makeDispatch();
    const out = unwrap(await dispatch({ action: "playbook_conflicts", params: {} }));
    expect(out.report.totalRules).toBeGreaterThan(0);
    const distinctPairs = new Set(
      (out.report.conflicts as Array<{ ruleIdA: string; ruleIdB: string }>).map(
        (c) => `${c.ruleIdA} ${c.ruleIdB}`,
      ),
    );
    expect(distinctPairs.size).toBeLessThanOrEqual(out.report.pairsEvaluated);
  });

  it("round-trip is deterministic — two dispatches yield identical conflict lists", async () => {
    const dispatch = makeDispatch();
    const a = unwrap(await dispatch({ action: "playbook_conflicts", params: {} }));
    const b = unwrap(await dispatch({ action: "playbook_conflicts", params: {} }));
    expect(JSON.stringify(a.report.conflicts)).toBe(JSON.stringify(b.report.conflicts));
  });
});
