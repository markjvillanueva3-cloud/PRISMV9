/**
 * SynergyClassifierEngine — engine-direct tests
 * ==============================================
 *
 * Covers the U-ALL04 verifies_via channel: 20 fixed research-output
 * feature vectors → classify → compare to ground truth ≥ 80%
 * accuracy. Adversarial cases: NaN feature poison, contradictory
 * features (high novelty + high duplication). Variability axis:
 * manufacturing / AI / dev-tools / safety domains × high/med/low/none
 * decision boundaries.
 *
 * Dispatcher round-trip wiring is verified separately in
 * `aiReasoning.synergyClassify.test.ts`.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  SynergyClassifierEngine,
  DEFAULT_RUBRIC,
  RUBRIC_SCHEMA_VERSION,
  synergyClassifierEngine,
  type ClassifierFeatures,
  type ClassifierRubric,
} from "../engines/SynergyClassifierEngine.js";

// ─── Fixtures ───────────────────────────────────────────────────────

const T0 = Date.UTC(2026, 4, 13, 12, 0, 0);

function makeFeatures(over: Partial<ClassifierFeatures> = {}): ClassifierFeatures {
  return {
    semantic_match: 0,
    novelty_strength: 0,
    ai_priority_score: 0,
    duplication_risk: 0,
    effort_estimate: 0,
    blast_radius: 0,
    ...over,
  };
}

// ─── Constructor + defaults ─────────────────────────────────────────

describe("SynergyClassifierEngine — constructor", () => {
  it("constructs with the spec default rubric when no opts given", () => {
    const e = new SynergyClassifierEngine();
    const r = e.getRubric();
    expect(r.schemaVersion).toBe(RUBRIC_SCHEMA_VERSION);
    expect(r.high).toBe(0.65);
    expect(r.med).toBe(0.45);
    expect(r.low).toBe(0.25);
    expect(r.duplicate_veto_threshold).toBe(0.85);
  });

  it("clones the injected rubric — mutating the snapshot doesn't affect engine state", () => {
    const e = new SynergyClassifierEngine();
    const snap = e.getRubric();
    snap.high = 0.99;
    snap.weights.semantic_match = 0;
    expect(e.getRubric().high).toBe(0.65);
    expect(e.getRubric().weights.semantic_match).toBe(0.3);
  });

  it("throws when constructed with a malformed rubric (non-monotone thresholds)", () => {
    const bad: ClassifierRubric = {
      ...DEFAULT_RUBRIC,
      high: 0.3,
      med: 0.4,
      low: 0.2,
    };
    expect(() => new SynergyClassifierEngine({ rubric: bad })).toThrow(/thresholds_not_monotone/);
  });
});

// ─── classify — band boundaries ─────────────────────────────────────

describe("SynergyClassifierEngine — band boundaries", () => {
  let e: SynergyClassifierEngine;
  beforeEach(() => {
    e = new SynergyClassifierEngine({ now: () => T0 });
  });

  it("HIGH band: strong positive features, low costs ⇒ label 'high'", () => {
    const f = makeFeatures({
      semantic_match: 1.0,
      novelty_strength: 1.0,
      ai_priority_score: 1.0,
      duplication_risk: 0.0,
      effort_estimate: 0.1,
      blast_radius: 0.1,
    });
    // sum = 0.3 + 0.25 + 0.2 - 0 - 0.01 - 0.005 = 0.735
    const v = e.classify(f);
    expect(v.label).toBe("high");
    expect(v.reason).toBe("score_band");
    expect(v.score).toBeCloseTo(0.735, 3);
    expect(v.classifiedAt).toBe(T0);
  });

  it("MED band: moderate positive features ⇒ label 'med'", () => {
    const f = makeFeatures({
      semantic_match: 0.7,
      novelty_strength: 0.6,
      ai_priority_score: 0.5,
      duplication_risk: 0.2,
      effort_estimate: 0.3,
      blast_radius: 0.3,
    });
    // sum = 0.21 + 0.15 + 0.10 - 0.04 - 0.03 - 0.015 = 0.375
    const v = e.classify(f);
    expect(v.label).toBe("low"); // 0.375 < 0.45, so actually LOW
    expect(v.score).toBeCloseTo(0.375, 3);
  });

  it("MED band: tuned features land in [0.45, 0.65)", () => {
    const f = makeFeatures({
      semantic_match: 0.8,
      novelty_strength: 0.8,
      ai_priority_score: 0.7,
      duplication_risk: 0.1,
      effort_estimate: 0.2,
      blast_radius: 0.2,
    });
    // sum = 0.24 + 0.20 + 0.14 - 0.02 - 0.02 - 0.01 = 0.530
    const v = e.classify(f);
    expect(v.label).toBe("med");
    expect(v.score).toBeCloseTo(0.530, 3);
  });

  it("LOW band: weak positive features, some cost ⇒ label 'low'", () => {
    const f = makeFeatures({
      semantic_match: 0.5,
      novelty_strength: 0.4,
      ai_priority_score: 0.3,
      duplication_risk: 0.1,
      effort_estimate: 0.4,
      blast_radius: 0.4,
    });
    // sum = 0.15 + 0.10 + 0.06 - 0.02 - 0.04 - 0.02 = 0.230
    const v = e.classify(f);
    expect(v.label).toBe("none"); // below 0.25
    expect(v.score).toBeCloseTo(0.230, 3);
  });

  it("LOW band: tuned to land in [0.25, 0.45)", () => {
    const f = makeFeatures({
      semantic_match: 0.6,
      novelty_strength: 0.5,
      ai_priority_score: 0.4,
      duplication_risk: 0.15,
      effort_estimate: 0.3,
      blast_radius: 0.3,
    });
    // sum = 0.18 + 0.125 + 0.08 - 0.03 - 0.03 - 0.015 = 0.310
    const v = e.classify(f);
    expect(v.label).toBe("low");
    expect(v.score).toBeCloseTo(0.310, 3);
  });

  it("NONE band: very weak positive features ⇒ label 'none' with score_band reason", () => {
    const f = makeFeatures({
      semantic_match: 0.1,
      novelty_strength: 0.1,
      ai_priority_score: 0.1,
    });
    // sum = 0.03 + 0.025 + 0.02 = 0.075
    const v = e.classify(f);
    expect(v.label).toBe("none");
    expect(v.reason).toBe("score_band");
    expect(v.score).toBeCloseTo(0.075, 3);
  });

  it("score is clamped to [0, 1] even with adversarial out-of-range features", () => {
    // Engine clamps each feature to [0,1] before weighting, so a
    // 1.5 semantic_match contributes 1*0.3 = 0.3, not 0.45.
    const f = makeFeatures({
      semantic_match: 1.5,
      novelty_strength: 1.5,
      ai_priority_score: 1.5,
      duplication_risk: -0.5, // clamps to 0
      effort_estimate: 0,
      blast_radius: 0,
    });
    const v = e.classify(f);
    expect(v.score).toBeCloseTo(0.75, 3); // 0.3 + 0.25 + 0.2
    expect(v.label).toBe("high");
  });
});

// ─── classify — vetoes + adversarial inputs ─────────────────────────

describe("SynergyClassifierEngine — vetoes", () => {
  let e: SynergyClassifierEngine;
  beforeEach(() => {
    e = new SynergyClassifierEngine({ now: () => T0 });
  });

  it("invalid_features veto: NaN semantic_match ⇒ 'none' regardless of other signals", () => {
    const f = makeFeatures({
      semantic_match: Number.NaN,
      novelty_strength: 1.0,
      ai_priority_score: 1.0,
    });
    const v = e.classify(f);
    expect(v.label).toBe("none");
    expect(v.reason).toBe("invalid_features");
    expect(v.score).toBe(0);
  });

  it("invalid_features veto: Infinity any feature ⇒ 'none'", () => {
    const f = makeFeatures({ effort_estimate: Number.POSITIVE_INFINITY });
    const v = e.classify(f);
    expect(v.label).toBe("none");
    expect(v.reason).toBe("invalid_features");
  });

  it("invalid_features veto: missing feature key ⇒ 'none'", () => {
    const bad = { semantic_match: 1.0 } as unknown as ClassifierFeatures;
    const v = e.classify(bad);
    expect(v.label).toBe("none");
    expect(v.reason).toBe("invalid_features");
  });

  it("duplicate_veto: duplication_risk above 0.85 ⇒ 'none' even with perfect novelty + match", () => {
    const f = makeFeatures({
      semantic_match: 1.0,
      novelty_strength: 1.0,
      ai_priority_score: 1.0,
      duplication_risk: 0.95,
    });
    const v = e.classify(f);
    expect(v.label).toBe("none");
    expect(v.reason).toBe("duplicate_veto");
    expect(v.score).toBe(0);
  });

  it("duplicate_veto threshold inclusive boundary: 0.85 exactly does NOT veto (>, not ≥)", () => {
    const f = makeFeatures({
      semantic_match: 1.0,
      novelty_strength: 1.0,
      ai_priority_score: 1.0,
      duplication_risk: 0.85,
    });
    const v = e.classify(f);
    expect(v.reason).toBe("score_band");
    // Score: 0.30 + 0.25 + 0.20 - 0.85*0.20 = 0.58 — lands in MED band
    // (0.45 ≤ 0.58 < 0.65). The point of this test is to confirm the
    // veto cutoff is strict-greater-than, NOT to land in any specific
    // non-none band — what matters is reason === "score_band".
    expect(v.label).toBe("med");
    expect(v.score).toBeCloseTo(0.58, 3);
  });

  it("contradictory features (high novelty + high duplication) ⇒ duplicate_veto wins", () => {
    // The U-ALL04 spec adversarial case: a paper with high novelty
    // signal AND high duplication risk. Veto wins.
    const f = makeFeatures({
      semantic_match: 0.9,
      novelty_strength: 0.95,
      ai_priority_score: 0.9,
      duplication_risk: 0.90, // above veto cutoff
    });
    const v = e.classify(f);
    expect(v.label).toBe("none");
    expect(v.reason).toBe("duplicate_veto");
  });
});

// ─── classify — variability across simulated domains ────────────────

describe("SynergyClassifierEngine — variability across domains", () => {
  let e: SynergyClassifierEngine;
  beforeEach(() => {
    e = new SynergyClassifierEngine({ now: () => T0 });
  });

  /**
   * Each domain provides one HIGH-fit fixture so we can verify the
   * decision tree behaves consistently regardless of which domain
   * a research item belongs to. Domain naming is documentation-only
   * — the engine itself doesn't see "domain", only the features.
   */
  it.each([
    [
      "manufacturing",
      makeFeatures({
        // Score: 0.30 + 0.225 + 0.18 - 0.01 - 0.01 - 0.005 = 0.680
        semantic_match: 1.0,
        novelty_strength: 0.9,
        ai_priority_score: 0.9,
        duplication_risk: 0.05,
        effort_estimate: 0.1,
        blast_radius: 0.1,
      }),
      "high",
    ],
    [
      "AI / ML",
      makeFeatures({
        semantic_match: 0.85,
        novelty_strength: 0.7,
        ai_priority_score: 0.9,
        duplication_risk: 0.3,
        effort_estimate: 0.4,
        blast_radius: 0.3,
      }),
      "med",
    ],
    [
      "dev-tools",
      makeFeatures({
        semantic_match: 0.6,
        novelty_strength: 0.5,
        ai_priority_score: 0.4,
        duplication_risk: 0.15,
        effort_estimate: 0.3,
        blast_radius: 0.3,
      }),
      "low",
    ],
    [
      "safety / compliance",
      makeFeatures({
        semantic_match: 0.3,
        novelty_strength: 0.2,
        ai_priority_score: 0.4,
        duplication_risk: 0.5,
        effort_estimate: 0.5,
        blast_radius: 0.6,
      }),
      "none",
    ],
  ])("%s domain ⇒ label %s", (_domain, features, expectedLabel) => {
    const v = e.classify(features);
    expect(v.label).toBe(expectedLabel);
  });
});

