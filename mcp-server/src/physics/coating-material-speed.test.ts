/**
 * coating-material-speed.test.ts -- reference-value + invariant tests for the material-specific
 * coating cutting-speed layer (U-OSC-COATING-MATERIAL-SPEED). Real physics intent, not stubs.
 */
import { describe, it, expect } from "vitest";
import {
  getCoatingMaterialSpeedFactor,
  getCoatingMaterialLifeFactor,
  isCoatingMaterialIncompatible,
  coatingIncompatibleLifeCap,
  COATING_ISO_SPEED_OVERRIDE,
  COATING_ISO_LIFE_OVERRIDE,
  COATING_MATERIAL_SPEED_FACTOR_MIN,
  COATING_MATERIAL_SPEED_FACTOR_MAX,
  COATING_MATERIAL_LIFE_FACTOR_MIN,
  COATING_MATERIAL_LIFE_FACTOR_MAX,
  COATING_INCOMPATIBLE_LIFE_CAP_MIN,
} from "./coating-material-speed.js";

const DIAMOND_LIFE_BASE = 2.0; // COATING_DB diamond life_multiplier (non-ferrous home)
const ALCRN_LIFE_BASE = 1.05;
const DLC_LIFE_BASE = 1.2;

const DIAMOND_BASE = 1.3; // COATING_DB diamond scalar (its non-ferrous home value)
const ALCRN_BASE = 1.0;   // COATING_DB AlCrN scalar (TiAlN-normalized baseline)
const DLC_BASE = 1.1;

describe("getCoatingMaterialSpeedFactor -- diamond is non-ferrous ONLY", () => {
  it("diamond on aluminium (N) keeps its 1.30 home value (no override)", () => {
    expect(getCoatingMaterialSpeedFactor("diamond", DIAMOND_BASE, "N")).toBe(1.3);
  });
  it("diamond on steel (P) is heavily derated from 1.30 -> 0.30 (carbon diffusion)", () => {
    expect(getCoatingMaterialSpeedFactor("diamond", DIAMOND_BASE, "P")).toBe(0.3);
  });
  it("diamond on cast iron (K) derated to 0.35", () => {
    expect(getCoatingMaterialSpeedFactor("diamond", DIAMOND_BASE, "K")).toBe(0.35);
  });
  it("the derate is STRICTLY a reduction vs the scalar baseline (monotonically safe)", () => {
    for (const iso of ["P", "M", "K", "H"] as const) {
      expect(getCoatingMaterialSpeedFactor("diamond", DIAMOND_BASE, iso)).toBeLessThan(DIAMOND_BASE);
    }
  });
});

describe("getCoatingMaterialSpeedFactor -- high-Al PVD on aluminium", () => {
  it("AlCrN on aluminium (N) derated 1.00 -> 0.90 (BUE not oxidation dominates)", () => {
    expect(getCoatingMaterialSpeedFactor("AlCrN", ALCRN_BASE, "N")).toBe(0.9);
  });
  it("AlCrN on steel (P) is UNCHANGED at baseline -- compatible pair never raised", () => {
    expect(getCoatingMaterialSpeedFactor("AlCrN", ALCRN_BASE, "P")).toBe(ALCRN_BASE);
  });
  it("DLC on cast iron (K) derated to 0.80", () => {
    expect(getCoatingMaterialSpeedFactor("DLC", DLC_BASE, "K")).toBe(0.8);
  });
});

describe("getCoatingMaterialSpeedFactor -- fallback + clamp", () => {
  it("no isoGroup -> the workpiece-agnostic baseline (back-compat)", () => {
    expect(getCoatingMaterialSpeedFactor("diamond", DIAMOND_BASE)).toBe(1.3);
  });
  it("unknown coating -> baseline", () => {
    expect(getCoatingMaterialSpeedFactor("ZrN", 0.95, "P")).toBe(0.95);
  });
  it("non-finite / non-positive baseScalar defaults to 1.0", () => {
    expect(getCoatingMaterialSpeedFactor("ZrN", Number.NaN, "P")).toBe(1.0);
    expect(getCoatingMaterialSpeedFactor("ZrN", 0, "P")).toBe(1.0);
  });
  it("a wild baseline is clamped into the band", () => {
    expect(getCoatingMaterialSpeedFactor("ZrN", 9.0, "P")).toBe(COATING_MATERIAL_SPEED_FACTOR_MAX);
    expect(getCoatingMaterialSpeedFactor("ZrN", 0.05, "P")).toBe(COATING_MATERIAL_SPEED_FACTOR_MIN);
  });
});

