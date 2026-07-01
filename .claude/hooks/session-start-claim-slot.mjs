#!/usr/bin/env node
// tier: T4
/**
 * session-start-claim-slot.mjs — SessionStart hook
 *
 * Claims a fleet slot (alpha/bravo/charlie/delta/echo/foxtrot/golf) for this
 * Claude session at startup. Uses chat-slots.mjs helper. The slot binding
 * persists for the chat lifetime; subsequent UserPromptSubmit hooks heartbeat
 * the slot, and Stop releases it. Slot 7 (golf) is the dedicated hygiene chat
 * per CLEANUP-MS0; bound by U-CLEANUP-A5 write-allowlist hook.
 *
 * Output: silent on success (slot claimed). Emits a one-line status message
 * via Claude Code's SessionStart hook protocol so the operator sees which
 * slot they got. On failure (fleet full, lock timeout) emits a warning but
 * does NOT block session start — slot system is advisory, not load-bearing
 * on actual chat operation.
 *
 * Hook contract: stdin receives JSON { session_id, ... }; stdout receives
 * JSON { continue: true, systemMessage?: string }. Never blocks.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HELPER_PATH = resolve(__dirname, "..", "helpers", "chat-slots.mjs");
const STABLE_ID_HELPER = resolve(__dirname, "..", "helpers", "stable-session-id.mjs");

function emitNoOp() {
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
  process.exit(0);
}

function emitMessage(msg) {
  process.stdout.write(JSON.stringify({ continue: true, systemMessage: msg }) + "\n");
  process.exit(0);
}

// Resolve the stable session id. Prefer the helper's output (it derives
// a 8-char hex from terminal context), falling back to a short hash if
// the helper isn't available.
function getStableId() {
  if (existsSync(STABLE_ID_HELPER)) {
    try {
      const r = spawnSync(process.execPath, [STABLE_ID_HELPER], { windowsHide: true,
        encoding: "utf-8",
        timeout: 2000,
      });
      if (r.status === 0 && r.stdout) {
        const id = r.stdout.trim();
        if (id) return id;
      }
    } catch {}
  }
  // Fallback: derive from terminal env or random.
  const term = process.env.WT_SESSION || process.env.TERM_SESSION_ID || `pid-${process.pid}-${Date.now()}`;
  let h = 5381;
  for (let i = 0; i < term.length; i++) h = ((h * 33) ^ term.charCodeAt(i)) >>> 0;
  return `claude-${h.toString(16).padStart(8, "0").slice(0, 8)}`;
}

// Resolve current branch via git (best-effort, non-fatal).
function getCurrentBranch() {
  try {
    const r = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { windowsHide: true,
      encoding: "utf-8",
      timeout: 1500,
    });
    if (r.status === 0) return r.stdout.trim();
  } catch {}
  return null;
}

async function main() {
  if (!existsSync(HELPER_PATH)) {
    // Helper not deployed yet — silent no-op.
    return emitNoOp();
  }
  const chatId = getStableId();
  const branch = getCurrentBranch();
  // Topic derivation: most-recent commit's [SCOPE-MS#] tag, falling back to
  // branch's last segment. Mirrors the per-agent-handoff topic derivation.
  let topic = null;
  if (branch && branch !== "HEAD") {
    const parts = branch.split("/");
    topic = parts[parts.length - 1] || branch;
  }

  let helper;
  try {
    helper = await import(`file://${HELPER_PATH.replace(/\\/g, "/")}`);
  } catch (e) {
    return emitMessage(`fleet: helper load failed (${e.message}); slot system unavailable`);
  }

  const result = helper.claimSlot({
    chatId,
    branch,
    topic,
    activity: "SessionStart",
  });

  if (!result.ok) {
    if (result.error === "fleet_full") {
      return emitMessage(`⚠ fleet: all 7 slots claimed by alive chats; this session uses legacy chatId-based handoffs. Run /fleet to inspect; force-reclaim crashed slots if needed.`);
    }
    return emitMessage(`⚠ fleet: claim failed (${result.error}: ${result.message})`);
  }

  const slot = result.slot.toUpperCase();
  const reused = result.alreadyOwned ? " (already owned, refreshed heartbeat)" : "";
  return emitMessage(`fleet: claimed slot ${slot} for ${chatId}${reused} · branch=${branch ?? "?"} · topic=${topic ?? "?"}`);
}

main().catch(e => {
  // Never block SessionStart — emit advisory and continue.
  process.stdout.write(JSON.stringify({
    continue: true,
    systemMessage: `fleet: session-start-claim-slot error: ${e.message}`,
  }) + "\n");
  process.exit(0);
});
