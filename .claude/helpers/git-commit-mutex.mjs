// git-commit-mutex.mjs — FLEET-GIT-CONTENTION-MS0/U-FGC-1 (slot:alpha)
//
// Cross-process serialization + ref-race retry for git commits on the SHARED
// `H:/prism` tree, where ~26 NATO chats share one working tree / index / HEAD.
// Without this, concurrent committers collide on `index.lock` and lose the
// `cannot lock ref 'HEAD'` ref-update race (observed: HEAD moved 4× during one
// commit). This wraps `git commit` so:
//   1. Only one mutex-holder commits at a time (advisory lock at
//      .git/prism-commit.lock — untracked, local; never on the shared tree).
//   2. On a transient `cannot lock ref` / `index.lock` failure it RE-PARENTS
//      and retries (the part that helps even before fleet-wide adoption, since
//      peers not yet using the mutex still move HEAD).
//   3. It commits an EXPLICIT pathspec, so a peer's foreign staged files are
//      never absorbed (the H8 misattribution class) — and warns if any exist.
//
// Pure-core where it matters: the lock primitive + classifier are injectable
// for tests; only the CLI/commit path touches real git. Never throws across the
// release boundary — the lock is always freed in `finally`.
//
// CLI:
//   node .claude/helpers/git-commit-mutex.mjs commit --message "<msg>" -- <path...>
//   node .claude/helpers/git-commit-mutex.mjs status
//
// Knobs: PRISM_COMMIT_MUTEX_TIMEOUT_MS (acquire wait, default 60000),
//        PRISM_COMMIT_MUTEX_STALE_MS (stale-lock age, default 120000),
//        PRISM_COMMIT_MUTEX_RETRIES (ref-race retries, default 8).

import { openSync, writeSync, closeSync, readFileSync, unlinkSync, renameSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { hostname } from "node:os";
import { join, isAbsolute } from "node:path";

export const DEFAULT_LOCK_REL = ".git/prism-commit.lock";
export const DEFAULT_TIMEOUT_MS = 60000;
export const DEFAULT_STALE_MS = 120000;
export const DEFAULT_RETRIES = 8;

/** Transient git failures that warrant a re-parent + retry (vs a real error). */
const TRANSIENT_RE =
  /cannot lock ref|unable to (?:create|write) ['"]?\.git[\\/]index\.lock|index\.lock['"]?: File exists|ref ['"]?HEAD['"]? is at|failed to lock ref/i;

/**
 * Is a git commit failure transient (retryable) vs a real error (surface it)?
 * Pure — used by the retry loop and unit-tested directly.
 * @param {string} stderr
 * @returns {boolean}
 */
export function isTransientGitFailure(stderr) {
  return typeof stderr === "string" && TRANSIENT_RE.test(stderr);
}

/** Is `pid` a live process on this host? true if alive, false if provably dead. */
function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0); // signal 0 = liveness probe
    return true;
  } catch (e) {
    // ESRCH = no such process (dead). EPERM = exists but not ours (alive).
    return e && e.code === "EPERM";
  }
}

/**
 * Decide whether an existing lock is stale and may be reclaimed.
 * Pure (no IO) so the staleness policy is unit-testable.
 * @param {{pid?:number, host?:string, ts?:number}|null} lock parsed lock body
 * @param {{ageMs:number, staleMs:number, host:string, pidAliveFn?:(p:number)=>boolean}} ctx
 * @returns {boolean}
 */
export function isStaleLock(lock, { ageMs, staleMs, host, pidAliveFn = pidAlive }) {
  if (!lock || typeof lock !== "object") return true; // unparseable → reclaim
  if (ageMs > staleMs) return true; // a commit must never hold this long
  // Same-host dead PID → reclaim. Different host → never probe its PID; rely on age.
  if (lock.host === host && Number.isInteger(lock.pid) && !pidAliveFn(lock.pid)) return true;
  return false;
}

const sleep = (ms) => {
  // Synchronous-ish wait without spinning the CPU hot; node has no sync sleep,
  // so use Atomics on a throwaway buffer (deterministic, no busy-loop).
  const sab = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(sab, 0, 0, ms);
};

