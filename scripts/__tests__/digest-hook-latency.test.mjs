/**
 * digest-hook-latency.test.mjs — verification of CLEANUP-MS0 / U-CLEANUP-F4.
 *
 * F4 extends digest-hook-latency.mjs (HOOK-SYNERGY-MS0/H4) with:
 *   - async-hook-results.jsonl merge into the per-hook P95 pipeline
 *   - per-(event,tier) stack-time view
 *   - invokedAsCli guard + run()/computeDigest extraction for testability
 *
 * Coverage floor:
 *   - happy path (sync + async merge → correct per-hook + stack-time output)
 *   - >= 3 failure modes (missing files, malformed JSONL lines, async record
 *     missing required fields)
 *   - >= 2 adversarial inputs (empty arrays, record with NaN-ish values,
 *     unknown event/tier)
 *   - >= 3 spanning variability configs (sync-only / async-only / merged;
 *     regression vs no-regression; window cutoff include/exclude)
 *   - round-trip CLI invocation via spawnSync (--json, --no-async, --check)
 *
 * Real reference values throughout — no toBeDefined()/toBeTruthy() stubs.
 */

import { describe, it, expect, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseArgs,
  parseWindow,
  loadJsonl,
  normalizeAsyncRecord,
  loadAsyncResults,
  loadSnapshot,
  percentile,
  statsFor,
  stackTimeByEventTier,
  computeDigest,
  renderMarkdown,
  run,
  REGRESSION_MULTIPLIER,
  REGRESSION_MIN_MS,
  DEFAULT_WINDOW_MS,
  DEFAULT_TOP,
} from "../digest-hook-latency.mjs";

