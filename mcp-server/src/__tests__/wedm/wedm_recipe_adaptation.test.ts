/**
 * WEDMRecipeAdaptationEngine Tests — WEDM AGI Phase 2 / U-P2-11
 *
 * Companion to U-P2-14 (WEDM_TRANSFER_REGISTRY.json). Verifies:
 *   - derive path works when no registry is loaded
 *   - curated overrides win when present
 *   - confidence is lower for more-distant material pairs
 *   - target recipe scales peak-current and pulse-on by nominal ratios
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  WEDMRecipeAdaptationEngine,
  wedmRecipeAdaptationEngine,
  type WEDMRecipe,
} from "../../engines/WEDMRecipeAdaptationEngine.js";

let engine: WEDMRecipeAdaptationEngine;

beforeEach(() => {
  engine = new WEDMRecipeAdaptationEngine();
  // Default derive path tests: force an empty registry so legacy file
  // in data/state/ does not bleed in. Individual tests that need a
  // curated registry call loadRegistry() with their own fixture.
  engine.loadRegistry("/nonexistent/no-such-registry.json");
});

const BASE_RECIPE: WEDMRecipe = {
  peak_current_A: 8,
  pulse_on_us: 10,
  pulse_off_us: 20,
  wire_tension_N: 12,
};

describe("WEDMRecipeAdaptationEngine — derive path (no registry)", () => {
  it("identity transfer returns the same recipe with confidence 1.0", () => {
    const r = engine.adaptRecipe("D2", "D2", BASE_RECIPE);
    expect(r.target_recipe).toEqual(BASE_RECIPE);
    expect(r.factors.confidence).toBe(1);
    expect(r.factors.basis).toBe("derived");
  });

  it("D2 → A2 returns a scaled recipe and basis=derived", () => {
    const r = engine.adaptRecipe("D2", "A2", BASE_RECIPE);
    expect(r.factors.basis).toBe("derived");
    // Both D2 and A2 have peak_current_nominal_A = 8 and pulse_on_nominal_us = 10
    expect(r.target_recipe.peak_current_A).toBeCloseTo(8, 3);
    expect(r.target_recipe.pulse_on_us).toBeCloseTo(10, 3);
  });

  it("D2 → WC yields lower confidence than D2 → A2 (more divergent signatures)", () => {
    const close = engine.adaptRecipe("D2", "A2", BASE_RECIPE);
    const far = engine.adaptRecipe("D2", "WC", BASE_RECIPE);
    expect(far.factors.confidence).toBeLessThan(close.factors.confidence);
  });

  it("D2 → WC warns about low confidence and extreme MRR ratio", () => {
    const r = engine.adaptRecipe("D2", "WC", BASE_RECIPE);
    expect(r.warnings.length).toBeGreaterThan(0);
    // WC has mrr_factor 0.30 vs D2 0.95 → ratio ~0.316, which is < 0.5
    expect(r.factors.mrr_ratio).toBeLessThan(0.5);
  });

  it("graphite → D2 scales peak current down (graphite uses 10A, D2 8A)", () => {
    const r = engine.adaptRecipe("graphite", "D2", BASE_RECIPE);
    // te ratio = 10/8 = 1.25; ie ratio = 8/10 = 0.8
    expect(r.factors.ie_scale).toBeCloseTo(0.8, 3);
    expect(r.factors.te_scale).toBeCloseTo(1.25, 3);
  });
});

describe("WEDMRecipeAdaptationEngine — curated registry overrides", () => {
  it("honours a curated mapping supplied via explicit path", () => {
    const tmpPath = writeTempRegistry([
      {
        from: "D2",
        to: "A2",
        ra_ratio: 0.80,
        mrr_ratio: 1.10,
        wire_wear_ratio: 0.90,
        ie_scale: 1.05,
        te_scale: 0.95,
        confidence: 0.92,
        basis: "curated test override",
      },
    ]);
    const loaded = engine.loadRegistry(tmpPath);
    expect(loaded).toBe(1);
    const f = engine.getFactors("D2", "A2");
    expect(f.basis).toBe("curated");
    expect(f.ra_ratio).toBeCloseTo(0.80, 6);
    expect(f.confidence).toBeCloseTo(0.92, 6);
  });

  it("falls back to derived when no curated mapping for a pair", () => {
    const tmpPath = writeTempRegistry([
      {
        from: "D2",
        to: "A2",
        ra_ratio: 0.80,
        mrr_ratio: 1.10,
        wire_wear_ratio: 0.90,
        ie_scale: 1.05,
        te_scale: 0.95,
        confidence: 0.92,
        basis: "curated",
      },
    ]);
    engine.loadRegistry(tmpPath);
    const f = engine.getFactors("D2", "WC");
    expect(f.basis).toBe("derived");
  });

  it("loadRegistry returns 0 when file does not exist and does not throw", () => {
    const loaded = engine.loadRegistry("/nonexistent/path/registry.json");
    expect(loaded).toBe(0);
    const f = engine.getFactors("D2", "A2");
    expect(f.basis).toBe("derived");
  });
});

describe("WEDMRecipeAdaptationEngine — coverage enumeration", () => {
  it("coveragePairs enumerates every ordered pair of the 12 spark-DB materials", () => {
    const pairs = engine.coveragePairs();
    // 12 materials × 11 others = 132 directed pairs
    expect(pairs.length).toBe(132);
    expect(pairs.every((p) => p.from !== p.to)).toBe(true);
  });

  it("every coverage pair has basis 'curated' or 'derived'", () => {
    const pairs = engine.coveragePairs();
    for (const p of pairs) {
      expect(["curated", "derived"]).toContain(p.basis);
    }
  });
});

describe("WEDMRecipeAdaptationEngine — validation", () => {
  it("throws on zero or negative peak_current", () => {
    expect(() =>
      engine.adaptRecipe("D2", "A2", { ...BASE_RECIPE, peak_current_A: 0 }),
    ).toThrow(/peak_current_A/);
  });

  it("throws on NaN pulse_on", () => {
    expect(() =>
      engine.adaptRecipe("D2", "A2", { ...BASE_RECIPE, pulse_on_us: NaN }),
    ).toThrow(/pulse_on_us/);
  });
});

describe("WEDMRecipeAdaptationEngine — singleton", () => {
  it("exposes a singleton for dispatcher use", () => {
    expect(wedmRecipeAdaptationEngine).toBeInstanceOf(
      WEDMRecipeAdaptationEngine,
    );
  });
});

// ────────────────────────── helpers ──────────────────────────

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function writeTempRegistry(mappings: unknown[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wedm-reg-"));
  const file = path.join(dir, "WEDM_TRANSFER_REGISTRY.json");
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        schemaVersion: 1,
        generated: new Date().toISOString(),
        source: "test fixture",
        mappings,
      },
      null,
      2,
    ),
  );
  return file;
}
