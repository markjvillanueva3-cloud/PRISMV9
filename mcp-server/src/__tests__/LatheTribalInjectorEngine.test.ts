/**
 * LatheTribalInjectorEngine Test Suite
 * ======================================
 *
 * LATHE-AWARE-HARDEN MS8 U-LAT56 — Validates injection scoring, audit
 * trail, and downstream hook fan-out.
 *
 * @milestone LATHE-AWARE-HARDEN MS8
 * @unit U-LAT56
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  latheTribalInjectorEngine,
  type TribalTip,
  type InjectionContext,
  type InjectionResult,
} from "../engines/LatheTribalInjectorEngine.js";

function makeTip(overrides: Partial<TribalTip> = {}): TribalTip {
  return {
    id: overrides.id ?? `tip_${Math.random().toString(36).slice(2, 8)}`,
    content: overrides.content ?? "Use flood coolant on 4140 roughing for chip evacuation",
    tags: overrides.tags ?? ["4140", "roughing", "coolant"],
    priority: overrides.priority ?? 5,
    confidence: overrides.confidence ?? 0.8,
    ...overrides,
  };
}

beforeEach(() => {
  latheTribalInjectorEngine.clearAuditLog();
});

describe("LatheTribalInjectorEngine", () => {
  // ── inject() basic behavior ──────────────────────────────────────────

  describe("inject()", () => {
    it("injects relevant tips for speed_feed target", () => {
      const tips = [
        makeTip({ content: "4140 runs well at 250 SFM with carbide" }),
        makeTip({ content: "Flood coolant reduces chip welding on 4140" }),
      ];
      const ctx: InjectionContext = { material: "4140", operation: "roughing" };
      const result = latheTribalInjectorEngine.inject("speed_feed", tips, ctx);
      expect(result.target).toBe("speed_feed");
      expect(result.injected.length).toBeGreaterThan(0);
    });

    it("skips tips below minRelevance threshold", () => {
      const tips = [
        makeTip({ content: "totally unrelated tip about aerospace", tags: [] }),
      ];
      const ctx: InjectionContext = { material: "4140" };
      const result = latheTribalInjectorEngine.inject("speed_feed", tips, ctx, {
        minRelevance: 0.5,
      });
      expect(result.injected.length).toBe(0);
    });

    it("limits results to the specified limit", () => {
      const tips = Array.from({ length: 20 }, (_, i) =>
        makeTip({ id: `t${i}`, content: `tip ${i} about 4140 roughing` })
      );
      const ctx: InjectionContext = { material: "4140", operation: "roughing" };
      const result = latheTribalInjectorEngine.inject("speed_feed", tips, ctx, {
        limit: 3,
      });
      expect(result.injected.length).toBe(3);
    });

    it("sorts injected tips by relevance descending", () => {
      const tips = [
        makeTip({ content: "general tip", priority: 1 }),
        makeTip({ content: "4140 specific tip roughing", priority: 9 }),
      ];
      const ctx: InjectionContext = { material: "4140", operation: "roughing" };
      const result = latheTribalInjectorEngine.inject("speed_feed", tips, ctx);
      for (let i = 1; i < result.injected.length; i++) {
        expect(result.injected[i]!.relevance_score).toBeLessThanOrEqual(
          result.injected[i - 1]!.relevance_score
        );
      }
    });

    it("boosts customer-match score", () => {
      const alcoaTip = makeTip({
        content: "standard roughing",
        source_customer: "ALCOA",
      });
      const otherTip = makeTip({
        content: "standard roughing",
        source_customer: "OTHER",
      });
      const ctx: InjectionContext = {
        material: "4140",
        operation: "roughing",
        customer: "ALCOA",
      };
      const result = latheTribalInjectorEngine.inject("speed_feed", [alcoaTip, otherTip], ctx);
      expect(result.injected[0]?.tip.source_customer).toBe("ALCOA");
    });

    it("produces target-specific recommendation hints", () => {
      const tips = [makeTip({ content: "coolant tip for 4140 roughing" })];
      const ctx: InjectionContext = { material: "4140", operation: "roughing" };

      const sf = latheTribalInjectorEngine.inject("speed_feed", tips, ctx);
      const pp = latheTribalInjectorEngine.inject("post_processor", tips, ctx);
      const pa = latheTribalInjectorEngine.inject("program_assembler", tips, ctx);
      const qe = latheTribalInjectorEngine.inject("quote_estimator", tips, ctx);

      expect(sf.injected[0]?.recommendation_hint).toMatch(/Consider/);
      expect(pp.injected[0]?.recommendation_hint).toMatch(/Post comment/);
      expect(pa.injected[0]?.recommendation_hint).toMatch(/Program hint/);
      expect(qe.injected[0]?.recommendation_hint).toMatch(/Quote note/);
    });

    it("reports total_tips_considered vs total_tips_injected", () => {
      const tips = Array.from({ length: 10 }, (_, i) =>
        makeTip({ id: `t${i}`, content: i < 3 ? "4140 roughing tip" : "unrelated" })
      );
      const ctx: InjectionContext = { material: "4140", operation: "roughing" };
      const result = latheTribalInjectorEngine.inject("speed_feed", tips, ctx);
      expect(result.total_tips_considered).toBe(10);
      expect(result.total_tips_injected).toBeLessThanOrEqual(10);
    });

    it("returns empty injection for empty tip list", () => {
      const result = latheTribalInjectorEngine.inject("speed_feed", [], {});
      expect(result.injected.length).toBe(0);
      expect(result.total_tips_considered).toBe(0);
    });

    it("populates matched_on with context fields that contributed", () => {
      const tips = [makeTip({ content: "4140 roughing with carbide" })];
      const ctx: InjectionContext = { material: "4140", operation: "roughing" };
      const result = latheTribalInjectorEngine.inject("speed_feed", tips, ctx);
      expect(result.injected[0]?.matched_on.length).toBeGreaterThan(0);
    });
  });

  // ── injectAll() ──────────────────────────────────────────────────────

  describe("injectAll()", () => {
    it("produces results for all 4 targets", () => {
      const tips = [makeTip({ content: "4140 roughing" })];
      const ctx: InjectionContext = { material: "4140", operation: "roughing" };
      const all = latheTribalInjectorEngine.injectAll(tips, ctx);
      expect(Object.keys(all).sort()).toEqual(
        ["post_processor", "program_assembler", "quote_estimator", "speed_feed"].sort()
      );
    });
  });

  // ── Audit trail ──────────────────────────────────────────────────────

  describe("audit log", () => {
    it("records each injection in the audit log", () => {
      const tips = [makeTip({ content: "4140 roughing" })];
      const ctx: InjectionContext = { material: "4140", operation: "roughing" };
      latheTribalInjectorEngine.inject("speed_feed", tips, ctx);
      const log = latheTribalInjectorEngine.getAuditLog();
      expect(log.length).toBeGreaterThan(0);
      expect(log[log.length - 1]!.target).toBe("speed_feed");
    });

    it("filters audit log by target", () => {
      const tips = [makeTip({ content: "4140 roughing" })];
      const ctx: InjectionContext = { material: "4140", operation: "roughing" };
      latheTribalInjectorEngine.inject("speed_feed", tips, ctx);
      latheTribalInjectorEngine.inject("post_processor", tips, ctx);
      const sfLog = latheTribalInjectorEngine.getAuditLog("speed_feed");
      expect(sfLog.every((e) => e.target === "speed_feed")).toBe(true);
    });

    it("clearAuditLog empties the log", () => {
      const tips = [makeTip({ content: "4140 roughing" })];
      latheTribalInjectorEngine.inject("speed_feed", tips, { material: "4140" });
      latheTribalInjectorEngine.clearAuditLog();
      expect(latheTribalInjectorEngine.getAuditLog().length).toBe(0);
    });
  });

  // ── Shared-knowledge hooks ───────────────────────────────────────────

  describe("registerHook()", () => {
    it("invokes the hook after injection into the target", () => {
      let captured: InjectionResult | null = null;
      latheTribalInjectorEngine.registerHook({
        target: "speed_feed",
        onInjection: (r) => {
          captured = r;
        },
      });
      const tips = [makeTip({ content: "4140 roughing" })];
      latheTribalInjectorEngine.inject("speed_feed", tips, {
        material: "4140",
        operation: "roughing",
      });
      expect(captured).not.toBeNull();
      expect(captured!.target).toBe("speed_feed");
    });

    it("does not invoke hooks for other targets", () => {
      let fired = false;
      latheTribalInjectorEngine.registerHook({
        target: "post_processor",
        onInjection: () => {
          fired = true;
        },
      });
      latheTribalInjectorEngine.inject("speed_feed", [makeTip()], { material: "4140" });
      expect(fired).toBe(false);
    });
  });

  // ── getStats() ────────────────────────────────────────────────────────

  describe("getStats()", () => {
    it("reports 4 supported targets", () => {
      const stats = latheTribalInjectorEngine.getStats();
      expect(stats.targets_supported).toBe(4);
    });
  });
});
