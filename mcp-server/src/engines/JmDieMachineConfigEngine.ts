/**
 * JmDieMachineConfigEngine — Detailed Machine Configurations for JM Die Company
 *
 * Provides OEM-published specifications for all 21 JM Die production machines.
 * Complements ShopConfigurationEngine (rates/scheduling) with physical machine
 * parameters needed by post-processors, collision detection, toolpath engines,
 * and capacity planning.
 *
 * Data sources:
 *   - Okuma product datasheets (GENOS L-series, LB3000, Multus B250, MB-56VA)
 *   - Haas product datasheets (VF-2, OM-2)
 *   - Hurco product datasheets (VMX30i)
 *   - Roku-Roku product datasheets (RMX-5)
 *   - Mitsubishi Electric product datasheets (FA10S, EA12V, EA8S)
 *   - 140-agent resource audit (2026-04-11)
 *
 * @module JmDieMachineConfigEngine
 */

// ============================================================================
// TYPES
// ============================================================================

/** Machine category classification */
export type MachineType =
  | "lathe"
  | "vmc"
  | "mill_turn"
  | "wire_edm"
  | "sinker_edm"
  | "5axis"
  | "grinder"
  | "saw"
  | "manual_lathe";

/** Axis configuration — linear and rotary axes */
export interface AxisConfig {
  /** Linear axis labels, e.g. ["X", "Z"] for lathe, ["X", "Y", "Z"] for mill */
  linear: string[];
  /** Rotary axis labels, e.g. ["C"] for mill-turn, ["A", "B"] for 5-axis */
  rotary: string[];
  /** Total simultaneous axes */
  totalAxes: number;
}

/** Spindle specifications from OEM datasheets */
export interface SpindleConfig {
  /** Maximum spindle speed in RPM */
  maxRpm: number;
  /** Spindle motor power in kW, null if not applicable */
  powerKw: number | null;
  /** Spindle bore diameter in mm, null if not applicable */
  bore: number | null;
  /** Taper type, e.g. "BT40", "CAT40", "HSK-A63", null for lathes */
  taper: string | null;
}

/** Work envelope dimensions from OEM datasheets */
export interface WorkEnvelope {
  /** X-axis travel in mm */
  xTravel: number | null;
  /** Y-axis travel in mm (null for 2-axis lathes) */
  yTravel: number | null;
  /** Z-axis travel in mm */
  zTravel: number | null;
  /** Maximum turning diameter in mm (lathes only) */
  maxTurningDiameter: number | null;
  /** Maximum turning length in mm (lathes only) */
  maxTurningLength: number | null;
  /** Table size in mm as "WxD" string (mills only), null for lathes */
  tableSizeMm: string | null;
}

/** Complete machine configuration with OEM-published specifications */
export interface MachineConfig {
  /** Unique machine identifier, e.g. "okuma-genos-l300" */
  id: string;
  /** Full display name, e.g. "Okuma GENOS L300" */
  name: string;
  /** OEM manufacturer, e.g. "Okuma", "Haas" */
  oem: string;
  /** Model designation, e.g. "GENOS L300" */
  model: string;
  /** Machine type classification */
  type: MachineType;
  /** Controller model, e.g. "OSP-P300L", "NGC", "WinMAX" */
  controller: string;
  /** Axis configuration */
  axes: AxisConfig;
  /** Spindle specifications */
  spindle: SpindleConfig;
  /** Work envelope dimensions */
  workEnvelope: WorkEnvelope;
  /** Tool magazine or turret station count */
  toolCapacity: number;
  /** Available coolant delivery modes */
  coolantModes: string[];
  /** Probing system installed, null if none */
  probing: string | null;
  /** CPS post-processor filename, null if no CNC post */
  postProcessor: string | null;
  /** G-code dialect identifier for post-processing */
  gCodeDialect: string;
  /** Machine operational status */
  status: "active" | "support";
}

// ============================================================================
// MACHINE CONFIGURATIONS — OEM-published specifications
// ============================================================================

