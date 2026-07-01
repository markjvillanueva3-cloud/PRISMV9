/**
 * MultiProcessCAMBridgeEngine — CK-MS3
 * Bridges turning, EDM, grinding, laser, and waterjet engines into
 * the unified CAM pipeline. Detects process from feature type, routes
 * to the correct physics engine, and generates process-specific output.
 *
 * Consolidates CK-MS3 U01-U05 into a single engine.
 */

import { unifiedCAMPipelineEngine } from "./UnifiedCAMPipelineEngine.js";
import { multiAxisPrintToProgramEngine } from "./MultiAxisPrintToProgramEngine.js";
import { millTurnCAMEngine } from "./MillTurnCAMEngine.js";
import { CANONICAL_KIENZLE, CANONICAL_TURNING_SPEEDS, CANONICAL_TURNING_FEEDS } from "../physics/constants.js";

// ── Lazy-load process engines ─────────────────────────────────
const _p: Record<string, any> = {};
function pLazy(key: string, path: string, exportName: string) {
  if (_p[key] === undefined) {
    const candidates = path.endsWith(".js") || path.endsWith(".ts")
      ? [path]
      : [`${path}.js`, `${path}.ts`, path];

    _p[key] = null;
    for (const candidate of candidates) {
      try {
        const m = require(candidate);
        _p[key] = m[exportName] || m[Object.keys(m).find(k =>
          k.toLowerCase().includes(key.toLowerCase())
        ) || Object.keys(m)[0]] || null;
        if (_p[key]) break;
      } catch {
        // Try the next resolution candidate.
      }
    }
  }
  return _p[key];
}

// ── Kienzle — canonical source (physics/constants.ts)
// Migration: 0-D-ARCH U-ARCH1 — fixed: P 1780→1800, P mc 0.26→0.25, S mc 0.25→0.28, H 4000→3200, H mc 0.22→0.30
const KC = CANONICAL_KIENZLE as Record<string, { kc1_1: number; mc: number }>;

// ── Process Detection ─────────────────────────────────────────
export type ManufacturingProcess =
  | "milling" | "turning" | "drilling"
  | "wire_edm" | "sinker_edm"
  | "grinding" | "laser" | "waterjet"
  | "additive" | "multi_axis" | "mill_turn";

const PROCESS_MAP: Record<string, ManufacturingProcess> = {
  // Milling
  pocket: "milling", pocket_rectangular: "milling", pocket_circular: "milling",
  pocket_freeform: "milling", slot: "milling", contour: "milling",
  face: "milling", profile: "milling", cavity: "milling",
  freeform: "milling", boss: "milling", step: "milling",
  // Turning
  od_roughing: "turning", od_finishing: "turning", id_boring: "turning",
  facing_lathe: "turning", grooving: "turning", threading: "turning",
  parting: "turning", knurling: "turning", taper: "turning",
  od_profile: "turning", id_profile: "turning", thread_turning: "turning",
  // Drilling (can be milling or turning)
  through_hole: "drilling", blind_hole: "drilling", counterbore: "drilling",
  countersink: "drilling", tapped_hole: "drilling", reaming: "drilling",
  // Wire EDM
  wire_edm_profile: "wire_edm", wire_edm_taper: "wire_edm",
  wire_cut: "wire_edm", wire_profile: "wire_edm",
  // Sinker EDM
  sinker_edm: "sinker_edm", electrode_burn: "sinker_edm",
  die_sink: "sinker_edm",
  // Grinding
  surface_grind: "grinding", cylindrical_grind: "grinding",
  centerless_grind: "grinding", creep_feed_grind: "grinding",
  bore_finish: "grinding", honing: "grinding",
  // Laser
  laser_cut: "laser", laser_mark: "laser", laser_engrave: "laser",
  plasma_cut: "laser",
  // Waterjet
  waterjet_cut: "waterjet", waterjet_profile: "waterjet",
  // Additive
  additive_ded: "additive", additive_powder: "additive",
  ded_repair: "additive",
  // Multi-axis (5-axis)
  five_axis: "multi_axis", multi_axis: "multi_axis",
  five_axis_contour: "multi_axis", five_axis_swarf: "multi_axis",
  impeller: "multi_axis", blisk: "multi_axis", turbine_blade: "multi_axis",
  // Mill-turn
  mill_turn: "mill_turn", turn_mill: "mill_turn",
  live_tool: "mill_turn", sub_spindle: "mill_turn",
  swiss: "mill_turn", multi_channel: "mill_turn",
};

// ── Interfaces ────────────────────────────────────────────────
export interface ProcessFeature {
  id: string;
  type: string;
  process?: ManufacturingProcess;
  // Milling dims
  dimensions?: {
    length_mm?: number; width_mm?: number;
    depth_mm?: number; diameter_mm?: number;
  };
  // Turning dims
  turning?: {
    od_mm?: number; id_mm?: number;
    length_mm?: number; taper_angle_deg?: number;
    thread_pitch_mm?: number; thread_form?: string;
    groove_width_mm?: number; groove_depth_mm?: number;
  };
  // EDM params
  edm?: {
    wire_diameter_mm?: number; taper_angle_deg?: number;
    surface_finish_vdi?: number; skim_cuts?: number;
    electrode_material?: string; spark_gap_mm?: number;
  };
  // Grinding params
  grinding?: {
    wheel_type?: string; wheel_diameter_mm?: number;
    surface_finish_Ra?: number; stock_removal_mm?: number;
  };
  // Laser/waterjet params
  cutting?: {
    material_thickness_mm?: number; kerf_mm?: number;
    quality_level?: "rough" | "medium" | "fine";
    contour_length_mm?: number;
  };
  tolerance_mm?: number;
  surface_finish_Ra?: number;
}

