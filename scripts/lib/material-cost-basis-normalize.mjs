/**
 * material-cost-basis-normalize -- QUOTING-SYNERGY-MS0/U-QP-COST-BASIS-NORMALIZE (slot:charlie 2026-06-12).
 *
 * PURPOSE. The JM AP ledger (`state/shared/quoting/jm-vendor-ap-ledger.jsonl`,
 * 20,736 rows / ~$10M) carries the real INBOUND material cost basis (what JM
 * pays for raw stock). The DERIVED `jm-vendor-cost-index.json` only exposes a
 * units-BLENDED median ($/bar, $/foot, $/piece mixed) -- feeding that into a
 * quote is a UNITS ERROR (gotcha #25 / VendorCostIndexEngine.ts:206-215, charlie
 * soul refuse). This module normalizes the parseable `material`-category rows to
 * a density-FREE, units-correct $/in3 per grade -- the only grain a quote can
 * consume directly (material_cost = part_volume_in3 * usd_per_in3).
 *
 * WHY $/in3 AND NOT $/lb. $/lb needs a per-grade density (a physics constant we
 * must never inline -- safety rail). Volume is purely geometric: a block's 3 dims
 * fully determine in3; a round bar's diameter + length give in3. Both forms ->
 * $/in3 with ZERO density dependency, and the same grade should yield the same
 * $/in3 regardless of form -- that cross-form agreement is the correctness oracle
 * (verified live: H13 block 1.375x4x24=132in3/$157.5 = $1.19/in3 == round
 * 1-1/4 RD H13 $1.46/in / 1.227 in2-per-in = $1.19/in3).
 *
 * CONSERVATISM (charlie soul -- never units-error, never fabricate a number):
 *  - BLOCK form (grade + `A X B X C`) is PRIMARY: volume fully determined, $ from
 *    the row's own `line_amount`. Zero grain ambiguity.
 *  - ROUND bar (grade + `D RD`, qty=length-in-inches) is CORROBORATION ONLY: the
 *    qty=inches grain is a heuristic, so round $/in3 validates the block median
 *    but is reported separately, never blended into the primary figure.
 *  - FREIGHT-mislabeled rows, missing/zero dims, unparseable grade, non-finite or
 *    non-positive $/vol, and credits are EXCLUDED -- never guessed.
 *  - Outliers are trimmed by reporting median + IQR (robust), never the mean.
 *
 * Pure + side-effect-free; the CLI (`scripts/material-cost-basis-normalize.mjs`)
 * owns all I/O. Every export is independently testable.
 */

// Block rows need at least this many samples before the per-grade $/in3 is rated
// "high" confidence; fewer is "low-n" (real but thin).
const MIN_BLOCK_N_FOR_HIGH_CONF = 3;
// resolved_pct is a percent to one decimal place: round(ratio * 1000)/10.
const PCT_TENTHS = 1000;

// ---- Known JM material grades (recognition + alias normalization) ----------
// Grouping key only -- NO physics here. Dash-stripped match (H-13 -> H13). Source:
// the live `material`-category description corpus (ACTION METALS / ALRO STEEL).
const KNOWN_GRADES = new Set([
  "H13", "D2", "A2", "O1", "S7", "M2", "M4", "A6", "S5", "O6", "W1",
  "CPM1V", "CPM3V", "CPM10V", "CPMM4", "CPM9V",
  "4140", "4150", "4340", "8620", "1018", "1020", "1045", "1095", "12L14",
  "P20", "420", "420SS", "440C", "174", "304", "316", "6061", "7075",
  "A36", "1144", "52100", "GRAYIRON",
]);

/** Canonical grade label for a raw token (dash/space stripped, upper). null if unknown. */
export function normalizeGrade(rawToken) {
  if (typeof rawToken !== "string") return null;
  const t = rawToken.toUpperCase().replace(/[-\s]/g, "");
  return KNOWN_GRADES.has(t) ? t : null;
}

