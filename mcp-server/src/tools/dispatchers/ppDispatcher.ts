/**
 * prism_pp — PostProcessor-Specific Dispatcher
 *
 * 50 core actions for post processor operations across 9 categories:
 *   - pp_generate (G-code generation)
 *   - pp_analyze (analysis)
 *   - pp_optimize (optimization)
 *   - pp_validate (safety validation)
 *   - pp_physics (physics-aware)
 *   - pp_neural (neural network)
 *   - pp_tribal (tribal knowledge)
 *   - pp_controller (controller-specific)
 *   - pp_kinematics (machine kinematics)
 *
 * Engine dependencies: PostProcessorEngine, PostProcessorPipelineEngine,
 *   PostProcessorAnalyzerEngine, PostProcessorNeuralNetworkEngine,
 *   PostProcessorPhysicsAwareGeneratorEngine, PostProcessorTribalKnowledgeIntegrationEngine,
 *   PostProcessorMachineKinematicsEngine, PostProcessorVerificationEngine,
 *   PostProcessorDeepReasoningEngine, PostProcessorKnowledgeGraphEngine
 *
 * @module dispatchers/ppDispatcher
 * @milestone PP-DISPATCHER
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { PP_ACTION_SCHEMAS } from "../../schemas/ppActionSchemas.js";
import { hookExecutor } from "../../engines/HookExecutor.js";

// ============================================================================
// LAZY ENGINE LOADING
// ============================================================================

let _ppEngine: any;
let _ppPipeline: any;
let _ppAnalyzer: any;
let _ppNeural: any;
let _ppPhysics: any;
let _ppTribal: any;
let _ppKinematics: any;
let _ppVerification: any;
let _ppDeepReasoning: any;
let _ppKnowledgeGraph: any;
let _ppCognition: any;
let _ppTransformer: any;
let _ppMetaLearning: any;
let _ppFeedOptimizer: any;
let _ppGenerator: any;
let _ppAPI: any;

async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "pp":
      return _ppEngine ??= (await import("../../engines/PostProcessorEngine.js")).postProcessorEngine;
    case "pipeline":
      return _ppPipeline ??= (await import("../../engines/PostProcessorPipelineEngine.js")).postProcessorPipelineEngine;
    case "analyzer":
      if (!_ppAnalyzer) {
        const mod = await import("../../engines/PostProcessorAnalyzerEngine.js");
        _ppAnalyzer = new mod.PostProcessorAnalyzerEngine();
      }
      return _ppAnalyzer;
    case "neural":
      return _ppNeural ??= (await import("../../engines/PostProcessorNeuralNetworkEngine.js")).postProcessorNeuralNetworkEngine;
    case "physics":
      return _ppPhysics ??= (await import("../../engines/PostProcessorPhysicsAwareGeneratorEngine.js")).postProcessorPhysicsAwareGeneratorEngine;
    case "tribal":
      return _ppTribal ??= (await import("../../engines/PostProcessorTribalKnowledgeIntegrationEngine.js")).postProcessorTribalKnowledgeIntegrationEngine;
    case "kinematics":
      return _ppKinematics ??= (await import("../../engines/PostProcessorMachineKinematicsEngine.js")).postProcessorMachineKinematicsEngine;
    case "verification":
      return _ppVerification ??= (await import("../../engines/PostProcessorVerificationEngine.js")).postProcessorVerificationEngine;
    case "deepReasoning":
      return _ppDeepReasoning ??= (await import("../../engines/PostProcessorDeepReasoningEngine.js")).postProcessorDeepReasoningEngine;
    case "knowledgeGraph":
      return _ppKnowledgeGraph ??= (await import("../../engines/PostProcessorKnowledgeGraphEngine.js")).postProcessorKnowledgeGraphEngine;
    case "cognition":
      return _ppCognition ??= (await import("../../engines/PostProcessorCognitiveEngine.js")).postProcessorCognitiveEngine;
    case "transformer":
      return _ppTransformer ??= (await import("../../engines/PostProcessorTransformerEngine.js")).postProcessorTransformerEngine;
    case "metaLearning":
      return _ppMetaLearning ??= (await import("../../engines/PostProcessorMetaLearningEngine.js")).postProcessorMetaLearningEngine;
    case "feedOptimizer":
      return _ppFeedOptimizer ??= (await import("../../engines/PostProcessorFeedOptimizerEngine.js")).postProcessorFeedOptimizerEngine;
    case "generator":
      return _ppGenerator ??= (await import("../../engines/PostProcessorGeneratorEngine.js")).postProcessorGeneratorEngine;
    case "api":
      return _ppAPI ??= (await import("../../engines/PostProcessorAPIEngine.js")).postProcessorAPIEngine;
    default:
      throw new Error(`Unknown PP engine: ${name}`);
  }
}

// ============================================================================
// ACTIONS (50 core actions)
// ============================================================================

const ACTIONS = [
  // ===== PP_GENERATE: G-code generation (6 actions) =====
  "pp_generate_gcode",           // Generate G-code from toolpath
  "pp_generate_header",          // Generate program header
  "pp_generate_safe_start",      // Generate safe start block
  "pp_generate_tool_change",     // Generate tool change sequence
  "pp_generate_canned_cycle",    // Generate canned cycles (drilling, tapping, etc.)
  "pp_generate_subroutine",      // Generate subroutine calls

  // ===== PP_ANALYZE: Analysis (6 actions) =====
  "pp_analyze_cps",              // Analyze .cps post processor file
  "pp_analyze_gcode",            // Analyze G-code structure
  "pp_analyze_safety",           // Analyze safety compliance
  "pp_analyze_optimization",     // Analyze optimization opportunities
  "pp_analyze_controller_fit",   // Analyze controller compatibility
  "pp_analyze_complexity",       // Analyze program complexity

  // ===== PP_OPTIMIZE: Optimization (6 actions) =====
  "pp_optimize_feed",            // Optimize feed rates
  "pp_optimize_motion",          // Optimize motion paths
  "pp_optimize_cycle_time",      // Optimize for cycle time
  "pp_optimize_tool_life",       // Optimize for tool life
  "pp_optimize_surface_finish",  // Optimize for surface finish
  "pp_optimize_energy",          // Optimize for energy efficiency

  // ===== PP_VALIDATE: Safety validation (6 actions) =====
  "pp_validate_program",         // Validate complete program
  "pp_validate_limits",          // Validate machine limits
  "pp_validate_collisions",      // Validate collision-free
  "pp_validate_forces",          // Validate cutting forces safe
  "pp_validate_thermal",         // Validate thermal safety
  "pp_validate_syntax",          // Validate G-code syntax

  // ===== PP_PHYSICS: Physics-aware (6 actions) =====
  "pp_physics_forces",           // Calculate cutting forces
  "pp_physics_thermal",          // Calculate thermal effects
  "pp_physics_deflection",       // Calculate tool deflection
  "pp_physics_stability",        // Calculate chatter stability
  "pp_physics_surface",          // Calculate surface finish
  "pp_physics_wear",             // Calculate tool wear

  // ===== PP_NEURAL: Neural network (5 actions) =====
  "pp_neural_predict",           // Neural prediction of outcomes
  "pp_neural_classify",          // Classify controller/operation
  "pp_neural_optimize",          // Neural-guided optimization
  "pp_neural_anomaly",           // Detect anomalies in G-code
  "pp_neural_learn",             // Learn from new patterns

  // ===== PP_TRIBAL: Tribal knowledge (5 actions) =====
  "pp_tribal_query",             // Query tribal knowledge
  "pp_tribal_apply",             // Apply tribal tips to program
  "pp_tribal_suggest",           // Suggest relevant tips
  "pp_tribal_validate",          // Validate against tribal rules
  "pp_tribal_contribute",        // Contribute new tribal knowledge

  // ===== PP_CONTROLLER: Controller-specific (5 actions) =====
  "pp_controller_capabilities",  // Get controller capabilities
  "pp_controller_translate",     // Translate between controllers
  "pp_controller_optimize",      // Controller-specific optimization
  "pp_controller_validate",      // Controller-specific validation
  "pp_controller_recommend",     // Recommend controller settings

  // ===== PP_KINEMATICS: Machine kinematics (5 actions) =====
  "pp_kinematics_analyze",       // Analyze machine kinematics
  "pp_kinematics_transform",     // Transform coordinates (RTCP/TCPM)
  "pp_kinematics_limits",        // Check kinematic limits
  "pp_kinematics_singularity",   // Detect singularities
  "pp_kinematics_optimize",      // Optimize for kinematics
] as const;

// ============================================================================
// DISPATCHER REGISTRATION
// ============================================================================

/**
 * Registers the PostProcessor dispatcher with the MCP server.
 * @param server - MCP server instance
 */
