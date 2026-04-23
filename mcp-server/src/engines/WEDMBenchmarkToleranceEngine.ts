/**
 * WEDMBenchmarkToleranceEngine — WEDM-CAL-MS4 / U-CAL20
 *
 * Single source of truth for WEDM benchmark tolerance bands. Loads the
 * tightened v2 bands from data/reference/WEDM_BENCHMARK_TOLERANCES.json
 * and exposes an API for:
 *
 *   - material-aware band lookup (D2 uses a tighter speed band than M/K)
 *   - deviation classification (match / warning / major / critical)
 *   - bulk tolerance map for downstream engines
 *
 * Why a dedicated engine:
 *   - Previously the bands lived inline in WEDMCalibrationReportEngine
 *     (±30% offset, ±20% speed) and WEDMProgramComparisonEngine (±40%
 *     feed, ±50% contour). Two callers, two sources, zero coordination.
 *   - Tightening the bands for production-gate quality required a single
 *     edit point. This engine is that edit point.
 *
 * Algorithm:
 *   classify(deviation_pct, key) → 'match' | 'warning' | 'major' | 'critical'
 *   where the band comes from the JSON config. Warning band is the
 *   configured value; major is 2×band; critical is 4×band.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { log } from "../utils/Logger.js";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ToleranceClass = "match" | "warning" | "major" | "critical";

export type BenchmarkKey =
  | "area_cutting_rate_pct"
  | "kerf_width_pct"
  | "surface_finish_ra_pct"
  | "d2_rough_speed_pct"
  | "offset_cascade_pct"
  | "rough_speed_pct_default";

export interface ToleranceBand {
  value: number;
  prior_value: number;
  unit: string;
  applies_to: string;
  rationale: string;
}

export interface BenchmarkTolerancesConfig {
  title: string;
  version: string;
  compiled: string;
  reference_milestone: string;
  note: string;
  tolerances: Record<BenchmarkKey, ToleranceBand>;
  enforcement: {
    engine: string;
    consumers: string[];
  };
}

// ─── Loader (lazy, cached) ─────────────────────────────────────────────────

const CONFIG_PATH = (() => {
  // Build a file-path relative to this source file; works under both
  // ts-node (src/) and the esbuild bundle (dist/).
  const here = dirname(fileURLToPath(import.meta.url));
  // From src/engines/ or dist/ — two levels up to project root, then data/reference/
  return join(here, "..", "..", "data", "reference", "WEDM_BENCHMARK_TOLERANCES.json");
})();

let CACHED: BenchmarkTolerancesConfig | null = null;

function load(): BenchmarkTolerancesConfig {
  if (CACHED) return CACHED;
  try {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    CACHED = JSON.parse(raw) as BenchmarkTolerancesConfig;
    log.debug(`[WEDMBenchmarkTolerances] loaded v${CACHED.version} from ${CONFIG_PATH}`);
  } catch (err) {
    // Fallback — ship a hardcoded copy of v2 so the engine never crashes.
    log.warn(`[WEDMBenchmarkTolerances] config load failed, using embedded fallback: ${String(err)}`);
    CACHED = EMBEDDED_FALLBACK;
  }
  return CACHED;
}

const EMBEDDED_FALLBACK: BenchmarkTolerancesConfig = {
  title: "WEDM Benchmark Tolerance Bands (embedded fallback)",
  version: "2.0.0",
  compiled: "2026-04-19",
  reference_milestone: "WEDM-CAL-MS4/U-CAL20",
  note: "Fallback when JSON config unavailable",
  tolerances: {
    area_cutting_rate_pct:   { value: 20, prior_value: 30, unit: "%", applies_to: "area rate", rationale: "MS4/U-CAL20" },
    kerf_width_pct:          { value: 15, prior_value: 20, unit: "%", applies_to: "kerf width", rationale: "MS4/U-CAL20" },
    surface_finish_ra_pct:   { value: 30, prior_value: 70, unit: "%", applies_to: "Ra prediction", rationale: "MS4/U-CAL20" },
    d2_rough_speed_pct:      { value: 25, prior_value: 70, unit: "%", applies_to: "D2 rough speed", rationale: "MS4/U-CAL20" },
    offset_cascade_pct:      { value: 25, prior_value: 30, unit: "%", applies_to: "offset cascade range", rationale: "MS4/U-CAL20" },
    rough_speed_pct_default: { value: 20, prior_value: 20, unit: "%", applies_to: "rough speed default", rationale: "MS4/U-CAL20" },
  },
  enforcement: {
    engine: "WEDMBenchmarkToleranceEngine",
    consumers: [],
  },
};

// ─── Engine ─────────────────────────────────────────────────────────────────

export class WEDMBenchmarkToleranceEngine {
  /** Return the raw config (loaded + cached). Force reload with reset(). */
  getConfig(): BenchmarkTolerancesConfig {
    return load();
  }

  /** Return the tolerance band for a single key. */
  getBand(key: BenchmarkKey): ToleranceBand {
    return load().tolerances[key];
  }

  /**
   * Material-aware rough-speed band lookup. D2 uses the tighter ±25% band;
   * all other materials fall through to the generic ±20% default.
   */
  roughSpeedBandFor(material: string | undefined): number {
    const cfg = load();
    if (material && /\bD2\b|SKD11/i.test(material)) {
      return cfg.tolerances.d2_rough_speed_pct.value;
    }
    return cfg.tolerances.rough_speed_pct_default.value;
  }

  /**
   * Classify a deviation percentage against a named band.
   * - |deviation| ≤ 0.5×band → 'match'   (well within tolerance)
   * - |deviation| ≤ 1.0×band → 'warning' (approaching band edge)
   * - |deviation| ≤ 2.0×band → 'major'   (outside production gate)
   * - |deviation| >  2.0×band → 'critical' (process drift or broken program)
   */
  classify(deviation_pct: number, key: BenchmarkKey): ToleranceClass {
    if (!Number.isFinite(deviation_pct)) return "critical";
    const band = this.getBand(key).value;
    const abs = Math.abs(deviation_pct);
    if (abs <= 0.5 * band) return "match";
    if (abs <= band) return "warning";
    if (abs <= 2 * band) return "major";
    return "critical";
  }

  /**
   * Classify with an explicit material hint (uses the right rough-speed band).
   */
  classifyRoughSpeed(deviation_pct: number, material: string | undefined): ToleranceClass {
    const band = this.roughSpeedBandFor(material);
    if (!Number.isFinite(deviation_pct)) return "critical";
    const abs = Math.abs(deviation_pct);
    if (abs <= 0.5 * band) return "match";
    if (abs <= band) return "warning";
    if (abs <= 2 * band) return "major";
    return "critical";
  }

  /**
   * Return a compact map suitable for passing to WEDMProgramComparisonEngine
   * as an override: `{ offset_rel_tol, feed_rel_tol, contour_rel_tol }` in
   * *fraction* (not percent). Caller multiplies as needed.
   */
  asComparisonOverride(): {
    offset_rel_tol: number;
    feed_rel_tol: number;
  } {
    const cfg = load();
    return {
      offset_rel_tol: cfg.tolerances.offset_cascade_pct.value / 100,
      feed_rel_tol:   cfg.tolerances.rough_speed_pct_default.value / 100,
    };
  }

  /** Flush the cache. Tests and hot-reload scenarios. */
  reset(): void {
    CACHED = null;
  }

  /**
   * Dimensional diagnostic — returns `true` iff the v2 band is strictly
   * tighter than v1 (or equal for already-tight bands). Provides the unit
   * test for "did we actually tighten?"
   */
  isTightened(key: BenchmarkKey): boolean {
    const b = this.getBand(key);
    return b.value <= b.prior_value;
  }

  /**
   * Overall tightening score: average fractional reduction across all
   * tightened bands. 0 = no change, 1 = all bands went to zero. A real
   * tightening should score ≥ 0.10.
   */
  overallTighteningScore(): number {
    const cfg = load();
    const entries = Object.values(cfg.tolerances);
    if (entries.length === 0) return 0;
    const reductions = entries.map(b => {
      if (b.prior_value <= 0) return 0;
      return Math.max(0, (b.prior_value - b.value) / b.prior_value);
    });
    return reductions.reduce((a, b) => a + b, 0) / reductions.length;
  }
}

export const wedmBenchmarkToleranceEngine = new WEDMBenchmarkToleranceEngine();
