#!/usr/bin/env node
/**
 * quoting-baseline-guard — defensive validation for the quoting training baseline.
 *
 * QUOTING-SYNERGY-MS0/U-QP-BASELINE-GUARD (slot:charlie 2026-06-01).
 * QUOTING-SYNERGY-MS0/U-QP-GUARD-VOLUME-AND-SYNTH (slot:charlie 2026-06-01):
 *   (1) low_unique_customers no longer FALSE-refuses a high-volume REAL corpus.
 *       The 47,905-record / 474-customer corpus (`baseline-records-corpus-with-real.json`,
 *       474 ~= jm-customers.jsonl's 473 real customers) was wrongly refused for a
 *       1% unique-RATIO. Collapsed attribution is fundamentally FEW ABSOLUTE distinct
 *       customers (the 7-Okuma stub), not a low ratio — a real shop is hundreds of
 *       customers x many parts each. The flag now needs BOTH a low ratio AND fewer
 *       than `minUniqueCustomers` (default 8) distinct customers.
 *   (2) new ADVISORY `synthetic_revenue_dominant` warning (does NOT refuse): flags a
 *       generated bootstrap corpus — revenue = modeled-cost x ~fixed markup over a
 *       quantized cost-input grid (the with-real corpus: markup CoV 8.3%, 4 distinct
 *       cut-times, overlay_report.match_pct=0 i.e. 0 real invoices matched). The data
 *       is admitted for training (self-consistency calibration is usable) but the
 *       operator is loudly told the factor is NOT real-world-grounded — honoring the
 *       soul refuse `training-on-stale-bootstrap-distribution-without-freshness-preflight`.
 *
 * WHY THIS EXISTS (R12 finding, 2026-06-01):
 *   `state/shared/quoting/baseline-records.json` was a degenerate BOOTSTRAP
 *   placeholder (source="jm-die-fleet-ledger"): 100 records, ALL
 *   actual_revenue_usd=10 (the REVENUE_FLOOR stub), 7 unique "customers" that
 *   are machine MODELS (Okuma_Multus_B250II, Okuma_LB-3000EX, Okuma_LNC8 ...).
 *   A read-only `quoting-train-cycle.mjs --no-write` produced MAPE 1880.99%
 *   while still reporting safe_to_activate=true — i.e. a write-mode retrain
 *   would have ACTIVATED a 1881%-MAPE calibration factor.
 *
 *   The iter58 `quoting-baseline-from-corpus.mjs` rewrite fixed the original
 *   Okuma-as-customer poisoning by switching the SOURCE, not by adding a
 *   defensive filter — so nothing in the baseline-build path rejects a
 *   machine-name customer, and the poisoning recurs whenever the source is
 *   dirty (the iter58 lesson, [[reference_charlie_quoting_data_ceiling]]).
 *
 * This module is the executable form of the charlie-soul freshness preflight
 * (refuses: training-on-stale-bootstrap-distribution-without-freshness-preflight,
 * non-conservative-customer-name-filter, softening-quote-vs-actual-reconciliation-thresholds).
 *
 * PURE — no I/O, no inline shop-rate/margin constants. Thresholds are named
 * statistical knobs (not physics/rate constants), defaulted + overridable.
 *
 * Exports:
 *   - isMachineNameCustomer(name)            -> boolean (conservative, separator-aware)
 *   - detectDegeneracy(records, opts)        -> stats + flags[] (refuse) + warnings[] (advisory)
 *   - validateBaseline(records, opts)        -> { ok, refuse, reasons[], warnings[], clean_records[], ... }
 *   - MACHINE_BUILDERS, MODEL_FAMILY_TOKENS  (frozen sets — for tests/introspection)
 */

// Known CNC machine-tool BUILDERS (whole-token, lowercase). Conservative: only
// unambiguous machine-tool brands. Deliberately EXCLUDES cutting-tool / material
// vendors (Sandvik, Kennametal, Mitsubishi Materials, ...) — those are legitimate
// quoting COST vendors and must never be mistaken for a machine-as-customer.
export const MACHINE_BUILDERS = Object.freeze(new Set([
  "okuma", "mazak", "haas", "doosan", "dmg", "mori", "makino", "matsuura",
  "hardinge", "kitamura", "nakamura", "hurco", "fanuc", "fadal",
  "kuraki", "toyoda", "willemin", "chiron", "hermle",
  "tsugami", "tornos", "mikron", "quaser", "hyundai",
  "hwacheon", "femco", "johnford", "leadwell", "ycm",
]));

