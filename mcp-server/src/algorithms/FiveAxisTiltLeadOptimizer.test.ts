import { describe, it, expect } from "vitest";
import { optimize, FiveAxisTiltLeadOptimizer, type TiltLeadInput } from "./FiveAxisTiltLeadOptimizer.js";

const baseline: TiltLeadInput = { iso_group: "P", tool_type: "ball_end", tool_diameter_mm: 10, L_over_D: 4, surface_radius_mm: 50 };

describe("FiveAxisTiltLeadOptimizer", () => {
  it("P-steel ball-end short stickout → tilt ≈ 12°", () => {
    const r = optimize(baseline);
    expect(r.tilt_deg.value).toBeCloseTo(12, 1);
  });
  it("S-Inconel ball-end → higher tilt (×1.3 multiplier)", () => {
    const r = optimize({ ...baseline, iso_group: "S" });
    expect(r.tilt_deg.value).toBeCloseTo(12 * 1.3, 1);
  });
  it("N-aluminum ball-end → lower tilt (×0.7)", () => {
    const r = optimize({ ...baseline, iso_group: "N" });
    expect(r.tilt_deg.value).toBeCloseTo(12 * 0.7, 1);
  });
  it("Long stickout (L/D=10) → tilt reduced via stickout penalty", () => {
    const r4 = optimize(baseline);
    const r10 = optimize({ ...baseline, L_over_D: 10 });
    expect(r10.tilt_deg.value).toBeLessThan(r4.tilt_deg.value);
    expect(r10.notes.join("|")).toContain("chatter avoidance");
  });
  it("barrel tool has lowest tilt (base 5°)", () => {
    const r = optimize({ ...baseline, tool_type: "barrel" });
    expect(r.tilt_deg.value).toBeCloseTo(5, 1);
  });
  it("lollipop tool has highest tilt (base 15°)", () => {
    const r = optimize({ ...baseline, tool_type: "lollipop" });
    expect(r.tilt_deg.value).toBeCloseTo(15, 1);
  });
  it("concave surface (negative radius) flips lead sign", () => {
    const r = optimize({ ...baseline, surface_radius_mm: -30 });
    expect(r.lead_deg.value).toBeLessThan(0);
  });
  it("concave radius smaller than tool radius → interference warning", () => {
    const r = optimize({ ...baseline, surface_radius_mm: -3 });
    expect(r.notes.join("|")).toContain("scallop");
  });
  it("ball-end effective diameter scales as D·sin(tilt)", () => {
    const r = optimize(baseline);
    const expected = 10 * Math.sin((12 * Math.PI) / 180);
    expect(r.effective_diameter_mm.value).toBeCloseTo(expected, 2);
  });
  it("non-ball tool: effective_diameter = nominal", () => {
    const r = optimize({ ...baseline, tool_type: "bull_nose" });
    expect(r.effective_diameter_mm.value).toBe(10);
  });
  it("unknown iso_group diagnostic", () => {
    expect(optimize({ ...baseline, iso_group: "ZZ" as TiltLeadInput["iso_group"] }).notes.join("|")).toContain("unknown iso_group");
  });
  it("unknown tool_type diagnostic", () => {
    expect(optimize({ ...baseline, tool_type: "saw" as TiltLeadInput["tool_type"] }).notes.join("|")).toContain("unknown tool_type");
  });
  it("L_over_D out of range diagnostic", () => {
    expect(optimize({ ...baseline, L_over_D: 0.5 }).notes.join("|")).toContain("outside");
    expect(optimize({ ...baseline, L_over_D: 20 }).notes.join("|")).toContain("outside");
  });
  it("tool diameter out of range diagnostic", () => {
    expect(optimize({ ...baseline, tool_diameter_mm: 0.1 }).notes.join("|")).toContain("outside");
  });
  it("missing input diagnostic", () => {
    expect(optimize(null as unknown as TiltLeadInput).notes.join("|")).toContain("missing");
  });
  it("version 1.0.0", () => {
    expect(FiveAxisTiltLeadOptimizer.version).toBe("1.0.0");
  });
});
