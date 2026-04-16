/**
 * WEDMMaterialCharacterizationEngine — WEDM AGI Phase 1 / U-P1-09
 *
 * Infers the workpiece material from an observed WEDM spark signature
 * using the Klocke Ra model and signature-distance scoring against the
 * U-P1-10 database (WEDMMaterialSparkDatabaseEngine).
 *
 * This is the inverse problem of U-P1-10:
 *     U-P1-10:   material → predicted spark signature
 *     U-P1-09:   observed spark signature → candidate material + confidence
 *
 * Distinct from:
 *   - EDMMaterialMachineWireEngine  (assumes material is already known;
 *                                    selects wire/machine for it)
 *   - PDFMaterialPropertyExtractionEngine (extracts properties from PDFs)
 *
 * Exit gate (P1-MS3):
 *   - ≥80% accuracy on known materials (verified on 12 synthetic
 *     observations generated from the canonical signatures).
 *   - Unknown material triggers OOD flag (no silent classification).
 *
 * @see WEDMMaterialSparkDatabaseEngine — signature database (U-P1-10)
 * @see WEDMKalmanFusionEngine          — fused channel source
 */

import {
  wedmMaterialSparkDatabaseEngine,
  type WEDMMaterialKey,
  type WEDMSparkSignature,
  type SparkSignatureObservation,
} from "./WEDMMaterialSparkDatabaseEngine.js";

// ────────────────────────── Types ──────────────────────────

export interface MaterialCharacterizationInput {
  observation: SparkSignatureObservation;
  /**
   * Threshold on the best-match normalized distance above which the
   * result is flagged OOD. Default 1.0 — matches the database's default
   * OOD threshold for consistency.
   */
  ood_threshold?: number;
  /** Top-N candidates to return (default 3). */
  top_n?: number;
}

export interface MaterialCandidate {
  key: WEDMMaterialKey;
  display_name: string;
  /** Normalized signature distance — lower is a better match. */
  distance: number;
  /** Confidence ∈ [0,1] — derived from distance via exp(-d). */
  confidence: number;
  /** Flags carried from the DB entry (hazards, crack risk, etc.). */
  flags: string[];
}

export interface MaterialCharacterizationResult {
  /** The top candidate, or null if OOD beyond ood_threshold. */
  identified: WEDMMaterialKey | null;
  identified_display_name: string | null;
  /**
   * True if no material is within ood_threshold; the UI must prompt the
   * operator rather than silently accept the top candidate.
   */
  is_out_of_distribution: boolean;
  /** Ranked alternatives (top_n), sorted by ascending distance. */
  candidates: MaterialCandidate[];
  /** Predicted Ra for the top candidate at the observed (ie, te). */
  predicted_Ra_um: number | null;
  /** Measured Ra passed through from the observation. */
  measured_Ra_um: number;
  /** Actionable guidance. */
  notes: string[];
}

// ────────────────────────── Engine ──────────────────────────

export class WEDMMaterialCharacterizationEngine {
  /**
   * Infer the workpiece material from a spark-signature observation.
   *
   * Algorithm:
   *   1. Score every DB material by normalized signature distance.
   *   2. Sort ascending and keep the top-N candidates.
   *   3. If the best distance exceeds `ood_threshold`, flag OOD and return
   *      `identified = null`. The UI MUST prompt the operator — this is
   *      the "no silent classification" exit-gate guarantee.
   *   4. Otherwise, return the top match with confidence = exp(-d).
   */
  characterize(
    input: MaterialCharacterizationInput,
  ): MaterialCharacterizationResult {
    const { observation } = input;
    const threshold = input.ood_threshold ?? 1.0;
    const topN = Math.max(1, input.top_n ?? 3);

    const all = wedmMaterialSparkDatabaseEngine.list();
    const scored: Array<MaterialCandidate & { sig: WEDMSparkSignature }> = all
      .map((sig) => {
        const d = wedmMaterialSparkDatabaseEngine.distance(sig.key, observation);
        return {
          sig,
          key: sig.key,
          display_name: sig.display_name,
          distance: d,
          confidence: Math.exp(-d),
          flags: sig.flags,
        };
      })
      .sort((a, b) => a.distance - b.distance);

    const best = scored[0];
    const is_ood = best.distance > threshold;
    const topCandidates: MaterialCandidate[] = scored.slice(0, topN).map((c) => ({
      key: c.key,
      display_name: c.display_name,
      distance: c.distance,
      confidence: c.confidence,
      flags: c.flags,
    }));

    const notes: string[] = [];
    if (is_ood) {
      notes.push(
        `Best match (${best.key}) distance ${best.distance.toFixed(2)} exceeds OOD threshold ${threshold.toFixed(2)}.`,
      );
      notes.push(
        "No silent classification — operator must confirm material before continuing.",
      );
    } else {
      if (best.flags.length > 0) {
        notes.push(
          `Advisory flags for ${best.key}: ${best.flags.join(", ")}.`,
        );
      }
      if (
        scored.length > 1 &&
        scored[1].distance - best.distance < 0.1
      ) {
        notes.push(
          `Close call with ${scored[1].key} (Δ distance = ${(scored[1].distance - best.distance).toFixed(3)}).`,
        );
      }
    }

    const predicted_Ra_um = wedmMaterialSparkDatabaseEngine.predictRaUm(
      best.key,
      observation.peak_current_A,
      observation.pulse_on_us,
    );

    return {
      identified: is_ood ? null : best.key,
      identified_display_name: is_ood ? null : best.display_name,
      is_out_of_distribution: is_ood,
      candidates: topCandidates,
      predicted_Ra_um,
      measured_Ra_um: observation.measured_Ra_um,
      notes,
    };
  }

  /**
   * Batch classifier — accuracy report given ground-truth labels. Used
   * by the exit-gate test and by the orchestration layer when feeding a
   * batch of calibration observations.
   */
  evaluateAccuracy(
    cases: Array<{ truth: WEDMMaterialKey; obs: SparkSignatureObservation }>,
    ood_threshold = 1.0,
  ): {
    total: number;
    correct: number;
    accuracy: number;
    ood_count: number;
    misclassified: Array<{ truth: WEDMMaterialKey; predicted: WEDMMaterialKey | null }>;
  } {
    let correct = 0;
    let ood_count = 0;
    const misclassified: Array<{
      truth: WEDMMaterialKey;
      predicted: WEDMMaterialKey | null;
    }> = [];
    for (const c of cases) {
      const r = this.characterize({
        observation: c.obs,
        ood_threshold,
      });
      if (r.is_out_of_distribution) ood_count++;
      if (r.identified === c.truth) {
        correct++;
      } else {
        misclassified.push({ truth: c.truth, predicted: r.identified });
      }
    }
    return {
      total: cases.length,
      correct,
      accuracy: cases.length > 0 ? correct / cases.length : 1,
      ood_count,
      misclassified,
    };
  }
}

export const wedmMaterialCharacterizationEngine =
  new WEDMMaterialCharacterizationEngine();
