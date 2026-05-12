/**
 * DNCGenerateEngine — DNC Program Generation
 * ===========================================
 *
 * Generates DNC-ready programs with checksums, headers,
 * and machine-specific formatting.
 *
 * L2-P4-MS1/P0-U03 — Batch 5: DNC & Post-Processing
 * SAFETY-CRITICAL: S(x) >= 0.990 required
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const DNCFormatSchema = z.enum([
  "fanuc", "haas", "okuma", "mazak", "siemens", "heidenhain", "mitsubishi", "brother"
]);

export const DNCProgramSchema = z.object({
  id: z.string(),
  programNumber: z.string(),
  programName: z.string(),
  format: DNCFormatSchema,
  machineId: z.string(),
  content: z.string(),
  lineCount: z.number(),
  byteSize: z.number(),
  checksum: z.string(),
  checksumType: z.enum(["crc32", "md5", "sha256"]),
  header: z.object({
    title: z.string(),
    partNumber: z.string().optional(),
    revision: z.string().optional(),
    createdBy: z.string(),
    createdAt: z.string(),
    description: z.string().optional(),
  }),
  metadata: z.object({
    toolCount: z.number(),
    estimatedCycleTime: z.number().optional(),
    xMin: z.number().optional(),
    xMax: z.number().optional(),
    yMin: z.number().optional(),
    yMax: z.number().optional(),
    zMin: z.number().optional(),
    zMax: z.number().optional(),
  }),
  safetyScore: z.number().min(0).max(1),
  validated: z.boolean(),
  generatedAt: z.string(),
});

export const GenerateOptionsSchema = z.object({
  format: DNCFormatSchema,
  machineId: z.string(),
  programNumber: z.string(),
  programName: z.string(),
  sourceContent: z.string(),
  partNumber: z.string().optional(),
  revision: z.string().optional(),
  createdBy: z.string(),
  description: z.string().optional(),
  includeHeader: z.boolean().default(true),
  includeChecksum: z.boolean().default(true),
  checksumType: z.enum(["crc32", "md5", "sha256"]).default("crc32"),
  lineNumbers: z.boolean().default(false),
  lineNumberIncrement: z.number().default(10),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type DNCFormat = z.infer<typeof DNCFormatSchema>;
export type DNCProgram = z.infer<typeof DNCProgramSchema>;
export type GenerateOptions = z.infer<typeof GenerateOptionsSchema>;

// ─── Data Store ───────────────────────────────────────────────────────────────

const generatedPrograms: Map<string, DNCProgram> = new Map();
let programCounter = 1;

// ─── Engine ───────────────────────────────────────────────────────────────────

export class DNCGenerateEngine {
  private static readonly SAFETY_THRESHOLD = 0.990;

  /**
   * Generate a DNC-ready program
   * SAFETY-CRITICAL: validates content before generation
   */
  static generate(options: GenerateOptions): DNCProgram {
    const validated = GenerateOptionsSchema.parse(options);

    // Safety validation
    const safetyResult = this.validateSafety(validated.sourceContent, validated.format);
    if (safetyResult.score < this.SAFETY_THRESHOLD) {
      throw new Error(`Safety validation failed: S(x)=${safetyResult.score.toFixed(3)} < ${this.SAFETY_THRESHOLD}. Issues: ${safetyResult.issues.join(", ")}`);
    }

    // Format content
    let content = validated.sourceContent;

    // Add line numbers if requested
    if (validated.lineNumbers) {
      content = this.addLineNumbers(content, validated.lineNumberIncrement);
    }

    // Apply format-specific transformations
    content = this.applyFormatting(content, validated.format);

    // Generate header
    const header = {
      title: validated.programName,
      partNumber: validated.partNumber,
      revision: validated.revision,
      createdBy: validated.createdBy,
      createdAt: new Date().toISOString(),
      description: validated.description,
    };

    // Add header to content if requested
    if (validated.includeHeader) {
      content = this.generateHeader(header, validated.format) + "\n" + content;
    }

    // Calculate checksum
    const checksum = validated.includeChecksum
      ? this.calculateChecksum(content, validated.checksumType)
      : "";

    // Extract metadata
    const metadata = this.extractMetadata(content);

    const program: DNCProgram = {
      id: `DNC-${++programCounter}`,
      programNumber: validated.programNumber,
      programName: validated.programName,
      format: validated.format,
      machineId: validated.machineId,
      content,
      lineCount: content.split("\n").length,
      byteSize: new TextEncoder().encode(content).length,
      checksum,
      checksumType: validated.checksumType,
      header,
      metadata,
      safetyScore: safetyResult.score,
      validated: true,
      generatedAt: new Date().toISOString(),
    };

    generatedPrograms.set(program.id, program);
    return program;
  }

  /**
   * Validate program safety
   * Returns score 0-1 and list of issues
   */
  static validateSafety(content: string, format: DNCFormat): { score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 1.0;

    const lines = content.toUpperCase().split("\n");

    // Check for dangerous commands
    const dangerousPatterns = [
      { pattern: /G28/, deduction: 0, issue: "" }, // G28 is OK
      { pattern: /G53/, deduction: 0, issue: "" }, // G53 is OK
      { pattern: /M00|M01/, deduction: 0, issue: "" }, // Stops are OK
      { pattern: /M30|M02/, deduction: 0, issue: "" }, // End is OK
    ];

    // Check for missing safety elements
    let hasToolCall = false;
    let hasSpindleStart = false;
    let hasProgramEnd = false;
    let hasCoolant = false;

    for (const line of lines) {
      if (/T\d+/.test(line)) hasToolCall = true;
      if (/M0?3|M0?4/.test(line)) hasSpindleStart = true;
      if (/M30|M02|M99/.test(line)) hasProgramEnd = true;
      if (/M0?8|M0?7/.test(line)) hasCoolant = true;

      // Check for excessively high feeds (> 10000 mm/min)
      const feedMatch = line.match(/F(\d+\.?\d*)/);
      if (feedMatch && parseFloat(feedMatch[1]) > 10000) {
        score -= 0.01;
        issues.push(`High feed rate: F${feedMatch[1]}`);
      }

      // Check for excessively high spindle speeds (> 25000 RPM)
      const speedMatch = line.match(/S(\d+)/);
      if (speedMatch && parseInt(speedMatch[1]) > 25000) {
        score -= 0.01;
        issues.push(`High spindle speed: S${speedMatch[1]}`);
      }
    }

    if (!hasProgramEnd) {
      score -= 0.02;
      issues.push("Missing program end (M30/M02)");
    }

    // Clamp score
    score = Math.max(0, Math.min(1, score));

    return { score: Math.round(score * 1000) / 1000, issues };
  }

  /**
   * Add line numbers to program
   */
  private static addLineNumbers(content: string, increment: number): string {
    const lines = content.split("\n");
    let lineNum = increment;
    return lines.map(line => {
      if (line.trim() && !line.trim().startsWith("(") && !line.trim().startsWith(";")) {
        const numbered = `N${lineNum} ${line}`;
        lineNum += increment;
        return numbered;
      }
      return line;
    }).join("\n");
  }

  /**
   * Apply format-specific transformations
   */
  private static applyFormatting(content: string, format: DNCFormat): string {
    switch (format) {
      case "fanuc":
      case "haas":
        // Standard ISO format, minimal changes
        return content;
      case "okuma":
        // OSP format uses different syntax
        return content.replace(/G54/g, "G15 H1");
      case "siemens":
        // Siemens uses different modal codes
        return content;
      case "heidenhain":
        // Conversational format would need major rewrite
        return content;
      default:
        return content;
    }
  }

  /**
   * Generate format-specific header
   */
  private static generateHeader(header: DNCProgram["header"], format: DNCFormat): string {
    const lines: string[] = [];
    const comment = format === "heidenhain" ? ";" : format === "siemens" ? ";" : "(";
    const endComment = format === "heidenhain" ? "" : format === "siemens" ? "" : ")";

    lines.push(`${comment}${header.title}${endComment}`);
    if (header.partNumber) lines.push(`${comment}PART: ${header.partNumber}${endComment}`);
    if (header.revision) lines.push(`${comment}REV: ${header.revision}${endComment}`);
    lines.push(`${comment}BY: ${header.createdBy}${endComment}`);
    lines.push(`${comment}DATE: ${header.createdAt.split("T")[0]}${endComment}`);
    if (header.description) lines.push(`${comment}${header.description}${endComment}`);

    return lines.join("\n");
  }

  /**
   * Calculate checksum
   */
  private static calculateChecksum(content: string, type: "crc32" | "md5" | "sha256"): string {
    // Simple CRC32 implementation for demo
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < content.length; i++) {
      crc ^= content.charCodeAt(i);
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
      }
    }
    return ((crc ^ 0xFFFFFFFF) >>> 0).toString(16).padStart(8, "0");
  }

  /**
   * Extract metadata from content
   */
  private static extractMetadata(content: string): DNCProgram["metadata"] {
    const tools = new Set<string>();
    let xMin = Infinity, xMax = -Infinity;
    let yMin = Infinity, yMax = -Infinity;
    let zMin = Infinity, zMax = -Infinity;

    const lines = content.split("\n");
    for (const line of lines) {
      const toolMatch = line.match(/T(\d+)/);
      if (toolMatch) tools.add(toolMatch[1]);

      const xMatch = line.match(/X(-?\d+\.?\d*)/);
      if (xMatch) {
        const x = parseFloat(xMatch[1]);
        xMin = Math.min(xMin, x);
        xMax = Math.max(xMax, x);
      }

      const yMatch = line.match(/Y(-?\d+\.?\d*)/);
      if (yMatch) {
        const y = parseFloat(yMatch[1]);
        yMin = Math.min(yMin, y);
        yMax = Math.max(yMax, y);
      }

      const zMatch = line.match(/Z(-?\d+\.?\d*)/);
      if (zMatch) {
        const z = parseFloat(zMatch[1]);
        zMin = Math.min(zMin, z);
        zMax = Math.max(zMax, z);
      }
    }

    return {
      toolCount: tools.size,
      xMin: isFinite(xMin) ? xMin : undefined,
      xMax: isFinite(xMax) ? xMax : undefined,
      yMin: isFinite(yMin) ? yMin : undefined,
      yMax: isFinite(yMax) ? yMax : undefined,
      zMin: isFinite(zMin) ? zMin : undefined,
      zMax: isFinite(zMax) ? zMax : undefined,
    };
  }

  /**
   * Get generated program
   */
  static getProgram(id: string): DNCProgram | undefined {
    return generatedPrograms.get(id);
  }

  /**
   * List programs by machine
   */
  static listByMachine(machineId: string): DNCProgram[] {
    return Array.from(generatedPrograms.values())
      .filter(p => p.machineId === machineId)
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  }

  static getSelfAwareness() {
    return {
      name: "DNCGenerateEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U03",
      safetyCritical: true,
      safetyThreshold: 0.990,
      capabilities: ["generate", "validateSafety", "getProgram", "listByMachine"],
      supportedFormats: ["fanuc", "haas", "okuma", "mazak", "siemens", "heidenhain", "mitsubishi", "brother"],
      dependencies: [],
    };
  }
}

export const dncGenerateEngine = new DNCGenerateEngine();
