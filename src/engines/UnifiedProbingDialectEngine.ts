/**
 * UnifiedProbingDialectEngine — Cross-controller probe routine dialect adapter
 *
 * Unified interface over ProbeRoutineGeneratorEngine that adds:
 * - ControllerFamily → ProbeController mapping (25 controller families → 8 probe dialects)
 * - FirmwareFeatureMatrix year gating (e.g., Haas M65 probe available from 2018+)
 * - Probe system type detection (Renishaw OMP/RMP, Blum, Heidenhain TS, Hexagon)
 * - Brother Speedio + Doosan controller coverage
 * - Standardized measurement output format (register → JSON mapping)
 *
 * References: Renishaw Inspection Plus programming manual, Blum LaserControl guide,
 *   Heidenhain TNC probing cycle manual, Hexagon machine tool probing guide
 *
 * @module engines/UnifiedProbingDialectEngine
 * @version 1.0.0
 */

import type { ControllerFamily } from "./ControllerDialectEngine.js";
import { probeRoutineGeneratorEngine } from "./ProbeRoutineGeneratorEngine.js";
import type { ProbeController, ProbeResult, ProbeFeature } from "./ProbeRoutineGeneratorEngine.js";
import { firmwareFeatureMatrixEngine } from "./FirmwareFeatureMatrixEngine.js";

// ─── Types ───────────────────────────────────────────────────────────

export type ProbeSystemType =
  | "renishaw_omp"     // Renishaw OMP (optical machine probe)
  | "renishaw_rmp"     // Renishaw RMP (radio machine probe)
  | "renishaw_ots"     // Renishaw OTS (optical tool setter)
  | "blum_tc"          // Blum LaserControl TC (tool check)
  | "blum_z_nano"      // Blum Z-Nano (touch probe)
  | "heidenhain_ts"    // Heidenhain TS touch probe series
  | "hexagon_m&h"      // Hexagon m&h probing (formerly Leitz)
  | "generic";         // Unknown/generic probe

export interface UnifiedProbeInput {
  controller_family: ControllerFamily;
  /** Machine year — used for firmware feature gating */
  year?: number;
  /** Probe system type — auto-detected from controller if not specified */
  probe_system?: ProbeSystemType;
  /** Probe tool number in magazine */
  probe_tool_number?: number;
  /** Work offset to set (e.g., "G54") */
  work_offset?: string;
  /** Features to probe */
  features: ProbeFeature[];
  /** Approach distance in mm */
  approach_distance?: number;
  /** Feed rate in mm/min */
  feed_rate?: number;
}

export interface UnifiedProbeOutput extends ProbeResult {
  controller_family: ControllerFamily;
  probe_dialect: ProbeController;
  probe_system: ProbeSystemType;
  /** Firmware feature availability for probing */
  firmware_features: {
    native_probing: boolean;
    feature_id?: string;
    available_from_year?: number | null;
  };
  /** Register-to-measurement mapping for reading probe results */
  result_registers: ProbeRegisterMap;
}

export interface ProbeRegisterMap {
  /** Where the probe stores measured X position */
  x_measured: string;
  /** Where the probe stores measured Y position */
  y_measured: string;
  /** Where the probe stores measured Z position */
  z_measured: string;
  /** Where the probe stores measured diameter (bore/boss) */
  diameter_measured?: string;
  /** Register format description */
  format_note: string;
}

export interface ProbeAvailabilityResult {
  controller_family: ControllerFamily;
  probing_available: boolean;
  native_probing: boolean;
  macro_probing: boolean;
  recommended_probe_system: ProbeSystemType;
  warnings: string[];
  notes: string[];
}

// ─── Controller Family → Probe Dialect Mapping ──────────────────────

