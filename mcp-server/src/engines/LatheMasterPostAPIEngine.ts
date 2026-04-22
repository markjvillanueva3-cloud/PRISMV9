/**
 * LatheMasterPostAPIEngine — LATHE-MASTER U-LTH30
 *
 * Unified API surface for lathe master post operations.
 * Wires together: Router, DeepReasoning, EnsembleCrossCheck, UnifiedOutput, SelfAwareness.
 *
 * Actions:
 *   route       — Route job to optimal sub-post
 *   emit        — Emit G-code from routed sub-post
 *   validate    — Validate program against machine/dialect
 *   explain     — Explain routing decision chain
 *   crossCheck  — Cross-check multiple sub-posts (ensemble)
 *   audit       — Audit master post selection history
 *
 * Exit Gate: Web UI can POST a job → master post → G-code + explanation; E2E test passes.
 *
 * @module LatheMasterPostAPIEngine
 * @version 1.0.0
 * @milestone LATHE-MASTER U-LTH30
 */

import { z } from "zod";
import { latheMasterPostRouterEngine } from "./LatheMasterPostRouterEngine.js";
import { LatheMasterPostDeepReasoningEngine } from "./LatheMasterPostDeepReasoningEngine.js";
import { LatheMasterPostEnsembleCrossCheckEngine } from "./LatheMasterPostEnsembleCrossCheckEngine.js";
import { LatheMasterPostUnifiedOutputEngine } from "./LatheMasterPostUnifiedOutputEngine.js";

// ── Types ───────────────────────────────────────────────────────────────────

export type Dialect = "okuma" | "fanuc" | "mitsubishi" | "haas" | "mazak" | "citizen" | "generic";
export type Operation = "turning" | "facing" | "grooving" | "threading" | "boring" | "drilling" | "parting" | "profiling" | "swiss" | "mill_turn";

export interface RouteInput {
  machineId: string;
  program: string;
  operation?: Operation;
  preferredDialect?: Dialect;
  requireCapabilities?: string[];
}

export interface RouteResult {
  success: boolean;
  selectedDialect: Dialect;
  selectedSubPost: string;
  machineId: string;
  capabilities: string[];
  confidence: number;
  alternativeDialects: Dialect[];
  routingTimeMs: number;
}

export interface EmitInput {
  machineId: string;
  program: string;
  operation?: Operation;
  dialect?: Dialect;
  includeHeader?: boolean;
  includeFooter?: boolean;
  lineNumbers?: boolean;
  lineNumberStart?: number;
  lineNumberIncrement?: number;
}

export interface EmitResult {
  success: boolean;
  gcode: string[];
  dialect: Dialect;
  blockCount: number;
  estimatedCycleTime: number;
  metadata: {
    machineId: string;
    generatedAt: string;
    checksum: string;
  };
}

export interface ValidateInput {
  machineId: string;
  program: string;
  dialect?: Dialect;
  strictMode?: boolean;
  checkEnvelope?: boolean;
  checkToolNumbers?: boolean;
  checkSpindleLimits?: boolean;
  checkFeedLimits?: boolean;
}

export interface ValidationIssue {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  line?: number;
  suggestion?: string;
}

export interface ValidateResult {
  success: boolean;
  valid: boolean;
  issues: ValidationIssue[];
  checkedRules: string[];
  dialect: Dialect;
  validationTimeMs: number;
}

export interface ExplainInput {
  machineId: string;
  program: string;
  operation?: Operation;
  verbosity?: "brief" | "normal" | "detailed";
  includeAlternatives?: boolean;
}

export interface ExplainResult {
  success: boolean;
  selectedDialect: Dialect;
  reasoning: string[];
  decisionChain: Array<{
    step: number;
    factor: string;
    decision: string;
    confidence: number;
  }>;
  alternatives?: Array<{
    dialect: Dialect;
    reason: string;
    confidence: number;
  }>;
  summary: string;
}

export interface CrossCheckInput {
  machineId: string;
  program: string;
  operation?: Operation;
  thresholds?: {
    blockCountPercent?: number;
    cycleTimePercent?: number;
    toolChangesPercent?: number;
  };
  includeGcode?: boolean;
}

