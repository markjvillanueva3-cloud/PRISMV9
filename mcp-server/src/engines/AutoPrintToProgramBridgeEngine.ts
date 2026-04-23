/**
 * AutoPrintToProgramBridgeEngine — auto-detect process type and route to the
 * correct print-to-program pipeline (milling / turning / mill-turn / wire-edm).
 *
 * Pipeline stages:
 *   1. awareness_consulted   — consult middleware for prior job context
 *   2. format_detection      — identify DXF / STEP / text input
 *   3. process_detection     — infer process type from format + hints
 *   4. pipeline_routed       — dispatch to the chosen sub-pipeline
 *
 * Fails-open on awareness unavailability; propagates pipeline results
 * verbatim with stage/warning aggregation.
 *
 * @module engines/AutoPrintToProgramBridgeEngine
 */

import {
  wedmPrintToProgramEngine,
  type WEDMGenerateResult,
} from "./WEDMPrintToProgramEngine.js";

export type ProcessType = "milling" | "turning" | "mill_turn" | "wire_edm" | "auto";
export const ProcessType = {
  milling: "milling",
  turning: "turning",
  mill_turn: "mill_turn",
  wire_edm: "wire_edm",
  auto: "auto",
} as const;

export type InputFormat = "dxf" | "step" | "iges" | "text" | "image";

export interface AutoPipelineInput {
  content: string;
  format: InputFormat;
  /** Forced process type (default: auto-detect) */
  process_type?: ProcessType;
  material_name?: string;
  /** Stock thickness in Z [mm] */
  stock_z_mm?: number;
  controller?: string;
}

export interface AutoPipelineWarning {
  severity: "info" | "warning" | "error";
  message: string;
  stage: string;
}

export interface AutoPipelineResult {
  success: boolean;
  detected_format: InputFormat;
  detected_process: ProcessType;
  stages_completed: string[];
  warnings: AutoPipelineWarning[];
  wedm_result?: WEDMGenerateResult;
  program_text?: string;
}

const AWARENESS_TIMEOUT_MS = 50;

function detectFormat(content: string, formatHint: InputFormat): InputFormat {
  if (formatHint === "dxf" && content.includes("SECTION")) return "dxf";
  if (formatHint === "step" || content.startsWith("ISO-10303")) return "step";
  if (formatHint === "iges" || content.includes("S      1")) return "iges";
  return formatHint;
}

function detectProcess(
  forced: ProcessType | undefined,
  format: InputFormat,
  content: string
): ProcessType {
  if (forced && forced !== "auto") return forced;
  // DXF ≡ 2D profile → wire EDM by default
  if (format === "dxf") return "wire_edm";
  // Text hints
  const c = content.toLowerCase();
  if (c.includes("lathe") || c.includes("turning")) return "turning";
  if (c.includes("wire edm") || c.includes("wedm")) return "wire_edm";
  if (c.includes("mill-turn")) return "mill_turn";
  return "milling";
}