// AMBIGUOUS builders (P1 fix, reviewer B 2026-06-01): real CNC builders whose
// token is ALSO a common English word / non-CNC company name (Brother printers,
// Citizen watches, Goodway tube-cleaning, Grob aircraft). A real customer with
// one of these words + an unrelated alphanumeric token (a cert like AS9100/ISO9001,
// a product like i9/G5) would trip the plain double-gate and be SILENTLY DROPPED —
// the cardinal sin. So these require model-FAMILY evidence (multus/speedio/...),
// NOT a bare model code, to flag. "Brother Speedio S700X1" still flags (speedio);
// "Brother AS9100" / "Citizen i9 Systems" do not.
export const AMBIGUOUS_BUILDERS = Object.freeze(new Set([
  "brother", "spinner", "feeler", "citizen", "goodway", "grob",
]));

// Machine MODEL-family tokens — appear ONLY in machine designations, never in a
// real customer company name. A standalone family token is itself machine-evidence.
export const MODEL_FAMILY_TOKENS = Object.freeze(new Set([
  "multus", "integrex", "genos", "robodrill", "speedio", "nlx", "quickturn",
  "lnc", "puma", "lynx", "mynx", "nhx", "nvx", "mcv", "vcn", "hcn", "dnm",
]));

// A model code is a token that mixes LETTERS and DIGITS (b250ii, 3000ex, i200,
// vf2, 4ss, a51nx, l200e). It must NOT be a bare number (250 = a suite/street
// number) nor a unit/ordinal (10mm, 2x, 5th) — those collide with real customer
// names. Pure-number machine models (QuickTurn 250, Puma 2600) are still caught
// via their model-FAMILY token, so dropping bare numbers here costs no recall.
const MODEL_CODE_RE = /^(?=[a-z0-9]*\d)(?=[a-z0-9]*[a-z])[a-z0-9]{2,}$/i;

// ordinal / unit tokens that LOOK numeric-with-suffix but never denote a machine
// model. Excluded from model-evidence so a builder-WORD customer (brother,
// spinner, feeler, goodway) + an ordinal/dimension is NOT mis-flagged.
// P1-B fix (reviewer A, 2026-06-01): "Brother International 10mm Division" /
// "Spinner Industries 3rd Floor" must NOT be dropped as machines.
const ORDINAL_UNIT_TOKEN = /^\d+(?:th|nd|rd|st|mm|cm|in|ft|pc|ea|oz|lb|kg|hr|hp|kw|psi|rpm|x)$/i;

// P1-A (reviewer A, 2026-06-01) — KNOWN, DELIBERATE conservatism boundary:
// hyphen/space-separated SINGLE-digit models ("Haas VF-2" -> tokens [haas,vf,2])
// are NOT flagged per-name, because "2" alone is indistinguishable from a street
// number / quantity and broadening to catch it would re-introduce the P1-B class
// of false positives. This is a false-NEGATIVE only (a machine row survives the
// per-name filter) and is backstopped by detectDegeneracy's
// machine_builder_word_prevalence flag (`haas` IS a builder word, so a baseline
// dominated by such names is refused regardless of revenue variance) plus the
// constant_revenue / low_unique_customers flags. For a customer-name filter,
// erring toward conservatism (never DROP a real customer) is the correct trade —
// the degeneracy flags refuse the whole baseline loudly instead.

function tokenize(name) {
  return String(name ?? "")
    .toLowerCase()
    .split(/[\s_\-/.,()[\]]+/)
    .filter(Boolean);
}

// model-FAMILY evidence: a token that is ONLY ever a machine designation
// (multus, integrex, speedio, lnc8 -> lnc). Strong enough to flag even an
// ambiguous-builder (Brother/Citizen) customer.
function isModelFamily(token) {
  if (MODEL_FAMILY_TOKENS.has(token)) return true;
  const base = token.replace(/\d+$/, ""); // lnc8 -> lnc
  return base.length >= 2 && MODEL_FAMILY_TOKENS.has(base);
}

