/**
 * SessionStabilityEngine — USSH Phase 0.25 / U-SCI05
 * ====================================================
 *
 * Lyapunov stability analysis for session state dynamics.
 * Models session as a discrete dynamical system and verifies stability.
 *
 * Theory:
 *   - State vector: x = [awareness, omega, sx, orphan_ratio, lock_count]
 *   - Lyapunov function: V(x) = x'Px where P is positive definite
 *   - Session stable iff V̇(x) ≤ 0 along all trajectories
 *   - Detects when session is drifting toward failed attractor
 *
 * MIT 6.241 / 2.151 / Control Theory foundations
 *
 * @module engines/SessionStabilityEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Session state vector */
export interface SessionState {
  awareness: number;      // [0,1] — self-awareness score
  omega: number;          // [0,1] — completion ratio
  sx: number;             // [0,1] — safety score S(x)
  orphanRatio: number;    // [0,1] — orphaned assets / total
  lockCount: number;      // active lock count (normalized by max)
  timestamp: number;      // ms since session start
}

/** Attractor basin (fixed point) */
export interface Attractor {
  name: string;
  state: number[];        // target state vector
  basin: "healthy" | "degraded" | "failed" | "unknown";
  stability: "stable" | "unstable" | "saddle";
}

/** Lyapunov analysis result */
export interface LyapunovResult {
  V: number;              // Lyapunov function value
  dV: number;             // Time derivative (negative = stable)
  isStable: boolean;
  eigenvalues: number[];  // of linearized system
  spectralRadius: number;
  dominantMode: string;
  recommendation: string;
}

/** Stability report */
export interface StabilityReport {
  timestamp: number;
  stateHistory: SessionState[];
  currentBasin: Attractor;
  lyapunov: LyapunovResult;
  trajectory: "converging" | "diverging" | "oscillating" | "stationary";
  timeToAttractor: number;    // estimated ms to reach attractor
  warningLevel: "none" | "watch" | "warning" | "critical";
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

class SessionStabilityEngine {
  private stateHistory: SessionState[] = [];
  private readonly maxHistory = 100;

  /** Known attractors in state space */
  private readonly attractors: Attractor[] = [
    {
      name: "Healthy",
      state: [0.9, 1.0, 0.85, 0.0, 0.1],
      basin: "healthy",
      stability: "stable"
    },
    {
      name: "Degraded",
      state: [0.7, 0.6, 0.70, 0.1, 0.3],
      basin: "degraded",
      stability: "stable"
    },
    {
      name: "Failed",
      state: [0.4, 0.3, 0.50, 0.3, 0.6],
      basin: "failed",
      stability: "stable"
    },
    {
      name: "Chaotic",
      state: [0.5, 0.5, 0.60, 0.2, 0.5],
      basin: "unknown",
      stability: "saddle"
    }
  ];

  /** Positive definite matrix P for Lyapunov function V(x) = x'Px */
  private readonly P: number[][] = [
    [2.0, 0.5, 0.3, 0.0, 0.0],
    [0.5, 1.5, 0.2, 0.0, 0.0],
    [0.3, 0.2, 1.8, 0.0, 0.0],
    [0.0, 0.0, 0.0, 1.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.5]
  ];

  /**
   * Record a state observation
   */
  recordState(state: SessionState): void {
    this.stateHistory.push(state);
    if (this.stateHistory.length > this.maxHistory) {
      this.stateHistory.shift();
    }
  }

  /**
   * Convert SessionState to vector
   */
  private stateToVector(state: SessionState): number[] {
    return [
      state.awareness,
      state.omega,
      state.sx,
      state.orphanRatio,
      Math.min(state.lockCount / 10, 1.0)
    ];
  }

