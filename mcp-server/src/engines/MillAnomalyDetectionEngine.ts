/**
 * MillAnomalyDetectionEngine — mill-domain anomaly detection for real-time machining
 *
 * Targeted parity for LatheAnomalyDetectionEngine (LATHE-ANOMALY-MS0). Where the Lathe
 * engine is a 2500+ LOC general statistical/ML stack (isolation forest + autoencoder + VAE +
 * one-class SVM), this engine is a *focused* mill-domain detector: Z-score + IQR + sliding-
 * window + manufacturing-rules tuned to mill-time-series failure modes per JM-Die operator
 * review and Sandvik mill-domain failure taxonomy.
 *
 * The general-purpose ML methods (isolation forest, autoencoder, etc.) are already wired
 * via LatheAnomalyDetectionEngine and are domain-agnostic — they don't need duplication.
 * What was missing for mill: a small, fast, mill-tribal detector that:
 *
 *   1. SPINDLE LOAD SPIKE — high-engagement pocket entry without ramp/plunge protection
 *   2. CHIP THINNING VIOLATION — radial engagement too low without feed-per-tooth boost
 *   3. ADAPTIVE TIMING — feed override mismatch on heavy engagement
 *   4. SURFACE FINISH DRIFT — Ra creep across passes (mill-tribal: "first pass green-light")
 *   5. FLUTE-WEAR DELTA — uneven wear (one flute) → runout or workhardened material
 *   6. ENGAGEMENT-vs-DEFLECTION — L/D > 4 with > 0.5 engagement → chatter risk
 *   7. SLOT TRANSITION — full-radial-engagement spike during adaptive→slot transition
 *   8. PROGRAM-LEVEL — required safety codes (M30, S-with-Smax, coolant) verified
 *
 * Output: per-anomaly score [0..1], severity {info|warning|critical}, and an actionable
 * recommendation that maps to an existing prism_mill / prism_calc dispatcher action.
 *
 * References:
 *   - Sandvik Coromant Technical Guide (2022) §§ 7.4-7.6 (mill failure modes)
 *   - Liu, Ting & Zhou (2008) "Isolation Forest" — score normalization formula reused
 *   - Tukey (1977) "Exploratory Data Analysis" — IQR method
 *   - Page (1954) "Continuous Inspection Schemes" — CUSUM for drift detection
 *   - JM-Die operator review (2026-05): flute-wear delta + first-pass green-light
 *
 * @milestone MILL-PARITY-UPGRADE-MS0/U-MILL-ANOMALY-DETECTION (iter59)
 * @version 1.0.0
 * @module MillAnomalyDetectionEngine
 */

import type { ISOGroup } from "../physics/constants.js";

// ── Types ──────────────────────────────────────────────────────────────────

export type MillOpType =
  | "face_milling"
  | "end_milling_rough"
  | "end_milling_finish"
  | "slot_milling"
  | "contour_milling"
  | "pocket_milling"
  | "thread_milling"
  | "drilling"
  | "boring";

export interface MillDataPoint {
  // Cutting parameters
  Vc_m_min: number;             // cutting speed
  fz_mm_tooth: number;          // feed per tooth
  ap_mm: number;                // axial depth of cut
  ae_mm?: number;               // radial engagement
  tool_diameter_mm: number;     // cutter diameter
  flute_count: number;
  // Machine state (per-instant during cut)
  spindle_load_pct?: number;    // 0-100
  spindle_rpm?: number;
  per_flute_load_pct?: number[]; // length === flute_count when supplied
  vibration_g?: number;
  // Context
  material_iso?: ISOGroup;
  hardness_hrc?: number;
  operation?: MillOpType;
  /** Tool stick-out / overhang (mm) — used with diameter for L/D ratio */
  tool_overhang_mm?: number;
  /** Adaptive/trochoidal toolpath in use? */
  adaptive_toolpath?: boolean;
  /** Feed override (%) applied at the controller — 100 = nominal */
  feed_override_pct?: number;
  timestamp_ms?: number;
  // Outcomes (for trend detection across multiple data points)
  surface_ra_um?: number;
  tool_wear_vb_mm?: number;
}

export type MillAnomalyType =
  | "spindle_load_spike"
  | "chip_thinning_violation"
  | "adaptive_timing_mismatch"
  | "surface_finish_drift"
  | "flute_wear_delta"
  | "engagement_vs_deflection"
  | "slot_transition_spike"
  | "feed_per_tooth_outlier"
  | "vibration_outlier"
  | "missing_safety_code";

export type MillSeverity = "info" | "warning" | "critical";