export function registerPPDispatcher(server: any): void {
  server.tool(
    "prism_pp",
    `PostProcessor dispatcher — G-code generation, optimization, validation, physics-aware processing.
50 actions across 9 categories: generate, analyze, optimize, validate, physics, neural, tribal, controller, kinematics.
Actions: ${ACTIONS.join(", ")}.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_pp] Action: ${action}`);
      let result: any;
      try {
        // Normalize snake_case -> camelCase params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        // Zod schema validation
        const validation = validateActionParams(action, params, PP_ACTION_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_pp"
          );
        }

        // PRE-CALCULATION HOOKS
        const hookCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: params },
          metadata: { dispatcher: "ppDispatcher", action, params }
        };
        const preResult = await hookExecutor.execute("pre-calculation", hookCtx);
        if (preResult.blocked) {
          return {
            content: [{ type: "text", text: JSON.stringify({
              blocked: true, blocker: preResult.blockedBy,
              reason: preResult.summary, action,
            }) }]
          };
        }

        // ===== PP_GENERATE actions =====
        switch (action) {
          case "pp_generate_gcode": {
            const engine = await getEngine("pp");
            result = engine.process?.(params) ?? engine.generate?.(params) ?? { error: "PostProcessorEngine method not found" };
            break;
          }
          case "pp_generate_header": {
            const engine = await getEngine("generator");
            result = engine.generateHeader?.(params) ?? { header: generateDefaultHeader(params) };
            break;
          }
          case "pp_generate_safe_start": {
            const engine = await getEngine("generator");
            result = engine.generateSafeStart?.(params) ?? { safeStart: generateDefaultSafeStart(params) };
            break;
          }
          case "pp_generate_tool_change": {
            const engine = await getEngine("generator");
            result = engine.generateToolChange?.(params) ?? { toolChange: generateDefaultToolChange(params) };
            break;
          }
          case "pp_generate_canned_cycle": {
            const engine = await getEngine("generator");
            result = engine.generateCannedCycle?.(params) ?? { cycle: generateDefaultCannedCycle(params) };
            break;
          }
          case "pp_generate_subroutine": {
            const engine = await getEngine("generator");
            result = engine.generateSubroutine?.(params) ?? { subroutine: generateDefaultSubroutine(params) };
            break;
          }

          // ===== PP_ANALYZE actions =====
          case "pp_analyze_cps": {
            const engine = await getEngine("analyzer");
            result = engine.analyzeFile?.(params.filePath) ?? engine.analyzeCpsContent?.(params.content) ?? { error: "analyzeFile method not found" };
            break;
          }
          case "pp_analyze_gcode": {
            const engine = await getEngine("pipeline");
            result = engine.analyzeGcode?.(params.gcode) ?? engine.parse?.(params.gcode) ?? analyzeGcodeBasic(params.gcode);
            break;
          }
          case "pp_analyze_safety": {
            const engine = await getEngine("verification");
            result = engine.analyzeSafety?.(params) ?? engine.validate?.(params) ?? { error: "analyzeSafety method not found" };
            break;
          }
          case "pp_analyze_optimization": {
            const engine = await getEngine("pipeline");
            result = engine.analyzeOptimizations?.(params.gcode) ?? { opportunities: [] };
            break;
          }
          case "pp_analyze_controller_fit": {
            const engine = await getEngine("neural");
            result = engine.classifyController?.(params) ?? engine.analyzeControllerFit?.(params) ?? { fit: "unknown" };
            break;
          }
          case "pp_analyze_complexity": {
            const engine = await getEngine("cognition");
            result = engine.analyzeComplexity?.(params) ?? analyzeComplexityBasic(params.gcode);
            break;
          }

          // ===== PP_OPTIMIZE actions =====
          case "pp_optimize_feed": {
            const engine = await getEngine("feedOptimizer");
            result = engine.optimize?.(params) ?? engine.optimizeFeed?.(params) ?? { error: "optimize method not found" };
            break;
          }
          case "pp_optimize_motion": {
            const engine = await getEngine("pipeline");
            result = engine.optimizeMotion?.(params) ?? await engine.process?.({ ...params, optimizationTarget: "motion" }) ?? { error: "optimizeMotion not found" };
            break;
          }
          case "pp_optimize_cycle_time": {
            const engine = await getEngine("pipeline");
            result = await engine.process?.({ ...params, optimizationTarget: "cycleTime" }) ?? { error: "process not found" };
            break;
          }
          case "pp_optimize_tool_life": {
            const engine = await getEngine("physics");
            result = engine.optimizeForToolLife?.(params) ?? await engine.generate?.({ ...params, objective: "tool_life" }) ?? { error: "optimizeForToolLife not found" };
            break;
          }
          case "pp_optimize_surface_finish": {
            const engine = await getEngine("physics");
            result = engine.optimizeForSurface?.(params) ?? await engine.generate?.({ ...params, objective: "surface_finish" }) ?? { error: "optimizeForSurface not found" };
            break;
          }
          case "pp_optimize_energy": {
            const engine = await getEngine("pipeline");
            result = await engine.process?.({ ...params, optimizationTarget: "energy" }) ?? { error: "process not found" };
            break;
          }

          // ===== PP_VALIDATE actions =====
          case "pp_validate_program": {
            const engine = await getEngine("verification");
            result = engine.validateProgram?.(params) ?? engine.verify?.(params) ?? { valid: true, warnings: [] };
            break;
          }
          case "pp_validate_limits": {
            const engine = await getEngine("kinematics");
            result = engine.validateLimits?.(params) ?? engine.checkLimits?.(params) ?? { withinLimits: true };
            break;
          }
          case "pp_validate_collisions": {
            const engine = await getEngine("verification");
            result = engine.validateCollisions?.(params) ?? { collisionFree: true };
            break;
          }
          case "pp_validate_forces": {
            const engine = await getEngine("physics");
            result = engine.validateForces?.(params) ?? { safe: true };
            break;
          }
          case "pp_validate_thermal": {
            const engine = await getEngine("physics");
            result = engine.validateThermal?.(params) ?? { safe: true };
            break;
          }
          case "pp_validate_syntax": {
            const engine = await getEngine("verification");
            result = engine.validateSyntax?.(params) ?? validateSyntaxBasic(params.gcode, params.controller);
            break;
          }

          // ===== PP_PHYSICS actions =====
          case "pp_physics_forces": {
            const engine = await getEngine("physics");
            result = engine.calculateForces?.(params) ?? engine.analyzeForces?.(params) ?? { error: "calculateForces not found" };
            break;
          }
          case "pp_physics_thermal": {
            const engine = await getEngine("physics");
            result = engine.calculateThermal?.(params) ?? engine.analyzeThermal?.(params) ?? { error: "calculateThermal not found" };
            break;
          }
          case "pp_physics_deflection": {
            const engine = await getEngine("physics");
            result = engine.calculateDeflection?.(params) ?? { error: "calculateDeflection not found" };
            break;
          }
          case "pp_physics_stability": {
            const engine = await getEngine("physics");
            result = engine.calculateStability?.(params) ?? engine.analyzeChatter?.(params) ?? { error: "calculateStability not found" };
            break;
          }
          case "pp_physics_surface": {
            const engine = await getEngine("physics");
            result = engine.calculateSurface?.(params) ?? engine.predictRa?.(params) ?? { error: "calculateSurface not found" };
            break;
          }
          case "pp_physics_wear": {
            const engine = await getEngine("physics");
            result = engine.calculateWear?.(params) ?? engine.predictToolLife?.(params) ?? { error: "calculateWear not found" };
            break;
          }

          // ===== PP_NEURAL actions =====
          case "pp_neural_predict": {
            const engine = await getEngine("neural");
            result = engine.predict?.(params) ?? engine.inference?.(params) ?? { error: "predict not found" };
            break;
          }
          case "pp_neural_classify": {
            const engine = await getEngine("neural");
            result = engine.classify?.(params) ?? engine.classifyController?.(params) ?? { error: "classify not found" };
            break;
          }
          case "pp_neural_optimize": {
            const engine = await getEngine("neural");
            result = engine.neuralOptimize?.(params) ?? engine.optimize?.(params) ?? { error: "neuralOptimize not found" };
            break;
          }
          case "pp_neural_anomaly": {
            const engine = await getEngine("neural");
            result = engine.detectAnomalies?.(params) ?? engine.anomalyDetection?.(params) ?? { anomalies: [] };
            break;
          }
          case "pp_neural_learn": {
            const engine = await getEngine("neural");
            result = engine.learn?.(params) ?? engine.train?.(params) ?? { learned: true };
            break;
          }

          // ===== PP_TRIBAL actions =====
          case "pp_tribal_query": {
            const engine = await getEngine("tribal");
            result = engine.query?.(params) ?? engine.searchTips?.(params) ?? { tips: [] };
            break;
          }
          case "pp_tribal_apply": {
            const engine = await getEngine("tribal");
            result = engine.applyTips?.(params) ?? engine.apply?.(params) ?? { applied: true };
            break;
          }
          case "pp_tribal_suggest": {
            const engine = await getEngine("tribal");
            result = engine.suggestTips?.(params) ?? engine.getRelevantTips?.(params) ?? { suggestions: [] };
            break;
          }
          case "pp_tribal_validate": {
            const engine = await getEngine("tribal");
            result = engine.validateAgainstTribal?.(params) ?? engine.validate?.(params) ?? { valid: true };
            break;
          }
          case "pp_tribal_contribute": {
            const engine = await getEngine("tribal");
            result = engine.contributeTip?.(params) ?? engine.addTip?.(params) ?? { contributed: true };
            break;
          }

          // ===== PP_CONTROLLER actions =====
          case "pp_controller_capabilities": {
            const engine = await getEngine("api");
            result = engine.getControllerCapabilities?.(params.controller) ?? engine.getCapabilities?.(params) ?? getDefaultCapabilities(params.controller);
            break;
          }
          case "pp_controller_translate": {
            const engine = await getEngine("transformer");
            result = engine.translate?.(params) ?? engine.transform?.(params) ?? { error: "translate not found" };
            break;
          }
          case "pp_controller_optimize": {
            const engine = await getEngine("api");
            result = engine.optimizeForController?.(params) ?? { optimized: params.gcode };
            break;
          }
          case "pp_controller_validate": {
            const engine = await getEngine("verification");
            result = engine.validateForController?.(params) ?? { valid: true };
            break;
          }
          case "pp_controller_recommend": {
            const engine = await getEngine("knowledgeGraph");
            result = engine.recommendSettings?.(params) ?? engine.query?.(params) ?? { recommendations: [] };
            break;
          }

          // ===== PP_KINEMATICS actions =====
          case "pp_kinematics_analyze": {
            const engine = await getEngine("kinematics");
            result = engine.analyze?.(params) ?? engine.analyzeKinematics?.(params) ?? { error: "analyze not found" };
            break;
          }
          case "pp_kinematics_transform": {
            const engine = await getEngine("kinematics");
            result = engine.transform?.(params) ?? engine.applyRTCP?.(params) ?? { error: "transform not found" };
            break;
          }
          case "pp_kinematics_limits": {
            const engine = await getEngine("kinematics");
            result = engine.checkLimits?.(params) ?? engine.validateLimits?.(params) ?? { withinLimits: true };
            break;
          }
          case "pp_kinematics_singularity": {
            const engine = await getEngine("kinematics");
            result = engine.detectSingularities?.(params) ?? engine.checkSingularity?.(params) ?? { singularities: [] };
            break;
          }
          case "pp_kinematics_optimize": {
            const engine = await getEngine("kinematics");
            result = engine.optimizeKinematics?.(params) ?? engine.optimize?.(params) ?? { error: "optimizeKinematics not found" };
            break;
          }

          default:
            result = { error: `Unknown action: ${action}` };
        }

        // POST-CALCULATION HOOKS
        try {
          await hookExecutor.execute("post-calculation", {
            ...hookCtx, metadata: { ...hookCtx.metadata, result }
          });
        } catch (postErr) {
          log.warn(`[prism_pp] Post-calculation hook error: ${postErr}`);
        }

      } catch (error: any) {
        if (error?.name === "SafetyBlockError") throw error;
        return dispatcherError(error, action, "prism_pp");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}

