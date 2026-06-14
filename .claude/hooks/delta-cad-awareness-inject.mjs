#!/usr/bin/env node
// tier: T2
// delta-cad-awareness-inject.mjs — UserPromptSubmit
//
// DELTA-CAD-GALAXY-SYNERGY (operator ask 2026-05-28, session f27ecf49):
// "make a custom one tailored to your domain so you always have context on
//  your domain". The custom CAD-domain awareness surface for slot:delta.
//
// The generic awareness hooks do NOT deliver this for delta:
//   - slot-context-bundle-inject     → generic slot identity, not the prism_cad
//                                       action surface or the toolchain CLIs.
//   - tribal-by-domain-inject        → WIRED but structurally empty for CAD
//                                       (TRIBAL_TIP_INDEX.json has 0 cad tips —
//                                       audit 2026-05-28). So this hook hard-codes
//                                       the load-bearing known-failures as the
//                                       interim bridge until the tribal store fills.
//   - galaxy-cascade-backfill        → points at engines/cad/MEMORY.md but does
//                                       not surface the regen state-file paths or
//                                       the corpus location.
//
// Fires when the active slot is `delta` (always-on CAD context per the operator's
// "always") OR the prompt matches CAD vocabulary (covers any chat doing CAD work).
// Advisory only — never blocks; any error → silent {continue:true}.
//
// Knob: PRISM_DELTA_CAD_AWARENESS_DISABLE=1  → no-op (reversible per
//       feedback_never_delete_only_disable).
//       PRISM_ROOT  → repo root (default H:/prism).

import { readFileSync } from "node:fs";
// HIGHVALUE-DISCOVERY #1 (2026-06-08, slot:alpha): session-keyed dedup so the
// static CAD block isn't re-injected byte-identically every prompt. Fail-open.
import { dedupedContext } from "../../scripts/lib/injection-dedup-emit.mjs";

const DISABLE = process.env.PRISM_DELTA_CAD_AWARENESS_DISABLE === "1";
const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const SLOTS_PATH = `${PRISM_ROOT}/state/shared/chat-slots.json`;
const MAX_PROMPT_LEN = 4000;

// CAD-domain vocabulary. Word-boundary anchored; case-insensitive.
const CAD_RE =
  /\b(cad|step|iges|dxf|dwg|electrode|trilobe|brep|topology|archetype|regen|taptite|sinker|tessellat|feature[\s-]?recognition|gd&?t|tolerance|fusion|solidworks|inventor|hypercad|freecad|mastercam|cadquery|blueprint|impeller|blisk)\b/i;

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

// Best-effort: is the active chat-slot `delta`? Tolerant of chat-slots.json
// shape drift (object-map {slots:{delta:{...}}} | flat {delta:{...}} | array
// [{name,...}]). chatId is `claude-<first-8-hex-of-session-uuid>`; match on
// that. Any defect → false (degrade to keyword-only gate; never throws).
export function activeSlotIsDelta(sid, slotsJsonText) {
  if (!sid || typeof sid !== "string") return false;
  let text = slotsJsonText;
  if (text === undefined) {
    try { text = readFileSync(SLOTS_PATH, "utf8"); } catch { return false; }
  }
  let j;
  try { j = JSON.parse(text); } catch { return false; }
  if (!j || typeof j !== "object") return false;
  const expectChatId = "claude-" + sid.slice(0, 8).toLowerCase();
  // resolve the delta slot record across shape variants
  let delta = null;
  const slots = (j.slots && typeof j.slots === "object") ? j.slots : j;
  if (Array.isArray(slots)) {
    delta = slots.find((s) => s && (s.name === "delta" || s.slot === "delta")) || null;
  } else if (slots && typeof slots === "object") {
    delta = slots.delta || null;
  }
  if (!delta || typeof delta !== "object") return false;
  const cid = String(
    (delta.state && delta.state.chatId) || delta.chatId || delta.claudeId || "",
  ).toLowerCase();
  return cid !== "" && cid === expectChatId;
}

