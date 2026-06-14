/**
 * FiveAxisTiltLeadOptimizer — CAM #2.7
 * Picks tilt + lead angles for 5-axis ball-end finishing. Wrong tilt → chatter
 * on barrel cutters; lead inward on shoulder mills collides. Empirical rule
 * from Smith & Tlusty Vol II §5-axis: tilt 10-15° from surface normal (off
 * the tool tip — zero-cutting-speed); lead 5-10° leads the cut to engage
 * helix correctly. Material + tool stiffness shifts the window.
 */
interface AtomicValue<T = number> { value: T; unit: string; uncertainty: number; source: string; confidence?: number }

export type FiveAxisIsoGroup = "P" | "M" | "K" | "N" | "S" | "H";
export type ToolType = "ball_end" | "bull_nose" | "barrel" | "lollipop";

export interface TiltLeadInput {
  iso_group: FiveAxisIsoGroup;
  tool_type: ToolType;
  /** Tool diameter [mm]. Range (0.5, 50]. */
  tool_diameter_mm: number;
  /** Tool length/diameter ratio (stickout). Range (1, 15]. */
  L_over_D: number;
  /** Surface curvature radius at engagement [mm]; positive = convex, negative = concave. */
  surface_radius_mm: number;
}

export interface TiltLeadResult {
  tilt_deg: AtomicValue;
  lead_deg: AtomicValue;
  effective_diameter_mm: AtomicValue;
  notes: string[];
  source: string;
}

const TILT_BASE_DEG: Record<ToolType, number> = { ball_end: 12, bull_nose: 8, barrel: 5, lollipop: 15 };
const LEAD_BASE_DEG = 7;
const ISO_TILT_MULT: Record<FiveAxisIsoGroup, number> = { P: 1.0, M: 1.1, K: 0.9, N: 0.7, S: 1.3, H: 1.2 };
const L_OVER_D_MAX = 15;
const TOOL_DIA_MAX_MM = 50;
const ISO_VALID = new Set(["P","M","K","N","S","H"]);
const TOOL_VALID = new Set(["ball_end","bull_nose","barrel","lollipop"]);

function av(value: number, unit: string, source: string, conf: number, uncFrac = 0.10): AtomicValue {
  return { value, unit, uncertainty: Math.abs(value) * uncFrac, source, confidence: conf };
}
function emit(reason: string): TiltLeadResult {
  const z = av(0, "deg", "invalid-input", 0, 0);
  return { tilt_deg: z, lead_deg: z, effective_diameter_mm: av(0, "mm", "invalid-input", 0, 0), notes: [reason], source: "FiveAxisTiltLeadOptimizer v1.0.0" };
}

export function optimize(input: TiltLeadInput): TiltLeadResult {
  if (!input) return emit("missing input");
  if (!ISO_VALID.has(input.iso_group)) return emit(`unknown iso_group: ${input.iso_group}`);
  if (!TOOL_VALID.has(input.tool_type)) return emit(`unknown tool_type: ${input.tool_type}`);
  if (!Number.isFinite(input.tool_diameter_mm) || input.tool_diameter_mm <= 0.5 || input.tool_diameter_mm > TOOL_DIA_MAX_MM) return emit(`tool_diameter_mm outside (0.5, ${TOOL_DIA_MAX_MM}]`);
  if (!Number.isFinite(input.L_over_D) || input.L_over_D < 1 || input.L_over_D > L_OVER_D_MAX) return emit(`L_over_D outside [1, ${L_OVER_D_MAX}]`);
  if (!Number.isFinite(input.surface_radius_mm)) return emit("surface_radius_mm not finite");

  const baseTilt = TILT_BASE_DEG[input.tool_type] * ISO_TILT_MULT[input.iso_group];
  // Long stickout → reduce tilt to limit deflection moment
  const stickoutPenalty = Math.max(0.5, 1 - 0.05 * (input.L_over_D - 4));
  const tilt = baseTilt * stickoutPenalty;
  let lead = LEAD_BASE_DEG;
  // Concave surfaces (negative radius) — lead AGAINST direction of curvature
  if (input.surface_radius_mm < 0) {
    lead = -lead;
  }
  // Compute effective diameter at this tilt for ball-end
  let effDia = input.tool_diameter_mm;
  if (input.tool_type === "ball_end") {
    // d_eff at tilt θ for ball: D · sin(θ) is approximate engagement-ring diameter
    effDia = input.tool_diameter_mm * Math.sin((tilt * Math.PI) / 180);
  }

  const notes: string[] = [];
  notes.push(`tilt ${tilt.toFixed(1)}° = ${TILT_BASE_DEG[input.tool_type]}° base × ${ISO_TILT_MULT[input.iso_group]} ${input.iso_group}-mult × ${stickoutPenalty.toFixed(2)} stickout-penalty`);
  if (input.L_over_D > 6) notes.push(`L/D ${input.L_over_D} is high — consider toolholder upgrade or shorter stickout for chatter avoidance`);
  if (input.surface_radius_mm < 0 && Math.abs(input.surface_radius_mm) < input.tool_diameter_mm / 2) {
    notes.push(`concave radius ${Math.abs(input.surface_radius_mm)}mm < tool radius — possible scallop interference; verify offset`);
  }

  return {
    tilt_deg: av(tilt, "deg", `${input.tool_type}/${input.iso_group}/L/D=${input.L_over_D}`, 0.85),
    lead_deg: av(lead, "deg", "Smith&Tlusty §5-axis default", 0.80, 0.20),
    effective_diameter_mm: av(effDia, "mm", "tilt-projected engagement", 0.85),
    notes, source: "FiveAxisTiltLeadOptimizer v1.0.0",
  };
}

export const FiveAxisTiltLeadOptimizer = { version: "1.0.0" as const, optimize };
