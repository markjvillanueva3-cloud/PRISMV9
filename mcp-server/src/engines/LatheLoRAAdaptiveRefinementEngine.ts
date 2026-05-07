/**
 * LatheLoRAAdaptiveRefinementEngine — LATHE-LORA-MS0 U-LLR27
 * ==========================================================
 *
 * Adaptively refines LatheLoRA outputs based on feedback.
 * Implements iterative improvement with convergence detection.
 *
 * Features:
 *   - Iterative refinement loops
 *   - Feedback integration
 *   - Convergence detection
 *   - Quality tracking
 *
 * @module engines/LatheLoRAAdaptiveRefinementEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Refinement status */
export type RefinementStatus = "pending" | "refining" | "converged" | "max_iterations" | "failed";

/** Feedback type */
export type FeedbackType = "correction" | "improvement" | "rejection" | "approval";

/** Feedback entry */
export interface Feedback {
  id: string;
  type: FeedbackType;
  content: string;
  dimension?: string;
  severity?: "minor" | "moderate" | "major";
  timestamp: number;
}

/** Refinement iteration */
export interface RefinementIteration {
  iteration: number;
  input: string;
  output: string;
  feedback?: Feedback;
  quality_score: number;
  improvement_delta: number;
  duration_ms: number;
}

/** Refinement session */
export interface RefinementSession {
  id: string;
  original_query: string;
  original_response: string;
  iterations: RefinementIteration[];
  current_best: string;
  best_quality_score: number;
  status: RefinementStatus;
  convergence_threshold: number;
  max_iterations: number;
  created_at: number;
  completed_at?: number;
}

/** Quality dimensions */
export interface QualityDimensions {
  physics_accuracy: number;
  safety_compliance: number;
  completeness: number;
  clarity: number;
  actionability: number;
  overall: number;
}

