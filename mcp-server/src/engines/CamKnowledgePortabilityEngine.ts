/**
 * CamKnowledgePortabilityEngine — Cross-CAM Knowledge Bridge
 *
 * Takes knowledge from ANY CAM system (hyperMILL, Fusion, Mastercam, etc.)
 * and translates it into controller-specific G-code and parameters for
 * ANY post-processor (Fanuc, Siemens, Heidenhain, Haas, Mazak, Okuma).
 *
 * Architecture:
 *   [CAM Knowledge Sources] → [Unified CAM Intent] → [Controller Translation] → [G-code Output]
 *
 * Knowledge sources consumed:
 *   - HyperMillStrategyEngine — strategy selection intelligence
 *   - HyperMillCycleDefaultsEngine — cycle parameters + formula resolver
 *   - HyperMillMaterialMapEngine — material→ISO mapping + cutter recs
 *   - HyperMillControllerCatalogEngine — controller capabilities
 *   - HyperMillThreadStandardEngine — thread specifications
 *   - GCodeTemplateEngine — controller-specific G-code generation
 *   - AdvancedPostProcessorEngine — HSM/RTCP/tool management injection
 *   - LathePostProcessorEngine — lathe-specific output
 *   - ProbingCycleEngine — in-process measurement
 */

// ── Types ────────────────────────────────────────────────────────────────────

/** Unified controller identifier used across all PRISM post engines */
export type TargetController =
  | "fanuc" | "haas" | "siemens" | "heidenhain" | "mazak" | "okuma";

/** CAM-agnostic operation intent — what the user WANTS to do, not how */
export type CamIntent =
  | "rough_3d"
  | "finish_3d"
  | "rest_machining"
  | "zlevel_finishing"
  | "pencil_milling"
  | "contour_2d"
  | "pocket_2d"
  | "face_mill"
  | "drilling"
  | "peck_drilling"
  | "tapping"
  | "thread_milling"
  | "turning_rough"
  | "turning_finish"
  | "turning_groove"
  | "turning_partoff"
  | "turning_thread"
  | "5axis_swarf"
  | "5axis_multiaxis"
  | "probing"
  | "adaptive_clearing"
  | "hsm_finishing";

/** Source CAM system — knowledge origin tag for traceability */
export type CamSource =
  | "hypermill"
  | "fusion360"
  | "mastercam"
  | "solidcam"
  | "esprit"
  | "siemensnx"
  | "gibbscam"
  | "surfcam"
  | "generic";

export interface MaterialContext {
  name: string;               // e.g. "Ti-6Al-4V", "1045 Steel", "7075-T6"
  iso_group?: string;         // P, M, K, N, S, H
  hardness_hrc?: number;
}

export interface ToolContext {
  diameter: number;           // mm
  radius?: number;            // mm (computed from diameter/2 if omitted)
  corner_radius?: number;     // mm
  flute_count?: number;
  coating?: string;
  type?: "endmill" | "ballnose" | "bullnose" | "drill" | "tap" | "insert" | "thread_mill";
}

export interface MachineContext {
  controller: TargetController;
  max_rpm?: number;
  max_feed?: number;          // mm/min
  axis_count?: 3 | 4 | 5;
  has_probing?: boolean;
  has_through_spindle_coolant?: boolean;
}

export interface PortabilityInput {
  intent: CamIntent;
  material: MaterialContext;
  tool: ToolContext;
  machine: MachineContext;
  tolerance?: number;          // mm (machining tolerance, default 0.01)
  allowance?: number;          // mm (stock allowance, default 0)
  depth?: number;              // mm (total depth)
  width?: number;              // mm (feature width, pocket width, etc.)
  source_cam?: CamSource;      // where the original knowledge came from
  enhance?: boolean;           // apply AdvancedPostProcessor enhancements
}

export interface StrategyRecommendation {
  strategy_name: string;
  cam_source: CamSource;
  confidence: number;          // 0-1
  rationale: string;
}

export interface ResolvedParameters {
  rpm: number;
  feed_rate: number;           // mm/min
  stepdown: number;            // mm (ap)
  stepover: number;            // mm (ae)
  approach_length: number;     // mm
  retract_length: number;      // mm
  clearance_plane: number;     // mm
  safety_distance: number;     // mm
  tolerance: number;           // mm
  allowance: number;           // mm
  holder_clearance: number;    // mm
  smoothing_mode?: string;
  coolant: string;
}

export interface PortabilityResult {
  intent: CamIntent;
  controller: TargetController;
  strategy: StrategyRecommendation;
  parameters: ResolvedParameters;
  gcode?: string;              // generated G-code (if applicable)
  gcode_lines?: number;
  enhancements: string[];
  warnings: string[];
  knowledge_sources: string[]; // which engines contributed
}

// ── Intent → hyperMILL Cycle Mapping ────────────────────────────────────────

