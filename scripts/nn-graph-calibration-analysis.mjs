#!/usr/bin/env node
/**
 * NN-GRAPH calibration analysis — prove (with numbers) whether post-hoc confidence
 * calibration can clear the GNN tier-5 deploy Brier gate (<= 0.15), the HONEST way.
 *
 * Context: the deploy gate fails on Brier (0.179 > 0.15). The first calibration
 * attempt (U-GNN-CALIBRATE-NEG: isotonic fit by leave-one-out over the REFERENCE
 * pool) regressed the holdout because the LOO pool density (drop 1) did not match
 * the eval holdout density (drop ~62) — the calibrator transferred as over-confidence.
 * That commit itself named the correct method: "a held-out calibration split (or
 * k-at-a-time LOO matching the holdout size), or an abstention head."
 *
 * This study answers, from the live holdout samples in NN-EVAL.json:
 *   1. current Brier (sanity vs the eval's 0.179)
 *   2. the Murphy decomposition (reliability / resolution / uncertainty) — how much
 *      of the Brier is miscalibration (the ONLY part calibration can remove) vs
 *      irreducible refinement loss
 *   3. the in-sample isotonic CEILING (optimistic — fit & apply on the same data)
 *   4. honest, density-matched LOO-CV Brier for three robust calibrators:
 *        - temperature scaling (1 param) — the canonical NN calibrator (Guo 2017)
 *        - Platt / logistic (2 params)   — temperature + bias
 *        - isotonic (nonparametric)      — the method that failed on the WRONG split
 *   5. the selective-prediction (risk-coverage) view via the SHARED harness functions,
 *      which is the deployable alternative once calibration is ruled out.
 *
 * Pure analysis — reads NN-EVAL.json, writes nothing. No model, no GPU, no network.
 * Shared metrics (Brier, macro-F1, risk-coverage) are imported from the eval harness
 * so this study and the deploy gate use ONE metric source.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  computeBrier,
  riskCoverageCurve,
  selectiveDeployPoint,
  GATE_THRESHOLDS,
} from "./lib/nn-graph-eval.mjs";

const EVAL_PATH = process.env.NN_EVAL_PATH
  || path.join(process.cwd(), "state/shared/nn-graph/NN-EVAL.json");

// ---- numeric helpers -------------------------------------------------------
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const EPS = 1e-6;
const sigmoid = (z) => 1 / (1 + Math.exp(-z));
const logit = (p) => { const c = clamp(p, EPS, 1 - EPS); return Math.log(c / (1 - c)); };
const round = (x) => (Number.isFinite(x) ? Math.round(x * 1e4) / 1e4 : x);

function logloss(probs, labels) {
  let s = 0;
  for (let i = 0; i < probs.length; i++) {
    const p = clamp(probs[i], EPS, 1 - EPS);
    s += -(labels[i] * Math.log(p) + (1 - labels[i]) * Math.log(1 - p));
  }
  return s / probs.length;
}

// ---- calibrators (fit on a calibration set, return an apply-fn) ------------

// Temperature scaling: p' = sigmoid(logit(p) / T). T<1 sharpens (fixes under-conf).
// Fit T by minimizing NLL via golden-section search on a bounded interval.
const T_LO = 0.2, T_HI = 5, GS_MAX_ITERS = 100, GS_TOL = 1e-4;
export function fitTemperature(cs, ys) {
  const zs = cs.map(logit);
  const nll = (T) => {
    let s = 0;
    for (let i = 0; i < zs.length; i++) {
      const p = clamp(sigmoid(zs[i] / T), EPS, 1 - EPS);
      s += -(ys[i] * Math.log(p) + (1 - ys[i]) * Math.log(1 - p));
    }
    return s;
  };
  let a = T_LO, b = T_HI; const gr = (Math.sqrt(5) - 1) / 2;
  let c = b - gr * (b - a), d = a + gr * (b - a);
  let fc = nll(c), fd = nll(d);
  for (let it = 0; it < GS_MAX_ITERS && (b - a) > GS_TOL; it++) {
    if (fc < fd) { b = d; d = c; fd = fc; c = b - gr * (b - a); fc = nll(c); }
    else { a = c; c = d; fc = fd; d = a + gr * (b - a); fd = nll(d); }
  }
  const T = (a + b) / 2;
  return { kind: "temperature", T, apply: (p) => clamp(sigmoid(logit(p) / T), EPS, 1 - EPS) };
}

// Platt / logistic on feature z=logit(p): p' = sigmoid(A*z + B). Newton (IRLS).
const NEWTON_MAX_ITERS = 50, HESS_REG = 1e-6, NEWTON_TOL = 1e-7;
export function fitPlatt(cs, ys) {
  const zs = cs.map(logit);
  let A = 1, B = 0;
  for (let it = 0; it < NEWTON_MAX_ITERS; it++) {
    let gA = 0, gB = 0, hAA = 0, hAB = 0, hBB = 0;
    for (let i = 0; i < zs.length; i++) {
      const p = clamp(sigmoid(A * zs[i] + B), EPS, 1 - EPS);
      const r = p - ys[i];
      const w = p * (1 - p);
      gA += r * zs[i]; gB += r;
      hAA += w * zs[i] * zs[i]; hAB += w * zs[i]; hBB += w;
    }
    hAA += HESS_REG; hBB += HESS_REG; // stabilize on tiny folds
    const det = hAA * hBB - hAB * hAB;
    if (Math.abs(det) < 1e-12) break;
    const dA = (hBB * gA - hAB * gB) / det;
    const dB = (-hAB * gA + hAA * gB) / det;
    A -= dA; B -= dB;
    if (Math.abs(dA) < NEWTON_TOL && Math.abs(dB) < NEWTON_TOL) break;
  }
  return { kind: "platt", A, B, apply: (p) => clamp(sigmoid(A * logit(p) + B), EPS, 1 - EPS) };
}

// Isotonic (PAV) on (x=conf, y=label). Monotone non-decreasing step map.
export function fitIsotonic(cs, ys) {
  const pts = cs.map((x, i) => ({ x, y: ys[i] })).sort((a, b) => a.x - b.x);
  const blocks = [];
  for (const p of pts) {
    let nb = { sumY: p.y, w: 1, xmin: p.x, xmax: p.x, val: p.y };
    while (blocks.length && blocks[blocks.length - 1].val >= nb.val) {
      const prev = blocks.pop();
      const sumY = prev.sumY + nb.sumY, w = prev.w + nb.w;
      nb = { sumY, w, xmin: prev.xmin, xmax: nb.xmax, val: sumY / w };
    }
    blocks.push(nb);
  }
  const xs = [], vs = [];
  for (const b of blocks) {
    xs.push(b.xmin); vs.push(b.val);
    if (b.xmax !== b.xmin) { xs.push(b.xmax); vs.push(b.val); }
  }
  const apply = (x) => {
    if (xs.length === 0) return x;
    if (x <= xs[0]) return vs[0];
    if (x >= xs[xs.length - 1]) return vs[vs.length - 1];
    for (let i = 1; i < xs.length; i++) {
      if (x <= xs[i]) {
        const t = xs[i] > xs[i - 1] ? (x - xs[i - 1]) / (xs[i] - xs[i - 1]) : 0;
        return vs[i - 1] + t * (vs[i] - vs[i - 1]);
      }
    }
    return vs[vs.length - 1];
  };
  return { kind: "isotonic", apply };
}

// Leave-one-out CV: fit on all-but-i (matches the holdout density far better than
// LOO-over-reference-pool), predict i, accumulate honest out-of-fold predictions.
export function looCV(cs, ys, fitFn) {
  const out = new Array(cs.length);
  for (let i = 0; i < cs.length; i++) {
    const trC = [], trY = [];
    for (let j = 0; j < cs.length; j++) if (j !== i) { trC.push(cs[j]); trY.push(ys[j]); }
    const m = fitFn(trC, trY);
    out[i] = m.apply(cs[i]);
  }
  return out;
}

// Murphy decomposition of Brier with B equal-width bins:
//   Brier = reliability - resolution + uncertainty
const MURPHY_BINS = 10;
export function murphy(probs, labels, B = MURPHY_BINS) {
  // Only finite probabilities bin; a NaN/Infinity must not crash the study (the
  // sibling computeBrier degrades to null on bad input — murphy degrades to zeros).
  const idx = [];
  for (let i = 0; i < probs.length; i++) if (Number.isFinite(probs[i])) idx.push(i);
  const n = idx.length;
  if (n === 0) return { reliability: 0, resolution: 0, uncertainty: 0, base: 0 };
  const ybar = idx.reduce((a, i) => a + labels[i], 0) / n;
  const bins = Array.from({ length: B }, () => ({ n: 0, sp: 0, sy: 0 }));
  for (const i of idx) {
    let k = Math.floor(probs[i] * B); if (k >= B) k = B - 1; if (k < 0) k = 0;
    bins[k].n++; bins[k].sp += probs[i]; bins[k].sy += labels[i];
  }
  let reliability = 0, resolution = 0;
  for (const b of bins) {
    if (b.n === 0) continue;
    const pk = b.sp / b.n, ok = b.sy / b.n;
    reliability += b.n * (pk - ok) ** 2;
    resolution += b.n * (ok - ybar) ** 2;
  }
  reliability /= n; resolution /= n;
  const uncertainty = ybar * (1 - ybar);
  return { reliability, resolution, uncertainty, base: ybar };
}

/** Compute the full study object from a list of eval samples + the Brier gate. */
export function analyzeCalibration(samples, gates = {}) {
  const cs = samples.map((s) => s.confidence);
  const ys = samples.map((s) => (s.correct ? 1 : 0));
  const GATE = Number.isFinite(gates.brier) ? gates.brier : GATE_THRESHOLDS.brier;
  const MACRO_GATE = Number.isFinite(gates.macroF1) ? gates.macroF1 : GATE_THRESHOLDS.macroF1;

  const raw = computeBrier(cs, ys);
  const dec = murphy(cs, ys, MURPHY_BINS);

  const isoIn = fitIsotonic(cs, ys);
  const ceiling = computeBrier(cs.map((c) => isoIn.apply(c)), ys);

  // LOO-CV needs >= 2 samples to leave one out and fit on the rest; below that the
  // calibrators fit on an empty/degenerate set and emit content-free numbers.
  // Surface the insufficiency rather than reporting noise as a real CV estimate.
  const tooFew = cs.length < 2;
  let looCVResult, clearsCal, best = Infinity, bestName = null;
  if (tooFew) {
    looCVResult = { insufficient: true, holdoutN: cs.length, note: "LOO-CV needs >= 2 samples" };
    clearsCal = { temperature: false, platt: false, isotonic: false };
  } else {
    const tProbs = looCV(cs, ys, fitTemperature);
    const pProbs = looCV(cs, ys, fitPlatt);
    const iProbs = looCV(cs, ys, fitIsotonic);
    const tBrier = computeBrier(tProbs, ys), tLL = logloss(tProbs, ys);
    const pBrier = computeBrier(pProbs, ys), pLL = logloss(pProbs, ys);
    const iBrier = computeBrier(iProbs, ys);
    const Tfull = fitTemperature(cs, ys);
    const Pfull = fitPlatt(cs, ys);
    looCVResult = {
      temperature: { brier: round(tBrier), logloss: round(tLL), T: round(Tfull.T) },
      platt: { brier: round(pBrier), logloss: round(pLL), A: round(Pfull.A), B: round(Pfull.B) },
      isotonic: { brier: round(iBrier) },
    };
    clearsCal = { temperature: tBrier <= GATE, platt: pBrier <= GATE, isotonic: iBrier <= GATE };
    for (const [name, b] of [["temperature", tBrier], ["platt", pBrier], ["isotonic", iBrier]]) {
      if (Number.isFinite(b) && b < best) { best = b; bestName = name; }
    }
  }

  const rc = riskCoverageCurve(samples, { brier: GATE, macroF1: MACRO_GATE });
  const deployPoint = selectiveDeployPoint(samples, { brier: GATE, macroF1: MACRO_GATE });

  return {
    holdoutN: samples.length,
    gate: GATE,
    rawBrier: round(raw),
    murphyDecomposition: {
      reliability_miscalibration: round(dec.reliability),
      resolution_refinement: round(dec.resolution),
      uncertainty_baseRate: round(dec.uncertainty),
      baseRate: round(dec.base),
      note: "Brier = reliability - resolution + uncertainty; reliability is the ONLY part calibration can remove",
    },
    calibrationCeiling_inSampleIsotonic: round(ceiling),
    looCV: looCVResult,
    clearsGate: { ...clearsCal, ceiling: Number.isFinite(ceiling) && ceiling <= GATE },
    selectivePrediction_riskCoverage: rc,
    deployPoint,
    verdict: buildVerdict({ raw, ceiling, best, bestName, GATE, MACRO_GATE, dec, deployPoint, tooFew }),
  };
}

