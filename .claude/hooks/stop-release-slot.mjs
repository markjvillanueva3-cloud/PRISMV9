#!/usr/bin/env node
// tier: T4
/**
 * stop-release-slot.mjs — Stop hook
 *
 * Releases the fleet slot claimed by this chat at SessionStart. Pairs with
 * session-start-claim-slot.mjs. Failure is non-blocking — Stop must always
 * proceed; the slot system uses TTL-based crash detection (10 min) as
 * backup if release is missed.
 *
 * Hook contract: stdin receives JSON { session_id?, ... }; stdout JSON
 * { continue: true }. Never blocks.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HELPER_PATH = resolve(__dirname, "..", "helpers", "chat-slots.mjs");
const STABLE_ID_HELPER = resolve(__dirname, "..", "helpers", "stable-session-id.mjs");

function emitNoOp(msg) {
  const out = msg ? { continue: true, systemMessage: msg } : { continue: true };
  process.stdout.write(JSON.stringify(out) + "\n");
  process.exit(0);
}

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
    } catch { /* fall through */ }
  }
  const term = process.env.WT_SESSION || process.env.TERM_SESSION_ID || `pid-${process.pid}`;
  let h = 5381;
  for (let i = 0; i < term.length; i++) h = ((h * 33) ^ term.charCodeAt(i)) >>> 0;
  return `claude-${h.toString(16).padStart(8, "0").slice(0, 8)}`;
}

async function main() {
  if (!existsSync(HELPER_PATH)) return emitNoOp();

  const chatId = getStableId();

  let helper;
  try {
    helper = await import(`file://${HELPER_PATH.replace(/\\/g, "/")}`);
  } catch (e) {
    return emitNoOp(`fleet: helper load failed on stop (${e.message}); slot will TTL-crash in 10min`);
  }

  // Find the slot owned by this chat (chatId match). If none, no-op.
  const owned = helper.findSlotForChat(chatId);
  if (!owned || !owned.slot) return emitNoOp();

  const result = helper.releaseSlot({ chatId, slot: owned.slot });
  if (!result.ok) {
    return emitNoOp(`fleet: release failed for slot ${owned.slot.toUpperCase()} (${result.error}); will TTL-crash in 10min`);
  }
  return emitNoOp(`fleet: released slot ${owned.slot.toUpperCase()} (chatId=${chatId})`);
}

main().catch(e => {
  process.stdout.write(JSON.stringify({
    continue: true,
    systemMessage: `fleet: stop-release-slot error: ${e.message}`,
  }) + "\n");
  process.exit(0);
});
