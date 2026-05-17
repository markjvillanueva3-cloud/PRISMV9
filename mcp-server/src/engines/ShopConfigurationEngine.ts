/**
 * ShopConfigurationEngine — Centralized Shop Rate & Machine Configuration
 *
 * Every shop has different rates. A garage shop in Ohio runs $65/hr machine;
 * an aerospace job shop in Connecticut runs $225/hr for 5-axis. This engine
 * replaces hardcoded rates across all costing/quoting engines with a single
 * configurable shop profile.
 *
 * Consumers: ERPIntegrationEngine, JobCostingEngine, CapacityPlanningEngine,
 * QuoteEstimatorEngine, ShopSchedulerEngine, ActualCostEngine.
 *
 * Session 5-2 (U-CONF1)
 * @module ShopConfigurationEngine
 */

import { persistenceBridge } from "../db/PersistenceBridge.js";
import {
  JM_DIE_COMPANY,
  JM_DIE_CONTROLLER_MAP,
  JM_DIE_DEVELOPMENT_SEEDS,
  JM_DIE_SOURCE_ROOTS,
  // Canonical name was renamed to JMDieDevelopmentSeed; keep the prior local
  // alias so downstream `ShopSeedDomain` retains its public shape.
  type JMDieDevelopmentSeed as DevelopmentSeedDomain,
} from "../data/jm-die-profile.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ShopRates {
  labor_per_hr: number;
  overhead_per_hr: number;
  admin_per_hr: number;
  setup_per_hr: number;
  programming_per_hr: number;
  inspection_per_hr: number;
}

export interface ShopMachine {
  id: string;
  name: string;
  type: string;
  hourly_rate: number;
  efficiency_factor: number;
  capabilities: string[];
  hours_per_shift: number;
  shifts_per_day: number;
  days_per_week: number;
  // Lathe-specific fields (LATHE-UNIFIED M5)
  controller?: "fanuc" | "haas" | "okuma" | "mazak" | "siemens" | "dmg_mori" | "citizen" | "star" | "hurco" | "mitsubishi";
  max_rpm?: number;
  max_power_kw?: number;
  max_torque_nm?: number;
  work_envelope?: { x_mm: number; z_mm: number };
  bar_capacity_mm?: number;
  has_bar_feeder?: boolean;
  has_sub_spindle?: boolean;
  has_live_tooling?: boolean;
  turret_stations?: number;
  coolant_types?: string[];
  // Wire EDM-specific fields (WEDM-UNIFIED M4)
  wedm_uv_travel_mm?: number;
  wedm_max_taper_deg?: number;
  wedm_max_workpiece_height_mm?: number;
  wedm_auto_threading?: boolean;
  wedm_submerged_cutting?: boolean;
  wedm_brand?: "sodick" | "mitsubishi" | "makino" | "agiecharmilles" | "fanuc" | "other";
  wedm_wire_inventory?: Array<{
    wire_type: string;
    diameter_mm: number;
    spool_weight_kg: number;
    remaining_pct: number;
  }>;
  // Magazine state (per-machine tool assignment)
  magazine?: Array<{
    station: number;
    tool_id?: string;
    insert_type?: string;
    holder?: string;
    remaining_life_min?: number;
    edges_used?: number;
    total_edges?: number;
  }>;
}

export interface ShopCompanyProfile {
  legal_name: string;
  short_code: string;
  domain: string;
  industry: string;
  specialization: string;
  region: string;
  timezone: string;
  file_archive_path: string;
  canonical_test_shop: boolean;
  development_role: string;
  cad_systems: string[];
  cam_systems: string[];
}

export interface ShopSourceRoots {
  company_root: string;
  programs_root: string;
  employee_database_root: string;
  machines_root: string;
  controllers_root: string;
  tool_holders_root: string;
  tooling_root: string;
  materials_root: string;
  prints_root: string;
}

export type ShopSeedDomain = DevelopmentSeedDomain;

export interface ShopMachineControllerRegistryEntry {
  machine_id: string;
  machine_name: string;
  machine_type: string;
  controller_family: string;
  controller_model: string;
  shop_controller: string | null;
  post_processor?: string;
  machine_rate_per_hour: number;
  canonical_test_machine: boolean;
  program_release_ready: boolean;
  machine_source_root: string;
  controller_source_root: string;
}

export interface ShopMachineSeedSummary {
  shop_id: string;
  machine_count: number;
  mapped_controller_count: number;
  unmapped_machine_count: number;
  program_release_ready_machine_count: number;
  machine_source_root: string;
  controller_source_root: string;
}

export interface ShopProfile {
  id: string;
  name: string;
  rates: ShopRates;
  machines: ShopMachine[];
  overhead_pct: number;
  material_markup_pct: number;
  tooling_cost_per_op: number;
  material_cost_per_part_default: number;
  admin_burden_pct: number;
  company_profile: ShopCompanyProfile;
  source_roots: ShopSourceRoots;
  seed_domains: ShopSeedDomain[];
  created_at: string;
  updated_at: string;
}

// ============================================================================
// DEFAULTS — sourced from current hardcoded values across engines
// ============================================================================

/**
 * Default rates — JM Die Company (canonical test shop).
 * Cold heading die & tooling shop, fastener industry.
 * Rates reflect Midwest tool & die shop pricing.
 */
const DEFAULT_RATES: ShopRates = {
  labor_per_hr: 55.00,         // JM Die — skilled tool & die labor
  overhead_per_hr: 30.00,      // JM Die — small shop overhead
  admin_per_hr: 15.00,         // JM Die — admin burden
  setup_per_hr: 65.00,         // JM Die — die setup is precision work
  programming_per_hr: 85.00,   // JM Die — Mastercam + Mazak conversational
  inspection_per_hr: 55.00,    // JM Die — inspection/QC
};

