/**
 * MCAT-MS0 U-MCAT02: Canonical Machine Package Types
 *
 * Unifies the 3 colliding machine models into one canonical type:
 * 1. Machine (types.ts) — rich structured interface
 * 2. MachineCapabilitySnapshot (userMachineProfile.ts) — user-facing profile
 * 3. Enriched corpus JSON (ad-hoc per-manufacturer schemas)
 *
 * CanonicalMachinePackage wraps Machine with provenance, confidence,
 * ambiguity tracking, and allowed-option matrices.
 */

import type {
  Machine,
  MachineController,
  MachineSpindle,
  MachineCoolant,
  MachineEnvelope,
  MachineAxes,
  MachineToolChanger,
  MachineKinematics,
} from '../types.js';

import type { MachineType, MachineLayer } from '../constants.js';

import type {
  MachineAxisTopology,
  MachineOptionSource,
  ControllerPackage,
  SpindlePackageOption,
  CoolantStrategyOption,
  MachineCapabilitySnapshot,
  UserMachineProfileOverlay,
} from '../contracts/userMachineProfile.js';

// ============================================================================
// CANONICAL MACHINE TYPE TAXONOMY
// ============================================================================

/**
 * Normalized machine type enum. All 81 observed type strings in the enriched
 * corpus must map to one of these 16 canonical values.
 */
export type CanonicalMachineType =
  | 'VMC'             // Vertical machining center (3-axis)
  | 'HMC'             // Horizontal machining center
  | '5AXIS'           // 5-axis simultaneous (trunnion, gantry, swivel head)
  | 'LATHE'           // 2-axis turning center
  | 'MILL_TURN'       // Mill-turn / multitasking
  | 'SWISS'           // Swiss-type automatic lathe
  | 'VTL'             // Vertical turret lathe
  | 'GRINDER'         // Surface/cylindrical/centerless grinder
  | 'EDM_WIRE'        // Wire EDM
  | 'EDM_SINKER'      // Sinker/die-sinking EDM
  | 'LASER'           // Laser cutting/marking
  | 'WATERJET'        // Abrasive/pure waterjet
  | 'ROUTER'          // CNC router
  | 'BORING_MILL'     // Horizontal boring mill / floor borer
  | 'DRILL_TAP'       // High-speed drill/tap center
  | 'OTHER';          // Unclassified (target: <5% of corpus)

// ============================================================================
// DATA PROVENANCE & CONFIDENCE
// ============================================================================

/**
 * Tracks the origin and reliability of each data field in a machine package.
 */
export interface MachineFieldProvenance {
  /** Which data source contributed this value */
  source: MachineOptionSource | 'enriched_corpus' | 'manufacturer_spec' | 'handbook' | 'measured';
  /** Data layer the value came from */
  layer: MachineLayer | 'LEVEL5' | 'USER';
  /** ISO 8601 timestamp of when this value was recorded/enriched */
  enriched_at: string;
  /** Confidence in this value's accuracy (0.0 = unknown, 1.0 = manufacturer-verified) */
  confidence: number;
  /** Optional notes about how this value was derived */
  notes?: string;
}

/**
 * Aggregated confidence scores broken down by subsystem.
 * Used by safety hooks to gate calculator access.
 */
export interface MachineConfidenceBreakdown {
  /** Controller manufacturer + model + capabilities */
  controller: number;
  /** Spindle RPM, power, torque, taper */
  spindle: number;
  /** Through-spindle coolant, pressure, tank */
  coolant: number;
  /** Work envelope (X/Y/Z travel, table load) */
  envelope: number;
  /** Axis specs (rapids, accuracy, repeatability) */
  axes: number;
  /** Tool changer capacity and timing */
  tool_changer: number;
  /** Weighted overall score (0.0-1.0) */
  overall: number;
}

/**
 * A single unresolved ambiguity in the machine data.
 * Feeds the ambiguity backlog for manual audit/remediation.
 */
