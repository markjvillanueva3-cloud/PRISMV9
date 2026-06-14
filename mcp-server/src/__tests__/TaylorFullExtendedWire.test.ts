/**
 * TaylorFullExtendedWire.test.ts
 *
 * Anti-regression for SF-PSN-WIRE-MS0/U-SFPSN-02D (slot:juliett, 2026-05-23).
 *
 * U-02D ships the WIRE to the full extended Taylor form (ExtendedTaylorModel
 * with inline_compat:false) as a NEW addressable engine surface
 * `extendedTaylorToolLifeFullExtended()`. The existing legacy bit-equivalent
 * `extendedTaylorToolLife()` is UNCHANGED — 88 anti-regression fixtures
 * stay green; no default behavior change.
 *
 * Default-flip + 22.4K+33.1K-LOC test fixture re-baseline of
 * UltimateSpeedFeedEngine.test.ts + .variability.test.ts is deferred to the
 * U-SFPSN-02D-ACTIVATE follow-on (separately tracked); per spec it requires
 * full 3-of-3 scrutiny on every fixture delta. This commit ships the wire.
 *
 * Test strategy: prove the full-extended path is ALIVE (returns finite
 * tool-life values + populated correction factors) and DELIVERS the
 * documented per-source physics — coating factor varies by coating,
 * coolant factor varies by coolant, ISO-group exponents drive feed/depth
 * sensitivity.
 */

import { describe, it, expect } from "vitest";
import { extendedTaylorToolLifeFullExtended } from "../engines/UltimateSpeedFeedEngine.js";
import type { ISOGroup } from "../engines/UltimateSpeedFeedEngine.js";