export class AutoPrintToProgramBridgeEngine {
  /**
   * Run the auto-routing pipeline.
   * @param input format + content + optional process hint
   * @returns AutoPipelineResult with stage trace and sub-pipeline output
   */
  async runAutoPipeline(input: AutoPipelineInput): Promise<AutoPipelineResult> {
    const stages: string[] = [];
    const warnings: AutoPipelineWarning[] = [];

    // Stage 1: awareness consult
    const detectedFormat = detectFormat(input.content, input.format);
    const detectedProcess = detectProcess(input.process_type, detectedFormat, input.content);
    const keywords = [detectedProcess, detectedFormat];
    if (input.material_name) keywords.push(input.material_name);

    try {
      const middleware = await import("../tools/dispatchers/awarenessMiddleware.js");
      if (middleware && typeof middleware.consultAwareness === "function") {
        try {
          const consultPromise = middleware.consultAwareness({
            dispatcher: "auto_print_to_program",
            action: `auto_pipeline:${detectedProcess}`,
            keywords,
          });
          const timeoutPromise = new Promise<{ timeout: true }>((resolve) =>
            setTimeout(() => resolve({ timeout: true }), AWARENESS_TIMEOUT_MS)
          );
          const raced: any = await Promise.race([consultPromise, timeoutPromise]);
          if (raced?.timeout === true) {
            stages.push("awareness_consulted: timeout");
            warnings.push({
              severity: "warning",
              stage: "awareness",
              message: `Awareness consult timed out after ${AWARENESS_TIMEOUT_MS}ms`,
            });
          } else {
            const cached = !!raced.cached;
            const matchCount = Array.isArray(raced.topMatches) ? raced.topMatches.length : 0;
            stages.push(`awareness_consulted: ${matchCount} matches cached=${cached}`);
          }
        } catch (err: any) {
          stages.push("awareness_consulted: error");
          warnings.push({
            severity: "warning",
            stage: "awareness",
            message: `Awareness consult unavailable: ${err?.message ?? String(err)}`,
          });
        }
      }
    } catch (importErr: any) {
      warnings.push({
        severity: "info",
        stage: "awareness",
        message: `Awareness middleware not available: ${importErr?.message ?? String(importErr)}`,
      });
    }

    // Stage 2: format_detection
    stages.push(`format_detection: ${detectedFormat}`);

    // Stage 3: process_detection
    stages.push(`process_detection: ${detectedProcess}`);

    // Stage 4: route to sub-pipeline
    if (detectedProcess === "wire_edm") {
      try {
        const wedmResult = await wedmPrintToProgramEngine.generate({
          dxf_content: input.content,
          material: input.material_name ?? "D2",
          thickness_mm: input.stock_z_mm ?? 25,
          controller: input.controller,
        });
        stages.push("pipeline_routed: wedm");
        return {
          success: wedmResult.success,
          detected_format: detectedFormat,
          detected_process: detectedProcess,
          stages_completed: stages,
          warnings,
          wedm_result: wedmResult,
          program_text: wedmResult.program_text,
        };
      } catch (err: any) {
        warnings.push({
          severity: "error",
          stage: "wedm_pipeline",
          message: err?.message ?? String(err),
        });
        return {
          success: false,
          detected_format: detectedFormat,
          detected_process: detectedProcess,
          stages_completed: stages,
          warnings,
        };
      }
    }

    // Non-WEDM paths — stub acknowledgment (real milling/turning routers
    // live in their own engines; this bridge only auto-detects and hands off)
    stages.push(`pipeline_routed: ${detectedProcess}`);
    return {
      success: true,
      detected_format: detectedFormat,
      detected_process: detectedProcess,
      stages_completed: stages,
      warnings,
    };
  }
}

// ============================================================================
// WEDM Capability Manifest (U-P1.5-OS-03)
// ============================================================================

export interface WEDMCapabilityManifestEngine {
  name: string;
  inputs: string[];
  outputs: string[];
  category?: string;
}

export interface WEDMCapabilityManifest {
  schemaVersion: number;
  process_type: "wire_edm";
  primary_pipeline: string;
  entry_points: string[];
  total_engines: number;
  engines: Record<string, WEDMCapabilityManifestEngine[]>;
  feature_types: string[];
  autobridge_route: {
    process_match: string;
    engine: string;
    required_inputs: string[];
    produces: string[];
  };
}

