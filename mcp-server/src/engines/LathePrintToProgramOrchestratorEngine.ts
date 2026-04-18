/**
 * LathePrintToProgramOrchestratorEngine — End-to-End Print-to-Program Pipeline
 *
 * U-LTH37: Orchestrates the complete pipeline from blueprint to G-code:
 *   [Blueprint] → [Ingest] → [Feature Recognition] → [Toolpath Planning] → [Program Generation]
 *
 * Single entry point for automated lathe program generation from 2D prints.
 *
 * @module LathePrintToProgramOrchestratorEngine
 */

import {
  lathePrintIngestPipelineEngine,
  type BlueprintIngestInput,
  type BlueprintIntake,
} from "./LathePrintIngestPipelineEngine.js";
import {
  latheFeatureRecognitionEngine,
  type FeatureRecognitionResult,
} from "./LatheFeatureRecognitionEngine.js";
import {
  latheToolpathPlannerEngine,
  type ToolpathPlan,
  type ToolpathPlanningConfig,
} from "./LatheToolpathPlannerEngine.js";
import {
  latheProgramGeneratorEngine,
  type ProgramGenerationConfig,
  type GeneratedProgram,
  type ControllerFormat,
  type ProgramHeader,
} from "./LatheProgramGeneratorEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Pipeline input configuration */
export interface PrintToProgramInput {
  // Blueprint source
  blueprint: BlueprintIngestInput;

  // Program configuration
  program_number: number;
  program_name: string;
  controller?: ControllerFormat;
  machine_id?: string;

  // Planning options
  planning?: Partial<ToolpathPlanningConfig>;

  // Generation options
  include_line_numbers?: boolean;
  include_comments?: boolean;
}

/** Pipeline stage result */
export interface PipelineStageResult<T> {
  stage: string;
  success: boolean;
  data?: T;
  error?: string;
  processing_time_ms: number;
}

/** Complete pipeline result */
export interface PrintToProgramResult {
  pipeline_id: string;
  total_processing_time_ms: number;
  success: boolean;

  // Stage results
  stages: {
    ingest: PipelineStageResult<BlueprintIntake>;
    recognition: PipelineStageResult<FeatureRecognitionResult>;
    planning: PipelineStageResult<ToolpathPlan>;
    generation: PipelineStageResult<GeneratedProgram>;
  };

  // Final output (if successful)
  gcode?: string;
  program?: GeneratedProgram;

  // Summary
  summary: {
    features_recognized: number;
    toolpath_segments: number;
    tool_changes: number;
    estimated_cycle_time_sec: number;
    program_line_count: number;
  };

  // Validation
  warnings: string[];
  errors: string[];
}

/** Pipeline options */
export interface PipelineOptions {
  stop_on_warning?: boolean;
  validate_intermediate?: boolean;
  verbose?: boolean;
}

// ============================================================================
// ENGINE
// ============================================================================

class LathePrintToProgramOrchestratorEngine {
  private pipelineCounter = 0;

