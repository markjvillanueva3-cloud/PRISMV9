/**
 * UltimateSpeedFeedEngine R12 fail-loud material resolution -- SFC-WIRING-MS0 gap #3.
 *
 * An unrecognized exotic/hardened material silently run as steel (ISO P, kc1.1 1800) instead
 * of e.g. a superalloy (ISO S, kc 2800) is a ~25-55% Vc/force error. The engine now warns
 * LOUDLY on BOTH (a) an unknown-material steel default and (b) an APPROXIMATE substring fuzzy
 * match (which can silently pick the wrong workpiece / ISO group).
 *
 * NOTE: SFCFewShotNewMaterialEngine (ProtoMAML) needs a support set of prior shop-floor
 * outcomes per (customer x material) -- it cannot zero-shot infer for a truly unseen material.
 * The sample-less synchronous calculate() path has no support set, so wiring the few-shot
 * engine here would be a facade (R12). Few-shot adaptation is a gap #10 (outcome-capture)
 * dependency; this unit ships the safe, real deliverable: fail-loud resolution.
 */
import { describe, it, expect } from "vitest";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";

const BASE = { tool_diameter_mm: 10, flutes: 4, operation: "milling" };
const warn = (material: string): string[] =>
  ultimateSpeedFeedEngine.calculate({ ...BASE, material } as never).warnings;

describe("UltimateSpeedFeed material resolution fail-loud (SFC-WIRING-MS0 gap #3)", () => {
  it("unknown material -> loud 'defaulting to steel' + VERIFY warning (not buried in inferred[])", () => {
    const w = warn("zzqx_not_a_real_material");
    expect(w.some((s) => /defaulting to steel/.test(s))).toBe(true);
    expect(w.some((s) => /VERIFY/.test(s) && /UNDER-estimates/.test(s))).toBe(true);
  });

  it("approximate (substring) fuzzy match -> 'fuzzy-matched' VERIFY warning", () => {
    const w = warn("titanium xyz123"); // not an exact alias; substring-matches 'titanium' (ISO S)
    expect(w.some((s) => /fuzzy-matched to 'titanium'/.test(s))).toBe(true);
    expect(w.some((s) => /VERIFY/.test(s))).toBe(true);
  });

  it("exact known material (steel) -> no spurious not-found/fuzzy warning", () => {
    const w = warn("steel");
    expect(w.some((s) => /not found|defaulting to steel|fuzzy-matched/.test(s))).toBe(false);
  });

  it("exact known material (aluminum) -> no spurious resolution warning", () => {
    const w = warn("aluminum");
    expect(w.some((s) => /not found|defaulting to steel|fuzzy-matched/.test(s))).toBe(false);
  });
});