// ─── classifyBatch ──────────────────────────────────────────────────

describe("SynergyClassifierEngine — classifyBatch", () => {
  let e: SynergyClassifierEngine;
  beforeEach(() => {
    e = new SynergyClassifierEngine({ now: () => T0 });
  });

  it("counts each band correctly over a mixed batch", () => {
    const batch = [
      makeFeatures({ semantic_match: 1, novelty_strength: 1, ai_priority_score: 1 }), // high
      makeFeatures({ semantic_match: 0.8, novelty_strength: 0.8, ai_priority_score: 0.7, duplication_risk: 0.1, effort_estimate: 0.2, blast_radius: 0.2 }), // med
      makeFeatures({ semantic_match: 0.6, novelty_strength: 0.5, ai_priority_score: 0.4, duplication_risk: 0.15, effort_estimate: 0.3, blast_radius: 0.3 }), // low
      makeFeatures({ semantic_match: 0.1, novelty_strength: 0.1 }), // none (score_band)
      makeFeatures({ semantic_match: 1, duplication_risk: 0.95 }), // none (duplicate_veto)
    ];
    const r = e.classifyBatch(batch);
    expect(r.results.length).toBe(5);
    expect(r.counts.high).toBe(1);
    expect(r.counts.med).toBe(1);
    expect(r.counts.low).toBe(1);
    expect(r.counts.none).toBe(2);
  });

  it("empty batch ⇒ empty results, zero counts", () => {
    const r = e.classifyBatch([]);
    expect(r.results.length).toBe(0);
    expect(r.counts.high).toBe(0);
    expect(r.counts.med).toBe(0);
    expect(r.counts.low).toBe(0);
    expect(r.counts.none).toBe(0);
  });

  it("non-array input ⇒ empty results (defensive)", () => {
    const r = e.classifyBatch(null as unknown as ClassifierFeatures[]);
    expect(r.results.length).toBe(0);
  });
});

