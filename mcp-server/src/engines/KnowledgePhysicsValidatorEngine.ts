/**
 * KnowledgePhysicsValidatorEngine — Physics Validation for Knowledge Tips
 *
 * Validates machining tips/knowledge against physics constraints:
 * - Cutting speed (Vc) reasonableness per material ISO group
 * - Chipload/feed sanity check via Kienzle force model
 * - Spindle power feasibility
 * - Links tips to Kienzle/Taylor formulas when parameters are mentioned
 *
 * MANDATORY: All physics constants imported from src/physics/constants.ts
 *
 * @milestone LEARN-MS2 U-LEARN14
 */

import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  CANONICAL_MATERIAL_DB,
  type ISOGroup,
  type MaterialPhysics,
} from "../physics/constants.js";
import { contentAutoTaggerEngine } from "./ContentAutoTaggerEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface PhysicsValidationResult {
  /** Whether the tip passes physics sanity checks */
  is_valid: boolean;
  /** Overall confidence in the validation (0-100) */
  confidence: number;
  /** Individual validation checks performed */
  checks: PhysicsCheck[];
  /** Formula references linked to this tip */
  formula_links: FormulaLink[];
  /** Warnings for borderline or unverifiable claims */
  warnings: string[];
  /** Parameters extracted from the text */
  extracted_params: ExtractedMachiningParams;
  /** Material context resolved from text */
  material_context: MaterialContext | null;
}

export interface PhysicsCheck {
  /** What was checked */
  check_type: "cutting_speed" | "chipload" | "cutting_force" | "spindle_power" | "tool_life" | "surface_speed";
  /** Did it pass? */
  passed: boolean;
  /** Extracted value from tip text */
  extracted_value: number;
  /** Expected range [min, max] from physics */
  expected_range: [number, number];
  /** Unit of the value */
  unit: string;
  /** Human-readable explanation */
  explanation: string;
}

export interface FormulaLink {
  /** Formula name */
  formula: string;
  /** Why this formula is relevant */
  relevance: string;
  /** Equation string */
  equation: string;
  /** Constants used from canonical source */
  constants_used: Record<string, number>;
}

export interface ExtractedMachiningParams {
  rpm?: number;
  sfm?: number;
  vc_m_min?: number;
  feed_ipm?: number;
  feed_mm_min?: number;
  chipload_ipt?: number;
  chipload_mm?: number;
  doc_mm?: number;
  woc_mm?: number;
  tool_diameter_mm?: number;
  flute_count?: number;
}

export interface MaterialContext {
  iso_group: ISOGroup;
  material_name: string;
  kc1_1: number;
  mc: number;
  taylor_C: number;
  taylor_n: number;
  vc_roughing: number;
  vc_finishing: number;
}

// ============================================================================
// PARAMETER EXTRACTION PATTERNS
// ============================================================================

const PARAM_PATTERNS = {
  rpm: /(\d[\d,]*)\s*(?:rpm|RPM)/,
  sfm: /(\d[\d,]*)\s*(?:sfm|SFM)/,
  vc_m_min: /(\d[\d,]*)\s*(?:m\/min|m\/minute)/,
  feed_ipm: /(\d[\d,.]*)\s*(?:ipm|IPM|in\/min)/,
  feed_mm_min: /(\d[\d,.]*)\s*(?:mm\/min)/,
  chipload_ipt: /(?:chipload|chip load|fz|feed per tooth)[:\s]*(\d[\d,.]*)\s*(?:ipt|IPT|in(?:ch)?(?:\/tooth|\/flute)?)/i,
  chipload_mm: /(?:chipload|chip load|fz|feed per tooth)[:\s]*(\d[\d,.]*)\s*(?:mm(?:\/tooth|\/flute)?)/i,
  doc_mm: /(?:depth of cut|doc|ap|axial depth)[:\s]*(\d[\d,.]*)\s*(?:mm)/i,
  woc_mm: /(?:width of cut|woc|ae|radial depth|stepover)[:\s]*(\d[\d,.]*)\s*(?:mm)/i,
  tool_diameter_mm: /(\d[\d,.]*)\s*(?:mm)\s*(?:endmill|end mill|tool|cutter|drill|diameter)/i,
  tool_diameter_mm_alt: /(?:endmill|end mill|tool|cutter|drill|diameter)[:\s]*(\d[\d,.]*)\s*(?:mm)/i,
  flute_count: /(\d)\s*(?:flute|flutes)/i,
};

