/**
 * MillMasterOrchestratorFacadeEngine
 *
 * Single-entry facade for all mill AI orchestration. Routes incoming requests
 * to the appropriate sub-orchestrator based on request type, then aggregates
 * results with provenance tagging.
 *
 * Implements MILL-INTEG-MS1 (Orchestrator Consolidation, U-MIL12/U-MIL13).
 *
 * Hierarchy (docs/mill-orchestrator-hierarchy.md):
 *   MillMasterOrchestratorFacadeEngine  (this, single entry)
 *       ├─> MillingAGIMasterEngine       (wisdom + validation)
 *       ├─> MillingAGIOrchestrationEngine (physics-state pipeline)
 *       ├─> MillingUnifiedScienceOrchestrationEngine (7-domain synergy)
 *       └─> MillingEndToEndOrchestrationEngine (print-to-program)
 */

import { millingAGIMasterEngine } from "./MillingAGIMasterEngine.js";
import { millingAGIOrchestrationEngine } from "./MillingAGIOrchestrationEngine.js";
import { millingUnifiedScienceOrchestrationEngine } from "./MillingUnifiedScienceOrchestrationEngine.js";
import { millingEndToEndOrchestrationEngine } from "./MillingEndToEndOrchestrationEngine.js";
import { millResourceAwarenessEngine } from "./MillResourceAwarenessEngine.js";
import { toolHolderRegistryEngine } from "./ToolHolderRegistryEngine.js";
import { millTribalKnowledgeEngine } from "./MillTribalKnowledgeEngine.js";

export type MillOrchRequestType =
  | "print_to_program"
  | "scientific"
  | "agi"
  | "validate"
  | "quick"
  | "wisdom";

export interface MillOrchRequest {
  type: MillOrchRequestType;
  material: string;
  operation?: string;
  tool_diameter_mm?: number;
  tool_flutes?: number;
  rpm?: number;
  feed_mm_min?: number;
  cutting_speed_m_min?: number;
  feed_per_tooth_mm?: number;
  axial_depth_mm?: number;
  radial_depth_mm?: number;
  material_iso?: "P" | "M" | "K" | "N" | "S" | "H";
  wisdom_category?: string;
  print?: unknown;
  include_resources?: boolean;
  include_tribal?: boolean;
  include_holder_rec?: boolean;
}

export interface MillOrchResponse {
  request_type: MillOrchRequestType;
  routed_to: string;
  primary_result: unknown;
  supplemental: {
    resources?: unknown;
    tribal_tips?: unknown;
    holder_recommendation?: unknown;
  };
  provenance: {
    engines_invoked: string[];
    formulas_touched: string[];
    confidence: number;
  };
  ts: string;
}

