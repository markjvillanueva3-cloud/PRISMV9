#!/usr/bin/env node
// tier: T2
/**
 * orchestrator-advisory-inject.mjs — UserPromptSubmit hook that injects
 * golf-orchestrator advisories into THIS chat's prompt context when the
 * orchestrator has a fresh per-slot directive targeted at this chat's slot.
 *
 * The advisory injection channel is the OPT-IN, FAIL-SOFT path for the
 * chat-orchestrator's REACHING actions. The UI Automation SendKeys path
 * (U-CHO04) is the direct path; this hook is the always-available fallback
 * that depends only on existing PRISM hook infrastructure (no foreground-
 * focus dance, no PowerShell, no HWND lookup).
 *
 * FLOW:
 *   1. golf-orchestrator main loop (U-CHO05) decides a per-slot action via
 *      decideClearOrCompact / decideRestartAction.
 *   2. For REACHING actions targeting an OPT-IN slot, it writes a directive
 *      to state/shared/orchestrator-directives.json with shape:
 *        { directives: { <slotName>: { action, reason, writtenAt, advisoryId,
 *                                       expiresAt, attempts } } }
 *   3. This hook (UserPromptSubmit tier T2) fires on every prompt in every
 *      slot. For THIS chat's slot it reads the directives file, finds a
 *      fresh + targeted directive, injects an ADVISORY block into the
 *      prompt context. The chat sees it on the next turn and the operator
 *      / loop acts on it.
 *
 * DOCTRINE — golf is an ORCHESTRATOR not a SEIZER:
 *   * Opt-in: a chat receives advisories ONLY when its slot is in
 *     state/shared/orchestrator-opt-in.json (slot listed in optedInSlots
 *     array). Missing file or unlisted slot → silent no-op.
 *   * Cooldown: each advisoryId is injected at most once per chat (idempotent
 *     via per-chat ack file). Re-issuing requires a new advisoryId from the
 *     orchestrator.
 *   * Expiry: directives older than expiresAt are silently skipped (the
 *     situation that caused the advisory has likely passed).
 *
 * KNOBS:
 *   PRISM_ORCH_ADVISORY_DISABLE=1 — hook is a silent no-op
 *   PRISM_ORCH_ADVISORY_COOLDOWN_SEC=N — min seconds between advisories for
 *     the same chat (default 120) regardless of advisoryId uniqueness
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..", "..");
const SHARED_DIR = join(REPO_ROOT, "state", "shared");
const DIRECTIVES_PATH = join(SHARED_DIR, "orchestrator-directives.json");
const OPT_IN_PATH = join(SHARED_DIR, "orchestrator-opt-in.json");
const SLOTS_PATH = join(REPO_ROOT, ".claude", "state", "chat-slots.json");
const SLOTS_PATH_FALLBACK = join(SHARED_DIR, "chat-slots.json");
const ACK_DIR = join(SHARED_DIR, "orchestrator-acks");
const DEFAULT_COOLDOWN_SEC = 120;

const NOOP = JSON.stringify({ continue: true, suppressOutput: true });

// ─── Pure helpers (exported for testability) ────────────────────────────────

/**
 * Extract this chat's session id from the hook payload. Mirrors
 * stable-session-id.mjs's "claude-<first 8 hex>" convention used elsewhere.
 */
export function stableIdFromPayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  const sid = payload.session_id;
  if (typeof sid !== "string" || sid.length < 8) return null;
  return `claude-${sid.slice(0, 8)}`;
}

/**
 * Find the slot name for the given chatId by scanning chat-slots.json.
 * Returns null if the chatId isn't held by any slot. Mirrors
 * critical-memory-compact-nudge.mjs:slotForChatId.
 */
export function slotForChatId(slotsData, chatId) {
  if (!slotsData || typeof slotsData !== "object" || !chatId) return null;
  const map = (slotsData.slots && typeof slotsData.slots === "object")
    ? slotsData.slots : slotsData;
  for (const [name, state] of Object.entries(map)) {
    if (!state || typeof state !== "object") continue;
    if (state.chatId === chatId) return name;
  }
  return null;
}

