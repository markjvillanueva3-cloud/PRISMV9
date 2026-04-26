/**
 * SFCDriftCanaryEngine — U-PPG-SFC-11
 * ====================================
 *
 * Detects operator override rate drift per (material × tool × machine) using
 * Page–Hinkley CUSUM and fires Test-Time Adaptation when drift is detected.
 *
 * Implements canary deployment pattern:
 *   - 5% → 25% → 100% traffic ramp
 *   - Circuit-breaker rolls back adapter on regression
 *
 * References:
 *   - Page E.S. (1954) "Continuous inspection schemes"
 *   - Niu et al. ICML 2022 "Efficient Test-Time Model Adaptation" (EATA)
 *
 * @module engines/SFCDriftCanaryEngine
 * @milestone PSAU-PPG-SFC U-PPG-SFC-11
 */

import { testTimeAdaptationEngine } from "./TestTimeAdaptationEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Override event from outcome capture */
export interface OverrideEvent {
  timestamp: number;
  material: string;
  tool_class: string;
  machine_id: string;
  recommended_sfm: number;
  actual_sfm: number;
  override_factor: number;
  lineage_id: string;
}

/** Cohort key for grouping events */
export interface CohortKey {
  material: string;
  tool_class: string;
  machine_id: string;
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
export interface AdapterCanaryState {
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
export interface DriftDetection {
  cohort: CohortKey;
  drifted: boolean;
  cusum: number;
  fired_at_index: number;
  event_count: number;
  baseline_override_rate: number;
  current_override_rate: number;
}

/** TTA engagement result */
export interface TTAEngagement {
  cohort: CohortKey;
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
export interface SFCDriftCanaryConfig {
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
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: SFCDriftCanaryConfig = {
  ph_delta: 0.02,
  ph_lambda: 0.5,
  min_events: 10,
  baseline_window: 50,
  shadow_duration_ms: 30 * 24 * 60 * 60 * 1000, // 30 days
  events_per_stage: 20,
  circuit_breaker_threshold: 3,
  circuit_breaker_reset_ms: 24 * 60 * 60 * 1000, // 24 hours
  tta_entropy_threshold: 0.3,
  tta_diversity_threshold: 0.1,
};

const CANARY_TRAFFIC: Record<CanaryStage, number> = {
  shadow: 0,
  canary_5: 5,
  canary_25: 25,
  promoted: 100,
  rolled_back: 0,
};

// ============================================================================
// ENGINE
// ============================================================================

class SFCDriftCanaryEngine {
  private config: SFCDriftCanaryConfig = { ...DEFAULT_CONFIG };
  private cohortStates: Map<string, PageHinkleyState> = new Map();
  private overrideHistory: Map<string, number[]> = new Map();
  private canaryStates: Map<string, AdapterCanaryState> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private ttaConfigured: Set<string> = new Set();

  /**
   * Configure the engine.
   * @param config - Partial configuration override
   */
  configure(config: Partial<SFCDriftCanaryConfig>): SFCDriftCanaryConfig {
    this.config = { ...this.config, ...config };
    return { ...this.config };
  }

  /**
   * Get current configuration.
   */
  getConfig(): SFCDriftCanaryConfig {
    return { ...this.config };
  }

  /**
   * Generate cohort key string.
   */
  private cohortKey(cohort: CohortKey): string {
    return `${cohort.material}:${cohort.tool_class}:${cohort.machine_id}`;
  }