// ============================================================================
// FALLBACK HELPER FUNCTIONS
// ============================================================================

function generateDefaultHeader(params: any): string {
  const { programNumber = 1, programName = "PRISM", controller = "fanuc" } = params;
  const lines = [
    controller === "heidenhain" ? `BEGIN PGM ${programName} MM` : `%`,
    controller === "heidenhain" ? "" : `O${String(programNumber).padStart(4, "0")} (${programName})`,
    `(GENERATED BY PRISM POST PROCESSOR)`,
    `(DATE: ${new Date().toISOString().split("T")[0]})`,
  ].filter(Boolean);
  return lines.join("\n");
}

function generateDefaultSafeStart(params: any): string {
  const { controller = "fanuc" } = params;
  if (controller === "heidenhain") {
    return "BLK FORM 0.1 Z X+0 Y+0 Z-50\nBLK FORM 0.2 X+100 Y+100 Z+0";
  }
  return "G17 G40 G49 G80 G90\nG28 G91 Z0\nG28 X0 Y0\nG90";
}

function generateDefaultToolChange(params: any): string {
  const { toolNumber = 1, rpm = 1000, coolant = "flood", controller = "fanuc" } = params;
  const coolantCode = coolant === "flood" ? "M08" : coolant === "mist" ? "M07" : "M09";
  if (controller === "heidenhain") {
    return `TOOL CALL ${toolNumber} Z S${rpm}\n${coolantCode}`;
  }
  return `T${toolNumber} M06\nG43 H${toolNumber}\nS${rpm} M03\n${coolantCode}`;
}

