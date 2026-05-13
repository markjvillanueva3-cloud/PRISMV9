/**
 * MillPartFamilyMatcherEngine — real-value contract tests
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
  millPartFamilyMatcherEngine,
  MillPartFamilyMatcherEngine,
  type MillFamilySignalBreakdown,
} from "../engines/MillPartFamilyMatcherEngine.js";
import { MILL_TEMPLATE_FAMILIES } from "../engines/MillPartFamilyTemplateExtractorEngine.js";

const KEYWORDS_ONLY = { keywordsOnly: true };

describe("MillPartFamilyMatcherEngine", () => {
  // ─── construction + taxonomy ──────────────────────────────────────────────

  it("exports a singleton + class", () => {
    expect(millPartFamilyMatcherEngine).toBeInstanceOf(MillPartFamilyMatcherEngine);
  });

  it("listFamilies() returns the canonical 8-family taxonomy", () => {
    const families = millPartFamilyMatcherEngine.listFamilies();
    expect(families).toEqual(MILL_TEMPLATE_FAMILIES);
    expect(families.length).toBe(8);
    expect(families).toContain("taptite-mill");
    expect(families).toContain("electrode-mill");
    expect(families).toContain("plate");
    expect(families).toContain("bracket-housing");
    expect(families).toContain("mold-die-insert");
    expect(families).toContain("aerospace-bracket");
    expect(families).toContain("sheet-metal-fixture");
    expect(families).toContain("unknown");
  });

  it("default weights sum to exactly 1.0 with audited per-signal values", () => {
    const w = millPartFamilyMatcherEngine._defaultWeights();
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
    const r = millPartFamilyMatcherEngine.matchPartFamily(null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("empty_descriptor");
  });

  it("returns empty_descriptor when no signals are set", () => {
    const r = millPartFamilyMatcherEngine.matchPartFamily({});
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("empty_descriptor");
      expect(r.detail).toMatch(/kind|source_filename|ext|customer|material|features/);
    }
  });

  it("returns empty_descriptor when only non-signal fields are set", () => {
    const r = millPartFamilyMatcherEngine.matchPartFamily({
      length_mm: 100,
      width_mm: 50,
      height_mm: 10,
      hasPocket: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("empty_descriptor");
  });

  // ─── kind signal — substring + exact equality ────────────────────────────

  it("kind signal: exact family name returns 1.0", () => {
    expect(millPartFamilyMatcherEngine._signal_kind("plate", "plate")).toBe(1.0);
    expect(millPartFamilyMatcherEngine._signal_kind("electrode-mill", "electrode-mill")).toBe(1.0);
  });

  it("kind signal: exact keyword returns 1.0", () => {
    expect(millPartFamilyMatcherEngine._signal_kind("taptite-mill", "taptite")).toBe(1.0);
    expect(millPartFamilyMatcherEngine._signal_kind("bracket-housing", "bracket")).toBe(1.0);
  });

  it("kind signal: substring match returns 0.75", () => {
    expect(millPartFamilyMatcherEngine._signal_kind("plate", "thick-plate-stock")).toBeCloseTo(0.75, 5);
    expect(millPartFamilyMatcherEngine._signal_kind("electrode-mill", "graphite-electrode-blank")).toBeCloseTo(0.75, 5);
  });

  it("kind signal: no match returns 0", () => {
    expect(millPartFamilyMatcherEngine._signal_kind("plate", "shaft")).toBe(0);
    expect(millPartFamilyMatcherEngine._signal_kind("electrode-mill", "casing")).toBe(0);
  });

  it("kind signal: unknown family with empty keywords returns 0 always", () => {
    expect(millPartFamilyMatcherEngine._signal_kind("unknown", "unknown")).toBe(0);
    expect(millPartFamilyMatcherEngine._signal_kind("unknown", "anything")).toBe(0);
  });

  // ─── filename signal — regex pattern matching ────────────────────────────

  it("filename signal: matching pattern returns positive score", () => {
    const s = millPartFamilyMatcherEngine._signal_filename("plate", "12x6-plate-A36.min");
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThanOrEqual(1);
  });

  it("filename signal: case-insensitive match works", () => {
    expect(millPartFamilyMatcherEngine._signal_filename("electrode-mill", "Copper-Electrode-A.SLDPRT")).toBeGreaterThan(0);
    expect(millPartFamilyMatcherEngine._signal_filename("bracket-housing", "Aluminum-Bracket.ipt")).toBeGreaterThan(0);
  });

  it("filename signal: no match returns 0", () => {
    expect(millPartFamilyMatcherEngine._signal_filename("plate", "casing-job-001.min")).toBe(0);
    expect(millPartFamilyMatcherEngine._signal_filename("taptite-mill", "random-name.min")).toBe(0);
  });

  it("filename signal: unknown family always returns 0", () => {
    expect(millPartFamilyMatcherEngine._signal_filename("unknown", "anything-electrode.min")).toBe(0);
  });

  // ─── material signal — bias map ──────────────────────────────────────────

  it("material signal: copper biases electrode-mill", () => {
    expect(millPartFamilyMatcherEngine._signal_material("electrode-mill", "Copper C110")).toBeGreaterThan(0);
    expect(millPartFamilyMatcherEngine._signal_material("plate", "Copper C110")).toBe(0);
  });

  it("material signal: P20 biases mold-die-insert", () => {
    expect(millPartFamilyMatcherEngine._signal_material("mold-die-insert", "P20 mold steel")).toBeGreaterThan(0);
  });

  it("material signal: inconel biases aerospace-bracket but not electrode-mill", () => {
    const aero = millPartFamilyMatcherEngine._signal_material("aerospace-bracket", "Inconel 718");
    const electrode = millPartFamilyMatcherEngine._signal_material("electrode-mill", "Inconel 718");
    expect(aero).toBeGreaterThan(0);
    expect(electrode).toBe(0);
  });

  it("material signal: unknown material returns 0", () => {
    expect(millPartFamilyMatcherEngine._signal_material("plate", "ZX-9000-novel-alloy")).toBe(0);
  });

  // ─── features signal — Jaccard ───────────────────────────────────────────

  it("features signal: exact overlap returns 1.0", () => {
    const s = millPartFamilyMatcherEngine._signal_features("plate", [
      "face",
      "surface-mill",
      "large-flat",
      "drill-pattern",
      "flatness",
      "parallelism",
    ]);
    expect(s).toBeCloseTo(1.0, 5);
  });

  it("features signal: partial overlap returns Jaccard fraction (1/6)", () => {
    // 1 hit ("pocket"), descriptor has 1 feature, family has 6 keywords → union=6, inter=1 → 1/6
    const s = millPartFamilyMatcherEngine._signal_features("bracket-housing", ["pocket"]);
    expect(s).toBeCloseTo(1 / 6, 5);
  });

  it("features signal: empty descriptor returns 0", () => {
    expect(millPartFamilyMatcherEngine._signal_features("plate", [])).toBe(0);
    expect(millPartFamilyMatcherEngine._signal_features("plate", undefined)).toBe(0);
  });

  // ─── descriptor signal counting ──────────────────────────────────────────

  it("countSignals: counts only populated descriptor fields", () => {
    expect(millPartFamilyMatcherEngine._countSignals({})).toBe(0);
    expect(millPartFamilyMatcherEngine._countSignals({ kind: "plate" })).toBe(1);
    expect(
      millPartFamilyMatcherEngine._countSignals({
        kind: "plate",
        material: "6061-T6",
        customer: "ITW",
      }),
    ).toBe(3);
    expect(
      millPartFamilyMatcherEngine._countSignals({
        kind: "plate",
        source_filename: "plate-1.min",
        ext: "min",
        customer: "ITW",
        material: "6061-T6",
        features: ["face"],
      }),
    ).toBe(6);
  });

  it("countSignals: empty arrays + empty strings count as zero signals", () => {
    expect(millPartFamilyMatcherEngine._countSignals({ kind: "" })).toBe(0);
    expect(millPartFamilyMatcherEngine._countSignals({ features: [] })).toBe(0);
  });

  // ─── weight normalization ────────────────────────────────────────────────

  it("normalizeWeights: re-normalizes unbalanced custom weights to sum 1.0", () => {
    const w = millPartFamilyMatcherEngine._normalizeWeights({ kind: 0.5, filename: 0.5 });
    const sum = w.kind + w.filename + w.features + w.material + w.customer + w.ext;
    expect(sum).toBeCloseTo(1.0, 5);
    // kind=0.5 + filename=0.5 + default 0.20+0.15+0.10+0.05 = 1.50 → normalized kind = 0.5/1.50 ≈ 0.333
    expect(w.kind).toBeCloseTo(0.5 / 1.50, 5);
    expect(w.filename).toBeCloseTo(0.5 / 1.50, 5);
  });

  it("normalizeWeights: discards negative or non-finite weights, keeps defaults", () => {
    const w = millPartFamilyMatcherEngine._normalizeWeights({ kind: -1, filename: NaN });
    // Negative kind discarded → keeps default 0.30; NaN filename discarded → keeps default 0.20.
    // After renorm to sum=1 (all defaults), per-weight values exactly match defaults.
    expect(w.kind).toBeCloseTo(0.30, 5);
    expect(w.filename).toBeCloseTo(0.20, 5);
  });

  it("normalizeWeights: all-zero custom weights fall back to defaults", () => {
    const w = millPartFamilyMatcherEngine._normalizeWeights({
      kind: 0,
      filename: 0,
      features: 0,
      material: 0,
      customer: 0,
      ext: 0,
    });
    const defaults = millPartFamilyMatcherEngine._defaultWeights();
    expect(w).toEqual(defaults);
  });

  // ─── ranking — full pipeline ─────────────────────────────────────────────

  it("ranks electrode-mill highest for an electrode descriptor", () => {
    const r = millPartFamilyMatcherEngine.matchPartFamily(
      {
        kind: "electrode-mill",
        material: "Copper C110",
        features: ["pocket", "electrode-shape", "shrink-allowance"],
        source_filename: "electrode-cu-A.sldprt",
      },
      KEYWORDS_ONLY,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.matches[0].family).toBe("electrode-mill");
      expect(r.matches[0].similarity).toBeGreaterThan(0);
      expect(r.matches[0].confidenceLow).toBeLessThanOrEqual(r.matches[0].similarity);
      expect(r.matches[0].confidenceHigh).toBeGreaterThanOrEqual(r.matches[0].similarity);
    }
  });

  it("ranks plate highest for a plate-shaped descriptor", () => {
    const r = millPartFamilyMatcherEngine.matchPartFamily(
      {
        kind: "plate",
        material: "Mic-6 aluminum",
        features: ["face", "surface-mill", "large-flat", "flatness"],
        source_filename: "fixture-plate-base.sldprt",
      },
      KEYWORDS_ONLY,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.matches[0].family).toBe("plate");
  });

  it("ranks mold-die-insert highest for a mold descriptor", () => {
    const r = millPartFamilyMatcherEngine.matchPartFamily(
      {
        kind: "mold-insert",
        material: "P20 mold steel",
        features: ["cavity", "core", "parting-line", "mold-pocket"],
        source_filename: "mold-cavity-A.f3d",
      },
      KEYWORDS_ONLY,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.matches[0].family).toBe("mold-die-insert");
  });

  it("ranks aerospace-bracket highest for a thin-wall titanium descriptor", () => {
    const r = millPartFamilyMatcherEngine.matchPartFamily(
      {
        kind: "aerospace-bracket",
        material: "Ti-6Al-4V titanium",
        features: ["thin-wall", "lightening-pocket", "web", "rib"],
      },
      KEYWORDS_ONLY,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.matches[0].family).toBe("aerospace-bracket");
  });

  it("ranks taptite-mill highest for a taptite descriptor", () => {
    const r = millPartFamilyMatcherEngine.matchPartFamily(
      {
        kind: "taptite",
        material: "1018 steel",
        features: ["tap", "hex-head", "thread-rolling"],
        source_filename: "taptite-head-mill.f3d",
      },
      KEYWORDS_ONLY,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.matches[0].family).toBe("taptite-mill");
  });

  // ─── result shape contract — concrete numeric assertions ─────────────────

  it("each match's similarity is in [0,1] and signals are in [0,1]", () => {
    const r = millPartFamilyMatcherEngine.matchPartFamily(
      { kind: "plate", material: "6061" },
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
    const r = millPartFamilyMatcherEngine.matchPartFamily(
      {
        kind: "electrode-mill",
        material: "Copper",
        features: ["pocket", "electrode-shape"],
      },
      { ...KEYWORDS_ONLY, topK: 8, minSimilarity: 0 },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      for (let i = 1; i < r.matches.length; i++) {
        expect(r.matches[i - 1].similarity).toBeGreaterThanOrEqual(r.matches[i].similarity);
      }
    }
  });

  it("respects topK option — exactly 2 results", () => {
    const r = millPartFamilyMatcherEngine.matchPartFamily(
      {
        kind: "plate",
        material: "6061",
        features: ["face", "flatness"],
      },
      { ...KEYWORDS_ONLY, topK: 2, minSimilarity: 0 },
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.matches.length).toBe(2);
  });

  it("respects minSimilarity option — drops unrelated families or returns no_match", () => {
    const r = millPartFamilyMatcherEngine.matchPartFamily(
      { kind: "plate" },
      { ...KEYWORDS_ONLY, minSimilarity: 0.5 },
    );
    if (r.ok) {
      for (const m of r.matches) expect(m.similarity).toBeGreaterThanOrEqual(0.5);
    } else {
      expect(r.error).toBe("no_match");
    }
  });

  it("confidence band widens when fewer signals are populated", () => {
    const oneSignal = millPartFamilyMatcherEngine.matchPartFamily(
      { kind: "plate" },
      KEYWORDS_ONLY,
    );
    const allSignals = millPartFamilyMatcherEngine.matchPartFamily(
      {
        kind: "plate",
        source_filename: "plate-1.min",
        ext: "min",
        customer: "ITW",
        material: "6061",
        features: ["face"],
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
    const r = millPartFamilyMatcherEngine.matchPartFamily({ kind: "plate" }, KEYWORDS_ONLY);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.corpus_coverage).toBe(0);
      for (const m of r.matches) expect(m.template_present).toBe(false);
    }
  });

  it("families_evaluated equals 8; descriptor_signals_present reflects descriptor count", () => {
    const r = millPartFamilyMatcherEngine.matchPartFamily({ kind: "plate" }, {
      ...KEYWORDS_ONLY,
      minSimilarity: 0,
      topK: 99,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.families_evaluated).toBe(8);
      expect(r.descriptor_signals_present).toBe(1);
    }
  });

  // ─── inferFromFilename ──────────────────────────────────────────────────

  it("inferFromFilename: extracts ext + kind from a plate filename", () => {
    const inf = millPartFamilyMatcherEngine.inferFromFilename(
      "H:/jobs/12x6-plate-A36.min",
    );
    expect(inf.source_filename).toBe("12x6-plate-A36.min");
    expect(inf.ext).toBe("min");
    expect(inf.kind).toBe("plate");
  });

  it("inferFromFilename: extracts kind from an electrode filename", () => {
    const inf = millPartFamilyMatcherEngine.inferFromFilename(
      "C:/jobs/copper-electrode-A.sldprt",
    );
    expect(inf.kind).toBe("electrode-mill");
    expect(inf.ext).toBe("sldprt");
  });

  it("inferFromFilename: empty input returns empty object", () => {
    expect(millPartFamilyMatcherEngine.inferFromFilename("")).toEqual({});
    // @ts-expect-error — intentional null
    expect(millPartFamilyMatcherEngine.inferFromFilename(null)).toEqual({});
  });

  it("inferFromFilename: filename without extension still surfaces source_filename + kind", () => {
    const inf = millPartFamilyMatcherEngine.inferFromFilename("plain-bracket");
    expect(inf.source_filename).toBe("plain-bracket");
    // ext is absent when no dot in filename.
    expect(inf.ext).toBe(undefined);
    expect(inf.kind).toBe("bracket-housing");
  });

  // ─── adversarial / regression ────────────────────────────────────────────

  it("adversarial weights with NaN do not crash — falls back to default weighting", () => {
    const r = millPartFamilyMatcherEngine.matchPartFamily(
      { kind: "plate" },
      { ...KEYWORDS_ONLY, weights: { kind: NaN, filename: -1 } as Partial<MillFamilySignalBreakdown> },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.matches[0].family).toBe("plate");
      expect(r.matches[0].similarity).toBeGreaterThan(0);
    }
  });

  it("very long source_filename does not crash the regex matcher", () => {
    // Word-char delimiters: 'plate' is embedded → lookarounds reject (correct).
    const longEmbedded = "a".repeat(10_000) + "plate" + "b".repeat(10_000);
    const infEmbedded = millPartFamilyMatcherEngine.inferFromFilename(longEmbedded);
    expect(infEmbedded.source_filename).toBe(longEmbedded);
    expect(infEmbedded.kind).toBe(undefined);
    // Non-word delimiters: 'plate' surrounded by '-' → lookarounds pass, kind is "plate".
    const longBoundary = "a".repeat(10_000) + "-plate-" + "b".repeat(10_000);
    const infBoundary = millPartFamilyMatcherEngine.inferFromFilename(longBoundary);
    expect(infBoundary.source_filename).toBe(longBoundary);
    expect(infBoundary.kind).toBe("plate");
  });

  it("descriptor with only customer signal returns no_match in keywordsOnly mode", () => {
    const r = millPartFamilyMatcherEngine.matchPartFamily(
      { customer: "ITW" },
      KEYWORDS_ONLY,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("no_match");
  });

  it("regression: filename pattern `(?<!\\w)core(?!\\w)` matches 'core-cavity' but not 'corebore'", () => {
    const yes = millPartFamilyMatcherEngine._signal_filename("mold-die-insert", "mold-core-cavity.f3d");
    const no = millPartFamilyMatcherEngine._signal_filename("mold-die-insert", "corebore-shaft.min");
    expect(yes).toBeGreaterThan(0);
    expect(no).toBe(0);
  });

  it("regression: aerospace-bracket lookahead `(?<!\\w)spar(?!\\w)` matches 'spar' but not 'sparse'", () => {
    const yes = millPartFamilyMatcherEngine._signal_filename("aerospace-bracket", "wing-spar-rib.f3d");
    const no = millPartFamilyMatcherEngine._signal_filename("aerospace-bracket", "sparse-pattern.f3d");
    expect(yes).toBeGreaterThan(0);
    expect(no).toBe(0);
  });

  it("rationale strings include signal names + percentages when signals are positive", () => {
    const r = millPartFamilyMatcherEngine.matchPartFamily(
      {
        kind: "plate",
        material: "6061",
        features: ["face", "flatness"],
      },
      KEYWORDS_ONLY,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      const plate = r.matches.find((m) => m.family === "plate");
      // Use concrete assertion against the family name (not toBeTruthy).
      expect(plate?.family).toBe("plate");
      const blob = (plate?.rationale ?? []).join(" ");
      expect(blob).toMatch(/kind hit/);
      expect(blob).toMatch(/material bias/);
      expect(blob).toMatch(/feature Jaccard/);
    }
  });

  it("rationale falls back to 'no signal matched' when descriptor doesn't hit a family", () => {
    const r = millPartFamilyMatcherEngine.matchPartFamily(
      { kind: "electrode-mill" },
      { ...KEYWORDS_ONLY, minSimilarity: 0, topK: 99 },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      const plate = r.matches.find((m) => m.family === "plate");
      expect(plate?.family).toBe("plate");
      // Plate has no signals when descriptor only references electrode-mill.
      expect(plate?.similarity).toBe(0);
      expect((plate?.rationale ?? []).join(" ")).toMatch(/no signal matched|fallback ordering/);
    }
  });
});
