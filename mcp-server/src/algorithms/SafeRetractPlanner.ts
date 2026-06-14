/**
 * SafeRetractPlanner — Post-Processor algorithm #6.6
 *
 * Plans the SAFE retract pose between operations and on E-stop recovery.
 * Pose = (Z_clearance, tool_orientation, spindle_state, coolant_state).
 *
 * Wrong retract = crash on next-op rapid (Z not lifted enough) OR thrown chip
 * (coolant left on at retract) OR scrap on tool-touch (no orient before lift).
 *
 * Strategies:
 *   - "between_op"       : retract between ops (after current, before next)
 *   - "on_estop"         : safe pose on e-stop — coolant off, spindle off, orient
 *   - "end_of_program"   : final retract before M30
 *   - "tool_change"      : retract specifically for tool-change (max Z)
 *
 * Output blocks use the controller-canonical retract syntax (G53 absolute for
 * machine-zero coords; G91 G28 for incremental return to home).
 *
 * @module SafeRetractPlanner
 * @version 1.0.0
 */

export type RetractController = "fanuc" | "haas" | "okuma" | "heidenhain" | "mazak" | "siemens";
export type RetractStrategy = "between_op" | "on_estop" | "end_of_program" | "tool_change";

export interface SafeRetractInput {
  controller: RetractController;
  strategy: RetractStrategy;
  /** Machine Z travel limit (positive value, mm). Default 500mm. */
  machine_z_travel_mm?: number;
  /** Current Z position when retract starts (mm). Used to compute lift delta. */
  current_z_mm?: number;
  /** Optional: tool length (mm). Adds safety margin to Z clearance. */
  tool_length_mm?: number;
  /** Fixture height above table (mm). Default 50mm. */
  fixture_height_mm?: number;
}

export interface SafeRetractResult {
  blocks: string[];
  retract_z_target_mm: number;
  estimated_clearance_mm: number;
  blocks_emitted: number;
  notes: string[];
  source: string;
}

interface RetractMap {
  /** Absolute retract to machine-zero Z. */
  abs_z_home: string;
  /** Incremental return to home. */
  inc_g28: string;
  /** Coolant off code. */
  coolant_off: string;
  /** Spindle stop. */
  spindle_stop: string;
  /** Orient. */
  orient: string;
}

const RETRACT_MAP: Record<RetractController, RetractMap> = {
  fanuc:      { abs_z_home: "G53 G0 Z0", inc_g28: "G91 G28 Z0", coolant_off: "M9", spindle_stop: "M5", orient: "M19" },
  haas:       { abs_z_home: "G53 G0 Z0", inc_g28: "G91 G28 Z0", coolant_off: "M9", spindle_stop: "M5", orient: "M19" },
  okuma:      { abs_z_home: "G53 G0 Z0", inc_g28: "G91 G30 P1 Z0", coolant_off: "M9", spindle_stop: "M5", orient: "M19" },
  heidenhain: { abs_z_home: "L Z+0 R0 FMAX M91", inc_g28: "L Z+250 R0 FMAX M91", coolant_off: "M9", spindle_stop: "M5", orient: "M19" },
  mazak:      { abs_z_home: "G53 G0 Z0", inc_g28: "G91 G28 Z0", coolant_off: "M9", spindle_stop: "M5", orient: "M19" },
  siemens:    { abs_z_home: "G53 G0 Z0", inc_g28: "G91 G30 Z0 D0", coolant_off: "M9", spindle_stop: "M5", orient: "M19" },
};

const Z_TRAVEL_DEFAULT_MM = 500;
const FIXTURE_DEFAULT_MM = 50;
const TOOL_SAFETY_MARGIN_MM = 25;
const Z_MIN_TRAVEL_MM = 50;       // sanity: machine must have at least 50mm Z travel
const Z_MAX_TRAVEL_MM = 5000;     // sanity: 5m max for industrial column mills

function emit(reason: string): SafeRetractResult {
  return {
    blocks: [],
    retract_z_target_mm: 0,
    estimated_clearance_mm: 0,
    blocks_emitted: 0,
    notes: [reason],
    source: "SafeRetractPlanner v1.0.0",
  };
}

