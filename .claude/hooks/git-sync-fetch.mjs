#!/usr/bin/env node
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

const REPO = "H:/prism";
const FETCH_TIMEOUT_MS = 8000;

function git(args, opts = {}) {
  try {
    return execFileSync("git", args, {
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

function main() {
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  if (!branch || branch === "HEAD") {
    process.stdout.write("git-sync: detached HEAD or no branch — skipping\n");
    return;
  }

  // Quick fetch (non-fatal if offline).
  const fetchOk = git(["fetch", "origin", "--quiet"], { timeout: FETCH_TIMEOUT_MS }) !== null;
  if (!fetchOk) {
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
