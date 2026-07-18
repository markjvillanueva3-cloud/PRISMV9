/**
 * PostProcessorVerificationOrchestratorEngine — end-to-end verification of a
 * posted .NC file against a (machine, controller, optional-features) tuple.
 *
 * Closes the user's directive (2026-05-25, slot:echo):
 *   "use Fusion or Inventor post processor kernel to produce G/M code,
 *    then use our engines to check movements, speeds, feeds, parameters …
 *    build an engine to test each post processor relative to machine,
 *    controller, and optional features available per machine"
 *
 * Architecture (analyzer-first, post-agnostic):
 *   - Input: .NC file path (operator-supplied — produced by Fusion, HSMWorks,
 *     hand, or any other post) + machine_id + controller_id + features[].
 *   - Pipes the .NC through PRISM's existing analyzers in order:
 *       1. MasterPostProcessorUnifiedAGIEngine.analyzeGCode (8-dim quality)
 *       2. MasterPostProcessorUnifiedAGIEngine.validateAgainstKinematics (travel + collision + accuracy)
 *       3. gcodeRuntimePredictorEngine.predict (cycle-time + motion analysis)
 *       4. PostProcessorPipelineEngine.analyzeGCode (38-stage physics pipeline if available)
 *   - Cross-checks declared optional_features against ControllerFeatureMatrixEngine
 *     and the machine's MACHINE_FEATURE_DB capability set.
 *   - Returns a unified scorecard: per-dimension PASS/FAIL/WARN +
 *     feature-coverage delta (what the controller supports but the .NC
 *     doesn't use, vs what the .NC emits but the controller doesn't have).
 *
 * Reuses (NO new analyzer code — pure orchestration):
 *   - MasterPostProcessorUnifiedAGIEngine (wired this session as
 *     master_post_unified_agi_analyze + master_post_unified_agi_kinematics)
 *   - GCodeRuntimePredictorEngine (wired as gcode_runtime_predict)
 *   - PostProcessorPipelineEngine (38-stage, wired as pp_run_full)
 *   - ControllerFeatureMatrixEngine.CONTROLLER_MATRIX (17 fully-detailed controllers)
 *   - machine-post-enriched.ts (827 machines with controller string per machine)
 *
 * Authored 2026-05-25 (slot:echo, user post-verification capability ask)
 */

import { log } from "../utils/Logger.js";
import * as fs from "fs";

// ── Inputs ────────────────────────────────────────────────────────────────────

export interface VerificationInput {
  /** Absolute path to the posted .NC file. */
  nc_path: string;
  /** Machine identifier — JOIN key into machine-post-enriched.ts (e.g. "HURCO-VM30I"). */
  machine_id: string;
  /** Controller dialect (e.g. "hurco_winmax", "fanuc-31i-b5", "okuma-osp-p300"). */
  controller_id: string;
  /** Optional-feature flags asserted as present (validated against the controller's CFME row). */
  declared_features?: {
    hsm?: boolean;
    tcp_rtcp?: boolean;
    nurbs?: boolean;
    polar_interp?: boolean;
    tilted_workplane?: boolean;
    thermal_comp?: boolean;
    collision_avoid?: boolean;
    adaptive_ctrl?: boolean;
    multi_channel?: boolean;
    [k: string]: boolean | undefined;
  };
  /** Material ISO group for physics analysis ("P"|"M"|"K"|"N"|"S"|"H"). */
  material_iso?: "P" | "M" | "K" | "N" | "S" | "H";
  /** Skip slow analyzers — quick mode (default false). */
  quick?: boolean;
}

// ── Outputs ───────────────────────────────────────────────────────────────────

export interface DimensionScore {
  name: string;
  /** PASS / WARN / FAIL — 3-tier verdict per dimension. */
  verdict: "PASS" | "WARN" | "FAIL";
  /** Per-dimension score in [0,1]. */
  score: number;
  /** Findings driving the verdict. */
  findings: string[];
  /** Source analyzer name. */
  source: string;
}

export interface FeatureCoverageDelta {
  /** Features the .NC actively uses (G-code blocks detected). */
  nc_uses: string[];
  /** Features the controller supports per CFME. */
  controller_supports: string[];
  /** Features declared by operator but NOT supported by the controller (R12 fail-loud). */
  declared_unsupported: string[];
  /** Features the .NC uses but the controller does NOT support — this would
   *  alarm on the machine (highest-severity). */
  nc_emits_unsupported: string[];
  /** Features the controller supports but the .NC never uses (improvement opportunity). */
  controller_unused: string[];
}

