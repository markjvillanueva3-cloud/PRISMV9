/**
 * PRISM MCP Server - Machine Registry
 * Complete access to 824 machines × 4 data layers
 * Implements BASIC → CORE → ENHANCED → LEVEL5 hierarchy
 */

import * as fs from "fs/promises";
import * as path from "path";
import { BaseRegistry } from "./base.js";
import { PATHS, DATA_LAYERS } from "../constants.js";
import { log } from "../utils/Logger.js";
import { readJsonFile, fileExists, listDirectory } from "../utils/files.js";
import { normalizeMachine, type NormalizedMachine } from "./machine-normalizer.js";

function isMeaningfulMachineValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value) && value !== 0;
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
  return true;
}

function mergeMachineArray(existing: unknown[], incoming: unknown[]): unknown[] {
  const primitiveOnly = [...existing, ...incoming].every(
    (item) => item == null || ["string", "number", "boolean"].includes(typeof item),
  );

  if (primitiveOnly) {
    return Array.from(new Set([...existing, ...incoming]));
  }

  return incoming.length >= existing.length ? incoming : existing;
}

function mergeMachineField(existing: unknown, incoming: unknown): unknown {
  if (!isMeaningfulMachineValue(incoming)) return existing;
  if (!isMeaningfulMachineValue(existing)) return incoming;

  if (Array.isArray(existing) && Array.isArray(incoming)) {
    return mergeMachineArray(existing, incoming);
  }

  if (
    typeof existing === "object" && existing !== null
    && typeof incoming === "object" && incoming !== null
    && !Array.isArray(existing)
    && !Array.isArray(incoming)
  ) {
    const merged: Record<string, unknown> = { ...(existing as Record<string, unknown>) };
    for (const [key, value] of Object.entries(incoming as Record<string, unknown>)) {
      merged[key] = mergeMachineField(merged[key], value);
    }
    return merged;
  }

  return incoming;
}

export function mergeMachineRegistryEntry<T extends Record<string, unknown>>(existing: T, incoming: T): T {
  const merged: Record<string, unknown> = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    merged[key] = mergeMachineField(merged[key], value);
  }
  return merged as T;
}

// ============================================================================
// MACHINE TYPES
// ============================================================================

/** Spindle Specs configuration/data structure.
 */
export interface SpindleSpecs {
  max_rpm: number;
  min_rpm: number;
  power_continuous: number;     // kW
  power_30min: number;          // kW
  power_peak?: number;          // kW
  torque_max: number;           // Nm
  torque_continuous: number;    // Nm
  bearing_type: string;
  spindle_nose: string;         // e.g., "BT40", "CAT50", "HSK-A63"
  coolant_through: boolean;
  coolant_pressure?: number;    // bar
  orientation_capability?: string[];  // ["horizontal", "vertical"]
}

/** Axis Specs configuration/data structure.
 */
export interface AxisSpecs {
  name: string;                 // X, Y, Z, A, B, C
  travel: number;               // mm
  rapid_rate: number;           // mm/min
  max_feed_rate: number;        // mm/min
  acceleration: number;         // m/s²
  resolution: number;           // µm
  repeatability: number;        // µm
  accuracy: number;             // µm
  ball_screw_diameter?: number; // mm
  linear_scale?: boolean;
}

/** Tool Changer Specs configuration/data structure.
 */
export interface ToolChangerSpecs {
  type: "side_mount" | "arm" | "umbrella" | "chain" | "disc" | "turret" | "none";
  capacity: number;
  max_tool_diameter: number;    // mm
  max_tool_length: number;      // mm
  max_tool_weight: number;      // kg
  change_time: number;          // seconds (chip-to-chip)
  adjacent_empty?: boolean;     // For large tools
}

/** Table Specs configuration/data structure.
 */
export interface TableSpecs {
  type: string;                 // fixed, rotary, tilting, trunnion
  length: number;               // mm
  width: number;                // mm
  t_slots?: number;
  t_slot_width?: number;        // mm
  max_load: number;             // kg
  rotation_range?: { min: number; max: number };  // degrees
}

/** Controller Specs configuration/data structure.
 */
export interface ControllerSpecs {
  manufacturer: string;         // FANUC, SIEMENS, HEIDENHAIN, etc.
  model: string;                // e.g., "0i-MF", "840D sl", "TNC 640"
  cnc_type: string;             // e.g., "FANUC 0i-MF", "SINUMERIK 840D"
  max_block_rate: number;       // blocks/second
  look_ahead: number;           // blocks
  memory_capacity: string;      // e.g., "4GB"
  ethernet: boolean;
  usb: boolean;
  dxf_import?: boolean;
  conversational?: boolean;
}

/** FRF (Frequency Response Function) Data for chatter prediction (INTEG-MS4 U-INTEG18) */
export interface FRFData {
  /** Natural frequency of dominant mode in Hz */
  natural_frequency_hz: number;
  /** Damping ratio (zeta) — typically 0.01-0.1 */
  damping_ratio: number;
  /** Modal stiffness in N/µm (k = F/x) */
  stiffness_n_um: number;
  /** Modal mass in kg (optional, can be derived from f_n and k) */
  modal_mass_kg?: number;
  /** Measurement source: tap_test, frf_measurement, manufacturer, estimated */
  source: "tap_test" | "frf_measurement" | "manufacturer" | "estimated";
  /** Date of measurement (ISO string) */
  measured_date?: string;
  /** Additional modes if available */
  secondary_modes?: Array<{
    frequency_hz: number;
    damping_ratio: number;
    stiffness_n_um: number;
  }>;
  /** Compliance at tool tip in µm/N (inverse of stiffness) */
  compliance_um_n?: number;
  /** Direction: X, Y, or combined (for 2D FRF) */
  direction?: "X" | "Y" | "combined";
}

/** Machine Envelope configuration/data structure.
 */
export interface MachineEnvelope {
  x_travel: number;
  y_travel: number;
  z_travel: number;
  spindle_to_table_min: number;
  spindle_to_table_max: number;
  spindle_nose_to_column?: number;
}

/** Machine configuration/data structure.
 */
export interface Machine {
  id: string;
  manufacturer: string;
  model: string;
  name: string;                 // Full display name
  type: string;                 // VMC, HMC, lathe, mill-turn, etc.
  
