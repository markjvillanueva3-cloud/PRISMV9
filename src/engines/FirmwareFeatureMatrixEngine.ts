/**
 * FirmwareFeatureMatrixEngine — Controller Firmware Version → Feature Availability
 *
 * PP-MS2 U-PP12: Maps controller family + firmware year/version to a matrix of
 * available G-code features. Answers: "Does this machine support CYCLE832?"
 * "When did Haas add M65 probing?" "What smoothing is available on Fanuc 0i?"
 *
 * Covers 12 controller families with year-based feature gating derived from
 * manufacturer release notes and controller documentation.
 *
 * Reference:
 *   - Haas NGC Release Notes (v5.x through v7.x)
 *   - Siemens SINUMERIK 840D sl / ONE feature comparison (2020-2025)
 *   - Fanuc Series 0i/30i/31i/35i Programming Manual
 *   - Mazak Smooth Technology feature timeline
 *   - Okuma OSP-P300/P500 feature comparison
 *   - Heidenhain TNC 640 / TNC 7 feature comparison
 *
 * @module FirmwareFeatureMatrixEngine
 */

import type { ControllerFamily } from "./ControllerDialectEngine.js";

// ─── Output Interfaces ──────────────────────────────────────────────

export interface FirmwareFeature {
  /** Feature identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** G/M code or command */
  code: string;
  /** Category for UI grouping */
  category: "probing" | "hsm" | "5axis" | "safety" | "automation" | "turning" | "measurement";
  /** Year this feature became available (null = always available) */
  available_from_year: number | null;
  /** Description of what the feature does */
  description: string;
  /** Alternative command for older firmware */
  legacy_alternative?: string;
}

export interface FirmwareFeatureResult {
  controller_family: ControllerFamily;
  year: number | null;
  features: FirmwareFeature[];
  available_count: number;
  unavailable_count: number;
  warnings: string[];
}

// ─── Feature Matrix Data ────────────────────────────────────────────

/**
 * Feature definitions per controller family.
 * Each entry defines when a feature became available.
 * Year = null means always available on that controller.
 */
