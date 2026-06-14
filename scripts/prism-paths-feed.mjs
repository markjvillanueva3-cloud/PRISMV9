#!/usr/bin/env node
/**
 * prism-paths-feed.mjs — the UNIFIED "PRISM Paths" adaptive-feed pipeline (slot:echo)
 *
 * Operator decision 2026-05-29 (V11-CPS-FEATURE-ASSESSMENT): the v11 .cps grew TWO
 * overlapping feed orchestrators (calculateOptimizedFeed geometry-chain +
 * applyPrismEnhancedFeed motion-chain) plus ~6 standalone factor fns — order-dependent,
 * double-count-prone. This module is the single ordered pipeline that replaces them:
 * ONE prismPaths(baseFeed, ctx) with per-stage enable toggles and a strict rule —
 * geometry/global stages may raise OR lower; SAFETY stages may only LOWER (factor <= 1)
 * and are never skipped outside prove-out.
 *
 * Shared feed core for BOTH post tiers:
 *   - Tier-1 cheap .cps: this logic is INLINED into the Fusion post (a .cps cannot import).
 *   - Tier-2 add-in: imported directly.
 * Developed + tested HERE as pure node first (the .cps inline is a later unit, gated on
 * an NC-diff equivalence check vs the production post — never edit the 795 KB production
 * .cps blind).
 *
 * STATUS (Unit 1): pipeline framework + invariants + the NEW Kienzle power/torque guard
 * are fully implemented & tested. The 9 pre-existing geometry/motion factors are
 * registered as PORT-PENDING stages (identity 1.0 + a note) — Unit 2 ports each with the
 * exact math read from HURCO_VM30i_PRISM_v11.cps so the consolidation stays
 * behavior-preserving. No production .cps byte is touched by this file.
 *
 * Canonical physics: kc1.1 / mc are parsed from mcp-server/src/physics/constants.ts
 * (CANONICAL_KIENZLE) at load — NEVER hand-inlined (doctrine), so drift is test-caught.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONSTANTS_TS = path.join(__dirname, "..", "mcp-server", "src", "physics", "constants.ts");

// unit conversions (named, not magic) — exact SI definitions
const IN_TO_MM = 25.4;
const KW_TO_HP = 1.341022;
const NM_TO_FTLB = 0.7375621;
const SEC_PER_MIN = 60;
const POWER_DENOM = 60e6;          // Sandvik milling power: Pc[kW] = ae*ap*vf*kc / 60e6
const MIN_HM = 1e-4;               // floor on mean chip thickness (mm) to keep kc finite
const DEFAULT_EFFICIENCY = 0.85;   // spindle drivetrain efficiency for available-power derate

// ── ported factor defaults (faithful to HURCO_VM30i_PRISM_v11.cps property values;
//    overridable via ctx so the consolidation is behavior-preserving) ───────────
const DEF_MAX_CHIP_THINNING_MULT = 1.5;   // maxChipThinningMultiplier
const DEF_MAX_STICKOUT_RATIO     = 4.0;   // maxStickoutRatio (roughing)
const DEF_FINISH_STICKOUT_TOL    = 6.0;   // finishingStickoutTolerance
const DEF_STICKOUT_SAFETY        = 1.0;   // toolStickoutMultiplier
const DEF_AGGRESSIVENESS         = 5;     // prismT{n}Aggressiveness default
const AGGRESSIVENESS_MAX_LEVEL   = 8;     // enum 1..8; level1→0.5x, level8→1.0x
const AGGRESSIVENESS_MIN_FACTOR  = 0.5;
const CHIP_THIN_ENGAGEMENT_CUTOFF_PCT = 50; // at/above this ae% → conventional, no comp
const STICKOUT_MAX_REDUCTION_PCT = 50;    // cap on stickout feed cut
const STICKOUT_REDUCTION_COEFF   = 5;     // reductionPct = min(50, excess²·5·safety)
const CHIP_THIN_SUGGEST_THRESHOLD = 1.2;  // cosmetic note threshold in source
// Hardness→speed derate table, faithful to v11 calcHardnessSpeedFactor (empirical
// machinability derate by HRC — NOT a Kienzle/Taylor physics constant). [maxHRC, factor];
// > last bound → EXTREME_HARDNESS_FACTOR.
const HARDNESS_DERATE = [[20, 1.10], [28, 1.00], [32, 0.90], [36, 0.80], [40, 0.70], [45, 0.55], [50, 0.45], [55, 0.35]];
const EXTREME_HARDNESS_FACTOR = 0.30;     // > 55 HRC
// axialDepth (v11 calculateAxialDepthFactor): LOC-engagement safety override [minLOC, factor]
// (highest threshold first) + branch tuning constants.
const AXIAL_LOC_OVERRIDE = [[0.85, 0.45], [0.75, 0.55], [0.65, 0.70], [0.55, 0.85]];
const OPTIMAL_DEPTH_RATIO_FINISH = 0.5;   // optimal ap/D finishing
const OPTIMAL_DEPTH_RATIO_ROUGH  = 2.0;   // optimal ap/D roughing/adaptive
const LIGHT_DOC_MAX_INCREASE     = 0.3;   // moderately-shallow adaptive: up to +30%
const ROUGH_MAX_SAFE_DEPTH_RATIO_FALLBACK = 2.5; // non-adaptive rough, no flute length
const ROUGH_FLUTE_SAFE_FRACTION  = 0.9;   // maxSafeDepthRatio = (LOC/D)*0.9
// adaptive3D (v11 calculate3DAdaptiveFactor): WOC engagement targets (%).
const DEF_ROUGHING_OPTIMAL_WOC = 15;      // roughingOptimalWOC
const DEF_FINISHING_MAX_WOC    = 35;      // finishingMaxWOC
const ADAPTIVE3D_LIGHT_FRACTION = 0.75;   // engage < target*0.75 → speed up
// aeMaxSafe (v11 calculateMaxSafeAe): ae_max = K·(1−min(LOC,cap))^n, floored; feed-derate.
const AE_MAX_K = 0.35, AE_MAX_N = 1.5;
const AE_LOC_NOLIMIT = 0.20;              // < this LOC → no ae limit
const AE_RATIO_FLOOR = 0.03;              // 3% realistic ae minimum
const AE_LOC_CAP     = 0.95;              // cap on (1−LOC) base

// ── canonical cutting data (single source of truth = constants.ts) ───────────
let _kienzle = null;
export function loadCanonicalKienzle(srcPath = CONSTANTS_TS) {
  if (_kienzle) return _kienzle;
  const src = readFileSync(srcPath, "utf8");
  const block = src.match(/CANONICAL_KIENZLE[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (!block) throw new Error("CANONICAL_KIENZLE not found in constants.ts — cannot derive cutting physics");
  const out = {};
  const re = /([PMKNSH])\s*:\s*\{\s*kc1_1\s*:\s*([\d.]+)\s*,\s*mc\s*:\s*([\d.]+)/g;
  for (const m of block[1].matchAll(re)) out[m[1]] = { kc1_1: Number(m[2]), mc: Number(m[3]) };
  if (Object.keys(out).length < 6) throw new Error(`CANONICAL_KIENZLE parse incomplete: got ${Object.keys(out).join(",")}`);
  _kienzle = out;
  return out;
}

// ── helpers ──────────────────────────────────────────────────────────────────
function toMM(x, units) { return units === "mm" ? x : x * IN_TO_MM; }
function clampFactor(f) { return !isFinite(f) || f <= 0 ? 1 : f; }   // a factor must be a positive finite scalar
function num(x, d = 0) { return typeof x === "number" && isFinite(x) ? x : d; }

/**
 * Kienzle power/torque guard — the #1 "beats-a-calculator" add. A generic feed/speed
 * calculator ignores YOUR machine's installed power; this clamps feed so an op never
 * exceeds the entered spindle HP / torque. Cutting power is NOT linear in feed: chip
 * thickness hm ∝ fz ∝ feed and kc ∝ hm^(-mc), so Pc ∝ feed^(1-mc). The EXACT feed clamp
 * therefore uses the inverse exponent: factor = (P_available / P_cutting)^(1/(1-mc))
 * (likewise torque, since Mc ∝ Pc at fixed rpm). A naive avail/Pc would over-clamp.
 * SAFETY stage → factor <= 1.
 *
 * ctx: { ae, ap, toolDia, feed, rpm, flutes, isoGroup, spindleHP, spindleTorqueFtLb,
 *        spindleEfficiency?, units? }  (lengths + feed in ctx.units, default "in")
 */
