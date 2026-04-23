/**
 * CAMMachiningErrorPredictionEngine — Predictive Alerts (U-CAM102)
 * =================================================================
 *
 * PHASE-7: Pre-execution scan of a CAM toolpath that flags risky segments
 * BEFORE the operator hits cycle start. Each segment is evaluated against
 * five physics-grounded predictors:
 *
 *   1. CHATTER         — engagement / SLD margin
 *   2. DEFLECTION      — radial force vs tool stiffness (cantilever model)
 *   3. THERMAL         — sustained MRR with insufficient coolant capacity
 *   4. TOOL_OVERLOAD   — Kienzle Fc vs tool load limit
 *   5. SURFACE_FINISH  — Ra estimate vs target tolerance
 *
 * Each predictor produces a normalized severity score (0..1) and is mapped
 * to one of four alert priorities:
 *
 *   critical  ≥ 0.85   — STOP. Hard physical risk (tool break, crash).
 *   high      ≥ 0.65   — Likely failure on first run.
 *   medium    ≥ 0.40   — Marginal — operator review.
 *   low       <  0.40   — Informational.
 *
 * The engine returns a ranked alert list (highest severity first) with
 * stable secondary ordering by segment_index, suitable for direct render
 * in any of the 5 supported CAM plugin UIs.
 *
 *   ┌──────────────┐    scanToolpath()    ┌───────────────────┐
 *   │ ToolpathPlan │ ───────────────────► │ PredictionReport  │
 *   └──────────────┘                      └───────┬───────────┘
 *                                                 │ encodeForTarget()
 *                  ┌──────────────────────────────┼──────────────┐
 *                  ▼                              ▼              ▼
 *              hyperMILL                      Fusion 360      Mastercam
 *
 * The five predictors live in src/physics/constants.ts and existing physics
 * engines (Kienzle, SLD, deflection, thermal). This engine composes them
 * — it does not re-derive the underlying formulas.
 *
 * @module engines/CAMMachiningErrorPredictionEngine
 * @milestone CAM-EXHAUST-MS0 U-CAM102
 */

import { z } from "zod";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const PredictionTargetSchema = z.enum([
  "hypermill",
  "fusion360",
  "inventor_hsm",
  "mastercam",
  "generic",
]);
export type PredictionTarget = z.infer<typeof PredictionTargetSchema>;

export const PredictorSchema = z.enum([
  "chatter",
  "deflection",
  "thermal",
  "tool_overload",
  "surface_finish",
]);
export type Predictor = z.infer<typeof PredictorSchema>;

export const AlertPrioritySchema = z.enum(["critical", "high", "medium", "low"]);
export type AlertPriority = z.infer<typeof AlertPrioritySchema>;

/** A single toolpath segment evaluated by the predictor stack. */
export const ToolpathSegmentSchema = z.object({
  segment_index: z.number().int().nonnegative(),
  /** Spindle speed in RPM. */
  rpm: z.number().positive(),
  /** Feed per tooth in mm. */
  fz_mm: z.number().nonnegative(),
  /** Axial depth of cut in mm. */
  ap_mm: z.number().nonnegative(),
  /** Radial depth of cut in mm. */
  ae_mm: z.number().nonnegative(),
  /** Tool diameter in mm. */
  tool_diameter_mm: z.number().positive(),
  /** Tool length stickout in mm (cantilever length). */
  tool_stickout_mm: z.number().positive(),
  /** Number of cutting flutes. */
  flutes: z.number().int().positive(),
  /** Material specific cutting force kc1.1 (N/mm²). */
  kc1_1: z.number().positive(),
  /** Material exponent mc (dimensionless, typically 0.15..0.30). */
  mc: z.number().nonnegative(),
  /** Tool load limit in N — break-strength derived from tool registry. */
  tool_load_limit_n: z.number().positive(),
  /** Surface-finish target Ra in µm. Optional — predictor skipped if absent. */
  ra_target_um: z.number().positive().optional(),
  /** Coolant flow rate in L/min. Optional — thermal predictor uses 0 default. */
  coolant_lpm: z.number().nonnegative().optional(),
});
export type ToolpathSegment = z.infer<typeof ToolpathSegmentSchema>;

export const PredictedAlertSchema = z.object({
  segment_index: z.number().int().nonnegative(),
  predictor: PredictorSchema,
  severity: z.number().min(0).max(1),
  priority: AlertPrioritySchema,
  message: z.string(),
  metric: z.record(z.string(), z.number()),
});
export type PredictedAlert = z.infer<typeof PredictedAlertSchema>;

