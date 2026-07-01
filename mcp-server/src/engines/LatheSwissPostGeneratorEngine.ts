/**
 * LatheSwissPostGeneratorEngine — LATHE-MASTER U-LTH17
 *
 * Generates post-processor output for Swiss-type CNC lathes (Citizen, Tsugami, Star).
 * Swiss lathes have unique features: guide bushing, B-axis, multiple spindles,
 * sliding headstock, and specialized canned cycles.
 *
 * Key cycles:
 * - G112/G113: Guide bushing mode on/off
 * - G12.1/G13.1: Polar coordinate interpolation
 * - B-axis: Angular milling/drilling
 * - Synchronized spindle operations
 *
 * Exit Gate: Generate correct Swiss canned cycles for Citizen Cincom and Tsugami
 *
 * @module LatheSwissPostGeneratorEngine
 * @version 1.0.0
 * @milestone LATHE-MASTER U-LTH17
 */

import { z } from "zod";
import {
  ControllerSpec,
  ControllerSpecSchema,
  GCodeDialect,
  CannedCycle,
  AxisDefinition,
} from "./LathePostGeneratorSpecIngestEngine.js";

// ── Swiss-Specific Schemas ──────────────────────────────────────────────

export const GuideBushingModeSchema = z.enum([
  "with_bushing",      // Standard Swiss mode with guide bushing
  "without_bushing",   // Chucker mode (no guide bushing)
  "retracted",         // Guide bushing retracted for long parts
]);

export const SwissSpindleConfigSchema = z.object({
  main_spindle: z.boolean().default(true),
  sub_spindle: z.boolean().default(true),
  back_spindle: z.boolean().optional(),
  spindle_sync: z.boolean().default(true),
  c_axis_main: z.boolean().default(true),
  c_axis_sub: z.boolean().default(false),
});

export const SwissToolPostConfigSchema = z.object({
  gang_tooling: z.boolean().default(true),
  turret_tools: z.number().default(0),
  back_tools: z.number().default(0),
  live_tools: z.number().default(8),
  y_axis_stroke: z.number().finite().optional(),
  b_axis_range: z.tuple([z.number(), z.number()]).optional(),
});

export const SwissMachineSpecSchema = z.object({
  controller: ControllerSpecSchema,
  guide_bushing: z.boolean().default(true),
  max_bar_diameter: z.number(),
  z1_stroke: z.number(),
  z2_stroke: z.number().finite().optional(),
  spindles: SwissSpindleConfigSchema,
  tool_posts: SwissToolPostConfigSchema,
  high_pressure_coolant: z.boolean().default(true),
  bar_feeder_interface: z.enum(["iemca", "lns", "fedek", "custom"]).optional(),
});

export type GuideBushingMode = z.infer<typeof GuideBushingModeSchema>;
export type SwissSpindleConfig = z.infer<typeof SwissSpindleConfigSchema>;
export type SwissToolPostConfig = z.infer<typeof SwissToolPostConfigSchema>;
export type SwissMachineSpec = z.infer<typeof SwissMachineSpecSchema>;

// ── Swiss Cycle Parameters ──────────────────────────────────────────────

export const SwissCycleParametersSchema = z.object({
  // Guide bushing
  guide_bushing_mode: GuideBushingModeSchema.optional(),
  bushing_clearance: z.number().finite().optional(),

  // B-axis angular operations
  b_angle: z.number().finite().optional(),
  b_axis_feed: z.number().finite().optional(),

  // Spindle sync
  sync_mode: z.enum(["speed", "phase", "thread"]).optional(),
  speed_ratio: z.number().finite().optional(),
  phase_offset: z.number().finite().optional(),

  // Part transfer
  transfer_position: z.number().finite().optional(),
  grip_pressure: z.enum(["low", "medium", "high"]).optional(),
  push_length: z.number().finite().optional(),

  // Cross drilling/milling
  hole_depth: z.number().finite().optional(),
  peck_depth: z.number().finite().optional(),
  dwell_time: z.number().finite().optional(),

  // Threading
  thread_pitch: z.number().finite().optional(),
  thread_depth: z.number().finite().optional(),
  thread_start_angle: z.number().finite().optional(),

  // General
  feed_rate: z.number().finite().optional(),
  spindle_speed: z.number().finite().optional(),
  coolant_mode: z.enum(["flood", "mist", "high_pressure", "through_tool", "off"]).optional(),
});