const CONTROLLER_TO_PROBE: Record<ControllerFamily, ProbeController> = {
  fanuc_0i: "fanuc",
  fanuc_16i: "fanuc",
  fanuc_18i: "fanuc",
  fanuc_30i: "fanuc",
  fanuc_31i: "fanuc",
  siemens_828d: "siemens",
  siemens_840d: "siemens",
  siemens_one: "siemens",
  heidenhain_tnc640: "heidenhain",
  heidenhain_tnc7: "heidenhain",
  haas_ngc: "haas",
  mazak_smooth_ai: "mazak",
  mazak_smooth_g: "mazak",
  okuma_osp_p300: "okuma",
  okuma_osp_p500: "okuma",
  brother_speedio: "fanuc",      // Brother uses Fanuc-compatible macro calls
  mitsubishi_m80: "fanuc",       // Mitsubishi M80 supports Fanuc G65 macros
  fagor_8065: "fanuc",           // Fagor: Fanuc-compatible G65 probing macros
  citizen_cincom: "fanuc",       // Swiss: Fanuc-based, limited probing
  star_fanuc: "fanuc",           // Star: Fanuc-based, limited probing
  dmg_celos_siemens: "siemens",  // CELOS wrapping Siemens
  dmg_celos_fanuc: "fanuc",      // CELOS wrapping Fanuc
  hurco_max5: "fanuc",           // Hurco: Fanuc-compatible for probing
  doosan_puma: "fanuc",          // Doosan: Fanuc 0i-Plus based controls
  generic_fanuc: "fanuc",
  generic_iso: "fanuc",
};

/** Probing firmware feature IDs per controller (from FirmwareFeatureMatrixEngine) */
const PROBE_FEATURE_IDS: Partial<Record<ControllerFamily, string>> = {
  haas_ngc: "haas_m65_probe",
  siemens_840d: "siem_cycle977",
  siemens_828d: "siem_cycle977",
  siemens_one: "siem_cycle977",
  heidenhain_tnc640: "heid_probe",
  heidenhain_tnc7: "heid_probe",
  fanuc_31i: "fan_probing",
  fanuc_30i: "fan_probing",
  mazak_smooth_ai: "maz_probe",
  mazak_smooth_g: "maz_probe",
  okuma_osp_p300: "oku_probe",
  okuma_osp_p500: "oku_probe",
};

/** Default probe system recommendations per controller family */
const DEFAULT_PROBE_SYSTEM: Partial<Record<ControllerFamily, ProbeSystemType>> = {
  heidenhain_tnc640: "heidenhain_ts",
  heidenhain_tnc7: "heidenhain_ts",
  siemens_840d: "renishaw_rmp",
  siemens_828d: "renishaw_omp",
  siemens_one: "renishaw_rmp",
  haas_ngc: "renishaw_omp",
  fanuc_31i: "renishaw_omp",
  fanuc_30i: "renishaw_omp",
  mazak_smooth_ai: "renishaw_rmp",
  mazak_smooth_g: "renishaw_omp",
  okuma_osp_p300: "renishaw_omp",
  okuma_osp_p500: "renishaw_rmp",
  brother_speedio: "blum_z_nano",
  dmg_celos_siemens: "renishaw_rmp",
  dmg_celos_fanuc: "renishaw_rmp",
};

/** Register maps per probe dialect — where measurement results are stored */
const REGISTER_MAPS: Record<ProbeController, ProbeRegisterMap> = {
  fanuc: {
    x_measured: "#185",
    y_measured: "#186",
    z_measured: "#182",
    diameter_measured: "#187",
    format_note: "Fanuc macro variables #180-#199 (Renishaw Inspection Plus standard)",
  },
  haas: {
    x_measured: "#185",
    y_measured: "#186",
    z_measured: "#182",
    diameter_measured: "#187",
    format_note: "Haas NGC uses same Renishaw registers as Fanuc (#180-#199)",
  },
  siemens: {
    x_measured: "_OVR[0]",
    y_measured: "_OVR[1]",
    z_measured: "_OVR[2]",
    diameter_measured: "_OVR[3]",
    format_note: "Siemens CYCLE977 stores results in _OVR[] system variables",
  },
  heidenhain: {
    x_measured: "Q188",
    y_measured: "Q189",
    z_measured: "Q190",
    diameter_measured: "Q191",
    format_note: "Heidenhain TCH PROBE cycles store in Q188-Q199",
  },
  mazak: {
    x_measured: "#185",
    y_measured: "#186",
    z_measured: "#182",
    diameter_measured: "#187",
    format_note: "Mazak Smooth: Fanuc-compatible registers via Renishaw macros",
  },
  okuma: {
    x_measured: "#185",
    y_measured: "#186",
    z_measured: "#182",
    diameter_measured: "#187",
    format_note: "Okuma OSP: Fanuc-compatible G65 macro registers for Renishaw",
  },
};

// ─── Engine Implementation ───────────────────────────────────────────

class UnifiedProbingDialectEngineImpl {

