#!/usr/bin/env node
// tier: T2
/**
 * critical-memory-compact-nudge.mjs — UserPromptSubmit actuator that drives a
 * /compact onto the ONE chat that is the fleet's largest memory consumer when
 * the box is at critical commit pressure.
 *
 * THE GAP. scripts/fleet-memory-monitor.mjs samples system RAM every 5 min and,
 * on critical pressure, names the largest live chat tree as the best /compact
 * target — but it can only write that finding to state/shared/AGENT_CHAT.jsonl,
 * a diffuse shared bus. Whether the chat that SHOULD compact ever sees it is
 * left to chance. Meanwhile the only thing that actually frees a live chat's
 * memory is /compact: a working-set trim on an active process just pages back
 * in, and the fleet-reaper already covers idle/stale-slot relief. So the
 * missing piece is not more trimming — it is getting the /compact directive in
 * front of the exact chat that must act, at a moment it will act on it.
 *
 * This hook is that piece. On every UserPromptSubmit it:
 *   1. Reads the fleet-memory-monitor's most recent telemetry row (a fast local
 *      file read — it never samples memory itself; sampling per-prompt would
 *      fork PowerShell on every turn).
 *   2. If that row is FRESH and its level is `critical`, resolves THIS chat's
 *      slot from its own session id + chat-slots.json.
 *   3. If this chat's slot IS the monitor's named `largestTree`, injects a
 *      blunt /compact directive into this prompt's context — throttled per-chat
 *      so a sustained critical episode nudges once per cooldown, not per prompt.
 *
 * It fires in exactly ONE chat per critical episode — the named hog — so it is
 * never fleet-wide noise. A non-largest chat, an unlabeled `tree-PID` largest,
 * a slotless chat, or stale telemetry → silent no-op (the monitor's own
 * AGENT_CHAT advisory still covers the diffuse case).
 *
 * ADVISORY ONLY — it injects context; it NEVER blocks the prompt and NEVER
 * kills or compacts anything itself (a hook cannot invoke /compact). Emitting
 * {continue:true} unconditionally is the contract.
 *
 * Knobs:
 *   PRISM_CRIT_MEM_NUDGE_DISABLE=1        → silent no-op.
 *   PRISM_CRIT_MEM_NUDGE_COOLDOWN_SEC=N   → per-chat cooldown (default 480 = 8m).
 *
 * Wired: .claude/settings.json UserPromptSubmit chain (advisory).
 */

import { existsSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Telemetry older than this is too stale to drive a critical action. */
const TELEMETRY_FRESH_MS = 10 * 60 * 1000;
/** Default per-chat cooldown between nudges (overridable via env knob). */
const DEFAULT_COOLDOWN_SEC = 480;
/** Upper bound on the stdin drain — never wait on an EOF that won't come. */
const STDIN_READ_TIMEOUT_MS = 250;

/** Resolve repo-relative paths from this hook's own location (worktree-safe). */
function repoPaths() {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(here, "..", ".."); // .claude/hooks/ -> .claude/ -> repo
  return {
    telemetryFile: join(repoRoot, "state", "shared", "fleet-memory-history.jsonl"),
    // chat-slots.json path order. 2026-05-18: the canonical live file is
    // state/shared/chat-slots.json (chat-slots.mjs DEFAULT_STATE_PATH); the
    // legacy .claude/state/chat-slots.json does NOT exist on this fleet
    // (verified ENOENT). Resolve the canonical path FIRST so a stray legacy
    // copy can never shadow the live binding and misroute the nudge. Both
    // paths are still tried (fail-soft) for forward-compat.
    slotsFile: join(repoRoot, "state", "shared", "chat-slots.json"),
    slotsFileAlt: join(repoRoot, ".claude", "state", "chat-slots.json"),
    stampDir: join(repoRoot, "state", "shared"),
  };
}

/** Emit the hook verdict. ALWAYS {continue:true} — this hook never blocks. */
function emitContinue(additionalContext) {
  const out = additionalContext
    ? { continue: true, hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext } }
    : { continue: true };
  try { process.stdout.write(JSON.stringify(out)); } catch { /* stdout gone */ }
}