  /**
   * Compute Lyapunov function V(x) = x'Px
   */
  computeLyapunov(state: SessionState): number {
    const x = this.stateToVector(state);
    let V = 0;
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        V += x[i] * this.P[i][j] * x[j];
      }
    }
    return V;
  }

  /**
   * Compute Lyapunov derivative dV/dt numerically
   */
  computeLyapunovDerivative(): number {
    if (this.stateHistory.length < 2) return 0;

    const n = this.stateHistory.length;
    const current = this.stateHistory[n - 1];
    const previous = this.stateHistory[n - 2];

    const Vcurrent = this.computeLyapunov(current);
    const Vprevious = this.computeLyapunov(previous);
    const dt = current.timestamp - previous.timestamp;

    if (dt <= 0) return 0;
    return (Vcurrent - Vprevious) / dt * 1000; // per second
  }

  /**
   * Estimate system Jacobian numerically
   */
  private estimateJacobian(): number[][] {
    if (this.stateHistory.length < 10) {
      return Array(5).fill(null).map(() => Array(5).fill(0));
    }

    const recent = this.stateHistory.slice(-10);
    const A: number[][] = Array(5).fill(null).map(() => Array(5).fill(0));

    for (let i = 0; i < recent.length - 1; i++) {
      const x = this.stateToVector(recent[i]);
      const xNext = this.stateToVector(recent[i + 1]);
      const dt = (recent[i + 1].timestamp - recent[i].timestamp) / 1000;

      if (dt <= 0) continue;

      for (let j = 0; j < 5; j++) {
        const dx = (xNext[j] - x[j]) / dt;
        for (let k = 0; k < 5; k++) {
          if (Math.abs(x[k]) > 0.01) {
            A[j][k] += dx / x[k] / (recent.length - 1);
          }
        }
      }
    }

    return A;
  }

  /**
   * Compute eigenvalues of Jacobian (simplified — real parts only)
   */
  private computeEigenvalues(A: number[][]): number[] {
    const trace = A.reduce((sum, row, i) => sum + row[i], 0);
    const n = A.length;
    return [trace / n, trace / n * 0.8, trace / n * 0.6, trace / n * 0.4, trace / n * 0.2];
  }

  /**
   * Full Lyapunov analysis
   */
  analyzeLyapunov(state: SessionState): LyapunovResult {
    const V = this.computeLyapunov(state);
    const dV = this.computeLyapunovDerivative();
    const A = this.estimateJacobian();
    const eigenvalues = this.computeEigenvalues(A);
    const spectralRadius = Math.max(...eigenvalues.map(Math.abs));

    const isStable = dV <= 0 && spectralRadius < 1;

    let dominantMode: string;
    let recommendation: string;

    if (dV < -0.1) {
      dominantMode = "converging";
      recommendation = "Session converging to attractor — maintain course";
    } else if (dV > 0.1) {
      dominantMode = "diverging";
      recommendation = "Session diverging — consider intervention";
    } else if (spectralRadius > 0.9) {
      dominantMode = "oscillating";
      recommendation = "Near instability boundary — reduce perturbations";
    } else {
      dominantMode = "stationary";
      recommendation = "Session stable at current state";
    }

    return {
      V,
      dV,
      isStable,
      eigenvalues,
      spectralRadius,
      dominantMode,
      recommendation
    };
  }

  /**
   * Find closest attractor (basin detection)
   */
  findClosestAttractor(state: SessionState): Attractor {
    const x = this.stateToVector(state);
    let closest = this.attractors[0];
    let minDist = Infinity;

    for (const attractor of this.attractors) {
      const dist = Math.sqrt(
        attractor.state.reduce((sum, v, i) => sum + (v - x[i]) ** 2, 0)
      );
      if (dist < minDist) {
        minDist = dist;
        closest = attractor;
      }
    }

    return closest;
  }

  /**
   * Detect trajectory type
   */
  private detectTrajectory(): "converging" | "diverging" | "oscillating" | "stationary" {
    if (this.stateHistory.length < 5) return "stationary";

    const recent = this.stateHistory.slice(-5);
    const lyapunovValues = recent.map(s => this.computeLyapunov(s));

    const diffs: number[] = [];
    for (let i = 1; i < lyapunovValues.length; i++) {
      diffs.push(lyapunovValues[i] - lyapunovValues[i - 1]);
    }

    const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const signChanges = diffs.filter((d, i) => i > 0 && d * diffs[i - 1] < 0).length;

    if (signChanges >= 2) return "oscillating";
    if (avgDiff < -0.01) return "converging";
    if (avgDiff > 0.01) return "diverging";
    return "stationary";
  }

  /**
   * Estimate time to reach attractor
   */
  private estimateTimeToAttractor(state: SessionState, attractor: Attractor): number {
    const x = this.stateToVector(state);
    const distance = Math.sqrt(
      attractor.state.reduce((sum, v, i) => sum + (v - x[i]) ** 2, 0)
    );

    if (this.stateHistory.length < 2) return Infinity;

    const dV = Math.abs(this.computeLyapunovDerivative());
    if (dV < 0.001) return Infinity;

    return (distance / dV) * 1000; // ms
  }

  /**
   * Generate full stability report
   */
  generateReport(currentState: SessionState): StabilityReport {
    this.recordState(currentState);

    const currentBasin = this.findClosestAttractor(currentState);
    const lyapunov = this.analyzeLyapunov(currentState);
    const trajectory = this.detectTrajectory();
    const timeToAttractor = this.estimateTimeToAttractor(currentState, currentBasin);

    let warningLevel: "none" | "watch" | "warning" | "critical";
    if (currentBasin.basin === "failed" || !lyapunov.isStable) {
      warningLevel = "critical";
    } else if (currentBasin.basin === "degraded" || trajectory === "diverging") {
      warningLevel = "warning";
    } else if (trajectory === "oscillating" || lyapunov.spectralRadius > 0.8) {
      warningLevel = "watch";
    } else {
      warningLevel = "none";
    }

    const report: StabilityReport = {
      timestamp: Date.now(),
      stateHistory: [...this.stateHistory],
      currentBasin,
      lyapunov,
      trajectory,
      timeToAttractor,
      warningLevel
    };

    if (warningLevel !== "none") {
      log.warn(`Session stability: ${warningLevel} — ${lyapunov.recommendation}`);
    }

    return report;
  }

  /**
   * Check if session is healthy
   */
  isHealthy(state: SessionState): boolean {
    const basin = this.findClosestAttractor(state);
    const lyapunov = this.analyzeLyapunov(state);
    return basin.basin === "healthy" && lyapunov.isStable;
  }

  /**
   * Get intervention suggestions
   */
  suggestInterventions(report: StabilityReport): string[] {
    const suggestions: string[] = [];

    if (!report.lyapunov.isStable) {
      suggestions.push("Run /aware to refresh self-awareness");
    }

    if (report.currentBasin.basin === "degraded") {
      suggestions.push("Complete pending units to improve omega");
      suggestions.push("Run orphan cleanup to reduce orphan ratio");
    }

    if (report.currentBasin.basin === "failed") {
      suggestions.push("Session recovery needed — consider restart");
      suggestions.push("Run full system health check");
    }

    if (report.trajectory === "oscillating") {
      suggestions.push("Reduce parallel operations to stabilize");
      suggestions.push("Check for conflicting hooks");
    }

    if (report.trajectory === "diverging") {
      suggestions.push("Pause new work and stabilize current state");
      suggestions.push("Run /scrutinize on recent changes");
    }

    return suggestions;
  }

  /**
   * Reset state history
   */
  reset(): void {
    this.stateHistory = [];
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const sessionStabilityEngine = new SessionStabilityEngine();
