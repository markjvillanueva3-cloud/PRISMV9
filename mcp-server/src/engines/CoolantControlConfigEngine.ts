/**
 * CoolantControlConfigEngine — Per-machine coolant M-code & sequencing configuration
 *
 * Maps controller family → complete coolant control configuration including:
 * - M-codes for all coolant modes (flood, TSC, mist, air blast, MQL, cryogenic)
 * - Pressure/flow parameters per machine capability
 * - Coolant-on delay timing per controller family
 * - Coolant sequencing templates (pre-cut, during-cut, post-cut, chip clear)
 * - Chip conveyor M-codes per machine type
 *
 * Distinct from CoolantStrategyEngine (recommends fluid type/concentration) and
 * CoolantValidationEngine (validates coolant adequacy). This engine provides the
 * G-code DIALECT layer — what codes to emit in the post processor output.
 *
 * References: Machinery's Handbook 31st ed., controller manufacturer programming manuals,
 *   Fanuc Operator's Manual B-64484EN, Siemens SINUMERIK 840D programming guide,
 *   Heidenhain TNC 640 user manual, Haas Mill Operator's Manual
 *
 * @module engines/CoolantControlConfigEngine
 * @version 1.0.0
 */

import type { ControllerFamily } from "./ControllerDialectEngine.js";

// ─── Types ───────────────────────────────────────────────────────────

export type CoolantMode =
  | "flood"
  | "mist"
  | "tsc"          // Through-Spindle Coolant
  | "air_blast"
  | "mql"          // Minimum Quantity Lubrication
  | "cryogenic"    // LN2 or CO2
  | "chip_conveyor"
  | "off";

export interface CoolantMCode {
  /** M-code string, e.g. "M8" */
  code: string;
  /** Human-readable label */
  label: string;
  /** Whether this mode requires optional equipment */
  requires_option?: boolean;
  /** Pressure parameter (bar) — null if not adjustable */
  pressure_bar?: { min: number; max: number; default: number } | null;
  /** Flow rate parameter (L/min) — null if not adjustable */
  flow_lpm?: { min: number; max: number; default: number } | null;
  /** Coolant-on delay (ms) — time to wait after issuing M-code before cutting */
  on_delay_ms: number;
  /** Off code — usually M9 but some controllers differ */
  off_code: string;
}

export interface CoolantSequenceTemplate {
  /** Lines to emit before first cut (coolant startup) */
  pre_cut: string[];
  /** Lines to emit at each tool change (coolant management) */
  tool_change: string[];
  /** Lines to emit after last cut (coolant shutdown) */
  post_cut: string[];
  /** Lines for chip clearing between operations */
  chip_clear: string[];
}

export interface CoolantControlConfig {
  controller_family: ControllerFamily;
  /** All available coolant modes for this controller */
  modes: Partial<Record<CoolantMode, CoolantMCode>>;
  /** Sequencing templates for G-code output */
  sequence: CoolantSequenceTemplate;
  /** Whether controller supports coolant pressure programming (e.g., Fanuc M-code + pressure register) */
  programmable_pressure: boolean;
  /** Whether controller supports coolant flow programming */
  programmable_flow: boolean;
  /** Chip conveyor M-codes (if equipped) */
  chip_conveyor?: { forward: string; reverse: string; stop: string };
  /** Controller-specific notes */
  notes: string[];
  warnings: string[];
}

export interface CoolantControlConfigInput {
  controller_family: ControllerFamily;
  /** Machine has TSC capability */
  has_tsc?: boolean;
  /** Machine has MQL system */
  has_mql?: boolean;
  /** Machine has air blast */
  has_air_blast?: boolean;
  /** Machine has cryogenic system */
  has_cryogenic?: boolean;
  /** Machine has chip conveyor */
  has_chip_conveyor?: boolean;
  /** TSC max pressure in bar (overrides default) */
  tsc_max_pressure_bar?: number;
}

// ─── Coolant Config Database ─────────────────────────────────────────

