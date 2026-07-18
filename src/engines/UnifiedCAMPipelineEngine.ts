/**
 * UnifiedCAMPipelineEngine — CK-MS0/U01
 * Master orchestrator: single entry point for feature-to-G-code.
 *
 * Pipeline: Features → SmartToolSelection (+ DecisionAudit) →
 *           SafetyAssessment → OptimalStrategy → PlaybookWarnings →
 *           AdaptiveToolpathRouting (+ strategy hint) →
 *           PostProcessing → IntegratedVerification → ProductionPackage
 *
 * Input:  { features[], material, machine_name, controller?, options? }
 * Output: { gcode, setup_sheet, tool_list, physics_report, tribal_tips, ... }
 */

// ── Direct imports for sub-engines we built ───────────────────
import { SmartToolSelectorEngine } from "./SmartToolSelectorEngine.js";
import { AdaptiveToolpathRouterEngine } from "./AdaptiveToolpathRouterEngine.js";
import { IntegratedVerificationEngine } from "./IntegratedVerificationEngine.js";
import { ProductionPackageEngine } from "./ProductionPackageEngine.js";
import {
  ProductionToolpathEngine,
  type PocketBoundary,
} from "./ProductionToolpathEngine.js";
import { IntelligentSequencingEngine } from "./IntelligentSequencingEngine.js";
import { machineProfileEngine } from "./MachineProfileEngine.js";
import { optimalStrategySelectionEngine } from "./OptimalStrategySelectionEngine.js";
import { pipelineSafetyOrchestratorEngine } from "./PipelineSafetyOrchestratorEngine.js";
import { machiningPlaybookEngine } from "./MachiningPlaybookEngine.js";
import { pipelineDecisionOrchestratorEngine } from "./PipelineDecisionOrchestratorEngine.js";

const _smartTool = new SmartToolSelectorEngine();
const _router = new AdaptiveToolpathRouterEngine();
const _prodToolpath = new ProductionToolpathEngine();
const _sequencer = new IntelligentSequencingEngine();
const _verifier = new IntegratedVerificationEngine();
const _packager = new ProductionPackageEngine();

function getSmartTool() { return _smartTool; }
function getRouter() { return _router; }
function getVerifier() { return _verifier; }
function getPackager() { return _packager; }

function getMachineProfile(): any {
  return machineProfileEngine as any;
}

function getOptimalStrategy(): any {
  return optimalStrategySelectionEngine as any;
}

function getPipelineSafety(): any {
  return pipelineSafetyOrchestratorEngine as any;
}

function getPlaybook(): any {
  return machiningPlaybookEngine as any;
}

function getDecisionOrchestrator(): any {
  return pipelineDecisionOrchestratorEngine as any;
}

// ── Controller map ────────────────────────────────────────────
const CONTROLLER_MAP: Record<string, string> = {
  fanuc: "FANUC", haas: "HAAS", siemens: "SIEMENS",
  heidenhain: "HEIDENHAIN", mazak: "MAZAK", okuma: "OKUMA",
  brother: "BROTHER", doosan: "DOOSAN", hurco: "HURCO",
  mitsubishi: "MITSUBISHI", fagor: "FAGOR",
};

function resolveController(
  machineCtrl?: string, userCtrl?: string,
): string {
  if (userCtrl) {
    const lower = userCtrl.toLowerCase();
    for (const [key, val] of Object.entries(CONTROLLER_MAP)) {
      if (lower.includes(key)) return val;
    }
    return userCtrl;
  }
  if (machineCtrl) {
    const lower = machineCtrl.toLowerCase();
    for (const [key, val] of Object.entries(CONTROLLER_MAP)) {
      if (lower.includes(key)) return val;
    }
    return machineCtrl;
  }
  return "FANUC";
}

// ── Interfaces ────────────────────────────────────────────────
export interface CAMFeature {
  type: string;
  operation: "roughing" | "finishing" | "drilling" | "rest" | "facing";
  dimensions?: {
    length_mm?: number;
    width_mm?: number;
    depth_mm?: number;
    diameter_mm?: number;
  };
  tolerance_mm?: number;
  surface_finish_Ra?: number;
  wall_thickness_mm?: number;
  corner_radius_mm?: number;
  boundary_points?: Array<{ x: number; y: number }>;
  profile_points?: Array<{ x: number; y: number }>;
  center_x_mm?: number;
  center_y_mm?: number;
  notes?: string;
}

export interface UnifiedCAMRequest {
  features: CAMFeature[];
  material: string;
  material_iso_group?: string;
  material_hardness_hrc?: number;
  machine_name: string;
  controller?: string;
  stock_dims?: { length_mm: number; width_mm: number; height_mm: number };
  options?: {
    aggressiveness?: number;
    coolant?: string;
    optimize_for?: "tool_life" | "speed" | "cost" | "surface_finish" | "balanced";
    program_number?: number;
    programmer_name?: string;
    machine_rate_per_hour?: number;
  };
}

