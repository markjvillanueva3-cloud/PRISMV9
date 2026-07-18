/**
 * camModelGateThresholds.ts -- canonical CAM-model deploy-gate thresholds (U3)
 * ===========================================================================
 *
 * SINGLE SOURCE OF TRUTH (TS mirror) for the NN-GRAPH-MS0 mandatory deploy
 * gate, so the engine layer (`CAMModelPromotionGateEngine`) can enforce the
 * SAME gate the GNN retrain lifecycle enforces, WITHOUT importing a `scripts/`
 * module (engines must not import scripts -- layer inversion).
 *
 * PROVENANCE -- these values mirror, verbatim:
 *   - `GATE_THRESHOLDS` in `scripts/lib/nn-graph-eval.mjs:52`
 *       { auroc: 0.78, macroF1: 0.55, brier: 0.15 }
 *   - `GNN_DEFAULTS.minConf` in `scripts/seed-ghost-gnn-classify.mjs:64`  (0.7)
 *   - `SELECTIVE_THRESHOLDS` in `scripts/lib/nn-graph-eval.mjs:209`
 *
 * DRIFT GUARD (R12): `camModelGateThresholds.test.ts` re-reads the two `.mjs`
 * source files at test time and FAILS if any value here has drifted from the
 * canonical scripts. This keeps the mirror honest -- a change to the GNN gate
 * that isn't reflected here breaks the build, it never silently diverges.
 *
 * @module schemas/camModelGateThresholds
 * @milestone CLOSE-THE-LOOP-CAM U3
 */

/**
 * The mandatory full-coverage deploy gate. A CAM-trained model deploys at full
 * coverage ONLY when every one of these clears on a fresh temporal holdout.
 *   - AUROC   >= 0.78  (ranking / discrimination)
 *   - macroF1 >= 0.55  (per-class balance -- not just majority accuracy)
 *   - Brier   <= 0.15  (calibration of the probabilistic output)
 * Source: scripts/lib/nn-graph-eval.mjs:52 GATE_THRESHOLDS.
 */
export const CAM_GATE_THRESHOLDS = Object.freeze({
  auroc: 0.78,
  macroF1: 0.55,
  brier: 0.15,
});

/**
 * The production confidence gate for the SELECTIVE (abstaining) deploy path.
 * The tier emits a prediction only when its confidence >= this; below it, it
 * abstains and defers to the next tier. A model that fails the full-coverage
 * gate can still be deploy-ready-SELECTIVE when its emitted-above-gate set
 * clears Brier + macroF1 AND its global AUROC clears the gate (the AUROC
 * certifies the confidence ordering the abstention relies on).
 * Source: scripts/seed-ghost-gnn-classify.mjs:64 GNN_DEFAULTS.minConf.
 */
export const CAM_PRODUCTION_MIN_CONF = 0.7 as const;

/**
 * The tau grid the selective risk-coverage curve is evaluated at.
 * `robustAboveGate` requires every tau at/above CAM_PRODUCTION_MIN_CONF to
 * clear -- a stable regime, not a lone noise spike. Source:
 * scripts/lib/nn-graph-eval.mjs:209 SELECTIVE_THRESHOLDS.
 */
export const CAM_SELECTIVE_THRESHOLDS = Object.freeze([
  0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8,
]);

/**
 * Minimum labelled holdout samples per class before a GO/NO_GO verdict is
 * statistically meaningful. Below this the gate returns INSUFFICIENT_DATA
 * (mirrors PromotionGateEngine's min_samples posture + the eval harness's
 * "deferred: insufficient reference pool"). This is a floor for the MECHANISM
 * to produce a HONEST verdict -- NOT a claim the model is good at this N.
 */
export const CAM_MIN_HOLDOUT_PER_CLASS = 5 as const;

export type CamGateThresholds = typeof CAM_GATE_THRESHOLDS;
