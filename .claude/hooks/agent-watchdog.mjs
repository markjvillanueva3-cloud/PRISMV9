#!/usr/bin/env node
// tier: T3
// matcher: Stop (advisory) + UserPromptSubmit (surface pending alerts)
// purpose: Detect stalled subagents (>N min no progress) and surface push-notification-worthy alerts. Rate-limited 1/agent/hour. Strictly additive.
/**
 * agent-watchdog.mjs — OBSIDIAN-INTELLIGENCE-MS3 / G3
 *
 * Polls chat-slots.json + AGENT_CHAT.jsonl for stalled subagents whose
 * lastHeartbeat is older than `PRISM_AGENT_WATCHDOG_STALL_MIN` minutes
 * (default 10). When a stall is detected, writes an alert record to
 * state/shared/agent-watchdog-alerts.jsonl and emits
 * `additionalContext` describing the stall so the next prompt cycle can
 * decide whether to push-notify.
 *
 * Strictly additive, advisory-only, never blocks. Rate-limited per-agent
 * (1 alert / agent / hour by default) via the JSONL ledger.
 *
 * Pure-function exports (testable):
 *   - detectStalledAgents(slots, nowMs, stallMinMin)
 *   - shouldAlert(agentId, recentAlerts, nowMs, cooldownSec)
 *   - renderAlertContext(stalls)
 *
 * Knobs:
 *   PRISM_AGENT_WATCHDOG_DISABLE=1
 *   PRISM_AGENT_WATCHDOG_STALL_MIN=N (default 10)
 *   PRISM_AGENT_WATCHDOG_COOLDOWN_HRS=N (default 1)
 *   PRISM_AGENT_WATCHDOG_ALERT_FILE=/path/override
 */

import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = process.env.PRISM_REPO_ROOT || "H:/prism";
const DISABLED = process.env.PRISM_AGENT_WATCHDOG_DISABLE === "1";
const STALL_MIN = Number(process.env.PRISM_AGENT_WATCHDOG_STALL_MIN || 10);
const COOLDOWN_HRS = Number(process.env.PRISM_AGENT_WATCHDOG_COOLDOWN_HRS || 1);
const ALERT_FILE = process.env.PRISM_AGENT_WATCHDOG_ALERT_FILE
  || path.join(REPO_ROOT, "state", "shared", "agent-watchdog-alerts.jsonl");
const SLOTS_FILE = path.join(REPO_ROOT, "state", "shared", "chat-slots.json");
const MS_PER_MIN = 60_000;
const MS_PER_HR = 3_600_000;

function readStdin() {
  try { return fs.readFileSync(0, "utf8"); }
  catch { return ""; }
}

function safeParse(s) {
  try { return JSON.parse(s); }
  catch { return null; }
}

function readSlots(slotsPath = SLOTS_FILE) {
  try {
    const obj = JSON.parse(fs.readFileSync(slotsPath, "utf8"));
    return obj && obj.slots && typeof obj.slots === "object" ? obj.slots : {};
  } catch {
    return {};
  }
}

function readAlertLedger(alertPath = ALERT_FILE) {
  if (!fs.existsSync(alertPath)) return [];
  try {
    const lines = fs.readFileSync(alertPath, "utf8").trim().split("\n");
    return lines.map((l) => safeParse(l)).filter(Boolean);
  } catch {
    return [];
  }
}

function appendAlert(alertPath, record) {
  try {
    fs.mkdirSync(path.dirname(alertPath), { recursive: true });
    fs.appendFileSync(alertPath, JSON.stringify(record) + "\n");
  } catch { /* fail-silent */ }
}

/**
 * Pure: given the `slots` object (slot-name → {chatId, lastHeartbeat, ...})
 * and a `nowMs`, return the list of stalled slots whose lastHeartbeat is
 * older than `stallMinMin` minutes. A slot with no chatId / no heartbeat
 * is NOT a stall (it's idle).
 */
export function detectStalledAgents(slots, nowMs = Date.now(), stallMinMin = STALL_MIN) {
  const out = [];
  if (!slots || typeof slots !== "object") return out;
  const stallThresholdMs = stallMinMin * MS_PER_MIN;
  for (const [slotName, state] of Object.entries(slots)) {
    if (!state || typeof state !== "object") continue;
    if (!state.chatId) continue;
    if (!state.lastHeartbeat) continue;
    const hbMs = Date.parse(state.lastHeartbeat);
    if (Number.isNaN(hbMs)) continue;
    const ageMs = nowMs - hbMs;
    if (ageMs >= stallThresholdMs) {
      out.push({
        slot: slotName,
        chatId: state.chatId,
        branch: state.branch || null,
        topic: state.topic || null,
        activity: state.activity || null,
        ageMin: Math.round(ageMs / MS_PER_MIN),
        lastHeartbeat: state.lastHeartbeat,
      });
    }
  }
  return out;
}

/**
 * Pure: should we alert about this agent now? Returns true iff there is
 * NO prior alert within the cooldown window.
 */
export function shouldAlert(chatId, recentAlerts, nowMs = Date.now(), cooldownSec = COOLDOWN_HRS * 3600) {
  if (!chatId) return false;
  const cooldownMs = cooldownSec * 1000;
  for (const alert of recentAlerts) {
    if (!alert || alert.chatId !== chatId) continue;
    const tMs = Date.parse(alert.alertedAt);
    if (Number.isNaN(tMs)) continue;
    if ((nowMs - tMs) < cooldownMs) return false;
  }
  return true;
}

/**
 * Pure: render the additionalContext string from a list of stalls.
 * Returns "" if no stalls.
 */
export function renderAlertContext(stalls) {
  if (!stalls || stalls.length === 0) return "";
  const lines = [
    `─── 🚨 agent-watchdog — ${stalls.length} stalled agent(s) ────────`,
  ];
  for (const s of stalls) {
    lines.push(`  [${s.slot}] ${s.chatId} stalled ${s.ageMin} min — topic:${s.topic || "—"} activity:${s.activity || "—"}`);
  }
  lines.push(`  Consider: PushNotification, /reap-zombies, or manual /checkin from the wedged slot.`);
  lines.push(`─────────────────────────────────────────────────────`);
  return lines.join("\n");
}

function main() {
  if (DISABLED) {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
    process.exit(0);
  }
  // Drain stdin (we don't need the harness payload for this read-only watchdog).
  readStdin();

  const slots = readSlots();
  const allStalls = detectStalledAgents(slots);
  if (allStalls.length === 0) {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
    process.exit(0);
  }

  const recentAlerts = readAlertLedger();
  const newStalls = allStalls.filter((s) => shouldAlert(s.chatId, recentAlerts));
  if (newStalls.length === 0) {
    // Stalls exist but all within cooldown — silent.
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
    process.exit(0);
  }

  // Record alerts for cooldown bookkeeping.
  const nowIso = new Date().toISOString();
  for (const s of newStalls) {
    appendAlert(ALERT_FILE, { ...s, alertedAt: nowIso });
  }

  const advisory = renderAlertContext(newStalls);
  process.stdout.write(JSON.stringify({
    continue: true,
    suppressOutput: false,
    hookSpecificOutput: { hookEventName: "Stop", additionalContext: advisory },
  }));
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` ||
    process.argv[1]?.endsWith("agent-watchdog.mjs")) {
  main();
}
