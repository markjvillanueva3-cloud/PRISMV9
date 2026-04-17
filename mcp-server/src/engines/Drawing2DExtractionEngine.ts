/**
 * Drawing2DExtractionEngine — 2D Drawing Data Extraction
 *
 * Extracts manufacturing data from 2D engineering drawings:
 * dimensions, tolerances, GD&T symbols, notes, and title block info.
 *
 * U-AWR28: 2D Drawing Extraction
 *
 * @module engines/Drawing2DExtractionEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type DrawingFormat = "dxf" | "dwg" | "pdf" | "image";

export type DimensionType =
  | "linear"
  | "angular"
  | "radial"
  | "diameter"
  | "ordinate"
  | "arc_length";

export type ToleranceType =
  | "bilateral"
  | "unilateral_plus"
  | "unilateral_minus"
  | "limit"
  | "basic"
  | "reference";

export type GDTSymbol =
  | "flatness"
  | "straightness"
  | "circularity"
  | "cylindricity"
  | "perpendicularity"
  | "parallelism"
  | "angularity"
  | "position"
  | "concentricity"
  | "symmetry"
  | "runout"
  | "total_runout"
  | "profile_line"
  | "profile_surface";

export interface Dimension {
  id: string;
  type: DimensionType;
  nominalValue: number;
  unit: "mm" | "in";
  tolerance?: Tolerance;
  location?: { x: number; y: number };
  referenceId?: string;
}

export interface Tolerance {
  type: ToleranceType;
  upper: number;
  lower: number;
  unit: "mm" | "in";
}

export interface GDTCallout {
  id: string;
  symbol: GDTSymbol;
  value: number;
  unit: "mm" | "in";
  datumReferences: string[];
  modifiers: string[];
}

export interface TitleBlock {
  partNumber?: string;
  partName?: string;
  revision?: string;
  material?: string;
  finish?: string;
  drawnBy?: string;
  checkedBy?: string;
  approvedBy?: string;
  date?: string;
  scale?: string;
  sheet?: string;
  company?: string;
}

export interface Note {
  id: string;
  text: string;
  type: "general" | "specification" | "process" | "material" | "quality";
  location?: { x: number; y: number };
}

export interface DrawingExtraction {
  filePath: string;
  format: DrawingFormat;
  dimensions: Dimension[];
  tolerances: Tolerance[];
  gdtCallouts: GDTCallout[];
  titleBlock: TitleBlock;
  notes: Note[];
  views: string[];
  layers: string[];
  extractionConfidence: number;
  warnings: string[];
  extractedAt: string;
}

export interface ExtractionSummary {
  totalDimensions: number;
  totalGDT: number;
  totalNotes: number;
  hasTitleBlock: boolean;
  overallConfidence: number;
  criticalFeatures: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const GDT_PATTERN_MAP: Record<string, GDTSymbol> = {
  "⌖": "position",
  "⏤": "flatness",
  "⌓": "circularity",
  "⌒": "profile_line",
  "⌓": "cylindricity",
  "⊥": "perpendicularity",
  "∥": "parallelism",
  "∠": "angularity",
  "⌀": "concentricity",
  "↗": "runout",
};

const MATERIAL_KEYWORDS = [
  "aluminum", "steel", "stainless", "brass", "bronze", "copper",
  "titanium", "inconel", "hastelloy", "delrin", "nylon", "peek",
  "6061", "7075", "4140", "304", "316", "17-4",
];

const FINISH_KEYWORDS = [
  "anodize", "anodized", "chrome", "nickel", "zinc", "passivate",
  "powder coat", "paint", "polish", "bead blast", "tumble",
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(): string {
  return `ext-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
}

function detectFormat(filename: string): DrawingFormat {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".dxf")) return "dxf";
  if (lower.endsWith(".dwg")) return "dwg";
  if (lower.endsWith(".pdf")) return "pdf";
  return "image";
}

function extractMaterial(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const keyword of MATERIAL_KEYWORDS) {
    if (lower.includes(keyword)) {
      // Find the line containing the keyword
      const lines = text.split("\n");
      const line = lines.find((l) => l.toLowerCase().includes(keyword));
      return line?.trim();
    }
  }
  return undefined;
}

function extractFinish(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const keyword of FINISH_KEYWORDS) {
    if (lower.includes(keyword)) {
      const lines = text.split("\n");
      const line = lines.find((l) => l.toLowerCase().includes(keyword));
      return line?.trim();
    }
  }
  return undefined;
}

function classifyNote(text: string): Note["type"] {
  const lower = text.toLowerCase();
  if (lower.includes("material") || lower.includes("mat'l")) return "material";
  if (lower.includes("finish") || lower.includes("coat") || lower.includes("plate")) {
    return "process";
  }
  if (lower.includes("inspect") || lower.includes("test") || lower.includes("certif")) {
    return "quality";
  }
  if (lower.includes("tolerance") || lower.includes("spec") || lower.includes("per")) {
    return "specification";
  }
  return "general";
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class Drawing2DExtractionEngine {
  private static extractions: Map<string, DrawingExtraction> = new Map();

  /**
   * Extracts data from a 2D drawing.
   * In production, this would parse DXF/DWG or use OCR on images/PDFs.
   */
  static extractDrawing(
    filePath: string,
    options: {
      simulatedDimensions?: Dimension[];
      simulatedGDT?: GDTCallout[];
      simulatedTitleBlock?: Partial<TitleBlock>;
      simulatedNotes?: string[];
    } = {}
  ): DrawingExtraction {
    const format = detectFormat(filePath);
    const dimensions = options.simulatedDimensions || [];
    const gdtCallouts = options.simulatedGDT || [];
    const titleBlock: TitleBlock = options.simulatedTitleBlock || {};

    const notes: Note[] = (options.simulatedNotes || []).map((text) => ({
      id: generateId(),
      text,
      type: classifyNote(text),
    }));

    const warnings: string[] = [];
    if (dimensions.length === 0) {
      warnings.push("No dimensions extracted");
    }
    if (!titleBlock.partNumber) {
      warnings.push("Part number not found in title block");
    }

    const confidence =
      dimensions.length > 0 && titleBlock.partNumber ? 0.9 : dimensions.length > 0 ? 0.7 : 0.3;

    const extraction: DrawingExtraction = {
      filePath,
      format,
      dimensions,
      tolerances: dimensions.filter((d) => d.tolerance).map((d) => d.tolerance!),
      gdtCallouts,
      titleBlock,
      notes,
      views: ["front", "top", "right"], // Simulated
      layers: ["0", "dimensions", "hidden", "centerlines"], // Simulated
      extractionConfidence: confidence,
      warnings,
      extractedAt: new Date().toISOString(),
    };

    this.extractions.set(filePath, extraction);
    log.info(`[Drawing2DExtraction] Extracted ${filePath}: ${dimensions.length} dimensions`);

    return extraction;
  }

  /**
   * Creates a dimension object.
   */
  static createDimension(
    type: DimensionType,
    value: number,
    unit: "mm" | "in",
    tolerance?: { upper: number; lower: number; type?: ToleranceType }
  ): Dimension {
    const dim: Dimension = {
      id: generateId(),
      type,
      nominalValue: value,
      unit,
    };

    if (tolerance) {
      dim.tolerance = {
        type: tolerance.type || "bilateral",
        upper: tolerance.upper,
        lower: tolerance.lower,
        unit,
      };
    }

    return dim;
  }

  /**
   * Creates a GD&T callout object.
   */
  static createGDTCallout(
    symbol: GDTSymbol,
    value: number,
    unit: "mm" | "in",
    datumRefs: string[] = [],
    modifiers: string[] = []
  ): GDTCallout {
    return {
      id: generateId(),
      symbol,
      value,
      unit,
      datumReferences: datumRefs,
      modifiers,
    };
  }

  /**
   * Gets extraction result for a drawing.
   */
  static getExtraction(filePath: string): DrawingExtraction | null {
    return this.extractions.get(filePath) || null;
  }

  /**
   * Gets all extractions.
   */
  static getAllExtractions(): DrawingExtraction[] {
    return [...this.extractions.values()];
  }

  /**
   * Gets extractions by format.
   */
  static getExtractionsByFormat(format: DrawingFormat): DrawingExtraction[] {
    return [...this.extractions.values()].filter((e) => e.format === format);
  }

  /**
   * Gets summary of an extraction.
   */
  static getSummary(filePath: string): ExtractionSummary | null {
    const extraction = this.extractions.get(filePath);
    if (!extraction) return null;

    const criticalFeatures: string[] = [];

    // Identify tight tolerances
    for (const dim of extraction.dimensions) {
      if (dim.tolerance) {
        const range = dim.tolerance.upper - dim.tolerance.lower;
        if (dim.tolerance.unit === "mm" && range <= 0.05) {
          criticalFeatures.push(`Tight tolerance: ${dim.nominalValue}±${range / 2}${dim.unit}`);
        } else if (dim.tolerance.unit === "in" && range <= 0.002) {
          criticalFeatures.push(`Tight tolerance: ${dim.nominalValue}±${range / 2}${dim.unit}`);
        }
      }
    }

    // Identify position callouts
    for (const gdt of extraction.gdtCallouts) {
      if (gdt.symbol === "position" && gdt.value <= 0.1) {
        criticalFeatures.push(`True position: ${gdt.value}${gdt.unit}`);
      }
    }

    return {
      totalDimensions: extraction.dimensions.length,
      totalGDT: extraction.gdtCallouts.length,
      totalNotes: extraction.notes.length,
      hasTitleBlock: !!extraction.titleBlock.partNumber,
      overallConfidence: extraction.extractionConfidence,
      criticalFeatures,
    };
  }

  /**
   * Searches extractions for a dimension value.
   */
  static searchByDimension(value: number, tolerance: number = 0.01): DrawingExtraction[] {
    return [...this.extractions.values()].filter((e) =>
      e.dimensions.some(
        (d) => Math.abs(d.nominalValue - value) <= tolerance
      )
    );
  }

  /**
   * Searches extractions by part number.
   */
  static searchByPartNumber(partNumber: string): DrawingExtraction[] {
    const lower = partNumber.toLowerCase();
    return [...this.extractions.values()].filter(
      (e) => e.titleBlock.partNumber?.toLowerCase().includes(lower)
    );
  }

  /**
   * Gets drawings with GD&T callouts.
   */
  static getDrawingsWithGDT(): DrawingExtraction[] {
    return [...this.extractions.values()].filter((e) => e.gdtCallouts.length > 0);
  }

  /**
   * Gets drawings with tight tolerances.
   */
  static getDrawingsWithTightTolerances(
    threshold: { mm?: number; in?: number } = { mm: 0.05, in: 0.002 }
  ): DrawingExtraction[] {
    return [...this.extractions.values()].filter((e) =>
      e.dimensions.some((d) => {
        if (!d.tolerance) return false;
        const range = d.tolerance.upper - d.tolerance.lower;
        if (d.unit === "mm" && threshold.mm) return range <= threshold.mm;
        if (d.unit === "in" && threshold.in) return range <= threshold.in;
        return false;
      })
    );
  }

  /**
   * Available GD&T symbols.
   */
  static getGDTSymbols(): GDTSymbol[] {
    return [
      "flatness",
      "straightness",
      "circularity",
      "cylindricity",
      "perpendicularity",
      "parallelism",
      "angularity",
      "position",
      "concentricity",
      "symmetry",
      "runout",
      "total_runout",
      "profile_line",
      "profile_surface",
    ];
  }

  /**
   * Gets statistics across all extractions.
   */
  static getStatistics(): {
    totalDrawings: number;
    totalDimensions: number;
    totalGDT: number;
    byFormat: Record<DrawingFormat, number>;
    averageConfidence: number;
    withTitleBlock: number;
  } {
    const extractions = [...this.extractions.values()];
    const byFormat: Record<DrawingFormat, number> = {
      dxf: 0,
      dwg: 0,
      pdf: 0,
      image: 0,
    };

    let totalDimensions = 0;
    let totalGDT = 0;
    let totalConfidence = 0;
    let withTitleBlock = 0;

    for (const e of extractions) {
      byFormat[e.format]++;
      totalDimensions += e.dimensions.length;
      totalGDT += e.gdtCallouts.length;
      totalConfidence += e.extractionConfidence;
      if (e.titleBlock.partNumber) withTitleBlock++;
    }

    return {
      totalDrawings: extractions.length,
      totalDimensions,
      totalGDT,
      byFormat,
      averageConfidence: extractions.length > 0 ? totalConfidence / extractions.length : 0,
      withTitleBlock,
    };
  }

  /**
   * Clears all extractions.
   */
  static reset(): void {
    this.extractions.clear();
    log.info("[Drawing2DExtraction] Reset complete");
  }
}

export const drawing2DExtractionEngine = Drawing2DExtractionEngine;
export default Drawing2DExtractionEngine;