// The CAD-domain awareness block. Static + cheap (no file reads beyond the slot
// gate). Reflects the 2026-05-28 synergy-audit ground truth.
export function buildContext() {
  return [
    "## 🔶 delta CAD-domain awareness (PRISM_DELTA_CAD_AWARENESS_DISABLE to silence)",
    "TOP CAD ENGINES (src/engines/ + src/engines/cad/): CADKernelEngine · GeometryEngine · MeshEngine · BRepTessellatorEngine · CollisionDetectionEngine(SAFETY) · CADFeatureRecognitionEngine · CADAssemblyGraphEngine · BlueprintToCADGenerationEngine · CADToSTEPPipelineEngine · BliskCADEngine",
    "prism_cad SURFACE (route before reimplement): feature_recognize · geometry_create · mesh_generate · cad_step_parse · cad_regen · assembly_analyze (cadDispatcher 564 · cadAutomation 367 · cadDrawingKnowledge 11 · cadRegression 37)",
    "TOOLCHAIN CLIs (run from H:/prism-slot-delta): /cad-electrode-delta (analyze-STEP / replicate-at-dims / parametric-trilobe) · scripts/cad-analyze-step.mjs · scripts/cad-generate-stepped-trilobe-cli.mjs · /cad-to-desktop · /cad-regen",
    "STATE + CORPUS: state/shared/cad-regen-output/ (per-slug source/regen/compare) · cad-action-templates/ (14 *.actions.json) · cad-feature-templates/INDEX.json · cad-tribal-corpus.jsonl (21 entries — delta's live CAD tribal store) · JM ref H:/PRISM/JM DIE/_PART LIBRARY/JM EXAMPLE PARTS/trilobe-example.step (ABSENT here → 8 roundtrip tests skip-loud, env PRISM_JM_TRILOBE_STEP)",
    "KNOWN FAILURES — do NOT repeat (R12):",
    "  1. archetype MATCH before SCALE — scaling a single-section ref to a two-section target is wrong topology [[reference_delta_archetype_match_before_scale]]",
    "  2. STEP units are INCH (CONVERSION_BASED_UNIT 25.4mm), NOT mm — JM convention [[reference_delta_step_inch_unit_convention]]",
    "  3. NEVER emit malformed periodic B-spline (silent Fusion blank doc); use the proven multi-prism emitter [[reference_delta_bspline_periodic_regression]] · [[reference_delta_proven_step_emitter]]",
    "  4. topology BEFORE tolerance; NEVER inline ISO286 fits [[feedback_delta_topology_before_tolerance]] · [[feedback_delta_no_inline_iso286]]",
    "  5. sinker-EDM electrode spark gap = -.003in total (-.0015/side) — bake into geometry [[reference_delta_jm_spark_gap_convention]]",
    "GALAXY: mcp-server/src/engines/cad/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md · wiki architecture/{cad-galaxy,cad-step-toolchain,cad-electrode-generation}",
    "KNOWLEDGE-INDEX (all CAD wiki+tribal compiled, /wiki-query): [[cad-knowledge-index]] — points to lessons/[[cad-step-failure-modes]] · reference/[[cad-file-format-readers]] · reference/[[cad-corpus-paths]] · GSD mcp-server/data/docs/gsd/CAD_GSD.md · 88 engine wiki entries · tribal cad-tribal-corpus(21)+cad-tribal-delta(6)",
    "CORPUS PATHS (129,306 CAD/print files): prints=H:/PRISM/JM DIE + resources/{1,2,3-Basic Training Day,RESOURCE PDFS} · CAD files=H:/PRISM/resources/CAD FILES (regen set) · seats=MasterCam/mcamX8/compressed (X8 RUNNING) + HYPERMILL/31.0 (v31 RUNNING, NOT v33) + Freecad/bin · full map [[cad-corpus-paths]]",
    "PSN SYNERGY (delta, audited 2026-05-28): Obsidian/Memories=OK · prism_cad=OK · Wiki=indexed · Tribal=21-entry corpus live (fleet inject-store TRIBAL_TIP_INDEX.json absent) · System-viz=pending-golf-merge+regen · NN/GNN=fleet-deferred(india)",
  ].join("\n");
}

function buildOutput(additionalContext) {
  return {
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext,
    },
  };
}

export function shouldInject(prompt, sid, slotsJsonText) {
  const keywordHit = typeof prompt === "string" && CAD_RE.test(prompt);
  if (keywordHit) return true;
  return activeSlotIsDelta(sid, slotsJsonText);
}

async function main(injected) {
  if (DISABLE) { approve(); return; }
  const input = injected !== undefined ? injected : readStdin();
  if (!input) { approve(); return; }
  const prompt = extractPrompt(input);
  const sid = extractSessionId(input);
  if (!shouldInject(prompt, sid)) { approve(); return; }
  approve(buildOutput(dedupedContext("delta-cad-awareness", buildContext(), sid)));
}

export { main };

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())) {
  main().catch(() => approve());
}
