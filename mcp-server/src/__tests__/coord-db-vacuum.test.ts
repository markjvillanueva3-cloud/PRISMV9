/**
 * coord-db-vacuum.test.ts — CLEANUP-MS0 / U-CLEANUP-G17
 *
 * Tests the pure functions + the orchestrator with a fully-injected db
 * factory (no real SQLite required). Every assertion checks a concrete
 * observable value or content pattern.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  parseArgs,
  safeSize,
  captureSizes,
  sizeDelta,
  runMaintenance,
  appendHealthRow,
  performVacuum,
  readRecentHealthRows,
} from "../../../scripts/coord-db-vacuum.mjs";

describe("parseArgs", () => {
  it("returns documented defaults on empty argv", () => {
    const a = parseArgs([]);
    expect(a.db).toBe("H:/prism/state/shared/coordination.db");
    expect(a.healthLog).toBe("H:/prism/state/shared/coord-db-health.json");
    expect(a.dryRun).toBe(false);
    expect(a.json).toBe(false);
  });

  it("parses every flag with explicit values", () => {
    const a = parseArgs([
      "--db", "/tmp/x.db",
      "--health-log", "/tmp/y.json",
      "--dry-run",
      "--json",
    ]);
    expect(a.db).toBe("/tmp/x.db");
    expect(a.healthLog).toBe("/tmp/y.json");
    expect(a.dryRun).toBe(true);
    expect(a.json).toBe(true);
  });
});

describe("safeSize", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "cdv-")); });
  afterEach(() => { try { rmSync(dir, { recursive: true, force: true }); } catch { /* tolerate */ } });

  it("returns null for a missing file", () => {
    expect(safeSize(join(dir, "no.bin"))).toBe(null);
  });

  it("returns exact byte size of a real file", () => {
    const p = join(dir, "ten.bin");
    writeFileSync(p, "0123456789", "utf-8"); // exactly 10 bytes ASCII
    expect(safeSize(p)).toBe(10);
  });

  it("returns 0 for an empty file (existence proven)", () => {
    const p = join(dir, "empty.bin");
    writeFileSync(p, "", "utf-8");
    expect(safeSize(p)).toBe(0);
  });
});

describe("captureSizes", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "cdv-")); });
  afterEach(() => { try { rmSync(dir, { recursive: true, force: true }); } catch { /* tolerate */ } });

  it("returns nulls when none of db/wal/shm exist", () => {
    const sizes = captureSizes(join(dir, "missing.db"));
    expect(sizes.db).toBe(null);
    expect(sizes.wal).toBe(null);
    expect(sizes.shm).toBe(null);
  });

  it("returns mixed sizes when some sidecars exist", () => {
    const db = join(dir, "x.db");
    writeFileSync(db, "X".repeat(40_960));            // 40 KB main
    writeFileSync(`${db}-wal`, "Y".repeat(2_048));    // 2 KB wal
    // no shm
    const s = captureSizes(db);
    expect(s.db).toBe(40_960);
    expect(s.wal).toBe(2_048);
    expect(s.shm).toBe(null);
  });

  it("returns all three sizes when all three exist", () => {
    const db = join(dir, "x.db");
    writeFileSync(db, "A".repeat(100));
    writeFileSync(`${db}-wal`, "B".repeat(50));
    writeFileSync(`${db}-shm`, "C".repeat(32));
    const s = captureSizes(db);
    expect(s.db).toBe(100);
    expect(s.wal).toBe(50);
    expect(s.shm).toBe(32);
  });
});

describe("sizeDelta", () => {
  it("computes negative total for a shrink (the success case)", () => {
    const before = { db: 100_000, wal: 5_000, shm: 32_000 };
    const after  = { db:  60_000, wal:     0, shm: 32_000 };
    const d = sizeDelta(before, after);
    expect(d.db).toBe(-40_000);
    expect(d.wal).toBe(-5_000);
    expect(d.shm).toBe(0);
    expect(d.total).toBe(-45_000);
  });

  it("treats null sizes as 0 in the delta math", () => {
    const before = { db: 100, wal: null, shm: null };
    const after  = { db: 100, wal:   0, shm:   0 };
    const d = sizeDelta(before, after);
    expect(d.db).toBe(0);
    expect(d.wal).toBe(0);
    expect(d.shm).toBe(0);
    expect(d.total).toBe(0);
  });

  it("computes a positive delta when DB grew", () => {
    const before = { db: 100, wal: 0, shm: 0 };
    const after  = { db: 250, wal: 0, shm: 0 };
    expect(sizeDelta(before, after).total).toBe(150);
  });
});

