#!/usr/bin/env node
// tier: T2
/**
 * slot-bind-enforce.mjs — UserPromptSubmit hook
 *
 * ROOT-CAUSE FIX (2026-05-18, U-SLOT-BIND-ENFORCE): the NATO slot wrappers
 * (`/checkin-<nato>`, `/startup-<nato>`, `/precompact-<nato>`,
 * `/handoff-<nato>`) only force-claim their slot if the *model* runs the
 * wrapper's markdown bash with a correctly-copied chat id. Post-/compact
 * the model copies the STALE id from the conversation summary (observed:
 * a hotel chat ran with id `93351de7` from a prior session in its lineage
 * instead of the live `2d30710b`), so the slot-task-claim helper rejected
 * the claim and a *peer* chat grabbed the unit the slot owner was building.
 *
 * The Bash-callable `stable-session-id.mjs` cannot save us here: from a
 * post-/compact Bash context its PID-pin anchors miss and it falls back to
 * the "most-recently-touched cached session" — which is whatever PEER chat
 * pinged most recently, not this one.
 *
 * The only authoritative anchor is Claude Code's own `session_id`, which
 * the harness passes to every hook on stdin (this is exactly what
 * `chat-state-isolator.mjs` uses to print the `**Chat Isolation:**` line).
 * So slot binding must be ENFORCED at the hook layer, not INSTRUCTED in
 * markdown. (CLAUDE.md R5: hooks enforce, the model judges.)
 *
 * Behavior: when this prompt is a slot-locked command, derive the canonical
 * chat id from the stdin session_id (`claude-<sid first8>`, the same
 * derivation chat-state-isolator + precompact-handoff use) and run
 * `chat-slots.mjs claim --force` for that slot. Emit a one-line
 * systemMessage so the model KNOWS the deterministic bind happened and
 * does NOT re-derive a stale id from the summary.
 *
 * NEVER blocks (always {continue:true}). Fail-safe: if there is no stdin
 * session_id we DO NOT GUESS — we no-op (a wrong claim is worse than none).
 *
 * Knobs:
 *   PRISM_SLOT_BIND_ENFORCE_DISABLE=1   — hard off (no-op)
 *   PRISM_SLOT_BIND_ENFORCE_VERBOSE=1   — include claim JSON in the message
 *   PRISM_SLOT_BIND_ENFORCE_NO_RECLAIM=1 — skip the pre-claim `reclaim` sweep
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Test seam: PRISM_SLOT_BIND_ENFORCE_CHAT_SLOTS lets the integration suite
// point main() at a hermetic fake chat-slots script so the subprocess test
// NEVER mutates the live fleet chat-slots.json / evicts a real peer. In
// production the env var is unset → the real helper. Read at module load
// (resolved once; the subprocess test sets it before spawning).
const CHAT_SLOTS =
  process.env.PRISM_SLOT_BIND_ENFORCE_CHAT_SLOTS ||
  resolve(__dirname, "..", "helpers", "chat-slots.mjs");

// chat-slots claim can do a lockfile RMW + git probe; 8s is the same
// ceiling the wrapper bash tolerates. git branch resolve is fast.
const CLAIM_TIMEOUT_MS = 8000;
const GIT_BRANCH_TIMEOUT_MS = 3000;
const DEFAULT_BRANCH = "cad-fusion-live-ms0";

// Canonical 26-slot fleet — KEEP IN SYNC with chat-slots.mjs SLOT_NAMES.
// A drift-guard test pins this against the helper's export.
// EXPANSION HISTORY: 7 → 10 → 12 → 13 → 26 (2026-05-19 SLOT-RECLAIM commit
// ed5c49044b added november..zulu). Any further expansion must update BOTH
// chat-slots.mjs AND this file in the same commit.
export const SLOT_NAMES = [
  "alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf",
  "hotel", "india", "juliett", "kilo", "lima", "mike",
  "november", "oscar", "papa", "quebec", "romeo", "sierra", "tango",
  "uniform", "victor", "whiskey", "xray", "yankee", "zulu",
];

// Slot-locked command verbs that carry a NATO suffix.
const SLOT_VERBS = ["checkin", "startup", "precompact", "handoff"];

/**
 * Pure decision core — no I/O. Given the raw prompt + the harness
 * session_id, decide whether (and how) to force-claim a slot.
 *
 * @param {{prompt?:string, sessionId?:string, slotNames?:string[]}} args
 * @returns {{shouldClaim:boolean, slot?:string, chatId?:string,
 *            command?:string, reason:string}}
 */
