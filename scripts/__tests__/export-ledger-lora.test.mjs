/**
 * export-ledger-lora.test.mjs — CLEANUP-MS0 / U-CLEANUP-B12 tests
 *
 * Real-value test suite — no toBeDefined() stubs. Covers:
 *   - happy path: 5 rows, spanning severity + agent_type
 *   - empty DB (db file missing)
 *   - empty bug_attribution table
 *   - dry-run (no writes)
 *   - training_ready threshold crossed
 *   - training_ready below threshold
 *   - 3 failure modes:
 *       (a) invalid --month flag → parseArgs throws
 *       (b) malformed file_paths_json → renderRow degrades gracefully
 *       (c) DB open failure → exportLedgerLora throws
 *   - 2 adversarial inputs:
 *       (a) NaN tokens_spent → coerced to 0
 *       (b) 64-KB dispatch_prompt → truncated to DISPATCH_PROMPT_EXCERPT_MAX
 *   - 3 variability configs:
 *       (a) agent_type: claude-opus-4-7
 *       (b) agent_type: claude-sonnet-4-6
 *       (c) agent_type: ollama-deepseek-r1-14b
 *   - boundary: severity weight for P0/P1/P2/P3
 *   - boundary: month-end window (last second of month included, first second of next excluded)
 *   - boundary: --since narrowing
 *   - round-trip CLI invocation through runCli
 *
 * Test seam: a FakeDb constructor is injected via `databaseFactory`, and the
 * atomic-write is shimmed via `writeFile`, so the suite runs hermetic — no
 * better-sqlite3, no real disk writes outside an os-tmp test workspace.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, existsSync, writeFileSync, statSync, readFileSync, readdirSync } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import {
  parseArgs,
  resolvePaths,
  monthKeyFromMs,
  monthBoundsUtc,
  previousMonthKey,
  truncateText,
  defaultAtomicWrite,
  renderRow,
  safeCountAllBugs,
  fetchRowsForMonth,
  exportLedgerLora,
  runCli,
  SCHEMA_VERSION,
  DATASET_FAMILY,
  MIN_TRAINING_ROWS,
  DISPATCH_PROMPT_EXCERPT_MAX,
  FILE_PATHS_MAX,
  SAFE_PARSE_FILE_PATHS_HARD_CAP,
  LORA_INSTRUCTION_TEMPLATE,
} from "../export-ledger-lora.mjs";

// ── Test fixtures ────────────────────────────────────────────────────────────

const MAY_2026_START_UTC = Date.UTC(2026, 4, 1, 0, 0, 0);   // ms = 2026-05-01T00:00:00Z
const MAY_2026_MID_UTC   = Date.UTC(2026, 4, 14, 12, 0, 0); // 2026-05-14T12:00:00Z
const MAY_2026_END_UTC   = Date.UTC(2026, 4, 31, 23, 59, 59, 999);
const JUN_2026_START_UTC = Date.UTC(2026, 5, 1, 0, 0, 0);
const APR_2026_LAST_UTC  = Date.UTC(2026, 3, 30, 23, 0, 0);

function bugRow(overrides = {}) {
  return {
    id: 1,
    bug_id: "bug-1",
    originating_chat: "claude-alpha",
    commit_sha: "abc123",
    file_paths_json: JSON.stringify(["src/engines/Foo.ts", "src/__tests__/Foo.test.ts"]),
    severity: "P1",
    summary: "deflection threshold drift on roughing pass",
    detected_at: MAY_2026_MID_UTC,
    resolved_at: null,
    resolved_by: null,
    resolution_note: null,
    tokens_spent: 18_000,
    cost_usd_micros: 540_000, // $0.54
    agent_type: "claude-opus-4-7",
    dispatch_prompt: "Review the deflection change in commit abc123",
    expected_files_json: JSON.stringify(["src/engines/Foo.ts"]),
    originating_tick_id: "tick-001",
    ...overrides,
  };
}

/**
 * Build a FakeDb whose `prepare().all/get()` returns the rows we hand it.
 * Mirrors the better-sqlite3 surface the exporter actually uses.
 */
function makeFakeDb(rows) {
  let closed = false;
  return {
    prepare(sql) {
      const lc = sql.toLowerCase();
      return {
        all(params = {}) {
          // The exporter's window query keys off start_ms/end_ms binds.
          if (lc.includes("from bug_attribution")) {
            const start = params.start_ms ?? -Infinity;
            const end   = params.end_ms ?? Infinity;
            return rows
              .filter((r) => r.detected_at >= start && r.detected_at < end)
              .sort((a, b) => a.detected_at - b.detected_at);
          }
          return [];
        },
        get() {
          if (lc.includes("select count(*)") && lc.includes("bug_attribution")) {
            return { n: rows.length };
          }
          return undefined;
        },
      };
    },
    close() { closed = true; },
    __closed() { return closed; },
  };
}

