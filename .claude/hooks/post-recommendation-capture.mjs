#!/usr/bin/env node
// tier: T3
/**
 * post-recommendation-capture.mjs — PostToolUse hook for U-LEARN-01.
 *
 * Claude Code fires this after every MCP dispatcher call. We sniff the tool
 * name + response payload for recommendation-shaped output and auto-emit a
 * `recommendation_emitted` event to the OutcomeCaptureBus so every AI
 * suggestion gets a lineage_id that later override/measurement/scrap
 * events can tie back to — without every studio engine having to call
 * the bus by hand.
 *
 * Covers the six canonical domains:
 *   mill         — prism_cam, prism_cnc_ops, prism_machining_kb, prism_calc
 *   lathe        — prism_turning, prism_turning_program
 *   wedm         — prism_edm (wedm_* actions), prism_toolpath (wedm)
 *   sinker_edm   — prism_edm (sinker_*)
 *   grinder      — prism_grinding
 *   welder       — prism_welding
 *
 * Design notes:
 *   - Best effort. Never blocks the tool call. Hook exits {continue:true}
 *     always (even on error) so a bus-write failure cannot stall work.
 *   - Idempotent per tool_use_id: Claude Code calls PostToolUse once per
 *     tool use, so no dedup state needed.
 *   - Runs fully offline — spawns a tiny child Node that imports the
 *     OutcomeCaptureBusEngine singleton and calls record().
 *
 * @milestone PSAU P2.5-LEARN U-LEARN-01
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import process from "node:process";

const OUTCOMES_DIR = "H:/prism/state/outcomes";
const SCHEMA_VERSION = "1.0.0";

// ─────────────────────────────────────────────────────────────────────────
// Domain classifier — maps dispatcher name + action prefix onto the six
// canonical outcome domains.
// ─────────────────────────────────────────────────────────────────────────

const DOMAIN_RULES = [
  // WEDM vs SINKER EDM are disambiguated by action prefix on the same dispatcher.
  { pattern: /prism_edm$/,                 actionMatch: /^(wedm_|wire_edm)/, domain: "wedm" },
  { pattern: /prism_edm$/,                 actionMatch: /^(sinker_|micro_edm)/, domain: "sinker_edm" },
  { pattern: /prism_edm$/,                 actionMatch: /^(laser_)/,         domain: "laser" },
  { pattern: /prism_edm$/,                 actionMatch: /^(waterjet_)/,      domain: "waterjet" },
  { pattern: /prism_edm$/,                 actionMatch: null,                domain: "wedm" },  // default for prism_edm

  { pattern: /prism_turning(_program)?$/,  actionMatch: null,                domain: "lathe" },
  { pattern: /prism_grinding$/,            actionMatch: null,                domain: "grinder" },
  { pattern: /prism_welding$/,             actionMatch: null,                domain: "welder" },

  { pattern: /prism_5axis$/,               actionMatch: null,                domain: "five_axis" },
  { pattern: /prism_cad(_\w+)?$/,          actionMatch: null,                domain: "cad" },
  { pattern: /prism_quality$/,             actionMatch: null,                domain: "quality" },
  { pattern: /prism_business$/,            actionMatch: /(quote|billing|invoice)/, domain: "quote" },
  { pattern: /prism_business$/,            actionMatch: /scheduling_/,       domain: "schedule" },
  { pattern: /prism_scheduling$/,          actionMatch: null,                domain: "schedule" },
  { pattern: /prism_automation$/,          actionMatch: null,                domain: "shop_floor" },

  // Milling, CNC ops, CAM strategy, machining knowledge — all roll up to mill
  { pattern: /prism_(cam|cnc_ops|machining_kb|calc|toolpath|hole_pattern|threading_pipeline|multiaxis_program|secondary_ops)$/, actionMatch: null, domain: "mill" },
];

function classifyDomain(toolName, action) {
  const short = toolName.replace(/^mcp__prism__/, "");
  for (const rule of DOMAIN_RULES) {
    if (!rule.pattern.test(short)) continue;
    if (rule.actionMatch && !rule.actionMatch.test(String(action || ""))) continue;
    return rule.domain;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────
// Recommendation sniffer — heuristic detector for "this response contains a
// recommendation the operator might later override or a measurement might
// later disagree with." Conservative: unknown shapes don't emit.
// ─────────────────────────────────────────────────────────────────────────

const RECOMMENDATION_SHAPES = [
  "recommended", "recommendation", "suggested", "strategy", "parameters",
  "speed_feed", "rpm", "sfm", "ipr", "ipm", "feed_per_tooth", "chip_load",
  "depth_of_cut", "width_of_cut", "stepover", "stepdown",
  "power", "servo", "gap_voltage", "wire_tension",
  "tool_selection", "insert_selection", "holder_selection",
  "cycle_time", "estimated_time",
  "quote_price", "quoted_price",
];

function extractRecommendation(payload) {
  if (!payload || typeof payload !== "object") return null;

  // Walk top two levels looking for any recommendation-shaped key.
  const hits = {};
  for (const [k, v] of Object.entries(payload)) {
    if (RECOMMENDATION_SHAPES.includes(k)) hits[k] = v;
  }
  // Look one level deeper (typical dispatcher wraps: { success, result: {...} })
  const inner = payload.result ?? payload.data ?? payload.output;
  if (inner && typeof inner === "object") {
    for (const [k, v] of Object.entries(inner)) {
      if (RECOMMENDATION_SHAPES.includes(k)) hits[k] = v;
    }
  }

  if (Object.keys(hits).length === 0) return null;
  return hits;
}

// ─────────────────────────────────────────────────────────────────────────
// Determining-input extractor (U-OUTCOME-INPUT-CAPTURE, slot:india 2026-06-30).
//
// THE GAP THIS CLOSES: this hook had the dispatcher's `tool_input` (material,
// tool, operation, ...) in hand but wrote ONLY {engine, action, hook} to the
// event context. So every lathe/sinker/grinder/welder/cad recommendation it
// captured was born input-barren -> the outcome->LoRA SFT converter
// (scripts/lib/outcome-to-alpaca-converter.mjs, INPUT_KEYS gate) found NO
// determining inputs and converted them to ZERO learnable pairs (live: lathe
// 3,459 + sinker_edm 1,231 + grinder/welder/cad all skipped). Surfacing the
// inputs the hook ALREADY holds makes those captures SFT-learnable -- one fix,
// every domain this hook covers.
//
// Maps the wide variety of dispatcher param spellings onto the converter's
// context vocabulary (material / tool_id / operation / feature / machine_id /
// process). Extras (iso / tool_material / tool_diameter_mm) are harmless when a
// consumer doesn't read them and are ready for a converter that extends its
// input keys. Best-effort + scalar-only, matching the hook's never-throw
// contract: an absent input simply isn't surfaced (no degenerate value).
// ─────────────────────────────────────────────────────────────────────────

const DETERMINING_INPUT_ALIASES = {
  material:         ["material", "material_name", "materialName", "workpiece_material", "stock_material"],
  tool_id:          ["tool_id", "toolId", "tool", "tool_name", "toolName", "tool_number", "cutter", "insert"],
  operation:        ["operation", "op", "operation_type", "operationType", "cut_type", "cutType"],
  feature:          ["feature", "feature_type", "featureType", "feature_name"],
  machine_id:       ["machine_id", "machineId", "machine", "machine_name"],
  process:          ["process", "process_type", "processType"],
  iso:              ["iso", "iso_group", "isoGroup", "material_group"],
  tool_material:    ["tool_material", "toolMaterial", "insert_material"],
  tool_diameter_mm: ["tool_diameter_mm", "tool_diameter", "toolDiameter", "diameter_mm", "diameter"],
};
// Dispatchers sometimes nest the real params one level down under a wrapper key.
const DETERMINING_NESTED_KEYS = ["params", "input", "request", "args", "payload", "options"];

/** Coerce a scalar to a non-empty trimmed string, or null. Objects/arrays/empty -> null. */
function scalarToStr(v) {
  if (typeof v === "string") { const t = v.trim(); return t || null; }
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "boolean") return String(v);
  return null;
}