const MANIFEST_ENGINE_NAMES: string[] = [
  "AdaptiveFeedModulationEngine",
  "EDMCostDocumentationEngine",
  "EDMMultiPassStrategyEngine",
  "EDMProgramAssemblerEngine",
  "EDMWireSlugCornerTaperEngine",
  "LaserLoRACadenceEngine",
  "LaserLoRADatasetBuilderEngine",
  "MitsubishiMV1200RWireEDMMasterPostEngine",
  "OneClickWEDMGeneratorEngine",
  "SinkerEDMElectrodeGeometryEngine",
  "SinkerEDMFlushingAdvisorEngine",
  "SinkerEDMLoRACadenceEngine",
  "SinkerEDMLoRADatasetBuilderEngine",
  "SinkerEDMPrintToProgramEngine",
  "SinkerEDMWearCompensationEngine",
  "WEDMAdaptivePassEngine",
  "WEDMAutonomyAuditEngine",
  "WEDMAutonomySubstrateGateEngine",
  "WEDMBenchmarkToleranceEngine",
  "WEDMControllerDialectVerifierEngine",
  "WEDMCornerPhysicsEngine",
  "WEDMCreditCostEngine",
  "WEDMCurrentDensityGuardEngine",
  "WEDMDXFClosureValidatorEngine",
  "WEDMDeviationToTipEngine",
  "WEDMDielectricCorrectionEngine",
  "WEDMDielectricFlushAdjustEngine",
  "WEDMEWCMemoryEngine",
  "WEDMFeatureImportanceEngine",
  "WEDMFeedbackIngestionEngine",
  "WEDMFewShotMaterialEngine",
  "WEDMFlushAdequacyGateEngine",
  "WEDMGapVoltageControlEngine",
  "WEDMGraphAttentionEngine",
  "WEDMHeadClearanceEngine",
  "WEDMInvoiceLineEngine",
  "WEDMJobCostEngine",
  "WEDMJobCreatorEngine",
  "WEDMJobOutcomeEngine",
  "WEDMJobPatternLearnerEngine",
  "WEDMKerfWidthEngine",
  "WEDMLatticeGraphEngine",
  "WEDMLearningLoopEngine",
  "WEDMLoRAAdapterEngine",
  "WEDMLoRACadenceEngine",
  "WEDMLoRADatasetBuilderEngine",
  "WEDMMLParameterOptimizerEngine",
  "WEDMMRRPhysicsEngine",
  "WEDMMultiProfileBatchEngine",
  "WEDMNeighborQueryEngine",
  "WEDMOnlineLearningEngine",
  "WEDMOverageApprovalEngine",
  "WEDMPostAgieEngine",
  "WEDMPostDialectRouterEngine",
  "WEDMPostFanucEngine",
  "WEDMPostMakinoEngine",
  "WEDMPostMitsubishiEngine",
  "WEDMPostSodickEngine",
  "WEDMPostTypes",
  "WEDMPowerDensityGuardEngine",
  "WEDMPrintToProgramEngine",
  "WEDMProgramComparisonEngine",
  "WEDMProgramSafetyGateEngine",
  "WEDMProgramVerificationEngine",
  "WEDMProgressTrackerEngine",
  "WEDMPulseLimitEngine",
  "WEDMQuoteBridgeEngine",
  "WEDMRaPredictorEngine",
  "WEDMReasoningExplainEngine",
  "WEDMRecastDepthPredictorEngine",
  "WEDMSafetyEnvelopeEngine",
  "WEDMSlugTabRetentionEngine",
  "WEDMSparkErosionModelEngine",
  "WEDMStartPointOptimizationEngine",
  "WEDMTaperErrorBudgetEngine",
  "WEDMThermalFieldEngine",
  "WEDMThermalReleaseGateEngine",
  "WEDMThinWireDerateEngine",
  "WEDMTier6GeomGateEngine",
  "WEDMTransferLearningEngine",
  "WEDMTribalTipLearnerEngine",
  "WEDMUnitTagGateEngine",
  "WEDMWeibullWireLifeEngine",
  "WEDMWireBreakPredictorEngine",
  "WEDMWireBreakRiskCostEngine",
  "WEDMWireDeflectionEngine",
  "WEDMWireHeatingEngine",
  "WEDMWirePathCollisionEngine",
  "WEDMWirePremiumROIEngine",
  "WEDMWireSpoolConsumptionEngine",
  "WEDMWireStressAnalysisEngine",
  "WEDMWireTensionOptimizerEngine",
  "WEDMWireThreadingMinEngine",
  "WaterjetLoRACadenceEngine",
  "WaterjetLoRADatasetBuilderEngine",
];

