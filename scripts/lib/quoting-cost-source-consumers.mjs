// quoting-cost-source-consumers.mjs -- U-CLT-TRAINING-SOURCES (CLOSED-LOOP-TRAINING, slot:charlie).
//
// PURPOSE. quoting-train-cycle.mjs (QUOTING_DATA_SOURCES) lists 3 present-but-UNCONSUMED
// quoting data sources: docustrata_invoices, vendor_cost_index, tool_purchases. This module
// is the pure consumption logic for all three, cloned from the proven "outbound" /
// "docustrata_actuals" conditional-consumed pattern in quoting-train-cycle.mjs (never alters
// the calibration factor, never touches the CoV provenance gate -- ADVISORY only).
//
// Every function here is PURE (no fs/network I/O) so it is independently unit-testable; the
// CLI (quoting-train-cycle.mjs) owns all file reads + freshness checks against real mtimes.
//
// FRESHNESS PREFLIGHT (R12 -- never silently fold a stale source). Every arm below is gated by
// `checkFreshness()` at the call site in quoting-train-cycle.mjs BEFORE these pure functions
// run; a stale source degrades to a "source-stale" advisory, never silently included. This
// mirrors the charlie-soul freshness-preflight doctrine already codified in
// scripts/lib/quoting-baseline-guard.mjs / material-cost-basis-normalize.mjs (JSDoc reference
// only there -- no shared freshness fn existed yet, so this module is also the canonical home
// for `checkFreshness` going forward).
//
// UNITS DISCIPLINE (charlie soul, hard). jm-vendor-cost-index.json's category median is
// UNITS-BLENDED ($/bar, $/foot, $/piece mixed -- see VendorCostIndexEngine.ts:240-246 "DO NOT
// inject it into a customer quote as a per-unit cost"). This module NEVER folds that blended
// figure into a calibration verdict as if it were a clean $/in3 -- it is surfaced as a
// LOW-reliability advisory context number only, with an explicit `reliable:false` +
// `units_caveat` string. The units-CORRECT comparison uses jm-material-cost-basis.json's
// `usd_per_in3` (block-derived, exact volume -- the gotcha #25 path VendorCostIndexEngine
// already exposes via loadMaterialCostBasis/materialCostForVolume). This module's job is
// ONLY the training-side validation consumer (did the normalized basis look sane vs the raw
// blended index this cycle) -- it must NOT recompute or duplicate the quote-time cost-basis
// path that VendorCostIndexEngine.materialCostForVolume already owns.

// ---------------------------------------------------------------------------
// Freshness preflight (shared by all 3 arms)
// ---------------------------------------------------------------------------

/** Default max source age before an arm degrades to "source-stale" (R12). Override per call. */
export const DEFAULT_MAX_AGE_DAYS = 45;

/**
 * Pure freshness check: mtimeMs (from fs.statSync(path).mtimeMs) vs nowMs. Pure + injectable
 * (never touches fs itself -- the caller does the stat). Returns a structured verdict, never
 * throws -- a caller with an unreadable/missing file passes mtimeMs=null and gets
 * `present:false`.
 *
 * @param {number|null} mtimeMs
 * @param {number} nowMs
 * @param {number} [maxAgeDays]
 */
export function checkFreshness(mtimeMs, nowMs, maxAgeDays = DEFAULT_MAX_AGE_DAYS) {
  if (typeof mtimeMs !== "number" || !Number.isFinite(mtimeMs)) {
    return { present: false, fresh: false, age_days: null, max_age_days: maxAgeDays, reason: "source-missing" };
  }
  if (typeof nowMs !== "number" || !Number.isFinite(nowMs)) {
    return { present: true, fresh: false, age_days: null, max_age_days: maxAgeDays, reason: "bad-now" };
  }
  const ageMs = nowMs - mtimeMs;
  const ageDays = ageMs / 86_400_000;
  if (ageDays < 0) {
    // A future mtime (clock skew / corrupted stat) is refused, never trusted as "fresh".
    return { present: true, fresh: false, age_days: ageDays, max_age_days: maxAgeDays, reason: "future-mtime" };
  }
  const fresh = ageDays <= maxAgeDays;
  return { present: true, fresh, age_days: ageDays, max_age_days: maxAgeDays, reason: fresh ? null : "source-stale" };
}

