#!/usr/bin/env node
// tier: T2
/**
 * git-lock-sweeper.mjs — HS-02 mid-session stale-lock cleanup.
 *
 * Phase 1 (HS-02, 2026-05-12): Stop/UserPromptSubmit sweep with 5/60 min ages.
 * Phase 2 (DEV-VELOCITY-AUTOTRIGGER-MS0/U-C2, 2026-05-12): + PreToolUse:Bash
 * arm with retry-with-backoff and a shorter 30s min-age when fired immediately
 * before a git command. Rationale: a 30-second-old lock surfaced PreToolUse is
 * far more likely to be a peer-chat orphan than a 5-minute-old lock surfaced at
 * Stop — the operator is about to fire `git commit` and the lock is stopping
 * them right now.
 *
 * Wired (Phase 1): stop-bundle.mjs SUB_HOOKS (one fork per turn-end).
 * Wired (Phase 2): edit-bundle.mjs SHARED_HOOKS / .claude/settings.json
 *                  PreToolUse:Bash matcher entry.
 *
 * Safety:
 *   - Stop/UserPromptSubmit mode: locks <5 min old kept (live concurrent op
 *     guard); worktree locks <60 min old kept (long ops like git filter-repo)
 *   - PreToolUse:Bash on git command: locks <30 s old kept (sub-second granular
 *     concurrent-commit guard — a 30s+ lock just before YOUR commit is dead);
 *     worktree locks <60 min old kept (unchanged)
 *
 * Retry-with-backoff (Phase 2): NTFS handle races can cause EBUSY on unlink
 * even for "stale" locks. Each unlink retries 3× with 50ms/100ms/200ms backoff
 * before giving up. Removes "lock just won't go away" cycle on Windows.
 *
 * Cheap: ~5ms when no locks present. ~50-350ms on retry-loop hits (still well
 * within PreToolUse budget).
 */
import { readdirSync, statSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";

const REPO = "H:/prism";
const TOP_LOCK_MIN_AGE_MS = 5 * 60 * 1000;
const WORKTREE_LOCK_MIN_AGE_MS = 60 * 60 * 1000;
// U-C2 (2026-05-12): PreToolUse mode uses a tighter min-age — operator is
// committing right now, anything ≥30s old is a peer-chat orphan.
const PRETOOL_TOP_LOCK_MIN_AGE_MS = 30 * 1000;
// U-C2 retry-with-backoff for NTFS handle races
const UNLINK_RETRY_DELAYS_MS = [50, 100, 200];

const TOP_LOCKS = [
  ".git/index.lock",
  ".git/HEAD.lock",
  ".git/config.lock",
  ".git/shallow.lock",
  // 2026-05-18 (bravo) — crashed fetch/gc leaves this lock at
  // .git/objects/info/commit-graphs/commit-graph-chain.lock and it persists
  // until manual rm, blocking every subsequent `git fetch` commit-graph update
  // with `fatal: Unable to create '…/commit-graph-chain.lock': File exists`.
  // Same lifetime semantics as index.lock (held only during atomic write), so
  // the same 5-min / 30s age thresholds are correct.
  ".git/objects/info/commit-graphs/commit-graph-chain.lock",
];

function sleep(ms) {
  // Synchronous-friendly sleep via Atomics; avoids async re-entrancy here.
  const buf = new SharedArrayBuffer(4);
  const view = new Int32Array(buf);
  try { Atomics.wait(view, 0, 0, ms); } catch { /* fallback: busy-wait short */
    const end = Date.now() + ms;
    while (Date.now() < end) { /* spin */ }
  }
}

function tryRemove(filePath, minAgeMs) {
  try {
    if (!existsSync(filePath)) return null;
    const st = statSync(filePath);
    if (Date.now() - st.mtimeMs < minAgeMs) return null;
    // U-C2 retry-with-backoff for NTFS EBUSY handle races
    let lastErr = null;
    for (let attempt = 0; attempt <= UNLINK_RETRY_DELAYS_MS.length; attempt++) {
      try {
        unlinkSync(filePath);
        return filePath;
      } catch (e) {
        lastErr = e;
        if (attempt < UNLINK_RETRY_DELAYS_MS.length) {
          sleep(UNLINK_RETRY_DELAYS_MS[attempt]);
          // Re-check existence in case a peer process just released + reclaimed
          if (!existsSync(filePath)) return null;
        }
      }
    }
    // All retries exhausted; surface null (caller treats as "not removed")
    if (lastErr && process.env.PRISM_GIT_LOCK_SWEEPER_VERBOSE === "1") {
      try { process.stderr.write(`git-lock-sweeper: unlink retries exhausted on ${filePath}: ${lastErr.message}\n`); } catch { /* */ }
    }
    return null;
  } catch {
    return null;
  }
}

function sweepWorktreeLocks() {
  const removed = [];
  try {
    const dir = join(REPO, ".git/worktrees");
    if (!existsSync(dir)) return removed;
    for (const wt of readdirSync(dir)) {
      const lock = join(dir, wt, "index.lock");
      const r = tryRemove(lock, WORKTREE_LOCK_MIN_AGE_MS);
      if (r) removed.push(r);
    }
  } catch { /* ignore */ }
  return removed;
}

function sweepRefHeadsLocks() {
  const removed = [];
  try {
    const refsHeads = join(REPO, ".git/refs/heads");
    if (!existsSync(refsHeads)) return removed;
    const walk = (d) => {
      for (const ent of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, ent.name);
        if (ent.isDirectory()) walk(p);
        else if (ent.name.endsWith(".lock")) {
          const r = tryRemove(p, TOP_LOCK_MIN_AGE_MS);
          if (r) removed.push(r);
        }
      }
    };
    walk(refsHeads);
  } catch { /* ignore */ }
  return removed;
}

