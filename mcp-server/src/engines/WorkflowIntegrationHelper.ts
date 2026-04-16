/**
 * WorkflowIntegrationHelper — Unified workflow template integration for all pipelines
 *
 * Provides:
 *   - Workflow suggestion for process type
 *   - Sequence validation against canonical templates
 *   - Gap analysis for operation lists
 *   - Quick reference lookups
 *
 * Used by:
 *   - PrintToProgramPipelineEngine (milling)
 *   - TurningPrintToProgramEngine (lathe)
 *   - WEDMPrintToProgramEngine (wire EDM)
 *   - MultiAxisPrintToProgramEngine (5-axis)
 *   - PostProcessorGeneratorEngine
 *   - LatheOrchestrationEngine
 *
 * @module engines/WorkflowIntegrationHelper
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type ProcessType =
  | "2d_milling"
  | "3d_milling"
  | "5axis_milling"
  | "turning"
  | "mill_turn"
  | "wire_edm"
  | "sinker_edm"
  | "grinding"
  | "die_design"
  | "mold_design"
  | "fixture_design";

export interface WorkflowStep {
  step_number: number;
  action: string;
  rationale?: string;
  optional?: boolean;
}

export interface WorkflowSuggestion {
  template_id: string;
  template_name: string;
  process_type: ProcessType;
  suggested_sequence: WorkflowStep[];
  quick_reference: string[];
  rationale: string;
  confidence: number;
  warnings: string[];
}

export interface GapAnalysis {
  template_id: string;
  provided_operations: string[];
  expected_steps: string[];
  missing_steps: string[];
  extra_steps: string[];
  out_of_order: string[];
  coverage_pct: number;
  recommendations: string[];
}

// ============================================================================
// LAZY-LOADED ENGINES
// ============================================================================

let _workflowEngine: any = null;

async function getWorkflowEngine(): Promise<any> {
  if (_workflowEngine) return _workflowEngine;

  try {
    const mod = await import("./WorkflowTemplateEngine.js");
    _workflowEngine = mod.workflowTemplateEngine;
    return _workflowEngine;
  } catch (err) {
    log.debug(`[WorkflowIntegration] WorkflowTemplateEngine not available: ${err}`);
    return null;
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get suggested workflow sequence for a process type.
 * Returns null if workflow templates are not available.
 */
export async function suggestWorkflow(
  processType: ProcessType,
  options?: { includeOptional?: boolean }
): Promise<WorkflowSuggestion | null> {
  const engine = await getWorkflowEngine();
  if (!engine) return null;

  try {
    const result = engine.suggestSequence({ process_type: processType });
    if (!result || result.suggested_sequence.length === 0) {
      return null;
    }

    return {
      template_id: result.template_id,
      template_name: result.template_name,
      process_type: result.process_type,
      suggested_sequence: options?.includeOptional
        ? result.suggested_sequence
        : result.suggested_sequence.filter((s: WorkflowStep) => !s.optional),
      quick_reference: result.quick_reference,
      rationale: result.rationale,
      confidence: result.confidence,
      warnings: result.warnings,
    };
  } catch (err) {
    log.warn(`[WorkflowIntegration] suggestWorkflow failed: ${err}`);
    return null;
  }
}

/**
 * Validate operations against canonical workflow template.
 * Returns null if workflow templates are not available.
 */
export async function validateSequence(
  processType: ProcessType,
  operations: string[]
): Promise<GapAnalysis | null> {
  const engine = await getWorkflowEngine();
  if (!engine) return null;

  try {
    const result = engine.analyzeGaps(processType, operations);
    return {
      template_id: result.template_id,
      provided_operations: result.provided_operations,
      expected_steps: result.expected_steps,
      missing_steps: result.missing_steps,
      extra_steps: result.extra_steps,
      out_of_order: result.out_of_order.map((o: any) => o.step),
      coverage_pct: result.coverage_pct,
      recommendations: result.recommendations,
    };
  } catch (err) {
    log.warn(`[WorkflowIntegration] validateSequence failed: ${err}`);
    return null;
  }
}

/**
 * Get quick reference sequence for a process type.
 */
export async function getQuickReference(processType: ProcessType): Promise<string[]> {
  const engine = await getWorkflowEngine();
  if (!engine) return [];

  try {
    return engine.getQuickReference(processType);
  } catch {
    return [];
  }
}

/**
 * Get order of operations guides for all processes.
 */
export async function getOrderOfOperationsGuides(): Promise<Array<{
  category: string;
  name: string;
  operations: string[];
  rationale: string;
}>> {
  const engine = await getWorkflowEngine();
  if (!engine) return [];

  try {
    return engine.getOrderOfOperations();
  } catch {
    return [];
  }
}

/**
 * Log workflow suggestion for a pipeline (fire-and-forget).
 * Use this for non-blocking validation during pipeline execution.
 */
export function logWorkflowValidation(
  processType: ProcessType,
  operations: string[],
  pipelineName: string
): void {
  validateSequence(processType, operations)
    .then((result) => {
      if (result) {
        if (result.coverage_pct < 70) {
          log.warn(
            `[${pipelineName}] Workflow coverage: ${result.coverage_pct}%. ` +
            `Missing: ${result.missing_steps.slice(0, 3).join(", ")}`
          );
        } else {
          log.debug(
            `[${pipelineName}] Workflow coverage: ${result.coverage_pct}%`
          );
        }
      }
    })
    .catch(() => {
      // Validation is optional, don't fail the pipeline
    });
}

// ============================================================================
// PROCESS TYPE MAPPINGS
// ============================================================================

/**
 * Infer process type from machine/operation context.
 */
export function inferProcessType(context: {
  machineType?: string;
  operations?: string[];
  features?: string[];
}): ProcessType {
  const { machineType, operations = [], features = [] } = context;
  const combined = [...operations, ...features, machineType || ""].join(" ").toLowerCase();

  // Check for specific process types
  if (combined.includes("wire") || combined.includes("wedm")) return "wire_edm";
  if (combined.includes("sinker") || combined.includes("sedm")) return "sinker_edm";
  if (combined.includes("grind")) return "grinding";
  if (combined.includes("mill") && combined.includes("turn")) return "mill_turn";
  if (combined.includes("turn") || combined.includes("lathe")) return "turning";
  if (combined.includes("5axis") || combined.includes("5-axis") || combined.includes("simultaneous")) return "5axis_milling";
  if (combined.includes("3d") || combined.includes("freeform") || combined.includes("surface")) return "3d_milling";
  if (combined.includes("die")) return "die_design";
  if (combined.includes("mold") || combined.includes("mould")) return "mold_design";
  if (combined.includes("fixture") || combined.includes("jig")) return "fixture_design";

  // Default to 2D milling
  return "2d_milling";
}

// ============================================================================
// EXPORT
// ============================================================================

export const workflowIntegration = {
  suggest: suggestWorkflow,
  validate: validateSequence,
  getQuickRef: getQuickReference,
  getOrderOfOps: getOrderOfOperationsGuides,
  logValidation: logWorkflowValidation,
  inferProcessType,
};
