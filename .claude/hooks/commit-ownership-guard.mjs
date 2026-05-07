#!/usr/bin/env node
/**
 * commit-ownership-guard.mjs — Prevents cross-session commit mixing.
 *
 * When multiple Claude sessions work in parallel, each session should only
 * commit files it actually modified. This guard:
 *
 *   1. Tracks which session last touched each file (via edit timestamps)
 *   2. Before commit, checks if staged files were modified by another session
 *   3. Warns with list of files that belong to other sessions
 *   4. Hard-blocks if >50% of staged files are from other sessions
 *
 * State stored in: mcp-server/data/state/session-file-ownership.json
 *
 * Hook trigger: PreToolUse on Bash commands containing "git commit"
 *
 * Part of cross-PC + multi-session coordination from 2026-04-21.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { hostname } from "node:os";

const REPO = "H:/prism";
const STATE_FILE = join(REPO, "mcp-server/data/state/session-file-ownership.json");
const STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours — files older than this are fair game

// Get stable session ID. Prefer the hook payload's session_id (Claude Code's own
// stable conversation ID), then env, then PID. The PID fallback is the bug:
// each Bash subprocess gets a new PID, so "my own" prior edit is attributed
// to a phantom "MarkV-XXXXX" different from the current call, false-positive
// blocking my own commits. Same identity-scheme bug we fixed in file-claim-guard.
function getSessionId(hookInput) {
  // 1) Hook payload session_id — most stable, anchors to the conversation
  const sid = hookInput?.session_id;
  if (typeof sid === "string" && sid.length >= 8) {
    return sid.startsWith("claude-") ? sid : ("claude-" + sid.slice(0, 8));
  }
  // 2) Env override
  if (process.env.CLAUDE_SESSION_ID) return process.env.CLAUDE_SESSION_ID;
  // 3) Host-based fallback. We previously used hostname-PID here, but each
  //    Bash subprocess gets a new PID, so successive commit attempts from
  //    the same Claude Code instance got different IDs and the hook
  //    false-positive-blocked its own commits. host-hostname is stable
  //    across subprocess invocations on the same machine. Tactical fix
  //    for INTEL-OLLAMA-OBSIDIAN-MS0; full session-id refactor tracked.
  return `host-${hostname()}`;
}

function git(args, cwd = REPO) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 10000,
    }).trim();
  } catch (e) {
    return null;
  }
}

function loadOwnership() {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, "utf8"));
    }
  } catch { /* ignore */ }
  return { files: {}, sessions: {} };
}

