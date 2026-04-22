#!/usr/bin/env node
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

import { execFileSync } from "node:child_process";

const REPO = "H:/prism";
const PUSH_TIMEOUT_MS = 30000;

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
    return { error: e.message, stderr: e.stderr?.toString() ?? "" };
  }
}

function isOk(r) { return typeof r === "string"; }

function main() {
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  if (!isOk(branch) || branch === "HEAD") {
    process.stdout.write("git-sync-stop: detached HEAD — skipping push\n");
    return;
  }

  // Detect upstream.
  const upstream = git(["rev-parse", "--abbrev-ref", `${branch}@{upstream}`]);
  const hasUpstream = isOk(upstream);

  if (!hasUpstream) {
    // First-ever push for this branch — establish upstream.
    process.stdout.write(`git-sync-stop: '${branch}' has no upstream — pushing with -u\n`);
    const r = git(["push", "-u", "origin", branch], { timeout: PUSH_TIMEOUT_MS });
    if (isOk(r)) {
      process.stdout.write(`git-sync-stop: ✓ pushed ${branch} → origin/${branch} (upstream set)\n`);
    } else {
      process.stdout.write(
        `git-sync-stop: push failed for ${branch}\n` +
        `  ${r.stderr?.split("\n").slice(0, 4).join("\n  ") || r.error}\n` +
        `  Other PC will not see this branch's commits until you push manually.\n`
      );
    }
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
  process.stdout.write(`git-sync-stop: pushing ${ahead} commit(s) ${branch} → ${upstream}\n`);
  const r = git(["push"], { timeout: PUSH_TIMEOUT_MS });
  if (isOk(r)) {
    process.stdout.write(`git-sync-stop: ✓ pushed ${branch} (${ahead} commits)\n`);
  } else {
    process.stdout.write(
      `git-sync-stop: push failed for ${branch}\n` +
      `  ${r.stderr?.split("\n").slice(0, 4).join("\n  ") || r.error}\n`
    );
  }
}

try {
  main();
} catch (e) {
  process.stderr.write(`git-sync-stop: non-fatal error: ${e.message}\n`);
  process.exit(0);
}
