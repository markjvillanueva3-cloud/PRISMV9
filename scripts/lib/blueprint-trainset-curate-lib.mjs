// scripts/lib/blueprint-trainset-curate-lib.mjs
//
// U-PSGB-XRAY-TRAINSET-CURATE — pure curation core for the OCR/print→CAD training set.
//
// THE PROBLEM (grounded in the real corpus, blueprint-training-pairs.jsonl, 76,205 parts):
// `train_eligible` (has_print && (has_program||has_cad)) OVERCOUNTS the trustworthy labels.
// The corpus' own `match_confidence` shows 5,029 "garbage" + 232 "ambiguous" pairings mixed
// into the eligible set — pairing a print to the WRONG program/CAD. Training a dimension
// reader against a wrong answer-key is the textbook garbage-in-garbage-out failure: it
// teaches the model to "match" a value that was never on the print. So the supervised
// training set must be CURATED to the trustworthy labels (exact + loose with a real source),
// NOT the raw eligible set.
//
// This is the corpus-curation step that gates any supervised OCR / print→CAD round-trip
// training run. Pure (no I/O): the runner streams the pairs file through these folds.
// R8: consumes the already-built pairs file — never re-OCRs or re-joins.

// match_confidence tiers from the corpus, ranked. Only TRUSTWORTHY tiers enter the
// supervised set; ambiguous/garbage are excluded (poison labels), miss has no label at all.
export const TRUSTWORTHY_CONFIDENCE = Object.freeze(["exact", "loose"]);
export const EXCLUDED_CONFIDENCE = Object.freeze(["ambiguous", "garbage"]);
// A real label source means a program and/or CAD answer-key is attached.
export const REAL_LABEL_SOURCES = Object.freeze(["program", "cad", "cad+program"]);

/** Pure: normalize a string field to a lowercased token, else "". */
function tok(v) {
  return typeof v === "string" ? v.trim().toLowerCase() : "";
}

/** Pure: does this record carry a TRUSTWORTHY supervised label? */
export function isCleanLabel(rec) {
  if (!rec || typeof rec !== "object") return false;
  if (rec.has_print !== true) return false;            // a label with no print is not a print-reading example
  const conf = tok(rec.match_confidence);
  const src = tok(rec.label_source);
  return TRUSTWORTHY_CONFIDENCE.includes(conf) && REAL_LABEL_SOURCES.includes(src);
}

/** Pure: summarize drawing_score across a record's print_docs → {min,max,mean,n} (null-safe). */
export function summarizeDrawingScore(rec) {
  const docs = Array.isArray(rec && rec.print_docs) ? rec.print_docs : [];
  const scores = docs.map((d) => Number(d && d.drawing_score)).filter((s) => Number.isFinite(s));
  if (!scores.length) return { min: null, max: null, mean: null, n: 0 };
  const sum = scores.reduce((a, b) => a + b, 0);
  return {
    min: +Math.min(...scores).toFixed(4),
    max: +Math.max(...scores).toFixed(4),
    mean: +(sum / scores.length).toFixed(4),
    n: scores.length,
  };
}

/**
 * Pure: curate one pairs record. Returns the curation verdict + the enriched training row
 * (only meaningful when kept). subsets identify which training task the row can feed:
 *   roundtrip_b  = print + CAD (delta's print→CAD→print round-trip B)
 *   print_program = print + CNC program (print→program supervised)
 *   triple        = print + program + CAD
 * @param {object} rec  one blueprint-training-pairs.jsonl record
 * @returns {{keep:boolean, reason:string, tier:string|null, row:(object|null)}}
 */
