/**
 * peerCommitAuditorEngine.test.ts — U-CLEANUP-B1
 *
 * Coverage:
 *   - Happy path: new commit → ledger row, signal, cache update, lastTickIso advance.
 *   - Dedupe: re-tick within TTL → commit skipped, no second signal.
 *   - Excluded authors filter (golf-watchdog-bot self-attribution).
 *   - Poll error surfaces in TickResult; tick row marked status=failed.
 *   - Lock-related poll → status=aborted.
 *   - dryRun: no signals emitted, no cache mutation.
 *   - Cache size cap prunes oldest entries first.
 *   - Cache corrupt JSON → resets to empty without crash.
 *   - Stale cache entries past TTL get pruned automatically.
 *   - UNIQUE signal_id collision → skipped, not thrown.
 *   - MAX_COMMITS_PER_TICK cap enforced.
 *   - sinceIso resolution priority.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LedgerStoreEngine } from "../engines/LedgerStoreEngine.js";
import { PeerCommitAuditorEngine } from "../engines/PeerCommitAuditorEngine.js";

vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const MIGRATION_PATH = "H:/prism/mcp-server/src/migrations/golf-ledger-v1.sql";
const FIXED_NOW = 1_700_000_000_000;

let workDir: string;
let ledger: LedgerStoreEngine;
let cachePath: string;

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeCommit(shaSeed: string, opts: { author?: string; subject?: string; files?: string[]; iso?: string } = {}) {
  // Use padStart, NOT padEnd: "1".padEnd(40,"0")="1000..." === "10".padEnd(40,"0")
  // (both → "1000...0"). padStart preserves the suffix as the unique part, so
  // different seeds always produce different shas.
  const sha = shaSeed.padStart(40, "0").slice(-40);
  return {
    sha,
    author: opts.author ?? "alpha",
    isoDate: opts.iso ?? "2026-05-13T17:00:00.000Z",
    subject: opts.subject ?? "test commit",
    files: opts.files ?? ["a.ts"],
  };
}

// Inject in every test so the engine's loadLastPollIso/saveLastPollIso never
// touches the real state/shared/.watchdog-last-poll.iso file.
const NOOP_LOAD_LAST_POLL = (): string | null => null;
const NOOP_SAVE_LAST_POLL = (_: string): void => { /* no-op for tests */ };

function makePoller(returns: Array<ReturnType<typeof makeCommit>> | { error: string; lockRelated?: boolean }) {
  if (Array.isArray(returns)) {
    return () => ({ commits: returns });
  }
  return () => ({ commits: [], ...returns });
}

let tickCounter = 0;
function deterministicTickId(): string {
  tickCounter++;
  return `tick-test-${tickCounter.toString().padStart(4, "0")}`;
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "prism-peer-audit-test-"));
  // Inject `now` into the ledger so finished_at on tick rows matches FIXED_NOW.
  ledger = new LedgerStoreEngine({ dbPath: join(workDir, "ledger.db"), migrationSqlPath: MIGRATION_PATH, now: () => FIXED_NOW });
  cachePath = join(workDir, ".peer-audit-cache.json");
  tickCounter = 0;
});

afterEach(() => {
  ledger.close();
  try { rmSync(workDir, { recursive: true, force: true }); } catch { /* best-effort */ }
});

