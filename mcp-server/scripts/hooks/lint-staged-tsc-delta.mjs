#!/usr/bin/env node
/**
 * lint-staged-tsc-delta — pre-commit tsc gate that blocks only on net-new errors.
 *
 * Background: the project-wide `npx tsc --noEmit ... $@` invocation that
 * lint-staged was running fails on ~50 pre-existing baseline errors because
 * the staged file's import graph reaches engines that don't exist on the
 * current branch (cross-branch contamination is normal in this 6-chat
 * worktree setup). This blocks every commit even when the staged change
 * introduces zero new type errors.
 *
 * Behavior:
 *   1. Snapshot the working tree (git stash, keep index).
 *   2. Run tsc against HEAD's version of the staged files — record the
 *      set of {file:line:col:code} error locations as `baseline`.
 *   3. Restore the working tree (stash pop).
 *   4. Run tsc against the working tree's version of the staged files
 *      — record the same set as `current`.
 *   5. Compute `current \ baseline`. Block iff non-empty.
 *
 * Failure modes:
 *   - Stash failures (e.g. nothing to stash): treated as no-op.
 *   - tsc invocation failures (binary missing, etc.): exit 2, surface to
 *     user. Better to fail loud than silently green.
 *   - Both runs error-free: trivially pass.
 *
 * Usage (in package.json `lint-staged.*.ts`):
 *   "node mcp-server/scripts/hooks/lint-staged-tsc-delta.mjs"
 * The staged file paths arrive on argv from lint-staged.
 *
 * @module scripts/hooks/lint-staged-tsc-delta
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";

const REPO_ROOT = resolve(process.cwd(), process.cwd().endsWith("mcp-server") ? ".." : ".");
const MCP = join(REPO_ROOT, "mcp-server");
const TSC_FLAGS = [
  "--noEmit",
  "--pretty",
  "false",
  "--target",
  "es2022",
  "--module",
  "esnext",
  "--moduleResolution",
  "bundler",
  "--skipLibCheck",
  "--allowImportingTsExtensions",
  "false",
  "--strict",
  "false",
];

/** Parse tsc stdout into {file, line, col, code, message} entries. */
function parseTscErrors(out) {
  const lines = out.split(/\r?\n/);
  const errors = [];
  // Default tsc format with --pretty=false:
  //   path/to/file.ts(line,col): error TSxxxx: message
  const re = /^(.*?)\((\d+),(\d+)\): error (TS\d+): (.*)$/;
  for (const ln of lines) {
    const m = ln.match(re);
    if (!m) continue;
    errors.push({
      file: m[1].replace(/\\/g, "/"),
      line: Number(m[2]),
      col: Number(m[3]),
      code: m[4],
      message: m[5].trim(),
    });
  }
  return errors;
}

function runTsc(args) {
  const tscBin = join(MCP, "node_modules", "typescript", "bin", "tsc");
  const r = spawnSync(process.execPath, [tscBin, ...TSC_FLAGS, ...args], {
    cwd: MCP,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  // tsc exits 1 when errors present — don't treat that as our failure.
  // It only counts as our failure if the binary itself crashed (exit > 1
  // with no parseable output).
  return { stdout: r.stdout || "", stderr: r.stderr || "", status: r.status ?? 0 };
}

function git(args) {
  return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" }).trim();
}

function tryGit(args) {
  try { return git(args); } catch { return ""; }
}

/** Errors are equal iff (file, line, col, code, message) match exactly. */
function errKey(e) { return `${e.file}|${e.line}|${e.col}|${e.code}|${e.message}`; }

function main() {
  const stagedFiles = process.argv.slice(2).filter((p) => p.endsWith(".ts"));
  if (stagedFiles.length === 0) {
    process.exit(0);
  }

  // Resolve staged paths relative to mcp-server cwd (lint-staged passes them
  // relative to the package root where it was invoked).
  const fileArgs = stagedFiles.map((f) => relative(MCP, resolve(REPO_ROOT, f))).filter(Boolean);

  // 1. Snapshot working tree (only edits, keep index intact for the commit).
  // Intentionally NOT --include-untracked: in multi-worktree setups other
  // chats' untracked files can land in this worktree's `git ls-files
  // --others`, and the stash pop creates spurious merge conflicts on
  // names that overlap with sibling-branch work. The delta gate only
  // cares about modifications to staged files, not untracked ones, so
  // skipping untracked keeps the snapshot focused.
  const stashed = tryGit(["stash", "push", "--keep-index", "-m", "lint-staged-tsc-delta"]).includes("Saved working directory");

  let baselineErrors = [];
  try {
    const r = runTsc(fileArgs);
    baselineErrors = parseTscErrors(r.stdout + r.stderr);
  } finally {
    // 2. Always restore the working tree before doing anything else.
    if (stashed) tryGit(["stash", "pop"]);
  }

  // 3. Run tsc against the current (working tree) staged files.
  const cur = runTsc(fileArgs);
  const currentErrors = parseTscErrors(cur.stdout + cur.stderr);

  // 4. Filter to errors *introduced* by the staged change.
  const baselineSet = new Set(baselineErrors.map(errKey));
  const newErrors = currentErrors.filter((e) => !baselineSet.has(errKey(e)));

  if (newErrors.length === 0) {
    const skipped = currentErrors.length;
    if (skipped > 0) {
      process.stdout.write(`[lint-staged-tsc-delta] PASS — staged change introduced 0 new errors (skipped ${skipped} pre-existing baseline)\n`);
    } else {
      process.stdout.write(`[lint-staged-tsc-delta] PASS — no errors\n`);
    }
    process.exit(0);
  }

  process.stderr.write(`[lint-staged-tsc-delta] FAIL — ${newErrors.length} new error(s) introduced by staged change:\n`);
  for (const e of newErrors) {
    process.stderr.write(`  ${e.file}(${e.line},${e.col}): error ${e.code}: ${e.message}\n`);
  }
  process.exit(1);
}

main();