export function curateRecord(rec) {
  if (!rec || typeof rec !== "object") return { keep: false, reason: "not-an-object", tier: null, row: null };
  const conf = tok(rec.match_confidence);
  const src = tok(rec.label_source);
  if (rec.has_print !== true) return { keep: false, reason: "no-print", tier: null, row: null };
  if (src === "none" || conf === "miss" || src === "") return { keep: false, reason: "unlabeled", tier: null, row: null };
  if (EXCLUDED_CONFIDENCE.includes(conf)) return { keep: false, reason: `poison-label:${conf}`, tier: null, row: null };
  if (!TRUSTWORTHY_CONFIDENCE.includes(conf)) return { keep: false, reason: `unknown-confidence:${conf || "?"}`, tier: null, row: null };
  if (!REAL_LABEL_SOURCES.includes(src)) return { keep: false, reason: `no-real-source:${src || "?"}`, tier: null, row: null };

  const hasCad = rec.has_cad === true;
  const hasProgram = rec.has_program === true;
  const subsets = {
    roundtrip_b: hasCad,                 // print already true here
    print_program: hasProgram,
    triple: hasCad && hasProgram,
  };
  const printDocs = (Array.isArray(rec.print_docs) ? rec.print_docs : []).map((d) => ({
    doc_id: d && d.doc_id != null ? d.doc_id : null,
    filename: d && d.filename != null ? d.filename : null,
    drawing_score: d && Number.isFinite(Number(d.drawing_score)) ? Number(d.drawing_score) : null,
  }));
  const row = {
    part_number: rec.part_number ?? rec.part_number_normalized ?? null,
    // the STABLE re-join key — emitting it (plus the locators below) makes a row self-contained:
    // a downstream training consumer never has to re-join to the 51.8MB pairs file (reviewer P1).
    part_number_normalized: rec.part_number_normalized ?? null,
    confidence: conf,
    label_source: src,
    subsets,
    // actual locators (not just counts) so the curated trainset is trainable standalone
    print_docs: printDocs,
    program_files: Array.isArray(rec.program_files) ? rec.program_files : [],
    cad_files: Array.isArray(rec.cad_files) ? rec.cad_files : [],
    n_print_docs: printDocs.length,
    n_program_files: Array.isArray(rec.program_files) ? rec.program_files.length : 0,
    n_cad_files: Array.isArray(rec.cad_files) ? rec.cad_files.length : 0,
    drawing_score: summarizeDrawingScore(rec),
  };
  return { keep: true, reason: "clean", tier: conf, row };
}

/** Pure: fresh curation accumulator. */
export function newCurationStats() {
  return {
    total: 0, kept: 0, excluded: 0,
    by_reason: {},                 // reason → count (poison-label:garbage, unlabeled, ...)
    by_tier: {},                   // exact/loose → count (kept rows)
    subsets: { roundtrip_b: 0, print_program: 0, triple: 0 },
  };
}

/** Pure: fold one record's curation verdict into the accumulator. */
export function accumulate(acc, verdict) {
  acc.total++;
  if (verdict.keep) {
    acc.kept++;
    acc.by_tier[verdict.tier] = (acc.by_tier[verdict.tier] || 0) + 1;
    const s = verdict.row.subsets;
    if (s.roundtrip_b) acc.subsets.roundtrip_b++;
    if (s.print_program) acc.subsets.print_program++;
    if (s.triple) acc.subsets.triple++;
  } else {
    acc.excluded++;
    acc.by_reason[verdict.reason] = (acc.by_reason[verdict.reason] || 0) + 1;
  }
  return acc;
}

/** Pure: derive final metrics from the accumulator. */
export function finalizeCuration(acc) {
  const total = acc.total || 0;
  return {
    total_parts: total,
    clean_trainset: acc.kept,
    excluded: acc.excluded,
    clean_rate: total ? +(acc.kept / total).toFixed(4) : 0,
    // poison = excluded specifically for a bad (not merely absent) label — the GIGO guard
    poison_excluded: Object.entries(acc.by_reason)
      .filter(([r]) => r.startsWith("poison-label"))
      .reduce((s, [, c]) => s + c, 0),
    by_tier: acc.by_tier,
    by_exclusion_reason: acc.by_reason,
    trainable_subsets: acc.subsets,
  };
}
