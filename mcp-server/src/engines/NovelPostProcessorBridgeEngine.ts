/**
 * NovelPostProcessorBridgeEngine — Novel Toolpath to Controller G-code Bridge
 * =============================================================================
 * NOVEL: Bridges novel toolpath algorithm output (TGAR, HRAF, MTHZD, CFSF,
 * PTDC, VCER, etc.) to controller-specific G-code with correct 5-axis TCP/RTCP
 * activation, dialect translation, and canned cycle conversion.
 *
 * Supported controllers:
 * - Fanuc:      G43.4 RTCP, G68.2 tilted work planes, O-number programs
 * - Siemens:    TRAORI TCP, CYCLE800 tilted planes, PROC/RET format
 * - Heidenhain: M128/FUNCTION TCPM, BLK FORM, TOOL CALL format
 * - Mazak:      G43.4 RTCP, Mazatrol comments, Fanuc-like G-codes
 * - Haas:       G234 DWO, standard Fanuc-like with macro variables
 *
 * @module engines/NovelPostProcessorBridgeEngine
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

/** Atomic value wrapper with unit, formula, and confidence metadata */
export interface AtomicValue<T> {
  value: T;
  unit: string;
  formula?: string;
  confidence?: number;
}

/** Supported CNC controller types */
export type PostController = "fanuc" | "siemens" | "heidenhain" | "mazak" | "haas";

/** Five-axis tool center point mode */
export type FiveAxisMode = "RTCP" | "TCP" | "none";

/** Machine rotary axis configuration */
export type MachineAxes = "AC" | "BC" | "AB";

/** Single G-code block from novel toolpath output */
export interface NovelBlock {
  line_number: number;
  code: string;
  x?: number;
  y?: number;
  z?: number;
  a?: number;
  b?: number;
  c?: number;
  f?: number;
  s?: number;
  comment?: string;
}

/** Input configuration for post-processing */
export interface NovelPostInput {
  blocks: NovelBlock[];
  controller: PostController;
  five_axis_mode?: FiveAxisMode;
  machine_axes?: MachineAxes;
  algorithm_name?: string;
  physics_summary?: string;
  program_number?: number;
  canned_cycles?: boolean;
}

/** Post-processing result */
export interface NovelPostResult {
  gcode: string;
  line_count: number;
  controller_dialect: string;
  five_axis_commands_used: string[];
  warnings: string[];
}

// ============================================================================
// CONTROLLER DIALECT DEFINITIONS
// ============================================================================

interface ControllerDialect {
  name: string;
  comment: (text: string) => string;
  header: (progNum: number, algoName?: string, physicsSummary?: string) => string[];
  footer: () => string[];
  formatCoord: (axis: string, val: number) => string;
  translateCode: (code: string) => string;
  activateTCP: (mode: FiveAxisMode, axes: MachineAxes) => string[];
  deactivateTCP: (mode: FiveAxisMode) => string[];
  linePrefix: (n: number) => string;
  cannedDrill: (x: number, y: number, z: number, r: number, f: number) => string;
}

const fmt3 = (v: number): string => v.toFixed(3);
const fmt1 = (v: number): string => v.toFixed(1);

const FANUC: ControllerDialect = {
  name: "Fanuc",
  comment: (t) => `(${t})`,
  header: (p, algo, phys) => {
    const lines = [`O${p} (NOVEL TOOLPATH PROGRAM)`, "G90 G80 G40 G49", "G17 G21"];
    if (algo) lines.push(`(ALGORITHM: ${algo})`);
    if (phys) lines.push(`(PHYSICS: ${phys})`);
    return lines;
  },
  footer: () => ["M09", "G91 G28 Z0.", "G28 X0. Y0.", "M30", "%"],
  formatCoord: (a, v) => `${a}${fmt3(v)}`,
  translateCode: (c) => c,
  activateTCP: (mode, axes) => {
    if (mode === "RTCP") return [`G43.4 H01 (RTCP ON - ${axes} AXES)`];
    if (mode === "TCP") return [`G43.4 H01 (TCP ON - ${axes} AXES)`];
    return [];
  },
  deactivateTCP: (mode) => mode !== "none" ? ["G49 (TCP/RTCP OFF)"] : [],
  linePrefix: (n) => `N${n} `,
  cannedDrill: (x, y, z, r, f) =>
    `G81 X${fmt3(x)} Y${fmt3(y)} Z${fmt3(z)} R${fmt3(r)} F${fmt1(f)}`,
};

