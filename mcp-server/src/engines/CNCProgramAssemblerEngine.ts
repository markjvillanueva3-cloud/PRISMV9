/**
 * CNCProgramAssemblerEngine — Complete CNC Program Generation Pipeline
 *
 * The integration layer that wires UltimateSpeedFeedEngine into CNC program
 * generation. Accepts high-level operation descriptions (material, tools,
 * geometry) and produces ready-to-run G-code with physics-optimized speeds
 * and feeds auto-calculated for every operation.
 *
 * Pipeline:
 *   1. Per operation: resolve cutting parameters via UltimateSpeedFeedEngine
 *   2. Apply aggressiveness scaling + machine limit clamping
 *   3. Assemble multi-operation G-code via GCodeTemplateEngine
 *   4. Optionally refine line-by-line via AutoSpeedFeedEngine
 *   5. Return annotated G-code + full S/F breakdown per operation
 *
 * Orchestrates (lazy-loaded to avoid circular deps):
 *   - UltimateSpeedFeedEngine — core S/F calculation
 *   - AutoSpeedFeedEngine     — line-by-line G-code optimization
 *   - GCodeTemplateEngine     — G-code generation
 *   - CAMKernelEngine         — toolpath generation
 *
 * Pure computation — no filesystem, no external dependencies.
 *
 * @module engines/CNCProgramAssemblerEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** ISO material group classification. */
export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";

/** Supported CNC operation types for program assembly. */
export type AssemblyOperation =
  | "facing" | "drilling" | "peck_drilling" | "tapping" | "boring"
  | "thread_milling" | "circular_pocket" | "profile"
  | "adaptive_clear" | "contour_2d" | "pocket_2d";

/** Tool type classification for speed/feed lookup. */
export type AssemblyToolType =
  | "endmill" | "ballnose" | "bull_nose" | "face_mill"
  | "drill" | "tap" | "reamer" | "chamfer";

/** Tool substrate material. */
export type AssemblyToolMaterial = "carbide" | "hss" | "cermet" | "ceramic" | "cbn" | "pcd";

/** Coolant delivery strategy. */
export type AssemblyCoolant =
  | "flood" | "mist" | "mql" | "air_blast" | "dry" | "through_tool" | "cryogenic";

/** Cutting strategy / engagement pattern. */
export type AssemblyStrategy =
  | "conventional" | "adaptive" | "trochoidal" | "hsm" | "hpc" | "slot";

/** Supported CNC controller families. */
export type AssemblyController =
  | "fanuc" | "haas" | "siemens" | "heidenhain" | "mazak" | "okuma";

/**
 * Single operation within a program assembly request.
 * Cutting parameters (rpm, feed) are auto-calculated when omitted.
 */
export interface ProgramOperation {
  operation: AssemblyOperation;
  tool_number: number;
  tool_diameter_mm: number;
  flutes: number;
  tool_type?: AssemblyToolType;
  tool_material?: AssemblyToolMaterial;
  coating?: string;
  // Geometry
  x_start?: number;
  y_start?: number;
  z_top?: number;
  z_depth?: number;
  z_safe?: number;
  width_mm?: number;
  length_mm?: number;
  radius_mm?: number;
  // Cutting params (optional — auto-calculated if omitted)
  axial_depth_mm?: number;
  radial_depth_mm?: number;
  cut_type?: "roughing" | "semi_finishing" | "finishing";
  strategy?: AssemblyStrategy;
  coolant?: AssemblyCoolant;
  // Overrides (skip auto-calc if provided)
  override_rpm?: number;
  override_feed_mmmin?: number;
}

/**
 * Full program assembly request: material, controller, operations, and constraints.
 */
export interface ProgramAssemblyInput {
  program_number?: number;
  material: string;
  iso_group?: ISOGroup;
  hardness_hb?: number;
  controller: AssemblyController;
  operations: ProgramOperation[];
  // Machine constraints
  machine_power_kw?: number;
  machine_max_rpm?: number;
  machine_max_torque_nm?: number;
  machine_rigidity?: "low" | "medium" | "high";
  // Optimization
  optimize_for?: "tool_life" | "productivity" | "surface_finish" | "balanced";
  aggressiveness?: number;
  // Output
  annotate?: boolean;
  work_offset?: string;
}

/** Speed/feed result for a single operation. */
export interface OperationSpeedFeed {
  operation_index: number;
  operation: string;
  tool_number: number;
  calculated_rpm: number;
  calculated_feed_mmmin: number;
  cutting_speed_mmin: number;
  feed_per_tooth_mm: number;
  axial_depth_mm: number;
  radial_depth_mm: number;
  mrr_cm3min: number;
  power_kw: number;
  torque_nm: number;
  confidence: number;
  formulas_used: string[];
}

/** Complete program assembly result with G-code and analytics. */
export interface ProgramAssemblyResult {
  gcode: string;
  program_number: number;
  controller: string;
  material: string;
  operations_sf: OperationSpeedFeed[];
  total_operations: number;
  total_tools: number;
  estimated_cycle_time_sec: number;
  warnings: string[];
  /** Playbook-validated warnings from MachiningPlaybookEngine (anti-patterns, sequencing, material tips). */
  playbook_warnings?: string[];
  stats: {
    lines_total: number;
    lines_with_sf: number;
    auto_calculated_ops: number;
    override_ops: number;
    power_limited_ops: number;
  };
}