/**
 * Pull the determining inputs out of a dispatcher tool_input, normalized onto the
 * converter's context keys. Searches the top level plus one level into common
 * wrapper objects; first non-empty scalar alias wins per canonical key. Returns {}
 * when nothing is found (harmless -- the event still carries engine/action/hook).
 */
export function extractDeterminingInputs(toolInput) {
  if (!toolInput || typeof toolInput !== "object" || Array.isArray(toolInput)) return {};
  const sources = [toolInput];
  for (const k of DETERMINING_NESTED_KEYS) {
    const nested = toolInput[k];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) sources.push(nested);
  }
  const out = {};
  for (const [canonical, aliases] of Object.entries(DETERMINING_INPUT_ALIASES)) {
    for (const src of sources) {
      let found = null;
      for (const a of aliases) { const s = scalarToStr(src[a]); if (s) { found = s; break; } }
      if (found) { out[canonical] = found; break; }
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Atomic JSONL append — mirrors OutcomeCaptureBusEngine.atomicAppend() so
// the hook doesn't need to spawn a Node subprocess or load the TS engine.
// ─────────────────────────────────────────────────────────────────────────

async function atomicAppend(filePath, line) {
  const dir = path.dirname(filePath);
  try {
    await fs.mkdir(dir, { recursive: true });
    let existing = "";
    try {
      existing = await fs.readFile(filePath, "utf8");
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
    const tmp = path.join(
      dir,
      `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`,
    );
    await fs.writeFile(tmp, existing + line, { encoding: "utf8" });
    await fs.rename(tmp, filePath);
    return { ok: true };
  } catch (err) {
    return { ok: false, warning: err?.message ?? String(err) };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Hook entry — reads PostToolUse JSON from stdin, emits event, returns
// {continue: true}. Never throws; never exits non-zero.
// ─────────────────────────────────────────────────────────────────────────

function readStdin() {
  return new Promise((resolve) => {
    let buf = "";
    const to = setTimeout(() => resolve(buf), 500);
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (d) => { buf += d; });
    process.stdin.on("end", () => { clearTimeout(to); resolve(buf); });
    process.stdin.on("error", () => { clearTimeout(to); resolve(buf); });
  });
}

function safeStringify(v, maxBytes = 8192) {
  try {
    const s = JSON.stringify(v);
    if (s.length <= maxBytes) return v;
    // Truncate but keep the shape — consumers filter on keys, not deep values.
    return { _truncated: true, preview: s.slice(0, maxBytes) };
  } catch {
    return { _nonserializable: true };
  }
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj));
}

async function main() {
  const raw = await readStdin();
  if (!raw.trim()) { emit({ continue: true }); return; }

  let input;
  try { input = JSON.parse(raw); } catch { emit({ continue: true }); return; }

  const toolName = input?.tool_name ?? input?.toolName ?? "";
  if (!toolName.startsWith("mcp__prism__prism_")) {
    emit({ continue: true });
    return;
  }

  const toolInput = input?.tool_input ?? input?.toolInput ?? {};
  const toolResponse = input?.tool_response ?? input?.toolResponse ?? input?.output ?? {};
  const action = toolInput?.action;

  const domain = classifyDomain(toolName, action);
  if (!domain) { emit({ continue: true }); return; }

  // Unwrap MCP envelope: tool_response is usually { content: [{type:"text", text: "{...}"}] }
  let payload = toolResponse;
  if (payload && Array.isArray(payload.content) && payload.content[0]?.type === "text") {
    try { payload = JSON.parse(payload.content[0].text); } catch { /* leave as-is */ }
  }

  const recommendation = extractRecommendation(payload);
  if (!recommendation) { emit({ continue: true }); return; }

  const event = {
    schemaVersion: SCHEMA_VERSION,
    event_id: randomUUID(),
    lineage_id: randomUUID(),
    domain,
    kind: "recommendation_emitted",
    severity: "info",
    source: "system",
    timestamp: new Date().toISOString(),
    agent_id: input?.session_id ?? input?.sessionId,
    context: {
      engine: toolName,
      action: String(action ?? "unknown"),
      hook: "post-recommendation-capture",
      // Surface the determining inputs the dispatcher already passed so the
      // outcome->LoRA converter can build a learnable (state -> recommendation)
      // SFT pair instead of an input-barren skip (U-OUTCOME-INPUT-CAPTURE).
      ...extractDeterminingInputs(toolInput),
    },
    recommended: safeStringify(recommendation),
  };

  const line = JSON.stringify(event) + "\n";
  if (Buffer.byteLength(line, "utf8") > 64 * 1024) {
    // Oversize — drop recommended payload, keep envelope so lineage is still tracked.
    event.recommended = { _truncated: true };
    await atomicAppend(path.join(OUTCOMES_DIR, `${domain}.jsonl`), JSON.stringify(event) + "\n");
  } else {
    await atomicAppend(path.join(OUTCOMES_DIR, `${domain}.jsonl`), line);
  }

  // hookSpecificOutput carries lineage_id back to the LLM so subsequent
  // override/measurement events can thread it. additionalContext is
  // whitespace-sensitive and should stay short.
  emit({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: `[feedback:${domain}] recommendation_emitted lineage=${event.lineage_id.slice(0, 8)}`,
    },
  });
}

// Run only as a CLI (PostToolUse child process). When imported by a test the
// pure exports (extractDeterminingInputs) are used without firing main()'s
// stdin read / disk write.
const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();

if (isMain) {
  main().catch(() => {
    // Never throw out of the hook -- bus must never break the caller.
    process.stdout.write(JSON.stringify({ continue: true }));
  });
}
