/**
 * PhysicsAwareSimulationEngine — Real-time force/thermal/deflection during simulation
 *
 * What Vericut doesn't do: compute cutting physics DURING simulation.
 * For each G-code block, computes:
 * - Kienzle cutting force (Fc = kc1.1 * b * h^(1-mc))
 * - Loewen-Shaw temperature rise
 * - Cantilever tool deflection (delta = FL^3 / 3EI)
 * - Power consumption (P = Fc * Vc / 60000)
 * - Surface finish estimate (Ra from Brammertz/Chebyshev)
 *
 * Flags blocks where limits are exceeded and suggests specific fixes.
 *
 * References: Kienzle (1952), Loewen & Shaw (1954), Brammertz (1961),
 *             Altintas (Manufacturing Automation, Ch. 2-3)
 */

export interface PhysicsInput {
  cutting_speed_m_min: number;
  feed_mm_rev: number;
  depth_of_cut_mm: number;
  width_of_cut_mm: number;
  tool_diameter_mm: number;
  tool_length_mm: number;
  tool_flutes: number;
  material: string;
  tool_material?: string;
  spindle_rpm?: number;
}

export interface PhysicsResult {
  cutting_force_N: number;
  feed_force_N: number;
  passive_force_N: number;
  resultant_force_N: number;
  power_kW: number;
  torque_Nm: number;
  temperature_C: number;
  deflection_um: number;
  surface_finish_Ra_um: number;
  mrr_cm3_min: number;
  specific_energy_J_mm3: number;
  is_safe: boolean;
  warnings: string[];
  suggested_fixes: string[];
}

// Material: [kc1.1, mc, k_thermal, density, specific_heat]
const MATERIALS: Record<string, [number, number, number, number, number]> = {
  steel:        [2000, 0.26, 0.30, 7850, 460],
  stainless:    [2200, 0.27, 0.35, 7900, 500],
  aluminum:     [800,  0.23, 0.15, 2700, 900],
  titanium:     [1600, 0.22, 0.50, 4500, 520],
  inconel:      [2800, 0.28, 0.60, 8200, 435],
  cast_iron:    [1200, 0.24, 0.25, 7200, 460],
  brass:        [700,  0.20, 0.12, 8500, 380],
  copper:       [900,  0.22, 0.14, 8900, 385],
};

// Tool material: [E_GPa, hardness_HV, max_temp_C]
const TOOL_MATERIALS: Record<string, [number, number, number]> = {
  carbide:   [600, 1600, 800],
  hss:       [210, 850,  600],
  cbn:       [680, 4000, 1200],
  ceramic:   [400, 2000, 1000],
  diamond:   [1000, 8000, 700],
};

