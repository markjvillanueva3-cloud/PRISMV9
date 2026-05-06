import { describe, it, expect } from "vitest";
import { CADCorpusFeaturePrevalenceLearnerEngine } from "../engines/CADCorpusFeaturePrevalenceLearnerEngine.js";
import type { CorpusManifest, CADCorpusEntry } from "../engines/CADCorpusIngestionEngine.js";
import type { PartClass } from "../engines/BlueprintVisionOCREngine.js";
import type { FeatureTemplate } from "../engines/CADClassFeatureLibraryEngine.js";

const engine = new CADCorpusFeaturePrevalenceLearnerEngine();

function entry(rel: string, partClass: PartClass): CADCorpusEntry {
  return {
    abs_path: `/abs/${rel}`,
    rel_path: rel,
    ext: ".step",
    size_bytes: 1000,
    mtime_ms: Date.now(),
    part_class: partClass,
    classifier_confidence: 0.9,
    classifier_match: undefined,
    source_bucket: undefined,
  };
}

function fakeManifest(entries: CADCorpusEntry[]): CorpusManifest {
  return {
    schema_version: "1.0.0",
    generated_at: new Date().toISOString(),
    root: "/test",
    total_entries: entries.length,
    by_class: {},
    by_format: {},
    entries,
  };
}

describe("CADCorpusFeaturePrevalenceLearnerEngine.learnPrevalence", () => {
  it("returns 0 prevalence + confident=false for class with no members", () => {
    const m = fakeManifest([]);
    const r = engine.learnPrevalence(m, "extrude_punch", "central_oil_hole");
    expect(r.class_size).toBe(0);
    expect(r.positive_hits).toBe(0);
    expect(r.learned_prevalence).toBe(0);
    expect(r.confident).toBe(false);
  });

  it("returns confident=false when class_size < MIN_CORPUS_SUPPORT (4 members)", () => {
    const m = fakeManifest([
      entry("a/punch1.step", "extrude_punch"),
      entry("a/punch2.step", "extrude_punch"),
      entry("a/punch3.step", "extrude_punch"),
      entry("a/punch4.step", "extrude_punch"),
    ]);
    const r = engine.learnPrevalence(m, "extrude_punch", "central_oil_hole");
    expect(r.class_size).toBe(4);
    expect(r.confident).toBe(false);
  });

  it("returns confident=true at MIN_CORPUS_SUPPORT (5 members)", () => {
    const ents: CADCorpusEntry[] = [];
    for (let i = 0; i < 5; i++) ents.push(entry(`a/punch${i}.step`, "extrude_punch"));
    const r = engine.learnPrevalence(fakeManifest(ents), "extrude_punch", "central_oil_hole");
    expect(r.class_size).toBe(5);
    expect(r.confident).toBe(true);
  });

  it("computes prevalence = positives / class_size for chamfer feature", () => {
    const m = fakeManifest([
      entry("a/PUNCH 0.5x45 CHAMFER.step", "extrude_punch"),
      entry("a/PUNCH 1x45 chamfer.step", "extrude_punch"),
      entry("a/PUNCH PLAIN.step", "extrude_punch"),
      entry("a/PUNCH RAW.step", "extrude_punch"),
      entry("a/PUNCH STD.step", "extrude_punch"),
    ]);
    const r = engine.learnPrevalence(m, "extrude_punch", "bevel_face_chamfer");
    expect(r.positive_hits).toBe(2);
    expect(r.learned_prevalence).toBeCloseTo(0.4, 3);
    expect(r.confident).toBe(true);
  });

  it("captures matched_tokens (first hit per entry)", () => {
    const m = fakeManifest([
      entry("a/PUNCH OIL HOLE THROUGH.step", "extrude_punch"),
      entry("a/PUNCH coolant hole.step", "extrude_punch"),
      entry("a/PUNCH NO OIL.step", "extrude_punch"),
      entry("a/PUNCH STD.step", "extrude_punch"),
      entry("a/PUNCH PLAIN.step", "extrude_punch"),
    ]);
    const r = engine.learnPrevalence(m, "extrude_punch", "central_oil_hole");
    expect(r.positive_hits).toBe(2);
    expect(r.matched_tokens.length).toBeGreaterThan(0);
    const lower = r.matched_tokens.map((t) => t.toLowerCase());
    expect(lower.some((t) => t.includes("oil") || t.includes("coolant"))).toBe(true);
  });

  it("only counts entries of the target class (cross-class isolation)", () => {
    const m = fakeManifest([
      entry("a/PUNCH OIL HOLE.step", "extrude_punch"),
      entry("a/PUNCH OIL HOLE 2.step", "extrude_punch"),
      entry("a/PUNCH STD.step", "extrude_punch"),
      entry("a/PUNCH STD2.step", "extrude_punch"),
      entry("a/PUNCH STD3.step", "extrude_punch"),
      entry("a/DIE OIL HOLE.step", "die"),
      entry("a/DIE OIL HOLE 2.step", "die"),
    ]);
    const punchR = engine.learnPrevalence(m, "extrude_punch", "central_oil_hole");
    expect(punchR.class_size).toBe(5);
    expect(punchR.positive_hits).toBe(2);
    const dieR = engine.learnPrevalence(m, "die", "central_oil_hole");
    expect(dieR.class_size).toBe(2);
    expect(dieR.positive_hits).toBe(2);
    expect(dieR.confident).toBe(false);
  });

  it("returns 0 prevalence when feature kind has no regex tokens registered", () => {
    const ents: CADCorpusEntry[] = [];
    for (let i = 0; i < 5; i++) ents.push(entry(`a/PART${i}.step`, "extrude_punch"));
    // Use a kind that has no entry in FEATURE_TOKEN_REGEXES (still a valid kind)
    const r = engine.learnPrevalence(fakeManifest(ents), "extrude_punch", "anti_fretting_coating");
    expect(r.class_size).toBe(5);
    expect(r.learned_prevalence).toBe(0);
  });
});

