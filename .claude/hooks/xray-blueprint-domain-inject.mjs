#!/usr/bin/env node
// tier: T2
// xray-blueprint-domain-inject.mjs — UserPromptSubmit
//
// XRAY-BLUEPRINT-GALAXY-SYNERGY (operator ask 2026-05-29, /goal "compile all
// relevant wiki and tribal knowledge for your domain | wire all relevant files
// and data of your domain for quicker searches and easier utilization :
// wired, validated and auto invoked when needed"). The custom blueprint-vision
// domain-awareness surface for slot:xray — mirrors delta-cad-awareness-inject.
//
// Why the generic hooks don't deliver this for xray:
//   - slot-context-bundle-inject  -> generic slot identity, not the cadDispatcher
//                                    blueprint surface, the confidence gates, or
//                                    the juliett-owned fast-search data stores.
//   - tribal-by-domain-inject     -> surfaces a few tribal hits, not the compiled
//                                    knowledge index + the verified engine names
//                                    (the alpha seed hallucinated 21 of them).
//   - delta-cad-awareness-inject  -> CAD-authoring slant; does NOT carry the
//                                    extraction-pipeline doctrine (split-before-OCR,
//                                    0.70 confidence floor, ground-truth tiers).
//
// Fires when the active slot is `xray` (always-on extraction context) OR the
// prompt matches blueprint/OCR/extraction vocabulary. Advisory only — never
// blocks; any error -> silent {continue:true}.
//
// Knobs: PRISM_XRAY_BLUEPRINT_AWARENESS_DISABLE=1 -> no-op (reversible per
//        feedback_never_delete_only_disable). PRISM_ROOT -> repo root.

import { readFileSync } from "node:fs";
// HIGHVALUE-DISCOVERY #1 (2026-06-08, slot:alpha): session-keyed dedup so the
// static blueprint block isn't re-injected byte-identically every prompt. Fail-open.
import { dedupedContext } from "../../scripts/lib/injection-dedup-emit.mjs";

const DISABLE = process.env.PRISM_XRAY_BLUEPRINT_AWARENESS_DISABLE === "1";
const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const SLOTS_PATH = `${PRISM_ROOT}/state/shared/chat-slots.json`;
const MAX_PROMPT_LEN = 4000;

// Blueprint/OCR/extraction vocabulary. Word-boundary anchored; case-insensitive.
const BLUEPRINT_RE =
  /\b(blueprint|ocr|pdf|multi[\s-]?print|docustrata|pmi|gd&?t|fcf|datum|tolerance|callout|feature[\s-]?recognition|cad[\s-]?extract|print[\s-]?to[\s-]?(program|cad|inspection)|step|iges|dxf|dwg|sldprt|ipt|fcstd|f3d|f3z|stl|extraction|deskew|title[\s-]?block)\b/i;

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

// Best-effort: is the active chat-slot `xray`? Tolerant of chat-slots.json shape
// drift (object-map {slots:{xray:{...}}} | flat {xray:{...}} | array
// [{name,...}]). chatId is `claude-<first-8-hex-of-session-uuid>`. Any defect ->
// false (degrade to keyword-only gate; never throws).
export function activeSlotIsXray(sid, slotsJsonText) {
  if (!sid || typeof sid !== "string") return false;
  let text = slotsJsonText;
  if (text === undefined) {
    try { text = readFileSync(SLOTS_PATH, "utf8"); } catch { return false; }
  }
  let j;
  try { j = JSON.parse(text); } catch { return false; }
  if (!j || typeof j !== "object") return false;
  const expectChatId = "claude-" + sid.slice(0, 8).toLowerCase();
  let xray = null;
  const slots = (j.slots && typeof j.slots === "object") ? j.slots : j;
  if (Array.isArray(slots)) {
    xray = slots.find((s) => s && (s.name === "xray" || s.slot === "xray")) || null;
  } else if (slots && typeof slots === "object") {
    xray = slots.xray || null;
  }
  if (!xray || typeof xray !== "object") return false;
  const cid = String(
    (xray.state && xray.state.chatId) || xray.chatId || xray.claudeId || "",
  ).toLowerCase();
  return cid !== "" && cid === expectChatId;
}

