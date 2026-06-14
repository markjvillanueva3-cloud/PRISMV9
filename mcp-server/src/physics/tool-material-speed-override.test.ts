/**
 * U-OSC-TOOLMAT-SPEED-MATERIAL-SPECIFIC -- material-specific tool-material speed factor.
 *
 * The uniform CANONICAL_TOOL_MATERIAL_SPEED_FACTOR was workpiece-agnostic; the live tri-vendor
 * comparison proved PRISM over-sped HSS on cast iron (+108%) and CBN on hardened (+49%), and
 * under-sped ceramic (-49%). This module layers a per-(tool, ISO) override + widened clamp.
 * Values physics-reviewer-validated 2026-06-09. The end-to-end Vc effect is validated separately
 * by the tri-vendor sweep (HSS-K delta drops from +108% toward 0); these lock the factor itself.
 */
import { describe, it, expect } from "vitest";
import {
  getMaterialSpecificToolSpeedFactor as f,
  MATERIAL_SPECIFIC_SPEED_FACTOR_MIN as MIN,
  MATERIAL_SPECIFIC_SPEED_FACTOR_MAX as MAX,
} from "./tool-material-speed-override.js";

describe("material-specific tool-material speed factor (U-OSC-TOOLMAT-SPEED-MATERIAL-SPECIFIC)", () => {
  // ---- over-speed SAFETY fixes (LOWER than the uniform default) ----
  it("HSS on cast iron (K) = 0.13, not the uniform 0.35 -- fixes the +108% over-speed", () => {
    expect(f("hss", "K")).toBe(0.13);
    expect(f("hss", "K")).toBeLessThan(f("hss", "P")); // K (0.13) far below P (0.35)
  });

  it("CBN on hardened steel (H) = 1.4, not the uniform 2.5 -- fixes the +49% over-speed", () => {
    expect(f("cbn", "H")).toBe(1.4);
    expect(f("cbn", "H")).toBeLessThan(f("cbn", "P")); // H (1.4) below the uniform 2.5
  });

  // ---- under-speed corrections (RAISE -- ceramic genuinely runs that fast) ----
  it("ceramic on cast iron (K=3.8) and superalloy (S=6.5) exceed the OLD 3.0 ceiling -- fixes -49%", () => {
    expect(f("ceramic", "K")).toBe(3.8);
    expect(f("ceramic", "S")).toBe(6.5);
    expect(f("ceramic", "S")).toBeGreaterThan(3.0); // the old MAX=3.0 would have clamped this -- now admitted
  });

  // ---- NO-REGRESSION: carbide baseline + already-correct cells unchanged ----
  it("carbide stays exactly 1.0 for EVERY ISO group (the calibration baseline -- never overridden)", () => {
    expect(f("carbide", "P")).toBe(1.0);
    expect(f("carbide", "M")).toBe(1.0);
    expect(f("carbide", "K")).toBe(1.0);
    expect(f("carbide", "N")).toBe(1.0);
    expect(f("carbide", "S")).toBe(1.0);
    expect(f("carbide", "H")).toBe(1.0);
  });

  it("HSS on steel (P) + aluminum (N) keep the uniform 0.35 (those cases were already correct: +31%/-5%)", () => {
    expect(f("hss", "P")).toBe(0.35);
    expect(f("hss", "N")).toBe(0.35);
  });

  it("an un-overridden (tool, ISO) cell falls through to the uniform default", () => {
    expect(f("ceramic", "P")).toBe(2.5); // ceramic has only K/S overrides
    expect(f("cbn", "P")).toBe(2.5); // cbn has only an H override
    expect(f("cermet", "K")).toBe(1.15); // cermet never overridden
  });

  it("omitting isoGroup -> uniform default (back-compat with the bare canonical fn)", () => {
    expect(f("hss")).toBe(0.35); // no ISO -> no override
    expect(f("ceramic")).toBe(2.5);
    expect(f("carbide")).toBe(1.0);
  });

  // ---- clamp band ----
  it("the widened clamp band [0.1, 8.0] admits the material-specific extremes (0.13 and 6.5)", () => {
    expect(MIN).toBe(0.1);
    expect(MAX).toBe(8.0);
    expect(MIN).toBeLessThanOrEqual(0.13); // HSS-cast-iron not floored
    expect(MAX).toBeGreaterThanOrEqual(6.5); // ceramic-superalloy not ceiled
  });

  // ---- ADVERSARIAL ----
  it("ADVERSARIAL: null / empty / undefined / unknown material -> carbide 1.0, never a wild value", () => {
    expect(f(null)).toBe(1.0);
    expect(f("")).toBe(1.0);
    expect(f(undefined)).toBe(1.0);
    expect(f("unobtanium", "K")).toBe(1.0); // unknown material -> carbide default, override not applied
  });

  it("ADVERSARIAL: case-insensitive material name still resolves the override", () => {
    expect(f("HSS", "K")).toBe(0.13);
    expect(f("Ceramic", "S")).toBe(6.5);
  });
});
