/**
 * ProbingCycleEngine — Touch probe G-code generation for CNC machines
 *
 * Generates controller-specific probing routines for part setup, inspection,
 * and tool setting. Supports Renishaw (Fanuc/Haas macros), Heidenhain touch
 * probe cycles, and Siemens CYCLE977/978.
 *
 * Probing types: bore, boss, web, pocket, surface, corner, angle, tool_set
 * Controllers: renishaw_fanuc, renishaw_haas, heidenhain, siemens
 *
 * Source: video:4OWT-O4oN8E (post-processor customization),
 *         video:vXe0s5IbpC4 (CAMWorks post customization),
 *         domain knowledge (Renishaw Inspection Plus, Heidenhain TNC 640)
 */

// ============================================================================
// TYPES
// ============================================================================

export type ProbeController =
  | "renishaw_fanuc" | "renishaw_haas"
  | "heidenhain" | "siemens";

export type ProbeOperation =
  | "bore" | "boss" | "web_x" | "web_y"
  | "pocket" | "surface_z" | "surface_x" | "surface_y"
  | "corner" | "angle"
  | "tool_length" | "tool_diameter";

export interface ProbeConfig {
  controller: ProbeController;
  probe_tool_number: number;
  feed_rate: number;               // mm/min probing feed
  retract_distance: number;        // mm pullback after contact
  overtravel: number;              // mm max search distance
  work_offset_to_set?: string;     // G54, G55, etc. to update
  store_to_variable?: number;      // #-variable or R-parameter to store result
  print_result?: boolean;          // output measured value as comment
  decimal_places?: number;
}

export interface ProbeParams {
  operation: ProbeOperation;
  // Position params
  x?: number; y?: number; z?: number;
  // Geometry params
  expected_diameter?: number;      // for bore/boss
  expected_width?: number;         // for web
  expected_depth?: number;         // for pocket
  expected_length?: number;        // for tool length
  // Approach
  approach_z?: number;             // Z clearance for approach
  // Tolerances
  tolerance_mm?: number;           // reject if deviation exceeds this
}

export interface ProbeResult {
  controller: ProbeController;
  gcode: string;
  line_count: number;
  operation: ProbeOperation;
  warnings: string[];
  variables_set: string[];         // which #vars or work offsets updated
}

// ============================================================================
// PROBE DIALECT GENERATORS
// ============================================================================

interface ProbeDialect {
  probeOn: string;
  probeOff: string;
  toolChange: (t: number) => string;
  comment: (text: string) => string;
  rapid: (x?: number, y?: number, z?: number) => string;
  probeBore: (p: ProbeParams, cfg: ProbeConfig) => string[];
  probeBoss: (p: ProbeParams, cfg: ProbeConfig) => string[];
  probeWebX: (p: ProbeParams, cfg: ProbeConfig) => string[];
  probeWebY: (p: ProbeParams, cfg: ProbeConfig) => string[];
  probeSurfaceZ: (p: ProbeParams, cfg: ProbeConfig) => string[];
  probeSurfaceX: (p: ProbeParams, cfg: ProbeConfig) => string[];
  probeSurfaceY: (p: ProbeParams, cfg: ProbeConfig) => string[];
  probeCorner: (p: ProbeParams, cfg: ProbeConfig) => string[];
  probeAngle: (p: ProbeParams, cfg: ProbeConfig) => string[];
  probeToolLength: (p: ProbeParams, cfg: ProbeConfig) => string[];
  probeToolDiameter: (p: ProbeParams, cfg: ProbeConfig) => string[];
}

function fv(v: number | undefined, dp: number = 3): string {
  return v !== undefined ? v.toFixed(dp) : "0.000";
}

