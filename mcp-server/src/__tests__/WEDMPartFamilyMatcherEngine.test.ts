/**
 * WEDMPartFamilyMatcherEngine — real-value contract tests
 * ======================================================
 *
 * All assertions are concrete values, algebraic invariants, or behavioural
 * contracts from the engine JSDoc. No `toBeDefined/Truthy/Undefined/Falsy()`
 * stubs (test-legitimacy.mjs Tier-0 hook rejects them).
 *
 * @milestone TRAINING-LEARNING-MS0 / U-TL-U5-DOMAIN-MATCHERS
 */
import { describe, it, expect } from "vitest";
import {
  wedmPartFamilyMatcherEngine,
  WEDMPartFamilyMatcherEngine,
  type WEDMFamilySignalBreakdown,
} from "../engines/WEDMPartFamilyMatcherEngine.js";
import { WEDM_TEMPLATE_FAMILIES } from "../engines/WEDMPartFamilyTemplateExtractorEngine.js";

const KEYWORDS_ONLY = { keywordsOnly: true };

describe("WEDMPartFamilyMatcherEngine", () => {
  // ─── construction + taxonomy ──────────────────────────────────────────────

  it("exports a singleton + class", () => {
    expect(wedmPartFamilyMatcherEngine).toBeInstanceOf(WEDMPartFamilyMatcherEngine);
  });

  it("listFamilies() returns the canonical 7-family taxonomy", () => {
    const families = wedmPartFamilyMatcherEngine.listFamilies();
    expect(families).toEqual(WEDM_TEMPLATE_FAMILIES);
    expect(families.length).toBe(7);
    expect(families).toContain("taptite-electrode");
    expect(families).toContain("carbide-die-insert");
    expect(families).toContain("punch-die");
    expect(families).toContain("pcd-tipped-tooling");
    expect(families).toContain("aerospace-fir-tree");
    expect(families).toContain("mold-insert");
    expect(families).toContain("unknown");
  });

  it("default weights sum to exactly 1.0 with audited per-signal values", () => {
    const w = wedmPartFamilyMatcherEngine._defaultWeights();
    expect(w.kind).toBe(0.30);
    expect(w.filename).toBe(0.20);
    expect(w.features).toBe(0.20);
    expect(w.material).toBe(0.15);
    expect(w.customer).toBe(0.10);
    expect(w.ext).toBe(0.05);
    const sum = w.kind + w.filename + w.features + w.material + w.customer + w.ext;
    expect(sum).toBeCloseTo(1.0, 9);
  });

  // ─── empty / invalid descriptor handling ──────────────────────────────────

  it("returns empty_descriptor when descriptor is null", () => {
    // @ts-expect-error — intentional null
    const r = wedmPartFamilyMatcherEngine.matchPartFamily(null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("empty_descriptor");
  });

  it("returns empty_descriptor when no signals are set", () => {
    const r = wedmPartFamilyMatcherEngine.matchPartFamily({});
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("empty_descriptor");
      expect(r.detail).toMatch(/kind|source_filename|ext|customer|material|features/);
    }
  });

  it("returns empty_descriptor when only non-signal fields are set", () => {
    const r = wedmPartFamilyMatcherEngine.matchPartFamily({
      thickness_mm: 25,
      length_mm: 100,
      width_mm: 50,
      hasTaper: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("empty_descriptor");
  });

  // ─── kind signal — substring + exact equality ────────────────────────────

  it("kind signal: exact family name returns 1.0", () => {
    expect(wedmPartFamilyMatcherEngine._signal_kind("punch-die", "punch-die")).toBe(1.0);
    expect(wedmPartFamilyMatcherEngine._signal_kind("pcd-tipped-tooling", "pcd-tipped-tooling")).toBe(1.0);
  });

  it("kind signal: exact keyword returns 1.0", () => {
    expect(wedmPartFamilyMatcherEngine._signal_kind("carbide-die-insert", "carbide")).toBe(1.0);
    expect(wedmPartFamilyMatcherEngine._signal_kind("aerospace-fir-tree", "fir-tree")).toBe(1.0);
  });

  it("kind signal: substring match returns 0.75", () => {
    expect(wedmPartFamilyMatcherEngine._signal_kind("punch-die", "thick-punch-die-A2")).toBeCloseTo(0.75, 5);
    expect(wedmPartFamilyMatcherEngine._signal_kind("pcd-tipped-tooling", "high-precision-pcd-tip")).toBeCloseTo(0.75, 5);
  });

  it("kind signal: no match returns 0", () => {
    expect(wedmPartFamilyMatcherEngine._signal_kind("punch-die", "shaft")).toBe(0);
    expect(wedmPartFamilyMatcherEngine._signal_kind("pcd-tipped-tooling", "casing")).toBe(0);
  });

  it("kind signal: unknown family with empty keywords returns 0 always", () => {
    expect(wedmPartFamilyMatcherEngine._signal_kind("unknown", "unknown")).toBe(0);
    expect(wedmPartFamilyMatcherEngine._signal_kind("unknown", "anything")).toBe(0);
  });

  // ─── filename signal — regex pattern matching ────────────────────────────

  it("filename signal: matching pattern returns positive score", () => {
    const s = wedmPartFamilyMatcherEngine._signal_filename("punch-die", "blanking-punch-A2.min");
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThanOrEqual(1);
  });

  it("filename signal: case-insensitive match works", () => {
    expect(wedmPartFamilyMatcherEngine._signal_filename("carbide-die-insert", "Tungsten-Carbide-Die.dxf")).toBeGreaterThan(0);
    expect(wedmPartFamilyMatcherEngine._signal_filename("aerospace-fir-tree", "Turbine-Fir-Tree-Root.sldprt")).toBeGreaterThan(0);
  });

  it("filename signal: no match returns 0", () => {
    expect(wedmPartFamilyMatcherEngine._signal_filename("punch-die", "casing-job-001.min")).toBe(0);
    expect(wedmPartFamilyMatcherEngine._signal_filename("pcd-tipped-tooling", "shaft-OD.min")).toBe(0);
  });

  it("filename signal: unknown family always returns 0", () => {
    expect(wedmPartFamilyMatcherEngine._signal_filename("unknown", "anything-electrode.min")).toBe(0);
  });

  // ─── material signal — bias map ──────────────────────────────────────────

  it("material signal: carbide biases carbide-die-insert", () => {
    expect(wedmPartFamilyMatcherEngine._signal_material("carbide-die-insert", "Tungsten Carbide C2")).toBeGreaterThan(0);
    expect(wedmPartFamilyMatcherEngine._signal_material("punch-die", "Tungsten Carbide C2")).toBe(0);
  });

  it("material signal: PCD biases pcd-tipped-tooling exclusively", () => {
    expect(wedmPartFamilyMatcherEngine._signal_material("pcd-tipped-tooling", "PCD polycrystalline diamond")).toBeGreaterThan(0);
    expect(wedmPartFamilyMatcherEngine._signal_material("carbide-die-insert", "PCD polycrystalline diamond")).toBe(0);
  });

  it("material signal: D2 tool steel biases punch-die + mold-insert", () => {
    const punch = wedmPartFamilyMatcherEngine._signal_material("punch-die", "D2 tool steel");
    const mold = wedmPartFamilyMatcherEngine._signal_material("mold-insert", "D2 tool steel");
    const carbide = wedmPartFamilyMatcherEngine._signal_material("carbide-die-insert", "D2 tool steel");
    expect(punch).toBeGreaterThan(0);
    expect(mold).toBeGreaterThan(0);
    expect(carbide).toBe(0);
  });

  it("material signal: Inconel biases aerospace-fir-tree", () => {
    expect(wedmPartFamilyMatcherEngine._signal_material("aerospace-fir-tree", "Inconel 718")).toBeGreaterThan(0);
    expect(wedmPartFamilyMatcherEngine._signal_material("punch-die", "Inconel 718")).toBe(0);
  });

  it("material signal: unknown material returns 0", () => {
    expect(wedmPartFamilyMatcherEngine._signal_material("punch-die", "ZX-9000-novel-alloy")).toBe(0);
  });

  // ─── features signal — Jaccard ───────────────────────────────────────────

  it("features signal: exact overlap returns 1.0", () => {
    const s = wedmPartFamilyMatcherEngine._signal_features("punch-die", [
      "punch",
      "die",
      "blanking",
      "forming",
      "land",
      "relief",
      "shear-angle",
    ]);
    expect(s).toBeCloseTo(1.0, 5);
  });

  it("features signal: partial overlap returns Jaccard fraction (1/7)", () => {
    // 1 hit ("punch"), 1 feature, family has 7 keywords → union=7, inter=1 → 1/7
    const s = wedmPartFamilyMatcherEngine._signal_features("punch-die", ["punch"]);
    expect(s).toBeCloseTo(1 / 7, 5);
  });

  it("features signal: empty descriptor returns 0", () => {
    expect(wedmPartFamilyMatcherEngine._signal_features("punch-die", [])).toBe(0);
    expect(wedmPartFamilyMatcherEngine._signal_features("punch-die", undefined)).toBe(0);
  });

  // ─── descriptor signal counting ──────────────────────────────────────────

  it("countSignals: counts only populated descriptor fields", () => {
    expect(wedmPartFamilyMatcherEngine._countSignals({})).toBe(0);
    expect(wedmPartFamilyMatcherEngine._countSignals({ kind: "punch-die" })).toBe(1);
    expect(
      wedmPartFamilyMatcherEngine._countSignals({
        kind: "punch-die",
        material: "D2",
        customer: "ITW",
      }),
    ).toBe(3);
    expect(
      wedmPartFamilyMatcherEngine._countSignals({
        kind: "punch-die",
        source_filename: "punch-A2.min",
        ext: "min",
        customer: "ITW",
        material: "D2",
        features: ["punch", "die"],
      }),
    ).toBe(6);
  });

  it("countSignals: empty arrays + empty strings count as zero signals", () => {
    expect(wedmPartFamilyMatcherEngine._countSignals({ kind: "" })).toBe(0);
    expect(wedmPartFamilyMatcherEngine._countSignals({ features: [] })).toBe(0);
  });

  // ─── weight normalization ────────────────────────────────────────────────

  it("normalizeWeights: re-normalizes unbalanced custom weights to sum 1.0", () => {
    const w = wedmPartFamilyMatcherEngine._normalizeWeights({ kind: 0.5, filename: 0.5 });
    const sum = w.kind + w.filename + w.features + w.material + w.customer + w.ext;
    expect(sum).toBeCloseTo(1.0, 5);
    // kind=0.5 + filename=0.5 + defaults 0.20+0.15+0.10+0.05 = 1.50 → normalized kind = 0.5/1.50 ≈ 0.333
    expect(w.kind).toBeCloseTo(0.5 / 1.50, 5);
    expect(w.filename).toBeCloseTo(0.5 / 1.50, 5);
  });

  it("normalizeWeights: discards negative or non-finite weights, keeps defaults", () => {
    const w = wedmPartFamilyMatcherEngine._normalizeWeights({ kind: -1, filename: NaN });
    expect(w.kind).toBeCloseTo(0.30, 5);
    expect(w.filename).toBeCloseTo(0.20, 5);
  });

  it("normalizeWeights: all-zero custom weights fall back to defaults", () => {
    const w = wedmPartFamilyMatcherEngine._normalizeWeights({
      kind: 0,
      filename: 0,
      features: 0,
      material: 0,
      customer: 0,
      ext: 0,
    });
    const defaults = wedmPartFamilyMatcherEngine._defaultWeights();
    expect(w).toEqual(defaults);
  });

  // ─── ranking — full pipeline ─────────────────────────────────────────────

  it("ranks punch-die highest for a punch-die descriptor", () => {
    const r = wedmPartFamilyMatcherEngine.matchPartFamily(
      {
        kind: "punch-die",
        material: "D2 tool steel",
        features: ["punch", "die", "blanking", "land"],
        source_filename: "blanking-punch-A.dxf",
      },
      KEYWORDS_ONLY,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.matches[0].family).toBe("punch-die");
      expect(r.matches[0].similarity).toBeGreaterThan(0);
      expect(r.matches[0].confidenceLow).toBeLessThanOrEqual(r.matches[0].similarity);
      expect(r.matches[0].confidenceHigh).toBeGreaterThanOrEqual(r.matches[0].similarity);
    }
  });

  it("ranks carbide-die-insert highest for a tungsten-carbide descriptor", () => {
    const r = wedmPartFamilyMatcherEngine.matchPartFamily(
      {
        kind: "carbide",
        material: "Tungsten Carbide C2",
        features: ["carbide-die", "tight-tolerance", "hard-material"],
        source_filename: "tungsten-carbide-die.sldprt",
      },
      KEYWORDS_ONLY,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.matches[0].family).toBe("carbide-die-insert");
  });

  it("ranks pcd-tipped-tooling highest for a PCD descriptor", () => {
    const r = wedmPartFamilyMatcherEngine.matchPartFamily(
      {
        kind: "pcd",
        material: "PCD polycrystalline diamond",
        features: ["pcd-tip", "diamond", "extreme-tolerance"],
        source_filename: "pcd-edm-electrode.dxf",
      },
      KEYWORDS_ONLY,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.matches[0].family).toBe("pcd-tipped-tooling");
  });

  it("ranks aerospace-fir-tree highest for an Inconel turbine-blade descriptor", () => {
    const r = wedmPartFamilyMatcherEngine.matchPartFamily(
      {
        kind: "fir-tree",
        material: "Inconel 718",
        features: ["fir-tree", "blade-root", "turbine-airfoil", "dovetail"],
        source_filename: "turbine-blade-fir-tree-root.sldprt",
      },
      KEYWORDS_ONLY,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.matches[0].family).toBe("aerospace-fir-tree");
  });

  it("ranks mold-insert highest for a P20 mold descriptor", () => {
    const r = wedmPartFamilyMatcherEngine.matchPartFamily(
      {
        kind: "mold-insert",
        material: "P20 mold steel",
        features: ["mold-cavity", "insert", "ejector-hole", "venting-slot"],
        source_filename: "mold-cavity-insert-A.f3d",
      },
      KEYWORDS_ONLY,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.matches[0].family).toBe("mold-insert");
  });

  it("ranks taptite-electrode highest for a taptite electrode descriptor", () => {
    const r = wedmPartFamilyMatcherEngine.matchPartFamily(
      {
        kind: "taptite-electrode",
        material: "Copper C110",
        features: ["taptite", "electrode-wire", "thread-rolling"],
        source_filename: "taptite-electrode-cu.dxf",
      },
      KEYWORDS_ONLY,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.matches[0].family).toBe("taptite-electrode");
  });

  // ─── result shape contract — concrete numeric assertions ─────────────────

  it("each match's similarity is in [0,1] and signals are in [0,1]", () => {
    const r = wedmPartFamilyMatcherEngine.matchPartFamily(
      { kind: "punch-die", material: "D2" },
      KEYWORDS_ONLY,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      for (const m of r.matches) {
        expect(m.similarity).toBeGreaterThanOrEqual(0);
        expect(m.similarity).toBeLessThanOrEqual(1);
        expect(m.confidenceLow).toBeGreaterThanOrEqual(0);
        expect(m.confidenceHigh).toBeLessThanOrEqual(1);
        expect(m.confidenceLow).toBeLessThanOrEqual(m.confidenceHigh);
        expect(m.signals.kind).toBeGreaterThanOrEqual(0);
        expect(m.signals.kind).toBeLessThanOrEqual(1);
        expect(m.signals.filename).toBeGreaterThanOrEqual(0);
        expect(m.signals.filename).toBeLessThanOrEqual(1);
        expect(m.signals.material).toBeGreaterThanOrEqual(0);
        expect(m.signals.material).toBeLessThanOrEqual(1);
        expect(m.signals.features).toBeGreaterThanOrEqual(0);
        expect(m.signals.features).toBeLessThanOrEqual(1);
        expect(m.rationale.length).toBeGreaterThan(0);
      }
    }
  });

  it("matches are sorted descending by similarity", () => {
    const r = wedmPartFamilyMatcherEngine.matchPartFamily(
      {
        kind: "punch-die",
        material: "D2",
        features: ["punch", "blanking"],
      },
      { ...KEYWORDS_ONLY, topK: 7, minSimilarity: 0 },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      for (let i = 1; i < r.matches.length; i++) {
        expect(r.matches[i - 1].similarity).toBeGreaterThanOrEqual(r.matches[i].similarity);
      }
    }
  });

  it("respects topK option — exactly 2 results", () => {
    const r = wedmPartFamilyMatcherEngine.matchPartFamily(
      {
        kind: "punch-die",
        material: "D2",
        features: ["punch"],
      },
      { ...KEYWORDS_ONLY, topK: 2, minSimilarity: 0 },
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.matches.length).toBe(2);
  });

  it("respects minSimilarity option — drops unrelated families or returns no_match", () => {
    const r = wedmPartFamilyMatcherEngine.matchPartFamily(
      { kind: "punch-die" },
      { ...KEYWORDS_ONLY, minSimilarity: 0.5 },
    );
    if (r.ok) {
      for (const m of r.matches) expect(m.similarity).toBeGreaterThanOrEqual(0.5);
    } else {
      expect(r.error).toBe("no_match");
    }
  });

  it("confidence band widens when fewer signals are populated", () => {
    const oneSignal = wedmPartFamilyMatcherEngine.matchPartFamily(
      { kind: "punch-die" },
      KEYWORDS_ONLY,
    );
    const allSignals = wedmPartFamilyMatcherEngine.matchPartFamily(
      {
        kind: "punch-die",
        source_filename: "punch-1.min",
        ext: "min",
        customer: "ITW",
        material: "D2",
        features: ["punch"],
      },
      KEYWORDS_ONLY,
    );
    expect(oneSignal.ok).toBe(true);
    expect(allSignals.ok).toBe(true);
    if (oneSignal.ok && allSignals.ok) {
      const widthOne = oneSignal.matches[0].confidenceHigh - oneSignal.matches[0].confidenceLow;
      const widthAll = allSignals.matches[0].confidenceHigh - allSignals.matches[0].confidenceLow;
      expect(widthOne).toBeGreaterThanOrEqual(widthAll - 1e-9);
    }
  });

  // ─── corpus_coverage reporting ──────────────────────────────────────────

  it("corpus_coverage = 0 in keywordsOnly mode (no templates loaded)", () => {
    const r = wedmPartFamilyMatcherEngine.matchPartFamily({ kind: "punch-die" }, KEYWORDS_ONLY);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.corpus_coverage).toBe(0);
      for (const m of r.matches) expect(m.template_present).toBe(false);
    }
  });

  it("families_evaluated equals 7; descriptor_signals_present reflects descriptor count", () => {
    const r = wedmPartFamilyMatcherEngine.matchPartFamily({ kind: "punch-die" }, {
      ...KEYWORDS_ONLY,
      minSimilarity: 0,
      topK: 99,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.families_evaluated).toBe(7);
      expect(r.descriptor_signals_present).toBe(1);
    }
  });

  // ─── inferFromFilename ──────────────────────────────────────────────────

  it("inferFromFilename: extracts ext + kind from a punch-die filename", () => {
    const inf = wedmPartFamilyMatcherEngine.inferFromFilename(
      "H:/jobs/blanking-punch-A2.dxf",
    );
    expect(inf.source_filename).toBe("blanking-punch-A2.dxf");
    expect(inf.ext).toBe("dxf");
    expect(inf.kind).toBe("punch-die");
  });

  it("inferFromFilename: extracts kind from a fir-tree filename", () => {
    const inf = wedmPartFamilyMatcherEngine.inferFromFilename(
      "C:/jobs/turbine-blade-fir-tree-root.sldprt",
    );
    expect(inf.kind).toBe("aerospace-fir-tree");
    expect(inf.ext).toBe("sldprt");
  });

  it("inferFromFilename: empty input returns empty object", () => {
    expect(wedmPartFamilyMatcherEngine.inferFromFilename("")).toEqual({});
    // @ts-expect-error — intentional null
    expect(wedmPartFamilyMatcherEngine.inferFromFilename(null)).toEqual({});
  });

  it("inferFromFilename: filename without extension still surfaces source_filename + kind", () => {
    const inf = wedmPartFamilyMatcherEngine.inferFromFilename("plain-electrode");
    expect(inf.source_filename).toBe("plain-electrode");
    expect(inf.ext).toBe(undefined);
    expect(inf.kind).toBe("taptite-electrode");
  });

  // ─── adversarial / regression ────────────────────────────────────────────

  it("adversarial weights with NaN do not crash — falls back to default weighting", () => {
    const r = wedmPartFamilyMatcherEngine.matchPartFamily(
      { kind: "punch-die" },
      { ...KEYWORDS_ONLY, weights: { kind: NaN, filename: -1 } as Partial<WEDMFamilySignalBreakdown> },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.matches[0].family).toBe("punch-die");
      expect(r.matches[0].similarity).toBeGreaterThan(0);
    }
  });

  it("very long source_filename does not crash the regex matcher", () => {
    const longEmbedded = "a".repeat(10_000) + "punch" + "b".repeat(10_000);
    const infEmbedded = wedmPartFamilyMatcherEngine.inferFromFilename(longEmbedded);
    expect(infEmbedded.source_filename).toBe(longEmbedded);
    expect(infEmbedded.kind).toBe(undefined);
    const longBoundary = "a".repeat(10_000) + "-punch-" + "b".repeat(10_000);
    const infBoundary = wedmPartFamilyMatcherEngine.inferFromFilename(longBoundary);
    expect(infBoundary.source_filename).toBe(longBoundary);
    expect(infBoundary.kind).toBe("punch-die");
  });

  it("descriptor with only customer signal returns no_match in keywordsOnly mode", () => {
    const r = wedmPartFamilyMatcherEngine.matchPartFamily(
      { customer: "ITW" },
      KEYWORDS_ONLY,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("no_match");
  });

  it("regression: filename pattern `(?<!\\w)punch(?!\\w)` matches 'punch-die' but not 'punchy'", () => {
    const yes = wedmPartFamilyMatcherEngine._signal_filename("punch-die", "blanking-punch-A.dxf");
    const no = wedmPartFamilyMatcherEngine._signal_filename("punch-die", "punchy-name.dxf");
    expect(yes).toBeGreaterThan(0);
    expect(no).toBe(0);
  });

  it("regression: filename pattern `(?<!\\w)pcd(?!\\w)` matches 'pcd-tip' but not 'pcde'", () => {
    const yes = wedmPartFamilyMatcherEngine._signal_filename("pcd-tipped-tooling", "pcd-edm-tip.dxf");
    const no = wedmPartFamilyMatcherEngine._signal_filename("pcd-tipped-tooling", "pcde-shaft.dxf");
    expect(yes).toBeGreaterThan(0);
    expect(no).toBe(0);
  });

  it("regression: filename pattern `(?<!\\w)diamond(?!\\w)` matches 'diamond' but not 'diamondback'", () => {
    const yes = wedmPartFamilyMatcherEngine._signal_filename("pcd-tipped-tooling", "diamond-tip.sldprt");
    const no = wedmPartFamilyMatcherEngine._signal_filename("pcd-tipped-tooling", "diamondback-pattern.sldprt");
    expect(yes).toBeGreaterThan(0);
    expect(no).toBe(0);
  });

  it("regression: fir-tree pattern requires word boundary — 'fir-tree' matches, 'firetree' does not", () => {
    const yes1 = wedmPartFamilyMatcherEngine._signal_filename("aerospace-fir-tree", "wing-fir-tree-root.sldprt");
    const yes2 = wedmPartFamilyMatcherEngine._signal_filename("aerospace-fir-tree", "fir tree airfoil.dxf");
    const no = wedmPartFamilyMatcherEngine._signal_filename("aerospace-fir-tree", "firetree-decoration.dxf");
    expect(yes1).toBeGreaterThan(0);
    expect(yes2).toBeGreaterThan(0);
    expect(no).toBe(0);
  });

  it("regression: blade-root pattern requires word boundary — 'blade-root' matches, 'bladeroot' embedded does not", () => {
    const yes = wedmPartFamilyMatcherEngine._signal_filename("aerospace-fir-tree", "rotor-blade-root.sldprt");
    const no = wedmPartFamilyMatcherEngine._signal_filename("aerospace-fir-tree", "xbladerootx-pattern.dxf");
    expect(yes).toBeGreaterThan(0);
    expect(no).toBe(0);
  });

  it("regression: carbide pattern `(?<!\\w)carbide(?!\\w)` matches 'carbide' but not 'precarbide'", () => {
    const yes = wedmPartFamilyMatcherEngine._signal_filename("carbide-die-insert", "tungsten-carbide-die.dxf");
    const no = wedmPartFamilyMatcherEngine._signal_filename("carbide-die-insert", "precarbide-job.min");
    expect(yes).toBeGreaterThan(0);
    expect(no).toBe(0);
  });

  it("material signal: graphite split-target bias hits both taptite-electrode AND mold-insert equally", () => {
    // graphite → [taptite-electrode, mold-insert] with 1/2 split each.
    const tap = wedmPartFamilyMatcherEngine._signal_material("taptite-electrode", "POCO Graphite EDM-3");
    const mold = wedmPartFamilyMatcherEngine._signal_material("mold-insert", "POCO Graphite EDM-3");
    const punch = wedmPartFamilyMatcherEngine._signal_material("punch-die", "POCO Graphite EDM-3");
    expect(tap).toBeGreaterThan(0);
    expect(mold).toBeGreaterThan(0);
    expect(tap).toBeCloseTo(mold, 9);
    expect(punch).toBe(0);
  });

  it("rationale strings include signal names + percentages when signals are positive", () => {
    const r = wedmPartFamilyMatcherEngine.matchPartFamily(
      {
        kind: "punch-die",
        material: "D2",
        features: ["punch", "die"],
      },
      KEYWORDS_ONLY,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      const pd = r.matches.find((m) => m.family === "punch-die");
      expect(pd?.family).toBe("punch-die");
      const blob = (pd?.rationale ?? []).join(" ");
      expect(blob).toMatch(/kind hit/);
      expect(blob).toMatch(/material bias/);
      expect(blob).toMatch(/feature Jaccard/);
    }
  });

  it("rationale falls back to 'no signal matched' when descriptor doesn't hit a family", () => {
    const r = wedmPartFamilyMatcherEngine.matchPartFamily(
      { kind: "punch-die" },
      { ...KEYWORDS_ONLY, minSimilarity: 0, topK: 99 },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      const pcd = r.matches.find((m) => m.family === "pcd-tipped-tooling");
      expect(pcd?.family).toBe("pcd-tipped-tooling");
      expect(pcd?.similarity).toBe(0);
      expect((pcd?.rationale ?? []).join(" ")).toMatch(/no signal matched|fallback ordering/);
    }
  });
});