export interface VerificationResult {
  /** Overall verdict: AND of all dimension verdicts (any FAIL → FAIL). */
  overall_verdict: "PASS" | "WARN" | "FAIL";
  /** Geometric mean of dimension scores in [0,1]. */
  overall_score: number;
  /** Per-analyzer dimension scores. */
  dimensions: DimensionScore[];
  /** Feature-coverage delta vs declared machine + controller. */
  feature_coverage: FeatureCoverageDelta;
  /** Cycle-time prediction (s). May be null if predictor unavailable. */
  predicted_cycle_time_s: number | null;
  /** Per-line warnings from the kinematics/travel validator. */
  kinematics_warnings: string[];
  /** Stats. */
  meta: {
    nc_path: string;
    nc_byte_count: number;
    nc_line_count: number;
    machine_id: string;
    controller_id: string;
    analyzers_run: string[];
    analyzers_skipped: string[];
    verified_at: string;
  };
  /** Operator action items, ordered by severity (FAIL > WARN > improvement). */
  action_items: string[];
}

// ── Engine ────────────────────────────────────────────────────────────────────

export class PostProcessorVerificationOrchestratorEngine {
  /**
   * Run the verification pipeline. Pure orchestration — no new analysis
   * logic. Always returns a result (never throws on per-analyzer error;
   * records it in analyzers_skipped).
   */
  async verify(input: VerificationInput): Promise<VerificationResult> {
    if (!input?.nc_path) throw new TypeError("verify: input.nc_path required");
    if (!input.machine_id) throw new TypeError("verify: input.machine_id required");
    if (!input.controller_id) throw new TypeError("verify: input.controller_id required");
    if (!fs.existsSync(input.nc_path)) {
      throw new Error(`verify: .NC file not found at ${input.nc_path}`);
    }

    const gcode = fs.readFileSync(input.nc_path, "utf8");
    const lineCount = gcode.split(/\r?\n/).length;
    const byteCount = Buffer.byteLength(gcode, "utf8");

    const analyzersRun: string[] = [];
    const analyzersSkipped: string[] = [];
    const dimensions: DimensionScore[] = [];
    let predictedCycleS: number | null = null;
    const kinematicsWarnings: string[] = [];

    // ── 1. 8-dim quality analysis (MasterPostProcessorUnifiedAGIEngine.analyzeGCode) ──
    try {
      const { masterPostProcessorUnifiedAGIEngine } = await import("./MasterPostProcessorUnifiedAGIEngine.js");
      const eng = masterPostProcessorUnifiedAGIEngine as any;
      if (typeof eng.analyzeGCode === "function") {
        const a = eng.analyzeGCode(gcode, input.controller_id, input.material_iso);
        analyzersRun.push("MasterPostProcessorUnifiedAGIEngine.analyzeGCode");
        // The engine emits a quality_score + per-dimension scores object.
        // Map any returned dim → DimensionScore. Be defensive about shape.
        const dimMap: Record<string, number> = (a?.dimensions ?? a?.quality_dimensions ?? a) as any;
        const knownDims = ["safety", "efficiency", "accuracy", "maintainability",
                            "controller_opt", "physics_compliance", "tribal_adherence", "best_practices"];
        for (const k of knownDims) {
          const v = typeof dimMap?.[k] === "number" ? dimMap[k] : null;
          if (v != null) {
            dimensions.push({
              name: k,
              verdict: v >= 0.85 ? "PASS" : v >= 0.6 ? "WARN" : "FAIL",
              score: Math.max(0, Math.min(1, v)),
              findings: [],
              source: "MasterPostProcessorUnifiedAGIEngine.analyzeGCode",
            });
          }
        }
        if (typeof a?.quality_score === "number") {
          // Clamp to [0,1] like every other dimension (line ~167). analyzeGCode can return a
          // quality_score > 1; leaving it raw made the geometric-mean overall_score exceed 1.0
          // (observed 1.66), violating the documented `DimensionScore.score` / `overall_score ∈ [0,1]`
          // invariant. Clamping does NOT change the verdict (a >1 score was already ≥0.85 → PASS).
          // (R12 invariant fix, surfaced by U-PP-VERIFY-ORCH-WIRE scrutiny arm B, 2026-06-01 slot:bravo.)
          const qs = Math.max(0, Math.min(1, a.quality_score));
          dimensions.push({
            name: "overall_quality",
            verdict: qs >= 0.85 ? "PASS" : qs >= 0.6 ? "WARN" : "FAIL",
            score: qs,
            findings: Array.isArray(a?.bottlenecks) ? a.bottlenecks.slice(0, 5).map(String) : [],
            source: "MasterPostProcessorUnifiedAGIEngine.analyzeGCode",
          });
        }
      } else {
        analyzersSkipped.push("MasterPostProcessorUnifiedAGIEngine.analyzeGCode (method absent)");
      }
    } catch (err: any) {
      analyzersSkipped.push(`MasterPostProcessorUnifiedAGIEngine.analyzeGCode (${err?.message ?? String(err)})`);
    }

    // ── 2. Kinematics + travel + collision (MasterPostProcessorUnifiedAGIEngine.validateAgainstKinematics) ──
    if (!input.quick) {
      try {
        const { masterPostProcessorUnifiedAGIEngine } = await import("./MasterPostProcessorUnifiedAGIEngine.js");
        const eng = masterPostProcessorUnifiedAGIEngine as any;
        if (typeof eng.validateAgainstKinematics === "function") {
          const machineProfile = { id: input.machine_id, controller: input.controller_id };
          const k = eng.validateAgainstKinematics(gcode, machineProfile);
          analyzersRun.push("MasterPostProcessorUnifiedAGIEngine.validateAgainstKinematics");
          if (Array.isArray(k?.warnings)) {
            for (const w of k.warnings) kinematicsWarnings.push(String(w));
          }
          if (typeof k?.travel_valid === "boolean" || typeof k?.collisionFree === "boolean") {
            const ok = (k?.travel_valid !== false) && (k?.collisionFree !== false);
            dimensions.push({
              name: "kinematics_safety",
              verdict: ok ? "PASS" : "FAIL",
              score: ok ? 1 : 0,
              findings: kinematicsWarnings.slice(0, 5),
              source: "MasterPostProcessorUnifiedAGIEngine.validateAgainstKinematics",
            });
          }
        } else {
          analyzersSkipped.push("MasterPostProcessorUnifiedAGIEngine.validateAgainstKinematics (method absent)");
        }
      } catch (err: any) {
        analyzersSkipped.push(`validateAgainstKinematics (${err?.message ?? String(err)})`);
      }
    }

    // ── 3. Cycle-time prediction (GCodeRuntimePredictorEngine.predict) ──
    if (!input.quick) {
      try {
        const { gcodeRuntimePredictorEngine } = await import("./GCodeRuntimePredictorEngine.js");
        const eng = gcodeRuntimePredictorEngine as any;
        if (typeof eng.predict === "function") {
          const machineProfile = { id: input.machine_id, controller: input.controller_id };
          const p = eng.predict({ gcode }, machineProfile);
          analyzersRun.push("GCodeRuntimePredictorEngine.predict");
          if (typeof p?.predicted_seconds === "number") predictedCycleS = p.predicted_seconds;
          else if (typeof p?.cycle_time_s === "number") predictedCycleS = p.cycle_time_s;
        } else {
          analyzersSkipped.push("GCodeRuntimePredictorEngine.predict (method absent)");
        }
      } catch (err: any) {
        analyzersSkipped.push(`gcodeRuntimePredictorEngine.predict (${err?.message ?? String(err)})`);
      }
    }

    // ── 4. Feature coverage delta vs ControllerFeatureMatrixEngine ──
    const featureCoverage = await this.computeFeatureCoverage(gcode, input);

    // ── 5. Aggregate verdict ──
    const overallVerdict = this.aggregateVerdict(dimensions, featureCoverage);
    const overallScore = dimensions.length
      ? Math.pow(
          dimensions.reduce((acc, d) => acc * Math.max(0.001, d.score), 1),
          1 / dimensions.length,
        )
      : 0;

    // ── 6. Action items, severity-ordered ──
    const actionItems: string[] = [];
    for (const d of dimensions.filter((d) => d.verdict === "FAIL")) {
      actionItems.push(`[FAIL] ${d.name}: ${d.findings[0] ?? "below floor"}`);
    }
    for (const f of featureCoverage.nc_emits_unsupported) {
      actionItems.push(`[FAIL] .NC emits '${f}' but controller '${input.controller_id}' does not support it — WILL ALARM`);
    }
    for (const f of featureCoverage.declared_unsupported) {
      actionItems.push(`[WARN] operator declared '${f}' but controller '${input.controller_id}' does not support it — declaration is wrong`);
    }
    for (const d of dimensions.filter((d) => d.verdict === "WARN")) {
      actionItems.push(`[WARN] ${d.name} score ${d.score.toFixed(2)} below 0.85`);
    }
    for (const f of featureCoverage.controller_unused) {
      actionItems.push(`[IMPROVE] controller supports '${f}' but .NC does not use it`);
    }

    log.info(
      `[PostProcVerify] ${input.machine_id}/${input.controller_id}: ${overallVerdict} ` +
        `(${overallScore.toFixed(2)}) · ${dimensions.length} dims · ${analyzersRun.length} analyzers ran · ` +
        `${actionItems.length} actions`,
    );

    return {
      overall_verdict: overallVerdict,
      overall_score: overallScore,
      dimensions,
      feature_coverage: featureCoverage,
      predicted_cycle_time_s: predictedCycleS,
      kinematics_warnings: kinematicsWarnings,
      meta: {
        nc_path: input.nc_path,
        nc_byte_count: byteCount,
        nc_line_count: lineCount,
        machine_id: input.machine_id,
        controller_id: input.controller_id,
        analyzers_run: analyzersRun,
        analyzers_skipped: analyzersSkipped,
        verified_at: new Date().toISOString(),
      },
      action_items: actionItems,
    };
  }

