#!/usr/bin/env node
// tier: T0
/**
 * slot-commit-worktree-enforce.mjs — PreToolUse(Bash) slot-branch HARD enforcement
 *
 * Closes the operator pain point named 2026-05-24:
 *   "put an enforcement for chat slots to commit to their native worktrees
 *    the same as their NATO name. I have to manually tell each chat to
 *    commit to their designated worktree, they kept trying to commit to
 *    the same worktrees."
 *
 * WHY (and how it differs from existing sibling hooks):
 *   - `main-tree-write-block.mjs`  blocks Edit/Write/MultiEdit when a chat
 *      IS on slot/<name> and targets the main tree.  Useless when chat is
 *      STILL on cad-fusion-live-ms0 (the failure mode the user names).
 *   - `worktree-commit-route.mjs`  routes commits by SCOPE TOKEN in the
 *      commit subject; default-OFF.
 *   - `git-add-lane-guard.mjs`     auto-unstages out-of-lane files at git-add
 *      time; requires slot to be on slot/* already.
 *   - THIS HOOK enforces the PRECONDITION:  every slot-bound chat (except
 *     the golf integrator) MUST be on its slot/<name> branch BEFORE
 *     `git commit` is allowed to run.  This is the gate that the three
 *     existing hooks were silently fail-opening when the chat hadn't
 *     migrated to its slot worktree yet.
 *
 * FIRES ON:  PreToolUse, matcher Bash
 * ACTION:    deny (exit 2) when a NATO-slot-bound chat (not golf) runs
 *            `git commit` on a branch that is not slot/<slotname>.
 *
 * NON-BLOCKING PATHS (allow, exit 0):
 *   - PRISM_SLOT_COMMIT_ENFORCE_DISABLE=1               kill switch (always wins)
 *   - tool_name is not Bash                              not our event
 *   - command is not `git commit` (parsed permissively)  not a commit
 *   - command contains [BOOTSTRAP-SLOT-ENFORCE] marker   one-shot operator bypass
 *   - sessionId can't be resolved                        fail-soft, don't break headless
 *   - chat-slots.json missing/unreadable/malformed       fail-soft
 *   - chat is not bound to any NATO slot                 transitional / cron / IDE
 *   - slot is "golf"                                     integrator role (CLAUDE.md §GOLF SLOT)
 *   - live `git branch --show-current` returns "slot/<slotname>"  correct state
 *   - any internal error (timeout / spawn fail / parse)  fail-soft
 *
 * BLOCK PATHS (deny exit 2):
 *   - chat in NATO slot (not golf), command is `git commit`, live branch
 *     in the resolved commit cwd is NOT slot/<slotname>.  Block message
 *     names slot, expected branch, worktree path, and 4 escape paths.
 *
 * Knobs:
 *   PRISM_SLOT_COMMIT_ENFORCE_DISABLE=1   kill switch (always wins)
 *   PRISM_SLOT_COMMIT_ENFORCE_VERBOSE=1   stderr decision trace (off by default)
 *
 * FAIL-SOFT POLICY: every internal error → allow.  Worst case: today's
 * pain (the operator-manual-cutover state).  Never bricks the fleet on
 * hook bugs.  Same R12 policy as siblings.
 *
 * Author: claude-ea80ce2f slot bravo · 2026-05-24
 */

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
// U-SLOT-COMMIT-ENFORCE-LIVE (slot:india 2026-06-11): the [BOOTSTRAP-SLOT-ENFORCE] marker became the
// universal commit prefix and silently neutered this gate fleet-wide. Route the bypass decision
// through a pure, tested function: marker bypass is now opt-in; [MAIN-FORCE] is the cross-cutting escape.
import { commitBypass } from "../../scripts/lib/slot-commit-bypass.mjs";

const KILL = process.env.PRISM_SLOT_COMMIT_ENFORCE_DISABLE === "1";
const VERBOSE = process.env.PRISM_SLOT_COMMIT_ENFORCE_VERBOSE === "1";

