/**
 * SpringPassEngine — Finishing Spring Pass Optimization
 *
 * Calculates parameters for spring passes (spark-out):
 * - Optimal number of spring passes
 * - Deflection recovery estimation
 * - Surface finish improvement prediction
 * - Dimensional accuracy improvement
 * - Cycle time impact analysis
 *
 * Key physics: During machining, tool deflection causes the
 * actual cut to be shallower than programmed. A spring pass
 * (zero-depth pass) removes the residual material left by
 * deflection. Each successive spring pass removes less
 * material as deflection decreases exponentially. Typically
 * 2-3 spring passes recover 90%+ of deflection error.
 *
 * Reference: Altintas "Manufacturing Automation" Ch.1,
 *            Tlusty "Manufacturing Processes" Ch.8,
 *            Sandvik finishing guide
 *
 * Actions: spring_pass_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface SpringPassInput {
  cutting_force_n: number;
  tool_stiffness_n_per_mm?: number;
  workpiece_stiffness_n_per_mm?: number;
  programmed_depth_mm: number;
  feed_rate_mm_per_rev: number;
  spindle_rpm: number;
  tool_diameter_mm?: number;
  pass_length_mm?: number;
}

export interface SpringPassResult {
  initial_deflection: AtomicValue;
  num_spring_passes: AtomicValue;
  residual_after_passes: AtomicValue[];
  total_material_recovered: AtomicValue;
  recovery_percentage: AtomicValue;
  ra_improvement_factor: AtomicValue;
  dimensional_error_before: AtomicValue;
  dimensional_error_after: AtomicValue;
  added_cycle_time: AtomicValue;
  warnings: string[];
}

// ── Engine ─────────────────────────────────────────────────────────

export class SpringPassEngine {
  /**
   * Calculate spring pass parameters and deflection recovery.
   */
  calculate(input: SpringPassInput): SpringPassResult {
    const warnings: string[] = [];
    const Fc = input.cutting_force_n;
    const ap = input.programmed_depth_mm;
    const fpr = input.feed_rate_mm_per_rev;
    const rpm = input.spindle_rpm;
    const passLen = input.pass_length_mm ?? 50;

    // System stiffness (tool + workpiece in series)
    const kTool = input.tool_stiffness_n_per_mm ?? 5000;
    const kWork = input.workpiece_stiffness_n_per_mm ?? 10000;
    const kSystem = (kTool * kWork) / (kTool + kWork);

    // Initial deflection
    const deflection = Fc / kSystem;

    // Spring pass recovery: each pass removes a fraction
    // of remaining deflection. The ratio is approximately
    // (1 - kc_ratio) where kc_ratio = ap_residual/ap_programmed
    // Simplified: each pass removes ~60-70% of remaining error
    const recoveryRate = 0.65;
    const maxPasses = deflection > 0.001 ? 3 : 1;
    const numPasses = deflection > ap * 0.05 ? maxPasses : 1;

    // Calculate residual after each pass
    const residuals: number[] = [];
    let remaining = deflection;
    for (let i = 0; i < numPasses; i++) {
      remaining *= (1 - recoveryRate);
      residuals.push(remaining);
    }

    const totalRecovered = deflection - remaining;
    const recoveryPct = deflection > 0
      ? (totalRecovered / deflection) * 100
      : 100;

    // Ra improvement: spring passes smooth feed marks
    // Typically 20-40% Ra improvement
    const raImprovement = 1 + numPasses * 0.15;

    // Dimensional error
    const errorBefore = deflection;
    const errorAfter = remaining;

    // Added cycle time
    const feedRate = fpr * rpm; // mm/min
    const timePerPass = feedRate > 0
      ? passLen / feedRate
      : 0;
    const addedTime = timePerPass * numPasses;

    // Warnings
    if (deflection > ap * 0.3) {
      warnings.push(
        `High deflection (${r3(deflection)}mm) is ` +
        `${Math.round(deflection / ap * 100)}% of depth — ` +
        "increase system stiffness"
      );
    }
    if (deflection < 0.002) {
      warnings.push(
        "Deflection < 2µm — spring passes unnecessary"
      );
    }
    if (numPasses >= 3 && remaining > 0.005) {
      warnings.push(
        "3 passes insufficient to recover deflection — " +
        "reduce cutting force or increase stiffness"
      );
    }

    return {
      initial_deflection: av(r3(deflection), "mm", 0.1,
        "F / k_system"),
      num_spring_passes: av(numPasses, "passes", 0,
        "Based on deflection/depth ratio"),
      residual_after_passes: residuals.map((r, i) =>
        av(r3(r), "mm", 0.15,
          `After pass ${i + 1}: ${Math.round((1 - Math.pow(1 - recoveryRate, i + 1)) * 100)}% recovered`)
      ),
      total_material_recovered: av(r3(totalRecovered), "mm", 0.1,
        "initial_deflection - final_residual"),
      recovery_percentage: av(r1(recoveryPct), "%", 0.05,
        "recovered / initial × 100"),
      ra_improvement_factor: av(r2(raImprovement), "ratio", 0.15,
        "1 + passes × 0.15"),
      dimensional_error_before: av(r3(errorBefore), "mm", 0.1,
        "Equal to initial deflection"),
      dimensional_error_after: av(r3(errorAfter), "mm", 0.15,
        "Residual after spring passes"),
      added_cycle_time: av(r2(addedTime), "min", 0.1,
        "pass_length / feed × num_passes"),
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

function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const springPassEngine = new SpringPassEngine();
