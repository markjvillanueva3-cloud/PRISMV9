// golfStateSnapshot.test.ts — CLEANUP-MS0/U-CLEANUP-G12 — verify
// scripts/golf-state-snapshot.mjs: daily backup of golf hygiene-chat state
// (coordination.db + 3 golf-*.json + bug_attribution JSONL dump) to
// H:/prism-backups/golf-state/<ISO>/, with 30-day retention.
//
// Coverage (per comprehensive-build-enforce floor):
//   - Happy path: snapshot copies present files + dumps bug_attribution +
//     writes manifest.json + prunes nothing when nothing is stale
//   - Failure mode 1: missing source files → recorded in `skipped`, not errors
//   - Failure mode 2: missing/zero-byte coordination.db → dump skipped, not fatal
//   - Failure mode 3: bug_attribution table absent (prepare throws) → dump skipped
//   - Failure mode 4: sqlite module unresolvable → dump skipped, copies still run
//   - Adversarial 1: invalid --now → ok:false with a clear error, no dir created
//   - Adversarial 2: retain-days 0 → every prior snapshot pruned
//   - Variability: dry-run vs apply; with-db vs without-db; prune vs no-prune
//   - Pure fns: fsSafeIso/parseSnapshotDirName round-trip, parseArgs
//   - dumpBugAttribution exercised via an injected fake Database factory
//
// The sqlite dependency is injected via hooks.databaseFactory for the failure-
// mode tests — no real coordination.db parsed there. ONE test deliberately
// exercises the real better-sqlite3 module against a real on-disk fixture db
// (the dump-success path the fake cannot prove). Fully hermetic temp sandboxes.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync, readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  fsSafeIso,
  parseSnapshotDirName,
  parseArgs,
  dumpBugAttribution,
  snapshot,
  SCHEMA_VERSION,
  DEFAULT_RETAIN_DAYS,
  SOURCE_FILES,
  DUMP_TABLE,
  DUMP_BASENAME,
} from "../../../scripts/golf-state-snapshot.mjs";

const SCRIPT_PATH = path.resolve(__dirname, "../../../scripts/golf-state-snapshot.mjs");
const NODE_BIN = process.execPath;
const DAY_MS = 24 * 60 * 60 * 1000;

// ─── sandbox helpers ─────────────────────────────────────────────────────

