/**
 * PPControllerAdaptationEngine — PP-DL-MS1
 *
 * Adapts cutting parameters and G-code patterns for specific controllers.
 * Instead of neural LoRA fine-tuning, uses rule-based adaptation tables
 * derived from controller capabilities and known limitations.
 *
 * When the system recommends generic parameters, this engine adjusts them
 * for the specific controller:
 *   - Haas NGC: apply G187 smoothing, limit look-ahead to 40 blocks
 *   - Fanuc 31i: enable AI contour, use G05.1 nano smoothing
 *   - Okuma OSP: enable NAVI, use G8.1 NURBS if available
 *   - Siemens 840D: enable CYCLE832, use TRAORI for 5-axis
 *   - Heidenhain: enable PLANE SPATIAL, use CYCL DEF cycles
 *
 * @module PPControllerAdaptationEngine
 */

import { controllerDialectEngine } from "./ControllerDialectEngine.js";

// ── Types ─────────────────────────────────────────────────────────────

export interface AdaptationInput {
  controller_id: string;
  operation: "roughing" | "finishing" | "semi_finishing" | "drilling" | "5axis";
  spindle_speed?: number;
  feed_rate?: number;
  depth_of_cut?: number;
  tolerance_mm?: number;
}

export interface AdaptedParameters {
  controller_id: string;
  original: Partial<AdaptationInput>;
  adapted: {
    spindle_speed?: number;
    feed_rate?: number;
    depth_of_cut?: number;
    look_ahead_setting?: string;
    smoothing_setting?: string;
    hsc_setting?: string;
    tcpc_setting?: string;
    tolerance_setting?: string;
    additional_codes: string[];
  };
  adjustments: Array<{
    parameter: string;
    original_value?: number | string;
    adapted_value: number | string;
    reason: string;
  }>;
  confidence: number;
}

// ── Adaptation tables ─────────────────────────────────────────────────

interface ControllerProfile {
  family: string;
  max_look_ahead?: number;
  max_block_rate?: number;
  feed_limit_factor?: number;    // multiply generic feed by this
  smoothing_codes: Record<string, string>;
  hsc_codes: Record<string, string>;
  optimal_tolerance_mm?: Record<string, number>;
  special_codes: string[];
  notes: string[];
}

const PROFILES: Record<string, ControllerProfile> = {
  haas_ngc: {
    family: "haas",
    max_look_ahead: 40,
    max_block_rate: 1000,
    feed_limit_factor: 0.85, // Haas benefits from slightly reduced feeds
    smoothing_codes: { roughing: "G187 P3", finishing: "G187 P1 E0.005" },
    hsc_codes: { roughing: "", finishing: "G187 P1" },
    optimal_tolerance_mm: { roughing: 0.05, finishing: 0.005, semi_finishing: 0.01 },
    special_codes: [],
    notes: ["Haas NGC limited look-ahead — keep block density manageable"],
  },
  fanuc_31i: {
    family: "fanuc",
    max_look_ahead: 200,
    max_block_rate: 7000,
    feed_limit_factor: 1.0,
    smoothing_codes: { roughing: "G05 P10000", finishing: "G05.1 Q1" },
    hsc_codes: { roughing: "", finishing: "G05.1 Q1" },
    optimal_tolerance_mm: { roughing: 0.03, finishing: 0.003 },
    special_codes: [],
    notes: ["Fanuc 31i supports nano smoothing G05.1 for finishing"],
  },
  fanuc_0i: {
    family: "fanuc",
    max_look_ahead: 40,
    max_block_rate: 1000,
    feed_limit_factor: 0.9,
    smoothing_codes: { roughing: "", finishing: "" },
    hsc_codes: {},
    optimal_tolerance_mm: { roughing: 0.05, finishing: 0.01 },
    special_codes: [],
    notes: ["Fanuc 0i limited — no nano smoothing, basic look-ahead"],
  },
  okuma_osp_p300: {
    family: "okuma",
    max_look_ahead: 200,
    max_block_rate: 5000,
    feed_limit_factor: 1.0,
    smoothing_codes: { roughing: "", finishing: "G8.1" },
    hsc_codes: { roughing: "", finishing: "G8.1" },
    optimal_tolerance_mm: { roughing: 0.03, finishing: 0.005 },
    special_codes: ["G8.1"],
    notes: ["Okuma OSP-P300 supports NURBS G8.1 for smooth finishing"],
  },
  siemens_840d: {
    family: "siemens",
    max_look_ahead: 200,
    max_block_rate: 8000,
    feed_limit_factor: 1.05, // Siemens can often go slightly faster
    smoothing_codes: { roughing: "SOFT", finishing: "CYCLE832(0.005, 1)" },
    hsc_codes: { roughing: "", finishing: "CYCLE832" },
    optimal_tolerance_mm: { roughing: 0.03, finishing: 0.003 },
    special_codes: ["CYCLE832", "SOFT"],
    notes: ["Siemens 840D excels at HSM with CYCLE832 compressor"],
  },
  heidenhain_tnc640: {
    family: "heidenhain",
    max_look_ahead: 200,
    max_block_rate: 6000,
    feed_limit_factor: 1.0,
    smoothing_codes: { roughing: "FUNCTION TCPM", finishing: "FUNCTION TCPM F0.003" },
    hsc_codes: { roughing: "", finishing: "FUNCTION TCPM" },
    optimal_tolerance_mm: { roughing: 0.03, finishing: 0.003 },
    special_codes: ["FUNCTION TCPM"],
    notes: ["Heidenhain TNC640 uses FUNCTION TCPM for smooth 5-axis"],
  },
  hurco_max5: {
    family: "hurco",
    max_look_ahead: 80,
    max_block_rate: 2000,
    feed_limit_factor: 0.9,
    smoothing_codes: { roughing: "", finishing: "" },
    hsc_codes: {},
    optimal_tolerance_mm: { roughing: 0.05, finishing: 0.01 },
    special_codes: [],
    notes: ["Hurco WinMax — UltiMotion adaptive motion, conversational mode preferred"],
  },
};