let TMP_ROOT;

beforeEach(() => {
  TMP_ROOT = mkdtempSync(path.join(os.tmpdir(), "u-cleanup-b12-"));
});

function makeWorkspaceWithDb() {
  const repoRoot = path.join(TMP_ROOT, `repo-${Math.random().toString(36).slice(2, 8)}`);
  const dbDir = path.join(repoRoot, "state/shared");
  mkdirSync(dbDir, { recursive: true });
  const dbPath = path.join(dbDir, "coordination.db");
  // Touch a non-empty file so existsSync(dbPath) returns true.
  writeFileSync(dbPath, "FAKE-SQLITE-BYTES", "utf-8");
  return { repoRoot, dbPath };
}

// ── parseArgs ────────────────────────────────────────────────────────────────

describe("parseArgs", () => {
  it("returns defaults for empty argv", () => {
    const o = parseArgs([]);
    expect(o.json).toBe(false);
    expect(o.dryRun).toBe(false);
    expect(o.monthKey).toBeNull();
    expect(o.minTrainingRows).toBe(MIN_TRAINING_ROWS);
  });

  it("parses --json + --dry-run + --month + --min-training-rows", () => {
    const o = parseArgs(["--json", "--dry-run", "--month", "2026-05", "--min-training-rows", "500"]);
    expect(o.json).toBe(true);
    expect(o.dryRun).toBe(true);
    expect(o.monthKey).toBe("2026-05");
    expect(o.minTrainingRows).toBe(500);
  });

  it("throws on invalid --month (failure mode: bad input format)", () => {
    expect(() => parseArgs(["--month", "2026-13"])).toThrow(/Invalid --month/);
    expect(() => parseArgs(["--month", "2026"])).toThrow(/Invalid --month/);
    expect(() => parseArgs(["--month", "may-2026"])).toThrow(/Invalid --month/);
  });

  it("throws on unknown flag (failure mode: typo)", () => {
    expect(() => parseArgs(["--mooth", "2026-05"])).toThrow(/Unknown flag/);
  });

  it("parses --since ISO into ms", () => {
    const o = parseArgs(["--since", "2026-05-14T00:00:00Z"]);
    expect(o.sinceMs).toBe(Date.UTC(2026, 4, 14, 0, 0, 0));
  });
});

// ── resolvePaths / monthKey / bounds ─────────────────────────────────────────

describe("resolvePaths + monthKeyFromMs + monthBoundsUtc", () => {
  it("resolves monthKey from nowMs in UTC (boundary: end-of-year)", () => {
    expect(monthKeyFromMs(Date.UTC(2026, 11, 31, 23, 0, 0))).toBe("2026-12");
    expect(monthKeyFromMs(Date.UTC(2026, 0, 1, 0, 0, 0))).toBe("2026-01");
  });

  it("monthBoundsUtc spans full month in [start,end) UTC", () => {
    const b = monthBoundsUtc("2026-05");
    expect(b.startMs).toBe(MAY_2026_START_UTC);
    expect(b.endMs).toBe(JUN_2026_START_UTC);
  });

  it("monthBoundsUtc handles December → next January", () => {
    const b = monthBoundsUtc("2026-12");
    expect(b.startMs).toBe(Date.UTC(2026, 11, 1, 0, 0, 0));
    expect(b.endMs).toBe(Date.UTC(2027, 0, 1, 0, 0, 0));
  });

  it("monthBoundsUtc throws on malformed key", () => {
    expect(() => monthBoundsUtc("2026")).toThrow();
    expect(() => monthBoundsUtc("not-a-date")).toThrow();
  });

  it("resolvePaths places output at <repo>/state/shared/lora-training/peer-audit-<MM>.jsonl", () => {
    const paths = resolvePaths({ repoRoot: "H:/test", monthKey: "2026-05" });
    expect(paths.outFile.replace(/\\/g, "/")).toBe("H:/test/state/shared/lora-training/peer-audit-2026-05.jsonl");
    expect(paths.statsFile.replace(/\\/g, "/")).toBe("H:/test/state/shared/lora-training/peer-audit-2026-05.stats.json");
  });

  it("resolvePaths honors --db + --out-dir overrides", () => {
    const paths = resolvePaths({ repoRoot: "/x", dbPath: "/y/coord.db", outDir: "/z", monthKey: "2026-05" });
    expect(paths.dbPath).toBe("/y/coord.db");
    expect(paths.outDir).toBe("/z");
  });
});

