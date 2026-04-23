/**
 * GeometryHashGroupingEngine tests (U-LPR-SPLIT)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  GeometryHashGroupingEngine,
  type GeometryRecord,
} from "../../engines/GeometryHashGroupingEngine.js";

let eng: GeometryHashGroupingEngine;

function rec(
  program_id: string,
  customer_id: string,
  overrides: Partial<GeometryRecord> = {},
): GeometryRecord {
  return {
    program_id,
    customer_id,
    material: "D2",
    outer_diameter_mm: 25,
    length_mm: 80,
    feature_topology: ["bore", "groove"],
    tolerance_class: "IT8",
    ...overrides,
  };
}

beforeEach(() => {
  eng = new GeometryHashGroupingEngine();
});

// ──────────────────────────────────────────────────────────────────────
// Material canonicalisation
// ──────────────────────────────────────────────────────────────────────

describe("canonicalizeMaterial", () => {
  it("maps AISI aliases to canonical names", () => {
    expect(eng.canonicalizeMaterial("AISI D2")).toBe("D2");
    expect(eng.canonicalizeMaterial("d2")).toBe("D2");
    expect(eng.canonicalizeMaterial("4140")).toBe("4140");
    expect(eng.canonicalizeMaterial("42CrMo4")).toBe("4140");
    expect(eng.canonicalizeMaterial("1.7225")).toBe("4140");
  });

  it("maps tungsten carbide aliases", () => {
    expect(eng.canonicalizeMaterial("WC-Co")).toBe("WC-Co");
    expect(eng.canonicalizeMaterial("tungsten carbide")).toBe("WC-Co");
    expect(eng.canonicalizeMaterial("carbide")).toBe("WC-Co");
  });

  it("falls back to uppercased slug for unknowns", () => {
    expect(eng.canonicalizeMaterial("Inconel 718")).toBe("INCONEL_718");
  });

  it("rejects empty material", () => {
    expect(() => eng.canonicalizeMaterial("  ")).toThrow(/empty/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// bin5 (5 % dimensional bucketing)
// ──────────────────────────────────────────────────────────────────────

describe("bin5", () => {
  it("nearby values within a log-bucket collide", () => {
    // Log bucketing at 5 % step has centre points; values on the
    // same side of a bucket edge collide. Pick values well within
    // a bucket to verify.
    const a = eng.bin5(25.0);
    const b = eng.bin5(25.2); // +0.8 %
    expect(a).toBe(b);
  });

  it("values 20 %+ apart fall in different buckets", () => {
    const a = eng.bin5(25);
    const d = eng.bin5(35); // +40 %
    expect(a).not.toBe(d);
  });

  it("handles zero / rejects non-finite", () => {
    expect(eng.bin5(0)).toBe("0");
    expect(() => eng.bin5(Number.NaN)).toThrow(/finite/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// geometryHash
// ──────────────────────────────────────────────────────────────────────

describe("geometryHash", () => {
  it("identical geometries produce identical hash", () => {
    const a = eng.geometryHash({
      material: "D2",
      outer_diameter_mm: 25,
      length_mm: 80,
      feature_topology: ["bore", "groove"],
      tolerance_class: "IT8",
    });
    const b = eng.geometryHash({
      material: "AISI D2",
      outer_diameter_mm: 25.5, // within 5 %
      length_mm: 81,           // within 5 %
      feature_topology: ["BORE", "groove"],
      tolerance_class: "IT8",
    });
    expect(a).toBe(b);
  });

  it("different material → different hash", () => {
    const a = eng.geometryHash({
      material: "D2",
      outer_diameter_mm: 25,
      length_mm: 80,
      feature_topology: ["bore"],
      tolerance_class: "IT8",
    });
    const b = eng.geometryHash({
      material: "S7",
      outer_diameter_mm: 25,
      length_mm: 80,
      feature_topology: ["bore"],
      tolerance_class: "IT8",
    });
    expect(a).not.toBe(b);
  });

  it("topology order matters (programs ordered bore-then-groove are distinct)", () => {
    const a = eng.geometryHash({
      material: "D2",
      outer_diameter_mm: 25,
      length_mm: 80,
      feature_topology: ["bore", "groove"],
      tolerance_class: "IT8",
    });
    const b = eng.geometryHash({
      material: "D2",
      outer_diameter_mm: 25,
      length_mm: 80,
      feature_topology: ["groove", "bore"],
      tolerance_class: "IT8",
    });
    expect(a).not.toBe(b);
  });

  it("empty topology rejected", () => {
    expect(() =>
      eng.geometryHash({
        material: "D2",
        outer_diameter_mm: 25,
        length_mm: 80,
        feature_topology: [],
        tolerance_class: "IT8",
      }),
    ).toThrow(/feature_topology/);
  });

  it("returns 16-char lowercase hex", () => {
    const h = eng.geometryHash({
      material: "D2",
      outer_diameter_mm: 25,
      length_mm: 80,
      feature_topology: ["bore"],
      tolerance_class: "IT8",
    });
    expect(h).toMatch(/^[0-9a-f]{16}$/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// assignSplits — nested 80/10/10 customer × geom
// ──────────────────────────────────────────────────────────────────────

describe("assignSplits", () => {
  it("deterministic across runs", () => {
    const recs = Array.from({ length: 40 }, (_, i) =>
      rec(`P${i}`, `CUST${i % 4}`, { outer_diameter_mm: 10 + i * 2 }),
    );
    const a = eng.assignSplits(recs);
    const b = eng.assignSplits(recs);
    expect(a).toEqual(b);
  });

  it("all of a non-train customer's records land in the same split (no leakage)", () => {
    const recs = Array.from({ length: 50 }, (_, i) =>
      rec(`P${i}`, "CUST-X", { outer_diameter_mm: 10 + i * 0.8 }),
    );
    const asg = eng.assignSplits(recs);
    const splits = new Set(asg.map((a) => a.split));
    // CUST-X falls in ONE outer bucket (train, val, or test).
    // If train, records may split into train/val/test; if val or test
    // they must all go to that split.
    if (!splits.has("train")) {
      expect(splits.size).toBe(1);
    } else {
      // When customer is in train, geom inner split MAY produce val+test.
      expect(splits).toContain("train");
    }
  });

  it("rejects records missing ids", () => {
    expect(() =>
      eng.assignSplits([rec("", "C1")]),
    ).toThrow(/program_id/);
    expect(() =>
      eng.assignSplits([rec("P1", "")]),
    ).toThrow(/customer_id/);
  });

  it("empty input → empty output", () => {
    expect(eng.assignSplits([])).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────────────
// summarize
// ──────────────────────────────────────────────────────────────────────

describe("summarize", () => {
  it("counts split sizes + customer distribution", () => {
    const recs = [
      rec("P0", "A"),
      rec("P1", "A", { outer_diameter_mm: 30 }),
      rec("P2", "B", { outer_diameter_mm: 50 }),
      rec("P3", "C"),
    ];
    const asg = eng.assignSplits(recs);
    const s = eng.summarize(recs, asg);
    expect(s.total_records).toBe(4);
    expect(s.unique_customers).toBe(3);
    expect(s.split_counts.train + s.split_counts.val + s.split_counts.test).toBe(4);
    const fracSum = s.split_fractions.train + s.split_fractions.val + s.split_fractions.test;
    expect(fracSum).toBeCloseTo(1, 5);
  });

  it("unique_geometry_hashes tracks twin grouping", () => {
    // Two twins with ±3 % OD → should share a hash
    const recs = [
      rec("P0", "A", { outer_diameter_mm: 25 }),
      rec("P1", "A", { outer_diameter_mm: 25.5 }), // ±2 %
    ];
    const asg = eng.assignSplits(recs);
    const s = eng.summarize(recs, asg);
    expect(s.unique_geometry_hashes).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────────────
// detectLeakage
// ──────────────────────────────────────────────────────────────────────

describe("detectLeakage", () => {
  it("flags high-similarity pairs that land in different splits", () => {
    const recs = [
      rec("P0", "CUST0", { embedding: [1, 0, 0] }),
      rec("P1", "CUST1", { embedding: [0.99, 0.01, 0] }), // ~1.0 similarity, different customer
    ];
    const asg = eng.assignSplits(recs);
    // Force different splits if both customers bucket the same way
    const asgForced = [
      { ...asg[0], split: "train" as const },
      { ...asg[1], split: "test" as const },
    ];
    const leak = eng.detectLeakage(recs, asgForced, 0.95);
    expect(leak.cross_split_pair_count).toBe(1);
    expect(leak.violations[0].splits).toEqual(["train", "test"]);
  });

  it("ignores same-split near-duplicates", () => {
    const recs = [
      rec("P0", "CUST0", { embedding: [1, 0] }),
      rec("P1", "CUST0", { embedding: [0.99, 0.01] }),
    ];
    const asg = eng.assignSplits(recs);
    // Both in same customer → same split
    const leak = eng.detectLeakage(recs, asg, 0.95);
    expect(leak.cross_split_pair_count).toBe(0);
  });

  it("zero records with embeddings → empty leak report", () => {
    const recs = [rec("P0", "A"), rec("P1", "B")];
    const asg = eng.assignSplits(recs);
    const leak = eng.detectLeakage(recs, asg);
    expect(leak.cross_split_pair_count).toBe(0);
    expect(leak.max_knn_similarity).toBe(0);
  });

  it("rejects invalid threshold", () => {
    expect(() =>
      eng.detectLeakage([], [], 0),
    ).toThrow(/similarity_threshold/);
    expect(() =>
      eng.detectLeakage([], [], 1.5),
    ).toThrow(/similarity_threshold/);
  });

  it("rejects mismatched embedding dimensions", () => {
    const recs = [
      rec("P0", "A", { embedding: [1, 0] }),
      rec("P1", "B", { embedding: [1, 0, 0] }),
    ];
    const asg = eng.assignSplits(recs);
    expect(() => eng.detectLeakage(recs, asg, 0.5)).toThrow(/dimension/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// oodDegradation
// ──────────────────────────────────────────────────────────────────────

describe("oodDegradation", () => {
  it("breaches when relative gap exceeds tolerance (15 %)", () => {
    const res = eng.oodDegradation([
      { customer_id: "A", train_metric: 0.90, test_metric: 0.85 }, // 5.5 % ok
      { customer_id: "B", train_metric: 0.90, test_metric: 0.60 }, // 33 % breach
    ]);
    expect(res[0].breaches).toBe(false);
    expect(res[1].breaches).toBe(true);
    expect(res[1].relative_gap).toBeCloseTo(1 / 3, 2);
  });

  it("zero train_metric → no breach (avoids div/0)", () => {
    const res = eng.oodDegradation([
      { customer_id: "A", train_metric: 0, test_metric: 0.5 },
    ]);
    expect(res[0].breaches).toBe(false);
    expect(res[0].relative_gap).toBe(0);
  });

  it("rejects invalid tolerance", () => {
    expect(() => eng.oodDegradation([], 0)).toThrow(/ood_tolerance/);
    expect(() => eng.oodDegradation([], 1.5)).toThrow(/ood_tolerance/);
  });
});
