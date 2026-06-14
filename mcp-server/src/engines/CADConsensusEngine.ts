/**
 * CADConsensusEngine — CAD-COMPLETE-MS0 / U-AI-11
 * ================================================
 *
 * Pure structural-agreement scoring over multiple CADWorldDiff predictions.
 *
 * Why not MultiModelConsensusEngine? That engine scores token-overlap on
 * LLM TEXT replies. It tells you "did Claude and Codex write similar
 * paragraphs?". It does NOT tell you "did Claude's predicted CAD ops
 * produce the same entities and parameter values as Codex's?". Those are
 * different questions:
 *
 *   - Text agreement (Jaccard over tokens) — MultiModelConsensusEngine
 *   - Structural agreement (Jaccard over CAD diff fields) — this engine
 *
 * Why not ConsensusCoordinatorEngine? That is a concurrency wrapper that
 * caches and rate-limits MultiModelConsensusEngine. Same orchestration
 * concern, same text-domain agreement scoring underneath.
 *
 * Why not PRISMCreativeReasoningEngine? That ranks alternative *approaches*
 * along (novelty, viability, optimization). Has no notion of comparing
 * concrete CAD predictions for structural agreement.
 *
 * What this engine does:
 *
 *   - INPUT: a set of CADPrediction objects, each carrying a `diff`
 *     (CADWorldDiff, the canonical structural diff from
 *     CADWorldModelEngine.diff). Optional projectedState for richer
 *     entity-name / parameter-value scoring.
 *   - SCORE: per-field support fractions (e.g. "3 of 5 predictions added
 *     entity 'b1'") + pairwise Jaccard over a flat field set + a mean
 *     agreement scalar in [0,1].
 *   - PICK: the medoid — the prediction with highest mean Jaccard to all
 *     other predictions. Tie-broken deterministically by input order.
 *   - DISSENT: predictions whose agreement with the picked one falls
 *     below a caller threshold (default 0.5).
 *
 * Pure. No I/O. No environment access. No randomness. Does not call
 * LLMs — caller is responsible for generating the prediction set
 * (typically by running cadPreviewEngine against several candidate op
 * sequences produced by MultiModelConsensusEngine or other sources).
 *
 * Engines are pure calculation (`mcp-server/src/engines/CLAUDE.md`):
 * every code path here either returns a value or throws a descriptive
 * error. Never silently swallows bad input.
 *
 * @module engines/CADConsensusEngine
 * @version 1.0.0
 */

import type { CADWorldDiff, CADWorldState } from "./CADWorldModelEngine.js";

/** Parameter equality tolerance for projected-state comparison. Matches
 *  the canonical CADWorldModelEngine.PARAM_EPSILON so two predictions
 *  with float round-trip noise on the same parameter are scored as
 *  agreeing. */
const PARAM_EPSILON = 1e-9;

/** One prediction to consensus over. The caller decides what counts as a
 *  "source" — could be one LLM, one preview run, one alternative op-set,
 *  one user-suggested edit. The id must be unique within a prediction
 *  set so dissent and pick results can be unambiguously attributed. */
export interface CADPrediction {
  /** Stable identifier (e.g. "claude", "ollama-32b", "preview-A"). Must
   *  be non-empty and unique within the input set. */
  id: string;
  /** Structural diff this source predicts. Required. */
  diff: CADWorldDiff;
  /** Optional projected world state — when present, parameter VALUES are
   *  compared in addition to which parameters changed. */
  projectedState?: CADWorldState;
}

/** Per-field support across a prediction set. */
export interface FieldSupport {
  /** Field token: entity id for added/removed/parametersChanged. */
  field: string;
  /** Fraction of predictions that include this field. Range [0,1]. */
  supportFraction: number;
  /** Stable list of supporter prediction ids (input order preserved). */
  supporters: string[];
}

/** Pairwise structural similarity between two predictions. */
export interface PairSimilarity {
  a: string;
  b: string;
  /** Jaccard over the flat field set. Range [0,1]; 1.0 when both diffs
   *  produce the same empty field set (no-op consensus). */
  jaccard: number;
}

