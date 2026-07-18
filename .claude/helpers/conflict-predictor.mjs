#!/usr/bin/env node
// helpers/conflict-predictor.mjs
//
// Pre-commit conflict simulation.
// Runs `git merge --no-commit --no-ff origin/<base>` in a scratch worktree
// against the current branch. If the simulated merge would have conflicts,
// returns them with the peer chat owner of each conflicting file (looked up
// from phase-claims.jsonl).
//
// Usage:
//   conflict-predictor.mjs check                  → check current branch vs origin/main
//   conflict-predictor.mjs check --base=main      → vs different base
//   conflict-predictor.mjs check --json           → machine-readable
//   conflict-predictor.mjs check --proposed=<sha> → simulate a specific commit
//
// Exit code:
//   0 = no conflict predicted
//   1 = conflict predicted (details on stdout/stderr)
//   2 = error (could not run check)

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRISM_ROOT = path.resolve(__dirname, "..", "..");
const STATE_DIR = path.join(PRISM_ROOT, "state", "shared");
const CLAIMS_LOG = path.join(STATE_DIR, "phase-claims.jsonl");

const SCRATCH_PREFIX = "prism-conflict-sim-";
const CMD_TIMEOUT_MS = 30000;

function git(cmd, opts = {}) {
  return execSync(`git ${cmd}`, { windowsHide: true,
    cwd: opts.cwd || PRISM_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: CMD_TIMEOUT_MS,
    ...opts
  }).trim();
}

function tryGit(cmd, opts = {}) {
  try { return { ok: true, out: git(cmd, opts) }; }
  catch (e) { return { ok: false, err: e.stderr?.toString() || e.message, out: e.stdout?.toString() || "" }; }
}

function getCurrentBranch() {
  return git("rev-parse --abbrev-ref HEAD");
}

function getCurrentSha() {
  return git("rev-parse HEAD");
}

function getRecentClaimsByFile() {
  // Walk phase-claims.jsonl tail to build a {worktree → owner} map.
  // Files in <worktree> are owned by the chat that claimed the phase.
  const events = [];
  try {
    const raw = fs.readFileSync(CLAIMS_LOG, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      if (!line.trim() || line.startsWith("{\"_comment")) continue;
      try { events.push(JSON.parse(line)); } catch {}
    }
  } catch { /* claim log absent */ }

  // Reduce: most recent event per phase wins.
  const phaseToOwner = new Map();
  for (const e of events) {
    if (!e.phase_id) continue;
    if (e.kind === "claim" || e.kind === "heartbeat") phaseToOwner.set(e.phase_id, e.normalized_id || e.chat_id);
    else if (e.kind === "release" || e.kind === "merged") phaseToOwner.delete(e.phase_id);
  }
  return phaseToOwner;
}

function annotateConflictWithOwner(filePath, claimsMap) {
  // Heuristic: if the file path contains a worktree-like segment that maps to a phase,
  // attribute it to that phase's current owner. Otherwise unknown.
  for (const [phase, owner] of claimsMap.entries()) {
    if (filePath.includes(phase.toLowerCase())) return { phase, owner };
  }
  return { phase: null, owner: null };
}

