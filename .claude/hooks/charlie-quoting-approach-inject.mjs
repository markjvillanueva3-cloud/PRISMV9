#!/usr/bin/env node
// tier: T2
// charlie-quoting-approach-inject.mjs -- UserPromptSubmit
//
// QUOTING-APPROACH-AUTOFIRE (slot:zulu for charlie, 2026-07-01). The per-PROMPT quoting
// approach-firing surface: when a prompt names a quote/estimate/reconcile/ingest
// operation, surface the SPECIFIC verified cost/pricing contract for that op from
// scripts/lib/quoting-approach-knowledge.mjs (margin-floor deny, units-blended-vs-per-
// unit trap, per-line-vs-per-job FMV grain, customer-vs-machine-name ingest filters).
// Companion to the existing charlie-quoting-{awareness,knowledge}-inject hooks (this one
// fires the new approach LIB; those carry the static digest + prior knowledge surface).
//
// Gate sources are mined-from + verify-arm-PASS against real cost/quote engines + the
// margin-floor hook (see the lib's cites). The 8% margin default + variance-band widths
// are numeric business GAPS, never fired -- the hook surfaces the categorical contract.
//
// Fires when the active slot is `charlie` OR the prompt matches quoting vocabulary.
// Advisory only -- never blocks; any error -> silent {continue:true}.
// Wired via .claude/hooks/bundles/ups-domain-bundle.mjs.
// Knob: PRISM_CHARLIE_QUOTING_APPROACH_DISABLE=1 -> no-op (reversible). PRISM_ROOT -> repo root.

import { readFileSync } from "node:fs";
import { dedupedContext } from "../../scripts/lib/injection-dedup-emit.mjs";

const DISABLE = process.env.PRISM_CHARLIE_QUOTING_APPROACH_DISABLE === "1";
const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const SLOTS_PATH = `${PRISM_ROOT}/state/shared/chat-slots.json`;
const MAX_PROMPT_LEN = 4000;

// Quoting vocabulary -- compound anchors (avoid bare "cost"/"price").
const QUOTE_RE = /\b(quote|estimat|should[\s-]?cost|fair[\s-]?market|\bfmv\b|margin[\s-]?floor|cost[\s-]?index|reconcil|variance[\s-]?band|customer[\s-]?ingest|baseline[\s-]?bootstrap|material[\s-]?cost[\s-]?basis|outbound[\s-]?price)\b/i;

function approve(out) { try { process.stdout.write(JSON.stringify({ continue: true, ...(out || {}) })); } catch { /* fail-safe */ } }
function readStdin() { try { if (process.stdin.isTTY) return null; const raw = readFileSync(0, "utf8"); if (!raw || !raw.trim()) return null; return JSON.parse(raw); } catch { return null; } }
function ownStr(o, k) { if (!o || typeof o !== "object") return null; if (!Object.prototype.hasOwnProperty.call(o, k)) return null; const v = o[k]; return typeof v === "string" ? v : null; }
function extractPrompt(input) { if (!input || typeof input !== "object") return ""; const p = ownStr(input, "prompt") || ownStr(input, "user_prompt") || ownStr(input.hook_input, "prompt") || ""; return typeof p === "string" ? p.slice(0, MAX_PROMPT_LEN) : ""; }
function extractSessionId(input) { if (!input || typeof input !== "object") return ""; return ownStr(input, "session_id") || ownStr(input, "sessionId") || ""; }

export function activeSlotIs(sid, slot, slotsJsonText) {
  if (!sid || typeof sid !== "string") return false;
  let text = slotsJsonText;
  if (text === undefined) { try { text = readFileSync(SLOTS_PATH, "utf8"); } catch { return false; } }
  let j; try { j = JSON.parse(text); } catch { return false; }
  if (!j || typeof j !== "object") return false;
  const expect = "claude-" + sid.slice(0, 8).toLowerCase();
  const slots = (j.slots && typeof j.slots === "object") ? j.slots : j;
  let s = null;
  if (Array.isArray(slots)) s = slots.find((x) => x && (x.name === slot || x.slot === slot)) || null;
  else if (slots && typeof slots === "object") s = slots[slot] || null;
  if (!s || typeof s !== "object") return false;
  const cid = String((s.state && s.state.chatId) || s.chatId || s.claudeId || "").toLowerCase();
  return cid !== "" && cid === expect;
}

export function shouldInject(prompt, sid, slotsJsonText) {
  if (typeof prompt === "string" && QUOTE_RE.test(prompt)) return true;
  return activeSlotIs(sid, "charlie", slotsJsonText);
}

async function main(injected) {
  if (DISABLE) { approve(); return; }
  const input = injected !== undefined ? injected : readStdin();
  if (!input) { approve(); return; }
  const prompt = extractPrompt(input);
  const sid = extractSessionId(input);
  if (!shouldInject(prompt, sid)) { approve(); return; }
  let block = "";
  try {
    const { detectOperations, fireForApproach } = await import("../../scripts/lib/quoting-approach-knowledge.mjs");
    const ops = detectOperations(prompt);
    if (ops.length) {
      const fired = fireForApproach({ operations: ops });
      const lines = [`## 💵 charlie quoting approach firing -- ${ops.join(", ")}`];
      for (const o of fired.operations) {
        const tips = o.gates.slice(0, 4).map((g) => `${g.rule} [${g.cite}]`).join("  ·  ");
        if (tips) lines.push(`- **${o.operation}**: ${tips}`);
      }
      if (lines.length > 1) block = lines.join("\n");
    }
  } catch { /* fail-soft: quoting firing is optional */ }
  if (!block) { approve(); return; }
  approve({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: dedupedContext("charlie-quoting-approach", block, sid) } });
}

export { main };

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())) {
  main().catch(() => approve());
}