/** Input for batch speed/feed calculation (no G-code generation). */
export interface BatchCalcInput {
  material: string;
  iso_group?: ISOGroup;
  hardness_hb?: number;
  operations: Array<{
    tool_diameter_mm: number;
    flutes: number;
    operation: string;
    cut_type?: string;
    axial_depth_mm?: number;
    radial_depth_mm?: number;
    tool_material?: string;
  }>;
  machine_power_kw?: number;
  machine_max_rpm?: number;
  optimize_for?: string;
}

/** Single entry in batch calculation result. */
export interface BatchCalcResultEntry {
  index: number;
  operation: string;
  rpm: number;
  feed_mmmin: number;
  cutting_speed_mmin: number;
  feed_per_tooth_mm: number;
  axial_depth_mm: number;
  radial_depth_mm: number;
  mrr_cm3min: number;
  power_kw: number;
  confidence: number;
}

/** Batch calculation result. */
export interface BatchCalcResult {
  material: string;
  iso_group: string;
  entries: BatchCalcResultEntry[];
  warnings: string[];
}

/** Cycle time estimate without full G-code generation. */
export interface CycleTimeEstimate {
  total_sec: number;
  per_operation: Array<{
    index: number;
    operation: string;
    cutting_time_sec: number;
    rapid_time_sec: number;
    tool_change_sec: number;
  }>;
  total_cutting_sec: number;
  total_rapid_sec: number;
  total_tool_change_sec: number;
}

/** Machine constraint set for limit clamping. */
interface MachineConstraints {
  power_kw?: number;
  max_rpm?: number;
  max_torque_nm?: number;
  rigidity?: "low" | "medium" | "high";
}

/** Resolved speed/feed before limit clamping. */
interface ResolvedSF {
  rpm: number;
  feed_mmmin: number;
  cutting_speed_mmin: number;
  feed_per_tooth_mm: number;
  axial_depth_mm: number;
  radial_depth_mm: number;
  mrr_cm3min: number;
  power_kw: number;
  torque_nm: number;
  confidence: number;
  formulas_used: string[];
  power_limited: boolean;
}

// ============================================================================
// MATERIAL → ISO MAPPING
// ============================================================================

const MAT_ISO: Record<string, ISOGroup> = {
  steel: "P", carbon_steel: "P", alloy_steel: "P", "1018": "P", "1045": "P",
  "4140": "P", "4340": "P", "8620": "P", mild_steel: "P", structural_steel: "P",
  stainless: "M", stainless_steel: "M", "304": "M", "316": "M", "17-4ph": "M",
  duplex: "M", "303": "M", "410": "M", "420": "M", austenitic: "M",
  cast_iron: "K", gray_iron: "K", ductile_iron: "K", nodular_iron: "K",
  aluminum: "N", aluminium: "N", "6061": "N", "7075": "N", "2024": "N",
  brass: "N", bronze: "N", copper: "N",
  titanium: "S", "ti-6al-4v": "S", inconel: "S", "718": "S", hastelloy: "S",
  waspaloy: "S", nimonic: "S", monel: "S", cobalt_chrome: "S",
  hardened_steel: "H", d2: "H", h13: "H", m2: "H", tool_steel: "H",
};

/** Operation-to-UltimateSpeedFeedEngine operation mapping. */
const OP_MAP: Record<string, string> = {
  facing: "milling",
  drilling: "drilling",
  peck_drilling: "drilling",
  tapping: "tapping",
  boring: "boring",
  thread_milling: "thread_milling",
  circular_pocket: "milling",
  profile: "milling",
  adaptive_clear: "milling",
  contour_2d: "milling",
  pocket_2d: "milling",
};

/** Rigidity derating factors for feed rate. */
const RIGIDITY_FACTOR: Record<string, number> = {
  low: 0.7,
  medium: 1.0,
  high: 1.15,
};

/** Approximate tool change time in seconds by controller family. */
const TOOL_CHANGE_SEC: Record<string, number> = {
  fanuc: 4.5, haas: 2.8, siemens: 3.5,
  heidenhain: 3.5, mazak: 3.0, okuma: 3.2,
};

// ============================================================================
// ENGINE
// ============================================================================

/**
 * CNCProgramAssemblerEngine — orchestrates speed/feed calculation and G-code
 * generation into a single pipeline call. Accepts high-level operation
 * descriptions and produces ready-to-run CNC programs with physics-optimized
 * cutting parameters.
 *
 * All orchestrated engines are lazy-loaded via dynamic import to prevent
 * circular dependency issues in the PRISM engine graph.
 */
class CNCProgramAssemblerEngineImpl {
  // Lazy-loaded engine references
  private _ultimateSF: any = null;
  private _autoSF: any = null;
  private _gcodeTemplate: any = null;
  private _camKernel: any = null;
  private _playbook: any = null;

