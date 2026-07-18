/**
 * CADAccuracyScorerEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-ACCURACY-SCORER
 */
import { describe, it, expect } from "vitest";
import { CADAccuracyScorerEngine } from "../engines/CADAccuracyScorerEngine.js";
import type { FileScoreInput, FileScore } from "../engines/CADAccuracyScorerEngine.js";

const engine = new CADAccuracyScorerEngine();

describe("CADAccuracyScorerEngine", () => {

  it("exact-match prediction → TP=N, FP=0, FN=0, exactMatch=true, F1=1", () => {
    const s = engine.score_file({
      fileId: "f1",
      predicted: ["face", "pocket_2d", "thru_hole"],
      groundTruth: ["face", "pocket_2d", "thru_hole"],
    });
    expect(s.truePositives).toBe(3);
    expect(s.falsePositives).toBe(0);
    expect(s.falseNegatives).toBe(0);
    expect(s.f1).toBeCloseTo(1.0, 5);
    expect(s.exactMatch).toBe(true);
  });

  it("missed feature → FN=1, recall<1", () => {
    const s = engine.score_file({
      fileId: "f2",
      predicted: ["face"],
      groundTruth: ["face", "thru_hole"],
    });
    expect(s.falseNegatives).toBe(1);
    expect(s.precision).toBeCloseTo(1.0, 5);
    expect(s.recall).toBeCloseTo(0.5, 5);
    expect(s.exactMatch).toBe(false);
  });

  it("false-alarm feature → FP=1, precision<1", () => {
    const s = engine.score_file({
      fileId: "f3",
      predicted: ["face", "thru_hole"],
      groundTruth: ["face"],
    });
    expect(s.falsePositives).toBe(1);
    expect(s.precision).toBeCloseTo(0.5, 5);
    expect(s.recall).toBeCloseTo(1.0, 5);
  });

  it("multiset semantics — duplicate features count separately", () => {
    const s = engine.score_file({
      fileId: "f_dup",
      predicted: ["thru_hole", "thru_hole", "face"],
      groundTruth: ["thru_hole", "thru_hole", "thru_hole", "face"],
    });
    // 2 of 3 thru_holes matched + 1 face = TP=3, FN=1 (third hole), FP=0
    expect(s.truePositives).toBe(3);
    expect(s.falsePositives).toBe(0);
    expect(s.falseNegatives).toBe(1);
  });

  it("empty prediction + empty truth → all-zero TP/FP/FN, exactMatch=true", () => {
    const s = engine.score_file({ fileId: "fe", predicted: [], groundTruth: [] });
    expect(s.truePositives).toBe(0);
    expect(s.falsePositives).toBe(0);
    expect(s.falseNegatives).toBe(0);
    expect(s.exactMatch).toBe(true);
  });

  it("empty corpus → zero rollup", () => {
    const r = engine.score_corpus([]);
    expect(r.totalFiles).toBe(0);
    expect(r.exactMatchPct).toBe(0);
    expect(r.macroF1).toBe(0);
  });

  it("all-exact corpus → exactMatchPct=1.0, macroF1=1.0", () => {
    const inputs: FileScoreInput[] = [
      { fileId: "a", predicted: ["face"], groundTruth: ["face"] },
      { fileId: "b", predicted: ["pocket_2d"], groundTruth: ["pocket_2d"] },
    ];
    const scores = inputs.map((i) => ({ score: engine.score_file(i) }));
    const r = engine.score_corpus(scores);
    expect(r.exactMatchPct).toBeCloseTo(1.0, 5);
    expect(r.macroF1).toBeCloseTo(1.0, 5);
    expect(r.microF1).toBeCloseTo(1.0, 5);
  });

  it("mixed corpus aggregates micro vs macro correctly", () => {
    const scores: Array<{ score: FileScore; source?: string }> = [
      { score: engine.score_file({ fileId: "a", predicted: ["face", "thru_hole"], groundTruth: ["face", "thru_hole"] }) }, // F1=1
      { score: engine.score_file({ fileId: "b", predicted: ["face"], groundTruth: ["face", "pocket_2d"] }) }, // P=1, R=0.5, F1=0.667
    ];
    const r = engine.score_corpus(scores);
    expect(r.totalFiles).toBe(2);
    expect(r.exactMatchCount).toBe(1);
    expect(r.exactMatchPct).toBeCloseTo(0.5, 3);
    // Macro F1 = (1.0 + 0.667) / 2 = 0.833
    expect(r.macroF1).toBeCloseTo(0.833, 2);
    // Micro: TP=3, FN=1, FP=0 → P=1, R=0.75, F1=0.857
    expect(r.microPrecision).toBeCloseTo(1.0, 3);
    expect(r.microRecall).toBeCloseTo(0.75, 3);
    expect(r.microF1).toBeCloseTo(0.857, 2);
  });

  it("perSource buckets aggregate by source label", () => {
    const scores: Array<{ score: FileScore; source?: string }> = [
      { score: engine.score_file({ fileId: "a", predicted: ["face"], groundTruth: ["face"] }), source: "JM_DIE" },
      { score: engine.score_file({ fileId: "b", predicted: ["face"], groundTruth: ["pocket_2d"] }), source: "JM_DIE" },
      { score: engine.score_file({ fileId: "c", predicted: ["face"], groundTruth: ["face"] }), source: "ABC_DATASET" },
    ];
    const r = engine.score_corpus(scores);
    expect(r.perSource.JM_DIE.files).toBe(2);
    expect(r.perSource.JM_DIE.exactMatchPct).toBeCloseTo(0.5, 3);
    expect(r.perSource.ABC_DATASET.files).toBe(1);
    expect(r.perSource.ABC_DATASET.exactMatchPct).toBeCloseTo(1.0, 3);
  });

  it("failingSample caps at 100 entries", () => {
    const scores: Array<{ score: FileScore; source?: string }> = [];
    for (let i = 0; i < 150; i++) {
      scores.push({
        score: engine.score_file({
          fileId: `f${i}`,
          predicted: ["face"],
          groundTruth: ["pocket_2d"], // every file fails
        }),
      });
    }
    const r = engine.score_corpus(scores);
    expect(r.totalFiles).toBe(150);
    expect(r.exactMatchCount).toBe(0);
    expect(r.failingSample.length).toBe(100);
  });

  it("gate fails when corpus < minFiles", () => {
    const r = engine.score_corpus([]);
    const g = engine.gate(r, 100000);
    expect(g.passed).toBe(false);
    expect(g.rationale).toMatch(/too small|min/i);
  });

  it("gate fails when exactMatchPct < 1.0", () => {
    const scores: Array<{ score: FileScore }> = [
      { score: engine.score_file({ fileId: "a", predicted: ["face"], groundTruth: ["face"] }) },
      { score: engine.score_file({ fileId: "b", predicted: ["face"], groundTruth: ["pocket_2d"] }) },
    ];
    const r = engine.score_corpus(scores);
    const g = engine.gate(r, 1);
    expect(g.passed).toBe(false);
    expect(g.rationale).toMatch(/failing/i);
  });

  it("gate PASSES when 100% exactMatch + ≥ minFiles", () => {
    const scores: Array<{ score: FileScore }> = [
      { score: engine.score_file({ fileId: "a", predicted: ["face"], groundTruth: ["face"] }) },
      { score: engine.score_file({ fileId: "b", predicted: ["pocket_2d"], groundTruth: ["pocket_2d"] }) },
    ];
    const r = engine.score_corpus(scores);
    const g = engine.gate(r, 2);
    expect(g.passed).toBe(true);
    expect(g.rationale).toMatch(/cleared|100/i);
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes score_file + score_corpus + gate", () => {
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("score_file");
    expect(names).toContain("score_corpus");
    expect(names).toContain("gate");
  });
});