/** Read the hook's stdin payload, time-bounded so it can never hang on EOF. */
function readStdin() {
  return new Promise((resolve) => {
    let buf = "";
    let done = false;
    let timer = null;
    const fin = () => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      try { process.stdin.destroy(); } catch { /* already gone */ }
      resolve(buf);
    };
    try {
      timer = setTimeout(fin, STDIN_READ_TIMEOUT_MS);
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (d) => { buf += d; });
      process.stdin.on("end", fin);
      process.stdin.on("error", fin);
    } catch { fin(); }
  });
}

/**
 * Derive this chat's stable id from a UserPromptSubmit payload's session_id.
 * The stable id is `claude-` + the first 8 hex of the session UUID — the same
 * scheme stable-session-id.mjs uses and chat-slots.json keys on. Returns null
 * when the payload has no usable session_id.
 * Pure function — no IO.
 */
export function stableIdFromPayload(payload) {
  const sid = payload && typeof payload === "object" ? payload.session_id : null;
  if (typeof sid !== "string" || sid.length < 8) return null;
  return "claude-" + sid.slice(0, 8);
}

/**
 * Find which slot a given chatId currently holds in a chat-slots.json object.
 * Returns the slot name, or null when the chatId holds no slot.
 * Pure function — no IO.
 */
export function slotForChatId(slotsObj, chatId) {
  if (!slotsObj || !chatId) return null;
  const slots = (slotsObj.slots && typeof slotsObj.slots === "object") ? slotsObj.slots : slotsObj;
  if (!slots || typeof slots !== "object") return null;
  for (const [name, state] of Object.entries(slots)) {
    if (state && typeof state === "object" && state.chatId === chatId) return name;
  }
  return null;
}

/** Read + parse chat-slots.json (first existing path wins). Never throws. */
function readSlots(slotsFile, slotsFileAlt) {
  for (const p of [slotsFile, slotsFileAlt]) {
    try {
      if (existsSync(p)) {
        const j = JSON.parse(readFileSync(p, "utf8"));
        if (j && typeof j === "object") return j;
      }
    } catch { /* try next */ }
  }
  return null;
}

/** Read the fleet-memory-monitor's most recent telemetry row. Never throws. */
function readLastMemoryRow(telemetryFile) {
  try {
    if (!existsSync(telemetryFile)) return null;
    const lines = readFileSync(telemetryFile, "utf8").trim().split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return null;
    return JSON.parse(lines[lines.length - 1]);
  } catch {
    return null;
  }
}

/** Human-readable byte size. Pure. */
export function fmtBytes(b) {
  if (!Number.isFinite(b) || b <= 0) return "0";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0, v = b;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0) + u[i];
}

/**
 * Decide whether to nudge THIS chat to /compact, and with what text.
 *
 * Nudges only when ALL hold: the memory telemetry row exists, its level is
 * `critical`, the row is fresh, this chat's slot is known, that slot IS the
 * monitor's named largest tree, and the per-chat cooldown has elapsed.
 *
 * Pure function — no IO. Caller supplies `lastNudgeMs` (from a stamp file) and
 * persists a fresh stamp when `nudge` is true.
 *
 * @returns {{nudge:boolean, text:(string|null), reason:string}}
 */