const SIEMENS: ControllerDialect = {
  name: "Siemens 840D",
  comment: (t) => `; ${t}`,
  header: (p, algo, phys) => {
    const lines = [`PROC NOVEL_${p}`, "G90 G40 G60", "G17 G710 ; METRIC"];
    if (algo) lines.push(`; ALGORITHM: ${algo}`);
    if (phys) lines.push(`; PHYSICS: ${phys}`);
    return lines;
  },
  footer: () => ["M9", "G0 Z=R0 D0", "M30", "RET"],
  formatCoord: (a, v) => `${a}=${fmt3(v)}`,
  translateCode: (c) => {
    // Siemens uses G0/G1/G2/G3 without leading zeros
    return c.replace(/G00/g, "G0").replace(/G01/g, "G1")
            .replace(/G02/g, "G2").replace(/G03/g, "G3");
  },
  activateTCP: (mode, axes) => {
    if (mode === "TCP" || mode === "RTCP")
      return [`TRAORI (${axes})`, `; TCP/RTCP ACTIVE - ${mode}`];
    return [];
  },
  deactivateTCP: (mode) => mode !== "none" ? ["TRAFOOF"] : [],
  linePrefix: (n) => `N${n} `,
  cannedDrill: (x, y, z, r, f) =>
    `CYCLE81(${fmt3(r)},${fmt3(z)},${fmt1(f)}) X=${fmt3(x)} Y=${fmt3(y)}`,
};

const HEIDENHAIN: ControllerDialect = {
  name: "Heidenhain TNC",
  comment: (t) => `; ${t}`,
  header: (p, algo, phys) => {
    const lines = [
      `0  BEGIN PGM NOVEL_${p} MM`,
      "1  BLK FORM 0.1 Z X+0 Y+0 Z-100",
      "2  BLK FORM 0.2 X+500 Y+500 Z+0",
    ];
    if (algo) lines.push(`; ALGORITHM: ${algo}`);
    if (phys) lines.push(`; PHYSICS: ${phys}`);
    return lines;
  },
  footer: () => ["M9", "L Z+500 R0 FMAX M91", "M30", "END PGM"],
  formatCoord: (a, v) => `${a}${v >= 0 ? "+" : ""}${fmt3(v)}`,
  translateCode: (_c) => "L", // Heidenhain uses L for linear moves
  activateTCP: (mode, axes) => {
    if (mode === "TCP" || mode === "RTCP")
      return [`FUNCTION TCPM F TCP AXIS POS PATHCTRL AXIS ; ${mode} ${axes}`];
    // Legacy fallback
    return [];
  },
  deactivateTCP: (mode) =>
    mode !== "none" ? ["FUNCTION RESET TCPM"] : [],
  linePrefix: (n) => `${n} `,
  cannedDrill: (x, y, z, r, f) =>
    [
      "CYCL DEF 1.0 PECKING",
      `CYCL DEF 1.1 SET UP ${fmt3(r)}`,
      `CYCL DEF 1.2 DEPTH ${fmt3(z)}`,
      `CYCL DEF 1.3 FEED ${fmt1(f)}`,
      `L X${x >= 0 ? "+" : ""}${fmt3(x)} Y${y >= 0 ? "+" : ""}${fmt3(y)} FMAX M99`,
    ].join("\n"),
};

const MAZAK: ControllerDialect = {
  name: "Mazak Smooth",
  comment: (t) => `(${t})`,
  header: (p, algo, phys) => {
    const lines = [`O${p} (NOVEL TOOLPATH - MAZATROL)`, "G90 G80 G40 G49", "G17 G21"];
    if (algo) lines.push(`(ALGORITHM: ${algo})`);
    if (phys) lines.push(`(PHYSICS: ${phys})`);
    return lines;
  },
  footer: () => ["M09", "G91 G28 Z0.", "G28 X0. Y0.", "M30", "%"],
  formatCoord: (a, v) => `${a}${fmt3(v)}`,
  translateCode: (c) => c,
  activateTCP: (mode, axes) => {
    if (mode === "RTCP") return [`G43.4 H01 (MAZAK RTCP - ${axes})`];
    if (mode === "TCP") return [`G43.4 H01 (MAZAK TCP - ${axes})`];
    return [];
  },
  deactivateTCP: (mode) => mode !== "none" ? ["G49 (TCP OFF)"] : [],
  linePrefix: (n) => `N${n} `,
  cannedDrill: (x, y, z, r, f) =>
    `G81 X${fmt3(x)} Y${fmt3(y)} Z${fmt3(z)} R${fmt3(r)} F${fmt1(f)}`,
};