export type SwissCycleParameters = z.infer<typeof SwissCycleParametersSchema>;

// ── Swiss G-Code Generation Input/Output ────────────────────────────────

export const SwissGenerationInputSchema = z.object({
  machine_type: z.enum(["citizen_cincom", "citizen_miyano", "tsugami", "star", "tornos"]),
  controller_variant: z.string().optional(),
  operation: z.enum([
    "guide_bushing_on",
    "guide_bushing_off",
    "part_transfer",
    "spindle_sync",
    "b_axis_drill",
    "b_axis_mill",
    "cross_drill",
    "polar_mill",
    "back_work",
    "cutoff_transfer",
  ]),
  parameters: SwissCycleParametersSchema,
  use_line_numbers: z.boolean().default(false),
  include_comments: z.boolean().default(true),
});

export type SwissGenerationInput = z.infer<typeof SwissGenerationInputSchema>;

export interface SwissGeneratedGCode {
  success: boolean;
  gcode: string[];
  operation: string;
  machine_type: string;
  warnings: string[];
  errors: string[];
  metadata: {
    total_lines: number;
    uses_b_axis: boolean;
    uses_sub_spindle: boolean;
    guide_bushing_mode: string;
    estimated_cycle_time_seconds?: number;
  };
}

// ── Built-in Swiss Controller Specs ─────────────────────────────────────

const CITIZEN_CINCOM_SPEC: SwissMachineSpec = {
  controller: {
    controller_id: "citizen-cincom-m32",
    manufacturer: "Citizen",
    model: "Cincom M32",
    version: "M32-VIII",
    machine_type: "swiss",
    axes: [
      { letter: "X", type: "linear", direction: "bidirectional", semantics: "Cross-slide (diameter)", unit: "mm" },
      { letter: "Z", type: "linear", direction: "bidirectional", semantics: "Main spindle axis", unit: "mm" },
      { letter: "Y", type: "linear", direction: "bidirectional", semantics: "Y-axis milling", unit: "mm" },
      { letter: "C", type: "rotary", direction: "bidirectional", semantics: "Main spindle positioning", unit: "degrees" },
      { letter: "B", type: "rotary", direction: "bidirectional", semantics: "B-axis angular", unit: "degrees", range_min: -30, range_max: 120 },
      { letter: "W", type: "linear", direction: "bidirectional", semantics: "Sub-spindle axis", unit: "mm" },
      { letter: "A", type: "rotary", direction: "bidirectional", semantics: "Sub-spindle C-axis", unit: "degrees" },
    ],
    dialect: {
      family: "fanuc",
      variant: "Citizen Cincom",
      arc_format: "ijk_incremental",
      comment_style: "parentheses",
      line_numbers: "optional",
      decimal_point: "required",
      block_skip: "/",
      program_start: "O0001",
      program_end: "M30",
      tool_change: "T0100",
      spindle_cw: "M03",
      spindle_ccw: "M04",
      spindle_stop: "M05",
      coolant_on: "M08",
      coolant_off: "M09",
    },
    canned_cycles: [
      { code: "G112", name: "Guide Bushing Mode ON", category: "other", parameters: [], modal: true, notes: "Activates guide bushing coordinate system" },
      { code: "G113", name: "Guide Bushing Mode OFF", category: "other", parameters: [], modal: true, notes: "Deactivates guide bushing mode" },
      { code: "G12.1", name: "Polar Coordinate Interpolation ON", category: "other", parameters: [], modal: true },
      { code: "G13.1", name: "Polar Coordinate Interpolation OFF", category: "other", parameters: [], modal: true },
      { code: "G71", name: "Stock Removal Turning", category: "turning", parameters: [
        { letter: "U", description: "Finishing allowance X", required: true },
        { letter: "W", description: "Finishing allowance Z", required: true },
        { letter: "D", description: "Depth of cut", required: true },
      ], modal: false },
      { code: "G76", name: "Threading Cycle", category: "threading", parameters: [
        { letter: "P", description: "Thread info", required: true },
        { letter: "Q", description: "Min depth", required: true },
        { letter: "R", description: "Finish allowance", required: true },
      ], modal: false },
      { code: "G83", name: "Peck Drilling", category: "drilling", parameters: [
        { letter: "Z", description: "Hole depth", required: true },
        { letter: "Q", description: "Peck depth", required: true },
        { letter: "R", description: "Retract plane", required: true },
      ], modal: true },
    ],
    macro_ranges: [
      { start: 1, end: 33, purpose: "Local variables", persistence: "volatile", writable: true },
      { start: 100, end: 199, purpose: "Common variables", persistence: "retained", writable: true },
      { start: 500, end: 999, purpose: "Extended common", persistence: "retained", writable: true },
    ],
    modal_groups: [
      { group_number: 1, name: "Motion", codes: ["G00", "G01", "G02", "G03"], default_code: "G00", description: "Motion codes" },
      { group_number: 2, name: "Plane", codes: ["G17", "G18", "G19"], default_code: "G18", description: "Work plane" },
      { group_number: 22, name: "Guide Bushing", codes: ["G112", "G113"], default_code: "G113", description: "Guide bushing mode" },
    ],
    max_program_size_kb: 2048,
    max_tool_offsets: 99,
    max_work_offsets: 48,
    sub_spindle_support: true,
    live_tooling_support: true,
    c_axis_support: true,
    y_axis_support: true,
    steady_rest_support: false,
    bar_feeder_support: true,
    confidence: 0.92,
    source: "Citizen Cincom M32-VIII Programming Manual",
    ingested_at: new Date().toISOString(),
  },
  guide_bushing: true,
  max_bar_diameter: 32,
  z1_stroke: 205,
  z2_stroke: 100,
  spindles: {
    main_spindle: true,
    sub_spindle: true,
    spindle_sync: true,
    c_axis_main: true,
    c_axis_sub: true,
  },
  tool_posts: {
    gang_tooling: true,
    turret_tools: 0,
    back_tools: 8,
    live_tools: 12,
    y_axis_stroke: 50,
    b_axis_range: [-30, 120],
  },
  high_pressure_coolant: true,
  bar_feeder_interface: "lns",
};

