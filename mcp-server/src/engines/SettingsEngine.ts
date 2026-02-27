/**
 * SettingsEngine — User/System Configuration Management
 *
 * L2-P0-MS1: Ported from monolith settings module.
 * Manages user preferences, machine defaults, calculation presets,
 * unit systems, and application configuration.
 */

// ── Types ─────────────────────────────────────────────────────────────

export type UnitSystem = "metric" | "imperial";
export type AngleUnit = "degrees" | "radians";
export type PressureUnit = "bar" | "psi" | "MPa";
export type TemperatureUnit = "celsius" | "fahrenheit" | "kelvin";

export interface UnitPreferences {
  system: UnitSystem;
  length: "mm" | "in";
  speed: "m/min" | "sfm";
  feed_per_tooth: "mm/tooth" | "in/tooth";
  feed_rate: "mm/min" | "in/min" | "mm/rev" | "in/rev";
  force: "N" | "lbf" | "kgf";
  pressure: PressureUnit;
  temperature: TemperatureUnit;
  angle: AngleUnit;
  power: "kW" | "hp";
  torque: "Nm" | "ft-lbf";
}

export interface MachineDefaults {
  max_spindle_rpm: number;
  max_feed_rate: number;
  max_power_kw: number;
  spindle_taper: string;
  coolant_type: "flood" | "mist" | "through_spindle" | "air" | "mql" | "none";
  axes: number;
  controller: string;
}

export interface CalculationPreset {
  id: string;
  name: string;
  description: string;
  settings: Record<string, any>;
}

export interface SafetySettings {
  max_spindle_rpm_override: number | null;
  max_feed_override: number | null;
  force_limit_N: number;
  deflection_limit_mm: number;
  temperature_limit_C: number;
  require_collision_check: boolean;
  require_safety_validation: boolean;
}

export interface UserSettings {
  user_id: string;
  units: UnitPreferences;
  machine_defaults: MachineDefaults;
  safety: SafetySettings;
  presets: CalculationPreset[];
  display: {
    decimal_places: number;
    scientific_notation_threshold: number;
    show_warnings: boolean;
    show_safety_badges: boolean;
    theme: "light" | "dark" | "system";
    language: string;
  };
  created_at: string;
  updated_at: string;
}

// ── Unit conversion factors ───────────────────────────────────────────

const CONVERSIONS: Record<string, Record<string, number>> = {
  length: { "mm_to_in": 1 / 25.4, "in_to_mm": 25.4 },
  speed: { "m/min_to_sfm": 3.28084, "sfm_to_m/min": 1 / 3.28084 },
  force: { "N_to_lbf": 0.224809, "lbf_to_N": 4.44822, "N_to_kgf": 0.101972, "kgf_to_N": 9.80665 },
  pressure: { "bar_to_psi": 14.5038, "psi_to_bar": 1 / 14.5038, "bar_to_MPa": 0.1, "MPa_to_bar": 10 },
  temperature: {}, // Special handling
  power: { "kW_to_hp": 1.34102, "hp_to_kW": 0.745700 },
  torque: { "Nm_to_ft-lbf": 0.737562, "ft-lbf_to_Nm": 1.35582 },
};

// ── Default settings ──────────────────────────────────────────────────

