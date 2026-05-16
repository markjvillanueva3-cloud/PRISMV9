#!/usr/bin/env node
// tier: T3
/**
 * stop-slot-task-claims-advisory.mjs — PER-SLOT-CLAIM-MS0/U-PSC05 (2026-05-16)
 *
 * Stop-time advisory: report active slot-task claims held by THIS chat so the
 * operator (and the next chat in the same window after /compact) sees what
 * units this slot still owns. Strictly NON-BLOCKING — emits a one-line
 * advisory; never returns decision:"block".
 *
 * Why: claims have a TTL but expire silently. A chat that stops with held
 * claims will hold them until TTL — peers' /pick-unit sees them as locked
 * during that window. If the chat won't return (operator closing terminal,
 * planned long pause), the operator wants to know what to release manually.
 *
 * Triggers: every Stop, but throttled to once per STOP_THROTTLE_MS per
 * stable-session-id so loops don't spam.
 *
 * Knobs:
 *   PRISM_SLOT_TASK_ADVISORY_DISABLE=1   — skip entirely
 *   PRISM_SLOT_TASK_ADVISORY_VERBOSE=1   — emit even when no claims held
 *   PRISM_SLOT_TASK_ADVISORY_THROTTLE_MS=N (default 600000 = 10min)
 */

import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const ROOT = "H:/prism";
const CLAIMS_PATH = `${ROOT}/state/shared/slot-task-claims.json`;
const SLOTS_PATH = `${ROOT}/state/shared/chat-slots.json`;
const STAMP_PATH = `${ROOT}/state/shared/.slot-task-advisory-stamp.json`;

const DEFAULT_THROTTLE_MS = 10 * 60 * 1000;
const DISABLED = process.env.PRISM_SLOT_TASK_ADVISORY_DISABLE === "1";
const VERBOSE = process.env.PRISM_SLOT_TASK_ADVISORY_VERBOSE === "1";
const THROTTLE_MS = Math.max(0, Number(process.env.PRISM_SLOT_TASK_ADVISORY_THROTTLE_MS) || DEFAULT_THROTTLE_MS);

function approveAndExit(extra = {}) {
  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true, ...extra }));
  process.exit(0);
}

function readJson(p) {
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

function readSessionId() {
  // Best-effort: hooks normally get session_id from stdin JSON, but we don't
  // strictly need it — the slot's own chatId in chat-slots.json identifies us.
  let stdinData = "";
  try { stdinData = readFileSync(0, "utf8"); } catch { /* no stdin */ }
  if (!stdinData) return null;
  try {
    const j = JSON.parse(stdinData);
    return j?.session_id || null;
  } catch { return null; }
}

/**
 * Identify which slot this Stop event belongs to. We look in chat-slots.json
 * for the slot whose terminalWindowId or session_id matches; fallback to
 * most-recently-heartbeat slot on this host.
 */
export function identifyOwner(slotsData, sessionId) {
  if (!slotsData?.slots) return null;
  if (sessionId) {
    // Try to match by chatId derived from session_id (first 8 hex)
    const sid8 = sessionId.toLowerCase().replace(/[^0-9a-f]/g, "").slice(0, 8);
    const expectedChatId = "claude-" + sid8;
    for (const [slotName, slot] of Object.entries(slotsData.slots)) {
      if (slot?.chatId === expectedChatId) return { slot: slotName, chatId: slot.chatId };
    }
  }
  // Fallback: most-recent heartbeat
  let best = null;
  let bestTime = 0;
  for (const [slotName, slot] of Object.entries(slotsData.slots)) {
    if (!slot?.chatId || !slot?.lastHeartbeat) continue;
    const t = Date.parse(slot.lastHeartbeat);
    if (Number.isFinite(t) && t > bestTime) {
      bestTime = t;
      best = { slot: slotName, chatId: slot.chatId };
    }
  }
  return best;
}

/**
 * Format the advisory message for an owner's active claims.
 * Pure function for testability.
 */
export function formatAdvisory(owner, claims, nowIso) {
  const now = Date.parse(nowIso);
  const mine = Object.values(claims).filter((c) =>
    c.slot === owner.slot && c.chatId === owner.chatId);
  if (mine.length === 0) return null;
  // Categorize by expiry
  const expiringSoon = [];
  const longTerm = [];
  for (const c of mine) {
    const expiresAt = Date.parse(c.expiresAt);
    const ttlMin = Math.round((expiresAt - now) / 60000);
    if (ttlMin <= 30) expiringSoon.push({ unitId: c.unitId, ttlMin });
    else longTerm.push({ unitId: c.unitId, ttlMin });
  }
  const lines = [];
  lines.push(`🔒 ${owner.slot}/${owner.chatId.slice(7, 15)} holds ${mine.length} active slot-task claim(s):`);
  for (const c of expiringSoon.slice(0, 5)) lines.push(`   ⏳ ${c.unitId} — expires in ${c.ttlMin}m`);
  for (const c of longTerm.slice(0, 5)) lines.push(`   • ${c.unitId} — ${c.ttlMin}m TTL`);
  if (mine.length > 10) lines.push(`   … and ${mine.length - 10} more (use \`node H:/prism/.claude/helpers/slot-task-claim.mjs list --slot ${owner.slot}\`)`);
  lines.push(`   Release manually if not resuming: \`node .claude/helpers/slot-task-claim.mjs release --slot ${owner.slot} --chatId ${owner.chatId} --unit <MS::UID>\``);
  return lines.join("\n");
}

function shouldThrottle(sessionId) {
  if (THROTTLE_MS === 0) return false;
  const stamps = readJson(STAMP_PATH) || {};
  const lastAt = stamps[sessionId || "anon"];
  if (!lastAt) return false;
  const ageMs = Date.now() - Date.parse(lastAt);
  return Number.isFinite(ageMs) && ageMs < THROTTLE_MS;
}

function recordStamp(sessionId) {
  try {
    mkdirSync(path.dirname(STAMP_PATH), { recursive: true });
    const stamps = readJson(STAMP_PATH) || {};
    stamps[sessionId || "anon"] = new Date().toISOString();
    writeFileSync(STAMP_PATH, JSON.stringify(stamps), "utf8");
  } catch { /* best-effort */ }
}

function main() {
  if (DISABLED) return approveAndExit();
  const sessionId = readSessionId();
  if (shouldThrottle(sessionId)) return approveAndExit();

  const claimsData = readJson(CLAIMS_PATH);
  if (!claimsData?.claims) return approveAndExit();

  const slotsData = readJson(SLOTS_PATH);
  const owner = identifyOwner(slotsData, sessionId);
  if (!owner) return approveAndExit();

  const advisory = formatAdvisory(owner, claimsData.claims, new Date().toISOString());
  if (!advisory && !VERBOSE) return approveAndExit();

  recordStamp(sessionId);

  // Emit advisory as suppressOutput:false so the operator sees it; this is
  // additionalContext, not a block.
  const msg = advisory || `🟢 ${owner.slot}/${owner.chatId.slice(7, 15)} holds 0 active slot-task claims (verbose mode).`;
  process.stdout.write(JSON.stringify({
    continue: true,
    suppressOutput: false,
    hookSpecificOutput: { hookName: "stop-slot-task-claims-advisory", additionalContext: msg },
  }));
  process.exit(0);
}

// Run only when invoked as CLI; tests import formatAdvisory + identifyOwner directly.
import { fileURLToPath } from "node:url";
function isCli() {
  if (!process.argv[1]) return false;
  try {
    return fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
  } catch { return false; }
}
if (isCli()) main();