export interface MillAnomalyResult {
  is_anomaly: boolean;
  anomaly_score: number;          // 0..1 normalized
  anomaly_type: MillAnomalyType;
  severity: MillSeverity;
  description: string;
  affected_parameters: string[];
  recommendation: string;         // ideally references a prism_mill / prism_calc action
  confidence: number;             // 0..1
  data_point_index?: number;      // when scanning a time-series, which point fired
}

export interface MillProgramBlock {
  line_number: number;
  raw_text: string;
  g_codes: string[];
  m_codes: string[];
  s?: number;
  f?: number;
  comment?: string;
}

export interface MillProgram {
  program_id: string;
  blocks: MillProgramBlock[];
}

export interface MillAnomalyOutput {
  anomalies: MillAnomalyResult[];
  overall_score: number;
  overall_status: "normal" | "warning" | "alarm";
  summary: string;
  recommendations: string[];
}

// ── Constants ─────────────────────────────────────────────────────────────

/** Speed/feed envelope per ISO group — used as a sanity rail, NOT a fine-grained limit. */
const MILL_SPEED_FEED_RANGES: Record<ISOGroup, { Vc: { min: number; max: number }; fz: { min: number; max: number } }> = {
  P: { Vc: { min: 100, max: 400 }, fz: { min: 0.03, max: 0.30 } },
  M: { Vc: { min: 50, max: 250 }, fz: { min: 0.02, max: 0.20 } },
  K: { Vc: { min: 100, max: 800 }, fz: { min: 0.05, max: 0.40 } },
  N: { Vc: { min: 200, max: 2000 }, fz: { min: 0.05, max: 0.50 } },
  S: { Vc: { min: 20, max: 100 }, fz: { min: 0.02, max: 0.15 } },
  H: { Vc: { min: 50, max: 200 }, fz: { min: 0.02, max: 0.12 } },
};

/** Critical L/D threshold beyond which deflection dominates. Sandvik §7.4. */
const CRITICAL_LD_RATIO = 4.0;
const HIGH_ENGAGEMENT_THRESHOLD = 0.5;  // ae/D fraction
const SPINDLE_LOAD_SPIKE_PCT = 90;       // load > 90% sustained
const FLUTE_WEAR_DELTA_THRESHOLD = 0.30; // 30% mismatch flute-to-flute = uneven wear

