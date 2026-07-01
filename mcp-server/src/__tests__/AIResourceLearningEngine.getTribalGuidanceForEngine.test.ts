/**
 * AIResourceLearningEngine.getTribalGuidanceForEngine — operational consumer test.
 *
 * Proves an engine can consume the india iter27-30 tribal corpus. Tests assert
 * concrete known content from the shipped tips (foc-006, foc-007, meh-001 wired
 * to ChatterStabilityLobeEngine), not just presence.
 *
 * Shipped 2026-05-25 (slot:india iter32).
 */
import { describe, it, expect } from "vitest";
import { aiResourceLearningEngine } from "../engines/AIResourceLearningEngine.js";

describe("getTribalGuidanceForEngine — defensive contract", () => {
  it("returns [] on empty input", () => {
    expect(aiResourceLearningEngine.getTribalGuidanceForEngine("")).toEqual([]);
  });

  it("returns [] on null and undefined", () => {
    // @ts-expect-error — runtime defense beyond type signature
    expect(aiResourceLearningEngine.getTribalGuidanceForEngine(null)).toEqual([]);
    // @ts-expect-error
    expect(aiResourceLearningEngine.getTribalGuidanceForEngine(undefined)).toEqual([]);
  });

  it("returns [] for engine names with no matching tips", () => {
    expect(aiResourceLearningEngine.getTribalGuidanceForEngine("NonexistentEngineXYZ")).toEqual([]);
  });
});

describe("getTribalGuidanceForEngine — accepts both bare + engine. prefix", () => {
  it("bare name matches engine.<Name> with identical id sets", () => {
    const bare = aiResourceLearningEngine.getTribalGuidanceForEngine("ChatterStabilityLobeEngine");
    const prefixed = aiResourceLearningEngine.getTribalGuidanceForEngine("engine.ChatterStabilityLobeEngine");
    expect(bare.length).toBe(prefixed.length);
    expect(bare.map(t => t.id).sort()).toEqual(prefixed.map(t => t.id).sort());
  });
});

describe("getTribalGuidanceForEngine — concrete content from shipped corpus", () => {
  it("returns specific known tips foc-006 + foc-007 + meh-001 for ChatterStabilityLobeEngine", () => {
    const tips = aiResourceLearningEngine.getTribalGuidanceForEngine("ChatterStabilityLobeEngine");
    const ids = new Set(tips.map(t => t.id));
    expect(ids.has("foc-006")).toBe(true);
    expect(ids.has("foc-007")).toBe(true);
    expect(ids.has("meh-001")).toBe(true);
  });

  it("foc-006 carries the 50-80% stepover rule from page 3-18", () => {
    const tips = aiResourceLearningEngine.getTribalGuidanceForEngine("ChatterStabilityLobeEngine");
    const foc006 = tips.find(t => t.id === "foc-006");
    expect(foc006?.tip).toContain("stepover");
    expect(foc006?.tip).toContain("50-80%");
    expect(foc006?.source?.pages).toBe("3-18");
    expect(foc006?.source?.book).toBe("Fundamentals of CNC Machining");
  });

  it("foc-007 carries the 25-50% stepdown rule and warns about geometric chatter scaling", () => {
    const tips = aiResourceLearningEngine.getTribalGuidanceForEngine("ChatterStabilityLobeEngine");
    const foc007 = tips.find(t => t.id === "foc-007");
    expect(foc007?.tip).toContain("25-50%");
    expect(foc007?.tip).toContain("stepdown");
    expect(foc007?.tip).toContain("chatter");
  });

  it("meh-001 carries the free-vs-forced vibration distinction from Marghitu Ch 6", () => {
    const tips = aiResourceLearningEngine.getTribalGuidanceForEngine("ChatterStabilityLobeEngine");
    const meh001 = tips.find(t => t.id === "meh-001");
    expect(meh001?.tip).toContain("FREE");
    expect(meh001?.tip).toContain("FORCED");
    expect(meh001?.tip).toContain("superposition");
    expect(meh001?.source?.book).toBe("Mechanical Engineer's Handbook");
    expect(meh001?.source?.chapter).toBe(6);
  });

  it("foc-007's bridge_engines list explicitly names ChatterStabilityLobeEngine + CuttingForceEngine + ToolDeflectionEngine", () => {
    const tips = aiResourceLearningEngine.getTribalGuidanceForEngine("ChatterStabilityLobeEngine");
    const foc007 = tips.find(t => t.id === "foc-007");
    expect(foc007?.bridge_engines).toContain("engine.ChatterStabilityLobeEngine");
    expect(foc007?.bridge_engines).toContain("engine.CuttingForceEngine");
    expect(foc007?.bridge_engines).toContain("engine.ToolDeflectionEngine");
  });

  it("UltimateSpeedFeedEngine consumer gets the canonical RPM/IPM formula tips foc-009 + foc-010", () => {
    const tips = aiResourceLearningEngine.getTribalGuidanceForEngine("UltimateSpeedFeedEngine");
    const ids = new Set(tips.map(t => t.id));
    expect(ids.has("foc-009")).toBe(true);
    expect(ids.has("foc-010")).toBe(true);
    const foc009 = tips.find(t => t.id === "foc-009");
    expect(foc009?.tip).toContain("3.82");
    expect(foc009?.tip).toContain("SFM");
    const foc010 = tips.find(t => t.id === "foc-010");
    expect(foc010?.tip).toContain("NumFlutes");
    expect(foc010?.tip).toContain("ChipLoad");
  });
});

describe("getTribalGuidanceForEngine — idempotency", () => {
  it("two consecutive calls return equivalent id sets", () => {
    const a = aiResourceLearningEngine.getTribalGuidanceForEngine("ChatterStabilityLobeEngine");
    const b = aiResourceLearningEngine.getTribalGuidanceForEngine("ChatterStabilityLobeEngine");
    expect(b.map(t => t.id).sort()).toEqual(a.map(t => t.id).sort());
  });

  it("returned tip objects deep-equal across calls (no mutation)", () => {
    const a = aiResourceLearningEngine.getTribalGuidanceForEngine("ChatterStabilityLobeEngine");
    const b = aiResourceLearningEngine.getTribalGuidanceForEngine("ChatterStabilityLobeEngine");
    expect(b).toEqual(a);
  });
});

describe("getTribalGuidanceForEngine — tips fail loud when source data missing required fields", () => {
  it("does NOT return tips lacking bridge_engines (defensive filter)", () => {
    // Every returned tip must have bridge_engines (we filter on it)
    const tips = aiResourceLearningEngine.getTribalGuidanceForEngine("ChatterStabilityLobeEngine");
    for (const t of tips) {
      expect(Array.isArray(t.bridge_engines)).toBe(true);
      expect((t.bridge_engines ?? []).length).toBeGreaterThan(0);
    }
  });
});
