/**
 * PostProcessorAGIWiringIntegrationEngine — PP-AGI-WIRING
 * ==========================================================
 * The DEFINITIVE wiring layer that connects ALL PP AGI engines
 * into a cohesive end-to-end pipeline.
 *
 * Ensures every engine we've built is actively USED by the AGI:
 *   1. Task comes in → routed via PP_MASTER_REGISTRY
 *   2. Knowledge engines queried for context:
 *      - Tribal knowledge (PostProcessorTribalKnowledgeIntegrationEngine)
 *      - Production patterns (PostProcessorProductionPatternEngine)
 *      - Machine kinematics (PostProcessorMachineKinematicsEngine)
 *      - CPS implementation (PostProcessorCPSImplementationEngine)
 *      - HyperMILL knowledge (PostProcessorHyperMillKnowledgeEngine)
 *      - Master post architecture (PostProcessorMasterPostArchitectureEngine)
 *      - Comprehensive catalog (PostProcessorComprehensiveKnowledgeEngine)
 *   3. Context aggregated into enriched request
 *   4. Enriched request → Coordination Bridge (actual execution)
 *   5. Bridge invokes physics, generator, master AGI
 *   6. Results → Continuous Learning Engine (feedback loop)
 *
 * This is the ORCHESTRATION LAYER ABOVE the coordination bridge.
 * It ensures every piece of knowledge we've captured is BROUGHT INTO PLAY
 * for every post generation task.
 *
 * @module engines/PostProcessorAGIWiringIntegrationEngine
 * @milestone PP-AGI-WIRING
 * @version 1.0.0
 */

import { postProcessorAGIMasterRegistryEngine } from "./PostProcessorAGIMasterRegistryEngine.js";
import { postProcessorTribalKnowledgeIntegrationEngine } from "./PostProcessorTribalKnowledgeIntegrationEngine.js";
import { postProcessorProductionPatternEngine } from "./PostProcessorProductionPatternEngine.js";
import { postProcessorMachineKinematicsEngine } from "./PostProcessorMachineKinematicsEngine.js";
import { postProcessorCPSImplementationEngine } from "./PostProcessorCPSImplementationEngine.js";
import { postProcessorHyperMillKnowledgeEngine } from "./PostProcessorHyperMillKnowledgeEngine.js";
import { postProcessorMasterPostArchitectureEngine } from "./PostProcessorMasterPostArchitectureEngine.js";
import { postProcessorComprehensiveKnowledgeEngine } from "./PostProcessorComprehensiveKnowledgeEngine.js";
import { postProcessorAGIContinuousLearningEngine } from "./PostProcessorAGIContinuousLearningEngine.js";
import { postProcessorAICoordinationBridge } from "./PostProcessorAICoordinationBridge.js";

// ============================================================================
// INTEGRATION TYPES
// ============================================================================

interface WiringRequest {
  task: string;

  // Machine/material/operation context
  controller?: string;
  machineId?: string;
  machineType?: string;
  material?: string;
  operations?: string[];

  // Optional cutting parameters
  cuttingParams?: {
    cuttingSpeed_m_min?: number;
    feedRate_mm_rev?: number;
    depthOfCut_mm?: number;
  };

  // Options
  options?: {
    includeTribalKnowledge?: boolean;
    includeProductionPatterns?: boolean;
    includeKinematicsValidation?: boolean;
    includeCPSKnowledge?: boolean;
    includeHyperMillKnowledge?: boolean;
    includeMasterPostArchitecture?: boolean;
    includeCatalogData?: boolean;
    recordFeedback?: boolean;
  };
}

interface WiringResult {
  // Final G-code output
  gcode?: string[];

  // Routing decisions
  routing: {
    matchedRules: number;
    recommendedEngines: string[];
    executionPlan: string;
  };