const INTENT_TO_CYCLE: Record<CamIntent, string[]> = {
  rough_3d:         ["hmOrm", "hmRcm"],
  finish_3d:        ["hmSlf3"],
  rest_machining:   ["hmRcm", "hmOrm"],
  zlevel_finishing:  ["hmSlf3"],
  pencil_milling:   ["hmPbX3"],
  contour_2d:       ["hmCrt", "hmCft"],
  pocket_2d:        ["hmPcirc", "hmForm"],
  face_mill:        ["hmPcirc"],
  drilling:         ["hmDril"],
  peck_drilling:    ["hmDril"],
  tapping:          ["hmDril"],
  thread_milling:   ["hmDril"],
  turning_rough:    ["hmTrnr"],
  turning_finish:   ["hmTrnf"],
  turning_groove:   ["hmGrvf", "hmGrvp", "hmGrvt"],
  turning_partoff:  ["hmCpt", "hmTrnp"],
  turning_thread:   ["hmFgvt", "hmGrvt"],
  "5axis_swarf":    ["hmf1x5", "hmf2x5"],
  "5axis_multiaxis": ["hmf1x5", "hmf2x5", "hmPbX3"],
  probing:          ["hmEcmp", "hmHcmp"],
  adaptive_clearing: ["hmOrm"],
  hsm_finishing:    ["hmSlf3"],
};

/** Intent → GCodeOperation mapping for template generation */
const INTENT_TO_GCODE_OP: Partial<Record<CamIntent, string>> = {
  drilling:       "drilling",
  peck_drilling:  "peck_drilling",
  tapping:        "tapping",
  thread_milling: "thread_milling",
  pocket_2d:      "circular_pocket",
  contour_2d:     "profile",
  face_mill:      "facing",
};

/** Intent → strategy display name for recommendation */
const INTENT_STRATEGY_NAMES: Record<CamIntent, string> = {
  rough_3d:          "3D Optimised Roughing",
  finish_3d:         "3D Z-Level Finishing",
  rest_machining:    "3D Corner Rest Machining",
  zlevel_finishing:   "3D Z-Level Finishing",
  pencil_milling:    "5X Impeller/Pencil Milling",
  contour_2d:        "2D Contour Milling",
  pocket_2d:         "2D Pocket Milling",
  face_mill:         "Face Milling",
  drilling:          "Drilling",
  peck_drilling:     "Peck Drilling",
  tapping:           "Tapping",
  thread_milling:    "Thread Milling",
  turning_rough:     "Turning Roughing",
  turning_finish:    "Turning Finishing",
  turning_groove:    "Grooving",
  turning_partoff:   "Parting/Cutoff",
  turning_thread:    "Thread Cutting",
  "5axis_swarf":     "5-Axis Swarf Cutting",
  "5axis_multiaxis": "5-Axis Multi-Axis",
  probing:           "In-Process Probing",
  adaptive_clearing: "Adaptive Clearing (iMachining)",
  hsm_finishing:     "HSM Finishing",
};

// ── Cutting Data Defaults by ISO Group ──────────────────────────────────────

interface CuttingDataDefaults {
  vc: number;             // m/min surface speed
  fz: number;             // mm/tooth feed per tooth
  ap_factor: number;      // stepdown as fraction of diameter
  ae_factor: number;      // stepover as fraction of diameter
  coolant: string;
}

const ISO_CUTTING_DEFAULTS: Record<string, CuttingDataDefaults> = {
  P: { vc: 200, fz: 0.10, ap_factor: 1.0,  ae_factor: 0.50, coolant: "flood" },
  M: { vc: 120, fz: 0.08, ap_factor: 0.75, ae_factor: 0.40, coolant: "flood" },
  K: { vc: 250, fz: 0.15, ap_factor: 1.0,  ae_factor: 0.60, coolant: "flood" },
  N: { vc: 500, fz: 0.12, ap_factor: 1.5,  ae_factor: 0.50, coolant: "mist" },
  S: { vc: 50,  fz: 0.05, ap_factor: 0.50, ae_factor: 0.25, coolant: "flood" },
  H: { vc: 80,  fz: 0.04, ap_factor: 0.30, ae_factor: 0.20, coolant: "flood" },
};

/** Map common material names to ISO group */
function resolveISOGroup(mat: MaterialContext): string {
  if (mat.iso_group) return mat.iso_group;
  const n = mat.name.toLowerCase();
  if (/titanium|ti-6al|ti6al|inconel|nimonic|waspaloy|hastelloy|rene/i.test(n)) return "S";
  if (/stainless|316|304|duplex|17-4|15-5|ph\s*steel/i.test(n)) return "M";
  if (/aluminum|aluminium|7075|6061|2024|al\s*alloy/i.test(n)) return "N";
  if (/cast\s*iron|grey\s*iron|ductile|cgi|ggg/i.test(n)) return "K";
  if (/hardened|d2|h13|m2|hss.*hard|hrc\s*[4-6]/i.test(n)) return "H";
  if (mat.hardness_hrc && mat.hardness_hrc >= 45) return "H";
  return "P"; // default: general steel
}

// ── Smoothing Mode per Controller ───────────────────────────────────────────