export interface ProcessResult {
  process: ManufacturingProcess;
  feature_id: string;
  gcode: string;
  gcode_lines: number;
  degraded?: boolean;
  parameters: Record<string, number | string>;
  physics: {
    force_N?: number;
    power_kW?: number;
    temperature_C?: number;
    mrr_mm3_min?: number;
    surface_finish_Ra?: number;
    cycle_time_min?: number;
  };
  tool_recommendation: string;
  warnings: string[];
}

export interface MultiProcessResult {
  processes: ProcessResult[];
  process_summary: Record<ManufacturingProcess, number>;
  total_features: number;
  combined_gcode: string;
  combined_cycle_time_min: number;
  degraded_processes?: number;
  build_complete?: boolean;
  warnings: string[];
}

// ── Engine ─────────────────────────────────────────────────────
export class MultiProcessCAMBridgeEngine {

  /**
   * Detect manufacturing process from feature type.
   */
  detectProcess(featureType: string): ManufacturingProcess {
    return PROCESS_MAP[featureType] || "milling";
  }

  private _mapMillingOperation(
    featureType: string,
  ): "roughing" | "finishing" | "drilling" | "rest" | "facing" {
    switch (featureType) {
      case "face":
        return "facing";
      case "contour":
      case "profile":
      case "freeform":
        return "finishing";
      case "boss":
      case "step":
        return "rest";
      default:
        return "roughing";
    }
  }

  private _mapMultiAxisFeatureType(featureType: string): any {
    switch (featureType) {
      case "impeller":
      case "turbine_blade":
        return "impeller_blade";
      case "blisk":
        return "blisk_blade";
      case "five_axis_swarf":
        return "swept_surface";
      case "five_axis_profile":
        return "5ax_profile";
      case "five_axis_port":
        return "port";
      case "five_axis":
      case "five_axis_contour":
      case "multi_axis":
      default:
        return "5ax_contour";
    }
  }

  /**
   * Process multiple features across different manufacturing processes.
   */
  processAll(
    features: ProcessFeature[],
    material: { iso_group: string; name?: string; hardness_hrc?: number },
    machine?: { name?: string; max_rpm?: number; max_power_kw?: number },
  ): MultiProcessResult {
    const results: ProcessResult[] = [];
    const warnings: string[] = [];
    const processCounts: Record<string, number> = {};

    for (const feature of features) {
      const process = feature.process || this.detectProcess(feature.type);
      processCounts[process] = (processCounts[process] || 0) + 1;

      let result: ProcessResult;
      switch (process) {
        case "turning":
          result = this._processTurning(feature, material, machine);
          break;
        case "wire_edm":
          result = this._processWireEDM(feature, material);
          break;
        case "sinker_edm":
          result = this._processSinkerEDM(feature, material);
          break;
        case "grinding":
          result = this._processGrinding(feature, material);
          break;
        case "laser":
          result = this._processLaser(feature, material);
          break;
        case "waterjet":
          result = this._processWaterjet(feature, material);
          break;
        case "multi_axis":
          result = this._processMultiAxis(feature, material, machine);
          break;
        case "mill_turn":
          result = this._processMillTurn(feature, material, machine);
          break;
        default:
          // Milling and drilling handled by existing UnifiedCAMPipeline
          result = this._processMillingStub(feature, material, machine);
          break;
      }

      results.push(result);
      if (result.warnings.length) warnings.push(...result.warnings);
    }

    const degradedProcesses = results.filter((result) => result.degraded);
    const combinedGcode = results
      .map((result) => result.gcode)
      .filter((gcode) => typeof gcode === "string" && gcode.length > 0)
      .join("\n\n");
    const totalCycle = results.reduce((s, r) => s + (r.physics.cycle_time_min || 0), 0);

    return {
      processes: results,
      process_summary: processCounts as Record<ManufacturingProcess, number>,
      total_features: features.length,
      combined_gcode: combinedGcode,
      combined_cycle_time_min: Math.round(totalCycle * 100) / 100,
      degraded_processes: degradedProcesses.length,
      build_complete: degradedProcesses.length === 0,
      warnings: [...new Set([
        ...warnings,
        ...(degradedProcesses.length > 0
          ? ["One or more process plans are incomplete; degraded fallbacks are excluded from combined_gcode."]
          : []),
      ])],
    };
  }

