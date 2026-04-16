/**
 * PRISM Manufacturing Intelligence - Machine Option Registry Engine
 * POST-ULT-MS4: Manages what each machine CAN have vs. what it DOES have
 *
 * Consolidates:
 *   U01 — MachineOptionSchema: TypeScript schema for ALL machine purchase options
 *   U02 — ManufacturerOptionCatalog: Per-manufacturer option availability
 *   U03 — OptionImpactMapper: Map each option to post properties & physics stages
 *   U04 — OptionValidationEngine: Validate option combinations are compatible
 *   U05 — OptionPresetGenerator: Generate presets per machine family
 *
 * Actions: get_options, set_options, validate_options, get_presets,
 *          get_option_impact, get_manufacturer_profile
 *
 * @version 1.0.0
 * @engine MachineOptionRegistryEngine
 */

// No external imports required — self-contained engine

// ============================================================================
// U01 — MACHINE OPTION SCHEMA: TypeScript types for ALL purchase options
// ============================================================================

/** Whether a given option is included at no cost, available for purchase, or not offered. */
export type OptionAvailability = "standard" | "purchasable" | "unavailable";

/** Complete machine option configuration. */
export interface MachineOptions {
  // ── Hardware options ──
  hasTSC: boolean;                         // Through-Spindle Coolant
  hasProbing: boolean;                     // Touch probe (Renishaw, Heidenhain, Blum)
  hasSSV: boolean;                         // Spindle Speed Variation
  hasDWO: boolean;                         // Dynamic Work Offset (Haas) / CYCLE800 (Siemens)
  hasLiveTooling: boolean;                 // Milling spindle on lathe
  hasYAxis: boolean;                       // Y-axis on lathe
  hasCAxis: boolean;                       // C-axis (lathe/mill-turn)
  hasSubSpindle: boolean;                  // Secondary spindle
  hasPartCatcher: boolean;                 // Automatic part catching (lathe)
  hasChipConveyor: boolean;                // Chip transport system
  hasToolArm: boolean;                     // Tool setting probe arm
  hasBarFeeder: boolean;                   // Automatic bar feeding (lathe)
  hasPalletChanger: boolean;               // Pallet system (HMC)
  hasSteadyRest: boolean;                  // Steady rest (lathe)
  hasTailstock: boolean;                   // Programmable tailstock (lathe)
  hasAutoDoor: boolean;                    // Automatic door
  hasProgrammableCoolantNozzle: boolean;   // Aim coolant at tool tip
  hasHighPressureCoolant: boolean;         // External high-pressure system

  // ── Spindle options ──
  spindleOption: "standard" | "high_speed" | "high_torque" | "dual_speed";
  maxRpm: number;
  spindlePower_kW: number;
  spindleTorque_Nm: number;

  // ── Coolant ──
  coolantPressure: "standard" | "high" | "ultra"; // standard=20bar, high=70bar, ultra=100+bar
  coolantType: "flood" | "tsc" | "mql" | "cryogenic";

  // ── Software / Controller options ──
  hasHSMPackage: boolean;                  // High-speed machining (G187/CYCLE832/G5.1)
  has5AxisPackage: boolean;                // Simultaneous 5-axis (TCP/RTCP license)
  hasAdaptiveControl: boolean;             // Controller-based adaptive feed
  hasThermalComp: boolean;                 // Controller thermal compensation
  hasCollisionAvoidance: boolean;          // CAS / anti-collision
  hasConversational: boolean;              // MAZATROL / ShopMill / Manual Guide i
  hasRigidTapping: boolean;               // Rigid tap capability
  hasNURBS: boolean;                       // NURBS interpolation
}

/** All boolean keys on MachineOptions. */
export type BooleanOptionKey = {
  [K in keyof MachineOptions]: MachineOptions[K] extends boolean ? K : never;
}[keyof MachineOptions];

/** All keys on MachineOptions. */
export type OptionKey = keyof MachineOptions;

// ============================================================================
// U02 — MANUFACTURER OPTION CATALOG: per-manufacturer availability
// ============================================================================

/** A single model family within a manufacturer (e.g. "VF Series"). */
export interface ModelFamilyOptions {
  family: string;
  models: string[];
  machine_type: "vmc" | "hmc" | "5axis" | "lathe" | "mill_turn" | "swiss" | "router";
  option_availability: Record<keyof MachineOptions, OptionAvailability>;
  standard_config: Partial<MachineOptions>;
}

/** Top-level manufacturer profile. */
export interface ManufacturerOptionProfile {
  manufacturer: string;
  model_families: ModelFamilyOptions[];
}

// ============================================================================
// U03 — OPTION IMPACT MAPPER: maps options → post properties & physics
// ============================================================================

/** Describes how a single option affects posts & physics. */
export interface OptionImpact {
  option: keyof MachineOptions;
  post_properties_enabled: string[];
  post_properties_disabled: string[];
  gcodes_enabled: string[];
  gcodes_disabled: string[];
  physics_stages_affected: string[];
  physics_impact_description: string;
}

// ============================================================================
// U04 — OPTION VALIDATION: compatibility rules
// ============================================================================

export interface OptionConflict {
  rule_id: string;
  description: string;
  severity: "error" | "warning";
}

export interface OptionValidationResult {
  valid: boolean;
  errors: OptionConflict[];
  warnings: OptionConflict[];
  resolved_options: Partial<MachineOptions>;
}

// ============================================================================
// U05 — OPTION PRESETS
// ============================================================================

export interface OptionPreset {
  name: string;        // "base", "production", "fully_loaded"
  description: string;
  options: Partial<MachineOptions>;
}

// ============================================================================
// HELPER: default "all-false / standard" baseline
// ============================================================================

function defaultMachineOptions(): MachineOptions {
  return {
    hasTSC: false,
    hasProbing: false,
    hasSSV: false,
    hasDWO: false,
    hasLiveTooling: false,
    hasYAxis: false,
    hasCAxis: false,
    hasSubSpindle: false,
    hasPartCatcher: false,
    hasChipConveyor: false,
    hasToolArm: false,
    hasBarFeeder: false,
    hasPalletChanger: false,
    hasSteadyRest: false,
    hasTailstock: false,
    hasAutoDoor: false,
    hasProgrammableCoolantNozzle: false,
    hasHighPressureCoolant: false,
    spindleOption: "standard",
    maxRpm: 8100,
    spindlePower_kW: 22.4,
    spindleTorque_Nm: 122,
    coolantPressure: "standard",
    coolantType: "flood",
    hasHSMPackage: false,
    has5AxisPackage: false,
    hasAdaptiveControl: false,
    hasThermalComp: false,
    hasCollisionAvoidance: false,
    hasConversational: false,
    hasRigidTapping: true,
    hasNURBS: false,
  };
}

/** Helper for creating an availability record from a base set of overrides. */
function makeAvailability(
  base: OptionAvailability,
  overrides: Partial<Record<keyof MachineOptions, OptionAvailability>>,
): Record<keyof MachineOptions, OptionAvailability> {
  const keys: (keyof MachineOptions)[] = [
    "hasTSC", "hasProbing", "hasSSV", "hasDWO", "hasLiveTooling",
    "hasYAxis", "hasCAxis", "hasSubSpindle", "hasPartCatcher",
    "hasChipConveyor", "hasToolArm", "hasBarFeeder", "hasPalletChanger",
    "hasSteadyRest", "hasTailstock", "hasAutoDoor", "hasProgrammableCoolantNozzle",
    "hasHighPressureCoolant", "spindleOption", "maxRpm", "spindlePower_kW",
    "spindleTorque_Nm", "coolantPressure", "coolantType", "hasHSMPackage",
    "has5AxisPackage", "hasAdaptiveControl", "hasThermalComp",
    "hasCollisionAvoidance", "hasConversational", "hasRigidTapping", "hasNURBS",
  ];
  const result = {} as Record<keyof MachineOptions, OptionAvailability>;
  for (const k of keys) {
    result[k] = overrides[k] ?? base;
  }
  return result;
}

// ============================================================================
// MANUFACTURER DATA — Haas
// ============================================================================

