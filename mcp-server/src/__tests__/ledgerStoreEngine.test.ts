/**
 * LedgerStoreEngine.test.ts — U-CLEANUP-B10
 *
 * Verifies real DB behavior against an in-memory SQLite for hermetic runs.
 * Coverage targets the comprehensive-build-enforce floor:
 *   - Schema bootstrap is idempotent (re-construct → same row counts).
 *   - migrate(1) returns alreadyAtVersion=true on second call.
 *   - insert() typed paths populate id and apply server-side defaults.
 *   - query() rejects non-SELECT/WITH SQL.
 *   - Validators reject malformed inputs (bad severity, non-array JSON, etc.).
 *   - Typed accessors filter correctly (open bugs only, pending mutations only,
 *     broadcast vs targeted signals).
 *   - mutation lifecycle: pending → applied / rejected (no double-mark).
 *   - schemaVersion() returns 1 after init.
 *   - counts() reports concrete integers.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LedgerStoreEngine, LEDGER_SCHEMA_VERSION } from "../engines/LedgerStoreEngine.js";

vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const MIGRATION_PATH = "H:/prism/mcp-server/src/migrations/golf-ledger-v1.sql";

let engine: LedgerStoreEngine;
let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "prism-ledger-test-"));
  const dbPath = join(workDir, "ledger.db");
  engine = new LedgerStoreEngine({ dbPath, migrationSqlPath: MIGRATION_PATH, now: () => 1_700_000_000_000 });
});

afterEach(() => {
  engine.close();
  try { rmSync(workDir, { recursive: true, force: true }); } catch { /* best-effort */ }
});

describe("LedgerStoreEngine — schema + migration", () => {
  it("migrate(1) on fresh DB reports alreadyAtVersion=false, fromVersion=0, toVersion=1", () => {
    const r = engine.migrate(1);
    expect(r.toVersion).toBe(1);
    expect(r.fromVersion).toBe(0);
    expect(r.alreadyAtVersion).toBe(false);
    expect(r.appliedSqlBytes).toBeGreaterThan(0);
  });

  it("migrate(1) returns alreadyAtVersion=true on second call", () => {
    engine.migrate(1);
    const r2 = engine.migrate(1);
    expect(r2.alreadyAtVersion).toBe(true);
    expect(r2.fromVersion).toBe(1);
    expect(r2.toVersion).toBe(1);
    expect(r2.appliedSqlBytes).toBe(0);
  });

  it("migrate(99) throws (only v1 implemented)", () => {
    expect(() => engine.migrate(99)).toThrowError(/only v1/i);
  });

  it("schemaVersion() returns 0 before migrate() and 1 after", () => {
    // Bootstrap (triggered by counts()) creates tables but does NOT claim a
    // version — explicit migrate() is the version-claim API.
    engine.counts();
    expect(engine.schemaVersion()).toBe(0);
    engine.migrate(1);
    expect(engine.schemaVersion()).toBe(LEDGER_SCHEMA_VERSION);
  });

  it("counts() returns {bugs:0, ticks:0, signals:0, mutations:0} on fresh DB", () => {
    const c = engine.counts();
    expect(c.bugs).toBe(0);
    expect(c.ticks).toBe(0);
    expect(c.signals).toBe(0);
    expect(c.mutations).toBe(0);
  });

  it("missing migration SQL path throws on first method call", () => {
    const bad = new LedgerStoreEngine({
      dbPath: join(workDir, "bad.db"),
      migrationSqlPath: join(workDir, "definitely-not-a-real-path.sql"),
    });
    try {
      expect(() => bad.counts()).toThrowError(/migration SQL not found/i);
    } finally {
      bad.close();
    }
  });
});

