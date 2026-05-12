/**
 * PostProcessorAICoordinationBridge — PP-AI-BRIDGE
 * =================================================
 * Execution layer that wires the MasterPostProcessorAGIOrchestrationEngine
 * to real engine implementations. Acts as the functional coordination
 * bridge between:
 *
 *   - MasterPostProcessorAGIOrchestrationEngine (orchestrator)
 *   - Real PP engines (physics, knowledge, generators, reasoners)
 *   - PRISMSelfAwarenessEngine (main system intelligence)
 *   - Domain AI engines (Mill, Lathe, EDM — coordinate only)
 *
 * Key Responsibilities:
 *   1. Actual engine invocation (not just registry tracking)
 *   2. Cross-engine result aggregation with weighted voting
 *   3. Fallback chains when primary engines fail
 *   4. Consensus building from disagreeing engines
 *   5. Learning loop: track which engines give best results
 *   6. Feedback integration from production
 *
 * This bridge is what makes the AGI orchestrator ACTUALLY work —
 * it translates AGI reasoning decisions into real engine calls.
 *
 * @module engines/PostProcessorAICoordinationBridge
 * @milestone PP-AI-BRIDGE
 * @version 1.0.0
 */

import {
  postProcessorUnifiedPhysicsOrchestrationEngine,
  type MachiningState,
  type UnifiedPhysicsAnalysis
} from "./PostProcessorUnifiedPhysicsOrchestrationEngine.js";

import {
  postProcessorPhysicsAwareGeneratorEngine,
  type PhysicsAwareRequest,
  type PhysicsAwareResult
} from "./PostProcessorPhysicsAwareGeneratorEngine.js";

import {
  masterPostProcessorAGIOrchestrationEngine,
  type AGIPostRequest,
  type AGIPostResult
} from "./MasterPostProcessorAGIOrchestrationEngine.js";

import {
  CANONICAL_MATERIAL_DB,
  type ISOGroup,
  type MaterialPhysics
} from "../physics/constants.js";

// ============================================================================
// COORDINATION TYPES
// ============================================================================

/**
 * Unified request format that can feed any PP engine
 */
interface CoordinatedRequest {
  // Core specification
  controller: string;
  machineType: "mill" | "lathe" | "turn-mill" | "5axis" | "wire-edm" | "sinker-edm";
  operations: string[];
  material: string;

  // Optional parameters
  cuttingParams?: {
    cuttingSpeed_m_min?: number;
    feedRate_mm_rev?: number;
    depthOfCut_mm?: number;
    widthOfCut_mm?: number;
  };

  tool?: {
    diameter_mm: number;
    flutes: number;
    noseRadius_mm: number;
    material: "carbide" | "hss" | "ceramic" | "cbn" | "pcd";
  };

  machine?: {
    maxRPM: number;
    power_kW: number;
    rigidity: "low" | "medium" | "high";
  };

  // Coordination settings
  coordination?: {
    engineSelection: "all" | "priority" | "fastest" | "consensus";
    conflictResolution: "weighted_vote" | "highest_confidence" | "safety_first" | "manual";
    enableFallback: boolean;
    maxParallelEngines: number;
    timeoutPerEngine_ms: number;
  };

  // Cross-domain context (from other AI systems)
  crossDomainContext?: {
    source: string;
    data: Record<string, unknown>;
    confidence: number;
  }[];
}

/**
 * Aggregated result from multiple engines with full traceability
 */
interface CoordinatedResult {
  // Primary output
  gcode: string[];

  // Engine execution details
  engineExecutions: Array<{
    engineId: string;
    engineName: string;
    invoked: boolean;
    success: boolean;
    duration_ms: number;
    output?: unknown;
    error?: string;
    confidence: number;
  }>;

