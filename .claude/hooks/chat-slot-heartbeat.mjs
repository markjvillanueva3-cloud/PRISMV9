#!/usr/bin/env node
// tier: T4
/**
 * chat-slot-heartbeat.mjs — PostToolUse hook (all matchers)
 *
 * The missing middle of the fleet-slot lifecycle:
 *
 *   SessionStart  →  session-start-claim-slot.mjs   (claims a slot)
 *   PostToolUse   →  chat-slot-heartbeat.mjs        (THIS — keeps it warm)   ← was never built
 *   Stop          →  stop-release-slot.mjs          (releases it)
 *
 * Before this hook existed, a slot's `lastHeartbeat` was only bumped when the
 * operator ran `/checkin` (or `/handoff` / `/precompact`). A chat that worked
 * for >CRASH_TTL without running `/checkin` looked crashed, so the next chat's
 * `chat-slots.mjs reclaim` swept its slot and a fresh `claim` stole it — the
 * still-alive chat silently lost its identity. This hook fires after every tool
 * call and, debounced to ~once/45s, refreshes the heartbeat of the slot owned
 * by this session. As long as the chat is doing *anything*, its slot stays
 * alive; only a genuinely dead/idle chat ages out.
 *
 * Design points:
 *   - Debounced: a lock-free read decides whether a write is needed. ~1 write/min
 *     even on a tool-heavy session, so 6 concurrent chats don't thrash the lock.
 *   - chatId derivation matches /checkin + precompact-handoff exactly:
 *     `claude-${session_id.slice(0,8)}` from the hook's own stdin JSON. Falls
 *     back to stable-session-id.mjs (stdin piped through) only if session_id is
 *     absent. Consistency here is what prevents a chat from owning two slots.
 *   - Never claims: if this session owns no slot, no-op. Claiming from a
 *     high-frequency PostToolUse hook would race; SessionStart + /checkin own
 *     claiming.
 *   - Never blocks, never throws out: always `{continue:true}`, exit 0.
 *
 * Hook contract: stdin = JSON { session_id, tool_name?, ... }; stdout = JSON
 * { continue: true }. Exit 0 always.
 *
 * @hook PostToolUse:*
 */

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HELPER_PATH = resolve(__dirname, "..", "helpers", "chat-slots.mjs");
const STABLE_ID_HELPER = resolve(__dirname, "..", "helpers", "stable-session-id.mjs");

/** Skip the (locked) heartbeat write if the slot was refreshed within this window. */
const HEARTBEAT_DEBOUNCE_MS = 45 * 1000;

function emitContinue() {
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
  process.exit(0);
}

function readStdinRaw() {
  try {
    if (process.stdin.isTTY) return "";
    return readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

/**
 * Resolve this chat's stable slot id. Primary: `claude-<first8>` from the
 * session_id in the hook's stdin JSON (same form /checkin & precompact use).
 * Fallback: stable-session-id.mjs with the same stdin piped through.
 */
function resolveChatId(rawStdin) {
  // Primary — parse session_id from the hook payload.
  try {
    if (rawStdin && rawStdin.trim().startsWith("{")) {
      const parsed = JSON.parse(rawStdin);
      const sid = parsed?.session_id || parsed?.sessionId;
      if (typeof sid === "string" && sid.length >= 8) {
        return `claude-${sid.slice(0, 8).toLowerCase()}`;
      }
    }
  } catch { /* fall through */ }
  // Fallback — let the canonical resolver try PID pins / env / transcript.
  if (existsSync(STABLE_ID_HELPER)) {
    try {
      const r = spawnSync(process.execPath, [STABLE_ID_HELPER], {
        input: rawStdin || "",
        encoding: "utf-8",
        timeout: 2000,
      });
      if (r.status === 0 && r.stdout) {
        const id = r.stdout.trim();
        if (/^claude-[0-9a-f]{8}$/i.test(id)) return id.toLowerCase();
      }
    } catch { /* give up */ }
  }
  return null;
}

async function main() {
  if (!existsSync(HELPER_PATH)) return emitContinue();

  const raw = readStdinRaw();
  const chatId = resolveChatId(raw);
  if (!chatId) return emitContinue();

  let helper;
  try {
    helper = await import(`file://${HELPER_PATH.replace(/\\/g, "/")}`);
  } catch {
    return emitContinue();
  }

  // Lock-free read: does this chat own a slot, and is its heartbeat stale
  // enough to warrant a (locked) write?
  let owned;
  try {
    owned = helper.findSlotForChat(chatId);
  } catch {
    return emitContinue();
  }
  if (!owned || !owned.slot || !owned.state) return emitContinue();

  const lastMs = Date.parse(owned.state.lastHeartbeat);
  if (Number.isFinite(lastMs) && Date.now() - lastMs < HEARTBEAT_DEBOUNCE_MS) {
    return emitContinue(); // debounced — recent enough
  }

  // Stale enough — bump it. activity reflects what tool just ran (best-effort).
  let activity = "active";
  try {
    if (raw && raw.trim().startsWith("{")) {
      const p = JSON.parse(raw);
      if (typeof p?.tool_name === "string") activity = `PostToolUse:${p.tool_name}`;
    }
  } catch { /* keep "active" */ }

  try {
    helper.heartbeat({ chatId, activity });
  } catch { /* non-fatal — next tool call retries */ }

  return emitContinue();
}

main().catch(() => {
  // Never block PostToolUse — swallow everything.
  try { process.stdout.write(JSON.stringify({ continue: true }) + "\n"); } catch {}
  process.exit(0);
});