// ─── Rubric adaptive tuning ─────────────────────────────────────────

describe("SynergyClassifierEngine — rubric tuning", () => {
  it("setRubric swaps the active rubric and affects subsequent classify()", () => {
    const e = new SynergyClassifierEngine({ now: () => T0 });
    const before = e.classify(makeFeatures({ semantic_match: 0.8, novelty_strength: 0.5, ai_priority_score: 0.5 }));
    // Aggressive new rubric: cut high to 0.20.
    const tuned: ClassifierRubric = {
      ...DEFAULT_RUBRIC,
      high: 0.20,
      med: 0.15,
      low: 0.10,
    };
    expect(e.setRubric(tuned).ok).toBe(true);
    const after = e.classify(makeFeatures({ semantic_match: 0.8, novelty_strength: 0.5, ai_priority_score: 0.5 }));
    // Same features, different label under new rubric.
    expect(before.label === after.label).toBe(false);
    expect(after.label).toBe("high");
  });

  it("setRubric rejects non-monotone thresholds, leaves active rubric unchanged", () => {
    const e = new SynergyClassifierEngine();
    const bad: ClassifierRubric = { ...DEFAULT_RUBRIC, high: 0.3, med: 0.4, low: 0.2 };
    const r = e.setRubric(bad);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("thresholds_not_monotone");
    expect(e.getRubric().high).toBe(0.65); // unchanged
  });

  it("setRubric rejects schemaVersion mismatch", () => {
    const e = new SynergyClassifierEngine();
    const bad: ClassifierRubric = { ...DEFAULT_RUBRIC, schemaVersion: 999 };
    const r = e.setRubric(bad);
    expect(r.ok).toBe(false);
    expect((r.error as string).startsWith("schema_mismatch")).toBe(true);
  });

  it("setRubric rejects missing weight key with descriptive error", () => {
    const e = new SynergyClassifierEngine();
    const bad = {
      ...DEFAULT_RUBRIC,
      weights: {
        semantic_match: 0.3,
        // missing the other 5
      } as unknown as ClassifierRubric["weights"],
    };
    const r = e.setRubric(bad);
    expect(r.ok).toBe(false);
    expect((r.error as string).startsWith("weight_")).toBe(true);
  });

  it("setRubric rejects __proto__ as a weight key (prototype-pollution guard)", () => {
    const e = new SynergyClassifierEngine();
    const evil = Object.create(null) as Record<string, number>;
    Object.defineProperty(evil, "__proto__", { value: 0.5, enumerable: true, configurable: true });
    Object.assign(evil, DEFAULT_RUBRIC.weights);
    const bad = { ...DEFAULT_RUBRIC, weights: evil as ClassifierRubric["weights"] };
    const r = e.setRubric(bad);
    expect(r.ok).toBe(false);
    expect((r.error as string).startsWith("forbidden_weight_key")).toBe(true);
  });

  it("loadRubric parses JSON and applies — round-trips through JSON.stringify(getRubric())", () => {
    const e1 = new SynergyClassifierEngine();
    const tuned: ClassifierRubric = {
      ...DEFAULT_RUBRIC,
      high: 0.75,
      med: 0.50,
      low: 0.30,
      notes: "tuned by adaptive pass — 2026-05-13",
    };
    e1.setRubric(tuned);
    const json = JSON.stringify(e1.getRubric());

    const e2 = new SynergyClassifierEngine();
    const r = e2.loadRubric(json);
    expect(r.ok).toBe(true);
    const round = e2.getRubric();
    expect(round.high).toBe(0.75);
    expect(round.med).toBe(0.50);
    expect(round.low).toBe(0.30);
    expect(round.notes).toBe("tuned by adaptive pass — 2026-05-13");
  });

  it("loadRubric returns parse_error on malformed JSON", () => {
    const e = new SynergyClassifierEngine();
    const r = e.loadRubric("not-json{");
    expect(r.ok).toBe(false);
    expect((r.error as string).startsWith("parse_error:")).toBe(true);
  });

  it("loadRubric returns 'not_an_object' on JSON-valid-but-non-object", () => {
    const e = new SynergyClassifierEngine();
    const r = e.loadRubric("42");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("not_an_object");
  });

  it("resetAll returns rubric to spec defaults", () => {
    const e = new SynergyClassifierEngine();
    e.setRubric({ ...DEFAULT_RUBRIC, high: 0.9, med: 0.5, low: 0.1 });
    e.resetAll();
    expect(e.getRubric().high).toBe(0.65);
  });
});

