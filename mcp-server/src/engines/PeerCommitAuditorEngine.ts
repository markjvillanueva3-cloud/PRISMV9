/**
 * PeerCommitAuditorEngine — CLEANUP-MS0 / U-CLEANUP-B1
 *
 * Detects new peer-chat commits in the shared repo and ENQUEUES them for
 * downstream review (B4 commit-reviewer-dispatch). Does NOT run the review
 * itself — its job is "this commit warrants review" + signal emission +
 * ledger logging. The dispatch + actual review live downstream of B11/B2.
 *
 * RENAMED from WatchdogEngine (R1-B2) because the codebase already has
 * `.claude/hooks/tool-watchdog.mjs`, `autonomous-loop-watchdog.mjs`, and
 * `auto-precompact-watchdog.mjs`. PeerCommitAuditorEngine names the unique
 * concern: auditing PEER GIT COMMITS, not local tool runtimes.
 *
 * DESIGN
 *   - Uses B3 (git-log-tail.mjs) as the canonical commit-poll primitive.
 *     Every consumer that polls git log shares one timeout/lock-retry/UTC-Z
 *     contract via that module.
 *   - Uses B10 (LedgerStoreEngine) to persist peer_audit_ticks + emit
 *     chat_bus_signals. The ledger is the source of truth; this engine
 *     never writes its own JSONL.
 *   - Maintains a 5-min TTL cache at `state/shared/.peer-audit-cache.json`
 *     so cron invocations every 1 min don't re-enqueue the same commit 5
 *     times. Cache survives crashes via atomic tmp+rename writes.
 *
 * CLI ENTRYPOINT
 *   `tickFromCli()` is the cron-friendly I/O envelope per R1-B1: PowerShell
 *   invokes `node -e "import('./PeerCommitAuditorEngine.js').then(m => m.tickFromCli())"`,
 *   the function reads optional flags from process.argv, runs `tick()`, and
 *   writes a JSON result to stdout (exit 0 on success or non-fatal error,
 *   exit 2 on bad input, exit 3 on ledger/git failure).
 *
 * @see H:/prism/state/shared/specs/GOLF-WATCHDOG-MS0-2026-05-13.md §R1-B1, §R1-B2
 */

import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { tail, loadLastPollIso, saveLastPollIso } from "../../../.claude/helpers/git-log-tail.mjs";
import { LedgerStoreEngine, getLedgerStoreEngine } from "./LedgerStoreEngine.js";

// ── CONFIG (Windows-only PRISM fleet; override via opts for cross-platform) ──

const DEFAULT_REPO_ROOT = "H:/prism";
// Default cachePath is derived from repoRoot in the constructor so worktree
// callers (H:/prism-<scope>/) get a worktree-local cache and don't trip the
// cross-worktree firewall on state/shared/*.json. If you instantiate with
// `repoRoot: "H:/prism-golf-watchdog"`, the cache lives in that worktree.
const DEFAULT_CACHE_RELATIVE_PATH = "state/shared/.peer-audit-cache.json";
const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_EXCLUDE_AUTHORS: readonly string[] = Object.freeze([
  "golf-watchdog-bot",
  "golf-watchdog",
]);
const CACHE_SCHEMA_VERSION = 1;
const MAX_CACHE_ENTRIES = 5_000;
const MAX_COMMITS_PER_TICK = 200;
const MIN_SINCE_HOURS_FALLBACK = 1;
const MAX_SUBJECT_BYTES = 200;
const MAX_FILES_IN_PAYLOAD = 50;

/**
 * Exported caps so B2 dispatcher / B4 reviewer-dispatch / F8 dashboard can
 * introspect the same values the engine enforces. Mirrors the H7
 * ASYNC_HOOK_LIMITS / B3 GIT_LOG_TAIL_LIMITS pattern.
 */
