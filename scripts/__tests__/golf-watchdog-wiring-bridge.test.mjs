/**
 * golf-watchdog-wiring-bridge.test.mjs — CLEANUP-MS0 / U-CLEANUP-C5 tests
 *
 * Covers:
 *   - happy path: candidates polled → analyzed → augmented → signalled
 *   - 4+ failure modes: missing db, malformed meta_json, factory throw, downstream throw
 *   - 3+ adversarial inputs: deeply-nested meta, non-engine paths, oversize batch
 *   - 3+ variability configs: meta shapes (files / affected_files / findings)
 *   - boundary: 5-min recency cache exactly at window edge, MAX_ENGINES_PER_TICK
 *   - integration: real cache round-trip via tmp+rename
 *   - recursion guard: recently-seen files are skipped
 *   - CLI exit codes via runCli
 */

import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import {
  parseArgs,
  resolvePaths,
  loadCache,
  saveCache,
  isRecentlySeen,
  extractEngineFilesFromMeta,
  pollAuditLedger,
  runWiringAnalyze,
  runGraphAugment,
  postGolfSignalDigest,
  runBridgeCycle,
  runCli,
  SCHEMA_VERSION,
  RECENT_CACHE_WINDOW_MS,
  MAX_ENGINES_PER_TICK,
} from "../golf-watchdog-wiring-bridge.mjs";

let TMP_ROOT;
beforeEach(() => {
  TMP_ROOT = mkdtempSync(path.join(os.tmpdir(), "u-cleanup-c5-"));
});

const ENGINE_A = "mcp-server/src/engines/FooBarEngine.ts";
const ENGINE_B = "mcp-server/src/engines/BazQuxEngine.ts";
const NON_ENGINE = "mcp-server/src/tools/dispatchers/devDispatcher.ts";

/** FakeDb mimicking the better-sqlite3 surface used by pollAuditLedger. */
function makeFakeDb(tickRows) {
  return {
    prepare(sql) {
      return {
        all(params) {
          if (sql.includes("FROM peer_audit_ticks")) {
            return tickRows
              .filter((r) => r.finished_at !== null && r.finished_at >= params.since)
              .sort((a, b) => a.finished_at - b.finished_at);
          }
          return [];
        },
        get() { return undefined; },
      };
    },
    close() {},
  };
}

function tickRow(id, finishedAt, files) {
  return {
    tick_id: id,
    started_at: finishedAt - 1000,
    finished_at: finishedAt,
    meta_json: JSON.stringify({ files }),
  };
}

function makeWorkspace(name) {
  const repoRoot = path.join(TMP_ROOT, name);
  const dbDir = path.join(repoRoot, "state/shared");
  mkdirSync(dbDir, { recursive: true });
  const dbPath = path.join(dbDir, "coordination.db");
  writeFileSync(dbPath, "fake-bytes");
  const cachePath = path.join(dbDir, ".c5-recent.json");
  return { repoRoot, dbPath, cachePath };
}

// ── parseArgs ────────────────────────────────────────────────────────────────

describe("parseArgs", () => {
  it("returns defaults for empty argv", () => {
    const o = parseArgs([]);
    expect(o.json).toBe(false);
    expect(o.dryRun).toBe(false);
    expect(o.cacheWindowMs).toBe(RECENT_CACHE_WINDOW_MS);
  });

  it("parses --json --dry-run --cache-window-ms 60000", () => {
    const o = parseArgs(["--json", "--dry-run", "--cache-window-ms", "60000"]);
    expect(o.json).toBe(true);
    expect(o.dryRun).toBe(true);
    expect(o.cacheWindowMs).toBe(60_000);
  });

  it("throws 'Unknown flag' on --bogus (failure mode)", () => {
    expect(() => parseArgs(["--bogus"])).toThrow(/Unknown flag/);
  });

  it("--since / --now parse ISO to ms", () => {
    const o = parseArgs(["--since", "2026-05-14T12:00:00Z", "--now", "2026-05-14T13:00:00Z"]);
    expect(o.sinceMs).toBe(Date.UTC(2026, 4, 14, 12, 0, 0));
    expect(o.nowMs).toBe(Date.UTC(2026, 4, 14, 13, 0, 0));
  });
});