export function kienzlePowerTorqueGuard(ctx) {
  const units = ctx.units || "in";
  const D = toMM(num(ctx.toolDia), units);
  const ae = toMM(num(ctx.ae), units);
  const ap = toMM(num(ctx.ap), units);
  const vf = toMM(num(ctx.feed), units);                 // mm/min
  const rpm = num(ctx.rpm);
  const flutes = Math.max(1, Math.round(num(ctx.flutes, 1)));
  const iso = String(ctx.isoGroup || "P").toUpperCase();
  const hp = num(ctx.spindleHP);
  const torqueFtLb = num(ctx.spindleTorqueFtLb);
  const eff = num(ctx.spindleEfficiency, DEFAULT_EFFICIENCY);
  const availHP = hp > 0 ? hp * eff : Infinity;
  const availTq = torqueFtLb > 0 ? torqueFtLb * eff : Infinity;

  // insufficient data → neutral (cannot guard what we cannot compute; fail-soft, never crash)
  if (D <= 0 || ae <= 0 || ap <= 0 || vf <= 0 || rpm <= 0) {
    return { factor: 1, powerHP: 0, torqueFtLb: 0, availPowerHP: availHP, availTorqueFtLb: availTq, note: "guard skipped — incomplete cut params" };
  }
  const kData = loadCanonicalKienzle();
  const { kc1_1, mc } = kData[iso] || kData.P;

  const fz = vf / (rpm * flutes);                        // mm/tooth
  const aeRatio = Math.min(Math.max(ae / D, 0), 1);
  const hm = Math.max(fz * Math.sqrt(aeRatio), MIN_HM);  // mean chip thickness (radial thinning), mm
  const kc = kc1_1 * Math.pow(hm, -mc);                  // N/mm² (specific cutting force at hm)
  const mrr = ae * ap * vf;                              // mm³/min
  const pcKW = (mrr * kc) / POWER_DENOM;                 // kW
  const pcHP = pcKW * KW_TO_HP;
  const mcNm = (pcKW * 1000 * SEC_PER_MIN) / (2 * Math.PI * rpm); // Mc = Pc / ω
  const torqueOut = mcNm * NM_TO_FTLB;

  // Pc ∝ feed^(1-mc) is SUBLINEAR (chip-thinning feedback: cutting feed also raises kc),
  // so a naive avail/Pc factor UNDER-clamps — at that reduced feed the op is still over the
  // limit. The EXACT clamp uses the inverse exponent (1/(1-mc) > 1), giving a SMALLER factor.
  // Mc ∝ Pc at fixed rpm → same exponent.
  const fpExp = 1 / (1 - mc);
  const powerFactor = pcHP > availHP ? Math.pow(availHP / pcHP, fpExp) : 1;
  const torqueFactor = torqueOut > availTq ? Math.pow(availTq / torqueOut, fpExp) : 1;
  const factor = Math.min(powerFactor, torqueFactor, 1);

  let note = "";
  if (factor < 1) {
    const which = powerFactor <= torqueFactor
      ? `power ${pcHP.toFixed(1)}/${availHP.toFixed(1)} HP`
      : `torque ${torqueOut.toFixed(0)}/${availTq.toFixed(0)} ft-lb`;
    note = `feed clamped ${factor.toFixed(3)}x — ${which} limit (kc=${kc.toFixed(0)} N/mm2, ISO ${iso})`;
  }
  return { factor, powerHP: pcHP, torqueFtLb: torqueOut, availPowerHP: availHP, availTorqueFtLb: availTq, note };
}

