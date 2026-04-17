/**
 * WEDMPostDialectRouterEngine — Multi-controller Wire EDM post processor router
 *
 * Routes WEDM programs to the appropriate controller dialect:
 *   - Mitsubishi FA/MV series
 *   - Sodick AQ/AL series
 *   - Makino U/EU series
 *   - AgieCharmilles CUT series
 *   - Fanuc ROBOCUT series
 *
 * Each dialect has specific:
 *   - M-codes (machine functions)
 *   - E-codes (energy/power settings) [Sodick, Makino]
 *   - C-codes (condition tables) [Agie, Makino]
 *   - Wire offset conventions
 *   - Submerged cutting codes
 *   - Taper cutting commands
 *
 * MS-P1.5-ONESHOT/U-P1.5-OS-04
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type WEDMController =
  | "mitsubishi_fa" | "mitsubishi_mv"
  | "sodick_aq" | "sodick_al"
  | "makino_u" | "makino_eu"
  | "agie_cut" | "agie_charm"
  | "fanuc_robocut";

export interface WEDMPostInput {
  controller: WEDMController;
  program_number?: string;
  part_description?: string;
  material?: string;
  thickness_mm: number;
  wire_diameter_mm?: number;
  operations: WEDMOperation[];
  units?: "metric" | "imperial";
  machine_model?: string;
}

export interface WEDMOperation {
  type: "profile" | "taper" | "no_core" | "open_path";
  pass: "rough" | "skim1" | "skim2" | "skim3";
  start_x?: number;
  start_y?: number;
  profile_points?: Array<{ x: number; y: number; u?: number; v?: number }>;
  power_setting?: number;
  on_time_us?: number;
  off_time_us?: number;
  wire_speed_m_min?: number;
  wire_tension_g?: number;
  servo_voltage_v?: number;
  flushing_pressure?: number;
  taper_angle_deg?: number;
  taper_height_mm?: number;
  offset_mm?: number;
  offset_direction?: "left" | "right";
  submerged?: boolean;
  auto_thread?: boolean;
}

export interface WEDMPostOutput {
  success: boolean;
  controller: WEDMController;
  dialect_name: string;
  gcode_lines: string[];
  gcode_text: string;
  line_count: number;
  operation_count: number;
  warnings: string[];
  dialect_specific: Record<string, unknown>;
}

// ══════════════════════════════════════════════════════════════════════════════
// DIALECT DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

interface DialectConfig {
  name: string;
  manufacturer: string;
  wire_thread: string;
  wire_cut: string;
  submerge_on: string;
  submerge_off: string;
  taper_on: string;
  taper_off: string;
  offset_left: string;
  offset_right: string;
  offset_cancel: string;
  program_start: string;
  program_end: string;
  coord_format: { decimals_mm: number; decimals_in: number };
  uses_e_codes: boolean;
  uses_c_codes: boolean;
  power_format: (power: number, on: number, off: number) => string;
  wire_format: (speed: number, tension: number) => string;
}

const DIALECTS: Record<WEDMController, DialectConfig> = {
  // ── Mitsubishi FA/MV Series ──────────────────────────────────────────
  mitsubishi_fa: {
    name: "Mitsubishi FA",
    manufacturer: "Mitsubishi Electric",
    wire_thread: "M6",
    wire_cut: "M7",
    submerge_on: "M28",
    submerge_off: "M29",
    taper_on: "G51",
    taper_off: "G50",
    offset_left: "G41",
    offset_right: "G42",
    offset_cancel: "G40",
    program_start: "%",
    program_end: "M2\n%",
    coord_format: { decimals_mm: 3, decimals_in: 5 },
    uses_e_codes: false,
    uses_c_codes: false,
    power_format: (p, on, off) => `(POWER=${p} ON=${on}us OFF=${off}us)`,
    wire_format: (speed, tension) => `(WIRE: ${speed}m/min TENSION=${tension}g)`,
  },
  mitsubishi_mv: {
    name: "Mitsubishi MV",
    manufacturer: "Mitsubishi Electric",
    wire_thread: "M6",
    wire_cut: "M7",
    submerge_on: "M28",
    submerge_off: "M29",
    taper_on: "G51",
    taper_off: "G50",
    offset_left: "G41",
    offset_right: "G42",
    offset_cancel: "G40",
    program_start: "%",
    program_end: "M2\n%",
    coord_format: { decimals_mm: 3, decimals_in: 5 },
    uses_e_codes: false,
    uses_c_codes: false,
    power_format: (p, on, off) => `(POWER=${p} ON=${on}us OFF=${off}us)`,
    wire_format: (speed, tension) => `(WIRE: ${speed}m/min TENSION=${tension}g)`,
  },

  // ── Sodick AQ/AL Series ──────────────────────────────────────────────
  sodick_aq: {
    name: "Sodick AQ",
    manufacturer: "Sodick",
    wire_thread: "M50",
    wire_cut: "M51",
    submerge_on: "M78",
    submerge_off: "M79",
    taper_on: "G51",
    taper_off: "G50",
    offset_left: "G41",
    offset_right: "G42",
    offset_cancel: "G40",
    program_start: "%",
    program_end: "M30\n%",
    coord_format: { decimals_mm: 3, decimals_in: 5 },
    uses_e_codes: true,
    uses_c_codes: false,
    power_format: (p, on, off) => `E${p.toString().padStart(2, "0")} (ON=${on}us OFF=${off}us)`,
    wire_format: (speed, tension) => `(WIRE: F${speed} T${tension})`,
  },
  sodick_al: {
    name: "Sodick AL",
    manufacturer: "Sodick",
    wire_thread: "M50",
    wire_cut: "M51",
    submerge_on: "M78",
    submerge_off: "M79",
    taper_on: "G51",
    taper_off: "G50",
    offset_left: "G41",
    offset_right: "G42",
    offset_cancel: "G40",
    program_start: "%",
    program_end: "M30\n%",
    coord_format: { decimals_mm: 3, decimals_in: 5 },
    uses_e_codes: true,
    uses_c_codes: false,
    power_format: (p, on, off) => `E${p.toString().padStart(2, "0")} (ON=${on}us OFF=${off}us)`,
    wire_format: (speed, tension) => `(WIRE: F${speed} T${tension})`,
  },

  // ── Makino U/EU Series ───────────────────────────────────────────────
  makino_u: {
    name: "Makino U",
    manufacturer: "Makino",
    wire_thread: "M06",
    wire_cut: "M07",
    submerge_on: "M21",
    submerge_off: "M22",
    taper_on: "G51",
    taper_off: "G50",
    offset_left: "G41",
    offset_right: "G42",
    offset_cancel: "G40",
    program_start: "%",
    program_end: "M02\n%",
    coord_format: { decimals_mm: 4, decimals_in: 5 },
    uses_e_codes: true,
    uses_c_codes: true,
    power_format: (p, on, off) => `E${p} C${Math.floor(on / 2)} (ON=${on}us OFF=${off}us)`,
    wire_format: (speed, tension) => `(WF${speed} WT${tension})`,
  },
  makino_eu: {
    name: "Makino EU",
    manufacturer: "Makino",
    wire_thread: "M06",
    wire_cut: "M07",
    submerge_on: "M21",
    submerge_off: "M22",
    taper_on: "G51",
    taper_off: "G50",
    offset_left: "G41",
    offset_right: "G42",
    offset_cancel: "G40",
    program_start: "%",
    program_end: "M02\n%",
    coord_format: { decimals_mm: 4, decimals_in: 5 },
    uses_e_codes: true,
    uses_c_codes: true,
    power_format: (p, on, off) => `E${p} C${Math.floor(on / 2)} (ON=${on}us OFF=${off}us)`,
    wire_format: (speed, tension) => `(WF${speed} WT${tension})`,
  },

  // ── AgieCharmilles CUT Series ────────────────────────────────────────
  agie_cut: {
    name: "AgieCharmilles CUT",
    manufacturer: "GF Machining Solutions",
    wire_thread: "M20",
    wire_cut: "M21",
    submerge_on: "M24",
    submerge_off: "M25",
    taper_on: "G08",
    taper_off: "G09",
    offset_left: "G41",
    offset_right: "G42",
    offset_cancel: "G40",
    program_start: "%PM",
    program_end: "M17\n%",
    coord_format: { decimals_mm: 3, decimals_in: 5 },
    uses_e_codes: false,
    uses_c_codes: true,
    power_format: (p, on, off) => `C${p.toString().padStart(3, "0")} (P=${on}/${off}us)`,
    wire_format: (speed, tension) => `(WIRE SPD=${speed} TEN=${tension})`,
  },
  agie_charm: {
    name: "AgieCharmilles Charm",
    manufacturer: "GF Machining Solutions",
    wire_thread: "M20",
    wire_cut: "M21",
    submerge_on: "M24",
    submerge_off: "M25",
    taper_on: "G08",
    taper_off: "G09",
    offset_left: "G41",
    offset_right: "G42",
    offset_cancel: "G40",
    program_start: "%PM",
    program_end: "M17\n%",
    coord_format: { decimals_mm: 3, decimals_in: 5 },
    uses_e_codes: false,
    uses_c_codes: true,
    power_format: (p, on, off) => `C${p.toString().padStart(3, "0")} (P=${on}/${off}us)`,
    wire_format: (speed, tension) => `(WIRE SPD=${speed} TEN=${tension})`,
  },

  // ── Fanuc ROBOCUT Series ─────────────────────────────────────────────
  fanuc_robocut: {
    name: "Fanuc ROBOCUT",
    manufacturer: "Fanuc",
    wire_thread: "M60",
    wire_cut: "M61",
    submerge_on: "M50",
    submerge_off: "M51",
    taper_on: "G51.1",
    taper_off: "G50.1",
    offset_left: "G41",
    offset_right: "G42",
    offset_cancel: "G40",
    program_start: "%",
    program_end: "M30\n%",
    coord_format: { decimals_mm: 3, decimals_in: 5 },
    uses_e_codes: false,
    uses_c_codes: false,
    power_format: (p, on, off) => `(PWR=${p} TON=${on} TOFF=${off})`,
    wire_format: (speed, tension) => `(WIRE: SPEED=${speed} TENS=${tension})`,
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// PASS DEFAULTS
// ══════════════════════════════════════════════════════════════════════════════

interface PassDefaults {
  power: number;
  on_us: number;
  off_us: number;
  wire_speed: number;
  wire_tension: number;
  servo_v: number;
  flushing: number;
}

const PASS_DEFAULTS: Record<string, PassDefaults> = {
  rough: { power: 12, on_us: 8, off_us: 20, wire_speed: 12, wire_tension: 1200, servo_v: 50, flushing: 10 },
  skim1: { power: 6, on_us: 4, off_us: 12, wire_speed: 8, wire_tension: 800, servo_v: 40, flushing: 5 },
  skim2: { power: 3, on_us: 2, off_us: 8, wire_speed: 6, wire_tension: 600, servo_v: 35, flushing: 3 },
  skim3: { power: 1, on_us: 1, off_us: 6, wire_speed: 4, wire_tension: 500, servo_v: 30, flushing: 2 },
};

// ══════════════════════════════════════════════════════════════════════════════
// ENGINE
// ══════════════════════════════════════════════════════════════════════════════

export class WEDMPostDialectRouterEngine {
  readonly name = "WEDMPostDialectRouterEngine";
  readonly version = "1.0.0";

  /**
   * Get list of supported controllers
   */
  getSupportedControllers(): WEDMController[] {
    return Object.keys(DIALECTS) as WEDMController[];
  }

  /**
   * Get dialect configuration for a controller
   */
  getDialectConfig(controller: WEDMController): DialectConfig | undefined {
    return DIALECTS[controller];
  }

  /**
   * Generate G-code for the specified controller dialect
   */
  generate(input: WEDMPostInput): WEDMPostOutput {
    const dialect = DIALECTS[input.controller];
    if (!dialect) {
      return {
        success: false,
        controller: input.controller,
        dialect_name: "UNKNOWN",
        gcode_lines: [],
        gcode_text: "",
        line_count: 0,
        operation_count: 0,
        warnings: [`Unsupported controller: ${input.controller}`],
        dialect_specific: {},
      };
    }

    const lines: string[] = [];
    const warnings: string[] = [];
    const progNum = input.program_number ?? "0001";
    const isImperial = input.units === "imperial";
    const decimals = isImperial ? dialect.coord_format.decimals_in : dialect.coord_format.decimals_mm;
    const scale = isImperial ? 1.0 / 25.4 : 1.0;

    // ── Header ──
    lines.push(dialect.program_start);
    lines.push(`O${progNum}`);
    lines.push(`(${input.part_description ?? "WIRE EDM PROGRAM"})`);
    lines.push(`(CONTROLLER: ${dialect.name} — ${dialect.manufacturer})`);
    lines.push(`(MATERIAL: ${input.material ?? "TOOL STEEL"} | THICKNESS: ${input.thickness_mm}mm)`);
    lines.push(`(WIRE: ${input.wire_diameter_mm ?? 0.25}mm)`);
    lines.push(`(GENERATED BY PRISM WEDM POST ROUTER)`);
    lines.push(``);

    // ── Setup ──
    const unitCode = isImperial ? "G20" : "G21";
    const unitLabel = isImperial ? "INCH" : "METRIC";
    lines.push(`G90 ${unitCode} (ABSOLUTE, ${unitLabel})`);
    lines.push(`G92 X0 Y0 (SET WORK COORDS)`);

    if (input.thickness_mm > 100) {
      warnings.push(`Thickness ${input.thickness_mm}mm exceeds 100mm — verify flushing and wire tension`);
    }

    // ── Operations ──
    for (let i = 0; i < input.operations.length; i++) {
      const op = input.operations[i];
      const defaults = PASS_DEFAULTS[op.pass] ?? PASS_DEFAULTS.rough;

      const power = op.power_setting ?? defaults.power;
      const onTime = op.on_time_us ?? defaults.on_us;
      const offTime = op.off_time_us ?? defaults.off_us;
      const wireSpeed = op.wire_speed_m_min ?? defaults.wire_speed;
      const wireTension = op.wire_tension_g ?? defaults.wire_tension;
      const offset = op.offset_mm ?? 0.15;

      lines.push(``);
      lines.push(`(--- PASS ${i + 1}: ${op.pass.toUpperCase()} ${op.type.toUpperCase()} ---)`);

      // Power/condition settings
      lines.push(dialect.power_format(power, onTime, offTime));
      lines.push(dialect.wire_format(wireSpeed, wireTension));

      // Wire thread
      if (op.auto_thread !== false) {
        lines.push(`${dialect.wire_thread} (AUTO WIRE THREAD)`);
      }

      // Submerged mode
      if (op.submerged !== false) {
        lines.push(`${dialect.submerge_on} (SUBMERGED CUT)`);
      }

      // Wire offset
      const offsetCode = op.offset_direction === "right" ? dialect.offset_right : dialect.offset_left;
      const offsetVal = (offset * 1000).toFixed(0);
      lines.push(`${offsetCode} D${offsetVal} (WIRE OFFSET ${offset.toFixed(3)}mm)`);

      // Start position
      if (op.start_x !== undefined && op.start_y !== undefined) {
        const x = (op.start_x * scale).toFixed(decimals);
        const y = (op.start_y * scale).toFixed(decimals);
        lines.push(`G0 X${x} Y${y} (START POSITION)`);
      }

      // Taper setup
      if (op.type === "taper" && op.taper_angle_deg) {
        lines.push(`${dialect.taper_on} (TAPER ON — ${op.taper_angle_deg}°)`);
      }

      // Profile cutting
      if (op.profile_points && op.profile_points.length > 0) {
        for (const pt of op.profile_points) {
          let line = `G1 X${(pt.x * scale).toFixed(decimals)} Y${(pt.y * scale).toFixed(decimals)}`;
          if (pt.u !== undefined && pt.v !== undefined) {
            line += ` U${(pt.u * scale).toFixed(decimals)} V${(pt.v * scale).toFixed(decimals)}`;
          }
          lines.push(line);
        }
      } else {
        lines.push(`(... profile geometry here ...)`);
      }

      // Cancel taper
      if (op.type === "taper") {
        lines.push(`${dialect.taper_off} (TAPER OFF)`);
      }

      // Cancel offset
      lines.push(`${dialect.offset_cancel} (CANCEL OFFSET)`);

      // Wire cut
      lines.push(`${dialect.wire_cut} (WIRE CUT)`);

      // Drain if submerged
      if (op.submerged !== false) {
        lines.push(`${dialect.submerge_off} (DRAIN)`);
      }
    }

    // ── Footer ──
    lines.push(``);
    lines.push(`G92 X0 Y0 (RETURN HOME)`);
    lines.push(dialect.program_end);

    const gcodeText = lines.join("\n");

    return {
      success: true,
      controller: input.controller,
      dialect_name: dialect.name,
      gcode_lines: lines,
      gcode_text: gcodeText,
      line_count: lines.length,
      operation_count: input.operations.length,
      warnings,
      dialect_specific: {
        uses_e_codes: dialect.uses_e_codes,
        uses_c_codes: dialect.uses_c_codes,
        manufacturer: dialect.manufacturer,
      },
    };
  }

  /**
   * Route to specific dialect post processor
   */
  route(input: WEDMPostInput): WEDMPostOutput {
    return this.generate(input);
  }

  /**
   * Convert program from one dialect to another
   */
  convert(
    sourceDialect: WEDMController,
    targetDialect: WEDMController,
    input: WEDMPostInput
  ): { source: WEDMPostOutput; target: WEDMPostOutput } {
    const source = this.generate({ ...input, controller: sourceDialect });
    const target = this.generate({ ...input, controller: targetDialect });
    return { source, target };
  }
}

export const wedmPostDialectRouterEngine = new WEDMPostDialectRouterEngine();
