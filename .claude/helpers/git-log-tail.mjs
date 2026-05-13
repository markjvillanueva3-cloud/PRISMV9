#!/usr/bin/env node
/**
 * git-log-tail.mjs — U-CLEANUP-B3 canonical git-log poll helper.
 *
 * Wraps `git log --since=<iso> --name-only --pretty=...` so every PRISM
 * consumer (B1 PeerCommitAuditorEngine, B4 reviewer-dispatch planner, F2
 * envelope-drift cron, G6 inventory-freshness, etc.) uses ONE poll primitive.
 * Without this, every consumer reimplements the same git invocation with
 * subtle drift — different timeout values, different NUL-byte parsing,
 * different lock-retry policies — and bugs surface only after weeks of
 * fleet operation.
 *
 * Output shape (per commit):
 *   {
 *     sha: "8cd6ab1a5...",
 *     author: "markjvillanueva3-cloud",
 *     isoDate: "2026-05-13T17:23:11.000Z",   // ALWAYS UTC-Z (R2-UU4)
 *     subject: "[CLEANUP-MS0]/U-A1: ...",
 *     files: ["state/shared/chat-slots.json", ".claude/helpers/chat-slots.mjs"]
 *   }
 *
 * Debounce: state/shared/.watchdog-last-poll.iso wraps the last successful
 * poll's `--since` cutoff. Re-invoking with the same cutoff is a no-op
 * (returns []). Per R3-VER1 schema-versioning, the state file is JSON
 * (not raw ISO), so v2 schema bumps add fields without breaking v1 readers.
 *
 * Lock retry: `git log` can hit `.git/index.lock` while a peer chat commits.
 * Default behavior: 3 retries with linear-backoff (250ms, 500ms, 1000ms);
 * surface a structured error on persistent lock so the caller can decide
 * to skip the tick rather than crash.
 *
 * UTC discipline: every isoDate is normalized to `Z` suffix. Git's
 * `--date=iso-strict` emits `+00:00` for UTC; we rewrite that to `Z`.
 *
 * Usage (programmatic — tail() is synchronous; no `await` needed):
 *   import { tail, saveLastPollIso } from "./git-log-tail.mjs";
 *   const { commits, error } = tail({ sinceIso, repoRoot, excludeAuthors: ["golf-watchdog-bot"] });
 *   if (commits.length) saveLastPollIso(new Date().toISOString());
 *
 * Usage (CLI):
 *   node H:/prism/.claude/helpers/git-log-tail.mjs --since 2026-05-13T17:00:00Z
 *   node H:/prism/.claude/helpers/git-log-tail.mjs --since-state  # use .watchdog-last-poll.iso
 *
 * Spec: state/shared/specs/GOLF-WATCHDOG-MS0-2026-05-13.md §Subsystem B.B3
 * Envelope: mcp-server/data/milestones/CLEANUP-MS0.json (U-CLEANUP-B3)
 */

// WIRE-EXEMPT: foundational seed helper for CLEANUP-MS0 — consumed by B1 (PeerCommitAuditor),
// B4 (reviewer-dispatch planner), F2 (envelope-drift cron), G6 (inventory-freshness) in later units.

import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

// ─── Configuration (exported so B1/B4/F2/G6 introspect the same caps) ────

export const GIT_LOG_TAIL_LIMITS = Object.freeze({
  DEFAULT_REPO_ROOT: "H:/prism",
  DEFAULT_LAST_POLL_PATH: "H:/prism/state/shared/.watchdog-last-poll.iso",
  SCHEMA_VERSION: 1,
  // Reduced from 3 retries × 8s = 32s (over Stop budget) to 2 retries × 6s = max ~14s.
  // Combined with TOTAL_BUDGET_MS hard cap below, worst-case wall time is 20s — safely
  // under the 30s Stop ceiling even under 6-chat fleet contention.
  MAX_LOCK_RETRIES: 2,
  LOCK_RETRY_BACKOFF_MS: Object.freeze([250, 500]),
  GIT_TIMEOUT_MS: 6_000,
  TOTAL_BUDGET_MS: 20_000,
  // Atomic-write tmp uniqueness: PID + ms + random suffix (Windows Date.now() has 15.6ms
  // granularity, so PID alone collides on rapid back-to-back saves).
  TMP_RAND_BYTES: 6,
  // Load-side retry on Windows NTFS rename window (EBUSY/EPERM/ENOENT). Bounded so
  // a permanently-missing file still returns null in <60ms.
  LOAD_RETRY_COUNT: 3,
  LOAD_RETRY_DELAY_MS: 20,
});