interface ControllerCoolantDef {
  flood: { code: string; off: string; delay_ms: number };
  mist: { code: string; off: string; delay_ms: number };
  tsc?: { code: string; off: string; delay_ms: number; pressure?: { min: number; max: number; default: number } };
  air_blast?: { code: string; off: string; delay_ms: number };
  mql?: { code: string; off: string; delay_ms: number; flow?: { min: number; max: number; default: number } };
  cryogenic?: { code: string; off: string; delay_ms: number };
  chip_conveyor?: { fwd: string; rev: string; stop: string };
  programmable_pressure: boolean;
  programmable_flow: boolean;
  notes: string[];
}

/**
 * Controller-family coolant M-code database.
 * Sources: Fanuc B-64484EN, Siemens 840D PG, Heidenhain TNC640 UM,
 *          Haas Mill OM, Mazak Smooth programming guide, Okuma OSP manual
 */
const COOLANT_DB: Partial<Record<ControllerFamily, ControllerCoolantDef>> = {
  fanuc_0i: {
    flood: { code: "M8", off: "M9", delay_ms: 500 },
    mist: { code: "M7", off: "M9", delay_ms: 300 },
    tsc: { code: "M50", off: "M9", delay_ms: 800, pressure: { min: 10, max: 70, default: 30 } },
    air_blast: { code: "M51", off: "M9", delay_ms: 200 },
    programmable_pressure: false,
    programmable_flow: false,
    notes: ["Fanuc 0i: M50 for TSC varies by builder — check machine manual", "M51 air blast is builder-defined"]
  },
  fanuc_16i: {
    flood: { code: "M8", off: "M9", delay_ms: 500 },
    mist: { code: "M7", off: "M9", delay_ms: 300 },
    tsc: { code: "M50", off: "M9", delay_ms: 800, pressure: { min: 10, max: 70, default: 30 } },
    air_blast: { code: "M51", off: "M9", delay_ms: 200 },
    programmable_pressure: false,
    programmable_flow: false,
    notes: ["Same M-code set as Fanuc 0i but faster block processing"]
  },
  fanuc_30i: {
    flood: { code: "M8", off: "M9", delay_ms: 400 },
    mist: { code: "M7", off: "M9", delay_ms: 300 },
    tsc: { code: "M50", off: "M9", delay_ms: 700, pressure: { min: 10, max: 70, default: 40 } },
    air_blast: { code: "M51", off: "M9", delay_ms: 200 },
    mql: { code: "M7.1", off: "M9", delay_ms: 1000, flow: { min: 5, max: 50, default: 20 } },
    programmable_pressure: true,
    programmable_flow: true,
    notes: [
      "Fanuc 30i supports programmable coolant pressure via macro variable #7100",
      "MQL M7.1 is a builder-defined option — not all Fanuc 30i machines support decimal M-codes. Verify with machine manual"
    ]
  },
  fanuc_31i: {
    flood: { code: "M8", off: "M9", delay_ms: 400 },
    mist: { code: "M7", off: "M9", delay_ms: 300 },
    tsc: { code: "M50", off: "M9", delay_ms: 700, pressure: { min: 10, max: 70, default: 40 } },
    air_blast: { code: "M51", off: "M9", delay_ms: 200 },
    mql: { code: "M7.1", off: "M9", delay_ms: 1000, flow: { min: 5, max: 50, default: 20 } },
    programmable_pressure: true,
    programmable_flow: true,
    notes: [
      "Same coolant capabilities as 30i",
      "Programmable pressure via #7100",
      "MQL M7.1 is a builder-defined option — not all Fanuc 31i machines support decimal M-codes. Verify with machine manual"
    ]
  },
  siemens_840d: {
    flood: { code: "M8", off: "M9", delay_ms: 300 },
    mist: { code: "M7", off: "M9", delay_ms: 300 },
    tsc: { code: "SPOS=0 M88", off: "M89", delay_ms: 1000, pressure: { min: 10, max: 80, default: 40 } },
    mql: { code: "M56", off: "M9", delay_ms: 800, flow: { min: 5, max: 100, default: 30 } },
    cryogenic: { code: "M57", off: "M9", delay_ms: 1500 },
    chip_conveyor: { fwd: "M58", rev: "M59", stop: "M9" },
    programmable_pressure: true,
    programmable_flow: true,
    notes: [
      "Siemens 840D: M88/M89 for TSC — requires spindle orientation (SPOS) first",
      "Coolant pressure programmable via R-parameter (e.g., R10=40.0 for 40 bar)",
      "M56 MQL and M57 cryogenic are machine-builder defined — verify with MTB",
      "Air blast is PLC/builder-defined on Siemens — no standard M-code (do NOT use M7, that is mist coolant per ISO 6983)"
    ]
  },
  siemens_828d: {
    flood: { code: "M8", off: "M9", delay_ms: 300 },
    mist: { code: "M7", off: "M9", delay_ms: 300 },
    tsc: { code: "SPOS=0 M88", off: "M89", delay_ms: 1000, pressure: { min: 10, max: 70, default: 30 } },
    programmable_pressure: false,
    programmable_flow: false,
    notes: [
      "828D has same M-codes as 840D but no programmable pressure (setting-based only)",
      "Air blast is PLC/builder-defined — no standard M-code (do NOT use M7, that is mist coolant per ISO 6983)"
    ]
  },
  siemens_one: {
    flood: { code: "M8", off: "M9", delay_ms: 300 },
    mist: { code: "M7", off: "M9", delay_ms: 300 },
    tsc: { code: "SPOS=0 M88", off: "M89", delay_ms: 800, pressure: { min: 10, max: 100, default: 50 } },
    mql: { code: "M56", off: "M9", delay_ms: 800, flow: { min: 5, max: 100, default: 30 } },
    cryogenic: { code: "M57", off: "M9", delay_ms: 1200 },
    chip_conveyor: { fwd: "M58", rev: "M59", stop: "M9" },
    programmable_pressure: true,
    programmable_flow: true,
    notes: [
      "SINUMERIK ONE: full coolant programmability, faster response than 840D",
      "Air blast is PLC/builder-defined — no standard M-code (do NOT use M7, that is mist coolant per ISO 6983)"
    ]
  },
  heidenhain_tnc640: {
    flood: { code: "M8", off: "M9", delay_ms: 400 },
    mist: { code: "M7", off: "M9", delay_ms: 300 },
    tsc: { code: "M88", off: "M89", delay_ms: 900, pressure: { min: 10, max: 80, default: 40 } },
    air_blast: { code: "M51", off: "M9", delay_ms: 200 },
    programmable_pressure: true,
    programmable_flow: false,
    notes: ["Heidenhain: M88/M89 for TSC, pressure via Q-parameter (QS-string or Q100+)"]
  },
  heidenhain_tnc7: {
    flood: { code: "M8", off: "M9", delay_ms: 400 },
    mist: { code: "M7", off: "M9", delay_ms: 300 },
    tsc: { code: "M88", off: "M89", delay_ms: 800, pressure: { min: 10, max: 100, default: 50 } },
    air_blast: { code: "M51", off: "M9", delay_ms: 200 },
    programmable_pressure: true,
    programmable_flow: true,
    notes: [
      "TNC7: improved coolant management over TNC640",
      "MQL requires builder-defined integer M-code (Heidenhain does not support decimal M-codes like M7.1)",
      "Use FUNCTION COOLANT syntax or builder-specific M-function for MQL"
    ]
  },
  haas_ngc: {
    flood: { code: "M8", off: "M9", delay_ms: 400 },
    mist: { code: "M7", off: "M9", delay_ms: 300 },
    tsc: { code: "M88", off: "M89", delay_ms: 1000, pressure: { min: 10, max: 70, default: 40 } },
    chip_conveyor: { fwd: "M31", rev: "M32", stop: "M33" },
    programmable_pressure: false,
    programmable_flow: false,
    notes: [
      "Haas: M88/M89 for TSC (P-Cool option required)",
      "Haas has no standard air blast M-code — shop-specific wiring required (do NOT use M13, that is Spindle CW + Coolant)",
      "M31/M32/M33 chip auger forward/reverse/stop",
      "Setting 32 = coolant override percentage"
    ]
  },
  mazak_smooth_ai: {
    flood: { code: "M8", off: "M9", delay_ms: 400 },
    mist: { code: "M7", off: "M9", delay_ms: 300 },
    tsc: { code: "M51", off: "M9", delay_ms: 800, pressure: { min: 10, max: 70, default: 40 } },
    air_blast: { code: "M28", off: "M9", delay_ms: 200 },
    chip_conveyor: { fwd: "M57", rev: "M58", stop: "M59" },
    programmable_pressure: true,
    programmable_flow: false,
    notes: [
      "Mazak Smooth: M51 for TSC (varies by model — M50/M51 common)",
      "M28 air blast is Mazak-specific",
      "M57/M58/M59 chip conveyor fwd/rev/stop (do NOT use M29=rigid tapping or M30=program end)",
      "Smooth Ai supports pressure programming via common variable #500+"
    ]
  },
  mazak_smooth_g: {
    flood: { code: "M8", off: "M9", delay_ms: 400 },
    mist: { code: "M7", off: "M9", delay_ms: 300 },
    tsc: { code: "M51", off: "M9", delay_ms: 800, pressure: { min: 10, max: 70, default: 30 } },
    air_blast: { code: "M28", off: "M9", delay_ms: 200 },
    chip_conveyor: { fwd: "M57", rev: "M58", stop: "M59" },
    programmable_pressure: false,
    programmable_flow: false,
    notes: [
      "Mazak Smooth G: same M-codes as Smooth Ai, no programmable pressure",
      "M57/M58/M59 chip conveyor fwd/rev/stop (do NOT use M29=rigid tapping or M30=program end)"
    ]
  },
  okuma_osp_p300: {
    flood: { code: "M8", off: "M9", delay_ms: 400 },
    mist: { code: "M7", off: "M9", delay_ms: 300 },
    tsc: { code: "M51", off: "M9", delay_ms: 800, pressure: { min: 10, max: 70, default: 30 } },
    air_blast: { code: "M52", off: "M9", delay_ms: 200 },
    programmable_pressure: false,
    programmable_flow: false,
    notes: ["Okuma OSP-P300: M51 TSC, M52 air blast — verify with machine manual"]
  },
  okuma_osp_p500: {
    flood: { code: "M8", off: "M9", delay_ms: 400 },
    mist: { code: "M7", off: "M9", delay_ms: 300 },
    tsc: { code: "M51", off: "M9", delay_ms: 700, pressure: { min: 10, max: 100, default: 40 } },
    air_blast: { code: "M52", off: "M9", delay_ms: 200 },
    mql: { code: "M53", off: "M9", delay_ms: 1000, flow: { min: 5, max: 50, default: 20 } },
    programmable_pressure: true,
    programmable_flow: true,
    notes: ["Okuma OSP-P500: full coolant programmability via common variables"]
  },
  brother_speedio: {
    flood: { code: "M8", off: "M9", delay_ms: 300 },
    mist: { code: "M7", off: "M9", delay_ms: 200 },
    tsc: { code: "M50", off: "M9", delay_ms: 600, pressure: { min: 10, max: 40, default: 20 } },
    air_blast: { code: "M51", off: "M9", delay_ms: 150 },
    programmable_pressure: false,
    programmable_flow: false,
    notes: ["Brother Speedio: fast tool change (0.9s) — short coolant delay tolerated", "TSC limited to 40 bar"]
  },
  mitsubishi_m80: {
    flood: { code: "M8", off: "M9", delay_ms: 400 },
    mist: { code: "M7", off: "M9", delay_ms: 300 },
    tsc: { code: "M50", off: "M9", delay_ms: 800, pressure: { min: 10, max: 70, default: 30 } },
    air_blast: { code: "M51", off: "M9", delay_ms: 200 },
    programmable_pressure: false,
    programmable_flow: false,
    notes: ["Mitsubishi M80: standard Fanuc-compatible coolant M-codes"]
  },
  citizen_cincom: {
    flood: { code: "M8", off: "M9", delay_ms: 300 },
    mist: { code: "M7", off: "M9", delay_ms: 200 },
    tsc: { code: "M88", off: "M89", delay_ms: 600, pressure: { min: 10, max: 40, default: 20 } },
    air_blast: { code: "M12", off: "M9", delay_ms: 150 },
    chip_conveyor: { fwd: "M55", rev: "M56", stop: "M9" },
    programmable_pressure: false,
    programmable_flow: false,
    notes: [
      "Citizen Cincom: M12 air blast for chip clearing in guide bushing area",
      "M55/M56 chip conveyor (part catcher on some models)",
      "Oil-based coolant typical for Swiss — shorter delays"
    ]
  },
  star_fanuc: {
    flood: { code: "M8", off: "M9", delay_ms: 300 },
    mist: { code: "M7", off: "M9", delay_ms: 200 },
    tsc: { code: "M50", off: "M9", delay_ms: 600, pressure: { min: 10, max: 40, default: 20 } },
    air_blast: { code: "M12", off: "M9", delay_ms: 150 },
    chip_conveyor: { fwd: "M55", rev: "M56", stop: "M9" },
    programmable_pressure: false,
    programmable_flow: false,
    notes: ["Star: Fanuc-based controller, Swiss-type coolant codes similar to Citizen"]
  },
  dmg_celos_siemens: {
    flood: { code: "M8", off: "M9", delay_ms: 300 },
    mist: { code: "M7", off: "M9", delay_ms: 300 },
    tsc: { code: "SPOS=0 M88", off: "M89", delay_ms: 800, pressure: { min: 10, max: 100, default: 50 } },
    mql: { code: "M56", off: "M9", delay_ms: 800, flow: { min: 5, max: 100, default: 30 } },
    cryogenic: { code: "M57", off: "M9", delay_ms: 1500 },
    chip_conveyor: { fwd: "M58", rev: "M59", stop: "M9" },
    programmable_pressure: true,
    programmable_flow: true,
    notes: [
      "DMG MORI CELOS (Siemens): inherits Siemens 840D coolant codes",
      "Supports cryogenic on equipped models",
      "Air blast is PLC/builder-defined — no standard M-code (do NOT use M7, that is mist coolant per ISO 6983)"
    ]
  },
  dmg_celos_fanuc: {
    flood: { code: "M8", off: "M9", delay_ms: 400 },
    mist: { code: "M7", off: "M9", delay_ms: 300 },
    tsc: { code: "M50", off: "M9", delay_ms: 800, pressure: { min: 10, max: 100, default: 50 } },
    air_blast: { code: "M51", off: "M9", delay_ms: 200 },
    mql: { code: "M7.1", off: "M9", delay_ms: 1000, flow: { min: 5, max: 50, default: 20 } },
    chip_conveyor: { fwd: "M31", rev: "M32", stop: "M33" },
    programmable_pressure: true,
    programmable_flow: true,
    notes: ["DMG MORI CELOS (Fanuc): Fanuc-based coolant codes with extended pressure control"]
  },
  hurco_max5: {
    flood: { code: "M8", off: "M9", delay_ms: 400 },
    mist: { code: "M7", off: "M9", delay_ms: 300 },
    tsc: { code: "M88", off: "M89", delay_ms: 1000, pressure: { min: 10, max: 70, default: 30 } },
    air_blast: { code: "M51", off: "M9", delay_ms: 200 },
    programmable_pressure: false,
    programmable_flow: false,
    notes: ["Hurco MAX5: M88/M89 TSC, conversational mode handles coolant automatically"]
  },
  generic_fanuc: {
    flood: { code: "M8", off: "M9", delay_ms: 500 },
    mist: { code: "M7", off: "M9", delay_ms: 300 },
    air_blast: { code: "M51", off: "M9", delay_ms: 200 },
    programmable_pressure: false,
    programmable_flow: false,
    notes: ["Generic Fanuc: safe defaults, no TSC assumed (builder-dependent)"]
  },
  generic_iso: {
    flood: { code: "M8", off: "M9", delay_ms: 500 },
    mist: { code: "M7", off: "M9", delay_ms: 300 },
    programmable_pressure: false,
    programmable_flow: false,
    notes: ["Generic ISO: M8/M7/M9 only — no TSC or air blast assumed"]
  },
  fagor_8065: {
    flood: { code: "M8", off: "M9", delay_ms: 400 },
    mist: { code: "M7", off: "M9", delay_ms: 300 },
    tsc: { code: "M50", off: "M9", delay_ms: 800, pressure: { min: 10, max: 70, default: 30 } },
    air_blast: { code: "M51", off: "M9", delay_ms: 200 },
    programmable_pressure: false,
    programmable_flow: false,
    notes: ["Fagor 8065: Fanuc-compatible coolant M-codes"]
  }
};