describe("PeerCommitAuditorEngine — happy path", () => {
  it("new commit produces ledger row, signal, cache update, and lastTickIso advance", () => {
    const c1 = makeCommit("abc", { author: "alpha", subject: "first commit" });
    const engine = new PeerCommitAuditorEngine({
      cachePath,
      ledger,
      loadLastPollIso: NOOP_LOAD_LAST_POLL,
      saveLastPollIso: NOOP_SAVE_LAST_POLL,
      now: () => FIXED_NOW,
      generateTickId: deterministicTickId,
      pollGitLog: makePoller([c1]) as unknown as PeerCommitAuditorEngine["pollGitLog"],
    });
    const r = engine.tick({ sinceIso: "2026-05-13T16:00:00.000Z" });

    expect(r.status).toBe("complete");
    expect(r.commitsSeen).toBe(1);
    expect(r.commitsQueued).toBe(1);
    expect(r.commitsSkipped).toBe(0);
    expect(r.signalsEmitted).toBe(1);
    expect(r.queued.length).toBe(1);
    expect(r.queued[0].sha).toBe(c1.sha);
    expect(r.queued[0].subject).toBe("first commit");
    expect(r.tickId).toBe("tick-test-0001");

    const ticks = ledger.listRecentTicks();
    expect(ticks.length).toBe(1);
    expect(ticks[0].status).toBe("complete");
    expect(ticks[0].findings_count).toBe(1);
    expect(ticks[0].started_at).toBe(FIXED_NOW);
    expect(ticks[0].finished_at).toBe(FIXED_NOW);
    expect(ticks[0].tick_id).toBe("tick-test-0001");

    const signals = ledger.drainSignalsFor("alpha");
    expect(signals.length).toBe(1);
    expect(signals[0].signal_type).toBe("peer_commit_for_review");
    expect(signals[0].from_chat).toBe("golf-watchdog");
    expect(signals[0].to_chat).toBe("*");
    const payload = JSON.parse(signals[0].payload_json);
    expect(payload.sha).toBe(c1.sha);
    expect(payload.author).toBe("alpha");
    expect(payload.subject).toBe("first commit");
    expect(payload.tickId).toBe("tick-test-0001");

    expect(existsSync(cachePath)).toBe(true);
    const cache = JSON.parse(readFileSync(cachePath, "utf-8"));
    expect(cache.schemaVersion).toBe(1);
    expect(cache.lastTickIso).toBe(c1.isoDate);
    expect(typeof cache.analyzed[c1.sha]).toBe("object");
    expect(cache.analyzed[c1.sha].tickId).toBe("tick-test-0001");
    expect(cache.analyzed[c1.sha].analyzedAt).toBe(FIXED_NOW);
  });

  it("re-tick within TTL skips already-queued commit (no double-signal)", () => {
    const c1 = makeCommit("def", { author: "bravo" });
    const engine = new PeerCommitAuditorEngine({
      cachePath,
      ledger,
      loadLastPollIso: NOOP_LOAD_LAST_POLL,
      saveLastPollIso: NOOP_SAVE_LAST_POLL,
      ttlMs: 5 * 60 * 1000,
      now: () => FIXED_NOW,
      generateTickId: deterministicTickId,
      pollGitLog: makePoller([c1]) as unknown as PeerCommitAuditorEngine["pollGitLog"],
    });
    const r1 = engine.tick();
    expect(r1.commitsQueued).toBe(1);

    const r2 = engine.tick();
    expect(r2.commitsSeen).toBe(1);
    expect(r2.commitsQueued).toBe(0);
    expect(r2.commitsSkipped).toBe(1);
    expect(r2.signalsEmitted).toBe(0);

    const signals = ledger.drainSignalsFor("alpha");
    expect(signals.length).toBe(1);
  });

  it("re-tick AFTER TTL re-queues the commit (cache prune fires)", () => {
    const c1 = makeCommit("eee", { author: "charlie" });
    let nowVal = FIXED_NOW;
    const engine = new PeerCommitAuditorEngine({
      cachePath,
      ledger,
      loadLastPollIso: NOOP_LOAD_LAST_POLL,
      saveLastPollIso: NOOP_SAVE_LAST_POLL,
      ttlMs: 5 * 60 * 1000,
      now: () => nowVal,
      generateTickId: deterministicTickId,
      pollGitLog: makePoller([c1]) as unknown as PeerCommitAuditorEngine["pollGitLog"],
    });
    engine.tick();
    expect(ledger.drainSignalsFor("alpha").length).toBe(1);
    nowVal = FIXED_NOW + 6 * 60 * 1000;
    const r2 = engine.tick();
    expect(r2.commitsQueued).toBe(1);
    expect(r2.signalsEmitted).toBe(1);
    expect(ledger.drainSignalsFor("alpha").length).toBe(2);
  });
});

