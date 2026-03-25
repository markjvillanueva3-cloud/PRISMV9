/**
 * MachineProfileEngine — Shop Machine Specifications Database
 *
 * Stores actual machine tool specifications from the user's shop floor.
 * Used to validate S&F parameters against real machine limits before posting.
 * Includes spindle torque curves, axis travel, tool changer capacity.
 *
 * Ships with 12 common machine profiles as defaults; users add their own.
 *
 * @engine MachineProfileEngine
 * @dispatcher calcDispatcher
 * @actions machine_profile_get, machine_profile_list, machine_profile_validate, machine_profile_add
 */

export interface SpindleCurve {
  base_rpm: number;           // transition from constant torque to constant power
  max_rpm: number;
  rated_power_kw: number;     // at base RPM
  max_torque_nm: number;      // at low RPM (constant torque region)
  taper: "BT30" | "BT40" | "BT50" | "CAT40" | "CAT50" | "HSK-A63" | "HSK-A100" | "HSK-E40" | "HSK-F63" | "R8" | "MT3" | "MT4" | "MT5";
}

export interface MachineProfile {
  id: string;
  name: string;
  type: "vmc" | "hmc" | "lathe" | "mill_turn" | "5axis" | "router" | "grinder" | "swiss" | "edm_wire" | "edm_sinker";
  manufacturer: string;
  model: string;
  controller: string;
  spindle: SpindleCurve;
  axes: {
    x_mm: number;
    y_mm: number;
    z_mm: number;
    a_deg?: number;
    b_deg?: number;
    c_deg?: number;
  };
  rapid_rate_mmmin: number;     // max rapid traverse
  max_feed_mmmin: number;       // max cutting feed rate
  tool_changer_capacity: number;
  max_tool_diameter_mm: number;
  max_tool_length_mm: number;
  max_part_weight_kg: number;
  coolant: {
    through_spindle: boolean;
    through_spindle_pressure_bar?: number;
    flood: boolean;
    mist: boolean;
    air_blast: boolean;
    mql?: boolean;           // minimum quantity lubrication available
    cryogenic?: boolean;     // LN2 or CO2 cryogenic coolant system
    high_pressure_bar?: number;  // external high-pressure coolant (if different from TSC)
    coolant_tank_liters?: number;
  };
  year?: number;
  notes?: string;
}

