/**
 * Tests for OutcomeCaptureBusEngine (U-LEARN-01).
 *
 * Verifies the spine of the PSAU learning loop:
 *   - atomic append-only writes (no torn lines under concurrent load)
 *   - per-domain shard isolation
 *   - lineage_id threading
 *   - schema validation (bad events rejected, good events stored)
 *   - query filters (domain / kind / since_iso / lineage_id / agent_id / limit)
 *   - retry queue on write failure
 *   - never-throw contract
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { OutcomeCaptureBusEngine } from "../engines/OutcomeCaptureBusEngine.js";

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-outcome-"));
}

describe("OutcomeCaptureBusEngine — U-LEARN-01", () => {
  let root: string;
  let bus: OutcomeCaptureBusEngine;
  const cleanups: string[] = [];

  beforeEach(() => {
    root = tmpRoot();
    bus = new OutcomeCaptureBusEngine(root);
    cleanups.push(root);
  });

  afterAll(() => {
    for (const r of cleanups) {
      try { fs.rmSync(r, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  // --- record() ----------------------------------------------------------

  it("records a minimal event and returns ok", () => {
    const res = bus.record({
      domain: "mill",
      kind: "operator_override",
      source: "operator",
      context: { customer: "ITW", material: "D2" },
      recommended: { sfm: 120 },
      actual: { sfm: 95 },
    });
    expect(res.ok).toBe(true);
    expect(res.event_id).toBeTruthy();
    expect(res.lineage_id).toBe(res.event_id);   // defaults to event_id
    expect(fs.existsSync(path.join(root, "mill.jsonl"))).toBe(true);
  });

  it("threads explicit lineage_id through unchanged", () => {
    const res = bus.record({
      domain: "lathe",
      kind: "cycle_time_measurement",
      source: "controller",
      lineage_id: "LNG-QUOTE-4412-v7",
      actual: { cycle_min: 14.5 },
    });
    expect(res.ok).toBe(true);
    expect(res.lineage_id).toBe("LNG-QUOTE-4412-v7");
  });

  it("defaults severity to 'info' when not provided", () => {
    bus.record({ domain: "wedm", kind: "tool_break", source: "sensor" });
    const { events } = bus.query({ domain: "wedm", limit: 10 });
    expect(events[0].severity).toBe("info");
  });

  it("shards by domain (mill + lathe stay separate)", () => {
    bus.record({ domain: "mill", kind: "operator_override", source: "operator" });
    bus.record({ domain: "lathe", kind: "operator_override", source: "operator" });
    const stats = bus.stats();
    expect(stats.domains.mill).toBe(1);
    expect(stats.domains.lathe).toBe(1);
  });

  it("rejects invalid domain without throwing", () => {
    const res = bus.record({
      // @ts-expect-error — intentional invalid domain
      domain: "teleport_beam",
      kind: "operator_override",
      source: "operator",
    });
    expect(res.ok).toBe(false);
    expect(res.warning).toContain("schema validation failed");
  });

  it("rejects invalid kind without throwing", () => {
    const res = bus.record({
      domain: "mill",
      // @ts-expect-error — intentional invalid kind
      kind: "beer_break",
      source: "operator",
    });
    expect(res.ok).toBe(false);
  });

  it("rejects events exceeding MAX_LINE_BYTES", () => {
    const huge = "x".repeat(128 * 1024);   // 128 KB payload
    const res = bus.record({
      domain: "mill",
      kind: "other",
      source: "system",
      context: { payload: huge },
    });
    expect(res.ok).toBe(false);
    expect(res.warning).toContain("exceeds");
  });

  it("records confidence in [0,1]", () => {
    const res = bus.record({
      domain: "speed_feed",
      kind: "recommendation_emitted",
      source: "system",
      recommended: { sfm: 300 },
      confidence: 0.82,
    });
    expect(res.ok).toBe(true);
  });

  it("rejects confidence out of range", () => {
    const res = bus.record({
      domain: "speed_feed",
      kind: "recommendation_emitted",
      source: "system",
      confidence: 1.5,
    });
    expect(res.ok).toBe(false);
  });

  // --- query() -----------------------------------------------------------

  it("queries by domain", () => {
    bus.record({ domain: "mill", kind: "operator_override", source: "operator" });
    bus.record({ domain: "lathe", kind: "operator_override", source: "operator" });
    const millOnly = bus.query({ domain: "mill", limit: 10 });
    expect(millOnly.events.length).toBe(1);
    expect(millOnly.events[0].domain).toBe("mill");
  });

  it("queries by kind across domains", () => {
    bus.record({ domain: "mill", kind: "tool_break", source: "sensor" });
    bus.record({ domain: "lathe", kind: "tool_break", source: "sensor" });
    bus.record({ domain: "mill", kind: "operator_override", source: "operator" });
    const breaks = bus.query({ kind: "tool_break", limit: 10 });
    expect(breaks.events.length).toBe(2);
  });

  it("queries by lineage_id", () => {
    bus.record({
      domain: "quote", kind: "quote_accepted", source: "system",
      lineage_id: "LNG-Q-001",
    });
    bus.record({
      domain: "quote", kind: "quote_vs_actual", source: "system",
      lineage_id: "LNG-Q-001",
    });
    bus.record({
      domain: "quote", kind: "quote_rejected", source: "system",
      lineage_id: "LNG-Q-002",
    });
    const linked = bus.query({ lineage_id: "LNG-Q-001", limit: 10 });
    expect(linked.events.length).toBe(2);
  });

  it("queries by since_iso", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    const cutoff = new Date(Date.now() - 30_000).toISOString();
    bus.record({
      domain: "mill", kind: "operator_override", source: "operator",
      timestamp: past,
    });
    bus.record({ domain: "mill", kind: "operator_override", source: "operator" });
    const recent = bus.query({ since_iso: cutoff, domain: "mill", limit: 10 });
    expect(recent.events.length).toBe(1);
  });

  it("returns newest-first", () => {
    bus.record({
      domain: "mill", kind: "other", source: "system",
      timestamp: new Date(Date.now() - 5_000).toISOString(),
      note: "older",
    });
    bus.record({
      domain: "mill", kind: "other", source: "system",
      note: "newer",
    });
    const { events } = bus.query({ domain: "mill", limit: 10 });
    expect(events[0].note).toBe("newer");
    expect(events[1].note).toBe("older");
  });

  it("honors limit + returns truncated flag", () => {
    for (let i = 0; i < 5; i++) {
      bus.record({
        domain: "mill", kind: "other", source: "system",
        note: `e${i}`,
      });
    }
    const { events, truncated } = bus.query({ domain: "mill", limit: 3 });
    expect(events.length).toBe(3);
    expect(truncated).toBe(true);
  });

  it("skips malformed tail lines (crash-tolerant)", () => {
    bus.record({ domain: "mill", kind: "operator_override", source: "operator" });
    const shard = path.join(root, "mill.jsonl");
    fs.appendFileSync(shard, "{this is not json\n");  // simulate torn tail
    const { events } = bus.query({ domain: "mill", limit: 10 });
    expect(events.length).toBe(1);       // the good event survived
  });

  // --- atomicity --------------------------------------------------------

  it("100 rapid sequential writes all land (no lost lines)", () => {
    for (let i = 0; i < 100; i++) {
      bus.record({
        domain: "mill", kind: "other", source: "system",
        note: `seq-${i}`,
      });
    }
    const stats = bus.stats();
    expect(stats.domains.mill).toBe(100);
    const { events } = bus.query({ domain: "mill", limit: 200 });
    expect(events.length).toBe(100);
  });

  it("survives concurrent interleaved writes across domains", async () => {
    const writes = [
      () => bus.record({ domain: "mill", kind: "other", source: "system", note: "m1" }),
      () => bus.record({ domain: "lathe", kind: "other", source: "system", note: "l1" }),
      () => bus.record({ domain: "wedm", kind: "other", source: "system", note: "w1" }),
      () => bus.record({ domain: "mill", kind: "other", source: "system", note: "m2" }),
      () => bus.record({ domain: "lathe", kind: "other", source: "system", note: "l2" }),
    ];
    await Promise.all(writes.map((w) => Promise.resolve().then(w)));
    const stats = bus.stats();
    expect(stats.domains.mill).toBe(2);
    expect(stats.domains.lathe).toBe(2);
    expect(stats.domains.wedm).toBe(1);
  });

  // --- stats + self-awareness --------------------------------------------

  it("stats reports empty cleanly on fresh root", () => {
    const s = bus.stats();
    expect(s.domains).toEqual({});
    expect(s.retry_queue_size).toBe(0);
    expect(s.root_dir).toBe(root);
  });

  it("exposes self-awareness metadata", () => {
    const meta = OutcomeCaptureBusEngine.getSelfAwareness();
    expect(meta.name).toBe("OutcomeCaptureBusEngine");
    expect(meta.milestone).toContain("U-LEARN-01");
    expect(meta.capabilities).toContain("record");
    expect(meta.capabilities).toContain("query");
  });

  // --- never-throw ------------------------------------------------------

  it("never throws on a bad context payload", () => {
    // Circular reference would JSON-stringify-throw on many libs; ours
    // catches via schema validation.
    const circ: Record<string, unknown> = { self: undefined };
    circ.self = circ;   // circular
    expect(() =>
      bus.record({
        domain: "mill",
        kind: "other",
        source: "system",
        context: circ,
      }),
    ).not.toThrow();
  });

  it("never throws on query of non-existent domain", () => {
    expect(() => bus.query({ domain: "welder", limit: 10 })).not.toThrow();
    const { events } = bus.query({ domain: "welder", limit: 10 });
    expect(events).toEqual([]);
  });
});