import { readFileSync, existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(__dirname, "..", "digest-hook-latency.mjs");

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-05-14T12:00:00.000Z");
const RECENT = new Date(NOW - 60 * 60 * 1000).toISOString();   // 1h ago
const OLD = new Date(NOW - 10 * DAY_MS).toISOString();          // 10d ago — outside default 7d window

// ── temp-file hygiene ─────────────────────────────────────────────────
const tmpFiles = [];
afterEach(() => {
  while (tmpFiles.length) {
    try { rmSync(tmpFiles.pop(), { recursive: true, force: true }); } catch { /* best-effort */ }
  }
});
function tmpJsonl(lines) {
  const dir = mkdtempSync(join(tmpdir(), "dhl-test-"));
  tmpFiles.push(dir);
  const p = join(dir, "data.jsonl");
  writeFileSync(p, lines.join("\n") + "\n");
  return p;
}

// ── fixture builders ──────────────────────────────────────────────────
function syncRec(hook, durationMs, ts = RECENT, exitCode = 0) {
  return { ts, hook, durationMs, exitCode, signal: null, targetPath: `.claude/hooks/${hook}` };
}
function asyncRaw(hookPath, durationMs, opts = {}) {
  return {
    schemaVersion: 1,
    jobId: opts.jobId || "j1",
    hookPath,
    tier: opts.tier || "T4",
    event: opts.event || "Stop",
    status: opts.status || (opts.exitCode === 0 || opts.exitCode === undefined ? "succeeded" : "failed"),
    exitCode: opts.exitCode ?? 0,
    signal: opts.signal ?? null,
    startedAt: opts.startedAt || RECENT,
    completedAt: opts.completedAt || RECENT,
    durationMs,
    stdoutBytes: 0,
    stderrBytes: 0,
  };
}

// ── parseArgs ─────────────────────────────────────────────────────────

describe("parseArgs", () => {
  it("empty argv → empty options", () => {
    expect(parseArgs([])).toEqual({});
  });
  it("--json / --check / --no-async are boolean flags", () => {
    expect(parseArgs(["--json", "--check", "--no-async"])).toEqual({
      json: true, check: true, noAsync: true,
    });
  });
  it("--window and --top consume the next token", () => {
    expect(parseArgs(["--window", "24h", "--top", "10"])).toEqual({ window: "24h", top: "10" });
  });
  it("--window with no value is ignored (no crash)", () => {
    expect(parseArgs(["--window"])).toEqual({});
  });
});

// ── parseWindow ───────────────────────────────────────────────────────

describe("parseWindow", () => {
  it("'24h' → 24 hours in ms", () => {
    expect(parseWindow("24h")).toBe(24 * 3_600_000);
  });
  it("'7d' → 7 days in ms", () => {
    expect(parseWindow("7d")).toBe(7 * 86_400_000);
  });
  it("'30m' → 30 minutes in ms", () => {
    expect(parseWindow("30m")).toBe(30 * 60_000);
  });
  it("'1w' → 1 week in ms", () => {
    expect(parseWindow("1w")).toBe(604_800_000);
  });
  it("raw number (no unit) → that many ms, floored at 1000", () => {
    expect(parseWindow("5000")).toBe(5000);
    expect(parseWindow("500")).toBe(1000); // floored
  });
  it("garbage → DEFAULT_WINDOW_MS", () => {
    expect(parseWindow("not-a-window")).toBe(DEFAULT_WINDOW_MS);
  });
});

// ── loadJsonl ─────────────────────────────────────────────────────────

describe("loadJsonl", () => {
  it("missing file → []", () => {
    expect(loadJsonl(join(tmpdir(), "definitely-not-here-dhl.jsonl"))).toEqual([]);
  });
  it("valid records parsed; malformed lines skipped", () => {
    const p = tmpJsonl([
      JSON.stringify(syncRec("a.mjs", 10)),
      "{ not json",
      JSON.stringify(syncRec("b.mjs", 20)),
      "",
    ]);
    const recs = loadJsonl(p);
    expect(recs).toHaveLength(2);
    expect(recs.map((r) => r.hook).sort()).toEqual(["a.mjs", "b.mjs"]);
  });
  it("records missing required fields are dropped", () => {
    const p = tmpJsonl([
      JSON.stringify({ ts: RECENT, hook: "x.mjs", durationMs: 5, exitCode: 0 }), // ok
      JSON.stringify({ ts: RECENT, hook: "y.mjs", durationMs: "not-a-number", exitCode: 0 }), // bad
      JSON.stringify({ ts: RECENT, hook: "z.mjs", exitCode: 0 }), // missing durationMs
    ]);
    expect(loadJsonl(p).map((r) => r.hook)).toEqual(["x.mjs"]);
  });
  it("adversarial: durationMs that parses to Infinity is rejected (Number.isFinite guard)", () => {
    // JSON.parse("1e999") → Infinity. typeof === "number" would accept it and
    // poison percentile()/statsFor(); Number.isFinite is the actual guard.
    const p = tmpJsonl([
      '{"ts":"' + RECENT + '","hook":"inf.mjs","durationMs":1e999,"exitCode":0}',
      JSON.stringify(syncRec("ok.mjs", 7)),
    ]);
    expect(loadJsonl(p).map((r) => r.hook)).toEqual(["ok.mjs"]);
  });
});

// ── normalizeAsyncRecord ──────────────────────────────────────────────

describe("normalizeAsyncRecord", () => {
  it("valid async record → normalized {ts,hook,durationMs,exitCode} + async/event/tier", () => {
    const norm = normalizeAsyncRecord(asyncRaw(".claude/hooks/foo-async.mjs", 120, { event: "Stop", tier: "T4" }));
    expect(norm).toMatchObject({
      ts: RECENT,
      hook: "foo-async.mjs",
      durationMs: 120,
      exitCode: 0,
      async: true,
      event: "Stop",
      tier: "T4",
    });
  });
  it("uses completedAt for ts; falls back to startedAt when completedAt absent", () => {
    const raw = asyncRaw(".claude/hooks/x.mjs", 5);
    delete raw.completedAt;
    raw.startedAt = OLD;
    expect(normalizeAsyncRecord(raw).ts).toBe(OLD);
  });
  it("missing hookPath → null", () => {
    const raw = asyncRaw(".claude/hooks/x.mjs", 5);
    delete raw.hookPath;
    expect(normalizeAsyncRecord(raw)).toBeNull();
  });
  it("missing durationMs → null", () => {
    const raw = asyncRaw(".claude/hooks/x.mjs", 5);
    delete raw.durationMs;
    expect(normalizeAsyncRecord(raw)).toBeNull();
  });
  it("missing exitCode → null", () => {
    const raw = asyncRaw(".claude/hooks/x.mjs", 5);
    delete raw.exitCode;
    expect(normalizeAsyncRecord(raw)).toBeNull();
  });
  it("missing ts (no completedAt AND no startedAt) → null", () => {
    const raw = asyncRaw(".claude/hooks/x.mjs", 5);
    delete raw.completedAt;
    delete raw.startedAt;
    expect(normalizeAsyncRecord(raw)).toBeNull();
  });
  it("adversarial: missing event/tier → '(unknown)' placeholders, not null", () => {
    const raw = asyncRaw(".claude/hooks/x.mjs", 5);
    delete raw.event;
    delete raw.tier;
    const norm = normalizeAsyncRecord(raw);
    expect(norm.event).toBe("(unknown)");
    expect(norm.tier).toBe("(unknown)");
  });
  it("adversarial: non-object input → null", () => {
    expect(normalizeAsyncRecord(null)).toBeNull();
    expect(normalizeAsyncRecord("string")).toBeNull();
    expect(normalizeAsyncRecord(42)).toBeNull();
  });
  it("adversarial: durationMs Infinity → null (Number.isFinite guard, async twin of loadJsonl)", () => {
    // Async records feed the SAME statsFor()/percentile() pipeline as sync —
    // an Infinity duration must be rejected here exactly as loadJsonl rejects it.
    const raw = asyncRaw(".claude/hooks/x.mjs", Infinity);
    expect(normalizeAsyncRecord(raw)).toBeNull();
  });
  it("adversarial: durationMs NaN → null", () => {
    const raw = asyncRaw(".claude/hooks/x.mjs", NaN);
    expect(normalizeAsyncRecord(raw)).toBeNull();
  });
  it("adversarial: exitCode NaN → null", () => {
    const raw = asyncRaw(".claude/hooks/x.mjs", 5);
    raw.exitCode = NaN;
    expect(normalizeAsyncRecord(raw)).toBeNull();
  });
  it("adversarial: unparseable ts (completedAt='not-a-date') → null", () => {
    // A non-Date-parseable ts survives the typeof-string check but becomes NaN
    // in computeDigest's window filter — reject it here so the record can't
    // silently vanish from the window (matches loadJsonl's Date.parse guard).
    const raw = asyncRaw(".claude/hooks/x.mjs", 5);
    raw.completedAt = "not-a-date";
    delete raw.startedAt;
    expect(normalizeAsyncRecord(raw)).toBeNull();
  });
  it("unparseable completedAt falls through to a valid startedAt", () => {
    const raw = asyncRaw(".claude/hooks/x.mjs", 5);
    raw.completedAt = "garbage";
    raw.startedAt = RECENT;
    expect(normalizeAsyncRecord(raw).ts).toBe(RECENT);
  });
});

// ── loadAsyncResults ──────────────────────────────────────────────────

describe("loadAsyncResults", () => {
  it("missing file → []", () => {
    expect(loadAsyncResults(join(tmpdir(), "no-async-here-dhl.jsonl"))).toEqual([]);
  });
  it("valid + malformed + invalid-shape lines → only valid normalized", () => {
    const badShape = asyncRaw(".claude/hooks/bad.mjs", 5);
    delete badShape.durationMs;
    const p = tmpJsonl([
      JSON.stringify(asyncRaw(".claude/hooks/ok1.mjs", 10)),
      "{{{ malformed",
      JSON.stringify(badShape),
      JSON.stringify(asyncRaw(".claude/hooks/ok2.mjs", 20)),
    ]);
    const recs = loadAsyncResults(p);
    expect(recs.map((r) => r.hook).sort()).toEqual(["ok1.mjs", "ok2.mjs"]);
    expect(recs.every((r) => r.async === true)).toBe(true);
  });
});

// ── loadSnapshot ──────────────────────────────────────────────────────

describe("loadSnapshot", () => {
  it("missing file → {}", () => {
    expect(loadSnapshot(join(tmpdir(), "no-snap-dhl.json"))).toEqual({});
  });
  it("valid snapshot → .hooks object", () => {
    const dir = mkdtempSync(join(tmpdir(), "dhl-snap-"));
    tmpFiles.push(dir);
    const p = join(dir, "snap.json");
    writeFileSync(p, JSON.stringify({ hooks: { "a.mjs": { p95: 10 } } }));
    expect(loadSnapshot(p)).toEqual({ "a.mjs": { p95: 10 } });
  });
  it("malformed JSON → {} (first-run fallback, no crash)", () => {
    const dir = mkdtempSync(join(tmpdir(), "dhl-snap-bad-"));
    tmpFiles.push(dir);
    const p = join(dir, "snap.json");
    writeFileSync(p, "{ this is not json");
    expect(loadSnapshot(p)).toEqual({});
  });
  it("valid JSON but no .hooks key → {} (shape guard)", () => {
    const dir = mkdtempSync(join(tmpdir(), "dhl-snap-noshape-"));
    tmpFiles.push(dir);
    const p = join(dir, "snap.json");
    writeFileSync(p, JSON.stringify({ generatedAt: "x", windowMs: 1 }));
    expect(loadSnapshot(p)).toEqual({});
  });
});

// ── percentile ────────────────────────────────────────────────────────

describe("percentile", () => {
  it("empty → 0", () => {
    expect(percentile([], 0.95)).toBe(0);
  });
  it("p50 of [10,20,30,40] → 20 (rank ceil(0.5*4)=2 → idx 1)", () => {
    expect(percentile([10, 20, 30, 40], 0.5)).toBe(20);
  });
  it("p95 of 1..100 → 95", () => {
    const arr = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentile(arr, 0.95)).toBe(95);
  });
  it("single element → that element for any percentile", () => {
    expect(percentile([42], 0.5)).toBe(42);
    expect(percentile([42], 0.99)).toBe(42);
  });
});

