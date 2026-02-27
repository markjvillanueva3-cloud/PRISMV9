/**
 * BarPullerTimingEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Calculates bar puller cycle timing and positioning for bar-fed CNC lathes.
 * Optimizes pull distance, retract timing, and collet open/close sequences
 * to minimize cycle time while ensuring accurate bar positioning.
 *
 * Actions: bar_pull_calc, bar_pull_optimize, bar_pull_validate
 */

// ============================================================================
// TYPES
// ============================================================================

export type BarFeederType = "magazine" | "hydrodynamic" | "servo" | "short_bar";

export interface BarPullerInput {
  bar_diameter_mm: number;
  bar_length_mm: number;               // total bar stock length
  part_length_mm: number;              // finished part length
  cutoff_width_mm: number;             // parting tool width
  facing_allowance_mm: number;         // extra stock per part
  bar_feeder_type: BarFeederType;
  collet_open_time_sec: number;        // time to open main collet
  collet_close_time_sec: number;
  bar_pull_speed_mm_per_sec: number;
  bar_pull_retract_speed_mm_per_sec: number;
  sub_spindle_available: boolean;
  remnant_min_mm: number;              // minimum bar remnant before new bar
}

export interface BarPullerResult {
  pull_distance_mm: number;
  parts_per_bar: number;
  remnant_length_mm: number;
  bar_pull_cycle_time_sec: number;
  total_cycle_addition_sec: number;    // total added time per part
  sequence: string[];                  // step-by-step sequence
  material_utilization_pct: number;
  recommendations: string[];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class BarPullerTimingEngine {
  calculate(input: BarPullerInput): BarPullerResult {
    // Pull distance = part length + cutoff + facing allowance
    const pullDistance = input.part_length_mm + input.cutoff_width_mm + input.facing_allowance_mm;

    // Parts per bar
    const usableLength = input.bar_length_mm - input.remnant_min_mm;
    const partsPerBar = Math.floor(usableLength / pullDistance);
    const remnant = input.bar_length_mm - partsPerBar * pullDistance;

    // Bar pull cycle timing
    const pullTime = pullDistance / input.bar_pull_speed_mm_per_sec;
    const retractTime = pullDistance / input.bar_pull_retract_speed_mm_per_sec;
    const cycleTime = input.collet_open_time_sec + pullTime + input.collet_close_time_sec + retractTime;

    // Additional time includes dwell for collet confirmation
    const dwellTime = 0.3; // confirmation dwell
    const totalAddition = cycleTime + dwellTime;

    // Material utilization
    const utilization = (partsPerBar * input.part_length_mm) / input.bar_length_mm * 100;

    // Sequence
    const sequence: string[] = [
      `1. Spindle stop, orient to 0°`,
      `2. Main collet open (${input.collet_open_time_sec}s)`,
      `3. Bar puller engage at gripping position`,
      `4. Pull bar forward ${pullDistance.toFixed(1)}mm at ${input.bar_pull_speed_mm_per_sec}mm/s (${pullTime.toFixed(1)}s)`,
      `5. Main collet close (${input.collet_close_time_sec}s)`,
      `6. Confirm bar position (0.3s dwell)`,
      `7. Bar puller retract at ${input.bar_pull_retract_speed_mm_per_sec}mm/s (${retractTime.toFixed(1)}s)`,
      `8. Resume spindle, continue program`,
    ];

    // Recommendations
    const recs: string[] = [];
    if (utilization < 85) {
      recs.push(`Material utilization ${utilization.toFixed(1)}% — consider adjusting part nesting or remnant minimum`);
    }
    if (totalAddition > 15) {
      recs.push("Bar pull cycle >15s — optimize collet timing or increase pull speed");
    }
    if (input.sub_spindle_available) {
      recs.push("Sub-spindle available — consider simultaneous bar pull during back-work for zero added cycle time");
    }
    if (partsPerBar < 5) {
      recs.push("Fewer than 5 parts per bar — consider longer bar stock");
    }
    if (recs.length === 0) {
      recs.push("Bar pull parameters optimized — proceed");
    }

    return {
      pull_distance_mm: Math.round(pullDistance * 100) / 100,
      parts_per_bar: partsPerBar,
      remnant_length_mm: Math.round(remnant * 100) / 100,
      bar_pull_cycle_time_sec: Math.round(cycleTime * 100) / 100,
      total_cycle_addition_sec: Math.round(totalAddition * 100) / 100,
      sequence,
      material_utilization_pct: Math.round(utilization * 10) / 10,
      recommendations: recs,
    };
  }
}

export const barPullerTimingEngine = new BarPullerTimingEngine();