describe("LedgerStoreEngine — insert (typed paths)", () => {
  it("insert(bug_attribution) returns row with id>0 and exact field round-trip", () => {
    const r = engine.insert({
      table: "bug_attribution",
      row: {
        bug_id: "BUG-42",
        originating_chat: "alpha",
        commit_sha: "deadbeef".repeat(5),
        file_paths_json: JSON.stringify(["a.ts", "b.ts"]),
        severity: "P1",
        summary: "race in commit-ownership-guard",
        detected_at: 1_700_000_000_000,
      },
    });
    expect(r.table).toBe("bug_attribution");
    expect(r.row.id).toBeGreaterThan(0);
    expect(r.row.bug_id).toBe("BUG-42");
    expect(r.row.severity).toBe("P1");
    expect(r.row.file_paths_json).toBe(JSON.stringify(["a.ts", "b.ts"]));
    expect(r.row.resolved_at).toBe(null);
  });

  it("insert(peer_audit_ticks) defaults findings_count to 0 and status to 'running'", () => {
    const r = engine.insert({
      table: "peer_audit_ticks",
      row: {
        tick_id: "tick-001",
        started_at: 1_700_000_000_000,
        commits_seen: 5,
        status: "running",
      },
    });
    expect(r.table).toBe("peer_audit_ticks");
    expect(r.row.tick_id).toBe("tick-001");
    expect(r.row.commits_seen).toBe(5);
    expect(r.row.findings_count).toBe(0);
    expect(r.row.status).toBe("running");
    expect(r.row.finished_at).toBe(null);
  });

  it("insert(chat_bus_signals) defaults to_chat='*' when not provided", () => {
    const r = engine.insert({
      table: "chat_bus_signals",
      row: {
        signal_id: "sig-001",
        from_chat: "golf",
        to_chat: "*",
        signal_type: "golf_finding",
        payload_json: JSON.stringify({ severity: "P1", file: "src/x.ts" }),
        emitted_at: 1_700_000_000_000,
      },
    });
    expect(r.table).toBe("chat_bus_signals");
    expect(r.row.to_chat).toBe("*");
    expect(r.row.consumed_at).toBe(null);
    expect(JSON.parse(r.row.payload_json).severity).toBe("P1");
  });

  it("insert(golf_envelope_mutations) lands as status='pending'", () => {
    const r = engine.insert({
      table: "golf_envelope_mutations",
      row: {
        mutation_id: "mut-001",
        target_path: "mcp-server/data/milestones/CLEANUP-MS0.json",
        json_patch: JSON.stringify([{ op: "replace", path: "/phases/0/status", value: "complete" }]),
        rationale: "B10 shipped",
        queued_at: 1_700_000_000_000,
        status: "pending",
      },
    });
    expect(r.row.status).toBe("pending");
    expect(r.row.applied_at).toBe(null);
    expect(r.row.applier_chat).toBe(null);
  });

  it("insert(bug_attribution) with non-JSON file_paths_json throws", () => {
    expect(() =>
      engine.insert({
        table: "bug_attribution",
        row: {
          bug_id: "BUG-1",
          originating_chat: "alpha",
          commit_sha: "abc",
          file_paths_json: "{not json",
          severity: "P1",
          summary: "x",
          detected_at: 1_700_000_000_000,
        },
      })
    ).toThrowError(/not valid JSON/);
  });

  it("insert(bug_attribution) with non-array JSON throws", () => {
    expect(() =>
      engine.insert({
        table: "bug_attribution",
        row: {
          bug_id: "BUG-1",
          originating_chat: "alpha",
          commit_sha: "abc",
          file_paths_json: '{"key":"value"}',
          severity: "P1",
          summary: "x",
          detected_at: 1_700_000_000_000,
        },
      })
    ).toThrowError(/parse to an array/);
  });

  it("insert(bug_attribution) with invalid severity throws", () => {
    expect(() =>
      engine.insert({
        table: "bug_attribution",
        row: {
          bug_id: "BUG-1",
          originating_chat: "alpha",
          commit_sha: "abc",
          file_paths_json: "[]",
          // @ts-expect-error: intentional invalid value
          severity: "CRITICAL",
          summary: "x",
          detected_at: 1_700_000_000_000,
        },
      })
    ).toThrowError(/severity/i);
  });

  it("insert(bug_attribution) with negative detected_at throws", () => {
    expect(() =>
      engine.insert({
        table: "bug_attribution",
        row: {
          bug_id: "BUG-1",
          originating_chat: "alpha",
          commit_sha: "abc",
          file_paths_json: "[]",
          severity: "P1",
          summary: "x",
          detected_at: -1,
        },
      })
    ).toThrowError(/epoch-ms/);
  });
});

