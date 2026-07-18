#!/usr/bin/env node
// tier: T3
/**
 * heartbeat-keepalive.mjs — UserPromptSubmit hook that refreshes this chat's
 * chat-slots.json heartbeat between tool calls.
 *
 * Why this exists:
 *   Before this hook, a chat that sat idle for >10 min (CRASH_TTL_MS) would
 *   have its slot reclaimed by the next peer chat's /checkin — even though
 *   the chat was perfectly alive, just waiting on the operator. The 2026-05-14
 *   "alpha disappeared mid-session" bug is the canonical case: claude-2081f435
 *   claimed alpha at 16:53Z, didn't touch it for 17 min, claude-9ce91f43 ran
 *   /checkin at ~17:10Z, saw alpha as crashed, reclaimed it. claude-2081f435
 *   had no idea until the user pointed it out.
 *
 * What this fixes:
 *   This hook fires on every UserPromptSubmit. It (a) resolves the stable
 *   session id from the harness's stdin payload, (b) reads chat-slots.json,
 *   (c) if this chatId currently owns a slot AND its heartbeat is older than
 *   HEARTBEAT_REFRESH_MIN_AGE_MS, refreshes it. Cheap (one fs read + one
 *   conditional write). Silent on success. Never blocks the prompt.
 *
 * Knobs:
 *   PRISM_HEARTBEAT_KEEPALIVE_DISABLE=1          — disable entirely
 *   PRISM_HEARTBEAT_KEEPALIVE_MIN_AGE_MS=<n>     — refresh threshold (default 60000)
 *
 * Tier-3 (informational): if anything throws, log to stderr + return
 * {continue:true}. Never blocks.
 */

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

// ─── Tunable constants (no magic numbers in the body) ────────────────────
const DEFAULT_MIN_AGE_MS = 60 * 1000;          // refresh threshold if heartbeat older
const SESSION_ID_TIMEOUT_MS = 2000;             // stable-session-id helper budget
const HEARTBEAT_HELPER_TIMEOUT_MS = 5000;       // chat-slots heartbeat call budget
const MIN_CHAT_ID_LEN = 14;                     // "claude-" + 7 hex chars minimum
const SESSION_ID_PREFIX_LEN = 8;                // first 8 chars of UUID become claude-<8hex>
const SESSION_ID_PREFIX = "claude-";

// BLOCKER #5 (arm-C scrutiny 2026-05-14): paths are hard-coded to the main
// tree because chat-slots state is intentionally a SINGLE FLEET-WIDE FILE per
// host — multiple worktrees of the same repo (H:/prism + H:/prism-<scope>/)
// share the same fleet identity, so they read+write the same chat-slots.json.
// This is by design, not a bug. The env knobs below let operators override
// for testing or for an eventual multi-host fleet pattern (each host's main
// tree owns its own chat-slots.json).
const SLOTS_PATH = process.env.PRISM_CHAT_SLOTS_PATH || "H:/prism/state/shared/chat-slots.json";
const CHAT_SLOTS_HELPER = process.env.PRISM_CHAT_SLOTS_HELPER || "H:/prism/.claude/helpers/chat-slots.mjs";
const SESSION_ID_HELPER = process.env.PRISM_SESSION_ID_HELPER || "H:/prism/.claude/helpers/stable-session-id.mjs";

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

// Hex character class — used to validate session_id prefix before constructing
// chatId. UUIDs are hex-with-hyphens (e.g. 48450e3d-1234-...), so the leading
// SESSION_ID_PREFIX_LEN chars MUST be lowercase hex digits for a legitimate
// claude session id. Closes BLOCKER #3 (arm-C scrutiny 2026-05-14) — the
// previous fallback accepted any 8+ chars and constructed a garbage chatId
// that silently never matched any owned slot.
const HEX_PREFIX_RE = /^[0-9a-f]{8}$/i;