  // ═══════════════════════════════════════════════════════════
  // TURNING — OD/ID roughing, facing, grooving, threading
  // ═══════════════════════════════════════════════════════════
  private _processTurning(
    feature: ProcessFeature,
    material: { iso_group: string; hardness_hrc?: number },
    machine?: { max_rpm?: number },
  ): ProcessResult {
    // ── Try delegating to TurningPrintToProgramEngine ──
    const TurningEngine = pLazy("turning", "./TurningPrintToProgramEngine", "turningPrintToProgramEngine");
    if (TurningEngine) {
      try {
        const delegated = TurningEngine.calculate("turning_print_to_program", {
          feature_type: feature.type,
          material_iso_group: material.iso_group,
          od_mm: feature.turning?.od_mm,
          id_mm: feature.turning?.id_mm,
          length_mm: feature.turning?.length_mm,
          thread_pitch_mm: feature.turning?.thread_pitch_mm,
          groove_width_mm: feature.turning?.groove_width_mm,
          groove_depth_mm: feature.turning?.groove_depth_mm,
          hardness_hrc: material.hardness_hrc,
          max_rpm: machine?.max_rpm,
        });
        if (delegated && delegated.gcode) {
          return {
            process: "turning",
            feature_id: feature.id,
            gcode: typeof delegated.gcode === "string" ? delegated.gcode : delegated.gcode.join("\n"),
            gcode_lines: delegated.gcode_lines || (typeof delegated.gcode === "string" ? delegated.gcode.split("\n").length : delegated.gcode.length),
            parameters: delegated.parameters || {},
            physics: delegated.physics || {},
            tool_recommendation: delegated.tool_recommendation || "",
            warnings: delegated.warnings || [],
          };
        }
      } catch { /* fall through to inline implementation */ }
    }

    // ── Inline fallback ──
    const t = feature.turning || {};
    const od = t.od_mm || 50;
    const length = t.length_mm || 30;
    const iso = material.iso_group;
    const kz = KC[iso] || KC.P;

    // CSS (Constant Surface Speed) — canonical source (0-D-ARCH review fix)
    const turnSpeeds = CANONICAL_TURNING_SPEEDS as Record<string, { rough: number; finish: number }>;
    const turnFeeds = CANONICAL_TURNING_FEEDS as Record<string, { rough: number; finish: number }>;
    const vc = (turnSpeeds[iso] || turnSpeeds.P).rough;
    const maxRpm = machine?.max_rpm || 4000;
    const rpm = Math.min(maxRpm, Math.round((vc * 1000) / (Math.PI * od)));

    // Feed and DOC — canonical source
    const f = (turnFeeds[iso] || turnFeeds.P).rough; // mm/rev
    const doc = Math.min(3, od * 0.1); // max 3mm or 10% of diameter

    // Kienzle force for turning: Fc = kc1.1 × h^(-mc) × ap × f
    const Fc = kz.kc1_1 * Math.pow(f, -kz.mc) * doc * f;
    const power = (Fc * vc) / 60000;
    const cycleTime = (length / (f * rpm)) + 0.5; // min (+ tool change)

    // Generate turning G-code
    const lines: string[] = [];
    lines.push("O2000");
    lines.push(`(TURNING — ${feature.type} — PRISM CAM)`);
    lines.push("");
    lines.push("G90 G40 G80");
    lines.push("G18"); // ZX plane for turning
    lines.push("T0101 M06");
    lines.push(`G96 S${vc} M03`); // CSS mode
    lines.push(`G50 S${maxRpm}`); // max RPM clamp
    lines.push("M08");
    lines.push("");

    if (/roughing|od_rough/.test(feature.type)) {
      // G71 canned roughing cycle
      lines.push(`G00 X${(od + 2).toFixed(1)} Z2.0`);
      lines.push(`G71 U${doc.toFixed(1)} R0.5`);
      lines.push(`G71 P100 Q200 U0.5 W0.1 F${f.toFixed(2)}`);
      lines.push(`N100 G00 X${(od - length * 0.1).toFixed(1)}`);
      lines.push(`G01 Z-${length.toFixed(1)} F${f.toFixed(2)}`);
      lines.push(`X${od.toFixed(1)}`);
      lines.push("N200 G00 X" + (od + 5).toFixed(1));
    } else if (/finishing|od_finish/.test(feature.type)) {
      // G70 finishing cycle
      lines.push(`G00 X${(od + 2).toFixed(1)} Z2.0`);
      lines.push("G70 P100 Q200");
    } else if (/threading|thread/.test(feature.type)) {
      const pitch = t.thread_pitch_mm || 1.5;
      const threadDepth = pitch * 0.6134; // 60° thread
      const passes = Math.max(4, Math.ceil(threadDepth / 0.15));
      lines.push(`G00 X${od.toFixed(1)} Z5.0`);
      lines.push(`G76 P0${passes}0060 Q${Math.round(threadDepth * 100 / passes)} R0.05`);
      lines.push(`G76 X${(od - 2 * threadDepth).toFixed(3)} Z-${length.toFixed(1)} P${Math.round(threadDepth * 1000)} Q${Math.round(threadDepth * 1000 / passes)} F${pitch.toFixed(3)}`);
    } else if (/grooving|parting/.test(feature.type)) {
      const grooveWidth = t.groove_width_mm || 3;
      const grooveDepth = t.groove_depth_mm || od * 0.3;
      lines.push("T0303 M06"); // grooving tool
      lines.push(`G00 X${(od + 2).toFixed(1)} Z-${(length * 0.5).toFixed(1)}`);
      lines.push(`G75 R0.5`);
      lines.push(`G75 X${(od - 2 * grooveDepth).toFixed(1)} Z-${(length * 0.5 + grooveWidth).toFixed(1)} P${Math.round(grooveDepth * 500)} Q${Math.round(grooveWidth * 500)} F${(f * 0.5).toFixed(2)}`);
    } else if (/facing/.test(feature.type)) {
      lines.push(`G00 X${(od + 5).toFixed(1)} Z0.5`);
      lines.push(`G01 Z0.0 F${(f * 0.8).toFixed(2)}`);
      lines.push(`G01 X-1.0 F${f.toFixed(2)}`);
      lines.push(`G00 Z2.0`);
    } else {
      // Generic OD turning
      lines.push(`G00 X${(od + 2).toFixed(1)} Z2.0`);
      lines.push(`G01 X${od.toFixed(1)} F${f.toFixed(2)}`);
      lines.push(`G01 Z-${length.toFixed(1)}`);
      lines.push(`G00 X${(od + 5).toFixed(1)}`);
    }

    lines.push("");
    lines.push("G00 X100.0 Z50.0");
    lines.push("M09");
    lines.push("M05");
    lines.push("G28 U0 W0");
    lines.push("M30");

    return {
      process: "turning",
      feature_id: feature.id,
      gcode: lines.join("\n"),
      gcode_lines: lines.length,
      parameters: { vc_mpm: vc, f_mmrev: f, doc_mm: doc, rpm, css: "true" as string },
      physics: {
        force_N: Math.round(Fc),
        power_kW: Math.round(power * 100) / 100,
        mrr_mm3_min: Math.round(Math.PI * od * doc * f * rpm / 1000),
        surface_finish_Ra: Math.round((f * f * 1000) / (32 * 0.8) * 100) / 100, // Ra ≈ f²/(32·r_nose) Brammertz
        cycle_time_min: Math.round(cycleTime * 100) / 100,
      },
      tool_recommendation: /thread/.test(feature.type) ? "60° threading insert" :
        /groove|part/.test(feature.type) ? `${t.groove_width_mm || 3}mm grooving insert` :
          `CNMG 120408 ${iso === "S" ? "KC5010" : iso === "H" ? "KBN525" : "KC9110"} insert`,
      warnings: power > ((machine as any)?.max_power_kw || 15) * 0.9
        ? [`Power ${power.toFixed(1)}kW near machine limit`] : [],
    };
  }

