/**
 * CAMKernelDispatcherBridge — CK-MS7 + CK-MS9
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
 *
 * CK-MS9 additions:
 *   - PostProcessorPipelineEngine optional wiring (post_process: true)
 *   - AutoSpeedFeedEngine optional wiring (optimize_sf: true)
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

// ── CK-MS9: Lazy-loaded optional enhancement engines ────────────────────────

let _ppPipeline: any = null;
let _autoSF: any = null;

/** Lazy-load PostProcessorPipelineEngine (CK-MS9) */
async function getPPPipeline(): Promise<any> {
  if (_ppPipeline === null) {
    try {
      const mod = await import("./PostProcessorPipelineEngine.js");
      _ppPipeline = mod.postProcessorPipelineEngine ?? new (mod as any).PostProcessorPipelineEngine();
    } catch {
      _ppPipeline = undefined; // unavailable
    }
  }
  return _ppPipeline ?? null;
}

/** Lazy-load AutoSpeedFeedEngine (CK-MS9) */
async function getAutoSF(): Promise<any> {
  if (_autoSF === null) {
    try {
      const mod = await import("./AutoSpeedFeedEngine.js");
      _autoSF = mod.autoSpeedFeedEngine ?? ((mod as any).AutoSpeedFeedEngineImpl ? new (mod as any).AutoSpeedFeedEngineImpl() : null);
    } catch {
      _autoSF = undefined; // unavailable
    }
  }
  return _autoSF ?? null;
}

// ── CK-MS9: Post-processing helper ──────────────────────────────────────────

/**
 * Run G-code through PostProcessorPipelineEngine for controller-specific
 * formatting, HSM injection, and safety analysis.
 *
 * @param gcode - Raw G-code string from CAM kernel
 * @param controller - Target controller family (e.g. "fanuc", "siemens")
 * @param material - Material name (for physics context)
 * @param tool - Tool definition object (for S/F physics)
 * @returns Enhanced G-code result or original gcode if PP unavailable
 */
async function postProcessOutput(
  gcode: string,
  controller: string,
  material: string,
  tool: object,
): Promise<{ gcode: string; pp_applied: boolean; pp_summary?: string }> {
  const pp = await getPPPipeline();
  if (!pp) {
    return { gcode, pp_applied: false, pp_summary: "PostProcessorPipelineEngine unavailable" };
  }
  try {
    const pipelineInput = {
      gcode,
      controller: controller.toLowerCase() as any,
      material: { name: material },
      tools: [tool],
      aggressiveness: 0.5,
      stages: {
        // Core optimizations
        speed_feed: true,
        stability_lobes: true,
        engagement_analysis: true,
        chip_thinning: true,
        adaptive_feed: true,
        corner_detection: true,
        // Motion
        motion_dynamics: true,
        controller_features: true,
        // Safety
        safety_analysis: true,
        playbook_rules: true,
        // Output
        gcode_generation: true,
        cycle_time: true,
      },
    };
    const ppResult = await pp.run?.(pipelineInput) ?? pp.process?.(pipelineInput);
    if (ppResult?.gcode) {
      return {
        gcode: ppResult.gcode,
        pp_applied: true,
        pp_summary: `PP pipeline: ${ppResult.stages_run ?? "?"} stages, ${ppResult.warnings?.length ?? 0} warnings`,
      };
    }
    return { gcode, pp_applied: false, pp_summary: "PP pipeline returned no gcode" };
  } catch (err: any) {
    return { gcode, pp_applied: false, pp_summary: `PP pipeline error: ${err?.message ?? err}` };
  }
}

// ── CK-MS9: AutoSF optimization helper ──────────────────────────────────────

/**
 * Run G-code through AutoSpeedFeedEngine for line-by-line physics S/F.
 *
 * @param gcode - Raw G-code string
 * @param material - Material name
 * @param tools - Array of tool definitions
 * @returns Optimized G-code result or original if AutoSF unavailable
 */
async function autoSFOptimize(
  gcode: string,
  material: string,
  tools: any[],
): Promise<{ gcode: string; sf_applied: boolean; sf_summary?: string }> {
  const autoSF = await getAutoSF();
  if (!autoSF) {
    return { gcode, sf_applied: false, sf_summary: "AutoSpeedFeedEngine unavailable" };
  }
  try {
    const input = {
      gcode,
      material,
      tools: tools.length > 0 ? tools : [{ tool_number: 1, diameter_mm: 12, flutes: 4 }],
      aggressiveness: 0.5,
      preserve_rapids: true,
      annotate: false,
      force_explicit_sf: false,
    };
    const sfResult = await autoSF.optimize(input);
    if (sfResult?.gcode) {
      return {
        gcode: sfResult.gcode,
        sf_applied: true,
        sf_summary: `AutoSF: ${sfResult.stats?.lines_modified ?? "?"} lines modified, ${sfResult.stats?.estimated_time_savings_pct?.toFixed(1) ?? "?"}% time savings`,
      };
    }
    return { gcode, sf_applied: false, sf_summary: "AutoSF returned no gcode" };
  } catch (err: any) {
    return { gcode, sf_applied: false, sf_summary: `AutoSF error: ${err?.message ?? err}` };
  }
}