  /**
   * Execute complete print-to-program pipeline
   */
  async execute(
    input: PrintToProgramInput,
    options: PipelineOptions = {}
  ): Promise<PrintToProgramResult> {
    const startTime = Date.now();
    const pipelineId = `pipeline_${++this.pipelineCounter}_${Date.now()}`;

    const allWarnings: string[] = [];
    const allErrors: string[] = [];

    // Stage 1: Ingest
    const ingestResult = await this.runIngestStage(input.blueprint);
    if (!ingestResult.success) {
      return this.buildFailedResult(pipelineId, startTime, "ingest", ingestResult, allErrors);
    }
    allWarnings.push(...(ingestResult.data?.extraction_quality.warnings || []));

    // Stage 2: Feature Recognition
    const recognitionResult = this.runRecognitionStage(ingestResult.data!);
    if (!recognitionResult.success) {
      return this.buildFailedResult(pipelineId, startTime, "recognition", recognitionResult, allErrors);
    }
    allWarnings.push(...(recognitionResult.data?.warnings || []));

    if (options.stop_on_warning && recognitionResult.data?.warnings.length) {
      allErrors.push("Pipeline stopped on warnings during recognition");
      return this.buildFailedResult(pipelineId, startTime, "recognition", recognitionResult, allErrors);
    }

    // Stage 3: Toolpath Planning
    const planningResult = this.runPlanningStage(recognitionResult.data!, input.planning);
    if (!planningResult.success) {
      return this.buildFailedResult(pipelineId, startTime, "planning", planningResult, allErrors);
    }
    allWarnings.push(...(planningResult.data?.warnings || []));
    allWarnings.push(...(planningResult.data?.optimization_opportunities || []));

    // Stage 4: Program Generation
    const genConfig = this.buildGenerationConfig(input, ingestResult.data!);
    const generationResult = this.runGenerationStage(planningResult.data!, genConfig);
    if (!generationResult.success) {
      return this.buildFailedResult(pipelineId, startTime, "generation", generationResult, allErrors);
    }
    allWarnings.push(...(generationResult.data?.warnings || []));

    // Build successful result
    const program = generationResult.data!;

    return {
      pipeline_id: pipelineId,
      total_processing_time_ms: Date.now() - startTime,
      success: true,

      stages: {
        ingest: ingestResult,
        recognition: recognitionResult,
        planning: planningResult,
        generation: generationResult
      },

      gcode: program.gcode,
      program,

      summary: {
        features_recognized: recognitionResult.data!.summary.total_features,
        toolpath_segments: planningResult.data!.total_segments,
        tool_changes: planningResult.data!.total_tool_changes,
        estimated_cycle_time_sec: planningResult.data!.total_cycle_time_sec,
        program_line_count: program.line_count
      },

      warnings: allWarnings,
      errors: allErrors
    };
  }

  /**
   * Execute pipeline with progress callback
   */
  async executeWithProgress(
    input: PrintToProgramInput,
    onProgress: (stage: string, progress: number, message: string) => void
  ): Promise<PrintToProgramResult> {
    onProgress("ingest", 0, "Starting blueprint ingest...");

    const ingestResult = await this.runIngestStage(input.blueprint);
    if (!ingestResult.success) {
      onProgress("ingest", 100, "Ingest failed");
      return this.execute(input);
    }
    onProgress("ingest", 100, `Extracted ${ingestResult.data!.dimensions.length} dimensions`);

    onProgress("recognition", 0, "Recognizing features...");
    const recognitionResult = this.runRecognitionStage(ingestResult.data!);
    onProgress("recognition", 100, `Recognized ${recognitionResult.data?.summary.total_features || 0} features`);

    onProgress("planning", 0, "Planning toolpaths...");
    const planningResult = this.runPlanningStage(recognitionResult.data!, input.planning);
    onProgress("planning", 100, `Planned ${planningResult.data?.total_segments || 0} segments`);

    onProgress("generation", 0, "Generating G-code...");
    const genConfig = this.buildGenerationConfig(input, ingestResult.data!);
    const generationResult = this.runGenerationStage(planningResult.data!, genConfig);
    onProgress("generation", 100, `Generated ${generationResult.data?.line_count || 0} lines`);

    return this.execute(input);
  }

  /**
   * Get pipeline statistics
   */
  getStatistics(): {
    total_pipelines: number;
    supported_controllers: ControllerFormat[];
    pipeline_stages: string[];
  } {
    return {
      total_pipelines: this.pipelineCounter,
      supported_controllers: ["okuma_osp", "fanuc", "generic_iso"],
      pipeline_stages: ["ingest", "recognition", "planning", "generation"]
    };
  }

  /**
   * Validate input before pipeline execution
   */
  validateInput(input: PrintToProgramInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input.blueprint) {
      errors.push("Blueprint input is required");
    }

    if (!input.program_number || input.program_number < 1) {
      errors.push("Valid program number is required");
    }

