/**
 * PPGDriftCanaryEngine — U-PPG-SFC-12
 * ====================================
 *
 * Detects alarm-rate / line-reject-rate drift per dialect version using
 * Page–Hinkley CUSUM and fires Test-Time Adaptation when drift is detected.
 *
 * Implements canary deployment pattern for PPG dialect adapters:
 *   - shadow → 5% → 25% → 100% traffic ramp
 *   - Circuit-breaker rolls back adapter on regression
 *
 * References:
 *   - Page E.S. (1954) "Continuous inspection schemes"
 *   - Niu et al. ICML 2022 "Efficient Test-Time Model Adaptation" (EATA)
 *
 * @module engines/PPGDriftCanaryEngine
 * @milestone PSAU-PPG-SFC U-PPG-SFC-12
 */

import { testTimeAdaptationEngine } from "./TestTimeAdaptationEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Alarm event from PPG outcome capture */
export interface AlarmEvent {
  timestamp: number;
  dialect: string;
  dialect_version: string;
  controller: string;
  machine_id: string;
  alarm_code?: string;
  alarm_severity: "info" | "warning" | "error" | "critical";
  line_rejected: boolean;
  block_number?: number;
  lineage_id: string;
}

/** Dialect cohort key for grouping events */
export interface DialectCohortKey {
  dialect: string;
  dialect_version: string;
  controller: string;
}

/** Page-Hinkley state per cohort */
export interface PageHinkleyState {
  mUp: number;
  mDown: number;
  minUp: number;
  maxDown: number;
  baselineMean: number;
  eventCount: number;
  lastFiredAt: number;
}

/** Canary stage */
export type CanaryStage = "shadow" | "canary_5" | "canary_25" | "promoted" | "rolled_back";

/** Adapter canary state */
export interface DialectAdapterCanaryState {
  adapter_id: string;
  stage: CanaryStage;
  created_at: number;
  promoted_at?: number;
  rolled_back_at?: number;
  traffic_pct: number;
  events_at_stage: number;
  drift_events_at_stage: number;
  rollback_reason?: string;
}

/** Drift detection result */
export interface PPGDriftDetection {
  cohort: DialectCohortKey;
  drifted: boolean;
  cusum: number;
  fired_at_index: number;
  event_count: number;
  baseline_alarm_rate: number;
  current_alarm_rate: number;
  baseline_reject_rate: number;
  current_reject_rate: number;
}

/** TTA engagement result */
export interface PPGTTAEngagement {
  cohort: DialectCohortKey;
  adapted: boolean;
  bn_updates: number;
  lora_updates: number;
  entropy: number;
  model_id: string;
}

/** Circuit breaker state */
export interface CircuitBreakerState {
  adapter_id: string;
  failures: number;
  last_failure_at: number;
  tripped: boolean;
  tripped_at?: number;
}

/** Engine configuration */
export interface PPGDriftCanaryConfig {
  /** Page-Hinkley delta (shift magnitude to detect) */
  ph_delta: number;
  /** Page-Hinkley lambda (threshold for firing) */
  ph_lambda: number;
  /** Minimum events before drift detection */
  min_events: number;
  /** Baseline window size */
  baseline_window: number;
  /** Shadow period duration (ms) */
  shadow_duration_ms: number;
  /** Events required at each canary stage before promotion */
  events_per_stage: number;
  /** Max drift events before circuit breaker trips */
  circuit_breaker_threshold: number;
  /** Circuit breaker reset time (ms) */
  circuit_breaker_reset_ms: number;
  /** TTA entropy threshold */
  tta_entropy_threshold: number;
  /** TTA diversity threshold */
  tta_diversity_threshold: number;
  /** Weight for alarm rate in combined drift signal (vs reject rate) */
  alarm_rate_weight: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: PPGDriftCanaryConfig = {
  ph_delta: 0.02,
  ph_lambda: 0.5,
  min_events: 10,
  baseline_window: 50,
  shadow_duration_ms: 30 * 24 * 60 * 60 * 1000, // 30 days
  events_per_stage: 20,
  circuit_breaker_threshold: 3,
  circuit_breaker_reset_ms: 24 * 60 * 60 * 1000, // 24 hours
  tta_entropy_threshold: 2.5,
  tta_diversity_threshold: 0.01,
  alarm_rate_weight: 0.6, // 60% alarm, 40% reject
};

const CANARY_TRAFFIC: Record<CanaryStage, number> = {
  shadow: 0,
  canary_5: 5,
  canary_25: 25,
  promoted: 100,
  rolled_back: 0,
};

const ALARM_SEVERITY_WEIGHT: Record<string, number> = {
  info: 0.1,
  warning: 0.3,
  error: 0.7,
  critical: 1.0,
};

// ============================================================================
// ENGINE
// ============================================================================

class PPGDriftCanaryEngine {
  private config: PPGDriftCanaryConfig = { ...DEFAULT_CONFIG };
  private cohortStates: Map<string, PageHinkleyState> = new Map();
  private alarmHistory: Map<string, number[]> = new Map();
  private rejectHistory: Map<string, boolean[]> = new Map();
  private canaryStates: Map<string, DialectAdapterCanaryState> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private ttaConfigured: Set<string> = new Set();