/** Base family fallback for controllers not in COOLANT_DB */
const BASE_FALLBACK: Partial<Record<ControllerFamily, ControllerFamily>> = {
  fanuc_18i: "fanuc_16i",
  fanuc_16i: "fanuc_0i",
  siemens_828d: "siemens_840d",
  siemens_one: "siemens_840d",
  heidenhain_tnc7: "heidenhain_tnc640",
  okuma_osp_p300: "okuma_osp_p500",
  mazak_smooth_g: "mazak_smooth_ai",
  dmg_celos_fanuc: "fanuc_31i",
  dmg_celos_siemens: "siemens_840d",
  star_fanuc: "citizen_cincom",
  generic_iso: "generic_fanuc",
};

// ─── Engine Implementation ───────────────────────────────────────────

class CoolantControlConfigEngineImpl {

  /**
   * Get complete coolant control configuration for a controller family.
   *
   * @param input - Controller family + optional machine capabilities
   * @returns Full coolant config with M-codes, sequencing, and notes
   */
  getConfig(input: CoolantControlConfigInput): CoolantControlConfig {
    if (!input.controller_family) {
      throw new Error("controller_family is required");
    }

    const warnings: string[] = [];
    let def = COOLANT_DB[input.controller_family];

    // Fallback to base family if not in DB
    if (!def) {
      const base = BASE_FALLBACK[input.controller_family];
      if (base) {
        def = COOLANT_DB[base];
        warnings.push(`No specific coolant config for "${input.controller_family}", using ${base} as base`);
      }
    }

    // Ultimate fallback to generic_fanuc
    if (!def) {
      def = COOLANT_DB.generic_fanuc!;
      warnings.push(`Unknown controller "${input.controller_family}", using generic_fanuc defaults`);
    }

    // Build modes map
    const modes: Partial<Record<CoolantMode, CoolantMCode>> = {};

    // Flood — always available
    modes.flood = {
      code: def.flood.code,
      label: "Flood coolant",
      on_delay_ms: def.flood.delay_ms,
      off_code: def.flood.off,
    };

    // Mist — always available
    modes.mist = {
      code: def.mist.code,
      label: "Mist coolant",
      on_delay_ms: def.mist.delay_ms,
      off_code: def.mist.off,
    };

    // TSC — only if machine has it
    if (def.tsc && input.has_tsc !== false) {
      const pressure = def.tsc.pressure ?? null;
      if (input.tsc_max_pressure_bar && pressure) {
        modes.tsc = {
          code: def.tsc.code,
          label: "Through-Spindle Coolant",
          requires_option: true,
          pressure_bar: { min: pressure.min, max: Math.min(pressure.max, input.tsc_max_pressure_bar), default: pressure.default },
          on_delay_ms: def.tsc.delay_ms,
          off_code: def.tsc.off,
        };
      } else {
        modes.tsc = {
          code: def.tsc.code,
          label: "Through-Spindle Coolant",
          requires_option: true,
          pressure_bar: pressure,
          on_delay_ms: def.tsc.delay_ms,
          off_code: def.tsc.off,
        };
      }
    } else if (input.has_tsc === true && !def.tsc) {
      warnings.push(`TSC requested but no TSC M-code defined for ${input.controller_family}`);
    }

    // Air blast — if defined
    if (def.air_blast && input.has_air_blast !== false) {
      modes.air_blast = {
        code: def.air_blast.code,
        label: "Air blast",
        on_delay_ms: def.air_blast.delay_ms,
        off_code: def.air_blast.off,
      };
    }

    // MQL — if machine has it
    if (def.mql && input.has_mql === true) {
      modes.mql = {
        code: def.mql.code,
        label: "Minimum Quantity Lubrication",
        requires_option: true,
        flow_lpm: def.mql.flow ?? null,
        on_delay_ms: def.mql.delay_ms,
        off_code: def.mql.off,
      };
    }

    // Cryogenic — if machine has it
    if (def.cryogenic && input.has_cryogenic === true) {
      modes.cryogenic = {
        code: def.cryogenic.code,
        label: "Cryogenic coolant (LN2/CO2)",
        requires_option: true,
        on_delay_ms: def.cryogenic.delay_ms,
        off_code: def.cryogenic.off,
      };
    }

    // Off mode
    modes.off = {
      code: def.flood.off, // typically M9
      label: "Coolant off",
      on_delay_ms: 0,
      off_code: def.flood.off,
    };

    // Build sequencing templates
    const sequence = this.buildSequence(def, modes);

    // Chip conveyor
    let chip_conveyor: CoolantControlConfig["chip_conveyor"];
    if (def.chip_conveyor && input.has_chip_conveyor !== false) {
      chip_conveyor = {
        forward: def.chip_conveyor.fwd,
        reverse: def.chip_conveyor.rev,
        stop: def.chip_conveyor.stop,
      };
    }

    return {
      controller_family: input.controller_family,
      modes,
      sequence,
      programmable_pressure: def.programmable_pressure,
      programmable_flow: def.programmable_flow,
      chip_conveyor,
      notes: [...def.notes],
      warnings,
    };
  }