// ── ported factors (exact math from HURCO_VM30i_PRISM_v11.cps) ───────────────
// Each takes the unified ctx and returns {factor, note}. The .cps "formula off" check is
// NOT replicated inside — disabling is the pipeline's job (the disabled-set), which is the
// whole point of the consolidation. ctx fields: ae, toolDia, toolLength(stickout), hrc,
// aggressivenessLevel, isFinishing, plus optional override defaults.

/** v11 calculateChipThinningFactor: sqrt(ae/D) chip-thickness ratio, capped. Geometry; raises. */
export function chipThinningFactor(ctx) {
  const D = num(ctx.toolDia), ae = num(ctx.ae);
  const maxMult = num(ctx.maxChipThinMult, DEF_MAX_CHIP_THINNING_MULT);
  if (ae <= 0 || D <= 0) return { factor: 1, note: "" };
  const engagementPct = (ae / D) * 100;
  if (engagementPct >= CHIP_THIN_ENGAGEMENT_CUTOFF_PCT) return { factor: 1, note: "high engagement — standard feed" };
  const chipRatio = Math.sqrt(ae / D);
  const factor = Math.min(1 / chipRatio, maxMult);
  const note = factor > CHIP_THIN_SUGGEST_THRESHOLD ? `chip thinning +${Math.round((factor - 1) * 100)}% feed` : "light chip-thinning comp";
  return { factor, note };
}

