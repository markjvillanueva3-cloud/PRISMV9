/**
 * HPCVcBoostCalculator — Speed-Feed algorithm #8.7
 *
 * High-Pressure Coolant (HPC ≥ 70 bar) enables 30-100% higher Vc in difficult-
 * to-machine materials by driving the coolant jet INTO the cutting zone,
 * lifting chips off the tool face and dropping chip-tool interface temperature.
 *
 * Operator inputs: HPC pressure [bar], flow rate [L/min], jet-aim quality
 * (centered / off-center), and ISO group. Returns: Vc boost multiplier vs
 * standard flood coolant baseline.
 *
 * Formula structure (derived from vendor data, Sandvik 2023-24 §HPC):
 *   boost = 1.0 + k_iso · pressure_factor · flow_factor · aim_factor
 *
 *   pressure_factor = clamp((P_bar - 35) / 35, 0, 2)  // active above 35 bar
 *   flow_factor     = clamp(Q_L_min / Q_ref_per_ISO, 0.5, 1.0)
 *   aim_factor      = centered=1.0, off_center=0.65, unaimed=0.30
 *
 * k_iso per material group (vendor catalogs):
 *   P-steels:    0.30 (mild benefit — chip evacuation primary)
 *   M-stainless: 0.60 (high benefit — chip welding prevention)
 *   K-cast iron: 0.10 (minimal — dust evacuation only)
 *   N-aluminum:  0.20 (chip evacuation primary)
 *   S-superalloy:1.00 (largest benefit — heat removal at chip-tool interface)
 *   H-hardened:  0.40 (chip-control benefit)
 *
 * Boost is multiplicative; max realistic boost capped at 2.5× (200% over flood).
 *
 * @module HPCVcBoostCalculator
 * @version 1.0.0
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  uncertainty: number;
  source: string;
  confidence?: number;
}

export type IsoGroupLabel = "P" | "M" | "K" | "N" | "S" | "H";
export type JetAim = "centered" | "off_center" | "unaimed";

export interface HPCBoostInput {
  iso_group: IsoGroupLabel;
  /** Coolant pressure [bar]. Below 35 bar = standard flood, no boost. */
  pressure_bar: number;
  /** Coolant flow rate [L/min]. Below reference flow → diminishing boost. */
  flow_L_min: number;
  jet_aim?: JetAim;
}

export interface HPCBoostResult {
  vc_boost_multiplier: AtomicValue;
  pressure_factor: number;
  flow_factor: number;
  aim_factor: number;
  active: boolean;
  notes: string[];
  source: string;
}

const ISO_K: Record<IsoGroupLabel, number> = { P: 0.30, M: 0.60, K: 0.10, N: 0.20, S: 1.00, H: 0.40 };

/** Reference flow rates per ISO [L/min] — typical shop pump capacity. */
const Q_REF: Record<IsoGroupLabel, number> = { P: 40, M: 50, K: 30, N: 30, S: 60, H: 50 };

const AIM_FACTOR: Record<JetAim, number> = { centered: 1.0, off_center: 0.65, unaimed: 0.30 };

const HPC_THRESHOLD_BAR = 35;       // below this = standard flood, no boost
const HPC_PRESSURE_DENOM = 35;      // each +35 bar above threshold adds 1.0 to factor
const PRESSURE_FACTOR_CAP = 2.0;
const MAX_PRESSURE_BAR = 350;       // physical sanity bound (industrial HPC pumps)
const MAX_FLOW_L_MIN = 500;         // physical sanity bound
const MAX_BOOST_MULT = 2.5;

function clamp(x: number, lo: number, hi: number): number {
  if (!Number.isFinite(x)) return lo;
  return Math.max(lo, Math.min(hi, x));
}

function emit(reason: string): HPCBoostResult {
  return {
    vc_boost_multiplier: { value: 1, unit: "ratio", uncertainty: 0, source: "invalid-input", confidence: 0 },
    pressure_factor: 0,
    flow_factor: 0,
    aim_factor: 0,
    active: false,
    notes: [reason],
    source: "HPCVcBoostCalculator v1.0.0",
  };
}

export function computeBoost(input: HPCBoostInput): HPCBoostResult {
  if (!input) return emit("missing input");
  if (!ISO_K[input.iso_group]) return emit(`unknown iso_group: ${input.iso_group}`);
  if (!Number.isFinite(input.pressure_bar)) return emit("pressure_bar not finite");
  if (!Number.isFinite(input.flow_L_min)) return emit("flow_L_min not finite");
  if (input.pressure_bar < 0) return emit("pressure_bar cannot be negative");
  if (input.flow_L_min < 0) return emit("flow_L_min cannot be negative");
  if (input.pressure_bar > MAX_PRESSURE_BAR) return emit(`pressure_bar exceeds ${MAX_PRESSURE_BAR} bar sanity ceiling`);
  if (input.flow_L_min > MAX_FLOW_L_MIN) return emit(`flow_L_min exceeds ${MAX_FLOW_L_MIN} L/min sanity ceiling`);

  const aim = input.jet_aim ?? "centered";
  if (!AIM_FACTOR[aim]) return emit(`unknown jet_aim: ${aim}`);

  const notes: string[] = [];
  if (input.pressure_bar < HPC_THRESHOLD_BAR) {
    notes.push(`pressure ${input.pressure_bar} bar below ${HPC_THRESHOLD_BAR} bar HPC threshold — no boost (standard flood)`);
    return {
      vc_boost_multiplier: { value: 1.0, unit: "ratio", uncertainty: 0, source: "below-HPC-threshold", confidence: 1 },
      pressure_factor: 0, flow_factor: 0, aim_factor: AIM_FACTOR[aim],
      active: false, notes, source: "HPCVcBoostCalculator v1.0.0",
    };
  }

  const pressure_factor = clamp((input.pressure_bar - HPC_THRESHOLD_BAR) / HPC_PRESSURE_DENOM, 0, PRESSURE_FACTOR_CAP);
  const flow_factor = clamp(input.flow_L_min / Q_REF[input.iso_group], 0.5, 1.0);
  const aim_factor = AIM_FACTOR[aim];
  const k = ISO_K[input.iso_group];
  let boost = 1.0 + k * pressure_factor * flow_factor * aim_factor;
  if (boost > MAX_BOOST_MULT) {
    notes.push(`raw boost ${boost.toFixed(2)} exceeds physical cap ${MAX_BOOST_MULT}; clamped`);
    boost = MAX_BOOST_MULT;
  }

  if (aim === "unaimed") notes.push("jet unaimed: 70% of potential boost lost — center the nozzle for full benefit");
  if (input.flow_L_min < Q_REF[input.iso_group] * 0.5) notes.push(`flow ${input.flow_L_min} L/min < 50% of reference ${Q_REF[input.iso_group]} — boost saturates`);
  if (input.iso_group === "S" && boost > 1.5) notes.push("S-superalloy HPC: dramatic Vc boost typically enables 40-100% MRR increase");

  return {
    vc_boost_multiplier: { value: boost, unit: "ratio", uncertainty: 0.10 * (boost - 1), source: `HPC formula iso=${input.iso_group} k=${k}`, confidence: 0.80 },
    pressure_factor, flow_factor, aim_factor,
    active: true,
    notes,
    source: "HPCVcBoostCalculator v1.0.0",
  };
}

export const HPCVcBoostCalculator = {
  version: "1.0.0" as const,
  computeBoost,
};
