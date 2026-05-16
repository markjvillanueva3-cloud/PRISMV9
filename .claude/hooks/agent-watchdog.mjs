#!/usr/bin/env node
// tier: T3
/**
 * agent-watchdog.mjs — stall detector for the 10-chat PRISM fleet.
 *
 * OBSIDIAN-INTELLIGENCE-MS3 / U-AGENT-RUNTIME-ALERTS (G3).
 *
 * Why this exists:
 *   The fleet has 10 concurrent chat slots. A chat that holds a slot
 *   but stops posting heartbeats (Claude CLI hung, terminal crashed,
 *   operator walked away mid-loop) silently rots the slot until the
 *   10-min CRASH_TTL reclaims it — and even then, the work it claimed
 *   is orphaned with no operator-visible signal. This watchdog detects
 *   stale-but-not-yet-crashed slots (between STALL and CRASH windows),
 *   emits one alert per agent per hour (rate-limited), and writes a
 *   JSONL audit trail.
 *
 * Three usage modes:
 *   1. CLI scan (scheduled task):  node agent-watchdog.mjs
 *      → reads chat-slots, writes alerts to JSONL, exits.
 *   2. PostToolUse / Stop hook:    invoked by harness with JSON stdin
 *      → same as CLI but emits hookSpecificOutput.additionalContext
 *      with stall summary so the active chat sees it.
 *   3. Test mode:                  exported pure functions called from
 *      vitest with fixture slot data.
 *
 * Knobs:
 *   PRISM_AGENT_WATCHDOG_DISABLE=1                — disable entirely
 *   PRISM_AGENT_WATCHDOG_STALL_MIN=<n>            — stall threshold minutes (default 10)
 *   PRISM_AGENT_WATCHDOG_RATE_LIMIT_MIN=<n>       — per-agent alert rate-limit minutes (default 60)
 *   PRISM_AGENT_WATCHDOG_ALERT_PATH=<path>        — JSONL ledger path (default state/shared/.agent-watchdog-alerts.jsonl)
 *   PRISM_AGENT_WATCHDOG_STAMP_DIR=<path>         — per-agent stamp dir for rate-limit (default state/shared/.agent-watchdog-stamps/)
 *
 * Tier-3: every failure path returns {continue:true} and never blocks.
 */

import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  appendFileSync,
  statSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";

// ─── Tunable constants ────────────────────────────────────────────────
const MS_PER_MIN = 60_000;
const DEFAULT_STALL_MIN = 10;
const DEFAULT_RATE_LIMIT_MIN = 60;
const STAMP_FILE_SUFFIX = ".stamp";
const SCHEMA_VERSION = "1.0.0";

// ─── Path resolution (hard-coded to main tree per fleet-wide design) ──
const SLOTS_PATH =
  process.env.PRISM_CHAT_SLOTS_PATH || "H:/prism/state/shared/chat-slots.json";
const ALERT_PATH =
  process.env.PRISM_AGENT_WATCHDOG_ALERT_PATH ||
  "H:/prism/state/shared/.agent-watchdog-alerts.jsonl";
const STAMP_DIR =
  process.env.PRISM_AGENT_WATCHDOG_STAMP_DIR ||
  "H:/prism/state/shared/.agent-watchdog-stamps";

// ─── Pure detection (testable) ────────────────────────────────────────

/**
 * Detect stalled slots from chat-slots state.
 *
 * @param {{slots: Record<string, any>}} slotsState - parsed chat-slots.json
 * @param {number} now - epoch ms (injected for testability)
 * @param {{stallMs: number}} opts
 * @returns {Array<{slot: string, chatId: string, ageMs: number, lastHeartbeat: string, branch: string, topic: string, activity: string}>}
 */
export function detectStalls(slotsState, now, opts) {
  if (!slotsState || typeof slotsState !== "object") return [];
  const slots = slotsState.slots;
  if (!slots || typeof slots !== "object") return [];
  const stallMs = Number.isFinite(opts?.stallMs) && opts.stallMs > 0
    ? opts.stallMs
    : DEFAULT_STALL_MIN * MS_PER_MIN;
  const alerts = [];
  for (const [slotName, slotState] of Object.entries(slots)) {
    if (!slotState || typeof slotState !== "object") continue;
    const chatId = slotState.chatId;
    const heartbeat = slotState.lastHeartbeat;
    if (typeof chatId !== "string" || chatId.length === 0) continue;
    if (typeof heartbeat !== "string" || heartbeat.length === 0) continue;
    const hbMs = Date.parse(heartbeat);
    if (!Number.isFinite(hbMs)) continue;
    const ageMs = now - hbMs;
    if (ageMs >= stallMs) {
      alerts.push({
        slot: slotName,
        chatId,
        ageMs,
        lastHeartbeat: heartbeat,
        branch: typeof slotState.branch === "string" ? slotState.branch : "",
        topic: typeof slotState.topic === "string" ? slotState.topic : "",
        activity: typeof slotState.activity === "string" ? slotState.activity : "",
      });
    }
  }
  return alerts;
}

/**
 * Check whether an alert should fire (per-agent rate-limit).
 * Stamp files record the epoch ms of the last alert for each chatId.
 * The function does NOT write the stamp — the caller does on confirm.
 *
 * @param {string} chatId
 * @param {number} now - epoch ms
 * @param {{stampDir: string, rateLimitMs: number, fsExistsSync?: typeof existsSync, fsReadFileSync?: typeof readFileSync}} opts
 * @returns {boolean}
 */
