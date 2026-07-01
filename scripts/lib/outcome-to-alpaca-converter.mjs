/**
 * outcome-to-alpaca-converter.mjs -- pure converter: PRISM outcome-bus events ->
 * Alpaca {instruction, output} training pairs (U-OUTCOME-LORA-WIRE, slot:india 2026-06-11).
 *
 * THE DORMANCY THIS CLOSES: the closed-loop OUTCOME BUS (state/outcomes/*.jsonl) had
 * written 12,093 real events (10,864 recommendation_emitted + 1,229 cross_process_stage_complete)
 * that NO training script ever read -- a write-only sink, not a closed loop. This converts the
 * learnable subset into instruction-tuning signal for the fleet LoRA corpus.
 *
 * LEARNABILITY GATE (R9 / garbage-in): a pair is emitted ONLY when the event's `context`
 * carries the DETERMINING INPUTS (material / tool / operation / machine / feature). Verified
 * live: 10,816 of 12,093 events (the `action:"calculate"` recommendations) carry these; the
 * sparse `cross_process_stage_complete` records (context = {engine, job_id, pipeline_stage})
 * do NOT determine their output and are SKIPPED (counted, never emitted as a degenerate pair).
 *
 * TRUST: these are ENGINE-EMITTED recommendations (a distillation of PRISM's physics engines),
 * NOT hand-authored verified doctrine and NOT operator-validated shop-floor outcomes. The
 * fleet assembler registers this source as `advisory:true` -> 0.5 weight (never confused with
 * verified doctrine). Honest by construction.
 *
 * MEMORY: convertJsonlText streams line-by-line and accumulates ONLY the small {instruction,
 * output} pairs -- it never materializes the fat source objects en masse (a `.map(JSON.parse)`
 * over speed_feed.jsonl's 10,834 fat rows OOMs the default heap). Pure -> hermetically testable.
 */

// Context keys that are INPUTS (features determining the recommendation), in render order.
// The trailing three (iso/tool_material/tool_diameter_mm) are surfaced by
// post-recommendation-capture.mjs::extractDeterminingInputs (U-OUTCOME-INPUT-CAPTURE) --
// reading them here closes the producer<->consumer seam so the richer context the hook
// now writes actually sharpens the (state -> recommendation) pair instead of being dropped.
const INPUT_KEYS = ["material", "tool_id", "tool", "operation", "feature", "machine_id", "process", "iso", "tool_material", "tool_diameter_mm"];

/**
 * Collect scalar (string|number|boolean) leaves from an object into [keyPath, value]
 * pairs, depth- and count-capped. Special-cases physics {value, unit, ...} nodes ->
 * "<value> <unit>" (dropping confidence/source/formula noise) so a recommended.raw
 * subtree renders as "cutting_speed=83.6 m/min" not a wall of metadata.
 */
export function flattenScalars(obj, { maxDepth = 4, maxLeaves = 16 } = {}) {
  const out = [];
  const walk = (o, depth, pfx) => {
    if (out.length >= maxLeaves || o === null || o === undefined) return;
    const t = typeof o;
    if (t === "string" || t === "number" || t === "boolean") {
      out.push([pfx || "value", o]);
      return;
    }
    if (t !== "object" || depth >= maxDepth) return;
    // Physics {value, unit} node -> single "<value> <unit>" leaf under the parent key.
    if ((typeof o.value === "number" || typeof o.value === "string") && !Array.isArray(o)) {
      const u = typeof o.unit === "string" ? o.unit : "";
      out.push([pfx || "value", u ? `${o.value} ${u}` : o.value]);
      return;
    }
    if (Array.isArray(o)) {
      for (let i = 0; i < o.length && out.length < maxLeaves; i++) {
        walk(o[i], depth + 1, pfx ? `${pfx}[${i}]` : `[${i}]`);
      }
      return;
    }
    for (const k of Object.keys(o)) {
      if (out.length >= maxLeaves) break;
      walk(o[k], depth + 1, pfx ? `${pfx}.${k}` : k);
    }
  };
  walk(obj, 0, "");
  return out;
}

/**
 * Build the instruction from an event's context inputs. Returns null when no
 * determining input is present (the learnability gate -- sparse events are not
 * forced into degenerate pairs).
 */