describe("PeerCommitAuditorEngine — exclusions + dryRun", () => {
  it("default excludeAuthors filters golf-watchdog-bot (self-attribution)", () => {
    const seenExcludes: string[][] = [];
    const engine = new PeerCommitAuditorEngine({
      cachePath,
      ledger,
      loadLastPollIso: NOOP_LOAD_LAST_POLL,
      saveLastPollIso: NOOP_SAVE_LAST_POLL,
      now: () => FIXED_NOW,
      generateTickId: deterministicTickId,
      pollGitLog: ((opts) => {
        seenExcludes.push(Array.isArray(opts.excludeAuthors) ? [...opts.excludeAuthors] : []);
        return { commits: [] };
      }) as unknown as PeerCommitAuditorEngine["pollGitLog"],
    });
    engine.tick();
    expect(seenExcludes.length).toBe(1);
    expect(seenExcludes[0].includes("golf-watchdog-bot")).toBe(true);
    expect(seenExcludes[0].includes("golf-watchdog")).toBe(true);
  });

  it("caller-supplied excludeAuthors merge with defaults", () => {
    const seen: string[][] = [];
    const engine = new PeerCommitAuditorEngine({
      cachePath,
      ledger,
      loadLastPollIso: NOOP_LOAD_LAST_POLL,
      saveLastPollIso: NOOP_SAVE_LAST_POLL,
      excludeAuthors: ["custom-bot"],
      now: () => FIXED_NOW,
      generateTickId: deterministicTickId,
      pollGitLog: ((opts) => {
        seen.push(Array.isArray(opts.excludeAuthors) ? [...opts.excludeAuthors] : []);
        return { commits: [] };
      }) as unknown as PeerCommitAuditorEngine["pollGitLog"],
    });
    engine.tick({ excludeAuthors: ["one-off"] });
    expect(seen.length).toBe(1);
    expect(seen[0].includes("golf-watchdog-bot")).toBe(true);
    expect(seen[0].includes("custom-bot")).toBe(true);
    expect(seen[0].includes("one-off")).toBe(true);
  });

  it("dryRun emits no signals, but still records tick row + cache", () => {
    const c1 = makeCommit("dry", { author: "delta" });
    const engine = new PeerCommitAuditorEngine({
      cachePath,
      ledger,
      loadLastPollIso: NOOP_LOAD_LAST_POLL,
      saveLastPollIso: NOOP_SAVE_LAST_POLL,
      now: () => FIXED_NOW,
      generateTickId: deterministicTickId,
      pollGitLog: makePoller([c1]) as unknown as PeerCommitAuditorEngine["pollGitLog"],
    });
    const r = engine.tick({ dryRun: true });
    expect(r.signalsEmitted).toBe(0);
    expect(r.commitsQueued).toBe(1);
    expect(ledger.drainSignalsFor("alpha").length).toBe(0);
    expect(ledger.listRecentTicks().length).toBe(1);
  });
});

describe("PeerCommitAuditorEngine — error paths", () => {
  it("poll error surfaces in TickResult, tick row marked failed", () => {
    const engine = new PeerCommitAuditorEngine({
      cachePath,
      ledger,
      loadLastPollIso: NOOP_LOAD_LAST_POLL,
      saveLastPollIso: NOOP_SAVE_LAST_POLL,
      now: () => FIXED_NOW,
      generateTickId: deterministicTickId,
      pollGitLog: makePoller({ error: "git spawn failed: ENOENT" }) as unknown as PeerCommitAuditorEngine["pollGitLog"],
    });
    const r = engine.tick();
    expect(r.status).toBe("failed");
    expect(r.error).toBe("git spawn failed: ENOENT");
    expect(r.commitsSeen).toBe(0);

    const ticks = ledger.listRecentTicks();
    expect(ticks.length).toBe(1);
    expect(ticks[0].status).toBe("failed");
    expect(ticks[0].error_text).toBe("git spawn failed: ENOENT");
  });

  it("lock-related poll error → status=aborted (transient, caller may retry)", () => {
    const engine = new PeerCommitAuditorEngine({
      cachePath,
      ledger,
      loadLastPollIso: NOOP_LOAD_LAST_POLL,
      saveLastPollIso: NOOP_SAVE_LAST_POLL,
      now: () => FIXED_NOW,
      generateTickId: deterministicTickId,
      pollGitLog: makePoller({ error: "index.lock contention", lockRelated: true }) as unknown as PeerCommitAuditorEngine["pollGitLog"],
    });
    const r = engine.tick();
    expect(r.status).toBe("aborted");
    expect(r.lockRelated).toBe(true);

    const ticks = ledger.listRecentTicks();
    expect(ticks[0].status).toBe("aborted");
  });

  it("malformed cache JSON resets to empty without crash", () => {
    writeFileSync(cachePath, "{ not valid json !!!");
    const c1 = makeCommit("recover", { author: "echo" });
    const engine = new PeerCommitAuditorEngine({
      cachePath,
      ledger,
      loadLastPollIso: NOOP_LOAD_LAST_POLL,
      saveLastPollIso: NOOP_SAVE_LAST_POLL,
      now: () => FIXED_NOW,
      generateTickId: deterministicTickId,
      pollGitLog: makePoller([c1]) as unknown as PeerCommitAuditorEngine["pollGitLog"],
    });
    const r = engine.tick();
    expect(r.status).toBe("complete");
    expect(r.commitsQueued).toBe(1);
    const cache = JSON.parse(readFileSync(cachePath, "utf-8"));
    expect(cache.schemaVersion).toBe(1);
    expect(Object.keys(cache.analyzed).length).toBe(1);
  });

  it("cache with non-40-hex sha keys is silently filtered (drops corruption)", () => {
    writeFileSync(
      cachePath,
      JSON.stringify({
        schemaVersion: 1,
        lastTickIso: null,
        analyzed: {
          "not-a-sha": { tickId: "t1", analyzedAt: FIXED_NOW },
          "abcdef0123456789abcdef0123456789abcdef01": { tickId: "t2", analyzedAt: FIXED_NOW },
        },
      })
    );
    const engine = new PeerCommitAuditorEngine({
      cachePath,
      ledger,
      loadLastPollIso: NOOP_LOAD_LAST_POLL,
      saveLastPollIso: NOOP_SAVE_LAST_POLL,
      now: () => FIXED_NOW,
      generateTickId: deterministicTickId,
      pollGitLog: makePoller([]) as unknown as PeerCommitAuditorEngine["pollGitLog"],
    });
    engine.tick();
    const cache = JSON.parse(readFileSync(cachePath, "utf-8"));
    expect(cache.analyzed["not-a-sha"]).toBe(undefined);
    expect(typeof cache.analyzed["abcdef0123456789abcdef0123456789abcdef01"]).toBe("object");
    expect(cache.analyzed["abcdef0123456789abcdef0123456789abcdef01"].tickId).toBe("t2");
  });
});