  /**
   * Configure the engine.
   * @param config - Partial configuration override
   */
  configure(config: Partial<PPGDriftCanaryConfig>): PPGDriftCanaryConfig {
    this.config = { ...this.config, ...config };
    return { ...this.config };
  }

  /**
   * Get current configuration.
   */
  getConfig(): PPGDriftCanaryConfig {
    return { ...this.config };
  }

  /**
   * Clear all state (for testing).
   */
  clear(): void {
    this.cohortStates.clear();
    this.alarmHistory.clear();
    this.rejectHistory.clear();
    this.canaryStates.clear();
    this.circuitBreakers.clear();
    this.ttaConfigured.clear();
  }

  /**
   * Generate cohort key string.
   */
  private cohortKey(cohort: DialectCohortKey): string {
    return `${cohort.dialect}:${cohort.dialect_version}:${cohort.controller}`;
  }

  /**
   * Record an alarm event and check for drift.
   * @param event - Alarm event from PPG outcome capture
   * @returns Drift detection result with optional TTA engagement
   */
  recordAlarm(event: AlarmEvent): {
    drift: PPGDriftDetection;
    tta?: PPGTTAEngagement;
    canary?: DialectAdapterCanaryState;
  } {
    const cohort: DialectCohortKey = {
      dialect: event.dialect,
      dialect_version: event.dialect_version,
      controller: event.controller,
    };
    const key = this.cohortKey(cohort);

    // Calculate weighted alarm score (severity-weighted)
    const alarmScore = ALARM_SEVERITY_WEIGHT[event.alarm_severity] || 0;
    const rejected = event.line_rejected ? 1 : 0;

    // Track history
    const alarms = this.alarmHistory.get(key) || [];
    const rejects = this.rejectHistory.get(key) || [];
    alarms.push(alarmScore);
    rejects.push(event.line_rejected);

    // Trim to 2x baseline window
    const maxHistory = this.config.baseline_window * 2;
    if (alarms.length > maxHistory) {
      alarms.splice(0, alarms.length - maxHistory);
      rejects.splice(0, rejects.length - maxHistory);
    }
    this.alarmHistory.set(key, alarms);
    this.rejectHistory.set(key, rejects);

    // Get or initialize Page-Hinkley state
    let phState = this.cohortStates.get(key);
    if (!phState) {
      phState = {
        mUp: 0,
        mDown: 0,
        minUp: 0,
        maxDown: 0,
        baselineMean: 0,
        eventCount: 0,
        lastFiredAt: -1,
      };
    }

    // Increment event count BEFORE detection so it reflects the current event
    phState.eventCount++;

    // Update baseline if we have enough history
    if (alarms.length >= this.config.min_events && phState.eventCount <= this.config.baseline_window) {
      const baselineSlice = alarms.slice(0, Math.min(this.config.baseline_window, alarms.length));
      const rejectSlice = rejects.slice(0, Math.min(this.config.baseline_window, rejects.length));

      const alarmMean = baselineSlice.reduce((a, b) => a + b, 0) / baselineSlice.length;
      const rejectMean = rejectSlice.filter(Boolean).length / rejectSlice.length;

      // Combined signal: weighted average of alarm and reject rates
      phState.baselineMean =
        this.config.alarm_rate_weight * alarmMean +
        (1 - this.config.alarm_rate_weight) * rejectMean;
    }

    // Compute combined current signal
    const combinedSignal =
      this.config.alarm_rate_weight * alarmScore +
      (1 - this.config.alarm_rate_weight) * rejected;

    // Run Page-Hinkley update
    const drift = this.pageHinkleyUpdate(phState, combinedSignal, cohort, alarms, rejects);
    this.cohortStates.set(key, phState);

    let tta: PPGTTAEngagement | undefined;
    let canary: DialectAdapterCanaryState | undefined;

    // On drift, engage TTA
    if (drift.drifted) {
      tta = this.engageTTA(cohort, alarms);

      // Update or create canary state
      canary = this.updateCanaryOnDrift(key, cohort);
    } else {
      // Check for canary promotion
      canary = this.checkCanaryPromotion(key);
    }

    return { drift, tta, canary };
  }