const sandboxes: string[] = [];
afterEach(() => {
  while (sandboxes.length) {
    try { rmSync(sandboxes.pop()!, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
});
function mkSandbox(prefix: string): string {
  const d = mkdtempSync(path.join(tmpdir(), prefix));
  sandboxes.push(d);
  return d;
}

/** A repo sandbox with state/shared/ + all 4 source files present.
 *  coordination.db is written non-empty (the fake Database never parses it). */
function makeRepo(opts: { withDb?: boolean } = {}): string {
  const repo = mkSandbox("g12-repo-");
  const shared = path.join(repo, "state", "shared");
  mkdirSync(shared, { recursive: true });
  writeFileSync(path.join(shared, "golf-owned-paths.json"), JSON.stringify({ schemaVersion: 1, ownedPaths: [] }));
  writeFileSync(path.join(shared, "golf-cron-registry.json"), JSON.stringify({ schemaVersion: 1, crons: [] }));
  writeFileSync(path.join(shared, "golf-token-budget.json"), JSON.stringify({ schemaVersion: 1, consumed: 0 }));
  if (opts.withDb !== false) {
    writeFileSync(path.join(shared, "coordination.db"), "SQLite format 3\0fake-but-nonempty");
  }
  return repo;
}

/** Fake better-sqlite3 Database constructor: prepare().all() yields `rows`. */
function fakeDbFactory(rows: any[]) {
  return class FakeDB {
    constructor(_p: string, _o: any) { /* no-op */ }
    pragma() { /* no-op */ }
    prepare(_sql: string) {
      return { all: () => rows };
    }
    close() { /* no-op */ }
  };
}

/** Fake Database whose prepare() throws — simulates the bug_attribution table
 *  being absent (fresh db before the B10 ledger DDL ran). */
function fakeDbFactoryNoTable() {
  return class FakeDBNoTable {
    constructor(_p: string, _o: any) { /* no-op */ }
    pragma() { /* no-op */ }
    prepare(_sql: string): any { throw new Error("no such table: bug_attribution"); }
    close() { /* no-op */ }
  };
}

// ─── exported constants ──────────────────────────────────────────────────

describe("exported constants", () => {
  it("are sane and match the spec (30-day retention, schemaVersion 1)", () => {
    expect(SCHEMA_VERSION).toBe(1);
    expect(DEFAULT_RETAIN_DAYS).toBe(30);
    expect(DUMP_TABLE).toBe("bug_attribution");
    expect(DUMP_BASENAME).toBe("bug_attribution.jsonl");
    expect(Array.isArray(SOURCE_FILES)).toBe(true);
    expect(SOURCE_FILES.map((s: any) => s.rel)).toContain("state/shared/coordination.db");
    expect(SOURCE_FILES.length).toBe(4);
  });
});

// ─── fsSafeIso / parseSnapshotDirName (round-trip) ───────────────────────

describe("fsSafeIso / parseSnapshotDirName", () => {
  it("fsSafeIso replaces every ':' and the '.' so the name is a legal Windows path component", () => {
    const safe = fsSafeIso(new Date("2026-05-14T13:53:47.123Z"));
    expect(safe).toBe("2026-05-14T13-53-47-123Z");
    expect(safe).not.toContain(":");
    expect(safe).not.toContain(".");
  });

  it("round-trips: parseSnapshotDirName(fsSafeIso(d)) recovers the instant", () => {
    for (const iso of [
      "2026-05-14T13:53:47.123Z",
      "2026-01-01T00:00:00.000Z",
      "2025-12-31T23:59:59.999Z",
    ]) {
      const d = new Date(iso);
      const recovered = parseSnapshotDirName(fsSafeIso(d));
      expect(recovered).not.toBeNull();
      expect(recovered!.getTime()).toBe(d.getTime());
    }
  });

  it("parseSnapshotDirName returns null for non-snapshot dir names (adversarial)", () => {
    expect(parseSnapshotDirName("not-a-snapshot")).toBeNull();
    expect(parseSnapshotDirName("2026-05-14")).toBeNull();
    expect(parseSnapshotDirName(".archive")).toBeNull();
    expect(parseSnapshotDirName("")).toBeNull();
    expect(parseSnapshotDirName("2026-13-99T99-99-99-999Z")).toBeNull(); // parses shape but invalid date
  });
});

// ─── parseArgs ───────────────────────────────────────────────────────────

describe("parseArgs", () => {
  it("defaults are sane", () => {
    const a = parseArgs([]);
    expect(a.retainDays).toBe(DEFAULT_RETAIN_DAYS);
    expect(a.dryRun).toBe(false);
    expect(a.json).toBe(false);
    expect(a.now).toBeNull();
    expect(typeof a.repo).toBe("string");
    expect(typeof a.backup).toBe("string");
  });

  it("parses every flag", () => {
    const a = parseArgs(["--repo", "R", "--backup", "B", "--retain-days", "14", "--now", "2026-05-14T00:00:00.000Z", "--dry-run", "--json"]);
    expect(a.repo).toBe("R");
    expect(a.backup).toBe("B");
    expect(a.retainDays).toBe(14);
    expect(a.now).toBe("2026-05-14T00:00:00.000Z");
    expect(a.dryRun).toBe(true);
    expect(a.json).toBe(true);
  });

  it("--retain-days falls back to default on a non-numeric / negative value (failure mode)", () => {
    expect(parseArgs(["--retain-days", "abc"]).retainDays).toBe(DEFAULT_RETAIN_DAYS);
    expect(parseArgs(["--retain-days", "-5"]).retainDays).toBe(DEFAULT_RETAIN_DAYS);
    expect(parseArgs(["--retain-days", "0"]).retainDays).toBe(0); // 0 is valid (prune all)
  });
});

// ─── dumpBugAttribution (injected fake Database) ─────────────────────────

describe("dumpBugAttribution", () => {
  it("dumps every row as JSONL when the table exists (happy path)", async () => {
    const repo = makeRepo();
    const dbPath = path.join(repo, "state", "shared", "coordination.db");
    const rows = [{ id: 1, bug: "regression-a" }, { id: 2, bug: "regression-b" }];
    const res = await dumpBugAttribution(dbPath, { databaseFactory: fakeDbFactory(rows) });
    expect(res.ok).toBe(true);
    expect(res.rows).toBe(2);
    expect(res.jsonl.trim().split("\n")).toEqual([
      JSON.stringify(rows[0]),
      JSON.stringify(rows[1]),
    ]);
  });

  it("empty table → ok with 0 rows and empty jsonl", async () => {
    const repo = makeRepo();
    const dbPath = path.join(repo, "state", "shared", "coordination.db");
    const res = await dumpBugAttribution(dbPath, { databaseFactory: fakeDbFactory([]) });
    expect(res.ok).toBe(true);
    expect(res.rows).toBe(0);
    expect(res.jsonl).toBe("");
  });

  it("missing coordination.db → ok:false with reason (failure mode)", async () => {
    const res = await dumpBugAttribution(path.join(tmpdir(), "definitely-not-a-db.db"), { databaseFactory: fakeDbFactory([]) });
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("not found");
  });

  it("zero-byte coordination.db → ok:false (failure mode)", async () => {
    const repo = makeRepo({ withDb: false });
    const dbPath = path.join(repo, "state", "shared", "coordination.db");
    writeFileSync(dbPath, ""); // zero bytes
    const res = await dumpBugAttribution(dbPath, { databaseFactory: fakeDbFactory([]) });
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("zero-bytes");
  });

  it("table absent (prepare throws) → ok:false, reason names the table (failure mode)", async () => {
    const repo = makeRepo();
    const dbPath = path.join(repo, "state", "shared", "coordination.db");
    const res = await dumpBugAttribution(dbPath, { databaseFactory: fakeDbFactoryNoTable() });
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("bug_attribution");
  });

  it("unresolvable sqlite module → ok:false with load-failed reason (failure mode)", async () => {
    const repo = makeRepo();
    const dbPath = path.join(repo, "state", "shared", "coordination.db");
    const res = await dumpBugAttribution(dbPath, { sqliteModule: "this-module-does-not-exist-xyz" });
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("sqlite module load failed");
  });

  // The injected-fake tests above cannot catch a bug in the SQL string, the
  // {readonly,fileMustExist} options object, or the imported.default unwrap.
  // This one exercises the REAL better-sqlite3 module against a REAL on-disk
  // db with a REAL bug_attribution table — the dump-SUCCESS path that the fake
  // can only stub. (The production coordination.db has no bug_attribution
  // table yet — that DDL ships with B10's ledger — so without this fixture the
  // success branch would have zero real coverage.)
  it("dumps a REAL on-disk bug_attribution table via the real better-sqlite3 module (happy path, no fake)", async () => {
    const repo = makeRepo({ withDb: false });
    const dbPath = path.join(repo, "state", "shared", "coordination.db");
    const { default: RealDatabase } = await import("better-sqlite3");
    const wdb = new RealDatabase(dbPath);
    wdb.exec("CREATE TABLE bug_attribution (id INTEGER PRIMARY KEY, commit_sha TEXT, severity TEXT)");
    wdb.prepare("INSERT INTO bug_attribution (id, commit_sha, severity) VALUES (?, ?, ?)").run(1, "abc1234", "P0");
    wdb.prepare("INSERT INTO bug_attribution (id, commit_sha, severity) VALUES (?, ?, ?)").run(2, "def5678", "P1");
    wdb.close();
    // No databaseFactory / sqliteModule hook → dumpBugAttribution loads the
    // real DEFAULT_SQLITE_MODULE and opens the real db read-only.
    const res = await dumpBugAttribution(dbPath);
    expect(res.ok).toBe(true);
    expect(res.rows).toBe(2);
    const lines = res.jsonl.trim().split("\n").map((l: string) => JSON.parse(l));
    expect(lines[0]).toEqual({ id: 1, commit_sha: "abc1234", severity: "P0" });
    expect(lines[1]).toEqual({ id: 2, commit_sha: "def5678", severity: "P1" });
  });
});

// ─── snapshot() — the integration core ───────────────────────────────────

describe("snapshot()", () => {
  const NOW = "2026-05-14T12:00:00.000Z";

  it("happy path: copies all 4 files, dumps bug_attribution, writes manifest", async () => {
    const repo = makeRepo();
    const backup = mkSandbox("g12-backup-");
    const rows = [{ id: 1, bug: "x" }];
    const res = await snapshot(
      { repo, backup, retainDays: 30, now: NOW, dryRun: false, json: true },
      { databaseFactory: fakeDbFactory(rows) },
    );
    expect(res.ok).toBe(true);
    expect(res.copied.map((c: any) => c.rel).sort()).toEqual(SOURCE_FILES.map((s: any) => s.rel).sort());
    expect(res.dump.ok).toBe(true);
    expect(res.dump.rows).toBe(1);
    expect(res.skipped).toEqual([]);

    const dir = res.snapshotDir;
    expect(existsSync(path.join(dir, "coordination.db"))).toBe(true);
    expect(existsSync(path.join(dir, "golf-owned-paths.json"))).toBe(true);
    expect(existsSync(path.join(dir, DUMP_BASENAME))).toBe(true);
    const manifest = JSON.parse(readFileSync(path.join(dir, "manifest.json"), "utf-8"));
    expect(manifest.schemaVersion).toBe(SCHEMA_VERSION);
    expect(manifest.generatedAt).toBe(NOW);
    expect(manifest.dump).toEqual({ table: "bug_attribution", rows: 1 });
  });

  it("missing source files → recorded in skipped, NOT errors (failure mode)", async () => {
    const repo = makeRepo();
    // Remove two source files.
    rmSync(path.join(repo, "state", "shared", "golf-token-budget.json"));
    rmSync(path.join(repo, "state", "shared", "golf-cron-registry.json"));
    const backup = mkSandbox("g12-backup-");
    const res = await snapshot(
      { repo, backup, retainDays: 30, now: NOW, dryRun: false, json: true },
      { databaseFactory: fakeDbFactory([]) },
    );
    expect(res.ok).toBe(true); // missing sources are not errors
    expect(res.copied.length).toBe(2);
    expect(res.skipped.filter((s: any) => s.reason === "source-missing").length).toBe(2);
    expect(res.errors).toEqual([]);
  });

  it("missing coordination.db → dump skipped, copies still run, ok stays true (failure mode)", async () => {
    const repo = makeRepo({ withDb: false });
    const backup = mkSandbox("g12-backup-");
    const res = await snapshot(
      { repo, backup, retainDays: 30, now: NOW, dryRun: false, json: true },
      { databaseFactory: fakeDbFactory([]) },
    );
    expect(res.ok).toBe(true);
    expect(res.dump.ok).toBe(false);
    expect(res.copied.length).toBe(3); // the 3 json files
    expect(res.skipped.some((s: any) => s.item === DUMP_BASENAME)).toBe(true);
    expect(existsSync(path.join(res.snapshotDir, DUMP_BASENAME))).toBe(false);
  });

  it("table-absent dump degrades gracefully — coordination.db copy is still the full backup", async () => {
    const repo = makeRepo();
    const backup = mkSandbox("g12-backup-");
    const res = await snapshot(
      { repo, backup, retainDays: 30, now: NOW, dryRun: false, json: true },
      { databaseFactory: fakeDbFactoryNoTable() },
    );
    expect(res.ok).toBe(true);
    expect(res.dump.ok).toBe(false);
    expect(existsSync(path.join(res.snapshotDir, "coordination.db"))).toBe(true); // raw copy survived
  });

  it("invalid --now → ok:false with a clear error, no snapshot dir created (adversarial)", async () => {
    const repo = makeRepo();
    const backup = mkSandbox("g12-backup-");
    const res = await snapshot(
      { repo, backup, retainDays: 30, now: "not-a-timestamp", dryRun: false, json: true },
      { databaseFactory: fakeDbFactory([]) },
    );
    expect(res.ok).toBe(false);
    expect(res.errors.some((e: string) => e.includes("invalid --now"))).toBe(true);
    expect(readdirSync(backup)).toEqual([]); // nothing written
  });

  it("--dry-run: plans copies + dump + prune but writes nothing (variability)", async () => {
    const repo = makeRepo();
    const backup = mkSandbox("g12-backup-");
    const res = await snapshot(
      { repo, backup, retainDays: 30, now: NOW, dryRun: true, json: true },
      { databaseFactory: fakeDbFactory([{ id: 1 }]) },
    );
    expect(res.ok).toBe(true);
    expect(res.dryRun).toBe(true);
    expect(res.copied.length).toBe(4);
    expect(res.copied.every((c: any) => c.dryRun === true)).toBe(true);
    expect(res.dump.dryRun).toBe(true);
    expect(readdirSync(backup)).toEqual([]); // zero writes
  });

  it("prune: snapshot dirs older than retain-days are removed; recent + current are kept (variability)", async () => {
    const repo = makeRepo();
    const backup = mkSandbox("g12-backup-");
    const nowMs = Date.parse(NOW);
    // Stale (40d ago) — should be pruned.
    const staleDir = fsSafeIso(new Date(nowMs - 40 * DAY_MS));
    // Recent (5d ago) — should be kept.
    const recentDir = fsSafeIso(new Date(nowMs - 5 * DAY_MS));
    // A non-snapshot dir — must be left alone.
    mkdirSync(path.join(backup, staleDir), { recursive: true });
    mkdirSync(path.join(backup, recentDir), { recursive: true });
    mkdirSync(path.join(backup, "not-a-snapshot"), { recursive: true });

    const res = await snapshot(
      { repo, backup, retainDays: 30, now: NOW, dryRun: false, json: true },
      { databaseFactory: fakeDbFactory([]) },
    );
    expect(res.pruned.map((p: any) => p.dir)).toEqual([staleDir]);
    expect(existsSync(path.join(backup, staleDir))).toBe(false);
    expect(existsSync(path.join(backup, recentDir))).toBe(true);
    expect(existsSync(path.join(backup, "not-a-snapshot"))).toBe(true);
    expect(existsSync(res.snapshotDir)).toBe(true); // current snapshot never pruned
  });

  it("--retain-days 0 prunes every prior snapshot (adversarial boundary)", async () => {
    const repo = makeRepo();
    const backup = mkSandbox("g12-backup-");
    const nowMs = Date.parse(NOW);
    const yesterday = fsSafeIso(new Date(nowMs - DAY_MS));
    mkdirSync(path.join(backup, yesterday), { recursive: true });
    const res = await snapshot(
      { repo, backup, retainDays: 0, now: NOW, dryRun: false, json: true },
      { databaseFactory: fakeDbFactory([]) },
    );
    expect(res.pruned.map((p: any) => p.dir)).toEqual([yesterday]);
    expect(existsSync(path.join(backup, yesterday))).toBe(false);
  });

  it("--dry-run prune reports wouldPrune without deleting (variability)", async () => {
    const repo = makeRepo();
    const backup = mkSandbox("g12-backup-");
    const staleDir = fsSafeIso(new Date(Date.parse(NOW) - 40 * DAY_MS));
    mkdirSync(path.join(backup, staleDir), { recursive: true });
    const res = await snapshot(
      { repo, backup, retainDays: 30, now: NOW, dryRun: true, json: true },
      { databaseFactory: fakeDbFactory([]) },
    );
    expect(res.pruned).toEqual([{ dir: staleDir, ageDays: 40, wouldPrune: true }]);
    expect(existsSync(path.join(backup, staleDir))).toBe(true); // not deleted
  });
});

// ─── CLI (execFileSync round-trip) ───────────────────────────────────────

describe("golf-state-snapshot.mjs CLI", () => {
  function run(repo: string, backup: string, ...extra: string[]): { stdout: string; exitCode: number } {
    try {
      const stdout = execFileSync(
        NODE_BIN,
        [SCRIPT_PATH, "--repo", repo, "--backup", backup, ...extra],
        { encoding: "utf-8", timeout: 15_000 },
      );
      return { stdout, exitCode: 0 };
    } catch (err: any) {
      return { stdout: (err.stdout || "").toString(), exitCode: typeof err.status === "number" ? err.status : 1 };
    }
  }

  it("--help exits 0 and prints usage", () => {
    const repo = makeRepo();
    const backup = mkSandbox("g12-backup-");
    const r = run(repo, backup, "--help");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("golf-state-snapshot.mjs");
  });

  it("--dry-run --json exits 0, writes nothing, reports the plan", () => {
    const repo = makeRepo();
    const backup = mkSandbox("g12-backup-");
    const r = run(repo, backup, "--dry-run", "--json", "--now", "2026-05-14T12:00:00.000Z");
    expect(r.exitCode).toBe(0);
    const res = JSON.parse(r.stdout.trim());
    expect(res.dryRun).toBe(true);
    expect(res.copied.length).toBe(4);
    expect(readdirSync(backup)).toEqual([]);
  });

  it("apply run exits 0 and creates a snapshot dir with the copied files", () => {
    const repo = makeRepo();
    const backup = mkSandbox("g12-backup-");
    const r = run(repo, backup, "--json", "--now", "2026-05-14T12:00:00.000Z");
    expect(r.exitCode).toBe(0);
    const res = JSON.parse(r.stdout.trim());
    expect(res.ok).toBe(true);
    expect(res.copied.length).toBe(4);
    // The real CLI uses the real better-sqlite3 against the fake-content db —
    // that dump may fail (fake bytes aren't a real db), but copies + manifest
    // must still succeed and the run must still exit 0 (graceful degradation).
    expect(existsSync(path.join(res.snapshotDir, "manifest.json"))).toBe(true);
    expect(existsSync(path.join(res.snapshotDir, "coordination.db"))).toBe(true);
  });
});