/**
 * Default machines — JM Die Company (canonical test shop).
 * 21 machines: 7 Okuma lathes, 5 mills, 2 sinker EDMs, 1 wire EDM,
 * plus 6 support machines. All data from actual shop floor equipment.
 * Source: HANDOFF-2026-04-10.md machine inventory + Box Drive audit.
 */
/** Canonical JM Die company metadata for app + MCP development. */
const DEFAULT_COMPANY_PROFILE: ShopCompanyProfile = {
  legal_name: JM_DIE_COMPANY.name,
  short_code: "JM-DIE",
  // JM_DIE_COMPANY has no explicit `domain` field; use `industry` as the
  // semantic equivalent (matches the ShopCompanyProfile.domain contract).
  domain: JM_DIE_COMPANY.industry,
  industry: "Fastener tooling",
  specialization:
    "Cold heading dies, punches, sinker EDM electrodes, wire EDM tooling, and precision turning/milling.",
  region: "Midwest US",
  timezone: JM_DIE_COMPANY.location.timezone,
  file_archive_path: JM_DIE_COMPANY.file_archive_path,
  canonical_test_shop: true,
  development_role: "Primary PRISM app and MCP server development/test shop.",
  cad_systems: [...JM_DIE_COMPANY.cad_systems],
  cam_systems: [...JM_DIE_COMPANY.cam_systems],
};

const DEFAULT_SOURCE_ROOTS: ShopSourceRoots = {
  ...JM_DIE_SOURCE_ROOTS,
  // ShopSourceRoots requires `company_root` + `machines_root` which JM_DIE_SOURCE_ROOTS
  // does not export; derive them from JM_DIE_COMPANY.file_archive_path to keep
  // every root anchored to the same canonical shop tree.
  company_root: JM_DIE_COMPANY.file_archive_path,
  machines_root: `${JM_DIE_COMPANY.file_archive_path}\\MACHINES`,
};

const DEFAULT_SEED_DOMAINS: ShopSeedDomain[] = JM_DIE_DEVELOPMENT_SEEDS.map((domain) => ({ ...domain }));

const PROGRAM_RELEASE_MACHINE_TYPES = new Set(["Lathe", "Swiss Lathe", "VMC", "5-axis", "HMC", "Mill-Turn"]);

function isProgramReleaseReadyMachine(machine: ShopMachine): boolean {
  if (PROGRAM_RELEASE_MACHINE_TYPES.has(machine.type)) {
    return true;
  }

  const capabilities = machine.capabilities.map((capability) => capability.toLowerCase());
  return capabilities.some((capability) =>
    [
      "turning",
      "milling",
      "drilling",
      "boring",
      "c_axis",
      "y_axis",
      "live_tooling",
      "multi_tasking",
    ].includes(capability),
  );
}

/**
 * Default machine roster â€” JM Die Company (canonical test shop).
 * 21 machines: 7 Okuma lathes, 5 mills, 2 sinker EDMs, 1 wire EDM,
 * plus 6 support machines. All data from actual shop floor equipment.
 */