export interface CrossCheckResult {
  success: boolean;
  candidateCount: number;
  hasCriticalDivergence: boolean;
  divergences: Array<{
    metric: string;
    baseline: number;
    compared: number;
    percentDiff: number;
    exceeds: boolean;
    severity: string;
  }>;
  recommendation: string;
  gcode?: Record<string, string[]>;
}

export interface AuditInput {
  machineId?: string;
  operation?: Operation;
  dialect?: Dialect;
  limit?: number;
  startDate?: string;
  endDate?: string;
  includeStatistics?: boolean;
}

export interface AuditRecord {
  timestamp: string;
  machineId: string;
  dialect: Dialect;
  operation?: string;
  success: boolean;
  executionTimeMs: number;
}

export interface AuditResult {
  success: boolean;
  records: AuditRecord[];
  statistics?: {
    totalRuns: number;
    successRate: number;
    avgExecutionTime: number;
    dialectDistribution: Record<string, number>;
    machineDistribution: Record<string, number>;
  };
}

// ── Zod Schemas ─────────────────────────────────────────────────────────────

const DialectSchema = z.enum(["okuma", "fanuc", "mitsubishi", "haas", "mazak", "citizen", "generic"]);
const OperationSchema = z.enum(["turning", "facing", "grooving", "threading", "boring", "drilling", "parting", "profiling", "swiss", "mill_turn"]);

export const RouteInputSchema = z.object({
  machineId: z.string().min(1),
  program: z.string().min(1),
  operation: OperationSchema.optional(),
  preferredDialect: DialectSchema.optional(),
  requireCapabilities: z.array(z.string()).optional(),
});

export const EmitInputSchema = z.object({
  machineId: z.string().min(1),
  program: z.string().min(1),
  operation: OperationSchema.optional(),
  dialect: DialectSchema.optional(),
  includeHeader: z.boolean().optional(),
  includeFooter: z.boolean().optional(),
  lineNumbers: z.boolean().optional(),
  lineNumberStart: z.number().int().positive().optional(),
  lineNumberIncrement: z.number().int().positive().optional(),
});

export const ValidateInputSchema = z.object({
  machineId: z.string().min(1),
  program: z.string().min(1),
  dialect: DialectSchema.optional(),
  strictMode: z.boolean().optional(),
  checkEnvelope: z.boolean().optional(),
  checkToolNumbers: z.boolean().optional(),
  checkSpindleLimits: z.boolean().optional(),
  checkFeedLimits: z.boolean().optional(),
});

export const ExplainInputSchema = z.object({
  machineId: z.string().min(1),
  program: z.string().min(1),
  operation: OperationSchema.optional(),
  verbosity: z.enum(["brief", "normal", "detailed"]).optional(),
  includeAlternatives: z.boolean().optional(),
});

export const CrossCheckInputSchema = z.object({
  machineId: z.string().min(1),
  program: z.string().min(1),
  operation: OperationSchema.optional(),
  thresholds: z.object({
    blockCountPercent: z.number().positive().optional(),
    cycleTimePercent: z.number().positive().optional(),
    toolChangesPercent: z.number().positive().optional(),
  }).optional(),
  includeGcode: z.boolean().optional(),
});

export const AuditInputSchema = z.object({
  machineId: z.string().optional(),
  operation: OperationSchema.optional(),
  dialect: DialectSchema.optional(),
  limit: z.number().int().positive().max(1000).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  includeStatistics: z.boolean().optional(),
});

// ── Engine Class ────────────────────────────────────────────────────────────

export class LatheMasterPostAPIEngine {
  private static auditLog: AuditRecord[] = [];

  /**
   * Get engine version.
   */
  static getVersion(): string {
    return "1.0.0";
  }

