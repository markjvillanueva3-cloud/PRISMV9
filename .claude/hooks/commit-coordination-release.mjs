#!/usr/bin/env node
// tier: T3
// commit-coordination-release.mjs — PostToolUse(Bash) hook.
// COMMIT-COORD-MS0 / U-CC-HOOKS (2026-05-20, slot:foxtrot).
//
// Releases the commit-lane mutex after a `git commit` finishes (success OR
// failure — either way the chat is done committing). Release RPS-promotes the
// next queued chat and broadcasts "lane open" to the chat bus (AGENT_CHAT.jsonl).
//
// Best-effort: a release failure is harmless — the holder's lease simply
// expires (HOLDER_STALE_MS) and the lane auto-reaps. Never blocks.
//
// Knob: PRISM_COMMIT_COORD_DISABLE=1 (off).

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const COORDINATOR = path.join(HERE, "..", "helpers", "commit-coordinator.mjs");

// `git commit` anchored at a command boundary — see commit-coordination-acquire.mjs.
// Anchoring rejects false-positives where a commit MESSAGE merely contains the
// words "git commit"; the inner [^;&|] run still matches `git -c k=v commit`.
const GIT_COMMIT_RE = /(?:^\s*|[;&|]+\s*)(?:rtk\s+)?git\b[^;&|]*?\bcommit\b/;

function done() {
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
  process.exit(0);
}

// 8-hex width matches PRISM's stable-session-id format — see the rationale
// comment on the same function in commit-coordination-acquire.mjs.
function chatIdFromSession(sid) {
  const hex = String(sid || "").replace(/[^a-f0-9]/gi, "").slice(0, 8).toLowerCase();
  return hex.length >= 4 ? `claude-${hex}` : null;
}

function main() {
  if (process.env.PRISM_COMMIT_COORD_DISABLE === "1") done();

  let input;
  try {
    const raw = fs.readFileSync(0, "utf8");
    if (!raw) done();
    input = JSON.parse(raw);
  } catch {
    done();
  }

  const tool = input.tool || input.tool_name;
  if (tool !== "Bash") done();

  const command = String(input?.input?.command || input?.tool_input?.command || "");
  if (!GIT_COMMIT_RE.test(command)) done();

  const cwd = (input.cwd || process.cwd() || "").replace(/\\/g, "/");
  if (/\/prism-slot-/i.test(cwd) || /\/prism-slot-/i.test(command)) done();

  const chatId = chatIdFromSession(input.session_id || input.sessionId);
  if (!chatId || !fs.existsSync(COORDINATOR)) done();

  try {
    execFileSync(process.execPath, [COORDINATOR, "release", "--chatId", chatId], { windowsHide: true,
      encoding: "utf8",
      timeout: 8000,
    });
  } catch {
    /* best-effort — lease expiry reaps the lane if release failed */
  }
  done();
}

main();
