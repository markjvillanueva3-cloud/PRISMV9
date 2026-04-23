/**
 * WEDMWireSpoolConsumptionEngine — Wire Spool Consumption + Mid-Job Change Flag
 * P2P-FULLSTACK-MS0 / U-P2PFS41
 *
 * Purpose
 * -------
 * Given the total wire consumption for a WEDM job (total_wire_m) and a spool
 * capacity, projects:
 *   • how many spools are required
 *   • whether a mid-job spool change is unavoidable
 *   • the wire-consumption point(s) at which the change(s) occur
 *   • the downtime and cost of those change events
 *   • a 4-tier risk classification used by the UI card
 *
 * Key semantics
 * -------------
 * A fresh spool (wire_remaining_m ≈ spool_capacity_m) is the default. If the
 * caller passes `wire_remaining_m < spool_capacity_m`, the engine treats that
 * as an already-partially-used spool and bases the first change point on
 * that residual.
 *
 * Change count  — how many mid-job threadings are needed:
 *     0 changes → 'none'
 *     1 change  → 'single_change'
 *     2 changes → 'multiple_changes'
 *     ≥ high_exposure_change_count → 'high_exposure'
 *
 * Sources
 * -------
 *   • Berkenhoff Bedra Cut Master B datasheet (2023) — OEM spool capacities
 *   • Mitsubishi MV-series service manual — auto-threader timing
 *   • JM Die operator logs 2024 — manual threading time median
 */

import { WEDM_SPOOL_SPEC, WEDM_DEFAULT_RATES } from "../physics/wedm-constants.js";

// ============================================================================
// TYPES
// ============================================================================

export interface WireSpoolConsumptionInput {
  /** Total wire required for the full job (m). Must be > 0. */
  total_wire_m: number;
  /** Usable wire length on a fresh spool (m). Must be > 0. */
  spool_capacity_m: number;
  /** Wire remaining on the currently loaded spool (m). Defaults to spool_capacity_m. */
  wire_remaining_m?: number;
  /** If true, use AT (auto-threader) timing; else manual threading. */
  auto_threader_available?: boolean;
  /** Machine burden rate (USD/hr) for downtime costing. */
  machine_rate_usd_hr?: number;
}

export type MidJobChangeRisk =
  | "none"
  | "single_change"
  | "multiple_changes"
  | "high_exposure";

