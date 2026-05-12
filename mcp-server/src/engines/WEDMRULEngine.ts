/**
 * WEDMRULEngine — WEDM AGI Phase 4 / P4-MS3 / U-P4-07.
 *
 * Remaining Useful Life (RUL) estimator for the five WEDM components
 * tracked by `WEDMDegradationModelEngine`. Consumes a `DegradationSnapshot`
 * plus a usage-rate estimate and produces:
 *
 *   - per-component RUL in hours-of-run
 *   - an operational-band classification (imminent / soon / planned / healthy)
 *   - a weakest-link overall RUL + summary
 *
 * The calculation is a zeroth-order projection — given the current state
 * `x`, capacity `C`, and a per-hour rate-of-state-advance `r`, the RUL is:
 *
 *     RUL_hours = (C - x) / r
 *
 * …with special cases: r≤0 → RUL=Infinity (component not aging), x≥C →
 * RUL=0 (already past service threshold).
 *
 * The rate `r` can be supplied directly or derived from a
 * `UsageDelta` (the same record type consumed by the degradation model),
 * which lets callers plug in either the actual measured rate over the
 * last tick or a hypothetical "if current usage persisted" rate for
 * what-if prediction.
 *
 * Roadmap name was `WEDMPredictiveMaintenanceEngine`; the duplication
 * guard flagged it against the generic `PredictiveMaintenanceEngine`
 * already present in the codebase, so this engine is scoped narrowly as
 * the *RUL* half of predictive maintenance (the *scheduling* half lives
 * in `WEDMMaintenanceSchedulerEngine`, U-P4-09).
 *
 * Composes with:
 *   - WEDMDegradationModelEngine   (input: snapshot + UsageDelta)
 *   - WEDMMaintenanceSchedulerEngine (downstream: schedules service
 *     windows from RUL bands)
 *
 * @module engines/WEDMRULEngine
 */

import type {
  DegradationComponent,
  DegradationSnapshot,
  UsageDelta,
} from "./WEDMDegradationModelEngine.js";
import { WEDMDegradationModelEngine } from "./WEDMDegradationModelEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Operational urgency bands. Thresholds configurable via `RULOptions`. */
export type RULBand = "imminent" | "soon" | "planned" | "healthy";

export interface ComponentRUL {
  component: DegradationComponent;
  state: number;
  capacity: number;
  rate_per_hr: number;
  rul_hours: number;
  band: RULBand;
  health: number;
  reason: string;
}

export interface RULReport {
  components: Record<DegradationComponent, ComponentRUL>;
  worstComponent: DegradationComponent;
  worstRUL_hours: number;
  worstBand: RULBand;
}

export interface RULOptions {
  /** Upper bound of `imminent` band (hours). Default 8 (1 shift). */
  imminent_hr?: number;
  /** Upper bound of `soon` band (hours). Default 40 (≈ 1 week). */
  soon_hr?: number;
  /** Upper bound of `planned` band (hours). Default 200 (≈ 1 month). */
  planned_hr?: number;
}

const DEFAULT_OPTIONS: Required<RULOptions> = {
  imminent_hr: 8,
  soon_hr: 40,
  planned_hr: 200,
};

// ============================================================================
// RATES
// ============================================================================

/** Hourly delta that each component of `UsageDelta` would generate. */
function projectRates(
  usage: UsageDelta,
): Record<DegradationComponent, number> {
  // Use a fresh degradation engine + 1-hour unit tick to discover how much
  // each component would advance at this usage rate. We keep this contained
  // here so the physics stays colocated with the degradation model.
  const probe = new WEDMDegradationModelEngine();
  const unitUsage: UsageDelta = { ...usage, dt_hours: 1 };
  const snap = probe.update(unitUsage);
  return {
    guide_wear: snap.components.guide_wear.state,
    wire_erosion: snap.components.wire_erosion.state,
    filter_capacity: snap.components.filter_capacity.state,
    filter_clogging: snap.components.filter_clogging.state,
    wire_fatigue: snap.components.wire_fatigue.state,
  };
}

// ============================================================================
// BAND MAPPING
// ============================================================================

function classifyBand(rul_hr: number, opts: Required<RULOptions>): RULBand {
  if (!Number.isFinite(rul_hr)) return "healthy";
  if (rul_hr <= 0) return "imminent";
  if (rul_hr <= opts.imminent_hr) return "imminent";
  if (rul_hr <= opts.soon_hr) return "soon";
  if (rul_hr <= opts.planned_hr) return "planned";
  return "healthy";
}

// ============================================================================
// ENGINE
// ============================================================================

export class WEDMRULEngine {
  /**
   * RUL report given a degradation snapshot + explicit per-component
   * rates-per-hour. Useful when the caller already knows the rates
   * (e.g. EWMA of the last hour of telemetry).
   */
  estimateFromRates(
    snap: DegradationSnapshot,
    rates: Partial<Record<DegradationComponent, number>>,
    opts: RULOptions = {},
  ): RULReport {
    const o: Required<RULOptions> = { ...DEFAULT_OPTIONS, ...opts };
    const out = {} as Record<DegradationComponent, ComponentRUL>;
    let worstRUL = Number.POSITIVE_INFINITY;
    let worstComponent: DegradationComponent = "guide_wear";

    for (const key of Object.keys(snap.components) as DegradationComponent[]) {
      const c = snap.components[key];
      const rate = rates[key] ?? 0;
      let rul: number;
      let reason: string;

      if (c.state >= c.capacity) {
        rul = 0;
        reason = "already at or past service threshold";
      } else if (rate <= 0) {
        rul = Number.POSITIVE_INFINITY;
        reason = "zero usage rate — component not aging";
      } else {
        rul = (c.capacity - c.state) / rate;
        reason = `(${c.capacity.toPrecision(4)} − ${c.state.toPrecision(4)}) / ${rate.toPrecision(4)} per hr`;
      }

      const band = classifyBand(rul, o);
      out[key] = {
        component: key,
        state: c.state,
        capacity: c.capacity,
        rate_per_hr: rate,
        rul_hours: rul,
        band,
        health: c.health,
        reason,
      };

      if (rul < worstRUL) {
        worstRUL = rul;
        worstComponent = key;
      }
    }

    return {
      components: out,
      worstComponent,
      worstRUL_hours: worstRUL,
      worstBand: classifyBand(worstRUL, o),
    };
  }

  /**
   * RUL report given a degradation snapshot + a `UsageDelta` representing
   * the *hypothetical* steady-state usage. Rates are derived by projecting
   * that usage through the degradation model for 1 hour.
   */
  estimateFromUsage(
    snap: DegradationSnapshot,
    usage: UsageDelta,
    opts: RULOptions = {},
  ): RULReport {
    const rates = projectRates(usage);
    return this.estimateFromRates(snap, rates, opts);
  }

  /** Count components currently in a given band (dashboard convenience). */
  countInBand(report: RULReport, band: RULBand): number {
    return Object.values(report.components).filter((c) => c.band === band).length;
  }
}

/** Shared singleton. */
export const wedmRULEngine = new WEDMRULEngine();
