/**
 * PostProcessorEngine — L2-P2-MS1 CAD/CAM Layer
 *
 * Multi-controller G-code post-processing. Takes generic toolpath moves
 * and outputs controller-specific G-code (Fanuc, Haas, Siemens, Heidenhain,
 * Mazak, Okuma). Handles canned cycles, safe start blocks, program headers.
 *
 * Actions: post_process, post_validate, post_compare
 */

// ============================================================================
// TYPES
// ============================================================================

export type PostController = "fanuc" | "haas" | "siemens" | "heidenhain" | "mazak" | "okuma";

export interface PostConfig {
  controller: PostController;
  program_number?: number;
  use_canned_cycles: boolean;
  use_tool_length_comp: boolean;
  decimal_places: number;
  line_numbers: boolean;
  line_number_increment: number;
  coolant_code: string;
  safe_start_block: boolean;
  program_end: "M30" | "M02" | "%";
  max_line_length?: number;
}

export interface PostInput {
  moves: PostMove[];
  tool_number: number;
  tool_diameter_mm: number;
  spindle_rpm: number;
  feed_rate_mmmin: number;
  coolant: "flood" | "mist" | "air" | "none";
  work_offset: string;            // "G54", "G55", etc.
}

export interface PostMove {
  type: "rapid" | "feed" | "arc_cw" | "arc_ccw" | "drill" | "tap" | "bore" | "comment";
  x?: number; y?: number; z?: number;
  i?: number; j?: number;
  feed?: number;
  dwell_sec?: number;
  pitch?: number;                 // thread pitch for tapping (mm)
  text?: string;                  // for comments
}

export interface PostResult {
  controller: PostController;
  gcode: string;
  line_count: number;
  estimated_time_sec: number;
  warnings: string[];
  canned_cycles_used: string[];
}

export interface PostValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  unsupported_codes: string[];
}

// ============================================================================
// CONTROLLER DIALECTS
// ============================================================================

interface ControllerDialect {
  safeStart: string;
  toolChange: (t: number, rpm: number, dir: string) => string;
  coolantOn: (type: string) => string;
  coolantOff: string;
  workOffset: (g: string) => string;
  rapid: (x?: number, y?: number, z?: number, dp?: number) => string;
  feed: (x?: number, y?: number, z?: number, f?: number, dp?: number) => string;
  arcCW: (x?: number, y?: number, i?: number, j?: number, f?: number, dp?: number) => string;
  arcCCW: (x?: number, y?: number, i?: number, j?: number, f?: number, dp?: number) => string;
  drillCanned: (z: number, r: number, f: number) => string;
  programEnd: string;
  comment: (text: string) => string;
}

function fmt(v: number | undefined, dp: number): string {
  return v !== undefined ? v.toFixed(dp) : "";
}

function coord(prefix: string, v: number | undefined, dp: number): string {
  return v !== undefined ? `${prefix}${fmt(v, dp)}` : "";
}