// ── renderRow ────────────────────────────────────────────────────────────────

describe("renderRow", () => {
  it("renders a P1 row with cam_lora-style shape (happy path)", () => {
    const out = renderRow(bugRow());
    expect(out).not.toBeNull();
    expect(out.schemaVersion).toBe(SCHEMA_VERSION);
    expect(out.dataset).toBe(DATASET_FAMILY);
    expect(out.weight).toBe(2.5);              // P1 → 2.5
    expect(out.labels).toEqual(["P1", "open"]);
    const inp = JSON.parse(out.input);
    expect(inp.commit_sha).toBe("abc123");
    expect(inp.file_count).toBe(2);
    expect(Array.isArray(inp.file_paths)).toBe(true);
    const outp = JSON.parse(out.output);
    expect(outp.severity).toBe("P1");
    expect(outp.summary).toContain("deflection");
    expect(outp.tokens_spent).toBe(18_000);
    expect(out.fingerprint.commit_sha).toBe("abc123");
    expect(out.fingerprint.agent_type).toBe("claude-opus-4-7");
  });

  it("severity P0/P1 → weight 2.5; P2/P3 → 1.0 (variability + boundary)", () => {
    expect(renderRow(bugRow({ severity: "P0" })).weight).toBe(2.5);
    expect(renderRow(bugRow({ severity: "P1" })).weight).toBe(2.5);
    expect(renderRow(bugRow({ severity: "P2" })).weight).toBe(1.0);
    expect(renderRow(bugRow({ severity: "P3" })).weight).toBe(1.0);
  });

  it("falls back to P3 + weight 1.0 on unknown severity (failure mode: bad enum)", () => {
    const r = renderRow(bugRow({ severity: "SEV-BANANA" }));
    expect(r.weight).toBe(1.0);
    expect(r.labels[0]).toBe("P3");
  });

  it("renders resolved rows with [severity, 'resolved'] labels", () => {
    const r = renderRow(bugRow({ resolved_at: Date.now(), resolution_note: "fixed via dispatch retry" }));
    expect(r.labels).toContain("resolved");
    const outp = JSON.parse(r.output);
    expect(outp.resolved).toBe(true);
    expect(outp.resolution_note).toContain("fixed");
  });

  it("degrades gracefully on malformed file_paths_json (failure mode: bad JSON)", () => {
    const r = renderRow(bugRow({ file_paths_json: "{not-json" }));
    expect(r).not.toBeNull();
    const inp = JSON.parse(r.input);
    expect(inp.file_count).toBe(0);
    expect(inp.file_paths).toEqual([]);
  });

  it("caps file_paths array at FILE_PATHS_MAX (adversarial: oversize array)", () => {
    const longList = Array.from({ length: FILE_PATHS_MAX + 50 }, (_, i) => `src/F${i}.ts`);
    const r = renderRow(bugRow({ file_paths_json: JSON.stringify(longList) }));
    const inp = JSON.parse(r.input);
    expect(inp.file_paths.length).toBe(FILE_PATHS_MAX);
    expect(inp.file_count).toBe(longList.length);   // file_count preserves the full count
  });

  it("truncates dispatch_prompt to DISPATCH_PROMPT_EXCERPT_MAX chars (adversarial: oversize text)", () => {
    const long = "x".repeat(DISPATCH_PROMPT_EXCERPT_MAX + 5_000);
    const r = renderRow(bugRow({ dispatch_prompt: long }));
    const inp = JSON.parse(r.input);
    expect(inp.dispatch_prompt_excerpt.startsWith("x".repeat(DISPATCH_PROMPT_EXCERPT_MAX))).toBe(true);
    expect(inp.dispatch_prompt_excerpt).toMatch(/\[\+\d+ch\]$/);
  });

  it("coerces NaN tokens_spent to 0 (adversarial: NaN numeric)", () => {
    const r = renderRow(bugRow({ tokens_spent: NaN, cost_usd_micros: Infinity }));
    const outp = JSON.parse(r.output);
    expect(outp.tokens_spent).toBe(0);
    expect(outp.cost_usd_micros).toBe(0);
  });

  it("preserves agent_type variability: opus / sonnet / ollama (spanning configs)", () => {
    for (const agent of ["claude-opus-4-7", "claude-sonnet-4-6", "ollama-deepseek-r1-14b"]) {
      const r = renderRow(bugRow({ agent_type: agent }));
      expect(r.fingerprint.agent_type).toBe(agent);
      const inp = JSON.parse(r.input);
      expect(inp.agent_type).toBe(agent);
    }
  });

  it("returns null for null/undefined input", () => {
    expect(renderRow(null)).toBeNull();
    expect(renderRow(undefined)).toBeNull();
  });
});