/**
 * Decide whether to inject an advisory for THIS chat THIS prompt.
 * Pure: takes all state as args, returns { inject, reason, text?, advisoryId? }.
 *
 * Gates (each returns inject:false with a reason):
 *   - mySlot null → "slot-unresolved" (chat not in chat-slots)
 *   - optedIn=false → "not-opted-in" (chat hasn't opted into orchestrator)
 *   - no directive for mySlot → "no-directive"
 *   - directive expired (nowMs > expiresAt) → "directive-expired"
 *   - directive's advisoryId already in ackedIds → "already-acked"
 *   - lastAdvisoryMs within cooldown → "cooldown"
 *
 * @param {object} args
 * @param {string|null} args.mySlot
 * @param {boolean} args.optedIn
 * @param {object|null} args.directive  — { action, reason, writtenAt, advisoryId, expiresAt? }
 * @param {Set<string>} args.ackedIds   — advisoryIds this chat has already injected
 * @param {number} args.nowMs
 * @param {number} args.lastAdvisoryMs  — last time THIS chat injected anything (NaN if never)
 * @param {number} args.cooldownMs
 * @returns {{inject:boolean, reason:string, text?:string, advisoryId?:string}}
 */
export function decideAdvisoryInject({ mySlot, optedIn, directive, ackedIds, nowMs, lastAdvisoryMs, cooldownMs }) {
  if (!mySlot) return { inject: false, reason: "slot-unresolved" };
  if (!optedIn) return { inject: false, reason: "not-opted-in" };
  if (!directive || typeof directive !== "object") return { inject: false, reason: "no-directive" };
  const { action, advisoryId, expiresAt } = directive;
  if (!action || typeof action !== "string") return { inject: false, reason: "directive-malformed-no-action" };
  if (!advisoryId || typeof advisoryId !== "string") return { inject: false, reason: "directive-malformed-no-id" };
  if (expiresAt) {
    const expMs = Date.parse(expiresAt);
    if (Number.isFinite(expMs) && nowMs > expMs) return { inject: false, reason: "directive-expired" };
  }
  if (ackedIds instanceof Set && ackedIds.has(advisoryId)) {
    return { inject: false, reason: "already-acked" };
  }
  if (Number.isFinite(lastAdvisoryMs) && (nowMs - lastAdvisoryMs) < cooldownMs) {
    return { inject: false, reason: "cooldown" };
  }
  // Inject.
  const text = formatAdvisoryText(action, directive.reason || "(no-reason)", mySlot);
  return { inject: true, reason: "fresh-directive", text, advisoryId };
}

/**
 * Format the advisory text for prompt injection. Imperative voice — the
 * chat (or its operator) reads this and ACTS. The orchestrator's reason
 * is included so the chat knows WHY this advisory was issued.
 */
export function formatAdvisoryText(action, reason, slot) {
  const verb = action === "clear" ? "RUN /clear NOW"
             : action === "compact" ? "RUN /compact NOW"
             : action === "respawn" ? "(orchestrator will respawn this chat)"
             : `ACTION: ${action}`;
  return [
    `★ ORCHESTRATOR ADVISORY for slot \`${slot}\`:`,
    `  ${verb}`,
    `  Why: ${reason}`,
    "  (This advisory is opt-in via state/shared/orchestrator-opt-in.json.",
    "   Auto-acknowledged after injection.)",
  ].join("\n");
}

// ─── IO helpers ─────────────────────────────────────────────────────────────

function readJsonSafe(path) {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf8"));
  } catch { return null; }
}

function readSlots() {
  return readJsonSafe(SLOTS_PATH) || readJsonSafe(SLOTS_PATH_FALLBACK);
}

function readOptInSlots() {
  const data = readJsonSafe(OPT_IN_PATH);
  if (!data || !Array.isArray(data.optedInSlots)) return new Set();
  return new Set(data.optedInSlots.filter((s) => typeof s === "string"));
}

function readDirectivesForSlot(slot) {
  if (!slot) return null;
  const data = readJsonSafe(DIRECTIVES_PATH);
  if (!data || !data.directives || typeof data.directives !== "object") return null;
  return data.directives[slot] || null;
}

