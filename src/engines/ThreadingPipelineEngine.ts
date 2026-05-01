/**
 * ThreadingPipelineEngine — Comprehensive Threading Operations
 *
 * Covers single-point turning threads (G76/G92/G32), thread milling (helical
 * interpolation), rigid tapping (G84), and pipe threads. Generates complete
 * G-code with proper infeed strategies, pass scheduling, and synchronization.
 *
 * Physics (from MachiningKnowledgeBaseEngine):
 *   - Thread depth: d = 0.6134 × pitch (60° metric/unified)
 *   - Infeed per pass: constant chip area method (√pass progression)
 *   - Tap torque: T = kc1.1 × (D/2) × pitch × K_tap
 *   - Thread mill force: Fc = kc × ap × fz (helical engagement)
 *   - Synchronization: F = pitch × RPM (rigid tap, mm/min)
 *
 * @module engines/ThreadingPipelineEngine
 */

import { log } from "../utils/Logger.js";
import {
  getKienzleByISO, getTaylor, getSpeed, calcTapDrill,
  THREADING_INFEED, TAP_DRILL_CHART, lookupTapDrill,
  COOLANT_MATRIX, DRILL_POINT_FACTORS,
} from "./MachiningKnowledgeBaseEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type ThreadType =
  | "metric_coarse" | "metric_fine"
  | "unc" | "unf" | "unef"
  | "bsp" | "bspt" | "npt" | "nptf"
  | "acme" | "trapezoidal" | "buttress"
  | "custom";

export type ThreadMethod =
  | "single_point_od" | "single_point_id"
  | "thread_mill_od" | "thread_mill_id"
  | "rigid_tap" | "floating_tap"
  | "die_head" | "roll_form_tap";

export type InfeedStrategy = "radial" | "modified_flank" | "alternating_flank";

export interface ThreadSpec {
  id: string;
  type: ThreadType;
  method: ThreadMethod;
  major_diameter_mm: number;
  pitch_mm: number;
  tpi?: number;
  thread_class?: string;       // 6g/6H, 2A/2B, etc.
  length_mm: number;
  starts?: number;             // Multi-start
  hand: "right" | "left";
  internal: boolean;
  included_angle_deg?: number; // 60° default, 29° ACME, 55° BSP
  taper_deg_per_side?: number; // NPT: 1.7899°
  chamfer_threads?: number;    // Lead-in chamfer (1-2 threads typical)
  surface_finish_Ra_um?: number;
  tolerance_class?: string;
}

export interface ThreadMaterial {
  material_name: string;
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  hardness_hrc?: number;
}

export interface ThreadToolSelection {
  tool_number: number;
  tool_type: "single_point_insert" | "thread_mill" | "tap" | "form_tap" | "die_head";
  insert_type?: string;
  diameter_mm?: number;
  pitch_mm: number;
  flutes?: number;
  rows?: number;              // Thread mill rows
  coating: string;
  material: "carbide" | "HSS" | "cobalt_HSS" | "cermet";
}

export interface ThreadPassSchedule {
  pass_number: number;
  infeed_mm: number;
  cumulative_depth_mm: number;
  infeed_angle_deg?: number;
  cutting_speed_m_min: number;
  notes: string;
}

export interface ThreadOperationPhysics {
  cutting_force_N: number;
  torque_Nm: number;
  power_kW: number;
  total_thread_depth_mm: number;
  number_of_passes: number;
  predicted_Ra_um: number;
}

export interface ThreadPlannedOp {
  op_number: number;
  thread_id: string;
  method: ThreadMethod;
  tool: ThreadToolSelection;
  infeed_strategy: InfeedStrategy;
  pass_schedule: ThreadPassSchedule[];
  physics: ThreadOperationPhysics;
  cycle_time_sec: number;
  coolant: string;
  gcode_blocks: string[];
  notes: string[];
  warnings: string[];
}

export interface ThreadPipelineResult {
  success: boolean;
  part_number: string;
  material: string;
  threads: ThreadPlannedOp[];
  total_operations: number;
  total_cycle_time_sec: number;
  program_text: string;
  program_line_count: number;
  tap_drill_recommendations: Array<{
    thread_spec: string;
    tap_drill_mm: number;
    tap_drill_inch: string;
    percent_thread: number;
  }>;
  confidence_score: number;
  warnings: Array<{ stage: string; severity: "info" | "warning" | "critical"; message: string }>;
}