// model-CODE evidence: an alphanumeric code (letters+digits, e.g. b250ii, vf2,
// 4ss). Weaker than a family token — a cert/product code (AS9100, i9, G5) also
// matches — so it only flags alongside an UNAMBIGUOUS builder, never an ambiguous one.
function isModelCode(token) {
  if (ORDINAL_UNIT_TOKEN.test(token)) return false; // 10mm, 5th, 2x — never a model code
  return MODEL_CODE_RE.test(token);
}

/**
 * isMachineNameCustomer — TRUE only when a string is a CNC machine designation
 * masquerading as a customer. Conservative double-gate:
 *   (builder token present  AND  model-evidence token present)
 *   OR a standalone unambiguous model-family token (multus/integrex/...).
 * Never flags a real company name (no builder token => never machine).
 */
export function isMachineNameCustomer(name) {
  const tokens = tokenize(name);
  if (tokens.length === 0) return false;
  let hasUnambigBuilder = false;
  let hasAmbigBuilder = false;
  let hasModelCode = false;
  let hasModelFamily = false;
  let standaloneFamily = false;
  for (const t of tokens) {
    if (MACHINE_BUILDERS.has(t)) hasUnambigBuilder = true;
    if (AMBIGUOUS_BUILDERS.has(t)) hasAmbigBuilder = true;
    if (isModelFamily(t)) hasModelFamily = true;
    else if (isModelCode(t)) hasModelCode = true;
    // a long unambiguous family token alone is conclusive
    if (MODEL_FAMILY_TOKENS.has(t) && t.length >= 5) standaloneFamily = true;
  }
  const hasModel = hasModelFamily || hasModelCode;
  // unambiguous builder: any model evidence (code OR family).
  // ambiguous builder (Brother/Citizen/...): model-FAMILY evidence ONLY — a bare
  // code (AS9100/i9/G5) is not enough, so a real customer is never silently dropped.
  return (
    (hasUnambigBuilder && hasModel) ||
    (hasAmbigBuilder && hasModelFamily) ||
    standaloneFamily
  );
}

/**
 * detectDegeneracy — surface the statistical fingerprints of a poisoned /
 * placeholder baseline. Returns stats + human-readable flags[] (honest units).
 * All flags gate on minRecords so a tiny baseline is never falsely flagged.
 */
