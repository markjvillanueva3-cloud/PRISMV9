/**
 * QuoteToShipOrchestratorEngine — CAMX-MS21/U04 (E1086)
 *
 * End-to-end orchestrator connecting all 21 pipeline stages from quote
 * request through shipping. Each stage lazy-loads its engine, validates
 * entry conditions, produces a typed result, and feeds output forward.
 *
 * 21-Stage Pipeline:
 *   1. INTAKE — BlueprintOCREngine or StepImportEngine
 *   2. FEATURE_RECOGNITION — FeatureRecognitionEngine
 *   3. DFM_CHECK — DFMFeedbackEngine
 *   4. FEASIBILITY — FeasibilityOrchestratorEngine
 *   5. QUOTE — QuoteEstimatorEngine
 *   6. APPROVAL_GATE — Customer approval hold
 *   7. PROCESS_PLAN — ProcessPlanEngine
 *   8. MAKE_VS_BUY — MakeVsBuyDecisionEngine
 *   9. MATERIAL_PROCUREMENT — StockSizeOptimizerEngine + MaterialCert
 *  10. TOOL_SELECTION — SmartToolSelectorEngine + ToolROIEngine
 *  11. STRATEGY_SELECTION — OptimalStrategySelectionEngine
 *  12. SPEED_FEED — SpeedFeedOrchestratorEngine
 *  13. PROGRAM_GENERATION — Process-routed (milling/turning/mill-turn/multi-axis/grinding/EDM/laser/waterjet)
 *  14. POST_PROCESSING — PostProcessorPipelineEngine
 *  15. SETUP_SHEET — SetupSheetFromGCodeEngine
 *  16. PROBING — ProbeRoutineGeneratorEngine
 *  17. SIMULATION — CNCSimulationPipelineEngine
 *  18. PRODUCTION_PACKAGE — ProductionPackageEngine
 *  19. JOB_LIFECYCLE — JobLifecycleEngine
 *  20. QUALITY — QualityManagementEngine
 *  21. SHIPPING — PackingSlipEngine + MaterialCertTraceability
 *
 * @module QuoteToShipOrchestratorEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// LAZY-LOADED ENGINE REFERENCES
// ============================================================================

let _blueprintOCREngine: any = null;
let _stepImportEngine: any = null;
let _featureRecognitionEngine: any = null;
let _dfmFeedbackEngine: any = null;
let _feasibilityOrchestratorEngine: any = null;
let _quoteEstimatorEngine: any = null;
let _processPlanEngine: any = null;
let _makeVsBuyDecisionEngine: any = null;
let _stockSizeOptimizerEngine: any = null;
let _smartToolSelectorEngine: any = null;
let _toolROIEngine: any = null;
let _optimalStrategySelectionEngine: any = null;
let _speedFeedOrchestratorEngine: any = null;
let _printToProgramPipelineEngine: any = null;
let _turningPrintToProgramEngine: any = null;
let _millTurnSwissPipelineEngine: any = null;
let _multiAxisPrintToProgramEngine: any = null;
let _grindingProgramAssemblerEngine: any = null;
let _edmProgramAssemblerEngine: any = null;
let _laserProgramAssemblerEngine: any = null;
let _waterjetProgramAssemblerEngine: any = null;
let _postProcessorPipelineEngine: any = null;
let _setupSheetFromGCodeEngine: any = null;
let _probeRoutineGeneratorEngine: any = null;
let _cncSimulationPipelineEngine: any = null;
let _productionPackageEngine: any = null;
let _jobLifecycleEngine: any = null;
let _qualityManagementEngine: any = null;
let _packingSlipEngine: any = null;
let _materialCertTraceabilityEngine: any = null;

function _getEngine(name: string): any {
  switch (name) {
    case "BlueprintOCREngine": {
      if (!_blueprintOCREngine) {
        const m = require("./BlueprintOCREngine.js");
        _blueprintOCREngine = m.blueprintOCREngine ?? m.default ?? m;
      }
      return _blueprintOCREngine;
    }
    case "StepImportEngine": {
      if (!_stepImportEngine) {
        const m = require("./StepImportEngine.js");
        _stepImportEngine = m.stepImportEngine ?? m.default ?? m;
      }
      return _stepImportEngine;
    }
    case "FeatureRecognitionEngine": {
      if (!_featureRecognitionEngine) {
        const m = require("./FeatureRecognitionEngine.js");
        _featureRecognitionEngine = m.featureRecognitionEngine ?? m.default ?? m;
      }
      return _featureRecognitionEngine;
    }
    case "DFMFeedbackEngine": {
      if (!_dfmFeedbackEngine) {
        const m = require("./DFMFeedbackEngine.js");
        _dfmFeedbackEngine = m.dfmFeedbackEngine ?? m.default ?? m;
      }
      return _dfmFeedbackEngine;
    }
    case "FeasibilityOrchestratorEngine": {
      if (!_feasibilityOrchestratorEngine) {
        const m = require("./FeasibilityOrchestratorEngine.js");
        _feasibilityOrchestratorEngine = m.feasibilityOrchestratorEngine ?? m.default ?? m;
      }
      return _feasibilityOrchestratorEngine;
    }
    case "QuoteEstimatorEngine": {
      if (!_quoteEstimatorEngine) {
        const m = require("./QuoteEstimatorEngine.js");
        _quoteEstimatorEngine = m.quoteEstimatorEngine ?? m.default ?? m;
      }
      return _quoteEstimatorEngine;
    }
    case "ProcessPlanEngine": {
      if (!_processPlanEngine) {
        const m = require("./ProcessPlanEngine.js");
        _processPlanEngine = m.processPlanEngine ?? m.default ?? m;
      }
      return _processPlanEngine;
    }
    case "MakeVsBuyDecisionEngine": {
      if (!_makeVsBuyDecisionEngine) {
        const m = require("./MakeVsBuyDecisionEngine.js");
        _makeVsBuyDecisionEngine = m.makeVsBuyDecisionEngine ?? m.default ?? m;
      }
      return _makeVsBuyDecisionEngine;
    }
    case "StockSizeOptimizerEngine": {
      if (!_stockSizeOptimizerEngine) {
        const m = require("./StockSizeOptimizerEngine.js");
        _stockSizeOptimizerEngine = m.stockSizeOptimizerEngine ?? m.default ?? m;
      }
      return _stockSizeOptimizerEngine;
    }
    case "SmartToolSelectorEngine": {
      if (!_smartToolSelectorEngine) {
        const m = require("./SmartToolSelectorEngine.js");
        _smartToolSelectorEngine = m.smartToolSelectorEngine ?? m.default ?? m;
      }
      return _smartToolSelectorEngine;
    }
    case "ToolROIEngine": {
      if (!_toolROIEngine) {
        const m = require("./ToolROIEngine.js");
        _toolROIEngine = m.toolROIEngine ?? m.default ?? m;
      }
      return _toolROIEngine;
    }
    case "OptimalStrategySelectionEngine": {
      if (!_optimalStrategySelectionEngine) {
        const m = require("./OptimalStrategySelectionEngine.js");
        _optimalStrategySelectionEngine = m.optimalStrategySelectionEngine ?? m.default ?? m;
      }
      return _optimalStrategySelectionEngine;
    }
    case "SpeedFeedOrchestratorEngine": {
      if (!_speedFeedOrchestratorEngine) {
        const m = require("./SpeedFeedOrchestratorEngine.js");
        _speedFeedOrchestratorEngine = m.speedFeedOrchestratorEngine ?? m.default ?? m;
      }
      return _speedFeedOrchestratorEngine;
    }
    case "PrintToProgramPipelineEngine": {
      if (!_printToProgramPipelineEngine) {
        const m = require("./PrintToProgramPipelineEngine.js");
        _printToProgramPipelineEngine = m.printToProgramPipelineEngine ?? m.default ?? m;
      }
      return _printToProgramPipelineEngine;
    }
    case "TurningPrintToProgramEngine": {
      if (!_turningPrintToProgramEngine) {
        const m = require("./TurningPrintToProgramEngine.js");
        _turningPrintToProgramEngine = m.turningPrintToProgramEngine ?? m.default ?? m;
      }
      return _turningPrintToProgramEngine;
    }
    case "MillTurnSwissPipelineEngine": {
      if (!_millTurnSwissPipelineEngine) {
        const m = require("./MillTurnSwissPipelineEngine.js");
        _millTurnSwissPipelineEngine = m.millTurnSwissPipelineEngine ?? m.default ?? m;
      }
      return _millTurnSwissPipelineEngine;
    }
    case "MultiAxisPrintToProgramEngine": {
      if (!_multiAxisPrintToProgramEngine) {
        const m = require("./MultiAxisPrintToProgramEngine.js");
        _multiAxisPrintToProgramEngine = m.multiAxisPrintToProgramEngine ?? m.default ?? m;
      }
      return _multiAxisPrintToProgramEngine;
    }
    case "GrindingProgramAssemblerEngine": {
      if (!_grindingProgramAssemblerEngine) {
        const m = require("./GrindingProgramAssemblerEngine.js");
        _grindingProgramAssemblerEngine = m.grindingProgramAssemblerEngine ?? m.default ?? m;
      }
      return _grindingProgramAssemblerEngine;
    }
    case "EDMProgramAssemblerEngine": {
      if (!_edmProgramAssemblerEngine) {
        const m = require("./EDMProgramAssemblerEngine.js");
        _edmProgramAssemblerEngine = m.edmProgramAssemblerEngine ?? m.default ?? m;
      }
      return _edmProgramAssemblerEngine;
    }
    case "LaserProgramAssemblerEngine": {
      if (!_laserProgramAssemblerEngine) {
        const m = require("./LaserProgramAssemblerEngine.js");
        _laserProgramAssemblerEngine = m.laserProgramAssemblerEngine ?? m.default ?? m;
      }
      return _laserProgramAssemblerEngine;
    }
    case "WaterjetProgramAssemblerEngine": {
      if (!_waterjetProgramAssemblerEngine) {
        const m = require("./WaterjetProgramAssemblerEngine.js");
        _waterjetProgramAssemblerEngine = m.waterjetProgramAssemblerEngine ?? m.default ?? m;
      }
      return _waterjetProgramAssemblerEngine;
    }
    case "PostProcessorPipelineEngine": {
      if (!_postProcessorPipelineEngine) {
        const m = require("./PostProcessorPipelineEngine.js");
        _postProcessorPipelineEngine = m.postProcessorPipelineEngine ?? m.default ?? m;
      }
      return _postProcessorPipelineEngine;
    }
    case "SetupSheetFromGCodeEngine": {
      if (!_setupSheetFromGCodeEngine) {
        const m = require("./SetupSheetFromGCodeEngine.js");
        _setupSheetFromGCodeEngine = m.setupSheetFromGCodeEngine ?? m.default ?? m;
      }
      return _setupSheetFromGCodeEngine;
    }
    case "ProbeRoutineGeneratorEngine": {
      if (!_probeRoutineGeneratorEngine) {
        const m = require("./ProbeRoutineGeneratorEngine.js");
        _probeRoutineGeneratorEngine = m.probeRoutineGeneratorEngine ?? m.default ?? m;
      }
      return _probeRoutineGeneratorEngine;
    }
    case "CNCSimulationPipelineEngine": {
      if (!_cncSimulationPipelineEngine) {
        const m = require("./CNCSimulationPipelineEngine.js");
        _cncSimulationPipelineEngine = m.cncSimulationPipelineEngine ?? m.default ?? m;
      }
      return _cncSimulationPipelineEngine;
    }
    case "ProductionPackageEngine": {
      if (!_productionPackageEngine) {
        const m = require("./ProductionPackageEngine.js");
        _productionPackageEngine = m.productionPackageEngine ?? m.default ?? m;
      }
      return _productionPackageEngine;
    }
    case "JobLifecycleEngine": {
      if (!_jobLifecycleEngine) {
        const m = require("./JobLifecycleEngine.js");
        _jobLifecycleEngine = m.jobLifecycleEngine ?? m.default ?? m;
      }
      return _jobLifecycleEngine;
    }
    case "QualityManagementEngine": {
      if (!_qualityManagementEngine) {
        const m = require("./QualityManagementEngine.js");
        _qualityManagementEngine = m.qualityManagementEngine ?? m.default ?? m;
      }
      return _qualityManagementEngine;
    }
    case "PackingSlipEngine": {
      if (!_packingSlipEngine) {
        const m = require("./PackingSlipEngine.js");
        _packingSlipEngine = m.packingSlipEngine ?? m.default ?? m;
      }
      return _packingSlipEngine;
    }
    case "MaterialCertTraceabilityEngine": {
      if (!_materialCertTraceabilityEngine) {
        const m = require("./MaterialCertTraceabilityEngine.js");
        _materialCertTraceabilityEngine = m.materialCertTraceabilityEngine ?? m.default ?? m;
      }
      return _materialCertTraceabilityEngine;
    }
    default:
      throw new Error(`Unknown engine: ${name}`);
  }
}

// ============================================================================
// PIPELINE STAGE DEFINITIONS
// ============================================================================

/** All 21 pipeline stage identifiers in execution order. */
export type PipelineStageId =
  | "INTAKE"
  | "FEATURE_RECOGNITION"
  | "DFM_CHECK"
  | "FEASIBILITY"
  | "QUOTE"
  | "APPROVAL_GATE"
  | "PROCESS_PLAN"
  | "MAKE_VS_BUY"
  | "MATERIAL_PROCUREMENT"
  | "TOOL_SELECTION"
  | "STRATEGY_SELECTION"
  | "SPEED_FEED"
  | "PROGRAM_GENERATION"
  | "POST_PROCESSING"
  | "SETUP_SHEET"
  | "PROBING"
  | "SIMULATION"
  | "PRODUCTION_PACKAGE"
  | "JOB_LIFECYCLE"
  | "QUALITY"
  | "SHIPPING";

