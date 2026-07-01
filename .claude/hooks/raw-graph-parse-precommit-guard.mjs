#!/usr/bin/env node
// tier: T0
/**
 * raw-graph-parse-precommit-guard.mjs -- PreToolUse(Bash) `git commit` gate that
 * BLOCKS any commit which would land a raw `JSON.parse(readFileSync(<merged
 * system-graph.json>, "utf8"))`. That pattern crashes V8's 512MiB max-string-
 * length the moment the ~875MB merged graph is materialized as one JS string
 * (see scripts/lib/raw-graph-parse-guard.mjs header + [[windows-commit-reservation-hook-heap]]).
 *
 * WHY A HOOK (vs. the existing test): the FLEET LOCK test in
 * raw-graph-parse-guard.test.mjs already asserts 0 violations fleet-wide, but it
 * only fires when the test suite runs THAT file. PRISM's `stop_on_failing_tests`
 * runs *affected* tests by changed file -- so a raw parse reintroduced in a script
 * with no companion test (the historical bite pattern: build-business-value-map,
 * augment-graph-with-awareness) slips past Stop and only trips on a full suite run.
 * This hook closes that gap: it scans on EVERY commit regardless of changed files.
 *
 * NOT a lane/ownership gate -- it is a CORRECTNESS gate. Unlike the sibling
 * lane guards it deliberately does NOT honor [MAIN-FORCE]: a fleet-infra commit
 * must not be allowed to reintroduce a graph-OOM crash either. Kill switch is
 * env-only: PRISM_RAW_GRAPH_GUARD_DISABLE=1.
 *
 * Karpathy discipline:
 *   CLASSIFY: PreToolUse(Bash) static-analysis correctness gate.
 *   TECHNIQUE: cheap regex trigger (skip non-commit Bash with ~0 cost) ->
 *              direct import of the proven scanner (no subprocess) -> block on
 *              any violation, else allow.
 *   EDGE CASES: non-Bash tool, non-commit `git` (log/show <commit>), RTK-prefixed
 *              `rtk git commit`, malformed stdin, scanner import failure.
 *   FAILURE MODES: FAIL-OPEN on every internal error -- never block a commit
 *              because the guard itself broke (the FLEET LOCK test is the backstop).
 *              Over-triggering (running the scan when it is not strictly a commit)
 *              only costs a fast scan and NEVER false-blocks (block requires a real
 *              violation), so trigger precision is not safety-critical.
 *
 * FIRES ON:  PreToolUse, matcher ^Bash$.
 * ACTION:    emit {decision:"block", reason} on stdout when a raw merged-graph
 *            parse exists anywhere under the single-sourced SCAN_ROOTS_REL
 *            (scripts/, .claude/hooks, .claude/helpers, mcp-server/scripts,
 *            recursively); else exit(0).
 */

import { readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { exit } from "node:process";
// Resolve the cwd `git` actually runs under (parses a leading `cd <path>` chain) so a
// slot-worktree commit scans ITS OWN tree, not the shared main tree. Same helper the
// sibling git-add-lane-guard uses.
import { effectiveCwdFromCmd } from "../../scripts/lib/effective-cwd-from-cmd.mjs";

const DEFAULT_REPO_ROOT = "H:/prism";

// Injected fs accessors for the scanner (module scope: keeps the sync reads out
// of the async fn body and lets a test stub them).
const readFile = (p) => readFileSync(p, "utf8");
const listEntries = (d) =>
  readdirSync(d, { withFileTypes: true }).map((e) => ({ name: e.name, isDir: e.isDirectory(), isSymlink: e.isSymbolicLink() }));

// -- Pure helpers (exported for tests) ----------------------------------

/**
 * True iff the command line invokes `git commit` as a subcommand (incl. an
 * `rtk git commit` / `cd ... && git commit` chain). Matches `git commit` as a
 * token boundary so `git show <commit>` / `git log ...` (which merely contain
 * the substring "commit") do NOT trigger.
 * @param {string} cmd
 * @returns {boolean}
 */
export function isGitCommit(cmd) {
  if (typeof cmd !== "string" || !cmd) return false;
  return /\bgit\s+commit\b/.test(cmd);
}

/**
 * Build the block decision from a list of scanner violation messages.
 * @param {string[]} violations
 * @returns {{decision:"block",reason:string}|null}  null = allow
 */
export function decideFromViolations(violations) {
  if (!Array.isArray(violations) || violations.length === 0) return null;
  const list = violations.slice(0, 12).map((v) => `  - ${v}`).join("\n");
  const more = violations.length > 12 ? `\n  ...(+${violations.length - 12} more)` : "";
  return {
    decision: "block",
    reason:
      `raw-graph-parse-precommit-guard: BLOCKED -- a raw JSON.parse(readFileSync(<merged ` +
      `system-graph.json>, "utf8")) would land in this commit.\n` +
      `The merged graph is ~875MB; a utf8 string read crashes V8's 512MiB string cap ` +
      `BEFORE JSON.parse runs (fleet-wide search outage class).\n` +
      `Route the read through the cap-safe Buffer-incremental reader ` +
      `readGraphStreaming (scripts/lib/graph-io.mjs).\n` +
      `Violation(s):\n${list}${more}\n` +
      `Kill switch (emergency only): PRISM_RAW_GRAPH_GUARD_DISABLE=1.`,
  };
}

/**
 * Resolve the repo/worktree root the commit is happening in, so a slot-worktree
 * commit scans ITS OWN tree (catching worktree-local violations the shared-tree
 * scan misses) instead of the hardcoded main tree. Fail-safe: any failure ->
 * DEFAULT_REPO_ROOT (the shared tree), preserving today's behavior.
 * @param {string} cmd            the Bash command (may carry a leading `cd`)
 * @param {string} payloadCwd     the Bash tool's cwd
 * @param {(cwd:string)=>string|null} gitToplevel  injectable for tests
 * @returns {string} absolute repo root, forward-slashed, no trailing slash
 */
export function resolveRepoRoot(cmd, payloadCwd, gitToplevel) {
  try {
    const cwd = effectiveCwdFromCmd(cmd, payloadCwd) || payloadCwd;
    const top = gitToplevel(cwd);
    if (top && typeof top === "string") {
      return top.replace(/\\/g, "/").replace(/\/+$/, "");
    }
  } catch { /* fall through to default */ }
  return DEFAULT_REPO_ROOT;
}

// Real `git rev-parse --show-toplevel` (skipped in unit tests via DI).
function gitToplevelReal(cwd) {
  try {
    const r = spawnSync("git", ["rev-parse", "--show-toplevel"], {
      cwd, encoding: "utf8", timeout: 2000, windowsHide: true,
    });
    if (r.status === 0) return (r.stdout || "").trim() || null;
  } catch { /* null */ }
  return null;
}

// -- Side-effectful scan (skipped in unit tests; main wires it) ----------

async function scanRepoScripts(repoRoot) {
  // Lazy import so a scanner-load failure fails OPEN (caught by main) and so
  // the module is cheaply importable by tests without pulling the scanner.
  // Recursive scan over the single-sourced SCAN_ROOTS_REL (scripts/, .claude/hooks,
  // .claude/helpers, mcp-server/scripts) so a raw parse cannot hide outside scripts/.
  const { scanTreeForRawGraphParse, defaultScanRoots } = await import(
    "../../scripts/lib/raw-graph-parse-guard.mjs"
  );
  return defaultScanRoots(repoRoot).flatMap((root) =>
    scanTreeForRawGraphParse(root, readFile, listEntries)
  );
}

// -- Entry point --------------------------------------------------------

async function main() {
  if (process.env.PRISM_RAW_GRAPH_GUARD_DISABLE === "1") exit(0); // kill switch

  let payload;
  try {
    payload = JSON.parse(readFileSync(0, "utf-8"));
  } catch {
    exit(0); // fail-open on malformed stdin
  }
  if (!payload || payload.tool_name !== "Bash") exit(0);
  const cmd = payload.tool_input?.command;
  if (!isGitCommit(cmd)) exit(0); // fast path -- not a commit, ~zero cost

  const payloadCwd =
    payload.cwd || payload.tool_input?.cwd || process.env.CLAUDE_PROJECT_DIR || DEFAULT_REPO_ROOT;
  const repoRoot = resolveRepoRoot(cmd, payloadCwd, gitToplevelReal);

  let violations;
  try {
    violations = await scanRepoScripts(repoRoot);
  } catch {
    exit(0); // fail-open -- never block a commit because the guard broke
  }

  const decision = decideFromViolations(violations);
  if (!decision) exit(0);

  process.stdout.write(JSON.stringify(decision) + "\n");
  exit(0);
}

// Only run when invoked as CLI (not when imported by tests).
const __mainBasename = (process.argv[1] || "").replace(/\\/g, "/").split("/").pop() || "";
if (__mainBasename && import.meta.url.endsWith(__mainBasename)) {
  main();
}
