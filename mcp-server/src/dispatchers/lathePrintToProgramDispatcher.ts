/**
 * lathePrintToProgramDispatcher — Dispatcher for Print-to-Program Pipeline
 *
 * U-LTH40: Routes prism_lathe:print_* actions to P4 pipeline engines.
 *
 * Actions:
 *   - print_full: Complete pipeline (blueprint → G-code + setup sheet)
 *   - print_ingest: Blueprint ingest only
 *   - print_recognize: Feature recognition
 *   - print_plan: Toolpath planning
 *   - print_generate: Program generation
 *   - print_verify: Program verification
 *   - print_setup: Setup sheet generation
 *
 * @module dispatchers/lathePrintToProgramDispatcher
 */

import { z } from "zod";
import {
  lathePrintToProgramOrchestratorEngine,
  type PrintToProgramInput,
} from "../engines/LathePrintToProgramOrchestratorEngine.js";
import {
  lathePrintIngestPipelineEngine,
  type BlueprintIngestInput,
} from "../engines/LathePrintIngestPipelineEngine.js";
import { latheFeatureRecognitionEngine } from "../engines/LatheFeatureRecognitionEngine.js";
import {
  latheToolpathPlannerEngine,
  type ToolpathPlanningConfig,
} from "../engines/LatheToolpathPlannerEngine.js";
import {
  latheProgramGeneratorEngine,
  type ProgramGenerationConfig,
} from "../engines/LatheProgramGeneratorEngine.js";
import {
  latheProgramVerificationEngine,
  type MachineLimits,
} from "../engines/LatheProgramVerificationEngine.js";
import { latheSetupSheetGeneratorEngine } from "../engines/LatheSetupSheetGeneratorEngine.js";

// ============================================================================
// SCHEMAS
// ============================================================================

const BlueprintInputSchema = z.object({
  source_type: z.enum(["pdf", "image", "hybrid"]),
  file_path: z.string().optional(),
  image_base64: z.string().optional(),
  text_content: z.string().optional(),
  part_type: z.enum(["turning", "milling", "wire_edm", "general"]).optional(),
  expected_units: z.enum(["mm", "inch"]).optional(),
  customer: z.string().optional(),
  part_number: z.string().optional(),
});

const PlanningConfigSchema = z.object({
  max_depth_of_cut_mm: z.number().optional(),
  finishing_allowance_mm: z.number().optional(),
  rapid_rate_mmmin: z.number().optional(),
  default_feed_mmrev: z.number().optional(),
  default_surface_speed_mmin: z.number().optional(),
  tool_change_time_sec: z.number().optional(),
}).optional();

const FullPipelineSchema = z.object({
  blueprint: BlueprintInputSchema,
  program_number: z.number(),
  program_name: z.string(),
  controller: z.enum(["okuma_osp", "fanuc", "generic_iso"]).optional(),
  machine_id: z.string().optional(),
  planning: PlanningConfigSchema,
  include_line_numbers: z.boolean().optional(),
  include_comments: z.boolean().optional(),
  include_setup_sheet: z.boolean().optional(),
  include_verification: z.boolean().optional(),
});

const IngestSchema = BlueprintInputSchema;

const RecognizeSchema = z.object({
  intake_id: z.string().optional(),
  blueprint: BlueprintInputSchema.optional(),
});

const PlanSchema = z.object({
  recognition_id: z.string().optional(),
  blueprint: BlueprintInputSchema.optional(),
  config: PlanningConfigSchema,
});

const GenerateSchema = z.object({
  plan_id: z.string().optional(),
  blueprint: BlueprintInputSchema.optional(),
  controller: z.enum(["okuma_osp", "fanuc", "generic_iso"]).optional(),
  program_number: z.number(),
  program_name: z.string(),
  part_number: z.string().optional(),
  customer: z.string().optional(),
  machine_id: z.string().optional(),
  include_line_numbers: z.boolean().optional(),
  include_comments: z.boolean().optional(),
});

