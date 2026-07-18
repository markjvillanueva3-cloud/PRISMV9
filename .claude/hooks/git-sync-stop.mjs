#!/usr/bin/env node
// tier: T4
/**
 * git-sync-stop.mjs — Stop hook for cross-PC continuity.
 *
 * On every Claude Code session stop, pushes the current branch to origin so
 * the other PC sees the work next time it does git fetch (which the
 * git-sync-fetch SessionStart hook does automatically).
 *
 * Behavior:
 *   - Skip if branch is detached or HEAD has no commits
 *   - If branch has no upstream → push with -u to create one
 *   - If branch is ahead of upstream → plain push
 *   - If branch is behind or diverged → DO NOT push (would need merge first);
 *     just print a warning so the user is alerted at next SessionStart
 *   - Uncommitted changes are left alone (this hook never auto-commits)
 *
 * Non-blocking. Failure to push (offline, auth issue) is logged, not fatal.
 *
 * Pairs with git-sync-fetch.mjs (SessionStart divergence detection).
 * Companion to permanent cross-PC sync fix from 2026-04-21.
 */

import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const REPO = process.env.PRISM_GIT_REPO || "H:/prism";
const PUSH_TIMEOUT_MS = Number(process.env.PRISM_GIT_PUSH_TIMEOUT_MS || 30000);
const KILL_GRACE_MS = 2000; // SIGTERM → SIGKILL grace
const REMOTE_LOCK_FILE = process.env.PRISM_GIT_REMOTE_LOCK_FILE || "H:/prism/state/shared/GIT_LOCK_REMOTE.json";
const REMOTE_LOCK_TTL_MS = Number(process.env.PRISM_GIT_REMOTE_LOCK_TTL_MS || 180000);
const DRY_RUN = process.env.PRISM_GIT_SYNC_DRY_RUN === "1";
// PRISM-STAB-MS0/U-A1: bounded supervised push replaces legacy detached unref'd push.
// Set PRISM_GIT_SYNC_BOUNDED=0 to revert to legacy behaviour (rollback flag per spec).
const BOUNDED = process.env.PRISM_GIT_SYNC_BOUNDED !== "0";
const PUSH_LOG = "H:/prism/state/shared/git-sync-stop.log";

function logPush(record) {
  try {
    fs.mkdirSync(path.dirname(PUSH_LOG), { recursive: true });
    fs.appendFileSync(PUSH_LOG, JSON.stringify({ ts: new Date().toISOString(), ...record }) + "\n");
  } catch { /* never fatal */ }
}

function git(args, opts = {}) {
  try {
    return execFileSync("git", args, { windowsHide: true,
      cwd: REPO,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: opts.timeout ?? 5000,
      ...opts,
    }).trim();
  } catch (e) {
    return { error: e.message, stderr: e.stderr?.toString() ?? "" };
  }
}

function isOk(r) { return typeof r === "string"; }

function lockHolder() {
  return `git-sync-stop:${os.hostname()}:pid-${process.pid}`;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function isLiveLock(lock) {
  const createdAt = new Date(lock?.createdAt || 0).getTime();
  const expiresAt = new Date(lock?.expiresAt || 0).getTime();
  const deadline = Number.isFinite(expiresAt) && expiresAt > 0 ? expiresAt : createdAt + REMOTE_LOCK_TTL_MS;
  return Number.isFinite(deadline) && Date.now() < deadline;
}

function acquireRemoteLock() {
  const holder = lockHolder();
  fs.mkdirSync(path.dirname(REMOTE_LOCK_FILE), { recursive: true });

  for (let attempt = 0; attempt < 2; attempt++) {
    const existing = readJson(REMOTE_LOCK_FILE);
    if (existing && existing.holder !== holder && isLiveLock(existing)) {
      return {
        ok: false,
        holder,
        message: `remote git lock held by ${existing.holder}; skipping auto-push to avoid cross-session clobber`,
      };
    }

    if (existing && !isLiveLock(existing)) {
      try { fs.unlinkSync(REMOTE_LOCK_FILE); } catch {}
    }

    const lock = {
      kind: "git-remote",
      holder,
      pid: process.pid,
      hostname: os.hostname(),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + REMOTE_LOCK_TTL_MS).toISOString(),
    };

    try {
      const fd = fs.openSync(REMOTE_LOCK_FILE, "wx");
      try {
        fs.writeFileSync(fd, `${JSON.stringify(lock, null, 2)}\n`, "utf-8");
      } finally {
        fs.closeSync(fd);
      }
      return { ok: true, holder };
    } catch (err) {
      if (err?.code !== "EEXIST") throw err;
    }
  }

  const existing = readJson(REMOTE_LOCK_FILE);
  return {
    ok: false,
    holder,
    message: `remote git lock unavailable${existing?.holder ? `; held by ${existing.holder}` : ""}`,
  };
}