    if (!input.program_name || input.program_name.trim().length === 0) {
      errors.push("Program name is required");
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // ── Private Stage Methods ────────────────────────────────────────────────

  private async runIngestStage(
    input: BlueprintIngestInput
  ): Promise<PipelineStageResult<BlueprintIntake>> {
    const startTime = Date.now();

    try {
      const data = await lathePrintIngestPipelineEngine.ingest(input);

      return {
        stage: "ingest",
        success: true,
        data,
        processing_time_ms: Date.now() - startTime
      };
    } catch (error) {
      return {
        stage: "ingest",
        success: false,
        error: error instanceof Error ? error.message : String(error),
        processing_time_ms: Date.now() - startTime
      };
    }
  }

  private runRecognitionStage(
    intake: BlueprintIntake
  ): PipelineStageResult<FeatureRecognitionResult> {
    const startTime = Date.now();

    try {
      const data = latheFeatureRecognitionEngine.recognize(intake);

      return {
        stage: "recognition",
        success: true,
        data,
        processing_time_ms: Date.now() - startTime
      };
    } catch (error) {
      return {
        stage: "recognition",
        success: false,
        error: error instanceof Error ? error.message : String(error),
        processing_time_ms: Date.now() - startTime
      };
    }
  }

  private runPlanningStage(
    recognition: FeatureRecognitionResult,
    config?: Partial<ToolpathPlanningConfig>
  ): PipelineStageResult<ToolpathPlan> {
    const startTime = Date.now();

    try {
      const data = latheToolpathPlannerEngine.plan(recognition, config);

      return {
        stage: "planning",
        success: true,
        data,
        processing_time_ms: Date.now() - startTime
      };
    } catch (error) {
      return {
        stage: "planning",
        success: false,
        error: error instanceof Error ? error.message : String(error),
        processing_time_ms: Date.now() - startTime
      };
    }
  }

  private runGenerationStage(
    plan: ToolpathPlan,
    config: ProgramGenerationConfig
  ): PipelineStageResult<GeneratedProgram> {
    const startTime = Date.now();

    try {
      const data = latheProgramGeneratorEngine.generate(plan, config);

      return {
        stage: "generation",
        success: true,
        data,
        processing_time_ms: Date.now() - startTime
      };
    } catch (error) {
      return {
        stage: "generation",
        success: false,
        error: error instanceof Error ? error.message : String(error),
        processing_time_ms: Date.now() - startTime
      };
    }
  }

  // ── Private Helper Methods ───────────────────────────────────────────────

  private buildGenerationConfig(
    input: PrintToProgramInput,
    intake: BlueprintIntake
  ): ProgramGenerationConfig {
    const header: ProgramHeader = {
      program_number: input.program_number,
      program_name: input.program_name,
      part_number: intake.part_info.part_number,
      customer: intake.part_info.customer,
      material: intake.part_info.material,
      revision: intake.part_info.revision,
      machine_id: input.machine_id
    };

    return {
      controller: input.controller || "okuma_osp",
      header,
      include_line_numbers: input.include_line_numbers ?? true,
      include_comments: input.include_comments ?? true
    };
  }

  private buildFailedResult(
    pipelineId: string,
    startTime: number,
    failedStage: string,
    stageResult: PipelineStageResult<unknown>,
    errors: string[]
  ): PrintToProgramResult {
    errors.push(`Pipeline failed at stage: ${failedStage}`);
    if (stageResult.error) {
      errors.push(stageResult.error);
    }

    return {
      pipeline_id: pipelineId,
      total_processing_time_ms: Date.now() - startTime,
      success: false,

      stages: {
        ingest: failedStage === "ingest" ? stageResult as PipelineStageResult<BlueprintIntake> : { stage: "ingest", success: false, processing_time_ms: 0 },
        recognition: failedStage === "recognition" ? stageResult as PipelineStageResult<FeatureRecognitionResult> : { stage: "recognition", success: false, processing_time_ms: 0 },
        planning: failedStage === "planning" ? stageResult as PipelineStageResult<ToolpathPlan> : { stage: "planning", success: false, processing_time_ms: 0 },
        generation: failedStage === "generation" ? stageResult as PipelineStageResult<GeneratedProgram> : { stage: "generation", success: false, processing_time_ms: 0 }
      },

      summary: {
        features_recognized: 0,
        toolpath_segments: 0,
        tool_changes: 0,
        estimated_cycle_time_sec: 0,
        program_line_count: 0
      },

      warnings: [],
      errors
    };
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const lathePrintToProgramOrchestratorEngine = new LathePrintToProgramOrchestratorEngine();
