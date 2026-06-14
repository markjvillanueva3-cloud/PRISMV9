/**
 * Tests for SinkerElectrodeCostEngine — sinker-EDM electrode cost model
 * (ARC-MS6 / muS-C25).
 *
 * The engine is pure and deterministic, so every expected value below is
 * hand-computed from the documented model — each assertion fails if the
 * arithmetic, the wear→count semantics, the cost-driver ranking, the
 * advisory-note thresholds, or the input validation regress.
 *
 * Canonical case used throughout (graphite_fine, all defaults):
 *   electrode_volume_mm3 = 10000, num_electrodes = 3, burn_time_min = 120
 *   blank      = 10000 × 1.5            = 15000 mm³ (15 cm³)
 *   removed    = 15000 − 10000          = 5000 mm³
 *   material/ea= 15 cm³ × $1.4/cm³      = $21.00
 *   mill_time  = 5000/5000 + 10         = 11 min
 *   milling/ea = 11/60 × $75            = $13.75
 *   setup/ea   = 15/60 × $75            = $18.75
 *   fab/ea     = 21 + 13.75 + 18.75     = $53.50
 *   set totals (×3): material 63, milling 41.25, setup 56.25 → fab 160.50
 *   burn       = 120/60 × $85           = $170.00  (job total — NOT ×3)
 *   total      = 160.50 + 170.00        = $330.50
 */

import { describe, it, expect } from "vitest";
import {
  SinkerElectrodeCostEngine,
  sinkerElectrodeCostEngine,
} from "../engines/SinkerElectrodeCostEngine.js";

/** The canonical graphite_fine / all-defaults input. */
function canonicalInput() {
  return {
    electrode_volume_mm3: 10000,
    num_electrodes: 3,
    electrode_material: "graphite_fine" as const,
    burn_time_min: 120,
  };
}

describe("SinkerElectrodeCostEngine — cost arithmetic", () => {
  it("computes the full four-component cost breakdown for the canonical case", () => {
    const r = sinkerElectrodeCostEngine.estimate(canonicalInput());
    expect(r.material_cost).toBeCloseTo(63, 2);
    expect(r.milling_cost).toBeCloseTo(41.25, 2);
    expect(r.setup_cost).toBeCloseTo(56.25, 2);
    expect(r.burn_cost).toBeCloseTo(170, 2);
    expect(r.total_fab_cost).toBeCloseTo(160.5, 2);
    expect(r.total_cost).toBeCloseTo(330.5, 2);
    expect(r.currency).toBe("USD");
    expect(r.num_electrodes).toBe(3);
    expect(r.electrode_material).toBe("graphite_fine");
  });

  it("computes the per-electrode fabrication breakdown", () => {
    const r = sinkerElectrodeCostEngine.estimate(canonicalInput());
    expect(r.per_electrode.blank_volume_cm3).toBeCloseTo(15, 3);
    expect(r.per_electrode.removed_volume_mm3).toBeCloseTo(5000, 3);
    expect(r.per_electrode.milling_time_min).toBeCloseTo(11, 3);
    expect(r.per_electrode.material_cost).toBeCloseTo(21, 2);
    expect(r.per_electrode.milling_cost).toBeCloseTo(13.75, 2);
    expect(r.per_electrode.setup_cost).toBeCloseTo(18.75, 2);
    expect(r.per_electrode.fab_cost).toBeCloseTo(53.5, 2);
  });

  it("keeps total_cost = total_fab_cost + burn_cost and fab = material+milling+setup", () => {
    // Use a non-canonical input so the invariant is not trivially satisfied.
    const r = sinkerElectrodeCostEngine.estimate({
      electrode_volume_mm3: 24000,
      num_electrodes: 5,
      electrode_material: "copper",
      burn_time_min: 73,
    });
    expect(r.total_fab_cost).toBeCloseTo(
      r.material_cost + r.milling_cost + r.setup_cost,
      2,
    );
    expect(r.total_cost).toBeCloseTo(r.total_fab_cost + r.burn_cost, 2);
    // Cost-driver percentages sum to ~100 on a non-canonical case too.
    expect(r.cost_drivers.reduce((s, d) => s + d.pct, 0)).toBeCloseTo(100, 1);
  });

  it("scales material/milling/setup by num_electrodes (set total = per-electrode × n)", () => {
    const r = sinkerElectrodeCostEngine.estimate(canonicalInput());
    expect(r.material_cost).toBeCloseTo(r.per_electrode.material_cost * 3, 2);
    expect(r.milling_cost).toBeCloseTo(r.per_electrode.milling_cost * 3, 2);
    expect(r.setup_cost).toBeCloseTo(r.per_electrode.setup_cost * 3, 2);
  });
});