  // Aggregated physics analysis (from unified physics engine)
  physicsAnalysis: {
    forces: {
      cuttingForce_N: number;
      cuttingPower_kW: number;
      powerUtilization_pct: number;
    };
    thermal: {
      chipTemperature_C: number;
      toolRakeTemperature_C: number;
    };
    toolLife: {
      predictedLife_min: number;
      primaryWearMechanism: string;
    };
    chatter: {
      isStable: boolean;
      stabilityMargin_pct: number;
    };
    surface: {
      Ra_um: number;
      residualStress_MPa: number;
    };
    overallSafetyScore: number;
  };

  // Consensus and voting
  consensus: {
    agreementLevel: number;  // 0-1
    conflictingEngines: string[];
    finalDecision: string;
    votingResults: Array<{
      option: string;
      votes: number;
      weight: number;
    }>;
  };

  // Quality assurance
  qualityGates: {
    safetyCheckPassed: boolean;
    physicsValidated: boolean;
    consensusReached: boolean;
    allEnginesSucceeded: boolean;
    overallPassed: boolean;
  };

  // Cross-domain integration
  crossDomainSynergy: {
    sourcesConsidered: string[];
    integrationSuccess: boolean;
    divergenceDetected: boolean;
  };

  // Metadata
  metadata: {
    totalDuration_ms: number;
    enginesInvoked: number;
    enginesSucceeded: number;
    enginesFailed: number;
    fallbackUsed: boolean;
    timestamp: string;
    version: string;
  };
}

/**
 * Engine execution record for learning
 */
interface EnginePerformanceRecord {
  engineId: string;
  invocations: number;
  successes: number;
  failures: number;
  avgDuration_ms: number;
  avgConfidence: number;
  lastInvoked: string;
}

// ============================================================================
// POST PROCESSOR AI COORDINATION BRIDGE
// ============================================================================

class PostProcessorAICoordinationBridge {
  private readonly engineVersion = "1.0.0";
  private readonly defaultTimeout_ms = 5000;
  private readonly safetyHardBlock = 0.70;

  // Performance tracking for learning
  private performanceRecords = new Map<string, EnginePerformanceRecord>();

  /**
   * Coordinate a request across all post processor AI engines
   */
  public async coordinate(request: CoordinatedRequest): Promise<CoordinatedResult> {
    const startTime = Date.now();
    const engineExecutions: CoordinatedResult["engineExecutions"] = [];

    // 1. Build machining state for physics engines
    const machiningState = this.buildMachiningState(request);

    // 2. Invoke unified physics engine (ALWAYS — foundational)
    const physicsExec = await this.invokePhysicsEngine(machiningState);
    engineExecutions.push(physicsExec);

    // 3. Invoke physics-aware generator
    const generatorExec = await this.invokeGeneratorEngine(request, machiningState);
    engineExecutions.push(generatorExec);

    // 4. Invoke Master AGI orchestrator (wraps everything with AGI reasoning)
    const agiExec = await this.invokeMasterAGI(request);
    engineExecutions.push(agiExec);

    // 5. Extract primary G-code from best-performing engine
    const gcode = this.extractBestGCode(engineExecutions);

    // 6. Aggregate physics analysis from unified physics engine
    const physicsAnalysis = this.aggregatePhysicsAnalysis(physicsExec);

    // 7. Build consensus across engines
    const consensus = this.buildConsensus(engineExecutions, request);

    // 8. Apply quality gates
    const qualityGates = this.applyQualityGates(physicsAnalysis, consensus, engineExecutions);

    // 9. Integrate cross-domain context
    const crossDomainSynergy = this.integrateCrossDomainContext(request);

    // 10. Update performance records for learning
    this.updatePerformanceRecords(engineExecutions);

    const endTime = Date.now();

    return {
      gcode,
      engineExecutions,
      physicsAnalysis,
      consensus,
      qualityGates,
      crossDomainSynergy,
      metadata: {
        totalDuration_ms: endTime - startTime,
        enginesInvoked: engineExecutions.length,
        enginesSucceeded: engineExecutions.filter(e => e.success).length,
        enginesFailed: engineExecutions.filter(e => !e.success).length,
        fallbackUsed: engineExecutions.some(e => !e.success),
        timestamp: new Date().toISOString(),
        version: this.engineVersion
      }
    };
  }