/** Material keyword → ISO group resolution */
const MATERIAL_KEYWORDS: Record<string, ISOGroup> = {
  "aluminum": "N", "aluminium": "N", "7075": "N", "6061": "N", "2024": "N",
  "copper": "N", "brass": "N", "bronze": "N",
  "steel": "P", "4140": "P", "4340": "P", "1018": "P", "1045": "P", "8620": "P",
  "stainless": "M", "316": "M", "304": "M", "17-4": "M", "duplex": "M",
  "cast iron": "K", "grey iron": "K", "ductile iron": "K",
  "titanium": "S", "ti-6al-4v": "S", "inconel": "S", "hastelloy": "S", "waspaloy": "S", "718": "S",
  "hardened": "H", "d2": "H", "h13": "H", "a2": "H", "m2": "H",
};

// ============================================================================
// Vc LIMITS per ISO group [m/min] — carbide tooling, flood coolant
// Source: Sandvik Coromant General Machining tables (2024)
// ============================================================================

const VC_LIMITS: Record<ISOGroup, { min: number; max: number; typical_rough: number; typical_finish: number }> = {
  P: { min: 80, max: 450, typical_rough: 200, typical_finish: 280 },
  M: { min: 60, max: 250, typical_rough: 120, typical_finish: 180 },
  K: { min: 80, max: 400, typical_rough: 180, typical_finish: 280 },
  N: { min: 200, max: 3000, typical_rough: 500, typical_finish: 1200 },
  S: { min: 15, max: 120, typical_rough: 35, typical_finish: 60 },
  H: { min: 30, max: 200, typical_rough: 80, typical_finish: 120 },
};

/** Chipload limits per ISO group [mm/tooth] — general milling */
const CHIPLOAD_LIMITS: Record<ISOGroup, { min: number; max: number }> = {
  P: { min: 0.03, max: 0.30 },
  M: { min: 0.02, max: 0.20 },
  K: { min: 0.05, max: 0.35 },
  N: { min: 0.05, max: 0.50 },
  S: { min: 0.01, max: 0.12 },
  H: { min: 0.01, max: 0.15 },
};

// ============================================================================
// ENGINE
// ============================================================================

class KnowledgePhysicsValidatorEngineImpl {

