/**
 * PDFMaterialPropertyExtractionEngine.ts
 *
 * PDF-EXT-MS0 U-PDF04: Material Property Extraction
 *
 * Extracts material properties from PDFs:
 * - Mechanical properties (tensile, yield, hardness)
 * - Physical properties (density, thermal conductivity)
 * - Machinability ratings
 * - ISO material group classification
 * - Heat treatment conditions
 *
 * @module engines/PDFMaterialPropertyExtractionEngine
 */

import { promises as fs } from "fs";
import path from "path";
import { logger } from "../utils/Logger.js";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ExtractedMaterialProperty {
  id: string;
  materialName: string;
  materialGrade?: string;
  isoGroup?: ISOGroup;
  properties: MaterialProperties;
  source: {
    pdfId: string;
    page: number;
    context?: string;
  };
  confidence: number;
  validated: boolean;
}

export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";

export interface MaterialProperties {
  // Mechanical
  tensileStrength?: PropertyValue;
  yieldStrength?: PropertyValue;
  elongation?: PropertyValue;
  hardness?: PropertyValue;
  hardnessScale?: "HRC" | "HRB" | "HB" | "HV";

  // Physical
  density?: PropertyValue;
  thermalConductivity?: PropertyValue;
  specificHeat?: PropertyValue;
  thermalExpansion?: PropertyValue;
  meltingPoint?: PropertyValue;

  // Machinability
  machinabilityRating?: PropertyValue;
  kc1_1?: PropertyValue; // Specific cutting force
  mc?: PropertyValue; // Kienzle exponent

  // Processing
  heatTreatment?: string;
  condition?: string;
  composition?: Record<string, number>;
}

export interface PropertyValue {
  value: number;
  unit: string;
  min?: number;
  max?: number;
  uncertainty?: number;
}

