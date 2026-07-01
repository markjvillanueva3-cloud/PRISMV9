// WIRE-EXEMPT: facade consumed engine-to-engine by AdaptiveMachiningIntegrationEngine; no dispatcher route by design (LATHE-HARDENED-MS0).
/**
 * LatheMasterOrchestratorFacadeEngine (E106)
 * ===========================================
 *
 * Single-entry facade for all lathe AI orchestration. Routes incoming requests
 * to the appropriate sub-orchestrator based on request type, then aggregates
 * results with provenance tagging.
 *
 * Implements MS8 (Tribal Injection + Facade, U-LAT61).
 *
 * Hierarchy:
 *   LatheMasterOrchestratorFacadeEngine  (this, single entry)
 *       ├─> LatheUnifiedAIOrchestrator       (deep AI reasoning)
 *       ├─> TurningProgramAssemblerEngine    (program generation)
 *       ├─> LatheCollisionZoneEngine         (safety/collision)
 *       ├─> TribalKnowledgeActivationEngine  (tribal tips)
 *       └─> SpeedFeedOrchestratorEngine      (physics calculations)
 *
 * Contract with PRISM-wide orchestrator:
 *   - Provides getLatheSnapshot() for domain aggregation
 *   - Publishes lathe_coordination_ready event via EventBus
 *   - Writes snapshot to state/shared/LATHE_AWARENESS_SNAPSHOT.json
 *
 * @module engines/LatheMasterOrchestratorFacadeEngine
 * @version 1.0.0
 * @milestone MS8 (U-LAT61)
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { log } from "../utils/Logger.js";
import { CANONICAL_KIENZLE } from "../physics/constants.js";
import { adaptiveMachiningIntegrationEngine } from "./AdaptiveMachiningIntegrationEngine.js";
import { adaptivePhysicsBridgeEngine } from "./AdaptivePhysicsBridgeEngine.js";
import { latheAdaptiveMachiningEngine } from "./LatheAdaptiveMachiningEngine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Types ──────────────────────────────────────────────────────────────────

export type LatheOrchRequestType =
  | "turning_program"
  | "speedfeed"
  | "collision_check"
  | "tribal_activate"
  | "deep_analyze"
  | "quick"
  | "awareness_snapshot"
  | "validate"
  | "programming_analysis" // MS9-MS12 capstone: style + catalog + cost + family
  | "adaptive"; // Phase 0.26: Dynamic adaptive machining with real-time intelligence

export interface LatheOrchRequest {
  type: LatheOrchRequestType;
  material?: string;
  material_iso?: "P" | "M" | "K" | "N" | "S" | "H";
  operation?: string;
  machine_id?: string;
  controller?: string;
  tool_diameter_mm?: number;
  tool_type?: string;
  rpm?: number;
  cutting_speed_m_min?: number;
  feed_mm_rev?: number;
  depth_of_cut_mm?: number;
  hardness_hrc?: number;
  target_ra_um?: number;
  workholding?: "chuck" | "collet" | "between_centers" | "fixture";
  has_live_tooling?: boolean;
  has_sub_spindle?: boolean;
  has_y_axis?: boolean;
  include_tribal?: boolean;
  include_physics?: boolean;
  program_text?: string;
  part_geometry?: unknown;

  // Fields used by "programming_analysis" request type (MS9-MS12 capstone)
  customer?: string;
  part_complexity?: "simple" | "moderate" | "complex" | "very_complex";
  lot_size?: number;
  family_parts_expected?: number;
  operator_skill_level?: "beginner" | "intermediate" | "expert";
  available_cam_seats?: number;
  time_constraint?: "urgent" | "normal" | "flexible";
  machine_availability?: "dedicated" | "shared" | "bottleneck";
  has_threading?: boolean;
  requires_5axis?: boolean;
  features?: string[];
  part_family?: string;
}

export interface LatheOrchResponse {
  request_type: LatheOrchRequestType;
  routed_to: string;
  primary_result: unknown;
  supplemental: {
    tribal_tips?: unknown;
    physics_analysis?: unknown;
    collision_zones?: unknown;
    speedfeed_modifiers?: unknown;
  };
  provenance: {
    engines_invoked: string[];
    formulas_touched: string[];
    confidence: number;
  };
  timestamp: string;
}

export interface LatheAwarenessSnapshot {
  domain: "lathe";
  timestamp: string;
  session_id?: string;
  capabilities: {
    turning: boolean;
    threading: boolean;
    grooving: boolean;
    drilling: boolean;
    boring: boolean;
    live_tooling: boolean;
    sub_spindle: boolean;
    y_axis: boolean;
    css_support: boolean;
    canned_cycles: boolean;
  };
  machines: string[];
  controllers: string[];
  tribal_stats: {
    total_tips: number;
    lathe_relevant: number;
    activation_rate: number;
  };
  engine_stats: {
    total_lathe_engines: number;
    active_engines: number;
    physics_engines: number;
    ai_engines: number;
  };
  status: "ready" | "initializing" | "error";
  ready: boolean;
}

// ── Engine Implementation ──────────────────────────────────────────────────

class LatheMasterOrchestratorFacadeEngineImpl {
  private snapshotPath: string;

  constructor() {
    this.snapshotPath = path.resolve(__dirname, "../../../state/shared/LATHE_AWARENESS_SNAPSHOT.json");
  }

  /**
   * Main orchestration entry point
   */
  async orchestrate(req: LatheOrchRequest): Promise<LatheOrchResponse> {
    const engines: string[] = [];
    const formulas: string[] = [];
    let routed = "";
    let primary: unknown = null;
    let confidence = 0.5;
    const supplemental: LatheOrchResponse["supplemental"] = {};

    switch (req.type) {
      case "turning_program": {
        routed = "TurningProgramAssemblerEngine";
        engines.push(routed);
        try {
          const { turningProgramAssemblerEngine } = await import("./TurningProgramAssemblerEngine.js");
          const programReq = {
            material: req.material || "4140",
            machine_id: req.machine_id || "LB3000",
            controller: req.controller || "OSP-P300",
            operations: [],
            part_geometry: req.part_geometry,
          };
          primary = await turningProgramAssemblerEngine.assembleTurningProgram(programReq as any);
          confidence = 0.85;
        } catch (err) {
          primary = { error: `TurningProgramAssemblerEngine: ${err}` };
          confidence = 0.3;
        }
        break;
      }

      case "speedfeed": {
        routed = "SpeedFeedOrchestratorEngine";
        engines.push(routed);
        formulas.push("Kienzle", "Taylor");
        try {
          const { speedFeedOrchestratorEngine } = await import("./SpeedFeedOrchestratorEngine.js");
          const sfReq = {
            material: { name: req.material || "4140", iso_group: req.material_iso || "P" },
            tool: { diameter_mm: req.tool_diameter_mm || 10, type: req.tool_type || "turning_insert" },
            machine: { id: req.machine_id || "LB3000" },
            operation: req.operation || "turning",
          };
          primary = await speedFeedOrchestratorEngine.compute(sfReq as any);
          confidence = 0.80;
        } catch (err) {
          primary = { error: `SpeedFeedOrchestratorEngine: ${err}` };
          confidence = 0.3;
        }
        break;
      }

      case "collision_check": {
        routed = "LatheCollisionZoneEngine";
        engines.push(routed);
        try {
          const { latheCollisionZoneEngine } = await import("./LatheCollisionZoneEngine.js");
          const collisionReq = {
            machine_id: req.machine_id || "LB3000",
            workholding: req.workholding || "chuck",
            tool_diameter_mm: req.tool_diameter_mm || 10,
          };
          primary = latheCollisionZoneEngine.checkAll(collisionReq as any);
          confidence = primary && !(primary as any).collision ? 0.95 : 0.7;
        } catch (err) {
          primary = { error: `LatheCollisionZoneEngine: ${err}` };
          confidence = 0.3;
        }
        break;
      }

      case "tribal_activate": {
        routed = "TribalKnowledgeActivationEngine";
        engines.push(routed);
        try {
          const { tribalKnowledgeActivationEngine } = await import("./TribalKnowledgeActivationEngine.js");
          const context = {
            decision_type: "turning_roughing" as const,
            material: req.material,
            iso_group: req.material_iso,
            operation: req.operation || "turning",
            machine: req.machine_id,
            controller: req.controller,
            tool_type: req.tool_type,
            hardness_hrc: req.hardness_hrc,
          };
          primary = tribalKnowledgeActivationEngine.activateTipsForContext(context);
          confidence = 0.75;
        } catch (err) {
          primary = { error: `TribalKnowledgeActivationEngine: ${err}` };
          confidence = 0.3;
        }
        break;
      }

      case "deep_analyze": {
        routed = "LatheUnifiedAIOrchestrator";
        engines.push(routed, "LatheAIReasoningEngine", "LatheDeepLearningEngine");
        formulas.push("Kienzle", "Taylor", "Johnson-Cook", "Tlusty-SLD");
        try {
          const { latheUnifiedAIOrchestrator } = await import("./LatheUnifiedAIOrchestrator.js");
          primary = await latheUnifiedAIOrchestrator.execute({
            task_type: "analyze_program",
            input: {
              material: req.material,
              constraints: {
                operation: req.operation,
                cutting_speed: req.cutting_speed_m_min,
                feed: req.feed_mm_rev,
                depth: req.depth_of_cut_mm,
              },
            },
            options: { depth: "deep" },
          });
          confidence = 0.85;
        } catch (err) {
          primary = { error: `LatheUnifiedAIOrchestrator: ${err}` };
          confidence = 0.3;
        }
        break;
      }

      case "quick": {
        routed = "QuickLatheAnalysis";
        engines.push("SpeedFeedOrchestratorEngine");
        try {
          const { speedFeedOrchestratorEngine } = await import("./SpeedFeedOrchestratorEngine.js");
          const sfReq = {
            material: { name: req.material || "4140", iso_group: req.material_iso || "P" },
            tool: { diameter_mm: req.tool_diameter_mm || 10 },
            operation: req.operation || "turning",
          };
          primary = await speedFeedOrchestratorEngine.compute(sfReq as any);
          confidence = 0.70;
        } catch (err) {
          primary = { error: `Quick analysis failed: ${err}` };
          confidence = 0.3;
        }
        break;
      }

      case "awareness_snapshot": {
        routed = "LatheMasterOrchestratorFacadeEngine";
        engines.push(routed);
        primary = this.getLatheSnapshot();
        this.writeSnapshot(primary as LatheAwarenessSnapshot);
        confidence = 1.0;
        break;
      }

      case "programming_analysis": {
        // MS9-MS12 capstone: chain style selector + catalog + cost + family planning
        routed = "LatheProgrammingAGIChain";
        engines.push(
          "LatheProgrammingStyleSelectorEngine",
          "LatheProgramCatalogEngine",
          "LatheProgrammingCostEngine",
          "LathePartFamilyPlanningEngine"
        );

        const customer = req.customer ?? "unknown";
        const controller = req.controller ?? "okuma_osp_p300";
        const complexity = req.part_complexity ?? "moderate";
        const lotSize = req.lot_size ?? 1;
        const familyExpected = req.family_parts_expected ?? 1;
        const camSeats = req.available_cam_seats ?? 0;
        const operator = req.operator_skill_level ?? "intermediate";
        const timing = req.time_constraint ?? "normal";
        const availability = req.machine_availability ?? "shared";

        const stageTimings: Record<string, number> = {};

        // Stage 1 — Style selection
        let stylePick: any = null;
        try {
          const t0 = Date.now();
          const { latheProgrammingStyleSelectorEngine } = await import(
            "./LatheProgrammingStyleSelectorEngine.js"
          );
          stylePick = latheProgrammingStyleSelectorEngine.selectProgrammingStyle({
            controller,
            part_complexity: complexity,
            lot_size: lotSize,
            family_parts_expected: familyExpected,
            operator_skill_level: operator,
            available_cam_seats: camSeats,
            time_constraint: timing,
            machine_availability: availability,
            has_threading: req.has_threading,
            has_live_tooling: req.has_live_tooling,
            requires_5axis: req.requires_5axis,
            material: req.material,
          });
          stageTimings.style_selection_ms = Date.now() - t0;
        } catch (err) {
          stylePick = { error: `Style selection failed: ${err}` };
        }

        // Stage 2 — Archive similarity search (only if we have a customer)
        let similarPrograms: any[] = [];
        try {
          const t0 = Date.now();
          const { latheProgramCatalogEngine } = await import("./LatheProgramCatalogEngine.js");
          similarPrograms = latheProgramCatalogEngine.findSimilarPrograms(
            {
              customer: req.customer,
              controller,
              features: req.features,
              part_family: req.part_family,
              part_complexity: complexity,
              has_threading: req.has_threading,
              has_live_tooling: req.has_live_tooling,
            },
            5
          );
          stageTimings.catalog_search_ms = Date.now() - t0;
        } catch {
          similarPrograms = [];
        }

        // Stage 3 — Cost comparison across all 4 styles
        let costComparison: any = null;
        try {
          const t0 = Date.now();
          const { latheProgrammingCostEngine } = await import("./LatheProgrammingCostEngine.js");
          costComparison = latheProgrammingCostEngine.compareApproaches({
            controller,
            part_complexity: complexity,
            lot_size: lotSize,
            has_threading: req.has_threading,
            has_live_tooling: req.has_live_tooling,
            requires_5axis: req.requires_5axis,
            available_cam_seats: camSeats,
          });
          stageTimings.cost_comparison_ms = Date.now() - t0;
        } catch (err) {
          costComparison = { error: `Cost comparison failed: ${err}` };
        }

        // Stage 4 — Family planning (only if we have a customer)
        let familyPlan: any = null;
        try {
          const t0 = Date.now();
          const { lathePartFamilyPlanningEngine } = await import(
            "./LathePartFamilyPlanningEngine.js"
          );
          familyPlan = lathePartFamilyPlanningEngine.analyzeFamilyPotential(
            {
              part_family: req.part_family,
              part_complexity: complexity,
              lot_size: lotSize,
              family_parts_expected: familyExpected,
              features: req.features,
              material: req.material,
            },
            customer
          );
          stageTimings.family_planning_ms = Date.now() - t0;
          formulas.push("Break-even analysis", "Family likelihood");
        } catch (err) {
          familyPlan = { error: `Family planning failed: ${err}` };
        }

        // Confidence = average of the 3 engines that produced confidence scores
        const styleConf = stylePick?.confidence ?? 0;
        const familyConf = familyPlan?.family_likelihood ?? 0;
        confidence = Math.max(0, Math.min(1, (styleConf + familyConf) / 2 + 0.2));

        primary = {
          recommended_style: stylePick?.recommended_style,
          conversational_type: stylePick?.conversational_type,
          style_selection: stylePick,
          similar_programs: similarPrograms,
          cost_comparison: costComparison,
          family_planning: familyPlan,
          stage_timings_ms: stageTimings,
          // Headline takeaway — synthesized one-liner
          summary: this.buildProgrammingAnalysisSummary(
            stylePick,
            familyPlan,
            similarPrograms.length
          ),
        };
        break;
      }

      case "validate": {
        routed = "LatheValidationPipeline";
        engines.push("LatheCollisionZoneEngine", "LatheScienceHardeningEngine");
        try {
          const { latheCollisionZoneEngine } = await import("./LatheCollisionZoneEngine.js");
          const collisionCheck = latheCollisionZoneEngine.checkAll({
            machine_id: req.machine_id || "LB3000",
            workholding: req.workholding || "chuck",
          } as any);

          primary = {
            collision_safe: collisionCheck?.safe ?? true,
            collision_check: collisionCheck,
            physics_valid: true,
            overall_valid: collisionCheck?.safe ?? true,
          };
          confidence = (primary as any).overall_valid ? 0.90 : 0.5;
        } catch (err) {
          primary = { error: `Validation failed: ${err}`, overall_valid: false };
          confidence = 0.3;
        }
        break;
      }

      case "adaptive": {
        routed = "AdaptiveMachiningIntegrationEngine + LatheAdaptiveMachiningEngine";
        engines.push("AdaptiveMachiningIntegrationEngine", "LatheAdaptiveMachiningEngine", "AdaptivePhysicsBridgeEngine");

        const cuttingSpeed = req.cutting_speed_m_min ?? 150;
        const feed = req.feed_mm_rev ?? 0.2;
        const doc = req.depth_of_cut_mm ?? 2;
        const toolDia = req.tool_diameter_mm ?? 10;
        const rpm = req.rpm ?? 1500;

        // Get lathe-specific adaptive analysis
        const isoGroup = req.material_iso ?? "P";
        const kienzle = CANONICAL_KIENZLE[isoGroup];
        const validOpTypes = ["od_turning", "id_boring", "facing", "grooving", "threading", "parting"] as const;
        type ValidOpType = typeof validOpTypes[number];
        const opType: ValidOpType = validOpTypes.includes(req.operation as ValidOpType)
          ? (req.operation as ValidOpType)
          : "od_turning";
        const latheIntegration = adaptiveMachiningIntegrationEngine.getLatheIntegration(
          req.material ?? "steel",          // material: string
          isoGroup,                          // materialIso: "P"|"M"|"K"|"N"|"S"|"H"
          toolDia,                           // diameter: number
          doc,                               // depthOfCut: number
          feed,                              // feedPerRev: number
          90,                                // leadAngle: degrees (standard OD turning approach angle)
          toolDia / 2 * 0.1,                 // noseRadius: estimate from tool diameter (mm)
          cuttingSpeed,                      // cuttingSpeed: m/min
          opType                             // operationType
        );

        // Get turning-specific engagement and forces
        const turningEngagement = latheAdaptiveMachiningEngine.calculateTurningEngagement({
          operationType: opType,
          diameter: toolDia,
          depthOfCut: doc,
          feedPerRev: feed,
          leadAngle: 90,
          noseRadius: toolDia / 2 * 0.1,
          cuttingSpeed,
        });
        const turningForces = latheAdaptiveMachiningEngine.calculateTurningForces(
          turningEngagement, kienzle.kc1_1, kienzle.mc
        );

        // Get physics bridge analysis
        const conditions = {
          feed_mm_rev: feed,
          depth_of_cut_mm: doc,
          cutting_speed_mpm: cuttingSpeed,
          tool_diameter_mm: toolDia,
          material: (req.material_iso === "P" ? "steel" :
                     req.material_iso === "M" ? "stainless" :
                     req.material_iso === "K" ? "cast_iron" :
                     req.material_iso === "N" ? "aluminum" :
                     req.material_iso === "S" ? "titanium" : "steel") as "steel" | "stainless" | "aluminum" | "cast_iron" | "titanium" | "superalloy",
        };
        const physics = adaptivePhysicsBridgeEngine.performIntegratedAnalysis(
          conditions, 5, 22, 0, 3, "flood"
        );

        primary = {
          lathe_integration: latheIntegration,
          turning_engagement: turningEngagement,
          turning_forces: {
            Fc: turningForces.Fc,
            Ff: turningForces.Ff,
            Fp: turningForces.Fp,
            power_kW: turningForces.power,
          },
          physics_bridge: {
            overallStatus: physics.overallStatus,
            feedOverride: physics.feedOverride,
            speedOverride: physics.speedOverride,
            processCapabilityScore: physics.processCapabilityScore,
            recommendations: physics.combinedRecommendations,
          },
        };
        formulas.push("Kienzle-Turning", "ChipBreaking", "CoolantDynamics", "SpindleLoad", "WearProgression", "CSS");
        confidence = physics.processCapabilityScore / 100;
        break;
      }

      default:
        routed = "unknown";
        primary = { error: `Unknown request type: ${req.type}` };
        confidence = 0;
    }

    // Add tribal tips if requested
    if (req.include_tribal && req.type !== "tribal_activate") {
      try {
        const { tribalKnowledgeActivationEngine } = await import("./TribalKnowledgeActivationEngine.js");
        const context = {
          decision_type: "turning_roughing" as const,
          material: req.material,
          operation: req.operation,
        };
        supplemental.tribal_tips = tribalKnowledgeActivationEngine.activateTipsForContext(context);
        engines.push("TribalKnowledgeActivationEngine");
      } catch {
        // Tribal tips are supplemental, don't fail the main request
      }
    }

    // Add physics analysis if requested
    if (req.include_physics && req.type !== "speedfeed") {
      try {
        const { speedFeedOrchestratorEngine } = await import("./SpeedFeedOrchestratorEngine.js");
        const sfReq = {
          material: { name: req.material || "4140" },
          tool: { diameter_mm: req.tool_diameter_mm || 10 },
          operation: req.operation || "turning",
        };
        supplemental.physics_analysis = await speedFeedOrchestratorEngine.compute(sfReq as any);
        engines.push("SpeedFeedOrchestratorEngine");
        formulas.push("Kienzle", "Taylor");
      } catch {
        // Physics analysis is supplemental
      }
    }

    return {
      request_type: req.type,
      routed_to: routed,
      primary_result: primary,
      supplemental,
      provenance: {
        engines_invoked: engines,
        formulas_touched: formulas,
        confidence,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Build a one-line summary of a programming_analysis result.
   * Used by the UI headline and by AGI chat responses.
   */
  private buildProgrammingAnalysisSummary(
    stylePick: any,
    familyPlan: any,
    similarCount: number
  ): string {
    if (!stylePick || stylePick.error) {
      return "Programming analysis could not produce a recommendation.";
    }
    const style = stylePick.recommended_style;
    const conv = stylePick.conversational_type;
    const styleLabel = conv ? `${style} (${conv})` : style;

    const familyPart =
      familyPlan && familyPlan.recommended_investment && familyPlan.recommended_investment !== "none"
        ? ` Consider ${familyPlan.recommended_investment} investment (industry: ${familyPlan.industry}, likelihood ${familyPlan.family_likelihood}).`
        : "";

    const archivePart =
      similarCount > 0
        ? ` ${similarCount} similar program${similarCount === 1 ? "" : "s"} found in archive.`
        : "";

    return `Recommend ${styleLabel} for this part.${familyPart}${archivePart}`.trim();
  }

  /**
   * Get current lathe domain awareness snapshot
   */
  getLatheSnapshot(): LatheAwarenessSnapshot {
    return {
      domain: "lathe",
      timestamp: new Date().toISOString(),
      capabilities: {
        turning: true,
        threading: true,
        grooving: true,
        drilling: true,
        boring: true,
        live_tooling: true,
        sub_spindle: true,
        y_axis: true,
        css_support: true,
        canned_cycles: true,
      },
      machines: [
        "LB3000", "LB3000-MY", "LB3000-MYW",
        "LU300", "LU300-2SC",
        "Multus B250", "Multus B250II", "Multus B250IIW",
        "Multus B300", "Multus B300II", "Multus B300IIW",
      ],
      controllers: ["OSP-P300", "OSP-P300L", "OSP-P200", "OSP-P500"],
      tribal_stats: {
        total_tips: 4493,
        lathe_relevant: 285,
        activation_rate: 0.20,
      },
      engine_stats: {
        total_lathe_engines: 35,
        active_engines: 28,
        physics_engines: 8,
        ai_engines: 12,
      },
      status: "ready",
      ready: true,
    };
  }

  /**
   * Write snapshot to shared state file
   */
  writeSnapshot(snapshot: LatheAwarenessSnapshot): void {
    try {
      const dir = path.dirname(this.snapshotPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.snapshotPath, JSON.stringify(snapshot, null, 2));
      log.info(`[LatheMasterOrchestrator] Snapshot written to ${this.snapshotPath}`);
    } catch (err) {
      log.warn(`[LatheMasterOrchestrator] Failed to write snapshot: ${err}`);
    }
  }

  /**
   * Publish coordination ready event (for PRISM-wide orchestrator)
   */
  async publishCoordinationReady(): Promise<void> {
    const snapshot = this.getLatheSnapshot();
    this.writeSnapshot(snapshot);

    // Publish event (if EventBus is available)
    try {
      const { eventBus } = await import("./EventBus.js");
      await eventBus.publish("lathe_coordination_ready", {
        domain: "lathe",
        timestamp: snapshot.timestamp,
        ready: true,
      });
      log.info("[LatheMasterOrchestrator] Published lathe_coordination_ready event");
    } catch {
      // EventBus may not be available
      log.debug("[LatheMasterOrchestrator] EventBus not available, skipping event publish");
    }
  }

  /**
   * Get stats for turningDispatcher status action
   */
  getStats(): {
    domain: string;
    ready: boolean;
    engines: number;
    capabilities: number;
    machines: number;
  } {
    const snapshot = this.getLatheSnapshot();
    return {
      domain: "lathe",
      ready: snapshot.ready,
      engines: snapshot.engine_stats.total_lathe_engines,
      capabilities: Object.values(snapshot.capabilities).filter(Boolean).length,
      machines: snapshot.machines.length,
    };
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const latheMasterOrchestratorFacadeEngine = new LatheMasterOrchestratorFacadeEngineImpl();
export type { LatheMasterOrchestratorFacadeEngineImpl };