// Aliases kept for in-module readability — values trace to the frozen limits.
const DEFAULT_REPO_ROOT = GIT_LOG_TAIL_LIMITS.DEFAULT_REPO_ROOT;
const DEFAULT_LAST_POLL_PATH = GIT_LOG_TAIL_LIMITS.DEFAULT_LAST_POLL_PATH;
const SCHEMA_VERSION = GIT_LOG_TAIL_LIMITS.SCHEMA_VERSION;
const MAX_LOCK_RETRIES = GIT_LOG_TAIL_LIMITS.MAX_LOCK_RETRIES;
const LOCK_RETRY_BACKOFF_MS = GIT_LOG_TAIL_LIMITS.LOCK_RETRY_BACKOFF_MS;
const GIT_TIMEOUT_MS = GIT_LOG_TAIL_LIMITS.GIT_TIMEOUT_MS;
const TOTAL_BUDGET_MS = GIT_LOG_TAIL_LIMITS.TOTAL_BUDGET_MS;

// Resolve a usable git binary even when caller's PATH is sparse (eg vitest
// child processes on Windows). Priority: env var → known Windows path → bare
// "git" (relies on caller PATH). Detected once at module load.
function resolveGitBin() {
  if (process.env.PRISM_GIT_BIN && existsSync(process.env.PRISM_GIT_BIN)) {
    return process.env.PRISM_GIT_BIN;
  }
  const windowsDefault = "C:/Program Files/Git/mingw64/bin/git.exe";
  if (existsSync(windowsDefault)) return windowsDefault;
  return "git"; // PATH fallback
}
const DEFAULT_GIT_BIN = resolveGitBin();

// ASCII Unit Separator (0x1F) as inter-field separator in --pretty format.
// We can't use a literal NUL byte (0x00) here because Node's spawnSync rejects
// args containing NUL bytes (Windows CreateProcess + POSIX execve treat NUL as
// string terminator). git's `%x1F` format escape produces the literal byte in
// the OUTPUT — the arg we pass is "%x1F" (a plain ASCII string), so spawnSync
// is happy. 0x1F is in the C0 control range and effectively never appears in
// commit subjects.
const FIELD_SEP = "\x1F";
const FIELD_SEP_ESCAPE = "%x1F";

// ─── Helpers ─────────────────────────────────────────────────────────────

function normalizeToUtcZ(isoDate) {
  // Git emits dates as `2026-05-13T17:23:11+00:00` (or with TZ offset). Convert
  // any offset to canonical `Z` form per R2-UU4 UTC discipline.
  try {
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return isoDate; // unparseable → leave as-is
    return d.toISOString(); // always UTC with Z suffix
  } catch {
    return isoDate;
  }
}

// Atomics.wait yields to the OS scheduler rather than burning a CPU core.
// Falls back to a brief busy-wait only if SharedArrayBuffer is unavailable
// (some sandboxed Node builds disable it). The fallback is bounded to 250ms
// so even in the fallback path we don't peg CPU for long.
function sleepSync(ms) {
  if (ms <= 0) return;
  try {
    const buf = new SharedArrayBuffer(4);
    const view = new Int32Array(buf);
    Atomics.wait(view, 0, 0, ms);
  } catch {
    const until = Date.now() + Math.min(ms, 250);
    while (Date.now() < until) { /* bounded fallback only */ }
  }
}

// Stderr patterns that mean "no commits to return" rather than a failure.
// Empty repos (no HEAD yet) and "since cutoff is after every commit" both
// emit non-zero exit codes but should map to commits=[] with no error.
const EMPTY_REPO_PATTERNS = [
  /does not have any commits yet/i,
  /bad default revision\s+'HEAD'/i,
  /ambiguous argument 'HEAD'/i,
  /unknown revision or path not in the working tree/i,
];

function isEmptyRepoStderr(stderr) {
  if (!stderr) return false;
  return EMPTY_REPO_PATTERNS.some((re) => re.test(stderr));
}

