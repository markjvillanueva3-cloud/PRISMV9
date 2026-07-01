/**
 * FlushStrategyPicker — Wire-EDM algorithm #5.5
 *
 * Picks dielectric flush strategy (jet / submerged / hybrid + nozzle clearance)
 * given workpiece material/thickness, machine class, and cut type (rough/skim).
 * Wrong flush = wire-break or arc → scrapped part + crashed wire-EDM.
 *
 * Strategies:
 *   - "submerged" : tank fills with dielectric; preferred for tall parts (>50mm)
 *                   and conductive workpieces (graphite, carbide).
 *   - "high_pressure_jet" : 8-15 bar nozzle jet for short/thin parts.
 *   - "hybrid" : submerged tank + upper/lower jets for medium thickness
 *                (rough cut + skim sequence).
 *   - "minimal_jet" : low-pressure final-skim flush — high pressure pushes
 *                     wire away from cut, ruining surface finish.
 *
 * Decision rules (cited Sodick AQ-series operator's manual + Makino UPJ guide):
 *   thickness < 20mm + steel + rough: high_pressure_jet (10-15 bar)
 *   thickness 20-80mm + any material + rough: hybrid (submerged + 8-12 bar jets)
 *   thickness > 80mm + any material: submerged (tank-only, jets off — interferes)
 *   any thickness + skim cut: minimal_jet (1-3 bar — preserve Ra)
 *   carbide/graphite at any thickness: submerged (conductivity + debris)
 *
 * @module FlushStrategyPicker
 * @version 1.0.0
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  uncertainty: number;
  source: string;
  confidence?: number;
}

export type FlushStrategy = "submerged" | "high_pressure_jet" | "hybrid" | "minimal_jet";
export type WireEDMMaterial = "steel" | "stainless" | "tool_steel" | "aluminum" | "carbide" | "graphite" | "copper" | "titanium";
export type WireEDMCut = "rough" | "skim" | "final_finish";

export interface FlushInput {
  workpiece_material: WireEDMMaterial;
  thickness_mm: number;
  cut_type: WireEDMCut;
  /** Optional override: machine supports jet nozzle. Default true. */
  has_jet_nozzles?: boolean;
}

export interface FlushResult {
  strategy: FlushStrategy;
  recommended_pressure_bar: AtomicValue;
  upper_nozzle_clearance_mm: AtomicValue;
  lower_nozzle_clearance_mm: AtomicValue;
  reasons: string[];
  notes: string[];
  source: string;
}

const MATERIAL_VALID = new Set<string>(["steel","stainless","tool_steel","aluminum","carbide","graphite","copper","titanium"]);
const CUT_VALID = new Set<string>(["rough","skim","final_finish"]);
const THICK_THIN_THRESHOLD_MM = 20;
const THICK_MEDIUM_THRESHOLD_MM = 80;
const THICK_MAX_MM = 500;
const CONDUCTIVE_MATERIALS = new Set<WireEDMMaterial>(["carbide", "graphite", "copper"]);

function av(value: number, unit: string, source: string, confidence: number, uncFrac = 0.10): AtomicValue {
  return { value, unit, uncertainty: value * uncFrac, source, confidence };
}

function emit(reason: string): FlushResult {
  return {
    strategy: "submerged",
    recommended_pressure_bar: av(0, "bar", "invalid-input", 0, 0),
    upper_nozzle_clearance_mm: av(0, "mm", "invalid-input", 0, 0),
    lower_nozzle_clearance_mm: av(0, "mm", "invalid-input", 0, 0),
    reasons: [reason],
    notes: [reason],
    source: "FlushStrategyPicker v1.0.0",
  };
}