// ── Default machine profiles (common shop machines) ──
const DEFAULT_MACHINES: MachineProfile[] = [
  {
    id: "haas_vf2", name: "Haas VF-2", type: "vmc",
    manufacturer: "Haas", model: "VF-2", controller: "Haas NGC",
    spindle: { base_rpm: 2000, max_rpm: 8100, rated_power_kw: 22.4, max_torque_nm: 122, taper: "CAT40" },
    axes: { x_mm: 762, y_mm: 406, z_mm: 508 },
    rapid_rate_mmmin: 25400, max_feed_mmmin: 16510,
    tool_changer_capacity: 20, max_tool_diameter_mm: 89, max_tool_length_mm: 254,
    max_part_weight_kg: 1361, coolant: { through_spindle: false, flood: true, mist: false, air_blast: true },
  },
  {
    id: "haas_vf2ss", name: "Haas VF-2SS", type: "vmc",
    manufacturer: "Haas", model: "VF-2SS", controller: "Haas NGC",
    spindle: { base_rpm: 3400, max_rpm: 12000, rated_power_kw: 22.4, max_torque_nm: 122, taper: "CAT40" },
    axes: { x_mm: 762, y_mm: 406, z_mm: 508 },
    rapid_rate_mmmin: 35600, max_feed_mmmin: 21200,
    tool_changer_capacity: 24, max_tool_diameter_mm: 89, max_tool_length_mm: 254,
    max_part_weight_kg: 1361, coolant: { through_spindle: true, through_spindle_pressure_bar: 70, flood: true, mist: false, air_blast: true, mql: false, cryogenic: false, coolant_tank_liters: 208 },
  },
  {
    id: "haas_ums5", name: "Haas UMC-500", type: "5axis",
    manufacturer: "Haas", model: "UMC-500", controller: "Haas NGC",
    spindle: { base_rpm: 3400, max_rpm: 12000, rated_power_kw: 22.4, max_torque_nm: 122, taper: "CAT40" },
    axes: { x_mm: 508, y_mm: 406, z_mm: 394, a_deg: 120, b_deg: 360 },
    rapid_rate_mmmin: 30500, max_feed_mmmin: 16500,
    tool_changer_capacity: 40, max_tool_diameter_mm: 76, max_tool_length_mm: 250,
    max_part_weight_kg: 136, coolant: { through_spindle: true, through_spindle_pressure_bar: 70, flood: true, mist: false, air_blast: true },
  },
  {
    id: "dmg_dmv70", name: "DMG MORI DMC 635 V", type: "vmc",
    manufacturer: "DMG MORI", model: "DMC 635 V", controller: "Siemens 840D",
    spindle: { base_rpm: 4000, max_rpm: 14000, rated_power_kw: 25, max_torque_nm: 120, taper: "HSK-A63" },
    axes: { x_mm: 635, y_mm: 510, z_mm: 460 },
    rapid_rate_mmmin: 36000, max_feed_mmmin: 20000,
    tool_changer_capacity: 30, max_tool_diameter_mm: 80, max_tool_length_mm: 300,
    max_part_weight_kg: 600, coolant: { through_spindle: true, through_spindle_pressure_bar: 40, flood: true, mist: true, air_blast: true },
  },
  {
    id: "mazak_vcs430", name: "Mazak VCS-430A", type: "vmc",
    manufacturer: "Mazak", model: "VCS-430A", controller: "Mazatrol SmoothG",
    spindle: { base_rpm: 3000, max_rpm: 18000, rated_power_kw: 30, max_torque_nm: 95.5, taper: "HSK-A63" },
    axes: { x_mm: 560, y_mm: 430, z_mm: 510 },
    rapid_rate_mmmin: 42000, max_feed_mmmin: 20000,
    tool_changer_capacity: 30, max_tool_diameter_mm: 80, max_tool_length_mm: 300,
    max_part_weight_kg: 500, coolant: { through_spindle: true, through_spindle_pressure_bar: 70, flood: true, mist: true, air_blast: true, mql: true, cryogenic: false },
  },
  {
    id: "okuma_genos_m560v", name: "Okuma GENOS M560-V", type: "vmc",
    manufacturer: "Okuma", model: "GENOS M560-V", controller: "OSP-P300MA",
    spindle: { base_rpm: 2500, max_rpm: 15000, rated_power_kw: 22, max_torque_nm: 88, taper: "BT40" },
    axes: { x_mm: 1050, y_mm: 560, z_mm: 460 },
    rapid_rate_mmmin: 40000, max_feed_mmmin: 15000,
    tool_changer_capacity: 32, max_tool_diameter_mm: 90, max_tool_length_mm: 300,
    max_part_weight_kg: 900, coolant: { through_spindle: true, through_spindle_pressure_bar: 70, flood: true, mist: false, air_blast: true },
  },
  {
    id: "haas_st20", name: "Haas ST-20", type: "lathe",
    manufacturer: "Haas", model: "ST-20", controller: "Haas NGC",
    spindle: { base_rpm: 600, max_rpm: 4000, rated_power_kw: 22.4, max_torque_nm: 340, taper: "MT4" },
    axes: { x_mm: 207, y_mm: 0, z_mm: 533 },
    rapid_rate_mmmin: 30500, max_feed_mmmin: 10000,
    tool_changer_capacity: 12, max_tool_diameter_mm: 50, max_tool_length_mm: 150,
    max_part_weight_kg: 227, coolant: { through_spindle: false, flood: true, mist: false, air_blast: true },
    notes: "Max bar capacity 51mm, chuck 210mm",
  },
  {
    id: "mazak_qt200", name: "Mazak QT-200", type: "lathe",
    manufacturer: "Mazak", model: "QT-200", controller: "Mazatrol SmoothG",
    spindle: { base_rpm: 500, max_rpm: 5000, rated_power_kw: 18.5, max_torque_nm: 318, taper: "MT4" },
    axes: { x_mm: 200, y_mm: 0, z_mm: 500 },
    rapid_rate_mmmin: 30000, max_feed_mmmin: 10000,
    tool_changer_capacity: 12, max_tool_diameter_mm: 40, max_tool_length_mm: 150,
    max_part_weight_kg: 300, coolant: { through_spindle: false, flood: true, mist: true, air_blast: true },
  },
  {
    id: "citizen_l20", name: "Citizen L20 Type VIII", type: "swiss",
    manufacturer: "Citizen", model: "L20 Type VIII", controller: "Cincom",
    spindle: { base_rpm: 2000, max_rpm: 10000, rated_power_kw: 3.7, max_torque_nm: 14.4, taper: "R8" },
    axes: { x_mm: 170, y_mm: 0, z_mm: 205, b_deg: 135, c_deg: 360 },
    rapid_rate_mmmin: 32000, max_feed_mmmin: 5000,
    tool_changer_capacity: 27, max_tool_diameter_mm: 20, max_tool_length_mm: 80,
    max_part_weight_kg: 5, coolant: { through_spindle: false, flood: true, mist: true, air_blast: true },
    notes: "Max bar dia 20mm, guide bushing",
  },
  {
    id: "dmg_dmu50", name: "DMG MORI DMU 50 3rd Gen", type: "5axis",
    manufacturer: "DMG MORI", model: "DMU 50 3rd Gen", controller: "CELOS Siemens",
    spindle: { base_rpm: 4500, max_rpm: 20000, rated_power_kw: 35, max_torque_nm: 130, taper: "HSK-A63" },
    axes: { x_mm: 650, y_mm: 520, z_mm: 475, b_deg: 180, c_deg: 360 },
    rapid_rate_mmmin: 42000, max_feed_mmmin: 24000,
    tool_changer_capacity: 60, max_tool_diameter_mm: 80, max_tool_length_mm: 300,
    max_part_weight_kg: 300, coolant: { through_spindle: true, through_spindle_pressure_bar: 70, flood: true, mist: true, air_blast: true, mql: true, cryogenic: false },
  },
  {
    id: "tormach_1100mx", name: "Tormach 1100MX", type: "vmc",
    manufacturer: "Tormach", model: "1100MX", controller: "PathPilot",
    spindle: { base_rpm: 1500, max_rpm: 10000, rated_power_kw: 3.7, max_torque_nm: 16, taper: "BT30" },
    axes: { x_mm: 584, y_mm: 406, z_mm: 419 },
    rapid_rate_mmmin: 10160, max_feed_mmmin: 8500,
    tool_changer_capacity: 12, max_tool_diameter_mm: 63, max_tool_length_mm: 200,
    max_part_weight_kg: 113, coolant: { through_spindle: false, flood: true, mist: true, air_blast: true },
    notes: "Entry-level CNC mill for prototyping and small production",
  },
  {
    id: "datron_neo", name: "Datron neo", type: "vmc",
    manufacturer: "DATRON", model: "neo", controller: "DATRON next",
    spindle: { base_rpm: 10000, max_rpm: 60000, rated_power_kw: 2.0, max_torque_nm: 0.6, taper: "HSK-E40" },
    axes: { x_mm: 500, y_mm: 500, z_mm: 210 },
    rapid_rate_mmmin: 30000, max_feed_mmmin: 15000,
    tool_changer_capacity: 24, max_tool_diameter_mm: 16, max_tool_length_mm: 100,
    max_part_weight_kg: 50, coolant: { through_spindle: false, flood: false, mist: true, air_blast: true },
    notes: "High-speed aluminum/plastics machining, micro-milling",
  },
];