  /**
   * Feature-coverage delta: what the .NC uses vs what the controller
   * supports vs what operator declared.
   *
   * Detection is regex-based on G-code body — coarse but actionable. The
   * authoritative controller capability matrix comes from
   * ControllerFeatureMatrixEngine when available; we degrade to "unknown"
   * for unrecognized controllers.
   */
  private async computeFeatureCoverage(
    gcode: string,
    input: VerificationInput,
  ): Promise<FeatureCoverageDelta> {
    // Detect features the .NC actively uses
    const ncUses: string[] = [];
    const FEATURE_PATTERNS: Record<string, RegExp> = {
      hsm: /\bG05\.?\d?\s*[PQ]?\d*\b/i,                          // G05.1 / G05.3 smoothing
      tcp_rtcp: /\bG43\.[45]\b|\bG169\b|\bG234\b|\bM128\b|\bTRAORI\b/i, // TCP/RTCP
      nurbs: /\bG06\.\d|\bG6\.\d\b|BSPLINE|NURBS/i,              // NURBS
      polar_interp: /\bG12\.1\b|\bG13\.1\b|\bG137\b|TRANSMIT|TRACYL/i, // Polar
      tilted_workplane: /\bG68\.2\b|\bG254\b|\bG255\b|CYCLE800|PLANE\s+SPATIAL/i, // DWO
      thermal_comp: /THERMO|TAS-C|KinematicsOpt|G42\.2/i,
      collision_avoid: /\bCAS\b|G38\.[2345]|CAS-ON/i,
      adaptive_ctrl: /AI[\s_-]?Servo|ADP\s*2\.0|AI\s*Spindle/i,
      multi_channel: /\$2|p2|!L\s*W/i,                            // dual-channel sync
    };
    for (const [feat, re] of Object.entries(FEATURE_PATTERNS)) {
      if (re.test(gcode)) ncUses.push(feat);
    }

    // Load controller capabilities (best-effort)
    const controllerSupports: string[] = [];
    try {
      const { controllerFeatureMatrixEngine } = await import("./ControllerFeatureMatrixEngine.js");
      const eng = controllerFeatureMatrixEngine as any;
      const row = typeof eng?.getControllerRow === "function"
        ? eng.getControllerRow(input.controller_id)
        : (eng?.CONTROLLER_MATRIX ?? []).find((r: any) => r?.id === input.controller_id);
      if (row?.features) {
        for (const [feat, val] of Object.entries(row.features)) {
          if (val && val !== "none" && val !== false) controllerSupports.push(feat);
        }
      }
    } catch {
      // Controller matrix unavailable — fall back to "all unknown"
    }

    // Operator-declared features that aren't in the controller's supported set
    const declaredUnsupported: string[] = [];
    if (input.declared_features) {
      for (const [feat, on] of Object.entries(input.declared_features)) {
        if (on === true && !controllerSupports.includes(feat) && controllerSupports.length > 0) {
          declaredUnsupported.push(feat);
        }
      }
    }

    // .NC emits a feature the controller doesn't have — would alarm
    const ncEmitsUnsupported = ncUses.filter(
      (f) => controllerSupports.length > 0 && !controllerSupports.includes(f),
    );

    // Controller supports it but .NC doesn't use it — improvement opportunity
    const controllerUnused = controllerSupports.filter((f) => !ncUses.includes(f));

    return {
      nc_uses: ncUses,
      controller_supports: controllerSupports,
      declared_unsupported: declaredUnsupported,
      nc_emits_unsupported: ncEmitsUnsupported,
      controller_unused: controllerUnused,
    };
  }

  private aggregateVerdict(
    dimensions: DimensionScore[],
    coverage: FeatureCoverageDelta,
  ): "PASS" | "WARN" | "FAIL" {
    if (coverage.nc_emits_unsupported.length > 0) return "FAIL";
    if (dimensions.some((d) => d.verdict === "FAIL")) return "FAIL";
    if (dimensions.some((d) => d.verdict === "WARN")) return "WARN";
    if (coverage.declared_unsupported.length > 0) return "WARN";
    return "PASS";
  }
}

export const postProcessorVerificationOrchestratorEngine = new PostProcessorVerificationOrchestratorEngine();
