#!/usr/bin/env node
// tier: T1
/**
 * git-index-lock-sweep.mjs — PreToolUse:Bash — clear a DEAD orphan
 * `.git/index.lock` before any index-touching git command, so the fleet's raw
 * `git commit` / `git add` / `git merge` (etc.) never hard-fails on a lock left
 * behind by a reaped or crashed git process.
 *
 * FLEET-GIT-CONTENTION-MS0/U-FGC-5 — the zero-chat-change ADOPTION of the U-FGC-1
 * mutex's orphan reclaim (U-FGC-4). The shared `H:/prism` tree has ~26 NATO chats
 * committing into ONE index; when the fleet-reaper kills an orphaned git PID it
 * leaves `.git/index.lock` behind, and THEN every committer gets
 * `Unable to create '.git/index.lock': File exists` until someone clears it
 * (observed: a 303s-frozen orphan blocked the whole fleet, exit-255 storms).
 *
 * This hook does NOT serialize commits (full serialization needs the mutex CLI);
 * it removes the dead-orphan BLOCKER, transparently, before the command runs.
 * It REUSES `sweepStaleIndexLock` from git-commit-mutex.mjs (R8 — one reclaim
 * policy, no fork).
 *
 * RELATIONSHIP to the existing periodic sweeper (R7 — surfaced, not duplicated):
 * `scripts/system-health/04-prism-mcp-orphan-monitor.ps1` already sweeps stale
 * `.git/index.lock` — but it is a PERIODIC scheduled task, AGE-ONLY (60s, no
 * liveness probe), hardcoded to 3 tree paths. That leaves the exact gap that
 * blocked the fleet (an orphan that appears between ticks blocks every committer
 * until the next tick — a 303s-frozen orphan was observed). This hook is the
 * complementary JUST-IN-TIME, in-process, cwd-aware layer with a freeze-probe
 * liveness gate (safer: it will not clear a lock an active committer is still
 * writing). Defense in depth, two triggers, one shared reclaim policy.
 *
 * Conservative + fail-soft by construction:
 *   • Never blocks the command — always emits `continue: true`.
 *   • Only reclaims a lock that is BOTH older than the stale threshold AND frozen
 *     (mtime not advancing over a short probe) — a live committer's young/active
 *     lock is left strictly alone (the freeze probe is the liveness signal, since
 *     git's index.lock carries no PID).
 *   • Only ever touches `<cwd>/.git/index.lock` when `.git` is a real directory
 *     (the shared-tree contention case). In a slot worktree (`.git` is a file,
 *     own index, no N-committer problem) it is a silent no-op.
 *   • Any hook error → passthrough (a hook must never break a git command).
 *
 * @hook PreToolUse:Bash
 *
 * Env:
 *   PRISM_GIT_LOCK_SWEEP_DISABLE=1  → passthrough (no sweep)
 *   PRISM_GIT_LOCK_SWEEP_STALE_MS   → stale age before reclaim (default 120000, floor 30000)
 *   PRISM_GIT_LOCK_SWEEP_PROBE_MS   → freeze-probe window ms (default 500; 0 = age-only)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { sweepStaleIndexLock } from "../helpers/git-commit-mutex.mjs";

const DEFAULT_STALE_MS = 120000;
const STALE_FLOOR_MS = 30000; // never reclaim a lock younger than this, regardless of env
const DEFAULT_PROBE_MS = 500;

// Index/ref-locking git subcommands. The match is deliberately loose — it lazily
// skips any global options (`git -C <path> commit`, `git -c k=v merge`) to reach
// the verb, and stops at a shell separator (`; | &`) so a later clause can't be
// mis-read as part of this invocation. A false positive (e.g. `git log
// --grep=xyz reset`, or `git worktree add`) is harmless: it costs a sub-ms
// existsSync that finds no stale lock and no-ops — a match can ONLY ever trigger
// the triple-gated reclaim of a dead orphan, never a block or mutation.
// Intentionally OMITTED: `am` (rare mailbox-apply, "am" is an FP magnet inside
// messages), `rm`/`mv` (`\brm\b`/`\bmv\b` match inside hyphenated paths — too
// noisy; the periodic PS sweeper backstops a crash during those rarer ops).
const INDEX_TOUCHING_RE =
  /\bgit\s+[^;|&\n]*?\b(commit|merge|rebase|cherry-pick|stash|pull|revert|reset|restore|apply|add)\b/;

/**
 * Does a shell command (possibly an rtk/command-prefixed `&&` chain) invoke an
 * index-touching git subcommand? Pure — unit-tested directly.
 * @param {string} command
 * @returns {boolean}
 */