  // Aggregated knowledge context
  knowledgeContext: {
    tribalTips: number;
    criticalWarnings: string[];
    recommendations: string[];
    physicsBasis: string[];
    productionPatterns?: {
      topOperation?: string;
      relevantSequences?: number;
      materialSpeeds?: Record<string, unknown>;
    };
    kinematics?: {
      machineProfile?: string;
      workVolume_mm3?: number;
      validationWarnings?: string[];
    };
    cpsImplementation?: {
      applicableFeatures?: number;
      controllerGCodes?: number;
    };
    hyperMill?: {
      matchingConfig?: string;
      tribalTips?: number;
    };
    masterPostArchitecture?: {
      machineType?: string;
      templateStatus?: string;
      hurcoV11Open?: number;
    };
    catalog?: {
      totalAssets?: number;
      matchingCatalogs?: string[];
    };
  };

  // Execution details
  executionDetails: {
    enginesInvoked: string[];
    knowledgeEnginesQueried: string[];
    totalDuration_ms: number;
    success: boolean;
  };

  // Reasoning chain
  reasoningChain: Array<{
    step: string;
    engine: string;
    output: string;
  }>;
}

// ============================================================================
// WIRING INTEGRATION ENGINE
// ============================================================================

class PostProcessorAGIWiringIntegrationEngine {
  private readonly engineVersion = "1.0.0";
  private readonly allKnowledgeEngines = [
    "pp-tribal-int",
    "pp-prod-patterns",
    "pp-kinematics",
    "pp-cps-impl",
    "pp-hypermill-kb",
    "pp-master-post-arch",
    "pp-comprehensive-kb"
  ];