  // ═══════════════════════════════════════════════════════════
  // WIRE EDM — 2-axis profile, taper
  // ═══════════════════════════════════════════════════════════
  private _processWireEDM(
    feature: ProcessFeature, material: { iso_group: string },
  ): ProcessResult {
    const edm = feature.edm || {};
    const thickness = feature.cutting?.material_thickness_mm || 20;
    const wireDiam = edm.wire_diameter_mm || 0.25;
    const skimCuts = edm.skim_cuts || 2;
    const contourLen = feature.cutting?.contour_length_mm || 100;

    // MRR for wire EDM: depends on thickness and current
    const roughSpeed = thickness < 30 ? 4 : thickness < 60 ? 2.5 : 1.5; // mm/min
    const skimSpeed = roughSpeed * 2; // skim cuts are faster
    const roughTime = contourLen / roughSpeed;
    const skimTime = skimCuts * (contourLen / skimSpeed);
    const totalTime = (roughTime + skimTime) / 60; // hours → min

    const wireOffset = wireDiam / 2 + 0.01; // rough offset

    const lines: string[] = [];
    lines.push("O3000");
    lines.push(`(WIRE EDM — ${feature.type} — PRISM CAM)`);
    lines.push(`(WIRE: ${wireDiam}mm, SKIM CUTS: ${skimCuts})`);
    lines.push("");
    lines.push(`G92 X0 Y0`);
    lines.push(`G54`);
    lines.push(`M06`); // thread wire
    lines.push(`G41 D01`); // wire offset

    // Simplified 2D profile
    if (feature.dimensions) {
      const l = feature.dimensions.length_mm || 50;
      const w = feature.dimensions.width_mm || 30;
      lines.push(`G01 X${l.toFixed(3)} F${roughSpeed.toFixed(1)}`);
      lines.push(`G01 Y${w.toFixed(3)}`);
      lines.push(`G01 X0.000`);
      lines.push(`G01 Y0.000`);
    }

    lines.push(`G40`); // cancel offset
    lines.push(`M02`); // wire cut
    lines.push(`M30`);

    return {
      process: "wire_edm",
      feature_id: feature.id,
      gcode: lines.join("\n"),
      gcode_lines: lines.length,
      parameters: {
        wire_diameter_mm: wireDiam,
        wire_offset_mm: wireOffset,
        rough_speed_mmmin: roughSpeed,
        skim_cuts: skimCuts,
        thickness_mm: thickness,
      },
      physics: {
        mrr_mm3_min: roughSpeed * thickness * wireDiam,
        surface_finish_Ra: skimCuts >= 3 ? 0.4 : skimCuts >= 2 ? 0.8 : 1.6,
        cycle_time_min: Math.round(totalTime * 100) / 100,
      },
      tool_recommendation: `${wireDiam}mm brass wire, ${skimCuts + 1} cuts for Ra ${skimCuts >= 3 ? "0.4" : "0.8"}μm`,
      warnings: thickness > 100 ? ["Thick stock — verify wire tension and flushing"] : [],
    };
  }

