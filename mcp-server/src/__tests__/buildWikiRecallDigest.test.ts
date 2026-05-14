/**
 * buildWikiRecallDigest.test.ts — CLEANUP-MS0 / U-CLEANUP-G5 test suite
 *
 * Hermetic vitest coverage of scripts/build-wiki-recall-digest.mjs:
 *   - Pure helpers (parseArgs, deriveKeyFromPath, walkVaultDir, weeksElapsed,
 *     classifyDeletionCandidates, classifyPromotionCandidates, renderDigest)
 *   - buildDigest orchestrator: PASS, missing-counts → ok=false + suppress
 *     avalanche, schema-version drift warning, entries-as-array reject,
 *     path-safety refusal, stalePromotion reconciliation, future-dated
 *     firstSeenIso rejection, deterministic tie-break sorts.
 *   - CLI subprocess --help + a real --dry-run --json round-trip.
 *
 * All assertions are real-value (no .toBeTruthy/.toBeDefined stubs). Every
 * filesystem touch routes through a tmpdir SCRATCH that's cleaned in
 * afterEach. The consumer's hook seams (`readCountsFn`, `writeFn`, `statFn`,
 * `readdirFn`, `now`) let the orchestrator run zero-IO when desired.
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
const G5_PATH = join(REPO_ROOT, "scripts", "build-wiki-recall-digest.mjs");
const G5_URL = "file:///" + G5_PATH.replace(/\\/g, "/");

async function loadG5(): Promise<any> {
  return await import(`${G5_URL}?t=${Math.random()}`);
}

let SCRATCH = "";
beforeEach(() => {
  SCRATCH = join(
    tmpdir(),
    `prism-g5-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  mkdirSync(SCRATCH, { recursive: true });
});
afterEach(() => {
  if (SCRATCH && existsSync(SCRATCH)) {
    try { rmSync(SCRATCH, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
});

function scratchSub(name: string): string {
  const p = join(SCRATCH, name);
  mkdirSync(p, { recursive: true });
  return p;
}

const NOW_ISO = "2026-05-14T18:00:00.000Z";
const NOW_MS = Date.parse(NOW_ISO);

// Synthetic recall-counts state in canonical 1.0.0 shape.
function makeCountsState(entries: Record<string, any>): any {
  return {
    schemaVersion: "1.0.0",
    totalRecalls: Object.values(entries).reduce((a, e: any) => a + (e?.count ?? 0), 0),
    entryCount: Object.keys(entries).length,
    updatedAtIso: NOW_ISO,
    entries,
  };
}

// ═════════════════════════════════════════════════════════════════════════
// A. parseArgs
// ═════════════════════════════════════════════════════════════════════════
describe("A. parseArgs", () => {
  it("A1 — empty argv returns defaults", async () => {
    const g = await loadG5();
    const a = g.parseArgs([]);
    expect(a.dryRun).toBe(false);
    expect(a.json).toBe(false);
    expect(a.help).toBe(false);
    expect(a.counts).toBe(null);
    expect(a.now).toBe(null);
    expect(a.deletionAgeDays).toBe(g.DEFAULT_DELETION_AGE_DAYS);
    expect(a.promotionRatePerWeek).toBe(g.DEFAULT_PROMOTION_RATE_PER_WEEK);
  });
  it("A2 — accepts every flag including --counts, --out-json, --out-md, --now", async () => {
    const g = await loadG5();
    const a = g.parseArgs([
      "--repo", "R", "--counts", "C.json", "--wiki-dir", "W", "--memory-dir", "M",
      "--out-json", "O.json", "--out-md", "O.md",
      "--deletion-age-days", "30", "--promotion-rate-per-week", "10",
      "--now", "2026-05-14T00:00:00Z", "--dry-run", "--json",
    ]);
    expect(a.repo).toBe("R");
    expect(a.counts).toBe("C.json");
    expect(a.wikiDir).toBe("W");
    expect(a.memoryDir).toBe("M");
    expect(a.outJson).toBe("O.json");
    expect(a.outMd).toBe("O.md");
    expect(a.deletionAgeDays).toBe(30);
    expect(a.promotionRatePerWeek).toBe(10);
    expect(a.now).toBe("2026-05-14T00:00:00Z");
    expect(a.dryRun).toBe(true);
    expect(a.json).toBe(true);
  });
  it("A3 — malformed numeric flag falls back to default", async () => {
    const g = await loadG5();
    const a = g.parseArgs(["--deletion-age-days", "abc"]);
    expect(a.deletionAgeDays).toBe(g.DEFAULT_DELETION_AGE_DAYS);
  });
  it("A4 — --help / -h both set help true", async () => {
    const g = await loadG5();
    expect(g.parseArgs(["--help"]).help).toBe(true);
    expect(g.parseArgs(["-h"]).help).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// B. deriveKeyFromPath — three-shape contract with producer
// ═════════════════════════════════════════════════════════════════════════
describe("B. deriveKeyFromPath", () => {
  it("B1 — wiki path → wiki/<cat>/<stem>", async () => {
    const g = await loadG5();
    const r = g.deriveKeyFromPath("H:/prism/knowledge/wiki/architecture/foo.md");
    expect(r).toEqual({ kind: "wiki", key: "wiki/architecture/foo" });
  });
  it("B2 — memory path → memory/<cat>/<stem>", async () => {
    const g = await loadG5();
    const r = g.deriveKeyFromPath("H:/prism/knowledge/memories/feedback/bar.md");
    expect(r).toEqual({ kind: "memory", key: "memory/feedback/bar" });
  });
  it("B3 — auto-memory under .claude/projects/<proj>/memory/ → memory/source/<file>", async () => {
    const g = await loadG5();
    const r = g.deriveKeyFromPath("C:/Users/me/.claude/projects/H--PRISM/memory/MEMORY.md");
    expect(r).toEqual({ kind: "memory", key: "memory/source/MEMORY" });
  });
  it("B4 — non-.md returns null", async () => {
    const g = await loadG5();
    expect(g.deriveKeyFromPath("H:/prism/knowledge/wiki/architecture/foo.txt")).toBe(null);
  });
  it("B5 — empty / non-string returns null", async () => {
    const g = await loadG5();
    expect(g.deriveKeyFromPath("")).toBe(null);
    expect(g.deriveKeyFromPath(null as any)).toBe(null);
    expect(g.deriveKeyFromPath(undefined as any)).toBe(null);
  });
  it("B6 — category-less wiki path (no <cat>/<stem>) returns null", async () => {
    const g = await loadG5();
    expect(g.deriveKeyFromPath("H:/prism/knowledge/wiki/index.md")).toBe(null);
  });
  it("B7 — Windows backslash paths normalize correctly", async () => {
    const g = await loadG5();
    const r = g.deriveKeyFromPath("H:\\prism\\knowledge\\wiki\\architecture\\foo.md");
    expect(r).toEqual({ kind: "wiki", key: "wiki/architecture/foo" });
  });
});

// ═════════════════════════════════════════════════════════════════════════
// C. walkVaultDir
// ═════════════════════════════════════════════════════════════════════════
describe("C. walkVaultDir", () => {
  it("C1 — empty / nonexistent root returns []", async () => {
    const g = await loadG5();
    expect(g.walkVaultDir(join(SCRATCH, "no-such"))).toEqual([]);
  });
  it("C2 — walks knowledge/wiki/<cat>/<stem>.md entries with mtime", async () => {
    const g = await loadG5();
    const root = scratchSub("knowledge/wiki");
    mkdirSync(join(root, "architecture"), { recursive: true });
    writeFileSync(join(root, "architecture", "alpha.md"), "x");
    writeFileSync(join(root, "architecture", "beta.md"), "y");
    mkdirSync(join(root, "patterns"), { recursive: true });
    writeFileSync(join(root, "patterns", "gamma.md"), "z");
    const out = g.walkVaultDir(root);
    const keys = out.map((e: any) => e.key).sort();
    expect(keys).toEqual(["wiki/architecture/alpha", "wiki/architecture/beta", "wiki/patterns/gamma"]);
    // Every entry has a numeric mtimeMs.
    expect(out.every((e: any) => typeof e.mtimeMs === "number" && e.mtimeMs > 0)).toBe(true);
  });
  it("C3 — skips non-.md and non-files", async () => {
    const g = await loadG5();
    const root = scratchSub("knowledge/wiki");
    mkdirSync(join(root, "architecture"), { recursive: true });
    writeFileSync(join(root, "architecture", "foo.md"), "x");
    writeFileSync(join(root, "architecture", "foo.txt"), "x");
    writeFileSync(join(root, "architecture", "_template.md"), "x"); // valid stem, included
    const out = g.walkVaultDir(root);
    expect(out.map((e: any) => e.key).sort()).toEqual([
      "wiki/architecture/_template",
      "wiki/architecture/foo",
    ]);
  });
  it("C4 — depth-capped (default 3 levels under root)", async () => {
    const g = await loadG5();
    const root = scratchSub("vault-deep");
    // root/a/b/c/d/file.md — at depth 4 under root, exceeds default cap=3
    const deep = join(root, "a", "b", "c", "d");
    mkdirSync(deep, { recursive: true });
    writeFileSync(join(deep, "x.md"), "x");
    // The deep file doesn't derive a vault key anyway (no knowledge/wiki/ in
    // path), so this primarily exercises that recursion doesn't crash.
    expect(g.walkVaultDir(root)).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// D. weeksElapsed
// ═════════════════════════════════════════════════════════════════════════
describe("D. weeksElapsed", () => {
  it("D1 — normal case: 2-week-old entry → 2.0 weeks", async () => {
    const g = await loadG5();
    const past = new Date(NOW_MS - 2 * g.WEEK_MS).toISOString();
    expect(g.weeksElapsed(past, NOW_MS)).toBeCloseTo(2.0, 5);
  });
  it("D2 — brand-new entry caps at MIN_WEEKS_FOR_RATE", async () => {
    const g = await loadG5();
    const justNow = new Date(NOW_MS - 1000).toISOString(); // 1 second ago
    expect(g.weeksElapsed(justNow, NOW_MS)).toBe(g.MIN_WEEKS_FOR_RATE);
  });
  it("D3 — future-dated entry returns MIN_WEEKS_FOR_RATE (degenerate but not fatal)", async () => {
    const g = await loadG5();
    const future = new Date(NOW_MS + 60_000).toISOString();
    expect(g.weeksElapsed(future, NOW_MS)).toBe(g.MIN_WEEKS_FOR_RATE);
  });
  it("D4 — unparseable string returns null", async () => {
    const g = await loadG5();
    expect(g.weeksElapsed("not-a-date", NOW_MS)).toBe(null);
    expect(g.weeksElapsed("", NOW_MS)).toBe(null);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// E. classifyDeletionCandidates
// ═════════════════════════════════════════════════════════════════════════
describe("E. classifyDeletionCandidates", () => {
  function makeVaultEntry(key: string, ageDays: number) {
    return {
      absPath: `/fake/${key}.md`,
      key,
      kind: "wiki",
      mtimeMs: NOW_MS - ageDays * 24 * 60 * 60 * 1000,
    };
  }
  it("E1 — active entry (count >= 1) is classified 'active', not a candidate", async () => {
    const g = await loadG5();
    const vault = [makeVaultEntry("wiki/architecture/alpha", 200)];
    const counts = makeCountsState({
      "wiki/architecture/alpha": { kind: "wiki", key: "wiki/architecture/alpha", count: 5, firstSeenIso: NOW_ISO, lastSeenIso: NOW_ISO },
    });
    const r = g.classifyDeletionCandidates(vault, counts, { nowMs: NOW_MS, deletionAgeDays: 90 });
    expect(r.classifications["wiki/architecture/alpha"]).toBe("active");
    expect(r.candidates).toEqual([]);
  });
  it("E2 — absent-from-counts + age >= cutoff → 'dead' + candidate", async () => {
    const g = await loadG5();
    const vault = [makeVaultEntry("wiki/architecture/orphan", 120)];
    const counts = makeCountsState({});
    const r = g.classifyDeletionCandidates(vault, counts, { nowMs: NOW_MS, deletionAgeDays: 90 });
    expect(r.classifications["wiki/architecture/orphan"]).toBe("dead");
    expect(r.candidates.length).toBe(1);
    expect(r.candidates[0].key).toBe("wiki/architecture/orphan");
    expect(r.candidates[0].ageDays).toBe(120);
  });
  it("E3 — absent-from-counts + age < cutoff → 'young-zero', not a candidate", async () => {
    const g = await loadG5();
    const vault = [makeVaultEntry("wiki/architecture/new", 30)];
    const counts = makeCountsState({});
    const r = g.classifyDeletionCandidates(vault, counts, { nowMs: NOW_MS, deletionAgeDays: 90 });
    expect(r.classifications["wiki/architecture/new"]).toBe("young-zero");
    expect(r.candidates).toEqual([]);
  });
  it("E4 — sort is stable: ties on ageDays break by key (lexicographic)", async () => {
    const g = await loadG5();
    // Three dead entries, all age=120, fed in non-alphabetical order
    const vault = [
      makeVaultEntry("wiki/architecture/charlie", 120),
      makeVaultEntry("wiki/architecture/alpha", 120),
      makeVaultEntry("wiki/architecture/bravo", 120),
    ];
    const counts = makeCountsState({});
    const r = g.classifyDeletionCandidates(vault, counts, { nowMs: NOW_MS, deletionAgeDays: 90 });
    expect(r.candidates.map((c: any) => c.key)).toEqual([
      "wiki/architecture/alpha",
      "wiki/architecture/bravo",
      "wiki/architecture/charlie",
    ]);
  });
  it("E5 — sort prefers oldest first when ageDays differ", async () => {
    const g = await loadG5();
    const vault = [
      makeVaultEntry("wiki/architecture/newer", 100),
      makeVaultEntry("wiki/architecture/oldest", 300),
      makeVaultEntry("wiki/architecture/middle", 200),
    ];
    const counts = makeCountsState({});
    const r = g.classifyDeletionCandidates(vault, counts, { nowMs: NOW_MS, deletionAgeDays: 90 });
    expect(r.candidates.map((c: any) => c.ageDays)).toEqual([300, 200, 100]);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// F. classifyPromotionCandidates
// ═════════════════════════════════════════════════════════════════════════
describe("F. classifyPromotionCandidates", () => {
  it("F1 — entry with high rate (count=100 over 1 week) → promoted", async () => {
    const g = await loadG5();
    const firstSeen = new Date(NOW_MS - g.WEEK_MS).toISOString();
    const counts = makeCountsState({
      "wiki/architecture/hot": { kind: "wiki", key: "wiki/architecture/hot", count: 100, firstSeenIso: firstSeen, lastSeenIso: NOW_ISO },
    });
    const r = g.classifyPromotionCandidates(counts, { nowMs: NOW_MS, promotionRatePerWeek: 50 });
    expect(r.candidates.length).toBe(1);
    expect(r.candidates[0].key).toBe("wiki/architecture/hot");
    expect(r.candidates[0].ratePerWeek).toBeCloseTo(100, 1);
  });
  it("F2 — entry below rate cutoff → NOT promoted", async () => {
    const g = await loadG5();
    const firstSeen = new Date(NOW_MS - g.WEEK_MS).toISOString();
    const counts = makeCountsState({
      "wiki/architecture/lukewarm": { kind: "wiki", key: "wiki/architecture/lukewarm", count: 10, firstSeenIso: firstSeen, lastSeenIso: NOW_ISO },
    });
    const r = g.classifyPromotionCandidates(counts, { nowMs: NOW_MS, promotionRatePerWeek: 50 });
    expect(r.candidates).toEqual([]);
  });
  it("F3 — future-dated firstSeenIso → skippedMalformed, NOT a false-positive", async () => {
    const g = await loadG5();
    // firstSeenIso 5 minutes in the future — exceeds FUTURE_SKEW_MS (60s)
    const future = new Date(NOW_MS + 5 * 60_000).toISOString();
    const counts = makeCountsState({
      "wiki/architecture/bogus": { kind: "wiki", key: "wiki/architecture/bogus", count: 1000, firstSeenIso: future, lastSeenIso: future },
    });
    const r = g.classifyPromotionCandidates(counts, { nowMs: NOW_MS, promotionRatePerWeek: 50 });
    expect(r.candidates).toEqual([]);
    expect(r.skippedMalformed.length).toBe(1);
    expect(r.skippedMalformed[0].reason).toBe("future-firstSeenIso");
  });
  it("F4 — bad count (NaN / negative / wrong type) → skippedMalformed", async () => {
    const g = await loadG5();
    const fs = new Date(NOW_MS - g.WEEK_MS).toISOString();
    const counts = makeCountsState({
      "k1": { kind: "wiki", key: "k1", count: NaN, firstSeenIso: fs },
      "k2": { kind: "wiki", key: "k2", count: -1, firstSeenIso: fs },
      "k3": { kind: "wiki", key: "k3", count: "five" as any, firstSeenIso: fs },
    });
    const r = g.classifyPromotionCandidates(counts, { nowMs: NOW_MS, promotionRatePerWeek: 50 });
    expect(r.candidates).toEqual([]);
    expect(r.skippedMalformed.length).toBe(3);
    expect(r.skippedMalformed.every((s: any) => s.reason === "bad-count")).toBe(true);
  });
  it("F5 — bad kind → skippedMalformed with reason 'bad-kind'", async () => {
    const g = await loadG5();
    const fs = new Date(NOW_MS - g.WEEK_MS).toISOString();
    const counts = makeCountsState({
      "k1": { count: 100, firstSeenIso: fs }, // missing kind
    });
    const r = g.classifyPromotionCandidates(counts, { nowMs: NOW_MS, promotionRatePerWeek: 50 });
    expect(r.skippedMalformed.length).toBe(1);
    expect(r.skippedMalformed[0].reason).toBe("bad-kind");
  });
  it("F6 — stable tie-break on equal rate", async () => {
    const g = await loadG5();
    const fs = new Date(NOW_MS - g.WEEK_MS).toISOString();
    const counts = makeCountsState({
      "z-third":  { kind: "wiki", key: "z-third",  count: 100, firstSeenIso: fs },
      "a-first":  { kind: "wiki", key: "a-first",  count: 100, firstSeenIso: fs },
      "m-middle": { kind: "wiki", key: "m-middle", count: 100, firstSeenIso: fs },
    });
    const r = g.classifyPromotionCandidates(counts, { nowMs: NOW_MS, promotionRatePerWeek: 50 });
    expect(r.candidates.map((c: any) => c.key)).toEqual(["a-first", "m-middle", "z-third"]);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// G. buildDigest orchestrator — happy + edge + safety
// ═════════════════════════════════════════════════════════════════════════
describe("G. buildDigest", () => {
  function setupRepo(opts: {
    counts?: any; counts_missing?: boolean; counts_string?: string;
    wikiFiles?: Array<{ cat: string; stem: string; ageDays?: number }>;
    memoryFiles?: Array<{ cat: string; stem: string; ageDays?: number }>;
  }): string {
    const repo = scratchSub("repo");
    if (opts.counts_string != null) {
      const cp = join(repo, "mcp-server", "data", "state", "wiki-recall-counts.json");
      mkdirSync(dirname(cp), { recursive: true });
      writeFileSync(cp, opts.counts_string);
    } else if (opts.counts && !opts.counts_missing) {
      const cp = join(repo, "mcp-server", "data", "state", "wiki-recall-counts.json");
      mkdirSync(dirname(cp), { recursive: true });
      writeFileSync(cp, JSON.stringify(opts.counts, null, 2));
    }
    const wikiRoot = join(repo, "knowledge", "wiki");
    for (const f of opts.wikiFiles ?? []) {
      const dir = join(wikiRoot, f.cat);
      mkdirSync(dir, { recursive: true });
      const fp = join(dir, `${f.stem}.md`);
      writeFileSync(fp, "x");
      if (f.ageDays != null) {
        // Set mtime to ageDays in the past relative to NOW_MS.
        const fs = require("node:fs");
        const t = new Date(NOW_MS - f.ageDays * 24 * 60 * 60 * 1000);
        fs.utimesSync(fp, t, t);
      }
    }
    const memRoot = join(repo, "knowledge", "memories");
    for (const f of opts.memoryFiles ?? []) {
      const dir = join(memRoot, f.cat);
      mkdirSync(dir, { recursive: true });
      const fp = join(dir, `${f.stem}.md`);
      writeFileSync(fp, "x");
    }
    return repo;
  }

  it("G1 — happy path: tracked entry + young + old entries classify correctly", async () => {
    const g = await loadG5();
    const repo = setupRepo({
      counts: makeCountsState({
        "wiki/architecture/active": { kind: "wiki", key: "wiki/architecture/active", count: 3, firstSeenIso: NOW_ISO, lastSeenIso: NOW_ISO },
      }),
      wikiFiles: [
        { cat: "architecture", stem: "active", ageDays: 30 },
        { cat: "architecture", stem: "dead-old", ageDays: 200 },
        { cat: "architecture", stem: "young", ageDays: 30 },
      ],
    });
    const r = g.buildDigest({
      repo, deletionAgeDays: 90, promotionRatePerWeek: 50, now: NOW_ISO, dryRun: true,
    }, {});
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.summary.deletionCandidates).toBe(1);
    expect(r.deletion[0].key).toBe("wiki/architecture/dead-old");
    expect(r.summary.youngZeroCount).toBe(1); // "young" stem absent from counts but new
    expect(r.summary.promotionCandidates).toBe(0); // 3 reads is below 50/wk
  });

  it("G2 — missing counts file → ok=false + suppress deletion avalanche", async () => {
    const g = await loadG5();
    const repo = setupRepo({
      counts_missing: true,
      wikiFiles: [
        { cat: "architecture", stem: "a", ageDays: 200 },
        { cat: "architecture", stem: "b", ageDays: 200 },
        { cat: "architecture", stem: "c", ageDays: 200 },
      ],
    });
    const r = g.buildDigest({
      repo, deletionAgeDays: 90, promotionRatePerWeek: 50, now: NOW_ISO, dryRun: true,
    }, {});
    expect(r.ok).toBe(false);
    expect(r.deletion).toEqual([]);
    expect(r.summary.deletionCandidates).toBe(0);
    expect(r.countsMissing).toBe(true);
    const missingErr = r.errors.filter((e: string) => e.includes("recall-counts file missing"));
    expect(missingErr.length).toBe(1);
  });

  it("G3 — counts file is malformed JSON → ok=false + suppress + recorded as parse failure", async () => {
    const g = await loadG5();
    const repo = setupRepo({ counts_string: "{not json", wikiFiles: [
      { cat: "architecture", stem: "old", ageDays: 200 },
    ] });
    const r = g.buildDigest({
      repo, deletionAgeDays: 90, promotionRatePerWeek: 50, now: NOW_ISO, dryRun: true,
    }, {});
    expect(r.ok).toBe(false);
    expect(r.deletion).toEqual([]);
    expect(r.countsMissing).toBe(true);
    const parseErr = r.errors.filter((e: string) => e.includes("wiki-recall-counts.json"));
    expect(parseErr.length).toBeGreaterThanOrEqual(1);
  });

  it("G4 — entries-as-array (typeof === 'object' but wrong shape) → rejected", async () => {
    const g = await loadG5();
    const repo = setupRepo({
      counts: { schemaVersion: "1.0.0", totalRecalls: 0, entries: [] } as any,
      wikiFiles: [{ cat: "architecture", stem: "x", ageDays: 200 }],
    });
    const r = g.buildDigest({
      repo, deletionAgeDays: 90, promotionRatePerWeek: 50, now: NOW_ISO, dryRun: true,
    }, {});
    expect(r.ok).toBe(false);
    expect(r.countsMissing).toBe(true);
    const shapeErr = r.errors.filter((e: string) => e.includes("got array"));
    expect(shapeErr.length).toBe(1);
  });

  it("G5 — schemaVersion drift surfaces a warning but doesn't hard-fail the digest", async () => {
    const g = await loadG5();
    const repo = setupRepo({
      counts: { schemaVersion: "2.0.0", totalRecalls: 0, entries: {} } as any,
      wikiFiles: [],
    });
    const r = g.buildDigest({
      repo, deletionAgeDays: 90, promotionRatePerWeek: 50, now: NOW_ISO, dryRun: true,
    }, {});
    // The schema-mismatch warning flips ok=false via the final policy, but
    // the digest still runs end-to-end (no avalanche suppression).
    expect(r.countsMissing).toBe(false);
    const schemaErr = r.errors.filter((e: string) => e.includes("schemaVersion"));
    expect(schemaErr.length).toBe(1);
  });

  it("G6 — stale promotion: counted entry whose file is gone from disk → flagged in stalePromotion", async () => {
    const g = await loadG5();
    const repo = setupRepo({
      counts: makeCountsState({
        "wiki/architecture/renamed-or-gone": {
          kind: "wiki",
          key: "wiki/architecture/renamed-or-gone",
          count: 1000,
          firstSeenIso: new Date(NOW_MS - 7 * 24 * 60 * 60 * 1000).toISOString(),
          lastSeenIso: NOW_ISO,
        },
      }),
      // Wiki dir exists but the file with the matching key is NOT present
      wikiFiles: [{ cat: "architecture", stem: "different-file", ageDays: 30 }],
    });
    const r = g.buildDigest({
      repo, deletionAgeDays: 90, promotionRatePerWeek: 50, now: NOW_ISO, dryRun: true,
    }, {});
    expect(r.summary.promotionCandidates).toBe(1);
    expect(r.summary.stalePromotion).toBe(1);
    expect(r.stalePromotion[0]).toBe("wiki/architecture/renamed-or-gone");
  });

  it("G7 — memory/source/* promotion candidates are NOT flagged as stale (live outside repo by design)", async () => {
    const g = await loadG5();
    const repo = setupRepo({
      counts: makeCountsState({
        "memory/source/MEMORY": {
          kind: "memory",
          key: "memory/source/MEMORY",
          count: 5000,
          firstSeenIso: new Date(NOW_MS - 7 * 24 * 60 * 60 * 1000).toISOString(),
          lastSeenIso: NOW_ISO,
        },
      }),
      wikiFiles: [],
    });
    const r = g.buildDigest({
      repo, deletionAgeDays: 90, promotionRatePerWeek: 50, now: NOW_ISO, dryRun: true,
    }, {});
    expect(r.summary.promotionCandidates).toBe(1);
    expect(r.summary.stalePromotion).toBe(0);
    expect(r.stalePromotion).toEqual([]);
  });

  it("G8 — path-safety: --out-json outside repo is refused (no PRISM_DIGEST_ALLOW_ABSOLUTE_OUT)", async () => {
    const g = await loadG5();
    delete process.env.PRISM_DIGEST_ALLOW_ABSOLUTE_OUT;
    const repo = setupRepo({ counts: makeCountsState({}), wikiFiles: [] });
    const r = g.buildDigest({
      repo,
      outJson: join(SCRATCH, "outside-repo.json"), // OUTSIDE repo
      outMd: join(repo, "state", "shared", "WIKI_RECALL_DIGEST.md"),
      deletionAgeDays: 90, promotionRatePerWeek: 50, now: NOW_ISO, dryRun: false,
    }, {});
    expect(r.ok).toBe(false);
    const refuseErr = r.errors.filter((e: string) => e.includes("refuse to write outside repo"));
    expect(refuseErr.length).toBe(1);
  });

  it("G9 — apply path writes the .json + .md output", async () => {
    const g = await loadG5();
    const repo = setupRepo({
      counts: makeCountsState({
        "wiki/architecture/x": { kind: "wiki", key: "wiki/architecture/x", count: 1, firstSeenIso: NOW_ISO, lastSeenIso: NOW_ISO },
      }),
      wikiFiles: [{ cat: "architecture", stem: "x", ageDays: 30 }],
    });
    const r = g.buildDigest({
      repo, deletionAgeDays: 90, promotionRatePerWeek: 50, now: NOW_ISO, dryRun: false,
    }, {});
    expect(r.ok).toBe(true);
    expect(existsSync(join(repo, "state", "shared", "WIKI_RECALL_DIGEST.json"))).toBe(true);
    expect(existsSync(join(repo, "state", "shared", "WIKI_RECALL_DIGEST.md"))).toBe(true);
    const written = JSON.parse(readFileSync(join(repo, "state", "shared", "WIKI_RECALL_DIGEST.json"), "utf8"));
    expect(written.summary.totalEntries).toBe(1);
  });

  it("G10 — invalid --now sets ok=false with specific error", async () => {
    const g = await loadG5();
    const repo = setupRepo({ counts: makeCountsState({}), wikiFiles: [] });
    const r = g.buildDigest({
      repo, deletionAgeDays: 90, promotionRatePerWeek: 50, now: "totally-not-a-date", dryRun: true,
    }, {});
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toContain("invalid --now");
  });
});

// ═════════════════════════════════════════════════════════════════════════
// H. renderDigest rendering
// ═════════════════════════════════════════════════════════════════════════
describe("H. renderDigest", () => {
  it("H1 — empty deletion+promotion lists render with explicit 'None' notes", async () => {
    const g = await loadG5();
    const md = g.renderDigest({
      generatedAt: NOW_ISO,
      countsPath: "X",
      summary: { totalEntries: 0, totalRecalls: 0, vaultEntries: 0 },
      deletion: [], promotion: [], skippedMalformed: [],
    }, { deletionAgeDays: 90, promotionRatePerWeek: 50 });
    expect(md).toContain("Deletion candidates (0)");
    expect(md).toContain("Promotion candidates (0)");
    expect(md).toContain("None");
  });
  it("H2 — populated lists render the table rows", async () => {
    const g = await loadG5();
    const md = g.renderDigest({
      generatedAt: NOW_ISO,
      countsPath: "X",
      summary: { totalEntries: 2, totalRecalls: 100, vaultEntries: 2 },
      deletion: [{ key: "wiki/architecture/dead", kind: "wiki", ageDays: 365 }],
      promotion: [{ key: "wiki/architecture/hot", kind: "wiki", count: 100, ratePerWeek: 100, lastSeenIso: NOW_ISO }],
      skippedMalformed: [],
    }, { deletionAgeDays: 90, promotionRatePerWeek: 50 });
    expect(md).toContain("wiki/architecture/dead");
    expect(md).toContain("365");
    expect(md).toContain("wiki/architecture/hot");
    expect(md).toContain("100");
  });
  it("H3 — over RENDER_LIMIT entries show truncation marker", async () => {
    const g = await loadG5();
    const deletionMany = Array.from({ length: g.RENDER_LIMIT + 10 }, (_, i) => ({
      key: `wiki/architecture/k${i.toString().padStart(3, "0")}`,
      kind: "wiki",
      ageDays: 100 + i,
    }));
    const md = g.renderDigest({
      generatedAt: NOW_ISO,
      countsPath: "X",
      summary: { totalEntries: 0, totalRecalls: 0, vaultEntries: 0 },
      deletion: deletionMany,
      promotion: [],
      skippedMalformed: [],
    }, { deletionAgeDays: 90, promotionRatePerWeek: 50 });
    expect(md).toContain("10 more");
  });
});

// ═════════════════════════════════════════════════════════════════════════
// I. CLI subprocess smoke test
// ═════════════════════════════════════════════════════════════════════════
describe("I. CLI subprocess", () => {
  it("I1 — --help exits 0 and prints usage", async () => {
    const cp = await import("node:child_process");
    const r = cp.spawnSync(process.execPath, [G5_PATH, "--help"], {
      encoding: "utf8", timeout: 10_000,
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("build-wiki-recall-digest.mjs");
    expect(r.stdout).toContain("--dry-run");
    expect(r.stdout).toContain("--deletion-age-days");
  });
  it("I2 — missing-counts CLI exits 1 with JSON failureCategory in errors[]", async () => {
    const cp = await import("node:child_process");
    const repo = scratchSub("subprocess-repo"); // has no mcp-server/data/state/...json
    const r = cp.spawnSync(process.execPath, [
      G5_PATH,
      "--repo", repo,
      "--dry-run",
      "--json",
    ], { encoding: "utf8", timeout: 10_000 });
    expect(r.status).toBe(1);
    const parsed = JSON.parse(r.stdout.trim().split("\n").pop()!);
    expect(parsed.ok).toBe(false);
    expect(parsed.countsMissing).toBe(true);
    expect(r.stderr).not.toContain("fatal");
  });
});

// ═════════════════════════════════════════════════════════════════════════
// J. Public exports
// ═════════════════════════════════════════════════════════════════════════
describe("J. exports", () => {
  it("J1 — SCHEMA_VERSION is a positive integer", async () => {
    const g = await loadG5();
    expect(Number.isInteger(g.SCHEMA_VERSION)).toBe(true);
    expect(g.SCHEMA_VERSION).toBe(1);
  });
  it("J2 — DEFAULT_DELETION_AGE_DAYS + DEFAULT_PROMOTION_RATE_PER_WEEK are positive", async () => {
    const g = await loadG5();
    expect(g.DEFAULT_DELETION_AGE_DAYS).toBe(90);
    expect(g.DEFAULT_PROMOTION_RATE_PER_WEEK).toBe(50);
  });
  it("J3 — MIN_WEEKS_FOR_RATE is exported and is a finite fraction", async () => {
    const g = await loadG5();
    expect(Number.isFinite(g.MIN_WEEKS_FOR_RATE)).toBe(true);
    expect(g.MIN_WEEKS_FOR_RATE).toBeGreaterThan(0);
    expect(g.MIN_WEEKS_FOR_RATE).toBeLessThan(1);
  });
  it("J4 — FUTURE_SKEW_MS is exported and is in milliseconds", async () => {
    const g = await loadG5();
    expect(Number.isInteger(g.FUTURE_SKEW_MS)).toBe(true);
    expect(g.FUTURE_SKEW_MS).toBe(60 * 1000);
  });
  it("J5 — DAY_MS / WEEK_MS / RENDER_LIMIT exported as expected ms / count", async () => {
    const g = await loadG5();
    expect(g.DAY_MS).toBe(24 * 60 * 60 * 1000);
    expect(g.WEEK_MS).toBe(7 * 24 * 60 * 60 * 1000);
    expect(g.RENDER_LIMIT).toBeGreaterThan(0);
  });
});