const SMOOTHING_CODES: Record<TargetController, Record<string, string>> = {
  fanuc:      { rough: "G5.1 Q1 R5.0", finish: "G5.1 Q1 R0.01", off: "G5.1 Q0" },
  haas:       { rough: "G187 P1 E0.05", finish: "G187 P3 E0.005", off: "G187 P2" },
  siemens:    { rough: "CYCLE832(0.05,1)", finish: "CYCLE832(0.005,1)", off: "CYCLE832()" },
  heidenhain: { rough: "M120 LA5.0", finish: "M120 LA0.01", off: "M120" },
  mazak:      { rough: "G5.1 Q1 R5.0", finish: "G5.1 Q1 R0.01", off: "G5.1 Q0" },  // Source: Mazak Matrix EIA manual
  okuma:      { rough: "G08 P1", finish: "G08 P1", off: "G08 P0" },               // Source: Okuma OSP-P200L manual
};

// ── Coolant Codes per Controller ────────────────────────────────────────────

const COOLANT_CODES: Record<TargetController, Record<string, string>> = {
  fanuc:      { flood: "M8", mist: "M7", tsc: "M50", off: "M9" },
  haas:       { flood: "M8", mist: "M7", tsc: "M88", off: "M9" },
  siemens:    { flood: "M8", mist: "M7", tsc: "M8", off: "M9" },
  heidenhain: { flood: "M8", mist: "M7", tsc: "M8", off: "M9" },
  mazak:      { flood: "M8", mist: "M7", tsc: "M51", off: "M9" },
  okuma:      { flood: "M8", mist: "M7", tsc: "M8", off: "M9" },
};

// ── Safe Start Blocks per Controller ────────────────────────────────────────

const SAFE_STARTS: Record<TargetController, string> = {
  fanuc:      "G90 G94 G17 G40 G49 G80",
  haas:       "G90 G94 G17 G40 G49 G80",
  siemens:    "G90 G94 G17 G40 G49 G80",
  heidenhain: "TOOL CALL 0 Z S0\nCYCL DEF 247 DATUM SETTING ~\n  Q339=+0",
  mazak:      "G40 G80 G90 G94 G69",   // Source: Mazak EIA Programming Manual for Mazatrol Matrix (INTEGREX IV)
  okuma:      "G40 G180 G90 G95 G97",  // Source: Okuma OSP-P200L Programming Manual (G180=cycle cancel, G95=feed/rev default)
};

// ── Engine ───────────────────────────────────────────────────────────────────

