/**
 * DynamicShopRateEngine — utilization-aware rate adjustment
 *
 * Operator iter11 gap-audit named "dynamic shop rate" — quote-time rates
 * shouldn't be static $/hr off the profile; they should reflect CURRENT
 * shop loading. A shop running at 95% capacity should price like it
 * (rush uplift); a shop running at 40% should capture work at a discount
 * (capture-rate strategy that competitors do off-spreadsheet).
 *
 * Wraps ShopProfileTemplateEngine.getMachineRate() with a percentage
 * adjustment driven by:
 *   - current_loading_pct (0..1)     : "what fraction of fleet hours are booked this week"
 *   - hours_until_quoted_delivery    : (optional) shorter lead → higher rush uplift on
 *                                       top of the capacity-based adjustment
 *
 * Bands (tunable via constructor; defaults chosen to match published
 * machine-shop rate-bidding norms 2024):
 *   loading >= 0.85   → +20% rush uplift
 *   loading 0.70–0.85 → +5%  busy uplift
 *   loading 0.50–0.70 → baseline (no change)
 *   loading 0.25–0.50 → -8%  capture discount
 *   loading < 0.25    → -15% deep-discount
 *
 * Pure compositional. No I/O outside ShopProfileTemplateEngine.
 *
 * @milestone QUOTING-SYNERGY-MS0/U-DYNAMIC-SHOP-RATE (charlie /goal-20 iter19)
 */

import { promises as fs } from "node:fs";
import type { ShopProfile } from "./ShopProfileTemplateEngine.js";

const DEFAULT_LOADING_STATE_PATH = "H:/prism/state/shared/quoting/current-loading.json";
const DEFAULT_LOADING_STALENESS_HRS = 24;
const DEFAULT_BASELINE_LOADING = 0.50;

export interface LoadingStateFile {
  /** Per-machine-family loading pct. Missing family → falls back to default_pct. */
  by_machine_family?: Record<string, number>;
  /** Shop-wide loading pct used when no machine-specific value present. */
  default_pct?: number;
  /** ISO timestamp of last update (staleness gate). */
  updated_iso: string;
}

export interface DynamicRateBand {
  /** Inclusive lower bound on current_loading_pct (0..1). */
  loading_min: number;
  /** Multiplicative adjustment to the base machine rate (1.0 = no change, 1.20 = +20%, 0.85 = -15%). */
  multiplier: number;
  /** Human-readable band name for the result payload. */
  label: string;
}

const DEFAULT_BANDS: DynamicRateBand[] = [
  { loading_min: 0.85, multiplier: 1.20, label: "rush" },
  { loading_min: 0.70, multiplier: 1.05, label: "busy" },
  { loading_min: 0.50, multiplier: 1.00, label: "baseline" },
  { loading_min: 0.25, multiplier: 0.92, label: "capture" },
  { loading_min: 0.00, multiplier: 0.85, label: "deep_discount" },
];

const DEFAULT_RUSH_LEAD_DAYS = 7;
const DEFAULT_RUSH_LEAD_UPLIFT_PCT = 0.10; // additional +10% when lead < 7 days
const DEFAULT_MAX_ADJUSTMENT_PCT = 0.50;   // never adjust more than ±50% from baseline

export interface AdjustRateInput {
  machine_family: string;
  /** When omitted, engine reads from current-loading.json state file (auto-source). */
  current_loading_pct?: number;
  hours_until_delivery?: number;
}

export interface LoadingSourceResult {
  loading_pct: number;
  source: "caller" | "state_file_machine_specific" | "state_file_default" | "fallback_baseline";
  state_file_path?: string;
  state_age_hrs?: number;
  is_stale?: boolean;
  warnings: string[];
}

export interface AdjustRateResult {
  ok: boolean;
  reason?: string;
  /** Base rate looked up from profile (or default_machine_rate fallback). */
  base_rate_usd_per_hr: number;
  /** Multiplier applied (capacity band × rush-lead uplift, clamped). */
  applied_multiplier: number;
  /** Adjusted rate = base × applied_multiplier. */
  adjusted_rate_usd_per_hr: number;
  /** Which capacity band the loading landed in. */
  band: string;
  /** Whether rush lead-time bumped the multiplier. */
  rush_lead_active: boolean;
  /** Delta from baseline ($/hr) for operator visibility. */
  delta_usd_per_hr: number;
  /** Profile source for audit. */
  profile_id: string;
  /** When machine was not in profile, flag the fallback. */
  warnings: string[];
}

