// scripts/lib/cnc-ground-truth-lib.mjs
//
// U-TDP06 - CNC-derived Ground Truth (pure core).
//
// Converts a CNC program's G/M-code content into BlueprintExtraction-shape
// ground-truth records for the U-TDP04 OCR-extraction benchmark. This is the
// CNC half of the user directive "you can also compare to cad files and cnc
// programs to determine if you extracted the correct data" (CAD half = U-TDP05,
// scripts/lib/cad-ground-truth-lib.mjs).
//
// DESIGN — PRESENCE-ONLY (deliberate, R12):
//   A CNC program *does* encode cut dimensions, but recovering a CORRECT
//   nominal from raw text requires modal G90/G91 absolute/incremental state,
//   canned-cycle R-plane pairing, lathe diameter/radius mode, and the work
//   datum — none of which are reliably present in the text. An absolute drill
//   Z is a coordinate, not a depth; a bored X is a position, not a size.
//   Emitting such a value as a nominal would poison the U-TDP04 dim benchmark
//   (graded at p95 <= 0.05 mm). So this lib emits feature-KIND presence only,
//   exactly like the proven CAD half — the benchmark's presence-only path
//   (ocr-benchmark-lib.mjs `allGtPresenceOnly`) grades it correctly. Presence
//   GT still proves the OCR extractor found the right features.
//
// PURE: no fs, no engine calls. The CLI shell does the corpus walk.
//
// Canonical PRISM feature kinds — kept a strict subset of the cad sibling's
// vocabulary so the U-TDP04 benchmark grades CAD- and CNC-derived GT on one
// vocabulary. CNC text only defensibly evidences three of the nine kinds:
//   central_oil_hole          - drilling / tapping / boring canned cycle
//   cross_drilled_relief_holes- 3+ drilling cycle invocations
//   stepped_revolved_axis     - lathe-confirmed turned profile
// Airfoil/fillet kinds (blade_root_fillet, leading/trailing_edge_fillet,
// shoulder_fillet) and chamfer/taper are NOT inferred — a raw arc or a C-axis
// word is not defensible evidence of design intent; emitting them would be
// precision noise against the shared benchmark.

const MAX_LINE = 512; // ReDoS guard — NC lines are short; truncate pathological input
const CROSS_DRILL_MIN = 3; // 3+ drilled holes => cross-drilled relief pattern

// Part-class filename heuristics — kept value-identical to the cad sibling
// (cad-ground-truth-lib.mjs heuristics) so a part lands in the SAME stratified
// bucket whether its GT came from a STEP file or an NC file.
export const CNC_FILENAME_HEURISTICS = Object.freeze([
  { needle: "punch", part_class: "extrude_punch" },
  { needle: "die", part_class: "die" },
  { needle: "shaft", part_class: "shaft" },
  { needle: "bushing", part_class: "bushing" },
  { needle: "bracket", part_class: "bracket" },
  { needle: "casing", part_class: "casing" },
  { needle: "plate", part_class: "plate" },
  { needle: "valve", part_class: "valve_body" },
  { needle: "blisk", part_class: "blisk" },
  { needle: "impeller", part_class: "impeller" },
]);

// Drilling/tapping/boring canned cycles (integer family — sub-cycle decimals
// like G83.1 high-speed-peck / G84.2 rigid-tap are truncated to the family).
// G73 = high-speed peck drilling on a milling control (its dominant meaning
// across the corpus); a Fanuc-lathe G73 pattern-repeat program still also
// carries G96 + a turning cycle, so it independently earns stepped_revolved_axis.
const DRILL_CYCLES = Object.freeze([73, 81, 82, 83, 84, 74, 85, 86, 89]);
const CYCLE_CANCEL = 80; // G80 cancels the active canned cycle
// Fanuc lathe roughing/finish turning cycles. G73 is intentionally EXCLUDED:
// on a milling control G73 is the high-speed peck-drilling cycle (very common),
// so it is not a defensible turned-axis signal. Even these are only treated as
// evidence when the program is G96-confirmed as a lathe (see evidenceFromNcOps).
const LATHE_TURN_CYCLES = Object.freeze([70, 71, 72]);

