// @ts-nocheck
/**
 * BatchCAMControllerEngines — 4 CAM Controller Catalog Engines in One File
 *
 * Maps controller/machine definition formats from Mastercam, SolidCAM, NX, and
 * PowerMill to PRISM's 910 machine profiles. Each engine contains an inline
 * catalog of 8-10 common controllers for its CAM system.
 *
 * @engine BatchCAMControllerEngines
 * @shortcode E1141
 * @dispatcher camDispatcher
 * @actions
 *   mastercam_controller_lookup, mastercam_controller_list,
 *   solidcam_controller_lookup, solidcam_controller_list,
 *   nx_controller_lookup, nx_controller_list,
 *   powermill_controller_lookup, powermill_controller_list
 * @milestone CAMX-MS7/U02
 */

// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface ControllerProfile {
  controller_name: string;
  manufacturer: string;
  axes: number;
  max_rpm: number;
  max_power_kw: number;
  post_format: string;
  supported_cycles: string[];
  special_features: string[];
}

export interface ControllerLookupResult {
  controller: ControllerProfile;
  cam_system: string;
  mapping_notes: string;
}

export interface PostMappingResult {
  controller_name: string;
  post_file: string;
  post_format: string;
  dialect: string;
  special_codes: string[];
}

export interface GPPMappingResult {
  controller_name: string;
  gpp_file: string;
  gpp_version: string;
  coordinate_system: string;
  tool_table_format: string;
}

export interface MTBMappingResult {
  controller_name: string;
  mtb_file: string;
  sinumerik_version: string;
  channels: number;
  csys_count: number;
}

// ─── Base Class ───────────────────────────────────────────────────────────────

abstract class CAMControllerCatalogBase {
  readonly camSystem: string;
  protected abstract readonly catalog: Record<string, ControllerProfile>;

  constructor(camSystem: string) {
    this.camSystem = camSystem;
  }

  lookup(controller: string): ControllerLookupResult | { error: string } {
    const key = controller.trim();
    // Direct hit
    if (this.catalog[key]) {
      return {
        controller: this.catalog[key],
        cam_system: this.camSystem,
        mapping_notes: `Direct match in ${this.camSystem} controller catalog`,
      };
    }
    // Case-insensitive search
    const lower = key.toLowerCase();
    for (const [name, profile] of Object.entries(this.catalog)) {
      if (name.toLowerCase() === lower) {
        return {
          controller: profile,
          cam_system: this.camSystem,
          mapping_notes: `Case-insensitive match in ${this.camSystem} controller catalog`,
        };
      }
    }
    // Partial match
    for (const [name, profile] of Object.entries(this.catalog)) {
      if (name.toLowerCase().includes(lower) || lower.includes(name.toLowerCase())) {
        return {
          controller: profile,
          cam_system: this.camSystem,
          mapping_notes: `Partial match: "${name}" in ${this.camSystem} controller catalog`,
        };
      }
    }
    return {
      error: `Controller "${controller}" not found in ${this.camSystem} catalog. Use listControllers() to see available entries.`,
    };
  }