const DEFAULT_MACHINES: ShopMachine[] = [
  // ── OKUMA LATHES (7) ─────────────────────────────────────────────────────
  {
    id: "LTH-01", name: "Okuma GENOS L300-M", type: "Lathe",
    hourly_rate: 85.00, efficiency_factor: 0.85,
    capabilities: ["turning", "facing", "threading", "boring", "grooving", "parting", "tapping", "live_tooling", "c_axis"],
    hours_per_shift: 10, shifts_per_day: 1, days_per_week: 5,
    controller: "okuma", max_rpm: 5000, max_power_kw: 15, max_torque_nm: 350,
    work_envelope: { x_mm: 260, z_mm: 550 },
    bar_capacity_mm: 65, has_bar_feeder: false, has_sub_spindle: false,
    has_live_tooling: true, turret_stations: 12,
    coolant_types: ["flood", "mist"],
  },
  {
    id: "LTH-02", name: "Okuma GENOS L200E-M", type: "Lathe",
    hourly_rate: 80.00, efficiency_factor: 0.85,
    capabilities: ["turning", "facing", "threading", "boring", "grooving", "parting", "live_tooling"],
    hours_per_shift: 10, shifts_per_day: 1, days_per_week: 5,
    controller: "okuma", max_rpm: 5000, max_power_kw: 11, max_torque_nm: 280,
    work_envelope: { x_mm: 200, z_mm: 350 },
    bar_capacity_mm: 51, has_bar_feeder: false, has_sub_spindle: false,
    has_live_tooling: true, turret_stations: 12,
    coolant_types: ["flood"],
  },
  {
    id: "LTH-03", name: "Okuma LNC8", type: "Lathe",
    hourly_rate: 65.00, efficiency_factor: 0.80,
    capabilities: ["turning", "facing", "threading", "boring", "grooving", "parting"],
    hours_per_shift: 10, shifts_per_day: 1, days_per_week: 5,
    controller: "okuma", max_rpm: 4000, max_power_kw: 11, max_torque_nm: 300,
    work_envelope: { x_mm: 200, z_mm: 500 },
    bar_capacity_mm: 51, has_bar_feeder: false, has_sub_spindle: false,
    has_live_tooling: false, turret_stations: 12,
    coolant_types: ["flood"],
  },
  {
    id: "LTH-04", name: "Okuma Crown L1060", type: "Lathe",
    hourly_rate: 65.00, efficiency_factor: 0.80,
    capabilities: ["turning", "facing", "threading", "boring", "grooving", "parting"],
    hours_per_shift: 10, shifts_per_day: 1, days_per_week: 5,
    controller: "okuma", max_rpm: 3800, max_power_kw: 11, max_torque_nm: 280,
    work_envelope: { x_mm: 200, z_mm: 500 },
    bar_capacity_mm: 51, has_bar_feeder: false, has_sub_spindle: false,
    has_live_tooling: false, turret_stations: 8,
    coolant_types: ["flood"],
  },
  {
    id: "LTH-05", name: "Okuma GENOS L400II-E", type: "Lathe",
    hourly_rate: 90.00, efficiency_factor: 0.85,
    capabilities: ["turning", "facing", "threading", "boring", "grooving", "parting", "heavy_turning"],
    hours_per_shift: 10, shifts_per_day: 1, days_per_week: 5,
    controller: "okuma", max_rpm: 3800, max_power_kw: 22, max_torque_nm: 560,
    work_envelope: { x_mm: 340, z_mm: 600 },
    bar_capacity_mm: 80, has_bar_feeder: false, has_sub_spindle: false,
    has_live_tooling: false, turret_stations: 12,
    coolant_types: ["flood", "mist"],
  },
  {
    id: "LTH-06", name: "Okuma LB 3000EX Big Bore", type: "Lathe",
    hourly_rate: 95.00, efficiency_factor: 0.85,
    capabilities: ["turning", "facing", "threading", "boring", "grooving", "parting", "big_bore", "heavy_turning"],
    hours_per_shift: 10, shifts_per_day: 1, days_per_week: 5,
    controller: "okuma", max_rpm: 3800, max_power_kw: 22, max_torque_nm: 700,
    work_envelope: { x_mm: 320, z_mm: 600 },
    bar_capacity_mm: 102, has_bar_feeder: false, has_sub_spindle: false,
    has_live_tooling: false, turret_stations: 12,
    coolant_types: ["flood", "high_pressure"],
  },
  {
    id: "LTH-07", name: "Okuma Multus B250II", type: "Lathe",
    hourly_rate: 125.00, efficiency_factor: 0.82,
    capabilities: ["turning", "milling", "drilling", "threading", "boring", "c_axis", "y_axis", "b_axis", "live_tooling", "multi_tasking"],
    hours_per_shift: 10, shifts_per_day: 1, days_per_week: 5,
    controller: "okuma", max_rpm: 5000, max_power_kw: 22, max_torque_nm: 600,
    work_envelope: { x_mm: 320, z_mm: 900 },
    bar_capacity_mm: 80, has_bar_feeder: false, has_sub_spindle: true,
    has_live_tooling: true, turret_stations: 20,
    coolant_types: ["flood", "mist", "high_pressure"],
  },
  // ── MILLS (5) ─────────────────────────────────────────────────────────────
  {
    id: "VMC-01", name: "Hurco VM30i", type: "VMC",
    hourly_rate: 80.00, efficiency_factor: 0.82,
    capabilities: ["milling", "drilling", "tapping", "boring", "contouring"],
    hours_per_shift: 10, shifts_per_day: 1, days_per_week: 5,
  },
  {
    id: "VMC-02", name: "Okuma M460V-5AX", type: "5-axis",
    hourly_rate: 135.00, efficiency_factor: 0.78,
    capabilities: ["milling", "drilling", "5axis_contouring", "high_speed_milling", "die_sinking"],
    hours_per_shift: 10, shifts_per_day: 1, days_per_week: 5,
    controller: "okuma",
  },
  {
    id: "VMC-03", name: "Haas VF-2", type: "VMC",
    hourly_rate: 65.00, efficiency_factor: 0.85,
    capabilities: ["milling", "drilling", "tapping", "boring"],
    hours_per_shift: 10, shifts_per_day: 1, days_per_week: 5,
    controller: "haas",
  },
  {
    id: "VMC-04", name: "Haas OM-2", type: "VMC",
    hourly_rate: 55.00, efficiency_factor: 0.85,
    capabilities: ["milling", "drilling", "engraving", "small_parts"],
    hours_per_shift: 10, shifts_per_day: 1, days_per_week: 5,
    controller: "haas",
  },
  {
    id: "VMC-05", name: "Roku-Roku HC 658-II", type: "VMC",
    hourly_rate: 110.00, efficiency_factor: 0.80,
    capabilities: ["milling", "drilling", "engraving", "high_speed_milling", "die_sinking", "electrode_milling", "graphite_milling"],
    hours_per_shift: 10, shifts_per_day: 1, days_per_week: 5,
    controller: "fanuc",
  },
  // ── SINKER EDM (2) ────────────────────────────────────────────────────────
  {
    id: "EDM-01", name: "Mitsubishi EA12S", type: "EDM",
    hourly_rate: 75.00, efficiency_factor: 0.70,
    capabilities: ["sinker_edm", "die_sinking", "electrode_burn", "fine_finish"],
    hours_per_shift: 10, shifts_per_day: 1, days_per_week: 5,
  },
  {
    id: "EDM-02", name: "Mitsubishi EA12D", type: "EDM",
    hourly_rate: 85.00, efficiency_factor: 0.70,
    capabilities: ["sinker_edm", "die_sinking", "electrode_burn", "fine_finish", "dual_head"],
    hours_per_shift: 10, shifts_per_day: 1, days_per_week: 5,
  },
  // ── WIRE EDM (1) ──────────────────────────────────────────────────────────
  {
    id: "WEDM-01", name: "Mitsubishi FA10S", type: "Wire EDM",
    hourly_rate: 85.00, efficiency_factor: 0.70,
    capabilities: ["wire_edm", "taper_cutting", "skim_cutting", "profile_cutting", "punch_cutting", "die_cutting"],
    hours_per_shift: 10, shifts_per_day: 1, days_per_week: 5,
    wedm_brand: "mitsubishi", wedm_auto_threading: true, wedm_submerged_cutting: true,
    wedm_max_taper_deg: 30, wedm_max_workpiece_height_mm: 215, wedm_uv_travel_mm: 80,
    wedm_wire_inventory: [
      { wire_type: "MD+ Pro II", diameter_mm: 0.25, spool_weight_kg: 10, remaining_pct: 100 },
      { wire_type: "MV1200S", diameter_mm: 0.20, spool_weight_kg: 5, remaining_pct: 100 },
    ],
  },
  // ── SUPPORT MACHINES (6) ──────────────────────────────────────────────────
  {
    id: "GRND-01", name: "Surface Grinder", type: "Grinder",
    hourly_rate: 55.00, efficiency_factor: 0.75,
    capabilities: ["surface_grinding", "flat_grinding"],
    hours_per_shift: 10, shifts_per_day: 1, days_per_week: 5,
  },
  {
    id: "SAW-01", name: "Band Saw", type: "Saw",
    hourly_rate: 25.00, efficiency_factor: 0.90,
    capabilities: ["cutoff", "raw_stock"],
    hours_per_shift: 10, shifts_per_day: 1, days_per_week: 5,
  },
  {
    id: "MAN-01", name: "Manual Lathe", type: "Lathe",
    hourly_rate: 45.00, efficiency_factor: 0.70,
    capabilities: ["turning", "facing", "boring", "manual"],
    hours_per_shift: 10, shifts_per_day: 1, days_per_week: 5,
  },
  {
    id: "MAN-02", name: "Manual Mill", type: "VMC",
    hourly_rate: 45.00, efficiency_factor: 0.70,
    capabilities: ["milling", "drilling", "manual"],
    hours_per_shift: 10, shifts_per_day: 1, days_per_week: 5,
  },
  {
    id: "INS-01", name: "CMM", type: "CMM",
    hourly_rate: 95.00, efficiency_factor: 0.80,
    capabilities: ["inspection", "measurement", "first_article"],
    hours_per_shift: 10, shifts_per_day: 1, days_per_week: 5,
  },
  {
    id: "INS-02", name: "Optical Comparator", type: "CMM",
    hourly_rate: 45.00, efficiency_factor: 0.85,
    capabilities: ["inspection", "profile_inspection", "visual_inspection"],
    hours_per_shift: 10, shifts_per_day: 1, days_per_week: 5,
  },
];

