#!/usr/bin/env node
// tier: T2
// foxtrot-mill-awareness-inject.mjs — UserPromptSubmit
//
// FOXTROT-MILL-GALAXY-SYNERGY (operator ask 2026-05-28/29): "make a custom one
// tailored to your domain so you always have context on your domain" + "generate
// skills, scripts and hooks for your domain". The custom mill-domain awareness
// surface for slot:foxtrot — the per-PROMPT sibling of charlie/delta/echo's
// domain-awareness-inject hooks (which foxtrot lacked). Created via the sanctioned
// per-slot-galaxy hook pattern (cf. U-PSGB-CHARLIE charlie-quoting-awareness-inject).
//
// The generic awareness hooks do NOT deliver this for foxtrot:
//   - slot-context-bundle-inject  → thin slot identity (galaxy NAME + brief
//                                    pointer), NOT the prism_mill surface, the 6
//                                    physics gates, or the JM fleet dialects.
//   - tribal-by-domain-inject     → keyword-gated AND has no foxtrot→mill slot
//                                    fallback, so a keyword-less foxtrot prompt
//                                    gets no mill context (reference_foxtrot_tribal_slot_fallback_gap).
//   - pre-edit-galaxy-cascade     → fires on EDITS under engines/mill/, not on
//                                    every prompt.
//
// Fires when the active slot is `foxtrot` (always-on mill context per the
// operator's "always") OR the prompt matches mill vocabulary (covers any chat
// doing mill work). Advisory only — never blocks; any error → silent {continue:true}.
//
// Constants discipline: this hook NEVER inlines a Kienzle/Taylor/material value —
// it names the gate + points at src/physics/constants.ts (the #1 safety rule,
// mirrors delta's "NEVER inline ISO286").
//
// Knob: PRISM_FOXTROT_MILL_AWARENESS_DISABLE=1 → no-op (reversible per
//       feedback_never_delete_only_disable). PRISM_ROOT → repo root (default H:/prism).

import { readFileSync } from "node:fs";
// HIGHVALUE-DISCOVERY #1 (2026-06-08, slot:alpha): session-keyed dedup so the
// static mill block isn't re-injected byte-identically every prompt. Fail-open.
import { dedupedContext } from "../../scripts/lib/injection-dedup-emit.mjs";

const DISABLE = process.env.PRISM_FOXTROT_MILL_AWARENESS_DISABLE === "1";
const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const SLOTS_PATH = `${PRISM_ROOT}/state/shared/chat-slots.json`;
const MAX_PROMPT_LEN = 4000;

// Mill-domain vocabulary — HIGH-PRECISION compound/technical anchors only (scrutiny arm C).
// The slot gate gives foxtrot full context every prompt; this keyword path only needs to catch
// GENUINE mill work in OTHER slots, so bare words that overlap English/dev/networking are excluded.
const MILL_RE =
  /\b(end[\s-]?mill(?:ing|s)?|face[\s-]?mill(?:ing|s)?|ball[\s-]?nose[\s-]?(?:end[\s-]?)?mill|(?:cnc|climb|conventional|slot|peripheral|profile|pocket|ramp|adaptive|trochoidal)[\s-]?milling|milling[\s-]?(?:machine|cutter|tool|toolpath|operation|strateg|spindle|feed|cycle)|chip[\s-]?thinning|radial[\s-]?engagement|trochoidal|kienzle|taylor[\s-]?wear|stability[\s-]?lobe|hyper[\s-]?mill|5[\s-]?axis[\s-]?(?:mill\w*|machin\w*|toolpath\w*|simul\w*|setup|interp\w*|kinematic\w*|rtcp)|spindle[\s-]?(?:speed|load|power|rpm|torque|taper|nose)|hurco|roku[\s-]?roku)\b/i;

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

// Best-effort: is the active chat-slot `foxtrot`? Tolerant of chat-slots.json shape
// drift (object-map {slots:{foxtrot:{...}}} | flat {foxtrot:{...}} | array
// [{name,...}]). chatId is `claude-<first-8-hex-of-session-uuid>`. Any defect →
// false (degrade to keyword-only gate; never throws).
export function activeSlotIsFoxtrot(sid, slotsJsonText) {
  if (!sid || typeof sid !== "string") return false;
  let text = slotsJsonText;
  if (text === undefined) {
    try { text = readFileSync(SLOTS_PATH, "utf8"); } catch { return false; }
  }
  let j;
  try { j = JSON.parse(text); } catch { return false; }
  if (!j || typeof j !== "object") return false;
  const expectChatId = "claude-" + sid.slice(0, 8).toLowerCase();
  let foxtrot = null;
  const slots = (j.slots && typeof j.slots === "object") ? j.slots : j;
  if (Array.isArray(slots)) {
    foxtrot = slots.find((s) => s && (s.name === "foxtrot" || s.slot === "foxtrot")) || null;
  } else if (slots && typeof slots === "object") {
    foxtrot = slots.foxtrot || null;
  }
  if (!foxtrot || typeof foxtrot !== "object") return false;
  const cid = String((foxtrot.state && foxtrot.state.chatId) || foxtrot.chatId || foxtrot.claudeId || "").toLowerCase();
  return cid !== "" && cid === expectChatId;
}