export function buildInstruction(event) {
  const ctx = (event && event.context) || {};
  const parts = [];
  for (const k of INPUT_KEYS) {
    const v = ctx[k];
    if (typeof v === "string" && v.trim()) parts.push(`${k.replace(/_id$/, "")}=${v.trim()}`);
  }
  if (!parts.length) return null;
  const domain = typeof event.domain === "string" && event.domain ? event.domain : "manufacturing";
  const action = typeof ctx.action === "string" && ctx.action ? ctx.action : (event.kind || "recommend");
  return `PRISM ${domain} ${action}. Inputs: ${parts.join(", ")}. Provide the recommended parameters.`;
}

/**
 * Build the output from an event's recommended/actual payload. Prefers the clean
 * `summary` subtree, then sinker-style `recommended` nesting, then `raw`. Returns
 * null when no scalar leaves are extractable.
 */
export function buildOutput(event, { maxChars = 600 } = {}) {
  const rec = event && (event.recommended || event.actual);
  if (!rec || typeof rec !== "object") return null;
  let target = rec;
  if (rec.summary && typeof rec.summary === "object" && Object.keys(rec.summary).length) target = rec.summary;
  else if (rec.recommended && typeof rec.recommended === "object") target = rec.recommended;
  else if (rec.raw && typeof rec.raw === "object") target = rec.raw;
  const leaves = flattenScalars(target);
  if (!leaves.length) return null;
  const body = leaves.map(([k, v]) => `${k}=${v}`).join(", ");
  return body.length > maxChars ? body.slice(0, maxChars) : body;
}

/** Convert one outcome event -> Alpaca pair, or null if not a learnable pair. */
export function outcomeToAlpaca(event) {
  if (!event || typeof event !== "object") return null;
  const instruction = buildInstruction(event);
  if (!instruction) return null;
  const output = buildOutput(event);
  if (!output) return null;
  return { instruction, output };
}

// ---------------------------------------------------------------------------
// Flat sweep-row schema (U-OUTCOME-SWEEP-SFT, slot:india 2026-06-30)
//
// THE DARK SIGNAL THIS CLOSES: the two LARGEST outcome ledgers --
// sfc-corrected-fullsweep.jsonl (276,480 rows, 127MB) and
// sfc-all-axis-sweep-ledger.jsonl (3,888) -- are NOT outcome-bus envelopes;
// they are FLAT parameter-sweep result rows
// (material/iso/tool_material/tool_diameter/mode -> prism_vc_mpm/vc_mpm/rpm/feed).
// The envelope path (outcomeToAlpaca) skips ALL ~280K of them (0 converted, live
// 2026-06-30), so PRISM's single largest INPUT-RICH SFT signal was training-dark
// -- meanwhile the 176MB speed_feed envelope ledger yields 19,157 pairs that
// DEDUP to ~16 unique (context carries only machine_id, no material/tool/op).
// This fix lifts the unique-pair corpus 395 -> 11,483 (~29x) live. Unlike
// speed_feed, these sweep rows carry the *determining
// inputs* inline (the state that varies across the grid), so each is a
// first-class distillation pair. Same advisory weighting as the envelope
// recommendations: engine-emitted (a distillation of PRISM's physics sweep),
// NOT operator-validated -- the fleet assembler down-weights to 0.5.
// ---------------------------------------------------------------------------

// Sweep INPUT fields (the state determining the recommendation), render order.
// Union across both sweep schemas; tool diameter has two spellings.
const SWEEP_INPUT_FIELDS = [
  "material", "iso", "tool_material", "tool_diameter_mm", "diameter_mm",
  "cut_type", "way", "workholding", "tool_holder", "coolant", "mode",
];
// Sweep OUTPUT fields (the recommended params). prism_vc_mpm is PRISM's OWN
// recommendation -- the distillation target; vc_mpm is the generic fallback.
const SWEEP_OUTPUT_FIELDS = [
  "prism_vc_mpm", "vc_mpm", "rpm", "feed_mmmin", "ipr", "sfm", "mrr_cm3min",
];
// Operation/strategy tokens recoverable from a `cell_id`
// ("AISI 1018::D3::F2::milling::roughing::conventional::flood::cat40::mode").
// Position-INDEPENDENT vocabulary scan -- the segment ORDER is not a contract,
// so a layout change can never silently mis-map a tool code to an operation.
const CELL_ID_OP_VOCAB = new Set([
  "milling", "turning", "drilling", "roughing", "finishing", "semi_finishing",
  "conventional", "climb", "slotting", "facing", "boring", "profiling", "pocketing",
]);