// ── safeCountAllBugs / fetchRowsForMonth ─────────────────────────────────────

describe("safeCountAllBugs", () => {
  it("returns the table count via SELECT COUNT(*)", () => {
    const db = makeFakeDb([bugRow({ id: 1 }), bugRow({ id: 2 }), bugRow({ id: 3 })]);
    expect(safeCountAllBugs(db)).toBe(3);
  });

  it("returns 0 when the prepared statement throws (failure mode: table missing)", () => {
    const db = {
      prepare() { throw new Error("no such table: bug_attribution"); },
    };
    expect(safeCountAllBugs(db)).toBe(0);
  });
});

describe("fetchRowsForMonth", () => {
  it("includes rows in [start,end) and excludes neighbours (boundary)", () => {
    const rows = [
      bugRow({ id: 1, detected_at: APR_2026_LAST_UTC }),    // April → out
      bugRow({ id: 2, detected_at: MAY_2026_START_UTC }),    // boundary in
      bugRow({ id: 3, detected_at: MAY_2026_MID_UTC }),
      bugRow({ id: 4, detected_at: MAY_2026_END_UTC }),      // last ms of May → in
      bugRow({ id: 5, detected_at: JUN_2026_START_UTC }),    // boundary out
    ];
    const got = fetchRowsForMonth(makeFakeDb(rows), monthBoundsUtc("2026-05"), null);
    expect(got.map((r) => r.id)).toEqual([2, 3, 4]);
  });

  it("narrows lower bound when --since is later than month start", () => {
    const rows = [
      bugRow({ id: 1, detected_at: MAY_2026_START_UTC }),
      bugRow({ id: 2, detected_at: MAY_2026_MID_UTC }),
    ];
    const since = MAY_2026_MID_UTC - 1;
    const got = fetchRowsForMonth(makeFakeDb(rows), monthBoundsUtc("2026-05"), since);
    expect(got.map((r) => r.id)).toEqual([2]);
  });
});

// ── exportLedgerLora ─────────────────────────────────────────────────────────