/** Ordered stage list for sequential execution. */
const STAGE_ORDER: PipelineStageId[] = [
  "INTAKE",
  "FEATURE_RECOGNITION",
  "DFM_CHECK",
  "FEASIBILITY",
  "QUOTE",
  "APPROVAL_GATE",
  "PROCESS_PLAN",
  "MAKE_VS_BUY",
  "MATERIAL_PROCUREMENT",
  "TOOL_SELECTION",
  "STRATEGY_SELECTION",
  "SPEED_FEED",
  "PROGRAM_GENERATION",
  "POST_PROCESSING",
  "SETUP_SHEET",
  "PROBING",
  "SIMULATION",
  "PRODUCTION_PACKAGE",
  "JOB_LIFECYCLE",
  "QUALITY",
  "SHIPPING",
];

/** Stage descriptor — maps ID to human label, engine name, and prerequisites. */
interface StageDescriptor {
  id: PipelineStageId;
  label: string;
  engines: string[];
  requires: PipelineStageId[];
  optional: boolean;
}

const STAGE_DESCRIPTORS: StageDescriptor[] = [
  {
    id: "INTAKE",
    label: "Blueprint/STEP Intake",
    engines: ["BlueprintOCREngine", "StepImportEngine"],
    requires: [],
    optional: false,
  },
  {
    id: "FEATURE_RECOGNITION",
    label: "Feature Recognition",
    engines: ["FeatureRecognitionEngine"],
    requires: ["INTAKE"],
    optional: false,
  },
  {
    id: "DFM_CHECK",
    label: "Design for Manufacturability Check",
    engines: ["DFMFeedbackEngine"],
    requires: ["FEATURE_RECOGNITION"],
    optional: false,
  },
  {
    id: "FEASIBILITY",
    label: "Machining Feasibility Analysis",
    engines: ["FeasibilityOrchestratorEngine"],
    requires: ["FEATURE_RECOGNITION"],
    optional: false,
  },
  {
    id: "QUOTE",
    label: "Cost & Lead Time Estimation",
    engines: ["QuoteEstimatorEngine"],
    requires: ["DFM_CHECK", "FEASIBILITY"],
    optional: false,
  },
  {
    id: "APPROVAL_GATE",
    label: "Customer Approval Gate",
    engines: [],
    requires: ["QUOTE"],
    optional: false,
  },
  {
    id: "PROCESS_PLAN",
    label: "Process Planning & Sequencing",
    engines: ["ProcessPlanEngine"],
    requires: ["APPROVAL_GATE"],
    optional: false,
  },
  {
    id: "MAKE_VS_BUY",
    label: "Make vs Buy Decision",
    engines: ["MakeVsBuyDecisionEngine"],
    requires: ["PROCESS_PLAN"],
    optional: true,
  },
  {
    id: "MATERIAL_PROCUREMENT",
    label: "Material Procurement & Stock Optimization",
    engines: ["StockSizeOptimizerEngine", "MaterialCertTraceabilityEngine"],
    requires: ["PROCESS_PLAN"],
    optional: false,
  },
  {
    id: "TOOL_SELECTION",
    label: "Tool Selection & ROI Analysis",
    engines: ["SmartToolSelectorEngine", "ToolROIEngine"],
    requires: ["PROCESS_PLAN"],
    optional: false,
  },
  {
    id: "STRATEGY_SELECTION",
    label: "CAM Strategy Selection",
    engines: ["OptimalStrategySelectionEngine"],
    requires: ["FEATURE_RECOGNITION", "TOOL_SELECTION"],
    optional: false,
  },
  {
    id: "SPEED_FEED",
    label: "Speed & Feed Optimization",
    engines: ["SpeedFeedOrchestratorEngine"],
    requires: ["TOOL_SELECTION", "STRATEGY_SELECTION"],
    optional: false,
  },
  {
    id: "PROGRAM_GENERATION",
    label: "CNC Program Generation",
    engines: ["PrintToProgramPipelineEngine"],
    requires: ["SPEED_FEED"],
    optional: false,
  },
  {
    id: "POST_PROCESSING",
    label: "Controller-Specific Post Processing",
    engines: ["PostProcessorPipelineEngine"],
    requires: ["PROGRAM_GENERATION"],
    optional: false,
  },
  {
    id: "SETUP_SHEET",
    label: "Setup Sheet Generation",
    engines: ["SetupSheetFromGCodeEngine"],
    requires: ["POST_PROCESSING"],
    optional: false,
  },
  {
    id: "PROBING",
    label: "Probe Routine Generation",
    engines: ["ProbeRoutineGeneratorEngine"],
    requires: ["PROCESS_PLAN"],
    optional: true,
  },
  {
    id: "SIMULATION",
    label: "CNC Simulation & Verification",
    engines: ["CNCSimulationPipelineEngine"],
    requires: ["POST_PROCESSING"],
    optional: true,
  },
  {
    id: "PRODUCTION_PACKAGE",
    label: "Production Package Assembly",
    engines: ["ProductionPackageEngine"],
    requires: ["SETUP_SHEET"],
    optional: false,
  },
  {
    id: "JOB_LIFECYCLE",
    label: "Job Lifecycle Tracking",
    engines: ["JobLifecycleEngine"],
    requires: ["PRODUCTION_PACKAGE"],
    optional: false,
  },
  {
    id: "QUALITY",
    label: "Quality Management (FAI + SPC)",
    engines: ["QualityManagementEngine"],
    requires: ["JOB_LIFECYCLE"],
    optional: true,
  },
  {
    id: "SHIPPING",
    label: "Shipping & Packing Slip",
    engines: ["PackingSlipEngine", "MaterialCertTraceabilityEngine"],
    requires: ["JOB_LIFECYCLE"],
    optional: false,
  },
];

// ============================================================================
// INPUT / OUTPUT INTERFACES
// ============================================================================