const VerifySchema = z.object({
  gcode: z.string(),
  limits: z.object({
    x_min_mm: z.number().optional(),
    x_max_mm: z.number().optional(),
    z_min_mm: z.number().optional(),
    z_max_mm: z.number().optional(),
    spindle_min_rpm: z.number().optional(),
    spindle_max_rpm: z.number().optional(),
    max_feed_mmmin: z.number().optional(),
    max_tools: z.number().optional(),
  }).optional(),
});

const SetupSchema = z.object({
  blueprint: BlueprintInputSchema,
  program_number: z.number(),
  program_name: z.string(),
  controller: z.enum(["okuma_osp", "fanuc", "generic_iso"]).optional(),
  machine_id: z.string().optional(),
  operator_name: z.string().optional(),
  include_html: z.boolean().optional(),
  include_safety: z.boolean().optional(),
  include_quality: z.boolean().optional(),
});

// ============================================================================
// ACTION ENUM
// ============================================================================

export const LathePrintToProgramAction = z.enum([
  "print_full",
  "print_ingest",
  "print_recognize",
  "print_plan",
  "print_generate",
  "print_verify",
  "print_setup",
]);

export type LathePrintToProgramActionType = z.infer<typeof LathePrintToProgramAction>;

// ============================================================================
// DISPATCHER
// ============================================================================

export interface LathePrintToProgramDispatchResult {
  success: boolean;
  action: string;
  data?: unknown;
  error?: string;
  execution_time_ms: number;
}

/**
 * Dispatch print-to-program action
 */
