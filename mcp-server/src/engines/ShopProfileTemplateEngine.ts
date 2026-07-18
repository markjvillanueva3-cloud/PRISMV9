/**
 * ShopProfileTemplateEngine — template-first shop rate-table store
 *
 * Operator directive: "build with template in mind since what we build now
 * for JM will carry over to other shops." This engine is THE shop-agnostic
 * surface for every quote-time rate lookup (machine $/hr, electricity $/kWh,
 * labor $/hr by skill, overhead %, secondary-op rate tables, setup $/hr).
 *
 * Profiles live at `state/shared/shop-profiles/<id>.json` keyed by profile_id.
 * Default profile = "jm-die" (the canonical test shop per CLAUDE.md). When
 * the file is missing or malformed, engine falls back to BUILT-IN defaults
 * calibrated against published shop-rate benchmarks (AMT 2024 + MFG.com).
 *
 * Pure engine. Profile reads are lazy + cached. NO inline machine constants
 * in business logic — everything routed through profile lookups.
 *
 * @milestone QUOTING-SYNERGY-MS0/U-SHOP-PROFILE-TEMPLATE (charlie /goal-20 iter11)
 */

import { promises as fs } from "node:fs";
import { resolve, join } from "node:path";

export type SkillTier = "apprentice" | "operator" | "senior" | "master" | "programmer";

export interface MachineRate {
  /** Machine family identifier (e.g., "haas_vf2", "okuma_lb3000", "sodick_aq537l"). */
  family: string;
  /** Domain — drives wizard routing. */
  domain: "mill" | "lathe" | "wedm" | "sinker_edm" | "grinder";
  /** Billable machine rate $/hr (overhead-loaded). */
  rate_usd_per_hr: number;
  /** Machine power draw in kW (for electricity calc). */
  power_kw: number;
  /** Avg uptime fraction (real cycle / wall-clock). */
  utilization_pct: number;
  /** OPTIONAL — utility consumption rates (U-UTILITY-COSTS-EXTENDED, iter15).
   *  When unset, machine consumes ZERO of the corresponding utility.
   *  Active per-cycle; load_factor not applied (these are typically demand-driven, not power-derated). */
  water_gph?: number;             // gallons per hour (coolant make-up, chiller, washdown)
  compressed_air_cfh?: number;    // cubic feet per hour (way-blow, chip clear, pneumatic tooling)
  natural_gas_therms_per_hr?: number;  // therms per hour (HT ovens, heat-treat, paint booth burners)
}

export interface LaborRate {
  tier: SkillTier;
  /** $/hr fully loaded (wage + payroll tax + benefits). */
  rate_usd_per_hr: number;
}

export interface ShopProfile {
  profile_id: string;
  shop_name: string;
  schema_version: string;
  /** Electricity rate from the utility bill — JM Die default $0.13/kWh (US industrial 2024). */
  electricity_usd_per_kwh: number;
  /** Default overhead applied above direct cost. */
  overhead_pct: number;
  /** Setup hourly rate (typically programmer or senior operator). */
  setup_rate_usd_per_hr: number;
  /** Default machine rate when no specific family matched. */
  default_machine_rate_usd_per_hr: number;
  machines: MachineRate[];
  labor: LaborRate[];
  /** Optional secondary-ops rate overrides (per-shop adjustments to defaults). */
  secondary_op_overrides?: Record<string, { setup_usd?: number; per_part_usd?: number }>;
  /** U-UTILITY-COSTS-EXTENDED (iter15) — additional utility rates beyond electricity.
   *  Defaults to US industrial 2024 typical rates when unset on the profile JSON. */
  water_usd_per_gallon?: number;            // US industrial 2024 typical ~$0.012/gal incl. sewer
  compressed_air_usd_per_cfh?: number;      // typical ~$0.0008/cfh derived from kWh-per-cfh × $/kWh
  natural_gas_usd_per_therm?: number;       // US industrial 2024 typical ~$0.65/therm
}

const DEFAULT_PROFILES_DIR = resolve(process.cwd(), "state/shared/shop-profiles");
const CACHE_TTL_MS = 60_000;

