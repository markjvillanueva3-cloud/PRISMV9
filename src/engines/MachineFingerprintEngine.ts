/**
 * MachineFingerprintEngine — Machine Make/Model/Year → Post Config Resolution
 *
 * PP-MS2 U-PP11: Given a machine manufacturer, model, and optional year/controller
 * override, resolves to a RecommendedPostConfig using ranked fallback:
 *
 *   1. Exact match in EXTENDED_MACHINE_CATALOG (910+ machines)
 *   2. Fuzzy match on model name against catalog
 *   3. Year-based controller default (old Haas → fanuc_0i, modern → haas_ngc)
 *   4. Manufacturer-based default controller family
 *   5. Ultimate fallback: generic_fanuc
 *
 * The output config can feed directly into PostProcessorPipelineEngine or
 * MasterPostProcessorEngine for G-code generation.
 *
 * Reference: Machine controller lineage derived from manufacturer documentation
 * and the 910-machine PRISM catalog (machine-profiles-catalog.ts).
 *
 * @module MachineFingerprintEngine
 */

import {
  EXTENDED_MACHINE_CATALOG,
  type ExtendedMachineProfile,
} from "../data/machine-profiles-catalog.js";
import type { ControllerFamily } from "./ControllerDialectEngine.js";

// ─── Output Interfaces ──────────────────────────────────────────────

export interface MachineFingerprintInput {
  manufacturer: string;
  model: string;
  year?: number;
  controller_override?: ControllerFamily;
}

export type ResolutionMethod =
  | "exact_catalog"
  | "fuzzy_catalog"
  | "year_based"
  | "manufacturer_default"
  | "controller_override"
  | "fallback";

export interface RecommendedPostConfig {
  /** Resolved PRISM controller family */
  controller_family: ControllerFamily;
  /** How the controller was resolved */
  resolution_method: ResolutionMethod;
  /** Confidence in the resolution (0-1) */
  confidence: number;
  /** Matched machine profile (if found in catalog) */
  matched_profile?: {
    brand: string;
    model: string;
    type: string;
    controller: string;
    max_rpm: number;
    taper: string;
    tool_capacity: number;
    axis_count: number;
  };
  /** Axis configuration derived from machine profile */
  axis_config: "3axis" | "4axis" | "5axis";
  /** Machine type for process routing */
  machine_type: ExtendedMachineProfile["type"];
  /** Recommended features based on machine capabilities */
  recommended_features: {
    probing: boolean;
    tsc: boolean;
    hsm: boolean;
    tcp: boolean;
    ssv: boolean;
    subprograms: boolean;
    chip_conveyor: boolean;
  };
  /** Warnings for edge cases */
  warnings: string[];
}

// ─── Manufacturer → Controller Family Defaults ──────────────────────

/**
 * Manufacturer → default ControllerFamily mapping.
 * Used when no exact/fuzzy catalog match and no year-based resolution.
 * Derived from manufacturer standard controller partnerships.
 */
const MANUFACTURER_DEFAULTS: Record<string, ControllerFamily> = {
  haas: "haas_ngc",
  "dmg mori": "dmg_celos_siemens",
  dmg: "dmg_celos_siemens",
  mazak: "mazak_smooth_ai",
  okuma: "okuma_osp_p300",
  makino: "fanuc_31i",
  hermle: "siemens_840d",
  doosan: "fanuc_31i",
  brother: "brother_speedio",
  citizen: "citizen_cincom",
  star: "star_fanuc",
  hurco: "hurco_max5",
  fanuc: "fanuc_31i",
  siemens: "siemens_840d",
  heidenhain: "heidenhain_tnc640",
  matsuura: "fanuc_31i",
  mori: "dmg_celos_siemens",
  kitamura: "fanuc_31i",
  toyoda: "fanuc_31i",
  "jtekt toyoda": "fanuc_31i",
  hyundai: "fanuc_31i",
  "hyundai wia": "fanuc_31i",
  hwacheon: "fanuc_31i",
  mitsubishi: "mitsubishi_m80",
  fagor: "fagor_8065",
  tormach: "generic_fanuc",
  datron: "siemens_840d",
  grob: "siemens_840d",
  chiron: "siemens_840d",
  kern: "heidenhain_tnc640",
  deckel: "heidenhain_tnc640",
  maho: "heidenhain_tnc640",
  spinner: "siemens_828d",
  hardinge: "fanuc_31i",
  bridgeport: "fanuc_0i",
  "flow waterjet": "generic_fanuc",
  omax: "generic_fanuc",
  trumpf: "siemens_840d",
  bystronic: "generic_fanuc",
  sodick: "generic_fanuc",
  "agie charmilles": "generic_fanuc",
  gf: "generic_fanuc",
};

