/**
 * CpsDialectMapperEngine — Map CPS Post Properties to PRISM Dialect Config
 *
 * PP-MS1 U-PP06: Takes parsed CPS profile (from CpsPostParserEngine) and maps
 * Fusion 360 CPS property names to PRISM's ControllerDialect + MasterPostConfig
 * fields. This bridges the gap between Autodesk's property naming conventions
 * and PRISM's internal dialect representation.
 *
 * Key mappings:
 *   - safePositionMethod → safe_retract_style
 *   - useRadius → arc_format
 *   - useSmoothing / smoothingTolerance → hsm config
 *   - useTCP / useTiltedWorkplane → five_axis TCP/DWO
 *   - gotChipConveyor / coolantPressure → coolant config
 *   - hasAAxis / hasBAxis / hasCAxis → axis_config
 *   - useSubroutines → subprogram style
 *
 * Reference: Autodesk Fusion 360 Post Processor Development Guide
 *
 * @module CpsDialectMapperEngine
 */

import {
  type CpsFullProfile,
  type CpsProperty,
} from "./CpsPostParserEngine.js";
import type { ControllerFamily, ArcFormat } from "./ControllerDialectEngine.js";

// ─── Output Interfaces ──────────────────────────────────────────────

export interface CpsDialectMapping {
  /** Resolved PRISM controller family (best match from CPS vendor/description) */
  controller_family: ControllerFamily;
  /** Confidence in the controller family resolution (0-1) */
  resolution_confidence: number;
  /** How the controller was resolved */
  resolution_method: "exact_vendor" | "description_match" | "property_heuristic" | "fallback";
  /** Warnings for edge cases, low-confidence mappings, unmapped properties */
  warnings: string[];

  /** Arc interpolation format */
  arc_format: ArcFormat;
  /** Safe retract method */
  safe_retract: "g28" | "g53" | "clearance_plane";
  /** HSM / smoothing configuration */
  hsm: {
    enabled: boolean;
    code?: string;
    tolerance_mm?: number;
  };
  /** 5-axis TCP/DWO configuration */
  five_axis: {
    tcp_enabled: boolean;
    dwo_enabled: boolean;
    tcp_code?: string;
    axis_config: "3axis" | "4axis_a" | "4axis_b" | "5axis_ab" | "5axis_bc" | "5axis_ac";
  };
  /** Coolant configuration */
  coolant: {
    flood: boolean;
    mist: boolean;
    tsc: boolean;
    chip_conveyor: boolean;
    pressure_bar?: number;
  };
  /** Subprogram style */
  subprogram: {
    enabled: boolean;
    style?: "m98" | "call" | "extern" | "callpgm" | "none";
  };
  /** Probing support */
  probing: {
    available: boolean;
    multi_feature: boolean;
  };
  /** Turning capability */
  turning: {
    enabled: boolean;
    css_support: boolean;
  };
  /** Output file extension */
  output_extension: string;
  /** All mapped properties with their source CPS name */
  property_map: Record<string, { cps_name: string; cps_value: any; prism_value: any }>;
}

// ─── Controller Family Resolution ───────────────────────────────────

/** Vendor string → ControllerFamily mapping (from CPS metadata.vendor) */
const VENDOR_CONTROLLER_MAP: Record<string, ControllerFamily> = {
  "Autodesk": "generic_fanuc",
  "Haas Automation": "haas_ngc",
  "Siemens": "siemens_840d",
  "Heidenhain": "heidenhain_tnc640",
  "Mazak": "mazak_smooth_ai",
  "Okuma": "okuma_osp_p300",
  "FANUC": "fanuc_31i",
  "Fanuc": "fanuc_31i",
  "Brother": "brother_speedio",
  "Mitsubishi": "mitsubishi_m80",
  "Fagor": "fagor_8065",
  "Citizen": "citizen_cincom",
  "Star": "star_fanuc",
  "Hurco": "hurco_max5",
  "DMG MORI": "dmg_celos_siemens",
  "DMG Mori": "dmg_celos_siemens",
  "Doosan": "fanuc_31i",
  "Makino": "fanuc_31i",
  "Datron": "siemens_840d",
  "Tormach": "generic_fanuc",
};