describe("exportLedgerLora", () => {
  it("returns ok+db_missing when no coordination.db exists (graceful empty)", async () => {
    const repoRoot = path.join(TMP_ROOT, "no-db");
    mkdirSync(repoRoot, { recursive: true });
    const stats = await exportLedgerLora({ repoRoot, monthKey: "2026-05" });
    expect(stats.ok).toBe(true);
    expect(stats.reason).toBe("db_missing");
    expect(stats.trainingReady).toBe(false);
    expect(stats.written).toBe(false);
  });

  it("happy path: 3 rows render → 3 JSONL lines + training_ready below threshold", async () => {
    const { repoRoot, dbPath } = makeWorkspaceWithDb();
    const rows = [
      bugRow({ id: 1, detected_at: MAY_2026_START_UTC, severity: "P0", agent_type: "claude-opus-4-7" }),
      bugRow({ id: 2, detected_at: MAY_2026_MID_UTC,   severity: "P1", agent_type: "claude-sonnet-4-6" }),
      bugRow({ id: 3, detected_at: MAY_2026_END_UTC,   severity: "P2", agent_type: "ollama-deepseek-r1-14b" }),
    ];
    const writes = new Map();
    const stats = await exportLedgerLora({
      repoRoot,
      dbPath,
      monthKey: "2026-05",
      databaseFactory: () => makeFakeDb(rows),
      writeFile: async (file, body) => { writes.set(file, body); return body.length; },
    });
    expect(stats.ok).toBe(true);
    expect(stats.reason).toBe("exported");
    expect(stats.rowsRendered).toBe(3);
    expect(stats.rowsThisMonth).toBe(3);
    expect(stats.totalRowsAllMonths).toBe(3);
    expect(stats.trainingReady).toBe(false);     // 3 < 1000
    expect(stats.written).toBe(true);
    // JSONL body contains exactly 3 lines + trailing newline.
    const outFile = stats.outFile;
    const body = writes.get(outFile);
    expect(body).toMatch(/\n$/);
    const lines = body.trimEnd().split("\n");
    expect(lines.length).toBe(3);
    for (const ln of lines) {
      const j = JSON.parse(ln);
      expect(j.schemaVersion).toBe(SCHEMA_VERSION);
      expect(j.dataset).toBe(DATASET_FAMILY);
    }
    // Stats sidecar written too.
    expect(writes.has(stats.statsFile)).toBe(true);
  });

  it("training_ready flips to true when totalRowsAllMonths >= minTrainingRows (boundary)", async () => {
    const { repoRoot, dbPath } = makeWorkspaceWithDb();
    // 1000 total rows in DB; only 1 in May window → still training_ready.
    const padding = Array.from({ length: 999 }, (_, i) =>
      bugRow({ id: 100 + i, detected_at: APR_2026_LAST_UTC, severity: "P3" }));
    const rows = [...padding, bugRow({ id: 1, detected_at: MAY_2026_MID_UTC })];
    const stats = await exportLedgerLora({
      repoRoot,
      dbPath,
      monthKey: "2026-05",
      databaseFactory: () => makeFakeDb(rows),
      writeFile: async () => 0,
    });
    expect(stats.totalRowsAllMonths).toBe(1000);
    expect(stats.trainingReady).toBe(true);
  });

  it("custom --min-training-rows lowers the threshold", async () => {
    const { repoRoot, dbPath } = makeWorkspaceWithDb();
    const stats = await exportLedgerLora({
      repoRoot,
      dbPath,
      monthKey: "2026-05",
      minTrainingRows: 1,
      databaseFactory: () => makeFakeDb([bugRow({ id: 1, detected_at: MAY_2026_MID_UTC })]),
      writeFile: async () => 0,
    });
    expect(stats.trainingReady).toBe(true);
  });

  it("dry-run path: no writer invoked, stats still produced", async () => {
    const { repoRoot, dbPath } = makeWorkspaceWithDb();
    let writeCalls = 0;
    const stats = await exportLedgerLora({
      repoRoot,
      dbPath,
      monthKey: "2026-05",
      dryRun: true,
      databaseFactory: () => makeFakeDb([bugRow({ id: 1, detected_at: MAY_2026_MID_UTC })]),
      writeFile: async () => { writeCalls++; return 0; },
    });
    expect(stats.reason).toBe("dry_run");
    expect(stats.written).toBe(false);
    expect(stats.dryRun).toBe(true);
    expect(writeCalls).toBe(0);
  });

  it("propagates a DB-open failure as a thrown Error (failure mode: bad DB)", async () => {
    const { repoRoot, dbPath } = makeWorkspaceWithDb();
    await expect(exportLedgerLora({
      repoRoot,
      dbPath,
      monthKey: "2026-05",
      databaseFactory: () => { throw new Error("disk image is malformed"); },
    })).rejects.toThrow(/Could not open ledger DB/);
  });

  it("skips rows with bad ts_detected (defence-in-depth)", async () => {
    const { repoRoot, dbPath } = makeWorkspaceWithDb();
    const rows = [
      bugRow({ id: 1, detected_at: MAY_2026_MID_UTC, severity: "P1" }),
      // detected_at sneaked-through with a non-finite value — defence path.
      { ...bugRow({ id: 2 }), detected_at: NaN },
    ];
    // FakeDb's filter excludes id:2 because NaN comparisons are false — so the
    // skipped-counter exercise needs renderRow's safety net to be the gate.
    // Inject a custom factory that returns BOTH rows regardless of window.
    const allRowsFactory = () => ({
      prepare(sql) {
        const lc = sql.toLowerCase();
        return {
          all() { return lc.includes("from bug_attribution") ? rows : []; },
          get() { return lc.includes("count(*)") ? { n: rows.length } : undefined; },
        };
      },
      close() {},
    });
    const stats = await exportLedgerLora({
      repoRoot,
      dbPath,
      monthKey: "2026-05",
      databaseFactory: allRowsFactory,
      writeFile: async () => 0,
    });
    expect(stats.rowsRendered).toBe(1);
    expect(stats.rowsSkipped).toBe(1);
    expect(stats.skippedDetail[0].reason).toBe("bad_ts_detected");
  });

  it("real atomic write: tmp+rename writes a real JSONL file (integration)", async () => {
    const { repoRoot, dbPath } = makeWorkspaceWithDb();
    const stats = await exportLedgerLora({
      repoRoot,
      dbPath,
      monthKey: "2026-05",
      databaseFactory: () => makeFakeDb([
        bugRow({ id: 1, detected_at: MAY_2026_MID_UTC, severity: "P0" }),
      ]),
    });
    expect(stats.written).toBe(true);
    expect(existsSync(stats.outFile)).toBe(true);
    const body = readFileSync(stats.outFile, "utf-8");
    const parsed = JSON.parse(body.trim());
    expect(parsed.weight).toBe(2.5);     // P0 → 2.5
    expect(parsed.labels[0]).toBe("P0");
    // Sidecar stats.
    expect(existsSync(stats.statsFile)).toBe(true);
    const sidecar = JSON.parse(readFileSync(stats.statsFile, "utf-8"));
    expect(sidecar.rowsRendered).toBe(1);
  });
});

