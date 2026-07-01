#!/usr/bin/env node
// tier: T2
// HERMES-MS0 / U-HERMES02 — slot-soul-inject UserPromptSubmit hook.
// Reads state/shared/slot-souls/<slot>.md for the current slot, injects the
// frontmatter + voice/behavior sections as additionalContext on every prompt.
// Keeps each slot's "Hermes personality" consistent across /compact + reload.
//
// Safety: never throws (UserPromptSubmit must not block on a missing soul).
// Disable: PRISM_SLOT_SOUL_INJECT_DISABLE=1.
// Verbose: PRISM_SLOT_SOUL_INJECT_VERBOSE=1.
//
// Wired from: C:\Users\<user>\.claude\settings.json UserPromptSubmit chain
// (after slot-bind-enforce so mySlot is authoritative).

import fs from "node:fs";
import path from "node:path";
import { hashBlock, shouldEmit, recordEmit, formatDedupedMarker, pruneTag } from "../../scripts/lib/injection-dedup.mjs";
import { stripLoneSurrogates, safeTruncate } from "../../scripts/lib/safe-truncate.mjs";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const SOULS_DIR = path.join(PRISM_ROOT, "state/shared/slot-souls");
const SLOTS_FILE = path.join(PRISM_ROOT, "state/shared/chat-slots.json");
const DEDUP_SIDECAR = path.join(PRISM_ROOT, "state/shared/dashboards/injection-dedup-cache.json");
const MAX_INJECT_BYTES = 2048;  // hard cap — souls > 2KB get head-truncated, never fully suppressed
const DEDUP_TTL_MS = 5 * 60_000; // 5min — slot souls are stable across burst prompts within /loop iters

function emit(payload) {
  process.stdout.write(JSON.stringify(payload));
  process.exit(0);
}
function emitEmpty() { emit({ continue: true }); }
function readJson(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }
function readText(p) { try { return fs.readFileSync(p, "utf8"); } catch { return null; } }

async function main() {
  if (process.env.PRISM_SLOT_SOUL_INJECT_DISABLE === "1") return emitEmpty();

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

  // Resolve slot via chat-slots.json (the authoritative binding).
  const slotsDoc = readJson(SLOTS_FILE) || { slots: {} };
  let mySlot = null;
  for (const [name, data] of Object.entries(slotsDoc.slots || {})) {
    if (data?.chatId && (data.chatId === sid || sid.includes(data.chatId.replace(/^claude-/, "")))) {
      mySlot = name;
      break;
    }
  }
  if (!mySlot) return emitEmpty();

  // Read the slot's soul file (lowercase basename).
  const soulPath = path.join(SOULS_DIR, `${mySlot.toLowerCase()}.md`);
  const body = readText(soulPath);
  if (!body) return emitEmpty();

  // Truncate from the BEHAVIOR section onward if the body exceeds the cap.
  // Frontmatter + Voice always survive; lengthy Behavior tail is what gets head-truncated.
  let payload = body;
  if (payload.length > MAX_INJECT_BYTES) {
    // safeTruncate never cuts between the halves of a surrogate pair (emoji),
    // so the head-truncation can't leave a LONE high surrogate -- which would
    // make the whole API request body invalid JSON ("no low surrogate").
    payload = safeTruncate(payload, MAX_INJECT_BYTES, "\n...(soul truncated at " + MAX_INJECT_BYTES + " units)");
  }

  const verbose = process.env.PRISM_SLOT_SOUL_INJECT_VERBOSE === "1";
  const header = `## 🎭 Slot soul — ${mySlot} (Hermes personality layer, U-HERMES02)\n\n`;
  const footer = verbose ? `\n_(soul file: ${soulPath})_` : "";
  const fullBlock = header + payload + footer;

  // Injection-dedup adopter (U-PSN-INJECTION-DEDUP-LIB) — slot souls are stable
  // across prompts within a /loop iter; emit the full block only on first-emit
  // or after TTL expiry, otherwise emit the 1-line dedup marker.
  const dedupDisabled = process.env.PRISM_INJECTION_DEDUP_DISABLE === "1";
  const hookTag = `slot-soul-inject:${sid.slice(0, 8)}`;
  const contentHash = hashBlock(fullBlock);
  let cache = readJson(DEDUP_SIDECAR) || {};
  const now = Date.now();
  cache = pruneTag(cache, hookTag, now, DEDUP_TTL_MS); // shared-cache-safe: prune only this tag (5min TTL)
  const decision = dedupDisabled
    ? { emit: true, reason: "dedup-disabled", lastSeenAt: null }
    : shouldEmit(cache, hookTag, contentHash, now, DEDUP_TTL_MS);

  // Final guard: strip any unpaired surrogate before it reaches the injected
  // context. A lone surrogate anywhere in the request body makes the Anthropic
  // API reject it with 400 "no low surrogate in string" (even JSON.stringify's
  // \uXXXX escape of a lone high surrogate fails the API's strict parser).
  const additionalContext = stripLoneSurrogates(decision.emit ? fullBlock : formatDedupedMarker(hookTag));

  if (decision.emit && contentHash) {
    try {
      const newCache = recordEmit(cache, hookTag, contentHash, now);
      fs.mkdirSync(path.dirname(DEDUP_SIDECAR), { recursive: true });
      fs.writeFileSync(DEDUP_SIDECAR, JSON.stringify(newCache), "utf8");
    } catch { /* sidecar write fail-soft — emit still proceeds */ }
  }

  emit({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext,
    },
  });
}

main().catch(() => emitEmpty());
