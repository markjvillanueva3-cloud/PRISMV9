/**
 * vec2d-ledger-to-training.mjs -- pure converter: the vec2d DXF training ledger
 * (state/shared/cad-closed-loop-night/vec2d-training-ledger.jsonl) -> Alpaca 2D-drawing
 * training pairs (U-DELTA-VEC2D-TRAINING-LANE, slot:delta 2026-07-02, Domain 10 closed-loop).
 *
 * THE GAP THIS CLOSES: the H-drive holds 9,527 native 2D CAD drawings (9,280 .dxf + 247 .dwg)
 * with a REAL, live-validated reader (Drawing2DExtractionEngine.parseDxfContent, un-faked
 * 2026-06-24) but NO training lane -- nothing walked manifest-vec2d.canonical.txt -> the reader
 * -> training pairs. DXF group-42 gives EXACT dimensional values (with $INSUNITS units), a
 * HIGHER-quality signal than OCR weak-labels. This converts a ledger of extracted-drawing rows
 * into durable (dims+units -> normalized callouts + units-handling rule) training pairs, folded
 * into the fleet LoRA corpus as an advisory (0.5 weight) source.
 *
 * LEARNABILITY (why the exact dims live in `input`, not `instruction`): the salient signal (the
 * raw DIMENSION values + the $INSUNITS state) is placed in the Alpaca `input` field, so `output`
 * restating them is a derivable transform -- not filename->number memorization. The `instruction`
 * is a CONSTANT task frame (no basename, no counts, no path), so two different drawings can never
 * yield the same (instruction,input) with contradictory output.
 *
 * UNITS-FIRST (R12, JM is INCH): a row whose parse FAILED never reaches a pair -- the lane
 * reclassifies it to status:'parse-error' (never trusting the engine's silent default units:'mm').
 * A units:'unknown' drawing emits a units-DISCIPLINE clause ("do NOT assume millimeters"), never
 * a fabricated mm claim. Sibling of scripts/lib/cad-fix-ledger-to-training.mjs.
 *
 * TRUST: auto-extracted from a deterministic geometry reader (evidence-grounded, not hand-authored)
 * -> registered advisory (0.5 weight). Pure -> hermetically testable.
 */

/** Canonical decimal string: collapses 12.5 and 12.5000 to one token (numeric-normalization). */
export function fmtNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? String(Number.parseFloat(n.toFixed(4))) : String(v);
}

/**
 * Natural-language description of one DIMENSION. Angular dims are ALWAYS "deg" (the DXF group-42
 * angular value is in degrees regardless of the drawing's $INSUNITS length unit). Linear/diameter/
 * radial dims carry the drawing's length unit when known, else "(unit unconfirmed)".
 */
export function describeDim(d, drawingUnits) {
  const val = fmtNum(d.value);
  if (d.type === "angular") return `an angular dimension of ${val} deg`;
  const label = d.type === "diameter" ? "diameter" : d.type === "radial" ? "radius" : "linear dimension";
  const unit = d.unit && d.unit !== "unknown" ? d.unit
    : drawingUnits && drawingUnits !== "unknown" ? drawingUnits
    : null;
  return unit ? `a ${label} of ${val} ${unit}` : `a ${label} of ${val} (unit unconfirmed)`;
}

/**
 * Convert ONE ledger row -> [pair] or []. A pair is emitted only for a successfully-parsed row
 * (status 'parsed' or 'parsed-no-dims' AND ok===true). Every other status (dwg-unsupported,
 * too-large, read-error, parse-error, binary-nonparseable) yields [] -> surfaced as `skipped`.
 * Returns an ARRAY (plural) to match a general row->pairs contract, though today one row = <=1 pair.
 */
export function vec2dRowToTrainingPairs(row) {
  if (!row || (row.status !== "parsed" && row.status !== "parsed-no-dims") || row.ok !== true) return [];
  const units = row.units || "unknown";
  const dims = Array.isArray(row.dimensions) ? row.dimensions : [];
  const n = dims.length;
  const unitsClause = units === "unknown"
    ? "Units are UNCONFIRMED (no inch/mm $INSUNITS -- header absent or an unsupported unit code); do NOT assume millimeters; confirm from the title block before scaling."
    : `Units are ${units}; values are in ${units} and must not be rescaled.`;
  const instruction = "You are given the DIMENSION entities and the $INSUNITS units-header state "
    + "extracted from a 2D CAD drawing. Restate each dimensional callout in normalized natural-language "
    + "form, and state the correct units-handling rule for this drawing.";
  const insToken = units === "unknown" ? "$INSUNITS=unresolved" : `$INSUNITS=${units}`;
  const inputLines = n > 0 ? dims.map((d) => `DIM ${d.type} ${fmtNum(d.value)}`) : ["NO_DIMENSION_ENTITIES"];
  const input = [insToken, ...inputLines].join("\n");
  const output = n > 0
    ? `The drawing defines ${n} dimension${n === 1 ? "" : "s"}: ${dims.map((d) => describeDim(d, units)).join("; ")}. ${unitsClause}`
    : `The drawing defines no explicit DIMENSION callouts. ${unitsClause}`;
  return [{ instruction, input, output }];
}

/**
 * Convert JSONL ledger text -> { rows, invalid, skipped } (matches the convertLedgerText contract
 * so it slots into the closed-loop coverage auditor). `invalid` = unparseable lines; `skipped` =
 * rows that are not a successfully-parsed drawing (dwg/too-large/parse-error/binary/read-error).
 * Returns RAW (undeduped) rows -- the producer owns dedup, matching the sibling contract.
 */
export function convertVec2d(text) {
  const rows = [];
  let invalid = 0;
  let skipped = 0;
  for (const line of String(text || "").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    let o;
    try { o = JSON.parse(t); } catch { invalid++; continue; }
    const pairs = vec2dRowToTrainingPairs(o);
    if (!pairs.length) { skipped++; continue; }
    for (const p of pairs) rows.push(p);
  }
  return { rows, invalid, skipped };
}

/**
 * Dedup pairs by the ASSEMBLER key JSON.stringify([instruction, output]) -- byte-identical to
 * assemble-fleet-lora-corpus.mjs:156-158, so the load-bearing dataset dedup matches what the
 * assembler will do (NOT the auditor's advisory space-join key). `input` is intentionally NOT in
 * the key (the assembler ignores it too); since output is a deterministic function of the salient
 * normalized input, exactly one row survives per (instruction, output).
 */
export function dedupVec2dPairs(pairs) {
  const seen = new Set();
  const out = [];
  let duplicates = 0;
  for (const p of pairs) {
    const k = JSON.stringify([p.instruction, p.output]);
    if (seen.has(k)) { duplicates++; continue; }
    seen.add(k);
    out.push(p);
  }
  return { rows: out, duplicates };
}