export interface WireSpoolConsumptionResult {
  spool_capacity_m: number;
  wire_remaining_m: number;
  total_wire_m: number;
  /** ceil((total − current_remaining) / capacity) — fresh-spool count to cover shortage. */
  spools_required: number;
  /** Number of mid-job threading events implied by the above. */
  spool_changes_required: number;
  /** Wire-consumption values (cumulative m) where each change will happen. */
  change_points_m: number[];
  /** Remaining wire on the final spool after job completion (m). */
  wire_remaining_after_job_m: number;
  /** Per-change threading time [min]. */
  per_change_time_min: number;
  /** Total spool-change downtime for this job [min]. */
  total_change_time_min: number;
  /** Total spool-change cost at machine rate [USD]. */
  total_change_cost_usd: number;
  mid_job_change_risk: MidJobChangeRisk;
  warnings: string[];
  recommendations: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class WEDMWireSpoolConsumptionEngine {
  /**
   * Compute spool-consumption projection plus mid-job change risk.
   * Throws on non-positive total_wire_m or spool_capacity_m, or
   * on wire_remaining_m outside [0, spool_capacity_m].
   */
  calculate(input: WireSpoolConsumptionInput): WireSpoolConsumptionResult {
    this.validate(input);

    const spec = WEDM_SPOOL_SPEC;
    const {
      total_wire_m,
      spool_capacity_m,
      wire_remaining_m = spool_capacity_m,
      auto_threader_available = false,
      machine_rate_usd_hr = WEDM_DEFAULT_RATES.machine_rate_usd_hr,
    } = input;

    // Usable wire before the first change:
    //   the operator loses the last `end_of_spool_buffer_m` of each spool because
    //   dragging the bitter end through the guides risks jams.
    const usableFromCurrent = Math.max(0, wire_remaining_m - spec.end_of_spool_buffer_m);

    // If current spool alone suffices, no changes at all.
    let spool_changes_required = 0;
    const change_points_m: number[] = [];
    let cumulative_consumed_m = 0;
    let wire_remaining_after_job_m = wire_remaining_m - total_wire_m;

    if (total_wire_m > usableFromCurrent) {
      // First change at the point where the current spool drops to buffer.
      cumulative_consumed_m = usableFromCurrent;
      change_points_m.push(round3(cumulative_consumed_m));
      spool_changes_required = 1;

      // Per-fresh-spool usable wire after first change.
      const usableFromFresh = Math.max(0, spool_capacity_m - spec.end_of_spool_buffer_m);
      let remaining_job = total_wire_m - cumulative_consumed_m;

      while (remaining_job > usableFromFresh) {
        cumulative_consumed_m += usableFromFresh;
        change_points_m.push(round3(cumulative_consumed_m));
        spool_changes_required += 1;
        remaining_job -= usableFromFresh;
      }

      // After the final change, the last (partial) spool covers remaining_job.
      wire_remaining_after_job_m = spool_capacity_m - remaining_job;
    }

    // Total spools required to cover the full job (current + fresh swaps).
    // ceil((total_wire_m - wire_remaining_m) / spool_capacity_m) + 1 if a
    // current-spool shortfall exists; otherwise 1 (just current).
    const shortfall_m = Math.max(0, total_wire_m - wire_remaining_m);
    const spools_required =
      shortfall_m <= 0 ? 1 : 1 + Math.ceil(shortfall_m / spool_capacity_m);

    const per_change_time_min = auto_threader_available
      ? spec.auto_thread_min
      : spec.manual_thread_min;
    const total_change_time_min = spool_changes_required * per_change_time_min;
    const total_change_cost_usd =
      (total_change_time_min / 60) * machine_rate_usd_hr;

    const mid_job_change_risk = this.classifyRisk(spool_changes_required);
    const warnings = this.buildWarnings(
      spool_changes_required,
      wire_remaining_after_job_m,
      spec,
    );
    const recommendations = this.buildRecommendations(
      mid_job_change_risk,
      spool_changes_required,
      auto_threader_available,
      wire_remaining_after_job_m,
      spec,
    );

    return {
      spool_capacity_m: round3(spool_capacity_m),
      wire_remaining_m: round3(wire_remaining_m),
      total_wire_m: round3(total_wire_m),
      spools_required,
      spool_changes_required,
      change_points_m,
      wire_remaining_after_job_m: round3(wire_remaining_after_job_m),
      per_change_time_min: round3(per_change_time_min),
      total_change_time_min: round3(total_change_time_min),
      total_change_cost_usd: round3(total_change_cost_usd),
      mid_job_change_risk,
      warnings,
      recommendations,
    };
  }

  // ────────────────────────────────────────────────────────────────────
  // Private helpers
  // ────────────────────────────────────────────────────────────────────

  private validate(input: WireSpoolConsumptionInput): void {
    const { total_wire_m, spool_capacity_m, wire_remaining_m, machine_rate_usd_hr } = input;
    if (!(total_wire_m > 0)) {
      throw new Error(`Invalid total_wire_m: ${total_wire_m} — must be > 0`);
    }
    if (!(spool_capacity_m > 0)) {
      throw new Error(`Invalid spool_capacity_m: ${spool_capacity_m} — must be > 0`);
    }
    if (
      wire_remaining_m != null &&
      !(wire_remaining_m >= 0 && wire_remaining_m <= spool_capacity_m)
    ) {
      throw new Error(
        `Invalid wire_remaining_m: ${wire_remaining_m} — must be in [0, ${spool_capacity_m}]`,
      );
    }
    if (machine_rate_usd_hr != null && !(machine_rate_usd_hr >= 0)) {
      throw new Error(
        `Invalid machine_rate_usd_hr: ${machine_rate_usd_hr} — must be >= 0 when provided`,
      );
    }
  }

  private classifyRisk(changes: number): MidJobChangeRisk {
    if (changes === 0) return "none";
    if (changes === 1) return "single_change";
    if (changes < WEDM_SPOOL_SPEC.high_exposure_change_count) return "multiple_changes";
    return "high_exposure";
  }

  private buildWarnings(
    changes: number,
    remaining_after_m: number,
    spec: typeof WEDM_SPOOL_SPEC,
  ): string[] {
    const warnings: string[] = [];
    if (changes >= spec.high_exposure_change_count) {
      warnings.push(
        `${changes} spool changes required — consider jumbo (16 kg+) spool or batching jobs.`,
      );
    }
    if (remaining_after_m < spec.end_of_spool_buffer_m && changes > 0) {
      warnings.push(
        `Final spool will have only ${remaining_after_m.toFixed(0)} m remaining — under the ${spec.end_of_spool_buffer_m} m safety buffer. Load a fresh spool before next job.`,
      );
    }
    return warnings;
  }

  private buildRecommendations(
    risk: MidJobChangeRisk,
    changes: number,
    auto: boolean,
    remaining_after_m: number,
    spec: typeof WEDM_SPOOL_SPEC,
  ): string[] {
    const recs: string[] = [];

    if (risk === "none") {
      recs.push("Current spool has sufficient wire — no mid-job change required.");
      if (remaining_after_m < spec.end_of_spool_buffer_m * 2) {
        recs.push(
          `Plan a fresh spool for the next job: only ${remaining_after_m.toFixed(0)} m will remain.`,
        );
      }
      return recs;
    }

    if (!auto && changes >= 1) {
      recs.push(
        `Manual threading at ${spec.manual_thread_min} min per event — enable auto-threader (${spec.auto_thread_min} min) to reduce downtime.`,
      );
    }

    if (risk === "single_change") {
      recs.push("One mid-job change required — schedule operator attention at the change point.");
    } else if (risk === "multiple_changes") {
      recs.push(
        `${changes} mid-job changes expected — validate wire routing and ensure spare spools are pre-staged at the machine.`,
      );
    } else if (risk === "high_exposure") {
      recs.push(
        `${changes} changes is high exposure — split the job across multiple runs or upgrade to a jumbo spool to halve the change count.`,
      );
    }

    return recs;
  }
}

// Helpers
function round3(x: number): number {
  return Number.isFinite(x) ? Math.round(x * 1000) / 1000 : x;
}

export const wedmWireSpoolConsumptionEngine = new WEDMWireSpoolConsumptionEngine();