export async function dispatchLathePrintToProgram(
  action: LathePrintToProgramActionType,
  params: Record<string, unknown>
): Promise<LathePrintToProgramDispatchResult> {
  const startTime = Date.now();

  try {
    let data: unknown;

    switch (action) {
      case "print_full":
        data = await handlePrintFull(params);
        break;
      case "print_ingest":
        data = await handlePrintIngest(params);
        break;
      case "print_recognize":
        data = await handlePrintRecognize(params);
        break;
      case "print_plan":
        data = await handlePrintPlan(params);
        break;
      case "print_generate":
        data = await handlePrintGenerate(params);
        break;
      case "print_verify":
        data = handlePrintVerify(params);
        break;
      case "print_setup":
        data = await handlePrintSetup(params);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return {
      success: true,
      action,
      data,
      execution_time_ms: Date.now() - startTime
    };
  } catch (error) {
    return {
      success: false,
      action,
      error: error instanceof Error ? error.message : String(error),
      execution_time_ms: Date.now() - startTime
    };
  }
}

// ============================================================================
// ACTION HANDLERS
// ============================================================================

async function handlePrintFull(params: Record<string, unknown>) {
  const payload = FullPipelineSchema.parse(params);

  const input: PrintToProgramInput = {
    blueprint: payload.blueprint as BlueprintIngestInput,
    program_number: payload.program_number,
    program_name: payload.program_name,
    controller: payload.controller,
    machine_id: payload.machine_id,
    planning: payload.planning as ToolpathPlanningConfig | undefined,
    include_line_numbers: payload.include_line_numbers,
    include_comments: payload.include_comments,
  };

  const result = await lathePrintToProgramOrchestratorEngine.execute(input);

  // Add verification if requested
  let verification;
  if (payload.include_verification !== false && result.gcode) {
    verification = latheProgramVerificationEngine.verify(result.gcode);
  }

  // Add setup sheet if requested
  let setupSheet;
  if (payload.include_setup_sheet !== false && result.success) {
    setupSheet = latheSetupSheetGeneratorEngine.generate(
      result.program!,
      result.stages.planning.data!,
      result.stages.recognition.data!,
      result.stages.ingest.data!,
      { machine_id: payload.machine_id }
    );
  }

  return {
    ...result,
    verification,
    setup_sheet: setupSheet
  };
}

async function handlePrintIngest(params: Record<string, unknown>) {
  const payload = IngestSchema.parse(params);
  return lathePrintIngestPipelineEngine.ingest(payload as BlueprintIngestInput);
}

async function handlePrintRecognize(params: Record<string, unknown>) {
  const payload = RecognizeSchema.parse(params);

  // If blueprint provided, run ingest first
  if (payload.blueprint) {
    const intake = await lathePrintIngestPipelineEngine.ingest(
      payload.blueprint as BlueprintIngestInput
    );
    return latheFeatureRecognitionEngine.recognize(intake);
  }

  throw new Error("blueprint is required for recognition");
}

async function handlePrintPlan(params: Record<string, unknown>) {
  const payload = PlanSchema.parse(params);

  if (payload.blueprint) {
    const intake = await lathePrintIngestPipelineEngine.ingest(
      payload.blueprint as BlueprintIngestInput
    );
    const recognition = latheFeatureRecognitionEngine.recognize(intake);
    return latheToolpathPlannerEngine.plan(recognition, payload.config as ToolpathPlanningConfig);
  }

  throw new Error("blueprint is required for planning");
}

async function handlePrintGenerate(params: Record<string, unknown>) {
  const payload = GenerateSchema.parse(params);

  if (payload.blueprint) {
    const intake = await lathePrintIngestPipelineEngine.ingest(
      payload.blueprint as BlueprintIngestInput
    );
    const recognition = latheFeatureRecognitionEngine.recognize(intake);
    const plan = latheToolpathPlannerEngine.plan(recognition);

    const config: ProgramGenerationConfig = {
      controller: payload.controller || "okuma_osp",
      header: {
        program_number: payload.program_number,
        program_name: payload.program_name,
        part_number: payload.part_number,
        customer: payload.customer,
        machine_id: payload.machine_id,
      },
      include_line_numbers: payload.include_line_numbers,
      include_comments: payload.include_comments,
    };

    return latheProgramGeneratorEngine.generate(plan, config);
  }

  throw new Error("blueprint is required for generation");
}

function handlePrintVerify(params: Record<string, unknown>) {
  const payload = VerifySchema.parse(params);
  return latheProgramVerificationEngine.verify(payload.gcode, payload.limits as MachineLimits);
}

async function handlePrintSetup(params: Record<string, unknown>) {
  const payload = SetupSchema.parse(params);

  const intake = await lathePrintIngestPipelineEngine.ingest(
    payload.blueprint as BlueprintIngestInput
  );
  const recognition = latheFeatureRecognitionEngine.recognize(intake);
  const plan = latheToolpathPlannerEngine.plan(recognition);

  const config: ProgramGenerationConfig = {
    controller: payload.controller || "okuma_osp",
    header: {
      program_number: payload.program_number,
      program_name: payload.program_name,
      machine_id: payload.machine_id,
    },
  };

  const program = latheProgramGeneratorEngine.generate(plan, config);

  return latheSetupSheetGeneratorEngine.generate(
    program,
    plan,
    recognition,
    intake,
    {
      machine_id: payload.machine_id,
      operator_name: payload.operator_name,
      include_html: payload.include_html,
      include_safety: payload.include_safety,
      include_quality: payload.include_quality,
    }
  );
}

// ============================================================================
// EXPORT ACTION DEFINITIONS
// ============================================================================

export const LATHE_PRINT_TO_PROGRAM_DISPATCHER_ACTIONS = {
  print_full: {
    description: "Complete print-to-program pipeline with optional verification and setup sheet",
    schema: FullPipelineSchema,
  },
  print_ingest: {
    description: "Ingest blueprint and extract dimensions/GDT",
    schema: IngestSchema,
  },
  print_recognize: {
    description: "Recognize turning features from blueprint",
    schema: RecognizeSchema,
  },
  print_plan: {
    description: "Plan toolpaths from recognized features",
    schema: PlanSchema,
  },
  print_generate: {
    description: "Generate G-code program from toolpath plan",
    schema: GenerateSchema,
  },
  print_verify: {
    description: "Verify G-code program for safety and correctness",
    schema: VerifySchema,
  },
  print_setup: {
    description: "Generate setup sheet for program",
    schema: SetupSchema,
  },
};
