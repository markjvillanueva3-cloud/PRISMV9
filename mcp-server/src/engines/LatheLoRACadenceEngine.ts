/**
 * LatheLoRACadenceEngine — Training Cadence Scheduler
 *
 * U-LLR01: Manages training schedules, automatic retraining triggers,
 * and model versioning for LatheLoRA fine-tuning.
 *
 * Ported from prism-lathe-master for PRISM integration.
 *
 * @module engines/LatheLoRACadenceEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export type CadenceInterval = "daily" | "weekly" | "biweekly" | "monthly" | "on-demand";
export type TriggerType = "scheduled" | "data-drift" | "performance-drop" | "manual";

export interface CadenceConfig {
  enabled: boolean;
  interval: CadenceInterval;
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
}

export interface TrainingRun {
  run_id: string;
  version: string;
  triggered_by: TriggerType;
  started_at: string;
  completed_at?: string;
  status: "pending" | "running" | "completed" | "failed";
  metrics?: {
    dataset_size: number;
    training_loss: number;
    eval_score: number;
    new_programs: number;
  };
  model_path?: string;
  promoted: boolean;
  notes?: string;
}

export interface VersionInfo {
  version: string;
  created_at: string;
  model_path: string;
  eval_score: number;
  is_active: boolean;
  promoted_at?: string;
  deprecated_at?: string;
}

export interface CadenceState {
  config: CadenceConfig;
  last_run?: TrainingRun;
  next_run_at?: string;
  runs: TrainingRun[];
  versions: VersionInfo[];
  active_version?: string;
  programs_since_last_run: number;
}

export interface CadenceSummary {
  enabled: boolean;
  interval: CadenceInterval;
  active_version: string | null;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  programs_pending: number;
  next_run: string | null;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: CadenceConfig = {
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
};

// ============================================================================
// ENGINE
// ============================================================================

class LatheLoRACadenceEngine {
  private config: CadenceConfig = { ...DEFAULT_CONFIG };
  private state: CadenceState = {
    config: { ...DEFAULT_CONFIG },
    runs: [],
    versions: [],
    programs_since_last_run: 0,
  };

  /**
   * Set cadence configuration.
   * @param config Partial configuration to merge
   * @returns Updated configuration
   */
  setConfig(config: Partial<CadenceConfig>): CadenceConfig {
    this.config = { ...this.config, ...config };
    this.state.config = { ...this.config };
    return this.config;
  }

  /**
   * Get current configuration.
   * @returns Current cadence configuration
   */
  getConfig(): CadenceConfig {
    return { ...this.config };
  }

  /**
   * Get current cadence state.
   * @returns Deep copy of current state
   */
  getState(): CadenceState {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Reset to default configuration and clear state.
   */
  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.state = {
      config: { ...DEFAULT_CONFIG },
      runs: [],
      versions: [],
      programs_since_last_run: 0,
    };
  }

  /**
   * Calculate next scheduled run date.
   * @param fromDate Base date for calculation (default: now)
   * @returns Next run date
   */
  calculateNextRun(fromDate: Date = new Date()): Date {
    const next = new Date(fromDate);
    next.setHours(this.config.hour, 0, 0, 0);

    switch (this.config.interval) {
      case "daily":
        if (next <= fromDate) {
          next.setDate(next.getDate() + 1);
        }
        break;

      case "weekly": {
        const targetDay = this.config.day_of_week ?? 0;
        const daysUntil = (targetDay - next.getDay() + 7) % 7 || 7;
        next.setDate(next.getDate() + daysUntil);
        if (next <= fromDate) {
          next.setDate(next.getDate() + 7);
        }
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
        if (next <= fromDate) {
          next.setMonth(next.getMonth() + 1);
        }
        break;
      }

      case "on-demand":
        return new Date(0);
    }

    return next;
  }

  /**
   * Evaluate whether a training run should be triggered.
   * @returns Trigger decision with reason
   */
  shouldTriggerRun(): { should: boolean; reason: TriggerType | null; details?: string } {
    if (!this.config.enabled) {
      return { should: false, reason: null, details: "Cadence disabled" };
    }

    if (this.config.interval === "on-demand") {
      return { should: false, reason: null, details: "On-demand only" };
    }

    const now = new Date();
    const nextRun = this.calculateNextRun(
      this.state.last_run ? new Date(this.state.last_run.completed_at || this.state.last_run.started_at) : new Date(0)
    );

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

  /**
   * Check if model performance has drifted from baseline.
   * @param currentScore Current evaluation score
   * @param baselineScore Baseline score to compare against
   * @returns Drift status and delta
   */
  checkDrift(currentScore: number, baselineScore: number): { drifted: boolean; delta: number } {
    const delta = (baselineScore - currentScore) / baselineScore;
    return {
      drifted: delta > this.config.drift_threshold,
      delta: Math.round(delta * 100) / 100,
    };
  }

  /**
   * Check if performance meets threshold.
   * @param score Evaluation score
   * @returns Acceptability status and delta from threshold
   */
  checkPerformance(score: number): { acceptable: boolean; delta: number } {
    return {
      acceptable: score >= this.config.performance_threshold,
      delta: score - this.config.performance_threshold,
    };
  }

  /**
   * Start a new training run.
   * @param triggeredBy What triggered this run
   * @param notes Optional notes
   * @returns New training run record
   */
  startRun(triggeredBy: TriggerType, notes?: string): TrainingRun {
    const version = this.generateVersion();
    const run: TrainingRun = {
      run_id: `run-${Date.now()}`,
      version,
      triggered_by: triggeredBy,
      started_at: new Date().toISOString(),
      status: "running",
      promoted: false,
      notes,
    };

    this.state.runs.push(run);
    this.state.last_run = run;

    return run;
  }

  /**
   * Complete a training run with results.
   * @param runId Run identifier
   * @param metrics Training metrics
   * @param modelPath Path to trained model
   * @returns Updated run record
   */
  completeRun(runId: string, metrics: TrainingRun["metrics"], modelPath: string): TrainingRun {
    const run = this.state.runs.find((r) => r.run_id === runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    run.status = "completed";
    run.completed_at = new Date().toISOString();
    run.metrics = metrics;
    run.model_path = modelPath;

    const versionInfo: VersionInfo = {
      version: run.version,
      created_at: run.completed_at,
      model_path: modelPath,
      eval_score: metrics?.eval_score || 0,
      is_active: false,
    };
    this.state.versions.push(versionInfo);

    if (this.config.auto_promote && metrics?.eval_score && metrics.eval_score >= this.config.performance_threshold) {
      this.promoteVersion(run.version);
    }

    this.state.programs_since_last_run = 0;
    this.pruneVersions();

    return run;
  }

  /**
   * Mark a training run as failed.
   * @param runId Run identifier
   * @param error Error message
   * @returns Updated run record
   */
  failRun(runId: string, error: string): TrainingRun {
    const run = this.state.runs.find((r) => r.run_id === runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    run.status = "failed";
    run.completed_at = new Date().toISOString();
    run.notes = (run.notes ? run.notes + "; " : "") + `Error: ${error}`;

    return run;
  }

  /**
   * Generate version string for new model.
   * @returns Version string (YYYYMMDD.seq)
   */
  generateVersion(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const seq = this.state.versions.filter(
      (v) => v.version.startsWith(`${year}${month}${day}`)
    ).length + 1;

    return `${year}${month}${day}.${seq}`;
  }

  /**
   * Promote a version to active status.
   * @param version Version to promote
   * @returns Updated version info
   */
  promoteVersion(version: string): VersionInfo {
    const versionInfo = this.state.versions.find((v) => v.version === version);
    if (!versionInfo) {
      throw new Error(`Version ${version} not found`);
    }

    for (const v of this.state.versions) {
      v.is_active = false;
    }

    versionInfo.is_active = true;
    versionInfo.promoted_at = new Date().toISOString();
    this.state.active_version = version;

    const run = this.state.runs.find((r) => r.version === version);
    if (run) {
      run.promoted = true;
    }

    return versionInfo;
  }

  /**
   * Deprecate a version.
   * @param version Version to deprecate
   * @returns Updated version info
   */
  deprecateVersion(version: string): VersionInfo {
    const versionInfo = this.state.versions.find((v) => v.version === version);
    if (!versionInfo) {
      throw new Error(`Version ${version} not found`);
    }

    versionInfo.is_active = false;
    versionInfo.deprecated_at = new Date().toISOString();

    if (this.state.active_version === version) {
      this.state.active_version = undefined;
    }

    return versionInfo;
  }

  private pruneVersions(): void {
    const maxVersions = this.config.max_versions;
    const sortedVersions = [...this.state.versions]
      .filter((v) => !v.is_active)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (sortedVersions.length > maxVersions - 1) {
      const toRemove = sortedVersions.slice(maxVersions - 1);
      for (const v of toRemove) {
        v.deprecated_at = new Date().toISOString();
      }
    }
  }

  /**
   * Record new programs added since last training.
   * @param count Number of new programs
   * @returns Updated total
   */
  recordNewPrograms(count: number): number {
    this.state.programs_since_last_run += count;
    return this.state.programs_since_last_run;
  }

  /**
   * Get cron expression for scheduled runs.
   * @returns Cron expression string
   */
  getCronExpression(): string {
    const hour = this.config.hour;

    switch (this.config.interval) {
      case "daily":
        return `0 ${hour} * * *`;
      case "weekly":
        return `0 ${hour} * * ${this.config.day_of_week ?? 0}`;
      case "biweekly":
        return `0 ${hour} * * ${this.config.day_of_week ?? 0}/2`;
      case "monthly":
        return `0 ${hour} ${this.config.day_of_month ?? 1} * *`;
      case "on-demand":
        return "# On-demand only";
    }
  }

  /**
   * Get recent training run history.
   * @param limit Maximum runs to return
   * @returns Recent runs (newest first)
   */
  getRunHistory(limit: number = 10): TrainingRun[] {
    return this.state.runs.slice(-limit).reverse();
  }

  /**
   * Get version history.
   * @param limit Maximum versions to return
   * @returns Recent versions (newest first)
   */
  getVersionHistory(limit: number = 10): VersionInfo[] {
    return this.state.versions.slice(-limit).reverse();
  }

  /**
   * Get currently active version.
   * @returns Active version info or null
   */
  getActiveVersion(): VersionInfo | null {
    return this.state.versions.find((v) => v.is_active) || null;
  }

  /**
   * Get cadence summary statistics.
   * @returns Summary object
   */
  getSummary(): CadenceSummary {
    const successful = this.state.runs.filter((r) => r.status === "completed").length;
    const failed = this.state.runs.filter((r) => r.status === "failed").length;
    const nextRun = this.calculateNextRun();

    return {
      enabled: this.config.enabled,
      interval: this.config.interval,
      active_version: this.state.active_version || null,
      total_runs: this.state.runs.length,
      successful_runs: successful,
      failed_runs: failed,
      programs_pending: this.state.programs_since_last_run,
      next_run: this.config.interval === "on-demand" ? null : nextRun.toISOString(),
    };
  }
}

export const latheLoRACadenceEngine = new LatheLoRACadenceEngine();