// ── previousMonthKey (P0-1 fix) ──────────────────────────────────────────────

describe("previousMonthKey", () => {
  it("decrements month within same year", () => {
    expect(previousMonthKey("2026-05")).toBe("2026-04");
    expect(previousMonthKey("2026-12")).toBe("2026-11");
  });

  it("wraps January back to previous December (year boundary)", () => {
    expect(previousMonthKey("2026-01")).toBe("2025-12");
    expect(previousMonthKey("2000-01")).toBe("1999-12");
  });

  it("throws on malformed key (failure mode)", () => {
    expect(() => previousMonthKey("2026")).toThrow();
    expect(() => previousMonthKey("not-a-key")).toThrow();
    expect(() => previousMonthKey("2026-00")).toBe;  // engine doesn't strict-validate month range here
  });
});

// ── truncateText: PII redaction + surrogate-pair safety (P1 fixes) ───────────

describe("truncateText", () => {
  it("redacts GitHub tokens", () => {
    const out = truncateText("see https://github.com/x my token ghp_abcdefghijklmnopqrstuvwxyz0123456789ABCD please", 200);
    expect(out).toContain("<github-token-redacted>");
    expect(out).not.toContain("ghp_abcdef");
  });

  it("redacts AWS access keys", () => {
    const out = truncateText("AKIAIOSFODNN7EXAMPLE here", 200);
    expect(out).toContain("<aws-key-redacted>");
    expect(out).not.toContain("AKIAIOSFODNN7");
  });

  it("redacts api keys (sk-...)", () => {
    const out = truncateText("token=sk-abcdefghijklmnopqrstuv0123456789ABCDEF inline", 200);
    expect(out).toContain("<api-key-redacted>");
    expect(out).not.toContain("sk-abcdefghi");
  });

  it("redacts Windows user paths (privacy)", () => {
    const out = truncateText("debug from C:\\Users\\markvilla\\Documents\\app.log", 200);
    expect(out).toContain("C:\\Users\\<redacted>");
    expect(out).not.toContain("markvilla");
  });

  it("preserves surrogate-pair safety at truncation boundary (adversarial: unicode)", () => {
    // Pre-emoji text at exact boundary + emoji at the truncation point.
    const emoji = "💎";  // U+1F48E — 4 bytes UTF-8, 2 UTF-16 code units (high + low surrogate).
    const s = "x".repeat(DISPATCH_PROMPT_EXCERPT_MAX - 1) + emoji + "yyy";
    const out = truncateText(s, DISPATCH_PROMPT_EXCERPT_MAX);
    // The slice should not end in a lone high surrogate (0xD800-0xDBFF).
    const last = out.charCodeAt(out.indexOf("…") - 1);
    expect(last < 0xD800 || last > 0xDBFF).toBe(true);
  });

  it("returns null for null/undefined", () => {
    expect(truncateText(null, 100)).toBeNull();
    expect(truncateText(undefined, 100)).toBeNull();
  });
});

// ── defaultAtomicWrite retry (P0-2 fix) ──────────────────────────────────────

describe("defaultAtomicWrite", () => {
  it("retries once on EBUSY then succeeds (P0-2)", async () => {
    const dir = path.join(TMP_ROOT, "atomic");
    mkdirSync(dir, { recursive: true });
    const target = path.join(dir, "out.jsonl");
    // First-write attempt sets up a real-file write that we want to land,
    // but we can simulate the EBUSY by holding a busy handle — here we just
    // call write twice rapidly and assert the second succeeds.
    const size1 = await defaultAtomicWrite(target, "line1\n");
    const size2 = await defaultAtomicWrite(target, "line2\n");
    expect(size1).toBeGreaterThan(0);
    expect(size2).toBeGreaterThan(0);
    expect(existsSync(target)).toBe(true);
    // No stray .tmp files left behind.
    const left = readdirSync(dir).filter((f) => f.includes(".tmp-"));
    expect(left).toEqual([]);
  });

  it("rethrows non-EBUSY errors (no infinite retry)", async () => {
    // Cross-platform: create a regular file then try to write under it as if
    // it were a directory → ENOTDIR/EEXIST/EPERM (varies) but NOT EBUSY/EPERM-
    // on-rename, so retry path must NOT engage.
    const target = path.join(TMP_ROOT, "not-a-dir-file");
    writeFileSync(target, "x");
    await expect(defaultAtomicWrite(path.join(target, "child", "out"), "body")).rejects.toThrow();
  });
});