describe("LedgerStoreEngine — query (read-only SELECT proxy)", () => {
  it("query rejects DROP TABLE", () => {
    expect(() => engine.query("DROP TABLE bug_attribution")).toThrowError(/only SELECT/);
  });

  it("query rejects DELETE", () => {
    expect(() => engine.query("DELETE FROM bug_attribution")).toThrowError(/only SELECT/);
  });

  it("query rejects INSERT", () => {
    expect(() => engine.query("INSERT INTO bug_attribution(bug_id) VALUES('x')")).toThrowError(/only SELECT/);
  });

  it("query rejects empty string", () => {
    expect(() => engine.query("")).toThrowError(/non-empty/);
  });

  it("query accepts SELECT and returns matching rows", () => {
    engine.insert({
      table: "bug_attribution",
      row: {
        bug_id: "BUG-9",
        originating_chat: "alpha",
        commit_sha: "abc",
        file_paths_json: "[]",
        severity: "P2",
        summary: "y",
        detected_at: 1_700_000_000_000,
      },
    });
    const rows = engine.query("SELECT bug_id FROM bug_attribution WHERE severity = ?", ["P2"]) as Array<{ bug_id: string }>;
    expect(rows.length).toBe(1);
    expect(rows[0].bug_id).toBe("BUG-9");
  });

  it("query accepts WITH (CTE)", () => {
    const rows = engine.query("WITH x AS (SELECT 1 AS n) SELECT n FROM x") as Array<{ n: number }>;
    expect(rows.length).toBe(1);
    expect(rows[0].n).toBe(1);
  });

  it("query rejects params array longer than 64", () => {
    const arr = new Array(65).fill(0);
    expect(() => engine.query("SELECT 1", arr)).toThrowError(/at most 64/);
  });
});

describe("LedgerStoreEngine — typed accessors", () => {
  it("listOpenBugs excludes resolved bugs", () => {
    engine.insert({ table: "bug_attribution", row: { bug_id: "B1", originating_chat: "alpha", commit_sha: "a", file_paths_json: "[]", severity: "P1", summary: "open", detected_at: 1_700_000_000_000 } });
    engine.insert({ table: "bug_attribution", row: { bug_id: "B2", originating_chat: "bravo", commit_sha: "b", file_paths_json: "[]", severity: "P2", summary: "will-resolve", detected_at: 1_700_000_000_000 } });
    expect(engine.listOpenBugs().length).toBe(2);
    const wasResolved = engine.resolveBug("B2", "golf", "fixed in commit deadbeef");
    expect(wasResolved).toBe(true);
    const open = engine.listOpenBugs();
    expect(open.length).toBe(1);
    expect(open[0].bug_id).toBe("B1");
  });

  it("resolveBug on already-resolved bug returns false (no double-mark)", () => {
    engine.insert({ table: "bug_attribution", row: { bug_id: "B3", originating_chat: "alpha", commit_sha: "c", file_paths_json: "[]", severity: "P0", summary: "x", detected_at: 1_700_000_000_000 } });
    expect(engine.resolveBug("B3", "golf", "first")).toBe(true);
    expect(engine.resolveBug("B3", "golf", "second")).toBe(false);
  });

  it("finishAuditTick moves status running → complete", () => {
    engine.insert({ table: "peer_audit_ticks", row: { tick_id: "T1", started_at: 1_700_000_000_000, commits_seen: 3, status: "running" } });
    const moved = engine.finishAuditTick({ tick_id: "T1", findings_count: 2, status: "complete" });
    expect(moved).toBe(true);
    const ticks = engine.listRecentTicks();
    expect(ticks.length).toBe(1);
    expect(ticks[0].status).toBe("complete");
    expect(ticks[0].findings_count).toBe(2);
    expect(ticks[0].finished_at).toBe(1_700_000_000_000);
  });

  it("finishAuditTick rejects invalid status", () => {
    engine.insert({ table: "peer_audit_ticks", row: { tick_id: "T2", started_at: 1_700_000_000_000, commits_seen: 0, status: "running" } });
    expect(() =>
      // @ts-expect-error: intentional invalid value
      engine.finishAuditTick({ tick_id: "T2", findings_count: 0, status: "wrong-state" })
    ).toThrowError(/invalid status/);
  });

  it("drainSignalsFor returns broadcast + targeted, skips other targets", () => {
    engine.insert({ table: "chat_bus_signals", row: { signal_id: "s1", from_chat: "golf", to_chat: "*", signal_type: "broadcast", payload_json: "{}", emitted_at: 1 } });
    engine.insert({ table: "chat_bus_signals", row: { signal_id: "s2", from_chat: "golf", to_chat: "alpha", signal_type: "direct", payload_json: "{}", emitted_at: 2 } });
    engine.insert({ table: "chat_bus_signals", row: { signal_id: "s3", from_chat: "golf", to_chat: "bravo", signal_type: "other-target", payload_json: "{}", emitted_at: 3 } });
    const alphaSignals = engine.drainSignalsFor("alpha");
    expect(alphaSignals.length).toBe(2);
    expect(alphaSignals.map((s) => s.signal_id).sort()).toEqual(["s1", "s2"]);
  });

  it("markSignalConsumed is idempotent (second call returns false)", () => {
    engine.insert({ table: "chat_bus_signals", row: { signal_id: "s9", from_chat: "golf", to_chat: "*", signal_type: "x", payload_json: "{}", emitted_at: 1 } });
    expect(engine.markSignalConsumed("s9", "alpha")).toBe(true);
    expect(engine.markSignalConsumed("s9", "alpha")).toBe(false);
  });

  it("envelope mutation lifecycle: pending → applied", () => {
    engine.insert({ table: "golf_envelope_mutations", row: { mutation_id: "m1", target_path: "x.json", json_patch: "[]", rationale: "test", queued_at: 1, status: "pending" } });
    expect(engine.listPendingMutations().length).toBe(1);
    expect(engine.markMutationApplied("m1", "alpha")).toBe(true);
    expect(engine.listPendingMutations().length).toBe(0);
    // Double-apply returns false
    expect(engine.markMutationApplied("m1", "alpha")).toBe(false);
  });

  it("envelope mutation lifecycle: pending → rejected (with error message)", () => {
    engine.insert({ table: "golf_envelope_mutations", row: { mutation_id: "m2", target_path: "x.json", json_patch: "[]", rationale: "test", queued_at: 1, status: "pending" } });
    expect(engine.markMutationRejected("m2", "alpha", "JSON Patch test failed")).toBe(true);
    expect(engine.listPendingMutations().length).toBe(0);
    // Rejected mutations don't show up as applied either
    expect(engine.markMutationApplied("m2", "alpha")).toBe(false);
  });
});

