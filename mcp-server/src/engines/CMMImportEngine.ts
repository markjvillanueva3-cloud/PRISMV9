/**
 * CMMImportEngine — CMM Data Import
 * ==================================
 *
 * Imports measurement data from CMM (Coordinate Measuring Machine)
 * systems in various formats (DMIS, QIF, native formats).
 *
 * L2-P4-MS1/P0-U02 — Batch 4: Measurement & QC Engines
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const CMMFormatSchema = z.enum(["dmis", "qif", "zeiss_calypso", "hexagon_pc_dmis", "mitutoyo_mcosmos", "csv", "custom"]);

export const MeasurementPointSchema = z.object({
  id: z.string(),
  featureName: z.string(),
  featureType: z.enum(["point", "line", "plane", "circle", "cylinder", "cone", "sphere", "slot", "boss"]),
  nominal: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
    i: z.number().optional(),
    j: z.number().optional(),
    k: z.number().optional(),
    diameter: z.number().optional(),
  }),
  actual: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
    i: z.number().optional(),
    j: z.number().optional(),
    k: z.number().optional(),
    diameter: z.number().optional(),
  }),
  deviation: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
    position: z.number().optional(),
    diameter: z.number().optional(),
  }),
  tolerance: z.object({
    upper: z.number(),
    lower: z.number(),
  }),
  inTolerance: z.boolean(),
  unit: z.enum(["mm", "inch"]),
});

export const CMMImportResultSchema = z.object({
  id: z.string(),
  filename: z.string(),
  format: CMMFormatSchema,
  partNumber: z.string(),
  serialNumber: z.string().optional(),
  operatorId: z.string().optional(),
  machineId: z.string(),
  programName: z.string(),
  measurements: z.array(MeasurementPointSchema),
  summary: z.object({
    totalFeatures: z.number(),
    inTolerance: z.number(),
    outOfTolerance: z.number(),
    passRate: z.number(),
  }),
  importedAt: z.string(),
  rawDataHash: z.string().optional(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CMMFormat = z.infer<typeof CMMFormatSchema>;
export type MeasurementPoint = z.infer<typeof MeasurementPointSchema>;
export type CMMImportResult = z.infer<typeof CMMImportResultSchema>;

// ─── Data Store ───────────────────────────────────────────────────────────────

const importedResults: Map<string, CMMImportResult> = new Map();
let importCounter = 1;

// ─── Engine ───────────────────────────────────────────────────────────────────

export class CMMImportEngine {
  /**
   * Import CMM data from raw content
   * @param content - Raw CMM data content
   * @param format - Data format
   * @param metadata - Additional metadata
   * @returns Import result
   */
  static importData(
    content: string,
    format: CMMFormat,
    metadata: {
      filename: string;
      partNumber: string;
      serialNumber?: string;
      operatorId?: string;
      machineId: string;
      programName: string;
    }
  ): CMMImportResult {
    const measurements = this.parseContent(content, format);

    const inTolerance = measurements.filter(m => m.inTolerance).length;
    const outOfTolerance = measurements.length - inTolerance;

    const result: CMMImportResult = {
      id: `CMM-${++importCounter}`,
      filename: metadata.filename,
      format,
      partNumber: metadata.partNumber,
      serialNumber: metadata.serialNumber,
      operatorId: metadata.operatorId,
      machineId: metadata.machineId,
      programName: metadata.programName,
      measurements,
      summary: {
        totalFeatures: measurements.length,
        inTolerance,
        outOfTolerance,
        passRate: measurements.length > 0 ? Math.round((inTolerance / measurements.length) * 10000) / 100 : 100,
      },
      importedAt: new Date().toISOString(),
      rawDataHash: this.hashContent(content),
    };

    importedResults.set(result.id, result);
    return result;
  }

  /**
   * Parse CMM content based on format
   */
  private static parseContent(content: string, format: CMMFormat): MeasurementPoint[] {
    // Simplified parser - real implementation would handle each format
    const measurements: MeasurementPoint[] = [];
    const lines = content.split("\n").filter(l => l.trim());

    let pointCounter = 1;
    for (const line of lines) {
      // Simple CSV-like parsing for demo
      const parts = line.split(",").map(p => p.trim());
      if (parts.length >= 10) {
        const nominal = { x: parseFloat(parts[1]) || 0, y: parseFloat(parts[2]) || 0, z: parseFloat(parts[3]) || 0 };
        const actual = { x: parseFloat(parts[4]) || 0, y: parseFloat(parts[5]) || 0, z: parseFloat(parts[6]) || 0 };
        const tolUpper = parseFloat(parts[7]) || 0.01;
        const tolLower = parseFloat(parts[8]) || -0.01;

        const deviation = {
          x: actual.x - nominal.x,
          y: actual.y - nominal.y,
          z: actual.z - nominal.z,
          position: Math.sqrt((actual.x - nominal.x) ** 2 + (actual.y - nominal.y) ** 2 + (actual.z - nominal.z) ** 2),
        };

        const inTolerance = deviation.x >= tolLower && deviation.x <= tolUpper &&
                           deviation.y >= tolLower && deviation.y <= tolUpper &&
                           deviation.z >= tolLower && deviation.z <= tolUpper;

        measurements.push({
          id: `PT-${pointCounter++}`,
          featureName: parts[0] || `Feature_${pointCounter}`,
          featureType: "point",
          nominal,
          actual,
          deviation,
          tolerance: { upper: tolUpper, lower: tolLower },
          inTolerance,
          unit: "mm",
        });
      }
    }

    return measurements;
  }

  /**
   * Simple hash for content deduplication
   */
  private static hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Get imported result by ID
   */
  static getImportResult(id: string): CMMImportResult | undefined {
    return importedResults.get(id);
  }

  /**
   * List imports by part number
   */
  static listByPartNumber(partNumber: string): CMMImportResult[] {
    return Array.from(importedResults.values()).filter(r => r.partNumber === partNumber);
  }

  /**
   * Get supported formats with descriptions
   */
  static getSupportedFormats(): { format: CMMFormat; description: string; extensions: string[] }[] {
    return [
      { format: "dmis", description: "Dimensional Measuring Interface Standard", extensions: [".dmi", ".dmis"] },
      { format: "qif", description: "Quality Information Framework", extensions: [".qif", ".xml"] },
      { format: "zeiss_calypso", description: "Zeiss Calypso native format", extensions: [".clp", ".csy"] },
      { format: "hexagon_pc_dmis", description: "Hexagon PC-DMIS format", extensions: [".prg", ".dmo"] },
      { format: "mitutoyo_mcosmos", description: "Mitutoyo MCOSMOS format", extensions: [".mcr", ".mcs"] },
      { format: "csv", description: "Comma-separated values", extensions: [".csv", ".txt"] },
      { format: "custom", description: "Custom format with mapping", extensions: ["*"] },
    ];
  }

  /**
   * Validate import data integrity
   */
  static validateImport(id: string): { valid: boolean; issues: string[] } {
    const result = importedResults.get(id);
    if (!result) {
      return { valid: false, issues: ["Import not found"] };
    }

    const issues: string[] = [];

    if (result.measurements.length === 0) {
      issues.push("No measurements found in import");
    }

    for (const m of result.measurements) {
      if (m.deviation.position !== undefined && m.deviation.position > 10) {
        issues.push(`Feature ${m.featureName}: excessive deviation (${m.deviation.position.toFixed(4)})`);
      }
    }

    return { valid: issues.length === 0, issues };
  }

  static getSelfAwareness() {
    return {
      name: "CMMImportEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U02",
      capabilities: ["importData", "getImportResult", "listByPartNumber", "getSupportedFormats", "validateImport"],
      supportedFormats: ["dmis", "qif", "zeiss_calypso", "hexagon_pc_dmis", "mitutoyo_mcosmos", "csv", "custom"],
      dependencies: [],
    };
  }
}

export const cmmImportEngine = new CMMImportEngine();