const HAAS_PROFILES: ModelFamilyOptions[] = [
  // ── VF Series (VMC) ──
  {
    family: "VF Series",
    models: ["VF-1", "VF-2", "VF-2SS", "VF-2SSYT", "VF-3", "VF-3SS", "VF-4", "VF-4SS", "VF-5", "VF-6", "VF-6SS", "VF-7", "VF-8", "VF-9", "VF-10", "VF-11", "VF-12"],
    machine_type: "vmc",
    option_availability: makeAvailability("purchasable", {
      hasTSC: "purchasable",
      hasProbing: "purchasable",
      hasSSV: "standard",
      hasDWO: "standard",
      hasLiveTooling: "unavailable",
      hasYAxis: "unavailable",
      hasCAxis: "unavailable",
      hasSubSpindle: "unavailable",
      hasPartCatcher: "unavailable",
      hasChipConveyor: "purchasable",
      hasToolArm: "purchasable",
      hasBarFeeder: "unavailable",
      hasPalletChanger: "unavailable",
      hasSteadyRest: "unavailable",
      hasTailstock: "unavailable",
      hasAutoDoor: "purchasable",
      hasProgrammableCoolantNozzle: "purchasable",
      hasHighPressureCoolant: "purchasable",
      spindleOption: "purchasable",
      maxRpm: "purchasable",
      spindlePower_kW: "purchasable",
      spindleTorque_Nm: "purchasable",
      coolantPressure: "purchasable",
      coolantType: "purchasable",
      hasHSMPackage: "purchasable",
      has5AxisPackage: "unavailable",
      hasAdaptiveControl: "unavailable",
      hasThermalComp: "purchasable",
      hasCollisionAvoidance: "unavailable",
      hasConversational: "standard",
      hasRigidTapping: "standard",
      hasNURBS: "unavailable",
    }),
    standard_config: {
      hasSSV: true,
      hasDWO: true,
      hasConversational: true,
      hasRigidTapping: true,
      spindleOption: "standard",
      maxRpm: 8100,
      spindlePower_kW: 22.4,
      spindleTorque_Nm: 122,
      coolantPressure: "standard",
      coolantType: "flood",
    },
  },
  // ── EC Series (HMC) ──
  {
    family: "EC Series",
    models: ["EC-400", "EC-500", "EC-630", "EC-1000", "EC-1600"],
    machine_type: "hmc",
    option_availability: makeAvailability("purchasable", {
      hasTSC: "purchasable",
      hasProbing: "purchasable",
      hasSSV: "standard",
      hasDWO: "standard",
      hasLiveTooling: "unavailable",
      hasYAxis: "unavailable",
      hasCAxis: "unavailable",
      hasSubSpindle: "unavailable",
      hasPartCatcher: "unavailable",
      hasChipConveyor: "standard",
      hasToolArm: "purchasable",
      hasBarFeeder: "unavailable",
      hasPalletChanger: "standard",
      hasSteadyRest: "unavailable",
      hasTailstock: "unavailable",
      hasAutoDoor: "purchasable",
      hasProgrammableCoolantNozzle: "purchasable",
      hasHighPressureCoolant: "purchasable",
      spindleOption: "purchasable",
      maxRpm: "purchasable",
      spindlePower_kW: "purchasable",
      spindleTorque_Nm: "purchasable",
      coolantPressure: "purchasable",
      coolantType: "purchasable",
      hasHSMPackage: "purchasable",
      has5AxisPackage: "unavailable",
      hasAdaptiveControl: "unavailable",
      hasThermalComp: "purchasable",
      hasCollisionAvoidance: "unavailable",
      hasConversational: "standard",
      hasRigidTapping: "standard",
      hasNURBS: "unavailable",
    }),
    standard_config: {
      hasSSV: true,
      hasDWO: true,
      hasChipConveyor: true,
      hasPalletChanger: true,
      hasConversational: true,
      hasRigidTapping: true,
      spindleOption: "standard",
      maxRpm: 10000,
      spindlePower_kW: 22.4,
      spindleTorque_Nm: 122,
      coolantPressure: "standard",
      coolantType: "flood",
    },
  },
  // ── UMC Series (5-axis) ──
  {
    family: "UMC Series",
    models: ["UMC-500", "UMC-500SS", "UMC-750", "UMC-750SS", "UMC-1000", "UMC-1000SS", "UMC-1500SS-DUO"],
    machine_type: "5axis",
    option_availability: makeAvailability("purchasable", {
      hasTSC: "purchasable",
      hasProbing: "purchasable",
      hasSSV: "standard",
      hasDWO: "standard",
      hasLiveTooling: "unavailable",
      hasYAxis: "unavailable",
      hasCAxis: "unavailable",
      hasSubSpindle: "unavailable",
      hasPartCatcher: "unavailable",
      hasChipConveyor: "purchasable",
      hasToolArm: "purchasable",
      hasBarFeeder: "unavailable",
      hasPalletChanger: "unavailable",
      hasSteadyRest: "unavailable",
      hasTailstock: "unavailable",
      hasAutoDoor: "purchasable",
      hasProgrammableCoolantNozzle: "purchasable",
      hasHighPressureCoolant: "purchasable",
      spindleOption: "purchasable",
      maxRpm: "purchasable",
      spindlePower_kW: "purchasable",
      spindleTorque_Nm: "purchasable",
      coolantPressure: "purchasable",
      coolantType: "purchasable",
      hasHSMPackage: "purchasable",
      has5AxisPackage: "standard",
      hasAdaptiveControl: "unavailable",
      hasThermalComp: "purchasable",
      hasCollisionAvoidance: "unavailable",
      hasConversational: "standard",
      hasRigidTapping: "standard",
      hasNURBS: "unavailable",
    }),
    standard_config: {
      hasSSV: true,
      hasDWO: true,
      has5AxisPackage: true,
      hasConversational: true,
      hasRigidTapping: true,
      spindleOption: "standard",
      maxRpm: 12000,
      spindlePower_kW: 22.4,
      spindleTorque_Nm: 122,
      coolantPressure: "standard",
      coolantType: "flood",
    },
  },
  // ── ST Series (Lathe) ──
  {
    family: "ST Series",
    models: ["ST-10", "ST-10Y", "ST-15", "ST-15Y", "ST-20", "ST-20Y", "ST-20SSY", "ST-25", "ST-25Y", "ST-30", "ST-30Y", "ST-30SSY", "ST-35", "ST-40"],
    machine_type: "lathe",
    option_availability: makeAvailability("purchasable", {
      hasTSC: "purchasable",
      hasProbing: "purchasable",
      hasSSV: "standard",
      hasDWO: "unavailable",
      hasLiveTooling: "purchasable",
      hasYAxis: "purchasable",
      hasCAxis: "purchasable",
      hasSubSpindle: "unavailable",
      hasPartCatcher: "purchasable",
      hasChipConveyor: "purchasable",
      hasToolArm: "purchasable",
      hasBarFeeder: "purchasable",
      hasPalletChanger: "unavailable",
      hasSteadyRest: "purchasable",
      hasTailstock: "purchasable",
      hasAutoDoor: "purchasable",
      hasProgrammableCoolantNozzle: "purchasable",
      hasHighPressureCoolant: "purchasable",
      spindleOption: "purchasable",
      maxRpm: "purchasable",
      spindlePower_kW: "purchasable",
      spindleTorque_Nm: "purchasable",
      coolantPressure: "purchasable",
      coolantType: "purchasable",
      hasHSMPackage: "unavailable",
      has5AxisPackage: "unavailable",
      hasAdaptiveControl: "unavailable",
      hasThermalComp: "purchasable",
      hasCollisionAvoidance: "unavailable",
      hasConversational: "standard",
      hasRigidTapping: "standard",
      hasNURBS: "unavailable",
    }),
    standard_config: {
      hasSSV: true,
      hasCAxis: true,
      hasConversational: true,
      hasRigidTapping: true,
      spindleOption: "standard",
      maxRpm: 4000,
      spindlePower_kW: 22.4,
      spindleTorque_Nm: 340,
      coolantPressure: "standard",
      coolantType: "flood",
    },
  },
  // ── DS Series (Dual-Spindle Lathe) ──
  {
    family: "DS Series",
    models: ["DS-20", "DS-20Y", "DS-30", "DS-30Y", "DS-30SSY"],
    machine_type: "lathe",
    option_availability: makeAvailability("purchasable", {
      hasTSC: "purchasable",
      hasProbing: "purchasable",
      hasSSV: "standard",
      hasDWO: "unavailable",
      hasLiveTooling: "purchasable",
      hasYAxis: "purchasable",
      hasCAxis: "standard",
      hasSubSpindle: "standard",
      hasPartCatcher: "standard",
      hasChipConveyor: "standard",
      hasToolArm: "purchasable",
      hasBarFeeder: "purchasable",
      hasPalletChanger: "unavailable",
      hasSteadyRest: "unavailable",
      hasTailstock: "unavailable",
      hasAutoDoor: "purchasable",
      hasProgrammableCoolantNozzle: "purchasable",
      hasHighPressureCoolant: "purchasable",
      spindleOption: "purchasable",
      maxRpm: "purchasable",
      spindlePower_kW: "purchasable",
      spindleTorque_Nm: "purchasable",
      coolantPressure: "purchasable",
      coolantType: "purchasable",
      hasHSMPackage: "unavailable",
      has5AxisPackage: "unavailable",
      hasAdaptiveControl: "unavailable",
      hasThermalComp: "purchasable",
      hasCollisionAvoidance: "unavailable",
      hasConversational: "standard",
      hasRigidTapping: "standard",
      hasNURBS: "unavailable",
    }),
    standard_config: {
      hasSSV: true,
      hasCAxis: true,
      hasSubSpindle: true,
      hasPartCatcher: true,
      hasChipConveyor: true,
      hasConversational: true,
      hasRigidTapping: true,
      spindleOption: "standard",
      maxRpm: 4000,
      spindlePower_kW: 22.4,
      spindleTorque_Nm: 340,
      coolantPressure: "standard",
      coolantType: "flood",
    },
  },
];

// ============================================================================
// MANUFACTURER DATA — Mazak
// ============================================================================