describe("SinkerElectrodeCostEngine — burn vs fabrication distinction", () => {
  it("does NOT multiply burn cost by num_electrodes (burn is a job total)", () => {
    const base = canonicalInput();
    const small = sinkerElectrodeCostEngine.estimate({
      ...base,
      num_electrodes: 2,
    });
    const large = sinkerElectrodeCostEngine.estimate({
      ...base,
      num_electrodes: 8,
    });
    // Burn time is identical → burn cost must be identical regardless of count.
    expect(small.burn_cost).toBeCloseTo(large.burn_cost, 2);
    expect(small.burn_cost).toBeCloseTo(170, 2);
  });

  it("attributes the whole count delta to fabrication, none to burn", () => {
    const base = canonicalInput();
    const n2 = sinkerElectrodeCostEngine.estimate({ ...base, num_electrodes: 2 });
    const n8 = sinkerElectrodeCostEngine.estimate({ ...base, num_electrodes: 8 });
    const totalDelta = n8.total_cost - n2.total_cost;
    const fabDelta = n8.total_fab_cost - n2.total_fab_cost;
    // If burn were wrongly ×count, totalDelta would exceed fabDelta.
    expect(totalDelta).toBeCloseTo(fabDelta, 2);
    // 6 extra electrodes × $53.50 fab each = $321.00.
    expect(fabDelta).toBeCloseTo(321, 2);
  });
});

describe("SinkerElectrodeCostEngine — material catalog & overrides", () => {
  it("uses the per-material cost catalog (graphite is dearer per cm³ than copper)", () => {
    const common = { electrode_volume_mm3: 10000, num_electrodes: 1, burn_time_min: 0 };
    const graphite = sinkerElectrodeCostEngine.estimate({
      ...common,
      electrode_material: "graphite_fine",
    });
    const copper = sinkerElectrodeCostEngine.estimate({
      ...common,
      electrode_material: "copper",
    });
    // graphite_fine $1.4/cm³ vs copper $0.13/cm³ — same blank volume.
    expect(graphite.per_electrode.material_cost).toBeGreaterThan(
      copper.per_electrode.material_cost,
    );
    expect(graphite.per_electrode.material_cost).toBeCloseTo(21, 2);
    expect(copper.per_electrode.material_cost).toBeCloseTo(1.95, 2);
  });

  it("uses the per-material milling MRR (copper mills slower than graphite)", () => {
    const common = { electrode_volume_mm3: 10000, num_electrodes: 1, burn_time_min: 0 };
    const graphite = sinkerElectrodeCostEngine.estimate({
      ...common,
      electrode_material: "graphite_fine",
    });
    const copper = sinkerElectrodeCostEngine.estimate({
      ...common,
      electrode_material: "copper",
    });
    // copper MRR 1200 vs graphite 5000 mm³/min → copper takes longer to mill.
    expect(copper.per_electrode.milling_time_min).toBeGreaterThan(
      graphite.per_electrode.milling_time_min,
    );
  });

  it("honours a material_cost_per_cm3 override instead of the catalog", () => {
    const r = sinkerElectrodeCostEngine.estimate({
      ...canonicalInput(),
      material_cost_per_cm3: 2.5,
    });
    // 15 cm³ blank × $2.5/cm³ = $37.50/ea (not the $21 catalog value).
    expect(r.per_electrode.material_cost).toBeCloseTo(37.5, 2);
    expect(
      r.assumptions.some((a) => a.includes("material_cost_per_cm3")),
    ).toBe(false);
  });

  it("records no assumptions when every rate is explicitly supplied", () => {
    const r = sinkerElectrodeCostEngine.estimate({
      ...canonicalInput(),
      stock_oversize_factor: 1.6,
      material_cost_per_cm3: 1.0,
      milling_mrr_mm3_per_min: 4000,
      mill_rate_per_hr: 80,
      edm_rate_per_hr: 90,
      setup_min_per_electrode: 12,
      finish_overhead_min: 8,
    });
    expect(r.assumptions).toHaveLength(0);
  });
});