// ── git's OWN index.lock orphan reclaim (U-FGC-4) ────────────────────────────
// Distinct from the mutex's advisory lock above: `.git/index.lock` is git's
// internal lock, held for the few ms of an index write. A reaped/crashed git
// process (the fleet-reaper kills orphan git PIDs) leaves it behind, and THEN
// every committer — mutex-routed or not — gets `Unable to create '.git/index.lock':
// File exists` until someone clears it (observed: a 303s-frozen orphan blocked
// the whole fleet). git's index.lock carries NO pid, so liveness can't be
// pid-probed; we gate on age + a frozen-mtime probe instead.

/**
 * Pure predicate: is a present `.git/index.lock` a dead orphan safe to reclaim?
 * @param {{ageMs:number, staleMs:number, frozen:boolean|null}} ctx
 *   frozen: true=mtime unchanged over the probe (owner not writing → dead),
 *           false=mtime advanced (owner alive → keep), null=not probed.
 * @returns {boolean}
 */
export function isStaleIndexLock({ ageMs, staleMs, frozen }) {
  if (!(ageMs > staleMs)) return false; // young → a live commit may legitimately hold it
  if (frozen === false) return false;   // mtime advancing → an owner is actively writing
  return true;                          // old AND (frozen | unprobed) → orphan
}

/**
 * Resolve the real path of git's index.lock for `cwd` (honours worktrees, where
 * `.git` is a file). Falls back to `.git/index.lock` if `git rev-parse` fails.
 */
export function gitIndexLockPath(cwd, runGit) {
  try {
    const p = runGit(["rev-parse", "--git-path", "index.lock"]).stdout.trim();
    if (p) return isAbsolute(p) ? p : join(cwd, p);
  } catch { /* fall through */ }
  return join(cwd, ".git", "index.lock");
}

/**
 * Reclaim a stale/orphaned `.git/index.lock`. Conservative by construction:
 * never touches a young lock; with a freeze probe, never touches a lock whose
 * owner is still writing. Uses the same TOCTOU-safe rename→unlink as the mutex's
 * own reclaim, so only ONE of N concurrent sweepers wins. Never throws.
 *
 * @returns {{swept:boolean, reason?:string, ageMs?:number, frozen?:boolean|null}}
 */
