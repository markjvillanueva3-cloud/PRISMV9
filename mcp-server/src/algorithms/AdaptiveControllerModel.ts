/**
 * Adaptive Controller Model (4-Mode)
 *
 * Implements four adaptive control modes for real-time CNC optimization:
 * 1. Constant Chipload: Feed override to maintain target chip thickness
 * 2. Chatter Suppression: Spindle speed adjustment via stability lobes
 * 3. Wear Compensation: Feed/speed reduction based on wear progression
 * 4. Thermal Compensation: Axis offsets for thermal drift correction
 *
 * SAFETY-CRITICAL: Generates real-time machine overrides that directly
 * control tool loading, vibration, and dimensional accuracy.
 *
 * References:
 * - Altintas, Y. (2012). "Manufacturing Automation", Ch.8
 * - Landers, R.G. & Ulsoy, A.G. (2000). "Model-Based Machining Force Control"
 * - FANUC FOCAS2 / Siemens OPC-UA override protocols
 *
 * @module algorithms/AdaptiveControllerModel
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
  WithWarnings,
} from "./types.js";

// ── Input / Output Types ────────────────────────────────────────────

export type AdaptiveMode = "chipload" | "chatter" | "wear" | "thermal";

export interface AdaptiveControllerInput {
  /** Control mode to execute. */
  mode: AdaptiveMode;

  // ── Chipload mode params ──
  /** Target chip load [mm/tooth]. */
  target_chipload?: number;
  /** Current feed rate [mm/min]. */
  feed_rate?: number;
  /** Current spindle RPM. */
  spindle_rpm?: number;
  /** Number of flutes. */
  flutes?: number;
  /** Engagement angle [degrees]. Default 180 (full slot). */
  engagement_angle?: number;
  /** Current spindle load [%]. */
  spindle_load_pct?: number;

  // ── Chatter mode params ──
  /** Vibration amplitude [mm/s RMS]. */
  vibration_mm_s?: number;
  /** Dominant vibration frequency [Hz]. */
  dominant_frequency_hz?: number;
  /** Vibration threshold [mm/s]. Default 2.5. */
  vibration_threshold?: number;

  // ── Wear mode params ──
  /** Current cutting time [min]. */
  cutting_time_min?: number;
  /** Expected tool life [min]. */
  expected_life_min?: number;
  /** Baseline spindle load [%]. */
  baseline_load_pct?: number;
  /** Current spindle load [%]. */
  current_load_pct?: number;
  /** Measured flank wear VB [mm]. */
  flank_wear_mm?: number;

  // ── Thermal mode params ──
  /** Current spindle temperature [C]. */
  spindle_temp_c?: number;
  /** Ambient temperature [C]. Default 20. */
  ambient_temp_c?: number;
  /** Machine run time [min]. */
  run_time_min?: number;
  /** Machine type. Default "VMC". */
  machine_type?: "VMC" | "HMC" | "lathe";
  /** Thermal coefficient [um/C]. Default 1.2. */
  thermal_coeff?: number;
}

export interface AdaptiveOverride {
  feed_override_pct: number;
  spindle_override_pct: number;
}

export interface AdaptiveControllerOutput extends WithWarnings {
  /** Active control mode. */
  mode: AdaptiveMode;
  /** Recommended feed override [%] (100 = no change). */
  feed_override_pct: number;
  /** Recommended spindle override [%] (100 = no change). */
  spindle_override_pct: number;
  /** Compensation offsets [um] (thermal mode). */
  compensation_um: { x: number; y: number; z: number };
  /** Estimated wear [%]. */
  estimated_wear_pct: number;
  /** Action urgency. */
  urgency: "none" | "low" | "medium" | "high" | "emergency";
  /** Whether override should be applied. */
  apply_override: boolean;
  /** Human-readable recommendation. */
  recommendation: string;
  /** Alerts generated. */
  alerts: string[];
  /** Calculation method tag. */
  calculation_method: string;
}

// ── Constants ───────────────────────────────────────────────────────