// ── statsFor ──────────────────────────────────────────────────────────

describe("statsFor", () => {
  it("computes p50/p95/p99/max/fires/failures from rows", () => {
    const rows = [
      syncRec("h.mjs", 10), syncRec("h.mjs", 20), syncRec("h.mjs", 30),
      syncRec("h.mjs", 40, RECENT, 1), // a failure
    ];
    const s = statsFor("h.mjs", rows);
    expect(s.hook).toBe("h.mjs");
    expect(s.fires).toBe(4);
    expect(s.failures).toBe(1);
    expect(s.max).toBe(40);
    expect(s.p50).toBe(20);  // ceil(0.5*4)=2 → idx 1 → 20
    expect(s.asyncFires).toBe(0);
  });
  it("asyncFires counts only rows flagged async:true", () => {
    const asyncNorm = normalizeAsyncRecord(asyncRaw(".claude/hooks/h.mjs", 15));
    const s = statsFor("h.mjs", [syncRec("h.mjs", 10), asyncNorm]);
    expect(s.fires).toBe(2);
    expect(s.asyncFires).toBe(1);
  });
});

// ── stackTimeByEventTier ──────────────────────────────────────────────

describe("stackTimeByEventTier", () => {
  it("empty → []", () => {
    expect(stackTimeByEventTier([])).toEqual([]);
  });
  it("groups by (event,tier), sums durationMs, sorts by totalMs desc", () => {
    const rows = [
      normalizeAsyncRecord(asyncRaw(".claude/hooks/a.mjs", 100, { event: "Stop", tier: "T4" })),
      normalizeAsyncRecord(asyncRaw(".claude/hooks/b.mjs", 50, { event: "Stop", tier: "T4" })),
      normalizeAsyncRecord(asyncRaw(".claude/hooks/c.mjs", 30, { event: "PreToolUse", tier: "T2" })),
    ];
    const out = stackTimeByEventTier(rows);
    expect(out).toHaveLength(2);
    // Stop/T4 = 150ms total (2 fires) sorts above PreToolUse/T2 = 30ms
    expect(out[0]).toMatchObject({ event: "Stop", tier: "T4", fires: 2, totalMs: 150 });
    expect(out[1]).toMatchObject({ event: "PreToolUse", tier: "T2", fires: 1, totalMs: 30 });
  });
  it("computes p95 within each (event,tier) bucket", () => {
    const rows = Array.from({ length: 20 }, (_, i) =>
      normalizeAsyncRecord(asyncRaw(`.claude/hooks/h${i}.mjs`, (i + 1) * 10, { event: "Stop", tier: "T4" })),
    );
    const out = stackTimeByEventTier(rows);
    expect(out[0].fires).toBe(20);
    expect(out[0].totalMs).toBe(2100); // 10+20+...+200
    expect(out[0].p95).toBe(190); // ceil(0.95*20)=19 → idx 18 → 190
  });
});