describe("runMaintenance", () => {
  function fakeDb(seq: Array<{ pragma?: any; exec?: { throw?: string } }>) {
    let step = 0;
    return {
      pragma(_q: string) {
        const cur = seq[step]; step += 1;
        return cur?.pragma ?? [{ busy: 0, log: 0, checkpointed: 0 }];
      },
      exec(_sql: string) {
        const cur = seq[step]; step += 1;
        if (cur?.exec?.throw) throw new Error(cur.exec.throw);
      },
      close() { /* no-op */ },
    };
  }

  it("returns ok=true on the happy path and parses pragma rows numerically", () => {
    const factory = () => fakeDb([
      { pragma: [{ busy: 0, log: 42, checkpointed: 42 }] },
      { exec: {} },
    ]);
    const r = runMaintenance("/fake.db", { dbFactory: factory });
    expect(r.ok).toBe(true);
    expect(r.vacuum).toBe(true);
    expect(r.error).toBe(null);
    expect(r.checkpoint).toMatchObject({ busy: 0, log: 42, checkpointed: 42 });
  });

  it("surfaces open-failed when dbFactory throws", () => {
    const factory = () => { throw new Error("bad path"); };
    const r = runMaintenance("/fake.db", { dbFactory: factory });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/open-failed.*bad path/);
    expect(r.checkpoint).toBe(null);
    expect(r.vacuum).toBe(false);
  });

  it("surfaces checkpoint-failed when pragma throws", () => {
    const factory = () => ({
      pragma() { throw new Error("WAL locked"); },
      exec() { /* not reached */ },
      close() {},
    });
    const r = runMaintenance("/fake.db", { dbFactory: factory });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/checkpoint-failed.*WAL locked/);
    expect(r.vacuum).toBe(false);
  });

  it("surfaces vacuum-failed when exec throws (checkpoint already succeeded)", () => {
    const factory = () => fakeDb([
      { pragma: [{ busy: 0, log: 10, checkpointed: 10 }] },
      { exec: { throw: "disk full" } },
    ]);
    const r = runMaintenance("/fake.db", { dbFactory: factory });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/vacuum-failed.*disk full/);
    expect(r.vacuum).toBe(false);
    // Checkpoint object is preserved so the operator sees what succeeded.
    expect(r.checkpoint).toMatchObject({ busy: 0, log: 10, checkpointed: 10 });
  });

  it("handles non-array pragma return shape (defensive coverage)", () => {
    const factory = () => ({
      pragma() { return null; },
      exec() { /* ok */ },
      close() {},
    });
    const r = runMaintenance("/fake.db", { dbFactory: factory });
    expect(r.ok).toBe(true);
    expect(r.checkpoint).toEqual({ busy: 0, log: 0, checkpointed: 0 });
  });
});

describe("appendHealthRow + readRecentHealthRows", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "cdv-")); });
  afterEach(() => { try { rmSync(dir, { recursive: true, force: true }); } catch { /* tolerate */ } });

  it("creates the log file + writes one JSON line", () => {
    const p = join(dir, "log.jsonl");
    const wrote = appendHealthRow(p, { ts: "2026-05-13T22:35:51Z", ok: true });
    expect(wrote).toBe(true);
    expect(existsSync(p)).toBe(true);
    const raw = readFileSync(p, "utf-8");
    expect(raw).toContain('"ts":"2026-05-13T22:35:51Z"');
    expect(raw.endsWith("\n")).toBe(true);
  });

  it("creates a nested parent directory on first append", () => {
    const p = join(dir, "deeply", "nested", "log.jsonl");
    expect(existsSync(p)).toBe(false);
    const wrote = appendHealthRow(p, { ts: "X", ok: true });
    expect(wrote).toBe(true);
    expect(existsSync(p)).toBe(true);
  });

  it("appends multiple rows in insertion order", () => {
    const p = join(dir, "multi.jsonl");
    appendHealthRow(p, { i: 1 });
    appendHealthRow(p, { i: 2 });
    appendHealthRow(p, { i: 3 });
    const rows = readRecentHealthRows(p);
    expect(rows).toHaveLength(3);
    expect(rows[0].i).toBe(1);
    expect(rows[1].i).toBe(2);
    expect(rows[2].i).toBe(3);
  });

  it("readRecentHealthRows returns empty array for missing file (no throw)", () => {
    const rows = readRecentHealthRows(join(dir, "no.jsonl"));
    expect(rows).toHaveLength(0);
  });

  it("readRecentHealthRows honors the tail limit and returns the LAST N rows", () => {
    const p = join(dir, "many.jsonl");
    for (let i = 0; i < 20; i++) appendHealthRow(p, { i });
    const rows = readRecentHealthRows(p, 5);
    expect(rows).toHaveLength(5);
    expect(rows[0].i).toBe(15);
    expect(rows[4].i).toBe(19);
  });

  it("readRecentHealthRows tolerates a malformed line and returns the valid ones", () => {
    const p = join(dir, "mixed.jsonl");
    writeFileSync(p,
      '{"ok":true}\n' +
      'NOT JSON\n' +
      '{"ok":false}\n',
      "utf-8");
    const rows = readRecentHealthRows(p);
    expect(rows).toHaveLength(2);
    expect(rows[0].ok).toBe(true);
    expect(rows[1].ok).toBe(false);
  });
});

