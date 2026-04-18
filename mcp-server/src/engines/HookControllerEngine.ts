/**
 * HookControllerEngine — PID Controller for Hook Aggression
 *
 * USSH Phase 0.25: Scientific Foundations — Control Theory Enhancement
 *
 * The hook system is a feedback control loop. This engine provides:
 *   - PID control for dynamic hook aggression adjustment
 *   - Stability analysis via Lyapunov-inspired metrics
 *   - Setpoint tracking for target quality levels
 *   - Anti-windup for integral term
 *
 * Control Model:
 *   - State: x = [block_rate, quality_score, latency]
 *   - Input: u = hook_aggression ∈ [0, 1]
 *   - Output: y = effective_quality
 *   - Goal: Minimize |y - setpoint| while avoiding system instability
 *
 * PID Formula:
 *   u(t) = Kp*e(t) + Ki*∫e(τ)dτ + Kd*de/dt
 *
 * @module engines/HookControllerEngine
 * @milestone USSH-P0.25/U-SCI03
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface PIDGains {
  Kp: number; // Proportional gain
  Ki: number; // Integral gain
  Kd: number; // Derivative gain
}

export interface ControllerState {
  error: number;
  integral: number;
  derivative: number;
  previous_error: number;
  output: number;
  timestamp: number;
}

export interface SystemMetrics {
  block_rate: number; // Fraction of tool calls blocked [0, 1]
  quality_score: number; // Current S(x) or quality metric [0, 1]
  latency_ms: number; // Hook execution latency
  throughput: number; // Tool calls per second
}

export interface ControlOutput {
  aggression: number; // Hook aggression level [0, 1]
  action: "tighten" | "relax" | "maintain";
  confidence: number;
  state: ControllerState;
}

export interface StabilityMetrics {
  lyapunov_value: number; // V(x) = x'Px
  lyapunov_derivative: number; // V̇(x)
  is_stable: boolean;
  stability_margin: number;
  trend: "improving" | "degrading" | "stable";
}

export interface ControllerConfig {
  gains: PIDGains;
  setpoint: number;
  output_min: number;
  output_max: number;
  anti_windup_limit: number;
  derivative_filter_alpha: number;
  sample_interval_ms: number;
  stability_threshold: number;
}

export interface TuningResult {
  gains: PIDGains;
  settling_time: number;
  overshoot: number;
  steady_state_error: number;
  is_stable: boolean;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: ControllerConfig = {
  gains: {
    Kp: 0.8, // Proportional: respond to current error
    Ki: 0.1, // Integral: eliminate steady-state error
    Kd: 0.05, // Derivative: dampen oscillations
  },
  setpoint: 0.85, // Target quality score
  output_min: 0.0, // Minimum aggression (advisory only)
  output_max: 1.0, // Maximum aggression (hard block)
  anti_windup_limit: 2.0, // Limit integral accumulation
  derivative_filter_alpha: 0.1, // Low-pass filter for derivative
  sample_interval_ms: 1000, // Control loop interval
  stability_threshold: 0.1, // Lyapunov stability threshold
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class HookControllerEngine {
  private config: ControllerConfig;
  private state: ControllerState;
  private history: { timestamp: number; metrics: SystemMetrics; output: number }[];
  private filteredDerivative: number;

  constructor(config?: Partial<ControllerConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      gains: { ...DEFAULT_CONFIG.gains, ...config?.gains },
    };
    this.state = this.initState();
    this.history = [];
    this.filteredDerivative = 0;
  }

  /**
   * Compute control output given current system metrics.
   */
  compute(metrics: SystemMetrics): ControlOutput {
    const now = Date.now();
    const dt = Math.max(
      (now - this.state.timestamp) / 1000,
      this.config.sample_interval_ms / 1000
    );

    // Error = setpoint - current value
    const error = this.config.setpoint - metrics.quality_score;

    // Integral with anti-windup
    let integral = this.state.integral + error * dt;
    integral = Math.max(
      -this.config.anti_windup_limit,
      Math.min(this.config.anti_windup_limit, integral)
    );

    // Derivative with low-pass filter
    const rawDerivative = (error - this.state.previous_error) / dt;
    this.filteredDerivative =
      this.config.derivative_filter_alpha * rawDerivative +
      (1 - this.config.derivative_filter_alpha) * this.filteredDerivative;

    // PID output
    const output =
      this.config.gains.Kp * error +
      this.config.gains.Ki * integral +
      this.config.gains.Kd * this.filteredDerivative;

    // Clamp to valid range
    const aggression = Math.max(
      this.config.output_min,
      Math.min(this.config.output_max, output)
    );

    // Update state
    this.state = {
      error,
      integral,
      derivative: this.filteredDerivative,
      previous_error: error,
      output: aggression,
      timestamp: now,
    };

    // Record history
    this.history.push({ timestamp: now, metrics, output: aggression });
    if (this.history.length > 1000) this.history.shift();

    // Determine action
    let action: "tighten" | "relax" | "maintain";
    if (error > 0.05) {
      action = "tighten";
    } else if (error < -0.05) {
      action = "relax";
    } else {
      action = "maintain";
    }

    const confidence = 1 - Math.abs(error);

    return {
      aggression,
      action,
      confidence,
      state: { ...this.state },
    };
  }

  /**
   * Get current setpoint.
   */
  getSetpoint(): number {
    return this.config.setpoint;
  }

  /**
   * Update setpoint dynamically.
   */
  setSetpoint(value: number): void {
    this.config.setpoint = Math.max(0, Math.min(1, value));
  }

  /**
   * Get current PID gains.
   */
  getGains(): PIDGains {
    return { ...this.config.gains };
  }

  /**
   * Update PID gains.
   */
  setGains(gains: Partial<PIDGains>): void {
    this.config.gains = { ...this.config.gains, ...gains };
  }

  /**
   * Get current controller state.
   */
  getState(): ControllerState {
    return { ...this.state };
  }

  /**
   * Compute stability metrics using Lyapunov-inspired analysis.
   */
  computeStability(): StabilityMetrics {
    if (this.history.length < 2) {
      return {
        lyapunov_value: 0,
        lyapunov_derivative: 0,
        is_stable: true,
        stability_margin: 1,
        trend: "stable",
      };
    }

    // Lyapunov function: V(x) = e² + Ki*integral²
    // Stable if V̇ < 0 (energy decreasing)
    const e = this.state.error;
    const i = this.state.integral;
    const V = e * e + this.config.gains.Ki * i * i;

    // Approximate V̇ from history
    const recent = this.history.slice(-10);
    let Vdot = 0;
    if (recent.length >= 2) {
      const V_prev =
        Math.pow(this.config.setpoint - recent[0].metrics.quality_score, 2);
      const V_now =
        Math.pow(this.config.setpoint - recent[recent.length - 1].metrics.quality_score, 2);
      const dt = (recent[recent.length - 1].timestamp - recent[0].timestamp) / 1000;
      Vdot = dt > 0 ? (V_now - V_prev) / dt : 0;
    }

    const isStable = Vdot <= this.config.stability_threshold;
    const stabilityMargin = isStable ? 1 - Vdot / this.config.stability_threshold : 0;

    let trend: "improving" | "degrading" | "stable";
    if (Vdot < -this.config.stability_threshold) {
      trend = "improving";
    } else if (Vdot > this.config.stability_threshold) {
      trend = "degrading";
    } else {
      trend = "stable";
    }

    return {
      lyapunov_value: V,
      lyapunov_derivative: Vdot,
      is_stable: isStable,
      stability_margin: Math.max(0, stabilityMargin),
      trend,
    };
  }

  /**
   * Auto-tune PID gains using Ziegler-Nichols method.
   */
  autoTune(oscillationPeriod: number, ultimateGain: number): TuningResult {
    // Ziegler-Nichols PID tuning
    const Ku = ultimateGain;
    const Tu = oscillationPeriod;

    const Kp = 0.6 * Ku;
    const Ki = 2 * Kp / Tu;
    const Kd = Kp * Tu / 8;

    const gains: PIDGains = { Kp, Ki, Kd };
    this.setGains(gains);

    // Estimate performance metrics
    const settlingTime = 4 * Tu;
    const overshoot = 0.25; // Typical for Z-N tuning
    const steadyStateError = 0; // With integral, should be zero

    return {
      gains,
      settling_time: settlingTime,
      overshoot,
      steady_state_error: steadyStateError,
      is_stable: true,
    };
  }

  /**
   * Conservative tuning (less aggressive, more stable).
   */
  tuneConservative(): void {
    this.setGains({
      Kp: 0.4,
      Ki: 0.05,
      Kd: 0.02,
    });
  }

  /**
   * Aggressive tuning (faster response, risk of overshoot).
   */
  tuneAggressive(): void {
    this.setGains({
      Kp: 1.2,
      Ki: 0.2,
      Kd: 0.1,
    });
  }

  /**
   * Get control history.
   */
  getHistory(limit?: number): { timestamp: number; metrics: SystemMetrics; output: number }[] {
    const h = [...this.history];
    return limit ? h.slice(-limit) : h;
  }

  /**
   * Get performance metrics from history.
   */
  getPerformanceMetrics(): {
    avg_error: number;
    max_error: number;
    avg_latency: number;
    block_rate: number;
    samples: number;
  } {
    if (this.history.length === 0) {
      return { avg_error: 0, max_error: 0, avg_latency: 0, block_rate: 0, samples: 0 };
    }

    let sumError = 0;
    let maxError = 0;
    let sumLatency = 0;
    let sumBlockRate = 0;

    for (const h of this.history) {
      const error = Math.abs(this.config.setpoint - h.metrics.quality_score);
      sumError += error;
      maxError = Math.max(maxError, error);
      sumLatency += h.metrics.latency_ms;
      sumBlockRate += h.metrics.block_rate;
    }

    const n = this.history.length;
    return {
      avg_error: sumError / n,
      max_error: maxError,
      avg_latency: sumLatency / n,
      block_rate: sumBlockRate / n,
      samples: n,
    };
  }

  /**
   * Check if system is saturating (too many blocks).
   */
  isSaturating(threshold: number = 0.8): boolean {
    if (this.history.length < 5) return false;

    const recent = this.history.slice(-5);
    const avgBlockRate =
      recent.reduce((sum, h) => sum + h.metrics.block_rate, 0) / recent.length;

    return avgBlockRate > threshold;
  }

  /**
   * Reset controller state (keep gains).
   */
  resetState(): void {
    this.state = this.initState();
    this.filteredDerivative = 0;
  }

  /**
   * Clear history.
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Full reset.
   */
  reset(): void {
    this.config = {
      ...DEFAULT_CONFIG,
      gains: { ...DEFAULT_CONFIG.gains },
    };
    this.state = this.initState();
    this.history = [];
    this.filteredDerivative = 0;
  }

  /**
   * Get configuration.
   */
  getConfig(): ControllerConfig {
    return {
      ...this.config,
      gains: { ...this.config.gains },
    };
  }

  /**
   * Export state for persistence.
   */
  export(): {
    config: ControllerConfig;
    state: ControllerState;
    history: { timestamp: number; metrics: SystemMetrics; output: number }[];
  } {
    return {
      config: this.getConfig(),
      state: { ...this.state },
      history: [...this.history],
    };
  }

  /**
   * Import state.
   */
  import(data: {
    config: ControllerConfig;
    state: ControllerState;
    history: { timestamp: number; metrics: SystemMetrics; output: number }[];
  }): void {
    this.config = { ...data.config, gains: { ...data.config.gains } };
    this.state = { ...data.state };
    this.history = [...data.history];
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private initState(): ControllerState {
    return {
      error: 0,
      integral: 0,
      derivative: 0,
      previous_error: 0,
      output: 0.5, // Start at medium aggression
      timestamp: Date.now(),
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const hookControllerEngine = new HookControllerEngine();