const MAZAK_PROFILES: ModelFamilyOptions[] = [
  // ── VCN / VTC (VMC) ──
  {
    family: "VCN/VTC Series",
    models: ["VCN-430A", "VCN-530C", "VCN-700", "VTC-300C", "VTC-530C", "VTC-760C", "VTC-800/30SR"],
    machine_type: "vmc",
    option_availability: makeAvailability("purchasable", {
      hasTSC: "purchasable",
      hasProbing: "purchasable",
      hasSSV: "standard",
      hasDWO: "standard",
      hasLiveTooling: "unavailable",
      hasYAxis: "unavailable",
      hasCAxis: "unavailable",
      hasSubSpindle: "unavailable",
      hasPartCatcher: "unavailable",
      hasChipConveyor: "purchasable",
      hasToolArm: "purchasable",
      hasBarFeeder: "unavailable",
      hasPalletChanger: "unavailable",
      hasSteadyRest: "unavailable",
      hasTailstock: "unavailable",
      hasAutoDoor: "purchasable",
      hasProgrammableCoolantNozzle: "purchasable",
      hasHighPressureCoolant: "purchasable",
      spindleOption: "purchasable",
      maxRpm: "purchasable",
      spindlePower_kW: "purchasable",
      spindleTorque_Nm: "purchasable",
      coolantPressure: "purchasable",
      coolantType: "purchasable",
      hasHSMPackage: "purchasable",
      has5AxisPackage: "unavailable",
      hasAdaptiveControl: "purchasable",
      hasThermalComp: "standard",
      hasCollisionAvoidance: "purchasable",
      hasConversational: "standard",
      hasRigidTapping: "standard",
      hasNURBS: "purchasable",
    }),
    standard_config: {
      hasSSV: true,
      hasDWO: true,
      hasThermalComp: true,
      hasConversational: true,
      hasRigidTapping: true,
      spindleOption: "standard",
      maxRpm: 12000,
      spindlePower_kW: 22,
      spindleTorque_Nm: 119,
      coolantPressure: "standard",
      coolantType: "flood",
    },
  },
  // ── HCN (HMC) ──
  {
    family: "HCN Series",
    models: ["HCN-4000", "HCN-5000", "HCN-6000", "HCN-6800", "HCN-8800", "HCN-10800", "HCN-12800"],
    machine_type: "hmc",
    option_availability: makeAvailability("purchasable", {
      hasTSC: "standard",
      hasProbing: "purchasable",
      hasSSV: "standard",
      hasDWO: "standard",
      hasLiveTooling: "unavailable",
      hasYAxis: "unavailable",
      hasCAxis: "unavailable",
      hasSubSpindle: "unavailable",
      hasPartCatcher: "unavailable",
      hasChipConveyor: "standard",
      hasToolArm: "purchasable",
      hasBarFeeder: "unavailable",
      hasPalletChanger: "standard",
      hasSteadyRest: "unavailable",
      hasTailstock: "unavailable",
      hasAutoDoor: "standard",
      hasProgrammableCoolantNozzle: "purchasable",
      hasHighPressureCoolant: "purchasable",
      spindleOption: "purchasable",
      maxRpm: "purchasable",
      spindlePower_kW: "purchasable",
      spindleTorque_Nm: "purchasable",
      coolantPressure: "purchasable",
      coolantType: "purchasable",
      hasHSMPackage: "purchasable",
      has5AxisPackage: "unavailable",
      hasAdaptiveControl: "purchasable",
      hasThermalComp: "standard",
      hasCollisionAvoidance: "purchasable",
      hasConversational: "standard",
      hasRigidTapping: "standard",
      hasNURBS: "purchasable",
    }),
    standard_config: {
      hasTSC: true,
      hasSSV: true,
      hasDWO: true,
      hasChipConveyor: true,
      hasPalletChanger: true,
      hasAutoDoor: true,
      hasThermalComp: true,
      hasConversational: true,
      hasRigidTapping: true,
      spindleOption: "standard",
      maxRpm: 10000,
      spindlePower_kW: 30,
      spindleTorque_Nm: 200,
      coolantPressure: "standard",
      coolantType: "flood",
    },
  },
  // ── CV5 / VARIAXIS (5-axis) ──
  {
    family: "CV5/VARIAXIS Series",
    models: ["CV5-500", "VARIAXIS C-600", "VARIAXIS i-300", "VARIAXIS i-500", "VARIAXIS i-600", "VARIAXIS i-700", "VARIAXIS i-800", "VARIAXIS i-1050"],
    machine_type: "5axis",
    option_availability: makeAvailability("purchasable", {
      hasTSC: "standard",
      hasProbing: "purchasable",
      hasSSV: "standard",
      hasDWO: "standard",
      hasLiveTooling: "unavailable",
      hasYAxis: "unavailable",
      hasCAxis: "unavailable",
      hasSubSpindle: "unavailable",
      hasPartCatcher: "unavailable",
      hasChipConveyor: "standard",
      hasToolArm: "purchasable",
      hasBarFeeder: "unavailable",
      hasPalletChanger: "purchasable",
      hasSteadyRest: "unavailable",
      hasTailstock: "unavailable",
      hasAutoDoor: "purchasable",
      hasProgrammableCoolantNozzle: "purchasable",
      hasHighPressureCoolant: "purchasable",
      spindleOption: "purchasable",
      maxRpm: "purchasable",
      spindlePower_kW: "purchasable",
      spindleTorque_Nm: "purchasable",
      coolantPressure: "purchasable",
      coolantType: "purchasable",
      hasHSMPackage: "standard",
      has5AxisPackage: "standard",
      hasAdaptiveControl: "purchasable",
      hasThermalComp: "standard",
      hasCollisionAvoidance: "purchasable",
      hasConversational: "standard",
      hasRigidTapping: "standard",
      hasNURBS: "standard",
    }),
    standard_config: {
      hasTSC: true,
      hasSSV: true,
      hasDWO: true,
      hasChipConveyor: true,
      hasHSMPackage: true,
      has5AxisPackage: true,
      hasThermalComp: true,
      hasConversational: true,
      hasRigidTapping: true,
      hasNURBS: true,
      spindleOption: "standard",
      maxRpm: 12000,
      spindlePower_kW: 30,
      spindleTorque_Nm: 120,
      coolantPressure: "standard",
      coolantType: "tsc",
    },
  },
  // ── QT / Quick Turn (Lathe) ──
  {
    family: "QT/Quick Turn Series",
    models: ["QT-200", "QT-200MY", "QT-250", "QT-250MSY", "QT-300", "QT-300MY", "QT-350", "QT-350MY", "QT-400", "QT-450", "QT-500"],
    machine_type: "lathe",
    option_availability: makeAvailability("purchasable", {
      hasTSC: "purchasable",
      hasProbing: "purchasable",
      hasSSV: "standard",
      hasDWO: "unavailable",
      hasLiveTooling: "purchasable",
      hasYAxis: "purchasable",
      hasCAxis: "standard",
      hasSubSpindle: "purchasable",
      hasPartCatcher: "purchasable",
      hasChipConveyor: "purchasable",
      hasToolArm: "purchasable",
      hasBarFeeder: "purchasable",
      hasPalletChanger: "unavailable",
      hasSteadyRest: "purchasable",
      hasTailstock: "purchasable",
      hasAutoDoor: "purchasable",
      hasProgrammableCoolantNozzle: "purchasable",
      hasHighPressureCoolant: "purchasable",
      spindleOption: "purchasable",
      maxRpm: "purchasable",
      spindlePower_kW: "purchasable",
      spindleTorque_Nm: "purchasable",
      coolantPressure: "purchasable",
      coolantType: "purchasable",
      hasHSMPackage: "unavailable",
      has5AxisPackage: "unavailable",
      hasAdaptiveControl: "purchasable",
      hasThermalComp: "standard",
      hasCollisionAvoidance: "purchasable",
      hasConversational: "standard",
      hasRigidTapping: "standard",
      hasNURBS: "unavailable",
    }),
    standard_config: {
      hasSSV: true,
      hasCAxis: true,
      hasThermalComp: true,
      hasConversational: true,
      hasRigidTapping: true,
      spindleOption: "standard",
      maxRpm: 5000,
      spindlePower_kW: 18.5,
      spindleTorque_Nm: 318,
      coolantPressure: "standard",
      coolantType: "flood",
    },
  },
  // ── Integrex (Mill-Turn) ──
  {
    family: "Integrex Series",
    models: ["INTEGREX i-100", "INTEGREX i-150", "INTEGREX i-200", "INTEGREX i-300", "INTEGREX i-400", "INTEGREX i-500", "INTEGREX i-630V", "INTEGREX e-H Series"],
    machine_type: "mill_turn",
    option_availability: makeAvailability("purchasable", {
      hasTSC: "standard",
      hasProbing: "purchasable",
      hasSSV: "standard",
      hasDWO: "standard",
      hasLiveTooling: "standard",
      hasYAxis: "standard",
      hasCAxis: "standard",
      hasSubSpindle: "purchasable",
      hasPartCatcher: "purchasable",
      hasChipConveyor: "standard",
      hasToolArm: "purchasable",
      hasBarFeeder: "purchasable",
      hasPalletChanger: "unavailable",
      hasSteadyRest: "purchasable",
      hasTailstock: "standard",
      hasAutoDoor: "purchasable",
      hasProgrammableCoolantNozzle: "purchasable",
      hasHighPressureCoolant: "purchasable",
      spindleOption: "purchasable",
      maxRpm: "purchasable",
      spindlePower_kW: "purchasable",
      spindleTorque_Nm: "purchasable",
      coolantPressure: "purchasable",
      coolantType: "purchasable",
      hasHSMPackage: "purchasable",
      has5AxisPackage: "standard",
      hasAdaptiveControl: "purchasable",
      hasThermalComp: "standard",
      hasCollisionAvoidance: "purchasable",
      hasConversational: "standard",
      hasRigidTapping: "standard",
      hasNURBS: "standard",
    }),
    standard_config: {
      hasTSC: true,
      hasSSV: true,
      hasDWO: true,
      hasLiveTooling: true,
      hasYAxis: true,
      hasCAxis: true,
      hasTailstock: true,
      hasChipConveyor: true,
      has5AxisPackage: true,
      hasThermalComp: true,
      hasConversational: true,
      hasRigidTapping: true,
      hasNURBS: true,
      spindleOption: "standard",
      maxRpm: 5000,
      spindlePower_kW: 30,
      spindleTorque_Nm: 500,
      coolantPressure: "standard",
      coolantType: "tsc",
    },
  },
  // ── EZ Series (Economy Lathe) ──
  {
    family: "EZ Series",
    models: ["EZ-6", "EZ-8", "EZ-10", "EZ-12"],
    machine_type: "lathe",
    option_availability: makeAvailability("purchasable", {
      hasTSC: "purchasable",
      hasProbing: "unavailable",
      hasSSV: "standard",
      hasDWO: "unavailable",
      hasLiveTooling: "unavailable",
      hasYAxis: "unavailable",
      hasCAxis: "purchasable",
      hasSubSpindle: "unavailable",
      hasPartCatcher: "purchasable",
      hasChipConveyor: "purchasable",
      hasToolArm: "unavailable",
      hasBarFeeder: "purchasable",
      hasPalletChanger: "unavailable",
      hasSteadyRest: "unavailable",
      hasTailstock: "purchasable",
      hasAutoDoor: "unavailable",
      hasProgrammableCoolantNozzle: "unavailable",
      hasHighPressureCoolant: "unavailable",
      spindleOption: "unavailable",
      maxRpm: "standard",
      spindlePower_kW: "standard",
      spindleTorque_Nm: "standard",
      coolantPressure: "standard",
      coolantType: "standard",
      hasHSMPackage: "unavailable",
      has5AxisPackage: "unavailable",
      hasAdaptiveControl: "unavailable",
      hasThermalComp: "unavailable",
      hasCollisionAvoidance: "unavailable",
      hasConversational: "standard",
      hasRigidTapping: "standard",
      hasNURBS: "unavailable",
    }),
    standard_config: {
      hasSSV: true,
      hasConversational: true,
      hasRigidTapping: true,
      spindleOption: "standard",
      maxRpm: 6000,
      spindlePower_kW: 15,
      spindleTorque_Nm: 200,
      coolantPressure: "standard",
      coolantType: "flood",
    },
  },
];

// ============================================================================
// MANUFACTURER DATA — DMG MORI
// ============================================================================

