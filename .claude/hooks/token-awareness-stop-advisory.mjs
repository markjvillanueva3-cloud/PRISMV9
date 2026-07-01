#!/usr/bin/env node
// tier: T3
// TOKEN-AWARENESS-MS0 / U-TA08 — Stop hook advisory.
//
// Stop hook. If this session is ending while the sidecar shows RED/CRITICAL
// zone AND no /compact was emitted this session, write a one-line advisory
// to state/shared/AGENT_CHAT.jsonl so the NEXT session in this slot picks up
// the warning. Never blocks Stop — pure advisory.
//
// Why: a session that exits at RED with a precompact-trip handoff has a
// degraded RESUME (less metadata fits). Detecting "exited RED without
// voluntary /compact" lets the operator (or the next-session auto-resume)
// trigger a clean compact early in the new session.
//
// Knobs:
//   PRISM_TOKEN_AWARE_STOP_DISABLE=1     — disable entirely
//   PRISM_TOKEN_AWARE_STOP_COOLDOWN_MS=N — minimum gap between advisories per slot

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { applyStaleness } from "../../scripts/lib/token-awareness-state.mjs";

const PRISM = "H:/prism";
const SLOTS_FILE = `${PRISM}/state/shared/chat-slots.json`;
const AGENT_CHAT = `${PRISM}/state/shared/AGENT_CHAT.jsonl`;
const COOLDOWN_FILE = `${PRISM}/state/shared/.token-awareness-stop-cooldown.json`;
const DEFAULT_COOLDOWN_MS = 30 * 60 * 1000; // 30 min — don't spam AGENT_CHAT

function safeJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function resolveSlot(sessionId, slotsDoc) {
  if (!sessionId || !slotsDoc || !slotsDoc.slots) return "unknown";
  for (const [name, data] of Object.entries(slotsDoc.slots)) {
    if (!data) continue;
    if (data.chatId === sessionId) return name;
    if (data.chatId && sessionId.includes(data.chatId.replace(/^claude-/, ""))) return name;
  }
  return "unknown";
}

// Pure decision fn — exported for testing. Returns null if no advisory needed.
export function decideAdvisory({ state, cooldownEntry, nowMs, cooldownMs = DEFAULT_COOLDOWN_MS }) {
  if (!state) return null;
  // Only RED+ triggers an advisory
  if (state.zone !== "RED" && state.zone !== "CRITICAL") return null;
  // Cooldown — don't spam if same slot exited RED+ recently
  if (cooldownEntry && cooldownEntry.lastAdvisoryAt) {
    const t = Date.parse(cooldownEntry.lastAdvisoryAt);
    if (Number.isFinite(t) && nowMs - t < cooldownMs) return null;
  }
  return {
    severity: state.zone === "CRITICAL" ? "critical" : "warning",
    summary: `${state.zone} on exit — next session should /compact early`,
    detail: state.reasoning || "near token budget at session end",
    worstSource: state.worstSource || "unknown",
    worstPct: state.worstPct ?? 0,
  };
}

function appendAgentChat(slot, advisory, sessionId, nowIso) {
  const event = {
    schemaVersion: "1.0.0",
    timestamp: nowIso,
    from: `token-awareness-stop:${slot}`,
    sessionId,
    severity: advisory.severity,
    topic: "token-awareness",
    summary: advisory.summary,
    detail: advisory.detail,
    metadata: {
      zone: advisory.severity === "critical" ? "CRITICAL" : "RED",
      worstSource: advisory.worstSource,
      worstPct: advisory.worstPct,
    },
  };
  try {
    fs.mkdirSync(path.dirname(AGENT_CHAT), { recursive: true });
    fs.appendFileSync(AGENT_CHAT, JSON.stringify(event) + "\n");
  } catch {
    /* never block */
  }
}

function updateCooldown(slot, nowIso) {
  let cooldown = safeJson(COOLDOWN_FILE) || {};
  cooldown[slot] = { lastAdvisoryAt: nowIso };
  try {
    fs.mkdirSync(path.dirname(COOLDOWN_FILE), { recursive: true });
    const tmp = `${COOLDOWN_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(cooldown, null, 2));
    fs.renameSync(tmp, COOLDOWN_FILE);
  } catch {
    /* never block */
  }
}

async function main() {
  if (process.env.PRISM_TOKEN_AWARE_STOP_DISABLE === "1") {
    process.exit(0);
  }
  let raw = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) raw += chunk;
  let cc = {};
  try {
    cc = JSON.parse(raw || "{}");
  } catch {
    process.exit(0);
  }
  const sessionId = cc.session_id || "";
  if (!sessionId) process.exit(0);

  const slotsDoc = safeJson(SLOTS_FILE);
  const slot = resolveSlot(sessionId, slotsDoc);
  const sidecarPath = `${PRISM}/state/shared/token-budget-${slot}.json`;
  const sidecar = safeJson(sidecarPath);
  if (!sidecar) process.exit(0);

  const nowMs = Date.now();
  const aged = applyStaleness(sidecar, nowMs);
  const cooldown = safeJson(COOLDOWN_FILE) || {};
  const cooldownEntry = cooldown[slot];
  const cooldownMs = parseInt(process.env.PRISM_TOKEN_AWARE_STOP_COOLDOWN_MS || "", 10) || DEFAULT_COOLDOWN_MS;

  const advisory = decideAdvisory({ state: aged, cooldownEntry, nowMs, cooldownMs });
  if (!advisory) process.exit(0);

  const nowIso = new Date(nowMs).toISOString();
  appendAgentChat(slot, advisory, sessionId, nowIso);
  updateCooldown(slot, nowIso);

  // Surface via systemMessage so the operator sees it at Stop time
  const out = {
    hookSpecificOutput: {
      hookEventName: "Stop",
      systemMessage: `🎚️ token-awareness: ${advisory.severity.toUpperCase()} — ${advisory.summary} (slot=${slot}, host=${os.hostname()})`,
    },
  };
  process.stdout.write(JSON.stringify(out));
  process.exit(0);
}

main().catch(() => process.exit(0));