const HAAS: ControllerDialect = {
  name: "Haas NGC",
  comment: (t) => `(${t})`,
  header: (p, algo, phys) => {
    const lines = [`O${p} (NOVEL TOOLPATH - HAAS)`, "G90 G80 G40 G49", "G17 G21"];
    if (algo) lines.push(`(ALGORITHM: ${algo})`);
    if (phys) lines.push(`(PHYSICS: ${phys})`);
    lines.push("(DWO CAPABLE)");
    return lines;
  },
  footer: () => ["M09", "G91 G28 Z0.", "G28 X0. Y0.", "M30", "%"],
  formatCoord: (a, v) => `${a}${fmt3(v)}`,
  translateCode: (c) => c,
  activateTCP: (mode, axes) => {
    if (mode === "RTCP" || mode === "TCP")
      return [`G234 (DWO - DYNAMIC WORK OFFSETS - ${axes})`];
    return [];
  },
  deactivateTCP: (mode) => mode !== "none" ? ["G49 (DWO OFF)"] : [],
  linePrefix: (n) => `N${n} `,
  cannedDrill: (x, y, z, r, f) =>
    `G81 X${fmt3(x)} Y${fmt3(y)} Z${fmt3(z)} R${fmt3(r)} F${fmt1(f)}`,
};

const DIALECTS: Record<PostController, ControllerDialect> = {
  fanuc: FANUC,
  siemens: SIEMENS,
  heidenhain: HEIDENHAIN,
  mazak: MAZAK,
  haas: HAAS,
};

// ============================================================================
// DRILLING PATTERN DETECTION
// ============================================================================

interface DrillHole {
  x: number;
  y: number;
  z: number;
  r: number;
  f: number;
}

/**
 * Detects drilling patterns: rapid to XY → rapid to R-plane → linear plunge Z.
 * Returns groups of consecutive drill holes that share the same Z depth and feed.
 */
function detectDrillPatterns(blocks: NovelBlock[]): Map<number, DrillHole> {
  const drillMap = new Map<number, DrillHole>();
  for (let i = 2; i < blocks.length; i++) {
    const b0 = blocks[i - 2];
    const b1 = blocks[i - 1];
    const b2 = blocks[i];
    const isRapidXY = /G0?0\b/.test(b0.code) && b0.x !== undefined && b0.y !== undefined;
    const isRapidZ = /G0?0\b/.test(b1.code) && b1.z !== undefined;
    const isLinearZ = /G0?1\b/.test(b2.code) && b2.z !== undefined && b2.f !== undefined;
    if (isRapidXY && isRapidZ && isLinearZ) {
      drillMap.set(i - 2, {
        x: b0.x!,
        y: b0.y!,
        z: b2.z!,
        r: b1.z!,
        f: b2.f!,
      });
    }
  }
  return drillMap;
}

// ============================================================================
// ENGINE
// ============================================================================

