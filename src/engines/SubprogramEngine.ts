/**
 * SubprogramEngine — G-code subprogram & macro generation
 *
 * Generates subprogram calls, pattern repeats with coordinate shifts,
 * and parametric variable blocks for CNC controllers.
 *
 * Features:
 * - M98/M99 subprogram calls (Fanuc/Haas/Mazak)
 * - O-number management and program structure
 * - Pattern repeat with G10/coordinate shift
 * - Parametric variables (#100+, R-params, Q-params)
 * - Siemens R-parameters and CALL syntax
 * - Heidenhain Q-parameters and PGM CALL
 * - Conditional logic templates (IF/GOTO, WHILE)
 *
 * Source: video:vXe0s5IbpC4 (CAMWorks post customization — UPG, EC Editor),
 *         domain knowledge (Fanuc Macro B, Siemens ShopMill, Heidenhain TNC)
 */

// ============================================================================
// TYPES
// ============================================================================

export type SubController = "fanuc" | "haas" | "siemens" | "heidenhain";

export interface SubprogramCall {
  program_number: number;          // O-number or subprogram ID
  repeat_count?: number;           // L-count
  arguments?: Record<string, number>; // Macro arguments (A, B, C, etc.)
}

export interface PatternPosition {
  x: number; y: number;
  z?: number;                      // optional Z shift
  angle?: number;                  // rotation (for G68/AROT)
}

export interface PatternRepeatConfig {
  subprogram_number: number;       // The O-number containing the operation
  positions: PatternPosition[];
  work_offset_base?: string;       // G54 base offset
  use_coordinate_shift?: boolean;  // G10 L2 vs G52/G92
  return_to_zero?: boolean;        // cancel shift after each position
}

export interface ParametricBlock {
  variables: Record<string, number>;  // variable name → value
  expression?: string;                // custom expression (e.g., "#101=#100*2")
}

export interface ConditionalTemplate {
  type: "if_goto" | "while_do" | "if_then";
  condition: string;               // e.g., "#100 GT 10"
  goto_line?: number;              // for IF/GOTO
  body_lines?: string[];           // for WHILE/IF-THEN
}

export interface SubprogramResult {
  controller: SubController;
  gcode: string;
  line_count: number;
  subprograms_called: number[];
  warnings: string[];
}

// ============================================================================
// CONTROLLER-SPECIFIC GENERATORS
// ============================================================================

interface SubDialect {
  callSub: (call: SubprogramCall) => string;
  returnFromSub: string;
  programHeader: (num: number) => string;
  programFooter: (num: number) => string;
  setVariable: (name: string, value: number) => string;
  getVariable: (name: string) => string;
  expression: (expr: string) => string;
  coordinateShift: (x: number, y: number, z?: number) => string;
  cancelShift: string;
  rotation: (angle: number) => string;
  cancelRotation: string;
  ifGoto: (condition: string, line: number) => string;
  whileDo: (condition: string, body: string[]) => string[];
  comment: (text: string) => string;
}

// Variable name mapping per controller
function mapVarName(name: string, controller: SubController): string {
  // Common macro variables: #100-#199 local, #500-#599 common
  if (name.startsWith("#")) return name; // already a # variable
  if (controller === "siemens") {
    // Siemens uses R-parameters: R0-R299
    const idx = name.charCodeAt(0) - 65; // A=0, B=1, etc.
    return `R${100 + idx}`;
  }
  if (controller === "heidenhain") {
    // Heidenhain uses Q-parameters: Q100-Q199
    const idx = name.charCodeAt(0) - 65;
    return `Q${100 + idx}`;
  }
  // Fanuc/Haas: use #100+
  const idx = name.charCodeAt(0) - 65;
  return `#${100 + idx}`;
}