export function decideSlotBind({ prompt, sessionId, slotNames } = {}) {
  const slots = Array.isArray(slotNames) && slotNames.length ? slotNames : SLOT_NAMES;

  if (typeof prompt !== "string" || prompt.length === 0) {
    return { shouldClaim: false, reason: "no-prompt" };
  }

  // Detect a slot-locked command. Two accepted forms:
  //   (a) /<verb>-<nato>            e.g. /checkin-hotel
  //   (b) /<verb> ... --preferSlot <nato>   e.g. /checkin --preferSlot hotel --force
  // Token-boundary anchored so "describe the /checkin-hotel flow" still
  // binds (the intent to operate that slot is unambiguous) but a bare word
  // like "checkin" does not.
  let slot = null;
  let command = null;

  const verbAlt = SLOT_VERBS.join("|");
  const reSuffixed = new RegExp(`(?:^|\\s)/(${verbAlt})-([a-z]+)\\b`, "i");
  const mSuf = prompt.match(reSuffixed);
  if (mSuf) {
    const verb = mSuf[1].toLowerCase();
    const nato = mSuf[2].toLowerCase();
    if (slots.includes(nato)) {
      slot = nato;
      command = `${verb}-${nato}`;
    } else {
      // /checkin-zzz — a verb match with a NON-nato suffix. Not a slot lock.
      return { shouldClaim: false, reason: `non-nato-suffix:${nato}` };
    }
  }

  if (!slot) {
    const rePref = new RegExp(`(?:^|\\s)/(${verbAlt})\\b`, "i");
    const mVerb = prompt.match(rePref);
    if (mVerb) {
      const pref = prompt.match(/--preferSlot[=\s]+([a-z]+)\b/i);
      if (pref && slots.includes(pref[1].toLowerCase())) {
        slot = pref[1].toLowerCase();
        command = `${mVerb[1].toLowerCase()} --preferSlot ${slot}`;
      }
    }
  }

  if (!slot) {
    return { shouldClaim: false, reason: "no-slot-command" };
  }

  // We have a slot-locked command. The ONLY trustworthy id is the harness
  // session_id. No session_id ⇒ refuse to guess (fail-safe — a wrong
  // force-claim evicts a healthy peer, which is strictly worse than the
  // model running the wrapper bash itself).
  if (typeof sessionId !== "string" || sessionId.length < 8) {
    return { shouldClaim: false, slot, command, reason: "no-session-id" };
  }

  // BYTE-MATCH the sibling surfaces — do NOT case-fold. chat-state-isolator.mjs
  // (the `**Chat Isolation:**` line the model reads) uses `sessionId.slice(0,8)`
  // and precompact-handoff.mjs uses `claude-${sessionId.slice(0,8)}` — NEITHER
  // lowercases. Unilaterally lowercasing here would, on an uppercase-hex
  // session_id, bind the slot under an id no other surface recognizes —
  // re-creating the exact cross-chat-id divergence this hook exists to kill.
  // Fleet-wide case-normalization, if ever wanted, is a separate coordinated
  // change across all id-deriving surfaces (R7/R11), not a fork here.
  const chatId = `claude-${sessionId.slice(0, 8)}`;

  return { shouldClaim: true, slot, chatId, command, reason: "slot-locked-command" };
}

function readStdin() {
  try {
    if (process.stdin.isTTY) return {};
    const buf = readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return {};
    return JSON.parse(buf);
  } catch {
    return {};
  }
}

function emit(obj) {
  process.stdout.write(JSON.stringify({ continue: true, ...obj }) + "\n");
  process.exit(0);
}