  /**
   * Page-Hinkley CUSUM update.
   */
  private pageHinkleyUpdate(
    state: PageHinkleyState,
    value: number,
    cohort: DialectCohortKey,
    alarmHistory: number[],
    rejectHistory: boolean[],
  ): PPGDriftDetection {
    const delta = this.config.ph_delta;
    const lambda = this.config.ph_lambda;
    const baseline = state.baselineMean;

    // Update cumulative sums
    state.mUp += value - baseline - delta;
    state.mDown += value - baseline + delta;
    state.minUp = Math.min(state.minUp, state.mUp);
    state.maxDown = Math.max(state.maxDown, state.mDown);

    const up = state.mUp - state.minUp;
    const down = state.maxDown - state.mDown;
    const cusum = Math.max(up, down);
    const fired = up > lambda || down > lambda;

    // Calculate current rates from recent window
    const recentWindow = Math.min(this.config.min_events, alarmHistory.length);
    const recentAlarms = alarmHistory.slice(-recentWindow);
    const recentRejects = rejectHistory.slice(-recentWindow);

    const currentAlarmRate = recentAlarms.reduce((a, b) => a + b, 0) / recentAlarms.length;
    const currentRejectRate = recentRejects.filter(Boolean).length / recentRejects.length;

    // Calculate baseline rates
    const baselineWindow = Math.min(this.config.baseline_window, alarmHistory.length);
    const baselineAlarms = alarmHistory.slice(0, baselineWindow);
    const baselineRejects = rejectHistory.slice(0, baselineWindow);

    const baselineAlarmRate = baselineAlarms.length > 0
      ? baselineAlarms.reduce((a, b) => a + b, 0) / baselineAlarms.length
      : 0;
    const baselineRejectRate = baselineRejects.length > 0
      ? baselineRejects.filter(Boolean).length / baselineRejects.length
      : 0;

    const detection: PPGDriftDetection = {
      cohort,
      drifted: fired && state.eventCount >= this.config.min_events,
      cusum: Math.round(cusum * 1000) / 1000,
      fired_at_index: fired ? state.eventCount : -1,
      event_count: state.eventCount,
      baseline_alarm_rate: Math.round(baselineAlarmRate * 1000) / 1000,
      current_alarm_rate: Math.round(currentAlarmRate * 1000) / 1000,
      baseline_reject_rate: Math.round(baselineRejectRate * 1000) / 1000,
      current_reject_rate: Math.round(currentRejectRate * 1000) / 1000,
    };

    if (fired) {
      // Reset Page-Hinkley state after firing
      state.mUp = 0;
      state.mDown = 0;
      state.minUp = 0;
      state.maxDown = 0;
      state.lastFiredAt = state.eventCount;
    }

    return detection;
  }

  /**
   * Engage Test-Time Adaptation (BN + LoRA-A only).
   */
  private engageTTA(cohort: DialectCohortKey, alarmHistory: number[]): PPGTTAEngagement {
    const modelId = `ppg-${this.cohortKey(cohort)}`;

    // Configure TTA if not already done
    if (!this.ttaConfigured.has(modelId)) {
      testTimeAdaptationEngine.configure({
        model_id: modelId,
        entropy_threshold: this.config.tta_entropy_threshold,
        diversity_threshold: this.config.tta_diversity_threshold,
        adaptation_lr: 0.001,
        adapt_bn: true,
        adapt_lora_a: true,
        fisher_alpha: 0.1,
      });
      this.ttaConfigured.add(modelId);
    }

    // Prepare logits from alarm history (simulate as soft-target distribution)
    const recentHistory = alarmHistory.slice(-10);
    const sampleLogits = recentHistory.length > 0
      ? recentHistory.map(r => Math.log(Math.max(r, 0.001)))
      : [0, 0, 0];

    // Pad to minimum 3 elements
    while (sampleLogits.length < 3) {
      sampleLogits.push(sampleLogits[sampleLogits.length - 1] || 0);
    }

    // Attempt adaptation
    const result = testTimeAdaptationEngine.adapt({
      model_id: modelId,
      sample_logits: sampleLogits,
    });

    return {
      cohort,
      adapted: result.adapted,
      bn_updates: result.bn_updates,
      lora_updates: result.lora_updates,
      entropy: Math.round(result.entropy * 1000) / 1000,
      model_id: modelId,
    };
  }