export function detectDegeneracy(records, opts = {}) {
  const {
    maxMachineShare = 0.2,
    minRecords = 5,
    maxRevenueValueShare = 0.9,
    minUniqueCustomerRatio = 0.1,
    // U-QP-GUARD-VOLUME-AND-SYNTH (2026-06-01): absolute distinct-customer floor.
    // The ratio test alone false-refused a 47,905-record / 474-customer REAL corpus
    // (1% ratio). Collapsed attribution is FEW ABSOLUTE distinct customers (the
    // 7-Okuma stub), not a low ratio — so the flag now requires BOTH a low ratio AND
    // fewer than this many distinct customers. 8 sits just above the observed
    // degenerate 7; the degenerate-100 case is triple-caught (machine + constant + this).
    minUniqueCustomers = 8,
    // synthetic-revenue fingerprint knobs (advisory WARN, NEVER a refuse): a generated
    // bootstrap corpus produces revenue = modeled_cost x ~fixed markup over a tiny grid
    // of quantized cost inputs. Real outbound actuals scatter (rush/volume/scrap/bids).
    maxSyntheticMarkupCoV = 0.15,
    minDistinctTimeInCut = 10,
    minScorableForSynth = 20,
  } = opts;

  const recs = Array.isArray(records) ? records : [];
  const total = recs.length;

  const customers = recs
    .map((r) => String(r?.customer ?? "").trim())
    .filter(Boolean);
  const uniqueCustomers = new Set(customers.map((c) => c.toLowerCase())).size;

  const revVals = new Map();
  for (const r of recs) {
    const v = Number(r?.actual_revenue_usd);
    const key = Number.isFinite(v) ? String(v) : "NaN";
    revVals.set(key, (revVals.get(key) || 0) + 1);
  }
  const revenueUniqueValues = revVals.size;
  let maxRevShare = 0;
  for (const n of revVals.values()) {
    maxRevShare = Math.max(maxRevShare, n / Math.max(1, total));
  }

  const machineNameCount = recs.filter((r) => isMachineNameCustomer(r?.customer)).length;
  const machineNameShare = total ? machineNameCount / total : 0;
  const uniqueRatio = total ? uniqueCustomers / total : 0;

  // P1-#2 backstop (reviewer B 2026-06-01): independent of per-name model matching.
  // Catches builder + bare-number models with no family token (Haas 2600, Mazak 350)
  // that isMachineNameCustomer deliberately does NOT flag. Counts a record iff it has
  // an UNAMBIGUOUS builder token OR is a full machine-name match — it does NOT count
  // ambiguous-builder-only customers (Goodway Technologies, Brother Industries), so a
  // diverse REAL baseline heavy in those English words is not falsely refused (the P2
  // reviewer B raised). This is a degeneracy SIGNAL (fail-loud whole-baseline refusal
  // with a reason), never a silent per-record drop.
  const builderWordCount = recs.filter((r) => {
    const toks = tokenize(r?.customer);
    return toks.some((t) => MACHINE_BUILDERS.has(t)) || isMachineNameCustomer(r?.customer);
  }).length;
  const builderWordShare = total ? builderWordCount / total : 0;

  // synthetic-revenue fingerprint (U-QP-GUARD-VOLUME-AND-SYNTH, advisory). A generated
  // bootstrap corpus sets revenue = modeled_cost x ~fixed markup over a quantized grid.
  // modeled_cost = rate*(time/3600) + material — the universal job-cost identity; the
  // rate/time/material all come from the RECORD (no inline shop-rate constants). Only
  // records carrying all three inputs + a finite revenue are scorable.
  const markups = [];
  const timeInCutSet = new Set();
  for (const r of recs) {
    const rev = Number(r?.actual_revenue_usd);
    const t = Number(r?.estimated_time_in_cut_s);
    const rate = Number(r?.machine_rate_usd_per_hr);
    const mat = Number(r?.estimated_material_spend_usd);
    if (Number.isFinite(t)) timeInCutSet.add(t);
    const cost = rate * (t / 3600) + mat;
    // Only POSITIVE-markup rows belong to the synthetic fingerprint population. A
    // negative/zero markup (credit-memo / refund / return — legitimate in a real
    // outbound corpus) is excluded so it can never leave markupMean<=0, skip the
    // variance branch, and fire a nonsensical "markup mean -X.XXx" advisory
    // (3-of-3 P2 consensus, 2026-06-01).
    if (Number.isFinite(rev) && Number.isFinite(cost) && cost > 0 && rev > 0) markups.push(rev / cost);
  }
  const scorableForSynth = markups.length;
  let markupMean = 0;
  let syntheticMarkupCoV = 0;
  if (scorableForSynth > 0) {
    markupMean = markups.reduce((a, b) => a + b, 0) / scorableForSynth;
    if (markupMean > 0) {
      const variance =
        markups.reduce((a, b) => a + (b - markupMean) ** 2, 0) / scorableForSynth;
      syntheticMarkupCoV = Math.sqrt(variance) / markupMean;
    }
  }
  const distinctTimeInCut = timeInCutSet.size;

  const flags = [];
  if (total >= minRecords && machineNameShare > maxMachineShare) {
    flags.push(
      `machine_name_customers=${machineNameCount}/${total} ` +
        `(${(machineNameShare * 100).toFixed(0)}% > ${(maxMachineShare * 100).toFixed(0)}% threshold) ` +
        `— machine models seeded as customers (e.g. Okuma_Multus_B250II)`,
    );
  } else if (total >= minRecords && builderWordShare > maxMachineShare) {
    flags.push(
      `machine_builder_word_prevalence=${builderWordCount}/${total} ` +
        `(${(builderWordShare * 100).toFixed(0)}% > ${(maxMachineShare * 100).toFixed(0)}% threshold) ` +
        `— customers dominated by machine-builder names even where no model code matched (e.g. Haas 2600)`,
    );
  }
  if (total >= minRecords && revenueUniqueValues <= 1) {
    flags.push(
      `constant_revenue=all ${total} records share ONE actual_revenue_usd value ` +
        `— a synthetic floor/stub, not real outbound pricing`,
    );
  } else if (total >= minRecords && maxRevShare >= maxRevenueValueShare) {
    flags.push(
      `near_constant_revenue=${(maxRevShare * 100).toFixed(0)}% of records share one ` +
        `actual_revenue_usd value (>= ${(maxRevenueValueShare * 100).toFixed(0)}% threshold)`,
    );
  }
  // U-QP-GUARD-VOLUME-AND-SYNTH: collapsed attribution requires BOTH a low ratio AND
  // few ABSOLUTE distinct customers. A high-volume real corpus (474 distinct > floor)
  // is no longer false-refused for a 1% ratio; the 7-Okuma stub (7 < 8) is still caught.
  if (
    total >= minRecords &&
    uniqueRatio < minUniqueCustomerRatio &&
    uniqueCustomers < minUniqueCustomers
  ) {
    flags.push(
      `low_unique_customers=${uniqueCustomers}/${total} unique ` +
        `(${(uniqueRatio * 100).toFixed(0)}% < ${(minUniqueCustomerRatio * 100).toFixed(0)}% ratio ` +
        `AND ${uniqueCustomers} < ${minUniqueCustomers} distinct) — collapsed customer attribution`,
    );
  }

  // ADVISORY warnings — surfaced loudly but NEVER cause refuse. The data is usable for
  // self-consistency calibration; it just must not be MISLABELED as real-world-grounded.
  const warnings = [];
  if (
    scorableForSynth >= minScorableForSynth &&
    markupMean > 0 &&
    syntheticMarkupCoV < maxSyntheticMarkupCoV &&
    distinctTimeInCut < minDistinctTimeInCut
  ) {
    warnings.push(
      `synthetic_revenue_dominant=revenue is a near-fixed multiple of modeled cost ` +
        `(markup mean ${markupMean.toFixed(2)}x, CoV ${(syntheticMarkupCoV * 100).toFixed(1)}% < ` +
        `${(maxSyntheticMarkupCoV * 100).toFixed(0)}%) over a quantized cost-input grid ` +
        `(${distinctTimeInCut} distinct time-in-cut values < ${minDistinctTimeInCut}) ` +
        `— a generated bootstrap distribution, NOT real outbound pricing; a calibration ` +
        `factor derived from this measures self-consistency, not real-world accuracy`,
    );
  }

  return {
    total,
    uniqueCustomers,
    revenueUniqueValues,
    maxRevenueValueShare: maxRevShare,
    machineNameCount,
    machineNameShare,
    builderWordCount,
    builderWordShare,
    uniqueRatio,
    syntheticMarkupCoV,
    markupMean,
    distinctTimeInCut,
    scorableForSynth,
    flags,
    warnings,
  };
}