function makeRenishawDialect(variant: "fanuc" | "haas"): ProbeDialect {
  // Renishaw Inspection Plus macro numbers
  // P9811=single surface, P9812=bore, P9814=boss, P9843=web
  const dp = variant === "haas" ? 4 : 3;
  const wcsVar = (wcs: string | undefined) => {
    if (!wcs) return "";
    const num = parseInt(wcs.replace(/\D/g, ""));
    return num >= 54 ? `#${5200 + (num - 53)}` : "";
  };

  return {
    probeOn: "M19",
    probeOff: "",
    toolChange: (t) => `T${t} M06`,
    comment: (text) => `(${text})`,
    rapid: (x, y, z) => {
      const parts: string[] = [];
      if (x !== undefined) parts.push(`X${fv(x, dp)}`);
      if (y !== undefined) parts.push(`Y${fv(y, dp)}`);
      if (z !== undefined) parts.push(`Z${fv(z, dp)}`);
      return `G00 ${parts.join(" ")}`;
    },

    probeBore: (p, cfg) => {
      const d = p.expected_diameter ?? 25;
      const lines = [
        `(PROBE BORE — Expected D=${d})`,
        `G00 X${fv(p.x, dp)} Y${fv(p.y, dp)}`,
        `G00 Z${fv(p.approach_z ?? 5, dp)}`,
        `G65 P9812 D${fv(d, dp)} Z${fv(p.z ?? -5, dp)} ` +
          `F${cfg.feed_rate} H${fv(cfg.overtravel, dp)}`,
      ];
      if (cfg.work_offset_to_set) {
        lines.push(`(SET ${cfg.work_offset_to_set} X/Y FROM BORE CENTER)`);
        lines.push(`G10 L2 P1 X#185 Y#186`);
      }
      if (cfg.print_result) {
        lines.push(`(MEASURED DIAMETER = #187)`);
      }
      return lines;
    },

    probeBoss: (p, cfg) => {
      const d = p.expected_diameter ?? 25;
      return [
        `(PROBE BOSS — Expected D=${d})`,
        `G00 X${fv(p.x, dp)} Y${fv(p.y, dp)}`,
        `G00 Z${fv(p.approach_z ?? 5, dp)}`,
        `G65 P9814 D${fv(d, dp)} Z${fv(p.z ?? -5, dp)} ` +
          `F${cfg.feed_rate} H${fv(cfg.overtravel, dp)}`,
        ...(cfg.print_result ? [`(MEASURED DIAMETER = #187)`] : []),
      ];
    },

    probeWebX: (p, cfg) => {
      const w = p.expected_width ?? 50;
      return [
        `(PROBE WEB X — Expected W=${w})`,
        `G00 X${fv(p.x, dp)} Y${fv(p.y, dp)}`,
        `G00 Z${fv(p.approach_z ?? 5, dp)}`,
        `G65 P9843 X${fv(w, dp)} Z${fv(p.z ?? -5, dp)} ` +
          `F${cfg.feed_rate} H${fv(cfg.overtravel, dp)}`,
      ];
    },

    probeWebY: (p, cfg) => {
      const w = p.expected_width ?? 50;
      return [
        `(PROBE WEB Y — Expected W=${w})`,
        `G00 X${fv(p.x, dp)} Y${fv(p.y, dp)}`,
        `G00 Z${fv(p.approach_z ?? 5, dp)}`,
        `G65 P9843 Y${fv(w, dp)} Z${fv(p.z ?? -5, dp)} ` +
          `F${cfg.feed_rate} H${fv(cfg.overtravel, dp)}`,
      ];
    },

    probeSurfaceZ: (p, cfg) => [
      `(PROBE SURFACE Z)`,
      `G00 X${fv(p.x, dp)} Y${fv(p.y, dp)}`,
      `G00 Z${fv(p.approach_z ?? 10, dp)}`,
      `G65 P9811 Z${fv(p.z ?? 0, dp)} F${cfg.feed_rate} ` +
        `H${fv(cfg.overtravel, dp)}`,
      ...(cfg.work_offset_to_set ? [
        `(SET ${cfg.work_offset_to_set} Z FROM SURFACE)`,
        `G10 L2 P1 Z#182`,
      ] : []),
    ],

    probeSurfaceX: (p, cfg) => [
      `(PROBE SURFACE +X)`,
      `G00 Z${fv(p.approach_z ?? 10, dp)}`,
      `G00 X${fv((p.x ?? 0) - cfg.retract_distance, dp)} Y${fv(p.y, dp)}`,
      `G65 P9811 X${fv(p.x ?? 0, dp)} F${cfg.feed_rate}`,
    ],

    probeSurfaceY: (p, cfg) => [
      `(PROBE SURFACE +Y)`,
      `G00 Z${fv(p.approach_z ?? 10, dp)}`,
      `G00 X${fv(p.x, dp)} Y${fv((p.y ?? 0) - cfg.retract_distance, dp)}`,
      `G65 P9811 Y${fv(p.y ?? 0, dp)} F${cfg.feed_rate}`,
    ],

    probeCorner: (p, cfg) => [
      `(PROBE CORNER — X/Y DATUM)`,
      `G00 X${fv(p.x, dp)} Y${fv(p.y, dp)}`,
      `G00 Z${fv(p.approach_z ?? 5, dp)}`,
      `G65 P9811 X${fv(p.x ?? 0, dp)} F${cfg.feed_rate}`,
      `G65 P9811 Y${fv(p.y ?? 0, dp)} F${cfg.feed_rate}`,
      ...(cfg.work_offset_to_set ? [
        `G10 L2 P1 X#185 Y#186`,
      ] : []),
    ],

    probeAngle: (p, cfg) => [
      `(PROBE ANGLE — ROTATION)`,
      `G00 Z${fv(p.approach_z ?? 5, dp)}`,
      `G65 P9843 X0 Y${fv(p.expected_width ?? 100, dp)} ` +
        `Z${fv(p.z ?? -5, dp)} F${cfg.feed_rate}`,
      `(ROTATION STORED IN #189)`,
    ],

    probeToolLength: (p, cfg) => [
      `(TOOL LENGTH MEASUREMENT)`,
      `G00 G91 G28 Z0`,
      `G90`,
      `T${cfg.probe_tool_number} M06`,
      `G43 H${cfg.probe_tool_number}`,
      `G65 P9023 H${fv(p.expected_length ?? 100, dp)} F${cfg.feed_rate}`,
    ],

    probeToolDiameter: (p, cfg) => [
      `(TOOL DIAMETER MEASUREMENT)`,
      `G65 P9023 D${fv(p.expected_diameter ?? 10, dp)} F${cfg.feed_rate}`,
    ],
  };
}