/** Description keyword → ControllerFamily mapping (fallback) */
const DESCRIPTION_KEYWORDS: Array<[RegExp, ControllerFamily]> = [
  [/haas/i, "haas_ngc"],
  [/siemens\s*840d?\s*sl/i, "siemens_840d"],
  [/siemens\s*828/i, "siemens_828d"],
  [/sinumerik\s*one/i, "siemens_one"],
  [/heidenhain\s*tnc\s*7/i, "heidenhain_tnc7"],
  [/heidenhain|tnc\s*640/i, "heidenhain_tnc640"],
  [/mazak\s*smooth/i, "mazak_smooth_ai"],
  [/okuma\s*osp/i, "okuma_osp_p300"],
  [/fanuc\s*3[01]/i, "fanuc_31i"],
  [/fanuc\s*0i/i, "fanuc_0i"],
  [/fanuc\s*16/i, "fanuc_16i"],
  [/fanuc\s*18/i, "fanuc_18i"],
  [/brother|speedio/i, "brother_speedio"],
  [/mitsubishi|m80/i, "mitsubishi_m80"],
  [/citizen|cincom/i, "citizen_cincom"],
  [/star\s*(sr|sw|fanuc)/i, "star_fanuc"],
  [/hurco|winmax|ultimotion/i, "hurco_max5"],
  [/dmg\s*mori|celos/i, "dmg_celos_siemens"],
  [/fagor/i, "fagor_8065"],
  [/fanuc/i, "generic_fanuc"],
];

// ─── CPS Property Name Constants ────────────────────────────────────

/** Known CPS property names that map to PRISM dialect fields */
const CPS_PROP = {
  // Arc / interpolation
  USE_RADIUS: "useRadius",
  USE_PITCH: "usePitch",

  // Safe positioning
  SAFE_POSITION: "safePositionMethod",
  SAFE_RETRACT_DISTANCE: "safeRetractDistance",

  // HSM / Smoothing
  USE_SMOOTHING: "useSmoothing",
  SMOOTHING_TOLERANCE: "smoothingTolerance",
  HIGH_FEED_MAPPING: "highFeedMapping",

  // 5-axis
  USE_TCP: "useTCP",
  USE_TILTED_WORKPLANE: "useTiltedWorkplane",
  USE_MULTI_AXIS: "useMultiAxisFeatures",
  USE_CAXIS: "useCAxis",
  HAS_A_AXIS: "hasAAxis",
  HAS_B_AXIS: "hasBAxis",
  HAS_C_AXIS: "hasCAxis",

  // Coolant
  GOT_CHIP_CONVEYOR: "gotChipConveyor",
  COOLANT_PRESSURE: "coolantPressure",
  USE_COOLANT: "useCoolant",

  // Subprograms
  USE_SUBROUTINES: "useSubroutines",
  USE_FILLETS: "useFilletRadiusCompensation",

  // Probing
  PROBE_MULTIPLE: "probeMultipleFeatures",

  // Turning
  USE_CONSTANT_SURFACE_SPEED: "useConstantSurfaceSpeed",
  GOT_LIVE_TOOL: "gotLiveTooling",
  GOT_SECONDARY_SPINDLE: "gotSecondarySpindle",
  GOT_TAIL_STOCK: "gotTailStock",

  // Output
  WRITE_MACHINE: "writeMachine",
  SHOW_SEQUENCE_NUMBERS: "showSequenceNumbers",
  SEQUENCE_INCREMENT: "sequenceNumberIncrement",
  USE_CYCLE89: "useCycle89",
} as const;

// ─── Engine Implementation ──────────────────────────────────────────

class CpsDialectMapperEngineImpl {