const FEATURE_MATRIX: Partial<Record<ControllerFamily, FirmwareFeature[]>> = {

  haas_ngc: [
    { id: "haas_g187", name: "Smoothing", code: "G187", category: "hsm", available_from_year: null, description: "Surface finish / speed control (P1=rough, P2=medium, P3=finish)" },
    { id: "haas_m65_probe", name: "Wireless Probing", code: "M65 P9xxx", category: "probing", available_from_year: 2018, description: "Wireless probe macros (6 built-in cycles)", legacy_alternative: "G65 P9xxx (wired probe macro)" },
    { id: "haas_ssv", name: "Spindle Speed Variation", code: "G189", category: "turning", available_from_year: 2015, description: "SSV for chatter suppression in turning" },
    { id: "haas_visual_probing", name: "Visual Quick Code", code: "VQC", category: "probing", available_from_year: 2020, description: "Conversational probing interface" },
    { id: "haas_dwo", name: "Dynamic Work Offsets", code: "G254", category: "5axis", available_from_year: 2012, description: "Dynamic work offset for tilted planes" },
    { id: "haas_tcpc", name: "TCPC", code: "G234", category: "5axis", available_from_year: 2014, description: "Tool Center Point Control for 5-axis" },
    { id: "haas_sub_m97", name: "Local Subprogram", code: "M97", category: "automation", available_from_year: null, description: "Jump to local subprogram by line number" },
    { id: "haas_sub_m98", name: "External Subprogram", code: "M98", category: "automation", available_from_year: null, description: "Call external subprogram" },
    { id: "haas_safe_start", name: "Safe Start", code: "G00 G17 G40 G49 G80 G90", category: "safety", available_from_year: null, description: "Standard safe start block" },
    { id: "haas_chip_conveyor", name: "Chip Conveyor", code: "M31/M32/M33", category: "automation", available_from_year: null, description: "Chip conveyor fwd/rev/stop" },
  ],

  siemens_840d: [
    { id: "sin_cycle832", name: "CYCLE832 High Speed", code: "CYCLE832", category: "hsm", available_from_year: null, description: "High speed settings with tolerance control" },
    { id: "sin_traori", name: "TRAORI 5-Axis", code: "TRAORI", category: "5axis", available_from_year: null, description: "5-axis transformation (TCPM)" },
    { id: "sin_cycle977", name: "ISO 230 Probing", code: "CYCLE977", category: "probing", available_from_year: 2016, description: "ISO 230-10 compliant measuring cycles" },
    { id: "sin_top_surface", name: "Top Surface", code: "CYCLE832(...,_CMOD,112)", category: "hsm", available_from_year: 2019, description: "Surface quality optimization beyond CYCLE832" },
    { id: "sin_collision", name: "Collision Avoidance", code: "COLLISION ON", category: "safety", available_from_year: 2018, description: "Machine collision detection and avoidance" },
    { id: "sin_prog_sim", name: "Program Simulation", code: "PROG_SIM", category: "safety", available_from_year: null, description: "Built-in program simulation" },
    { id: "sin_mcall", name: "Modal Cycle Call", code: "MCALL", category: "automation", available_from_year: null, description: "Modal subroutine call for canned cycles" },
    { id: "sin_compcad", name: "COMPCAD", code: "COMPCAD", category: "hsm", available_from_year: null, description: "Spline interpolation for smooth surfaces" },
  ],

  fanuc_31i: [
    { id: "fan_aicc", name: "AI Contour Control", code: "G05.1 Q1", category: "hsm", available_from_year: null, description: "AI contour control for high-speed machining" },
    { id: "fan_nano", name: "Nano Smoothing", code: "G05.1 Q3", category: "hsm", available_from_year: 2018, description: "NURBS-based nano smoothing" },
    { id: "fan_g43_4", name: "TCP Control", code: "G43.4", category: "5axis", available_from_year: null, description: "Tool center point control for 5-axis" },
    { id: "fan_g65_probe", name: "Macro Probing", code: "G65 P9xxx", category: "probing", available_from_year: null, description: "Custom macro probing cycles" },
    { id: "fan_g68_2", name: "Tilted Work Plane", code: "G68.2", category: "5axis", available_from_year: null, description: "Tilted work plane for 3+2 positioning" },
    { id: "fan_ai_servo", name: "AI Servo", code: "G05.1 Q2", category: "hsm", available_from_year: 2020, description: "AI servo tuning for high-speed high-precision" },
    { id: "fan_skip", name: "Skip Function", code: "G31", category: "measurement", available_from_year: null, description: "Skip function for probing and part detection" },
    { id: "fan_macro_b", name: "Custom Macro B", code: "G65/G66", category: "automation", available_from_year: null, description: "Parametric programming with variables" },
  ],

  fanuc_0i: [
    { id: "fan0_aicc", name: "AI Contour Control", code: "G05.1 Q1", category: "hsm", available_from_year: 2016, description: "AICC (limited block rate vs 31i)", legacy_alternative: "G64 (cutting mode)" },
    { id: "fan0_probe", name: "Skip/Probe", code: "G31", category: "probing", available_from_year: null, description: "Basic skip function" },
    { id: "fan0_macro", name: "Custom Macro B", code: "G65", category: "automation", available_from_year: null, description: "Custom macro (option on 0i-MF)" },
    { id: "fan0_safe", name: "Safe Retract", code: "G28", category: "safety", available_from_year: null, description: "Reference position return" },
  ],

  heidenhain_tnc640: [
    { id: "hh_tcpm", name: "TCPM", code: "FUNCTION TCPM", category: "5axis", available_from_year: null, description: "Tool center point management (5-axis)" },
    { id: "hh_apc", name: "APC Smoothing", code: "FUNCTION PROG PATH APC", category: "hsm", available_from_year: null, description: "Advanced path control for smooth surfaces" },
    { id: "hh_probe_1001", name: "Touch Probe", code: "TCH PROBE 1001", category: "probing", available_from_year: null, description: "Touch probe measurement cycle (CSV output)" },
    { id: "hh_dco", name: "Dynamic Collision", code: "DCM", category: "safety", available_from_year: 2017, description: "Dynamic collision monitoring" },
    { id: "hh_cfp", name: "Connected Machining", code: "CONNECTED MACHINING", category: "automation", available_from_year: 2019, description: "Industry 4.0 connectivity features" },
    { id: "hh_tool_check", name: "Tool Breakage", code: "TCH PROBE 3.1", category: "measurement", available_from_year: null, description: "Tool breakage detection via laser" },
  ],

  mazak_smooth_ai: [
    { id: "maz_hpcc", name: "HPCC", code: "G05 P10000", category: "hsm", available_from_year: null, description: "High precision contour control" },
    { id: "maz_ai_thermal", name: "AI Thermal Shield", code: "AI THERMAL", category: "safety", available_from_year: 2020, description: "AI-based thermal displacement compensation" },
    { id: "maz_g43_4", name: "TCP Control", code: "G43.4", category: "5axis", available_from_year: null, description: "5-axis TCP for Integrex/VARIAXIS" },
    { id: "maz_m181", name: "Probe Cycle", code: "M181", category: "probing", available_from_year: null, description: "Mazak proprietary probing macro" },
    { id: "maz_spindle_ai", name: "Spindle AI", code: "SPINDLE AI", category: "automation", available_from_year: 2021, description: "AI-based spindle vibration suppression" },
    { id: "maz_ssv", name: "SSV Turning", code: "G96.1", category: "turning", available_from_year: null, description: "Spindle speed variation for chatter" },
  ],

  okuma_osp_p300: [
    { id: "oku_nurbs", name: "Super NURBS", code: "G08 P1", category: "hsm", available_from_year: null, description: "NURBS interpolation for smooth toolpaths" },
    { id: "oku_collision", name: "Collision Avoidance", code: "CAS", category: "safety", available_from_year: null, description: "Collision Avoidance System" },
    { id: "oku_probe", name: "Probing", code: "PROBING", category: "probing", available_from_year: null, description: "Probing subroutine (DPRNT output)" },
    { id: "oku_thermo", name: "Thermo-Friendly", code: "TFC", category: "safety", available_from_year: null, description: "Thermal displacement compensation" },
    { id: "oku_5axis", name: "5-Axis TCP", code: "G43.5", category: "5axis", available_from_year: null, description: "5-axis tool center point" },
  ],

  brother_speedio: [
    { id: "bro_aicc", name: "Tapping Control", code: "G05.1 Q1", category: "hsm", available_from_year: null, description: "High-speed rigid tapping" },
    { id: "bro_probe", name: "Macro Probe", code: "G65", category: "probing", available_from_year: null, description: "Macro-based probing (no native cycle)" },
    { id: "bro_rapid", name: "Ultra Rapid", code: "G00", category: "hsm", available_from_year: null, description: "50m/min rapid traverse" },
  ],

  hurco_max5: [
    { id: "hur_ultimotion", name: "UltiMotion", code: "ULTIMOTION", category: "hsm", available_from_year: 2015, description: "Proprietary motion control for smooth surfaces" },
    { id: "hur_probe", name: "Renishaw Probing", code: "PROBE", category: "probing", available_from_year: null, description: "Integrated Renishaw probing" },
    { id: "hur_dwo", name: "DWO", code: "G254", category: "5axis", available_from_year: 2016, description: "Dynamic work offsets for 5-axis" },
    { id: "hur_conversational", name: "WinMax Conv.", code: "WINMAX", category: "automation", available_from_year: null, description: "Conversational programming + G-code" },
  ],

  citizen_cincom: [
    { id: "cit_lfv", name: "LFV Chip Breaking", code: "M131/M132", category: "turning", available_from_year: 2016, description: "Low Frequency Vibration for chip control" },
    { id: "cit_sub_sync", name: "Sub-Spindle Sync", code: "M222/M223", category: "turning", available_from_year: null, description: "Sub-spindle engage/release" },
    { id: "cit_guide", name: "Guide Bushing", code: "M70/M71", category: "turning", available_from_year: null, description: "Guide bushing engage/retract" },
    { id: "cit_catcher", name: "Part Catcher", code: "M55/M56", category: "automation", available_from_year: null, description: "Part catcher open/close" },
  ],

  star_fanuc: [
    { id: "star_gang", name: "Gang Tooling", code: "GANG", category: "turning", available_from_year: null, description: "Gang-style tool block operations" },
    { id: "star_sub_sync", name: "Sub-Spindle Sync", code: "M20/M21", category: "turning", available_from_year: null, description: "Sub-spindle synchronization" },
    { id: "star_whirl", name: "Thread Whirling", code: "M52/M53", category: "turning", available_from_year: null, description: "Thread whirling for medical screws" },
  ],

  dmg_celos_siemens: [
    { id: "dmg_mpc", name: "Machine Protection", code: "MPC", category: "safety", available_from_year: 2019, description: "Machine Protection Control — vibration monitoring" },
    { id: "dmg_3dqs", name: "3D quickSET", code: "3DQS", category: "measurement", available_from_year: 2020, description: "Automated kinematic measurement" },
    { id: "dmg_cycle832", name: "CYCLE832", code: "CYCLE832", category: "hsm", available_from_year: null, description: "SINUMERIK high speed settings (via CELOS)" },
    { id: "dmg_traori", name: "TRAORI", code: "TRAORI", category: "5axis", available_from_year: null, description: "5-axis transformation (CELOS wraps SINUMERIK)" },
    { id: "dmg_tool_ctrl", name: "Tool Control", code: "TOOL CTRL", category: "automation", available_from_year: 2021, description: "AI-based tool monitoring and breakage detection" },
  ],

  mitsubishi_m80: [
    { id: "mit_ssc", name: "SSS Control", code: "G05 P2", category: "hsm", available_from_year: null, description: "Super smooth surface control" },
    { id: "mit_probe", name: "Probe Cycle", code: "G31", category: "probing", available_from_year: null, description: "Skip function for probing" },
    { id: "mit_g43_4", name: "TCP", code: "G43.4", category: "5axis", available_from_year: null, description: "Tool center point control" },
  ],
};