// ── extractEngineFilesFromMeta ───────────────────────────────────────────────

describe("extractEngineFilesFromMeta", () => {
  it("extracts engine paths from {files: [...]} shape (variability config A)", () => {
    const meta = JSON.stringify({ files: [ENGINE_A, NON_ENGINE, ENGINE_B] });
    const got = extractEngineFilesFromMeta(meta);
    expect(got.sort()).toEqual([ENGINE_B, ENGINE_A].sort());
  });

  it("extracts from {affected_files: [...]} shape (variability config B)", () => {
    const meta = JSON.stringify({ affected_files: [ENGINE_A] });
    expect(extractEngineFilesFromMeta(meta)).toEqual([ENGINE_A]);
  });

  it("extracts from {findings: [{path}]} shape (variability config C)", () => {
    const meta = JSON.stringify({ findings: [{ path: ENGINE_A }, { file: ENGINE_B }] });
    const got = extractEngineFilesFromMeta(meta);
    expect(got.sort()).toEqual([ENGINE_B, ENGINE_A].sort());
  });

  it("filters OUT non-engine paths (dispatcher, test, etc.)", () => {
    const meta = JSON.stringify({ files: [NON_ENGINE, "mcp-server/src/__tests__/Foo.test.ts", "README.md"] });
    expect(extractEngineFilesFromMeta(meta)).toEqual([]);
  });

  it("returns [] on malformed JSON (failure mode)", () => {
    expect(extractEngineFilesFromMeta("{not-json")).toEqual([]);
  });

  it("returns [] on empty/null input (failure mode)", () => {
    expect(extractEngineFilesFromMeta("")).toEqual([]);
    expect(extractEngineFilesFromMeta(null)).toEqual([]);
    expect(extractEngineFilesFromMeta(undefined)).toEqual([]);
  });

  it("handles deeply-nested meta shapes (adversarial)", () => {
    const meta = JSON.stringify({ findings: [{ path: ENGINE_A }], files: [ENGINE_B] });
    const got = extractEngineFilesFromMeta(meta);
    expect(got.sort()).toEqual([ENGINE_B, ENGINE_A].sort());
  });

  it("dedups when same engine appears in multiple keys (adversarial)", () => {
    const meta = JSON.stringify({ files: [ENGINE_A], affected_files: [ENGINE_A], findings: [{ path: ENGINE_A }] });
    expect(extractEngineFilesFromMeta(meta)).toEqual([ENGINE_A]);
  });

  it("strips leading ./ from paths", () => {
    const meta = JSON.stringify({ files: ["./" + ENGINE_A] });
    expect(extractEngineFilesFromMeta(meta)).toEqual([ENGINE_A]);
  });
});

// ── loadCache / saveCache / isRecentlySeen ───────────────────────────────────