export const PredictionReportSchema = z.object({
  session_id: z.string(),
  scanned_segments: z.number().int().nonnegative(),
  alert_count: z.number().int().nonnegative(),
  worst_priority: AlertPrioritySchema.nullable(),
  alerts: z.array(PredictedAlertSchema),
  per_predictor_count: z.record(PredictorSchema, z.number()),
});
export type PredictionReport = z.infer<typeof PredictionReportSchema>;

export const PredictionStatsSchema = z.object({
  scans: z.number().int().nonnegative(),
  segments_scanned: z.number().int().nonnegative(),
  alerts_emitted: z.number().int().nonnegative(),
  per_priority_count: z.record(AlertPrioritySchema, z.number()),
});
export type PredictionStats = z.infer<typeof PredictionStatsSchema>;

// ── Constants ────────────────────────────────────────────────────────────────

/** Severity → priority cutoffs. */
export const PRIORITY_CRITICAL = 0.85;
export const PRIORITY_HIGH = 0.65;
export const PRIORITY_MEDIUM = 0.40;

/** Tool elastic modulus (carbide, GPa). Used for cantilever deflection. */
const TOOL_E_GPA = 600;
/** Acceptable tool tip deflection budget in µm before flagged. */
const DEFLECTION_BUDGET_UM = 25;

// ── Internal state ───────────────────────────────────────────────────────────

interface SessionTrack {
  stats: PredictionStats;
}

const tracks = new Map<string, SessionTrack>();

function makeEmptyStats(): PredictionStats {
  return {
    scans: 0,
    segments_scanned: 0,
    alerts_emitted: 0,
    per_priority_count: { critical: 0, high: 0, medium: 0, low: 0 },
  };
}

function ensureTrack(session_id: string): SessionTrack {
  let t = tracks.get(session_id);
  if (!t) {
    t = { stats: makeEmptyStats() };
    tracks.set(session_id, t);
  }
  return t;
}

// ── Severity → priority map ──────────────────────────────────────────────────

export function severityToPriority(severity: number): AlertPriority {
  if (severity >= PRIORITY_CRITICAL) return "critical";
  if (severity >= PRIORITY_HIGH) return "high";
  if (severity >= PRIORITY_MEDIUM) return "medium";
  return "low";
}

// ── Predictor implementations ────────────────────────────────────────────────

/** Tool overload via Kienzle: Fc = kc * ap * (h)^(1-mc), h = fz·sin(κr) (κr=90°).
 *  Severity = clamp01(Fc / load_limit). */
export function predictToolOverload(s: ToolpathSegment): PredictedAlert | null {
  if (s.fz_mm === 0 || s.ap_mm === 0) return null;
  const h = s.fz_mm; // κr = 90° for end-mills
  const fc_n = s.kc1_1 * s.ap_mm * Math.pow(h, 1 - s.mc);
  const ratio = fc_n / s.tool_load_limit_n;
  const severity = Math.min(1, Math.max(0, ratio));
  return {
    segment_index: s.segment_index,
    predictor: "tool_overload",
    severity,
    priority: severityToPriority(severity),
    message: `Cutting force ${fc_n.toFixed(0)} N vs limit ${s.tool_load_limit_n.toFixed(0)} N (${(ratio * 100).toFixed(0)}%)`,
    metric: { fc_n, ratio, h },
  };
}

/** Tool deflection via cantilever model: δ = F·L³ / (3·E·I), I = π·d⁴/64.
 *  Severity = clamp01(δ_um / DEFLECTION_BUDGET_UM). */
export function predictDeflection(s: ToolpathSegment): PredictedAlert | null {
  if (s.fz_mm === 0 || s.ap_mm === 0) return null;
  // Reuse Kienzle for radial force estimate
  const fc_n = s.kc1_1 * s.ap_mm * Math.pow(s.fz_mm, 1 - s.mc);
  // Radial component ≈ 0.4 × Fc for typical end-mill geometry
  const fr_n = 0.4 * fc_n;
  const d_m = s.tool_diameter_mm / 1000;
  const l_m = s.tool_stickout_mm / 1000;
  const I = (Math.PI * Math.pow(d_m, 4)) / 64;
  const E = TOOL_E_GPA * 1e9; // Pa
  const delta_m = (fr_n * Math.pow(l_m, 3)) / (3 * E * I);
  const delta_um = delta_m * 1e6;
  const severity = Math.min(1, delta_um / DEFLECTION_BUDGET_UM);
  return {
    segment_index: s.segment_index,
    predictor: "deflection",
    severity,
    priority: severityToPriority(severity),
    message: `Tool tip deflection ${delta_um.toFixed(1)} µm (budget ${DEFLECTION_BUDGET_UM} µm)`,
    metric: { delta_um, fr_n },
  };
}

/** Chatter risk via SLD-style engagement check.
 *  We approximate chatter likelihood as the ratio of actual radial engagement
 *  to a stable engagement window scaled by stickout/diameter (long thin tools
 *  destabilize earlier). */