function finiteNum(v) { return typeof v === "number" && Number.isFinite(v) ? v : null; }

/** Extract operation/strategy tokens from a cell_id via vocabulary scan ([] if none). */
export function cellIdTokens(cellId) {
  if (typeof cellId !== "string" || !cellId) return [];
  const segs = cellId.split("::").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return segs.filter((s) => CELL_ID_OP_VOCAB.has(s));
}

/**
 * True iff `o` is a flat sweep row (NOT an outcome-bus envelope event). The
 * envelope guard is load-bearing: an envelope event owns kind/context/recommended,
 * a sweep row owns none of them -- so this can never mis-classify (and the OR in
 * convertJsonlText tries the envelope path first regardless). Qualifies only with
 * >=2 determining inputs AND >=1 finite output param, so a random flat object or
 * a too-thin row is never forced into a degenerate pair (R9 learnability gate).
 */
export function isSweepRow(o) {
  if (!o || typeof o !== "object" || Array.isArray(o)) return false;
  if (o.kind !== undefined || o.context !== undefined || o.recommended !== undefined) return false;
  let inputs = 0;
  for (const k of SWEEP_INPUT_FIELDS) {
    const v = o[k];
    if ((typeof v === "string" && v.trim()) || finiteNum(v) !== null) inputs++;
  }
  if (inputs < 2) return false;
  return SWEEP_OUTPUT_FIELDS.some((k) => finiteNum(o[k]) !== null);
}

/** Convert one flat sweep row -> Alpaca pair, or null if not a learnable sweep row. */
export function sweepRowToAlpaca(o) {
  if (!isSweepRow(o)) return null;
  const inParts = [];
  for (const k of SWEEP_INPUT_FIELDS) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) inParts.push(`${k}=${v.trim()}`);
    else if (finiteNum(v) !== null) inParts.push(`${k}=${v}`);
  }
  // Enrich with operation/strategy from cell_id (deduped against explicit fields).
  for (const tok of cellIdTokens(o.cell_id)) {
    if (!inParts.some((p) => p.endsWith(`=${tok}`))) inParts.push(`op=${tok}`);
  }
  if (inParts.length < 2) return null;
  const outParts = [];
  for (const k of SWEEP_OUTPUT_FIELDS) {
    const n = finiteNum(o[k]);
    if (n !== null) outParts.push(`${k}=${n}`);
  }
  if (!outParts.length) return null;
  const domain = typeof o.domain === "string" && o.domain ? o.domain : "manufacturing";
  return {
    instruction: `PRISM ${domain} speed_feed sweep. Inputs: ${inParts.join(", ")}. Provide the recommended parameters.`,
    output: outParts.join(", "),
  };
}

/**
 * Stream JSONL text -> { rows, invalid, skipped }. Memory-safe: parses one line at a
 * time and keeps only the small emitted pairs (never the fat source objects).
 * `invalid` = unparseable lines; `skipped` = parsed events that are not learnable pairs.
 */
export function convertJsonlText(text) {
  const rows = [];
  let invalid = 0;
  let skipped = 0;
  for (const line of String(text || "").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    let o;
    try { o = JSON.parse(t); } catch { invalid++; continue; }
    // Envelope path first (outcome-bus events); flat sweep-row fallback second.
    // The two are mutually exclusive by schema (isSweepRow rejects any object
    // carrying kind/context/recommended), so the OR can never double-count.
    const pair = outcomeToAlpaca(o) || sweepRowToAlpaca(o);
    if (!pair) { skipped++; continue; }
    rows.push(pair);
  }
  return { rows, invalid, skipped };
}

/**
 * Dedup Alpaca rows by (instruction, output). Identical repeated recommendations
 * (same material x tool x operation -> same params) collapse to one pair so the
 * corpus is not skewed by event frequency. Returns { rows, duplicates }.
 */
export function dedupRows(rows) {
  const seen = new Set();
  const out = [];
  let duplicates = 0;
  for (const r of rows) {
    const k = `${r.instruction} ${r.output}`;
    if (seen.has(k)) { duplicates++; continue; }
    seen.add(k);
    out.push(r);
  }
  return { rows: out, duplicates };
}