// ── computeDigest — the integration core ──────────────────────────────

describe("computeDigest", () => {
  it("merges sync + async records into one per-hook stats table", () => {
    const records = [syncRec("sync-hook.mjs", 10)];
    const asyncRecords = [normalizeAsyncRecord(asyncRaw(".claude/hooks/async-hook.mjs", 200))];
    const d = computeDigest({ records, asyncRecords, windowMs: DEFAULT_WINDOW_MS, top: 25, now: NOW });
    expect(d.totalFires).toBe(2);
    expect(d.asyncFires).toBe(1);
    expect(d.uniqueHooks).toBe(2);
    // async-hook (200ms) sorts above sync-hook (10ms) by P95
    expect(d.stats[0].hook).toBe("async-hook.mjs");
    expect(d.stats[0].asyncFires).toBe(1);
  });

  it("sync and async records for the SAME hook basename merge into one row", () => {
    const records = [syncRec("shared.mjs", 10), syncRec("shared.mjs", 20)];
    const asyncRecords = [normalizeAsyncRecord(asyncRaw(".claude/hooks/shared.mjs", 30))];
    const d = computeDigest({ records, asyncRecords, windowMs: DEFAULT_WINDOW_MS, top: 25, now: NOW });
    expect(d.uniqueHooks).toBe(1);
    expect(d.stats[0].fires).toBe(3);
    expect(d.stats[0].asyncFires).toBe(1);
  });

  it("window cutoff: OLD records (10d ago) excluded from a 7d window", () => {
    const records = [syncRec("recent.mjs", 10, RECENT), syncRec("ancient.mjs", 99, OLD)];
    const d = computeDigest({ records, windowMs: 7 * DAY_MS, top: 25, now: NOW });
    expect(d.totalFires).toBe(1);
    expect(d.stats.map((s) => s.hook)).toEqual(["recent.mjs"]);
  });

  it("regression flag fires on the MERGED set — an async hook ≥1.5× prior P95 ≥50ms is flagged", () => {
    const asyncRecords = [normalizeAsyncRecord(asyncRaw(".claude/hooks/slowpoke.mjs", 300))];
    const snapshot = { "slowpoke.mjs": { p95: 100 } }; // prior P95 100 → 300 is 3× → flagged
    const d = computeDigest({ records: [], asyncRecords, windowMs: DEFAULT_WINDOW_MS, top: 25, now: NOW, snapshot });
    expect(d.regressions).toHaveLength(1);
    expect(d.regressions[0].hook).toBe("slowpoke.mjs");
    expect(d.regressions[0].before_p95).toBe(100);
    expect(d.regressions[0].after_p95).toBe(300);
    expect(d.regressions[0].mult).toBe("3.00");
  });

  it("no regression when current P95 < REGRESSION_MIN_MS even if ≥1.5× prior", () => {
    // 10ms vs prior 1ms = 10× but 10 < 50ms floor → NOT flagged
    const records = [syncRec("tiny.mjs", 10)];
    const snapshot = { "tiny.mjs": { p95: 1 } };
    const d = computeDigest({ records, windowMs: DEFAULT_WINDOW_MS, top: 25, now: NOW, snapshot });
    expect(d.regressions).toHaveLength(0);
  });

  it("no regression when current P95 < 1.5× prior", () => {
    const records = Array.from({ length: 10 }, () => syncRec("steady.mjs", 100));
    const snapshot = { "steady.mjs": { p95: 90 } }; // 100 < 90*1.5=135 → not flagged
    const d = computeDigest({ records, windowMs: DEFAULT_WINDOW_MS, top: 25, now: NOW, snapshot });
    expect(d.regressions).toHaveLength(0);
  });

  it("stackTime is populated from async records only (sync records contribute nothing)", () => {
    const records = [syncRec("sync.mjs", 999)]; // sync — no event/tier
    const asyncRecords = [
      normalizeAsyncRecord(asyncRaw(".claude/hooks/a.mjs", 40, { event: "Stop", tier: "T4" })),
    ];
    const d = computeDigest({ records, asyncRecords, windowMs: DEFAULT_WINDOW_MS, top: 25, now: NOW });
    expect(d.stackTime).toHaveLength(1);
    expect(d.stackTime[0]).toMatchObject({ event: "Stop", tier: "T4", fires: 1, totalMs: 40 });
  });

  it("variability: sync-only config → stackTime empty, stats populated", () => {
    const d = computeDigest({ records: [syncRec("only.mjs", 5)], windowMs: DEFAULT_WINDOW_MS, top: 25, now: NOW });
    expect(d.stackTime).toEqual([]);
    expect(d.uniqueHooks).toBe(1);
  });

  it("variability: async-only config → stats AND stackTime populated", () => {
    const asyncRecords = [normalizeAsyncRecord(asyncRaw(".claude/hooks/a.mjs", 5))];
    const d = computeDigest({ records: [], asyncRecords, windowMs: DEFAULT_WINDOW_MS, top: 25, now: NOW });
    expect(d.uniqueHooks).toBe(1);
    expect(d.stackTime).toHaveLength(1);
  });

  it("empty everything → all-zero digest, no crash", () => {
    const d = computeDigest({ records: [], asyncRecords: [], windowMs: DEFAULT_WINDOW_MS, top: 25, now: NOW });
    expect(d.totalFires).toBe(0);
    expect(d.stats).toEqual([]);
    expect(d.regressions).toEqual([]);
    expect(d.stackTime).toEqual([]);
  });
});

