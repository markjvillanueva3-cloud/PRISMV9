/**
 * LatheLoRACadenceOrchestratorEngine — LATHE-LORA-MS0 U-LLR31
 * ===========================================================
 *
 * Orchestrates the LatheLoRA retraining cadence.
 * Coordinates drift detection, continual learning, and deployment.
 *
 * Features:
 *   - Automated retraining scheduling
 *   - Pipeline orchestration
 *   - State machine management
 *   - Rollback handling
 *
 * @module engines/LatheLoRACadenceOrchestratorEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Cadence state */
export type CadenceState =
  | "idle"
  | "monitoring"
  | "drift_detected"
  | "collecting_data"
  | "training"
  | "validating"
  | "deploying"
  | "deployed"
  | "rolling_back"
  | "failed";

/** Cadence event */
export type CadenceEvent =
  | "start_monitoring"
  | "drift_detected"
  | "drift_cleared"
  | "start_training"
  | "training_complete"
  | "validation_passed"
  | "validation_failed"
  | "deploy"
  | "deploy_complete"
  | "rollback"
  | "error"
  | "reset";

/** Cadence schedule */
export interface CadenceSchedule {
  check_interval_hours: number;
  min_samples_for_training: number;
  max_training_frequency_hours: number;
  auto_deploy: boolean;
  require_validation: boolean;
  rollback_on_degradation: boolean;
}

/** Cadence run */
export interface CadenceRun {
  id: string;
  model_id: string;
  state: CadenceState;
  started_at: number;
  completed_at?: number;
  events: Array<{
    event: CadenceEvent;
    timestamp: number;
    data?: Record<string, unknown>;
  }>;
  metrics?: {
    samples_collected: number;
    training_duration_ms: number;
    validation_score: number;
    previous_score: number;
    improvement: number;
  };
  error?: string;
}