export function shouldAlert(chatId, now, opts) {
  if (typeof chatId !== "string" || chatId.length === 0) return false;
  const rateLimitMs =
    Number.isFinite(opts?.rateLimitMs) && opts.rateLimitMs > 0
      ? opts.rateLimitMs
      : DEFAULT_RATE_LIMIT_MIN * MS_PER_MIN;
  const stampPath = stampPathFor(opts?.stampDir || STAMP_DIR, chatId);
  const exists = (opts?.fsExistsSync || existsSync)(stampPath);
  if (!exists) return true;
  let raw;
  try {
    raw = (opts?.fsReadFileSync || readFileSync)(stampPath, "utf8");
  } catch {
    return true;
  }
  const lastMs = Number.parseInt((raw || "").trim(), 10);
  if (!Number.isFinite(lastMs)) return true;
  return now - lastMs >= rateLimitMs;
}

/**
 * Compute the stamp-file path for a given chatId. chatId is sanitized
 * to prevent path traversal (only [A-Za-z0-9_-] retained).
 */
export function stampPathFor(stampDir, chatId) {
  const safe = String(chatId).replace(/[^A-Za-z0-9_-]/g, "_");
  return join(stampDir, safe + STAMP_FILE_SUFFIX);
}

/**
 * Build the JSONL alert record. Pure — caller writes it.
 */
export function buildAlertRecord(stall, now) {
  return JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    ts: new Date(now).toISOString(),
    chatId: stall.chatId,
    slot: stall.slot,
    ageMs: stall.ageMs,
    ageMinutes: Math.round(stall.ageMs / MS_PER_MIN),
    lastHeartbeat: stall.lastHeartbeat,
    branch: stall.branch,
    topic: stall.topic,
    activity: stall.activity,
  });
}

/**
 * Build the human-readable summary for hookSpecificOutput.additionalContext.
 */
export function buildSummary(alerts, opts) {
  if (alerts.length === 0) return "";
  const stallMin = opts?.stallMin ?? DEFAULT_STALL_MIN;
  const lines = [`⏰ agent-watchdog: ${alerts.length} stalled slot(s) (>${stallMin}m without heartbeat):`];
  for (const a of alerts.slice(0, 5)) {
    const min = Math.round(a.ageMs / MS_PER_MIN);
    lines.push(`  - ${a.slot} (${a.chatId}): ${min}m idle · topic=${a.topic || "?"} · activity=${a.activity || "?"}`);
  }
  if (alerts.length > 5) lines.push(`  ... and ${alerts.length - 5} more`);
  return lines.join("\n");
}

// ─── Persistence helpers (impure, side-effect) ────────────────────────

function writeStamp(chatId, now, stampDir = STAMP_DIR) {
  try {
    mkdirSync(stampDir, { recursive: true });
    const path = stampPathFor(stampDir, chatId);
    writeFileSync(path, String(now), "utf8");
  } catch {
    // best-effort; failing to stamp means we may double-alert, not fail
  }
}

function appendAlertLedger(line, alertPath = ALERT_PATH) {
  try {
    mkdirSync(dirname(alertPath), { recursive: true });
    appendFileSync(alertPath, line + "\n", "utf8");
  } catch {
    // tier-3: never throw, never block
  }
}

// ─── Main entry (CLI / hook) ──────────────────────────────────────────

function run() {
  if (process.env.PRISM_AGENT_WATCHDOG_DISABLE === "1") {
    return { continue: true, suppressOutput: true };
  }
  const stallMin = Number.parseInt(
    process.env.PRISM_AGENT_WATCHDOG_STALL_MIN || String(DEFAULT_STALL_MIN),
    10,
  );
  const rateLimitMin = Number.parseInt(
    process.env.PRISM_AGENT_WATCHDOG_RATE_LIMIT_MIN || String(DEFAULT_RATE_LIMIT_MIN),
    10,
  );
  const stallMs = (Number.isFinite(stallMin) && stallMin > 0 ? stallMin : DEFAULT_STALL_MIN) * MS_PER_MIN;
  const rateLimitMs = (Number.isFinite(rateLimitMin) && rateLimitMin > 0 ? rateLimitMin : DEFAULT_RATE_LIMIT_MIN) * MS_PER_MIN;
  const now = Date.now();

  let slotsState = null;
  try {
    if (existsSync(SLOTS_PATH)) {
      slotsState = JSON.parse(readFileSync(SLOTS_PATH, "utf8"));
    }
  } catch {
    return { continue: true, suppressOutput: true };
  }
  if (!slotsState) return { continue: true, suppressOutput: true };

  const stalls = detectStalls(slotsState, now, { stallMs });
  const fireable = stalls.filter((s) =>
    shouldAlert(s.chatId, now, { stampDir: STAMP_DIR, rateLimitMs }),
  );

  for (const s of fireable) {
    appendAlertLedger(buildAlertRecord(s, now));
    writeStamp(s.chatId, now);
  }

  const summary = buildSummary(fireable, { stallMin });
  if (summary.length === 0) {
    return { continue: true, suppressOutput: true };
  }
  return {
    continue: true,
    hookSpecificOutput: { hookEventName: "Stop", additionalContext: summary },
  };
}

// CLI mode: only when invoked directly (not when imported by tests)
const isMain =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1] &&
  /agent-watchdog\.mjs$/.test(process.argv[1].replace(/\\/g, "/"));

if (isMain) {
  const out = run();
  // If invoked as a harness hook, the harness reads stdout JSON; for plain
  // CLI invocations the JSON is still emitted (and harmless on a terminal).
  process.stdout.write(JSON.stringify(out) + "\n");
}