  /**
   * Map a parsed CPS profile to PRISM dialect configuration.
   *
   * @param profile - Fully parsed CPS profile from CpsPostParserEngine
   * @returns CpsDialectMapping with controller family, features, and property map
   */
  mapToDialect(profile: CpsFullProfile): CpsDialectMapping {
    // ── Input validation ──
    if (!profile) throw new Error("[CpsDialectMapperEngine] profile is required");
    if (!profile.metadata) throw new Error("[CpsDialectMapperEngine] profile.metadata is required");
    if (!Array.isArray(profile.properties)) {
      throw new Error("[CpsDialectMapperEngine] profile.properties must be an array");
    }

    const warnings: string[] = [];
    const propLookup = this.buildPropertyLookup(profile.properties);

    if (profile.properties.length === 0) {
      warnings.push("CPS file has zero properties — mapping will use defaults for all fields");
    }

    const controllerResolution = this.resolveControllerFamily(profile, propLookup);
    if (controllerResolution.confidence < 0.5) {
      warnings.push(
        `Low controller resolution confidence (${controllerResolution.confidence}) for "${profile.metadata.description}" — ` +
        `resolved to ${controllerResolution.family} via ${controllerResolution.method}. Verify manually.`
      );
    }

    const arcFormat = this.resolveArcFormat(propLookup);
    const safeRetract = this.resolveSafeRetract(propLookup);
    const hsm = this.resolveHsm(propLookup, controllerResolution.family);
    const fiveAxis = this.resolveFiveAxis(propLookup, profile);
    const coolant = this.resolveCoolant(propLookup);
    const subprogram = this.resolveSubprogram(propLookup, controllerResolution.family);
    const probing = this.resolveProbing(propLookup, profile);
    const turning = this.resolveTurning(propLookup, profile);

    // ── Cross-field consistency checks ──
    if (fiveAxis.tcp_enabled && fiveAxis.axis_config === "3axis") {
      warnings.push("TCP enabled but axis config is 3-axis — TCP requires at least 4 axes. Check hasAAxis/hasBAxis.");
    }
    if (turning.enabled && fiveAxis.axis_config.startsWith("5axis")) {
      warnings.push("Turning + 5-axis detected — likely mill-turn. Verify subprogram sync and C-axis mode.");
    }
    if (coolant.tsc && !coolant.flood) {
      warnings.push("TSC (through-spindle coolant) enabled without flood — unusual configuration, verify coolant property.");
    }
    if (hsm.enabled && !hsm.code) {
      warnings.push("HSM smoothing enabled but no controller-specific G-code resolved — output may lack smoothing commands.");
    }

    const propertyMap = this.buildPropertyMap(propLookup, {
      arcFormat, safeRetract, hsm, fiveAxis, coolant, subprogram, probing, turning,
    });

    return {
      controller_family: controllerResolution.family,
      resolution_confidence: controllerResolution.confidence,
      resolution_method: controllerResolution.method,
      warnings,
      arc_format: arcFormat,
      safe_retract: safeRetract,
      hsm,
      five_axis: fiveAxis,
      coolant,
      subprogram,
      probing,
      turning,
      output_extension: profile.metadata.extension || "nc",
      property_map: propertyMap,
    };
  }

  /**
   * Batch-map multiple CPS profiles.
   */
  mapBatch(profiles: CpsFullProfile[]): CpsDialectMapping[] {
    return profiles.map(p => this.mapToDialect(p));
  }

  /**
   * PRISM engine execute method.
   *
   * Actions:
   *   - cps_map_dialect: Map a single CPS profile to PRISM dialect
   *   - cps_map_batch:   Map multiple CPS profiles
   */
  execute(action: string, input: { profile?: CpsFullProfile; profiles?: CpsFullProfile[] }): any {
    switch (action) {
      case "cps_map_dialect":
        if (!input.profile) throw new Error("cps_map_dialect requires 'profile' input");
        return this.mapToDialect(input.profile);
      case "cps_map_batch":
        if (!input.profiles) throw new Error("cps_map_batch requires 'profiles' input");
        return this.mapBatch(input.profiles);
      default:
        throw new Error(
          `[CpsDialectMapperEngine] Unknown action "${action}". ` +
          `Supported: cps_map_dialect, cps_map_batch`
        );
    }
  }

  // ─── Private: Property Lookup ───────────────────────────────────────

