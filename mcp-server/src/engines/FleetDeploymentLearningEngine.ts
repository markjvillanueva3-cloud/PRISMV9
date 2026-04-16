/**
 * PRISM Manufacturing Intelligence - Fleet Deployment & Continuous Learning Engine
 * POST-ULT-MS17: Deploy and manage posts across a multi-machine shop floor.
 *                Learn from real results. Consolidates MS17 U01–U05.
 *
 * Units:
 *   U01 FleetPostSynchronizer    — Track post versions, flag machines for update, generate priority plan
 *   U02 PostChangeImpactAnalyzer — When post/physics model changes, find affected programs & rank by impact
 *   U03 ShopStandardEnforcer     — Define and enforce shop-wide G-code and pipeline standards
 *   U04 ShopFeedbackLoop         — Ingest operator feedback; calibrate physics models from real data
 *   U05 PredictivePostOptimizer  — Use historical job data to predict optimal config for new jobs
 *
 * Actions: fleet_status, generate_update_plan, check_standards, ingest_feedback,
 *          get_prediction, calibration_report, fleet_summary
 *
 * @version 1.0.0  POST-ULT-MS17
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// PUBLIC TYPES
// ============================================================================

/** A physical CNC machine registered in the fleet. */
export interface FleetMachine {
  serial: string;
  brand: string;
  model: string;
  controller: string;
  current_post_version: string;
  last_updated: string;
  options: Record<string, boolean>;
  programs_posted: number;
  status: "current" | "update_available" | "outdated" | "custom";
}

/** Prioritized update plan for machines that need new post versions. */
export interface UpdatePlan {
  machines_to_update: Array<{
    serial: string;
    current_version: string;
    target_version: string;
    priority: "high" | "medium" | "low";
    reason: string;
    estimated_improvement: string;
    affected_programs: number;
  }>;
  total_machines: number;
  up_to_date: number;
  needing_update: number;
}

/** A shop-wide G-code or pipeline standard rule. */
export interface ShopStandard {
  name: string;
  rule: string;
  applies_to: string; // "all" | controller family | machine type
  severity: "mandatory" | "recommended" | "optional";
  check: (gcode: string, config: any) => { passed: boolean; violations: string[] };
}

/** A single piece of operator feedback for calibration. */
export interface FeedbackEntry {
  machine_serial: string;
  program_id: string;
  date: string;
  type:
    | "cycle_time"
    | "tool_life"
    | "surface_finish"
    | "operator_edit"
    | "scrap"
    | "rework";
  predicted_value?: number;
  actual_value?: number;
  delta_percent?: number;
  operator_notes?: string;
  changes_made?: string[];
}