// ─── Engine Implementation ──────────────────────────────────────────

class FirmwareFeatureMatrixEngineImpl {

  /**
   * Get available features for a controller family and optional year.
   *
   * @param controller_family - PRISM controller dialect ID
   * @param year - Optional machine year; features gated by available_from_year
   * @returns Feature list with availability status
   */
  getFeatures(controller_family: ControllerFamily, year?: number): FirmwareFeatureResult {
    if (!controller_family) throw new Error("[FirmwareFeatureMatrixEngine] controller_family is required");
    if (year !== undefined && (typeof year !== "number" || year < 1950 || year > 2035)) {
      throw new Error("[FirmwareFeatureMatrixEngine] year must be 1950-2035");
    }

    const warnings: string[] = [];
    const allFeatures = FEATURE_MATRIX[controller_family];

    if (!allFeatures) {
      // Try base family fallback
      const baseFallback = this.getBaseFallback(controller_family);
      if (baseFallback) {
        const fallbackResult = this.getFeatures(baseFallback, year);
        fallbackResult.warnings.unshift(`No specific feature matrix for "${controller_family}", using ${baseFallback} as base`);
        return fallbackResult;
      }
      warnings.push(`No feature matrix for controller "${controller_family}" — returning empty`);
      return { controller_family, year: year ?? null, features: [], available_count: 0, unavailable_count: 0, warnings };
    }

    const features = allFeatures.map(f => ({ ...f }));
    let available = 0;
    let unavailable = 0;

    for (const f of features) {
      if (year && f.available_from_year && year < f.available_from_year) {
        unavailable++;
      } else {
        available++;
      }
    }

    if (year && unavailable > 0) {
      warnings.push(`${unavailable} feature(s) unavailable for year ${year} — check legacy_alternative fields`);
    }

    return {
      controller_family,
      year: year ?? null,
      features,
      available_count: available,
      unavailable_count: unavailable,
      warnings,
    };
  }

