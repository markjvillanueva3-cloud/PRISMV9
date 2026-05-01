/**
 * CoatingSelectionEngine (E1082) — ISO-group-based cutting tool coating selection
 *
 * Replaces hardcoded "always TiAlN" in PrintToProgramPipelineEngine with
 * intelligent coating selection driven by ISO material group, operation type,
 * cutting speed range, coolant strategy, and tool substrate.
 *
 * Decision logic based on:
 *   - Sandvik Coromant Metalcutting Technical Guide (2024)
 *   - Kennametal Tooling Systems Coating Guide
 *   - Oerlikon Balzers BALINIT coating specifications
 *   - ISO 513:2012 application groups
 *
 * CAMX-MS0.3 U04: CoatingSelectionLogic
 */

// ─── Types ─────────────────────────────────────────────────────────

/** ISO 513 material classification groups */
export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";

/** Machining operation type */
export type CoatingOperationType =
  | "roughing"
  | "finishing"
  | "drilling"
  | "threading"
  | "turning";

/** Cutting speed classification */
export type SpeedRange = "low" | "medium" | "high" | "very_high";

/** Coolant delivery method */
export type CoolantType = "flood" | "MQL" | "dry" | "cryogenic";

/** Tool substrate material */
export type ToolSubstrate = "carbide" | "HSS" | "cermet" | "ceramic" | "CBN" | "PCD";

/** Available coating types */
export type CoatingName =
  | "TiN"
  | "TiCN"
  | "TiAlN"
  | "AlTiN"
  | "AlCrN"
  | "TiAlSiN"
  | "DLC"
  | "CVD_Diamond"
  | "Uncoated"
  | "PVD_MultiLayer";

/** Input for coating selection */
export interface CoatingSelectionInput {
  iso_group: ISOGroup;
  operation: CoatingOperationType;
  speed_range: SpeedRange;
  coolant: CoolantType;
  substrate: ToolSubstrate;
}

/** Why an alternative coating was not chosen */
export interface CoatingAlternative {
  coating: CoatingName;
  why_not: string;
}

/** Output from coating selection */
export interface CoatingSelectionResult {
  coating: CoatingName;
  reasoning: string[];
  alternatives: CoatingAlternative[];
  temperature_limit_C: number;
  hardness_HV: number;
  friction_coefficient: number;
}

// ─── Coating Database ──────────────────────────────────────────────

interface CoatingData {
  description: string;
  iso_groups: ISOGroup[];
  max_temp_C: number;
  hardness_HV: number;
  friction_coefficient: number;
  color: string;
  strengths: string[];
}

const COATING_DB: Record<CoatingName, CoatingData> = {
  TiN: {
    description: "Titanium Nitride — general purpose",
    iso_groups: ["P", "K"],
    max_temp_C: 400,
    hardness_HV: 2300,
    friction_coefficient: 0.40,
    color: "golden",
    strengths: ["universal", "good adhesion", "visible wear indicator"],
  },
  TiCN: {
    description: "Titanium CarboNitride — higher hardness, wear resistant",
    iso_groups: ["P", "M", "K"],
    max_temp_C: 450,
    hardness_HV: 3000,
    friction_coefficient: 0.35,
    color: "grey-violet",
    strengths: ["abrasion resistance", "low-speed performance", "good toughness"],
  },
  TiAlN: {
    description: "Titanium Aluminum Nitride — high-speed, dry machining",
    iso_groups: ["P", "M", "S"],
    max_temp_C: 800,
    hardness_HV: 3300,
    friction_coefficient: 0.30,
    color: "dark violet",
    strengths: ["high-temperature stability", "oxidation resistance", "dry machining"],
  },
  AlTiN: {
    description: "Aluminum Titanium Nitride — very high speed, hard materials",
    iso_groups: ["M", "S", "H"],
    max_temp_C: 900,
    hardness_HV: 3500,
    friction_coefficient: 0.28,
    color: "black",
    strengths: ["extreme heat resistance", "hard material machining", "high Al content forms protective oxide"],
  },
  AlCrN: {
    description: "Aluminum Chromium Nitride — superior oxidation resistance",
    iso_groups: ["S", "H"],
    max_temp_C: 1100,
    hardness_HV: 3200,
    friction_coefficient: 0.35,
    color: "grey",
    strengths: ["highest oxidation resistance", "superalloy machining", "thermal barrier"],
  },
  TiAlSiN: {
    description: "Nanocomposite — extreme hardness for hardened materials",
    iso_groups: ["H", "S"],
    max_temp_C: 1200,
    hardness_HV: 3400,
    friction_coefficient: 0.25,
    color: "copper-bronze",
    strengths: ["nanocomposite structure", "extreme hardness >3000 HV", "high-temp stability"],
  },
  DLC: {
    description: "Diamond-Like Carbon — non-ferrous, prevents BUE",
    iso_groups: ["N"],
    max_temp_C: 350,
    hardness_HV: 5000,
    friction_coefficient: 0.10,
    color: "dark grey/black",
    strengths: ["ultra-low friction", "prevents built-up edge", "non-ferrous specialist"],
  },
  CVD_Diamond: {
    description: "CVD Diamond — longest life on abrasive non-ferrous materials",
    iso_groups: ["N", "K"],
    max_temp_C: 700,
    hardness_HV: 10000,
    friction_coefficient: 0.05,
    color: "white/crystalline",
    strengths: ["extreme wear resistance", "abrasive material specialist", "NOT for steel"],
  },
  Uncoated: {
    description: "Uncoated substrate — tapping in soft materials, some K applications",
    iso_groups: ["N", "K"],
    max_temp_C: 300,
    hardness_HV: 1600,
    friction_coefficient: 0.50,
    color: "metallic grey",
    strengths: ["sharp edge retention", "regrindable", "no coating delamination risk"],
  },
  PVD_MultiLayer: {
    description: "Modern PVD multi-layer — general high-performance",
    iso_groups: ["P", "M", "K", "S"],
    max_temp_C: 950,
    hardness_HV: 3400,
    friction_coefficient: 0.28,
    color: "varies",
    strengths: ["multi-layer thermal barrier", "balanced properties", "wide application range"],
  },
};