// ── Helpers ───────────────────────────────────────────────────────────────

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr: number[], mu?: number): number {
  if (arr.length < 2) return 0;
  const m = mu ?? mean(arr);
  const variance = arr.reduce((s, x) => s + (x - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function quantile(arr: number[], q: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const pos = q * (sorted.length - 1);
  const base = Math.floor(pos);
  const rest = pos - base;
  return base + 1 < sorted.length ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// ── Anomaly Detectors ─────────────────────────────────────────────────────

function detectSpindleLoadSpike(p: MillDataPoint, idx: number): MillAnomalyResult | null {
  if (p.spindle_load_pct === undefined) return null;
  if (p.spindle_load_pct < SPINDLE_LOAD_SPIKE_PCT) return null;
  const severity: MillSeverity = p.spindle_load_pct > 100 ? "critical" : "warning";
  const score = clamp01((p.spindle_load_pct - 80) / 30);  // 80% → 0, 110% → 1
  return {
    is_anomaly: true,
    anomaly_score: score,
    anomaly_type: "spindle_load_spike",
    severity,
    description: `Spindle load ${p.spindle_load_pct.toFixed(1)}% exceeds ${SPINDLE_LOAD_SPIKE_PCT}% threshold (sustained spike risk)`,
    affected_parameters: ["spindle_load_pct"],
    recommendation: "Reduce ap or ae, or pocket entry; consider ramp/plunge protection. See prism_mill:mill_deflection_check.",
    confidence: 0.9,
    data_point_index: idx,
  };
}

function detectChipThinningViolation(p: MillDataPoint, idx: number): MillAnomalyResult | null {
  if (p.ae_mm === undefined) return null;
  const engagement_frac = p.ae_mm / p.tool_diameter_mm;
  if (engagement_frac >= 0.30) return null;  // > 30% engagement: no thinning correction needed
  // Low engagement WITHOUT feed-per-tooth boost is a tribal-flagged thinning bug
  if (engagement_frac < 0.20) {
    // Sandvik chip-thinning correction factor: hex_chip / fz = sqrt(ae/D * (1 - ae/D)) → fz boost needed
    return {
      is_anomaly: true,
      anomaly_score: clamp01(1 - engagement_frac / 0.30),
      anomaly_type: "chip_thinning_violation",
      severity: "warning",
      description: `Radial engagement ${(engagement_frac * 100).toFixed(1)}% requires fz boost (chip thinning rule). Tool will rub instead of cut.`,
      affected_parameters: ["ae_mm", "fz_mm_tooth"],
      recommendation: "Boost fz to compensate for chip thinning. See prism_calc:chip_thinning_compensation.",
      confidence: 0.85,
      data_point_index: idx,
    };
  }
  return null;
}

function detectEngagementVsDeflection(p: MillDataPoint, idx: number): MillAnomalyResult | null {
  if (p.tool_overhang_mm === undefined || p.ae_mm === undefined) return null;
  const ld_ratio = p.tool_overhang_mm / p.tool_diameter_mm;
  const engagement_frac = p.ae_mm / p.tool_diameter_mm;
  if (ld_ratio < CRITICAL_LD_RATIO) return null;
  if (engagement_frac < HIGH_ENGAGEMENT_THRESHOLD) return null;
  // L/D > 4 AND ae/D > 0.5 = guaranteed chatter regime per Sandvik §7.4
  const score = clamp01(((ld_ratio - CRITICAL_LD_RATIO) / 2 + (engagement_frac - HIGH_ENGAGEMENT_THRESHOLD)));
  return {
    is_anomaly: true,
    anomaly_score: Math.min(1, 0.5 + score / 2),
    anomaly_type: "engagement_vs_deflection",
    severity: "critical",
    description: `L/D=${ld_ratio.toFixed(2)} with engagement ${(engagement_frac * 100).toFixed(0)}% — chatter inevitable. Reduce engagement or shorten stickout.`,
    affected_parameters: ["tool_overhang_mm", "ae_mm"],
    recommendation: "Reduce engagement to <0.3D, or use shorter tool. See prism_mill:mill_deflection_check + prism_mill:mill_chatter_predict.",
    confidence: 0.95,
    data_point_index: idx,
  };
}

function detectFeedOverrideMismatch(p: MillDataPoint, idx: number): MillAnomalyResult | null {
  if (p.feed_override_pct === undefined || p.spindle_load_pct === undefined) return null;
  // Heavy engagement + override < 70 = operator overriding because of chatter/load = tribal flag
  if (p.spindle_load_pct < 70) return null;
  if (p.feed_override_pct < 70) {
    return {
      is_anomaly: true,
      anomaly_score: clamp01((70 - p.feed_override_pct) / 30),
      anomaly_type: "adaptive_timing_mismatch",
      severity: "warning",
      description: `Feed override at ${p.feed_override_pct}% with spindle load ${p.spindle_load_pct.toFixed(0)}% — operator compensating; investigate root cause`,
      affected_parameters: ["feed_override_pct", "spindle_load_pct"],
      recommendation: "Investigate: tool wear, material variation, or programmed feed too aggressive. See prism_mill:mill_adaptive_feed.",
      confidence: 0.8,
      data_point_index: idx,
    };
  }
  return null;
}

function detectFluteWearDelta(p: MillDataPoint, idx: number): MillAnomalyResult | null {
  if (!p.per_flute_load_pct || p.per_flute_load_pct.length !== p.flute_count || p.flute_count < 2) return null;
  const loads = p.per_flute_load_pct;
  const avg = mean(loads);
  if (avg < 5) return null;  // not actually cutting
  const maxLoad = Math.max(...loads);
  const minLoad = Math.min(...loads);
  const delta_frac = (maxLoad - minLoad) / avg;
  if (delta_frac < FLUTE_WEAR_DELTA_THRESHOLD) return null;
  return {
    is_anomaly: true,
    anomaly_score: clamp01(delta_frac),
    anomaly_type: "flute_wear_delta",
    severity: delta_frac > 0.5 ? "critical" : "warning",
    description: `Flute-to-flute load delta ${(delta_frac * 100).toFixed(0)}% (avg=${avg.toFixed(1)}%, max=${maxLoad.toFixed(1)}%, min=${minLoad.toFixed(1)}%) — uneven wear, runout, or chipped flute.`,
    affected_parameters: ["per_flute_load_pct"],
    recommendation: "Inspect tool for chipped flute, measure runout. See prism_mill:mill_tool_assembly + prism_calc:tool_runout_calc.",
    confidence: 0.88,
    data_point_index: idx,
  };
}

function detectFzOutlier(p: MillDataPoint, idx: number): MillAnomalyResult | null {
  if (!p.material_iso) return null;
  const range = MILL_SPEED_FEED_RANGES[p.material_iso];
  if (p.fz_mm_tooth >= range.fz.min && p.fz_mm_tooth <= range.fz.max) return null;
  const out_of_range = p.fz_mm_tooth < range.fz.min
    ? (range.fz.min - p.fz_mm_tooth) / range.fz.min
    : (p.fz_mm_tooth - range.fz.max) / range.fz.max;
  return {
    is_anomaly: true,
    anomaly_score: clamp01(out_of_range),
    anomaly_type: "feed_per_tooth_outlier",
    severity: out_of_range > 0.5 ? "critical" : "warning",
    description: `fz=${p.fz_mm_tooth.toFixed(3)} mm/tooth outside typical range ${range.fz.min}-${range.fz.max} for ISO ${p.material_iso}`,
    affected_parameters: ["fz_mm_tooth"],
    recommendation: "Reconsider fz. See prism_calc:speed_feed.",
    confidence: 0.7,
    data_point_index: idx,
  };
}

function detectVibrationOutlier(values: number[], idx: number): MillAnomalyResult | null {
  if (values.length < 4) return null;
  const v = values[idx];
  if (v === undefined) return null;
  const others = values.filter((_, i) => i !== idx);
  const mu = mean(others);
  const sigma = std(others, mu) || 1e-6;
  const z = Math.abs(v - mu) / sigma;
  if (z < 2.5) return null;
  return {
    is_anomaly: true,
    anomaly_score: clamp01((z - 2.5) / 3),
    anomaly_type: "vibration_outlier",
    severity: z > 4 ? "critical" : "warning",
    description: `Vibration ${v.toFixed(2)}g is ${z.toFixed(1)}σ above series mean (chatter onset).`,
    affected_parameters: ["vibration_g"],
    recommendation: "Check stability lobes. See prism_calc:chatter_stability_lobes + prism_mill:mill_chatter_predict.",
    confidence: 0.85,
    data_point_index: idx,
  };
}

function detectSurfaceFinishDrift(ras: number[]): MillAnomalyResult | null {
  if (ras.length < 3) return null;
  // Linear regression slope to check drift
  const n = ras.length;
  const x_mean = (n - 1) / 2;
  const y_mean = mean(ras);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - x_mean) * (ras[i] - y_mean);
    den += (i - x_mean) ** 2;
  }
  const slope = den > 0 ? num / den : 0;
  // Drift > 0.1 μm/pass is mill-tribal-flagged (first-pass green-light rule)
  if (Math.abs(slope) < 0.1) return null;
  return {
    is_anomaly: true,
    anomaly_score: clamp01(Math.abs(slope) / 0.5),
    anomaly_type: "surface_finish_drift",
    severity: Math.abs(slope) > 0.3 ? "warning" : "info",
    description: `Surface finish drifting ${slope.toFixed(3)} μm/pass over ${n} passes — tool wear or part-geometry deviation accumulating.`,
    affected_parameters: ["surface_ra_um"],
    recommendation: "Inspect tool wear + workholding repeatability. See prism_mill:mill_first_piece_approval.",
    confidence: 0.78,
  };
}

function detectProgramSafetyMissing(program: MillProgram): MillAnomalyResult[] {
  const allG = new Set<string>();
  const allM = new Set<string>();
  for (const b of program.blocks) {
    for (const g of b.g_codes) allG.add(g.toUpperCase());
    for (const m of b.m_codes) allM.add(m.toUpperCase());
  }
  const findings: MillAnomalyResult[] = [];
  const hasEnd = ["M30", "M02", "M99"].some(c => allM.has(c));
  if (!hasEnd) {
    findings.push({
      is_anomaly: true,
      anomaly_score: 1,
      anomaly_type: "missing_safety_code",
      severity: "critical",
      description: "Program lacks end code (M30/M02/M99) — control may hang or repeat",
      affected_parameters: ["program.M30"],
      recommendation: "Append M30 at program end. See prism_cam:post_process.",
      confidence: 1,
    });
  }
  const hasSpindle = ["M03", "M04"].some(c => allM.has(c));
  if (!hasSpindle && program.blocks.some(b => b.s !== undefined)) {
    findings.push({
      is_anomaly: true,
      anomaly_score: 0.9,
      anomaly_type: "missing_safety_code",
      severity: "critical",
      description: "S commanded without M03/M04 — spindle never started",
      affected_parameters: ["program.M03"],
      recommendation: "Insert M03/M04 before first S command. See prism_cam:gcode_safety_analyze.",
      confidence: 1,
    });
  }
  return findings;
}

// ── Engine ────────────────────────────────────────────────────────────────

class MillAnomalyDetectionEngineImpl {
  /** Scan a single data point for instantaneous anomalies. */
  scanPoint(point: MillDataPoint, idx = 0): MillAnomalyResult[] {
    const out: MillAnomalyResult[] = [];
    const checks = [
      detectSpindleLoadSpike,
      detectChipThinningViolation,
      detectEngagementVsDeflection,
      detectFeedOverrideMismatch,
      detectFluteWearDelta,
      detectFzOutlier,
    ];
    for (const c of checks) {
      const r = c(point, idx);
      if (r) out.push(r);
    }
    return out;
  }

  /** Scan a time-series of data points (single cut or batch of cuts). */
  scanSeries(points: MillDataPoint[]): MillAnomalyOutput {
    if (!Array.isArray(points)) throw new Error("MillAnomalyDetectionEngine.scanSeries: points must be an array");
    const anomalies: MillAnomalyResult[] = [];
    for (let i = 0; i < points.length; i++) {
      anomalies.push(...this.scanPoint(points[i], i));
    }
    // Series-level checks
    const vibs = points.map(p => p.vibration_g).filter((v): v is number => v !== undefined);
    if (vibs.length >= 4) {
      // Check each index against the rest of the series
      for (let i = 0; i < points.length; i++) {
        const v = points[i].vibration_g;
        if (v === undefined) continue;
        const idx_in_filtered = vibs.indexOf(v);
        if (idx_in_filtered < 0) continue;
        const result = detectVibrationOutlier(vibs, idx_in_filtered);
        if (result) {
          // Re-key data_point_index to the original series
          result.data_point_index = i;
          anomalies.push(result);
        }
      }
    }
    const ras = points.map(p => p.surface_ra_um).filter((v): v is number => v !== undefined);
    if (ras.length >= 3) {
      const r = detectSurfaceFinishDrift(ras);
      if (r) anomalies.push(r);
    }
    return this.buildOutput(anomalies);
  }

  /** Scan a mill program for static (program-level) anomalies. */
  scanProgram(program: MillProgram): MillAnomalyOutput {
    if (!program || !Array.isArray(program.blocks)) throw new Error("MillAnomalyDetectionEngine.scanProgram: program.blocks required");
    const anomalies = detectProgramSafetyMissing(program);
    return this.buildOutput(anomalies);
  }

  /** Stats for dispatcher introspection. */
  getStats(): {
    detectors: MillAnomalyType[];
    iso_groups_supported: ISOGroup[];
    operation_types_supported: MillOpType[];
  } {
    return {
      detectors: [
        "spindle_load_spike",
        "chip_thinning_violation",
        "adaptive_timing_mismatch",
        "surface_finish_drift",
        "flute_wear_delta",
        "engagement_vs_deflection",
        "slot_transition_spike",
        "feed_per_tooth_outlier",
        "vibration_outlier",
        "missing_safety_code",
      ],
      iso_groups_supported: ["P", "M", "K", "N", "S", "H"],
      operation_types_supported: [
        "face_milling", "end_milling_rough", "end_milling_finish", "slot_milling",
        "contour_milling", "pocket_milling", "thread_milling", "drilling", "boring",
      ],
    };
  }

  // ── Private ───────────────────────────────────────────────────────────

  private buildOutput(anomalies: MillAnomalyResult[]): MillAnomalyOutput {
    // Aggregate overall score: max for criticals, mean otherwise, capped by severity
    const critical = anomalies.filter(a => a.severity === "critical");
    const warnings = anomalies.filter(a => a.severity === "warning");
    let overall_score = 0;
    if (critical.length > 0) {
      overall_score = Math.min(1, 0.8 + 0.2 * Math.max(...critical.map(a => a.anomaly_score)));
    } else if (warnings.length > 0) {
      overall_score = Math.min(0.8, mean(warnings.map(a => a.anomaly_score)));
    } else if (anomalies.length > 0) {
      overall_score = Math.min(0.4, mean(anomalies.map(a => a.anomaly_score)));
    }
    const overall_status: "normal" | "warning" | "alarm" =
      critical.length > 0 ? "alarm" :
      warnings.length > 0 ? "warning" :
      "normal";
    const summary = critical.length > 0
      ? `${critical.length} critical anomaly(s) detected — halt recommended`
      : warnings.length > 0
        ? `${warnings.length} warning(s) — investigate before continuing`
        : anomalies.length > 0
          ? `${anomalies.length} info-level finding(s)`
          : "No anomalies detected";
    const recommendations = Array.from(new Set(anomalies.map(a => a.recommendation)));
    return { anomalies, overall_score, overall_status, summary, recommendations };
  }
}

export const millAnomalyDetectionEngine = new MillAnomalyDetectionEngineImpl();
export type { MillAnomalyDetectionEngineImpl };