// The blueprint-vision domain-awareness block. Static + cheap (no file reads
// beyond the slot gate). Reflects the 2026-05-29 U-PSGB-XRAY verified ground
// truth. Points at the compiled knowledge index for any deep dive.
export function buildContext() {
  return [
    "## 🔷 xray blueprint-vision domain awareness (PRISM_XRAY_BLUEPRINT_AWARENESS_DISABLE to silence)",
    "KNOWLEDGE-INDEX (all wiki+tribal+memories+stores compiled, /wiki-query): [[blueprint-vision-knowledge-index]] — the single deep-dive entry point.",
    "TOP ENGINES (verified on-disk; the alpha seed named 21 PHANTOM CAD*Engine classes — VERIFY any name): BlueprintVisionOCREngine (primary OCR) · PDFBlueprintDimensionExtractorEngine (cad_pdf_blueprint_extract) · PDFBlueprintPatternRescueEngine · GDTCalloutParserEngine + PrismEnhancedGDTEngine + FCFSyntaxValidatorEngine · DXFGeometryParserEngine · FCStdNativeParserEngine · F3DSQLiteParserEngine · STLToVoxelGridEngine · BlueprintProgramJoinEngine · GroundTruth{Registry,Validation}Engine · PrintToProgramPipelineEngine · PrintToCADOrchestratorEngine · CADClassFeatureLibraryEngine.",
    "PRIMARY SURFACE (route before reimplement): cadDispatcher ~40 actions — cad_pdf_blueprint_extract · cad_pdf_pattern_rescue_extract · cad_gdt_callout_parse · cad_fcf_validate · cad_tolerance_* · cad_dxf_geom_parse · cad_fcstd_parse · cad_f3d_parse · cad_stl_analyze · feature_recognize · blueprint_rag_* · blueprint_lora_*. Also businessDispatcher:blueprint_to_quote · camDispatcher:print_to_program_full · {session,resourceExtraction}Dispatcher:ocr_*.",
    "PROTOCOL: GSD_BLUEPRINT_VISION.md (8-stage SOP). Galaxy: mcp-server/src/engines/blueprint-vision/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md. Skill: /extract-xray.",
    "FAST SEARCH = juliett's stores (R8 — SEARCH the paid-for extraction, NEVER re-OCR 257K PDFs): mcp-server/data/jm-die-database/ (manifest.json + .index/*.jsonl, 257,992 files) · H:/PRISM/Docustrata/.index/jm-die-index-v2.json · Qdrant collections (tribal/wiki embeddings). Dedup vs state/shared/blueprint-accuracy-events.jsonl.",
    "VERIFIED GATES (NOT seed's 0.85/0.95/0.99): OCR per-field floor 0.70 -> operator-confirm · CAD-fidelity <0.85 flag · safety S(x)>=0.98 · blueprint-accuracy-guard HARD-BLOCKS >20% conformal-bound drift. [[reference_xray_confidence_thresholds_reconciled]]",
    "KNOWN FAILURES — do NOT repeat (R12): (1) verify-engine-name-on-disk (21 seed phantoms) [[feedback_xray_verify_engine_name_before_reference]]; (2) split multi-print BEFORE OCR, one object/print [[feedback_xray_multi_print_split_before_ocr]]; (3) normalize to mm — JM STEP is INCH; (4) tie every FCF to datum-3-2-1; (5) cross-check geometry-volume-vs-file-size (silent-empty-parse guard); (6) NO native reader for SAT/OBJ/FBX/X_T; (7) '96%'=multi-PAGE not container-split (8,154->36,638).",
    "PSN (xray): produces->delta/cad·kilo/cam·charlie/quote·india/training · fast-search-store->juliett/database-expansion (jm-die-database+docustrata+Qdrant) · infra->lima/pdf-corpus.",
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
  const keywordHit = typeof prompt === "string" && BLUEPRINT_RE.test(prompt);
  if (keywordHit) return true;
  return activeSlotIsXray(sid, slotsJsonText);
}

async function main(injected) {
  if (DISABLE) { approve(); return; }
  const input = injected !== undefined ? injected : readStdin();
  if (!input) { approve(); return; }
  const prompt = extractPrompt(input);
  const sid = extractSessionId(input);
  if (!shouldInject(prompt, sid)) { approve(); return; }
  approve(buildOutput(dedupedContext("xray-blueprint-domain", buildContext(), sid)));
}

export { main };

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())) {
  main().catch(() => approve());
}
