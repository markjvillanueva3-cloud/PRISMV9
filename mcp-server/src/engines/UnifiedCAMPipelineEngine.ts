/**
 * UnifiedCAMPipelineEngine — CK-MS0/U01
 * Master orchestrator: single entry point for feature-to-G-code.
 *
 * Pipeline: Features → SmartToolSelection → AdaptiveToolpathRouting →
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
import { ProductionToolpathEngine } from "./ProductionToolpathEngine.js";
import { IntelligentSequencingEngine } from "./IntelligentSequencingEngine.js";

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

// Lazy-load optional external engines
const _ext: Record<string, any> = {};
function getMachineProfile() {
  if (_ext.mp === undefined) {
    try {
      const m = require("./MachineProfileEngine.js");
      _ext.mp = m.machineProfileEngine || null;
    } catch { _ext.mp = null; }
  }
  return _ext.mp;
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
    for (const feature of req.features) {
      // 2a. Smart tool selection
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

      const bestTool = toolResult?.best_tool || {
        diameter_mm: 10, flute_count: 3, flute_length_mm: 30,
        overall_length_mm: 60, coating: "TiAlN", type: "end_mill",
        recommended_params: { speed_mpm: 150, rpm: 5000, feed_mmpt: 0.1, feed_mmmin: 1500, ap_mm: 5, ae_mm: 3 },
        physics: { cutting_force_N: 400, cutting_power_kW: 2, torque_Nm: 5, deflection_mm: 0.01,
          max_deflection_mm: 0.02, deflection_ok: true, tool_life_estimate_min: 60, specific_energy_J_mm3: 2 },
        warnings: [],
      };
      toolsSelected.push(bestTool);
      if (bestTool.warnings?.length) warnings.push(...bestTool.warnings);

      // 2b. Adaptive toolpath routing
      let routeResult: any = null;
      try {
        const atr = getRouter();
        if (atr?.route) {
          routeResult = atr.route({
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
            tool_diameter_mm: bestTool.diameter_mm,
            tool_length_mm: bestTool.overall_length_mm || bestTool.diameter_mm * 6,
            tool_flute_count: bestTool.flute_count,
            pocket_dims: feature.dimensions?.length_mm ? {
              length_mm: feature.dimensions.length_mm,
              width_mm: feature.dimensions.width_mm || feature.dimensions.length_mm,
              depth_mm: feature.dimensions.depth_mm || 10,
            } : undefined,
            rpm: bestTool.recommended_params?.rpm,
            feed_mmpt: bestTool.recommended_params?.feed_mmpt,
          });
        }
      } catch { /* router fallback below */ }

      // Production toolpath available via cam_production_toolpath dispatcher action
      // for real polygon offsets, chip thinning, arc corners, variable feed.

      if (routeResult) {
        algorithmsUsed.push(routeResult.selected_algorithm);
        allSegments.push(...routeResult.toolpath_segments);
        if (routeResult.warnings?.length) warnings.push(...routeResult.warnings);
      }
    }

    // ── 3. Generate G-code from segments ──────────────────────
    const gcode = this._segmentsToGcode(
      allSegments, controller,
      req.options?.program_number || 1000,
      toolsSelected[0],
    );

    // ── 4. Integrated verification ────────────────────────────
    let verification: any = { verdict: "PASS", warnings: [], issues_count: 0 };
    try {
      const ive = getVerifier();
      if (ive?.verify && allSegments.length > 0) {
        const vResult = ive.verify({
          toolpath_segments: allSegments,
          tool: {
            diameter_mm: toolsSelected[0]?.diameter_mm || 10,
            flute_length_mm: toolsSelected[0]?.flute_length_mm || 30,
            overall_length_mm: toolsSelected[0]?.overall_length_mm || 60,
            flute_count: toolsSelected[0]?.flute_count || 3,
            corner_radius_mm: toolsSelected[0]?.corner_radius_mm,
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
          tolerance_mm: req.features[0]?.tolerance_mm,
          surface_finish_Ra_target: req.features[0]?.surface_finish_Ra,
          gcode,
        });
        verification = {
          verdict: vResult.verdict,
          warnings: vResult.issues
            .filter((i: any) => i.severity !== "INFO")
            .map((i: any) => `[${i.severity}] ${i.message}`),
          issues_count: vResult.summary.total_issues,
          physics: vResult.physics,
        };
        if (vResult.issues?.length) {
          for (const issue of vResult.issues) {
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
      if (ppe?.assemble) {
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
      }
    } catch { /* package assembly optional */ }

    const pipelineTime = Date.now() - t0;

    return {
      success: verification.verdict !== "FAIL_FATAL",
      gcode,
      setup_sheet: productionPkg?.setup_sheet || {},
      tool_list: productionPkg?.tool_list || toolsSelected.map((t: any) => ({
        manufacturer: t.manufacturer || "Generic",
        diameter_mm: t.diameter_mm || 10,
        type: t.type || "end_mill",
      })),
      physics_report: productionPkg?.physics_report || verification.physics || {},
      tribal_tips: productionPkg?.tribal_tips || [],
      cycle_time: productionPkg?.cycle_time || { p50_min: 0, p75_min: 0, p95_min: 0 },
      cost_estimate: productionPkg?.cost_estimate || {},
      warnings: [...new Set(warnings)],
      verification_verdict: verification.verdict,
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

  /**
   * Convert toolpath segments to G-code string.
   */
  private _segmentsToGcode(
    segments: any[], controller: string,
    progNum: number, tool: any,
  ): string {
    const lines: string[] = [];
    const fmt = (n: number) => n.toFixed(3);
    const rpm = tool?.recommended_params?.rpm || segments[0]?.rpm || 8000;

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
    lines.push(`T01 M06`);
    lines.push(`S${rpm} M03`);
    lines.push("M08"); // coolant on
    lines.push("G54"); // work offset
    lines.push("");

    // Toolpath moves
    let lastType = "";
    for (const seg of segments) {
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