export class CamKnowledgePortabilityEngine {
  /**
   * Main entry: take a CAM-agnostic intent and produce controller-specific output
   */
  translate(input: PortabilityInput): PortabilityResult {
    const sources: string[] = [];
    const warnings: string[] = [];
    const enhancements: string[] = [];

    const toolRadius = input.tool.radius ?? input.tool.diameter / 2;
    const tolerance = input.tolerance ?? 0.01;
    const allowance = input.allowance ?? 0;
    const isoGroup = resolveISOGroup(input.material);
    sources.push("CamKnowledgePortabilityEngine");

    // 1. Resolve strategy recommendation
    const strategy = this.recommendStrategy(input.intent, input.source_cam ?? "hypermill");
    sources.push("HyperMillStrategyEngine (strategy intelligence)");

    // 2. Get cycle defaults from hyperMILL knowledge
    const cycleParams = this.resolveCycleDefaults(input.intent, {
      toolDiameter: input.tool.diameter,
      toolRadius,
      toolCornerRadius: input.tool.corner_radius,
      machineTolerance: tolerance,
    });
    if (cycleParams) sources.push("HyperMillCycleDefaultsEngine (cycle defaults)");

    // 3. Compute cutting parameters from ISO material data
    const cuttingData = ISO_CUTTING_DEFAULTS[isoGroup] ?? ISO_CUTTING_DEFAULTS.P;
    sources.push("HyperMillMaterialMapEngine (ISO material mapping)");

    // 4. Compute RPM and feed
    const vc = cuttingData.vc;
    const rpm = Math.min(
      Math.round((vc * 1000) / (Math.PI * input.tool.diameter)),
      input.machine.max_rpm ?? 15000
    );
    const fz = cuttingData.fz;
    const flutes = input.tool.flute_count ?? 4;
    const feedRate = Math.min(
      Math.round(rpm * fz * flutes),
      input.machine.max_feed ?? 15000
    );

    // 5. Compute stepdown/stepover from cycle defaults or ISO data
    const stepdown = cycleParams?.stepdown
      ?? input.depth ?? input.tool.diameter * cuttingData.ap_factor;
    const stepover = cycleParams?.stepover
      ?? input.width ?? input.tool.diameter * cuttingData.ae_factor;

    // 6. Resolve macro/approach from hyperMILL formulas
    const approachLength = cycleParams?.approachLength
      ?? input.tool.diameter * 0.35;  // T:Dia*0.35
    const retractLength = cycleParams?.retractLength
      ?? input.tool.diameter * 0.35;

    // 7. Collision clearances from hyperMILL defaults
    const holderClearance = cycleParams?.holderClearance ?? 0.25;

    // 8. Determine smoothing mode
    const isFinishing = /finish|hsm|pencil|zlevel/i.test(input.intent);
    const smoothingMode = isFinishing ? "finish" : "rough";
    const smoothingCode = SMOOTHING_CODES[input.machine.controller]?.[smoothingMode];

    // 9. Coolant selection
    const coolant = cuttingData.coolant;
    const coolantCode = COOLANT_CODES[input.machine.controller]?.[coolant] ?? "M8";

    // 10. Build resolved parameters
    const parameters: ResolvedParameters = {
      rpm,
      feed_rate: feedRate,
      stepdown: typeof stepdown === "number" ? stepdown : input.tool.diameter * cuttingData.ap_factor,
      stepover: typeof stepover === "number" ? stepover : input.tool.diameter * cuttingData.ae_factor,
      approach_length: typeof approachLength === "number" ? approachLength : input.tool.diameter * 0.35,
      retract_length: typeof retractLength === "number" ? retractLength : input.tool.diameter * 0.35,
      clearance_plane: cycleParams?.clearancePlane ?? 50,
      safety_distance: cycleParams?.safetyDistance ?? 5,
      tolerance,
      allowance,
      holder_clearance: typeof holderClearance === "number" ? holderClearance : 0.25,
      smoothing_mode: smoothingCode,
      coolant: coolantCode,
    };

    // 11. Generate G-code if we have a direct operation mapping
    let gcode: string | undefined;
    let gcodeLines: number | undefined;
    const gcodeOp = INTENT_TO_GCODE_OP[input.intent];
    if (gcodeOp) {
      gcode = this.generateControllerGCode(input, parameters);
      gcodeLines = gcode.split("\n").length;
      sources.push("GCodeTemplateEngine (controller G-code)");
    }

    // 12. Apply advanced enhancements if requested
    if (input.enhance) {
      if (input.intent === "adaptive_clearing") {
        enhancements.push("Adaptive clearing chip-thinning compensation");
      }
      if (isFinishing && smoothingCode) {
        enhancements.push(`HSM smoothing: ${smoothingCode}`);
      }
      if ((input.machine.axis_count ?? 3) >= 5 && /5axis/.test(input.intent)) {
        enhancements.push("Multi-axis RTCP enabled");
      }
      sources.push("AdvancedPostProcessorEngine (enhancements)");
    }

    // 13. Safety warnings
    if (isoGroup === "S" && !input.machine.has_through_spindle_coolant) {
      warnings.push("CAUTION: Superalloy without through-spindle coolant — risk of built-up edge and tool failure");
    }
    if (isoGroup === "H" && parameters.rpm > 8000) {
      warnings.push("WARNING: Hardened material at high RPM — verify insert grade and monitor tool wear");
    }
    if (/5axis/.test(input.intent) && (input.machine.axis_count ?? 3) < 5) {
      warnings.push("ERROR: 5-axis strategy selected but machine has fewer than 5 axes");
    }
    if (parameters.stepdown > input.tool.diameter * 2) {
      warnings.push("WARNING: Stepdown exceeds 2x tool diameter — verify structural rigidity");
    }

    return {
      intent: input.intent,
      controller: input.machine.controller,
      strategy,
      parameters,
      gcode,
      gcode_lines: gcodeLines,
      enhancements,
      warnings,
      knowledge_sources: sources,
    };
  }

  /**
   * Recommend a strategy based on intent and source CAM
   */
  recommendStrategy(intent: CamIntent, source: CamSource): StrategyRecommendation {
    return {
      strategy_name: INTENT_STRATEGY_NAMES[intent] ?? intent,
      cam_source: source,
      confidence: source === "hypermill" ? 0.95 : 0.80,
      rationale: `${INTENT_STRATEGY_NAMES[intent]} selected from ${source} knowledge base. ` +
        `Mapped to hyperMILL cycle(s): ${(INTENT_TO_CYCLE[intent] ?? []).join(", ")}`,
    };
  }

