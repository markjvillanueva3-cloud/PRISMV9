// ZULU-ACCOUNT-CYCLE-MS0 / U-5H-SWITCH-GATE (slot:bravo, 2026-06-11) -- keystone #3.
//
// The denominator-FREE decision gate for the account-switch coordinator. The
// coordinator's original gate was pct >= 0.90 and it FAILED LOUD when pct was
// null. But the Max-plan 5h token DENOMINATOR is not locally derivable (it is
// dynamic; verified 2026-06-11), so pct is null unless the operator supplies a
// budget. This gate adds a SECOND path: when pct is unavailable, switch on an
// absolute weighted-token TRIGGER the operator sets (PRISM_5H_WEIGHTED_TOKEN_
// TRIGGER) -- a real, calibratable number (the populator #2 surfaces the live
// weightedTokens so the operator can pick one), with NO denominator required.
//
// PRECEDENCE: pct path first (preserves the original behavior when a budget IS
// set), absolute path as the fallback, and ONLY when neither is available does
// the decision become 'undecidable' (the caller then fails loud -- a missing
// signal must surface, never be swallowed; that R12 contract is unchanged).

export const DEFAULT_PCT_THRESHOLD = 0.90; // matches coordinator DEFAULT_THRESHOLD

// True iff weightedTokens is a finite number >= a finite, positive absThreshold.
// A non-finite/absent threshold disables the absolute path (returns false).
export function shouldSwitchAbsolute(weightedTokens, absThreshold) {
  const w = Number(weightedTokens);
  const t = Number(absThreshold);
  if (!Number.isFinite(w) || !Number.isFinite(t) || t <= 0) return false;
  return w >= t;
}

// Parse PRISM_5H_WEIGHTED_TOKEN_TRIGGER -> finite >0 or null. NO default: there
// is no honest default absolute token count -- it must be operator-calibrated
// against the live weightedTokens the populator surfaces.
export function absThresholdFromEnv(env = process.env) {
  const v = Number(env?.PRISM_5H_WEIGHTED_TOKEN_TRIGGER);
  return Number.isFinite(v) && v > 0 ? v : null;
}

// Decide whether to switch, choosing the available gate.
//   - pct finite (budget was set)      -> gate 'pct',        switch = pct >= threshold
//   - else absThreshold + weightedTokens -> gate 'absolute',  switch = weighted >= absThreshold
//   - else                              -> gate 'undecidable', switch = false (caller fails loud)
//
// @param {{pct:number|null, weightedTokens:number|null}} reading
// @param {{threshold?:number, absThreshold?:number|null}} opts
// @returns {{switch:boolean, gate:'pct'|'absolute'|'undecidable', value:number|null, threshold:number|null, reason:string}}
export function decideSwitch(reading = {}, opts = {}) {
  const threshold = Number.isFinite(opts.threshold) ? opts.threshold : DEFAULT_PCT_THRESHOLD;
  const absThreshold = opts.absThreshold == null ? null : Number(opts.absThreshold);
  const pct = reading.pct;
  const weighted = reading.weightedTokens;

  // NOTE: Number(null) === 0 (finite!), so a bare Number.isFinite(Number(pct))
  // would treat a null pct as 0% and wrongly take the pct path. The `!= null`
  // guard (excludes null AND undefined via loose equality) makes a null pct fall
  // through to the absolute path -- the whole point of this gate.
  if (pct != null && Number.isFinite(Number(pct))) {
    const p = Number(pct);
    return {
      switch: p >= threshold,
      gate: "pct",
      value: p,
      threshold,
      reason: p >= threshold ? "pct-at-or-above-threshold" : "pct-below-threshold",
    };
  }
  if (absThreshold != null && Number.isFinite(absThreshold) && absThreshold > 0 && weighted != null && Number.isFinite(Number(weighted))) {
    const w = Number(weighted);
    return {
      switch: w >= absThreshold,
      gate: "absolute",
      value: w,
      threshold: absThreshold,
      reason: w >= absThreshold ? "weighted-at-or-above-trigger" : "weighted-below-trigger",
    };
  }
  return {
    switch: false,
    gate: "undecidable",
    value: null,
    threshold: null,
    reason: "no-pct (set PRISM_5H_WEIGHTED_BUDGET) AND no absolute trigger (set PRISM_5H_WEIGHTED_TOKEN_TRIGGER)",
  };
}
