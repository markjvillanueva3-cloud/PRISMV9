#!/usr/bin/env node
// tier: T2
// kilo-cam-context-inject.mjs -- UserPromptSubmit
//
// CAM-DOMAIN-AUTOFIRE (slot:zulu for kilo, 2026-06-29). The per-PROMPT kilo/cam
// domain-awareness surface -- the sibling of foxtrot-mill / whiskey-lathe /
// echo-post / mike-wedm domain hooks, which kilo lacked (the documented PSN gap:
// "kilo/cam has NO domain-inject hook at all" -- SIX-DOMAIN-KNOWLEDGE-AUTOPULL B2).
// Fills it with (1) a static CAM domain digest (galaxy + prism_cam triad + strategy
// router + vendor safety + tier-1 bridges + constants), and (2) a TASK-AWARE firing
// block that surfaces the SPECIFIC verified gate(s) for the CAM operation(s) the
// prompt names, conditioned on the CAM system -- from scripts/lib/cam-approach-knowledge.mjs.
//
// Gate sources are mined-from + hand-spot-verified-against real CAM engine code
// (BatchCAMSafetyEngines.ts, AdaptiveToolpathRouterEngine.ts, CollisionDetectionEngine,
// camDispatcher, cam SOUL). This hook NEVER inlines a kc1.1/scallop/clearance
// constant -- it names the gate + points at the engine / src/physics/constants.ts.
//
// Fires when the active slot is `kilo` (always-on CAM context) OR the prompt matches
// CAM vocabulary. Advisory only -- never blocks; any error -> silent {continue:true}.
//
// Wired via .claude/hooks/bundles/ups-domain-bundle.mjs (already settings-wired) --
// no individual settings.json entry (B2: extend the wired bundle, R8).
//
// Knob: PRISM_KILO_CAM_AWARENESS_DISABLE=1 -> no-op (reversible). PRISM_ROOT -> repo root.

import { readFileSync } from "node:fs";
import { dedupedContext } from "../../scripts/lib/injection-dedup-emit.mjs";

const DISABLE = process.env.PRISM_KILO_CAM_AWARENESS_DISABLE === "1";
const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const SLOTS_PATH = `${PRISM_ROOT}/state/shared/chat-slots.json`;
const MAX_PROMPT_LEN = 4000;

// CAM-domain vocabulary -- HIGH-PRECISION compound/technical anchors only (avoid bare
// words that overlap English/dev). "post-processor" is echo's domain, excluded here.
const CAM_RE =
  /\b(cam[\s-]?(?:strategy|toolpath|operation|program|kernel|system)|tool[\s-]?path|adaptive[\s-]?(?:clear|rough)|rest[\s-]?machin|gouge[\s-]?(?:check|protect)|collision[\s-]?check|scallop|cusp[\s-]?height|swarf|3\s?\+\s?2|mastercam|hyper[\s-]?mill|fusion[\s-]?360|powermill|\bcatia\b|esprit|inventor[\s-]?hsm|cam_(?:strategy|toolpath|safety|material|multiaxis)|trochoidal|stepover|stepdown)\b/i;

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

// Best-effort: is the active chat-slot `kilo`? Tolerant of chat-slots.json shape drift.
export function activeSlotIsKilo(sid, slotsJsonText) {
  if (!sid || typeof sid !== "string") return false;
  let text = slotsJsonText;
  if (text === undefined) {
    try { text = readFileSync(SLOTS_PATH, "utf8"); } catch { return false; }
  }
  let j;
  try { j = JSON.parse(text); } catch { return false; }
  if (!j || typeof j !== "object") return false;
  const expectChatId = "claude-" + sid.slice(0, 8).toLowerCase();
  let kilo = null;
  const slots = (j.slots && typeof j.slots === "object") ? j.slots : j;
  if (Array.isArray(slots)) {
    kilo = slots.find((s) => s && (s.name === "kilo" || s.slot === "kilo")) || null;
  } else if (slots && typeof slots === "object") {
    kilo = slots.kilo || null;
  }
  if (!kilo || typeof kilo !== "object") return false;
  const cid = String((kilo.state && kilo.state.chatId) || kilo.chatId || kilo.claudeId || "").toLowerCase();
  return cid !== "" && cid === expectChatId;
}

