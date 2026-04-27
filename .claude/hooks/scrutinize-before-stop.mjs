#!/usr/bin/env node
/**
 * scrutinize-before-stop — Stop hook (UNIVERSAL ENFORCEMENT).
 *
 * Forces both self-review and a parallel reviewer-agent scrutiny before the
 * agent is allowed to finish a task that produced code/file changes.
 *
 * FIRES ON: Stop, for EVERY chat working in this repo. Wired in project
 *           settings.json (NOT user/global) with continueOnError:false so a
 *           hook crash also blocks the stop.
 * BLOCKING: yes (decision: block) — but with hard escape after MAX_BLOCKS_PER_SESSION.
 *
 * UNIVERSAL: this hook is in MINIMAL_ALLOWLIST (.claude/helpers/hook-profile.mjs)
 *            and ignores PRISM_HOOK_PROFILE — even minimal profile cannot disable it.
 *            Other chats discover the rule via .claude/settings.json on session start.
 *
 * AUTO-CLEANUP: this hook process is one-shot — node exits as soon as it emits
 *               its JSON response. The reviewer-agent dispatched by the calling
 *               chat is also one-shot via Claude Code's Agent tool (each
 *               Agent({...}) call spawns, runs, returns final message, then
 *               terminates — no daemon, no persistent process). The mark CLI
 *               (.claude/scripts/scrutiny-mark.mjs) is also one-shot.
 *
 * Block protocol:
 *   1. Detect "did this session produce changes?" via `git status --porcelain`
 *      (any tracked or untracked diff = yes, after filtering known noise files)
 *   2. If yes AND session not cleared in scrutiny ledger AND block count < ceiling:
 *      emit decision:"block" with instructions: dispatch a parallel reviewer
 *      agent (subagent_type=reviewer), do self-review of the diff, then call
 *      .claude/scripts/scrutiny-mark.mjs to record completion before retry.
 *   3. After ceiling reached (3 attempts), allow Stop with a warning so the chat
 *      doesn't infinite-loop on stuck sessions.
 *
 * Adopted from `everything-claude-code` review-before-merge cadence (MIT, 2026-04-27).
 */

import { shouldSkipHook as _hp_shouldSkip } from "../helpers/hook-profile.mjs";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import {
  deriveSessionId,
  isCleared,
  bumpBlockCount,
  getEntry,
  MAX_BLOCKS_PER_SESSION,
} from "../helpers/scrutiny-ledger.mjs";

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

function findProjectRoot() {
  let cur = process.cwd();
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(cur, ".claude", "settings.json"))) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return process.cwd();
}

function hasUncommittedChanges(projectRoot) {
  try {
    const out = execSync("git status --porcelain", {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 4000,
    }).toString();
    // Filter out always-noisy state files that aren't real "session work"
    const lines = out.split("\n").filter((l) => l.trim().length > 0);
    const meaningful = lines.filter((l) => {
      const file = l.slice(3).trim();
      if (file.startsWith("state/shared/SVI-watch-status")) return false;
      if (file.startsWith("PRISM-INVENTORY-LATEST.md")) return false;
      if (file.startsWith("mcp-server/data/state/")) return false;
      return true;
    });
    return meaningful.length > 0;
  } catch {
    return false;
  }
}

function buildBlockMessage(sessionId, blockCount) {
  return [
    "🔬 SCRUTINY GATE — task produced file changes; review required before stopping.",
    "",
    `Session: ${sessionId}  ·  Attempt ${blockCount}/${MAX_BLOCKS_PER_SESSION}`,
    "",
    "REQUIRED before retry:",
    "  1. PARALLEL agent review — Agent({ subagent_type: 'reviewer', description: 'Review session diff', prompt: 'Review the uncommitted changes in this branch. Check: tests cover happy path + 3 failure modes; no stub/TODO/FIXME; physics constants imported (not inlined); dispatcher wiring complete; commit-ready. Report PASS or list blockers.' })",
    "  2. SELF review — read your own diff via `git diff`, verify against the user's original request, look for regressions in adjacent code.",
    "  3. RECORD completion — set both marks via:",
    `       node .claude/scripts/scrutiny-mark.mjs --session-id ${sessionId} --self --agent --notes "<one-line summary>"`,
    "",
    `Escape: after ${MAX_BLOCKS_PER_SESSION} block attempts on this session, the gate auto-passes with a warning.`,
    "",
    "Why: untrackable bugs slip into 'shipped' work without a review pass. The user has been shipped partial work too many times.",
  ].join("\n");
}

async function main() {
  if (_hp_shouldSkip("scrutinize-before-stop")) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const raw = readStdinSafe();
  let payload = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = {};
  }

  const sessionId = deriveSessionId(payload);
  const root = findProjectRoot();

  // No changes ⇒ no review needed
  if (!hasUncommittedChanges(root)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Already cleared ⇒ allow stop
  if (isCleared(sessionId)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const entry = getEntry(sessionId) || { blockCount: 0 };
  if ((entry.blockCount || 0) >= MAX_BLOCKS_PER_SESSION) {
    // Escape hatch — emit warning but allow stop
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "Stop",
        additionalContext:
          `⚠️ scrutinize-before-stop: ceiling (${MAX_BLOCKS_PER_SESSION} blocks) reached — allowing stop. ` +
          `Session ${sessionId} ended without recorded scrutiny. Review uncommitted diff before next session.`,
      },
    }));
    return;
  }

  const newCount = bumpBlockCount(sessionId);
  // PreToolUse contract uses {decision:"block", reason:"..."}; Stop hook
  // uses the same shape — see Claude Code hooks docs.
  console.log(JSON.stringify({
    decision: "block",
    reason: buildBlockMessage(sessionId, newCount),
  }));
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath && path.resolve(fileURLToPath(import.meta.url)) === invokedPath) {
  main().catch(() => {
    console.log(JSON.stringify({ continue: true }));
  });
}

export const metadata = {
  id: "scrutinize-before-stop",
  event: "Stop",
  blocking: true,
  ceiling: MAX_BLOCKS_PER_SESSION,
};