/** v11 calcHardnessSpeedFactor: empirical HRC machinability derate table. Global; raise/lower. */
export function hardnessSpeedFactor(ctx) {
  const hrc = num(ctx.hrc);
  if (hrc <= 0) return { factor: 1, note: "" };
  for (const [maxH, f] of HARDNESS_DERATE) if (hrc <= maxH) return { factor: f, note: `HRC ${hrc} → ${f}x` };
  return { factor: EXTREME_HARDNESS_FACTOR, note: `HRC ${hrc} extreme-hardness → ${EXTREME_HARDNESS_FACTOR}x` };
}

/** v11 getPrismAggressivenessLevelFactor: linear level1→0.5x .. level8→1.0x. Global. */
export function aggressivenessFactor(ctx) {
  let level = num(ctx.aggressivenessLevel, DEF_AGGRESSIVENESS);
  level = Math.min(Math.max(level, 1), AGGRESSIVENESS_MAX_LEVEL); // valid enum domain 1..8
  const factor = AGGRESSIVENESS_MIN_FACTOR + (level - 1) * (AGGRESSIVENESS_MIN_FACTOR / (AGGRESSIVENESS_MAX_LEVEL - 1));
  return { factor, note: `aggressiveness L${level} → ${factor.toFixed(3)}x` };
}

/** v11 calculateStickoutFactor: L/D beyond threshold cut by min(50, excess²·5·safety)%. Safety; ≤1. */
export function stickoutDeflectionFactor(ctx) {
  const D = num(ctx.toolDia);
  const len = num(ctx.toolLength != null ? ctx.toolLength : ctx.stickout);
  const isFinish = ctx.isFinishing === true;
  const threshold = isFinish ? num(ctx.finishStickoutTol, DEF_FINISH_STICKOUT_TOL) : num(ctx.maxStickoutRatio, DEF_MAX_STICKOUT_RATIO);
  const safety = num(ctx.stickoutSafety, DEF_STICKOUT_SAFETY);
  if (D <= 0 || len <= 0) return { factor: 1, note: "" };
  const ratio = len / D;
  if (ratio <= threshold) return { factor: 1, note: "stickout OK" };
  const excess = ratio - threshold;
  const reductionPct = Math.min(STICKOUT_MAX_REDUCTION_PCT, excess * excess * STICKOUT_REDUCTION_COEFF * safety);
  const factor = 1 - reductionPct / 100;
  const note = ratio > threshold * 1.5
    ? `HIGH STICKOUT L/D ${ratio.toFixed(1)} — feed -${Math.round(reductionPct)}%`
    : `stickout feed -${Math.round(reductionPct)}%`;
  return { factor, note };
}