// ── renderMarkdown ────────────────────────────────────────────────────

describe("renderMarkdown", () => {
  it("includes the new 'Async stack-time by (event, tier)' section", () => {
    const md = renderMarkdown({
      stats: [], regressions: [],
      stackTime: [{ event: "Stop", tier: "T4", fires: 3, totalMs: 300, p95: 150 }],
      windowMs: DEFAULT_WINDOW_MS, totalFires: 3, asyncFires: 3, top: 25,
    });
    expect(md).toContain("## Async stack-time by (event, tier)");
    expect(md).toContain("| Stop | T4 | 3 | 300 | 150 |");
  });

  it("empty stackTime → explicit 'no async-hook-results' note (not a blank table)", () => {
    const md = renderMarkdown({
      stats: [], regressions: [], stackTime: [],
      windowMs: DEFAULT_WINDOW_MS, totalFires: 0, asyncFires: 0, top: 25,
    });
    expect(md).toContain("## Async stack-time by (event, tier)");
    expect(md).toContain("_No async-hook-results in window");
  });

  it("header line reports async fire count alongside total", () => {
    const md = renderMarkdown({
      stats: [], regressions: [], stackTime: [],
      windowMs: DEFAULT_WINDOW_MS, totalFires: 10, asyncFires: 4, top: 25,
    });
    expect(md).toContain("Total fires: 10 (async: 4)");
  });

  it("per-hook table has the new 'async' column", () => {
    const md = renderMarkdown({
      stats: [{ hook: "h.mjs", fires: 5, asyncFires: 2, p50: 1, p95: 2, p99: 3, max: 4, failures: 0, lastSeen: RECENT }],
      regressions: [], stackTime: [],
      windowMs: DEFAULT_WINDOW_MS, totalFires: 5, asyncFires: 2, top: 25,
    });
    expect(md).toContain("| hook | fires | async |");
    expect(md).toContain("| `h.mjs` | 5 | 2 |");
  });

  it("regressions section renders when regressions present", () => {
    const md = renderMarkdown({
      stats: [], stackTime: [],
      regressions: [{ hook: "r.mjs", before_p95: 100, after_p95: 250, mult: "2.50" }],
      windowMs: DEFAULT_WINDOW_MS, totalFires: 1, asyncFires: 0, top: 25,
    });
    expect(md).toContain("## ⚠ Regressions (1)");
    expect(md).toContain("| `r.mjs` | 100 | 250 | 2.50 |");
  });
});

