/**
 * Tests for PeerLearningCoordinatorEngine (Phase 0.18 U-AGI14)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  PeerLearningCoordinatorEngine,
  peerLearningCoordinatorEngine,
} from "../engines/PeerLearningCoordinatorEngine.js";

describe("PeerLearningCoordinatorEngine", () => {
  let e: PeerLearningCoordinatorEngine;

  beforeEach(() => {
    e = new PeerLearningCoordinatorEngine();
  });

  describe("broadcast() — validation", () => {
    it("rejects missing fromSession", () => {
      expect(() =>
        e.broadcast({ fromSession: "", summary: "x", tags: [], confidence: 0.5 })
      ).toThrow(/fromSession/);
    });

    it("rejects empty summary", () => {
      expect(() =>
        e.broadcast({ fromSession: "s", summary: "", tags: [], confidence: 0.5 })
      ).toThrow(/summary/);
    });

    it("rejects out-of-range confidence", () => {
      expect(() =>
        e.broadcast({ fromSession: "s", summary: "x", tags: [], confidence: 1.5 })
      ).toThrow(/confidence/);
    });

    it("rejects non-array tags", () => {
      expect(() =>
        e.broadcast({ fromSession: "s", summary: "x", tags: "t" as unknown as string[], confidence: 0.5 })
      ).toThrow(/tags/);
    });
  });

  describe("broadcast() — behavior", () => {
    it("accepts a new public insight", () => {
      const r = e.broadcast({ fromSession: "A", summary: "x", tags: [], confidence: 0.5 });
      expect(r.accepted).toBe(true);
      expect(r.insightId).toBeDefined();
      expect(e.size()).toBe(1);
    });

    it("rejects private sensitivity entirely", () => {
      const r = e.broadcast({
        fromSession: "A",
        summary: "secret",
        tags: [],
        confidence: 0.5,
        sensitivity: "private",
      });
      expect(r.accepted).toBe(false);
      expect(r.reason).toMatch(/private/);
    });

    it("dedupes identical summary content", () => {
      e.broadcast({ fromSession: "A", summary: "shared truth", tags: [], confidence: 0.5 });
      const r = e.broadcast({ fromSession: "B", summary: "SHARED TRUTH", tags: [], confidence: 0.9 });
      expect(r.accepted).toBe(false);
      expect(r.reason).toMatch(/duplicate/);
    });

    it("lowercases and dedupes tags", () => {
      e.broadcast({
        fromSession: "A",
        summary: "y",
        tags: ["Kienzle", "kienzle", "ISO"],
        confidence: 0.5,
      });
      const stored = e.query()[0];
      expect(stored.tags.sort()).toEqual(["iso", "kienzle"]);
    });
  });

  describe("query()", () => {
    beforeEach(() => {
      e.broadcast({
        fromSession: "A",
        summary: "alpha insight",
        tags: ["wedm"],
        confidence: 0.9,
        at: "2026-04-16T02:00:00.000Z",
      });
      e.broadcast({
        fromSession: "B",
        summary: "beta insight",
        tags: ["lathe"],
        confidence: 0.3,
        at: "2026-04-16T01:00:00.000Z",
      });
      e.broadcast({
        fromSession: "C",
        summary: "gamma insight",
        tags: ["wedm"],
        confidence: 0.7,
        at: "2026-04-16T03:00:00.000Z",
      });
    });

    it("returns newest first", () => {
      const insights = e.query();
      expect(insights[0].fromSession).toBe("C");
      expect(insights[1].fromSession).toBe("A");
    });

    it("excludeSessionIds filters out own broadcasts", () => {
      expect(e.query({ excludeSessionIds: ["A", "C"] }).map((i) => i.fromSession)).toEqual(["B"]);
    });

    it("includeAnyTag narrows to matching tags", () => {
      expect(e.query({ includeAnyTag: ["wedm"] }).map((i) => i.fromSession).sort()).toEqual(["A", "C"]);
    });

    it("minConfidence filters out low-confidence insights", () => {
      expect(e.query({ minConfidence: 0.8 }).map((i) => i.fromSession)).toEqual(["A"]);
    });

    it("rejects out-of-range minConfidence", () => {
      expect(() => e.query({ minConfidence: -0.1 })).toThrow(/minConfidence/);
      expect(() => e.query({ minConfidence: 1.1 })).toThrow(/minConfidence/);
    });

    it("respects limit", () => {
      expect(e.query({ limit: 2 })).toHaveLength(2);
      expect(e.query({ limit: 0 })).toHaveLength(0);
    });

    it("includeAnyTag=[] acts as no-filter", () => {
      expect(e.query({ includeAnyTag: [] })).toHaveLength(3);
    });
  });

  describe("lifecycle helpers", () => {
    it("get returns null for unknown id", () => {
      expect(e.get("ghost")).toBeNull();
    });

    it("clear empties engine and allows re-broadcast of same content", () => {
      e.broadcast({ fromSession: "A", summary: "x", tags: [], confidence: 0.5 });
      e.clear();
      const r = e.broadcast({ fromSession: "A", summary: "x", tags: [], confidence: 0.5 });
      expect(r.accepted).toBe(true);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      peerLearningCoordinatorEngine.clear();
      const r = peerLearningCoordinatorEngine.broadcast({
        fromSession: "S",
        summary: "singleton insight",
        tags: [],
        confidence: 0.5,
      });
      expect(r.accepted).toBe(true);
      peerLearningCoordinatorEngine.clear();
    });
  });
});