  /**
   * Run full AGI pipeline with complete wiring to all knowledge sources
   */
  public async runFullPipeline(request: WiringRequest): Promise<WiringResult> {
    const startTime = Date.now();
    const enginesInvoked: string[] = [];
    const knowledgeEnginesQueried: string[] = [];
    const reasoningChain: WiringResult["reasoningChain"] = [];

    const options = request.options || {};
    const includeAll = Object.keys(options).length === 0;  // Default: include all

    // STEP 1: Route via master registry
    const routing = postProcessorAGIMasterRegistryEngine.routeTask(request.task);
    reasoningChain.push({
      step: "Route task",
      engine: "pp-master-registry",
      output: `${routing.recommendedEngines.length} engines recommended; rules: ${routing.matchedRules.length}`
    });

    // STEP 2: Aggregate knowledge context from all relevant engines
    const knowledgeContext: WiringResult["knowledgeContext"] = {
      tribalTips: 0,
      criticalWarnings: [],
      recommendations: [],
      physicsBasis: []
    };

    // 2a. Tribal knowledge
    if (includeAll || options.includeTribalKnowledge !== false) {
      const tribalCtx = postProcessorTribalKnowledgeIntegrationEngine.injectForAGIContext({
        controller: request.controller,
        material: request.material,
        operation: request.operations?.[0]
      });

      knowledgeContext.tribalTips = tribalCtx.tipsApplied.length;
      knowledgeContext.criticalWarnings.push(...tribalCtx.criticalWarnings);
      knowledgeContext.recommendations.push(...tribalCtx.recommendations);
      knowledgeContext.physicsBasis.push(...tribalCtx.physicsBasis);
      knowledgeEnginesQueried.push("pp-tribal-int");

      reasoningChain.push({
        step: "Inject tribal wisdom",
        engine: "pp-tribal-int",
        output: `${tribalCtx.tipsApplied.length} tips; ${tribalCtx.criticalWarnings.length} critical warnings`
      });
    }

    // 2b. Production patterns
    if ((includeAll || options.includeProductionPatterns !== false) && request.material) {
      const matParams = postProcessorProductionPatternEngine.getMaterialParams(request.material);
      const shopProfile = postProcessorProductionPatternEngine.getShopFocusProfile();

      if (matParams) {
        knowledgeContext.productionPatterns = {
          topOperation: shopProfile.topOperation.code,
          materialSpeeds: {
            turning_sfm_rough: matParams.turning.sfm_rough,
            milling_sfm: matParams.milling.sfm,
            drilling_sfm: matParams.drilling.sfm
          }
        };
        knowledgeEnginesQueried.push("pp-prod-patterns");

        reasoningChain.push({
          step: "Retrieve production patterns",
          engine: "pp-prod-patterns",
          output: `Material: ${matParams.material}; Shop focus: ${shopProfile.topOperation.code} (${shopProfile.topOperation.count}x)`
        });
      }
    }

    // 2c. Machine kinematics
    if ((includeAll || options.includeKinematicsValidation !== false) && request.machineId) {
      const machine = postProcessorMachineKinematicsEngine.getMachineProfile(request.machineId);
      if (machine) {
        const workVolume = postProcessorMachineKinematicsEngine.calculateUsableWorkVolume(
          request.machineId,
          50,  // Default tool length estimate
          25   // Default fixture height estimate
        );

        knowledgeContext.kinematics = {
          machineProfile: machine.name,
          workVolume_mm3: workVolume?.usable_mm3,
          validationWarnings: []
        };

        // Validate if cutting params provided
        if (request.cuttingParams?.cuttingSpeed_m_min) {
          const validation = postProcessorMachineKinematicsEngine.validateCuttingCondition(
            request.machineId,
            {
              cuttingPower_kW: 10,  // Estimate
              requiredAccel_g: 0.3,
              spindleRPM: 5000,
              requiredAccuracy_mm: 0.05
            }
          );
          knowledgeContext.kinematics.validationWarnings = validation.warnings;
        }

        knowledgeEnginesQueried.push("pp-kinematics");

        reasoningChain.push({
          step: "Machine kinematics analysis",
          engine: "pp-kinematics",
          output: `Machine: ${machine.name}; Work volume: ${workVolume?.usable_mm3 || 0} mm³`
        });
      }
    }

    // 2d. CPS implementation knowledge
    if ((includeAll || options.includeCPSKnowledge !== false) && request.controller) {
      const controller = postProcessorCPSImplementationEngine.findController(request.controller);
      if (controller) {
        knowledgeContext.cpsImplementation = {
          applicableFeatures: postProcessorCPSImplementationEngine.getRoughingFeatures().length,
          controllerGCodes: controller.gcodes.length
        };
        knowledgeEnginesQueried.push("pp-cps-impl");

        reasoningChain.push({
          step: "CPS implementation knowledge",
          engine: "pp-cps-impl",
          output: `Controller: ${controller.controller}; ${controller.gcodes.length} G-codes indexed`
        });
      }
    }

    // 2e. HyperMILL knowledge
    if ((includeAll || options.includeHyperMillKnowledge !== false) && request.machineId) {
      const hmConfig = postProcessorHyperMillKnowledgeEngine.getMachineConfig(request.machineId);
      if (hmConfig) {
        knowledgeContext.hyperMill = {
          matchingConfig: hmConfig.machineName,
          tribalTips: hmConfig.tribalTips.length
        };
        knowledgeEnginesQueried.push("pp-hypermill-kb");

        reasoningChain.push({
          step: "HyperMILL production knowledge",
          engine: "pp-hypermill-kb",
          output: `Config: ${hmConfig.machineName}; ${hmConfig.tribalTips.length} tribal tips`
        });
      }
    }

    // 2f. Master post architecture
    if ((includeAll || options.includeMasterPostArchitecture !== false) && request.machineType) {
      const template = postProcessorMasterPostArchitectureEngine.getMasterPostTemplate(request.machineType);
      const machineType = postProcessorMasterPostArchitectureEngine.getMachineType(request.machineType);

      if (template || machineType) {
        knowledgeContext.masterPostArchitecture = {
          machineType: machineType?.name,
          templateStatus: template?.status,
          hurcoV11Open: request.controller?.toLowerCase().includes("hurco")
            ? postProcessorMasterPostArchitectureEngine.getHurcoV11OpenIssues().length
            : undefined
        };
        knowledgeEnginesQueried.push("pp-master-post-arch");

        reasoningChain.push({
          step: "Master post architecture",
          engine: "pp-master-post-arch",
          output: `Type: ${machineType?.name || "?"}; Template: ${template?.status || "none"}`
        });
      }
    }

    // 2g. Comprehensive catalog
    if (includeAll || options.includeCatalogData !== false) {
      const catalogQuery = postProcessorComprehensiveKnowledgeEngine.routeQuery(request.task);
      const totals = postProcessorComprehensiveKnowledgeEngine.getTotalEntries();

      knowledgeContext.catalog = {
        totalAssets: totals.total,
        matchingCatalogs: catalogQuery.suggestedCatalogs.slice(0, 5)
      };
      knowledgeEnginesQueried.push("pp-comprehensive-kb");

      reasoningChain.push({
        step: "Comprehensive catalog lookup",
        engine: "pp-comprehensive-kb",
        output: `${catalogQuery.totalMatches} catalog matches; ${totals.total.toLocaleString()} total assets indexed`
      });
    }

    // STEP 3: Build coordinated request with aggregated context
    const coordRequest = {
      controller: request.controller || "fanuc",
      machineType: (request.machineType === "lathe" ? "lathe" :
                   request.machineType === "wire-edm" ? "wire-edm" :
                   "mill") as "mill" | "lathe" | "turn-mill" | "5axis" | "wire-edm" | "sinker-edm",
      operations: request.operations || ["roughing"],
      material: request.material || "steel",
      cuttingParams: request.cuttingParams,
      crossDomainContext: [
        {
          source: "pp-agi-wiring",
          data: {
            tribalTips: knowledgeContext.tribalTips,
            criticalWarnings: knowledgeContext.criticalWarnings.length,
            recommendations: knowledgeContext.recommendations.length
          },
          confidence: 0.9
        }
      ]
    };

    // STEP 4: Execute via Coordination Bridge (invokes physics, generator, AGI master)
    let gcode: string[] | undefined;
    try {
      const coordResult = await postProcessorAICoordinationBridge.coordinate(coordRequest);
      gcode = coordResult.gcode;
      enginesInvoked.push(...coordResult.engineExecutions.filter(e => e.success).map(e => e.engineId));

      reasoningChain.push({
        step: "Coordinate execution",
        engine: "pp-coordination-bridge",
        output: `${coordResult.metadata.enginesSucceeded}/${coordResult.metadata.enginesInvoked} engines succeeded; safety: ${(coordResult.physicsAnalysis.overallSafetyScore * 100).toFixed(0)}%`
      });
    } catch (err) {
      reasoningChain.push({
        step: "Coordinate execution",
        engine: "pp-coordination-bridge",
        output: `Failed: ${err instanceof Error ? err.message : String(err)}`
      });
    }

    // STEP 5: Feedback loop (if enabled)
    if (request.options?.recordFeedback && gcode) {
      postProcessorAGIContinuousLearningEngine.recordFeedback({
        postId: `wiring-${Date.now()}`,
        generatedAt: new Date().toISOString(),
        outcome: "success",
        controller: request.controller || "unknown",
        material: request.material || "unknown",
        operations: request.operations || []
      });
      enginesInvoked.push("pp-agi-learning");

      reasoningChain.push({
        step: "Record feedback",
        engine: "pp-agi-learning",
        output: "Learning loop updated"
      });
    }

    const totalDuration = Date.now() - startTime;

    return {
      gcode,
      routing: {
        matchedRules: routing.matchedRules.length,
        recommendedEngines: routing.recommendedEngines.map(e => e.id),
        executionPlan: `${routing.recommendedEngines.length} engines recommended`
      },
      knowledgeContext,
      executionDetails: {
        enginesInvoked: [...new Set(enginesInvoked)],
        knowledgeEnginesQueried,
        totalDuration_ms: totalDuration,
        success: gcode !== undefined && gcode.length > 0
      },
      reasoningChain
    };
  }