  /**
   * List all controller families with coolant configurations.
   */
  listCoveredControllers(): ControllerFamily[] {
    return Object.keys(COOLANT_DB) as ControllerFamily[];
  }

  /**
   * Get supported coolant modes for a controller family.
   */
  getSupportedModes(controller_family: ControllerFamily): CoolantMode[] {
    const def = COOLANT_DB[controller_family] ?? COOLANT_DB[BASE_FALLBACK[controller_family] ?? "generic_fanuc"];
    if (!def) return ["flood", "mist", "off"];

    const modes: CoolantMode[] = ["flood", "mist"];
    if (def.tsc) modes.push("tsc");
    if (def.air_blast) modes.push("air_blast");
    if (def.mql) modes.push("mql");
    if (def.cryogenic) modes.push("cryogenic");
    if (def.chip_conveyor) modes.push("chip_conveyor");
    modes.push("off");
    return modes;
  }

  /**
   * Execute router — dispatches actions.
   */
  execute(action: string, input: Record<string, unknown>): unknown {
    switch (action) {
      case "ppg_coolant_config":
        return this.getConfig(input as unknown as CoolantControlConfigInput);
      case "ppg_coolant_controllers":
        return { controllers: this.listCoveredControllers() };
      case "ppg_coolant_modes":
        return { modes: this.getSupportedModes(input.controller_family as ControllerFamily) };
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  // ─── Private helpers ─────────────────────────────────────────────

  private buildSequence(
    def: ControllerCoolantDef,
    modes: Partial<Record<CoolantMode, CoolantMCode>>
  ): CoolantSequenceTemplate {
    const floodCode = def.flood.code;
    const offCode = def.flood.off;
    const chipFwd = def.chip_conveyor?.fwd;

    // Pre-cut: start coolant, optional chip conveyor
    const pre_cut: string[] = [];
    if (chipFwd) pre_cut.push(chipFwd + " (CHIP CONVEYOR ON)");
    pre_cut.push(floodCode + " (COOLANT ON)");

    // Tool change: stop coolant, retract, change, restart
    const tool_change: string[] = [
      offCode + " (COOLANT OFF)",
      "(TOOL CHANGE)",
      floodCode + " (COOLANT ON)",
    ];

    // Post-cut: stop coolant, chip clear, stop conveyor
    const post_cut: string[] = [offCode + " (COOLANT OFF)"];
    if (chipFwd) post_cut.push(def.chip_conveyor!.stop + " (CHIP CONVEYOR STOP)");

    // Chip clear: brief air blast if available, or just a dwell
    const chip_clear: string[] = [];
    if (modes.air_blast) {
      chip_clear.push(modes.air_blast.code + " (AIR BLAST - CHIP CLEAR)");
      chip_clear.push("G4 P2.0 (DWELL 2 SEC)");
      chip_clear.push(modes.air_blast.off_code + " (AIR BLAST OFF)");
    } else {
      chip_clear.push("G4 P1.0 (DWELL 1 SEC - CHIP SETTLE)");
    }

    return { pre_cut, tool_change, post_cut, chip_clear };
  }
}

export const coolantControlConfigEngine = new CoolantControlConfigEngineImpl();