// ---------------------------------------------------------------------------
// Arm 1: docustrata_invoices -- price-side, extends the actuals/calibration matching arm
// ---------------------------------------------------------------------------

/**
 * PROVENANCE GATE (3-of-3 finding, 2026-07-02 -- charlie soul: never pass synthetic as real).
 * docustrata-invoices.curated.json's own note declares its `actual_invoice_usd` values are
 * "hand-curated PLACEHOLDER values ... NOT extracted from real invoices" (8/10 rows carry
 * material:"PLACEHOLDER"). A price-side calibration verdict computed from placeholder revenue
 * and published as "real customer invoices" is exactly the synthetic-as-real class the charlie
 * refuse-list forbids, so the invoices arm REFUSES a synthetic source: consumed stays false
 * and the snapshot carries reason "source-synthetic-placeholder" until real invoice extraction
 * (U-QP-ACCOUNTING-WIRE / ERP credentials) replaces the fixture. Detection is deliberately
 * conservative: EITHER the source note self-declares PLACEHOLDER, OR >=50% of rows carry
 * material:"PLACEHOLDER". Pure.
 *
 * @param {{note?:string, invoices?:Array<object>}|null} sourceDoc  the parsed curated-invoices file
 */
export function detectSyntheticProvenance(sourceDoc) {
  const doc = sourceDoc && typeof sourceDoc === "object" ? sourceDoc : {};
  const note = typeof doc.note === "string" ? doc.note : "";
  const rows = Array.isArray(doc.invoices) ? doc.invoices : [];
  const notePlaceholder = /PLACEHOLDER/i.test(note);
  const placeholderRows = rows.filter((r) => r && r.material === "PLACEHOLDER").length;
  const rowsMajorityPlaceholder = rows.length > 0 && placeholderRows / rows.length >= 0.5;
  const synthetic = notePlaceholder || rowsMajorityPlaceholder;
  let noteExcerpt = null;
  if (notePlaceholder) {
    const idx = note.search(/PLACEHOLDER/i);
    noteExcerpt = note.slice(Math.max(0, idx - 60), idx + 140);
  }
  return {
    synthetic,
    marker: synthetic ? (notePlaceholder ? "note-declares-placeholder" : "material-placeholder-majority") : null,
    placeholder_rows: placeholderRows,
    total_rows: rows.length,
    note_excerpt: noteExcerpt,
  };
}

/**
 * Build the join_key the SAME way orders-closed-actuals.jsonl already does
 * (`${customer}|${part_id}`, exact case -- verified against the live 6,718-record corpus;
 * missing components coerce to empty string, matching the corpus's own partial keys like
 * "|250-050CAP" (2,351 of 6,718 actuals carry no customer)). Pure.
 */
export function invoiceJoinKey(customer, partId) {
  const c = typeof customer === "string" ? customer : "";
  const p = typeof partId === "string" ? partId : (partId == null ? "" : String(partId));
  return `${c}|${p}`;
}

/**
 * Dedupe docustrata_invoices.curated.json's `invoices[]` against the docustrata_actuals
 * join_key set so the SAME real order is never double-counted as two separate calibration
 * targets (the unit's explicit constraint). Pure. `actualsJoinKeys` is a Set<string> (or any
 * value with `.has()`) built by the caller from orders-closed-actuals.jsonl's `actuals[]`.
 *
 * Returns { unique, duplicates, total } where `unique` are invoices whose join_key is NOT
 * already present in the actuals corpus (safe to treat as an independent price observation);
 * `duplicates` names the overlapping join_keys (R12 -- never silently drop, always name what
 * was excluded and why).
 */
