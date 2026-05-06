/**
 * CrossProcessNoveltyDetectorEngine — T11-02 tests.
 * k-NN distance novelty scoring with median normalization.
 */

import { describe, it, expect } from "vitest";
import {
  CrossProcessNoveltyDetectorEngine as Detector,
  crossProcessNoveltyDetector,
  type Candidate,
  type HistoryRow,
} from "../engines/CrossProcessNoveltyDetectorEngine.js";

const TIGHT_HISTORY: HistoryRow[] = [
  { material_iso: "P", sf: 100, fz: 0.05, process: "mill" },
  { material_iso: "P", sf: 105, fz: 0.05, process: "mill" },
  { material_iso: "P", sf: 110, fz: 0.06, process: "mill" },
  { material_iso: "P", sf: 95, fz: 0.04, process: "mill" },
  { material_iso: "P", sf: 102, fz: 0.05, process: "mill" },
];

describe("score — novelty detection", () => {
  it("flags far-out candidate as novel (high normalized score)", () => {
    const r = Detector.score({
      candidates: [{ job_id: "outlier", material_iso: "S", sf: 500, fz: 0.5, process: "wedm" }],
      history: TIGHT_HISTORY,
      novelty_threshold: 1.5,
    });
    expect(r.scored[0].is_novel).toBe(true);
    expect(r.scored[0].normalized_score).toBeGreaterThan(1.5);
  });

  it("does NOT flag in-distribution candidate (low normalized score)", () => {
    const r = Detector.score({
      candidates: [{ job_id: "in_dist", material_iso: "P", sf: 103, fz: 0.05, process: "mill" }],
      history: TIGHT_HISTORY,
      novelty_threshold: 1.5,
    });
    expect(r.scored[0].is_novel).toBe(false);
  });

  it("filters novel array to is_novel=true entries only", () => {
    const r = Detector.score({
      candidates: [
        { job_id: "in_dist", material_iso: "P", sf: 103, fz: 0.05, process: "mill" },
        { job_id: "novel", material_iso: "S", sf: 500, fz: 0.5, process: "wedm" },
      ],
      history: TIGHT_HISTORY,
    });
    expect(r.novel.length).toBe(1);
    expect(r.novel[0].job_id).toBe("novel");
  });

  it("novel array is sorted descending by normalized_score", () => {
    const r = Detector.score({
      candidates: [
        { job_id: "moderate", material_iso: "K", sf: 200, fz: 0.1, process: "mill" },
        { job_id: "extreme", material_iso: "S", sf: 1000, fz: 1.0, process: "wedm" },
      ],
      history: TIGHT_HISTORY,
    });
    if (r.novel.length === 2) {
      expect(r.novel[0].normalized_score).toBeGreaterThanOrEqual(r.novel[1].normalized_score);
    }
  });

  it("median_self_distance is finite and positive", () => {
    const r = Detector.score({
      candidates: [{ job_id: "j1", material_iso: "P", sf: 100, fz: 0.05, process: "mill" }],
      history: TIGHT_HISTORY,
    });
    expect(Number.isFinite(r.median_self_distance)).toBe(true);
    expect(r.median_self_distance).toBeGreaterThan(0);
  });

  it("respects custom novelty_threshold", () => {
    const r = Detector.score({
      candidates: [{ job_id: "borderline", material_iso: "P", sf: 130, fz: 0.07, process: "mill" }],
      history: TIGHT_HISTORY,
      novelty_threshold: 5,  // very strict
    });
    expect(r.scored[0].is_novel).toBe(false);
  });

  it("rationale describes novelty status", () => {
    const r = Detector.score({
      candidates: [{ job_id: "novel", material_iso: "S", sf: 500, fz: 0.5, process: "wedm" }],
      history: TIGHT_HISTORY,
    });
    expect(r.scored[0].rationale).toMatch(/median/);
  });

  it("rejects empty candidates (Zod min(1))", () => {
    expect(() => Detector.score({
      candidates: [],
      history: TIGHT_HISTORY,
    })).toThrow();
  });

  it("rejects empty history (Zod min(1))", () => {
    expect(() => Detector.score({
      candidates: [{ job_id: "j1", material_iso: "P", sf: 100, fz: 0.05, process: "mill" }],
      history: [],
    })).toThrow();
  });

  it("rejects non-finite sf in candidate", () => {
    expect(() => Detector.score({
      candidates: [{ job_id: "j1", material_iso: "P", sf: Infinity, fz: 0.05, process: "mill" } as Candidate],
      history: TIGHT_HISTORY,
    })).toThrow();
  });

  it("returns expected number of scored entries (one per candidate)", () => {
    const r = Detector.score({
      candidates: [
        { job_id: "j1", material_iso: "P", sf: 100, fz: 0.05, process: "mill" },
        { job_id: "j2", material_iso: "S", sf: 500, fz: 0.5, process: "wedm" },
        { job_id: "j3", material_iso: "K", sf: 200, fz: 0.1, process: "lathe" },
      ],
      history: TIGHT_HISTORY,
    });
    expect(r.scored.length).toBe(3);
  });

  it("preserves threshold in result for audit", () => {
    const r = Detector.score({
      candidates: [{ job_id: "j1", material_iso: "P", sf: 100, fz: 0.05, process: "mill" }],
      history: TIGHT_HISTORY,
      novelty_threshold: 2.5,
    });
    expect(r.threshold).toBe(2.5);
  });
});

describe("Engine identity", () => {
  it("exposes engineId/version/tier matching T11-02", () => {
    expect(Detector.engineId).toBe("CrossProcessNoveltyDetectorEngine");
    expect(Detector.version).toBe("1.0.0");
    expect(Detector.tier).toBe("T11-02");
  });
});

describe("Dispatcher wrapper", () => {
  it("xproc_novelty_score returns ScoreResult with scored array", () => {
    const r = crossProcessNoveltyDetector("xproc_novelty_score", {
      candidates: [{ job_id: "j1", material_iso: "P", sf: 100, fz: 0.05, process: "mill" }],
      history: TIGHT_HISTORY,
    }) as { scored: unknown[] };
    expect(r.scored.length).toBe(1);
  });

  it("xproc_novelty_alert returns count + novel array", () => {
    const r = crossProcessNoveltyDetector("xproc_novelty_alert", {
      candidates: [{ job_id: "outlier", material_iso: "S", sf: 1000, fz: 1.0, process: "wedm" }],
      history: TIGHT_HISTORY,
    }) as { count: number; novel: unknown[] };
    expect(r.count).toBe(1);
    expect(r.novel.length).toBe(1);
  });

  it("rejects unknown action", () => {
    expect(() => crossProcessNoveltyDetector("unknown", {})).toThrow(/unknown action/i);
  });
});