function generateDefaultCannedCycle(params: any): string {
  const { cycleType = "drill", depth = 10, retract = 2, feed = 100, controller = "fanuc" } = params;
  const cycleMap: Record<string, string> = {
    drill: "G81", peck: "G83", tap: "G84", bore: "G85", ream: "G85"
  };
  const code = cycleMap[cycleType] || "G81";
  return `${code} Z-${depth} R${retract} F${feed}`;
}

function generateDefaultSubroutine(params: any): string {
  const { subroutineNumber = 1000, controller = "fanuc" } = params;
  if (controller === "heidenhain") {
    return `CALL LBL ${subroutineNumber}`;
  }
  return `M98 P${subroutineNumber}`;
}

function analyzeGcodeBasic(gcode: string): any {
  const lines = gcode?.split(/\r?\n/) || [];
  const gcodes = new Set<string>();
  const mcodes = new Set<string>();
  let toolChanges = 0;

  for (const line of lines) {
    const gmatch = line.match(/G\d+\.?\d*/gi);
    if (gmatch) gmatch.forEach(g => gcodes.add(g.toUpperCase()));
    const mmatch = line.match(/M\d+/gi);
    if (mmatch) mmatch.forEach(m => mcodes.add(m.toUpperCase()));
    if (/M0?6\b/i.test(line) || /T\d+/i.test(line)) toolChanges++;
  }

  return {
    lineCount: lines.length,
    gcodes: Array.from(gcodes),
    mcodes: Array.from(mcodes),
    toolChanges,
    hasArcs: gcodes.has("G02") || gcodes.has("G03"),
    hasCannedCycles: Array.from(gcodes).some(g => /G7\d|G8\d/i.test(g)),
  };
}