  /**
   * Generate a WCS setup probing routine for any controller family.
   * Resolves controller family → probe dialect, checks firmware availability,
   * and delegates to ProbeRoutineGeneratorEngine.
   */
  generateWCSProbe(input: UnifiedProbeInput): UnifiedProbeOutput {
    this.validateInput(input);

    const dialect = CONTROLLER_TO_PROBE[input.controller_family];
    const probeSystem = input.probe_system ?? DEFAULT_PROBE_SYSTEM[input.controller_family] ?? "generic";
    const firmware = this.checkFirmwareAvailability(input.controller_family, input.year);
    const warnings: string[] = [];

    // Warn if firmware feature not available for this year
    if (!firmware.native_probing && firmware.available_from_year) {
      warnings.push(
        `Native probing unavailable for ${input.controller_family} before ${firmware.available_from_year}. ` +
        `Using G65 macro-based probing as fallback.`
      );
    }

    // Warn for controllers with limited probing
    if (["citizen_cincom", "star_fanuc"].includes(input.controller_family)) {
      warnings.push(
        `Swiss-type machine probing is limited. Ensure probe clearance with guide bushing ` +
        `and verify sub-spindle is retracted before probing.`
      );
    }

    // Generate via ProbeRoutineGeneratorEngine
    const result = probeRoutineGeneratorEngine.generateWCSSetup({
      controller: dialect,
      probe_tool_number: input.probe_tool_number,
      features: input.features,
      work_offset: input.work_offset,
      approach_distance: input.approach_distance,
      feed_rate: input.feed_rate,
    });

    return {
      ...result,
      warnings: [...warnings, ...result.warnings],
      controller_family: input.controller_family,
      probe_dialect: dialect,
      probe_system: probeSystem,
      firmware_features: firmware,
      result_registers: REGISTER_MAPS[dialect],
    };
  }

  /**
   * Generate a part inspection probing routine.
   */
  generateInspectionProbe(input: UnifiedProbeInput & {
    action_on_fail?: "alarm" | "compensate" | "skip";
    spc_output?: boolean;
  }): UnifiedProbeOutput {
    this.validateInput(input);

    const dialect = CONTROLLER_TO_PROBE[input.controller_family];
    const probeSystem = input.probe_system ?? DEFAULT_PROBE_SYSTEM[input.controller_family] ?? "generic";
    const firmware = this.checkFirmwareAvailability(input.controller_family, input.year);

    const result = probeRoutineGeneratorEngine.generatePartInspection({
      controller: dialect,
      features: input.features,
      action_on_fail: input.action_on_fail,
      spc_output: input.spc_output,
    });

    return {
      ...result,
      controller_family: input.controller_family,
      probe_dialect: dialect,
      probe_system: probeSystem,
      firmware_features: firmware,
      result_registers: REGISTER_MAPS[dialect],
    };
  }

  /**
   * Generate a tool measurement routine.
   */
  generateToolMeasure(input: {
    controller_family: ControllerFamily;
    year?: number;
    tool_numbers: number[];
    method?: "probe" | "laser" | "contact";
    measure_radius?: boolean;
  }): UnifiedProbeOutput {
    if (!input.controller_family) throw new Error("controller_family is required");
    if (!input.tool_numbers?.length) throw new Error("tool_numbers must be non-empty");

    const dialect = CONTROLLER_TO_PROBE[input.controller_family];
    const probeSystem = input.method === "laser" ? "blum_tc" as ProbeSystemType
      : DEFAULT_PROBE_SYSTEM[input.controller_family] ?? "generic";
    const firmware = this.checkFirmwareAvailability(input.controller_family, input.year);

    const result = probeRoutineGeneratorEngine.generateToolMeasurement({
      controller: dialect,
      tool_numbers: input.tool_numbers,
      method: input.method,
      measure_radius: input.measure_radius,
    });

    return {
      ...result,
      controller_family: input.controller_family,
      probe_dialect: dialect,
      probe_system: probeSystem,
      firmware_features: firmware,
      result_registers: REGISTER_MAPS[dialect],
    };
  }