  // Specifications
  envelope: MachineEnvelope;
  spindle: SpindleSpecs;
  axes: AxisSpecs[];
  tool_changer: ToolChangerSpecs;
  table: TableSpecs;
  controller: ControllerSpecs;
  
  // Physical
  weight: number;               // kg
  footprint: { length: number; width: number; height: number };  // mm
  power_requirement: number;    // kVA
  air_requirement?: number;     // L/min
  coolant_capacity?: number;    // L
  
  // Capabilities
  simultaneous_axes: number;    // 3, 4, or 5
  high_speed_machining: boolean;
  rigid_tapping: boolean;
  probing_ready: boolean;
  automation_ready: boolean;
  
  // Metadata
  layer: string;
  year_introduced?: number;
  price_range?: { min: number; max: number };  // USD
  typical_applications?: string[];
  
  // LEVEL5 CAD data (if available)
  cad_file?: string;
  collision_model?: string;
  kinematic_chain?: object;

  // FRF dynamics data (INTEG-MS4 U-INTEG18)
  frf_data?: FRFData;
}

// ============================================================================
// MACHINE SOURCE FILE CATALOG — 60 MEDIUM-priority extracted JS modules
// Maps extraction IDs to source metadata for 24,643 lines across 4 tiers
// ============================================================================

/** Machine Tier type definition.
 */
export type MachineTier = "CORE" | "ENHANCED" | "LEVEL5" | "ENGINE";

/** Machine Source File Entry configuration/data structure.
 */
export interface MachineSourceFileEntry {
  filename: string;
  source_dir: string;
  category: string;
  subcategory: string;
  lines: number;
  safety_class: "MEDIUM";
  description: string;
  machine_tier: MachineTier;
}

/** M A C H I N E_ S O U R C E_ F I L E_ C A T A L O G constant.
 */