// ── exported constants sanity ─────────────────────────────────────────

describe("exported constants", () => {
  it("regression knobs match the documented contract", () => {
    expect(REGRESSION_MULTIPLIER).toBe(1.5);
    expect(REGRESSION_MIN_MS).toBe(50);
    expect(DEFAULT_WINDOW_MS).toBe(7 * DAY_MS);
    expect(DEFAULT_TOP).toBe(25);
  });
});

// ── run() with paths override (deterministic, no real telemetry) ──────
// The opts.{jsonl,asyncJsonl,digestMd,snapshot} override exists precisely so
// these paths can be exercised against tmpdir fixtures — the spawnSync CLI
// tests below can only assert "no regressions" because they hit the real
// (usually empty) telemetry files.

describe("run() with paths override", () => {
  function fixtureDir() {
    const dir = mkdtempSync(join(tmpdir(), "dhl-run-"));
    tmpFiles.push(dir);
    return dir;
  }

  it("--check exits 1 when the snapshot baseline shows a regression", () => {
    const dir = fixtureDir();
    const jsonl = join(dir, "hook-latency.jsonl");
    const asyncJsonl = join(dir, "async.jsonl");
    const snapshot = join(dir, "snap.json");
    const digestMd = join(dir, "digest.md");
    // 10 fires at 300ms → P95 300; prior P95 100 → 3× ≥ 1.5× AND ≥ 50ms → regression.
    writeFileSync(jsonl, Array.from({ length: 10 }, () =>
      JSON.stringify(syncRec("slow.mjs", 300))).join("\n") + "\n");
    writeFileSync(asyncJsonl, "");
    writeFileSync(snapshot, JSON.stringify({ hooks: { "slow.mjs": { p95: 100 } } }));
    const code = run(["--check"], { jsonl, asyncJsonl, snapshot, digestMd });
    expect(code).toBe(1);
  });

  it("--check exits 0 when no regression vs snapshot", () => {
    const dir = fixtureDir();
    const jsonl = join(dir, "hook-latency.jsonl");
    const asyncJsonl = join(dir, "async.jsonl");
    const snapshot = join(dir, "snap.json");
    const digestMd = join(dir, "digest.md");
    writeFileSync(jsonl, Array.from({ length: 10 }, () =>
      JSON.stringify(syncRec("steady.mjs", 100))).join("\n") + "\n");
    writeFileSync(asyncJsonl, "");
    writeFileSync(snapshot, JSON.stringify({ hooks: { "steady.mjs": { p95: 90 } } }));
    const code = run(["--check"], { jsonl, asyncJsonl, snapshot, digestMd });
    expect(code).toBe(0);
  });

  it("--top N truncates the per-hook table in the rendered digest", () => {
    const dir = fixtureDir();
    const jsonl = join(dir, "hook-latency.jsonl");
    const asyncJsonl = join(dir, "async.jsonl");
    const snapshot = join(dir, "snap.json");
    const digestMd = join(dir, "digest.md");
    // 5 distinct hooks with descending P95 (500,400,300,200,100).
    const lines = [];
    for (let i = 0; i < 5; i++) lines.push(JSON.stringify(syncRec(`h${i}.mjs`, 500 - i * 100)));
    writeFileSync(jsonl, lines.join("\n") + "\n");
    writeFileSync(asyncJsonl, "");
    const code = run(["--top", "2"], { jsonl, asyncJsonl, snapshot, digestMd });
    expect(code).toBe(0);
    const md = readFileSync(digestMd, "utf8");
    // top-2 → h0 (500) and h1 (400) present; h2/h3/h4 absent from the table.
    expect(md).toContain("| `h0.mjs` |");
    expect(md).toContain("| `h1.mjs` |");
    expect(md).not.toContain("| `h2.mjs` |");
    expect(md).toContain("## Top 2 hooks by P95 latency");
  });

  it("default run writes both the digest md and the regression snapshot", () => {
    const dir = fixtureDir();
    const jsonl = join(dir, "hook-latency.jsonl");
    const asyncJsonl = join(dir, "async.jsonl");
    const snapshot = join(dir, "snap.json");
    const digestMd = join(dir, "digest.md");
    writeFileSync(jsonl, JSON.stringify(syncRec("w.mjs", 42)) + "\n");
    writeFileSync(asyncJsonl, "");
    const code = run([], { jsonl, asyncJsonl, snapshot, digestMd });
    expect(code).toBe(0);
    expect(existsSync(digestMd)).toBe(true);
    expect(existsSync(snapshot)).toBe(true);
    // snapshot round-trips the hook P95 for the next --check.
    const snap = JSON.parse(readFileSync(snapshot, "utf8"));
    expect(snap.hooks["w.mjs"].p95).toBe(42);
  });

  it("async records under paths override flow into the stack-time section", () => {
    const dir = fixtureDir();
    const jsonl = join(dir, "hook-latency.jsonl");
    const asyncJsonl = join(dir, "async.jsonl");
    const snapshot = join(dir, "snap.json");
    const digestMd = join(dir, "digest.md");
    writeFileSync(jsonl, "");
    writeFileSync(asyncJsonl,
      JSON.stringify(asyncRaw(".claude/hooks/a.mjs", 120, { event: "Stop", tier: "T4" })) + "\n");
    const code = run([], { jsonl, asyncJsonl, snapshot, digestMd });
    expect(code).toBe(0);
    const md = readFileSync(digestMd, "utf8");
    expect(md).toContain("| Stop | T4 | 1 | 120 |");
  });

  it("--no-async with paths override skips async records entirely", () => {
    const dir = fixtureDir();
    const jsonl = join(dir, "hook-latency.jsonl");
    const asyncJsonl = join(dir, "async.jsonl");
    const snapshot = join(dir, "snap.json");
    const digestMd = join(dir, "digest.md");
    writeFileSync(jsonl, JSON.stringify(syncRec("s.mjs", 5)) + "\n");
    writeFileSync(asyncJsonl,
      JSON.stringify(asyncRaw(".claude/hooks/a.mjs", 999, { event: "Stop", tier: "T4" })) + "\n");
    run(["--no-async"], { jsonl, asyncJsonl, snapshot, digestMd });
    const md = readFileSync(digestMd, "utf8");
    // Negative: the async hook must NOT appear.
    expect(md).not.toContain("a.mjs");
    expect(md).toContain("_No async-hook-results in window");
    // Positive control: the SYNC hook MUST still appear — without this, the test
    // would pass even if --no-async wrongly dropped *all* records, not just async.
    expect(md).toContain("`s.mjs`");
  });

  it("malformed snapshot JSON → run() degrades gracefully (no crash, exit 0)", () => {
    const dir = fixtureDir();
    const jsonl = join(dir, "hook-latency.jsonl");
    const asyncJsonl = join(dir, "async.jsonl");
    const snapshot = join(dir, "snap.json");
    const digestMd = join(dir, "digest.md");
    writeFileSync(jsonl, JSON.stringify(syncRec("h.mjs", 80)) + "\n");
    writeFileSync(asyncJsonl, "");
    writeFileSync(snapshot, "{ corrupt not json");
    // loadSnapshot → {} (first-run fallback) → computeDigest sees no baseline →
    // zero regressions → --check exits 0. A crash here would be a P1.
    const code = run(["--check"], { jsonl, asyncJsonl, snapshot, digestMd });
    expect(code).toBe(0);
    // and the run still rewrites a well-formed snapshot for next time.
    const snap = JSON.parse(readFileSync(snapshot, "utf8"));
    expect(snap.hooks["h.mjs"].p95).toBe(80);
    expect(snap.schemaVersion).toBe("1.1.0");
  });

  it("--top 0 floors to 1 (not a silent fallback to DEFAULT_TOP)", () => {
    const dir = fixtureDir();
    const jsonl = join(dir, "hook-latency.jsonl");
    const asyncJsonl = join(dir, "async.jsonl");
    const snapshot = join(dir, "snap.json");
    const digestMd = join(dir, "digest.md");
    const lines = [];
    for (let i = 0; i < 4; i++) lines.push(JSON.stringify(syncRec(`t${i}.mjs`, 400 - i * 100)));
    writeFileSync(jsonl, lines.join("\n") + "\n");
    writeFileSync(asyncJsonl, "");
    run(["--top", "0"], { jsonl, asyncJsonl, snapshot, digestMd });
    const md = readFileSync(digestMd, "utf8");
    // top=1 → only the highest-P95 hook (t0, 400ms) in the table.
    expect(md).toContain("## Top 1 hooks by P95 latency");
    expect(md).toContain("| `t0.mjs` |");
    expect(md).not.toContain("| `t1.mjs` |");
  });

  it("--top abc (non-numeric) falls back to DEFAULT_TOP (25), not 1", () => {
    const dir = fixtureDir();
    const jsonl = join(dir, "hook-latency.jsonl");
    const asyncJsonl = join(dir, "async.jsonl");
    const snapshot = join(dir, "snap.json");
    const digestMd = join(dir, "digest.md");
    // 30 hooks with descending P95 — must exceed DEFAULT_TOP so the cap is
    // observable. h00 = 3000ms … h29 = 100ms. With top=25: h00–h24 in the
    // table, h25–h29 truncated. This discriminates DEFAULT_TOP=25 from a
    // wrong fallback of 1 (which would show only h00).
    const lines = [];
    for (let i = 0; i < 30; i++) {
      lines.push(JSON.stringify(syncRec(`h${String(i).padStart(2, "0")}.mjs`, 3000 - i * 100)));
    }
    writeFileSync(jsonl, lines.join("\n") + "\n");
    writeFileSync(asyncJsonl, "");
    run(["--top", "abc"], { jsonl, asyncJsonl, snapshot, digestMd });
    const md = readFileSync(digestMd, "utf8");
    expect(md).toContain("## Top 25 hooks by P95 latency");
    expect(md).toContain("| `h00.mjs` |"); // highest P95 — present
    expect(md).toContain("| `h24.mjs` |"); // 25th by P95 — last in table
    expect(md).not.toContain("| `h25.mjs` |"); // 26th — truncated by DEFAULT_TOP
  });
});

