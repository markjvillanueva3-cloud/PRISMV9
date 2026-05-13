#!/usr/bin/env node
// tier: T0
/**
 * scrutinize-before-stop — Stop hook (UNIVERSAL ENFORCEMENT).
 *
 * Forces a strict 3-of-3 multi-reviewer scrutiny before the agent is allowed to
 * finish a task that produced code/file changes:
 *   - Codex CLI               (cross-vendor — auto-recorded by scrutiny-3way.mjs)
 *   - Claude reviewer agent A  (holistic — dispatched by the chat via the Agent tool)
 *   - Claude reviewer agent B  (independent second pass — dispatched by the chat)
 * (The arm-2 reviewer was the Gemini CLI until 2026-05-12; it was swapped for a
 *  second Claude reviewer agent because the CLI's daily-quota / trust-dir env
 *  failures kept stalling the gate.)
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
 *               its JSON response. The reviewer agents dispatched by the calling
 *               chat are also one-shot via Claude Code's Agent tool (each
 *               Agent({...}) call spawns, runs, returns final message, then
 *               terminates — no daemon, no persistent process). The mark CLI
 *               (.claude/scripts/scrutiny-3way.mjs --mark-opus / --mark-opus-b) is
 *               also one-shot.
 *
 * Block protocol:
 *   1. Detect "did this session produce changes?" via `git status --porcelain`
 *      (any tracked or untracked diff = yes, after filtering known noise files)
 *   2. If yes AND session not cleared in scrutiny ledger AND block count < ceiling:
 *      emit decision:"block" with instructions — run scrutiny-3way.mjs (Codex arm
 *      + emits both reviewer prompts), dispatch BOTH Claude reviewer agents
 *      (subagent_type=reviewer) in parallel, then record their verdicts with
 *      scrutiny-3way.mjs --mark-opus / --mark-opus-b before retrying.
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

// Wider clearance window: hook payload session_id and mark-script session_id
// (from CLAUDE_SESSION_ID env or stable-session-id helper) can drift. Accept
// ANY entry recorded within this window with both reviews as clearance.
const RECENT_SCRUTINY_WINDOW_MS = 5 * 60 * 1000;
const LEDGER_REL = "mcp-server/data/state/SCRUTINY_LEDGER.json";
const OWNERSHIP_REL = "mcp-server/data/state/session-file-ownership.json";

// Multi-chat ownership scoping: if THIS chat authored 0 of the meaningful
// changed files (per session-file-ownership.json), skip the gate. Without
// this, every chat in a 6-chat run gets blocked for cumulative peer-chat
// noise it didn't author. Re-applied 2026-05-09 after a peer-chat revert.
function deriveStableSessionId(payload) {
  const sid = payload && typeof payload.session_id === "string" ? payload.session_id : null;
  if (!sid || sid.length < 8) return null;
  return `claude-${sid.slice(0, 8)}`;
}

function readOwnershipFiles(projectRoot) {
  try {
    const p = path.join(projectRoot, OWNERSHIP_REL);
    if (!fs.existsSync(p)) return null;
    const data = JSON.parse(fs.readFileSync(p, "utf-8"));
    return data && typeof data === "object" ? data.files || {} : null;
  } catch {
    return null;
  }
}

function hasRecentScrutiny(projectRoot) {
  try {
    const ledgerPath = path.join(projectRoot, LEDGER_REL);
    if (!fs.existsSync(ledgerPath)) return false;
    const data = JSON.parse(fs.readFileSync(ledgerPath, "utf-8"));
    const entries = data && typeof data === "object" ? data.entries || {} : {};
    const cutoff = Date.now() - RECENT_SCRUTINY_WINDOW_MS;
    for (const entry of Object.values(entries)) {
      if (!entry || typeof entry !== "object") continue;
      // Cleared either by the strict 3-of-3 (Codex + Claude reviewer A + Claude
      // reviewer B — arm B may be recorded as claudeReviewed | opusBReviewed |
      // geminiReviewed) OR by the pre-3way self+agent legacy path. (Pre-2026-05-12
      // this only checked selfReviewed && agentReviewed, which the new 3-of-3
      // flow never sets — so the cross-ID fallback was inert.)
      const armBOk = entry.claudeReviewed === true || entry.opusBReviewed === true || entry.geminiReviewed === true;
      const strict3of3 = entry.codexReviewed === true && armBOk && entry.opusReviewed === true;
      const legacyOk = entry.selfReviewed === true && entry.agentReviewed === true;
      if (!strict3of3 && !legacyOk) continue;
      const recordedMs = Date.parse(entry.recordedAt || "");
      if (Number.isFinite(recordedMs) && recordedMs >= cutoff) return true;
    }
    return false;
  } catch {
    return false;
  }
}

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

function meaningfulChangedFiles(projectRoot) {
  try {
    const out = execSync("git status --porcelain", {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 4000,
    }).toString();
    const lines = out.split("\n").filter((l) => l.trim().length > 0);
    const files = [];
    for (const l of lines) {
      let file = l.slice(3).trim();
      // Renames look like:  R  old/path -> new/path  — pick the new path.
      const arrowIdx = file.indexOf(" -> ");
      if (arrowIdx >= 0) file = file.slice(arrowIdx + 4).trim();
      // Strip optional surrounding quotes from porcelain output.
      if (file.startsWith("\"") && file.endsWith("\"")) file = file.slice(1, -1);
      if (file.startsWith("state/shared/SVI-watch-status")) continue;
      if (file.startsWith("PRISM-INVENTORY-LATEST.md")) continue;
      if (file.startsWith("mcp-server/data/state/")) continue;
      files.push(file);
    }
    return files;
  } catch {
    return [];
  }
}

function buildBlockMessage(sessionId, blockCount) {
  return [
    "🔬 SCRUTINY GATE — 3-of-3 multi-reviewer review required (strict policy, 2026-05-05).",
    "",
    `Session: ${sessionId}  ·  Attempt ${blockCount}/${MAX_BLOCKS_PER_SESSION}`,
    "",
    "REQUIRED — all three arms must return PASS before Stop releases:",
    "  • Codex CLI            (cross-vendor model — auto-recorded by the script)",
    "  • Claude reviewer A    (holistic strict review — dispatched by you)",
    "  • Claude reviewer B    (independent 2nd pass, test/wiring/constants-weighted — dispatched by you)",
    "    [the Gemini CLI arm was retired 2026-05-12 and replaced by Claude reviewer B]",
    "",
    "  STEP 1 — Run the Codex arm against the session diff:",
    `       node .claude/scripts/scrutiny-3way.mjs --session-id ${sessionId}`,
    "         (or --target HEAD to review the last commit, or --target <sha> for a specific one)",
    "       It auto-records --codex, and emits `opusReviewerPrompt` (arm A) + `opusReviewerPromptB` (arm B).",
    "",
    "  STEP 2 — Dispatch BOTH Claude reviewer agents (in parallel with STEP 1):",
    "       Agent({ subagent_type: 'reviewer', description: 'Review session diff (3way reviewer A)',",
    "               prompt: <opusReviewerPrompt from STEP 1 output> })",
    "       Agent({ subagent_type: 'reviewer', description: 'Review session diff (3way reviewer B — independent)',",
    "               prompt: <opusReviewerPromptB from STEP 1 output> })",
    "",
    "  STEP 3 — Once both agents return, record their verdicts:",
    `       node .claude/scripts/scrutiny-3way.mjs --mark-opus pass    --session-id ${sessionId} --notes "<reviewer A summary>"`,
    `       node .claude/scripts/scrutiny-3way.mjs --mark-claude pass  --session-id ${sessionId} --notes "<reviewer B summary>"`,
    "         (--mark-claude is the arm-B mark; --mark-opus-b / --mark-gemini are accepted aliases.",
    "          use 'fail' instead of 'pass' for any FAIL — the gate keeps blocking until all three are PASS)",
    "",
    "Strict 3-of-3: ANY arm FAIL or absence keeps blocking. Self-review is no longer load-bearing for clearance.",
    `Escape: after ${MAX_BLOCKS_PER_SESSION} block attempts the gate auto-passes with a warning (do not abuse).`,
    "",
    "Why 3-of-3: single-reviewer drift, model bias, and stub-tolerance regressions slip into 'shipped' work. Triangulating across one cross-vendor (Codex) + two independent Claude reviewers gives consensus before code ships.",
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
  const changedFiles = meaningfulChangedFiles(root);
  if (changedFiles.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Multi-chat ownership scoping: if THIS chat (per stable session id) authored
  // ZERO of the meaningful changed files per session-file-ownership.json, the
  // diff is peer-chat work and the gate must not block our Stop. Without this,
  // every chat in a 6-chat run blocks on cumulative noise it didn't author.
  const stableSid = deriveStableSessionId(payload);
  const ownershipFiles = readOwnershipFiles(root);
  if (stableSid && ownershipFiles) {
    const ownedByThisChat = changedFiles.some((f) => {
      const entry = ownershipFiles[f];
      return entry && entry.owner === stableSid;
    });
    if (!ownedByThisChat) {
      console.log(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: "Stop",
          additionalContext:
            `🔬 scrutinize-before-stop: skipped — session ${stableSid} authored 0 of ` +
            `${changedFiles.length} meaningful change(s); diff is peer-chat work.`,
        },
      }));
      return;
    }
  }

  // Already cleared ⇒ allow stop
  if (isCleared(sessionId)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Cross-ID fallback: mark-script and hook may derive different session ids
  // (CLAUDE_SESSION_ID env vs payload.session_id vs stable-session-id helper).
  // If the assistant ran scrutiny-mark recently with both reviews recorded,
  // honor that as clearance regardless of session-id alignment.
  if (hasRecentScrutiny(root)) {
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