describe("SinkerElectrodeCostEngine — cost drivers", () => {
  it("ranks cost drivers high → low and names burn as the canonical top driver", () => {
    const r = sinkerElectrodeCostEngine.estimate(canonicalInput());
    expect(r.cost_drivers).toHaveLength(4);
    expect(r.cost_drivers.map((d) => d.component).sort()).toEqual([
      "burn",
      "material",
      "milling",
      "setup",
    ]);
    for (let i = 1; i < r.cost_drivers.length; i++) {
      expect(r.cost_drivers[i - 1].cost).toBeGreaterThanOrEqual(
        r.cost_drivers[i].cost,
      );
    }
    // burn $170 is the largest of {170, 63, 56.25, 41.25}.
    expect(r.cost_drivers[0].component).toBe("burn");
  });

  it("emits cost-driver percentages that sum to ~100% of total_cost", () => {
    const r = sinkerElectrodeCostEngine.estimate(canonicalInput());
    const pctSum = r.cost_drivers.reduce((s, d) => s + d.pct, 0);
    expect(pctSum).toBeCloseTo(100, 1);
    // burn $170 of $330.50 total → 51.44% (hand-computed literal, not re-derived).
    expect(r.cost_drivers[0].pct).toBeCloseTo(51.44, 2);
  });
});

describe("SinkerElectrodeCostEngine — advisory notes", () => {
  it("warns when the electrode wear ratio is above the 40% threshold", () => {
    const high = sinkerElectrodeCostEngine.estimate({
      ...canonicalInput(),
      wear_ratio_pct: 55,
    });
    expect(
      high.notes.some(
        (n) => n.toLowerCase().includes("wear ratio") && n.includes("55"),
      ),
    ).toBe(true);
  });

  it("does not emit a wear note when the wear ratio is below the threshold", () => {
    const low = sinkerElectrodeCostEngine.estimate({
      ...canonicalInput(),
      wear_ratio_pct: 20,
    });
    expect(low.notes.some((n) => n.toLowerCase().includes("wear ratio"))).toBe(
      false,
    );
  });

  it("flags milling time as an optimistic estimate for a large removed volume", () => {
    // volume 300000 × (1.5 − 1) = 150000 mm³ removed (> 100 cm³ threshold).
    const r = sinkerElectrodeCostEngine.estimate({
      ...canonicalInput(),
      electrode_volume_mm3: 300000,
    });
    // "lower-bound estimate" is unique to the large-removed note (the
    // copper-tungsten note also contains the words "large removed volume").
    expect(
      r.notes.some((n) => n.toLowerCase().includes("lower-bound estimate")),
    ).toBe(true);
  });

  it("suggests a near-net blank for copper-tungsten with a large removed volume", () => {
    // volume 120000 × 0.5 = 60000 mm³ removed (> 50000, < 100000) — trips the
    // near-net note but NOT the large-removed note, isolating the branch.
    const r = sinkerElectrodeCostEngine.estimate({
      electrode_volume_mm3: 120000,
      num_electrodes: 2,
      electrode_material: "copper_tungsten",
      burn_time_min: 200,
    });
    expect(r.notes.some((n) => n.toLowerCase().includes("near-net"))).toBe(true);
    // The large-removed note (unique marker "lower-bound estimate") must NOT
    // fire here — removed 60000 mm³ is below the 100000 threshold.
    expect(
      r.notes.some((n) => n.toLowerCase().includes("lower-bound estimate")),
    ).toBe(false);
  });

  it("suppresses the near-net note when an MRR override is supplied", () => {
    // Same copper-tungsten + large-removed geometry, but milling_mrr is now
    // explicit — the near-net advisory is keyed on MRR being a default value.
    const r = sinkerElectrodeCostEngine.estimate({
      electrode_volume_mm3: 120000,
      num_electrodes: 2,
      electrode_material: "copper_tungsten",
      burn_time_min: 200,
      milling_mrr_mm3_per_min: 5000,
    });
    expect(r.notes.some((n) => n.toLowerCase().includes("near-net"))).toBe(
      false,
    );
  });
});

