#!/usr/bin/env node
/**
 * mcp-broadcast-reconnect-inject.mjs — UserPromptSubmit hook.
 * Surfaces a "/mcp reconnect" nudge when a fleet-wide MCP reconnect signal
 * is newer than this chat's last-seen timestamp. Tracks per-chat "seen"
 * state in .claude/cache/mcp-broadcast-seen-<chatId>.ts.
 *
 * Knobs:
 *   PRISM_MCP_BROADCAST_INJECT_DISABLE=1   disable
 *   PRISM_MCP_BROADCAST_GRACE_SEC=15       skip signals younger than this
 *                                          (prevents the firing chat from
 *                                          self-surfacing immediately)
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DISABLE = process.env.PRISM_MCP_BROADCAST_INJECT_DISABLE === "1";
const GRACE_SEC = Number(process.env.PRISM_MCP_BROADCAST_GRACE_SEC || 15);
const SIGNAL_FILE = "H:/prism/state/shared/mcp-reconnect-signal.json";

function exitSilent() {
  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + "\n");
  process.exit(0);
}

async function readStdin() {
  return new Promise((resolve) => {
    let buf = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => { buf += c; });
    process.stdin.on("end", () => resolve(buf));
    process.stdin.on("error", () => resolve(""));
  });
}

async function main() {
  if (DISABLE || !existsSync(SIGNAL_FILE)) {
    exitSilent();
    return;
  }

  let input;
  try { input = JSON.parse(await readStdin()); } catch { exitSilent(); return; }

  const chatId = input.session_id || input.sessionId || "unknown";
  if (chatId === "unknown") { exitSilent(); return; }

  let signal;
  try { signal = JSON.parse(readFileSync(SIGNAL_FILE, "utf8")); } catch { exitSilent(); return; }
  if (!signal || typeof signal.signaledAtMs !== "number") { exitSilent(); return; }

  // TTL expired — signal is stale, skip.
  if (signal.expiresAtMs && Date.now() > signal.expiresAtMs) { exitSilent(); return; }

  // Grace window: prevent the firing chat from immediately self-surfacing.
  if (Date.now() - signal.signaledAtMs < GRACE_SEC * 1000) { exitSilent(); return; }

  // Per-chat "last seen" tracking — one file per chatId.
  const seenFile = `H:/prism/.claude/cache/mcp-broadcast-seen-${chatId}.ts`;
  let lastSeenMs = 0;
  try {
    if (existsSync(seenFile)) {
      const raw = readFileSync(seenFile, "utf8").trim();
      const parsed = Date.parse(raw);
      if (Number.isFinite(parsed)) lastSeenMs = parsed;
    }
  } catch {
    // Treat unreadable seen-file as never-seen (fail open — better to re-surface than miss).
  }

  if (lastSeenMs >= signal.signaledAtMs) {
    // This chat has already seen this broadcast. Skip.
    exitSilent();
    return;
  }

  // Mark seen BEFORE writing output so rapid back-to-back prompts don't double-surface.
  try {
    mkdirSync(dirname(seenFile), { recursive: true });
    writeFileSync(seenFile, new Date(signal.signaledAtMs).toISOString(), "utf8");
  } catch {
    // Non-fatal: worst case the nudge re-surfaces on the next prompt.
  }

  const ageMin = Math.round((Date.now() - signal.signaledAtMs) / 60000);
  const reasonText = signal.reason || "fleet-wide reconnect requested";
  const advisory = [
    "## MCP fleet broadcast — reconnect recommended",
    "",
    `A fleet-wide MCP reconnect signal was issued ${ageMin}m ago (reason: ${reasonText}).`,
    "",
    "**Action**: type `/mcp` to reconnect this chat to both `prism` (HTTP bridge → :3100) and `prism_safe` (per-chat stdio). The signal usually fires after a server restart, GPU swap, or deliberate fleet-hygiene sweep — every chat that does not reconnect will keep using its prior (possibly drifted) connection.",
    "",
    `_Disable: \`PRISM_MCP_BROADCAST_INJECT_DISABLE=1\`. Signal file: ${SIGNAL_FILE}._`,
  ].join("\n");

  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: advisory },
  }) + "\n");
}

main().catch(() => exitSilent());