/** v11 calculateAxialDepthFactor: DOC-vs-D feed scaling with LOC-engagement safety override.
 *  Geometry (raise on shallow / lower on deep+high-LOC). ctx: ap, toolDia, fluteLength,
 *  isFinishing, isAdaptive|is3D. NOTE faithful quirk: the LOC override applies ONLY in the
 *  adaptive branch (matches the .cps exactly — preserved for behavior-equivalence). */
export function axialDepthFactor(ctx) {
  const ap = num(ctx.ap), D = num(ctx.toolDia), fluteLength = num(ctx.fluteLength);
  const isFinish = ctx.isFinishing === true;
  const isAdaptive = ctx.isAdaptive === true || ctx.is3D === true;
  const maxMult = num(ctx.maxChipThinMult, DEF_MAX_CHIP_THINNING_MULT);
  if (ap <= 0 || D <= 0) return { factor: 1, note: "" };
  const depthRatio = ap / D;
  const effLOC = fluteLength > 0 ? fluteLength : D * 3;
  const locRatio = ap / effLOC;
  let extremeFactor = 1, extremeWarn = "";
  for (const [minLOC, f] of AXIAL_LOC_OVERRIDE) {
    if (locRatio > minLOC) { extremeFactor = f; extremeWarn = `LOC ${Math.round(locRatio * 100)}% — feed -${Math.round((1 - f) * 100)}%`; break; }
  }
  const optimalDepthRatio = isFinish ? OPTIMAL_DEPTH_RATIO_FINISH : OPTIMAL_DEPTH_RATIO_ROUGH;
  let factor = 1, note = "";
  if (isAdaptive) {
    if (depthRatio < optimalDepthRatio * 0.5) { factor = Math.min(1 / Math.sqrt(depthRatio / optimalDepthRatio), maxMult); note = `shallow DOC +${Math.round((factor - 1) * 100)}%`; }
    else if (depthRatio < optimalDepthRatio) { factor = 1 + (1 - depthRatio / optimalDepthRatio) * LIGHT_DOC_MAX_INCREASE; note = `light DOC +${Math.round((factor - 1) * 100)}%`; }
    else { factor = 1; note = `good DOC ${depthRatio.toFixed(2)}xD`; }
    if (extremeFactor < 1) { factor *= extremeFactor; note = extremeWarn; }   // safety override (adaptive only, faithful)
  } else if (!isFinish) {
    const maxSafeDepthRatio = fluteLength > 0 ? (fluteLength / D) * ROUGH_FLUTE_SAFE_FRACTION : ROUGH_MAX_SAFE_DEPTH_RATIO_FALLBACK;
    if (depthRatio < optimalDepthRatio * 0.5) { factor = Math.min(1 / Math.sqrt(depthRatio / optimalDepthRatio), maxMult); note = `shallow DOC +${Math.round((factor - 1) * 100)}%`; }
    else if (depthRatio <= maxSafeDepthRatio) { factor = 1; note = `good DOC ${depthRatio.toFixed(2)}xD`; }
    else { factor = maxSafeDepthRatio / depthRatio; note = `deep cut — feed -${Math.round((1 - factor) * 100)}%`; }
  } else {
    if (depthRatio <= optimalDepthRatio) factor = 1;
    else { factor = optimalDepthRatio / depthRatio; note = "deep finish — feed reduced"; }
  }
  return { factor, note };
}

/** v11 calculate3DAdaptiveFactor: speeds up only for LIGHT radial engagement (never lowers).
 *  Geometry (raise-only). ctx: ae(radial), ap(axial), toolDia, isRoughing. */