export interface MachineAmbiguity {
  /** Unique ID for this ambiguity */
  id: string;
  /** Which field or subsystem has the ambiguity */
  field_path: string;
  /** What the current value is (may be incorrect) */
  current_value: unknown;
  /** What alternative values are possible */
  alternatives?: unknown[];
  /** Severity: 'blocker' prevents calculator use, 'warning' shows UI notice */
  severity: 'blocker' | 'warning' | 'info';
  /** Human-readable description */
  description: string;
  /** When this ambiguity was detected */
  detected_at: string;
  /** Who/what detected it */
  detected_by: string;
  /** Resolution status */
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  resolved_value?: unknown;
}

/**
 * Records the enrichment history for a machine package.
 * Each entry represents one pass of data enrichment/backfill.
 */
export interface MachineEnrichmentRecord {
  /** What action was taken */
  action: 'initial_load' | 'layer_merge' | 'backfill' | 'manual_audit' | 'shop_override' | 'inference';
  /** Which layer or source provided the data */
  source: string;
  /** When this enrichment occurred */
  timestamp: string;
  /** How many fields were added or updated */
  fields_changed: number;
  /** Optional description */
  description?: string;
}

// ============================================================================
// ALLOWED-OPTION MATRIX
// ============================================================================

/**
 * Defines which controller/spindle/coolant combinations are legal for a machine.
 * Prevents impossible configurations from rendering in the calculator UI.
 */
export interface MachineAllowedOption {
  /** Controller ID (e.g., 'fanuc-31i-b5', 'osp-p300ma-h') */
  controller_id: string;
  /** Spindle package IDs compatible with this controller */
  compatible_spindle_ids: string[];
  /** Coolant strategy IDs compatible with this controller+machine */
  compatible_coolant_ids: string[];
  /** Optional geometry restrictions for this configuration */
  restrictions?: {
    min_table_load_kg?: number;
    max_part_diameter_mm?: number;
    requires_option?: string[];
  };
}

// ============================================================================
// CANONICAL MACHINE PACKAGE
// ============================================================================

/**
 * The single canonical machine package model used by ALL PRISM consumers:
 * - Calculator machine-selection module
 * - Print to CNC / Program Release
 * - Quoting and feasibility analysis
 * - What-if and process planning
 * - Scheduling and machine-suitability filters
 * - PRISM mode auto-recommendations
 *
 * This replaces the fragmented Machine/MachineCapabilitySnapshot/enriched-JSON
 * models with one unified, validated, provenance-tracked type.
 */
export interface CanonicalMachinePackage {
  // === Identity ===
  /** Canonical machine ID (deduplicated, normalized) */
  canonical_id: string;
  /** Source record IDs that were merged to create this package */
  source_record_ids: string[];
  /** Package version (incremented on each enrichment) */
  version: number;

  // === Core Machine Data (from types.ts Machine) ===
  /** Normalized manufacturer name */
  manufacturer: string;
  /** Manufacturer ID (lowercase, hyphenated) */
  manufacturer_id: string;
  /** Model designation */
  model: string;
  /** Series/family grouping */
  series?: string;
  /** Raw type from source data */
  raw_type: string;
  /** Normalized canonical type */
  canonical_type: CanonicalMachineType;
  /** Machine axis topology for UI/profile consumers */
  topology: MachineAxisTopology;

  // === Subsystems ===
  controller: MachineController;
  spindle: MachineSpindle;
  envelope: MachineEnvelope;
  axes?: MachineAxes;
  tool_changer?: MachineToolChanger;
  coolant?: MachineCoolant;
  kinematics?: MachineKinematics;

  // === Package Configuration (from userMachineProfile.ts) ===
  /** Legal controller packages (controller + spindle + coolant combos) */
  controller_packages: ControllerPackage[];
  /** Available spindle options */
  spindle_packages: SpindlePackageOption[];
  /** Available coolant strategies */
  coolant_strategies: CoolantStrategyOption[];
  /** Allowed-option matrix: which combinations are legal */
  allowed_options: MachineAllowedOption[];

  // === Data Quality ===
  /** Per-subsystem confidence scores */
  confidence: MachineConfidenceBreakdown;
  /** Per-field provenance tracking */
  provenance: Record<string, MachineFieldProvenance>;
  /** Unresolved ambiguities */
  ambiguities: MachineAmbiguity[];
  /** Enrichment history */
  enrichment_history: MachineEnrichmentRecord[];