const SUB_DIALECTS: Record<SubController, SubDialect> = {
  fanuc: {
    callSub: (call) => {
      let line = `M98 P${call.program_number}`;
      if (call.repeat_count && call.repeat_count > 1) {
        line += ` L${call.repeat_count}`;
      }
      if (call.arguments) {
        for (const [key, val] of Object.entries(call.arguments)) {
          line += ` ${key.toUpperCase()}${val}`;
        }
      }
      return line;
    },
    returnFromSub: "M99",
    programHeader: (num) => `O${num.toString().padStart(4, "0")}`,
    programFooter: (num) =>
      `M99\n(END O${num.toString().padStart(4, "0")})`,
    setVariable: (name, value) => `${name}=${value}`,
    getVariable: (name) => name,
    expression: (expr) => expr,
    coordinateShift: (x, y, z) =>
      `G52 X${x.toFixed(3)} Y${y.toFixed(3)}${z !== undefined ? ` Z${z.toFixed(3)}` : ""}`,
    cancelShift: "G52 X0 Y0 Z0",
    rotation: (angle) => `G68 X0 Y0 R${angle.toFixed(3)}`,
    cancelRotation: "G69",
    ifGoto: (cond, line) => `IF [${cond}] GOTO ${line}`,
    whileDo: (cond, body) => [
      `WHILE [${cond}] DO1`,
      ...body,
      `END1`,
    ],
    comment: (text) => `(${text})`,
  },

  haas: {
    callSub: (call) => {
      let line = `M98 P${call.program_number}`;
      if (call.repeat_count && call.repeat_count > 1) {
        line += ` L${call.repeat_count}`;
      }
      if (call.arguments) {
        for (const [key, val] of Object.entries(call.arguments)) {
          line += ` ${key.toUpperCase()}${val}`;
        }
      }
      return line;
    },
    returnFromSub: "M99",
    programHeader: (num) => `O${num.toString().padStart(5, "0")}`,
    programFooter: (num) =>
      `M99\n(END O${num.toString().padStart(5, "0")})`,
    setVariable: (name, value) => `${name}=${value}`,
    getVariable: (name) => name,
    expression: (expr) => expr,
    coordinateShift: (x, y, z) =>
      `G52 X${x.toFixed(4)} Y${y.toFixed(4)}${z !== undefined ? ` Z${z.toFixed(4)}` : ""}`,
    cancelShift: "G52 X0 Y0 Z0",
    rotation: (angle) => `G68 X0 Y0 R${angle.toFixed(3)}`,
    cancelRotation: "G69",
    ifGoto: (cond, line) => `IF [${cond}] GOTO ${line}`,
    whileDo: (cond, body) => [
      `WHILE [${cond}] DO1`,
      ...body,
      `END1`,
    ],
    comment: (text) => `(${text})`,
  },

  siemens: {
    callSub: (call) => {
      let line = `CALL "${call.program_number}"`;
      if (call.repeat_count && call.repeat_count > 1) {
        line = `MCALL "${call.program_number}" ; repeat ${call.repeat_count}x`;
      }
      return line;
    },
    returnFromSub: "M17",
    programHeader: (num) => `; SUBPROGRAM ${num}`,
    programFooter: () => `M17`,
    setVariable: (name, value) => `${name}=${value}`,
    getVariable: (name) => name,
    expression: (expr) => expr,
    coordinateShift: (x, y, z) =>
      `TRANS X${x.toFixed(3)} Y${y.toFixed(3)}${z !== undefined ? ` Z${z.toFixed(3)}` : ""}`,
    cancelShift: "TRANS",
    rotation: (angle) => `AROT RPL=${angle.toFixed(3)}`,
    cancelRotation: "AROT",
    ifGoto: (cond, line) => `IF ${cond} GOTOF N${line}`,
    whileDo: (cond, body) => [
      `WHILE ${cond}`,
      ...body,
      `ENDWHILE`,
    ],
    comment: (text) => `; ${text}`,
  },

  heidenhain: {
    callSub: (call) => {
      let line = `CALL PGM ${call.program_number}`;
      if (call.repeat_count && call.repeat_count > 1) {
        line += ` REP ${call.repeat_count}`;
      }
      return line;
    },
    returnFromSub: "END PGM",
    programHeader: (num) => `BEGIN PGM ${num} MM`,
    programFooter: (num) => `END PGM ${num} MM`,
    setVariable: (name, value) =>
      `FN 0: ${name} = +${value.toFixed(3)}`,
    getVariable: (name) => name,
    expression: (expr) => `FN 1: ${expr}`,
    coordinateShift: (x, y, z) =>
      `CYCL DEF 7.0 DATUM SHIFT\nCYCL DEF 7.1 X${x.toFixed(3)}\nCYCL DEF 7.2 Y${y.toFixed(3)}${z !== undefined ? `\nCYCL DEF 7.3 Z${z.toFixed(3)}` : ""}`,
    cancelShift:
      "CYCL DEF 7.0 DATUM SHIFT\nCYCL DEF 7.1 X0\nCYCL DEF 7.2 Y0",
    rotation: (angle) =>
      `CYCL DEF 10.0 ROTATION\nCYCL DEF 10.1 ROT${angle.toFixed(3)}`,
    cancelRotation:
      "CYCL DEF 10.0 ROTATION\nCYCL DEF 10.1 ROT+0",
    ifGoto: (cond, line) => `FN 9: IF ${cond} GOTO LBL ${line}`,
    whileDo: (cond, body) => [
      `LBL 1`,
      ...body,
      `FN 9: IF ${cond} GOTO LBL 1`,
    ],
    comment: (text) => `; ${text}`,
  },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class SubprogramEngine {
  /**
   * Generate a subprogram call with optional arguments
   */
  generateCall(
    call: SubprogramCall,
    controller: SubController
  ): SubprogramResult {
    const dialect = SUB_DIALECTS[controller] ?? SUB_DIALECTS.fanuc;
    const lines = [
      dialect.comment(`CALL SUBPROGRAM O${call.program_number}`),
      dialect.callSub(call),
    ];
    return {
      controller,
      gcode: lines.join("\n"),
      line_count: lines.length,
      subprograms_called: [call.program_number],
      warnings: [],
    };
  }

  /**
   * Generate pattern repeat: call a subprogram at multiple positions
   */
  generatePatternRepeat(
    config: PatternRepeatConfig,
    controller: SubController
  ): SubprogramResult {
    const dialect = SUB_DIALECTS[controller] ?? SUB_DIALECTS.fanuc;
    const lines: string[] = [];
    const warnings: string[] = [];

    lines.push(dialect.comment(
      `PATTERN REPEAT — ${config.positions.length} positions`
    ));

    for (let i = 0; i < config.positions.length; i++) {
      const pos = config.positions[i];
      lines.push(dialect.comment(`Position ${i + 1}: X${pos.x} Y${pos.y}`));

      // Apply coordinate shift
      lines.push(dialect.coordinateShift(pos.x, pos.y, pos.z));

      // Apply rotation if needed
      if (pos.angle !== undefined && pos.angle !== 0) {
        lines.push(dialect.rotation(pos.angle));
      }

      // Call subprogram
      lines.push(dialect.callSub({
        program_number: config.subprogram_number,
      }));

      // Cancel rotation
      if (pos.angle !== undefined && pos.angle !== 0) {
        lines.push(dialect.cancelRotation);
      }

      // Cancel shift
      if (config.return_to_zero !== false) {
        lines.push(dialect.cancelShift);
      }
    }

    // Final cancel
    lines.push(dialect.cancelShift);

    return {
      controller,
      gcode: lines.join("\n"),
      line_count: lines.length,
      subprograms_called: [config.subprogram_number],
      warnings,
    };
  }

  /**
   * Generate parametric variable assignments
   */
  generateVariables(
    block: ParametricBlock,
    controller: SubController
  ): SubprogramResult {
    const dialect = SUB_DIALECTS[controller] ?? SUB_DIALECTS.fanuc;
    const lines: string[] = [];

    lines.push(dialect.comment("PARAMETRIC VARIABLES"));

    for (const [name, value] of Object.entries(block.variables)) {
      const varName = mapVarName(name, controller);
      lines.push(dialect.setVariable(varName, value));
    }

    if (block.expression) {
      lines.push(dialect.expression(block.expression));
    }

    return {
      controller,
      gcode: lines.join("\n"),
      line_count: lines.length,
      subprograms_called: [],
      warnings: [],
    };
  }

  /**
   * Generate conditional logic template
   */
  generateConditional(
    template: ConditionalTemplate,
    controller: SubController
  ): SubprogramResult {
    const dialect = SUB_DIALECTS[controller] ?? SUB_DIALECTS.fanuc;
    const lines: string[] = [];
    const warnings: string[] = [];

    switch (template.type) {
      case "if_goto":
        if (template.goto_line === undefined) {
          warnings.push("IF/GOTO requires goto_line");
          break;
        }
        lines.push(dialect.ifGoto(template.condition, template.goto_line));
        break;

      case "while_do":
        if (!template.body_lines?.length) {
          warnings.push("WHILE/DO requires body_lines");
          break;
        }
        lines.push(
          ...dialect.whileDo(template.condition, template.body_lines)
        );
        break;

      case "if_then":
        // Simple IF/THEN — controller-specific
        if (controller === "siemens") {
          lines.push(`IF ${template.condition}`);
          if (template.body_lines) lines.push(...template.body_lines);
          lines.push("ENDIF");
        } else if (controller === "heidenhain") {
          lines.push(
            `FN 9: IF ${template.condition} GOTO LBL 99`
          );
          if (template.body_lines) lines.push(...template.body_lines);
          lines.push("LBL 99");
        } else {
          // Fanuc/Haas — use IF/GOTO
          lines.push(dialect.ifGoto(template.condition, 9999));
          if (template.body_lines) lines.push(...template.body_lines);
          lines.push("N9999");
        }
        break;
    }

    return {
      controller,
      gcode: lines.join("\n"),
      line_count: lines.length,
      subprograms_called: [],
      warnings,
    };
  }

  /**
   * Generate a complete subprogram wrapper (header + body + footer)
   */
  generateSubprogram(
    programNumber: number,
    body: string[],
    controller: SubController
  ): SubprogramResult {
    const dialect = SUB_DIALECTS[controller] ?? SUB_DIALECTS.fanuc;
    const lines = [
      dialect.programHeader(programNumber),
      dialect.comment(`SUBPROGRAM ${programNumber}`),
      ...body,
      dialect.programFooter(programNumber),
    ];

    return {
      controller,
      gcode: lines.join("\n"),
      line_count: lines.length,
      subprograms_called: [],
      warnings: [],
    };
  }

  supportedControllers(): SubController[] {
    return Object.keys(SUB_DIALECTS) as SubController[];
  }
}

export const subprogramEngine = new SubprogramEngine();
