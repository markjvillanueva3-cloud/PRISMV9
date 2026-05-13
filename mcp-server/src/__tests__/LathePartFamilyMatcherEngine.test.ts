/**
 * LathePartFamilyMatcherEngine — real-value contract tests
 * ======================================================
 *
 * The lathe matcher engine has existed as v1.0.0 since the U-TL-U5 spec was
 * drafted but was never wired or tested. This file closes that gap as part of
 * U-TL-U5-DOMAIN-MATCHERS (siblings: Mill + WEDM matcher tests).
 *
 * All assertions are concrete values or algebraic invariants. No
 * `toBeDefined/Truthy/Undefined/Falsy()` stubs.
 *
 * @milestone TRAINING-LEARNING-MS0 / U-TL-U5-DOMAIN-MATCHERS
 */
import { describe, it, expect } from "vitest";
import {
  lathePartFamilyMatcherEngine,
  LathePartFamilyMatcherEngine,
  type LatheFamilySignalBreakdown,
} from "../engines/LathePartFamilyMatcherEngine.js";
import { LATHE_TEMPLATE_FAMILIES } from "../engines/LathePartFamilyTemplateExtractorEngine.js";

const KEYWORDS_ONLY = { keywordsOnly: true };

describe("LathePartFamilyMatcherEngine", () => {
  // ─── construction + taxonomy ──────────────────────────────────────────────

  it("exports a singleton + class", () => {
    expect(lathePartFamilyMatcherEngine).toBeInstanceOf(LathePartFamilyMatcherEngine);
  });

  it("listFamilies() returns the canonical 12-family lathe taxonomy", () => {
    const families = lathePartFamilyMatcherEngine.listFamilies();
    expect(families).toEqual(LATHE_TEMPLATE_FAMILIES);
    expect(families.length).toBe(12);
    expect(families).toContain("wafer-insert");
    expect(families).toContain("casing");
    expect(families).toContain("casing-counterbore");
    expect(families).toContain("top-hat-casing");
    expect(families).toContain("shaft");
    expect(families).toContain("flange");
    expect(families).toContain("bushing");
    expect(families).toContain("tube");
    expect(families).toContain("taptite-blank");
    expect(families).toContain("nut-blank");
    expect(families).toContain("electrode-rod-blank");
    expect(families).toContain("unknown");
  });

  it("default weights sum to exactly 1.0 with audited per-signal values", () => {
    const w = lathePartFamilyMatcherEngine._defaultWeights();
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
    const r = lathePartFamilyMatcherEngine.matchPartFamily(null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("empty_descriptor");
  });

  it("returns empty_descriptor when no signals are set", () => {
    const r = lathePartFamilyMatcherEngine.matchPartFamily({});
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("empty_descriptor");
      expect(r.detail).toMatch(/kind|source_filename|ext|customer|material|features/);
    }
  });

  it("returns empty_descriptor when only non-signal fields are set", () => {
    const r = lathePartFamilyMatcherEngine.matchPartFamily({
      diameter_max_mm: 25,
      length_mm: 50,
      hasInternalBore: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("empty_descriptor");
  });

  // ─── kind signal ─────────────────────────────────────────────────────────

  it("kind signal: exact family name returns 1.0", () => {
    expect(lathePartFamilyMatcherEngine._signal_kind("shaft", "shaft")).toBe(1.0);
    expect(lathePartFamilyMatcherEngine._signal_kind("flange", "flange")).toBe(1.0);
  });

  it("kind signal: exact keyword returns 1.0", () => {
    expect(lathePartFamilyMatcherEngine._signal_kind("taptite-blank", "taptite")).toBe(1.0);
    expect(lathePartFamilyMatcherEngine._signal_kind("wafer-insert", "wafer")).toBe(1.0);
  });

  it("kind signal: substring match returns 0.75", () => {
    expect(lathePartFamilyMatcherEngine._signal_kind("shaft", "long-shaft-stock")).toBeCloseTo(0.75, 5);
    expect(lathePartFamilyMatcherEngine._signal_kind("wafer-insert", "wafer-blank-A")).toBeCloseTo(0.75, 5);
  });

  it("kind signal: no match returns 0", () => {
    expect(lathePartFamilyMatcherEngine._signal_kind("shaft", "punch-die")).toBe(0);
    expect(lathePartFamilyMatcherEngine._signal_kind("wafer-insert", "casing")).toBe(0);
  });

  it("kind signal: unknown family with empty keywords returns 0 always", () => {
    expect(lathePartFamilyMatcherEngine._signal_kind("unknown", "unknown")).toBe(0);
    expect(lathePartFamilyMatcherEngine._signal_kind("unknown", "anything")).toBe(0);
  });

  // ─── filename signal ─────────────────────────────────────────────────────

  it("filename signal: matching pattern returns positive score", () => {
    const s = lathePartFamilyMatcherEngine._signal_filename("shaft", "drive-shaft-A.min");
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThanOrEqual(1);
  });

  it("filename signal: case-insensitive match works", () => {
    expect(lathePartFamilyMatcherEngine._signal_filename("wafer-insert", "Wafer-Insert-303SS.MIN")).toBeGreaterThan(0);
    expect(lathePartFamilyMatcherEngine._signal_filename("flange", "Flange-Collar-AL.sldprt")).toBeGreaterThan(0);
  });

  it("filename signal: no match returns 0", () => {
    expect(lathePartFamilyMatcherEngine._signal_filename("shaft", "punch-die-A.dxf")).toBe(0);
  });

  it("filename signal: unknown family always returns 0", () => {
    expect(lathePartFamilyMatcherEngine._signal_filename("unknown", "anything.min")).toBe(0);
  });

  // ─── material signal ─────────────────────────────────────────────────────

  it("material signal: copper biases electrode-rod-blank", () => {
    expect(lathePartFamilyMatcherEngine._signal_material("electrode-rod-blank", "Copper C110")).toBeGreaterThan(0);
    expect(lathePartFamilyMatcherEngine._signal_material("shaft", "Copper C110")).toBe(0);
  });

  it("material signal: 1018 biases shaft + taptite-blank", () => {
    const shaft = lathePartFamilyMatcherEngine._signal_material("shaft", "AISI 1018 steel");
    const taptite = lathePartFamilyMatcherEngine._signal_material("taptite-blank", "AISI 1018 steel");
    const flange = lathePartFamilyMatcherEngine._signal_material("flange", "AISI 1018 steel");
    expect(shaft).toBeGreaterThan(0);
    expect(taptite).toBeGreaterThan(0);
    expect(flange).toBe(0);
  });

  it("material signal: inconel biases shaft + flange", () => {
    const shaft = lathePartFamilyMatcherEngine._signal_material("shaft", "Inconel 718");
    const flange = lathePartFamilyMatcherEngine._signal_material("flange", "Inconel 718");
    const electrode = lathePartFamilyMatcherEngine._signal_material("electrode-rod-blank", "Inconel 718");
    expect(shaft).toBeGreaterThan(0);
    expect(flange).toBeGreaterThan(0);
    expect(electrode).toBe(0);
  });

  it("material signal: unknown material returns 0", () => {
    expect(lathePartFamilyMatcherEngine._signal_material("shaft", "ZX-9000-novel-alloy")).toBe(0);
  });

  // ─── features signal ─────────────────────────────────────────────────────

  it("features signal: exact overlap returns 1.0", () => {
    const s = lathePartFamilyMatcherEngine._signal_features("shaft", [
      "od-turning",
      "shoulder",
      "keyway",
      "groove",
      "thread",
    ]);
    expect(s).toBeCloseTo(1.0, 5);
  });

  it("features signal: partial overlap returns Jaccard fraction (1/5)", () => {
    // 1 hit ("groove"), 1 feature, family has 5 keywords → union=5, inter=1 → 1/5
    const s = lathePartFamilyMatcherEngine._signal_features("shaft", ["groove"]);
    expect(s).toBeCloseTo(1 / 5, 5);
  });

  it("features signal: empty descriptor returns 0", () => {
    expect(lathePartFamilyMatcherEngine._signal_features("shaft", [])).toBe(0);
    expect(lathePartFamilyMatcherEngine._signal_features("shaft", undefined)).toBe(0);
  });

  // ─── descriptor signal counting ──────────────────────────────────────────

  it("countSignals: counts only populated descriptor fields", () => {
    expect(lathePartFamilyMatcherEngine._countSignals({})).toBe(0);
    expect(lathePartFamilyMatcherEngine._countSignals({ kind: "shaft" })).toBe(1);
    expect(
      lathePartFamilyMatcherEngine._countSignals({
        kind: "shaft",
        material: "1018",
        customer: "ITW",
      }),
    ).toBe(3);
    expect(
      lathePartFamilyMatcherEngine._countSignals({
        kind: "shaft",
        source_filename: "shaft-1.min",
        ext: "min",
        customer: "ITW",
        material: "1018",
        features: ["od-turning"],
      }),
    ).toBe(6);
  });

  it("countSignals: empty arrays + empty strings count as zero signals", () => {
    expect(lathePartFamilyMatcherEngine._countSignals({ kind: "" })).toBe(0);
    expect(lathePartFamilyMatcherEngine._countSignals({ features: [] })).toBe(0);
  });

  // ─── weight normalization ────────────────────────────────────────────────

  it("normalizeWeights: re-normalizes unbalanced custom weights to sum 1.0", () => {
    const w = lathePartFamilyMatcherEngine._normalizeWeights({ kind: 0.5, filename: 0.5 });
    const sum = w.kind + w.filename + w.features + w.material + w.customer + w.ext;
    expect(sum).toBeCloseTo(1.0, 5);
    expect(w.kind).toBeCloseTo(0.5 / 1.50, 5);
    expect(w.filename).toBeCloseTo(0.5 / 1.50, 5);
  });

  it("normalizeWeights: discards negative or non-finite weights, keeps defaults", () => {
    const w = lathePartFamilyMatcherEngine._normalizeWeights({ kind: -1, filename: NaN });
    expect(w.kind).toBeCloseTo(0.30, 5);
    expect(w.filename).toBeCloseTo(0.20, 5);
  });

  it("normalizeWeights: all-zero custom weights fall back to defaults", () => {
    const w = lathePartFamilyMatcherEngine._normalizeWeights({
      kind: 0,
      filename: 0,
      features: 0,
      material: 0,
      customer: 0,
      ext: 0,
    });
    const defaults = lathePartFamilyMatcherEngine._defaultWeights();
    expect(w).toEqual(defaults);
  });

  // ─── ranking — full pipeline ─────────────────────────────────────────────

  it("ranks shaft highest for a shaft descriptor", () => {
    const r = lathePartFamilyMatcherEngine.matchPartFamily(
      {
        kind: "shaft",
        material: "AISI 1045",
        features: ["od-turning", "shoulder", "keyway", "groove"],
        source_filename: "drive-shaft-A.min",
      },
      KEYWORDS_ONLY,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.matches[0].family).toBe("shaft");
      expect(r.matches[0].similarity).toBeGreaterThan(0);
    }
  });

  it("ranks wafer-insert highest for a wafer descriptor", () => {
    const r = lathePartFamilyMatcherEngine.matchPartFamily(
      {
        kind: "wafer-insert",
        material: "303 SS",
        features: ["wafer-pocket", "od-thread", "thin-wall"],
        source_filename: "wafer-insert-303.min",
      },
      KEYWORDS_ONLY,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.matches[0].family).toBe("wafer-insert");
  });

  it("ranks electrode-rod-blank highest for a copper-rod descriptor", () => {
    const r = lathePartFamilyMatcherEngine.matchPartFamily(
      {
        kind: "electrode",
        material: "Copper C110",
        features: ["electrode-rod", "od-turning", "facing"],
        source_filename: "electrode-rod-cu-A.sldprt",
      },
      KEYWORDS_ONLY,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.matches[0].family).toBe("electrode-rod-blank");
  });

  it("ranks flange highest for a flange descriptor", () => {
    const r = lathePartFamilyMatcherEngine.matchPartFamily(
      {
        kind: "flange",
        material: "4140 steel",
        features: ["flange", "bolt-circle", "od-turning", "facing"],
        source_filename: "weld-flange-4140.sldprt",
      },
      KEYWORDS_ONLY,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.matches[0].family).toBe("flange");
  });

  it("ranks taptite-blank highest for a taptite descriptor", () => {
    const r = lathePartFamilyMatcherEngine.matchPartFamily(
      {
        kind: "taptite",
        material: "1018 steel",
        features: ["taptite", "trilobe", "shank"],
        source_filename: "taptite-blank-M6.min",
      },
      KEYWORDS_ONLY,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.matches[0].family).toBe("taptite-blank");
  });

  // ─── result shape contract ───────────────────────────────────────────────

  it("each match's similarity is in [0,1] and signals are in [0,1]", () => {
    const r = lathePartFamilyMatcherEngine.matchPartFamily(
      { kind: "shaft", material: "1045" },
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
        expect(m.signals.material).toBeGreaterThanOrEqual(0);
        expect(m.signals.material).toBeLessThanOrEqual(1);
        expect(m.signals.features).toBeGreaterThanOrEqual(0);
        expect(m.signals.features).toBeLessThanOrEqual(1);
        expect(m.rationale.length).toBeGreaterThan(0);
      }
    }
  });

  it("matches are sorted descending by similarity", () => {
    const r = lathePartFamilyMatcherEngine.matchPartFamily(
      { kind: "shaft", material: "1045", features: ["shoulder", "groove"] },
      { ...KEYWORDS_ONLY, topK: 12, minSimilarity: 0 },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      for (let i = 1; i < r.matches.length; i++) {
        expect(r.matches[i - 1].similarity).toBeGreaterThanOrEqual(r.matches[i].similarity);
      }
    }
  });

  it("respects topK option — exactly 3 results", () => {
    const r = lathePartFamilyMatcherEngine.matchPartFamily(
      { kind: "shaft", material: "1045", features: ["shoulder"] },
      { ...KEYWORDS_ONLY, topK: 3, minSimilarity: 0 },
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.matches.length).toBe(3);
  });

  it("families_evaluated equals 12 (lathe taxonomy)", () => {
    const r = lathePartFamilyMatcherEngine.matchPartFamily(
      { kind: "shaft" },
      { ...KEYWORDS_ONLY, minSimilarity: 0, topK: 99 },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.families_evaluated).toBe(12);
      expect(r.descriptor_signals_present).toBe(1);
    }
  });

  it("corpus_coverage = 0 in keywordsOnly mode", () => {
    const r = lathePartFamilyMatcherEngine.matchPartFamily({ kind: "shaft" }, KEYWORDS_ONLY);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.corpus_coverage).toBe(0);
      for (const m of r.matches) expect(m.template_present).toBe(false);
    }
  });

  // ─── inferFromFilename ──────────────────────────────────────────────────

  it("inferFromFilename: extracts ext + kind from a shaft filename", () => {
    const inf = lathePartFamilyMatcherEngine.inferFromFilename(
      "H:/jobs/drive-shaft-1045.min",
    );
    expect(inf.source_filename).toBe("drive-shaft-1045.min");
    expect(inf.ext).toBe("min");
    expect(inf.kind).toBe("shaft");
  });

  it("inferFromFilename: extracts kind from a flange filename", () => {
    const inf = lathePartFamilyMatcherEngine.inferFromFilename(
      "C:/jobs/weld-flange-bolt-circle.sldprt",
    );
    expect(inf.kind).toBe("flange");
    expect(inf.ext).toBe("sldprt");
  });

  it("inferFromFilename: empty input returns empty object", () => {
    expect(lathePartFamilyMatcherEngine.inferFromFilename("")).toEqual({});
  });

  // ─── adversarial / regression ────────────────────────────────────────────

  it("adversarial weights with NaN do not crash — falls back to default weighting", () => {
    const r = lathePartFamilyMatcherEngine.matchPartFamily(
      { kind: "shaft" },
      { ...KEYWORDS_ONLY, weights: { kind: NaN, filename: -1 } as Partial<LatheFamilySignalBreakdown> },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.matches[0].family).toBe("shaft");
      expect(r.matches[0].similarity).toBeGreaterThan(0);
    }
  });

  it("regression: filename pattern `(?<!\\w)shaft(?!\\w)` matches 'shaft' but not 'overshaft'", () => {
    const yes = lathePartFamilyMatcherEngine._signal_filename("shaft", "drive-shaft-A.min");
    const no = lathePartFamilyMatcherEngine._signal_filename("shaft", "overshafted-stock.min");
    expect(yes).toBeGreaterThan(0);
    expect(no).toBe(0);
  });

  it("descriptor with only customer signal returns no_match in keywordsOnly mode", () => {
    const r = lathePartFamilyMatcherEngine.matchPartFamily({ customer: "ITW" }, KEYWORDS_ONLY);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("no_match");
  });
});