// Detect program units. Explicit modal G20 (inch) / G21 (metric, ISO) wins.
// Comment fallback uses only the unambiguous words INCH / METRIC — a bare
// "MM" is deliberately NOT a signal (it matches timestamp comments like
// "TIME=HH:MM" and tool notes like "10MM DRILL", a real false-positive seen
// on the JM Die corpus). Units are derivation traceability only — no nominal
// is scaled by them (the lib is presence-only) — so an unknown result is
// harmless, never a corrupted dimension.
export function detectUnits(content) {
  if (typeof content !== "string" || !content) return "unknown";
  const up = content.toUpperCase();
  if (/(^|[^.\d])G21($|[^.\d])/.test(up)) return "metric";
  if (/(^|[^.\d])G20($|[^.\d])/.test(up)) return "inch";
  if (/\bINCH\b/.test(up)) return "inch";
  if (/\bMETRIC\b/.test(up)) return "metric";
  return "unknown";
}

// Minimal pure G/M-word tokenizer. One pass; comments stripped (paren form and
// ';' to EOL). G/M numbers are truncated to their integer family so decimal
// sub-cycles (G83.1, G84.2) match the canonical cycle. NOTE: this tokenizer is
// per-line and does NOT carry modal motion state across lines; canned-cycle
// repeat (declare once, list hole positions) is handled separately in
// evidenceFromNcOps via an explicit active-cycle latch.
export function tokenizeNc(content) {
  const ops = [];
  if (typeof content !== "string" || !content) return ops;
  const lines = content.split(/\r?\n/);
  for (let raw of lines) {
    if (raw.length > MAX_LINE) raw = raw.slice(0, MAX_LINE);
    const line = raw.replace(/\([^)]*\)/g, " ").replace(/;.*$/, " ").trim();
    if (!line) continue;
    const words = line.toUpperCase().match(/[A-Z][-+]?\d*\.?\d*/g);
    if (!words) continue;
    const op = { g: [], m: [], words: {}, hasGWord: false };
    for (const w of words) {
      const letter = w[0];
      const numStr = w.slice(1);
      const num = numStr === "" ? null : Number(numStr);
      if (letter === "G" && Number.isFinite(num)) {
        op.g.push(Math.trunc(num));
        op.hasGWord = true;
      } else if (letter === "M" && Number.isFinite(num)) {
        op.m.push(Math.trunc(num));
      } else if (Number.isFinite(num)) {
        op.words[letter] = num;
      }
    }
    ops.push(op);
  }
  return ops;
}

const hasG = (op, n) => op.g.includes(n);
const hasAnyG = (op, list) => op.g.some((g) => list.includes(g));

