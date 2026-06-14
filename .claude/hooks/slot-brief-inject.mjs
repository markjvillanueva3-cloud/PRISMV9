#!/usr/bin/env node
// tier: T2
// HERMES-MASTER-ORCHESTRATOR / slot-brief-inject — UserPromptSubmit hook.
//
// THE targeted orchestrator->slot channel. The Hermes app (slot-less ZULU master)
// runs as a separate process and CANNOT inject into a Claude slot's context. So it
// writes a work-order / pointer-bundle to state/shared/slot-briefs/<slot>.md, and
// THIS hook surfaces it into that exact slot's NEXT prompt — then CONSUMES it
// (atomic rename to slot-briefs/_delivered/<slot>-<stamp>.md) so it shows exactly once.
//
// Contrast with the siblings:
//   slot-soul-inject        — PERSISTENT personality (re-injected every prompt, dedup-capped)
//   chat-bus-inject         — BROADCAST to all slots
//   slot-brief-inject (this)— TARGETED to one slot, CONSUME-ONCE (the missing channel)
//
// Delivery semantics: at-most-once. The archive (rename) happens BEFORE emit, so a
// hard process-kill in the sub-ms window between rename and stdout-flush could drop a
// brief. Acceptable for a coordination channel — the orchestrator confirms pickup via
// the bus / commit log and re-issues if a slot never actions a brief. The _delivered/
// copy is a full audit trail of everything injected.
//
// Safety: never throws (UserPromptSubmit must not block on a missing/locked brief).
// Disable: PRISM_SLOT_BRIEF_INJECT_DISABLE=1.   Verbose: PRISM_SLOT_BRIEF_INJECT_VERBOSE=1.
// Wired from: C:\Users\<user>\.claude\settings.json UserPromptSubmit chain
// (after slot-soul-inject so mySlot is already authoritative).

import fs from "node:fs";
import path from "node:path";
import { stripLoneSurrogates } from "../../scripts/lib/safe-truncate.mjs";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const MAX_INJECT_BYTES = 4096; // briefs are work orders (richer than souls); head-truncate beyond.

// ── Pure helpers (test seam) ─────────────────────────────────────────────────

/** Resolve the slot owning this session via chat-slots.json. Mirrors slot-soul-inject. */
export function resolveSlot(sid, slotsDoc) {
  if (!sid || !slotsDoc || !slotsDoc.slots) return null;
  for (const [name, data] of Object.entries(slotsDoc.slots)) {
    // Slot keys become filename components downstream (path.join) — accept only
    // clean NATO alpha tokens. Defense-in-depth: a corrupted/hand-edited slots
    // file must not turn this into an arbitrary file read/move primitive.
    if (!/^[a-z]+$/.test(name)) continue;
    if (data?.chatId && (data.chatId === sid || sid.includes(data.chatId.replace(/^claude-/, "")))) {
      return name;
    }
  }
  return null;
}

/** Stable 8-hex rolling hash of the brief body (archive-name component). */
export function briefHash(body) {
  const s = String(body ?? "");
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Archive stamp `<intMtimeMs>-<hash>` — unique per delivery, sortable, no Date.now(). */
export function formatStamp(mtimeMs, body) {
  const m = Number.isFinite(mtimeMs) ? Math.floor(mtimeMs) : 0;
  return `${m}-${briefHash(body)}`;
}

/** Head-truncate an over-cap brief, preserving the work-order head + a marker. */
export function truncateBrief(body, maxBytes = MAX_INJECT_BYTES) {
  const s = String(body ?? "");
  if (s.length <= maxBytes) return s;
  return s.slice(0, maxBytes) + "\n…(brief truncated at " + maxBytes + " bytes — full copy in _delivered/)";
}

/** Compose the injected block (targeted header + body + optional source footer). */
export function buildBriefBlock(mySlot, body, opts = {}) {
  const { verbose = false, briefPath = "", maxBytes = MAX_INJECT_BYTES } = opts;
  const payload = truncateBrief(body, maxBytes);
  const header = `## 📨 Orchestrator brief — ${mySlot} (targeted work order from ZULU/Hermes · consume-once)\n\n`;
  const footer = verbose && briefPath ? `\n_(brief source: ${briefPath} — archived to _delivered/ on delivery)_` : "";
  return header + payload + footer;
}

// ── Hook I/O ─────────────────────────────────────────────────────────────────

function emit(payload) { process.stdout.write(JSON.stringify(payload)); process.exit(0); }
function emitEmpty() { emit({ continue: true }); }
function readJson(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }
function readText(p) { try { return fs.readFileSync(p, "utf8"); } catch { return null; } }

async function main() {
  if (process.env.PRISM_SLOT_BRIEF_INJECT_DISABLE === "1") return emitEmpty();

  const briefsDir = path.join(PRISM_ROOT, "state/shared/slot-briefs");
  const deliveredDir = path.join(briefsDir, "_delivered");
  const slotsFile = path.join(PRISM_ROOT, "state/shared/chat-slots.json");

  // Read stdin (UserPromptSubmit envelope) — must not block forever.
  let raw = "";
  try {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    raw = Buffer.concat(chunks).toString("utf8");
  } catch { return emitEmpty(); }
  const env = (() => { try { return JSON.parse(raw); } catch { return {}; } })();
  const sid = env.session_id || "";
  if (!sid) return emitEmpty();

  const slotsDoc = readJson(slotsFile) || { slots: {} };
  const mySlot = resolveSlot(sid, slotsDoc);
  if (!mySlot) return emitEmpty();

  const slotKey = mySlot.toLowerCase();
  const briefPath = path.join(briefsDir, `${slotKey}.md`);
  const body = readText(briefPath);
  if (!body || !body.trim()) return emitEmpty(); // no brief queued, or empty file

  const verbose = process.env.PRISM_SLOT_BRIEF_INJECT_VERBOSE === "1";
  const fullBlock = buildBriefBlock(mySlot, body, { verbose, briefPath, maxBytes: MAX_INJECT_BYTES });

  // CONSUME-ONCE: archive (rename) BEFORE emit so the brief shows exactly once. If the
  // archive fails (race with a concurrent invocation that already moved it, or a locked
  // file), fail soft — do NOT re-emit a brief we couldn't confirm we own.
  try {
    fs.mkdirSync(deliveredDir, { recursive: true });
    let mtimeMs = 0;
    try { mtimeMs = fs.statSync(briefPath).mtimeMs; } catch { /* stamp falls back to 0 */ }
    const dest = path.join(deliveredDir, `${slotKey}-${formatStamp(mtimeMs, body)}.md`);
    fs.renameSync(briefPath, dest);
  } catch {
    return emitEmpty();
  }

  emit({
    continue: true,
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: stripLoneSurrogates(fullBlock) },
  });
}

// Run only when invoked as the entry script (not when imported by tests).
const invokedAsScript = (() => {
  try {
    const self = new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/i, "$1");
    return path.resolve(self) === path.resolve(process.argv[1] ?? "");
  } catch { return false; }
})();
if (invokedAsScript) main().catch(() => emitEmpty());
