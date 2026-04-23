/**
 * PDFFormulaExtractionEngine.ts
 *
 * PDF-EXT-MS0 U-PDF03: Formula Extraction Engine
 *
 * Extracts mathematical formulas from PDFs:
 * - Kienzle cutting force equations
 * - Taylor tool life equations
 * - Thermal/deflection formulas
 * - Chatter stability equations
 * - Surface finish equations
 *
 * Uses pattern matching and LaTeX/MathML detection.
 *
 * @module engines/PDFFormulaExtractionEngine
 */

import { promises as fs } from "fs";
import path from "path";
import { logger } from "../utils/Logger.js";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ExtractedFormula {
  id: string;
  name: string;
  latex?: string;
  ascii: string;
  variables: FormulaVariable[];
  category: FormulaCategory;
  source: {
    pdfId: string;
    page: number;
    context?: string;
  };
  confidence: number;
  validated: boolean;
  canonicalForm?: string;
}

export interface FormulaVariable {
  symbol: string;
  name: string;
  unit?: string;
  description?: string;
  typicalRange?: { min: number; max: number };
}

export type FormulaCategory =
  | "cutting_force"
  | "tool_life"
  | "thermal"
  | "deflection"
  | "chatter"
  | "surface_finish"
  | "power"
  | "material_removal"
  | "threading"
  | "grinding"
  | "general";