  /**
   * Verify wiring status — check every engine is reachable
   */
  public verifyWiring(): {
    allKnowledgeEngines: string[];
    reachable: string[];
    unreachable: string[];
    registryCovered: string[];
    routingRulesCount: number;
    wiringComplete: boolean;
  } {
    const registry = postProcessorAGIMasterRegistryEngine;
    const allEngines = registry.getAllEngines();
    const registryIds = new Set(allEngines.map(e => e.id));

    const reachable: string[] = [];
    const unreachable: string[] = [];

    for (const engineId of this.allKnowledgeEngines) {
      if (registryIds.has(engineId)) {
        reachable.push(engineId);
      } else {
        unreachable.push(engineId);
      }
    }

    const wiringComplete = unreachable.length === 0;

    return {
      allKnowledgeEngines: this.allKnowledgeEngines,
      reachable,
      unreachable,
      registryCovered: allEngines.map(e => e.id),
      routingRulesCount: registry.getStatistics().routingRules,
      wiringComplete
    };
  }

  /**
   * Get engine invocation plan for a task
   */
  public planExecution(task: string): {
    task: string;
    routedEngines: string[];
    knowledgeEngines: string[];
    totalEngines: number;
    estimatedComplexity: "simple" | "moderate" | "complex";
  } {
    const routing = postProcessorAGIMasterRegistryEngine.routeTask(task);
    const routedIds = routing.recommendedEngines.map(e => e.id);

    const allInvolved = new Set([...routedIds, ...this.allKnowledgeEngines]);
    const total = allInvolved.size;

    const complexity = total < 5 ? "simple" : total < 10 ? "moderate" : "complex";

    return {
      task,
      routedEngines: routedIds,
      knowledgeEngines: this.allKnowledgeEngines,
      totalEngines: total,
      estimatedComplexity: complexity
    };
  }