const DMG_MORI_PROFILES: ModelFamilyOptions[] = [
  // ── CMX V (VMC) ──
  {
    family: "CMX V Series",
    models: ["CMX 600 V", "CMX 800 V", "CMX 1100 V"],
    machine_type: "vmc",
    option_availability: makeAvailability("purchasable", {
      hasTSC: "purchasable",
      hasProbing: "purchasable",
      hasSSV: "standard",
      hasDWO: "standard",
      hasLiveTooling: "unavailable",
      hasYAxis: "unavailable",
      hasCAxis: "unavailable",
      hasSubSpindle: "unavailable",
      hasPartCatcher: "unavailable",
      hasChipConveyor: "purchasable",
      hasToolArm: "purchasable",
      hasBarFeeder: "unavailable",
      hasPalletChanger: "unavailable",
      hasSteadyRest: "unavailable",
      hasTailstock: "unavailable",
      hasAutoDoor: "purchasable",
      hasProgrammableCoolantNozzle: "purchasable",
      hasHighPressureCoolant: "purchasable",
      spindleOption: "purchasable",
      maxRpm: "purchasable",
      spindlePower_kW: "purchasable",
      spindleTorque_Nm: "purchasable",
      coolantPressure: "purchasable",
      coolantType: "purchasable",
      hasHSMPackage: "purchasable",
      has5AxisPackage: "unavailable",
      hasAdaptiveControl: "purchasable",
      hasThermalComp: "standard",
      hasCollisionAvoidance: "purchasable",
      hasConversational: "purchasable",
      hasRigidTapping: "standard",
      hasNURBS: "purchasable",
    }),
    standard_config: {
      hasSSV: true,
      hasDWO: true,
      hasThermalComp: true,
      hasRigidTapping: true,
      spindleOption: "standard",
      maxRpm: 12000,
      spindlePower_kW: 25,
      spindleTorque_Nm: 120,
      coolantPressure: "standard",
      coolantType: "flood",
    },
  },
  // ── NHX (HMC) ──
  {
    family: "NHX Series",
    models: ["NHX 4000", "NHX 5000", "NHX 5500", "NHX 6300", "NHX 8000", "NHX 10000"],
    machine_type: "hmc",
    option_availability: makeAvailability("purchasable", {
      hasTSC: "standard",
      hasProbing: "purchasable",
      hasSSV: "standard",
      hasDWO: "standard",
      hasLiveTooling: "unavailable",
      hasYAxis: "unavailable",
      hasCAxis: "unavailable",
      hasSubSpindle: "unavailable",
      hasPartCatcher: "unavailable",
      hasChipConveyor: "standard",
      hasToolArm: "purchasable",
      hasBarFeeder: "unavailable",
      hasPalletChanger: "standard",
      hasSteadyRest: "unavailable",
      hasTailstock: "unavailable",
      hasAutoDoor: "standard",
      hasProgrammableCoolantNozzle: "purchasable",
      hasHighPressureCoolant: "purchasable",
      spindleOption: "purchasable",
      maxRpm: "purchasable",
      spindlePower_kW: "purchasable",
      spindleTorque_Nm: "purchasable",
      coolantPressure: "purchasable",
      coolantType: "purchasable",
      hasHSMPackage: "purchasable",
      has5AxisPackage: "unavailable",
      hasAdaptiveControl: "purchasable",
      hasThermalComp: "standard",
      hasCollisionAvoidance: "purchasable",
      hasConversational: "purchasable",
      hasRigidTapping: "standard",
      hasNURBS: "purchasable",
    }),
    standard_config: {
      hasTSC: true,
      hasSSV: true,
      hasDWO: true,
      hasChipConveyor: true,
      hasPalletChanger: true,
      hasAutoDoor: true,
      hasThermalComp: true,
      hasRigidTapping: true,
      spindleOption: "standard",
      maxRpm: 12000,
      spindlePower_kW: 30,
      spindleTorque_Nm: 200,
      coolantPressure: "standard",
      coolantType: "tsc",
    },
  },
  // ── DMU (5-axis) ──
  {
    family: "DMU Series",
    models: ["DMU 40", "DMU 50 3rd Gen", "DMU 65 monoBLOCK", "DMU 75 monoBLOCK", "DMU 80 P duoBLOCK", "DMU 85 monoBLOCK", "DMU 100 monoBLOCK", "DMU 100 P duoBLOCK", "DMU 125 P duoBLOCK", "DMU 160 P duoBLOCK", "DMU 200 P duoBLOCK", "DMU 210 P", "DMU 340 Gantry", "DMU 600 Gantry"],
    machine_type: "5axis",
    option_availability: makeAvailability("purchasable", {
      hasTSC: "standard",
      hasProbing: "standard",
      hasSSV: "standard",
      hasDWO: "standard",
      hasLiveTooling: "unavailable",
      hasYAxis: "unavailable",
      hasCAxis: "unavailable",
      hasSubSpindle: "unavailable",
      hasPartCatcher: "unavailable",
      hasChipConveyor: "standard",
      hasToolArm: "purchasable",
      hasBarFeeder: "unavailable",
      hasPalletChanger: "purchasable",
      hasSteadyRest: "unavailable",
      hasTailstock: "unavailable",
      hasAutoDoor: "purchasable",
      hasProgrammableCoolantNozzle: "purchasable",
      hasHighPressureCoolant: "purchasable",
      spindleOption: "purchasable",
      maxRpm: "purchasable",
      spindlePower_kW: "purchasable",
      spindleTorque_Nm: "purchasable",
      coolantPressure: "purchasable",
      coolantType: "purchasable",
      hasHSMPackage: "standard",
      has5AxisPackage: "standard",
      hasAdaptiveControl: "purchasable",
      hasThermalComp: "standard",
      hasCollisionAvoidance: "purchasable",
      hasConversational: "purchasable",
      hasRigidTapping: "standard",
      hasNURBS: "standard",
    }),
    standard_config: {
      hasTSC: true,
      hasProbing: true,
      hasSSV: true,
      hasDWO: true,
      hasChipConveyor: true,
      hasHSMPackage: true,
      has5AxisPackage: true,
      hasThermalComp: true,
      hasRigidTapping: true,
      hasNURBS: true,
      spindleOption: "standard",
      maxRpm: 18000,
      spindlePower_kW: 35,
      spindleTorque_Nm: 130,
      coolantPressure: "high",
      coolantType: "tsc",
    },
  },
  // ── NLX (Lathe / Mill-Turn) ──
  {
    family: "NLX Series",
    models: ["NLX 1500", "NLX 2000", "NLX 2500", "NLX 2500Y", "NLX 3000", "NLX 4000"],
    machine_type: "lathe",
    option_availability: makeAvailability("purchasable", {
      hasTSC: "purchasable",
      hasProbing: "purchasable",
      hasSSV: "standard",
      hasDWO: "standard",
      hasLiveTooling: "purchasable",
      hasYAxis: "purchasable",
      hasCAxis: "standard",
      hasSubSpindle: "purchasable",
      hasPartCatcher: "purchasable",
      hasChipConveyor: "standard",
      hasToolArm: "purchasable",
      hasBarFeeder: "purchasable",
      hasPalletChanger: "unavailable",
      hasSteadyRest: "purchasable",
      hasTailstock: "purchasable",
      hasAutoDoor: "purchasable",
      hasProgrammableCoolantNozzle: "purchasable",
      hasHighPressureCoolant: "purchasable",
      spindleOption: "purchasable",
      maxRpm: "purchasable",
      spindlePower_kW: "purchasable",
      spindleTorque_Nm: "purchasable",
      coolantPressure: "purchasable",
      coolantType: "purchasable",
      hasHSMPackage: "unavailable",
      has5AxisPackage: "unavailable",
      hasAdaptiveControl: "purchasable",
      hasThermalComp: "standard",
      hasCollisionAvoidance: "purchasable",
      hasConversational: "purchasable",
      hasRigidTapping: "standard",
      hasNURBS: "unavailable",
    }),
    standard_config: {
      hasSSV: true,
      hasDWO: true,
      hasCAxis: true,
      hasChipConveyor: true,
      hasThermalComp: true,
      hasRigidTapping: true,
      spindleOption: "standard",
      maxRpm: 4000,
      spindlePower_kW: 22,
      spindleTorque_Nm: 400,
      coolantPressure: "standard",
      coolantType: "flood",
    },
  },
];

// ============================================================================
// MANUFACTURER DATA — Okuma
// ============================================================================

const OKUMA_PROFILES: ModelFamilyOptions[] = [
  // ── GENOS M (VMC) ──
  {
    family: "GENOS M Series",
    models: ["GENOS M460-VE", "GENOS M560-V", "GENOS M660-VE", "GENOS M460V-5AX"],
    machine_type: "vmc",
    option_availability: makeAvailability("purchasable", {
      hasTSC: "purchasable",
      hasProbing: "purchasable",
      hasSSV: "standard",
      hasDWO: "standard",
      hasLiveTooling: "unavailable",
      hasYAxis: "unavailable",
      hasCAxis: "unavailable",
      hasSubSpindle: "unavailable",
      hasPartCatcher: "unavailable",
      hasChipConveyor: "purchasable",
      hasToolArm: "purchasable",
      hasBarFeeder: "unavailable",
      hasPalletChanger: "unavailable",
      hasSteadyRest: "unavailable",
      hasTailstock: "unavailable",
      hasAutoDoor: "purchasable",
      hasProgrammableCoolantNozzle: "purchasable",
      hasHighPressureCoolant: "purchasable",
      spindleOption: "purchasable",
      maxRpm: "purchasable",
      spindlePower_kW: "purchasable",
      spindleTorque_Nm: "purchasable",
      coolantPressure: "purchasable",
      coolantType: "purchasable",
      hasHSMPackage: "purchasable",
      has5AxisPackage: "unavailable",
      hasAdaptiveControl: "standard",
      hasThermalComp: "standard",
      hasCollisionAvoidance: "purchasable",
      hasConversational: "standard",
      hasRigidTapping: "standard",
      hasNURBS: "purchasable",
    }),
    standard_config: {
      hasSSV: true,
      hasDWO: true,
      hasAdaptiveControl: true,
      hasThermalComp: true,
      hasConversational: true,
      hasRigidTapping: true,
      spindleOption: "standard",
      maxRpm: 15000,
      spindlePower_kW: 22,
      spindleTorque_Nm: 88,
      coolantPressure: "standard",
      coolantType: "flood",
    },
  },
  // ── MB (HMC) ──
  {
    family: "MB Series",
    models: ["MB-4000H", "MB-5000H", "MB-5000HII", "MB-8000H", "MB-10000H"],
    machine_type: "hmc",
    option_availability: makeAvailability("purchasable", {
      hasTSC: "standard",
      hasProbing: "purchasable",
      hasSSV: "standard",
      hasDWO: "standard",
      hasLiveTooling: "unavailable",
      hasYAxis: "unavailable",
      hasCAxis: "unavailable",
      hasSubSpindle: "unavailable",
      hasPartCatcher: "unavailable",
      hasChipConveyor: "standard",
      hasToolArm: "purchasable",
      hasBarFeeder: "unavailable",
      hasPalletChanger: "standard",
      hasSteadyRest: "unavailable",
      hasTailstock: "unavailable",
      hasAutoDoor: "standard",
      hasProgrammableCoolantNozzle: "purchasable",
      hasHighPressureCoolant: "purchasable",
      spindleOption: "purchasable",
      maxRpm: "purchasable",
      spindlePower_kW: "purchasable",
      spindleTorque_Nm: "purchasable",
      coolantPressure: "purchasable",
      coolantType: "purchasable",
      hasHSMPackage: "purchasable",
      has5AxisPackage: "unavailable",
      hasAdaptiveControl: "standard",
      hasThermalComp: "standard",
      hasCollisionAvoidance: "purchasable",
      hasConversational: "standard",
      hasRigidTapping: "standard",
      hasNURBS: "purchasable",
    }),
    standard_config: {
      hasTSC: true,
      hasSSV: true,
      hasDWO: true,
      hasChipConveyor: true,
      hasPalletChanger: true,
      hasAutoDoor: true,
      hasAdaptiveControl: true,
      hasThermalComp: true,
      hasConversational: true,
      hasRigidTapping: true,
      spindleOption: "standard",
      maxRpm: 8000,
      spindlePower_kW: 30,
      spindleTorque_Nm: 300,
      coolantPressure: "standard",
      coolantType: "tsc",
    },
  },
  // ── MU (5-axis) ──
  {
    family: "MU Series",
    models: ["MU-4000V", "MU-5000V", "MU-6300V", "MU-8000V", "MU-10000H", "MU-S600V"],
    machine_type: "5axis",
    option_availability: makeAvailability("purchasable", {
      hasTSC: "standard",
      hasProbing: "standard",
      hasSSV: "standard",
      hasDWO: "standard",
      hasLiveTooling: "unavailable",
      hasYAxis: "unavailable",
      hasCAxis: "unavailable",
      hasSubSpindle: "unavailable",
      hasPartCatcher: "unavailable",
      hasChipConveyor: "standard",
      hasToolArm: "purchasable",
      hasBarFeeder: "unavailable",
      hasPalletChanger: "purchasable",
      hasSteadyRest: "unavailable",
      hasTailstock: "unavailable",
      hasAutoDoor: "purchasable",
      hasProgrammableCoolantNozzle: "purchasable",
      hasHighPressureCoolant: "purchasable",
      spindleOption: "purchasable",
      maxRpm: "purchasable",
      spindlePower_kW: "purchasable",
      spindleTorque_Nm: "purchasable",
      coolantPressure: "purchasable",
      coolantType: "purchasable",
      hasHSMPackage: "standard",
      has5AxisPackage: "standard",
      hasAdaptiveControl: "standard",
      hasThermalComp: "standard",
      hasCollisionAvoidance: "purchasable",
      hasConversational: "standard",
      hasRigidTapping: "standard",
      hasNURBS: "standard",
    }),
    standard_config: {
      hasTSC: true,
      hasProbing: true,
      hasSSV: true,
      hasDWO: true,
      hasChipConveyor: true,
      hasHSMPackage: true,
      has5AxisPackage: true,
      hasAdaptiveControl: true,
      hasThermalComp: true,
      hasConversational: true,
      hasRigidTapping: true,
      hasNURBS: true,
      spindleOption: "standard",
      maxRpm: 15000,
      spindlePower_kW: 30,
      spindleTorque_Nm: 120,
      coolantPressure: "high",
      coolantType: "tsc",
    },
  },
  // ── LB (Lathe) ──
  {
    family: "LB Series",
    models: ["LB2000 EXII", "LB3000 EXII", "LB4000 EXII", "LB15II"],
    machine_type: "lathe",
    option_availability: makeAvailability("purchasable", {
      hasTSC: "purchasable",
      hasProbing: "purchasable",
      hasSSV: "standard",
      hasDWO: "standard",
      hasLiveTooling: "purchasable",
      hasYAxis: "purchasable",
      hasCAxis: "standard",
      hasSubSpindle: "purchasable",
      hasPartCatcher: "purchasable",
      hasChipConveyor: "purchasable",
      hasToolArm: "purchasable",
      hasBarFeeder: "purchasable",
      hasPalletChanger: "unavailable",
      hasSteadyRest: "purchasable",
      hasTailstock: "purchasable",
      hasAutoDoor: "purchasable",
      hasProgrammableCoolantNozzle: "purchasable",
      hasHighPressureCoolant: "purchasable",
      spindleOption: "purchasable",
      maxRpm: "purchasable",
      spindlePower_kW: "purchasable",
      spindleTorque_Nm: "purchasable",
      coolantPressure: "purchasable",
      coolantType: "purchasable",
      hasHSMPackage: "unavailable",
      has5AxisPackage: "unavailable",
      hasAdaptiveControl: "standard",
      hasThermalComp: "standard",
      hasCollisionAvoidance: "purchasable",
      hasConversational: "standard",
      hasRigidTapping: "standard",
      hasNURBS: "unavailable",
    }),
    standard_config: {
      hasSSV: true,
      hasDWO: true,
      hasCAxis: true,
      hasAdaptiveControl: true,
      hasThermalComp: true,
      hasConversational: true,
      hasRigidTapping: true,
      spindleOption: "standard",
      maxRpm: 5000,
      spindlePower_kW: 22,
      spindleTorque_Nm: 380,
      coolantPressure: "standard",
      coolantType: "flood",
    },
  },
  // ── GENOS L (Lathe) ──
  {
    family: "GENOS L Series",
    models: ["GENOS L2000-e", "GENOS L3000-e", "GENOS L3000-eMY"],
    machine_type: "lathe",
    option_availability: makeAvailability("purchasable", {
      hasTSC: "purchasable",
      hasProbing: "unavailable",
      hasSSV: "standard",
      hasDWO: "unavailable",
      hasLiveTooling: "purchasable",
      hasYAxis: "purchasable",
      hasCAxis: "standard",
      hasSubSpindle: "unavailable",
      hasPartCatcher: "purchasable",
      hasChipConveyor: "purchasable",
      hasToolArm: "purchasable",
      hasBarFeeder: "purchasable",
      hasPalletChanger: "unavailable",
      hasSteadyRest: "purchasable",
      hasTailstock: "purchasable",
      hasAutoDoor: "purchasable",
      hasProgrammableCoolantNozzle: "unavailable",
      hasHighPressureCoolant: "purchasable",
      spindleOption: "purchasable",
      maxRpm: "purchasable",
      spindlePower_kW: "purchasable",
      spindleTorque_Nm: "purchasable",
      coolantPressure: "purchasable",
      coolantType: "purchasable",
      hasHSMPackage: "unavailable",
      has5AxisPackage: "unavailable",
      hasAdaptiveControl: "standard",
      hasThermalComp: "standard",
      hasCollisionAvoidance: "unavailable",
      hasConversational: "standard",
      hasRigidTapping: "standard",
      hasNURBS: "unavailable",
    }),
    standard_config: {
      hasSSV: true,
      hasCAxis: true,
      hasAdaptiveControl: true,
      hasThermalComp: true,
      hasConversational: true,
      hasRigidTapping: true,
      spindleOption: "standard",
      maxRpm: 4200,
      spindlePower_kW: 15,
      spindleTorque_Nm: 280,
      coolantPressure: "standard",
      coolantType: "flood",
    },
  },
  // ── Multus (Mill-Turn) ──
  {
    family: "Multus Series",
    models: ["Multus B200II", "Multus B250II", "Multus B300II", "Multus B400II", "Multus B750", "Multus U3000", "Multus U5000"],
    machine_type: "mill_turn",
    option_availability: makeAvailability("purchasable", {
      hasTSC: "standard",
      hasProbing: "standard",
      hasSSV: "standard",
      hasDWO: "standard",
      hasLiveTooling: "standard",
      hasYAxis: "standard",
      hasCAxis: "standard",
      hasSubSpindle: "purchasable",
      hasPartCatcher: "purchasable",
      hasChipConveyor: "standard",
      hasToolArm: "purchasable",
      hasBarFeeder: "purchasable",
      hasPalletChanger: "unavailable",
      hasSteadyRest: "purchasable",
      hasTailstock: "standard",
      hasAutoDoor: "purchasable",
      hasProgrammableCoolantNozzle: "purchasable",
      hasHighPressureCoolant: "purchasable",
      spindleOption: "purchasable",
      maxRpm: "purchasable",
      spindlePower_kW: "purchasable",
      spindleTorque_Nm: "purchasable",
      coolantPressure: "purchasable",
      coolantType: "purchasable",
      hasHSMPackage: "purchasable",
      has5AxisPackage: "standard",
      hasAdaptiveControl: "standard",
      hasThermalComp: "standard",
      hasCollisionAvoidance: "purchasable",
      hasConversational: "standard",
      hasRigidTapping: "standard",
      hasNURBS: "standard",
    }),
    standard_config: {
      hasTSC: true,
      hasProbing: true,
      hasSSV: true,
      hasDWO: true,
      hasLiveTooling: true,
      hasYAxis: true,
      hasCAxis: true,
      hasTailstock: true,
      hasChipConveyor: true,
      has5AxisPackage: true,
      hasAdaptiveControl: true,
      hasThermalComp: true,
      hasConversational: true,
      hasRigidTapping: true,
      hasNURBS: true,
      spindleOption: "standard",
      maxRpm: 5000,
      spindlePower_kW: 30,
      spindleTorque_Nm: 500,
      coolantPressure: "high",
      coolantType: "tsc",
    },
  },
];