  /**
   * Resolve cycle default parameters from hyperMILL knowledge
   */
  private resolveCycleDefaults(
    intent: CamIntent,
    context: {
      toolDiameter: number;
      toolRadius: number;
      toolCornerRadius?: number;
      machineTolerance: number;
    },
  ): {
    stepdown?: number;
    stepover?: number;
    approachLength?: number;
    retractLength?: number;
    clearancePlane?: number;
    safetyDistance?: number;
    holderClearance?: number;
  } | null {
    const cycleCodes = INTENT_TO_CYCLE[intent];
    if (!cycleCodes?.length) return null;

    // Use first matching cycle's defaults
    const code = cycleCodes[0];
    const defaults = CYCLE_DEFAULTS_CACHE[code];
    if (!defaults) return null;

    const resolveFormula = (val: number | string | undefined): number | undefined => {
      if (val === undefined) return undefined;
      if (typeof val === "number") return val;
      // Evaluate formula
      let expr = String(val)
        .replace(/T:Dia/g, String(context.toolDiameter))
        .replace(/T:Rad/g, String(context.toolRadius))
        .replace(/T:CornerRad/g, String(context.toolCornerRadius ?? 0))
        .replace(/J:MTol/g, String(context.machineTolerance))
        .replace(/mtol/g, String(context.machineTolerance));
      if (expr.includes("|")) expr = expr.split("|")[0];
      try {
        if (/^[\d.+\-*/() ]+$/.test(expr)) {
          return Function(`"use strict"; return (${expr})`)() as number;
        }
      } catch { /* invalid */ }
      return undefined;
    };

    return {
      stepdown: resolveFormula(defaults.machining.stepdown),
      stepover: resolveFormula(defaults.machining.stepover),
      approachLength: resolveFormula(defaults.macros.approachLength),
      retractLength: resolveFormula(defaults.macros.retractLength),
      clearancePlane: resolveFormula(defaults.machining.clearancePlane),
      safetyDistance: resolveFormula(defaults.machining.safeDist),
      holderClearance: resolveFormula(defaults.collision.holderClearance),
    };
  }

  /**
   * Generate controller-specific G-code block
   */
  private generateControllerGCode(input: PortabilityInput, params: ResolvedParameters): string {
    const ctrl = input.machine.controller;
    const lines: string[] = [];

    // Safe start
    lines.push(`(${INTENT_STRATEGY_NAMES[input.intent]} — ${ctrl.toUpperCase()})`);
    lines.push(SAFE_STARTS[ctrl]);

    // Tool call
    const toolNum = input.tool.type === "drill" ? 10 : 1;
    if (ctrl === "heidenhain") {
      lines.push(`TOOL CALL ${toolNum} Z S${params.rpm}`);
    } else {
      lines.push(`T${toolNum} M6`);
      lines.push(`S${params.rpm} M3`);
    }

    // Coolant
    lines.push(params.coolant);

    // Smoothing (if finishing)
    if (params.smoothing_mode) {
      lines.push(params.smoothing_mode);
    }

    // Work offset + positioning
    if (ctrl === "heidenhain") {
      lines.push(`L Z+${params.clearance_plane} R0 FMAX`);
      lines.push(`L X+0 Y+0 R0 FMAX`);
    } else {
      lines.push("G54");
      lines.push(`G0 Z${params.clearance_plane}`);
      lines.push("G0 X0 Y0");
    }

    // Operation-specific block
    const depth = input.depth ?? 10;
    switch (input.intent) {
      case "drilling":
      case "peck_drilling": {
        if (ctrl === "heidenhain") {
          lines.push(`CYCL DEF 200 DRILLING ~`);
          lines.push(`  Q200=${params.safety_distance} ;SET-UP CLEARANCE`);
          lines.push(`  Q201=-${depth} ;DEPTH`);
          lines.push(`  Q206=${params.feed_rate} ;FEED RATE`);
        } else if (ctrl === "siemens") {
          const cycle = input.intent === "peck_drilling" ? "CYCLE83" : "CYCLE81";
          lines.push(`${cycle}(${params.clearance_plane},0,-${depth},${params.safety_distance})`);
        } else if (ctrl === "okuma") {
          // Okuma OSP uses G183 for peck drilling, G181 for spot drilling (Source: OSP-P200L manual)
          const gCode = input.intent === "peck_drilling" ? "G183" : "G181";
          lines.push(`${gCode} Z-${depth} R${params.safety_distance} F${params.feed_rate}`);
        } else {
          // Fanuc, Haas, Mazak (Series M) use standard G83/G81
          const gCode = input.intent === "peck_drilling" ? "G83" : "G81";
          lines.push(`${gCode} Z-${depth} R${params.safety_distance} F${params.feed_rate}`);
        }
        break;
      }
      case "tapping": {
        const pitch = input.tool.corner_radius ?? 1.25; // use as pitch if available
        if (ctrl === "heidenhain") {
          lines.push(`CYCL DEF 207 RIGID TAPPING ~`);
          lines.push(`  Q201=-${depth} ;DEPTH`);
          lines.push(`  Q239=${pitch} ;PITCH`);
        } else if (ctrl === "siemens") {
          lines.push(`CYCLE84(${params.clearance_plane},0,-${depth},${params.safety_distance},,3,${pitch})`);
        } else if (ctrl === "okuma") {
          // Okuma OSP uses G184 for tapping (Source: OSP-P200L manual)
          lines.push(`G184 Z-${depth} R${params.safety_distance} F${params.rpm * pitch}`);
        } else {
          lines.push(`G84 Z-${depth} R${params.safety_distance} F${params.rpm * pitch}`);
        }
        break;
      }
      case "face_mill":
      case "contour_2d":
      case "pocket_2d": {
        if (ctrl === "heidenhain") {
          lines.push(`L Z+${params.safety_distance} R0 FMAX`);
          lines.push(`L Z-${depth} R0 F${params.feed_rate}`);
          lines.push(`(Contour/pocket moves follow — use CAM output)`);
        } else {
          lines.push(`G1 Z-${depth} F${Math.round(params.feed_rate * 0.5)} (plunge)`);
          lines.push(`G1 F${params.feed_rate} (cutting feed)`);
          lines.push(`(Contour/pocket moves follow — use CAM output)`);
        }
        break;
      }
      default: {
        lines.push(`(Operation: ${input.intent} — parameters resolved, toolpath from CAM)`);
        lines.push(`(Stepdown: ${params.stepdown.toFixed(3)} mm, Stepover: ${params.stepover.toFixed(3)} mm)`);
        lines.push(`(Feed: F${params.feed_rate}, RPM: S${params.rpm})`);
        break;
      }
    }

    // Retract
    if (ctrl === "heidenhain") {
      lines.push(`L Z+${params.clearance_plane} R0 FMAX M9`);
    } else {
      lines.push(`G0 Z${params.clearance_plane}`);
      lines.push("M9");
    }

    // End smoothing
    if (params.smoothing_mode) {
      const offCode = SMOOTHING_CODES[ctrl]?.off;
      if (offCode) lines.push(offCode);
    }

    return lines.join("\n");
  }

