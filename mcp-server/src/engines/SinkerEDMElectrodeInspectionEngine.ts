/**
 * SinkerEDMElectrodeInspectionEngine — sinker-EDM electrode/cavity inspection
 * with spark-gap back-calculation.
 *
 * Roadmap unit muS-D58..D59 (ARC-MS10 — "Electrode inspection protocol").
 *
 * In die-sinking EDM the male electrode burns a cavity larger than itself by
 * one spark gap (overcut) on each side, so for any feature:
 *
 *     measuredCavity = electrodeSize + 2 · sparkGap
 *
 * The inspection protocol measures the finished cavity, back-calculates the
 * ACTUAL spark gap, compares it against the gap EXPECTED from the burn
 * settings (supplied from the process sheet), and flags pass / fail with a
 * ranked root-cause diagnosis whenever the gap is off-target. It also reports
 * cross-feature gap consistency — an even electrode burns an even gap.
 *
 * This engine is pure geometry + inspection logic; it does not model the
 * discharge physics that *predict* a spark gap (that is process planning,
 * a separate concern — the expected gap is an input here).
 *
 * References:
 *   - Jameson, "Electrical Discharge Machining" (SME, 2001), ch.3 —
 *     overcut / spark-gap (lateral gap) geometry.
 *   - Sommer & Sommer, "Complete EDM Handbook", ch.6 — die-sinking
 *     overcut inspection practice.
 */

import { z } from "zod";

/** Default gap tolerance as a fraction of the expected spark gap, used when
 *  neither a per-feature nor a batch absolute tolerance is supplied. A
 *  relative band travels correctly between roughing (large gap) and
 *  finishing (small gap). 0.25 ≈ typical shop allowance for overcut. */
const DEFAULT_GAP_TOLERANCE_FRACTION = 0.25;

/** A finite number — Zod's `.finite()` is deprecated, so refine explicitly. */
const finiteNumber = z.number().refine(Number.isFinite, "must be a finite number");
/** A finite, strictly-positive number. */
const finitePositive = z
  .number()
  .positive()
  .refine(Number.isFinite, "must be a finite number");

export const SinkerEDMElectrodeInspectionInputSchema = z.object({
  /** One entry per inspected feature of the electrode/cavity pair. */
  features: z
    .array(
      z.object({
        /** Human-readable feature identifier (e.g. "pocket A", "rib 3"). */
        label: z.string().min(1),
        /** Measured electrode feature size, mm. */
        electrodeSizeMm: finitePositive,
        /** Measured finished cavity size, mm (same axis as electrodeSizeMm). */
        measuredCavityMm: finitePositive,
        /** Spark gap expected from the burn settings, mm. */
        expectedSparkGapMm: finitePositive,
        /** Absolute allowed |actual − expected| gap deviation, mm. */
        gapToleranceMm: finitePositive.optional(),
      }),
    )
    .min(1),
  /** Absolute gap tolerance applied to any feature that omits its own, mm. */
  defaultGapToleranceMm: finitePositive.optional(),
});
export type SinkerEDMElectrodeInspectionInput = z.infer<
  typeof SinkerEDMElectrodeInspectionInputSchema
>;

export type InspectionStatus = "pass" | "fail" | "measurement_error";
export type InspectionVerdict = "pass" | "fail";

export interface InspectionFinding {
  /** Short root-cause label. */
  cause: string;
  /** Hypothesis confidence, 0..1 — ranked hypotheses, not assertions. */
  confidence: number;
  /** What in the measurement supports this hypothesis. */
  evidence: string;
  /** Recommended corrective action. */
  remedy: string;
}

export interface FeatureInspectionResult {
  label: string;
  /** Back-calculated actual spark gap, mm = (measuredCavity − electrodeSize)/2. */
  actualSparkGapMm: number;
  expectedSparkGapMm: number;
  /** actual − expected, mm (signed: positive = cavity over-burned).
   *  null when status is "measurement_error" — the deviation is not
   *  physically meaningful when the cavity/electrode pairing is invalid. */
  gapDeviationMm: number | null;
  /** Resolved absolute gap tolerance applied to this feature, mm. */
  gapToleranceMm: number;
  withinGapTolerance: boolean;
  status: InspectionStatus;
  /** Ranked root-cause hypotheses (highest confidence first; empty on pass). */
  findings: InspectionFinding[];
}