export interface UnifiedCAMResult {
  success: boolean;
  gcode: string;
  setup_sheet: any;
  tool_list: any[];
  physics_report: any;
  tribal_tips: any[];
  cycle_time: {
    p50_min: number;
    p75_min: number;
    p95_min: number;
  };
  cost_estimate: any;
  warnings: string[];
  verification_verdict: string;
  playbook_warnings: string[];
  decision_audit: any[];
  safety_assessments: any[];
  strategy_hints: any[];
  pipeline_summary: {
    features_processed: number;
    tools_selected: number;
    algorithms_used: string[];
    total_segments: number;
    total_gcode_lines: number;
    pipeline_time_ms: number;
  };
}

// ── ISO Group Detection ───────────────────────────────────────
function detectISOGroup(material: string): string {
  const m = material.toLowerCase();
  if (/aluminum|al\s|6061|7075|2024|a356/i.test(m)) return "N";
  if (/inconel|waspaloy|hastelloy|nimonic|rene/i.test(m)) return "S";
  if (/titanium|ti-|ti6al|ti-6/i.test(m)) return "S";
  if (/stainless|304|316|17-4|duplex|austenitic/i.test(m)) return "M";
  if (/cast.?iron|grey|ductile|ggg|fc\d/i.test(m)) return "K";
  if (/hardened|hrc\s*[4-6]|52\s*hrc|60\s*hrc|d2|h13/i.test(m)) return "H";
  if (/copper|brass|bronze|cu/i.test(m)) return "N";
  if (/peek|nylon|plastic|delrin|acetal/i.test(m)) return "N";
  return "P"; // default steel
}

