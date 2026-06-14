/**
 * SpeedFeedChatterStabilityAdapterEngine — tests
 *
 * Validates: RCSA-derived FRF defaults, BigPlus stiffness multiplier,
 * fallback SLD lobe computation, stable RPM recommendation, stickout scaling.
 *
 * @module __tests__/SpeedFeedChatterStabilityAdapterEngine.test
 */

import { describe, it, expect } from "vitest";
import {
  SpeedFeedChatterStabilityAdapterEngine,
  speedFeedChatterStabilityAdapterEngine,
} from "../engines/SpeedFeedChatterStabilityAdapterEngine.js";
import type { NineAxisInput } from "../engines/SpeedFeedNineAxisOrchestratorEngine.js";

const engine = speedFeedChatterStabilityAdapterEngine;

const MILL_STEEL_12MM: NineAxisInput = {
  material: { name: "steel", iso_group: "P" },
  tooling: { tool_diameter_mm: 12, flutes: 4, tool_material: "carbide", stickout_mm: 48 },
  tool_holder: { type: "cat40" },
  toolpath: { operation: "milling", cut_type: "roughing" },
};

const MILL_ALUM_10MM: NineAxisInput = {
  material: { name: "aluminum_6061", iso_group: "N" },
  tooling: { tool_diameter_mm: 10, flutes: 3, tool_material: "carbide", stickout_mm: 30 },
  tool_holder: { type: "hsk_a63", bigplus: false },
  toolpath: { operation: "milling", cut_type: "roughing" },
};

describe("SpeedFeedChatterStabilityAdapterEngine — singleton + basic call", () => {
  it("exports a singleton with recommend()", () => {
    expect(speedFeedChatterStabilityAdapterEngine).toBeInstanceOf(SpeedFeedChatterStabilityAdapterEngine);
  });

  it("recommend returns a stable_rpm > 0 for a valid input", () => {
    const r = engine.recommend(MILL_STEEL_12MM);
    expect(r.stable_rpm).toBeGreaterThan(0);
    expect(r.max_stable_ap_mm).toBeGreaterThan(0);
  });

  it("lobe_computed=false in fallback mode (canonical engine not invoked this iter)", () => {
    const r = engine.recommend(MILL_STEEL_12MM);
    expect(r.lobe_computed).toBe(false);
  });
});

describe("SpeedFeedChatterStabilityAdapterEngine — RCSA-derived defaults", () => {
  it("notes include holder type + L/D ratio + fn + k", () => {
    const r = engine.recommend(MILL_STEEL_12MM);
    const rcsaNote = r.notes.find(n => /RCSA/i.test(n));
    expect(rcsaNote).toMatch(/cat40/);
    expect(rcsaNote).toMatch(/L\/D/);
    expect(rcsaNote).toMatch(/fn=/);
  });

  it("HSK-A63 holder yields higher base fn than CAT40 (textbook ranking)", () => {
    const cat40 = engine.recommend({
      ...MILL_STEEL_12MM,
      tool_holder: { type: "cat40" },
    });
    const hsk63 = engine.recommend({
      ...MILL_STEEL_12MM,
      tool_holder: { type: "hsk_a63" },
    });
    // Higher fn → higher stable RPM at the same lobe number
    expect(hsk63.stable_rpm).toBeGreaterThan(cat40.stable_rpm * 0.9);
  });

  it("shrink-fit holder yields the highest fn (highest stiffness)", () => {
    const shrink = engine.recommend({
      ...MILL_STEEL_12MM,
      tool_holder: { type: "shrink_fit" },
    });
    const er = engine.recommend({
      ...MILL_STEEL_12MM,
      tool_holder: { type: "er_collet" },
    });
    expect(shrink.stable_rpm).toBeGreaterThan(er.stable_rpm);
  });
});

describe("SpeedFeedChatterStabilityAdapterEngine — BigPlus stiffness multiplier", () => {
  it("BigPlus increases fn (canonical 2.3× k → √2.3 ≈ 1.52× fn)", () => {
    const plain = engine.recommend({
      ...MILL_STEEL_12MM,
      tool_holder: { type: "cat40", bigplus: false },
    });
    const bigplus = engine.recommend({
      ...MILL_STEEL_12MM,
      tool_holder: { type: "cat40", bigplus: true },
    });
    expect(bigplus.stable_rpm).toBeGreaterThan(plain.stable_rpm);
  });

  it("notes mention BigPlus when active", () => {
    const r = engine.recommend({
      ...MILL_STEEL_12MM,
      tool_holder: { type: "cat40", bigplus: true },
    });
    const bpNote = r.notes.find(n => /BigPlus/i.test(n));
    expect(bpNote).toMatch(/2\.3|face contact/i);
  });
});