// ─── Speed Threshold Mapping ───────────────────────────────────────

/** Maps speed range labels to approximate Vc boundaries per ISO group (m/min) */
const SPEED_THRESHOLDS: Record<ISOGroup, Record<SpeedRange, [number, number]>> = {
  P: { low: [0, 120],   medium: [120, 250],  high: [250, 400],   very_high: [400, 800] },
  M: { low: [0, 80],    medium: [80, 180],   high: [180, 300],   very_high: [300, 500] },
  K: { low: [0, 100],   medium: [100, 250],  high: [250, 400],   very_high: [400, 700] },
  N: { low: [0, 200],   medium: [200, 600],  high: [600, 1500],  very_high: [1500, 5000] },
  S: { low: [0, 30],    medium: [30, 60],    high: [60, 100],    very_high: [100, 200] },
  H: { low: [0, 60],    medium: [60, 120],   high: [120, 200],   very_high: [200, 350] },
};

// ─── High-Temperature Coatings Set ────────────────────────────────

const HIGH_TEMP_COATINGS: Set<CoatingName> = new Set<CoatingName>([
  "AlTiN", "AlCrN", "TiAlSiN", "TiAlN", "PVD_MultiLayer",
]);

// ─── Decision Logic ────────────────────────────────────────────────

/**
 * ISO-group-specific coating selection rules.
 * Each function returns [primaryCoating, reasoning[]] for the given conditions.
 */
type SelectionRule = (
  op: CoatingOperationType,
  speed: SpeedRange,
  coolant: CoolantType,
  substrate: ToolSubstrate
) => [CoatingName, string[]];