describe("cache", () => {
  it("saveCache → loadCache round-trips via real disk", () => {
    const cachePath = path.join(TMP_ROOT, ".c5-recent.json");
    const now = Date.now();
    const m = new Map([[ENGINE_A, now - 1000], [ENGINE_B, now - 2000]]);
    saveCache(cachePath, m, now, RECENT_CACHE_WINDOW_MS);
    const loaded = loadCache(cachePath);
    expect(loaded.get(ENGINE_A)).toBe(now - 1000);
    expect(loaded.get(ENGINE_B)).toBe(now - 2000);
  });

  it("saveCache trims entries older than the cache window", () => {
    const cachePath = path.join(TMP_ROOT, ".c5-trim.json");
    const now = Date.now();
    const m = new Map([
      [ENGINE_A, now - 1000],                              // fresh
      [ENGINE_B, now - RECENT_CACHE_WINDOW_MS - 1000],     // stale → trimmed
    ]);
    saveCache(cachePath, m, now, RECENT_CACHE_WINDOW_MS);
    const persisted = JSON.parse(readFileSync(cachePath, "utf-8"));
    expect(ENGINE_A in persisted.entries).toBe(true);
    expect(ENGINE_B in persisted.entries).toBe(false);
  });

  it("loadCache returns empty Map on missing file (graceful)", () => {
    const loaded = loadCache(path.join(TMP_ROOT, "no.json"));
    expect(loaded.size).toBe(0);
  });

  it("loadCache returns empty Map on malformed JSON (adversarial)", () => {
    const p = path.join(TMP_ROOT, "bad.json");
    writeFileSync(p, "{not-json");
    expect(loadCache(p).size).toBe(0);
  });

  it("isRecentlySeen=true within window, false outside (boundary)", () => {
    const now = 1_000_000;
    const cache = new Map([[ENGINE_A, now - (RECENT_CACHE_WINDOW_MS - 1)]]);   // 1ms inside window
    expect(isRecentlySeen(cache, ENGINE_A, now, RECENT_CACHE_WINDOW_MS)).toBe(true);
    const cache2 = new Map([[ENGINE_A, now - RECENT_CACHE_WINDOW_MS]]);         // exactly at edge → NOT recent
    expect(isRecentlySeen(cache2, ENGINE_A, now, RECENT_CACHE_WINDOW_MS)).toBe(false);
  });

  it("isRecentlySeen=false for unknown file", () => {
    expect(isRecentlySeen(new Map(), ENGINE_A, Date.now(), RECENT_CACHE_WINDOW_MS)).toBe(false);
  });
});

// ── pollAuditLedger ──────────────────────────────────────────────────────────

describe("pollAuditLedger", () => {
  it("returns engine-file candidates from finished ticks since cutoff (happy)", async () => {
    const now = Date.now();
    const fake = makeFakeDb([
      tickRow("t1", now - 10 * 60_000, [ENGINE_A]),
      tickRow("t2", now - 5 * 60_000, [ENGINE_B, NON_ENGINE]),
    ]);
    const got = await pollAuditLedger("/x.db", now - 30 * 60_000, { databaseFactory: () => fake });
    expect(got.map((c) => c.filePath).sort()).toEqual([ENGINE_B, ENGINE_A].sort());
    expect(got.every((c) => typeof c.sourceTickId === "string")).toBe(true);
  });

  it("excludes ticks older than the cutoff (boundary)", async () => {
    const now = Date.now();
    const fake = makeFakeDb([
      tickRow("old", now - 60 * 60_000, [ENGINE_A]),     // 60 min ago → excluded by 30-min cutoff
      tickRow("new", now - 5 * 60_000, [ENGINE_B]),
    ]);
    const got = await pollAuditLedger("/x.db", now - 30 * 60_000, { databaseFactory: () => fake });
    expect(got.map((c) => c.filePath)).toEqual([ENGINE_B]);
  });

  it("returns [] when db file missing and no factory (graceful)", async () => {
    const got = await pollAuditLedger(path.join(TMP_ROOT, "no.db"), Date.now());
    expect(got).toEqual([]);
  });

  it("returns [] when factory throws (graceful)", async () => {
    const got = await pollAuditLedger("/x", Date.now(), {
      databaseFactory: () => { throw new Error("locked"); },
    });
    expect(got).toEqual([]);
  });
});

// ── downstream call wrappers ─────────────────────────────────────────────────

describe("downstream call wrappers", () => {
  it("runWiringAnalyze uses injected analyzer (happy)", async () => {
    const r = await runWiringAnalyze(ENGINE_A, { analyzer: async (f) => ({ file: f, score: 0.8 }) });
    expect(r.ok).toBe(true);
    expect(r.result.score).toBe(0.8);
  });

  it("runWiringAnalyze surfaces analyzer throw as ok:false (failure mode)", async () => {
    const r = await runWiringAnalyze(ENGINE_A, { analyzer: async () => { throw new Error("c1 down"); } });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("c1 down");
  });

  it("runWiringAnalyze returns no_analyzer_injected when no analyzer (graceful default)", async () => {
    const r = await runWiringAnalyze(ENGINE_A, {});
    expect(r.ok).toBe(false);
    expect(r.error).toBe("no_analyzer_injected");
  });

  it("runGraphAugment surfaces augmenter throw (failure mode)", async () => {
    const r = await runGraphAugment(ENGINE_A, {}, { augmenter: async () => { throw new Error("c3 down"); } });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("c3 down");
  });

  it("postGolfSignalDigest surfaces poster throw (failure mode)", async () => {
    const r = await postGolfSignalDigest({}, { signalPoster: async () => { throw new Error("f8 down"); } });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("f8 down");
  });
});