function createDefaultProfile(): ShopProfile {
  const now = new Date().toISOString();
  return {
    id: "jm-die",
    name: "JM Die Company",
    rates: { ...DEFAULT_RATES },
    machines: DEFAULT_MACHINES.map(m => ({ ...m, capabilities: [...m.capabilities] })),
    overhead_pct: 18,                      // JM Die — small die shop overhead
    material_markup_pct: 15,               // JM Die — tool steel/carbide material markup
    tooling_cost_per_op: 20.00,            // JM Die — tooling cost per operation
    material_cost_per_part_default: 35.00, // JM Die — tool steel default
    admin_burden_pct: 12,                  // JM Die — admin burden
    company_profile: {
      ...DEFAULT_COMPANY_PROFILE,
      cad_systems: [...DEFAULT_COMPANY_PROFILE.cad_systems],
      cam_systems: [...DEFAULT_COMPANY_PROFILE.cam_systems],
    },
    source_roots: { ...DEFAULT_SOURCE_ROOTS },
    seed_domains: DEFAULT_SEED_DOMAINS.map((domain) => ({ ...domain })),
    created_at: now,
    updated_at: now,
  };
}

// ============================================================================
// MACHINE RATE MAPPING — bridge to JobCostingEngine machine rate keys
// ============================================================================

/** Maps ShopMachine.type to JobCostingEngine's machineRates keys */
const TYPE_TO_RATE_KEY: Record<string, string> = {
  VMC: "cnc_mill_3axis",
  "5-axis": "cnc_mill_5axis",
  Lathe: "cnc_lathe",
  "Swiss Lathe": "swiss_lathe",
  Grinder: "surface_grinder",
  "Cylindrical Grinder": "cylindrical_grinder",
  EDM: "sinker_edm",
  "Wire EDM": "wire_edm",
  Saw: "band_saw",
  CMM: "cmm_inspection",
};

// ============================================================================
// ENGINE
// ============================================================================

type ShopProfileUpdates =
  Partial<Omit<ShopProfile, "id" | "created_at" | "rates" | "company_profile" | "source_roots" | "seed_domains">> & {
    rates?: Partial<ShopRates>;
    company_profile?: Partial<ShopCompanyProfile>;
    source_roots?: Partial<ShopSourceRoots>;
    seed_domains?: ShopSeedDomain[];
  };

export class ShopConfigurationEngine {
  private profiles: Map<string, ShopProfile> = new Map();

  /** The canonical profile ID. All code should reference this constant. */
  static readonly DEFAULT_PROFILE_ID = "jm-die";

  constructor() {
    // Initialize with JM Die as the canonical test shop profile
    const profile = createDefaultProfile();
    this.profiles.set(ShopConfigurationEngine.DEFAULT_PROFILE_ID, profile);
    // Also register under "default" alias for backward compatibility
    this.profiles.set("default", profile);
  }

  // ── GET ────────────────────────────────────────────────────────────────────

