#!/usr/bin/env node
/**
 * Cherry-Pick Consolidator — PRISM WORKTREE-CONSOLIDATE-MS0 / U-FND02
 *
 * Drives `git cherry-pick -x` from a stranded source worktree → merge-staging
 * branch with conflict detection. Uses `git -C <path>` so it never changes cwd.
 *
 * Multi-chat safe: relies on existing git-anti-clobber.mjs PreToolUse lock
 * which serializes git mutations per-worktree. Source worktrees are READ-ONLY
 * here (we only run `git log` against them); writes happen on the target.
 *
 * Usage:
 *   node mcp-server/scripts/cherry-pick-consolidator.mjs \
 *     --from <source-worktree-path> \
 *     [--range <git-range>]             # e.g. main..HEAD or sha1^..sha1
 *     [--contains <literal-substring>]  # subject must contain this literal text
 *     --to <target-worktree-path>       # H:/prism-merge-staging
 *     [--dry]                           # list commits without cherry-picking
 *
 * SAFETY:
 *   - --contains uses indexOf (literal match, no regex). For [MAIN] tag filtering
 *     pass --contains "[MAIN]" — no escaping needed, no ReDoS risk.
 *   - Argument values are passed to git via spawnSync arg arrays (NOT shell), so
 *     no shell-injection surface for sha/path/range/contains.
 *
 * Exit codes:
 *   0 = success
 *   1 = usage/argument error
 *   2 = source/target worktree not found or not a git checkout
 *   3 = no commits matched the range/contains filter
 *   4 = cherry-pick conflict (script aborts the in-progress cherry-pick before exit)
 */

import { spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { argv, exit } from "node:process";

// ── Argument parsing ──────────────────────────────────────────────────

const args = parseArgs(argv.slice(2));
if (!args.from || !args.to) {
  console.error("Usage: cherry-pick-consolidator.mjs --from <src> --to <dst> [--range <range>] [--contains <substr>] [--dry]");
  exit(1);
}

function parseArgs(arr) {
  const out = { dry: false };
  for (let i = 0; i < arr.length; i++) {
    const a = arr[i];
    if (a === "--from") out.from = arr[++i];
    else if (a === "--to") out.to = arr[++i];
    else if (a === "--range") out.range = arr[++i];
    else if (a === "--contains") out.contains = arr[++i];
    else if (a === "--dry") out.dry = true;
    else if (a === "--help" || a === "-h") {
      console.log("cherry-pick-consolidator.mjs — see header for usage");
      exit(0);
    }
  }
  return out;
}

const SRC = resolve(args.from);
const DST = resolve(args.to);

if (!existsSync(SRC) || !statSync(SRC).isDirectory()) {
  console.error(`ERROR: source worktree not found: ${SRC}`);
  exit(2);
}
if (!existsSync(DST) || !statSync(DST).isDirectory()) {
  console.error(`ERROR: target worktree not found: ${DST}`);
  exit(2);
}

for (const path of [SRC, DST]) {
  const r = spawnSync("git", ["-C", path, "rev-parse", "--is-inside-work-tree"], { encoding: "utf-8" });
  if (r.status !== 0 || r.stdout.trim() !== "true") {
    console.error(`ERROR: not a git worktree: ${path}`);
    exit(2);
  }
}

// ── Enumerate commits to cherry-pick ──────────────────────────────────

const range = args.range || "main..HEAD";
const logArgs = ["-C", SRC, "log", "--reverse", "--format=%H %s", range];
const logResult = spawnSync("git", logArgs, { encoding: "utf-8" });
if (logResult.status !== 0) {
  console.error(`ERROR: git log failed in ${SRC}: ${logResult.stderr}`);
  exit(2);
}

let commits = logResult.stdout
  .split("\n")
  .filter(Boolean)
  .map(line => {
    const idx = line.indexOf(" ");
    return { sha: line.slice(0, idx), subject: line.slice(idx + 1) };
  });

if (args.contains) {
  const needle = String(args.contains);
  commits = commits.filter(c => c.subject.indexOf(needle) !== -1);
}

if (commits.length === 0) {
  console.error(`No commits match range='${range}'${args.contains ? ` contains='${args.contains}'` : ""} in ${SRC}`);
  exit(3);
}

console.log(`\n=== ${commits.length} commit(s) to cherry-pick ===\n`);
for (const c of commits) {
  console.log(`  ${c.sha.slice(0, 9)}  ${c.subject.slice(0, 100)}`);
}

if (args.dry) {
  console.log(`\n[--dry] no cherry-pick performed.`);
  exit(0);
}

// ── Cherry-pick into target ───────────────────────────────────────────

console.log(`\n=== Cherry-picking into ${DST} ===\n`);

let picked = 0;
let conflicted = null;
for (const c of commits) {
  const r = spawnSync("git", ["-C", DST, "cherry-pick", "-x", c.sha], { encoding: "utf-8", stdio: "inherit" });
  if (r.status !== 0) {
    conflicted = c;
    break;
  }
  picked++;
}

if (conflicted) {
  console.error(`\nCONFLICT on ${conflicted.sha.slice(0, 9)}: ${conflicted.subject}`);
  console.error(`Aborting in-progress cherry-pick to leave target tree clean.`);
  spawnSync("git", ["-C", DST, "cherry-pick", "--abort"], { stdio: "inherit" });
  console.error(`\n${picked}/${commits.length} commit(s) successfully cherry-picked before conflict.`);
  console.error(`Resolve manually: cd ${DST} && git cherry-pick ${conflicted.sha}`);
  exit(4);
}

console.log(`\n✓ All ${picked} commit(s) cherry-picked into ${DST}`);
exit(0);