// ── runBridgeCycle ───────────────────────────────────────────────────────────

describe("runBridgeCycle", () => {
  it("happy path: 2 engine candidates → both processed, cache persisted", async () => {
    const { repoRoot, dbPath, cachePath } = makeWorkspace("happy");
    const now = Date.now();
    const fake = makeFakeDb([
      tickRow("t1", now - 5 * 60_000, [ENGINE_A]),
      tickRow("t2", now - 4 * 60_000, [ENGINE_B]),
    ]);
    const calls = { analyze: [], augment: [], signal: [] };
    const stats = await runBridgeCycle({
      repoRoot, dbPath, cachePath, nowMs: now,
      databaseFactory: () => fake,
      analyzer: async (f) => { calls.analyze.push(f); return { file: f, score: 0.7 }; },
      augmenter: async (f) => { calls.augment.push(f); return { added: true }; },
      signalPoster: async (p) => { calls.signal.push(p); return { posted: true }; },
    });
    expect(stats.processedCount).toBe(2);
    expect(stats.skippedCount).toBe(0);
    expect(calls.analyze.sort()).toEqual([ENGINE_B, ENGINE_A].sort());
    expect(calls.augment.length).toBe(2);
    expect(calls.signal.length).toBe(2);
    expect(stats.processed.every((p) => p.analysisOk && p.augmentOk && p.signalOk)).toBe(true);
    // Cache was persisted with both files.
    expect(existsSync(cachePath)).toBe(true);
    const persisted = JSON.parse(readFileSync(cachePath, "utf-8"));
    expect(ENGINE_A in persisted.entries).toBe(true);
    expect(ENGINE_B in persisted.entries).toBe(true);
  });

  it("recursion guard: recently-seen files are SKIPPED (the load-bearing safety)", async () => {
    const { repoRoot, dbPath, cachePath } = makeWorkspace("recursion");
    const now = Date.now();
    // Pre-seed cache with ENGINE_A seen 1 minute ago (inside the 5-min window).
    writeFileSync(cachePath, JSON.stringify({
      schemaVersion: 1, updatedAtMs: now, entries: { [ENGINE_A]: now - 60_000 },
    }), "utf-8");
    const fake = makeFakeDb([tickRow("t1", now - 30_000, [ENGINE_A, ENGINE_B])]);
    let analyzeCalls = 0;
    const stats = await runBridgeCycle({
      repoRoot, dbPath, cachePath, nowMs: now,
      databaseFactory: () => fake,
      analyzer: async () => { analyzeCalls++; return {}; },
      augmenter: async () => ({}),
      signalPoster: async () => ({}),
    });
    expect(stats.processedCount).toBe(1);     // only ENGINE_B
    expect(stats.skippedCount).toBe(1);       // ENGINE_A skipped
    expect(stats.skipped[0].filePath).toBe(ENGINE_A);
    expect(stats.skipped[0].reason).toBe("recently_analyzed");
    expect(analyzeCalls).toBe(1);             // analyzer NOT called for ENGINE_A
  });

  it("downstream failure does NOT block other files (best-effort)", async () => {
    const { repoRoot, dbPath, cachePath } = makeWorkspace("downstream-fail");
    const now = Date.now();
    const fake = makeFakeDb([tickRow("t1", now - 60_000, [ENGINE_A, ENGINE_B])]);
    const stats = await runBridgeCycle({
      repoRoot, dbPath, cachePath, nowMs: now,
      databaseFactory: () => fake,
      analyzer: async (f) => { if (f === ENGINE_A) throw new Error("c1 boom"); return {}; },
      augmenter: async () => ({}),
      signalPoster: async () => ({}),
    });
    expect(stats.processedCount).toBe(2);   // both still processed
    const a = stats.processed.find((p) => p.filePath === ENGINE_A);
    const b = stats.processed.find((p) => p.filePath === ENGINE_B);
    expect(a.analysisOk).toBe(false);
    expect(a.analysisError).toBe("c1 boom");
    expect(b.analysisOk).toBe(true);
  });

  it("dry-run does NOT persist the cache", async () => {
    const { repoRoot, dbPath, cachePath } = makeWorkspace("dry");
    const now = Date.now();
    const fake = makeFakeDb([tickRow("t1", now - 60_000, [ENGINE_A])]);
    const stats = await runBridgeCycle({
      repoRoot, dbPath, cachePath, nowMs: now, dryRun: true,
      databaseFactory: () => fake,
      analyzer: async () => ({}),
      augmenter: async () => ({}),
      signalPoster: async () => ({}),
    });
    expect(stats.processedCount).toBe(1);
    expect(stats.dryRun).toBe(true);
    expect(existsSync(cachePath)).toBe(false);   // no write
  });

  it("caps batch at MAX_ENGINES_PER_TICK (boundary: oversize batch)", async () => {
    const { repoRoot, dbPath, cachePath } = makeWorkspace("oversize");
    const now = Date.now();
    const manyEngines = Array.from({ length: MAX_ENGINES_PER_TICK + 10 }, (_, i) =>
      `mcp-server/src/engines/Engine${i}.ts`);
    const fake = makeFakeDb([tickRow("t1", now - 60_000, manyEngines)]);
    const stats = await runBridgeCycle({
      repoRoot, dbPath, cachePath, nowMs: now,
      databaseFactory: () => fake,
      analyzer: async () => ({}),
      augmenter: async () => ({}),
      signalPoster: async () => ({}),
    });
    expect(stats.processedCount).toBe(MAX_ENGINES_PER_TICK);
    expect(stats.skippedCount).toBe(10);
    expect(stats.skipped.every((s) => s.reason === "max_batch_reached")).toBe(true);
  });

  it("no candidates → zero processed, no cache write needed", async () => {
    const { repoRoot, dbPath, cachePath } = makeWorkspace("empty");
    const now = Date.now();
    const fake = makeFakeDb([]);
    const stats = await runBridgeCycle({
      repoRoot, dbPath, cachePath, nowMs: now,
      databaseFactory: () => fake,
    });
    expect(stats.candidatesSeen).toBe(0);
    expect(stats.processedCount).toBe(0);
  });
});

