#!/usr/bin/env node
/**
 * rename-window-intercept.mjs — UserPromptSubmit hook.
 *
 * Two jobs, both with ZERO model turn:
 *
 *  1. INSTANT RENAME — if the submitted prompt is `/rename <name>` (or
 *     `/rename-chat <name>`) for THIS chat, update the slot label in
 *     chat-slots.json AND flip the Windows Terminal tab title immediately,
 *     then BLOCK the prompt so the model never runs (no "thinking" turn).
 *     This is why it's a hook, not a skill: a skill always costs a turn.
 *
 *  2. ALWAYS-MATCH — on every other prompt, cheaply re-assert the tab title
 *     to this chat's current slot topic (stamp-cached, so steady-state cost
 *     is one temp-file read; PowerShell only spawns when the name changed).
 *     Satisfies the standing rule "terminal name should match chat name".
 *
 * Peer-rename (`/rename <slot> <name>`) is intentionally NOT intercepted —
 * it falls through to the /rename skill (rare, operator, needs the model).
 *
 * Caveat (R12, honest): the re-assert is PROMPT-DRIVEN. If the terminal (or
 * Claude Code) re-titles itself between prompts — during a long model turn or
 * idle — the tab shows the stale name until the NEXT user prompt corrects it.
 * There is no idle watcher by design (it would cost a spawn off the hot path).
 *
 * Fail-OPEN: any error → emit {"continue":true} and exit 0. This hook must
 * never block or delay a normal prompt.
 *
 * Knobs: PRISM_RENAME_WINDOW_DISABLE=1 (full passthrough),
 *        PRISM_RENAME_WINDOW_VERBOSE=1 (stderr diagnostics).
 */
// tier: T1
import { readFileSync } from "node:fs";

const STDIN_TIMEOUT_MS = 1500;
const SLOTS_PATH = "H:/prism/state/shared/chat-slots.json";
const RENAME_RE = /^\s*\/?(?:rename|rename-chat)\s+(.+\S)\s*$/i;

function out(obj) {
  try { process.stdout.write(JSON.stringify(obj)); } catch { /* ignore */ }
  process.exit(0);
}
const passthrough = () => out({ continue: true, suppressOutput: true });

function verbose(msg) {
  if (process.env.PRISM_RENAME_WINDOW_VERBOSE === "1") {
    try { process.stderr.write(`[rename-window-intercept] ${msg}\n`); } catch { /* ignore */ }
  }
}

function readStdin() {
  return new Promise((resolve) => {
    let buf = "";
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    const t = setTimeout(() => finish(null), STDIN_TIMEOUT_MS);
    try {
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (d) => { buf += d; });
      process.stdin.on("end", () => { clearTimeout(t); finish(buf); });
      process.stdin.on("error", () => { clearTimeout(t); finish(null); });
    } catch { clearTimeout(t); finish(null); }
  });
}

export function chatIdFromSession(sid) {
  const s = String(sid || "").replace(/[^a-f0-9]/gi, "");
  return s ? `claude-${s.slice(0, 8)}` : null;
}

/** Pure: extract the rename argument from a prompt, or null if not a rename. */
export function parseRenameArg(prompt) {
  const m = typeof prompt === "string" && prompt.match(RENAME_RE);
  return m ? m[1].trim() : null;
}

/** Pure: is `arg` the peer form `<slot> <name>` (→ defer to skill)? */
export function isPeerForm(arg, slotNames) {
  if (!arg || !arg.includes(" ") || !Array.isArray(slotNames)) return false;
  const first = arg.split(/\s+/)[0]?.toLowerCase();
  return slotNames.includes(first);
}

/**
 * Pure: compose the window caption for a chat. The caption ALWAYS leads with
 * `PRISM <slot>` — the stable, always-present slot identity — so the zebra
 * orchestrator can title-resolve a chat window even before it has a topic
 * (resolve-hwnd-by-title.mjs matches the `PRISM <slot>` prefix via its
 * `contains` tier). The volatile topic, when present, is appended for the
 * operator. An empty slot yields "" (caller skips the title set).
 * The `PRISM <slot>` prefix MUST stay in sync with the search term in
 * scripts/zebra-orchestrator-sweep.mjs and the boot caption in
 * H:/Tools/prism-fleet/slot-tab-boot.ps1.
 */
export function composeSlotTitle(slot, topic) {
  const s = String(slot ?? "").trim();
  if (!s) return "";
  const t = String(topic ?? "").trim();
  return t ? `PRISM ${s} - ${t}` : `PRISM ${s}`;
}