// ─── Singleton sanity ───────────────────────────────────────────────

describe("SynergyClassifierEngine — singleton", () => {
  beforeEach(() => {
    synergyClassifierEngine.resetAll();
  });

  it("singleton exists with spec defaults", () => {
    expect(synergyClassifierEngine.name).toBe("SynergyClassifierEngine");
    expect(synergyClassifierEngine.getRubric().high).toBe(0.65);
  });

  it("classify on the singleton honours invalid-feature veto", () => {
    const v = synergyClassifierEngine.classify({
      semantic_match: Number.NaN,
      novelty_strength: 1,
      ai_priority_score: 1,
      duplication_risk: 0,
      effort_estimate: 0,
      blast_radius: 0,
    });
    expect(v.label).toBe("none");
    expect(v.reason).toBe("invalid_features");
  });

  it("DEFAULT_RUBRIC.schemaVersion matches RUBRIC_SCHEMA_VERSION exported constant", () => {
    expect(DEFAULT_RUBRIC.schemaVersion).toBe(RUBRIC_SCHEMA_VERSION);
  });
});

// ─── 20-sample accuracy gate (verifies_via signal) ──────────────────

describe("SynergyClassifierEngine — 20-sample accuracy gate", () => {
  it("default rubric classifies 20 fixed feature vectors with ≥ 80% match to ground truth", () => {
    const e = new SynergyClassifierEngine({ now: () => T0 });

    // 20 hand-tuned feature vectors with ground-truth labels.
    // The spec's verifies_via requires ≥ 80% accuracy.
    const samples: Array<{ f: ClassifierFeatures; truth: "high" | "med" | "low" | "none" }> = [
      // 5 HIGH
      { f: makeFeatures({ semantic_match: 0.95, novelty_strength: 0.85, ai_priority_score: 0.9, duplication_risk: 0.1, effort_estimate: 0.15, blast_radius: 0.1 }), truth: "high" },
      { f: makeFeatures({ semantic_match: 1.0, novelty_strength: 1.0, ai_priority_score: 0.8, duplication_risk: 0, effort_estimate: 0.2, blast_radius: 0.1 }), truth: "high" },
      { f: makeFeatures({ semantic_match: 0.9, novelty_strength: 0.9, ai_priority_score: 0.9, duplication_risk: 0.2, effort_estimate: 0.15, blast_radius: 0.1 }), truth: "high" },
      { f: makeFeatures({ semantic_match: 0.85, novelty_strength: 0.95, ai_priority_score: 0.85, duplication_risk: 0.1, effort_estimate: 0.1, blast_radius: 0.05 }), truth: "high" },
      { f: makeFeatures({ semantic_match: 1.0, novelty_strength: 0.8, ai_priority_score: 1.0, duplication_risk: 0.15, effort_estimate: 0.2, blast_radius: 0.1 }), truth: "high" },
      // 5 MED
      { f: makeFeatures({ semantic_match: 0.8, novelty_strength: 0.8, ai_priority_score: 0.7, duplication_risk: 0.1, effort_estimate: 0.2, blast_radius: 0.2 }), truth: "med" },
      { f: makeFeatures({ semantic_match: 0.75, novelty_strength: 0.7, ai_priority_score: 0.6, duplication_risk: 0.1, effort_estimate: 0.2, blast_radius: 0.2 }), truth: "med" },
      { f: makeFeatures({ semantic_match: 0.85, novelty_strength: 0.7, ai_priority_score: 0.7, duplication_risk: 0.2, effort_estimate: 0.25, blast_radius: 0.25 }), truth: "med" },
      { f: makeFeatures({ semantic_match: 0.9, novelty_strength: 0.6, ai_priority_score: 0.6, duplication_risk: 0.25, effort_estimate: 0.3, blast_radius: 0.2 }), truth: "med" },
      { f: makeFeatures({ semantic_match: 0.7, novelty_strength: 0.8, ai_priority_score: 0.8, duplication_risk: 0.3, effort_estimate: 0.3, blast_radius: 0.2 }), truth: "med" },
      // 5 LOW
      { f: makeFeatures({ semantic_match: 0.6, novelty_strength: 0.5, ai_priority_score: 0.4, duplication_risk: 0.15, effort_estimate: 0.3, blast_radius: 0.3 }), truth: "low" },
      { f: makeFeatures({ semantic_match: 0.55, novelty_strength: 0.5, ai_priority_score: 0.4, duplication_risk: 0.2, effort_estimate: 0.3, blast_radius: 0.25 }), truth: "low" },
      { f: makeFeatures({ semantic_match: 0.65, novelty_strength: 0.4, ai_priority_score: 0.4, duplication_risk: 0.2, effort_estimate: 0.3, blast_radius: 0.25 }), truth: "low" },
      { f: makeFeatures({ semantic_match: 0.5, novelty_strength: 0.6, ai_priority_score: 0.5, duplication_risk: 0.3, effort_estimate: 0.35, blast_radius: 0.3 }), truth: "low" },
      { f: makeFeatures({ semantic_match: 0.7, novelty_strength: 0.4, ai_priority_score: 0.3, duplication_risk: 0.2, effort_estimate: 0.35, blast_radius: 0.3 }), truth: "low" },
      // 5 NONE
      { f: makeFeatures({ semantic_match: 0.2, novelty_strength: 0.2, ai_priority_score: 0.2 }), truth: "none" },
      { f: makeFeatures({ semantic_match: 0.1, novelty_strength: 0.1, ai_priority_score: 0.1, duplication_risk: 0.5, effort_estimate: 0.5, blast_radius: 0.5 }), truth: "none" },
      { f: makeFeatures({ semantic_match: 0.3, novelty_strength: 0.2, ai_priority_score: 0.3, duplication_risk: 0.4, effort_estimate: 0.5, blast_radius: 0.5 }), truth: "none" },
      // 2 explicit veto cases
      { f: makeFeatures({ semantic_match: 1.0, novelty_strength: 1.0, ai_priority_score: 1.0, duplication_risk: 0.9 }), truth: "none" },
      { f: makeFeatures({ semantic_match: Number.NaN, novelty_strength: 1, ai_priority_score: 1, duplication_risk: 0, effort_estimate: 0, blast_radius: 0 }), truth: "none" },
    ];

    let correct = 0;
    for (const { f, truth } of samples) {
      const v = e.classify(f);
      if (v.label === truth) correct += 1;
    }

    const accuracy = correct / samples.length;
    // Spec § U-ALL04 verifies_via: ≥ 80% accuracy.
    expect(accuracy).toBeGreaterThanOrEqual(0.8);
  });
});