const JM_DIE_MACHINES: readonly MachineConfig[] = [
  // ── OKUMA LATHES (7) ─────────────────────────────────────────────────────
  {
    id: "okuma-genos-l300",
    name: "Okuma GENOS L300",
    oem: "Okuma",
    model: "GENOS L300",
    type: "lathe",
    controller: "OSP-P300L",
    axes: { linear: ["X", "Z"], rotary: [], totalAxes: 2 },
    spindle: { maxRpm: 4500, powerKw: 15, bore: 62, taper: null },
    workEnvelope: {
      xTravel: 165, yTravel: null, zTravel: 400,
      maxTurningDiameter: 300, maxTurningLength: 400, tableSizeMm: null,
    },
    toolCapacity: 12,
    coolantModes: ["flood", "mist"],
    probing: null,
    postProcessor: "OKUMA_GENOS_L300M_OSP-P300L-R_PRISM.cps",
    gCodeDialect: "okuma_osp",
    status: "active",
  },
  {
    id: "okuma-genos-l200",
    name: "Okuma GENOS L200",
    oem: "Okuma",
    model: "GENOS L200",
    type: "lathe",
    controller: "OSP-P300L",
    axes: { linear: ["X", "Z"], rotary: [], totalAxes: 2 },
    spindle: { maxRpm: 5000, powerKw: 11, bore: null, taper: null },
    workEnvelope: {
      xTravel: 140, yTravel: null, zTravel: 300,
      maxTurningDiameter: 230, maxTurningLength: 300, tableSizeMm: null,
    },
    toolCapacity: 12,
    coolantModes: ["flood"],
    probing: null,
    postProcessor: "OKUMA_GENOS_L200EM_OSP-P200LA-R_PRISM.cps",
    gCodeDialect: "okuma_osp",
    status: "active",
  },
  {
    id: "okuma-genos-l400",
    name: "Okuma GENOS L400",
    oem: "Okuma",
    model: "GENOS L400",
    type: "lathe",
    controller: "OSP-P300L",
    axes: { linear: ["X", "Z"], rotary: [], totalAxes: 2 },
    spindle: { maxRpm: 3800, powerKw: 18.5, bore: null, taper: null },
    workEnvelope: {
      xTravel: 200, yTravel: null, zTravel: 500,
      maxTurningDiameter: 400, maxTurningLength: 500, tableSizeMm: null,
    },
    toolCapacity: 12,
    coolantModes: ["flood", "mist"],
    probing: null,
    postProcessor: "OKUMA_GENOS_L400II_P300LA-Ai-Enhanced.cps",
    gCodeDialect: "okuma_osp",
    status: "active",
  },
  {
    id: "okuma-lnc8",
    name: "Okuma LNC8",
    oem: "Okuma",
    model: "LNC8",
    type: "lathe",
    controller: "OSP",
    axes: { linear: ["X", "Z"], rotary: [], totalAxes: 2 },
    spindle: { maxRpm: 4000, powerKw: 11, bore: null, taper: null },
    workEnvelope: {
      xTravel: 200, yTravel: null, zTravel: 500,
      maxTurningDiameter: 350, maxTurningLength: 500, tableSizeMm: null,
    },
    toolCapacity: 12,
    coolantModes: ["flood"],
    probing: null,
    postProcessor: "OKUMA_LNC8_PRISM.cps",
    gCodeDialect: "okuma_osp",
    status: "active",
  },
  {
    id: "okuma-crown",
    name: "Okuma Crown",
    oem: "Okuma",
    model: "Crown",
    type: "lathe",
    controller: "OSP",
    axes: { linear: ["X", "Z"], rotary: [], totalAxes: 2 },
    spindle: { maxRpm: 3800, powerKw: 11, bore: null, taper: null },
    workEnvelope: {
      xTravel: 200, yTravel: null, zTravel: 500,
      maxTurningDiameter: 350, maxTurningLength: 500, tableSizeMm: null,
    },
    toolCapacity: 8,
    coolantModes: ["flood"],
    probing: null,
    postProcessor: "OKUMA_CROWN_L1060_OSP-U10L_PRISM.cps",
    gCodeDialect: "okuma_osp",
    status: "active",
  },
  {
    id: "okuma-lb3000",
    name: "Okuma LB3000",
    oem: "Okuma",
    model: "LB3000",
    type: "lathe",
    controller: "OSP",
    axes: { linear: ["X", "Z"], rotary: [], totalAxes: 2 },
    spindle: { maxRpm: 4200, powerKw: 22, bore: null, taper: null },
    workEnvelope: {
      xTravel: 200, yTravel: null, zTravel: 500,
      maxTurningDiameter: 380, maxTurningLength: 500, tableSizeMm: null,
    },
    toolCapacity: 12,
    coolantModes: ["flood", "high_pressure"],
    probing: null,
    postProcessor: "OKUMA_LATHE_LB3000-Ai-Enhanced.cps",
    gCodeDialect: "okuma_osp",
    status: "active",
  },
  {
    id: "okuma-multus-b250",
    name: "Okuma Multus B250",
    oem: "Okuma",
    model: "Multus B250",
    type: "mill_turn",
    controller: "OSP-P300MA",
    axes: { linear: ["X", "Y", "Z"], rotary: ["C"], totalAxes: 4 },
    spindle: { maxRpm: 5000, powerKw: 22, bore: null, taper: null },
    workEnvelope: {
      xTravel: 260, yTravel: 130, zTravel: 735,
      maxTurningDiameter: 400, maxTurningLength: 735, tableSizeMm: null,
    },
    toolCapacity: 32,
    coolantModes: ["flood", "mist", "tsc1", "tsc2", "air", "air_through", "flood_through"],
    probing: null,
    postProcessor: "OKUMA_MULTUS_B250IIW-Ai-Enhanced-Fixed.cps",
    gCodeDialect: "okuma_osp",
    status: "active",
  },

  // ── MILLS (5) ────────────────────────────────────────────────────────────
  {
    id: "haas-vf-2",
    name: "Haas VF-2",
    oem: "Haas",
    model: "VF-2",
    type: "vmc",
    controller: "NGC",
    axes: { linear: ["X", "Y", "Z"], rotary: [], totalAxes: 3 },
    spindle: { maxRpm: 8100, powerKw: 22.4, bore: null, taper: "CAT40" },
    workEnvelope: {
      xTravel: 762, yTravel: 406, zTravel: 508,
      maxTurningDiameter: null, maxTurningLength: null, tableSizeMm: "914x356",
    },
    toolCapacity: 20,
    coolantModes: ["flood", "mist"],
    probing: "Renishaw EP+IP",
    postProcessor: "HAAS_VF2_-Ai-Enhanced_(iMachining).cps",
    gCodeDialect: "haas_ngc",
    status: "active",
  },
  {
    id: "hurco-vmx30i",
    name: "Hurco VMX30i",
    oem: "Hurco",
    model: "VMX30i",
    type: "vmc",
    controller: "WinMAX",
    axes: { linear: ["X", "Y", "Z"], rotary: [], totalAxes: 3 },
    spindle: { maxRpm: 12000, powerKw: 22, bore: null, taper: "BT40" },
    workEnvelope: {
      xTravel: 762, yTravel: 406, zTravel: 508,
      maxTurningDiameter: null, maxTurningLength: null, tableSizeMm: "914x406",
    },
    toolCapacity: 24,
    coolantModes: ["flood", "mist"],
    probing: "Renishaw EP+IP",
    postProcessor: "HURCO_VM30i_PRISM_v11.cps",
    gCodeDialect: "fanuc",
    status: "active",
  },
  {
    id: "okuma-mb-56va",
    name: "Okuma MB-56VA",
    oem: "Okuma",
    model: "MB-56VA",
    type: "vmc",
    controller: "OSP",
    axes: { linear: ["X", "Y", "Z"], rotary: [], totalAxes: 3 },
    spindle: { maxRpm: 6000, powerKw: 22, bore: null, taper: "BT50" },
    workEnvelope: {
      xTravel: 1050, yTravel: 560, zTravel: 460,
      maxTurningDiameter: null, maxTurningLength: null, tableSizeMm: "1300x560",
    },
    toolCapacity: 32,
    coolantModes: ["flood", "mist"],
    probing: null,
    postProcessor: null,
    gCodeDialect: "okuma_osp",
    status: "active",
  },
  {
    id: "haas-om-2",
    name: "Haas OM-2",
    oem: "Haas",
    model: "OM-2",
    type: "vmc",
    controller: "PRE-NGC",
    axes: { linear: ["X", "Y", "Z"], rotary: [], totalAxes: 3 },
    spindle: { maxRpm: 30000, powerKw: 7.5, bore: null, taper: "BT30" },
    workEnvelope: {
      xTravel: 305, yTravel: 254, zTravel: 305,
      maxTurningDiameter: null, maxTurningLength: null, tableSizeMm: null,
    },
    toolCapacity: 10,
    coolantModes: ["flood", "mist"],
    probing: null,
    postProcessor: "HAAS_OM-2_PRE-NGC_PRISM.cps",
    gCodeDialect: "haas_ngc",
    status: "active",
  },
  {
    id: "roku-roku-rmx5",
    name: "Roku-Roku RMX-5",
    oem: "Roku-Roku",
    model: "RMX-5",
    type: "5axis",
    controller: "Mitsubishi",
    axes: { linear: ["X", "Y", "Z"], rotary: ["A", "B"], totalAxes: 5 },
    spindle: { maxRpm: 40000, powerKw: 5.5, bore: null, taper: "HSK-E25" },
    workEnvelope: {
      xTravel: 500, yTravel: 400, zTravel: 300,
      maxTurningDiameter: null, maxTurningLength: null, tableSizeMm: null,
    },
    toolCapacity: 16,
    coolantModes: ["mist", "air"],
    probing: "Blum Quickstart",
    postProcessor: null,
    gCodeDialect: "fanuc",
    status: "active",
  },

  // ── EDM (3) ──────────────────────────────────────────────────────────────
  {
    id: "mitsubishi-fa10s",
    name: "Mitsubishi FA10S",
    oem: "Mitsubishi",
    model: "FA10S",
    type: "wire_edm",
    controller: "W31MV-2",
    axes: { linear: ["X", "Y", "Z", "U", "V"], rotary: [], totalAxes: 5 },
    spindle: { maxRpm: 0, powerKw: null, bore: null, taper: null },
    workEnvelope: {
      xTravel: 400, yTravel: 300, zTravel: 250,
      maxTurningDiameter: null, maxTurningLength: null, tableSizeMm: "810x640",
    },
    toolCapacity: 0,
    coolantModes: ["deionized_water"],
    probing: null,
    postProcessor: "MITSUBISHI_FA10S_W31MV-2_PRISM.cps",
    gCodeDialect: "mitsubishi_wedm",
    status: "active",
  },
  {
    id: "mitsubishi-ea12v",
    name: "Mitsubishi EA12V",
    oem: "Mitsubishi",
    model: "EA12V",
    type: "sinker_edm",
    controller: "FP80S",
    axes: { linear: ["X", "Y", "Z"], rotary: [], totalAxes: 3 },
    spindle: { maxRpm: 0, powerKw: null, bore: null, taper: null },
    workEnvelope: {
      xTravel: 350, yTravel: 250, zTravel: 250,
      maxTurningDiameter: null, maxTurningLength: null, tableSizeMm: null,
    },
    toolCapacity: 16,
    coolantModes: ["dielectric_oil"],
    probing: null,
    postProcessor: "MITSUBISHI_EA12S_FP80S_PRISM.cps",
    gCodeDialect: "mitsubishi_sinker",
    status: "active",
  },
  {
    id: "mitsubishi-ea8s",
    name: "Mitsubishi EA8S",
    oem: "Mitsubishi",
    model: "EA8S",
    type: "sinker_edm",
    controller: "C30EA",
    axes: { linear: ["X", "Y", "Z"], rotary: [], totalAxes: 3 },
    spindle: { maxRpm: 0, powerKw: null, bore: null, taper: null },
    workEnvelope: {
      xTravel: 300, yTravel: 200, zTravel: 200,
      maxTurningDiameter: null, maxTurningLength: null, tableSizeMm: null,
    },
    toolCapacity: 0,
    coolantModes: ["dielectric_oil"],
    probing: null,
    postProcessor: null,
    gCodeDialect: "mitsubishi_sinker",
    status: "active",
  },

  // ── SUPPORT MACHINES (6) ─────────────────────────────────────────────────
  {
    id: "band-saw",
    name: "Band Saw",
    oem: "Generic",
    model: "Band Saw",
    type: "saw",
    controller: "manual",
    axes: { linear: [], rotary: [], totalAxes: 0 },
    spindle: { maxRpm: 0, powerKw: null, bore: null, taper: null },
    workEnvelope: {
      xTravel: null, yTravel: null, zTravel: null,
      maxTurningDiameter: null, maxTurningLength: null, tableSizeMm: null,
    },
    toolCapacity: 1,
    coolantModes: ["flood"],
    probing: null,
    postProcessor: null,
    gCodeDialect: "none",
    status: "support",
  },
  {
    id: "surface-grinder",
    name: "Surface Grinder",
    oem: "Generic",
    model: "Surface Grinder",
    type: "grinder",
    controller: "manual",
    axes: { linear: ["X", "Y", "Z"], rotary: [], totalAxes: 3 },
    spindle: { maxRpm: 3600, powerKw: null, bore: null, taper: null },
    workEnvelope: {
      xTravel: null, yTravel: null, zTravel: null,
      maxTurningDiameter: null, maxTurningLength: null, tableSizeMm: null,
    },
    toolCapacity: 1,
    coolantModes: ["flood"],
    probing: null,
    postProcessor: null,
    gCodeDialect: "none",
    status: "support",
  },
  {
    id: "blanchard-grinder",
    name: "Blanchard Grinder",
    oem: "Blanchard",
    model: "Blanchard Grinder",
    type: "grinder",
    controller: "manual",
    axes: { linear: ["Z"], rotary: ["C"], totalAxes: 2 },
    spindle: { maxRpm: 1800, powerKw: null, bore: null, taper: null },
    workEnvelope: {
      xTravel: null, yTravel: null, zTravel: null,
      maxTurningDiameter: null, maxTurningLength: null, tableSizeMm: null,
    },
    toolCapacity: 1,
    coolantModes: ["flood"],
    probing: null,
    postProcessor: null,
    gCodeDialect: "none",
    status: "support",
  },
  {
    id: "od-grinder",
    name: "OD Grinder",
    oem: "Generic",
    model: "OD Grinder",
    type: "grinder",
    controller: "manual",
    axes: { linear: ["X", "Z"], rotary: [], totalAxes: 2 },
    spindle: { maxRpm: 3600, powerKw: null, bore: null, taper: null },
    workEnvelope: {
      xTravel: null, yTravel: null, zTravel: null,
      maxTurningDiameter: null, maxTurningLength: null, tableSizeMm: null,
    },
    toolCapacity: 1,
    coolantModes: ["flood"],
    probing: null,
    postProcessor: null,
    gCodeDialect: "none",
    status: "support",
  },
  {
    id: "hardinge-hlv-h",
    name: "Hardinge HLV-H",
    oem: "Hardinge",
    model: "HLV-H",
    type: "manual_lathe",
    controller: "manual",
    axes: { linear: ["X", "Z"], rotary: [], totalAxes: 2 },
    spindle: { maxRpm: 3000, powerKw: 1.5, bore: null, taper: null },
    workEnvelope: {
      xTravel: null, yTravel: null, zTravel: null,
      maxTurningDiameter: 280, maxTurningLength: 450, tableSizeMm: null,
    },
    toolCapacity: 1,
    coolantModes: ["flood"],
    probing: null,
    postProcessor: null,
    gCodeDialect: "none",
    status: "support",
  },
  {
    id: "manual-lathe",
    name: "Manual Lathe",
    oem: "Generic",
    model: "Manual Lathe",
    type: "manual_lathe",
    controller: "manual",
    axes: { linear: ["X", "Z"], rotary: [], totalAxes: 2 },
    spindle: { maxRpm: 2000, powerKw: null, bore: null, taper: null },
    workEnvelope: {
      xTravel: null, yTravel: null, zTravel: null,
      maxTurningDiameter: null, maxTurningLength: null, tableSizeMm: null,
    },
    toolCapacity: 1,
    coolantModes: ["flood"],
    probing: null,
    postProcessor: null,
    gCodeDialect: "none",
    status: "support",
  },
] as const;