// ── Engine ─────────────────────────────────────────────────────
export class UnifiedCAMPipelineEngine {
  /**
   * Generate complete verified G-code from features + material + machine.
   * Single entry point for the entire CAM kernel.
   */
  generate(req: UnifiedCAMRequest): UnifiedCAMResult {
    const t0 = Date.now();
    const iso = req.material_iso_group || detectISOGroup(req.material);
    const warnings: string[] = [];
    const algorithmsUsed: string[] = [];
    let allSegments: any[] = [];
    const toolsSelected: any[] = [];
    const decisionAudit: any[] = [];
    const safetyAssessments: any[] = [];
    const strategyHints: any[] = [];
    const playbookWarnings: string[] = [];

    // ── 1. Resolve machine ────────────────────────────────────
    let machine: any = null;
    let controller = "FANUC";
    try {
      const mpe = getMachineProfile();
      if (mpe) {
        const all = mpe.list?.() || [];
        machine = all.find((m: any) =>
          m.name?.toLowerCase().includes(req.machine_name.toLowerCase()) ||
          m.id?.toLowerCase().includes(req.machine_name.toLowerCase())
        );
        if (machine?.id) machine = mpe.get?.(machine.id) || machine;
        if (machine?.controller) {
          controller = resolveController(machine.controller, req.controller);
        }
      }
    } catch { /* machine lookup optional */ }
    if (req.controller) controller = resolveController(undefined, req.controller);

    // ── 2. Process each feature ───────────────────────────────
    for (const [featureIndex, feature] of req.features.entries()) {
      // 2a. Smart tool selection (wrapped with DecisionOrchestrator for audit)
      let toolResult: any = null;
      try {
        const sts = getSmartTool();
        if (sts?.select) {
          toolResult = sts.select({
            operation_type: feature.type,
            material_iso_group: iso,
            material_name: req.material,
            material_hardness_hrc: req.material_hardness_hrc,
            machine_name: req.machine_name,
            feature_diameter_mm: feature.dimensions?.diameter_mm,
            feature_depth_mm: feature.dimensions?.depth_mm,
            feature_width_mm: feature.dimensions?.width_mm,
            tolerance_mm: feature.tolerance_mm,
            surface_finish_Ra: feature.surface_finish_Ra,
            wall_thickness_mm: feature.wall_thickness_mm,
            corner_radius_mm: feature.corner_radius_mm,
            max_rpm: machine?.spindle?.max_rpm,
            max_power_kw: machine?.spindle?.rated_power_kw,
            optimize_for: req.options?.optimize_for || "balanced",
          });
        }
      } catch { /* tool selection fallback below */ }

      // 2a-audit. PipelineDecisionOrchestratorEngine (E1080) — decision audit trail
      try {
        const dorch = getDecisionOrchestrator();
        if (dorch?.decide && toolResult?.best_tool && toolResult?.alternatives?.length) {
          const candidates = [toolResult.best_tool, ...(toolResult.alternatives || [])].map((t: any, i: number) => ({
            id: t.tool_id || `tool_${i}`,
            label: `${t.manufacturer || "Generic"} ${t.type || "end_mill"} D${t.diameter_mm || 10}`,
            data: t,
          }));
          const decision = dorch.decide({
            category: "tool_select" as any,
            context: {
              feature: {
                type: feature.type,
                diameter_mm: feature.dimensions?.diameter_mm,
                depth_mm: feature.dimensions?.depth_mm,
                width_mm: feature.dimensions?.width_mm,
                wall_thickness_mm: feature.wall_thickness_mm,
                tolerance_mm: feature.tolerance_mm,
                surface_finish_Ra: feature.surface_finish_Ra,
              },
              material: { name: req.material, iso_group: iso, hardness_hrc: req.material_hardness_hrc },
              machine: { name: req.machine_name, max_rpm: machine?.spindle?.max_rpm, max_power_kw: machine?.spindle?.rated_power_kw },
              operation: feature.operation,
            },
            candidates,
            objective: (req.options?.optimize_for || "balanced") as any,
            pipeline_stage: "unified_cam_tool_select",
            caller: "UnifiedCAMPipelineEngine",
          });
          if (decision) {
            decisionAudit.push({
              feature: feature.type,
              decision_id: decision.decision_id,
              choice: decision.choice?.label,
              score: decision.score,
              justification: decision.justification,
              alternatives: decision.alternatives,
              warnings: decision.warnings,
            });
            if (decision.warnings?.length) warnings.push(...decision.warnings);
          }
        }
      } catch { /* decision audit optional */ }

      const bestTool = toolResult?.best_tool || {
        diameter_mm: 10, flute_count: 3, flute_length_mm: 30,
        overall_length_mm: 60, coating: "TiAlN", type: "end_mill",
        recommended_params: { speed_mpm: 150, rpm: 5000, feed_mmpt: 0.1, feed_mmmin: 1500, ap_mm: 5, ae_mm: 3 },
        physics: { cutting_force_N: 400, cutting_power_kW: 2, torque_Nm: 5, deflection_mm: 0.01,
          max_deflection_mm: 0.02, deflection_ok: true, tool_life_estimate_min: 60, specific_energy_J_mm3: 2 },
        warnings: [],
      };
      const selectedTool = this._registerTool(toolsSelected, bestTool);
      if (selectedTool.warnings?.length) warnings.push(...selectedTool.warnings);

      // 2a-safety. PipelineSafetyOrchestratorEngine (E1093) — safety gate
      const params = selectedTool.recommended_params || {};
      try {
        const pso = getPipelineSafety();
        if (pso?.assess && params.feed_mmpt && params.speed_mpm) {
          const safetyResult = pso.assess(
            {
              name: `${feature.type}_${feature.operation || "roughing"}`,
              ap_mm: params.ap_mm || 5,
              fz_mm: params.feed_mmpt || 0.1,
              vc_mpm: params.speed_mpm || 150,
              tool_diameter_mm: selectedTool.diameter_mm || 10,
              num_teeth: selectedTool.flute_count || 3,
              ae_mm: params.ae_mm,
              tool_stickout_mm: selectedTool.overall_length_mm || (selectedTool.diameter_mm || 10) * 6,
              tolerance_mm: feature.tolerance_mm,
            },
            {
              name: req.material,
              kc1_1: selectedTool.physics?.specific_energy_J_mm3 ? selectedTool.physics.specific_energy_J_mm3 * 500 : 1500,
              mc: 0.25,
              T_melt_C: iso === "N" ? 660 : iso === "S" ? 1350 : 1500,
            },
            {
              name: req.machine_name,
              max_power_kW: machine?.spindle?.rated_power_kw || 15,
              max_rpm: machine?.spindle?.max_rpm || 12000,
            },
            { tensile_strength_MPa: 3500 },
            { grip_force_N: 10000, friction_coefficient: 0.3 },
          );
          safetyAssessments.push({
            feature: feature.type,
            risk_level: safetyResult.risk_level,
            vetoed: safetyResult.vetoed,
            justification: safetyResult.justification,
            escalation_actions: safetyResult.escalation_actions,
          });
          // If critical/veto, reduce parameters for safety
          if (safetyResult.vetoed || safetyResult.risk_level === "critical") {
            const reductionFactor = safetyResult.vetoed ? 0.6 : 0.8;
            if (params.ap_mm) params.ap_mm *= reductionFactor;
            if (params.feed_mmpt) params.feed_mmpt *= reductionFactor;
            if (params.feed_mmmin) params.feed_mmmin *= reductionFactor;
            warnings.push(`[SAFETY] ${feature.type}: ${safetyResult.risk_level} — parameters reduced by ${Math.round((1 - reductionFactor) * 100)}%`);
          }
        }
      } catch { /* safety assessment optional */ }

      // 2b-strategy. OptimalStrategySelectionEngine — ranked strategy hint
      let strategyHint: string | undefined;
      try {
        const ose = getOptimalStrategy();
        if (ose?.compute) {
          const stratResult = ose.compute({
            feature: {
              type: feature.type,
              depth: feature.dimensions?.depth_mm,
              width: feature.dimensions?.width_mm,
              length: feature.dimensions?.length_mm,
              corner_radius: feature.corner_radius_mm,
              wall_thickness: feature.wall_thickness_mm,
              tolerance: feature.tolerance_mm,
              surface_finish: feature.surface_finish_Ra,
            },
            material: { iso_group: iso as any, name: req.material, hardness_hrc: req.material_hardness_hrc },
            machine: {
              max_rpm: machine?.spindle?.max_rpm,
              max_power_kW: machine?.spindle?.rated_power_kw,
            },
            tool: { diameter_mm: selectedTool.diameter_mm, flute_count: selectedTool.flute_count },
            preference: { priority: (req.options?.optimize_for || "balanced") as any },
          });
          if (stratResult?.selected) {
            strategyHint = stratResult.selected.canonical_id;
            strategyHints.push({
              feature: feature.type,
              selected: stratResult.selected.display_name,
              score: stratResult.selected.score,
              alternatives_considered: stratResult.alternatives_considered,
              playbook_warnings: stratResult.playbook_warnings,
            });
            if (stratResult.playbook_warnings?.length) {
              playbookWarnings.push(...stratResult.playbook_warnings);
            }
          }
        }
      } catch { /* optimal strategy optional */ }

      // 2b-playbook. MachiningPlaybookEngine — experiential warnings
      try {
        const pb = getPlaybook();
        if (pb?.advise) {
          const pbResult = pb.advise({
            material_iso: iso,
            features: [feature.type],
            tolerance_mm: feature.tolerance_mm,
            wall_thickness_mm: feature.wall_thickness_mm,
            surface_finish_Ra: feature.surface_finish_Ra,
            operation_type: feature.operation,
            hardness_hrc: req.material_hardness_hrc,
          });
          if (pbResult?.critical_warnings?.length) {
            playbookWarnings.push(...pbResult.critical_warnings);
            warnings.push(...pbResult.critical_warnings.map((w: string) => `[PLAYBOOK] ${w}`));
          }
        }
      } catch { /* playbook optional */ }

      // 2c. Adaptive toolpath routing
      let routeResult: any = null;
      try {
        const atr = getRouter();
        if (atr?.route) {
          const routeInput: any = {
            feature_type: feature.type,
            operation: feature.operation || "roughing",
            material_iso_group: iso,
            material_hardness_hrc: req.material_hardness_hrc,
            feature_depth_mm: feature.dimensions?.depth_mm,
            feature_diameter_mm: feature.dimensions?.diameter_mm,
            feature_width_mm: feature.dimensions?.width_mm,
            wall_thickness_mm: feature.wall_thickness_mm,
            tolerance_mm: feature.tolerance_mm,
            surface_finish_Ra: feature.surface_finish_Ra,
            tool_diameter_mm: selectedTool.diameter_mm,
            tool_length_mm: selectedTool.overall_length_mm || selectedTool.diameter_mm * 6,
            tool_flute_count: selectedTool.flute_count,
            pocket_dims: feature.dimensions?.length_mm ? {
              length_mm: feature.dimensions.length_mm,
              width_mm: feature.dimensions.width_mm || feature.dimensions.length_mm,
              depth_mm: feature.dimensions.depth_mm || 10,
            } : undefined,
            rpm: params.rpm,
            feed_mmpt: params.feed_mmpt,
          };
          // Pass OptimalStrategy hint to router if available
          if (strategyHint) routeInput.strategy_hint = strategyHint;
          routeResult = atr.route(routeInput);
        }
      } catch { /* router fallback below */ }

      // CK-MS9: production_mode — use ProductionToolpathEngine for pocket/profile
      // features when real HSM-quality toolpaths are needed.
      if ((req as any).production_mode === true) {
        const isPocket = /pocket|profile|contour|slot/i.test(feature.type);
        const isRoughing = !feature.operation || feature.operation === "roughing";
        if (isPocket && isRoughing && feature.dimensions) {
          try {
            const toolD = selectedTool.diameter_mm || 10;
            const boundary = this._buildProductionBoundary(feature);
            if (!boundary) {
              warnings.push(
                `[PRODUCTION] ${feature.type}: no truthful boundary supplied; using routed toolpath instead of flattening geometry`
              );
            } else {
              const prodResult = _prodToolpath.generateProduction(
                boundary,
                {
                  material_iso_group: iso as any,
                  tool_diameter_mm: toolD,
                  tool_flute_count: selectedTool.flute_count || 3,
                  feed_per_tooth_mm: params.feed_mmpt || 0.1,
                  cutting_speed_mpm: params.speed_mpm || 150,
                  rpm: params.rpm || 5000,
                  stepover_mm: params.ae_mm || toolD * 0.3,
                  doc_mm: params.ap_mm || toolD * 0.5,
                  enable_chip_thinning: true,
                  enable_corner_decel: true,
                  enable_arc_corners: true,
                },
              );
              if (prodResult?.segments?.length) {
                if (this._productionResultLooksPlausible(prodResult.segments, boundary, toolD)) {
                  allSegments.push(
                    ...this._tagSegments(
                      prodResult.segments,
                      selectedTool,
                      feature,
                      featureIndex,
                      params,
                    ),
                  );
                  algorithmsUsed.push("ProductionToolpath:PolygonOffset");
                  continue;
                }

                warnings.push(
                  `[PRODUCTION] ${feature.type}: production kernel emitted implausible XY envelope; falling back to routed toolpath`
                );
              }
            }
          } catch { /* fall through to router result */ }
        }
      }

      if (routeResult) {
        algorithmsUsed.push(routeResult.selected_algorithm);
        allSegments.push(
          ...this._tagSegments(
            routeResult.toolpath_segments,
            selectedTool,
            feature,
            featureIndex,
            params,
          ),
        );
        if (routeResult.warnings?.length) warnings.push(...routeResult.warnings);
      }
    }

    if (allSegments.length === 0) {
      warnings.push("[PIPELINE] No CAM segments were generated");
    }

    // ── 3. Generate G-code from segments ──────────────────────
    const gcode = this._segmentsToGcode(
      allSegments, controller,
      req.options?.program_number || 1000,
      toolsSelected,
    );

    // ── 4. Integrated verification ────────────────────────────
    let verification: any = allSegments.length > 0
      ? { verdict: "PASS", warnings: [], issues_count: 0, physics: {} }
      : { verdict: "FAIL_FIXABLE", warnings: ["[ERROR] No CAM segments were generated"], issues_count: 1, physics: {} };
    try {
      const ive = getVerifier();
      if (ive?.verify && allSegments.length > 0) {
        const groups = new Map<number, any[]>();
        for (const segment of allSegments) {
          const toolNumber = Number(segment.tool_number || 1);
          const grouped = groups.get(toolNumber);
          if (grouped) grouped.push(segment);
          else groups.set(toolNumber, [segment]);
        }

        const groupResults = Array.from(groups.entries()).map(([toolNumber, groupSegments]) => {
          const tool = toolsSelected.find((candidate: any) => candidate.tool_number === toolNumber) || toolsSelected[0] || {};
          const toleranceTargets = groupSegments
            .map((segment: any) => segment.tolerance_mm)
            .filter((value: any) => typeof value === "number" && value > 0);
          const surfaceTargets = groupSegments
            .map((segment: any) => segment.surface_finish_Ra)
            .filter((value: any) => typeof value === "number" && value > 0);

          const groupResult = ive.verify({
            toolpath_segments: groupSegments,
            tool: {
              diameter_mm: tool.diameter_mm || 10,
              flute_length_mm: tool.flute_length_mm || 30,
              overall_length_mm: tool.overall_length_mm || 60,
              flute_count: tool.flute_count || 3,
              corner_radius_mm: tool.corner_radius_mm,
            },
            material_iso_group: iso,
            machine: machine ? {
              max_rpm: machine.spindle?.max_rpm,
              max_power_kw: machine.spindle?.rated_power_kw,
              max_torque_nm: machine.spindle?.max_torque_nm,
              x_travel_mm: machine.axes?.x_mm,
              y_travel_mm: machine.axes?.y_mm,
              z_travel_mm: machine.axes?.z_mm,
            } : undefined,
            stock_dims: req.stock_dims,
            tolerance_mm: toleranceTargets.length > 0 ? Math.min(...toleranceTargets) : undefined,
            surface_finish_Ra_target: surfaceTargets.length > 0 ? Math.min(...surfaceTargets) : undefined,
            gcode: groups.size === 1 ? gcode : undefined,
          });

          return {
            ...groupResult,
            issues: (groupResult.issues || []).map((issue: any) => ({
              ...issue,
              message: groups.size > 1
                ? `[T${String(toolNumber).padStart(2, "0")}] ${issue.message}`
                : issue.message,
            })),
          };
        });

        verification = this._aggregateVerificationResults(groupResults);
        if (verification.issues?.length) {
          for (const issue of verification.issues) {
            if (issue.severity === "FATAL" || issue.severity === "ERROR") {
              warnings.push(`[${issue.severity}] ${issue.message}`);
            }
          }
        }
      }
    } catch { /* verification optional */ }

    // ── 5. Assemble production package ─────────────────────────
    let productionPkg: any = null;
    try {
      const ppe = getPackager();
      if (ppe?.assemble && toolsSelected.length === 1) {
        const bt = toolsSelected[0] || {};
        const params = bt.recommended_params || { speed_mpm: 150, rpm: 5000, feed_mmpt: 0.1, feed_mmmin: 1500, ap_mm: 5, ae_mm: 3 };
        const phys = verification.physics || bt.physics || {
          max_force_N: 400, max_power_kW: 2, max_torque_Nm: 5,
          max_deflection_mm: 0.01, predicted_Ra_um: 1.0,
          max_temperature_C: 300, estimated_tool_life_min: 60, cpk_estimate: 1.33,
        };

        productionPkg = ppe.assemble({
          gcode,
          toolpath_segments: allSegments,
          tool: {
            tool_id: bt.tool_id || "T01",
            manufacturer: bt.manufacturer || "Generic",
            designation: bt.designation || "",
            diameter_mm: bt.diameter_mm || 10,
            flute_length_mm: bt.flute_length_mm || 30,
            overall_length_mm: bt.overall_length_mm || 60,
            flute_count: bt.flute_count || 3,
            coating: bt.coating || "TiAlN",
            type: bt.type || "end_mill",
            holder: "ER32",
            price_usd: bt.price_usd || 45,
          },
          physics: phys,
          recommended_params: params,
          verification,
          material_name: req.material,
          material_iso_group: iso,
          machine_name: req.machine_name,
          controller,
          operation_type: req.features[0]?.type || "pocket",
          program_number: req.options?.program_number,
          programmer_name: req.options?.programmer_name,
          machine_rate_per_hour: req.options?.machine_rate_per_hour,
        });
      } else if (toolsSelected.length > 1) {
        warnings.push("[PACKAGE] Multi-tool job detected — using inline setup/tool data instead of single-tool production package");
      }
    } catch { /* package assembly optional */ }

    const pipelineTime = Date.now() - t0;

    return {
      success: allSegments.length > 0 && verification.verdict !== "FAIL_FATAL",
      gcode,
      setup_sheet: productionPkg?.setup_sheet || {},
      tool_list: toolsSelected.map((t: any) => ({
        tool_number: t.tool_number,
        tool_id: t.tool_id || `tool_${t.tool_number}`,
        manufacturer: t.manufacturer || "Generic",
        designation: t.designation || "",
        diameter_mm: t.diameter_mm || 10,
        type: t.type || "end_mill",
      })),
      physics_report: productionPkg?.physics_report || verification.physics || {},
      tribal_tips: productionPkg?.tribal_tips || [],
      cycle_time: productionPkg?.cycle_time || { p50_min: 0, p75_min: 0, p95_min: 0 },
      cost_estimate: productionPkg?.cost_estimate || {},
      warnings: [...new Set(warnings)],
      verification_verdict: verification.verdict,
      playbook_warnings: [...new Set(playbookWarnings)],
      decision_audit: decisionAudit,
      safety_assessments: safetyAssessments,
      strategy_hints: strategyHints,
      pipeline_summary: {
        features_processed: req.features.length,
        tools_selected: toolsSelected.length,
        algorithms_used: [...new Set(algorithmsUsed)],
        total_segments: allSegments.length,
        total_gcode_lines: gcode.split("\n").length,
        pipeline_time_ms: pipelineTime,
      },
    };
  }