export interface SinkerEDMElectrodeInspectionResult {
  features: FeatureInspectionResult[];
  /** Mean back-calculated spark gap across all features, mm. */
  meanSparkGapMm: number;
  /** Population std-dev of the back-calculated gaps, mm — burn evenness. */
  sparkGapStdDevMm: number;
  /** True when the gap spread across features is small relative to the mean. */
  gapConsistent: boolean;
  verdict: InspectionVerdict;
  /** Count of features in each status. */
  tally: { pass: number; fail: number; measurementError: number };
  summary: string;
  warnings: string[];
}

/** Gap spread above this fraction of the mean gap is flagged inconsistent. */
const GAP_CONSISTENCY_FRACTION = 0.15;

class SinkerEDMElectrodeInspectionEngine {
  /**
   * Run the electrode/cavity inspection protocol.
   *
   * @param rawInput - {@link SinkerEDMElectrodeInspectionInput} (Zod-validated).
   * @returns A {@link SinkerEDMElectrodeInspectionResult}.
   * @throws  ZodError on malformed input.
   */
  inspect(rawInput: unknown): SinkerEDMElectrodeInspectionResult {
    const input = SinkerEDMElectrodeInspectionInputSchema.parse(rawInput);
    const warnings: string[] = [];

    const features = input.features.map((f) =>
      this.#inspectFeature(f, input.defaultGapToleranceMm, warnings),
    );

    // Cross-feature gap consistency uses only physically-valid gaps.
    const validGaps = features
      .filter((f) => f.status !== "measurement_error")
      .map((f) => f.actualSparkGapMm);
    const meanSparkGapMm = validGaps.length
      ? validGaps.reduce((a, b) => a + b, 0) / validGaps.length
      : 0;
    const sparkGapStdDevMm = this.#stdDev(validGaps, meanSparkGapMm);
    const gapConsistent =
      validGaps.length < 2 ||
      meanSparkGapMm <= 0 ||
      sparkGapStdDevMm <= GAP_CONSISTENCY_FRACTION * meanSparkGapMm;
    if (validGaps.length >= 2 && !gapConsistent) {
      warnings.push(
        "Spark gap varies markedly between features — uneven electrode wear or " +
          "non-uniform flushing across the burn",
      );
    }

    const tally = {
      pass: features.filter((f) => f.status === "pass").length,
      fail: features.filter((f) => f.status === "fail").length,
      measurementError: features.filter((f) => f.status === "measurement_error")
        .length,
    };
    const verdict: InspectionVerdict =
      tally.fail === 0 && tally.measurementError === 0 ? "pass" : "fail";

    return {
      features,
      meanSparkGapMm,
      sparkGapStdDevMm,
      gapConsistent,
      verdict,
      tally,
      summary: this.#summary(verdict, tally, features.length),
      warnings,
    };
  }