// ============================================================================
// CONTROLLER MAPPING — Siemens / Heidenhain
// ============================================================================

/**
 * Which machine brands use which controller.
 * Used to determine software option compatibility.
 */
export const CONTROLLER_BRAND_MAP: Record<string, string[]> = {
  "Siemens 840D sl": [
    "DMG MORI", "Spinner", "Emco", "Chiron", "Grob", "Starrag",
    "SW (Schwäbische Werkzeugmaschinen)", "Heller", "WFL",
  ],
  "Siemens SINUMERIK ONE": [
    "DMG MORI", "Chiron", "Grob", "Heller",
  ],
  "Heidenhain TNC 640": [
    "Hermle", "DMG MORI", "Kern", "Röders", "Mikron",
  ],
  "Heidenhain TNC7": [
    "Hermle", "DMG MORI", "Kern", "GF Machining Solutions",
  ],
  "Fanuc 0i-TF Plus": [
    "Haas", "Doosan", "Hyundai WIA", "Brother", "Takisawa",
  ],
  "Fanuc 31i-B5": [
    "Matsuura", "Makino", "Kitamura", "Tsugami",
  ],
  "Mazatrol SmoothAi": ["Mazak"],
  "Mazatrol SmoothG": ["Mazak"],
  "Mazatrol SmoothX": ["Mazak"],
  "Okuma OSP-P300A": ["Okuma"],
  "Okuma OSP-P300MA": ["Okuma"],
  "Okuma OSP-P500A": ["Okuma"],
  "Mitsubishi M80": [
    "Miyano", "Nakamura-Tome", "Takisawa",
  ],
};

// ============================================================================
// U03 — OPTION IMPACT MAP: each option → post properties + physics stages
// ============================================================================

