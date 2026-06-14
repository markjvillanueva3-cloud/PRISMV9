/**
 * Wire EDM Engine Registry & Capability Matrix
 *
 * Canonical registry of all 55 Wire EDM engines in PRISM.
 * Maps engine ids → capabilities, actions, and categories so
 * dispatchers and orchestrators can do runtime look-ups without
 * importing every engine.
 *
 * Usage:
 *   import { getWEDMEngineByCapability, getWEDMEngineStats } from "../data/wedm-engine-registry.js";
 *   const engines = getWEDMEngineByCapability("troubleshoot");
 *   const stats   = getWEDMEngineStats();
 *
 * @module data/wedm-engine-registry
 * @milestone WEDM-AWARE-MS1
 */

// ============================================================================
// SCHEMA VERSION
// ============================================================================

export const WEDM_REGISTRY_SCHEMA_VERSION = "1.0.0" as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Functional category that groups Wire EDM engines by primary responsibility.
 */
export type WEDMEngineCategory =
  | "ai"           // Master AI, reasoning, counterfactual, knowledge synthesis
  | "physics"      // Science models, surface integrity, stochastic, parameter physics
  | "calculator"   // Parameter calculators, flush calculators, cost calculators
  | "orchestration"// Full-workflow orchestrators (AGI, complete, batch)
  | "cam"          // CAM bridges, program generation, post-processing
  | "neural"       // Neural networks, deep learning, training, prediction
  | "quality"      // Surface quality, calibration, monitoring, integrity checks
  | "production"   // Scheduling, readiness, setup sheets, pre-flight
  | "setup"        // Machine settings, tech data, self-awareness integration
  | "knowledge";   // Tribal knowledge, research AI, CAM knowledge bases

/**
 * Capability keys used to look up engines in WEDM_CAPABILITY_MATRIX.
 */
export type WEDMCapabilityKey =
  | "parameters"    // Calculate / recommend EDM process parameters
  | "troubleshoot"  // Diagnose and resolve WEDM problems
  | "optimize"      // Optimize programs, strategies, or costs
  | "physics"       // Physics-based analysis (Ra, MRR, recast, spark gap)
  | "predict"       // Predictive intelligence (Ra, cycle time, wire break risk)
  | "cam"           // CAM-level program generation or parsing
  | "orchestrate"   // Full-workflow orchestration across multiple engines
  | "train"         // Neural network training on historical data
  | "quality"       // Surface integrity, quality assurance, calibration
  | "setup"         // Machine setup, pre-flight checks, settings configuration
  | "knowledge"     // Knowledge synthesis, research, tribal wisdom lookup
  | "schedule"      // Job scheduling and production planning
  | "cost"          // Cost estimation and documentation
  | "ai"            // AI/agent capability (master AI hub, agentic reasoning)
  | "reasoning";    // Chain-of-thought / explanation / interpretive reasoning

/**
 * A single Wire EDM engine entry in the registry.
 */
export interface WEDMEngineEntry {
  /** Unique snake_case identifier */
  id: string;
  /** TypeScript class name */
  name: string;
  /** Functional category */
  category: WEDMEngineCategory;
  /** One-line description of the engine's purpose */
  purpose: string;
  /** Approximate line count of the source file */
  lines: number;
  /** What this engine can do — maps to WEDMCapabilityKey values */
  capabilities: WEDMCapabilityKey[];
  /** Public method names / callable actions exposed by this engine */
  actions: string[];
}

/**
 * Maps a WEDMCapabilityKey to the engine IDs that provide it.
 */
export type WEDMCapabilityMatrix = Record<WEDMCapabilityKey, string[]>;

// ============================================================================
// ENGINE REGISTRY  (55 engines)
// ============================================================================