function saveOwnership(state) {
  try {
    mkdirSync(dirname(STATE_FILE), { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch { /* non-fatal */ }
}

function getStagedFiles(cwd) {
  // FIX 2026-05-02: read staged index from the ACTUAL commit CWD (which may be
  // a worktree like H:/prism-cad-sw-fidx/), not the hardcoded H:/prism main repo.
  // Without this, worktree commits get false-positive-blocked when H:/prism's
  // own index has unrelated foreign-claimed files staged by another session.
  const result = git(["diff", "--cached", "--name-only"], cwd);
  if (!result) return [];
  return result.split("\n").filter(f => f.trim());
}

function main() {
  // Parse hook input from stdin
  let hookInput = {};
  try {
    const stdin = readFileSync(0, "utf8");
    hookInput = JSON.parse(stdin);
  } catch {
    // Not a hook call, might be direct test
  }

  // Check if this is a git commit command
  const toolName = hookInput.tool_name || "";
  const command = hookInput.tool_input?.command || "";

  // Only run for git commit commands
  if (toolName !== "Bash" || !command.includes("git commit")) {
    // Pass through — not a commit
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const sessionId = getSessionId(hookInput);
  const state = loadOwnership();
  const now = Date.now();

  // Resolve commit CWD. The Bash command may explicitly redirect git to a
  // different worktree via either `git -C <path> commit ...` or
  // `cd <path> && git commit ...`. In both cases hookInput.cwd is the
  // session's cwd (often the canonical repo), NOT the worktree the commit
  // actually targets. Without parsing the command, this hook reads the
  // session-cwd staged set, which can include peer-chat staged files in the
  // canonical repo — false-positive blocking the legitimate cross-worktree
  // commit. Fix observed 2026-05-07 on WORKTREE-CONSOLIDATE-MS0 envelope
  // commit from H:/prism-merge-staging worktree.
  const sessionCwd = (typeof hookInput.cwd === "string" && hookInput.cwd.length > 0)
    ? hookInput.cwd
    : REPO;
  const commitCwd = (() => {
    const gitC = command.match(/\bgit\s+-C\s+(\S+)/);
    if (gitC) return gitC[1].replace(/^["']|["']$/g, "");
    const cdMatch = command.match(/\bcd\s+(\S+)\s*&&[^&]*\bgit\s+commit\b/);
    if (cdMatch) return cdMatch[1].replace(/^["']|["']$/g, "");
    return sessionCwd;
  })();

  // Get staged files (from the actual commit CWD, not the hardcoded REPO)
  const staged = getStagedFiles(commitCwd);
  if (staged.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Check ownership
  const foreignFiles = [];
  const ownFiles = [];

  for (const file of staged) {
    const ownership = state.files[file];

    if (!ownership) {
      // No ownership record — claim it
      ownFiles.push(file);
      continue;
    }

    const age = now - ownership.timestamp;
    if (age > STALE_THRESHOLD_MS) {
      // Ownership expired — claim it
      ownFiles.push(file);
      continue;
    }

    // HOOK-FIX-5/C: file-ownership-tracker tags by `host-${hostname()}`
    // but the commit guard prefers Claude's stable conversation id. Treat
    // anything tagged with this machine's host fallback as "us" so an
    // edit from this same Claude instance written through the tracker is
    // not flagged as foreign.
    const hostFallback = `host-${hostname()}`;
    const isOurs = ownership.session === sessionId || ownership.session === hostFallback;
    if (isOurs) {
      // We own it
      ownFiles.push(file);
    } else {
      // Another session owns it
      foreignFiles.push({
        file,
        owner: ownership.session,
        age: Math.round(age / 60000), // minutes
      });
    }
  }

  // Update ownership for files we're committing
  for (const file of ownFiles) {
    state.files[file] = {
      session: sessionId,
      timestamp: now,
    };
  }

  // Record session activity
  state.sessions[sessionId] = {
    lastActive: now,
    hostname: hostname(),
  };

  saveOwnership(state);

  // Decision
  if (foreignFiles.length === 0) {
    // All clear
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const foreignPct = (foreignFiles.length / staged.length) * 100;

  if (foreignPct > 50) {
    // Block — too many foreign files
    const msg = [
      `⚠ COMMIT BLOCKED: ${foreignFiles.length}/${staged.length} files (${foreignPct.toFixed(0)}%) belong to other sessions.`,
      "",
      "Files owned by other sessions:",
      ...foreignFiles.slice(0, 10).map(f => `  - ${f.file} (${f.owner}, ${f.age}m ago)`),
      foreignFiles.length > 10 ? `  ... and ${foreignFiles.length - 10} more` : "",
      "",
      "This usually means another Claude session is working on these files.",
      "Options:",
      "  1. Wait for the other session to commit its changes",
      "  2. Use 'git reset HEAD <file>' to unstage foreign files",
      "  3. Coordinate with other sessions via state/shared/AGENT_CHAT.md",
    ].join("\n");

    console.log(JSON.stringify({
      decision: "block",
      reason: msg,
    }));
    return;
  }

  // Warn but allow
  const msg = [
    `⚠ WARNING: ${foreignFiles.length} file(s) may belong to another session:`,
    ...foreignFiles.slice(0, 5).map(f => `  - ${f.file} (${f.owner}, ${f.age}m ago)`),
    "",
    "Proceeding anyway. Consider coordinating via state/shared/AGENT_CHAT.md",
  ].join("\n");

  console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: msg, } }));
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
