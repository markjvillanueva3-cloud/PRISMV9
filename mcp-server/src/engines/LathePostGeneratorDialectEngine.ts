/**
 * LathePostGeneratorDialectEngine — LATHE-MASTER U-LTH16
 *
 * Given a ControllerSpec from U-LTH15, generates dialect-specific G-code
 * templates for lathe canned cycles (turning, threading, drilling).
 *
 * Key cycles: G71 (rough turning), G76 (threading), G83 (peck drilling)
 * Supports: Fanuc, Okuma, Mitsubishi dialects with correct parameter ordering
 *
 * Exit Gate: Generates correct G71/G76/G83 syntax for Fanuc/Okuma/Mitsubishi
 *
 * @module LathePostGeneratorDialectEngine
 * @version 1.0.0
 * @milestone LATHE-MASTER U-LTH16
 */

import { z } from "zod";
import {
  ControllerSpec,
  CannedCycle,
  GCodeDialect,
  lathePostGeneratorSpecIngestEngine,
} from "./LathePostGeneratorSpecIngestEngine.js";

// ── Zod Schemas ─────────────────────────────────────────────────────────

export const CycleParametersSchema = z.object({
  // G71 Stock Removal parameters
  depth_of_cut: z.number().finite().optional(),
  finish_allowance_x: z.number().finite().optional(),
  finish_allowance_z: z.number().finite().optional(),
  profile_start_block: z.number().finite().optional(),
  profile_end_block: z.number().finite().optional(),

  // G76 Threading parameters
  thread_pitch: z.number().finite().optional(),
  thread_depth: z.number().finite().optional(),
  thread_angle: z.number().finite().optional(),
  first_cut_depth: z.number().finite().optional(),
  min_depth_per_pass: z.number().finite().optional(),
  finish_allowance: z.number().finite().optional(),
  number_of_passes: z.number().finite().optional(),
  thread_start_x: z.number().finite().optional(),
  thread_start_z: z.number().finite().optional(),
  thread_end_x: z.number().finite().optional(),
  thread_end_z: z.number().finite().optional(),

  // G83 Peck Drilling parameters
  hole_depth: z.number().finite().optional(),
  peck_depth: z.number().finite().optional(),
  retract_plane: z.number().finite().optional(),
  feed_rate: z.number().finite().optional(),

  // General
  rapid_plane: z.number().finite().optional(),
  spindle_speed: z.number().finite().optional(),
});

export type CycleParameters = z.infer<typeof CycleParametersSchema>;

export const DialectGenerationInputSchema = z.object({
  controller_id: z.string(),
  cycle_code: z.string(),
  parameters: CycleParametersSchema,
  line_number_start: z.number().default(100),
  line_number_increment: z.number().default(10),
  include_comments: z.boolean().default(true),
  use_line_numbers: z.boolean().default(false),
});

export type DialectGenerationInput = z.infer<typeof DialectGenerationInputSchema>;

export interface GeneratedGCode {
  success: boolean;
  gcode: string[];
  dialect: string;
  cycle_code: string;
  controller_id: string;
  warnings: string[];
  errors: string[];
  metadata: {
    total_lines: number;
    estimated_cycle_time_seconds?: number;
    parameters_used: string[];
  };
}

// ── Dialect Templates ───────────────────────────────────────────────────

interface DialectTemplate {
  family: GCodeDialect["family"];
  g71_format: (params: CycleParameters, spec: ControllerSpec) => string[];
  g76_format: (params: CycleParameters, spec: ControllerSpec) => string[];
  g83_format: (params: CycleParameters, spec: ControllerSpec) => string[];
  comment_prefix: string;
  comment_suffix: string;
}