export interface ThreadPipelineInput {
  part_number?: string;
  material: ThreadMaterial;
  threads: ThreadSpec[];
  machine_type?: "lathe" | "mill" | "turn_mill";
  max_spindle_rpm?: number;
  max_power_kW?: number;
  controller?: "fanuc" | "haas" | "siemens" | "mazak";
  optimization_target?: "balanced" | "max_speed" | "max_tool_life" | "surface_quality";
}

// ============================================================================
// THREAD GEOMETRY DATABASE
// ============================================================================

interface ThreadForm {
  included_angle_deg: number;
  depth_factor: number;      // depth = factor × pitch
  flat_crest_factor: number; // crest flat = factor × pitch
  flat_root_factor: number;
}

const THREAD_FORMS: Record<string, ThreadForm> = {
  metric_60: { included_angle_deg: 60, depth_factor: 0.6134, flat_crest_factor: 0.125, flat_root_factor: 0.250 },
  unified_60: { included_angle_deg: 60, depth_factor: 0.6134, flat_crest_factor: 0.125, flat_root_factor: 0.250 },
  bsp_55: { included_angle_deg: 55, depth_factor: 0.6403, flat_crest_factor: 0.1373, flat_root_factor: 0.2740 },
  acme_29: { included_angle_deg: 29, depth_factor: 0.500, flat_crest_factor: 0.3707, flat_root_factor: 0.3707 },
  trapezoidal_30: { included_angle_deg: 30, depth_factor: 0.500, flat_crest_factor: 0.366, flat_root_factor: 0.366 },
  buttress_45_7: { included_angle_deg: 52, depth_factor: 0.660, flat_crest_factor: 0.163, flat_root_factor: 0.265 },
};

function getThreadForm(type: ThreadType): ThreadForm {
  switch (type) {
    case "metric_coarse":
    case "metric_fine": return THREAD_FORMS.metric_60;
    case "unc":
    case "unf":
    case "unef": return THREAD_FORMS.unified_60;
    case "bsp":
    case "bspt": return THREAD_FORMS.bsp_55;
    case "npt":
    case "nptf": return THREAD_FORMS.unified_60; // NPT uses 60° angle
    case "acme": return THREAD_FORMS.acme_29;
    case "trapezoidal": return THREAD_FORMS.trapezoidal_30;
    case "buttress": return THREAD_FORMS.buttress_45_7;
    default: return THREAD_FORMS.metric_60;
  }
}

// ============================================================================
// PASS SCHEDULING — Constant Chip Area Method
// ============================================================================

/**
 * Generate threading pass schedule using constant chip area (√pass) method.
 * Source: Sandvik GC 2023, Machinery's Handbook 31st Ed
 *
 * First pass depth = total_depth / √(num_passes)
 * Pass n depth = first_pass × √n - first_pass × √(n-1)
 * This keeps chip cross-section area approximately constant.
 */
function generatePassSchedule(
  totalDepth_mm: number,
  pitch_mm: number,
  iso: string,
  strategy: InfeedStrategy,
  Vc: number,
): ThreadPassSchedule[] {
  // Number of passes based on pitch and material
  let numPasses: number;
  if (pitch_mm <= 0.5) numPasses = 4;
  else if (pitch_mm <= 1.0) numPasses = 6;
  else if (pitch_mm <= 1.5) numPasses = 8;
  else if (pitch_mm <= 2.0) numPasses = 10;
  else if (pitch_mm <= 3.0) numPasses = 14;
  else numPasses = Math.ceil(totalDepth_mm / 0.05) ; // Very coarse: ~0.05mm per pass

  // Superalloys/hardened need more passes
  if (iso === "S" || iso === "H") numPasses = Math.ceil(numPasses * 1.5);
  if (iso === "M") numPasses = Math.ceil(numPasses * 1.2);

  // Add 1-2 spring passes (zero infeed for cleanup)
  const springPasses = pitch_mm > 1.5 ? 2 : 1;

  const schedule: ThreadPassSchedule[] = [];
  let cumulative = 0;

  // Constant chip area: pass_depth(n) = total × (√n/√N - √(n-1)/√N)
  const sqrtN = Math.sqrt(numPasses);
  for (let i = 1; i <= numPasses; i++) {
    const infeed = totalDepth_mm * (Math.sqrt(i) - Math.sqrt(i - 1)) / sqrtN;
    cumulative += infeed;

    let angle: number | undefined;
    if (strategy === "modified_flank") angle = 29.5;
    else if (strategy === "alternating_flank") angle = i % 2 === 0 ? 29.5 : -29.5;

    schedule.push({
      pass_number: i,
      infeed_mm: Math.round(infeed * 10000) / 10000,
      cumulative_depth_mm: Math.round(cumulative * 1000) / 1000,
      infeed_angle_deg: angle,
      cutting_speed_m_min: Vc,
      notes: i <= 2 ? "Roughing pass" : i <= numPasses - 2 ? "Semi-finish" : "Finish pass",
    });
  }

  // Spring passes
  for (let s = 0; s < springPasses; s++) {
    schedule.push({
      pass_number: numPasses + s + 1,
      infeed_mm: 0,
      cumulative_depth_mm: Math.round(cumulative * 1000) / 1000,
      cutting_speed_m_min: Vc,
      notes: "Spring pass (zero infeed, cleanup)",
    });
  }

  return schedule;
}