describe("getCoatingMaterialLifeFactor -- diamond life collapses on ferrous", () => {
  it("diamond on aluminium (N) keeps its 2.00 home life (no override)", () => {
    expect(getCoatingMaterialLifeFactor("diamond", DIAMOND_LIFE_BASE, "N")).toBe(2.0);
  });
  it("diamond on steel (P) life collapses 2.00 -> 0.15 (diffusion wear)", () => {
    expect(getCoatingMaterialLifeFactor("diamond", DIAMOND_LIFE_BASE, "P")).toBe(0.15);
  });
  it("diamond on cast iron (K) life 0.20", () => {
    expect(getCoatingMaterialLifeFactor("diamond", DIAMOND_LIFE_BASE, "K")).toBe(0.2);
  });
  it("DERATE-ONLY: every ferrous diamond life cell is far below the 2.00 baseline", () => {
    for (const iso of ["P", "M", "K", "H"] as const) {
      expect(getCoatingMaterialLifeFactor("diamond", DIAMOND_LIFE_BASE, iso)).toBeLessThan(DIAMOND_LIFE_BASE);
    }
  });
  it("AlCrN on aluminium (N) life derated 1.05 -> 0.85 (BUE)", () => {
    expect(getCoatingMaterialLifeFactor("AlCrN", ALCRN_LIFE_BASE, "N")).toBe(0.85);
  });
  it("AlCrN on steel (P) life UNCHANGED at baseline (compatible never raised)", () => {
    expect(getCoatingMaterialLifeFactor("AlCrN", ALCRN_LIFE_BASE, "P")).toBe(ALCRN_LIFE_BASE);
  });
  it("DLC on hardened (H) life 0.60", () => {
    expect(getCoatingMaterialLifeFactor("DLC", DLC_LIFE_BASE, "H")).toBe(0.6);
  });
  it("no isoGroup -> baseline (back-compat); unknown coating -> baseline", () => {
    expect(getCoatingMaterialLifeFactor("diamond", DIAMOND_LIFE_BASE)).toBe(2.0);
    expect(getCoatingMaterialLifeFactor("ZrN", 0.95, "P")).toBe(0.95);
  });
  it("non-finite baseline defaults to 1.0; wild value clamped", () => {
    expect(getCoatingMaterialLifeFactor("ZrN", Number.NaN, "P")).toBe(1.0);
    expect(getCoatingMaterialLifeFactor("ZrN", 9.0, "P")).toBe(COATING_MATERIAL_LIFE_FACTOR_MAX);
  });
});

describe("coatingIncompatibleLifeCap -- absolute cap for the carbon-diffusion class", () => {
  it("diamond on ferrous returns the absolute cap (a multiplier cannot counteract the Vc-inflated Taylor base)", () => {
    for (const iso of ["P", "M", "K", "H"] as const) {
      expect(coatingIncompatibleLifeCap("diamond", iso)).toBe(COATING_INCOMPATIBLE_LIFE_CAP_MIN);
    }
  });
  it("diamond on aluminium (N, its home) is uncapped -> Infinity", () => {
    expect(coatingIncompatibleLifeCap("diamond", "N")).toBe(Infinity);
  });
  it("a compatible coating is uncapped -> Infinity (no effect on Math.min)", () => {
    expect(coatingIncompatibleLifeCap("AlCrN", "P")).toBe(Infinity);
    expect(coatingIncompatibleLifeCap("TiAlN", "K")).toBe(Infinity);
  });
  it("the cap is a small positive bound (conservative upper limit, not a precise life)", () => {
    expect(COATING_INCOMPATIBLE_LIFE_CAP_MIN).toBeGreaterThan(0);
    expect(COATING_INCOMPATIBLE_LIFE_CAP_MIN).toBeLessThan(20);
  });
});

describe("COATING_ISO_LIFE_OVERRIDE table integrity", () => {
  it("every life override cell is within the clamp band", () => {
    for (const cells of Object.values(COATING_ISO_LIFE_OVERRIDE)) {
      for (const v of Object.values(cells)) {
        expect(v).toBeGreaterThanOrEqual(COATING_MATERIAL_LIFE_FACTOR_MIN);
        expect(v).toBeLessThanOrEqual(COATING_MATERIAL_LIFE_FACTOR_MAX);
      }
    }
  });
});

describe("isCoatingMaterialIncompatible -- carbon-diffusion class", () => {
  it("diamond on every ferrous group is incompatible", () => {
    for (const iso of ["P", "M", "K", "H"] as const) {
      expect(isCoatingMaterialIncompatible("diamond", iso)).toBe(true);
    }
  });
  it("diamond on aluminium (N) is compatible (its home)", () => {
    expect(isCoatingMaterialIncompatible("diamond", "N")).toBe(false);
  });
  it("diamond on superalloy (S) is NOT in the ferrous set -> not flagged here", () => {
    // S (Ni/Ti superalloys) are not the carbon-diffusion ferrous class; flagged conservatively false.
    expect(isCoatingMaterialIncompatible("diamond", "S")).toBe(false);
  });
  it("AlCrN on steel is compatible (the workhorse pairing)", () => {
    expect(isCoatingMaterialIncompatible("AlCrN", "P")).toBe(false);
  });
  it("missing inputs -> not incompatible (fail-open)", () => {
    expect(isCoatingMaterialIncompatible(undefined, "P")).toBe(false);
    expect(isCoatingMaterialIncompatible("diamond", undefined)).toBe(false);
  });
});

describe("COATING_ISO_SPEED_OVERRIDE table integrity", () => {
  it("every override cell is within the clamp band", () => {
    for (const cells of Object.values(COATING_ISO_SPEED_OVERRIDE)) {
      for (const v of Object.values(cells)) {
        expect(v).toBeGreaterThanOrEqual(COATING_MATERIAL_SPEED_FACTOR_MIN);
        expect(v).toBeLessThanOrEqual(COATING_MATERIAL_SPEED_FACTOR_MAX);
      }
    }
  });
});