export interface MaterialExtractionOptions {
  minConfidence: number;
  extractComposition: boolean;
  inferISOGroup: boolean;
  validateRanges: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROPERTY PATTERNS
// ═══════════════════════════════════════════════════════════════════════════

const PROPERTY_PATTERNS: Record<string, {
  patterns: RegExp[];
  extractor: (match: RegExpMatchArray) => PropertyValue | null;
  property: keyof MaterialProperties;
}> = {
  tensileStrength: {
    patterns: [
      /tensile\s*strength[:\s]*(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*(MPa|ksi|psi)/i,
      /tensile\s*strength[:\s]*(\d+(?:\.\d+)?)\s*(MPa|ksi|psi)/i,
      /UTS[:\s]*(\d+(?:\.\d+)?)\s*(MPa|ksi|psi)/i,
      /Rm[:\s]*(\d+(?:\.\d+)?)\s*(MPa|N\/mm²)/i,
    ],
    extractor: (match) => {
      if (match[3]) {
        // Range value
        return {
          value: (parseFloat(match[1]) + parseFloat(match[2])) / 2,
          unit: normalizeUnit(match[3]),
          min: parseFloat(match[1]),
          max: parseFloat(match[2]),
        };
      }
      return {
        value: parseFloat(match[1]),
        unit: normalizeUnit(match[2]),
      };
    },
    property: "tensileStrength",
  },

  yieldStrength: {
    patterns: [
      /yield\s*strength[:\s]*(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*(MPa|ksi|psi)/i,
      /yield\s*strength[:\s]*(\d+(?:\.\d+)?)\s*(MPa|ksi|psi)/i,
      /Rp0\.2[:\s]*(\d+(?:\.\d+)?)\s*(MPa|N\/mm²)/i,
      /0\.2%\s*offset[:\s]*(\d+(?:\.\d+)?)\s*(MPa|ksi)/i,
    ],
    extractor: (match) => {
      if (match[3]) {
        return {
          value: (parseFloat(match[1]) + parseFloat(match[2])) / 2,
          unit: normalizeUnit(match[3]),
          min: parseFloat(match[1]),
          max: parseFloat(match[2]),
        };
      }
      return {
        value: parseFloat(match[1]),
        unit: normalizeUnit(match[2]),
      };
    },
    property: "yieldStrength",
  },

  hardness: {
    patterns: [
      /hardness[:\s]*(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*(HRC|HRB|HB|HV|BHN)/i,
      /hardness[:\s]*(\d+(?:\.\d+)?)\s*(HRC|HRB|HB|HV|BHN)/i,
      /(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*(HRC|HRB|HB|HV)/i,
      /(\d+)\s*(HRC|HRB|HB|HV)\s*(?:typical|max|min)?/i,
    ],
    extractor: (match) => {
      if (match[3] && !isNaN(parseFloat(match[2]))) {
        return {
          value: (parseFloat(match[1]) + parseFloat(match[2])) / 2,
          unit: match[3].toUpperCase(),
          min: parseFloat(match[1]),
          max: parseFloat(match[2]),
        };
      }
      return {
        value: parseFloat(match[1]),
        unit: match[2].toUpperCase(),
      };
    },
    property: "hardness",
  },

  density: {
    patterns: [
      /density[:\s]*(\d+(?:\.\d+)?)\s*(g\/cm³|g\/cc|kg\/m³|lb\/in³)/i,
      /ρ[:\s]*(\d+(?:\.\d+)?)\s*(g\/cm³|kg\/m³)/i,
      /specific\s*gravity[:\s]*(\d+(?:\.\d+)?)/i,
    ],
    extractor: (match) => ({
      value: parseFloat(match[1]),
      unit: match[2] || "g/cm³",
    }),
    property: "density",
  },

  thermalConductivity: {
    patterns: [
      /thermal\s*conductivity[:\s]*(\d+(?:\.\d+)?)\s*(W\/m[·\-]?K|W\/mK|BTU)/i,
      /k[:\s]*(\d+(?:\.\d+)?)\s*(W\/m[·\-]?K)/i,
      /λ[:\s]*(\d+(?:\.\d+)?)\s*(W\/m[·\-]?K)/i,
    ],
    extractor: (match) => ({
      value: parseFloat(match[1]),
      unit: "W/m·K",
    }),
    property: "thermalConductivity",
  },

  specificHeat: {
    patterns: [
      /specific\s*heat[:\s]*(\d+(?:\.\d+)?)\s*(J\/kg[·\-]?K|J\/kgK|cal\/g[·\-]?°C)/i,
      /Cp[:\s]*(\d+(?:\.\d+)?)\s*(J\/kg[·\-]?K)/i,
    ],
    extractor: (match) => ({
      value: parseFloat(match[1]),
      unit: "J/kg·K",
    }),
    property: "specificHeat",
  },

  thermalExpansion: {
    patterns: [
      /thermal\s*expansion[:\s]*(\d+(?:\.\d+)?)\s*[×x]?\s*10\^?-?6?\s*(\/°C|\/K|μm\/m[·\-]?K)?/i,
      /CTE[:\s]*(\d+(?:\.\d+)?)\s*[×x]?\s*10\^?-?6?/i,
      /α[:\s]*(\d+(?:\.\d+)?)\s*[×x]?\s*10\^?-?6?/i,
    ],
    extractor: (match) => ({
      value: parseFloat(match[1]),
      unit: "μm/m·K",
    }),
    property: "thermalExpansion",
  },

  elongation: {
    patterns: [
      /elongation[:\s]*(\d+(?:\.\d+)?)\s*%/i,
      /A[:\s]*(\d+(?:\.\d+)?)\s*%/i,
      /ductility[:\s]*(\d+(?:\.\d+)?)\s*%/i,
    ],
    extractor: (match) => ({
      value: parseFloat(match[1]),
      unit: "%",
    }),
    property: "elongation",
  },

  machinabilityRating: {
    patterns: [
      /machinability[:\s]*(\d+(?:\.\d+)?)\s*%?/i,
      /machinability\s*rating[:\s]*(\d+(?:\.\d+)?)/i,
      /machining\s*rating[:\s]*(\d+(?:\.\d+)?)/i,
    ],
    extractor: (match) => ({
      value: parseFloat(match[1]),
      unit: "%",
    }),
    property: "machinabilityRating",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// MATERIAL NAME PATTERNS
// ═══════════════════════════════════════════════════════════════════════════

const MATERIAL_NAME_PATTERNS = [
  // Tool steels
  /\b([ADHMOSTW]\d{1,2})\s*(?:tool\s*steel)?/i,
  // Stainless steels
  /\b((?:AISI\s*)?(?:30[0-4]|31[0-6]|32[0-9]|40[0-4]|41[0-6]|43[0-1]|44[0-6])(?:L|H|N|Ti)?)\b/i,
  // Carbon/alloy steels
  /\b((?:AISI\s*)?(?:10[0-9][0-9]|11[0-9][0-9]|12[0-9][0-9]|4[0-9][0-9][0-9]|5[0-9][0-9][0-9]|6[0-9][0-9][0-9]|8[0-9][0-9][0-9]))\b/,
  // Aluminum alloys
  /\b((?:AA\s*)?[12567][0-9]{3}(?:-[TOFH]\d{1,2})?)\b/i,
  // Titanium alloys
  /\b(Ti[-\s]?(?:6Al[-\s]?4V|6-4|64|Grade\s*\d+))\b/i,
  // Nickel alloys
  /\b(Inconel\s*\d{3}|Hastelloy\s*[A-Z]|Monel\s*\d{3})\b/i,
  // Generic pattern
  /\b(grade\s+[A-Z0-9\-]+)\b/i,
];

// ═══════════════════════════════════════════════════════════════════════════
// ISO GROUP INFERENCE
// ═══════════════════════════════════════════════════════════════════════════

const ISO_GROUP_RULES: Array<{
  test: (name: string, props: MaterialProperties) => boolean;
  group: ISOGroup;
}> = [
  {
    // H: Hardened steels (>45 HRC)
    test: (_, props) => {
      const h = props.hardness;
      return h !== undefined && h.unit === "HRC" && h.value >= 45;
    },
    group: "H",
  },
  {
    // S: Superalloys (Inconel, Hastelloy, Ti alloys)
    test: (name) => /inconel|hastelloy|nimonic|waspaloy|ti[-\s]?6|titanium/i.test(name),
    group: "S",
  },
  {
    // N: Non-ferrous (aluminum, copper, brass)
    test: (name) =>
      /aluminum|aluminium|copper|brass|bronze|magnesium|\b[12567][0-9]{3}\b/i.test(name),
    group: "N",
  },
  {
    // K: Cast iron
    test: (name) => /cast\s*iron|gray\s*iron|ductile\s*iron|nodular/i.test(name),
    group: "K",
  },
  {
    // M: Stainless steel
    test: (name) => /stainless|30[0-4]|31[0-6]|40[0-4]|41[0-6]/i.test(name),
    group: "M",
  },
  {
    // P: Steel (default for ferrous)
    test: (name) => /steel|[ADHMOSTW]\d{1,2}|10[0-9]{2}|4[0-9]{3}/i.test(name),
    group: "P",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION RANGES
// ═══════════════════════════════════════════════════════════════════════════

const VALIDATION_RANGES: Record<string, { min: number; max: number; unit: string }> = {
  tensileStrength: { min: 50, max: 3000, unit: "MPa" },
  yieldStrength: { min: 30, max: 2500, unit: "MPa" },
  hardnessHRC: { min: 15, max: 72, unit: "HRC" },
  hardnessHRB: { min: 20, max: 100, unit: "HRB" },
  hardnessHB: { min: 50, max: 750, unit: "HB" },
  hardnessHV: { min: 100, max: 1500, unit: "HV" },
  density: { min: 1.5, max: 22.6, unit: "g/cm³" },
  thermalConductivity: { min: 5, max: 450, unit: "W/m·K" },
  specificHeat: { min: 100, max: 1500, unit: "J/kg·K" },
  elongation: { min: 0.1, max: 80, unit: "%" },
  machinabilityRating: { min: 10, max: 200, unit: "%" },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function normalizeUnit(unit: string): string {
  const unitMap: Record<string, string> = {
    mpa: "MPa",
    ksi: "ksi",
    psi: "psi",
    "n/mm²": "MPa",
    "g/cm³": "g/cm³",
    "g/cc": "g/cm³",
    "kg/m³": "kg/m³",
    "w/mk": "W/m·K",
    "w/m-k": "W/m·K",
    "w/m·k": "W/m·K",
  };
  return unitMap[unit.toLowerCase()] || unit;
}

function convertToMPa(value: number, unit: string): number {
  switch (unit.toLowerCase()) {
    case "ksi":
      return value * 6.895;
    case "psi":
      return value * 0.006895;
    default:
      return value;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class PDFMaterialPropertyExtractionEngine {
  private outputDir: string;
  private extractedMaterials: Map<string, ExtractedMaterialProperty[]> = new Map();
  private defaultOptions: MaterialExtractionOptions = {
    minConfidence: 0.6,
    extractComposition: true,
    inferISOGroup: true,
    validateRanges: true,
  };

  constructor() {
    this.outputDir = path.join(process.cwd(), "data", "pdf-sources", "materials");
  }

  async init(): Promise<void> {
    await fs.mkdir(this.outputDir, { recursive: true });
    logger.info("[PDFMaterialPropertyExtraction] Engine initialized");
  }

  // ─── Main Extraction Pipeline ──────────────────────────────────────────

  async extractMaterials(
    pdfId: string,
    text: string,
    options?: Partial<MaterialExtractionOptions>
  ): Promise<ExtractedMaterialProperty[]> {
    const opts = { ...this.defaultOptions, ...options };
    const materials: ExtractedMaterialProperty[] = [];

    // Split into pages
    const pages = this.splitIntoPages(text);

    for (let pageNum = 0; pageNum < pages.length; pageNum++) {
      const pageText = pages[pageNum];

      // Find material names/grades
      const materialNames = this.extractMaterialNames(pageText);

      for (const materialName of materialNames) {
        // Extract properties for this material
        const properties = this.extractProperties(pageText, materialName);

        if (Object.keys(properties).length === 0) continue;

        // Infer ISO group
        let isoGroup: ISOGroup | undefined;
        if (opts.inferISOGroup) {
          isoGroup = this.inferISOGroup(materialName, properties);
        }

        // Extract composition if requested
        if (opts.extractComposition) {
          const composition = this.extractComposition(pageText, materialName);
          if (Object.keys(composition).length > 0) {
            properties.composition = composition;
          }
        }

        // Calculate confidence
        let confidence = this.calculateConfidence(properties);

        // Validate ranges
        if (opts.validateRanges) {
          const validationResult = this.validatePropertyRanges(properties);
          confidence *= validationResult.factor;
        }

        if (confidence >= opts.minConfidence) {
          materials.push({
            id: `material-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            materialName,
            isoGroup,
            properties,
            source: {
              pdfId,
              page: pageNum + 1,
              context: this.extractContext(pageText, materialName),
            },
            confidence,
            validated: confidence >= 0.8,
          });
        }
      }
    }

    // Deduplicate materials
    const deduped = this.deduplicateMaterials(materials);

    // Store
    this.extractedMaterials.set(pdfId, deduped);

    logger.info(
      `[PDFMaterialPropertyExtraction] Extracted ${deduped.length} materials from ${pdfId}`
    );

    return deduped;
  }

  // ─── Material Name Extraction ──────────────────────────────────────────

  private extractMaterialNames(text: string): string[] {
    const names: Set<string> = new Set();

    for (const pattern of MATERIAL_NAME_PATTERNS) {
      const matches = text.matchAll(new RegExp(pattern, "gi"));
      for (const match of matches) {
        const name = match[1].trim().toUpperCase();
        if (name.length >= 2 && name.length <= 30) {
          names.add(name);
        }
      }
    }

    return Array.from(names);
  }

  // ─── Property Extraction ───────────────────────────────────────────────

  private extractProperties(text: string, materialName: string): MaterialProperties {
    const properties: MaterialProperties = {};

    // Look in vicinity of material name (±500 chars)
    const nameIndex = text.toUpperCase().indexOf(materialName);
    const start = Math.max(0, nameIndex - 500);
    const end = Math.min(text.length, nameIndex + 500);
    const context = nameIndex >= 0 ? text.slice(start, end) : text;

    for (const [_, config] of Object.entries(PROPERTY_PATTERNS)) {
      for (const pattern of config.patterns) {
        const match = context.match(pattern);
        if (match) {
          const value = config.extractor(match);
          if (value !== null) {
            (properties as Record<string, PropertyValue>)[config.property] = value;

            // Set hardness scale if extracting hardness
            if (config.property === "hardness" && match[2]) {
              const scale = match[2].toUpperCase();
              if (["HRC", "HRB", "HB", "HV"].includes(scale)) {
                properties.hardnessScale = scale as "HRC" | "HRB" | "HB" | "HV";
              }
            }
            break;
          }
        }
      }
    }

    return properties;
  }

  // ─── Composition Extraction ────────────────────────────────────────────

  private extractComposition(text: string, materialName: string): Record<string, number> {
    const composition: Record<string, number> = {};

    // Element patterns (e.g., "C 0.4%", "Cr: 12.5%", "18% Cr")
    const elementPattern = /\b(C|Cr|Ni|Mo|V|W|Co|Mn|Si|S|P|Cu|Al|Ti|N|Fe|Nb)\s*[:\s]?\s*(\d+(?:\.\d+)?)\s*%/gi;
    const reversePattern = /(\d+(?:\.\d+)?)\s*%\s*(C|Cr|Ni|Mo|V|W|Co|Mn|Si|S|P|Cu|Al|Ti|N|Fe|Nb)\b/gi;

    const nameIndex = text.toUpperCase().indexOf(materialName);
    const start = Math.max(0, nameIndex - 300);
    const end = Math.min(text.length, nameIndex + 300);
    const context = nameIndex >= 0 ? text.slice(start, end) : text;

    let match;
    while ((match = elementPattern.exec(context)) !== null) {
      const element = match[1].toUpperCase();
      const percentage = parseFloat(match[2]);
      if (percentage > 0 && percentage <= 100) {
        composition[element] = percentage;
      }
    }

    while ((match = reversePattern.exec(context)) !== null) {
      const element = match[2].toUpperCase();
      const percentage = parseFloat(match[1]);
      if (percentage > 0 && percentage <= 100 && !composition[element]) {
        composition[element] = percentage;
      }
    }

    return composition;
  }

  // ─── ISO Group Inference ───────────────────────────────────────────────

  private inferISOGroup(name: string, properties: MaterialProperties): ISOGroup | undefined {
    for (const rule of ISO_GROUP_RULES) {
      if (rule.test(name, properties)) {
        return rule.group;
      }
    }
    return undefined;
  }

  // ─── Validation ────────────────────────────────────────────────────────

  private validatePropertyRanges(properties: MaterialProperties): {
    valid: boolean;
    factor: number;
    issues: string[];
  } {
    const issues: string[] = [];
    let validCount = 0;
    let totalCount = 0;

    // Check each property against validation ranges
    if (properties.tensileStrength) {
      totalCount++;
      const val = convertToMPa(
        properties.tensileStrength.value,
        properties.tensileStrength.unit
      );
      const range = VALIDATION_RANGES.tensileStrength;
      if (val >= range.min && val <= range.max) {
        validCount++;
      } else {
        issues.push(`Tensile strength ${val} MPa outside range`);
      }
    }

    if (properties.hardness && properties.hardnessScale) {
      totalCount++;
      const key = `hardness${properties.hardnessScale}`;
      const range = VALIDATION_RANGES[key];
      if (range) {
        if (properties.hardness.value >= range.min && properties.hardness.value <= range.max) {
          validCount++;
        } else {
          issues.push(`Hardness ${properties.hardness.value} ${properties.hardnessScale} outside range`);
        }
      }
    }

    if (properties.density) {
      totalCount++;
      const range = VALIDATION_RANGES.density;
      if (properties.density.value >= range.min && properties.density.value <= range.max) {
        validCount++;
      } else {
        issues.push(`Density ${properties.density.value} outside range`);
      }
    }

    const factor = totalCount > 0 ? validCount / totalCount : 1.0;

    return {
      valid: factor >= 0.7,
      factor: 0.5 + 0.5 * factor, // Map to 0.5-1.0 range
      issues,
    };
  }

  private calculateConfidence(properties: MaterialProperties): number {
    let score = 0;
    let maxScore = 0;

    // Core properties (higher weight)
    const coreProps: (keyof MaterialProperties)[] = [
      "tensileStrength",
      "hardness",
      "density",
    ];
    for (const prop of coreProps) {
      maxScore += 2;
      if (properties[prop]) score += 2;
    }

    // Secondary properties
    const secondaryProps: (keyof MaterialProperties)[] = [
      "yieldStrength",
      "elongation",
      "thermalConductivity",
      "specificHeat",
      "machinabilityRating",
    ];
    for (const prop of secondaryProps) {
      maxScore += 1;
      if (properties[prop]) score += 1;
    }

    return maxScore > 0 ? Math.min(1.0, score / maxScore) : 0;
  }

  // ─── Deduplication ─────────────────────────────────────────────────────

  private deduplicateMaterials(
    materials: ExtractedMaterialProperty[]
  ): ExtractedMaterialProperty[] {
    const seen = new Map<string, ExtractedMaterialProperty>();

    for (const mat of materials) {
      const key = mat.materialName;
      const existing = seen.get(key);

      if (!existing || mat.confidence > existing.confidence) {
        seen.set(key, mat);
      } else {
        // Merge properties from lower confidence into higher if missing
        for (const [prop, value] of Object.entries(mat.properties)) {
          if (!(prop in existing.properties)) {
            (existing.properties as Record<string, unknown>)[prop] = value;
          }
        }
      }
    }

    return Array.from(seen.values());
  }

  // ─── Helper Methods ────────────────────────────────────────────────────

  private splitIntoPages(text: string): string[] {
    const pageMarkers = /\f|\[Page\s*\d+\]|---\s*Page\s*\d+\s*---/gi;
    const pages = text.split(pageMarkers);
    return pages.length > 1 ? pages : [text];
  }

  private extractContext(text: string, materialName: string): string {
    const index = text.toUpperCase().indexOf(materialName);
    if (index < 0) return "";

    const start = Math.max(0, index - 100);
    const end = Math.min(text.length, index + 100);
    return text.slice(start, end).replace(/\s+/g, " ").trim();
  }

  // ─── Export Methods ────────────────────────────────────────────────────

  async exportToMaterialRegistry(
    materials: ExtractedMaterialProperty[]
  ): Promise<object[]> {
    const entries: object[] = [];

    for (const mat of materials) {
      if (!mat.validated) continue;

      const entry: Record<string, unknown> = {
        id: mat.id,
        name: mat.materialName,
        grade: mat.materialGrade,
        isoGroup: mat.isoGroup,
        source: {
          type: "pdf_extraction",
          pdfId: mat.source.pdfId,
          page: mat.source.page,
        },
        confidence: mat.confidence,
      };

      // Add flattened properties
      if (mat.properties.tensileStrength) {
        entry.tensileStrength_MPa = convertToMPa(
          mat.properties.tensileStrength.value,
          mat.properties.tensileStrength.unit
        );
      }
      if (mat.properties.hardness) {
        entry.hardness = mat.properties.hardness.value;
        entry.hardnessScale = mat.properties.hardnessScale;
      }
      if (mat.properties.density) {
        entry.density_gcm3 = mat.properties.density.value;
      }
      if (mat.properties.thermalConductivity) {
        entry.thermalConductivity_WmK = mat.properties.thermalConductivity.value;
      }
      if (mat.properties.machinabilityRating) {
        entry.machinabilityRating = mat.properties.machinabilityRating.value;
      }
      if (mat.properties.composition) {
        entry.composition = mat.properties.composition;
      }

      entries.push(entry);
    }

    return entries;
  }

  async saveExtracted(pdfId: string): Promise<void> {
    const materials = this.extractedMaterials.get(pdfId);
    if (!materials || materials.length === 0) return;

    const outputPath = path.join(this.outputDir, `${pdfId}-materials.json`);
    await fs.writeFile(
      outputPath,
      JSON.stringify(
        {
          pdfId,
          extractedAt: new Date().toISOString(),
          materialCount: materials.length,
          materials,
        },
        null,
        2
      )
    );

    logger.info(
      `[PDFMaterialPropertyExtraction] Saved ${materials.length} materials to ${outputPath}`
    );
  }

  // ─── Statistics ────────────────────────────────────────────────────────

  getStats(): {
    totalExtracted: number;
    byISOGroup: Record<ISOGroup | "unknown", number>;
    validatedCount: number;
    averageConfidence: number;
    averagePropertiesPerMaterial: number;
  } {
    let totalExtracted = 0;
    let validatedCount = 0;
    let totalConfidence = 0;
    let totalProperties = 0;
    const byISOGroup: Record<ISOGroup | "unknown", number> = {
      P: 0,
      M: 0,
      K: 0,
      N: 0,
      S: 0,
      H: 0,
      unknown: 0,
    };

    for (const materials of this.extractedMaterials.values()) {
      for (const mat of materials) {
        totalExtracted++;
        byISOGroup[mat.isoGroup || "unknown"]++;
        totalConfidence += mat.confidence;
        totalProperties += Object.keys(mat.properties).length;
        if (mat.validated) validatedCount++;
      }
    }

    return {
      totalExtracted,
      byISOGroup,
      validatedCount,
      averageConfidence: totalExtracted > 0 ? totalConfidence / totalExtracted : 0,
      averagePropertiesPerMaterial: totalExtracted > 0 ? totalProperties / totalExtracted : 0,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export const pdfMaterialPropertyExtractionEngine =
  new PDFMaterialPropertyExtractionEngine();
