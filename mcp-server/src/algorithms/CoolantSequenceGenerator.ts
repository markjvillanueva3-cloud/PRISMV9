/**
 * CoolantSequenceGenerator — Post-Processor algorithm #6.3
 *
 * Generates the correct M-code sequence for coolant control given controller
 * dialect + coolant type. Wrong sequencing damages the pump (coolant ON before
 * spindle = pump pressure spike against closed bearing) OR floods the chip
 * conveyor (coolant left ON during retract).
 *
 * COMPLEMENTARY to PPCoolantSequenceValidatorEngine (which CATCHES bad
 * sequences); this GENERATES the correct sequence.
 *
 * Controller M-code dialects (cited operator's manuals):
 *   Fanuc:     M7 mist · M8 flood · M9 off · M88 thru-spindle on · M89 off
 *   Haas:      M7 mist · M8 flood · M9 off · M88 TSC on · M89 TSC off · M34 chip-conveyor
 *   Okuma:     M7 mist · M8 flood · M9 off · M50 thru-spindle on · M51 off
 *   Heidenhain:M7 mist · M8 flood · M9 off · TOOL-CALL-controlled (M-cycles attached)
 *   Mazak:     M7/8/9 standard · M52 TSC on · M53 off
 *   Siemens:   M7/8/9 standard · M91 high-pressure on · M92 off
 *
 * Sequencing rules (vendor + ISO 6983):
 *   1. Spindle ON (M3/M4) before coolant ON (M7/M8/M88...)
 *   2. Spindle reach speed (dwell or G04 P0.5) before contact
 *   3. Coolant OFF (M9) BEFORE spindle OFF (M5)
 *   4. Thru-spindle coolant requires spindle at speed first
 *   5. Manual override (operator-stop) path emits commented coolant OFF
 *
 * @module CoolantSequenceGenerator
 * @version 1.0.0
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  uncertainty: number;
  source: string;
  confidence?: number;
}

export type CoolantController = "fanuc" | "haas" | "okuma" | "heidenhain" | "mazak" | "siemens";
export type CoolantMode = "off" | "mist" | "flood" | "thru_spindle" | "high_pressure";
export type SpindleDirection = "M3" | "M4";

export interface CoolantSequenceInput {
  controller: CoolantController;
  coolant_mode: CoolantMode;
  spindle_direction: SpindleDirection;
  spindle_rpm: number;
  /** Optional: dwell after spindle-start before contact, in seconds. Default 0.5. */
  spindle_settle_sec?: number;
}

export interface CoolantSequenceResult {
  startup_blocks: string[];
  shutdown_blocks: string[];
  coolant_on_code: string | null;
  coolant_off_code: string;
  spindle_settle_block: string | null;
  notes: string[];
  source: string;
}

interface ControllerMap {
  mist: string;
  flood: string;
  off: string;
  thru_spindle_on: string | null;
  thru_spindle_off: string | null;
  high_pressure_on: string | null;
  high_pressure_off: string | null;
}

const DIALECT_MAP: Record<CoolantController, ControllerMap> = {
  fanuc:       { mist: "M7", flood: "M8", off: "M9", thru_spindle_on: "M88", thru_spindle_off: "M89", high_pressure_on: "M88", high_pressure_off: "M89" },
  haas:        { mist: "M7", flood: "M8", off: "M9", thru_spindle_on: "M88", thru_spindle_off: "M89", high_pressure_on: "M88", high_pressure_off: "M89" },
  okuma:       { mist: "M7", flood: "M8", off: "M9", thru_spindle_on: "M50", thru_spindle_off: "M51", high_pressure_on: "M50", high_pressure_off: "M51" },
  heidenhain:  { mist: "M7", flood: "M8", off: "M9", thru_spindle_on: null, thru_spindle_off: null, high_pressure_on: null, high_pressure_off: null },
  mazak:       { mist: "M7", flood: "M8", off: "M9", thru_spindle_on: "M52", thru_spindle_off: "M53", high_pressure_on: "M52", high_pressure_off: "M53" },
  siemens:     { mist: "M7", flood: "M8", off: "M9", thru_spindle_on: null, thru_spindle_off: null, high_pressure_on: "M91", high_pressure_off: "M92" },
};

const RPM_MIN = 1, RPM_MAX = 100_000;
const SETTLE_DEFAULT = 0.5;
const SETTLE_MAX = 10;