/** Scan a free-text description for the FIRST recognizable grade token. null if none. */
export function extractGrade(description) {
  if (typeof description !== "string" || !description) return null;
  // Tokenize on whitespace; also split glued forms like "8RD-H-13" / "RD-D-2".
  const tokens = description.toUpperCase().split(/[\s,]+/);
  for (const tok of tokens) {
    const g = normalizeGrade(tok);
    if (g) return g;
    for (const sub of tok.split(/[/()]/)) {
      const g2 = normalizeGrade(sub);
      if (g2) return g2;
    }
  }
  if (/GRAY\s+IRON/.test(description.toUpperCase())) return "GRAYIRON";
  return null;
}

/**
 * Remove recognized grade tokens from a description so an all-digit grade (4140,
 * 1018) or a digit-tailed grade (H13) cannot fuse its trailing digits into the
 * FIRST dimension via the mixed-number matcher (P0: "H13 3/4 X 4 X 24" was
 * mis-parsing dim[0] as 13.75, and "4140 3/4 ..." as 4140.75 -- a units error).
 * Whitespace-delimited tokens only; dims/forms never contain a known-grade token.
 */
export function stripGradeTokens(description) {
  if (typeof description !== "string") return "";
  return description.split(/(\s+)/).map((tok) => (normalizeGrade(tok) ? " " : tok)).join("");
}

/**
 * Parse an imperial dimension token into a decimal inch value.
 * Handles: "1.375" (decimal), "3/4" (fraction), "1-1/4" / "1-5/8" (mixed),
 * "2" (whole). Returns NaN on anything unparseable.
 */
export function parseInchValue(tok) {
  if (typeof tok !== "string") return NaN;
  const s = tok.trim();
  if (!s) return NaN;
  // mixed: whole-frac (a dash OR space separator), e.g. "1-1/4" or "1 1/4"
  let m = s.match(/^(\d+)[-\s](\d+)\/(\d+)$/);
  if (m) {
    const whole = Number(m[1]), num = Number(m[2]), den = Number(m[3]);
    if (den === 0) return NaN;
    return whole + num / den;
  }
  // pure fraction "3/4"
  m = s.match(/^(\d+)\/(\d+)$/);
  if (m) {
    const num = Number(m[1]), den = Number(m[2]);
    if (den === 0) return NaN;
    return num / den;
  }
  // decimal or whole
  if (/^\d*\.?\d+$/.test(s)) return Number(s);
  return NaN;
}

// A single inch-dimension token (decimal | fraction | mixed). Used to build the
// block + round matchers without re-stating the grammar. Alternation is ordered
// longest-first; `\d*\.\d+` (NOT `\d+\.\d+`) so leading-dot decimals like ".500"
// keep their value (a `\d+`-anchored pattern matched only the "500", a 1000x bug).
const DIM = "(?:\\d+[-\\s]\\d+\\/\\d+|\\d+\\/\\d+|\\d*\\.\\d+|\\d+)";
const BLOCK_RE = new RegExp(`(${DIM})\\s*X\\s*(${DIM})\\s*X\\s*(${DIM})`, "i");
const ROUND_RE = new RegExp(`(${DIM})\\s*(?:RD|ROUND)\\b`, "i");
const PIECE_MARKER_RE = /\b(\d+)\s*(?:PC|PCS|PIECE)\b/i;

/** True when the row's description is a freight line mis-filed under `material`. */
export function isFreightRow(description) {
  return typeof description === "string" && /FREIGHT/i.test(description);
}

/**
 * Normalize ONE AP-ledger row -> { grade, form, usd_per_in3, ... } or
 * { resolved:false, reason } when it can't be units-safely normalized.
 *
 * row: { description, qty, unit_cost, line_amount, is_credit, category }
 */