export function dedupeInvoicesAgainstActuals(invoices, actualsJoinKeys) {
  const list = Array.isArray(invoices) ? invoices : [];
  const has = actualsJoinKeys && typeof actualsJoinKeys.has === "function" ? actualsJoinKeys : new Set();
  const unique = [];
  const duplicates = [];
  for (const inv of list) {
    if (!inv || typeof inv !== "object") continue;
    const jk = invoiceJoinKey(inv.customer, inv.part_id);
    // A BOTH-empty join_key ("|") is NON-JOINABLE: the live actuals corpus carries 1,208
    // keyless "|" rows, so matching empty-on-empty would silently exclude a keyless invoice
    // as a "duplicate" of unrelated orders (the null-matches-everything trap). Keyless
    // invoices stay in `unique` -- over-counting risk is bounded by the arm being advisory.
    if (jk !== "|" && has.has(jk)) {
      duplicates.push(jk);
    } else {
      unique.push({ ...inv, join_key: jk });
    }
  }
  return { unique, duplicates, total: list.length };
}

/**
 * Price-side match: docustrata_invoices' `actual_invoice_usd` against PRISM's predicted FMV.
 * PRECONDITION: the caller has already run detectSyntheticProvenance() and REFUSED a
 * synthetic/PLACEHOLDER source -- this function only ever sees provenance-passed invoices
 * (charlie soul: never pass synthetic as real). Uses the SAME distribution-
 * match math as quoting-actuals-match.js (median_ratio / verdict), so the two price-target
 * sources (docustrata_actuals settled-POs vs docustrata_invoices curated invoices) report in
 * a directly-comparable shape. Pure -- `matchFn` is injected (the caller passes
 * matchPredictedToActuals from quoting-actuals-match.mjs) so this module never needs its own
 * copy of the distribution-summary math (R8: reuse, don't reimplement).
 *
 * @param {number[]} predictedAll        predicted FMV values (from report.predicted_fmv_usd_all)
 * @param {Array<object>} invoices       docustrata-invoices.curated.json's `invoices[]`
 * @param {Set<string>} actualsJoinKeys  join_key set from orders-closed-actuals.jsonl
 * @param {function} matchFn             matchPredictedToActuals(predicted, actual, opts)
 */
export function matchDocustrataInvoices(predictedAll, invoices, actualsJoinKeys, matchFn) {
  if (typeof matchFn !== "function") {
    return { ok: false, reason: "no-match-fn", advisory: true };
  }
  const { unique, duplicates, total } = dedupeInvoicesAgainstActuals(invoices, actualsJoinKeys);
  if (total === 0) {
    return { ok: false, reason: "no-invoices-on-disk", advisory: true, deduped: 0, duplicates_excluded: 0, total_invoices: 0 };
  }
  const prices = unique
    .map((i) => Number(i.actual_invoice_usd))
    .filter((v) => Number.isFinite(v) && v > 0);
  if (prices.length === 0) {
    return {
      ok: false,
      reason: duplicates.length === total ? "all-invoices-already-in-actuals" : "no-priceable-unique-invoices",
      advisory: true,
      deduped: unique.length,
      duplicates_excluded: duplicates.length,
      total_invoices: total,
    };
  }
  const predicted = Array.isArray(predictedAll) ? predictedAll.filter((v) => Number.isFinite(v) && v > 0) : [];
  const m = matchFn(predicted, prices);
  return {
    ...m,
    advisory: true,
    deduped: unique.length,
    duplicates_excluded: duplicates.length,
    total_invoices: total,
    units_note: "predicted FMV vs customer invoices (docustrata_invoices, curated; provenance-gated upstream -- synthetic/PLACEHOLDER sources are refused before this arm runs); dedupe against docustrata_actuals by customer|part_id join_key; never alters the factor",
  };
}

// ---------------------------------------------------------------------------
// Arm 2: vendor_cost_index -- cost-side ADVISORY (units-blended, reliability-flagged)
// ---------------------------------------------------------------------------