export const PEER_AUDIT_LIMITS = Object.freeze({
  DEFAULT_REPO_ROOT,
  DEFAULT_CACHE_RELATIVE_PATH,
  DEFAULT_TTL_MS,
  DEFAULT_EXCLUDE_AUTHORS,
  CACHE_SCHEMA_VERSION,
  MAX_CACHE_ENTRIES,
  MAX_COMMITS_PER_TICK,
  MIN_SINCE_HOURS_FALLBACK,
  MAX_SUBJECT_BYTES,
  MAX_FILES_IN_PAYLOAD,
});

// ── PUBLIC TYPES ─────────────────────────────────────────────────────────────

export interface PeerCommit {
  sha: string;
  author: string;
  isoDate: string;
  subject: string;
  files: string[];
}

export interface TickInput {
  sinceIso?: string;
  repoRoot?: string;
  excludeAuthors?: string[];
  /** Cron callers can short-circuit signal emission for dry-run inspection. */
  dryRun?: boolean;
}

export interface TickResult {
  tickId: string;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  status: "complete" | "failed" | "aborted";
  commitsSeen: number;
  commitsQueued: number;
  commitsSkipped: number;
  signalsEmitted: number;
  cacheSizeBefore: number;
  cacheSizeAfter: number;
  error?: string;
  lockRelated?: boolean;
  /** sha → tickId for the freshly-queued commits (debug payload). */
  queued: Array<{ sha: string; author: string; subject: string }>;
}

interface CacheEntry {
  tickId: string;
  analyzedAt: number;
}

interface CacheFile {
  schemaVersion: number;
  lastTickIso: string | null;
  analyzed: Record<string, CacheEntry>;
}

export interface PeerCommitAuditorOptions {
  repoRoot?: string;
  cachePath?: string;
  ttlMs?: number;
  excludeAuthors?: string[];
  ledger?: LedgerStoreEngine;
  now?: () => number;
  /** Override to seed determinism / cron correlation. */
  generateTickId?: () => string;
  /** Mockable git-log poll for tests. */
  pollGitLog?: typeof tail;
  /** Mockable last-poll loader; tests inject `() => null` to bypass the real state file. */
  loadLastPollIso?: () => string | null;
  /** Mockable last-poll saver; tests inject a no-op to avoid writing to real state. */
  saveLastPollIso?: (iso: string) => void;
}

// ── ENGINE CLASS ─────────────────────────────────────────────────────────────

export class PeerCommitAuditorEngine {
  private readonly repoRoot: string;
  private readonly cachePath: string;
  private readonly ttlMs: number;
  private readonly excludeAuthors: ReadonlyArray<string>;
  private readonly ledger: LedgerStoreEngine;
  private readonly now: () => number;
  private readonly generateTickId: () => string;
  private readonly pollGitLog: typeof tail;
  private readonly loadLastPollIsoFn: () => string | null;
  private readonly saveLastPollIsoFn: (iso: string) => void;

  constructor(opts: PeerCommitAuditorOptions = {}) {
    this.repoRoot = opts.repoRoot ?? DEFAULT_REPO_ROOT;
    // Derive cachePath from repoRoot so worktree callers default to writing
    // INSIDE their worktree (not the main tree's state/shared/). Explicit
    // opts.cachePath overrides — tests use a tmpdir path for isolation.
    this.cachePath = opts.cachePath ?? join(this.repoRoot, DEFAULT_CACHE_RELATIVE_PATH);
    this.ttlMs = Math.max(1_000, Number(opts.ttlMs ?? DEFAULT_TTL_MS));
    const merged = [...DEFAULT_EXCLUDE_AUTHORS, ...(opts.excludeAuthors ?? [])];
    this.excludeAuthors = Object.freeze(Array.from(new Set(merged)));
    this.ledger = opts.ledger ?? getLedgerStoreEngine();
    this.now = opts.now ?? Date.now;
    this.generateTickId = opts.generateTickId ?? defaultTickId;
    this.pollGitLog = opts.pollGitLog ?? tail;
    this.loadLastPollIsoFn = opts.loadLastPollIso ?? (loadLastPollIso as () => string | null);
    this.saveLastPollIsoFn = opts.saveLastPollIso ?? (saveLastPollIso as (iso: string) => void);
  }

