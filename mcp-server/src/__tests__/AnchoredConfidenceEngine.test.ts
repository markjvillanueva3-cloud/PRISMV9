/**
 * AnchoredConfidenceEngine — dedicated per-engine test file (U-FORE-13 helper).
 *
 * Shared behavior lives in TeachingNoGoEngine.test.ts. This file exists
 * so the wiring-enforcement Stop hook finds a 1:1 match on filename.
 */

import { describe, it, expect } from "vitest";
import {
  AnchoredConfidenceEngine,
  anchoredConfidenceEngine,
} from "../engines/AnchoredConfidenceEngine.js";

describe("AnchoredConfidenceEngine — per-engine tests", () => {
  it("singleton exports correctly", () => {
    expect(anchoredConfidenceEngine).toBeInstanceOf(AnchoredConfidenceEngine);
    expect(anchoredConfidenceEngine.name).toBe("AnchoredConfidenceEngine");
  });

  it("anchor attaches confidence + engine + citation", () => {
    const e = new AnchoredConfidenceEngine();
    const c = e.anchor("Vc=200 m/min", {
      engine: "TaylorToolLifeEngine",
      confidence: 0.75,
      sourceCitation: "Machinery's Handbook 31e",
    });
    expect(c.anchor.engine).toBe("TaylorToolLifeEngine");
    expect(c.anchor.confidence).toBeCloseTo(0.75, 2);
    expect(c.anchor.sourceCitation).toContain("Machinery's Handbook");
  });

  it("clamps confidence above 1 → 1", () => {
    const e = new AnchoredConfidenceEngine();
    const c = e.anchor("x", { engine: "E", confidence: 99, sourceCitation: "s" });
    expect(c.anchor.confidence).toBe(1);
  });

  it("clamps confidence below 0 → 0", () => {
    const e = new AnchoredConfidenceEngine();
    const c = e.anchor("x", { engine: "E", confidence: -3, sourceCitation: "s" });
    expect(c.anchor.confidence).toBe(0);
  });

  it("render includes engine + % + source", () => {
    const e = new AnchoredConfidenceEngine();
    const c = e.anchor("Fc=1200N", {
      engine: "KienzleForceEngine",
      confidence: 0.9,
      sourceCitation: "ISO 3685",
    });
    const s = e.render(c);
    expect(s).toContain("KienzleForceEngine");
    expect(s).toContain("90%");
    expect(s).toContain("ISO 3685");
  });

  it("showDisagreement inserts counter-view line", () => {
    const e = new AnchoredConfidenceEngine();
    const c = e.anchor("x", {
      engine: "E",
      confidence: 0.5,
      sourceCitation: "s",
      disagreement: "Sandvik prefers Y",
    });
    const s = e.render(c, { showDisagreement: true });
    expect(s).toContain("Counter-view");
    expect(s).toContain("Sandvik");
  });

  it("renderMany maps to one line per claim", () => {
    const e = new AnchoredConfidenceEngine();
    const claims = [
      e.anchor("a", { engine: "E1", confidence: 0.4, sourceCitation: "s1" }),
      e.anchor("b", { engine: "E2", confidence: 0.6, sourceCitation: "s2" }),
      e.anchor("c", { engine: "E3", confidence: 0.8, sourceCitation: "s3" }),
    ];
    expect(e.renderMany(claims)).toHaveLength(3);
  });

  it("recentStats averages correctly", () => {
    const e = new AnchoredConfidenceEngine();
    e.anchor("a", { engine: "E", confidence: 0.2, sourceCitation: "s" });
    e.anchor("b", { engine: "E", confidence: 0.4, sourceCitation: "s" });
    e.anchor("c", { engine: "E", confidence: 0.6, sourceCitation: "s" });
    const stats = e.recentStats();
    expect(stats.avgConfidence).toBeCloseTo(0.4, 2);
    expect(stats.lowestConfidence).toBeCloseTo(0.2, 2);
    expect(stats.count).toBe(3);
  });

  it("reset clears recent history", () => {
    const e = new AnchoredConfidenceEngine();
    e.anchor("x", { engine: "E", confidence: 0.5, sourceCitation: "s" });
    e.reset();
    expect(e.recentStats().count).toBe(0);
  });

  it("FAIL: null anchor throws", () => {
    const e = new AnchoredConfidenceEngine();
    expect(() =>
      e.anchor("x", null as unknown as { engine: string; confidence: number; sourceCitation: string })
    ).toThrow(/must be an object/);
  });

  it("FAIL: empty engine throws", () => {
    const e = new AnchoredConfidenceEngine();
    expect(() =>
      e.anchor("x", { engine: "", confidence: 0.5, sourceCitation: "s" })
    ).toThrow(/engine required/);
  });

  it("FAIL: NaN confidence throws", () => {
    const e = new AnchoredConfidenceEngine();
    expect(() =>
      e.anchor("x", { engine: "E", confidence: NaN, sourceCitation: "s" })
    ).toThrow(/confidence must be/);
  });

  it("ADV: 1000 anchors capped at 500 (MAX_RECENT)", () => {
    const e = new AnchoredConfidenceEngine();
    for (let i = 0; i < 1000; i++) {
      e.anchor(`c${i}`, { engine: "E", confidence: 0.5, sourceCitation: "s" });
    }
    expect(e.recentStats().count).toBe(500);
  });
});
