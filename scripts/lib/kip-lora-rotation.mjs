/**
 * kip-lora-rotation.mjs — pure-core extractor for KIP outcome → LoRA training
 * rotation candidates.
 *
 * Closes the open hop in the KIP closed-loop:
 *
 *   KIP plan → executeInjection → recordOutcome → feedbackSummary
 *     (3 systems bound)            (consumer report)   (consume/help rates)
 *                                                              │
 *                                                              ▼
 *                                                  THIS LIB  ───────► LoRA training queue
 *                                                                     (per-domain consumers
 *                                                                      pick from the candidate
 *                                                                      JSONL on their next
 *                                                                      cadence tick)
 *
 * Selection logic (pure):
 *   For each unique injection in the ledger:
 *     • If 0 outcomes recorded                       → REASON='orphan'
 *     • Else if outcomes ≥ minConsumeForHelpRate
 *       AND helpRate < helpRateThreshold              → REASON='low-help-rate'
 *     • Else                                          → not a candidate
 *
 * The pure split mirrors `KnowledgeInjectionPipelineEngine.computeFeedback` —
 * all selection math runs against the readonly ledger arrays so hermetic tests
 * need no disk and the one real-data E2E exercises live ledgers (per the
 * RGS-TOOL-AUTOINVOKE-MS1 lesson — "pure core + injected readers MUST ship
 * one real-data E2E").
 *
 * The downstream LoRA cadence consumers (lathe-lora, mill-lora, cad-lora,
 * wedm-lora, grinding-lora) read this candidate JSONL on their own schedule
 * and decide which to enqueue for retrain. Domain routing is THEIR concern —
 * this lib emits the cross-domain punch list keyed by injectionId, and
 * downstream consumers join against the KIP AI registry
 * (`state/shared/knowledge-injection-ai-registry.json`) for `domains[]`.
 *
 * No physics constants — this is a knowledge-flow rotation primitive.
 *
 * KNOWLEDGE-CONVERSION-MS0/U-KIP03: created 2026-05-19.
 *
 * @module scripts/lib/kip-lora-rotation
 */

/** @typedef {Object} InjectionRecord
 *  @property {string} injectionId
 *  @property {string} ts
 *  @property {string} kind
 *  @property {string} name
 *  @property {string} courseId
 *  @property {string} lane
 *  @property {string} injectionTarget
 *  @property {string[]} boundSystems
 *  @property {number} bindingsWritten
 *  @property {number} bindingsSkipped
 *  @property {boolean} ok
 */

/** @typedef {Object} OutcomeRecord
 *  @property {string} injectionId
 *  @property {string} ts
 *  @property {string} consumedBy
 *  @property {boolean} helped
 *  @property {string} evidence
 */

/** @typedef {Object} RotationCandidate
 *  @property {1} schemaVersion
 *  @property {string} injectionId
 *  @property {'orphan' | 'low-help-rate'} reason
 *  @property {string} kind
 *  @property {string} name
 *  @property {string} courseId
 *  @property {string} lane
 *  @property {string} firstInjectedAt
 *  @property {string | null} lastOutcomeAt
 *  @property {number} outcomeCount
 *  @property {number} helpedCount
 *  @property {number | null} helpRate     // null when outcomeCount === 0
 *  @property {string} selectedAt
 */

/** @typedef {Object} ExtractOptions
 *  @property {number} [helpRateThreshold]       default 0.5
 *  @property {number} [minConsumeForHelpRate]   default 1
 *  @property {string} [frozenTime]              ISO; defaults to new Date().toISOString()
 */

/** @typedef {Object} ExtractResult
 *  @property {RotationCandidate[]} candidates
 *  @property {{
 *    schemaVersion: 1,
 *    totalInjections: number,
 *    orphanCount: number,
 *    lowHelpRateCount: number,
 *    healthyCount: number,
 *    candidateCount: number,
 *    thresholds: { helpRateThreshold: number, minConsumeForHelpRate: number },
 *    selectedAt: string
 *  }} summary
 */

const DEFAULT_HELP_RATE_THRESHOLD = 0.5;
const DEFAULT_MIN_CONSUME = 1;

/**
 * PURE — produce the rotation candidate punch list from KIP injection + outcome
 * ledgers. No IO. Deterministic with `frozenTime` set.
 *
 * @param {readonly InjectionRecord[]} injections
 * @param {readonly OutcomeRecord[]} outcomes
 * @param {ExtractOptions} [opts]
 * @returns {ExtractResult}
 * @throws {TypeError} when injections/outcomes aren't arrays (R12 fail-loud —
 *                     malformed ledger is a bug, not a soft empty state).
 */