  /**
   * Update canary state on drift detection.
   */
  private updateCanaryOnDrift(key: string, cohort: DialectCohortKey): DialectAdapterCanaryState {
    const adapterId = `adapter-ppg-${key}-${Date.now()}`;
    let canary = this.canaryStates.get(key);

    if (!canary) {
      // New canary in shadow mode
      canary = {
        adapter_id: adapterId,
        stage: "shadow",
        created_at: Date.now(),
        traffic_pct: 0,
        events_at_stage: 0,
        drift_events_at_stage: 0,
      };
    } else {
      // Existing canary saw drift - increment counter
      canary.drift_events_at_stage++;

      // Check circuit breaker
      const cb = this.checkCircuitBreaker(canary.adapter_id);
      if (cb.tripped) {
        canary.stage = "rolled_back";
        canary.rolled_back_at = Date.now();
        canary.traffic_pct = 0;
        canary.rollback_reason = "circuit_breaker_tripped";
      }
    }

    this.canaryStates.set(key, canary);
    return { ...canary };
  }

  /**
   * Check and potentially trip circuit breaker.
   */
  private checkCircuitBreaker(adapterId: string): CircuitBreakerState {
    let cb = this.circuitBreakers.get(adapterId);

    if (!cb) {
      cb = {
        adapter_id: adapterId,
        failures: 0,
        last_failure_at: 0,
        tripped: false,
      };
    }

    // Reset if enough time has passed
    if (cb.last_failure_at > 0 && Date.now() - cb.last_failure_at > this.config.circuit_breaker_reset_ms) {
      cb.failures = 0;
      cb.tripped = false;
    }

    // Increment failure count
    cb.failures++;
    cb.last_failure_at = Date.now();

    // Trip if threshold exceeded
    if (cb.failures >= this.config.circuit_breaker_threshold) {
      cb.tripped = true;
      cb.tripped_at = Date.now();
    }

    this.circuitBreakers.set(adapterId, cb);
    return { ...cb };
  }

  /**
   * Check for canary promotion (when no drift).
   */
  private checkCanaryPromotion(key: string): DialectAdapterCanaryState | undefined {
    const canary = this.canaryStates.get(key);
    if (!canary || canary.stage === "promoted" || canary.stage === "rolled_back") {
      return canary;
    }

    canary.events_at_stage++;

    // Check promotion conditions
    if (canary.events_at_stage >= this.config.events_per_stage && canary.drift_events_at_stage === 0) {
      const nextStage = this.getNextStage(canary.stage);
      if (nextStage !== canary.stage) {
        canary.stage = nextStage;
        canary.traffic_pct = CANARY_TRAFFIC[nextStage];
        canary.events_at_stage = 0;
        canary.drift_events_at_stage = 0;

        if (nextStage === "promoted") {
          canary.promoted_at = Date.now();
        }
      }
    }

    this.canaryStates.set(key, canary);
    return { ...canary };
  }

  /**
   * Get next canary stage.
   */
  private getNextStage(current: CanaryStage): CanaryStage {
    const progression: CanaryStage[] = ["shadow", "canary_5", "canary_25", "promoted"];
    const idx = progression.indexOf(current);
    return idx >= 0 && idx < progression.length - 1 ? progression[idx + 1] : current;
  }

  /**
   * Get cohort statistics.
   */
  getCohortStats(cohort: DialectCohortKey): {
    event_count: number;
    baseline_alarm_rate: number;
    baseline_reject_rate: number;
  } | undefined {
    const key = this.cohortKey(cohort);
    const state = this.cohortStates.get(key);
    const alarms = this.alarmHistory.get(key) || [];
    const rejects = this.rejectHistory.get(key) || [];

    if (!state) return undefined;

    const baselineWindow = Math.min(this.config.baseline_window, alarms.length);
    const baselineAlarms = alarms.slice(0, baselineWindow);
    const baselineRejects = rejects.slice(0, baselineWindow);

    return {
      event_count: state.eventCount,
      baseline_alarm_rate: baselineAlarms.length > 0
        ? baselineAlarms.reduce((a, b) => a + b, 0) / baselineAlarms.length
        : 0,
      baseline_reject_rate: baselineRejects.length > 0
        ? baselineRejects.filter(Boolean).length / baselineRejects.length
        : 0,
    };
  }

  /**
   * Get canary state for cohort.
   */
  getCanaryState(cohort: DialectCohortKey): DialectAdapterCanaryState | undefined {
    const key = this.cohortKey(cohort);
    const canary = this.canaryStates.get(key);
    return canary ? { ...canary } : undefined;
  }

  /**
   * Get traffic percentage for cohort.
   */
  getTrafficPct(cohort: DialectCohortKey): number {
    const canary = this.getCanaryState(cohort);
    return canary?.traffic_pct ?? 0;
  }