/** JM Die canonical defaults — calibrated against published JM shop data + industry-typical 2024 rates. */
const JM_DIE_FALLBACK: ShopProfile = {
  profile_id: "jm-die",
  shop_name: "JM Die Company",
  schema_version: "1.0.0",
  electricity_usd_per_kwh: 0.13,
  // U-UTILITY-COSTS-EXTENDED (iter15) — US industrial 2024 typical defaults
  water_usd_per_gallon: 0.012,
  compressed_air_usd_per_cfh: 0.0008,
  natural_gas_usd_per_therm: 0.65,
  overhead_pct: 15,
  setup_rate_usd_per_hr: 85,
  default_machine_rate_usd_per_hr: 95,
  machines: [
    // Per-machine utility consumption — mills/lathes use coolant water + air; WEDM uses dielectric water;
    // sinker EDM uses dielectric oil (no water); grinder uses coolant; ovens (HT) would use natural gas.
    { family: "haas_vf2",        domain: "mill",       rate_usd_per_hr: 85,  power_kw: 22, utilization_pct: 0.78, water_gph: 3,  compressed_air_cfh: 20 },
    { family: "okuma_lb3000",    domain: "lathe",      rate_usd_per_hr: 95,  power_kw: 30, utilization_pct: 0.82, water_gph: 4,  compressed_air_cfh: 25 },
    { family: "sodick_aq537l",   domain: "wedm",       rate_usd_per_hr: 75,  power_kw: 14, utilization_pct: 0.72, water_gph: 12, compressed_air_cfh: 5  },
    { family: "ag_charm_form20", domain: "sinker_edm", rate_usd_per_hr: 80,  power_kw: 18, utilization_pct: 0.65, water_gph: 0,  compressed_air_cfh: 5  },
    { family: "studer_s33",      domain: "grinder",    rate_usd_per_hr: 110, power_kw: 24, utilization_pct: 0.70, water_gph: 8,  compressed_air_cfh: 15 },
  ],
  labor: [
    { tier: "apprentice",  rate_usd_per_hr: 28 },
    { tier: "operator",    rate_usd_per_hr: 42 },
    { tier: "senior",      rate_usd_per_hr: 58 },
    { tier: "master",      rate_usd_per_hr: 75 },
    { tier: "programmer",  rate_usd_per_hr: 88 },
  ],
};

export interface ElectricityCostInput {
  machine_family: string;
  cycle_time_hr: number;
  /** Optional load factor (0..1) — derate when machine isn't at full power throughout cycle. Default 0.65. */
  load_factor?: number;
}

export interface ElectricityCostResult {
  ok: boolean;
  reason?: string;
  cost_usd: number;
  kwh_consumed: number;
  rate_usd_per_kwh: number;
  machine_power_kw: number;
  load_factor: number;
}

// U-UTILITY-COSTS-EXTENDED (iter15) — extended utilities aggregator
export interface UtilitiesCostInput {
  machine_family: string;
  cycle_time_hr: number;
  load_factor?: number;
}

export interface UtilitiesCostResult {
  ok: boolean;
  reason?: string;
  electricity_cost_usd: number;
  water_cost_usd: number;
  compressed_air_cost_usd: number;
  natural_gas_cost_usd: number;
  total_utilities_cost_usd: number;
  /** Per-utility consumption breakdown for audit. */
  breakdown: {
    kwh: number;
    gallons_water: number;
    cubic_feet_air: number;
    therms_gas: number;
  };
}

export class ShopProfileTemplateEngine {
  private profilesDir: string;
  private cache = new Map<string, { profile: ShopProfile; ts: number }>();

  constructor(opts: { profilesDir?: string } = {}) {
    this.profilesDir = opts.profilesDir ?? DEFAULT_PROFILES_DIR;
  }

  /** Load a profile by id. Returns fallback when file missing/malformed. */
  async getProfile(profileId = "jm-die"): Promise<ShopProfile> {
    const cached = this.cache.get(profileId);
    if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS) return cached.profile;