export function adaptive3DFactor(ctx) {
  const D = num(ctx.toolDia);
  const radialStepover = num(ctx.ae), axialStepover = num(ctx.ap);
  const isRoughing = ctx.isRoughing !== false;
  const maxMult = num(ctx.maxChipThinMult, DEF_MAX_CHIP_THINNING_MULT);
  const roughWOC = num(ctx.roughingOptimalWOC, DEF_ROUGHING_OPTIMAL_WOC);
  const finishWOC = num(ctx.finishingMaxWOC, DEF_FINISHING_MAX_WOC);
  if (D <= 0) return { factor: 1, note: "" };
  if (radialStepover <= 0 && axialStepover <= 0) return { factor: 1, note: "no stepover data" };
  const radialPercent = (radialStepover / D) * 100;
  const effectiveRadial = radialPercent > 0 ? radialPercent : roughWOC;
  const targetEngagement = isRoughing ? roughWOC : finishWOC;
  if (effectiveRadial < targetEngagement * ADAPTIVE3D_LIGHT_FRACTION) {
    const factor = Math.min(Math.sqrt(targetEngagement / Math.max(effectiveRadial, 1)), maxMult);
    return { factor, note: `light engagement ${Math.round(effectiveRadial)}% +${Math.round((factor - 1) * 100)}%` };
  }
  return { factor: 1, note: `normal engagement ${Math.round(effectiveRadial)}%` };
}

/** v11 calculateMaxSafeAe: caps feed when radial ae exceeds the safe limit for the LOC
 *  engagement. ae_max = K·(1−min(LOC,cap))^n, floored; returns the feed-derate factor.
 *  Safety (≤1). ctx: ae, ap, toolDia, fluteLength. */
export function aeMaxSafeFactor(ctx) {
  const ap = num(ctx.ap), D = num(ctx.toolDia), fluteLength = num(ctx.fluteLength);
  if (ap <= 0 || D <= 0) return { factor: 1, note: "" };
  const ae = num(ctx.ae);
  const currentAeRatio = ae > 0 ? ae / D : 0;
  if (currentAeRatio <= 0) return { factor: 1, note: "" };
  const effLOC = fluteLength > 0 ? fluteLength : D * 3;
  const locRatio = ap / effLOC;
  if (locRatio < AE_LOC_NOLIMIT) return { factor: 1, note: `low LOC ${Math.round(locRatio * 100)}% — no ae limit` };
  const baseMaxAeRatio = AE_MAX_K * Math.pow(1 - Math.min(locRatio, AE_LOC_CAP), AE_MAX_N);
  const maxAeRatio = Math.max(baseMaxAeRatio, AE_RATIO_FLOOR);
  if (currentAeRatio > maxAeRatio) {
    const derate = maxAeRatio / currentAeRatio;
    return { factor: derate, note: `ae ${Math.round(currentAeRatio * 100)}% > ${Math.round(maxAeRatio * 100)}% safe @ ${Math.round(locRatio * 100)}% LOC — derate ${Math.round(derate * 100)}%` };
  }
  return { factor: 1, note: `ae OK ${Math.round(currentAeRatio * 100)}% @ ${Math.round(locRatio * 100)}% LOC` };
}

// ── the unified pipeline ─────────────────────────────────────────────────────
// Each stage: { id, kind: "geometry"|"motion"|"global"|"safety", fn(ctx)->{factor,note?} }
// SAFETY stages are clamped to <= 1 (can only slow the feed); others may raise or lower.
// All op-level factors are now ported from the v11 .cps with exact math (Units 2a+2b).
export const PRISM_PATHS_STAGES = [
  { id: "hardnessSpeed",      kind: "global",   fn: (ctx) => hardnessSpeedFactor(ctx) },
  { id: "chipThinning",       kind: "geometry", fn: (ctx) => chipThinningFactor(ctx) },
  { id: "axialDepth",         kind: "geometry", fn: (ctx) => axialDepthFactor(ctx) },
  { id: "adaptive3D",         kind: "geometry", fn: (ctx) => adaptive3DFactor(ctx) },
  { id: "stickoutDeflection", kind: "safety",   fn: (ctx) => stickoutDeflectionFactor(ctx) },
  { id: "aeMaxSafe",          kind: "safety",   fn: (ctx) => aeMaxSafeFactor(ctx) },
  { id: "aggressiveness",     kind: "global",   fn: (ctx) => aggressivenessFactor(ctx) },
  { id: "powerTorqueGuard",   kind: "safety",   fn: (ctx) => { const g = kienzlePowerTorqueGuard(ctx); return { factor: g.factor, note: g.note, detail: g }; } },
  // "absoluteFeedLimits" is applied after combination (a clamp on the final feed, not a factor).
];

