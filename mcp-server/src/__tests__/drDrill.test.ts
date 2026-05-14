/**
 * drDrill.test.ts — CLEANUP-MS0 / U-CLEANUP-G14 test suite
 *
 * Hermetic tests for scripts/dr-drill.mjs:
 *   - Pure helpers (parseSnapshotDirName, parseArgs, listSnapshots,
 *     findLatestSnapshot, isRestorePathSafe, extractPragmaResult, readManifest,
 *     restoreSnapshot, appendLedger).
 *   - validateRestoredDb with an injected synthetic better-sqlite3 Database
 *     constructor — exercises PASS, multi-row integrity FAIL, quick_check
 *     FAIL, table-missing FAIL, count-failed, row-parity mismatch, zero-bytes
 *     db, missing module.
 *   - drDrill orchestrator hitting every FAILURE_CATEGORIES.* value plus a
 *     happy-path PASS, with all I/O routed through tmpdir + hooks.
 *
 * Every assertion is on a real value (no `.toBeTruthy()` / `.toBeDefined()`
 * stubs). The synthetic Database constructor captures opens/closes so the
 * test asserts the drill actually closed the handle.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdirSync, writeFileSync, readFileSync, existsSync, rmSync,
} from "node:fs";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const _here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(_here, "..", "..", "..");
const DR_DRILL_PATH = join(REPO_ROOT, "scripts", "dr-drill.mjs");
const DR_DRILL_URL = "file:///" + DR_DRILL_PATH.replace(/\\/g, "/");

// Dynamic, cache-busted import so each test sees a fresh module if needed.
async function loadDrDrill(): Promise<any> {
  return await import(`${DR_DRILL_URL}?t=${Math.random()}`);
}

// ─── Test scratch dir helpers ────────────────────────────────────────────

let SCRATCH = "";
beforeEach(() => {
  SCRATCH = join(
    tmpdir(),
    `prism-drdrill-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  mkdirSync(SCRATCH, { recursive: true });
});
afterEach(() => {
  if (SCRATCH && existsSync(SCRATCH)) {
    try { rmSync(SCRATCH, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
});

function scratchSubdir(name: string): string {
  const p = join(SCRATCH, name);
  mkdirSync(p, { recursive: true });
  return p;
}

// ─── Synthetic G12-shape snapshot helpers ────────────────────────────────

const SAFE_ISO = "2026-05-14T13-53-47-123Z";
const ISO_AS_GENERATED_AT = "2026-05-14T13:53:47.123Z";

interface SnapshotOpts {
  manifest?: object | null | "missing" | "bad-json" | "no-schema-version" | "no-generated-at" | "no-copied" | "not-object";
  withDb?: boolean;
  dbBytes?: number;
  withBugAttribJsonl?: boolean;
  withOwnedPaths?: boolean;
  withCronRegistry?: boolean;
  withTokenBudget?: boolean;
  dumpRows?: number | null;
  badRows?: any; // for malformed dump.rows tests
  manifestExtraCopied?: string[]; // for testing cross-check warnings
}

function makeSnapshotDir(backupRoot: string, safeIso = SAFE_ISO, opts: SnapshotOpts = {}): string {
  const dir = join(backupRoot, safeIso);
  mkdirSync(dir, { recursive: true });

  if (opts.withDb !== false) {
    writeFileSync(join(dir, "coordination.db"), Buffer.alloc(opts.dbBytes ?? 64, 0x42));
  }
  if (opts.withBugAttribJsonl) {
    writeFileSync(join(dir, "bug_attribution.jsonl"), '{"id":1}\n{"id":2}\n');
  }
  if (opts.withOwnedPaths) {
    writeFileSync(join(dir, "golf-owned-paths.json"), '{"ok":true}\n');
  }
  if (opts.withCronRegistry) {
    writeFileSync(join(dir, "golf-cron-registry.json"), '{"schemaVersion":1,"jobs":[]}\n');
  }
  if (opts.withTokenBudget) {
    writeFileSync(join(dir, "golf-token-budget.json"), '{"daily":1000,"used":0}\n');
  }

  if (opts.manifest === "missing") {
    // do not write
  } else if (opts.manifest === "bad-json") {
    writeFileSync(join(dir, "manifest.json"), "{not json");
  } else if (opts.manifest === "not-object") {
    writeFileSync(join(dir, "manifest.json"), '"a string"');
  } else if (opts.manifest === "no-schema-version") {
    writeFileSync(join(dir, "manifest.json"), JSON.stringify({
      generatedAt: ISO_AS_GENERATED_AT, copied: [], dump: null,
    }));
  } else if (opts.manifest === "no-generated-at") {
    writeFileSync(join(dir, "manifest.json"), JSON.stringify({
      schemaVersion: 1, copied: [], dump: null,
    }));
  } else if (opts.manifest === "no-copied") {
    writeFileSync(join(dir, "manifest.json"), JSON.stringify({
      schemaVersion: 1, generatedAt: ISO_AS_GENERATED_AT, dump: null,
    }));
  } else if (opts.manifest && typeof opts.manifest === "object") {
    writeFileSync(join(dir, "manifest.json"), JSON.stringify(opts.manifest, null, 2));
  } else {
    // Default valid G12-shaped manifest.
    const copied = ["state/shared/coordination.db"];
    if (opts.withOwnedPaths) copied.push("state/shared/golf-owned-paths.json");
    if (opts.withCronRegistry) copied.push("state/shared/golf-cron-registry.json");
    if (opts.withTokenBudget) copied.push("state/shared/golf-token-budget.json");
    if (opts.manifestExtraCopied) copied.push(...opts.manifestExtraCopied);
    const dump = opts.dumpRows == null
      ? (opts.badRows !== undefined ? { table: "bug_attribution", rows: opts.badRows } : null)
      : { table: "bug_attribution", rows: opts.dumpRows };
    writeFileSync(join(dir, "manifest.json"), JSON.stringify({
      schemaVersion: 1,
      generatedAt: ISO_AS_GENERATED_AT,
      copied,
      dump,
    }, null, 2));
  }

  return dir;
}

// ─── Synthetic Database factory ──────────────────────────────────────────

interface FakeDbHooks {
  integrityRows?: any[];
  quickCheckRows?: any[];
  rowCount?: number | null;
  throwOnOpen?: string;
  throwOnPragma?: string;
  pragmaCalls?: string[];
  closed?: boolean[];
}

function makeFakeDatabaseFactory(hooks: FakeDbHooks) {
  hooks.pragmaCalls = hooks.pragmaCalls ?? [];
  hooks.closed = hooks.closed ?? [];
  return function FakeDatabase(_path: string, _opts: any) {
    if (hooks.throwOnOpen) throw new Error(hooks.throwOnOpen);
    let closed = false;
    return {
      pragma(s: string) {
        hooks.pragmaCalls!.push(s);
        if (hooks.throwOnPragma && s.startsWith(hooks.throwOnPragma)) {
          throw new Error(`pragma boom: ${s}`);
        }
        if (s === "integrity_check") {
          return hooks.integrityRows ?? [{ integrity_check: "ok" }];
        }
        if (s === "quick_check") {
          return hooks.quickCheckRows ?? [{ quick_check: "ok" }];
        }
        return [];
      },
      prepare(sql: string) {
        return {
          get(): any {
            if (sql.includes("bug_attribution")) {
              if (hooks.rowCount === null) {
                throw new Error("no such table: bug_attribution");
              }
              return { n: hooks.rowCount ?? 0 };
            }
            return null;
          },
          all(): any[] { return []; },
        };
      },
      close() {
        if (closed) return;
        closed = true;
        hooks.closed!.push(true);
      },
    };
  };
}

// ═════════════════════════════════════════════════════════════════════════
// A. parseSnapshotDirName
// ═════════════════════════════════════════════════════════════════════════
describe("A. parseSnapshotDirName", () => {
  it("A1 — parses a G12-shaped safe ISO directory name", async () => {
    const dr = await loadDrDrill();
    const d = dr.parseSnapshotDirName("2026-05-14T13-53-47-123Z");
    expect(d instanceof Date).toBe(true);
    expect(d.toISOString()).toBe("2026-05-14T13:53:47.123Z");
  });
  it("A2 — pads short millis", async () => {
    const dr = await loadDrDrill();
    const d = dr.parseSnapshotDirName("2026-01-01T00-00-00-5Z");
    expect(d.toISOString()).toBe("2026-01-01T00:00:00.500Z");
  });
  it("A3 — returns null for unparseable names", async () => {
    const dr = await loadDrDrill();
    expect(dr.parseSnapshotDirName("not-a-snapshot")).toBe(null);
    expect(dr.parseSnapshotDirName("")).toBe(null);
    expect(dr.parseSnapshotDirName("2026-05-14T13:53:47.123Z")).toBe(null);
  });
  it("A4 — returns null for malformed numeric components", async () => {
    const dr = await loadDrDrill();
    expect(dr.parseSnapshotDirName("9999-99-99T99-99-99-999Z")).toBe(null);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// B. parseArgs
// ═════════════════════════════════════════════════════════════════════════
describe("B. parseArgs", () => {
  it("B1 — empty argv returns defaults", async () => {
    const dr = await loadDrDrill();
    const a = dr.parseArgs([]);
    expect(a.dryRun).toBe(false);
    expect(a.json).toBe(false);
    expect(a.help).toBe(false);
    expect(a.snapshot).toBe(null);
    expect(a.now).toBe(null);
    expect(a.backup).toBe(dr.DEFAULT_BACKUP);
    expect(a.restoreDir).toBe(dr.DEFAULT_RESTORE_DIR);
  });
  it("B2 — accepts every flag including --snapshot, --now, --ledger", async () => {
    const dr = await loadDrDrill();
    const a = dr.parseArgs([
      "--repo", "R", "--backup", "B", "--restore-dir", "RD",
      "--ledger", "L.jsonl", "--snapshot", "S", "--now", "2026-05-14T00:00:00Z",
      "--dry-run", "--json",
    ]);
    expect(a.repo).toBe("R");
    expect(a.backup).toBe("B");
    expect(a.restoreDir).toBe("RD");
    expect(a.ledger).toBe("L.jsonl");
    expect(a.snapshot).toBe("S");
    expect(a.now).toBe("2026-05-14T00:00:00Z");
    expect(a.dryRun).toBe(true);
    expect(a.json).toBe(true);
  });
  it("B3 — --help and -h both set help true", async () => {
    const dr = await loadDrDrill();
    expect(dr.parseArgs(["--help"]).help).toBe(true);
    expect(dr.parseArgs(["-h"]).help).toBe(true);
  });
  it("B4 — flags with missing values are ignored, not crash", async () => {
    const dr = await loadDrDrill();
    const a = dr.parseArgs(["--backup"]);
    expect(a.backup).toBe(dr.DEFAULT_BACKUP);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// C. listSnapshots / findLatestSnapshot
// ═════════════════════════════════════════════════════════════════════════
describe("C. listSnapshots / findLatestSnapshot", () => {
  it("C1 — empty backup root returns []", async () => {
    const dr = await loadDrDrill();
    expect(dr.listSnapshots(join(SCRATCH, "nonexistent"))).toEqual([]);
  });
  it("C2 — finds and sorts snapshot dirs newest-first", async () => {
    const dr = await loadDrDrill();
    const root = scratchSubdir("backup");
    mkdirSync(join(root, "2026-05-10T00-00-00-000Z"));
    mkdirSync(join(root, "2026-05-14T13-53-47-123Z"));
    mkdirSync(join(root, "2026-05-12T00-00-00-000Z"));
    mkdirSync(join(root, "_not-a-snapshot"));
    writeFileSync(join(root, "file.txt"), "hi");
    const list = dr.listSnapshots(root);
    expect(list.map((s: any) => s.name)).toEqual([
      "2026-05-14T13-53-47-123Z",
      "2026-05-12T00-00-00-000Z",
      "2026-05-10T00-00-00-000Z",
    ]);
    expect(list[0].date instanceof Date).toBe(true);
    expect(list[0].date.toISOString()).toBe("2026-05-14T13:53:47.123Z");
  });
  it("C3 — findLatestSnapshot returns the top entry or null", async () => {
    const dr = await loadDrDrill();
    const root = scratchSubdir("backup");
    expect(dr.findLatestSnapshot(root)).toBe(null);
    mkdirSync(join(root, SAFE_ISO));
    const latest = dr.findLatestSnapshot(root);
    expect(latest.name).toBe(SAFE_ISO);
    expect(latest.path).toBe(join(root, SAFE_ISO));
  });
});

// ═════════════════════════════════════════════════════════════════════════
// D. isRestorePathSafe
// ═════════════════════════════════════════════════════════════════════════
describe("D. isRestorePathSafe", () => {
  it("D1 — accepts a safe scratch path", async () => {
    const dr = await loadDrDrill();
    const r = dr.isRestorePathSafe(join(SCRATCH, "restore"));
    expect(r.ok).toBe(true);
  });
  it("D2 — refuses reserved Windows roots", async () => {
    const dr = await loadDrDrill();
    const cases = ["C:\\Windows\\System32", "C:\\Windows", "C:\\Program Files\\node", "C:\\Users\\me"];
    for (const c of cases) {
      const r = dr.isRestorePathSafe(c);
      expect(r.ok).toBe(false);
      expect(typeof r.reason).toBe("string");
      expect(r.reason.length > 0).toBe(true);
    }
  });
  it("D3 — refuses empty / non-string input", async () => {
    const dr = await loadDrDrill();
    expect(dr.isRestorePathSafe("").ok).toBe(false);
    expect(dr.isRestorePathSafe(null as any).ok).toBe(false);
    expect(dr.isRestorePathSafe(undefined as any).ok).toBe(false);
  });
  it("D4 — case-insensitive prefix on Windows", async () => {
    const dr = await loadDrDrill();
    const r = dr.isRestorePathSafe("c:\\WINDOWS\\foo");
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("reserved root");
  });
  it("D5 — sibling paths to reserved roots are allowed", async () => {
    const dr = await loadDrDrill();
    // C:\WindowsXYZ is not a subpath of C:\Windows
    expect(dr.isRestorePathSafe("C:\\WindowsXYZ\\foo").ok).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// E. extractPragmaResult
// ═════════════════════════════════════════════════════════════════════════
describe("E. extractPragmaResult", () => {
  it("E1 — empty input returns null scalar, no extras", async () => {
    const dr = await loadDrDrill();
    const r = dr.extractPragmaResult([], "integrity_check");
    expect(r.scalar).toBe(null);
    expect(r.extraProblems).toEqual([]);
  });
  it("E2 — single healthy row returns scalar 'ok', no extras", async () => {
    const dr = await loadDrDrill();
    const r = dr.extractPragmaResult([{ integrity_check: "ok" }], "integrity_check");
    expect(r.scalar).toBe("ok");
    expect(r.extraProblems).toEqual([]);
  });
  it("E3 — multi-row corruption returns first error + extras", async () => {
    const dr = await loadDrDrill();
    const r = dr.extractPragmaResult([
      { integrity_check: "row 5 missing from index" },
      { integrity_check: "row 7 wrong parent" },
      { integrity_check: "row 9 bad btree" },
    ], "integrity_check");
    expect(r.scalar).toBe("row 5 missing from index");
    expect(r.extraProblems).toEqual(["row 7 wrong parent", "row 9 bad btree"]);
  });
  it("E4 — falls back to first-key when expected key absent", async () => {
    const dr = await loadDrDrill();
    const r = dr.extractPragmaResult([{ surprise: "value" }], "integrity_check");
    expect(r.scalar).toBe("value");
  });
  it("E5 — non-object row (scalar string/number) is returned as-is", async () => {
    const dr = await loadDrDrill();
    expect(dr.extractPragmaResult(["literal"], "x").scalar).toBe("literal");
    expect(dr.extractPragmaResult([42], "x").scalar).toBe(42);
  });
  it("E6 — null rows in array are skipped from extras", async () => {
    const dr = await loadDrDrill();
    const r = dr.extractPragmaResult(
      [{ integrity_check: "row1" }, null, { integrity_check: "row3" }],
      "integrity_check",
    );
    expect(r.scalar).toBe("row1");
    expect(r.extraProblems).toEqual(["row3"]);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// F. readManifest
// ═════════════════════════════════════════════════════════════════════════
describe("F. readManifest", () => {
  it("F1 — missing manifest returns ok:false with specific reason", async () => {
    const dr = await loadDrDrill();
    const r = dr.readManifest(SCRATCH);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("missing");
  });
  it("F2 — bad JSON returns ok:false bad-json reason", async () => {
    const dr = await loadDrDrill();
    writeFileSync(join(SCRATCH, "manifest.json"), "{not json");
    const r = dr.readManifest(SCRATCH);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("bad JSON");
  });
  it("F3 — non-object payload is rejected", async () => {
    const dr = await loadDrDrill();
    writeFileSync(join(SCRATCH, "manifest.json"), '"hi"');
    const r = dr.readManifest(SCRATCH);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("not an object");
  });
  it("F4 — missing schemaVersion rejected", async () => {
    const dr = await loadDrDrill();
    writeFileSync(join(SCRATCH, "manifest.json"),
      JSON.stringify({ generatedAt: "x", copied: [] }));
    const r = dr.readManifest(SCRATCH);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("schemaVersion");
  });
  it("F5 — missing generatedAt rejected", async () => {
    const dr = await loadDrDrill();
    writeFileSync(join(SCRATCH, "manifest.json"),
      JSON.stringify({ schemaVersion: 1, copied: [] }));
    const r = dr.readManifest(SCRATCH);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("generatedAt");
  });
  it("F6 — missing copied[] rejected", async () => {
    const dr = await loadDrDrill();
    writeFileSync(join(SCRATCH, "manifest.json"),
      JSON.stringify({ schemaVersion: 1, generatedAt: "x" }));
    const r = dr.readManifest(SCRATCH);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("copied");
  });
  it("F7 — valid manifest is parsed", async () => {
    const dr = await loadDrDrill();
    writeFileSync(join(SCRATCH, "manifest.json"), JSON.stringify({
      schemaVersion: 1,
      generatedAt: ISO_AS_GENERATED_AT,
      copied: ["state/shared/coordination.db"],
      dump: { table: "bug_attribution", rows: 7 },
    }));
    const r = dr.readManifest(SCRATCH);
    expect(r.ok).toBe(true);
    expect(r.manifest.schemaVersion).toBe(1);
    expect(r.manifest.generatedAt).toBe(ISO_AS_GENERATED_AT);
    expect(r.manifest.copied.length).toBe(1);
    expect(r.manifest.dump.rows).toBe(7);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// G. restoreSnapshot
// ═════════════════════════════════════════════════════════════════════════
describe("G. restoreSnapshot", () => {
  it("G1 — copies every file from snapshot dir into a fresh restore dir", async () => {
    const dr = await loadDrDrill();
    const backup = scratchSubdir("backup");
    const snap = makeSnapshotDir(backup, SAFE_ISO, {
      withOwnedPaths: true, withCronRegistry: true, withTokenBudget: true,
      withBugAttribJsonl: true, dumpRows: 2,
    });
    const restore = join(SCRATCH, "restore");
    const r = dr.restoreSnapshot(snap, restore, { dryRun: false });
    expect(r.errors).toEqual([]);
    // 6 files: coordination.db, manifest.json, 3 jsons, bug_attribution.jsonl
    expect(r.copied.length).toBe(6);
    expect(existsSync(join(restore, "coordination.db"))).toBe(true);
    expect(existsSync(join(restore, "manifest.json"))).toBe(true);
    expect(existsSync(join(restore, "golf-owned-paths.json"))).toBe(true);
    expect(existsSync(join(restore, "bug_attribution.jsonl"))).toBe(true);
    // Verify the actual bytes were preserved end-to-end.
    const dbBytes = readFileSync(join(restore, "coordination.db"));
    expect(dbBytes.length).toBe(64);
    expect(dbBytes[0]).toBe(0x42);
  });
  it("G2 — dry-run plans without writing", async () => {
    const dr = await loadDrDrill();
    const backup = scratchSubdir("backup");
    const snap = makeSnapshotDir(backup, SAFE_ISO, { withOwnedPaths: true });
    const restore = join(SCRATCH, "restore-dryrun");
    const r = dr.restoreSnapshot(snap, restore, { dryRun: true });
    expect(r.errors).toEqual([]);
    // Every copied entry must carry dryRun: true.
    const dryRunCount = r.copied.filter((c: any) => c.dryRun === true).length;
    expect(dryRunCount).toBe(r.copied.length);
    expect(dryRunCount > 0).toBe(true);
    expect(existsSync(restore)).toBe(false);
  });
  it("G3 — wipes existing restore dir before copy", async () => {
    const dr = await loadDrDrill();
    const backup = scratchSubdir("backup");
    const snap = makeSnapshotDir(backup, SAFE_ISO);
    const restore = scratchSubdir("restore");
    writeFileSync(join(restore, "stale.txt"), "from last run");
    dr.restoreSnapshot(snap, restore, { dryRun: false });
    expect(existsSync(join(restore, "stale.txt"))).toBe(false);
    expect(existsSync(join(restore, "coordination.db"))).toBe(true);
  });
  it("G4 — missing snapshot dir produces an error entry", async () => {
    const dr = await loadDrDrill();
    const r = dr.restoreSnapshot(join(SCRATCH, "no-such-snap"), join(SCRATCH, "restore"), {});
    expect(r.errors.length).toBe(1);
    expect(r.errors[0]).toContain("does not exist");
    expect(r.copied.length).toBe(0);
  });
  it("G5 — subdirectories inside a snapshot are skipped, not descended", async () => {
    const dr = await loadDrDrill();
    const backup = scratchSubdir("backup");
    const snap = makeSnapshotDir(backup, SAFE_ISO);
    mkdirSync(join(snap, "subdir"));
    writeFileSync(join(snap, "subdir", "nested.txt"), "x");
    const restore = join(SCRATCH, "restore-skipsub");
    const r = dr.restoreSnapshot(snap, restore, {});
    const skippedSubdir = r.skipped.filter((s: any) => s.name === "subdir");
    expect(skippedSubdir.length).toBe(1);
    expect(skippedSubdir[0].reason).toBe("directory-skip");
    // The nested file must NOT have been copied (would be at restore/nested.txt
    // if the loop had descended).
    expect(existsSync(join(restore, "subdir"))).toBe(false);
    expect(existsSync(join(restore, "nested.txt"))).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// H. validateRestoredDb (synthetic Database factory)
// ═════════════════════════════════════════════════════════════════════════
describe("H. validateRestoredDb", () => {
  it("H1 — healthy db + matching row count → PASS", async () => {
    const dr = await loadDrDrill();
    const dbPath = join(SCRATCH, "db.bin");
    writeFileSync(dbPath, Buffer.alloc(64, 1));
    const fakeHooks: FakeDbHooks = { rowCount: 5 };
    const v = await dr.validateRestoredDb(dbPath, 5, {
      databaseFactory: makeFakeDatabaseFactory(fakeHooks),
    });
    expect(v.ok).toBe(true);
    expect(v.integrity).toBe("ok");
    expect(v.quickCheck).toBe("ok");
    expect(v.rowCount).toBe(5);
    expect(v.expectedRows).toBe(5);
    expect(v.parity).toBe("ok");
    expect(v.errors).toEqual([]);
    expect(fakeHooks.closed!.length).toBe(1);
  });
  it("H2 — row count mismatch → FAIL with parity:mismatch", async () => {
    const dr = await loadDrDrill();
    const dbPath = join(SCRATCH, "db.bin");
    writeFileSync(dbPath, Buffer.alloc(64, 1));
    const v = await dr.validateRestoredDb(dbPath, 10, {
      databaseFactory: makeFakeDatabaseFactory({ rowCount: 9 }),
    });
    expect(v.ok).toBe(false);
    expect(v.parity).toBe("mismatch");
    expect(v.rowCount).toBe(9);
    const mismatchErr = v.errors.filter((e: string) => e.includes("manifest=10") && e.includes("restored=9"));
    expect(mismatchErr.length).toBe(1);
  });
  it("H3 — table missing when manifest expected rows → parity 'fail'", async () => {
    const dr = await loadDrDrill();
    const dbPath = join(SCRATCH, "db.bin");
    writeFileSync(dbPath, Buffer.alloc(64, 1));
    const v = await dr.validateRestoredDb(dbPath, 5, {
      databaseFactory: makeFakeDatabaseFactory({ rowCount: null }),
    });
    expect(v.ok).toBe(false);
    expect(v.parity).toBe("fail");
    const countErr = v.errors.filter((e: string) => e.includes("count bug_attribution failed"));
    expect(countErr.length).toBe(1);
  });
  it("H4 — expectedRows null + table missing → parity 'skipped' + no error", async () => {
    const dr = await loadDrDrill();
    const dbPath = join(SCRATCH, "db.bin");
    writeFileSync(dbPath, Buffer.alloc(64, 1));
    const v = await dr.validateRestoredDb(dbPath, null, {
      databaseFactory: makeFakeDatabaseFactory({ rowCount: null }),
    });
    expect(v.ok).toBe(true);
    expect(v.parity).toBe("skipped");
    expect(v.errors).toEqual([]);
  });
  it("H5 — expectedRows null + table present → parity 'skipped' but rowCount recorded for observability", async () => {
    const dr = await loadDrDrill();
    const dbPath = join(SCRATCH, "db.bin");
    writeFileSync(dbPath, Buffer.alloc(64, 1));
    const v = await dr.validateRestoredDb(dbPath, null, {
      databaseFactory: makeFakeDatabaseFactory({ rowCount: 42 }),
    });
    expect(v.ok).toBe(true);
    expect(v.parity).toBe("skipped");
    expect(v.rowCount).toBe(42);
  });
  it("H6 — multi-row integrity_check → integrity != ok, extras surfaced", async () => {
    const dr = await loadDrDrill();
    const dbPath = join(SCRATCH, "db.bin");
    writeFileSync(dbPath, Buffer.alloc(64, 1));
    const v = await dr.validateRestoredDb(dbPath, null, {
      databaseFactory: makeFakeDatabaseFactory({
        integrityRows: [
          { integrity_check: "page 3 corrupt" },
          { integrity_check: "page 5 corrupt" },
          { integrity_check: "page 7 corrupt" },
        ],
        rowCount: 0,
      }),
    });
    expect(v.ok).toBe(false);
    expect(v.integrity).toBe("page 3 corrupt");
    const extrasErr = v.errors.filter((e: string) => e.includes("page 5 corrupt") && e.includes("page 7 corrupt"));
    expect(extrasErr.length).toBe(1);
  });
  it("H7 — quick_check fails but integrity is ok → quickCheck != ok, FAIL", async () => {
    const dr = await loadDrDrill();
    const dbPath = join(SCRATCH, "db.bin");
    writeFileSync(dbPath, Buffer.alloc(64, 1));
    const v = await dr.validateRestoredDb(dbPath, null, {
      databaseFactory: makeFakeDatabaseFactory({
        integrityRows: [{ integrity_check: "ok" }],
        quickCheckRows: [{ quick_check: "btree problem" }],
        rowCount: 0,
      }),
    });
    expect(v.ok).toBe(false);
    expect(v.integrity).toBe("ok");
    expect(v.quickCheck).toBe("btree problem");
  });
  it("H8 — missing db path → FAIL with specific error", async () => {
    const dr = await loadDrDrill();
    const v = await dr.validateRestoredDb(join(SCRATCH, "absent.db"), 0, {
      databaseFactory: makeFakeDatabaseFactory({}),
    });
    expect(v.ok).toBe(false);
    expect(v.errors[0]).toContain("db missing");
  });
  it("H9 — zero-byte db → FAIL", async () => {
    const dr = await loadDrDrill();
    const dbPath = join(SCRATCH, "empty.db");
    writeFileSync(dbPath, "");
    const v = await dr.validateRestoredDb(dbPath, 0, {
      databaseFactory: makeFakeDatabaseFactory({}),
    });
    expect(v.ok).toBe(false);
    const zeroErr = v.errors.filter((e: string) => e.includes("zero-bytes"));
    expect(zeroErr.length).toBe(1);
  });
  it("H10 — sqlite module load fails → FAIL with specific error", async () => {
    const dr = await loadDrDrill();
    const dbPath = join(SCRATCH, "db.bin");
    writeFileSync(dbPath, Buffer.alloc(8, 0));
    const v = await dr.validateRestoredDb(dbPath, 0, {
      sqliteModule: join(SCRATCH, "no-such-module.js"),
    });
    expect(v.ok).toBe(false);
    const loadErr = v.errors.filter((e: string) => e.includes("sqlite module load failed"));
    expect(loadErr.length).toBe(1);
  });
  it("H11 — busy_timeout pragma is set with BUSY_TIMEOUT_MS", async () => {
    const dr = await loadDrDrill();
    const dbPath = join(SCRATCH, "db.bin");
    writeFileSync(dbPath, Buffer.alloc(8, 0));
    const fakeHooks: FakeDbHooks = { rowCount: 0 };
    await dr.validateRestoredDb(dbPath, null, {
      databaseFactory: makeFakeDatabaseFactory(fakeHooks),
    });
    const btCalls = fakeHooks.pragmaCalls!.filter((s) => s === `busy_timeout = ${dr.BUSY_TIMEOUT_MS}`);
    expect(btCalls.length).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// I. appendLedger
// ═════════════════════════════════════════════════════════════════════════
describe("I. appendLedger", () => {
  it("I1 — creates parent dir and writes one JSONL line", async () => {
    const dr = await loadDrDrill();
    const lp = join(SCRATCH, "nested", "drilledger.jsonl");
    dr.appendLedger(lp, { x: 1, y: "two" });
    const lines = readFileSync(lp, "utf8").trim().split("\n");
    expect(lines.length).toBe(1);
    expect(JSON.parse(lines[0])).toEqual({ x: 1, y: "two" });
  });
  it("I2 — appends successive lines, preserving prior content", async () => {
    const dr = await loadDrDrill();
    const lp = join(SCRATCH, "ledger.jsonl");
    dr.appendLedger(lp, { i: 1 });
    dr.appendLedger(lp, { i: 2 });
    dr.appendLedger(lp, { i: 3 });
    const lines = readFileSync(lp, "utf8").trim().split("\n");
    expect(lines.length).toBe(3);
    expect(JSON.parse(lines[0])).toEqual({ i: 1 });
    expect(JSON.parse(lines[1])).toEqual({ i: 2 });
    expect(JSON.parse(lines[2])).toEqual({ i: 3 });
  });
  it("I3 — hook.appendFn overrides on-disk write", async () => {
    const dr = await loadDrDrill();
    const captured: any[] = [];
    dr.appendLedger("ignored", { x: 1 }, {
      appendFn: (p: string, line: string) => captured.push({ p, line }),
    });
    expect(captured.length).toBe(1);
    expect(captured[0].line).toBe('{"x":1}\n');
  });
});

// ═════════════════════════════════════════════════════════════════════════
// J. drDrill orchestrator — every failure category + PASS
// ═════════════════════════════════════════════════════════════════════════
describe("J. drDrill orchestrator", () => {
  it("J1 — NOW_INVALID when --now isn't parseable", async () => {
    const dr = await loadDrDrill();
    const captured: any[] = [];
    const r = await dr.drDrill(
      { repo: SCRATCH, backup: SCRATCH, restoreDir: join(SCRATCH, "restore"), now: "notadate" },
      { appendFn: (_: string, line: string) => captured.push(JSON.parse(line)) },
    );
    expect(r.ok).toBe(false);
    expect(r.failureCategory).toBe(dr.FAILURE_CATEGORIES.NOW_INVALID);
    expect(captured.length).toBe(1);
    expect(captured[0].failureCategory).toBe("now-invalid");
    expect(captured[0].errors[0]).toContain("invalid --now");
  });
  it("J2 — RESTORE refusal when --restore-dir is a reserved root", async () => {
    const dr = await loadDrDrill();
    const captured: any[] = [];
    const r = await dr.drDrill(
      { repo: SCRATCH, backup: scratchSubdir("backup"), restoreDir: "C:\\Windows\\System32" },
      { appendFn: (_: string, line: string) => captured.push(JSON.parse(line)) },
    );
    expect(r.ok).toBe(false);
    expect(r.failureCategory).toBe(dr.FAILURE_CATEGORIES.RESTORE);
    expect(r.errors[0]).toContain("--restore-dir refused");
    expect(captured.length).toBe(1);
  });
  it("J3 — NO_SNAPSHOT when backup root is empty", async () => {
    const dr = await loadDrDrill();
    const backup = scratchSubdir("backup-empty");
    const captured: any[] = [];
    const r = await dr.drDrill(
      { repo: SCRATCH, backup, restoreDir: join(SCRATCH, "restore") },
      { appendFn: (_: string, line: string) => captured.push(JSON.parse(line)) },
    );
    expect(r.ok).toBe(false);
    expect(r.failureCategory).toBe(dr.FAILURE_CATEGORIES.NO_SNAPSHOT);
    expect(captured[0].failureCategory).toBe("no-snapshot");
  });
  it("J4 — NO_SNAPSHOT when explicit --snapshot path is absent", async () => {
    const dr = await loadDrDrill();
    const captured: any[] = [];
    const r = await dr.drDrill(
      {
        repo: SCRATCH, backup: scratchSubdir("backup"),
        restoreDir: join(SCRATCH, "restore"), snapshot: join(SCRATCH, "no-such-snap"),
      },
      { appendFn: (_: string, line: string) => captured.push(JSON.parse(line)) },
    );
    expect(r.failureCategory).toBe(dr.FAILURE_CATEGORIES.NO_SNAPSHOT);
    expect(captured[0].errors[0]).toContain("--snapshot does not exist");
  });
  it("J5 — MANIFEST when manifest.json is malformed", async () => {
    const dr = await loadDrDrill();
    const backup = scratchSubdir("backup");
    makeSnapshotDir(backup, SAFE_ISO, { manifest: "bad-json" });
    const captured: any[] = [];
    const r = await dr.drDrill(
      { repo: SCRATCH, backup, restoreDir: join(SCRATCH, "restore") },
      { appendFn: (_: string, line: string) => captured.push(JSON.parse(line)) },
    );
    expect(r.failureCategory).toBe(dr.FAILURE_CATEGORIES.MANIFEST);
    expect(captured[0].errors[0]).toContain("bad JSON");
  });
  it("J6 — MANIFEST when manifest.json missing", async () => {
    const dr = await loadDrDrill();
    const backup = scratchSubdir("backup");
    makeSnapshotDir(backup, SAFE_ISO, { manifest: "missing" });
    const captured: any[] = [];
    const r = await dr.drDrill(
      { repo: SCRATCH, backup, restoreDir: join(SCRATCH, "restore") },
      { appendFn: (_: string, line: string) => captured.push(JSON.parse(line)) },
    );
    expect(r.failureCategory).toBe(dr.FAILURE_CATEGORIES.MANIFEST);
    expect(captured[0].errors[0]).toContain("missing");
  });
  it("J7 — MANIFEST when dump.rows is non-finite", async () => {
    const dr = await loadDrDrill();
    const backup = scratchSubdir("backup");
    // dump.rows = "seven" (string, non-finite) — JSON can't carry NaN literal
    makeSnapshotDir(backup, SAFE_ISO, { badRows: "seven" });
    const captured: any[] = [];
    const r = await dr.drDrill(
      { repo: SCRATCH, backup, restoreDir: join(SCRATCH, "restore") },
      { appendFn: (_: string, line: string) => captured.push(JSON.parse(line)) },
    );
    expect(r.failureCategory).toBe(dr.FAILURE_CATEGORIES.MANIFEST);
    expect(captured[0].errors[0]).toContain("not a finite count");
  });
  it("J8 — RESTORE when coordination.db file missing from snapshot dir", async () => {
    const dr = await loadDrDrill();
    const backup = scratchSubdir("backup");
    const snap = makeSnapshotDir(backup, SAFE_ISO, { withDb: false });
    expect(existsSync(join(snap, "manifest.json"))).toBe(true);
    expect(existsSync(join(snap, "coordination.db"))).toBe(false);
    const captured: any[] = [];
    const r = await dr.drDrill(
      { repo: SCRATCH, backup, restoreDir: join(SCRATCH, "restore") },
      { appendFn: (_: string, line: string) => captured.push(JSON.parse(line)) },
    );
    expect(r.failureCategory).toBe(dr.FAILURE_CATEGORIES.RESTORE);
    const dbErr = r.errors.filter((e: string) => e.includes("coordination.db"));
    expect(dbErr.length).toBe(1);
  });
  it("J9 — DB_INTEGRITY when restored db's integrity_check is not 'ok'", async () => {
    const dr = await loadDrDrill();
    const backup = scratchSubdir("backup");
    makeSnapshotDir(backup, SAFE_ISO, { dumpRows: 0 });
    const captured: any[] = [];
    const r = await dr.drDrill(
      { repo: SCRATCH, backup, restoreDir: join(SCRATCH, "restore") },
      {
        appendFn: (_: string, line: string) => captured.push(JSON.parse(line)),
        databaseFactory: makeFakeDatabaseFactory({
          integrityRows: [{ integrity_check: "corrupt page 7" }],
          rowCount: 0,
        }),
      },
    );
    expect(r.failureCategory).toBe(dr.FAILURE_CATEGORIES.DB_INTEGRITY);
    expect(captured[0].failureCategory).toBe("db-integrity");
    expect(captured[0].integrity).toBe("corrupt page 7");
    // Narrow this to the integrity-failure path specifically: a future bug
    // that lets validation.ok=false slip through with integrity="ok" would
    // hit the defensive DB_INTEGRITY fallback (dr-drill.mjs lines ~718-723)
    // and silently pass THIS test. Pinning the other dimensions prevents
    // that masking. (dumpRows=0 + rowCount=0 → parity="ok"; quickCheck stays
    // healthy by default.)
    expect(captured[0].quickCheck).toBe("ok");
    expect(captured[0].parity).toBe("ok");
  });
  it("J10 — DB_QUICK_CHECK when integrity ok but quick_check fails", async () => {
    const dr = await loadDrDrill();
    const backup = scratchSubdir("backup");
    makeSnapshotDir(backup, SAFE_ISO, { dumpRows: 0 });
    const captured: any[] = [];
    const r = await dr.drDrill(
      { repo: SCRATCH, backup, restoreDir: join(SCRATCH, "restore") },
      {
        appendFn: (_: string, line: string) => captured.push(JSON.parse(line)),
        databaseFactory: makeFakeDatabaseFactory({
          quickCheckRows: [{ quick_check: "btree drift" }],
          rowCount: 0,
        }),
      },
    );
    expect(r.failureCategory).toBe(dr.FAILURE_CATEGORIES.DB_QUICK_CHECK);
    expect(captured[0].failureCategory).toBe("db-quick-check");
    expect(captured[0].quickCheck).toBe("btree drift");
  });
  it("J11 — PARITY_TABLE_MISSING when manifest expected rows but table is missing", async () => {
    const dr = await loadDrDrill();
    const backup = scratchSubdir("backup");
    makeSnapshotDir(backup, SAFE_ISO, { dumpRows: 99 });
    const captured: any[] = [];
    const r = await dr.drDrill(
      { repo: SCRATCH, backup, restoreDir: join(SCRATCH, "restore") },
      {
        appendFn: (_: string, line: string) => captured.push(JSON.parse(line)),
        databaseFactory: makeFakeDatabaseFactory({ rowCount: null }),
      },
    );
    expect(r.failureCategory).toBe(dr.FAILURE_CATEGORIES.PARITY_TABLE_MISSING);
    expect(captured[0].failureCategory).toBe("parity-table-missing");
  });
  it("J12 — ROW_PARITY when row count diverges from manifest", async () => {
    const dr = await loadDrDrill();
    const backup = scratchSubdir("backup");
    makeSnapshotDir(backup, SAFE_ISO, { dumpRows: 50 });
    const captured: any[] = [];
    const r = await dr.drDrill(
      { repo: SCRATCH, backup, restoreDir: join(SCRATCH, "restore") },
      {
        appendFn: (_: string, line: string) => captured.push(JSON.parse(line)),
        databaseFactory: makeFakeDatabaseFactory({ rowCount: 49 }),
      },
    );
    expect(r.failureCategory).toBe(dr.FAILURE_CATEGORIES.ROW_PARITY);
    expect(captured[0].rowCount).toBe(49);
    expect(captured[0].expectedRows).toBe(50);
    expect(captured[0].parity).toBe("mismatch");
  });
  it("J13 — happy-path PASS writes ok:true ledger row", async () => {
    const dr = await loadDrDrill();
    const backup = scratchSubdir("backup");
    makeSnapshotDir(backup, SAFE_ISO, {
      withOwnedPaths: true, withCronRegistry: true, dumpRows: 7,
    });
    const captured: any[] = [];
    const r = await dr.drDrill(
      {
        repo: SCRATCH, backup,
        restoreDir: join(SCRATCH, "restore"),
        now: "2026-05-14T18:00:00.000Z",
      },
      {
        appendFn: (_: string, line: string) => captured.push(JSON.parse(line)),
        databaseFactory: makeFakeDatabaseFactory({ rowCount: 7 }),
      },
    );
    expect(r.ok).toBe(true);
    expect(r.failureCategory).toBe(null);
    expect(captured.length).toBe(1);
    expect(captured[0].ok).toBe(true);
    expect(captured[0].failureCategory).toBe(null);
    expect(captured[0].integrity).toBe("ok");
    expect(captured[0].quickCheck).toBe("ok");
    expect(captured[0].parity).toBe("ok");
    expect(captured[0].rowCount).toBe(7);
    expect(captured[0].expectedRows).toBe(7);
    expect(captured[0].drilledAt).toBe("2026-05-14T18:00:00.000Z");
    expect(captured[0].snapshotName).toBe(SAFE_ISO);
    expect(captured[0].snapshotGeneratedAt).toBe(ISO_AS_GENERATED_AT);
  });
  it("J14 — dry-run skips ledger write by default (no on-disk file)", async () => {
    const dr = await loadDrDrill();
    const backup = scratchSubdir("backup");
    makeSnapshotDir(backup, SAFE_ISO, { dumpRows: 0 });
    const r = await dr.drDrill(
      {
        repo: SCRATCH, backup, restoreDir: join(SCRATCH, "restore"),
        dryRun: true,
      },
      {
        // no appendFn → default-disabled write path
        databaseFactory: makeFakeDatabaseFactory({ rowCount: 0 }),
      },
    );
    expect(r.ok).toBe(true);
    expect(r.dryRun).toBe(true);
    // On-disk ledger must not exist (dry-run + no appendFn = no write).
    const ledger = join(SCRATCH, "state", "shared", "DR_DRILL_LEDGER.jsonl");
    expect(existsSync(ledger)).toBe(false);
  });
  it("J15 — dry-run with hooks.appendFn DOES write a captured entry (test mode)", async () => {
    const dr = await loadDrDrill();
    const backup = scratchSubdir("backup");
    makeSnapshotDir(backup, SAFE_ISO, { dumpRows: 0 });
    const captured: any[] = [];
    await dr.drDrill(
      {
        repo: SCRATCH, backup, restoreDir: join(SCRATCH, "restore"),
        dryRun: true,
      },
      {
        appendFn: (_: string, line: string) => captured.push(JSON.parse(line)),
        databaseFactory: makeFakeDatabaseFactory({ rowCount: 0 }),
      },
    );
    expect(captured.length).toBe(1);
    expect(captured[0].dryRun).toBe(true);
  });
  it("J16 — manifest.copied[] cross-check surfaces missing-but-claimed files as warnings", async () => {
    const dr = await loadDrDrill();
    const backup = scratchSubdir("backup");
    // The manifest claims `state/shared/ghost-file.json` was copied, but we
    // don't write a `ghost-file.json` into the snapshot dir.
    //
    // SUT design choice (lines ~685-692 of dr-drill.mjs): the cross-check
    // is OBSERVABILITY, not a gate. The PASS branch sets `result.ok=true`
    // without re-checking `result.errors.length`, so a non-empty errors[]
    // coexists with `ok:true`. Validation-stage errors set failureCategory
    // and short-circuit; cross-check warnings only show up in the ledger
    // row for forensic value.
    makeSnapshotDir(backup, SAFE_ISO, {
      dumpRows: 3,
      manifestExtraCopied: ["state/shared/ghost-file.json"],
    });
    const captured: any[] = [];
    const r = await dr.drDrill(
      { repo: SCRATCH, backup, restoreDir: join(SCRATCH, "restore") },
      {
        appendFn: (_: string, line: string) => captured.push(JSON.parse(line)),
        databaseFactory: makeFakeDatabaseFactory({ rowCount: 3 }),
      },
    );
    expect(r.ok).toBe(true); // cross-check is observability, doesn't FAIL the drill
    expect(r.failureCategory).toBe(null);
    const ghostWarn = captured[0].errors.filter((e: string) => e.includes("ghost-file.json"));
    expect(ghostWarn.length).toBe(1);
  });
  it("J17 — LEDGER_ERROR_CAP truncates a very long errors[] in the ledger row", async () => {
    const dr = await loadDrDrill();
    const backup = scratchSubdir("backup");
    // Manifest claims `OVERFLOW` phantom copied[] entries beyond LEDGER_ERROR_CAP
    // → cross-check produces (CAP + OVERFLOW) warnings. The 10-overflow choice
    // is intentional: large enough that the truncation marker text exposes
    // a non-trivial "N more" delta, small enough to keep the test fast.
    const OVERFLOW = 10;
    const phantomCount = dr.LEDGER_ERROR_CAP + OVERFLOW;
    const phantoms = Array.from(
      { length: phantomCount },
      (_, i) => `state/shared/phantom-${i}.json`,
    );
    makeSnapshotDir(backup, SAFE_ISO, {
      dumpRows: 0,
      manifestExtraCopied: phantoms,
    });
    const captured: any[] = [];
    await dr.drDrill(
      { repo: SCRATCH, backup, restoreDir: join(SCRATCH, "restore-cap") },
      {
        appendFn: (_: string, line: string) => captured.push(JSON.parse(line)),
        databaseFactory: makeFakeDatabaseFactory({ rowCount: 0 }),
      },
    );
    expect(captured.length).toBe(1);
    // phantomCount warnings → cap to LEDGER_ERROR_CAP + 1 truncation marker
    expect(captured[0].errors.length).toBe(dr.LEDGER_ERROR_CAP + 1);
    const truncMarker = captured[0].errors.filter((e: string) => e.includes("truncated"));
    expect(truncMarker.length).toBe(1);
    expect(truncMarker[0]).toContain(`${OVERFLOW} more`);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// K. CLI subprocess smoke test (entry guard + --help exit code)
// ═════════════════════════════════════════════════════════════════════════
describe("K. CLI subprocess", () => {
  it("K1 — --help exits 0 and prints usage", async () => {
    const cp = await import("node:child_process");
    const r = cp.spawnSync(process.execPath, [DR_DRILL_PATH, "--help"], {
      encoding: "utf8",
      timeout: 10_000,
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("dr-drill.mjs");
    expect(r.stdout).toContain("--dry-run");
    expect(r.stdout).toContain("--snapshot");
  });
  it("K2 — no snapshots → exit 1, JSON mode prints failureCategory", async () => {
    const cp = await import("node:child_process");
    const emptyBackup = scratchSubdir("backup-empty");
    const r = cp.spawnSync(process.execPath, [
      DR_DRILL_PATH,
      "--backup", emptyBackup,
      "--restore-dir", join(SCRATCH, "restore"),
      "--ledger", join(SCRATCH, "ledger.jsonl"),
      "--json",
    ], { encoding: "utf8", timeout: 10_000 });
    expect(r.status).toBe(1);
    const lastLine = r.stdout.trim().split("\n").pop()!;
    const parsed = JSON.parse(lastLine);
    expect(parsed.ok).toBe(false);
    expect(parsed.failureCategory).toBe("no-snapshot");
    // Guard against a regression where the orchestrator throws instead of
    // returning {ok:false}: the SUT's entry-guard fatal path also exits 1
    // and would silently pass the assertions above. Gate on stderr being
    // clean of the "dr-drill: fatal:" prefix to catch that.
    expect(r.stderr).not.toContain("dr-drill: fatal:");
  });
});

// ═════════════════════════════════════════════════════════════════════════
// L. Public exports / sanity
// ═════════════════════════════════════════════════════════════════════════
describe("L. exports / surface", () => {
  it("L1 — SCHEMA_VERSION is a positive integer", async () => {
    const dr = await loadDrDrill();
    expect(Number.isInteger(dr.SCHEMA_VERSION)).toBe(true);
    expect(dr.SCHEMA_VERSION).toBe(1);
  });
  it("L2 — REQUIRED_RESTORE_FILES include coordination.db and manifest.json", async () => {
    const dr = await loadDrDrill();
    expect(dr.REQUIRED_RESTORE_FILES).toContain("coordination.db");
    expect(dr.REQUIRED_RESTORE_FILES).toContain("manifest.json");
    expect(dr.REQUIRED_RESTORE_FILES.length).toBe(2);
  });
  it("L3 — RESERVED_RESTORE_ROOTS forbid known system paths", async () => {
    const dr = await loadDrDrill();
    expect(dr.RESERVED_RESTORE_ROOTS).toContain("C:\\Windows");
    expect(dr.RESERVED_RESTORE_ROOTS).toContain("/usr");
    expect(dr.RESERVED_RESTORE_ROOTS).toContain("/etc");
  });
  it("L4 — FAILURE_CATEGORIES enum is frozen and exhaustive", async () => {
    const dr = await loadDrDrill();
    expect(Object.isFrozen(dr.FAILURE_CATEGORIES)).toBe(true);
    const values = Object.values(dr.FAILURE_CATEGORIES);
    expect(values).toContain("now-invalid");
    expect(values).toContain("no-snapshot");
    expect(values).toContain("manifest");
    expect(values).toContain("restore");
    expect(values).toContain("db-integrity");
    expect(values).toContain("db-quick-check");
    expect(values).toContain("parity-table-missing");
    expect(values).toContain("row-parity");
    expect(values.length).toBe(8);
  });
  it("L5 — DUMP_TABLE matches G12's table name", async () => {
    const dr = await loadDrDrill();
    expect(dr.DUMP_TABLE).toBe("bug_attribution");
  });
  it("L6 — DEFAULT_BACKUP and DEFAULT_RESTORE_DIR are H: paths", async () => {
    const dr = await loadDrDrill();
    expect(dr.DEFAULT_BACKUP.startsWith("H:/")).toBe(true);
    expect(dr.DEFAULT_RESTORE_DIR.startsWith("H:/")).toBe(true);
  });
  it("L7 — LEDGER_ERROR_CAP is a positive integer", async () => {
    const dr = await loadDrDrill();
    expect(Number.isInteger(dr.LEDGER_ERROR_CAP)).toBe(true);
    expect(dr.LEDGER_ERROR_CAP).toBeGreaterThan(0);
  });
  it("L8 — BUSY_TIMEOUT_MS is a positive integer ms", async () => {
    const dr = await loadDrDrill();
    expect(Number.isInteger(dr.BUSY_TIMEOUT_MS)).toBe(true);
    expect(dr.BUSY_TIMEOUT_MS).toBeGreaterThan(0);
  });
});