  /**
   * One audit tick — poll commits, dedupe against cache, log to ledger,
   * emit chat_bus_signals for downstream B4. Pure: never throws on a
   * legitimate "nothing to do"; only throws on programmer errors (bad args).
   */
  tick(input: TickInput = {}): TickResult {
    const tickId = this.generateTickId();
    const startedAt = this.now();
    const repoRoot = input.repoRoot ?? this.repoRoot;
    const excludeAuthors = input.excludeAuthors
      ? Array.from(new Set([...this.excludeAuthors, ...input.excludeAuthors]))
      : Array.from(this.excludeAuthors);

    let cache = this.loadCache();
    const cacheSizeBefore = Object.keys(cache.analyzed).length;

    // Resolve sinceIso: explicit input → cache lastTickIso → git-log-tail's
    // own state file → fallback (now - 1h).
    const sinceIso = input.sinceIso
      ?? cache.lastTickIso
      ?? this.loadLastPollIsoFn()
      ?? new Date(this.now() - MIN_SINCE_HOURS_FALLBACK * 60 * 60 * 1000).toISOString();

    // Open the audit tick row up-front so even if the poll fails we have a
    // breadcrumb in the ledger. B10's UNIQUE constraint on tick_id prevents
    // accidental double-inserts.
    try {
      this.ledger.insert({
        table: "peer_audit_ticks",
        row: {
          tick_id: tickId,
          started_at: startedAt,
          commits_seen: 0,
          findings_count: 0,
          status: "running",
          meta_json: JSON.stringify({ sinceIso, repoRoot, excludeAuthors }),
        },
      });
    } catch (err) {
      // Distinguish duplicate-tick-id (programmer / cron race) from
      // ledger-down (operational): the first is a bug to surface clearly,
      // the second is a transient failure the caller should retry.
      const finishedAt = this.now();
      return this.makeAbortedResult(tickId, startedAt, finishedAt, cacheSizeBefore, err);
    }

    const pollResult = this.pollGitLog({
      sinceIso,
      repoRoot,
      excludeAuthors,
    });

    if (pollResult.error) {
      const finishedAt = this.now();
      const result: TickResult = {
        tickId,
        startedAt,
        finishedAt,
        durationMs: finishedAt - startedAt,
        status: pollResult.lockRelated ? "aborted" : "failed",
        commitsSeen: 0,
        commitsQueued: 0,
        commitsSkipped: 0,
        signalsEmitted: 0,
        cacheSizeBefore,
        cacheSizeAfter: cacheSizeBefore,
        error: pollResult.error,
        lockRelated: pollResult.lockRelated,
        queued: [],
      };
      this.finishTick(tickId, 0, result.status, pollResult.error);
      return result;
    }

    const commits = (pollResult.commits ?? []).slice(0, MAX_COMMITS_PER_TICK);
    const now = this.now();

    // Prune cache entries older than TTL so they can be re-enqueued if the
    // commit shows up in a later poll (commits don't usually re-appear, but
    // re-runs of an audit-tool retry would).
    this.pruneCache(cache, now);

    const queued: TickResult["queued"] = [];
    let signalsEmitted = 0;
    let skipped = 0;
    const dryRun = input.dryRun === true;

    for (const c of commits) {
      const existing = cache.analyzed[c.sha];
      const isFresh = existing && (now - existing.analyzedAt) < this.ttlMs;
      if (isFresh) { skipped++; continue; }
      // New (or stale-cache) commit — enqueue.
      if (!dryRun) {
        try {
          this.ledger.insert({
            table: "chat_bus_signals",
            row: {
              // Full sha (not truncated) so signal_id has the full 160-bit
              // collision domain — defends against contrived fixtures where
              // the first 12 hex chars repeat.
              signal_id: `peer-audit:${tickId}:${c.sha}`,
              from_chat: "golf-watchdog",
              to_chat: "*", // B4 listens on broadcast
              signal_type: "peer_commit_for_review",
              payload_json: JSON.stringify({
                tickId,
                sha: c.sha,
                author: c.author,
                isoDate: c.isoDate,
                subject: c.subject.slice(0, MAX_SUBJECT_BYTES),
                files: c.files.slice(0, MAX_FILES_IN_PAYLOAD),
                fileCount: c.files.length,
              }),
              emitted_at: now,
            },
          });
          signalsEmitted++;
        } catch (err) {
          // UNIQUE collision on signal_id means a prior tick already queued
          // this commit but the cache lost it (e.g. cache file deleted).
          // Treat as skipped, don't blow up the whole tick.
          if (!/UNIQUE constraint/i.test(String(err))) throw err;
          skipped++;
          continue;
        }
      }
      cache.analyzed[c.sha] = { tickId, analyzedAt: now };
      queued.push({ sha: c.sha, author: c.author, subject: c.subject.slice(0, MAX_SUBJECT_BYTES) });
    }

    // Persist cache + advance lastTickIso to the newest commit we saw (so the
    // next tick polls only newer commits). If we saw no commits, leave the
    // previous lastTickIso intact.
    const newestIso = commits.length > 0 ? commits[0].isoDate : cache.lastTickIso;
    cache.lastTickIso = newestIso;
    this.saveCache(cache);
    if (commits.length > 0 && !dryRun) {
      // Also stamp the git-log-tail shared state file so peer pollers that
      // use loadLastPollIso() don't re-emit the same commits.
      this.saveLastPollIsoFn(newestIso ?? new Date(now).toISOString());
    }

    const finishedAt = this.now();
    const result: TickResult = {
      tickId,
      startedAt,
      finishedAt,
      durationMs: finishedAt - startedAt,
      status: "complete",
      commitsSeen: commits.length,
      commitsQueued: queued.length,
      commitsSkipped: skipped,
      signalsEmitted,
      cacheSizeBefore,
      cacheSizeAfter: Object.keys(cache.analyzed).length,
      queued,
    };
    this.finishTick(tickId, queued.length, "complete", null);
    return result;
  }