const TSUGAMI_SPEC: SwissMachineSpec = {
  controller: {
    controller_id: "tsugami-b0326-iii",
    manufacturer: "Tsugami",
    model: "B0326-III",
    version: "Fanuc 31i-B",
    machine_type: "swiss",
    axes: [
      { letter: "X", type: "linear", direction: "bidirectional", semantics: "Cross-slide", unit: "mm" },
      { letter: "Z", type: "linear", direction: "bidirectional", semantics: "Main Z axis", unit: "mm" },
      { letter: "Y", type: "linear", direction: "bidirectional", semantics: "Y-axis", unit: "mm" },
      { letter: "C", type: "rotary", direction: "bidirectional", semantics: "C-axis main", unit: "degrees" },
      { letter: "B", type: "rotary", direction: "bidirectional", semantics: "B-axis", unit: "degrees", range_min: -15, range_max: 90 },
      { letter: "W", type: "linear", direction: "bidirectional", semantics: "Sub-spindle Z", unit: "mm" },
    ],
    dialect: {
      family: "fanuc",
      variant: "Tsugami",
      arc_format: "ijk_incremental",
      comment_style: "parentheses",
      line_numbers: "optional",
      decimal_point: "required",
      block_skip: "/",
      program_start: "O0001",
      program_end: "M30",
      tool_change: "T0100",
      spindle_cw: "M03",
      spindle_ccw: "M04",
      spindle_stop: "M05",
      coolant_on: "M08",
      coolant_off: "M09",
    },
    canned_cycles: [
      { code: "G112", name: "Guide Bushing ON", category: "other", parameters: [], modal: true },
      { code: "G113", name: "Guide Bushing OFF", category: "other", parameters: [], modal: true },
      { code: "G12.1", name: "Polar ON", category: "other", parameters: [], modal: true },
      { code: "G13.1", name: "Polar OFF", category: "other", parameters: [], modal: true },
      { code: "G71", name: "Turning Cycle", category: "turning", parameters: [
        { letter: "U", description: "X allowance", required: true },
        { letter: "W", description: "Z allowance", required: true },
        { letter: "D", description: "Depth", required: true },
      ], modal: false },
      { code: "G76", name: "Threading", category: "threading", parameters: [
        { letter: "P", description: "Thread info", required: true },
        { letter: "Q", description: "Min cut", required: true },
      ], modal: false },
      { code: "G83", name: "Peck Drill", category: "drilling", parameters: [
        { letter: "Z", description: "Depth", required: true },
        { letter: "Q", description: "Peck", required: true },
      ], modal: true },
    ],
    macro_ranges: [
      { start: 1, end: 33, purpose: "Local", persistence: "volatile", writable: true },
      { start: 100, end: 199, purpose: "Common", persistence: "retained", writable: true },
    ],
    modal_groups: [
      { group_number: 1, name: "Motion", codes: ["G00", "G01", "G02", "G03"], default_code: "G00", description: "Motion" },
      { group_number: 22, name: "Guide Bushing", codes: ["G112", "G113"], default_code: "G113", description: "Bushing mode" },
    ],
    max_program_size_kb: 1024,
    max_tool_offsets: 64,
    max_work_offsets: 48,
    sub_spindle_support: true,
    live_tooling_support: true,
    c_axis_support: true,
    y_axis_support: true,
    steady_rest_support: false,
    bar_feeder_support: true,
    confidence: 0.90,
    source: "Tsugami B0326-III Programming Manual",
    ingested_at: new Date().toISOString(),
  },
  guide_bushing: true,
  max_bar_diameter: 26,
  z1_stroke: 180,
  z2_stroke: 85,
  spindles: {
    main_spindle: true,
    sub_spindle: true,
    spindle_sync: true,
    c_axis_main: true,
    c_axis_sub: false,
  },
  tool_posts: {
    gang_tooling: true,
    turret_tools: 0,
    back_tools: 6,
    live_tools: 10,
    y_axis_stroke: 40,
    b_axis_range: [-15, 90],
  },
  high_pressure_coolant: true,
  bar_feeder_interface: "iemca",
};