  private _toolKey(tool: any): string {
    return [
      tool?.tool_id || tool?.id || tool?.designation || tool?.type || "tool",
      tool?.diameter_mm || tool?.cutting_diameter_mm || 0,
      tool?.flute_count || 0,
      tool?.overall_length_mm || 0,
    ].join("|");
  }

  private _registerTool(tools: any[], tool: any): any {
    const key = this._toolKey(tool);
    const existing = tools.find((candidate: any) => candidate._tool_key === key);
    if (existing) return existing;

    const registered = {
      ...tool,
      tool_number: tools.length + 1,
      _tool_key: key,
    };
    tools.push(registered);
    return registered;
  }

  private _tagSegments(
    segments: any[],
    tool: any,
    feature: CAMFeature,
    featureIndex: number,
    params: any,
  ): any[] {
    return (segments || []).map((segment: any) => ({
      ...segment,
      feed_mmmin: segment.feed_mmmin ?? segment.feed ?? params?.feed_mmmin ?? tool?.recommended_params?.feed_mmmin ?? 1500,
      rpm: segment.rpm ?? params?.rpm ?? tool?.recommended_params?.rpm ?? 5000,
      ae_mm: segment.ae_mm ?? params?.ae_mm,
      ap_mm: segment.ap_mm ?? params?.ap_mm,
      tool_number: tool?.tool_number || 1,
      tool_id: tool?.tool_id || `tool_${tool?.tool_number || 1}`,
      feature_index: featureIndex,
      feature_type: feature.type,
      tolerance_mm: feature.tolerance_mm,
      surface_finish_Ra: feature.surface_finish_Ra,
    }));
  }