export function normalizeRow(row) {
  if (!row || typeof row !== "object") return { resolved: false, reason: "non-object-row" };
  if (row.is_credit === true) return { resolved: false, reason: "credit" }; // strict: a string "false" must NOT exclude a real row
  if (row.category !== "material") return { resolved: false, reason: "not-material" };
  const desc = typeof row.description === "string" ? row.description : "";
  if (isFreightRow(desc)) return { resolved: false, reason: "freight-mislabel" };

  const grade = extractGrade(desc);
  if (!grade) return { resolved: false, reason: "no-grade" };

  // Match dims on a grade-STRIPPED copy so the grade's digits can't bleed into
  // dim[0] (P0 fix). Grade extraction + piece/freight markers still use `desc`.
  const dimText = stripGradeTokens(desc);

  const lineAmount = Number(row.line_amount);
  const unitCost = Number(row.unit_cost);
  const qty = Number(row.qty);

  // -- BLOCK form (primary): A X B X C fully determines volume. --
  const bm = dimText.match(BLOCK_RE);
  if (bm) {
    const a = parseInchValue(bm[1]), b = parseInchValue(bm[2]), c = parseInchValue(bm[3]);
    if (![a, b, c].every((v) => Number.isFinite(v) && v > 0)) {
      return { resolved: false, reason: "block-dim-unparseable", grade };
    }
    // qty>1 is AMBIGUOUS on this corpus: ALRO bar rows put the full 12ft stock
    // length in the 3rd dim and use qty as a cut measure (inches/feet), NOT a
    // block count -- treating qty as block-count there gives a 100x volume error.
    // Conservative (charlie soul): accept ONLY a single finished block (qty===1 or
    // qty missing); qty>1 -> unresolved (a future "bar" form needs inch-vs-foot
    // disambiguation against the catalog). A qty=1 row is correct even when a dim
    // is a stock length (one 72in plate = full A*B*C, verified $1.58/in3 H13).
    if (Number.isFinite(qty) && qty > 1) {
      return { resolved: false, reason: "block-qty-gt-1-ambiguous", grade };
    }
    if (Number.isFinite(qty) && qty <= 0) {
      return { resolved: false, reason: "block-qty-nonpositive", grade }; // qty 0 / negative = data error, never a block
    }
    const volEach = a * b * c; // in3 per block
    const totalVol = volEach; // single finished block
    const count = 1;
    // $ for the row: prefer line_amount; fall back to unit_cost*count.
    const usd = Number.isFinite(lineAmount) && lineAmount > 0
      ? lineAmount
      : (Number.isFinite(unitCost) && unitCost > 0 ? unitCost * count : NaN);
    if (!(Number.isFinite(usd) && usd > 0) || !(totalVol > 0)) {
      return { resolved: false, reason: "block-no-usd-or-vol", grade };
    }
    const perIn3 = usd / totalVol;
    if (!(Number.isFinite(perIn3) && perIn3 > 0)) return { resolved: false, reason: "block-nonfinite", grade };
    return { resolved: true, grade, form: "block", usd_per_in3: perIn3, in3: totalVol, usd, dims: [a, b, c] };
  }

  // -- ROUND bar (ADVISORY ONLY): $/in3 = unit_cost / cross-section, ASSUMING
  // unit_cost == $/inch. This assumption is NOT verified per-vendor (could be
  // $/foot or $/lb), which is exactly why round never feeds the consumable figure
  // (aggregateByGrade keeps it advisory). `qty` is intentionally unused here. A
  // "3 PC" piece-count row's length is unknown -> excluded. --
  const rm = dimText.match(ROUND_RE);
  if (rm) {
    if (PIECE_MARKER_RE.test(desc)) return { resolved: false, reason: "round-piece-count-length-unknown", grade };
    const dia = parseInchValue(rm[1]);
    if (!(Number.isFinite(dia) && dia > 0)) return { resolved: false, reason: "round-dia-unparseable", grade };
    if (!(Number.isFinite(unitCost) && unitCost > 0)) return { resolved: false, reason: "round-no-unit-cost", grade };
    const crossSection = Math.PI * (dia / 2) ** 2; // in2 -> in3 per inch of length
    if (!(crossSection > 0)) return { resolved: false, reason: "round-bad-section", grade };
    const perIn3 = unitCost / crossSection; // ($/inch) / (in3/inch) = $/in3
    if (!(Number.isFinite(perIn3) && perIn3 > 0)) return { resolved: false, reason: "round-nonfinite", grade };
    return { resolved: true, grade, form: "round", usd_per_in3: perIn3, dia, unit_cost: unitCost };
  }

  return { resolved: false, reason: "no-form", grade };
}

