/**
 * CAMCoolantStrategyEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-COOLANT
 */
import { describe, it, expect } from "vitest";
import { CAMCoolantStrategyEngine } from "../engines/CAMCoolantStrategyEngine.js";

const engine = new CAMCoolantStrategyEngine();

describe("CAMCoolantStrategyEngine", () => {

  it("wire-edm op → submerged (deionized water)", () => {
    const r = engine.select({ op: "wedm_2axis" });
    expect(r.strategy).toBe("submerged");
    expect(r.rationale).toMatch(/wire-edm|deionized/i);
  });

  it("sinker-edm op → submerged (dielectric oil)", () => {
    const r = engine.select({ op: "sinker_edm" });
    expect(r.strategy).toBe("submerged");
    expect(r.rationale).toMatch(/dielectric|sinker/i);
  });

  it("laser op → air_blast at 12 bar", () => {
    const r = engine.select({ op: "laser_cut" });
    expect(r.strategy).toBe("air_blast");
    expect(r.pressureBar).toBe(12);
  });

  it("probing op → dry (no cutting load)", () => {
    const r = engine.select({ op: "probe_wcs" });
    expect(r.strategy).toBe("dry");
  });

  it("hardened steel with through-coolant capable tool → through_spindle 70 bar", () => {
    const r = engine.select({ op: "face", material: "hardened_steel", throughCoolantCapable: true });
    expect(r.strategy).toBe("through_spindle");
    expect(r.pressureBar).toBe(70);
  });

  it("hardened steel WITHOUT through-coolant → flood 25 L/min", () => {
    const r = engine.select({ op: "face", material: "hardened_steel", throughCoolantCapable: false });
    expect(r.strategy).toBe("flood");
    expect(r.flowRateLpm).toBe(25);
  });

  it("titanium → through_spindle when capable", () => {
    const r = engine.select({ op: "face", material: "titanium", throughCoolantCapable: true });
    expect(r.strategy).toBe("through_spindle");
  });

  it("inconel → through_spindle when capable", () => {
    const r = engine.select({ op: "face", material: "inconel", throughCoolantCapable: true });
    expect(r.strategy).toBe("through_spindle");
  });

  it("aluminum + tap_cut → mql (avoid built-up edge)", () => {
    const r = engine.select({ op: "face", material: "aluminum", toolFamily: "tap_cut" });
    expect(r.strategy).toBe("mql");
  });

  it("aluminum + thread_mill → mql", () => {
    const r = engine.select({ op: "face", material: "aluminum", toolFamily: "thread_mill" });
    expect(r.strategy).toBe("mql");
  });

  it("deep drill L/D=6 + through-capable → through_spindle 50 bar", () => {
    const r = engine.select({
      op: "drill_peck",
      depthOfCutMm: 60,
      toolDiameterMm: 10,
      throughCoolantCapable: true,
    });
    expect(r.strategy).toBe("through_spindle");
    expect(r.pressureBar).toBe(50);
  });

  it("deep drill L/D=6 NO through-coolant → high-volume flood 30 L/min", () => {
    const r = engine.select({
      op: "drill_peck",
      depthOfCutMm: 60,
      toolDiameterMm: 10,
      throughCoolantCapable: false,
    });
    expect(r.strategy).toBe("flood");
    expect(r.flowRateLpm).toBe(30);
  });

  it("shallow drill L/D=2 → default flood (no deep-drilling escalation)", () => {
    const r = engine.select({
      op: "drill_peck",
      depthOfCutMm: 20,
      toolDiameterMm: 10,
    });
    expect(r.strategy).toBe("flood");
    expect(r.flowRateLpm).toBe(15);
  });

  it("plastic material → dust_extraction", () => {
    const r = engine.select({ op: "face", material: "plastic" });
    expect(r.strategy).toBe("dust_extraction");
  });

  it("composite material → dust_extraction", () => {
    const r = engine.select({ op: "face", material: "composite" });
    expect(r.strategy).toBe("dust_extraction");
  });

  it("default milling steel → flood 15 L/min", () => {
    const r = engine.select({ op: "face", material: "steel" });
    expect(r.strategy).toBe("flood");
    expect(r.flowRateLpm).toBe(15);
  });

  it("default turning → flood", () => {
    const r = engine.select({ op: "turn_rough" });
    expect(r.strategy).toBe("flood");
  });

  it("strategies() returns the 8 documented CoolantStrategy values", () => {
    const s = engine.strategies();
    expect(s.length).toBe(8);
    expect(s).toContain("flood");
    expect(s).toContain("mql");
    expect(s).toContain("through_spindle");
    expect(s).toContain("submerged");
  });

  it("rationale is non-empty + informative for all common branches", () => {
    expect(engine.select({ op: "face" }).rationale.length).toBeGreaterThan(10);
    expect(engine.select({ op: "wedm_2axis" }).rationale.length).toBeGreaterThan(10);
    expect(engine.select({ op: "face", material: "titanium", throughCoolantCapable: true }).rationale).toMatch(/through-spindle/i);
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes select + strategies", () => {
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("select");
    expect(names).toContain("strategies");
  });
});