// Per-MOVE motion factors (arc-feed correction, corner G-force limit, direction-change
// feed ramp) are NOT operation-level — they need per-segment data (arc radius, corner
// angle, previous feed, segment length) that only exists at NC-emit time. They live in
// prismPathsMotion (Unit 2c), applied per onLinear/onCircular move, NOT in the per-op
// chain above. Keeping them out of prismPaths is the correct half of the consolidation:
// the v11 .cps conflated per-op (calculateOptimizedFeed) and per-move (applyPrismEnhancedFeed).
export const PRISM_PATHS_MOTION_FACTORS = ["arcFeed", "cornerGForce", "feedRamp"];

/**
 * prismPaths(baseFeed, ctx, opts) — run the ordered pipeline.
 * opts.disabled: Set/array of stage ids to skip (the .cps enable/disable toggles).
 *   A SAFETY stage cannot be disabled unless ctx.proveOut === true (first-article).
 * opts.minFeed / opts.maxFeed: absolute clamp on the result (machine feed limits).
 */
export function prismPaths(baseFeed, ctx = {}, opts = {}) {
  const base = Math.max(0, num(baseFeed)); // a feedrate is non-negative; garbage/negative base → 0
  const disabled = opts.disabled instanceof Set ? opts.disabled : new Set(opts.disabled || []);
  const proveOut = ctx.proveOut === true;
  const factors = [];
  const notes = [];
  const warnings = [];
  let combined = 1;

  for (const stage of PRISM_PATHS_STAGES) {
    const isSafety = stage.kind === "safety";
    // safety stages are NON-skippable outside prove-out
    if (disabled.has(stage.id) && !(isSafety && !proveOut)) {
      factors.push({ id: stage.id, kind: stage.kind, factor: 1, note: "disabled", skipped: true });
      continue;
    }
    let r;
    try { r = stage.fn(ctx) || {}; } catch (e) { r = { factor: 1, note: `${stage.id}: error (${String(e && e.message || e)})` }; }
    let f = clampFactor(num(r.factor, 1));
    // INVARIANT: a safety stage may only lower the feed.
    if (isSafety && f > 1) f = 1;
    combined *= f;
    factors.push({ id: stage.id, kind: stage.kind, factor: f, note: r.note, detail: r.detail });
    if (r.note) (isSafety && f < 1 ? warnings : notes).push(r.note);
  }

  let feed = base * combined;
  if (typeof opts.minFeed === "number" && isFinite(opts.minFeed)) feed = Math.max(feed, opts.minFeed);
  if (typeof opts.maxFeed === "number" && isFinite(opts.maxFeed)) feed = Math.min(feed, opts.maxFeed);

  return {
    feed: Math.round(feed * 1e4) / 1e4,
    baseFeed: base,
    combinedFactor: Math.round(combined * 1e6) / 1e6,
    factors, notes, warnings,
  };
}

// ── CLI (ad-hoc check) ───────────────────────────────────────────────────────
function main() {
  const a = process.argv.slice(2);
  const get = (k, d) => { const i = a.indexOf("--" + k); return i >= 0 ? a[i + 1] : d; };
  const ctx = {
    units: get("units", "in"),
    toolDia: Number(get("dia", 0.5)), ae: Number(get("ae", 0.5)), ap: Number(get("ap", 0.5)),
    feed: Number(get("feed", 30)), rpm: Number(get("rpm", 6000)), flutes: Number(get("flutes", 4)),
    isoGroup: get("iso", "P"), spindleHP: Number(get("hp", 20)), spindleTorqueFtLb: Number(get("torque", 100)),
  };
  const res = prismPaths(ctx.feed, ctx, {});
  console.log(JSON.stringify({ schemaVersion: "1.0.0", input: ctx, ...res }, null, 2));
}
const invokedDirectly = process.argv[1] && /prism-paths-feed\.mjs$/.test(process.argv[1].replace(/\\/g, "/"));
if (invokedDirectly) { try { main(); } catch (e) { console.error(String(e && e.message || e)); process.exit(2); } }