const SLOTS_FILE = "H:/prism/state/shared/chat-slots.json";
const SLOT_TREE_ROOT = "H:/prism-slot-";
const DEFAULT_GIT_CWD = "H:/prism";
const BOOTSTRAP_MARKER = "[BOOTSTRAP-SLOT-ENFORCE]";
const GOLF_SLOT = "golf";
const SPAWN_TIMEOUT_MS = 4000;

function vlog(...a) { if (VERBOSE) process.stderr.write("[slot-commit-enforce] " + a.join(" ") + "\n"); }
function allow(reason) { vlog("ALLOW", reason || ""); process.exit(0); }
function deny(msg) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: msg,
    },
  }));
  vlog("DENY");
  process.exit(2);
}

// Parse the bash command for `git commit` (with any prefix / flags).
// Match (case-sensitive): optional "rtk " wrapper, optional "git -C <dir>",
// then literal "commit" with a word boundary.  Avoids false-positive on
// `git log --grep "commit"`, `git rev-list ... committer`, etc.
function isGitCommitCommand(cmd) {
  if (!cmd || typeof cmd !== "string") return false;
  // Strip leading "cd <dir> && " / "cd <dir>; " before matching.
  // Allow nested rtk wrapper.
  return /(?:^|&&\s*|;\s*)\s*(?:rtk\s+)?git(?:\s+-C\s+\S+)?\s+commit\b/.test(cmd);
}

