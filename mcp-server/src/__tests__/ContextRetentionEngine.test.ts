/**
 * ContextRetentionEngine Test Suite
 * ==================================
 *
 * AGENT-MS2 U-AGT05 — Validates critical-fact extraction, retention decisions,
 * and survival context generation.
 *
 * @milestone AGENT-MS2
 * @unit U-AGT05
 */

import { describe, it, expect } from "vitest";
import { contextRetentionEngine } from "../engines/ContextRetentionEngine.js";

describe("ContextRetentionEngine", () => {
  // ── extractCriticalFacts() ─────────────────────────────────────────────

  describe("extractCriticalFacts()", () => {
    it("extracts safety-critical facts", () => {
      const text =
        "The max spindle speed on the LB3000 is 5000 RPM. Never exceed this.";
      const facts = contextRetentionEngine.extractCriticalFacts(text);
      expect(facts.length).toBeGreaterThan(0);
      expect(facts.some((f) => f.category === "safety")).toBe(true);
    });

    it("extracts machine offsets", () => {
      const text = "Work offset G54 on the Okuma LB3000 is set to X=-125.3 Z=-50.";
      const facts = contextRetentionEngine.extractCriticalFacts(text);
      expect(facts.some((f) => f.category === "machine")).toBe(true);
    });

    it("extracts material properties", () => {
      const text = "D2 tool steel hardness is 58 HRC after heat treat.";
      const facts = contextRetentionEngine.extractCriticalFacts(text);
      expect(facts.some((f) => f.category === "material")).toBe(true);
    });

    it("extracts corrections at max importance", () => {
      const text = "That's wrong. The feed rate should be 0.15 mm/rev, not 0.25.";
      const facts = contextRetentionEngine.extractCriticalFacts(text);
      expect(facts.some((f) => f.category === "correction")).toBe(true);
      // Corrections are importance 9-10
      const corrections = facts.filter((f) => f.category === "correction");
      expect(corrections[0]?.importance).toBeGreaterThanOrEqual(9);
    });

    it("extracts customer requirements", () => {
      const text = "Customer wants tolerance held to ±0.0005 inches on all bores.";
      const facts = contextRetentionEngine.extractCriticalFacts(text);
      expect(facts.some((f) => f.category === "customer")).toBe(true);
    });

    it("includes entity names in extracted facts", () => {
      // Use a sentence that hits a critical pattern (tolerance / customer)
      const text =
        "Customer requires tolerance held to 0.0005 on the Okuma LB3000 with D2 tool steel.";
      const facts = contextRetentionEngine.extractCriticalFacts(text);
      const allEntities = facts.flatMap((f) => f.entities);
      expect(allEntities.some((e) => /okuma/i.test(e))).toBe(true);
    });

    it("deduplicates similar content", () => {
      const text =
        "Max spindle RPM is 5000 on LB3000. Max spindle RPM is 5000 on LB3000.";
      const facts = contextRetentionEngine.extractCriticalFacts(text);
      // Should deduplicate the exact duplicate
      expect(facts.length).toBeLessThanOrEqual(1);
    });

    it("returns empty for non-critical text", () => {
      const text = "The weather today is fine. Nothing much happening.";
      const facts = contextRetentionEngine.extractCriticalFacts(text);
      expect(facts.length).toBe(0);
    });
  });

  // ── decideRetention() ─────────────────────────────────────────────────

  describe("decideRetention()", () => {
    it("always retains safety facts", () => {
      const decision = contextRetentionEngine.decideRetention({
        content: "max rpm 5000",
        reason: "safety",
        category: "safety",
        importance: 10,
        entities: [],
      });
      expect(decision.retain).toBe(true);
      expect(decision.retentionDays).toBeUndefined(); // forever
    });

    it("always retains corrections", () => {
      const decision = contextRetentionEngine.decideRetention({
        content: "wrong",
        reason: "correction",
        category: "correction",
        importance: 10,
        entities: [],
      });
      expect(decision.retain).toBe(true);
      expect(decision.retentionDays).toBeUndefined();
    });

    it("high-importance process facts retained 365 days", () => {
      const decision = contextRetentionEngine.decideRetention({
        content: "high importance",
        reason: "",
        category: "process",
        importance: 9,
        entities: [],
      });
      expect(decision.retentionDays).toBe(365);
    });

    it("medium-importance facts retained 90 days", () => {
      const decision = contextRetentionEngine.decideRetention({
        content: "medium",
        reason: "",
        category: "process",
        importance: 6,
        entities: [],
      });
      expect(decision.retentionDays).toBe(90);
    });

    it("low-importance facts retained 30 days", () => {
      const decision = contextRetentionEngine.decideRetention({
        content: "low",
        reason: "",
        category: "process",
        importance: 3,
        entities: [],
      });
      expect(decision.retentionDays).toBe(30);
    });
  });

  // ── hasCriticalInfo() + getImportanceScore() ──────────────────────────

  describe("hasCriticalInfo() + getImportanceScore()", () => {
    it("hasCriticalInfo returns true for safety message", () => {
      expect(
        contextRetentionEngine.hasCriticalInfo(
          "NEVER exceed 5000 RPM on the spindle"
        )
      ).toBe(true);
    });

    it("hasCriticalInfo returns false for trivial message", () => {
      expect(
        contextRetentionEngine.hasCriticalInfo("Hello how are you today")
      ).toBe(false);
    });

    it("getImportanceScore returns 1-10", () => {
      const score = contextRetentionEngine.getImportanceScore(
        "MAX spindle RPM is 5000. NEVER exceed this."
      );
      expect(score).toBeGreaterThanOrEqual(1);
      expect(score).toBeLessThanOrEqual(10);
    });

    it("safety-critical messages score higher than trivial", () => {
      const critical = contextRetentionEngine.getImportanceScore(
        "MAX spindle RPM is 5000. NEVER exceed this. Collision risk."
      );
      const trivial = contextRetentionEngine.getImportanceScore("hello there");
      expect(critical).toBeGreaterThan(trivial);
    });
  });

  // ── summarizeFacts() ──────────────────────────────────────────────────

  describe("summarizeFacts()", () => {
    it("summarizes a fact list into a readable string", () => {
      const facts = contextRetentionEngine.extractCriticalFacts(
        "Max RPM is 5000 on LB3000. D2 hardness is 58 HRC."
      );
      const summary = contextRetentionEngine.summarizeFacts(facts);
      expect(typeof summary).toBe("string");
      expect(summary.length).toBeGreaterThan(0);
    });

    it("handles empty fact lists", () => {
      const summary = contextRetentionEngine.summarizeFacts([]);
      expect(typeof summary).toBe("string");
    });
  });
});