/** Read THIS chat's current slot + topic from chat-slots.json (never throws). */
function currentSlot(chatId) {
  try {
    const j = JSON.parse(readFileSync(SLOTS_PATH, "utf8"));
    const slots = j && j.slots ? j.slots : {};
    for (const name of Object.keys(slots)) {
      const v = slots[name];
      if (v && v.chatId === chatId) return { slot: name, topic: v.topic || "" };
    }
  } catch { /* ignore */ }
  return null;
}

async function loadSlotNames() {
  try {
    const m = await import("../helpers/chat-slots.mjs");
    if (Array.isArray(m.SLOT_NAMES) && m.SLOT_NAMES.length) return m.SLOT_NAMES;
  } catch { /* ignore */ }
  return null;
}

async function main() {
  if (process.env.PRISM_RENAME_WINDOW_DISABLE === "1") return passthrough();

  const raw = await readStdin();
  if (!raw) return passthrough();

  let input;
  try { input = JSON.parse(raw); } catch { return passthrough(); }

  const prompt = typeof input.prompt === "string" ? input.prompt : "";
  const chatId = chatIdFromSession(input.session_id);
  if (!chatId) return passthrough();

  // Lazy-load the title setter only when we actually have a slot to act on.
  let setWindowTitle, defaultStampFile;
  try {
    ({ setWindowTitle, defaultStampFile } = await import("../helpers/set-window-title.mjs"));
  } catch (e) {
    verbose(`title helper import failed: ${e && e.message}`);
    return passthrough();
  }
  const stampFile = defaultStampFile(chatId);

  const arg = parseRenameArg(prompt);
  if (arg) {
    // Peer form `/rename <slot> <name>` → defer to the skill (needs the model).
    const slotNames = await loadSlotNames();
    if (isPeerForm(arg, slotNames)) { verbose(`peer-rename form → passthrough to skill`); return passthrough(); }

    // Self-rename: update the slot label, then flip the tab NOW.
    let renameRes;
    try {
      const { renameChat } = await import("../helpers/chat-slots.mjs");
      renameRes = renameChat({ chatId, topic: arg });
    } catch (e) {
      verbose(`renameChat threw: ${e && e.message}`);
      return passthrough(); // let the skill report the failure properly
    }
    if (!renameRes || !renameRes.ok) {
      verbose(`renameChat not ok: ${renameRes && (renameRes.error || renameRes.message)}`);
      return passthrough(); // e.g. no_slot_owned → skill instructs /checkin
    }

    // U-ZM1-05: caption keeps the stable `PRISM <slot>` prefix so the zebra
    // orchestrator can title-resolve this chat by slot identity.
    const title = composeSlotTitle(renameRes.slot, renameRes.newTopic || arg);
    const r = setWindowTitle(title, { stampFile, force: true });
    verbose(`renamed slot=${renameRes.slot} "${renameRes.oldTopic}"->"${renameRes.newTopic}" title=${JSON.stringify(r)}`);

    const note =
      `✓ chat renamed: slot ${renameRes.slot} "${renameRes.oldTopic}" → "${renameRes.newTopic}"` +
      (r.ok ? ` · terminal tab title set` : ` · (tab title: ${r.error || r.skipped || "not set"})`) +
      ` — no model turn.`;
    // UserPromptSubmit contract: decision:"block" stops the prompt reaching
    // the model and surfaces `reason` to the user — instant, no thinking.
    // Deliberately NOT `continue:false` (that would halt the whole session
    // loop; we only want to skip THIS prompt's model turn).
    return out({ decision: "block", reason: note });
  }

  // Not a rename → always-match: cheap re-assert (stamp-cached, no force).
  // U-ZM1-05: re-assert on `cur.slot` (not `cur.topic`) so a topicless chat
  // still carries a deterministic `PRISM <slot>` caption — a missing topic
  // was the `hwnd:title-missing` root cause for the zebra orchestrator.
  const cur = currentSlot(chatId);
  if (cur && cur.slot) {
    const title = composeSlotTitle(cur.slot, cur.topic);
    const r = setWindowTitle(title, { stampFile });
    verbose(`always-match slot=${cur.slot} title="${title}" -> ${JSON.stringify(r)}`);
  }
  return passthrough();
}

// Only auto-run when invoked directly as a hook (`node rename-window-intercept.mjs`),
// NOT when imported by the test file (which would process.exit the runner).
if (process.argv[1]?.endsWith("rename-window-intercept.mjs")) {
  main().catch((e) => { verbose(`fatal: ${e && e.message}`); passthrough(); });
}
