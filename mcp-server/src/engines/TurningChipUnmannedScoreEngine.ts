/**
 * TurningChipUnmannedScoreEngine
 * ==============================
 *
 * Chip-management-specific lights-out readiness score (U-LPC05, MS7).
 * Complements `SwissUnmannedReadinessEngine` (5-factor whole-run score)
 * by focusing narrowly on chip evacuation: conveyor throughput vs chip
 * generation rate, filter life, and chip-form-driven wrapping risk.
 *
 * A RED score here maps directly into the chip-control gate hook:
 * unresolved chip wrapping with no mitigation is a machine-crash risk
 * for unattended overnight runs and must block emission.
 *
 * ── Score logic ────────────────────────────────────────────────
 *   GREEN  — conveyor headroom ≥ 50 %, filter life ≥ 2× batch, wrapping
 *            risk < 25 (low), every chip-wrapping mitigation already
 *            applied when risk ≥ 25.
 *   YELLOW — conveyor 20-50 % headroom OR filter 1-2× batch OR wrapping
 *            risk 25-60 with at least one mitigation applied.
 *   RED    — conveyor < 20 % headroom OR filter < batch OR wrapping risk
 *            ≥ 25 with zero mitigations applied OR wrapping risk ≥ 60.
 *
 * @module engines/TurningChipUnmannedScoreEngine
 * @milestone LATHE-PRO-MS7 / U-LPC05
 */

export type ChipVerdict = "GREEN" | "YELLOW" | "RED";

export interface ChipUnmannedInput {
  /** Batch quantity. */
  batch_quantity: number;
  /** Cycle time per part (s). */
  cycle_time_s: number;
  /** Chip volume per part (mm³). */
  chip_volume_mm3_per_part: number;
  /** Chip conveyor throughput (mm³/s). */
  conveyor_rate_mm3_s: number;
  /** Coolant filter remaining life (hours). */
  coolant_filter_life_h: number;
  /** Wrapping risk score (0-100) from TurningChipWrappingRiskEngine. */
  wrapping_risk_score: number;
  /** Number of chip-wrapping mitigations already applied (oscillating_feed, forced_peck, etc). */
  mitigations_applied: number;
}

export interface ChipUnmannedResult {
  verdict: ChipVerdict;
  conveyor_headroom_pct: number;
  filter_life_ratio: number;
  wrapping_risk_score: number;
  mitigations_applied: number;
  batch_duration_h: number;
  reasons: string[];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export class TurningChipUnmannedScoreEngine {
  assess(input: ChipUnmannedInput): ChipUnmannedResult {
    const reasons: string[] = [];
    const chipRateNeeded = input.chip_volume_mm3_per_part / input.cycle_time_s;
    const headroom = chipRateNeeded > 0
      ? ((input.conveyor_rate_mm3_s - chipRateNeeded) / chipRateNeeded) * 100
      : 100;
    const batchDurationH = (input.batch_quantity * input.cycle_time_s) / 3600;
    const filterRatio = batchDurationH > 0 ? input.coolant_filter_life_h / batchDurationH : Infinity;

    let verdict: ChipVerdict = "GREEN";

    // Conveyor headroom check.
    if (headroom < 20) {
      verdict = "RED";
      reasons.push(
        `Chip conveyor headroom ${round2(headroom)}% < 20% — evacuation will fall behind generation.`,
      );
    } else if (headroom < 50) {
      verdict = verdict === "RED" ? "RED" : "YELLOW";
      reasons.push(
        `Chip conveyor headroom ${round2(headroom)}% below lights-out floor (50%).`,
      );
    }

    // Filter life check.
    if (filterRatio < 1) {
      verdict = "RED";
      reasons.push(
        `Coolant filter life ${round2(input.coolant_filter_life_h)}h < batch duration ${round2(batchDurationH)}h.`,
      );
    } else if (filterRatio < 2) {
      verdict = verdict === "RED" ? "RED" : "YELLOW";
      reasons.push(
        `Coolant filter life only ${round2(filterRatio)}× batch — replace before unattended run.`,
      );
    }

    // Wrapping risk check.
    if (input.wrapping_risk_score >= 60) {
      verdict = "RED";
      reasons.push(
        `Wrapping risk ${input.wrapping_risk_score}/100 is HIGH/EXTREME — mandatory mitigations required.`,
      );
    } else if (input.wrapping_risk_score >= 25 && input.mitigations_applied === 0) {
      verdict = "RED";
      reasons.push(
        `Wrapping risk ${input.wrapping_risk_score}/100 with zero mitigations applied — attended only.`,
      );
    } else if (input.wrapping_risk_score >= 25) {
      verdict = verdict === "RED" ? "RED" : "YELLOW";
      reasons.push(
        `Wrapping risk ${input.wrapping_risk_score}/100 — ${input.mitigations_applied} mitigation(s) applied; keep operator notified.`,
      );
    }

    if (verdict === "GREEN" && reasons.length === 0) {
      reasons.push("Chip management clear — conveyor headroom, filter life, and wrapping risk all within lights-out envelope.");
    }

    return {
      verdict,
      conveyor_headroom_pct: round2(headroom),
      filter_life_ratio: round2(filterRatio),
      wrapping_risk_score: input.wrapping_risk_score,
      mitigations_applied: input.mitigations_applied,
      batch_duration_h: round2(batchDurationH),
      reasons,
    };
  }
}

/** Singleton instance. */
export const turningChipUnmannedScoreEngine = new TurningChipUnmannedScoreEngine();
