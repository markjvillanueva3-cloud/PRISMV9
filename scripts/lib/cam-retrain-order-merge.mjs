/**
 * cam-retrain-order-merge.mjs — the WRITE side of the offline CAM self-improving loop
 * (U-CAM-RETRAIN-LIFECYCLE). Closes the loop that cam-learned-order-store.mjs only opened the
 * LOAD half of: a corpus retrain now AUTO-MERGES the high-confidence pairwise disagreements JM's
 * 16,558-program corpus has with PRISM's LATHE_OP_ORDER back INTO the persisted learned-op-order,
 * under the SAME manufacturing-invariant guards the store enforces, and only PROMOTES the result
 * if it measurably does NOT regress sequence fidelity against the corpus.
 *
 * Before this module: cam-learn-order-run.mjs computed `disagreements` but `disagreements_applied`
 * was always 0 — a retrain refreshed provenance/audit but never CHANGED the order. The loop was
 * self-MEASURING, not self-IMPROVING. This module is the missing merge + promote-gate.
 *
 * DESIGN (why it is safe to auto-apply corpus data to a safety-relevant ordering):
 *   1. Each disagreement is a "JM does `first` before `second`, PRISM ranks it after" precedence.
 *      We apply it as a list-move (move `first` just before `second`) and RE-VALIDATE the whole
 *      order with the store's validateOrderMap. A move that would break a manufacturing invariant
 *      (facing-first, parting-last, rough-before-finish) is REJECTED, never applied. The invariants
 *      ALWAYS win over a corpus statistic — a corpus fluke can never create a parting-first order.
 *   2. After merging, we RE-SCORE the candidate order against the corpus (Kendall sequence fidelity,
 *      the offline loop's real signal) and PROMOTE only if fidelity does not regress AND at least one
 *      disagreement was applied. A merge that doesn't help is a no-op (R12: never persist a change we
 *      cannot show is at worst neutral).
 *
 * Pure (no I/O). Composes the store's invariant validator + the offline loop's oracle (no duplication,
 * R8). The CLI that reads the corpus + persists is cam-retrain-order-run.mjs.
 */
import { validateOrderMap, sortOrderMap } from "./cam-learned-order-store.mjs";
import { scoreGeneratedVsCorpus } from "./cam-offline-loop.mjs";

/** Default minimum mean-fidelity delta required to PROMOTE (0 = "must not regress"; equal allowed). */
export const DEFAULT_MIN_IMPROVE = 0;

/** consecutive de-dupe so a multi-pass family repeat doesn't distort the family set / scoring. */
function dedupeSeq(seq) {
  return seq.filter((f, i) => i === 0 || f !== seq[i - 1]);
}

/** Families of an order map as an ordered list (rank asc, then name) — the canonical total order. */
export function orderToList(order) {
  return Object.entries(order)
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
    .map(([fam]) => fam);
}

/** A family list back to a rank map (1-based × step). step keeps ranks sparse for clean diffs. */
export function listToOrder(list, step = 10) {
  const order = {};
  list.forEach((fam, i) => { order[fam] = (i + 1) * step; });
  return order;
}

/** Move `x` to immediately BEFORE `y` in a copy of `list` (no-op if x===y or either missing). */
function moveBefore(list, x, y) {
  if (x === y || !list.includes(x) || !list.includes(y)) return [...list];
  const out = list.filter((f) => f !== x);
  out.splice(out.indexOf(y), 0, x);
  return out;
}

/** Is `first` before `second` in `list`? (both must be present) */
function isBefore(list, first, second) {
  const fi = list.indexOf(first), si = list.indexOf(second);
  return fi >= 0 && si >= 0 && fi < si;
}

/**
 * Merge corpus disagreements into the current order under the invariant guard. Pure.
 *
 * @param {Record<string,number>} currentOrder  family -> rank (lower = earlier)
 * @param {Array<{jm_dominant:[string,string], jm_confidence?:number, jm_support?:number}>} disagreements
 *        each says JM does jm_dominant[0] BEFORE jm_dominant[1] (from compareToLatheOrder).
 * @param {{validate?:Function}} [io]  injectable validator (defaults to the store's validateOrderMap)
 * @returns {{order:Record<string,number>, applied:Array, skipped:Array, netSatisfied:number, baseValid:boolean}}
 */
export function mergeDisagreements(currentOrder, disagreements, { validate = validateOrderMap } = {}) {
  if (currentOrder == null || typeof currentOrder !== "object" || Array.isArray(currentOrder)) {
    throw new Error("mergeDisagreements: currentOrder must be a family->rank object");
  }
  if (!Array.isArray(disagreements)) {
    throw new Error("mergeDisagreements: disagreements[] is required");
  }
  // The base order MUST already be valid — we are refining a known-good order, not repairing a broken
  // one (a broken base is a producer bug, fail loud rather than silently "fix" via corpus stats).
  const baseV = validate(currentOrder);
  if (!baseV.valid) throw new Error(`mergeDisagreements: base order is invalid (${baseV.reason}) — refusing to merge onto a broken order`);

  // Strongest signals first (support * confidence) so a high-confidence pair wins a conflict with a
  // weaker one; defensive re-sort (compareToLatheOrder already sorts, but never trust caller order).
  const ranked = [...disagreements].sort(
    (a, b) => ((b.jm_support ?? 0) * (b.jm_confidence ?? 0)) - ((a.jm_support ?? 0) * (a.jm_confidence ?? 0)),
  );

  let list = orderToList(currentOrder);
  const applied = [];
  const skipped = [];
  for (const d of ranked) {
    const dom = d && d.jm_dominant;
    if (!Array.isArray(dom) || dom.length !== 2) { skipped.push({ d, reason: "bad-disagreement-shape" }); continue; }
    const [first, second] = dom;
    if (!list.includes(first) || !list.includes(second)) { skipped.push({ d, reason: "family-not-in-order" }); continue; }
    if (isBefore(list, first, second)) { skipped.push({ d, reason: "already-satisfied" }); continue; }
    const trial = moveBefore(list, first, second);
    const trialOrder = listToOrder(trial);
    const v = validate(trialOrder);
    // v.reason is already namespaced (e.g. "invariant-violation:facing-not-earliest") — don't double-prefix.
    if (!v.valid) { skipped.push({ d, reason: v.reason }); continue; }
    list = trial;
    applied.push(d);
  }

  // Honest accounting (R12): a later move may have re-separated an earlier applied pair. Report how
  // many applied disagreements are STILL satisfied in the final list — the final order is always
  // valid (every accepted step was validated), this is just truthful provenance.
  const netSatisfied = applied.filter((d) => isBefore(list, d.jm_dominant[0], d.jm_dominant[1])).length;

  return { order: sortOrderMap(listToOrder(list)), applied, skipped, netSatisfied, baseValid: true };
}