  /** Get a shop profile by ID. Returns JM Die profile if not found. */
  getProfile(profileId: string = ShopConfigurationEngine.DEFAULT_PROFILE_ID): ShopProfile {
    return this.profiles.get(profileId) ?? this.profiles.get(ShopConfigurationEngine.DEFAULT_PROFILE_ID)!;
  }

  /** Get the active shop profile (JM Die — canonical test shop). */
  getActiveProfile(): ShopProfile {
    return this.getProfile(ShopConfigurationEngine.DEFAULT_PROFILE_ID);
  }

  /** List all profiles. */
  listProfiles(): ShopProfile[] {
    return Array.from(this.profiles.values());
  }

  // ── UPDATE ─────────────────────────────────────────────────────────────────

  /** Update a profile with partial data. Merges rates and machines. */
  updateProfile(profileId: string, updates: ShopProfileUpdates): ShopProfile {
    const existing = this.profiles.get(profileId);
    if (!existing) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    const updated: ShopProfile = {
      ...existing,
      ...updates,
      id: existing.id,
      created_at: existing.created_at,
      rates: updates.rates
        ? { ...existing.rates, ...updates.rates }
        : existing.rates,
      machines: updates.machines ?? existing.machines,
      company_profile: updates.company_profile
        ? {
            ...existing.company_profile,
            ...updates.company_profile,
            cad_systems: updates.company_profile.cad_systems ?? existing.company_profile.cad_systems,
            cam_systems: updates.company_profile.cam_systems ?? existing.company_profile.cam_systems,
          }
        : existing.company_profile,
      source_roots: updates.source_roots
        ? { ...existing.source_roots, ...updates.source_roots }
        : existing.source_roots,
      seed_domains: updates.seed_domains ?? existing.seed_domains,
      updated_at: new Date().toISOString(),
    };

    this.profiles.set(profileId, updated);
    persistenceBridge.persist("shop_profiles", profileId, this.serializeProfile(updated) as any);
    return updated;
  }

  // ── RATES ──────────────────────────────────────────────────────────────────

  /** Get rates from the active profile. */
  getRates(profileId: string = ShopConfigurationEngine.DEFAULT_PROFILE_ID): ShopRates {
    return { ...this.getProfile(profileId).rates };
  }

  /** Update rates on a profile. Returns the full updated rates. */
  updateRates(profileId: string, rateUpdates: Partial<ShopRates>): ShopRates {
    const profile = this.updateProfile(profileId, { rates: rateUpdates });
    return { ...profile.rates };
  }

  /** Convert shop rates to JobCostingEngine ShopRates format. */
  toJobCostingRates(profileId: string = ShopConfigurationEngine.DEFAULT_PROFILE_ID): {
    laborRate: number;
    overheadRate: number;
    adminRate: number;
    setupRate: number;
    programmingRate: number;
    inspectionRate: number;
    machineRates: Record<string, number>;
  } {
    const profile = this.getProfile(profileId);
    const machineRates: Record<string, number> = {};

    for (const machine of profile.machines) {
      const rateKey = TYPE_TO_RATE_KEY[machine.type] ?? machine.type.toLowerCase().replace(/\s+/g, "_");
      const burden = this.getMaintenanceBurdenPerHour(machine.id, profile.rates.labor_per_hr);
      machineRates[rateKey] = Math.round((machine.hourly_rate + burden) * 100) / 100;
    }

    return {
      laborRate: profile.rates.labor_per_hr,
      overheadRate: profile.rates.overhead_per_hr,
      adminRate: profile.rates.admin_per_hr,
      setupRate: profile.rates.setup_per_hr,
      programmingRate: profile.rates.programming_per_hr,
      inspectionRate: profile.rates.inspection_per_hr,
      machineRates,
    };
  }

  // ── MACHINES ───────────────────────────────────────────────────────────────

  /** Get all machines from a profile. */
  getMachines(profileId: string = ShopConfigurationEngine.DEFAULT_PROFILE_ID): ShopMachine[] {
    return this.getProfile(profileId).machines.map(m => ({ ...m, capabilities: [...m.capabilities] }));
  }

  /** Get the canonical JM Die machine → controller registry for downstream APPW surfaces. */
  getMachineControllerRegistry(
    profileId: string = ShopConfigurationEngine.DEFAULT_PROFILE_ID,
  ): ShopMachineControllerRegistryEntry[] {
    const profile = this.getProfile(profileId);
    const controllerMap = new Map(JM_DIE_CONTROLLER_MAP.map((entry) => [entry.machine_id, entry]));

    return profile.machines.map((machine) => {
      const mapped = controllerMap.get(machine.id);
      return {
        machine_id: machine.id,
        machine_name: machine.name,
        machine_type: machine.type,
        controller_family: mapped?.controller_family ?? machine.controller ?? "unknown",
        controller_model: mapped?.controller_model ?? "pending_mapping",
        shop_controller: machine.controller ?? null,
        post_processor: mapped?.post_processor,
        machine_rate_per_hour: machine.hourly_rate,
        canonical_test_machine: profile.company_profile.canonical_test_shop,
        program_release_ready: isProgramReleaseReadyMachine(machine),
        machine_source_root: profile.source_roots.machines_root,
        controller_source_root: profile.source_roots.controllers_root,
      };
    });
  }

  /** Summarize machine/controller seeding posture for JM Die-backed development. */
  getMachineSeedSummary(
    profileId: string = ShopConfigurationEngine.DEFAULT_PROFILE_ID,
  ): ShopMachineSeedSummary {
    const profile = this.getProfile(profileId);
    const registry = this.getMachineControllerRegistry(profileId);
    const mappedControllerCount = registry.filter(
      (entry) => entry.controller_model !== "pending_mapping",
    ).length;
    const programReleaseReadyMachineCount = registry.filter(
      (entry) => entry.program_release_ready,
    ).length;

    return {
      shop_id: profile.id,
      machine_count: registry.length,
      mapped_controller_count: mappedControllerCount,
      unmapped_machine_count: registry.length - mappedControllerCount,
      program_release_ready_machine_count: programReleaseReadyMachineCount,
      machine_source_root: profile.source_roots.machines_root,
      controller_source_root: profile.source_roots.controllers_root,
    };
  }