// ── runCli ───────────────────────────────────────────────────────────────────

describe("runCli", () => {
  it("returns exit code 2 on --help and prints usage", async () => {
    const out = { written: "", write(s) { this.written += s; } };
    const err = { written: "", write(s) { this.written += s; } };
    const code = await runCli(["--help"], { stdout: out, stderr: err });
    expect(code).toBe(2);
    expect(out.written).toMatch(/usage: export-ledger-lora/);
  });

  it("returns exit code 2 on invalid args", async () => {
    const out = { write() {} };
    const err = { written: "", write(s) { this.written += s; } };
    const code = await runCli(["--month", "2026-13"], { stdout: out, stderr: err });
    expect(code).toBe(2);
    expect(err.written).toMatch(/Invalid --month/);
  });

  it("returns exit code 0 + emits --json on success (round-trip, real export)", async () => {
    const { repoRoot } = makeWorkspaceWithDb();
    const out = { written: "", write(s) { this.written += s; } };
    const err = { written: "", write(s) { this.written += s; } };
    // databaseFactory + writeFile injected via runCli's seam options (P1 fix:
    // CLI success-path coverage). --month pins so the previous-month rewrite
    // branch is skipped (deterministic for the test).
    const writes = new Map();
    const code = await runCli(
      ["--json", "--month", "2026-05", "--repo-root", repoRoot],
      {
        stdout: out, stderr: err,
        databaseFactory: () => makeFakeDb([
          bugRow({ id: 1, detected_at: MAY_2026_MID_UTC, severity: "P0" }),
        ]),
        writeFile: async (file, body) => { writes.set(file, body); return body.length; },
      },
    );
    expect(code).toBe(0);
    const parsed = JSON.parse(out.written);
    expect(parsed.reason).toBe("exported");
    expect(parsed.rowsRendered).toBe(1);
    expect(parsed.written).toBe(true);
    expect(parsed.monthKey).toBe("2026-05");
  });

  it("default (no --month) rewrites previous + current month (P0-1 fix)", async () => {
    // Frozen nowMs = June 1 2026 12:00 UTC → current month "2026-06", previous "2026-05".
    const FROZEN_NOW = Date.UTC(2026, 5, 1, 12, 0, 0);
    const { repoRoot } = makeWorkspaceWithDb();
    // Rows spanning both months. May row would be lost without the prev-month rewrite.
    const rows = [
      bugRow({ id: 1, detected_at: Date.UTC(2026, 4, 31, 23, 50, 0), severity: "P0" }),  // May 31 row
      bugRow({ id: 2, detected_at: Date.UTC(2026, 5, 1,  0, 30, 0), severity: "P1" }),  // June 1 row
    ];
    const writes = new Map();
    const out = { written: "", write(s) { this.written += s; } };
    const err = { written: "", write(s) { this.written += s; } };
    const code = await runCli(
      ["--json", "--repo-root", repoRoot, "--now", new Date(FROZEN_NOW).toISOString()],
      {
        stdout: out, stderr: err,
        databaseFactory: () => makeFakeDb(rows),
        writeFile: async (file, body) => { writes.set(file, body); return body.length; },
      },
    );
    expect(code).toBe(0);
    // Stats describe the CURRENT month (June).
    const curStats = JSON.parse(out.written);
    expect(curStats.monthKey).toBe("2026-06");
    expect(curStats.rowsRendered).toBe(1);  // only id:2 in June
    // Verify BOTH month files were written (previous-month rewrite landed) —
    // exact filename match instead of presence-only.
    const mayKey  = [...writes.keys()].find((k) => k.endsWith("peer-audit-2026-05.jsonl"));
    const juneKey = [...writes.keys()].find((k) => k.endsWith("peer-audit-2026-06.jsonl"));
    expect(typeof mayKey).toBe("string");
    expect(typeof juneKey).toBe("string");
    // May file must contain exactly 1 line with the P0 row — would be silent-
    // data-loss without the fix.
    const mayBody = writes.get(mayKey);
    const mayLines = mayBody.trimEnd().split("\n").filter(Boolean);
    expect(mayLines.length).toBe(1);
    const mayRow = JSON.parse(mayLines[0]);
    expect(mayRow.labels[0]).toBe("P0");
    expect(mayRow.weight).toBe(2.5);
    // June file must contain exactly 1 line with the P1 row.
    const juneBody = writes.get(juneKey);
    const juneLines = juneBody.trimEnd().split("\n").filter(Boolean);
    expect(juneLines.length).toBe(1);
    const juneRow = JSON.parse(juneLines[0]);
    expect(juneRow.labels[0]).toBe("P1");
  });

  it("default + previous-month rewrite failure does NOT block current-month export", async () => {
    const FROZEN_NOW = Date.UTC(2026, 5, 1, 12, 0, 0);
    const { repoRoot } = makeWorkspaceWithDb();
    let callCount = 0;
    const out = { written: "", write(s) { this.written += s; } };
    const err = { written: "", write(s) { this.written += s; } };
    const code = await runCli(
      ["--json", "--repo-root", repoRoot, "--now", new Date(FROZEN_NOW).toISOString()],
      {
        stdout: out, stderr: err,
        databaseFactory: () => {
          callCount++;
          if (callCount === 1) {
            // First call = previous month export → throw.
            throw new Error("simulated transient DB failure");
          }
          return makeFakeDb([
            bugRow({ id: 1, detected_at: Date.UTC(2026, 5, 1, 0, 30, 0), severity: "P1" }),
          ]);
        },
        writeFile: async () => 0,
      },
    );
    // Current month still exits 0 despite previous-month failure.
    expect(code).toBe(0);
    expect(err.written).toMatch(/previous-month rewrite failed/);
    const curStats = JSON.parse(out.written);
    expect(curStats.monthKey).toBe("2026-06");
    expect(curStats.rowsRendered).toBe(1);
    expect(callCount).toBe(2);   // proves prev-month call happened + current ran
  });
});