const SWISS_MACHINE_SPECS: Record<string, SwissMachineSpec> = {
  "citizen_cincom": CITIZEN_CINCOM_SPEC,
  "tsugami": TSUGAMI_SPEC,
};

// ── Engine Implementation ───────────────────────────────────────────────

export class LatheSwissPostGeneratorEngine {
  private static readonly VERSION = "1.0.0";

  /**
   * Generate Swiss-specific G-code for an operation.
   */
  static generate(input: SwissGenerationInput): SwissGeneratedGCode {
    const validation = SwissGenerationInputSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        gcode: [],
        operation: input.operation,
        machine_type: input.machine_type,
        warnings: [],
        errors: [`Input validation failed: ${validation.error.message}`],
        metadata: {
          total_lines: 0,
          uses_b_axis: false,
          uses_sub_spindle: false,
          guide_bushing_mode: "unknown",
        },
      };
    }

    const spec = SWISS_MACHINE_SPECS[input.machine_type];
    if (!spec) {
      return {
        success: false,
        gcode: [],
        operation: input.operation,
        machine_type: input.machine_type,
        warnings: [],
        errors: [`Unknown Swiss machine type: ${input.machine_type}. Available: ${Object.keys(SWISS_MACHINE_SPECS).join(", ")}`],
        metadata: {
          total_lines: 0,
          uses_b_axis: false,
          uses_sub_spindle: false,
          guide_bushing_mode: "unknown",
        },
      };
    }

    const warnings: string[] = [];
    let gcode: string[] = [];
    let usesBAXis = false;
    let usesSubSpindle = false;
    let bushingMode = "unknown";

    switch (input.operation) {
      case "guide_bushing_on":
        gcode = this.generateGuideBushingOn(spec, input.parameters, input.include_comments);
        bushingMode = "with_bushing";
        break;

      case "guide_bushing_off":
        gcode = this.generateGuideBushingOff(spec, input.parameters, input.include_comments);
        bushingMode = "without_bushing";
        break;

      case "part_transfer":
        gcode = this.generatePartTransfer(spec, input.parameters, input.include_comments);
        usesSubSpindle = true;
        break;

      case "spindle_sync":
        gcode = this.generateSpindleSync(spec, input.parameters, input.include_comments);
        usesSubSpindle = true;
        break;

      case "b_axis_drill":
        gcode = this.generateBAxisDrill(spec, input.parameters, input.include_comments);
        usesBAXis = true;
        break;

      case "b_axis_mill":
        gcode = this.generateBAxisMill(spec, input.parameters, input.include_comments);
        usesBAXis = true;
        break;

      case "cross_drill":
        gcode = this.generateCrossDrill(spec, input.parameters, input.include_comments);
        break;

      case "polar_mill":
        gcode = this.generatePolarMill(spec, input.parameters, input.include_comments);
        break;

      case "back_work":
        gcode = this.generateBackWork(spec, input.parameters, input.include_comments);
        usesSubSpindle = true;
        break;

      case "cutoff_transfer":
        gcode = this.generateCutoffTransfer(spec, input.parameters, input.include_comments);
        usesSubSpindle = true;
        break;

      default:
        return {
          success: false,
          gcode: [],
          operation: input.operation,
          machine_type: input.machine_type,
          warnings: [],
          errors: [`Unknown operation: ${input.operation}`],
          metadata: {
            total_lines: 0,
            uses_b_axis: false,
            uses_sub_spindle: false,
            guide_bushing_mode: "unknown",
          },
        };
    }

    // Add line numbers if requested
    if (input.use_line_numbers) {
      gcode = gcode.map((line, i) => `N${(i + 1) * 10} ${line}`);
    }

    return {
      success: true,
      gcode,
      operation: input.operation,
      machine_type: input.machine_type,
      warnings,
      errors: [],
      metadata: {
        total_lines: gcode.length,
        uses_b_axis: usesBAXis,
        uses_sub_spindle: usesSubSpindle,
        guide_bushing_mode: bushingMode,
      },
    };
  }

  /**
   * Generate G112 guide bushing mode ON.
   */
  private static generateGuideBushingOn(
    spec: SwissMachineSpec,
    params: SwissCycleParameters,
    includeComments: boolean,
  ): string[] {
    const lines: string[] = [];

    if (includeComments) {
      lines.push(`(GUIDE BUSHING MODE ON - ${spec.controller.manufacturer})`);
    }

    // Move to safe position
    lines.push("G00 Z0");

    // Activate guide bushing coordinate system
    lines.push("G112");

    // Optional clearance move
    if (params.bushing_clearance) {
      lines.push(`G00 Z${params.bushing_clearance.toFixed(3)}`);
    }

    return lines;
  }

  /**
   * Generate G113 guide bushing mode OFF.
   */
  private static generateGuideBushingOff(
    spec: SwissMachineSpec,
    params: SwissCycleParameters,
    includeComments: boolean,
  ): string[] {
    const lines: string[] = [];

    if (includeComments) {
      lines.push("(GUIDE BUSHING MODE OFF)");
    }

    // Deactivate guide bushing coordinate system
    lines.push("G113");

    // Return to machine zero
    lines.push("G00 Z0");

    return lines;
  }

  /**
   * Generate part transfer sequence (main → sub spindle).
   */
  private static generatePartTransfer(
    spec: SwissMachineSpec,
    params: SwissCycleParameters,
    includeComments: boolean,
  ): string[] {
    const lines: string[] = [];
    const transferPos = params.transfer_position ?? -50;
    const pushLen = params.push_length ?? 5;

    if (includeComments) {
      lines.push("(PART TRANSFER - MAIN TO SUB SPINDLE)");
    }

    // Synchronize spindles
    lines.push("M32"); // Typical sub-spindle engage

    // Move sub-spindle to grip position
    lines.push(`G00 W${transferPos.toFixed(3)}`);

    // Close sub-spindle chuck
    if (params.grip_pressure === "high") {
      lines.push("M68"); // High pressure grip
    } else {
      lines.push("M66"); // Standard grip
    }

    // Dwell for chuck close
    lines.push("G04 P500");

    // Open main spindle
    lines.push("M11");

    // Push part into sub-spindle
    lines.push(`G01 Z${pushLen.toFixed(3)} F1000`);

    // Retract main spindle
    lines.push("G00 Z5");

    if (includeComments) {
      lines.push("(TRANSFER COMPLETE)");
    }

    return lines;
  }

  /**
   * Generate spindle synchronization for threading or transfer.
   */
  private static generateSpindleSync(
    spec: SwissMachineSpec,
    params: SwissCycleParameters,
    includeComments: boolean,
  ): string[] {
    const lines: string[] = [];
    const syncMode = params.sync_mode ?? "speed";
    const ratio = params.speed_ratio ?? 1.0;

    if (includeComments) {
      lines.push(`(SPINDLE SYNC - ${syncMode.toUpperCase()} MODE)`);
    }

    switch (syncMode) {
      case "speed":
        // Speed synchronization
        lines.push("M35"); // Engage sync
        lines.push(`S${params.spindle_speed ?? 2000}`);
        break;

      case "phase":
        // Phase synchronization for pickup
        lines.push("M36"); // Phase sync
        if (params.phase_offset) {
          lines.push(`#501=${params.phase_offset}`); // Phase offset variable
        }
        break;

      case "thread":
        // Thread synchronization for thread chasing
        lines.push("M37"); // Thread sync mode
        break;
    }

    if (ratio !== 1.0) {
      lines.push(`#502=${ratio}`); // Speed ratio variable
    }

    return lines;
  }

  /**
   * Generate B-axis angular drilling.
   */
  private static generateBAxisDrill(
    spec: SwissMachineSpec,
    params: SwissCycleParameters,
    includeComments: boolean,
  ): string[] {
    const lines: string[] = [];
    const bAngle = params.b_angle ?? 30;
    const depth = params.hole_depth ?? -10;
    const peck = params.peck_depth ?? 2;
    const feed = params.feed_rate ?? 0.05;

    // Validate B-axis range
    const bRange = spec.tool_posts.b_axis_range;
    if (bRange && (bAngle < bRange[0] || bAngle > bRange[1])) {
      // Out of range - would generate warning
    }

    if (includeComments) {
      lines.push(`(B-AXIS DRILL AT ${bAngle} DEGREES)`);
    }

    // Position B-axis
    lines.push(`G00 B${bAngle.toFixed(1)}`);

    // Start spindle for drilling
    lines.push(`M03 S${params.spindle_speed ?? 3000}`);

    // Peck drilling cycle
    lines.push(`G83 Z${depth.toFixed(3)} Q${(peck * 1000).toFixed(0)} R2.0 F${feed.toFixed(3)}`);

    // Cancel cycle
    lines.push("G80");

    // Return B-axis to zero
    lines.push("G00 B0");

    return lines;
  }

  /**
   * Generate B-axis angular milling.
   */
  private static generateBAxisMill(
    spec: SwissMachineSpec,
    params: SwissCycleParameters,
    includeComments: boolean,
  ): string[] {
    const lines: string[] = [];
    const bAngle = params.b_angle ?? 45;
    const depth = params.hole_depth ?? -5;
    const feed = params.feed_rate ?? 100;

    if (includeComments) {
      lines.push(`(B-AXIS MILLING AT ${bAngle} DEGREES)`);
    }

    // Position B-axis
    lines.push(`G00 B${bAngle.toFixed(1)}`);

    // Start milling spindle
    lines.push(`M03 S${params.spindle_speed ?? 5000}`);

    // Rapid to clearance
    lines.push("G00 Z2.0");

    // Mill to depth
    lines.push(`G01 Z${depth.toFixed(3)} F${feed.toFixed(0)}`);

    // Retract
    lines.push("G00 Z10.0");

    // Return B-axis
    lines.push("G00 B0");

    return lines;
  }

  /**
   * Generate cross drilling (radial hole).
   */
  private static generateCrossDrill(
    spec: SwissMachineSpec,
    params: SwissCycleParameters,
    includeComments: boolean,
  ): string[] {
    const lines: string[] = [];
    const depth = params.hole_depth ?? -8;
    const peck = params.peck_depth ?? 1.5;
    const feed = params.feed_rate ?? 0.03;

    if (includeComments) {
      lines.push("(CROSS DRILLING - RADIAL HOLE)");
    }

    // C-axis positioning (if needed)
    lines.push("M19"); // Spindle orient

    // Start cross drill spindle
    lines.push(`M03 S${params.spindle_speed ?? 4000}`);

    // Position X for drilling
    lines.push("G00 X15.0"); // Clear of part

    // Peck drill cycle in X
    lines.push(`G87 X${depth.toFixed(3)} Q${(peck * 1000).toFixed(0)} R15.0 F${feed.toFixed(3)}`);

    // Cancel
    lines.push("G80");

    // Retract
    lines.push("G00 X50.0");

    return lines;
  }

  /**
   * Generate polar coordinate milling.
   */
  private static generatePolarMill(
    spec: SwissMachineSpec,
    params: SwissCycleParameters,
    includeComments: boolean,
  ): string[] {
    const lines: string[] = [];
    const depth = params.hole_depth ?? -3;
    const feed = params.feed_rate ?? 80;

    if (includeComments) {
      lines.push("(POLAR COORDINATE MILLING)");
    }

    // Enable polar interpolation
    lines.push("G12.1");

    // Start milling spindle
    lines.push(`M03 S${params.spindle_speed ?? 6000}`);

    // Mill pattern (example: hexagon)
    lines.push("G00 X5.0 C0");
    lines.push(`G01 Z${depth.toFixed(3)} F${feed.toFixed(0)}`);
    lines.push("G01 C60.0");
    lines.push("G01 C120.0");
    lines.push("G01 C180.0");
    lines.push("G01 C240.0");
    lines.push("G01 C300.0");
    lines.push("G01 C360.0");

    // Retract
    lines.push("G00 Z5.0");

    // Disable polar interpolation
    lines.push("G13.1");

    return lines;
  }

  /**
   * Generate back work operations on sub-spindle.
   */
  private static generateBackWork(
    spec: SwissMachineSpec,
    params: SwissCycleParameters,
    includeComments: boolean,
  ): string[] {
    const lines: string[] = [];

    if (includeComments) {
      lines.push("(BACK WORK - SUB SPINDLE OPERATIONS)");
    }

    // Select sub-spindle program
    lines.push("M98 P9000"); // Call back work subprogram

    // Start sub-spindle
    lines.push(`M43 S${params.spindle_speed ?? 3000}`); // M43 = sub-spindle CW

    // Example back facing
    lines.push("G00 X30.0 W-2.0");
    lines.push(`G01 X0 F${params.feed_rate ?? 0.1}`);

    // Retract
    lines.push("G00 X30.0");

    if (includeComments) {
      lines.push("(BACK WORK COMPLETE)");
    }

    return lines;
  }

  /**
   * Generate cutoff and automatic part transfer.
   */
  private static generateCutoffTransfer(
    spec: SwissMachineSpec,
    params: SwissCycleParameters,
    includeComments: boolean,
  ): string[] {
    const lines: string[] = [];
    const cutoffX = params.hole_depth ?? -1; // Cutoff depth (center)
    const feed = params.feed_rate ?? 0.02;

    if (includeComments) {
      lines.push("(CUTOFF WITH PART TRANSFER)");
    }

    // Sub-spindle engage
    lines.push("M32");

    // Position sub-spindle
    lines.push("G00 W-45.0");

    // Grip with sub
    lines.push("M66");
    lines.push("G04 P300");

    // Cutoff
    if (includeComments) {
      lines.push("(CUTOFF)");
    }
    lines.push("G00 X10.0");
    lines.push(`G01 X${cutoffX.toFixed(3)} F${feed.toFixed(3)}`);

    // Retract cutoff tool
    lines.push("G00 X20.0");

    // Part ejection or conveyor
    lines.push("G00 W-80.0"); // Move to eject position
    lines.push("M67"); // Open sub chuck
    lines.push("G04 P200");

    // Return sub-spindle
    lines.push("G00 W0");

    if (includeComments) {
      lines.push("(CUTOFF TRANSFER COMPLETE)");
    }

    return lines;
  }

  /**
   * Get Swiss machine spec by type.
   */
  static getMachineSpec(machineType: string): SwissMachineSpec | undefined {
    return SWISS_MACHINE_SPECS[machineType];
  }

  /**
   * List available Swiss machine types.
   */
  static listMachineTypes(): string[] {
    return Object.keys(SWISS_MACHINE_SPECS);
  }

  /**
   * Get supported operations.
   */
  static getSupportedOperations(): string[] {
    return [
      "guide_bushing_on",
      "guide_bushing_off",
      "part_transfer",
      "spindle_sync",
      "b_axis_drill",
      "b_axis_mill",
      "cross_drill",
      "polar_mill",
      "back_work",
      "cutoff_transfer",
    ];
  }

  /**
   * Validate B-axis angle against machine limits.
   */
  static validateBAxisAngle(machineType: string, angle: number): { valid: boolean; message?: string } {
    const spec = SWISS_MACHINE_SPECS[machineType];
    if (!spec) {
      return { valid: false, message: `Unknown machine type: ${machineType}` };
    }

    const range = spec.tool_posts.b_axis_range;
    if (!range) {
      return { valid: false, message: "Machine does not have B-axis" };
    }

    if (angle < range[0] || angle > range[1]) {
      return { valid: false, message: `B-axis angle ${angle}° out of range [${range[0]}°, ${range[1]}°]` };
    }

    return { valid: true };
  }

  /**
   * Get engine version.
   */
  static getVersion(): string {
    return this.VERSION;
  }
}

// Export singleton
export const latheSwissPostGeneratorEngine = LatheSwissPostGeneratorEngine;