const OPTION_IMPACT_MAP: OptionImpact[] = [
  {
    option: "hasTSC",
    post_properties_enabled: ["throughSpindleCoolant", "coolantPressure", "useG100"],
    post_properties_disabled: [],
    gcodes_enabled: ["M88 (TSC ON)", "M89 (TSC OFF)", "G100 (TSC pressure)"],
    gcodes_disabled: [],
    physics_stages_affected: ["thermal_model", "chip_evacuation", "tool_life_prediction"],
    physics_impact_description: "Enables through-spindle coolant delivery for deep-hole drilling and high-performance machining. Reduces thermal load on tool tip by 40-60%. Critical for L/D > 4 drilling.",
  },
  {
    option: "hasProbing",
    post_properties_enabled: ["useProbing", "probingType", "probeCalibrationCycle", "useG65Macro"],
    post_properties_disabled: [],
    gcodes_enabled: ["G65 P9xxx (probe macro)", "G31 (skip function)", "M19 (spindle orient)"],
    gcodes_disabled: [],
    physics_stages_affected: ["setup_verification", "in_process_measurement", "compensation"],
    physics_impact_description: "Enables in-process measurement and automatic work offset updates. Reduces setup time by 50-70% and enables closed-loop machining with automatic tool length compensation.",
  },
  {
    option: "hasSSV",
    post_properties_enabled: ["useSSV", "ssvRange", "ssvCycleTime"],
    post_properties_disabled: [],
    gcodes_enabled: ["G96.1 (SSV on Fanuc)", "CYCLE832 SSV block (Siemens)"],
    gcodes_disabled: [],
    physics_stages_affected: ["chatter_prediction", "stability_lobe", "surface_finish"],
    physics_impact_description: "Spindle Speed Variation disrupts regenerative chatter by continuously modulating RPM. Improves stability lobe boundaries by 15-30%, particularly effective in turning and boring operations.",
  },
  {
    option: "hasDWO",
    post_properties_enabled: ["useDWO", "useCYCLE800", "useG234", "useG68.2"],
    post_properties_disabled: [],
    gcodes_enabled: ["G254 (Haas DWO)", "CYCLE800 (Siemens TRAORI)", "G234 (Fanuc)", "G68.2 (Fanuc 5-axis tilted WP)"],
    gcodes_disabled: [],
    physics_stages_affected: ["coordinate_transform", "tool_center_point"],
    physics_impact_description: "Dynamic Work Offsets enable automatic coordinate transformation for angled features and multi-face machining. Required for 3+2 positioning and 5-axis simultaneous work.",
  },
  {
    option: "hasLiveTooling",
    post_properties_enabled: ["useLiveTooling", "liveToolSpindleSpeed", "liveToolPower"],
    post_properties_disabled: [],
    gcodes_enabled: ["M23/M24 (live tool CW/CCW)", "M123/M124 (Mazak)", "G112 (polar interp)"],
    gcodes_disabled: [],
    physics_stages_affected: ["live_tool_power", "milling_on_lathe", "cross_drilling"],
    physics_impact_description: "Enables milling, drilling, and tapping operations on turning centers. Limited by live tool spindle power (typically 3-7.5kW) and RPM (typically 4000-6000).",
  },
  {
    option: "hasYAxis",
    post_properties_enabled: ["useYAxis", "yAxisTravel", "yAxisRapid"],
    post_properties_disabled: [],
    gcodes_enabled: ["G17.1 (Y-axis milling plane)", "G19 (YZ plane)"],
    gcodes_disabled: [],
    physics_stages_affected: ["off_center_milling", "keyway_machining", "complex_geometry"],
    physics_impact_description: "Y-axis on lathes enables true linear milling instead of polar interpolation. Improves surface finish on flats/keyways by 2-3 Ra classes and enables off-center features.",
  },
  {
    option: "hasCAxis",
    post_properties_enabled: ["useCAxis", "cAxisClamp", "cAxisInterpolation"],
    post_properties_disabled: [],
    gcodes_enabled: ["M15/M16 (C-axis clamp/unclamp)", "G12.1/G112 (polar interpolation)", "C0 (C-axis positioning)"],
    gcodes_disabled: [],
    physics_stages_affected: ["polar_interpolation", "angular_positioning", "contour_milling"],
    physics_impact_description: "C-axis provides angular positioning and interpolation for contour milling on lathes. Enables hex, flat, and complex profile milling using polar coordinate interpolation.",
  },
  {
    option: "hasSubSpindle",
    post_properties_enabled: ["useSubSpindle", "subSpindleSync", "partTransfer"],
    post_properties_disabled: [],
    gcodes_enabled: ["M132 (sub-spindle advance)", "M133 (sub-spindle retract)", "G14 (sub-spindle select)"],
    gcodes_disabled: [],
    physics_stages_affected: ["part_transfer", "back_machining", "cycle_time_optimization"],
    physics_impact_description: "Sub-spindle enables complete part machining (front + back) in single setup. Eliminates second-op fixturing and reduces total cycle time by 30-50% for complex turned parts.",
  },
  {
    option: "hasPartCatcher",
    post_properties_enabled: ["usePartCatcher", "partCatcherAdvance", "partCatcherRetract"],
    post_properties_disabled: [],
    gcodes_enabled: ["M25/M26 (part catcher advance/retract)", "M125/M126 (Mazak)"],
    gcodes_disabled: [],
    physics_stages_affected: ["part_handling", "lights_out_operation"],
    physics_impact_description: "Automatic part catching prevents damage to finished parts after cutoff. Required for lights-out lathe operation. Typical catch weight limit 2-5kg.",
  },
  {
    option: "hasChipConveyor",
    post_properties_enabled: ["chipConveyorType"],
    post_properties_disabled: [],
    gcodes_enabled: ["M31/M32 (conveyor on/off)"],
    gcodes_disabled: [],
    physics_stages_affected: ["chip_evacuation", "thermal_management"],
    physics_impact_description: "Chip conveyor prevents chip re-cutting and thermal buildup in enclosure. Essential for high-MRR operations and lights-out running. Reduces coolant temp rise by 5-10C.",
  },
  {
    option: "hasToolArm",
    post_properties_enabled: ["useToolSetter", "toolSetterType", "autoToolMeasure"],
    post_properties_disabled: [],
    gcodes_enabled: ["G65 P9023 (Haas tool setter)", "CYCLE982 (Siemens tool measure)"],
    gcodes_disabled: [],
    physics_stages_affected: ["tool_length_compensation", "tool_wear_monitoring"],
    physics_impact_description: "Tool setting arm enables automatic tool length/diameter measurement. Detects tool breakage and wear compensation. Accuracy typically +/-2um.",
  },
  {
    option: "hasBarFeeder",
    post_properties_enabled: ["useBarFeeder", "barFeedCycle", "barEndDetection"],
    post_properties_disabled: [],
    gcodes_enabled: ["M26 (bar feed advance)", "M36 (bar end detect)"],
    gcodes_disabled: [],
    physics_stages_affected: ["material_handling", "automation", "lights_out_operation"],
    physics_impact_description: "Bar feeder enables continuous automatic bar stock feeding for production lathe work. Allows lights-out operation. Typical bar length 1-4m, diameter 5-80mm depending on machine.",
  },
  {
    option: "hasPalletChanger",
    post_properties_enabled: ["usePalletChanger", "palletCount", "palletChangeCode"],
    post_properties_disabled: [],
    gcodes_enabled: ["M60 (pallet change)", "M98 P9020 (pallet change macro)"],
    gcodes_disabled: [],
    physics_stages_affected: ["setup_time_reduction", "automation", "utilization_optimization"],
    physics_impact_description: "Pallet changer enables loading next workpiece during machining. Reduces non-cut time to pallet swap time (8-20sec). Standard on HMCs, option on VMCs.",
  },
  {
    option: "hasSteadyRest",
    post_properties_enabled: ["useSteadyRest", "steadyRestPosition", "steadyRestPressure"],
    post_properties_disabled: [],
    gcodes_enabled: ["M14/M15 (steady rest clamp/release)"],
    gcodes_disabled: [],
    physics_stages_affected: ["deflection_control", "vibration_damping", "long_part_support"],
    physics_impact_description: "Steady rest supports long workpieces to prevent deflection and chatter. Required when L/D > 4 for turning. Reduces deflection by 80-95% at support point.",
  },
  {
    option: "hasTailstock",
    post_properties_enabled: ["useTailstock", "tailstockPressure", "programmableTailstock"],
    post_properties_disabled: [],
    gcodes_enabled: ["M21/M22 (tailstock advance/retract)", "G10 L20 (tailstock position)"],
    gcodes_disabled: [],
    physics_stages_affected: ["deflection_control", "center_support", "vibration_damping"],
    physics_impact_description: "Programmable tailstock provides center support for shaft-type parts. Reduces deflection at free end. Required for L/D > 3 turning of shafts.",
  },
  {
    option: "hasAutoDoor",
    post_properties_enabled: ["useAutoDoor", "doorOpenCode", "doorCloseCode"],
    post_properties_disabled: [],
    gcodes_enabled: ["M85/M86 (auto door open/close)"],
    gcodes_disabled: [],
    physics_stages_affected: ["automation", "cycle_time_optimization"],
    physics_impact_description: "Automatic door enables robot loading and pallet changer operation. Reduces non-cut time by 5-15 seconds per cycle. Required for full automation cells.",
  },
  {
    option: "hasProgrammableCoolantNozzle",
    post_properties_enabled: ["usePCoolant", "coolantNozzleAngle", "coolantFollowsTool"],
    post_properties_disabled: [],
    gcodes_enabled: ["M50-M58 (nozzle position)", "M500 Pxx (Haas P-Cool angle)"],
    gcodes_disabled: [],
    physics_stages_affected: ["thermal_model", "chip_evacuation", "tool_life_prediction"],
    physics_impact_description: "Programmable coolant nozzle directs coolant precisely at cutting zone. Improves tool life by 20-40% and chip evacuation effectiveness. Aim angle tracks tool tip.",
  },
  {
    option: "hasHighPressureCoolant",
    post_properties_enabled: ["highPressureCoolant", "coolantPressureBar", "useG100"],
    post_properties_disabled: [],
    gcodes_enabled: ["M88 (HP coolant on)", "M89 (HP coolant off)"],
    gcodes_disabled: [],
    physics_stages_affected: ["thermal_model", "chip_breaking", "tool_life_prediction", "deep_hole_drilling"],
    physics_impact_description: "External high-pressure coolant (70-150 bar) breaks chips in difficult materials (Ti, Inconel, stainless). Improves tool life by 50-200% in these materials. Essential for chip control in boring.",
  },
  {
    option: "spindleOption",
    post_properties_enabled: ["spindleType", "maxSpindleSpeed"],
    post_properties_disabled: [],
    gcodes_enabled: ["S (spindle speed)", "M3/M4 (CW/CCW)"],
    gcodes_disabled: [],
    physics_stages_affected: ["spindle_torque_curve", "power_budget", "cutting_speed_optimization"],
    physics_impact_description: "Spindle option determines the torque-speed curve. High-speed spindles trade torque for RPM (aluminum/small tools). High-torque spindles handle heavy cuts in steel/titanium.",
  },
  {
    option: "maxRpm",
    post_properties_enabled: ["maxSpindleSpeed"],
    post_properties_disabled: [],
    gcodes_enabled: [],
    gcodes_disabled: [],
    physics_stages_affected: ["cutting_speed_optimization", "surface_speed_limit"],
    physics_impact_description: "Maximum RPM determines achievable surface speed for small tools. Standard 8100rpm limits 6mm endmill to 153 m/min. 12000rpm extends to 226 m/min.",
  },
  {
    option: "spindlePower_kW",
    post_properties_enabled: ["spindlePowerRating"],
    post_properties_disabled: [],
    gcodes_enabled: [],
    gcodes_disabled: [],
    physics_stages_affected: ["power_budget", "mrr_limit", "roughing_capability"],
    physics_impact_description: "Spindle power sets the maximum material removal rate ceiling. Each 1kW of additional power enables approximately 4-6 cm3/min additional MRR in steel.",
  },
  {
    option: "spindleTorque_Nm",
    post_properties_enabled: ["spindleTorqueRating"],
    post_properties_disabled: [],
    gcodes_enabled: [],
    gcodes_disabled: [],
    physics_stages_affected: ["power_budget", "large_tool_capability", "heavy_roughing"],
    physics_impact_description: "Spindle torque determines capability with large-diameter tools at low RPM. Critical for face milling (>50mm) and heavy boring operations. More torque = deeper cuts possible.",
  },
  {
    option: "coolantPressure",
    post_properties_enabled: ["coolantPressureLevel", "coolantPressureBar"],
    post_properties_disabled: [],
    gcodes_enabled: [],
    gcodes_disabled: [],
    physics_stages_affected: ["thermal_model", "chip_breaking", "deep_hole_capability"],
    physics_impact_description: "Standard=20bar for general machining. High=70bar for TSC drilling and difficult materials. Ultra=100+bar for aerospace superalloys and deep hole drilling.",
  },
  {
    option: "coolantType",
    post_properties_enabled: ["coolantDeliveryMethod"],
    post_properties_disabled: [],
    gcodes_enabled: [],
    gcodes_disabled: [],
    physics_stages_affected: ["thermal_model", "lubrication_model", "environmental_impact"],
    physics_impact_description: "Coolant delivery method affects thermal management strategy. Flood=general purpose. TSC=deep holes. MQL=near-dry for aluminum/cast iron. Cryogenic=titanium/Inconel.",
  },
  {
    option: "hasHSMPackage",
    post_properties_enabled: ["useHSM", "hsm_tolerance", "hsm_mode", "useG187", "useCYCLE832", "useG5.1"],
    post_properties_disabled: [],
    gcodes_enabled: ["G187 (Haas smoothing)", "CYCLE832 (Siemens HSC)", "G5.1 (Fanuc AI contour)", "G61.1 (Fanuc nano smoothing)"],
    gcodes_disabled: [],
    physics_stages_affected: ["toolpath_smoothing", "jerk_control", "surface_finish_prediction", "corner_rounding"],
    physics_impact_description: "High-speed machining package enables look-ahead buffering, corner rounding, and acceleration optimization. Reduces cycle time 10-30% while improving surface finish by 1-2 Ra classes.",
  },
  {
    option: "has5AxisPackage",
    post_properties_enabled: ["use5Axis", "useTCP", "useRTCP", "useTRAORI", "useG43.4", "useG43.5"],
    post_properties_disabled: [],
    gcodes_enabled: ["G43.4 (Fanuc TCP)", "G43.5 (Fanuc tilted tool)", "TRAORI (Siemens)", "M128 (Heidenhain TCPM)"],
    gcodes_disabled: [],
    physics_stages_affected: ["kinematics", "tcp_control", "tool_vector_management", "singularity_handling"],
    physics_impact_description: "5-axis simultaneous package enables Tool Center Point management (RTCP/TCP). Required for continuous 5-axis contouring. Without it, machine is limited to 3+2 indexed positioning.",
  },
  {
    option: "hasAdaptiveControl",
    post_properties_enabled: ["useAdaptiveControl", "adaptiveFeedOverride"],
    post_properties_disabled: [],
    gcodes_enabled: ["G62 (adaptive feed)", "AFC (Heidenhain)"],
    gcodes_disabled: [],
    physics_stages_affected: ["feed_optimization", "power_monitoring", "tool_protection"],
    physics_impact_description: "Adaptive control monitors spindle load in real-time and adjusts feed rate. Prevents tool breakage during unexpected hard spots. Reduces cycle time 10-25% by maximizing engagement.",
  },
  {
    option: "hasThermalComp",
    post_properties_enabled: ["useThermalComp"],
    post_properties_disabled: [],
    gcodes_enabled: ["G10.6 (Fanuc thermal comp)", "CYCLE996 (Siemens)"],
    gcodes_disabled: [],
    physics_stages_affected: ["thermal_drift_compensation", "dimensional_accuracy"],
    physics_impact_description: "Thermal compensation corrects for spindle/structure thermal growth. Reduces drift from 30-50um to under 5um over 8-hour shift. Critical for tight tolerance work (+/-0.01mm).",
  },
  {
    option: "hasCollisionAvoidance",
    post_properties_enabled: ["useCollisionAvoidance", "casModel"],
    post_properties_disabled: [],
    gcodes_enabled: [],
    gcodes_disabled: [],
    physics_stages_affected: ["collision_detection", "safe_retract", "machine_protection"],
    physics_impact_description: "Controller-based collision avoidance uses 3D machine model to detect imminent crashes. Stops axes before contact. Prevents $10K-100K+ crash damage. Adds 1-3% cycle time overhead.",
  },
  {
    option: "hasConversational",
    post_properties_enabled: ["conversationalMode"],
    post_properties_disabled: [],
    gcodes_enabled: [],
    gcodes_disabled: [],
    physics_stages_affected: [],
    physics_impact_description: "Conversational programming (MAZATROL, ShopMill, Manual Guide i) enables at-machine programming without CAM. Useful for simple parts and prototype work.",
  },
  {
    option: "hasRigidTapping",
    post_properties_enabled: ["useRigidTapping", "useG84", "useG84.2", "useG84.3"],
    post_properties_disabled: [],
    gcodes_enabled: ["G84 (rigid tap cycle)", "G84.2/G84.3 (Fanuc rigid tap)", "M29 (rigid tap mode)"],
    gcodes_disabled: [],
    physics_stages_affected: ["tapping_synchronization", "thread_quality"],
    physics_impact_description: "Rigid tapping synchronizes spindle and feed for precise thread cutting without tension/compression holders. Enables higher tapping speeds (up to 5000 RPM) and better thread quality.",
  },
  {
    option: "hasNURBS",
    post_properties_enabled: ["useNURBS", "useG6.2", "nurbsDegree"],
    post_properties_disabled: [],
    gcodes_enabled: ["G6.2 (Fanuc NURBS)", "BSPLINE (Siemens)"],
    gcodes_disabled: [],
    physics_stages_affected: ["toolpath_smoothing", "surface_finish_prediction", "data_reduction"],
    physics_impact_description: "NURBS interpolation reduces G-code file size by 80-95% while improving surface finish. Machine interpolates smooth curves natively instead of linearizing. Best for complex freeform surfaces.",
  },
];

