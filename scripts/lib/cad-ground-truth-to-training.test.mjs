// scripts/lib/cad-ground-truth-to-training.test.mjs
// Tests for U-CAD-GT-FEATURE-PRIORS: GT class-prototype catalogs -> CAD-gen training pairs.
// Reference values are the REAL die catalog ratios (state/shared/ocr-ground-truth/cad-prototype-die-*.json).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  featureTier,
  aggregateFeatures,
  gtArtifactToTrainingPairs,
  gtArtifactsToTrainingPairs,
  TIER_CORE,
  TIER_COMMON,
} from "./cad-ground-truth-to-training.mjs";

// A faithful slice of the real die catalog (5 features, descending evidence_ratio).
const DIE = {
  schemaVersion: 1,
  part_class: "die",
  prints: [{
    pdf_path: "cad-corpus-prototype:die",
    dimensions: [
      { kind: "central_oil_hole", presence_only: true, evidence_count: 71, evidence_ratio: 0.9466666666666667 },
      { kind: "bevel_face_chamfer", presence_only: true, evidence_count: 38, evidence_ratio: 0.5066666666666667 },
      { kind: "stepped_revolved_axis", presence_only: true, evidence_count: 35, evidence_ratio: 0.4666666666666667 },
      { kind: "working_tip_taper", presence_only: true, evidence_count: 33, evidence_ratio: 0.44 },
      { kind: "cross_drilled_relief_holes", presence_only: true, evidence_count: 28, evidence_ratio: 0.3733333333333333 },
    ],
  }],
};

describe("featureTier", () => {
  it("tiers at the real boundaries (>=0.7 core, >=0.5 common, else occasional)", () => {
    assert.equal(featureTier(0.95), "core");
    assert.equal(featureTier(TIER_CORE), "core");       // 0.7 inclusive
    assert.equal(featureTier(0.69), "common");
    assert.equal(featureTier(TIER_COMMON), "common");   // 0.5 inclusive
    assert.equal(featureTier(0.49), "occasional");
  });
  it("non-finite ratio -> occasional (never throws)", () => {
    assert.equal(featureTier(NaN), "occasional");
    assert.equal(featureTier(undefined), "occasional");
  });
});

describe("aggregateFeatures", () => {
  it("returns features sorted by evidence_ratio descending", () => {
    const f = aggregateFeatures(DIE);
    assert.equal(f.length, 5);
    assert.equal(f[0].kind, "central_oil_hole");
    assert.equal(f[4].kind, "cross_drilled_relief_holes");
    assert.ok(f[0].evidence_ratio > f[1].evidence_ratio);
  });
  it("dedups by kind across prints keeping the HIGHEST ratio", () => {
    const a = { part_class: "x", prints: [
      { dimensions: [{ kind: "hole", evidence_ratio: 0.4, evidence_count: 4 }] },
      { dimensions: [{ kind: "hole", evidence_ratio: 0.8, evidence_count: 8 }] },
    ] };
    const f = aggregateFeatures(a);
    assert.equal(f.length, 1);
    assert.equal(f[0].evidence_ratio, 0.8);
    assert.equal(f[0].evidence_count, 8);
  });
  it("adversarial: malformed dimension entries are skipped, never throw", () => {
    const a = { part_class: "x", prints: [{ dimensions: [
      null, 42, { kind: "" }, { kind: "good", evidence_ratio: 0.9 }, { kind: "noratio" },
    ] }] };
    assert.doesNotThrow(() => {
      const f = aggregateFeatures(a);
      assert.equal(f.length, 1);
      assert.equal(f[0].kind, "good");
    });
  });
  it("adversarial: null / non-object / no prints -> []", () => {
    assert.deepEqual(aggregateFeatures(null), []);
    assert.deepEqual(aggregateFeatures(42), []);
    assert.deepEqual(aggregateFeatures({ part_class: "x" }), []);
  });
});

