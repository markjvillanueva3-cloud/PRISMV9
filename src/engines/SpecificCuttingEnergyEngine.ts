/**
 * SpecificCuttingEnergyEngine — Energy per volume removed & energy efficiency
 *
 * Models: Specific cutting energy (u = Fc/(b×h)), total energy consumption,
 *         CO₂ equivalent, machine efficiency, energy cost per part
 * References: Gutowski (2006), Kara & Li (2011), Klocke (2011), ISO 14955
 * Chains with: SustainabilityEngine, CostEstimationEngine, CuttingPowerBudgetEngine
 */

// ─── Types ─────────────────────────────────────────────────────────

export type EnergySource = "grid_average" | "coal" | "natural_gas" | "nuclear" | "renewable";

/** Specific Cutting Energy Input configuration/data structure.
 */
export interface SpecificCuttingEnergyInput {
  // Method 1: provide force and chip geometry directly
  cutting_force_N?: number;
  chip_width_mm?: number;           // b (axial depth in milling)
  chip_thickness_mm?: number;       // h (feed per tooth × sin(κ))

  // Method 2: provide Kienzle coefficients + cutting conditions
  kc1_1?: number;                   // specific cutting force at h=1mm [N/mm²]
  mc?: number;                      // Kienzle exponent
  feed_mm?: number;                 // feed per tooth or feed per rev

  // Common parameters
  mrr_cm3_min?: number;             // material removal rate
  cutting_speed_m_min?: number;     // for power calculation
  depth_of_cut_mm?: number;
  width_of_cut_mm?: number;

  // Part/job context
  volume_to_remove_cm3?: number;    // total material to remove
  machining_time_min?: number;      // total cutting time
  machine_standby_power_kW?: number; // base power draw (default 2.5 kW)
  spindle_efficiency?: number;      // 0–1 (default 0.85)

  // Energy/sustainability context
  electricity_cost_per_kWh?: number; // $/kWh (default 0.12)
  energy_source?: EnergySource;
}

/** Atomic Value configuration/data structure.
 */
export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

/** Specific Cutting Energy Result configuration/data structure.
 */
export interface SpecificCuttingEnergyResult {
  specific_energy_J_mm3: AtomicValue;
  cutting_power_kW: AtomicValue;
  total_energy_kJ: AtomicValue;
  energy_per_part_Wh: AtomicValue;
  machine_energy_kJ: AtomicValue;         // includes standby
  energy_efficiency_ratio: AtomicValue;   // useful cutting / total machine
  co2_per_part_g: AtomicValue;
  energy_cost_per_part: AtomicValue;
  specific_energy_class: string;          // "low" | "medium" | "high" | "very_high"
  is_safe: boolean;
  recommendations: string[];
}

// ─── Constants ─────────────────────────────────────────────────────

/** CO₂ emission factors by energy source (g CO₂/kWh) — IEA 2023 */
const CO2_FACTORS: Record<EnergySource, number> = {
  grid_average: 450,     // global average
  coal: 900,
  natural_gas: 400,
  nuclear: 12,
  renewable: 25,         // lifecycle emissions
};

/** Reference specific energy by material group (J/mm³) — Klocke (2011) */
const REFERENCE_SPECIFIC_ENERGY: Record<string, { low: number; typical: number; high: number }> = {
  aluminum: { low: 0.4, typical: 0.7, high: 1.2 },
  mild_steel: { low: 1.5, typical: 2.5, high: 3.5 },
  alloy_steel: { low: 2.0, typical: 3.0, high: 4.5 },
  stainless: { low: 2.5, typical: 3.5, high: 5.0 },
  titanium: { low: 3.0, typical: 4.0, high: 6.0 },
  nickel_alloy: { low: 4.0, typical: 5.5, high: 8.0 },
  cast_iron: { low: 1.0, typical: 1.5, high: 2.5 },
  hardened_steel: { low: 3.5, typical: 5.0, high: 7.0 },
};

/** Classify specific energy level */
const classifyEnergy = (u: number): string => {
  if (u < 1.5) return "low";        // aluminum, brass, free-cutting
  if (u < 3.5) return "medium";     // carbon steel, cast iron
  if (u < 6.0) return "high";       // stainless, titanium
  return "very_high";                // nickel alloys, hardened steel
};

// ─── Engine ────────────────────────────────────────────────────────

/** Specific Cutting Energy Engine engine/manager.
 */