function emit(reason: string): CoolantSequenceResult {
  return {
    startup_blocks: [],
    shutdown_blocks: [],
    coolant_on_code: null,
    coolant_off_code: "",
    spindle_settle_block: null,
    notes: [reason],
    source: "CoolantSequenceGenerator v1.0.0",
  };
}

export function generateSequence(input: CoolantSequenceInput): CoolantSequenceResult {
  if (!input) return emit("missing input");
  if (!DIALECT_MAP[input.controller]) return emit(`unknown controller: ${input.controller}`);
  const dialect = DIALECT_MAP[input.controller];

  const validModes: CoolantMode[] = ["off", "mist", "flood", "thru_spindle", "high_pressure"];
  if (!validModes.includes(input.coolant_mode)) return emit(`unknown coolant_mode: ${input.coolant_mode}`);
  if (input.spindle_direction !== "M3" && input.spindle_direction !== "M4") return emit(`spindle_direction must be M3 or M4, got: ${input.spindle_direction}`);
  if (!Number.isFinite(input.spindle_rpm)) return emit("spindle_rpm not finite");
  if (input.spindle_rpm < RPM_MIN || input.spindle_rpm > RPM_MAX) return emit(`spindle_rpm ${input.spindle_rpm} outside [${RPM_MIN}, ${RPM_MAX}]`);
  const settle = Number.isFinite(input.spindle_settle_sec) ? Math.max(0, Math.min(SETTLE_MAX, input.spindle_settle_sec!)) : SETTLE_DEFAULT;

  // Resolve coolant-on M-code from dialect map
  let coolantOn: string | null = null;
  let coolantOff: string = dialect.off;
  const notes: string[] = [];

  switch (input.coolant_mode) {
    case "off": coolantOn = null; break;
    case "mist": coolantOn = dialect.mist; break;
    case "flood": coolantOn = dialect.flood; break;
    case "thru_spindle":
      if (!dialect.thru_spindle_on) {
        notes.push(`${input.controller} has no native thru-spindle M-code — falling back to flood`);
        coolantOn = dialect.flood;
      } else {
        coolantOn = dialect.thru_spindle_on;
        coolantOff = dialect.thru_spindle_off ?? dialect.off;
      }
      break;
    case "high_pressure":
      if (!dialect.high_pressure_on) {
        notes.push(`${input.controller} has no native high-pressure M-code — falling back to flood`);
        coolantOn = dialect.flood;
      } else {
        coolantOn = dialect.high_pressure_on;
        coolantOff = dialect.high_pressure_off ?? dialect.off;
      }
      break;
  }

  // Compose startup sequence: spindle-on → settle → coolant-on
  const rpm = Math.round(input.spindle_rpm);
  const startup: string[] = [
    `${input.spindle_direction} S${rpm}`,
  ];
  let settleBlock: string | null = null;
  if (settle > 0) {
    // ISO 6983 G04 dwell: P in milliseconds or seconds depending on controller
    // Fanuc/Okuma/Haas: G04 P<sec>. Heidenhain: G04 F<sec>. Use generic P<sec>.
    settleBlock = `G04 P${settle.toFixed(2)} (spindle settle before coolant)`;
    startup.push(settleBlock);
  }
  if (coolantOn) {
    startup.push(`${coolantOn} (${input.coolant_mode} coolant ON)`);
  }

  // Shutdown sequence: coolant-off → spindle-off
  const shutdown: string[] = [];
  if (coolantOn) {
    shutdown.push(`${coolantOff} (coolant OFF — must precede spindle stop)`);
  }
  shutdown.push("M5 (spindle stop)");

  if (input.coolant_mode === "thru_spindle" || input.coolant_mode === "high_pressure") {
    notes.push("thru-spindle/HPC coolant requires spindle at full speed BEFORE engagement — verify settle time covers ramp-up");
  }

  return {
    startup_blocks: startup,
    shutdown_blocks: shutdown,
    coolant_on_code: coolantOn,
    coolant_off_code: coolantOff,
    spindle_settle_block: settleBlock,
    notes,
    source: "CoolantSequenceGenerator v1.0.0",
  };
}

// Avoid unused-import warnings: AtomicValue is reserved for a future spike that
// returns dwell as a typed AtomicValue (not yet needed for the operator surface).
export type _CoolantAV = AtomicValue<number>;

export const CoolantSequenceGenerator = {
  version: "1.0.0" as const,
  generateSequence,
};