const ISO_RULES: Record<ISOGroup, SelectionRule> = {
  /**
   * ISO P — Steel
   * TiAlN for roughing, AlTiN for high-speed finishing, TiCN for low-speed
   */
  P: (op, speed, _coolant, _substrate) => {
    if (speed === "low") {
      return ["TiCN", [
        "ISO P steel at low cutting speed",
        "TiCN provides superior abrasion resistance at lower temperatures",
        "Higher hardness than TiN with good toughness for steel",
      ]];
    }
    if (speed === "very_high" || (speed === "high" && op === "finishing")) {
      return ["AlTiN", [
        "ISO P steel at high/very-high speed or high-speed finishing",
        "AlTiN forms protective Al2O3 oxide layer at elevated temperatures",
        "Excellent thermal barrier for aggressive steel cutting",
      ]];
    }
    if (op === "roughing" || op === "turning") {
      return ["TiAlN", [
        "ISO P steel roughing/turning at medium-high speed",
        "TiAlN balances heat resistance (800C) with toughness",
        "Industry standard for general steel roughing operations",
      ]];
    }
    return ["TiAlN", [
      "ISO P steel — TiAlN as reliable general-purpose choice",
      "Good balance of hardness, temperature resistance, and wear life",
    ]];
  },

  /**
   * ISO M — Stainless Steel
   * AlTiN primary, AlCrN for high-speed, TiAlN for general
   */
  M: (op, speed, _coolant, _substrate) => {
    if (speed === "very_high" || speed === "high") {
      return ["AlCrN", [
        "ISO M stainless steel at high/very-high speed",
        "AlCrN offers 1100C temperature limit — critical for stainless heat buildup",
        "Superior oxidation resistance prevents coating breakdown",
      ]];
    }
    if (op === "finishing") {
      return ["AlTiN", [
        "ISO M stainless steel finishing",
        "AlTiN provides excellent surface finish on work-hardening materials",
        "Protective oxide layer reduces adhesive wear (BUE prevention)",
      ]];
    }
    if (op === "drilling" || op === "threading") {
      return ["AlTiN", [
        `ISO M stainless steel ${op}`,
        "AlTiN heat resistance critical for confined-chip operations in stainless",
        "Good lubricity reduces galling tendency",
      ]];
    }
    return ["TiAlN", [
      "ISO M stainless steel — general purpose",
      "TiAlN provides reliable performance across stainless operations",
      "Good heat resistance for work-hardening material",
    ]];
  },

  /**
   * ISO K — Cast Iron
   * TiN or uncoated for gray CI, TiAlN for ductile CI, CVD Diamond for abrasive
   */
  K: (op, speed, _coolant, _substrate) => {
    if (speed === "very_high") {
      return ["CVD_Diamond", [
        "ISO K cast iron at very high speed",
        "CVD Diamond provides extreme wear resistance for abrasive cast iron dust",
        "Longest tool life in high-speed cast iron machining (3-5x coated carbide)",
      ]];
    }
    if (speed === "low" && (op === "roughing" || op === "turning")) {
      return ["TiN", [
        "ISO K cast iron at low speed — roughing/turning",
        "TiN is cost-effective for gray cast iron at moderate conditions",
        "Adequate thermal protection for low-speed cast iron operations",
      ]];
    }
    if (op === "finishing") {
      return ["TiAlN", [
        "ISO K cast iron finishing",
        "TiAlN provides the surface quality needed for finish passes",
        "Good wear resistance for ductile cast iron grades",
      ]];
    }
    if (speed === "low") {
      return ["Uncoated", [
        "ISO K gray cast iron at low speed",
        "Uncoated carbide maintains sharpest edge for clean chip formation",
        "Cast iron's self-lubricating graphite reduces coating necessity",
      ]];
    }
    return ["TiAlN", [
      "ISO K cast iron — general purpose",
      "TiAlN suitable for ductile and compacted graphite iron",
      "Balanced heat and wear resistance for medium-speed cast iron",
    ]];
  },

  /**
   * ISO N — Non-Ferrous (Aluminum, Copper, Brass)
   * DLC or uncoated for aluminum (NO TiAlN — causes BUE), CVD Diamond for composites
   */
  N: (op, speed, _coolant, _substrate) => {
    if (speed === "very_high" || speed === "high") {
      return ["CVD_Diamond", [
        "ISO N non-ferrous at high/very-high speed",
        "CVD Diamond provides lowest friction and longest life for aluminum/composites",
        "No chemical affinity with non-ferrous metals — no BUE risk",
      ]];
    }
    if (op === "threading" || (op === "drilling" && speed === "low")) {
      return ["Uncoated", [
        `ISO N non-ferrous ${op}`,
        "Uncoated provides sharpest cutting edge for thread/hole quality",
        "Non-ferrous materials do not generate enough heat to require coating",
      ]];
    }
    return ["DLC", [
      "ISO N non-ferrous — DLC prevents built-up edge",
      "Ultra-low friction coefficient (0.10) eliminates aluminum adhesion",
      "CRITICAL: TiAlN/AlTiN must NOT be used on aluminum — causes severe BUE",
    ]];
  },

  /**
   * ISO S — Superalloys (Titanium, Inconel, Cobalt)
   * AlCrN or TiAlSiN, AlTiN for moderate speeds
   */
  S: (op, speed, _coolant, _substrate) => {
    if (speed === "very_high" || speed === "high") {
      return ["TiAlSiN", [
        "ISO S superalloy at high/very-high speed",
        "TiAlSiN nanocomposite withstands 1200C — critical for superalloy heat",
        "Extreme hardness resists abrasive wear from hard carbide particles in alloy matrix",
      ]];
    }
    if (op === "roughing") {
      return ["AlCrN", [
        "ISO S superalloy roughing",
        "AlCrN 1100C thermal limit handles aggressive roughing heat generation",
        "Superior oxidation resistance for prolonged superalloy engagement",
      ]];
    }
    if (speed === "low" || speed === "medium") {
      return ["AlTiN", [
        "ISO S superalloy at moderate speed",
        "AlTiN provides excellent performance for standard superalloy conditions",
        "Good balance of heat resistance and toughness for Inconel/Titanium",
      ]];
    }
    return ["AlCrN", [
      "ISO S superalloy — general purpose",
      "AlCrN superior oxidation resistance is critical for reactive superalloys",
      "Thermal barrier effect reduces substrate temperature",
    ]];
  },

  /**
   * ISO H — Hardened Steel (>45 HRC)
   * TiAlSiN or CBN substrate (coating less relevant), AlCrN for moderate hardness
   */
  H: (op, speed, _coolant, substrate) => {
    if (substrate === "CBN") {
      return ["Uncoated", [
        "ISO H hardened steel with CBN substrate",
        "CBN substrate handles hardened steel directly — coating adhesion on CBN is poor",
        "CBN provides 4000+ HV hardness, exceeding any coating",
      ]];
    }
    if (speed === "very_high" || speed === "high") {
      return ["TiAlSiN", [
        "ISO H hardened steel at high/very-high speed",
        "TiAlSiN nanocomposite rated to 1200C — essential for hardened steel heat",
        "Extreme coating hardness (>3000 HV) resists abrasion from hard workpiece",
      ]];
    }
    if (op === "finishing") {
      return ["TiAlSiN", [
        "ISO H hardened steel finishing",
        "TiAlSiN provides superior surface finish on hardened workpieces",
        "Nanocomposite structure maintains sharp edge geometry longer",
      ]];
    }
    if (op === "roughing" && (speed === "low" || speed === "medium")) {
      return ["AlCrN", [
        "ISO H hardened steel roughing at moderate speed",
        "AlCrN toughness handles interrupted/heavy cuts in hardened material",
        "1100C thermal limit protects during aggressive roughing engagement",
      ]];
    }
    return ["AlCrN", [
      "ISO H hardened steel — general purpose",
      "AlCrN provides reliable performance across hardened steel operations",
      "Good oxidation resistance at the elevated temps common in hard machining",
    ]];
  },
};

