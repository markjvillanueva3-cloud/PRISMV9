/**
 * generate-jm-by-machine-libraries.test.ts -- locks the machine-coincidence
 * clamp math (the core of "cutting parameters coincide with the machine").
 * [JM-BY-MACHINE] (slot:romeo, 2026-06-15)
 */
import { describe, it, expect } from "vitest";
import { clampToSpindle } from "./generate-jm-by-machine-libraries.js";

describe("clampToSpindle -- spindle-limited cutting data per machine", () => {
  it("clamps a milling preset whose RPM exceeds the spindle ceiling, scaling SFM + feed down with RPM", () => {
    // 20000 rpm computed, machine caps at 6000 -> scale 0.3
    const c = clampToSpindle(20000, 1000, 100, 6000);
    expect(c.clamped).toBe(true);
    expect(c.rpm).toBe(6000);
    expect(c.sfm).toBe(300);              // 1000 * 6000/20000
    expect(c.feedMmpm).toBeCloseTo(30, 6); // 100 * 6000/20000 (fz constant -> feed scales with rpm)
  });

  it("passes through unchanged when computed RPM is at or below the ceiling", () => {
    const c = clampToSpindle(5935, 121, 50, 6000);
    expect(c.clamped).toBe(false);
    expect(c.rpm).toBe(5935);
    expect(c.sfm).toBe(121);
    expect(c.feedMmpm).toBe(50);
  });

  it("the SAME preset yields different usable RPM on different machines (machine-coincidence)", () => {
    const lowRpmVmc = clampToSpindle(18000, 900, 90, 6000);   // Okuma MB-56VA
    const highRpmVmc = clampToSpindle(18000, 900, 90, 30000); // Haas OM-2
    expect(lowRpmVmc.rpm).toBe(6000);
    expect(lowRpmVmc.clamped).toBe(true);
    expect(highRpmVmc.rpm).toBe(18000);   // 18000 < 30000 -> unclamped
    expect(highRpmVmc.clamped).toBe(false);
    expect(lowRpmVmc.sfm).toBeLessThan(highRpmVmc.sfm); // the slow spindle gives lower usable surface speed
  });

  it("turning presets (rpm=null CSS) pass through -- no rpm to clamp against the spindle cap", () => {
    const c = clampToSpindle(null, 400, null, 5000);
    expect(c.clamped).toBe(false);
    expect(c.rpm).toBeNull();
    expect(c.sfm).toBe(400);
    expect(c.feedMmpm).toBeNull();
  });

  it("a machine with no rpm cap (null maxRpm) never clamps", () => {
    const c = clampToSpindle(50000, 2000, 200, null);
    expect(c.clamped).toBe(false);
    expect(c.rpm).toBe(50000);
  });

  it("a null feed stays null when clamped (turning-style feed never fabricated)", () => {
    const c = clampToSpindle(12000, 500, null, 6000);
    expect(c.clamped).toBe(true);
    expect(c.feedMmpm).toBeNull();
  });

  it("exactly-at-ceiling RPM is not clamped (boundary)", () => {
    const c = clampToSpindle(6000, 200, 40, 6000);
    expect(c.clamped).toBe(false);
    expect(c.rpm).toBe(6000);
  });
});