  /**
   * Record an override event and check for drift.
   * @param event - Override event from outcome capture
   * @returns Drift detection result with optional TTA engagement
   */
  recordOverride(event: OverrideEvent): {
    drift: DriftDetection;
    tta?: TTAEngagement;
    canary?: AdapterCanaryState;
  } {
    const cohort: CohortKey = {
      material: event.material,
      tool_class: event.tool_class,
      machine_id: event.machine_id,
    };
    const key = this.cohortKey(cohort);

    // Calculate override rate (deviation from 1.0)
    const overrideRate = Math.abs(1 - event.override_factor);

    // Track history
    const history = this.overrideHistory.get(key) || [];
    history.push(overrideRate);
    if (history.length > this.config.baseline_window * 2) {
      history.splice(0, history.length - this.config.baseline_window * 2);
    }
    this.overrideHistory.set(key, history);

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

    // Update baseline if we have enough history
    if (history.length >= this.config.min_events && phState.eventCount < this.config.baseline_window) {
      const baselineSlice = history.slice(0, Math.min(this.config.baseline_window, history.length));
      phState.baselineMean = baselineSlice.reduce((a, b) => a + b, 0) / baselineSlice.length;
    }

    // Increment event count BEFORE detection so it reflects the current event
    phState.eventCount++;

    // Run Page-Hinkley update
    const drift = this.pageHinkleyUpdate(phState, overrideRate, cohort, history);
    this.cohortStates.set(key, phState);

    let tta: TTAEngagement | undefined;
    let canary: AdapterCanaryState | undefined;

    // On drift, engage TTA
    if (drift.drifted) {
      tta = this.engageTTA(cohort, history);

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
    cohort: CohortKey,
    history: number[],
  ): DriftDetection {
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

    // Calculate current override rate from recent window
    const recentWindow = Math.min(this.config.min_events, history.length);
    const recentSlice = history.slice(-recentWindow);
    const currentRate = recentSlice.reduce((a, b) => a + b, 0) / recentSlice.length;

    const detection: DriftDetection = {
      cohort,
      drifted: fired && state.eventCount >= this.config.min_events,
      cusum: Math.round(cusum * 1000) / 1000,
      fired_at_index: fired ? state.eventCount : -1,
      event_count: state.eventCount,
      baseline_override_rate: Math.round(baseline * 1000) / 1000,
      current_override_rate: Math.round(currentRate * 1000) / 1000,
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
  private engageTTA(cohort: CohortKey, history: number[]): TTAEngagement {
    const modelId = `sfc-${this.cohortKey(cohort)}`;

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

    // Prepare logits from override history (simulate as soft-target distribution)
    const recentHistory = history.slice(-10);
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
  private updateCanaryOnDrift(key: string, cohort: CohortKey): AdapterCanaryState {
    const adapterId = `adapter-sfc-${key}-${Date.now()}`;
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
   * Check circuit breaker for adapter.
   */
  private checkCircuitBreaker(adapterId: string): CircuitBreakerState {
    let cb = this.circuitBreakers.get(adapterId);

    if (!cb) {
      cb = {
        adapter_id: adapterId,
        failures: 1,
        last_failure_at: Date.now(),
        tripped: false,
      };
    } else {
      // Check if reset period has passed
      if (Date.now() - cb.last_failure_at > this.config.circuit_breaker_reset_ms) {
        cb.failures = 1;
        cb.tripped = false;
        cb.tripped_at = undefined;
      } else {
        cb.failures++;
        cb.last_failure_at = Date.now();
      }

      // Trip if threshold exceeded
      if (cb.failures >= this.config.circuit_breaker_threshold) {
        cb.tripped = true;
        cb.tripped_at = Date.now();
      }
    }

    this.circuitBreakers.set(adapterId, cb);
    return { ...cb };
  }

  /**
   * Check if canary should be promoted to next stage.
   */
  private checkCanaryPromotion(key: string): AdapterCanaryState | undefined {
    const canary = this.canaryStates.get(key);
    if (!canary || canary.stage === "promoted" || canary.stage === "rolled_back") {
      return canary;
    }

    canary.events_at_stage++;

    // Check if enough events at current stage without drift
    if (canary.events_at_stage >= this.config.events_per_stage && canary.drift_events_at_stage === 0) {
      const nextStage = this.getNextCanaryStage(canary.stage);
      if (nextStage) {
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
  private getNextCanaryStage(current: CanaryStage): CanaryStage | null {
    const progression: CanaryStage[] = ["shadow", "canary_5", "canary_25", "promoted"];
    const idx = progression.indexOf(current);
    if (idx >= 0 && idx < progression.length - 1) {
      return progression[idx + 1];
    }
    return null;
  }

  /**
   * Get traffic percentage for a cohort based on canary state.
   * @param cohort - Cohort key
   * @returns Traffic percentage (0-100)
   */
  getTrafficPct(cohort: CohortKey): number {
    const key = this.cohortKey(cohort);
    const canary = this.canaryStates.get(key);
    return canary?.traffic_pct ?? 0;
  }

  /**
   * Check if adapter should be used for a request.
   * @param cohort - Cohort key
   * @returns true if adapter should be applied
   */
  shouldUseAdapter(cohort: CohortKey): boolean {
    const trafficPct = this.getTrafficPct(cohort);
    if (trafficPct <= 0) return false;
    if (trafficPct >= 100) return true;
    return Math.random() * 100 < trafficPct;
  }

  /**
   * Get canary state for a cohort.
   */
  getCanaryState(cohort: CohortKey): AdapterCanaryState | undefined {
    const key = this.cohortKey(cohort);
    const canary = this.canaryStates.get(key);
    return canary ? { ...canary } : undefined;
  }

  /**
   * Get drift detection stats for a cohort.
   */
  getCohortStats(cohort: CohortKey): {
    event_count: number;
    baseline_override_rate: number;
    history_length: number;
    ph_state: PageHinkleyState | undefined;
  } | undefined {
    const key = this.cohortKey(cohort);
    const phState = this.cohortStates.get(key);
    const history = this.overrideHistory.get(key);

    if (!phState) return undefined;

    return {
      event_count: phState.eventCount,
      baseline_override_rate: phState.baselineMean,
      history_length: history?.length ?? 0,
      ph_state: { ...phState },
    };
  }

  /**
   * List all cohorts with canary state.
   */
  listCanaries(): Array<{ cohort: CohortKey; state: AdapterCanaryState }> {
    const result: Array<{ cohort: CohortKey; state: AdapterCanaryState }> = [];
    for (const [key, state] of this.canaryStates) {
      const [material, tool_class, machine_id] = key.split(":");
      result.push({
        cohort: { material, tool_class, machine_id },
        state: { ...state },
      });
    }
    return result;
  }

  /**
   * Manually rollback an adapter.
   */
  rollback(cohort: CohortKey, reason: string): AdapterCanaryState | undefined {
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
   * Reset state for a cohort.
   */
  resetCohort(cohort: CohortKey): boolean {
    const key = this.cohortKey(cohort);
    this.cohortStates.delete(key);
    this.overrideHistory.delete(key);
    this.canaryStates.delete(key);
    return true;
  }

  /**
   * Clear all state.
   */
  clear(): void {
    this.cohortStates.clear();
    this.overrideHistory.clear();
    this.canaryStates.clear();
    this.circuitBreakers.clear();
    this.ttaConfigured.clear();
  }

  /**
   * Run canary test: inject drift and verify detection fires within threshold.
   */
  runCanaryTest(
    baselineOverrideRate: number,
    driftMagnitude: number,
    eventsBeforeDrift: number,
    eventsAfterDrift: number,
  ): {
    passed: boolean;
    detection_event: number;
    events_to_detection: number;
    details: DriftDetection[];
  } {
    const testCohort: CohortKey = {
      material: "canary-test",
      tool_class: "canary-test",
      machine_id: "canary-test",
    };

    this.resetCohort(testCohort);
    const detections: DriftDetection[] = [];

    // Baseline events
    for (let i = 0; i < eventsBeforeDrift; i++) {
      const event: OverrideEvent = {
        timestamp: Date.now() + i * 1000,
        material: testCohort.material,
        tool_class: testCohort.tool_class,
        machine_id: testCohort.machine_id,
        recommended_sfm: 300,
        actual_sfm: 300 * (1 - baselineOverrideRate),
        override_factor: 1 - baselineOverrideRate,
        lineage_id: `canary-${i}`,
      };
      const result = this.recordOverride(event);
      detections.push(result.drift);
    }

    // Drift events
    let detectionEvent = -1;
    for (let i = 0; i < eventsAfterDrift; i++) {
      const driftedRate = baselineOverrideRate + driftMagnitude;
      const event: OverrideEvent = {
        timestamp: Date.now() + (eventsBeforeDrift + i) * 1000,
        material: testCohort.material,
        tool_class: testCohort.tool_class,
        machine_id: testCohort.machine_id,
        recommended_sfm: 300,
        actual_sfm: 300 * (1 - driftedRate),
        override_factor: 1 - driftedRate,
        lineage_id: `canary-drift-${i}`,
      };
      const result = this.recordOverride(event);
      detections.push(result.drift);

      if (result.drift.drifted && detectionEvent < 0) {
        detectionEvent = eventsBeforeDrift + i;
      }
    }

    this.resetCohort(testCohort);

    const eventsToDetection = detectionEvent >= 0 ? detectionEvent - eventsBeforeDrift + 1 : -1;

    return {
      passed: detectionEvent >= 0 && eventsToDetection <= 10,
      detection_event: detectionEvent,
      events_to_detection: eventsToDetection,
      details: detections,
    };
  }

  static getSelfAwareness() {
    return {
      name: "SFCDriftCanaryEngine",
      version: "1.0.0",
      milestone: "PSAU-PPG-SFC U-PPG-SFC-11",
      capabilities: [
        "recordOverride",
        "getTrafficPct",
        "shouldUseAdapter",
        "getCanaryState",
        "getCohortStats",
        "listCanaries",
        "rollback",
        "runCanaryTest",
      ],
      references: [
        "Page E.S. 1954 - Page-Hinkley CUSUM for sequential drift detection",
        "Niu et al. ICML 2022 - EATA for test-time adaptation",
      ],
    };
  }
}

export const sfcDriftCanaryEngine = new SFCDriftCanaryEngine();