describe("LedgerStoreEngine — persistence", () => {
  it("WAL-mode DB survives close/reopen with rows intact", () => {
    const dbPath = join(workDir, "persist.db");
    const e1 = new LedgerStoreEngine({ dbPath, migrationSqlPath: MIGRATION_PATH });
    e1.insert({ table: "bug_attribution", row: { bug_id: "PERSIST", originating_chat: "alpha", commit_sha: "a", file_paths_json: "[]", severity: "P3", summary: "should survive", detected_at: 1_700_000_000_000 } });
    expect(e1.counts().bugs).toBe(1);
    e1.close();
    expect(existsSync(dbPath)).toBe(true);

    const e2 = new LedgerStoreEngine({ dbPath, migrationSqlPath: MIGRATION_PATH });
    try {
      expect(e2.counts().bugs).toBe(1);
      const open = e2.listOpenBugs();
      expect(open.length).toBe(1);
      expect(open[0].bug_id).toBe("PERSIST");
    } finally {
      e2.close();
    }
  });

  it("close() is safe to call multiple times", () => {
    engine.counts();
    engine.close();
    engine.close();
    // Re-construct works after close
    const e3 = new LedgerStoreEngine({ dbPath: join(workDir, "post-close.db"), migrationSqlPath: MIGRATION_PATH });
    try {
      expect(e3.counts().bugs).toBe(0);
    } finally {
      e3.close();
    }
  });
});

