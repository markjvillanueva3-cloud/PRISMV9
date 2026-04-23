/**
 * Tests for businessDispatcher PromotionGate actions (PSAU P2.5-LEARN U-LEARN-06).
 *
 * Wiring tests: round-trip schema validation → engine call → dispatcher envelope.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { businessDispatch } from "../../tools/dispatchers/businessDispatcher.js";

const GATE_FILE = path.resolve(process.cwd(), "state/promotion_gate/shadow_observations.jsonl");
const GATE_BACKUP = GATE_FILE + ".psau-test-backup";

function backup(): void { if (fs.existsSync(GATE_FILE)) fs.renameSync(GATE_FILE, GATE_BACKUP); }
function restore(): void {
  if (fs.existsSync(GATE_FILE)) fs.rmSync(GATE_FILE);
  if (fs.existsSync(GATE_BACKUP)) fs.renameSync(GATE_BACKUP, GATE_FILE);
}

async function seed(
  champion_id: string,
  challenger_id: string,
  metric: string,
  championErrs: number[],
  challengerErrs: number[],
): Promise<void> {
  const n = Math.max(championErrs.length, challengerErrs.length);
  const baseMs = Date.now() - n * 2000;
  for (let i = 0; i < n; i++) {
    const actual = 100;
    await businessDispatch({
      action: "promotion_gate_record",
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

describe("businessDispatcher — PromotionGate (U-LEARN-06)", () => {
  beforeAll(backup);
  afterAll(restore);

  it("promotion_gate_record: writes a valid shadow observation", async () => {
    const r = await businessDispatch({
      action: "promotion_gate_record",
      champion_id: "bd-champ",
      challenger_id: "bd-chal",
      domain: "mill",
      metric: "sfm_error",
      champion_value: 118,
      challenger_value: 101,
      actual_value: 100,
    });
    expect(r.success).toBe(true);
    const d = r.data as any;
    expect(d.ok).toBe(true);
    expect(d.obs_id).toBeTruthy();
  });

  it("promotion_gate_record: rejects empty champion_id", async () => {
    const r = await businessDispatch({
      action: "promotion_gate_record",
      champion_id: "",
      challenger_id: "x",
      domain: "mill",
      metric: "sfm_error",
      champion_value: 1,
      challenger_value: 1,
      actual_value: 1,
    });
    expect(r.success).toBe(false);
    expect(r.error).toContain("Invalid input");
  });

  it("promotion_gate_record: rejects empty metric", async () => {
    const r = await businessDispatch({
      action: "promotion_gate_record",
      champion_id: "a",
      challenger_id: "b",
      domain: "mill",
      metric: "",
      champion_value: 1,
      challenger_value: 1,
      actual_value: 1,
    });
    expect(r.success).toBe(false);
  });

  it("promotion_gate_evaluate: INSUFFICIENT_DATA when n below threshold", async () => {
    await seed("bd-c1", "bd-x1", "insuff_metric", [10, 8, 9], [2, 3, 1]);
    const r = await businessDispatch({
      action: "promotion_gate_evaluate",
      champion_id: "bd-c1",
      challenger_id: "bd-x1",
      metric: "insuff_metric",
      min_samples: 20,
    });
    expect(r.success).toBe(true);
    const d = r.data as any;
    expect(d.verdict).toBe("INSUFFICIENT_DATA");
    expect(Array.isArray(d.reasons)).toBe(true);
  });

  it("promotion_gate_evaluate: GO on clear challenger win + temporal holdout ok", async () => {
    const championErrs = Array.from({ length: 40 }, (_, i) => 18 + (i % 5));
    const challengerErrs = Array.from({ length: 40 }, (_, i) => 1 + (i % 3));
    await seed("bd-c2", "bd-x2", "go_metric", championErrs, challengerErrs);
    const r = await businessDispatch({
      action: "promotion_gate_evaluate",
      champion_id: "bd-c2",
      challenger_id: "bd-x2",
      metric: "go_metric",
      min_samples: 20,
      alpha: 0.05,
      lower_is_better: true,
      training_max_ts: new Date(Date.now() - 3600_000).toISOString(),
      test_min_ts: new Date(Date.now() - 60_000).toISOString(),
    });
    expect(r.success).toBe(true);
    const d = r.data as any;
    expect(d.verdict).toBe("GO");
    expect(d.temporal_holdout_ok).toBe(true);
    expect(d.p_value).not.toBeNull();
    expect(d.p_value).toBeLessThan(0.05);
  });

  it("promotion_gate_evaluate: NO_GO when wrong direction", async () => {
    const championErrs = Array.from({ length: 30 }, (_, i) => 1 + (i % 3));
    const challengerErrs = Array.from({ length: 30 }, (_, i) => 18 + (i % 5));
    await seed("bd-c3", "bd-x3", "nogo_dir", championErrs, challengerErrs);
    const r = await businessDispatch({
      action: "promotion_gate_evaluate",
      champion_id: "bd-c3",
      challenger_id: "bd-x3",
      metric: "nogo_dir",
      min_samples: 20,
      lower_is_better: true,
    });
    expect(r.success).toBe(true);
    const d = r.data as any;
    expect(d.verdict).toBe("NO_GO");
  });

  it("promotion_gate_evaluate: lower_is_better=false flips sign", async () => {
    // Challenger higher = win when maximizing
    const championErrs = Array.from({ length: 30 }, (_, i) => 1 + (i % 3));
    const challengerErrs = Array.from({ length: 30 }, (_, i) => 15 + (i % 4));
    await seed("bd-c4", "bd-x4", "score_metric", championErrs, challengerErrs);
    const r = await businessDispatch({
      action: "promotion_gate_evaluate",
      champion_id: "bd-c4",
      challenger_id: "bd-x4",
      metric: "score_metric",
      min_samples: 20,
      lower_is_better: false,
      training_max_ts: new Date(Date.now() - 3600_000).toISOString(),
      test_min_ts: new Date(Date.now() - 60_000).toISOString(),
    });
    expect(r.success).toBe(true);
    expect((r.data as any).verdict).toBe("GO");
  });

  it("promotion_gate_assert_temporal: ok when training before test", async () => {
    const r = await businessDispatch({
      action: "promotion_gate_assert_temporal",
      training_max_ts: new Date(Date.now() - 3600_000).toISOString(),
      test_min_ts: new Date().toISOString(),
    });
    expect(r.success).toBe(true);
    expect((r.data as any).ok).toBe(true);
  });

  it("promotion_gate_assert_temporal: rejects overlap", async () => {
    const now = Date.now();
    const r = await businessDispatch({
      action: "promotion_gate_assert_temporal",
      training_max_ts: new Date(now).toISOString(),
      test_min_ts: new Date(now - 1000).toISOString(),
    });
    expect(r.success).toBe(false);
    expect(r.error).toContain("temporal holdout violated");
  });

  it("promotion_gate_assert_temporal: rejects invalid ISO", async () => {
    const r = await businessDispatch({
      action: "promotion_gate_assert_temporal",
      training_max_ts: "not-a-date",
      test_min_ts: new Date().toISOString(),
    });
    expect(r.success).toBe(false);
    expect(r.error).toContain("invalid");
  });

  it("promotion_gate_stats: returns totals + breakdowns", async () => {
    const r = await businessDispatch({ action: "promotion_gate_stats" });
    expect(r.success).toBe(true);
    const d = r.data as any;
    expect(typeof d.total_observations).toBe("number");
    expect(d.total_observations).toBeGreaterThan(0);
    expect(typeof d.by_pair).toBe("object");
    expect(typeof d.by_metric).toBe("object");
  });

  it("anti-regression: unknown promotion_gate_* action rejected", async () => {
    const r = await businessDispatch({ action: "promotion_gate_fake" as any });
    expect(r.success).toBe(false);
    expect(r.error).toContain("Unknown action");
  });
});