export function decideNudge({ row, mySlot, nowMs, lastNudgeMs, cooldownMs, freshMs }) {
  if (!row || typeof row !== "object") return { nudge: false, text: null, reason: "no-telemetry" };
  if (row.level !== "critical") return { nudge: false, text: null, reason: "not-critical" };

  const tsMs = row.ts ? Date.parse(row.ts) : NaN;
  if (!Number.isFinite(tsMs) || (nowMs - tsMs) > freshMs) {
    return { nudge: false, text: null, reason: "stale-telemetry" };
  }
  if (!mySlot) return { nudge: false, text: null, reason: "slot-unresolved" };
  if (row.largestTree !== mySlot) return { nudge: false, text: null, reason: "not-largest" };

  if (Number.isFinite(lastNudgeMs) && (nowMs - lastNudgeMs) < cooldownMs) {
    return { nudge: false, text: null, reason: "cooldown" };
  }

  const commit = Number.isFinite(row.commitUsedPct) ? row.commitUsedPct.toFixed(1) : "?";
  const phys = Number.isFinite(row.physUsedPct) ? row.physUsedPct.toFixed(1) : "?";
  const rss = fmtBytes(row.largestRssBytes);
  const trees = Number.isFinite(row.liveChatTrees) ? row.liveChatTrees : "?";
  const text =
    `⛔ MEMORY CRITICAL — this chat (slot ${mySlot}) is the LARGEST memory consumer in the `
    + `PRISM fleet right now: ~${rss} across its process tree. System commit memory is at `
    + `${commit}% (physical ${phys}%, ${trees} live chats) — the box is near OOM and other `
    + `chats will crash hard if it tips over. Run /compact NOW, before continuing this turn. `
    + `/compact is the ONLY action that frees a live chat's footprint — a working-set trim just `
    + `pages back in. If this work must continue first, keep it to one short step, then /compact.`;
  return { nudge: true, text, reason: "critical-largest" };
}

async function main() {
  const raw = await readStdin();

  if (process.env.PRISM_CRIT_MEM_NUDGE_DISABLE === "1") {
    emitContinue();
    return;
  }

  let payload = {};
  try { payload = raw.trim() ? JSON.parse(raw) : {}; } catch { payload = {}; }

  const { telemetryFile, slotsFile, slotsFileAlt, stampDir } = repoPaths();

  const row = readLastMemoryRow(telemetryFile);
  // Fast pre-check: if there is no critical telemetry, do nothing else.
  if (!row || row.level !== "critical") {
    emitContinue();
    return;
  }

  const stableId = stableIdFromPayload(payload);
  const mySlot = stableId ? slotForChatId(readSlots(slotsFile, slotsFileAlt), stableId) : null;

  const cooldownSec = Number(process.env.PRISM_CRIT_MEM_NUDGE_COOLDOWN_SEC) || DEFAULT_COOLDOWN_SEC;
  const cooldownMs = cooldownSec * 1000;

  // Per-chat stamp — keyed on the stable 8-hex id so each chat throttles
  // independently (and a slotless chat still has a stable key).
  const stampKey = stableId ? stableId.replace(/[^a-z0-9-]/gi, "") : "unknown";
  const stampFile = join(stampDir, `.crit-mem-nudge-${stampKey}.stamp`);
  let lastNudgeMs = NaN;
  try { lastNudgeMs = statSync(stampFile).mtimeMs; } catch { /* no stamp yet */ }

  const decision = decideNudge({
    row, mySlot, nowMs: Date.now(), lastNudgeMs, cooldownMs, freshMs: TELEMETRY_FRESH_MS,
  });

  if (!decision.nudge) {
    emitContinue();
    return;
  }

  // Stamp first, so a concurrent prompt in the same chat respects the cooldown
  // even if this process is slow to emit.
  try {
    mkdirSync(stampDir, { recursive: true });
    writeFileSync(stampFile, new Date().toISOString());
  } catch { /* best-effort — a missed stamp just means the next prompt re-nudges */ }

  emitContinue(decision.text);
}

// Run main() only when invoked as the hook entry point — NOT when this module
// is imported by a test (an import must not trigger the stdin drain / stdout
// write). process.argv[1] is the hook path under the harness, the test file
// path under `node --test`. The last-resort .catch() still guarantees a
// {continue:true} verdict on any unforeseen rejection.
const invokedAsHook = (() => {
  try {
    return !!process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
  } catch { return false; }
})();
if (invokedAsHook) main().catch(() => emitContinue());