  /**
   * Check if a specific feature is available on a controller at a given year.
   */
  isFeatureAvailable(controller_family: ControllerFamily, feature_id: string, year?: number): boolean {
    const result = this.getFeatures(controller_family, year);
    const feature = result.features.find(f => f.id === feature_id);
    if (!feature) return false;
    if (!year || !feature.available_from_year) return true;
    return year >= feature.available_from_year;
  }

  /**
   * List all controller families that have feature matrix data.
   */
  listCoveredControllers(): ControllerFamily[] {
    return Object.keys(FEATURE_MATRIX) as ControllerFamily[];
  }

  /**
   * PRISM engine execute method.
   *
   * Actions:
   *   - firmware_features: Get features for controller + year
   *   - firmware_check: Check single feature availability
   *   - firmware_controllers: List controllers with feature data
   */
  execute(action: string, input: any): any {
    switch (action) {
      case "firmware_features":
        return this.getFeatures(input.controller_family, input.year);
      case "firmware_check":
        return {
          available: this.isFeatureAvailable(input.controller_family, input.feature_id, input.year),
          controller_family: input.controller_family,
          feature_id: input.feature_id,
          year: input.year ?? null,
        };
      case "firmware_controllers":
        return { controllers: this.listCoveredControllers() };
      default:
        throw new Error(
          `[FirmwareFeatureMatrixEngine] Unknown action "${action}". ` +
          `Supported: firmware_features, firmware_check, firmware_controllers`
        );
    }
  }

  // ─── Private ────────────────────────────────────────────────────────

  private getBaseFallback(family: ControllerFamily): ControllerFamily | undefined {
    if (family === "fanuc_16i" || family === "fanuc_18i" || family === "fanuc_30i") return "fanuc_31i";
    if (family === "siemens_828d" || family === "siemens_one") return "siemens_840d";
    if (family === "heidenhain_tnc7") return "heidenhain_tnc640";
    if (family === "mazak_smooth_g") return "mazak_smooth_ai";
    if (family === "okuma_osp_p500") return "okuma_osp_p300";
    if (family === "dmg_celos_fanuc") return "dmg_celos_siemens";
    if (family === "generic_fanuc" || family === "generic_iso") return "fanuc_0i";
    return undefined;
  }
}

// ─── Singleton Export ────────────────────────────────────────────────

export const firmwareFeatureMatrixEngine = new FirmwareFeatureMatrixEngineImpl();
