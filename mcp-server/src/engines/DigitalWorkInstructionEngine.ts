/**
 * DigitalWorkInstructionEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Generates structured digital work instructions for CNC setup,
 * operation, and inspection. Replaces paper travelers with interactive,
 * step-by-step operator guidance with verification checkpoints.
 *
 * Actions: work_instruction_generate, work_instruction_validate, work_instruction_template
 */

// ============================================================================
// TYPES
// ============================================================================

export type StepType = "setup" | "operation" | "inspection" | "safety" | "tool_change" | "quality_check";

export interface WorkInstructionStep {
  step_number: number;
  type: StepType;
  title: string;
  description: string;
  estimated_time_min: number;
  requires_signoff: boolean;
  tools_required: string[];
  safety_notes: string[];
  acceptance_criteria?: string;
  image_ref?: string;
}

export interface WorkInstructionInput {
  part_number: string;
  operation_number: string;
  machine_id: string;
  material: string;
  raw_stock_description: string;
  operations: {
    type: StepType;
    description: string;
    tools: string[];
    time_min: number;
    critical: boolean;
  }[];
}

export interface WorkInstructionResult {
  instruction_id: string;
  part_number: string;
  revision: string;
  steps: WorkInstructionStep[];
  total_estimated_time_min: number;
  critical_steps: number;
  safety_steps: number;
  signoff_required_steps: number;
  recommendations: string[];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class DigitalWorkInstructionEngine {
  generate(input: WorkInstructionInput): WorkInstructionResult {
    const steps: WorkInstructionStep[] = [];
    let stepNum = 0;

    // Header step: safety and setup verification
    stepNum++;
    steps.push({
      step_number: stepNum,
      type: "safety",
      title: "Pre-Operation Safety Check",
      description: `Verify machine ${input.machine_id} is ready. Check guards, E-stop, coolant level. Confirm raw stock: ${input.raw_stock_description}.`,
      estimated_time_min: 3,
      requires_signoff: true,
      tools_required: ["Safety checklist"],
      safety_notes: ["Wear safety glasses", "Verify E-stop functionality", "Check coolant guard closed"],
    });

    // Setup step
    stepNum++;
    steps.push({
      step_number: stepNum,
      type: "setup",
      title: "Machine Setup",
      description: `Load program for ${input.part_number} Op ${input.operation_number}. Set work offsets. Load required tools.`,
      estimated_time_min: 15,
      requires_signoff: true,
      tools_required: ["Edge finder", "Tool presetter", "Dial indicator"],
      safety_notes: ["Verify tool offsets before first cut"],
    });

    // Operation steps
    for (const op of input.operations) {
      stepNum++;
      steps.push({
        step_number: stepNum,
        type: op.type,
        title: op.description.substring(0, 60),
        description: op.description,
        estimated_time_min: op.time_min,
        requires_signoff: op.critical,
        tools_required: op.tools,
        safety_notes: op.type === "tool_change" ? ["Verify spindle stopped before tool change"] : [],
        acceptance_criteria: op.critical ? "Inspect per drawing tolerance" : undefined,
      });
    }

    // Final inspection step
    stepNum++;
    steps.push({
      step_number: stepNum,
      type: "inspection",
      title: "Final Inspection",
      description: "Measure all critical dimensions per drawing. Record on inspection report.",
      estimated_time_min: 10,
      requires_signoff: true,
      tools_required: ["Micrometer", "Bore gauge", "Height gauge"],
      safety_notes: ["Deburr part before handling"],
      acceptance_criteria: "All dimensions within print tolerance",
    });

    const totalTime = steps.reduce((t, s) => t + s.estimated_time_min, 0);
    const criticalSteps = steps.filter(s => s.requires_signoff).length;
    const safetySteps = steps.filter(s => s.type === "safety" || s.safety_notes.length > 0).length;

    const recs: string[] = [];
    if (totalTime > 480) recs.push("Total time exceeds 8 hours — consider splitting into multiple operations");
    if (criticalSteps > steps.length * 0.5) recs.push("Many critical steps — ensure adequate QC staffing for signoffs");
    if (recs.length === 0) recs.push("Work instruction complete — ready for operator use");

    return {
      instruction_id: `WI-${input.part_number}-${input.operation_number}`,
      part_number: input.part_number,
      revision: "A",
      steps,
      total_estimated_time_min: totalTime,
      critical_steps: criticalSteps,
      safety_steps: safetySteps,
      signoff_required_steps: criticalSteps,
      recommendations: recs,
    };
  }
}

export const digitalWorkInstructionEngine = new DigitalWorkInstructionEngine();
