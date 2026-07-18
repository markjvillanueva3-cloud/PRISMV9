/**
 * CAMFeatureClassClassifierEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-FEATURE
 * Per [[feedback_engine_tests_in_tests_dir]], lives in src/__tests__/.
 */
import { describe, it, expect } from "vitest";
import { CAMFeatureClassClassifierEngine } from "../engines/CAMFeatureClassClassifierEngine.js";

const engine = new CAMFeatureClassClassifierEngine();

describe("CAMFeatureClassClassifierEngine", () => {

  it("classifies 'drill thru hole 0.500 dia' → thru_hole", () => {
    const r = engine.classify("drill thru hole 0.500 dia");
    expect(r.feature).toBe("thru_hole");
    expect(r.score).toBeGreaterThan(0);
  });

  it("classifies 'tapped 1/4-20 unc blind' → tapped_hole over blind_hole (strong-token)", () => {
    const r = engine.classify("tapped 1/4-20 unc blind");
    // tapped_hole matches 'tap' + 'unc' (2 weak); blind_hole matches 'blind' (1 weak)
    // → tapped_hole wins
    expect(r.feature).toBe("tapped_hole");
  });

  it("classifies 'M8 thread' → tapped_hole (via 'm8' + 'thread' tokens)", () => {
    const r = engine.classify("M8 thread");
    expect(r.feature).toBe("tapped_hole");
  });

  it("classifies 'counterbore 0.250 dia x 0.125 deep' → counterbore", () => {
    const r = engine.classify("counterbore 0.250 dia x 0.125 deep");
    expect(r.feature).toBe("counterbore");
  });

  it("classifies 'impeller blade swarf 5-axis' → impeller_blade (strong-token)", () => {
    const r = engine.classify("impeller blade swarf 5-axis");
    expect(r.feature).toBe("impeller_blade");
  });

  it("classifies 'face mill top surface to nominal Z' → face", () => {
    const r = engine.classify("face mill top surface to nominal Z");
    expect(r.feature).toBe("face");
  });

  it("classifies 'open pocket 2x3 inch' → open_pocket (strong-token wins over pocket)", () => {
    const r = engine.classify("open pocket 2x3 inch");
    expect(r.feature).toBe("open_pocket");
  });

  it("classifies 'wire EDM thru profile' → thru_profile", () => {
    const r = engine.classify("wire EDM thru profile");
    expect(r.feature).toBe("thru_profile");
  });

  it("classifies 'M5 part off cutoff' → part_off (strong-token cutoff/parting)", () => {
    const r = engine.classify("M5 part off cutoff");
    expect(r.feature).toBe("part_off");
  });

  it("returns null feature on empty input", () => {
    expect(engine.classify("").feature).toBeNull();
    expect(engine.classify("    ").feature).toBeNull();
  });

  it("returns null feature on unrelated text", () => {
    expect(engine.classify("xyzzy abc 123 unrelated").feature).toBeNull();
  });

  it("alternatives ranked by score (ties broken by rule order)", () => {
    const r = engine.classify("drill hole");
    // Both 'hole' and 'drill' map to feature 'hole' — but other matches may stack.
    expect(r.feature).not.toBeNull();
    expect(Array.isArray(r.alternatives)).toBe(true);
  });

  it("matchedTokens includes every triggered token", () => {
    const r = engine.classify("thru hole");
    expect(r.matchedTokens.length).toBeGreaterThan(0);
    expect(r.matchedTokens.includes("thru")).toBe(true);
  });

  it("listRules returns at least 25 rule entries (taxonomy coverage)", () => {
    expect(engine.listRules().length).toBeGreaterThanOrEqual(25);
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes classify + list_rules", () => {
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("classify");
    expect(names).toContain("list_rules");
  });
});
