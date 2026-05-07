/**
 * WEDMProgressTrackerEngine — Real-time Progress and ETA Tracking
 * WEDM-P2P-PRODUCTION-MS0 U-PROD-10
 *
 * Provides real-time progress updates during pipeline execution:
 * - Stage N/30 tracking
 * - Percentage complete
 * - Time remaining estimation
 * - Event emission for WebSocket/SSE
 *
 * Integrates with OneClickWEDMGeneratorEngine.
 *
 * @module engines/WEDMProgressTrackerEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export type ProgressEventType =
  | "start"
  | "stage_begin"
  | "stage_complete"
  | "stage_failed"
  | "progress"
  | "complete"
  | "error";

export interface ProgressEvent {
  type: ProgressEventType;
  job_id: string;
  timestamp: Date;
  current_stage: number;
  total_stages: number;
  stage_name: string;
  percentage: number;
  elapsed_ms: number;
  estimated_remaining_ms: number;
  estimated_total_ms: number;
  message?: string;
  error?: string;
}

export interface StageTimingData {
  stage_id: number;
  stage_name: string;
  start_time: Date;
  end_time?: Date;
  duration_ms?: number;
  status: "pending" | "running" | "complete" | "failed" | "skipped";
}

export interface JobProgress {
  job_id: string;
  started_at: Date;
  current_stage: number;
  total_stages: number;
  stage_timings: StageTimingData[];
  status: "running" | "complete" | "failed";
  percentage: number;
  eta_ms: number;
}

export type ProgressListener = (event: ProgressEvent) => void;

export interface ProgressTrackerConfig {
  /** Historical data weight for ETA (0-1) */
  history_weight: number;
  /** Number of recent jobs to consider for ETA */
  history_window: number;
  /** Default stage duration estimate (ms) */
  default_stage_duration_ms: number;
  /** Enable verbose logging */
  verbose: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: ProgressTrackerConfig = {
  history_weight: 0.7,
  history_window: 10,
  default_stage_duration_ms: 100,
  verbose: false,
};

// Historical average durations by stage category (ms)
const CATEGORY_DURATIONS: Record<string, number> = {
  parse: 50,
  detect: 30,
  safety: 20,
  calc: 40,
  toolpath: 100,
  post: 150,
};

// Stage category mapping
const STAGE_CATEGORIES: Record<number, string> = {
  1: "parse", 2: "parse", 3: "parse", 4: "parse", 5: "parse",
  6: "detect", 7: "detect", 8: "detect", 9: "detect", 10: "detect",
  11: "safety", 12: "safety", 13: "safety", 14: "safety", 15: "safety",
  16: "calc", 17: "calc", 18: "calc", 19: "calc", 20: "calc",
  21: "toolpath", 22: "toolpath", 23: "toolpath", 24: "toolpath", 25: "toolpath",
  26: "post", 27: "post", 28: "post", 29: "post", 30: "post",
};

// ============================================================================
// ENGINE
// ============================================================================

class WEDMProgressTrackerEngine {
  private config: ProgressTrackerConfig;
  private activeJobs: Map<string, JobProgress>;
  private completedJobs: Array<{ job_id: string; stage_timings: StageTimingData[] }>;
  private listeners: Map<string, Set<ProgressListener>>;
  private globalListeners: Set<ProgressListener>;

  constructor(config: Partial<ProgressTrackerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.activeJobs = new Map();
    this.completedJobs = [];
    this.listeners = new Map();
    this.globalListeners = new Set();
  }