const FANUC_TEMPLATE: DialectTemplate = {
  family: "fanuc",
  comment_prefix: "(",
  comment_suffix: ")",

  g71_format: (params, _spec) => {
    const lines: string[] = [];
    const U = params.finish_allowance_x ?? 0.5;
    const W = params.finish_allowance_z ?? 0.2;
    const D = (params.depth_of_cut ?? 2.0) * 1000; // Fanuc uses microns
    const P = params.profile_start_block ?? 100;
    const Q = params.profile_end_block ?? 200;

    // Fanuc G71 Type II format (two-line)
    lines.push(`G71 U${D.toFixed(0)} R1.0`);
    lines.push(`G71 P${P} Q${Q} U${U.toFixed(3)} W${W.toFixed(3)} F${params.feed_rate ?? 0.25}`);

    return lines;
  },

  g76_format: (params, _spec) => {
    const lines: string[] = [];
    const passes = params.number_of_passes ?? 4;
    const angle = params.thread_angle ?? 60;
    const finish = params.finish_allowance ?? 0.05;
    const minDepth = (params.min_depth_per_pass ?? 0.1) * 1000; // microns
    const firstDepth = (params.first_cut_depth ?? 0.4) * 1000; // microns
    const threadHeight = (params.thread_depth ?? 0.65) * 1000; // microns
    const pitch = params.thread_pitch ?? 1.5;
    const endX = params.thread_end_x ?? 20.0;
    const endZ = params.thread_end_z ?? -30.0;

    // Fanuc G76 compound format
    // P: mmaarrr (passes, angle, runout)
    const pValue = `${passes.toString().padStart(2, "0")}${angle.toString().padStart(2, "0")}00`;

    lines.push(`G76 P${pValue} Q${minDepth.toFixed(0)} R${finish.toFixed(3)}`);
    lines.push(`G76 X${endX.toFixed(3)} Z${endZ.toFixed(3)} P${threadHeight.toFixed(0)} Q${firstDepth.toFixed(0)} F${pitch.toFixed(3)}`);

    return lines;
  },

  g83_format: (params, _spec) => {
    const lines: string[] = [];
    const Z = params.hole_depth ?? -25.0;
    const Q = (params.peck_depth ?? 3.0) * 1000; // Fanuc uses microns for Q
    const R = params.retract_plane ?? 2.0;
    const F = params.feed_rate ?? 0.15;

    lines.push(`G83 Z${Z.toFixed(3)} Q${Q.toFixed(0)} R${R.toFixed(3)} F${F.toFixed(3)}`);

    return lines;
  },
};

const OKUMA_TEMPLATE: DialectTemplate = {
  family: "okuma",
  comment_prefix: "(",
  comment_suffix: ")",

  g71_format: (params, _spec) => {
    const lines: string[] = [];
    const U = params.finish_allowance_x ?? 0.5;
    const W = params.finish_allowance_z ?? 0.2;
    const D = params.depth_of_cut ?? 2.0;
    const P = params.profile_start_block ?? 100;
    const Q = params.profile_end_block ?? 200;

    // Okuma uses mm directly for depth, similar format to Fanuc
    lines.push(`G71 U${D.toFixed(3)} R1.0`);
    lines.push(`G71 P${P} Q${Q} U${U.toFixed(3)} W${W.toFixed(3)} F${params.feed_rate ?? 0.25}`);

    return lines;
  },

  g76_format: (params, _spec) => {
    const lines: string[] = [];
    const angle = params.thread_angle ?? 60;
    const firstDepth = params.first_cut_depth ?? 0.4;
    const threadHeight = params.thread_depth ?? 0.65;
    const pitch = params.thread_pitch ?? 1.5;
    const endX = params.thread_end_x ?? 20.0;
    const endZ = params.thread_end_z ?? -30.0;

    // Okuma G76 format - uses K for thread height, D for first cut
    lines.push(`G76 X${endX.toFixed(3)} Z${endZ.toFixed(3)} K${threadHeight.toFixed(3)} D${firstDepth.toFixed(3)} A${angle} F${pitch.toFixed(3)}`);

    return lines;
  },

  g83_format: (params, _spec) => {
    const lines: string[] = [];
    const Z = params.hole_depth ?? -25.0;
    const Q = params.peck_depth ?? 3.0;
    const R = params.retract_plane ?? 2.0;
    const F = params.feed_rate ?? 0.15;

    // Okuma uses mm directly for Q
    lines.push(`G83 Z${Z.toFixed(3)} Q${Q.toFixed(3)} R${R.toFixed(3)} F${F.toFixed(3)}`);

    return lines;
  },
};

