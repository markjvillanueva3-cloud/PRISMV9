/**
 * v11-prove-out-policy.mjs — pure decision lib for v11 post prove-out
 * mode. Current default emits every program at S80%/F50% with the
 * banner "PROVE-OUT MODE: Speed 80%, Feed 50% - disable after first
 * good part" — masking real production-speed validation. This unit
 * makes prove-out OPT-IN, with explicit operator declaration via
 * Fusion property `prismProveOutMode` ∈ {off, conservative, standard,
 * production_ready}.
 *
 * Pure functions only.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-V11-PROVE-OUT-FLAG-EXPLICIT
 * @slot echo · @iter 25 · @date 2026-05-26
 */

export const PROVE_OUT_MODES = {
  off:               { speedMult: 1.00, feedMult: 1.00, label: "PRODUCTION" },
  conservative:      { speedMult: 0.50, feedMult: 0.30, label: "PROVE-OUT CONSERVATIVE" },
  standard:          { speedMult: 0.80, feedMult: 0.50, label: "PROVE-OUT STANDARD" },
  production_ready:  { speedMult: 1.00, feedMult: 1.00, label: "PRODUCTION (PROVEN OUT)" },
};

export const DEFAULT_PROVE_OUT_MODE = "off";

/** Pure: resolve operator's mode declaration to mode key; unknown → DEFAULT. */
export function resolveProveOutMode(modeProp) {
  if (modeProp == null) return DEFAULT_PROVE_OUT_MODE;
  const key = String(modeProp).toLowerCase().replace(/[-\s]/g, "_");
  if (PROVE_OUT_MODES[key]) return key;
  return DEFAULT_PROVE_OUT_MODE;
}

/** Pure: get the multipliers for a mode key. */
export function getProveOutMultipliers(modeProp) {
  const key = resolveProveOutMode(modeProp);
  const m = PROVE_OUT_MODES[key];
  return { speedMult: m.speedMult, feedMult: m.feedMult, label: m.label, mode: key };
}

/** Pure: apply prove-out multipliers to a base S/F pair. */
export function applyProveOut(baseSpeed, baseFeed, modeProp) {
  const { speedMult, feedMult, label, mode } = getProveOutMultipliers(modeProp);
  const s = Number(baseSpeed);
  const f = Number(baseFeed);
  if (!Number.isFinite(s) || !Number.isFinite(f)) {
    return { speed: NaN, feed: NaN, label, mode, applied: false };
  }
  return {
    speed: s * speedMult,
    feed: f * feedMult,
    label,
    mode,
    speedMult,
    feedMult,
    applied: speedMult !== 1.0 || feedMult !== 1.0,
  };
}

/** Pure: render an operator-readable banner block for the .cps. */
export function renderProveOutBanner(modeProp) {
  const { speedMult, feedMult, label, mode, applied } = (() => {
    const r = getProveOutMultipliers(modeProp);
    const applied = r.speedMult !== 1.0 || r.feedMult !== 1.0;
    return { ...r, applied };
  })();
  if (!applied) {
    return [
      "(===== PRISM SPEED/FEED MODE =====)",
      `(  ${label}  — running at full operator-declared parameters)`,
      "(  to enable prove-out add Fusion property: prismProveOutMode = standard)",
      "(=================================)",
    ].join("\n");
  }
  return [
    "(***** PROVE-OUT MODE ACTIVE *****)",
    `(  ${label}  — Speed ${(speedMult * 100).toFixed(0)}%  Feed ${(feedMult * 100).toFixed(0)}%)`,
    "(  DISABLE AFTER FIRST GOOD PART by setting prismProveOutMode = off)",
    "(  current mode key: " + mode + ")",
    "(*********************************)",
  ].join("\n");
}

/** Pure: hard-block decision — refuse-emit if mode is missing AND machine is in critical-tier. */
export function shouldBlockEmitMissingMode(modeProp, machineTier) {
  if (modeProp == null && String(machineTier || "").toLowerCase() === "production") {
    return {
      block: true,
      reason: "PRISM_PROVE_OUT_MODE_REQUIRED: production-tier machine requires explicit prismProveOutMode declaration; default-on prove-out was masking real-speed validation",
    };
  }
  return { block: false, reason: null };
}
