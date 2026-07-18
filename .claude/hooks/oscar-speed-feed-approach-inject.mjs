#!/usr/bin/env node
// tier: T2
// oscar-speed-feed-approach-inject.mjs -- UserPromptSubmit
//
// SFC-APPROACH-AUTOFIRE (slot:zulu for oscar, 2026-07-01). The per-PROMPT speed-feed
// approach-firing surface: when a prompt names a speed/feed operation, surface the
// SPECIFIC verified SFC law/gate(s) for that op from scripts/lib/speed-feed-approach-
// knowledge.mjs (Kienzle/Taylor/RPM laws, radial-engagement MRR, tool-clamp parity,
// spindle knee-curve). Sibling of the kilo-cam / mike-wedm approach hooks; the four
// greenfield domains (speed-feed/academy/business/quoting) previously had NO auto-pull
// firing surface for their new approach libs -- this closes speed-feed's.
//
// Gate sources are mined-from + verify-arm-PASS against real SFC engine code (see the
// lib's cites). This hook NEVER inlines a kc1.1/Taylor constant -- it names the gate +
// points at the engine / src/physics/constants.ts.
//
// Fires when the active slot is `oscar` OR the prompt matches SFC vocabulary. Advisory
// only -- never blocks; any error -> silent {continue:true}.
// Wired via .claude/hooks/bundles/ups-domain-bundle.mjs.
// Knob: PRISM_OSCAR_SFC_AWARENESS_DISABLE=1 -> no-op (reversible). PRISM_ROOT -> repo root.

import { readFileSync } from "node:fs";
import { dedupedContext } from "../../scripts/lib/injection-dedup-emit.mjs";

const DISABLE = process.env.PRISM_OSCAR_SFC_AWARENESS_DISABLE === "1";
const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const SLOTS_PATH = `${PRISM_ROOT}/state/shared/chat-slots.json`;
const MAX_PROMPT_LEN = 4000;

// SFC vocabulary -- high-precision compound anchors (avoid bare "speed"/"feed").
const SFC_RE = /\b(speed[\s-]?(?:and|&|\/)?[\s-]?feed|feed[\s-]?rate|feeds?[\s-]?(?:and|&)[\s-]?speeds?|\bsfm\b|chip[\s-]?load|cutting[\s-]?speed|\bmrr\b|\bsfc\b|kienzle|taylor[\s-]?tool[\s-]?life|spindle[\s-]?power|nine[\s-]?axis)\b/i;

function approve(out) { try { process.stdout.write(JSON.stringify({ continue: true, ...(out || {}) })); } catch { /* fail-safe */ } }
function readStdin() { try { if (process.stdin.isTTY) return null; const raw = readFileSync(0, "utf8"); if (!raw || !raw.trim()) return null; return JSON.parse(raw); } catch { return null; } }
function ownStr(o, k) { if (!o || typeof o !== "object") return null; if (!Object.prototype.hasOwnProperty.call(o, k)) return null; const v = o[k]; return typeof v === "string" ? v : null; }
function extractPrompt(input) { if (!input || typeof input !== "object") return ""; const p = ownStr(input, "prompt") || ownStr(input, "user_prompt") || ownStr(input.hook_input, "prompt") || ""; return typeof p === "string" ? p.slice(0, MAX_PROMPT_LEN) : ""; }
function extractSessionId(input) { if (!input || typeof input !== "object") return ""; return ownStr(input, "session_id") || ownStr(input, "sessionId") || ""; }

// Best-effort: is the active chat-slot the given slot? Tolerant of chat-slots.json shape drift.
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
  if (typeof prompt === "string" && SFC_RE.test(prompt)) return true;
  return activeSlotIs(sid, "oscar", slotsJsonText);
}

async function main(injected) {
  if (DISABLE) { approve(); return; }
  const input = injected !== undefined ? injected : readStdin();
  if (!input) { approve(); return; }
  const prompt = extractPrompt(input);
  const sid = extractSessionId(input);
  if (!shouldInject(prompt, sid)) { approve(); return; }
  // GUARDED dynamic import so a failure in the optional lib can never wedge the prompt.
  let block = "";
  try {
    const { detectOperations, fireForApproach } = await import("../../scripts/lib/speed-feed-approach-knowledge.mjs");
    const ops = detectOperations(prompt);
    if (ops.length) {
      const fired = fireForApproach({ operations: ops });
      const lines = [`## 🧮 oscar SFC approach firing -- ${ops.join(", ")}`];
      for (const o of fired.operations) {
        const tips = o.gates.slice(0, 4).map((g) => `${g.rule} [${g.cite}]`).join("  ·  ");
        if (tips) lines.push(`- **${o.operation}**: ${tips}`);
      }
      if (lines.length > 1) block = lines.join("\n");
    }
  } catch { /* fail-soft: SFC firing is optional */ }
  if (!block) { approve(); return; }
  approve({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: dedupedContext("oscar-sfc-approach", block, sid) } });
}

export { main };

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())) {
  main().catch(() => approve());
}