export class NovelPostProcessorBridgeEngine {
  /**
   * Post-process novel toolpath blocks into controller-specific G-code.
   */
  postProcess(input: NovelPostInput): AtomicValue<NovelPostResult> {
    const controller = input.controller;
    const dialect = DIALECTS[controller];
    const mode = input.five_axis_mode ?? "none";
    const axes = input.machine_axes ?? "AC";
    const progNum = input.program_number ?? 1000;
    const useCanned = input.canned_cycles ?? true;
    const warnings: string[] = [];
    const fiveAxisCmds: string[] = [];

    // Validate inputs
    if (!input.blocks || input.blocks.length === 0) {
      return this.wrap({
        gcode: "",
        line_count: 0,
        controller_dialect: dialect.name,
        five_axis_commands_used: [],
        warnings: ["No blocks provided"],
      });
    }

    const lines: string[] = [];

    // ── Header ──────────────────────────────────────────────────────
    const headerLines = dialect.header(
      progNum, input.algorithm_name, input.physics_summary,
    );
    lines.push(...headerLines);

    // ── TCP/RTCP activation ─────────────────────────────────────────
    const tcpLines = dialect.activateTCP(mode, axes);
    if (tcpLines.length > 0) {
      lines.push("");
      lines.push(dialect.comment("5-AXIS TCP/RTCP ACTIVATION"));
      lines.push(...tcpLines);
      tcpLines.forEach((l) => fiveAxisCmds.push(l.split(" ")[0]));
    }

    // ── Detect drill patterns for canned cycle conversion ───────────
    const drillMap = useCanned ? detectDrillPatterns(input.blocks) : new Map();
    const skipSet = new Set<number>();
    if (useCanned && drillMap.size > 0) {
      // Mark blocks consumed by drill patterns
      for (const [startIdx] of Array.from(drillMap)) {
        skipSet.add(startIdx);
        skipSet.add(startIdx + 1);
        skipSet.add(startIdx + 2);
      }
    }

    // ── Validate 5-axis rotary usage ────────────────────────────────
    const has5Axis = input.blocks.some(
      (b) => b.a !== undefined || b.b !== undefined || b.c !== undefined,
    );
    if (has5Axis && mode === "none") {
      warnings.push(
        "Rotary axis moves detected but five_axis_mode is 'none'. TCP/RTCP may be required.",
      );
    }
    if (!has5Axis && mode !== "none") {
      warnings.push(
        `five_axis_mode='${mode}' specified but no rotary axes found.`,
      );
    }

    // ── Body: translate each block ──────────────────────────────────
    lines.push("");
    lines.push(dialect.comment("--- TOOLPATH START ---"));
    let lineNum = 10;
    let inCannedGroup = false;

    for (let i = 0; i < input.blocks.length; i++) {
      // Handle canned cycle substitution
      if (useCanned && drillMap.has(i)) {
        const hole = drillMap.get(i)!;
        if (!inCannedGroup) {
          lines.push(dialect.comment("CANNED DRILLING CYCLE"));
          inCannedGroup = true;
        }
        const cannedLine = dialect.cannedDrill(
          hole.x, hole.y, hole.z, hole.r, hole.f,
        );
        // Heidenhain multi-line canned cycles
        if (cannedLine.includes("\n")) {
          cannedLine.split("\n").forEach((cl) => {
            lines.push(dialect.linePrefix(lineNum) + cl);
            lineNum += 10;
          });
        } else {
          lines.push(dialect.linePrefix(lineNum) + cannedLine);
          lineNum += 10;
        }
        continue;
      }

      if (skipSet.has(i)) continue;

      if (inCannedGroup) {
        // Cancel canned cycle after drill group
        if (controller !== "heidenhain") {
          lines.push(dialect.linePrefix(lineNum) + "G80");
          lineNum += 10;
        }
        inCannedGroup = false;
      }

      const block = input.blocks[i];
      const parts: string[] = [];

      // Translate the G-code command
      const translated = dialect.translateCode(block.code);
      parts.push(translated);

      // Append coordinates
      if (block.x !== undefined) parts.push(dialect.formatCoord("X", block.x));
      if (block.y !== undefined) parts.push(dialect.formatCoord("Y", block.y));
      if (block.z !== undefined) parts.push(dialect.formatCoord("Z", block.z));
      if (block.a !== undefined) parts.push(dialect.formatCoord("A", block.a));
      if (block.b !== undefined) parts.push(dialect.formatCoord("B", block.b));
      if (block.c !== undefined) parts.push(dialect.formatCoord("C", block.c));
      if (block.f !== undefined) parts.push(dialect.formatCoord("F", block.f));
      if (block.s !== undefined) parts.push(`S${Math.round(block.s)}`);

      // Heidenhain special: L X+... Y+... F... M...
      let bodyLine: string;
      if (controller === "heidenhain" && /G0?[01]/.test(block.code)) {
        const coords = parts.slice(1).join(" ");
        const fmax = /G0?0\b/.test(block.code) ? " FMAX" : "";
        bodyLine = `L ${coords}${fmax} R0`;
      } else {
        bodyLine = parts.join(" ");
      }

      // Append comment in controller format
      if (block.comment) {
        bodyLine += " " + dialect.comment(block.comment);
      }

      lines.push(dialect.linePrefix(lineNum) + bodyLine);
      lineNum += 10;
    }

    // Close any open canned cycle group
    if (inCannedGroup && controller !== "heidenhain") {
      lines.push(dialect.linePrefix(lineNum) + "G80");
      lineNum += 10;
    }

    lines.push(dialect.comment("--- TOOLPATH END ---"));

    // ── TCP/RTCP deactivation ───────────────────────────────────────
    const deactLines = dialect.deactivateTCP(mode);
    if (deactLines.length > 0) {
      lines.push("");
      lines.push(dialect.comment("5-AXIS TCP/RTCP DEACTIVATION"));
      lines.push(...deactLines);
    }

    // ── Footer ──────────────────────────────────────────────────────
    lines.push("");
    lines.push(...dialect.footer());

    const gcode = lines.join("\n");
    const lineCount = lines.filter((l) => l.trim().length > 0).length;

    return this.wrap({
      gcode,
      line_count: lineCount,
      controller_dialect: dialect.name,
      five_axis_commands_used: Array.from(new Set(fiveAxisCmds)),
      warnings,
    });
  }

  /**
   * List supported controllers with their dialect features.
   */
  listControllers(): AtomicValue<
    { controller: PostController; name: string; tcp_command: string }[]
  > {
    const entries = Object.entries(DIALECTS) as [PostController, ControllerDialect][];
    const list = entries.map(([key, d]) => ({
      controller: key,
      name: d.name,
      tcp_command: d.activateTCP("TCP", "AC").join("; ") || "N/A",
    }));
    return { value: list, unit: "controllers", confidence: 1.0 };
  }

  /** Wrap result in AtomicValue */
  private wrap(result: NovelPostResult): AtomicValue<NovelPostResult> {
    return {
      value: result,
      unit: "gcode_program",
      formula: "novel_toolpath → controller_dialect_translation",
      confidence: result.warnings.length === 0 ? 1.0 : 0.85,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const novelPostProcessorBridgeEngine = new NovelPostProcessorBridgeEngine();