  private _extractBoundaryPoints(points: any): Array<{ x: number; y: number }> | null {
    if (!Array.isArray(points) || points.length < 3) return null;

    const normalized = points
      .map((point: any) => {
        const x = point?.x ?? point?.X;
        const y = point?.y ?? point?.Y;
        return typeof x === "number" && typeof y === "number" ? { x, y } : null;
      })
      .filter((point): point is { x: number; y: number } => point !== null);

    return normalized.length >= 3 ? normalized : null;
  }

  private _polygonArea(points: Array<{ x: number; y: number }>): number {
    let area = 0;
    for (let index = 0; index < points.length; index++) {
      const current = points[index];
      const next = points[(index + 1) % points.length];
      area += current.x * next.y - next.x * current.y;
    }
    return area / 2;
  }

  private _ensureClockwiseBoundary(points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
    if (points.length < 3) return points;
    return this._polygonArea(points) > 0 ? [...points].reverse() : points;
  }

  private _pointsBounds(points: Array<{ x: number; y: number }>): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }

  private _productionResultLooksPlausible(
    segments: any[],
    boundary: PocketBoundary,
    toolDiameter: number,
  ): boolean {
    if (!Array.isArray(segments) || segments.length === 0) return false;

    const xySegments = segments.filter((segment: any) =>
      Number.isFinite(segment?.x) && Number.isFinite(segment?.y)
    );
    if (xySegments.length === 0) return false;

    const boundaryBounds = this._pointsBounds(boundary.points);
    const segmentBounds = this._pointsBounds(
      xySegments.map((segment: any) => ({ x: segment.x, y: segment.y })),
    );

    const spanX = Math.max(1, boundaryBounds.maxX - boundaryBounds.minX);
    const spanY = Math.max(1, boundaryBounds.maxY - boundaryBounds.minY);
    const margin = Math.max(toolDiameter * 4, Math.max(spanX, spanY) * 0.5);

    return segmentBounds.minX >= boundaryBounds.minX - margin
      && segmentBounds.maxX <= boundaryBounds.maxX + margin
      && segmentBounds.minY >= boundaryBounds.minY - margin
      && segmentBounds.maxY <= boundaryBounds.maxY + margin;
  }

  private _approximateCircle(
    radius: number,
    centerX: number,
    centerY: number,
    segments = 24,
  ): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [];
    for (let index = 0; index < segments; index++) {
      const theta = (index / segments) * Math.PI * 2;
      points.push({
        x: centerX + radius * Math.cos(theta),
        y: centerY + radius * Math.sin(theta),
      });
    }
    return points;
  }

  private _buildSlotBoundary(
    length: number,
    width: number,
    centerX?: number,
    centerY?: number,
    arcSegments = 12,
  ): Array<{ x: number; y: number }> {
    const radius = width / 2;
    const straight = Math.max(0, length - width);
    const leftCenterX = (centerX ?? (length / 2)) - straight / 2;
    const rightCenterX = (centerX ?? (length / 2)) + straight / 2;
    const midY = centerY ?? radius;
    const points: Array<{ x: number; y: number }> = [];

    for (let index = 0; index <= arcSegments; index++) {
      const theta = Math.PI / 2 + (index / arcSegments) * Math.PI;
      points.push({
        x: leftCenterX + radius * Math.cos(theta),
        y: midY + radius * Math.sin(theta),
      });
    }

    for (let index = 0; index <= arcSegments; index++) {
      const theta = -Math.PI / 2 + (index / arcSegments) * Math.PI;
      points.push({
        x: rightCenterX + radius * Math.cos(theta),
        y: midY + radius * Math.sin(theta),
      });
    }

    return points;
  }

  private _buildProductionBoundary(feature: CAMFeature): PocketBoundary | null {
    const rawFeature = feature as CAMFeature & Record<string, any>;
    const depth = rawFeature.dimensions?.depth_mm ?? rawFeature.depth_mm;
    if (!(typeof depth === "number" && depth > 0)) return null;

    const explicitBoundary = this._extractBoundaryPoints(
      rawFeature.boundary_points
      ?? rawFeature.profile_points
      ?? rawFeature.points
      ?? rawFeature.boundary?.points,
    );
    if (explicitBoundary) {
      return {
        points: this._ensureClockwiseBoundary(explicitBoundary),
        depth_mm: depth,
        corner_radius_mm: rawFeature.corner_radius_mm,
      };
    }

    const length = rawFeature.dimensions?.length_mm;
    const width = rawFeature.dimensions?.width_mm ?? rawFeature.dimensions?.diameter_mm;

    if (/circular/i.test(feature.type) && typeof rawFeature.dimensions?.diameter_mm === "number") {
      const diameter = rawFeature.dimensions.diameter_mm;
      return {
        points: this._ensureClockwiseBoundary(this._approximateCircle(
          diameter / 2,
          rawFeature.center_x_mm ?? diameter / 2,
          rawFeature.center_y_mm ?? diameter / 2,
        )),
        depth_mm: depth,
        corner_radius_mm: diameter / 2,
      };
    }

    if (/slot/i.test(feature.type)) {
      const slotLength = rawFeature.slot_length_mm ?? length;
      const slotWidth = rawFeature.slot_width_mm ?? width;
      if (typeof slotLength === "number" && slotLength > 0
        && typeof slotWidth === "number" && slotWidth > 0) {
        return {
          points: this._ensureClockwiseBoundary(this._buildSlotBoundary(
            slotLength,
            slotWidth,
            rawFeature.center_x_mm,
            rawFeature.center_y_mm,
          )),
          depth_mm: depth,
          corner_radius_mm: slotWidth / 2,
        };
      }
    }

    if (/pocket_rectangular|rectangular|face|step|floor/i.test(feature.type)
      && typeof length === "number" && length > 0
      && typeof width === "number" && width > 0) {
      return {
        points: this._ensureClockwiseBoundary([
          { x: 0, y: 0 },
          { x: length, y: 0 },
          { x: length, y: width },
          { x: 0, y: width },
        ]),
        depth_mm: depth,
        corner_radius_mm: rawFeature.corner_radius_mm,
      };
    }

    if (/profile|contour|slot/i.test(feature.type)) return null;

    if (typeof length === "number" && length > 0
      && typeof width === "number" && width > 0) {
      return {
        points: this._ensureClockwiseBoundary([
          { x: 0, y: 0 },
          { x: length, y: 0 },
          { x: length, y: width },
          { x: 0, y: width },
        ]),
        depth_mm: depth,
        corner_radius_mm: rawFeature.corner_radius_mm,
      };
    }

    return null;
  }

  private _aggregateVerificationResults(results: any[]): any {
    const severityOrder: Record<string, number> = {
      PASS: 0,
      WARN: 1,
      FAIL_FIXABLE: 2,
      FAIL_FATAL: 3,
    };

    let verdict = "PASS";
    const issues = results.flatMap((result: any) => result?.issues || []);
    const warnings = issues
      .filter((issue: any) => issue.severity !== "INFO")
      .map((issue: any) => `[${issue.severity}] ${issue.message}`);

    for (const result of results) {
      if ((severityOrder[result?.verdict] ?? 0) > (severityOrder[verdict] ?? 0)) {
        verdict = result.verdict;
      }
    }

    return {
      verdict,
      warnings,
      issues_count: issues.length,
      issues,
      physics: {
        max_force_N: Math.max(0, ...results.map((result: any) => result?.physics?.max_force_N ?? 0)),
        max_power_kW: Math.max(0, ...results.map((result: any) => result?.physics?.max_power_kW ?? 0)),
        max_torque_Nm: Math.max(0, ...results.map((result: any) => result?.physics?.max_torque_Nm ?? 0)),
        max_deflection_mm: Math.max(0, ...results.map((result: any) => result?.physics?.max_deflection_mm ?? 0)),
        predicted_Ra_um: Math.max(0, ...results.map((result: any) => result?.physics?.predicted_Ra_um ?? 0)),
        max_temperature_C: Math.max(0, ...results.map((result: any) => result?.physics?.max_temperature_C ?? 0)),
        estimated_tool_life_min: Math.min(...results.map((result: any) => result?.physics?.estimated_tool_life_min ?? Number.POSITIVE_INFINITY)),
        cpk_estimate: Math.min(...results.map((result: any) => result?.physics?.cpk_estimate ?? Number.POSITIVE_INFINITY)),
      },
    };
  }

  /**
   * Convert toolpath segments to G-code string.
   */
  private _segmentsToGcode(
    segments: any[], controller: string,
    progNum: number, tools: any[],
  ): string {
    const lines: string[] = [];
    const fmt = (n: number) => n.toFixed(3);
    const toolMap = new Map<number, any>();
    for (const tool of tools || []) {
      toolMap.set(Number(tool.tool_number || (toolMap.size + 1)), tool);
    }

    const getTool = (toolNumber?: number) => (
      toolMap.get(Number(toolNumber || 1))
      || tools?.[0]
      || { tool_number: 1, recommended_params: { rpm: 8000 } }
    );

    // Program header
    if (controller === "HEIDENHAIN") {
      lines.push(`BEGIN PGM ${progNum} MM`);
    } else {
      lines.push(`O${progNum}`);
    }
    lines.push(`(PRISM CAM KERNEL — ${new Date().toISOString().split("T")[0]})`);
    lines.push(`(MATERIAL: ${controller})`);
    lines.push("");

    // Safety block
    lines.push("G90 G40 G80");
    lines.push("G17"); // XY plane
    const emitToolSetup = (toolNumber: number, segment?: any) => {
      const tool = getTool(toolNumber);
      const rpm = Math.round(segment?.rpm || tool?.recommended_params?.rpm || 8000);
      lines.push(`T${String(toolNumber).padStart(2, "0")} M06`);
      lines.push(`S${rpm} M03`);
      lines.push("M08"); // coolant on
      lines.push("G54"); // work offset
      lines.push("");
      return rpm;
    };

    let currentToolNumber = Number(segments[0]?.tool_number || tools?.[0]?.tool_number || 1);
    let currentRpm = emitToolSetup(currentToolNumber, segments[0]);

    // Toolpath moves
    let lastType = "";
    for (const seg of segments) {
      const segmentToolNumber = Number(seg.tool_number || currentToolNumber || 1);
      if (segmentToolNumber !== currentToolNumber) {
        lines.push("");
        lines.push("G00 Z50.000");
        lines.push("M09");
        lines.push("M05");
        currentToolNumber = segmentToolNumber;
        currentRpm = emitToolSetup(currentToolNumber, seg);
        lastType = "";
      }

      const segmentRpm = Math.round(seg.rpm || currentRpm || 8000);
      if (segmentRpm !== currentRpm) {
        lines.push(`S${segmentRpm} M03`);
        currentRpm = segmentRpm;
      }

      if (seg.type === "rapid" || seg.type === "retract") {
        lines.push(`G00 X${fmt(seg.x)} Y${fmt(seg.y)} Z${fmt(seg.z)}`);
        lastType = "G00";
      } else if (seg.type === "plunge") {
        lines.push(`G01 Z${fmt(seg.z)} F${Math.round(seg.feed_mmmin)}`);
        lastType = "G01";
      } else if (seg.type === "feed") {
        const gCode = lastType === "G01" ? "" : "G01 ";
        lines.push(
          `${gCode}X${fmt(seg.x)} Y${fmt(seg.y)} Z${fmt(seg.z)} F${Math.round(seg.feed_mmmin)}`
        );
        lastType = "G01";
      } else if (seg.type === "arc_cw" && seg.i !== undefined) {
        lines.push(
          `G02 X${fmt(seg.x)} Y${fmt(seg.y)} I${fmt(seg.i)} J${fmt(seg.j || 0)} F${Math.round(seg.feed_mmmin)}`
        );
        lastType = "G02";
      } else if (seg.type === "arc_ccw" && seg.i !== undefined) {
        lines.push(
          `G03 X${fmt(seg.x)} Y${fmt(seg.y)} I${fmt(seg.i)} J${fmt(seg.j || 0)} F${Math.round(seg.feed_mmmin)}`
        );
        lastType = "G03";
      }
    }

    // Program end
    lines.push("");
    lines.push("G00 Z50.000"); // safe retract
    lines.push("M09"); // coolant off
    lines.push("M05"); // spindle off
    lines.push("G28 G91 Z0"); // home Z
    lines.push("G28 X0 Y0");
    if (controller === "HEIDENHAIN") {
      lines.push(`END PGM ${progNum} MM`);
    } else {
      lines.push("M30");
    }
    lines.push("");

    return lines.join("\n");
  }
}

export const unifiedCAMPipelineEngine = new UnifiedCAMPipelineEngine();