// ============================================================================
// ENGINE
// ============================================================================

/**
 * JmDieMachineConfigEngine — Static engine providing detailed OEM machine
 * configurations for JM Die Company's 21-machine shop floor.
 *
 * All methods are static. Machine data is hardcoded from OEM datasheets
 * since these are fixed physical machines on the production floor.
 */
export class JmDieMachineConfigEngine {
  /** Total machine count in JM Die's shop */
  static readonly MACHINE_COUNT = 21;

  /**
   * Returns all 21 machine configurations.
   * @returns Complete array of MachineConfig for every JM Die machine
   */
  static getAllConfigs(): readonly MachineConfig[] {
    return JM_DIE_MACHINES;
  }

  /**
   * Filter machines by type classification.
   * @param type - Machine type to filter by (e.g. "lathe", "vmc", "5axis")
   * @returns Array of machines matching the given type
   */
  static getByType(type: MachineType): readonly MachineConfig[] {
    return JM_DIE_MACHINES.filter((m) => m.type === type);
  }

  /**
   * Filter machines by OEM manufacturer (case-insensitive).
   * @param oem - Manufacturer name, e.g. "Okuma", "Haas", "Mitsubishi"
   * @returns Array of machines from the given OEM
   */
  static getByOem(oem: string): readonly MachineConfig[] {
    const normalized = oem.toLowerCase();
    return JM_DIE_MACHINES.filter((m) => m.oem.toLowerCase() === normalized);
  }

