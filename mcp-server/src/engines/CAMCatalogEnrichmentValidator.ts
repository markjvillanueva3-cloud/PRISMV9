/**
 * CAMCatalogEnrichmentValidator — U-CAM-ENRICH-04
 * ==================================================
 *
 * Enforcement engine for the PHASE-0.6 enrichment gate. Walks the three
 * enrichment indexes shipped by U-CAM-ENRICH-01/02/03 and reports, per
 * CAM slug, how much of the catalog is covered by:
 *
 *   - physics_links     (from CAM_PHYSICS_LINKS_INDEX.json)
 *   - tribal_tips       (from CAM_TRIBAL_TIP_INDEX.json)
 *   - ai_actions        (from CAM_AI_ACTIONS_INDEX.json)
 *
 * Produces a machine-readable report that CI can gate on. Locks a baseline
 * to data/state/PHASE_0.6_ENRICHMENT_BASELINE.json on first run; subsequent
 * runs regress if any CAM's enrichment % drops below baseline × (1 - drift).
 *
 * Why this matters: without a gate, any refactor that accidentally breaks
 * the param→formula patterns or the tip-text scan will silently halve the
 * training signal with no test failure. This engine catches drift.
 *
 * The validator does NOT modify catalogs. It only reads indexes and
 * reports. Phase-5 stub engines + the Phase-5 real-impl gate (U-CAM-ENRICH-05)
 * enforce the *use* of these links.
 *
 * Authored 2026-04-21 — CAM-EXHAUST-MS0 PHASE-0.6 U-CAM-ENRICH-04.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { CAMPhysicsLinksIndex } from "./CAMCatalogPhysicsLinkerEngine.js";
import type { CAMTribalTipIndex } from "./CAMTribalTipLinkerEngine.js";
import type { CAMAIActionIndex } from "./CAMAIActionLinkerEngine.js";

// ─── Types ──────────────────────────────────────────────────────────

export interface CAMEnrichmentReport {
  cam_slug: string;
  params_total: number;
  params_physics_linked: number;
  params_with_actions: number;
  tips_total: number;
  tips_linked: number;
  physics_coverage_pct: number;
  actions_coverage_pct: number;
  tips_linked_pct: number;
  overall_score: number;
}

export interface CAMEnrichmentBaseline {
  schemaVersion: 1;
  captured_at: string;
  per_cam: Record<string, {
    physics_coverage_pct: number;
    actions_coverage_pct: number;
    tips_linked_pct: number;
    overall_score: number;
  }>;
}

export interface ValidatorRunResult {
  schemaVersion: 1;
  generated_at: string;
  reports: CAMEnrichmentReport[];
  global_score: number;
  baseline_compared: boolean;
  regressions: Array<{
    cam_slug: string;
    metric: string;
    baseline: number;
    current: number;
    delta_pct: number;
  }>;
  passed: boolean;
}

// ─── Engine ─────────────────────────────────────────────────────────

const DEFAULT_DRIFT_TOLERANCE = 0.10; // 10% relative slack before failure
const DEFAULT_MIN_COVERAGE = 0.0;      // initial baseline — locks whatever we ship

export interface ValidateOptions {
  driftTolerance?: number;
  minOverallScore?: number;
  baselinePath?: string;
  writeBaselineIfMissing?: boolean;
  physicsIndexPath?: string;
  tribalIndexPath?: string;
  aiActionsIndexPath?: string;
}

export class CAMCatalogEnrichmentValidator {
  readonly name = "CAMCatalogEnrichmentValidator";

  validate(opts: ValidateOptions = {}): ValidatorRunResult {
    const physicsPath = opts.physicsIndexPath ?? "H:/PRISM/mcp-server/data/state/CAM_PHYSICS_LINKS_INDEX.json";
    const tribalPath = opts.tribalIndexPath ?? "H:/PRISM/mcp-server/data/state/CAM_TRIBAL_TIP_INDEX.json";
    const actionsPath = opts.aiActionsIndexPath ?? "H:/PRISM/mcp-server/data/state/CAM_AI_ACTIONS_INDEX.json";
    const baselinePath = opts.baselinePath ?? "H:/PRISM/mcp-server/data/state/PHASE_0.6_ENRICHMENT_BASELINE.json";
    const driftTol = opts.driftTolerance ?? DEFAULT_DRIFT_TOLERANCE;
    const minOverall = opts.minOverallScore ?? DEFAULT_MIN_COVERAGE;

    const phys = this.loadJson<CAMPhysicsLinksIndex>(physicsPath);
    const trib = this.loadJson<CAMTribalTipIndex>(tribalPath);
    const acts = this.loadJson<CAMAIActionIndex>(actionsPath);

    const reports = this.buildReports(phys, trib, acts);
    const globalScore = reports.length > 0
      ? reports.reduce((s, r) => s + r.overall_score, 0) / reports.length
      : 0;

    const baseline = this.loadJson<CAMEnrichmentBaseline>(baselinePath);
    let regressions: ValidatorRunResult["regressions"] = [];
    let baselineCompared = false;

    if (baseline) {
      baselineCompared = true;
      regressions = this.detectRegressions(reports, baseline, driftTol);
    } else if (opts.writeBaselineIfMissing) {
      this.writeBaseline(reports, baselinePath);
    }

    const passed = globalScore >= minOverall && regressions.length === 0;

    return {
      schemaVersion: 1,
      generated_at: new Date().toISOString(),
      reports,
      global_score: globalScore,
      baseline_compared: baselineCompared,
      regressions,
      passed,
    };
  }

  /** Forces a baseline write (used by first-run boot-strap). */
  captureBaseline(opts: Omit<ValidateOptions, "writeBaselineIfMissing"> = {}): CAMEnrichmentBaseline {
    const result = this.validate({ ...opts, writeBaselineIfMissing: false });
    const baselinePath = opts.baselinePath ?? "H:/PRISM/mcp-server/data/state/PHASE_0.6_ENRICHMENT_BASELINE.json";
    return this.writeBaseline(result.reports, baselinePath);
  }

  // ─── Private helpers (exposed for tests) ──────────────────────────

  buildReports(
    phys: CAMPhysicsLinksIndex | null,
    trib: CAMTribalTipIndex | null,
    acts: CAMAIActionIndex | null
  ): CAMEnrichmentReport[] {
    const slugs = new Set<string>();
    if (phys) for (const s of Object.keys(phys.cams)) slugs.add(s);
    if (trib) for (const s of Object.keys(trib.summary.per_cam_tip_count)) slugs.add(s);
    if (acts) for (const s of Object.keys(acts.by_cam_param)) slugs.add(s);

    const reports: CAMEnrichmentReport[] = [];
    for (const slug of [...slugs].sort()) {
      const physCam = phys?.cams[slug];
      const paramsTotal = physCam?.total_params_scanned ?? 0;
      const paramsPhysLinked = physCam?.matched_params ?? 0;
      const paramsWithActions = acts?.summary.per_cam_count[slug] ?? 0;
      const tipsTotal = trib?.summary.per_cam_tip_count[slug] ?? 0;
      const tipsLinked = trib?.summary.per_cam_linked_count[slug] ?? 0;

      const physPct = paramsTotal > 0 ? (paramsPhysLinked / paramsTotal) * 100 : 0;
      const actPct = paramsTotal > 0 ? (paramsWithActions / paramsTotal) * 100 : 0;
      const tipPct = tipsTotal > 0 ? (tipsLinked / tipsTotal) * 100 : 0;
      const overall = this.overallScore(physPct, actPct, tipPct);

      reports.push({
        cam_slug: slug,
        params_total: paramsTotal,
        params_physics_linked: paramsPhysLinked,
        params_with_actions: paramsWithActions,
        tips_total: tipsTotal,
        tips_linked: tipsLinked,
        physics_coverage_pct: this.round2(physPct),
        actions_coverage_pct: this.round2(actPct),
        tips_linked_pct: this.round2(tipPct),
        overall_score: this.round2(overall),
      });
    }
    return reports;
  }

  detectRegressions(
    reports: CAMEnrichmentReport[],
    baseline: CAMEnrichmentBaseline,
    driftTol: number
  ): ValidatorRunResult["regressions"] {
    const out: ValidatorRunResult["regressions"] = [];
    for (const r of reports) {
      const base = baseline.per_cam[r.cam_slug];
      if (!base) continue;
      const check = (metric: string, baseVal: number, currentVal: number) => {
        if (baseVal <= 0) return;
        const allowed = baseVal * (1 - driftTol);
        if (currentVal < allowed) {
          out.push({
            cam_slug: r.cam_slug,
            metric,
            baseline: this.round2(baseVal),
            current: this.round2(currentVal),
            delta_pct: this.round2(((currentVal - baseVal) / baseVal) * 100),
          });
        }
      };
      check("physics_coverage_pct", base.physics_coverage_pct, r.physics_coverage_pct);
      check("actions_coverage_pct", base.actions_coverage_pct, r.actions_coverage_pct);
      check("tips_linked_pct", base.tips_linked_pct, r.tips_linked_pct);
      check("overall_score", base.overall_score, r.overall_score);
    }
    return out;
  }

  writeBaseline(reports: CAMEnrichmentReport[], baselinePath: string): CAMEnrichmentBaseline {
    const per_cam: CAMEnrichmentBaseline["per_cam"] = {};
    for (const r of reports) {
      per_cam[r.cam_slug] = {
        physics_coverage_pct: r.physics_coverage_pct,
        actions_coverage_pct: r.actions_coverage_pct,
        tips_linked_pct: r.tips_linked_pct,
        overall_score: r.overall_score,
      };
    }
    const baseline: CAMEnrichmentBaseline = {
      schemaVersion: 1,
      captured_at: new Date().toISOString(),
      per_cam,
    };
    fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
    fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));
    return baseline;
  }

  private overallScore(physPct: number, actPct: number, tipPct: number): number {
    // Weighted: physics is load-bearing (50%), actions 30%, tips 20%.
    return physPct * 0.5 + actPct * 0.3 + tipPct * 0.2;
  }

  private loadJson<T>(p: string): T | null {
    try {
      return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
    } catch {
      return null;
    }
  }

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }
}

export const camCatalogEnrichmentValidator = new CAMCatalogEnrichmentValidator();