  // ═══════════════════════════════════════════════════════════
  // SINKER EDM — electrode + burn parameters
  // ═══════════════════════════════════════════════════════════
  private _processSinkerEDM(
    feature: ProcessFeature, material: { iso_group: string },
  ): ProcessResult {
    const edm = feature.edm || {};
    const electrodeMat = edm.electrode_material || "graphite";
    const sparkGap = edm.spark_gap_mm || 0.02;
    const vdi = edm.surface_finish_vdi || 18;
    const depth = feature.dimensions?.depth_mm || 10;

    // VDI to Ra conversion: Ra ≈ 0.1 × e^(VDI/8)
    const ra = 0.1 * Math.exp(vdi / 8);
    const mrr = electrodeMat === "copper" ? 30 : 50; // mm³/min (graphite faster)
    const wearRatio = electrodeMat === "copper" ? 0.3 : 0.5; // graphite wears more

    const volume = (feature.dimensions?.length_mm || 20) *
      (feature.dimensions?.width_mm || 15) * depth;
    const burnTime = volume / mrr;

    return {
      process: "sinker_edm",
      feature_id: feature.id,
      gcode: `(SINKER EDM — ${feature.type})\n(ELECTRODE: ${electrodeMat}, GAP: ${sparkGap}mm, VDI: ${vdi})\n(DEPTH: ${depth}mm, EST. TIME: ${Math.round(burnTime)}min)`,
      gcode_lines: 3,
      parameters: {
        electrode_material: electrodeMat,
        spark_gap_mm: sparkGap,
        vdi_finish: vdi,
        wear_ratio: wearRatio,
        burn_depth_mm: depth,
      },
      physics: {
        mrr_mm3_min: mrr,
        surface_finish_Ra: Math.round(ra * 100) / 100,
        cycle_time_min: Math.round(burnTime * 100) / 100,
      },
      tool_recommendation: `${electrodeMat} electrode, ${sparkGap}mm undersize/side, ${Math.ceil(wearRatio * depth / 0.5)} electrodes for ${depth}mm depth`,
      warnings: wearRatio > 0.4 ? ["High electrode wear — plan for multiple electrodes"] : [],
    };
  }

  // ═══════════════════════════════════════════════════════════
  // GRINDING — surface, cylindrical, centerless
  // ═══════════════════════════════════════════════════════════
  private _processGrinding(
    feature: ProcessFeature, material: { iso_group: string },
  ): ProcessResult {
    const g = feature.grinding || {};
    const stock = g.stock_removal_mm || 0.3;
    const targetRa = g.surface_finish_Ra || 0.4;
    const wheelDiam = g.wheel_diameter_mm || 200;

    // Grinding parameters based on type
    const isCreepFeed = stock > 1.0;
    const wheelSpeed = 30; // m/s typical
    const wheelRpm = Math.round((wheelSpeed * 60000) / (Math.PI * wheelDiam));
    const infeed = isCreepFeed ? stock : Math.min(0.02, stock / 10); // mm/pass
    const tableSpeed = isCreepFeed ? 100 : 15000; // mm/min
    const passes = Math.ceil(stock / infeed);
    const sparkOut = 3; // passes at zero infeed for finish

    // Grinding force (Malkin model): Fn' = k × ae × vs/vw
    const k = material.iso_group === "H" ? 40 : 25; // N/mm
    const Fn = k * infeed * (wheelSpeed / (tableSpeed / 1000));
    const power = (Fn * wheelSpeed) / 1000;

    const width = feature.dimensions?.width_mm || 50;
    const length = feature.dimensions?.length_mm || 100;
    const cycleTime = ((passes + sparkOut) * length / tableSpeed) + 1; // + dressing

    return {
      process: "grinding",
      feature_id: feature.id,
      gcode: `(GRINDING — ${feature.type})\n(WHEEL: ${g.wheel_type || "Al2O3"} Ø${wheelDiam}mm @ ${wheelRpm}RPM)\n(STOCK: ${stock}mm in ${passes} passes + ${sparkOut} spark-out)\n(TABLE SPEED: ${tableSpeed}mm/min, INFEED: ${infeed.toFixed(3)}mm/pass)`,
      gcode_lines: 4,
      parameters: {
        wheel_rpm: wheelRpm, infeed_mm: infeed,
        table_speed_mmmin: tableSpeed, passes, spark_out: sparkOut,
        stock_removal_mm: stock,
      },
      physics: {
        force_N: Math.round(Fn),
        power_kW: Math.round(power * 100) / 100,
        surface_finish_Ra: targetRa,
        mrr_mm3_min: Math.round(infeed * width * tableSpeed),
        cycle_time_min: Math.round(cycleTime * 100) / 100,
      },
      tool_recommendation: `${g.wheel_type || "Al2O3"} wheel, ${infeed < 0.01 ? "fine" : "medium"} grit, ${isCreepFeed ? "creep feed" : "reciprocating"}`,
      warnings: power > 10 ? [`Grinding power ${power.toFixed(1)}kW — check for burn`] : [],
    };
  }