export function sweepStaleIndexLock({
  lockPath,
  staleMs = DEFAULT_STALE_MS,
  freezeProbeMs = 500,
  now = () => Date.now(),
  statFn = statSync,
  renameFn = renameSync,
  unlinkFn = unlinkSync,
  existsFn = existsSync,
  sleepFn = sleep,
} = {}) {
  if (!lockPath) return { swept: false, reason: "no lockPath" };
  if (!existsFn(lockPath)) return { swept: false, reason: "no lock" };
  let st;
  try { st = statFn(lockPath); } catch { return { swept: false, reason: "stat failed" }; }
  const ageMs = now() - st.mtimeMs;
  if (ageMs <= staleMs) return { swept: false, reason: "not stale", ageMs };

  // Freeze probe — an actively-writing committer bumps mtime; a dead orphan does not.
  let frozen = null;
  let lastMtime = st.mtimeMs;
  if (freezeProbeMs > 0) {
    sleepFn(freezeProbeMs);
    try {
      const m1 = statFn(lockPath).mtimeMs;
      frozen = m1 === lastMtime;
      lastMtime = m1;
    } catch {
      return { swept: false, reason: "lock vanished during probe", ageMs };
    }
  }
  if (!isStaleIndexLock({ ageMs, staleMs, frozen })) {
    return { swept: false, reason: "owner alive (mtime advancing)", ageMs, frozen };
  }

  // Residual-risk note (U-FGC-4 review P1) — HONEST framing, not hidden:
  // git writes index.lock in a single pass (bumping mtime while it progresses,
  // which the freeze probe catches), then atomically renames it over `index`.
  // A lock frozen for >staleMs therefore means the owner is dead or HUNG, never
  // actively-progressing. Even in the worst residual case (a live git suspended
  // past staleMs), reclaiming the lock costs only a SPURIOUSLY-FAILED commit: the
  // hung git's later rename(index.lock→index) gets ENOENT and aborts, leaving the
  // real `index` byte-for-byte untouched — no corruption. This final pre-rename
  // recheck shrinks even that window: if a writer resumed since the probe (mtime
  // moved), bail rather than clobber.
  if (freezeProbeMs > 0) {
    try {
      if (statFn(lockPath).mtimeMs !== lastMtime) {
        return { swept: false, reason: "owner resumed before reclaim", ageMs, frozen: false };
      }
    } catch {
      return { swept: false, reason: "lock vanished before reclaim", ageMs };
    }
  }

  const claim = `${lockPath}.orphan-${process.pid}-${now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    renameFn(lockPath, claim);            // one winner per orphan inode
    try { unlinkFn(claim); } catch { /* best-effort cleanup */ }
    return { swept: true, ageMs, frozen };
  } catch {
    return { swept: false, reason: "lost reclaim race (peer swept it)", ageMs, frozen };
  }
}

/**
 * Acquire the advisory commit lock. Returns a release() fn. Blocks (bounded) on
 * a live peer; reclaims a stale lock. Throws only if it cannot acquire within
 * timeoutMs.
 */
export function acquireCommitLock({
  lockPath = DEFAULT_LOCK_REL,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  staleMs = DEFAULT_STALE_MS,
  pollMs = 250,
  now = () => Date.now(),
} = {}) {
  const host = hostname();
  const deadline = now() + timeoutMs;
  const body = JSON.stringify({ pid: process.pid, host, ts: now() });
  for (;;) {
    try {
      const fd = openSync(lockPath, "wx"); // O_EXCL atomic create
      writeSync(fd, body);
      closeSync(fd);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        try {
          // Only unlink if we still own it (guard against reclaim-by-peer).
          const cur = JSON.parse(readFileSync(lockPath, "utf8"));
          if (cur && cur.pid === process.pid && cur.host === host) unlinkSync(lockPath);
        } catch { /* already gone / unreadable — nothing to release */ }
      };
    } catch (e) {
      if (!e || e.code !== "EEXIST") throw e; // unexpected fs error
      // Lock held — inspect for staleness.
      let lock = null;
      let ageMs = Infinity;
      try {
        lock = JSON.parse(readFileSync(lockPath, "utf8"));
        ageMs = now() - statSync(lockPath).mtimeMs;
      } catch { /* unreadable/partial → treat as stale below */ }
      if (isStaleLock(lock, { ageMs, staleMs, host })) {
        // ATOMIC reclaim (P0 fix): rename the stale lock out of the way rather
        // than unlink it. renameSync moves a given inode exactly once, so only
        // one of N concurrent reclaimers wins — the losers get ENOENT and loop.
        // A bare unlink had a TOCTOU: reclaimer B could delete reclaimer A's
        // already-created FRESH lock, putting both in the critical section.
        const claimPath = `${lockPath}.reclaim-${process.pid}-${now()}-${Math.random().toString(36).slice(2, 8)}`;
        try {
          renameSync(lockPath, claimPath); // only one winner per stale inode
          try { unlinkSync(claimPath); } catch { /* best-effort cleanup */ }
        } catch { /* ENOENT — another reclaimer already moved it; just loop */ }
        continue;
      }
      if (now() >= deadline) {
        throw new Error(`commit-mutex: lock held by ${lock?.host ?? "?"}:${lock?.pid ?? "?"} for ${Math.round(ageMs / 1000)}s — acquire timed out after ${timeoutMs}ms`);
      }
      sleep(pollMs);
    }
  }
}

/**
 * Run `fn` while holding the commit lock; always release. Returns fn's result.
 */
export function withCommitLock(fn, opts = {}) {
  const release = acquireCommitLock(opts);
  try {
    return fn();
  } finally {
    release();
  }
}

/**
 * Commit an explicit pathspec under the mutex, retrying transient ref/index
 * races. Returns { ok, sha?, attempts, error? }. Never absorbs foreign staged
 * files (pathspec commit) — and warns to stderr if any are present.
 *
 * @param {{ message:string, paths:string[], retries?:number, cwd?:string,
 *           gitFn?:(args:string[])=>{stdout:string}, opts?:object }} arg
 */
export function commitLocked({ message, paths, retries = DEFAULT_RETRIES, cwd = process.cwd(), gitFn, opts = {} }) {
  if (typeof message !== "string" || !message.trim()) return { ok: false, attempts: 0, error: "empty commit message" };
  if (!Array.isArray(paths) || paths.length === 0) return { ok: false, attempts: 0, error: "no pathspec given (pathspec commit is required to avoid peer-absorption)" };

  const runGit = gitFn || ((args) => {
    const stdout = execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { stdout };
  });

  return withCommitLock(() => {
    // We hold the PRISM commit mutex → we are the only mutex-routed committer
    // here, so any `.git/index.lock` present now belongs to a NON-mutex peer:
    // young = a live commit (left alone by the age gate), old+frozen = a
    // reaped/crashed orphan we reclaim before it blocks us (U-FGC-4).
    const indexLock = gitIndexLockPath(cwd, runGit);
    try { sweepStaleIndexLock({ lockPath: indexLock }); } catch { /* non-fatal */ }

    // Foreign-staged warning (informational — pathspec commit ignores them).
    try {
      const staged = runGit(["diff", "--cached", "--name-only"]).stdout.split(/\r?\n/).filter(Boolean);
      const foreign = staged.filter((f) => !paths.includes(f));
      if (foreign.length) process.stderr.write(`commit-mutex: ${foreign.length} foreign staged file(s) present — committing only the requested pathspec (not absorbing peers).\n`);
    } catch { /* non-fatal */ }

    // Stage ONLY our paths first — required for new/untracked files (a bare
    // `git commit <pathspec>` rejects paths not yet known to git). The commit
    // below is still pathspec-restricted, so a peer's staged files are never
    // absorbed even though they share this index.
    runGit(["add", "--", ...paths]);
    let lastErr = "";
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        runGit(["commit", "-m", message, "--", ...paths]);
        const sha = runGit(["rev-parse", "HEAD"]).stdout.trim();
        return { ok: true, sha, attempts: attempt };
      } catch (e) {
        const stderr = (e && (e.stderr?.toString?.() || e.message)) || "";
        lastErr = stderr.trim().split(/\r?\n/).slice(-1)[0] || "unknown git error";
        if (!isTransientGitFailure(stderr)) {
          return { ok: false, attempts: attempt, error: `non-transient git failure: ${lastErr}` };
        }
        // Transient (peer moved HEAD / index.lock) — a stale orphan index.lock
        // may now be present; sweep it if dead, then brief backoff + re-parent.
        try { sweepStaleIndexLock({ lockPath: indexLock }); } catch { /* non-fatal */ }
        sleep(150 * attempt);
      }
    }
    return { ok: false, attempts: retries, error: `exhausted ${retries} retries on transient races; last: ${lastErr}` };
  }, opts.lock || {});
}

// ── CLI ──────────────────────────────────────────────────────────────────────
function parseArgv(argv) {
  const out = { _: [], paths: [] };
  let dashdash = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (dashdash) { out.paths.push(a); continue; }
    if (a === "--") { dashdash = true; continue; }
    if (a === "--message" || a === "-m") { out.message = argv[++i]; continue; }
    out._.push(a);
  }
  return out;
}

function main() {
  const args = parseArgv(process.argv.slice(2));
  const cmd = args._[0];
  if (cmd === "status") {
    const exists = existsSync(DEFAULT_LOCK_REL);
    let body = null;
    if (exists) { try { body = JSON.parse(readFileSync(DEFAULT_LOCK_REL, "utf8")); } catch { body = "<unreadable>"; } }
    console.log(JSON.stringify({ ok: true, locked: exists, holder: body }));
    return;
  }
  if (cmd === "commit") {
    let res;
    try {
      res = commitLocked({
        message: args.message,
        paths: args.paths,
        retries: Number(process.env.PRISM_COMMIT_MUTEX_RETRIES) || DEFAULT_RETRIES,
        opts: { lock: {
          timeoutMs: Number(process.env.PRISM_COMMIT_MUTEX_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
          staleMs: Number(process.env.PRISM_COMMIT_MUTEX_STALE_MS) || DEFAULT_STALE_MS,
        } },
      });
    } catch (e) {
      // acquire-timeout throws (lock held by a live peer past timeoutMs);
      // surface it as the same structured refusal the rest of the module emits,
      // never an uncaught stack trace (P1 fix — preserves the JSON contract).
      res = { ok: false, attempts: 0, error: String((e && e.message) || e) };
    }
    console.log(JSON.stringify(res));
    process.exitCode = res.ok ? 0 : 1;
    return;
  }
  console.error("usage: git-commit-mutex.mjs {commit --message <msg> -- <path...> | status}");
  process.exitCode = 2;
}

// Only run main when invoked directly (import-safe for tests).
import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
