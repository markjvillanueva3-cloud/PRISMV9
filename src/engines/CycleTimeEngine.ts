/**
 * CycleTimeEngine — Complete Cycle Time Breakdown Calculator
 *
 * Calculates total cycle time with all components:
 * - Cutting time from path length and feed
 * - Rapid traverse time between features
 * - Tool change time
 * - Load/unload time
 * - Pallet change time (if applicable)
 * - Probing/measurement time
 * - Utilization and efficiency metrics
 *
 * Key physics: Cutting time = path / feed. Rapid time depends
 * on machine rapid rate and distance. Tool change varies by
 * machine type (1-8 seconds). The ratio of cutting to total
 * time is the "chip-to-chip" efficiency — typically 30-60%
 * for job shops, 60-80% for production.
 *
 * Reference: Machinery's Handbook Ch.36 (Production),
 *            Haas Cycle Time Calculator,
 *            SME Manufacturing Engineering Handbook
 *
 * Actions: cycle_time_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface CycleTimeInput {
  cutting_path_mm: number;
  feed_rate_mm_min: number;
  rapid_distance_mm?: number;
  rapid_rate_mm_min?: number;
  tool_changes?: number;
  tool_change_time_sec?: number;
  load_unload_time_sec?: number;
  probing_time_sec?: number;
  pallet_change_sec?: number;
  coolant_start_delay_sec?: number;
  spindle_accel_events?: number;
  machine_type?: "vmc" | "hmc" | "lathe" | "5axis"
    | "swiss";
  batch_size?: number;
}

export interface CycleTimeResult {
  cutting_time: AtomicValue;
  rapid_time: AtomicValue;
  tool_change_time: AtomicValue;
  load_unload_time: AtomicValue;
  non_productive_time: AtomicValue;
  total_cycle_time: AtomicValue;
  cutting_efficiency: AtomicValue;
  parts_per_hour: AtomicValue;
  batch_time: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

const RAPID_RATES: Record<string, number> = {
  vmc: 30000,
  hmc: 40000,
  lathe: 25000,
  "5axis": 30000,
  swiss: 20000,
};

const TC_TIMES: Record<string, number> = {
  vmc: 4,
  hmc: 2,
  lathe: 3,
  "5axis": 5,
  swiss: 1.5,
};

// ── Engine ─────────────────────────────────────────────────────────

export class CycleTimeEngine {
  calculate(input: CycleTimeInput): CycleTimeResult {
    const warnings: string[] = [];
    const machType = input.machine_type ?? "vmc";
    const batchSize = input.batch_size ?? 1;

    // Cutting time
    const cuttingTime = input.feed_rate_mm_min > 0
      ? input.cutting_path_mm / input.feed_rate_mm_min
      : 0;

    // Rapid time
    const rapidRate = input.rapid_rate_mm_min
      ?? RAPID_RATES[machType] ?? 30000;
    const rapidDist = input.rapid_distance_mm
      ?? input.cutting_path_mm * 0.3; // estimate 30% of cut path
    const rapidTime = rapidDist / rapidRate;

    // Tool change time
    const tcTimeSec = input.tool_change_time_sec
      ?? TC_TIMES[machType] ?? 4;
    const nToolChanges = input.tool_changes ?? 3;
    const totalTcTime = (tcTimeSec * nToolChanges) / 60; // min

    // Load/unload
    const loadTime = (input.load_unload_time_sec ?? 30) / 60;

    // Probing
    const probeTime = (input.probing_time_sec ?? 0) / 60;

    // Pallet change
    const palletTime = (input.pallet_change_sec ?? 0) / 60;

    // Coolant delay
    const coolantDelay = ((input.coolant_start_delay_sec ?? 0)
      * nToolChanges) / 60;

    // Spindle accel/decel
    const spindleEvents = input.spindle_accel_events
      ?? nToolChanges;
    const spindleTime = (spindleEvents * 1.5) / 60; // ~1.5s per event

    // Non-productive time
    const nonProdTime = rapidTime + totalTcTime + loadTime
      + probeTime + palletTime + coolantDelay + spindleTime;

    // Total cycle time
    const totalTime = cuttingTime + nonProdTime;

    // Cutting efficiency
    const efficiency = totalTime > 0
      ? (cuttingTime / totalTime) * 100 : 0;

    // Parts per hour
    const pph = totalTime > 0 ? 60 / totalTime : 0;

    // Batch time
    const batchTime = totalTime * batchSize;

    // Warnings
    if (efficiency < 30) {
      warnings.push(
        `Cutting efficiency ${r0(efficiency)}% is low — ` +
        "too much non-productive time"
      );
    }
    if (totalTcTime > cuttingTime * 0.5) {
      warnings.push(
        "Tool change time > 50% of cutting — " +
        "consider combination tools or reduce changes"
      );
    }
    if (loadTime > totalTime * 0.3) {
      warnings.push(
        "Load/unload > 30% of cycle — " +
        "consider pallet changer or quick-change fixture"
      );
    }
    if (cuttingTime > 60) {
      warnings.push(
        `Long cutting time ${r1(cuttingTime)}min — ` +
        "verify feeds/speeds are optimized"
      );
    }
    if (nToolChanges > 15) {
      warnings.push(
        `${nToolChanges} tool changes — ` +
        "optimize tool sequence to reduce changes"
      );
    }

    return {
      cutting_time: av(r2(cuttingTime), "min", 0.1,
        `${r0(input.cutting_path_mm)}mm / ${r0(input.feed_rate_mm_min)} mm/min`),
      rapid_time: av(r2(rapidTime), "min", 0.05,
        `${r0(rapidDist)}mm / ${r0(rapidRate)} mm/min`),
      tool_change_time: av(r2(totalTcTime), "min", 0.05,
        `${nToolChanges} × ${tcTimeSec}s`),
      load_unload_time: av(r2(loadTime), "min", 0.1,
        "Part handling"),
      non_productive_time: av(r2(nonProdTime), "min", 0.1,
        "Rapid + TC + load + probe + misc"),
      total_cycle_time: av(r2(totalTime), "min", 0.2,
        "Cutting + non-productive"),
      cutting_efficiency: av(r1(efficiency), "%", 2,
        "Cutting / total × 100"),
      parts_per_hour: av(r1(pph), "pcs/hr", 0.5,
        `60 / ${r2(totalTime)}min`),
      batch_time: av(r1(batchTime), "min", 1,
        `${r2(totalTime)} × ${batchSize} parts`),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function av(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }

export const cycleTimeEngine = new CycleTimeEngine();