  // ═══════════════════════════════════════════════════════════
  // LASER — cutting, marking
  // ═══════════════════════════════════════════════════════════
  private _processLaser(
    feature: ProcessFeature, material: { iso_group: string },
  ): ProcessResult {
    const c = feature.cutting || {};
    const thickness = c.material_thickness_mm || 5;
    const contourLen = c.contour_length_mm || 200;
    const quality = c.quality_level || "medium";

    // Laser cutting speed (mm/min) by material and thickness
    const speedBase: Record<string, number> = { P: 3000, M: 2000, K: 2500, N: 8000, S: 1000, H: 1500 };
    const base = speedBase[material.iso_group] || 3000;
    const speed = base / Math.pow(thickness, 0.8); // speed drops with thickness
    const qualityFactor = quality === "fine" ? 0.6 : quality === "rough" ? 1.5 : 1.0;
    const cutSpeed = Math.round(speed * qualityFactor);

    // Pierce time
    const pierceTime = thickness < 3 ? 0.5 : thickness < 10 ? 2 : 5; // seconds
    const cutTime = contourLen / cutSpeed; // min
    const totalTime = cutTime + pierceTime / 60;

    // Kerf width
    const kerf = thickness < 3 ? 0.15 : thickness < 10 ? 0.25 : 0.4;

    const lines: string[] = [];
    lines.push(`(LASER CUT — ${feature.type})`);
    lines.push(`(THICKNESS: ${thickness}mm, SPEED: ${cutSpeed}mm/min)`);
    lines.push(`(KERF: ${kerf}mm, PIERCE: ${pierceTime}s)`);
    lines.push(`G54 G90`);
    lines.push(`M60`); // pierce
    lines.push(`G41 D01`); // kerf comp
    // Profile would follow contour geometry
    lines.push(`G01 F${cutSpeed}`);
    lines.push(`G40`);
    lines.push(`M61`); // laser off
    lines.push(`M30`);

    return {
      process: "laser",
      feature_id: feature.id,
      gcode: lines.join("\n"),
      gcode_lines: lines.length,
      parameters: {
        cutting_speed_mmmin: cutSpeed,
        thickness_mm: thickness,
        kerf_mm: kerf,
        pierce_time_s: pierceTime,
        quality: quality,
      },
      physics: {
        mrr_mm3_min: Math.round(cutSpeed * thickness * kerf),
        surface_finish_Ra: quality === "fine" ? 1.6 : quality === "medium" ? 3.2 : 6.3,
        cycle_time_min: Math.round(totalTime * 100) / 100,
      },
      tool_recommendation: thickness > 8 ? "CO2 laser (thick stock)" :
        material.iso_group === "N" ? "Fiber laser (reflective material)" : "Fiber laser (standard)",
      warnings: thickness > 25 ? ["Thick material — verify laser power rating"] : [],
    };
  }

  // ═══════════════════════════════════════════════════════════
  // WATERJET — abrasive and pure water
  // ═══════════════════════════════════════════════════════════
  private _processWaterjet(
    feature: ProcessFeature, material: { iso_group: string },
  ): ProcessResult {
    const c = feature.cutting || {};
    const thickness = c.material_thickness_mm || 10;
    const contourLen = c.contour_length_mm || 200;
    const quality = c.quality_level || "medium";

    // Waterjet speed by quality level
    const qualityMap: Record<string, number> = {
      rough: 1.0, medium: 0.5, fine: 0.25,
    };
    const baseSpeed = 500 / Math.pow(thickness, 0.9); // mm/min
    const cutSpeed = Math.round(baseSpeed * (qualityMap[quality] || 0.5));

    // Pierce time (waterjet pierces slower than laser)
    const pierceTime = thickness < 10 ? 5 : thickness < 25 ? 15 : 30;
    const cutTime = contourLen / Math.max(1, cutSpeed);
    const totalTime = cutTime + pierceTime / 60;

    // Kerf and taper
    const kerf = 0.8 + thickness * 0.01; // mm
    const taper = thickness > 25 ? 0.5 : 0.2; // degrees

    return {
      process: "waterjet",
      feature_id: feature.id,
      gcode: `(WATERJET CUT — ${feature.type})\n(THICKNESS: ${thickness}mm, SPEED: ${cutSpeed}mm/min)\n(KERF: ${kerf.toFixed(2)}mm, TAPER: ${taper}°, QUALITY: ${quality})`,
      gcode_lines: 3,
      parameters: {
        cutting_speed_mmmin: cutSpeed,
        thickness_mm: thickness,
        kerf_mm: Math.round(kerf * 100) / 100,
        taper_deg: taper,
        pressure_bar: 4000,
        abrasive_gmin: 350,
        quality,
      },
      physics: {
        mrr_mm3_min: Math.round(cutSpeed * thickness * kerf),
        surface_finish_Ra: quality === "fine" ? 1.6 : quality === "medium" ? 3.2 : 6.3,
        cycle_time_min: Math.round(totalTime * 100) / 100,
      },
      tool_recommendation: `${thickness > 50 ? "60ksi" : "90ksi"} pump, #80 garnet, ${quality} quality`,
      warnings: taper > 0.3 ? [`Taper ${taper}° at ${thickness}mm — consider 5-axis head tilt comp`] : [],
    };
  }

