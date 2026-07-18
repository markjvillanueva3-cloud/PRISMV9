/**
 * Tests for U-QP-COST-BASIS-NORMALIZE wiring (slot:charlie 2026-06-12).
 * VendorCostIndexEngine material-cost-basis methods + a round-trip THROUGH the
 * prism_quoting `material_cost_basis` dispatcher action (real enum -> schema ->
 * case path, NOT the singleton in isolation). Hermetic fixture via basisPath
 * override -- no dependency on the gitignored real jm-material-cost-basis.json.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { registerQuotingDispatcher } from "../tools/dispatchers/quotingDispatcher.js";
import { vendorCostIndexEngine } from "../engines/VendorCostIndexEngine.js";

type Handler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }>;
function makeServer(): Handler {
  let captured: Handler | null = null;
  registerQuotingDispatcher({ tool: (_n: string, _d: string, _s: unknown, h: Handler) => { captured = h; } });
  return captured!;
}
const parse = (out: { content: Array<{ type: "text"; text: string }> }) => JSON.parse(out.content[0].text);

// Hermetic per-grade basis fixture: H13 high-conf, D2 low-n, 4340 advisory-only(none).
const FIXTURE = {
  schemaVersion: "1.0.0",
  generated_at: "2026-06-12T00:00:00.000Z",
  source: "synthetic-test-fixture",
  summary: { total_rows: 100, resolved: 30, resolved_pct: 30, grade_count: 3, consumable_grade_count: 2, unresolved_reasons: {} },
  grades: {
    H13: { usd_per_in3: 1.5, confidence: "high", block_n: 12, block_iqr: { p25: 1.2, p75: 1.8, iqr: 0.6 }, round_advisory_median: 2.29, round_n: 119, finished_vs_raw_gap_pct: 0.43 },
    D2: { usd_per_in3: 251.6, confidence: "low-n", block_n: 2, block_iqr: null, round_advisory_median: 1.84, round_n: 54, finished_vs_raw_gap_pct: 0.99 },
    "4340": { usd_per_in3: null, confidence: "none", block_n: 0, block_iqr: null, round_advisory_median: 3.476, round_n: 6, finished_vs_raw_gap_pct: null },
  },
};

let dir: string;
let basisPath: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "matbasis-"));
  basisPath = join(dir, "jm-material-cost-basis.json");
  writeFileSync(basisPath, JSON.stringify(FIXTURE), "utf8");
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("VendorCostIndexEngine: material cost basis (engine)", () => {
  it("loadMaterialCostBasis reads per-grade entries", () => {
    const g = vendorCostIndexEngine.loadMaterialCostBasis(basisPath);
    expect(Object.keys(g).sort()).toEqual(["4340", "D2", "H13"]);
    expect(g.H13.usd_per_in3).toBe(1.5);
    expect(g.H13.confidence).toBe("high");
  });
  it("getMaterialGradeBasis normalizes case/dash", () => {
    expect(vendorCostIndexEngine.getMaterialGradeBasis("h-13", basisPath)?.grade).toBe("H13");
    expect(vendorCostIndexEngine.getMaterialGradeBasis("ZZ9", basisPath)).toBeNull();
    expect(vendorCostIndexEngine.getMaterialGradeBasis("", basisPath)).toBeNull();
  });
  it("materialCostForVolume: consumable grade -> cost = usd_per_in3 * volume", () => {
    const r = vendorCostIndexEngine.materialCostForVolume("H13", 10, basisPath);
    expect(r.ok).toBe(true);
    expect(r.material_cost_usd).toBeCloseTo(15.0, 6);
    expect(r.confidence).toBe("high");
  });
  it("materialCostForVolume: advisory-only(none) grade is NOT consumable", () => {
    const r = vendorCostIndexEngine.materialCostForVolume("4340", 10, basisPath);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("advisory-only-not-consumable");
    expect(r.material_cost_usd).toBeNull();
  });
  it("materialCostForVolume: failure modes (bad volume, unknown grade, no grade)", () => {
    expect(vendorCostIndexEngine.materialCostForVolume("H13", -1, basisPath).reason).toBe("bad-volume");
    expect(vendorCostIndexEngine.materialCostForVolume("H13", 0, basisPath).reason).toBe("bad-volume");
    expect(vendorCostIndexEngine.materialCostForVolume("H13", NaN, basisPath).reason).toBe("bad-volume");
    expect(vendorCostIndexEngine.materialCostForVolume("UNOBTANIUM", 10, basisPath).reason).toBe("grade-not-in-basis");
    expect(vendorCostIndexEngine.materialCostForVolume("", 10, basisPath).reason).toBe("no-grade");
  });
  it("missing/corrupt file is fail-soft (empty map)", () => {
    expect(vendorCostIndexEngine.loadMaterialCostBasis(join(dir, "nope.json"))).toEqual({});
  });
});

describe("quotingDispatcher: material_cost_basis round-trip (enum->schema->case)", () => {
  it("no grade -> all grades", async () => {
    const out = parse(await makeServer()({ action: "material_cost_basis", params: { basisPath } }));
    expect(Object.keys(out).sort()).toEqual(["4340", "D2", "H13"]);
  });
  it("grade only -> that grade's basis", async () => {
    const out = parse(await makeServer()({ action: "material_cost_basis", params: { grade: "D2", basisPath } }));
    expect(out.grade).toBe("D2");
    expect(out.confidence).toBe("low-n");
  });
  it("grade + volume_in3 -> material_cost_usd", async () => {
    const out = parse(await makeServer()({ action: "material_cost_basis", params: { grade: "H13", volume_in3: 4, basisPath } }));
    expect(out.ok).toBe(true);
    expect(out.material_cost_usd).toBeCloseTo(6.0, 6); // 1.5 * 4
  });
  it("advisory-only grade + volume -> ok:false (gate holds through the dispatcher)", async () => {
    const out = parse(await makeServer()({ action: "material_cost_basis", params: { grade: "4340", volume_in3: 4, basisPath } }));
    expect(out.ok).toBe(false);
    expect(out.reason).toBe("advisory-only-not-consumable");
  });
  it("rejects a negative volume at the schema layer (z.positive)", async () => {
    const out = parse(await makeServer()({ action: "material_cost_basis", params: { grade: "H13", volume_in3: -5, basisPath } }));
    expect(out.error).toBe("schema-validation-failed");
    expect(Array.isArray(out.issues)).toBe(true);
    expect(out.issues.length).toBeGreaterThan(0);
  });
});

describe("material cost basis: hyphenated artifact-key hardening", () => {
  it("a hyphenated artifact key (H-13) resolves for both hyphenated and bare queries", () => {
    const d2 = mkdtempSync(join(tmpdir(), "matbasis-hyph-"));
    try {
      const p = join(d2, "basis.json");
      writeFileSync(p, JSON.stringify({
        schemaVersion: "1.0.0", grades: { "H-13": { usd_per_in3: 1.5, confidence: "high", block_n: 5, round_advisory_median: 2.0 } },
      }), "utf8");
      // load-time normalization stores it under "H13"
      expect(vendorCostIndexEngine.loadMaterialCostBasis(p).H13?.usd_per_in3).toBe(1.5);
      expect(vendorCostIndexEngine.getMaterialGradeBasis("H-13", p)?.usd_per_in3).toBe(1.5);
      expect(vendorCostIndexEngine.getMaterialGradeBasis("H13", p)?.usd_per_in3).toBe(1.5);
      expect(vendorCostIndexEngine.materialCostForVolume("h-13", 2, p).material_cost_usd).toBeCloseTo(3.0, 6);
    } finally {
      rmSync(d2, { recursive: true, force: true });
    }
  });
});

describe("materialCostForVolume: minConfidence gate (U-QP-CONSUME-FMV-DEDUP)", () => {
  it("default (no opts) is back-compat: low-n grade is CONSUMABLE", () => {
    // Pre-change behavior — any non-'none' grade consumed. Pins back-compat so the
    // dispatcher's existing default path never silently changes.
    const r = vendorCostIndexEngine.materialCostForVolume("D2", 2, basisPath);
    expect(r.ok).toBe(true);
    expect(r.confidence).toBe("low-n");
    expect(r.material_cost_usd).toBeCloseTo(503.2, 4); // 251.6 * 2 (the outlier — exactly why customer path gates 'high')
  });
  it("minConfidence:'high' REFUSES a low-n grade (D2 $251/in3 outlier)", () => {
    const r = vendorCostIndexEngine.materialCostForVolume("D2", 2, basisPath, { minConfidence: "high" });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("below-min-confidence");
    expect(r.confidence).toBe("low-n");
    expect(r.usd_per_in3).toBe(251.6);     // surfaced (informative) ...
    expect(r.material_cost_usd).toBeNull(); // ... but NOT consumable
  });
  it("minConfidence:'high' ACCEPTS a high-confidence grade (H13)", () => {
    const r = vendorCostIndexEngine.materialCostForVolume("H13", 4, basisPath, { minConfidence: "high" });
    expect(r.ok).toBe(true);
    expect(r.material_cost_usd).toBeCloseTo(6.0, 6); // 1.5 * 4
  });
  it("minConfidence:'low-n' accepts a high grade (high >= low-n)", () => {
    expect(vendorCostIndexEngine.materialCostForVolume("H13", 4, basisPath, { minConfidence: "low-n" }).ok).toBe(true);
  });
  it("none-confidence short-circuits before the floor regardless of minConfidence", () => {
    const r = vendorCostIndexEngine.materialCostForVolume("4340", 4, basisPath, { minConfidence: "high" });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("advisory-only-not-consumable"); // not 'below-min-confidence'
  });
  it("defense-in-depth: a malformed high-confidence grade with usd_per_in3<=0 is NOT consumable", () => {
    const d3 = mkdtempSync(join(tmpdir(), "matbasis-zero-"));
    try {
      const p = join(d3, "basis.json");
      writeFileSync(p, JSON.stringify({
        schemaVersion: "1.0.0",
        grades: { BADZERO: { usd_per_in3: 0, confidence: "high", block_n: 9, round_advisory_median: null } },
      }), "utf8");
      const r = vendorCostIndexEngine.materialCostForVolume("BADZERO", 4, p);
      expect(r.ok).toBe(false);
      expect(r.reason).toBe("advisory-only-not-consumable"); // never emits a $0 material cost as ok
      expect(r.material_cost_usd).toBeNull();
    } finally {
      rmSync(d3, { recursive: true, force: true });
    }
  });
});

describe("quotingDispatcher: material_cost_basis minConfidence round-trip", () => {
  it("low-n grade + volume + minConfidence:'high' -> ok:false (gate flows through schema->engine)", async () => {
    const out = parse(await makeServer()({ action: "material_cost_basis", params: { grade: "D2", volume_in3: 2, basisPath, minConfidence: "high" } }));
    expect(out.ok).toBe(false);
    expect(out.reason).toBe("below-min-confidence");
  });
  it("low-n grade + volume WITHOUT minConfidence -> ok:true (default back-compat through dispatcher)", async () => {
    const out = parse(await makeServer()({ action: "material_cost_basis", params: { grade: "D2", volume_in3: 2, basisPath } }));
    expect(out.ok).toBe(true);
    expect(out.confidence).toBe("low-n");
  });
  it("rejects an out-of-enum minConfidence at the schema layer", async () => {
    const out = parse(await makeServer()({ action: "material_cost_basis", params: { grade: "H13", volume_in3: 4, basisPath, minConfidence: "medium" } }));
    expect(out.error).toBe("schema-validation-failed");
  });
});