/** A prediction record for an upcoming job. */
export interface PredictionRecord {
  job_id: string;
  material: string;
  machine: string;
  recommended_tier: number;
  recommended_aggressiveness: number;
  recommended_machine?: string;
  confidence: number;
  basis: string[]; // what historical data supported this
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

interface PostVersion {
  version: string;
  released: string;
  changes: string[];
  affected_controllers: string[];
  physics_models_updated: string[];
  safety_critical: boolean;
}

interface ProgramRecord {
  program_id: string;
  machine_serial: string;
  material: string;
  operation: string;
  posted_with_version: string;
  posted_date: string;
  predicted_cycle_time_sec: number;
  predicted_tool_life_min: number;
  physics_tier: number;
  aggressiveness: number;
  tolerance_class: "rough" | "semi" | "finish" | "precision";
}

interface CalibrationModel {
  machine_serial: string;
  material: string;
  cycle_time_bias: number;   // ratio: actual / predicted (1.0 = perfect)
  tool_life_bias: number;
  surface_finish_bias: number;
  sample_count: number;
  last_updated: string;
  confidence: number;
}

interface JobHistoryRecord {
  job_id: string;
  material: string;
  machine_serial: string;
  physics_tier: number;
  aggressiveness: number;
  outcome_score: number; // 0–100, composite of cycle time accuracy, tool life, finish
  tolerance_class: string;
  date: string;
}

// ============================================================================
// BUILT-IN SHOP STANDARDS
// ============================================================================

const BUILTIN_STANDARDS: ShopStandard[] = [
  {
    name: "safe_start_block",
    rule: "Every program must begin with G17 G20/G21 G40 G49 G80 G90 (or controller equivalent cancel block)",
    applies_to: "all",
    severity: "mandatory",
    check: (gcode) => {
      const lines = gcode.split("\n").slice(0, 15).join(" ").toUpperCase();
      const hasG40 = lines.includes("G40");
      const hasG49 = lines.includes("G49");
      const hasG80 = lines.includes("G80");
      const violations: string[] = [];
      if (!hasG40) violations.push("Missing G40 (cutter comp cancel) in first 15 lines");
      if (!hasG49) violations.push("Missing G49 (tool length comp cancel) in first 15 lines");
      if (!hasG80) violations.push("Missing G80 (canned cycle cancel) in first 15 lines");
      return { passed: violations.length === 0, violations };
    },
  },
  {
    name: "program_header_comment",
    rule: "Program must contain header comment with: program name, date, machine, material",
    applies_to: "all",
    severity: "mandatory",
    check: (gcode) => {
      const header = gcode.split("\n").slice(0, 20).join("\n").toLowerCase();
      const violations: string[] = [];
      if (!/prog(ram)?[\s_-]?(name|no|num|#)?[\s:=]/.test(header) && !/o\d{4}/.test(header))
        violations.push("No program name/number found in header");
      if (!/date[\s:=]|\d{4}[-/]\d{2}[-/]\d{2}/.test(header))
        violations.push("No date found in header comment");
      if (!/machine|mill|lathe|cnc/.test(header))
        violations.push("No machine reference in header comment");
      if (!/material|mat[\s:=]|aluminum|steel|titanium|inconel|brass|plastic/.test(header))
        violations.push("No material reference in header comment");
      return { passed: violations.length === 0, violations };
    },
  },
  {
    name: "no_experimental_codes",
    rule: "Programs must not use G codes outside the approved subset",
    applies_to: "all",
    severity: "mandatory",
    check: (gcode, config) => {
      const approved: string[] = config?.approved_gcodes ?? [
        "G0","G00","G1","G01","G2","G02","G3","G03",
        "G4","G04","G10","G17","G18","G19",
        "G20","G21","G28","G30","G40","G41","G42",
        "G43","G44","G49","G54","G55","G56","G57","G58","G59",
        "G65","G68","G69","G73","G74","G76","G80","G81","G82",
        "G83","G84","G85","G86","G87","G88","G89","G90","G91",
        "G92","G94","G95","G96","G97","G98","G99",
        "M0","M1","M2","M3","M4","M5","M6","M8","M9","M19","M30",
        "M48","M49","M98","M99",
      ];
      const seen = new Set<string>();
      const violations: string[] = [];
      for (const line of gcode.split("\n")) {
        const matches = line.toUpperCase().match(/[GM]\d+/g) ?? [];
        for (const code of matches) {
          if (!seen.has(code) && !approved.includes(code)) {
            violations.push(`Non-approved code: ${code}`);
            seen.add(code);
          }
        }
      }
      return { passed: violations.length === 0, violations };
    },
  },
  {
    name: "minimum_physics_tier",
    rule: "All production programs must specify physics pipeline Tier 2 or higher",
    applies_to: "production",
    severity: "mandatory",
    check: (_gcode, config) => {
      const tier = config?.physics_tier ?? 0;
      const minTier = config?.min_required_tier ?? 2;
      const violations: string[] = [];
      if (tier < minTier)
        violations.push(`Physics tier ${tier} is below minimum required tier ${minTier}`);
      return { passed: violations.length === 0, violations };
    },
  },
  {
    name: "max_aggressiveness",
    rule: "Aggressiveness must not exceed machine class limit",
    applies_to: "all",
    severity: "mandatory",
    check: (_gcode, config) => {
      const agg = config?.aggressiveness ?? 0;
      const limit = config?.max_aggressiveness ?? 0.8;
      const violations: string[] = [];
      if (agg > limit)
        violations.push(
          `Aggressiveness ${agg.toFixed(2)} exceeds machine class limit ${limit.toFixed(2)}`
        );
      return { passed: violations.length === 0, violations };
    },
  },
  {
    name: "coolant_required_production",
    rule: "Flood or TSC coolant must be active on production programs (not dry/mist-only)",
    applies_to: "production",
    severity: "recommended",
    check: (gcode) => {
      const upper = gcode.toUpperCase();
      const hasFlood = upper.includes("M8");
      const hasTSC = upper.includes("M88") || upper.includes("M7 M8") || upper.includes("TSC");
      const violations: string[] = [];
      if (!hasFlood && !hasTSC)
        violations.push("No flood (M8) or TSC coolant found — recommended for production");
      return { passed: violations.length === 0, violations };
    },
  },
  {
    name: "program_end_block",
    rule: "Program must end with M30 or M2 (or M99 for subprograms)",
    applies_to: "all",
    severity: "mandatory",
    check: (gcode) => {
      const tail = gcode.split("\n").slice(-10).join(" ").toUpperCase();
      const hasEnd = tail.includes("M30") || tail.includes("M2") || tail.includes("M99");
      const violations: string[] = [];
      if (!hasEnd) violations.push("No M30/M2/M99 found in last 10 lines");
      return { passed: violations.length === 0, violations };
    },
  },
];

// ============================================================================
// U01 — FLEET POST SYNCHRONIZER
// ============================================================================

class FleetPostSynchronizer {
  private fleet: Map<string, FleetMachine> = new Map();
  private versions: Map<string, PostVersion> = new Map();
  private latestVersion = "1.0.0";

  registerMachine(machine: FleetMachine): void {
    this.fleet.set(machine.serial, { ...machine });
  }

  registerVersion(version: PostVersion): void {
    this.versions.set(version.version, version);
    // Determine if this is newer than current latest
    if (this._versionGt(version.version, this.latestVersion)) {
      this.latestVersion = version.version;
    }
  }

  /** Compare semver strings — returns true if a > b. */
  private _versionGt(a: string, b: string): boolean {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
      if ((pa[i] ?? 0) > (pb[i] ?? 0)) return true;
      if ((pa[i] ?? 0) < (pb[i] ?? 0)) return false;
    }
    return false;
  }

  private _versionLt(a: string, b: string): boolean {
    return this._versionGt(b, a);
  }

  private _getMachineStatus(machine: FleetMachine): FleetMachine["status"] {
    if (machine.status === "custom") return "custom";
    if (machine.current_post_version === this.latestVersion) return "current";
    // Determine how far behind
    const delta = this._versionDistance(machine.current_post_version, this.latestVersion);
    if (delta >= 3) return "outdated";
    return "update_available";
  }

  /** Count major.minor.patch steps between two versions (simplified). */
  private _versionDistance(from: string, to: string): number {
    const pf = from.split(".").map(Number);
    const pt = to.split(".").map(Number);
    return (
      Math.abs((pt[0] ?? 0) - (pf[0] ?? 0)) * 100 +
      Math.abs((pt[1] ?? 0) - (pf[1] ?? 0)) * 10 +
      Math.abs((pt[2] ?? 0) - (pf[2] ?? 0))
    );
  }

  getFleetStatus(): {
    machines: FleetMachine[];
    latest_version: string;
    summary: { current: number; update_available: number; outdated: number; custom: number };
  } {
    const machines: FleetMachine[] = [];
    const summary = { current: 0, update_available: 0, outdated: 0, custom: 0 };

    for (const machine of this.fleet.values()) {
      const status = this._getMachineStatus(machine);
      const updated = { ...machine, status };
      machines.push(updated);
      summary[status]++;
    }

    return { machines, latest_version: this.latestVersion, summary };
  }

  generateUpdatePlan(programs: ProgramRecord[]): UpdatePlan {
    const toUpdate: UpdatePlan["machines_to_update"] = [];
    let upToDate = 0;

    for (const machine of this.fleet.values()) {
      const status = this._getMachineStatus(machine);
      if (status === "current" || status === "custom") {
        upToDate++;
        continue;
      }

      // Count affected programs
      const affected = programs.filter(
        (p) =>
          p.machine_serial === machine.serial &&
          this._versionLt(p.posted_with_version, this.latestVersion)
      ).length;

      // Determine if any safety-critical versions exist between current and latest
      let safetyCritical = false;
      let reasons: string[] = [];
      for (const [ver, info] of this.versions.entries()) {
        if (
          this._versionGt(ver, machine.current_post_version) &&
          !this._versionGt(ver, this.latestVersion)
        ) {
          if (info.safety_critical) safetyCritical = true;
          reasons = reasons.concat(info.changes.slice(0, 2));
        }
      }

      const delta = this._versionDistance(machine.current_post_version, this.latestVersion);
      const priority: "high" | "medium" | "low" = safetyCritical
        ? "high"
        : delta >= 2
        ? "medium"
        : "low";

      const estimatedImprovement =
        safetyCritical
          ? "Safety-critical fix applied"
          : delta >= 5
          ? "~5-15% cycle time improvement expected"
          : delta >= 2
          ? "~2-8% cycle time improvement expected"
          : "Minor refinements";

      toUpdate.push({
        serial: machine.serial,
        current_version: machine.current_post_version,
        target_version: this.latestVersion,
        priority,
        reason: reasons.length ? reasons.join("; ") : "Newer post version available",
        estimated_improvement: estimatedImprovement,
        affected_programs: affected,
      });
    }

    // Sort: high → medium → low, then by affected_programs descending
    toUpdate.sort((a, b) => {
      const pOrder = { high: 0, medium: 1, low: 2 };
      const pd = pOrder[a.priority] - pOrder[b.priority];
      if (pd !== 0) return pd;
      return b.affected_programs - a.affected_programs;
    });

    return {
      machines_to_update: toUpdate,
      total_machines: this.fleet.size,
      up_to_date: upToDate,
      needing_update: toUpdate.length,
    };
  }
}

// ============================================================================
// U02 — POST CHANGE IMPACT ANALYZER
// ============================================================================

class PostChangeImpactAnalyzer {
  analyzeImpact(
    programs: ProgramRecord[],
    changeDescription: {
      changed_component: "post" | "physics_model";
      component_name: string;
      affected_controllers?: string[];
      affected_materials?: string[];
      change_type: "safety" | "accuracy" | "performance" | "format";
      improvement_estimate?: {
        cycle_time_pct?: number;
        tool_life_pct?: number;
        surface_finish_pct?: number;
      };
    }
  ): {
    affected_programs: Array<{
      program_id: string;
      machine_serial: string;
      material: string;
      operation: string;
      impact_score: number;
      priority_rank: number;
      cycle_time_savings_sec?: number;
      safety_improvement: boolean;
      quality_improvement: boolean;
      recommendation: string;
    }>;
    total_affected: number;
    total_potential_cycle_time_savings_sec: number;
    summary: string;
  } {
    const { changed_component, affected_controllers, affected_materials, change_type, improvement_estimate } =
      changeDescription;

    // Filter programs impacted by this change
    const impacted = programs.filter((p) => {
      if (affected_controllers && changed_component === "post") return true; // simplified — controller matching would need machine lookup
      if (affected_materials && affected_materials.length > 0)
        return affected_materials.includes(p.material);
      return true; // broad change
    });

    const ctPct = improvement_estimate?.cycle_time_pct ?? 0;
    const safetyChange = change_type === "safety";
    const qualityChange =
      change_type === "accuracy" ||
      (improvement_estimate?.surface_finish_pct ?? 0) > 0;

    let totalSavings = 0;
    const results = impacted.map((p) => {
      const cycleSavingsSec = ctPct > 0 ? (p.predicted_cycle_time_sec * ctPct) / 100 : 0;
      totalSavings += cycleSavingsSec;

      // Composite impact score: safety=50pts, quality=30pts, cycle_time=20pts
      let score = 0;
      if (safetyChange) score += 50;
      if (qualityChange) score += 30 * Math.min(1, (improvement_estimate?.surface_finish_pct ?? 0) / 20);
      if (ctPct > 0) score += 20 * Math.min(1, ctPct / 10);
      // Boost high-tolerance programs
      if (p.tolerance_class === "precision") score *= 1.4;
      else if (p.tolerance_class === "finish") score *= 1.2;

      const recommendation = safetyChange
        ? "Re-post immediately — safety-critical update"
        : cycleSavingsSec > 120
        ? `Re-post for ~${Math.round(cycleSavingsSec / 60)} min cycle time savings`
        : qualityChange
        ? "Re-post to improve surface finish / dimensional accuracy"
        : "Re-post during next scheduled maintenance window";

      return {
        program_id: p.program_id,
        machine_serial: p.machine_serial,
        material: p.material,
        operation: p.operation,
        impact_score: Math.round(score),
        priority_rank: 0, // filled below
        cycle_time_savings_sec: cycleSavingsSec > 0 ? Math.round(cycleSavingsSec) : undefined,
        safety_improvement: safetyChange,
        quality_improvement: qualityChange,
        recommendation,
      };
    });

    // Rank by impact score descending
    results.sort((a, b) => b.impact_score - a.impact_score);
    results.forEach((r, i) => (r.priority_rank = i + 1));

    const summaryParts: string[] = [`${results.length} programs affected by ${changeDescription.component_name} change.`];
    if (safetyChange) summaryParts.push("SAFETY-CRITICAL — immediate re-post required.");
    if (totalSavings > 0)
      summaryParts.push(
        `Total potential cycle time savings: ${Math.round(totalSavings / 60)} min across all programs.`
      );

    return {
      affected_programs: results,
      total_affected: results.length,
      total_potential_cycle_time_savings_sec: Math.round(totalSavings),
      summary: summaryParts.join(" "),
    };
  }
}

// ============================================================================
// U03 — SHOP STANDARD ENFORCER
// ============================================================================

class ShopStandardEnforcer {
  private customStandards: ShopStandard[] = [];

  addCustomStandard(standard: ShopStandard): void {
    // Replace existing if same name
    const idx = this.customStandards.findIndex((s) => s.name === standard.name);
    if (idx >= 0) this.customStandards[idx] = standard;
    else this.customStandards.push(standard);
  }

  getAllStandards(): ShopStandard[] {
    return [...BUILTIN_STANDARDS, ...this.customStandards];
  }

  checkStandards(
    gcode: string,
    config: {
      machine_type?: string;
      controller_family?: string;
      physics_tier?: number;
      min_required_tier?: number;
      aggressiveness?: number;
      max_aggressiveness?: number;
      approved_gcodes?: string[];
      is_production?: boolean;
    }
  ): {
    passed: boolean;
    total_checks: number;
    passed_checks: number;
    failed_mandatory: number;
    failed_recommended: number;
    results: Array<{
      standard: string;
      severity: ShopStandard["severity"];
      passed: boolean;
      violations: string[];
    }>;
    score: number; // 0–100
    verdict: string;
  } {
    const standards = this.getAllStandards();
    const results: Array<{
      standard: string;
      severity: ShopStandard["severity"];
      passed: boolean;
      violations: string[];
    }> = [];

    let failedMandatory = 0;
    let failedRecommended = 0;
    let passedCount = 0;

    for (const standard of standards) {
      // Skip standards not applicable to this machine/context
      if (
        standard.applies_to !== "all" &&
        standard.applies_to === "production" &&
        !config.is_production
      ) {
        continue;
      }

      const result = standard.check(gcode, config);
      results.push({
        standard: standard.name,
        severity: standard.severity,
        passed: result.passed,
        violations: result.violations,
      });

      if (result.passed) {
        passedCount++;
      } else {
        if (standard.severity === "mandatory") failedMandatory++;
        else if (standard.severity === "recommended") failedRecommended++;
      }
    }

    const total = results.length;
    const score =
      total === 0
        ? 100
        : Math.round(
            ((passedCount - failedRecommended * 0.3) / total) * 100
          );

    const overallPassed = failedMandatory === 0;
    const verdict = overallPassed
      ? failedRecommended === 0
        ? "PASS — all standards met"
        : `PASS with warnings — ${failedRecommended} recommended standard(s) not met`
      : `FAIL — ${failedMandatory} mandatory standard(s) violated`;

    return {
      passed: overallPassed,
      total_checks: total,
      passed_checks: passedCount,
      failed_mandatory: failedMandatory,
      failed_recommended: failedRecommended,
      results,
      score: Math.max(0, Math.min(100, score)),
      verdict,
    };
  }
}

// ============================================================================
// U04 — SHOP FEEDBACK LOOP
// ============================================================================

class ShopFeedbackLoop {
  private feedback: FeedbackEntry[] = [];
  private calibrationModels: Map<string, CalibrationModel> = new Map();

  ingestFeedback(entry: FeedbackEntry): {
    accepted: boolean;
    calibration_updated: boolean;
    model_key: string;
    new_bias?: { cycle_time?: number; tool_life?: number; surface_finish?: number };
    message: string;
  } {
    // Compute delta if not provided
    if (
      entry.predicted_value != null &&
      entry.actual_value != null &&
      entry.delta_percent == null
    ) {
      entry.delta_percent =
        entry.predicted_value !== 0
          ? ((entry.actual_value - entry.predicted_value) / entry.predicted_value) * 100
          : 0;
    }

    this.feedback.push(entry);

    const modelKey = `${entry.machine_serial}::${this._inferMaterial(entry)}`;
    let model = this.calibrationModels.get(modelKey);
    if (!model) {
      model = {
        machine_serial: entry.machine_serial,
        material: this._inferMaterial(entry),
        cycle_time_bias: 1.0,
        tool_life_bias: 1.0,
        surface_finish_bias: 1.0,
        sample_count: 0,
        last_updated: entry.date,
        confidence: 0,
      };
    }

    let calibrationUpdated = false;
    const newBias: { cycle_time?: number; tool_life?: number; surface_finish?: number } = {};

    if (
      entry.predicted_value != null &&
      entry.actual_value != null &&
      entry.predicted_value !== 0
    ) {
      const ratio = entry.actual_value / entry.predicted_value;
      const alpha = 1 / (model.sample_count + 1); // exponential decay weight

      switch (entry.type) {
        case "cycle_time":
          model.cycle_time_bias = model.cycle_time_bias * (1 - alpha) + ratio * alpha;
          newBias.cycle_time = Math.round(model.cycle_time_bias * 1000) / 1000;
          calibrationUpdated = true;
          break;
        case "tool_life":
          model.tool_life_bias = model.tool_life_bias * (1 - alpha) + ratio * alpha;
          newBias.tool_life = Math.round(model.tool_life_bias * 1000) / 1000;
          calibrationUpdated = true;
          break;
        case "surface_finish":
          model.surface_finish_bias = model.surface_finish_bias * (1 - alpha) + ratio * alpha;
          newBias.surface_finish = Math.round(model.surface_finish_bias * 1000) / 1000;
          calibrationUpdated = true;
          break;
      }

      model.sample_count++;
      model.last_updated = entry.date;
      model.confidence = Math.min(0.99, model.sample_count / 20); // plateaus at 20 samples
      this.calibrationModels.set(modelKey, model);
    }

    const message = calibrationUpdated
      ? `Feedback ingested. Calibration model updated (${model.sample_count} samples, confidence ${(model.confidence * 100).toFixed(1)}%).`
      : `Feedback ingested (${entry.type}). No numeric calibration update — qualitative record stored.`;

    return {
      accepted: true,
      calibration_updated: calibrationUpdated,
      model_key: modelKey,
      new_bias: Object.keys(newBias).length ? newBias : undefined,
      message,
    };
  }

  private _inferMaterial(entry: FeedbackEntry): string {
    // Material could be embedded in program_id or notes; default to "unknown"
    const notes = (entry.operator_notes ?? "").toLowerCase();
    for (const mat of ["aluminum", "steel", "titanium", "inconel", "brass", "copper", "plastic", "composite"]) {
      if (notes.includes(mat)) return mat;
    }
    return "unknown";
  }

  getCalibrationReport(): {
    models: CalibrationModel[];
    total_feedback_entries: number;
    entries_by_type: Record<string, number>;
    machines_calibrated: number;
    overall_accuracy: { cycle_time: number; tool_life: number; surface_finish: number };
    anomalies: string[];
  } {
    const models = Array.from(this.calibrationModels.values());
    const byType: Record<string, number> = {};
    for (const f of this.feedback) {
      byType[f.type] = (byType[f.type] ?? 0) + 1;
    }

    // Average bias across all models (1.0 = perfect)
    const avgBias = (key: keyof Pick<CalibrationModel, "cycle_time_bias" | "tool_life_bias" | "surface_finish_bias">) => {
      if (models.length === 0) return 1.0;
      return models.reduce((sum, m) => sum + m[key], 0) / models.length;
    };

    const ctBias = avgBias("cycle_time_bias");
    const tlBias = avgBias("tool_life_bias");
    const sfBias = avgBias("surface_finish_bias");

    // Anomaly detection: bias > 1.3 or < 0.7 flags systematic over/underestimation
    const anomalies: string[] = [];
    for (const model of models) {
      const key = `${model.machine_serial}/${model.material}`;
      if (model.cycle_time_bias > 1.3)
        anomalies.push(`${key}: cycle time UNDERESTIMATED by ~${Math.round((model.cycle_time_bias - 1) * 100)}% — physics model too optimistic`);
      if (model.cycle_time_bias < 0.7)
        anomalies.push(`${key}: cycle time OVERESTIMATED by ~${Math.round((1 - model.cycle_time_bias) * 100)}% — physics model too conservative`);
      if (model.tool_life_bias > 1.4)
        anomalies.push(`${key}: tool life UNDERESTIMATED by ~${Math.round((model.tool_life_bias - 1) * 100)}% — verify insert grades`);
      if (model.tool_life_bias < 0.6)
        anomalies.push(`${key}: tool life OVERESTIMATED by ~${Math.round((1 - model.tool_life_bias) * 100)}% — excessive wear; check coolant/speeds`);
    }

    return {
      models,
      total_feedback_entries: this.feedback.length,
      entries_by_type: byType,
      machines_calibrated: new Set(models.map((m) => m.machine_serial)).size,
      overall_accuracy: {
        cycle_time: Math.round((1 - Math.abs(ctBias - 1)) * 100),
        tool_life: Math.round((1 - Math.abs(tlBias - 1)) * 100),
        surface_finish: Math.round((1 - Math.abs(sfBias - 1)) * 100),
      },
      anomalies,
    };
  }

  getCalibrationModel(machineSerial: string, material: string): CalibrationModel | undefined {
    return this.calibrationModels.get(`${machineSerial}::${material}`);
  }

  getAllFeedback(): FeedbackEntry[] {
    return [...this.feedback];
  }
}

// ============================================================================
// U05 — PREDICTIVE POST OPTIMIZER
// ============================================================================

/** Material → physics tier affinity table. Higher toughness = higher tier needed. */
const MATERIAL_TIER_MAP: Record<string, { base_tier: number; base_agg: number; label: string }> = {
  aluminum:   { base_tier: 1, base_agg: 0.75, label: "Aluminum alloy" },
  brass:      { base_tier: 1, base_agg: 0.70, label: "Brass/Bronze" },
  copper:     { base_tier: 1, base_agg: 0.65, label: "Copper" },
  plastic:    { base_tier: 1, base_agg: 0.80, label: "Engineering plastic" },
  composite:  { base_tier: 2, base_agg: 0.55, label: "CFRP/Composite" },
  steel:      { base_tier: 2, base_agg: 0.60, label: "Carbon/Alloy steel" },
  stainless:  { base_tier: 2, base_agg: 0.50, label: "Stainless steel" },
  cast_iron:  { base_tier: 2, base_agg: 0.60, label: "Cast iron" },
  titanium:   { base_tier: 3, base_agg: 0.40, label: "Titanium alloy" },
  inconel:    { base_tier: 4, base_agg: 0.30, label: "Inconel/Superalloy" },
  hardened:   { base_tier: 4, base_agg: 0.25, label: "Hardened steel" },
};

/** Tolerance class → aggressiveness ceiling */
const TOLERANCE_AGG_MAP: Record<string, number> = {
  rough:     0.95,
  semi:      0.75,
  finish:    0.55,
  precision: 0.35,
};

class PredictivePostOptimizer {
  private history: JobHistoryRecord[] = [];
  private predictionLog: PredictionRecord[] = [];

  recordJobOutcome(record: JobHistoryRecord): void {
    this.history.push(record);
  }

  predict(request: {
    job_id: string;
    material: string;
    tolerance_class?: "rough" | "semi" | "finish" | "precision";
    available_machines?: FleetMachine[];
    current_machine?: string;
  }): PredictionRecord {
    const { job_id, material, tolerance_class = "semi", available_machines, current_machine } = request;
    const matKey = material.toLowerCase().replace(/[^a-z_]/g, "");
    const matInfo = MATERIAL_TIER_MAP[matKey] ?? { base_tier: 2, base_agg: 0.55, label: material };
    const tolCeiling = TOLERANCE_AGG_MAP[tolerance_class] ?? 0.65;

    let tier = matInfo.base_tier;
    let agg = Math.min(matInfo.base_agg, tolCeiling);
    const basis: string[] = [`Base: ${matInfo.label} → Tier ${tier}, agg ≤ ${tolCeiling}`];

    // Pull relevant historical jobs
    const relevantHistory = this.history.filter(
      (h) => h.material.toLowerCase() === matKey && h.tolerance_class === tolerance_class
    );

    if (relevantHistory.length > 0) {
      // Find best-scoring tier and aggressiveness combos
      const sorted = [...relevantHistory].sort((a, b) => b.outcome_score - a.outcome_score);
      const top = sorted.slice(0, Math.min(5, sorted.length));
      const avgTier = top.reduce((s, h) => s + h.physics_tier, 0) / top.length;
      const avgAgg = top.reduce((s, h) => s + h.aggressiveness, 0) / top.length;

      tier = Math.round(avgTier);
      agg = Math.min(Math.round(avgAgg * 100) / 100, tolCeiling);
      basis.push(
        `Historical: ${top.length} similar jobs (avg score ${Math.round(top.reduce((s, h) => s + h.outcome_score, 0) / top.length)}/100) → Tier ${tier}, agg ${agg}`
      );
    }

    // Machine recommendation
    let recommendedMachine: string | undefined = current_machine;
    if (available_machines && available_machines.length > 0) {
      // Score machines: prefer "current" status, more options (TSC, high-speed spindle), etc.
      const scored = available_machines
        .filter((m) => m.status !== "outdated")
        .map((m) => {
          let score = 0;
          if (m.status === "current") score += 30;
          if (m.options["tsc"] || m.options["through_spindle_coolant"]) score += 20;
          if (m.options["high_speed_spindle"]) score += 10;
          if (m.options["4th_axis"] || m.options["5th_axis"]) score += 10;
          if (m.programs_posted > 50) score += 10; // well-validated machine
          return { machine: m, score };
        })
        .sort((a, b) => b.score - a.score);

      if (scored.length > 0) {
        recommendedMachine = scored[0].machine.serial;
        basis.push(`Machine match: ${scored[0].machine.serial} (${scored[0].machine.brand} ${scored[0].machine.model}) scored highest for this job profile`);
      }
    }

    // Confidence: more history + stable scores = higher confidence
    let confidence = 0.5; // base
    if (relevantHistory.length >= 10) confidence = 0.9;
    else if (relevantHistory.length >= 5) confidence = 0.75;
    else if (relevantHistory.length >= 2) confidence = 0.62;

    // Penalize if we had to fall back to defaults
    if (relevantHistory.length === 0) {
      basis.push("No historical data — using material/tolerance defaults only");
      confidence = 0.45;
    }

    const record: PredictionRecord = {
      job_id,
      material,
      machine: recommendedMachine ?? current_machine ?? "unspecified",
      recommended_tier: tier,
      recommended_aggressiveness: agg,
      recommended_machine: recommendedMachine,
      confidence,
      basis,
    };

    this.predictionLog.push(record);
    return record;
  }

  trackPredictionAccuracy(): {
    total_predictions: number;
    validated_predictions: number;
    accuracy_by_metric: {
      tier_accuracy_pct: number;
      aggressiveness_accuracy_pct: number;
      machine_accuracy_pct: number;
    };
    trend: "improving" | "stable" | "degrading";
  } {
    const total = this.predictionLog.length;

    // Compare predictions to historical job outcomes where job_id matches
    const validated = this.predictionLog.filter((pred) =>
      this.history.some((h) => h.job_id === pred.job_id)
    );

    if (validated.length === 0) {
      return {
        total_predictions: total,
        validated_predictions: 0,
        accuracy_by_metric: { tier_accuracy_pct: 0, aggressiveness_accuracy_pct: 0, machine_accuracy_pct: 0 },
        trend: "stable",
      };
    }

    let tierCorrect = 0, aggClose = 0, machineMatch = 0;

    for (const pred of validated) {
      const actual = this.history.find((h) => h.job_id === pred.job_id)!;
      if (actual.physics_tier === pred.recommended_tier) tierCorrect++;
      if (Math.abs(actual.aggressiveness - pred.recommended_aggressiveness) <= 0.1) aggClose++;
      if (pred.recommended_machine && actual.machine_serial === pred.recommended_machine) machineMatch++;
    }

    // Trend: compare first half vs second half validated accuracy
    const half = Math.floor(validated.length / 2);
    let trend: "improving" | "stable" | "degrading" = "stable";
    if (validated.length >= 6) {
      const firstHalf = validated.slice(0, half);
      const secondHalf = validated.slice(half);
      const scoreHalf = (arr: PredictionRecord[]) => {
        let c = 0;
        for (const p of arr) {
          const a = this.history.find((h) => h.job_id === p.job_id)!;
          if (a && a.physics_tier === p.recommended_tier) c++;
        }
        return c / arr.length;
      };
      const diff = scoreHalf(secondHalf) - scoreHalf(firstHalf);
      if (diff > 0.1) trend = "improving";
      else if (diff < -0.1) trend = "degrading";
    }

    return {
      total_predictions: total,
      validated_predictions: validated.length,
      accuracy_by_metric: {
        tier_accuracy_pct: Math.round((tierCorrect / validated.length) * 100),
        aggressiveness_accuracy_pct: Math.round((aggClose / validated.length) * 100),
        machine_accuracy_pct: validated.length > 0
          ? Math.round((machineMatch / validated.length) * 100)
          : 0,
      },
      trend,
    };
  }
}

// ============================================================================
// FLEET DEPLOYMENT & LEARNING ENGINE
// ============================================================================

/** Fleet Deployment Learning Engine engine/manager. */
export class FleetDeploymentLearningEngine {
  private synchronizer = new FleetPostSynchronizer();
  private impactAnalyzer = new PostChangeImpactAnalyzer();
  private standardEnforcer = new ShopStandardEnforcer();
  private feedbackLoop = new ShopFeedbackLoop();
  private optimizer = new PredictivePostOptimizer();

  // In-memory program registry
  private programs: ProgramRecord[] = [];
  // Registered machines cache (mirrors synchronizer) for optimizer
  private machines: FleetMachine[] = [];

  // ---- Registration helpers ------------------------------------------------

  registerMachine(machine: FleetMachine): void {
    this.synchronizer.registerMachine(machine);
    const idx = this.machines.findIndex((m) => m.serial === machine.serial);
    if (idx >= 0) this.machines[idx] = machine;
    else this.machines.push(machine);
  }

  registerPostVersion(version: PostVersion): void {
    this.synchronizer.registerVersion(version);
  }

  registerProgram(program: ProgramRecord): void {
    const idx = this.programs.findIndex((p) => p.program_id === program.program_id);
    if (idx >= 0) this.programs[idx] = program;
    else this.programs.push(program);
  }

  addCustomStandard(standard: ShopStandard): void {
    this.standardEnforcer.addCustomStandard(standard);
  }

  recordJobOutcome(record: JobHistoryRecord): void {
    this.optimizer.recordJobOutcome(record);
  }

  // ---- ACTION: fleet_status ------------------------------------------------

  fleetStatus(): {
    action: "fleet_status";
    machines: FleetMachine[];
    latest_post_version: string;
    summary: { current: number; update_available: number; outdated: number; custom: number };
    programs_registered: number;
    standards_active: number;
    feedback_entries: number;
  } {
    const status = this.synchronizer.getFleetStatus();
    return {
      action: "fleet_status",
      ...status,
      latest_post_version: status.latest_version,
      machines: status.machines,
      programs_registered: this.programs.length,
      standards_active: this.standardEnforcer.getAllStandards().length,
      feedback_entries: this.feedbackLoop.getAllFeedback().length,
    };
  }

  // ---- ACTION: generate_update_plan ----------------------------------------

  generateUpdatePlan(): { action: "generate_update_plan" } & UpdatePlan {
    const plan = this.synchronizer.generateUpdatePlan(this.programs);
    return { action: "generate_update_plan", ...plan };
  }

  // ---- ACTION: check_standards ---------------------------------------------

  checkStandards(params: {
    gcode: string;
    machine_serial?: string;
    physics_tier?: number;
    aggressiveness?: number;
    is_production?: boolean;
    custom_config?: Record<string, unknown>;
  }): {
    action: "check_standards";
    machine_serial?: string;
    passed: boolean;
    total_checks: number;
    passed_checks: number;
    failed_mandatory: number;
    failed_recommended: number;
    results: Array<{
      standard: string;
      severity: ShopStandard["severity"];
      passed: boolean;
      violations: string[];
    }>;
    score: number;
    verdict: string;
  } {
    const machine = params.machine_serial
      ? this.machines.find((m) => m.serial === params.machine_serial)
      : undefined;

    const config = {
      controller_family: machine?.controller,
      machine_type: machine?.model,
      physics_tier: params.physics_tier,
      aggressiveness: params.aggressiveness,
      is_production: params.is_production ?? true,
      ...params.custom_config,
    };

    const result = this.standardEnforcer.checkStandards(params.gcode, config);
    return {
      action: "check_standards",
      machine_serial: params.machine_serial,
      ...result,
    };
  }

  // ---- ACTION: ingest_feedback ---------------------------------------------

  ingestFeedback(entry: FeedbackEntry): {
    action: "ingest_feedback";
    accepted: boolean;
    calibration_updated: boolean;
    model_key: string;
    new_bias?: { cycle_time?: number; tool_life?: number; surface_finish?: number };
    message: string;
  } {
    const result = this.feedbackLoop.ingestFeedback(entry);
    return { action: "ingest_feedback", ...result };
  }

  // ---- ACTION: get_prediction ----------------------------------------------

  getPrediction(params: {
    job_id: string;
    material: string;
    tolerance_class?: "rough" | "semi" | "finish" | "precision";
    current_machine?: string;
    use_fleet_machines?: boolean;
  }): { action: "get_prediction" } & PredictionRecord & {
    calibration_applied: boolean;
    calibrated_tier?: number;
    calibrated_aggressiveness?: number;
    calibration_note?: string;
  } {
    const pred = this.optimizer.predict({
      job_id: params.job_id,
      material: params.material,
      tolerance_class: params.tolerance_class,
      current_machine: params.current_machine,
      available_machines: params.use_fleet_machines ? this.machines : undefined,
    });

    // Apply calibration bias from feedback loop if available
    const machineSerial = pred.recommended_machine ?? params.current_machine ?? "";
    const calModel = this.feedbackLoop.getCalibrationModel(machineSerial, params.material);

    let calibratedTier: number | undefined;
    let calibratedAgg: number | undefined;
    let calibrationNote: string | undefined;

    if (calModel && calModel.sample_count >= 3) {
      // If physics model consistently underestimates cycle time (bias > 1.15), bump tier
      if (calModel.cycle_time_bias > 1.15) {
        calibratedTier = Math.min(pred.recommended_tier + 1, 5);
        calibrationNote = `Cycle time bias ${calModel.cycle_time_bias.toFixed(2)} → tier bumped to ${calibratedTier}`;
      }
      // If tool life consistently overestimated (bias < 0.8), reduce aggressiveness
      if (calModel.tool_life_bias < 0.8) {
        calibratedAgg = Math.round((pred.recommended_aggressiveness * 0.9) * 100) / 100;
        const note = `Tool life bias ${calModel.tool_life_bias.toFixed(2)} → aggressiveness reduced to ${calibratedAgg}`;
        calibrationNote = calibrationNote ? `${calibrationNote}; ${note}` : note;
      }
    }

    return {
      action: "get_prediction",
      ...pred,
      calibration_applied: !!(calibratedTier || calibratedAgg),
      calibrated_tier: calibratedTier,
      calibrated_aggressiveness: calibratedAgg,
      calibration_note: calibrationNote,
    };
  }

  // ---- ACTION: calibration_report ------------------------------------------

  calibrationReport(): {
    action: "calibration_report";
    models: CalibrationModel[];
    total_feedback_entries: number;
    entries_by_type: Record<string, number>;
    machines_calibrated: number;
    overall_accuracy: { cycle_time: number; tool_life: number; surface_finish: number };
    anomalies: string[];
    prediction_tracking: ReturnType<PredictivePostOptimizer["trackPredictionAccuracy"]>;
  } {
    const report = this.feedbackLoop.getCalibrationReport();
    const tracking = this.optimizer.trackPredictionAccuracy();
    return {
      action: "calibration_report",
      ...report,
      prediction_tracking: tracking,
    };
  }

  // ---- ACTION: fleet_summary -----------------------------------------------

  fleetSummary(): {
    action: "fleet_summary";
    fleet: {
      total_machines: number;
      current: number;
      needing_update: number;
      outdated: number;
      custom: number;
    };
    programs: {
      total: number;
      by_tolerance_class: Record<string, number>;
      by_physics_tier: Record<number, number>;
    };
    quality: {
      standards_active: number;
      feedback_entries: number;
      calibrated_machine_material_pairs: number;
      prediction_confidence_avg: number;
    };
    top_issues: string[];
    recommendations: string[];
  } {
    const status = this.synchronizer.getFleetStatus();
    const calReport = this.feedbackLoop.getCalibrationReport();
    const updatePlan = this.synchronizer.generateUpdatePlan(this.programs);

    // Program breakdown
    const byTol: Record<string, number> = {};
    const byTier: Record<number, number> = {};
    for (const p of this.programs) {
      byTol[p.tolerance_class] = (byTol[p.tolerance_class] ?? 0) + 1;
      byTier[p.physics_tier] = (byTier[p.physics_tier] ?? 0) + 1;
    }

    // Build top issues
    const issues: string[] = [];
    const highPriority = updatePlan.machines_to_update.filter((m) => m.priority === "high");
    if (highPriority.length > 0)
      issues.push(`${highPriority.length} machine(s) need URGENT post update (safety/critical changes)`);
    if (calReport.anomalies.length > 0)
      issues.push(...calReport.anomalies.slice(0, 3));
    if (updatePlan.needing_update > updatePlan.total_machines * 0.5)
      issues.push(`${updatePlan.needing_update}/${updatePlan.total_machines} machines running outdated posts`);
    if (calReport.total_feedback_entries < 10)
      issues.push("Insufficient feedback data — calibration models have low confidence");

    // Recommendations
    const recs: string[] = [];
    if (updatePlan.needing_update > 0)
      recs.push(`Run update plan: ${updatePlan.needing_update} machine(s) to update (see generate_update_plan)`);
    if (calReport.overall_accuracy.cycle_time < 85)
      recs.push("Cycle time model accuracy below 85% — collect more feedback or review physics parameters");
    if (calReport.overall_accuracy.tool_life < 80)
      recs.push("Tool life accuracy below 80% — verify insert grades and cutting data");
    if (this.programs.length > 0 && this.feedbackLoop.getAllFeedback().length < this.programs.length * 0.2)
      recs.push("Feedback coverage is low — encourage operators to log actual vs predicted values");
    if (recs.length === 0) recs.push("Fleet is in good standing — continue regular feedback collection");

    const tracking = this.optimizer.trackPredictionAccuracy();
    const avgConf =
      tracking.total_predictions === 0
        ? 0
        : (tracking.accuracy_by_metric.tier_accuracy_pct +
            tracking.accuracy_by_metric.aggressiveness_accuracy_pct) /
          2;

    return {
      action: "fleet_summary",
      fleet: {
        total_machines: status.summary.current + status.summary.update_available + status.summary.outdated + status.summary.custom,
        current: status.summary.current,
        needing_update: status.summary.update_available + status.summary.outdated,
        outdated: status.summary.outdated,
        custom: status.summary.custom,
      },
      programs: {
        total: this.programs.length,
        by_tolerance_class: byTol,
        by_physics_tier: byTier,
      },
      quality: {
        standards_active: this.standardEnforcer.getAllStandards().length,
        feedback_entries: calReport.total_feedback_entries,
        calibrated_machine_material_pairs: calReport.machines_calibrated,
        prediction_confidence_avg: avgConf,
      },
      top_issues: issues,
      recommendations: recs,
    };
  }

  // ---- MASTER DISPATCH -------------------------------------------------------

  dispatch(action: string, params: Record<string, unknown>): unknown {
    log.debug(`FleetDeploymentLearningEngine.dispatch: ${action}`);

    switch (action) {
      case "fleet_status":
        return this.fleetStatus();

      case "generate_update_plan":
        return this.generateUpdatePlan();

      case "check_standards": {
        const gcode = params["gcode"];
        if (typeof gcode !== "string" || !gcode.trim())
          throw new Error("check_standards requires non-empty 'gcode' string");
        return this.checkStandards({
          gcode,
          machine_serial: params["machine_serial"] as string | undefined,
          physics_tier: params["physics_tier"] as number | undefined,
          aggressiveness: params["aggressiveness"] as number | undefined,
          is_production: params["is_production"] as boolean | undefined,
          custom_config: params["custom_config"] as Record<string, unknown> | undefined,
        });
      }

      case "ingest_feedback": {
        const entry = params as unknown as FeedbackEntry;
        if (!entry.machine_serial || !entry.program_id || !entry.type)
          throw new Error("ingest_feedback requires machine_serial, program_id, type");
        if (!entry.date) entry.date = new Date().toISOString().slice(0, 10);
        return this.ingestFeedback(entry);
      }

      case "get_prediction": {
        const jobId = params["job_id"];
        const material = params["material"];
        if (typeof jobId !== "string" || !jobId)
          throw new Error("get_prediction requires 'job_id'");
        if (typeof material !== "string" || !material)
          throw new Error("get_prediction requires 'material'");
        return this.getPrediction({
          job_id: jobId,
          material,
          tolerance_class: params["tolerance_class"] as "rough" | "semi" | "finish" | "precision" | undefined,
          current_machine: params["current_machine"] as string | undefined,
          use_fleet_machines: params["use_fleet_machines"] as boolean | undefined,
        });
      }

      case "calibration_report":
        return this.calibrationReport();

      case "fleet_summary":
        return this.fleetSummary();

      // ---- Admin helpers (not in primary action set but useful in tests) ----

      case "_register_machine": {
        const m = params as unknown as FleetMachine;
        this.registerMachine(m);
        return { ok: true, serial: m.serial };
      }
      case "_register_version": {
        const v = params as unknown as PostVersion;
        this.registerPostVersion(v);
        return { ok: true, version: v.version };
      }
      case "_register_program": {
        const p = params as unknown as ProgramRecord;
        this.registerProgram(p);
        return { ok: true, program_id: p.program_id };
      }
      case "_record_job_outcome": {
        const r = params as unknown as JobHistoryRecord;
        this.recordJobOutcome(r);
        return { ok: true, job_id: r.job_id };
      }

      default:
        throw new Error(
          `FleetDeploymentLearningEngine: unknown action '${action}'. ` +
            `Valid: fleet_status, generate_update_plan, check_standards, ingest_feedback, get_prediction, calibration_report, fleet_summary`
        );
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Singleton instance — import this in dispatchers. */
export const fleetDeploymentLearningEngine = new FleetDeploymentLearningEngine();