// U-C2: read stdin synchronously to detect PreToolUse mode + git command match.
// Falls back to whole-buffer collection only — same as the readStdin pattern in
// edit-bundle.mjs / posttool-edit-bundle.mjs. Bounded to ~200ms then proceeds.
function readStdinPayload() {
  return new Promise((resolve) => {
    let buf = "";
    let resolved = false;
    const fin = () => { if (!resolved) { resolved = true; try { resolve(JSON.parse(buf || "{}")); } catch { resolve({}); } } };
    process.stdin.on("data", (c) => { buf += c; });
    process.stdin.on("end", fin);
    setTimeout(fin, 200);
  });
}

async function main() {
  const payload = await readStdinPayload();

  // U-C2: classify mode. PreToolUse:Bash on a `git ` command gets the tighter
  // 30-second top-lock age threshold; everything else (Stop/UserPromptSubmit
  // sweep) keeps the legacy 5-min threshold.
  const isPreToolBash = (payload.tool_name === "Bash" || payload.toolName === "Bash") &&
    (payload.hook_event_name === "PreToolUse" || payload.hookEventName === "PreToolUse");
  const cmd = String((payload.tool_input || payload.input || {}).command || "").trim();
  const isGitCmd = /^(rtk\s+)?(git|gh)\b/.test(cmd.toLowerCase());
  const useTightAge = isPreToolBash && isGitCmd;
  const topLockAge = useTightAge ? PRETOOL_TOP_LOCK_MIN_AGE_MS : TOP_LOCK_MIN_AGE_MS;

  const removed = [];
  for (const rel of TOP_LOCKS) {
    const r = tryRemove(join(REPO, rel), topLockAge);
    if (r) removed.push(r);
  }
  removed.push(...sweepWorktreeLocks());
  removed.push(...sweepRefHeadsLocks());

  if (removed.length > 0) {
    // 2026-05-26 (U-C4-GIT-LOCK-SWEEPER-NOISE-SUPPRESS, slot:alpha): the "cleared N
    // stale lock(s)" message is maintenance telemetry — operators don't act on it,
    // it just leaks into prompt context (C4 in DORMANT-FEATURES-ENUMERATION-2026-05-26).
    // The ACTION (lock removal) is the durable record; the prompt note is redundant.
    // Default silent; opt in via PRISM_GIT_LOCK_SWEEPER_VERBOSE=1.
    if (process.env.PRISM_GIT_LOCK_SWEEPER_VERBOSE === "1") {
      const ctx = `git-lock-sweeper${useTightAge ? " (PreToolUse:30s)" : ""}: cleared ${removed.length} stale lock(s) — ${removed.map((p) => p.replace(REPO + "/", "")).join(", ")}`;
      process.stdout.write(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: useTightAge ? "PreToolUse" : "Stop",
          additionalContext: ctx,
        },
      }));
    } else {
      process.stdout.write(JSON.stringify({ continue: true }));
    }
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
});