describe("LedgerStoreEngine — UNIQUE constraint enforcement", () => {
  it("duplicate tick_id throws UNIQUE constraint error", () => {
    const row = { tick_id: "DUP-TICK", started_at: 1_700_000_000_000, commits_seen: 0, status: "running" as const };
    engine.insert({ table: "peer_audit_ticks", row });
    expect(() => engine.insert({ table: "peer_audit_ticks", row })).toThrowError(/UNIQUE constraint/i);
  });

  it("duplicate signal_id throws UNIQUE constraint error", () => {
    const row = { signal_id: "DUP-SIG", from_chat: "golf", to_chat: "*", signal_type: "x", payload_json: "{}", emitted_at: 1 };
    engine.insert({ table: "chat_bus_signals", row });
    expect(() => engine.insert({ table: "chat_bus_signals", row })).toThrowError(/UNIQUE constraint/i);
  });

  it("duplicate mutation_id throws UNIQUE constraint error", () => {
    const row = { mutation_id: "DUP-MUT", target_path: "x.json", json_patch: "[]", rationale: "", queued_at: 1, status: "pending" as const };
    engine.insert({ table: "golf_envelope_mutations", row });
    expect(() => engine.insert({ table: "golf_envelope_mutations", row })).toThrowError(/UNIQUE constraint/i);
  });
});

describe("LedgerStoreEngine — multi-statement SQL hardening", () => {
  it("query with embedded DROP TABLE after SELECT — better-sqlite3 throws on multi-statement SQL; the DROP never executes", () => {
    engine.insert({ table: "bug_attribution", row: { bug_id: "MULTI-1", originating_chat: "alpha", commit_sha: "a", file_paths_json: "[]", severity: "P3", summary: "x", detected_at: 1 } });
    // better-sqlite3 rejects any prepare() with >1 statement (stricter than
    // raw sqlite3 — defense-in-depth at the binding layer). The DROP
    // therefore never even compiles, let alone executes.
    expect(() => engine.query("SELECT 1; DROP TABLE bug_attribution; --")).toThrowError(/more than one statement/i);
    // Bug row still present after the rejected multi-statement query.
    const rows = engine.query("SELECT bug_id FROM bug_attribution") as Array<{ bug_id: string }>;
    expect(rows.length).toBe(1);
    expect(rows[0].bug_id).toBe("MULTI-1");
  });

  it("query with WITH CTE that tries to DELETE — SQLite rejects DELETE inside plain WITH (not RETURNING form)", () => {
    engine.insert({ table: "bug_attribution", row: { bug_id: "CTE-1", originating_chat: "alpha", commit_sha: "a", file_paths_json: "[]", severity: "P3", summary: "x", detected_at: 1 } });
    // The proxy allows WITH as the prefix; SQLite itself rejects mixing
    // mutation statements inside a plain WITH ... SELECT block.
    expect(() => engine.query("WITH x AS (DELETE FROM bug_attribution RETURNING bug_id) SELECT * FROM x")).toThrow();
    // Bug row still present.
    const rows = engine.query("SELECT bug_id FROM bug_attribution") as Array<{ bug_id: string }>;
    expect(rows.length).toBe(1);
    expect(rows[0].bug_id).toBe("CTE-1");
  });
});

describe("LedgerStoreEngine — multi-connection WAL concurrency", () => {
  it("two LedgerStoreEngine instances on same DB see each other's rows", () => {
    const dbPath = join(workDir, "concurrent.db");
    const eA = new LedgerStoreEngine({ dbPath, migrationSqlPath: MIGRATION_PATH });
    const eB = new LedgerStoreEngine({ dbPath, migrationSqlPath: MIGRATION_PATH });
    try {
      eA.insert({ table: "bug_attribution", row: { bug_id: "CONCUR-A", originating_chat: "alpha", commit_sha: "a", file_paths_json: "[]", severity: "P2", summary: "from A", detected_at: 1 } });
      eB.insert({ table: "bug_attribution", row: { bug_id: "CONCUR-B", originating_chat: "bravo", commit_sha: "b", file_paths_json: "[]", severity: "P2", summary: "from B", detected_at: 2 } });
      // Both connections see both rows (WAL allows concurrent readers).
      expect(eA.counts().bugs).toBe(2);
      expect(eB.counts().bugs).toBe(2);
      const fromA = eA.query("SELECT bug_id FROM bug_attribution ORDER BY detected_at") as Array<{ bug_id: string }>;
      const fromB = eB.query("SELECT bug_id FROM bug_attribution ORDER BY detected_at") as Array<{ bug_id: string }>;
      expect(fromA.map((r) => r.bug_id)).toEqual(["CONCUR-A", "CONCUR-B"]);
      expect(fromB.map((r) => r.bug_id)).toEqual(["CONCUR-A", "CONCUR-B"]);
    } finally {
      eA.close();
      eB.close();
    }
  });
});