/** Primary input for the quote-to-ship pipeline. */
export interface QuoteToShipInput {
  /** Path to drawing PDF for OCR intake. */
  drawing_pdf?: string;
  /** Path to STEP/IGES file for geometric intake. */
  step_file?: string;
  /** Material specification (e.g. "6061-T6", "Ti-6Al-4V"). */
  material_spec: string;
  /** Quantity of parts requested. */
  quantity: number;
  /** Customer identifier for tracking. */
  customer_id?: string;
  /** Machine IDs available for this job. */
  machine_ids?: string[];
  /** Job priority level. */
  priority?: "standard" | "rush" | "hot";
  /** Controller type for post processing. */
  controller?: string;
  /** Pre-approved — skip approval gate. */
  pre_approved?: boolean;
  /** Tolerance requirements. */
  tolerances?: Array<{ feature: string; value_mm: number }>;
  /** Surface finish requirement (Ra, micrometers). */
  surface_finish_ra_um?: number;
  /** Additional metadata for downstream engines. */
  metadata?: Record<string, unknown>;
}

/** Result of a single pipeline stage. */
export interface StageResult {
  /** Stage identifier. */
  id: PipelineStageId;
  /** Human-readable stage label. */
  label: string;
  /** Stage execution status. */
  status: "pass" | "fail" | "skip" | "pending" | "blocked";
  /** Wall-clock duration of stage execution in milliseconds. */
  duration_ms: number;
  /** Summary of stage output for display. */
  result_summary: string;
  /** Full stage output data (engine-specific). */
  output: Record<string, unknown> | null;
  /** Warnings produced during stage execution. */
  warnings: string[];
  /** Errors that caused stage failure. */
  errors: string[];
  /** Timestamp of stage completion. */
  completed_at: string;
}

/** Full pipeline output. */
export interface QuoteToShipResult {
  /** Unique pipeline run identifier. */
  pipeline_id: string;
  /** Overall pipeline status. */
  status: "complete" | "partial" | "failed" | "awaiting_approval";
  /** Per-stage results in execution order. */
  stages: StageResult[];
  /** Total estimated cost (USD) from quoting. */
  total_cost_usd: number | null;
  /** Estimated lead time in business days. */
  lead_time_days: number | null;
  /** Paths to generated CNC programs. */
  program_paths: string[];
  /** Generated setup sheet data. */
  setup_sheet: Record<string, unknown> | null;
  /** Assembled production package reference. */
  production_package: Record<string, unknown> | null;
  /** Total pipeline wall-clock time in milliseconds. */
  total_duration_ms: number;
  /** Pipeline-level warnings. */
  warnings: string[];
  /** Pipeline start timestamp. */
  started_at: string;
  /** Pipeline end timestamp. */
  completed_at: string;
}

// ============================================================================
// PIPELINE CONTEXT — accumulated state passed between stages
// ============================================================================

/** Mutable context accumulated as stages execute. */
interface PipelineContext {
  /** Input that started the pipeline. */
  input: QuoteToShipInput;
  /** Per-stage results keyed by stage ID. */
  results: Map<PipelineStageId, StageResult>;
  /** Geometry/feature data from intake and feature recognition. */
  geometry: Record<string, unknown> | null;
  /** Recognized features. */
  features: any[] | null;
  /** DFM findings. */
  dfm: Record<string, unknown> | null;
  /** Feasibility report. */
  feasibility: Record<string, unknown> | null;
  /** Quote estimate. */
  quote: Record<string, unknown> | null;
  /** Process plan with operations. */
  process_plan: Record<string, unknown> | null;
  /** Make vs buy decisions per operation. */
  make_vs_buy: Record<string, unknown> | null;
  /** Material/stock procurement data. */
  material: Record<string, unknown> | null;
  /** Selected tools per operation. */
  tools: any[] | null;
  /** Selected strategies per feature. */
  strategies: any[] | null;
  /** Speed/feed recommendations per operation. */
  speed_feeds: any[] | null;
  /** Generated G-code programs. */
  programs: any[] | null;
  /** Post-processed G-code. */
  post_processed: any[] | null;
  /** Setup sheet data. */
  setup_sheet: Record<string, unknown> | null;
  /** Probe routines. */
  probe_routines: any[] | null;
  /** Simulation results. */
  simulation: Record<string, unknown> | null;
  /** Production package. */
  production_package: Record<string, unknown> | null;
  /** Job lifecycle tracking data. */
  job: Record<string, unknown> | null;
  /** Quality records. */
  quality: Record<string, unknown> | null;
  /** Shipping/packing slip data. */
  shipping: Record<string, unknown> | null;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Generate a unique pipeline run ID. */
function generatePipelineId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `QTS-${ts}-${rand}`;
}

/** Create an empty stage result in pending state. */
function pendingResult(desc: StageDescriptor): StageResult {
  return {
    id: desc.id,
    label: desc.label,
    status: "pending",
    duration_ms: 0,
    result_summary: "",
    output: null,
    warnings: [],
    errors: [],
    completed_at: "",
  };
}

/** Create a fresh pipeline context. */
function createContext(input: QuoteToShipInput): PipelineContext {
  return {
    input,
    results: new Map(),
    geometry: null,
    features: null,
    dfm: null,
    feasibility: null,
    quote: null,
    process_plan: null,
    make_vs_buy: null,
    material: null,
    tools: null,
    strategies: null,
    speed_feeds: null,
    programs: null,
    post_processed: null,
    setup_sheet: null,
    probe_routines: null,
    simulation: null,
    production_package: null,
    job: null,
    quality: null,
    shipping: null,
  };
}

/** Check whether all prerequisite stages have passed. */
function prerequisitesMet(
  stageId: PipelineStageId,
  ctx: PipelineContext,
): { met: boolean; missing: PipelineStageId[] } {
  const desc = STAGE_DESCRIPTORS.find(s => s.id === stageId);
  if (!desc) return { met: false, missing: [stageId] };
  const missing: PipelineStageId[] = [];
  for (const req of desc.requires) {
    const result = ctx.results.get(req);
    if (!result || (result.status !== "pass" && result.status !== "skip")) {
      missing.push(req);
    }
  }
  return { met: missing.length === 0, missing };
}

// ============================================================================
// STAGE EXECUTORS
// ============================================================================

/**
 * Execute the INTAKE stage.
 * Chooses BlueprintOCREngine for PDF input or StepImportEngine for STEP files.
 */
