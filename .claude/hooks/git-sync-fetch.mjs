#!/usr/bin/env node
// tier: T4
/**
 * git-sync-fetch.mjs — SessionStart hook for cross-PC continuity.
 *
 * Runs `git fetch origin --quiet` for the PRISM repo, then prints a banner
 * to chat reporting:
 *   - Current branch
 *   - Whether it has an upstream
 *   - Commits ahead / behind origin
 *   - Suggested action when diverged ("git pull --rebase" or "git push")
 *
 * Non-blocking. Read-only. Will NEVER pull or push automatically here —
 * that's the user's call. The job is to surface the state so the user sees
 * "yesterday's other-PC commits not in this branch yet" before they edit.
 *
 * Designed as a permanent fix for the "two PCs, one H: drive, no sync"
 * problem documented in 2026-04-21 conversation. Pairs with
 * git-sync-stop.mjs (auto-push at session end).
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const REPO = process.env.PRISM_GIT_REPO || "H:/prism";
const FETCH_TIMEOUT_MS = 8000;
const REMOTE_LOCK_FILE = process.env.PRISM_GIT_REMOTE_LOCK_FILE || "H:/prism/state/shared/GIT_LOCK_REMOTE.json";
const REMOTE_LOCK_TTL_MS = Number(process.env.PRISM_GIT_REMOTE_LOCK_TTL_MS || 180000);
const DRY_RUN = process.env.PRISM_GIT_SYNC_DRY_RUN === "1";

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
    return null;
  }
}

function lockHolder() {
  return `git-sync-fetch:${os.hostname()}:pid-${process.pid}`;
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
        message: `remote git lock held by ${existing.holder}; skipping fetch to avoid cross-session clobber`,
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

function fetchWithRemoteLock() {
  const lock = acquireRemoteLock();
  if (!lock.ok) {
    return { ok: false, blocked: true, message: lock.message };
  }

  try {
    if (DRY_RUN) {
      return { ok: true, dryRun: true, message: "dry-run: git fetch origin --quiet" };
    }
    return { ok: git(["fetch", "origin", "--quiet"], { timeout: FETCH_TIMEOUT_MS }) !== null };
  } finally {
    releaseRemoteLock(lock.holder);
  }
}

function main() {
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  if (!branch || branch === "HEAD") {
    process.stdout.write("git-sync: detached HEAD or no branch — skipping\n");
    return;
  }

  // Quick fetch (non-fatal if offline).
  const fetchResult = fetchWithRemoteLock();
  if (fetchResult.blocked) {
    process.stdout.write(`git-sync: ${fetchResult.message} — using last-known origin state\n`);
  } else if (!fetchResult.ok) {
    process.stdout.write(`git-sync: fetch failed (offline?) — using last-known origin state\n`);
  }

  const upstream = git(["rev-parse", "--abbrev-ref", `${branch}@{upstream}`]);
  if (!upstream) {
    process.stdout.write(
      `git-sync: branch '${branch}' has NO upstream → first push will need\n` +
      `          git push -u origin ${branch}    (or wait for git-sync-stop hook)\n`
    );
    return;
  }

  const ahead = git(["rev-list", "--count", `${upstream}..${branch}`]) || "?";
  const behind = git(["rev-list", "--count", `${branch}..${upstream}`]) || "?";

  if (ahead === "0" && behind === "0") {
    process.stdout.write(`git-sync: ${branch} ↔ ${upstream} in sync ✓\n`);
    return;
  }

  if (ahead !== "0" && behind === "0") {
    process.stdout.write(
      `git-sync: ${branch} is ${ahead} ahead of ${upstream} (push pending — git-sync-stop will handle)\n`
    );
    return;
  }

  if (ahead === "0" && behind !== "0") {
    process.stdout.write(
      `git-sync: ⚠ ${branch} is ${behind} BEHIND ${upstream} — pulled commits exist on origin you don't have.\n` +
      `          Other PC pushed work since you were last on this branch.\n` +
      `          Suggested: git pull --ff-only      (or --rebase if you have local edits)\n`
    );
    return;
  }

  // Diverged — both ahead and behind.
  process.stdout.write(
    `git-sync: ⚠ DIVERGED — ${branch} is ${ahead} ahead AND ${behind} behind ${upstream}.\n` +
    `          Both this PC and the other PC committed to the same branch since the last sync.\n` +
    `          You will need to merge or rebase before push works.\n` +
    `          Suggested: git fetch && git log ${branch}..${upstream}    (inspect remote work first)\n`
  );
}

try {
  main();
} catch (e) {
  // Never fail the SessionStart pipeline.
  process.stderr.write(`git-sync-fetch: non-fatal error: ${e.message}\n`);
  process.exit(0);
}
