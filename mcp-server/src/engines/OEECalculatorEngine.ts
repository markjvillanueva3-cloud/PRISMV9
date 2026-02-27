/**
 * OEECalculatorEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Calculates Overall Equipment Effectiveness (OEE) — the gold standard
 * KPI for manufacturing productivity. OEE = Availability × Performance × Quality.
 *
 * Models: planned vs unplanned downtime, speed losses, quality losses,
 * and six big losses categorization per TPM methodology.
 *
 * Actions: oee_calc, oee_trend, oee_losses
 */

// ============================================================================
// TYPES
// ============================================================================

export interface OEEInput {
  planned_production_time_min: number;
  actual_run_time_min: number;
  planned_downtime_min: number;       // scheduled maintenance, breaks
  unplanned_downtime_min: number;     // breakdowns, changeovers
  ideal_cycle_time_sec: number;       // per part
  actual_cycle_time_sec: number;
  total_parts_produced: number;
  good_parts: number;
  machine_id?: string;
  shift?: string;
  date?: string;
}

export interface OEEResult {
  oee_pct: number;
  availability_pct: number;
  performance_pct: number;
  quality_pct: number;
  world_class: boolean;               // OEE >= 85%
  six_big_losses: {
    breakdowns_min: number;
    setup_adjustment_min: number;
    minor_stops_min: number;
    reduced_speed_min: number;
    startup_rejects: number;
    production_rejects: number;
  };
  parts_per_hour_actual: number;
  parts_per_hour_ideal: number;
  time_lost_min: number;
  recommendations: string[];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class OEECalculatorEngine {
  calculate(input: OEEInput): OEEResult {
    // Available time = planned production - planned downtime
    const availableTime = input.planned_production_time_min - input.planned_downtime_min;

    // Availability = run time / available time
    const runTime = input.actual_run_time_min;
    const availability = availableTime > 0 ? runTime / availableTime : 0;

    // Performance = (ideal cycle time × total parts) / run time
    const idealRunTime = (input.ideal_cycle_time_sec * input.total_parts_produced) / 60;
    const performance = runTime > 0 ? idealRunTime / runTime : 0;

    // Quality = good parts / total parts
    const quality = input.total_parts_produced > 0 ? input.good_parts / input.total_parts_produced : 0;

    // OEE
    const oee = availability * performance * quality * 100;

    // Six big losses
    const breakdowns = input.unplanned_downtime_min * 0.6; // assume 60% is breakdowns
    const setupAdj = input.unplanned_downtime_min * 0.4;   // 40% is setup/changeover
    const speedLoss = runTime - idealRunTime;
    const minorStops = speedLoss > 0 ? speedLoss * 0.3 : 0;
    const reducedSpeed = speedLoss > 0 ? speedLoss * 0.7 : 0;
    const rejects = input.total_parts_produced - input.good_parts;
    const startupRejects = Math.round(rejects * 0.2);
    const prodRejects = rejects - startupRejects;

    // Throughput
    const actualPPH = runTime > 0 ? input.total_parts_produced / (runTime / 60) : 0;
    const idealPPH = input.ideal_cycle_time_sec > 0 ? 3600 / input.ideal_cycle_time_sec : 0;

    // Time lost
    const timeLost = availableTime - (input.good_parts * input.ideal_cycle_time_sec / 60);

    // Recommendations
    const recs: string[] = [];
    if (availability * 100 < 90) {
      recs.push(`Low availability (${(availability * 100).toFixed(1)}%) — focus on reducing unplanned downtime (${input.unplanned_downtime_min}min)`);
    }
    if (performance * 100 < 95) {
      recs.push(`Performance gap (${(performance * 100).toFixed(1)}%) — investigate speed losses and minor stops`);
    }
    if (quality * 100 < 99) {
      recs.push(`Quality below 99% (${(quality * 100).toFixed(1)}%) — ${rejects} rejects need root cause analysis`);
    }
    if (oee >= 85) {
      recs.push("World-class OEE (≥85%) — maintain current practices");
    } else if (oee >= 65) {
      recs.push("Typical OEE — significant improvement opportunity exists");
    } else {
      recs.push("Low OEE — prioritize largest loss category for improvement");
    }

    return {
      oee_pct: Math.round(oee * 10) / 10,
      availability_pct: Math.round(availability * 1000) / 10,
      performance_pct: Math.round(performance * 1000) / 10,
      quality_pct: Math.round(quality * 1000) / 10,
      world_class: oee >= 85,
      six_big_losses: {
        breakdowns_min: Math.round(breakdowns * 10) / 10,
        setup_adjustment_min: Math.round(setupAdj * 10) / 10,
        minor_stops_min: Math.round(minorStops * 10) / 10,
        reduced_speed_min: Math.round(reducedSpeed * 10) / 10,
        startup_rejects: startupRejects,
        production_rejects: prodRejects,
      },
      parts_per_hour_actual: Math.round(actualPPH * 10) / 10,
      parts_per_hour_ideal: Math.round(idealPPH * 10) / 10,
      time_lost_min: Math.round(timeLost * 10) / 10,
      recommendations: recs,
    };
  }
}

export const oeeCalculatorEngine = new OEECalculatorEngine();