  /**
   * Route job to optimal sub-post.
   */
  static route(input: RouteInput): RouteResult {
    const startTime = Date.now();
    const validated = RouteInputSchema.safeParse(input);

    if (!validated.success) {
      return {
        success: false,
        selectedDialect: "generic",
        selectedSubPost: "none",
        machineId: input?.machineId ?? "unknown",
        capabilities: [],
        confidence: 0,
        alternativeDialects: [],
        routingTimeMs: Date.now() - startTime,
      };
    }

    const { machineId, program, operation, preferredDialect, requireCapabilities } = validated.data;

    // Use RouterEngine to find best sub-post
    const routeResult = latheMasterPostRouterEngine.route({
      machineId,
      program,
      operation: operation as any,
    });

    // Get candidates for alternatives
    const candidates = LatheMasterPostEnsembleCrossCheckEngine.findCandidates(machineId);
    const alternativeDialects = candidates
      .filter((c) => c.dialect !== routeResult.controllerFamily)
      .map((c) => c.dialect);

    const result: RouteResult = {
      success: routeResult.success,
      selectedDialect: (routeResult.controllerFamily as Dialect) ?? "generic",
      selectedSubPost: routeResult.metadata.subPostUsed ?? "generic-lathe",
      machineId,
      capabilities: [],
      confidence: routeResult.success ? 0.9 : 0.1,
      alternativeDialects,
      routingTimeMs: Date.now() - startTime,
    };

    this.recordAudit(machineId, result.selectedDialect, operation, result.success, result.routingTimeMs);
    return result;
  }

  /**
   * Emit G-code from routed sub-post.
   */
  static emit(input: EmitInput): EmitResult {
    const validated = EmitInputSchema.safeParse(input);

    if (!validated.success) {
      return {
        success: false,
        gcode: [],
        dialect: "generic",
        blockCount: 0,
        estimatedCycleTime: 0,
        metadata: {
          machineId: input?.machineId ?? "unknown",
          generatedAt: new Date().toISOString(),
          checksum: "",
        },
      };
    }

    const { machineId, program, dialect, includeHeader = true, includeFooter = true, lineNumbers = false, lineNumberStart = 10, lineNumberIncrement = 10 } = validated.data;

    // Route to get dialect if not specified
    const routedDialect = dialect ?? this.route({ machineId, program }).selectedDialect;

    // Generate unified output
    const outputResult = LatheMasterPostUnifiedOutputEngine.generateUnifiedOutput({
      dialect: routedDialect,
      metadata: {
        programNumber: "O0001",
        programName: "MASTERPOST-OUTPUT",
        machineName: machineId,
        controller: routedDialect,
        dialect: routedDialect,
        generatedAt: new Date().toISOString(),
        generator: "PRISM-LATHE-MASTER-POST-API",
        version: "1.0.0",
      },
      footerConfig: {
        dialect: routedDialect,
        includeReturnToHome: true,
        programEndCode: "M30",
      },
    });

    // Combine header + safe start + program + footer
    const gcode = [
      ...outputResult.header,
      ...outputResult.safeStartBlock,
      ...outputResult.modalResetBlock,
      ...program.split("\n"),
      ...outputResult.footer,
    ];

    // Apply line numbers if requested
    let finalGcode = gcode;
    if (lineNumbers) {
      finalGcode = gcode.map((line, i) => {
        const num = lineNumberStart + i * lineNumberIncrement;
        return `N${num} ${line}`;
      });
    }

    // Calculate block count and estimated cycle
    const blockCount = finalGcode.filter((l) => l.trim() && !l.startsWith("(") && !l.startsWith(";")).length;
    const estimatedCycleTime = Math.round(blockCount * 2.5);

    // Generate checksum
    const checksum = this.simpleChecksum(finalGcode.join("\n"));

    return {
      success: true,
      gcode: finalGcode,
      dialect: routedDialect,
      blockCount,
      estimatedCycleTime,
      metadata: {
        machineId,
        generatedAt: new Date().toISOString(),
        checksum,
      },
    };
  }