function readAckedIds(chatId) {
  if (!chatId) return new Set();
  const path = join(ACK_DIR, `${chatId}.json`);
  const data = readJsonSafe(path);
  if (!data || !Array.isArray(data.ackedIds)) return new Set();
  return new Set(data.ackedIds.filter((s) => typeof s === "string"));
}

function readLastAdvisoryMs(chatId) {
  if (!chatId) return NaN;
  const path = join(ACK_DIR, `${chatId}.json`);
  const data = readJsonSafe(path);
  if (!data || typeof data.lastAdvisoryAt !== "string") return NaN;
  const ms = Date.parse(data.lastAdvisoryAt);
  return Number.isFinite(ms) ? ms : NaN;
}

function recordAck(chatId, advisoryId, nowMs) {
  if (!chatId || !advisoryId) return;
  try {
    mkdirSync(ACK_DIR, { recursive: true });
    const path = join(ACK_DIR, `${chatId}.json`);
    const existing = readJsonSafe(path);
    const acked = Array.isArray(existing?.ackedIds) ? existing.ackedIds.slice() : [];
    if (!acked.includes(advisoryId)) acked.push(advisoryId);
    // Cap ackedIds to last 100 to bound the file size.
    const capped = acked.slice(-100);
    const tmp = `${path}.tmp.${process.pid}`;
    writeFileSync(tmp, JSON.stringify({
      schemaVersion: 1,
      lastAdvisoryAt: new Date(nowMs).toISOString(),
      ackedIds: capped,
    }, null, 2));
    // atomic publish — rename within same dir = same volume
    try { renameSync(tmp, path); }
    catch {
      // Fallback: direct overwrite if rename fails (e.g. EXDEV).
      writeFileSync(path, JSON.stringify({
        schemaVersion: 1,
        lastAdvisoryAt: new Date(nowMs).toISOString(),
        ackedIds: capped,
      }, null, 2));
    }
  } catch { /* best-effort */ }
}

// ─── Main entry ─────────────────────────────────────────────────────────────

async function main() {
  if (process.env.PRISM_ORCH_ADVISORY_DISABLE === "1") {
    process.stdout.write(NOOP);
    return;
  }

  // Drain stdin with a small timeout — never block on EOF that won't come.
  const payload = await readStdinJson(200);
  const chatId = stableIdFromPayload(payload);
  if (!chatId) { process.stdout.write(NOOP); return; }

  const slotsData = readSlots();
  const mySlot = slotForChatId(slotsData, chatId);
  const optInSet = readOptInSlots();
  const optedIn = mySlot ? optInSet.has(mySlot) : false;
  const directive = mySlot ? readDirectivesForSlot(mySlot) : null;
  const ackedIds = readAckedIds(chatId);
  const lastAdvisoryMs = readLastAdvisoryMs(chatId);
  const cooldownMs = (Number(process.env.PRISM_ORCH_ADVISORY_COOLDOWN_SEC) || DEFAULT_COOLDOWN_SEC) * 1000;
  const nowMs = Date.now();

  const decision = decideAdvisoryInject({
    mySlot, optedIn, directive, ackedIds, nowMs, lastAdvisoryMs, cooldownMs,
  });

  if (!decision.inject) {
    process.stdout.write(NOOP);
    return;
  }

  // Record ack BEFORE injecting so a fire-during-injection retry doesn't double-inject.
  recordAck(chatId, decision.advisoryId, nowMs);

  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: decision.text,
    },
  }));
}

function readStdinJson(timeoutMs) {
  return new Promise((resolve) => {
    const chunks = [];
    const t = setTimeout(() => resolve(null), timeoutMs);
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (d) => chunks.push(d));
    process.stdin.on("end", () => {
      clearTimeout(t);
      try { resolve(JSON.parse(chunks.join(""))); }
      catch { resolve(null); }
    });
    process.stdin.on("error", () => { clearTimeout(t); resolve(null); });
  });
}

// Entry-point guard: only run main() when invoked directly as a hook,
// never on import (tests import the pure exports).
const invokedAsHook = process.argv[1] && resolve(process.argv[1]) === resolve(__filename);
if (invokedAsHook) {
  main().catch(() => process.stdout.write(NOOP));
}
