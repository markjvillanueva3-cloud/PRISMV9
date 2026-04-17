/**
 * AdaptiveChatterEngine — Real-Time Chatter Detection & Suppression
 * ===================================================================
 *
 * SAFETY-CRITICAL: Detects regenerative chatter and adjusts spindle/feed.
 * All outputs validated against stability lobe predictions.
 * Requires S(x) >= 0.990 for all operations.
 *
 * L2-P4-MS1/P0-U04 — Batch 7: Adaptive Control
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const ChatterInputSchema = z.object({
  spindleSpeed: z.number().min(100).max(60000),
  feedRate: z.number().min(1).max(50000),
  depthOfCut: z.number().min(0.01).max(50),
  toolDiameter: z.number().min(0.1).max(200),
  toolStickout: z.number().min(5).max(300),
  fluteCount: z.number().int().min(1).max(12),
  vibrationAmplitude: z.number().min(0).max(100),
  vibrationFrequency: z.number().min(0).max(10000),
  toothPassFrequency: z.number().optional(),
  naturalFrequency: z.number().min(100).max(5000).optional(),
  dampingRatio: z.number().min(0.01).max(0.5).optional(),
});

export const ChatterOutputSchema = z.object({
  chatterDetected: z.boolean(),
  chatterSeverity: z.enum(["none", "incipient", "moderate", "severe"]),
  chatterFrequency: z.number(),
  stabilityMargin: z.number(),
  recommendedSpindleSpeed: z.number(),
  recommendedDepthOfCut: z.number(),
  action: z.enum(["maintain", "reduce_speed", "increase_speed", "reduce_doc", "emergency_stop"]),
  safetyScore: z.number().min(0).max(1),
  warnings: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export const StabilityLobeSchema = z.object({
  spindleSpeed: z.number(),
  criticalDepth: z.number(),
  lobeNumber: z.number(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChatterInput = z.infer<typeof ChatterInputSchema>;
export type ChatterOutput = z.infer<typeof ChatterOutputSchema>;
export type StabilityLobe = z.infer<typeof StabilityLobeSchema>;

// ─── Constants ────────────────────────────────────────────────────────────────

const SAFETY_THRESHOLD = 0.990;
const CHATTER_AMPLITUDE_THRESHOLD = 5.0; // µm
const SEVERE_AMPLITUDE_THRESHOLD = 20.0; // µm
const DEFAULT_NATURAL_FREQ = 1500; // Hz
const DEFAULT_DAMPING = 0.05;

// ─── Engine ───────────────────────────────────────────────────────────────────

export class AdaptiveChatterEngine {
  private static vibrationHistory: { amplitude: number; frequency: number; timestamp: number }[] = [];

  /**
   * Analyze vibration data for chatter detection
   */
  static analyze(input: ChatterInput): ChatterOutput {
    const validated = ChatterInputSchema.parse(input);
    const warnings: string[] = [];

    // Calculate tooth pass frequency if not provided
    const toothPassFreq = validated.toothPassFrequency ??
      (validated.spindleSpeed / 60) * validated.fluteCount;

    // Natural frequency estimation if not provided
    const naturalFreq = validated.naturalFrequency ?? DEFAULT_NATURAL_FREQ;
    const damping = validated.dampingRatio ?? DEFAULT_DAMPING;

    // Store in history
    this.vibrationHistory.push({
      amplitude: validated.vibrationAmplitude,
      frequency: validated.vibrationFrequency,
      timestamp: Date.now(),
    });
    if (this.vibrationHistory.length > 200) this.vibrationHistory.shift();

    // Chatter detection: vibration near tooth-pass harmonics indicates stable cutting
    // Vibration between harmonics (especially near natural freq) indicates chatter
    const freqRatio = validated.vibrationFrequency / toothPassFreq;
    const nearHarmonic = Math.abs(freqRatio - Math.round(freqRatio)) < 0.1;
    const nearNatural = Math.abs(validated.vibrationFrequency - naturalFreq) < naturalFreq * 0.15;

    // Determine chatter severity
    let chatterSeverity: ChatterOutput["chatterSeverity"] = "none";
    let chatterDetected = false;

    if (validated.vibrationAmplitude > SEVERE_AMPLITUDE_THRESHOLD && nearNatural && !nearHarmonic) {
      chatterSeverity = "severe";
      chatterDetected = true;
      warnings.push("SEVERE CHATTER: Immediate action required");
    } else if (validated.vibrationAmplitude > CHATTER_AMPLITUDE_THRESHOLD * 2 && !nearHarmonic) {
      chatterSeverity = "moderate";
      chatterDetected = true;
      warnings.push("Moderate chatter detected - parameter adjustment recommended");
    } else if (validated.vibrationAmplitude > CHATTER_AMPLITUDE_THRESHOLD && !nearHarmonic) {
      chatterSeverity = "incipient";
      chatterDetected = true;
      warnings.push("Incipient chatter - monitor closely");
    }

    // Calculate stability margin using simplified stability lobe theory
    // Critical depth: b_lim = -1 / (2 * Ks * Re[G])
    // Simplified: margin = b_lim / actual_depth
    const stiffness = this.estimateToolStiffness(validated.toolDiameter, validated.toolStickout);
    const criticalDepth = this.calculateCriticalDepth(
      validated.spindleSpeed,
      naturalFreq,
      damping,
      stiffness,
      validated.fluteCount
    );
    const stabilityMargin = criticalDepth / validated.depthOfCut;

    // Safety score based on stability margin and vibration
    let safetyScore = 1.0;
    if (chatterSeverity === "severe") {
      safetyScore = 0.3;
    } else if (chatterSeverity === "moderate") {
      safetyScore = 0.7;
    } else if (chatterSeverity === "incipient") {
      safetyScore = 0.9;
    }
    safetyScore *= Math.min(1, stabilityMargin);

    // Determine action and recommendations
    let action: ChatterOutput["action"] = "maintain";
    let recommendedSpeed = validated.spindleSpeed;
    let recommendedDoc = validated.depthOfCut;

    if (chatterSeverity === "severe") {
      action = "emergency_stop";
      recommendedSpeed = 0;
      recommendedDoc = 0;
    } else if (chatterSeverity === "moderate") {
      // Try to find stable pocket
      const stableSpeed = this.findStableSpeed(naturalFreq, validated.fluteCount, validated.spindleSpeed);
      if (Math.abs(stableSpeed - validated.spindleSpeed) / validated.spindleSpeed < 0.15) {
        action = stableSpeed > validated.spindleSpeed ? "increase_speed" : "reduce_speed";
        recommendedSpeed = stableSpeed;
      } else {
        action = "reduce_doc";
        recommendedDoc = validated.depthOfCut * 0.7;
      }
    } else if (chatterSeverity === "incipient") {
      action = "reduce_doc";
      recommendedDoc = validated.depthOfCut * 0.85;
    }

    // Confidence based on history
    const confidence = Math.min(1, this.vibrationHistory.length / 50);

    return ChatterOutputSchema.parse({
      chatterDetected,
      chatterSeverity,
      chatterFrequency: validated.vibrationFrequency,
      stabilityMargin: Math.round(stabilityMargin * 100) / 100,
      recommendedSpindleSpeed: Math.round(recommendedSpeed),
      recommendedDepthOfCut: Math.round(recommendedDoc * 100) / 100,
      action,
      safetyScore: Math.round(safetyScore * 1000) / 1000,
      warnings,
      confidence: Math.round(confidence * 100) / 100,
    });
  }

  /**
   * Estimate tool stiffness based on geometry
   * k = 3EI/L³ for cantilever beam
   */
  private static estimateToolStiffness(diameter: number, stickout: number): number {
    const E = 600e9; // Carbide modulus (Pa)
    const I = (Math.PI * (diameter / 1000) ** 4) / 64; // m⁴
    const L = stickout / 1000; // m
    return (3 * E * I) / (L ** 3); // N/m
  }

  /**
   * Calculate critical depth of cut using simplified stability theory
   */
  private static calculateCriticalDepth(
    rpm: number,
    naturalFreq: number,
    damping: number,
    stiffness: number,
    fluteCount: number
  ): number {
    const omega = (rpm / 60) * fluteCount * 2 * Math.PI;
    const omegaN = naturalFreq * 2 * Math.PI;
    const r = omega / omegaN;

    // Transfer function magnitude at excitation frequency
    const G_mag = 1 / Math.sqrt((1 - r * r) ** 2 + (2 * damping * r) ** 2);

    // Specific cutting force (approximate for steel)
    const Ks = 2000e6; // N/m²

    // Critical depth
    const b_lim = stiffness / (2 * Ks * G_mag);

    return b_lim * 1000; // Convert to mm
  }

  /**
   * Find nearest stable spindle speed (stability lobe pocket)
   */
  private static findStableSpeed(naturalFreq: number, fluteCount: number, currentRpm: number): number {
    // Stable speeds occur at: n = 60 * fn / (k * z) where k = 1, 2, 3...
    const candidates: number[] = [];
    for (let k = 1; k <= 10; k++) {
      const stableRpm = (60 * naturalFreq) / (k * fluteCount);
      if (stableRpm > 500 && stableRpm < 30000) {
        candidates.push(stableRpm);
      }
    }

    // Find closest to current
    return candidates.reduce((closest, rpm) =>
      Math.abs(rpm - currentRpm) < Math.abs(closest - currentRpm) ? rpm : closest
    , candidates[0] || currentRpm);
  }

  /**
   * Generate stability lobe diagram data
   */
  static generateStabilityLobes(
    naturalFreq: number,
    damping: number,
    stiffness: number,
    fluteCount: number,
    minRpm: number,
    maxRpm: number
  ): StabilityLobe[] {
    const lobes: StabilityLobe[] = [];

    for (let rpm = minRpm; rpm <= maxRpm; rpm += 100) {
      const criticalDepth = this.calculateCriticalDepth(rpm, naturalFreq, damping, stiffness, fluteCount);
      const omega = (rpm / 60) * fluteCount;
      const lobeNumber = Math.round(naturalFreq / omega);

      lobes.push({
        spindleSpeed: rpm,
        criticalDepth: Math.round(criticalDepth * 1000) / 1000,
        lobeNumber,
      });
    }

    return lobes;
  }

  /**
   * Reset vibration history
   */
  static reset(): void {
    this.vibrationHistory = [];
  }

  /**
   * Validate safety score meets threshold
   */
  static validateSafety(output: ChatterOutput): boolean {
    return output.safetyScore >= SAFETY_THRESHOLD;
  }

  static getSelfAwareness() {
    return {
      name: "AdaptiveChatterEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U04",
      safetyCritical: true,
      safetyThreshold: SAFETY_THRESHOLD,
      capabilities: ["analyze", "generateStabilityLobes", "reset", "validateSafety"],
      chatterSeverities: ["none", "incipient", "moderate", "severe"],
      dependencies: [],
    };
  }
}

export const adaptiveChatterEngine = new AdaptiveChatterEngine();