describe("performVacuum — orchestration", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "cdv-")); });
  afterEach(() => { try { rmSync(dir, { recursive: true, force: true }); } catch { /* tolerate */ } });

  function fakeDbFactory(beforeSize: number, afterSize: number, dbPath: string) {
    let phase: "before" | "after" = "before";
    return () => ({
      pragma() {
        // Simulate WAL truncate: shrink the WAL to 0 + write a smaller db file.
        try {
          writeFileSync(`${dbPath}-wal`, "", "utf-8"); // wal truncated
        } catch { /* tolerate */ }
        return [{ busy: 0, log: 5, checkpointed: 5 }];
      },
      exec(_sql: string) {
        // VACUUM: rewrite the main db to its smaller size.
        writeFileSync(dbPath, "X".repeat(afterSize), "utf-8");
        phase = "after";
      },
      close() {},
    });
  }

  it("returns ok=false with error='db-missing' when the DB file is absent", () => {
    const opts = parseArgs([
      "--db", join(dir, "no.db"),
      "--health-log", join(dir, "h.jsonl"),
    ]);
    const row = performVacuum(opts);
    expect(row.ok).toBe(false);
    expect(row.error).toBe("db-missing");
    expect(row.vacuum).toBe(false);
    // Log row was written even on failure.
    const written = readFileSync(opts.healthLog, "utf-8");
    expect(written).toContain('"error":"db-missing"');
  });

  it("dry-run path captures size but does not invoke maintenance", () => {
    const db = join(dir, "x.db");
    writeFileSync(db, "Z".repeat(1234));
    let factoryCalls = 0;
    const opts = parseArgs([
      "--db", db,
      "--health-log", join(dir, "h.jsonl"),
      "--dry-run",
    ]);
    const row = performVacuum(opts, {
      dbFactory: () => { factoryCalls += 1; return null as any; },
    });
    expect(row.ok).toBe(true);
    expect(row.dryRun).toBe(true);
    expect(row.vacuum).toBe(false);
    expect(row.checkpoint).toBe(null);
    expect(row.before.db).toBe(1234);
    expect(row.delta.total).toBe(0);
    expect(factoryCalls).toBe(0);
  });

  it("happy path: records before/after + a NEGATIVE delta (the success signature)", () => {
    const db = join(dir, "x.db");
    writeFileSync(db, "P".repeat(10_000)); // before = 10 KB
    writeFileSync(`${db}-wal`, "Q".repeat(2_000)); // wal = 2 KB
    const opts = parseArgs([
      "--db", db,
      "--health-log", join(dir, "h.jsonl"),
    ]);
    const row = performVacuum(opts, {
      dbFactory: fakeDbFactory(10_000, 6_000, db),
      now: () => "2026-05-13T22:35:51Z",
    });
    expect(row.ok).toBe(true);
    expect(row.ts).toBe("2026-05-13T22:35:51Z");
    expect(row.before.db).toBe(10_000);
    expect(row.before.wal).toBe(2_000);
    expect(row.after.db).toBe(6_000);
    expect(row.after.wal).toBe(0);
    expect(row.delta.db).toBe(-4_000);
    expect(row.delta.wal).toBe(-2_000);
    expect(row.delta.total).toBe(-6_000);
    expect(row.checkpoint).toMatchObject({ busy: 0, log: 5, checkpointed: 5 });
    expect(row.vacuum).toBe(true);
    expect(row.error).toBe(null);
  });

  it("records an unhealthy run with vacuum=false + a captured error", () => {
    const db = join(dir, "x.db");
    writeFileSync(db, "P".repeat(500));
    const opts = parseArgs([
      "--db", db,
      "--health-log", join(dir, "h.jsonl"),
    ]);
    const factory = () => ({
      pragma() { throw new Error("WAL locked by peer"); },
      exec() { /* not reached */ },
      close() {},
    });
    const row = performVacuum(opts, { dbFactory: factory });
    expect(row.ok).toBe(false);
    expect(row.vacuum).toBe(false);
    expect(row.error).toMatch(/checkpoint-failed.*WAL locked by peer/);
    // Log row was still written.
    const tail = readRecentHealthRows(opts.healthLog, 1);
    expect(tail).toHaveLength(1);
    expect(tail[0].error).toMatch(/checkpoint-failed/);
  });
});