export const WEDM_ENGINE_REGISTRY: WEDMEngineEntry[] = [

  // ── AI ENGINES ─────────────────────────────────────────────────────────────

  {
    id: "wire_edm_master_ai",
    name: "WireEDMMasterAIEngine",
    category: "ai",
    purpose: "Master AI hub: strategic decisions, hybrid strategies, cost-optimized analysis, and critical program review",
    lines: 1474,
    capabilities: ["troubleshoot", "optimize", "parameters", "cost"],
    actions: [
      "analyze",
      "analyzeParameters",
      "troubleshoot",
      "optimizeProgram",
      "generateProgram",
      "optimizeForCost",
      "generateHybridStrategy",
      "criticalAnalysis",
    ],
  },

  {
    id: "wire_edm_deep_reasoning",
    name: "WireEDMDeepReasoningEngine",
    category: "ai",
    purpose: "Multi-mode reasoning engine: causal, diagnostic, analogical, probabilistic, and counterfactual chains",
    lines: 1081,
    capabilities: ["troubleshoot", "physics", "parameters"],
    actions: ["reason"],
  },

  {
    id: "wire_edm_neural_orchestration",
    name: "WireEDMNeuralOrchestrationEngine",
    category: "ai",
    purpose: "Unified neural orchestration combining physics, neural, and tribal knowledge for hybrid strategy selection",
    lines: 906,
    capabilities: ["orchestrate", "optimize", "troubleshoot", "cost"],
    actions: [
      "orchestrate",
      "getQuickParameters",
      "optimizeForCost",
      "recordFeedback",
      "troubleshoot",
      "compareStrategies",
    ],
  },

  {
    id: "wire_edm_deep_logic",
    name: "WireEDMDeepLogicEngine",
    category: "ai",
    purpose: "Deep logic reasoning with first-order logic, constraint propagation, and counterfactual analysis",
    lines: 828,
    capabilities: ["troubleshoot", "physics", "parameters"],
    actions: ["reason", "analyze", "counterfactual"],
  },

  {
    id: "wire_edm_deep_neural_reasoning",
    name: "WireEDMDeepNeuralReasoningEngine",
    category: "ai",
    purpose: "Neural-enhanced reasoning combining symbolic inference with learned pattern embeddings",
    lines: 1029,
    capabilities: ["troubleshoot", "predict", "parameters"],
    actions: ["reason", "infer", "diagnose"],
  },

  {
    id: "wire_edm_knowledge_synthesis",
    name: "WireEDMKnowledgeSynthesisEngine",
    category: "ai",
    purpose: "Bayesian evidence fusion across physics, tribal, and neural sources with conflict resolution",
    lines: 1465,
    capabilities: ["knowledge", "troubleshoot", "predict"],
    actions: ["synthesize", "fuse", "resolve"],
  },

  {
    id: "wire_edm_research_ai",
    name: "WireEDMResearchAIEngine",
    category: "ai",
    purpose: "Research-grade AI that integrates academic literature, manufacturer data, and empirical findings",
    lines: 1067,
    capabilities: ["knowledge", "physics", "parameters"],
    actions: ["research", "query", "summarize"],
  },

  {
    id: "wire_edm_cam_knowledge",
    name: "WireEDMCAMKnowledgeEngine",
    category: "knowledge",
    purpose: "CAM knowledge base: Mastercam, Mitsubishi FA-S, and Makino tech table integration",
    lines: 1124,
    capabilities: ["knowledge", "cam", "parameters"],
    actions: ["lookup", "recommend", "getCAMStrategy"],
  },

  {
    id: "wire_edm_self_awareness",
    name: "WireEDMSelfAwarenessIntegrationEngine",
    category: "setup",
    purpose: "PRISM self-awareness integration for Wire EDM: JM Die shop-specific context injection",
    lines: 690,
    capabilities: ["setup", "knowledge"],
    actions: ["getContext", "injectShopKnowledge", "getJMDiePrograms"],
  },

  {
    id: "wire_edm_machine_tech_data",
    name: "WireEDMMachineTechDataEngine",
    category: "setup",
    purpose: "Machine technical data catalog: Mitsubishi FA-S, Makino SP43/SP64, Sodick, Fanuc tech tables",
    lines: 862,
    capabilities: ["setup", "parameters", "knowledge"],
    actions: ["getMachineData", "getTechTable", "getEPackParams"],
  },

  // ── PHYSICS ENGINES ────────────────────────────────────────────────────────

  {
    id: "wire_edm_unified_science",
    name: "WireEDMUnifiedScienceEngine",
    category: "physics",
    purpose: "Unified physics: Klocke Ra model, Kunieda MRR, spark-gap physics, recast layer prediction, material properties",
    lines: 955,
    capabilities: ["physics", "predict", "parameters"],
    actions: [
      "analyze",
      "quickMRR",
      "quickRa",
      "predictRecastLayer",
      "getMaterialProperties",
      "listMaterials",
      "getPhysicalConstants",
    ],
  },

  {
    id: "edm_surface_integrity",
    name: "EDMSurfaceIntegrityEngine",
    category: "physics",
    purpose: "Surface integrity assessment: recast layer depth, white layer, HAZ, and Ra validation",
    lines: 210,
    capabilities: ["physics", "quality"],
    actions: ["assess", "validate"],
  },

  {
    id: "edm_cutting_param_flush",
    name: "EDMCuttingParamFlushEngine",
    category: "physics",
    purpose: "Flushing optimization and cutting parameter interaction physics for Wire EDM",
    lines: 1831,
    capabilities: ["physics", "parameters", "optimize"],
    actions: ["optimize", "analyze", "calculateFlushPressure"],
  },

  {
    id: "edm_toolpath_strategy",
    name: "EDMToolpathStrategyEngine",
    category: "physics",
    purpose: "Toolpath strategy selection: entry/exit, approach paths, corner compensation, taper handling",
    lines: 1224,
    capabilities: ["cam", "optimize", "physics"],
    actions: ["selectStrategy", "optimizePath", "calculateCornerOffset"],
  },

  {
    id: "stochastic_edm",
    name: "StochasticEDMEngine",
    category: "physics",
    purpose: "Stochastic uncertainty quantification for EDM parameters using Monte Carlo methods",
    lines: 349,
    capabilities: ["physics", "predict"],
    actions: ["simulate", "quantifyUncertainty", "monteCarlo"],
  },

  {
    id: "edm_bi_material_compensation",
    name: "EDMBiMaterialCompensationEngine",
    category: "physics",
    purpose: "Bi-material compensation for carbide/steel assemblies — offset corrections and spark-gap adjustment",
    lines: 943,
    capabilities: ["physics", "parameters"],
    actions: ["calculateCompensation", "adjustOffset", "analyze"],
  },

  {
    id: "edm_wire_slug_corner_taper",
    name: "EDMWireSlugCornerTaperEngine",
    category: "physics",
    purpose: "Slug management, corner radius compensation, and taper angle physics",
    lines: 961,
    capabilities: ["physics", "parameters", "cam"],
    actions: ["calculateTaper", "compensateCorner", "planSlugRemoval"],
  },

  {
    id: "micro_edm",
    name: "MicroEDMEngine",
    category: "physics",
    purpose: "Micro-EDM physics for features below 0.5mm: discharge energy scaling and electrode wear",
    lines: 155,
    capabilities: ["physics", "parameters"],
    actions: ["calculate", "scaleEnergy"],
  },

  // ── CALCULATOR ENGINES ─────────────────────────────────────────────────────

  {
    id: "wedm_calculator_ai",
    name: "WEDMCalculatorAIEngine",
    category: "calculator",
    purpose: "AI-enhanced parameter calculator: feed rate, pulse energy, wire tension, and wire selection",
    lines: 688,
    capabilities: ["parameters", "predict"],
    actions: ["calculate", "selectWireWithAI"],
  },

  {
    id: "edm_parameter",
    name: "EDMParameterEngine",
    category: "calculator",
    purpose: "E-pack parameter calculation: on-time, off-time, peak current, and servo voltage",
    lines: 195,
    capabilities: ["parameters"],
    actions: ["calculate"],
  },

  {
    id: "edm_material_machine_wire",
    name: "EDMMaterialMachineWireEngine",
    category: "calculator",
    purpose: "Tri-axis selection matrix: material × machine × wire diameter → optimal E-pack family",
    lines: 1753,
    capabilities: ["parameters", "setup"],
    actions: ["select", "recommend", "validateCombination"],
  },

  {
    id: "sinker_edm_calculator",
    name: "SinkerEDMCalculatorEngine",
    category: "calculator",
    purpose: "Sinker EDM parameter calculator: electrode wear ratio, orbiting strategy, finishing passes",
    lines: 363,
    capabilities: ["parameters"],
    actions: ["calculate", "estimateWear"],
  },

  {
    id: "edm_cost_documentation",
    name: "EDMCostDocumentationEngine",
    category: "calculator",
    purpose: "EDM job cost estimation: wire consumption, cycle time, electrode cost, operator labor",
    lines: 1299,
    capabilities: ["cost", "parameters"],
    actions: ["estimate", "document", "generateReport"],
  },

  {
    id: "edm_feasibility",
    name: "EDMFeasibilityEngine",
    category: "calculator",
    purpose: "Part feasibility analysis: geometry, tolerances, surface requirements, and machine capability matching",
    lines: 938,
    capabilities: ["quality", "parameters", "setup"],
    actions: ["analyze", "check", "recommend"],
  },

  // ── ORCHESTRATION ENGINES ──────────────────────────────────────────────────

  {
    id: "wire_edm_agi_orchestrator",
    name: "WireEDMAGIOrchestrator",
    category: "orchestration",
    purpose: "Top-level AGI orchestrator: routes requests through all Wire EDM engines with adaptive weighting",
    lines: 1011,
    capabilities: ["orchestrate", "optimize", "predict", "troubleshoot"],
    actions: ["process", "quickPredict", "recordFeedback", "getStatus"],
  },

  {
    id: "wedm_complete_orchestration",
    name: "WEDMCompleteOrchestrationEngine",
    category: "orchestration",
    purpose: "Complete program generation orchestration: drawing → parameters → G-code → validation pipeline",
    lines: 3465,
    capabilities: ["orchestrate", "cam", "optimize", "parameters"],
    actions: ["generateCompleteProgram"],
  },

  {
    id: "wedm_batch_program_analyzer",
    name: "WEDMBatchProgramAnalyzerEngine",
    category: "orchestration",
    purpose: "Batch analysis of Wire EDM programs: pattern recognition, tribal extraction, quality scoring",
    lines: 1216,
    capabilities: ["orchestrate", "knowledge", "quality"],
    actions: ["analyzeBatch", "extractPatterns", "scorePrograms"],
  },

  {
    id: "edm_quality_orchestrator",
    name: "EDMQualityOrchestratorEngine",
    category: "orchestration",
    purpose: "Quality orchestration: SPC, surface integrity, dimensional accuracy, FAI coordination",
    lines: 2612,
    capabilities: ["quality", "orchestrate"],
    actions: ["orchestrate", "runSPC", "validateDimensions", "generateFAI"],
  },

  {
    id: "edm_program_assembler",
    name: "EDMProgramAssemblerEngine",
    category: "orchestration",
    purpose: "Final program assembly: header generation, G-code stitching, offset tables, and M-code mapping",
    lines: 1897,
    capabilities: ["cam", "orchestrate"],
    actions: ["assemble", "stitch", "generateHeader"],
  },

  {
    id: "edm_multi_pass_strategy",
    name: "EDMMultiPassStrategyEngine",
    category: "orchestration",
    purpose: "Multi-pass strategy engine: E-code family selection, trim pass sequencing, spark erosion sequencing",
    lines: 1302,
    capabilities: ["optimize", "parameters", "cam"],
    actions: ["plan", "select", "sequence"],
  },

  {
    id: "wedm_scheduling",
    name: "WEDMSchedulingEngine",
    category: "production",
    purpose: "Wire EDM job scheduling: queue management, shift planning, machine utilization optimization",
    lines: 197,
    capabilities: ["schedule"],
    actions: ["schedule", "prioritize", "estimateQueue"],
  },

  // ── CAM ENGINES ────────────────────────────────────────────────────────────

  {
    id: "wire_edm_program_parser",
    name: "WireEDMProgramParserEngine",
    category: "cam",
    purpose: "Parse .NC / .MIN Wire EDM programs: extract geometry, E-codes, passes, and metadata",
    lines: 738,
    capabilities: ["cam", "knowledge"],
    actions: ["parse", "extractCuttingData"],
  },

  {
    id: "wedm_print_to_program",
    name: "WEDMPrintToProgramEngine",
    category: "cam",
    purpose: "Drawing-to-program pipeline: DXF → contour → Wire EDM G-code with full parameter selection",
    lines: 1817,
    capabilities: ["cam", "parameters", "orchestrate"],
    actions: ["generate"],
  },

  {
    id: "wire_edm_ai_print_to_program",
    name: "WireEDMAIPrintToProgramEngine",
    category: "cam",
    purpose: "AI-enhanced print-to-program with feature recognition, tolerance interpretation, and auto-strategy selection",
    lines: 1129,
    capabilities: ["cam", "parameters", "optimize", "ai", "reasoning"],
    actions: ["generate", "quickPredictMRR", "quickPredictRa", "explainCausalEffect", "getCounterfactuals"],
  },

  {
    id: "edm_post_process_gcode",
    name: "EDMPostProcessGCodeEngine",
    category: "cam",
    purpose: "G-code post-processor for Wire EDM: Mitsubishi M800/M700, Makino MGW, Sodick LNW, Fanuc dialects",
    lines: 2893,
    capabilities: ["cam"],
    actions: ["postProcess", "translate", "validate"],
  },

  {
    id: "edm_post_processor_extension",
    name: "EDMPostProcessorExtension",
    category: "cam",
    purpose: "Extension layer for EDM post-processing: macro generation, sub-program nesting, cycle calls",
    lines: 863,
    capabilities: ["cam"],
    actions: ["extend", "generateMacro", "nestSubprogram"],
  },

  {
    id: "hypermill_edm_bridge",
    name: "HyperMillEDMBridge",
    category: "cam",
    purpose: "Bridge between hyperMILL CAM and Wire EDM engines: strategy mapping and parameter translation",
    lines: 366,
    capabilities: ["cam", "parameters"],
    actions: ["bridge", "mapStrategy", "translateParams"],
  },

  {
    id: "edm_drawing_interpretation",
    name: "EDMDrawingInterpretationEngine",
    category: "cam",
    purpose: "Engineering drawing interpretation: GD&T parsing, tolerance extraction, and feature classification",
    lines: 886,
    capabilities: ["cam", "quality"],
    actions: ["interpret", "parseGDT", "classifyFeatures"],
  },

  {
    id: "edm_start_hole_setup",
    name: "EDMStartHoleSetupEngine",
    category: "cam",
    purpose: "Start hole planning: diameter selection, location strategy, slugging sequence, tapping recommendations",
    lines: 1349,
    capabilities: ["cam", "setup"],
    actions: ["plan", "selectDiameter", "generateSequence"],
  },

  // ── NEURAL / TRAINING ENGINES ──────────────────────────────────────────────

  {
    id: "wedm_neural_training",
    name: "WEDMNeuralTrainingEngine",
    category: "neural",
    purpose: "Maximum mathematical AI: Bayesian inference, Gaussian Process, ensemble neural networks, Monte Carlo optimization",
    lines: 2436,
    capabilities: ["train", "predict", "optimize"],
    actions: [
      "train",
      "predictRa",
      "predictMRR",
      "predictWireLife",
      "predictWireBreakRisk",
      "predictWireLifeAdvanced",
      "predictOptimalPasses",
      "predictCycleTime",
      "predictScrapRisk",
      "generateOptimizations",
      "calculateFeatureImportance",
    ],
  },

  {
    id: "wire_edm_advanced_neural",
    name: "WireEDMAdvancedNeuralEngine",
    category: "neural",
    purpose: "Advanced neural architectures: CNN, DNN, attention, GNN, reinforcement learning, transfer learning",
    lines: 1126,
    capabilities: ["train", "predict"],
    actions: [
      "createFeatureVector",
      "predictParameters",
      "predictWireBreakage",
      "predictSurfaceRoughness",
    ],
  },

  {
    id: "wire_edm_predictive_intelligence",
    name: "WireEDMPredictiveIntelligenceEngine",
    category: "neural",
    purpose: "Real-time predictive intelligence: Ra, cycle time, wire-break risk, cost, quality, and pass strategy with confidence intervals",
    lines: 1016,
    capabilities: ["predict", "optimize", "cost"],
    actions: ["predict"],
  },

  {
    id: "wire_edm_deep_ai_hardening",
    name: "WireEDMDeepAIHardeningEngine",
    category: "neural",
    purpose: "Cross-engine AI hardening layer: integrates 15+ engines, physics-validated output, tribal knowledge overlay",
    lines: 1718,
    capabilities: ["orchestrate", "physics", "parameters", "optimize"],
    actions: [
      "analyzeWEDMOperation",
      "optimizeWEDMStrategy",
      "validateWEDMSetup",
      "selectWireType",
      "calculateCycleTime",
    ],
  },

  {
    id: "wedm_program_neural_analysis",
    name: "WEDMProgramNeuralAnalysisEngine",
    category: "neural",
    purpose: "Neural analysis of existing Wire EDM programs: pattern extraction, optimization recommendations, quality scoring",
    lines: 1888,
    capabilities: ["train", "knowledge", "quality"],
    actions: ["analyzeProgram", "extractPatterns", "recommendOptimizations"],
  },

  // ── QUALITY ENGINES ────────────────────────────────────────────────────────

  {
    id: "edm_monitor_surface_integrity",
    name: "EDMMonitorSurfaceIntegrityEngine",
    category: "quality",
    purpose: "Real-time surface integrity monitoring: Ra trending, recast layer prediction, HAZ detection",
    lines: 1310,
    capabilities: ["quality", "predict"],
    actions: ["monitor", "trend", "alert"],
  },

  {
    id: "wedm_calibration_report",
    name: "WEDMCalibrationReportEngine",
    category: "quality",
    purpose: "Calibration reporting: dimensional accuracy tracking, machine drift detection, SPC charts",
    lines: 391,
    capabilities: ["quality"],
    actions: ["generateReport", "trackDrift", "assessAccuracy"],
  },

  {
    id: "wedm_feedback_calibration",
    name: "WEDMFeedbackCalibrationEngine",
    category: "quality",
    purpose: "Closed-loop feedback calibration: actual vs. predicted Ra comparison, parameter correction learning",
    lines: 229,
    capabilities: ["quality", "train"],
    actions: ["calibrate", "recordFeedback", "correct"],
  },

  {
    id: "wedm_pre_flight_check",
    name: "WEDMPreFlightCheckEngine",
    category: "production",
    purpose: "Pre-flight validation: wire threading, water quality, workpiece clamping, axis reference checks",
    lines: 677,
    capabilities: ["setup", "quality"],
    actions: ["check", "validate", "generateChecklist"],
  },

  // ── PRODUCTION ENGINES ─────────────────────────────────────────────────────

  {
    id: "wedm_production_readiness",
    name: "WEDMProductionReadinessEngine",
    category: "production",
    purpose: "Production readiness gate: program validation, fixture check, material confirmation, operator sign-off",
    lines: 532,
    capabilities: ["setup", "quality"],
    actions: ["assess", "validate", "generateGateReport"],
  },

  {
    id: "wedm_program_index",
    name: "WedmProgramIndexEngine",
    category: "production",
    purpose: "Index and search Wire EDM program archive: customer lookup, part number search, program history",
    lines: 586,
    capabilities: ["knowledge", "cam"],
    actions: ["index", "search", "lookup"],
  },

  {
    id: "wedm_setup_sheet",
    name: "WEDMSetupSheetEngine",
    category: "production",
    purpose: "Setup sheet generation: fixture instructions, wire setup, parameter tables, operator guidance",
    lines: 623,
    capabilities: ["setup"],
    actions: ["generate", "populate", "export"],
  },

  // ── SETUP / SETTINGS ENGINES ───────────────────────────────────────────────

  {
    id: "wire_edm_settings",
    name: "WireEDMSettingsEngine",
    category: "setup",
    purpose: "Machine settings management: E-pack presets, controller profiles, wire parameter persistence",
    lines: 509,
    capabilities: ["setup", "parameters"],
    actions: ["load", "save", "apply", "getDefaults"],
  },

  {
    id: "edm_engine",
    name: "EDMEngine",
    category: "calculator",
    purpose: "Core EDM engine: fundamental spark erosion calculations and material removal baseline",
    lines: 293,
    capabilities: ["parameters", "physics"],
    actions: ["calculate", "estimateMRR"],
  },

  {
    id: "edm_wire_engine",
    name: "EDMWireEngine",
    category: "physics",
    purpose: "Wire EDM physics core: wire tension, spark gap, straightness error, and wire break threshold",
    lines: 131,
    capabilities: ["physics", "parameters"],
    actions: ["calculate", "checkBreakRisk"],
  },

] as const satisfies WEDMEngineEntry[];