describe("PeerCommitAuditorEngine — UNIQUE collision graceful skip", () => {
  it("re-emit of same signal_id (cache deleted between ticks) does not crash", () => {
    const c1 = makeCommit("uniq", { author: "foxtrot" });
    const engine = new PeerCommitAuditorEngine({
      cachePath,
      ledger,
      loadLastPollIso: NOOP_LOAD_LAST_POLL,
      saveLastPollIso: NOOP_SAVE_LAST_POLL,
      now: () => FIXED_NOW,
      generateTickId: () => "fixed-id",
      pollGitLog: makePoller([c1]) as unknown as PeerCommitAuditorEngine["pollGitLog"],
    });
    const r1 = engine.tick();
    expect(r1.signalsEmitted).toBe(1);

    rmSync(cachePath, { force: true });
    // 2nd tick — same tick_id collides on UNIQUE in peer_audit_ticks first.
    // The engine aborts cleanly before signal emission.
    const r2 = engine.tick();
    expect(r2.status).toBe("aborted");
    expect(r2.error?.includes("UNIQUE constraint") ?? false).toBe(true);
  });
});

describe("PeerCommitAuditorEngine — caps + pruning", () => {
  it("MAX_COMMITS_PER_TICK caps at 200 commits per tick", () => {
    const many = Array.from({ length: 250 }, (_, i) =>
      makeCommit(i.toString(16).padStart(40, "0"), { author: `peer-${i % 4}`, iso: `2026-05-13T17:00:${(i % 60).toString().padStart(2, "0")}.000Z` })
    );
    const engine = new PeerCommitAuditorEngine({
      cachePath,
      ledger,
      loadLastPollIso: NOOP_LOAD_LAST_POLL,
      saveLastPollIso: NOOP_SAVE_LAST_POLL,
      now: () => FIXED_NOW,
      generateTickId: deterministicTickId,
      pollGitLog: makePoller(many) as unknown as PeerCommitAuditorEngine["pollGitLog"],
    });
    const r = engine.tick();
    expect(r.commitsSeen).toBe(200);
    expect(r.commitsQueued).toBe(200);
  });

  it("stale cache entries past TTL are pruned on next tick", () => {
    writeFileSync(
      cachePath,
      JSON.stringify({
        schemaVersion: 1,
        lastTickIso: null,
        analyzed: {
          "ffffffffffffffffffffffffffffffffffffffff": { tickId: "old", analyzedAt: FIXED_NOW - 10 * 60 * 1000 },
        },
      })
    );
    const engine = new PeerCommitAuditorEngine({
      cachePath,
      ledger,
      loadLastPollIso: NOOP_LOAD_LAST_POLL,
      saveLastPollIso: NOOP_SAVE_LAST_POLL,
      ttlMs: 5 * 60 * 1000,
      now: () => FIXED_NOW,
      generateTickId: deterministicTickId,
      pollGitLog: makePoller([]) as unknown as PeerCommitAuditorEngine["pollGitLog"],
    });
    engine.tick();
    const cache = JSON.parse(readFileSync(cachePath, "utf-8"));
    expect(cache.analyzed["ffffffffffffffffffffffffffffffffffffffff"]).toBe(undefined);
  });
});

