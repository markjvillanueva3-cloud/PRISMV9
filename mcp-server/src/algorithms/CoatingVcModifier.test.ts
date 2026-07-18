/**
 * CoatingVcModifier tests (U-PF-COATING) -- reference-value + material-gate + fail-safe coverage.
 *
 * Reference values derive from coatings.json speedMult (rel-uncoated):
 *   uncoated 1.0, TiN 1.15, TiCN 1.2, TiAlN 1.3, AlTiN 1.4, AlCrN 1.35, DLC 1.25, diamond 1.5.
 * The factor is ALWAYS speedMult[user]/speedMult[regimeBaseline], clamped <= 1.0 by the material gate
 * when the user coating is not in goodCoatings[material] and != the baseline.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  getMultipliers,
  CoatingVcModifier,
  COATING_SPEED_MULT,
  COATING_GOOD_COATINGS,
} from "./CoatingVcModifier.js";

const vc = (i: Parameters<typeof getMultipliers>[0]) => getMultipliers(i).vc_multiplier.value;

describe("CoatingVcModifier -- relative-to-baseline factor", () => {
  it("identity: user coating == regime baseline -> 1.0 (default-call byte-identical)", () => {
    expect(vc({ iso_group: "P", user_coating: "AlTiN", baseline_coating: "AlTiN" })).toBe(1.0);
  });

  it("better-than-baseline on steel: AlTiN vs uncoated baseline -> 1.4 (40% faster)", () => {
    // P-group steel: AlTiN IS in goodCoatings[steel] -> the boost applies.
    expect(vc({ iso_group: "P", user_coating: "AlTiN", baseline_coating: "uncoated" })).toBeCloseTo(1.4, 5);
  });

  it("weaker-than-baseline: TiAlN vs AlTiN baseline -> 1.3/1.4 = 0.929 (derate, fail-safe)", () => {
    expect(vc({ iso_group: "P", user_coating: "TiAlN", baseline_coating: "AlTiN" })).toBeCloseTo(1.3 / 1.4, 5);
  });

  it("much-weaker: uncoated vs AlTiN baseline -> 1.0/1.4 = 0.714 (big derate, never over-speeds)", () => {
    expect(vc({ iso_group: "P", user_coating: "uncoated", baseline_coating: "AlTiN" })).toBeCloseTo(1.0 / 1.4, 5);
  });

  it("normalizes a 'PVD '-prefixed baseline: AlTiN vs 'PVD TiAlN' -> 1.4/1.3", () => {
    expect(vc({ iso_group: "P", user_coating: "AlTiN", baseline_coating: "PVD TiAlN" })).toBeCloseTo(1.4 / 1.3, 5);
  });

  it("case/space-insensitive user coating: 'al tin' == AlTiN", () => {
    expect(vc({ iso_group: "P", user_coating: "al tin", baseline_coating: "TiAlN" })).toBeCloseTo(1.4 / 1.3, 5);
  });
});

describe("CoatingVcModifier -- material gate (no wrong-signed boost)", () => {
  it("AlTiN on aluminium (N) vs uncoated baseline: CLAMPED to 1.0 (nitride not advised on N)", () => {
    // 1.4/1.0 = 1.4 raw, but AlTiN is not in goodCoatings[aluminum] -> clamp to 1.0, with a warning.
    const r = getMultipliers({ iso_group: "N", user_coating: "AlTiN", baseline_coating: "uncoated" });
    expect(r.vc_multiplier.value).toBe(1.0);
    expect(r.notes.some((n) => /not advised for aluminum/i.test(n))).toBe(true);
  });

  it("DLC on aluminium (N) vs uncoated baseline: APPLIED 1.25 (DLC IS suited to aluminium)", () => {
    expect(vc({ iso_group: "N", user_coating: "DLC", baseline_coating: "uncoated" })).toBeCloseTo(1.25, 5);
  });

  it("material gate only clamps a boost, never blocks a derate on an unsuited coating", () => {
    // TiN on aluminium vs DLC baseline: 1.15/1.25 = 0.92 < 1.0 -> derate is allowed through (no clamp).
    expect(vc({ iso_group: "N", user_coating: "TiN", baseline_coating: "DLC" })).toBeCloseTo(1.15 / 1.25, 5);
  });

  it("AlTiN on steel (P) is suited -> boost NOT clamped (gate is material-specific)", () => {
    expect(vc({ iso_group: "P", user_coating: "AlTiN", baseline_coating: "uncoated" })).toBeCloseTo(1.4, 5);
  });
});

describe("CoatingVcModifier -- fail-safe (never over-speeds on an undefined ratio)", () => {
  it("no user coating -> 1.0 (byte-identical default)", () => {
    expect(vc({ iso_group: "P", baseline_coating: "AlTiN" })).toBe(1.0);
    expect(vc({ iso_group: "P", user_coating: "", baseline_coating: "AlTiN" })).toBe(1.0);
  });

  it("unresolved CVD/multilayer baseline -> 1.0 (e.g. K-turning 'CVD TiCN+Al2O3')", () => {
    expect(vc({ iso_group: "K", user_coating: "AlTiN", baseline_coating: "CVD TiCN+Al2O3" })).toBe(1.0);
  });

  it("unresolved superhard user coating (CBN/cermet) -> 1.0", () => {
    expect(vc({ iso_group: "K", user_coating: "CBN", baseline_coating: "AlTiN" })).toBe(1.0);
    expect(vc({ iso_group: "K", user_coating: "cermet", baseline_coating: "AlTiN" })).toBe(1.0);
  });

  it("unknown iso_group -> 1.0", () => {
    expect(vc({ iso_group: "Z" as any, user_coating: "AlTiN", baseline_coating: "uncoated" })).toBe(1.0);
  });

  it("missing input object -> 1.0 (never throws)", () => {
    expect(vc(undefined as any)).toBe(1.0);
  });

  it("ZrN baseline (in goodCoatings but NOT in speedMult) is unresolved -> 1.0", () => {
    // N_milling lists ZrN as a regime coating, but coatingFactors has no ZrN speedMult -> fail-safe.
    expect(vc({ iso_group: "N", user_coating: "DLC", baseline_coating: "ZrN" })).toBe(1.0);
  });
});

describe("CoatingVcModifier -- provenance + bounds", () => {
  it("emits a notes array + source on every call", () => {
    const r = getMultipliers({ iso_group: "P", user_coating: "AlTiN", baseline_coating: "TiAlN" });
    expect(Array.isArray(r.notes)).toBe(true);
    expect(r.source).toContain("CoatingVcModifier");
    expect(r.vc_multiplier.unit).toBe("ratio");
  });

  it("factor stays within the speedMult-ratio envelope [diamond/uncoated, uncoated/diamond] = [0.5, 1.5]", () => {
    // diamond(1.5) vs uncoated(1.0) baseline on steel: 1.5 is the max realizable boost; gate may clamp on N.
    const hi = vc({ iso_group: "P", user_coating: "diamond", baseline_coating: "uncoated" });
    const lo = vc({ iso_group: "P", user_coating: "uncoated", baseline_coating: "diamond" });
    expect(hi).toBeLessThanOrEqual(1.5);
    expect(lo).toBeGreaterThanOrEqual(1 / 1.5 - 1e-9);
  });

  it("exposes a version on the namespace", () => {
    expect(CoatingVcModifier.version).toBe("1.0.0");
  });
});

describe("CoatingVcModifier -- drift guard (inlined maps == coatings.json reference DB)", () => {
  const db = JSON.parse(
    readFileSync(new URL("../../data/prism-reference-db/coatings.json", import.meta.url), "utf8"),
  );
  const norm = (s: string) => s.trim().toUpperCase().replace(/^PVD[\s_-]+/, "").replace(/\s+/g, "");

  it("COATING_SPEED_MULT == coatings.json stores.coatingFactors[*].speedMult (bijection)", () => {
    const cf = db.stores.coatingFactors as Record<string, { speedMult: number }>;
    // every reference-DB speedMult is faithfully inlined
    for (const [name, spec] of Object.entries(cf)) {
      expect(COATING_SPEED_MULT[norm(name)], `speedMult drift for '${name}'`).toBe(spec.speedMult);
    }
    // and no inlined key exists without a reference-DB source (no fabricated multiplier)
    const dbKeys = new Set(Object.keys(cf).map(norm));
    for (const key of Object.keys(COATING_SPEED_MULT)) {
      expect(dbKeys.has(key), `inlined '${key}' has no coatings.json source`).toBe(true);
    }
  });

  it("COATING_GOOD_COATINGS == coatings.json stores.goodCoatings (every material bucket)", () => {
    const gc = db.stores.goodCoatings as Record<string, string[]>;
    for (const [material, list] of Object.entries(gc)) {
      expect(COATING_GOOD_COATINGS[material] instanceof Set, `bucket '${material}' missing`).toBe(true);
      expect([...COATING_GOOD_COATINGS[material]].sort()).toEqual([...list.map(norm)].sort());
    }
  });
});
