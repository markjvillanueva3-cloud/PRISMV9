/**
 * SpeedFeedMinerEngine — Mine speed/feed data from parsed CNC programs
 *
 * Extracts every S (speed), F (feed), G96 (CSS), G97 (direct RPM) value from
 * parsed programs and correlates with material, operation type, and tool type.
 * Builds statistical models (median/mean/stddev) and compares against PRISM's
 * canonical Kienzle-derived values to identify programs with sub-optimal or
 * dangerous parameters.
 *
 * Sources:
 *   - OkumaOSPParserEngine parsed programs (speed/feed per tool section)
 *   - HaasParserEngine parsed programs
 *   - HurcoParserEngine parsed programs
 *   - RokuRokuParserEngine parsed programs
 *
 * Outputs:
 *   - Statistical speed/feed tables by material × operation × machine
 *   - Outlier reports (dangerously high/low)
 *   - Calibration data for SpeedFeedOrchestratorEngine
 *   - Comparison reports: shop floor vs physics-optimal
 *
 * @module SpeedFeedMinerEngine
 */

import { log } from "../utils/Logger.js";
import type { ProgramRecord } from "./ProgramDatabaseEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface SpeedFeedSample {
  program_id: string;
  machine_type: string;
  material: string;
  operation: string;
  tool_number: number;
  tool_desc: string | null;
  speed_rpm: number;
  feed: number;
  css_mode: boolean;
  /** Surface speed in m/min (if diameter known) */
  vc_m_min: number | null;
}

export interface SpeedFeedStats {
  material: string;
  operation: string;
  machine_type: string;
  sample_count: number;
  speed_mean: number;
  speed_median: number;
  speed_stddev: number;
  speed_min: number;
  speed_max: number;
  feed_mean: number;
  feed_median: number;
  feed_stddev: number;
  feed_min: number;
  feed_max: number;
  css_count: number;
  direct_rpm_count: number;
}

export interface SpeedFeedOutlier {
  program_id: string;
  tool_number: number;
  operation: string;
  material: string;
  machine_type: string;
  speed_rpm: number;
  feed: number;
  expected_speed_range: [number, number];
  expected_feed_range: [number, number];
  severity: "warning" | "danger" | "critical";
  reason: string;
}

export interface SpeedFeedMineResult {
  total_samples: number;
  stats: SpeedFeedStats[];
  outliers: SpeedFeedOutlier[];
  calibration_data: SpeedFeedCalibrationEntry[];
  summary: {
    materials_found: string[];
    operations_found: string[];
    machines_found: string[];
    programs_analyzed: number;
    outlier_count: number;
    outlier_pct: number;
  };
}

export interface SpeedFeedCalibrationEntry {
  material: string;
  operation: string;
  machine_type: string;
  recommended_speed: number;
  recommended_feed: number;
  confidence: number;
  source: "shop_median" | "physics_corrected";
  sample_count: number;
}

// ============================================================================
// CANONICAL SPEED/FEED RANGES (from PRISM physics + shop experience)
// Used for outlier detection — NOT hardcoded Kienzle values
// ============================================================================

const CANONICAL_RANGES: Record<string, Record<string, { speed_sfm: [number, number]; feed_ipr: [number, number] }>> = {
  steel: {
    od_rough:   { speed_sfm: [300, 700],   feed_ipr: [0.008, 0.020] },
    od_finish:  { speed_sfm: [400, 900],   feed_ipr: [0.003, 0.010] },
    id_rough:   { speed_sfm: [250, 600],   feed_ipr: [0.005, 0.015] },
    id_finish:  { speed_sfm: [350, 800],   feed_ipr: [0.002, 0.008] },
    thread:     { speed_sfm: [80, 250],    feed_ipr: [0.010, 0.200] },
    groove:     { speed_sfm: [200, 500],   feed_ipr: [0.003, 0.008] },
    cutoff:     { speed_sfm: [200, 450],   feed_ipr: [0.002, 0.006] },
    drill:      { speed_sfm: [200, 500],   feed_ipr: [0.005, 0.015] },
    peck_drill: { speed_sfm: [200, 500],   feed_ipr: [0.005, 0.015] },
    face:       { speed_sfm: [300, 700],   feed_ipr: [0.008, 0.020] },
  },
  aluminum: {
    od_rough:   { speed_sfm: [800, 2000],  feed_ipr: [0.010, 0.030] },
    od_finish:  { speed_sfm: [1000, 3000], feed_ipr: [0.004, 0.012] },
    id_rough:   { speed_sfm: [700, 1800],  feed_ipr: [0.008, 0.020] },
    id_finish:  { speed_sfm: [900, 2500],  feed_ipr: [0.003, 0.010] },
    thread:     { speed_sfm: [200, 600],   feed_ipr: [0.010, 0.200] },
    groove:     { speed_sfm: [600, 1500],  feed_ipr: [0.004, 0.010] },
    cutoff:     { speed_sfm: [500, 1200],  feed_ipr: [0.003, 0.008] },
    drill:      { speed_sfm: [500, 1200],  feed_ipr: [0.008, 0.020] },
    peck_drill: { speed_sfm: [500, 1200],  feed_ipr: [0.008, 0.020] },
    face:       { speed_sfm: [800, 2000],  feed_ipr: [0.010, 0.030] },
  },
  stainless: {
    od_rough:   { speed_sfm: [200, 500],   feed_ipr: [0.006, 0.015] },
    od_finish:  { speed_sfm: [300, 650],   feed_ipr: [0.003, 0.008] },
    drill:      { speed_sfm: [150, 400],   feed_ipr: [0.004, 0.012] },
    peck_drill: { speed_sfm: [150, 400],   feed_ipr: [0.004, 0.012] },
    thread:     { speed_sfm: [60, 180],    feed_ipr: [0.010, 0.200] },
  },
};