export class SpecificCuttingEnergyEngine {
  calculate(input: SpecificCuttingEnergyInput): SpecificCuttingEnergyResult {
    const {
      cutting_force_N: Fc,
      chip_width_mm: b,
      chip_thickness_mm: h,
      kc1_1,
      mc,
      feed_mm: feed,
      mrr_cm3_min: mrrInput,
      cutting_speed_m_min: Vc,
      depth_of_cut_mm: ap,
      width_of_cut_mm: ae,
      volume_to_remove_cm3: vol,
      machining_time_min: time,
      machine_standby_power_kW: standby = 2.5,
      spindle_efficiency: eta = 0.85,
      electricity_cost_per_kWh: costKWh = 0.12,
      energy_source: source = "grid_average",
    } = input;

    const recs: string[] = [];

    // ── 1. Specific cutting energy (u) ──
    let u: number;  // J/mm³ = N/mm² × mm / mm = W·s/mm³
    let u_source: string;

    /** If.
     * @param Fc - fc
     * @returns void
     */
    if (Fc && b && h && b > 0 && h > 0) {
      // Method 1: Direct from force and chip cross-section
      // u = Fc / (b × h) [N/mm²] = [J/mm³]
      u = Fc / (b * h);
      u_source = "force_chip_area";
    } else if (kc1_1 && mc !== undefined && feed) {
      // Method 2: From Kienzle model
      // kc = kc1_1 × h^(-mc), u ≈ kc for orthogonal cutting
      const h_eff = Math.max(feed, 0.01);
      u = kc1_1 * Math.pow(h_eff, -mc);
      // Convert from N/mm² to J/mm³ (same units but semantic clarity)
      u_source = "kienzle_model";
    } else if (Fc && Vc && mrrInput && mrrInput > 0) {
      // Method 3: From power and MRR
      // P = Fc × Vc / 60000 [kW], u = P / Q [kW / (cm³/min × 1000/60)]
      const P_W = Fc * Vc / 60;  // W (Fc[N] × Vc[m/min] / 60 = N·m/s = W)
      const Q_mm3_s = mrrInput * 1000 / 60;  // mm³/s
      u = Q_mm3_s > 0 ? P_W / Q_mm3_s : 3.0;
      u_source = "power_over_mrr";
    } else {
      // Fallback: typical mild steel
      u = 2.5;
      u_source = "default_mild_steel";
      recs.push(
        `Using default specific energy (2.5 J/mm³, mild steel) — `
        + `provide cutting_force_N + chip dimensions or kc1_1 + mc for accuracy`
      );
    }

    // ── 2. Material removal rate ──
    let mrr_mm3_s: number;
    /** If.
     * @param mrrInput - mrr input
     * @returns void
     */
    if (mrrInput) {
      mrr_mm3_s = mrrInput * 1000 / 60;  // cm³/min → mm³/s
    } else if (Vc && ap && ae) {
      // MRR = ap × ae × Vf, Vf ≈ Vc × 1000 × feed / (π × D) but simplified
      // If we have feed, approximate
      // Estimate tool diameter as max(2*ae, 10mm) since ae ≤ D always
      const D_est = Math.max((ae || 10) * 2, 10);
      const vf = feed ? feed * (Vc * 1000 / (Math.PI * D_est)) : Vc * 10;
      mrr_mm3_s = ap * (ae || ap) * vf / 60;
    } else if (vol && time && time > 0) {
      mrr_mm3_s = (vol * 1000) / (time * 60);
    } else {
      mrr_mm3_s = 0;
    }

    const mrr_cm3_min = mrr_mm3_s * 60 / 1000;

    // ── 3. Cutting power ──
    // P_cutting = u × Q [J/mm³ × mm³/s = W]
    const P_cutting_W = u * mrr_mm3_s;
    const P_cutting_kW = P_cutting_W / 1000;

    // ── 4. Machine power (including spindle efficiency + standby) ──
    const P_machine_kW = eta > 0 ? P_cutting_kW / eta + standby : P_cutting_kW + standby;

    // ── 5. Total energy ──
    let total_time_s: number;
    /** If.
     * @param time - time
     * @returns void
     */
    if (time) {
      total_time_s = time * 60;
    } else if (vol && mrr_cm3_min > 0) {
      total_time_s = (vol / mrr_cm3_min) * 60;
    } else {
      total_time_s = 60;  // default 1 minute
    }

    const E_cutting_kJ = P_cutting_kW * total_time_s / 1000 * 1000;  // kJ
    const E_machine_kJ = P_machine_kW * total_time_s;  // kJ (machine draws standby + cutting)
    // Fix: E_machine should be in kJ
    const E_machine_kJ_actual = P_machine_kW * total_time_s;
    const E_part_Wh = E_machine_kJ_actual / 3.6;  // 1 Wh = 3.6 kJ

    // ── 6. Energy efficiency ratio ──
    // η_energy = useful cutting energy / total machine energy
    const E_useful_kJ = P_cutting_kW * total_time_s;
    const efficiency_ratio = E_machine_kJ_actual > 0
      ? E_useful_kJ / E_machine_kJ_actual
      : 0;

    // ── 7. CO₂ emissions ──
    const co2_factor = CO2_FACTORS[source];
    const E_kWh = E_part_Wh / 1000;
    const co2_g = E_kWh * co2_factor;

    // ── 8. Energy cost ──
    const cost = E_kWh * costKWh;

    // ── 9. Classification ──
    const energyClass = classifyEnergy(u);

    // ── 10. Safety ──
    const isSafe = u < 10 && P_cutting_kW < 50;

    // ── 11. Recommendations ──
    /** If.
     * @param energyClass - energy class
     * @returns void
     */
    if (energyClass === "very_high") {
      recs.push(
        `Very high specific energy ${u.toFixed(1)} J/mm³ — `
        + `difficult-to-machine material. Consider: sharper tools (positive rake), `
        + `optimized chip thickness, or high-pressure coolant`
      );
    }

    /** If.
     * @param efficiency_ratio - efficiency_ratio
     * @returns void
     */
    if (efficiency_ratio < 0.3 && mrr_mm3_s > 0) {
      recs.push(
        `Low energy efficiency ${(efficiency_ratio * 100).toFixed(0)}% — `
        + `standby power (${standby}kW) dominates. Increase MRR or `
        + `reduce non-cutting time to improve ratio`
      );
    }

    /** If.
     * @param P_cutting_kW - p_cutting_k w
     * @returns void
     */
    if (P_cutting_kW > 10) {
      recs.push(
        `High cutting power ${P_cutting_kW.toFixed(1)}kW — `
        + `verify spindle capacity, consider multi-pass strategy`
      );
    }

    /** If.
     * @param co2_g - co2_g
     * @returns void
     */
    if (co2_g > 100) {
      recs.push(
        `CO₂ emissions ${co2_g.toFixed(0)}g/part — consider: `
        + `renewable energy source, process optimization, `
        + `near-net-shape blanks to reduce material removal`
      );
    }

    /** If.
     * @param u - u
     * @returns void
     */
    if (u > 1.5 && u_source !== "default_mild_steel") {
      const aluminumRef = REFERENCE_SPECIFIC_ENERGY.aluminum;
      /** If.
       * @param u - u
       * @returns void
       */
      if (u > aluminumRef.high * 3) {
        recs.push(
          `Specific energy ${u.toFixed(1)} J/mm³ suggests hard material — `
          + `verify tool sharpness (worn tools increase u by 30–50%)`
        );
      }
    }

    /** If.
     * @param recs.length - recs.length
     * @returns void
     */
    if (recs.length === 0) {
      recs.push(
        `Energy profile nominal — u=${u.toFixed(2)} J/mm³ (${energyClass}), `
        + `P=${P_cutting_kW.toFixed(2)}kW, η=${(efficiency_ratio * 100).toFixed(0)}%, `
        + `CO₂=${co2_g.toFixed(1)}g/part`
      );
    }

    return {
      specific_energy_J_mm3: {
        value: Math.round(u * 100) / 100,
        unit: "J/mm³",
        uncertainty: u * 0.12,
        source: u_source,
      },
      cutting_power_kW: {
        value: Math.round(P_cutting_kW * 1000) / 1000,
        unit: "kW",
        uncertainty: P_cutting_kW * 0.12,
        source: "u_times_mrr",
      },
      total_energy_kJ: {
        value: Math.round(E_useful_kJ * 10) / 10,
        unit: "kJ",
        uncertainty: E_useful_kJ * 0.15,
        source: "power_times_time",
      },
      energy_per_part_Wh: {
        value: Math.round(E_part_Wh * 10) / 10,
        unit: "Wh",
        uncertainty: E_part_Wh * 0.15,
        source: "machine_energy_total",
      },
      machine_energy_kJ: {
        value: Math.round(E_machine_kJ_actual * 10) / 10,
        unit: "kJ",
        uncertainty: E_machine_kJ_actual * 0.15,
        source: "cutting_plus_standby",
      },
      energy_efficiency_ratio: {
        value: Math.round(efficiency_ratio * 1000) / 1000,
        unit: "ratio",
        uncertainty: efficiency_ratio * 0.10,
        source: "useful_over_total",
      },
      co2_per_part_g: {
        value: Math.round(co2_g * 10) / 10,
        unit: "g CO₂",
        uncertainty: co2_g * 0.20,
        source: `iea_2023_${source}`,
      },
      energy_cost_per_part: {
        value: Math.round(cost * 10000) / 10000,
        unit: "$",
        uncertainty: cost * 0.10,
        source: "electricity_rate",
      },
      specific_energy_class: energyClass,
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

/** Specific Cutting Energy Engine constant.
 */
export const specificCuttingEnergyEngine = new SpecificCuttingEnergyEngine();