  /**
   * Generate unique job ID.
   */
  generateJobId(): string {
    return `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Start tracking a new job.
   */
  startJob(job_id: string, total_stages: number = 30): JobProgress {
    const job: JobProgress = {
      job_id,
      started_at: new Date(),
      current_stage: 0,
      total_stages,
      stage_timings: [],
      status: "running",
      percentage: 0,
      eta_ms: this.estimateTotalDuration(total_stages),
    };

    this.activeJobs.set(job_id, job);

    this.emit({
      type: "start",
      job_id,
      timestamp: new Date(),
      current_stage: 0,
      total_stages,
      stage_name: "Initializing",
      percentage: 0,
      elapsed_ms: 0,
      estimated_remaining_ms: job.eta_ms,
      estimated_total_ms: job.eta_ms,
      message: "Pipeline started",
    });

    return job;
  }

  /**
   * Mark stage as started.
   */
  beginStage(job_id: string, stage_id: number, stage_name: string): void {
    const job = this.activeJobs.get(job_id);
    if (!job) return;

    job.current_stage = stage_id;

    const timing: StageTimingData = {
      stage_id,
      stage_name,
      start_time: new Date(),
      status: "running",
    };
    job.stage_timings.push(timing);

    const elapsed = Date.now() - job.started_at.getTime();
    const percentage = ((stage_id - 1) / job.total_stages) * 100;
    const eta = this.calculateETA(job);

    job.percentage = percentage;
    job.eta_ms = eta;

    this.emit({
      type: "stage_begin",
      job_id,
      timestamp: new Date(),
      current_stage: stage_id,
      total_stages: job.total_stages,
      stage_name,
      percentage,
      elapsed_ms: elapsed,
      estimated_remaining_ms: eta,
      estimated_total_ms: elapsed + eta,
      message: `Starting: ${stage_name}`,
    });
  }

  /**
   * Mark stage as completed.
   */
  completeStage(job_id: string, stage_id: number): void {
    const job = this.activeJobs.get(job_id);
    if (!job) return;

    const timing = job.stage_timings.find(t => t.stage_id === stage_id);
    if (timing) {
      timing.end_time = new Date();
      timing.duration_ms = timing.end_time.getTime() - timing.start_time.getTime();
      timing.status = "complete";
    }

    const elapsed = Date.now() - job.started_at.getTime();
    const percentage = (stage_id / job.total_stages) * 100;
    const eta = this.calculateETA(job);

    job.percentage = percentage;
    job.eta_ms = eta;

    this.emit({
      type: "stage_complete",
      job_id,
      timestamp: new Date(),
      current_stage: stage_id,
      total_stages: job.total_stages,
      stage_name: timing?.stage_name || `Stage ${stage_id}`,
      percentage,
      elapsed_ms: elapsed,
      estimated_remaining_ms: eta,
      estimated_total_ms: elapsed + eta,
      message: `Completed: ${timing?.stage_name}`,
    });
  }

  /**
   * Mark stage as failed.
   */
  failStage(job_id: string, stage_id: number, error: string): void {
    const job = this.activeJobs.get(job_id);
    if (!job) return;

    const timing = job.stage_timings.find(t => t.stage_id === stage_id);
    if (timing) {
      timing.end_time = new Date();
      timing.duration_ms = timing.end_time.getTime() - timing.start_time.getTime();
      timing.status = "failed";
    }

    job.status = "failed";
    const elapsed = Date.now() - job.started_at.getTime();

    this.emit({
      type: "stage_failed",
      job_id,
      timestamp: new Date(),
      current_stage: stage_id,
      total_stages: job.total_stages,
      stage_name: timing?.stage_name || `Stage ${stage_id}`,
      percentage: job.percentage,
      elapsed_ms: elapsed,
      estimated_remaining_ms: 0,
      estimated_total_ms: elapsed,
      error,
      message: `Failed: ${timing?.stage_name}`,
    });
  }

  /**
   * Mark job as complete.
   */
  completeJob(job_id: string): void {
    const job = this.activeJobs.get(job_id);
    if (!job) return;

    job.status = "complete";
    job.percentage = 100;
    job.eta_ms = 0;

    const elapsed = Date.now() - job.started_at.getTime();

    this.emit({
      type: "complete",
      job_id,
      timestamp: new Date(),
      current_stage: job.total_stages,
      total_stages: job.total_stages,
      stage_name: "Complete",
      percentage: 100,
      elapsed_ms: elapsed,
      estimated_remaining_ms: 0,
      estimated_total_ms: elapsed,
      message: `Pipeline complete in ${(elapsed / 1000).toFixed(1)}s`,
    });

    // Archive for history
    this.completedJobs.push({
      job_id,
      stage_timings: [...job.stage_timings],
    });
    if (this.completedJobs.length > this.config.history_window) {
      this.completedJobs.shift();
    }

    this.activeJobs.delete(job_id);
  }

  /**
   * Calculate ETA based on completed stages and history.
   */
  calculateETA(job: JobProgress): number {
    const completedTimings = job.stage_timings.filter(t => t.status === "complete");
    const remainingStages = job.total_stages - job.current_stage;

    if (completedTimings.length === 0) {
      // No history yet, use defaults
      return this.estimateTotalDuration(remainingStages);
    }

    // Calculate average duration from completed stages
    const avgDuration = completedTimings.reduce(
      (sum, t) => sum + (t.duration_ms || 0), 0
    ) / completedTimings.length;

    // Weight with historical data
    const historicalAvg = this.getHistoricalAverage();
    const weightedAvg = historicalAvg > 0
      ? avgDuration * (1 - this.config.history_weight) + historicalAvg * this.config.history_weight
      : avgDuration;

    return Math.round(weightedAvg * remainingStages);
  }

  /**
   * Get historical average stage duration.
   */
  getHistoricalAverage(): number {
    if (this.completedJobs.length === 0) return 0;

    let totalDuration = 0;
    let count = 0;

    for (const job of this.completedJobs) {
      for (const timing of job.stage_timings) {
        if (timing.duration_ms) {
          totalDuration += timing.duration_ms;
          count++;
        }
      }
    }

    return count > 0 ? totalDuration / count : 0;
  }

  /**
   * Estimate total duration for N stages.
   */
  estimateTotalDuration(stages: number): number {
    // Use category-based estimates
    let total = 0;
    for (let i = 1; i <= stages; i++) {
      const category = STAGE_CATEGORIES[i] || "parse";
      total += CATEGORY_DURATIONS[category] || this.config.default_stage_duration_ms;
    }
    return total;
  }

  /**
   * Emit progress event to listeners.
   */
  private emit(event: ProgressEvent): void {
    // Global listeners
    for (const listener of this.globalListeners) {
      try {
        listener(event);
      } catch (e) {
        if (this.config.verbose) {
          console.error("Progress listener error:", e);
        }
      }
    }

    // Job-specific listeners
    const jobListeners = this.listeners.get(event.job_id);
    if (jobListeners) {
      for (const listener of jobListeners) {
        try {
          listener(event);
        } catch (e) {
          if (this.config.verbose) {
            console.error("Progress listener error:", e);
          }
        }
      }
    }
  }

  /**
   * Subscribe to progress events for a specific job.
   */
  subscribe(job_id: string, listener: ProgressListener): () => void {
    if (!this.listeners.has(job_id)) {
      this.listeners.set(job_id, new Set());
    }
    this.listeners.get(job_id)!.add(listener);

    return () => {
      this.listeners.get(job_id)?.delete(listener);
    };
  }

  /**
   * Subscribe to all progress events.
   */
  subscribeAll(listener: ProgressListener): () => void {
    this.globalListeners.add(listener);
    return () => {
      this.globalListeners.delete(listener);
    };
  }

  /**
   * Get current progress for a job.
   */
  getProgress(job_id: string): JobProgress | undefined {
    return this.activeJobs.get(job_id);
  }

  /**
   * Get all active jobs.
   */
  getActiveJobs(): JobProgress[] {
    return Array.from(this.activeJobs.values());
  }

  /**
   * Update configuration.
   */
  configure(config: Partial<ProgressTrackerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration.
   */
  getConfig(): ProgressTrackerConfig {
    return { ...this.config };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const wedmProgressTrackerEngine = new WEDMProgressTrackerEngine();
export { WEDMProgressTrackerEngine };