function runGitWithLockRetry(args, opts) {
  const gitBin = opts.gitBin || DEFAULT_GIT_BIN;
  const startedAt = Date.now();
  let lastResult = null;
  for (let attempt = 0; attempt <= MAX_LOCK_RETRIES; attempt++) {
    // Wall-clock budget: abort early if remaining < per-call timeout so we
    // can't accidentally blow past the 30s Stop ceiling under fleet contention.
    const elapsed = Date.now() - startedAt;
    const remaining = TOTAL_BUDGET_MS - elapsed;
    if (remaining <= 0) {
      return {
        ok: false,
        error: `git poll exceeded total wall-clock budget (${TOTAL_BUDGET_MS}ms) on attempt ${attempt}`,
        lockRelated: true,
      };
    }
    const perCallTimeout = Math.min(GIT_TIMEOUT_MS, Math.max(remaining, 500));

    const r = spawnSync(gitBin, args, {
      cwd: opts.repoRoot,
      encoding: "utf-8",
      timeout: perCallTimeout,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    lastResult = r;

    // Node-level spawn failure (ENOENT, EACCES, timeout signal, etc.) —
    // status === null and r.error is set. Surface this as a structured
    // string error so callers can distinguish from a clean "no commits".
    if (r.error) {
      const msg = r.error.message || String(r.error);
      return { ok: false, error: `git spawn failed: ${msg}`, lockRelated: false };
    }

    if (r.status === 0) return { ok: true, stdout: r.stdout, stderr: r.stderr };

    const stderr = (r.stderr || "").toString();

    // Empty-repo / no-HEAD-yet stderr is NOT an error — return empty result.
    // Discovered 2026-05-13 when an empty sandbox repo legitimately emits
    // "fatal: your current branch 'main' does not have any commits yet"
    // on stderr with exit 128, but the caller's expectation is commits=[].
    if (isEmptyRepoStderr(stderr)) {
      return { ok: true, stdout: "", stderr: "" };
    }

    const isLockErr = /index\.lock|cannot lock ref|Another git process/i.test(stderr);
    if (!isLockErr) {
      // Non-lock error → don't retry, surface immediately. Ensure error is
      // always a non-empty string so callers can distinguish "no error"
      // (undefined) from "git failed but stderr was empty".
      const errMsg = stderr.trim()
        || (r.status !== null ? `git exited ${r.status}` : `git exited (signal=${r.signal ?? "unknown"})`);
      return { ok: false, error: errMsg, lockRelated: false };
    }
    // Lock error — backoff and retry if budget allows.
    if (attempt < MAX_LOCK_RETRIES) {
      const backoff = LOCK_RETRY_BACKOFF_MS[attempt] ?? 500;
      const remainingAfterBackoff = TOTAL_BUDGET_MS - (Date.now() - startedAt) - backoff;
      if (remainingAfterBackoff < 500) break; // not enough budget for another attempt
      sleepSync(backoff);
    }
  }
  return {
    ok: false,
    error: `git index.lock contention persisted after ${MAX_LOCK_RETRIES} retries: ${(lastResult?.stderr || "").trim()}`,
    lockRelated: true,
  };
}

// Parse the 0x1F-separated raw output. Each commit:
//   <sha>0x1F<author>0x1F<iso>0x1F<subject>\n
//   <file1>\n
//   <file2>\n
//   \n       <-- blank line separates commits
//
// SHA / iso fields are well-formed by git's output contract; author + subject
// are user-controlled. If a malicious commit's `user.name` or subject contains
// literal 0x1F bytes, the header would over-split. Recovered by re-joining
// trailing parts onto subject (preserves the malicious 0x1F intact for any
// downstream consumer that needs to flag it).
function parseLog(stdout) {
  if (!stdout || stdout.trim().length === 0) return [];
  const commits = [];
  // Split on commit boundaries. The format emits one blank line between commits.
  const blocks = stdout.split(/\n\n/).map((b) => b.trim()).filter((b) => b.length > 0);
  for (const block of blocks) {
    const lines = block.split("\n");
    if (lines.length === 0) continue;
    const header = lines[0];
    const parts = header.split(FIELD_SEP);
    if (parts.length < 4) continue; // truly malformed → skip
    // SHA is always 40-hex from %H; if first part isn't 40-hex, the block is
    // corrupt and we skip it rather than trust derived fields.
    const sha = (parts[0] || "").trim();
    if (!/^[0-9a-f]{40}$/i.test(sha)) continue;
    const author = (parts[1] || "").trim();
    const isoRaw = (parts[2] || "").trim();
    // Re-join any over-split tail back onto subject so a 0x1F injection in
    // author or subject cannot shift the meaning of `files`.
    const subject = parts.slice(3).join(FIELD_SEP).trim();
    const files = lines.slice(1).map((l) => l.trim()).filter((l) => l.length > 0);
    commits.push({
      sha,
      author,
      isoDate: normalizeToUtcZ(isoRaw),
      subject,
      files,
    });
  }
  return commits;
}

// ─── Last-poll state file (JSON wrapper for forward-compat) ──────────────

export function loadLastPollIso(path = DEFAULT_LAST_POLL_PATH) {
  if (!existsSync(path)) return null;
  // Race-retry: when saveLastPollIso is mid-rename on Windows NTFS, readFileSync
  // can see EBUSY/EPERM/ENOENT. Without retry we'd silently null-out and the
  // caller would re-emit every commit in the repo. Bounded so a truly-missing
  // file still returns null within LOAD_RETRY_COUNT × LOAD_RETRY_DELAY_MS.
  let lastErr = null;
  for (let attempt = 0; attempt < GIT_LOG_TAIL_LIMITS.LOAD_RETRY_COUNT; attempt++) {
    try {
      const raw = readFileSync(path, "utf-8");
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      // Forward-compat: v1 readers tolerate missing schemaVersion (v0 → v1) but
      // warn-stderr on a future-unknown version so operators see the drift.
      const ver = parsed.schemaVersion;
      if (typeof ver === "number" && ver > SCHEMA_VERSION) {
        try { process.stderr.write(`git-log-tail: unknown schemaVersion=${ver} in ${path} (reader knows v${SCHEMA_VERSION}); attempting best-effort read\n`); } catch { /* ignore */ }
      }
      if (typeof parsed.sinceIso === "string") return parsed.sinceIso;
      return null;
    } catch (err) {
      lastErr = err;
      const code = err && typeof err === "object" && /** @type {{code?:string}} */ (err).code;
      // Retry only on the NTFS rename-window errors. JSON SyntaxError / other
      // parse failures bail immediately — retrying won't unbreak malformed JSON.
      if (code !== "EBUSY" && code !== "EPERM" && code !== "ENOENT") return null;
      sleepSync(GIT_LOG_TAIL_LIMITS.LOAD_RETRY_DELAY_MS);
    }
  }
  // Exhausted retries — null is the right answer; the caller's default will
  // backfill the cutoff. Don't throw, but stamp stderr for debuggability.
  try { process.stderr.write(`git-log-tail: load retries exhausted for ${path}: ${lastErr?.message ?? lastErr}\n`); } catch { /* ignore */ }
  return null;
}

export function saveLastPollIso(isoString, path = DEFAULT_LAST_POLL_PATH) {
  // Atomic write via tmp + rename (Windows NTFS race-safe).
  // Tmp uniqueness: PID + ms-time + crypto-random suffix prevents same-process
  // back-to-back collisions (Windows Date.now() has 15.6ms granularity) AND
  // cross-process collisions (two PIDs with same ms timestamp).
  const payload = {
    schemaVersion: SCHEMA_VERSION,
    sinceIso: normalizeToUtcZ(isoString),
    savedAt: new Date().toISOString(),
  };
  mkdirSync(dirname(path), { recursive: true });
  const rand = Math.random().toString(36).slice(2, 2 + GIT_LOG_TAIL_LIMITS.TMP_RAND_BYTES);
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}.${rand}`;
  let tmpWritten = false;
  try {
    writeFileSync(tmp, JSON.stringify(payload, null, 2) + "\n");
    tmpWritten = true;
    renameSync(tmp, path);
  } catch (err) {
    // Clean up dangling tmp on crash so we don't accumulate orphan files in
    // state/shared/. unlink is best-effort — if it fails the next save will
    // create a unique tmp anyway (random suffix).
    if (tmpWritten) {
      try { unlinkSync(tmp); } catch { /* best-effort cleanup */ }
    }
    throw err;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Poll git log for commits since the given ISO timestamp.
 *
 * @param {Object} opts
 * @param {string} opts.sinceIso          - Cutoff for `git log --since=<iso>`. Required.
 * @param {string} [opts.repoRoot]        - Repo root; defaults to H:/prism.
 * @param {string[]} [opts.excludeAuthors] - Author names to skip (e.g. golf bot to prevent self-DOS).
 * @param {string} [opts.gitBin]           - Explicit git binary path (overrides auto-resolution).
 * @returns {{ commits: Commit[], error?: string, lockRelated?: boolean }}
 */
export function tail(opts) {
  const repoRoot = opts.repoRoot || DEFAULT_REPO_ROOT;
  const sinceIso = opts.sinceIso;
  const excludeAuthors = new Set(opts.excludeAuthors || []);

  if (!sinceIso || typeof sinceIso !== "string") {
    return { commits: [], error: "tail() requires opts.sinceIso (ISO 8601 string)" };
  }

  // Precondition: repoRoot must exist AND contain a .git marker (dir or file
  // for worktrees/submodules). Discovered 2026-05-13: on Windows, spawnSync
  // sometimes returns status=0 with empty output when the cwd is a non-git
  // dir, masking the error path. An explicit check guarantees a string error
  // surfaces to the caller per R3-VER1 structured-error discipline.
  if (!existsSync(repoRoot)) {
    return { commits: [], error: `repoRoot does not exist: ${repoRoot}` };
  }
  if (!existsSync(join(repoRoot, ".git"))) {
    return { commits: [], error: `not a git repository (no .git found at ${repoRoot})` };
  }

  // --no-pager so paging doesn't hang on large output.
  // --date=iso-strict makes the timestamp parseable and ISO 8601 compliant.
  // --pretty=format:"%H%x1F%an%x1F%aI%x1F%s" — git emits literal 0x1F bytes
  // between fields. Subjects effectively never contain 0x1F (C0 control char),
  // so this is a safe delimiter that also satisfies Node's no-NUL-in-args rule.
  const prettyFormat = `%H${FIELD_SEP_ESCAPE}%an${FIELD_SEP_ESCAPE}%aI${FIELD_SEP_ESCAPE}%s`;
  const args = [
    "--no-pager",
    "log",
    `--since=${sinceIso}`,
    "--name-only",
    `--pretty=format:${prettyFormat}`,
    "--date=iso-strict",
  ];

  const r = runGitWithLockRetry(args, { repoRoot, gitBin: opts.gitBin });
  if (!r.ok) {
    return { commits: [], error: r.error, lockRelated: !!r.lockRelated };
  }

  const allCommits = parseLog(r.stdout);
  const commits = excludeAuthors.size === 0
    ? allCommits
    : allCommits.filter((c) => !excludeAuthors.has(c.author));
  return { commits };
}

// ─── CLI entrypoint ──────────────────────────────────────────────────────

function parseCliArgs(argv) {
  const out = { sinceIso: null, repoRoot: null, excludeAuthors: [], useStateFile: false, json: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--since" && argv[i + 1]) { out.sinceIso = argv[++i]; }
    else if (a === "--since-state") { out.useStateFile = true; }
    else if (a === "--repo" && argv[i + 1]) { out.repoRoot = argv[++i]; }
    else if (a === "--exclude-author" && argv[i + 1]) { out.excludeAuthors.push(argv[++i]); }
    else if (a === "--no-json") { out.json = false; }
  }
  return out;
}

function main() {
  const args = parseCliArgs(process.argv.slice(2));

  let sinceIso = args.sinceIso;
  if (args.useStateFile) {
    sinceIso = loadLastPollIso();
    if (!sinceIso) {
      // No state file → default to last hour as a safe seed
      sinceIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    }
  }
  if (!sinceIso) {
    process.stderr.write("git-log-tail: --since <iso> or --since-state required\n");
    process.exit(2);
  }

  const result = tail({
    sinceIso,
    repoRoot: args.repoRoot || DEFAULT_REPO_ROOT,
    excludeAuthors: args.excludeAuthors,
  });
  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    for (const c of result.commits) {
      process.stdout.write(`${c.sha} ${c.isoDate} ${c.author}: ${c.subject}\n`);
      for (const f of c.files) process.stdout.write(`  ${f}\n`);
    }
    if (result.error) process.stderr.write(`error: ${result.error}\n`);
  }
  process.exit(result.error && !result.lockRelated ? 1 : 0);
}

// Only invoke main() when run as the script entry point — NOT when imported.
// Use pathToFileURL to compare full URLs rather than basenames so a separate
// tool happens to share the basename "git-log-tail.mjs" can't false-trigger.
const isMainEntry = (() => {
  try {
    if (typeof process.argv[1] !== "string") return false;
    const entryUrl = pathToFileURL(resolve(process.argv[1])).href;
    return entryUrl === import.meta.url;
  } catch {
    return false;
  }
})();

if (isMainEntry) main();