/** Output of {@link CADConsensusEngine.score}. */
export interface CADConsensusReport {
  /** Number of predictions in the input set. */
  predictionCount: number;
  /** Each unique added-entity id with its support fraction. */
  addedEntityAgreement: FieldSupport[];
  /** Each unique removed-entity id with its support fraction. */
  removedEntityAgreement: FieldSupport[];
  /** Each unique parameter name (with parametersChanged=true) with its
   *  support fraction. */
  parameterChangeAgreement: FieldSupport[];
  /** Fraction of predictions that flipped selection. Range [0,1]. */
  selectionChangedAgreement: number;
  /** Fraction of predictions that flipped units. Range [0,1]. */
  unitsChangedAgreement: number;
  /** All N*(N-1)/2 pairs, ordered (a.id < b.id by input index). */
  pairwiseSimilarity: PairSimilarity[];
  /** Mean pairwise Jaccard. For N=1, by convention equals 1.0 (a single
   *  prediction trivially agrees with itself). Range [0,1]. */
  meanAgreement: number;
  /** True iff every prediction reports identical=true (consensus on
   *  no-op). When true, meanAgreement is also 1.0. */
  unanimousIdentical: boolean;
}

/** A dissenter against the consensus pick. */
export interface CADConsensusDissenter {
  id: string;
  /** Jaccard with the picked prediction. Range [0,1]. */
  agreement: number;
  /** Field tokens present in the picked diff but not this one, or vice
   *  versa (symmetric difference). Stable order. */
  differingFields: string[];
}

/** Output of {@link CADConsensusEngine.pick}. */
export interface CADConsensusPick {
  /** id of the medoid prediction (highest mean Jaccard to others). For
   *  N=1, returns that single prediction. */
  pickedId: string;
  /** The picked prediction's diff (verbatim from input). */
  pickedDiff: CADWorldDiff;
  /** Mean Jaccard of the picked prediction with the rest. For N=1
   *  returns 1.0. Range [0,1]. */
  pickedScore: number;
  /** Predictions whose agreement with the pick is < `dissentThreshold`. */
  dissenters: CADConsensusDissenter[];
  /** True when every prediction has Jaccard 1.0 with the picked one. */
  unanimous: boolean;
}

/** Options for {@link CADConsensusEngine.pick}. */
export interface CADConsensusPickOptions {
  /** Predictions with agreement below this threshold are reported as
   *  dissenters. Must be in [0,1]. Default 0.5. */
  dissentThreshold?: number;
}

/** Pure structural consensus over CAD predictions. Stateless singleton
 *  pattern — every operation is a method on a fresh logical view. */
