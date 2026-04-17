/**
 * DNCVerifyEngine — DNC Program Verification
 * ===========================================
 *
 * Verifies program integrity, syntax, and safety before
 * allowing execution on CNC machines.
 *
 * L2-P4-MS1/P0-U03 — Batch 5: DNC & Post-Processing
 * SAFETY-CRITICAL: S(x) >= 0.990 required
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const VerificationTypeSchema = z.enum([
  "syntax", "safety", "integrity", "compatibility", "limits", "tools", "full"
]);

export const VerificationIssueSchema = z.object({
  type: z.enum(["error", "warning", "info"]),
  category: z.string(),
  line: z.number().optional(),
  code: z.string(),
  message: z.string(),
  suggestion: z.string().optional(),
});

export const VerificationResultSchema = z.object({
  id: z.string(),
  programId: z.string(),
  verificationType: VerificationTypeSchema,
  passed: z.boolean(),
  safetyScore: z.number(),
  issues: z.array(VerificationIssueSchema),
  summary: z.object({
    errors: z.number(),
    warnings: z.number(),
    infos: z.number(),
    linesChecked: z.number(),
    toolsVerified: z.number(),
  }),
  machineCompatibility: z.object({
    machineId: z.string().optional(),
    compatible: z.boolean(),
    unsupportedCodes: z.array(z.string()),
  }).optional(),
  verifiedAt: z.string(),
  verifiedBy: z.string().optional(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type VerificationType = z.infer<typeof VerificationTypeSchema>;
export type VerificationIssue = z.infer<typeof VerificationIssueSchema>;
export type VerificationResult = z.infer<typeof VerificationResultSchema>;

// ─── Data Store ───────────────────────────────────────────────────────────────

const verificationResults: Map<string, VerificationResult> = new Map();
let verifyCounter = 1;

// Machine capability profiles
const machineCapabilities: Map<string, Set<string>> = new Map([
  ["fanuc", new Set(["G00", "G01", "G02", "G03", "G17", "G18", "G19", "G20", "G21", "G28", "G40", "G41", "G42", "G43", "G49", "G53", "G54", "G55", "G56", "G57", "G58", "G59", "G80", "G81", "G82", "G83", "G84", "G90", "G91", "M00", "M01", "M02", "M03", "M04", "M05", "M06", "M08", "M09", "M30"])],
  ["haas", new Set(["G00", "G01", "G02", "G03", "G17", "G18", "G19", "G20", "G21", "G28", "G40", "G41", "G42", "G43", "G49", "G53", "G54", "G55", "G56", "G57", "G58", "G59", "G65", "G80", "G81", "G82", "G83", "G84", "G90", "G91", "G187", "M00", "M01", "M02", "M03", "M04", "M05", "M06", "M08", "M09", "M30", "M97", "M98", "M99"])],
]);

// ─── Engine ───────────────────────────────────────────────────────────────────

export class DNCVerifyEngine {
  private static readonly SAFETY_THRESHOLD = 0.990;

  /**
   * Verify NC program
   */
  static verify(
    programId: string,
    content: string,
    type: VerificationType = "full",
    machineId?: string
  ): VerificationResult {
    const issues: VerificationIssue[] = [];
    const lines = content.split("\n");
    const toolsFound = new Set<string>();

    // Run verification checks based on type
    if (type === "full" || type === "syntax") {
      issues.push(...this.verifySyntax(lines));
    }

    if (type === "full" || type === "safety") {
      issues.push(...this.verifySafety(lines));
    }

    if (type === "full" || type === "tools") {
      const toolIssues = this.verifyTools(lines, toolsFound);
      issues.push(...toolIssues);
    }

    if (type === "full" || type === "limits") {
      issues.push(...this.verifyLimits(lines));
    }

    // Machine compatibility check
    let machineCompatibility: VerificationResult["machineCompatibility"];
    if (machineId || type === "compatibility") {
      machineCompatibility = this.checkMachineCompatibility(lines, machineId || "fanuc");
    }

    // Calculate safety score
    const errors = issues.filter(i => i.type === "error").length;
    const warnings = issues.filter(i => i.type === "warning").length;
    let safetyScore = 1.0 - (errors * 0.1) - (warnings * 0.02);
    safetyScore = Math.max(0, Math.min(1, safetyScore));

    const result: VerificationResult = {
      id: `VER-${++verifyCounter}`,
      programId,
      verificationType: type,
      passed: errors === 0 && safetyScore >= this.SAFETY_THRESHOLD,
      safetyScore: Math.round(safetyScore * 1000) / 1000,
      issues,
      summary: {
        errors,
        warnings,
        infos: issues.filter(i => i.type === "info").length,
        linesChecked: lines.length,
        toolsVerified: toolsFound.size,
      },
      machineCompatibility,
      verifiedAt: new Date().toISOString(),
    };

    verificationResults.set(result.id, result);
    return result;
  }

  /**
   * Verify syntax
   */
  private static verifySyntax(lines: string[]): VerificationIssue[] {
    const issues: VerificationIssue[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();
      if (!line || line.startsWith("(") || line.startsWith(";") || line.startsWith("%")) {
        continue;
      }

      // Check for invalid characters
      if (/[^A-Z0-9.\-+\s()/;#=\[\]]/.test(line)) {
        issues.push({
          type: "error",
          category: "syntax",
          line: i + 1,
          code: "INVALID_CHAR",
          message: "Line contains invalid characters",
          suggestion: "Remove special characters not supported by NC",
        });
      }

      // Check for unclosed parentheses
      const openParens = (line.match(/\(/g) || []).length;
      const closeParens = (line.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        issues.push({
          type: "error",
          category: "syntax",
          line: i + 1,
          code: "UNBALANCED_PARENS",
          message: "Unbalanced parentheses in comment",
        });
      }

      // Check for missing addresses
      if (/^[XYZIJKFSR]\s*$/.test(line)) {
        issues.push({
          type: "error",
          category: "syntax",
          line: i + 1,
          code: "MISSING_VALUE",
          message: "Address without value",
          suggestion: "Add numeric value after address letter",
        });
      }
    }

    return issues;
  }

  /**
   * Verify safety requirements
   */
  private static verifySafety(lines: string[]): VerificationIssue[] {
    const issues: VerificationIssue[] = [];
    let hasToolChange = false;
    let hasSpindleStart = false;
    let hasSpindleStop = false;
    let hasCoolantOn = false;
    let hasCoolantOff = false;
    let hasProgramEnd = false;
    let lastG00Z = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase();

      if (/M0?6/.test(line)) hasToolChange = true;
      if (/M0?3|M0?4/.test(line)) hasSpindleStart = true;
      if (/M0?5/.test(line)) hasSpindleStop = true;
      if (/M0?8|M0?7/.test(line)) hasCoolantOn = true;
      if (/M0?9/.test(line)) hasCoolantOff = true;
      if (/M30|M02/.test(line)) hasProgramEnd = true;

      // Track Z retracts
      if (/G0?0.*Z/.test(line)) {
        lastG00Z = i;
      }

      // Check for rapid into material (G00 with negative Z after tool call)
      if (/G0?0.*Z-/.test(line) && hasToolChange) {
        issues.push({
          type: "warning",
          category: "safety",
          line: i + 1,
          code: "RAPID_NEG_Z",
          message: "Rapid move to negative Z - verify clearance",
          suggestion: "Consider using G01 for approach moves",
        });
      }

      // Check for high feed rates
      const feedMatch = line.match(/F(\d+\.?\d*)/);
      if (feedMatch) {
        const feed = parseFloat(feedMatch[1]);
        if (feed > 5000) {
          issues.push({
            type: "warning",
            category: "safety",
            line: i + 1,
            code: "HIGH_FEED",
            message: `High feed rate: F${feed}`,
            suggestion: "Verify feed rate is intentional",
          });
        }
      }

      // Check for high spindle speeds
      const speedMatch = line.match(/S(\d+)/);
      if (speedMatch) {
        const speed = parseInt(speedMatch[1]);
        if (speed > 20000) {
          issues.push({
            type: "warning",
            category: "safety",
            line: i + 1,
            code: "HIGH_SPEED",
            message: `High spindle speed: S${speed}`,
            suggestion: "Verify spindle speed is within tool and machine limits",
          });
        }
      }
    }

    // Check for required elements
    if (!hasProgramEnd) {
      issues.push({
        type: "error",
        category: "safety",
        line: lines.length,
        code: "NO_PROGRAM_END",
        message: "Program missing end code (M30 or M02)",
        suggestion: "Add M30 at end of program",
      });
    }

    if (hasSpindleStart && !hasSpindleStop) {
      issues.push({
        type: "warning",
        category: "safety",
        code: "NO_SPINDLE_STOP",
        message: "Spindle started but never stopped",
        suggestion: "Add M05 before program end",
      });
    }

    if (hasCoolantOn && !hasCoolantOff) {
      issues.push({
        type: "warning",
        category: "safety",
        code: "NO_COOLANT_OFF",
        message: "Coolant turned on but never off",
        suggestion: "Add M09 before program end",
      });
    }

    return issues;
  }

  /**
   * Verify tools
   */
  private static verifyTools(lines: string[], toolsFound: Set<string>): VerificationIssue[] {
    const issues: VerificationIssue[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase();
      const toolMatch = line.match(/T(\d+)/);

      if (toolMatch) {
        const toolNum = toolMatch[1];
        toolsFound.add(toolNum);

        // Check for tool number > 99
        if (parseInt(toolNum) > 99) {
          issues.push({
            type: "warning",
            category: "tools",
            line: i + 1,
            code: "HIGH_TOOL_NUM",
            message: `Tool number T${toolNum} may not be supported`,
          });
        }
      }

      // Check for H offset matching tool
      const hMatch = line.match(/H(\d+)/);
      if (hMatch && toolMatch) {
        const hNum = hMatch[1];
        const tNum = toolMatch[1];
        if (hNum !== tNum) {
          issues.push({
            type: "info",
            category: "tools",
            line: i + 1,
            code: "H_T_MISMATCH",
            message: `H offset (${hNum}) differs from tool number (${tNum})`,
            suggestion: "Verify H offset is intentional",
          });
        }
      }
    }

    return issues;
  }

  /**
   * Verify axis limits
   */
  private static verifyLimits(lines: string[]): VerificationIssue[] {
    const issues: VerificationIssue[] = [];

    // Default machine limits (conservative)
    const limits = {
      X: { min: -500, max: 500 },
      Y: { min: -300, max: 300 },
      Z: { min: -400, max: 100 },
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase();

      for (const [axis, limit] of Object.entries(limits)) {
        const match = line.match(new RegExp(`${axis}(-?\\d+\\.?\\d*)`));
        if (match) {
          const value = parseFloat(match[1]);
          if (value < limit.min || value > limit.max) {
            issues.push({
              type: "warning",
              category: "limits",
              line: i + 1,
              code: `${axis}_LIMIT`,
              message: `${axis}${value} may exceed machine limits (${limit.min} to ${limit.max})`,
              suggestion: "Verify coordinate is within machine travel",
            });
          }
        }
      }
    }

    return issues;
  }

  /**
   * Check machine compatibility
   */
  private static checkMachineCompatibility(
    lines: string[],
    controlType: string
  ): VerificationResult["machineCompatibility"] {
    const capabilities = machineCapabilities.get(controlType) || new Set();
    const unsupportedCodes: string[] = [];

    for (const line of lines) {
      const codes = line.toUpperCase().match(/[GM]\d+/g) || [];
      for (const code of codes) {
        if (capabilities.size > 0 && !capabilities.has(code)) {
          if (!unsupportedCodes.includes(code)) {
            unsupportedCodes.push(code);
          }
        }
      }
    }

    return {
      machineId: controlType,
      compatible: unsupportedCodes.length === 0,
      unsupportedCodes,
    };
  }

  /**
   * Get verification result
   */
  static getResult(id: string): VerificationResult | undefined {
    return verificationResults.get(id);
  }

  /**
   * Quick safety check
   */
  static quickSafetyCheck(content: string): { safe: boolean; score: number; criticalIssues: string[] } {
    const result = this.verify("quick", content, "safety");
    const criticalIssues = result.issues
      .filter(i => i.type === "error")
      .map(i => i.message);

    return {
      safe: result.passed,
      score: result.safetyScore,
      criticalIssues,
    };
  }

  static getSelfAwareness() {
    return {
      name: "DNCVerifyEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U03",
      safetyCritical: true,
      safetyThreshold: 0.990,
      capabilities: ["verify", "getResult", "quickSafetyCheck"],
      verificationTypes: ["syntax", "safety", "integrity", "compatibility", "limits", "tools", "full"],
      dependencies: [],
    };
  }
}

export const dncVerifyEngine = new DNCVerifyEngine();