/**
 * Controller string from machine catalog → ControllerFamily mapping.
 * The catalog stores controller as human-readable strings; we map to PRISM dialect IDs.
 */
const CONTROLLER_STRING_MAP: Record<string, ControllerFamily> = {
  "haas ngc": "haas_ngc",
  "haas next generation": "haas_ngc",
  "fanuc 0i-mf": "fanuc_0i",
  "fanuc 0i": "fanuc_0i",
  "fanuc 16i": "fanuc_16i",
  "fanuc 18i": "fanuc_18i",
  "fanuc 30i": "fanuc_30i",
  "fanuc 31i": "fanuc_31i",
  "fanuc 31i-b5": "fanuc_31i",
  "fanuc 31i-a5": "fanuc_31i",
  "siemens 840d sl": "siemens_840d",
  "siemens 840d": "siemens_840d",
  "siemens 828d": "siemens_828d",
  "sinumerik one": "siemens_one",
  "sinumerik 840d sl": "siemens_840d",
  "heidenhain tnc 640": "heidenhain_tnc640",
  "heidenhain tnc 7": "heidenhain_tnc7",
  "mazak smooth ai": "mazak_smooth_ai",
  "mazak smoothai": "mazak_smooth_ai",
  "mazak smooth g": "mazak_smooth_g",
  "mazatrol smoothai": "mazak_smooth_ai",
  "okuma osp-p300": "okuma_osp_p300",
  "okuma osp-p500": "okuma_osp_p500",
  "okuma osp-p300a": "okuma_osp_p300",
  "okuma osp-p300s": "okuma_osp_p300",
  "brother cnc-c00": "brother_speedio",
  "mitsubishi m80": "mitsubishi_m80",
  "fagor 8065": "fagor_8065",
  "celos siemens": "dmg_celos_siemens",
  "celos fanuc": "dmg_celos_fanuc",
  "celos mapps": "dmg_celos_fanuc",
  "hurco max5": "hurco_max5",
  "hurco winmax": "hurco_max5",
  "citizen cincom": "citizen_cincom",
  "star fanuc": "star_fanuc",
};

/**
 * Year-based controller resolution for manufacturers that changed
 * controllers over time.
 */
const YEAR_BASED_RULES: Array<{
  manufacturer: RegExp;
  cutoff_year: number;
  before: ControllerFamily;
  after: ControllerFamily;
}> = [
  { manufacturer: /haas/i, cutoff_year: 2006, before: "fanuc_0i", after: "haas_ngc" },
  { manufacturer: /mazak/i, cutoff_year: 2018, before: "mazak_smooth_g", after: "mazak_smooth_ai" },
  { manufacturer: /okuma/i, cutoff_year: 2015, before: "okuma_osp_p300", after: "okuma_osp_p500" },
  { manufacturer: /dmg|mori/i, cutoff_year: 2020, before: "siemens_840d", after: "dmg_celos_siemens" },
  { manufacturer: /siemens/i, cutoff_year: 2022, before: "siemens_840d", after: "siemens_one" },
];

// ─── Engine Implementation ──────────────────────────────────────────

class MachineFingerprintEngineImpl {