export function pickFlush(input: FlushInput): FlushResult {
  if (!input) return emit("missing input");
  if (!MATERIAL_VALID.has(input.workpiece_material)) return emit(`unknown workpiece_material: ${input.workpiece_material}`);
  if (!CUT_VALID.has(input.cut_type)) return emit(`unknown cut_type: ${input.cut_type}`);
  if (!Number.isFinite(input.thickness_mm)) return emit("thickness_mm not finite");
  if (input.thickness_mm <= 0) return emit("thickness_mm must be > 0");
  if (input.thickness_mm > THICK_MAX_MM) return emit(`thickness_mm exceeds ${THICK_MAX_MM} mm sanity ceiling`);

  const reasons: string[] = [];
  const notes: string[] = [];
  const hasJets = input.has_jet_nozzles ?? true;

  // Rule 1: skim / final_finish always minimal jet (preserve Ra)
  if (input.cut_type === "skim" || input.cut_type === "final_finish") {
    reasons.push(`${input.cut_type}: high jet pressure would push wire away from cut → ruined Ra`);
    return {
      strategy: "minimal_jet",
      recommended_pressure_bar: av(2, "bar", "skim-rule", 0.90),
      upper_nozzle_clearance_mm: av(0.05, "mm", "skim-rule", 0.85, 0.30),
      lower_nozzle_clearance_mm: av(0.05, "mm", "skim-rule", 0.85, 0.30),
      reasons, notes, source: "FlushStrategyPicker v1.0.0",
    };
  }

  // Rule 2: conductive materials (carbide / graphite / copper) → submerged regardless of thickness
  if (CONDUCTIVE_MATERIALS.has(input.workpiece_material)) {
    reasons.push(`${input.workpiece_material}: conductive debris suspension demands submerged dielectric`);
    if (input.workpiece_material === "carbide") notes.push("carbide: use deionized water + adaptive servo for stability");
    return {
      strategy: "submerged",
      recommended_pressure_bar: av(0, "bar", "conductive-rule", 0.92),
      upper_nozzle_clearance_mm: av(0.1, "mm", "conductive-rule", 0.85, 0.20),
      lower_nozzle_clearance_mm: av(0.1, "mm", "conductive-rule", 0.85, 0.20),
      reasons, notes, source: "FlushStrategyPicker v1.0.0",
    };
  }

  // Rule 3: thickness regime
  if (input.thickness_mm < THICK_THIN_THRESHOLD_MM) {
    reasons.push(`thin part (${input.thickness_mm}mm < ${THICK_THIN_THRESHOLD_MM}mm) + rough: high-pressure jet for chip evacuation`);
    if (!hasJets) {
      notes.push("machine lacks jet nozzles — falling back to submerged");
      return { strategy: "submerged", recommended_pressure_bar: av(0, "bar", "no-jet-fallback", 0.70), upper_nozzle_clearance_mm: av(0.1, "mm", "fallback", 0.70, 0.20), lower_nozzle_clearance_mm: av(0.1, "mm", "fallback", 0.70, 0.20), reasons, notes, source: "FlushStrategyPicker v1.0.0" };
    }
    return {
      strategy: "high_pressure_jet",
      recommended_pressure_bar: av(12, "bar", "thin-rough-rule", 0.90),
      upper_nozzle_clearance_mm: av(0.05, "mm", "thin-rough-rule", 0.85, 0.20),
      lower_nozzle_clearance_mm: av(0.05, "mm", "thin-rough-rule", 0.85, 0.20),
      reasons, notes, source: "FlushStrategyPicker v1.0.0",
    };
  }

  if (input.thickness_mm <= THICK_MEDIUM_THRESHOLD_MM) {
    reasons.push(`medium thickness (${input.thickness_mm}mm in [${THICK_THIN_THRESHOLD_MM}, ${THICK_MEDIUM_THRESHOLD_MM}]) + rough: hybrid (submerged + jets)`);
    const pressure = hasJets ? 10 : 0;
    return {
      strategy: hasJets ? "hybrid" : "submerged",
      recommended_pressure_bar: av(pressure, "bar", "medium-rule", 0.88),
      upper_nozzle_clearance_mm: av(0.08, "mm", "medium-rule", 0.85, 0.20),
      lower_nozzle_clearance_mm: av(0.08, "mm", "medium-rule", 0.85, 0.20),
      reasons, notes, source: "FlushStrategyPicker v1.0.0",
    };
  }

  // thick: > 80mm → submerged only (jets interfere with debris evacuation at depth)
  reasons.push(`thick (${input.thickness_mm}mm > ${THICK_MEDIUM_THRESHOLD_MM}mm): submerged-only — jets would create turbulence interfering with debris evacuation`);
  return {
    strategy: "submerged",
    recommended_pressure_bar: av(0, "bar", "thick-rule", 0.92),
    upper_nozzle_clearance_mm: av(0.15, "mm", "thick-rule", 0.85, 0.20),
    lower_nozzle_clearance_mm: av(0.15, "mm", "thick-rule", 0.85, 0.20),
    reasons, notes, source: "FlushStrategyPicker v1.0.0",
  };
}

export const FlushStrategyPicker = {
  version: "1.0.0" as const,
  pickFlush,
};