function buildVerdict({ raw, ceiling, best, bestName, GATE, MACRO_GATE, dec, deployPoint, tooFew }) {
  const lines = [];
  lines.push(`raw Brier ${round(raw)} vs gate ${GATE}; miscalibration (reliability) is only ${round(dec.reliability)} of it`);
  const calibrationClears = !tooFew && Number.isFinite(best) && best <= GATE;
  if (tooFew) {
    lines.push("LOO-CV calibration not assessed — fewer than 2 holdout samples.");
  } else if (calibrationClears) {
    lines.push(`best honest (LOO-CV) calibrator: ${bestName} → ${round(best)} — CLEARS the gate (≤ ${GATE}).`);
    lines.push(`FINDING 1 — post-hoc confidence calibration CLEARS the Brier gate honestly via ${bestName}.`);
  } else {
    lines.push(`best honest (LOO-CV) calibrator: ${bestName} → ${round(best)} (still > ${GATE})`);
    lines.push(`in-sample isotonic ceiling (optimistic, overfit): ${round(ceiling)}`);
    lines.push(`FINDING 1 — post-hoc confidence calibration is a DEAD END for this gate: the model is already near-calibrated (reliability ${round(dec.reliability)}); the residual Brier is REFINEMENT loss (resolution ${round(dec.resolution)} vs base-rate uncertainty ${round(dec.uncertainty)}), which no monotone recalibration can remove.`);
  }
  const op = deployPoint && deployPoint.productionPoint;
  if (deployPoint && deployPoint.found && op) {
    lines.push(`FINDING 2 — as an ABSTAINING cascade tier (emit above the production gate τ=${deployPoint.productionMinConf}, defer the rest to the LLM tier), the GNN deploys honestly: coverage ${op.coverage}, Brier ${op.brier} (≤${GATE}), macro-F1 ${op.macroF1} (≥${MACRO_GATE})${deployPoint.robustAboveGate ? ", robust above the gate" : ""}. Score the tier as a SELECTIVE predictor, not on the full holdout incl. the abstention band.`);
  } else {
    lines.push("FINDING 2 — even as a selective (abstaining) predictor, the emitted set at the production gate does not clear both Brier and macro-F1 on this holdout; the deployable lever is reference-pool growth + sharper features, not calibration.");
  }
  return lines;
}

function main() {
  const ev = JSON.parse(fs.readFileSync(EVAL_PATH, "utf8"));
  const out = { evalPath: EVAL_PATH, rawAuroc: ev.metrics && ev.metrics.auroc, ...analyzeCalibration(ev.samples || [], ev.gates || {}) };
  console.log(JSON.stringify(out, null, 2));
}

const __isMain = (() => {
  try { return import.meta.url === pathToFileURL(process.argv[1] || "").href; }
  catch { return false; }
})();
if (__isMain) main();