  /** Build a fast lookup map from CPS property array. */
  private buildPropertyLookup(properties: CpsProperty[]): Map<string, CpsProperty> {
    const map = new Map<string, CpsProperty>();
    for (const prop of properties) {
      map.set(prop.name, prop);
      // Also index by lowercase for case-insensitive fallback
      map.set(prop.name.toLowerCase(), prop);
    }
    return map;
  }

  /** Get a property value with type coercion, returning undefined if not found. */
  private getPropValue<T>(lookup: Map<string, CpsProperty>, name: string, fallback?: T): T | undefined {
    const prop = lookup.get(name) ?? lookup.get(name.toLowerCase());
    if (!prop) return fallback;
    return prop.defaultValue as T;
  }

  /** Check if a boolean property is truthy. */
  private isTruthy(lookup: Map<string, CpsProperty>, name: string): boolean {
    const val = this.getPropValue<any>(lookup, name);
    if (val === undefined || val === null) return false;
    if (typeof val === "boolean") return val;
    if (typeof val === "string") return val === "true" || val === "yes" || val === "1";
    if (typeof val === "number") return val > 0;
    return false;
  }

  // ─── Private: Controller Resolution ─────────────────────────────────

  private resolveControllerFamily(
    profile: CpsFullProfile,
    _propLookup: Map<string, CpsProperty>,
  ): { family: ControllerFamily; confidence: number; method: CpsDialectMapping["resolution_method"] } {
    // 1. Exact vendor match (skip generic vendors like "Autodesk" — try description first)
    const vendor = profile.metadata.vendor?.trim();
    const vendorMatch = vendor ? VENDOR_CONTROLLER_MAP[vendor] : undefined;
    if (vendorMatch && vendorMatch !== "generic_fanuc" && vendorMatch !== "generic_iso") {
      return { family: vendorMatch, confidence: 0.9, method: "exact_vendor" };
    }

    // 2. Description keyword match (more specific than generic vendor)
    const desc = `${profile.metadata.description} ${profile.metadata.longDescription ?? ""}`.trim();
    for (const [re, family] of DESCRIPTION_KEYWORDS) {
      if (re.test(desc)) {
        return { family, confidence: 0.75, method: "description_match" };
      }
    }

    // 3. Property heuristic — check for controller-specific property patterns
    const filename = profile.metadata.filename?.toLowerCase() ?? "";
    for (const [re, family] of DESCRIPTION_KEYWORDS) {
      if (re.test(filename)) {
        return { family, confidence: 0.6, method: "property_heuristic" };
      }
    }

    // 4. Fallback
    return { family: "generic_fanuc", confidence: 0.3, method: "fallback" };
  }

  // ─── Private: Arc Format ────────────────────────────────────────────

  private resolveArcFormat(lookup: Map<string, CpsProperty>): ArcFormat {
    const useRadius = this.isTruthy(lookup, CPS_PROP.USE_RADIUS);
    // CPS "useRadius=true" means use R-word arcs; false means IJK incremental
    if (useRadius) return "r_word";

    // Check if "forceIJK" or similar property hints at absolute IJK
    const forceIJK = this.isTruthy(lookup, "forceIJK");
    if (forceIJK) return "ijk_absolute";

    return "ijk_incremental";
  }

  // ─── Private: Safe Retract ──────────────────────────────────────────

  private resolveSafeRetract(
    lookup: Map<string, CpsProperty>,
  ): "g28" | "g53" | "clearance_plane" {
    const method = this.getPropValue<string>(lookup, CPS_PROP.SAFE_POSITION);
    if (!method) return "g28";

    const m = (typeof method === "string" ? method : String(method)).toLowerCase();
    if (m.includes("g53") || m === "g53z0") return "g53";
    if (m.includes("clearance") || m === "clearanceheight") return "clearance_plane";
    // Default to G28 for "home", "g28", or unrecognized
    return "g28";
  }

  // ─── Private: HSM / Smoothing ───────────────────────────────────────