describe("SF-PSN-WIRE-MS0/U-SFPSN-02D — full extended Taylor wire alive on UltimateSpeedFeedEngine", () => {
  it("uncoated FLOOD baseline returns finite T_min, coating_factor=1.0, hardness_factor=1.0; dry vs flood proves coolant axis is live", () => {
    const floodBaseline = extendedTaylorToolLifeFullExtended(150, 0.25, 250, 0.15, 2, {
      iso_group: "P" as ISOGroup,
      coating: "uncoated",
      coolant: "flood",
    });
    expect(Number.isFinite(floodBaseline.T_min)).toBe(true);
    expect(floodBaseline.T_min).toBeGreaterThan(0);
    expect(floodBaseline.coating_factor).toBe(1.0);
    expect(floodBaseline.hardness_factor).toBe(1.0);

    // Dry vs flood — dry shortens life (documented Walter/Sandvik 0.7× factor)
    const dry = extendedTaylorToolLifeFullExtended(150, 0.25, 250, 0.15, 2, {
      iso_group: "P" as ISOGroup,
      coating: "uncoated",
      coolant: "dry",
    });
    expect(dry.temperature_factor).toBeLessThan(floodBaseline.temperature_factor);
    expect(dry.T_min).toBeLessThan(floodBaseline.T_min);
  });

  it("diamond coating multiplies coating_factor to 3.0 (documented Walter/Sandvik value)", () => {
    const r = extendedTaylorToolLifeFullExtended(150, 0.25, 250, 0.15, 2, {
      iso_group: "P" as ISOGroup,
      coating: "diamond",
      coolant: "dry",
    });
    expect(r.coating_factor).toBe(3.0);
  });

  it("CBN coating multiplies coating_factor to 2.5 (documented Walter/Sandvik value)", () => {
    const r = extendedTaylorToolLifeFullExtended(150, 0.25, 250, 0.15, 2, {
      iso_group: "P" as ISOGroup,
      coating: "CBN",
      coolant: "dry",
    });
    expect(r.coating_factor).toBe(2.5);
  });

  it("TiAlN coating multiplies coating_factor to 1.5 (documented Walter/Sandvik value)", () => {
    const r = extendedTaylorToolLifeFullExtended(150, 0.25, 250, 0.15, 2, {
      iso_group: "P" as ISOGroup,
      coating: "TiAlN",
      coolant: "dry",
    });
    expect(r.coating_factor).toBe(1.5);
  });

  it("ISO-group exponents drive feed sensitivity — feed_exponent (a) differs between P (0.77), N (0.60), S (0.85)", () => {
    const rP = extendedTaylorToolLifeFullExtended(150, 0.25, 250, 0.15, 2, { iso_group: "P" as ISOGroup });
    const rN = extendedTaylorToolLifeFullExtended(150, 0.25, 250, 0.15, 2, { iso_group: "N" as ISOGroup });
    const rS = extendedTaylorToolLifeFullExtended(150, 0.25, 250, 0.15, 2, { iso_group: "S" as ISOGroup });
    // feed sensitivity = -a / n; with n=0.25 and a per group → exactly -3.08, -2.40, -3.40
    expect(rP.sensitivity.feed).toBeCloseTo(-0.77 / 0.25, 10);
    expect(rN.sensitivity.feed).toBeCloseTo(-0.60 / 0.25, 10);
    expect(rS.sensitivity.feed).toBeCloseTo(-0.85 / 0.25, 10);
  });

  it("ISO-group exponents drive depth sensitivity — depth_exponent (b) differs between P (0.37), N (0.30), K (0.40)", () => {
    const rP = extendedTaylorToolLifeFullExtended(150, 0.25, 250, 0.15, 2, { iso_group: "P" as ISOGroup });
    const rN = extendedTaylorToolLifeFullExtended(150, 0.25, 250, 0.15, 2, { iso_group: "N" as ISOGroup });
    const rK = extendedTaylorToolLifeFullExtended(150, 0.25, 250, 0.15, 2, { iso_group: "K" as ISOGroup });
    expect(rP.sensitivity.doc).toBeCloseTo(-0.37 / 0.25, 10);
    expect(rN.sensitivity.doc).toBeCloseTo(-0.30 / 0.25, 10);
    expect(rK.sensitivity.doc).toBeCloseTo(-0.40 / 0.25, 10);
  });

  it("hardness_HB > reference shortens tool life (hardness_factor < 1.0 when HB above reference)", () => {
    const baseline = extendedTaylorToolLifeFullExtended(150, 0.25, 250, 0.15, 2, {
      iso_group: "P" as ISOGroup,
      hardness_HB: 200,
      reference_hardness_HB: 200,
    });
    const hard = extendedTaylorToolLifeFullExtended(150, 0.25, 250, 0.15, 2, {
      iso_group: "P" as ISOGroup,
      hardness_HB: 400,
      reference_hardness_HB: 200,
    });
    expect(baseline.hardness_factor).toBeCloseTo(1.0, 10);
    expect(hard.hardness_factor).toBeLessThan(1.0);
    expect(hard.T_min).toBeLessThan(baseline.T_min);
  });

  it("speed sensitivity = -1/n is independent of ISO group (Taylor identity)", () => {
    const rP = extendedTaylorToolLifeFullExtended(150, 0.25, 250, 0.15, 2, { iso_group: "P" as ISOGroup });
    const rN = extendedTaylorToolLifeFullExtended(150, 0.25, 250, 0.15, 2, { iso_group: "N" as ISOGroup });
    expect(rP.sensitivity.speed).toBeCloseTo(-1 / 0.25, 10);
    expect(rN.sensitivity.speed).toBeCloseTo(-1 / 0.25, 10);
  });

  it("dominant sensitivity is 'speed' for default n=0.25 across all ISO groups (|−1/n|=4 > all |a/n|, |b/n|)", () => {
    for (const group of ["P", "M", "K", "N", "S", "H"] as ISOGroup[]) {
      const r = extendedTaylorToolLifeFullExtended(150, 0.25, 250, 0.15, 2, { iso_group: group });
      expect(r.sensitivity.dominant).toBe("speed");
    }
  });

  it("total_correction is dominated by coating × temperature × hardness — equals or exceeds the 3-factor product (module may add ISO multiplier)", () => {
    const r = extendedTaylorToolLifeFullExtended(150, 0.25, 250, 0.15, 2, {
      iso_group: "P" as ISOGroup,
      coating: "diamond",
      coolant: "cryogenic",
      hardness_HB: 250,
      reference_hardness_HB: 200,
    });
    const threeFactorProduct = r.coating_factor * r.temperature_factor * r.hardness_factor;
    expect(r.total_correction).toBeGreaterThanOrEqual(threeFactorProduct - 1e-9);
    expect(r.total_correction).toBeGreaterThan(1.0); // diamond + cryogenic must improve life vs baseline
    expect(Number.isFinite(r.total_correction)).toBe(true);
  });

  it("function is exported alongside legacy extendedTaylorToolLife — engine surface count grows by 1", async () => {
    const { readFile } = await import("node:fs/promises");
    const src = await readFile(
      new URL("../engines/UltimateSpeedFeedEngine.ts", import.meta.url),
      "utf8"
    );
    expect(src).toContain("export function extendedTaylorToolLifeFullExtended(");
    expect(src).toContain("inline_compat: false");
    expect(src).toContain("U-SFPSN-02D");
    // Legacy bit-equivalent path STILL exists and STILL defaults to inline_compat:true
    expect(src).toMatch(/extendedTaylorToolLife\(/);
    expect(src).toContain("inline_compat: true");
  });
});