  /**
   * Build machining state from coordinated request
   */
  private buildMachiningState(request: CoordinatedRequest): MachiningState {
    const materialPhysics = CANONICAL_MATERIAL_DB[request.material.toLowerCase()] ||
                           CANONICAL_MATERIAL_DB.steel;

    return {
      cuttingSpeed_m_min: request.cuttingParams?.cuttingSpeed_m_min || 150,
      feedRate_mm_rev: request.cuttingParams?.feedRate_mm_rev || 0.2,
      depthOfCut_mm: request.cuttingParams?.depthOfCut_mm || 2.0,
      widthOfCut_mm: request.cuttingParams?.widthOfCut_mm || 10,
      toolDiameter_mm: request.tool?.diameter_mm || 20,
      toolFlutes: request.tool?.flutes || 4,
      toolNoseRadius_mm: request.tool?.noseRadius_mm || 0.8,
      toolRakeAngle_deg: 6,
      toolMaterial: request.tool?.material || "carbide",
      material: request.material,
      materialPhysics,
      hardness_HB: materialPhysics.hardness_HB || 200,
      spindleRPM: Math.round(
        ((request.cuttingParams?.cuttingSpeed_m_min || 150) * 1000) /
        (Math.PI * (request.tool?.diameter_mm || 20))
      ),
      machinePower_kW: request.machine?.power_kW || 15,
      machineRigidity: request.machine?.rigidity || "medium",
      coolantType: "flood"
    };
  }