export class DynamicShopRateEngine {
  private bands: DynamicRateBand[];
  private rushLeadDays: number;
  private rushLeadUpliftPct: number;
  private maxAdjustmentPct: number;

  constructor(opts: {
    bands?: DynamicRateBand[];
    rushLeadDays?: number;
    rushLeadUpliftPct?: number;
    maxAdjustmentPct?: number;
  } = {}) {
    this.bands = (opts.bands ?? DEFAULT_BANDS).slice().sort((a, b) => b.loading_min - a.loading_min);
    this.rushLeadDays = opts.rushLeadDays ?? DEFAULT_RUSH_LEAD_DAYS;
    this.rushLeadUpliftPct = opts.rushLeadUpliftPct ?? DEFAULT_RUSH_LEAD_UPLIFT_PCT;
    this.maxAdjustmentPct = opts.maxAdjustmentPct ?? DEFAULT_MAX_ADJUSTMENT_PCT;
  }

  /**
   * U-DYNAMIC-RATE-LOADING-SOURCE (yolo-iter2):
   * Read shop loading from the durable state file when caller doesn't supply it.
   * Falls through hierarchy:
   *   1. caller's `input.current_loading_pct` (highest precedence — operator override)
   *   2. state_file.by_machine_family[family] (per-machine specific)
   *   3. state_file.default_pct (shop-wide)
   *   4. DEFAULT_BASELINE_LOADING (0.50, baseline-band)
   *
   * Stale state file (>24h) → warn but still consume value (operator decides
   * whether to override). This keeps the loop running even when nobody has
   * updated the loading file recently.
   */
  async resolveLoading(machineFamily: string, callerSupplied?: number, opts: { stateFilePath?: string; stalenessHours?: number } = {}): Promise<LoadingSourceResult> {
    const warnings: string[] = [];
    if (Number.isFinite(callerSupplied) && (callerSupplied as number) >= 0 && (callerSupplied as number) <= 1) {
      return { loading_pct: callerSupplied as number, source: "caller", warnings };
    }
    const path = opts.stateFilePath ?? DEFAULT_LOADING_STATE_PATH;
    const stalenessHrs = opts.stalenessHours ?? DEFAULT_LOADING_STALENESS_HRS;
    try {
      const raw = await fs.readFile(path, "utf-8");
      const parsed = JSON.parse(raw) as LoadingStateFile;
      const updated = new Date(parsed.updated_iso);
      const ageMs = Date.now() - updated.getTime();
      const ageHrs = ageMs / (1000 * 60 * 60);
      const isStale = ageHrs > stalenessHrs;
      if (isStale) warnings.push(`current-loading state file ${ageHrs.toFixed(1)}h old (> ${stalenessHrs}h staleness threshold)`);
      const familyLower = machineFamily.toLowerCase();
      // Try per-machine-family first.
      if (parsed.by_machine_family) {
        for (const [k, v] of Object.entries(parsed.by_machine_family)) {
          if (k.toLowerCase() === familyLower && Number.isFinite(v) && v >= 0 && v <= 1) {
            return { loading_pct: v, source: "state_file_machine_specific", state_file_path: path, state_age_hrs: round2(ageHrs), is_stale: isStale, warnings };
          }
        }
      }
      if (Number.isFinite(parsed.default_pct) && (parsed.default_pct as number) >= 0 && (parsed.default_pct as number) <= 1) {
        return { loading_pct: parsed.default_pct as number, source: "state_file_default", state_file_path: path, state_age_hrs: round2(ageHrs), is_stale: isStale, warnings };
      }
      warnings.push("state file present but had no usable loading value — using baseline 0.50");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/ENOENT|no such file/i.test(msg)) {
        warnings.push(`current-loading state file read failed: ${msg} — using baseline 0.50`);
      }
    }
    return { loading_pct: DEFAULT_BASELINE_LOADING, source: "fallback_baseline", warnings };
  }

  /**
   * Compute the dynamic rate for one machine given current shop loading.
   * current_loading_pct is optional — when omitted, engine reads from state file
   * (U-DYNAMIC-RATE-LOADING-SOURCE, yolo-iter2). Caller's value always wins.
   */
  async adjust(input: AdjustRateInput, opts: { profile_id?: string; loadingStateFilePath?: string; loadingStalenessHours?: number } = {}): Promise<AdjustRateResult & { loading_source?: LoadingSourceResult["source"]; loading_state_age_hrs?: number }> {
    const empty: AdjustRateResult = {
      ok: false, base_rate_usd_per_hr: 0, applied_multiplier: 1.0,
      adjusted_rate_usd_per_hr: 0, band: "unknown", rush_lead_active: false,
      delta_usd_per_hr: 0, profile_id: opts.profile_id ?? "jm-die", warnings: [],
    };
    if (typeof input.machine_family !== "string" || input.machine_family.length === 0) {
      return { ...empty, reason: "machine_family required" };
    }
    // Caller-supplied loading is validated when present; auto-source is validated by resolveLoading.
    if (input.current_loading_pct !== undefined) {
      if (!Number.isFinite(input.current_loading_pct) || input.current_loading_pct < 0 || input.current_loading_pct > 1) {
        return { ...empty, reason: "current_loading_pct must be in [0, 1]" };
      }
    }

    const warnings: string[] = [];

    // Resolve loading (caller > state file > baseline).
    const loadingResolved = await this.resolveLoading(input.machine_family, input.current_loading_pct, {
      stateFilePath: opts.loadingStateFilePath,
      stalenessHours: opts.loadingStalenessHours,
    });
    const effectiveLoading = loadingResolved.loading_pct;
    warnings.push(...loadingResolved.warnings);

    const { shopProfileTemplateEngine } = await import("./ShopProfileTemplateEngine.js");
    const profile = await shopProfileTemplateEngine.getProfile(opts.profile_id);
    const machine = shopProfileTemplateEngine.getMachineRate(profile, input.machine_family);
    if (machine.source === "default") {
      warnings.push(`machine_family "${input.machine_family}" not in profile "${profile.profile_id}" — using default_machine_rate`);
    }
    const baseRate = machine.rate_usd_per_hr;

    // 1. Capacity band lookup (sorted high-to-low; first match wins).
    const band = this.bands.find(b => effectiveLoading >= b.loading_min) ?? this.bands[this.bands.length - 1];

    // 2. Rush-lead uplift on top of capacity multiplier.
    let multiplier = band.multiplier;
    let rushActive = false;
    if (typeof input.hours_until_delivery === "number" && Number.isFinite(input.hours_until_delivery)) {
      const leadDays = input.hours_until_delivery / 24;
      if (leadDays < this.rushLeadDays && leadDays >= 0) {
        multiplier *= (1 + this.rushLeadUpliftPct);
        rushActive = true;
      }
    }

    // 3. Clamp total adjustment to ±maxAdjustmentPct from baseline.
    const minMult = 1.0 - this.maxAdjustmentPct;
    const maxMult = 1.0 + this.maxAdjustmentPct;
    const clampedMultiplier = Math.max(minMult, Math.min(maxMult, multiplier));

    const adjustedRate = round2(baseRate * clampedMultiplier);
    const deltaPerHr = round2(adjustedRate - baseRate);

    return {
      ok: true,
      base_rate_usd_per_hr: baseRate,
      applied_multiplier: round4(clampedMultiplier),
      adjusted_rate_usd_per_hr: adjustedRate,
      band: band.label,
      rush_lead_active: rushActive,
      delta_usd_per_hr: deltaPerHr,
      profile_id: profile.profile_id,
      warnings,
      loading_source: loadingResolved.source,
      loading_state_age_hrs: loadingResolved.state_age_hrs,
    };
  }

  /** Operator visibility: list configured bands. */
  getBands(): DynamicRateBand[] {
    return this.bands.slice();
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }

export const dynamicShopRateEngine = new DynamicShopRateEngine();
export default dynamicShopRateEngine;