// ─── Alternative Generation ────────────────────────────────────────

/**
 * Generate ranked alternatives with reasons why each was not the primary pick.
 */
function buildAlternatives(
  primary: CoatingName,
  isoGroup: ISOGroup,
  operation: CoatingOperationType,
  speed: SpeedRange,
  coolant: CoolantType,
  substrate: ToolSubstrate
): CoatingAlternative[] {
  const alternatives: CoatingAlternative[] = [];
  const allCoatings = Object.keys(COATING_DB) as CoatingName[];

  for (const coating of allCoatings) {
    if (coating === primary) continue;
    const data = COATING_DB[coating];

    // Skip obviously incompatible coatings — no need to list them
    if (substrate === "PCD" && coating !== "Uncoated") continue;

    let why_not: string | null = null;

    // ISO group mismatch
    if (!data.iso_groups.includes(isoGroup)) {
      why_not = `Not rated for ISO ${isoGroup} materials`;
    }
    // Temperature concerns
    else if ((speed === "very_high" || speed === "high") && data.max_temp_C < 600) {
      why_not = `Temperature limit ${data.max_temp_C}C too low for ${speed} speed cutting`;
    }
    // BUE risk for non-ferrous
    else if (isoGroup === "N" && (coating === "TiAlN" || coating === "AlTiN")) {
      why_not = "Causes built-up edge (BUE) on aluminum and non-ferrous alloys";
    }
    // CVD Diamond + ferrous
    else if (coating === "CVD_Diamond" && ["P", "M", "H"].includes(isoGroup)) {
      why_not = "CVD Diamond dissolves in contact with steel at cutting temperatures — carbon diffusion";
    }
    // DLC temperature limit
    else if (coating === "DLC" && (speed === "high" || speed === "very_high") && isoGroup !== "N") {
      why_not = `DLC max temperature ${data.max_temp_C}C insufficient for ${speed} speed in ISO ${isoGroup}`;
    }
    // Uncoated at high speed
    else if (coating === "Uncoated" && (speed === "high" || speed === "very_high")) {
      why_not = "Uncoated substrate cannot withstand high-speed cutting temperatures";
    }
    // General: less optimal for the specific scenario
    else if (coating === "TiN" && (speed === "high" || speed === "very_high")) {
      why_not = "TiN temperature limit (400C) too low for high-speed applications";
    }
    else if (coating === "TiCN" && isoGroup === "S") {
      why_not = "TiCN temperature limit (450C) insufficient for superalloy heat generation";
    }
    else if (coating === "PVD_MultiLayer" && coating !== primary) {
      why_not = "Viable alternative but primary coating better matched for specific conditions";
    }
    else {
      // Generic fallback
      why_not = `${primary} better suited for ISO ${isoGroup} ${operation} at ${speed} speed`;
    }

    if (why_not !== null) {
      alternatives.push({ coating, why_not });
    }
  }

  // Limit to 4 most relevant alternatives
  return alternatives.slice(0, 4);
}

