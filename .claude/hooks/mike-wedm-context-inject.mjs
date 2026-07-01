#!/usr/bin/env node
// tier: T2
// mike-wedm-context-inject.mjs -- UserPromptSubmit
//
// WEDM-DOMAIN-AUTOFIRE (slot:zulu for mike, 2026-06-29). The per-PROMPT mike/wedm
// domain-awareness surface -- the sibling of foxtrot-mill / whiskey-lathe /
// echo-post domain hooks, which mike lacked (the documented PSN gap: "mike has no
// per-prompt curated-gate context hook"). Fills it with (1) a static WEDM domain
// digest (galaxy + S(x) gate + constants source + JM Mitsubishi FA-10S + tribal),
// and (2) a TASK-AWARE firing block that surfaces the SPECIFIC verified safety/
// quality gate(s) for the wire-EDM operation(s) the prompt names, conditioned on
// the available controller -- loaded from scripts/lib/wedm-approach-knowledge.mjs.
//
// Gate sources are mined-from + hand-spot-verified-against real WEDM engine code +
// constants + tribal tips (see that lib's header). This hook NEVER inlines a flush/
// recast/clearance/tension constant -- it names the gate + points at
// src/physics/wedm-constants.ts (the #1 safety rule).
//
// Fires when the active slot is `mike` (always-on WEDM context) OR the prompt
// matches WEDM vocabulary (covers any chat doing wire-EDM work). Advisory only --
// never blocks; any error -> silent {continue:true}.
//
// Knob: PRISM_MIKE_WEDM_AWARENESS_DISABLE=1 -> no-op (reversible per
//       feedback_never_delete_only_disable). PRISM_ROOT -> repo root (default H:/prism).

import { readFileSync } from "node:fs";
import { dedupedContext } from "../../scripts/lib/injection-dedup-emit.mjs";

const DISABLE = process.env.PRISM_MIKE_WEDM_AWARENESS_DISABLE === "1";
const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const SLOTS_PATH = `${PRISM_ROOT}/state/shared/chat-slots.json`;
const MAX_PROMPT_LEN = 4000;

// WEDM-domain vocabulary -- HIGH-PRECISION compound/technical anchors only.
const WEDM_RE =
  /\b(wedm|wire[\s-]?edm|wire[\s-]?cut|spark[\s-]?gap|dielectric|wire[\s-]?break|wire[\s-]?tension|taper[\s-]?cut|skim[\s-]?(?:pass|cut)|recast|white[\s-]?layer|flush(?:ing)?|discharge[\s-]?(?:energy|pulse)|kerf|wire[\s-]?guide|threadup|auto[\s-]?wire[\s-]?thread|\bawt\b|mitsubishi[\s-]?fa|fa-?10s|sodick|makino[\s-]?(?:u\d|edge)|agiecut|robocut|brass[\s-]?wire|coated[\s-]?wire|on[\s-]?time|off[\s-]?time)\b/i;

function approve(out) {
  try { process.stdout.write(JSON.stringify({ continue: true, ...(out || {}) })); } catch { /* fail-safe */ }
}

