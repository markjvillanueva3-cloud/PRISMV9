#!/usr/bin/env node
// tier: T0
/**
 * file-claim-commit-guard.mjs — PreToolUse Bash hook
 *
 * Blocks `git commit` when staged paths are claimed by OTHER live chats.
 * Prevents the classic commit-jumble: chat A edits fileX, chat B globs
 * everything into `git add -A` and commits A's in-progress work.
 *
 * Detection:
 *   1. Command contains a bare `git commit` invocation (not inside quotes).
 *   2. Resolves staged paths via `git diff --cached --name-only` in cwd.
 *   3. Also inspects `git add <paths>` that precedes the commit in the same
 *      command chain, so we catch `git add . && git commit` BEFORE staging.
 *
 * Block contract: {decision: "block", reason: "..."}.
 * On-disk contract mirrors ChatBusEngine.ts (findForeignClaims logic).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import os from "node:os";

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

const CHAT_BUS_ROOT = "H:/prism/state/shared/chat-bus";
const CLAIMS_DIR = path.join(CHAT_BUS_ROOT, "claims");
const PRESENCE_DIR = path.join(CHAT_BUS_ROOT, "presence");

const STABLE_ID_HELPER = "H:/prism/.claude/helpers/stable-session-id.mjs";
const PRESENCE_TTL_MS = 10 * 60 * 1000;
const MIN_SID_LENGTH = 8;
const STABLE_ID_TIMEOUT_MS = 1500;
const GIT_TIMEOUT_MS = 3000;
const CLAIM_KEY_HEX_LEN = 16;
const DEFAULT_SESSION_ID = "default";
const MAX_CONFLICTS_SHOWN = 20;

function canonicalPath(p) {
  return String(p).replace(/\\/g, "/").replace(/^([A-Za-z]):/, (_, d) => d.toLowerCase() + ":").replace(/\/+$/, "");
}

function claimKey(p) {
  return createHash("sha256").update(canonicalPath(p)).digest("hex").slice(0, CLAIM_KEY_HEX_LEN);
}

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

function resolveSessionId(stdinSid) {
  if (stdinSid && typeof stdinSid === "string" && stdinSid.length >= MIN_SID_LENGTH) {
    return `claude-${stdinSid.slice(0, 8)}`;
  }
  try {
    const r = spawnSync(process.execPath, [STABLE_ID_HELPER], { encoding: "utf-8", timeout: STABLE_ID_TIMEOUT_MS });
    const id = (r.stdout || "").trim();
    if (id && id.length >= MIN_SID_LENGTH) return id;
  } catch {
    /* ignore */
  }
  if (process.env.CLAUDE_SESSION_ID) return `claude-${process.env.CLAUDE_SESSION_ID.slice(0, 8)}`;
  return DEFAULT_SESSION_ID;
}

function peerIsLive(sessionId) {
  const p = path.join(PRESENCE_DIR, `${sessionId}.json`);
  const entry = readJsonSafe(p);
  if (!entry) return false;
  const ts = Date.parse(entry.ts);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= PRESENCE_TTL_MS;
}

function isCommitCommand(command) {
  if (typeof command !== "string") return false;
  // Match `git commit` but not `git commit-tree`, and not inside commit-message quotes.
  // Strip quoted segments first to avoid matching "git commit" inside a -m "fix git commit ..." arg.
  const unquoted = command.replace(/"[^"]*"/g, "").replace(/'[^']*'/g, "");
  return /\bgit\s+commit\b(?!-tree)/.test(unquoted);
}

function extractAddPaths(command) {
  // Parse `git add <paths>` segments out of the unquoted command.
  // Returns array of literal path args; skips flags. `.` and `-A` / `-u` expand to cwd.
  if (typeof command !== "string") return [];
  const unquoted = command.replace(/"[^"]*"/g, " ").replace(/'[^']*'/g, " ");
  const paths = [];
  const re = /\bgit\s+add\b([^&;|]*)/g;
  let match;
  while ((match = re.exec(unquoted))) {
    const tail = match[1].trim();
    if (!tail) continue;
    if (/^[-\s]*(-A|--all|-u|--update|\.)\b/.test(tail)) {
      // Wildcard — we can't enumerate here; rely on `git diff --cached` after.
      paths.push("__WILDCARD__");
      continue;
    }
    for (const token of tail.split(/\s+/)) {
      if (!token || token.startsWith("-")) continue;
      paths.push(token);
    }
  }
  return paths;
}

function getCwdFromPayload(payload) {
  return (
    payload.cwd ||
    payload.working_directory ||
    payload.workingDirectory ||
    (payload.tool_input && payload.tool_input.cwd) ||
    process.cwd()
  );
}