// ── Runtime storage (defaults + catalog + user-added) ──
const machines = new Map<string, MachineProfile>();
for (const m of DEFAULT_MACHINES) machines.set(m.id, m);

// Load extended catalog profiles (239 machines from monolith extraction)
import { toCatalogProfiles } from "../data/machine-profiles-catalog.js";
for (const p of toCatalogProfiles()) {
  if (!machines.has(p.id)) machines.set(p.id, p);
}

// U-REG5: Enrich with MachineRegistry (824+ machines) as third data layer
try {
  const { machineRegistry } = require("../registries/MachineRegistry.js");
  if (machineRegistry?.count && machineRegistry.count() > 0) {
    for (const entry of machineRegistry.all()) {
      if (entry.id && !machines.has(entry.id)) {
        // Map registry format to MachineProfile (minimal — just enough for lookup/validation)
        machines.set(entry.id, {
          id: entry.id,
          name: entry.name || entry.id,
          model: entry.model || entry.name || entry.id,
          manufacturer: entry.manufacturer || "unknown",
          type: entry.type || "vmc",
          spindle: {
            max_rpm: entry.max_rpm || 10000,
            rated_power_kw: entry.power_kw || 15,
            peak_power_kw: entry.peak_power_kw || (entry.power_kw ? entry.power_kw * 1.25 : 18.75),
            torque_nm_at_rpm: entry.torque_curve || [],
            drive: entry.spindle_drive || "gear",
          },
          axes: { count: entry.axes || 3, travels_mm: entry.travels_mm || { x: 500, y: 400, z: 300 } },
          rapid_rates_mm_min: entry.rapid_rates || { x: 30000, y: 30000, z: 20000 },
          rapid_rate_mmmin: entry.rapid_rate_mmmin || 30000,
          max_feed_mmmin: entry.max_feed_mmmin || 15000,
          controller: entry.controller || "fanuc",
          tool_changer_capacity: entry.atc_capacity || 20,
          max_tool_diameter_mm: entry.max_tool_diameter_mm || 80,
          max_tool_length_mm: entry.max_tool_length_mm || 300,
          max_part_weight_kg: entry.max_part_weight_kg || 500,
          coolant: entry.coolant || { flood: true },
        } as unknown as MachineProfile);
      }
    }
  }
} catch { /* MachineRegistry not loaded — use defaults + catalog only */ }