  /**
   * Lazy-load an orchestrated engine by name.
   * Uses dynamic import to avoid circular dependencies at module load time.
   *
   * @param name - Engine module identifier
   * @returns The engine singleton or function
   */
  private async _getEngine(name: "ultimateSF" | "autoSF" | "gcodeTemplate" | "camKernel" | "playbook"): Promise<any> {
    switch (name) {
      case "ultimateSF":
        return (this._ultimateSF ??= (await import("./UltimateSpeedFeedEngine.js")).ultimateSpeedFeedEngine);
      case "autoSF":
        return (this._autoSF ??= (await import("./AutoSpeedFeedEngine.js")).autoSpeedFeedEngine);
      case "gcodeTemplate":
        return (this._gcodeTemplate ??= (await import("./GCodeTemplateEngine.js")));
      case "camKernel":
        return (this._camKernel ??= (await import("./CAMKernelEngine.js")).camKernelEngine);
      case "playbook":
        return (this._playbook ??= (await import("./MachiningPlaybookEngine.js")).machiningPlaybookEngine);
    }
  }

  /**
   * Resolve material string to ISO group.
   * Tries exact match, then normalized lowercase with underscores.
   *
   * @param material - Free-text material name
   * @param isoOverride - Explicit ISO group override
   * @returns Resolved ISO group (defaults to "P" if unrecognized)
   */
  private _resolveISO(material: string, isoOverride?: ISOGroup): ISOGroup {
    if (isoOverride) return isoOverride;
    const key = material.toLowerCase().replace(/[\s-]+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (MAT_ISO[key]) return MAT_ISO[key];
    // Partial match fallback
    for (const [k, v] of Object.entries(MAT_ISO)) {
      if (key.includes(k) || k.includes(key)) return v;
    }
    return "P"; // default to steel
  }

  /**
   * Infer default axial and radial cutting depths based on operation type
   * and tool diameter when not explicitly specified by the user.
   *
   * Heuristics follow standard machining practice:
   * - Roughing: ap ≈ 1×D, ae ≈ 0.4×D (milling)
   * - Finishing: ap ≈ 0.5×D, ae ≈ 0.1×D (milling)
   * - Drilling: ap = hole depth or 3×D, ae = D
   *
   * @param op - The program operation
   * @returns Resolved axial and radial depths in mm
   */
  private _inferCuttingDepths(op: ProgramOperation): { axial_mm: number; radial_mm: number } {
    const D = op.tool_diameter_mm;
    const cutType = op.cut_type ?? "roughing";
    const depth = op.z_depth != null ? Math.abs(op.z_depth) : undefined;

    let axial_mm = op.axial_depth_mm ?? 0;
    let radial_mm = op.radial_depth_mm ?? 0;

    if (!op.axial_depth_mm) {
      switch (op.operation) {
        case "facing":
          axial_mm = cutType === "finishing" ? 0.3 : Math.min(D * 0.15, 2.0);
          break;
        case "drilling":
        case "peck_drilling":
          axial_mm = depth ?? D * 3;
          break;
        case "tapping":
          axial_mm = depth ?? D * 2;
          break;
        case "boring":
          axial_mm = depth ?? D * 2;
          break;
        case "adaptive_clear":
          axial_mm = cutType === "finishing" ? D * 0.5 : D * 1.5;
          break;
        case "pocket_2d":
        case "circular_pocket":
          axial_mm = cutType === "finishing" ? D * 0.3 : D * 0.8;
          break;
        default:
          axial_mm = cutType === "finishing" ? D * 0.3 : D * 1.0;
      }
    }

    if (!op.radial_depth_mm) {
      switch (op.operation) {
        case "drilling":
        case "peck_drilling":
        case "tapping":
        case "boring":
          radial_mm = D; // full engagement
          break;
        case "facing":
          radial_mm = D * 0.65;
          break;
        case "adaptive_clear":
          radial_mm = cutType === "finishing" ? D * 0.05 : D * 0.08;
          break;
        case "profile":
        case "contour_2d":
          radial_mm = cutType === "finishing" ? D * 0.05 : D * 0.2;
          break;
        default:
          radial_mm = cutType === "finishing" ? D * 0.1 : D * 0.4;
      }
    }

    return { axial_mm: Math.round(axial_mm * 1000) / 1000, radial_mm: Math.round(radial_mm * 1000) / 1000 };
  }

  /**
   * Clamp speed/feed values to machine limits.
   * Reduces RPM if it exceeds max spindle speed, scales feed proportionally.
   * Reduces feed if required power exceeds machine capacity.
   *
   * @param sf - Resolved speed/feed values
   * @param mc - Machine constraints
   * @returns Clamped values with power_limited flag
   */
  private _applyMachineLimits(sf: ResolvedSF, mc: MachineConstraints): ResolvedSF {
    const result = { ...sf };

    // RPM limit
    if (mc.max_rpm && result.rpm > mc.max_rpm) {
      const ratio = mc.max_rpm / result.rpm;
      result.rpm = mc.max_rpm;
      result.feed_mmmin = Math.round(result.feed_mmmin * ratio);
      result.cutting_speed_mmin = Math.round(result.cutting_speed_mmin * ratio * 100) / 100;
      result.formulas_used.push("RPM clamped to machine max");
    }

    // Power limit — reduce feed to stay within budget
    if (mc.power_kw && result.power_kw > mc.power_kw * 0.9) {
      const derating = (mc.power_kw * 0.9) / result.power_kw;
      result.feed_mmmin = Math.round(result.feed_mmmin * derating);
      result.mrr_cm3min = Math.round(result.mrr_cm3min * derating * 100) / 100;
      result.power_kw = Math.round(mc.power_kw * 0.9 * 100) / 100;
      result.power_limited = true;
      result.formulas_used.push(`Power limited to ${(mc.power_kw * 0.9).toFixed(1)} kW (90% of ${mc.power_kw} kW)`);
    }

    // Torque limit
    if (mc.max_torque_nm && result.torque_nm > mc.max_torque_nm * 0.85) {
      const derating = (mc.max_torque_nm * 0.85) / result.torque_nm;
      result.feed_mmmin = Math.round(result.feed_mmmin * derating);
      result.torque_nm = Math.round(mc.max_torque_nm * 0.85 * 100) / 100;
      result.power_limited = true;
      result.formulas_used.push(`Torque limited to ${(mc.max_torque_nm * 0.85).toFixed(1)} Nm`);
    }

    // Rigidity derating
    if (mc.rigidity && mc.rigidity !== "medium") {
      const factor = RIGIDITY_FACTOR[mc.rigidity];
      result.feed_mmmin = Math.round(result.feed_mmmin * factor);
      if (factor < 1.0) {
        result.formulas_used.push(`Feed derated ×${factor} for ${mc.rigidity} rigidity`);
      }
    }

    return result;
  }

  /**
   * Assemble a complete CNC program with auto-calculated speeds and feeds.
   *
   * For each operation without explicit S/F overrides, the engine:
   *   1. Calls UltimateSpeedFeedEngine.calculate() with material + tool params
   *   2. Applies aggressiveness scaling (0 = conservative, 1 = aggressive)
   *   3. Clamps to machine limits (power, RPM, torque)
   *   4. Passes calculated S/F into GCodeTemplateEngine.generateProgram()
   *   5. Optionally refines via AutoSpeedFeedEngine.optimize()
   *
   * @param input - Program assembly input with material, controller, and operations
   * @returns Complete assembly result with G-code, S/F breakdown, and statistics
   */
  async assembleProgram(input: ProgramAssemblyInput): Promise<ProgramAssemblyResult> {
    log.info(`[CNCProgramAssembler] Assembling ${input.operations.length}-op program for ${input.material} on ${input.controller}`);

    const sfEngine = await this._getEngine("ultimateSF");
    const gcodeModule = await this._getEngine("gcodeTemplate");
    const generateProgram = gcodeModule.generateProgram as Function;

    const warnings: string[] = [];
    const isoGroup = this._resolveISO(input.material, input.iso_group);
    const aggressiveness = input.aggressiveness ?? 0.5;
    const programNumber = input.program_number ?? 1000;
    const workOffset = input.work_offset ?? "G54";

    const operationsSF: OperationSpeedFeed[] = [];
    const gcodeOps: Array<{ operation: string; params: Record<string, any> }> = [];

    let autoCalcCount = 0;
    let overrideCount = 0;
    let powerLimitedCount = 0;
    const toolNumbers = new Set<number>();

    // ── Per-operation S/F resolution ──────────────────────────────────
    for (let i = 0; i < input.operations.length; i++) {
      const op = input.operations[i];
      toolNumbers.add(op.tool_number);
      const depths = this._inferCuttingDepths(op);
      let sf: ResolvedSF;

      if (op.override_rpm != null && op.override_feed_mmmin != null) {
        // User-supplied overrides — skip auto-calculation
        overrideCount++;
        const D = op.tool_diameter_mm;
        const vc = (Math.PI * D * op.override_rpm) / 1000;
        const fz = op.override_feed_mmmin / (op.override_rpm * op.flutes);
        const mrr = (depths.axial_mm * depths.radial_mm * op.override_feed_mmmin) / 1000;
        sf = {
          rpm: op.override_rpm,
          feed_mmmin: op.override_feed_mmmin,
          cutting_speed_mmin: Math.round(vc * 100) / 100,
          feed_per_tooth_mm: Math.round(fz * 10000) / 10000,
          axial_depth_mm: depths.axial_mm,
          radial_depth_mm: depths.radial_mm,
          mrr_cm3min: Math.round(mrr * 100) / 100,
          power_kw: 0,
          torque_nm: 0,
          confidence: 1.0,
          formulas_used: ["User override — S/F not auto-calculated"],
          power_limited: false,
        };
      } else {
        // Auto-calculate via UltimateSpeedFeedEngine
        autoCalcCount++;
        const sfInput = {
          material: input.material,
          iso_group: isoGroup,
          hardness_hb: input.hardness_hb,
          tool_diameter_mm: op.tool_diameter_mm,
          flutes: op.flutes,
          tool_material: op.tool_material,
          tool_coating: op.coating,
          operation: OP_MAP[op.operation] ?? "milling",
          cut_type: op.cut_type,
          strategy: op.strategy,
          axial_depth_mm: depths.axial_mm,
          radial_depth_mm: depths.radial_mm,
          coolant: op.coolant,
          machine_power_kw: input.machine_power_kw,
          machine_max_rpm: input.machine_max_rpm,
          machine_max_torque_nm: input.machine_max_torque_nm,
          machine_rigidity: input.machine_rigidity,
          optimize_for: input.optimize_for,
        };

        try {
          const result = sfEngine.calculate(sfInput);

          // Apply aggressiveness scaling: 0.5 = baseline, 0 = −20%, 1 = +20%
          const aggFactor = 1.0 + (aggressiveness - 0.5) * 0.4;
          let rpm = Math.round(result.spindle_rpm.value * aggFactor);
          let feedMmMin = Math.round(result.feed_rate.value * aggFactor);

          const formulas: string[] = [];
          if (result.cutting_speed.formula) formulas.push(result.cutting_speed.formula);
          if (result.feed_per_tooth.formula) formulas.push(result.feed_per_tooth.formula);
          if (result.mrr.formula) formulas.push(result.mrr.formula);
          if (aggressiveness !== 0.5) {
            formulas.push(`Aggressiveness ×${aggFactor.toFixed(2)} applied`);
          }

          sf = {
            rpm,
            feed_mmmin: feedMmMin,
            cutting_speed_mmin: Math.round(result.cutting_speed.value * aggFactor * 100) / 100,
            feed_per_tooth_mm: Math.round(result.feed_per_tooth.value * 10000) / 10000,
            axial_depth_mm: result.axial_depth.value,
            radial_depth_mm: result.radial_depth.value,
            mrr_cm3min: Math.round(result.mrr.value * aggFactor * 100) / 100,
            power_kw: Math.round((result.power?.cutting_power?.value ?? 0) * 100) / 100,
            torque_nm: Math.round((result.forces?.torque_Nm?.value ?? 0) * 100) / 100,
            confidence: result.cutting_speed.confidence ?? 0.8,
            formulas_used: formulas,
            power_limited: false,
          };
        } catch (err: any) {
          warnings.push(`Op ${i} (${op.operation} T${op.tool_number}): S/F calc failed — ${err.message}. Using safe defaults.`);
          const safeRPM = Math.round((80 * 1000) / (Math.PI * op.tool_diameter_mm));
          sf = {
            rpm: safeRPM,
            feed_mmmin: Math.round(safeRPM * op.flutes * 0.05),
            cutting_speed_mmin: 80,
            feed_per_tooth_mm: 0.05,
            axial_depth_mm: depths.axial_mm,
            radial_depth_mm: depths.radial_mm,
            mrr_cm3min: 0,
            power_kw: 0,
            torque_nm: 0,
            confidence: 0.3,
            formulas_used: ["Fallback defaults (calc error)"],
            power_limited: false,
          };
        }

        // Apply machine limits
        sf = this._applyMachineLimits(sf, {
          power_kw: input.machine_power_kw,
          max_rpm: input.machine_max_rpm,
          max_torque_nm: input.machine_max_torque_nm,
          rigidity: input.machine_rigidity,
        });
        if (sf.power_limited) powerLimitedCount++;
      }

      operationsSF.push({
        operation_index: i,
        operation: op.operation,
        tool_number: op.tool_number,
        calculated_rpm: sf.rpm,
        calculated_feed_mmmin: sf.feed_mmmin,
        cutting_speed_mmin: sf.cutting_speed_mmin,
        feed_per_tooth_mm: sf.feed_per_tooth_mm,
        axial_depth_mm: sf.axial_depth_mm,
        radial_depth_mm: sf.radial_depth_mm,
        mrr_cm3min: sf.mrr_cm3min,
        power_kw: sf.power_kw,
        torque_nm: sf.torque_nm,
        confidence: sf.confidence,
        formulas_used: sf.formulas_used,
      });

      // Build GCodeTemplateEngine operation params
      const coolantMap: Record<string, string> = {
        flood: "flood", mist: "mist", through_tool: "tsc",
        mql: "mist", air_blast: "off", dry: "off", cryogenic: "flood",
      };

      gcodeOps.push({
        operation: op.operation,
        params: {
          tool_number: op.tool_number,
          rpm: sf.rpm,
          feed_rate: sf.feed_mmmin,
          coolant: coolantMap[op.coolant ?? "flood"] ?? "flood",
          z_safe: op.z_safe ?? 5,
          z_depth: op.z_depth ?? -10,
          work_offset: workOffset,
          x_start: op.x_start ?? 0,
          y_start: op.y_start ?? 0,
          // Operation-specific params
          ...(op.operation === "circular_pocket" && {
            pocket_diameter: (op.radius_mm ?? op.tool_diameter_mm * 2) * 2,
            pocket_depth: Math.abs(op.z_depth ?? 10),
            tool_diameter: op.tool_diameter_mm,
          }),
          ...(op.operation === "peck_drilling" && {
            peck_depth: Math.min(op.tool_diameter_mm, 3),
          }),
          ...(op.operation === "thread_milling" && {
            thread_diameter: (op.radius_mm ?? op.tool_diameter_mm) * 2,
            thread_pitch: 1.5,
            thread_depth: Math.abs(op.z_depth ?? 15),
          }),
          ...(op.operation === "profile" && {
            profile_points: [
              { x: op.x_start ?? 0, y: op.y_start ?? 0 },
              { x: (op.x_start ?? 0) + (op.length_mm ?? 50), y: op.y_start ?? 0 },
              { x: (op.x_start ?? 0) + (op.length_mm ?? 50), y: (op.y_start ?? 0) + (op.width_mm ?? 30) },
            ],
            comp_side: "left",
          }),
        },
      });
    }

    // ── G-code generation ─────────────────────────────────────────────
    let gcode: string;
    let lineCount: number;
    let estimatedCycleTimeSec: number;

    try {
      const result = generateProgram(input.controller, gcodeOps.map(o => ({
        operation: o.operation,
        params: { ...o.params, program_number: programNumber },
      })));
      gcode = result.gcode;
      lineCount = result.line_count;
      estimatedCycleTimeSec = result.estimated_cycle_time_sec ?? 0;
    } catch (err: any) {
      warnings.push(`GCode generation warning: ${err.message}`);
      // Fallback: build minimal program manually
      const lines = this._buildFallbackGCode(input, operationsSF, programNumber, workOffset);
      gcode = lines.join("\n");
      lineCount = lines.length;
      estimatedCycleTimeSec = 0;
    }

    // ── Annotation pass ───────────────────────────────────────────────
    if (input.annotate) {
      gcode = this._annotateGCode(gcode, operationsSF);
    }

    // ── Cycle time estimation (if not provided by template engine) ───
    if (estimatedCycleTimeSec === 0) {
      const est = this._quickCycleEstimate(operationsSF, toolNumbers.size, input.controller);
      estimatedCycleTimeSec = est;
    }

    // Count lines containing S or F
    const linesWithSF = gcode.split("\n").filter(l => /[SF]\d/.test(l)).length;

    // ── Playbook validation (anti-patterns, sequencing, material tips) ──
    let playbookWarnings: string[] | undefined;
    try {
      const playbookEngine = await this._getEngine("playbook");
      // Derive feature list from operations for playbook matching
      const features = input.operations.map(op => op.operation);
      const primaryOp = input.operations[0]?.operation;
      const advice = playbookEngine.advise({
        material_iso: isoGroup,
        features,
        categories: ["anti_pattern", "sequencing", "material_tip"] as any[],
        ...(primaryOp && { operation_type: primaryOp }),
      });

      if (advice && advice.rules && advice.rules.length > 0) {
        // Surface critical and important warnings — skip lower-severity tips
        const significantRules = advice.rules.filter(
          (r: any) => r.severity === "critical" || r.severity === "important"
        );
        if (significantRules.length > 0) {
          playbookWarnings = significantRules.map(
            (r: any) => `[${r.id}] (${r.severity}) ${r.title}: ${r.rule}`
          );
          log.info(`[CNCProgramAssembler] Playbook flagged ${significantRules.length} warning(s)`);
        }
      }
    } catch (err: any) {
      // Non-fatal — playbook validation is advisory, never block program assembly
      log.warn(`[CNCProgramAssembler] Playbook validation skipped: ${err.message}`);
    }

    log.info(`[CNCProgramAssembler] Assembled O${programNumber}: ${lineCount} lines, ${operationsSF.length} ops, ${autoCalcCount} auto-calc`);

    return {
      gcode,
      program_number: programNumber,
      controller: input.controller,
      material: input.material,
      operations_sf: operationsSF,
      total_operations: input.operations.length,
      total_tools: toolNumbers.size,
      estimated_cycle_time_sec: Math.round(estimatedCycleTimeSec),
      warnings,
      ...(playbookWarnings && playbookWarnings.length > 0 && { playbook_warnings: playbookWarnings }),
      stats: {
        lines_total: lineCount,
        lines_with_sf: linesWithSF,
        auto_calculated_ops: autoCalcCount,
        override_ops: overrideCount,
        power_limited_ops: powerLimitedCount,
      },
    };
  }

  /**
   * Calculate speed/feed for a batch of operations without generating G-code.
   * Useful for quick parameter lookups and comparison tables.
   *
   * @param input - Batch calculation input with material and operation list
   * @returns Calculated S/F for each operation with confidence scores
   */
  async calculateBatchSpeedFeed(input: BatchCalcInput): Promise<BatchCalcResult> {
    log.info(`[CNCProgramAssembler] Batch S/F calc: ${input.operations.length} ops for ${input.material}`);

    const sfEngine = await this._getEngine("ultimateSF");
    const isoGroup = this._resolveISO(input.material, input.iso_group);
    const warnings: string[] = [];
    const entries: BatchCalcResultEntry[] = [];

    for (let i = 0; i < input.operations.length; i++) {
      const op = input.operations[i];
      try {
        const result = sfEngine.calculate({
          material: input.material,
          iso_group: isoGroup,
          hardness_hb: input.hardness_hb,
          tool_diameter_mm: op.tool_diameter_mm,
          flutes: op.flutes,
          tool_material: op.tool_material,
          operation: OP_MAP[op.operation] ?? op.operation ?? "milling",
          cut_type: op.cut_type,
          axial_depth_mm: op.axial_depth_mm,
          radial_depth_mm: op.radial_depth_mm,
          machine_power_kw: input.machine_power_kw,
          machine_max_rpm: input.machine_max_rpm,
          optimize_for: input.optimize_for,
        });

        entries.push({
          index: i,
          operation: op.operation,
          rpm: Math.round(result.spindle_rpm.value),
          feed_mmmin: Math.round(result.feed_rate.value),
          cutting_speed_mmin: Math.round(result.cutting_speed.value * 100) / 100,
          feed_per_tooth_mm: Math.round(result.feed_per_tooth.value * 10000) / 10000,
          axial_depth_mm: result.axial_depth.value,
          radial_depth_mm: result.radial_depth.value,
          mrr_cm3min: Math.round(result.mrr.value * 100) / 100,
          power_kw: Math.round((result.power?.cutting_power?.value ?? 0) * 100) / 100,
          confidence: result.cutting_speed.confidence ?? 0.8,
        });
      } catch (err: any) {
        warnings.push(`Op ${i} (${op.operation}): ${err.message}`);
        entries.push({
          index: i,
          operation: op.operation,
          rpm: 0, feed_mmmin: 0, cutting_speed_mmin: 0, feed_per_tooth_mm: 0,
          axial_depth_mm: op.axial_depth_mm ?? 0, radial_depth_mm: op.radial_depth_mm ?? 0,
          mrr_cm3min: 0, power_kw: 0, confidence: 0,
        });
      }
    }

    return { material: input.material, iso_group: isoGroup, entries, warnings };
  }

  /**
   * Estimate cycle time for a set of operations without generating full G-code.
   * Sums per-operation cutting time (volume / MRR) plus rapid traverse and
   * tool change estimates.
   *
   * @param input - Program assembly input (same as assembleProgram)
   * @returns Cycle time breakdown per operation and totals
   */
  async estimateCycleTime(input: ProgramAssemblyInput): Promise<CycleTimeEstimate> {
    log.info(`[CNCProgramAssembler] Estimating cycle time: ${input.operations.length} ops`);

    const sfEngine = await this._getEngine("ultimateSF");
    const isoGroup = this._resolveISO(input.material, input.iso_group);
    const tcSec = TOOL_CHANGE_SEC[input.controller] ?? 4.0;

    const perOp: CycleTimeEstimate["per_operation"] = [];
    let totalCuttingSec = 0;
    let totalRapidSec = 0;
    let totalToolChangeSec = 0;
    const seenTools = new Set<number>();

    for (let i = 0; i < input.operations.length; i++) {
      const op = input.operations[i];
      const depths = this._inferCuttingDepths(op);

      // Tool change time (only for first use of each tool)
      let toolChangeSec = 0;
      if (!seenTools.has(op.tool_number)) {
        seenTools.add(op.tool_number);
        toolChangeSec = tcSec;
        totalToolChangeSec += tcSec;
      }

      // Estimate cutting volume (mm³)
      const zTotal = op.z_depth != null ? Math.abs(op.z_depth) : depths.axial_mm;
      const passesAxial = Math.ceil(zTotal / depths.axial_mm) || 1;
      let volumeMm3: number;

      if (op.operation === "drilling" || op.operation === "peck_drilling") {
        volumeMm3 = Math.PI * (op.tool_diameter_mm / 2) ** 2 * zTotal;
      } else if (op.operation === "circular_pocket" && op.radius_mm) {
        volumeMm3 = Math.PI * op.radius_mm ** 2 * zTotal;
      } else {
        const w = op.width_mm ?? op.tool_diameter_mm * 2;
        const l = op.length_mm ?? 50;
        volumeMm3 = w * l * zTotal;
      }

      // Calculate MRR via S/F engine
      let mrr_cm3min: number;
      try {
        const result = sfEngine.calculate({
          material: input.material,
          iso_group: isoGroup,
          tool_diameter_mm: op.tool_diameter_mm,
          flutes: op.flutes,
          operation: OP_MAP[op.operation] ?? "milling",
          cut_type: op.cut_type,
          axial_depth_mm: depths.axial_mm,
          radial_depth_mm: depths.radial_mm,
        });
        mrr_cm3min = result.mrr.value > 0 ? result.mrr.value : 1;
      } catch {
        // Fallback MRR estimate
        mrr_cm3min = (depths.axial_mm * depths.radial_mm * 200) / 1000;
        if (mrr_cm3min <= 0) mrr_cm3min = 1;
      }

      const cuttingTimeSec = (volumeMm3 / 1000) / mrr_cm3min * 60;
      const rapidTimeSec = passesAxial * 0.8 + 1.5; // approximate rapid overhead

      totalCuttingSec += cuttingTimeSec;
      totalRapidSec += rapidTimeSec;

      perOp.push({
        index: i,
        operation: op.operation,
        cutting_time_sec: Math.round(cuttingTimeSec * 10) / 10,
        rapid_time_sec: Math.round(rapidTimeSec * 10) / 10,
        tool_change_sec: toolChangeSec,
      });
    }

    return {
      total_sec: Math.round(totalCuttingSec + totalRapidSec + totalToolChangeSec),
      per_operation: perOp,
      total_cutting_sec: Math.round(totalCuttingSec * 10) / 10,
      total_rapid_sec: Math.round(totalRapidSec * 10) / 10,
      total_tool_change_sec: Math.round(totalToolChangeSec * 10) / 10,
    };
  }

  /**
   * Build fallback G-code when GCodeTemplateEngine fails.
   * Produces minimal but valid Fanuc-style G-code.
   */
  private _buildFallbackGCode(
    input: ProgramAssemblyInput,
    opsSF: OperationSpeedFeed[],
    progNum: number,
    workOffset: string,
  ): string[] {
    const lines: string[] = [
      `O${progNum} (${input.material.toUpperCase()} PROGRAM)`,
      `G90 G21 ${workOffset}`,
      "G17",
    ];

    for (const sf of opsSF) {
      const op = input.operations[sf.operation_index];
      lines.push("");
      lines.push(`(${op.operation.toUpperCase()} - T${op.tool_number} D${op.tool_diameter_mm})`);
      lines.push(`T${op.tool_number} M06`);
      lines.push(`S${sf.calculated_rpm} M03`);
      lines.push("M08");
      lines.push(`G00 X${op.x_start ?? 0} Y${op.y_start ?? 0}`);
      lines.push(`G00 Z${op.z_safe ?? 5}`);
      lines.push(`G01 Z${op.z_depth ?? -10} F${Math.round(sf.calculated_feed_mmmin * 0.5)}`);
      lines.push(`G01 X${(op.x_start ?? 0) + (op.length_mm ?? 50)} F${sf.calculated_feed_mmmin}`);
      lines.push(`G00 Z${op.z_safe ?? 5}`);
    }

    lines.push("");
    lines.push("M09");
    lines.push("M05");
    lines.push("G91 G28 Z0");
    lines.push("G28 X0 Y0");
    lines.push("M30");
    lines.push("%");

    return lines;
  }

  /**
   * Add S/F explanation comments to generated G-code.
   * Inserts a comment block before each tool section showing the calculated
   * cutting parameters and formulas used.
   */
  private _annotateGCode(gcode: string, opsSF: OperationSpeedFeed[]): string {
    const lines = gcode.split("\n");
    const annotated: string[] = [];

    // Build a map of tool numbers to their S/F data
    const sfByTool = new Map<number, OperationSpeedFeed>();
    for (const sf of opsSF) {
      sfByTool.set(sf.tool_number, sf);
    }

    for (const line of lines) {
      // Detect tool change lines
      const toolMatch = line.match(/T(\d+)\s*M0?6/i);
      if (toolMatch) {
        const tn = parseInt(toolMatch[1], 10);
        const sf = sfByTool.get(tn);
        if (sf) {
          annotated.push(`( --- ${sf.operation.toUpperCase()} T${tn} --- )`);
          annotated.push(`( Vc=${sf.cutting_speed_mmin} m/min  RPM=${sf.calculated_rpm}  F=${sf.calculated_feed_mmmin} mm/min )`);
          annotated.push(`( fz=${sf.feed_per_tooth_mm} mm  ap=${sf.axial_depth_mm} mm  ae=${sf.radial_depth_mm} mm )`);
          annotated.push(`( MRR=${sf.mrr_cm3min} cm3/min  P=${sf.power_kw} kW  Conf=${(sf.confidence * 100).toFixed(0)}% )`);
          if (sf.formulas_used.length > 0) {
            annotated.push(`( ${sf.formulas_used[0]} )`);
          }
        }
      }
      annotated.push(line);
    }

    return annotated.join("\n");
  }

  /**
   * Quick cycle time estimate from S/F data without G-code parsing.
   */
  private _quickCycleEstimate(opsSF: OperationSpeedFeed[], toolCount: number, controller: string): number {
    let totalSec = 0;
    const tcSec = TOOL_CHANGE_SEC[controller] ?? 4.0;

    for (const sf of opsSF) {
      // Approximate: 10 seconds per operation at calculated feed + rapid overhead
      const cuttingEst = sf.mrr_cm3min > 0 ? 15 : 5;
      totalSec += cuttingEst + 2; // 2s rapid overhead
    }

    totalSec += toolCount * tcSec;
    return totalSec;
  }
}

/** Singleton instance of CNCProgramAssemblerEngine. */
export const cncProgramAssemblerEngine = new CNCProgramAssemblerEngineImpl();