// ============================================================================
// ENGINE
// ============================================================================

export class SpeedFeedMinerEngine {
  /**
   * Mine speed/feed data from a set of parsed program records.
   */
  mine(records: ProgramRecord[]): SpeedFeedMineResult {
    const samples: SpeedFeedSample[] = [];

    // Extract samples from all records
    for (const rec of records) {
      for (const tool of rec.tools) {
        if (tool.speed_rpm !== null && tool.speed_rpm > 0) {
          for (const opType of tool.operation_types) {
            samples.push({
              program_id: rec.id,
              machine_type: rec.machine_type,
              material: rec.material_hint ?? "unknown",
              operation: opType,
              tool_number: tool.tool_number,
              tool_desc: tool.description,
              speed_rpm: tool.speed_rpm,
              feed: tool.feed ?? 0,
              css_mode: tool.css_mode,
              vc_m_min: null, // Would need diameter to compute
            });
          }
        }
      }
    }

    // Group and compute statistics
    const groupKey = (s: SpeedFeedSample) => `${s.material}|${s.operation}|${s.machine_type}`;
    const groups = new Map<string, SpeedFeedSample[]>();

    for (const s of samples) {
      const key = groupKey(s);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }

    const stats: SpeedFeedStats[] = [];
    for (const [key, group] of groups) {
      const [material, operation, machine_type] = key.split("|");
      stats.push(this._computeStats(material, operation, machine_type, group));
    }

    // Detect outliers
    const outliers = this._detectOutliers(samples);

    // Generate calibration data
    const calibration = this._generateCalibration(stats);

    return {
      total_samples: samples.length,
      stats: stats.sort((a, b) => b.sample_count - a.sample_count),
      outliers,
      calibration_data: calibration,
      summary: {
        materials_found: [...new Set(samples.map(s => s.material))],
        operations_found: [...new Set(samples.map(s => s.operation))],
        machines_found: [...new Set(samples.map(s => s.machine_type))],
        programs_analyzed: records.length,
        outlier_count: outliers.length,
        outlier_pct: samples.length > 0 ? Math.round(outliers.length / samples.length * 100) : 0,
      },
    };
  }

  /**
   * Compare a single program's speeds/feeds against mined averages.
   */
  compareToBaseline(
    record: ProgramRecord,
    baseline: SpeedFeedStats[],
  ): Array<{
    tool: number;
    operation: string;
    speed_rpm: number;
    baseline_speed: number;
    speed_diff_pct: number;
    feed: number;
    baseline_feed: number;
    feed_diff_pct: number;
    assessment: "optimal" | "conservative" | "aggressive" | "dangerous";
  }> {
    const results: Array<{
      tool: number;
      operation: string;
      speed_rpm: number;
      baseline_speed: number;
      speed_diff_pct: number;
      feed: number;
      baseline_feed: number;
      feed_diff_pct: number;
      assessment: "optimal" | "conservative" | "aggressive" | "dangerous";
    }> = [];

    for (const tool of record.tools) {
      for (const opType of tool.operation_types) {
        const stat = baseline.find(
          s => s.material === (record.material_hint ?? "unknown") &&
               s.operation === opType &&
               s.machine_type === record.machine_type,
        );

        if (!stat || !tool.speed_rpm) continue;

        const speedDiff = ((tool.speed_rpm - stat.speed_median) / stat.speed_median) * 100;
        const feedDiff = tool.feed && stat.feed_median > 0
          ? ((tool.feed - stat.feed_median) / stat.feed_median) * 100
          : 0;

        let assessment: "optimal" | "conservative" | "aggressive" | "dangerous" = "optimal";
        if (speedDiff < -30) assessment = "conservative";
        else if (speedDiff > 30) assessment = "aggressive";
        if (speedDiff > 50 || speedDiff < -50) assessment = "dangerous";

        results.push({
          tool: tool.tool_number,
          operation: opType,
          speed_rpm: tool.speed_rpm,
          baseline_speed: stat.speed_median,
          speed_diff_pct: Math.round(speedDiff),
          feed: tool.feed ?? 0,
          baseline_feed: stat.feed_median,
          feed_diff_pct: Math.round(feedDiff),
          assessment,
        });
      }
    }

    return results;
  }