const MITSUBISHI_TEMPLATE: DialectTemplate = {
  family: "mitsubishi",
  comment_prefix: "(",
  comment_suffix: ")",

  g71_format: (params, _spec) => {
    const lines: string[] = [];
    const U = params.finish_allowance_x ?? 0.5;
    const W = params.finish_allowance_z ?? 0.2;
    const D = params.depth_of_cut ?? 2.0;
    const P = params.profile_start_block ?? 100;
    const Q = params.profile_end_block ?? 200;

    // Mitsubishi format similar to Fanuc
    lines.push(`G71 U${D.toFixed(3)} R1.0`);
    lines.push(`G71 P${P} Q${Q} U${U.toFixed(3)} W${W.toFixed(3)} F${params.feed_rate ?? 0.25}`);

    return lines;
  },

  g76_format: (params, _spec) => {
    const lines: string[] = [];
    const firstDepth = params.first_cut_depth ?? 0.4;
    const threadHeight = params.thread_depth ?? 0.65;
    const pitch = params.thread_pitch ?? 1.5;
    const endX = params.thread_end_x ?? 20.0;
    const endZ = params.thread_end_z ?? -30.0;

    // Mitsubishi G76 format
    lines.push(`G76 X${endX.toFixed(3)} Z${endZ.toFixed(3)} K${threadHeight.toFixed(3)} D${firstDepth.toFixed(3)} F${pitch.toFixed(3)}`);

    return lines;
  },

  g83_format: (params, _spec) => {
    const lines: string[] = [];
    const Z = params.hole_depth ?? -25.0;
    const Q = params.peck_depth ?? 3.0;
    const R = params.retract_plane ?? 2.0;
    const F = params.feed_rate ?? 0.15;

    lines.push(`G83 Z${Z.toFixed(3)} Q${Q.toFixed(3)} R${R.toFixed(3)} F${F.toFixed(3)}`);

    return lines;
  },
};

const DIALECT_TEMPLATES: Record<GCodeDialect["family"], DialectTemplate> = {
  fanuc: FANUC_TEMPLATE,
  okuma: OKUMA_TEMPLATE,
  mitsubishi: MITSUBISHI_TEMPLATE,
  siemens: FANUC_TEMPLATE, // Fallback to Fanuc-like
  haas: FANUC_TEMPLATE,    // Haas is Fanuc-compatible
  mazak: FANUC_TEMPLATE,   // Mazak is Fanuc-compatible
  heidenhain: FANUC_TEMPLATE,
  other: FANUC_TEMPLATE,
};

// ── Engine Implementation ───────────────────────────────────────────────

export class LathePostGeneratorDialectEngine {
  private static readonly VERSION = "1.0.0";