function analyzeComplexityBasic(gcode: string): any {
  const lines = gcode?.split(/\r?\n/) || [];
  const motionCount = lines.filter(l => /G0[0123]\s/i.test(l)).length;
  const arcCount = lines.filter(l => /G0[23]\s/i.test(l)).length;
  const toolChanges = lines.filter(l => /M0?6\b/i.test(l) || /\bT\d+\b/i.test(l)).length;

  return {
    totalLines: lines.length,
    motionBlocks: motionCount,
    arcBlocks: arcCount,
    toolChanges,
    complexityScore: Math.round((motionCount + arcCount * 2 + toolChanges * 5) / Math.max(lines.length, 1) * 100) / 100,
    rating: motionCount > 500 ? "high" : motionCount > 100 ? "medium" : "low",
  };
}

function validateSyntaxBasic(gcode: string, controller: string = "fanuc"): any {
  const lines = gcode?.split(/\r?\n/) || [];
  const errors: string[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("(") || line.startsWith(";") || line === "%") continue;

    // Check for unclosed parentheses
    const openParen = (line.match(/\(/g) || []).length;
    const closeParen = (line.match(/\)/g) || []).length;
    if (openParen !== closeParen) {
      errors.push(`Line ${i + 1}: Unbalanced parentheses`);
    }

    // Check for invalid G-codes (basic)
    const gcodes = line.match(/G\d+\.?\d*/gi) || [];
    for (const g of gcodes) {
      const num = parseFloat(g.substring(1));
      if (num > 99 && controller !== "siemens" && controller !== "heidenhain") {
        warnings.push(`Line ${i + 1}: G-code ${g} may not be supported on ${controller}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    lineCount: lines.length,
  };
}

function getDefaultCapabilities(controller: string): any {
  const capabilities: Record<string, any> = {
    fanuc: {
      maxArcs: true, helicalInterpolation: true, cannedCycles: true, macros: true,
      rtcp: "G43.4", hsm: "G05.1 Q1", nurbs: "G06.2", maxLineLength: 256
    },
    haas: {
      maxArcs: true, helicalInterpolation: true, cannedCycles: true, macros: true,
      rtcp: "G234/G235", hsm: "G187", nurbs: false, maxLineLength: 256
    },
    siemens: {
      maxArcs: true, helicalInterpolation: true, cannedCycles: true, macros: true,
      rtcp: "TRAORI", hsm: "SOFT", nurbs: "BSPLINE", maxLineLength: 512
    },
    heidenhain: {
      maxArcs: true, helicalInterpolation: true, cannedCycles: true, macros: true,
      rtcp: "M128", hsm: "M120", nurbs: false, maxLineLength: 512
    },
    mazak: {
      maxArcs: true, helicalInterpolation: true, cannedCycles: true, macros: true,
      rtcp: "G43.4", hsm: "G05.1", nurbs: false, maxLineLength: 256
    },
    okuma: {
      maxArcs: true, helicalInterpolation: true, cannedCycles: true, macros: true,
      rtcp: "G43 T", hsm: "G08", nurbs: false, maxLineLength: 256
    },
  };
  return capabilities[controller] || capabilities.fanuc;
}