describe("CADCorpusFeaturePrevalenceLearnerEngine.learnAll", () => {
  it("returns one LearnedPrevalence per (class, feature) pair", () => {
    const ents: CADCorpusEntry[] = [];
    for (let i = 0; i < 5; i++) ents.push(entry(`a/PUNCH ${i}.step`, "extrude_punch"));
    const tmpl: Array<{ part_class: PartClass; features: FeatureTemplate[] }> = [{
      part_class: "extrude_punch",
      features: [
        { kind: "central_oil_hole", label: "oil hole", prevalence: 0.9, build_hint: "extrude:cut", rationale: "x" },
        { kind: "bevel_face_chamfer", label: "chamfer", prevalence: 0.8, build_hint: "chamfer", rationale: "x" },
      ],
    }];
    const report = engine.learnAll(fakeManifest(ents), tmpl);
    expect(report.results.length).toBe(2);
    expect(report.classes_examined).toEqual(["extrude_punch"]);
  });

  it("flags divergences when learned vs hand-tuned differ by ≥ threshold", () => {
    // Hand-tuned says 0.9, but corpus shows 0% prevalence → delta = -0.9
    const ents: CADCorpusEntry[] = [];
    for (let i = 0; i < 5; i++) ents.push(entry(`a/PART${i}.step`, "extrude_punch"));
    const tmpl: Array<{ part_class: PartClass; features: FeatureTemplate[] }> = [{
      part_class: "extrude_punch",
      features: [
        { kind: "central_oil_hole", label: "oil hole", prevalence: 0.9, build_hint: "extrude:cut", rationale: "x" },
      ],
    }];
    const report = engine.learnAll(fakeManifest(ents), tmpl, 0.2);
    expect(report.divergences.length).toBe(1);
    expect(report.divergences[0]?.delta).toBeCloseTo(-0.9, 3);
  });

  it("does NOT flag divergences for non-confident (small-corpus) results", () => {
    // Only 3 members → not confident → no divergence reported even with delta
    const ents: CADCorpusEntry[] = [];
    for (let i = 0; i < 3; i++) ents.push(entry(`a/PART${i}.step`, "extrude_punch"));
    const tmpl: Array<{ part_class: PartClass; features: FeatureTemplate[] }> = [{
      part_class: "extrude_punch",
      features: [
        { kind: "central_oil_hole", label: "oil hole", prevalence: 0.9, build_hint: "extrude:cut", rationale: "x" },
      ],
    }];
    const report = engine.learnAll(fakeManifest(ents), tmpl, 0.2);
    expect(report.divergences.length).toBe(0);
  });
});