describe("gtArtifactToTrainingPairs", () => {
  it("HAPPY: die -> 1 class pair + per-feature pairs only for ratio>=0.5 (central_oil_hole + bevel_face_chamfer)", () => {
    const pairs = gtArtifactToTrainingPairs(DIE);
    // 1 class-level + 2 high-confidence per-feature (0.95, 0.51); the 0.47/0.44/0.37 features get NO standalone pair
    assert.equal(pairs.length, 3);
    const classPair = pairs[0];
    assert.match(classPair.instruction, /classified as "die"/);
    assert.match(classPair.output, /"central_oil_hole" \(core, evidence 0\.95\)/);
    assert.match(classPair.output, /"bevel_face_chamfer" \(common, evidence 0\.51\)/);
    // even the low-confidence feature is in the CLASS list (graded occasional), just no standalone pair
    assert.match(classPair.output, /"stepped_revolved_axis" \(occasional, evidence 0\.47\)/);
    const perFeat = pairs.slice(1);
    assert.ok(perFeat.every((p) => /Should the regenerated model include/.test(p.instruction)));
    assert.ok(perFeat.some((p) => /"central_oil_hole" is a core feature/.test(p.output)));
    // NO standalone pair for the sub-0.5 features (R9: don't teach false certainty)
    assert.ok(!perFeat.some((p) => /working_tip_taper/.test(p.instruction)));
  });

  it("opts.minPerFeatureRatio override widens/narrows the per-feature set", () => {
    const strict = gtArtifactToTrainingPairs(DIE, { minPerFeatureRatio: 0.9 }); // only central_oil_hole(0.95)
    assert.equal(strict.length, 2); // 1 class + 1 feature
    const loose = gtArtifactToTrainingPairs(DIE, { minPerFeatureRatio: 0.3 }); // all 5 features
    assert.equal(loose.length, 6); // 1 class + 5 features
  });

  it("FAILURE: no part_class -> []", () => {
    assert.deepEqual(gtArtifactToTrainingPairs({ prints: DIE.prints }), []);
  });
  it("FAILURE: part_class present but no usable features -> []", () => {
    assert.deepEqual(gtArtifactToTrainingPairs({ part_class: "empty", prints: [] }), []);
  });
  it("adversarial: null / non-object -> [] (no throw)", () => {
    assert.doesNotThrow(() => {
      assert.deepEqual(gtArtifactToTrainingPairs(null), []);
      assert.deepEqual(gtArtifactToTrainingPairs("nope"), []);
    });
  });
  it("pairs are valid Alpaca shape (non-empty instruction + output strings)", () => {
    for (const p of gtArtifactToTrainingPairs(DIE)) {
      assert.equal(typeof p.instruction, "string");
      assert.equal(typeof p.output, "string");
      assert.ok(p.instruction.length > 10 && p.output.length > 10);
    }
  });
});

describe("gtArtifactsToTrainingPairs", () => {
  it("dedups by instruction across artifacts (re-run stable)", () => {
    const once = gtArtifactsToTrainingPairs([DIE]);
    const twice = gtArtifactsToTrainingPairs([DIE, DIE]); // same catalog twice
    assert.equal(once.length, twice.length); // dedup -> identical count
  });
  it("two distinct classes accumulate (no cross-class collision)", () => {
    const bracket = { part_class: "bracket", prints: [{ dimensions: [{ kind: "central_oil_hole", evidence_ratio: 1.0, evidence_count: 5 }] }] };
    const pairs = gtArtifactsToTrainingPairs([DIE, bracket]);
    assert.ok(pairs.some((p) => /classified as "die"/.test(p.instruction)));
    assert.ok(pairs.some((p) => /classified as "bracket"/.test(p.instruction)));
  });
  it("adversarial: non-array input -> []", () => {
    assert.deepEqual(gtArtifactsToTrainingPairs(null), []);
    assert.deepEqual(gtArtifactsToTrainingPairs(DIE), []); // single object, not array
  });
});