  // ═══════════════════════════════════════════════════════════
  // MILLING STUB — delegates to existing UnifiedCAMPipeline
  // ═══════════════════════════════════════════════════════════
  private _processMillingStub(
    feature: ProcessFeature,
    material: { iso_group: string },
    machine?: { name?: string; max_rpm?: number; max_power_kw?: number },
  ): ProcessResult {
    // ── UnifiedCAMPipelineEngine is the canonical milling delegate ──
    if (unifiedCAMPipelineEngine) {
      try {
        const delegated = unifiedCAMPipelineEngine.generate({
          features: [{
            type: feature.type,
            operation: this._mapMillingOperation(feature.type),
            dimensions: feature.dimensions,
            tolerance_mm: feature.tolerance_mm,
            surface_finish_Ra: feature.surface_finish_Ra,
          }],
          material: material.iso_group,
          machine_name: machine?.name ?? "PRISM",
        });
        if (delegated?.success === false) {
          return {
            process: "milling",
            feature_id: feature.id,
            gcode: "",
            gcode_lines: 0,
            degraded: true,
            parameters: {
              verification_verdict: delegated.verification_verdict ?? "FAILED",
            },
            physics: {
              cycle_time_min: delegated.cycle_time?.p50_min,
            },
            tool_recommendation: "",
            warnings: delegated.warnings || ["UnifiedCAMPipelineEngine rejected the milling feature."],
          };
        }
        if (delegated?.gcode) {
          const gcodeStr = String(delegated.gcode);
          const firstPhysics = delegated.physics_report?.per_operation?.[0] || {};
          return {
            process: "milling",
            feature_id: feature.id,
            gcode: gcodeStr,
            gcode_lines: gcodeStr.split("\n").length,
            parameters: {
              verification_verdict: delegated.verification_verdict ?? "UNKNOWN",
              total_segments: delegated.pipeline_summary?.total_segments ?? 0,
              total_tools: delegated.pipeline_summary?.tools_selected ?? delegated.tool_list?.length ?? 0,
            },
            physics: {
              force_N: firstPhysics.force_N,
              power_kW: firstPhysics.power_kW,
              mrr_mm3_min: firstPhysics.mrr_mm3_min,
              surface_finish_Ra: firstPhysics.ra_um,
              cycle_time_min: delegated.cycle_time?.p50_min,
            },
            tool_recommendation:
              delegated.tool_list?.[0]?.designation
              || delegated.setup_sheet?.tools?.[0]?.description
              || "",
            warnings: delegated.warnings || [],
          };
        }
      } catch { /* fall through */ }
    }

    // ── Inline stub fallback ──
    return {
      process: "milling",
      feature_id: feature.id,
      gcode: "",
      gcode_lines: 0,
      degraded: true,
      parameters: {},
      physics: {},
      tool_recommendation: "Use UnifiedCAMPipelineEngine.generate() for milling features",
      warnings: [
        "Milling delegate engines unavailable — no G-code emitted for this feature.",
        "Milling features should be routed through UnifiedCAMPipelineEngine.",
      ],
    };
  }

  // ═══════════════════════════════════════════════════════════
  // MULTI-AXIS — 5-axis contouring, swarf, impellers
  // ═══════════════════════════════════════════════════════════
  private _processMultiAxis(
    feature: ProcessFeature,
    material: { iso_group: string },
    machine?: { name?: string; max_rpm?: number; max_power_kw?: number },
  ): ProcessResult {
    // ── Try delegating to MultiAxisPrintToProgramEngine ──
    if (multiAxisPrintToProgramEngine) {
      try {
        const delegated = multiAxisPrintToProgramEngine.calculate("multiaxis_print_to_program", {
          part_number: feature.id,
          material: {
            material_name: material.iso_group,
            iso_group: material.iso_group,
          },
          machine_type: "5ax_trunnion",
          controller: "fanuc",
          max_spindle_rpm: machine?.max_rpm,
          max_power_kW: machine?.max_power_kw,
          has_rtcp: true,
          tcp_mode: true,
          optimization_target: "balanced",
          features: [{
            id: feature.id,
            type: this._mapMultiAxisFeatureType(feature.type),
            orientation: { A_deg: 0, B_deg: 0, C_deg: 0 },
            depth_mm: feature.dimensions?.depth_mm ?? 10,
            width_mm: feature.dimensions?.width_mm,
            length_mm: feature.dimensions?.length_mm,
            diameter_mm: feature.dimensions?.diameter_mm,
            tolerance_mm: feature.tolerance_mm,
            surface_finish_Ra_um: feature.surface_finish_Ra,
          }],
        });
        if (delegated?.success === false) {
          return {
            process: "multi_axis",
            feature_id: feature.id,
            gcode: "",
            gcode_lines: 0,
            degraded: true,
            parameters: {
              requires_rtcp: (delegated.requires_rtcp ?? true) ? 1 : 0,
              max_simultaneous_axes: delegated.max_simultaneous_axes ?? 5,
            },
            physics: {
              cycle_time_min: delegated.estimated_cycle_time_sec
                ? delegated.estimated_cycle_time_sec / 60
                : undefined,
            },
            tool_recommendation: "",
            warnings: (delegated.warnings || []).map((w: any) => w.message ?? String(w)),
          };
        }
        if (delegated?.program_text) {
          const gcodeStr = delegated.program_text;
          const firstOp = delegated.operations?.[0];
          return {
            process: "multi_axis",
            feature_id: feature.id,
            gcode: gcodeStr,
            gcode_lines: gcodeStr.split("\n").length,
            parameters: {
              requires_rtcp: (delegated.requires_rtcp ?? false) ? 1 : 0,
              max_simultaneous_axes: delegated.max_simultaneous_axes ?? 5,
              total_operations: delegated.total_operations ?? delegated.operations?.length ?? 0,
            },
            physics: {
              force_N: firstOp?.physics?.cutting_force_N,
              power_kW: firstOp?.physics?.power_kW,
              mrr_mm3_min: firstOp?.physics?.mrr_mm3_min,
              surface_finish_Ra: firstOp?.physics?.predicted_Ra_um,
              cycle_time_min: delegated.estimated_cycle_time_sec
                ? delegated.estimated_cycle_time_sec / 60
                : undefined,
            },
            tool_recommendation: firstOp?.tool
              ? `${firstOp.tool.tool_type} Ø${firstOp.tool.diameter_mm}mm`
              : "",
            warnings: (delegated.warnings || []).map((w: any) => w.message ?? String(w)),
          };
        }
      } catch { /* fall through to milling stub */ }
    }

    // ── Fallback: route through milling stub ──
    const fallback = this._processMillingStub(feature, material, machine);
    fallback.process = "multi_axis";
    fallback.warnings.push("MultiAxisPrintToProgramEngine unavailable — fell back to milling pipeline");
    return fallback;
  }