describe("CADCorpusFeaturePrevalenceLearnerEngine.applyLearned", () => {
  it("blends learned + hand-tuned prevalence with smoothing factor 0.7", () => {
    // Hand-tuned 0.9, learned 0.4 → blended = 0.7 * 0.4 + 0.3 * 0.9 = 0.55
    const ents: CADCorpusEntry[] = [];
    for (let i = 0; i < 5; i++) ents.push(entry(`a/PUNCH ${i}.step`, "extrude_punch"));
    ents[0]!.rel_path = "a/PUNCH OIL HOLE.step";
    ents[1]!.rel_path = "a/PUNCH OIL HOLE 2.step";
    const tmpl: Array<{ part_class: PartClass; features: FeatureTemplate[] }> = [{
      part_class: "extrude_punch",
      features: [
        { kind: "central_oil_hole", label: "oil hole", prevalence: 0.9, build_hint: "extrude:cut", rationale: "x" },
      ],
    }];
    const report = engine.learnAll(fakeManifest(ents), tmpl);
    const blended = engine.applyLearned(tmpl, report, 0.7);
    expect(blended[0]!.features[0]!.prevalence).toBeCloseTo(0.7 * 0.4 + 0.3 * 0.9, 4);
  });

  it("does NOT override hand-tuned when corpus support is insufficient", () => {
    const ents: CADCorpusEntry[] = [];
    for (let i = 0; i < 3; i++) ents.push(entry(`a/PUNCH${i}.step`, "extrude_punch"));
    const tmpl: Array<{ part_class: PartClass; features: FeatureTemplate[] }> = [{
      part_class: "extrude_punch",
      features: [
        { kind: "central_oil_hole", label: "oil hole", prevalence: 0.9, build_hint: "extrude:cut", rationale: "x" },
      ],
    }];
    const report = engine.learnAll(fakeManifest(ents), tmpl);
    const blended = engine.applyLearned(tmpl, report, 0.7);
    expect(blended[0]!.features[0]!.prevalence).toBe(0.9);
  });

  it("clamps blended prevalence to [0, 1]", () => {
    // Hand-tuned 1.0, all corpus matches → blended = 1.0 * 0.7 + 1.0 * 0.3 = 1.0 (clamped if it overflowed)
    const ents: CADCorpusEntry[] = [];
    for (let i = 0; i < 5; i++) ents.push(entry(`a/PUNCH OIL HOLE ${i}.step`, "extrude_punch"));
    const tmpl: Array<{ part_class: PartClass; features: FeatureTemplate[] }> = [{
      part_class: "extrude_punch",
      features: [
        { kind: "central_oil_hole", label: "oil hole", prevalence: 1.0, build_hint: "extrude:cut", rationale: "x" },
      ],
    }];
    const report = engine.learnAll(fakeManifest(ents), tmpl);
    const blended = engine.applyLearned(tmpl, report, 0.7);
    expect(blended[0]!.features[0]!.prevalence).toBeLessThanOrEqual(1);
    expect(blended[0]!.features[0]!.prevalence).toBeGreaterThanOrEqual(0);
  });
});

describe("CADCorpusFeaturePrevalenceLearnerEngine.supportedFeatureKinds", () => {
  it("returns at least 25 feature kinds (covers tooling + turbomachinery + medical + automotive + aerospace)", () => {
    const kinds = engine.supportedFeatureKinds();
    expect(kinds.length).toBeGreaterThanOrEqual(25);
    expect(kinds.includes("central_oil_hole")).toBe(true);
    expect(kinds.includes("leading_edge_fillet")).toBe(true);
    expect(kinds.includes("biocompat_note")).toBe(true);
    expect(kinds.includes("valve_seat_angle")).toBe(true);
    expect(kinds.includes("edge_distance_callout")).toBe(true);
  });
});
