/**
 * PSNCoverageAuditEngine tests — U-HAGI12 self-audit reporter.
 *
 * Covers the PSN × Voxyz coverage-matrix semantics:
 *   - 11 × 12 = 132-cell matrix always produced
 *   - threshold-based verdict (covered / partial / missing)
 *   - empty evidence → all 132 cells missing
 *   - clamped score (weights sum > 1 → score = 1)
 *   - threshold validation (covered must be > partial)
 *   - filter by verdict
 *   - markdown render produces a well-shaped table
 *   - provenance decoration cross-wires with SourceChainEngine
 *   - Zod rejects bad evidence (unknown leg, unknown layer, NaN weight)
 */
import { describe, it, expect } from "vitest";
import {
  PSNCoverageAuditEngine,
  PSN_LEGS,
  VOXYZ_LAYERS,
  EvidenceSchema,
  type Evidence,
} from "../engines/PSNCoverageAuditEngine.js";

const ISO = "2026-05-24T08:00:00.000Z";

describe("PSNCoverageAuditEngine.audit", () => {
  it("produces a 132-cell matrix with all 11 legs × 12 layers", () => {
    const m = PSNCoverageAuditEngine.audit([], { generated_at: ISO });
    expect(m.cells).toHaveLength(132);
    expect(m.totals.cells_total).toBe(132);
    expect(m.legs).toEqual(PSN_LEGS);
    expect(m.layers).toEqual(VOXYZ_LAYERS);
  });

  it("marks every cell as missing on empty evidence (happy path)", () => {
    const m = PSNCoverageAuditEngine.audit([], { generated_at: ISO });
    expect(m.totals.missing).toBe(132);
    expect(m.totals.covered).toBe(0);
    expect(m.totals.partial).toBe(0);
  });

  it("classifies a covered cell when single weight crosses covered threshold", () => {
    const ev: Evidence[] = [
      { leg: "wiki", layer: "knowledge", path: "knowledge/wiki/index.md", weight: 0.8 },
    ];
    const m = PSNCoverageAuditEngine.audit(ev, { generated_at: ISO });
    const c = m.cells.find((x) => x.leg === "wiki" && x.layer === "knowledge")!;
    expect(c.verdict).toBe("covered");
    expect(c.score).toBe(0.8);
  });

  it("classifies a partial cell when weight is below covered but above partial threshold", () => {
    const ev: Evidence[] = [
      { leg: "memory", layer: "memory", path: "knowledge/memories/index.md", weight: 0.5 },
    ];
    const m = PSNCoverageAuditEngine.audit(ev, { generated_at: ISO });
    const c = m.cells.find((x) => x.leg === "memory" && x.layer === "memory")!;
    expect(c.verdict).toBe("partial");
  });

  it("clamps score to [0,1] when weights sum > 1 (adversarial input)", () => {
    const ev: Evidence[] = [
      { leg: "engines", layer: "execution-surface", path: "a.ts", weight: 0.6 },
      { leg: "engines", layer: "execution-surface", path: "b.ts", weight: 0.6 },
      { leg: "engines", layer: "execution-surface", path: "c.ts", weight: 0.9 },
    ];
    const m = PSNCoverageAuditEngine.audit(ev, { generated_at: ISO });
    const c = m.cells.find((x) => x.leg === "engines" && x.layer === "execution-surface")!;
    expect(c.score).toBe(1);
    expect(c.verdict).toBe("covered");
    expect(c.evidence).toHaveLength(3);
  });

  it("rejects inverted thresholds (failure mode)", () => {
    expect(() =>
      PSNCoverageAuditEngine.audit([], { coveredThreshold: 0.2, partialThreshold: 0.5 }),
    ).toThrow();
  });

  it("rejects out-of-range thresholds (boundary)", () => {
    expect(() =>
      PSNCoverageAuditEngine.audit([], { coveredThreshold: 1.5, partialThreshold: 0.2 }),
    ).toThrow();
  });

  it("respects custom thresholds", () => {
    const ev: Evidence[] = [
      { leg: "tribal", layer: "knowledge", path: "tribal.json", weight: 0.4 },
    ];
    const m = PSNCoverageAuditEngine.audit(ev, {
      coveredThreshold: 0.35,
      partialThreshold: 0.1,
      generated_at: ISO,
    });
    const c = m.cells.find((x) => x.leg === "tribal" && x.layer === "knowledge")!;
    expect(c.verdict).toBe("covered");
  });
});

describe("EvidenceSchema", () => {
  it("rejects unknown leg", () => {
    expect(() =>
      EvidenceSchema.parse({ leg: "blockchain", layer: "memory", path: "x", weight: 0.5 }),
    ).toThrow();
  });

  it("rejects unknown layer", () => {
    expect(() =>
      EvidenceSchema.parse({ leg: "wiki", layer: "ledger", path: "x", weight: 0.5 }),
    ).toThrow();
  });

  it("rejects NaN weight (adversarial)", () => {
    expect(() =>
      EvidenceSchema.parse({ leg: "wiki", layer: "memory", path: "x", weight: NaN }),
    ).toThrow();
  });

  it("rejects weight > 1 (boundary)", () => {
    expect(() =>
      EvidenceSchema.parse({ leg: "wiki", layer: "memory", path: "x", weight: 1.1 }),
    ).toThrow();
  });
});

describe("PSNCoverageAuditEngine.cellsByVerdict + renderMarkdown", () => {
  it("filters by verdict correctly", () => {
    const ev: Evidence[] = [
      { leg: "wiki", layer: "knowledge", path: "wiki/index.md", weight: 0.95 },
    ];
    const m = PSNCoverageAuditEngine.audit(ev, { generated_at: ISO });
    expect(PSNCoverageAuditEngine.cellsByVerdict(m, "covered")).toHaveLength(1);
    expect(PSNCoverageAuditEngine.cellsByVerdict(m, "missing")).toHaveLength(131);
  });

  it("renderMarkdown produces a header + a row per leg", () => {
    const m = PSNCoverageAuditEngine.audit([], { generated_at: ISO });
    const md = PSNCoverageAuditEngine.renderMarkdown(m);
    expect(md).toContain("# PSN × Voxyz coverage matrix");
    for (const leg of PSN_LEGS) expect(md).toContain(`| ${leg} |`);
  });

  it("decorateWithProvenance attaches a citation per evidence row via SourceChainEngine", () => {
    const ev: Evidence[] = [
      { leg: "wiki", layer: "knowledge", path: "knowledge/wiki/index.md", weight: 0.8 },
      { leg: "memory", layer: "memory", path: "knowledge/memories/MEMORY.md", weight: 0.7 },
    ];
    const m = PSNCoverageAuditEngine.audit(ev, { generated_at: ISO });
    const decorated = PSNCoverageAuditEngine.decorateWithProvenance(m);
    expect(decorated.sources).toHaveLength(2);
    expect(decorated.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(decorated.value.totals.cells_total).toBe(132);
  });
});
