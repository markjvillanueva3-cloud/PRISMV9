/**
 * WEDM_TRANSFER_REGISTRY.json Tests — WEDM AGI Phase 2 / U-P2-14
 *
 * Exit gate: the shipped registry at data/state/WEDM_TRANSFER_REGISTRY.json
 * loads into WEDMRecipeAdaptationEngine with ≥20 curated mappings, and
 * every mapping references a known spark-DB material key.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  WEDMRecipeAdaptationEngine,
} from "../../engines/WEDMRecipeAdaptationEngine.js";
import {
  wedmMaterialSparkDatabaseEngine,
  type WEDMMaterialKey,
} from "../../engines/WEDMMaterialSparkDatabaseEngine.js";

const REGISTRY_PATH = path.join(
  process.cwd(),
  "data",
  "state",
  "WEDM_TRANSFER_REGISTRY.json",
);

describe("WEDM_TRANSFER_REGISTRY.json — exit gate", () => {
  it("loads ≥20 curated mappings into the engine", () => {
    const engine = new WEDMRecipeAdaptationEngine();
    const count = engine.loadRegistry(REGISTRY_PATH);
    expect(count).toBeGreaterThanOrEqual(20);
  });

  it("schemaVersion is 2 and source metadata is present", () => {
    const raw = fs.readFileSync(REGISTRY_PATH, "utf8");
    const parsed = JSON.parse(raw) as {
      schemaVersion: number;
      source?: string;
      description?: string;
      mappings?: unknown[];
    };
    expect(parsed.schemaVersion).toBe(2);
    expect(typeof parsed.source === "string" && parsed.source.length > 0).toBe(
      true,
    );
    expect(Array.isArray(parsed.mappings)).toBe(true);
    expect(parsed.mappings!.length).toBeGreaterThanOrEqual(20);
  });
});

describe("WEDM_TRANSFER_REGISTRY.json — content validation", () => {
  it("every mapping references known WEDM material keys", () => {
    const raw = fs.readFileSync(REGISTRY_PATH, "utf8");
    const parsed = JSON.parse(raw) as {
      mappings: Array<{
        from: string;
        to: string;
        [k: string]: unknown;
      }>;
    };
    const known = new Set(
      wedmMaterialSparkDatabaseEngine.list().map((s) => s.key as string),
    );
    for (const m of parsed.mappings) {
      expect(
        known.has(m.from),
        `from=${m.from} missing from spark DB`,
      ).toBe(true);
      expect(known.has(m.to), `to=${m.to} missing from spark DB`).toBe(true);
      expect(m.from).not.toBe(m.to);
    }
  });

  it("every mapping has positive ratios and a 0..1 confidence", () => {
    const raw = fs.readFileSync(REGISTRY_PATH, "utf8");
    const parsed = JSON.parse(raw) as {
      mappings: Array<{
        ra_ratio: number;
        mrr_ratio: number;
        wire_wear_ratio: number;
        ie_scale: number;
        te_scale: number;
        confidence: number;
        basis: string;
      }>;
    };
    for (const m of parsed.mappings) {
      expect(m.ra_ratio).toBeGreaterThan(0);
      expect(m.mrr_ratio).toBeGreaterThan(0);
      expect(m.wire_wear_ratio).toBeGreaterThan(0);
      expect(m.ie_scale).toBeGreaterThan(0);
      expect(m.te_scale).toBeGreaterThan(0);
      expect(m.confidence).toBeGreaterThan(0);
      expect(m.confidence).toBeLessThanOrEqual(1);
      expect(typeof m.basis === "string" && m.basis.length > 0).toBe(true);
    }
  });

  it("no duplicate (from, to) ordered pairs", () => {
    const raw = fs.readFileSync(REGISTRY_PATH, "utf8");
    const parsed = JSON.parse(raw) as {
      mappings: Array<{ from: string; to: string }>;
    };
    const seen = new Set<string>();
    for (const m of parsed.mappings) {
      const key = `${m.from}::${m.to}`;
      expect(seen.has(key), `duplicate ordered pair ${key}`).toBe(false);
      seen.add(key);
    }
  });

  it("covers every JM Die portfolio material at least once in each direction", () => {
    const raw = fs.readFileSync(REGISTRY_PATH, "utf8");
    const parsed = JSON.parse(raw) as {
      mappings: Array<{ from: string; to: string }>;
    };
    const jmDiePortfolio: WEDMMaterialKey[] = [
      "D2",
      "A2",
      "M2",
      "S7",
      "H13",
      "WC",
      "graphite",
    ];
    for (const m of jmDiePortfolio) {
      const appearsAsFrom = parsed.mappings.some((x) => x.from === m);
      const appearsAsTo = parsed.mappings.some((x) => x.to === m);
      expect(appearsAsFrom, `${m} never appears as 'from'`).toBe(true);
      expect(appearsAsTo, `${m} never appears as 'to'`).toBe(true);
    }
  });
});

describe("WEDMRecipeAdaptationEngine — engine adapts using the shipped registry", () => {
  it("curated mapping beats a fresh derive for D2→A2 (confidence should match)", () => {
    const engine = new WEDMRecipeAdaptationEngine();
    engine.loadRegistry(REGISTRY_PATH);
    const f = engine.getFactors("D2", "A2");
    expect(f.basis).toBe("curated");
    expect(f.confidence).toBeCloseTo(0.92, 3);
  });

  it("D2→WC curated mapping signals a low-confidence transfer (<0.75)", () => {
    const engine = new WEDMRecipeAdaptationEngine();
    engine.loadRegistry(REGISTRY_PATH);
    const f = engine.getFactors("D2", "WC");
    expect(f.basis).toBe("curated");
    expect(f.confidence).toBeLessThan(0.75);
  });

  it("adaptRecipe on D2→S7 uses the curated te_scale=1.4 for pulse-on", () => {
    const engine = new WEDMRecipeAdaptationEngine();
    engine.loadRegistry(REGISTRY_PATH);
    const r = engine.adaptRecipe("D2", "S7", {
      peak_current_A: 8,
      pulse_on_us: 10,
      pulse_off_us: 20,
      wire_tension_N: 12,
    });
    expect(r.factors.basis).toBe("curated");
    // pulse_on target = 10 × 1.4 = 14
    expect(r.target_recipe.pulse_on_us).toBeCloseTo(14, 3);
    // peak current target = 8 × 1.125 = 9
    expect(r.target_recipe.peak_current_A).toBeCloseTo(9, 3);
  });
});