  /**
   * Generate dialect-specific G-code for a canned cycle.
   */
  static generate(input: DialectGenerationInput): GeneratedGCode {
    const validation = DialectGenerationInputSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        gcode: [],
        dialect: "unknown",
        cycle_code: input.cycle_code,
        controller_id: input.controller_id,
        warnings: [],
        errors: [`Input validation failed: ${validation.error.message}`],
        metadata: { total_lines: 0, parameters_used: [] },
      };
    }

    const spec = lathePostGeneratorSpecIngestEngine.getBuiltinSpec(input.controller_id);
    if (!spec) {
      return {
        success: false,
        gcode: [],
        dialect: "unknown",
        cycle_code: input.cycle_code,
        controller_id: input.controller_id,
        warnings: [],
        errors: [`Unknown controller: ${input.controller_id}. Available: fanuc-31i-t, okuma-osp-p300l, mitsubishi-m80-l`],
        metadata: { total_lines: 0, parameters_used: [] },
      };
    }

    const template = DIALECT_TEMPLATES[spec.dialect.family];
    if (!template) {
      return {
        success: false,
        gcode: [],
        dialect: spec.dialect.family,
        cycle_code: input.cycle_code,
        controller_id: input.controller_id,
        warnings: [],
        errors: [`No template for dialect family: ${spec.dialect.family}`],
        metadata: { total_lines: 0, parameters_used: [] },
      };
    }

    const warnings: string[] = [];
    let rawLines: string[] = [];
    const parametersUsed: string[] = [];

    // Generate based on cycle code
    switch (input.cycle_code.toUpperCase()) {
      case "G71":
        rawLines = template.g71_format(input.parameters, spec);
        if (input.parameters.depth_of_cut) parametersUsed.push("depth_of_cut");
        if (input.parameters.finish_allowance_x) parametersUsed.push("finish_allowance_x");
        if (input.parameters.finish_allowance_z) parametersUsed.push("finish_allowance_z");
        if (input.parameters.profile_start_block) parametersUsed.push("profile_start_block");
        if (input.parameters.profile_end_block) parametersUsed.push("profile_end_block");
        if (input.parameters.feed_rate) parametersUsed.push("feed_rate");
        break;

      case "G76":
        rawLines = template.g76_format(input.parameters, spec);
        if (input.parameters.thread_pitch) parametersUsed.push("thread_pitch");
        if (input.parameters.thread_depth) parametersUsed.push("thread_depth");
        if (input.parameters.thread_angle) parametersUsed.push("thread_angle");
        if (input.parameters.first_cut_depth) parametersUsed.push("first_cut_depth");
        if (input.parameters.thread_end_x) parametersUsed.push("thread_end_x");
        if (input.parameters.thread_end_z) parametersUsed.push("thread_end_z");
        break;

      case "G83":
        rawLines = template.g83_format(input.parameters, spec);
        if (input.parameters.hole_depth) parametersUsed.push("hole_depth");
        if (input.parameters.peck_depth) parametersUsed.push("peck_depth");
        if (input.parameters.retract_plane) parametersUsed.push("retract_plane");
        if (input.parameters.feed_rate) parametersUsed.push("feed_rate");
        break;

      default:
        return {
          success: false,
          gcode: [],
          dialect: spec.dialect.family,
          cycle_code: input.cycle_code,
          controller_id: input.controller_id,
          warnings: [],
          errors: [`Unsupported cycle code: ${input.cycle_code}. Supported: G71, G76, G83`],
          metadata: { total_lines: 0, parameters_used: [] },
        };
    }

    // Add comments if requested
    const gcode: string[] = [];
    let lineNum = input.line_number_start;

    if (input.include_comments) {
      const comment = `${template.comment_prefix}${input.cycle_code} CYCLE - ${spec.manufacturer} ${spec.model}${template.comment_suffix}`;
      if (input.use_line_numbers) {
        gcode.push(`N${lineNum} ${comment}`);
        lineNum += input.line_number_increment;
      } else {
        gcode.push(comment);
      }
    }

    for (const line of rawLines) {
      if (input.use_line_numbers) {
        gcode.push(`N${lineNum} ${line}`);
        lineNum += input.line_number_increment;
      } else {
        gcode.push(line);
      }
    }

    // Add cycle cancel if applicable
    const cycle = spec.canned_cycles.find(c => c.code === input.cycle_code.toUpperCase());
    if (cycle?.modal) {
      const cancelLine = "G80";
      if (input.use_line_numbers) {
        gcode.push(`N${lineNum} ${cancelLine}`);
      } else {
        gcode.push(cancelLine);
      }
      warnings.push(`${input.cycle_code} is modal - G80 cancel added`);
    }

    return {
      success: true,
      gcode,
      dialect: spec.dialect.family,
      cycle_code: input.cycle_code,
      controller_id: input.controller_id,
      warnings,
      errors: [],
      metadata: {
        total_lines: gcode.length,
        parameters_used: parametersUsed,
      },
    };
  }

  /**
   * Generate G71 stock removal turning cycle.
   */
  static generateG71(
    controllerId: string,
    depthOfCut: number,
    finishAllowanceX: number,
    finishAllowanceZ: number,
    profileStartBlock: number,
    profileEndBlock: number,
    feedRate: number = 0.25,
  ): GeneratedGCode {
    return this.generate({
      controller_id: controllerId,
      cycle_code: "G71",
      line_number_start: 100,
      line_number_increment: 10,
      parameters: {
        depth_of_cut: depthOfCut,
        finish_allowance_x: finishAllowanceX,
        finish_allowance_z: finishAllowanceZ,
        profile_start_block: profileStartBlock,
        profile_end_block: profileEndBlock,
        feed_rate: feedRate,
      },
      include_comments: true,
      use_line_numbers: false,
    });
  }

  /**
   * Generate G76 threading cycle.
   */
  static generateG76(
    controllerId: string,
    threadPitch: number,
    threadDepth: number,
    threadAngle: number,
    firstCutDepth: number,
    endX: number,
    endZ: number,
  ): GeneratedGCode {
    return this.generate({
      controller_id: controllerId,
      cycle_code: "G76",
      line_number_start: 100,
      line_number_increment: 10,
      parameters: {
        thread_pitch: threadPitch,
        thread_depth: threadDepth,
        thread_angle: threadAngle,
        first_cut_depth: firstCutDepth,
        thread_end_x: endX,
        thread_end_z: endZ,
      },
      include_comments: true,
      use_line_numbers: false,
    });
  }

  /**
   * Generate G83 peck drilling cycle.
   */
  static generateG83(
    controllerId: string,
    holeDepth: number,
    peckDepth: number,
    retractPlane: number,
    feedRate: number = 0.15,
  ): GeneratedGCode {
    return this.generate({
      controller_id: controllerId,
      cycle_code: "G83",
      line_number_start: 100,
      line_number_increment: 10,
      parameters: {
        hole_depth: holeDepth,
        peck_depth: peckDepth,
        retract_plane: retractPlane,
        feed_rate: feedRate,
      },
      include_comments: true,
      use_line_numbers: false,
    });
  }

  /**
   * Get supported cycle codes for a controller.
   */
  static getSupportedCycles(controllerId: string): string[] {
    const spec = lathePostGeneratorSpecIngestEngine.getBuiltinSpec(controllerId);
    if (!spec) return [];
    return spec.canned_cycles.map(c => c.code);
  }

  /**
   * Get cycle parameters schema for a specific cycle.
   */
  static getCycleParameters(controllerId: string, cycleCode: string): CannedCycle | undefined {
    const spec = lathePostGeneratorSpecIngestEngine.getBuiltinSpec(controllerId);
    if (!spec) return undefined;
    return spec.canned_cycles.find(c => c.code === cycleCode.toUpperCase());
  }

  /**
   * Validate cycle parameters against controller spec.
   */
  static validateCycleParameters(
    controllerId: string,
    cycleCode: string,
    parameters: CycleParameters,
  ): { valid: boolean; missing: string[]; warnings: string[] } {
    const cycle = this.getCycleParameters(controllerId, cycleCode);
    if (!cycle) {
      return { valid: false, missing: [], warnings: [`Cycle ${cycleCode} not found for ${controllerId}`] };
    }

    const missing: string[] = [];
    const warnings: string[] = [];

    // Map cycle parameter letters to our parameter names
    const letterToParam: Record<string, keyof CycleParameters> = {
      D: "depth_of_cut",
      U: "finish_allowance_x",
      W: "finish_allowance_z",
      P: "profile_start_block",
      Q: "profile_end_block",
      F: "feed_rate",
      K: "thread_depth",
      A: "thread_angle",
      Z: "hole_depth",
      R: "retract_plane",
    };

    for (const param of cycle.parameters) {
      if (param.required) {
        const paramName = letterToParam[param.letter];
        if (paramName && parameters[paramName] === undefined) {
          missing.push(`${param.letter} (${param.description})`);
        }
      }
    }

    return {
      valid: missing.length === 0,
      missing,
      warnings,
    };
  }

  /**
   * Compare G-code output between two controllers.
   */
  static compareDialects(
    cycleCode: string,
    parameters: CycleParameters,
    controllerIds: string[],
  ): Record<string, GeneratedGCode> {
    const results: Record<string, GeneratedGCode> = {};

    for (const id of controllerIds) {
      results[id] = this.generate({
        controller_id: id,
        cycle_code: cycleCode,
        line_number_start: 100,
        line_number_increment: 10,
        parameters,
        include_comments: false,
        use_line_numbers: false,
      });
    }

    return results;
  }

  /**
   * Get engine version.
   */
  static getVersion(): string {
    return this.VERSION;
  }
}

// Export singleton
export const lathePostGeneratorDialectEngine = LathePostGeneratorDialectEngine;