// ============================================================================
// U04 — OPTION VALIDATION RULES
// ============================================================================

interface ValidationRule {
  id: string;
  description: string;
  severity: "error" | "warning";
  check: (opts: Partial<MachineOptions>, familyType: string) => boolean;
}

const VALIDATION_RULES: ValidationRule[] = [
  {
    id: "TSC_REQUIRES_PRESSURE",
    description: "Through-spindle coolant (hasTSC) requires coolantPressure >= 'high' or dedicated TSC system",
    severity: "warning",
    check: (opts) => opts.hasTSC === true && opts.coolantPressure === "standard",
  },
  {
    id: "LIVE_TOOLING_REQUIRES_CAXIS",
    description: "Live tooling requires C-axis for angular positioning of cross operations",
    severity: "error",
    check: (opts) => opts.hasLiveTooling === true && opts.hasCAxis === false,
  },
  {
    id: "YAXIS_REQUIRES_LIVE_TOOLING",
    description: "Y-axis is only useful with live tooling enabled",
    severity: "warning",
    check: (opts) => opts.hasYAxis === true && opts.hasLiveTooling === false,
  },
  {
    id: "SUBSPINDLE_IMPLIES_PART_CATCHER_REDUNDANT",
    description: "Sub-spindle machines typically do not need a part catcher (sub-spindle handles transfer)",
    severity: "warning",
    check: (opts) => opts.hasSubSpindle === true && opts.hasPartCatcher === true,
  },
  {
    id: "BAR_FEEDER_LATHE_ONLY",
    description: "Bar feeder is only applicable to lathes, mill-turns, and swiss machines",
    severity: "error",
    check: (opts, type) => opts.hasBarFeeder === true && !["lathe", "mill_turn", "swiss"].includes(type),
  },
  {
    id: "PALLET_CHANGER_NOT_ON_LATHE",
    description: "Pallet changers are not available on lathes/swiss machines",
    severity: "error",
    check: (opts, type) => opts.hasPalletChanger === true && ["lathe", "swiss"].includes(type),
  },
  {
    id: "5AXIS_REQUIRES_DWO",
    description: "5-axis package requires DWO/CYCLE800 for coordinate transforms",
    severity: "warning",
    check: (opts) => opts.has5AxisPackage === true && opts.hasDWO === false,
  },
  {
    id: "HSM_BENEFITS_FROM_TSC",
    description: "High-speed machining benefits greatly from through-spindle coolant for chip evacuation",
    severity: "warning",
    check: (opts) => opts.hasHSMPackage === true && opts.hasTSC === false,
  },
  {
    id: "STEADY_REST_LATHE_ONLY",
    description: "Steady rest is only applicable to lathes and mill-turns",
    severity: "error",
    check: (opts, type) => opts.hasSteadyRest === true && !["lathe", "mill_turn"].includes(type),
  },
  {
    id: "TAILSTOCK_LATHE_ONLY",
    description: "Tailstock is only applicable to lathes and mill-turns",
    severity: "error",
    check: (opts, type) => opts.hasTailstock === true && !["lathe", "mill_turn"].includes(type),
  },
  {
    id: "PART_CATCHER_LATHE_ONLY",
    description: "Part catcher is only applicable to lathes and swiss machines",
    severity: "error",
    check: (opts, type) => opts.hasPartCatcher === true && !["lathe", "mill_turn", "swiss"].includes(type),
  },
  {
    id: "LIVE_TOOLING_LATHE_ONLY",
    description: "Live tooling is only applicable to lathes, mill-turns, and swiss machines",
    severity: "error",
    check: (opts, type) => opts.hasLiveTooling === true && !["lathe", "mill_turn", "swiss"].includes(type),
  },
  {
    id: "CRYOGENIC_REQUIRES_ULTRA_PRESSURE",
    description: "Cryogenic coolant systems typically operate at ultra-high pressure",
    severity: "warning",
    check: (opts) => opts.coolantType === "cryogenic" && opts.coolantPressure !== "ultra",
  },
  {
    id: "MQL_INCOMPATIBLE_WITH_HP",
    description: "MQL (minimum quantity lubrication) is incompatible with high-pressure external coolant",
    severity: "warning",
    check: (opts) => opts.coolantType === "mql" && opts.hasHighPressureCoolant === true,
  },
  {
    id: "COLLISION_AVOIDANCE_BENEFITS_5AXIS",
    description: "Collision avoidance is strongly recommended for 5-axis machines",
    severity: "warning",
    check: (opts) => opts.has5AxisPackage === true && opts.hasCollisionAvoidance === false,
  },
  {
    id: "NURBS_REQUIRES_HSM",
    description: "NURBS interpolation works best with HSM package for look-ahead and smoothing",
    severity: "warning",
    check: (opts) => opts.hasNURBS === true && opts.hasHSMPackage === false,
  },
  {
    id: "HIGH_SPEED_SPINDLE_LOW_TORQUE",
    description: "High-speed spindle option reduces available torque — verify roughing capability",
    severity: "warning",
    check: (opts) => opts.spindleOption === "high_speed" && (opts.spindleTorque_Nm ?? 0) > 200,
  },
  {
    id: "HIGH_TORQUE_SPINDLE_LOW_RPM",
    description: "High-torque spindle option reduces max RPM — verify surface speed for small tools",
    severity: "warning",
    check: (opts) => opts.spindleOption === "high_torque" && (opts.maxRpm ?? 0) > 12000,
  },
];

// ============================================================================
// U05 — OPTION PRESET GENERATOR
// ============================================================================

/** Generate presets for a given machine family type. */
function generatePresets(familyType: string, standardConfig: Partial<MachineOptions>): OptionPreset[] {
  const base: OptionPreset = {
    name: "base",
    description: `Factory standard configuration — no added options`,
    options: { ...standardConfig },
  };

  // Build "production" preset: standard + common shop-floor adds
  const production: Partial<MachineOptions> = { ...standardConfig };

  if (familyType === "vmc" || familyType === "hmc" || familyType === "5axis") {
    production.hasTSC = true;
    production.hasProbing = true;
    production.hasChipConveyor = true;
    production.hasToolArm = true;
    production.hasHSMPackage = true;
    production.coolantPressure = "high";
    production.coolantType = "tsc";
    if (familyType === "hmc") {
      production.hasPalletChanger = true;
      production.hasAutoDoor = true;
    }
    if (familyType === "5axis") {
      production.has5AxisPackage = true;
      production.hasDWO = true;
      production.hasThermalComp = true;
    }
  } else if (familyType === "lathe" || familyType === "mill_turn") {
    production.hasTSC = true;
    production.hasChipConveyor = true;
    production.hasToolArm = true;
    production.hasTailstock = true;
    production.hasBarFeeder = true;
    production.coolantPressure = "high";
    if (familyType === "mill_turn") {
      production.hasLiveTooling = true;
      production.hasYAxis = true;
      production.hasCAxis = true;
    } else {
      production.hasCAxis = true;
      production.hasLiveTooling = true;
    }
  } else if (familyType === "swiss") {
    production.hasTSC = true;
    production.hasChipConveyor = true;
    production.hasBarFeeder = true;
    production.hasPartCatcher = true;
    production.coolantPressure = "high";
  }

  const prodPreset: OptionPreset = {
    name: "production",
    description: `Production-ready configuration with common shop-floor options`,
    options: production,
  };

  // Build "fully_loaded" preset: everything possible
  const loaded: Partial<MachineOptions> = { ...production };
  loaded.hasProbing = true;
  loaded.hasToolArm = true;
  loaded.hasChipConveyor = true;
  loaded.hasAutoDoor = true;
  loaded.hasThermalComp = true;
  loaded.hasHSMPackage = true;
  loaded.hasRigidTapping = true;
  loaded.hasProgrammableCoolantNozzle = true;
  loaded.hasHighPressureCoolant = true;
  loaded.coolantPressure = "ultra";

  if (familyType === "vmc" || familyType === "hmc" || familyType === "5axis") {
    loaded.hasNURBS = true;
    loaded.hasAdaptiveControl = true;
    loaded.hasCollisionAvoidance = true;
    loaded.spindleOption = "high_speed";
    if (familyType === "5axis") {
      loaded.has5AxisPackage = true;
    }
    if (familyType === "hmc") {
      loaded.hasPalletChanger = true;
    }
  }

  if (familyType === "lathe" || familyType === "mill_turn") {
    loaded.hasLiveTooling = true;
    loaded.hasYAxis = true;
    loaded.hasCAxis = true;
    loaded.hasSubSpindle = true;
    loaded.hasBarFeeder = true;
    loaded.hasSteadyRest = true;
    loaded.hasTailstock = true;
    loaded.hasPartCatcher = true;
    loaded.hasAdaptiveControl = true;
    if (familyType === "mill_turn") {
      loaded.has5AxisPackage = true;
      loaded.hasNURBS = true;
      loaded.hasCollisionAvoidance = true;
    }
  }

  if (familyType === "swiss") {
    loaded.hasLiveTooling = true;
    loaded.hasCAxis = true;
    loaded.hasSubSpindle = true;
    loaded.hasBarFeeder = true;
    loaded.hasPartCatcher = true;
    loaded.hasAdaptiveControl = true;
  }

  const loadedPreset: OptionPreset = {
    name: "fully_loaded",
    description: `Maximum configuration with all available options`,
    options: loaded,
  };

  return [base, prodPreset, loadedPreset];
}

