/**
 * Tests for the machine-rigidity cutting-speed factor (OSCAR-SFC-9AXIS-MS0/U-OSC-RIGIDITY-VC).
 *
 * This factor was previously HARDCODED inline at UltimateSpeedFeedEngine.ts:2629
 * (`machine_rigidity === "low" ? 0.7 : "high" ? 1.1 : 1.0`) — an inline-physics-constant
 * violation with no tests. This unit de-inlines it to the canonical
 * CANONICAL_MACHINE_RIGIDITY_VC_FACTOR and locks the behaviour. The change is
 * behaviour-preserving (same 0.7 / 1.0 / 1.1 values); these tests guard against silent drift
 * AND prove machine_rigidity genuinely moves the recommended Vc (it is NOT an inert axis).
 *
 * Physics note: this is the OPERATIONAL speed backoff (a flimsy setup runs slower to avoid
 * chatter, matching G-Wizard/HSMAdvisor's rigidity slider). The rigorous chatter-free
 * DEPTH-of-cut effect (rigidity → stability-lobe stiffness → critical_depth_mm) is a
 * separate physics-reviewer-gated unit (U-OSC-RIGIDITY-DOC) — not modeled here.
 */

import { describe, it, expect } from "vitest";
import {
  CANONICAL_MACHINE_RIGIDITY_VC_FACTOR,
  getMachineRigidityVcFactor,
} from "../physics/constants.js";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";

describe("getMachineRigidityVcFactor — canonical de-inlined factor (U-OSC-RIGIDITY-VC)", () => {
  it("preserves the prior inline values exactly: low 0.7 / medium 1.0 / high 1.1", () => {
    expect(getMachineRigidityVcFactor("low")).toBe(0.7);
    expect(getMachineRigidityVcFactor("medium")).toBe(1.0);
    expect(getMachineRigidityVcFactor("high")).toBe(1.1);
    expect(CANONICAL_MACHINE_RIGIDITY_VC_FACTOR.low).toBe(0.7);
    expect(CANONICAL_MACHINE_RIGIDITY_VC_FACTOR.high).toBe(1.1);
  });

  it("orders physically: low < medium < high (rigid machines tolerate higher speed)", () => {
    expect(getMachineRigidityVcFactor("low")).toBeLessThan(getMachineRigidityVcFactor("medium"));
    expect(getMachineRigidityVcFactor("medium")).toBeLessThan(getMachineRigidityVcFactor("high"));
  });

  it("is case-insensitive (LOW == low)", () => {
    expect(getMachineRigidityVcFactor("LOW")).toBe(getMachineRigidityVcFactor("low"));
    expect(getMachineRigidityVcFactor("High")).toBe(getMachineRigidityVcFactor("high"));
  });

  it("unknown / empty / null rigidity → medium 1.0 (byte-identical to the prior `: 1.0` fallback)", () => {
    expect(getMachineRigidityVcFactor("titanium-frame")).toBe(1.0);
    expect(getMachineRigidityVcFactor("")).toBe(1.0);
    expect(getMachineRigidityVcFactor(undefined)).toBe(1.0);
    expect(getMachineRigidityVcFactor(null)).toBe(1.0);
  });
});

describe("UltimateSpeedFeedEngine — machine_rigidity moves Vc (the de-inline wiring proof)", () => {
  const base = {
    material: "AISI 4140 Alloy Steel",
    iso_group: "P" as const,
    tool_diameter_mm: 12,
    flutes: 4,
    operation: "milling" as const,
  };

  it("low rigidity yields a LOWER Vc than high rigidity on the same cut", () => {
    const low = ultimateSpeedFeedEngine.calculate({ ...base, machine_rigidity: "low" });
    const high = ultimateSpeedFeedEngine.calculate({ ...base, machine_rigidity: "high" });
    expect(low.cutting_speed.value).toBeLessThan(high.cutting_speed.value);
    // low/high ≈ 0.7/1.1 = 0.636 (the operational backoff ratio)
    expect(low.cutting_speed.value / high.cutting_speed.value).toBeCloseTo(0.7 / 1.1, 1);
  }, 30000);

  it("medium rigidity equals the unspecified baseline (factor 1.0 — gauntlet-preserving)", () => {
    // The 401-assert gauntlet never passes machine_rigidity; medium must be the no-op anchor.
    const medium = ultimateSpeedFeedEngine.calculate({ ...base, machine_rigidity: "medium" });
    const unspecified = ultimateSpeedFeedEngine.calculate({ ...base });
    expect(medium.cutting_speed.value).toBeCloseTo(unspecified.cutting_speed.value, 5);
    // and low explicitly backs off below the baseline (the user's flimsy-setup signal)
    const low = ultimateSpeedFeedEngine.calculate({ ...base, machine_rigidity: "low" });
    expect(low.cutting_speed.value).toBeLessThan(unspecified.cutting_speed.value);
  }, 45000);
});