export function extractRotationCandidates(injections, outcomes, opts = {}) {
  if (!Array.isArray(injections)) {
    throw new TypeError(
      `extractRotationCandidates(): injections must be an array (got ${typeof injections})`,
    );
  }
  if (!Array.isArray(outcomes)) {
    throw new TypeError(
      `extractRotationCandidates(): outcomes must be an array (got ${typeof outcomes})`,
    );
  }

  // opts is tolerant — bad/missing keys fall through to defaults so a typo in
  // the CLI doesn't silently nuke the threshold.
  const rawThreshold = opts && typeof opts === "object"
    ? opts.helpRateThreshold : undefined;
  const helpRateThreshold = Number.isFinite(rawThreshold)
    ? Math.max(0, Math.min(1, /** @type {number} */ (rawThreshold)))
    : DEFAULT_HELP_RATE_THRESHOLD;

  const rawMinConsume = opts && typeof opts === "object"
    ? opts.minConsumeForHelpRate : undefined;
  const minConsumeForHelpRate = Number.isInteger(rawMinConsume) && /** @type {number} */ (rawMinConsume) >= 1
    ? /** @type {number} */ (rawMinConsume)
    : DEFAULT_MIN_CONSUME;

  const selectedAt = (opts && typeof opts === "object" && typeof opts.frozenTime === "string")
    ? opts.frozenTime
    : new Date().toISOString();

  // Dedup injections by id — re-runs append, keep the FIRST ts as the
  // canonical firstInjectedAt (the chronologically earliest record wins).
  /** @type {Map<string, InjectionRecord>} */
  const injById = new Map();
  for (const inj of injections) {
    if (!inj || typeof inj.injectionId !== "string" || inj.injectionId.length === 0) continue;
    const existing = injById.get(inj.injectionId);
    if (!existing) {
      injById.set(inj.injectionId, inj);
      continue;
    }
    // Keep the earlier ts as canonical. Tolerant of missing ts on either side.
    const newTs = typeof inj.ts === "string" ? inj.ts : "";
    const oldTs = typeof existing.ts === "string" ? existing.ts : "";
    if (newTs && (!oldTs || newTs < oldTs)) {
      injById.set(inj.injectionId, inj);
    }
  }

  // Aggregate outcomes per injectionId — count, helped count, latest ts.
  /** @type {Map<string, { count: number, helped: number, lastTs: string | null }>} */
  const outcomeAgg = new Map();
  for (const o of outcomes) {
    if (!o || typeof o.injectionId !== "string") continue;
    // Outcomes for an injectionId that was never recorded in the injection
    // ledger are tolerated but ignored — they reflect either a record race
    // or a hand-injected outcome with no matching plan record. Silent-skip
    // is correct here (the join is left-anchored on injections).
    if (!injById.has(o.injectionId)) continue;
    const ts = typeof o.ts === "string" ? o.ts : "";
    const helped = o.helped === true;
    const cur = outcomeAgg.get(o.injectionId);
    if (!cur) {
      outcomeAgg.set(o.injectionId, { count: 1, helped: helped ? 1 : 0, lastTs: ts || null });
    } else {
      cur.count += 1;
      if (helped) cur.helped += 1;
      if (ts && (!cur.lastTs || ts > cur.lastTs)) cur.lastTs = ts;
    }
  }

  /** @type {RotationCandidate[]} */
  const candidates = [];
  let orphanCount = 0;
  let lowHelpRateCount = 0;
  let healthyCount = 0;

  for (const [id, inj] of injById) {
    const agg = outcomeAgg.get(id);
    const outcomeCount = agg ? agg.count : 0;
    const helpedCount = agg ? agg.helped : 0;
    const helpRate = outcomeCount > 0 ? helpedCount / outcomeCount : null;
    const lastOutcomeAt = agg ? agg.lastTs : null;

    /** @type {'orphan' | 'low-help-rate' | null} */
    let reason = null;
    if (outcomeCount === 0) {
      reason = "orphan";
      orphanCount += 1;
    } else if (
      outcomeCount >= minConsumeForHelpRate
      && helpRate !== null
      && helpRate < helpRateThreshold
    ) {
      reason = "low-help-rate";
      lowHelpRateCount += 1;
    } else {
      healthyCount += 1;
    }

    if (reason !== null) {
      candidates.push({
        schemaVersion: 1,
        injectionId: id,
        reason,
        kind: typeof inj.kind === "string" ? inj.kind : "unknown",
        name: typeof inj.name === "string" ? inj.name : "unknown",
        courseId: typeof inj.courseId === "string" ? inj.courseId : "unknown",
        lane: typeof inj.lane === "string" ? inj.lane : "?",
        firstInjectedAt: typeof inj.ts === "string" ? inj.ts : "",
        lastOutcomeAt,
        outcomeCount,
        helpedCount,
        helpRate,
        selectedAt,
      });
    }
  }

  // Deterministic ordering — orphans first (highest leverage: never consumed),
  // then low-help-rate sorted by ASCENDING helpRate (worst first), then
  // injectionId for stable tie-break.
  candidates.sort((a, b) => {
    if (a.reason !== b.reason) {
      return a.reason === "orphan" ? -1 : 1;
    }
    if (a.reason === "low-help-rate" && b.reason === "low-help-rate") {
      const ar = a.helpRate ?? 0;
      const br = b.helpRate ?? 0;
      if (ar !== br) return ar - br;
    }
    return a.injectionId < b.injectionId ? -1 : a.injectionId > b.injectionId ? 1 : 0;
  });

  return {
    candidates,
    summary: {
      schemaVersion: 1,
      totalInjections: injById.size,
      orphanCount,
      lowHelpRateCount,
      healthyCount,
      candidateCount: candidates.length,
      thresholds: { helpRateThreshold, minConsumeForHelpRate },
      selectedAt,
    },
  };
}

/**
 * Render the candidate list as JSONL (one record per line, newline-terminated).
 * Pure — no IO. Empty candidate list → empty string (NOT a bare newline).
 *
 * @param {readonly RotationCandidate[]} candidates
 * @returns {string}
 */
export function renderCandidatesJsonl(candidates) {
  if (!Array.isArray(candidates)) {
    throw new TypeError("renderCandidatesJsonl(): candidates must be an array");
  }
  if (candidates.length === 0) return "";
  return candidates.map((c) => JSON.stringify(c)).join("\n") + "\n";
}
