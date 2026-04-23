/**
 * AttractorDetectionEngine — Dynamical Systems Stability Analysis
 *
 * USSH Phase 0.25: Scientific Foundations — Nonlinear Dynamics
 *
 * Detects attractors (stable states) in session/hook behavior:
 *   - Fixed point detection (equilibria)
 *   - Limit cycle detection (periodic orbits)
 *   - Basin of attraction estimation
 *   - Lyapunov exponent approximation
 *   - Bifurcation detection
 *
 * Theory:
 *   An attractor A is a set where:
 *   1. A is invariant: trajectories starting in A stay in A
 *   2. A attracts nearby trajectories: ∃ neighborhood U, lim_{t→∞} d(x(t), A) = 0
 *
 * Types:
 *   - Fixed point: x* where f(x*) = x*
 *   - Limit cycle: periodic orbit with period T
 *   - Strange attractor: fractal structure (chaotic systems)
 *
 * @module engines/AttractorDetectionEngine
 * @milestone USSH-P0.25/U-SCI05
 */

// ============================================================================
// TYPES
// ============================================================================

export interface StateVector {
  values: number[];
  timestamp?: number;
  label?: string;
}

export interface FixedPoint {
  location: number[];
  stability: "stable" | "unstable" | "saddle" | "unknown";
  eigenvalues?: { real: number; imag: number }[];
  basin_radius?: number;
}

export interface LimitCycle {
  period: number;
  amplitude: number[];
  center: number[];
  stability: "stable" | "unstable" | "unknown";
  points: number[][];
}

export interface Attractor {
  type: "fixed_point" | "limit_cycle" | "quasi_periodic" | "strange" | "unknown";
  fixed_point?: FixedPoint;
  limit_cycle?: LimitCycle;
  dimension: number;
  lyapunov_exponent?: number;
  correlation_dimension?: number;
}

export interface TrajectoryAnalysis {
  trajectory: StateVector[];
  attractors: Attractor[];
  transient_time: number;
  convergence_rate: number;
  is_chaotic: boolean;
  recurrence_rate: number;
}

export interface BifurcationPoint {
  parameter_value: number;
  type: "saddle_node" | "hopf" | "period_doubling" | "transcritical" | "pitchfork" | "unknown";
  before_attractor: Attractor | null;
  after_attractor: Attractor | null;
}

export interface StabilityMetrics {
  max_lyapunov: number;
  average_lyapunov: number;
  is_stable: boolean;
  is_chaotic: boolean;
  predictability_horizon: number;
}