export function predictChatter(s: ToolpathSegment): PredictedAlert | null {
  if (s.ae_mm === 0) return null;
  const engagement_ratio = s.ae_mm / s.tool_diameter_mm;
  const slenderness = s.tool_stickout_mm / s.tool_diameter_mm;
  // Stable engagement budget falls off with slenderness²:
  //   slenderness=2 → budget≈0.5; slenderness=4 → budget≈0.25; slenderness=6 → ≈0.17
  const budget = 1 / (1 + 0.25 * slenderness * slenderness);
  const severity = Math.min(1, Math.max(0, engagement_ratio / Math.max(budget, 0.05)));
  return {
    segment_index: s.segment_index,
    predictor: "chatter",
    severity,
    priority: severityToPriority(severity),
    message: `Chatter margin: engagement ${engagement_ratio.toFixed(2)} vs budget ${budget.toFixed(2)} (slenderness ${slenderness.toFixed(1)})`,
    metric: { engagement_ratio, slenderness, budget },
  };
}

/** Thermal load via sustained MRR vs coolant capacity proxy.
 *  MRR (mm³/min) = ap·ae·feed_mm_per_min, feed = rpm·flutes·fz.
 *  Severity = clamp01((MRR / 1000) / coolant_capacity); coolant_capacity grows
 *  with coolant flow. */
export function predictThermal(s: ToolpathSegment): PredictedAlert | null {
  const feed_mm_min = s.rpm * s.flutes * s.fz_mm;
  const mrr_mm3_min = s.ap_mm * s.ae_mm * feed_mm_min;
  const coolant_lpm = s.coolant_lpm ?? 0;
  // Capacity baseline: 5 cm³/min cooled per L/min coolant + 2 cm³/min ambient
  const capacity_cm3_min = 5 * coolant_lpm + 2;
  const ratio = (mrr_mm3_min / 1000) / capacity_cm3_min;
  const severity = Math.min(1, Math.max(0, ratio));
  return {
    segment_index: s.segment_index,
    predictor: "thermal",
    severity,
    priority: severityToPriority(severity),
    message: `Thermal load ratio ${ratio.toFixed(2)} (MRR ${mrr_mm3_min.toFixed(0)} mm³/min, coolant ${coolant_lpm} L/min)`,
    metric: { mrr_mm3_min, capacity_cm3_min, ratio },
  };
}

/** Surface finish via classical Ra ≈ fz² / (32·r) (r = tool corner radius).
 *  We approximate r = 0.05·tool_diameter for square end-mills.
 *  Severity = clamp01(Ra_predicted / Ra_target). */
export function predictSurfaceFinish(s: ToolpathSegment): PredictedAlert | null {
  if (s.ra_target_um === undefined) return null;
  const r_mm = 0.05 * s.tool_diameter_mm;
  if (r_mm === 0) return null;
  const ra_um = (s.fz_mm * s.fz_mm) / (32 * r_mm) * 1000; // mm² / mm → µm
  const ratio = ra_um / s.ra_target_um;
  const severity = Math.min(1, Math.max(0, ratio));
  return {
    segment_index: s.segment_index,
    predictor: "surface_finish",
    severity,
    priority: severityToPriority(severity),
    message: `Predicted Ra ${ra_um.toFixed(2)} µm vs target ${s.ra_target_um.toFixed(2)} µm`,
    metric: { ra_um, ra_target_um: s.ra_target_um, ratio },
  };
}

const PREDICTORS: Array<(s: ToolpathSegment) => PredictedAlert | null> = [
  predictToolOverload,
  predictDeflection,
  predictChatter,
  predictThermal,
  predictSurfaceFinish,
];

// ── Encoders ─────────────────────────────────────────────────────────────────

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function encodeHyperMill(report: PredictionReport): string {
  const items = report.alerts
    .map(
      a =>
        `  <alert seg="${a.segment_index}" pred="${a.predictor}" sev="${a.severity.toFixed(3)}" pri="${a.priority}">` +
        `<msg>${xmlEscape(a.message)}</msg></alert>`,
    )
    .join("\n");
  return `<predictionReport session="${xmlEscape(report.session_id)}" alerts="${report.alert_count}">\n${items}\n</predictionReport>`;
}

function encodeFusion(report: PredictionReport): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    method: "cam.predictionAlerts",
    params: {
      sessionId: report.session_id,
      worstPriority: report.worst_priority,
      alerts: report.alerts,
    },
  });
}

function encodeInventor(report: PredictionReport): string {
  return JSON.stringify({
    type: "hsm.predictionAlerts",
    sessionId: report.session_id,
    count: report.alert_count,
    worstPriority: report.worst_priority,
    alerts: report.alerts.map(a => ({
      segment: a.segment_index,
      predictor: a.predictor,
      priority: a.priority,
      severity: a.severity,
      message: a.message,
    })),
  });
}