  /** Add a machine to a profile. Rejects duplicate IDs. */
  addMachine(profileId: string, machine: ShopMachine): ShopMachine[] {
    const profile = this.getProfile(profileId);
    if (profile.machines.some(m => m.id === machine.id)) {
      throw new Error(`Machine already exists: ${machine.id}`);
    }
    const machines = [...profile.machines, machine];
    this.updateProfile(profileId, { machines });
    return machines;
  }

  /** Update a machine in a profile. */
  updateMachine(profileId: string, machineId: string, updates: Partial<Omit<ShopMachine, "id">>): ShopMachine {
    const profile = this.getProfile(profileId);
    const idx = profile.machines.findIndex(m => m.id === machineId);
    if (idx === -1) {
      throw new Error(`Machine not found: ${machineId}`);
    }
    const updated = { ...profile.machines[idx], ...updates, id: machineId };
    const machines = [...profile.machines];
    machines[idx] = updated;
    this.updateProfile(profileId, { machines });
    return updated;
  }

  /** Remove a machine from a profile. */
  removeMachine(profileId: string, machineId: string): ShopMachine[] {
    const profile = this.getProfile(profileId);
    const machines = profile.machines.filter(m => m.id !== machineId);
    if (machines.length === profile.machines.length) {
      throw new Error(`Machine not found: ${machineId}`);
    }
    this.updateProfile(profileId, { machines });
    return machines;
  }

  /** Get machine rate by ID or type. Falls back to default $85/hr. */
  getMachineRate(profileId: string, machineIdOrType: string): number {
    const profile = this.getProfile(profileId);
    const byId = profile.machines.find(m => m.id === machineIdOrType);
    if (byId) return byId.hourly_rate;
    const byType = profile.machines.find(m => m.type.toLowerCase() === machineIdOrType.toLowerCase());
    if (byType) return byType.hourly_rate;
    return 85; // fallback to most common 3-axis rate
  }

  /**
   * Get handbook-sourced maintenance burden per operating hour for a machine.
   * Returns 0 if no handbook data is ingested for the machine.
   * Uses lazy imports to avoid circular dependencies.
   */
  getMaintenanceBurdenPerHour(machineId: string, laborRate?: number): number {
    try {
      // Lazy import to avoid circular dependency
      const { handbookMaintenanceIntelligenceEngine } = require("./HandbookMaintenanceIntelligenceEngine.js");
      const { machineHandbookRegistry } = require("./MachineHandbookRegistryEngine.js");

      const profile = this.getActiveProfile();
      const machine = profile.machines.find(m => m.id === machineId);
      const operatingHoursPerYear = machine
        ? machine.hours_per_shift * machine.shifts_per_day * machine.days_per_week * 50 * machine.efficiency_factor
        : 2000;

      const result = handbookMaintenanceIntelligenceEngine.estimateAnnualCost(
        {
          machine_id: machineId,
          labor_rate_per_hour: laborRate ?? profile.rates.labor_per_hr,
          operating_hours_per_year: Math.round(operatingHoursPerYear),
        },
        machineHandbookRegistry,
      );

      return result.cost_per_operating_hour;
    } catch {
      return 0; // No handbook data or engine not available
    }
  }

  /**
   * Get effective machine rate = base rate + handbook-sourced maintenance burden.
   * For machines with ingested handbooks, this adds PM labor, parts, and consumable
   * costs per operating hour to the base machine rate.
   */
  getEffectiveMachineRate(profileId: string, machineIdOrType: string): number {
    const baseRate = this.getMachineRate(profileId, machineIdOrType);
    const profile = this.getProfile(profileId);

    // Try to find the machine ID for handbook lookup
    const machine = profile.machines.find(m =>
      m.id === machineIdOrType || m.type.toLowerCase() === machineIdOrType.toLowerCase()
    );

    if (!machine) return baseRate;

    const burden = this.getMaintenanceBurdenPerHour(machine.id, profile.rates.labor_per_hr);
    return Math.round((baseRate + burden) * 100) / 100;
  }

  // ── RESET ──────────────────────────────────────────────────────────────────

  /** Reset a profile to factory defaults (JM Die). */
  resetProfile(profileId: string = ShopConfigurationEngine.DEFAULT_PROFILE_ID): ShopProfile {
    const defaults = createDefaultProfile();
    defaults.id = profileId;
    this.profiles.set(profileId, defaults);
    persistenceBridge.persist("shop_profiles", profileId, this.serializeProfile(defaults) as any);
    return defaults;
  }

  // ── HANDBOOK-AWARE MACHINE SELECTION ────────────────────────────────────────