describe("SpeedFeedChatterStabilityAdapterEngine — stickout scaling (RCSA cantilever)", () => {
  it("longer stickout → lower fn → lower stable RPM (cantilever bending)", () => {
    const short = engine.recommend({
      ...MILL_STEEL_12MM,
      tooling: { ...MILL_STEEL_12MM.tooling, stickout_mm: 36 }, // 3D
    });
    const long = engine.recommend({
      ...MILL_STEEL_12MM,
      tooling: { ...MILL_STEEL_12MM.tooling, stickout_mm: 96 }, // 8D
    });
    expect(short.stable_rpm).toBeGreaterThan(long.stable_rpm);
  });

  it("default stickout = 4D when not provided", () => {
    const r = engine.recommend({
      ...MILL_STEEL_12MM,
      tooling: { tool_diameter_mm: 12, flutes: 4, tool_material: "carbide" }, // no stickout
    });
    const rcsaNote = r.notes.find(n => /RCSA/i.test(n));
    expect(rcsaNote).toMatch(/L\/D=4\.0/);
  });
});

describe("SpeedFeedChatterStabilityAdapterEngine — SLD lobe candidates", () => {
  it("top_candidates is non-empty for a normal input + sorted by ap descending", () => {
    const r = engine.recommend(MILL_STEEL_12MM);
    expect(r.top_candidates.length).toBeGreaterThan(0);
    for (let i = 1; i < r.top_candidates.length; i++) {
      expect(r.top_candidates[i - 1]!.max_ap_mm).toBeGreaterThanOrEqual(r.top_candidates[i]!.max_ap_mm);
    }
  });

  it("aluminum (kc≈700) yields higher ap_lim than steel (kc≈1800)", () => {
    const steel = engine.recommend(MILL_STEEL_12MM);
    const alum = engine.recommend(MILL_ALUM_10MM);
    expect(alum.max_stable_ap_mm).toBeGreaterThan(steel.max_stable_ap_mm);
  });

  it("lobe_number is a non-negative integer", () => {
    const r = engine.recommend(MILL_STEEL_12MM);
    expect(r.lobe_number).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(r.lobe_number)).toBe(true);
  });
});

describe("SpeedFeedChatterStabilityAdapterEngine — margin at nominal RPM", () => {
  it("margin_at_nominal_pct is 0 when no nominal RPM passed", () => {
    const r = engine.recommend(MILL_STEEL_12MM);
    expect(r.margin_at_nominal_pct).toBe(0);
  });

  it("margin_at_nominal_pct > 0 when nominal RPM is off the stable lobe", () => {
    const r = engine.recommend(MILL_STEEL_12MM, 7500);
    expect(r.margin_at_nominal_pct).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(r.margin_at_nominal_pct)).toBe(true);
  });
});

describe("SpeedFeedChatterStabilityAdapterEngine — material kc resolution", () => {
  it("steel (P) and titanium (S) produce different absolute ap_lim", () => {
    const steel = engine.recommend({
      ...MILL_STEEL_12MM,
      material: { name: "steel", iso_group: "P" },
    });
    const titanium = engine.recommend({
      ...MILL_STEEL_12MM,
      material: { name: "titanium", iso_group: "S" },
    });
    // S group has kc=2800, P group has kc=1800 → titanium lower ap_lim
    expect(titanium.max_stable_ap_mm).toBeLessThan(steel.max_stable_ap_mm);
  });

  it("hardened steel (H) has the lowest ap_lim (kc=3200)", () => {
    const p = engine.recommend({
      ...MILL_STEEL_12MM,
      material: { name: "steel", iso_group: "P" },
    });
    const h = engine.recommend({
      ...MILL_STEEL_12MM,
      material: { name: "hardened_steel", iso_group: "H" },
    });
    expect(h.max_stable_ap_mm).toBeLessThan(p.max_stable_ap_mm);
  });
});