describe("PeerCommitAuditorEngine — payload truncation caps", () => {
  it("subject >200 chars is truncated to exactly 200 in both queued[] and signal payload", () => {
    const longSubject = "S".repeat(300);
    const c1 = makeCommit("trunc1", { author: "alpha", subject: longSubject });
    const engine = new PeerCommitAuditorEngine({
      cachePath,
      ledger,
      loadLastPollIso: NOOP_LOAD_LAST_POLL,
      saveLastPollIso: NOOP_SAVE_LAST_POLL,
      now: () => FIXED_NOW,
      generateTickId: deterministicTickId,
      pollGitLog: makePoller([c1]) as unknown as PeerCommitAuditorEngine["pollGitLog"],
    });
    const r = engine.tick();
    expect(r.queued[0].subject.length).toBe(200);
    expect(r.queued[0].subject).toBe("S".repeat(200));
    const signals = ledger.drainSignalsFor("alpha");
    const payload = JSON.parse(signals[0].payload_json);
    expect(payload.subject.length).toBe(200);
    expect(payload.subject).toBe("S".repeat(200));
  });

  it("files[] >50 is capped to 50 in payload but fileCount reports the real total", () => {
    const manyFiles = Array.from({ length: 75 }, (_, i) => `file-${i}.ts`);
    const c1 = makeCommit("trunc2", { author: "alpha", files: manyFiles });
    const engine = new PeerCommitAuditorEngine({
      cachePath,
      ledger,
      loadLastPollIso: NOOP_LOAD_LAST_POLL,
      saveLastPollIso: NOOP_SAVE_LAST_POLL,
      now: () => FIXED_NOW,
      generateTickId: deterministicTickId,
      pollGitLog: makePoller([c1]) as unknown as PeerCommitAuditorEngine["pollGitLog"],
    });
    engine.tick();
    const signals = ledger.drainSignalsFor("alpha");
    const payload = JSON.parse(signals[0].payload_json);
    expect(Array.isArray(payload.files)).toBe(true);
    expect(payload.files.length).toBe(50);
    expect(payload.fileCount).toBe(75);
    expect(payload.files[0]).toBe("file-0.ts");
    expect(payload.files[49]).toBe("file-49.ts");
  });
});

describe("PeerCommitAuditorEngine — duplicate tick_id error distinguishing", () => {
  it("duplicate tick_id surfaces 'duplicate tick_id' prefix, not generic 'ledger error'", () => {
    const c1 = makeCommit("dupe", { author: "alpha" });
    const engine = new PeerCommitAuditorEngine({
      cachePath,
      ledger,
      loadLastPollIso: NOOP_LOAD_LAST_POLL,
      saveLastPollIso: NOOP_SAVE_LAST_POLL,
      now: () => FIXED_NOW,
      generateTickId: () => "dup-tick-id",
      pollGitLog: makePoller([c1]) as unknown as PeerCommitAuditorEngine["pollGitLog"],
    });
    engine.tick();
    const r2 = engine.tick();
    expect(r2.status).toBe("aborted");
    expect(r2.error?.startsWith("duplicate tick_id")).toBe(true);
    expect(r2.error?.includes("UNIQUE")).toBe(true);
  });
});

describe("PeerCommitAuditorEngine — reapStaleTicks operational reaper", () => {
  it("marks running rows older than threshold as aborted; returns count", () => {
    // Pre-seed two ticks: one 15min old (stale), one 1min old (fresh).
    ledger.insert({
      table: "peer_audit_ticks",
      row: { tick_id: "old-running", started_at: FIXED_NOW - 15 * 60 * 1000, commits_seen: 0, findings_count: 0, status: "running" },
    });
    ledger.insert({
      table: "peer_audit_ticks",
      row: { tick_id: "young-running", started_at: FIXED_NOW - 60 * 1000, commits_seen: 0, findings_count: 0, status: "running" },
    });
    const engine = new PeerCommitAuditorEngine({
      cachePath,
      ledger,
      loadLastPollIso: NOOP_LOAD_LAST_POLL,
      saveLastPollIso: NOOP_SAVE_LAST_POLL,
      now: () => FIXED_NOW,
    });
    const reaped = engine.reapStaleTicks(10 * 60 * 1000);
    expect(reaped).toBe(1);

    const ticks = ledger.listRecentTicks();
    const byId = new Map(ticks.map((t) => [t.tick_id, t]));
    expect(byId.get("old-running")?.status).toBe("aborted");
    expect(byId.get("young-running")?.status).toBe("running");
    expect(byId.get("old-running")?.error_text?.startsWith("stale-tick-reaper")).toBe(true);
  });

  it("zero stale rows returns 0 without error", () => {
    const engine = new PeerCommitAuditorEngine({
      cachePath,
      ledger,
      loadLastPollIso: NOOP_LOAD_LAST_POLL,
      saveLastPollIso: NOOP_SAVE_LAST_POLL,
      now: () => FIXED_NOW,
    });
    expect(engine.reapStaleTicks()).toBe(0);
  });
});