export const MACHINE_SOURCE_FILE_CATALOG: Record<string, MachineSourceFileEntry> = {
  // ── ENGINE tier (4 files, 1,294 lines) ────────────────────────────────
  "EXT-242": {
    filename: "PRISM_HIGH_FIDELITY_MACHINE_GENERATOR.js",
    source_dir: "extracted/engines/machines",
    category: "engines",
    subcategory: "machines",
    lines: 402,
    safety_class: "MEDIUM",
    description: "High-fidelity generation engine for machine model synthesis",
    machine_tier: "ENGINE",
  },
  "EXT-243": {
    filename: "PRISM_MACHINE_3D_SYSTEM.js",
    source_dir: "extracted/engines/machines",
    category: "engines",
    subcategory: "machines",
    lines: 545,
    safety_class: "MEDIUM",
    description: "Machine 3D visualization and collision modeling engine",
    machine_tier: "ENGINE",
  },
  "EXT-244": {
    filename: "PRISM_MACHINE_RIGIDITY_SYSTEM.js",
    source_dir: "extracted/engines/machines",
    category: "engines",
    subcategory: "machines",
    lines: 94,
    safety_class: "MEDIUM",
    description: "Machine rigidity analysis engine for structural simulation",
    machine_tier: "ENGINE",
  },
  "EXT-245": {
    filename: "PRISM_MACHINE_SIMULATION_ENGINE.js",
    source_dir: "extracted/engines/machines",
    category: "engines",
    subcategory: "machines",
    lines: 253,
    safety_class: "MEDIUM",
    description: "Machine simulation engine for kinematic and dynamic analysis",
    machine_tier: "ENGINE",
  },
  // ── CORE tier (8 files, 4,087 lines) ──────────────────────────────────
  "EXT-382": {
    filename: "machines_core_index.js",
    source_dir: "extracted/machines/CORE",
    category: "machines",
    subcategory: "CORE",
    lines: 94,
    safety_class: "MEDIUM",
    description: "Core machine database index with category mappings and references",
    machine_tier: "CORE",
  },
  "EXT-383": {
    filename: "PRISM_LATHE_MACHINE_DB.js",
    source_dir: "extracted/machines/CORE",
    category: "machines",
    subcategory: "CORE",
    lines: 302,
    safety_class: "MEDIUM",
    description: "Lathe machine database with spindle, turret, and axis profiles",
    machine_tier: "CORE",
  },
  "EXT-384": {
    filename: "PRISM_LATHE_V2_MACHINE_DATABASE_V2.js",
    source_dir: "extracted/machines/CORE",
    category: "machines",
    subcategory: "CORE",
    lines: 301,
    safety_class: "MEDIUM",
    description: "Lathe machine database V2 with spindle, turret, and axis profiles",
    machine_tier: "CORE",
  },
  "EXT-385": {
    filename: "PRISM_MACHINE_3D_DATABASE.js",
    source_dir: "extracted/machines/CORE",
    category: "machines",
    subcategory: "CORE",
    lines: 62,
    safety_class: "MEDIUM",
    description: "Machine 3D model database with basic geometry references",
    machine_tier: "CORE",
  },
  "EXT-386": {
    filename: "PRISM_MACHINE_3D_MODEL_DATABASE_V2.js",
    source_dir: "extracted/machines/CORE",
    category: "machines",
    subcategory: "CORE",
    lines: 108,
    safety_class: "MEDIUM",
    description: "Machine 3D model database V2 with enhanced geometry and collision data",
    machine_tier: "CORE",
  },
  "EXT-387": {
    filename: "PRISM_MACHINE_3D_MODEL_DATABASE_V3.js",
    source_dir: "extracted/machines/CORE",
    category: "machines",
    subcategory: "CORE",
    lines: 2309,
    safety_class: "MEDIUM",
    description: "Machine 3D model database V3 with parametric geometry and rendering data",
    machine_tier: "CORE",
  },
  "EXT-388": {
    filename: "PRISM_OKUMA_MACHINE_CAD_DATABASE.js",
    source_dir: "extracted/machines/CORE",
    category: "machines",
    subcategory: "CORE",
    lines: 275,
    safety_class: "MEDIUM",
    description: "Okuma CNC CAD model database with machine geometry and reference data",
    machine_tier: "CORE",
  },
  "EXT-389": {
    filename: "PRISM_POST_MACHINE_DATABASE.js",
    source_dir: "extracted/machines/CORE",
    category: "machines",
    subcategory: "CORE",
    lines: 636,
    safety_class: "MEDIUM",
    description: "Post-processor machine database with controller-specific mappings and limits",
    machine_tier: "CORE",
  },
  // ── ENHANCED tier (41 files, 16,123 lines) ────────────────────────────
  "EXT-390": {
    filename: "INDEX.js",
    source_dir: "extracted/machines/ENHANCED/BY_COUNTRY/GERMANY",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 34,
    safety_class: "MEDIUM",
    description: "Germany machine manufacturer index with cross-references and catalog",
    machine_tier: "ENHANCED",
  },
  "EXT-391": {
    filename: "INDEX.js",
    source_dir: "extracted/machines/ENHANCED/BY_COUNTRY/ITALY",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 25,
    safety_class: "MEDIUM",
    description: "Italy machine manufacturer index with cross-references and catalog",
    machine_tier: "ENHANCED",
  },
  "EXT-392": {
    filename: "INDEX.js",
    source_dir: "extracted/machines/ENHANCED/BY_COUNTRY/JAPAN",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 52,
    safety_class: "MEDIUM",
    description: "Japan machine manufacturer index with cross-references and catalog",
    machine_tier: "ENHANCED",
  },
  "EXT-393": {
    filename: "INDEX.js",
    source_dir: "extracted/machines/ENHANCED/BY_COUNTRY/SPAIN",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 25,
    safety_class: "MEDIUM",
    description: "Spain machine manufacturer index with cross-references and catalog",
    machine_tier: "ENHANCED",
  },
  "EXT-394": {
    filename: "INDEX.js",
    source_dir: "extracted/machines/ENHANCED/BY_COUNTRY/TAIWAN",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 25,
    safety_class: "MEDIUM",
    description: "Taiwan machine manufacturer index with cross-references and catalog",
    machine_tier: "ENHANCED",
  },
  "EXT-395": {
    filename: "INDEX.js",
    source_dir: "extracted/machines/ENHANCED/BY_COUNTRY/USA",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 34,
    safety_class: "MEDIUM",
    description: "USA machine manufacturer index with cross-references and catalog",
    machine_tier: "ENHANCED",
  },
  "EXT-396": {
    filename: "PRISM_AWEA_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 202,
    safety_class: "MEDIUM",
    description: "Awea CNC bridge mill/VMC profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-397": {
    filename: "PRISM_BROTHER_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 208,
    safety_class: "MEDIUM",
    description: "Brother CNC compact VMC profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-398": {
    filename: "PRISM_CHIRON_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 53,
    safety_class: "MEDIUM",
    description: "Chiron CNC high-speed VMC profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-399": {
    filename: "PRISM_CINCINNATI_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 166,
    safety_class: "MEDIUM",
    description: "Cincinnati CNC VMC/HMC profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-400": {
    filename: "PRISM_DMG_MORI_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 1445,
    safety_class: "MEDIUM",
    description: "DMG Mori CNC VMC/HMC/mill-turn profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-401": {
    filename: "PRISM_DOOSAN_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 288,
    safety_class: "MEDIUM",
    description: "Doosan CNC VMC/HMC/lathe profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-402": {
    filename: "PRISM_FANUC_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 168,
    safety_class: "MEDIUM",
    description: "Fanuc CNC Robodrill VMC profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-403": {
    filename: "PRISM_FEELER_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 1270,
    safety_class: "MEDIUM",
    description: "Feeler CNC VMC/HMC/lathe profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-404": {
    filename: "PRISM_FIDIA_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 189,
    safety_class: "MEDIUM",
    description: "Fidia CNC high-speed 5-axis profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-405": {
    filename: "PRISM_GIDDINGS_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 195,
    safety_class: "MEDIUM",
    description: "Giddings CNC HMC/boring mill profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-406": {
    filename: "PRISM_GROB_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 173,
    safety_class: "MEDIUM",
    description: "Grob CNC 5-axis universal profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-407": {
    filename: "PRISM_HAAS_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 1035,
    safety_class: "MEDIUM",
    description: "Haas CNC VMC/HMC/lathe profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-408": {
    filename: "PRISM_HAAS_MACHINE_DATABASE_ENHANCED_v3.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 1729,
    safety_class: "MEDIUM",
    description: "Haas CNC VMC/HMC/lathe profile V3 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-409": {
    filename: "PRISM_HARDINGE_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 188,
    safety_class: "MEDIUM",
    description: "Hardinge CNC precision lathe/VMC profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-410": {
    filename: "PRISM_HERMLE_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 501,
    safety_class: "MEDIUM",
    description: "Hermle CNC 5-axis VMC profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-411": {
    filename: "PRISM_HURCO_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 227,
    safety_class: "MEDIUM",
    description: "Hurco CNC VMC with conversational control profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-412": {
    filename: "PRISM_HYUNDAI_WIA_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 218,
    safety_class: "MEDIUM",
    description: "Hyundai-WIA CNC VMC/HMC/lathe profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-413": {
    filename: "PRISM_KERN_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 159,
    safety_class: "MEDIUM",
    description: "Kern CNC ultra-precision 5-axis profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-414": {
    filename: "PRISM_KITAMURA_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 187,
    safety_class: "MEDIUM",
    description: "Kitamura CNC precision VMC/HMC profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-415": {
    filename: "PRISM_LEADWELL_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 172,
    safety_class: "MEDIUM",
    description: "Leadwell CNC VMC/lathe profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-416": {
    filename: "PRISM_MACHINES_MASTER_INDEX.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 276,
    safety_class: "MEDIUM",
    description: "Master machine index with cross-references across all tiers",
    machine_tier: "ENHANCED",
  },
  "EXT-417": {
    filename: "PRISM_MAKINO_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 811,
    safety_class: "MEDIUM",
    description: "Makino CNC VMC/HMC/EDM profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-418": {
    filename: "PRISM_MATSUURA_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 190,
    safety_class: "MEDIUM",
    description: "Matsuura CNC multi-axis VMC profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-419": {
    filename: "PRISM_MAZAK_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 262,
    safety_class: "MEDIUM",
    description: "Mazak CNC VMC/HMC/mill-turn/lathe profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-420": {
    filename: "PRISM_MHI_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 280,
    safety_class: "MEDIUM",
    description: "MHI (Mitsubishi Heavy Industries) CNC large-scale machining center profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-421": {
    filename: "PRISM_MIKRON_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 197,
    safety_class: "MEDIUM",
    description: "Mikron CNC high-speed VMC profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-422": {
    filename: "PRISM_OKK_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 172,
    safety_class: "MEDIUM",
    description: "OKK CNC precision VMC/HMC profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-423": {
    filename: "PRISM_OKUMA_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 255,
    safety_class: "MEDIUM",
    description: "Okuma CNC VMC/HMC/lathe/mill-turn profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-424": {
    filename: "PRISM_ROKU_ROKU_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 995,
    safety_class: "MEDIUM",
    description: "Roku-Roku CNC high-speed graphite/die-mold profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-425": {
    filename: "PRISM_SODICK_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 136,
    safety_class: "MEDIUM",
    description: "Sodick CNC EDM/high-speed mill profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-426": {
    filename: "PRISM_SORALUCE_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 219,
    safety_class: "MEDIUM",
    description: "Soraluce CNC floor-type boring/milling profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-427": {
    filename: "PRISM_SPINNER_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 170,
    safety_class: "MEDIUM",
    description: "Spinner CNC compact VMC/lathe profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-428": {
    filename: "PRISM_TAKUMI_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 939,
    safety_class: "MEDIUM",
    description: "Takumi CNC high-speed VMC profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-429": {
    filename: "PRISM_TOYODA_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 170,
    safety_class: "MEDIUM",
    description: "Toyoda CNC HMC/VMC profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  "EXT-430": {
    filename: "PRISM_YASDA_MACHINE_DATABASE_ENHANCED_v2.js",
    source_dir: "extracted/machines/ENHANCED",
    category: "machines",
    subcategory: "ENHANCED",
    lines: 150,
    safety_class: "MEDIUM",
    description: "Yasda CNC ultra-precision 5-axis profile V2 with capabilities, kinematics, and limits",
    machine_tier: "ENHANCED",
  },
  // ── LEVEL5 tier (3 files, 2,133 lines) ────────────────────────────────
  "EXT-431": {
    filename: "PRISM_HAAS_CAD_MAPPING.js",
    source_dir: "extracted/machines/LEVEL5",
    category: "machines",
    subcategory: "LEVEL5",
    lines: 146,
    safety_class: "MEDIUM",
    description: "Haas CNC CAD model mapping with collision geometry references",
    machine_tier: "LEVEL5",
  },
  "EXT-432": {
    filename: "PRISM_HAAS_LEVEL5_COMPLETE.js",
    source_dir: "extracted/machines/LEVEL5",
    category: "machines",
    subcategory: "LEVEL5",
    lines: 967,
    safety_class: "MEDIUM",
    description: "Haas CNC complete Level 5 profile with full CAD, kinematics, and limits",
    machine_tier: "LEVEL5",
  },
  "EXT-433": {
    filename: "PRISM_HAAS_NEW_MACHINES_LEVEL5.js",
    source_dir: "extracted/machines/LEVEL5",
    category: "machines",
    subcategory: "LEVEL5",
    lines: 1020,
    safety_class: "MEDIUM",
    description: "Haas CNC new machine Level 5 profiles with capabilities, kinematics, and limits",
    machine_tier: "LEVEL5",
  },
  // ── Root-level machine modules (4 files, 2,939 lines) ─────────────────
  "EXT-434": {
    filename: "PRISM_MACHINE_3D_MODELS.js",
    source_dir: "extracted/machines",
    category: "machines",
    subcategory: "root",
    lines: 140,
    safety_class: "MEDIUM",
    description: "Machine 3D model reference database with geometry definitions",
    machine_tier: "CORE",
  },
  "EXT-435": {
    filename: "PRISM_MACHINE_3D_MODEL_DATABASE_V3.js",
    source_dir: "extracted/machines",
    category: "machines",
    subcategory: "root",
    lines: 2295,
    safety_class: "MEDIUM",
    description: "Machine 3D model database V3 with parametric geometry and rendering data",
    machine_tier: "CORE",
  },
  "EXT-436": {
    filename: "PRISM_MACHINE_KINEMATICS_ENGINE.js",
    source_dir: "extracted/machines",
    category: "machines",
    subcategory: "root",
    lines: 380,
    safety_class: "MEDIUM",
    description: "Machine kinematics engine with joint chain definitions and motion limits",
    machine_tier: "CORE",
  },
  "EXT-437": {
    filename: "PRISM_MACHINE_SPEC_STANDARD.js",
    source_dir: "extracted/machines",
    category: "machines",
    subcategory: "root",
    lines: 124,
    safety_class: "MEDIUM",
    description: "Machine specification standard with normalization templates and validation rules",
    machine_tier: "CORE",
  },
};

// ============================================================================
// MACHINE REGISTRY CLASS
// ============================================================================

/** Machine Registry engine/manager.
 */
export class MachineRegistry extends BaseRegistry<Machine> {
  private indexByManufacturer: Map<string, Set<string>> = new Map();
  private indexByType: Map<string, Set<string>> = new Map();
  private indexByController: Map<string, Set<string>> = new Map();
  /** U-MACHDB-03: lazy cache of canonical NormalizedMachine, keyed by machine id. */
  private _normalizedCache: Map<string, NormalizedMachine> | null = null;

  constructor() {
    super(
      "MachineRegistry",
      path.join(PATHS.STATE_DIR, "machine_registry_cache.json"),
      "1.0.0"
    );
  }

  /**
   * Load machines from all layers
   */
  async load(): Promise<void> {
    if (this.loaded) return;
    
    log.info("Loading MachineRegistry...");
    
    // Load all layers in parallel — each layer contains distinct machines
    await Promise.all([
      this.loadLayer("BASIC", PATHS.MACHINES_BASIC),
      this.loadLayer("CORE", PATHS.MACHINES_CORE),
      this.loadLayer("ENHANCED", PATHS.MACHINES_ENHANCED),
      this.loadLayer("LEVEL5", PATHS.MACHINES_LEVEL5),
      this.loadLayer("ENHANCED", path.join(PATHS.DATA_DIR, "machines", "ENHANCED", "json")),
    ]);
    
    this.buildIndexes();
    
    // W5: Only mark loaded if we actually got data, or if no data files exist
    /** If.
     * @param this.entries.size - this.entries.size
     * @returns void
     */
    if (this.entries.size > 0) {
      this.loaded = true;
      log.info(`MachineRegistry loaded: ${this.entries.size} machines`);
    } else {
      log.warn(`MachineRegistry: 0 machines loaded — will retry on next call`);
    }
  }

  /**
   * Load a single layer
   */
  private async loadLayer(layer: string, basePath: string): Promise<void> {
    try {
      if (!await fileExists(basePath)) {
        log.debug(`Machine layer path does not exist: ${basePath}`);
        return;
      }

      const files = await listDirectory(basePath);
      const jsonFiles = files.filter(f => f.name.endsWith(".json"));

      // Read all JSON files in parallel, then merge sequentially
      const results = await Promise.all(jsonFiles.map(async (file) => {
        try {
          const data = await readJsonFile<any>(file.path);
          return { file, data };
        } catch (err) {
          log.warn(`Failed to load machine file ${file}: ${err}`);
          return { file, data: null };
        }
      }));

      /** For.
       * @param const - const
       * @param data - input data
       * @returns void
       */
      for (const { file, data } of results) {
        if (!data) continue;
        // R1-MS2: Handle multiple formats
        let machines: any[];
        if (Array.isArray(data)) {
          machines = data;
        } else if (data.machines && Array.isArray(data.machines)) {
          machines = data.machines;
        } else {
          machines = [data];
        }

        /** For.
         * @param let - let
         * @returns void
         */
        for (let i = 0; i < machines.length; i++) {
          const machine = machines[i];
          const rawId = machine.id || machine.machine_id;
          const hasValidId = rawId && rawId !== "unknown" && rawId.trim() !== "";
          const id = hasValidId ? rawId :
            (machine.manufacturer && machine.model
              ? `${machine.manufacturer}-${machine.model}`.replace(/[\s\/]+/g, '_').toUpperCase()
              : machine.name
                ? machine.name.replace(/[\s\/]+/g, '_').toUpperCase()
                : `${layer}-${path.basename(file.name, '.json')}-${i}`);
          const existing = this.get(id) as unknown as Record<string, unknown> | undefined;
          const normalizedMachine = { ...machine, id, layer };
          const mergedMachine = existing
            ? mergeMachineRegistryEntry(existing, normalizedMachine)
            : normalizedMachine;
          mergedMachine.id = id;
          mergedMachine.layer = layer;
          this.set(id, mergedMachine as Machine, layer);
        }
      }

      log.debug(`Loaded machines from ${layer} layer`);
    } catch (err) {
      log.warn(`Failed to load machine layer ${layer}: ${err}`);
    }
  }

  /**
   * Build search indexes
   */
  private buildIndexes(): void {
    this.indexByManufacturer.clear();
    this.indexByType.clear();
    this.indexByController.clear();
    
    /** For.
     * @param const - const
     * @param entry] - entry]
     * @returns void
     */
    for (const [id, entry] of this.entries) {
      const machine = entry.data;
      
      // Index by manufacturer
      /** If.
       * @param machine.manufacturer - machine.manufacturer
       * @returns void
       */
      if (machine.manufacturer && typeof machine.manufacturer === 'string') {
        const mfr = machine.manufacturer.toLowerCase();
        if (!this.indexByManufacturer.has(mfr)) {
          this.indexByManufacturer.set(mfr, new Set());
        }
        this.indexByManufacturer.get(mfr)?.add(id);
      }
      
      // Index by type
      /** If.
       * @param machine.type - machine.type
       * @returns void
       */
      if (machine.type && typeof machine.type === 'string') {
        const type = machine.type.toLowerCase();
        if (!this.indexByType.has(type)) {
          this.indexByType.set(type, new Set());
        }
        this.indexByType.get(type)?.add(id);
      }
      
      // Index by controller
      /** If.
       * @param machine.controller?.manufacturer - machine.controller?.manufacturer
       * @returns void
       */
      if (machine.controller?.manufacturer && typeof machine.controller.manufacturer === 'string') {
        const ctrl = machine.controller.manufacturer.toLowerCase();
        if (!this.indexByController.has(ctrl)) {
          this.indexByController.set(ctrl, new Set());
        }
        this.indexByController.get(ctrl)?.add(id);
      }
    }
  }

  /**
   * Get machine by ID
   */
  getMachine(id: string): Machine | undefined {
    return this.get(id);
  }

  /**
   * U-MACHDB-03: canonical NormalizedMachine for an id (read-time normalize, cached).
   * Collapses the heterogeneous stored shape (~100 key variants, 3 axis shapes -- see
   * machine-normalizer.ts) to ONE schema so consumers (sf_orchestrate, the SFC page) stop
   * dropping variant-keyed machines. Lazy + idempotent; the raw source records are untouched.
   */
  getNormalized(id: string): NormalizedMachine | undefined {
    const raw = this.get(id);
    if (!raw) return undefined;
    if (!this._normalizedCache) this._normalizedCache = new Map();
    const cached = this._normalizedCache.get(id);
    if (cached) return cached;
    const norm = normalizeMachine(raw as unknown as Record<string, unknown>);
    this._normalizedCache.set(id, norm);
    return norm;
  }

  /**
   * U-MACHDB-03: every machine in the canonical NormalizedMachine shape (cached after first call).
   * Call `load()` first. Reliable single-key access to the STRONG attributes (spindle rpm/power/
   * torque/taper, envelope, controller) for all 1015 machines.
   */
  getAllNormalized(): NormalizedMachine[] {
    if (!this._normalizedCache) this._normalizedCache = new Map();
    if (this._normalizedCache.size >= this.entries.size && this.entries.size > 0) {
      return [...this._normalizedCache.values()];
    }
    for (const entry of this.entries.values()) {
      const raw = (entry as { data?: Record<string, unknown> })?.data;
      if (!raw) continue;
      const id = (raw.id as string) || (raw.model as string) || (raw.name as string) || "unknown";
      if (!this._normalizedCache.has(id)) this._normalizedCache.set(id, normalizeMachine(raw));
    }
    return [...this._normalizedCache.values()];
  }

  /**
   * Get machine by ID or model name
   */
  getByIdOrModel(identifier: string): Machine | undefined {
    if (!identifier) return undefined;
    
    // Try direct ID lookup
    let machine = this.get(identifier);
    if (machine) return machine;
    
    // Try searching by model name
    const lower = identifier.toLowerCase();
    for (const entry of this.entries.values()) {
      const m = entry?.data;
      if (!m) continue;
      try {
        if (m.model && typeof m.model === 'string' && m.model.toLowerCase() === lower) return m;
        if (m.manufacturer && m.model && typeof m.manufacturer === 'string' && typeof m.model === 'string' &&
            `${m.manufacturer} ${m.model}`.toLowerCase() === lower) return m;
        if (m.name && typeof m.name === 'string' && m.name.toLowerCase() === lower) return m;
      } catch { continue; }
    }
    
    // Try partial match
    for (const entry of this.entries.values()) {
      const m = entry?.data;
      if (!m) continue;
      try {
        if (m.model && typeof m.model === 'string' && m.model.toLowerCase().includes(lower)) return m;
        if (m.name && typeof m.name === 'string' && m.name.toLowerCase().includes(lower)) return m;
      } catch { continue; }
    }
    
    return undefined;
  }

  /**
   * Get machine by manufacturer and model
   */
  getByModel(manufacturer: string, model: string): Machine | undefined {
    const mfrMachines = this.indexByManufacturer.get(manufacturer.toLowerCase());
    if (!mfrMachines) return undefined;
    
    /** For.
     * @param const - const
     * @returns void
     */
    for (const id of mfrMachines) {
      const machine = this.get(id);
      if (machine?.model?.toLowerCase() === model.toLowerCase()) {
        return machine;
      }
    }
    return undefined;
  }

  /**
   * Search machines with filters
   */
  search(options: {
    query?: string;
    manufacturer?: string;
    type?: string;
    controller?: string;
    min_x_travel?: number;
    min_y_travel?: number;
    min_z_travel?: number;
    min_spindle_rpm?: number;
    min_spindle_power?: number;
    min_tool_capacity?: number;
    simultaneous_axes?: number;
    high_speed?: boolean;
    limit?: number;
    offset?: number;
  }): { machines: Machine[]; total: number; hasMore?: boolean } {
    let results: Machine[] = [];
    
    // Start with manufacturer filter
    /** If.
     * @param options.manufacturer - options.manufacturer
     * @returns void
     */
    if (options.manufacturer) {
      const ids = this.indexByManufacturer.get(options.manufacturer.toLowerCase());
      /** If.
       * @param ids - ids
       * @returns void
       */
      if (ids) {
        results = Array.from(ids).map(id => this.get(id)!).filter(Boolean);
      }
    } else if (options.type) {
      const ids = this.indexByType.get(options.type.toLowerCase());
      /** If.
       * @param ids - ids
       * @returns void
       */
      if (ids) {
        results = Array.from(ids).map(id => this.get(id)!).filter(Boolean);
      }
    } else if (options.controller) {
      const ids = this.indexByController.get(options.controller.toLowerCase());
      /** If.
       * @param ids - ids
       * @returns void
       */
      if (ids) {
        results = Array.from(ids).map(id => this.get(id)!).filter(Boolean);
      }
    } else {
      results = this.all();
    }
    
    // Apply additional filters — treat "*" or empty as "return all"
    /** If.
     * @param options.query - options.query
     * @returns void
     */
    if (options.query && options.query !== "*") {
      const query = options.query.toLowerCase();
      results = results.filter(m => {
        try {
          return String(m.name || "").toLowerCase().includes(query) ||
            String(m.model || "").toLowerCase().includes(query) ||
            String(m.manufacturer || "").toLowerCase().includes(query);
        } catch { return false; }
      });
    }
    
    /** If.
     * @param options.min_x_travel - options.min_x_travel
     * @returns void
     */
    if (options.min_x_travel !== undefined) {
      results = results.filter(m => (m.envelope?.x_travel ?? 0) >= options.min_x_travel!);
    }

    /** If.
     * @param options.min_y_travel - options.min_y_travel
     * @returns void
     */
    if (options.min_y_travel !== undefined) {
      results = results.filter(m => (m.envelope?.y_travel ?? 0) >= options.min_y_travel!);
    }

    /** If.
     * @param options.min_z_travel - options.min_z_travel
     * @returns void
     */
    if (options.min_z_travel !== undefined) {
      results = results.filter(m => (m.envelope?.z_travel ?? 0) >= options.min_z_travel!);
    }

    /** If.
     * @param options.min_spindle_rpm - options.min_spindle_rpm
     * @returns void
     */
    if (options.min_spindle_rpm !== undefined) {
      results = results.filter(m => (m.spindle?.max_rpm ?? 0) >= options.min_spindle_rpm!);
    }

    /** If.
     * @param options.min_spindle_power - options.min_spindle_power
     * @returns void
     */
    if (options.min_spindle_power !== undefined) {
      results = results.filter(m => (m.spindle?.power_continuous ?? 0) >= options.min_spindle_power!);
    }

    /** If.
     * @param options.min_tool_capacity - options.min_tool_capacity
     * @returns void
     */
    if (options.min_tool_capacity !== undefined) {
      results = results.filter(m => (m.tool_changer?.capacity ?? 0) >= options.min_tool_capacity!);
    }
    
    /** If.
     * @param options.simultaneous_axes - options.simultaneous_axes
     * @returns void
     */
    if (options.simultaneous_axes !== undefined) {
      results = results.filter(m => m.simultaneous_axes >= options.simultaneous_axes!);
    }
    
    /** If.
     * @param options.high_speed - options.high_speed
     * @returns void
     */
    if (options.high_speed) {
      results = results.filter(m => m.high_speed_machining);
    }
    
    const total = results.length;
    
    // Pagination
    const offset = options.offset || 0;
    const limit = options.limit || 20;
    const paged = results.slice(offset, offset + limit);
    
    return { machines: paged, total, hasMore: offset + paged.length < total };
  }

  /**
   * Get machines by manufacturer
   */
  getByManufacturer(manufacturer: string): Machine[] {
    const ids = this.indexByManufacturer.get(manufacturer.toLowerCase());
    if (!ids) return [];
    return Array.from(ids).map(id => this.get(id)!).filter(Boolean);
  }

  /**
   * Get machines by type
   */
  getByType(type: string): Machine[] {
    const ids = this.indexByType.get(type.toLowerCase());
    if (!ids) return [];
    return Array.from(ids).map(id => this.get(id)!).filter(Boolean);
  }

  /**
   * Get machines by controller
   */
  getByController(controller: string): Machine[] {
    const ids = this.indexByController.get(controller.toLowerCase());
    if (!ids) return [];
    return Array.from(ids).map(id => this.get(id)!).filter(Boolean);
  }

  /**
   * Get capability matrix for a machine
   */
  getCapabilities(id: string): {
    machining_envelope: { x: number; y: number; z: number };
    spindle_capability: { rpm: number; power: number; torque: number };
    axis_count: number;
    simultaneous_axes: number;
    tool_capacity: number;
    features: string[];
  } | undefined {
    const machine = this.get(id);
    if (!machine) return undefined;
    
    const features: string[] = [];
    if (machine.high_speed_machining) features.push("high_speed_machining");
    if (machine.rigid_tapping) features.push("rigid_tapping");
    if (machine.probing_ready) features.push("probing_ready");
    if (machine.automation_ready) features.push("automation_ready");
    if (machine.spindle?.coolant_through) features.push("coolant_through_spindle");

    return {
      machining_envelope: {
        x: machine.envelope?.x_travel ?? 0,
        y: machine.envelope?.y_travel ?? 0,
        z: machine.envelope?.z_travel ?? 0
      },
      spindle_capability: {
        rpm: machine.spindle?.max_rpm ?? 0,
        power: machine.spindle?.power_continuous ?? 0,
        torque: machine.spindle?.torque_max ?? 0
      },
      axis_count: machine.axes?.length ?? 0,
      simultaneous_axes: machine.simultaneous_axes ?? 0,
      tool_capacity: machine.tool_changer?.capacity ?? 0,
      features
    };
  }

  /**
   * Find machines suitable for a job
   */
  findSuitableMachines(requirements: {
    min_envelope: { x?: number; y?: number; z?: number };
    min_spindle_rpm?: number;
    min_spindle_power?: number;
    simultaneous_axes?: number;
    controller_preference?: string[];
  }): Machine[] {
    return this.all().filter(m => {
      if (requirements.min_envelope.x != null && (m.envelope?.x_travel ?? 0) < requirements.min_envelope.x) return false;
      if (requirements.min_envelope.y != null && (m.envelope?.y_travel ?? 0) < requirements.min_envelope.y) return false;
      if (requirements.min_envelope.z != null && (m.envelope?.z_travel ?? 0) < requirements.min_envelope.z) return false;
      if (requirements.min_spindle_rpm != null && (m.spindle?.max_rpm ?? 0) < requirements.min_spindle_rpm) return false;
      if (requirements.min_spindle_power != null && (m.spindle?.power_continuous ?? 0) < requirements.min_spindle_power) return false;
      if (requirements.simultaneous_axes != null && (m.simultaneous_axes ?? 0) < requirements.simultaneous_axes) return false;
      /** If.
       * @param requirements.controller_preference?.length - requirements.controller_preference?.length
       * @returns void
       */
      if (requirements.controller_preference?.length) {
        const ctrl = (m.controller?.manufacturer ?? '').toLowerCase();
        if (!requirements.controller_preference.some(p => ctrl.includes(p.toLowerCase()))) return false;
      }
      return true;
    });
  }

  /**
   * Static accessor: return the full source-file catalog without instantiation.
   * Useful for MCP tools that need to enumerate available machine source files
   * before the registry is loaded.
   */
  static getSourceFileCatalog(): Record<string, MachineSourceFileEntry> {
    return MACHINE_SOURCE_FILE_CATALOG;
  }

  /**
   * Instance method: return catalog entries grouped by machine_tier with summary stats.
   * Provides a structured overview of the 60 wired machine source files.
   */
  catalogSourceFiles(): {
    total_files: number;
    total_lines: number;
    by_tier: Record<MachineTier, {
      count: number;
      lines: number;
      files: Array<{ id: string; filename: string; description: string }>;
    }>;
  } {
    const tiers: MachineTier[] = ["CORE", "ENHANCED", "LEVEL5", "ENGINE"];
    const by_tier = {} as Record<MachineTier, {
      count: number;
      lines: number;
      files: Array<{ id: string; filename: string; description: string }>;
    }>;

    /** For.
     * @param const - const
     * @returns void
     */
    for (const tier of tiers) {
      by_tier[tier] = { count: 0, lines: 0, files: [] };
    }

    let total_files = 0;
    let total_lines = 0;

    for (const [id, entry] of Object.entries(MACHINE_SOURCE_FILE_CATALOG)) {
      const tier = entry.machine_tier;
      by_tier[tier].count++;
      by_tier[tier].lines += entry.lines;
      by_tier[tier].files.push({
        id,
        filename: entry.filename,
        description: entry.description,
      });
      total_files++;
      total_lines += entry.lines;
    }

    return { total_files, total_lines, by_tier };
  }

  // ========================================================================
  // FRF DATA LOOKUP (INTEG-MS4 U-INTEG19, U-INTEG20)
  // ========================================================================

  /**
   * Default FRF values by machine class for fallback when no measured data exists.
   * Values are conservative estimates based on typical machine dynamics literature.
   *
   * Sources:
   * - Altintas, Y. "Manufacturing Automation" (2012)
   * - Schmitz & Smith "Machining Dynamics" (2019)
   * - Typical tap test data from production VMCs and lathes
   */
  private static readonly FRF_DEFAULTS: Record<string, FRFData> = {
    // VMC (Vertical Machining Center) — moderate stiffness, higher damping
    vmc: {
      natural_frequency_hz: 800,
      damping_ratio: 0.03,
      stiffness_n_um: 25,  // 25 N/µm typical for mid-size VMC
      source: "estimated",
      direction: "combined",
    },
    // HMC (Horizontal Machining Center) — higher stiffness than VMC
    hmc: {
      natural_frequency_hz: 900,
      damping_ratio: 0.025,
      stiffness_n_um: 35,
      source: "estimated",
      direction: "combined",
    },
    // Lathe — high stiffness in cutting direction
    lathe: {
      natural_frequency_hz: 600,
      damping_ratio: 0.04,
      stiffness_n_um: 50,  // Lathes typically stiffer in radial direction
      source: "estimated",
      direction: "X",
    },
    // 5-axis — lower stiffness due to kinematic chain complexity
    "5-axis": {
      natural_frequency_hz: 650,
      damping_ratio: 0.035,
      stiffness_n_um: 18,  // More compliance from rotary axes
      source: "estimated",
      direction: "combined",
    },
    // Mill-turn — balanced between lathe and mill characteristics
    "mill-turn": {
      natural_frequency_hz: 700,
      damping_ratio: 0.035,
      stiffness_n_um: 40,
      source: "estimated",
      direction: "combined",
    },
    // EDM (Wire/Sinker) — very high precision, different dynamics
    edm: {
      natural_frequency_hz: 1200,
      damping_ratio: 0.02,
      stiffness_n_um: 100,  // High stiffness for precision
      source: "estimated",
      direction: "combined",
    },
    // Grinder — high speed spindle, different frequency range
    grinder: {
      natural_frequency_hz: 1500,
      damping_ratio: 0.015,
      stiffness_n_um: 60,
      source: "estimated",
      direction: "combined",
    },
    // Default fallback for unknown machine types
    default: {
      natural_frequency_hz: 700,
      damping_ratio: 0.03,
      stiffness_n_um: 20,  // Conservative estimate
      source: "estimated",
      direction: "combined",
    },
  };

  /**
   * Get FRF (Frequency Response Function) data for a machine.
   *
   * INTEG-MS4 U-INTEG19: ChatterStabilityLobeEngine queries this at init.
   * INTEG-MS4 U-INTEG20: Returns conservative defaults by machine class if no measured data.
   *
   * @param machine_id - Machine ID or model name
   * @returns FRF data (measured if available, defaults by class otherwise)
   */
  getFRF(machine_id: string): FRFData & { is_default: boolean; machine_class: string } {
    const machine = this.getByIdOrModel(machine_id);

    if (machine?.frf_data) {
      // Machine has measured/configured FRF data
      return {
        ...machine.frf_data,
        is_default: false,
        machine_class: this.inferMachineClass(machine),
      };
    }

    // No measured data — use fallback defaults by machine class
    const machineClass = machine ? this.inferMachineClass(machine) : "default";
    const defaults = MachineRegistry.FRF_DEFAULTS[machineClass]
      || MachineRegistry.FRF_DEFAULTS.default;

    return {
      ...defaults,
      is_default: true,
      machine_class: machineClass,
    };
  }

  /**
   * Infer machine class from machine type/name for FRF fallback selection.
   */
  private inferMachineClass(machine: Machine): string {
    const type = (machine.type || "").toLowerCase();
    const name = (machine.name || "").toLowerCase();
    const model = (machine.model || "").toLowerCase();
    const combined = `${type} ${name} ${model}`;

    // Check for specific machine types
    if (type.includes("lathe") || type.includes("turning") || combined.includes("lathe")) {
      return "lathe";
    }
    if (type.includes("5-axis") || type.includes("5axis") || combined.includes("5-axis") || combined.includes("5axis")) {
      return "5-axis";
    }
    if (type.includes("mill-turn") || type.includes("millturn") || combined.includes("mill-turn")) {
      return "mill-turn";
    }
    if (type.includes("hmc") || combined.includes("horizontal machining") || combined.includes("horizontal center")) {
      return "hmc";
    }
    if (type.includes("edm") || combined.includes("edm") || combined.includes("electrical discharge")) {
      return "edm";
    }
    if (type.includes("grind") || combined.includes("grind")) {
      return "grinder";
    }
    if (type.includes("vmc") || combined.includes("vertical machining") || combined.includes("vertical center") || type.includes("mill")) {
      return "vmc";
    }

    return "default";
  }

  /**
   * Get all machines with measured FRF data (not defaults).
   * Useful for calibration tracking.
   */
  getMachinesWithFRF(): Array<{ id: string; machine: Machine; frf: FRFData }> {
    const result: Array<{ id: string; machine: Machine; frf: FRFData }> = [];

    for (const [id, entry] of this.entries) {
      const machine = entry.data;
      if (machine.frf_data) {
        result.push({
          id,
          machine,
          frf: machine.frf_data,
        });
      }
    }

    return result;
  }

  /**
   * Update FRF data for a machine (after tap test or FRF measurement).
   */
  updateFRF(machine_id: string, frf: FRFData): boolean {
    const machine = this.get(machine_id);
    if (!machine) {
      log.warn(`[MachineRegistry] Cannot update FRF: machine ${machine_id} not found`);
      return false;
    }

    machine.frf_data = {
      ...frf,
      measured_date: frf.measured_date || new Date().toISOString(),
    };

    this.set(machine_id, machine, machine.layer);
    log.info(`[MachineRegistry] Updated FRF for ${machine_id}: f_n=${frf.natural_frequency_hz}Hz, ζ=${frf.damping_ratio}, k=${frf.stiffness_n_um}N/µm`);

    return true;
  }

  /**
   * Get FRF defaults table (for UI display / documentation).
   */
  getFRFDefaults(): Record<string, FRFData> {
    return { ...MachineRegistry.FRF_DEFAULTS };
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    byManufacturer: Record<string, number>;
    byType: Record<string, number>;
    byController: Record<string, number>;
    withLevel5: number;
  } {
    const stats = {
      total: this.entries.size,
      byManufacturer: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      byController: {} as Record<string, number>,
      withLevel5: 0
    };
    
    /** For.
     * @param const - const
     * @param ids] - ids]
     * @returns void
     */
    for (const [mfr, ids] of this.indexByManufacturer) {
      stats.byManufacturer[mfr] = ids.size;
    }
    
    /** For.
     * @param const - const
     * @param ids] - ids]
     * @returns void
     */
    for (const [type, ids] of this.indexByType) {
      stats.byType[type] = ids.size;
    }
    
    /** For.
     * @param const - const
     * @param ids] - ids]
     * @returns void
     */
    for (const [ctrl, ids] of this.indexByController) {
      stats.byController[ctrl] = ids.size;
    }
    
    for (const machine of this.all()) {
      if (machine.layer === "LEVEL5") stats.withLevel5++;
    }
    
    return stats;
  }
}

// Singleton instance
/** Machine Registry constant.
 */
export const machineRegistry = new MachineRegistry();