/**
 * validateBaseline — the train-cycle preflight gate. REFUSES (refuse=true,
 * ok=false) when the baseline shows any degeneracy fingerprint. Always returns
 * clean_records (machine-name customers filtered out) so a caller MAY train on
 * the cleaned subset once the degeneracy is otherwise resolved — but a fully
 *
 * CAUTION (3-of-3 arm-A 2026-06-01): the wired train-cycle deliberately trains on
 * the ORIGINAL records, NOT clean_records — so the gate is binary go/no-go and
 * cannot drop a real customer. Do NOT train on clean_records without re-checking
 * the surname-collision vector first: an unambiguous-builder token that is also a
 * surname (Mori/Haas/Fadal) + a cert/product code (AS9100/i9) flags as a machine
 * and would be filtered out. clean_records is a convenience export, not the
 * training input.
 * degenerate baseline (the current state) refuses outright. Fail-loud by design.
 */
export function validateBaseline(records, opts = {}) {
  const recs = Array.isArray(records) ? records : [];
  const deg = detectDegeneracy(recs, opts);
  const cleanRecords = recs.filter((r) => !isMachineNameCustomer(r?.customer));
  const reasons = [...deg.flags];
  const refuse = reasons.length > 0;
  return {
    ok: !refuse,
    refuse,
    reasons,
    warnings: deg.warnings ?? [],
    total: deg.total,
    poisoned: deg.machineNameCount,
    clean_count: cleanRecords.length,
    clean_records: cleanRecords,
    degeneracy: deg,
  };
}