/**
 * Compare the units-CORRECT normalized material basis (jm-material-cost-basis.json's
 * `usd_per_in3` per grade, high/low-n confidence) against the units-BLENDED
 * jm-vendor-cost-index.json category median for `material`. This is the TRAINING-SIDE
 * validation consumer -- it does NOT feed a quote's material cost (VendorCostIndexEngine.
 * materialCostForVolume already owns that quote-time path via loadMaterialCostBasis; this
 * function never duplicates it, it only checks whether the normalized figure and the raw
 * blended index stay in the same order of magnitude this cycle -- a sanity/drift signal).
 *
 * Reliability rule (R12 -- never silently fold ambiguous units): the blended category median
 * mixes $/bar, $/foot, $/piece grains (VendorCostIndexEngine.ts:240-246 caveat), so ANY
 * comparison against it is capped at `reliable:false` UNLESS the normalized basis itself has
 * "high" confidence AND at least `minGradesForReliable` grades are present to average over
 * (a single-grade spot-check against a blended aggregate is not a reliable signal even with a
 * high-confidence single grade -- the blended side is still ambiguous). Pure.
 *
 * @param {Record<string, {usd_per_in3:number|null, confidence:string, block_n:number}>} materialBasisGrades
 *        jm-material-cost-basis.json's `.grades` map (already parsed).
 * @param {{count?:number, spend?:number, vendorCount?:number, unitCost?:{min?:number, median?:number, max?:number, n?:number}}|null} materialCategoryPrior
 *        jm-vendor-cost-index.json's `.categories.material` block (already parsed).
 * @param {{minGradesForReliable?: number}} [opts]
 */
export function vendorCostAdvisory(materialBasisGrades, materialCategoryPrior, opts = {}) {
  const minGradesForReliable = Number.isFinite(opts.minGradesForReliable) ? opts.minGradesForReliable : 3;
  const grades = materialBasisGrades && typeof materialBasisGrades === "object" ? materialBasisGrades : {};
  const consumableGrades = Object.entries(grades).filter(
    ([, g]) => g && typeof g.usd_per_in3 === "number" && Number.isFinite(g.usd_per_in3) && g.usd_per_in3 > 0,
  );
  if (consumableGrades.length === 0) {
    return { ok: false, reason: "no-consumable-grades-in-basis", advisory: true, reliable: false };
  }
  const blendedMedian = materialCategoryPrior?.unitCost?.median;
  if (typeof blendedMedian !== "number" || !Number.isFinite(blendedMedian) || blendedMedian <= 0) {
    return { ok: false, reason: "no-blended-material-prior", advisory: true, reliable: false };
  }
  const highConfCount = consumableGrades.filter(([, g]) => g.confidence === "high").length;
  const normalizedMedian = median(consumableGrades.map(([, g]) => g.usd_per_in3));
  // The blended median is $/UNIT (bar/foot/piece) and the normalized median is $/in3 -- these
  // are NOT directly comparable magnitudes (a units mismatch by construction, not a bug), so
  // this arm NEVER reports a ratio/verdict the way the price-side arms do. It reports the two
  // numbers side-by-side as context ONLY, with the reliability + units caveat always present
  // (R12 -- a units-ambiguous comparison must never look like a calibrated metric).
  const reliable = highConfCount >= minGradesForReliable;
  return {
    ok: true,
    advisory: true,
    reliable,
    reliability_reason: reliable
      ? null
      : `only ${highConfCount} high-confidence grade(s) in the normalized basis (need >=${minGradesForReliable}); the blended vendor-cost-index median is units-ambiguous ($/bar,$/foot,$/piece mixed)`,
    normalized_grade_count: consumableGrades.length,
    normalized_high_confidence_count: highConfCount,
    normalized_median_usd_per_in3: normalizedMedian,
    blended_index_median: blendedMedian,
    blended_index_n: materialCategoryPrior?.unitCost?.n ?? null,
    units_caveat: "normalized_median_usd_per_in3 is $/in3 (units-correct, block-derived); blended_index_median is a units-BLENDED $/unit (bar/foot/piece mixed, VendorCostIndexEngine.getCategoryPrior caveat) -- these are NOT the same grain and are reported side-by-side for drift visibility only, never as a ratio or calibration verdict",
  };
}

