#!/usr/bin/env node
// tier: T2
// commit-coordination-acquire.mjs — PreToolUse(Bash) hook.
// COMMIT-COORD-MS0 / U-CC-HOOKS (2026-05-20, slot:foxtrot).
//
// Auto-engages the commit-lane mutex before any `git commit`. If a peer chat
// holds the lane, this hook TRANSPARENTLY WAITS (polls the coordinator) until
// the lane is free or it is RPS-promoted to holder — then approves the commit.
//
// It NEVER blocks the commit. Coordination is an optimisation layered on top
// of git's own index.lock; wedging a chat's ability to commit would be worse
// than a collision. Every failure path → approve. Worst case: timeout → the
// hook approves anyway and git's index.lock serialises the write as before.
//
// Knobs: PRISM_COMMIT_COORD_DISABLE=1 (off), PRISM_COMMIT_COORD_MAX_WAIT_MS,
//        PRISM_COMMIT_COORD_POLL_MS.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const COORDINATOR = path.join(HERE, "..", "helpers", "commit-coordinator.mjs");
// HOOK_BUDGET_MS is the hook's hard self-stop. It MUST stay below the
// settings.json hook timeout (60000) with margin: a hook killed by Claude Code
// AT the settings timeout emits NO stdout, which is NOT treated as "approve".
// Capping the budget guarantees the final approve() is always emitted in time.
const HOOK_BUDGET_MS = Math.min(Number(process.env.PRISM_COMMIT_COORD_MAX_WAIT_MS) || 50000, 50000);
const POLL_MS = Number(process.env.PRISM_COMMIT_COORD_POLL_MS) || 1500;
const CHILD_TIMEOUT_MS = 8000;
const EMIT_MARGIN_MS = 1500;

const SLEEP_BUF = new Int32Array(new SharedArrayBuffer(4));
function sleep(ms) {
  Atomics.wait(SLEEP_BUF, 0, 0, Math.max(0, Math.floor(ms)));
}

function approve(extra) {
  process.stdout.write(JSON.stringify({ decision: "approve", ...(extra || {}) }) + "\n");
  process.exit(0);
}

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

// `git commit` anchored at a command boundary (start, or after ; && || |),
// optionally `rtk`-prefixed. Anchoring rejects false-positives where a commit
// MESSAGE string merely contains the words "git commit"; the inner [^;&|] run
// still matches `git -c user.name="A B" commit`.
const GIT_COMMIT_RE = /(?:^\s*|[;&|]+\s*)(?:rtk\s+)?git\b[^;&|]*?\bcommit\b/;

// 8-hex width DELIBERATELY matches PRISM's stable-session-id format
// (`claude-<8hex>`) so the chatId here is the same string the chat bus, slot
// system, and handoffs already key on (R11 — match conventions). A first-8-hex
// collision is ~1/4e9; even then the coordinator is fail-open (git's index.lock
// is the real mutex), so a collision degrades to a harmless spurious lane-open,
// never a wedge or a corrupted commit.
function chatIdFromSession(sid) {
  const hex = String(sid || "").replace(/[^a-f0-9]/gi, "").slice(0, 8).toLowerCase();
  return hex.length >= 4 ? `claude-${hex}` : null;
}

function main() {
  if (process.env.PRISM_COMMIT_COORD_DISABLE === "1") approve();

  let input;
  try {
    const raw = readStdin();
    if (!raw) approve();
    input = JSON.parse(raw);
  } catch {
    approve();
  }

  const tool = input.tool || input.tool_name;
  if (tool !== "Bash") approve();

  const command = String(input?.input?.command || input?.tool_input?.command || "");
  if (!GIT_COMMIT_RE.test(command)) approve();

  // Slot worktrees have their own git index — no shared-tree contention.
  const cwd = (input.cwd || process.cwd() || "").replace(/\\/g, "/");
  if (/\/prism-slot-/i.test(cwd) || /\/prism-slot-/i.test(command)) approve();

  const chatId = chatIdFromSession(input.session_id || input.sessionId);
  if (!chatId) approve(); // cannot identify this chat → fail-open

  if (!fs.existsSync(COORDINATOR)) approve(); // coordinator missing → fail-open

  const slot = String(input.slot || process.env.PRISM_SLOT || "").trim() || null;

  function tryAcquire() {
    try {
      const out = execFileSync(
        process.execPath,
        [COORDINATOR, "acquire", "--chatId", chatId, ...(slot ? ["--slot", slot] : [])],
        { windowsHide: true, encoding: "utf8", timeout: CHILD_TIMEOUT_MS },
      );
      return JSON.parse(out.trim().split("\n").pop());
    } catch {
      return { granted: true, failOpen: "spawn-error" }; // fail-open
    }
  }

  const first = tryAcquire();
  if (first.granted) {
    approve(
      first.failOpen
        ? { systemMessage: `commit-lane: proceeding (fail-open: ${first.failOpen})` }
        : undefined,
    );
  }

  // Lane held by a peer — wait transparently until free / RPS-promoted.
  // Poll only while a full (sleep + child-spawn + emit-margin) cycle still
  // fits inside HOOK_BUDGET_MS, so the final approve() is guaranteed to emit
  // before Claude Code's settings.json hook timeout could kill the process.
  const start = Date.now();
  let lastHolder = (first.holder && first.holder.chatId) || "?";
  while (Date.now() - start + POLL_MS + CHILD_TIMEOUT_MS + EMIT_MARGIN_MS <= HOOK_BUDGET_MS) {
    sleep(POLL_MS);
    const res = tryAcquire();
    if (res.granted) {
      approve({
        systemMessage: `commit-lane: acquired after ${Math.round((Date.now() - start) / 1000)}s wait`,
      });
    }
    lastHolder = (res.holder && res.holder.chatId) || lastHolder;
  }

  // Budget elapsed — fail-open. git's index.lock still serialises the write.
  approve({
    systemMessage: `commit-lane: ~${Math.round((Date.now() - start) / 1000)}s wait elapsed (holder ${lastHolder}) — proceeding fail-open; git index.lock still serialises`,
  });
}

main();