function releaseRemoteLock(holder) {
  try {
    const existing = readJson(REMOTE_LOCK_FILE);
    if (existing?.holder === holder) {
      fs.unlinkSync(REMOTE_LOCK_FILE);
    }
  } catch {
    // Non-fatal; stale locks expire by TTL.
  }
}

function pushWithRemoteLock(args) {
  const lock = acquireRemoteLock();
  if (!lock.ok) {
    return { blocked: true, error: lock.message, stderr: lock.message };
  }

  try {
    if (DRY_RUN) {
      return `dry-run: git ${args.join(" ")}`;
    }
    return git(args, { timeout: PUSH_TIMEOUT_MS });
  } finally {
    releaseRemoteLock(lock.holder);
  }
}

/**
 * PRISM-STAB-MS0/U-A1 (2026-05-09): bounded supervised push.
 *
 * Replaces the legacy detached+unref'd push that orphaned git.exe
 * processes when the push hung. Spawns git push with parent-supervised
 * stdio:"ignore", attaches an exit listener that releases the remote
 * lock, and a hard timeout that escalates SIGTERM → SIGKILL on hang.
 * Lock is ALWAYS released; child is ALWAYS reaped.
 *
 * Returns a Promise — caller (main) is async-aware.
 */
function supervisedPush(args) {
  const lock = acquireRemoteLock();
  if (!lock.ok) return Promise.resolve({ blocked: true, error: lock.message });
  if (DRY_RUN) {
    releaseRemoteLock(lock.holder);
    return Promise.resolve({ dryRun: true, message: `dry-run: git ${args.join(" ")}` });
  }

  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn("git", args, {
      cwd: REPO,
      stdio: "ignore",
      windowsHide: true,
    });
    let killed = false;
    let settled = false;

    const finish = (outcome) => {
      if (settled) return;
      settled = true;
      releaseRemoteLock(lock.holder);
      const durationMs = Date.now() - startedAt;
      logPush({ event: "push_done", args, durationMs, killed, ...outcome });
      resolve({ ...outcome, killed, durationMs });
    };

    const term = setTimeout(() => {
      killed = true;
      try { child.kill("SIGTERM"); } catch { /* nothing to kill */ }
      // Escalate to SIGKILL after grace if still alive
      setTimeout(() => {
        try { child.kill("SIGKILL"); } catch {}
      }, KILL_GRACE_MS);
    }, PUSH_TIMEOUT_MS);

    child.on("exit", (code, signal) => {
      clearTimeout(term);
      finish({ ok: code === 0, code, signal });
    });
    child.on("error", (err) => {
      clearTimeout(term);
      finish({ ok: false, error: err.message });
    });
  });
}

/**
 * Legacy detached push (preserved for PRISM_GIT_SYNC_BOUNDED=0 rollback).
 *
 * Acquires the remote lock, spawns `git push` as a detached child whose
 * stdio is ignored, and returns immediately. The lock is NOT explicitly
 * released by this process — it relies on the REMOTE_LOCK_TTL_MS expiry.
 *
 * KNOWN BUG: on Windows the unref'd child can outlive the parent and
 * accumulates orphan git.exe processes scanning a large working tree.
 * Use supervisedPush() instead. This function exists only as a rollback
 * escape hatch via env flag.
 */