function makeHeidenhainDialect(): ProbeDialect {
  return {
    probeOn: "",
    probeOff: "",
    toolChange: (t) => `TOOL CALL ${t} Z S0`,
    comment: (text) => `; ${text}`,
    rapid: (x, y, z) => {
      const parts: string[] = [];
      if (x !== undefined) parts.push(`X${fv(x)}`);
      if (y !== undefined) parts.push(`Y${fv(y)}`);
      if (z !== undefined) parts.push(`Z${fv(z)}`);
      return `L ${parts.join(" ")} R0 FMAX`;
    },

    probeBore: (p) => [
      `; PROBE BORE`,
      `TCH PROBE 421 MEASURE BORE`,
      `Q273=${fv(p.x ?? 0)} ;CENTER IN 1ST AXIS`,
      `Q274=${fv(p.y ?? 0)} ;CENTER IN 2ND AXIS`,
      `Q262=${fv(p.expected_diameter ?? 25)} ;NOMINAL DIAMETER`,
      `Q325=${fv(p.approach_z ?? 5)} ;STARTING POINT`,
      `Q260=${fv(p.z ?? -5)} ;CLEARANCE HEIGHT`,
    ],

    probeBoss: (p) => [
      `; PROBE BOSS`,
      `TCH PROBE 422 MEASURE BOSS`,
      `Q273=${fv(p.x ?? 0)} ;CENTER IN 1ST AXIS`,
      `Q274=${fv(p.y ?? 0)} ;CENTER IN 2ND AXIS`,
      `Q262=${fv(p.expected_diameter ?? 25)} ;NOMINAL DIAMETER`,
      `Q325=${fv(p.approach_z ?? 5)} ;STARTING POINT`,
    ],

    probeWebX: (p) => [
      `; PROBE WEB X`,
      `TCH PROBE 409 GROOVE IN 1ST AXIS`,
      `Q321=${fv(p.expected_width ?? 50)} ;NOMINAL WIDTH`,
      `Q260=${fv(p.approach_z ?? 5)} ;CLEARANCE HEIGHT`,
    ],

    probeWebY: (p) => [
      `; PROBE WEB Y`,
      `TCH PROBE 410 GROOVE IN 2ND AXIS`,
      `Q321=${fv(p.expected_width ?? 50)} ;NOMINAL WIDTH`,
      `Q260=${fv(p.approach_z ?? 5)} ;CLEARANCE HEIGHT`,
    ],

    probeSurfaceZ: (p) => [
      `; PROBE SURFACE Z`,
      `TCH PROBE 427 MEASURE COORDINATE`,
      `Q263=${fv(p.x ?? 0)} ;1ST MEAS POINT 1ST AXIS`,
      `Q264=${fv(p.y ?? 0)} ;1ST MEAS POINT 2ND AXIS`,
      `Q294=3 ;MEAS AXIS = Z`,
      `Q260=${fv(p.approach_z ?? 10)} ;CLEARANCE HEIGHT`,
    ],

    probeSurfaceX: (p) => [
      `; PROBE SURFACE X`,
      `TCH PROBE 427 MEASURE COORDINATE`,
      `Q263=${fv(p.x ?? 0)} ;1ST MEAS POINT 1ST AXIS`,
      `Q264=${fv(p.y ?? 0)} ;1ST MEAS POINT 2ND AXIS`,
      `Q294=1 ;MEAS AXIS = X`,
    ],

    probeSurfaceY: (p) => [
      `; PROBE SURFACE Y`,
      `TCH PROBE 427 MEASURE COORDINATE`,
      `Q263=${fv(p.x ?? 0)} ;1ST MEAS POINT 1ST AXIS`,
      `Q264=${fv(p.y ?? 0)} ;1ST MEAS POINT 2ND AXIS`,
      `Q294=2 ;MEAS AXIS = Y`,
    ],

    probeCorner: (p) => [
      `; PROBE CORNER`,
      `TCH PROBE 403 MEASURE CORNER`,
      `Q263=${fv(p.x ?? 0)} ;CORNER X`,
      `Q264=${fv(p.y ?? 0)} ;CORNER Y`,
      `Q260=${fv(p.approach_z ?? 5)} ;CLEARANCE HEIGHT`,
    ],

    probeAngle: (p) => [
      `; PROBE ANGLE`,
      `TCH PROBE 400 MEASURE ROTATION`,
      `Q263=${fv(p.x ?? 0)} ;1ST MEAS POINT 1ST AXIS`,
      `Q264=${fv(p.y ?? 0)} ;1ST MEAS POINT 2ND AXIS`,
      `Q321=${fv(p.expected_width ?? 100)} ;DIST 2ND POINT`,
    ],

    probeToolLength: () => [
      `; TOOL LENGTH MEASUREMENT`,
      `TCH PROBE 481 TOOL LENGTH`,
      `Q340=0 ;CHECK ONLY`,
    ],

    probeToolDiameter: (p) => [
      `; TOOL DIAMETER MEASUREMENT`,
      `TCH PROBE 482 TOOL RADIUS`,
      `Q340=0 ;CHECK ONLY`,
      `Q260=${fv(p.expected_diameter ?? 10)} ;NOMINAL DIAMETER`,
    ],
  };
}