  listControllers(): { cam_system: string; controllers: Array<{ name: string; manufacturer: string; axes: number; max_rpm: number }> } {
    return {
      cam_system: this.camSystem,
      controllers: Object.entries(this.catalog).map(([name, p]) => ({
        name,
        manufacturer: p.manufacturer,
        axes: p.axes,
        max_rpm: p.max_rpm,
      })),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. MastercamControllerCatalogEngine
// ═══════════════════════════════════════════════════════════════════════════════

class MastercamControllerCatalogEngine extends CAMControllerCatalogBase {
  constructor() { super("Mastercam"); }

  protected readonly catalog: Record<string, ControllerProfile> = {
    "Fanuc 31i-B5": {
      controller_name: "Fanuc 31i-B5",
      manufacturer: "FANUC",
      axes: 5,
      max_rpm: 20000,
      max_power_kw: 37,
      post_format: "mcam-mmd",
      supported_cycles: ["G73", "G74", "G76", "G80-G89", "G81", "G82", "G83", "G84", "G85"],
      special_features: ["AICC-II", "nano_smoothing", "high_speed_skip", "tool_center_point"],
    },
    "Siemens 840D sl": {
      controller_name: "Siemens 840D sl",
      manufacturer: "Siemens",
      axes: 5,
      max_rpm: 24000,
      max_power_kw: 45,
      post_format: "mcam-mmd",
      supported_cycles: ["CYCLE81-CYCLE89", "CYCLE800", "CYCLE832", "MCALL", "TRAORI"],
      special_features: ["TRAORI", "compressor", "look_ahead_128", "CYCLE832_HSC"],
    },
    "Haas NGC": {
      controller_name: "Haas NGC",
      manufacturer: "Haas",
      axes: 4,
      max_rpm: 15000,
      max_power_kw: 22.4,
      post_format: "mcam-mmd",
      supported_cycles: ["G73", "G74", "G76", "G81-G89", "G150", "G154"],
      special_features: ["visual_programming", "wireless_probing", "dynamic_work_offsets"],
    },
    "Mazak SmoothAi": {
      controller_name: "Mazak SmoothAi",
      manufacturer: "Mazak",
      axes: 5,
      max_rpm: 18000,
      max_power_kw: 30,
      post_format: "mcam-mmd",
      supported_cycles: ["G73", "G74", "G76", "G80-G89", "G43.4", "G68.2"],
      special_features: ["smooth_ai", "thermal_shield", "voice_advisor", "intelligent_pocket"],
    },
    "Heidenhain TNC 640": {
      controller_name: "Heidenhain TNC 640",
      manufacturer: "Heidenhain",
      axes: 5,
      max_rpm: 20000,
      max_power_kw: 35,
      post_format: "mcam-mmd",
      supported_cycles: ["CYCLE DEF 200-208", "CYCLE DEF 220-227", "PATTERN DEF"],
      special_features: ["ADP", "AFC", "KinematicsOpt", "DCM", "cross_talk_compensation"],
    },
    "Okuma OSP-P300A": {
      controller_name: "Okuma OSP-P300A",
      manufacturer: "Okuma",
      axes: 5,
      max_rpm: 15000,
      max_power_kw: 30,
      post_format: "mcam-mmd",
      supported_cycles: ["G71-G76", "G80-G89", "NAVI_MILL", "NAVI_LATHE"],
      special_features: ["thermo_friendly_concept", "collision_avoidance", "super_nurbs", "machining_navi"],
    },
    "Mitsubishi M800V": {
      controller_name: "Mitsubishi M800V",
      manufacturer: "Mitsubishi",
      axes: 5,
      max_rpm: 20000,
      max_power_kw: 26,
      post_format: "mcam-mmd",
      supported_cycles: ["G73", "G74", "G76", "G80-G89", "G43.4", "G43.5"],
      special_features: ["SSS_4G", "OMR_FF", "high_quality_surface", "vibration_suppression"],
    },
    "DMG MORI CELOS": {
      controller_name: "DMG MORI CELOS",
      manufacturer: "DMG MORI",
      axes: 5,
      max_rpm: 20000,
      max_power_kw: 52,
      post_format: "mcam-mmd",
      supported_cycles: ["CYCLE81-CYCLE89", "CYCLE800", "TRAORI", "TRANSMIT"],
      special_features: ["CELOS_apps", "MPC", "ATC", "tool_monitoring", "integrated_simulation"],
    },
    "Brother CNC-C00": {
      controller_name: "Brother CNC-C00",
      manufacturer: "Brother",
      axes: 4,
      max_rpm: 27000,
      max_power_kw: 7.5,
      post_format: "mcam-mmd",
      supported_cycles: ["G73", "G81-G89", "G43.4"],
      special_features: ["overlap_tapping", "rapid_tool_change_0.9s", "compact_footprint"],
    },
  };

  getPostMapping(controller: string): PostMappingResult | { error: string } {
    const res = this.lookup(controller);
    if ("error" in res) return res;
    const c = res.controller;
    const mfr = c.manufacturer.toLowerCase().replace(/\s+/g, "_");
    return {
      controller_name: c.controller_name,
      post_file: `${mfr}_${c.axes}ax.mcpost`,
      post_format: c.post_format,
      dialect: c.manufacturer === "Heidenhain" ? "conversational" : "iso",
      special_codes: c.supported_cycles.slice(0, 5),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. SolidCAMControllerCatalogEngine
// ═══════════════════════════════════════════════════════════════════════════════

class SolidCAMControllerCatalogEngine extends CAMControllerCatalogBase {
  constructor() { super("SolidCAM"); }

  protected readonly catalog: Record<string, ControllerProfile> = {
    "Fanuc 31i-B5": {
      controller_name: "Fanuc 31i-B5",
      manufacturer: "FANUC",
      axes: 5,
      max_rpm: 20000,
      max_power_kw: 37,
      post_format: "gpp",
      supported_cycles: ["G73", "G74", "G76", "G80-G89", "G43.4", "G43.5"],
      special_features: ["iMachining_optimized", "nano_smoothing", "AICC_II"],
    },
    "Siemens 840D sl": {
      controller_name: "Siemens 840D sl",
      manufacturer: "Siemens",
      axes: 5,
      max_rpm: 24000,
      max_power_kw: 45,
      post_format: "gpp",
      supported_cycles: ["CYCLE81-CYCLE89", "CYCLE800", "CYCLE832", "TRAORI"],
      special_features: ["iMachining_optimized", "TRAORI_5ax", "compressor"],
    },
    "Haas NGC": {
      controller_name: "Haas NGC",
      manufacturer: "Haas",
      axes: 3,
      max_rpm: 15000,
      max_power_kw: 22.4,
      post_format: "gpp",
      supported_cycles: ["G73", "G74", "G76", "G81-G89", "G150"],
      special_features: ["iMachining_standard", "wireless_probing", "visual_programming"],
    },
    "Hurco WinMax": {
      controller_name: "Hurco WinMax",
      manufacturer: "Hurco",
      axes: 5,
      max_rpm: 12000,
      max_power_kw: 18.5,
      post_format: "gpp",
      supported_cycles: ["G73", "G81-G89", "G43.4"],
      special_features: ["conversational_programming", "UltiMotion", "AdaptiPath"],
    },
    "Heidenhain TNC 640": {
      controller_name: "Heidenhain TNC 640",
      manufacturer: "Heidenhain",
      axes: 5,
      max_rpm: 20000,
      max_power_kw: 35,
      post_format: "gpp",
      supported_cycles: ["CYCLE DEF 200-208", "CYCLE DEF 220-227"],
      special_features: ["iMachining_optimized", "ADP", "AFC", "KinematicsOpt"],
    },
    "Doosan Fanuc 31i": {
      controller_name: "Doosan Fanuc 31i",
      manufacturer: "Doosan",
      axes: 4,
      max_rpm: 12000,
      max_power_kw: 22,
      post_format: "gpp",
      supported_cycles: ["G73", "G74", "G76", "G80-G89"],
      special_features: ["iMachining_standard", "high_torque_spindle"],
    },
    "Makino Pro6": {
      controller_name: "Makino Pro6",
      manufacturer: "Makino",
      axes: 5,
      max_rpm: 20000,
      max_power_kw: 37,
      post_format: "gpp",
      supported_cycles: ["G73", "G81-G89", "G43.4", "G43.5", "SGI"],
      special_features: ["SGI_smoothing", "collision_safe_guard", "inertia_active_control"],
    },
    "Citizen Cincom": {
      controller_name: "Citizen Cincom",
      manufacturer: "Citizen",
      axes: 7,
      max_rpm: 15000,
      max_power_kw: 3.7,
      post_format: "gpp",
      supported_cycles: ["G71-G76", "G80-G89"],
      special_features: ["swiss_turning", "LFV_low_freq_vibration", "gang_tooling", "dual_spindle"],
    },
    "Nakamura-Tome SC-100": {
      controller_name: "Nakamura-Tome SC-100",
      manufacturer: "Nakamura-Tome",
      axes: 5,
      max_rpm: 12000,
      max_power_kw: 15,
      post_format: "gpp",
      supported_cycles: ["G71-G76", "G80-G89", "SUPERIMPOSED"],
      special_features: ["mill_turn", "superimposed_machining", "Y_axis_milling"],
    },
  };

  getGPPMapping(controller: string): GPPMappingResult | { error: string } {
    const res = this.lookup(controller);
    if ("error" in res) return res;
    const c = res.controller;
    const mfr = c.manufacturer.toLowerCase().replace(/\s+/g, "_");
    return {
      controller_name: c.controller_name,
      gpp_file: `${mfr}_${c.axes}ax.gpp`,
      gpp_version: "SolidCAM_2024",
      coordinate_system: c.axes >= 5 ? "CSYS_multi_5ax" : "CSYS_standard",
      tool_table_format: c.axes >= 7 ? "swiss_dual_turret" : "standard_tool_table",
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. NXCAMControllerCatalogEngine
// ═══════════════════════════════════════════════════════════════════════════════

class NXCAMControllerCatalogEngine extends CAMControllerCatalogBase {
  constructor() { super("NX CAM"); }

  protected readonly catalog: Record<string, ControllerProfile> = {
    "Siemens 840D sl": {
      controller_name: "Siemens 840D sl",
      manufacturer: "Siemens",
      axes: 5,
      max_rpm: 24000,
      max_power_kw: 45,
      post_format: "tcl-mtb",
      supported_cycles: ["CYCLE81-CYCLE89", "CYCLE800", "CYCLE832", "TRAORI", "TRANSMIT"],
      special_features: ["native_sinumerik", "multi_channel", "TRAORI_5ax", "ShopMill"],
    },
    "Fanuc 31i-B5": {
      controller_name: "Fanuc 31i-B5",
      manufacturer: "FANUC",
      axes: 5,
      max_rpm: 20000,
      max_power_kw: 37,
      post_format: "tcl-mtb",
      supported_cycles: ["G73", "G74", "G76", "G80-G89", "G43.4", "G43.5"],
      special_features: ["AICC_II", "nano_smoothing", "tool_center_point"],
    },
    "Heidenhain TNC 640": {
      controller_name: "Heidenhain TNC 640",
      manufacturer: "Heidenhain",
      axes: 5,
      max_rpm: 20000,
      max_power_kw: 35,
      post_format: "tcl-mtb",
      supported_cycles: ["CYCLE DEF 200-208", "CYCLE DEF 220-227", "PATTERN DEF"],
      special_features: ["ADP", "AFC", "KinematicsOpt", "DCM"],
    },
    "Siemens 828D": {
      controller_name: "Siemens 828D",
      manufacturer: "Siemens",
      axes: 3,
      max_rpm: 12000,
      max_power_kw: 18.5,
      post_format: "tcl-mtb",
      supported_cycles: ["CYCLE81-CYCLE89", "CYCLE800"],
      special_features: ["animated_elements", "job_planning", "program_guide"],
    },
    "Mazak SmoothAi": {
      controller_name: "Mazak SmoothAi",
      manufacturer: "Mazak",
      axes: 5,
      max_rpm: 18000,
      max_power_kw: 30,
      post_format: "tcl-mtb",
      supported_cycles: ["G73", "G74", "G76", "G80-G89", "G43.4", "G68.2"],
      special_features: ["smooth_ai", "thermal_shield", "intelligent_pocket"],
    },
    "Okuma OSP-P300A": {
      controller_name: "Okuma OSP-P300A",
      manufacturer: "Okuma",
      axes: 5,
      max_rpm: 15000,
      max_power_kw: 30,
      post_format: "tcl-mtb",
      supported_cycles: ["G71-G76", "G80-G89", "NAVI_MILL"],
      special_features: ["thermo_friendly_concept", "collision_avoidance", "super_nurbs"],
    },
    "NUM Flexium+": {
      controller_name: "NUM Flexium+",
      manufacturer: "NUM",
      axes: 5,
      max_rpm: 16000,
      max_power_kw: 25,
      post_format: "tcl-mtb",
      supported_cycles: ["G80-G89", "G43.4"],
      special_features: ["open_architecture", "EtherCAT", "flexium_3D"],
    },
    "Fagor 8065M": {
      controller_name: "Fagor 8065M",
      manufacturer: "Fagor",
      axes: 5,
      max_rpm: 15000,
      max_power_kw: 22,
      post_format: "tcl-mtb",
      supported_cycles: ["G80-G89", "G43.4", "G43.5"],
      special_features: ["HSSA", "DYNOVR", "tangential_control", "retrace"],
    },
  };

  getMTBMapping(controller: string): MTBMappingResult | { error: string } {
    const res = this.lookup(controller);
    if ("error" in res) return res;
    const c = res.controller;
    const isSiemens = c.manufacturer === "Siemens";
    return {
      controller_name: c.controller_name,
      mtb_file: `${c.manufacturer.toLowerCase().replace(/\s+/g, "_")}_${c.axes}ax.dat`,
      sinumerik_version: isSiemens ? (c.controller_name.includes("828") ? "828D" : "840D_sl") : "N/A",
      channels: isSiemens ? (c.axes >= 5 ? 2 : 1) : 1,
      csys_count: c.axes >= 5 ? 4 : 1,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. PowerMillControllerCatalogEngine
// ═══════════════════════════════════════════════════════════════════════════════

class PowerMillControllerCatalogEngine extends CAMControllerCatalogBase {
  constructor() { super("PowerMill"); }

  protected readonly catalog: Record<string, ControllerProfile> = {
    "Fanuc 31i-B5": {
      controller_name: "Fanuc 31i-B5",
      manufacturer: "FANUC",
      axes: 5,
      max_rpm: 20000,
      max_power_kw: 37,
      post_format: "pmoptz",
      supported_cycles: ["G73", "G74", "G76", "G80-G89", "G43.4"],
      special_features: ["AICC_II", "nano_smoothing", "5ax_TCP"],
    },
    "Siemens 840D sl": {
      controller_name: "Siemens 840D sl",
      manufacturer: "Siemens",
      axes: 5,
      max_rpm: 24000,
      max_power_kw: 45,
      post_format: "pmoptz",
      supported_cycles: ["CYCLE81-CYCLE89", "CYCLE800", "CYCLE832", "TRAORI"],
      special_features: ["TRAORI", "compressor", "look_ahead_128", "CYCLE832_HSC"],
    },
    "Heidenhain TNC 640": {
      controller_name: "Heidenhain TNC 640",
      manufacturer: "Heidenhain",
      axes: 5,
      max_rpm: 20000,
      max_power_kw: 35,
      post_format: "pmoptz",
      supported_cycles: ["CYCLE DEF 200-208", "CYCLE DEF 220-227"],
      special_features: ["ADP", "AFC", "KinematicsOpt", "DCM"],
    },
    "Mazak SmoothAi": {
      controller_name: "Mazak SmoothAi",
      manufacturer: "Mazak",
      axes: 5,
      max_rpm: 18000,
      max_power_kw: 30,
      post_format: "pmoptz",
      supported_cycles: ["G73", "G74", "G76", "G80-G89", "G43.4", "G68.2"],
      special_features: ["smooth_ai", "thermal_shield", "intelligent_pocket"],
    },
    "Haas NGC": {
      controller_name: "Haas NGC",
      manufacturer: "Haas",
      axes: 3,
      max_rpm: 15000,
      max_power_kw: 22.4,
      post_format: "pmoptz",
      supported_cycles: ["G73", "G74", "G76", "G81-G89", "G150"],
      special_features: ["visual_programming", "wireless_probing"],
    },
    "DMG MORI CELOS": {
      controller_name: "DMG MORI CELOS",
      manufacturer: "DMG MORI",
      axes: 5,
      max_rpm: 20000,
      max_power_kw: 52,
      post_format: "pmoptz",
      supported_cycles: ["CYCLE81-CYCLE89", "CYCLE800", "TRAORI", "TRANSMIT"],
      special_features: ["CELOS_apps", "MPC", "ATC", "integrated_simulation"],
    },
    "Hermle C 42 U": {
      controller_name: "Hermle C 42 U",
      manufacturer: "Hermle",
      axes: 5,
      max_rpm: 18000,
      max_power_kw: 29,
      post_format: "pmoptz",
      supported_cycles: ["CYCLE81-CYCLE89", "CYCLE800", "TRAORI"],
      special_features: ["pallet_changer", "mineral_casting_bed", "high_dynamics"],
    },
    "Matsuura MAM72": {
      controller_name: "Matsuura MAM72",
      manufacturer: "Matsuura",
      axes: 5,
      max_rpm: 20000,
      max_power_kw: 37,
      post_format: "pmoptz",
      supported_cycles: ["G73", "G81-G89", "G43.4", "G43.5"],
      special_features: ["pallet_tower", "120_tool_magazine", "high_speed_5ax"],
    },
    "GF Mikron MILL P 800U": {
      controller_name: "GF Mikron MILL P 800U",
      manufacturer: "GF Machining Solutions",
      axes: 5,
      max_rpm: 20000,
      max_power_kw: 36,
      post_format: "pmoptz",
      supported_cycles: ["CYCLE81-CYCLE89", "CYCLE800", "TRAORI"],
      special_features: ["MSP_machine_spindle_protection", "ITC_intelligent_thermal_compensation", "OSS_operator_support"],
    },
    "Starrag STC 1250": {
      controller_name: "Starrag STC 1250",
      manufacturer: "Starrag",
      axes: 5,
      max_rpm: 16000,
      max_power_kw: 60,
      post_format: "pmoptz",
      supported_cycles: ["CYCLE81-CYCLE89", "CYCLE800", "TRAORI"],
      special_features: ["high_torque_aerospace", "large_envelope", "titanium_optimized"],
    },
  };

  getPostMapping(controller: string): PostMappingResult | { error: string } {
    const res = this.lookup(controller);
    if ("error" in res) return res;
    const c = res.controller;
    const mfr = c.manufacturer.toLowerCase().replace(/\s+/g, "_");
    return {
      controller_name: c.controller_name,
      post_file: `${mfr}_${c.axes}ax.pmoptz`,
      post_format: c.post_format,
      dialect: c.manufacturer === "Heidenhain" ? "conversational" : "iso",
      special_codes: c.supported_cycles.slice(0, 5),
    };
  }
}

// ─── Singletons ───────────────────────────────────────────────────────────────

export const mastercamControllerCatalogEngine  = new MastercamControllerCatalogEngine();
export const solidCAMControllerCatalogEngine   = new SolidCAMControllerCatalogEngine();
export const nxCAMControllerCatalogEngine      = new NXCAMControllerCatalogEngine();
export const powerMillControllerCatalogEngine  = new PowerMillControllerCatalogEngine();