// Parse chat-slots stdout. chat-slots emits ONE pretty-printed JSON object;
// try a clean whole-string parse first (the normal path), and only fall back
// to a balanced-slice if a runner merged a stderr/log line in front of it.
// (Avoids the greedy indexOf("{")/lastIndexOf("}") hostile-payload class —
// see [[feedback_scrutiny_gate_finds_hostile_payload_class]].)
function parseChatSlotsJson(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw.trim()); } catch { /* fall through */ }
  // Fallback: scan for the FIRST balanced top-level {...} object.
  const s = raw.indexOf("{");
  if (s < 0) return null;
  let depth = 0;
  for (let i = s; i < raw.length; i++) {
    const c = raw[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(raw.slice(s, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

/**
 * Read-only: which slot (if any) is this chatId currently bound to?
 * Used for the idempotent fast-path so an autonomous /loop does NOT
 * reclaim+force-evict+spam on every iteration. Injectable runner.
 * @returns {string|null} the slot name, or null if not bound / unknown
 */
export function findBoundSlot(chatId, opts = {}) {
  const runner = opts.runner || ((args) =>
    spawnSync(process.execPath, [CHAT_SLOTS, ...args], { windowsHide: true, encoding: "utf-8", timeout: CLAIM_TIMEOUT_MS }));
  try {
    const r = runner(["find", "--chatId", chatId]);
    const parsed = parseChatSlotsJson((r && r.stdout) ? String(r.stdout) : "");
    if (parsed && parsed.slot && parsed.state && parsed.state.chatId === chatId) {
      return parsed.slot;
    }
  } catch { /* unknown → caller proceeds to claim */ }
  return null;
}

/**
 * Run the chat-slots claim. Injectable runner for hermetic tests.
 * @returns {{ok:boolean, raw:string, parsed:object|null,
 *            failKind:('none'|'spawn-error'|'timeout-or-signal'|'nonzero'),
 *            detail:string}}
 */
export function performClaim(chatId, slot, opts = {}) {
  const runner = opts.runner || ((args) =>
    spawnSync(process.execPath, [CHAT_SLOTS, ...args], { windowsHide: true, encoding: "utf-8", timeout: CLAIM_TIMEOUT_MS }));
  const branch = opts.branch || DEFAULT_BRANCH;

  if (!opts.noReclaim) {
    try { runner(["reclaim"]); } catch { /* best-effort */ }
  }

  const r = runner([
    "claim",
    "--chatId", chatId,
    "--branch", branch,
    "--topic", `${slot}-work`,
    "--activity", "slot-bind-enforce",
    "--preferSlot", slot,
    "--force", "true",
    "--confirmRecent", "true",
  ]);

  const raw = (r && r.stdout) ? String(r.stdout) : "";
  const parsed = parseChatSlotsJson(raw);
  const ok = !!(r && r.status === 0);

  // Honest failure classification (R12): a spawn that never ran, a timeout
  // (SIGTERM, status===null), and a real non-zero exit are different facts —
  // the model needs the right one to triage.
  let failKind = "none";
  let detail = "";
  if (!ok) {
    if (r && r.error) { failKind = "spawn-error"; detail = String(r.error.message || r.error); }
    else if (r && r.signal) { failKind = "timeout-or-signal"; detail = `killed by ${r.signal} (claim exceeded ${CLAIM_TIMEOUT_MS}ms?)`; }
    else { failKind = "nonzero"; detail = `chat-slots exited ${r ? r.status : "?"}`; }
  }
  return { ok, raw, parsed, failKind, detail };
}

function gitBranch() {
  try {
    const r = spawnSync(
      process.platform === "win32" ? "git.exe" : "git",
      ["-C", resolve(__dirname, "..", ".."), "rev-parse", "--abbrev-ref", "HEAD"],
      { windowsHide: true, encoding: "utf-8", timeout: GIT_BRANCH_TIMEOUT_MS }
    );
    const b = (r.stdout || "").trim();
    if (b) return b;
    // Empty stdout = git ran but gave nothing (detached HEAD / odd state).
    // Surface on stderr (stdout MUST stay clean hook JSON) — a silent
    // wrong-branch claim is an R12 violation.
    process.stderr.write(`slot-bind-enforce: git branch resolve empty — using ${DEFAULT_BRANCH}\n`);
    return DEFAULT_BRANCH;
  } catch (e) {
    process.stderr.write(`slot-bind-enforce: git branch resolve failed (${e && e.message}) — using ${DEFAULT_BRANCH}\n`);
    return DEFAULT_BRANCH;
  }
}

function main() {
  if (process.env.PRISM_SLOT_BIND_ENFORCE_DISABLE === "1") emit({ suppressOutput: true });

  const input = readStdin();
  const prompt = typeof input.prompt === "string" ? input.prompt : "";
  const sessionId =
    (typeof input.session_id === "string" && input.session_id) ||
    (typeof input.sessionId === "string" && input.sessionId) ||
    "";

  const decision = decideSlotBind({ prompt, sessionId });

  if (!decision.shouldClaim) {
    // Surface the one case the operator most needs to know about: a
    // slot-locked command WITHOUT a resolvable session_id. The wrapper
    // bash is now the only path — warn the model to read the LIVE
    // Chat Isolation line, not the summary.
    if (decision.reason === "no-session-id" && decision.slot) {
      emit({
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext:
            `⚠️ slot-bind-enforce: /${decision.command} detected but no harness session_id on stdin — ` +
            `cannot deterministically bind slot \`${decision.slot}\`. When you run the wrapper's bash, ` +
            `STABLE MUST come from the LIVE \`**Chat Isolation:**\` line in THIS session's context — ` +
            `NOT from any conversation summary / handoff (that id is stale and is exactly how the ` +
            `cross-chat unit collision happened).`,
        },
      });
    }
    emit({ suppressOutput: true });
  }

  const { slot, chatId, command } = decision;

  // Idempotent fast-path: if this chatId is ALREADY bound to the target
  // slot, do nothing — no reclaim sweep, no force-evict, no message. This
  // is the steady state of an autonomous `/checkin-<slot> /loop` (the same
  // wrapper prompt re-fires every iteration + across every /compact); without
  // this guard the hook would reclaim+force+spam on every tick (P1).
  try {
    const bound = findBoundSlot(chatId);
    if (bound === slot) emit({ suppressOutput: true });
  } catch { /* unknown → fall through and claim */ }

  let result;
  try {
    result = performClaim(chatId, slot, {
      branch: gitBranch(),
      noReclaim: process.env.PRISM_SLOT_BIND_ENFORCE_NO_RECLAIM === "1",
    });
  } catch (e) {
    // R12: a thrown claim is a FAILURE — emit the advisory and STOP. Do
    // NOT fall through to the success message (that would report "✅ bound"
    // after the bind threw — a fail-loud violation and contradictory output).
    emit({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext:
          `⚠️ slot-bind-enforce: claim for slot \`${slot}\` threw (${e && e.message}); ` +
          `slot is NOT bound by this hook. Run the wrapper's bash slot-claim using ` +
          `the LIVE \`**Chat Isolation:**\` id (\`${chatId}\`), not a summary id.`,
      },
    });
  }

  // If the claim ran but FAILED, say so honestly with the real failure
  // mode — do not assert success (R12).
  if (result && !result.ok) {
    emit({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext:
          `⚠️ slot-bind-enforce: chat-slots claim for slot \`${slot}\` did NOT succeed ` +
          `(${result.failKind}: ${result.detail}). Binding may not have persisted — ` +
          `verify with \`node .claude/helpers/chat-slots.mjs find --chatId ${chatId}\` ` +
          `and, if unbound, run the wrapper bash with the LIVE Chat Isolation id.`,
      },
    });
  }

  const p = result && result.parsed;
  const prev = p && (p.previousOwner || (p.claim && p.claim.previousOwner));
  let msg =
    `✅ slot-bind-enforce: slot \`${slot}\` deterministically bound to \`${chatId}\` ` +
    `(from harness session_id — authoritative). Do NOT re-derive the chat id from any ` +
    `summary/handoff; use \`${chatId}\` for all chat-slots / slot-task-claim / handoff calls this session.`;
  if (prev) {
    msg += ` Evicted previous owner: ${typeof prev === "string" ? prev : JSON.stringify(prev)}.`;
  }
  if (process.env.PRISM_SLOT_BIND_ENFORCE_VERBOSE === "1" && result) {
    msg += `\n[verbose] ${result.raw.slice(0, 600)}`;
  }

  emit({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: msg,
    },
  });
}

// Only run the side-effecting main when invoked as a hook, not on import
// (the test suite imports decideSlotBind / performClaim / SLOT_NAMES).
const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  try {
    main();
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
  }
}