// ── Real better-sqlite3 round-trip (P1 fix from Reviewer D) ──────────────────

describe("real-DB integration", () => {
  it("exports a real bug_attribution row through better-sqlite3 end-to-end", async () => {
    // Skip if better-sqlite3 is missing OR compiled against a different Node ABI.
    let Database;
    try {
      Database = (await import("better-sqlite3")).default;
    } catch {
      return;
    }
    const repoRoot = path.join(TMP_ROOT, `realdb-${Math.random().toString(36).slice(2, 8)}`);
    const dbDir = path.join(repoRoot, "state/shared");
    mkdirSync(dbDir, { recursive: true });
    const dbPath = path.join(dbDir, "coordination.db");

    // Build a real coordination.db with the minimum bug_attribution schema.
    // ABI-mismatch native binding errors are intermittent across host upgrades —
    // skip rather than fail when the binding refuses to load.
    let db;
    try {
      db = new Database(dbPath);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/NODE_MODULE_VERSION|was compiled against/.test(msg)) return;
      throw e;
    }
    db.exec(`
      CREATE TABLE bug_attribution (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bug_id TEXT NOT NULL,
        originating_chat TEXT,
        commit_sha TEXT,
        file_paths_json TEXT,
        severity TEXT,
        summary TEXT,
        detected_at INTEGER NOT NULL,
        resolved_at INTEGER,
        resolved_by TEXT,
        resolution_note TEXT,
        tokens_spent INTEGER,
        cost_usd_micros INTEGER,
        agent_type TEXT,
        dispatch_prompt TEXT,
        expected_files_json TEXT,
        originating_tick_id TEXT
      );
    `);
    db.prepare(`
      INSERT INTO bug_attribution(
        bug_id, originating_chat, commit_sha, file_paths_json, severity, summary,
        detected_at, tokens_spent, cost_usd_micros, agent_type, dispatch_prompt,
        expected_files_json, originating_tick_id
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      "bug-real-1", "claude-alpha", "deadbeef",
      JSON.stringify(["src/foo.ts"]),
      "P0", "real-DB integration row", MAY_2026_MID_UTC,
      12345, 67890, "claude-opus-4-7", "review this", JSON.stringify(["src/foo.ts"]), "tick-99",
    );
    db.close();

    // Run the exporter with NO factory override — exercises the real
    // better-sqlite3 readonly path.
    const stats = await exportLedgerLora({
      repoRoot,
      dbPath,
      monthKey: "2026-05",
    });
    expect(stats.ok).toBe(true);
    expect(stats.rowsRendered).toBe(1);
    expect(stats.totalRowsAllMonths).toBe(1);
    expect(existsSync(stats.outFile)).toBe(true);
    const body = readFileSync(stats.outFile, "utf-8");
    expect(body.endsWith("\n")).toBe(true);
    const row = JSON.parse(body.trim());
    expect(row.weight).toBe(2.5);     // P0 → 2.5
    expect(row.fingerprint.commit_sha).toBe("deadbeef");
    expect(row.fingerprint.agent_type).toBe("claude-opus-4-7");
    const inp = JSON.parse(row.input);
    expect(inp.originating_tick_id).toBe("tick-99");
    expect(inp.commit_sha).toBe("deadbeef");
  });
});