// Map tokenized ops -> canonical PRISM feature kinds (presence only).
// Returns { kinds: string[] }. No nominals by design (see header).
export function evidenceFromNcOps(ops) {
  const kinds = new Set();
  if (!Array.isArray(ops) || ops.length === 0) return { kinds: [], subprogramCalls: 0 };

  let isLathe = false;          // set ONLY by G96 (unambiguous lathe CSS)
  let hasFeedCut = false;
  let sawLatheTurnCycle = false; // G70/71/72 seen (counts only if isLathe)
  let drillCount = 0;
  let activeDrillCycle = false;  // canned-cycle repeat latch
  let subprogramCalls = 0;       // M98 calls — body unexpanded (coverage caveat)

  for (const op of ops) {
    if (!op || typeof op !== "object" || !Array.isArray(op.g)) continue;
    if (Array.isArray(op.m) && op.m.includes(98)) subprogramCalls += 1;

    // Unambiguous lathe signal: G96 = constant surface speed (lathe-only).
    // G50/G70 are dialect-overloaded (scaling-cancel / inch on mills) and are
    // deliberately NOT used as lathe discriminators.
    if (hasG(op, 96)) isLathe = true;

    // --- Drilling / tapping / boring canned cycles ---
    if (hasAnyG(op, DRILL_CYCLES)) {
      kinds.add("central_oil_hole");
      drillCount += 1;
      activeDrillCycle = true;
    } else if (hasG(op, CYCLE_CANCEL)) {
      activeDrillCycle = false;
    } else if (activeDrillCycle && !op.hasGWord && (Number.isFinite(op.words.X) || Number.isFinite(op.words.Y))) {
      // Modal canned-cycle repeat: cycle declared on a prior line, this line
      // is a bare hole position (no G-word) -> one more drilled hole.
      drillCount += 1;
    } else if (op.hasGWord && (hasG(op, 0) || hasG(op, 1)) && activeDrillCycle) {
      // An explicit rapid/feed motion block ends the canned-cycle repeat run.
      activeDrillCycle = false;
    }

    // --- Lathe turning cycle seen (NOT a lathe discriminator by itself —
    //     G70/71/72 are only turned-axis evidence once G96 confirms lathe) ---
    if (hasAnyG(op, LATHE_TURN_CYCLES)) sawLatheTurnCycle = true;

    // --- Real feed cut (G1 with an axis word) ---
    if (hasG(op, 1) && (Number.isFinite(op.words.X) || Number.isFinite(op.words.Z))) {
      hasFeedCut = true;
    }
  }

  // 3+ drilled holes => cross-drilled relief pattern.
  if (drillCount >= CROSS_DRILL_MIN) kinds.add("cross_drilled_relief_holes");

  // stepped_revolved_axis requires G96-confirmed lathe AND real cutting
  // evidence (a turning cycle OR a G1 feed cut). G96 is the only unambiguous
  // lathe signal, so a mill peck/contour program can never reach this.
  if (isLathe && (hasFeedCut || sawLatheTurnCycle)) kinds.add("stepped_revolved_axis");

  return { kinds: [...kinds], subprogramCalls };
}

export function inferPartClassFromNcPath(filePath, opts = {}) {
  const fallback = typeof opts.default === "string" && opts.default ? opts.default : "general";
  if (typeof filePath !== "string" || !filePath) return fallback;
  const lower = filePath.toLowerCase();
  for (const h of CNC_FILENAME_HEURISTICS) {
    if (lower.includes(h.needle)) return h.part_class;
  }
  return fallback;
}

/**
 * Single-pass analysis of one NC result. Tokenizes the content EXACTLY ONCE
 * and returns both the GT record (or null when the program shows no defensible
 * feature) and the per-file summary fields. This is the streaming primitive: a
 * corpus walker calls it once per file, accumulates via createBatchSummary(),
 * and never retains file content. The previous design tokenized the same text
 * twice — once in buildGtRecordFromNc, again in summarizeBatch — AND the CLI
 * retained every file's full text to feed summarizeBatch; ~16.5k NC files in
 * JM DIE/CNC LATHE alone made that unbounded retention OOM.
 *
 * @param {{file_path?:string, content?:string}} ncResult
 * @param {{part_class?:string, partClassDefault?:string}} [opts]
 * @returns {{record:object|null, parsed:boolean, units:string,
 *            hasFeatures:boolean, partClass:string|null}}
 */