  // ── Stale-tick reaper (operational hardening per scrutiny review) ────────

  /**
   * Mark any peer_audit_ticks rows that have been in status='running' for
   * more than `staleThresholdMs` (default 10 min) as status='aborted'. Run
   * this from a cron / Stop hook to prevent ghost-running rows accumulating
   * after engine crashes between insert(peer_audit_ticks) and finishAuditTick().
   *
   * Returns the number of rows reaped.
   */
  reapStaleTicks(staleThresholdMs: number = 10 * 60 * 1000): number {
    const cutoff = this.now() - Math.max(0, staleThresholdMs);
    const stale = this.ledger.query(
      "SELECT tick_id FROM peer_audit_ticks WHERE status = 'running' AND started_at < ?",
      [cutoff]
    ) as Array<{ tick_id: string }>;
    let reaped = 0;
    for (const row of stale) {
      const ok = this.ledger.finishAuditTick({
        tick_id: row.tick_id,
        findings_count: 0,
        status: "aborted",
        error_text: `stale-tick-reaper: status=running for >${staleThresholdMs}ms`,
      });
      if (ok) reaped++;
    }
    return reaped;
  }

  // ── Cache I/O ─────────────────────────────────────────────────────────────

  private loadCache(): CacheFile {
    if (!existsSync(this.cachePath)) return this.emptyCache();
    try {
      const raw = readFileSync(this.cachePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return this.emptyCache();
      const sv = Number(parsed.schemaVersion);
      if (!Number.isFinite(sv) || sv < 1) return this.emptyCache();
      const analyzed: Record<string, CacheEntry> = {};
      const src = parsed.analyzed && typeof parsed.analyzed === "object" ? parsed.analyzed : {};
      for (const [sha, entry] of Object.entries(src)) {
        if (!/^[0-9a-f]{40}$/i.test(sha)) continue;
        const e = entry as Partial<CacheEntry>;
        const at = Number(e?.analyzedAt);
        if (!Number.isFinite(at) || at < 0) continue;
        const tid = typeof e?.tickId === "string" ? e.tickId : "";
        if (tid.length === 0) continue;
        analyzed[sha] = { tickId: tid, analyzedAt: at };
      }
      return {
        schemaVersion: CACHE_SCHEMA_VERSION,
        lastTickIso: typeof parsed.lastTickIso === "string" ? parsed.lastTickIso : null,
        analyzed,
      };
    } catch {
      return this.emptyCache();
    }
  }

  private saveCache(cache: CacheFile): void {
    // Hard cap on cache size — drop oldest entries first.
    const entries = Object.entries(cache.analyzed);
    if (entries.length > MAX_CACHE_ENTRIES) {
      entries.sort((a, b) => a[1].analyzedAt - b[1].analyzedAt);
      const keep = entries.slice(-MAX_CACHE_ENTRIES);
      cache.analyzed = Object.fromEntries(keep);
    }
    mkdirSync(dirname(this.cachePath), { recursive: true });
    const tmp = `${this.cachePath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
    let tmpWritten = false;
    try {
      writeFileSync(tmp, JSON.stringify({ ...cache, schemaVersion: CACHE_SCHEMA_VERSION }, null, 2) + "\n");
      tmpWritten = true;
      renameSync(tmp, this.cachePath);
    } catch (err) {
      if (tmpWritten) { try { unlinkSync(tmp); } catch { /* best-effort */ } }
      throw err;
    }
  }

  private pruneCache(cache: CacheFile, now: number): void {
    const ttlCutoff = now - this.ttlMs;
    for (const [sha, e] of Object.entries(cache.analyzed)) {
      if (e.analyzedAt < ttlCutoff) delete cache.analyzed[sha];
    }
  }

  private emptyCache(): CacheFile {
    return { schemaVersion: CACHE_SCHEMA_VERSION, lastTickIso: null, analyzed: {} };
  }

  // ── Ledger helpers ───────────────────────────────────────────────────────

  private finishTick(tickId: string, findings: number, status: "complete" | "failed" | "aborted", error: string | null): void {
    try {
      this.ledger.finishAuditTick({ tick_id: tickId, findings_count: findings, status, error_text: error });
    } catch {
      // Ledger transient failure shouldn't crash the tick — the row still has
      // status='running' which downstream can reap as stale.
    }
  }

  private makeAbortedResult(tickId: string, startedAt: number, finishedAt: number, cacheSizeBefore: number, err: unknown): TickResult {
    const msg = err instanceof Error ? err.message : String(err);
    // Distinguish duplicate tick_id (programmer error or cron race) from
    // generic ledger failure so operators see actionable signal in F8.
    const errorPrefix = /UNIQUE constraint/i.test(msg)
      ? "duplicate tick_id (cron race or programmer error)"
      : "ledger error";
    return {
      tickId,
      startedAt,
      finishedAt,
      durationMs: finishedAt - startedAt,
      status: "aborted",
      commitsSeen: 0,
      commitsQueued: 0,
      commitsSkipped: 0,
      signalsEmitted: 0,
      cacheSizeBefore,
      cacheSizeAfter: cacheSizeBefore,
      error: `${errorPrefix}: ${msg}`,
      queued: [],
    };
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let _singleton: PeerCommitAuditorEngine | null = null;

export function getPeerCommitAuditorEngine(): PeerCommitAuditorEngine {
  if (_singleton === null) _singleton = new PeerCommitAuditorEngine();
  return _singleton;
}

export const peerCommitAuditorEngine = {
  get instance(): PeerCommitAuditorEngine { return getPeerCommitAuditorEngine(); },
};

// ── CLI entrypoint (R1-B1) ────────────────────────────────────────────────────

interface CliArgs {
  sinceIso: string | null;
  repoRoot: string | null;
  cachePath: string | null;
  excludeAuthors: string[];
  dryRun: boolean;
  json: boolean;
  /** G15: skip the activity gate (force full tick even if fleet is idle). */
  skipActivityGate: boolean;
  /** G15: hours-back window for the idle pre-check. Default 48h. */
  activityWindowHours: number;
}

/** G15: default activity-gate window — 48h matches the spec ("--since=48h"). */
export const DEFAULT_ACTIVITY_WINDOW_HOURS = 48;
/** G15: hard cap to keep `git log` cheap even if a caller passes a huge window. */
const MAX_ACTIVITY_WINDOW_HOURS = 30 * 24; // 30 days
/** G15: hard timeout on the activity-gate git invocation. */
const ACTIVITY_GATE_GIT_TIMEOUT_MS = 8_000;

function parseCliArgs(argv: string[]): CliArgs {
  const out: CliArgs = {
    sinceIso: null, repoRoot: null, cachePath: null, excludeAuthors: [],
    dryRun: false, json: true,
    skipActivityGate: false,
    activityWindowHours: DEFAULT_ACTIVITY_WINDOW_HOURS,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--since" && argv[i + 1]) { out.sinceIso = argv[++i]; }
    else if (a === "--repo" && argv[i + 1]) { out.repoRoot = argv[++i]; }
    else if (a === "--cache-path" && argv[i + 1]) { out.cachePath = argv[++i]; }
    else if (a === "--exclude-author" && argv[i + 1]) { out.excludeAuthors.push(argv[++i]); }
    else if (a === "--dry-run") { out.dryRun = true; }
    else if (a === "--no-json") { out.json = false; }
    else if (a === "--no-activity-gate") { out.skipActivityGate = true; }
    else if (a === "--activity-window-hours" && argv[i + 1]) {
      const n = parseInt(argv[++i], 10);
      if (Number.isFinite(n) && n > 0) {
        out.activityWindowHours = Math.min(n, MAX_ACTIVITY_WINDOW_HOURS);
      }
    }
  }
  return out;
}

// ── G15 activity gate (CLEANUP-MS0 / U-CLEANUP-G15) ───────────────────────────

/**
 * Result of the pre-tick activity check. `isIdle === true` means there have
 * been zero peer commits (after author-exclude filtering) in the requested
 * window, and the caller can safely skip the full audit tick.
 */
export interface ActivityCheckResult {
  isIdle: boolean;
  windowHours: number;
  sinceIso: string;
  nonGolfCommitCount: number;
  /** Best-effort: empty if the git invocation errored or timed out. */
  sampleAuthors: string[];
  /** When true, the gate was abandoned (e.g. git unavailable, lock-related). */
  inconclusive: boolean;
  reason?: string;
}

/** Test seam: callers (CLI / tests) may inject their own git runner. */
export type ActivityGitRunner = (args: string[], cwd: string) => {
  status: number | null;
  stdout: string;
  stderr: string;
  timedOut?: boolean;
};

function defaultActivityGitRunner(args: string[], cwd: string): ReturnType<ActivityGitRunner> {
  const r = spawnSync("git", args, {
    cwd, encoding: "utf-8", timeout: ACTIVITY_GATE_GIT_TIMEOUT_MS, windowsHide: true,
  });
  return {
    status: r.status,
    stdout: r.stdout || "",
    stderr: r.stderr || "",
    timedOut: r.signal === "SIGTERM",
  };
}

/**
 * Test the working tree for "no peer activity in the last N hours". Cheap by
 * design — bounded by `MAX_ACTIVITY_WINDOW_HOURS` + the spawn timeout. Never
 * throws; on any error returns `inconclusive: true` so the caller falls
 * through to the full tick (fail-open).
 *
 * Author-exclusion filter is JS-side rather than `--author` regex so we get
 * the same semantics on every git version + remain trivially testable.
 */
export function checkFleetIdle(opts: {
  repoRoot: string;
  windowHours: number;
  excludeAuthors: readonly string[];
}, runGit: ActivityGitRunner = defaultActivityGitRunner): ActivityCheckResult {
  const windowHours = Math.max(1, Math.min(opts.windowHours, MAX_ACTIVITY_WINDOW_HOURS));
  const sinceIso = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
  const baseRes: ActivityCheckResult = {
    isIdle: false,
    windowHours,
    sinceIso,
    nonGolfCommitCount: 0,
    sampleAuthors: [],
    inconclusive: false,
  };

  // We only need to know if ≥1 non-golf commit exists. `-n 50` is a generous
  // cap that's still bounded — picks up enough authors to sanity-log the
  // sample without paying for a full history walk.
  const r = runGit(
    ["log", `--since=${sinceIso}`, "--pretty=%H%x09%an", "-n", "50"],
    opts.repoRoot,
  );
  if (r.timedOut) {
    return { ...baseRes, inconclusive: true, reason: "git-log-timeout" };
  }
  if (r.status !== 0) {
    return {
      ...baseRes,
      inconclusive: true,
      reason: `git-log-exit-${r.status}: ${(r.stderr || "").trim().slice(0, 160)}`,
    };
  }

  const lines = r.stdout.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const excludeSet = new Set(opts.excludeAuthors.map((a) => a.toLowerCase()));
  const seenAuthors = new Set<string>();
  let nonGolf = 0;
  for (const line of lines) {
    const tabIdx = line.indexOf("\t");
    const author = tabIdx === -1 ? line : line.slice(tabIdx + 1);
    const an = author.trim().toLowerCase();
    if (excludeSet.has(an)) continue;
    // Prefix-match the exclude list (e.g. "golf-watchdog-bot" matches "golf-").
    let excluded = false;
    for (const pat of excludeSet) {
      if (an.startsWith(pat)) { excluded = true; break; }
    }
    if (excluded) continue;
    nonGolf++;
    seenAuthors.add(author.trim());
  }

  return {
    ...baseRes,
    isIdle: nonGolf === 0,
    nonGolfCommitCount: nonGolf,
    sampleAuthors: Array.from(seenAuthors).slice(0, 10),
  };
}

/** Shape returned by `tickFromCli` when the activity gate short-circuits. */
export interface IdleSkippedResult {
  tickId: string;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  status: "complete";
  idleSkipped: true;
  activityCheck: ActivityCheckResult;
}

/**
 * Cron / PowerShell entrypoint per R1-B1. Returns a Promise so callers can
 * `await` it; sync callers should ignore the return value — side effects
 * (stdout JSON + process.exit) are the contract.
 */
export function tickFromCli(): TickResult | IdleSkippedResult {
  const args = parseCliArgs(process.argv.slice(2));

  // G15 activity gate: when the fleet is quiet, skip the full tick entirely.
  // Cheap pre-check (single bounded `git log`) — saves the ledger insert,
  // git-log-tail invocation, signal-bus writes, and downstream B4 reviewer
  // work. Spec target: ~$70/quiet-week of token cost.
  //
  // Fail-open: any inconclusive result (git unavailable, lock contention,
  // timeout) falls through to the full tick path.
  if (!args.skipActivityGate) {
    const repoRoot = args.repoRoot ?? DEFAULT_REPO_ROOT;
    const excludeAuthors = args.excludeAuthors.length > 0
      ? Array.from(new Set([...DEFAULT_EXCLUDE_AUTHORS, ...args.excludeAuthors]))
      : Array.from(DEFAULT_EXCLUDE_AUTHORS);
    let activity: ActivityCheckResult;
    try {
      activity = checkFleetIdle({
        repoRoot,
        windowHours: args.activityWindowHours,
        excludeAuthors,
      });
    } catch {
      // Defensive — checkFleetIdle is supposed to be non-throwing, but if a
      // future change regresses that contract we still fail-open to the tick.
      activity = {
        isIdle: false, windowHours: args.activityWindowHours,
        sinceIso: new Date(Date.now() - args.activityWindowHours * 60 * 60 * 1000).toISOString(),
        nonGolfCommitCount: 0, sampleAuthors: [], inconclusive: true,
        reason: "activity-gate-threw",
      };
    }

    if (activity.isIdle && !activity.inconclusive) {
      const startedAt = Date.now();
      const tickId = `IDLE-FLEET-${startedAt.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      // Record the skip in the ledger so F8 / dashboards still see a
      // heartbeat even on quiet weeks. Use status="complete" to satisfy
      // LedgerStoreEngine's strict enum; the IDLE-FLEET prefix + meta_json
      // flag carry the "skipped" signal for downstream consumers.
      if (!args.dryRun) {
        try {
          const ledger = getLedgerStoreEngine();
          ledger.insert({
            table: "peer_audit_ticks",
            row: {
              tick_id: tickId,
              started_at: startedAt,
              commits_seen: 0,
              findings_count: 0,
              status: "running",
              meta_json: JSON.stringify({
                idleSkipped: true,
                activityWindowHours: activity.windowHours,
                sinceIso: activity.sinceIso,
                nonGolfCommitCount: activity.nonGolfCommitCount,
                excludeAuthors,
                repoRoot,
              }),
            },
          });
          ledger.finishAuditTick({
            tick_id: tickId, findings_count: 0, status: "complete", error_text: null,
          });
        } catch { /* tolerate ledger transient failure */ }
      }
      const finishedAt = Date.now();
      const idleResult: IdleSkippedResult = {
        tickId,
        startedAt,
        finishedAt,
        durationMs: finishedAt - startedAt,
        status: "complete",
        idleSkipped: true,
        activityCheck: activity,
      };
      if (args.json) {
        process.stdout.write(JSON.stringify(idleResult, null, 2) + "\n");
      } else {
        process.stdout.write(
          `tick ${tickId} IDLE-FLEET window=${activity.windowHours}h ` +
          `nonGolfCommits=${activity.nonGolfCommitCount} (skipped)\n`
        );
      }
      if (typeof process.exit === "function") process.exit(0);
      return idleResult;
    }
  }

  // Instantiate per-call when the caller supplies repoRoot or cachePath so
  // worktree invocations write into their own state file (not main tree).
  // Without overrides we reuse the singleton to keep the DB connection warm.
  const engine = (args.repoRoot || args.cachePath)
    ? new PeerCommitAuditorEngine({
        repoRoot: args.repoRoot ?? undefined,
        cachePath: args.cachePath ?? undefined,
      })
    : getPeerCommitAuditorEngine();
  let result: TickResult;
  try {
    result = engine.tick({
      sinceIso: args.sinceIso ?? undefined,
      repoRoot: args.repoRoot ?? undefined,
      excludeAuthors: args.excludeAuthors,
      dryRun: args.dryRun,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (args.json) {
      process.stdout.write(JSON.stringify({ status: "failed", error: msg }) + "\n");
    } else {
      process.stderr.write(`peer-audit: ${msg}\n`);
    }
    if (typeof process.exit === "function") process.exit(3);
    throw err;
  }

  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    process.stdout.write(`tick ${result.tickId} ${result.status} commits=${result.commitsSeen} queued=${result.commitsQueued} skipped=${result.commitsSkipped} signals=${result.signalsEmitted}\n`);
  }
  // Exit 0 on complete; 2 on aborted (transient); 3 on failed (caller may retry / alert).
  if (typeof process.exit === "function") {
    if (result.status === "complete") process.exit(0);
    else if (result.status === "aborted") process.exit(2);
    else process.exit(3);
  }
  return result;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function defaultTickId(): string {
  // Compact, sortable-by-time, collision-resistant: <epochMs>-<6 random base36>.
  return `tick-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