// ============================================================================
// MANUFACTURER REGISTRY
// ============================================================================

const MANUFACTURER_REGISTRY: ManufacturerOptionProfile[] = [
  { manufacturer: "Haas", model_families: HAAS_PROFILES },
  { manufacturer: "Mazak", model_families: MAZAK_PROFILES },
  { manufacturer: "DMG MORI", model_families: DMG_MORI_PROFILES },
  { manufacturer: "Okuma", model_families: OKUMA_PROFILES },
];

// ============================================================================
// MACHINE OPTION REGISTRY ENGINE
// ============================================================================

/** Runtime option storage keyed by machine ID. */
const machineOptionStore = new Map<string, Partial<MachineOptions>>();

export class MachineOptionRegistryEngine {
  // ── Action: get_options ──
  /**
   * Get the current options for a machine. If none stored, returns default.
   */
  get_options(machineId: string): { machineId: string; options: MachineOptions } {
    const stored = machineOptionStore.get(machineId);
    const opts = { ...defaultMachineOptions(), ...stored };
    // MachineOptionRegistry: get_options
    return { machineId, options: opts };
  }

  // ── Action: set_options ──
  /**
   * Set / merge options for a specific machine.
   * Returns the validation result plus final resolved options.
   */
  set_options(
    machineId: string,
    options: Partial<MachineOptions>,
    machineType?: string,
  ): { machineId: string; options: MachineOptions; validation: OptionValidationResult } {
    const existing = machineOptionStore.get(machineId) ?? {};
    const merged = { ...existing, ...options };
    machineOptionStore.set(machineId, merged);

    const resolved = { ...defaultMachineOptions(), ...merged };
    const validation = this.validate_options(merged, machineType ?? "vmc");

    // MachineOptionRegistry: set_options
    return { machineId, options: resolved, validation };
  }

  // ── Action: validate_options ──
  /**
   * Validate a set of options against compatibility rules.
   */
  validate_options(
    options: Partial<MachineOptions>,
    machineType: string,
  ): OptionValidationResult {
    const errors: OptionConflict[] = [];
    const warnings: OptionConflict[] = [];

    for (const rule of VALIDATION_RULES) {
      if (rule.check(options, machineType)) {
        const conflict: OptionConflict = {
          rule_id: rule.id,
          description: rule.description,
          severity: rule.severity,
        };
        if (rule.severity === "error") {
          errors.push(conflict);
        } else {
          warnings.push(conflict);
        }
      }
    }

    // Check availability against manufacturer catalog if we can infer manufacturer
    const resolved = { ...defaultMachineOptions(), ...options };

    // MachineOptionRegistry: validate_options
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      resolved_options: resolved,
    };
  }

  // ── Action: get_presets ──
  /**
   * Get option presets (base / production / fully_loaded) for a manufacturer + family.
   */
  get_presets(
    manufacturer: string,
    family: string,
  ): { manufacturer: string; family: string; presets: OptionPreset[] } | { error: string } {
    const mfr = MANUFACTURER_REGISTRY.find(
      (m) => m.manufacturer.toLowerCase() === manufacturer.toLowerCase(),
    );
    if (!mfr) {
      return { error: `Manufacturer "${manufacturer}" not found. Available: ${MANUFACTURER_REGISTRY.map((m) => m.manufacturer).join(", ")}` };
    }

    const fam = mfr.model_families.find(
      (f) => f.family.toLowerCase() === family.toLowerCase() ||
        f.models.some((m) => m.toLowerCase() === family.toLowerCase()),
    );
    if (!fam) {
      return { error: `Family "${family}" not found for ${manufacturer}. Available: ${mfr.model_families.map((f) => f.family).join(", ")}` };
    }

    const presets = generatePresets(fam.machine_type, fam.standard_config);
    // MachineOptionRegistry: get_presets
    return { manufacturer, family: fam.family, presets };
  }

  // ── Action: get_option_impact ──
  /**
   * Get the post-processor and physics impact of a specific option.
   */
  get_option_impact(
    optionName: keyof MachineOptions,
  ): OptionImpact | { error: string } {
    const impact = OPTION_IMPACT_MAP.find((i) => i.option === optionName);
    if (!impact) {
      return { error: `No impact data for option "${String(optionName)}". Available: ${OPTION_IMPACT_MAP.map((i) => String(i.option)).join(", ")}` };
    }
    // MachineOptionRegistry: get_option_impact
    return impact;
  }

  /**
   * Get ALL option impacts at once (useful for bulk analysis).
   */
  get_all_option_impacts(): OptionImpact[] {
    return [...OPTION_IMPACT_MAP];
  }

  // ── Action: get_manufacturer_profile ──
  /**
   * Get the full manufacturer option profile (all families, availability, standard configs).
   */
  get_manufacturer_profile(
    manufacturer: string,
    family?: string,
  ): ManufacturerOptionProfile | ModelFamilyOptions | { error: string } {
    const mfr = MANUFACTURER_REGISTRY.find(
      (m) => m.manufacturer.toLowerCase() === manufacturer.toLowerCase(),
    );
    if (!mfr) {
      return { error: `Manufacturer "${manufacturer}" not found. Available: ${MANUFACTURER_REGISTRY.map((m) => m.manufacturer).join(", ")}` };
    }

    if (family) {
      const fam = mfr.model_families.find(
        (f) => f.family.toLowerCase() === family.toLowerCase() ||
          f.models.some((m) => m.toLowerCase() === family.toLowerCase()),
      );
      if (!fam) {
        return { error: `Family "${family}" not found for ${manufacturer}. Available: ${mfr.model_families.map((f) => f.family).join(", ")}` };
      }
      // MachineOptionRegistry: get_manufacturer_profile (family)
      return fam;
    }

    // MachineOptionRegistry: get_manufacturer_profile (all)
    return mfr;
  }

  /**
   * List all registered manufacturers.
   */
  list_manufacturers(): string[] {
    return MANUFACTURER_REGISTRY.map((m) => m.manufacturer);
  }

  /**
   * Lookup which controller brands are used by a given machine manufacturer.
   */
  get_controllers_for_brand(brand: string): string[] {
    const result: string[] = [];
    for (const [controller, brands] of Object.entries(CONTROLLER_BRAND_MAP)) {
      if (brands.some((b) => b.toLowerCase() === brand.toLowerCase())) {
        result.push(controller);
      }
    }
    return result;
  }

  /**
   * Lookup which machine brands use a given controller.
   */
  get_brands_for_controller(controller: string): string[] {
    const key = Object.keys(CONTROLLER_BRAND_MAP).find(
      (k) => k.toLowerCase() === controller.toLowerCase(),
    );
    return key ? [...CONTROLLER_BRAND_MAP[key]] : [];
  }

  /**
   * Check if a specific option is available for a given manufacturer/model.
   * Returns the availability status plus the standard config value if standard.
   */
  check_option_availability(
    manufacturer: string,
    model: string,
    option: keyof MachineOptions,
  ): { manufacturer: string; model: string; option: string; availability: OptionAvailability; standard_value?: unknown; family?: string } | { error: string } {
    const mfr = MANUFACTURER_REGISTRY.find(
      (m) => m.manufacturer.toLowerCase() === manufacturer.toLowerCase(),
    );
    if (!mfr) {
      return { error: `Manufacturer "${manufacturer}" not found` };
    }

    for (const fam of mfr.model_families) {
      if (
        fam.family.toLowerCase() === model.toLowerCase() ||
        fam.models.some((m) => m.toLowerCase() === model.toLowerCase())
      ) {
        const avail = fam.option_availability[option];
        const stdVal = avail === "standard" ? fam.standard_config[option] : undefined;
        return {
          manufacturer: mfr.manufacturer,
          model,
          option: String(option),
          availability: avail,
          standard_value: stdVal,
          family: fam.family,
        };
      }
    }

    return { error: `Model "${model}" not found for ${manufacturer}` };
  }

  /**
   * Compare options between two machine configurations.
   * Returns differences.
   */
  compare_options(
    machineIdA: string,
    machineIdB: string,
  ): {
    machineA: string;
    machineB: string;
    differences: Array<{
      option: string;
      valueA: unknown;
      valueB: unknown;
    }>;
    identical_count: number;
    different_count: number;
  } {
    const optsA = this.get_options(machineIdA).options;
    const optsB = this.get_options(machineIdB).options;

    const differences: Array<{ option: string; valueA: unknown; valueB: unknown }> = [];
    let identical = 0;

    for (const key of Object.keys(optsA) as (keyof MachineOptions)[]) {
      if (optsA[key] !== optsB[key]) {
        differences.push({
          option: String(key),
          valueA: optsA[key],
          valueB: optsB[key],
        });
      } else {
        identical++;
      }
    }

    return {
      machineA: machineIdA,
      machineB: machineIdB,
      differences,
      identical_count: identical,
      different_count: differences.length,
    };
  }

  /**
   * Given a machine's current options, determine which post-processor
   * properties should be enabled/disabled and which G-codes are available.
   */
  resolve_post_properties(
    options: Partial<MachineOptions>,
  ): {
    enabled_properties: string[];
    disabled_properties: string[];
    available_gcodes: string[];
    unavailable_gcodes: string[];
    affected_physics_stages: string[];
  } {
    const enabled = new Set<string>();
    const disabled = new Set<string>();
    const gcAvail = new Set<string>();
    const gcUnavail = new Set<string>();
    const physics = new Set<string>();

    const resolved = { ...defaultMachineOptions(), ...options };

    for (const impact of OPTION_IMPACT_MAP) {
      const optKey = impact.option;
      const val = resolved[optKey];

      // Determine if option is "on"
      let isActive = false;
      if (typeof val === "boolean") {
        isActive = val;
      } else if (optKey === "spindleOption") {
        isActive = val !== "standard";
      } else if (optKey === "coolantPressure") {
        isActive = val !== "standard";
      } else if (optKey === "coolantType") {
        isActive = val !== "flood";
      } else if (typeof val === "number") {
        isActive = true; // numeric options always contribute
      }

      if (isActive) {
        for (const p of impact.post_properties_enabled) enabled.add(p);
        for (const p of impact.post_properties_disabled) disabled.add(p);
        for (const g of impact.gcodes_enabled) gcAvail.add(g);
        for (const s of impact.physics_stages_affected) physics.add(s);
      } else {
        for (const g of impact.gcodes_disabled) gcUnavail.add(g);
        // If option is OFF, any codes it would enable are unavailable
        for (const g of impact.gcodes_enabled) gcUnavail.add(g);
      }
    }

    // Remove conflicts (enabled wins over disabled for same property)
    Array.from(enabled).forEach((p) => disabled.delete(p));
    Array.from(gcAvail).forEach((g) => gcUnavail.delete(g));

    return {
      enabled_properties: Array.from(enabled).sort(),
      disabled_properties: Array.from(disabled).sort(),
      available_gcodes: Array.from(gcAvail).sort(),
      unavailable_gcodes: Array.from(gcUnavail).sort(),
      affected_physics_stages: Array.from(physics).sort(),
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const machineOptionRegistryEngine = new MachineOptionRegistryEngine();
