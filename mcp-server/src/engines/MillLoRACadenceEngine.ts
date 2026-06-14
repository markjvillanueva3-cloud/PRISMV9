/**
 * MillLoRACadenceEngine — Training Cadence Scheduler (Mill parity)
 * =================================================================
 *
 * Manages training schedules, automatic retraining triggers, and model
 * versioning for MillLoRA fine-tuning across the mill axis stack.
 *
 * Mill parity for LatheLoRACadenceEngine (LATHE-LORA-MS0 U-LLR01) with
 * MILL-CANONICAL extensions:
 *
 *   - Per-axis training mode — separate cadences for 3-axis, 4-axis-index,
 *     and 5-axis-simul models so a 5-axis chatter spike doesn't retrigger
 *     a 3-axis face-mill model that's still healthy
 *   - Mill-canonical drift signals tracked alongside the lathe score:
 *       chatter_violation_rate (Tlusty regenerative chatter breach %)
 *       fpa_pass_rate          (first-piece approval ship-rate %)
 *       tcpm_solver_failure_rate (Heidenhain Cyc-19 / Fanuc G43.4 fail %)
 *   - Mill-canonical trigger types layered on lathe-shared:
 *       Lathe-shared (4): scheduled, data-drift, performance-drop, manual
 *       MILL-CANONICAL (3): chatter-drift, fpa-rejection-spike, tcpm-fault-spike
 *
 * Features (lathe parity):
 *   - Daily / weekly / biweekly / monthly / on-demand intervals
 *   - Drift + performance threshold checks
 *   - Cron-expression export
 *   - Version pruning (max_versions enforcement)
 *   - Auto-promote on score >= performance_threshold
 *
 * @module engines/MillLoRACadenceEngine
 * @milestone MILL-PARITY-UPGRADE-MS0 / U-MILL-LORA-CADENCE (iter89)
 */

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type MillCadenceInterval = "daily" | "weekly" | "biweekly" | "monthly" | "on-demand";

/** Lathe-shared (4) + MILL-CANONICAL (3) trigger types. */
export type MillTriggerType =
  | "scheduled"
  | "data-drift"
  | "performance-drop"
  | "manual"
  | "chatter-drift"
  | "fpa-rejection-spike"
  | "tcpm-fault-spike";

/** MILL-CANONICAL: per-axis training mode. */
export type MillAxisMode = "3_axis" | "4_axis_index" | "5_axis_simul" | "shared";

/** Trigger types that are NOT in the lathe taxonomy. */
export const MILL_CANONICAL_TRIGGER_TYPES: MillTriggerType[] = [
  "chatter-drift",
  "fpa-rejection-spike",
  "tcpm-fault-spike",
];

export interface MillCadenceConfig {
  enabled: boolean;
  interval: MillCadenceInterval;
  day_of_week?: number;
  day_of_month?: number;
  hour: number;
  timezone: string;
  min_new_programs: number;
  retrain_on_drift: boolean;
  drift_threshold: number;
  performance_threshold: number;
  max_versions: number;
  auto_promote: boolean;
  axis_mode: MillAxisMode;
  chatter_violation_threshold: number;
  fpa_pass_threshold: number;
  tcpm_fault_threshold: number;
}

export interface MillTrainingRunMetrics {
  dataset_size: number;
  training_loss: number;
  score: number;
  new_programs: number;
  chatter_violation_rate?: number;
  fpa_pass_rate?: number;
  tcpm_solver_failure_rate?: number;
}

export interface MillTrainingRun {
  run_id: string;
  version: string;
  triggered_by: MillTriggerType;
  started_at: string;
  completed_at?: string;
  status: "pending" | "running" | "completed" | "failed";
  metrics?: MillTrainingRunMetrics;
  model_path?: string;
  promoted: boolean;
  notes?: string;
  axis_mode: MillAxisMode;
}

export interface MillVersionInfo {
  version: string;
  created_at: string;
  model_path: string;
  score: number;
  is_active: boolean;
  promoted_at?: string;
  deprecated_at?: string;
  axis_mode: MillAxisMode;
}

export interface MillCadenceState {
  config: MillCadenceConfig;
  last_run?: MillTrainingRun;
  next_run_at?: string;
  runs: MillTrainingRun[];
  versions: MillVersionInfo[];
  active_version_by_axis: Partial<Record<MillAxisMode, string>>;
  programs_since_last_run: number;
}

export interface MillCadenceSummary {
  enabled: boolean;
  interval: MillCadenceInterval;
  axis_mode: MillAxisMode;
  active_version: string | null;
  active_versions_by_axis: Partial<Record<MillAxisMode, string>>;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  programs_pending: number;
  next_run: string | null;
  runs_by_trigger: Record<string, number>;
  runs_by_axis: Record<string, number>;
}