  /**
   * Validate program against machine/dialect.
   */
  static validate(input: ValidateInput): ValidateResult {
    const startTime = Date.now();
    const validated = ValidateInputSchema.safeParse(input);

    if (!validated.success) {
      return {
        success: false,
        valid: false,
        issues: [{ severity: "error", code: "INVALID_INPUT", message: "Invalid input parameters" }],
        checkedRules: [],
        dialect: "generic",
        validationTimeMs: Date.now() - startTime,
      };
    }

    const { machineId, program, dialect, strictMode = false, checkEnvelope = true, checkToolNumbers = true, checkSpindleLimits = true, checkFeedLimits = true } = validated.data;

    const resolvedDialect = dialect ?? this.route({ machineId, program }).selectedDialect;
    const issues: ValidationIssue[] = [];
    const checkedRules: string[] = [];
    const lines = program.split("\n");

    // Check tool numbers
    if (checkToolNumbers) {
      checkedRules.push("tool_numbers");
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/T(\d+)/);
        if (match) {
          const toolNum = parseInt(match[1], 10);
          if (toolNum > 99) {
            issues.push({
              severity: strictMode ? "error" : "warning",
              code: "TOOL_NUMBER_HIGH",
              message: `Tool number T${toolNum} exceeds typical range`,
              line: i + 1,
              suggestion: "Use tool numbers 1-99",
            });
          }
        }
      }
    }

    // Check spindle limits
    if (checkSpindleLimits) {
      checkedRules.push("spindle_limits");
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/S(\d+)/);
        if (match) {
          const rpm = parseInt(match[1], 10);
          if (rpm > 10000) {
            issues.push({
              severity: "warning",
              code: "SPINDLE_RPM_HIGH",
              message: `Spindle speed S${rpm} may exceed machine limits`,
              line: i + 1,
              suggestion: "Verify machine spindle capacity",
            });
          }
        }
      }
    }

    // Check feed limits
    if (checkFeedLimits) {
      checkedRules.push("feed_limits");
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/F([\d.]+)/);
        if (match) {
          const feed = parseFloat(match[1]);
          if (feed > 100) {
            issues.push({
              severity: "info",
              code: "FEED_HIGH",
              message: `Feed rate F${feed} is high for turning`,
              line: i + 1,
            });
          }
        }
      }
    }

    // Check work envelope (basic)
    if (checkEnvelope) {
      checkedRules.push("work_envelope");
      for (let i = 0; i < lines.length; i++) {
        const xMatch = lines[i].match(/X(-?[\d.]+)/);
        if (xMatch) {
          const x = parseFloat(xMatch[1]);
          if (Math.abs(x) > 500) {
            issues.push({
              severity: "warning",
              code: "ENVELOPE_X",
              message: `X position ${x} may exceed work envelope`,
              line: i + 1,
            });
          }
        }
      }
    }

    // Check dialect-specific codes
    checkedRules.push("dialect_codes");
    if (resolvedDialect === "okuma") {
      if (program.includes("G28") && strictMode) {
        issues.push({
          severity: "info",
          code: "OKUMA_PREFERENCE",
          message: "Okuma prefers G30 over G28 for reference return",
          suggestion: "Consider using G30 for Okuma",
        });
      }
    }

    const valid = issues.filter((i) => i.severity === "error").length === 0;

    return {
      success: true,
      valid,
      issues,
      checkedRules,
      dialect: resolvedDialect,
      validationTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Explain routing decision chain.
   */
  static explain(input: ExplainInput): ExplainResult {
    const validated = ExplainInputSchema.safeParse(input);

    if (!validated.success) {
      return {
        success: false,
        selectedDialect: "generic",
        reasoning: ["Invalid input"],
        decisionChain: [],
        summary: "Failed to explain due to invalid input",
      };
    }

    const { machineId, program, operation, verbosity = "normal", includeAlternatives = false } = validated.data;

    // Use DeepReasoningEngine to explain
    const deepResult = LatheMasterPostDeepReasoningEngine.explainSelection({
      machineId,
      program,
      operation,
    });

    const decisionChain = deepResult.trace.steps.map((step, i) => ({
      step: i + 1,
      factor: step.title,
      decision: step.conclusion,
      confidence: step.confidence,
    }));

    let alternatives: ExplainResult["alternatives"];
    if (includeAlternatives) {
      const candidates = LatheMasterPostEnsembleCrossCheckEngine.findCandidates(machineId);
      alternatives = candidates
        .filter((c) => c.dialect !== deepResult.trace.selectedDialect)
        .map((c) => ({
          dialect: c.dialect as Dialect,
          reason: `Alternative dialect with priority ${c.priority}`,
          confidence: 1 - c.priority * 0.1,
        }));
    }

    const reasoning = verbosity === "brief"
      ? [deepResult.trace.summary]
      : verbosity === "detailed"
        ? deepResult.trace.steps.map((s) => `${s.title}: ${s.conclusion}`)
        : [deepResult.trace.summary, ...decisionChain.slice(0, 3).map((s) => s.decision)];

    return {
      success: deepResult.success,
      selectedDialect: (deepResult.trace.selectedDialect as Dialect) || "generic",
      reasoning,
      decisionChain,
      alternatives,
      summary: deepResult.trace.summary,
    };
  }

  /**
   * Cross-check multiple sub-posts via ensemble.
   */
  static crossCheck(input: CrossCheckInput): CrossCheckResult {
    const validated = CrossCheckInputSchema.safeParse(input);

    if (!validated.success) {
      return {
        success: false,
        candidateCount: 0,
        hasCriticalDivergence: false,
        divergences: [],
        recommendation: "Invalid input",
      };
    }

    const { machineId, program, operation, thresholds, includeGcode = false } = validated.data;

    const ensembleResult = LatheMasterPostEnsembleCrossCheckEngine.runEnsemble({
      machineId,
      program,
      operation,
      thresholds,
    });

    const divergences = ensembleResult.divergences.map((d) => ({
      metric: d.metric,
      baseline: d.baseline,
      compared: d.compared,
      percentDiff: d.percentDiff,
      exceeds: d.exceeds,
      severity: d.severity,
    }));

    let gcode: Record<string, string[]> | undefined;
    if (includeGcode && ensembleResult.outputs.length > 0) {
      gcode = {};
      for (const output of ensembleResult.outputs) {
        gcode[output.subPostId] = output.gcode;
      }
    }

    return {
      success: ensembleResult.success,
      candidateCount: ensembleResult.candidateCount,
      hasCriticalDivergence: ensembleResult.hasCriticalDivergence,
      divergences,
      recommendation: ensembleResult.recommendation,
      gcode,
    };
  }

  /**
   * Audit master post selection history.
   */
  static audit(input: AuditInput): AuditResult {
    const validated = AuditInputSchema.safeParse(input);

    if (!validated.success) {
      return {
        success: false,
        records: [],
      };
    }

    const { machineId, operation, dialect, limit = 100, startDate, endDate, includeStatistics = true } = validated.data;

    let records = [...this.auditLog];

    // Apply filters
    if (machineId) {
      records = records.filter((r) => r.machineId === machineId);
    }
    if (operation) {
      records = records.filter((r) => r.operation === operation);
    }
    if (dialect) {
      records = records.filter((r) => r.dialect === dialect);
    }
    if (startDate) {
      records = records.filter((r) => r.timestamp >= startDate);
    }
    if (endDate) {
      records = records.filter((r) => r.timestamp <= endDate);
    }

    records = records.slice(-limit);

    let statistics: AuditResult["statistics"];
    if (includeStatistics && records.length > 0) {
      const dialectDist: Record<string, number> = {};
      const machineDist: Record<string, number> = {};
      let successCount = 0;
      let totalTime = 0;

      for (const record of records) {
        if (record.success) successCount++;
        totalTime += record.executionTimeMs;
        dialectDist[record.dialect] = (dialectDist[record.dialect] ?? 0) + 1;
        machineDist[record.machineId] = (machineDist[record.machineId] ?? 0) + 1;
      }

      statistics = {
        totalRuns: records.length,
        successRate: successCount / records.length,
        avgExecutionTime: totalTime / records.length,
        dialectDistribution: dialectDist,
        machineDistribution: machineDist,
      };
    }

    return {
      success: true,
      records,
      statistics,
    };
  }

  /**
   * Clear audit history.
   */
  static clearAuditLog(): void {
    this.auditLog = [];
  }

  /**
   * Get audit log size.
   */
  static getAuditLogSize(): number {
    return this.auditLog.length;
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  private static recordAudit(
    machineId: string,
    dialect: Dialect,
    operation: Operation | undefined,
    success: boolean,
    executionTimeMs: number,
  ): void {
    this.auditLog.push({
      timestamp: new Date().toISOString(),
      machineId,
      dialect,
      operation,
      success,
      executionTimeMs,
    });

    // Keep audit log bounded
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-5000);
    }
  }

  private static simpleChecksum(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, "0");
  }
}

export const latheMasterPostAPIEngine = LatheMasterPostAPIEngine;