// ---------------------------------------------------------------------------
// Arm 3: tool_purchases -- cost-side ADVISORY (purchases vs consumption reconciliation)
// ---------------------------------------------------------------------------

/**
 * Reconcile tool_purchases (jm-tool-purchases.json `byType`, real vendor A/P spend) against
 * the ConsumableCostBasisEngine multiplier ledger (shop-floor CONSUMPTION reconciliation,
 * shipped 2026-07-01) -- this arm is PURCHASES, the ledger arm is CONSUMPTION; they are
 * siblings, not duplicates (per the unit spec). Reports, per tool type present in BOTH: the
 * raw purchase $/line-item, the ledger's reconciliation multiplier (if any), and whether the
 * purchase-side figure and the consumption-adjusted figure stay within a sane band -- ADVISORY
 * only, never writes back to the ledger (the ledger's own reconcile path owns writes).
 *
 * @param {Record<string, {count?:number, spend?:number}>} byType   jm-tool-purchases.json `.byType`
 * @param {{byType: Record<string, {multiplier?:number}>}} ledger   ConsumableCostBasisEngine.loadLedger() result
 * @param {{bandPct?: number}} [opts]
 */
export function toolPurchaseAdvisory(byType, ledger, opts = {}) {
  const bandPct = Number.isFinite(opts.bandPct) ? opts.bandPct : 0.5;
  const types = byType && typeof byType === "object" ? byType : {};
  const ledgerByType = ledger && typeof ledger === "object" && ledger.byType && typeof ledger.byType === "object" ? ledger.byType : {};
  const entries = Object.entries(types).filter(
    ([, v]) => v && typeof v.count === "number" && v.count > 0 && typeof v.spend === "number" && v.spend > 0,
  );
  if (entries.length === 0) {
    return { ok: false, reason: "no-priced-tool-types", advisory: true };
  }
  const perType = [];
  let reconciledCount = 0;
  for (const [type, v] of entries) {
    const purchaseUsdPerLineItem = v.spend / v.count;
    const rec = ledgerByType[type];
    const multiplier = rec && typeof rec.multiplier === "number" && Number.isFinite(rec.multiplier) ? rec.multiplier : null;
    const entry = {
      type,
      purchase_usd_per_line_item: purchaseUsdPerLineItem,
      purchase_line_item_count: v.count,
      purchase_total_spend: v.spend,
      consumption_multiplier: multiplier,
    };
    if (multiplier != null) {
      reconciledCount++;
      const consumptionAdjustedUsd = purchaseUsdPerLineItem * multiplier;
      const delta = purchaseUsdPerLineItem > 0 ? (consumptionAdjustedUsd - purchaseUsdPerLineItem) / purchaseUsdPerLineItem : null;
      entry.consumption_adjusted_usd_per_line_item = consumptionAdjustedUsd;
      entry.delta_pct = delta;
      entry.within_band = delta != null ? Math.abs(delta) <= bandPct : null;
    }
    perType.push(entry);
  }
  return {
    ok: true,
    advisory: true,
    type_count: perType.length,
    reconciled_with_consumption_ledger: reconciledCount,
    band_pct: bandPct,
    per_type: perType,
    units_note: "vendor A/P tool PURCHASES vs shop-floor CONSUMPTION reconciliation multipliers (ConsumableCostBasisEngine ledger); advisory only, never writes the ledger, never alters the calibration factor",
  };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Median of a numeric array; null on empty (all callers null-check before use). */
function median(arr) {
  const a = (Array.isArray(arr) ? arr : []).filter((x) => Number.isFinite(x)).slice().sort((x, y) => x - y);
  if (a.length === 0) return null;
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}