  /**
   * Check probing availability for a controller family + year.
   */
  checkAvailability(controller_family: ControllerFamily, year?: number): ProbeAvailabilityResult {
    if (!controller_family) throw new Error("controller_family is required");

    const dialect = CONTROLLER_TO_PROBE[controller_family];
    const firmware = this.checkFirmwareAvailability(controller_family, year);
    const warnings: string[] = [];
    const notes: string[] = [];

    // All controllers support at least macro-based probing (G65)
    const macroProbing = true;
    const nativeProbing = firmware.native_probing;

    if (!nativeProbing && firmware.available_from_year && year) {
      warnings.push(`Native probing requires firmware from ${firmware.available_from_year}+`);
    }

    // Controller-specific notes
    if (dialect === "siemens") {
      notes.push("Siemens: CYCLE977/978/982 native probing cycles — no third-party macro required");
    } else if (dialect === "heidenhain") {
      notes.push("Heidenhain: TCH PROBE 4xx native cycles with Heidenhain TS probe recommended");
    } else {
      notes.push(`${dialect}: Renishaw Inspection Plus G65 P98xx macros (requires macro option)`);
    }

    if (["citizen_cincom", "star_fanuc"].includes(controller_family)) {
      warnings.push("Swiss-type: limited probe access, verify guide bushing clearance");
    }

    const recommendedSystem = DEFAULT_PROBE_SYSTEM[controller_family] ?? "generic";

    return {
      controller_family,
      probing_available: true,
      native_probing: nativeProbing,
      macro_probing: macroProbing,
      recommended_probe_system: recommendedSystem,
      warnings,
      notes,
    };
  }

  /**
   * List all supported controller families with their probe dialects.
   */
  listSupportedControllers(): Array<{ controller_family: ControllerFamily; probe_dialect: ProbeController; recommended_system: ProbeSystemType }> {
    return (Object.entries(CONTROLLER_TO_PROBE) as [ControllerFamily, ProbeController][]).map(
      ([cf, pd]) => ({
        controller_family: cf,
        probe_dialect: pd,
        recommended_system: DEFAULT_PROBE_SYSTEM[cf] ?? "generic" as ProbeSystemType,
      })
    );
  }

  /**
   * Execute router — dispatches actions.
   */
  execute(action: string, input: Record<string, unknown>): unknown {
    switch (action) {
      case "ppg_probe_wcs":
        return this.generateWCSProbe(input as unknown as UnifiedProbeInput);
      case "ppg_probe_inspect":
        return this.generateInspectionProbe(input as unknown as UnifiedProbeInput & { action_on_fail?: "alarm" | "compensate" | "skip"; spc_output?: boolean });
      case "ppg_probe_tool":
        return this.generateToolMeasure(input as unknown as { controller_family: ControllerFamily; year?: number; tool_numbers: number[]; method?: "probe" | "laser" | "contact"; measure_radius?: boolean });
      case "ppg_probe_check":
        return this.checkAvailability(input.controller_family as ControllerFamily, input.year as number | undefined);
      case "ppg_probe_controllers":
        return { controllers: this.listSupportedControllers() };
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  // ─── Private helpers ─────────────────────────────────────────────

  private validateInput(input: UnifiedProbeInput): void {
    if (!input.controller_family) throw new Error("controller_family is required");
    if (!input.features?.length) throw new Error("features must be non-empty array");
    if (input.year !== undefined && (input.year < 1980 || input.year > 2050)) {
      throw new Error(`Invalid year: ${input.year}. Must be between 1980 and 2050.`);
    }
  }

  private checkFirmwareAvailability(
    controller_family: ControllerFamily,
    year?: number
  ): UnifiedProbeOutput["firmware_features"] {
    const featureId = PROBE_FEATURE_IDS[controller_family];

    if (!featureId) {
      // No specific firmware feature tracked — assume macro-based probing always available
      return { native_probing: false, feature_id: undefined, available_from_year: null };
    }

    try {
      const available = year
        ? firmwareFeatureMatrixEngine.isFeatureAvailable(controller_family, featureId, year)
        : true; // No year specified → assume modern

      const features = firmwareFeatureMatrixEngine.getFeatures(controller_family);
      const feature = features.features.find(f => f.id === featureId);

      return {
        native_probing: available,
        feature_id: featureId,
        available_from_year: feature?.available_from_year ?? null,
      };
    } catch {
      // FirmwareFeatureMatrix doesn't have this controller — fallback
      return { native_probing: false, feature_id: featureId, available_from_year: null };
    }
  }
}

export const unifiedProbingDialectEngine = new UnifiedProbingDialectEngineImpl();