export interface ValidationResult {
  valid: boolean;
  machine: string;
  checks: Array<{
    parameter: string;
    value: number;
    limit: number;
    unit: string;
    status: "OK" | "WARNING" | "EXCEEDED";
    message: string;
  }>;
  torque_at_rpm?: { rpm: number; available_nm: number; required_nm: number; utilization_pct: number };
  power_at_rpm?: { rpm: number; available_kw: number; required_kw: number; utilization_pct: number };
}

export class MachineProfileEngine {
  /** Get a machine profile by ID. */
  get(id: string): MachineProfile | null {
    return machines.get(id) ?? null;
  }

  /** List all machines, optionally filtered by type. */
  list(type?: string): Array<{ id: string; name: string; type: string; manufacturer: string; max_rpm: number; power_kw: number }> {
    const all = [...machines.values()];
    const filtered = type ? all.filter(m => m.type === type) : all;
    return filtered.map(m => ({
      id: m.id, name: m.name, type: m.type, manufacturer: m.manufacturer,
      max_rpm: m.spindle.max_rpm, power_kw: m.spindle.rated_power_kw,
    }));
  }

  /**
   * Validate machining parameters against a specific machine's limits.
   * Returns pass/fail for each parameter with utilization %.
   */
  validate(input: {
    machine_id: string;
    rpm?: number;
    feed_rate_mmmin?: number;
    power_kw?: number;
    torque_nm?: number;
    tool_diameter_mm?: number;
    tool_length_mm?: number;
    part_weight_kg?: number;
    x_travel_mm?: number;
    y_travel_mm?: number;
    z_travel_mm?: number;
    requires_through_spindle_coolant?: boolean;
    rapid_rate_mmmin?: number;
    tool_weight_kg?: number;
  }): ValidationResult {
    const m = machines.get(input.machine_id);
    if (!m) throw new Error(`Unknown machine: ${input.machine_id}. Use list() for options.`);

    const checks: ValidationResult["checks"] = [];

    const check = (param: string, val: number | undefined, limit: number, unit: string, isMax = true) => {
      if (val === undefined) return;
      const exceeded = isMax ? val > limit : val < limit;
      const pct = (val / limit) * 100;
      const warn = isMax ? pct > 90 : pct < 110;
      checks.push({
        parameter: param, value: Math.round(val * 100) / 100, limit, unit,
        status: exceeded ? "EXCEEDED" : warn ? "WARNING" : "OK",
        message: exceeded
          ? `${param} ${val} ${unit} exceeds machine limit ${limit} ${unit}`
          : warn
            ? `${param} at ${pct.toFixed(0)}% of limit`
            : `${param} OK (${pct.toFixed(0)}% of limit)`,
      });
    };

    check("RPM", input.rpm, m.spindle.max_rpm, "RPM");
    check("Feed Rate", input.feed_rate_mmmin, m.max_feed_mmmin, "mm/min");
    check("Tool Diameter", input.tool_diameter_mm, m.max_tool_diameter_mm, "mm");
    check("Tool Length", input.tool_length_mm, m.max_tool_length_mm, "mm");
    check("Part Weight", input.part_weight_kg, m.max_part_weight_kg, "kg");
    check("X Travel", input.x_travel_mm, m.axes.x_mm, "mm");
    check("Y Travel", input.y_travel_mm, m.axes.y_mm, "mm");
    check("Z Travel", input.z_travel_mm, m.axes.z_mm, "mm");

    // ── Spindle torque/power at requested RPM ──
    let torqueCheck: ValidationResult["torque_at_rpm"];
    let powerCheck: ValidationResult["power_at_rpm"];

    if (input.rpm) {
      const sp = m.spindle;
      // Constant torque region: 0 → base_rpm → max_torque available
      // Constant power region: base_rpm → max_rpm → torque falls off as 1/RPM
      const availTorque = input.rpm <= sp.base_rpm
        ? sp.max_torque_nm
        : sp.max_torque_nm * (sp.base_rpm / input.rpm);
      const availPower = input.rpm <= sp.base_rpm
        ? sp.rated_power_kw * (input.rpm / sp.base_rpm)
        : sp.rated_power_kw;

      if (input.torque_nm) {
        const util = (input.torque_nm / availTorque) * 100;
        torqueCheck = { rpm: input.rpm, available_nm: Math.round(availTorque * 10) / 10, required_nm: input.torque_nm, utilization_pct: Math.round(util) };
        checks.push({
          parameter: "Torque", value: input.torque_nm, limit: Math.round(availTorque * 10) / 10, unit: "N·m",
          status: input.torque_nm > availTorque ? "EXCEEDED" : util > 90 ? "WARNING" : "OK",
          message: input.torque_nm > availTorque
            ? `Torque ${input.torque_nm} N·m exceeds available ${availTorque.toFixed(1)} N·m at ${input.rpm} RPM`
            : `Torque ${util.toFixed(0)}% utilized at ${input.rpm} RPM`,
        });
      }

      if (input.power_kw) {
        const util = (input.power_kw / availPower) * 100;
        powerCheck = { rpm: input.rpm, available_kw: Math.round(availPower * 10) / 10, required_kw: input.power_kw, utilization_pct: Math.round(util) };
        checks.push({
          parameter: "Power", value: input.power_kw, limit: Math.round(availPower * 10) / 10, unit: "kW",
          status: input.power_kw > availPower ? "EXCEEDED" : util > 90 ? "WARNING" : "OK",
          message: input.power_kw > availPower
            ? `Power ${input.power_kw} kW exceeds available ${availPower.toFixed(1)} kW at ${input.rpm} RPM`
            : `Power ${util.toFixed(0)}% utilized at ${input.rpm} RPM`,
        });
      }
    }

    if (input.requires_through_spindle_coolant && !m.coolant.through_spindle) {
      checks.push({
        parameter: "TSC", value: 1, limit: 0, unit: "boolean",
        status: "EXCEEDED", message: `${m.name} does not have through-spindle coolant`,
      });
    }

    // Rapid traverse rate check (P0 gap fix)
    if (input.rapid_rate_mmmin && m.rapid_rate_mmmin) {
      const maxRapid = m.rapid_rate_mmmin;
      if (input.rapid_rate_mmmin > maxRapid) {
        const pct = (input.rapid_rate_mmmin / maxRapid) * 100;
        checks.push({
          parameter: "Rapid Rate", value: input.rapid_rate_mmmin, limit: maxRapid, unit: "mm/min",
          status: "EXCEEDED",
          message: `Rapid rate ${input.rapid_rate_mmmin} mm/min exceeds machine max ${maxRapid} mm/min`,
        });
      } else {
        const pct = (input.rapid_rate_mmmin / maxRapid) * 100;
        checks.push({
          parameter: "Rapid Rate", value: input.rapid_rate_mmmin, limit: maxRapid, unit: "mm/min",
          status: pct > 90 ? "WARNING" : "OK",
          message: `Rapid rate ${pct.toFixed(0)}% of machine max`,
        });
      }
    }

    // ATC tool weight check (P0 gap fix)
    if (input.tool_weight_kg && (m as unknown as Record<string, unknown>).tool_changer_max_weight_kg) {
      const maxWeight = (m as unknown as Record<string, unknown>).tool_changer_max_weight_kg as number;
      if (input.tool_weight_kg > maxWeight) {
        checks.push({
          parameter: "Tool Weight", value: input.tool_weight_kg, limit: maxWeight, unit: "kg",
          status: "EXCEEDED",
          message: `Tool weight ${input.tool_weight_kg}kg exceeds ATC max ${maxWeight}kg`,
        });
      } else {
        const pct = (input.tool_weight_kg / maxWeight) * 100;
        checks.push({
          parameter: "Tool Weight", value: input.tool_weight_kg, limit: maxWeight, unit: "kg",
          status: pct > 90 ? "WARNING" : "OK",
          message: `Tool weight ${pct.toFixed(0)}% of ATC max`,
        });
      }
    }

    return {
      valid: checks.every(c => c.status !== "EXCEEDED"),
      machine: m.name,
      checks,
      torque_at_rpm: torqueCheck,
      power_at_rpm: powerCheck,
    };
  }