export function analyzeNcResult(ncResult, opts = {}) {
  const miss = { record: null, parsed: false, units: "unknown", hasFeatures: false, partClass: null };
  if (!ncResult || typeof ncResult !== "object" || typeof ncResult.file_path !== "string") return { ...miss };
  if (typeof ncResult.content !== "string" || !ncResult.content) return { ...miss };
  const ops = tokenizeNc(ncResult.content);
  const { kinds, subprogramCalls } = evidenceFromNcOps(ops);
  const units = detectUnits(ncResult.content);
  const partClass = typeof opts.part_class === "string" && opts.part_class
    ? opts.part_class
    : inferPartClassFromNcPath(ncResult.file_path, { default: opts.partClassDefault });
  if (kinds.length === 0) {
    return { record: null, parsed: true, units, hasFeatures: false, partClass };
  }
  const record = {
    pdf_path: ncResult.file_path,
    cnc_source: ncResult.file_path,
    part_class: partClass,
    dimensions: kinds.map((k) => ({ kind: k, presence_only: true })),
    derivation: {
      source: "cnc-ground-truth-lib",
      units,
      op_count: ops.length,
      // >0 means cutting may live in unexpanded M98 subprograms — feature
      // coverage for this record is a lower bound, not exhaustive (R12).
      subprogram_calls: subprogramCalls,
    },
  };
  return { record, parsed: true, units, hasFeatures: true, partClass };
}

// Thin back-compat wrapper — delegates to the single-pass analyzer. Returns the
// GT record or null. Kept so existing callers and the U-TDP06 test suite need
// no change.
export function buildGtRecordFromNc(ncResult, opts = {}) {
  return analyzeNcResult(ncResult, opts).record;
}

export function groupRecordsByPartClass(records) {
  const grouped = new Map();
  for (const r of Array.isArray(records) ? records : []) {
    if (!r || typeof r.part_class !== "string") continue;
    if (!grouped.has(r.part_class)) grouped.set(r.part_class, []);
    grouped.get(r.part_class).push({
      pdf_path: r.pdf_path,
      cnc_source: r.cnc_source,
      dimensions: r.dimensions,
      derivation: r.derivation,
    });
  }
  const out = [];
  for (const [partClass, prints] of grouped.entries()) {
    out.push({ schemaVersion: 1, part_class: partClass, prints, source: "cnc-derived" });
  }
  return out;
}

/**
 * Streaming summary accumulator. Feed one analyzeNcResult() output per file via
 * .add(); read the running tally via .result(). Bounded memory — a corpus
 * walker never holds more than one file's content at a time. This is what lets
 * cnc-ground-truth-build.mjs walk the full ~16.5k-file JM Die NC corpus.
 *
 * Field semantics match the original summarizeBatch exactly:
 *   total      — every .add() call (a corpus file that was read)
 *   parsed     — files with usable content
 *   no_features— parsed files whose G-code showed no defensible feature kind
 *   gt_produced— parsed files that yielded >=1 feature kind
 *   byUnits    — parsed-file unit tally (inch / metric / unknown)
 *   byPartClass— gt_produced-file tally keyed by inferred part class
 *
 * @returns {{add:(analysis:object)=>void, result:()=>object}}
 */
export function createBatchSummary() {
  const out = {
    total: 0,
    parsed: 0,
    no_features: 0,
    gt_produced: 0,
    byUnits: { inch: 0, metric: 0, unknown: 0 },
    byPartClass: {},
  };
  return {
    add(analysis) {
      out.total += 1;
      if (!analysis || analysis.parsed !== true) return;
      out.parsed += 1;
      const u = typeof analysis.units === "string" ? analysis.units : "unknown";
      out.byUnits[u] = (out.byUnits[u] ?? 0) + 1;
      if (analysis.hasFeatures !== true) {
        out.no_features += 1;
        return;
      }
      out.gt_produced += 1;
      const pc = typeof analysis.partClass === "string" && analysis.partClass ? analysis.partClass : "general";
      out.byPartClass[pc] = (out.byPartClass[pc] ?? 0) + 1;
    },
    result() {
      return out;
    },
  };
}

// Back-compat batch summary — builds a streaming accumulator and feeds the
// whole array through it. Behavior is identical to the pre-streaming version
// (verified by the U-TDP06 parity test). Prefer createBatchSummary() directly
// for large corpora so file content is never retained.
export function summarizeBatch(ncResults) {
  const arr = Array.isArray(ncResults) ? ncResults : [];
  const acc = createBatchSummary();
  for (const r of arr) acc.add(analyzeNcResult(r));
  return acc.result();
}
