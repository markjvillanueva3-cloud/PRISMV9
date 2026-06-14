/**
 * WedmLeadInOutGeometry — Wire-EDM #5.1
 * Plans wire entry + exit geometry (line/arc/tangent) per cut type. Wrong
 * lead leaves a visible mark on finished surface or breaks the wire on entry.
 *
 * Lead types: "line_normal", "line_tangent", "arc_tangent", "ramp_in"
 *   rough: line_normal (fast)
 *   skim: arc_tangent (smooth surface continuation)
 *   finish: ramp_in (gradual engagement, minimum mark)
 *
 * Lead length scales with wire diameter + workpiece thickness for arc choices.
 */
interface AtomicValue<T = number> { value: T; unit: string; uncertainty: number; source: string; confidence?: number }

export type WedmCutKind = "rough" | "skim" | "finish";
export type LeadType = "line_normal" | "line_tangent" | "arc_tangent" | "ramp_in";

export interface LeadGeometryInput {
  cut_kind: WedmCutKind;
  /** Wire diameter [mm]. Typical 0.05-0.30. */
  wire_diameter_mm: number;
  /** Workpiece thickness [mm]. Range (0, 500]. */
  thickness_mm: number;
  /** Optional override: force a specific lead type. */
  override_lead_type?: LeadType;
}

export interface LeadGeometryResult {
  lead_in_type: LeadType;
  lead_out_type: LeadType;
  lead_in_length_mm: AtomicValue;
  lead_out_length_mm: AtomicValue;
  arc_radius_mm: AtomicValue;
  notes: string[];
  source: string;
}

const WIRE_DIA_MIN = 0.05;
const WIRE_DIA_MAX = 0.5;
const THICKNESS_MAX = 500;
const CUT_VALID = new Set(["rough", "skim", "finish"]);
const LEAD_VALID = new Set(["line_normal", "line_tangent", "arc_tangent", "ramp_in"]);
const LEAD_LENGTH_MULT_MIN_MM = 2;

function av(value: number, unit: string, source: string, conf: number): AtomicValue {
  return { value, unit, uncertainty: Math.abs(value) * 0.05, source, confidence: conf };
}
function emit(reason: string): LeadGeometryResult {
  const z = av(0, "mm", "invalid-input", 0);
  return { lead_in_type: "line_normal", lead_out_type: "line_normal", lead_in_length_mm: z, lead_out_length_mm: z, arc_radius_mm: z, notes: [reason], source: "WedmLeadInOutGeometry v1.0.0" };
}

export function planLead(input: LeadGeometryInput): LeadGeometryResult {
  if (!input) return emit("missing input");
  if (!CUT_VALID.has(input.cut_kind)) return emit(`unknown cut_kind: ${input.cut_kind}`);
  if (!Number.isFinite(input.wire_diameter_mm) || input.wire_diameter_mm < WIRE_DIA_MIN || input.wire_diameter_mm > WIRE_DIA_MAX) return emit(`wire_diameter_mm outside [${WIRE_DIA_MIN}, ${WIRE_DIA_MAX}]`);
  if (!Number.isFinite(input.thickness_mm) || input.thickness_mm <= 0 || input.thickness_mm > THICKNESS_MAX) return emit(`thickness_mm outside (0, ${THICKNESS_MAX}]`);
  if (input.override_lead_type !== undefined && !LEAD_VALID.has(input.override_lead_type)) return emit(`unknown override_lead_type: ${input.override_lead_type}`);

  // Default lead-in/out by cut kind
  let inType: LeadType, outType: LeadType;
  switch (input.cut_kind) {
    case "rough": inType = "line_normal"; outType = "line_normal"; break;
    case "skim":  inType = "arc_tangent"; outType = "arc_tangent"; break;
    case "finish": inType = "ramp_in";    outType = "arc_tangent"; break;
  }
  if (input.override_lead_type) {
    inType = input.override_lead_type;
    outType = input.override_lead_type;
  }

  // Lead length scales with wire offset (kerf) + thickness factor
  const kerf = input.wire_diameter_mm + 0.04;     // typical gap allowance
  const baseLen = Math.max(LEAD_LENGTH_MULT_MIN_MM, kerf * 8);    // 8× kerf = empirical
  // Arc radius for arc_tangent / ramp_in = 2× kerf min, scaled by thickness/10
  const arcR = Math.max(kerf * 2, input.thickness_mm * 0.02);

  const notes: string[] = [];
  notes.push(`cut_kind=${input.cut_kind}: lead_in=${inType}, lead_out=${outType}`);
  if (input.cut_kind === "rough") notes.push("rough cut: line_normal entry — surface mark is acceptable (cleaned by skim)");
  if (input.cut_kind === "finish") notes.push("finish cut: ramp_in entry → no visible mark on outer surface");
  if (input.override_lead_type) notes.push(`operator override applied: lead type forced to ${input.override_lead_type}`);

  return {
    lead_in_type: inType, lead_out_type: outType,
    lead_in_length_mm: av(baseLen, "mm", "8× kerf empirical", 0.85),
    lead_out_length_mm: av(baseLen, "mm", "8× kerf empirical", 0.85),
    arc_radius_mm: av(arcR, "mm", "max(2·kerf, thickness/50)", 0.80),
    notes, source: "WedmLeadInOutGeometry v1.0.0",
  };
}

export const WedmLeadInOutGeometry = { version: "1.0.0" as const, planLead };
