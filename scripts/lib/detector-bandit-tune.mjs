/**
 * detector-bandit-tune.mjs — pure-function lib for detector reward computation
 *
 * Karpathy R5: deterministic transforms; no model judgment, no I/O at module level.
 * Bandit-style suppress/boost/hold triage based on follower-action ratios.
 *
 * Decision ledger format (JSONL):
 *   {ts, detector, reason, nudge:bool, follower_action:"rewrote"|"ignored"|"unknown"}
 *
 * Edge cases handled from line 1:
 *   - Empty input → empty Map (not null/undefined)
 *   - Malformed JSON lines → skipped fail-soft (Karpathy R12: fail loud means
 *     surface the count, but a single bad line must not poison the batch)
 *   - Missing/non-string detector field → line skipped
 *   - nudge=false entries → recorded as 0-nudge sample (still useful for visibility)
 *   - unknown follower_action → bucketed separately, excluded from reward ratio
 *   - Division by zero (followed+ignored=0) → reward=0, status driven by samples
 */

/**
 * Parse a JSONL decision-ledger blob into per-detector buckets.
 *
 * @param {string} text - JSONL text (may be empty / contain blank lines / bad lines)
 * @returns {Map<string, {nudges:number, followed:number, ignored:number, unknown:number}>}
 */
export function parseDecisionLedger(text) {
  const out = new Map();
  if (typeof text !== 'string' || text.length === 0) return out;

  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (line.length === 0) continue;

    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      // Malformed JSON — skip fail-soft (per spec edge case 8)
      continue;
    }

    if (!entry || typeof entry !== 'object') continue;
    const detector = entry.detector;
    if (typeof detector !== 'string' || detector.length === 0) continue;

    let bucket = out.get(detector);
    if (!bucket) {
      bucket = { nudges: 0, followed: 0, ignored: 0, unknown: 0 };
      out.set(detector, bucket);
    }

    if (entry.nudge === true) {
      bucket.nudges += 1;
    }

    const action = entry.follower_action;
    if (action === 'rewrote') {
      bucket.followed += 1;
    } else if (action === 'ignored') {
      bucket.ignored += 1;
    } else if (action === 'unknown') {
      bucket.unknown += 1;
    }
    // Any other follower_action value (or missing) → not counted in any action bucket,
    // but the nudge tally above still reflects it. This matches the spec which only
    // names three follower_action values.
  }

  return out;
}

/**
 * Compute per-detector reward + triage status from parsed buckets.
 *
 * reward = followed / (followed + ignored)   (unknown excluded from denominator)
 * samples = followed + ignored + unknown      (total observations of this detector)
 *
 * Status thresholds (per spec):
 *   samples < minSamples         → "hold"   (insufficient evidence)
 *   reward  < 0.10               → "suppress"
 *   reward  > 0.70               → "boost"
 *   otherwise                     → "hold"
 *
 * @param {Map<string, {followed:number, ignored:number, unknown:number, nudges?:number}>} parsed
 * @param {{minSamples?:number}} [opts]
 * @returns {Map<string, {reward:number, samples:number, status:"suppress"|"boost"|"hold"}>}
 */
export function computeRewards(parsed, opts = {}) {
  const minSamples = Number.isFinite(opts?.minSamples) ? opts.minSamples : 20;
  const out = new Map();
  if (!(parsed instanceof Map)) return out;

  for (const [detector, bucket] of parsed) {
    const followed = Number(bucket?.followed) || 0;
    const ignored = Number(bucket?.ignored) || 0;
    const unknown = Number(bucket?.unknown) || 0;
    const samples = followed + ignored + unknown;

    const decisiveTotal = followed + ignored;
    const reward = decisiveTotal > 0 ? followed / decisiveTotal : 0;

    let status;
    if (samples < minSamples) {
      status = 'hold';
    } else if (reward < 0.10) {
      status = 'suppress';
    } else if (reward > 0.70) {
      status = 'boost';
    } else {
      status = 'hold';
    }

    out.set(detector, { reward, samples, status });
  }

  return out;
}

/**
 * Format a triage report: bucket detector names by status for human/CI consumption.
 *
 * @param {Map<string, {reward:number, samples:number, status:string}>} rewards
 * @param {string} ts - ISO timestamp to stamp the report
 * @returns {{ts:string, summary:{suppress:string[], boost:string[], hold:string[]}}}
 */
export function formatBanditReport(rewards, ts) {
  const summary = { suppress: [], boost: [], hold: [] };

  if (rewards instanceof Map) {
    for (const [detector, info] of rewards) {
      const status = info?.status;
      if (status === 'suppress') {
        summary.suppress.push(detector);
      } else if (status === 'boost') {
        summary.boost.push(detector);
      } else if (status === 'hold') {
        summary.hold.push(detector);
      }
      // Any unexpected status is silently dropped (fail-soft); spec defines exactly 3.
    }
  }

  // Deterministic ordering — sort each bucket so report diffs are stable across runs.
  summary.suppress.sort();
  summary.boost.sort();
  summary.hold.sort();

  return {
    ts: typeof ts === 'string' ? ts : '',
    summary,
  };
}