export function planRetract(input: SafeRetractInput): SafeRetractResult {
  if (!input) return emit("missing input");
  if (!RETRACT_MAP[input.controller]) return emit(`unknown controller: ${input.controller}`);
  const validStrats: RetractStrategy[] = ["between_op", "on_estop", "end_of_program", "tool_change"];
  if (!validStrats.includes(input.strategy)) return emit(`unknown strategy: ${input.strategy}`);

  const zTravel = Number.isFinite(input.machine_z_travel_mm) ? input.machine_z_travel_mm! : Z_TRAVEL_DEFAULT_MM;
  if (zTravel < Z_MIN_TRAVEL_MM || zTravel > Z_MAX_TRAVEL_MM) return emit(`machine_z_travel_mm ${zTravel} outside [${Z_MIN_TRAVEL_MM}, ${Z_MAX_TRAVEL_MM}]`);

  const fixture = Number.isFinite(input.fixture_height_mm) ? input.fixture_height_mm! : FIXTURE_DEFAULT_MM;
  if (fixture < 0) return emit("fixture_height_mm cannot be negative");
  const toolLen = Number.isFinite(input.tool_length_mm) ? input.tool_length_mm! : 0;
  if (toolLen < 0) return emit("tool_length_mm cannot be negative");
  const currentZ = Number.isFinite(input.current_z_mm) ? input.current_z_mm! : 0;

  const map = RETRACT_MAP[input.controller];
  const blocks: string[] = [];
  const notes: string[] = [];

  // Strategy: tool_change → max-Z absolute retract (machine zero) — full clearance for ATC swing.
  // Strategy: end_of_program → max-Z + coolant off + spindle off + orient.
  // Strategy: on_estop → coolant off → spindle off → orient → max-Z (priority order matters).
  // Strategy: between_op → minimum-safe Z (clearance over fixture + tool len + margin).

  if (input.strategy === "on_estop") {
    blocks.push(`${map.coolant_off} (e-stop: coolant off FIRST)`);
    blocks.push(`${map.spindle_stop} (spindle stop)`);
    blocks.push(`${map.orient} (orient for safe inspection)`);
    blocks.push(`${map.abs_z_home} (max-Z retract to machine zero)`);
    notes.push("e-stop sequence prioritizes operator safety: coolant + spindle off BEFORE motion");
    return {
      blocks, retract_z_target_mm: zTravel,
      estimated_clearance_mm: zTravel - currentZ,
      blocks_emitted: blocks.length, notes,
      source: "SafeRetractPlanner v1.0.0",
    };
  }

  if (input.strategy === "tool_change") {
    blocks.push(`${map.abs_z_home} (tool-change retract to machine zero)`);
    blocks.push(`${map.orient} (orient for ATC engagement)`);
    return {
      blocks, retract_z_target_mm: zTravel,
      estimated_clearance_mm: zTravel - currentZ,
      blocks_emitted: blocks.length, notes,
      source: "SafeRetractPlanner v1.0.0",
    };
  }

  if (input.strategy === "end_of_program") {
    blocks.push(`${map.coolant_off} (program end: coolant off)`);
    blocks.push(`${map.abs_z_home} (max-Z retract)`);
    blocks.push(`${map.spindle_stop} (spindle stop)`);
    blocks.push(`${map.orient} (orient — leaves spindle in known pose for next setup)`);
    return {
      blocks, retract_z_target_mm: zTravel,
      estimated_clearance_mm: zTravel - currentZ,
      blocks_emitted: blocks.length, notes,
      source: "SafeRetractPlanner v1.0.0",
    };
  }

  // between_op: minimum-safe Z (fixture height + tool length + safety margin)
  const safeZ = fixture + toolLen + TOOL_SAFETY_MARGIN_MM;
  if (safeZ > zTravel) {
    notes.push(`computed safe-Z ${safeZ.toFixed(1)}mm exceeds machine Z travel ${zTravel}mm — clamping to machine-zero`);
    blocks.push(`${map.abs_z_home} (clamped to machine zero)`);
    return {
      blocks, retract_z_target_mm: zTravel,
      estimated_clearance_mm: zTravel - currentZ,
      blocks_emitted: blocks.length, notes,
      source: "SafeRetractPlanner v1.0.0",
    };
  }

  blocks.push(`G0 Z${safeZ.toFixed(2)} (safe retract: fixture ${fixture} + tool ${toolLen} + ${TOOL_SAFETY_MARGIN_MM}mm margin)`);
  return {
    blocks, retract_z_target_mm: safeZ,
    estimated_clearance_mm: safeZ - currentZ,
    blocks_emitted: blocks.length, notes,
    source: "SafeRetractPlanner v1.0.0",
  };
}

export const SafeRetractPlanner = {
  version: "1.0.0" as const,
  planRetract,
};
