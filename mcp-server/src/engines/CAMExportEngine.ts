/**
 * CAMExportEngine — CAM System Export
 * ====================================
 *
 * Exports toolpath data to various CAM system formats
 * for import and further processing.
 *
 * L2-P4-MS1/P0-U03 — Batch 6: CAM Export
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const CAMSystemSchema = z.enum([
  "mastercam", "fusion360", "solidcam", "esprit", "gibbs", "hypermill",
  "powermill", "nx_cam", "catia", "edgecam", "bobcad", "surfcam"
]);

export const ExportFormatSchema = z.enum([
  "apt", "cl_data", "step_nc", "iges", "step", "dxf", "json", "xml"
]);

export const ToolpathDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  operationType: z.string(),
  toolNumber: z.number(),
  toolDiameter: z.number(),
  toolLength: z.number().optional(),
  spindleSpeed: z.number(),
  feedRate: z.number(),
  coolant: z.string(),
  points: z.array(z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
    a: z.number().optional(),
    b: z.number().optional(),
    c: z.number().optional(),
    type: z.enum(["rapid", "linear", "arc_cw", "arc_ccw"]),
    feed: z.number().optional(),
  })),
  estimatedTime: z.number().optional(),
});

export const ExportResultSchema = z.object({
  id: z.string(),
  targetSystem: CAMSystemSchema,
  format: ExportFormatSchema,
  toolpathCount: z.number(),
  content: z.string(),
  byteSize: z.number(),
  exportedAt: z.string(),
  warnings: z.array(z.string()),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CAMSystem = z.infer<typeof CAMSystemSchema>;
export type ExportFormat = z.infer<typeof ExportFormatSchema>;
export type ToolpathData = z.infer<typeof ToolpathDataSchema>;
export type ExportResult = z.infer<typeof ExportResultSchema>;

// ─── Data Store ───────────────────────────────────────────────────────────────

const exports: Map<string, ExportResult> = new Map();
let exportCounter = 1;

// ─── Engine ───────────────────────────────────────────────────────────────────

export class CAMExportEngine {
  /**
   * Export toolpaths to CAM system format
   */
  static export(
    toolpaths: ToolpathData[],
    targetSystem: CAMSystem,
    format?: ExportFormat
  ): ExportResult {
    const exportFormat = format || this.getDefaultFormat(targetSystem);
    const warnings: string[] = [];

    // Generate export content
    let content: string;
    switch (exportFormat) {
      case "apt":
        content = this.generateAPT(toolpaths);
        break;
      case "cl_data":
        content = this.generateCLData(toolpaths);
        break;
      case "json":
        content = this.generateJSON(toolpaths, targetSystem);
        break;
      case "xml":
        content = this.generateXML(toolpaths, targetSystem);
        break;
      default:
        content = this.generateJSON(toolpaths, targetSystem);
        warnings.push(`Format ${exportFormat} not fully implemented, using JSON`);
    }

    // Check for compatibility issues
    warnings.push(...this.checkCompatibility(toolpaths, targetSystem));

    const result: ExportResult = {
      id: `EXP-${++exportCounter}`,
      targetSystem,
      format: exportFormat,
      toolpathCount: toolpaths.length,
      content,
      byteSize: new TextEncoder().encode(content).length,
      exportedAt: new Date().toISOString(),
      warnings,
    };

    exports.set(result.id, result);
    return result;
  }

  /**
   * Get default format for CAM system
   */
  private static getDefaultFormat(system: CAMSystem): ExportFormat {
    const defaults: Record<CAMSystem, ExportFormat> = {
      mastercam: "apt",
      fusion360: "json",
      solidcam: "cl_data",
      esprit: "apt",
      gibbs: "cl_data",
      hypermill: "apt",
      powermill: "cl_data",
      nx_cam: "apt",
      catia: "apt",
      edgecam: "cl_data",
      bobcad: "json",
      surfcam: "apt",
    };
    return defaults[system];
  }

  /**
   * Generate APT format
   */
  private static generateAPT(toolpaths: ToolpathData[]): string {
    const lines: string[] = ["PARTNO/PRISM_EXPORT", "MACHIN/UNCX01,1"];

    for (const tp of toolpaths) {
      lines.push(`$$-> ${tp.name}`);
      lines.push(`LOADTL/${tp.toolNumber},ADJUST,${tp.toolNumber}`);
      lines.push(`SPINDL/${tp.spindleSpeed},RPM,CLW`);
      lines.push(`FEDRAT/${tp.feedRate},MMPM`);
      lines.push(`COOLNT/${tp.coolant.toUpperCase()}`);

      for (const pt of tp.points) {
        if (pt.type === "rapid") {
          lines.push(`RAPID`);
          lines.push(`GOTO/${pt.x.toFixed(4)},${pt.y.toFixed(4)},${pt.z.toFixed(4)}`);
        } else if (pt.type === "linear") {
          lines.push(`GOTO/${pt.x.toFixed(4)},${pt.y.toFixed(4)},${pt.z.toFixed(4)}`);
        } else if (pt.type === "arc_cw" || pt.type === "arc_ccw") {
          const dir = pt.type === "arc_cw" ? "CLW" : "CCLW";
          lines.push(`CIRCLE/${pt.x.toFixed(4)},${pt.y.toFixed(4)},${pt.z.toFixed(4)},${dir}`);
        }
      }
    }

    lines.push("SPINDL/OFF");
    lines.push("COOLNT/OFF");
    lines.push("END");
    lines.push("FINI");

    return lines.join("\n");
  }

  /**
   * Generate CL Data format
   */
  private static generateCLData(toolpaths: ToolpathData[]): string {
    const lines: string[] = ["$$CLFILE", "PARTNO/PRISM_EXPORT"];

    for (const tp of toolpaths) {
      lines.push(`$$ OPERATION: ${tp.name}`);
      lines.push(`LOADTL/${tp.toolNumber}`);
      lines.push(`SPINDL/${tp.spindleSpeed}`);
      lines.push(`FEDRAT/${tp.feedRate}`);

      for (const pt of tp.points) {
        if (pt.type === "rapid") {
          lines.push(`RAPID`);
        }
        lines.push(`GOTO/${pt.x.toFixed(3)},${pt.y.toFixed(3)},${pt.z.toFixed(3)},0.0000000,0.0000000,1.0000000`);
      }
    }

    lines.push("END");
    return lines.join("\n");
  }

  /**
   * Generate JSON format
   */
  private static generateJSON(toolpaths: ToolpathData[], system: CAMSystem): string {
    return JSON.stringify({
      version: "1.0",
      generator: "PRISM CAMExportEngine",
      targetSystem: system,
      exportedAt: new Date().toISOString(),
      toolpaths: toolpaths.map(tp => ({
        ...tp,
        points: tp.points.map(pt => ({
          ...pt,
          x: Math.round(pt.x * 10000) / 10000,
          y: Math.round(pt.y * 10000) / 10000,
          z: Math.round(pt.z * 10000) / 10000,
        })),
      })),
    }, null, 2);
  }

  /**
   * Generate XML format
   */
  private static generateXML(toolpaths: ToolpathData[], system: CAMSystem): string {
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<CAMExport generator="PRISM" target="${system}">`,
    ];

    for (const tp of toolpaths) {
      lines.push(`  <Toolpath name="${tp.name}" tool="${tp.toolNumber}">`);
      lines.push(`    <Spindle speed="${tp.spindleSpeed}"/>`);
      lines.push(`    <Feed rate="${tp.feedRate}"/>`);
      lines.push(`    <Points count="${tp.points.length}">`);
      for (const pt of tp.points) {
        lines.push(`      <Point type="${pt.type}" x="${pt.x}" y="${pt.y}" z="${pt.z}"/>`);
      }
      lines.push("    </Points>");
      lines.push("  </Toolpath>");
    }

    lines.push("</CAMExport>");
    return lines.join("\n");
  }

  /**
   * Check compatibility issues
   */
  private static checkCompatibility(toolpaths: ToolpathData[], system: CAMSystem): string[] {
    const warnings: string[] = [];

    for (const tp of toolpaths) {
      // Check for 5-axis data on 3-axis systems
      const has5Axis = tp.points.some(p => p.a !== undefined || p.b !== undefined || p.c !== undefined);
      if (has5Axis && ["bobcad", "surfcam"].includes(system)) {
        warnings.push(`${tp.name}: 5-axis data may not be fully supported by ${system}`);
      }

      // Check for arc moves
      const hasArcs = tp.points.some(p => p.type === "arc_cw" || p.type === "arc_ccw");
      if (hasArcs && system === "fusion360") {
        warnings.push(`${tp.name}: Arc moves will be linearized for ${system} import`);
      }

      // Check point count
      if (tp.points.length > 100000) {
        warnings.push(`${tp.name}: Large point count (${tp.points.length}) may slow import`);
      }
    }

    return warnings;
  }

  /**
   * Get export result
   */
  static getExport(id: string): ExportResult | undefined {
    return exports.get(id);
  }

  /**
   * List supported CAM systems
   */
  static listSupportedSystems(): { system: CAMSystem; formats: ExportFormat[]; notes: string }[] {
    return [
      { system: "mastercam", formats: ["apt", "cl_data", "json"], notes: "Full 5-axis support" },
      { system: "fusion360", formats: ["json", "step"], notes: "Cloud-based import" },
      { system: "solidcam", formats: ["cl_data", "apt"], notes: "SolidWorks integrated" },
      { system: "esprit", formats: ["apt", "cl_data"], notes: "Multi-channel support" },
      { system: "gibbs", formats: ["cl_data", "apt"], notes: "MTM support" },
      { system: "hypermill", formats: ["apt", "xml"], notes: "5-axis optimized" },
      { system: "powermill", formats: ["cl_data", "apt"], notes: "Complex geometry" },
      { system: "nx_cam", formats: ["apt", "step_nc"], notes: "Siemens PLM" },
      { system: "catia", formats: ["apt", "step"], notes: "Dassault Systèmes" },
      { system: "edgecam", formats: ["cl_data", "apt"], notes: "Production machining" },
      { system: "bobcad", formats: ["json", "dxf"], notes: "Entry-level CAM" },
      { system: "surfcam", formats: ["apt", "cl_data"], notes: "Traditional CAM" },
    ];
  }

  static getSelfAwareness() {
    return {
      name: "CAMExportEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U03",
      capabilities: ["export", "getExport", "listSupportedSystems"],
      supportedSystems: ["mastercam", "fusion360", "solidcam", "esprit", "gibbs", "hypermill", "powermill", "nx_cam", "catia", "edgecam", "bobcad", "surfcam"],
      formats: ["apt", "cl_data", "step_nc", "iges", "step", "dxf", "json", "xml"],
      dependencies: [],
    };
  }
}

export const camExportEngine = new CAMExportEngine();