function makeSiemensDialect(): ProbeDialect {
  return {
    probeOn: "",
    probeOff: "",
    toolChange: (t) => `T${t} D1\nM6`,
    comment: (text) => `; ${text}`,
    rapid: (x, y, z) => {
      const parts: string[] = [];
      if (x !== undefined) parts.push(`X${fv(x)}`);
      if (y !== undefined) parts.push(`Y${fv(y)}`);
      if (z !== undefined) parts.push(`Z${fv(z)}`);
      return `G0 ${parts.join(" ")}`;
    },

    probeBore: (p, cfg) => [
      `; PROBE BORE`,
      `CYCLE977(1,${fv(p.expected_diameter ?? 25)},0,0,` +
        `${fv(p.z ?? -5)},${fv(p.approach_z ?? 5)},${cfg.feed_rate},` +
        `${fv(cfg.overtravel)},0,1)`,
    ],

    probeBoss: (p, cfg) => [
      `; PROBE BOSS`,
      `CYCLE977(2,${fv(p.expected_diameter ?? 25)},0,0,` +
        `${fv(p.z ?? -5)},${fv(p.approach_z ?? 5)},${cfg.feed_rate},` +
        `${fv(cfg.overtravel)},0,1)`,
    ],

    probeWebX: (p, cfg) => [
      `; PROBE WEB X`,
      `CYCLE977(5,${fv(p.expected_width ?? 50)},0,0,` +
        `${fv(p.z ?? -5)},${fv(p.approach_z ?? 5)},${cfg.feed_rate},0,0,1)`,
    ],

    probeWebY: (p, cfg) => [
      `; PROBE WEB Y`,
      `CYCLE977(6,${fv(p.expected_width ?? 50)},0,0,` +
        `${fv(p.z ?? -5)},${fv(p.approach_z ?? 5)},${cfg.feed_rate},0,0,1)`,
    ],

    probeSurfaceZ: (p, cfg) => [
      `; PROBE SURFACE Z`,
      `CYCLE978(3,0,${fv(p.z ?? 0)},${fv(p.approach_z ?? 10)},` +
        `${cfg.feed_rate},${fv(cfg.overtravel)},0)`,
    ],

    probeSurfaceX: (p, cfg) => [
      `; PROBE SURFACE X`,
      `CYCLE978(1,0,${fv(p.x ?? 0)},${fv((p.x ?? 0) - 10)},` +
        `${cfg.feed_rate},${fv(cfg.overtravel)},0)`,
    ],

    probeSurfaceY: (p, cfg) => [
      `; PROBE SURFACE Y`,
      `CYCLE978(2,0,${fv(p.y ?? 0)},${fv((p.y ?? 0) - 10)},` +
        `${cfg.feed_rate},${fv(cfg.overtravel)},0)`,
    ],

    probeCorner: (p, cfg) => [
      `; PROBE CORNER`,
      `CYCLE961(${fv(p.x ?? 0)},${fv(p.y ?? 0)},` +
        `${fv(p.approach_z ?? 5)},${cfg.feed_rate},1)`,
    ],

    probeAngle: (p, cfg) => [
      `; PROBE ANGLE`,
      `CYCLE998(${fv(p.x ?? 0)},${fv(p.y ?? 0)},` +
        `${fv(p.expected_width ?? 100)},${fv(p.approach_z ?? 5)},` +
        `${cfg.feed_rate})`,
    ],

    probeToolLength: (_p, cfg) => [
      `; TOOL LENGTH MEASUREMENT`,
      `CYCLE982(1,0,0,${cfg.feed_rate})`,
    ],

    probeToolDiameter: (p, cfg) => [
      `; TOOL DIAMETER MEASUREMENT`,
      `CYCLE982(2,${fv(p.expected_diameter ?? 10)},0,${cfg.feed_rate})`,
    ],
  };
}

