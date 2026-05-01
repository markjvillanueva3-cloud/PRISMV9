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
  created_at: string;
  updated_at: string;
}

// ============================================================================
// DEFAULTS — sourced from current hardcoded values across engines
// ============================================================================

/** Default rates match JobCostingEngine DEFAULT_RATES and ERPIntegrationEngine hardcoded values */
const DEFAULT_RATES: ShopRates = {
  labor_per_hr: 45.00,         // ERPIntegrationEngine line 240, JobCostingEngine line 79
  overhead_per_hr: 35.00,      // JobCostingEngine line 80
  admin_per_hr: 15.00,         // JobCostingEngine line 81
  setup_per_hr: 55.00,         // JobCostingEngine line 82
  programming_per_hr: 75.00,   // JobCostingEngine line 83
  inspection_per_hr: 50.00,    // JobCostingEngine line 84
};

/** Default machines match CapacityPlanningEngine DEFAULT_MACHINES */
const DEFAULT_MACHINES: ShopMachine[] = [
  { id: "VMC-1", name: "Haas VF-2", type: "VMC", hourly_rate: 85.00, efficiency_factor: 0.85, capabilities: ["milling", "drilling", "tapping"], hours_per_shift: 8, shifts_per_day: 2, days_per_week: 5 },
  { id: "VMC-2", name: "DMG MORI DMU 50", type: "5-axis", hourly_rate: 150.00, efficiency_factor: 0.80, capabilities: ["5axis_milling", "drilling", "contouring"], hours_per_shift: 8, shifts_per_day: 2, days_per_week: 5 },
  { id: "LTH-1", name: "Mazak QTN-200", type: "Lathe", hourly_rate: 75.00, efficiency_factor: 0.85, capabilities: ["turning", "facing", "threading", "boring"], hours_per_shift: 8, shifts_per_day: 2, days_per_week: 5 },
  { id: "LTH-2", name: "Okuma LB3000", type: "Lathe", hourly_rate: 75.00, efficiency_factor: 0.85, capabilities: ["turning", "facing", "threading"], hours_per_shift: 8, shifts_per_day: 1, days_per_week: 5 },
  { id: "GRN-1", name: "Studer S33", type: "Grinder", hourly_rate: 65.00, efficiency_factor: 0.75, capabilities: ["cylindrical_grinding", "surface_grinding"], hours_per_shift: 8, shifts_per_day: 1, days_per_week: 5 },
  { id: "EDM-1", name: "Makino EDAF3", type: "EDM", hourly_rate: 85.00, efficiency_factor: 0.70, capabilities: ["sinker_edm"], hours_per_shift: 8, shifts_per_day: 1, days_per_week: 5 },
  { id: "SAW-1", name: "DoAll C-916", type: "Saw", hourly_rate: 35.00, efficiency_factor: 0.90, capabilities: ["cutoff", "plate_cutting"], hours_per_shift: 8, shifts_per_day: 1, days_per_week: 5 },
  { id: "CMM-1", name: "Zeiss Contura", type: "CMM", hourly_rate: 95.00, efficiency_factor: 0.80, capabilities: ["inspection", "cmm_measurement"], hours_per_shift: 8, shifts_per_day: 1, days_per_week: 5 },
];

function createDefaultProfile(): ShopProfile {
  const now = new Date().toISOString();
  return {
    id: "default",
    name: "Default Shop Profile",
    rates: { ...DEFAULT_RATES },
    machines: DEFAULT_MACHINES.map(m => ({ ...m, capabilities: [...m.capabilities] })),
    overhead_pct: 15,                      // ERPIntegrationEngine line 245, QuoteEstimatorEngine line 336
    material_markup_pct: 10,               // standard material markup
    tooling_cost_per_op: 15.00,            // ERPIntegrationEngine line 243
    material_cost_per_part_default: 25.00, // ERPIntegrationEngine line 244
    admin_burden_pct: 15,                  // JobCostingEngine admin hours = directLabor * this%
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

class ShopConfigurationEngine {
  private profiles: Map<string, ShopProfile> = new Map();

  constructor() {
    // Initialize with default profile
    this.profiles.set("default", createDefaultProfile());
  }

  // ── GET ────────────────────────────────────────────────────────────────────

  /** Get a shop profile by ID. Returns default if not found. */
  getProfile(profileId: string = "default"): ShopProfile {
    return this.profiles.get(profileId) ?? this.profiles.get("default")!;
  }

  /** Get the active shop profile (always "default" for now, multi-tenant later). */
  getActiveProfile(): ShopProfile {
    return this.getProfile("default");
  }

  /** List all profiles. */
  listProfiles(): ShopProfile[] {
    return Array.from(this.profiles.values());
  }

  // ── UPDATE ─────────────────────────────────────────────────────────────────

  /** Update a profile with partial data. Merges rates and machines. */
  updateProfile(profileId: string, updates: Partial<Omit<ShopProfile, "id" | "created_at" | "rates">> & { rates?: Partial<ShopRates> }): ShopProfile {
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
      updated_at: new Date().toISOString(),
    };

    this.profiles.set(profileId, updated);
    persistenceBridge.persist("shop_profiles", profileId, this.serializeProfile(updated) as any);
    return updated;
  }

  // ── RATES ──────────────────────────────────────────────────────────────────

  /** Get rates from the active profile. */
  getRates(profileId: string = "default"): ShopRates {
    return { ...this.getProfile(profileId).rates };
  }

  /** Update rates on a profile. Returns the full updated rates. */
  updateRates(profileId: string, rateUpdates: Partial<ShopRates>): ShopRates {
    const profile = this.updateProfile(profileId, { rates: rateUpdates });
    return { ...profile.rates };
  }

  /** Convert shop rates to JobCostingEngine ShopRates format. */
  toJobCostingRates(profileId: string = "default"): {
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
  getMachines(profileId: string = "default"): ShopMachine[] {
    return this.getProfile(profileId).machines.map(m => ({ ...m, capabilities: [...m.capabilities] }));
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

  /** Reset a profile to factory defaults. */
  resetProfile(profileId: string = "default"): ShopProfile {
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
    profileId: string = "default",
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
  toCapacityMachines(profileId: string = "default"): Array<{
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
  toCostingParams(profileId: string = "default"): {
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
  } {
    const profiles = this.listProfiles();
    const active = this.getActiveProfile();
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

export type { ShopProfile as ShopProfileType, ShopRates as ShopRatesType, ShopMachine as ShopMachineType };