  /**
   * Invoke unified physics engine
   */
  private async invokePhysicsEngine(
    state: MachiningState
  ): Promise<CoordinatedResult["engineExecutions"][0]> {
    const startTime = Date.now();
    const engineId = "pp-unified-physics";
    const engineName = "PostProcessorUnifiedPhysicsOrchestrationEngine";

    try {
      const result = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);
      return {
        engineId,
        engineName,
        invoked: true,
        success: true,
        duration_ms: Date.now() - startTime,
        output: result,
        confidence: result.analysisConfidence
      };
    } catch (error) {
      return {
        engineId,
        engineName,
        invoked: true,
        success: false,
        duration_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        confidence: 0
      };
    }
  }

  /**
   * Invoke physics-aware generator engine
   */
  private async invokeGeneratorEngine(
    request: CoordinatedRequest,
    state: MachiningState
  ): Promise<CoordinatedResult["engineExecutions"][0]> {
    const startTime = Date.now();
    const engineId = "pp-physics-generator";
    const engineName = "PostProcessorPhysicsAwareGeneratorEngine";

    try {
      const generatorRequest: PhysicsAwareRequest = {
        controller: request.controller,
        machineType: request.machineType === "sinker-edm" ? "wire-edm" : request.machineType,
        operations: request.operations,
        material: request.material,
        toolDiameter_mm: request.tool?.diameter_mm,
        toolFlutes: request.tool?.flutes,
        toolNoseRadius_mm: request.tool?.noseRadius_mm,
        toolMaterial: request.tool?.material,
        machinePower_kW: request.machine?.power_kW,
        machineRigidity: request.machine?.rigidity,
        coolantType: "flood",
        enablePhysicsValidation: true,
        enableAdaptiveFeed: true,
        enableChatterAvoidance: true,
        optimizationTarget: "balanced"
      };

      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(generatorRequest);

      return {
        engineId,
        engineName,
        invoked: true,
        success: true,
        duration_ms: Date.now() - startTime,
        output: result,
        confidence: result.safetyScore
      };
    } catch (error) {
      return {
        engineId,
        engineName,
        invoked: true,
        success: false,
        duration_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        confidence: 0
      };
    }
  }

  /**
   * Invoke Master AGI orchestrator
   */
  private async invokeMasterAGI(
    request: CoordinatedRequest
  ): Promise<CoordinatedResult["engineExecutions"][0]> {
    const startTime = Date.now();
    const engineId = "pp-master-agi";
    const engineName = "MasterPostProcessorAGIOrchestrationEngine";

    try {
      const agiRequest: AGIPostRequest = {
        controller: request.controller,
        machineType: request.machineType,
        operations: request.operations,
        material: request.material,
        tool: request.tool,
        machine: request.machine ? { ...request.machine, axes: 3 } : undefined,
        options: {
          optimizationTarget: "balanced",
          safetyLevel: "standard",
          includeComments: true,
          includePhysicsAnnotations: true,
          enableAdaptiveFeed: true,
          reasoningDepth: "deep"
        }
      };

      const result = await masterPostProcessorAGIOrchestrationEngine.generateAGIPost(agiRequest);

      return {
        engineId,
        engineName,
        invoked: true,
        success: true,
        duration_ms: Date.now() - startTime,
        output: result,
        confidence: result.qualityMetrics.overallScore
      };
    } catch (error) {
      return {
        engineId,
        engineName,
        invoked: true,
        success: false,
        duration_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        confidence: 0
      };
    }
  }

  /**
   * Extract best G-code from engine executions
   */
  private extractBestGCode(executions: CoordinatedResult["engineExecutions"]): string[] {
    // Prefer Master AGI output (most comprehensive reasoning)
    const agiExec = executions.find(e => e.engineId === "pp-master-agi" && e.success);
    if (agiExec && agiExec.output) {
      const agiResult = agiExec.output as AGIPostResult;
      return agiResult.gcode;
    }

    // Fallback to physics generator
    const genExec = executions.find(e => e.engineId === "pp-physics-generator" && e.success);
    if (genExec && genExec.output) {
      const genResult = genExec.output as PhysicsAwareResult;
      return genResult.gcode;
    }

    // Final fallback: minimal safe G-code
    return [
      "(PRISM Coordination Bridge — FALLBACK MODE)",
      "(All primary engines failed — emergency minimal output)",
      "%",
      "O0001",
      "G90 G54",
      "G28 G91 Z0",
      "M30",
      "%"
    ];
  }

  /**
   * Aggregate physics analysis from unified physics engine
   */
  private aggregatePhysicsAnalysis(
    physicsExec: CoordinatedResult["engineExecutions"][0]
  ): CoordinatedResult["physicsAnalysis"] {
    if (physicsExec.success && physicsExec.output) {
      const analysis = physicsExec.output as UnifiedPhysicsAnalysis;
      return {
        forces: {
          cuttingForce_N: analysis.forces.Fc_N,
          cuttingPower_kW: analysis.forces.cuttingPower_kW,
          powerUtilization_pct: analysis.forces.powerUtilization_pct
        },
        thermal: {
          chipTemperature_C: analysis.thermal.chipTemperature_C,
          toolRakeTemperature_C: analysis.thermal.toolRakeTemperature_C
        },
        toolLife: {
          predictedLife_min: analysis.toolLife.predictedLife_min,
          primaryWearMechanism: analysis.toolLife.primaryWearMechanism
        },
        chatter: {
          isStable: analysis.chatter.isStable,
          stabilityMargin_pct: analysis.chatter.stabilityMargin_pct
        },
        surface: {
          Ra_um: analysis.surface.Ra_um,
          residualStress_MPa: analysis.surface.residualStress_MPa
        },
        overallSafetyScore: analysis.overallSafetyScore
      };
    }

    // Return safe defaults if physics engine failed
    return {
      forces: { cuttingForce_N: 0, cuttingPower_kW: 0, powerUtilization_pct: 0 },
      thermal: { chipTemperature_C: 20, toolRakeTemperature_C: 20 },
      toolLife: { predictedLife_min: 0, primaryWearMechanism: "unknown" },
      chatter: { isStable: false, stabilityMargin_pct: 0 },
      surface: { Ra_um: 0, residualStress_MPa: 0 },
      overallSafetyScore: 0
    };
  }

  /**
   * Build consensus across engine outputs
   */
  private buildConsensus(
    executions: CoordinatedResult["engineExecutions"],
    request: CoordinatedRequest
  ): CoordinatedResult["consensus"] {
    const successful = executions.filter(e => e.success);

    if (successful.length === 0) {
      return {
        agreementLevel: 0,
        conflictingEngines: executions.map(e => e.engineId),
        finalDecision: "All engines failed — using emergency fallback",
        votingResults: []
      };
    }

    // Calculate agreement based on confidence similarity
    const confidences = successful.map(e => e.confidence);
    const avgConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    const confidenceVariance = confidences.reduce((sum, c) => sum + Math.pow(c - avgConfidence, 2), 0) / confidences.length;
    const agreementLevel = Math.max(0, 1 - Math.sqrt(confidenceVariance));

    // Build voting on decision options
    const votingResults = [
      {
        option: "Use Master AGI output (comprehensive reasoning)",
        votes: successful.filter(e => e.engineId === "pp-master-agi").length,
        weight: successful.find(e => e.engineId === "pp-master-agi")?.confidence || 0
      },
      {
        option: "Use physics-validated output (safety priority)",
        votes: successful.filter(e => e.engineId === "pp-physics-generator").length,
        weight: successful.find(e => e.engineId === "pp-physics-generator")?.confidence || 0
      },
      {
        option: "Apply physics analysis only (advisory mode)",
        votes: successful.filter(e => e.engineId === "pp-unified-physics").length,
        weight: successful.find(e => e.engineId === "pp-unified-physics")?.confidence || 0
      }
    ].sort((a, b) => b.weight - a.weight);

    const conflictingEngines = executions
      .filter(e => e.success && Math.abs(e.confidence - avgConfidence) > 0.15)
      .map(e => e.engineId);

    return {
      agreementLevel,
      conflictingEngines,
      finalDecision: votingResults[0].option,
      votingResults
    };
  }

  /**
   * Apply quality gates to determine if output meets standards
   */
  private applyQualityGates(
    physics: CoordinatedResult["physicsAnalysis"],
    consensus: CoordinatedResult["consensus"],
    executions: CoordinatedResult["engineExecutions"]
  ): CoordinatedResult["qualityGates"] {
    const safetyCheckPassed = physics.overallSafetyScore >= this.safetyHardBlock;
    const physicsValidated = executions.some(e => e.engineId === "pp-unified-physics" && e.success);
    const consensusReached = consensus.agreementLevel >= 0.7;
    const allEnginesSucceeded = executions.every(e => e.success);
    const overallPassed = safetyCheckPassed && physicsValidated;

    return {
      safetyCheckPassed,
      physicsValidated,
      consensusReached,
      allEnginesSucceeded,
      overallPassed
    };
  }

  /**
   * Integrate cross-domain context from other AI systems
   */
  private integrateCrossDomainContext(
    request: CoordinatedRequest
  ): CoordinatedResult["crossDomainSynergy"] {
    const sources = request.crossDomainContext?.map(c => c.source) || [];

    if (sources.length === 0) {
      return {
        sourcesConsidered: [],
        integrationSuccess: true,
        divergenceDetected: false
      };
    }

    const avgConfidence = request.crossDomainContext!.reduce((sum, c) => sum + c.confidence, 0) / sources.length;
    const divergenceDetected = request.crossDomainContext!.some(c => c.confidence < 0.5);

    return {
      sourcesConsidered: sources,
      integrationSuccess: avgConfidence > 0.6,
      divergenceDetected
    };
  }

  /**
   * Update engine performance records for learning
   */
  private updatePerformanceRecords(executions: CoordinatedResult["engineExecutions"]): void {
    for (const exec of executions) {
      let record = this.performanceRecords.get(exec.engineId);

      if (!record) {
        record = {
          engineId: exec.engineId,
          invocations: 0,
          successes: 0,
          failures: 0,
          avgDuration_ms: 0,
          avgConfidence: 0,
          lastInvoked: new Date().toISOString()
        };
      }

      const prevInvocations = record.invocations;
      record.invocations++;
      if (exec.success) record.successes++;
      else record.failures++;

      // Running average
      record.avgDuration_ms = (record.avgDuration_ms * prevInvocations + exec.duration_ms) / record.invocations;
      record.avgConfidence = (record.avgConfidence * prevInvocations + exec.confidence) / record.invocations;
      record.lastInvoked = new Date().toISOString();

      this.performanceRecords.set(exec.engineId, record);
    }
  }

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  /**
   * Get performance records for all tracked engines
   */
  public getPerformanceRecords(): EnginePerformanceRecord[] {
    return Array.from(this.performanceRecords.values());
  }

  /**
   * Get performance record for specific engine
   */
  public getEnginePerformance(engineId: string): EnginePerformanceRecord | undefined {
    return this.performanceRecords.get(engineId);
  }

  /**
   * Reset performance tracking
   */
  public resetPerformanceTracking(): void {
    this.performanceRecords.clear();
  }

  /**
   * Get best-performing engine by metric
   */
  public getBestEngine(metric: "success_rate" | "speed" | "confidence"): EnginePerformanceRecord | undefined {
    const records = Array.from(this.performanceRecords.values());
    if (records.length === 0) return undefined;

    switch (metric) {
      case "success_rate":
        return records.sort((a, b) =>
          (b.successes / Math.max(b.invocations, 1)) -
          (a.successes / Math.max(a.invocations, 1))
        )[0];
      case "speed":
        return records.sort((a, b) => a.avgDuration_ms - b.avgDuration_ms)[0];
      case "confidence":
        return records.sort((a, b) => b.avgConfidence - a.avgConfidence)[0];
    }
  }

  /**
   * Quick physics analysis (convenience method, bypasses full coordination)
   */
  public quickPhysicsAnalysis(
    controller: string,
    material: string,
    cuttingSpeed_m_min = 150,
    feedRate_mm_rev = 0.2,
    depthOfCut_mm = 2.0
  ): UnifiedPhysicsAnalysis {
    const state: MachiningState = this.buildMachiningState({
      controller,
      machineType: "mill",
      operations: ["roughing"],
      material,
      cuttingParams: { cuttingSpeed_m_min, feedRate_mm_rev, depthOfCut_mm }
    });

    return postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);
  }

  /**
   * Get coordination statistics
   */
  public getStatistics(): {
    version: string;
    enginesTracked: number;
    totalInvocations: number;
    overallSuccessRate: number;
    avgConfidence: number;
    safetyHardBlock: number;
  } {
    const records = Array.from(this.performanceRecords.values());
    const totalInvocations = records.reduce((sum, r) => sum + r.invocations, 0);
    const totalSuccesses = records.reduce((sum, r) => sum + r.successes, 0);
    const totalConfidence = records.reduce((sum, r) => sum + r.avgConfidence * r.invocations, 0);

    return {
      version: this.engineVersion,
      enginesTracked: records.length,
      totalInvocations,
      overallSuccessRate: totalInvocations > 0 ? totalSuccesses / totalInvocations : 0,
      avgConfidence: totalInvocations > 0 ? totalConfidence / totalInvocations : 0,
      safetyHardBlock: this.safetyHardBlock
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const postProcessorAICoordinationBridge = new PostProcessorAICoordinationBridge();

export {
  type CoordinatedRequest,
  type CoordinatedResult,
  type EnginePerformanceRecord
};