  /**
   * Select machines capable of a job based on handbook-sourced capabilities.
   * Filters by spindle RPM, power, work envelope, axis count, and capability tags.
   * Returns machines sorted by effective rate (cheapest first).
   *
   * Falls back to capability-tag filtering from ShopMachine.capabilities when
   * no handbook data is available for a machine.
   */
  selectCapableMachines(
    requirements: {
      min_spindle_rpm?: number;
      min_power_kw?: number;
      min_work_envelope_mm?: { x?: number; y?: number; z?: number };
      simultaneous_axes?: number;
      capabilities?: string[];
    },
    profileId: string = ShopConfigurationEngine.DEFAULT_PROFILE_ID,
  ): Array<{
    machine_id: string;
    machine_name: string;
    type: string;
    effective_rate: number;
    base_rate: number;
    maintenance_burden: number;
    handbook_available: boolean;
    rejection_reasons: string[];
  }> {
    const profile = this.getProfile(profileId);
    const results: Array<{
      machine_id: string;
      machine_name: string;
      type: string;
      effective_rate: number;
      base_rate: number;
      maintenance_burden: number;
      handbook_available: boolean;
      rejection_reasons: string[];
    }> = [];

    let capabilityEngine: any = null;
    let handbookRegistry: any = null;
    let torqueCurves: any = {};
    let spindleCorrections: any[] = [];
    try {
      capabilityEngine = require("./MachineCapabilityIntelligenceEngine.js").machineCapabilityIntelligenceEngine;
      handbookRegistry = require("./MachineHandbookRegistryEngine.js").machineHandbookRegistry;
      torqueCurves = require("../data/machine-torque-curves.js").MACHINE_TORQUE_CURVES ?? {};
      spindleCorrections = require("../data/machine-spindle-corrections.js").SPINDLE_CORRECTIONS ?? [];
    } catch { /* engines not available — use tag-only filtering */ }

    for (const machine of profile.machines) {
      const rejections: string[] = [];
      let handbookAvailable = false;

      // Try handbook capability check first
      if (capabilityEngine && handbookRegistry) {
        try {
          const capProfile = capabilityEngine.getProfile(
            { machine_id: machine.id },
            { handbookRegistry, torqueCurves, spindleCorrections, machineRegistry: null },
          );

          if (capProfile && capProfile.field_count > 0) {
            handbookAvailable = true;

            // Check spindle RPM
            if (requirements.min_spindle_rpm && capProfile.spindle?.max_rpm) {
              if (capProfile.spindle.max_rpm.value < requirements.min_spindle_rpm) {
                rejections.push(`spindle_rpm: needs ${requirements.min_spindle_rpm}, has ${capProfile.spindle.max_rpm.value}`);
              }
            }

            // Check spindle power
            if (requirements.min_power_kw && capProfile.spindle?.rated_power_kw) {
              if (capProfile.spindle.rated_power_kw.value < requirements.min_power_kw) {
                rejections.push(`power_kw: needs ${requirements.min_power_kw}, has ${capProfile.spindle.rated_power_kw.value}`);
              }
            }

            // Check work envelope
            if (requirements.min_work_envelope_mm && capProfile.work_envelope) {
              const env = capProfile.work_envelope;
              const req = requirements.min_work_envelope_mm;
              if (req.x && env.x?.value && env.x.value < req.x)
                rejections.push(`envelope_x: needs ${req.x}mm, has ${env.x.value}mm`);
              if (req.y && env.y?.value && env.y.value < req.y)
                rejections.push(`envelope_y: needs ${req.y}mm, has ${env.y.value}mm`);
              if (req.z && env.z?.value && env.z.value < req.z)
                rejections.push(`envelope_z: needs ${req.z}mm, has ${env.z.value}mm`);
            }

            // Check simultaneous axes
            if (requirements.simultaneous_axes && capProfile.simultaneous_axes) {
              if (capProfile.simultaneous_axes.value < requirements.simultaneous_axes) {
                rejections.push(`axes: needs ${requirements.simultaneous_axes}, has ${capProfile.simultaneous_axes.value}`);
              }
            }
          }
        } catch { /* handbook lookup failed — fall through to tag check */ }
      }

      // Capability tag check (always applied, works without handbook data)
      if (requirements.capabilities && requirements.capabilities.length > 0) {
        const machineCaps = machine.capabilities.map(c => c.toLowerCase());
        for (const reqCap of requirements.capabilities) {
          if (!machineCaps.includes(reqCap.toLowerCase())) {
            rejections.push(`capability: missing '${reqCap}'`);
          }
        }
      }

      const burden = this.getMaintenanceBurdenPerHour(machine.id, profile.rates.labor_per_hr);
      results.push({
        machine_id: machine.id,
        machine_name: machine.name,
        type: machine.type,
        effective_rate: Math.round((machine.hourly_rate + burden) * 100) / 100,
        base_rate: machine.hourly_rate,
        maintenance_burden: burden,
        handbook_available: handbookAvailable,
        rejection_reasons: rejections,
      });
    }

    // Sort: capable machines first (no rejections), then by effective rate ascending
    return results.sort((a, b) => {
      if (a.rejection_reasons.length === 0 && b.rejection_reasons.length > 0) return -1;
      if (a.rejection_reasons.length > 0 && b.rejection_reasons.length === 0) return 1;
      return a.effective_rate - b.effective_rate;
    });
  }

  // ── CAPACITY HELPERS ───────────────────────────────────────────────────────

  /** Convert machines to CapacityPlanningEngine format. */
  toCapacityMachines(profileId: string = ShopConfigurationEngine.DEFAULT_PROFILE_ID): Array<{
    machine_id: string;
    machine_name: string;
    type: string;
    hours_per_shift: number;
    shifts_per_day: number;
    days_per_week: number;
    efficiency_factor: number;
  }> {
    return this.getProfile(profileId).machines.map(m => ({
      machine_id: m.id,
      machine_name: m.name,
      type: m.type,
      hours_per_shift: m.hours_per_shift,
      shifts_per_day: m.shifts_per_day,
      days_per_week: m.days_per_week,
      efficiency_factor: m.efficiency_factor,
    }));
  }