// ============================================================================
// CAPABILITY MATRIX
// ============================================================================

/**
 * WEDM_CAPABILITY_MATRIX
 *
 * Maps each WEDMCapabilityKey to the engine IDs that provide that capability.
 * Built automatically from WEDM_ENGINE_REGISTRY — stays in sync with the registry.
 */
function buildCapabilityMatrix(): WEDMCapabilityMatrix {
  const matrix: Record<string, string[]> = {
    parameters:  [],
    troubleshoot:[],
    optimize:    [],
    physics:     [],
    predict:     [],
    cam:         [],
    orchestrate: [],
    train:       [],
    quality:     [],
    setup:       [],
    knowledge:   [],
    schedule:    [],
    cost:        [],
  };

  for (const engine of WEDM_ENGINE_REGISTRY) {
    for (const cap of engine.capabilities) {
      if (matrix[cap] !== undefined) {
        matrix[cap].push(engine.id);
      }
    }
  }

  return matrix as WEDMCapabilityMatrix;
}

export const WEDM_CAPABILITY_MATRIX: WEDMCapabilityMatrix = buildCapabilityMatrix();

// ============================================================================
// LOOKUP FUNCTIONS
// ============================================================================

/**
 * Return all engine entries that provide a given capability.
 *
 * @param capability - A WEDMCapabilityKey (e.g. "troubleshoot", "predict")
 * @returns Array of WEDMEngineEntry sorted by lines desc (most capable first)
 *
 * @example
 * const troubleshooters = getWEDMEngineByCapability("troubleshoot");
 * // → [WireEDMMasterAIEngine, WireEDMNeuralOrchestrationEngine, …]
 */