const DEFAULT_SETTINGS: UserSettings = {
  user_id: "default",
  units: {
    system: "metric",
    length: "mm",
    speed: "m/min",
    feed_per_tooth: "mm/tooth",
    feed_rate: "mm/min",
    force: "N",
    pressure: "bar",
    temperature: "celsius",
    angle: "degrees",
    power: "kW",
    torque: "Nm",
  },
  machine_defaults: {
    max_spindle_rpm: 15000,
    max_feed_rate: 10000,
    max_power_kw: 22,
    spindle_taper: "BT40",
    coolant_type: "flood",
    axes: 3,
    controller: "fanuc",
  },
  safety: {
    max_spindle_rpm_override: null,
    max_feed_override: null,
    force_limit_N: 10000,
    deflection_limit_mm: 0.05,
    temperature_limit_C: 800,
    require_collision_check: true,
    require_safety_validation: true,
  },
  presets: [
    { id: "conservative", name: "Conservative", description: "Safe starting parameters for new setups", settings: { speed_factor: 0.7, feed_factor: 0.7, depth_factor: 0.5 } },
    { id: "standard", name: "Standard", description: "Balanced productivity and tool life", settings: { speed_factor: 1.0, feed_factor: 1.0, depth_factor: 1.0 } },
    { id: "aggressive", name: "Aggressive", description: "Maximum productivity, experienced operators", settings: { speed_factor: 1.3, feed_factor: 1.2, depth_factor: 1.5 } },
    { id: "finishing", name: "Finishing", description: "Optimized for surface finish", settings: { speed_factor: 1.2, feed_factor: 0.5, depth_factor: 0.3 } },
  ],
  display: {
    decimal_places: 3,
    scientific_notation_threshold: 1e6,
    show_warnings: true,
    show_safety_badges: true,
    theme: "system",
    language: "en",
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ── Engine ────────────────────────────────────────────────────────────

export class SettingsEngine {
  private settings: Map<string, UserSettings> = new Map();

  constructor() {
    this.settings.set("default", { ...DEFAULT_SETTINGS });
  }

  /** Get settings for a user (falls back to defaults) */
  getSettings(user_id: string = "default"): UserSettings {
    return this.settings.get(user_id) ?? { ...DEFAULT_SETTINGS, user_id };
  }

  /** Update settings for a user */
  updateSettings(user_id: string, patch: Partial<UserSettings>): UserSettings {
    const current = this.getSettings(user_id);
    const updated: UserSettings = {
      ...current,
      ...patch,
      user_id,
      units: { ...current.units, ...(patch.units ?? {}) },
      machine_defaults: { ...current.machine_defaults, ...(patch.machine_defaults ?? {}) },
      safety: { ...current.safety, ...(patch.safety ?? {}) },
      display: { ...current.display, ...(patch.display ?? {}) },
      updated_at: new Date().toISOString(),
    };
    this.settings.set(user_id, updated);
    return updated;
  }

  /** Get default settings template */
  getDefaults(): UserSettings {
    return { ...DEFAULT_SETTINGS };
  }

  /** Convert a value between unit systems */
  convertUnit(value: number, from: string, to: string, category: string): { value: number; from: string; to: string } {
    if (from === to) return { value, from, to };

    // Temperature special cases
    if (category === "temperature") {
      let celsius: number;
      if (from === "celsius") celsius = value;
      else if (from === "fahrenheit") celsius = (value - 32) * 5 / 9;
      else celsius = value - 273.15; // kelvin

      let result: number;
      if (to === "celsius") result = celsius;
      else if (to === "fahrenheit") result = celsius * 9 / 5 + 32;
      else result = celsius + 273.15; // kelvin

      return { value: result, from, to };
    }

    const key = `${from}_to_${to}`;
    const catConversions = CONVERSIONS[category];
    if (catConversions && catConversions[key]) {
      return { value: value * catConversions[key], from, to };
    }

    return { value, from, to }; // No conversion found
  }

  /** Convert all values in a result object to the user's unit system */
  convertResults(results: Record<string, number>, fromSystem: UnitSystem, toUser: string = "default"): Record<string, { value: number; unit: string }> {
    const settings = this.getSettings(toUser);
    if (fromSystem === settings.units.system) {
      return Object.fromEntries(
        Object.entries(results).map(([k, v]) => [k, { value: v, unit: fromSystem === "metric" ? "metric" : "imperial" }])
      );
    }

    const converted: Record<string, { value: number; unit: string }> = {};
    for (const [key, val] of Object.entries(results)) {
      const category = this.inferCategory(key);
      if (category) {
        const fromUnit = fromSystem === "metric" ? this.metricUnit(category) : this.imperialUnit(category);
        const toUnit = fromSystem === "metric" ? this.imperialUnit(category) : this.metricUnit(category);
        converted[key] = { ...this.convertUnit(val, fromUnit, toUnit, category), unit: toUnit };
      } else {
        converted[key] = { value: val, unit: "dimensionless" };
      }
    }
    return converted;
  }

  /** List available presets */
  listPresets(user_id: string = "default"): CalculationPreset[] {
    return this.getSettings(user_id).presets;
  }

  /** Get a specific preset */
  getPreset(user_id: string, preset_id: string): CalculationPreset | null {
    return this.getSettings(user_id).presets.find(p => p.id === preset_id) ?? null;
  }

  /** Apply a preset to get modified calculation parameters */
  applyPreset(preset_id: string, base_params: Record<string, number>, user_id: string = "default"): Record<string, number> {
    const preset = this.getPreset(user_id, preset_id);
    if (!preset) return base_params;

    const result = { ...base_params };
    for (const [key, factor] of Object.entries(preset.settings)) {
      if (key.endsWith("_factor") && typeof factor === "number") {
        const paramKey = key.replace("_factor", "");
        if (result[paramKey] !== undefined) {
          result[paramKey] *= factor;
        }
      }
    }
    return result;
  }

  /** Get machine safety limits */
  getSafetyLimits(user_id: string = "default"): SafetySettings {
    return this.getSettings(user_id).safety;
  }

  /** Validate parameters against safety limits */
  checkSafetyLimits(params: { rpm?: number; force_N?: number; deflection_mm?: number; temperature_C?: number }, user_id: string = "default"): { safe: boolean; violations: string[] } {
    const safety = this.getSafetyLimits(user_id);
    const violations: string[] = [];

    if (params.rpm !== undefined && safety.max_spindle_rpm_override !== null && params.rpm > safety.max_spindle_rpm_override) {
      violations.push(`RPM ${params.rpm} exceeds limit ${safety.max_spindle_rpm_override}`);
    }
    if (params.force_N !== undefined && params.force_N > safety.force_limit_N) {
      violations.push(`Force ${params.force_N} N exceeds limit ${safety.force_limit_N} N`);
    }
    if (params.deflection_mm !== undefined && params.deflection_mm > safety.deflection_limit_mm) {
      violations.push(`Deflection ${params.deflection_mm} mm exceeds limit ${safety.deflection_limit_mm} mm`);
    }
    if (params.temperature_C !== undefined && params.temperature_C > safety.temperature_limit_C) {
      violations.push(`Temperature ${params.temperature_C} °C exceeds limit ${safety.temperature_limit_C} °C`);
    }

    return { safe: violations.length === 0, violations };
  }

  /** Infer physical category from parameter name */
  private inferCategory(key: string): string | null {
    if (/diameter|length|depth|width|radius|overhang|stickout/i.test(key)) return "length";
    if (/speed|velocity/i.test(key)) return "speed";
    if (/force/i.test(key)) return "force";
    if (/pressure|stress/i.test(key)) return "pressure";
    if (/temp/i.test(key)) return "temperature";
    if (/power/i.test(key)) return "power";
    if (/torque/i.test(key)) return "torque";
    return null;
  }

  private metricUnit(category: string): string {
    const map: Record<string, string> = { length: "mm", speed: "m/min", force: "N", pressure: "bar", temperature: "celsius", power: "kW", torque: "Nm" };
    return map[category] ?? category;
  }

  private imperialUnit(category: string): string {
    const map: Record<string, string> = { length: "in", speed: "sfm", force: "lbf", pressure: "psi", temperature: "fahrenheit", power: "hp", torque: "ft-lbf" };
    return map[category] ?? category;
  }
}

export const settingsEngine = new SettingsEngine();