function resolveChatId(rawStdin) {
  // First try: pipe stdin into stable-session-id.mjs (canonical resolver).
  // It returns "claude-<8hex>" or "unresolved" on stderr+stdout combinations.
  try {
    const r = spawnSync(process.execPath, [SESSION_ID_HELPER], { windowsHide: true,
      input: rawStdin,
      encoding: "utf8",
      timeout: SESSION_ID_TIMEOUT_MS,
    });
    // On timeout, spawnSync returns { error: { code: 'ETIMEDOUT' }, status: null }
    // — fall through to the stdin-parse fallback but surface the failure so
    // chronic timeouts aren't masked (closes BLOCKER #2 partial-fix path).
    if (r.error) {
      try {
        process.stderr.write(
          `heartbeat-keepalive: session-id helper timed out or errored (${r.error.code || r.error.message || "unknown"}); using stdin fallback\n`,
        );
      } catch {}
    } else {
      const out = (r.stdout || "").trim();
      if (out && out.startsWith(SESSION_ID_PREFIX)) {
        const hex = out.slice(SESSION_ID_PREFIX.length, SESSION_ID_PREFIX.length + SESSION_ID_PREFIX_LEN);
        if (HEX_PREFIX_RE.test(hex)) return SESSION_ID_PREFIX + hex;
      }
    }
  } catch {}
  // Fallback: try to extract session_id from the raw stdin payload directly.
  try {
    const j = JSON.parse(rawStdin);
    const sid = j.session_id || j.sessionId;
    if (typeof sid === "string" && sid.length >= SESSION_ID_PREFIX_LEN) {
      const hex = sid.slice(0, SESSION_ID_PREFIX_LEN);
      if (HEX_PREFIX_RE.test(hex)) return SESSION_ID_PREFIX + hex;
    }
  } catch {}
  return null;
}

function maybeRefreshHeartbeat(chatId, minAgeMs) {
  if (!existsSync(SLOTS_PATH)) return { skipped: "no-slots-file" };
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(SLOTS_PATH, "utf8"));
  } catch {
    return { skipped: "unparseable-slots-file" };
  }
  if (!parsed || typeof parsed !== "object" || !parsed.slots) {
    return { skipped: "malformed-slots-file" };
  }
  let mySlot = null;
  let myState = null;
  for (const [n, s] of Object.entries(parsed.slots)) {
    if (s && s.chatId === chatId) {
      mySlot = n;
      myState = s;
      break;
    }
  }
  if (!mySlot) return { skipped: "no-slot-owned" };

  const lastMs = Date.parse(myState.lastHeartbeat || "");
  if (!Number.isFinite(lastMs)) return { skipped: "invalid-heartbeat" };
  const age = Date.now() - lastMs;
  if (age < minAgeMs) return { skipped: "fresh", ageMs: age, slot: mySlot };

  // Refresh via the helper's heartbeat action (it owns the lock + atomic write).
  const res = spawnSync(process.execPath, [
    CHAT_SLOTS_HELPER,
    "heartbeat",
    "--chatId",
    chatId,
  ], { windowsHide: true,
    encoding: "utf8",
    timeout: HEARTBEAT_HELPER_TIMEOUT_MS,
  });
  // BLOCKER #2 (arm-C scrutiny 2026-05-14): surface timeout / non-zero exits
  // to stderr so chronic failures aren't silently masked. Operators looking
  // at a "healthy" hook return ({continue:true}) shouldn't be deceived when
  // the slot is actually aging out.
  if (res.error) {
    try {
      process.stderr.write(
        `heartbeat-keepalive: refresh failed for slot=${mySlot} chatId=${chatId} (${res.error.code || res.error.message || "unknown"})\n`,
      );
    } catch {}
    return { skipped: "heartbeat-error", error: String(res.error) };
  }
  if (res.status !== 0) {
    try {
      process.stderr.write(
        `heartbeat-keepalive: refresh exited nonzero (code=${res.status}) for slot=${mySlot} chatId=${chatId}\n`,
      );
    } catch {}
    return { skipped: "heartbeat-nonzero", code: res.status };
  }
  return { refreshed: true, slot: mySlot, priorAgeMs: age };
}

function main() {
  if (process.env.PRISM_HEARTBEAT_KEEPALIVE_DISABLE === "1") {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const minAgeMs =
    Number.isFinite(parseInt(process.env.PRISM_HEARTBEAT_KEEPALIVE_MIN_AGE_MS, 10))
      ? parseInt(process.env.PRISM_HEARTBEAT_KEEPALIVE_MIN_AGE_MS, 10)
      : DEFAULT_MIN_AGE_MS;

  try {
    const stdin = readStdin();
    const chatId = resolveChatId(stdin);
    if (!chatId) {
      // No resolvable chatId — silent skip (this is normal for non-Claude
      // sessions or when the harness hasn't piped a payload).
      process.stdout.write(JSON.stringify({ continue: true }));
      process.exit(0);
    }
    const result = maybeRefreshHeartbeat(chatId, minAgeMs);
    // Result is informational only; never appears in chat output. Operators
    // can grep .cache/heartbeat-keepalive.jsonl if we ever want telemetry —
    // for now we don't even write a log line. Stay invisible.
    void result;
  } catch (err) {
    // Hook is tier-3 / informational — failures must NOT block the prompt.
    // Write to stderr for debug, but always continue.
    try {
      process.stderr.write(`heartbeat-keepalive: ${err && err.message ? err.message : err}\n`);
    } catch {}
  }
  process.stdout.write(JSON.stringify({ continue: true }));
  process.exit(0);
}

main();