export interface AttractorConfig {
  fixed_point_tolerance: number;
  cycle_detection_window: number;
  min_cycle_length: number;
  max_cycle_length: number;
  recurrence_threshold: number;
  lyapunov_steps: number;
  embedding_dimension: number;
  embedding_delay: number;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: AttractorConfig = {
  fixed_point_tolerance: 1e-4,
  cycle_detection_window: 100,
  min_cycle_length: 2,
  max_cycle_length: 50,
  recurrence_threshold: 0.1,
  lyapunov_steps: 50,
  embedding_dimension: 3,
  embedding_delay: 1,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class AttractorDetectionEngine {
  private config: AttractorConfig;
  private trajectory: StateVector[];
  private detectedAttractors: Attractor[];

  constructor(config?: Partial<AttractorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.trajectory = [];
    this.detectedAttractors = [];
  }

  /**
   * Add a state observation to the trajectory.
   */
  observe(state: StateVector): void {
    this.trajectory.push({
      ...state,
      timestamp: state.timestamp ?? Date.now(),
    });

    // Limit trajectory length
    if (this.trajectory.length > 10000) {
      this.trajectory = this.trajectory.slice(-5000);
    }
  }

  /**
   * Add multiple observations.
   */
  observeBatch(states: StateVector[]): void {
    for (const state of states) {
      this.observe(state);
    }
  }

  /**
   * Detect fixed points in the trajectory.
   */
  detectFixedPoints(): FixedPoint[] {
    if (this.trajectory.length < 10) {
      return [];
    }

    const fixedPoints: FixedPoint[] = [];
    const dim = this.trajectory[0].values.length;
    const tolerance = this.config.fixed_point_tolerance;

    // Look for regions where state changes are minimal
    const windowSize = Math.min(20, Math.floor(this.trajectory.length / 5));

    for (let i = windowSize; i < this.trajectory.length; i++) {
      const window = this.trajectory.slice(i - windowSize, i);
      const center = this.computeMean(window);
      const variance = this.computeVariance(window, center);

      // If variance is below threshold, potential fixed point
      const totalVariance = variance.reduce((a, b) => a + b, 0);

      if (totalVariance < tolerance * dim) {
        // Check if this is a new fixed point
        const isNew = !fixedPoints.some(fp =>
          this.distance(fp.location, center) < tolerance * 10
        );

        if (isNew) {
          // Estimate stability via local Jacobian approximation
          const stability = this.estimateStability(window);

          fixedPoints.push({
            location: center,
            stability,
            basin_radius: this.estimateBasinRadius(center),
          });
        }
      }
    }

    return fixedPoints;
  }

  /**
   * Detect limit cycles (periodic orbits).
   */
  detectLimitCycles(): LimitCycle[] {
    if (this.trajectory.length < this.config.min_cycle_length * 3) {
      return [];
    }

    const cycles: LimitCycle[] = [];
    const n = this.trajectory.length;

    // Use recurrence analysis to find periodic behavior
    for (let period = this.config.min_cycle_length;
         period <= Math.min(this.config.max_cycle_length, Math.floor(n / 3));
         period++) {

      let recurrenceCount = 0;
      let totalDistance = 0;

      for (let i = period; i < n; i++) {
        const dist = this.distance(
          this.trajectory[i].values,
          this.trajectory[i - period].values
        );

        if (dist < this.config.recurrence_threshold) {
          recurrenceCount++;
        }
        totalDistance += dist;
      }

      const recurrenceRate = recurrenceCount / (n - period);
      const avgDistance = totalDistance / (n - period);

      // High recurrence rate suggests periodicity
      if (recurrenceRate > 0.7 && avgDistance < this.config.recurrence_threshold * 2) {
        // Extract cycle points
        const cycleStart = Math.max(0, n - period * 2);
        const cyclePoints = this.trajectory
          .slice(cycleStart, cycleStart + period)
          .map(s => s.values);

        const center = this.computeMean(
          this.trajectory.slice(cycleStart, cycleStart + period)
        );
        const amplitude = this.computeAmplitude(cyclePoints, center);

        // Check if this is a new cycle
        const isNew = !cycles.some(c =>
          Math.abs(c.period - period) < period * 0.1
        );

        if (isNew) {
          cycles.push({
            period,
            amplitude,
            center,
            stability: "stable",
            points: cyclePoints,
          });
        }
      }
    }

    return cycles;
  }

  /**
   * Analyze full trajectory and detect all attractors.
   */
  analyze(): TrajectoryAnalysis {
    const fixedPoints = this.detectFixedPoints();
    const limitCycles = this.detectLimitCycles();

    const attractors: Attractor[] = [];

    // Convert fixed points to attractors
    for (const fp of fixedPoints) {
      attractors.push({
        type: "fixed_point",
        fixed_point: fp,
        dimension: fp.location.length,
        lyapunov_exponent: fp.stability === "stable" ? -0.1 : 0.1,
      });
    }

    // Convert limit cycles to attractors
    for (const lc of limitCycles) {
      attractors.push({
        type: "limit_cycle",
        limit_cycle: lc,
        dimension: lc.center.length,
        lyapunov_exponent: 0, // Neutral in cycle direction
      });
    }

    // If no structured attractors, check for strange attractor
    if (attractors.length === 0 && this.trajectory.length > 100) {
      const lyap = this.estimateLyapunovExponent();
      if (lyap > 0.01) {
        attractors.push({
          type: "strange",
          dimension: this.config.embedding_dimension,
          lyapunov_exponent: lyap,
          correlation_dimension: this.estimateCorrelationDimension(),
        });
      }
    }

    // Estimate transient time
    const transientTime = this.estimateTransientTime();

    // Compute convergence rate
    const convergenceRate = this.computeConvergenceRate();

    // Check for chaos
    const isChaotic = this.estimateLyapunovExponent() > 0.01;

    // Compute recurrence rate
    const recurrenceRate = this.computeRecurrenceRate();

    this.detectedAttractors = attractors;

    return {
      trajectory: [...this.trajectory],
      attractors,
      transient_time: transientTime,
      convergence_rate: convergenceRate,
      is_chaotic: isChaotic,
      recurrence_rate: recurrenceRate,
    };
  }

  /**
   * Estimate the largest Lyapunov exponent.
   */
  estimateLyapunovExponent(): number {
    if (this.trajectory.length < this.config.lyapunov_steps * 2) {
      return 0;
    }

    // Simplified Rosenstein algorithm
    const n = this.trajectory.length;
    const dim = this.trajectory[0].values.length;
    let sumLog = 0;
    let count = 0;

    for (let i = 0; i < n - this.config.lyapunov_steps; i += 10) {
      // Find nearest neighbor
      let minDist = Infinity;
      let nearestIdx = -1;

      for (let j = 0; j < n; j++) {
        if (Math.abs(i - j) < 10) continue; // Temporal separation

        const dist = this.distance(
          this.trajectory[i].values,
          this.trajectory[j].values
        );

        if (dist > 1e-10 && dist < minDist) {
          minDist = dist;
          nearestIdx = j;
        }
      }

      if (nearestIdx < 0 || nearestIdx + this.config.lyapunov_steps >= n) {
        continue;
      }

      // Track divergence
      const futureDist = this.distance(
        this.trajectory[i + this.config.lyapunov_steps].values,
        this.trajectory[nearestIdx + this.config.lyapunov_steps].values
      );

      if (futureDist > 1e-10 && minDist > 1e-10) {
        sumLog += Math.log(futureDist / minDist);
        count++;
      }
    }

    return count > 0 ? sumLog / (count * this.config.lyapunov_steps) : 0;
  }

  /**
   * Get stability metrics for the system.
   */
  getStabilityMetrics(): StabilityMetrics {
    const maxLyap = this.estimateLyapunovExponent();

    return {
      max_lyapunov: maxLyap,
      average_lyapunov: maxLyap, // Simplified
      is_stable: maxLyap < 0,
      is_chaotic: maxLyap > 0.01,
      predictability_horizon: maxLyap > 0 ? 1 / maxLyap : Infinity,
    };
  }

  /**
   * Detect bifurcations by varying a parameter.
   */
  detectBifurcations(
    parameterValues: number[],
    trajectoryGenerator: (param: number) => StateVector[]
  ): BifurcationPoint[] {
    const bifurcations: BifurcationPoint[] = [];
    let prevAttractor: Attractor | null = null;

    for (let i = 0; i < parameterValues.length; i++) {
      const param = parameterValues[i];
      const trajectory = trajectoryGenerator(param);

      this.clear();
      this.observeBatch(trajectory);
      const analysis = this.analyze();

      const currentAttractor = analysis.attractors[0] ?? null;

      // Check for qualitative change
      if (prevAttractor && currentAttractor) {
        if (prevAttractor.type !== currentAttractor.type) {
          bifurcations.push({
            parameter_value: param,
            type: this.classifyBifurcation(prevAttractor, currentAttractor),
            before_attractor: prevAttractor,
            after_attractor: currentAttractor,
          });
        }
      }

      prevAttractor = currentAttractor;
    }

    return bifurcations;
  }

  /**
   * Compute recurrence plot data.
   */
  computeRecurrencePlot(threshold?: number): boolean[][] {
    const eps = threshold ?? this.config.recurrence_threshold;
    const n = this.trajectory.length;
    const plot: boolean[][] = [];

    for (let i = 0; i < n; i++) {
      plot[i] = [];
      for (let j = 0; j < n; j++) {
        const dist = this.distance(
          this.trajectory[i].values,
          this.trajectory[j].values
        );
        plot[i][j] = dist < eps;
      }
    }

    return plot;
  }

  /**
   * Get detected attractors.
   */
  getAttractors(): Attractor[] {
    return [...this.detectedAttractors];
  }

  /**
   * Get trajectory length.
   */
  getTrajectoryLength(): number {
    return this.trajectory.length;
  }

  /**
   * Get current state (last observation).
   */
  getCurrentState(): StateVector | null {
    return this.trajectory.length > 0
      ? { ...this.trajectory[this.trajectory.length - 1] }
      : null;
  }

  /**
   * Check if system has converged to an attractor.
   */
  hasConverged(): boolean {
    if (this.trajectory.length < 50) return false;

    const recentWindow = this.trajectory.slice(-50);
    const center = this.computeMean(recentWindow);
    const variance = this.computeVariance(recentWindow, center);
    const totalVariance = variance.reduce((a, b) => a + b, 0);

    return totalVariance < this.config.fixed_point_tolerance * 10;
  }

  /**
   * Get configuration.
   */
  getConfig(): AttractorConfig {
    return { ...this.config };
  }

  /**
   * Update configuration.
   */
  setConfig(config: Partial<AttractorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Clear trajectory data.
   */
  clear(): void {
    this.trajectory = [];
    this.detectedAttractors = [];
  }

  /**
   * Export state.
   */
  export(): {
    config: AttractorConfig;
    trajectory: StateVector[];
    attractors: Attractor[];
  } {
    return {
      config: { ...this.config },
      trajectory: [...this.trajectory],
      attractors: [...this.detectedAttractors],
    };
  }

  /**
   * Import state.
   */
  import(data: {
    config?: AttractorConfig;
    trajectory?: StateVector[];
    attractors?: Attractor[];
  }): void {
    if (data.config) this.config = { ...this.config, ...data.config };
    if (data.trajectory) this.trajectory = [...data.trajectory];
    if (data.attractors) this.detectedAttractors = [...data.attractors];
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private distance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - (b[i] ?? 0);
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  private computeMean(states: StateVector[]): number[] {
    if (states.length === 0) return [];

    const dim = states[0].values.length;
    const mean = new Array(dim).fill(0);

    for (const state of states) {
      for (let i = 0; i < dim; i++) {
        mean[i] += state.values[i];
      }
    }

    for (let i = 0; i < dim; i++) {
      mean[i] /= states.length;
    }

    return mean;
  }

  private computeVariance(states: StateVector[], mean: number[]): number[] {
    if (states.length === 0) return [];

    const dim = mean.length;
    const variance = new Array(dim).fill(0);

    for (const state of states) {
      for (let i = 0; i < dim; i++) {
        const diff = state.values[i] - mean[i];
        variance[i] += diff * diff;
      }
    }

    for (let i = 0; i < dim; i++) {
      variance[i] /= states.length;
    }

    return variance;
  }

  private computeAmplitude(points: number[][], center: number[]): number[] {
    if (points.length === 0) return [];

    const dim = center.length;
    const amplitude = new Array(dim).fill(0);

    for (const point of points) {
      for (let i = 0; i < dim; i++) {
        amplitude[i] = Math.max(amplitude[i], Math.abs(point[i] - center[i]));
      }
    }

    return amplitude;
  }

  private estimateStability(window: StateVector[]): "stable" | "unstable" | "saddle" | "unknown" {
    if (window.length < 5) return "unknown";

    // Compute rate of convergence/divergence
    const center = this.computeMean(window);
    const distances: number[] = [];

    for (const state of window) {
      distances.push(this.distance(state.values, center));
    }

    // Check trend
    let increasing = 0;
    let decreasing = 0;

    for (let i = 1; i < distances.length; i++) {
      if (distances[i] > distances[i - 1]) increasing++;
      else if (distances[i] < distances[i - 1]) decreasing++;
    }

    if (decreasing > increasing * 2) return "stable";
    if (increasing > decreasing * 2) return "unstable";
    return "saddle";
  }

  private estimateBasinRadius(center: number[]): number {
    // Find maximum distance that still converges to this center
    let maxRadius = 0;

    for (const state of this.trajectory) {
      const dist = this.distance(state.values, center);
      if (dist > maxRadius && dist < this.config.recurrence_threshold * 10) {
        maxRadius = dist;
      }
    }

    return maxRadius;
  }

  private estimateTransientTime(): number {
    if (this.trajectory.length < 20) return 0;

    const finalMean = this.computeMean(this.trajectory.slice(-20));

    for (let i = 0; i < this.trajectory.length - 20; i++) {
      const dist = this.distance(this.trajectory[i].values, finalMean);
      if (dist < this.config.recurrence_threshold) {
        return i;
      }
    }

    return this.trajectory.length;
  }

  private computeConvergenceRate(): number {
    if (this.trajectory.length < 20) return 0;

    const finalMean = this.computeMean(this.trajectory.slice(-10));
    const initialDist = this.distance(this.trajectory[0].values, finalMean);
    const midDist = this.distance(
      this.trajectory[Math.floor(this.trajectory.length / 2)].values,
      finalMean
    );

    if (initialDist < 1e-10) return 0;

    const ratio = midDist / initialDist;
    return ratio > 0 ? -Math.log(ratio) / (this.trajectory.length / 2) : 0;
  }

  private computeRecurrenceRate(): number {
    if (this.trajectory.length < 10) return 0;

    let recurrences = 0;
    let total = 0;

    for (let i = 0; i < this.trajectory.length; i++) {
      for (let j = i + 1; j < this.trajectory.length; j++) {
        const dist = this.distance(
          this.trajectory[i].values,
          this.trajectory[j].values
        );
        if (dist < this.config.recurrence_threshold) {
          recurrences++;
        }
        total++;
      }
    }

    return total > 0 ? recurrences / total : 0;
  }

  private estimateCorrelationDimension(): number {
    // Grassberger-Procaccia algorithm (simplified)
    if (this.trajectory.length < 50) return 0;

    const epsilons = [0.01, 0.05, 0.1, 0.2, 0.5];
    const correlations: { eps: number; corr: number }[] = [];

    for (const eps of epsilons) {
      let count = 0;
      let total = 0;

      for (let i = 0; i < this.trajectory.length; i++) {
        for (let j = i + 1; j < this.trajectory.length; j++) {
          const dist = this.distance(
            this.trajectory[i].values,
            this.trajectory[j].values
          );
          if (dist < eps) count++;
          total++;
        }
      }

      if (count > 0) {
        correlations.push({ eps, corr: count / total });
      }
    }

    // Estimate slope of log-log plot
    if (correlations.length < 2) return 0;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const n = correlations.length;

    for (const c of correlations) {
      const x = Math.log(c.eps);
      const y = Math.log(c.corr);
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return Math.max(0, slope);
  }

  private classifyBifurcation(
    before: Attractor,
    after: Attractor
  ): BifurcationPoint["type"] {
    // Fixed point to limit cycle: Hopf bifurcation
    if (before.type === "fixed_point" && after.type === "limit_cycle") {
      return "hopf";
    }

    // Fixed point disappears: saddle-node
    if (before.type === "fixed_point" && after.type === "unknown") {
      return "saddle_node";
    }

    // Period doubling (cycle period doubles)
    if (before.type === "limit_cycle" && after.type === "limit_cycle") {
      const beforePeriod = before.limit_cycle?.period ?? 0;
      const afterPeriod = after.limit_cycle?.period ?? 0;
      if (Math.abs(afterPeriod - 2 * beforePeriod) < beforePeriod * 0.1) {
        return "period_doubling";
      }
    }

    return "unknown";
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const attractorDetectionEngine = new AttractorDetectionEngine();