    let profile = await this.readFromDisk(profileId);
    if (!profile) {
      profile = profileId === "jm-die" ? { ...JM_DIE_FALLBACK } : { ...JM_DIE_FALLBACK, profile_id: profileId, shop_name: profileId };
    }
    this.cache.set(profileId, { profile, ts: Date.now() });
    return profile;
  }

  /** Synchronous getter — returns built-in JM Die fallback. Use when async load not possible. */
  getDefault(): ShopProfile {
    return { ...JM_DIE_FALLBACK };
  }

  /** Lookup machine rate by family — falls back to default_machine_rate_usd_per_hr when not found. */
  getMachineRate(profile: ShopProfile, family: string): { rate_usd_per_hr: number; power_kw: number; source: "matched" | "default" } {
    const match = profile.machines.find(m => m.family.toLowerCase() === family.toLowerCase());
    if (match) return { rate_usd_per_hr: match.rate_usd_per_hr, power_kw: match.power_kw, source: "matched" };
    return { rate_usd_per_hr: profile.default_machine_rate_usd_per_hr, power_kw: 20, source: "default" };
  }

  /** Lookup labor rate by skill tier — fallback to operator rate when tier not found. */
  getLaborRate(profile: ShopProfile, tier: SkillTier): number {
    const match = profile.labor.find(l => l.tier === tier);
    if (match) return match.rate_usd_per_hr;
    const operator = profile.labor.find(l => l.tier === "operator");
    return operator?.rate_usd_per_hr ?? 42;
  }

  /**
   * U-UTILITY-COSTS-EXTENDED (iter15): aggregate cost of ALL utilities consumed
   * during one machine cycle — electricity + water + compressed air + natural gas.
   *
   * Per-utility consumption rates live on `MachineRate.{water_gph, compressed_air_cfh,
   * natural_gas_therms_per_hr}`. When unset, machine consumes zero of that utility.
   * Per-utility prices live on `ShopProfile.{water_usd_per_gallon, ...}`. When
   * unset, that utility contributes zero cost (no implicit guess on operator's bill).
   *
   * Note: load_factor only applies to ELECTRICITY (power-derated during partial
   * loads). Water/air/gas are demand-driven and assumed on-or-off — applied as
   * full hourly rate × cycle_time_hr. This is the conservative assumption matching
   * how operators read their utility bill (not a Watt-hours-style derate).
   */
  utilitiesCost(profile: ShopProfile, input: UtilitiesCostInput): UtilitiesCostResult {
    const empty: UtilitiesCostResult = {
      ok: false, electricity_cost_usd: 0, water_cost_usd: 0,
      compressed_air_cost_usd: 0, natural_gas_cost_usd: 0,
      total_utilities_cost_usd: 0,
      breakdown: { kwh: 0, gallons_water: 0, cubic_feet_air: 0, therms_gas: 0 },
    };
    if (!Number.isFinite(input.cycle_time_hr) || input.cycle_time_hr < 0) {
      return { ...empty, reason: "cycle_time_hr must be non-negative finite" };
    }

    // Electricity — reuse the existing electricityCost() so load_factor logic stays one source of truth.
    const elec = this.electricityCost(profile, input);

    // Find the machine entry to read consumption rates; fall back to zero when machine not in profile.
    const machineEntry = profile.machines.find(m => m.family.toLowerCase() === input.machine_family.toLowerCase());
    const waterGph = machineEntry?.water_gph ?? 0;
    const airCfh = machineEntry?.compressed_air_cfh ?? 0;
    const gasThermsPerHr = machineEntry?.natural_gas_therms_per_hr ?? 0;

    const gallons = waterGph * input.cycle_time_hr;
    const cubicFeet = airCfh * input.cycle_time_hr;
    const therms = gasThermsPerHr * input.cycle_time_hr;

    const waterRate = profile.water_usd_per_gallon ?? 0;
    const airRate = profile.compressed_air_usd_per_cfh ?? 0;
    const gasRate = profile.natural_gas_usd_per_therm ?? 0;

    const waterCost = round2(gallons * waterRate);
    const airCost = round2(cubicFeet * airRate);
    const gasCost = round2(therms * gasRate);
    const electricityCost = elec.ok ? elec.cost_usd : 0;
    const total = round2(electricityCost + waterCost + airCost + gasCost);

    return {
      ok: true,
      electricity_cost_usd: electricityCost,
      water_cost_usd: waterCost,
      compressed_air_cost_usd: airCost,
      natural_gas_cost_usd: gasCost,
      total_utilities_cost_usd: total,
      breakdown: {
        kwh: elec.ok ? elec.kwh_consumed : 0,
        gallons_water: round2(gallons),
        cubic_feet_air: round2(cubicFeet),
        therms_gas: round2(therms),
      },
    };
  }

  /** Compute electricity cost for a machine cycle. */
  electricityCost(profile: ShopProfile, input: ElectricityCostInput): ElectricityCostResult {
    if (!Number.isFinite(input.cycle_time_hr) || input.cycle_time_hr < 0) {
      return { ok: false, reason: "cycle_time_hr must be non-negative finite", cost_usd: 0, kwh_consumed: 0, rate_usd_per_kwh: profile.electricity_usd_per_kwh, machine_power_kw: 0, load_factor: 0 };
    }
    const machine = this.getMachineRate(profile, input.machine_family);
    const loadFactor = Number.isFinite(input.load_factor) && input.load_factor! >= 0 && input.load_factor! <= 1
      ? input.load_factor!
      : 0.65;
    const kwh = machine.power_kw * input.cycle_time_hr * loadFactor;
    const cost = kwh * profile.electricity_usd_per_kwh;
    return {
      ok: true,
      cost_usd: round2(cost),
      kwh_consumed: round2(kwh),
      rate_usd_per_kwh: profile.electricity_usd_per_kwh,
      machine_power_kw: machine.power_kw,
      load_factor: loadFactor,
    };
  }

  /** List all profile IDs known on disk. */
  async listProfiles(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.profilesDir);
      return entries.filter(e => e.endsWith(".json")).map(e => e.replace(/\.json$/, ""));
    } catch {
      return ["jm-die"];
    }
  }

  /** Force a profile reread on next call. */
  refresh(): void { this.cache.clear(); }

  private async readFromDisk(profileId: string): Promise<ShopProfile | null> {
    const path = join(this.profilesDir, `${profileId}.json`);
    try {
      const raw = await fs.readFile(path, "utf-8");
      const parsed = JSON.parse(raw) as Partial<ShopProfile>;
      if (!parsed || typeof parsed.profile_id !== "string") return null;
      // Shape validation — fallback for missing required arrays
      const profile: ShopProfile = {
        profile_id: parsed.profile_id,
        shop_name: parsed.shop_name ?? parsed.profile_id,
        schema_version: parsed.schema_version ?? "1.0.0",
        electricity_usd_per_kwh: typeof parsed.electricity_usd_per_kwh === "number" ? parsed.electricity_usd_per_kwh : JM_DIE_FALLBACK.electricity_usd_per_kwh,
        overhead_pct: typeof parsed.overhead_pct === "number" ? parsed.overhead_pct : JM_DIE_FALLBACK.overhead_pct,
        setup_rate_usd_per_hr: typeof parsed.setup_rate_usd_per_hr === "number" ? parsed.setup_rate_usd_per_hr : JM_DIE_FALLBACK.setup_rate_usd_per_hr,
        default_machine_rate_usd_per_hr: typeof parsed.default_machine_rate_usd_per_hr === "number" ? parsed.default_machine_rate_usd_per_hr : JM_DIE_FALLBACK.default_machine_rate_usd_per_hr,
        machines: Array.isArray(parsed.machines) && parsed.machines.length > 0 ? parsed.machines : JM_DIE_FALLBACK.machines,
        labor: Array.isArray(parsed.labor) && parsed.labor.length > 0 ? parsed.labor : JM_DIE_FALLBACK.labor,
        secondary_op_overrides: parsed.secondary_op_overrides,
        // U-UTILITY-COSTS-EXTENDED (iter15) — preserve only when explicitly set, else fall back to JM defaults
        water_usd_per_gallon: typeof parsed.water_usd_per_gallon === "number" ? parsed.water_usd_per_gallon : JM_DIE_FALLBACK.water_usd_per_gallon,
        compressed_air_usd_per_cfh: typeof parsed.compressed_air_usd_per_cfh === "number" ? parsed.compressed_air_usd_per_cfh : JM_DIE_FALLBACK.compressed_air_usd_per_cfh,
        natural_gas_usd_per_therm: typeof parsed.natural_gas_usd_per_therm === "number" ? parsed.natural_gas_usd_per_therm : JM_DIE_FALLBACK.natural_gas_usd_per_therm,
      };
      return profile;
    } catch {
      return null;
    }
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

export const shopProfileTemplateEngine = new ShopProfileTemplateEngine();
export default shopProfileTemplateEngine;
