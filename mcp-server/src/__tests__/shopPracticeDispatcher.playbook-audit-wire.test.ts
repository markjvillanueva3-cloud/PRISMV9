/**
 * shopPracticeDispatcher.playbook-audit-wire.test.ts — U-PB-INTEGRITY-AUDIT
 *
 * Verifies the playbook_audit action is fully wired into prism_shop_practice:
 * schema-map registration (behavioral), and an in-process dispatcher
 * round-trip that exercises the handler → MachiningPlaybookEngine.auditIntegrity
 * path against the real canonical 296-rule corpus.
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

describe("shopPracticeDispatcher — playbook_audit wiring (U-PB-INTEGRITY-AUDIT)", () => {
  it("playbook_audit schema is registered and accepts an empty payload", () => {
    const parsed = ACTION_SHOP_PRACTICE_SCHEMAS.playbook_audit.safeParse({});
    expect(parsed.success).toBe(true);
  });

  it("round-trips playbook_audit and returns a structurally consistent report", async () => {
    const dispatch = makeDispatch();
    const out = unwrap(await dispatch({ action: "playbook_audit", params: {} }));
    expect(out.success).toBe(true);
    expect(out.report.issueCount).toBe(out.report.issues.length);
    // byType counts partition issueCount — same invariant as the engine test, end-to-end.
    const sum = Object.values(out.report.byType as Record<string, number>).reduce((a, b) => a + b, 0);
    expect(sum).toBe(out.report.issueCount);
  });

  it("round-trip report's healthy flag is consistent with its issueCount", async () => {
    const dispatch = makeDispatch();
    const out = unwrap(await dispatch({ action: "playbook_audit", params: {} }));
    expect(out.report.healthy).toBe(out.report.issueCount === 0);
  });

  it("round-trip report covers the full canonical corpus (totalRules > 0)", async () => {
    const dispatch = makeDispatch();
    const out = unwrap(await dispatch({ action: "playbook_audit", params: {} }));
    expect(out.report.totalRules).toBeGreaterThan(0);
    expect(out.report.uniqueRuleIds).toBeLessThanOrEqual(out.report.totalRules);
  });

  it("round-trip is deterministic — two dispatches yield identical issue lists", async () => {
    const dispatch = makeDispatch();
    const a = unwrap(await dispatch({ action: "playbook_audit", params: {} }));
    const b = unwrap(await dispatch({ action: "playbook_audit", params: {} }));
    expect(JSON.stringify(a.report.issues)).toBe(JSON.stringify(b.report.issues));
  });
});