// ─── Dry Machining Override ────────────────────────────────────────

/**
 * When coolant = dry, override the primary selection to prefer high-temperature
 * coatings (AlTiN, AlCrN, TiAlSiN) that can handle elevated cutting zone temps.
 */
function applyDryOverride(
  primary: CoatingName,
  reasoning: string[],
  isoGroup: ISOGroup
): [CoatingName, string[]] {
  // Already a high-temp coating — no override needed
  if (HIGH_TEMP_COATINGS.has(primary)) {
    reasoning.push("Dry machining confirmed — selected coating has adequate thermal resistance");
    return [primary, reasoning];
  }

  // ISO N exception: DLC is still preferred for aluminum even when dry
  // because aluminum machining temperatures are inherently lower
  if (isoGroup === "N" && (primary === "DLC" || primary === "CVD_Diamond")) {
    reasoning.push("Dry machining: DLC/CVD retained for non-ferrous — lower cutting temps acceptable");
    return [primary, reasoning];
  }

  // Override to AlTiN as the safest general dry-machining coating
  const overridden: CoatingName = "AlTiN";
  return [overridden, [
    ...reasoning,
    `DRY MACHINING OVERRIDE: ${primary} replaced with AlTiN`,
    "AlTiN forms protective Al2O3 oxide layer that improves with heat",
    "Without coolant, coating must self-manage temperatures up to 900C",
  ]];
}

// ─── Substrate Compatibility Check ─────────────────────────────────

/**
 * Certain substrates have coating restrictions. Returns [coating, reasoning]
 * with possible override if the substrate is incompatible with the selected coating.
 */
function checkSubstrateCompatibility(
  coating: CoatingName,
  substrate: ToolSubstrate,
  reasoning: string[]
): [CoatingName, string[]] {
  // PCD/CBN substrates: coatings do not adhere well
  if (substrate === "PCD") {
    return ["Uncoated", [
      ...reasoning,
      "SUBSTRATE OVERRIDE: PCD substrate — coatings do not adhere to polycrystalline diamond",
      "PCD inherent hardness (8000+ HV) exceeds all coatings",
    ]];
  }
  if (substrate === "CBN" && coating !== "Uncoated" && coating !== "TiAlN") {
    return ["Uncoated", [
      ...reasoning,
      "SUBSTRATE OVERRIDE: CBN substrate typically used uncoated",
      "CBN hardness (4000+ HV) provides adequate wear resistance without coating",
    ]];
  }

  // Ceramic substrates: limited coating options
  if (substrate === "ceramic" && !["Uncoated", "TiAlN", "AlTiN", "PVD_MultiLayer"].includes(coating)) {
    const override: CoatingName = "TiAlN";
    return [override, [
      ...reasoning,
      `SUBSTRATE ADJUSTMENT: ceramic substrate — ${coating} replaced with TiAlN`,
      "Limited coating options for ceramic substrates; TiAlN PVD is most common",
    ]];
  }

  // HSS substrate: CVD/high-temp coatings can damage the softer substrate
  if (substrate === "HSS" && (coating === "CVD_Diamond" || coating === "TiAlSiN")) {
    const override: CoatingName = "TiN";
    return [override, [
      ...reasoning,
      `SUBSTRATE ADJUSTMENT: HSS substrate — ${coating} replaced with TiN`,
      "CVD process temperatures damage HSS; TiN PVD is the standard HSS coating",
    ]];
  }

  return [coating, reasoning];
}

// ─── Engine Class ──────────────────────────────────────────────────

