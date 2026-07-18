/**
 * TaperCompensator — Wire-EDM #5.2
 * Computes upper-guide XY offset for a target taper angle given workpiece
 * thickness + guide stack height. Different machine kinematics:
 *   Sodick AQ-series:  upper_offset = (h_guide + h_workpiece) · tan(θ) (top-only-tilt)
 *   Makino UPJ:        upper_offset = h_guide · tan(θ); lower_offset = -h_lower_guide · tan(θ) (both heads tilt opposite)
 *   Mitsubishi MV:     upper_offset = h_workpiece · tan(θ) (workpiece-relative)
 *   Fanuc Robocut:     upper_offset = h_total · tan(θ) (full-stack relative)
 *
 * Wire breaks if taper angle exceeds machine's mechanical limit (~15° typical;
 * Sodick AQ900L 30° max). Engine enforces this.
 */
interface AtomicValue<T = number> { value: T; unit: string; uncertainty: number; source: string; confidence?: number }

export type TaperMachine = "sodick_aq" | "makino_upj" | "mitsubishi_mv" | "fanuc_robocut";

export interface TaperInput {
  machine: TaperMachine;
  /** Taper angle [degrees]. Range [-30, 30]; machine-specific limits enforced. */
  taper_angle_deg: number;
  /** Workpiece thickness [mm]. Range (0, 500]. */
  workpiece_thickness_mm: number;
  /** Upper guide height above workpiece top [mm]. Default 50. */
  upper_guide_height_mm?: number;
  /** Lower guide depth below workpiece bottom [mm]. Default 50. */
  lower_guide_depth_mm?: number;
}

export interface TaperResult {
  upper_offset_mm: AtomicValue;
  lower_offset_mm: AtomicValue;
  within_machine_limit: boolean;
  recommended_wire_tension_N: AtomicValue;
  notes: string[];
  source: string;
}

const MACHINE_MAX_ANGLE: Record<TaperMachine, number> = {
  sodick_aq: 30,
  makino_upj: 20,
  mitsubishi_mv: 15,
  fanuc_robocut: 15,
};
const GUIDE_HEIGHT_DEFAULT_MM = 50;
const GUIDE_DEPTH_DEFAULT_MM = 50;
const THICKNESS_MAX_MM = 500;
const ANGLE_HARD_LIMIT_DEG = 30;
const VALID_MACHINES = new Set(["sodick_aq","makino_upj","mitsubishi_mv","fanuc_robocut"]);

function av(value: number, unit: string, source: string, conf: number, uncFrac = 0.03): AtomicValue {
  return { value, unit, uncertainty: Math.abs(value) * uncFrac, source, confidence: conf };
}
function emit(reason: string): TaperResult {
  const z = av(0, "mm", "invalid-input", 0, 0);
  return { upper_offset_mm: z, lower_offset_mm: z, within_machine_limit: false, recommended_wire_tension_N: av(0, "N", "invalid-input", 0, 0), notes: [reason], source: "TaperCompensator v1.0.0" };
}

export function compensate(input: TaperInput): TaperResult {
  if (!input) return emit("missing input");
  if (!VALID_MACHINES.has(input.machine)) return emit(`unknown machine: ${input.machine}`);
  if (!Number.isFinite(input.taper_angle_deg)) return emit("taper_angle_deg not finite");
  if (Math.abs(input.taper_angle_deg) > ANGLE_HARD_LIMIT_DEG) return emit(`taper_angle_deg outside [-${ANGLE_HARD_LIMIT_DEG}, ${ANGLE_HARD_LIMIT_DEG}]`);
  if (!Number.isFinite(input.workpiece_thickness_mm) || input.workpiece_thickness_mm <= 0 || input.workpiece_thickness_mm > THICKNESS_MAX_MM) return emit(`workpiece_thickness_mm outside (0, ${THICKNESS_MAX_MM}]`);

  const h_upper = Number.isFinite(input.upper_guide_height_mm) ? Math.max(0, input.upper_guide_height_mm!) : GUIDE_HEIGHT_DEFAULT_MM;
  const h_lower = Number.isFinite(input.lower_guide_depth_mm) ? Math.max(0, input.lower_guide_depth_mm!) : GUIDE_DEPTH_DEFAULT_MM;
  const angleRad = (input.taper_angle_deg * Math.PI) / 180;
  const tanAngle = Math.tan(angleRad);
  const h_wp = input.workpiece_thickness_mm;
  const machineMax = MACHINE_MAX_ANGLE[input.machine];
  const withinLimit = Math.abs(input.taper_angle_deg) <= machineMax;
  const notes: string[] = [];
  if (!withinLimit) notes.push(`taper ${input.taper_angle_deg}° exceeds ${input.machine} mechanical limit ${machineMax}° — wire-break risk`);

  let upperOffset = 0, lowerOffset = 0;
  switch (input.machine) {
    case "sodick_aq":
      upperOffset = (h_upper + h_wp) * tanAngle;
      lowerOffset = 0;
      break;
    case "makino_upj":
      upperOffset = h_upper * tanAngle;
      lowerOffset = -h_lower * tanAngle;
      break;
    case "mitsubishi_mv":
      upperOffset = h_wp * tanAngle;
      lowerOffset = 0;
      break;
    case "fanuc_robocut":
      upperOffset = (h_upper + h_wp + h_lower) * tanAngle;
      lowerOffset = 0;
      break;
  }

  // Tension recommendation: tan² penalty (sagging wire under taper) reduces baseline 12N
  const baseTension = 12;
  const tension = Math.max(6, baseTension - Math.abs(tanAngle) * 6);
  notes.push(`wire tension dropped from baseline 12N to ${tension.toFixed(1)}N to compensate for taper sag`);

  return {
    upper_offset_mm: av(upperOffset, "mm", `${input.machine} kinematics`, withinLimit ? 0.92 : 0.50),
    lower_offset_mm: av(lowerOffset, "mm", `${input.machine} kinematics`, withinLimit ? 0.92 : 0.50),
    within_machine_limit: withinLimit,
    recommended_wire_tension_N: av(tension, "N", "tan-penalty rule", 0.85),
    notes, source: "TaperCompensator v1.0.0",
  };
}

export const TaperCompensator = { version: "1.0.0" as const, compensate };