// The mill-domain awareness block. Static + cheap (no file reads beyond the slot
// gate). Reflects the 2026-05-28/29 mill-galaxy synergy ground truth. Constants are
// referenced by gate-name + constants.ts path — NEVER inlined.
export function buildContext() {
  return [
    "## ⚙️ foxtrot mill-domain awareness (PRISM_FOXTROT_MILL_AWARENESS_DISABLE to silence)",
    "GALAXY: mcp-server/src/engines/mill/{CLAUDE,MEMORY,PATHS,TOOLBELT,AWARENESS}.md (130 mill engines). Load all: /mill-galaxy-foxtrot · verify: /galaxy-verify-foxtrot · live counts+gaps: AWARENESS.md (regen scripts/regen-mill-awareness.mjs).",
    "prism_mill SURFACE (route before reimplement — 91 mill_* actions): speed/feed via SpeedFeedOrchestrator triad · mill_lora_* cadence · strategy/toolpath. Secondary: prism_cam · prism_cnc_ops · prism_calc · prism_5axis. MCP-down fallback: node scripts/system-viz-query.mjs find <noun>.",
    "6 PHYSICS GATES (constants imported from src/physics/constants.ts — NEVER inline kc1.1/Taylor):",
    "  1. chip-thinning < 50% radial engagement → effective chip-load mandatory [[feedback_foxtrot_chip_thinning_mandatory]]",
    "  2. tool deflection L³ cantilever — stickout × radial force × modulus first (ToolDeflectionModel)",
    "  3. spindle power ≤ installed HP − 20% headroom [[feedback_foxtrot_spindle_power_headroom]] (prism_safety:validate_physics)",
    "  4. HyperMILL 4-char coolant block breaks Hurco V11 — query post-specific bridge [[feedback_foxtrot_hypermill_coolant_block_hurco]]",
    "  5. trochoidal entry < 90° air-cuts — 90° flat default (TrochoidalEntryAngleValidator)",
    "  6. 5-axis RTCP singularity at A≈0 ∥ Z → MillKinematicsCollisionEngine.detectSingularity() before A<0.5° [[feedback_foxtrot_five_axis_singularity_gate]]",
    "LIVE LANDMINES (R12 — do NOT repeat): ChatterStabilityLobeEngine returns 0 lobes (regression — verify SLD output) [[reference_chatter_engine_regression_2026_05_24]] · operator runs hyperMILL v31 NOT v33 [[reference_hypermill_use_v31_not_v33_2026_05_27]] · never inline constants [[feedback_foxtrot_canonical_constants_import]].",
    "JM MILL FLEET (5): VMC-01 Hurco VM30i WinMAX-v10 · VMC-02 Okuma M460V-5AX OSP-P300MA-H · VMC-03/04 Haas VF-2/OM-2 PRE-NGC · VMC-05 Roku-Roku Fanuc-31i (no registered post — verify). Operators Polish/Spanish-primary — localize operator-facing strings.",
    "MAXIMIZE: node scripts/mill-wiring-audit.mjs (live unwired-mill nodes) · /mill-node-maximize (ROI-ranked wiring candidates). Top HIGH-ROI unwired today: MillingLoRADatasetBuilderEngine, MillTurnLoRADatasetBuilderEngine.",
    "PSN (foxtrot, 11 legs audited 2026-05-28): Obsidian/Memories=OK · prism_mill=OK(87% wired) · Wiki=indexed · Tribal=embed-index live · System-viz=present(graph regen lag) · NN/GNN+LoRA-grading=fleet-deferred(india).",
  ].join("\n");
}

function buildOutput(additionalContext) {
  return { hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext } };
}

export function shouldInject(prompt, sid, slotsJsonText) {
  const keywordHit = typeof prompt === "string" && MILL_RE.test(prompt);
  if (keywordHit) return true;
  return activeSlotIsFoxtrot(sid, slotsJsonText);
}

async function main(injected) {
  if (DISABLE) { approve(); return; }
  const input = injected !== undefined ? injected : readStdin();
  if (!input) { approve(); return; }
  const prompt = extractPrompt(input);
  const sid = extractSessionId(input);
  if (!shouldInject(prompt, sid)) { approve(); return; }
  approve(buildOutput(dedupedContext("foxtrot-mill-awareness", buildContext(), sid)));
}

export { main };

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())) {
  main().catch(() => approve());
}
