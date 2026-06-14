/**
 * shopPracticeDispatcher.playbook-extensions-wire.test.ts — U-PB-EXPAND-CAPABILITIES
 *
 * Verifies the three new playbook capability actions are fully wired into
 * prism_shop_practice: schema-map registration (behavioral), Zod accept +
 * reject paths, and end-to-end dispatcher round-trips that exercise the
 * handler → engine path against real canonical playbook data.
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

describe("shopPracticeDispatcher — playbook extensions wiring (U-PB-EXPAND)", () => {
  describe("schema-map registration (behavioral)", () => {
    it("playbook_explain schema validates a real rule_id payload", () => {
      const parsed = ACTION_SHOP_PRACTICE_SCHEMAS.playbook_explain.safeParse({ rule_id: "SEQ-001" });
      expect(parsed.success).toBe(true);
    });

    it("playbook_coverage schema accepts an empty job context", () => {
      const parsed = ACTION_SHOP_PRACTICE_SCHEMAS.playbook_coverage.safeParse({});
      expect(parsed.success).toBe(true);
    });

    it("playbook_quantitative schema accepts a full PlaybookQuery", () => {
      const parsed = ACTION_SHOP_PRACTICE_SCHEMAS.playbook_quantitative.safeParse({
        material_iso: "P",
        features: ["pocket", "thread"],
        tolerance_mm: 0.025,
        severity_min: "important",
      });
      expect(parsed.success).toBe(true);
    });
  });

  describe("schema validation", () => {
    it("playbook_explain rejects an empty rule_id (min(1))", () => {
      const parsed = ACTION_SHOP_PRACTICE_SCHEMAS.playbook_explain.safeParse({ rule_id: "" });
      expect(parsed.success).toBe(false);
    });

    it("playbook_explain rejects a missing rule_id", () => {
      const parsed = ACTION_SHOP_PRACTICE_SCHEMAS.playbook_explain.safeParse({});
      expect(parsed.success).toBe(false);
    });

    it("playbook_coverage rejects an invalid severity_min enum value", () => {
      const parsed = ACTION_SHOP_PRACTICE_SCHEMAS.playbook_coverage.safeParse({
        severity_min: "catastrophic",
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe("dispatcher round-trip", () => {
    it("round-trips playbook_explain for canonical SEQ-001 and surfaces its presence flags", async () => {
      const dispatch = makeDispatch();
      const out = unwrap(await dispatch({ action: "playbook_explain", params: { rule_id: "SEQ-001" } }));
      expect(out.success).toBe(true);
      expect(out.explanation.rule.id).toBe("SEQ-001");
      expect(out.explanation.rule.category).toBe("sequencing");
      expect(out.explanation.hasQuantitative).toBe(true);
    });

    it("round-trip playbook_explain for an unknown rule returns a structured error", async () => {
      const dispatch = makeDispatch();
      const out = unwrap(await dispatch({ action: "playbook_explain", params: { rule_id: "NOT-A-REAL-ID-9999" } }));
      expect(typeof out.error).toBe("string");
      expect(out.error).toContain("not found");
      expect(out.rule_id).toBe("NOT-A-REAL-ID-9999");
    });

    it("round-trips playbook_coverage on an empty context and returns a positive applicable set", async () => {
      const dispatch = makeDispatch();
      const out = unwrap(await dispatch({ action: "playbook_coverage", params: {} }));
      expect(out.success).toBe(true);
      expect(out.report.applicableCount).toBeGreaterThan(0);
      // bySeverity buckets sum to applicableCount — same invariant as the engine test, end-to-end.
      const sum =
        out.report.bySeverity.critical +
        out.report.bySeverity.important +
        out.report.bySeverity.recommended +
        out.report.bySeverity.tip;
      expect(sum).toBe(out.report.applicableCount);
    });

    it("round-trip playbook_coverage with a category filter populates blindSpotCategories", async () => {
      const dispatch = makeDispatch();
      const out = unwrap(
        await dispatch({ action: "playbook_coverage", params: { categories: ["sequencing"] } }),
      );
      expect(out.report.blindSpotCategories.length).toBeGreaterThan(0);
      expect(out.report.blindSpotCategories.includes("sequencing")).toBe(false);
    });

    it("round-trips playbook_quantitative on canonical data and surfaces SEQ-001", async () => {
      const dispatch = makeDispatch();
      const out = unwrap(await dispatch({ action: "playbook_quantitative", params: {} }));
      expect(out.success).toBe(true);
      expect(out.guidance.count).toBe(out.guidance.entries.length);
      expect(out.guidance.entries.some((e: { ruleId: string }) => e.ruleId === "SEQ-001")).toBe(true);
    });

    it("round-trip playbook_quantitative pct stays in [0,100] and is finite", async () => {
      const dispatch = makeDispatch();
      const out = unwrap(await dispatch({ action: "playbook_quantitative", params: {} }));
      expect(out.guidance.withQuantitativePct).toBeGreaterThanOrEqual(0);
      expect(out.guidance.withQuantitativePct).toBeLessThanOrEqual(100);
      expect(Number.isFinite(out.guidance.withQuantitativePct)).toBe(true);
    });
  });
});