  private resolveHsm(
    lookup: Map<string, CpsProperty>,
    controllerFamily: ControllerFamily,
  ): CpsDialectMapping["hsm"] {
    const enabled = this.isTruthy(lookup, CPS_PROP.USE_SMOOTHING);
    if (!enabled) return { enabled: false };

    const tolerance = this.getPropValue<number>(lookup, CPS_PROP.SMOOTHING_TOLERANCE);

    // Controller-specific smoothing G-code
    let code: string | undefined;
    if (controllerFamily.startsWith("haas")) code = "G187";
    else if (controllerFamily.startsWith("siemens")) code = "CYCLE832";
    else if (controllerFamily.startsWith("fanuc")) code = "G05.1 Q1"; // AICC
    else if (controllerFamily.startsWith("mazak")) code = "G05 P10000"; // HPCC
    else if (controllerFamily.startsWith("heidenhain")) code = "FUNCTION TCPM";
    else if (controllerFamily.startsWith("okuma")) code = "G08 P1"; // Super NURBS
    else if (controllerFamily === "brother_speedio") code = "G05.1 Q1";
    else if (controllerFamily === "hurco_max5") code = ""; // UltiMotion is default

    return {
      enabled: true,
      code,
      tolerance_mm: typeof tolerance === "number" ? tolerance : undefined,
    };
  }

  // ─── Private: 5-Axis ────────────────────────────────────────────────

  private resolveFiveAxis(
    lookup: Map<string, CpsProperty>,
    profile: CpsFullProfile,
  ): CpsDialectMapping["five_axis"] {
    const tcpEnabled = this.isTruthy(lookup, CPS_PROP.USE_TCP);
    const dwoEnabled = this.isTruthy(lookup, CPS_PROP.USE_TILTED_WORKPLANE);
    const hasA = this.isTruthy(lookup, CPS_PROP.HAS_A_AXIS);
    const hasB = this.isTruthy(lookup, CPS_PROP.HAS_B_AXIS);
    const hasC = this.isTruthy(lookup, CPS_PROP.HAS_C_AXIS);

    let axisConfig: CpsDialectMapping["five_axis"]["axis_config"] = "3axis";
    if (hasA && hasB) axisConfig = "5axis_ab";
    else if (hasB && hasC) axisConfig = "5axis_bc";
    else if (hasA && hasC) axisConfig = "5axis_ac";
    else if (hasA) axisConfig = "4axis_a";
    else if (hasB) axisConfig = "4axis_b";

    // Infer TCP G-code from controller context
    let tcpCode: string | undefined;
    if (tcpEnabled) {
      const desc = profile.metadata.description?.toLowerCase() ?? "";
      if (desc.includes("siemens") || desc.includes("sinumerik")) tcpCode = "TRAORI";
      else if (desc.includes("heidenhain")) tcpCode = "FUNCTION TCPM";
      else if (desc.includes("mazak")) tcpCode = "G43.4";
      else tcpCode = "G43.4"; // Fanuc-style default
    }

    return {
      tcp_enabled: tcpEnabled,
      dwo_enabled: dwoEnabled,
      tcp_code: tcpCode,
      axis_config: axisConfig,
    };
  }

  // ─── Private: Coolant ───────────────────────────────────────────────

  private resolveCoolant(lookup: Map<string, CpsProperty>): CpsDialectMapping["coolant"] {
    const chipConveyor = this.isTruthy(lookup, CPS_PROP.GOT_CHIP_CONVEYOR);
    const pressure = this.getPropValue<number>(lookup, CPS_PROP.COOLANT_PRESSURE);

    // Most CPS files support flood by default; check for explicit coolant enum
    const coolantProp = this.getPropValue<string>(lookup, CPS_PROP.USE_COOLANT);
    const coolantStr = (typeof coolantProp === "string" ? coolantProp : "flood").toLowerCase();

    return {
      flood: coolantStr !== "off" && coolantStr !== "disabled",
      mist: coolantStr.includes("mist"),
      tsc: coolantStr.includes("through") || coolantStr.includes("tsc") || (typeof pressure === "number" && pressure > 0),
      chip_conveyor: chipConveyor,
      pressure_bar: typeof pressure === "number" ? pressure : undefined,
    };
  }