/** Median of a numeric array (sorted copy). NaN on empty. */
export function median(arr) {
  const a = arr.filter((x) => Number.isFinite(x)).slice().sort((x, y) => x - y);
  if (a.length === 0) return NaN;
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

/** {p25, p75, iqr} of a numeric array. */
export function iqr(arr) {
  const a = arr.filter((x) => Number.isFinite(x)).slice().sort((x, y) => x - y);
  if (a.length === 0) return { p25: NaN, p75: NaN, iqr: NaN };
  const q = (p) => {
    const idx = (a.length - 1) * p;
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    return lo === hi ? a[lo] : a[lo] + (a[hi] - a[lo]) * (idx - lo);
  };
  const p25 = q(0.25), p75 = q(0.75);
  return { p25, p75, iqr: p75 - p25 };
}

/**
 * Aggregate normalized rows -> per-grade $/in3 basis.
 *
 * The CONSUMABLE figure (`usd_per_in3`) is BLOCK-ONLY -- qty=1 finished blocks
 * have exact volume (3 dims) + exact $ (line_amount) + zero unit ambiguity, which
 * is also the right basis for JM die-block quoting. Round/bar rows are ADVISORY
 * ONLY (`round_advisory_*`): their qty grain (inches vs feet vs lb) is ambiguous
 * AND raw bar is a cheaper cost regime than finished ground block, so a round
 * median is NOT interchangeable with the block figure (charlie soul: never emit a
 * units-ambiguous number as consumable). `finished_vs_raw_gap_pct` reports the
 * block-vs-round spread as INFORMATION (regime difference), never an error gate.
 *
 * confidence: high (>=MIN_BLOCK_N_FOR_HIGH_CONF block rows) | low-n (1-2) | none (0).
 * A `none` grade has usd_per_in3=null -- present for visibility, NOT consumable.
 */
export function aggregateByGrade(rows) {
  if (!Array.isArray(rows)) {
    return { grades: {}, summary: { total_rows: 0, resolved: 0, resolved_pct: 0, grade_count: 0, consumable_grade_count: 0, unresolved_reasons: {} } };
  }
  const norm = rows.map(normalizeRow);
  const byGrade = new Map();
  for (const r of norm) {
    if (!r.resolved) continue;
    if (!byGrade.has(r.grade)) byGrade.set(r.grade, { block: [], round: [] });
    byGrade.get(r.grade)[r.form].push(r.usd_per_in3);
  }
  const grades = {};
  for (const [grade, { block, round }] of byGrade) {
    const blockMedian = block.length ? median(block) : null;
    const roundMedian = round.length ? median(round) : null;
    let regimeGapPct = null;
    if (blockMedian != null && roundMedian != null && blockMedian > 0) {
      regimeGapPct = Math.abs(roundMedian - blockMedian) / blockMedian;
    }
    const confidence = block.length >= MIN_BLOCK_N_FOR_HIGH_CONF ? "high"
      : block.length >= 1 ? "low-n" : "none";
    grades[grade] = {
      usd_per_in3: blockMedian, // CONSUMABLE: block-only; null when no finished blocks
      confidence,
      block_n: block.length,
      block_iqr: block.length ? iqr(block) : null,
      round_advisory_median: roundMedian, // raw-bar, unit-ambiguous -- NOT consumable
      round_n: round.length,
      finished_vs_raw_gap_pct: regimeGapPct, // informational (regime diff), not an error
    };
  }
  const resolvedCount = norm.filter((r) => r.resolved).length;
  const reasons = {};
  for (const r of norm) if (!r.resolved) reasons[r.reason] = (reasons[r.reason] ?? 0) + 1;
  const consumable = Object.values(grades).filter((g) => g.confidence !== "none").length;
  return {
    grades,
    summary: {
      total_rows: rows.length,
      resolved: resolvedCount,
      // one-decimal percent: round to tenths (x1000 then /10), not bare toFixed.
      resolved_pct: rows.length ? Math.round((resolvedCount / rows.length) * PCT_TENTHS) / 10 : 0,
      grade_count: Object.keys(grades).length,
      consumable_grade_count: consumable, // grades with >=1 finished-block row
      unresolved_reasons: reasons,
    },
  };
}