function checkConflict({ base = "main", proposed = null } = {}) {
  // 1. Verify we're in a git repo
  const inRepo = tryGit("rev-parse --is-inside-work-tree");
  if (!inRepo.ok) {
    return { ok: false, reason: "not in a git repo", details: inRepo.err };
  }

  // 2. Fetch latest origin/<base>
  const fetched = tryGit(`fetch origin ${base} --quiet`);
  if (!fetched.ok && !fetched.err.includes("up-to-date")) {
    // Don't fail hard — offline or restricted; just warn
    process.stderr.write(`[conflict-predictor] warning: fetch failed: ${fetched.err.split("\n")[0]}\n`);
  }

  const currentBranch = getCurrentBranch();
  const headSha = proposed || getCurrentSha();

  // 3. Check if base ref exists
  const baseRef = `origin/${base}`;
  const refExists = tryGit(`rev-parse --verify ${baseRef}`);
  if (!refExists.ok) {
    return { ok: false, reason: `${baseRef} not found`, details: refExists.err };
  }

  // 4. Get merge-base + diff stats first (fast path: no divergence => no conflict)
  const mb = tryGit(`merge-base ${headSha} ${baseRef}`);
  if (mb.ok) {
    const aheadBehind = tryGit(`rev-list --left-right --count ${headSha}...${baseRef}`);
    if (aheadBehind.ok) {
      const [ahead, behind] = aheadBehind.out.split(/\s+/).map(n => parseInt(n, 10));
      if (behind === 0) {
        return { conflict: false, reason: "branch is up-to-date with base; no conflict possible", ahead, behind: 0 };
      }
    }
  }

  // 5. Run merge-tree (git's own conflict simulator — no working tree mutation)
  // git merge-tree exists in modern git (2.38+) and does NOT mutate state.
  const mergeTree = tryGit(`merge-tree --no-messages --name-only ${baseRef} ${headSha}`);

  if (mergeTree.ok) {
    // Modern git: any output = conflict
    const conflictFiles = mergeTree.out.split(/\r?\n/).filter(Boolean);
    if (conflictFiles.length === 0) {
      return { conflict: false, ahead: undefined, behind: undefined };
    }
    const claims = getRecentClaimsByFile();
    const annotated = conflictFiles.map(f => ({ file: f, ...annotateConflictWithOwner(f, claims) }));
    return {
      conflict: true,
      currentBranch,
      base: baseRef,
      conflict_files: conflictFiles,
      annotated,
      action: "Run /sync-rebase to fetch + rebase before pushing. If conflicts persist, coordinate with peer chat owners listed."
    };
  }

  // 6. Fallback: scratch-worktree simulation (older git)
  const scratch = path.join(os.tmpdir(), `${SCRATCH_PREFIX}${process.pid}`);
  try {
    tryGit(`worktree add --detach ${scratch} ${headSha}`);
    const merge = tryGit(`merge --no-commit --no-ff ${baseRef}`, { cwd: scratch });
    if (merge.ok) {
      tryGit(`merge --abort`, { cwd: scratch });
      return { conflict: false };
    }
    // Conflict — list unmerged files
    const unmerged = tryGit("diff --name-only --diff-filter=U", { cwd: scratch });
    const conflictFiles = unmerged.ok ? unmerged.out.split(/\r?\n/).filter(Boolean) : [];
    tryGit(`merge --abort`, { cwd: scratch });
    const claims = getRecentClaimsByFile();
    const annotated = conflictFiles.map(f => ({ file: f, ...annotateConflictWithOwner(f, claims) }));
    return {
      conflict: true,
      currentBranch,
      base: baseRef,
      conflict_files: conflictFiles,
      annotated,
      action: "Run /sync-rebase to fetch + rebase before pushing.",
      note: "Used scratch-worktree fallback (git merge-tree unavailable)"
    };
  } finally {
    tryGit(`worktree remove --force ${scratch}`);
    try { fs.rmSync(scratch, { recursive: true, force: true }); } catch {}
  }
}

const action = process.argv[2] || "check";
const baseArg = process.argv.find(a => a.startsWith("--base="))?.split("=")[1] || "main";
const proposedArg = process.argv.find(a => a.startsWith("--proposed="))?.split("=")[1];
const asJson = process.argv.includes("--json");

if (action !== "check") {
  process.stderr.write("usage: conflict-predictor.mjs check [--base=main] [--proposed=<sha>] [--json]\n");
  process.exit(2);
}

const result = checkConflict({ base: baseArg, proposed: proposedArg });

if (asJson) {
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
} else if (result.ok === false) {
  process.stderr.write(`SKIP (cannot check): ${result.reason}\n`);
  process.exit(2);
} else if (result.conflict) {
  process.stdout.write(`CONFLICT PREDICTED on branch ${result.currentBranch} vs ${result.base}:\n`);
  for (const f of result.annotated) {
    const owner = f.owner ? ` [owner: ${f.owner}, phase: ${f.phase}]` : "";
    process.stdout.write(`  - ${f.file}${owner}\n`);
  }
  process.stdout.write(`\nAction: ${result.action}\n`);
  process.exit(1);
} else {
  process.stdout.write("OK: no conflict predicted\n");
  process.exit(0);
}