const PROBE_DIALECTS: Record<ProbeController, ProbeDialect> = {
  renishaw_fanuc: makeRenishawDialect("fanuc"),
  renishaw_haas: makeRenishawDialect("haas"),
  heidenhain: makeHeidenhainDialect(),
  siemens: makeSiemensDialect(),
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class ProbingCycleEngine {
  generate(params: ProbeParams, config: ProbeConfig): ProbeResult {
    const dialect = PROBE_DIALECTS[config.controller]
      ?? PROBE_DIALECTS.renishaw_fanuc;
    const warnings: string[] = [];
    const variablesSet: string[] = [];
    const lines: string[] = [];

    // Header
    lines.push(dialect.comment(
      `PRISM ProbingCycle — ${config.controller} — ${params.operation}`
    ));

    // Tool change to probe
    lines.push(dialect.toolChange(config.probe_tool_number));
    lines.push("G43 H" + config.probe_tool_number);

    // Generate operation-specific code
    const opMap: Record<ProbeOperation,
      (p: ProbeParams, c: ProbeConfig) => string[]> = {
      bore: dialect.probeBore,
      boss: dialect.probeBoss,
      web_x: dialect.probeWebX,
      web_y: dialect.probeWebY,
      pocket: dialect.probeBore, // pocket uses bore with depth
      surface_z: dialect.probeSurfaceZ,
      surface_x: dialect.probeSurfaceX,
      surface_y: dialect.probeSurfaceY,
      corner: dialect.probeCorner,
      angle: dialect.probeAngle,
      tool_length: dialect.probeToolLength,
      tool_diameter: dialect.probeToolDiameter,
    };

    const generator = opMap[params.operation];
    if (generator) {
      lines.push(...generator(params, config));
    } else {
      warnings.push(`Unsupported probe operation: ${params.operation}`);
      lines.push(dialect.comment(`UNSUPPORTED: ${params.operation}`));
    }

    // Track variables
    if (config.work_offset_to_set) {
      variablesSet.push(config.work_offset_to_set);
    }
    if (config.store_to_variable) {
      variablesSet.push(`#${config.store_to_variable}`);
    }

    // Retract
    lines.push(dialect.rapid(undefined, undefined, 50));

    // Tolerance check warning
    if (params.tolerance_mm) {
      lines.push(dialect.comment(
        `TOLERANCE CHECK: +/- ${params.tolerance_mm}mm`
      ));
    }

    return {
      controller: config.controller,
      gcode: lines.join("\n"),
      line_count: lines.length,
      operation: params.operation,
      warnings,
      variables_set: variablesSet,
    };
  }

  supportedControllers(): ProbeController[] {
    return Object.keys(PROBE_DIALECTS) as ProbeController[];
  }

  supportedOperations(): ProbeOperation[] {
    return [
      "bore", "boss", "web_x", "web_y", "pocket",
      "surface_z", "surface_x", "surface_y",
      "corner", "angle", "tool_length", "tool_diameter",
    ];
  }
}

export const probingCycleEngine = new ProbingCycleEngine();