async function executeIntake(ctx: PipelineContext): Promise<StageResult> {
  const start = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    let result: any = null;

    if (ctx.input.step_file) {
      const engine = _getEngine("StepImportEngine");
      const importFn = engine.import ?? engine.importFile ?? engine.parse;
      if (importFn) {
        result = await Promise.resolve(importFn.call(engine, {
          file_path: ctx.input.step_file,
          material: ctx.input.material_spec,
        }));
      } else {
        result = { file: ctx.input.step_file, type: "step", parsed: true };
        warnings.push("StepImportEngine: using stub — no import method found");
      }
    } else if (ctx.input.drawing_pdf) {
      const engine = _getEngine("BlueprintOCREngine");
      const analyzeFn = engine.analyzeBlueprint ?? engine.analyze ?? engine.extract;
      if (analyzeFn) {
        result = await Promise.resolve(analyzeFn.call(engine, {
          pdf_path: ctx.input.drawing_pdf,
        }));
      } else {
        result = { file: ctx.input.drawing_pdf, type: "pdf", parsed: true };
        warnings.push("BlueprintOCREngine: using stub — no analyze method found");
      }
    } else {
      errors.push("No drawing_pdf or step_file provided for intake");
      return {
        id: "INTAKE",
        label: "Blueprint/STEP Intake",
        status: "fail",
        duration_ms: Date.now() - start,
        result_summary: "No input file provided",
        output: null,
        warnings,
        errors,
        completed_at: new Date().toISOString(),
      };
    }

    ctx.geometry = result?.value ?? result ?? {};

    return {
      id: "INTAKE",
      label: "Blueprint/STEP Intake",
      status: "pass",
      duration_ms: Date.now() - start,
      result_summary: ctx.input.step_file
        ? `STEP file imported: ${ctx.input.step_file}`
        : `Blueprint analyzed: ${ctx.input.drawing_pdf}`,
      output: ctx.geometry,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  } catch (err: any) {
    errors.push(`Intake failed: ${err?.message ?? String(err)}`);
    return {
      id: "INTAKE",
      label: "Blueprint/STEP Intake",
      status: "fail",
      duration_ms: Date.now() - start,
      result_summary: "Intake stage failed",
      output: null,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  }
}

/** Execute FEATURE_RECOGNITION stage. */
async function executeFeatureRecognition(ctx: PipelineContext): Promise<StageResult> {
  const start = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const engine = _getEngine("FeatureRecognitionEngine");
    const recognizeFn = engine.recognize ?? engine.analyzeFeatures ?? engine.run;
    let result: any = null;

    if (recognizeFn) {
      result = await Promise.resolve(recognizeFn.call(engine, {
        geometry: ctx.geometry,
        material: ctx.input.material_spec,
      }));
    } else {
      warnings.push("FeatureRecognitionEngine: using stub");
      result = { features: [], count: 0 };
    }

    const resolved = result?.value ?? result;
    ctx.features = resolved?.features ?? resolved ?? [];

    return {
      id: "FEATURE_RECOGNITION",
      label: "Feature Recognition",
      status: "pass",
      duration_ms: Date.now() - start,
      result_summary: `Recognized ${Array.isArray(ctx.features) ? ctx.features.length : 0} features`,
      output: resolved,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  } catch (err: any) {
    errors.push(`Feature recognition failed: ${err?.message ?? String(err)}`);
    return {
      id: "FEATURE_RECOGNITION",
      label: "Feature Recognition",
      status: "fail",
      duration_ms: Date.now() - start,
      result_summary: "Feature recognition failed",
      output: null,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  }
}

/** Execute DFM_CHECK stage. */
async function executeDfmCheck(ctx: PipelineContext): Promise<StageResult> {
  const start = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const engine = _getEngine("DFMFeedbackEngine");
    const analyzeFn = engine.analyze ?? engine.check ?? engine.run;
    let result: any = null;

    if (analyzeFn) {
      result = await Promise.resolve(analyzeFn.call(engine, {
        features: ctx.features,
        material: ctx.input.material_spec,
        quantity: ctx.input.quantity,
        tolerances: ctx.input.tolerances,
      }));
    } else {
      warnings.push("DFMFeedbackEngine: using stub");
      result = { status: "pass", issues: [], score: 1.0 };
    }

    const resolved = result?.value ?? result;
    ctx.dfm = resolved;

    const dfmStatus = resolved?.status ?? resolved?.result ?? "pass";
    const issueCount = resolved?.issues?.length ?? 0;

    if (dfmStatus === "fail") {
      errors.push(`DFM check failed with ${issueCount} critical issues`);
      return {
        id: "DFM_CHECK",
        label: "Design for Manufacturability Check",
        status: "fail",
        duration_ms: Date.now() - start,
        result_summary: `DFM FAIL: ${issueCount} issues found`,
        output: resolved,
        warnings,
        errors,
        completed_at: new Date().toISOString(),
      };
    }

    if (dfmStatus === "warn" || issueCount > 0) {
      warnings.push(`DFM: ${issueCount} non-critical issues found`);
    }

    return {
      id: "DFM_CHECK",
      label: "Design for Manufacturability Check",
      status: "pass",
      duration_ms: Date.now() - start,
      result_summary: `DFM ${dfmStatus.toUpperCase()}: ${issueCount} issues`,
      output: resolved,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  } catch (err: any) {
    errors.push(`DFM check failed: ${err?.message ?? String(err)}`);
    return {
      id: "DFM_CHECK",
      label: "Design for Manufacturability Check",
      status: "fail",
      duration_ms: Date.now() - start,
      result_summary: "DFM check failed",
      output: null,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  }
}

/** Execute FEASIBILITY stage. */
async function executeFeasibility(ctx: PipelineContext): Promise<StageResult> {
  const start = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const engine = _getEngine("FeasibilityOrchestratorEngine");
    const analyzeFn = engine.analyze ?? engine.fullAnalysis ?? engine.run;
    let result: any = null;

    if (analyzeFn) {
      result = await Promise.resolve(analyzeFn.call(engine, {
        features: ctx.features,
        material: ctx.input.material_spec,
        machine_ids: ctx.input.machine_ids,
        geometry: ctx.geometry,
      }));
    } else {
      warnings.push("FeasibilityOrchestratorEngine: using stub");
      result = { overall_feasible: true, dead_ends: [] };
    }

    const resolved = result?.value ?? result;
    ctx.feasibility = resolved;

    const feasible = resolved?.overall_feasible ?? resolved?.feasible ?? true;
    if (!feasible) {
      const deadEnds = resolved?.dead_ends?.length ?? 0;
      errors.push(`Part is not feasible: ${deadEnds} blocking issue(s)`);
      return {
        id: "FEASIBILITY",
        label: "Machining Feasibility Analysis",
        status: "fail",
        duration_ms: Date.now() - start,
        result_summary: `INFEASIBLE: ${deadEnds} blocking issues`,
        output: resolved,
        warnings,
        errors,
        completed_at: new Date().toISOString(),
      };
    }

    return {
      id: "FEASIBILITY",
      label: "Machining Feasibility Analysis",
      status: "pass",
      duration_ms: Date.now() - start,
      result_summary: "Part is feasible for manufacturing",
      output: resolved,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  } catch (err: any) {
    errors.push(`Feasibility analysis failed: ${err?.message ?? String(err)}`);
    return {
      id: "FEASIBILITY",
      label: "Machining Feasibility Analysis",
      status: "fail",
      duration_ms: Date.now() - start,
      result_summary: "Feasibility analysis failed",
      output: null,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  }
}

/** Execute QUOTE stage. */
async function executeQuote(ctx: PipelineContext): Promise<StageResult> {
  const start = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const engine = _getEngine("QuoteEstimatorEngine");
    const estimateFn = engine.estimate ?? engine.quote ?? engine.run;
    let result: any = null;

    if (estimateFn) {
      result = await Promise.resolve(estimateFn.call(engine, {
        features: ctx.features,
        material: ctx.input.material_spec,
        quantity: ctx.input.quantity,
        dfm: ctx.dfm,
        feasibility: ctx.feasibility,
        priority: ctx.input.priority,
      }));
    } else {
      warnings.push("QuoteEstimatorEngine: using stub");
      result = { price_usd: 0, lead_time_days: 0, confidence: 0 };
    }

    const resolved = result?.value ?? result;
    ctx.quote = resolved;

    return {
      id: "QUOTE",
      label: "Cost & Lead Time Estimation",
      status: "pass",
      duration_ms: Date.now() - start,
      result_summary: `Quoted $${resolved?.price_usd ?? resolved?.total_cost_usd ?? "N/A"}, `
        + `${resolved?.lead_time_days ?? "N/A"} days`,
      output: resolved,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  } catch (err: any) {
    errors.push(`Quote estimation failed: ${err?.message ?? String(err)}`);
    return {
      id: "QUOTE",
      label: "Cost & Lead Time Estimation",
      status: "fail",
      duration_ms: Date.now() - start,
      result_summary: "Quote estimation failed",
      output: null,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  }
}

/** Execute APPROVAL_GATE stage. */
async function executeApprovalGate(ctx: PipelineContext): Promise<StageResult> {
  const start = Date.now();

  if (ctx.input.pre_approved) {
    return {
      id: "APPROVAL_GATE",
      label: "Customer Approval Gate",
      status: "pass",
      duration_ms: Date.now() - start,
      result_summary: "Pre-approved — skipping approval gate",
      output: { approved: true, pre_approved: true },
      warnings: [],
      errors: [],
      completed_at: new Date().toISOString(),
    };
  }

  // When not pre-approved, the pipeline halts here awaiting external approval.
  // Callers should use runFromStage("PROCESS_PLAN", ...) to resume after approval.
  return {
    id: "APPROVAL_GATE",
    label: "Customer Approval Gate",
    status: "blocked",
    duration_ms: Date.now() - start,
    result_summary: "Awaiting customer approval — pipeline paused",
    output: {
      approved: false,
      quote: ctx.quote,
      customer_id: ctx.input.customer_id,
      awaiting_approval: true,
    },
    warnings: [],
    errors: [],
    completed_at: new Date().toISOString(),
  };
}

/** Execute PROCESS_PLAN stage. */
async function executeProcessPlan(ctx: PipelineContext): Promise<StageResult> {
  const start = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const engine = _getEngine("ProcessPlanEngine");
    const planFn = engine.plan ?? engine.generatePlan ?? engine.run;
    let result: any = null;

    if (planFn) {
      result = await Promise.resolve(planFn.call(engine, {
        features: ctx.features,
        material: ctx.input.material_spec,
        machine_ids: ctx.input.machine_ids,
        geometry: ctx.geometry,
        quantity: ctx.input.quantity,
      }));
    } else {
      warnings.push("ProcessPlanEngine: using stub");
      result = { operations: [], sequence: [] };
    }

    const resolved = result?.value ?? result;
    ctx.process_plan = resolved;

    const opCount = resolved?.operations?.length ?? 0;
    return {
      id: "PROCESS_PLAN",
      label: "Process Planning & Sequencing",
      status: "pass",
      duration_ms: Date.now() - start,
      result_summary: `Process plan: ${opCount} operations sequenced`,
      output: resolved,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  } catch (err: any) {
    errors.push(`Process planning failed: ${err?.message ?? String(err)}`);
    return {
      id: "PROCESS_PLAN",
      label: "Process Planning & Sequencing",
      status: "fail",
      duration_ms: Date.now() - start,
      result_summary: "Process planning failed",
      output: null,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  }
}

/** Execute MAKE_VS_BUY stage. */
async function executeMakeVsBuy(ctx: PipelineContext): Promise<StageResult> {
  const start = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const engine = _getEngine("MakeVsBuyDecisionEngine");
    const analyzeFn = engine.analyzeJob ?? engine.analyze ?? engine.run;
    let result: any = null;

    if (analyzeFn) {
      result = await Promise.resolve(analyzeFn.call(engine, {
        operations: ctx.process_plan?.operations ?? [],
        material: ctx.input.material_spec,
        quantity: ctx.input.quantity,
      }));
    } else {
      warnings.push("MakeVsBuyDecisionEngine: using stub");
      result = { decisions: [], summary: "all make" };
    }

    const resolved = result?.value ?? result;
    ctx.make_vs_buy = resolved;

    return {
      id: "MAKE_VS_BUY",
      label: "Make vs Buy Decision",
      status: "pass",
      duration_ms: Date.now() - start,
      result_summary: `Make/buy decisions: ${resolved?.decisions?.length ?? 0} operations evaluated`,
      output: resolved,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  } catch (err: any) {
    // Make vs buy is optional — degrade gracefully
    warnings.push(`Make vs buy analysis unavailable: ${err?.message ?? String(err)}`);
    return {
      id: "MAKE_VS_BUY",
      label: "Make vs Buy Decision",
      status: "skip",
      duration_ms: Date.now() - start,
      result_summary: "Make vs buy analysis skipped (optional)",
      output: null,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  }
}

/** Execute MATERIAL_PROCUREMENT stage. */
async function executeMaterialProcurement(ctx: PipelineContext): Promise<StageResult> {
  const start = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const stockEngine = _getEngine("StockSizeOptimizerEngine");
    const optimizeFn = stockEngine.optimize ?? stockEngine.recommend ?? stockEngine.run;
    let stockResult: any = null;

    if (optimizeFn) {
      stockResult = await Promise.resolve(optimizeFn.call(stockEngine, {
        material: ctx.input.material_spec,
        geometry: ctx.geometry,
        quantity: ctx.input.quantity,
      }));
    } else {
      warnings.push("StockSizeOptimizerEngine: using stub");
      stockResult = { stock_size: null, cost_usd: 0 };
    }

    const resolved = stockResult?.value ?? stockResult;
    ctx.material = {
      stock: resolved,
      material_spec: ctx.input.material_spec,
    };

    return {
      id: "MATERIAL_PROCUREMENT",
      label: "Material Procurement & Stock Optimization",
      status: "pass",
      duration_ms: Date.now() - start,
      result_summary: `Stock optimized for ${ctx.input.material_spec}`,
      output: ctx.material,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  } catch (err: any) {
    errors.push(`Material procurement failed: ${err?.message ?? String(err)}`);
    return {
      id: "MATERIAL_PROCUREMENT",
      label: "Material Procurement & Stock Optimization",
      status: "fail",
      duration_ms: Date.now() - start,
      result_summary: "Material procurement failed",
      output: null,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  }
}

/** Execute TOOL_SELECTION stage. */
async function executeToolSelection(ctx: PipelineContext): Promise<StageResult> {
  const start = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const engine = _getEngine("SmartToolSelectorEngine");
    const selectFn = engine.select ?? engine.recommend ?? engine.run;
    const operations = (ctx.process_plan as any)?.operations ?? [];
    const tools: any[] = [];

    for (const op of operations) {
      let toolResult: any = null;
      if (selectFn) {
        toolResult = await Promise.resolve(selectFn.call(engine, {
          operation: op,
          material: ctx.input.material_spec,
          machine_ids: ctx.input.machine_ids,
        }));
      }
      const resolved = toolResult?.value ?? toolResult;
      tools.push({ operation_id: op.id ?? op.name, tool: resolved });
    }

    // Optional: run ROI analysis on selected tools
    try {
      const roiEngine = _getEngine("ToolROIEngine");
      const roiFn = roiEngine.analyze ?? roiEngine.computeROI ?? roiEngine.run;
      if (roiFn) {
        for (const t of tools) {
          const roi = await Promise.resolve(roiFn.call(roiEngine, {
            tool: t.tool,
            material: ctx.input.material_spec,
            quantity: ctx.input.quantity,
          }));
          t.roi = roi?.value ?? roi;
        }
      }
    } catch {
      warnings.push("ToolROIEngine: ROI analysis unavailable, skipping");
    }

    ctx.tools = tools;

    return {
      id: "TOOL_SELECTION",
      label: "Tool Selection & ROI Analysis",
      status: "pass",
      duration_ms: Date.now() - start,
      result_summary: `Selected tools for ${tools.length} operations`,
      output: { tools },
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  } catch (err: any) {
    errors.push(`Tool selection failed: ${err?.message ?? String(err)}`);
    return {
      id: "TOOL_SELECTION",
      label: "Tool Selection & ROI Analysis",
      status: "fail",
      duration_ms: Date.now() - start,
      result_summary: "Tool selection failed",
      output: null,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  }
}

/** Execute STRATEGY_SELECTION stage. */
async function executeStrategySelection(ctx: PipelineContext): Promise<StageResult> {
  const start = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const engine = _getEngine("OptimalStrategySelectionEngine");
    const selectFn = engine.select ?? engine.recommend ?? engine.evaluate ?? engine.run;
    const features = ctx.features ?? [];
    const strategies: any[] = [];

    for (const feature of features) {
      let stratResult: any = null;
      if (selectFn) {
        stratResult = await Promise.resolve(selectFn.call(engine, {
          feature,
          material: ctx.input.material_spec,
          tools: ctx.tools,
        }));
      }
      const resolved = stratResult?.value ?? stratResult;
      strategies.push({
        feature_id: feature?.id ?? feature?.type ?? "unknown",
        strategy: resolved,
      });
    }

    ctx.strategies = strategies;

    return {
      id: "STRATEGY_SELECTION",
      label: "CAM Strategy Selection",
      status: "pass",
      duration_ms: Date.now() - start,
      result_summary: `Strategies selected for ${strategies.length} features`,
      output: { strategies },
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  } catch (err: any) {
    errors.push(`Strategy selection failed: ${err?.message ?? String(err)}`);
    return {
      id: "STRATEGY_SELECTION",
      label: "CAM Strategy Selection",
      status: "fail",
      duration_ms: Date.now() - start,
      result_summary: "Strategy selection failed",
      output: null,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  }
}

/** Execute SPEED_FEED stage. */
async function executeSpeedFeed(ctx: PipelineContext): Promise<StageResult> {
  const start = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const engine = _getEngine("SpeedFeedOrchestratorEngine");
    const computeFn = engine.compute ?? engine.recommend ?? engine.run;
    const operations = (ctx.process_plan as any)?.operations ?? [];
    const speedFeeds: any[] = [];

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      const toolEntry = ctx.tools?.[i];
      let sfResult: any = null;

      if (computeFn) {
        sfResult = await Promise.resolve(computeFn.call(engine, {
          material: ctx.input.material_spec,
          tool_diameter_mm: toolEntry?.tool?.diameter_mm,
          flutes: toolEntry?.tool?.flutes ?? toolEntry?.tool?.flute_count,
          operation: op.type ?? op.name,
          machine_name: ctx.input.machine_ids?.[0],
        }));
      }
      const resolved = sfResult?.value ?? sfResult;
      speedFeeds.push({
        operation_id: op.id ?? op.name,
        speed_feed: resolved,
      });
    }

    ctx.speed_feeds = speedFeeds;

    return {
      id: "SPEED_FEED",
      label: "Speed & Feed Optimization",
      status: "pass",
      duration_ms: Date.now() - start,
      result_summary: `Speed/feed computed for ${speedFeeds.length} operations`,
      output: { speed_feeds: speedFeeds },
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  } catch (err: any) {
    errors.push(`Speed/feed optimization failed: ${err?.message ?? String(err)}`);
    return {
      id: "SPEED_FEED",
      label: "Speed & Feed Optimization",
      status: "fail",
      duration_ms: Date.now() - start,
      result_summary: "Speed/feed optimization failed",
      output: null,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  }
}

/**
 * Infer process type from context — checks process_plan.primary_process first,
 * then falls back to feature-based inference if not explicitly set.
 */
function _inferProcessType(ctx: PipelineContext): string {
  const plan = ctx.process_plan as any;
  if (plan?.primary_process) return plan.primary_process;
  if (plan?.process_type) return plan.process_type;

  // Infer from features when process plan doesn't specify
  const features = ctx.features ?? [];
  const featureTypes = features.map((f: any) =>
    (f.type ?? f.feature_type ?? "").toLowerCase()
  );

  const hasLatheFeat = featureTypes.some((t: string) =>
    /turning|bore|od_profile|id_profile|thread|groove|parting|knurl|taper/.test(t)
  );
  const hasMillFeat = featureTypes.some((t: string) =>
    /pocket|slot|contour|face|hole|drill|tap|ream/.test(t)
  );
  const hasMultiAxis = featureTypes.some((t: string) =>
    /impeller|blisk|turbine|undercut_complex|5.?axis|multi.?axis|swarf/.test(t)
  );
  const hasEDM = featureTypes.some((t: string) =>
    /wire.?edm|sinker.?edm|edm|spark/.test(t)
  );
  const hasGrinding = featureTypes.some((t: string) =>
    /grind|cylindrical_grind|surface_grind|centerless/.test(t)
  );
  const hasLaser = featureTypes.some((t: string) =>
    /laser|laser_cut|laser_engrave/.test(t)
  );
  const hasWaterjet = featureTypes.some((t: string) =>
    /waterjet|water_jet|abrasive_jet/.test(t)
  );

  if (hasWaterjet) return "waterjet";
  if (hasLaser) return "laser";
  if (hasEDM) return "wire_edm";
  if (hasGrinding) return "grinding";
  if (hasMultiAxis) return "multi_axis";
  if (hasLatheFeat && hasMillFeat) return "mill_turn";
  if (hasLatheFeat) return "turning";
  return "milling"; // default
}

/**
 * Map process type to the correct program-generation engine name.
 */
const PROCESS_TO_ENGINE: Record<string, string> = {
  turning:     "TurningPrintToProgramEngine",
  mill_turn:   "MillTurnSwissPipelineEngine",
  swiss:       "MillTurnSwissPipelineEngine",
  multi_axis:  "MultiAxisPrintToProgramEngine",
  "5_axis":    "MultiAxisPrintToProgramEngine",
  grinding:    "GrindingProgramAssemblerEngine",
  wire_edm:    "EDMProgramAssemblerEngine",
  sinker_edm:  "EDMProgramAssemblerEngine",
  laser:       "LaserProgramAssemblerEngine",
  laser_cut:   "LaserProgramAssemblerEngine",
  waterjet:    "WaterjetProgramAssemblerEngine",
  milling:     "PrintToProgramPipelineEngine",
};

/** Execute PROGRAM_GENERATION stage. */
async function executeProgramGeneration(ctx: PipelineContext): Promise<StageResult> {
  const start = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    // Determine which pipeline to use based on process type
    const processType = _inferProcessType(ctx);
    const engineName = PROCESS_TO_ENGINE[processType] ?? "PrintToProgramPipelineEngine";

    if (processType !== "milling") {
      log.info(`[QuoteToShip] Stage 13: routing to ${engineName} for process '${processType}'`);
    }

    const engine = _getEngine(engineName);
    const generateFn = engine.generate ?? engine.run ?? engine.assemble;
    let result: any = null;

    if (generateFn) {
      result = await Promise.resolve(generateFn.call(engine, {
        features: ctx.features,
        process_plan: ctx.process_plan,
        tools: ctx.tools,
        strategies: ctx.strategies,
        speed_feeds: ctx.speed_feeds,
        material: ctx.input.material_spec,
        machine_ids: ctx.input.machine_ids,
        process_type: processType,
      }));
    } else {
      warnings.push(`${engineName}: using stub`);
      result = { programs: [], gcode: "" };
    }

    const resolved = result?.value ?? result;
    ctx.programs = resolved?.programs ?? [resolved];

    return {
      id: "PROGRAM_GENERATION",
      label: "CNC Program Generation",
      status: "pass",
      duration_ms: Date.now() - start,
      result_summary: `Generated ${(ctx.programs ?? []).length} program(s)`,
      output: resolved,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  } catch (err: any) {
    errors.push(`Program generation failed: ${err?.message ?? String(err)}`);
    return {
      id: "PROGRAM_GENERATION",
      label: "CNC Program Generation",
      status: "fail",
      duration_ms: Date.now() - start,
      result_summary: "Program generation failed",
      output: null,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  }
}

/** Execute POST_PROCESSING stage. */
async function executePostProcessing(ctx: PipelineContext): Promise<StageResult> {
  const start = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const engine = _getEngine("PostProcessorPipelineEngine");
    const postFn = engine.process ?? engine.postProcess ?? engine.run;
    let result: any = null;

    if (postFn) {
      result = await Promise.resolve(postFn.call(engine, {
        programs: ctx.programs,
        controller: ctx.input.controller ?? "fanuc",
        machine_ids: ctx.input.machine_ids,
      }));
    } else {
      warnings.push("PostProcessorPipelineEngine: using stub");
      result = { post_processed: ctx.programs, controller: ctx.input.controller ?? "fanuc" };
    }

    const resolved = result?.value ?? result;
    ctx.post_processed = resolved?.post_processed ?? resolved?.programs ?? [resolved];

    return {
      id: "POST_PROCESSING",
      label: "Controller-Specific Post Processing",
      status: "pass",
      duration_ms: Date.now() - start,
      result_summary: `Post-processed for ${ctx.input.controller ?? "fanuc"} controller`,
      output: resolved,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  } catch (err: any) {
    errors.push(`Post processing failed: ${err?.message ?? String(err)}`);
    return {
      id: "POST_PROCESSING",
      label: "Controller-Specific Post Processing",
      status: "fail",
      duration_ms: Date.now() - start,
      result_summary: "Post processing failed",
      output: null,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  }
}

/** Execute SETUP_SHEET stage. */
async function executeSetupSheet(ctx: PipelineContext): Promise<StageResult> {
  const start = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const engine = _getEngine("SetupSheetFromGCodeEngine");
    const generateFn = engine.generate ?? engine.create ?? engine.run;
    let result: any = null;

    if (generateFn) {
      result = await Promise.resolve(generateFn.call(engine, {
        programs: ctx.post_processed,
        tools: ctx.tools,
        material: ctx.input.material_spec,
        machine_ids: ctx.input.machine_ids,
      }));
    } else {
      warnings.push("SetupSheetFromGCodeEngine: using stub");
      result = { setup_sheet: {} };
    }

    const resolved = result?.value ?? result;
    ctx.setup_sheet = resolved;

    return {
      id: "SETUP_SHEET",
      label: "Setup Sheet Generation",
      status: "pass",
      duration_ms: Date.now() - start,
      result_summary: "Setup sheet generated",
      output: resolved,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  } catch (err: any) {
    errors.push(`Setup sheet generation failed: ${err?.message ?? String(err)}`);
    return {
      id: "SETUP_SHEET",
      label: "Setup Sheet Generation",
      status: "fail",
      duration_ms: Date.now() - start,
      result_summary: "Setup sheet generation failed",
      output: null,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  }
}

/** Execute PROBING stage. */
async function executeProbing(ctx: PipelineContext): Promise<StageResult> {
  const start = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const engine = _getEngine("ProbeRoutineGeneratorEngine");
    const generateFn = engine.generate ?? engine.createRoutines ?? engine.run;
    let result: any = null;

    if (generateFn) {
      const criticalFeatures = (ctx.features ?? []).filter((f: any) =>
        f?.tolerance_mm != null && f.tolerance_mm <= 0.025
        || f?.critical === true,
      );

      if (criticalFeatures.length === 0) {
        return {
          id: "PROBING",
          label: "Probe Routine Generation",
          status: "skip",
          duration_ms: Date.now() - start,
          result_summary: "No critical features requiring probing",
          output: null,
          warnings,
          errors,
          completed_at: new Date().toISOString(),
        };
      }

      result = await Promise.resolve(generateFn.call(engine, {
        features: criticalFeatures,
        controller: ctx.input.controller ?? "fanuc",
      }));
    } else {
      warnings.push("ProbeRoutineGeneratorEngine: using stub");
      result = { routines: [] };
    }

    const resolved = result?.value ?? result;
    ctx.probe_routines = resolved?.routines ?? [resolved];

    return {
      id: "PROBING",
      label: "Probe Routine Generation",
      status: "pass",
      duration_ms: Date.now() - start,
      result_summary: `Generated ${(ctx.probe_routines ?? []).length} probe routine(s)`,
      output: resolved,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  } catch (err: any) {
    // Probing is optional — degrade gracefully
    warnings.push(`Probe routine generation unavailable: ${err?.message ?? String(err)}`);
    return {
      id: "PROBING",
      label: "Probe Routine Generation",
      status: "skip",
      duration_ms: Date.now() - start,
      result_summary: "Probing skipped (optional)",
      output: null,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  }
}

/** Execute SIMULATION stage. */
async function executeSimulation(ctx: PipelineContext): Promise<StageResult> {
  const start = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const engine = _getEngine("CNCSimulationPipelineEngine");
    const simFn = engine.simulate ?? engine.verify ?? engine.run;
    let result: any = null;

    if (simFn) {
      result = await Promise.resolve(simFn.call(engine, {
        programs: ctx.post_processed,
        geometry: ctx.geometry,
        tools: ctx.tools,
        machine_ids: ctx.input.machine_ids,
      }));
    } else {
      warnings.push("CNCSimulationPipelineEngine: using stub");
      result = { passed: true, collisions: 0, gouges: 0 };
    }

    const resolved = result?.value ?? result;
    ctx.simulation = resolved;

    const passed = resolved?.passed ?? resolved?.valid ?? true;
    const collisions = resolved?.collisions ?? 0;
    const gouges = resolved?.gouges ?? 0;

    if (!passed || collisions > 0 || gouges > 0) {
      warnings.push(`Simulation issues: ${collisions} collision(s), ${gouges} gouge(s)`);
    }

    return {
      id: "SIMULATION",
      label: "CNC Simulation & Verification",
      status: passed ? "pass" : "fail",
      duration_ms: Date.now() - start,
      result_summary: passed
        ? "Simulation verified — no collisions or gouges"
        : `Simulation FAILED: ${collisions} collision(s), ${gouges} gouge(s)`,
      output: resolved,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  } catch (err: any) {
    // Simulation is optional — degrade gracefully
    warnings.push(`Simulation unavailable: ${err?.message ?? String(err)}`);
    return {
      id: "SIMULATION",
      label: "CNC Simulation & Verification",
      status: "skip",
      duration_ms: Date.now() - start,
      result_summary: "Simulation skipped (optional)",
      output: null,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  }
}

/** Execute PRODUCTION_PACKAGE stage. */
async function executeProductionPackage(ctx: PipelineContext): Promise<StageResult> {
  const start = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const engine = _getEngine("ProductionPackageEngine");
    const assembleFn = engine.assemble ?? engine.create ?? engine.run;
    let result: any = null;

    if (assembleFn) {
      result = await Promise.resolve(assembleFn.call(engine, {
        programs: ctx.post_processed,
        setup_sheet: ctx.setup_sheet,
        probe_routines: ctx.probe_routines,
        simulation: ctx.simulation,
        process_plan: ctx.process_plan,
        tools: ctx.tools,
        material: ctx.input.material_spec,
        quantity: ctx.input.quantity,
        customer_id: ctx.input.customer_id,
      }));
    } else {
      warnings.push("ProductionPackageEngine: using stub");
      result = {
        package_id: generatePipelineId(),
        components: ["programs", "setup_sheet", "probe_routines"],
      };
    }

    const resolved = result?.value ?? result;
    ctx.production_package = resolved;

    return {
      id: "PRODUCTION_PACKAGE",
      label: "Production Package Assembly",
      status: "pass",
      duration_ms: Date.now() - start,
      result_summary: `Production package assembled: ${resolved?.package_id ?? "complete"}`,
      output: resolved,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  } catch (err: any) {
    errors.push(`Production package assembly failed: ${err?.message ?? String(err)}`);
    return {
      id: "PRODUCTION_PACKAGE",
      label: "Production Package Assembly",
      status: "fail",
      duration_ms: Date.now() - start,
      result_summary: "Production package assembly failed",
      output: null,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  }
}

/** Execute JOB_LIFECYCLE stage. */
async function executeJobLifecycle(ctx: PipelineContext): Promise<StageResult> {
  const start = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const engine = _getEngine("JobLifecycleEngine");
    const createFn = engine.createJob ?? engine.track ?? engine.run;
    let result: any = null;

    if (createFn) {
      result = await Promise.resolve(createFn.call(engine, {
        production_package: ctx.production_package,
        customer_id: ctx.input.customer_id,
        material: ctx.input.material_spec,
        quantity: ctx.input.quantity,
        priority: ctx.input.priority,
        quote: ctx.quote,
      }));
    } else {
      warnings.push("JobLifecycleEngine: using stub");
      result = {
        job_id: generatePipelineId(),
        state: "created",
        states_available: 13,
      };
    }

    const resolved = result?.value ?? result;
    ctx.job = resolved;

    return {
      id: "JOB_LIFECYCLE",
      label: "Job Lifecycle Tracking",
      status: "pass",
      duration_ms: Date.now() - start,
      result_summary: `Job created: ${resolved?.job_id ?? "tracked"} — state: ${resolved?.state ?? "created"}`,
      output: resolved,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  } catch (err: any) {
    errors.push(`Job lifecycle tracking failed: ${err?.message ?? String(err)}`);
    return {
      id: "JOB_LIFECYCLE",
      label: "Job Lifecycle Tracking",
      status: "fail",
      duration_ms: Date.now() - start,
      result_summary: "Job lifecycle tracking failed",
      output: null,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  }
}

/** Execute QUALITY stage. */
async function executeQuality(ctx: PipelineContext): Promise<StageResult> {
  const start = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const engine = _getEngine("QualityManagementEngine");
    const initFn = engine.initializeQuality ?? engine.createFAI ?? engine.run;
    let result: any = null;

    if (initFn) {
      result = await Promise.resolve(initFn.call(engine, {
        job: ctx.job,
        features: ctx.features,
        tolerances: ctx.input.tolerances,
        surface_finish_ra_um: ctx.input.surface_finish_ra_um,
        process_plan: ctx.process_plan,
      }));
    } else {
      warnings.push("QualityManagementEngine: using stub");
      result = { fai_id: null, spc_charts: [], inspection_plan: {} };
    }

    const resolved = result?.value ?? result;
    ctx.quality = resolved;

    return {
      id: "QUALITY",
      label: "Quality Management (FAI + SPC)",
      status: "pass",
      duration_ms: Date.now() - start,
      result_summary: "Quality management initialized (FAI + SPC)",
      output: resolved,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  } catch (err: any) {
    // Quality is optional — degrade gracefully
    warnings.push(`Quality management unavailable: ${err?.message ?? String(err)}`);
    return {
      id: "QUALITY",
      label: "Quality Management (FAI + SPC)",
      status: "skip",
      duration_ms: Date.now() - start,
      result_summary: "Quality management skipped (optional)",
      output: null,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  }
}

/** Execute SHIPPING stage. */
async function executeShipping(ctx: PipelineContext): Promise<StageResult> {
  const start = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const packingEngine = _getEngine("PackingSlipEngine");
    const packFn = packingEngine.generate ?? packingEngine.create ?? packingEngine.run;
    let packingResult: any = null;

    if (packFn) {
      packingResult = await Promise.resolve(packFn.call(packingEngine, {
        job: ctx.job,
        customer_id: ctx.input.customer_id,
        quantity: ctx.input.quantity,
        material: ctx.input.material_spec,
      }));
    } else {
      warnings.push("PackingSlipEngine: using stub");
      packingResult = { packing_slip_id: generatePipelineId() };
    }

    // Material cert traceability
    let certResult: any = null;
    try {
      const certEngine = _getEngine("MaterialCertTraceabilityEngine");
      const certFn = certEngine.generateCert ?? certEngine.trace ?? certEngine.run;
      if (certFn) {
        certResult = await Promise.resolve(certFn.call(certEngine, {
          material: ctx.input.material_spec,
          job: ctx.job,
          material_data: ctx.material,
        }));
      }
    } catch {
      warnings.push("MaterialCertTraceabilityEngine: cert tracing unavailable");
    }

    const resolved = {
      packing_slip: packingResult?.value ?? packingResult,
      material_cert: certResult?.value ?? certResult,
    };
    ctx.shipping = resolved;

    return {
      id: "SHIPPING",
      label: "Shipping & Packing Slip",
      status: "pass",
      duration_ms: Date.now() - start,
      result_summary: "Packing slip and material cert generated",
      output: resolved,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  } catch (err: any) {
    errors.push(`Shipping stage failed: ${err?.message ?? String(err)}`);
    return {
      id: "SHIPPING",
      label: "Shipping & Packing Slip",
      status: "fail",
      duration_ms: Date.now() - start,
      result_summary: "Shipping stage failed",
      output: null,
      warnings,
      errors,
      completed_at: new Date().toISOString(),
    };
  }
}

// ============================================================================
// STAGE DISPATCH MAP
// ============================================================================

/** Maps stage IDs to their executor functions. */
const STAGE_EXECUTORS: Record<
  PipelineStageId,
  (ctx: PipelineContext) => Promise<StageResult>
> = {
  INTAKE: executeIntake,
  FEATURE_RECOGNITION: executeFeatureRecognition,
  DFM_CHECK: executeDfmCheck,
  FEASIBILITY: executeFeasibility,
  QUOTE: executeQuote,
  APPROVAL_GATE: executeApprovalGate,
  PROCESS_PLAN: executeProcessPlan,
  MAKE_VS_BUY: executeMakeVsBuy,
  MATERIAL_PROCUREMENT: executeMaterialProcurement,
  TOOL_SELECTION: executeToolSelection,
  STRATEGY_SELECTION: executeStrategySelection,
  SPEED_FEED: executeSpeedFeed,
  PROGRAM_GENERATION: executeProgramGeneration,
  POST_PROCESSING: executePostProcessing,
  SETUP_SHEET: executeSetupSheet,
  PROBING: executeProbing,
  SIMULATION: executeSimulation,
  PRODUCTION_PACKAGE: executeProductionPackage,
  JOB_LIFECYCLE: executeJobLifecycle,
  QUALITY: executeQuality,
  SHIPPING: executeShipping,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * QuoteToShipOrchestratorEngine — E1086
 *
 * Master orchestrator that chains 21 pipeline stages from initial quote
 * request through final shipping, connecting 23 downstream engines via
 * lazy-loaded references.
 */
class QuoteToShipOrchestratorEngine {
  /**
   * Run the full 21-stage pipeline from start to finish.
   *
   * If the approval gate is not pre-approved, the pipeline will pause
   * at stage 6 (APPROVAL_GATE) and return with status "awaiting_approval".
   * Use `runFromStage("PROCESS_PLAN", ...)` to resume after approval.
   *
   * @param input - Pipeline input specification
   * @returns Full pipeline result with per-stage details
   */
  async runFullPipeline(input: QuoteToShipInput): Promise<QuoteToShipResult> {
    const pipelineId = generatePipelineId();
    const pipelineStart = Date.now();
    const startedAt = new Date().toISOString();
    const ctx = createContext(input);
    const allWarnings: string[] = [];

    log?.info?.(`[QuoteToShipOrchestrator] Starting full pipeline ${pipelineId}`);

    // Validate input
    if (!input.drawing_pdf && !input.step_file) {
      allWarnings.push("No drawing_pdf or step_file provided — intake will fail");
    }
    if (!input.material_spec) {
      return this._buildResult(pipelineId, "failed", ctx, pipelineStart, startedAt, [
        "material_spec is required",
      ]);
    }

    // Execute stages sequentially
    for (const stageId of STAGE_ORDER) {
      const descriptor = STAGE_DESCRIPTORS.find(s => s.id === stageId)!;

      // Check prerequisites
      const { met, missing } = prerequisitesMet(stageId, ctx);
      if (!met) {
        if (descriptor.optional) {
          const skipResult: StageResult = {
            id: stageId,
            label: descriptor.label,
            status: "skip",
            duration_ms: 0,
            result_summary: `Skipped — prerequisite(s) not met: ${missing.join(", ")}`,
            output: null,
            warnings: [],
            errors: [],
            completed_at: new Date().toISOString(),
          };
          ctx.results.set(stageId, skipResult);
          continue;
        } else {
          const blockResult: StageResult = {
            id: stageId,
            label: descriptor.label,
            status: "blocked",
            duration_ms: 0,
            result_summary: `Blocked — prerequisite(s) failed: ${missing.join(", ")}`,
            output: null,
            warnings: [],
            errors: [`Required prerequisite(s) not met: ${missing.join(", ")}`],
            completed_at: new Date().toISOString(),
          };
          ctx.results.set(stageId, blockResult);

          // Non-optional blocked stage halts the pipeline
          log?.warn?.(
            `[QuoteToShipOrchestrator] Pipeline ${pipelineId} blocked at ${stageId}`,
          );
          return this._buildResult(pipelineId, "failed", ctx, pipelineStart, startedAt, allWarnings);
        }
      }

      // Execute stage
      log?.info?.(`[QuoteToShipOrchestrator] Executing stage: ${stageId}`);
      const executor = STAGE_EXECUTORS[stageId];
      const stageResult = await executor(ctx);
      ctx.results.set(stageId, stageResult);
      allWarnings.push(...stageResult.warnings);

      // Check for approval gate blocking
      if (stageId === "APPROVAL_GATE" && stageResult.status === "blocked") {
        log?.info?.(
          `[QuoteToShipOrchestrator] Pipeline ${pipelineId} paused at approval gate`,
        );
        return this._buildResult(
          pipelineId, "awaiting_approval", ctx, pipelineStart, startedAt, allWarnings,
        );
      }

      // Non-optional stage failure halts the pipeline
      if (stageResult.status === "fail" && !descriptor.optional) {
        log?.warn?.(
          `[QuoteToShipOrchestrator] Pipeline ${pipelineId} failed at ${stageId}`,
        );
        return this._buildResult(pipelineId, "failed", ctx, pipelineStart, startedAt, allWarnings);
      }

      log?.info?.(
        `[QuoteToShipOrchestrator] Stage ${stageId}: ${stageResult.status} (${stageResult.duration_ms}ms)`,
      );
    }

    log?.info?.(
      `[QuoteToShipOrchestrator] Pipeline ${pipelineId} complete (${Date.now() - pipelineStart}ms)`,
    );
    return this._buildResult(pipelineId, "complete", ctx, pipelineStart, startedAt, allWarnings);
  }

  /**
   * Resume the pipeline from a specific stage.
   *
   * Useful after the approval gate pause, or when re-running a specific
   * stage after input changes. Previous stage results can be injected
   * via the priorResults parameter.
   *
   * @param stageId - Stage to resume from
   * @param input - Pipeline input specification
   * @param priorResults - Optional map of already-completed stage results
   * @returns Pipeline result from the specified stage onward
   */
  async runFromStage(
    stageId: PipelineStageId,
    input: QuoteToShipInput,
    priorResults?: Record<string, StageResult>,
  ): Promise<QuoteToShipResult> {
    const pipelineId = generatePipelineId();
    const pipelineStart = Date.now();
    const startedAt = new Date().toISOString();
    const ctx = createContext(input);
    const allWarnings: string[] = [];

    // Inject prior results into context
    if (priorResults) {
      for (const [key, result] of Object.entries(priorResults)) {
        ctx.results.set(key as PipelineStageId, result);
        // Hydrate context fields from prior results
        this._hydrateContext(ctx, key as PipelineStageId, result);
      }
    }

    // If resuming after approval gate, mark it as passed
    if (stageId === "PROCESS_PLAN" && !ctx.results.has("APPROVAL_GATE")) {
      ctx.results.set("APPROVAL_GATE", {
        id: "APPROVAL_GATE",
        label: "Customer Approval Gate",
        status: "pass",
        duration_ms: 0,
        result_summary: "Approved (resumed from approval gate)",
        output: { approved: true, resumed: true },
        warnings: [],
        errors: [],
        completed_at: new Date().toISOString(),
      });
    }

    log?.info?.(
      `[QuoteToShipOrchestrator] Resuming pipeline ${pipelineId} from stage ${stageId}`,
    );

    const startIdx = STAGE_ORDER.indexOf(stageId);
    if (startIdx === -1) {
      allWarnings.push(`Unknown stage ID: ${stageId}`);
      return this._buildResult(pipelineId, "failed", ctx, pipelineStart, startedAt, allWarnings);
    }

    // Execute from the specified stage onward
    for (let i = startIdx; i < STAGE_ORDER.length; i++) {
      const currentStageId = STAGE_ORDER[i];
      const descriptor = STAGE_DESCRIPTORS.find(s => s.id === currentStageId)!;

      // Skip stages that already have results (unless it is the start stage)
      if (i !== startIdx && ctx.results.has(currentStageId)) {
        continue;
      }

      const { met, missing } = prerequisitesMet(currentStageId, ctx);
      if (!met) {
        if (descriptor.optional) {
          ctx.results.set(currentStageId, {
            id: currentStageId,
            label: descriptor.label,
            status: "skip",
            duration_ms: 0,
            result_summary: `Skipped — prerequisite(s) not met: ${missing.join(", ")}`,
            output: null,
            warnings: [],
            errors: [],
            completed_at: new Date().toISOString(),
          });
          continue;
        } else {
          ctx.results.set(currentStageId, {
            id: currentStageId,
            label: descriptor.label,
            status: "blocked",
            duration_ms: 0,
            result_summary: `Blocked — prerequisite(s) failed: ${missing.join(", ")}`,
            output: null,
            warnings: [],
            errors: [`Required prerequisite(s) not met: ${missing.join(", ")}`],
            completed_at: new Date().toISOString(),
          });
          return this._buildResult(pipelineId, "failed", ctx, pipelineStart, startedAt, allWarnings);
        }
      }

      const executor = STAGE_EXECUTORS[currentStageId];
      const stageResult = await executor(ctx);
      ctx.results.set(currentStageId, stageResult);
      allWarnings.push(...stageResult.warnings);

      if (currentStageId === "APPROVAL_GATE" && stageResult.status === "blocked") {
        return this._buildResult(
          pipelineId, "awaiting_approval", ctx, pipelineStart, startedAt, allWarnings,
        );
      }

      if (stageResult.status === "fail" && !descriptor.optional) {
        return this._buildResult(pipelineId, "failed", ctx, pipelineStart, startedAt, allWarnings);
      }
    }

    return this._buildResult(pipelineId, "complete", ctx, pipelineStart, startedAt, allWarnings);
  }

  /**
   * Get the current status of all pipeline stages.
   *
   * @param ctx - Pipeline context (from a running or completed pipeline)
   * @returns Array of stage statuses
   */
  getStatus(
    results: Map<PipelineStageId, StageResult> | Record<string, StageResult>,
  ): Array<{ id: PipelineStageId; label: string; status: string; duration_ms: number }> {
    const resultMap = results instanceof Map
      ? results
      : new Map(Object.entries(results) as [PipelineStageId, StageResult][]);

    return STAGE_DESCRIPTORS.map(desc => {
      const result = resultMap.get(desc.id);
      return {
        id: desc.id,
        label: desc.label,
        status: result?.status ?? "pending",
        duration_ms: result?.duration_ms ?? 0,
      };
    });
  }

  /**
   * Get the result of a specific stage from a pipeline run.
   *
   * @param stageId - Stage identifier
   * @param pipelineResult - Result from runFullPipeline or runFromStage
   * @returns Stage result or null if stage was not executed
   */
  getStageResult(
    stageId: PipelineStageId,
    pipelineResult: QuoteToShipResult,
  ): StageResult | null {
    return pipelineResult.stages.find(s => s.id === stageId) ?? null;
  }

  /**
   * Get the ordered list of all pipeline stage descriptors.
   * Useful for UI rendering and pipeline visualization.
   */
  getStageDescriptors(): StageDescriptor[] {
    return [...STAGE_DESCRIPTORS];
  }

  /**
   * Validate pipeline input before execution.
   *
   * @param input - Pipeline input to validate
   * @returns Validation result with any issues found
   */
  validateInput(input: QuoteToShipInput): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!input.material_spec) {
      errors.push("material_spec is required");
    }
    if (!input.quantity || input.quantity <= 0) {
      errors.push("quantity must be a positive number");
    }
    if (!input.drawing_pdf && !input.step_file) {
      errors.push("At least one of drawing_pdf or step_file is required");
    }
    if (input.drawing_pdf && input.step_file) {
      warnings.push("Both drawing_pdf and step_file provided — STEP file will be preferred");
    }
    if (!input.machine_ids || input.machine_ids.length === 0) {
      warnings.push("No machine_ids specified — will use default machine selection");
    }
    if (!input.controller) {
      warnings.push("No controller specified — will default to Fanuc");
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // ── Private Helpers ─────────────────────────────────────────────────

  /** Build the final pipeline result from context. */
  private _buildResult(
    pipelineId: string,
    status: QuoteToShipResult["status"],
    ctx: PipelineContext,
    pipelineStart: number,
    startedAt: string,
    warnings: string[],
  ): QuoteToShipResult {
    const stages: StageResult[] = STAGE_ORDER.map(id => {
      const result = ctx.results.get(id);
      if (result) return result;
      return {
        id,
        label: STAGE_DESCRIPTORS.find(s => s.id === id)?.label ?? id,
        status: "pending" as const,
        duration_ms: 0,
        result_summary: "",
        output: null,
        warnings: [],
        errors: [],
        completed_at: "",
      };
    });

    // Extract summary fields
    const quote = ctx.quote as any;
    const totalCost = quote?.price_usd ?? quote?.total_cost_usd ?? null;
    const leadTime = quote?.lead_time_days ?? null;

    const programPaths: string[] = [];
    if (ctx.post_processed) {
      for (const p of ctx.post_processed) {
        if (typeof p === "string") programPaths.push(p);
        else if (p?.path) programPaths.push(p.path);
        else if (p?.file_path) programPaths.push(p.file_path);
      }
    }

    return {
      pipeline_id: pipelineId,
      status,
      stages,
      total_cost_usd: totalCost,
      lead_time_days: leadTime,
      program_paths: programPaths,
      setup_sheet: ctx.setup_sheet,
      production_package: ctx.production_package,
      total_duration_ms: Date.now() - pipelineStart,
      warnings,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    };
  }

  /** Hydrate pipeline context from a prior stage result. */
  private _hydrateContext(
    ctx: PipelineContext,
    stageId: PipelineStageId,
    result: StageResult,
  ): void {
    if (!result.output) return;

    switch (stageId) {
      case "INTAKE":
        ctx.geometry = result.output;
        break;
      case "FEATURE_RECOGNITION":
        ctx.features = (result.output as any)?.features ?? result.output;
        break;
      case "DFM_CHECK":
        ctx.dfm = result.output;
        break;
      case "FEASIBILITY":
        ctx.feasibility = result.output;
        break;
      case "QUOTE":
        ctx.quote = result.output;
        break;
      case "PROCESS_PLAN":
        ctx.process_plan = result.output;
        break;
      case "MAKE_VS_BUY":
        ctx.make_vs_buy = result.output;
        break;
      case "MATERIAL_PROCUREMENT":
        ctx.material = result.output;
        break;
      case "TOOL_SELECTION":
        ctx.tools = (result.output as any)?.tools ?? result.output;
        break;
      case "STRATEGY_SELECTION":
        ctx.strategies = (result.output as any)?.strategies ?? result.output;
        break;
      case "SPEED_FEED":
        ctx.speed_feeds = (result.output as any)?.speed_feeds ?? result.output;
        break;
      case "PROGRAM_GENERATION":
        ctx.programs = (result.output as any)?.programs ?? [result.output];
        break;
      case "POST_PROCESSING":
        ctx.post_processed = (result.output as any)?.post_processed ?? [result.output];
        break;
      case "SETUP_SHEET":
        ctx.setup_sheet = result.output;
        break;
      case "PROBING":
        ctx.probe_routines = (result.output as any)?.routines ?? [result.output];
        break;
      case "SIMULATION":
        ctx.simulation = result.output;
        break;
      case "PRODUCTION_PACKAGE":
        ctx.production_package = result.output;
        break;
      case "JOB_LIFECYCLE":
        ctx.job = result.output;
        break;
      case "QUALITY":
        ctx.quality = result.output;
        break;
      case "SHIPPING":
        ctx.shipping = result.output;
        break;
    }
  }
}

// ============================================================================
// SINGLETON EXPORT — E1086
// ============================================================================

export const quoteToShipOrchestratorEngine = new QuoteToShipOrchestratorEngine();
export { QuoteToShipOrchestratorEngine };
