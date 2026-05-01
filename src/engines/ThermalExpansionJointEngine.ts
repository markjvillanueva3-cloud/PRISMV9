/**
 * ThermalExpansionJointEngine — Pipe/structural expansion joint sizing
 *
 * Models: Thermal expansion (ΔL = α×L×ΔT), bellows cycle life,
 *         spring rate, anchor force, guide spacing
 * References: EJMA Standards (Expansion Joint Manufacturers Association)
 * Safety: Cycle life, anchor loads, bellows squirm
 */

// ─── Types ─────────────────────────────────────────────────────────

export type JointType = "single_bellows" | "double_bellows" | "universal"
  | "hinged" | "gimbal" | "slip";
export type PipeMaterial = "carbon_steel" | "stainless_304" | "stainless_316"
  | "copper" | "aluminum" | "inconel";

export interface ThermalExpansionJointInput {
  pipe_od_mm: number;
  pipe_length_m: number;
  temp_min_C: number;
  temp_max_C: number;
  install_temp_C?: number;              // default 20
  pipe_material?: PipeMaterial;
  joint_type?: JointType;
  design_pressure_bar?: number;         // default 10
  design_cycles?: number;               // default 10000
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface ThermalExpansionJointResult {
  thermal_expansion_mm: AtomicValue;
  required_movement_mm: AtomicValue;
  bellows_spring_rate_N_mm: AtomicValue;
  anchor_force_kN: AtomicValue;
  guide_spacing_m: AtomicValue;
  cycle_life: AtomicValue;
  pressure_thrust_kN: AtomicValue;
  num_convolutions: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// ─── Reference Data ────────────────────────────────────────────────

const CTE: Record<PipeMaterial, number> = {  // ×10⁻⁶ /°C
  carbon_steel:  11.7e-6,
  stainless_304: 17.3e-6,
  stainless_316: 16.0e-6,
  copper:        16.5e-6,
  aluminum:      23.1e-6,
  inconel:       12.8e-6,
};

const PIPE_E: Record<PipeMaterial, number> = { // GPa
  carbon_steel:  207,
  stainless_304: 193,
  stainless_316: 193,
  copper:        117,
  aluminum:      69,
  inconel:       205,
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class ThermalExpansionJointEngine {
  calculate(input: ThermalExpansionJointInput): ThermalExpansionJointResult {
    const {
      pipe_od_mm: OD,
      pipe_length_m: L,
      temp_min_C: Tmin,
      temp_max_C: Tmax,
      install_temp_C: Tinst = 20,
      pipe_material = "carbon_steel",
      joint_type = "single_bellows",
      design_pressure_bar: P = 10,
      design_cycles: cycles = 10000,
    } = input;

    const recs: string[] = [];
    const alpha = CTE[pipe_material];
    const E = PIPE_E[pipe_material];

    // Thermal expansion
    const dT_hot = Tmax - Tinst;
    const dT_cold = Tinst - Tmin;
    const expansion_hot = alpha * L * 1000 * dT_hot; // mm
    const contraction_cold = alpha * L * 1000 * dT_cold; // mm
    const totalMovement = expansion_hot + contraction_cold;

    // Required movement capacity (with 25% margin)
    const requiredMovement = totalMovement * 1.25;

    // Bellows sizing
    // Movement per convolution ≈ 2-5mm depending on type
    const movePerConv = joint_type === "universal" ? 5 : joint_type === "double_bellows" ? 4 : 3;
    const numConv = Math.ceil(requiredMovement / movePerConv);

    // Spring rate: k ≈ (E_bellows × t³ × π × Dm) / (n × h²)
    // Simplified: k ≈ 500 × OD / numConv (N/mm, empirical)
    const springRate = 500 * OD / (numConv * 100);

    // Anchor force: F = k × movement + pressure_thrust
    const bellowsArea = Math.PI * OD * OD / 4; // mm² (effective area ≈ mean diameter)
    const pressureThrust = P * 0.1 * bellowsArea / 1000; // kN (bar → MPa × area)
    const springForce = springRate * requiredMovement / 1000; // kN
    const anchorForce = pressureThrust + springForce;

    // Guide spacing (Euler buckling of pipe under pressure thrust)
    // L_guide = 0.8 × √(π²×E×I / F_thrust)
    const pipeThick = OD * 0.05; // assume schedule estimate
    const I = Math.PI / 64 * (Math.pow(OD, 4) - Math.pow(OD - 2 * pipeThick, 4));
    const guideSpacing = 0.8 * Math.sqrt(
      Math.PI * Math.PI * E * 1e3 * I / (pressureThrust * 1e6)
    ) / 1000; // m

    // Cycle life (EJMA simplified)
    const stressPerCycle = requiredMovement / numConv * 50; // MPa equivalent
    const cycleLife = Math.round(1e7 / Math.pow(stressPerCycle / 100, 3));

    const isSafe = cycleLife > cycles && requiredMovement < numConv * movePerConv * 1.5;

    if (cycleLife < cycles * 1.5) {
      recs.push(`Cycle life ${cycleLife} marginal vs ${cycles} design — add convolutions`);
    }
    if (pipe_material === "stainless_304" && Tmax > 500) {
      recs.push(`304SS at ${Tmax}°C — consider 316SS or Inconel for high temp`);
    }
    if (dT_hot > 200) {
      recs.push(`Large thermal range ${dT_hot}°C — pre-compress joint at installation`);
    }
    if (anchorForce > 100) {
      recs.push(`High anchor force ${anchorForce.toFixed(0)}kN — verify anchor block design`);
    }
    if (joint_type === "single_bellows" && totalMovement > 50) {
      recs.push(`Large movement ${totalMovement.toFixed(0)}mm — consider universal or double bellows`);
    }
    if (recs.length === 0) {
      recs.push(`Expansion joint nominal — ${totalMovement.toFixed(1)}mm movement, ${numConv} convolutions`);
    }

    return {
      thermal_expansion_mm: mkAv(Math.round(expansion_hot * 10) / 10, "mm", expansion_hot * 0.05, "linear_CTE"),
      required_movement_mm: mkAv(Math.round(requiredMovement * 10) / 10, "mm", requiredMovement * 0.05, "margined_total"),
      bellows_spring_rate_N_mm: mkAv(Math.round(springRate * 10) / 10, "N/mm", springRate * 0.15, "ejma_empirical"),
      anchor_force_kN: mkAv(Math.round(anchorForce * 10) / 10, "kN", anchorForce * 0.12, "spring_pressure_sum"),
      guide_spacing_m: mkAv(Math.round(guideSpacing * 10) / 10, "m", guideSpacing * 0.15, "euler_buckling"),
      cycle_life: mkAv(cycleLife, "cycles", cycleLife * 0.25, "ejma_fatigue"),
      pressure_thrust_kN: mkAv(Math.round(pressureThrust * 10) / 10, "kN", pressureThrust * 0.05, "pressure_area"),
      num_convolutions: mkAv(numConv, "convolutions", 1, "movement_capacity"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const thermalExpansionJointEngine = new ThermalExpansionJointEngine();