  /** Inspect one feature: back-calculate the gap and classify it. */
  #inspectFeature(
    f: SinkerEDMElectrodeInspectionInput["features"][number],
    batchDefaultToleranceMm: number | undefined,
    warnings: string[],
  ): FeatureInspectionResult {
    const actualSparkGapMm = (f.measuredCavityMm - f.electrodeSizeMm) / 2;
    const gapDeviationMm = actualSparkGapMm - f.expectedSparkGapMm;
    const gapToleranceMm =
      f.gapToleranceMm ??
      batchDefaultToleranceMm ??
      DEFAULT_GAP_TOLERANCE_FRACTION * f.expectedSparkGapMm;

    // A cavity must be larger than the electrode that burned it.
    if (actualSparkGapMm <= 0) {
      warnings.push(
        `Feature "${f.label}": measured cavity (${f.measuredCavityMm} mm) is not ` +
          `larger than the electrode (${f.electrodeSizeMm} mm) — back-calculated ` +
          `spark gap is non-positive`,
      );
      return {
        label: f.label,
        actualSparkGapMm,
        expectedSparkGapMm: f.expectedSparkGapMm,
        gapDeviationMm: null,
        gapToleranceMm,
        withinGapTolerance: false,
        status: "measurement_error",
        findings: [
          {
            cause: "Invalid cavity/electrode pairing or measurement error",
            confidence: 0.85,
            evidence:
              "The finished cavity is not larger than the electrode — a burnt " +
              "cavity is always oversized by the spark gap on each side",
            remedy:
              "Re-measure both members on the same axis, confirm the cavity and " +
              "electrode features are correctly paired, and verify the burn ran",
          },
        ],
      };
    }

    const withinGapTolerance = Math.abs(gapDeviationMm) <= gapToleranceMm;
    const status: InspectionStatus = withinGapTolerance ? "pass" : "fail";
    return {
      label: f.label,
      actualSparkGapMm,
      expectedSparkGapMm: f.expectedSparkGapMm,
      gapDeviationMm,
      gapToleranceMm,
      withinGapTolerance,
      status,
      findings: withinGapTolerance ? [] : this.#diagnose(gapDeviationMm),
    };
  }

  /** Ranked sinker-EDM root-cause hypotheses for an off-target spark gap. */
  #diagnose(gapDeviationMm: number): InspectionFinding[] {
    if (gapDeviationMm > 0) {
      // Cavity over-burned — actual gap wider than expected.
      return [
        {
          cause: "Discharge energy above the planned setting",
          confidence: 0.6,
          evidence: "Back-calculated spark gap exceeds the expected gap",
          remedy:
            "Reduce pulse on-time / peak current toward the finishing register; " +
            "re-verify the generator settings against the process sheet",
        },
        {
          cause: "Secondary discharges from inadequate flushing",
          confidence: 0.5,
          evidence:
            "Debris retained in the gap re-ignites discharges and widens the overcut",
          remedy:
            "Improve side / through flushing, add a timed retract (jump) cycle, " +
            "check dielectric filtration and resistivity",
        },
        {
          cause: "Electrode corner / edge wear",
          confidence: 0.4,
          evidence: "A worn electrode prints a larger effective cavity",
          remedy:
            "Inspect the electrode for wear and rotate to a fresh roughing/finishing electrode",
        },
      ];
    }
    // Cavity under-burned — actual gap narrower than expected.
    return [
      {
        cause: "Discharge energy below the planned setting",
        confidence: 0.6,
        evidence: "Back-calculated spark gap is smaller than the expected gap",
        remedy:
          "Raise pulse on-time / peak current toward the planned register; " +
          "confirm the generator is not current-limited or in an over-protective mode",
      },
      {
        cause: "Incomplete burn — finished before reaching final depth/size",
        confidence: 0.45,
        evidence: "An under-sized cavity is consistent with a premature cycle end",
        remedy:
          "Verify the Z-depth / size target and the end-of-burn detection threshold",
      },
      {
        cause: "Electrode larger than its nominal size",
        confidence: 0.4,
        evidence: "An oversized electrode leaves a smaller apparent gap",
        remedy: "Re-inspect the electrode against its drawing before re-burning",
      },
    ];
  }

  /** Population standard deviation of a sample about a supplied mean. */
  #stdDev(xs: number[], mean: number): number {
    if (xs.length < 2) return 0;
    const variance =
      xs.reduce((acc, x) => acc + (x - mean) * (x - mean), 0) / xs.length;
    return Math.sqrt(variance);
  }

  /** One-line human-readable summary. */
  #summary(
    verdict: InspectionVerdict,
    tally: { pass: number; fail: number; measurementError: number },
    total: number,
  ): string {
    if (verdict === "pass") {
      return `Electrode inspection PASS — all ${total} feature(s) within spark-gap tolerance`;
    }
    const parts: string[] = [];
    if (tally.fail > 0) parts.push(`${tally.fail} out of tolerance`);
    if (tally.measurementError > 0) {
      parts.push(`${tally.measurementError} measurement error(s)`);
    }
    return `Electrode inspection FAIL — ${parts.join(", ")} of ${total} feature(s)`;
  }
}

export const sinkerEDMElectrodeInspectionEngine =
  new SinkerEDMElectrodeInspectionEngine();