export function getWEDMEngineByCapability(capability: WEDMCapabilityKey): WEDMEngineEntry[] {
  const ids = WEDM_CAPABILITY_MATRIX[capability] ?? [];
  return WEDM_ENGINE_REGISTRY
    .filter((e) => ids.includes(e.id))
    .sort((a, b) => b.lines - a.lines);
}

/**
 * Return the first engine entry that exposes a given action name.
 *
 * @param action - Public method name (e.g. "predictRa", "parse", "orchestrate")
 * @returns WEDMEngineEntry or undefined if no engine exposes that action
 *
 * @example
 * const engine = getWEDMEngineByAction("predictRa");
 * // → { name: "WEDMNeuralTrainingEngine", … }
 */
export function getWEDMEngineByAction(action: string): WEDMEngineEntry | undefined {
  return WEDM_ENGINE_REGISTRY.find((e) => e.actions.includes(action));
}

/**
 * Return aggregate statistics for the WEDM engine registry.
 *
 * @returns { total, byCategory, capabilities }
 *
 * @example
 * const stats = getWEDMEngineStats();
 * stats.total          // 55
 * stats.byCategory     // { ai: 7, physics: 8, … }
 * stats.capabilities   // { troubleshoot: 5, predict: 8, … }
 */
export function getWEDMEngineStats(): {
  total: number;
  byCategory: Record<WEDMEngineCategory, number>;
  capabilities: Record<WEDMCapabilityKey, number>;
} {
  const byCategory: Partial<Record<WEDMEngineCategory, number>> = {};
  const capabilities: Partial<Record<WEDMCapabilityKey, number>> = {};

  for (const engine of WEDM_ENGINE_REGISTRY) {
    byCategory[engine.category] = (byCategory[engine.category] ?? 0) + 1;
    for (const cap of engine.capabilities) {
      capabilities[cap] = (capabilities[cap] ?? 0) + 1;
    }
  }

  return {
    total: WEDM_ENGINE_REGISTRY.length,
    byCategory: byCategory as Record<WEDMEngineCategory, number>,
    capabilities: capabilities as Record<WEDMCapabilityKey, number>,
  };
}