  /** Add a custom machine profile. */
  add(profile: MachineProfile): { added: boolean; id: string } {
    if (machines.has(profile.id)) {
      machines.set(profile.id, profile); // overwrite
      return { added: true, id: profile.id };
    }
    machines.set(profile.id, profile);
    return { added: true, id: profile.id };
  }

  /**
   * Enhanced spindle curve with S1/S6 duty ratings and DN bearing limit.
   * S1 = continuous duty power, S6 = 40% duty cycle (intermittent) power.
   * DN limit = bore_diameter_mm x max_rpm — bearing thermal/speed limit.
   *
   * @reference ISO 3031 (electric motors), SKF bearing catalogs
   */
  spindleCurveEnhanced(input: {
    max_rpm: number;
    base_rpm: number;
    rated_power_kw: number;
    max_torque_nm: number;
    taper?: string;
    bearing_type?: 'angular_contact' | 'ceramic_hybrid' | 'hydrostatic';
  }): {
    curve: { rpm: number; torque_nm: number; power_kw: number; s1_power_kw: number }[];
    s1_continuous_kw: number;
    s6_40pct_kw: number;
    dn_limit: number;
    max_safe_rpm: number;
    bearing_bore_mm: number;
    thermal_derating: { rpm: number; factor: number }[];
  } {
    const { max_rpm, base_rpm, rated_power_kw, max_torque_nm, taper, bearing_type } = input;

    // S1 continuous = 75% of rated (industry standard for continuous duty)
    const s1_continuous_kw = rated_power_kw * 0.75;
    // S6 40% duty = rated power (rated IS the S6 value for most spindles)
    const s6_40pct_kw = rated_power_kw * 1.0;

    // Bearing bore inferred from taper
    const taperBoreMap: Record<string, number> = {
      'BT30': 25, 'BT40': 40, 'BT50': 69,
      'CAT40': 44, 'CAT50': 69,
      'HSK-A63': 45, 'HSK-A100': 70, 'HSK-F63': 45, 'HSK-E40': 30, 'HSK-E25': 20,
      'R8': 20, 'MT3': 18, 'MT4': 22, 'MT5': 30,
      'A2-5': 80, 'A2-6': 105, 'A2-8': 140,
    };
    const bearing_bore_mm = taperBoreMap[taper ?? ''] ?? 40;

    // DN limit by bearing type
    const dnLimitMap: Record<string, number> = {
      'angular_contact': 1500000,
      'ceramic_hybrid': 2500000,
      'hydrostatic': 3000000,
    };
    const dn_limit = dnLimitMap[bearing_type ?? 'angular_contact'] ?? 1500000;
    const max_safe_rpm = Math.floor(dn_limit / bearing_bore_mm);

    // Thermal derating: above 80% of max_rpm, linearly derate up to 15%
    const thermal_derating: { rpm: number; factor: number }[] = [];
    for (let pct = 0.8; pct <= 1.0; pct += 0.04) {
      const rpmPoint = Math.round(max_rpm * pct);
      const factor = 1 - 0.15 * (pct - 0.8) / 0.2;
      thermal_derating.push({ rpm: rpmPoint, factor: Math.round(factor * 1000) / 1000 });
    }

    // Generate 20-point curve with S1 power at each RPM
    const n = 20;
    const step = max_rpm / n;
    const curve: { rpm: number; torque_nm: number; power_kw: number; s1_power_kw: number }[] = [];

    for (let i = 1; i <= n; i++) {
      const rpm = Math.round(step * i);
      const torque = rpm <= base_rpm ? max_torque_nm : max_torque_nm * (base_rpm / rpm);
      const power = rpm <= base_rpm ? rated_power_kw * (rpm / base_rpm) : rated_power_kw;

      // Apply thermal derating to S1 power at high RPM
      const rpmRatio = rpm / max_rpm;
      const derateFactor = rpmRatio > 0.8
        ? 1 - 0.15 * (rpmRatio - 0.8) / 0.2
        : 1.0;
      const s1_power_kw = Math.round(s1_continuous_kw * derateFactor * 100) / 100;

      curve.push({
        rpm,
        torque_nm: Math.round(torque * 10) / 10,
        power_kw: Math.round(power * 10) / 10,
        s1_power_kw,
      });
    }

    return {
      curve,
      s1_continuous_kw: Math.round(s1_continuous_kw * 100) / 100,
      s6_40pct_kw: Math.round(s6_40pct_kw * 100) / 100,
      dn_limit,
      max_safe_rpm,
      bearing_bore_mm,
      thermal_derating,
    };
  }

  /** Get spindle torque curve data points for a machine (for plotting). */
  spindleCurve(machine_id: string, points?: number): Array<{ rpm: number; torque_nm: number; power_kw: number }> {
    const m = machines.get(machine_id);
    if (!m) throw new Error(`Unknown machine: ${machine_id}`);
    const sp = m.spindle;
    const n = points ?? 20;
    const step = sp.max_rpm / n;
    const data: Array<{ rpm: number; torque_nm: number; power_kw: number }> = [];

    for (let rpm = step; rpm <= sp.max_rpm; rpm += step) {
      const torque = rpm <= sp.base_rpm ? sp.max_torque_nm : sp.max_torque_nm * (sp.base_rpm / rpm);
      const power = rpm <= sp.base_rpm ? sp.rated_power_kw * (rpm / sp.base_rpm) : sp.rated_power_kw;
      data.push({ rpm: Math.round(rpm), torque_nm: Math.round(torque * 10) / 10, power_kw: Math.round(power * 10) / 10 });
    }
    return data;
  }
}

export const machineProfileEngine = new MachineProfileEngine();