// Best-effort cwd resolution from the command:
//   1. explicit `git -C <dir>` flag (highest priority)
//   2. leading `cd <dir> &&` / `cd <dir>;` chain
//   3. fallback: H:/prism (the shared main tree — most common case)
function resolveGitCwd(cmd) {
  const cMinusC = cmd.match(/\bgit\s+-C\s+(\S+)\s+commit\b/);
  if (cMinusC) return cMinusC[1].replace(/^["']|["']$/g, "");
  const cdPrefix = cmd.match(/^\s*cd\s+(\S+)\s*(?:&&|;)/);
  if (cdPrefix) return cdPrefix[1].replace(/^["']|["']$/g, "");
  return DEFAULT_GIT_CWD;
}

// Identity is resolved in this priority:
//   1. input.session_id from Claude Code (the canonical chat-isolation id —
//      what chat-slots.json tracks via "claude-<first8>")
//   2. stable-session-id.mjs (terminal-window-derived; survives /compact
//      but differs from chat-isolation when the chat re-anchors)
// Chat-slots stores `chatId: claude-<sessionId-first-8>`, so we normalize both.
function normalizeChatId(s) {
  if (!s) return null;
  const t = String(s).trim();
  if (!t) return null;
  if (t.startsWith("claude-")) return t;
  // Bare uuid form like "ea80ce2f-26e4-..." → claude-<first8>
  const eight = t.replace(/-/g, "").slice(0, 8);
  return eight ? `claude-${eight}` : null;
}

function resolveSessionId(input) {
  const fromInput = normalizeChatId(input?.session_id);
  if (fromInput) return fromInput;
  try {
    const r = spawnSync("node", ["H:/prism/.claude/helpers/stable-session-id.mjs"], {
      encoding: "utf8",
      timeout: SPAWN_TIMEOUT_MS,
    });
    return normalizeChatId((r.stdout || "").trim());
  } catch { return null; }
}

function loadSlots() {
  if (!existsSync(SLOTS_FILE)) return null;
  try {
    const raw = readFileSync(SLOTS_FILE, "utf8");
    return JSON.parse(raw);
  } catch { return null; }
}

function findSlotForSession(slotsJson, sessionId) {
  if (!slotsJson || typeof slotsJson !== "object") return null;
  const slots = slotsJson.slots || {};
  for (const [name, s] of Object.entries(slots)) {
    if (!s || typeof s !== "object") continue;
    if (s.chatId === sessionId) return { name, ...s };
  }
  return null;
}

function liveBranch(cwd) {
  try {
    const r = spawnSync("git", ["-C", cwd, "rev-parse", "--abbrev-ref", "HEAD"], {
      encoding: "utf8",
      timeout: SPAWN_TIMEOUT_MS,
    });
    if (r.status !== 0) return null;
    return (r.stdout || "").trim() || null;
  } catch { return null; }
}

async function main() {
  if (KILL) allow("kill-switch");

  let input;
  try {
    const raw = readFileSync(0, "utf8");
    input = JSON.parse(raw);
  } catch { allow("no-stdin"); }

  if (input?.tool_name !== "Bash") allow("not-bash");

  const cmd = input?.tool_input?.command || "";
  if (!isGitCommitCommand(cmd)) allow("not-git-commit");

  // Bypass decision (kill-switch > [MAIN-FORCE] > opt-in bootstrap window). Default: ENFORCE.
  const bypass = commitBypass(cmd, process.env);
  if (bypass) allow(bypass);

  const sessionId = resolveSessionId(input);
  if (!sessionId) allow("no-session-id");

  const slotsJson = loadSlots();
  if (!slotsJson) allow("no-slots-file");

  const slot = findSlotForSession(slotsJson, sessionId);
  if (!slot) allow("no-slot-binding");
  if (slot.name === GOLF_SLOT) allow("golf-integrator");

  const expectedBranch = `slot/${slot.name}`;
  const expectedTree = `${SLOT_TREE_ROOT}${slot.name}`;

  const gitCwd = resolveGitCwd(cmd);
  const branch = liveBranch(gitCwd);
  if (!branch) allow("no-branch-resolve");

  if (branch === expectedBranch) allow("on-slot-branch");

  // BLOCK
  deny([
    `🛑 SLOT-COMMIT-ENFORCE — slot ${slot.name} must commit from its own worktree`,
    ``,
    `Current state:`,
    `  slot:           ${slot.name}`,
    `  chatId:         ${sessionId}`,
    `  commit cwd:     ${gitCwd}`,
    `  current branch: ${branch}`,
    `  expected:       ${expectedBranch}`,
    `  expected tree:  ${expectedTree}`,
    ``,
    `Fix (one of, ordered by preference):`,
    `  1. Migrate via /checkin-${slot.name} §2c cutover  (canonical)`,
    `  2. Manual: cd ${expectedTree} && git checkout ${expectedBranch}`,
    `  3. Genuine cross-cutting fleet infra (belongs on the shared tree): prefix the`,
    `     commit subject with [MAIN-FORCE] (narrow, audited; same token the sibling`,
    `     lane hooks honor). NOTE: a plain "${BOOTSTRAP_MARKER}" no longer bypasses --`,
    `     it became the universal prefix and neutered this gate, so it is now opt-in.`,
    `  4. Operator transition window (restores the legacy ${BOOTSTRAP_MARKER} bypass):`,
    `     set PRISM_SLOT_COMMIT_ENFORCE_ALLOW_BOOTSTRAP=1`,
    `  5. Permanent kill switch: PRISM_SLOT_COMMIT_ENFORCE_DISABLE=1`,
    ``,
    `Why this block exists:`,
    `  Shared main tree (cad-fusion-live-ms0) is high-peer-contention.`,
    `  Commits from there get peer-absorbed into other slots' subjects`,
    `  (H8 misattribution class — see CLAUDE.md §PER-CHAT HANDOFF).`,
    `  Slot worktrees give each slot its own HEAD pointer + git lock,`,
    `  eliminating the race entirely.  See CLAUDE.md §SLOT-WORKTREE-MS0.`,
    ``,
    `Golf slot is exempt (integrator — commits to cad-fusion-live-ms0`,
    `by design, per CLAUDE.md §GOLF SLOT).`,
  ].join("\n"));
}

main().catch(() => allow("uncaught"));