const DEFAULT_CONFIG: MillCadenceConfig = {
  enabled: true,
  interval: "weekly",
  day_of_week: 0,
  hour: 2,
  timezone: "America/Chicago",
  min_new_programs: 50,
  retrain_on_drift: true,
  drift_threshold: 0.1,
  performance_threshold: 65,
  max_versions: 5,
  auto_promote: true,
  axis_mode: "shared",
  chatter_violation_threshold: 0.05,
  fpa_pass_threshold: 0.85,
  tcpm_fault_threshold: 0.02,
};

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class MillLoRACadenceEngine {
  private config: MillCadenceConfig = { ...DEFAULT_CONFIG };
  private state: MillCadenceState = {
    config: { ...DEFAULT_CONFIG },
    runs: [],
    versions: [],
    active_version_by_axis: {},
    programs_since_last_run: 0,
  };

  setConfig(config: Partial<MillCadenceConfig>): MillCadenceConfig {
    this.config = { ...this.config, ...config };
    this.state.config = { ...this.config };
    return this.config;
  }

  getConfig(): MillCadenceConfig {
    return { ...this.config };
  }

  getState(): MillCadenceState {
    return JSON.parse(JSON.stringify(this.state));
  }

  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.state = {
      config: { ...DEFAULT_CONFIG },
      runs: [],
      versions: [],
      active_version_by_axis: {},
      programs_since_last_run: 0,
    };
  }

  calculateNextRun(fromDate: Date = new Date()): Date {
    const next = new Date(fromDate);
    next.setHours(this.config.hour, 0, 0, 0);

    switch (this.config.interval) {
      case "daily":
        if (next <= fromDate) next.setDate(next.getDate() + 1);
        break;
      case "weekly": {
        const targetDay = this.config.day_of_week ?? 0;
        const daysUntil = (targetDay - next.getDay() + 7) % 7 || 7;
        next.setDate(next.getDate() + daysUntil);
        if (next <= fromDate) next.setDate(next.getDate() + 7);
        break;
      }
      case "biweekly": {
        const biweeklyDay = this.config.day_of_week ?? 0;
        const daysUntilBi = (biweeklyDay - next.getDay() + 7) % 7 || 14;
        next.setDate(next.getDate() + daysUntilBi);
        break;
      }
      case "monthly": {
        const targetDayOfMonth = this.config.day_of_month ?? 1;
        next.setDate(targetDayOfMonth);
        if (next <= fromDate) next.setMonth(next.getMonth() + 1);
        break;
      }
      case "on-demand":
        return new Date(0);
    }
    return next;
  }

  shouldTriggerRun(): { should: boolean; reason: MillTriggerType | null; details?: string } {
    if (!this.config.enabled) return { should: false, reason: null, details: "Cadence disabled" };
    if (this.config.interval === "on-demand") return { should: false, reason: null, details: "On-demand only" };

    const now = new Date();
    const baseDate = this.state.last_run
      ? new Date(this.state.last_run.completed_at || this.state.last_run.started_at)
      : new Date(0);
    const nextRun = this.calculateNextRun(baseDate);

    if (now >= nextRun) {
      if (this.state.programs_since_last_run >= this.config.min_new_programs) {
        return {
          should: true,
          reason: "scheduled",
          details: `${this.state.programs_since_last_run} new programs since last run`,
        };
      }
      return {
        should: false,
        reason: null,
        details: `Only ${this.state.programs_since_last_run} new programs (min: ${this.config.min_new_programs})`,
      };
    }
    return { should: false, reason: null, details: `Next run at ${nextRun.toISOString()}` };
  }

  checkDrift(currentScore: number, baselineScore: number): { drifted: boolean; delta: number } {
    if (baselineScore <= 0) return { drifted: false, delta: 0 };
    const delta = (baselineScore - currentScore) / baselineScore;
    return {
      drifted: delta > this.config.drift_threshold,
      delta: Math.round(delta * 100) / 100,
    };
  }

  checkPerformance(score: number): { acceptable: boolean; delta: number } {
    return {
      acceptable: score >= this.config.performance_threshold,
      delta: score - this.config.performance_threshold,
    };
  }

  checkChatterViolation(rate: number): { triggered: boolean; rate: number; threshold: number } {
    return {
      triggered: rate > this.config.chatter_violation_threshold,
      rate,
      threshold: this.config.chatter_violation_threshold,
    };
  }

  checkFpaPassRate(rate: number): { triggered: boolean; rate: number; threshold: number } {
    return {
      triggered: rate < this.config.fpa_pass_threshold,
      rate,
      threshold: this.config.fpa_pass_threshold,
    };
  }

  checkTcpmFaultRate(rate: number): { triggered: boolean; rate: number; threshold: number } {
    return {
      triggered: rate > this.config.tcpm_fault_threshold,
      rate,
      threshold: this.config.tcpm_fault_threshold,
    };
  }

  /**
   * MILL-CANONICAL: assess all mill-specific triggers in priority order.
   * Returns first triggered (chatter > fpa > tcpm) or null.
   */
  assessMillTriggers(signals: {
    chatter_violation_rate?: number;
    fpa_pass_rate?: number;
    tcpm_solver_failure_rate?: number;
  }): { triggered: boolean; trigger: MillTriggerType | null; details?: string } {
    if (typeof signals.chatter_violation_rate === "number") {
      const c = this.checkChatterViolation(signals.chatter_violation_rate);
      if (c.triggered) {
        return {
          triggered: true,
          trigger: "chatter-drift",
          details: `chatter rate ${(c.rate * 100).toFixed(1)}% > threshold ${(c.threshold * 100).toFixed(1)}%`,
        };
      }
    }
    if (typeof signals.fpa_pass_rate === "number") {
      const f = this.checkFpaPassRate(signals.fpa_pass_rate);
      if (f.triggered) {
        return {
          triggered: true,
          trigger: "fpa-rejection-spike",
          details: `FPA pass ${(f.rate * 100).toFixed(1)}% < threshold ${(f.threshold * 100).toFixed(1)}%`,
        };
      }
    }
    if (typeof signals.tcpm_solver_failure_rate === "number") {
      const t = this.checkTcpmFaultRate(signals.tcpm_solver_failure_rate);
      if (t.triggered) {
        return {
          triggered: true,
          trigger: "tcpm-fault-spike",
          details: `TCPM fault ${(t.rate * 100).toFixed(1)}% > threshold ${(t.threshold * 100).toFixed(1)}%`,
        };
      }
    }
    return { triggered: false, trigger: null };
  }

  startRun(triggeredBy: MillTriggerType, opts?: { axis_mode?: MillAxisMode; notes?: string }): MillTrainingRun {
    const axis_mode = opts?.axis_mode ?? this.config.axis_mode;
    const version = this.generateVersion(axis_mode);
    const run: MillTrainingRun = {
      run_id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      version,
      triggered_by: triggeredBy,
      started_at: new Date().toISOString(),
      status: "running",
      promoted: false,
      notes: opts?.notes,
      axis_mode,
    };
    this.state.runs.push(run);
    this.state.last_run = run;
    return run;
  }

  completeRun(runId: string, metrics: MillTrainingRunMetrics, modelPath: string): MillTrainingRun {
    const run = this.state.runs.find((r) => r.run_id === runId);
    if (!run) throw new Error(`Run ${runId} not found`);

    run.status = "completed";
    run.completed_at = new Date().toISOString();
    run.metrics = metrics;
    run.model_path = modelPath;

    const versionInfo: MillVersionInfo = {
      version: run.version,
      created_at: run.completed_at,
      model_path: modelPath,
      score: metrics.score,
      is_active: false,
      axis_mode: run.axis_mode,
    };
    this.state.versions.push(versionInfo);

    if (this.config.auto_promote && metrics.score >= this.config.performance_threshold) {
      this.promoteVersion(run.version);
    }

    this.state.programs_since_last_run = 0;
    this.pruneVersions();
    return run;
  }

  failRun(runId: string, error: string): MillTrainingRun {
    const run = this.state.runs.find((r) => r.run_id === runId);
    if (!run) throw new Error(`Run ${runId} not found`);
    run.status = "failed";
    run.completed_at = new Date().toISOString();
    run.notes = (run.notes ? run.notes + "; " : "") + `Error: ${error}`;
    return run;
  }

  /**
   * Generate version string: YYYYMMDD.<axis_mode>.seq
   * MILL-CANONICAL: axis_mode embedded so 3-axis + 5-axis builds on the
   * same day get distinct version slugs.
   */
  generateVersion(axis_mode: MillAxisMode = this.config.axis_mode): string {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const prefix = `${y}${m}${d}.${axis_mode}`;
    const seq = this.state.versions.filter((v) => v.version.startsWith(prefix)).length + 1;
    return `${prefix}.${seq}`;
  }

  promoteVersion(version: string): MillVersionInfo {
    const versionInfo = this.state.versions.find((v) => v.version === version);
    if (!versionInfo) throw new Error(`Version ${version} not found`);

    for (const v of this.state.versions) {
      if (v.axis_mode === versionInfo.axis_mode) v.is_active = false;
    }
    versionInfo.is_active = true;
    versionInfo.promoted_at = new Date().toISOString();
    this.state.active_version_by_axis[versionInfo.axis_mode] = version;

    const run = this.state.runs.find((r) => r.version === version);
    if (run) run.promoted = true;
    return versionInfo;
  }

  deprecateVersion(version: string): MillVersionInfo {
    const versionInfo = this.state.versions.find((v) => v.version === version);
    if (!versionInfo) throw new Error(`Version ${version} not found`);
    versionInfo.is_active = false;
    versionInfo.deprecated_at = new Date().toISOString();
    if (this.state.active_version_by_axis[versionInfo.axis_mode] === version) {
      delete this.state.active_version_by_axis[versionInfo.axis_mode];
    }
    return versionInfo;
  }

  private pruneVersions(): void {
    const maxVersions = this.config.max_versions;
    const axisModes = Array.from(new Set(this.state.versions.map((v) => v.axis_mode)));
    for (const axis of axisModes) {
      const sorted = this.state.versions
        .filter((v) => v.axis_mode === axis && !v.is_active && !v.deprecated_at)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      if (sorted.length > maxVersions - 1) {
        for (const v of sorted.slice(maxVersions - 1)) {
          v.deprecated_at = new Date().toISOString();
        }
      }
    }
  }

  recordNewPrograms(count: number): number {
    this.state.programs_since_last_run += count;
    return this.state.programs_since_last_run;
  }

  getCronExpression(): string {
    const hour = this.config.hour;
    switch (this.config.interval) {
      case "daily": return `0 ${hour} * * *`;
      case "weekly": return `0 ${hour} * * ${this.config.day_of_week ?? 0}`;
      case "biweekly": return `0 ${hour} * * ${this.config.day_of_week ?? 0}/2`;
      case "monthly": return `0 ${hour} ${this.config.day_of_month ?? 1} * *`;
      case "on-demand": return "# On-demand only";
    }
  }

  getRunHistory(limit = 10): MillTrainingRun[] {
    return this.state.runs.slice(-limit).reverse();
  }

  getVersionHistory(limit = 10): MillVersionInfo[] {
    return this.state.versions.slice(-limit).reverse();
  }

  getActiveVersion(axis_mode: MillAxisMode = this.config.axis_mode): MillVersionInfo | null {
    const active = this.state.active_version_by_axis[axis_mode];
    if (!active) return null;
    return this.state.versions.find((v) => v.version === active) ?? null;
  }

  getActiveVersionsAllAxes(): Partial<Record<MillAxisMode, MillVersionInfo>> {
    const out: Partial<Record<MillAxisMode, MillVersionInfo>> = {};
    for (const [axis, version] of Object.entries(this.state.active_version_by_axis) as [MillAxisMode, string][]) {
      const info = this.state.versions.find((v) => v.version === version);
      if (info) out[axis] = info;
    }
    return out;
  }

  getRunsByAxis(axis_mode: MillAxisMode): MillTrainingRun[] {
    return this.state.runs.filter((r) => r.axis_mode === axis_mode);
  }

  getSummary(): MillCadenceSummary {
    const successful = this.state.runs.filter((r) => r.status === "completed").length;
    const failed = this.state.runs.filter((r) => r.status === "failed").length;
    const nextRun = this.calculateNextRun();
    const byTrigger: Record<string, number> = {};
    const byAxis: Record<string, number> = {};
    for (const r of this.state.runs) {
      byTrigger[r.triggered_by] = (byTrigger[r.triggered_by] ?? 0) + 1;
      byAxis[r.axis_mode] = (byAxis[r.axis_mode] ?? 0) + 1;
    }
    const currentActive = this.state.active_version_by_axis[this.config.axis_mode] ?? null;
    return {
      enabled: this.config.enabled,
      interval: this.config.interval,
      axis_mode: this.config.axis_mode,
      active_version: currentActive,
      active_versions_by_axis: { ...this.state.active_version_by_axis },
      total_runs: this.state.runs.length,
      successful_runs: successful,
      failed_runs: failed,
      programs_pending: this.state.programs_since_last_run,
      next_run: this.config.interval === "on-demand" ? null : nextRun.toISOString(),
      runs_by_trigger: byTrigger,
      runs_by_axis: byAxis,
    };
  }
}

export const millLoRACadenceEngine = new MillLoRACadenceEngine();
export { MillLoRACadenceEngine };
