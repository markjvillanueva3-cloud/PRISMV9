/**
 * DNCCompareEngine — DNC Program Comparison
 * ==========================================
 *
 * Compares NC programs to detect differences, versioning,
 * and unauthorized modifications.
 *
 * L2-P4-MS1/P0-U03 — Batch 5: DNC & Post-Processing
 * SAFETY-CRITICAL: S(x) >= 0.990 required
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const DifferenceTypeSchema = z.enum([
  "added", "removed", "modified", "moved", "comment_only", "whitespace_only"
]);

export const DifferenceSeveritySchema = z.enum([
  "info", "warning", "critical", "safety"
]);

export const DifferenceSchema = z.object({
  type: DifferenceTypeSchema,
  severity: DifferenceSeveritySchema,
  lineNumberA: z.number().optional(),
  lineNumberB: z.number().optional(),
  contentA: z.string().optional(),
  contentB: z.string().optional(),
  description: z.string(),
  safetyImpact: z.boolean().default(false),
});

export const CompareResultSchema = z.object({
  id: z.string(),
  programA: z.string(),
  programB: z.string(),
  identical: z.boolean(),
  functionallyEquivalent: z.boolean(),
  differences: z.array(DifferenceSchema),
  summary: z.object({
    totalDifferences: z.number(),
    added: z.number(),
    removed: z.number(),
    modified: z.number(),
    safetyChanges: z.number(),
    commentChanges: z.number(),
  }),
  safetyScore: z.number(),
  comparedAt: z.string(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type DifferenceType = z.infer<typeof DifferenceTypeSchema>;
export type DifferenceSeverity = z.infer<typeof DifferenceSeveritySchema>;
export type Difference = z.infer<typeof DifferenceSchema>;
export type CompareResult = z.infer<typeof CompareResultSchema>;

// ─── Data Store ───────────────────────────────────────────────────────────────

const compareResults: Map<string, CompareResult> = new Map();
let compareCounter = 1;

// ─── Engine ───────────────────────────────────────────────────────────────────

export class DNCCompareEngine {
  private static readonly SAFETY_CODES = [
    "G28", "G53", "M00", "M01", "M30", "M02", "M03", "M04", "M05", "M08", "M09",
    "G43", "G44", "G49", "G40", "G41", "G42"
  ];

  /**
   * Compare two NC programs
   */
  static compare(contentA: string, contentB: string, nameA?: string, nameB?: string): CompareResult {
    const linesA = this.normalizeLines(contentA);
    const linesB = this.normalizeLines(contentB);

    const differences: Difference[] = [];
    let safetyChanges = 0;
    let commentChanges = 0;

    // Simple line-by-line comparison
    const maxLines = Math.max(linesA.length, linesB.length);

    for (let i = 0; i < maxLines; i++) {
      const lineA = linesA[i];
      const lineB = linesB[i];

      if (lineA === undefined && lineB !== undefined) {
        const diff = this.createDifference("added", i + 1, undefined, lineB);
        differences.push(diff);
        if (diff.safetyImpact) safetyChanges++;
        if (diff.type === "comment_only") commentChanges++;
      } else if (lineA !== undefined && lineB === undefined) {
        const diff = this.createDifference("removed", i + 1, lineA, undefined);
        differences.push(diff);
        if (diff.safetyImpact) safetyChanges++;
        if (diff.type === "comment_only") commentChanges++;
      } else if (lineA !== lineB) {
        const diff = this.createDifference("modified", i + 1, lineA, lineB);
        differences.push(diff);
        if (diff.safetyImpact) safetyChanges++;
        if (diff.type === "comment_only") commentChanges++;
      }
    }

    const identical = differences.length === 0;
    const functionallyEquivalent = differences.every(d =>
      d.type === "comment_only" || d.type === "whitespace_only"
    );

    // Calculate safety score based on differences
    let safetyScore = 1.0;
    for (const diff of differences) {
      if (diff.severity === "safety") safetyScore -= 0.1;
      else if (diff.severity === "critical") safetyScore -= 0.05;
      else if (diff.severity === "warning") safetyScore -= 0.01;
    }
    safetyScore = Math.max(0, safetyScore);

    const result: CompareResult = {
      id: `CMP-${++compareCounter}`,
      programA: nameA || "Program A",
      programB: nameB || "Program B",
      identical,
      functionallyEquivalent,
      differences,
      summary: {
        totalDifferences: differences.length,
        added: differences.filter(d => d.type === "added").length,
        removed: differences.filter(d => d.type === "removed").length,
        modified: differences.filter(d => d.type === "modified").length,
        safetyChanges,
        commentChanges,
      },
      safetyScore: Math.round(safetyScore * 1000) / 1000,
      comparedAt: new Date().toISOString(),
    };

    compareResults.set(result.id, result);
    return result;
  }

  /**
   * Normalize lines for comparison
   */
  private static normalizeLines(content: string): string[] {
    return content
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  /**
   * Create a difference record
   */
  private static createDifference(
    type: DifferenceType,
    lineNum: number,
    contentA?: string,
    contentB?: string
  ): Difference {
    const content = contentA || contentB || "";
    const isComment = content.startsWith("(") || content.startsWith(";");
    const hasSafetyCode = this.SAFETY_CODES.some(code =>
      content.toUpperCase().includes(code)
    );

    let severity: DifferenceSeverity = "info";
    if (hasSafetyCode) {
      severity = "safety";
    } else if (type === "removed" || type === "added") {
      severity = isComment ? "info" : "warning";
    } else if (type === "modified") {
      severity = isComment ? "info" : "critical";
    }

    const actualType: DifferenceType = isComment ? "comment_only" : type;

    return {
      type: actualType,
      severity,
      lineNumberA: type === "added" ? undefined : lineNum,
      lineNumberB: type === "removed" ? undefined : lineNum,
      contentA,
      contentB,
      description: this.generateDescription(actualType, lineNum, contentA, contentB),
      safetyImpact: hasSafetyCode,
    };
  }

  /**
   * Generate human-readable description
   */
  private static generateDescription(
    type: DifferenceType,
    lineNum: number,
    contentA?: string,
    contentB?: string
  ): string {
    switch (type) {
      case "added":
        return `Line ${lineNum}: Added "${contentB?.substring(0, 50)}"`;
      case "removed":
        return `Line ${lineNum}: Removed "${contentA?.substring(0, 50)}"`;
      case "modified":
        return `Line ${lineNum}: Changed from "${contentA?.substring(0, 30)}" to "${contentB?.substring(0, 30)}"`;
      case "comment_only":
        return `Line ${lineNum}: Comment change`;
      case "whitespace_only":
        return `Line ${lineNum}: Whitespace change`;
      default:
        return `Line ${lineNum}: ${type}`;
    }
  }

  /**
   * Get compare result by ID
   */
  static getResult(id: string): CompareResult | undefined {
    return compareResults.get(id);
  }

  /**
   * Compare with master version
   */
  static compareWithMaster(content: string, masterId: string, masterContent: string): CompareResult {
    return this.compare(masterContent, content, `Master (${masterId})`, "Current Version");
  }

  /**
   * Detect unauthorized changes
   */
  static detectUnauthorizedChanges(
    original: string,
    modified: string,
    allowedChanges: ("comments" | "whitespace" | "parameters")[]
  ): { authorized: boolean; violations: Difference[] } {
    const result = this.compare(original, modified);
    const violations: Difference[] = [];

    for (const diff of result.differences) {
      let authorized = false;

      if (diff.type === "comment_only" && allowedChanges.includes("comments")) {
        authorized = true;
      } else if (diff.type === "whitespace_only" && allowedChanges.includes("whitespace")) {
        authorized = true;
      } else if (allowedChanges.includes("parameters")) {
        // Check if only F/S values changed
        const paramPattern = /^[FS]\d+\.?\d*$/;
        if (diff.contentA && diff.contentB) {
          const aParams = diff.contentA.match(/[FS]\d+\.?\d*/g) || [];
          const bParams = diff.contentB.match(/[FS]\d+\.?\d*/g) || [];
          if (aParams.length > 0 && bParams.length > 0) {
            const aWithoutParams = diff.contentA.replace(/[FS]\d+\.?\d*/g, "");
            const bWithoutParams = diff.contentB.replace(/[FS]\d+\.?\d*/g, "");
            if (aWithoutParams === bWithoutParams) {
              authorized = true;
            }
          }
        }
      }

      if (!authorized) {
        violations.push(diff);
      }
    }

    return {
      authorized: violations.length === 0,
      violations,
    };
  }

  static getSelfAwareness() {
    return {
      name: "DNCCompareEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U03",
      safetyCritical: true,
      capabilities: ["compare", "getResult", "compareWithMaster", "detectUnauthorizedChanges"],
      differenceTypes: ["added", "removed", "modified", "moved", "comment_only", "whitespace_only"],
      safetyCodes: ["G28", "G53", "M00", "M01", "M30", "M02", "M03", "M04", "M05", "M08", "M09", "G43", "G44", "G49", "G40", "G41", "G42"],
      dependencies: [],
    };
  }
}

export const dncCompareEngine = new DNCCompareEngine();