  /**
   * List all supported CAM intents
   */
  listIntents(): Array<{ intent: CamIntent; name: string; cycles: string[] }> {
    return (Object.entries(INTENT_STRATEGY_NAMES) as Array<[CamIntent, string]>).map(
      ([intent, name]) => ({
        intent,
        name,
        cycles: INTENT_TO_CYCLE[intent] ?? [],
      })
    );
  }

  /**
   * List all supported target controllers
   */
  listControllers(): TargetController[] {
    return ["fanuc", "haas", "siemens", "heidenhain", "mazak", "okuma"];
  }

  /**
   * Get controller-specific feature matrix
   */
  controllerFeatures(controller: TargetController): {
    controller: TargetController;
    smoothing: Record<string, string>;
    coolant: Record<string, string>;
    safe_start: string;
  } {
    return {
      controller,
      smoothing: SMOOTHING_CODES[controller],
      coolant: COOLANT_CODES[controller],
      safe_start: SAFE_STARTS[controller],
    };
  }

  /**
   * Translate the same intent across ALL controllers for comparison
   */
  compareControllers(input: Omit<PortabilityInput, "machine"> & { axis_count?: 3 | 4 | 5 }): {
    intent: CamIntent;
    controllers: Array<{
      controller: TargetController;
      rpm: number;
      feed_rate: number;
      smoothing: string;
      coolant: string;
      gcode_preview?: string;
    }>;
  } {
    const controllers: TargetController[] = ["fanuc", "haas", "siemens", "heidenhain", "mazak", "okuma"];
    return {
      intent: input.intent,
      controllers: controllers.map(ctrl => {
        const result = this.translate({
          ...input,
          machine: { controller: ctrl, axis_count: input.axis_count ?? 3 },
        });
        return {
          controller: ctrl,
          rpm: result.parameters.rpm,
          feed_rate: result.parameters.feed_rate,
          smoothing: result.parameters.smoothing_mode ?? "none",
          coolant: result.parameters.coolant,
          gcode_preview: result.gcode?.split("\n").slice(0, 5).join("\n"),
        };
      }),
    };
  }

  /**
   * Get material-specific recommendations using ISO knowledge
   */
  materialRecommendation(material: MaterialContext): {
    iso_group: string;
    cutting_speed: number;
    feed_per_tooth: number;
    stepdown_factor: number;
    stepover_factor: number;
    coolant: string;
    warnings: string[];
  } {
    const iso = resolveISOGroup(material);
    const data = ISO_CUTTING_DEFAULTS[iso] ?? ISO_CUTTING_DEFAULTS.P;
    const warnings: string[] = [];
    if (iso === "S") warnings.push("Superalloy: reduce speed 30-50% for interrupted cuts");
    if (iso === "H") warnings.push("Hardened: use ceramic or CBN inserts above 55 HRC");
    if (iso === "N" && material.name.toLowerCase().includes("7075")) {
      warnings.push("7075-T6: high-speed OK but watch for built-up edge at low speeds");
    }
    return {
      iso_group: iso,
      cutting_speed: data.vc,
      feed_per_tooth: data.fz,
      stepdown_factor: data.ap_factor,
      stepover_factor: data.ae_factor,
      coolant: data.coolant,
      warnings,
    };
  }