/**
 * CoatingSelectionEngine — Selects optimal cutting tool coating based on
 * ISO material group, operation type, cutting speed range, coolant strategy,
 * and tool substrate. Replaces hardcoded TiAlN in PrintToProgramPipelineEngine.
 *
 * @example
 * ```ts
 * const result = coatingSelectionEngine.calculate({
 *   iso_group: "P",
 *   operation: "roughing",
 *   speed_range: "medium",
 *   coolant: "flood",
 *   substrate: "carbide",
 * });
 * // result.coating => "TiAlN"
 * ```
 */
export class CoatingSelectionEngine {
  /**
   * Select the optimal tool coating for the given machining conditions.
   *
   * Decision pipeline:
   *   1. ISO-group-specific rule selects primary coating + reasoning
   *   2. Dry machining override (if coolant = dry)
   *   3. Substrate compatibility check (PCD/CBN/ceramic/HSS overrides)
   *   4. Build alternatives list with rejection reasons
   *   5. Attach coating properties from database
   *
   * @param input - Machining conditions for coating selection
   * @returns Coating recommendation with reasoning, alternatives, and properties
   */
  calculate(input: CoatingSelectionInput): CoatingSelectionResult {
    const { iso_group, operation, speed_range, coolant, substrate } = input;

    // Step 1: ISO-group-specific rule
    const rule = ISO_RULES[iso_group];
    let [coating, reasoning] = rule(operation, speed_range, coolant, substrate);

    // Step 2: Dry machining override
    if (coolant === "dry") {
      [coating, reasoning] = applyDryOverride(coating, reasoning, iso_group);
    }

    // Step 3: Substrate compatibility check
    [coating, reasoning] = checkSubstrateCompatibility(coating, substrate, reasoning);

    // Step 4: Build alternatives
    const alternatives = buildAlternatives(
      coating, iso_group, operation, speed_range, coolant, substrate
    );

    // Step 4b (U-REG4): Enrich alternatives from CoatingRegistry (100+ coatings)
    try {
      const { coatingRegistry } = require("../registries/CoatingRegistry.js");
      if (coatingRegistry?.count && coatingRegistry.count() > 0) {
        const registryResults = coatingRegistry.recommend({
          material_group: iso_group,
          application: operation,
        });
        if (Array.isArray(registryResults)) {
          const existingNames = new Set([coating, ...alternatives.map((a: CoatingAlternative) => a.coating)]);
          for (const entry of registryResults.slice(0, 3)) {
            const name = entry.name || entry.id;
            if (name && !existingNames.has(name)) {
              alternatives.push({
                coating: name as CoatingName,
                why_not: `Registry alternative: ${entry.description || name}`,
              });
              existingNames.add(name);
            }
          }
        }
      }
    } catch { /* Registry not loaded — use inline DB only */ }

    // Step 5: Attach properties
    const props = COATING_DB[coating];

    return {
      coating,
      reasoning,
      alternatives,
      temperature_limit_C: props.max_temp_C,
      hardness_HV: props.hardness_HV,
      friction_coefficient: props.friction_coefficient,
    };
  }

  /**
   * Quick lookup: get the speed range classification boundaries for an ISO group.
   * Useful for callers that have a numeric Vc and need to classify it.
   *
   * @param isoGroup - ISO 513 material group
   * @returns Speed range thresholds in m/min as [min, max] per range
   */
  getSpeedThresholds(isoGroup: ISOGroup): Record<SpeedRange, [number, number]> {
    return SPEED_THRESHOLDS[isoGroup];
  }

  /**
   * Classify a numeric cutting speed (m/min) into a SpeedRange label
   * for a given ISO group.
   *
   * @param isoGroup - ISO 513 material group
   * @param vc_m_min - Cutting speed in m/min
   * @returns Speed range classification
   */
  classifySpeed(isoGroup: ISOGroup, vc_m_min: number): SpeedRange {
    const thresholds = SPEED_THRESHOLDS[isoGroup];
    if (vc_m_min >= thresholds.very_high[0]) return "very_high";
    if (vc_m_min >= thresholds.high[0]) return "high";
    if (vc_m_min >= thresholds.medium[0]) return "medium";
    return "low";
  }

  /**
   * Get raw coating properties for external consumers.
   *
   * @param coating - Coating name
   * @returns Coating database entry or undefined if not found
   */
  getCoatingData(coating: CoatingName): CoatingData | undefined {
    return COATING_DB[coating];
  }
}

/** Singleton instance — shortcode E1082 */
export const coatingSelectionEngine = new CoatingSelectionEngine();