describe("SinkerElectrodeCostEngine — defaults & edge cases", () => {
  it("notes when stock_oversize_factor is left at its 1.5 default", () => {
    const r = sinkerElectrodeCostEngine.estimate(canonicalInput());
    expect(
      r.notes.some((n) => n.includes("stock_oversize_factor at default")),
    ).toBe(true);
  });

  it("records every applied default in the assumptions list", () => {
    // The canonical input supplies no optional field → all 7 rate/factor
    // defaults are applied, and each must be recorded by name.
    const r = sinkerElectrodeCostEngine.estimate(canonicalInput());
    expect(r.assumptions).toHaveLength(7);
    expect(
      r.assumptions.some(
        (a) =>
          a.includes("material_cost_per_cm3") && a.includes("graphite_fine"),
      ),
    ).toBe(true);
    expect(
      r.assumptions.some((a) => a.includes("stock_oversize_factor")),
    ).toBe(true);
    expect(r.assumptions.some((a) => a.includes("edm_rate_per_hr"))).toBe(true);
  });

  it("treats an oversize factor of exactly 1 as zero removed volume", () => {
    const r = sinkerElectrodeCostEngine.estimate({
      ...canonicalInput(),
      stock_oversize_factor: 1,
    });
    expect(r.per_electrode.removed_volume_mm3).toBe(0);
    // milling time then collapses to just the finishing overhead (10 min).
    expect(r.per_electrode.milling_time_min).toBeCloseTo(10, 3);
  });

  it("is deterministic — identical input yields identical output", () => {
    const a = sinkerElectrodeCostEngine.estimate(canonicalInput());
    const b = sinkerElectrodeCostEngine.estimate(canonicalInput());
    expect(a).toEqual(b);
  });

  it("works through a freshly constructed engine instance, not only the singleton", () => {
    const fresh = new SinkerElectrodeCostEngine();
    const r = fresh.estimate(canonicalInput());
    expect(r.total_cost).toBeCloseTo(330.5, 2);
  });
});

describe("SinkerElectrodeCostEngine — input validation", () => {
  it("rejects missing required fields", () => {
    expect(() => sinkerElectrodeCostEngine.estimate({})).toThrow();
    expect(() =>
      sinkerElectrodeCostEngine.estimate({ electrode_volume_mm3: 10000 }),
    ).toThrow();
  });

  it("rejects non-positive, non-finite and out-of-range numbers", () => {
    const base = canonicalInput();
    expect(() =>
      sinkerElectrodeCostEngine.estimate({ ...base, electrode_volume_mm3: 0 }),
    ).toThrow();
    expect(() =>
      sinkerElectrodeCostEngine.estimate({ ...base, electrode_volume_mm3: -5 }),
    ).toThrow();
    expect(() =>
      sinkerElectrodeCostEngine.estimate({
        ...base,
        electrode_volume_mm3: Number.POSITIVE_INFINITY,
      }),
    ).toThrow();
    expect(() =>
      sinkerElectrodeCostEngine.estimate({ ...base, electrode_volume_mm3: NaN }),
    ).toThrow();
    // Above the 1e9 ceiling — rejected so no intermediate overflows to Infinity.
    expect(() =>
      sinkerElectrodeCostEngine.estimate({ ...base, electrode_volume_mm3: 2e9 }),
    ).toThrow();
    expect(() =>
      sinkerElectrodeCostEngine.estimate({ ...base, burn_time_min: -1 }),
    ).toThrow();
  });

  it("rejects bad num_electrodes, bad material, and sub-floor milling MRR", () => {
    const base = canonicalInput();
    expect(() =>
      sinkerElectrodeCostEngine.estimate({ ...base, num_electrodes: 0 }),
    ).toThrow();
    expect(() =>
      sinkerElectrodeCostEngine.estimate({ ...base, num_electrodes: 2.5 }),
    ).toThrow();
    expect(() =>
      sinkerElectrodeCostEngine.estimate({ ...base, num_electrodes: 5000 }),
    ).toThrow();
    expect(() =>
      sinkerElectrodeCostEngine.estimate({
        ...base,
        electrode_material: "titanium",
      }),
    ).toThrow();
    expect(() =>
      sinkerElectrodeCostEngine.estimate({ ...base, stock_oversize_factor: 0.5 }),
    ).toThrow();
    expect(() =>
      sinkerElectrodeCostEngine.estimate({
        ...base,
        milling_mrr_mm3_per_min: 0.5,
      }),
    ).toThrow();
  });

  it("rejects unknown keys and throws an engine-named, descriptive error", () => {
    expect(() =>
      sinkerElectrodeCostEngine.estimate({
        ...canonicalInput(),
        bogus_field: 1,
      }),
    ).toThrow();
    expect(() => sinkerElectrodeCostEngine.estimate({})).toThrow(
      /SinkerElectrodeCostEngine: invalid input/,
    );
  });
});