  /**
   * Get controller dialect details from manual extraction
   * Source: Mazak EIA Programming Manual (INTEGREX IV), Okuma OSP-P200L Programming Manual
   */
  controllerDialect(controller: TargetController): {
    controller: TargetController;
    source_manual: string;
    coord_system_set: string;
    feed_per_min: string;
    feed_per_rev: string;
    abs_inc: string;
    threading: string;
    peck_drill: string;
    tapping: string;
    boring: string;
    cycle_cancel: string;
    c_axis_mode?: string;
    notes: string[];
  } {
    const dialects: Record<TargetController, ReturnType<typeof this.controllerDialect>> = {
      fanuc: {
        controller: "fanuc", source_manual: "Fanuc 0i/30i Series",
        coord_system_set: "G92", feed_per_min: "G94", feed_per_rev: "G95",
        abs_inc: "G90/G91", threading: "G32/G76", peck_drill: "G83",
        tapping: "G84", boring: "G85", cycle_cancel: "G80", notes: ["Industry standard reference dialect"],
      },
      haas: {
        controller: "haas", source_manual: "Haas NGC Mill/Lathe Programming",
        coord_system_set: "G92", feed_per_min: "G94", feed_per_rev: "G95",
        abs_inc: "G90/G91", threading: "G32/G76", peck_drill: "G83",
        tapping: "G84", boring: "G85", cycle_cancel: "G80", notes: ["Fanuc-compatible with Haas-specific M-codes (M88=TSC)"],
      },
      siemens: {
        controller: "siemens", source_manual: "Sinumerik 840D sl Programming",
        coord_system_set: "TRANS/ATRANS", feed_per_min: "G94", feed_per_rev: "G95",
        abs_inc: "G90/G91", threading: "G33/CYCLE97", peck_drill: "CYCLE83",
        tapping: "CYCLE84", boring: "CYCLE85/86", cycle_cancel: "MCALL", notes: ["Uses CYCLE macros, not G-code canned cycles"],
      },
      heidenhain: {
        controller: "heidenhain", source_manual: "Heidenhain TNC 640 Programming",
        coord_system_set: "CYCL DEF 247", feed_per_min: "F (mm/min)", feed_per_rev: "FU (mm/rev)",
        abs_inc: "Absolute/Incremental keywords", threading: "CYCL DEF 262", peck_drill: "CYCL DEF 200/203",
        tapping: "CYCL DEF 207", boring: "CYCL DEF 201/202", cycle_cancel: "CYCL DEF END",
        notes: ["Conversational format, not ISO G-code"],
      },
      mazak: {
        controller: "mazak", source_manual: "Mazak EIA Programming Manual for Mazatrol Matrix (INTEGREX IV)",
        coord_system_set: "G50 (Series T) / G92 (Series M)", feed_per_min: "G98 (T) / G94 (M)",
        feed_per_rev: "G99 (T) / G95 (M)", abs_inc: "U/W incremental (T) / G90/G91 (M)",
        threading: "G32/G76 (T) / G33/G276 (M)", peck_drill: "G83 (T) / G283 (M)",
        tapping: "G84 (T) / G284 (M)", boring: "G85 (T) / G285 (M)",
        cycle_cancel: "G80", c_axis_mode: "M203/M3 spindle select (INTEGREX e-Series)",
        notes: [
          "Dual dialect: Series T (turning) vs Series M (milling) codes",
          "INTEGREX e-Series uses M203 for turning spindle, M3 for milling spindle",
          "G130 Tornado Tapping (Mazak-specific)",
          "G234.1/G235/G236/G237.1 hole pattern cycles",
          "Mirror function G50.1/G51.1 needed when B-axis at 180°",
        ],
      },
      okuma: {
        controller: "okuma", source_manual: "Okuma OSP-P200L Programming Manual (3rd Edition)",
        coord_system_set: "G50 (zero shift — NOT Fanuc G50)", feed_per_min: "G94",
        feed_per_rev: "G95", abs_inc: "G90/G91",
        threading: "G31/G33/G71 (compound)", peck_drill: "G183 (C-axis compound)",
        tapping: "G184/G178 (sync)", boring: "G182/G189",
        cycle_cancel: "G180 (NOT G80)", c_axis_mode: "M109 (spindle) / M110 (C-axis) / M147 (clamp)",
        notes: [
          "G180 for cycle cancel (NOT G80 like Fanuc)",
          "G50 means zero shift (Fanuc uses it for coord system set)",
          "G183-G190 for C-axis compound drilling/milling cycles",
          "Thread infeed patterns: M32 (straight), M33 (zigzag), M34 (straight reversed)",
          "C-axis: M110 enter, M109 return to spindle, M146/M147 unclamp/clamp",
          "LAP auto-programming: G80-G87 for bar/copy/finish turning cycles",
        ],
      },
    };
    return dialects[controller];
  }

  /** Stats */
  stats(): {
    intents: number;
    controllers: number;
    iso_groups: number;
    cycle_mappings: number;
    gcode_operations: number;
  } {
    return {
      intents: Object.keys(INTENT_TO_CYCLE).length,
      controllers: 6,
      iso_groups: Object.keys(ISO_CUTTING_DEFAULTS).length,
      cycle_mappings: Object.values(INTENT_TO_CYCLE).flat().length,
      gcode_operations: Object.keys(INTENT_TO_GCODE_OP).length,
    };
  }
}

// ── Cycle Defaults Cache (mirrors HyperMillCycleDefaultsEngine data) ────────
// We duplicate minimal data here to avoid circular imports.
// The full CycleDefaultsEngine remains the source of truth.