export function isIndexTouchingGitCommand(command) {
  return typeof command === "string" && INDEX_TOUCHING_RE.test(command);
}

/**
 * Resolve the shared-tree `.git/index.lock` path for `cwd`, but ONLY when `.git`
 * is a real directory (the contended shared tree). Returns null for a worktree
 * (`.git` is a file → own index, no fleet contention) or when `.git` is absent.
 * Pure-shell: fs probes injectable for tests.
 * @returns {string|null}
 */
export function resolveSharedIndexLock(cwd, { statFn = fs.statSync, existsFn = fs.existsSync } = {}) {
  const gitPath = path.join(cwd, ".git");
  if (!existsFn(gitPath)) return null;
  try {
    if (!statFn(gitPath).isDirectory()) return null; // worktree (.git is a file)
  } catch {
    return null;
  }
  return path.join(gitPath, "index.lock");
}

function resolveStaleMs() {
  const raw = Number(process.env.PRISM_GIT_LOCK_SWEEP_STALE_MS);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_STALE_MS;
  return Math.max(STALE_FLOOR_MS, raw); // floor guards against a DoS-by-config tiny value
}

function resolveProbeMs() {
  const raw = Number(process.env.PRISM_GIT_LOCK_SWEEP_PROBE_MS);
  if (!Number.isFinite(raw) || raw < 0) return DEFAULT_PROBE_MS;
  return raw;
}

const emit = (o) => process.stdout.write(JSON.stringify(o));
const PASS = { continue: true };

/**
 * Core: given the parsed hook stdin + a cwd, decide and (maybe) sweep.
 * Returns the hook output object. `sweepFn` injectable for hermetic tests.
 */
export function run(stdin, { cwd = process.cwd(), sweepFn = sweepStaleIndexLock, resolveLock = resolveSharedIndexLock } = {}) {
  if (process.env.PRISM_GIT_LOCK_SWEEP_DISABLE === "1") return PASS;
  if (!stdin || stdin.tool_name !== "Bash") return PASS;
  const command = stdin.tool_input && stdin.tool_input.command;
  if (!isIndexTouchingGitCommand(command)) return PASS;

  const lockPath = resolveLock(cwd);
  if (!lockPath) return PASS;

  const res = sweepFn({ lockPath, staleMs: resolveStaleMs(), freezeProbeMs: resolveProbeMs() });
  if (res && res.swept) {
    return {
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext:
          `[git-lock-sweep] cleared a dead orphan .git/index.lock (age ${Math.round((res.ageMs || 0) / 1000)}s, ` +
          `frozen=${res.frozen}) left by a reaped/crashed git PID — your git command will proceed. ` +
          `[FLEET-GIT-CONTENTION-MS0/U-FGC-5]`,
      },
    };
  }
  return PASS;
}

// ── main (import-safe) ───────────────────────────────────────────────────────
function main() {
  let stdin = null;
  try {
    if (!process.stdin.isTTY) {
      const raw = fs.readFileSync(0, "utf8");
      if (raw && raw.trim().startsWith("{")) stdin = JSON.parse(raw);
    }
  } catch {
    return emit(PASS); // unreadable/garbled stdin → never block the command
  }
  try {
    emit(run(stdin, {}));
  } catch {
    emit(PASS); // any failure → passthrough; a hook must not break a git command
  }
}

import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