// The CAM-domain awareness block. Static + cheap. Constants referenced by name +
// path -- NEVER inlined.
export function buildContext() {
  return [
    "## 🛠️ kilo CAM-domain awareness (PRISM_KILO_CAM_AWARENESS_DISABLE to silence)",
    "GALAXY: mcp-server/src/engines/cam/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md (289 cam engines, 703 cam_ actions). Tribal: state/shared/cam-tribal-corpus.jsonl (809 tips).",
    "prism_cam TRIAD (route before reimplement): cam_strategy_recommend -> toolpath_generate -> collision_check_full. collision_check_full is MANDATORY + returns a CollisionResult struct (has_collision + minimum_clearance_mm), not a bare boolean. cam_safety_validate Omega/S(x) before any commit.",
    "SOUL REFUSE (non-negotiable): never emit a toolpath without collision_check_full passing; never bypass feedrate limits; never export an unverified fixture/WCS orientation.",
    "STRATEGY ROUTER (AdaptiveToolpathRouterEngine.ROUTING_RULES): TGAR thermal-rough (ISO S/H/M) · VCER chip-evac deep pockets · HRAF vibration-finish thin walls · PTDC deflection-finish deep cavity · PARETO tight-tolerance finish. cam_material_map (ISO group) MUST precede strategy.",
    "VENDOR SAFETY (BatchCAMSafetyEngines -- fires per CAM system): NX (tool-axis gouge + IPW regen + FBM validate) · PowerMill (collision + gouge-protect + 5-axis block clearance) · CATIA (part-op validate + offset safety).",
    "TIER-1 BRIDGES (priority): Fusion 360 > hyperMILL (operator runs v31 NOT v33) > Mastercam (X8) > Esprit; + Inventor HSM, SolidWorks. UNITS-FIRST: Fusion API unit is cm (the 2.54 trap) -- resolve inch/mm from the source; a mismatch is a 25.4x scale error.",
    "CONSTANTS (never inline): kc1.1/Taylor from src/physics/constants.ts (H-group kc1.1=3200); feed/speed from cam_speedfeed_compute.",
  ].join("\n");
}

function buildOutput(additionalContext) {
  return { hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext } };
}

export function shouldInject(prompt, sid, slotsJsonText) {
  const keywordHit = typeof prompt === "string" && CAM_RE.test(prompt);
  if (keywordHit) return true;
  return activeSlotIsKilo(sid, slotsJsonText);
}

async function main(injected) {
  if (DISABLE) { approve(); return; }
  const input = injected !== undefined ? injected : readStdin();
  if (!input) { approve(); return; }
  const prompt = extractPrompt(input);
  const sid = extractSessionId(input);
  if (!shouldInject(prompt, sid)) { approve(); return; }
  // TASK-AWARE firing (CAM-APPROACH-KNOWLEDGE, slot:zulu 2026-06-29): fire the SPECIFIC
  // verified gates for the CAM op(s) named, conditioned on the CAM system. GUARDED
  // DYNAMIC import so a failure in the optional lib can NEVER kill the static block.
  let taskBlock = "";
  try {
    const { detectOperations, fireForApproach } = await import("../../scripts/lib/cam-approach-knowledge.mjs");
    const ops = detectOperations(prompt);
    if (ops.length) {
      const camSystems = (prompt.match(/\b(nx|powermill|catia|fusion|hypermill|hyper mill|mastercam|esprit|inventor hsm|solidworks)\b/gi) || []);
      const fired = fireForApproach({ operations: ops, camSystems });
      const lines = [`\n\n### 🎯 CAM approach firing -- ${ops.join(", ")}${fired.camSystems.length ? ` (system: ${fired.camSystems.join("/")})` : ""}`];
      for (const o of fired.operations) {
        const tips = o.gates.slice(0, 4).map((g) => `${g.rule} [${g.cite}]`).join("  ·  ");
        if (tips) lines.push(`- **${o.operation}**: ${tips}`);
      }
      if (lines.length > 1) taskBlock = lines.join("\n");
    }
  } catch { /* fail-soft: static CAM block still ships even if the task-lib breaks */ }
  approve(buildOutput(dedupedContext("kilo-cam-awareness", buildContext() + taskBlock, sid)));
}

export { main };

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())) {
  main().catch(() => approve());
}
