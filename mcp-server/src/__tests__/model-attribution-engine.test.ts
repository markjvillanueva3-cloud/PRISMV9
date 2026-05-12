/**
 * Tests for ModelAttributionEngine (Phase 0.25.6 U-UX3)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ModelAttributionEngine,
  modelAttributionEngine,
  type AttributionRecord,
} from "../engines/ModelAttributionEngine.js";

function entry(overrides: Partial<Omit<AttributionRecord, "at">> = {}): Omit<AttributionRecord, "at"> {
  return {
    responseId: overrides.responseId ?? "resp-1",
    model: overrides.model ?? "claude-opus-4-7",
    provenance: overrides.provenance ?? "claude",
    tokensIn: overrides.tokensIn ?? 100,
    tokensOut: overrides.tokensOut ?? 200,
    latencyMs: overrides.latencyMs ?? 500,
    correlationId: overrides.correlationId,
  };
}

describe("ModelAttributionEngine", () => {
  let e: ModelAttributionEngine;

  beforeEach(() => {
    e = new ModelAttributionEngine(5);
  });

  describe("construction", () => {
    it("rejects invalid maxRecords", () => {
      expect(() => new ModelAttributionEngine(0)).toThrow(/maxRecords/);
      expect(() => new ModelAttributionEngine(-1)).toThrow(/maxRecords/);
      expect(() => new ModelAttributionEngine(1.5)).toThrow();
    });
  });

  describe("record()", () => {
    it("stamps an ISO timestamp", () => {
      const r = e.record(entry());
      expect(r.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("honours supplied timestamp", () => {
      const r = e.record({ ...entry(), at: "2026-04-16T00:00:00.000Z" });
      expect(r.at).toBe("2026-04-16T00:00:00.000Z");
    });

    it("caps the buffer at maxRecords", () => {
      for (let i = 0; i < 10; i += 1) {
        e.record(entry({ responseId: `r${i}` }));
      }
      expect(e.size()).toBe(5);
    });

    it("rejects missing responseId/model", () => {
      expect(() => e.record(entry({ responseId: "" }))).toThrow(/responseId/);
      expect(() => e.record(entry({ model: "" }))).toThrow(/model/);
    });

    it("rejects invalid provenance", () => {
      expect(() => e.record(entry({ provenance: "bogus" as "local" }))).toThrow(/provenance/);
    });

    it("rejects negative token counts and latency", () => {
      expect(() => e.record(entry({ tokensIn: -1 }))).toThrow(/tokensIn/);
      expect(() => e.record(entry({ tokensOut: -1 }))).toThrow(/tokensOut/);
      expect(() => e.record(entry({ latencyMs: -1 }))).toThrow(/latencyMs/);
    });

    it("rejects non-integer token counts", () => {
      expect(() => e.record(entry({ tokensIn: 1.5 }))).toThrow(/tokensIn/);
    });
  });

  describe("badge()", () => {
    it("includes model name and latency", () => {
      const r = e.record(entry({ model: "llama-3", provenance: "local", latencyMs: 42 }));
      expect(e.badge(r)).toContain("llama-3");
      expect(e.badge(r)).toContain("42ms");
    });

    it("uses provenance-specific tag", () => {
      const localR = e.record(entry({ responseId: "a", provenance: "local" }));
      const claudeR = e.record(entry({ responseId: "b", provenance: "claude" }));
      expect(e.badge(localR)).toContain("local");
      expect(e.badge(claudeR)).toContain("claude");
    });
  });

  describe("buildBadge()", () => {
    it("produces a badge without recording", () => {
      const badge = e.buildBadge("gpt-4o", "external", 200);
      expect(badge).toContain("gpt-4o");
      expect(e.size()).toBe(0);
    });

    it("rejects empty model or negative latency", () => {
      expect(() => e.buildBadge("", "local", 100)).toThrow(/model/);
      expect(() => e.buildBadge("m", "local", -1)).toThrow(/latencyMs/);
    });
  });

  describe("summary()", () => {
    beforeEach(() => {
      e.record(entry({ responseId: "a", model: "m1", provenance: "claude", tokensIn: 100, tokensOut: 200, latencyMs: 100 }));
      e.record(entry({ responseId: "b", model: "m1", provenance: "claude", tokensIn: 100, tokensOut: 200, latencyMs: 300 }));
      e.record(entry({ responseId: "c", model: "m2", provenance: "local", tokensIn: 50, tokensOut: 100, latencyMs: 50 }));
    });

    it("aggregates by model with incremental average latency", () => {
      const s = e.summary();
      expect(s.byModel.m1.calls).toBe(2);
      expect(s.byModel.m1.tokensIn).toBe(200);
      expect(s.byModel.m1.tokensOut).toBe(400);
      expect(s.byModel.m1.avgLatencyMs).toBeCloseTo(200, 4);
    });

    it("aggregates by provenance", () => {
      const s = e.summary();
      expect(s.byProvenance.claude).toBe(2);
      expect(s.byProvenance.local).toBe(1);
    });

    it("reports total call count", () => {
      expect(e.summary().totalCalls).toBe(3);
    });
  });

  describe("recent() + findByResponseId()", () => {
    it("returns the last N records", () => {
      for (let i = 0; i < 5; i += 1) e.record(entry({ responseId: `r${i}` }));
      const r = e.recent(2).map((x) => x.responseId);
      expect(r).toEqual(["r3", "r4"]);
    });

    it("rejects invalid limit", () => {
      expect(() => e.recent(-1)).toThrow(/limit/);
    });

    it("findByResponseId finds the latest matching record", () => {
      e.record(entry({ responseId: "shared", latencyMs: 100 }));
      e.record(entry({ responseId: "shared", latencyMs: 200 }));
      expect(e.findByResponseId("shared")?.latencyMs).toBe(200);
    });

    it("findByResponseId returns null for unknown id", () => {
      expect(e.findByResponseId("ghost")).toBeNull();
    });
  });

  describe("clear()", () => {
    it("empties the buffer", () => {
      e.record(entry());
      e.clear();
      expect(e.size()).toBe(0);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      modelAttributionEngine.clear();
      modelAttributionEngine.record(entry({ responseId: "singleton" }));
      expect(modelAttributionEngine.size()).toBe(1);
      modelAttributionEngine.clear();
    });
  });
});