// ── CLI integration (spawnSync against the real script) ───────────────

describe("CLI integration", () => {
  it("--json exits 0 and emits schemaVersion 1.1.0 with stackTimeByEventTier key", () => {
    const r = spawnSync(process.execPath, [SCRIPT, "--json"], { encoding: "utf8", timeout: 15000 });
    expect(r.status).toBe(0);
    const json = JSON.parse(r.stdout);
    expect(json.schemaVersion).toBe("1.1.0");
    expect(Array.isArray(json.stackTimeByEventTier)).toBe(true);
    expect(json.sources).toHaveLength(2);
    expect(json.sources[1]).toMatch(/async-hook-results\.jsonl$/);
    // `source` (singular) is a defensive alias for sources[0] — documents the
    // current emitted shape; not enforcing a contract with any known consumer.
    expect(json.source).toBe(json.sources[0]);
  });

  it("--no-async exits 0 (skips the async merge path)", () => {
    const r = spawnSync(process.execPath, [SCRIPT, "--no-async", "--json"], { encoding: "utf8", timeout: 15000 });
    expect(r.status).toBe(0);
    const json = JSON.parse(r.stdout);
    expect(json.asyncFires).toBe(0);
  });

  it("--check exits 0 when there are no regressions (no telemetry → no regressions)", () => {
    const r = spawnSync(process.execPath, [SCRIPT, "--check", "--json"], { encoding: "utf8", timeout: 15000 });
    expect(r.status).toBe(0);
  });

  it("--window 24h is accepted and reflected in the JSON windowMs", () => {
    const r = spawnSync(process.execPath, [SCRIPT, "--window", "24h", "--json"], { encoding: "utf8", timeout: 15000 });
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout).windowMs).toBe(24 * 3_600_000);
  });
});