function runGit(args, cwd) {
  const r = spawnSync("git", args, { cwd, encoding: "utf-8", timeout: GIT_TIMEOUT_MS });
  if (r.status !== 0) return null;
  return r.stdout || "";
}

function getStagedPaths(cwd) {
  const out = runGit(["diff", "--cached", "--name-only"], cwd);
  if (out == null) return null;
  return out.split("\n").map((s) => s.trim()).filter(Boolean);
}

function getWorktreeRoot(cwd) {
  const out = runGit(["rev-parse", "--show-toplevel"], cwd);
  if (!out) return cwd;
  return out.trim();
}

function resolveGitPathToAbs(repoRoot, relPath) {
  return path.resolve(repoRoot, relPath);
}

function findForeignClaimsForPaths(sessionId, absPaths) {
  const now = Date.now();
  const conflicts = [];
  for (const abs of absPaths) {
    const key = claimKey(abs);
    const claimFile = path.join(CLAIMS_DIR, `${key}.json`);
    const claim = readJsonSafe(claimFile);
    if (!claim) continue;
    if (claim.sessionId === sessionId) continue;
    const expMs = Date.parse(claim.expiresAt);
    if (Number.isFinite(expMs) && expMs < now) continue;
    if (!peerIsLive(claim.sessionId)) continue;
    conflicts.push({
      path: canonicalPath(abs),
      heldBy: claim.sessionId,
      heldByPc: claim.pcName,
      intent: claim.intent,
      acquiredAt: claim.acquiredAt,
      expiresAt: claim.expiresAt,
      age_s: Math.round((now - Date.parse(claim.acquiredAt)) / 1000),
    });
  }
  return conflicts;
}

function formatBlockReason(conflicts, stagedCount) {
  const lines = [
    `🔒 CHAT-BUS COMMIT BLOCKED — ${conflicts.length} file(s) claimed by OTHER live chat(s)`,
    ``,
    `Committing now would jumble another chat's in-progress work into your commit.`,
    `Staged files: ${stagedCount}. Foreign claims held: ${conflicts.length}.`,
    ``,
    `Files in conflict:`,
  ];
  for (const c of conflicts.slice(0, MAX_CONFLICTS_SHOWN)) {
    const expMin = Math.max(0, Math.round((Date.parse(c.expiresAt) - Date.now()) / 60000));
    lines.push(`  • ${c.path}`);
    lines.push(`      held by ${c.heldBy} (${c.heldByPc}), intent=${c.intent}, expires in ${expMin}m`);
  }
  if (conflicts.length > MAX_CONFLICTS_SHOWN) {
    lines.push(`  … and ${conflicts.length - MAX_CONFLICTS_SHOWN} more`);
  }
  lines.push(``);
  lines.push(`Resolve by one of:`);
  lines.push(`  1. git reset HEAD -- <path>   — unstage the foreign files, commit only your own work.`);
  lines.push(`  2. Coordinate via chat-bus: prism_context action=chat_post body="committing now" — other chat sees it.`);
  lines.push(`  3. Wait for the other chat's Stop hook to release the claim.`);
  lines.push(`  4. If peer is actually dead, the claim will expire and commit will unblock automatically.`);
  return lines.join("\n");
}

async function main() {
  const raw = readStdinSafe();

  let payload;
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const toolName = payload.tool_name || payload.toolName || "";
  if (toolName !== "Bash") {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const toolInput = payload.tool_input || payload.toolInput || payload.input || {};
  const command = toolInput.command || "";
  if (!isCommitCommand(command)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  if (!fs.existsSync(CLAIMS_DIR)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const sessionId = resolveSessionId(payload.session_id || payload.sessionId);
  const cwd = getCwdFromPayload(payload);
  const repoRoot = getWorktreeRoot(cwd);

  // Staged paths from git (what's actually about to be committed).
  const staged = getStagedPaths(cwd) ?? [];
  const stagedAbs = staged.map((rel) => resolveGitPathToAbs(repoRoot, rel));

  // Plus any explicit paths from `git add` in the same chain (in case commit comes after).
  const addPaths = extractAddPaths(command).filter((p) => p !== "__WILDCARD__");
  const addAbs = addPaths.map((rel) => resolveGitPathToAbs(repoRoot, rel));

  // Wildcard `git add` side-effects are deferred — a blocked retry after staging catches the miss.
  const allAbs = Array.from(new Set([...stagedAbs, ...addAbs]));
  if (allAbs.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const conflicts = findForeignClaimsForPaths(sessionId, allAbs);
  if (conflicts.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  console.log(
    JSON.stringify({
      decision: "block",
      reason: formatBlockReason(conflicts, stagedAbs.length),
    })
  );
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
