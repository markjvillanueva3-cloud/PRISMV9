/**
 * Tests for generateCompoundJobCascade — the P0-3 bi-material/compound bridge.
 *   npx vitest run src/__tests__/WEDMCompoundCascade.test.ts
 *
 * R9 intent: this wires EDMBiMaterialCompensationEngine (per-zone spark params) into
 * the cascade, binds STEEL zones to their FA E-family, and FAIL-LOUDLY flags
 * carbide/braze zones as needs_operator_ecode (no FA carbide calibration exists — it
 * must NOT silently emit a steel recipe for carbide). Asserted against the live engine.
 */
import { describe, it, expect } from "vitest";
import { generateCompoundJobCascade } from "../data/wedm-compound-cascade.js";

// A steel-body part with a brazed tungsten-carbide insert (the canonical bi-material case).
const STEEL_CARBIDE_BRAZE = [
  { zone_id: "z1", material: "D2", zone_type: "primary_steel" as const, start_mm: 0, end_mm: 10, hardness_hrc: 58 },
  { zone_id: "z2", material: "silver-braze", zone_type: "braze_joint" as const, start_mm: 10, end_mm: 11 },
  { zone_id: "z3", material: "tungsten-carbide", zone_type: "carbide_insert" as const, start_mm: 11, end_mm: 20 },
  { zone_id: "z4", material: "silver-braze", zone_type: "braze_joint" as const, start_mm: 20, end_mm: 21 },
  { zone_id: "z5", material: "D2", zone_type: "secondary_steel" as const, start_mm: 21, end_mm: 31 },
];

describe("generateCompoundJobCascade — zone binding", () => {
  it("binds STEEL zones to the exact shop-calibrated FA family (D2@25mm => standard 4-pass)", () => {
    const c = generateCompoundJobCascade({ zones: STEEL_CARBIDE_BRAZE, thickness_mm: 25 })!;
    const steel = c.zones.find((z) => z.zone_id === "z1")!;
    expect(steel.e_family_id).toBe("E12xx_standard_4pass");
    expect(steel.needs_operator_ecode).toBe(false);
  });

  it("FLAGS carbide zones — no FA carbide E-family, never a silent steel recipe", () => {
    const c = generateCompoundJobCascade({ zones: STEEL_CARBIDE_BRAZE, thickness_mm: 25 })!;
    const carbide = c.zones.find((z) => z.zone_id === "z3")!;
    expect(carbide.e_family_id).toBeNull();
    expect(carbide.needs_operator_ecode).toBe(true);
    expect(carbide.e_family_reason).toMatch(/carbide_insert|operator/i);
  });

  it("FLAGS braze zones too (no FA braze E-family)", () => {
    const c = generateCompoundJobCascade({ zones: STEEL_CARBIDE_BRAZE, thickness_mm: 25 })!;
    const braze = c.zones.find((z) => z.zone_id === "z2")!;
    expect(braze.e_family_id).toBeNull();
    expect(braze.needs_operator_ecode).toBe(true);
  });

  it("steel zone with a non-FA material falls back to operator dial-in (no false family)", () => {
    const zones = [{ zone_id: "z1", material: "inconel-718", zone_type: "primary_steel" as const, start_mm: 0, end_mm: 20 }];
    const c = generateCompoundJobCascade({ zones, thickness_mm: 25 })!;
    expect(c.zones[0].e_family_id).toBeNull();
    expect(c.zones[0].needs_operator_ecode).toBe(true);
    expect(c.zones[0].e_family_reason).toMatch(/not in any FA family/i);
  });
});

describe("generateCompoundJobCascade — engine params + provenance", () => {
  it("populates engine-computed spark params per zone; carbide t_on exceeds steel t_on", () => {
    const c = generateCompoundJobCascade({ zones: STEEL_CARBIDE_BRAZE, thickness_mm: 25 })!;
    const steel = c.zones.find((z) => z.zone_id === "z1")!;
    const carbide = c.zones.find((z) => z.zone_id === "z3")!;
    for (const z of [steel, carbide]) {
      expect(z.params.t_on_us).toBeGreaterThan(0);
      expect(z.params.peak_current_A).toBeGreaterThan(0);
      expect(z.params.feed_rate_mm_min).toBeGreaterThan(0);
    }
    // carbide is higher-melting => longer pulse on-time than steel (engine physics).
    expect(carbide.params.t_on_us).toBeGreaterThan(steel.params.t_on_us);
  });

  it("surfaces profile flags + bounded overall wire-break risk", () => {
    const c = generateCompoundJobCascade({ zones: STEEL_CARBIDE_BRAZE, thickness_mm: 25 })!;
    expect(c.has_carbide).toBe(true);
    expect(c.has_braze).toBe(true);
    expect(c.zone_count).toBe(5);
    expect(c.overall_wire_break_risk).toBeGreaterThanOrEqual(0);
    expect(c.overall_wire_break_risk).toBeLessThanOrEqual(1);
  });

  it("always carries the unvalidated caveat + a carbide-gap caveat when carbide present (R12)", () => {
    const c = generateCompoundJobCascade({ zones: STEEL_CARBIDE_BRAZE, thickness_mm: 25 })!;
    expect(c.caveats.some((s) => /UNVALIDATED/i.test(s))).toBe(true);
    expect(c.caveats.some((s) => /carbide\/braze E-code family exists/i.test(s))).toBe(true);
  });

  it("an all-steel profile has no carbide-gap caveat and binds a family", () => {
    const zones = [{ zone_id: "z1", material: "D2", zone_type: "primary_steel" as const, start_mm: 0, end_mm: 25 }];
    const c = generateCompoundJobCascade({ zones, thickness_mm: 25 })!;
    expect(c.has_carbide).toBe(false);
    expect(c.caveats.some((s) => /carbide\/braze E-code family/i.test(s))).toBe(false);
    expect(c.zones[0].e_family_id).toBe("E12xx_standard_4pass");
    expect(c.zones[0].needs_operator_ecode).toBe(false);
  });
});

describe("generateCompoundJobCascade — degrade safely", () => {
  it("returns null on empty / missing zones", () => {
    expect(generateCompoundJobCascade({ zones: [], thickness_mm: 25 })).toBeNull();
    expect(generateCompoundJobCascade({ zones: undefined as unknown as [], thickness_mm: 25 })).toBeNull();
  });

  it("returns null on unusable thickness", () => {
    expect(generateCompoundJobCascade({ zones: STEEL_CARBIDE_BRAZE, thickness_mm: 0 })).toBeNull();
    expect(generateCompoundJobCascade({ zones: STEEL_CARBIDE_BRAZE, thickness_mm: Number.NaN })).toBeNull();
  });
});