/** Engine configuration */
export interface RefinementConfig {
  max_iterations: number;
  convergence_threshold: number;
  min_improvement: number;
  quality_weights: {
    physics: number;
    safety: number;
    completeness: number;
    clarity: number;
    actionability: number;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: RefinementConfig = {
  max_iterations: 5,
  convergence_threshold: 0.90,
  min_improvement: 0.02,
  quality_weights: {
    physics: 0.30,
    safety: 0.25,
    completeness: 0.20,
    clarity: 0.15,
    actionability: 0.10,
  },
};

/** Quality indicators for scoring */
const QUALITY_INDICATORS = {
  physics: ["sfm", "rpm", "feed", "force", "kienzle", "taylor", "depth", "speed", "n/mm", "m/min"],
  safety: ["g50", "spindle limit", "clearance", "collision", "safe", "verify", "check"],
  completeness: ["first", "then", "next", "finally", "step", "because", "therefore"],
  clarity: ["specifically", "for example", "in this case", "recommend", "suggest"],
  actionability: ["set", "use", "program", "g-code", "m-code", "command", "enter"],
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRAAdaptiveRefinementEngine {
  private config: RefinementConfig = DEFAULT_CONFIG;
  private sessions: Map<string, RefinementSession> = new Map();

  /**
   * Set configuration
   */
  setConfig(config: Partial<RefinementConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): RefinementConfig {
    return { ...this.config };
  }

  /**
   * Start refinement session
   */
  startSession(query: string, initialResponse: string): RefinementSession {
    const session: RefinementSession = {
      id: `refine-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      original_query: query,
      original_response: initialResponse,
      iterations: [],
      current_best: initialResponse,
      best_quality_score: this.scoreQuality(initialResponse).overall,
      status: "pending",
      convergence_threshold: this.config.convergence_threshold,
      max_iterations: this.config.max_iterations,
      created_at: Date.now(),
    };

    // Record initial iteration
    session.iterations.push({
      iteration: 0,
      input: query,
      output: initialResponse,
      quality_score: session.best_quality_score,
      improvement_delta: 0,
      duration_ms: 0,
    });

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Score response quality across dimensions
   */
  scoreQuality(response: string): QualityDimensions {
    const lower = response.toLowerCase();

    const countMatches = (indicators: string[]): number => {
      const found = indicators.filter(i => lower.includes(i.toLowerCase())).length;
      return Math.min(1, found / Math.max(1, indicators.length / 2));
    };

    const physics = countMatches(QUALITY_INDICATORS.physics);
    const safety = countMatches(QUALITY_INDICATORS.safety);
    const completeness = countMatches(QUALITY_INDICATORS.completeness);
    const clarity = countMatches(QUALITY_INDICATORS.clarity);
    const actionability = countMatches(QUALITY_INDICATORS.actionability);

    const overall =
      physics * this.config.quality_weights.physics +
      safety * this.config.quality_weights.safety +
      completeness * this.config.quality_weights.completeness +
      clarity * this.config.quality_weights.clarity +
      actionability * this.config.quality_weights.actionability;

    return {
      physics_accuracy: physics,
      safety_compliance: safety,
      completeness,
      clarity,
      actionability,
      overall,
    };
  }

  /**
   * Add feedback to session
   */
  addFeedback(sessionId: string, feedback: Omit<Feedback, "id" | "timestamp">): Feedback | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const fb: Feedback = {
      id: `fb-${Date.now()}`,
      ...feedback,
      timestamp: Date.now(),
    };

    const lastIteration = session.iterations[session.iterations.length - 1];
    if (lastIteration) {
      lastIteration.feedback = fb;
    }

    return fb;
  }

  /**
   * Record refinement iteration
   */
  recordIteration(
    sessionId: string,
    refinedResponse: string,
    durationMs: number
  ): RefinementIteration | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const quality = this.scoreQuality(refinedResponse);
    const improvement = quality.overall - session.best_quality_score;

    const iteration: RefinementIteration = {
      iteration: session.iterations.length,
      input: session.original_query,
      output: refinedResponse,
      quality_score: quality.overall,
      improvement_delta: improvement,
      duration_ms: durationMs,
    };

    session.iterations.push(iteration);
    session.status = "refining";

    // Update best if improved
    if (quality.overall > session.best_quality_score) {
      session.current_best = refinedResponse;
      session.best_quality_score = quality.overall;
    }

    // Check convergence
    if (quality.overall >= session.convergence_threshold) {
      session.status = "converged";
      session.completed_at = Date.now();
    } else if (session.iterations.length >= session.max_iterations) {
      session.status = "max_iterations";
      session.completed_at = Date.now();
    } else if (improvement < this.config.min_improvement && session.iterations.length > 1) {
      // Converged due to minimal improvement
      session.status = "converged";
      session.completed_at = Date.now();
    }

    return iteration;
  }

  /**
   * Generate refinement prompt
   */
  generateRefinementPrompt(sessionId: string): string | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const lastIteration = session.iterations[session.iterations.length - 1];
    const quality = this.scoreQuality(lastIteration.output);

    // Find weakest dimension
    const dimensions: Array<{ name: string; score: number; indicators: string[] }> = [
      { name: "physics", score: quality.physics_accuracy, indicators: QUALITY_INDICATORS.physics },
      { name: "safety", score: quality.safety_compliance, indicators: QUALITY_INDICATORS.safety },
      { name: "completeness", score: quality.completeness, indicators: QUALITY_INDICATORS.completeness },
      { name: "clarity", score: quality.clarity, indicators: QUALITY_INDICATORS.clarity },
      { name: "actionability", score: quality.actionability, indicators: QUALITY_INDICATORS.actionability },
    ];

    dimensions.sort((a, b) => a.score - b.score);
    const weakest = dimensions[0];

    let prompt = `Improve the following response to the query.\n\n`;
    prompt += `Query: ${session.original_query}\n\n`;
    prompt += `Current response:\n${lastIteration.output}\n\n`;

    // Add feedback if available
    if (lastIteration.feedback) {
      prompt += `Feedback: ${lastIteration.feedback.content}\n\n`;
    }

    // Add improvement direction
    prompt += `Focus on improving ${weakest.name}. `;
    prompt += `Consider including: ${weakest.indicators.slice(0, 3).join(", ")}.\n`;
    prompt += `Current quality: ${(quality.overall * 100).toFixed(0)}%. Target: ${(session.convergence_threshold * 100).toFixed(0)}%.`;

    return prompt;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): RefinementSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions
   */
  getAllSessions(limit: number = 50): RefinementSession[] {
    return Array.from(this.sessions.values()).slice(-limit);
  }

  /**
   * Check if session needs more refinement
   */
  needsRefinement(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    return session.status === "pending" || session.status === "refining";
  }

  /**
   * Get refinement summary
   */
  getSummary(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) return "Session not found";

    const totalDuration = session.iterations.reduce((sum, i) => sum + i.duration_ms, 0);
    const totalImprovement = session.best_quality_score - session.iterations[0].quality_score;

    return [
      `Refinement Session: ${session.id}`,
      `Status: ${session.status}`,
      `Iterations: ${session.iterations.length}/${session.max_iterations}`,
      `Initial Quality: ${(session.iterations[0].quality_score * 100).toFixed(0)}%`,
      `Final Quality: ${(session.best_quality_score * 100).toFixed(0)}%`,
      `Improvement: +${(totalImprovement * 100).toFixed(1)}%`,
      `Total Duration: ${totalDuration}ms`,
    ].join("\n");
  }

  /**
   * Get improvement trajectory
   */
  getTrajectory(sessionId: string): Array<{ iteration: number; score: number }> {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    return session.iterations.map(i => ({
      iteration: i.iteration,
      score: i.quality_score,
    }));
  }

  /**
   * Get best response
   */
  getBestResponse(sessionId: string): string | null {
    const session = this.sessions.get(sessionId);
    return session?.current_best || null;
  }

  /**
   * Mark session as failed
   */
  markFailed(sessionId: string, reason: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.status = "failed";
    session.completed_at = Date.now();

    const lastIteration = session.iterations[session.iterations.length - 1];
    if (lastIteration) {
      lastIteration.feedback = {
        id: `fb-fail-${Date.now()}`,
        type: "rejection",
        content: reason,
        severity: "major",
        timestamp: Date.now(),
      };
    }

    return true;
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Get statistics
   */
  getStats(): {
    total_sessions: number;
    converged: number;
    failed: number;
    avg_iterations: number;
    avg_improvement: number;
  } {
    const sessions = Array.from(this.sessions.values());
    const completed = sessions.filter(s => s.status === "converged" || s.status === "max_iterations");

    const avgIterations = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + s.iterations.length, 0) / sessions.length
      : 0;

    const avgImprovement = completed.length > 0
      ? completed.reduce((sum, s) => sum + (s.best_quality_score - s.iterations[0].quality_score), 0) / completed.length
      : 0;

    return {
      total_sessions: sessions.length,
      converged: sessions.filter(s => s.status === "converged").length,
      failed: sessions.filter(s => s.status === "failed").length,
      avg_iterations: Number(avgIterations.toFixed(1)),
      avg_improvement: Number(avgImprovement.toFixed(3)),
    };
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.sessions.clear();
    this.config = DEFAULT_CONFIG;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRAAdaptiveRefinementEngine = new LatheLoRAAdaptiveRefinementEngine();