/** Engine configuration */
export interface CadenceConfig {
  schedule: CadenceSchedule;
  enabled: boolean;
  notify_on_events: CadenceEvent[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_SCHEDULE: CadenceSchedule = {
  check_interval_hours: 24,
  min_samples_for_training: 100,
  max_training_frequency_hours: 168, // 1 week
  auto_deploy: false,
  require_validation: true,
  rollback_on_degradation: true,
};

const DEFAULT_CONFIG: CadenceConfig = {
  schedule: DEFAULT_SCHEDULE,
  enabled: false,
  notify_on_events: ["drift_detected", "training_complete", "deploy_complete", "error"],
};

/** State transitions */
const STATE_TRANSITIONS: Record<CadenceState, Record<CadenceEvent, CadenceState>> = {
  idle: {
    start_monitoring: "monitoring",
    reset: "idle",
  } as Record<CadenceEvent, CadenceState>,
  monitoring: {
    drift_detected: "drift_detected",
    reset: "idle",
    error: "failed",
  } as Record<CadenceEvent, CadenceState>,
  drift_detected: {
    start_training: "collecting_data",
    drift_cleared: "monitoring",
    reset: "idle",
  } as Record<CadenceEvent, CadenceState>,
  collecting_data: {
    start_training: "training",
    reset: "idle",
    error: "failed",
  } as Record<CadenceEvent, CadenceState>,
  training: {
    training_complete: "validating",
    error: "failed",
    reset: "idle",
  } as Record<CadenceEvent, CadenceState>,
  validating: {
    validation_passed: "deploying",
    validation_failed: "monitoring",
    reset: "idle",
    error: "failed",
  } as Record<CadenceEvent, CadenceState>,
  deploying: {
    deploy_complete: "deployed",
    error: "rolling_back",
    reset: "idle",
  } as Record<CadenceEvent, CadenceState>,
  deployed: {
    start_monitoring: "monitoring",
    rollback: "rolling_back",
    reset: "idle",
  } as Record<CadenceEvent, CadenceState>,
  rolling_back: {
    deploy_complete: "monitoring",
    error: "failed",
    reset: "idle",
  } as Record<CadenceEvent, CadenceState>,
  failed: {
    reset: "idle",
    start_monitoring: "monitoring",
  } as Record<CadenceEvent, CadenceState>,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRACadenceOrchestratorEngine {
  private config: CadenceConfig = DEFAULT_CONFIG;
  private runs: Map<string, CadenceRun> = new Map();
  private activeRuns: Map<string, string> = new Map(); // modelId -> runId
  private notifications: Array<{ event: CadenceEvent; run: CadenceRun; timestamp: number }> = [];

  /**
   * Set configuration
   */
  setConfig(config: Partial<CadenceConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      schedule: { ...this.config.schedule, ...config.schedule },
    };
  }

  /**
   * Get configuration
   */
  getConfig(): CadenceConfig {
    return {
      ...this.config,
      schedule: { ...this.config.schedule },
    };
  }

  /**
   * Start cadence for model
   */
  startCadence(modelId: string): CadenceRun {
    const existingRunId = this.activeRuns.get(modelId);
    if (existingRunId) {
      const existing = this.runs.get(existingRunId);
      if (existing && existing.state !== "idle" && existing.state !== "failed") {
        throw new Error(`Active cadence run exists for model ${modelId}: ${existingRunId}`);
      }
    }

    const run: CadenceRun = {
      id: `cadence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      model_id: modelId,
      state: "idle",
      started_at: Date.now(),
      events: [],
    };

    this.runs.set(run.id, run);
    this.activeRuns.set(modelId, run.id);

    // Transition to monitoring
    this.processEvent(run.id, "start_monitoring");

    return run;
  }

  /**
   * Process event for run
   */
  processEvent(
    runId: string,
    event: CadenceEvent,
    data?: Record<string, unknown>
  ): CadenceRun | null {
    const run = this.runs.get(runId);
    if (!run) return null;

    const transitions = STATE_TRANSITIONS[run.state];
    const newState = transitions?.[event];

    if (!newState) {
      log.warn(`Invalid transition: ${run.state} + ${event}`);
      return run;
    }

    // Record event
    run.events.push({
      event,
      timestamp: Date.now(),
      data,
    });

    // Update state
    run.state = newState;

    // Check for completion
    if (newState === "deployed" || newState === "failed") {
      run.completed_at = Date.now();
    }

    // Notify if configured
    if (this.config.notify_on_events.includes(event)) {
      this.notifications.push({
        event,
        run: { ...run },
        timestamp: Date.now(),
      });
    }

    log.info(`Cadence ${runId}: ${event} -> ${newState}`);

    return run;
  }

  /**
   * Get run by ID
   */
  getRun(runId: string): CadenceRun | undefined {
    return this.runs.get(runId);
  }

  /**
   * Get active run for model
   */
  getActiveRun(modelId: string): CadenceRun | null {
    const runId = this.activeRuns.get(modelId);
    if (!runId) return null;
    return this.runs.get(runId) || null;
  }

  /**
   * Get all runs
   */
  getAllRuns(limit?: number): CadenceRun[] {
    const runs = Array.from(this.runs.values());
    return limit ? runs.slice(-limit) : runs;
  }

  /**
   * Get runs by state
   */
  getRunsByState(state: CadenceState): CadenceRun[] {
    return Array.from(this.runs.values()).filter(r => r.state === state);
  }

  /**
   * Update run metrics
   */
  updateMetrics(
    runId: string,
    metrics: Partial<CadenceRun["metrics"]>
  ): boolean {
    const run = this.runs.get(runId);
    if (!run) return false;

    run.metrics = { ...run.metrics, ...metrics } as CadenceRun["metrics"];
    return true;
  }

  /**
   * Check if training is allowed
   */
  canTrain(modelId: string): {
    allowed: boolean;
    reason: string;
  } {
    const run = this.getActiveRun(modelId);

    if (!run) {
      return { allowed: false, reason: "No active cadence run" };
    }

    if (run.state !== "drift_detected" && run.state !== "collecting_data") {
      return { allowed: false, reason: `Current state ${run.state} does not allow training` };
    }

    // Check frequency limit
    const completedRuns = Array.from(this.runs.values())
      .filter(r => r.model_id === modelId && r.completed_at)
      .sort((a, b) => (b.completed_at || 0) - (a.completed_at || 0));

    if (completedRuns.length > 0) {
      const lastRun = completedRuns[0];
      const hoursSinceLast = (Date.now() - (lastRun.completed_at || 0)) / (1000 * 60 * 60);

      if (hoursSinceLast < this.config.schedule.max_training_frequency_hours) {
        return {
          allowed: false,
          reason: `Training frequency limit: ${hoursSinceLast.toFixed(1)}h < ${this.config.schedule.max_training_frequency_hours}h`,
        };
      }
    }

    return { allowed: true, reason: "Training allowed" };
  }

  /**
   * Check if deployment is allowed
   */
  canDeploy(modelId: string): {
    allowed: boolean;
    reason: string;
  } {
    const run = this.getActiveRun(modelId);

    if (!run) {
      return { allowed: false, reason: "No active cadence run" };
    }

    if (run.state !== "validating") {
      return { allowed: false, reason: `Current state ${run.state} does not allow deployment` };
    }

    if (this.config.schedule.require_validation && !run.metrics?.validation_score) {
      return { allowed: false, reason: "Validation required but no score recorded" };
    }

    if (run.metrics?.validation_score && run.metrics.validation_score < run.metrics.previous_score) {
      if (this.config.schedule.rollback_on_degradation) {
        return { allowed: false, reason: "Validation score degraded" };
      }
    }

    return { allowed: true, reason: "Deployment allowed" };
  }

  /**
   * Get pending notifications
   */
  getNotifications(limit?: number): Array<{ event: CadenceEvent; run: CadenceRun; timestamp: number }> {
    const notifs = [...this.notifications];
    return limit ? notifs.slice(-limit) : notifs;
  }

  /**
   * Clear notifications
   */
  clearNotifications(): void {
    this.notifications = [];
  }

  /**
   * Generate cadence report
   */
  generateReport(modelId: string): string {
    const runs = Array.from(this.runs.values())
      .filter(r => r.model_id === modelId)
      .sort((a, b) => b.started_at - a.started_at);

    const active = this.getActiveRun(modelId);

    const lines = [
      `# Cadence Report: ${modelId}`,
      ``,
      `## Current Status`,
      `State: ${active?.state || "No active run"}`,
      `Enabled: ${this.config.enabled}`,
      ``,
      `## Schedule`,
      `Check Interval: ${this.config.schedule.check_interval_hours}h`,
      `Min Samples: ${this.config.schedule.min_samples_for_training}`,
      `Max Frequency: ${this.config.schedule.max_training_frequency_hours}h`,
      `Auto Deploy: ${this.config.schedule.auto_deploy}`,
      ``,
      `## Recent Runs`,
    ];

    for (const run of runs.slice(0, 5)) {
      const duration = run.completed_at
        ? ((run.completed_at - run.started_at) / 1000 / 60).toFixed(1)
        : "ongoing";
      lines.push(`- ${run.id}: ${run.state} (${duration} min)`);
      if (run.metrics) {
        lines.push(`  Improvement: ${(run.metrics.improvement * 100).toFixed(1)}%`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Get state machine diagram
   */
  getStateDiagram(): string {
    return `
LatheLoRA Cadence State Machine
================================

  [idle] --start_monitoring--> [monitoring]
    |                              |
    |                       drift_detected
    |                              |
    |                              v
    |                      [drift_detected]
    |                              |
    |                       start_training
    |                              |
    |                              v
    |                     [collecting_data]
    |                              |
    |                       start_training
    |                              |
    |                              v
    |                        [training]
    |                              |
    |                    training_complete
    |                              |
    |                              v
    |                       [validating]
    |                         /        \\
    |            validation_passed    validation_failed
    |                  |                     |
    |                  v                     |
    |             [deploying]                |
    |                  |                     |
    |           deploy_complete              |
    |                  |                     |
    |                  v                     |
    |             [deployed] <---------------+
    |                  |
    |               rollback
    |                  |
    |                  v
    |            [rolling_back]
    |                  |
    |           deploy_complete
    |                  |
    +------------------+
`;
  }

  /**
   * Reset run
   */
  resetRun(runId: string): boolean {
    const run = this.runs.get(runId);
    if (!run) return false;

    this.processEvent(runId, "reset");
    return true;
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.runs.clear();
    this.activeRuns.clear();
    this.notifications = [];
    this.config = DEFAULT_CONFIG;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRACadenceOrchestratorEngine = new LatheLoRACadenceOrchestratorEngine();
