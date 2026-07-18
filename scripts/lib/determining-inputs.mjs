// scripts/lib/determining-inputs.mjs
// Shared determining-input extractor (U-OUTCOME-INPUT-SHARED, slot:india 2026-06-30).
//
// THE CROSS-DOMAIN GAP THIS SERVES: PRISM's outcome->LoRA SFT converter
// (scripts/lib/outcome-to-alpaca-converter.mjs) only builds a learnable
// (state -> recommendation) pair when the outcome event's `context` carries the
// DETERMINING INPUTS (material / tool / operation / ...). The capture HOOK
// (.claude/hooks/post-recommendation-capture.mjs, U-OUTCOME-INPUT-CAPTURE) now
// surfaces them for the domains it captures (lathe/sinker/grinder/welder/cad/
// wedm/5axis). But the ENGINE-emitted ledgers go through the
// *OutcomeCaptureWireEngine family (SFC=oscar, PPG=echo, Quoting=charlie), whose
// `recordEmission(input)` forwards ONLY `input.context` -- and the callers pass
// `context:{machine_id}` (no material/tool/operation), so e.g. speed_feed.jsonl's
// 19,157 events collapse to ~16 degenerate pairs.
//
// This is the SHARED, framework-free extractor those wire-engine CALL SITES need:
// given the engine's input params, it returns the determining-input subset to
// merge into `input.context`. Drop-in: `context: { ...determiningInputs(params), machine_id }`.
// Pure / scalar-only / never-throws -- safe in any producer. (Sibling of the hook's
// own copy; the hook keeps an inlined version to stay dependency-free at the
// PostToolUse latency budget. Consolidate-later note: R7.)

// Canonical determining-input keys mapped onto the converter's context vocabulary
// (the keys outcome-to-alpaca-converter.mjs INPUT_KEYS reads). Each lists the param
// spellings seen across PRISM dispatchers/engines; first non-empty scalar wins.
export const DETERMINING_INPUT_ALIASES = Object.freeze({
  material:         ["material", "material_name", "materialName", "workpiece_material", "stock_material"],
  tool_id:          ["tool_id", "toolId", "tool", "tool_name", "toolName", "tool_number", "cutter", "insert"],
  operation:        ["operation", "op", "operation_type", "operationType", "cut_type", "cutType"],
  feature:          ["feature", "feature_type", "featureType", "feature_name"],
  machine_id:       ["machine_id", "machineId", "machine", "machine_name"],
  process:          ["process", "process_type", "processType"],
  iso:              ["iso", "iso_group", "isoGroup", "material_group"],
  tool_material:    ["tool_material", "toolMaterial", "insert_material"],
  tool_diameter_mm: ["tool_diameter_mm", "tool_diameter", "toolDiameter", "diameter_mm", "diameter"],
});

// Producers sometimes nest the real params one level down under a wrapper key.
const NESTED_WRAPPER_KEYS = ["params", "input", "request", "args", "payload", "options", "context"];

/** Coerce a scalar to a non-empty trimmed string, or null (objects/arrays/empty -> null). */
export function scalarToStr(v) {
  if (typeof v === "string") { const t = v.trim(); return t || null; }
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "boolean") return String(v);
  return null;
}

/**
 * Extract the determining inputs from an engine/dispatcher params object,
 * normalized onto the converter's context keys. Searches the top level plus one
 * level into common wrapper objects; first non-empty scalar alias wins per key.
 * Returns {} when nothing is found (harmless -- the event keeps its base context).
 *
 * @param {unknown} params engine input / dispatcher tool_input / job context.
 * @returns {Record<string,string>} determining-input subset (string-valued).
 */
export function determiningInputs(params) {
  if (!params || typeof params !== "object" || Array.isArray(params)) return {};
  const sources = [params];
  for (const k of NESTED_WRAPPER_KEYS) {
    const nested = params[k];
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

/**
 * Convenience for a wire-engine call site: merge determining inputs UNDER an
 * existing context, so explicit caller-provided context fields always win.
 * `context: enrichContext(input.context, engineParams)`.
 *
 * @param {Record<string,unknown>|undefined|null} baseContext caller's context.
 * @param {unknown} params engine input params to mine for determining inputs.
 * @returns {Record<string,unknown>} base context with any missing inputs filled.
 */
export function enrichContext(baseContext, params) {
  const base = (baseContext && typeof baseContext === "object" && !Array.isArray(baseContext)) ? baseContext : {};
  // extracted first, base second -> explicit caller fields override the inferred ones.
  return { ...determiningInputs(params), ...base };
}