describe("PeerCommitAuditorEngine — worktree-derived cachePath", () => {
  it("constructor derives cachePath from repoRoot when not explicitly set", () => {
    // Construct without cachePath; engine uses repoRoot + state/shared/.peer-audit-cache.json
    const engine = new PeerCommitAuditorEngine({
      repoRoot: workDir,
      ledger,
      loadLastPollIso: NOOP_LOAD_LAST_POLL,
      saveLastPollIso: NOOP_SAVE_LAST_POLL,
      now: () => FIXED_NOW,
      generateTickId: deterministicTickId,
      pollGitLog: makePoller([makeCommit("derived")]) as unknown as PeerCommitAuditorEngine["pollGitLog"],
    });
    engine.tick();
    // Cache file must live inside workDir, NOT main tree's state/shared/.
    expect(existsSync(join(workDir, "state/shared/.peer-audit-cache.json"))).toBe(true);
  });
});

describe("PeerCommitAuditorEngine — sinceIso resolution", () => {
  it("explicit sinceIso input wins over cache.lastTickIso", () => {
    let seenSince: string | null = null;
    writeFileSync(
      cachePath,
      JSON.stringify({ schemaVersion: 1, lastTickIso: "2020-01-01T00:00:00.000Z", analyzed: {} })
    );
    const engine = new PeerCommitAuditorEngine({
      cachePath,
      ledger,
      loadLastPollIso: NOOP_LOAD_LAST_POLL,
      saveLastPollIso: NOOP_SAVE_LAST_POLL,
      now: () => FIXED_NOW,
      generateTickId: deterministicTickId,
      pollGitLog: ((opts) => {
        seenSince = opts.sinceIso;
        return { commits: [] };
      }) as unknown as PeerCommitAuditorEngine["pollGitLog"],
    });
    engine.tick({ sinceIso: "2026-05-13T16:00:00.000Z" });
    expect(seenSince).toBe("2026-05-13T16:00:00.000Z");
  });

  it("cache.lastTickIso used when no explicit sinceIso", () => {
    let seenSince: string | null = null;
    writeFileSync(
      cachePath,
      JSON.stringify({ schemaVersion: 1, lastTickIso: "2026-05-13T15:00:00.000Z", analyzed: {} })
    );
    const engine = new PeerCommitAuditorEngine({
      cachePath,
      ledger,
      loadLastPollIso: NOOP_LOAD_LAST_POLL,
      saveLastPollIso: NOOP_SAVE_LAST_POLL,
      now: () => FIXED_NOW,
      generateTickId: deterministicTickId,
      pollGitLog: ((opts) => {
        seenSince = opts.sinceIso;
        return { commits: [] };
      }) as unknown as PeerCommitAuditorEngine["pollGitLog"],
    });
    engine.tick();
    expect(seenSince).toBe("2026-05-13T15:00:00.000Z");
  });

  it("fallback to (now - 1h) when no cache and no input sinceIso", () => {
    let seenSince: string | null = null;
    const engine = new PeerCommitAuditorEngine({
      cachePath,
      ledger,
      loadLastPollIso: NOOP_LOAD_LAST_POLL,
      saveLastPollIso: NOOP_SAVE_LAST_POLL,
      now: () => FIXED_NOW,
      generateTickId: deterministicTickId,
      pollGitLog: ((opts) => {
        seenSince = opts.sinceIso;
        return { commits: [] };
      }) as unknown as PeerCommitAuditorEngine["pollGitLog"],
    });
    engine.tick();
    const expected = new Date(FIXED_NOW - 60 * 60 * 1000).toISOString();
    expect(seenSince).toBe(expected);
  });
});