  /**
   * Validate a machining tip/knowledge item against physics constraints.
   * @param text - The tip text to validate
   * @param isoGroupHint - Optional ISO group hint (overrides auto-detection)
   * @returns Validation result with checks, formula links, and warnings
   */
  validate(text: string, isoGroupHint?: ISOGroup): PhysicsValidationResult {
    const checks: PhysicsCheck[] = [];
    const formulaLinks: FormulaLink[] = [];
    const warnings: string[] = [];

    // Step 1: Extract machining parameters from text
    const params = this.extractParams(text);

    // Step 2: Resolve material context
    const materialContext = this.resolveMaterial(text, isoGroupHint);

    if (!materialContext) {
      warnings.push("Could not determine material — physics validation limited to parameter range checks");
    }

    // Step 3: Validate cutting speed
    if (params.rpm && params.tool_diameter_mm) {
      const vc = (Math.PI * params.tool_diameter_mm * params.rpm) / 1000;
      params.vc_m_min = vc;
    }
    if (params.sfm) {
      params.vc_m_min = params.sfm * 0.3048; // SFM → m/min
    }

    if (params.vc_m_min && materialContext) {
      const limits = VC_LIMITS[materialContext.iso_group];
      const passed = params.vc_m_min >= limits.min * 0.8 && params.vc_m_min <= limits.max * 1.2;
      checks.push({
        check_type: "cutting_speed",
        passed,
        extracted_value: Math.round(params.vc_m_min * 10) / 10,
        expected_range: [limits.min, limits.max],
        unit: "m/min",
        explanation: passed
          ? `Vc=${params.vc_m_min.toFixed(1)} m/min is within ISO ${materialContext.iso_group} range (${limits.min}-${limits.max} m/min)`
          : `Vc=${params.vc_m_min.toFixed(1)} m/min is outside ISO ${materialContext.iso_group} range (${limits.min}-${limits.max} m/min)`,
      });

      // Link to Taylor tool life formula
      formulaLinks.push({
        formula: "Taylor Tool Life",
        relevance: "Cutting speed directly affects tool life per Taylor equation",
        equation: "T = (C / Vc)^(1/n)",
        constants_used: {
          C: materialContext.taylor_C,
          n: materialContext.taylor_n,
        },
      });
    }

    // Step 4: Validate chipload
    const chipload_mm = params.chipload_mm
      ?? (params.chipload_ipt ? params.chipload_ipt * 25.4 : undefined);

    if (chipload_mm && materialContext) {
      const limits = CHIPLOAD_LIMITS[materialContext.iso_group];
      const passed = chipload_mm >= limits.min * 0.5 && chipload_mm <= limits.max * 1.5;
      checks.push({
        check_type: "chipload",
        passed,
        extracted_value: Math.round(chipload_mm * 1000) / 1000,
        expected_range: [limits.min, limits.max],
        unit: "mm/tooth",
        explanation: passed
          ? `Chipload=${chipload_mm.toFixed(3)} mm is within ISO ${materialContext.iso_group} range`
          : `Chipload=${chipload_mm.toFixed(3)} mm is outside ISO ${materialContext.iso_group} range (${limits.min}-${limits.max} mm)`,
      });
    }

    // Step 5: Validate cutting force feasibility
    if (chipload_mm && params.doc_mm && materialContext) {
      // Kienzle: Fc = kc1_1 * ap * fz^(1-mc)
      const Fc = materialContext.kc1_1 * params.doc_mm * Math.pow(chipload_mm, 1 - materialContext.mc);
      const passed = Fc < 15000; // 15kN is a reasonable upper limit for most machines
      checks.push({
        check_type: "cutting_force",
        passed,
        extracted_value: Math.round(Fc),
        expected_range: [0, 15000],
        unit: "N",
        explanation: passed
          ? `Estimated Fc=${Math.round(Fc)} N is within machine capability`
          : `Estimated Fc=${Math.round(Fc)} N exceeds typical machine limits (>15kN)`,
      });

      formulaLinks.push({
        formula: "Kienzle Cutting Force",
        relevance: "Chipload and depth of cut determine cutting force",
        equation: "Fc = kc1.1 × ap × fz^(1-mc)",
        constants_used: {
          "kc1.1": materialContext.kc1_1,
          mc: materialContext.mc,
        },
      });
    }

    // Step 6: Validate spindle power
    if (params.vc_m_min && chipload_mm && params.doc_mm && materialContext) {
      // Power = Fc × Vc / (60 × 1000 × efficiency)
      const Fc = materialContext.kc1_1 * params.doc_mm * Math.pow(chipload_mm, 1 - materialContext.mc);
      const power_kW = (Fc * params.vc_m_min) / (60 * 1000 * 0.85);
      const passed = power_kW < 50; // 50kW is a reasonable upper limit
      checks.push({
        check_type: "spindle_power",
        passed,
        extracted_value: Math.round(power_kW * 10) / 10,
        expected_range: [0, 50],
        unit: "kW",
        explanation: passed
          ? `Estimated power=${power_kW.toFixed(1)} kW is within typical machine range`
          : `Estimated power=${power_kW.toFixed(1)} kW may exceed spindle capacity`,
      });
    }

    // Step 7: Tool life estimate
    if (params.vc_m_min && materialContext) {
      const T = Math.pow(materialContext.taylor_C / params.vc_m_min, 1 / materialContext.taylor_n);
      if (T < 1) {
        warnings.push(`Estimated tool life < 1 min at Vc=${params.vc_m_min.toFixed(0)} m/min — tip may suggest overly aggressive parameters`);
      } else if (T > 480) {
        warnings.push(`Estimated tool life > 8 hours at Vc=${params.vc_m_min.toFixed(0)} m/min — cutting speed may be too conservative`);
      }
      checks.push({
        check_type: "tool_life",
        passed: T >= 1 && T <= 480,
        extracted_value: Math.round(T * 10) / 10,
        expected_range: [5, 120],
        unit: "min",
        explanation: `Estimated tool life T=${T.toFixed(1)} min (Taylor: C=${materialContext.taylor_C}, n=${materialContext.taylor_n})`,
      });
    }

    // Compute overall validity
    const failedChecks = checks.filter(c => !c.passed);
    const is_valid = failedChecks.length === 0;
    const confidence = checks.length === 0
      ? 50 // No checks possible — neutral
      : Math.round((1 - failedChecks.length / checks.length) * 100);

    return {
      is_valid,
      confidence,
      checks,
      formula_links: formulaLinks,
      warnings,
      extracted_params: params,
      material_context: materialContext,
    };
  }