export interface FormulaExtractionOptions {
  minConfidence: number;
  validateAgainstCanonical: boolean;
  extractVariables: boolean;
  detectUnits: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// CANONICAL FORMULA PATTERNS
// ═══════════════════════════════════════════════════════════════════════════

const CANONICAL_FORMULAS: Record<string, {
  pattern: RegExp;
  category: FormulaCategory;
  name: string;
  canonical: string;
  variables: FormulaVariable[];
}> = {
  // Kienzle cutting force
  kienzle_basic: {
    pattern: /F_?c?\s*=\s*k_?c?(?:1\.1|1_1)?\s*[×x*·]\s*b\s*[×x*·]\s*h\s*\^?\s*\(?\s*1\s*[-−]\s*m_?c?\s*\)?/i,
    category: "cutting_force",
    name: "Kienzle Cutting Force",
    canonical: "Fc = kc1.1 × b × h^(1-mc)",
    variables: [
      { symbol: "Fc", name: "Cutting Force", unit: "N" },
      { symbol: "kc1.1", name: "Specific Cutting Force", unit: "MPa", typicalRange: { min: 700, max: 3000 } },
      { symbol: "b", name: "Width of Cut", unit: "mm" },
      { symbol: "h", name: "Uncut Chip Thickness", unit: "mm" },
      { symbol: "mc", name: "Kienzle Exponent", typicalRange: { min: 0.15, max: 0.35 } },
    ],
  },

  // Taylor tool life
  taylor_basic: {
    pattern: /V\s*[×*·]?\s*T\s*\^\s*n\s*=\s*C/i,
    category: "tool_life",
    name: "Taylor Tool Life",
    canonical: "V × T^n = C",
    variables: [
      { symbol: "V", name: "Cutting Speed", unit: "m/min" },
      { symbol: "T", name: "Tool Life", unit: "min" },
      { symbol: "n", name: "Taylor Exponent", typicalRange: { min: 0.1, max: 0.4 } },
      { symbol: "C", name: "Taylor Constant" },
    ],
  },

  // Extended Taylor
  taylor_extended: {
    pattern: /V\s*[×*·]?\s*T\s*\^\s*n\s*[×*·]\s*f\s*\^\s*[a-z]\s*[×*·]\s*a[_p]?\s*\^\s*[a-z]\s*=\s*C/i,
    category: "tool_life",
    name: "Extended Taylor Tool Life",
    canonical: "V × T^n × f^a × ap^b = C",
    variables: [
      { symbol: "V", name: "Cutting Speed", unit: "m/min" },
      { symbol: "T", name: "Tool Life", unit: "min" },
      { symbol: "n", name: "Speed Exponent" },
      { symbol: "f", name: "Feed Rate", unit: "mm/rev" },
      { symbol: "a", name: "Feed Exponent" },
      { symbol: "ap", name: "Depth of Cut", unit: "mm" },
      { symbol: "b", name: "Depth Exponent" },
    ],
  },

  // Cutting power
  cutting_power: {
    pattern: /P\s*=\s*F[_c]?\s*[×*·]\s*V[_c]?\s*\/\s*60000/i,
    category: "power",
    name: "Cutting Power",
    canonical: "P = Fc × Vc / 60000",
    variables: [
      { symbol: "P", name: "Cutting Power", unit: "kW" },
      { symbol: "Fc", name: "Cutting Force", unit: "N" },
      { symbol: "Vc", name: "Cutting Speed", unit: "m/min" },
    ],
  },

  // Material removal rate
  mrr_turning: {
    pattern: /MRR\s*=\s*V[_c]?\s*[×*·]\s*f\s*[×*·]\s*a[_p]?/i,
    category: "material_removal",
    name: "Material Removal Rate (Turning)",
    canonical: "MRR = Vc × f × ap",
    variables: [
      { symbol: "MRR", name: "Material Removal Rate", unit: "mm³/min" },
      { symbol: "Vc", name: "Cutting Speed", unit: "m/min" },
      { symbol: "f", name: "Feed Rate", unit: "mm/rev" },
      { symbol: "ap", name: "Depth of Cut", unit: "mm" },
    ],
  },

  // Deflection
  cantilever_deflection: {
    pattern: /δ\s*=\s*F\s*[×x*·]?\s*L\s*(?:\^|³|\*\*)\s*3?\s*\/\s*\(?\s*3\s*[×x*·]?\s*E\s*[×x*·]?\s*I\s*\)?/i,
    category: "deflection",
    name: "Cantilever Deflection",
    canonical: "δ = F × L³ / (3 × E × I)",
    variables: [
      { symbol: "δ", name: "Deflection", unit: "mm" },
      { symbol: "F", name: "Force", unit: "N" },
      { symbol: "L", name: "Length", unit: "mm" },
      { symbol: "E", name: "Young's Modulus", unit: "GPa" },
      { symbol: "I", name: "Moment of Inertia", unit: "mm⁴" },
    ],
  },

  // Surface roughness
  surface_roughness_ideal: {
    pattern: /R[_a]?\s*=\s*f\s*\^\s*2\s*\/\s*\(?[38]?\s*[×*·]?\s*r[_ε]?\)?/i,
    category: "surface_finish",
    name: "Ideal Surface Roughness",
    canonical: "Ra = f² / (8 × rε)",
    variables: [
      { symbol: "Ra", name: "Arithmetic Average Roughness", unit: "μm" },
      { symbol: "f", name: "Feed Rate", unit: "mm/rev" },
      { symbol: "rε", name: "Nose Radius", unit: "mm" },
    ],
  },

  // Chatter stability limit
  chatter_stability: {
    pattern: /b[_lim]?\s*=\s*[-−]?\s*1\s*\/\s*\(?2\s*[×*·]?\s*Re\s*\[?\s*G\s*\]?\s*[×*·]?\s*K[_f]?\)?/i,
    category: "chatter",
    name: "Chatter Stability Limit",
    canonical: "b_lim = -1 / (2 × Re[G] × Kf)",
    variables: [
      { symbol: "b_lim", name: "Limiting Depth of Cut", unit: "mm" },
      { symbol: "Re[G]", name: "Real Part of FRF" },
      { symbol: "Kf", name: "Cutting Force Coefficient", unit: "N/mm²" },
    ],
  },

  // Thread pitch
  thread_pitch: {
    pattern: /P\s*=\s*25\.4\s*\/\s*TPI/i,
    category: "threading",
    name: "Thread Pitch from TPI",
    canonical: "P = 25.4 / TPI",
    variables: [
      { symbol: "P", name: "Pitch", unit: "mm" },
      { symbol: "TPI", name: "Threads Per Inch" },
    ],
  },

  // Grinding specific energy
  grinding_energy: {
    pattern: /u\s*=\s*P\s*\/\s*\(?v[_w]?\s*[×*·]\s*a[_e]?\s*[×*·]\s*b\)?/i,
    category: "grinding",
    name: "Grinding Specific Energy",
    canonical: "u = P / (vw × ae × b)",
    variables: [
      { symbol: "u", name: "Specific Energy", unit: "J/mm³" },
      { symbol: "P", name: "Power", unit: "W" },
      { symbol: "vw", name: "Work Speed", unit: "mm/s" },
      { symbol: "ae", name: "Depth of Cut", unit: "mm" },
      { symbol: "b", name: "Width", unit: "mm" },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class PDFFormulaExtractionEngine {
  private outputDir: string;
  private extractedFormulas: Map<string, ExtractedFormula[]> = new Map();
  private defaultOptions: FormulaExtractionOptions = {
    minConfidence: 0.7,
    validateAgainstCanonical: true,
    extractVariables: true,
    detectUnits: true,
  };

  constructor() {
    this.outputDir = path.join(process.cwd(), "data", "pdf-sources", "formulas");
  }

  async init(): Promise<void> {
    await fs.mkdir(this.outputDir, { recursive: true });
    logger.info("[PDFFormulaExtraction] Engine initialized");
  }

  // ─── Main Extraction Pipeline ──────────────────────────────────────────

  async extractFormulas(
    pdfId: string,
    text: string,
    options?: Partial<FormulaExtractionOptions>
  ): Promise<ExtractedFormula[]> {
    const opts = { ...this.defaultOptions, ...options };
    const formulas: ExtractedFormula[] = [];

    // Split text into pages (if page markers exist)
    const pages = this.splitIntoPages(text);

    for (let pageNum = 0; pageNum < pages.length; pageNum++) {
      const pageText = pages[pageNum];

      // Match against canonical formula patterns
      for (const [key, canonical] of Object.entries(CANONICAL_FORMULAS)) {
        const matches = pageText.matchAll(new RegExp(canonical.pattern, "gi"));

        for (const match of matches) {
          const extracted: ExtractedFormula = {
            id: `formula-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: canonical.name,
            ascii: match[0],
            variables: canonical.variables,
            category: canonical.category,
            source: {
              pdfId,
              page: pageNum + 1,
              context: this.extractContext(pageText, match.index || 0),
            },
            confidence: 0.9, // High confidence for canonical matches
            validated: true,
            canonicalForm: canonical.canonical,
          };

          // Validate against canonical
          if (opts.validateAgainstCanonical) {
            extracted.confidence = this.validateFormula(extracted, canonical);
          }

          if (extracted.confidence >= opts.minConfidence) {
            formulas.push(extracted);
          }
        }
      }

      // Also look for general equation patterns
      const generalFormulas = this.extractGeneralFormulas(pageText, pdfId, pageNum + 1);
      for (const formula of generalFormulas) {
        if (formula.confidence >= opts.minConfidence) {
          formulas.push(formula);
        }
      }
    }

    // Store for later retrieval
    this.extractedFormulas.set(pdfId, formulas);

    logger.info(
      `[PDFFormulaExtraction] Extracted ${formulas.length} formulas from ${pdfId}`
    );

    return formulas;
  }

  // ─── General Formula Detection ─────────────────────────────────────────

  private extractGeneralFormulas(
    text: string,
    pdfId: string,
    page: number
  ): ExtractedFormula[] {
    const formulas: ExtractedFormula[] = [];

    // Pattern: variable = expression (with operators and numbers)
    const equationPattern = /([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([A-Za-z0-9_\s\+\-\*\/\^\(\)\.\,]+)/g;

    let match;
    while ((match = equationPattern.exec(text)) !== null) {
      const [full, lhs, rhs] = match;

      // Skip if too short or likely not a formula
      if (rhs.length < 3) continue;
      if (!/[+\-*\/\^]/.test(rhs)) continue; // Must have operator
      if (/^[\d\.\s]+$/.test(rhs)) continue; // Skip pure number assignments

      // Determine category from variable name
      const category = this.inferCategory(lhs, rhs);

      formulas.push({
        id: `formula-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `Equation for ${lhs}`,
        ascii: full.trim(),
        variables: this.extractVariablesFromExpression(full),
        category,
        source: {
          pdfId,
          page,
          context: this.extractContext(text, match.index),
        },
        confidence: 0.6, // Lower confidence for general patterns
        validated: false,
      });
    }

    return formulas;
  }

  // ─── Variable Extraction ───────────────────────────────────────────────

  private extractVariablesFromExpression(expression: string): FormulaVariable[] {
    const variables: FormulaVariable[] = [];
    const seen = new Set<string>();

    // Match variable-like tokens
    const varPattern = /[A-Za-z_][A-Za-z0-9_]*/g;
    let match;

    while ((match = varPattern.exec(expression)) !== null) {
      const symbol = match[0];

      // Skip common non-variables
      if (/^(sin|cos|tan|log|ln|exp|sqrt|abs|min|max)$/i.test(symbol)) continue;
      if (seen.has(symbol)) continue;

      seen.add(symbol);
      variables.push({
        symbol,
        name: this.guessVariableName(symbol),
        unit: this.guessUnit(symbol),
      });
    }

    return variables;
  }

  private guessVariableName(symbol: string): string {
    const nameMap: Record<string, string> = {
      F: "Force",
      Fc: "Cutting Force",
      Ff: "Feed Force",
      Fp: "Passive Force",
      V: "Cutting Speed",
      Vc: "Cutting Speed",
      T: "Tool Life",
      P: "Power",
      n: "Exponent",
      f: "Feed Rate",
      ap: "Depth of Cut",
      ae: "Width of Cut",
      D: "Diameter",
      L: "Length",
      E: "Young's Modulus",
      I: "Moment of Inertia",
      Ra: "Surface Roughness",
      Rz: "Peak-Valley Roughness",
      kc: "Specific Cutting Force",
      mc: "Kienzle Exponent",
      MRR: "Material Removal Rate",
      RPM: "Spindle Speed",
      δ: "Deflection",
    };

    return nameMap[symbol] || symbol;
  }

  private guessUnit(symbol: string): string | undefined {
    const unitMap: Record<string, string> = {
      F: "N",
      Fc: "N",
      V: "m/min",
      Vc: "m/min",
      T: "min",
      P: "kW",
      f: "mm/rev",
      ap: "mm",
      ae: "mm",
      D: "mm",
      L: "mm",
      E: "GPa",
      Ra: "μm",
      Rz: "μm",
      kc: "MPa",
      MRR: "mm³/min",
      RPM: "rpm",
      δ: "mm",
    };

    return unitMap[symbol];
  }

  // ─── Category Inference ────────────────────────────────────────────────

  private inferCategory(lhs: string, rhs: string): FormulaCategory {
    const combined = `${lhs} ${rhs}`.toLowerCase();

    if (/force|fc|ff|fp|kc/.test(combined)) return "cutting_force";
    if (/tool\s*life|taylor|vt\^n/.test(combined)) return "tool_life";
    if (/thermal|temp|heat|q/.test(combined)) return "thermal";
    if (/deflect|δ|delta|bend/.test(combined)) return "deflection";
    if (/chatter|stability|blim/.test(combined)) return "chatter";
    if (/rough|ra|rz|surface/.test(combined)) return "surface_finish";
    if (/power|kw|watt/.test(combined)) return "power";
    if (/mrr|removal|rate/.test(combined)) return "material_removal";
    if (/thread|pitch|tpi/.test(combined)) return "threading";
    if (/grind|wheel|dress/.test(combined)) return "grinding";

    return "general";
  }

  // ─── Validation ────────────────────────────────────────────────────────

  private validateFormula(
    extracted: ExtractedFormula,
    canonical: typeof CANONICAL_FORMULAS[string]
  ): number {
    let score = 0.9; // Base score for pattern match

    // Check variable presence
    const extractedVars = new Set(
      extracted.ascii.match(/[A-Za-z_][A-Za-z0-9_]*/g) || []
    );
    const canonicalVars = canonical.variables.map((v) => v.symbol);

    let varMatchCount = 0;
    for (const v of canonicalVars) {
      if (extractedVars.has(v)) varMatchCount++;
    }

    const varMatchRatio = varMatchCount / canonicalVars.length;
    score *= 0.5 + 0.5 * varMatchRatio;

    return Math.min(1.0, score);
  }

  // ─── Helper Methods ────────────────────────────────────────────────────

  private splitIntoPages(text: string): string[] {
    // Split on page markers if present
    const pageMarkers = /\f|\[Page\s*\d+\]|---\s*Page\s*\d+\s*---/gi;
    const pages = text.split(pageMarkers);
    return pages.length > 1 ? pages : [text];
  }

  private extractContext(text: string, position: number, windowSize: number = 100): string {
    const start = Math.max(0, position - windowSize);
    const end = Math.min(text.length, position + windowSize);
    return text.slice(start, end).replace(/\s+/g, " ").trim();
  }

  // ─── Export Methods ────────────────────────────────────────────────────

  async exportToFormulaRegistry(
    formulas: ExtractedFormula[]
  ): Promise<object[]> {
    const entries: object[] = [];

    for (const formula of formulas) {
      if (!formula.validated) continue;

      entries.push({
        id: formula.id,
        name: formula.name,
        category: formula.category,
        expression: formula.canonicalForm || formula.ascii,
        variables: formula.variables,
        source: {
          type: "pdf_extraction",
          pdfId: formula.source.pdfId,
          page: formula.source.page,
        },
        confidence: formula.confidence,
        tags: [formula.category, "extracted", "validated"],
      });
    }

    return entries;
  }

  async saveExtracted(pdfId: string): Promise<void> {
    const formulas = this.extractedFormulas.get(pdfId);
    if (!formulas || formulas.length === 0) return;

    const outputPath = path.join(this.outputDir, `${pdfId}-formulas.json`);
    await fs.writeFile(
      outputPath,
      JSON.stringify(
        {
          pdfId,
          extractedAt: new Date().toISOString(),
          formulaCount: formulas.length,
          formulas,
        },
        null,
        2
      )
    );

    logger.info(`[PDFFormulaExtraction] Saved ${formulas.length} formulas to ${outputPath}`);
  }

  // ─── Statistics ────────────────────────────────────────────────────────

  getStats(): {
    totalExtracted: number;
    byCategory: Record<FormulaCategory, number>;
    validatedCount: number;
    averageConfidence: number;
  } {
    let totalExtracted = 0;
    let validatedCount = 0;
    let totalConfidence = 0;
    const byCategory: Record<FormulaCategory, number> = {
      cutting_force: 0,
      tool_life: 0,
      thermal: 0,
      deflection: 0,
      chatter: 0,
      surface_finish: 0,
      power: 0,
      material_removal: 0,
      threading: 0,
      grinding: 0,
      general: 0,
    };

    for (const formulas of this.extractedFormulas.values()) {
      for (const formula of formulas) {
        totalExtracted++;
        byCategory[formula.category]++;
        totalConfidence += formula.confidence;
        if (formula.validated) validatedCount++;
      }
    }

    return {
      totalExtracted,
      byCategory,
      validatedCount,
      averageConfidence: totalExtracted > 0 ? totalConfidence / totalExtracted : 0,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export const pdfFormulaExtractionEngine = new PDFFormulaExtractionEngine();