  /**
   * Check if adapter should be used for cohort.
   */
  shouldUseAdapter(cohort: DialectCohortKey): boolean {
    const canary = this.getCanaryState(cohort);
    if (!canary || canary.stage === "rolled_back") return false;
    if (canary.stage === "shadow") return false;

    // Random sampling based on traffic percentage
    return Math.random() * 100 < canary.traffic_pct;
  }

  /**
   * Manually rollback an adapter.
   */
  rollback(cohort: DialectCohortKey, reason: string): DialectAdapterCanaryState | undefined {
    const key = this.cohortKey(cohort);
    const canary = this.canaryStates.get(key);

    if (!canary) return undefined;

    canary.stage = "rolled_back";
    canary.rolled_back_at = Date.now();
    canary.traffic_pct = 0;
    canary.rollback_reason = reason;

    this.canaryStates.set(key, canary);
    return { ...canary };
  }

  /**
   * List all active canaries.
   */
  listCanaries(): DialectAdapterCanaryState[] {
    return Array.from(this.canaryStates.values()).map(c => ({ ...c }));
  }

  /**
   * Reset a cohort (for testing).
   */
  resetCohort(cohort: DialectCohortKey): boolean {
    const key = this.cohortKey(cohort);
    const existed = this.cohortStates.has(key);

    this.cohortStates.delete(key);
    this.alarmHistory.delete(key);
    this.rejectHistory.delete(key);
    this.canaryStates.delete(key);

    return existed;
  }

  /**
   * Run a canary test to verify exit criteria.
   * @param baselineAlarmRate - Baseline alarm rate (e.g., 0.1 for 10%)
   * @param driftAlarmRate - Drift alarm rate (e.g., 0.5 for 50%)
   * @param baselineEvents - Number of baseline events
   * @param driftEvents - Number of drift events to inject
   */
  runCanaryTest(
    baselineAlarmRate: number,
    driftAlarmRate: number,
    baselineEvents: number,
    driftEvents: number,
  ): {
    passed: boolean;
    events_to_detection: number;
    detection_event: number;
    details: Array<{ event: number; cohort: DialectCohortKey; drifted: boolean; cusum: number }>;
  } {
    // Clear state for clean test
    const testCohort: DialectCohortKey = {
      dialect: "canary-test",
      dialect_version: "1.0",
      controller: "test-ctrl",
    };
    this.resetCohort(testCohort);

    const details: Array<{ event: number; cohort: DialectCohortKey; drifted: boolean; cusum: number }> = [];
    let detectionEvent = -1;
    let eventsToDetection = -1;

    // Feed baseline events (low alarm rate)
    for (let i = 0; i < baselineEvents; i++) {
      const isAlarm = Math.random() < baselineAlarmRate;
      const event: AlarmEvent = {
        timestamp: Date.now() + i * 1000,
        dialect: testCohort.dialect,
        dialect_version: testCohort.dialect_version,
        controller: testCohort.controller,
        machine_id: "test-machine",
        alarm_severity: isAlarm ? "warning" : "info",
        line_rejected: Math.random() < baselineAlarmRate * 0.5,
        lineage_id: `baseline-${i}`,
      };

      const result = this.recordAlarm(event);
      details.push({
        event: i,
        cohort: result.drift.cohort,
        drifted: result.drift.drifted,
        cusum: result.drift.cusum,
      });
    }

    // Feed drift events (high alarm rate)
    for (let i = 0; i < driftEvents; i++) {
      const eventIdx = baselineEvents + i;
      const isAlarm = Math.random() < driftAlarmRate;
      const event: AlarmEvent = {
        timestamp: Date.now() + eventIdx * 1000,
        dialect: testCohort.dialect,
        dialect_version: testCohort.dialect_version,
        controller: testCohort.controller,
        machine_id: "test-machine",
        alarm_severity: isAlarm ? "error" : "warning",
        line_rejected: Math.random() < driftAlarmRate * 0.8,
        lineage_id: `drift-${i}`,
      };

      const result = this.recordAlarm(event);
      details.push({
        event: eventIdx,
        cohort: result.drift.cohort,
        drifted: result.drift.drifted,
        cusum: result.drift.cusum,
      });

      if (result.drift.drifted && detectionEvent === -1) {
        detectionEvent = eventIdx;
        eventsToDetection = i + 1;
      }
    }

    return {
      passed: eventsToDetection > 0 && eventsToDetection <= 10,
      events_to_detection: eventsToDetection,
      detection_event: detectionEvent,
      details,
    };
  }
}

// Export singleton
export const ppgDriftCanaryEngine = new PPGDriftCanaryEngine();