  /**
   * Batch validate multiple tips.
   * @param texts - Array of tip texts
   * @param isoGroupHint - Optional shared ISO group
   * @returns Array of validation results with summary
   */
  validateBatch(texts: string[], isoGroupHint?: ISOGroup): {
    results: PhysicsValidationResult[];
    summary: { total: number; valid: number; invalid: number; unverifiable: number };
  } {
    const results = texts.map(text => this.validate(text, isoGroupHint));
    const valid = results.filter(r => r.is_valid && r.checks.length > 0).length;
    const invalid = results.filter(r => !r.is_valid && r.checks.length > 0).length;
    const unverifiable = results.filter(r => r.checks.length === 0).length;

    return {
      results,
      summary: { total: texts.length, valid, invalid, unverifiable },
    };
  }

  /**
   * Extract machining parameters from natural language text.
   */
  extractParams(text: string): ExtractedMachiningParams {
    const params: ExtractedMachiningParams = {};

    const parseNum = (s: string): number => parseFloat(s.replace(/,/g, ""));

    for (const [key, pattern] of Object.entries(PARAM_PATTERNS)) {
      const match = text.match(pattern);
      if (match) {
        const val = parseNum(match[1]);
        if (!isNaN(val) && val > 0) {
          (params as any)[key] = val;
        }
      }
    }

    // Infer tool diameter from "Xmm endmill" patterns not caught above
    if (!params.tool_diameter_mm) {
      const altMatch = text.match(/(\d+(?:\.\d+)?)\s*mm\s+(?:endmill|end mill|carbide|hss)/i);
      if (altMatch) params.tool_diameter_mm = parseFloat(altMatch[1]);
    }

    return params;
  }

  /**
   * Resolve material context from text, using auto-tagger and keyword matching.
   */
  resolveMaterial(text: string, isoGroupHint?: ISOGroup): MaterialContext | null {
    // Use hint if provided
    if (isoGroupHint && CANONICAL_KIENZLE[isoGroupHint]) {
      return this.buildMaterialContext(isoGroupHint);
    }

    // Keyword matching first (longer keywords = more specific → higher priority)
    const textLower = text.toLowerCase();
    const sortedKeywords = Object.entries(MATERIAL_KEYWORDS)
      .sort(([a], [b]) => b.length - a.length);
    for (const [keyword, group] of sortedKeywords) {
      if (textLower.includes(keyword)) {
        return this.buildMaterialContext(group);
      }
    }

    // Fallback: try ContentAutoTagger
    const tagResult = contentAutoTaggerEngine.tag(text);
    if (tagResult.materials.length > 0) {
      const isoGroup = tagResult.materials[0].iso_group as ISOGroup;
      if (CANONICAL_KIENZLE[isoGroup]) {
        return this.buildMaterialContext(isoGroup);
      }
    }

    return null;
  }

  /**
   * Build material context from ISO group using canonical constants.
   */
  private buildMaterialContext(isoGroup: ISOGroup): MaterialContext {
    const kienzle = CANONICAL_KIENZLE[isoGroup];
    const taylor = CANONICAL_TAYLOR[isoGroup];
    const limits = VC_LIMITS[isoGroup];
    const groupNames: Record<ISOGroup, string> = {
      P: "Steel", M: "Stainless Steel", K: "Cast Iron",
      N: "Non-Ferrous/Aluminum", S: "Superalloy/Titanium", H: "Hardened Steel",
    };

    return {
      iso_group: isoGroup,
      material_name: groupNames[isoGroup],
      kc1_1: kienzle.kc1_1,
      mc: kienzle.mc,
      taylor_C: taylor.C,
      taylor_n: taylor.n,
      vc_roughing: limits.typical_rough,
      vc_finishing: limits.typical_finish,
    };
  }
}

export const knowledgePhysicsValidatorEngine = new KnowledgePhysicsValidatorEngineImpl();