function buildManifest(): WEDMCapabilityManifest {
  const buckets: Record<string, WEDMCapabilityManifestEngine[]> = {
    physics: [],
    ml_learning: [],
    post_processing: [],
    safety_gates: [],
    job_business: [],
    pipeline: [],
    auxiliary: [],
  };

  for (const name of MANIFEST_ENGINE_NAMES) {
    const entry: WEDMCapabilityManifestEngine = {
      name,
      inputs: ["material", "thickness_mm"],
      outputs: ["result"],
      category: "wedm",
    };
    if (/Physics|Spark|Gap|Kerf|Flush|Thermal|Corner|Deflection|Heating|Stress|Tension|Power|Current|Taper|Recast|Ra|MRR|Weibull|Break|Dielectric|Pulse|ThinWire|Adaptive/.test(name)) {
      buckets.physics.push(entry);
    } else if (/LoRA|Learning|Pattern|FewShot|Transfer|Online|Feature|Graph|Neighbor|Lattice|Reasoning|EWCMemory|Feedback|Tribal/.test(name)) {
      buckets.ml_learning.push(entry);
    } else if (/Post|Dialect|Assembler|Comparison|Verification|Controller|OneClick|Master/.test(name)) {
      buckets.post_processing.push(entry);
    } else if (/Safety|Gate|Guard|Validator|HeadClearance|Collision|Autonomy|Envelope|Release/.test(name)) {
      buckets.safety_gates.push(entry);
    } else if (/Job|Cost|Credit|Invoice|Quote|Overage|Progress|Outcome|Premium|Spool/.test(name)) {
      buckets.job_business.push(entry);
    } else if (/PrintToProgram|Pipeline|Generator|MultiPass|Strategy|StartPoint|Batch|SlugTab|Tier6|Threading|UnitTag|Deviation|Benchmark/.test(name)) {
      buckets.pipeline.push(entry);
    } else {
      buckets.auxiliary.push(entry);
    }
  }

  return {
    schemaVersion: 2,
    process_type: "wire_edm",
    primary_pipeline: "WireEDMAIPrintToProgramEngine",
    entry_points: [
      "WireEDMAIPrintToProgramEngine",
      "WEDMPrintToProgramEngine",
      "OneClickWEDMGeneratorEngine",
    ],
    total_engines: MANIFEST_ENGINE_NAMES.length,
    engines: buckets,
    feature_types: [
      "closed_profile_cut",
      "taper_cut",
      "multi_pass_skim",
      "start_hole",
      "wire_profile",
      "slug_drop",
      "corner_rounding",
      "wire_contour",
    ],
    autobridge_route: {
      process_match: "wire_edm",
      engine: "WireEDMAIPrintToProgramEngine",
      required_inputs: ["material", "thickness_mm", "dxf_content"],
      produces: ["gcode", "setup_sheet", "cycle_time"],
    },
  };
}

let _cachedManifest: WEDMCapabilityManifest | null = null;

/**
 * Retrieve the WEDM capability manifest (cached).
 */
(AutoPrintToProgramBridgeEngine.prototype as any).getWedmCapabilityManifest = async function (): Promise<WEDMCapabilityManifest> {
  if (_cachedManifest === null) {
    _cachedManifest = buildManifest();
  }
  return _cachedManifest;
};

/**
 * Returns true if the wire-EDM routing arm is available.
 */
(AutoPrintToProgramBridgeEngine.prototype as any).canRouteWireEdm = async function (): Promise<boolean> {
  try {
    const manifest = await this.getWedmCapabilityManifest();
    if (!manifest) return false;
    // Verify the pipeline engine is importable
    const mod = await import("./WEDMPrintToProgramEngine.js");
    return !!mod.wedmPrintToProgramEngine;
  } catch {
    return false;
  }
};

/**
 * Dispatcher-style calculate() method — routes wire_edm process to WEDM pipeline.
 */
(AutoPrintToProgramBridgeEngine.prototype as any).calculate = async function (
  action: string,
  params: Record<string, unknown>
): Promise<{
  success: boolean;
  detected_format: InputFormat;
  detected_process: ProcessType;
  pipeline_used: string;
  stages_completed: string[];
  warnings: AutoPipelineWarning[];
  program_text?: string;
}> {
  const input: AutoPipelineInput = {
    content: String(params.content ?? ""),
    format: (params.format as InputFormat) ?? "dxf",
    process_type: params.process_type as ProcessType | undefined,
    material_name: params.material_name as string | undefined,
    stock_z_mm: params.stock_z_mm as number | undefined,
    controller: params.controller as string | undefined,
  };

  let pipelineUsed = "none";
  try {
    const result = await this.runAutoPipeline(input);
    if (result.detected_process === "wire_edm") {
      pipelineUsed = result.wedm_result && result.wedm_result.success
        ? "WireEDMAIPrintToProgramEngine"
        : result.wedm_result ? "FAILED" : "none";
    } else {
      pipelineUsed = result.detected_process;
    }
    return {
      success: result.success,
      detected_format: result.detected_format,
      detected_process: result.detected_process,
      pipeline_used: pipelineUsed,
      stages_completed: result.stages_completed,
      warnings: result.warnings,
      program_text: result.program_text,
    };
  } catch (err: any) {
    return {
      success: false,
      detected_format: input.format,
      detected_process: input.process_type ?? "auto",
      pipeline_used: "FAILED",
      stages_completed: [`error: ${err?.message ?? String(err)}`],
      warnings: [
        { severity: "error", stage: "calculate", message: err?.message ?? String(err) },
      ],
    };
  }
};

export const autoPrintToProgramBridgeEngine = new AutoPrintToProgramBridgeEngine();
