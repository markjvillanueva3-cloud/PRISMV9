/**
 * CAMKernelDispatcherBridge — CK-MS7
 * Provides dispatcher-callable actions for all CAM kernel engines.
 * Wire these into camDispatcher for unified access.
 *
 * Actions:
 *   cam_unified_generate — feature→G-code (simple parts)
 *   cam_complex_generate — 200+ features with multi-setup
 *   cam_production_toolpath — production-grade pocket with physics
 *   cam_multi_process — turning+EDM+grinding+laser+waterjet
 *   cam_mill_turn — mill-turn/Swiss program generation
 *   cam_5axis_convert — convert 3-axis path to 5-axis
 *   cam_advanced_strategy — flowline/geodesic/scallop/swarf/thread
 *   cam_smart_tool — physics-scored tool selection from 46K
 *   cam_verify — integrated verification (collision+physics+safety)
 *   cam_chatter_rpm — stochastic chatter-safe RPM selection
 *   cam_cost_feature — cost-per-feature breakdown
 */

import { UnifiedCAMPipelineEngine } from "./UnifiedCAMPipelineEngine.js";
import { ScalableCAMOrchestratorEngine } from "./ScalableCAMOrchestratorEngine.js";
import { ProductionToolpathEngine } from "./ProductionToolpathEngine.js";
import { MultiProcessCAMBridgeEngine } from "./MultiProcessCAMBridgeEngine.js";
import { MillTurnCAMEngine } from "./MillTurnCAMEngine.js";
import { FiveAxisCAMIntegrationEngine } from "./FiveAxisCAMIntegrationEngine.js";
import { AdvancedMillingStrategiesEngine } from "./AdvancedMillingStrategiesEngine.js";
import { SmartToolSelectorEngine } from "./SmartToolSelectorEngine.js";
import { IntegratedVerificationEngine } from "./IntegratedVerificationEngine.js";

const _unified = new UnifiedCAMPipelineEngine();
const _scalable = new ScalableCAMOrchestratorEngine();
const _production = new ProductionToolpathEngine();
const _multiProcess = new MultiProcessCAMBridgeEngine();
const _millTurn = new MillTurnCAMEngine();
const _fiveAxis = new FiveAxisCAMIntegrationEngine();
const _advanced = new AdvancedMillingStrategiesEngine();
const _smartTool = new SmartToolSelectorEngine();
const _verify = new IntegratedVerificationEngine();

export type CAMAction =
  | "cam_unified_generate"
  | "cam_complex_generate"
  | "cam_production_toolpath"
  | "cam_multi_process"
  | "cam_mill_turn"
  | "cam_5axis_convert"
  | "cam_advanced_strategy"
  | "cam_smart_tool"
  | "cam_verify"
  | "cam_chatter_rpm"
  | "cam_cost_feature";

/**
 * Dispatch a CAM kernel action.
 */
export function dispatchCAMAction(
  action: CAMAction, params: any,
): any {
  switch (action) {
    case "cam_unified_generate":
      return _unified.generate(params);

    case "cam_complex_generate":
      return _scalable.process(params);

    case "cam_production_toolpath":
      return _production.generateProduction(
        params.boundary, params.config,
        params.program_number, params.controller,
      );

    case "cam_multi_process":
      return _multiProcess.processAll(
        params.features, params.material, params.machine,
      );

    case "cam_mill_turn":
      return _millTurn.generate(params.operations, params.config);

    case "cam_5axis_convert":
      return _fiveAxis.convert3to5axis(
        params.segments, params.config,
      );

    case "cam_advanced_strategy": {
      const strat = params.strategy;
      if (strat === "flowline") {
        return _advanced.flowlineFinishing(
          params.start_curve, params.end_curve,
          params.config, params.num_passes,
        );
      }
      if (strat === "geodesic") {
        return _advanced.geodesicFinishing(
          params.surface_points, params.config, params.direction,
        );
      }
      if (strat === "constant_scallop") {
        return _advanced.constantScallopFinishing(
          params.surface_points, params.config,
          params.target_scallop_mm,
        );
      }
      if (strat === "swarf") {
        return _advanced.swarfCutting(
          params.top_curve, params.bottom_curve,
          params.config, params.num_passes,
        );
      }
      if (strat === "thread_mill") {
        return _advanced.threadMilling(params.center, params.config);
      }
      if (strat === "chamfer") {
        return _advanced.chamferPath(params.edges, params.config);
      }
      return { error: `Unknown strategy: ${strat}` };
    }

    case "cam_smart_tool":
      return _smartTool.select(params);

    case "cam_verify":
      return _verify.verify(params);

    case "cam_chatter_rpm":
      return _production.selectChatterSafeRPM(params);

    case "cam_cost_feature":
      return _production.costPerFeature(
        params.segments, params.config,
      );

    default:
      return { error: `Unknown CAM action: ${action}` };
  }
}

/**
 * List all available CAM kernel actions.
 */
export function listCAMActions(): Array<{
  action: CAMAction;
  description: string;
  engine: string;
}> {
  return [
    {
      action: "cam_unified_generate",
      description: "Generate G-code from features + material + machine (simple parts)",
      engine: "UnifiedCAMPipelineEngine",
    },
    {
      action: "cam_complex_generate",
      description: "Generate multi-setup G-code for 200+ feature complex parts",
      engine: "ScalableCAMOrchestratorEngine",
    },
    {
      action: "cam_production_toolpath",
      description: "Production-grade pocket with polygon offset, chip thinning, arcs",
      engine: "ProductionToolpathEngine",
    },
    {
      action: "cam_multi_process",
      description: "Multi-process: turning + EDM + grinding + laser + waterjet",
      engine: "MultiProcessCAMBridgeEngine",
    },
    {
      action: "cam_mill_turn",
      description: "Mill-turn / Swiss program with live tools and sub-spindle",
      engine: "MillTurnCAMEngine",
    },
    {
      action: "cam_5axis_convert",
      description: "Convert 3-axis toolpath to 5-axis with lead/lean and RTCP",
      engine: "FiveAxisCAMIntegrationEngine",
    },
    {
      action: "cam_advanced_strategy",
      description: "Advanced strategies: flowline, geodesic, scallop, swarf, thread, chamfer",
      engine: "AdvancedMillingStrategiesEngine",
    },
    {
      action: "cam_smart_tool",
      description: "Physics-scored tool selection from 46,590-tool catalog",
      engine: "SmartToolSelectorEngine",
    },
    {
      action: "cam_verify",
      description: "Integrated verification: collision + physics + safety + Cpk",
      engine: "IntegratedVerificationEngine",
    },
    {
      action: "cam_chatter_rpm",
      description: "Monte Carlo chatter-safe RPM selection (P(chatter)<5%)",
      engine: "ProductionToolpathEngine",
    },
    {
      action: "cam_cost_feature",
      description: "Cost-per-feature breakdown (tool + machine + energy)",
      engine: "ProductionToolpathEngine",
    },
  ];
}

export const camKernelDispatcherBridge = {
  dispatch: dispatchCAMAction,
  listActions: listCAMActions,
};