  /**
   * Get a single machine configuration by its unique ID.
   * @param id - Machine ID, e.g. "okuma-genos-l300", "haas-vf-2"
   * @returns The MachineConfig if found, undefined otherwise
   */
  static getConfig(id: string): MachineConfig | undefined {
    return JM_DIE_MACHINES.find((m) => m.id === id);
  }

  /**
   * Get all CNC lathe configurations (excludes manual lathes and mill-turn).
   * @returns Array of MachineConfig with type "lathe"
   */
  static getLathes(): readonly MachineConfig[] {
    return JM_DIE_MACHINES.filter((m) => m.type === "lathe");
  }

  /**
   * Get all milling machine configurations (VMC + 5-axis + mill-turn).
   * @returns Array of MachineConfig with type "vmc", "5axis", or "mill_turn"
   */
  static getMills(): readonly MachineConfig[] {
    return JM_DIE_MACHINES.filter(
      (m) => m.type === "vmc" || m.type === "5axis" || m.type === "mill_turn",
    );
  }

  /**
   * Get all EDM machine configurations (wire + sinker).
   * @returns Array of MachineConfig with type "wire_edm" or "sinker_edm"
   */
  static getEdmMachines(): readonly MachineConfig[] {
    return JM_DIE_MACHINES.filter(
      (m) => m.type === "wire_edm" || m.type === "sinker_edm",
    );
  }

  /**
   * Get all support machines (grinders, saws, manual lathes).
   * @returns Array of MachineConfig with status "support"
   */
  static getSupportMachines(): readonly MachineConfig[] {
    return JM_DIE_MACHINES.filter((m) => m.status === "support");
  }

  /**
   * Get all active CNC machines (excludes support machines).
   * @returns Array of MachineConfig with status "active"
   */
  static getActiveMachines(): readonly MachineConfig[] {
    return JM_DIE_MACHINES.filter((m) => m.status === "active");
  }

  /**
   * Get all machines equipped with probing systems.
   * @returns Array of MachineConfig where probing is not null
   */
  static getProbingMachines(): readonly MachineConfig[] {
    return JM_DIE_MACHINES.filter((m) => m.probing !== null);
  }
}

export const jmDieMachineConfigEngine = JmDieMachineConfigEngine;
