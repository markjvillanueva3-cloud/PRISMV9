/**
 * RetractPlaneOptimizer — CAM #2.4
 * Picks clearance-Z planes for an operation set:
 *   - global_clearance: Z above which rapids are always safe (= fixture top + tallest tool + 25mm margin)
 *   - between_op: lower clearance for adjacent same-tool ops (saves air-time)
 *   - feed_plane: short feed-in distance (rapid → feed transition Z)
 *   - per-tool retract: tool-Z-length-dependent for tool changes
 */
interface AtomicValue<T = number> { value: T; unit: string; uncertainty: number; source: string; confidence?: number }

export interface RetractPlaneInput {
  /** Highest fixture-top Z [mm]. */
  fixture_top_z_mm: number;
  /** Max tool length encountered in this op set [mm]. */
  max_tool_length_mm: number;
  /** Z travel limit of machine [mm]. */
  machine_z_travel_mm: number;
  /** Workpiece top Z [mm] (typically 0 in WCS). */
  workpiece_top_z_mm?: number;
  /** Operator-tunable safety margin above tool+fixture stack [mm]. Default 25. */
  safety_margin_mm?: number;
}

export interface RetractPlaneResult {
  global_clearance_mm: AtomicValue;
  between_op_clearance_mm: AtomicValue;
  feed_plane_mm: AtomicValue;
  tool_change_clearance_mm: AtomicValue;
  notes: string[];
  source: string;
}

const SAFETY_MARGIN_DEFAULT_MM = 25;
const BETWEEN_OP_BUFFER_MM = 10;
const FEED_PLANE_BUFFER_MM = 5;
const Z_TRAVEL_MIN_MM = 50;
const Z_TRAVEL_MAX_MM = 5000;
const FIXTURE_MAX_MM = 1000;
const TOOL_MAX_MM = 500;

function av(value: number, unit: string, source: string, conf: number): AtomicValue {
  return { value, unit, uncertainty: Math.abs(value) * 0.02, source, confidence: conf };
}
function emit(reason: string): RetractPlaneResult {
  const z = av(0, "mm", "invalid-input", 0);
  return { global_clearance_mm: z, between_op_clearance_mm: z, feed_plane_mm: z, tool_change_clearance_mm: z, notes: [reason], source: "RetractPlaneOptimizer v1.0.0" };
}

export function optimize(input: RetractPlaneInput): RetractPlaneResult {
  if (!input) return emit("missing input");
  if (!Number.isFinite(input.fixture_top_z_mm)) return emit("fixture_top_z_mm not finite");
  if (!Number.isFinite(input.max_tool_length_mm)) return emit("max_tool_length_mm not finite");
  if (!Number.isFinite(input.machine_z_travel_mm)) return emit("machine_z_travel_mm not finite");
  if (input.fixture_top_z_mm < 0 || input.fixture_top_z_mm > FIXTURE_MAX_MM) return emit(`fixture_top_z_mm outside [0, ${FIXTURE_MAX_MM}]`);
  if (input.max_tool_length_mm < 0 || input.max_tool_length_mm > TOOL_MAX_MM) return emit(`max_tool_length_mm outside [0, ${TOOL_MAX_MM}]`);
  if (input.machine_z_travel_mm < Z_TRAVEL_MIN_MM || input.machine_z_travel_mm > Z_TRAVEL_MAX_MM) return emit(`machine_z_travel_mm outside [${Z_TRAVEL_MIN_MM}, ${Z_TRAVEL_MAX_MM}]`);

  const workpieceTop = Number.isFinite(input.workpiece_top_z_mm) ? input.workpiece_top_z_mm! : 0;
  const margin = Number.isFinite(input.safety_margin_mm) ? Math.max(5, input.safety_margin_mm!) : SAFETY_MARGIN_DEFAULT_MM;
  const stack = input.fixture_top_z_mm + input.max_tool_length_mm;
  const global = Math.min(input.machine_z_travel_mm, stack + margin);
  const betweenOp = Math.max(workpieceTop + BETWEEN_OP_BUFFER_MM, input.fixture_top_z_mm + 5);
  const feed = workpieceTop + FEED_PLANE_BUFFER_MM;
  const toolChange = input.machine_z_travel_mm;

  const notes: string[] = [];
  if (stack + margin > input.machine_z_travel_mm) notes.push(`computed clearance ${(stack + margin).toFixed(1)}mm exceeds Z travel ${input.machine_z_travel_mm}mm; clamped to machine zero`);
  notes.push(`safety margin used: ${margin}mm above (fixture + tool stack) = ${(stack + margin).toFixed(1)}mm`);
  notes.push(`between-op clearance ${betweenOp.toFixed(1)}mm: air-time saved vs ${global.toFixed(1)}mm global = ${(global - betweenOp).toFixed(1)}mm per move`);

  return {
    global_clearance_mm: av(global, "mm", "fixture+tool+margin", 0.92),
    between_op_clearance_mm: av(betweenOp, "mm", "workpiece+buffer", 0.90),
    feed_plane_mm: av(feed, "mm", "workpiece+feed-buffer", 0.95),
    tool_change_clearance_mm: av(toolChange, "mm", "machine-Z-max", 0.98),
    notes, source: "RetractPlaneOptimizer v1.0.0",
  };
}

export const RetractPlaneOptimizer = { version: "1.0.0" as const, optimize };