export class MillMasterOrchestratorFacadeEngine {
  orchestrate(req: MillOrchRequest): MillOrchResponse {
    const engines: string[] = [];
    const formulas: string[] = [];
    let routed = "";
    let primary: unknown = null;
    let confidence = 0.5;

    switch (req.type) {
      case "print_to_program": {
        routed = "MillingEndToEndOrchestrationEngine";
        engines.push(routed);
        const workflow = millingEndToEndOrchestrationEngine.getWorkflowTemplate();
        const validation = req.print
          ? millingEndToEndOrchestrationEngine.validateRequest(
              req.print as Parameters<typeof millingEndToEndOrchestrationEngine.validateRequest>[0]
            )
          : null;
        primary = { workflow, validation };
        confidence = validation ? (validation.valid ? 0.9 : 0.6) : 0.75;
        break;
      }

      case "scientific": {
        routed = "MillingUnifiedScienceOrchestrationEngine";
        engines.push(routed);
        const Vc = req.cutting_speed_m_min ?? 100;
        const fz = req.feed_per_tooth_mm ?? 0.1;
        const ap = req.axial_depth_mm ?? 2;
        const ae = req.radial_depth_mm ?? 6;
        const D = req.tool_diameter_mm ?? 12;
        const result = millingUnifiedScienceOrchestrationEngine.quickAnalyze(
          req.material,
          Vc,
          fz,
          ap,
          ae,
          D
        );
        primary = result;
        formulas.push("Kienzle", "Taylor", "Loewen-Shaw", "Altintas-Budak");
        confidence = result.stable ? 0.85 : 0.65;
        break;
      }

      case "agi": {
        routed = "MillingAGIOrchestrationEngine";
        engines.push("MillingAGIMasterEngine", routed);
        const result = millingAGIOrchestrationEngine.analyzeWithAGI({
          material: req.material,
          tool_diameter_mm: req.tool_diameter_mm ?? 12,
          tool_flutes: req.tool_flutes ?? 4,
          cutting_speed_m_min: req.cutting_speed_m_min ?? 100,
          feed_per_tooth_mm: req.feed_per_tooth_mm ?? 0.1,
          axial_depth_mm: req.axial_depth_mm ?? 2,
          radial_depth_mm: req.radial_depth_mm ?? 6,
          operation: req.operation ?? "roughing",
        });
        primary = result;
        formulas.push("Kienzle", "Taylor", "Johnson-Cook", "Archard", "Zorev");
        confidence = result.state?.confidence ?? 0.8;
        break;
      }

      case "validate": {
        routed = "MillingAGIMasterEngine";
        engines.push(routed);
        const result = millingAGIMasterEngine.validateApproach({
          material_iso: req.material_iso ?? "P",
          operation: req.operation ?? "roughing",
          rpm: req.rpm ?? 3000,
          feed: req.feed_mm_min ?? 500,
          doc: req.axial_depth_mm ?? 2,
          tool_diameter: req.tool_diameter_mm ?? 12,
        });
        primary = result;
        formulas.push("Kienzle", "Power = Fc·Vc/60000");
        confidence = result.valid ? 0.9 : 0.5;
        break;
      }

      case "quick": {
        routed = "MillingUnifiedScienceOrchestrationEngine";
        engines.push(routed);
        primary = millingUnifiedScienceOrchestrationEngine.quickAnalyze(
          req.material,
          req.cutting_speed_m_min ?? 100,
          req.feed_per_tooth_mm ?? 0.1,
          req.axial_depth_mm ?? 2,
          req.radial_depth_mm ?? 6,
          req.tool_diameter_mm ?? 12
        );
        formulas.push("Kienzle", "Taylor");
        confidence = 0.75;
        break;
      }

      case "wisdom": {
        routed = "MillingAGIMasterEngine";
        engines.push(routed);
        primary = {
          category: req.wisdom_category ?? "general",
          wisdom: millingAGIMasterEngine.getMasterWisdom(req.wisdom_category ?? "general"),
          available_categories: millingAGIMasterEngine.getWisdomCategories(),
        };
        confidence = 0.95;
        break;
      }

      default: {
        routed = "MillingUnifiedScienceOrchestrationEngine";
        engines.push(routed);
        primary = millingUnifiedScienceOrchestrationEngine.quickAnalyze(
          req.material,
          100,
          0.1,
          2,
          6,
          12
        );
        confidence = 0.5;
      }
    }

    const supplemental: MillOrchResponse["supplemental"] = {};

    if (req.include_resources) {
      supplemental.resources = millResourceAwarenessEngine.query({
        material: req.material,
      });
      engines.push("MillResourceAwarenessEngine");
    }

    if (req.include_tribal) {
      supplemental.tribal_tips = millTribalKnowledgeEngine.query({
        material: req.material,
        min_confidence: 0.85,
      });
      engines.push("MillTribalKnowledgeEngine");
    }

    if (req.include_holder_rec && req.tool_diameter_mm && req.rpm) {
      supplemental.holder_recommendation = toolHolderRegistryEngine.recommendForTool(
        req.tool_diameter_mm,
        "BT40",
        req.rpm,
        req.operation === "finish" ? "finish" : "rough"
      );
      engines.push("ToolHolderRegistryEngine");
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
      ts: new Date().toISOString(),
    };
  }

  getRoutingMap(): Record<MillOrchRequestType, string> {
    return {
      print_to_program: "MillingEndToEndOrchestrationEngine",
      scientific: "MillingUnifiedScienceOrchestrationEngine",
      agi: "MillingAGIOrchestrationEngine (via AGIMaster)",
      validate: "MillingAGIMasterEngine",
      quick: "MillingUnifiedScienceOrchestrationEngine",
      wisdom: "MillingAGIMasterEngine",
    };
  }

  getCoordinatedStats(): {
    agi_master: ReturnType<typeof millingAGIMasterEngine.getStats>;
    unified_science: ReturnType<typeof millingUnifiedScienceOrchestrationEngine.getStats>;
    end_to_end: ReturnType<typeof millingEndToEndOrchestrationEngine.getStats>;
    agi_orch: ReturnType<typeof millingAGIOrchestrationEngine.getStats>;
    total_engines: number;
  } {
    return {
      agi_master: millingAGIMasterEngine.getStats(),
      unified_science: millingUnifiedScienceOrchestrationEngine.getStats(),
      end_to_end: millingEndToEndOrchestrationEngine.getStats(),
      agi_orch: millingAGIOrchestrationEngine.getStats(),
      total_engines: 7,
    };
  }

  getSelfAwareness(): {
    engine_name: string;
    purpose: string;
    sub_orchestrators: string[];
    resource_engines: string[];
    integration_points: string[];
    formula_dependencies: string[];
  } {
    return {
      engine_name: "MillMasterOrchestratorFacadeEngine",
      purpose:
        "Single-entry facade consolidating 4 mill orchestrators + 3 resource engines",
      sub_orchestrators: [
        "MillingAGIMasterEngine",
        "MillingAGIOrchestrationEngine",
        "MillingUnifiedScienceOrchestrationEngine",
        "MillingEndToEndOrchestrationEngine",
      ],
      resource_engines: [
        "MillResourceAwarenessEngine",
        "ToolHolderRegistryEngine",
        "MillTribalKnowledgeEngine",
      ],
      integration_points: [
        "aiReasoningDispatcher (prism_ai:mill_orchestrate_master)",
        "PRISMSelfAwarenessEngine",
      ],
      formula_dependencies: [
        "Kienzle",
        "Taylor",
        "Johnson-Cook",
        "Altintas-Budak",
        "Loewen-Shaw",
        "Zorev",
        "Archard",
      ],
    };
  }
}

export const millMasterOrchestratorFacadeEngine = new MillMasterOrchestratorFacadeEngine();