export class CADConsensusEngine {
  /** Score N predictions and return per-field agreement + pairwise
   *  similarity + mean agreement. Throws when the input is invalid;
   *  never swallows bad shape. */
  score(predictions: CADPrediction[]): CADConsensusReport {
    this.validatePredictions(predictions);
    const ids = predictions.map((p) => p.id);
    const fieldSets = predictions.map((p) => this.flatFieldSet(p.diff));

    const addedAgreement = this.fieldSupport(
      predictions.map((p) => p.diff.addedEntities),
      ids,
    );
    const removedAgreement = this.fieldSupport(
      predictions.map((p) => p.diff.removedEntities),
      ids,
    );
    const parameterAgreement = this.fieldSupport(
      predictions.map((p) => p.diff.parametersChanged),
      ids,
    );

    const n = predictions.length;
    const selectionCount = predictions.filter((p) => p.diff.selectionChanged).length;
    const unitsCount = predictions.filter((p) => p.diff.unitsChanged).length;
    const selectionChangedAgreement = n === 0 ? 0 : selectionCount / n;
    const unitsChangedAgreement = n === 0 ? 0 : unitsCount / n;

    const pairwiseSimilarity: PairSimilarity[] = [];
    let pairwiseSum = 0;
    let pairwiseCount = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const jaccard = this.jaccard(fieldSets[i], fieldSets[j]);
        pairwiseSimilarity.push({ a: ids[i], b: ids[j], jaccard });
        pairwiseSum += jaccard;
        pairwiseCount += 1;
      }
    }
    // For N=1, mean agreement is 1.0 by convention (trivial self-agreement).
    const meanAgreement = pairwiseCount === 0 ? 1.0 : pairwiseSum / pairwiseCount;
    const unanimousIdentical = predictions.every((p) => p.diff.identical === true);

    return {
      predictionCount: n,
      addedEntityAgreement: addedAgreement,
      removedEntityAgreement: removedAgreement,
      parameterChangeAgreement: parameterAgreement,
      selectionChangedAgreement,
      unitsChangedAgreement,
      pairwiseSimilarity,
      meanAgreement,
      unanimousIdentical,
    };
  }

  /** Pick the medoid prediction (highest mean Jaccard to all others) and
   *  report dissenters. Throws on invalid input; tie-broken by input
   *  order (first prediction wins ties — deterministic). */
  pick(
    predictions: CADPrediction[],
    opts: CADConsensusPickOptions = {},
  ): CADConsensusPick {
    this.validatePredictions(predictions);
    const dissentThreshold = opts.dissentThreshold ?? 0.5;
    if (!Number.isFinite(dissentThreshold) || dissentThreshold < 0 || dissentThreshold > 1) {
      throw new Error(
        `CADConsensusEngine.pick: dissentThreshold must be a finite number in [0,1] (got ${dissentThreshold})`,
      );
    }

    const n = predictions.length;
    const fieldSets = predictions.map((p) => this.flatFieldSet(p.diff));

    // For N=1 there is no comparison to make.
    if (n === 1) {
      return {
        pickedId: predictions[0].id,
        pickedDiff: predictions[0].diff,
        pickedScore: 1.0,
        dissenters: [],
        unanimous: true,
      };
    }

    // For each prediction, mean Jaccard against every other one.
    let bestIndex = 0;
    let bestScore = -1;
    const meanScores: number[] = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        sum += this.jaccard(fieldSets[i], fieldSets[j]);
      }
      const mean = sum / (n - 1);
      meanScores[i] = mean;
      // Strict > preserves input order on ties → deterministic.
      if (mean > bestScore) {
        bestScore = mean;
        bestIndex = i;
      }
    }

    const picked = predictions[bestIndex];
    const pickedSet = fieldSets[bestIndex];
    const dissenters: CADConsensusDissenter[] = [];
    let allOnes = true;
    for (let i = 0; i < n; i++) {
      if (i === bestIndex) continue;
      const agreement = this.jaccard(pickedSet, fieldSets[i]);
      if (agreement < 1) allOnes = false;
      if (agreement < dissentThreshold) {
        dissenters.push({
          id: predictions[i].id,
          agreement,
          differingFields: this.symmetricDifference(pickedSet, fieldSets[i]),
        });
      }
    }

    return {
      pickedId: picked.id,
      pickedDiff: picked.diff,
      pickedScore: bestScore,
      dissenters,
      unanimous: allOnes,
    };
  }

  /** Compare projected parameter VALUES across predictions. Predictions
   *  without projectedState are skipped. Returns a per-parameter map of
   *  {value, supporters} clusters — clusters within PARAM_EPSILON of
   *  each other are merged. A parameter with one cluster has unanimous
   *  numerical agreement; multiple clusters means the LLMs computed
   *  different values for the same parameter. */
  parameterValueClusters(
    predictions: CADPrediction[],
  ): Record<string, Array<{ value: number; supporters: string[] }>> {
    this.validatePredictions(predictions);
    const out: Record<string, Array<{ value: number; supporters: string[] }>> = {};
    for (const p of predictions) {
      if (!p.projectedState) continue;
      const params = p.projectedState.parameters;
      for (const name of Object.keys(params)) {
        const v = params[name];
        if (!Number.isFinite(v)) continue;
        const clusters = out[name] ?? [];
        let placed = false;
        for (const c of clusters) {
          if (Math.abs(c.value - v) <= PARAM_EPSILON) {
            c.supporters.push(p.id);
            placed = true;
            break;
          }
        }
        if (!placed) clusters.push({ value: v, supporters: [p.id] });
        out[name] = clusters;
      }
    }
    return out;
  }

  // ────────────────── private helpers ──────────────────

  private validatePredictions(predictions: unknown): asserts predictions is CADPrediction[] {
    if (!Array.isArray(predictions)) {
      throw new Error("CADConsensusEngine: predictions must be an array");
    }
    if (predictions.length === 0) {
      throw new Error("CADConsensusEngine: predictions must contain at least 1 entry");
    }
    const seen = new Set<string>();
    for (let i = 0; i < predictions.length; i++) {
      const p = predictions[i] as CADPrediction;
      if (!p || typeof p !== "object") {
        throw new Error(`CADConsensusEngine: predictions[${i}] must be an object`);
      }
      if (typeof p.id !== "string" || p.id.trim().length === 0) {
        throw new Error(
          `CADConsensusEngine: predictions[${i}].id must be a non-empty string`,
        );
      }
      if (seen.has(p.id)) {
        throw new Error(`CADConsensusEngine: duplicate prediction id '${p.id}'`);
      }
      seen.add(p.id);
      this.validateDiff(p.diff, i);
    }
  }

  private validateDiff(diff: unknown, index: number): asserts diff is CADWorldDiff {
    if (!diff || typeof diff !== "object") {
      throw new Error(`CADConsensusEngine: predictions[${index}].diff must be an object`);
    }
    const d = diff as Record<string, unknown>;
    const arrayFields: Array<keyof CADWorldDiff> = [
      "addedEntities",
      "removedEntities",
      "parametersChanged",
    ];
    for (const field of arrayFields) {
      const v = d[field as string];
      if (!Array.isArray(v)) {
        throw new Error(
          `CADConsensusEngine: predictions[${index}].diff.${String(field)} must be an array`,
        );
      }
      for (let k = 0; k < v.length; k++) {
        if (typeof v[k] !== "string") {
          throw new Error(
            `CADConsensusEngine: predictions[${index}].diff.${String(field)}[${k}] must be a string`,
          );
        }
      }
    }
    if (typeof d.selectionChanged !== "boolean") {
      throw new Error(
        `CADConsensusEngine: predictions[${index}].diff.selectionChanged must be a boolean`,
      );
    }
    if (typeof d.unitsChanged !== "boolean") {
      throw new Error(
        `CADConsensusEngine: predictions[${index}].diff.unitsChanged must be a boolean`,
      );
    }
    if (typeof d.identical !== "boolean") {
      throw new Error(
        `CADConsensusEngine: predictions[${index}].diff.identical must be a boolean`,
      );
    }
  }

  /** Per-field support across N predictions. The buckets array is one
   *  entry per prediction, each carrying that prediction's string ids
   *  for the field (e.g. addedEntities). Output is sorted by field id
   *  for stable rendering / diffing. */
  private fieldSupport(buckets: string[][], ids: string[]): FieldSupport[] {
    const n = ids.length;
    const support = new Map<string, string[]>();
    for (let i = 0; i < n; i++) {
      // Per-prediction dedupe: a diff that lists the same id twice still
      // counts as one supporter for that prediction.
      const seen = new Set<string>();
      for (const id of buckets[i]) {
        if (seen.has(id)) continue;
        seen.add(id);
        const list = support.get(id) ?? [];
        list.push(ids[i]);
        support.set(id, list);
      }
    }
    const out: FieldSupport[] = [];
    for (const [field, supporters] of support.entries()) {
      out.push({ field, supportFraction: supporters.length / n, supporters });
    }
    // Sort by field id for deterministic output.
    out.sort((a, b) => (a.field < b.field ? -1 : a.field > b.field ? 1 : 0));
    return out;
  }

  /** Project a CADWorldDiff onto a flat tokenized set so two diffs can
   *  be compared by Jaccard. Token prefixes guarantee disjoint
   *  namespaces (entity id "x" added by A cannot accidentally Jaccard
   *  with parameter "x" changed by B). */
  private flatFieldSet(diff: CADWorldDiff): Set<string> {
    const set = new Set<string>();
    for (const id of diff.addedEntities) set.add(`added:${id}`);
    for (const id of diff.removedEntities) set.add(`removed:${id}`);
    for (const name of diff.parametersChanged) set.add(`param:${name}`);
    if (diff.selectionChanged) set.add("selection-changed");
    if (diff.unitsChanged) set.add("units-changed");
    return set;
  }

  /** Jaccard over two field sets. Empty-vs-empty returns 1.0 (both
   *  predictions agree on the no-op outcome). */
  private jaccard(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 && b.size === 0) return 1.0;
    let intersection = 0;
    for (const v of a) if (b.has(v)) intersection += 1;
    const union = a.size + b.size - intersection;
    if (union === 0) return 1.0;
    return intersection / union;
  }

  /** Symmetric difference of two field sets, sorted for stable output. */
  private symmetricDifference(a: Set<string>, b: Set<string>): string[] {
    const out: string[] = [];
    for (const v of a) if (!b.has(v)) out.push(v);
    for (const v of b) if (!a.has(v)) out.push(v);
    out.sort();
    return out;
  }
}

/** Singleton — engine is stateless, callers may share one instance. */
export const cadConsensusEngine = new CADConsensusEngine();