// ── runCli ───────────────────────────────────────────────────────────────────

describe("runCli", () => {
  it("exit 2 on --help with usage text", async () => {
    const out = { written: "", write(s) { this.written += s; } };
    const code = await runCli(["--help"], { stdout: out, stderr: { write() {} } });
    expect(code).toBe(2);
    expect(out.written.includes("U-CLEANUP-C5")).toBe(true);
  });

  it("exit 2 on bad flag", async () => {
    const err = { written: "", write(s) { this.written += s; } };
    const code = await runCli(["--bogus"], { stdout: { write() {} }, stderr: err });
    expect(code).toBe(2);
    expect(err.written.includes("Unknown flag")).toBe(true);
  });

  it("exit 0 + JSON on success with injected seams (round-trip)", async () => {
    const { repoRoot, dbPath, cachePath } = makeWorkspace("cli");
    const now = Date.now();
    const fake = makeFakeDb([tickRow("t1", now - 60_000, [ENGINE_A])]);
    const out = { written: "", write(s) { this.written += s; } };
    const err = { written: "", write(s) { this.written += s; } };
    const code = await runCli(
      ["--json", "--repo-root", repoRoot, "--db", dbPath, "--cache", cachePath,
       "--now", new Date(now).toISOString()],
      {
        stdout: out, stderr: err,
        databaseFactory: () => fake,
        analyzer: async () => ({}),
        augmenter: async () => ({}),
        signalPoster: async () => ({}),
      },
    );
    expect(code).toBe(0);
    const parsed = JSON.parse(out.written);
    expect(parsed.schemaVersion).toBe(SCHEMA_VERSION);
    expect(parsed.processedCount).toBe(1);
  });
});