function readStdin() {
  try {
    if (process.stdin.isTTY) return null;
    const raw = readFileSync(0, "utf8");
    if (!raw || !raw.trim()) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function ownStr(o, k) {
  if (!o || typeof o !== "object") return null;
  if (!Object.prototype.hasOwnProperty.call(o, k)) return null;
  const v = o[k];
  return typeof v === "string" ? v : null;
}

function extractPrompt(input) {
  if (!input || typeof input !== "object") return "";
  const p = ownStr(input, "prompt") || ownStr(input, "user_prompt") || ownStr(input.hook_input, "prompt") || "";
  return typeof p === "string" ? p.slice(0, MAX_PROMPT_LEN) : "";
}

function extractSessionId(input) {
  if (!input || typeof input !== "object") return "";
  return ownStr(input, "session_id") || ownStr(input, "sessionId") || "";
}

// Best-effort: is the active chat-slot `mike`? Tolerant of chat-slots.json shape
// drift. chatId is `claude-<first-8-hex-of-session-uuid>`. Any defect -> false.
export function activeSlotIsMike(sid, slotsJsonText) {
  if (!sid || typeof sid !== "string") return false;
  let text = slotsJsonText;
  if (text === undefined) {
    try { text = readFileSync(SLOTS_PATH, "utf8"); } catch { return false; }
  }
  let j;
  try { j = JSON.parse(text); } catch { return false; }
  if (!j || typeof j !== "object") return false;
  const expectChatId = "claude-" + sid.slice(0, 8).toLowerCase();
  let mike = null;
  const slots = (j.slots && typeof j.slots === "object") ? j.slots : j;
  if (Array.isArray(slots)) {
    mike = slots.find((s) => s && (s.name === "mike" || s.slot === "mike")) || null;
  } else if (slots && typeof slots === "object") {
    mike = slots.mike || null;
  }
  if (!mike || typeof mike !== "object") return false;
  const cid = String((mike.state && mike.state.chatId) || mike.chatId || mike.claudeId || "").toLowerCase();
  return cid !== "" && cid === expectChatId;
}

// The WEDM-domain awareness block. Static + cheap. Constants are referenced by
// gate-name + wedm-constants.ts path -- NEVER inlined.
export function buildContext() {
  return [
    "## 🔌 mike WEDM-domain awareness (PRISM_MIKE_WEDM_AWARENESS_DISABLE to silence)",
    "GALAXY: mcp-server/src/engines/wedm/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md -- WEDM is PRISM's deepest domain (brain center + cited discharge gotchas).",
    "S(x) PRE-EMIT GATE (NON-NEGOTIABLE -- WEDMProgramSafetyGateEngine): 7 components -- collision 0.20 + unit_tag 0.10 are MANDATORY (a collision or unit confusion is never acceptable), flush/thermal/deflection/head_clearance 0.15, dialect 0.10. Never emit a WEDM program without it.",
    "CONSTANTS (never inline -- import from src/physics/wedm-constants.ts): WEDM_FLUSH_ADEQUACY (kerf velocity bands) · WEDM_RECAST_MODEL (recast depth) · WEDM_HEAD_CLEARANCE (thickness-band clearance) · WEDM_TAPER_SPEC (wire bow). Live limits: WEDMSafetyEnvelopeEngine (tension/voltage/resistivity/tank/break-rate).",
    "JM WIRE MACHINE: Mitsubishi FA-10S. Dialect + E-code families + M-code sequence: src/data/jm-die-wedm-tech-tables.ts (JM_DIE_MCODE_SEQUENCE). Emit via WEDMPostMitsubishiEngine (a generic dialect alarms/mis-cuts on the FA control).",
    "TRIBAL (auto-fired by op below): src/data/wedm-knowledge-tips.ts (wedm-kb-001..). Top rails: on a break REDUCE on-time before raising tension (kb-001); re-thread a few mm behind the break (kb-003); thick>50mm flushing is the #1 break cause (kb-004); skim Ra plateaus after ~4 passes -- then lap (kb-008).",
    "UNITS-FIRST: resolve G20 inch vs G21 mm from the print/source before any geometry -- a mismatch is a 25.4x scale error (JM convention INCH, still verify per part).",
  ].join("\n");
}

function buildOutput(additionalContext) {
  return { hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext } };
}

export function shouldInject(prompt, sid, slotsJsonText) {
  const keywordHit = typeof prompt === "string" && WEDM_RE.test(prompt);
  if (keywordHit) return true;
  return activeSlotIsMike(sid, slotsJsonText);
}

async function main(injected) {
  if (DISABLE) { approve(); return; }
  const input = injected !== undefined ? injected : readStdin();
  if (!input) { approve(); return; }
  const prompt = extractPrompt(input);
  const sid = extractSessionId(input);
  if (!shouldInject(prompt, sid)) { approve(); return; }
  // TASK-AWARE firing (WEDM-APPROACH-KNOWLEDGE, slot:zulu 2026-06-29): fire the
  // SPECIFIC verified gates for the WEDM op(s) named, conditioned on the controller.
  // GUARDED DYNAMIC import so a failure in the optional lib can NEVER kill the static
  // block above (the arm-C P1 lesson). Fires only when an op is detected -> ~0 tokens otherwise.
  let taskBlock = "";
  try {
    const { detectOperations, fireForApproach } = await import("../../scripts/lib/wedm-approach-knowledge.mjs");
    const ops = detectOperations(prompt);
    if (ops.length) {
      const machines = (prompt.match(/\b(mitsubishi|fa-?10s|sodick|makino|agie|agiecut|robocut|fanuc)\b/gi) || []);
      const fired = fireForApproach({ operations: ops, machines });
      const lines = [`\n\n### 🎯 WEDM approach firing -- ${ops.join(", ")}${fired.controllers.length ? ` (controller: ${fired.controllers.join("/")})` : ""}`];
      for (const o of fired.operations) {
        const tips = o.gates.slice(0, 4).map((g) => `${g.rule} [${g.cite}]`).join("  ·  ");
        if (tips) lines.push(`- **${o.operation}**: ${tips}`);
      }
      if (lines.length > 1) taskBlock = lines.join("\n");
    }
  } catch { /* fail-soft: static WEDM block still ships even if the task-lib breaks */ }
  approve(buildOutput(dedupedContext("mike-wedm-awareness", buildContext() + taskBlock, sid)));
}

export { main };

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())) {
  main().catch(() => approve());
}