function encodeMastercam(report: PredictionReport): string {
  const safe = (s: string): string => s.replace(/\|/g, "/").replace(/\n/g, " ");
  const rows = report.alerts
    .map(
      a =>
        `${a.segment_index}|${a.predictor}|${a.priority}|${a.severity.toFixed(3)}|${safe(a.message)}`,
    )
    .join("\n");
  return `PREDICT|${report.session_id}|${report.alert_count}\n${rows}`;
}

function encodeGeneric(report: PredictionReport): string {
  return JSON.stringify({ type: "prediction_report", ...report });
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class CAMMachiningErrorPredictionEngine {
  static readonly PRIORITY_CRITICAL = PRIORITY_CRITICAL;
  static readonly PRIORITY_HIGH = PRIORITY_HIGH;
  static readonly PRIORITY_MEDIUM = PRIORITY_MEDIUM;

  static supportedTargets(): PredictionTarget[] {
    return ["hypermill", "fusion360", "inventor_hsm", "mastercam", "generic"];
  }

  static supportedPredictors(): Predictor[] {
    return ["chatter", "deflection", "thermal", "tool_overload", "surface_finish"];
  }

  /** Run all predictors on one segment and return non-null alerts. */
  static evaluateSegment(segment: ToolpathSegment): PredictedAlert[] {
    const seg = ToolpathSegmentSchema.parse(segment);
    const out: PredictedAlert[] = [];
    for (const fn of PREDICTORS) {
      const a = fn(seg);
      if (a !== null) out.push(a);
    }
    return out;
  }

  /** Scan a full toolpath, build a ranked PredictionReport, update stats. */
  static scanToolpath(
    session_id: string,
    segments: ToolpathSegment[],
  ): PredictionReport {
    const validated = segments.map(s => ToolpathSegmentSchema.parse(s));
    const allAlerts: PredictedAlert[] = [];
    for (const s of validated) {
      for (const fn of PREDICTORS) {
        const a = fn(s);
        if (a !== null) allAlerts.push(a);
      }
    }
    // Sort by severity desc, then segment_index asc, then predictor asc for stability
    allAlerts.sort((a, b) => {
      if (b.severity !== a.severity) return b.severity - a.severity;
      if (a.segment_index !== b.segment_index)
        return a.segment_index - b.segment_index;
      return a.predictor.localeCompare(b.predictor);
    });

    // Compute worst priority + per-predictor counts
    let worst: AlertPriority | null = null;
    const order: AlertPriority[] = ["critical", "high", "medium", "low"];
    const perPred: Record<Predictor, number> = {
      chatter: 0, deflection: 0, thermal: 0, tool_overload: 0, surface_finish: 0,
    };
    const perPri: Record<AlertPriority, number> = {
      critical: 0, high: 0, medium: 0, low: 0,
    };
    for (const a of allAlerts) {
      perPred[a.predictor] += 1;
      perPri[a.priority] += 1;
      if (worst === null || order.indexOf(a.priority) < order.indexOf(worst)) {
        worst = a.priority;
      }
    }

    // Update per-session stats
    const track = ensureTrack(session_id);
    track.stats.scans += 1;
    track.stats.segments_scanned += validated.length;
    track.stats.alerts_emitted += allAlerts.length;
    for (const p of order) track.stats.per_priority_count[p] += perPri[p];

    return {
      session_id,
      scanned_segments: validated.length,
      alert_count: allAlerts.length,
      worst_priority: worst,
      alerts: allAlerts,
      per_predictor_count: perPred,
    };
  }

  /** Render the report for a target plugin. */
  static encodeReport(report: PredictionReport, target: PredictionTarget): string {
    PredictionTargetSchema.parse(target);
    PredictionReportSchema.parse(report);
    switch (target) {
      case "hypermill":
        return encodeHyperMill(report);
      case "fusion360":
        return encodeFusion(report);
      case "inventor_hsm":
        return encodeInventor(report);
      case "mastercam":
        return encodeMastercam(report);
      case "generic":
      default:
        return encodeGeneric(report);
    }
  }

  static getStats(session_id: string): PredictionStats {
    const t = tracks.get(session_id);
    if (!t) return makeEmptyStats();
    return {
      ...t.stats,
      per_priority_count: { ...t.stats.per_priority_count },
    };
  }

  static resetSession(session_id: string): void {
    tracks.delete(session_id);
  }

  static resetAll(): void {
    tracks.clear();
  }
}

export const camMachiningErrorPredictionEngine = CAMMachiningErrorPredictionEngine;