  // ─── Private: Subprograms ───────────────────────────────────────────

  private resolveSubprogram(
    lookup: Map<string, CpsProperty>,
    controllerFamily: ControllerFamily,
  ): CpsDialectMapping["subprogram"] {
    const enabled = this.isTruthy(lookup, CPS_PROP.USE_SUBROUTINES);
    if (!enabled) return { enabled: false };

    let style: CpsDialectMapping["subprogram"]["style"] = "m98";
    if (controllerFamily.startsWith("siemens")) style = "call";
    else if (controllerFamily.startsWith("heidenhain")) style = "callpgm";
    else if (controllerFamily.startsWith("mazak")) style = "m98";
    else if (controllerFamily.startsWith("okuma")) style = "call";

    return { enabled: true, style };
  }

  // ─── Private: Probing ───────────────────────────────────────────────

  private resolveProbing(
    lookup: Map<string, CpsProperty>,
    profile: CpsFullProfile,
  ): CpsDialectMapping["probing"] {
    return {
      available: profile.cycleSupport.hasProbing,
      multi_feature: profile.metadata.probeMultipleFeatures || this.isTruthy(lookup, CPS_PROP.PROBE_MULTIPLE),
    };
  }

  // ─── Private: Turning ───────────────────────────────────────────────

  private resolveTurning(
    lookup: Map<string, CpsProperty>,
    profile: CpsFullProfile,
  ): CpsDialectMapping["turning"] {
    return {
      enabled: profile.metadata.capabilities.turning,
      css_support: this.isTruthy(lookup, CPS_PROP.USE_CONSTANT_SURFACE_SPEED),
    };
  }

  // ─── Private: Property Map Builder ──────────────────────────────────

  private buildPropertyMap(
    lookup: Map<string, CpsProperty>,
    resolved: {
      arcFormat: ArcFormat;
      safeRetract: string;
      hsm: CpsDialectMapping["hsm"];
      fiveAxis: CpsDialectMapping["five_axis"];
      coolant: CpsDialectMapping["coolant"];
      subprogram: CpsDialectMapping["subprogram"];
      probing: CpsDialectMapping["probing"];
      turning: CpsDialectMapping["turning"];
    },
  ): CpsDialectMapping["property_map"] {
    const map: CpsDialectMapping["property_map"] = {};

    const track = (prismField: string, cpsName: string, prismValue: any) => {
      const cpsProp = lookup.get(cpsName);
      if (cpsProp) {
        map[prismField] = { cps_name: cpsName, cps_value: cpsProp.defaultValue, prism_value: prismValue };
      }
    };

    track("arc_format", CPS_PROP.USE_RADIUS, resolved.arcFormat);
    track("safe_retract", CPS_PROP.SAFE_POSITION, resolved.safeRetract);
    track("hsm.enabled", CPS_PROP.USE_SMOOTHING, resolved.hsm.enabled);
    track("hsm.tolerance_mm", CPS_PROP.SMOOTHING_TOLERANCE, resolved.hsm.tolerance_mm);
    track("five_axis.tcp_enabled", CPS_PROP.USE_TCP, resolved.fiveAxis.tcp_enabled);
    track("five_axis.dwo_enabled", CPS_PROP.USE_TILTED_WORKPLANE, resolved.fiveAxis.dwo_enabled);
    track("coolant.chip_conveyor", CPS_PROP.GOT_CHIP_CONVEYOR, resolved.coolant.chip_conveyor);
    track("coolant.pressure_bar", CPS_PROP.COOLANT_PRESSURE, resolved.coolant.pressure_bar);
    track("subprogram.enabled", CPS_PROP.USE_SUBROUTINES, resolved.subprogram.enabled);
    track("turning.css_support", CPS_PROP.USE_CONSTANT_SURFACE_SPEED, resolved.turning.css_support);

    return map;
  }
}

// ─── Singleton Export ────────────────────────────────────────────────

export const cpsDialectMapperEngine = new CpsDialectMapperEngineImpl();