// ── CK-MS9: Combined enhancement pipeline ───────────────────────────────────

/**
 * Optionally apply PP pipeline and/or AutoSF optimization to G-code.
 * Called after cam_unified_generate and cam_complex_generate.
 */
async function enhanceGCode(
  gcode: string,
  params: any,
  context: { controller: string; material: string; tools: any[] },
): Promise<{ gcode: string; enhancements: string[] }> {
  const enhancements: string[] = [];
  let currentGCode = gcode;

  // Step 1: AutoSF optimization (run first so PP can then format it)
  if (params.optimize_sf === true) {
    const sfResult = await autoSFOptimize(currentGCode, context.material, context.tools);
    currentGCode = sfResult.gcode;
    if (sfResult.sf_applied) {
      enhancements.push(sfResult.sf_summary ?? "AutoSF applied");
    } else {
      enhancements.push(`AutoSF skipped: ${sfResult.sf_summary}`);
    }
  }

  // Step 2: PP pipeline (run after AutoSF so controller formatting is last)
  if (params.post_process === true) {
    const tool = context.tools[0] ?? { tool_number: 1, diameter_mm: 12 };
    const ppResult = await postProcessOutput(currentGCode, context.controller, context.material, tool);
    currentGCode = ppResult.gcode;
    if (ppResult.pp_applied) {
      enhancements.push(ppResult.pp_summary ?? "PP pipeline applied");
    } else {
      enhancements.push(`PP skipped: ${ppResult.pp_summary}`);
    }
  }

  return { gcode: currentGCode, enhancements };
}

// ── Type definitions ─────────────────────────────────────────────────────────

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
export async function dispatchCAMAction(
  action: CAMAction, params: any,
): Promise<any> {
  switch (action) {
    case "cam_unified_generate": {
      // CK-MS9: support production_mode flag
      const req = {
        ...params,
        machine_name: params.machine_name ?? params.machine ?? "generic",
        production_mode: params.production_mode ?? false,
      };
      const baseResult = _unified.generate(req);

      // CK-MS9: optional post-processing enhancements
      if ((params.post_process || params.optimize_sf) && baseResult?.gcode) {
        const toolList = baseResult.tool_list ?? [];
        const tools = toolList.map((t: any) => ({
          tool_number: t.tool_number ?? t.number ?? 1,
          diameter_mm: t.diameter_mm ?? t.diameter ?? 12,
          flutes: t.flutes ?? t.flute_count ?? 4,
        }));
        const controller = baseResult.setup_sheet?.controller ?? params.controller ?? "fanuc";
        const { gcode, enhancements } = await enhanceGCode(
          baseResult.gcode,
          params,
          { controller, material: params.material ?? "steel", tools },
        );
        return { ...baseResult, gcode, ck_ms9_enhancements: enhancements };
      }
      return baseResult;
    }

    case "cam_complex_generate": {
      const baseResult = _scalable.process(params);

      // CK-MS9: optional post-processing enhancements
      if ((params.post_process || params.optimize_sf) && baseResult?.combined_gcode) {
        const tools = (params.features ?? []).slice(0, 1).map((_: any, i: number) => ({
          tool_number: i + 1,
          diameter_mm: 12,
          flutes: 4,
        }));
        const controller = params.controller ?? "fanuc";
        const { gcode, enhancements } = await enhanceGCode(
          baseResult.combined_gcode,
          params,
          { controller, material: params.material ?? "steel", tools },
        );
        return { ...baseResult, combined_gcode: gcode, ck_ms9_enhancements: enhancements };
      }
      return baseResult;
    }

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
      description: "Generate G-code from features + material + machine (simple parts). Flags: post_process, optimize_sf, production_mode.",
      engine: "UnifiedCAMPipelineEngine",
    },
    {
      action: "cam_complex_generate",
      description: "Generate multi-setup G-code for 200+ feature complex parts. Flags: post_process, optimize_sf.",
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

// CK-MS9: Export helpers for testing
export { postProcessOutput, autoSFOptimize, enhanceGCode };