interface CycleDefaultsRef {
  machining: {
    clearancePlane?: number | string;
    safeDist?: number | string;
    stepdown?: number | string;
    stepover?: number | string;
    allowance?: number | string;
    tolerance?: number | string;
  };
  collision: {
    holderClearance?: number | string;
    shankClearance?: number | string;
  };
  macros: {
    approachLength?: number | string;
    retractLength?: number | string;
    approachClearSide?: number | string;
    retractClearSide?: number | string;
  };
}

const CYCLE_DEFAULTS_CACHE: Record<string, CycleDefaultsRef> = {
  hmSlf3: {
    machining: { clearancePlane: 100, stepdown: 0.5, stepover: "T:Dia*0.3", allowance: 0, tolerance: "mtol" },
    collision: { holderClearance: 0.25, shankClearance: 0.05 },
    macros: { approachLength: "T:Dia*0.35", retractLength: "T:Dia*0.35", approachClearSide: "T:Rad*0.25" },
  },
  hmOrm: {
    machining: { clearancePlane: 50, stepdown: 0.3, stepover: 0.3, allowance: 0, tolerance: "mtol" },
    collision: { holderClearance: 0.25, shankClearance: 0.05 },
    macros: {},
  },
  hmRcm: {
    machining: { clearancePlane: 50, stepdown: 0.5, stepover: 0.3, allowance: 0, tolerance: "mtol" },
    collision: { holderClearance: 0.25, shankClearance: 0.05 },
    macros: {},
  },
  hmCrt: {
    machining: { clearancePlane: 5, allowance: 0, tolerance: "mtol" },
    collision: {},
    macros: {},
  },
  hmCft: {
    machining: { clearancePlane: 15, allowance: 0, tolerance: "mtol" },
    collision: {},
    macros: {},
  },
  hmPcirc: {
    machining: { clearancePlane: 100, stepdown: 0.5, allowance: 0 },
    collision: {},
    macros: {},
  },
  hmForm: {
    machining: { clearancePlane: 100, stepdown: 1, allowance: 0, tolerance: "mtol" },
    collision: { holderClearance: 0.25, shankClearance: 0.05 },
    macros: {},
  },
  hmDril: {
    machining: { clearancePlane: 50, safeDist: 3 },
    collision: {},
    macros: {},
  },
  hmTrnr: {
    machining: { clearancePlane: 15, stepdown: 1, allowance: 0, tolerance: "mtol" },
    collision: { holderClearance: 0.25 },
    macros: {},
  },
  hmTrnf: {
    machining: { clearancePlane: 15, allowance: 0, tolerance: "mtol" },
    collision: {},
    macros: {},
  },
  hmTrnp: {
    machining: { clearancePlane: 15 },
    collision: {},
    macros: {},
  },
  hmCpt: {
    machining: { clearancePlane: 15, allowance: 0 },
    collision: {},
    macros: {},
  },
  hmGrvf: {
    machining: { clearancePlane: 15, allowance: 0, tolerance: "mtol" },
    collision: {},
    macros: {},
  },
  hmGrvp: {
    machining: { clearancePlane: 15, allowance: 0, tolerance: "mtol" },
    collision: {},
    macros: {},
  },
  hmGrvt: {
    machining: { clearancePlane: 15, tolerance: "mtol" },
    collision: {},
    macros: {},
  },
  hmFgvt: {
    machining: { clearancePlane: 15, tolerance: "mtol" },
    collision: {},
    macros: {},
  },
  hmf1x5: {
    machining: { clearancePlane: 50, stepdown: 10, stepover: 10, allowance: 0, tolerance: "mtol" },
    collision: { holderClearance: 0.25, shankClearance: 0.05 },
    macros: { approachLength: "T:Dia*0.35", retractLength: "T:Dia*0.35", approachClearSide: "T:Rad*0.25" },
  },
  hmf2x5: {
    machining: { clearancePlane: 50, stepdown: 10, stepover: 10, allowance: 0, tolerance: "mtol" },
    collision: { holderClearance: 0.25, shankClearance: 0.05 },
    macros: { approachLength: "T:Dia*0.35", retractLength: "T:Dia*0.35" },
  },
  hmPbX3: {
    machining: { tolerance: "mtol*0.7" },
    collision: { holderClearance: 0.25, shankClearance: 0.25 },
    macros: {},
  },
  hmEcmp: {
    machining: { clearancePlane: 100, tolerance: "mtol*0.7" },
    collision: { holderClearance: 0.25, shankClearance: 0.25 },
    macros: {},
  },
  hmHcmp: {
    machining: { clearancePlane: 100, tolerance: "mtol*0.7" },
    collision: { holderClearance: 0.25, shankClearance: 0.25 },
    macros: {},
  },
  hmEdm2: {
    machining: { clearancePlane: 5, stepdown: 10, stepover: 10, allowance: 0, tolerance: "mtol*0.05" },
    collision: {},
    macros: {},
  },
};

export const camKnowledgePortabilityEngine = new CamKnowledgePortabilityEngine();