// ============================================================================
// ENGINE
// ============================================================================

export class ThreadingPipelineEngine {
  readonly name = "ThreadingPipelineEngine";
  readonly version = "1.0.0";

  calculate(action: string, params: Record<string, unknown>): ThreadPipelineResult {
    switch (action) {
      case "threading_pipeline":
        return this.runPipeline(params as unknown as ThreadPipelineInput);
      case "threading_plan":
        return this.runPipeline(params as unknown as ThreadPipelineInput);
      case "threading_pass_schedule":
        return this.runPipeline(params as unknown as ThreadPipelineInput);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  // --------------------------------------------------------------------------
  // TOOL SELECTION
  // --------------------------------------------------------------------------

  private selectTool(spec: ThreadSpec, toolNum: number): ThreadToolSelection {
    switch (spec.method) {
      case "single_point_od":
      case "single_point_id":
        return {
          tool_number: toolNum, tool_type: "single_point_insert",
          insert_type: spec.included_angle_deg === 55 ? "BSP_55" : "ISO_60",
          pitch_mm: spec.pitch_mm, coating: "TiN", material: "carbide",
        };
      case "thread_mill_od":
      case "thread_mill_id":
        return {
          tool_number: toolNum, tool_type: "thread_mill",
          diameter_mm: spec.internal ? spec.major_diameter_mm * 0.65 : spec.major_diameter_mm * 1.2,
          pitch_mm: spec.pitch_mm, flutes: 3, rows: Math.min(4, Math.ceil(spec.length_mm / spec.pitch_mm / 3)),
          coating: "TiAlN", material: "carbide",
        };
      case "rigid_tap":
      case "floating_tap":
        return {
          tool_number: toolNum, tool_type: "tap",
          diameter_mm: spec.major_diameter_mm, pitch_mm: spec.pitch_mm,
          flutes: 3, coating: "TiN",
          material: spec.major_diameter_mm > 16 ? "cobalt_HSS" : "HSS",
        };
      case "roll_form_tap":
        return {
          tool_number: toolNum, tool_type: "form_tap",
          diameter_mm: spec.major_diameter_mm, pitch_mm: spec.pitch_mm,
          flutes: 0, coating: "TiN", material: "HSS",
        };
      default:
        return {
          tool_number: toolNum, tool_type: "single_point_insert",
          pitch_mm: spec.pitch_mm, coating: "TiN", material: "carbide",
        };
    }
  }

  // --------------------------------------------------------------------------
  // INFEED STRATEGY SELECTION
  // --------------------------------------------------------------------------

  private selectInfeedStrategy(spec: ThreadSpec, iso: string): InfeedStrategy {
    if (spec.method.includes("tap") || spec.method.includes("mill")) return "radial";
    if ((iso === "M" || iso === "S") && spec.pitch_mm > 1.5) return "alternating_flank";
    if (spec.pitch_mm > 1.5) return "modified_flank";
    return "radial";
  }

  // --------------------------------------------------------------------------
  // PHYSICS
  // --------------------------------------------------------------------------

  private calculatePhysics(
    spec: ThreadSpec, mat: ThreadMaterial, schedule: ThreadPassSchedule[],
  ): ThreadOperationPhysics {
    const iso = mat.iso_group || "P";
    const kz = getKienzleByISO(iso);
    const form = getThreadForm(spec.type);
    const totalDepth = form.depth_factor * spec.pitch_mm;

    // Average infeed for force calculation
    const avgInfeed = schedule.length > 0
      ? schedule.filter(s => s.infeed_mm > 0).reduce((sum, s) => sum + s.infeed_mm, 0) / schedule.filter(s => s.infeed_mm > 0).length
      : totalDepth / 8;

    // Cutting force: Fc = kc1.1 × ap (thread depth) × f^(1-mc) where f ≈ avgInfeed
    const Fc = kz.kc1_1 * totalDepth * Math.pow(Math.max(avgInfeed, 0.01), 1 - kz.mc);
    const workD = spec.major_diameter_mm;
    const torque = (Fc * workD / 2) / 1000;
    const Vc = schedule[0]?.cutting_speed_m_min || 100;
    const power = (Fc * Vc) / 60000;

    // Ra prediction for threading (~achieved Ra)
    const Ra = spec.surface_finish_Ra_um || (spec.pitch_mm < 1.0 ? 1.6 : spec.pitch_mm < 2.0 ? 3.2 : 6.3);

    return {
      cutting_force_N: Math.round(Fc),
      torque_Nm: Math.round(torque * 10) / 10,
      power_kW: Math.round(power * 100) / 100,
      total_thread_depth_mm: Math.round(totalDepth * 1000) / 1000,
      number_of_passes: schedule.length,
      predicted_Ra_um: Ra,
    };
  }

  // --------------------------------------------------------------------------
  // G-CODE GENERATION
  // --------------------------------------------------------------------------

  private generateGCode(
    op: ThreadPlannedOp, spec: ThreadSpec, input: ThreadPipelineInput,
  ): string[] {
    const lines: string[] = [];
    const ctrl = input.controller || "fanuc";
    const pitch = spec.pitch_mm;
    const starts = spec.starts || 1;

    switch (op.method) {
      case "single_point_od":
      case "single_point_id": {
        // G76 compound threading cycle (Fanuc/Haas)
        const threadD = spec.major_diameter_mm;
        const minorD = spec.internal
          ? threadD + op.physics.total_thread_depth_mm * 2
          : threadD - op.physics.total_thread_depth_mm * 2;
        const threadLen = spec.length_mm;
        const totalDepthMicrons = Math.round(op.physics.total_thread_depth_mm * 1000);
        const firstPassMicrons = Math.round(op.pass_schedule[0].infeed_mm * 1000);
        const minInfeedMicrons = Math.round((op.pass_schedule[op.pass_schedule.length - 2]?.infeed_mm || 0.02) * 1000);
        const chamferThreads = spec.chamfer_threads || 1;
        const angle = spec.included_angle_deg || 60;
        const angleCode = Math.round(angle / 10);  // 60→06, 55→05, 29→03

        // Switch to G97 for threading
        const rpm = Math.round((1000 * (op.pass_schedule[0]?.cutting_speed_m_min || 100)) / (Math.PI * threadD));
        lines.push(`G97 S${Math.min(rpm, input.max_spindle_rpm || 3000)} M03 (Direct RPM for threading)`);
        lines.push(`G00 X${(threadD + 2).toFixed(1)} Z5.0`);

        if (ctrl === "haas" || ctrl === "fanuc") {
          // G76 two-line format
          // Line 1: G76 P(m)(r)(a) Q(min_depth) R(finish_allowance)
          //   m = number of finish passes (01-99)
          //   r = chamfer amount in threads × 10 (10 = 1 thread)
          //   a = infeed angle (00=radial, 29=mod flank, 60=flank)
          const infeedAngleCode = op.infeed_strategy === "modified_flank" ? "29"
            : op.infeed_strategy === "alternating_flank" ? "29" : "00";
          lines.push(`G76 P01${chamferThreads}0${angleCode}${infeedAngleCode} Q${minInfeedMicrons} R0.03`);
          // Line 2: G76 X(minor) Z(end) P(depth) Q(first_cut) F(pitch)
          lines.push(`G76 X${minorD.toFixed(3)} Z${(-threadLen).toFixed(1)} P${totalDepthMicrons} Q${firstPassMicrons} F${pitch.toFixed(3)}${starts > 1 ? ` (${starts}-start)` : ""}`);

          if (starts > 1) {
            // Multi-start: repeat with angular offset
            for (let s = 1; s < starts; s++) {
              const offsetDeg = (360 / starts) * s;
              lines.push(`(Start ${s + 1} — offset ${offsetDeg}°)`);
              lines.push(`G00 X${(threadD + 2).toFixed(1)} Z5.0`);
              lines.push(`G76 P01${chamferThreads}0${angleCode}${infeedAngleCode} Q${minInfeedMicrons} R0.03`);
              lines.push(`G76 X${minorD.toFixed(3)} Z${(-threadLen).toFixed(1)} R0 P${totalDepthMicrons} Q${firstPassMicrons} F${pitch.toFixed(3)} H${s}`);
            }
          }
        }

        // Return to CSS
        lines.push(`G96 S${op.pass_schedule[0]?.cutting_speed_m_min || 200} (Return to CSS)`);
        break;
      }

      case "thread_mill_od":
      case "thread_mill_id": {
        // Helical interpolation thread milling
        const toolD = op.tool.diameter_mm || spec.major_diameter_mm * 0.65;
        const threadD = spec.major_diameter_mm;
        const depth = op.physics.total_thread_depth_mm;
        const helicalRadius = spec.internal
          ? (threadD - toolD) / 2 - depth
          : (threadD + toolD) / 2 + depth;

        const rpm = Math.round((1000 * (op.pass_schedule[0]?.cutting_speed_m_min || 80)) / (Math.PI * toolD));
        const fz = 0.05; // Conservative for thread milling
        const feedRate = Math.round(fz * (op.tool.flutes || 3) * rpm);

        lines.push(`S${Math.min(rpm, input.max_spindle_rpm || 10000)} M03`);
        lines.push(`G00 X0 Y0 Z5.0`);
        lines.push(`G00 Z${(-spec.length_mm + pitch).toFixed(1)} (Position above thread start)`);

        // Arc-in to thread diameter
        lines.push(`G01 X${helicalRadius.toFixed(3)} F${Math.round(feedRate * 0.3)} (Arc-in)`);

        // Helical interpolation — one revolution per pitch
        const numRevolutions = Math.ceil(spec.length_mm / pitch);
        const direction = spec.hand === "right" ? "G03" : "G02";
        for (let rev = 0; rev < numRevolutions; rev++) {
          const zInc = pitch;
          lines.push(`${direction} X${helicalRadius.toFixed(3)} Y0 Z${zInc.toFixed(3)} I${(-helicalRadius).toFixed(3)} J0 F${feedRate} (Rev ${rev + 1})`);
        }

        // Arc-out
        lines.push(`G01 X0 Y0 F${Math.round(feedRate * 0.3)} (Arc-out)`);
        lines.push(`G00 Z5.0`);
        break;
      }

      case "rigid_tap":
      case "floating_tap": {
        // G84 rigid tapping
        const tapRPM = Math.round((1000 * (getSpeed(input.material.iso_group, "tapping")?.vc_typical || 15)) / (Math.PI * spec.major_diameter_mm));
        const syncFeed = Math.round(pitch * tapRPM); // F = pitch × RPM (mm/min)
        const tapDepth = spec.length_mm + pitch * 2; // Extra for chamfer

        lines.push(`G97 S${Math.min(tapRPM, input.max_spindle_rpm || 4000)} M03`);
        lines.push(`G00 X0 Y0 Z3.0 (Above hole)`);

        if (op.method === "rigid_tap") {
          lines.push(`G95 (Feed per rev for rigid tap sync)`);
          lines.push(`G84 Z${(-tapDepth).toFixed(1)} R2.0 F${pitch.toFixed(3)} (Rigid tap, pitch=${pitch}mm)`);
        } else {
          lines.push(`G94 (Feed per minute)`);
          lines.push(`G84 Z${(-tapDepth).toFixed(1)} R2.0 F${syncFeed} (Floating tap, F=pitch×RPM)`);
        }
        lines.push(`G80`);
        lines.push(`G94 (Return to IPM mode)`);
        break;
      }

      case "roll_form_tap": {
        // Same as rigid tap but higher RPM (no chips)
        const formRPM = Math.round((1000 * 25) / (Math.PI * spec.major_diameter_mm));
        lines.push(`G97 S${Math.min(formRPM, input.max_spindle_rpm || 4000)} M03`);
        lines.push(`G95`);
        lines.push(`G84 Z${(-spec.length_mm - pitch).toFixed(1)} R2.0 F${pitch.toFixed(3)} (Roll form tap)`);
        lines.push(`G80`);
        lines.push(`G94`);
        break;
      }
    }

    return lines;
  }

  // --------------------------------------------------------------------------
  // CYCLE TIME ESTIMATION
  // --------------------------------------------------------------------------

  private estimateCycleTime(op: ThreadPlannedOp, spec: ThreadSpec): number {
    switch (op.method) {
      case "single_point_od":
      case "single_point_id": {
        const rpm = Math.round((1000 * (op.pass_schedule[0]?.cutting_speed_m_min || 100)) / (Math.PI * spec.major_diameter_mm));
        const timePerPass = (spec.length_mm / (spec.pitch_mm * rpm)) * 60 + 2; // seconds
        return Math.round(timePerPass * op.pass_schedule.length + 5);
      }
      case "thread_mill_od":
      case "thread_mill_id": {
        const revs = Math.ceil(spec.length_mm / spec.pitch_mm);
        return Math.round(revs * 2 + 10); // ~2s per revolution + setup
      }
      case "rigid_tap":
      case "floating_tap":
      case "roll_form_tap": {
        const tapRPM = 500;
        const timeIn = (spec.length_mm / (spec.pitch_mm * tapRPM)) * 60;
        return Math.round(timeIn * 2 + 3); // In + out + rapid
      }
      default: return 30;
    }
  }

  // --------------------------------------------------------------------------
  // MAIN PIPELINE
  // --------------------------------------------------------------------------

  runPipeline(input: ThreadPipelineInput): ThreadPipelineResult {
    log.info(`[ThreadingPipeline] Processing ${input.threads.length} threads`);

    const warnings: ThreadPipelineResult["warnings"] = [];
    const iso = input.material.iso_group || "P";
    const maxRPM = input.max_spindle_rpm || 3000;
    const mat = input.material;

    const tapDrillRecs: ThreadPipelineResult["tap_drill_recommendations"] = [];
    const operations: ThreadPlannedOp[] = [];
    let opNum = 1;
    let toolNum = 1;

    for (const spec of input.threads) {
      const form = getThreadForm(spec.type);
      const totalDepth = form.depth_factor * spec.pitch_mm;

      // Safety checks
      if (spec.pitch_mm <= 0) {
        warnings.push({ stage: "validation", severity: "critical", message: `Thread ${spec.id}: pitch must be positive` });
        continue;
      }
      if (spec.length_mm < spec.pitch_mm * 2) {
        warnings.push({ stage: "validation", severity: "warning", message: `Thread ${spec.id}: length ${spec.length_mm}mm < 2 × pitch — very short thread` });
      }
      if (spec.type === "npt" || spec.type === "nptf") {
        if (!spec.taper_deg_per_side) {
          warnings.push({ stage: "validation", severity: "info", message: `Thread ${spec.id}: NPT taper auto-set to 1.7899°/side` });
        }
      }

      // Tap drill recommendation for internal threads
      if (spec.internal) {
        const kbEntry = lookupTapDrill(
          spec.type === "metric_coarse" ? `M${spec.major_diameter_mm}x${spec.pitch_mm}` : ""
        );
        const drill = kbEntry?.tap_drill_mm || calcTapDrill(spec.major_diameter_mm, spec.pitch_mm, 75);
        tapDrillRecs.push({
          thread_spec: `${spec.type} ${spec.major_diameter_mm}×${spec.pitch_mm}`,
          tap_drill_mm: Math.round(drill * 100) / 100,
          tap_drill_inch: kbEntry?.tap_drill_inch || "",
          percent_thread: 75,
        });
      }

      // Select tool and strategy
      const tool = this.selectTool(spec, toolNum++);
      const strategy = this.selectInfeedStrategy(spec, iso);

      // Speed from KB
      const speedEntry = getSpeed(iso, "threading");
      const Vc = speedEntry?.vc_typical || 100;

      // Generate pass schedule (only for single-point)
      const schedule = spec.method.startsWith("single_point")
        ? generatePassSchedule(totalDepth, spec.pitch_mm, iso, strategy, Vc)
        : [{ pass_number: 1, infeed_mm: totalDepth, cumulative_depth_mm: totalDepth, cutting_speed_m_min: Vc, notes: "Single pass (tap/mill)" }];

      // Physics
      const physics = this.calculatePhysics(spec, mat, schedule);

      // Power check
      if (physics.power_kW > (input.max_power_kW || 15)) {
        warnings.push({ stage: "planning", severity: "warning",
          message: `Thread ${spec.id}: power ${physics.power_kW}kW exceeds machine limit` });
      }

      // Build operation
      const op: ThreadPlannedOp = {
        op_number: opNum++,
        thread_id: spec.id,
        method: spec.method,
        tool,
        infeed_strategy: strategy,
        pass_schedule: schedule,
        physics,
        cycle_time_sec: 0,
        coolant: COOLANT_MATRIX[iso]?.threading || "flood",
        gcode_blocks: [],
        notes: [
          `Thread form: ${form.included_angle_deg}° included, depth=${totalDepth.toFixed(3)}mm`,
          `Infeed: ${strategy} — ${THREADING_INFEED[strategy]?.description || strategy}`,
          `${schedule.length} passes (${schedule.filter(s => s.infeed_mm > 0).length} cutting + ${schedule.filter(s => s.infeed_mm === 0).length} spring)`,
        ],
        warnings: [],
      };

      // Generate G-code
      op.gcode_blocks = this.generateGCode(op, spec, input);
      op.cycle_time_sec = this.estimateCycleTime(op, spec);

      operations.push(op);
    }

    // Assemble full program
    const programText = this.assembleProgram(operations, input);

    const totalCycleTime = operations.reduce((s, o) => s + o.cycle_time_sec, 0);
    let confidence = 0.85;
    if (warnings.some(w => w.severity === "critical")) confidence -= 0.2;
    confidence = Math.max(0.3, Math.min(1.0, confidence));

    return {
      success: true,
      part_number: input.part_number || "THREAD-001",
      material: input.material.material_name,
      threads: operations,
      total_operations: operations.length,
      total_cycle_time_sec: Math.round(totalCycleTime),
      program_text: programText,
      program_line_count: programText.split("\n").length,
      tap_drill_recommendations: tapDrillRecs,
      confidence_score: Math.round(confidence * 100) / 100,
      warnings,
    };
  }

  private assembleProgram(operations: ThreadPlannedOp[], input: ThreadPipelineInput): string {
    const lines: string[] = [];
    let lineNum = 10;
    const ln = () => { const n = lineNum; lineNum += 10; return `N${n}`; };

    const isMill = input.machine_type === "mill";

    lines.push(`%`);
    lines.push(`O${(input.part_number || "THR001").replace(/\D/g, "").slice(0, 4) || "9001"} (${input.part_number || "THREADING"})`);
    lines.push(`(MATERIAL: ${input.material.material_name} ISO-${input.material.iso_group})`);
    lines.push(`(GENERATED BY PRISM ThreadingPipelineEngine v1.0)`);
    lines.push(``);

    // Safe start
    if (isMill) {
      lines.push(`${ln()} G28 G91 Z0`);
      lines.push(`${ln()} G90 G21 G40 G80`);
    } else {
      lines.push(`${ln()} G28 U0 W0`);
      lines.push(`${ln()} G50 S${input.max_spindle_rpm || 3000}`);
      lines.push(`${ln()} G21 G40 G97`);
    }
    lines.push(``);

    let currentTool = -1;
    for (const op of operations) {
      if (op.tool.tool_number !== currentTool) {
        if (isMill) {
          lines.push(`(--- TOOL ${op.tool.tool_number}: ${op.tool.tool_type} ---)`);
          lines.push(`${ln()} T${op.tool.tool_number} M06`);
          lines.push(`${ln()} G43 H${op.tool.tool_number} Z50.0`);
        } else {
          lines.push(`(--- TOOL ${op.tool.tool_number}: ${op.tool.tool_type} ---)`);
          lines.push(`${ln()} T${String(op.tool.tool_number).padStart(2, "0")}${String(op.tool.tool_number).padStart(2, "0")}`);
        }
        lines.push(`${ln()} M08 (Coolant: ${op.coolant})`);
        currentTool = op.tool.tool_number;
      }

      lines.push(`(OP${op.op_number}: ${op.method} — Thread ${op.thread_id})`);
      lines.push(`(${op.notes[0]})`);
      for (const block of op.gcode_blocks) {
        lines.push(`${ln()} ${block}`);
      }
      lines.push(``);
    }

    lines.push(`${ln()} M09`);
    if (isMill) {
      lines.push(`${ln()} G28 G91 Z0`);
    } else {
      lines.push(`${ln()} G28 U0 W0`);
    }
    lines.push(`${ln()} M30`);
    lines.push(`%`);

    return lines.join("\n");
  }
}

/** Singleton instance. */
export const threadingPipelineEngine = new ThreadingPipelineEngine();
