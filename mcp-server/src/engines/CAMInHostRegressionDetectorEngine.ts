/**
 * CAMInHostRegressionDetectorEngine — U-CAMTEST17
 * ================================================
 *
 * PHASE-8: Diffs a current NightlyRunReport against a stored golden
 * baseline at `data/state/CAM_INHOST_GOLDEN_BASELINE.json` and surfaces
 * regressions across 5 axes:
 *
 *   host_pass_rate          drop in per-host pass% > 5% absolute
 *   category_pass_rate      drop in per-category pass% > 5% absolute
 *   assertion_failure_rate  rise in per-family failure% > 5% absolute
 *   scenario_count          observed scenario count differs from baseline
 *                           (any change is suspect — fixture catalog drift)
 *   new_failing_family      assertion family with 0 failures in baseline
 *                           and ≥1 failure in current (any new failure
 *                           is critical)
 *
 * Severity mapping (by absolute pass-rate delta):
 *   delta ≥ 10% absolute → critical
 *   delta ≥  5% absolute → warning
 *   else                → info (still recorded for trend tracking)
 *
 * Golden baseline workflow:
 *   - hasGolden() / loadGolden() check + read existing baseline.
 *   - promoteToGolden(report) writes a fresh baseline (typically called
 *     after a manually-approved good run).
 *   - detectRegressions(current, baseline) is the read-only diff.
 *
 * @module engines/CAMInHostRegressionDetectorEngine
 * @milestone CAM-EXHAUST-MS0 U-CAMTEST17
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import {
  NightlyRunReportSchema,
  type NightlyRunReport,
} from "./CAMInHostNightlyOrchestratorEngine.js";

// ── Thresholds ───────────────────────────────────────────────────────────────

export const WARNING_THRESHOLD_PCT = 5;
export const CRITICAL_THRESHOLD_PCT = 10;

// ── Schemas ──────────────────────────────────────────────────────────────────

export const RegressionSeveritySchema = z.enum(["critical", "warning", "info"]);
export type RegressionSeverity = z.infer<typeof RegressionSeveritySchema>;

export const RegressionTypeSchema = z.enum([
  "host_pass_rate",
  "category_pass_rate",
  "assertion_failure_rate",
  "scenario_count",
  "new_failing_family",
]);
export type RegressionType = z.infer<typeof RegressionTypeSchema>;

export const RegressionFindingSchema = z.object({
  type: RegressionTypeSchema,
  severity: RegressionSeveritySchema,
  dimension: z.string().min(1),
  detail: z.string().min(1),
  baseline_value: z.number(),
  current_value: z.number(),
  delta: z.number(),
});
export type RegressionFinding = z.infer<typeof RegressionFindingSchema>;

export const RegressionReportSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  current_run_id: z.string().min(1),
  baseline_run_id: z.string().min(1),
  generated_at_ms: z.number().int().nonnegative(),
  total_findings: z.number().int().nonnegative(),
  by_severity: z.object({
    critical: z.number().int().nonnegative(),
    warning: z.number().int().nonnegative(),
    info: z.number().int().nonnegative(),
  }),
  by_type: z.record(RegressionTypeSchema, z.number().int().nonnegative()),
  findings: z.array(RegressionFindingSchema),
  has_critical: z.boolean(),
});
export type RegressionReport = z.infer<typeof RegressionReportSchema>;

export const GoldenBaselineFileSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  promoted_at_ms: z.number().int().nonnegative(),
  source_run_id: z.string().min(1),
  report: NightlyRunReportSchema,
});
export type GoldenBaselineFile = z.infer<typeof GoldenBaselineFileSchema>;

// ── Constants ────────────────────────────────────────────────────────────────

export const SCHEMA_VERSION = "1.0.0";
export const DEFAULT_GOLDEN_PATH = "data/state/CAM_INHOST_GOLDEN_BASELINE.json";

// ── Helpers ──────────────────────────────────────────────────────────────────

function passPct(passed: number, total: number): number {
  return total === 0 ? 0 : (passed / total) * 100;
}

function failPct(failed: number, total: number): number {
  return total === 0 ? 0 : (failed / total) * 100;
}

function severityForDelta(absDeltaPct: number): RegressionSeverity {
  if (absDeltaPct >= CRITICAL_THRESHOLD_PCT) return "critical";
  if (absDeltaPct >= WARNING_THRESHOLD_PCT) return "warning";
  return "info";
}

function emptyByType(): Record<RegressionType, number> {
  return {
    host_pass_rate: 0,
    category_pass_rate: 0,
    assertion_failure_rate: 0,
    scenario_count: 0,
    new_failing_family: 0,
  };
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class CAMInHostRegressionDetectorEngine {
  static readonly SCHEMA_VERSION = SCHEMA_VERSION;
  static readonly DEFAULT_GOLDEN_PATH = DEFAULT_GOLDEN_PATH;
  static readonly WARNING_THRESHOLD_PCT = WARNING_THRESHOLD_PCT;
  static readonly CRITICAL_THRESHOLD_PCT = CRITICAL_THRESHOLD_PCT;

  /** Compute regressions between current and baseline reports. */
  static detectRegressions(
    current: NightlyRunReport,
    baseline: NightlyRunReport,
    options: { now?: number } = {},
  ): RegressionReport {
    NightlyRunReportSchema.parse(current);
    NightlyRunReportSchema.parse(baseline);
    const findings: RegressionFinding[] = [];

    // 1. scenario_count: any drift is suspect (fixture catalog change).
    if (current.summary.total !== baseline.summary.total) {
      const delta = current.summary.total - baseline.summary.total;
      const sev: RegressionSeverity = Math.abs(delta) >= 10 ? "critical" : "warning";
      findings.push({
        type: "scenario_count",
        severity: sev,
        dimension: "total",
        detail: `scenario count changed: baseline=${baseline.summary.total}, current=${current.summary.total} (delta ${delta >= 0 ? "+" : ""}${delta})`,
        baseline_value: baseline.summary.total,
        current_value: current.summary.total,
        delta,
      });
    }

    // 2. host_pass_rate: drop > 5% absolute.
    for (const host of Object.keys(baseline.summary.by_host)) {
      const b = baseline.summary.by_host[host as keyof typeof baseline.summary.by_host];
      const c = current.summary.by_host[host as keyof typeof current.summary.by_host];
      if (b === undefined || c === undefined) continue;
      const bp = passPct(b.passed, b.total);
      const cp = passPct(c.passed, c.total);
      const delta = cp - bp;
      if (delta < 0 && Math.abs(delta) >= WARNING_THRESHOLD_PCT) {
        findings.push({
          type: "host_pass_rate",
          severity: severityForDelta(Math.abs(delta)),
          dimension: host,
          detail: `host ${host}: pass% ${bp.toFixed(1)} → ${cp.toFixed(1)} (delta ${delta.toFixed(1)})`,
          baseline_value: bp,
          current_value: cp,
          delta,
        });
      }
    }

    // 3. category_pass_rate: drop > 5% absolute.
    for (const cat of Object.keys(baseline.summary.by_category)) {
      const b = baseline.summary.by_category[cat as keyof typeof baseline.summary.by_category];
      const c = current.summary.by_category[cat as keyof typeof current.summary.by_category];
      if (b === undefined || c === undefined) continue;
      const bp = passPct(b.passed, b.total);
      const cp = passPct(c.passed, c.total);
      const delta = cp - bp;
      if (delta < 0 && Math.abs(delta) >= WARNING_THRESHOLD_PCT) {
        findings.push({
          type: "category_pass_rate",
          severity: severityForDelta(Math.abs(delta)),
          dimension: cat,
          detail: `category ${cat}: pass% ${bp.toFixed(1)} → ${cp.toFixed(1)} (delta ${delta.toFixed(1)})`,
          baseline_value: bp,
          current_value: cp,
          delta,
        });
      }
    }

    // 4. assertion_failure_rate: rise > 5% absolute.
    for (const fam of Object.keys(baseline.summary.by_assertion)) {
      const b = baseline.summary.by_assertion[fam as keyof typeof baseline.summary.by_assertion];
      const c = current.summary.by_assertion[fam as keyof typeof current.summary.by_assertion];
      if (b === undefined || c === undefined) continue;
      const bf = failPct(b.failed, b.total);
      const cf = failPct(c.failed, c.total);
      const delta = cf - bf;
      if (delta > 0 && delta >= WARNING_THRESHOLD_PCT) {
        findings.push({
          type: "assertion_failure_rate",
          severity: severityForDelta(delta),
          dimension: fam,
          detail: `assertion ${fam}: failure% ${bf.toFixed(1)} → ${cf.toFixed(1)} (delta +${delta.toFixed(1)})`,
          baseline_value: bf,
          current_value: cf,
          delta,
        });
      }
    }

    // 5. new_failing_family: family was 0-failures in baseline, ≥1 in current.
    //    This is always critical — a previously-clean family started failing.
    for (const fam of Object.keys(baseline.summary.by_assertion)) {
      const b = baseline.summary.by_assertion[fam as keyof typeof baseline.summary.by_assertion];
      const c = current.summary.by_assertion[fam as keyof typeof current.summary.by_assertion];
      if (b === undefined || c === undefined) continue;
      if (b.failed === 0 && c.failed > 0) {
        findings.push({
          type: "new_failing_family",
          severity: "critical",
          dimension: fam,
          detail: `assertion family "${fam}" was clean in baseline but has ${c.failed} failures in current run`,
          baseline_value: 0,
          current_value: c.failed,
          delta: c.failed,
        });
      }
    }

    // Counts
    const by_severity = { critical: 0, warning: 0, info: 0 };
    const by_type = emptyByType();
    for (const f of findings) {
      by_severity[f.severity] += 1;
      by_type[f.type] += 1;
    }
    const report: RegressionReport = {
      schemaVersion: SCHEMA_VERSION,
      current_run_id: current.descriptor.run_id,
      baseline_run_id: baseline.descriptor.run_id,
      generated_at_ms: options.now ?? Date.now(),
      total_findings: findings.length,
      by_severity,
      by_type,
      findings,
      has_critical: by_severity.critical > 0,
    };
    return RegressionReportSchema.parse(report);
  }

  /** Read the golden baseline from disk (throws when missing). */
  static loadGolden(target_path: string = DEFAULT_GOLDEN_PATH): NightlyRunReport {
    if (!fs.existsSync(target_path)) {
      throw new Error(`CAMInHostRegressionDetector: golden baseline not found at "${target_path}"`);
    }
    const raw = fs.readFileSync(target_path, "utf8");
    const file = GoldenBaselineFileSchema.parse(JSON.parse(raw));
    return file.report;
  }

  /** Check whether a golden baseline file exists at the given path. */
  static hasGolden(target_path: string = DEFAULT_GOLDEN_PATH): boolean {
    return fs.existsSync(target_path);
  }

  /**
   * Promote a NightlyRunReport to be the new golden baseline. Use this only
   * after a manually-approved clean run — it overwrites any prior baseline.
   */
  static promoteToGolden(report: NightlyRunReport, target_path: string = DEFAULT_GOLDEN_PATH): { path: string; promoted_at_ms: number } {
    NightlyRunReportSchema.parse(report);
    const file: GoldenBaselineFile = GoldenBaselineFileSchema.parse({
      schemaVersion: SCHEMA_VERSION,
      promoted_at_ms: Date.now(),
      source_run_id: report.descriptor.run_id,
      report,
    });
    fs.mkdirSync(path.dirname(target_path), { recursive: true });
    fs.writeFileSync(target_path, JSON.stringify(file, null, 2), "utf8");
    return { path: target_path, promoted_at_ms: file.promoted_at_ms };
  }

  /** Filter findings by severity. */
  static findingsBySeverity(report: RegressionReport, severity: RegressionSeverity): RegressionFinding[] {
    const sev = RegressionSeveritySchema.parse(severity);
    return report.findings.filter(f => f.severity === sev);
  }

  /** Filter findings by type. */
  static findingsByType(report: RegressionReport, type: RegressionType): RegressionFinding[] {
    const t = RegressionTypeSchema.parse(type);
    return report.findings.filter(f => f.type === t);
  }

  /** Convenience: detect using golden baseline file (loads from default path). */
  static detectAgainstGolden(current: NightlyRunReport, golden_path: string = DEFAULT_GOLDEN_PATH): RegressionReport {
    const baseline = CAMInHostRegressionDetectorEngine.loadGolden(golden_path);
    return CAMInHostRegressionDetectorEngine.detectRegressions(current, baseline);
  }

  static auditReport(report: RegressionReport): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
    try { RegressionReportSchema.parse(report); }
    catch (e) { errors.push(`regression report schema parse failed: ${(e as Error).message}`); }
    if (report.findings.length !== report.total_findings) {
      errors.push(`total_findings (${report.total_findings}) does not match findings.length (${report.findings.length})`);
    }
    const sumBySev = report.by_severity.critical + report.by_severity.warning + report.by_severity.info;
    if (sumBySev !== report.total_findings) {
      errors.push(`by_severity sum (${sumBySev}) does not match total_findings (${report.total_findings})`);
    }
    const computedHasCritical = report.by_severity.critical > 0;
    if (computedHasCritical !== report.has_critical) {
      errors.push(`has_critical (${report.has_critical}) does not match by_severity.critical>0 (${computedHasCritical})`);
    }
    return { ok: errors.length === 0, errors };
  }
}

export const camInHostRegressionDetectorEngine = CAMInHostRegressionDetectorEngine;
