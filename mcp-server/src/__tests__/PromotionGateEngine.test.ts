/**
 * Tests for PromotionGateEngine (U-LEARN-06).
 *
 * Covers:
 *   - record(): schema validation, atomic append, per-pair ledger
 *   - evaluate(): Welch's t, Cohen's d, verdict synthesis
 *   - temporal-holdout enforcement
 *   - INSUFFICIENT_DATA / NO_GO / GO transitions
 *   - reasons[] populated in every case
 *   - never-throw on bad input / circular metadata
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PromotionGateEngine } from "../engines/PromotionGateEngine.js";

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-promo-"));
}

function seedObservations(
  gate: PromotionGateEngine,
  champion_id: string,
  challenger_id: string,
  metric: string,
  championErrs: number[],
  challengerErrs: number[],
  baseIso: string = new Date().toISOString(),
): void {
  const baseMs = Date.parse(baseIso);
  const n = Math.max(championErrs.length, challengerErrs.length);
  for (let i = 0; i < n; i++) {
    const actual = 100;
    gate.record({
      champion_id,
      challenger_id,
      domain: "mill",
      metric,
      champion_value: actual + (championErrs[i] ?? 0),
      challenger_value: actual + (challengerErrs[i] ?? 0),
      actual_value: actual,
      event_ts: new Date(baseMs + i * 1000).toISOString(),
    });
  }
}

describe("PromotionGateEngine — U-LEARN-06", () => {
  let root: string;
  let gate: PromotionGateEngine;
  const cleanups: string[] = [];

  beforeEach(() => {
    root = tmpRoot();
    gate = new PromotionGateEngine(root);
    cleanups.push(root);
  });

  afterAll(() => {
    for (const r of cleanups) {
      try { fs.rmSync(r, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  // --- record -----------------------------------------------------------

  it("record: appends a valid shadow observation", () => {
    const res = gate.record({
      champion_id: "v1",
      challenger_id: "v2",
      domain: "mill",
      metric: "sfm_error",
      champion_value: 118,
      challenger_value: 101,
      actual_value: 100,
    });
    expect(res.ok).toBe(true);
    expect(res.obs_id).toBeTruthy();
  });

  it("record: rejects empty champion_id", () => {
    const res = gate.record({
      champion_id: "",
      challenger_id: "v2",
      domain: "mill",
      metric: "sfm_error",
      champion_value: 1,
      challenger_value: 1,
      actual_value: 1,
    });
    expect(res.ok).toBe(false);
    expect(res.warning).toContain("schema validation failed");
  });

  it("record: rejects empty metric", () => {
    const res = gate.record({
      champion_id: "v1",
      challenger_id: "v2",
      domain: "mill",
      metric: "",
      champion_value: 1,
      challenger_value: 1,
      actual_value: 1,
    });
    expect(res.ok).toBe(false);
  });

  // --- evaluate: INSUFFICIENT_DATA -------------------------------------

  it("evaluate: INSUFFICIENT_DATA when n < min_samples", () => {
    seedObservations(gate, "v1", "v2", "sfm_error",
      [10, 8, 9],
      [2, 3, 1]);
    const r = gate.evaluate({
      champion_id: "v1",
      challenger_id: "v2",
      metric: "sfm_error",
      min_samples: 20,
    });
    expect(r.verdict).toBe("INSUFFICIENT_DATA");
    expect(r.reasons.some((x) => x.includes("insufficient data"))).toBe(true);
  });

  // --- evaluate: GO -----------------------------------------------------

  it("evaluate: GO when challenger clearly beats champion (large effect)", () => {
    // champion absolute errors ~ mean 20; challenger ~ mean 2.
    // With n=40 each, variance small → huge t-stat → p ~ 0.
    const championErrs = Array.from({ length: 40 }, (_, i) => 18 + (i % 5));
    const challengerErrs = Array.from({ length: 40 }, (_, i) => 1 + (i % 3));
    seedObservations(gate, "v1", "v2", "sfm_error", championErrs, challengerErrs);
    const r = gate.evaluate({
      champion_id: "v1",
      challenger_id: "v2",
      metric: "sfm_error",
      min_samples: 20,
      alpha: 0.05,
      lower_is_better: true,
      training_max_ts: new Date(Date.now() - 3600_000).toISOString(),
      test_min_ts: new Date(Date.now() - 60_000).toISOString(),
    });
    expect(r.verdict).toBe("GO");
    expect(r.mean_error_challenger).toBeLessThan(r.mean_error_champion);
    expect(r.p_value).not.toBeNull();
    expect(r.p_value!).toBeLessThan(0.05);
    expect(Math.abs(r.cohens_d ?? 0)).toBeGreaterThan(0.2);
    expect(r.effect_size_interpretation).toBe("large");
    expect(r.temporal_holdout_ok).toBe(true);
  });

  // --- evaluate: NO_GO variants ----------------------------------------

  it("evaluate: NO_GO when challenger WORSE than champion (wrong direction)", () => {
    const championErrs = Array.from({ length: 30 }, (_, i) => 1 + (i % 3));
    const challengerErrs = Array.from({ length: 30 }, (_, i) => 18 + (i % 5));
    seedObservations(gate, "v1", "v2", "sfm_error", championErrs, challengerErrs);
    const r = gate.evaluate({
      champion_id: "v1",
      challenger_id: "v2",
      metric: "sfm_error",
      min_samples: 20,
      lower_is_better: true,
    });
    expect(r.verdict).toBe("NO_GO");
    expect(r.reasons.some((x) => x.includes("direction fails"))).toBe(true);
  });

  it("evaluate: NO_GO when effect size below threshold", () => {
    // Champion mean ~ 10, challenger mean ~ 9.98 — tiny effect, won't clear d >= 0.2
    const championErrs = Array.from({ length: 50 }, (_, i) => 10 + Math.sin(i));
    const challengerErrs = Array.from({ length: 50 }, (_, i) => 9.98 + Math.sin(i + 0.5));
    seedObservations(gate, "v1", "v2", "sfm_error", championErrs, challengerErrs);
    const r = gate.evaluate({
      champion_id: "v1",
      challenger_id: "v2",
      metric: "sfm_error",
      min_samples: 20,
      lower_is_better: true,
    });
    expect(r.verdict).toBe("NO_GO");
    expect(r.reasons.some((x) => x.includes("cohens_d"))).toBe(true);
  });

  it("evaluate: NO_GO when temporal holdout violated", () => {
    const championErrs = Array.from({ length: 30 }, (_, i) => 18 + (i % 5));
    const challengerErrs = Array.from({ length: 30 }, (_, i) => 1 + (i % 3));
    seedObservations(gate, "v1", "v2", "sfm_error", championErrs, challengerErrs);
    const r = gate.evaluate({
      champion_id: "v1",
      challenger_id: "v2",
      metric: "sfm_error",
      min_samples: 20,
      training_max_ts: new Date(Date.now() + 60_000).toISOString(),      // future
      test_min_ts: new Date(Date.now() - 60_000).toISOString(),           // past
    });
    expect(r.verdict).toBe("NO_GO");
    expect(r.temporal_holdout_ok).toBe(false);
    expect(r.reasons.some((x) => x.includes("temporal holdout"))).toBe(true);
  });

  // --- direction variant -----------------------------------------------

  it("evaluate: lower_is_better=false (maximize) flips the decision sign", () => {
    // Challenger mean HIGHER than champion → win when lower_is_better=false
    const championErrs = Array.from({ length: 30 }, (_, i) => 1 + (i % 3));
    const challengerErrs = Array.from({ length: 30 }, (_, i) => 15 + (i % 4));
    seedObservations(gate, "v1", "v2", "tool_life_score", championErrs, challengerErrs);
    const r = gate.evaluate({
      champion_id: "v1",
      challenger_id: "v2",
      metric: "tool_life_score",
      min_samples: 20,
      lower_is_better: false,
      training_max_ts: new Date(Date.now() - 3600_000).toISOString(),
      test_min_ts: new Date(Date.now() - 60_000).toISOString(),
    });
    expect(r.verdict).toBe("GO");
  });

  // --- temporal holdout isolated ---------------------------------------

  it("assertNoTemporalLeakage: ok when training before test", () => {
    const r = gate.assertNoTemporalLeakage(
      new Date(Date.now() - 3600_000).toISOString(),
      new Date().toISOString(),
    );
    expect(r.ok).toBe(true);
  });

  it("assertNoTemporalLeakage: rejects overlap", () => {
    const now = Date.now();
    const r = gate.assertNoTemporalLeakage(
      new Date(now).toISOString(),
      new Date(now - 1000).toISOString(),
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("temporal holdout violated");
  });

  it("assertNoTemporalLeakage: rejects invalid timestamps", () => {
    const r = gate.assertNoTemporalLeakage("not a date", new Date().toISOString());
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("invalid");
  });

  // --- stats + durability ----------------------------------------------

  it("stats: totals and breakdowns", () => {
    seedObservations(gate, "v1", "v2", "sfm_error", [1, 2, 3], [4, 5, 6]);
    seedObservations(gate, "v1", "v3", "ipt_error", [0.1], [0.2]);
    const s = gate.stats();
    expect(s.total_observations).toBe(4);
    expect(s.by_metric.sfm_error).toBe(3);
    expect(s.by_metric.ipt_error).toBe(1);
    expect(s.by_pair["v1 vs v2"]).toBe(3);
  });

  it("crash-tolerant read: skips torn tail lines", () => {
    gate.record({
      champion_id: "v1", challenger_id: "v2",
      domain: "mill", metric: "sfm_error",
      champion_value: 110, challenger_value: 101, actual_value: 100,
    });
    fs.appendFileSync(path.join(root, "shadow_observations.jsonl"), "{partial-no-close");
    const s = gate.stats();
    expect(s.total_observations).toBe(1);
  });

  it("low-sample-df warning fires when n<30", () => {
    const championErrs = Array.from({ length: 25 }, (_, i) => 15 + (i % 4));
    const challengerErrs = Array.from({ length: 25 }, (_, i) => 1 + (i % 3));
    seedObservations(gate, "v1", "v2", "sfm_error", championErrs, challengerErrs);
    const r = gate.evaluate({
      champion_id: "v1",
      challenger_id: "v2",
      metric: "sfm_error",
      min_samples: 20,
    });
    expect(r.reasons.some((x) => x.includes("low-sample-df"))).toBe(true);
  });

  it("never throws on circular metadata (none in schema, but input should reject)", () => {
    const circ: any = {};
    circ.self = circ;
    expect(() =>
      gate.record({
        champion_id: "v1",
        challenger_id: "v2",
        domain: "mill",
        metric: "sfm_error",
        champion_value: 110,
        challenger_value: 101,
        actual_value: 100,
        lineage_id: circ as any,          // bad
      }),
    ).not.toThrow();
  });

  it("self-awareness metadata", () => {
    const meta = PromotionGateEngine.getSelfAwareness();
    expect(meta.name).toBe("PromotionGateEngine");
    expect(meta.capabilities).toContain("evaluate");
    expect(meta.milestone).toContain("U-LEARN-06");
  });
});