export class PhysicsAwareSimulationEngine {
  /**
   * Compute full cutting physics for a single machining operation
   */
  computeBlockPhysics(input: PhysicsInput): PhysicsResult {
    const mat = MATERIALS[input.material] ?? MATERIALS.steel;
    const [kc11, mc, kThermal, density, specificHeat] = mat;
    const toolMat = TOOL_MATERIALS[input.tool_material ?? "carbide"];
    const [E_GPa, , maxToolTemp] = toolMat;

    const Vc = input.cutting_speed_m_min;
    const f = input.feed_mm_rev;
    const ap = input.depth_of_cut_mm;
    const ae = input.width_of_cut_mm;
    const D = input.tool_diameter_mm;
    const L = input.tool_length_mm;
    const z = input.tool_flutes;
    const n = input.spindle_rpm ?? (Vc * 1000) / (Math.PI * D);

    const warnings: string[] = [];
    const fixes: string[] = [];

    // Chip thickness (average)
    const fz = f / z; // mm/tooth
    const h = fz; // simplified average chip thickness

    // Kienzle cutting force: Fc = kc * b * h
    const kc = kc11 * Math.pow(Math.max(h, 0.001), -mc);
    const Fc = kc * ap * h; // N (Kienzle: kc already includes h^(-mc), so Fc = kc1.1 * ap * h^(1-mc))

    // Force components (empirical ratios)
    const Ff = Fc * 0.5;  // feed force ~50% of cutting force
    const Fp = Fc * 0.35; // passive force ~35%
    const Fr = Math.sqrt(Fc * Fc + Ff * Ff + Fp * Fp);

    // Power: P = Fc * Vc / (60 * 1000) [kW]
    const P = Fc * Vc / 60000;

    // Torque: T = P * 9549 / n [Nm]
    const T = n > 0 ? P * 9549 / n : 0;

    // Loewen-Shaw temperature rise
    // Simplified: deltaT = k * sqrt(Fc * Vc / 60)
    const tempRise = kThermal * Math.pow(Math.max(Fc * Vc / 60, 0), 0.5);
    const temperature = 20 + tempRise;

    // Cantilever deflection: delta = F * L^3 / (3 * E * I)
    const E = E_GPa * 1000; // MPa
    const I = Math.PI * Math.pow(D / 2, 4) / 4; // mm^4
    const deflection = I > 0 ? (Fc * Math.pow(L, 3)) / (3 * E * I) * 1000 : 0; // um

    // Surface finish estimate (Brammertz): Ra ≈ f^2 / (32 * r_epsilon)
    // For flat end mill: Ra ≈ fz^2 / (32 * (D/2))
    const rEpsilon = D / 2;
    const Ra = rEpsilon > 0 ? (fz * fz) / (32 * rEpsilon) * 1000 : 0; // um

    // MRR
    const mrr = ap * ae * f * n / 1000; // cm3/min

    // Specific cutting energy
    const specEnergy = mrr > 0 ? P * 60 / (mrr / 1000) : 0; // J/mm3

    // Safety checks
    let isSafe = true;

    if (Fc > 5000) {
      warnings.push(`Cutting force ${Math.round(Fc)}N exceeds 5000N limit`);
      fixes.push(`Reduce DOC to ${Math.round(ap * 5000 / Fc * 10) / 10}mm or feed to ${(f * 5000 / Fc).toFixed(3)}mm/rev`);
      isSafe = false;
    }
    if (temperature > maxToolTemp) {
      warnings.push(`Temperature ${Math.round(temperature)}C exceeds tool limit ${maxToolTemp}C`);
      fixes.push(`Reduce cutting speed to ${Math.round(Vc * maxToolTemp / temperature)}m/min`);
      isSafe = false;
    }
    if (deflection > 25) {
      warnings.push(`Deflection ${deflection.toFixed(1)}um exceeds 25um tolerance limit`);
      const targetD = D * Math.pow(deflection / 25, 0.25);
      fixes.push(`Use ${Math.ceil(targetD)}mm diameter tool or reduce stickout to ${Math.round(L * Math.pow(25 / deflection, 1/3))}mm`);
      isSafe = false;
    }
    if (P > 15) {
      warnings.push(`Power ${P.toFixed(1)}kW may exceed spindle capacity`);
      fixes.push(`Reduce MRR — lower DOC or feed rate`);
    }

    return {
      cutting_force_N: Math.round(Fc),
      feed_force_N: Math.round(Ff),
      passive_force_N: Math.round(Fp),
      resultant_force_N: Math.round(Fr),
      power_kW: Math.round(P * 100) / 100,
      torque_Nm: Math.round(T * 100) / 100,
      temperature_C: Math.round(temperature),
      deflection_um: Math.round(deflection * 10) / 10,
      surface_finish_Ra_um: Math.round(Ra * 100) / 100,
      mrr_cm3_min: Math.round(mrr * 100) / 100,
      specific_energy_J_mm3: Math.round(specEnergy * 100) / 100,
      is_safe: isSafe,
      warnings,
      suggested_fixes: fixes,
    };
  }
}

export const physicsAwareSimulationEngine = new PhysicsAwareSimulationEngine();
