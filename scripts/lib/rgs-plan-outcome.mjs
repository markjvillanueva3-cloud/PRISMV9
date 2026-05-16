/**
 * rgs-plan-outcome.mjs
 * Pure outcome extractor for the RGS tool-plan feedback loop.
 *
 * export function extractOutcomes(inputs, opts?) -> OutcomeRecord[]
 *
 * No I/O — all signals injected by caller. The Stop hook in
 * .claude/hooks/rgs-outcome-record-stop.mjs performs I/O and calls this.
 *
 * Unit-id pattern: U-[A-Z0-9-]+  (e.g. U-FOO-01, U-LATHE-PROD-READY-17)
 * Extraction sources: commit bodies + ledger PASS notes.
 *
 * Classification precedence (per picked event):
 *   1. shipped  — unit id found in a commit body OR in a ledger PASS note
 *   2. reverted — unit key present in revertedKeys set
 *   3. blocked  — everything else (survivorship-bias guard:
 *                 a picked unit with no terminal signal is a real signal)
 */

// ---------------------------------------------------------------------------
// Types (JSDoc — no runtime cost)
// ---------------------------------------------------------------------------

/**
 * @typedef {{
 *   unitKey: string,
 *   sid: string,
 *   predictedPipelines: string[],
 *   tier?: string,
 *   verdict?: string
 * }} PickedEvent
 *
 * @typedef {{
 *   notes?: string,
 *   opusReviewed?: boolean,
 *   claudeReviewed?: boolean,
 *   codexReviewed?: boolean,
 *   [key: string]: unknown
 * }} LedgerEntry
 *
 * @typedef {{
 *   v: 1,
 *   ts: string,
 *   unitKey: string,
 *   outcome: "shipped"|"blocked"|"reverted",
 *   predictedPipelines: string[],
 *   tier: string,
 *   verdict: string
 * }} OutcomeRecord
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Regex to extract unit ids from free text. Matches U-[A-Z0-9-]+ preceded by
 *  a bracket, slash, space, or start-of-string so we don't false-match
 *  inside longer words. The g flag is required — caller uses matchAll. */
const UNIT_ID_RE = /(?:[\[/\s]|^)(U-[A-Z0-9][A-Z0-9-]*)/gm;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract all U-ids found in a string.
 * @param {string} text
 * @returns {Set<string>}
 */
function extractUnitIds(text) {
  const ids = new Set();
  for (const match of text.matchAll(UNIT_ID_RE)) {
    ids.add(match[1]);
  }
  return ids;
}

/**
 * Returns true when a ledger entry is considered PASS.
 * We require at least two of the three arm flags to be true (matches the
 * 3-of-3 gate spirit while tolerating legacy 2-arm entries).
 * @param {LedgerEntry} entry
 * @returns {boolean}
 */
function isLedgerPass(entry) {
  const flags = [entry.opusReviewed, entry.claudeReviewed, entry.codexReviewed];
  const passCount = flags.filter(Boolean).length;
  // Legacy 2-arm entries used selfReviewed + agentReviewed; treat them as pass too.
  const legacyPass = entry.selfReviewed && entry.agentReviewed;
  return passCount >= 2 || Boolean(legacyPass);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extract outcome records for all picked events.
 *
 * @param {{
 *   scrutinyLedger: LedgerEntry[],
 *   commitBodies: string[],
 *   pickedEvents: PickedEvent[],
 *   revertedKeys: Set<string>|string[]
 * }} inputs
 * @param {{ now?: string }} [opts]   — optional fixed clock for tests
 * @returns {OutcomeRecord[]}
 */
export function extractOutcomes(inputs, opts = {}) {
  const { scrutinyLedger = [], commitBodies = [], pickedEvents = [], revertedKeys = [] } = inputs;
  const ts = opts.now ?? new Date().toISOString();

  // Normalise revertedKeys to a Set for O(1) lookup.
  const revertedSet =
    revertedKeys instanceof Set ? revertedKeys : new Set(revertedKeys);

  // --- Build shipped-id set from commit bodies ----------------------------
  const shippedFromCommits = new Set();
  for (const body of commitBodies) {
    for (const id of extractUnitIds(body)) {
      shippedFromCommits.add(id);
    }
  }

  // --- Build shipped-id set from ledger PASS notes -----------------------
  const shippedFromLedger = new Set();
  for (const entry of scrutinyLedger) {
    if (!isLedgerPass(entry)) continue;
    const notes = typeof entry.notes === "string" ? entry.notes : "";
    for (const id of extractUnitIds(notes)) {
      shippedFromLedger.add(id);
    }
  }

  // --- Classify each picked event ----------------------------------------
  const results = [];
  for (const event of pickedEvents) {
    const { unitKey, predictedPipelines = [], tier = "", verdict = "" } = event;

    // unitKey may be a composite key (MS::U-id) — split on :: so the bare
    // U-id is a candidate, then run the U-id regex over each part too.
    const candidateIds = new Set();
    for (const part of String(unitKey).split("::")) {
      candidateIds.add(part);
      for (const id of extractUnitIds(" " + part)) candidateIds.add(id);
    }

    let outcome;
    const isShipped = [...candidateIds].some(
      (id) => shippedFromCommits.has(id) || shippedFromLedger.has(id)
    );

    if (isShipped) {
      outcome = "shipped";
    } else if (revertedSet.has(unitKey)) {
      outcome = "reverted";
    } else {
      // Survivorship-bias guard: a picked unit with no terminal signal
      // is a real negative signal, not absence of data.
      outcome = "blocked";
    }

    results.push({
      v: 1,
      ts,
      unitKey,
      outcome,
      predictedPipelines: [...predictedPipelines],
      tier,
      verdict,
    });
  }

  return results;
}
