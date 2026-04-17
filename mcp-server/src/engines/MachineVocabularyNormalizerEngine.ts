/**
 * MCAT-MS0 P1-U02: Machine Vocabulary Normalizer
 *
 * Normalizes machine data vocabularies across multiple dimensions:
 * - Manufacturer names (case, abbreviations, typos)
 * - Model identifiers (spacing, dashes, suffixes)
 * - Controller types (vendor prefixes, version formats)
 * - Spindle specifications (naming conventions)
 * - Coolant systems (terminology variations)
 * - Capability descriptions (standardization)
 *
 * This engine provides consistent vocabularies for downstream
 * machine-package matching and calculator integration.
 *
 * @module engines/MachineVocabularyNormalizerEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface NormalizationResult<T = string> {
  original: string;
  normalized: T;
  confidence: number;
  matchType: "exact" | "alias" | "fuzzy" | "pattern" | "default";
  alternatives?: T[];
}

export interface VocabularyStats {
  totalNormalizations: number;
  byMatchType: Record<string, number>;
  byCategory: Record<string, number>;
  unknownValues: string[];
}

export interface ManufacturerCanonical {
  id: string;
  name: string;
  aliases: string[];
  country: string;
  machineTypes: string[];
}

export interface ControllerCanonical {
  id: string;
  vendor: string;
  family: string;
  model: string;
  fullName: string;
  aliases: string[];
  generation?: string;
}

export interface SpindleCanonical {
  id: string;
  type: "belt" | "direct" | "gear" | "motorized" | "electrospindle";
  maxRpm: number;
  powerKw?: number;
  torqueNm?: number;
  description: string;
}

export interface CoolantCanonical {
  id: string;
  type: "flood" | "mist" | "mql" | "through_spindle" | "through_tool" | "cryogenic" | "dry" | "air";
  delivery: string;
  pressure?: "low" | "medium" | "high" | "ultra_high";
  description: string;
}

export interface CapabilityCanonical {
  id: string;
  category: "axis" | "speed" | "precision" | "automation" | "tooling" | "workholding" | "special";
  name: string;
  description: string;
}

// ============================================================================
// CANONICAL MANUFACTURER DATABASE
// ============================================================================

const MANUFACTURER_CANONICALS: ManufacturerCanonical[] = [
  { id: "okuma", name: "Okuma", aliases: ["okuma", "OKUMA", "Okuma Corporation", "Okuma America"], country: "Japan", machineTypes: ["lathe", "mill", "multitasking"] },
  { id: "mazak", name: "Mazak", aliases: ["mazak", "MAZAK", "Yamazaki Mazak", "Mazak Corporation"], country: "Japan", machineTypes: ["lathe", "mill", "multitasking", "laser"] },
  { id: "haas", name: "Haas", aliases: ["haas", "HAAS", "Haas Automation", "Haas CNC"], country: "USA", machineTypes: ["mill", "lathe", "rotary"] },
  { id: "dmg_mori", name: "DMG MORI", aliases: ["dmg", "mori", "dmg mori", "DMG MORI", "Mori Seiki", "Deckel Maho", "Gildemeister"], country: "Germany/Japan", machineTypes: ["lathe", "mill", "multitasking", "additive"] },
  { id: "makino", name: "Makino", aliases: ["makino", "MAKINO", "Makino Milling"], country: "Japan", machineTypes: ["mill", "edm"] },
  { id: "doosan", name: "Doosan", aliases: ["doosan", "DOOSAN", "Doosan Machine Tools", "DN Solutions", "DNSolutions"], country: "Korea", machineTypes: ["lathe", "mill", "boring"] },
  { id: "hurco", name: "Hurco", aliases: ["hurco", "HURCO", "Hurco Companies"], country: "USA", machineTypes: ["mill", "lathe"] },
  { id: "brother", name: "Brother", aliases: ["brother", "BROTHER", "Brother Industries"], country: "Japan", machineTypes: ["tapping", "mill"] },
  { id: "citizen", name: "Citizen", aliases: ["citizen", "CITIZEN", "Citizen Machinery", "Citizen Watch"], country: "Japan", machineTypes: ["swiss", "lathe"] },
  { id: "star", name: "Star", aliases: ["star", "STAR", "Star Micronics", "Star CNC"], country: "Japan", machineTypes: ["swiss", "lathe"] },
  { id: "tsugami", name: "Tsugami", aliases: ["tsugami", "TSUGAMI", "Tsugami Corporation"], country: "Japan", machineTypes: ["swiss", "lathe"] },
  { id: "hardinge", name: "Hardinge", aliases: ["hardinge", "HARDINGE", "Hardinge Inc"], country: "USA", machineTypes: ["lathe", "grinding"] },
  { id: "nakamura", name: "Nakamura-Tome", aliases: ["nakamura", "NAKAMURA", "Nakamura-Tome", "NT"], country: "Japan", machineTypes: ["multitasking", "lathe"] },
  { id: "mitsubishi", name: "Mitsubishi", aliases: ["mitsubishi", "MITSUBISHI", "Mitsubishi Electric", "MC Machinery"], country: "Japan", machineTypes: ["edm", "laser"] },
  { id: "fanuc", name: "FANUC", aliases: ["fanuc", "FANUC", "Fanuc Corporation"], country: "Japan", machineTypes: ["robodrill", "robocut", "edm"] },
  { id: "sodick", name: "Sodick", aliases: ["sodick", "SODICK", "Sodick Inc"], country: "Japan", machineTypes: ["edm"] },
  { id: "agie", name: "AgieCharmilles", aliases: ["agie", "charmilles", "AGIE", "AgieCharmilles", "GF Machining"], country: "Switzerland", machineTypes: ["edm"] },
  { id: "roku_roku", name: "Roku-Roku", aliases: ["roku-roku", "roku roku", "ROKU-ROKU", "Roku Roku"], country: "Japan", machineTypes: ["mill"] },
  { id: "matsuura", name: "Matsuura", aliases: ["matsuura", "MATSUURA", "Matsuura Machinery"], country: "Japan", machineTypes: ["mill", "5-axis"] },
  { id: "hermle", name: "Hermle", aliases: ["hermle", "HERMLE", "Maschinenfabrik Berthold Hermle"], country: "Germany", machineTypes: ["mill", "5-axis"] },
];

// ============================================================================
// CANONICAL CONTROLLER DATABASE
// ============================================================================

const CONTROLLER_CANONICALS: ControllerCanonical[] = [
  // FANUC
  { id: "fanuc_0i", vendor: "FANUC", family: "0i", model: "0i-TF", fullName: "FANUC 0i-TF", aliases: ["0i-TF", "0i-MF", "0i-TF Plus", "FANUC 0i", "Fanuc 0i"] },
  { id: "fanuc_31i", vendor: "FANUC", family: "31i", model: "31i-B", fullName: "FANUC 31i-B", aliases: ["31i-B", "31i-MB", "31i-B5", "FANUC 31i", "Fanuc 31i", "31i"] },
  { id: "fanuc_30i", vendor: "FANUC", family: "30i", model: "30i-B", fullName: "FANUC 30i-B", aliases: ["30i-B", "30i-MB", "FANUC 30i", "Fanuc 30i", "30i"] },
  { id: "fanuc_35i", vendor: "FANUC", family: "35i", model: "35i-B", fullName: "FANUC 35i-B", aliases: ["35i-B", "FANUC 35i", "Fanuc 35i", "35i"] },

  // Siemens
  { id: "siemens_840d", vendor: "Siemens", family: "840D", model: "840D sl", fullName: "Siemens SINUMERIK 840D sl", aliases: ["840D", "840D sl", "SINUMERIK 840D", "Siemens 840D", "840Dsl"] },
  { id: "siemens_828d", vendor: "Siemens", family: "828D", model: "828D", fullName: "Siemens SINUMERIK 828D", aliases: ["828D", "SINUMERIK 828D", "Siemens 828D", "828D BASIC"] },

  // Mitsubishi
  { id: "mitsubishi_m80", vendor: "Mitsubishi", family: "M800", model: "M80", fullName: "Mitsubishi M80", aliases: ["M80", "M80A", "M800", "MELDAS M80"] },
  { id: "mitsubishi_m70", vendor: "Mitsubishi", family: "M700", model: "M70", fullName: "Mitsubishi M70", aliases: ["M70", "M70A", "M700", "MELDAS M70"] },

  // Haas
  { id: "haas_ngc", vendor: "Haas", family: "NGC", model: "NGC", fullName: "Haas NGC", aliases: ["NGC", "Haas NGC", "Haas Control", "Next Generation Control"] },
  { id: "haas_classic", vendor: "Haas", family: "Classic", model: "Classic", fullName: "Haas Classic", aliases: ["Classic", "Haas Classic", "Legacy"] },

  // Okuma
  { id: "okuma_osp", vendor: "Okuma", family: "OSP", model: "OSP-P300", fullName: "Okuma OSP-P300", aliases: ["OSP-P300", "P300", "OSP-P", "OSP", "THINC-OSP"] },
  { id: "okuma_osp_p500", vendor: "Okuma", family: "OSP", model: "OSP-P500", fullName: "Okuma OSP-P500", aliases: ["OSP-P500", "P500"] },

  // Mazak
  { id: "mazak_mazatrol", vendor: "Mazak", family: "Mazatrol", model: "SmoothAi", fullName: "Mazak Mazatrol SmoothAi", aliases: ["SmoothAi", "Smooth Ai", "Mazatrol", "SmoothG", "SmoothX"] },
  { id: "mazak_matrix", vendor: "Mazak", family: "Matrix", model: "Matrix 2", fullName: "Mazak Matrix 2", aliases: ["Matrix", "Matrix 2", "Matrix Nexus"] },

  // Hurco
  { id: "hurco_max5", vendor: "Hurco", family: "MAX", model: "MAX5", fullName: "Hurco MAX5", aliases: ["MAX5", "WinMax", "Hurco Control", "MAX"] },
];

// ============================================================================
// CANONICAL SPINDLE TYPES
// ============================================================================

const SPINDLE_TYPE_PATTERNS: Array<{ pattern: RegExp; type: SpindleCanonical["type"]; description: string }> = [
  { pattern: /belt[\s-]?driv/i, type: "belt", description: "Belt-driven spindle" },
  { pattern: /direct[\s-]?driv/i, type: "direct", description: "Direct-drive spindle" },
  { pattern: /gear[\s-]?driv|geared/i, type: "gear", description: "Gear-driven spindle" },
  { pattern: /motor(ized)?[\s-]?spindle|built[\s-]?in|integral/i, type: "motorized", description: "Motorized/integral spindle" },
  { pattern: /electro[\s-]?spindle|hsk[\s-]?electro/i, type: "electrospindle", description: "Electrospindle" },
];

// ============================================================================
// CANONICAL COOLANT TYPES
// ============================================================================

const COOLANT_CANONICALS: CoolantCanonical[] = [
  { id: "flood", type: "flood", delivery: "external", description: "Flood coolant (external nozzle)" },
  { id: "mist", type: "mist", delivery: "external", description: "Mist coolant (atomized)" },
  { id: "mql", type: "mql", delivery: "external", description: "Minimum Quantity Lubrication" },
  { id: "through_spindle", type: "through_spindle", delivery: "internal", pressure: "high", description: "Through-spindle coolant" },
  { id: "through_tool", type: "through_tool", delivery: "internal", pressure: "high", description: "Through-tool coolant" },
  { id: "cryogenic", type: "cryogenic", delivery: "external", description: "Cryogenic cooling (LN2/CO2)" },
  { id: "dry", type: "dry", delivery: "none", description: "Dry machining (no coolant)" },
  { id: "air", type: "air", delivery: "external", description: "Air blast / chip clearing" },
];

const COOLANT_ALIASES: Record<string, string> = {
  "flood": "flood",
  "flood coolant": "flood",
  "wet": "flood",
  "emulsion": "flood",
  "mist": "mist",
  "fog": "mist",
  "atomized": "mist",
  "mql": "mql",
  "minimum quantity": "mql",
  "min quantity lubrication": "mql",
  "near dry": "mql",
  "through spindle": "through_spindle",
  "thru spindle": "through_spindle",
  "tsc": "through_spindle",
  "high pressure": "through_spindle",
  "hpc": "through_spindle",
  "through tool": "through_tool",
  "thru tool": "through_tool",
  "ttc": "through_tool",
  "cryo": "cryogenic",
  "cryogenic": "cryogenic",
  "ln2": "cryogenic",
  "co2": "cryogenic",
  "liquid nitrogen": "cryogenic",
  "dry": "dry",
  "no coolant": "dry",
  "air": "air",
  "air blast": "air",
  "air blow": "air",
  "compressed air": "air",
};

// ============================================================================
// CANONICAL CAPABILITY CATEGORIES
// ============================================================================

const CAPABILITY_PATTERNS: Array<{ pattern: RegExp; category: CapabilityCanonical["category"]; name: string }> = [
  // Axis capabilities
  { pattern: /3[\s-]?axis|3ax/i, category: "axis", name: "3-axis" },
  { pattern: /4[\s-]?axis|4ax/i, category: "axis", name: "4-axis" },
  { pattern: /5[\s-]?axis|5ax/i, category: "axis", name: "5-axis" },
  { pattern: /mill[\s-]?turn|turn[\s-]?mill|multi[\s-]?task/i, category: "axis", name: "Mill-Turn" },
  { pattern: /y[\s-]?axis/i, category: "axis", name: "Y-axis" },
  { pattern: /b[\s-]?axis/i, category: "axis", name: "B-axis" },
  { pattern: /c[\s-]?axis|live[\s-]?tool/i, category: "axis", name: "C-axis/Live Tooling" },

  // Speed capabilities
  { pattern: /high[\s-]?speed|hsm|hsc/i, category: "speed", name: "High-Speed Machining" },
  { pattern: /high[\s-]?torque/i, category: "speed", name: "High-Torque" },

  // Precision capabilities
  { pattern: /high[\s-]?precis|ultra[\s-]?precis/i, category: "precision", name: "High-Precision" },
  { pattern: /nano[\s-]?precis/i, category: "precision", name: "Nano-Precision" },
  { pattern: /thermal[\s-]?comp|thermal[\s-]?stab/i, category: "precision", name: "Thermal Compensation" },

  // Automation
  { pattern: /pallet[\s-]?chang|pallet[\s-]?pool|apc/i, category: "automation", name: "Pallet Changer" },
  { pattern: /bar[\s-]?feed|bar[\s-]?load/i, category: "automation", name: "Bar Feeder" },
  { pattern: /gantry[\s-]?load|robot[\s-]?load/i, category: "automation", name: "Robotic Loading" },
  { pattern: /parts[\s-]?catch|part[\s-]?catch/i, category: "automation", name: "Parts Catcher" },

  // Tooling
  { pattern: /atc|auto[\s-]?tool[\s-]?chang/i, category: "tooling", name: "ATC" },
  { pattern: /turret|tool[\s-]?turret/i, category: "tooling", name: "Tool Turret" },
  { pattern: /magazine|tool[\s-]?mag/i, category: "tooling", name: "Tool Magazine" },

  // Workholding
  { pattern: /sub[\s-]?spindle/i, category: "workholding", name: "Sub-Spindle" },
  { pattern: /dual[\s-]?spindle|twin[\s-]?spindle/i, category: "workholding", name: "Dual Spindle" },
  { pattern: /tailstock/i, category: "workholding", name: "Tailstock" },
  { pattern: /steady[\s-]?rest/i, category: "workholding", name: "Steady Rest" },

  // Special
  { pattern: /swiss[\s-]?type|sliding[\s-]?head/i, category: "special", name: "Swiss-Type" },
  { pattern: /wire[\s-]?edm|wedm/i, category: "special", name: "Wire EDM" },
  { pattern: /sinker[\s-]?edm|ram[\s-]?edm/i, category: "special", name: "Sinker EDM" },
  { pattern: /laser[\s-]?cut/i, category: "special", name: "Laser Cutting" },
  { pattern: /additive|3d[\s-]?print/i, category: "special", name: "Additive Manufacturing" },
];

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class MachineVocabularyNormalizerEngine {
  private stats: VocabularyStats = {
    totalNormalizations: 0,
    byMatchType: {},
    byCategory: {},
    unknownValues: [],
  };

  /**
   * Normalize a manufacturer name to canonical form
   */
  normalizeManufacturer(input: string): NormalizationResult<ManufacturerCanonical> {
    const trimmed = input.trim();
    const lower = trimmed.toLowerCase();

    this.stats.totalNormalizations++;
    this.stats.byCategory["manufacturer"] = (this.stats.byCategory["manufacturer"] || 0) + 1;

    // Exact match on canonical name
    for (const mfr of MANUFACTURER_CANONICALS) {
      if (mfr.name.toLowerCase() === lower || mfr.id === lower) {
        this.recordMatchType("exact");
        return { original: input, normalized: mfr, confidence: 1.0, matchType: "exact" };
      }
    }

    // Alias match
    for (const mfr of MANUFACTURER_CANONICALS) {
      for (const alias of mfr.aliases) {
        if (alias.toLowerCase() === lower) {
          this.recordMatchType("alias");
          return { original: input, normalized: mfr, confidence: 0.95, matchType: "alias" };
        }
      }
    }

    // Fuzzy match (contains)
    for (const mfr of MANUFACTURER_CANONICALS) {
      if (lower.includes(mfr.id) || mfr.id.includes(lower)) {
        this.recordMatchType("fuzzy");
        return { original: input, normalized: mfr, confidence: 0.75, matchType: "fuzzy" };
      }
    }

    // No match - return with default
    this.recordMatchType("default");
    this.stats.unknownValues.push(`manufacturer:${input}`);
    const defaultMfr: ManufacturerCanonical = {
      id: this.slugify(input),
      name: this.titleCase(input),
      aliases: [input],
      country: "Unknown",
      machineTypes: [],
    };
    return { original: input, normalized: defaultMfr, confidence: 0.3, matchType: "default" };
  }

  /**
   * Normalize a controller identifier to canonical form
   */
  normalizeController(input: string): NormalizationResult<ControllerCanonical> {
    const trimmed = input.trim();
    const lower = trimmed.toLowerCase();

    this.stats.totalNormalizations++;
    this.stats.byCategory["controller"] = (this.stats.byCategory["controller"] || 0) + 1;

    // Exact match on full name
    for (const ctrl of CONTROLLER_CANONICALS) {
      if (ctrl.fullName.toLowerCase() === lower || ctrl.id === lower) {
        this.recordMatchType("exact");
        return { original: input, normalized: ctrl, confidence: 1.0, matchType: "exact" };
      }
    }

    // Alias match
    for (const ctrl of CONTROLLER_CANONICALS) {
      for (const alias of ctrl.aliases) {
        if (alias.toLowerCase() === lower || lower.includes(alias.toLowerCase())) {
          this.recordMatchType("alias");
          return { original: input, normalized: ctrl, confidence: 0.9, matchType: "alias" };
        }
      }
    }

    // Pattern match for common controller naming
    const fanucMatch = lower.match(/fanuc\s*(\d+i?)/);
    if (fanucMatch) {
      const modelNum = fanucMatch[1];
      for (const ctrl of CONTROLLER_CANONICALS) {
        if (ctrl.vendor === "FANUC" && ctrl.family.toLowerCase().includes(modelNum)) {
          this.recordMatchType("pattern");
          return { original: input, normalized: ctrl, confidence: 0.85, matchType: "pattern" };
        }
      }
    }

    const siemensMatch = lower.match(/siemens\s*(\d+d)/);
    if (siemensMatch) {
      const modelNum = siemensMatch[1];
      for (const ctrl of CONTROLLER_CANONICALS) {
        if (ctrl.vendor === "Siemens" && ctrl.family.toLowerCase().includes(modelNum)) {
          this.recordMatchType("pattern");
          return { original: input, normalized: ctrl, confidence: 0.85, matchType: "pattern" };
        }
      }
    }

    // No match - return with default
    this.recordMatchType("default");
    this.stats.unknownValues.push(`controller:${input}`);
    const defaultCtrl: ControllerCanonical = {
      id: this.slugify(input),
      vendor: "Unknown",
      family: "Unknown",
      model: input,
      fullName: input,
      aliases: [input],
    };
    return { original: input, normalized: defaultCtrl, confidence: 0.3, matchType: "default" };
  }

  /**
   * Normalize spindle type/description
   */
  normalizeSpindle(input: string, maxRpm?: number, powerKw?: number): NormalizationResult<SpindleCanonical> {
    const trimmed = input.trim();

    this.stats.totalNormalizations++;
    this.stats.byCategory["spindle"] = (this.stats.byCategory["spindle"] || 0) + 1;

    // Pattern match for spindle type
    for (const pattern of SPINDLE_TYPE_PATTERNS) {
      if (pattern.pattern.test(trimmed)) {
        this.recordMatchType("pattern");
        const spindle: SpindleCanonical = {
          id: `${pattern.type}_${maxRpm || "unknown"}`,
          type: pattern.type,
          maxRpm: maxRpm || 0,
          powerKw,
          description: pattern.description,
        };
        return { original: input, normalized: spindle, confidence: 0.9, matchType: "pattern" };
      }
    }

    // Default based on RPM if no pattern match
    let inferredType: SpindleCanonical["type"] = "belt";
    if (maxRpm && maxRpm > 15000) {
      inferredType = "direct";
    } else if (maxRpm && maxRpm > 40000) {
      inferredType = "electrospindle";
    }

    this.recordMatchType("default");
    const defaultSpindle: SpindleCanonical = {
      id: `${inferredType}_${maxRpm || "unknown"}`,
      type: inferredType,
      maxRpm: maxRpm || 0,
      powerKw,
      description: trimmed || `${inferredType} spindle`,
    };
    return { original: input, normalized: defaultSpindle, confidence: 0.5, matchType: "default" };
  }

  /**
   * Normalize coolant type
   */
  normalizeCoolant(input: string): NormalizationResult<CoolantCanonical> {
    const trimmed = input.trim();
    const lower = trimmed.toLowerCase();

    this.stats.totalNormalizations++;
    this.stats.byCategory["coolant"] = (this.stats.byCategory["coolant"] || 0) + 1;

    // Direct alias lookup
    const aliasMatch = COOLANT_ALIASES[lower];
    if (aliasMatch) {
      const canonical = COOLANT_CANONICALS.find(c => c.id === aliasMatch);
      if (canonical) {
        this.recordMatchType("alias");
        return { original: input, normalized: canonical, confidence: 0.95, matchType: "alias" };
      }
    }

    // Partial match
    for (const [alias, id] of Object.entries(COOLANT_ALIASES)) {
      if (lower.includes(alias) || alias.includes(lower)) {
        const canonical = COOLANT_CANONICALS.find(c => c.id === id);
        if (canonical) {
          this.recordMatchType("fuzzy");
          return { original: input, normalized: canonical, confidence: 0.8, matchType: "fuzzy" };
        }
      }
    }

    // Default to flood
    this.recordMatchType("default");
    this.stats.unknownValues.push(`coolant:${input}`);
    const defaultCoolant = COOLANT_CANONICALS.find(c => c.id === "flood")!;
    return { original: input, normalized: defaultCoolant, confidence: 0.4, matchType: "default" };
  }

  /**
   * Normalize capability description
   */
  normalizeCapability(input: string): NormalizationResult<CapabilityCanonical> {
    const trimmed = input.trim();

    this.stats.totalNormalizations++;
    this.stats.byCategory["capability"] = (this.stats.byCategory["capability"] || 0) + 1;

    // Pattern match
    for (const pattern of CAPABILITY_PATTERNS) {
      if (pattern.pattern.test(trimmed)) {
        this.recordMatchType("pattern");
        const capability: CapabilityCanonical = {
          id: this.slugify(pattern.name),
          category: pattern.category,
          name: pattern.name,
          description: trimmed,
        };
        return { original: input, normalized: capability, confidence: 0.9, matchType: "pattern" };
      }
    }

    // Default
    this.recordMatchType("default");
    this.stats.unknownValues.push(`capability:${input}`);
    const defaultCap: CapabilityCanonical = {
      id: this.slugify(input),
      category: "special",
      name: this.titleCase(input),
      description: input,
    };
    return { original: input, normalized: defaultCap, confidence: 0.3, matchType: "default" };
  }

  /**
   * Normalize model identifier (remove spaces, standardize separators)
   */
  normalizeModelId(manufacturer: string, modelInput: string): NormalizationResult<string> {
    const trimmed = modelInput.trim();

    this.stats.totalNormalizations++;
    this.stats.byCategory["model"] = (this.stats.byCategory["model"] || 0) + 1;

    // Remove extra spaces, normalize dashes
    let normalized = trimmed
      .replace(/\s+/g, " ")
      .replace(/[\s-]+/g, "-")
      .toUpperCase();

    // Remove manufacturer prefix if present
    const mfrLower = manufacturer.toLowerCase();
    if (normalized.toLowerCase().startsWith(mfrLower)) {
      normalized = normalized.substring(manufacturer.length).replace(/^[\s-]+/, "");
    }

    // Common model normalizations by manufacturer
    const mfrNormalized = this.normalizeManufacturer(manufacturer);
    const mfrId = mfrNormalized.normalized.id;

    if (mfrId === "okuma") {
      // Okuma: LB3000 EX II → LB3000-EX-II
      normalized = normalized.replace(/\s+EX\s*/i, "-EX-").replace(/-II$/i, "-II");
    } else if (mfrId === "haas") {
      // Haas: VF 2 SS → VF-2SS
      normalized = normalized.replace(/VF\s*(\d+)\s*SS/i, "VF-$1SS");
    } else if (mfrId === "mazak") {
      // Mazak: Quick Turn Nexus 250 → QTN-250
      normalized = normalized.replace(/Quick\s*Turn\s*Nexus\s*/i, "QTN-");
    }

    this.recordMatchType("pattern");
    return { original: modelInput, normalized, confidence: 0.9, matchType: "pattern" };
  }

  /**
   * Normalize all fields of a machine record
   */
  normalizeMachineRecord(record: {
    manufacturer?: string;
    model?: string;
    controller?: string;
    spindle_type?: string;
    spindle_max_rpm?: number;
    spindle_power_kw?: number;
    coolant?: string;
    capabilities?: string[];
  }): {
    manufacturer?: NormalizationResult<ManufacturerCanonical>;
    model?: NormalizationResult<string>;
    controller?: NormalizationResult<ControllerCanonical>;
    spindle?: NormalizationResult<SpindleCanonical>;
    coolant?: NormalizationResult<CoolantCanonical>;
    capabilities?: Array<NormalizationResult<CapabilityCanonical>>;
    overallConfidence: number;
  } {
    const results: ReturnType<typeof this.normalizeMachineRecord> = {
      overallConfidence: 1.0,
    };

    if (record.manufacturer) {
      results.manufacturer = this.normalizeManufacturer(record.manufacturer);
      results.overallConfidence *= results.manufacturer.confidence;
    }

    if (record.model && record.manufacturer) {
      results.model = this.normalizeModelId(record.manufacturer, record.model);
      results.overallConfidence *= results.model.confidence;
    }

    if (record.controller) {
      results.controller = this.normalizeController(record.controller);
      results.overallConfidence *= results.controller.confidence;
    }

    if (record.spindle_type || record.spindle_max_rpm) {
      results.spindle = this.normalizeSpindle(
        record.spindle_type || "",
        record.spindle_max_rpm,
        record.spindle_power_kw
      );
      results.overallConfidence *= results.spindle.confidence;
    }

    if (record.coolant) {
      results.coolant = this.normalizeCoolant(record.coolant);
      results.overallConfidence *= results.coolant.confidence;
    }

    if (record.capabilities && record.capabilities.length > 0) {
      results.capabilities = record.capabilities.map(c => this.normalizeCapability(c));
      const capConfidence = results.capabilities.reduce((sum, c) => sum + c.confidence, 0) / results.capabilities.length;
      results.overallConfidence *= capConfidence;
    }

    return results;
  }

  /**
   * Get all canonical manufacturers
   */
  getManufacturers(): ManufacturerCanonical[] {
    return [...MANUFACTURER_CANONICALS];
  }

  /**
   * Get all canonical controllers
   */
  getControllers(): ControllerCanonical[] {
    return [...CONTROLLER_CANONICALS];
  }

  /**
   * Get all canonical coolant types
   */
  getCoolantTypes(): CoolantCanonical[] {
    return [...COOLANT_CANONICALS];
  }

  /**
   * Get normalization statistics
   */
  getStats(): VocabularyStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalNormalizations: 0,
      byMatchType: {},
      byCategory: {},
      unknownValues: [],
    };
  }

  /**
   * Self-awareness for AI system integration
   */
  getSelfAwareness() {
    return {
      name: "MachineVocabularyNormalizerEngine",
      description: "Normalizes machine vocabularies (manufacturer, controller, spindle, coolant, capabilities) to canonical forms",
      capabilities: [
        "normalizeManufacturer",
        "normalizeController",
        "normalizeSpindle",
        "normalizeCoolant",
        "normalizeCapability",
        "normalizeModelId",
        "normalizeMachineRecord",
        "getManufacturers",
        "getControllers",
        "getCoolantTypes",
        "getStats",
      ],
      vocabularyCounts: {
        manufacturers: MANUFACTURER_CANONICALS.length,
        controllers: CONTROLLER_CANONICALS.length,
        coolantTypes: COOLANT_CANONICALS.length,
        spindlePatterns: SPINDLE_TYPE_PATTERNS.length,
        capabilityPatterns: CAPABILITY_PATTERNS.length,
      },
    };
  }

  // ---- Helpers ----

  private recordMatchType(type: string): void {
    this.stats.byMatchType[type] = (this.stats.byMatchType[type] || 0) + 1;
  }

  private slugify(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
  }

  private titleCase(input: string): string {
    return input.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  }
}

export const machineVocabularyNormalizerEngine = new MachineVocabularyNormalizerEngine();