function detachedPush(args) {
  const lock = acquireRemoteLock();
  if (!lock.ok) {
    return { blocked: true, error: lock.message };
  }
  if (DRY_RUN) {
    releaseRemoteLock(lock.holder);
    return { dryRun: true, message: `dry-run: git ${args.join(" ")}` };
  }
  try {
    const child = spawn("git", args, {
      cwd: REPO,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
    return { detached: true };
  } catch (e) {
    // Spawn itself failed — release the lock and surface the error.
    releaseRemoteLock(lock.holder);
    return { error: e.message };
  }
  // No release: child runs after we exit; the lock TTL covers cleanup.
}

function reportPushResult(label, branch, r) {
  if (r.dryRun) {
    process.stdout.write(`git-sync-stop: ${r.message}\n`);
  } else if (r.detached) {
    process.stdout.write(`git-sync-stop: ✓ queued push ${branch} (${label}, detached)\n`);
  } else if (r.blocked) {
    process.stdout.write(`git-sync-stop: ${r.error}. Try again after the active git operation finishes.\n`);
  } else if (r.killed) {
    process.stdout.write(
      `git-sync-stop: ⚠ push timed out after ${PUSH_TIMEOUT_MS}ms and was killed (${branch}, ${label}).\n` +
      `  Working tree is intact; rerun manually if needed.\n`
    );
  } else if (r.ok) {
    process.stdout.write(`git-sync-stop: ✓ pushed ${branch} (${label}, ${r.durationMs}ms)\n`);
  } else {
    process.stdout.write(
      `git-sync-stop: push failed for ${branch} (${label}): code=${r.code ?? "?"} sig=${r.signal ?? "?"} ${r.error ?? ""}\n`
    );
  }
}

async function main() {
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  if (!isOk(branch) || branch === "HEAD") {
    process.stdout.write("git-sync-stop: detached HEAD — skipping push\n");
    return;
  }

  // Pick push strategy. Bounded supervised is default; detached is rollback.
  const doPush = BOUNDED ? supervisedPush : (args) => Promise.resolve(detachedPush(args));

  // Detect upstream.
  const upstream = git(["rev-parse", "--abbrev-ref", `${branch}@{upstream}`]);
  const hasUpstream = isOk(upstream);

  if (!hasUpstream) {
    // First-ever push for this branch — establish upstream.
    process.stdout.write(`git-sync-stop: '${branch}' has no upstream — pushing with -u (${BOUNDED ? "supervised" : "detached"})\n`);
    const r = await doPush(["push", "-u", "origin", branch]);
    reportPushResult("upstream set", branch, r);
    return;
  }

  // Has upstream — check divergence.
  const ahead = git(["rev-list", "--count", `${upstream}..${branch}`]);
  const behind = git(["rev-list", "--count", `${branch}..${upstream}`]);

  if (!isOk(ahead) || !isOk(behind)) {
    process.stdout.write(`git-sync-stop: cannot read divergence vs ${upstream} — skipping\n`);
    return;
  }

  if (ahead === "0" && behind === "0") {
    process.stdout.write(`git-sync-stop: ${branch} already in sync with ${upstream} ✓\n`);
    return;
  }

  if (behind !== "0") {
    // Diverged or pure-behind — never auto-push (would either be no-op or need force).
    process.stdout.write(
      `git-sync-stop: ⚠ ${branch} is ${ahead} ahead AND ${behind} behind ${upstream} — NOT pushing.\n` +
      `  Resolve with: git pull --rebase     (then re-stop or push manually)\n`
    );
    return;
  }

  // Pure ahead — safe to push.
  process.stdout.write(`git-sync-stop: pushing ${ahead} commit(s) ${branch} → ${upstream} (${BOUNDED ? "supervised" : "detached"})\n`);
  const r = await doPush(["push"]);
  reportPushResult(`${ahead} commits`, branch, r);
}

main().catch((e) => {
  process.stderr.write(`git-sync-stop: non-fatal error: ${e.message}\n`);
  process.exit(0);
});
