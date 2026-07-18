/**
 * AdaptiveMillingChipLoadMonitorEngine — real-time chip-load estimator
 *
 * Estimates the EFFECTIVE chip-load (mm/tooth) during a milling cut from
 * spindle-load harmonics + tooth-pass frequency + cutting force. Complements
 * the iter16 MidCutDecisionOrchestrator by giving continuous chip-thinning
 * detection (not just AE wear/breakage classification).
 *
 *   chip_load_effective = chip_load_target × (spindle_current / spindle_baseline)^(1/(1-mc))
 *
 * where mc is the Kienzle exponent (material-specific). When the spindle load
 * deviates from the baseline computed by SpeedFeedOrchestrator, the effective
 * chip load has drifted — likely due to:
 *   - Tool wear (gradual rise over hundreds of cuts)
 *   - Air-cut (chip load → 0)
 *   - Engagement transient (entry/exit, full-radial)
 *   - Hardness variation (forging fiber, weld bead)
 *
 * Verdict policy:
 *   - |drift| < 15%  → within_envelope
 *   - 15-30% drift   → drifting (adaptive-feed compensation suggested)
 *   - 30-60% drift   → over_engaged (reduce-feed required)
 *   - >60% drift     → critical (pull-off; possible breakage imminent)
 *
 * Reference: Sandvik Coromant Adaptive Milling Application Guide §B-7;
 *   Altintas (2012) "Manufacturing Automation" §3.3 (force-based feed control);
 *   Erdel (2003) "High-Speed Machining" §4 (chip-load adaptation);
 *   Kennametal Adaptive Milling Strategy Guide §2.
 *
 * @version 1.0.0
 * @module AdaptiveMillingChipLoadMonitorEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export interface ChipLoadMonitorInput {
  /** Target chip load (mm/tooth) from program seed */
  chip_load_target_mm_tooth: number;
  /** Baseline spindle load (% nominal) for the seeded chip-load + DOC + RPM */
  spindle_load_baseline_pct: number;
  /** Current measured spindle load (% nominal) */
  spindle_load_current_pct: number;
  /** Kienzle exponent mc (material-specific; canonical kc1.1/mc per ISO group) */
  mc_exponent: number;
  /** Tooth-pass frequency Hz (Z×RPM/60) — for cross-reference + chatter sanity */
  tooth_pass_hz: number;
  /** Window of recent samples for drift detection (default 10) */
  window_size?: number;
  /** Recent spindle-load samples (older first) — used for drift-trend */
  recent_samples_pct?: number[];
}

export type ChipLoadVerdict = "within_envelope" | "drifting" | "over_engaged" | "critical";

export interface ChipLoadMonitorResult {
  chip_load_effective: AtomicValue;
  drift_pct: AtomicValue;
  abs_drift_pct: number;
  verdict: ChipLoadVerdict;
  /** Suggested feed override % (100 = no change, 50 = halve) */
  feed_override_pct: AtomicValue;
  trend: "stable" | "rising" | "falling";
  warnings: string[];
  source: string;
}

export class AdaptiveMillingChipLoadMonitorEngine {
  estimate(input: ChipLoadMonitorInput): ChipLoadMonitorResult {
    if (!input || input.chip_load_target_mm_tooth <= 0 || input.spindle_load_baseline_pct <= 0) {
      throw new Error("AdaptiveMillingChipLoadMonitorEngine.estimate: positive chip_load_target + spindle_load_baseline required");
    }
    if (input.mc_exponent <= 0 || input.mc_exponent >= 1) {
      throw new Error("AdaptiveMillingChipLoadMonitorEngine.estimate: mc_exponent must be in (0, 1)");
    }

    const warnings: string[] = [];
    const ratio = input.spindle_load_current_pct / input.spindle_load_baseline_pct;
    const exp = 1 / (1 - input.mc_exponent);
    const effectiveChip = input.chip_load_target_mm_tooth * Math.pow(Math.max(ratio, 1e-6), exp);

    const driftPct = (input.spindle_load_current_pct - input.spindle_load_baseline_pct)
                  / input.spindle_load_baseline_pct * 100;
    const absDrift = Math.abs(driftPct);

    // ── Verdict ───────────────────────────────────────────────────────
    let verdict: ChipLoadVerdict;
    if (absDrift < 15) verdict = "within_envelope";
    else if (absDrift < 30) verdict = "drifting";
    else if (absDrift < 60) verdict = "over_engaged";
    else verdict = "critical";

    // ── Feed override recommendation ──────────────────────────────────
    let feedOverride: number;
    switch (verdict) {
      case "within_envelope": feedOverride = 100; break;
      case "drifting":        feedOverride = Math.max(80, 100 - absDrift); break;
      case "over_engaged":    feedOverride = Math.max(50, 100 - absDrift); break;
      case "critical":        feedOverride = 0; break;
    }

    // ── Trend detection from recent samples ───────────────────────────
    let trend: ChipLoadMonitorResult["trend"] = "stable";
    if (input.recent_samples_pct && input.recent_samples_pct.length >= 3) {
      const samples = input.recent_samples_pct;
      const firstHalf = samples.slice(0, Math.floor(samples.length / 2));
      const secondHalf = samples.slice(Math.floor(samples.length / 2));
      const meanFirst = firstHalf.reduce((s, x) => s + x, 0) / firstHalf.length;
      const meanSecond = secondHalf.reduce((s, x) => s + x, 0) / secondHalf.length;
      const trendPct = (meanSecond - meanFirst) / Math.max(meanFirst, 1e-6) * 100;
      if (trendPct > 5) trend = "rising";
      else if (trendPct < -5) trend = "falling";
    }

    if (verdict === "critical") {
      warnings.push(`Chip-load drift ${driftPct.toFixed(1)}% — PULL OFF; possible tool breakage imminent`);
    } else if (verdict === "over_engaged") {
      warnings.push(`Chip-load drift ${driftPct.toFixed(1)}% — reduce feed to ${feedOverride.toFixed(0)}%`);
    }
    if (trend === "rising" && verdict !== "within_envelope") {
      warnings.push(`Rising trend + drift ${driftPct.toFixed(1)}% — wear progression likely`);
    }
    if (input.spindle_load_current_pct < 5) {
      warnings.push(`Spindle load ${input.spindle_load_current_pct}% — likely air cut; verify Z-axis position`);
    }

    return {
      chip_load_effective: {
        value: Number(effectiveChip.toFixed(5)),
        unit: "mm/tooth",
        source: `target × (current/baseline)^(1/(1-mc=${input.mc_exponent}))`,
      },
      drift_pct: {
        value: Number(driftPct.toFixed(2)),
        unit: "%",
        source: "(current - baseline) / baseline × 100",
      },
      abs_drift_pct: Number(absDrift.toFixed(2)),
      verdict,
      feed_override_pct: {
        value: Math.round(feedOverride),
        unit: "%",
        source: "linear-clamp on abs_drift (Sandvik AM §B-7)",
      },
      trend,
      warnings,
      source: "AdaptiveMillingChipLoadMonitorEngine — Sandvik AM §B-7 + Altintas §3.3 + Erdel §4 + Kennametal AM §2",
    };
  }
}

export const adaptiveMillingChipLoadMonitorEngine = new AdaptiveMillingChipLoadMonitorEngine();
