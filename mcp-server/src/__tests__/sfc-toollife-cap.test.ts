/**
 * U-SFC-PRODUCTENGINE-LOWVC-TOOLLIFE-CAP [SCOPED interim]
 * =======================================================
 * ProductEngine.sfcCalculate reported physically-implausible Taylor tool life at low Vc
 * (measured 2026-07-06: Ti-6Al-4V ~3087 min, 1045/HSS ~4777 min -- 50-80 h on one edge)
 * because the Taylor flank-wear model over-states life when Vc is extrapolated far below
 * its calibrated band. This pins the DOWNWARD-only reported-life ceiling (480 min = 1 shift):
 *   (a) low-Vc blowups are capped to 480 and FLAGGED (R12 -- no hidden clamp),
 *   (b) normal cases (life < ceiling) pass through UNCHANGED with no spurious warning,
 *   (c) the cap is unconditionally conservative: reported life is never ABOVE 480,
 *   (d) transparency: the flag names the ceiling AND the extrapolated pre-cap value.
 */
import { describe, it, expect } from "vitest";
import { productSFC } from "../engines/ProductEngine.js";
import type { SFCResult } from "../engines/ProductEngine.js";

const CEILING = 480;
const CAP_RE = /Tool life capped at 480 min/;

function calc(params: Record<string, unknown>): SFCResult {
  const r = productSFC("sfc_calculate", params) as { result?: SFCResult; error?: string };
  if (!r.result) throw new Error(`sfc_calculate error: ${r.error ?? JSON.stringify(r)}`);
  return r.result;
}

const base = { tool_diameter: 12, number_of_teeth: 4, depth: 6, width: 4.8, machine_power_kw: 15, machine_max_rpm: 12000 };

// Configs measured to blow up past the ceiling (low-Vc Taylor extrapolation).
const BLOWUP = [
  { ...base, material: "Ti-6Al-4V", tool_material: "carbide", operation: "milling", material_hardness: 340 },
  { ...base, material: "1045", tool_material: "hss", operation: "milling", material_hardness: 180 },
];
// Normal roughing configs whose life is well below the ceiling.
const NORMAL = [
  { ...base, material: "1045", tool_material: "carbide", operation: "milling", material_hardness: 180 },
  { ...base, material: "304", tool_material: "carbide", operation: "milling", material_hardness: 170 },
  { ...base, material: "6061", tool_material: "carbide", operation: "milling", material_hardness: 95 },
];

describe("sfc_calculate — low-Vc tool-life ceiling cap", () => {
  it("ADVERSARIAL: Ti-6Al-4V low-Vc blowup is capped to 480 min and flagged", () => {
    const r = calc(BLOWUP[0]);
    expect(r.tool_life_min).toBe(CEILING);
    const flag = r.safety_warnings.filter((w) => CAP_RE.test(w));
    expect(flag.length).toBe(1);
  });

  it("ADVERSARIAL: 1045/HSS low-Vc blowup is capped to 480 min and flagged", () => {
    const r = calc(BLOWUP[1]);
    expect(r.tool_life_min).toBe(CEILING);
    expect(r.safety_warnings.some((w) => CAP_RE.test(w))).toBe(true);
  });

  it("TRANSPARENCY (R12): the cap flag names the ceiling AND the extrapolated pre-cap value > ceiling", () => {
    const r = calc(BLOWUP[0]);
    const flag = r.safety_warnings.find((w) => CAP_RE.test(w))!;
    const m = flag.match(/extrapolated (\d+) min/);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeGreaterThan(CEILING); // the real Taylor value it replaced
    expect(flag).toMatch(/Vc=\d+ m\/min/); // names the speed that drove the extrapolation
  });

  it("HAPPY: a normal roughing case (life < ceiling) is UNCHANGED with no cap flag", () => {
    const r = calc(NORMAL[0]); // 1045 carbide roughing ~8 min
    expect(r.tool_life_min).toBeLessThan(CEILING);
    expect(r.tool_life_min).toBeGreaterThan(0);
    expect(r.safety_warnings.some((w) => CAP_RE.test(w))).toBe(false);
  });

  it("NO FALSE POSITIVE: none of the normal roughing cases trip the cap flag", () => {
    for (const cfg of NORMAL) {
      const r = calc(cfg);
      expect(r.safety_warnings.some((w) => CAP_RE.test(w))).toBe(false);
      expect(r.tool_life_min).toBeLessThanOrEqual(CEILING);
    }
  });

  it("INVARIANT (conservative, downward-only): reported life never exceeds the ceiling across all configs", () => {
    for (const cfg of [...BLOWUP, ...NORMAL]) {
      const r = calc(cfg);
      expect(r.tool_life_min).toBeLessThanOrEqual(CEILING);
      expect(Number.isFinite(r.tool_life_min)).toBe(true);
    }
  });

  it("FAILURE-MODE: capped life stays positive + finite (no NaN/negative leak from the clamp)", () => {
    const r = calc(BLOWUP[1]);
    expect(r.tool_life_min).toBe(CEILING);
    expect(r.tool_life_min).toBeGreaterThan(0);
  });
});
