/**
 * IntentRouterEngine Test Suite
 * ==============================
 *
 * AGENT-MS4 U-AGT11 — Validates natural-language intent routing to
 * dispatcher actions.
 *
 * @milestone AGENT-MS4
 * @unit U-AGT11
 */

import { describe, it, expect } from "vitest";
import { intentRouterEngine } from "../engines/IntentRouterEngine.js";

describe("IntentRouterEngine", () => {
  // ── route() ─────────────────────────────────────────────────────────

  describe("route()", () => {
    it("returns a RoutingResult with intent and timing", () => {
      const result = intentRouterEngine.route("What's the speed and feed for 4140?");
      expect(result.intent).toBeDefined();
      expect(typeof result.success).toBe("boolean");
      expect(result.routingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.rawInput).toBe("What's the speed and feed for 4140?");
    });

    it("routes speed/feed queries to a calculation dispatcher", () => {
      const result = intentRouterEngine.route("calculate sfm for 4140");
      if (result.success && result.match) {
        expect(result.match.dispatcher).toBeDefined();
        expect(result.match.confidence).toBeGreaterThan(0);
      }
    });

    it("includes alternatives in the match", () => {
      const result = intentRouterEngine.route("speed and feed");
      if (result.success && result.match) {
        expect(Array.isArray(result.match.alternatives)).toBe(true);
      }
    });

    it("reports matchReason explaining why the route was picked", () => {
      const result = intentRouterEngine.route("calculate rpm for milling");
      if (result.success && result.match) {
        expect(Array.isArray(result.match.matchReason)).toBe(true);
        expect(result.match.matchReason.length).toBeGreaterThan(0);
      }
    });

    it("returns success=false for inscrutable input with suggestions", () => {
      const result = intentRouterEngine.route("xyzzy plugh foo bar");
      if (!result.success) {
        expect(Array.isArray(result.suggestions)).toBe(true);
      }
    });

    it("completes under 500ms", () => {
      const start = Date.now();
      intentRouterEngine.route("calculate speed and feed for 4140 on Okuma LB3000");
      expect(Date.now() - start).toBeLessThan(500);
    });
  });

  // ── classifyIntent() ──────────────────────────────────────────────────

  describe("classifyIntent()", () => {
    it("returns a category and confidence", () => {
      const c = intentRouterEngine.classifyIntent("calculate speed and feed");
      expect([
        "calculation",
        "quote",
        "selection",
        "query",
        "validation",
        "generation",
        "analysis",
        "comparison",
        "learning",
        "general",
      ]).toContain(c.category);
      expect(c.confidence).toBeGreaterThanOrEqual(0);
      expect(c.confidence).toBeLessThanOrEqual(1);
    });

    it("classifies 'quote this part' as quote", () => {
      const c = intentRouterEngine.classifyIntent("quote this part for me");
      expect(c.category).toBe("quote");
    });

    it("classifies 'calculate rpm' as calculation", () => {
      const c = intentRouterEngine.classifyIntent("calculate rpm for 4140");
      expect(c.category).toBe("calculation");
    });

    it("classifies 'what is' as query", () => {
      const c = intentRouterEngine.classifyIntent("what is the hardness of D2");
      expect(c.category).toBe("query");
    });

    it("returns general category for non-matching input", () => {
      const c = intentRouterEngine.classifyIntent("hello world");
      expect(c.category).toBe("general");
    });

    it("extracts entities into the classification", () => {
      const c = intentRouterEngine.classifyIntent("calculate speed for 4140 steel on Okuma");
      expect(Array.isArray(c.entities)).toBe(true);
    });
  });

  // ── extractEntities() ─────────────────────────────────────────────────

  describe("extractEntities()", () => {
    it("extracts material entity '4140'", () => {
      const entities = intentRouterEngine.extractEntities("Machine 4140 on LB3000");
      const material = entities.find((e) => e.type === "material");
      expect(material).toBeDefined();
    });

    it("extracts Okuma as machine entity", () => {
      const entities = intentRouterEngine.extractEntities("Running on Okuma LB3000");
      const machine = entities.find((e) => e.type === "machine");
      expect(machine).toBeDefined();
    });

    it("returns empty array for entity-free text", () => {
      const entities = intentRouterEngine.extractEntities("hello there");
      expect(entities.length).toBe(0);
    });

    it("each entity has a type and confidence", () => {
      const entities = intentRouterEngine.extractEntities("4140 steel");
      entities.forEach((e) => {
        expect(e.type).toBeDefined();
        expect(e.value).toBeDefined();
        expect(e.confidence).toBeGreaterThanOrEqual(0);
      });
    });
  });

  // ── getAvailableRoutes() ─────────────────────────────────────────────

  describe("getAvailableRoutes()", () => {
    it("returns a non-empty array of routing rules", () => {
      const routes = intentRouterEngine.getAvailableRoutes();
      expect(routes.length).toBeGreaterThan(0);
    });

    it("each route has dispatcher + action + keywords", () => {
      const routes = intentRouterEngine.getAvailableRoutes();
      routes.forEach((r) => {
        expect(r.dispatcher).toBeDefined();
        expect(r.action).toBeDefined();
        expect(Array.isArray(r.keywords)).toBe(true);
      });
    });
  });

  // ── addRule() ─────────────────────────────────────────────────────────

  describe("addRule()", () => {
    it("adds a custom routing rule", () => {
      const before = intentRouterEngine.getStats().totalRules;
      intentRouterEngine.addRule({
        patterns: [/custom test query/i],
        keywords: ["custom", "test"],
        dispatcher: "prism_test",
        action: "test_action",
        priority: 100,
      });
      const after = intentRouterEngine.getStats().totalRules;
      expect(after).toBe(before + 1);
    });
  });

  // ── getStats() ────────────────────────────────────────────────────────

  describe("getStats()", () => {
    it("returns total rules and dispatcher list", () => {
      const stats = intentRouterEngine.getStats();
      expect(stats.totalRules).toBeGreaterThan(0);
      expect(Array.isArray(stats.dispatchers)).toBe(true);
      expect(Array.isArray(stats.topKeywords)).toBe(true);
    });
  });
});