  /** Get costing parameters for ERPIntegrationEngine. */
  toCostingParams(profileId: string = ShopConfigurationEngine.DEFAULT_PROFILE_ID): {
    machineRate: number;
    laborRate: number;
    overheadPct: number;
    toolingCostPerOp: number;
    materialCostPerPart: number;
  } {
    const profile = this.getProfile(profileId);
    // Use the first VMC effective rate (base + maintenance burden)
    const vmc = profile.machines.find(m => m.type === "VMC");
    const vmcRate = vmc
      ? Math.round((vmc.hourly_rate + this.getMaintenanceBurdenPerHour(vmc.id, profile.rates.labor_per_hr)) * 100) / 100
      : 85;
    return {
      machineRate: vmcRate,
      laborRate: profile.rates.labor_per_hr,
      overheadPct: profile.overhead_pct,
      toolingCostPerOp: profile.tooling_cost_per_op,
      materialCostPerPart: profile.material_cost_per_part_default,
    };
  }

  // ── VALIDATION ─────────────────────────────────────────────────────────────

  /** Validate that rates are within sane bounds. Returns warnings for out-of-range values. */
  validateProfile(profile: ShopProfile): string[] {
    const warnings: string[] = [];
    const r = profile.rates;

    if (r.labor_per_hr < 20 || r.labor_per_hr > 300)
      warnings.push(`labor_per_hr $${r.labor_per_hr} outside sane range ($20-$300/hr)`);
    if (r.overhead_per_hr < 0 || r.overhead_per_hr > 200)
      warnings.push(`overhead_per_hr $${r.overhead_per_hr} outside sane range ($0-$200/hr)`);
    if (r.setup_per_hr < 20 || r.setup_per_hr > 300)
      warnings.push(`setup_per_hr $${r.setup_per_hr} outside sane range ($20-$300/hr)`);
    if (r.programming_per_hr < 20 || r.programming_per_hr > 500)
      warnings.push(`programming_per_hr $${r.programming_per_hr} outside sane range ($20-$500/hr)`);
    if (r.inspection_per_hr < 20 || r.inspection_per_hr > 300)
      warnings.push(`inspection_per_hr $${r.inspection_per_hr} outside sane range ($20-$300/hr)`);

    if (profile.overhead_pct < 0 || profile.overhead_pct > 200)
      warnings.push(`overhead_pct ${profile.overhead_pct}% outside sane range (0-200%)`);
    if (profile.material_markup_pct < 0 || profile.material_markup_pct > 100)
      warnings.push(`material_markup_pct ${profile.material_markup_pct}% outside sane range (0-100%)`);

    for (const m of profile.machines) {
      if (m.hourly_rate < 10 || m.hourly_rate > 500)
        warnings.push(`Machine ${m.id} rate $${m.hourly_rate}/hr outside sane range ($10-$500/hr)`);
      if (m.efficiency_factor < 0.3 || m.efficiency_factor > 1.0)
        warnings.push(`Machine ${m.id} efficiency ${m.efficiency_factor} outside range (0.3-1.0)`);
    }

    return warnings;
  }

  // ── SERIALIZATION ──────────────────────────────────────────────────────────

  private serializeProfile(profile: ShopProfile): Record<string, unknown> {
    return {
      id: profile.id,
      name: profile.name,
      rates: profile.rates,
      machines: profile.machines,
      overhead_pct: profile.overhead_pct,
      material_markup_pct: profile.material_markup_pct,
      tooling_cost_per_op: profile.tooling_cost_per_op,
      material_cost_per_part_default: profile.material_cost_per_part_default,
      admin_burden_pct: profile.admin_burden_pct,
      company_profile: profile.company_profile,
      source_roots: profile.source_roots,
      seed_domains: profile.seed_domains,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    };
  }

  // ── STATS ──────────────────────────────────────────────────────────────────

  /** Summary stats for health checks. */
  getStats(): {
    profile_count: number;
    machine_count: number;
    total_weekly_capacity_hours: number;
    avg_machine_rate: number;
    mapped_controller_count: number;
    program_release_ready_machine_count: number;
  } {
    const profiles = this.listProfiles();
    const active = this.getActiveProfile();
    const machineSeedSummary = this.getMachineSeedSummary(active.id);
    const totalWeekly = active.machines.reduce((sum, m) =>
      sum + m.hours_per_shift * m.shifts_per_day * m.days_per_week * m.efficiency_factor, 0);
    const avgRate = active.machines.length > 0
      ? active.machines.reduce((sum, m) => sum + m.hourly_rate, 0) / active.machines.length
      : 0;

    return {
      profile_count: profiles.length,
      machine_count: active.machines.length,
      total_weekly_capacity_hours: Math.round(totalWeekly * 10) / 10,
      avg_machine_rate: Math.round(avgRate * 100) / 100,
      mapped_controller_count: machineSeedSummary.mapped_controller_count,
      program_release_ready_machine_count: machineSeedSummary.program_release_ready_machine_count,
    };
  }
}

// ============================================================================
// SINGLETON + PERSISTENCE REGISTRATION
// ============================================================================

export const shopConfigurationEngine = new ShopConfigurationEngine();

// Register with PersistenceBridge for PostgreSQL write-through
persistenceBridge.registerMap({
  entity: "shop_profiles",
  getMap: () => (shopConfigurationEngine as any).profiles as unknown as Map<string, any>,
  keyField: "id",
});

export type {
  ShopProfile as ShopProfileType,
  ShopRates as ShopRatesType,
  ShopMachine as ShopMachineType,
  ShopCompanyProfile as ShopCompanyProfileType,
  ShopSourceRoots as ShopSourceRootsType,
  ShopSeedDomain as ShopSeedDomainType,
};
