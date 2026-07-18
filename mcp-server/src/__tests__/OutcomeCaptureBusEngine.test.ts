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

  // --- atomic append: O_APPEND path + no-orphan invariant ----------------
  // (regression coverage for the EPERM-leak fix, 2026-06-08 slot:oscar)

  describe("atomicAppend — O_APPEND + no-orphan invariant", () => {
    function countTmpOrphans(dir: string): number {
      return fs
        .readdirSync(dir)
        .filter((f) => f.startsWith(".") && f.endsWith(".tmp")).length;
    }

    it("forward invariant: common (<64KB) path creates NO tmp at all", () => {
      // The original bug: every append did read-whole → write-tmp → rename;
      // a failed rename orphaned the tmp (~12K accumulated in production).
      // The fix routes the common path through appendFileSync (no tmp), so
      // this asserts the NEW design's forward invariant — if someone
      // reintroduces a tmp on the <64KB path, this fails. (The leak's actual
      // failure mode — rename-throws-then-orphans — is covered by the
      // fault-injected fallback test below.)
      for (let i = 0; i < 50; i++) {
        const res = bus.record({
          domain: "mill",
          kind: "other",
          source: "system",
          context: { i },
          recommended: { sfm: 100 + i },
        });
        expect(res.ok).toBe(true);
      }
      // Invariant: the common (< 64 KB) path uses appendFileSync — no tmp at all.
      expect(countTmpOrphans(root)).toBe(0);
    });

    it("appends without tearing — every line round-trips as valid JSON", () => {
      const N = 40;
      for (let i = 0; i < N; i++) {
        bus.record({
          domain: "lathe",
          kind: "other",
          source: "system",
          context: { seq: i },
          recommended: { sfm: i },
        });
      }
      const shard = path.join(root, "lathe.jsonl");
      const lines = fs
        .readFileSync(shard, "utf8")
        .split("\n")
        .filter((l) => l.trim().length > 0);
      expect(lines.length).toBe(N);
      // Every line must parse — no torn/concatenated rows.
      const seqs = lines.map((l) => (JSON.parse(l) as { context: { seq: number } }).context.seq);
      expect(seqs).toEqual(Array.from({ length: N }, (_, i) => i));
    });

    it("is append-only: the existing prefix is byte-identical after a new write", () => {
      bus.record({ domain: "wedm", kind: "other", source: "system", context: { a: 1 } });
      const shard = path.join(root, "wedm.jsonl");
      const afterFirst = fs.readFileSync(shard, "utf8");
      bus.record({ domain: "wedm", kind: "other", source: "system", context: { a: 2 } });
      const afterSecond = fs.readFileSync(shard, "utf8");
      // Prefix must be byte-identical and the file strictly longer — guards
      // against any write path that corrupts or truncates the existing prefix.
      // (Append-vs-rewrite mechanism is proven by the no-tearing test above;
      // this pair guards prefix integrity specifically.)
      expect(afterSecond.startsWith(afterFirst)).toBe(true);
      expect(afterSecond.length).toBeGreaterThan(afterFirst.length);
    });

    it("retry queue stays empty under normal (non-contended) writes", () => {
      for (let i = 0; i < 20; i++) {
        bus.record({ domain: "mill", kind: "other", source: "system", context: { i } });
      }
      const s = bus.stats();
      expect(s.retry_queue_size).toBe(0);
    });

    it("handles a large (but legal) context payload without orphaning", () => {
      // A big-but-under-64KB context still takes the appendFileSync path.
      const big = "x".repeat(8 * 1024); // 8 KB string
      const res = bus.record({
        domain: "mill",
        kind: "other",
        source: "system",
        context: { blob: big },
      });
      expect(res.ok).toBe(true);
      expect(countTmpOrphans(root)).toBe(0);
      const { events } = bus.query({ domain: "mill", limit: 1 });
      expect(events.length).toBe(1);
    });

    it("fallback (>64KB) path leaves NO orphan tmp when renameSync throws EPERM", () => {
      // This is the REAL regression guard for the production leak: the only
      // surviving tmp+rename path is the oversize fallback. Force renameSync
      // to throw the exact Windows sharing-violation (EPERM) that orphaned
      // ~12K tmp files, and assert the catch→unlink cleanup holds.
      const realRename = fs.renameSync;
      let renameAttempts = 0;
      (fs as { renameSync: typeof fs.renameSync }).renameSync = ((
        from: fs.PathLike,
        to: fs.PathLike,
      ) => {
        renameAttempts++;
        const e = new Error("EPERM: operation not permitted, rename") as Error & {
          code: string;
        };
        e.code = "EPERM";
        throw e;
      }) as typeof fs.renameSync;

      try {
        // Reach the private fallback directly with a >64KB line (record()'s
        // upstream cap would reject this before atomicAppend, so we invoke
        // the internal method — the only way to exercise the fallback branch).
        // 64 KB mirrors the engine's module-private MAX_LINE_BYTES constant.
        const ENGINE_MAX_LINE_BYTES = 64 * 1024;
        const oversize = "y".repeat(ENGINE_MAX_LINE_BYTES + 1024) + "\n";
        const shard = path.join(root, "mill.jsonl");
        const internal = bus as unknown as {
          atomicAppend: (fp: string, line: string) => { ok: boolean; warning?: string };
        };
        const res = internal.atomicAppend(shard, oversize);

        // Fail-loud: a persistent rename failure must report not-ok.
        expect(res.ok).toBe(false);
        // The headline invariant: even though rename threw every attempt,
        // the fallback's catch→unlink removed its tmp — ZERO orphans.
        expect(countTmpOrphans(root)).toBe(0);
        // And it actually retried (EPERM is in the transient set).
        expect(renameAttempts).toBeGreaterThan(1);
      } finally {
        (fs as { renameSync: typeof fs.renameSync }).renameSync = realRename;
      }
    });
  });
});