  // === Metadata ===
  /** Which data layer this package was primarily sourced from */
  primary_layer: MachineLayer | 'LEVEL5';
  /** When this package was last generated/updated */
  generated_at: string;
  /** When this package was last validated */
  validated_at?: string;
}

// ============================================================================
// PACKAGE GENERATION INPUT/OUTPUT
// ============================================================================

/**
 * Input for generating a canonical machine package from registry data.
 */
export interface GenerateMachinePackageInput {
  /** Machine ID to look up in registry */
  machine_id: string;
  /** Optional overrides to apply on top of registry data */
  overrides?: Partial<CanonicalMachinePackage>;
  /** Whether to infer missing fields from manufacturer defaults */
  infer_missing?: boolean;
  /** Minimum confidence threshold for inclusion (0.0-1.0) */
  min_confidence?: number;
}

/**
 * Result of generating a canonical machine package.
 */
export interface GenerateMachinePackageResult {
  /** The generated package */
  package: CanonicalMachinePackage;
  /** Whether this was freshly generated or served from cache */
  cached: boolean;
  /** Warnings produced during generation */
  warnings: string[];
  /** Whether the package meets minimum completeness for calculator use */
  calculator_ready: boolean;
  /** Overall data quality score (0.0-1.0) */
  quality_score: number;
}

/**
 * Result of validating a canonical machine package.
 */
export interface ValidateMachinePackageResult {
  /** Whether the package is valid */
  valid: boolean;
  /** Validation errors (blocking) */
  errors: string[];
  /** Validation warnings (advisory) */
  warnings: string[];
  /** Physics consistency check results */
  physics_checks: {
    /** power ≈ torque × rpm / 9549 (within 5%) */
    power_torque_consistent: boolean;
    /** RPM > 0 for spindle-equipped machines */
    spindle_rpm_valid: boolean;
    /** Envelope dimensions are physically plausible */
    envelope_plausible: boolean;
  };
  /** Per-subsystem completeness */
  completeness: MachineConfidenceBreakdown;
}

// ============================================================================
// BRIDGE: Machine → CanonicalMachinePackage
// ============================================================================

/**
 * Creates a minimal CanonicalMachinePackage from a types.ts Machine.
 * Used as a bridge during migration from the old Machine type.
 */
export function machineToPackageSkeleton(machine: Machine): Partial<CanonicalMachinePackage> {
  return {
    canonical_id: `${machine.manufacturer.toLowerCase().replace(/\s+/g, '-')}-${machine.model.toLowerCase().replace(/\s+/g, '-')}`,
    source_record_ids: [machine.id],
    version: 1,
    manufacturer: machine.manufacturer,
    manufacturer_id: machine.manufacturer.toLowerCase().replace(/\s+/g, '-'),
    model: machine.model,
    series: machine.series,
    raw_type: machine.type,
    canonical_type: 'OTHER',  // Must be normalized by MachineTaxonomyNormalizer
    topology: 'other',        // Must be normalized
    controller: machine.controller,
    spindle: machine.spindle,
    envelope: machine.envelope,
    axes: machine.axes,
    tool_changer: machine.tool_changer,
    coolant: machine.coolant,
    kinematics: machine.kinematics,
    controller_packages: [],
    spindle_packages: [],
    coolant_strategies: [],
    allowed_options: [],
    confidence: {
      controller: 0,
      spindle: 0,
      coolant: 0,
      envelope: 0,
      axes: 0,
      tool_changer: 0,
      overall: 0,
    },
    provenance: {},
    ambiguities: [],
    enrichment_history: [{
      action: 'initial_load',
      source: machine.metadata?.layer ?? 'unknown',
      timestamp: new Date().toISOString(),
      fields_changed: 0,
      description: 'Initial bridge from types.ts Machine',
    }],
    primary_layer: (machine.metadata?.layer as MachineLayer) ?? 'BASIC',
    generated_at: new Date().toISOString(),
  };
}