/**
 * Score an op-order map against a corpus of real family sequences using the offline loop's oracle.
 * For each program we re-rank JM's OWN families by the candidate order and measure Kendall sequence
 * fidelity vs JM's actual order — isolating exactly the signal the order map controls (coverage is
 * trivially 1 by construction, so it is NOT the gate metric; we report mean sequence fidelity). Pure.
 *
 * @param {Record<string,number>} order
 * @param {string[][]} refSequences  per-program JM family sequences
 * @returns {{meanFidelity:number, programsScored:number, totalInversions:number, perfectPrograms:number}}
 */
export function scoreOrderAgainstCorpus(order, refSequences) {
  if (order == null || typeof order !== "object" || Array.isArray(order)) {
    throw new Error("scoreOrderAgainstCorpus: order must be a family->rank object");
  }
  if (!Array.isArray(refSequences)) throw new Error("scoreOrderAgainstCorpus: refSequences[][] is required");
  const rankOf = (f) => (Object.prototype.hasOwnProperty.call(order, f) ? order[f] : Number.POSITIVE_INFINITY);
  let fidSum = 0, scored = 0, inversions = 0, perfect = 0;
  for (const raw of refSequences) {
    if (!Array.isArray(raw)) continue;
    const fams = dedupeSeq(raw.filter(Boolean));
    if (fams.length === 0) continue;
    // generation = JM's families re-ordered by the candidate ranks (stable on equal ranks).
    // scoreGeneratedVsCorpus consumes op OBJECTS keyed on `.family` (offline-loop contract), so wrap.
    const orderedFams = [...fams].sort((a, b) => (rankOf(a) - rankOf(b)) || fams.indexOf(a) - fams.indexOf(b));
    const s = scoreGeneratedVsCorpus(
      { ordered_ops: orderedFams.map((f) => ({ family: f })) },
      { ops: fams.map((f) => ({ family: f })) },
    );
    fidSum += s.sequence_fidelity;
    inversions += Array.isArray(s.inversions) ? s.inversions.length : 0;
    if (s.sequence_fidelity >= 1) perfect++;
    scored++;
  }
  return {
    meanFidelity: scored === 0 ? 1 : Number((fidSum / scored).toFixed(4)),
    programsScored: scored,
    totalInversions: inversions,
    perfectPrograms: perfect,
  };
}

/**
 * Full retrain evaluation: merge disagreements, re-score current vs candidate, decide PROMOTE. Pure.
 * Promote IFF: at least one disagreement applied AND the candidate is a valid order AND the candidate
 * mean fidelity does not regress (>= current + minImprove). Otherwise keep current and say why.
 *
 * @param {{currentOrder:object, disagreements:Array, refSequences:string[][], minImprove?:number, validate?:Function}} args
 * @returns {{promote:boolean, reason:string, candidateOrder:object, applied:Array, skipped:Array,
 *            netSatisfied:number, currentFidelity:number, candidateFidelity:number, fidelityDelta:number,
 *            programsScored:number}}
 */
export function evaluateRetrain({ currentOrder, disagreements, refSequences, minImprove = DEFAULT_MIN_IMPROVE, validate = validateOrderMap } = {}) {
  const merged = mergeDisagreements(currentOrder, disagreements, { validate });
  const cur = scoreOrderAgainstCorpus(currentOrder, refSequences);
  const cand = scoreOrderAgainstCorpus(merged.order, refSequences);
  const delta = Number((cand.meanFidelity - cur.meanFidelity).toFixed(4));
  const candValid = validate(merged.order);

  let promote = false;
  let reason;
  if (merged.applied.length === 0) {
    reason = "no-op: no disagreement applied (corpus already agrees with the persisted order, or all conflicted with invariants)";
  } else if (!candValid.valid) {
    // Defensive — mergeDisagreements only accepts validated steps, so this should be unreachable.
    reason = `candidate-invalid:${candValid.reason} (kept current — invariant guard)`;
  } else if (delta < minImprove) {
    reason = `regression-guard: candidate fidelity ${cand.meanFidelity} < current ${cur.meanFidelity} + minImprove ${minImprove} (delta ${delta}); kept current`;
  } else {
    promote = true;
    reason = `promote: ${merged.applied.length} disagreement(s) applied, fidelity ${cur.meanFidelity} -> ${cand.meanFidelity} (delta +${delta})`;
  }

  return {
    promote, reason,
    candidateOrder: merged.order,
    applied: merged.applied,
    skipped: merged.skipped,
    netSatisfied: merged.netSatisfied,
    currentFidelity: cur.meanFidelity,
    candidateFidelity: cand.meanFidelity,
    fidelityDelta: delta,
    programsScored: cur.programsScored,
  };
}
