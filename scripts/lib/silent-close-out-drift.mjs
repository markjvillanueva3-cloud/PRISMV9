/**
 * silent-close-out-drift.mjs — detect envelope-complete + MILESTONE_PROGRESS-zero drift.
 *
 * A milestone envelope can have `status: complete` and `units[].status: complete` for all
 * units, while `MILESTONE_PROGRESS.json` (derived from git commit subjects matching
 * `[SCOPE]/U-ID`) shows `shipped: 0`. This happens when:
 *   - Units shipped under non-tagged commit subjects (pre-2026-05-12 convention)
 *   - Envelopes were bulk-flipped to complete without a matching ship commit per unit
 *
 * `audit-roadmap-drift.mjs` only flags milestones whose current_status ≠ proposed_status
 * (bucket-tier shift). `audit-close-out-candidates.mjs` only flags envelope-pending + files-exist.
 * Neither catches this class.
 *
 * This module is PURE — readers are injected. The CLI driver wires it to fs.
 *
 * Author: alpha slot (claude-69c63409) /loop iter-3, 2026-05-17.
 * Spec: state/shared/specs/SILENT-CLOSE-OUT-DEBT-AUDIT-2026-05-17.md
 */

const COMPLETE_STATUSES = new Set([
  "complete", "completed", "shipped", "done", "merged", "landed", "closed",
]);

/**
 * Flatten an envelope's units across BOTH schema shapes:
 *   - legacy flat `env.units[]` (pre-2026-05-12 envelopes — the class MOST prone
 *     to silent close-out debt, since those ship commits predate the
 *     `[SCOPE]/U-ID` subject convention)
 *   - modern nested `env.phases[].units`
 * Mirrors `flattenEnvelopeUnits()` in scripts/audit-close-out-candidates.mjs so
 * the drift scan and the candidate scan read the same data the same way (R7).
 * Fail-soft: phases/units as object/string/null/missing coerce to [].
 */
function flattenEnvelopeUnits(env) {
  const flat = Array.isArray(env.units) ? env.units : [];
  if (flat.length > 0) return flat;
  const phases = Array.isArray(env.phases) ? env.phases : [];
  return phases.flatMap((p) => (p && Array.isArray(p.units) ? p.units : []));
}

/**
 * Find silent close-out drift cases.
 *
 * @param {object} args
 * @param {Array<{id:string,status:string,phases:Array<{units:Array<{id:string,status:string}>}>}>} args.envelopes
 *        Loaded milestone envelopes (one per file under mcp-server/data/milestones/).
 * @param {Map<string,number>|object} args.shippedByMsId
 *        Map of milestone_id -> MILESTONE_PROGRESS.shipped count.
 * @param {object} [args.options]
 * @param {number} [args.options.minDrift=1]  Minimum drift (envelope-complete - progress-shipped) to flag.
 * @returns {{cases:Array<object>, summary:object}}
 */
export function findSilentCloseOutDrift({ envelopes, shippedByMsId, options = {} }) {
  const minDrift = Number.isFinite(options.minDrift) ? options.minDrift : 1;
  const get = (id) => {
    if (shippedByMsId instanceof Map) return shippedByMsId.get(id) || 0;
    return (shippedByMsId && typeof shippedByMsId === "object" ? shippedByMsId[id] : 0) || 0;
  };

  const cases = [];
  let scanned = 0;
  let skippedNotComplete = 0;
  let skippedNoUnits = 0;
  let skippedZeroDrift = 0;

  for (const env of envelopes || []) {
    if (!env || !env.id) continue;
    scanned++;
    const envStatus = String(env.status || "").toLowerCase();
    if (!COMPLETE_STATUSES.has(envStatus)) { skippedNotComplete++; continue; }

    // Defensive: envelopes in the wild have phases/units as object/string/null/
    // missing AND span two schema shapes (flat env.units vs nested phases[].units).
    // flattenEnvelopeUnits coerces-to-array at every join (fail-soft, not throw).
    const allUnits = flattenEnvelopeUnits(env);
    const completedUnits = allUnits.filter((u) =>
      u && COMPLETE_STATUSES.has(String(u.status || "").toLowerCase())
    ).length;
    if (completedUnits === 0) { skippedNoUnits++; continue; }

    const progressShipped = get(env.id);
    const drift = completedUnits - progressShipped;
    if (drift < minDrift) { skippedZeroDrift++; continue; }

    cases.push({
      milestone_id: env.id,
      title: typeof env.title === "string" ? env.title.slice(0, 120) : null,
      envelope_status: env.status,
      units_complete: completedUnits,
      total_units: allUnits.length,
      progress_shipped: progressShipped,
      drift,
      confidence: completedUnits === allUnits.length ? "envelope-fully-complete" : "envelope-partially-complete",
    });
  }

  cases.sort((a, b) => b.drift - a.drift);

  const summary = {
    scanned,
    skipped_not_complete_envelope: skippedNotComplete,
    skipped_no_completed_units: skippedNoUnits,
    skipped_below_min_drift: skippedZeroDrift,
    cases_found: cases.length,
    total_hidden_shipped_units: cases.reduce((sum, c) => sum + c.drift, 0),
  };

  return { cases, summary };
}

/**
 * Helper — build shippedByMsId Map from a parsed MILESTONE_PROGRESS.json object.
 * Tolerates both {milestones:[...]} and direct array shapes; reads either
 * `milestone_id` or `id` for the key.
 */
export function buildShippedByMsId(milestoneProgressJson) {
  const map = new Map();
  const milestones = Array.isArray(milestoneProgressJson)
    ? milestoneProgressJson
    : (milestoneProgressJson && milestoneProgressJson.milestones) || [];
  for (const m of milestones) {
    if (!m) continue;
    const id = m.milestone_id || m.id;
    if (!id) continue;
    const shipped = Number.isFinite(m.shipped) ? m.shipped : (Number(m.shipped_count) || 0);
    map.set(id, shipped);
  }
  return map;
}

/**
 * Helper — render the case list as markdown rows.
 *
 * @param {Array<object>} cases  Output of findSilentCloseOutDrift.cases
 * @param {number} [topN=15]
 * @returns {string} markdown
 */
export function renderMarkdown(cases, topN = 15) {
  if (!cases || cases.length === 0) {
    return "_No silent close-out drift detected._\n";
  }
  const head = "| Milestone | Envelope | env_complete/total | progress_shipped | Hidden | Confidence |";
  const sep =  "|-----------|----------|--------------------|-----------------:|-------:|------------|";
  const rows = cases.slice(0, topN).map((c) =>
    `| ${c.milestone_id} | ${c.envelope_status} | ${c.units_complete}/${c.total_units} | ${c.progress_shipped} | **+${c.drift}** | ${c.confidence} |`
  );
  const more = cases.length > topN
    ? `\n_... ${cases.length - topN} more milestones with smaller drift._\n`
    : "";
  return [head, sep, ...rows].join("\n") + more;
}