  /**
   * Get quick wiring health check
   */
  public quickHealthCheck(): {
    healthy: boolean;
    engines: { id: string; reachable: boolean }[];
    summary: string;
  } {
    const verification = this.verifyWiring();
    const engines = this.allKnowledgeEngines.map(id => ({
      id,
      reachable: verification.reachable.includes(id)
    }));

    const summary = verification.wiringComplete
      ? `All ${engines.length} knowledge engines reachable. Routing rules: ${verification.routingRulesCount}. System healthy.`
      : `WARNING: ${verification.unreachable.length} engine(s) unreachable: ${verification.unreachable.join(", ")}`;

    return {
      healthy: verification.wiringComplete,
      engines,
      summary
    };
  }

  /**
   * Get AI context
   */
  public getContextForAI(): string {
    const verification = this.verifyWiring();
    return `
POST PROCESSOR AGI WIRING INTEGRATION (v${this.engineVersion})
===============================================================
WIRING STATUS: ${verification.wiringComplete ? "COMPLETE ✓" : "INCOMPLETE"}
  Knowledge engines tracked: ${verification.allKnowledgeEngines.length}
  Reachable in registry:     ${verification.reachable.length}
  Unreachable:               ${verification.unreachable.length}
  Routing rules:             ${verification.routingRulesCount}

KNOWLEDGE ENGINES WIRED:
${verification.reachable.map(id => `  ✓ ${id}`).join("\n")}
${verification.unreachable.length > 0 ? `\nUNREACHABLE:\n${verification.unreachable.map(id => `  ✗ ${id}`).join("\n")}` : ""}

PIPELINE STAGES (runFullPipeline):
  1. Route task via PP_MASTER_REGISTRY
  2. Aggregate knowledge from 7 engines:
     - Tribal wisdom
     - Production patterns (JM Die 24,469 programs)
     - Machine kinematics (910+ machines)
     - CPS implementation (3 PRISM-enhanced posts)
     - HyperMILL production knowledge
     - Master post architecture (26 machine types)
     - Comprehensive catalog (30,000+ entries)
  3. Build enriched coordinated request with context
  4. Execute via Coordination Bridge (physics + generator + AGI master)
  5. Record feedback for continuous learning

API METHODS:
  runFullPipeline(request) → full AGI execution with ALL knowledge
  verifyWiring() → check every engine reachable
  planExecution(task) → see routing + knowledge plan
  quickHealthCheck() → engine-by-engine status
`;
  }

  /**
   * Get statistics
   */
  public getStatistics(): {
    version: string;
    knowledgeEnginesTracked: number;
    wiringComplete: boolean;
    routingRules: number;
    registryEngines: number;
    unreachable: number;
  } {
    const v = this.verifyWiring();
    return {
      version: this.engineVersion,
      knowledgeEnginesTracked: this.allKnowledgeEngines.length,
      wiringComplete: v.wiringComplete,
      routingRules: v.routingRulesCount,
      registryEngines: v.registryCovered.length,
      unreachable: v.unreachable.length
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const postProcessorAGIWiringIntegrationEngine = new PostProcessorAGIWiringIntegrationEngine();

export {
  type WiringRequest,
  type WiringResult
};