// ── Engine ─────────────────────────────────────────────────────────────

export class PPControllerAdaptationEngine {
  /**
   * Adapt parameters for a specific controller.
   */
  adapt(input: AdaptationInput): AdaptedParameters {
    const profile = PROFILES[input.controller_id] ?? this.inferProfile(input.controller_id);
    const adjustments: AdaptedParameters["adjustments"] = [];
    const additionalCodes: string[] = [];

    let adaptedSpeed = input.spindle_speed;
    let adaptedFeed = input.feed_rate;
    let adaptedDOC = input.depth_of_cut;

    // Feed rate adaptation
    if (input.feed_rate && profile.feed_limit_factor && profile.feed_limit_factor !== 1.0) {
      adaptedFeed = Math.round(input.feed_rate * profile.feed_limit_factor);
      adjustments.push({
        parameter: "feed_rate",
        original_value: input.feed_rate,
        adapted_value: adaptedFeed,
        reason: `${profile.family} feed factor ${profile.feed_limit_factor}`,
      });
    }

    // Smoothing/HSC codes
    const smoothingCode = profile.smoothing_codes[input.operation] ?? "";
    if (smoothingCode) {
      additionalCodes.push(smoothingCode);
      adjustments.push({
        parameter: "smoothing",
        adapted_value: smoothingCode,
        reason: `${profile.family} smoothing for ${input.operation}`,
      });
    }

    const hscCode = profile.hsc_codes[input.operation] ?? "";
    if (hscCode && hscCode !== smoothingCode) {
      additionalCodes.push(hscCode);
      adjustments.push({
        parameter: "hsc_mode",
        adapted_value: hscCode,
        reason: `${profile.family} HSC mode for ${input.operation}`,
      });
    }

    // Tolerance
    const optimalTol = profile.optimal_tolerance_mm?.[input.operation];
    let toleranceSetting: string | undefined;
    if (optimalTol && input.tolerance_mm && input.tolerance_mm < optimalTol) {
      toleranceSetting = `Controller optimal: ${optimalTol}mm (requested: ${input.tolerance_mm}mm)`;
      adjustments.push({
        parameter: "tolerance",
        original_value: input.tolerance_mm,
        adapted_value: optimalTol,
        reason: `${profile.family} optimal tolerance for ${input.operation}`,
      });
    }

    // TCPC for 5-axis
    let tcpcSetting: string | undefined;
    if (input.operation === "5axis") {
      const dialect = controllerDialectEngine.getDialect(input.controller_id);
      if (dialect.features.tcpc) {
        tcpcSetting = dialect.features.tcpc.on;
        additionalCodes.push(tcpcSetting);
        adjustments.push({
          parameter: "tcpc",
          adapted_value: tcpcSetting,
          reason: `${profile.family} TCPC activation for 5-axis`,
        });
      }
    }

    // Special codes
    for (const code of profile.special_codes) {
      if (!additionalCodes.includes(code)) {
        additionalCodes.push(code);
      }
    }

    // Confidence: higher if controller is in our profile table
    const confidence = PROFILES[input.controller_id] ? 0.9 : 0.6;

    return {
      controller_id: input.controller_id,
      original: { spindle_speed: input.spindle_speed, feed_rate: input.feed_rate, depth_of_cut: input.depth_of_cut },
      adapted: {
        spindle_speed: adaptedSpeed,
        feed_rate: adaptedFeed,
        depth_of_cut: adaptedDOC,
        smoothing_setting: smoothingCode || undefined,
        hsc_setting: hscCode || undefined,
        tcpc_setting: tcpcSetting,
        tolerance_setting: toleranceSetting,
        additional_codes: additionalCodes,
      },
      adjustments,
      confidence,
    };
  }

  /** List controllers with adaptation profiles. */
  listProfiles(): string[] {
    return Object.keys(PROFILES);
  }

  /** Check if a controller has an adaptation profile. */
  hasProfile(controllerId: string): boolean {
    return controllerId in PROFILES;
  }

  /** Get notes for a controller. */
  getNotes(controllerId: string): string[] {
    return PROFILES[controllerId]?.notes ?? ["No specific adaptation notes"];
  }

  private inferProfile(controllerId: string): ControllerProfile {
    const dialect = controllerDialectEngine.getDialect(controllerId);
    return {
      family: dialect.base_family,
      feed_limit_factor: 1.0,
      smoothing_codes: {},
      hsc_codes: {},
      special_codes: [],
      notes: [`Generic adaptation for ${dialect.base_family} family`],
    };
  }
}

export const ppControllerAdaptationEngine = new PPControllerAdaptationEngine();