const LIMITS = {
  MIN_FEED_OVERRIDE: 40,     // %
  MAX_FEED_OVERRIDE: 150,    // %
  MIN_SPINDLE_OVERRIDE: 50,  // %
  MAX_SPINDLE_OVERRIDE: 120, // %
  MAX_ENGAGEMENT_CORRECTION: 2.5,
  DEFAULT_VIB_THRESHOLD: 2.5,// mm/s
};

// ── Algorithm Implementation ────────────────────────────────────────

export class AdaptiveControllerModel implements Algorithm<AdaptiveControllerInput, AdaptiveControllerOutput> {

  validate(input: AdaptiveControllerInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    const validModes: AdaptiveMode[] = ["chipload", "chatter", "wear", "thermal"];

    if (!input.mode || !validModes.includes(input.mode)) {
      issues.push({ field: "mode", message: `Mode must be one of: ${validModes.join(", ")}`, severity: "error" });
    }

    if (input.mode === "chipload") {
      if (!input.target_chipload || input.target_chipload <= 0) {
        issues.push({ field: "target_chipload", message: "Target chipload must be > 0", severity: "error" });
      }
      if (!input.feed_rate || input.feed_rate <= 0) {
        issues.push({ field: "feed_rate", message: "Feed rate must be > 0", severity: "error" });
      }
      if (!input.spindle_rpm || input.spindle_rpm <= 0) {
        issues.push({ field: "spindle_rpm", message: "Spindle RPM must be > 0", severity: "error" });
      }
      if (!input.flutes || input.flutes < 1) {
        issues.push({ field: "flutes", message: "Flutes must be >= 1", severity: "error" });
      }
    }

    if (input.mode === "chatter") {
      if (input.vibration_mm_s === undefined) {
        issues.push({ field: "vibration_mm_s", message: "Vibration amplitude required for chatter mode", severity: "error" });
      }
      if (!input.spindle_rpm || input.spindle_rpm <= 0) {
        issues.push({ field: "spindle_rpm", message: "Spindle RPM required for chatter mode", severity: "error" });
      }
    }

    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: AdaptiveControllerInput): AdaptiveControllerOutput {
    switch (input.mode) {
      case "chipload": return this.calculateChipload(input);
      case "chatter": return this.calculateChatter(input);
      case "wear": return this.calculateWear(input);
      case "thermal": return this.calculateThermal(input);
      default: return this.calculateChipload(input);
    }
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "adaptive-controller",
      name: "Adaptive Controller (4-Mode)",
      description: "Real-time CNC adaptive control: chipload, chatter, wear, thermal compensation",
      formula: "Chipload: override = (target*RPM*z*corr)/currentFeed*100; Chatter: stable RPM via lobes",
      reference: "Altintas (2012) Ch.8; Landers & Ulsoy (2000)",
      safety_class: "critical",
      domain: "force",
      inputs: {
        mode: "Control mode (chipload/chatter/wear/thermal)",
        target_chipload: "Target chip load [mm/tooth]",
        vibration_mm_s: "Vibration amplitude [mm/s]",
        spindle_rpm: "Spindle RPM",
      },
      outputs: {
        feed_override_pct: "Feed override [%]",
        spindle_override_pct: "Spindle override [%]",
        compensation_um: "Thermal compensation offsets [um]",
        urgency: "Action urgency level",
      },
    };
  }

  // ── Mode Implementations ────────────────────────────────────────

  private calculateChipload(input: AdaptiveControllerInput): AdaptiveControllerOutput {
    const warnings: string[] = [];
    const alerts: string[] = [];
    const {
      target_chipload = 0.1, feed_rate = 1000, spindle_rpm = 5000,
      flutes = 4, engagement_angle = 180, spindle_load_pct = 50,
    } = input;

    // Actual chipload = feed / (RPM x z)
    const actualChipload = feed_rate / (spindle_rpm * flutes);

    // Engagement angle correction
    const engRad = (engagement_angle * Math.PI) / 180;
    const effectiveThickness = actualChipload * Math.sin(engRad / 2);

    // Ideal feed to maintain constant chipload
    const idealFeed = target_chipload * spindle_rpm * flutes;
    const correctionForEngagement = Math.sin(Math.PI / 4) / Math.sin(engRad / 2);
    const adjustedFeed = idealFeed * Math.min(correctionForEngagement, LIMITS.MAX_ENGAGEMENT_CORRECTION);

    let feed_override_pct = Math.round((adjustedFeed / feed_rate) * 100);
    feed_override_pct = Math.max(LIMITS.MIN_FEED_OVERRIDE, Math.min(LIMITS.MAX_FEED_OVERRIDE, feed_override_pct));

    if (spindle_load_pct > 80) {
      feed_override_pct = Math.min(feed_override_pct, 90);
      alerts.push("Spindle load > 80%. Feed override limited.");
    }

    const urgency = Math.abs(feed_override_pct - 100) > 30 ? "medium" : "low";

    return {
      mode: "chipload",
      feed_override_pct,
      spindle_override_pct: 100,
      compensation_um: { x: 0, y: 0, z: 0 },
      estimated_wear_pct: 0,
      urgency,
      apply_override: Math.abs(feed_override_pct - 100) > 5,
      recommendation: `Chipload: actual=${(actualChipload * 1000).toFixed(1)}um, target=${(target_chipload * 1000).toFixed(1)}um. Feed override ${feed_override_pct}%.`,
      alerts,
      warnings,
      calculation_method: "Constant chipload adaptive control",
    };
  }

  private calculateChatter(input: AdaptiveControllerInput): AdaptiveControllerOutput {
    const warnings: string[] = [];
    const alerts: string[] = [];
    const {
      vibration_mm_s = 0, spindle_rpm = 5000, flutes = 4,
      dominant_frequency_hz = 0,
      vibration_threshold = LIMITS.DEFAULT_VIB_THRESHOLD,
    } = input;

    const isChatter = vibration_mm_s > vibration_threshold;
    let spindle_override_pct = 100;
    let urgency: AdaptiveControllerOutput["urgency"] = "none";

    if (isChatter && dominant_frequency_hz > 0) {
      // Find stable RPM via stability lobe pockets
      const stableOptions: number[] = [];
      for (let k = 1; k <= 5; k++) {
        stableOptions.push(Math.round((60 * dominant_frequency_hz) / (flutes * (k + 0.5))));
        stableOptions.push(Math.round((60 * dominant_frequency_hz) / (flutes * k)));
      }

      // Pick closest to current RPM
      const validOptions = stableOptions.filter(rpm => rpm > 100 && rpm < 50000);
      validOptions.sort((a, b) => Math.abs(a - spindle_rpm) - Math.abs(b - spindle_rpm));

      if (validOptions.length > 0) {
        spindle_override_pct = Math.round((validOptions[0] / spindle_rpm) * 100);
        spindle_override_pct = Math.max(LIMITS.MIN_SPINDLE_OVERRIDE, Math.min(LIMITS.MAX_SPINDLE_OVERRIDE, spindle_override_pct));
      }

      urgency = vibration_mm_s > vibration_threshold * 3 ? "emergency"
        : vibration_mm_s > vibration_threshold * 2 ? "high" : "medium";

      alerts.push(`Chatter detected: ${vibration_mm_s.toFixed(1)} mm/s at ${dominant_frequency_hz.toFixed(0)} Hz.`);
    }

    return {
      mode: "chatter",
      feed_override_pct: isChatter ? spindle_override_pct : 100, // Feed proportional to spindle
      spindle_override_pct,
      compensation_um: { x: 0, y: 0, z: 0 },
      estimated_wear_pct: 0,
      urgency,
      apply_override: isChatter,
      recommendation: isChatter
        ? `Chatter suppression: spindle override ${spindle_override_pct}%. Feed adjusted proportionally.`
        : "No chatter detected. No override needed.",
      alerts,
      warnings,
      calculation_method: "Stability lobe chatter suppression",
    };
  }

  private calculateWear(input: AdaptiveControllerInput): AdaptiveControllerOutput {
    const warnings: string[] = [];
    const alerts: string[] = [];
    const {
      cutting_time_min = 0, expected_life_min = 60,
      baseline_load_pct = 50, current_load_pct = 50,
      flank_wear_mm = 0,
    } = input;

    // Multi-indicator wear estimation
    const timeBasedWear = (cutting_time_min / expected_life_min) * 100;
    const loadIncrease = baseline_load_pct > 0
      ? ((current_load_pct - baseline_load_pct) / baseline_load_pct) * 100
      : 0;
    const loadBasedWear = Math.max(0, loadIncrease * 2.5);
    const vbBasedWear = flank_wear_mm > 0 ? (flank_wear_mm / 0.3) * 100 : 0;

    const estimated_wear_pct = Math.min(Math.max(timeBasedWear, loadBasedWear, vbBasedWear), 100);

    // Feed compensation: reduce 0.3% per 1% wear above 50%
    let feed_override_pct = 100;
    if (estimated_wear_pct > 50) {
      feed_override_pct = Math.round(100 - (estimated_wear_pct - 50) * 0.3);
      feed_override_pct = Math.max(LIMITS.MIN_FEED_OVERRIDE, feed_override_pct);
    }

    let urgency: AdaptiveControllerOutput["urgency"] = "none";
    if (estimated_wear_pct > 90) {
      urgency = "emergency";
      alerts.push("Tool at 90%+ wear. Replace immediately.");
    } else if (estimated_wear_pct > 70) {
      urgency = "high";
      alerts.push("Tool at 70%+ wear. Plan replacement.");
    } else if (estimated_wear_pct > 50) {
      urgency = "medium";
    }

    return {
      mode: "wear",
      feed_override_pct,
      spindle_override_pct: 100,
      compensation_um: { x: 0, y: 0, z: 0 },
      estimated_wear_pct,
      urgency,
      apply_override: estimated_wear_pct > 50,
      recommendation: `Wear at ${estimated_wear_pct.toFixed(0)}%. Feed override ${feed_override_pct}%.`,
      alerts,
      warnings,
      calculation_method: "Multi-indicator wear compensation (time/load/VB)",
    };
  }

  private calculateThermal(input: AdaptiveControllerInput): AdaptiveControllerOutput {
    const warnings: string[] = [];
    const alerts: string[] = [];
    const {
      spindle_temp_c = 25, ambient_temp_c = 20,
      run_time_min = 0, machine_type = "VMC",
      thermal_coeff = 1.2,
    } = input;

    const deltaT = spindle_temp_c - ambient_temp_c;
    const structureCoeff = machine_type === "HMC" ? 1.2 : machine_type === "lathe" ? 0.6 : 1.0;

    const zDrift = deltaT * thermal_coeff;
    const xDrift = deltaT * structureCoeff * (machine_type === "HMC" ? 1.2 : 0.8);
    const yDrift = deltaT * structureCoeff * 0.5;

    const shouldCompensate = Math.abs(zDrift) > 5 || Math.abs(xDrift) > 3;

    const compensation_um = shouldCompensate
      ? { x: -xDrift, y: -yDrift, z: -zDrift }
      : { x: 0, y: 0, z: 0 };

    let urgency: AdaptiveControllerOutput["urgency"] = "none";
    if (Math.abs(zDrift) > 20) {
      urgency = "high";
      alerts.push(`Thermal drift Z=${zDrift.toFixed(1)} um exceeds 20 um.`);
    } else if (shouldCompensate) {
      urgency = "medium";
    }

    return {
      mode: "thermal",
      feed_override_pct: 100,
      spindle_override_pct: 100,
      compensation_um,
      estimated_wear_pct: 0,
      urgency,
      apply_override: shouldCompensate,
      recommendation: shouldCompensate
        ? `Thermal compensation: dX=${compensation_um.x.toFixed(1)}, dY=${compensation_um.y.toFixed(1)}, dZ=${compensation_um.z.toFixed(1)} um.`
        : "Thermal drift within tolerance. No compensation needed.",
      alerts,
      warnings,
      calculation_method: "Machine thermal drift compensation (coefficient model)",
    };
  }
}
