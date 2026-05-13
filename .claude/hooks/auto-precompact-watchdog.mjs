#!/usr/bin/env node
// tier: T4
/**
 * auto-precompact-watchdog.mjs — UserPromptSubmit hook
 *
 * Belt-and-suspenders for auto-compact. Claude Code's PreCompact hook only
 * fires reliably on user-initiated `/compact`; an auto-compact triggered by
 * the model approaching its context limit may skip PreCompact depending on
 * the harness build. Without a fresh handoff at that moment, the post-
 * compact RESUME directive degrades to stale or generic.
 *
 * Mitigation: every N user prompts (and again whenever the prompt itself
 * signals compaction risk) fire `precompact-handoff.mjs` in a detached
 * background process. The write is idempotent (atomic + lock + dedup), so
 * the extra cadence is cheap and never thrashes the file.
 *
 * Behavior:
 *   - Tracks turn count per session in
 *     `state/shared/handoffs/.auto-precompact-state.json`.
 *   - Fires at fixed cadence (every WATCHDOG_CADENCE_TURNS prompts).
 *   - Fires immediately on the first turn (gives auto-compact a baseline).
 *   - Fires opportunistically when the user's prompt mentions /compact,
 *     auto-compact, "approaching limit", etc.
 *   - GCs session entries idle > 24h.
 *   - Never blocks the prompt: emits {continue:true} immediately and
 *     spawns the writer detached.
 *
 * Wiring: UserPromptSubmit hook in settings.json. continueOnError:true.
 */

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const STATE_FILE = "H:/prism/state/shared/handoffs/.auto-precompact-state.json";
const PRECOMPACT_HELPER = "H:/prism/.claude/helpers/precompact-handoff.mjs";

/** Fire a fresh handoff every N user prompts. 15 ≈ once per major task. */
const WATCHDOG_CADENCE_TURNS = 15;

/** Forget session entries that haven't seen activity in this many ms. */
const STALE_SESSION_MS = 24 * 60 * 60 * 1000;

/** Phrases in user prompts that strongly suggest imminent compaction. */
const COMPACT_SIGNAL_PATTERNS = [
  /\/compact\b/i,
  /\bauto[\s-]?compact\b/i,
  /\bapproaching (?:context|token) limit\b/i,
  /\bcompact (?:now|soon|please)\b/i,
  /\brun\s+\/?precompact\b/i,
];

function emit(systemMessage = "") {
  process.stdout.write(JSON.stringify({ continue: true, systemMessage }));
  process.exit(0);
}

function readStdinJSON() {
  try {
    if (process.stdin.isTTY) return null;
    const raw = fs.readFileSync(0, "utf-8");
    if (!raw || !raw.trim().startsWith("{")) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readState() {
  try {
    const raw = fs.readFileSync(STATE_FILE, "utf-8");
    const j = JSON.parse(raw);
    return j && typeof j === "object" ? j : {};
  } catch {
    return {};
  }
}

function writeState(s) {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2) + "\n");
  } catch {
    /* hook is advisory — never fail the prompt over state write */
  }
}

function gcStaleSessions(state) {
  const now = Date.now();
  const keep = {};
  for (const [key, ent] of Object.entries(state)) {
    if (!ent || typeof ent !== "object") continue;
    const lastSeen = typeof ent.lastSeenMs === "number" ? ent.lastSeenMs : 0;
    if (now - lastSeen < STALE_SESSION_MS) keep[key] = ent;
  }
  return keep;
}

function looksLikeCompactSignal(text) {
  if (!text) return false;
  for (const re of COMPACT_SIGNAL_PATTERNS) {
    if (re.test(text)) return true;
  }
  return false;
}

function fireHandoffWrite(sessionId) {
  // Detached background spawn. Pipe the harness's session_id payload to the
  // helper's stdin so it picks the same handoff filename Claude Code
  // resolves on its own PreCompact pass.
  try {
    const child = spawn(process.execPath, [PRECOMPACT_HELPER], {
      stdio: ["pipe", "ignore", "ignore"],
      detached: true,
      windowsHide: true,
    });
    child.stdin.write(JSON.stringify({ session_id: sessionId }));
    child.stdin.end();
    child.unref();
  } catch {
    /* swallow — never block the prompt */
  }
}

function main() {
  const payload = readStdinJSON();
  const sessionId = payload && typeof payload.session_id === "string" ? payload.session_id : "";
  if (!sessionId || sessionId.length < 8) {
    emit("auto-precompact: no session id");
    return;
  }

  const sessionKey = sessionId.slice(0, 8);
  const promptText = String(payload?.prompt || payload?.userPrompt || "");

  let state = readState();
  state = gcStaleSessions(state);

  const ent =
    state[sessionKey] && typeof state[sessionKey] === "object"
      ? state[sessionKey]
      : { turns: 0, lastHandoffTurn: -1, lastSeenMs: 0 };

  ent.turns = (typeof ent.turns === "number" ? ent.turns : 0) + 1;
  ent.lastSeenMs = Date.now();

  const lastHandoff = typeof ent.lastHandoffTurn === "number" ? ent.lastHandoffTurn : -1;
  const elapsed = ent.turns - lastHandoff;
  const cadenceFire = lastHandoff < 0 || elapsed >= WATCHDOG_CADENCE_TURNS;
  const signalFire = looksLikeCompactSignal(promptText);
  const shouldFire = cadenceFire || signalFire;

  let msg = "";
  if (shouldFire) {
    fireHandoffWrite(sessionId);
    ent.lastHandoffTurn = ent.turns;
    const reason = signalFire ? "compact-signal" : "cadence";
    msg = `auto-precompact: handoff queued (turn ${ent.turns}, ${reason})`;
  }

  state[sessionKey] = ent;
  writeState(state);
  emit(msg);
}

try {
  main();
} catch (e) {
  process.stdout.write(
    JSON.stringify({
      continue: true,
      systemMessage: `auto-precompact ERROR: ${String(e).slice(0, 100)}`,
    })
  );
}
