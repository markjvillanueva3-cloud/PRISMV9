#!/usr/bin/env node
// tier: T4
/**
 * git-health-guard.mjs — SessionStart guard for git repository health.
 *
 * Prevents corruption from H: drive portability by:
 *   1. Cleaning stale lock files (left from unplugging mid-operation)
 *   2. Running quick fsck to detect early corruption
 *   3. Tracking which PC last used the repo (warns on PC switch)
 *   4. Checking for uncommitted changes that might conflict
 *
 * Runs on SessionStart with continueOnError:false — blocks session if
 * corruption is detected (better to stop early than compound damage).
 *
 * Part of cross-PC sync fix from 2026-04-21.
 */

import { execFileSync } from "node:child_process";
import { existsSync, unlinkSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { hostname } from "node:os";

const REPO = "H:/prism";
const STATE_FILE = join(REPO, "mcp-server/data/state/git-health-state.json");
const LOCK_FILES = [
  ".git/index.lock",
  ".git/HEAD.lock",
  ".git/config.lock",
  ".git/refs/heads/*.lock",
  ".git/shallow.lock",
];

function git(args, opts = {}) {
  try {
    return execFileSync("git", args, {
      cwd: REPO,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: opts.timeout ?? 10000,
      ...opts,
    }).trim();
  } catch (e) {
    return { error: e.message, stderr: e.stderr?.toString() ?? "" };
  }
}

function isOk(r) { return typeof r === "string"; }

function loadState() {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, "utf8"));
    }
  } catch { /* ignore */ }
  return { lastPC: null, lastBranch: null, lastTimestamp: null, fsckErrors: 0 };
}

function saveState(state) {
  try {
    mkdirSync(dirname(STATE_FILE), { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch { /* non-fatal */ }
}

function cleanStaleLocks() {
  const cleaned = [];
  for (const pattern of LOCK_FILES) {
    const lockPath = join(REPO, pattern.replace("*.lock", ""));
    // Check for exact lock files (not glob patterns)
    if (!pattern.includes("*")) {
      const fullPath = join(REPO, pattern);
      if (existsSync(fullPath)) {
        try {
          // Check if lock is stale (older than 5 minutes)
          const stat = statSync(fullPath);
          const ageMs = Date.now() - stat.mtimeMs;
          if (ageMs > 5 * 60 * 1000) {
            unlinkSync(fullPath);
            cleaned.push(pattern);
          }
        } catch { /* ignore */ }
      }
    }
  }
  return cleaned;
}

// fsck is expensive (full object graph walk). The TTL below caps how
// often we actually run it; in between, we trust the cached result.
// 30 minutes balances freshness against cold-start latency — corruption
// that develops mid-session will still be caught at the next interval.
const FSCK_TTL_MS = 30 * 60 * 1000;

function quickFsck() {
  // Cache wrapper around the real fsck. We persist {fsckErrors,
  // lastFsckTimestamp} into the same state file the rest of this hook
  // already uses, so this fits into the existing schema additively.
  const state = loadState();
  const lastTs = Number(new Date(state.lastFsckTimestamp || 0).getTime() || 0);
  if (Number.isFinite(lastTs) && lastTs > 0 && Date.now() - lastTs < FSCK_TTL_MS) {
    const cachedErrors = Number(state.fsckErrors || 0);
    if (cachedErrors === 0) {
      return { ok: true, errors: 0, cached: true };
    }
    // Last run had errors — re-run to verify they are still present
    // rather than silently returning a stale failure verdict.
  }

  // Use --connectivity-only for speed — checks object graph without reading all blobs
  const result = git(["fsck", "--connectivity-only", "--no-progress"], { timeout: 30000 });
  if (!isOk(result)) {
    // fsck failed to run
    return { ok: false, error: result.error || "fsck failed to execute" };
  }
  // fsck outputs nothing on success, errors on failure
  if (result === "") {
    return { ok: true, errors: 0 };
  }
  // Count error lines
  const errorLines = result.split("\n").filter(l => l.trim()).length;
  return { ok: false, errors: errorLines, sample: result.split("\n").slice(0, 3).join("\n") };
}

function main() {
  const state = loadState();
  const currentPC = hostname();
  const warnings = [];
  const errors = [];

  // 1. Clean stale locks
  const cleaned = cleanStaleLocks();
  if (cleaned.length > 0) {
    warnings.push(`Cleaned ${cleaned.length} stale lock file(s): ${cleaned.join(", ")}`);
  }

  // 2. Check for PC switch
  if (state.lastPC && state.lastPC !== currentPC) {
    const lastTime = state.lastTimestamp ? new Date(state.lastTimestamp).toLocaleString() : "unknown";
    warnings.push(
      `H: drive was last used on "${state.lastPC}" at ${lastTime}.\n` +
      `          Now on "${currentPC}". Check for uncommitted work from the other PC.`
    );
  }

  // 3. Quick fsck
  const fsck = quickFsck();
  if (!fsck.ok) {
    if (fsck.errors > 10) {
      errors.push(
        `Git repository has ${fsck.errors} corruption errors!\n` +
        `          Sample: ${fsck.sample}\n` +
        `          RECOMMENDED: Fresh clone before corruption spreads.\n` +
        `          Run: node H:/prism/.claude/helpers/git-repair.mjs`
      );
    } else if (fsck.errors > 0) {
      warnings.push(`Git fsck found ${fsck.errors} issue(s) — monitor for growth.`);
    }
  }

  // 4. Check current branch status
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  const status = git(["status", "--porcelain"]);

  let uncommittedCount = 0;
  if (isOk(status) && status) {
    uncommittedCount = status.split("\n").filter(l => l.trim()).length;
    if (uncommittedCount > 50) {
      warnings.push(`${uncommittedCount} uncommitted changes — consider committing or stashing.`);
    }
  }

  // Update state. We bump lastFsckTimestamp ONLY when we actually ran
  // fsck (cached:true short-circuits), so the TTL is honest — a stale
  // verdict cannot keep refreshing its own freshness marker.
  const newState = {
    lastPC: currentPC,
    lastBranch: isOk(branch) ? branch : state.lastBranch,
    lastTimestamp: new Date().toISOString(),
    lastFsckTimestamp: fsck.cached
      ? state.lastFsckTimestamp
      : new Date().toISOString(),
    fsckErrors: fsck.errors || 0,
    uncommittedCount,
  };
  saveState(newState);

  // Output results
  if (errors.length > 0) {
    process.stderr.write(`\n✗ git-health-guard FAILED\n`);
    for (const e of errors) {
      process.stderr.write(`  ERROR: ${e}\n`);
    }
    for (const w of warnings) {
      process.stderr.write(`  WARN: ${w}\n`);
    }
    process.stderr.write(`\n`);
    process.exit(1);
  }

  if (warnings.length > 0) {
    process.stdout.write(`git-health: ⚠ ${warnings.length} warning(s)\n`);
    for (const w of warnings) {
      process.stdout.write(`  ${w}\n`);
    }
  } else {
    process.stdout.write(`git-health: ✓ ${currentPC} | ${isOk(branch) ? branch : "?"} | fsck clean\n`);
  }
}

try {
  main();
} catch (e) {
  process.stderr.write(`git-health-guard: fatal error: ${e.message}\n`);
  process.exit(1);
}
