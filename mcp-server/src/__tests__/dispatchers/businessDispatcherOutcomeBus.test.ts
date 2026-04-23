/**
 * Tests for businessDispatcher OutcomeCaptureBus actions
 * (PSAU P2.5-LEARN U-LEARN-01 — universal learning-spine wiring).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { businessDispatch } from "../../tools/dispatchers/businessDispatcher.js";

// The dispatcher uses the singleton bus, which writes to cwd-relative state/outcomes.
// We snapshot + cleanup around this suite so the real state dir stays clean.
const OUT_DIR = path.resolve(process.cwd(), "state/outcomes");
const BACKUP_SUFFIX = ".psau-test-backup";
const TEST_DOMAINS = ["mill", "lathe", "wedm", "quote", "other"];

function backupShard(domain: string): void {
  const f = path.join(OUT_DIR, `${domain}.jsonl`);
  if (fs.existsSync(f)) fs.renameSync(f, f + BACKUP_SUFFIX);
}
function restoreShard(domain: string): void {
  const f = path.join(OUT_DIR, `${domain}.jsonl`);
  const bk = f + BACKUP_SUFFIX;
  if (fs.existsSync(f)) fs.rmSync(f);
  if (fs.existsSync(bk)) fs.renameSync(bk, f);
}

describe("businessDispatcher — OutcomeCaptureBus wiring (U-LEARN-01)", () => {
  beforeAll(() => {
    for (const d of TEST_DOMAINS) backupShard(d);
  });

  afterAll(() => {
    for (const d of TEST_DOMAINS) restoreShard(d);
  });

  it("outcome_record: records a minimal valid event", async () => {
    const result = await businessDispatch({
      action: "outcome_record",
      domain: "mill",
      kind: "operator_override",
      source: "operator",
      context: { material: "D2", customer: "ITW" },
      recommended: { sfm: 120 },
      actual: { sfm: 95 },
    });
    expect(result.success).toBe(true);
    const d = result.data as any;
    expect(d.ok).toBe(true);
    expect(d.event_id).toBeTruthy();
  });

  it("outcome_record: rejects invalid domain", async () => {
    const result = await businessDispatch({
      action: "outcome_record",
      domain: "nuclear_fusion",
      kind: "operator_override",
      source: "operator",
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid input");
  });

  it("outcome_record: threads lineage_id", async () => {
    const lid = `TEST-LINEAGE-${Date.now()}`;
    const r = await businessDispatch({
      action: "outcome_record",
      domain: "quote",
      kind: "quote_accepted",
      source: "system",
      lineage_id: lid,
    });
    expect(r.success).toBe(true);
    const d = r.data as any;
    expect(d.lineage_id).toBe(lid);
  });

  it("outcome_query: returns recorded events", async () => {
    const note = `test-query-${Date.now()}`;
    await businessDispatch({
      action: "outcome_record",
      domain: "lathe",
      kind: "cycle_time_measurement",
      source: "controller",
      note,
    });
    const q = await businessDispatch({
      action: "outcome_query",
      domain: "lathe",
      limit: 50,
    });
    expect(q.success).toBe(true);
    const d = q.data as any;
    expect(Array.isArray(d.events)).toBe(true);
    expect(d.events.some((e: any) => e.note === note)).toBe(true);
  });

  it("outcome_query: filters by lineage_id", async () => {
    const lid = `FILTER-${Date.now()}`;
    await businessDispatch({
      action: "outcome_record",
      domain: "wedm",
      kind: "recommendation_emitted",
      source: "system",
      lineage_id: lid,
    });
    await businessDispatch({
      action: "outcome_record",
      domain: "wedm",
      kind: "cycle_time_measurement",
      source: "controller",
      lineage_id: lid,
    });
    await businessDispatch({
      action: "outcome_record",
      domain: "wedm",
      kind: "other",
      source: "system",   // different lineage
    });
    const q = await businessDispatch({
      action: "outcome_query",
      lineage_id: lid,
      limit: 50,
    });
    const d = q.data as any;
    expect(d.events.length).toBe(2);
    for (const ev of d.events) expect(ev.lineage_id).toBe(lid);
  });

  it("outcome_stats: reports per-shard counts", async () => {
    const r = await businessDispatch({ action: "outcome_stats" });
    expect(r.success).toBe(true);
    const d = r.data as any;
    expect(typeof d.domains).toBe("object");
    expect(typeof d.retry_queue_size).toBe("number");
  });

  it("outcome_flush_retry: returns flush result", async () => {
    const r = await businessDispatch({ action: "outcome_flush_retry" });
    expect(r.success).toBe(true);
    const d = r.data as any;
    expect(typeof d.flushed).toBe("number");
    expect(typeof d.remaining).toBe("number");
  });

  it("rejects query with invalid severity in record", async () => {
    const result = await businessDispatch({
      action: "outcome_record",
      domain: "mill",
      kind: "operator_override",
      source: "operator",
      severity: "catastrophic",   // not in enum
    });
    expect(result.success).toBe(false);
  });

  it("records confidence in [0,1]", async () => {
    const result = await businessDispatch({
      action: "outcome_record",
      domain: "speed_feed",
      kind: "recommendation_emitted",
      source: "system",
      confidence: 0.75,
    });
    expect(result.success).toBe(true);
  });

  it("rejects confidence > 1", async () => {
    const result = await businessDispatch({
      action: "outcome_record",
      domain: "speed_feed",
      kind: "recommendation_emitted",
      source: "system",
      confidence: 1.3,
    });
    expect(result.success).toBe(false);
  });
});