  /**
   * Resolve a machine make/model/year to a recommended post configuration.
   *
   * @param input - Machine identification: manufacturer, model, optional year and controller override
   * @returns RecommendedPostConfig with controller family, features, and resolution metadata
   */
  fingerprint(input: MachineFingerprintInput): RecommendedPostConfig {
    // ── Input validation ──
    if (!input) throw new Error("[MachineFingerprintEngine] input is required");
    if (!input.manufacturer || typeof input.manufacturer !== "string") {
      throw new Error("[MachineFingerprintEngine] manufacturer is required (string)");
    }
    if (!input.model || typeof input.model !== "string") {
      throw new Error("[MachineFingerprintEngine] model is required (string)");
    }
    if (input.year !== undefined && (typeof input.year !== "number" || input.year < 1950 || input.year > 2035)) {
      throw new Error("[MachineFingerprintEngine] year must be a number between 1950 and 2035");
    }

    const warnings: string[] = [];

    // ── 0. Controller override — user explicitly set the controller ──
    if (input.controller_override) {
      const profile = this.findExactMatch(input.manufacturer, input.model);
      return this.buildConfig(input.controller_override, "controller_override", 1.0, profile, warnings);
    }

    // ── 1. Exact catalog match ──
    const exactMatch = this.findExactMatch(input.manufacturer, input.model);
    if (exactMatch) {
      const family = this.resolveControllerString(exactMatch.controller);
      if (family) {
        return this.buildConfig(family, "exact_catalog", 0.95, exactMatch, warnings);
      }
      warnings.push(`Catalog match found but controller "${exactMatch.controller}" not mapped to PRISM dialect`);
    }

    // ── 2. Fuzzy catalog match ──
    const fuzzyMatch = this.findFuzzyMatch(input.manufacturer, input.model);
    if (fuzzyMatch) {
      const family = this.resolveControllerString(fuzzyMatch.controller);
      if (family) {
        warnings.push(`Fuzzy match: "${input.model}" → "${fuzzyMatch.model}" — verify this is the correct machine`);
        return this.buildConfig(family, "fuzzy_catalog", 0.75, fuzzyMatch, warnings);
      }
    }

    // ── 3. Year-based resolution ──
    if (input.year) {
      for (const rule of YEAR_BASED_RULES) {
        if (rule.manufacturer.test(input.manufacturer)) {
          const family = input.year < rule.cutoff_year ? rule.before : rule.after;
          return this.buildConfig(family, "year_based", 0.6, undefined, warnings);
        }
      }
    }

    // ── 4. Manufacturer default ──
    const mfrKey = input.manufacturer.toLowerCase().trim();
    const mfrDefault = MANUFACTURER_DEFAULTS[mfrKey];
    if (mfrDefault) {
      return this.buildConfig(mfrDefault, "manufacturer_default", 0.5, undefined, warnings);
    }

    // ── 5. Fallback ──
    warnings.push(
      `No catalog match, year rule, or manufacturer default for "${input.manufacturer} ${input.model}". ` +
      `Using generic Fanuc — verify controller manually.`
    );
    return this.buildConfig("generic_fanuc", "fallback", 0.2, undefined, warnings);
  }

  /**
   * List all unique manufacturers in the catalog.
   */
  listManufacturers(): string[] {
    const brands = new Set<string>();
    for (const m of EXTENDED_MACHINE_CATALOG) {
      brands.add(m.brand);
    }
    return [...brands].sort();
  }

  /**
   * List all models for a given manufacturer.
   */
  listModels(manufacturer: string): string[] {
    const mfr = manufacturer.toLowerCase().trim();
    return EXTENDED_MACHINE_CATALOG
      .filter(m => m.brand.toLowerCase() === mfr)
      .map(m => m.model)
      .sort();
  }

  /**
   * PRISM engine execute method.
   *
   * Actions:
   *   - machine_fingerprint: Resolve machine to post config
   *   - machine_list_manufacturers: List all catalog manufacturers
   *   - machine_list_models: List models for a manufacturer
   */
  execute(action: string, input: any): any {
    switch (action) {
      case "machine_fingerprint":
        return this.fingerprint(input);
      case "machine_list_manufacturers":
        return { manufacturers: this.listManufacturers() };
      case "machine_list_models":
        if (!input?.manufacturer) throw new Error("machine_list_models requires 'manufacturer'");
        return { models: this.listModels(input.manufacturer) };
      default:
        throw new Error(
          `[MachineFingerprintEngine] Unknown action "${action}". ` +
          `Supported: machine_fingerprint, machine_list_manufacturers, machine_list_models`
        );
    }
  }