const DIALECTS: Record<PostController, ControllerDialect> = {
  fanuc: {
    safeStart: "G90 G80 G40 G49",
    toolChange: (t, rpm, dir) => `T${t} M06\nS${rpm} M0${dir === "ccw" ? "4" : "3"}`,
    coolantOn: (type) => type === "mist" ? "M07" : "M08",
    coolantOff: "M09",
    workOffset: (g) => g,
    rapid: (x, y, z, dp = 3) => `G00 ${coord("X", x, dp)} ${coord("Y", y, dp)} ${coord("Z", z, dp)}`.trim(),
    feed: (x, y, z, f, dp = 3) => `G01 ${coord("X", x, dp)} ${coord("Y", y, dp)} ${coord("Z", z, dp)} ${f ? `F${f}` : ""}`.trim(),
    arcCW: (x, y, i, j, f, dp = 3) => `G02 ${coord("X", x, dp)} ${coord("Y", y, dp)} ${coord("I", i, dp)} ${coord("J", j, dp)} ${f ? `F${f}` : ""}`.trim(),
    arcCCW: (x, y, i, j, f, dp = 3) => `G03 ${coord("X", x, dp)} ${coord("Y", y, dp)} ${coord("I", i, dp)} ${coord("J", j, dp)} ${f ? `F${f}` : ""}`.trim(),
    drillCanned: (z, r, f) => `G81 Z${z.toFixed(3)} R${r.toFixed(3)} F${f}`,
    programEnd: "M30",
    comment: (text) => `(${text})`,
  },
  haas: {
    safeStart: "G90 G80 G40 G49 G17",
    toolChange: (t, rpm, dir) => `T${t} M06\nS${rpm} M0${dir === "ccw" ? "4" : "3"}`,
    coolantOn: (type) => type === "mist" ? "M07" : "M08",
    coolantOff: "M09",
    workOffset: (g) => g,
    rapid: (x, y, z, dp = 4) => `G00 ${coord("X", x, dp)} ${coord("Y", y, dp)} ${coord("Z", z, dp)}`.trim(),
    feed: (x, y, z, f, dp = 4) => `G01 ${coord("X", x, dp)} ${coord("Y", y, dp)} ${coord("Z", z, dp)} ${f ? `F${f}` : ""}`.trim(),
    arcCW: (x, y, i, j, f, dp = 4) => `G02 ${coord("X", x, dp)} ${coord("Y", y, dp)} ${coord("I", i, dp)} ${coord("J", j, dp)} ${f ? `F${f}` : ""}`.trim(),
    arcCCW: (x, y, i, j, f, dp = 4) => `G03 ${coord("X", x, dp)} ${coord("Y", y, dp)} ${coord("I", i, dp)} ${coord("J", j, dp)} ${f ? `F${f}` : ""}`.trim(),
    drillCanned: (z, r, f) => `G81 Z${z.toFixed(4)} R${r.toFixed(4)} F${f}`,
    programEnd: "M30",
    comment: (text) => `(${text})`,
  },
  siemens: {
    safeStart: "G90 G40 G17 CYCLE800()",
    toolChange: (t, rpm, dir) => `T${t} D1\nM6\nS${rpm} M${dir === "ccw" ? "4" : "3"}`,
    coolantOn: () => "M8",
    coolantOff: "M9",
    workOffset: (g) => g.replace("G54", "G500"),
    rapid: (x, y, z, dp = 3) => `G0 ${coord("X", x, dp)} ${coord("Y", y, dp)} ${coord("Z", z, dp)}`.trim(),
    feed: (x, y, z, f, dp = 3) => `G1 ${coord("X", x, dp)} ${coord("Y", y, dp)} ${coord("Z", z, dp)} ${f ? `F${f}` : ""}`.trim(),
    arcCW: (x, y, i, j, f, dp = 3) => `G2 ${coord("X", x, dp)} ${coord("Y", y, dp)} ${coord("I", i, dp)} ${coord("J", j, dp)} ${f ? `F${f}` : ""}`.trim(),
    arcCCW: (x, y, i, j, f, dp = 3) => `G3 ${coord("X", x, dp)} ${coord("Y", y, dp)} ${coord("I", i, dp)} ${coord("J", j, dp)} ${f ? `F${f}` : ""}`.trim(),
    drillCanned: (z, r, f) => `CYCLE81(${r.toFixed(3)},0,${z.toFixed(3)})`,
    programEnd: "M30",
    comment: (text) => `; ${text}`,
  },
  heidenhain: {
    safeStart: "BEGIN PGM PART MM",
    toolChange: (t, rpm) => `TOOL CALL ${t} Z S${rpm}`,
    coolantOn: () => "M8",
    coolantOff: "M9",
    workOffset: () => "",
    rapid: (x, y, z, dp = 3) => `L ${coord("X", x, dp)} ${coord("Y", y, dp)} ${coord("Z", z, dp)} R0 FMAX`.trim(),
    feed: (x, y, z, f, dp = 3) => `L ${coord("X", x, dp)} ${coord("Y", y, dp)} ${coord("Z", z, dp)} R0 ${f ? `F${f}` : ""}`.trim(),
    arcCW: (x, y, i, j, f, dp = 3) => `CC ${coord("X", i, dp)} ${coord("Y", j, dp)}\nC ${coord("X", x, dp)} ${coord("Y", y, dp)} DR- ${f ? `F${f}` : ""}`.trim(),
    arcCCW: (x, y, i, j, f, dp = 3) => `CC ${coord("X", i, dp)} ${coord("Y", j, dp)}\nC ${coord("X", x, dp)} ${coord("Y", y, dp)} DR+ ${f ? `F${f}` : ""}`.trim(),
    drillCanned: (z, r, f) => `CYCL DEF 1.0 DRILLING\nCYCL DEF 1.1 SET UP ${r.toFixed(3)}\nCYCL DEF 1.2 DEPTH ${z.toFixed(3)}\nCYCL DEF 1.3 FEED ${f}`,
    programEnd: "END PGM PART MM",
    comment: (text) => `; ${text}`,
  },
  mazak: {
    safeStart: "G90 G80 G40 G49 G17",
    toolChange: (t, rpm, dir) => `T${t.toString().padStart(4, "0")}\nM06\nS${rpm} M0${dir === "ccw" ? "4" : "3"}`,
    coolantOn: (type) => type === "mist" ? "M07" : "M08",
    coolantOff: "M09",
    workOffset: (g) => g,
    rapid: (x, y, z, dp = 3) => `G00 ${coord("X", x, dp)} ${coord("Y", y, dp)} ${coord("Z", z, dp)}`.trim(),
    feed: (x, y, z, f, dp = 3) => `G01 ${coord("X", x, dp)} ${coord("Y", y, dp)} ${coord("Z", z, dp)} ${f ? `F${f}` : ""}`.trim(),
    arcCW: (x, y, i, j, f, dp = 3) => `G02 ${coord("X", x, dp)} ${coord("Y", y, dp)} ${coord("I", i, dp)} ${coord("J", j, dp)} ${f ? `F${f}` : ""}`.trim(),
    arcCCW: (x, y, i, j, f, dp = 3) => `G03 ${coord("X", x, dp)} ${coord("Y", y, dp)} ${coord("I", i, dp)} ${coord("J", j, dp)} ${f ? `F${f}` : ""}`.trim(),
    drillCanned: (z, r, f) => `G81 Z${z.toFixed(3)} R${r.toFixed(3)} F${f}`,
    programEnd: "M30",
    comment: (text) => `(${text})`,
  },
  okuma: {
    safeStart: "G90 G80 G40 G49 G15 H0",
    toolChange: (t, rpm, dir) => `T${t.toString().padStart(4, "0")}\nM06\nS${rpm} M0${dir === "ccw" ? "4" : "3"}`,
    coolantOn: (type) => type === "mist" ? "M51" : "M50",
    coolantOff: "M09",
    workOffset: (g) => g.replace("G54", "G15 H1"),
    rapid: (x, y, z, dp = 4) => `G00 ${coord("X", x, dp)} ${coord("Y", y, dp)} ${coord("Z", z, dp)}`.trim(),
    feed: (x, y, z, f, dp = 4) => `G01 ${coord("X", x, dp)} ${coord("Y", y, dp)} ${coord("Z", z, dp)} ${f ? `F${f}` : ""}`.trim(),
    arcCW: (x, y, i, j, f, dp = 4) => `G02 ${coord("X", x, dp)} ${coord("Y", y, dp)} ${coord("I", i, dp)} ${coord("J", j, dp)} ${f ? `F${f}` : ""}`.trim(),
    arcCCW: (x, y, i, j, f, dp = 4) => `G03 ${coord("X", x, dp)} ${coord("Y", y, dp)} ${coord("I", i, dp)} ${coord("J", j, dp)} ${f ? `F${f}` : ""}`.trim(),
    drillCanned: (z, r, f) => `G81 Z${z.toFixed(4)} R${r.toFixed(4)} F${f}`,
    programEnd: "M30",
    comment: (text) => `(${text})`,
  },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class PostProcessorEngine {
  process(input: PostInput, config: PostConfig): PostResult {
    const dialect = DIALECTS[config.controller] || DIALECTS.fanuc;
    const dp = config.decimal_places || 3;
    const lines: string[] = [];
    const cannedCyclesUsed: string[] = [];
    const warnings: string[] = [];
    let lineNum = config.line_number_increment || 10;

    const addLine = (line: string) => {
      if (config.line_numbers) {
        lines.push(`N${lineNum} ${line}`);
        lineNum += config.line_number_increment || 10;
      } else {
        lines.push(line);
      }
    };

    // Header
    if (config.program_number) addLine(`O${config.program_number.toString().padStart(4, "0")}`);
    addLine(dialect.comment(`Program generated by PRISM PostProcessor — ${config.controller.toUpperCase()}`));

    // Safe start
    if (config.safe_start_block) addLine(dialect.safeStart);

    // Work offset
    if (input.work_offset) addLine(dialect.workOffset(input.work_offset));

    // Safe retract before tool change (M-002 fix: prevent collision during ATC)
    addLine("G28 Z0");

    // Tool change
    addLine(dialect.toolChange(input.tool_number, input.spindle_rpm, "cw"));

    // Tool length comp
    if (config.use_tool_length_comp) addLine(`G43 H${input.tool_number}`);

    // Coolant
    if (input.coolant !== "none") addLine(dialect.coolantOn(input.coolant));

    // Process moves
    let totalFeedDist = 0;
    for (const move of input.moves) {
      switch (move.type) {
        case "rapid":
          addLine(dialect.rapid(move.x, move.y, move.z, dp));
          break;
        case "feed":
          addLine(dialect.feed(move.x, move.y, move.z, move.feed || input.feed_rate_mmmin, dp));
          totalFeedDist += 10; // simplified
          break;
        case "arc_cw":
          addLine(dialect.arcCW(move.x, move.y, move.i, move.j, move.feed || input.feed_rate_mmmin, dp));
          totalFeedDist += 15;
          break;
        case "arc_ccw":
          addLine(dialect.arcCCW(move.x, move.y, move.i, move.j, move.feed || input.feed_rate_mmmin, dp));
          totalFeedDist += 15;
          break;
        case "drill":
          if (config.use_canned_cycles && move.z !== undefined) {
            addLine(dialect.drillCanned(move.z, 2, move.feed || input.feed_rate_mmmin));
            cannedCyclesUsed.push("G81");
          } else {
            addLine(dialect.feed(move.x, move.y, move.z, move.feed || input.feed_rate_mmmin / 2, dp));
          }
          totalFeedDist += 20;
          break;
        case "tap":
          // C-003 fix: tapping cycle (was previously silently dropped)
          if (config.use_canned_cycles && move.z !== undefined) {
            const pitch = move.pitch || 1.0;
            addLine(`G84 Z${move.z.toFixed(dp)} R2.000 F${(input.spindle_rpm * pitch).toFixed(0)}`);
            cannedCyclesUsed.push("G84");
          } else {
            addLine(dialect.feed(move.x, move.y, move.z, move.feed || input.feed_rate_mmmin / 4, dp));
          }
          totalFeedDist += 20;
          break;
        case "bore":
          // C-003 fix: boring cycle (was previously silently dropped)
          if (config.use_canned_cycles && move.z !== undefined) {
            addLine(`G76 Z${move.z.toFixed(dp)} R2.000 F${move.feed || input.feed_rate_mmmin / 2}`);
            cannedCyclesUsed.push("G76");
          } else {
            addLine(dialect.feed(move.x, move.y, move.z, move.feed || input.feed_rate_mmmin / 2, dp));
          }
          totalFeedDist += 20;
          break;
        case "comment":
          if (move.text) addLine(dialect.comment(move.text));
          break;
        default:
          warnings.push(`Unknown move type "${(move as any).type}" at move index — output as comment`);
          addLine(dialect.comment(`UNSUPPORTED: ${(move as any).type}`));
          break;
      }
    }

    // Coolant off + program end
    addLine(dialect.coolantOff);
    addLine(dialect.programEnd);

    const estimatedTime = totalFeedDist / input.feed_rate_mmmin * 60 + lines.length * 0.05;

    return {
      controller: config.controller,
      gcode: lines.join("\n"),
      line_count: lines.length,
      estimated_time_sec: Math.round(estimatedTime),
      warnings,
      canned_cycles_used: [...new Set(cannedCyclesUsed)],
    };
  }

  validate(gcode: string, controller: PostController): PostValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const unsupported: string[] = [];
    const lines = gcode.split("\n").filter(l => l.trim().length > 0);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Check for common issues
      if (line.includes("G28") && controller === "heidenhain") {
        unsupported.push(`Line ${i + 1}: G28 not supported on Heidenhain — use machine-specific home`);
      }
      if (line.includes("G43") && controller === "heidenhain") {
        unsupported.push(`Line ${i + 1}: G43 not supported on Heidenhain — use TOOL CALL with Z`);
      }
      if (/S\d+/.test(line)) {
        const rpm = parseInt(line.match(/S(\d+)/)?.[1] || "0");
        if (rpm > 30000) warnings.push(`Line ${i + 1}: Spindle speed ${rpm} RPM exceeds typical limits`);
      }
      if (/F\d+/.test(line)) {
        const feed = parseInt(line.match(/F(\d+)/)?.[1] || "0");
        if (feed > 15000) warnings.push(`Line ${i + 1}: Feed rate ${feed} mm/min is very high`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      unsupported_codes: unsupported,
    };
  }

  supportedControllers(): PostController[] {
    return Object.keys(DIALECTS) as PostController[];
  }
}

export const postProcessorEngine = new PostProcessorEngine();