  // ── Private Methods ────────────────────────────────────────────────────

  private _computeStats(
    material: string, operation: string, machine_type: string,
    samples: SpeedFeedSample[],
  ): SpeedFeedStats {
    const speeds = samples.map(s => s.speed_rpm).sort((a, b) => a - b);
    const feeds = samples.map(s => s.feed).filter(f => f > 0).sort((a, b) => a - b);

    return {
      material,
      operation,
      machine_type,
      sample_count: samples.length,
      speed_mean: this._mean(speeds),
      speed_median: this._median(speeds),
      speed_stddev: this._stddev(speeds),
      speed_min: speeds[0],
      speed_max: speeds[speeds.length - 1],
      feed_mean: feeds.length > 0 ? this._mean(feeds) : 0,
      feed_median: feeds.length > 0 ? this._median(feeds) : 0,
      feed_stddev: feeds.length > 0 ? this._stddev(feeds) : 0,
      feed_min: feeds.length > 0 ? feeds[0] : 0,
      feed_max: feeds.length > 0 ? feeds[feeds.length - 1] : 0,
      css_count: samples.filter(s => s.css_mode).length,
      direct_rpm_count: samples.filter(s => !s.css_mode).length,
    };
  }

  private _detectOutliers(samples: SpeedFeedSample[]): SpeedFeedOutlier[] {
    const outliers: SpeedFeedOutlier[] = [];

    for (const s of samples) {
      const matRanges = CANONICAL_RANGES[s.material];
      if (!matRanges) continue;

      const opRange = matRanges[s.operation];
      if (!opRange) continue;

      // For CSS mode, speed is SFM directly; for direct RPM we can't compare without diameter
      if (s.css_mode) {
        const [minSfm, maxSfm] = opRange.speed_sfm;
        const [minFeed, maxFeed] = opRange.feed_ipr;

        if (s.speed_rpm < minSfm * 0.5 || s.speed_rpm > maxSfm * 1.5) {
          const severity = s.speed_rpm > maxSfm * 2 ? "critical" :
                          s.speed_rpm > maxSfm * 1.5 ? "danger" : "warning";
          outliers.push({
            program_id: s.program_id,
            tool_number: s.tool_number,
            operation: s.operation,
            material: s.material,
            machine_type: s.machine_type,
            speed_rpm: s.speed_rpm,
            feed: s.feed,
            expected_speed_range: [minSfm, maxSfm],
            expected_feed_range: [minFeed, maxFeed],
            severity,
            reason: s.speed_rpm > maxSfm * 1.5
              ? `Speed ${s.speed_rpm} SFM exceeds max ${maxSfm} for ${s.material}/${s.operation}`
              : `Speed ${s.speed_rpm} SFM below min ${minSfm} for ${s.material}/${s.operation}`,
          });
        }

        if (s.feed > 0 && (s.feed < minFeed * 0.5 || s.feed > maxFeed * 2)) {
          outliers.push({
            program_id: s.program_id,
            tool_number: s.tool_number,
            operation: s.operation,
            material: s.material,
            machine_type: s.machine_type,
            speed_rpm: s.speed_rpm,
            feed: s.feed,
            expected_speed_range: [minSfm, maxSfm],
            expected_feed_range: [minFeed, maxFeed],
            severity: s.feed > maxFeed * 3 ? "critical" : "warning",
            reason: `Feed ${s.feed} ipr outside range [${minFeed}, ${maxFeed}] for ${s.material}/${s.operation}`,
          });
        }
      }
    }

    return outliers;
  }

  private _generateCalibration(stats: SpeedFeedStats[]): SpeedFeedCalibrationEntry[] {
    return stats
      .filter(s => s.sample_count >= 3) // Need minimum samples for confidence
      .map(s => ({
        material: s.material,
        operation: s.operation,
        machine_type: s.machine_type,
        recommended_speed: Math.round(s.speed_median),
        recommended_feed: Math.round(s.feed_median * 10000) / 10000,
        confidence: Math.min(1, s.sample_count / 20), // More samples = higher confidence
        source: "shop_median" as const,
        sample_count: s.sample_count,
      }));
  }

  private _mean(arr: number[]): number {
    if (arr.length === 0) return 0;
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 100) / 100;
  }

  private _median(arr: number[]): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private _stddev(arr: number[]): number {
    if (arr.length < 2) return 0;
    const m = this._mean(arr);
    const variance = arr.reduce((acc, val) => acc + (val - m) ** 2, 0) / (arr.length - 1);
    return Math.round(Math.sqrt(variance) * 100) / 100;
  }
}

export const speedFeedMinerEngine = new SpeedFeedMinerEngine();