  // ─── Private: Catalog Lookup ────────────────────────────────────────

  private findExactMatch(manufacturer: string, model: string): ExtendedMachineProfile | undefined {
    const mfr = manufacturer.toLowerCase().trim();
    const mdl = model.toLowerCase().trim();
    return EXTENDED_MACHINE_CATALOG.find(
      m => m.brand.toLowerCase() === mfr && m.model.toLowerCase() === mdl,
    );
  }

  private findFuzzyMatch(manufacturer: string, model: string): ExtendedMachineProfile | undefined {
    const mfr = manufacturer.toLowerCase().trim();
    const mdl = model.toLowerCase().replace(/[-_\s]/g, "");

    // First pass: same manufacturer, model contains search string or vice versa
    const sameManufacturer = EXTENDED_MACHINE_CATALOG.filter(
      m => m.brand.toLowerCase() === mfr,
    );

    for (const m of sameManufacturer) {
      const catalogModel = m.model.toLowerCase().replace(/[-_\s]/g, "");
      if (catalogModel.includes(mdl) || mdl.includes(catalogModel)) {
        return m;
      }
    }

    // Second pass: any manufacturer, model starts with search
    for (const m of EXTENDED_MACHINE_CATALOG) {
      const catalogModel = m.model.toLowerCase().replace(/[-_\s]/g, "");
      if (catalogModel.startsWith(mdl) || mdl.startsWith(catalogModel)) {
        if (m.brand.toLowerCase().includes(mfr) || mfr.includes(m.brand.toLowerCase())) {
          return m;
        }
      }
    }

    return undefined;
  }

  private resolveControllerString(controller: string): ControllerFamily | undefined {
    const key = controller.toLowerCase().trim();
    // Exact match
    if (CONTROLLER_STRING_MAP[key]) return CONTROLLER_STRING_MAP[key];
    // Partial match
    for (const [pattern, family] of Object.entries(CONTROLLER_STRING_MAP)) {
      if (key.includes(pattern) || pattern.includes(key)) return family;
    }
    return undefined;
  }

  // ─── Private: Config Builder ────────────────────────────────────────

  private buildConfig(
    family: ControllerFamily,
    method: ResolutionMethod,
    confidence: number,
    profile: ExtendedMachineProfile | undefined,
    warnings: string[],
  ): RecommendedPostConfig {
    const axisCount = profile?.rotary_axes?.length ?? 0;
    const axisConfig: RecommendedPostConfig["axis_config"] =
      axisCount >= 2 ? "5axis" : axisCount === 1 ? "4axis" : "3axis";

    const machineType = profile?.type ?? "VMC";
    const maxRpm = profile?.spindle?.max_rpm ?? 10000;
    const isFiveAxis = axisConfig === "5axis";
    const isLathe = machineType === "lathe" || machineType === "swiss" || machineType === "mill_turn";

    return {
      controller_family: family,
      resolution_method: method,
      confidence,
      matched_profile: profile ? {
        brand: profile.brand,
        model: profile.model,
        type: profile.type,
        controller: profile.controller,
        max_rpm: profile.spindle.max_rpm,
        taper: profile.spindle.taper,
        tool_capacity: profile.tool_changer.capacity,
        axis_count: 3 + (profile.rotary_axes?.length ?? 0),
      } : undefined,
      axis_config: axisConfig,
      machine_type: machineType,
      recommended_features: {
        probing: true,  // always recommend probing for safety
        tsc: maxRpm > 6000, // TSC typically available on higher-speed spindles
        hsm: maxRpm > 10000 || isFiveAxis, // HSM valuable for high-speed or 5-axis
        tcp: isFiveAxis, // TCP only for 5-axis
        ssv: isLathe, // SSV for turning to break chatter
        subprograms: true, // always recommend for production
        chip_conveyor: true, // always recommend
      },
      warnings,
    };
  }
}

// ─── Singleton Export ────────────────────────────────────────────────

export const machineFingerprintEngine = new MachineFingerprintEngineImpl();