  // ═══════════════════════════════════════════════════════════
  // MILL-TURN — live tooling, sub-spindle, Swiss, multi-channel
  // ═══════════════════════════════════════════════════════════
  private _processMillTurn(
    feature: ProcessFeature,
    material: { iso_group: string; hardness_hrc?: number },
    machine?: { max_rpm?: number; max_power_kw?: number },
  ): ProcessResult {
    if (millTurnCAMEngine) {
      try {
        const operations: any[] = [];
        const turningLength = feature.turning?.length_mm || feature.dimensions?.length_mm || 20;
        const stockDiameter = feature.turning?.od_mm || feature.dimensions?.diameter_mm || 30;

        if (feature.turning || feature.type === "mill_turn" || feature.type === "turn_mill") {
          const turningType =
            feature.turning?.thread_pitch_mm ? "threading"
            : feature.turning?.groove_width_mm ? "grooving"
            : feature.type === "parting" ? "parting"
            : feature.turning?.id_mm ? "id_boring"
            : "od_roughing";

          operations.push({
            id: `${feature.id}-turn`,
            type: turningType,
            spindle: "main",
            dimensions: {
              diameter_mm: stockDiameter,
              length_mm: turningLength,
              width_mm: feature.turning?.groove_width_mm,
              depth_mm: feature.turning?.groove_depth_mm,
            },
            params: {
              speed_mpm: 200,
              feed_mmrev: 0.25,
              doc_mm: 3,
            },
            tool: {
              type: "turning_insert",
              diameter_mm: 12,
            },
          });
        }

        if (feature.dimensions?.depth_mm || feature.dimensions?.width_mm || feature.type === "live_tool") {
          const liveToolIsDrill = Boolean(feature.dimensions?.diameter_mm && feature.dimensions?.depth_mm);
          operations.push({
            id: `${feature.id}-live`,
            type: liveToolIsDrill ? "cross_drill" : "off_center_pocket",
            spindle: "main",
            position: {
              x: 0,
              z: turningLength / 2,
              y: 0,
              c_deg: 0,
            },
            dimensions: {
              diameter_mm: stockDiameter,
              depth_mm: feature.dimensions?.depth_mm,
              length_mm: feature.dimensions?.length_mm,
              width_mm: feature.dimensions?.width_mm,
            },
            tool: {
              type: liveToolIsDrill ? "drill" : "end_mill",
              diameter_mm: feature.dimensions?.diameter_mm || 6,
              is_live: true,
              rpm: Math.min(machine?.max_rpm || 6000, 6000),
            },
            params: {
              speed_mpm: 120,
              feed_mmrev: 0.08,
            },
          });
        }

        if (operations.length > 0) {
          const delegated = millTurnCAMEngine.generate(operations, {
            material_iso_group: material.iso_group,
            machine_type: "mill_turn",
            max_main_rpm: machine?.max_rpm,
            max_sub_rpm: machine?.max_rpm,
            max_live_rpm: machine?.max_rpm,
            bar_diameter_mm: stockDiameter,
            part_length_mm: turningLength,
          });
          return {
            process: "mill_turn",
            feature_id: feature.id,
            gcode: delegated.gcode,
            gcode_lines: delegated.gcode.split("\n").length,
            parameters: {
              channels: delegated.channels.length,
              sync_points: delegated.sync_points.length,
              tool_count: delegated.tool_list.length,
            },
            physics: {
              cycle_time_min: delegated.total_cycle_time_min,
            },
            tool_recommendation: delegated.tool_list.map((tool) => tool.description).join("; "),
            warnings: delegated.warnings || [],
          };
        }
      } catch { /* fall through to combined fallback */ }
    }

    // ── Fallback: combine turning + milling results ──
    const turningResult = this._processTurning(feature, material, machine);
    const millingResult = this._processMillingStub(feature, { iso_group: material.iso_group }, machine);
    return {
      process: "mill_turn",
      feature_id: feature.id,
      gcode: [
        `(MILL-TURN COMBINED — ${feature.type})`,
        turningResult.gcode,
        millingResult.gcode,
      ].filter((segment) => typeof segment === "string" && segment.length > 0).join("\n\n"),
      gcode_lines: turningResult.gcode_lines + millingResult.gcode_lines + (millingResult.gcode ? 2 : 1),
      degraded: Boolean(turningResult.degraded || millingResult.degraded),
      parameters: { ...turningResult.parameters, ...millingResult.parameters },
      physics: {
        force_N: turningResult.physics.force_N,
        power_kW: turningResult.physics.power_kW,
        mrr_mm3_min: turningResult.physics.mrr_mm3_min,
        surface_finish_Ra: turningResult.physics.surface_finish_Ra,
        cycle_time_min: (turningResult.physics.cycle_time_min || 0) + (millingResult.physics.cycle_time_min || 0),
      },
      tool_recommendation: `${turningResult.tool_recommendation}; ${millingResult.tool_recommendation}`,
      warnings: [
        "MillTurnSwissPipelineEngine unavailable — fell back to separate turning+milling",
        ...turningResult.warnings,
        ...millingResult.warnings,
      ],
    };
  }
}

export const multiProcessCAMBridgeEngine = new MultiProcessCAMBridgeEngine();
